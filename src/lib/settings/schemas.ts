import { z } from "zod";

export const vatModeSchema = z.enum(["not_registered", "vat_registered_phase_1"]);

const requiredText = (label: string, max = 500) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

const optionalText = (max = 500) =>
  z.preprocess(
    (value) => {
      if (value === null || value === undefined) return null;
      const trimmed = String(value).trim();
      return trimmed.length === 0 ? null : trimmed;
    },
    z.string().max(max, "Value is too long").nullable()
  );

const sanitizeEmail = (val: unknown) => {
  if (typeof val !== "string") return val;
  let str = val.trim();
  const markdownMatch = str.match(/\[.*?\]\(mailto:(.*?)\)/);
  if (markdownMatch) {
    str = markdownMatch[1];
  } else if (str.startsWith("mailto:")) {
    str = str.replace("mailto:", "");
  }
  return str.trim();
};

export const updateCompanySettingsSchema = z
  .object({
    legal_name_en: requiredText("English legal company name"),
    legal_name_ar: requiredText("Arabic legal company name"),
    cr_number: optionalText(50),
    tin_number: optionalText(50),
    vat_mode: vatModeSchema,
    vat_effective_date: optionalText(20),
    vat_number: optionalText(50),
    official_email: z.preprocess(sanitizeEmail, z.email("Invalid official email").trim().max(255)),
    official_phone: requiredText("Official phone", 50),
    national_address: requiredText("National address", 1000),
    bank_name: requiredText("Bank name", 120),
    bank_iban: requiredText("IBAN", 80),
    bank_account_holder: requiredText("Bank account holder", 180),
    currency: z.literal("SAR"),
    default_vat_percent: z.coerce
      .number("Default VAT percent is required")
      .min(0, "Default VAT percent cannot be less than 0")
      .max(100, "Default VAT percent cannot exceed 100"),
    default_terms: requiredText("Default terms", 4000),
  })
  .superRefine((data, ctx) => {
    if (data.vat_mode === "not_registered") {
      if (data.default_vat_percent !== 0) {
        ctx.addIssue({
          code: "custom",
          path: ["default_vat_percent"],
          message: "Default VAT percent must be 0 when the company is not VAT registered.",
        });
      }

      if (data.vat_number) {
        ctx.addIssue({
          code: "custom",
          path: ["vat_number"],
          message: "VAT number must be empty when the company is not VAT registered.",
        });
      }

      if (data.vat_effective_date) {
        ctx.addIssue({
          code: "custom",
          path: ["vat_effective_date"],
          message: "VAT effective date must be empty when the company is not VAT registered.",
        });
      }
    }

    if (data.vat_mode === "vat_registered_phase_1") {
      if (!data.vat_number) {
        ctx.addIssue({
          code: "custom",
          path: ["vat_number"],
          message: "VAT number is required when the company is VAT registered.",
        });
      }

      if (data.default_vat_percent <= 0) {
        ctx.addIssue({
          code: "custom",
          path: ["default_vat_percent"],
          message: "Default VAT percent must be greater than 0 when the company is VAT registered.",
        });
      }
    }
  });

export type UpdateCompanySettingsInput = z.infer<typeof updateCompanySettingsSchema>;

export function normalizeCompanySettingsInput(input: Record<string, unknown>): UpdateCompanySettingsInput {
  return updateCompanySettingsSchema.parse(input);
}
