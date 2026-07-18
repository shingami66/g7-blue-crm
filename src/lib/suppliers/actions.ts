"use server";

import { revalidatePath } from "next/cache";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  blacklistSupplierSchema,
  createSupplierSchema,
  supplierIdSchema,
  updateSupplierSchema,
} from "./schemas";
import type { CreateSupplierInput, UpdateSupplierInput } from "./schemas";
import type { SupplierStatus } from "@/types/supplier";

type ActionResult = { success: boolean; error?: string };

export type CreateSupplierResult = ActionResult & { supplierId?: string };
export type UpdateSupplierResult = ActionResult;
export type BlacklistSupplierResult = ActionResult;
export type UnblacklistSupplierResult = ActionResult;
export type DeleteSupplierResult = ActionResult;
export type RestoreSupplierResult = ActionResult;

function firstValidationError(parsed: { error: { issues: { message: string }[] } }) {
  return parsed.error.issues[0]?.message ?? "Validation failed";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function affectedRow(data: unknown): data is { id: string } {
  return isRecord(data) && typeof data.id === "string";
}

function supplierStatus(value: unknown): SupplierStatus | null {
  return value === "active" || value === "on_hold" || value === "blacklisted" || value === "inactive"
    ? value
    : null;
}

function hasBankUpdate(input: UpdateSupplierInput) {
  return input.bankName !== undefined || input.bankAccountName !== undefined || input.iban !== undefined;
}

function supplierInsertPayload(input: CreateSupplierInput, clerkUserId: string) {
  return {
    supplier_type: input.supplierType,
    category: input.category,
    legal_name: input.legalName,
    display_name: input.displayName,
    contact_name: input.contactName,
    whatsapp_phone: input.whatsappPhone,
    email: input.email,
    city: input.city,
    country: input.country,
    coverage_area: input.coverageArea,
    name: input.displayName,
    service: input.category,
    contact: input.contactName,
    phone: input.phone,
    status: input.status,
    cr_number: input.crNumber,
    vat_registration_status: input.vatRegistrationStatus,
    vat_number: input.vatRegistrationStatus === "registered" ? input.vatNumber : null,
    payment_terms: input.paymentTerms,
    is_preferred: input.isPreferred,
    notes: input.notes,
    created_by: clerkUserId,
    updated_by: clerkUserId,
  };
}

function supplierUpdatePayload(input: UpdateSupplierInput, clerkUserId: string) {
  const bankPayload = hasBankUpdate(input)
    ? {
        bank_name: input.bankName ?? null,
        bank_account_name: input.bankAccountName ?? null,
        iban: input.iban ?? null,
      }
    : {};

  return {
    supplier_type: input.supplierType,
    category: input.category,
    legal_name: input.legalName,
    display_name: input.displayName,
    contact_name: input.contactName,
    whatsapp_phone: input.whatsappPhone,
    email: input.email,
    city: input.city,
    country: input.country,
    coverage_area: input.coverageArea,
    name: input.displayName,
    service: input.category,
    contact: input.contactName,
    phone: input.phone,
    status: input.status,
    cr_number: input.crNumber,
    vat_registration_status: input.vatRegistrationStatus,
    vat_number: input.vatRegistrationStatus === "registered" ? input.vatNumber : null,
    payment_terms: input.paymentTerms,
    is_preferred: input.isPreferred,
    notes: input.notes,
    updated_by: clerkUserId,
    ...bankPayload,
  };
}

function revalidateSupplierPaths(id: string) {
  revalidatePath("/suppliers");
  revalidatePath(`/suppliers/${id}`);
}

export async function createSupplier(input: unknown): Promise<CreateSupplierResult> {
  try {
    const user = await requirePermission("suppliers:write");
    const parsed = createSupplierSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstValidationError(parsed) };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .insert(supplierInsertPayload(parsed.data, user.clerk_user_id))
      .select("id")
      .maybeSingle();

    if (error || !affectedRow(data)) {
      if (error) console.error("[createSupplier] Supabase error:", error.message);
      return { success: false, error: "Failed to create supplier. Please try again." };
    }

    revalidateSupplierPaths(data.id);
    return { success: true, supplierId: data.id };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[createSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function updateSupplier(input: unknown): Promise<UpdateSupplierResult> {
  try {
    const user = await requirePermission("suppliers:write");
    const parsed = updateSupplierSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstValidationError(parsed) };
    if (hasBankUpdate(parsed.data)) await requirePermission("suppliers:write_bank");

    const supabase = createAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("suppliers")
      .select("status")
      .eq("id", parsed.data.id)
      .eq("is_deleted", false)
      .maybeSingle();

    const existingStatus = isRecord(existing) ? supplierStatus(existing.status) : null;
    if (existingError || !existingStatus) return { success: false, error: "Supplier not found." };

    if (existingStatus === "blacklisted" && parsed.data.status !== "blacklisted") {
      return { success: false, error: "Cannot unblacklist via normal edit. Use the dedicated workflow." };
    }
    if (existingStatus !== "blacklisted" && parsed.data.status === "blacklisted") {
      return { success: false, error: "Cannot blacklist via normal edit. Use the dedicated workflow." };
    }

    const { data, error } = await supabase
      .from("suppliers")
      .update(supplierUpdatePayload(parsed.data, user.clerk_user_id))
      .eq("id", parsed.data.id)
      .eq("is_deleted", false)
      .eq("status", existingStatus)
      .select("id")
      .maybeSingle();

    if (error || !affectedRow(data)) {
      if (error) console.error("[updateSupplier] Supabase error:", error.message);
      return { success: false, error: "Supplier changed before it could be updated. Refresh and try again." };
    }

    revalidateSupplierPaths(parsed.data.id);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[updateSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function blacklistSupplier(input: unknown): Promise<BlacklistSupplierResult> {
  try {
    const user = await requirePermission("suppliers:write");
    const parsed = blacklistSupplierSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstValidationError(parsed) };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        status: "blacklisted",
        blacklisted_reason: parsed.data.reason,
        blacklisted_by: user.clerk_user_id,
        blacklisted_at: new Date().toISOString(),
        updated_by: user.clerk_user_id,
      })
      .eq("id", parsed.data.id)
      .eq("is_deleted", false)
      .neq("status", "blacklisted")
      .select("id")
      .maybeSingle();

    if (error || !affectedRow(data)) {
      if (error) console.error("[blacklistSupplier] Supabase error:", error.message);
      return { success: false, error: "Supplier changed before it could be blacklisted. Refresh and try again." };
    }

    revalidateSupplierPaths(parsed.data.id);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[blacklistSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function unblacklistSupplier(input: unknown): Promise<UnblacklistSupplierResult> {
  try {
    const user = await requirePermission("suppliers:write");
    const parsed = supplierIdSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstValidationError(parsed) };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        status: "inactive",
        blacklisted_reason: null,
        blacklisted_by: null,
        blacklisted_at: null,
        updated_by: user.clerk_user_id,
      })
      .eq("id", parsed.data.id)
      .eq("is_deleted", false)
      .eq("status", "blacklisted")
      .select("id")
      .maybeSingle();

    if (error || !affectedRow(data)) {
      if (error) console.error("[unblacklistSupplier] Supabase error:", error.message);
      return { success: false, error: "Supplier changed before it could be restored. Refresh and try again." };
    }

    revalidateSupplierPaths(parsed.data.id);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[unblacklistSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function deleteSupplier(input: unknown): Promise<DeleteSupplierResult> {
  try {
    const user = await requirePermission("suppliers:delete");
    const parsed = supplierIdSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstValidationError(parsed) };

    const supabase = createAdminClient();
    const [allocationResult, bookingResult] = await Promise.all([
      supabase
        .from("service_supplier_allocations")
        .select("id")
        .eq("supplier_id", parsed.data.id)
        .eq("is_deleted", false)
        .neq("status", "cancelled")
        .limit(1)
        .maybeSingle(),
      supabase
        .from("supplier_bookings")
        .select("id")
        .eq("supplier_id", parsed.data.id)
        .eq("is_deleted", false)
        .neq("status", "cancelled")
        .limit(1)
        .maybeSingle(),
    ]);

    if (allocationResult.error || bookingResult.error) {
      console.error("[deleteSupplier] Dependency check failed");
      return { success: false, error: "Unable to verify supplier dependencies. Please try again." };
    }
    if (allocationResult.data || bookingResult.data) {
      return { success: false, error: "Supplier has active Allocations or Supplier Bookings and cannot be deleted." };
    }

    const { data, error } = await supabase
      .from("suppliers")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        deleted_by: user.clerk_user_id,
        updated_by: user.clerk_user_id,
      })
      .eq("id", parsed.data.id)
      .eq("is_deleted", false)
      .select("id")
      .maybeSingle();

    if (error || !affectedRow(data)) {
      if (error) console.error("[deleteSupplier] Supabase error:", error.message);
      return { success: false, error: "Supplier changed before it could be deleted. Refresh and try again." };
    }

    revalidateSupplierPaths(parsed.data.id);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[deleteSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function restoreSupplier(input: unknown): Promise<RestoreSupplierResult> {
  try {
    const user = await requirePermission("suppliers:delete");
    const parsed = supplierIdSchema.safeParse(input);
    if (!parsed.success) return { success: false, error: firstValidationError(parsed) };

    const supabase = createAdminClient();
    const { data: existing, error: existingError } = await supabase
      .from("suppliers")
      .select("status")
      .eq("id", parsed.data.id)
      .eq("is_deleted", true)
      .maybeSingle();

    const existingStatus = isRecord(existing) ? supplierStatus(existing.status) : null;
    if (existingError || !existingStatus) return { success: false, error: "Deleted supplier not found." };

    const restoredStatus = existingStatus === "blacklisted" ? "blacklisted" : "inactive";
    const { data, error } = await supabase
      .from("suppliers")
      .update({
        is_deleted: false,
        deleted_at: null,
        deleted_by: null,
        status: restoredStatus,
        updated_by: user.clerk_user_id,
      })
      .eq("id", parsed.data.id)
      .eq("is_deleted", true)
      .eq("status", existingStatus)
      .select("id")
      .maybeSingle();

    if (error || !affectedRow(data)) {
      if (error) console.error("[restoreSupplier] Supabase error:", error.message);
      return { success: false, error: "Supplier changed before it could be restored. Refresh and try again." };
    }

    revalidateSupplierPaths(parsed.data.id);
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[restoreSupplier] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
