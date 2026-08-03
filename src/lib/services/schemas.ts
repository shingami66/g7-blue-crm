import { z } from "zod";
import { SERVICE_STATUSES } from "./types";

const serviceStatusSchema = z.enum(SERVICE_STATUSES);

const trimmedRequiredString = (message: string) =>
  z.string().trim().min(1, message);

const nullableTrimmedString = z.preprocess(
  (input) => {
    if (input === undefined || input === null) return null;
    if (typeof input !== "string") return input;
    const trimmedInput = input.trim();
    return trimmedInput.length > 0 ? trimmedInput : null;
  },
  z.string().nullable()
);

const nullableDateString = z.preprocess(
  (input) => {
    if (input === undefined || input === null || input === "") return null;
    return input;
  },
  z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date").nullable()
);

const nullableNonnegativeMoney = z.preprocess(
  (input) => {
    if (input === undefined || input === null || input === "") return null;
    return input;
  },
  z.coerce.number().nonnegative("Estimated budget cannot be negative").nullable()
);

const serviceBaseSchema = z.object({
  customer_id: z.string().uuid("Customer is required"),
  service_title: trimmedRequiredString("Service title is required"),
  event_name: nullableTrimmedString.optional(),
  event_type: nullableTrimmedString.optional(),
  event_start_date: nullableDateString.optional(),
  event_end_date: nullableDateString.optional(),
  event_location: nullableTrimmedString.optional(),
  description: nullableTrimmedString.optional(),
  estimated_budget: nullableNonnegativeMoney.optional(),
  cancellation_reason: nullableTrimmedString.optional(),
});

function validateEventDateRange(
  input: {
    event_start_date?: string | null;
    event_end_date?: string | null;
  },
  context: z.RefinementCtx,
  requireStartDateForEnd: boolean
) {
  if (!input.event_end_date) return;

  if (input.event_start_date === undefined && !requireStartDateForEnd) return;

  if (!input.event_start_date) {
    context.addIssue({
      code: "custom",
      message: "Event start date is required when end date is set",
      path: ["event_start_date"],
    });
    return;
  }

  if (new Date(input.event_end_date) < new Date(input.event_start_date)) {
    context.addIssue({
      code: "custom",
      message: "Event end date must be on or after the start date",
      path: ["event_end_date"],
    });
  }
}

function validateCancellationReason(
  input: {
    status?: string;
    cancellation_reason?: string | null;
  },
  context: z.RefinementCtx
) {
  if (input.status !== "Cancelled") return;

  if (!input.cancellation_reason?.trim()) {
    context.addIssue({
      code: "custom",
      message: "Cancellation reason is required when service is cancelled",
      path: ["cancellation_reason"],
    });
  }
}

export const createServiceSchema = serviceBaseSchema
  .extend({
    status: z.literal("Inquiry").default("Inquiry"),
  })
  .strict()
  .superRefine((input, context) => {
    validateEventDateRange(input, context, true);
    validateCancellationReason(input, context);
  });

export const updateServiceSchema = serviceBaseSchema
  .partial()
  .extend({
    status: serviceStatusSchema.optional(),
  })
  .strict()
  .superRefine((input, context) => {
    validateEventDateRange(input, context, false);
    validateCancellationReason(input, context);
  });
