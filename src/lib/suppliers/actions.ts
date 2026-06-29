"use server";

import { revalidatePath } from "next/cache";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { createSupplierSchema, updateSupplierSchema } from "./schemas";
import type { CreateSupplierInput, UpdateSupplierInput } from "./schemas";

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
    notes: input.notes,
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

export type UpdateSupplierResult = {
  success: boolean;
  error?: string;
};

function supplierUpdatePayload(input: UpdateSupplierInput, clerkUserId: string) {
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
    notes: input.notes,
    updated_by: clerkUserId,
  };
}

export async function updateSupplier(input: unknown): Promise<UpdateSupplierResult> {
  try {
    const user = await requirePermission("suppliers:write");
    const parsed = updateSupplierSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: firstValidationError(parsed) };
    }

    const supabase = createAdminClient();

    // Prevent bypass: Check existing status
    const { data: existingSupplier, error: fetchError } = await supabase
      .from("suppliers")
      .select("status")
      .eq("id", parsed.data.id)
      .single();

    if (fetchError || !existingSupplier) {
      return { success: false, error: "Supplier not found." };
    }

    if (existingSupplier.status === "blacklisted" && parsed.data.status !== "blacklisted") {
      return { success: false, error: "Cannot unblacklist via normal edit. Use the dedicated workflow." };
    }
    if (existingSupplier.status !== "blacklisted" && parsed.data.status === "blacklisted") {
      return { success: false, error: "Cannot blacklist via normal edit. Use the dedicated workflow." };
    }

    const { error } = await supabase
      .from("suppliers")
      .update(supplierUpdatePayload(parsed.data, user.clerk_user_id))
      .eq("id", parsed.data.id)
      .eq("is_deleted", false);


    if (error) {
      console.error("[updateSupplier] Supabase error:", error.message);
      return { success: false, error: "Failed to update supplier. Please try again." };
    }

    revalidatePath("/suppliers");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[updateSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export type BlacklistSupplierResult = {
  success: boolean;
  error?: string;
};

export async function blacklistSupplier(input: unknown): Promise<BlacklistSupplierResult> {
  try {
    const user = await requirePermission("suppliers:write");
    const { blacklistSupplierSchema } = await import("./schemas");
    const parsed = blacklistSupplierSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: firstValidationError(parsed) };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("suppliers")
      .update({
        status: "blacklisted",
        blacklisted_reason: parsed.data.reason,
        blacklisted_by: user.clerk_user_id,
        blacklisted_at: new Date().toISOString(),
        updated_by: user.clerk_user_id,
      })
      .eq("id", parsed.data.id)
      .eq("is_deleted", false);

    if (error) {
      console.error("[blacklistSupplier] Supabase error:", error.message);
      return { success: false, error: "Failed to blacklist supplier. Please try again." };
    }

    revalidatePath("/suppliers");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[blacklistSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export type UnblacklistSupplierResult = {
  success: boolean;
  error?: string;
};

export async function unblacklistSupplier(input: unknown): Promise<UnblacklistSupplierResult> {
  try {
    const user = await requirePermission("suppliers:write");
    const { unblacklistSupplierSchema } = await import("./schemas");
    const parsed = unblacklistSupplierSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: firstValidationError(parsed) };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("suppliers")
      .update({
        status: "inactive",
        blacklisted_reason: null,
        blacklisted_by: null,
        blacklisted_at: null,
        updated_by: user.clerk_user_id,
      })
      .eq("id", parsed.data.id)
      .eq("is_deleted", false);

    if (error) {
      console.error("[unblacklistSupplier] Supabase error:", error.message);
      return { success: false, error: "Failed to unblacklist supplier. Please try again." };
    }

    revalidatePath("/suppliers");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[unblacklistSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
