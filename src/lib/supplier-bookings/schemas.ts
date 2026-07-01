import { z } from "zod";

export const supplierBookingStatusSchema = z.enum(["draft", "cancelled"]);

export const supplierBookingIdSchema = z.string().uuid("Invalid supplier booking ID");

export const createSupplierBookingSchema = z.object({
  sourceAllocationId: z.string().uuid("Source allocation ID is required"),
});

export const cancelSupplierBookingSchema = z.object({
  cancelledReason: z
    .string()
    .trim()
    .min(1, "Cancellation reason is required")
    .max(1000, "Cancellation reason is too long"),
});
