import { z } from "zod";
import { ACCOUNTING_CAPABILITIES } from "./types";

const boundedText = (maximum: number) =>
  z.string().trim().min(1).max(maximum);

const optionalEvidence = z
  .string()
  .trim()
  .min(1)
  .max(2000)
  .nullable()
  .optional();

const nullableEvidence = z.string().trim().min(1).max(2000).nullable();

const validDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
}, "Expected a valid calendar date");

export const accountingCapabilitySchema = z.enum(ACCOUNTING_CAPABILITIES);
export const accountingCapabilityEffectSchema = z.enum(["ALLOW", "DENY", "REVOKE"]);

export const setAccountingCapabilityInputSchema = z
  .object({
    target_user_id: z.string().uuid(),
    capability: accountingCapabilitySchema,
    effect: accountingCapabilityEffectSchema,
    expires_at: z.string().datetime({ offset: true }).nullable().optional(),
    expected_revision: z.number().int().nonnegative(),
    reason: boundedText(2000),
    evidence_ref: optionalEvidence,
    request_id: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.effect !== "ALLOW" && value.expires_at != null) {
      context.addIssue({
        code: "custom",
        path: ["expires_at"],
        message: "Expiry is supported only for ALLOW assignments",
      });
    }
  });

const accountingProfileFields = z
  .object({
    framework_key: z.literal("SA_IFRS_FOR_SMES"),
    framework_edition: z.literal(2025),
    policy_version: boundedText(80),
    endorsement_context: boundedText(500),
    professional_validation_state: z.literal("DEFERRED"),
    professional_validation_evidence_ref: nullableEvidence,
    functional_currency: z.literal("SAR"),
    fiscal_start_month: z.literal(1),
    fiscal_start_day: z.literal(1),
    fiscal_end_month: z.literal(12),
    fiscal_end_day: z.literal(31),
    fiscal_timezone: z.literal("Asia/Riyadh"),
    accounting_start_date: validDate.nullable(),
    cutover_boundary_date: validDate.nullable(),
    legal_fiscal_evidence_pending: z.boolean(),
    legal_fiscal_evidence_ref: nullableEvidence,
    vat_mode: z.literal("not_registered"),
    zatca_state: z.literal("INACTIVE"),
    fatoora_state: z.literal("INACTIVE"),
    activation_state: z.enum(["INACTIVE", "DEV_PROVISIONAL"]),
  })
  .strict();

function validateProfileCompleteness(
  value: { activation_state: "INACTIVE" | "DEV_PROVISIONAL"; accounting_start_date: string | null; cutover_boundary_date: string | null },
  context: z.RefinementCtx,
) {
  if (value.activation_state === "DEV_PROVISIONAL") {
    if (!value.accounting_start_date || !value.cutover_boundary_date) {
      context.addIssue({
        code: "custom",
        path: ["accounting_start_date"],
        message: "DEV_PROVISIONAL requires accounting start and cutover dates",
      });
    } else if (value.cutover_boundary_date < value.accounting_start_date) {
      context.addIssue({
        code: "custom",
        path: ["cutover_boundary_date"],
        message: "Cutover cannot precede the accounting start date",
      });
    }
  }
}

export const accountingProfileInputSchema = accountingProfileFields.superRefine(
  validateProfileCompleteness,
);

export const accountingCapabilityAssignmentSchema = z
  .object({
    capability: accountingCapabilitySchema,
    effect: accountingCapabilityEffectSchema,
    revision: z.number().int().positive(),
    expires_at: z.string().nullable(),
    actor_user_id: z.string().uuid(),
    created_at: z.string(),
  })
  .strict();

export const accountingProfileSnapshotSchema = accountingProfileFields
  .extend({
    id: z.string().uuid(),
    singleton_key: z.literal("g7"),
    company_settings_id: z.string().uuid(),
    version: z.number().int().positive(),
    effective_from: z.string(),
    reason: boundedText(2000),
    evidence_ref: nullableEvidence,
    created_by: z.string().uuid(),
    created_at: z.string(),
  })
  .strict()
  .superRefine(validateProfileCompleteness);

export const accountingProfileResultSchema = z.union([
  z.object({ state: z.literal("NOT_INITIALIZED") }).strict(),
  accountingProfileSnapshotSchema,
]);

export const updateAccountingProfileInputSchema = z
  .object({
    expected_version: z.number().int().nonnegative(),
    profile: accountingProfileInputSchema,
    reason: boundedText(2000),
    evidence_ref: optionalEvidence,
    request_id: z.string().uuid(),
  })
  .strict();

