import { z } from "zod";
import { parseExactPositiveSarAmountText } from "./amount.ts";

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  requestId: z.string().uuid(),
  amount: z.string().transform((rawAmount, context) => {
    const numericAmount = parseExactPositiveSarAmountText(rawAmount);
    if (numericAmount === null) {
      context.addIssue({ code: z.ZodIssueCode.custom, message: "Invalid payment amount" });
      return z.NEVER;
    }
    return numericAmount;
  }),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  method: z.enum(["bank_transfer", "cash", "cheque", "online"]),
  reference: z.string().optional(),
});
