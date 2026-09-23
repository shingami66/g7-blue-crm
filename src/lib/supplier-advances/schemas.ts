import { z } from "zod";
import { parseExactPositiveSarAmountText } from "@/lib/payments/amount";

const amount = z.string().trim().refine(
  (value) => parseExactPositiveSarAmountText(value) !== null,
  "Amount is invalid.",
);

export const authorizeSupplierAdvanceSchema = z.object({
  commitment_id: z.string().uuid(),
  amount,
  reason: z.string().trim().min(5).max(2000),
  request_id: z.string().uuid(),
  document: z.unknown(),
});

export const recordSupplierAdvancePaymentSchema = z.object({
  advance_id: z.string().uuid(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount,
  method: z.enum(["bank_transfer", "cash", "cheque"]),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  request_id: z.string().uuid(),
  document: z.unknown(),
}).superRefine((value, ctx) => {
  if (value.method !== "cash" && !value.reference) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reference"], message: "Payment reference is required." });
  }
});

export const allocateSupplierAdvanceSchema = z.object({
  advance_id: z.string().uuid(),
  supplier_bill_id: z.string().uuid(),
  amount,
  request_id: z.string().uuid(),
});

export const refundSupplierAdvanceSchema = z.object({
  advance_id: z.string().uuid(),
  business_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount,
  reason: z.string().trim().min(5).max(2000),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  request_id: z.string().uuid(),
  document: z.unknown(),
});

export const correctSupplierAdvanceEventSchema = z.object({
  event_id: z.string().uuid(),
  reason: z.string().trim().min(5).max(2000),
  request_id: z.string().uuid(),
});

export const releaseSupplierAdvanceAuthorizationSchema = z.object({
  advance_id: z.string().uuid(),
  reason: z.string().trim().min(5).max(2000),
  request_id: z.string().uuid(),
});
