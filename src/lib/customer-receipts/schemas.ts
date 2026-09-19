import { z } from "zod";
import { parseExactPositiveSarAmountText } from "@/lib/payments/amount";

const amountText = z.string().transform((rawAmount, context) => {
  const amount = parseExactPositiveSarAmountText(rawAmount);
  if (amount === null) {
    context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid amount" });
    return z.NEVER;
  }
  return amount;
});

const requestId = z.string().uuid();

export const recordCustomerReceiptSchema = z.object({
  customerId: z.string().uuid(),
  amount: amountText,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  method: z.enum(["bank_transfer", "cash", "cheque", "online"]),
  reference: z.string().max(200).optional(),
  notes: z.string().max(2000).optional(),
  requestId,
});

export const allocateCustomerReceiptSchema = z.object({
  paymentId: z.string().uuid(),
  invoiceId: z.string().uuid(),
  amount: amountText,
  requestId,
});

export const reverseCustomerReceiptAllocationSchema = z.object({
  allocationId: z.string().uuid(),
  reason: z.string().trim().min(5).max(2000),
  requestId,
});

export const reverseCustomerReceiptSchema = z.object({
  paymentId: z.string().uuid(),
  reason: z.string().trim().min(5).max(2000),
  requestId,
});

export const customerReceiptInvoiceSearchSchema = z.object({
  customerId: z.string().uuid(),
  search: z.string().max(120).optional(),
});

export const customerSearchSchema = z.object({
  search: z.string().max(120).optional(),
});
