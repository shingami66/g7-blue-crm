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

const optionalTrimmedText = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().nullable());

const requiredTrimmedText = (message: string) =>
  z.string().trim().min(1, message);

const optionalEmail = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string") return value;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}, z.string().email("Invalid email address").nullable());

const optionalSupplierType = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  return value;
}, z.enum(["company", "individual"]).nullable());

const optionalSupplierCategory = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  return value;
}, z.enum(SUPPLIER_CATEGORIES).nullable());

const optionalVatRegistrationStatus = z.preprocess((value) => {
  if (value === null || value === undefined || value === "") return null;
  return value;
}, z.enum(["not_registered", "registered", "unknown"]).nullable());

export const createSupplierSchema = z
  .object({
    displayName: requiredTrimmedText("Supplier name is required"),
    legalName: optionalTrimmedText,
    supplierType: optionalSupplierType,
    category: optionalSupplierCategory,
    contactName: optionalTrimmedText,
    phone: requiredTrimmedText("Phone is required"),
    whatsappPhone: optionalTrimmedText,
    email: optionalEmail,
    city: optionalTrimmedText,
    country: optionalTrimmedText,
    coverageArea: optionalTrimmedText,
    crNumber: optionalTrimmedText,
    vatRegistrationStatus: optionalVatRegistrationStatus,
    vatNumber: optionalTrimmedText,
    status: z.enum(SAFE_SUPPLIER_CREATE_STATUSES).default("active"),
    isPreferred: z.boolean().default(false),
  })
  .strict()
  .superRefine((input, context) => {
    if (input.vatRegistrationStatus !== "registered" && input.vatNumber) {
      context.addIssue({
        code: "custom",
        message: "VAT number can only be set when VAT status is registered",
        path: ["vatNumber"],
      });
    }
  });

export type CreateSupplierInput = z.infer<typeof createSupplierSchema>;
