import { z } from "zod";
import { parseExactPositiveSarAmountText } from "@/lib/payments/amount";
import { CUSTOMER_CREDIT_REASON_CODES } from "./types";

const amountText = z.string().transform((rawAmount, context) => {
  const amount = parseExactPositiveSarAmountText(rawAmount);
  if (amount === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid amount" });
    return z.NEVER;
  }
  return amount;
});

const requestId = z.string().uuid();
const businessDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format");
const reason = z.string().trim().min(5).max(2000);

export const recordCustomerInternalCreditAdjustmentSchema = z
  .object({
    customerId: z.string().uuid(),
    serviceId: z.string().uuid(),
    invoiceId: z.string().uuid(),
    amount: amountText,
    reasonCode: z.enum(CUSTOMER_CREDIT_REASON_CODES),
    reason,
    effectiveDate: businessDate,
    requestId,
    sourceApprovedBillingScopeId: z.string().uuid().optional(),
    successorApprovedBillingScopeId: z.string().uuid().optional(),
  })
  .refine(
    (value) => Boolean(value.sourceApprovedBillingScopeId) === Boolean(value.successorApprovedBillingScopeId),
    { message: "Commercial correction scope links must be supplied together" },
  );

export const refundCustomerCreditSchema = z.object({
  customerId: z.string().uuid(),
  sourceCreditAdjustmentId: z.string().uuid(),
  amount: amountText,
  businessDate,
  reason,
  refundMethod: z.enum(["bank_transfer", "cash", "cheque", "online"]),
  reference: z.string().max(200).optional(),
  requestId,
});

export const applyCustomerCreditSchema = z.object({
  customerId: z.string().uuid(),
  sourceCreditAdjustmentId: z.string().uuid(),
  targetInvoiceId: z.string().uuid(),
  amount: amountText,
  businessDate,
  reason,
  requestId,
});

export const reverseCustomerInternalCreditAdjustmentSchema = z.object({
  customerId: z.string().uuid(),
  sourceCreditAdjustmentId: z.string().uuid(),
  amount: amountText,
  effectiveDate: businessDate,
  reason,
  requestId,
});

export const reverseCustomerRefundSchema = z.object({
  customerId: z.string().uuid(),
  sourceRefundId: z.string().uuid(),
  amount: amountText,
  businessDate,
  reason,
  requestId,
});

export const reverseCustomerCreditApplicationSchema = z.object({
  customerId: z.string().uuid(),
  sourceApplicationId: z.string().uuid(),
  amount: amountText,
  businessDate,
  reason,
  requestId,
});
