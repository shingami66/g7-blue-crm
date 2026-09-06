import { z } from "zod";
import { PROCUREMENT_SOURCING_PATHS } from "./types.ts";

function requiredText(message: string, maxLength: number) {
  return z.string().trim().min(1, message).max(maxLength);
}

const optionalText = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().max(2000).nullable(),
);

function hasTwoDecimals(value: number): boolean {
  const scaled = value * 100;
  return (
    Number.isSafeInteger(Math.round(scaled)) &&
    Math.abs(scaled - Math.round(scaled)) < 0.00001
  );
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

const optionalQuotedAmount = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z
    .number()
    .finite("Quoted amount must be a finite number")
    .min(0)
    .max(999999999999.99)
    .refine((value) => hasTwoDecimals(value), "Quoted amount supports up to two decimals.")
    .nullable(),
);

const dateValue = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    return parsed.getUTCFullYear() === year
      && parsed.getUTCMonth() === month - 1
      && parsed.getUTCDate() === day;
  }, "Quotation date is not a valid calendar date.");

export const procurementSourcingPathSchema = z.enum(PROCUREMENT_SOURCING_PATHS);

export const procurementRequirementSchema = z
  .object({
    requirementId: z.string().uuid().nullable().optional(),
    serviceId: z.string().uuid(),
    requirement: requiredText("Requirement is required", 2000),
    sourcingPath: procurementSourcingPathSchema,
    sourcingReason: requiredText("Sourcing reason is required", 2000),
    sourcingEvidence: requiredText("Sourcing evidence is required", 2000),
    requestId: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (
      (value.sourcingPath === "emergency" || value.sourcingPath === "sole_source") &&
      (!value.sourcingReason.trim() || !value.sourcingEvidence.trim())
    ) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Emergency and sole-source paths require reason and evidence.",
        path: ["sourcingReason"],
      });
    }
  });

export const procurementCandidateSchema = z
  .object({
    requirementId: z.string().uuid(),
    supplierId: z.string().uuid(),
    offerSummary: requiredText("Offer summary is required", 2000),
    evidenceRef: requiredText("Supplier evidence is required", 2000),
    quotedAmount: optionalQuotedAmount.optional(),
    comparisonNotes: optionalText.optional(),
    requestId: z.string().uuid(),
  })
  .strict();

export const procurementSelectionSchema = z
  .object({
    requirementId: z.string().uuid(),
    supplierId: z.string().uuid(),
    selectionReason: requiredText("Selection reason is required", 2000),
    selectionEvidence: requiredText("Selection evidence is required", 2000),
    requestId: z.string().uuid(),
  })
  .strict();

export const supplierQuotationLineSchema = z
  .object({
    requirementId: z.string().uuid(),
    lineSummary: requiredText("Quotation line summary is required", 2000),
    lineAmount: optionalQuotedAmount,
  })
  .strict();

export const supplierQuotationSchema = z
  .object({
    supplierId: z.string().uuid(),
    serviceId: z.string().uuid(),
    supplierReference: requiredText("Supplier quotation reference is required", 255),
    quotationDate: dateValue,
    packageTotal: optionalQuotedAmount,
    pricingMode: z.enum(["legacy", "total_only", "detailed"]).optional(),
    requirements: z.array(supplierQuotationLineSchema).optional(),
    lines: z.array(z.unknown()).optional(),
    requestId: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    const reqs = value.requirements ?? [];
    if (reqs.length > 0) {
      const ids = reqs.map((line) => line.requirementId);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each procurement requirement may appear once per quotation.",
          path: ["requirements"],
        });
      }
    }
  });

export const supplierQuotationDocumentReferenceSchema = z
  .object({
    quotationId: z.string().uuid(),
    documentId: z.string().uuid(),
  })
  .strict();
