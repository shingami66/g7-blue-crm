import { z } from "zod";
import {
  APPROVED_BILLING_SCOPE_ITEM_DECISIONS,
  APPROVED_BILLING_SCOPE_LINE_SAFETY_STATUSES,
  APPROVED_BILLING_SCOPE_REASON_CODES,
  APPROVED_BILLING_SCOPE_VOID_REASON_CODES,
} from "./types";

const boundedTrimmedString = (label: string, max = 1000) =>
  z
    .string()
    .trim()
    .min(1, `${label} is required`)
    .max(max, `${label} is too long`);

const optionalBoundedTrimmedString = (max = 1000) =>
  z
    .string()
    .trim()
    .max(max, `Value must be ${max} characters or fewer`)
    .transform((value) => (value.length > 0 ? value : undefined))
    .optional();

const approvedBillingScopeIdSchema = z.string().uuid("Invalid approved billing scope ID");
const approvedBillingScopeItemIdSchema = z.string().uuid("Invalid approved billing scope item ID");
const quotationIdSchema = z.string().uuid("Invalid source quotation ID");

const nonNegativeOptionalNumber = z
  .number()
  .finite("Value must be finite")
  .min(0, "Value cannot be negative")
  .optional();

export const approvedBillingScopeDecisionSchema = z.enum(
  APPROVED_BILLING_SCOPE_ITEM_DECISIONS
);

export const approvedBillingScopeLineSafetyStatusSchema = z.enum(
  APPROVED_BILLING_SCOPE_LINE_SAFETY_STATUSES
).exclude(["pending_review"]);

export const approvedBillingScopeReasonCodeSchema = z.enum(
  APPROVED_BILLING_SCOPE_REASON_CODES
);

export const approvedBillingScopeVoidReasonCodeSchema = z.enum(
  APPROVED_BILLING_SCOPE_VOID_REASON_CODES
);

export const createApprovedBillingScopeDraftSchema = z.object({
  sourceQuotationId: quotationIdSchema,
});

export const editApprovedBillingScopeItemSchema = z
  .object({
    scopeId: approvedBillingScopeIdSchema,
    itemId: approvedBillingScopeItemIdSchema,
    decision: approvedBillingScopeDecisionSchema,
    acceptedQty: nonNegativeOptionalNumber,
    acceptedUnitPrice: nonNegativeOptionalNumber,
    reasonCode: approvedBillingScopeReasonCodeSchema.optional(),
    reasonNote: optionalBoundedTrimmedString(),
    displayOrder: z
      .number()
      .int("Display order must be an integer")
      .min(0, "Display order cannot be negative")
      .optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    const reasonRequired =
      data.decision === "adjusted" ||
      data.decision === "excluded" ||
      data.decision === "customer_supplied";

    if (reasonRequired && !data.reasonCode) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Reason code is required for this decision",
        path: ["reasonCode"],
      });
    }

    if (data.decision === "adjusted") {
      if (
        data.acceptedQty === undefined &&
        data.acceptedUnitPrice === undefined
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Adjusted items must provide accepted quantity, accepted unit price, or both",
          path: ["acceptedQty"],
        });
      }
    }

    if (
      data.decision === "excluded" ||
      data.decision === "customer_supplied"
    ) {
      if (data.acceptedQty !== undefined && data.acceptedQty !== 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Accepted quantity must be zero for excluded or customer-supplied items",
          path: ["acceptedQty"],
        });
      }

      if (
        data.acceptedUnitPrice !== undefined &&
        data.acceptedUnitPrice !== 0
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "Accepted unit price must be zero for excluded or customer-supplied items",
          path: ["acceptedUnitPrice"],
        });
      }
    }
  });

export const reviewApprovedBillingScopeLineSafetySchema = z
  .object({
    scopeId: approvedBillingScopeIdSchema,
    lineSafetyStatus: approvedBillingScopeLineSafetyStatusSchema,
    reasonCode: approvedBillingScopeReasonCodeSchema.optional(),
    reviewerNote: optionalBoundedTrimmedString(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.lineSafetyStatus === "unsafe") {
      if (!data.reasonCode) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Reason code is required when line safety is unsafe",
          path: ["reasonCode"],
        });
      }

      if (!data.reviewerNote) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Reviewer note is required when line safety is unsafe",
          path: ["reviewerNote"],
        });
      }
    }
  });

export const approveApprovedBillingScopeSchema = z
  .object({
    scopeId: approvedBillingScopeIdSchema,
  })
  .strict();

export const voidApprovedBillingScopeSchema = z
  .object({
    scopeId: approvedBillingScopeIdSchema,
    reasonCode: approvedBillingScopeVoidReasonCodeSchema,
    reasonNote: boundedTrimmedString("Void reason note"),
  })
  .strict();

export const discardApprovedBillingScopeDraftSchema = z
  .object({
    scopeId: approvedBillingScopeIdSchema,
  })
  .strict();

export const supersedeApprovedBillingScopeSchema = z
  .object({
    newScopeId: approvedBillingScopeIdSchema,
    supersedeTargetScopeId: approvedBillingScopeIdSchema,
  })
  .strict();

export type CreateApprovedBillingScopeDraftInput = z.infer<
  typeof createApprovedBillingScopeDraftSchema
>;
export type EditApprovedBillingScopeItemInput = z.infer<
  typeof editApprovedBillingScopeItemSchema
>;
export type ReviewApprovedBillingScopeLineSafetyInput = z.infer<
  typeof reviewApprovedBillingScopeLineSafetySchema
>;
export type ApproveApprovedBillingScopeInput = z.infer<
  typeof approveApprovedBillingScopeSchema
>;
export type VoidApprovedBillingScopeInput = z.infer<
  typeof voidApprovedBillingScopeSchema
>;
export type DiscardApprovedBillingScopeDraftInput = z.infer<
  typeof discardApprovedBillingScopeDraftSchema
>;
export type SupersedeApprovedBillingScopeInput = z.infer<
  typeof supersedeApprovedBillingScopeSchema
>;
