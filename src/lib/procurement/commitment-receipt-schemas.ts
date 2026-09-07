import { z } from "zod";
import { COMMITMENT_SOURCES, RECEIPT_ACCEPTANCE_STATES } from "./commitment-receipt-types.ts";

const optionalText = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  },
  z.string().max(4000).nullable(),
);

const optionalAmount = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") return null;
    if (typeof value === "string") return Number(value);
    return value;
  },
  z.number().finite().min(0).max(999999999999.99).nullable(),
);

const requiredAmount = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().finite().min(0).max(999999999999.99),
);

const requiredPositiveAmount = z.preprocess(
  (value) => (typeof value === "string" ? Number(value) : value),
  z.number().finite().gt(0).max(999999999999.99),
);

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.").refine((value) => {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}, "Use a valid calendar date.");

const isoDateTime = z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid approval timestamp.");

export const approvedCommitmentSchema = z.object({
  commitmentSource: z.enum(COMMITMENT_SOURCES),
  serviceId: z.string().uuid(),
  supplierId: z.string().uuid(),
  supplierQuotationId: z.string().uuid().nullable(),
  sourceReference: optionalText,
  originalApprovedAmount: requiredAmount,
  approvedAt: isoDateTime,
  requestId: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.commitmentSource === "supplier_quotation") {
    if (!value.supplierQuotationId || value.sourceReference !== null) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["supplierQuotationId"], message: "Supplier quotation source requires a quotation and no duplicate source reference." });
    }
  } else if (value.supplierQuotationId !== null || value.sourceReference === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["sourceReference"], message: "This commitment source requires an authorized source reference." });
  }
});

export const commitmentAmendmentSchema = z.object({
  commitmentId: z.string().uuid(),
  amendmentType: z.enum(["increase", "reduction"]),
  amount: requiredPositiveAmount,
  reason: z.string().trim().min(1).max(2000),
  evidenceRef: z.string().trim().min(1).max(2000),
  requestId: z.string().uuid(),
}).strict();

export const commitmentTransitionSchema = z.object({
  commitmentId: z.string().uuid(),
  action: z.enum(["close", "cancel", "reopen"]),
  reason: z.string().trim().min(1).max(2000),
  requestId: z.string().uuid(),
}).strict();

export const serviceReceiptSchema = z.object({
  serviceId: z.string().uuid(),
  commitmentId: z.string().uuid(),
  performanceDate: isoDate,
  deliveredScope: z.string().trim().min(1).max(4000),
  actualQuantity: optionalAmount,
  actualHours: optionalAmount,
  quantityUnit: optionalText.transform((value) => value && value.slice(0, 100)),
  receivedAmount: optionalAmount,
  missingScope: optionalText,
  extraScope: optionalText,
  defectsIncidents: optionalText,
  conditionsNotes: optionalText,
  requestId: z.string().uuid(),
}).strict();

export const serviceReceiptReviewSchema = z.object({
  receiptId: z.string().uuid(),
  acceptanceStatus: z.enum(RECEIPT_ACCEPTANCE_STATES.filter((value) => value !== "PENDING") as ["ACCEPTED", "ACCEPTED_WITH_CONDITIONS", "REJECTED"]),
  conditionsNotes: optionalText,
  requestId: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.acceptanceStatus === "ACCEPTED_WITH_CONDITIONS" && value.conditionsNotes === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["conditionsNotes"], message: "Conditions are required for conditional acceptance." });
  }
});

export const serviceReceiptCorrectionSchema = z.object({
  receiptId: z.string().uuid(),
  correctedAcceptanceStatus: z.enum(["ACCEPTED", "ACCEPTED_WITH_CONDITIONS", "REJECTED"]),
  correctedReceivedAmount: optionalAmount,
  correctedConditionsNotes: optionalText,
  correctionReason: z.string().trim().min(1).max(2000),
  requestId: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.correctedAcceptanceStatus === "ACCEPTED_WITH_CONDITIONS" && value.correctedConditionsNotes === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, path: ["correctedConditionsNotes"], message: "Conditions are required for conditional acceptance." });
  }
});

export const evidenceDocumentsSchema = z.object({
  commitmentId: z.string().uuid().optional(),
  receiptId: z.string().uuid().optional(),
  documentIds: z.array(z.string().uuid()).min(1).max(50),
  requestId: z.string().uuid(),
}).strict().refine((value) => Boolean(value.commitmentId) !== Boolean(value.receiptId), "Attach documents to one commitment or one receipt.");
