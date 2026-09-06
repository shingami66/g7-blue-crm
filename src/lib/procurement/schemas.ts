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

const optionalPositiveQuantity = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z
    .number()
    .finite("Quantity must be a finite number")
    .positive("Quantity must be greater than zero")
    .max(999999999.99)
    .refine((value) => hasTwoDecimals(value), "Quantity supports up to two decimals.")
    .nullable(),
);

const optionalUnitPrice = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z
    .number()
    .finite("Unit price must be a finite number")
    .min(0, "Unit price must be non-negative")
    .max(999999999999.99)
    .refine((value) => hasTwoDecimals(value), "Unit price supports up to two decimals.")
    .nullable(),
);

const requiredLineTotal = z.preprocess(
  (value) => {
    if (typeof value === "string") return Number(value);
    return value;
  },
  z
    .number()
    .finite("Line total must be a finite number")
    .min(0, "Line total must be non-negative")
    .max(999999999999.99)
    .refine((value) => hasTwoDecimals(value), "Line total supports up to two decimals."),
);

export const supplierQuotationDetailedLineSchema = z
  .object({
    packageRequirementId: z.string().uuid().nullable().optional(),
    description: requiredText("Quotation line description is required", 2000),
    quantity: optionalPositiveQuantity.optional(),
    unit: optionalText.optional(),
    unitPrice: optionalUnitPrice.optional(),
    lineTotal: requiredLineTotal,
    sortOrder: z.number().int().min(0).optional(),
  })
  .strict()
  .superRefine((line, context) => {
    if (line.quantity !== null && line.quantity !== undefined && line.unitPrice !== null && line.unitPrice !== undefined) {
      const computed = roundMoney(line.quantity * line.unitPrice);
      if (computed !== line.lineTotal) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Line total (${line.lineTotal}) must equal quantity (${line.quantity}) multiplied by unit price (${line.unitPrice}) = ${computed}`,
          path: ["lineTotal"],
        });
      }
    }
  });

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
    lines: z.array(supplierQuotationDetailedLineSchema).optional(),
    requestId: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    const reqs = value.requirements ?? [];
    const lines = value.lines ?? [];

    if (reqs.length > 0 && lines.length > 0) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Quotation cannot combine legacy requirements with detailed line items.",
        path: ["lines"],
      });
      return;
    }

    if (reqs.length > 0) {
      const ids = reqs.map((line) => line.requirementId);
      if (new Set(ids).size !== ids.length) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Each procurement requirement may appear once per quotation.",
          path: ["requirements"],
        });
      }
      return;
    }

    if (lines.length > 0) {
      if (lines.length > 100) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Quotation cannot exceed 100 line items.",
          path: ["lines"],
        });
        return;
      }
      if (value.packageTotal === null || value.packageTotal === undefined) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Total amount is required for detailed supplier quotations.",
          path: ["packageTotal"],
        });
        return;
      }
      const lineSubtotal = lines.reduce((sum, line) => roundMoney(sum + line.lineTotal), 0);
      if (value.packageTotal !== lineSubtotal) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          message: `Quotation package total (${value.packageTotal}) must equal sum of line totals (${lineSubtotal}).`,
          path: ["packageTotal"],
        });
      }
      return;
    }

    if (value.packageTotal === null || value.packageTotal === undefined) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Total amount is required for total-only supplier quotations.",
        path: ["packageTotal"],
      });
    }
  });

export const supplierQuotationDocumentReferenceSchema = z
  .object({
    quotationId: z.string().uuid(),
    documentId: z.string().uuid(),
  })
  .strict();
