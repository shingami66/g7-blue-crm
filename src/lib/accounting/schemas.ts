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
    status: z.enum(["OPEN", "CLOSED", "LOCKED"]),
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

export const accountingJournalIdSchema = z.string().uuid();

const accountingPostingRuleMappingSchema = z
  .object({
    mapping_key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    account_id: z.string().uuid(),
    account_version: z.number().int().positive(),
    allowed_side: z.enum(["DEBIT", "CREDIT", "EITHER"]),
    service_requirement: z.enum(["REQUIRED", "OPTIONAL", "FORBIDDEN"]),
  })
  .strict();

const accountingPostingRuleInputSchema = z
  .object({
    rule_code: z.string().regex(/^[A-Z][A-Z0-9_]{1,39}$/),
    name_en: boundedText(160),
    name_ar: boundedText(160),
    is_active: z.boolean(),
    mappings: z.array(accountingPostingRuleMappingSchema).min(2).max(200),
  })
  .strict()
  .superRefine((value, context) => {
    const keys = value.mappings.map((mapping) => mapping.mapping_key);
    if (new Set(keys).size !== keys.length) {
      context.addIssue({
        code: "custom",
        path: ["mappings"],
        message: "Mapping keys must be unique within a rule version",
      });
    }
  });

export const saveAccountingPostingRuleInputSchema = z
  .object({
    posting_rule_id: z.string().uuid().nullable(),
    expected_version: z.number().int().nonnegative(),
    rule: accountingPostingRuleInputSchema,
    reason: boundedText(2000),
    evidence_ref: optionalEvidence,
    request_id: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.posting_rule_id === null) !== (value.expected_version === 0)) {
      context.addIssue({
        code: "custom",
        path: ["expected_version"],
        message: "Create uses version 0 with no identity; revisions require an identity and positive version",
      });
    }
  });

export const accountingPostingRuleVersionSchema = z
  .object({
    posting_rule_id: z.string().uuid(),
    profile_id: z.string().uuid(),
    version: z.number().int().positive(),
    is_current: z.boolean(),
    previous_version: z.number().int().positive().nullable(),
    rule_code: z.string().regex(/^[A-Z][A-Z0-9_]{1,39}$/),
    name_en: boundedText(160),
    name_ar: boundedText(160),
    is_active: z.boolean(),
    effective_from: z.string(),
    reason: boundedText(2000),
    evidence_ref: nullableEvidence,
    created_by: z.string().uuid(),
    created_at: z.string(),
    mappings: z.array(accountingPostingRuleMappingSchema),
  })
  .strict();

const accountingJournalLineInputSchema = z
  .object({
    mapping_key: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/),
    side: z.enum(["DEBIT", "CREDIT"]),
    amount_halalah: z.string().regex(/^[1-9][0-9]{0,18}$/),
    service_id: z.string().uuid().nullable(),
    description_en: boundedText(500),
    description_ar: boundedText(500),
  })
  .strict();

const accountingJournalInputSchema = z
  .object({
    accounting_date: validDate,
    period_id: z.string().uuid(),
    period_version: z.number().int().positive(),
    posting_rule_id: z.string().uuid(),
    rule_version: z.number().int().positive(),
    source_record_key: boundedText(200),
    economic_event_key: boundedText(200),
    posting_purpose: boundedText(80),
    description_en: boundedText(500),
    description_ar: boundedText(500),
    lines: z.array(accountingJournalLineInputSchema).min(2).max(200),
  })
  .strict();

export const prepareAccountingJournalInputSchema = z
  .object({
    journal_id: z.string().uuid().nullable(),
    expected_version: z.number().int().nonnegative(),
    journal: accountingJournalInputSchema,
    reason: boundedText(2000),
    evidence_ref: optionalEvidence,
    request_id: z.string().uuid(),
  })
  .strict()
  .superRefine((value, context) => {
    if ((value.journal_id === null) !== (value.expected_version === 0)) {
      context.addIssue({
        code: "custom",
        path: ["expected_version"],
        message: "Create uses version 0 with no identity; revisions require an identity and positive version",
      });
    }
  });

export const postAccountingJournalInputSchema = z
  .object({
    journal_id: z.string().uuid(),
    expected_version: z.number().int().positive(),
    request_id: z.string().uuid(),
  })
  .strict();

export const reverseAccountingJournalInputSchema = z
  .object({
    original_journal_id: z.string().uuid(),
    period_id: z.string().uuid(),
    accounting_date: validDate,
    reason: boundedText(2000),
    evidence_ref: optionalEvidence,
    request_id: z.string().uuid(),
  })
  .strict();

export const accountingJournalMutationResultSchema = z
  .object({
    error_code: z.string().nullable(),
    journal_id: z.string().uuid().nullable(),
    version: z.number().int().positive().nullable(),
    status: z.enum(["DRAFT", "POSTED"]).nullable(),
    idempotent_replay: z.boolean(),
  })
  .strict();

