import { z } from "zod";

export const quotationItemInputSchema = z.object({
  description: z.string().min(1, "Description is required"),
  details: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  qty: z.coerce.number().positive("Quantity must be greater than 0"),
  unit_price: z.coerce.number().nonnegative("Unit price cannot be negative"),
});

export const createQuotationSchema = z.object({
  service_id: z.string().uuid("Service is required"),
  event: z.string().min(1, "Event is required"),
  date: z.string().min(1, "Date is required"),
  valid_until: z.string().optional().nullable(),
  discount: z.coerce.number().nonnegative("Discount cannot be negative").default(0),
  vat_rate: z.coerce.number().min(0, "VAT rate cannot be less than 0").max(100, "VAT rate cannot exceed 100").default(15),
  items: z.array(quotationItemInputSchema).min(1, "At least one item is required"),
}).strict().refine(
  (data) => !data.valid_until || new Date(data.valid_until) >= new Date(data.date),
  {
    message: "Valid until date must be on or after the quotation date",
    path: ["valid_until"],
  }
);

export const updateQuotationSchema = z.object({
  event: z.string().min(1, "Event cannot be empty").optional().nullable(),
  date: z.string().min(1, "Date cannot be empty").optional().nullable(),
  valid_until: z.string().optional().nullable(),
  discount: z.coerce.number().nonnegative("Discount cannot be negative").optional().nullable(),
  vat_rate: z.coerce.number().min(0, "VAT rate cannot be less than 0").max(100, "VAT rate cannot exceed 100").optional().nullable(),
  items: z.array(quotationItemInputSchema).min(1, "At least one item is required"),
}).strict().refine(
  (data) => {
    if (data.valid_until && data.date) {
      return new Date(data.valid_until) >= new Date(data.date);
    }
    return true; // If either is missing, validation defers to DB level
  },
  {
    message: "Valid until date must be on or after the quotation date",
    path: ["valid_until"],
  }
);
