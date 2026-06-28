"use server";

import { revalidatePath } from "next/cache";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupplierSchema } from "./schemas";
import type { CreateSupplierInput } from "./schemas";

export type CreateSupplierResult = {
  success: boolean;
  error?: string;
  supplierId?: string;
};

function firstValidationError(parsed: { error: { issues: { message: string }[] } }) {
  return parsed.error.issues[0]?.message ?? "Validation failed";
}

function supplierInsertPayload(input: CreateSupplierInput, clerkUserId: string) {
  const displayName = input.displayName;
  const contactName = input.contactName ?? displayName;
  const category = input.category ?? null;

  return {
    supplier_type: input.supplierType,
    category,
    legal_name: input.legalName,
    display_name: displayName,
    contact_name: contactName,
    whatsapp_phone: input.whatsappPhone,
    email: input.email,
    city: input.city,
    country: input.country,
    coverage_area: input.coverageArea,
    name: displayName,
    service: category ?? "other",
    contact: contactName,
    phone: input.phone,
    status: input.status,
    cr_number: input.crNumber,
    vat_registration_status: input.vatRegistrationStatus,
    vat_number: input.vatRegistrationStatus === "registered" ? input.vatNumber : null,
    is_preferred: input.isPreferred,
    created_by: clerkUserId,
    updated_by: clerkUserId,
  };
}

export async function createSupplier(input: unknown): Promise<CreateSupplierResult> {
  try {
    const user = await requirePermission("suppliers:write");
    const parsed = createSupplierSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: firstValidationError(parsed) };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .insert(supplierInsertPayload(parsed.data, user.clerk_user_id))
      .select("id")
      .single();

    if (error) {
      console.error("[createSupplier] Supabase error:", error.message);
      return { success: false, error: "Failed to create supplier. Please try again." };
    }

    revalidatePath("/suppliers");
    return { success: true, supplierId: data.id };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[createSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
