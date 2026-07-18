import { z } from "zod";

export const SUPPLIER_ALLOCATION_MAX_QUANTITY = 9_999_999.999;
export const SUPPLIER_ALLOCATION_MAX_UNIT_COST = 999_999_999_999.99;

function hasPrecision(value: number, decimalPlaces: number) {
  const scaled = value * 10 ** decimalPlaces;
  return (
    Number.isSafeInteger(Math.round(scaled)) &&
    Math.abs(scaled - Math.round(scaled)) < 0.000001
  );
}

export const supplierAllocationQuantitySchema = z
  .number()
  .finite("Quantity must be a finite number")
  .positive("Quantity must be greater than 0")
  .max(
    SUPPLIER_ALLOCATION_MAX_QUANTITY,
    `Quantity cannot exceed ${SUPPLIER_ALLOCATION_MAX_QUANTITY}`,
  )
  .refine((value) => hasPrecision(value, 3), {
    message: "Quantity cannot have more than 3 decimal places",
  });

export const supplierAllocationUnitCostSchema = z
  .number()
  .finite("Estimated unit cost must be a finite number")
  .min(0, "Estimated unit cost cannot be negative")
  .max(
    SUPPLIER_ALLOCATION_MAX_UNIT_COST,
    `Estimated unit cost cannot exceed ${SUPPLIER_ALLOCATION_MAX_UNIT_COST}`,
  )
  .refine((value) => hasPrecision(value, 2), {
    message: "Estimated unit cost cannot have more than 2 decimal places",
  });

export const supplierAllocationStatusSchema = z.enum(["draft", "planned", "selected", "cancelled"]);
export const supplierAllocationCostSourceSchema = z.enum(["rate_card", "manual_estimate"]);

export const supplierAllocationRateCardSnapshotSchema = z.object({
  rateCardId: z.string().min(1),
  supplierId: z.string().min(1),
  itemName: z.string().min(1),
  unit: z.string().min(1),
  currency: z.literal("SAR"),
  baseCost: supplierAllocationUnitCostSchema,
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
  quantity: supplierAllocationQuantitySchema,
  currency: z.literal("SAR"),
  estimatedUnitCost: supplierAllocationUnitCostSchema,
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
      // Note: rateCardSnapshot is not required from client for create, server builds it
    }
  });

export const supplierAllocationUpdateSchema = baseAllocationSchema
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
