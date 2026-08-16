import { z } from "zod";

const dateValue = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const textValue = (max: number) => z.string().trim().min(1).max(max);
const optionalTextValue = (max: number) => z.preprocess((value) => value === "" ? null : value, z.string().trim().max(max).nullable().optional());
const costValue = z.coerce.number().finite("Base cost must be finite.").positive("Base cost must be greater than zero.").max(999_999_999_999.99, "Base cost is too large.").refine((value) => Number.isInteger(Math.round(value * 100)), "Base cost supports up to two decimals.");

const dateRange = <T extends z.ZodTypeAny>(schema: T) => schema.superRefine((value, context) => {
  const candidate = value as { validFrom?: unknown; validTo?: unknown };
  if (typeof candidate.validFrom === "string" && typeof candidate.validTo === "string" && candidate.validTo < candidate.validFrom) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["validTo"], message: "Valid To must be on or after Valid From." });
  }
});

const rateCardFields = {
  supplierId: z.string().uuid("Invalid supplier."),
  category: optionalTextValue(80),
  itemName: textValue(160),
  unit: textValue(80),
  pricingBasis: optionalTextValue(80),
  currency: z.literal("SAR"),
  baseCost: costValue,
  validFrom: dateValue,
  validTo: dateValue.nullable().optional(),
  notes: optionalTextValue(2000),
};

export const supplierRateCardCreateSchema = dateRange(z.object({
  ...rateCardFields,
  status: z.enum(["active", "inactive"]).default("inactive"),
}).strict());

export const supplierRateCardUpdateSchema = dateRange(z.object({
  id: z.string().uuid("Invalid rate card."),
  ...rateCardFields,
}).strict());

export const supplierRateCardIdSchema = z.object({ id: z.string().uuid("Invalid rate card.") }).strict();

export type SupplierRateCardCreateInput = z.infer<typeof supplierRateCardCreateSchema>;
export type SupplierRateCardUpdateInput = z.infer<typeof supplierRateCardUpdateSchema>;
