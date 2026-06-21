import { z } from "zod";

const optionalTrimmedText = z.preprocess((value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}, z.string().nullable());

const optionalNonEmptyTrimmedText = (fieldName: string) =>
  z.preprocess((value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string") return value;

    return value.trim();
  }, z.string().min(1, `${fieldName} cannot be empty`).nullable());

const optionalBillingEmail = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return value;

  return value.trim();
}, z.string().min(1, "Billing email cannot be empty").email("Invalid billing email address").nullable());

const optionalCustomerType = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  return value;
}, z.enum(["individual", "company"]).nullable());

const customerOfficialBillingFields = {
  customer_type: optionalCustomerType,
  legal_name: optionalTrimmedText,
  commercial_registration_number: optionalNonEmptyTrimmedText("Commercial Registration number"),
  vat_number: optionalNonEmptyTrimmedText("VAT number"),
  national_address_building_number: optionalTrimmedText,
  national_address_street: optionalTrimmedText,
  national_address_district: optionalTrimmedText,
  national_address_city: optionalTrimmedText,
  national_address_postal_code: optionalTrimmedText,
  national_address_additional_number: optionalTrimmedText,
  national_address_country: optionalTrimmedText,
  billing_email: optionalBillingEmail,
  finance_contact_name: optionalTrimmedText,
  finance_contact_phone: optionalNonEmptyTrimmedText("Finance contact phone"),
  payment_terms: optionalTrimmedText,
  po_required: z.boolean().default(false),
};

/** Schema for creating a new customer (used by the Server Action). */
export const createCustomerSchema = z.object({
  company: z.string().min(1, "Company is required"),
  contact: z.string().min(1, "Contact is required"),
  phone: z.string().min(1, "Phone is required"),
  email: z.string().email("Invalid email address"),
  city: z.string().min(1, "City is required"),
  status: z.enum(["active", "inactive", "lead"]).default("lead"),
  projects_count: z.coerce.number().int().nonnegative().default(0),
  revenue: z.coerce.number().nonnegative().default(0),
  ...customerOfficialBillingFields,
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;

/** Schema for updating an existing customer (all fields optional). */
export const updateCustomerSchema = z.object({
  company: z.string().min(1, "Company is required").optional(),
  contact: z.string().min(1, "Contact is required").optional(),
  phone: z.string().min(1, "Phone is required").optional(),
  email: z.string().email("Invalid email address").optional(),
  city: z.string().min(1, "City is required").optional(),
  status: z.enum(["active", "inactive", "lead"]).optional(),
  customer_type: optionalCustomerType.optional(),
  legal_name: optionalTrimmedText.optional(),
  commercial_registration_number: optionalNonEmptyTrimmedText("Commercial Registration number").optional(),
  vat_number: optionalNonEmptyTrimmedText("VAT number").optional(),
  national_address_building_number: optionalTrimmedText.optional(),
  national_address_street: optionalTrimmedText.optional(),
  national_address_district: optionalTrimmedText.optional(),
  national_address_city: optionalTrimmedText.optional(),
  national_address_postal_code: optionalTrimmedText.optional(),
  national_address_additional_number: optionalTrimmedText.optional(),
  national_address_country: optionalTrimmedText.optional(),
  billing_email: optionalBillingEmail.optional(),
  finance_contact_name: optionalTrimmedText.optional(),
  finance_contact_phone: optionalNonEmptyTrimmedText("Finance contact phone").optional(),
  payment_terms: optionalTrimmedText.optional(),
  po_required: z.boolean().optional(),
});

export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
