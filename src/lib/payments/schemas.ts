import { z } from "zod";

export const recordPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format"),
  method: z.enum(["bank_transfer", "cash", "cheque", "online"]),
  reference: z.string().optional(),
});
