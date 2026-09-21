import { z } from "zod";

export const createInvoiceSchema = z.object({
  mutationKey: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().min(1, "Mutation key is required"),
  ),
  quotationId: z.string().uuid("Invalid quotation ID"),
  serviceId: z.string().uuid("Invalid service ID"),
  invoiceType: z.enum(["deposit", "progress", "final"], { message: "Invoice type is invalid" }),
  requestedAmount: z.number().positive("Amount must be positive").finite("Amount must be finite").optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date").optional(),
});

export const updateDraftFlexibleInvoiceSchema = z.object({
  mutationKey: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().min(1, "Mutation key is required"),
  ),
  invoiceId: z.string().uuid("Invalid invoice ID"),
  requestedAmount: z.number().positive("Amount must be positive").finite("Amount must be finite"),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid due date"),
});
