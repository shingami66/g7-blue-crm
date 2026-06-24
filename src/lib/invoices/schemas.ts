import { z } from "zod";

export const createInvoiceSchema = z.object({
  quotationId: z.string().uuid("Invalid quotation ID"),
  serviceId: z.string().uuid("Invalid service ID"),
  invoiceType: z.enum(["deposit", "final"], { required_error: "Invoice type must be deposit or final" }),
  requestedAmount: z.number().positive("Amount must be positive").finite("Amount must be finite").optional(),
});
