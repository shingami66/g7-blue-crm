import { z } from "zod";
import { parseExactPositiveSarAmountText } from "@/lib/payments/amount";

export const supplierPaymentInputSchema = z.object({
  supplier_bill_id: z.string().uuid(),
  payment_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  amount: z.string().trim().refine((value) => parseExactPositiveSarAmountText(value) !== null, "Amount is invalid."),
  method: z.enum(["bank_transfer", "cash", "cheque"]),
  reference: z.string().trim().max(200).optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
  request_id: z.string().uuid(),
  document: z.unknown(),
}).superRefine((value, ctx) => {
  if ((value.method === "bank_transfer" || value.method === "cheque") && !value.reference) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["reference"], message: "Payment reference is required." });
  }
});

export const reverseSupplierPaymentSchema = z.object({
  payment_id: z.string().uuid(),
  reason: z.string().trim().min(5).max(2000),
  request_id: z.string().uuid(),
});

export type SupplierPaymentInput = z.infer<typeof supplierPaymentInputSchema>;
