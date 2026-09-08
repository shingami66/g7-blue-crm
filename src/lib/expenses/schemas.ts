import { z } from "zod";

export const uuidSchema = z.string().uuid({ message: "Invalid UUID identifier" });

export const submitExpenseSchema = z
  .object({
    expense_number: z
      .string()
      .trim()
      .min(3, { message: "Expense number must be at least 3 characters" }),
    context_type: z.enum(["company", "event"]),
    service_id: uuidSchema.nullable().optional(),
    expense_category: z.string().trim().min(1, { message: "Category is required" }),
    description: z.string().trim().min(1, { message: "Description is required" }),
    amount: z.number().positive({ message: "Amount must be greater than zero" }),
    expense_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Expense date must be YYYY-MM-DD" }),
    origin_type: z.enum(["company_direct", "employee_paid"]),
    payment_method: z.enum([
      "company_funds",
      "petty_cash",
      "cash_advance",
      "personal_funds",
    ]),
    cash_advance_id: uuidSchema.nullable().optional(),
    petty_cash_fund_id: uuidSchema.nullable().optional(),
    claimant_id: uuidSchema.nullable().optional(),
    request_id: uuidSchema,
  })
  .superRefine((data, ctx) => {
    // Context check
    if (data.context_type === "company" && data.service_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company context expense must not specify a service_id",
        path: ["service_id"],
      });
    }
    if (data.context_type === "event" && !data.service_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event context expense must specify a service_id",
        path: ["service_id"],
      });
    }

    // Origin claimant check
    if (data.origin_type === "company_direct" && data.claimant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company direct expense must not have a claimant_id",
        path: ["claimant_id"],
      });
    }
    if (data.origin_type === "employee_paid" && !data.claimant_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Employee paid expense must specify a claimant_id",
        path: ["claimant_id"],
      });
    }

    // Funding path exclusivity check
    if (data.origin_type === "employee_paid") {
      if (data.payment_method !== "personal_funds") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Employee paid expense must use personal_funds payment method",
          path: ["payment_method"],
        });
      }
      if (data.cash_advance_id || data.petty_cash_fund_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Employee paid expense cannot link to cash advance or petty cash fund",
          path: ["payment_method"],
        });
      }
    } else {
      // company_direct
      if (data.payment_method === "personal_funds") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company direct expense cannot use personal_funds",
          path: ["payment_method"],
        });
      }
      if (data.payment_method === "cash_advance" && !data.cash_advance_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Cash advance payment method requires cash_advance_id",
          path: ["cash_advance_id"],
        });
      }
      if (data.payment_method === "petty_cash" && !data.petty_cash_fund_id) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Petty cash payment method requires petty_cash_fund_id",
          path: ["petty_cash_fund_id"],
        });
      }
      if (
        data.payment_method === "company_funds" &&
        (data.cash_advance_id || data.petty_cash_fund_id)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Company funds payment method must not link to cash advance or petty cash",
          path: ["payment_method"],
        });
      }
    }
  });

export const approveExpenseSchema = z.object({
  expense_id: uuidSchema,
  request_id: uuidSchema,
});

export const rejectExpenseSchema = z.object({
  expense_id: uuidSchema,
  rejection_reason: z
    .string()
    .trim()
    .min(5, { message: "Rejection reason must be at least 5 characters" }),
  request_id: uuidSchema,
});

export const cancelExpenseSchema = z.object({
  expense_id: uuidSchema,
  cancellation_reason: z
    .string()
    .trim()
    .min(5, { message: "Cancellation reason must be at least 5 characters" }),
  request_id: uuidSchema,
});

export const recordEvidenceExceptionSchema = z.object({
  expense_id: uuidSchema,
  reason: z
    .string()
    .trim()
    .min(10, { message: "Exception reason must be at least 10 characters" }),
  accountable_owner_id: uuidSchema,
  review_before: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Review before date must be YYYY-MM-DD" }),
  request_id: uuidSchema,
});

export const disposeEvidenceExceptionSchema = z.object({
  exception_id: uuidSchema,
  disposition: z.enum(["accepted", "rejected", "rectified"]),
  disposition_notes: z
    .string()
    .trim()
    .min(5, { message: "Disposition notes must be at least 5 characters" }),
  request_id: uuidSchema,
});

export const attachExpenseDocumentSchema = z.object({
  expense_id: uuidSchema,
  document_id: uuidSchema,
  request_id: uuidSchema,
});

