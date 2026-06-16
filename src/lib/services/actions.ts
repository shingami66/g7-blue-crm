"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createServiceSchema, updateServiceSchema } from "./schemas";
import type {
  CreatedServiceResult,
  CreateServiceInput,
  UpdateServiceInput,
} from "./types";
import { getServiceById } from "./queries";

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

function firstValidationError(parsed: { error: { issues: { message: string }[] } }) {
  return parsed.error.issues[0]?.message ?? "Validation failed";
}

function serviceInsertPayload(
  serviceInput: CreateServiceInput,
  serviceNumber: string,
  clerkUserId: string
) {
  return {
    customer_id: serviceInput.customer_id,
    service_number: serviceNumber,
    service_title: serviceInput.service_title,
    event_name: serviceInput.event_name ?? null,
    event_type: serviceInput.event_type ?? null,
    event_start_date: serviceInput.event_start_date ?? null,
    event_end_date: serviceInput.event_end_date ?? null,
    event_location: serviceInput.event_location ?? null,
    description: serviceInput.description ?? null,
    estimated_budget: serviceInput.estimated_budget ?? null,
    status: "Inquiry",
    cancellation_reason: serviceInput.cancellation_reason ?? null,
    created_by: clerkUserId,
    updated_by: clerkUserId,
  };
}

function serviceUpdatePayload(
  serviceInput: UpdateServiceInput,
  clerkUserId: string
) {
  const updates: Record<string, unknown> = {};
  const allowedFields = [
    "service_title",
    "event_name",
    "event_type",
    "event_start_date",
    "event_end_date",
    "event_location",
    "description",
    "estimated_budget",
    "cancellation_reason",
  ] as const;

  for (const fieldName of allowedFields) {
    const fieldValue = serviceInput[fieldName];
    if (fieldValue !== undefined) updates[fieldName] = fieldValue;
  }

  updates.updated_by = clerkUserId;
  return updates;
}

async function generateServiceNumber(
  supabase: ReturnType<typeof createAdminClient>
): Promise<ActionResult<string>> {
  const { data: serviceNumber, error } = await supabase.rpc(
    "generate_document_number",
    { doc_type: "service" }
  );

  if (error) {
    console.error("[generateServiceNumber] Supabase error:", error.message);
    return { success: false, error: "Failed to generate service number. Please try again." };
  }

  if (typeof serviceNumber !== "string") {
    console.error("[generateServiceNumber] Unexpected RPC response");
    return { success: false, error: "Failed to generate service number. Please try again." };
  }

  return { success: true, data: serviceNumber };
}

export async function createService(
  input: unknown
): Promise<ActionResult<CreatedServiceResult>> {
  try {
    const user = await requirePermission("services:write");
    const parsed = createServiceSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: firstValidationError(parsed) };
    }

    const supabase = createAdminClient();
    const serviceNumberResult = await generateServiceNumber(supabase);
    if (!serviceNumberResult.success || !serviceNumberResult.data) {
      return { success: false, error: serviceNumberResult.error };
    }

    const { data: createdService, error } = await supabase
      .from("services")
      .insert(
        serviceInsertPayload(
          parsed.data,
          serviceNumberResult.data,
          user.clerk_user_id
        )
      )
      .select("id, service_number")
      .single();

    if (error) {
      console.error("[createService] Supabase error:", error.message);
      return { success: false, error: "Failed to create service. Please try again." };
    }

    revalidatePath("/services");
    return {
      success: true,
      data: {
        id: createdService.id,
        serviceNumber: createdService.service_number,
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[createService] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function updateService(
  id: string,
  input: unknown
): Promise<ActionResult<{ id: string }>> {
  try {
    const user = await requirePermission("services:write");

    const forbiddenFields = [
      "customer_id",
      "customerId",
      "service_number",
      "serviceNumber",
      "status",
      "created_by",
      "updated_by",
      "deleted_at",
      "createdAt",
      "updatedAt",
      "deletedAt",
    ];

    if (input && typeof input === "object") {
      for (const field of forbiddenFields) {
        if (field in input) {
          return { success: false, error: "This field cannot be edited." };
        }
      }
    }

    const parsed = updateServiceSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: firstValidationError(parsed) };
    }

    if (parsed.data.status !== undefined) {
      return { success: false, error: "Service status changes are deferred." };
    }

    const currentService = await getServiceById(id);
    if (!currentService) {
      return { success: false, error: "Service not found." };
    }

    if (currentService.status !== "Inquiry" && currentService.status !== "Quoted") {
      return { success: false, error: `Editing is not allowed when service status is ${currentService.status}.` };
    }

    const updates = serviceUpdatePayload(parsed.data, user.clerk_user_id);
    if (Object.keys(updates).length === 1) {
      return { success: false, error: "No fields to update." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("services")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Service not found." };
      }
      console.error("[updateService] Supabase error:", error.message);
      return { success: false, error: "Failed to update service. Please try again." };
    }

    revalidatePath("/services");
    revalidatePath(`/services/${id}`);
    return { success: true, data: { id } };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[updateService] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function softDeleteService(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("services:write");
    const supabase = createAdminClient();
    const { error } = await supabase
      .from("services")
      .update({
        deleted_at: new Date().toISOString(),
        updated_by: user.clerk_user_id,
      })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return { success: false, error: "Service not found." };
      }
      console.error("[softDeleteService] Supabase error:", error.message);
      return { success: false, error: "Failed to delete service. Please try again." };
    }

    revalidatePath("/services");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[softDeleteService] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
