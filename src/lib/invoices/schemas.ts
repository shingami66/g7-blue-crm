import { z } from "zod";

export const createInvoiceSchema = z.object({
  mutationKey: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().min(1, "Mutation key is required"),
  ),
  quotationId: z.string().uuid("Invalid quotation ID"),
  serviceId: z.string().uuid("Invalid service ID"),
  invoiceType: z.enum(["deposit", "final"], { message: "Invoice type must be deposit or final" }),
  requestedAmount: z.number().positive("Amount must be positive").finite("Amount must be finite").optional(),
});