export const settleExpenseReimbursementSchema = z.object({
  expense_id: uuidSchema,
  settlement_number: z
    .string()
    .trim()
    .min(3, { message: "Settlement number must be at least 3 characters" }),
  amount: z.number().positive({ message: "Settlement amount must be positive" }),
  settlement_method: z.enum(["bank_transfer", "cash", "advance_offset"]),
  payment_reference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  request_id: uuidSchema,
});

export const requestCashAdvanceSchema = z
  .object({
    advance_number: z
      .string()
      .trim()
      .min(3, { message: "Advance number must be at least 3 characters" }),
    context_type: z.enum(["company", "event"]),
    service_id: uuidSchema.nullable().optional(),
    recipient_id: uuidSchema,
    purpose: z
      .string()
      .trim()
      .min(5, { message: "Purpose must be at least 5 characters" }),
    amount_issued: z
      .number()
      .positive({ message: "Amount must be greater than zero" }),
    request_id: uuidSchema,
  })
  .superRefine((data, ctx) => {
    if (data.context_type === "company" && data.service_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company context advance must not specify a service_id",
        path: ["service_id"],
      });
    }
    if (data.context_type === "event" && !data.service_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event context advance must specify a service_id",
        path: ["service_id"],
      });
    }
  });

export const approveCashAdvanceSchema = z.object({
  advance_id: uuidSchema,
  request_id: uuidSchema,
});

export const rejectCashAdvanceSchema = z.object({
  advance_id: uuidSchema,
  rejection_reason: z
    .string()
    .trim()
    .min(5, { message: "Rejection reason must be at least 5 characters" }),
  request_id: uuidSchema,
});

export const cancelCashAdvanceSchema = z.object({
  advance_id: uuidSchema,
  cancellation_reason: z
    .string()
    .trim()
    .min(5, { message: "Cancellation reason must be at least 5 characters" }),
  request_id: uuidSchema,
});

export const issueCashAdvanceSchema = z.object({
  advance_id: uuidSchema,
  payment_reference: z.string().trim().nullable().optional(),
  request_id: uuidSchema,
});

export const settleCashAdvanceSpendSchema = z.object({
  advance_id: uuidSchema,
  expense_id: uuidSchema,
  amount: z.number().positive({ message: "Spend amount must be positive" }),
  notes: z.string().trim().nullable().optional(),
  request_id: uuidSchema,
});

export const recordCashAdvanceReturnSchema = z.object({
  advance_id: uuidSchema,
  amount: z.number().positive({ message: "Return amount must be positive" }),
  receipt_reference: z.string().trim().nullable().optional(),
  notes: z.string().trim().nullable().optional(),
  request_id: uuidSchema,
});

export const recordPettyCashTransactionSchema = z
  .object({
    fund_id: uuidSchema,
    transaction_type: z.enum(["replenishment", "disbursement", "return"]),
    amount: z.number().positive({ message: "Amount must be positive" }),
    reference: z.string().trim().nullable().optional(),
    expense_id: uuidSchema.nullable().optional(),
    notes: z.string().trim().nullable().optional(),
    request_id: uuidSchema,
  })
  .superRefine((data, ctx) => {
    if (data.transaction_type !== "disbursement" && data.expense_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Only disbursements may be linked to an expense",
        path: ["expense_id"],
      });
    }
  });

export const reviewExpenseFinanceSchema = z.object({
  expense_id: uuidSchema,
  request_id: uuidSchema,
});
export type ReviewExpenseFinanceInput = z.infer<typeof reviewExpenseFinanceSchema>;

export const selfServiceSubmitExpenseSchema = z
  .object({
    context_type: z.enum(["company", "event"]),
    service_id: uuidSchema.nullable().optional(),
    expense_category: z.string().trim().min(1, { message: "Category is required" }),
    description: z.string().trim().min(1, { message: "Description is required" }),
    amount: z.number().positive({ message: "Amount must be greater than zero" }),
    expense_date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, { message: "Expense date must be YYYY-MM-DD" }),
    request_id: uuidSchema.optional().default(() => crypto.randomUUID()),
  })
  .superRefine((data, ctx) => {
    if (data.context_type === "company" && data.service_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Company context expense must not specify a service_id",
        path: ["service_id"],
      });
    }
    if (data.context_type === "event" && !data.service_id) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Event context expense must specify a service_id",
        path: ["service_id"],
      });
    }
  });

export type SelfServiceSubmitExpenseInput = z.infer<typeof selfServiceSubmitExpenseSchema>;
