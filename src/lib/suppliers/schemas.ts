import { z } from "zod";

export const SUPPLIER_CATEGORIES = [
  "transport",
  "cars",
  "cleaning",
  "staff",
  "security",
  "sound",
  "lighting",
  "screens_led",
  "decoration",
  "photo_video",
  "catering",
  "logistics",
  "furniture_tents_stage",
  "printing",
  "permits_support",
  "other",
] as const;

export const SAFE_SUPPLIER_CREATE_STATUSES = ["active", "on_hold", "inactive"] as const;
export const SUPPLIER_VAT_STATUSES = ["unknown", "not_registered", "registered"] as const;

function optionalText(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (value === null || value === undefined || value === "") return null;
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().max(maxLength).nullable(),
  );
}

function optionalUpdateText(maxLength: number) {
  return z.preprocess(
    (value) => {
      if (value === undefined || value === null || value === "") return value ?? null;
      if (typeof value !== "string") return value;
      const trimmed = value.trim();
      return trimmed.length > 0 ? trimmed : null;
    },
    z.string().max(maxLength).nullable().optional(),
  );
}

function requiredText(message: string, maxLength: number) {
  return z.string().trim().min(1, message).max(maxLength);
}

const optionalEmail = z.preprocess(
  (value) => {
    if (value === null || value === undefined || value === "") return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().email("Invalid email address").max(254).nullable(),
);

export const baseSupplierSchema = z
  .object({
    displayName: requiredText("Supplier name is required", 160),
    legalName: optionalText(200),
    supplierType: z.enum(["company", "individual"], "Supplier type is required"),
    category: z.enum(SUPPLIER_CATEGORIES, "Supplier category is required"),
    contactName: requiredText("Primary contact name is required", 160),
    phone: requiredText("Phone is required", 40),
    whatsappPhone: optionalText(40),
    email: optionalEmail,
    city: requiredText("City is required", 120),
    country: requiredText("Country is required", 120),
    coverageArea: optionalText(500),
    crNumber: optionalText(80),
    vatRegistrationStatus: z.enum(SUPPLIER_VAT_STATUSES),
    vatNumber: optionalText(80),
    paymentTerms: optionalText(1000),
    status: z.enum(SAFE_SUPPLIER_CREATE_STATUSES),
    isPreferred: z.boolean().default(false),
    notes: optionalText(2000),
  })
  .strict();

function validateVatNumber(
  input: { vatRegistrationStatus: string; vatNumber: string | null },
  context: z.RefinementCtx,
) {
  if (input.vatRegistrationStatus === "registered" && !input.vatNumber) {
    context.addIssue({
      code: "custom",
      message: "VAT number is required when VAT status is registered",
      path: ["vatNumber"],
    });
  }

  if (input.vatRegistrationStatus !== "registered" && input.vatNumber) {
    context.addIssue({
      code: "custom",
      message: "VAT number can only be set when VAT status is registered",
      path: ["vatNumber"],
    });
  }
}

export const createSupplierSchema = baseSupplierSchema.superRefine(validateVatNumber);

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;

export const updateSupplierSchema = baseSupplierSchema
  .extend({
    id: z.string().uuid("Invalid supplier ID"),
    status: z.enum(["active", "on_hold", "blacklisted", "inactive"]),
    bankName: optionalUpdateText(160),
    bankAccountName: optionalUpdateText(200),
    iban: optionalUpdateText(80),
  })
  .superRefine(validateVatNumber);

export type UpdateSupplierInput = z.infer<typeof updateSupplierSchema>;

export const blacklistSupplierSchema = z
  .object({
    id: z.string().uuid("Invalid supplier ID"),
    reason: requiredText("Reason is required to blacklist a supplier", 2000),
  })
  .strict();

export const supplierIdSchema = z
  .object({ id: z.string().uuid("Invalid supplier ID") })
  .strict();

export type BlacklistSupplierInput = z.infer<typeof blacklistSupplierSchema>;