const accountingJournalLineVersionSchema = accountingJournalLineInputSchema
  .extend({
    line_number: z.number().int().positive(),
    account_id: z.string().uuid(),
    account_version: z.number().int().positive(),
    account_code: boundedText(40),
    name_en: boundedText(160),
    name_ar: boundedText(160),
    account_type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
    normal_balance: z.enum(["DEBIT", "CREDIT"]),
    service_number: z.string().nullable(),
    event_name: z.string().nullable(),
    event_type: z.string().nullable(),
    event_start_date: validDate.nullable(),
    event_end_date: validDate.nullable(),
  })
  .strict();

const accountingJournalVersionSchema = z
  .object({
    version: z.number().int().positive(),
    previous_version: z.number().int().positive().nullable(),
    status: z.enum(["DRAFT", "POSTED"]),
    profile_version: z.number().int().positive(),
    period_id: z.string().uuid(),
    period_version: z.number().int().positive(),
    accounting_date: validDate,
    posting_rule_id: z.string().uuid(),
    rule_version: z.number().int().positive(),
    source_domain: z.literal("CONTROLLED_MANUAL"),
    source_record_key: boundedText(200),
    economic_event_key: boundedText(200),
    posting_purpose: boundedText(80),
    description_en: boundedText(500),
    description_ar: boundedText(500),
    currency: z.literal("SAR"),
    reason: boundedText(2000),
    evidence_ref: nullableEvidence,
    prepared_by: z.string().uuid(),
    prepared_at: z.string(),
    posted_by: z.string().uuid().nullable(),
    posted_at: z.string().nullable(),
    lines: z.array(accountingJournalLineVersionSchema),
  })
  .strict();

export const accountingJournalDetailSchema = z
  .object({
    journal_id: z.string().uuid(),
    profile_id: z.string().uuid(),
    correction_group_id: z.string().uuid(),
    reversal_of_journal_id: z.string().uuid().nullable(),
    current_version: z.number().int().positive(),
    versions: z.array(accountingJournalVersionSchema),
  })
  .strict();

export const accountingGeneralLedgerInputSchema = z
  .object({
    from_date: validDate,
    through_date: validDate,
    recorded_at_cutoff: z.string().datetime({ offset: true }).nullable(),
    account_id: z.string().uuid().nullable(),
    service_id: z.string().uuid().nullable(),
    offset: z.number().int().nonnegative().max(50000),
    limit: z.number().int().min(1).max(500),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.through_date < value.from_date) {
      context.addIssue({ code: "custom", path: ["through_date"], message: "Invalid ledger date range" });
    }
  });

export const accountingTrialBalanceInputSchema = z
  .object({
    as_of_date: validDate,
    recorded_at_cutoff: z.string().datetime({ offset: true }).nullable(),
    service_id: z.string().uuid().nullable(),
    offset: z.number().int().nonnegative().max(50000),
    limit: z.number().int().min(1).max(500),
  })
  .strict();

export const accountingGeneralLedgerEntrySchema = z
  .object({
    journal_id: z.string().uuid(),
    journal_version: z.number().int().positive(),
    accounting_date: validDate,
    posted_at: z.string(),
    posted_by: z.string().uuid(),
    reversal_of_journal_id: z.string().uuid().nullable(),
    correction_group_id: z.string().uuid(),
    account_id: z.string().uuid(),
    account_version: z.number().int().positive(),
    account_code: boundedText(40),
    account_name_en: boundedText(160),
    account_name_ar: boundedText(160),
    side: z.enum(["DEBIT", "CREDIT"]),
    amount_halalah: z.string().regex(/^[1-9][0-9]{0,18}$/),
    service_id: z.string().uuid().nullable(),
    service_number: z.string().nullable(),
    event_name: z.string().nullable(),
    event_type: z.string().nullable(),
    event_start_date: validDate.nullable(),
    event_end_date: validDate.nullable(),
    line_number: z.number().int().positive(),
    description_en: boundedText(500),
    description_ar: boundedText(500),
  })
  .strict();

export const accountingGeneralLedgerResultSchema = z
  .object({
    report: z.object({
      entries: z.array(accountingGeneralLedgerEntrySchema),
      from_date: validDate,
      through_date: validDate,
      recorded_at_cutoff: z.string().nullable(),
    }),
    is_complete: z.boolean(),
    generated_at: z.string(),
  })
  .strict();

export const accountingTrialBalanceResultSchema = z
  .object({
    report: z.object({
      as_of_date: validDate,
      recorded_at_cutoff: z.string().nullable(),
      service_id: z.string().uuid().nullable(),
      accounts: z.array(z.object({
        account_id: z.string().uuid(),
        account_code: boundedText(40),
        account_name_en: boundedText(160),
        account_name_ar: boundedText(160),
        account_type: z.enum(["ASSET", "LIABILITY", "EQUITY", "REVENUE", "EXPENSE"]),
        normal_balance: z.enum(["DEBIT", "CREDIT"]),
        debit_activity_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
        credit_activity_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
        debit_balance_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
        credit_balance_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
      }).strict()),
      debit_balance_total_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
      credit_balance_total_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
      debits_equal_credits: z.boolean(),
      account_count: z.number().int().nonnegative(),
    }),
    is_complete: z.boolean(),
    generated_at: z.string(),
  })
  .strict();
