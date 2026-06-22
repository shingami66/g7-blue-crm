"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createCustomerSchema, updateCustomerSchema } from "./schemas";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";

/** Standardised action result shape. */
export type ActionResult = {
  success: boolean;
  error?: string;
};

const COMPANY_ONLY_CUSTOMER_FIELDS = [
  "legal_name",
  "commercial_registration_number",
  "vat_number",
  "national_address_building_number",
  "national_address_street",
  "national_address_district",
  "national_address_city",
  "national_address_postal_code",
  "national_address_additional_number",
  "national_address_country",
  "billing_email",
  "finance_contact_name",
  "finance_contact_phone",
  "payment_terms",
] as const;

function readOfficialBillingFields(
  formData: FormData,
  options: { preserveMissingCompanyFields?: boolean } = {}
) {
  const customerType = formData.get("customer_type");
  const preserveMissingCompanyFields = Boolean(options.preserveMissingCompanyFields);
  const companyFieldsSubmitted = hasCompanyOnlyFieldInput(formData);

  if (customerType === "individual") {
    return {
      customer_type: customerType,
      ...emptyCompanyOnlyFields(),
      po_required: false,
    };
  }

  return {
    customer_type: customerType,
    ...readCompanyOnlyTextFields(formData, preserveMissingCompanyFields),
    po_required: readPoRequired(formData, preserveMissingCompanyFields, companyFieldsSubmitted),
  };
}

function hasCompanyOnlyFieldInput(formData: FormData) {
  return (
    formData.has("po_required") ||
    COMPANY_ONLY_CUSTOMER_FIELDS.some((fieldName) => formData.has(fieldName))
  );
}

function readCompanyOnlyTextFields(
  formData: FormData,
  preserveMissingCompanyFields: boolean
) {
  return Object.fromEntries(
    COMPANY_ONLY_CUSTOMER_FIELDS.map((fieldName) => [
      fieldName,
      preserveMissingCompanyFields && !formData.has(fieldName)
        ? undefined
        : formData.get(fieldName),
    ])
  );
}

function emptyCompanyOnlyFields() {
  return Object.fromEntries(
    COMPANY_ONLY_CUSTOMER_FIELDS.map((fieldName) => [fieldName, null])
  );
}

function readPoRequired(
  formData: FormData,
  preserveMissingCompanyFields: boolean,
  companyFieldsSubmitted: boolean
) {
  if (preserveMissingCompanyFields && !companyFieldsSubmitted) {
    return undefined;
  }

  return formData.get("po_required") === "on";
}

// ---------------------------------------------------------------------------
// CREATE
// ---------------------------------------------------------------------------
export async function createCustomer(formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("customers:write");

    const raw = {
      company: formData.get("company"),
      contact: formData.get("contact"),
      phone: formData.get("phone"),
      email: formData.get("email"),
      city: formData.get("city"),
      status: formData.get("status") || "lead",
      projects_count: 0,
      revenue: 0,
      ...readOfficialBillingFields(formData),
    };

    const parsed = createCustomerSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const supabase = createAdminClient();

    const { data: customerNumber, error: numberError } = await supabase.rpc(
      "generate_document_number",
      { doc_type: "customer" }
    );

    if (numberError || !customerNumber) {
      console.error("[createCustomer] Failed to generate customer number:", numberError?.message);
      return { success: false, error: "Failed to generate customer number. Please try again." };
    }

    const payload = {
      ...parsed.data,
      customer_number: customerNumber,
      created_by: user.clerk_user_id,
      updated_by: user.clerk_user_id,
    };
    const { error } = await supabase.from("customers").insert(payload);

    if (error) {
      console.error("[createCustomer] Supabase error:", error.message);
      return { success: false, error: "Failed to create customer. Please try again." };
    }

    revalidatePath("/customers");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[createCustomer] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ---------------------------------------------------------------------------
// UPDATE
// ---------------------------------------------------------------------------
export async function updateCustomer(id: string, formData: FormData): Promise<ActionResult> {
  try {
    const user = await requirePermission("customers:write");

    const raw = {
      company: formData.get("company") || undefined,
      contact: formData.get("contact") || undefined,
      phone: formData.get("phone") || undefined,
      email: formData.get("email") || undefined,
      city: formData.get("city") || undefined,
      status: formData.get("status") || undefined,
      ...readOfficialBillingFields(formData, { preserveMissingCompanyFields: true }),
    };

    const parsed = updateCustomerSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    // Remove undefined keys so Supabase only updates provided fields
    const updates: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(parsed.data)) {
      if (value !== undefined) {
        updates[key] = value;
      }
    }
    updates.updated_by = user.clerk_user_id;

    if (Object.keys(updates).length === 0) {
      return { success: false, error: "No fields to update." };
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", id)
      .eq("is_deleted", false);

    if (error) {
      console.error("[updateCustomer] Supabase error:", error.message);
      return { success: false, error: "Failed to update customer. Please try again." };
    }

    revalidatePath("/customers");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[updateCustomer] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

// ---------------------------------------------------------------------------
// SOFT DELETE
// ---------------------------------------------------------------------------
export async function softDeleteCustomer(id: string): Promise<ActionResult> {
  try {
    const user = await requirePermission("customers:write");

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("customers")
      .update({
        is_deleted: true,
        deleted_at: new Date().toISOString(),
        updated_by: user.clerk_user_id,
      })
      .eq("id", id)
      .eq("is_deleted", false);

    if (error) {
      console.error("[softDeleteCustomer] Supabase error:", error.message);
      return { success: false, error: "Failed to delete customer. Please try again." };
    }

    revalidatePath("/customers");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[softDeleteCustomer] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}
