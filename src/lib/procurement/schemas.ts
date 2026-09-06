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
