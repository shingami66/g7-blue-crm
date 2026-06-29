import { z } from "zod";

export const supplierAllocationStatusSchema = z.enum(["draft", "planned", "selected", "cancelled"]);
export const supplierAllocationCostSourceSchema = z.enum(["rate_card", "manual_estimate"]);

export const supplierAllocationRateCardSnapshotSchema = z.object({
  rateCardId: z.string().min(1),
  supplierId: z.string().min(1),
  itemName: z.string().min(1),
  unit: z.string().min(1),
  currency: z.literal("SAR"),
  baseCost: z.number().min(0),
  validFrom: z.string().nullable(),
  validTo: z.string().nullable(),
});

const baseAllocationSchema = z.object({
  supplierRateCardId: z.string().nullable().optional(),
  approvedQuotationId: z.string().nullable().optional(),
  status: supplierAllocationStatusSchema,
  category: z.string().trim().min(1, "Category is required"),
  itemName: z.string().trim().min(1, "Item name is required"),
  unit: z.string().trim().min(1, "Unit is required"),
  quantity: z.number().positive("Quantity must be greater than 0"),
  currency: z.literal("SAR"),
  estimatedUnitCost: z.number().min(0, "Estimated unit cost cannot be negative"),
  costSource: supplierAllocationCostSourceSchema,
  rateCardSnapshot: supplierAllocationRateCardSnapshotSchema.nullable().optional(),
  scopeOfWork: z.string().nullable().optional(),
  internalNotes: z.string().nullable().optional(),
});

export const supplierAllocationCreateSchema = baseAllocationSchema
  .extend({
    serviceId: z.string().min(1, "Service ID is required"),
    supplierId: z.string().min(1, "Supplier ID is required"),
  })
  .superRefine((data, ctx) => {
    if (data.costSource === "rate_card") {
      if (!data.supplierRateCardId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rate card ID is required when cost source is rate card",
          path: ["supplierRateCardId"],
        });
      }
      if (!data.rateCardSnapshot) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rate card snapshot is required when cost source is rate card",
          path: ["rateCardSnapshot"],
        });
      }
    }
  });

export const supplierAllocationUpdateSchema = baseAllocationSchema
  .extend({
    supplierId: z.string().min(1, "Supplier ID is required"),
  })
  .superRefine((data, ctx) => {
    if (data.status === "cancelled") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Cannot update status to cancelled using update schema. Use cancel schema/action instead.",
        path: ["status"],
      });
    }
    if (data.costSource === "rate_card") {
      if (!data.supplierRateCardId) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rate card ID is required when cost source is rate card",
          path: ["supplierRateCardId"],
        });
      }
      if (!data.rateCardSnapshot) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Rate card snapshot is required when cost source is rate card",
          path: ["rateCardSnapshot"],
        });
      }
    }
  });

export const supplierAllocationCancelSchema = z.object({
  cancelledReason: z.string().trim().min(1, "Cancellation reason is required"),
});
