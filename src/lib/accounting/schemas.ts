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
      "ACCRUED_LIABILITY",
      "CUSTOMER_ADVANCE",
      "SUPPLIER_ADVANCE",
      "CONTRACT_LIABILITY",
      "CASH_ACCOUNTABILITY",
      "EMPLOYEE_ADVANCE",
      "EMPLOYEE_REIMBURSEMENT_LIABILITY",
      "CONTRACT_ASSET",
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
      "ACCRUED_LIABILITY",
      "CUSTOMER_ADVANCE",
      "SUPPLIER_ADVANCE",
      "CONTRACT_LIABILITY",
      "CASH_ACCOUNTABILITY",
      "EMPLOYEE_ADVANCE",
      "EMPLOYEE_REIMBURSEMENT_LIABILITY",
      "CONTRACT_ASSET",
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
    source_domain: z.enum(["CONTROLLED_MANUAL", "INCEPTION", "AR_BRIDGE", "AP_BRIDGE", "EXPENSE_BRIDGE", "REVENUE_RECOGNITION"]),
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

const inceptionClassificationSchema = z.enum([
  "RECONSTRUCTED_HISTORY",
  "OPENING_BALANCE",
  "POST_CUTOVER_SOURCE",
  "UNRESOLVED",
]);
const inceptionPartySchema = z.enum([
  "NONE",
  "CUSTOMER",
  "SUPPLIER",
  "EMPLOYEE",
  "FOUNDER",
  "BANK",
  "CASH",
]);
const inceptionReconciliationCategorySchema = z.enum([
  "ACCOUNTS_RECEIVABLE",
  "ACCOUNTS_PAYABLE",
  "EMPLOYEE_ACCOUNTABILITY",
  "FOUNDER_SOURCE",
  "BANK_CASH",
  "ASSET",
  "LIABILITY",
  "EXPENSE",
  "OTHER",
]);
export const accountingInceptionEvidenceSchema = z.object({
  evidence_id: z.string().uuid(),
  version: z.number().int().positive(),
  evidence_type: z.enum([
    "BANK_STATEMENT",
    "BANK_CONFIRMATION",
    "RECEIVABLE_DETAIL",
    "PAYABLE_DETAIL",
    "EMPLOYEE_ACCOUNTABILITY",
    "FOUNDER_AGREEMENT",
    "FIXED_ASSET_SUPPORT",
    "PREPAYMENT_SUPPORT",
    "EXPENSE_SUPPORT",
    "OTHER",
  ]),
  evidence_ref: boundedText(2000),
  sha256: z.string().regex(/^[0-9a-f]{64}$/),
}).strict();
export const accountingInceptionEvidenceReferenceSchema = z.object({
  evidence_id: z.string().uuid(),
  version: z.number().int().positive(),
}).strict();
export const accountingInceptionJournalLineSchema = z.object({
  account_id: z.string().uuid(),
  account_version: z.number().int().positive(),
  side: z.enum(["DEBIT", "CREDIT"]),
  amount_halalah: z.string().regex(/^[1-9][0-9]{0,18}$/),
  description_en: boundedText(500),
  description_ar: boundedText(500),
}).strict();
export const accountingInceptionJournalPlanSchema = z.object({
  accounting_date: validDate,
  period_id: z.string().uuid(),
  period_version: z.number().int().positive(),
  description_en: boundedText(500),
  description_ar: boundedText(500),
  lines: z.array(accountingInceptionJournalLineSchema).min(2).max(200),
}).strict();
export const accountingInceptionItemSchema = z.object({
  item_id: z.string().uuid(),
  source_domain: z.string().regex(/^[A-Z][A-Z0-9_]{0,39}$/)
    .refine((value) => value !== "CONTROLLED_MANUAL" && value !== "INCEPTION"),
  source_record_key: boundedText(200),
  economic_event_key: boundedText(200),
  classification: inceptionClassificationSchema,
  resolution_state: z.enum(["RESOLVED", "UNRESOLVED"]),
  is_material: z.boolean(),
  reconciliation_category: inceptionReconciliationCategorySchema,
  reconciliation_reference: boundedText(2000).nullable(),
  party_type: inceptionPartySchema,
  party_reference: boundedText(200).nullable(),
  evidence_refs: z.array(accountingInceptionEvidenceReferenceSchema).max(500),
  journal: accountingInceptionJournalPlanSchema.nullable(),
}).strict();
export const accountingInceptionPayloadSchema = z.object({
  accounting_start_date: validDate,
  cutover_boundary_date: validDate,
  evidence_inventory: z.array(accountingInceptionEvidenceSchema).max(500),
  items: z.array(accountingInceptionItemSchema).min(1).max(500),
  reconciliation_references: z.array(z.object({
    category: inceptionReconciliationCategorySchema,
    reference: boundedText(2000),
  }).strict()).max(500),
}).strict().superRefine((value, context) => {
  if (value.cutover_boundary_date < value.accounting_start_date) {
    context.addIssue({ code: "custom", path: ["cutover_boundary_date"], message: "Cutover precedes accounting start" });
  }
  const itemIds = new Set<string>();
  const sourceKeys = new Set<string>();
  for (const [index, item] of value.items.entries()) {
    const sourceKey = JSON.stringify([item.source_domain, item.source_record_key, item.economic_event_key]);
    if (itemIds.has(item.item_id) || sourceKeys.has(sourceKey)) {
      context.addIssue({ code: "custom", path: ["items", index], message: "Duplicate inception item or economic coverage" });
    }
    itemIds.add(item.item_id);
    sourceKeys.add(sourceKey);
    const shouldHaveJournal = item.classification === "RECONSTRUCTED_HISTORY" || item.classification === "OPENING_BALANCE";
    if (shouldHaveJournal !== (item.journal !== null)) {
      context.addIssue({ code: "custom", path: ["items", index, "journal"], message: "Journal plan does not match coverage classification" });
    }
    if ((item.classification === "UNRESOLVED") !== (item.resolution_state === "UNRESOLVED")) {
      context.addIssue({ code: "custom", path: ["items", index, "resolution_state"], message: "Resolution does not match classification" });
    }
  }
});
export const saveAccountingInceptionPackageInputSchema = z.object({
  package_id: z.string().uuid().nullable(),
  expected_version: z.number().int().nonnegative(),
  package: accountingInceptionPayloadSchema,
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if ((value.package_id === null && value.expected_version !== 0)
    || (value.package_id !== null && value.expected_version === 0)) {
    context.addIssue({ code: "custom", path: ["expected_version"], message: "Expected version does not match package identity" });
  }
});
export const reviewAccountingInceptionPackageInputSchema = z.object({
  package_id: z.string().uuid(),
  package_version: z.number().int().positive(),
  approve: z.boolean(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();
export const prepareAccountingInceptionJournalInputSchema = z.object({
  package_id: z.string().uuid(),
  package_version: z.number().int().positive(),
  item_id: z.string().uuid(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();
export const postAccountingInceptionJournalInputSchema = z.object({
  journal_id: z.string().uuid(),
  expected_version: z.number().int().positive(),
  request_id: z.string().uuid(),
}).strict();
export const acceptAccountingInceptionPackageInputSchema = z.object({
  package_id: z.string().uuid(),
  package_version: z.number().int().positive(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

const inceptionTrialBalanceSchema = z.object({
  as_of_date: validDate,
  recorded_at_cutoff: z.string(),
  service_id: z.null(),
  accounts: accountingTrialBalanceResultSchema.shape.report.shape.accounts,
  debit_balance_total_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
  credit_balance_total_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
  debits_equal_credits: z.literal(true),
  account_count: z.number().int().nonnegative(),
}).strict();
export const accountingInceptionReviewResultSchema = z.object({
  error_code: z.string().nullable(),
  review_id: z.string().uuid().nullable(),
  decision: z.enum(["APPROVE", "REJECT"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingInceptionJournalMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  journal_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["DRAFT", "POSTED"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingInceptionAcceptanceResultSchema = z.object({
  error_code: z.string().nullable(),
  acceptance_id: z.string().uuid().nullable(),
  trial_balance: inceptionTrialBalanceSchema.nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingInceptionPackageSummarySchema = z.object({
  package_id: z.string().uuid(),
  current_version: z.number().int().positive(),
  accounting_start_date: validDate,
  cutover_boundary_date: validDate,
  created_at: z.string(),
  accepted: z.boolean(),
}).strict();
const accountingInceptionPackageVersionSchema = z.object({
  version: z.number().int().positive(),
  previous_version: z.number().int().positive().nullable(),
  accounting_start_date: validDate,
  cutover_boundary_date: validDate,
  payload: accountingInceptionPayloadSchema,
  payload_fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  created_by: z.string().uuid(),
  created_at: z.string(),
}).strict();
const accountingInceptionCoverageHistorySchema = z.object({
  coverage_id: z.string().uuid(),
  source_domain: z.string(),
  source_record_key: boundedText(200),
  economic_event_key: boundedText(200),
  version: z.number().int().positive(),
  previous_version: z.number().int().positive().nullable(),
  package_version: z.number().int().positive(),
  item_id: z.string().uuid(),
  classification: inceptionClassificationSchema,
  resolution_state: z.enum(["RESOLVED", "UNRESOLVED"]),
  is_material: z.boolean(),
  reconciliation_category: inceptionReconciliationCategorySchema,
  party_type: inceptionPartySchema,
  party_reference: boundedText(200).nullable(),
  reconciliation_reference: boundedText(2000).nullable(),
  evidence_count: z.number().int().nonnegative(),
  payload_fingerprint: z.string().regex(/^[0-9a-f]{64}$/),
  created_by: z.string().uuid(),
  created_at: z.string(),
}).strict();
const accountingInceptionReviewHistorySchema = z.object({
  review_id: z.string().uuid(),
  package_version: z.number().int().positive(),
  decision: z.enum(["APPROVE", "REJECT"]),
  reviewer_user_id: z.string().uuid(),
  reason: boundedText(2000),
  reviewed_at: z.string(),
}).strict();
export const accountingInceptionPackageDetailSchema = z.object({
  package_id: z.string().uuid(),
  profile_id: z.string().uuid(),
  current_version: z.number().int().positive(),
  created_at: z.string(),
  version: accountingInceptionPackageVersionSchema,
  versions: z.array(accountingInceptionPackageVersionSchema),
  coverage_history: z.array(accountingInceptionCoverageHistorySchema),
  review_history: z.array(accountingInceptionReviewHistorySchema),
  coverage: z.array(z.object({
    coverage_id: z.string().uuid(),
    source_domain: z.string(),
    source_record_key: boundedText(200),
    economic_event_key: boundedText(200),
    version: z.number().int().positive(),
    item_id: z.string().uuid(),
    classification: inceptionClassificationSchema,
    resolution_state: z.enum(["RESOLVED", "UNRESOLVED"]),
    is_material: z.boolean(),
    reconciliation_category: inceptionReconciliationCategorySchema,
    party_type: inceptionPartySchema,
    party_reference: boundedText(200).nullable(),
    reconciliation_reference: boundedText(2000).nullable(),
    evidence_count: z.number().int().nonnegative(),
  }).strict()),
  review: accountingInceptionReviewHistorySchema.omit({ package_version: true }).nullable(),
  acceptance: z.object({
    acceptance_id: z.string().uuid(),
    accepted_by: z.string().uuid(),
    accepted_at: z.string(),
    as_of_date: validDate,
    recorded_at_cutoff: z.string(),
    trial_balance: inceptionTrialBalanceSchema,
  }).strict().nullable(),
}).strict();

const accountingArBridgeSourceTypeSchema = z.enum([
  "INVOICE", "PAYMENT", "RECEIPT", "ALLOCATION", "RECEIPT_REVERSAL",
  "ALLOCATION_REVERSAL", "CREDIT_ADJUSTMENT", "CREDIT_ADJUSTMENT_REVERSAL",
  "CREDIT_APPLICATION", "CREDIT_APPLICATION_REVERSAL", "REFUND", "REFUND_REVERSAL",
]);
const accountingArBridgeClassificationSchema = z.enum([
  "UNCONDITIONAL_CONTRACT_LIABILITY", "UNCONDITIONAL_CONTRACT_ASSET",
  "CUSTOMER_ADVANCE", "SETTLEMENT", "REVERSAL", "CUSTOMER_LIABILITY",
  "CUSTOMER_LIABILITY_REFUND", "HELD_UNSUPPORTED_ENTITLEMENT", "HELD_UNSUPPORTED_CASH",
  "HELD_REVENUE_CORRECTION", "HELD_UNSUPPORTED_TREATMENT",
]);
const heldArBridgeClassificationSchema = z.enum([
  "HELD_UNSUPPORTED_ENTITLEMENT", "HELD_UNSUPPORTED_CASH",
  "HELD_REVENUE_CORRECTION", "HELD_UNSUPPORTED_TREATMENT",
]);
export const saveAccountingArBridgeEventInputSchema = z.object({
  source_type: accountingArBridgeSourceTypeSchema,
  source_record_id: z.string().uuid(),
  expected_version: z.number().int().nonnegative(),
  classification: accountingArBridgeClassificationSchema,
  accounting_date: validDate.nullable(),
  evidence_ref: nullableEvidence,
  evidence_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if ((value.evidence_ref === null) !== (value.evidence_sha256 === null)) {
    context.addIssue({ code: "custom", path: ["evidence_sha256"], message: "Evidence reference and SHA-256 must be supplied together" });
  }
  if (!heldArBridgeClassificationSchema.safeParse(value.classification).success && value.accounting_date === null) {
    context.addIssue({ code: "custom", path: ["accounting_date"], message: "Ready classifications require an accounting date" });
  }
});
export const prepareAccountingArBridgeEventInputSchema = z.object({
  event_id: z.string().uuid(),
  event_version: z.number().int().positive(),
  period_id: z.string().uuid(),
  period_version: z.number().int().positive(),
  posting_rule_id: z.string().uuid(),
  rule_version: z.number().int().positive(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();
export const postAccountingArBridgeJournalInputSchema = z.object({
  journal_id: z.string().uuid(),
  expected_version: z.number().int().positive(),
  request_id: z.string().uuid(),
}).strict();
export const accountingArBridgeReconciliationInputSchema = z.object({
  as_of_date: validDate,
  recorded_at_cutoff: z.string().datetime({ offset: true }),
  limit: z.number().int().min(1).max(500).default(200),
}).strict();
export const accountingArBridgeEventMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  event_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["READY", "HELD"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingArBridgeJournalMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  journal_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["DRAFT", "POSTED"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
const accountingArBridgeReconciliationEventSchema = z.object({
  source_type: accountingArBridgeSourceTypeSchema,
  source_record_id: z.string().uuid(),
  source_record_key: boundedText(200),
  economic_event_key: boundedText(200),
  reconciliation_status: z.enum(["POSTED", "PREPARED", "HELD", "INCEPTION_COVERED", "MISSING_EFFECT", "DUPLICATE_CONFLICT"]),
  event_id: z.string().uuid().nullable(),
  event_version: z.number().int().positive().nullable(),
  classification: accountingArBridgeClassificationSchema.nullable(),
  customer_id: z.string().uuid(),
  service_id: z.string().uuid().nullable(),
  invoice_id: z.string().uuid().nullable(),
  amount_halalah: z.string().regex(/^[1-9][0-9]*$/),
  source_business_date: validDate.nullable(),
  source_recorded_at: z.string(),
  accounting_date: validDate.nullable(),
  posted_accounting_date: validDate.nullable(),
  posted_at: z.string().nullable(),
  journal_id: z.string().uuid().nullable(),
  held_code: z.string().nullable(),
  expected_ar_delta_halalah: z.string().regex(/^(0|-?[1-9][0-9]*)$/),
  posted_ar_delta_halalah: z.string().regex(/^(0|-?[1-9][0-9]*)$/),
  source_snapshot_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
}).strict();
export const accountingArBridgeReconciliationSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("NOT_INITIALIZED") }).strict(),
  z.object({
    state: z.literal("READY"),
    as_of_date: validDate,
    recorded_at_cutoff: z.string(),
    source_event_count: z.number().int().nonnegative(),
    posted_effect_count: z.number().int().nonnegative(),
    held_unresolved_count: z.number().int().nonnegative(),
    inception_covered_count: z.number().int().nonnegative(),
    missing_effect_count: z.number().int().nonnegative(),
    duplicate_conflict_count: z.number().int().nonnegative(),
    party_difference_count: z.number().int().nonnegative(),
    timing_difference_count: z.number().int().nonnegative(),
    truncated: z.boolean(),
    events: z.array(accountingArBridgeReconciliationEventSchema),
    party_balances: z.array(z.object({
      customer_id: z.string().uuid(),
      service_id: z.string().uuid().nullable(),
      invoice_id: z.string().uuid().nullable(),
      source_ar_delta_halalah: z.string().regex(/^(0|-?[1-9][0-9]*)$/),
      posted_ar_delta_halalah: z.string().regex(/^(0|-?[1-9][0-9]*)$/),
      difference_halalah: z.string().regex(/^(0|-?[1-9][0-9]*)$/),
    }).strict()),
  }).strict(),
]);

const accountingRevenueEvidenceBasisSchema = z.enum(["CUSTOMER_ACCEPTANCE", "TRANSFER_OF_CONTROL", "MEASURED_OUTPUT"]);
const accountingRevenueUnitInputSchema = z.object({
  unit_key: boundedText(120),
  promised_output: boundedText(2000),
  satisfaction_method: z.enum(["POINT_IN_TIME", "OVER_TIME"]),
  required_evidence_basis: accountingRevenueEvidenceBasisSchema,
  allocations: z.array(z.object({
    source_item_id: z.string().uuid(),
    amount_halalah: z.string().regex(/^[1-9][0-9]*$/),
  }).strict()).min(1).max(500),
}).strict();

export const saveAccountingRevenueArrangementInputSchema = z.object({
  service_id: z.string().uuid(),
  abs_id: z.string().uuid(),
  expected_version: z.number().int().nonnegative(),
  units: z.array(accountingRevenueUnitInputSchema).max(100),
  principal_agent_basis: z.enum(["PRINCIPAL", "AGENT"]),
  policy_version: boundedText(100),
  modification_evidence_ref: nullableEvidence,
  modification_evidence_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if ((value.modification_evidence_ref === null) !== (value.modification_evidence_sha256 === null)) {
    context.addIssue({ code: "custom", path: ["modification_evidence_sha256"], message: "Modification evidence reference and hash must be paired" });
  }
});

export const reviewAccountingRevenueArrangementInputSchema = z.object({
  arrangement_id: z.string().uuid(),
  arrangement_version: z.number().int().positive(),
  approve: z.boolean(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

export const saveAccountingRevenuePerformanceEvidenceInputSchema = z.object({
  unit_id: z.string().uuid(),
  evidence_key: boundedText(160),
  expected_version: z.number().int().nonnegative(),
  evidence_basis: accountingRevenueEvidenceBasisSchema,
  performance_from: validDate,
  performance_through: validDate,
  evidence_ref: boundedText(2000),
  evidence_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  recognized_to_date_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/).nullable(),
  correction_of_recognition_event_id: z.string().uuid().nullable(),
  correction_amount_halalah: z.string().regex(/^[1-9][0-9]*$/).nullable(),
  rationale: boundedText(2000),
  request_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.performance_from > value.performance_through) {
    context.addIssue({ code: "custom", path: ["performance_through"], message: "Performance interval must be ordered" });
  }
  const isCorrection = value.correction_of_recognition_event_id !== null;
  if (isCorrection !== (value.correction_amount_halalah !== null)
    || isCorrection !== (value.recognized_to_date_halalah === null)) {
    context.addIssue({ code: "custom", path: ["correction_of_recognition_event_id"], message: "Correction lineage and amount must replace cumulative recognition" });
  }
});

export const reviewAccountingRevenuePerformanceEvidenceInputSchema = z.object({
  evidence_id: z.string().uuid(),
  evidence_version: z.number().int().positive(),
  approve: z.boolean(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

export const prepareAccountingRevenueRecognitionInputSchema = z.object({
  evidence_id: z.string().uuid(),
  evidence_version: z.number().int().positive(),
  period_id: z.string().uuid(),
  period_version: z.number().int().positive(),
  posting_rule_id: z.string().uuid(),
  rule_version: z.number().int().positive(),
  accounting_date: validDate,
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

export const postAccountingRevenueRecognitionJournalInputSchema = postAccountingJournalInputSchema;
export const accountingRevenueReconciliationInputSchema = z.object({
  as_of_date: validDate,
  recorded_at_cutoff: z.string().datetime({ offset: true }),
  limit: z.number().int().min(1).max(500),
}).strict();

const accountingBankSha256Schema = z.string().regex(/^[0-9a-f]{64}$/);
const accountingBankAmountSchema = z.union([
  z.string().regex(/^-?[0-9]+$/),
  z.number().int().refine((value) => Number.isSafeInteger(value), "Halalah amount exceeds the safe numeric range"),
]).transform(String);
const accountingBankAllocationSchema = z.object({
  statement_line_id: z.string().uuid(),
  statement_line_version: z.number().int().positive(),
  ledger_journal_id: z.string().uuid(),
  ledger_journal_version: z.number().int().positive(),
  ledger_line_number: z.number().int().min(1).max(200),
  statement_allocated_halalah: z.number().int().refine((value) => value !== 0),
  ledger_allocated_halalah: z.number().int().refine((value) => value !== 0),
  rationale: boundedText(2000).optional(),
}).strict();

export const saveAccountingBankBindingInputSchema = z.object({
  binding_id: z.string().uuid().nullable().optional(),
  expected_version: z.number().int().nonnegative(),
  account_id: z.string().uuid(),
  account_version: z.number().int().positive(),
  bank_identity_ref: boundedText(2000),
  bank_identity_sha256: accountingBankSha256Schema,
  effective_from: validDate,
  effective_through: validDate.nullable(),
  masked_display_identity: boundedText(200),
  evidence_ref: boundedText(2000),
  evidence_sha256: accountingBankSha256Schema,
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

export const reviewAccountingBankBindingInputSchema = z.object({
  binding_id: z.string().uuid(),
  binding_version: z.number().int().positive(),
  approve: z.boolean(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

export const saveAccountingBankStatementBatchInputSchema = z.object({
  batch_id: z.string().uuid().nullable().optional(),
  expected_version: z.number().int().nonnegative(),
  binding_id: z.string().uuid(),
  binding_version: z.number().int().positive(),
  source_document_ref: boundedText(2000),
  evidence_sha256: accountingBankSha256Schema,
  evidence_identity: boundedText(300),
  coverage_start: validDate,
  coverage_end: validDate,
  opening_balance_halalah: z.number().int(),
  closing_balance_halalah: z.number().int(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.coverage_end < value.coverage_start) {
    context.addIssue({ code: "custom", path: ["coverage_end"], message: "Coverage interval must be ordered" });
  }
});

export const saveAccountingBankStatementLineInputSchema = z.object({
  line_id: z.string().uuid().nullable().optional(),
  expected_version: z.number().int().nonnegative(),
  batch_id: z.string().uuid(),
  batch_version: z.number().int().positive(),
  stable_line_identity: boundedText(300),
  transaction_date: validDate,
  value_date: validDate.nullable(),
  signed_amount_halalah: z.number().int().refine((value) => value !== 0),
  reference: z.string().trim().max(500).nullable(),
  description: z.string().trim().max(2000).nullable(),
  source_row_identity: boundedText(300),
  duplicate_fingerprint: accountingBankSha256Schema,
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if (value.value_date !== null && value.value_date < value.transaction_date) {
    context.addIssue({ code: "custom", path: ["value_date"], message: "Value date must not precede transaction date" });
  }
});

export const prepareAccountingBankReconciliationInputSchema = z.object({
  group_id: z.string().uuid().nullable().optional(),
  expected_version: z.number().int().nonnegative(),
  binding_id: z.string().uuid(),
  binding_version: z.number().int().positive(),
  as_of_date: validDate,
  recorded_at_cutoff: z.string().datetime({ offset: true }),
  allocations: z.array(accountingBankAllocationSchema).min(1).max(500),
  rationale: boundedText(2000),
  evidence_ref: boundedText(2000).nullable(),
  request_id: z.string().uuid(),
}).strict();

export const reviewAccountingBankReconciliationInputSchema = z.object({
  group_id: z.string().uuid(),
  group_version: z.number().int().positive(),
  approve: z.boolean(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

export const unmatchAccountingBankReconciliationInputSchema = z.object({
  group_id: z.string().uuid(),
  group_version: z.number().int().positive(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

export const accountingBankReconciliationInputSchema = z.object({
  binding_id: z.string().uuid(),
  as_of_date: validDate,
  recorded_at_cutoff: z.string().datetime({ offset: true }),
  limit: z.number().int().min(1).max(500),
}).strict();

const accountingBankReadRowMoneyKeys = [
  "signed_amount_halalah", "amount_halalah", "signed_amount",
  "statement_allocated_halalah", "ledger_allocated_halalah",
  "opening_balance_halalah", "closing_balance_halalah",
] as const;
const accountingBankReadRowSchema = z.record(z.string(), z.unknown()).superRefine((row, context) => {
  for (const key of accountingBankReadRowMoneyKeys) {
    const value = row[key];
    if (value === undefined || value === null) continue;
    if (typeof value === "number" && Number.isSafeInteger(value)) continue;
    if (typeof value === "string" && /^-?[0-9]+$/.test(value)) continue;
    context.addIssue({ code: "custom", path: [key], message: "Halalah row amount must be an integer string or safe integer" });
  }
}).transform((row) => Object.fromEntries(
  Object.entries(row).map(([key, value]) => [
    key,
    typeof value === "number" && accountingBankReadRowMoneyKeys.includes(key as (typeof accountingBankReadRowMoneyKeys)[number])
      ? String(value)
      : value,
  ]),
));
export const accountingBankBindingMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  binding_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["PREPARED", "APPROVED", "REJECTED", "RETIRED"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingBankBatchMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  batch_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["RECORDED", "REJECTED"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingBankLineMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  line_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.literal("RECORDED").nullable(),
  duplicate_candidate: z.boolean(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingBankReconciliationMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  group_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.literal("PREPARED").nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingBankReviewResultSchema = z.object({
  error_code: z.string().nullable(),
  group_id: z.string().uuid().nullable(),
  group_version: z.number().int().positive().nullable(),
  decision: z.enum(["APPROVED", "REJECTED", "UNMATCHED", "IMPACT_REVIEW_REQUIRED"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingBankReconciliationSchema = z.union([
  z.object({
    state: z.literal("NOT_INITIALIZED"),
    binding_id: z.string().uuid(),
    bank_reconciled: z.literal(false),
  }).passthrough(),
  z.object({
    state: z.enum(["READY", "TRUNCATED"]),
    binding_id: z.string().uuid(),
    binding_version: z.number().int().positive().optional(),
    account_id: z.string().uuid().optional(),
    account_version: z.number().int().positive().optional(),
    currency: z.literal("SAR").optional(),
    as_of_date: validDate.optional(),
    recorded_at_cutoff: z.string().datetime({ offset: true }).optional(),
    statement_opening_balance_halalah: accountingBankAmountSchema.optional(),
    statement_closing_balance_halalah: accountingBankAmountSchema.optional(),
    ledger_opening_balance_halalah: accountingBankAmountSchema.optional(),
    ledger_closing_balance_halalah: accountingBankAmountSchema.optional(),
    statement_inflows_halalah: accountingBankAmountSchema.optional(),
    statement_outflows_halalah: accountingBankAmountSchema.optional(),
    ledger_inflows_halalah: accountingBankAmountSchema.optional(),
    ledger_outflows_halalah: accountingBankAmountSchema.optional(),
    matched_amount_halalah: accountingBankAmountSchema.optional(),
    partially_matched_amount_halalah: accountingBankAmountSchema.optional(),
    unmatched_statement_amount_halalah: accountingBankAmountSchema.optional(),
    unmatched_ledger_amount_halalah: accountingBankAmountSchema.optional(),
    duplicate_statement_candidates: z.number().int().nonnegative().optional(),
    timing_difference_halalah: accountingBankAmountSchema.optional(),
    impact_review_required_count: z.number().int().nonnegative().optional(),
    unexplained_difference_halalah: accountingBankAmountSchema.optional(),
    preparation_review_status: z.string().optional(),
    evidence_cutoff: z.string().datetime({ offset: true }).optional(),
    adjustment_required_statement_items: z.array(accountingBankReadRowSchema),
    statement_lines: z.array(accountingBankReadRowSchema),
    ledger_cash_lines: z.array(accountingBankReadRowSchema),
  }).passthrough(),
]);

export const accountingRevenueArrangementMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  arrangement_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["PREPARED", "HELD"]).nullable(),
  held_code: z.string().nullable(),
  consideration_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingRevenueReviewResultSchema = z.object({
  error_code: z.string().nullable(),
  review_id: z.string().uuid().nullable(),
  decision: z.enum(["APPROVED", "HELD"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingRevenueEvidenceMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  evidence_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["SUBMITTED", "HELD"]).nullable(),
  held_code: z.string().nullable(),
  idempotent_replay: z.boolean(),
}).strict();
export const accountingRevenueJournalMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  journal_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["DRAFT", "POSTED"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();

const accountingRevenueAmountSchema = z.string().regex(/^(0|-?[1-9][0-9]*)$/);
const accountingRevenueUnitSnapshotSchema = accountingRevenueUnitInputSchema;
const accountingRevenueArrangementReconciliationSchema = z.object({
  arrangement_id: z.string().uuid(),
  service_id: z.string().uuid(),
  customer_id: z.string().uuid(),
  approved_billing_scope_id: z.string().uuid(),
  version: z.number().int().positive(),
  status: z.enum(["PREPARED", "HELD"]),
  held_code: z.string().nullable(),
  consideration_halalah: accountingRevenueAmountSchema,
  allocated_halalah: accountingRevenueAmountSchema,
  unallocated_halalah: accountingRevenueAmountSchema,
  recognized_to_date_halalah: accountingRevenueAmountSchema,
  remaining_unrecognized_halalah: accountingRevenueAmountSchema,
  supersedes_arrangement_id: z.string().uuid().nullable(),
  stale_authority: z.boolean(),
  service_customer_difference: z.boolean(),
  source_snapshot_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  source_snapshot: z.record(z.string(), z.unknown()),
  units: z.array(accountingRevenueUnitSnapshotSchema),
  arrangement_review: z.enum(["APPROVED", "HELD"]).nullable(),
  unit_count: z.number().int().nonnegative(),
}).strict();
const accountingRevenueReconciliationBodySchema = z.object({
  state: z.enum(["READY", "TRUNCATED"]),
  as_of_date: validDate,
  recorded_at_cutoff: z.string(),
  bank_reconciled: z.literal(false),
  authoritative_consideration_halalah: accountingRevenueAmountSchema,
  performance_unit_allocations_halalah: accountingRevenueAmountSchema,
  unallocated_consideration_halalah: accountingRevenueAmountSchema,
  recognized_to_date_halalah: accountingRevenueAmountSchema,
  remaining_unrecognized_consideration_halalah: accountingRevenueAmountSchema,
  revenue_posted_halalah: accountingRevenueAmountSchema,
  contract_asset_balance_halalah: accountingRevenueAmountSchema,
  contract_liability_balance_halalah: accountingRevenueAmountSchema,
  contract_balance_difference_count: z.number().int().nonnegative(),
  arrangement_count: z.number().int().nonnegative(),
  held_evidence_count: z.number().int().nonnegative(),
  contract_balances: z.array(z.object({
    service_id: z.string().uuid(),
    control: z.enum(["CONTRACT_ASSET", "CONTRACT_LIABILITY"]),
    subledger_halalah: accountingRevenueAmountSchema,
    ledger_halalah: accountingRevenueAmountSchema,
    difference_halalah: accountingRevenueAmountSchema,
  }).strict()),
  recognition_event_count: z.number().int().nonnegative(),
  recognition_events: z.array(z.object({
    recognition_event_id: z.string().uuid(),
    arrangement_id: z.string().uuid(),
    arrangement_version: z.number().int().positive(),
    unit_id: z.string().uuid(),
    evidence_id: z.string().uuid(),
    evidence_version: z.number().int().positive(),
    service_id: z.string().uuid(),
    customer_id: z.string().uuid(),
    accounting_date: validDate,
    performance_from: validDate,
    performance_through: validDate,
    signed_delta_halalah: z.string().regex(/^-?(?:0|[1-9][0-9]*)$/),
    correction_of_recognition_event_id: z.string().uuid().nullable(),
    journal_id: z.string().uuid().nullable(),
    journal_status: z.string(),
    posted_at: z.string().nullable(),
    source_snapshot_sha256: z.string().regex(/^[0-9a-f]{64}$/),
  }).strict()),
  held_evidence: z.array(z.object({
    evidence_id: z.string().uuid(),
    unit_id: z.string().uuid(),
    arrangement_id: z.string().uuid(),
    evidence_version: z.number().int().positive(),
    status: z.enum(["SUBMITTED", "HELD"]),
    held_code: z.string().nullable(),
    evidence_basis: accountingRevenueEvidenceBasisSchema,
    performance_from: validDate,
    performance_through: validDate,
    evidence_ref: z.string(),
    created_at: z.string(),
    review_decision: z.enum(["APPROVED", "HELD"]).nullable(),
  }).strict()),
  superseded_or_stale_authority_count: z.number().int().nonnegative(),
  service_customer_difference_count: z.number().int().nonnegative(),
  credits_refunds_requiring_revenue_review_count: z.number().int().nonnegative(),
  inception_covered_count: z.number().int().nonnegative(),
  fi012_timing_difference_count: z.number().int().nonnegative(),
  truncated: z.boolean(),
  arrangements: z.array(accountingRevenueArrangementReconciliationSchema),
}).strict();
export const accountingRevenueReconciliationSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("NOT_INITIALIZED"), bank_reconciled: z.literal(false) }).strict(),
  accountingRevenueReconciliationBodySchema,
]);

const accountingApBridgeSourceTypeSchema = z.enum([
  "SERVICE_RECEIPT", "SERVICE_RECEIPT_CORRECTION", "SUPPLIER_BILL", "SUPPLIER_PAYMENT",
  "SUPPLIER_PAYMENT_REVERSAL", "SUPPLIER_ADVANCE_PAYMENT", "SUPPLIER_ADVANCE_PAYMENT_REVERSAL",
  "SUPPLIER_ADVANCE_ALLOCATION", "SUPPLIER_ADVANCE_ALLOCATION_REVERSAL", "SUPPLIER_ADVANCE_REFUND",
]);
const accountingApBridgeClassificationSchema = z.enum([
  "RECEIPT_ACCRUAL", "RECEIPT_CORRECTION_DECREASE", "RECEIPT_CORRECTION_INCREASE", "SUPPLIER_BILL",
  "SUPPLIER_PAYMENT", "SUPPLIER_PAYMENT_REVERSAL", "SUPPLIER_ADVANCE_PAYMENT",
  "SUPPLIER_ADVANCE_PAYMENT_REVERSAL", "SUPPLIER_ADVANCE_ALLOCATION",
  "SUPPLIER_ADVANCE_ALLOCATION_REVERSAL", "SUPPLIER_ADVANCE_REFUND", "HELD_UNSUPPORTED_TREATMENT",
]);
const accountingApBridgeDirectClassificationSchema = z.enum(["DIRECT_EXPENSE", "CAPITAL_ASSET", "PREPAID_EXPENSE"]);
const accountingApCashSourceTypes = new Set([
  "SUPPLIER_PAYMENT", "SUPPLIER_PAYMENT_REVERSAL", "SUPPLIER_ADVANCE_PAYMENT",
  "SUPPLIER_ADVANCE_PAYMENT_REVERSAL", "SUPPLIER_ADVANCE_REFUND",
]);
export const saveAccountingApBridgeEventInputSchema = z.object({
  source_type: accountingApBridgeSourceTypeSchema,
  source_record_id: z.string().uuid(),
  expected_version: z.number().int().nonnegative(),
  classification: accountingApBridgeClassificationSchema,
  amount_halalah: z.string().regex(/^[1-9][0-9]{0,18}$/).nullable(),
  matched_receipt_halalah: z.string().regex(/^(0|[1-9][0-9]{0,18})$/),
  direct_classification: accountingApBridgeDirectClassificationSchema.nullable(),
  accounting_date: validDate,
  evidence_ref: nullableEvidence,
  evidence_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  cash_binding_evidence_ref: nullableEvidence,
  cash_binding_evidence_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  cash_account_id: z.string().uuid().nullable(),
  cash_account_version: z.number().int().positive().nullable(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  if ((value.evidence_ref === null) !== (value.evidence_sha256 === null)) {
    context.addIssue({ code: "custom", path: ["evidence_sha256"], message: "Evidence reference and SHA-256 must be supplied together" });
  }
  if ((value.cash_binding_evidence_ref === null) !== (value.cash_binding_evidence_sha256 === null)) {
    context.addIssue({ code: "custom", path: ["cash_binding_evidence_sha256"], message: "Cash binding evidence and SHA-256 must be supplied together" });
  }
  if ((value.cash_account_id === null) !== (value.cash_account_version === null)) {
    context.addIssue({ code: "custom", path: ["cash_account_version"], message: "Cash account identity and version must be supplied together" });
  }
  if (!["SERVICE_RECEIPT", "SERVICE_RECEIPT_CORRECTION"].includes(value.source_type)
    && value.amount_halalah !== null) {
    context.addIssue({ code: "custom", path: ["amount_halalah"], message: "Only receipt valuations accept an externally evidenced amount" });
  }
  if (accountingApCashSourceTypes.has(value.source_type)
    && (value.cash_binding_evidence_ref === null || value.cash_account_id === null)) {
    context.addIssue({ code: "custom", path: ["cash_binding_evidence_ref"], message: "Cash movement requires explicit account binding evidence" });
  }
  if (!accountingApCashSourceTypes.has(value.source_type)
    && (value.cash_binding_evidence_ref !== null || value.cash_account_id !== null)) {
    context.addIssue({ code: "custom", path: ["cash_account_id"], message: "Non-cash events cannot bind a cash account" });
  }
  if (value.source_type !== "SUPPLIER_BILL" && value.matched_receipt_halalah !== "0") {
    context.addIssue({ code: "custom", path: ["matched_receipt_halalah"], message: "Only supplier bills can match receipt accruals" });
  }
});
export const prepareAccountingApBridgeEventInputSchema = prepareAccountingArBridgeEventInputSchema;
export const postAccountingApBridgeJournalInputSchema = postAccountingArBridgeJournalInputSchema;
export const accountingApBridgeReconciliationInputSchema = accountingArBridgeReconciliationInputSchema;
export const accountingApBridgeEventMutationResultSchema = accountingArBridgeEventMutationResultSchema;
export const accountingApBridgeJournalMutationResultSchema = accountingArBridgeJournalMutationResultSchema;
const accountingApBridgeReconciliationEventSchema = z.object({
  source_type: accountingApBridgeSourceTypeSchema,
  source_record_id: z.string().uuid(),
  source_record_key: boundedText(200),
  economic_event_key: boundedText(200),
  reconciliation_status: z.enum(["POSTED", "PREPARED", "HELD", "INCEPTION_COVERED", "MISSING_EFFECT", "MISSING_CLASSIFICATION", "ACCOUNTING_DATE_AFTER_CUTOFF"]),
  event_id: z.string().uuid().nullable(),
  event_version: z.number().int().positive().nullable(),
  classification: accountingApBridgeClassificationSchema.nullable(),
  supplier_id: z.string().uuid(),
  service_id: z.string().uuid().nullable(),
  receipt_id: z.string().uuid().nullable(),
  bill_id: z.string().uuid().nullable(),
  advance_id: z.string().uuid().nullable(),
  amount_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
  matched_receipt_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/).nullable(),
  source_business_date: validDate.nullable(),
  source_recorded_at: z.string(),
  accounting_date: validDate.nullable(),
  posted_accounting_date: validDate.nullable(),
  posted_at: z.string().nullable(),
  journal_id: z.string().uuid().nullable(),
  held_code: z.string().nullable(),
  post_cutover_covered: z.boolean(),
  inception_conflict: z.boolean(),
}).strict();
const accountingSignedHalalahSchema = z.string().regex(/^(0|-?[1-9][0-9]*)$/);
const accountingApBridgeControlBalanceSchema = z.object({
  party_role: z.enum(["ACCOUNTS_PAYABLE", "ACCRUED_LIABILITY", "SUPPLIER_ADVANCE"]),
  subledger_halalah: accountingSignedHalalahSchema,
  ledger_halalah: accountingSignedHalalahSchema,
  difference_halalah: accountingSignedHalalahSchema,
}).strict();
const accountingApBridgePartyBalanceSchema = z.object({
  accounts_payable_halalah: accountingSignedHalalahSchema,
  accrued_unbilled_halalah: accountingSignedHalalahSchema,
  supplier_advance_halalah: accountingSignedHalalahSchema,
  difference_halalah: accountingSignedHalalahSchema,
}).strict();
export const accountingApBridgeReconciliationSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("NOT_INITIALIZED") }).strict(),
  z.object({
    state: z.literal("READY"),
    as_of_date: validDate,
    recorded_at_cutoff: z.string(),
    cutover_boundary_date: validDate.nullable(),
    bank_reconciled: z.literal(false),
    source_event_count: z.number().int().nonnegative(),
    posted_effect_count: z.number().int().nonnegative(),
    held_count: z.number().int().nonnegative(),
    missing_effect_count: z.number().int().nonnegative(),
    inception_conflict_count: z.number().int().nonnegative(),
    expected_effect_count: z.number().int().nonnegative(),
    duplicate_conflict_count: z.number().int().nonnegative(),
    control_difference_count: z.number().int().nonnegative(),
    supplier_difference_count: z.number().int().nonnegative(),
    service_difference_count: z.number().int().nonnegative(),
    accrued_unbilled_halalah: accountingSignedHalalahSchema,
    accounts_payable_halalah: accountingSignedHalalahSchema,
    supplier_advance_halalah: accountingSignedHalalahSchema,
    control_balances: z.array(accountingApBridgeControlBalanceSchema),
    supplier_balances: z.array(accountingApBridgePartyBalanceSchema.extend({ supplier_id: z.string().uuid() }).strict()),
    service_balances: z.array(accountingApBridgePartyBalanceSchema.extend({ service_id: z.string().uuid() }).strict()),
    matching_coverage: z.object({
      bill_amount_halalah: accountingSignedHalalahSchema,
      matched_receipt_halalah: accountingSignedHalalahSchema,
      direct_residual_halalah: accountingSignedHalalahSchema,
    }).strict(),
    timing_difference_count: z.number().int().nonnegative(),
    timing_differences: z.array(z.object({
      source_type: accountingApBridgeSourceTypeSchema,
      source_record_id: z.string().uuid(),
      supplier_id: z.string().uuid(),
      service_id: z.string().uuid().nullable(),
      source_business_date: validDate,
      accounting_date: validDate,
      days_difference: z.number().int(),
      amount_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
    }).strict()),
    truncated: z.boolean(),
    events: z.array(accountingApBridgeReconciliationEventSchema),
  }).strict(),
]);

const accountingExpenseBridgeSourceTypeSchema = z.enum([
  "EXPENSE",
  "EXPENSE_REIMBURSEMENT_SETTLEMENT",
  "CASH_ADVANCE_ISSUE",
  "CASH_ADVANCE_EXPENSE_SETTLEMENT",
  "CASH_ADVANCE_RETURN",
  "PETTY_CASH_TRANSACTION",
  "CASH_ADVANCE_GOVERNANCE_EVENT",
  "PETTY_CASH_FUND_GOVERNANCE_EVENT",
]);
const accountingExpenseBridgeClassificationSchema = z.enum([
  "EMPLOYEE_PAID_EXPENSE",
  "COMPANY_DIRECT_EXPENSE",
  "REIMBURSEMENT_CASH",
  "REIMBURSEMENT_ADVANCE_OFFSET",
  "CASH_ADVANCE_ISSUE",
  "CASH_ADVANCE_EXPENSE_SETTLEMENT",
  "CASH_ADVANCE_RETURN",
  "PETTY_REPLENISHMENT",
  "PETTY_EXPENSE_DISBURSEMENT",
  "PETTY_TREASURY_WITHDRAWAL",
  "PETTY_RETURN_TO_TREASURY",
  "PETTY_RETURN_FROM_TREASURY",
  "NO_MONETARY_EFFECT",
  "HELD_UNSUPPORTED_TREATMENT",
]);
const accountingExpenseBridgeDirectClassificationSchema = z.enum([
  "DIRECT_EXPENSE",
  "CAPITAL_ASSET",
  "PREPAID_EXPENSE",
]);

export const saveAccountingExpenseBridgeEventInputSchema = z.object({
  source_type: accountingExpenseBridgeSourceTypeSchema,
  source_record_id: z.string().uuid(),
  expected_version: z.number().int().nonnegative(),
  classification: accountingExpenseBridgeClassificationSchema,
  direct_classification: accountingExpenseBridgeDirectClassificationSchema.nullable(),
  accounting_date: validDate.nullable(),
  service_attribution: z.enum(["SERVICE", "OVERHEAD"]),
  expense_account_id: z.string().uuid().nullable(),
  expense_account_version: z.number().int().positive().nullable(),
  control_account_id: z.string().uuid().nullable(),
  control_account_version: z.number().int().positive().nullable(), advance_account_id: z.string().uuid().nullable(), advance_account_version: z.number().int().positive().nullable(),
  cash_account_id: z.string().uuid().nullable(),
  cash_account_version: z.number().int().positive().nullable(),
  cash_binding_evidence_ref: nullableEvidence,
  cash_binding_evidence_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  evidence_ref: nullableEvidence,
  evidence_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  related_advance_id: z.string().uuid().nullable(),
  advance_provenance_evidence_ref: nullableEvidence,
  advance_provenance_evidence_sha256: z.string().regex(/^[0-9a-f]{64}$/).nullable(),
  return_direction: z.enum(["TO_TREASURY", "FROM_TREASURY"]).nullable(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict().superRefine((value, context) => {
  for (const [refKey, hashKey] of [
    ["evidence_ref", "evidence_sha256"],
    ["cash_binding_evidence_ref", "cash_binding_evidence_sha256"],
    ["advance_provenance_evidence_ref", "advance_provenance_evidence_sha256"],
  ] as const) {
    if ((value[refKey] === null) !== (value[hashKey] === null)) {
      context.addIssue({ code: "custom", path: [hashKey], message: "Evidence reference and SHA-256 must be supplied together" });
    }
  }
  for (const [idKey, versionKey] of [
    ["expense_account_id", "expense_account_version"],
    ["control_account_id", "control_account_version"],
    ["advance_account_id", "advance_account_version"], ["cash_account_id", "cash_account_version"],
  ] as const) {
    if ((value[idKey] === null) !== (value[versionKey] === null)) {
      context.addIssue({ code: "custom", path: [versionKey], message: "Account identity and version must be supplied together" });
    }
  }
  if (
    value.classification !== "HELD_UNSUPPORTED_TREATMENT"
    && value.classification !== "NO_MONETARY_EFFECT"
    && value.accounting_date === null
  ) {
    context.addIssue({ code: "custom", path: ["accounting_date"], message: "Accounting classifications require an accounting date" });
  }
  if (
    value.source_type !== "EXPENSE_REIMBURSEMENT_SETTLEMENT"
    && (value.related_advance_id !== null
      || value.advance_provenance_evidence_ref !== null
      || value.advance_provenance_evidence_sha256 !== null)
  ) {
    context.addIssue({ code: "custom", path: ["related_advance_id"], message: "Advance offset provenance is valid only for reimbursement settlements" });
  }
  if (value.source_type !== "PETTY_CASH_TRANSACTION" && value.return_direction !== null) {
    context.addIssue({ code: "custom", path: ["return_direction"], message: "Return direction is valid only for Petty Cash transactions" });
  }
});

export const prepareAccountingExpenseBridgeEventInputSchema = z.object({
  event_id: z.string().uuid(),
  event_version: z.number().int().positive(),
  period_id: z.string().uuid(),
  period_version: z.number().int().positive(),
  posting_rule_id: z.string().uuid(),
  rule_version: z.number().int().positive(),
  reason: boundedText(2000),
  request_id: z.string().uuid(),
}).strict();

export const postAccountingExpenseBridgeJournalInputSchema = z.object({
  journal_id: z.string().uuid(),
  expected_version: z.number().int().positive(),
  request_id: z.string().uuid(),
}).strict();

export const accountingExpenseBridgeReconciliationInputSchema = z.object({
  as_of_date: validDate,
  recorded_at_cutoff: z.string().datetime({ offset: true }),
  limit: z.number().int().min(1).max(500).default(200),
}).strict();

export const accountingExpenseBridgeEventMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  event_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["READY", "HELD", "NO_EFFECT"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();

export const accountingExpenseBridgeJournalMutationResultSchema = z.object({
  error_code: z.string().nullable(),
  journal_id: z.string().uuid().nullable(),
  version: z.number().int().positive().nullable(),
  status: z.enum(["DRAFT", "POSTED"]).nullable(),
  idempotent_replay: z.boolean(),
}).strict();

const accountingExpenseBridgeReconciliationEventSchema = z.object({
  source_type: accountingExpenseBridgeSourceTypeSchema,
  source_record_id: z.string().uuid(),
  source_record_key: boundedText(200),
  economic_event_key: boundedText(200),
  reconciliation_status: z.enum([
    "POSTED",
    "PREPARED",
    "HELD",
    "NO_EFFECT",
    "INCEPTION_COVERED",
    "MISSING_EFFECT",
    "MISSING_CLASSIFICATION",
    "ACCOUNTING_DATE_AFTER_CUTOFF",
    "SOURCE_PAYLOAD_CONFLICT",
  ]),
  event_id: z.string().uuid().nullable(),
  event_version: z.number().int().positive().nullable(),
  classification: accountingExpenseBridgeClassificationSchema.nullable(),
  employee_id: z.string().uuid().nullable(),
  service_id: z.string().uuid().nullable(),
  expense_id: z.string().uuid().nullable(),
  advance_id: z.string().uuid().nullable(),
  fund_id: z.string().uuid().nullable(),
  amount_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
  source_business_date: validDate.nullable(),
  source_recorded_at: z.string(),
  accounting_date: validDate.nullable(),
  posted_at: z.string().nullable(),
  journal_id: z.string().uuid().nullable(),
  held_code: z.string().nullable(),
  post_cutover_covered: z.boolean(),
  inception_conflict: z.boolean(),
  source_conflict: z.boolean(),
}).strict();

const accountingExpenseBridgeControlBalanceSchema = z.object({
  party_role: z.enum(["EMPLOYEE_REIMBURSEMENT_LIABILITY", "EMPLOYEE_ADVANCE", "CASH_ACCOUNTABILITY"]),
  subledger_halalah: accountingSignedHalalahSchema,
  ledger_halalah: accountingSignedHalalahSchema,
  difference_halalah: accountingSignedHalalahSchema,
}).strict();

export const accountingExpenseBridgeReconciliationSchema = z.discriminatedUnion("state", [
  z.object({ state: z.literal("NOT_INITIALIZED") }).strict(),
  z.object({
    state: z.literal("READY"),
    as_of_date: validDate,
    recorded_at_cutoff: z.string(),
    cutover_boundary_date: validDate.nullable(),
    bank_reconciled: z.literal(false),
    source_event_count_partial: z.literal(false),
    source_event_count: z.number().int().nonnegative(),
    posted_effect_count: z.number().int().nonnegative(),
    held_count: z.number().int().nonnegative(),
    no_effect_count: z.number().int().nonnegative(),
    missing_effect_count: z.number().int().nonnegative(),
    inception_conflict_count: z.number().int().nonnegative(),
    expected_effect_count: z.number().int().nonnegative(),
    source_payload_conflict_count: z.number().int().nonnegative(),
    duplicate_conflict_count: z.number().int().nonnegative(),
    control_difference_count: z.number().int().nonnegative(),
    employee_difference_count: z.number().int().nonnegative(),
    fund_difference_count: z.number().int().nonnegative(),
    service_difference_count: z.number().int().nonnegative(),
    recognized_expense_asset_halalah: accountingSignedHalalahSchema,
    employee_reimbursement_liability_halalah: accountingSignedHalalahSchema,
    employee_advance_balance_halalah: accountingSignedHalalahSchema,
    petty_cash_accountability_halalah: accountingSignedHalalahSchema,
    reimbursements_paid_halalah: accountingSignedHalalahSchema,
    reimbursement_advance_offsets_halalah: accountingSignedHalalahSchema,
    advance_settlements_halalah: accountingSignedHalalahSchema,
    advance_returns_halalah: accountingSignedHalalahSchema,
    petty_replenishments_halalah: accountingSignedHalalahSchema,
    petty_disbursements_halalah: accountingSignedHalalahSchema,
    petty_treasury_transfers_halalah: accountingSignedHalalahSchema,
    control_balances: z.array(accountingExpenseBridgeControlBalanceSchema),
    employee_balances: z.array(z.object({
      employee_id: z.string().uuid(),
      reimbursement_liability_halalah: accountingSignedHalalahSchema,
      reimbursement_liability_expected_halalah: accountingSignedHalalahSchema,
      reimbursement_liability_difference_halalah: accountingSignedHalalahSchema,
      advance_balance_halalah: accountingSignedHalalahSchema,
      advance_balance_expected_halalah: accountingSignedHalalahSchema,
      advance_balance_difference_halalah: accountingSignedHalalahSchema,
      difference_halalah: accountingSignedHalalahSchema,
    }).strict()),
    fund_balances: z.array(z.object({
      fund_id: z.string().uuid(),
      petty_cash_halalah: accountingSignedHalalahSchema,
      petty_cash_expected_halalah: accountingSignedHalalahSchema,
      difference_halalah: accountingSignedHalalahSchema,
    }).strict()),
    service_balances: z.array(z.object({
      service_id: z.string().uuid(),
      recognized_expense_asset_halalah: accountingSignedHalalahSchema,
      recognized_expense_asset_expected_halalah: accountingSignedHalalahSchema,
      reimbursement_liability_halalah: accountingSignedHalalahSchema,
      reimbursement_liability_expected_halalah: accountingSignedHalalahSchema,
      employee_advance_halalah: accountingSignedHalalahSchema,
      employee_advance_expected_halalah: accountingSignedHalalahSchema,
      petty_cash_halalah: accountingSignedHalalahSchema,
      petty_cash_expected_halalah: accountingSignedHalalahSchema,
      difference_halalah: accountingSignedHalalahSchema,
    }).strict()),
    timing_difference_count: z.number().int().nonnegative(),
    timing_differences: z.array(z.object({
      source_type: accountingExpenseBridgeSourceTypeSchema,
      source_record_id: z.string().uuid(),
      source_business_date: validDate.nullable(),
      accounting_date: validDate,
      days_difference: z.number().int(),
      amount_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
    }).strict()),
    truncated: z.literal(false),
    events: z.array(accountingExpenseBridgeReconciliationEventSchema),
  }).strict(),
  z.object({
    state: z.literal("TRUNCATED"),
    as_of_date: validDate,
    recorded_at_cutoff: z.string(),
    cutover_boundary_date: validDate.nullable(),
    bank_reconciled: z.literal(false),
    source_event_count_partial: z.literal(true),
    source_event_count: z.number().int().nonnegative(),
    posted_effect_count: z.number().int().nonnegative(),
    held_count: z.number().int().nonnegative(),
    no_effect_count: z.number().int().nonnegative(),
    missing_effect_count: z.number().int().nonnegative(),
    inception_conflict_count: z.number().int().nonnegative(),
    expected_effect_count: z.number().int().nonnegative(),
    source_payload_conflict_count: z.number().int().nonnegative(),
    duplicate_conflict_count: z.number().int().nonnegative(),
    control_difference_count: z.null(),
    employee_difference_count: z.null(),
    fund_difference_count: z.null(),
    service_difference_count: z.null(),
    recognized_expense_asset_halalah: accountingSignedHalalahSchema,
    employee_reimbursement_liability_halalah: accountingSignedHalalahSchema,
    employee_advance_balance_halalah: accountingSignedHalalahSchema,
    petty_cash_accountability_halalah: accountingSignedHalalahSchema,
    reimbursements_paid_halalah: accountingSignedHalalahSchema,
    reimbursement_advance_offsets_halalah: accountingSignedHalalahSchema,
    advance_settlements_halalah: accountingSignedHalalahSchema,
    advance_returns_halalah: accountingSignedHalalahSchema,
    petty_replenishments_halalah: accountingSignedHalalahSchema,
    petty_disbursements_halalah: accountingSignedHalalahSchema,
    petty_treasury_transfers_halalah: accountingSignedHalalahSchema,
    control_balances: z.null(),
    employee_balances: z.null(),
    fund_balances: z.null(),
    service_balances: z.null(),
    timing_difference_count: z.number().int().nonnegative(),
    timing_differences: z.array(z.object({
      source_type: accountingExpenseBridgeSourceTypeSchema,
      source_record_id: z.string().uuid(),
      source_business_date: validDate.nullable(),
      accounting_date: validDate,
      days_difference: z.number().int(),
      amount_halalah: z.string().regex(/^(0|[1-9][0-9]*)$/),
    }).strict()),
    truncated: z.literal(true),
    events: z.array(accountingExpenseBridgeReconciliationEventSchema),
  }).strict(),
]);
