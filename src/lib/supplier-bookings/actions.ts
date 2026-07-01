"use server";

import { revalidatePath } from "next/cache";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapSupplierBookingRow } from "./mappers";
import {
  cancelSupplierBookingSchema,
  createSupplierBookingSchema,
  supplierBookingIdSchema,
} from "./schemas";
import type { SupplierBooking, SupplierBookingRow } from "./types";

/**
 * Supplier Booking actions are internal-only.
 * Do not import into quotation PDFs, invoice PDFs, public routes, customer portals,
 * or customer-facing components.
 */

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

type SelectedAllocationRow = {
  id: string;
  service_id: string;
  supplier_id: string;
  supplier_rate_card_id: string | null;
  approved_quotation_id: string | null;
  status: string;
  category: string;
  item_name: string;
  unit: string;
  quantity: number | string;
  currency: string;
  estimated_unit_cost: number | string;
  estimated_total_cost: number | string;
  cost_source: string;
  rate_card_snapshot: Record<string, unknown> | null;
  scope_of_work: string | null;
  internal_notes: string | null;
  created_at: string;
  updated_at: string;
  is_deleted: boolean;
};

type ServiceStatusRow = {
  status: string;
};

function firstValidationError(parsed: { error: { issues: { message: string }[] } }) {
  return parsed.error.issues[0]?.message ?? "Validation failed";
}

function createInputHasOnlySourceAllocationId(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) return false;

  const inputKeys = Object.keys(input);
  return inputKeys.length === 1 && inputKeys[0] === "sourceAllocationId";
}

function allocationSnapshot(allocation: SelectedAllocationRow) {
  return {
    sourceAllocationId: allocation.id,
    serviceId: allocation.service_id,
    supplierId: allocation.supplier_id,
    supplierRateCardId: allocation.supplier_rate_card_id,
    approvedQuotationId: allocation.approved_quotation_id,
    allocationStatus: allocation.status,
    category: allocation.category,
    itemName: allocation.item_name,
    unit: allocation.unit,
    quantity: allocation.quantity,
    currency: allocation.currency,
    estimatedUnitCost: allocation.estimated_unit_cost,
    estimatedTotalCost: allocation.estimated_total_cost,
    costSource: allocation.cost_source,
    rateCardSnapshot: allocation.rate_card_snapshot,
    scopeOfWork: allocation.scope_of_work,
    internalNotes: allocation.internal_notes,
    createdAt: allocation.created_at,
    updatedAt: allocation.updated_at,
  };
}

function supplierBookingInsertPayload(allocation: SelectedAllocationRow, clerkUserId: string) {
  return {
    service_id: allocation.service_id,
    supplier_id: allocation.supplier_id,
    source_allocation_id: allocation.id,
    status: "draft",
    category: allocation.category,
    item_name: allocation.item_name,
    unit: allocation.unit,
    quantity: allocation.quantity,
    currency: "SAR",
    estimated_unit_cost: allocation.estimated_unit_cost,
    scope_of_work: allocation.scope_of_work,
    internal_notes: allocation.internal_notes,
    allocation_snapshot: allocationSnapshot(allocation),
    created_by: clerkUserId,
    updated_by: clerkUserId,
  };
}

function mapActionSupplierBooking(row: SupplierBookingRow, canReadCost: boolean) {
  return mapSupplierBookingRow(row, {
    canReadCost,
    canReadInternalDetails: canReadCost,
  });
}

async function selectedAllocationById(
  supabase: ReturnType<typeof createAdminClient>,
  allocationId: string
): Promise<ActionResult<SelectedAllocationRow>> {
  const { data: allocation, error } = await supabase
    .from("service_supplier_allocations")
    .select("*")
    .eq("id", allocationId)
    .maybeSingle();

  if (error) {
    console.error("[selectedAllocationById] Supabase error:", error.message);
    return { success: false, error: "Failed to load source allocation. Please try again." };
  }

  if (!allocation) {
    return { success: false, error: "Source allocation not found." };
  }

  if (allocation.is_deleted) {
    return { success: false, error: "Source allocation is deleted." };
  }

  if (allocation.status !== "selected") {
    return { success: false, error: "Source allocation must be selected before booking." };
  }

  return { success: true, data: allocation as SelectedAllocationRow };
}

async function serviceAllowsSupplierBooking(
  supabase: ReturnType<typeof createAdminClient>,
  serviceId: string
): Promise<ActionResult> {
  const { data: service, error } = await supabase
    .from("services")
    .select("status")
    .eq("id", serviceId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    console.error("[serviceAllowsSupplierBooking] Supabase error:", error.message);
    return { success: false, error: "Failed to verify service status. Please try again." };
  }

  if (!service) {
    return { success: false, error: "Service is unavailable for Supplier Booking." };
  }

  const { status } = service as ServiceStatusRow;
  if (status === "Cancelled" || status === "Completed") {
    return { success: false, error: "Service is unavailable for Supplier Booking." };
  }

  return { success: true };
}

