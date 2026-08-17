"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  createCustomerSchema,
  updateCustomerSchema,
  type CreateCustomerRawInput,
} from "./schemas";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";

/** Standardised action result shape. */
export type ActionResult = {
  success: boolean;
  error?: string;
  customerId?: string;
  customerNumber?: string;
  isReplayed?: boolean;
};

export type CreateCustomerResult = ActionResult;
export type CreateCustomerActionInput = CreateCustomerRawInput;

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
export async function createCustomer(
  input: FormData | unknown
): Promise<ActionResult> {
  try {
    const user = await requirePermission("customers:write");

    const raw =
      typeof FormData !== "undefined" && input instanceof FormData
        ? {
            company: input.get("company"),
            contact: input.get("contact"),
            phone: input.get("phone"),
            email: input.get("email"),
            city: input.get("city"),
            status: input.get("status") || "lead",
            projects_count: 0,
            revenue: 0,
            mutation_key: input.get("mutation_key") || undefined,
            ...readOfficialBillingFields(input),
          }
        : {
            ...(typeof input === "object" && input !== null ? (input as Record<string, unknown>) : {}),
            projects_count: 0,
            revenue: 0,
          };

    if (raw && typeof raw === "object" && "customer_type" in raw && raw.customer_type === "individual") {
      for (const field of COMPANY_ONLY_CUSTOMER_FIELDS) {
        (raw as Record<string, unknown>)[field] = null;
      }
      (raw as Record<string, unknown>).po_required = false;
    }

    const parsed = createCustomerSchema.safeParse(raw);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const supabase = createAdminClient();

    const { data, error } = await supabase.rpc("create_customer_atomic", {
      p_company: parsed.data.company,
      p_contact: parsed.data.contact,
      p_phone: parsed.data.phone,
      p_email: parsed.data.email,
      p_city: parsed.data.city,
      p_status: parsed.data.status,
      p_customer_type: parsed.data.customer_type ?? null,
      p_legal_name: parsed.data.legal_name ?? null,
      p_commercial_registration_number: parsed.data.commercial_registration_number ?? null,
      p_vat_number: parsed.data.vat_number ?? null,
      p_national_address_building_number: parsed.data.national_address_building_number ?? null,
      p_national_address_street: parsed.data.national_address_street ?? null,
      p_national_address_district: parsed.data.national_address_district ?? null,
      p_national_address_city: parsed.data.national_address_city ?? null,
      p_national_address_postal_code: parsed.data.national_address_postal_code ?? null,
      p_national_address_additional_number: parsed.data.national_address_additional_number ?? null,
      p_national_address_country: parsed.data.national_address_country ?? null,
      p_billing_email: parsed.data.billing_email ?? null,
      p_finance_contact_name: parsed.data.finance_contact_name ?? null,
      p_finance_contact_phone: parsed.data.finance_contact_phone ?? null,
      p_payment_terms: parsed.data.payment_terms ?? null,
      p_po_required: parsed.data.po_required ?? false,
      p_created_by: user.clerk_user_id,
      p_mutation_key: parsed.data.mutation_key,
    });

    if (error) {
      console.error("[createCustomer] Supabase error:", error.message);
      return { success: false, error: "Failed to create customer. Please try again." };
    }

    const row = Array.isArray(data) ? data[0] : data;
    if (!row) {
      console.error("[createCustomer] Empty RPC result");
      return { success: false, error: "Failed to create customer. Please try again." };
    }

    if (row.error_code) {
      if (row.error_code === "mutation_key_conflict") {
        return {
          success: false,
          error: "A customer creation request with this mutation key already exists with different details.",
        };
      }
      if (row.error_code === "invalid_customer_input") {
        return { success: false, error: "Invalid customer input." };
      }
      if (row.error_code === "number_generation_failed") {
        return { success: false, error: "Failed to generate customer number. Please try again." };
      }
      return { success: false, error: "Failed to create customer. Please try again." };
    }

    if (!row.customer_id) {
      return { success: false, error: "Failed to create customer. Please try again." };
    }

    revalidatePath("/customers");
    return {
      success: true,
      customerId: row.customer_id,
      customerNumber: row.customer_number,
      isReplayed: Boolean(row.is_replayed),
    };
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