export const listAccountingCapabilityAssignmentsInputSchema = z
  .object({ target_user_id: z.string().uuid() })
  .strict();


const accountingAccountInputSchema = z
  .object({
    account_code: boundedText(40),
    name_en: boundedText(160),
    name_ar: boundedText(160),
    account_type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
    category: boundedText(80),
    normal_balance: z.enum(["DEBIT", "CREDIT"]),
    account_kind: z.enum(["POSTING", "NON_POSTING"]),
    parent_account_id: z.string().uuid().nullable(),
    is_active: z.boolean(),
    is_protected: z.boolean(),
    control_classification: z.enum([
      "NONE",
      "ACCOUNTS_RECEIVABLE",
      "ACCOUNTS_PAYABLE",
      "CUSTOMER_ADVANCE",
      "SUPPLIER_ADVANCE",
      "CONTRACT_LIABILITY",
      "CASH_ACCOUNTABILITY",
      "EMPLOYEE_ADVANCE",
    ]),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.control_classification !== "NONE" && !value.is_protected) {
      context.addIssue({
        code: "custom",
        path: ["is_protected"],
        message: "Control accounts must be protected",
      });
    }
  });

export const saveAccountingAccountInputSchema = z
  .object({
    account_id: z.string().uuid().nullable(),
    expected_version: z.number().int().nonnegative(),
    account: accountingAccountInputSchema,
    reason: boundedText(2000),
    evidence_ref: optionalEvidence,
    request_id: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.account_id === null) !== (value.expected_version === 0)) {
      context.addIssue({
        code: "custom",
        path: ["expected_version"],
        message: "Create uses version 0 with no identity; revisions require an identity and positive version",
      });
    }
  });

const accountingPeriodInputSchema = z
  .object({
    start_date: validDate,
    end_date: validDate,
    status: z.literal("OPEN"),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.end_date < value.start_date) {
      context.addIssue({
        code: "custom",
        path: ["end_date"],
        message: "Period end date must not precede its start date",
      });
    }
  });

export const saveAccountingPeriodInputSchema = z
  .object({
    period_id: z.string().uuid().nullable(),
    expected_version: z.number().int().nonnegative(),
    period: accountingPeriodInputSchema,
    reason: boundedText(2000),
    evidence_ref: optionalEvidence,
    request_id: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.period_id === null) !== (value.expected_version === 0)) {
      context.addIssue({
        code: "custom",
        path: ["expected_version"],
        message: "Create uses version 0 with no identity; revisions require an identity and positive version",
      });
    }
  });

export const accountingAccountVersionSchema = z
  .object({
    account_id: z.string().uuid(),
    profile_id: z.string().uuid(),
    version: z.number().int().positive(),
    is_current: z.boolean(),
    previous_version: z.number().int().positive().nullable(),
    account_code: boundedText(40),
    name_en: boundedText(160),
    name_ar: boundedText(160),
    account_type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
    category: boundedText(80),
    normal_balance: z.enum(["DEBIT", "CREDIT"]),
    account_kind: z.enum(["POSTING", "NON_POSTING"]),
    parent_account_id: z.string().uuid().nullable(),
    is_active: z.boolean(),
    is_protected: z.boolean(),
    control_classification: z.enum([
      "NONE",
      "ACCOUNTS_RECEIVABLE",
      "ACCOUNTS_PAYABLE",
      "CUSTOMER_ADVANCE",
      "SUPPLIER_ADVANCE",
      "CONTRACT_LIABILITY",
      "CASH_ACCOUNTABILITY",
      "EMPLOYEE_ADVANCE",
    ]),
    effective_from: z.string(),
    reason: boundedText(2000),
    evidence_ref: nullableEvidence,
    created_by: z.string().uuid(),
    created_at: z.string(),
  })
  .strict();

export const accountingPeriodVersionSchema = z
  .object({
    period_id: z.string().uuid(),
    profile_id: z.string().uuid(),
    version: z.number().int().positive(),
    is_current: z.boolean(),
    previous_version: z.number().int().positive().nullable(),
    start_date: validDate,
    end_date: validDate,
    status: z.literal("OPEN"),
    effective_from: z.string(),
    reason: boundedText(2000),
    evidence_ref: nullableEvidence,
    created_by: z.string().uuid(),
    created_at: z.string(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.end_date < value.start_date) {
      context.addIssue({ code: "custom", path: ["end_date"], message: "Invalid period range" });
    }
  });
