import { z } from "zod";

export const quotationItemInputSchema = z.object({
  description: z.string().min(1, "Description is required"),
  details: z.string().optional().nullable(),
  category: z.string().optional().nullable(),
  qty: z.coerce.number().positive("Quantity must be greater than 0"),
  unit_price: z.coerce.number().nonnegative("Unit price cannot be negative"),
});

export const quotationCommercialRoleSchema = z.enum([
  "authority_line",
  "included_component",
  "optional_add_on",
]);

/**
 * W2A structure metadata is intentionally separate from ordinary quotation
 * item pricing. The server/database remain the source of all amounts.
 */
export const quotationCommercialLineSchema = z.object({
  quotation_item_id: z.string().uuid(),
  commercial_role: quotationCommercialRoleSchema,
  parent_authority_line_id: z.string().uuid().nullable().optional(),
  is_selected: z.boolean().optional(),
  unit: z.string().trim().min(1).max(80).optional(),
  description_ar: z.string().trim().max(500).nullable().optional(),
}).strict();

export const quotationCommercialStructureSchema = z.object({
  lines: z.array(quotationCommercialLineSchema).min(1),
}).strict();

export const createQuotationSchema = z.object({
  mutation_key: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().min(1, "Mutation key is required")
  ),
  service_id: z.string().uuid("Service is required"),
  event: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().min(1, "Event is required")
  ),
  date: z.string().min(1, "Date is required"),
  valid_until: z.string().optional().nullable(),
  discount: z.coerce.number().nonnegative("Discount cannot be negative").default(0),
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

/**
 * W2B creates a successor Draft only for a non-approved post-Sent quotation.
 * The database RPC remains the authority for lifecycle and lineage checks.
 */
export const quotationRevisionSchema = z.object({
  revision_reason: z.string().trim().min(1, "Revision reason is required").max(500),
  mutation_key: z.preprocess(
    (val) => (typeof val === "string" ? val.trim() : val),
    z.string().min(1, "Mutation key is required").max(200),
  ),
}).strict();