async function sourceAllocationHasActiveBooking(
  supabase: ReturnType<typeof createAdminClient>,
  allocationId: string
): Promise<ActionResult<boolean>> {
  const { data: activeBooking, error } = await supabase
    .from("supplier_bookings")
    .select("id")
    .eq("source_allocation_id", allocationId)
    .eq("is_deleted", false)
    .neq("status", "cancelled")
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("[sourceAllocationHasActiveBooking] Supabase error:", error.message);
    return { success: false, error: "Failed to verify Supplier Booking status. Please try again." };
  }

  return { success: true, data: !!activeBooking };
}

export async function createSupplierBookingFromAllocation(
  input: unknown
): Promise<ActionResult<SupplierBooking>> {
  try {
    const user = await requirePermission("supplier_bookings:write");

    if (!createInputHasOnlySourceAllocationId(input)) {
      return {
        success: false,
        error: "Supplier Booking create input can only include sourceAllocationId.",
      };
    }

    const parsed = createSupplierBookingSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: firstValidationError(parsed) };
    }

    const supabase = createAdminClient();
    const allocationResult = await selectedAllocationById(supabase, parsed.data.sourceAllocationId);
    if (!allocationResult.success || !allocationResult.data) {
      return { success: false, error: allocationResult.error };
    }

    const serviceResult = await serviceAllowsSupplierBooking(
      supabase,
      allocationResult.data.service_id
    );
    if (!serviceResult.success) {
      return { success: false, error: serviceResult.error };
    }

    const activeBookingResult = await sourceAllocationHasActiveBooking(supabase, allocationResult.data.id);
    if (!activeBookingResult.success) {
      return { success: false, error: activeBookingResult.error };
    }
    if (activeBookingResult.data) {
      return { success: false, error: "Source allocation already has an active Supplier Booking." };
    }

    const { data: createdRow, error } = await supabase
      .from("supplier_bookings")
      .insert(supplierBookingInsertPayload(allocationResult.data, user.clerk_user_id))
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .single();

    if (error) {
      console.error("[createSupplierBookingFromAllocation] Supabase error:", error.message);
      return { success: false, error: "Failed to create Supplier Booking. Please try again." };
    }

    const canReadCost = await checkPermission("supplier_bookings:read_cost");
    const mappedData = mapActionSupplierBooking(createdRow as SupplierBookingRow, canReadCost);

    revalidatePath("/services");
    revalidatePath(`/services/${allocationResult.data.service_id}`);

    return { success: true, data: mappedData };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error(
      "[createSupplierBookingFromAllocation] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function cancelSupplierBooking(
  id: string,
  input: unknown
): Promise<ActionResult<SupplierBooking>> {
  try {
    const user = await requirePermission("supplier_bookings:cancel");
    const parsedId = supplierBookingIdSchema.safeParse(id);
    const parsedInput = cancelSupplierBookingSchema.safeParse(input);

    if (!parsedId.success) {
      return { success: false, error: firstValidationError(parsedId) };
    }

    if (!parsedInput.success) {
      return { success: false, error: firstValidationError(parsedInput) };
    }

    const supabase = createAdminClient();
    const { data: existingBooking, error: fetchError } = await supabase
      .from("supplier_bookings")
      .select("id, service_id, status")
      .eq("id", parsedId.data)
      .eq("is_deleted", false)
      .maybeSingle();

    if (fetchError) {
      console.error("[cancelSupplierBooking] Supabase fetch error:", fetchError.message);
      return { success: false, error: "Failed to load Supplier Booking. Please try again." };
    }

    if (!existingBooking) {
      return { success: false, error: "Supplier Booking not found." };
    }

    if (existingBooking.status === "cancelled") {
      return { success: false, error: "Supplier Booking is already cancelled." };
    }

    const { data: updatedRow, error: updateError } = await supabase
      .from("supplier_bookings")
      .update({
        status: "cancelled",
        cancelled_reason: parsedInput.data.cancelledReason,
        cancelled_at: new Date().toISOString(),
        cancelled_by: user.clerk_user_id,
        updated_by: user.clerk_user_id,
      })
      .eq("id", parsedId.data)
      .select("*, supplier:suppliers(name, display_name, legal_name, contact)")
      .single();

    if (updateError) {
      console.error("[cancelSupplierBooking] Supabase update error:", updateError.message);
      return { success: false, error: "Failed to cancel Supplier Booking. Please try again." };
    }

    const canReadCost = await checkPermission("supplier_bookings:read_cost");
    const mappedData = mapActionSupplierBooking(updatedRow as SupplierBookingRow, canReadCost);

    revalidatePath("/services");
    revalidatePath(`/services/${existingBooking.service_id}`);

    return { success: true, data: mappedData };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error(
      "[cancelSupplierBooking] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return { success: false, error: "An unexpected error occurred." };
  }
}
