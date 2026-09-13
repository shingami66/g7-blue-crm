import { z } from "zod";

const uuid = z.string().uuid();

export const supplierBillInputSchema = z
  .object({
    service_id: uuid,
    supplier_id: uuid,
    commitment_id: uuid,
    service_receipt_id: uuid,
    invoice_number: z.string().trim().min(1).max(200),
    invoice_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable().optional(),
    currency: z.string().trim().length(3).transform((value) => value.toUpperCase()),
    subtotal: z.number().nonnegative().finite(),
    vat_amount: z.number().nonnegative().finite(),
    total_amount: z.number().positive().finite(),
    request_id: uuid,
  })
  .superRefine((value, ctx) => {
    if (value.total_amount !== value.subtotal + value.vat_amount) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["total_amount"], message: "Total must equal subtotal plus VAT." });
    }
    if (value.due_date && value.due_date < value.invoice_date) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["due_date"], message: "Due date cannot precede invoice date." });
    }
  });

export const updateSupplierBillSchema = supplierBillInputSchema.extend({ bill_id: uuid });

export const approveSupplierBillSchema = z.object({ bill_id: uuid, request_id: uuid });

export const supplierBillDocumentSchema = z.object({ bill_id: uuid, request_id: uuid });

export type SupplierBillInput = z.infer<typeof supplierBillInputSchema>;
export type UpdateSupplierBillInput = z.infer<typeof updateSupplierBillSchema>;
