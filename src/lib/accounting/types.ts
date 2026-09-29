export const ACCOUNTING_CAPABILITIES = [
  "accounting:view",
  "accounting:manage_profile",
  "accounting:manage_authority",
  "accounting:manage_chart",
  "accounting:manage_periods",
  "accounting:prepare_journal",
  "accounting:post_journal",
  "accounting:reverse_journal",
  "accounting:manage_inception",
  "accounting:manage_ar_bridge",
  "accounting:manage_ap_bridge",
  "accounting:reconcile_bank",
  "accounting:close_period",
  "accounting:reopen_period",
  "accounting:view_statements",
] as const;

export type AccountingCapability = (typeof ACCOUNTING_CAPABILITIES)[number];
export type AccountingCapabilityEffect = "ALLOW" | "DENY" | "REVOKE";
export type AccountingActivationState = "INACTIVE" | "DEV_PROVISIONAL";

export type AccountingCapabilityAssignment = {
  capability: AccountingCapability;
  effect: AccountingCapabilityEffect;
  revision: number;
  expires_at: string | null;
  actor_user_id: string;
  created_at: string;
};

export type AccountingProfileInput = {
  framework_key: "SA_IFRS_FOR_SMES";
  framework_edition: 2025;
  policy_version: string;
  endorsement_context: string;
  professional_validation_state: "DEFERRED";
  professional_validation_evidence_ref: string | null;
  functional_currency: "SAR";
  fiscal_start_month: 1;
  fiscal_start_day: 1;
  fiscal_end_month: 12;
  fiscal_end_day: 31;
  fiscal_timezone: "Asia/Riyadh";
  accounting_start_date: string | null;
  cutover_boundary_date: string | null;
  legal_fiscal_evidence_pending: boolean;
  legal_fiscal_evidence_ref: string | null;
  vat_mode: "not_registered";
  zatca_state: "INACTIVE";
  fatoora_state: "INACTIVE";
  activation_state: AccountingActivationState;
};

export type AccountingProfileSnapshot = AccountingProfileInput & {
  id: string;
  singleton_key: "g7";
  company_settings_id: string;
  version: number;
  effective_from: string;
  reason: string;
  evidence_ref: string | null;
  created_by: string;
  created_at: string;
};

export type AccountingProfileResult =
  | { state: "NOT_INITIALIZED" }
  | AccountingProfileSnapshot;

export type AccountingActionErrorCode =
  | "invalid_input"
  | "actor_inactive"
  | "authority_denied"
  | "user_not_found"
  | "profile_not_initialized"
  | "unknown_capability"
  | "capability_disabled"
  | "capability_not_grantable"
  | "invalid_expiry"
  | "revision_conflict"
  | "request_payload_conflict"
  | "profile_version_unavailable"
  | "transition_required"
  | "unsupported_profile_value"
  | "profile_incomplete"
  | "company_settings_mismatch"
  | "invalid_period_boundary"
  | "account_not_found"
  | "period_not_found"
  | "account_code_conflict"
  | "parent_not_found"
  | "parent_must_be_non_posting"
  | "account_cycle"
  | "account_has_children"
  | "protected_account_invariant"
  | "period_overlap"
  | "profile_not_active"
  | "posting_rule_not_found"
  | "source_identity_immutable"
  | "mapping_conflict"
  | "mapping_invalid"
  | "posting_rule_unavailable"
  | "posting_rule_changed"
  | "journal_not_found"
  | "journal_not_draft"
  | "journal_not_posted"
  | "journal_unbalanced"
  | "economic_effect_conflict"
  | "period_not_open"
  | "period_version_changed"
  | "period_date_mismatch"
  | "profile_version_changed"
  | "account_not_posting"
  | "service_dimension_invalid"
  | "service_not_found"
  | "already_reversed"
  | "package_not_found"
  | "duplicate_coverage"
  | "unsupported_classification"
  | "unsupported_source"
  | "evidence_required"
  | "unresolved_material_evidence"
  | "incomplete_coverage"
  | "review_required"
  | "separation_required"
  | "trial_balance_incomplete"
  | "source_payload_conflict"
  | "original_effect_missing"
  | "cash_account_evidence_missing"
  | "classification_evidence_missing"
  | "revenue_correction_required"
  | "unsupported_source_treatment"
  | "vat_not_supported"
  | "receipt_accrual_missing"
  | "receipt_match_exceeds_accrual"
  | "direct_residual_evidence_missing"
  | "payable_balance_insufficient"
  | "supplier_advance_balance_insufficient"
  | "advance_authorization_exceeded"
  | "dependency_failure";

export type AccountingActionResult<T> =
  | { ok: true; value: T; idempotentReplay?: boolean }
  | { ok: false; code: AccountingActionErrorCode };

export type AccountingAccountType = "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
export type AccountingNormalBalance = "DEBIT" | "CREDIT";
export type AccountingAccountKind = "POSTING" | "NON_POSTING";
export type AccountingControlClassification =
  | "NONE"
  | "ACCOUNTS_RECEIVABLE"
  | "ACCOUNTS_PAYABLE"
  | "ACCRUED_LIABILITY"
  | "CUSTOMER_ADVANCE"
  | "SUPPLIER_ADVANCE"
  | "CONTRACT_LIABILITY"
  | "CASH_ACCOUNTABILITY"
  | "EMPLOYEE_ADVANCE";

export type AccountingAccountInput = {
  account_code: string;
  name_en: string;
  name_ar: string;
  account_type: AccountingAccountType;
  category: string;
  normal_balance: AccountingNormalBalance;
  account_kind: AccountingAccountKind;
  parent_account_id: string | null;
  is_active: boolean;
  is_protected: boolean;
  control_classification: AccountingControlClassification;
};

export type AccountingAccountVersion = AccountingAccountInput & {
  account_id: string;
  profile_id: string;
  version: number;
  is_current: boolean;
  previous_version: number | null;
  effective_from: string;
  reason: string;
  evidence_ref: string | null;
  created_by: string;
  created_at: string;
};

export type AccountingPeriodStatus = "OPEN" | "CLOSED" | "LOCKED";

export type AccountingPeriodInput = {
  start_date: string;
  end_date: string;
  status: "OPEN";
};

export type AccountingPeriodVersion = Omit<AccountingPeriodInput, "status"> & {
  period_id: string;
  profile_id: string;
  version: number;
  is_current: boolean;
  previous_version: number | null;
  status: AccountingPeriodStatus;
  effective_from: string;
  reason: string;
  evidence_ref: string | null;
  created_by: string;
  created_at: string;
};

export type AccountingVersionResult = {
  account_id?: string;
  period_id?: string;
  version: number;
};

export type AccountingPostingRuleMappingInput = {
  mapping_key: string;
  account_id: string;
  account_version: number;
  allowed_side: "DEBIT" | "CREDIT" | "EITHER";
  service_requirement: "REQUIRED" | "OPTIONAL" | "FORBIDDEN";
};

export type AccountingPostingRuleInput = {
  rule_code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  mappings: AccountingPostingRuleMappingInput[];
};

export type AccountingPostingRuleVersion = {
  posting_rule_id: string;
  profile_id: string;
  version: number;
  is_current: boolean;
  previous_version: number | null;
  rule_code: string;
  name_en: string;
  name_ar: string;
  is_active: boolean;
  effective_from: string;
  reason: string;
  evidence_ref: string | null;
  created_by: string;
  created_at: string;
  mappings: AccountingPostingRuleMappingInput[];
};

export type AccountingJournalLineInput = {
  mapping_key: string;
  side: "DEBIT" | "CREDIT";
  amount_halalah: string;
  service_id: string | null;
  description_en: string;
  description_ar: string;
};

export type AccountingJournalInput = {
  accounting_date: string;
  period_id: string;
  period_version: number;
  posting_rule_id: string;
  rule_version: number;
  source_record_key: string;
  economic_event_key: string;
  posting_purpose: string;
  description_en: string;
  description_ar: string;
  lines: AccountingJournalLineInput[];
};

export type AccountingJournalMutationResult = {
  journal_id: string;
  version: number;
  status: "DRAFT" | "POSTED";
};

export type AccountingJournalEventLine = AccountingJournalLineInput & {
  line_number: number;
  account_id: string;
  account_version: number;
  account_code: string;
  name_en: string;
  name_ar: string;
  account_type: AccountingAccountType;
  normal_balance: AccountingNormalBalance;
  service_number: string | null;
  event_name: string | null;
  event_type: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
};

export type AccountingJournalVersion = {
  version: number;
  previous_version: number | null;
  status: "DRAFT" | "POSTED";
  profile_version: number;
  period_id: string;
  period_version: number;
  accounting_date: string;
  posting_rule_id: string;
  rule_version: number;
  source_domain: "CONTROLLED_MANUAL" | "INCEPTION" | "AR_BRIDGE" | "AP_BRIDGE";
  source_record_key: string;
  economic_event_key: string;
  posting_purpose: string;
  description_en: string;
  description_ar: string;
  currency: "SAR";
  reason: string;
  evidence_ref: string | null;
  prepared_by: string;
  prepared_at: string;
  posted_by: string | null;
  posted_at: string | null;
  lines: AccountingJournalEventLine[];
};

export type AccountingJournalDetail = {
  journal_id: string;
  profile_id: string;
  correction_group_id: string;
  reversal_of_journal_id: string | null;
  current_version: number;
  versions: AccountingJournalVersion[];
};

export type AccountingGeneralLedgerEntry = {
  journal_id: string;
  journal_version: number;
  accounting_date: string;
  posted_at: string;
  posted_by: string;
  reversal_of_journal_id: string | null;
  correction_group_id: string;
  account_id: string;
  account_version: number;
  account_code: string;
  account_name_en: string;
  account_name_ar: string;
  side: "DEBIT" | "CREDIT";
  amount_halalah: string;
  service_id: string | null;
  service_number: string | null;
  event_name: string | null;
  event_type: string | null;
  event_start_date: string | null;
  event_end_date: string | null;
  line_number: number;
  description_en: string;
  description_ar: string;
};

export type AccountingTrialBalanceAccount = {
  account_id: string;
  account_code: string;
  account_name_en: string;
  account_name_ar: string;
  account_type: AccountingAccountType;
  normal_balance: AccountingNormalBalance;
  debit_activity_halalah: string;
  credit_activity_halalah: string;
  debit_balance_halalah: string;
  credit_balance_halalah: string;
};

export type AccountingInceptionClassification =
  | "RECONSTRUCTED_HISTORY"
  | "OPENING_BALANCE"
  | "POST_CUTOVER_SOURCE"
  | "UNRESOLVED";
export type AccountingInceptionResolution = "RESOLVED" | "UNRESOLVED";
export type AccountingInceptionParty =
  | "NONE"
  | "CUSTOMER"
  | "SUPPLIER"
  | "EMPLOYEE"
  | "FOUNDER"
  | "BANK"
  | "CASH";
export type AccountingInceptionReconciliationCategory =
  | "ACCOUNTS_RECEIVABLE"
  | "ACCOUNTS_PAYABLE"
  | "EMPLOYEE_ACCOUNTABILITY"
  | "FOUNDER_SOURCE"
  | "BANK_CASH"
  | "ASSET"
  | "LIABILITY"
  | "EXPENSE"
  | "OTHER";
export type AccountingInceptionEvidenceType =
  | "BANK_STATEMENT"
  | "BANK_CONFIRMATION"
  | "RECEIVABLE_DETAIL"
  | "PAYABLE_DETAIL"
  | "EMPLOYEE_ACCOUNTABILITY"
  | "FOUNDER_AGREEMENT"
  | "FIXED_ASSET_SUPPORT"
  | "PREPAYMENT_SUPPORT"
  | "EXPENSE_SUPPORT"
  | "OTHER";
export type AccountingInceptionEvidence = {
  evidence_id: string;
  version: number;
  evidence_type: AccountingInceptionEvidenceType;
  evidence_ref: string;
  sha256: string;
};
export type AccountingInceptionEvidenceReference = {
  evidence_id: string;
  version: number;
};
export type AccountingInceptionJournalLine = {
  account_id: string;
  account_version: number;
  side: "DEBIT" | "CREDIT";
  amount_halalah: string;
  description_en: string;
  description_ar: string;
};
export type AccountingInceptionJournalPlan = {
  accounting_date: string;
  period_id: string;
  period_version: number;
  description_en: string;
  description_ar: string;
  lines: AccountingInceptionJournalLine[];
};
export type AccountingInceptionItem = {
  item_id: string;
  source_domain: string;
  source_record_key: string;
  economic_event_key: string;
  classification: AccountingInceptionClassification;
  resolution_state: AccountingInceptionResolution;
  is_material: boolean;
  reconciliation_category: AccountingInceptionReconciliationCategory;
  reconciliation_reference: string | null;
  party_type: AccountingInceptionParty;
  party_reference: string | null;
  evidence_refs: AccountingInceptionEvidenceReference[];
  journal: AccountingInceptionJournalPlan | null;
};
export type AccountingInceptionPayload = {
  accounting_start_date: string;
  cutover_boundary_date: string;
  evidence_inventory: AccountingInceptionEvidence[];
  items: AccountingInceptionItem[];
  reconciliation_references: Array<{
    category: AccountingInceptionReconciliationCategory;
    reference: string;
  }>;
};
export type SaveAccountingInceptionPackageInput = {
  package_id: string | null;
  expected_version: number;
  package: AccountingInceptionPayload;
  reason: string;
  request_id: string;
};
export type ReviewAccountingInceptionPackageInput = {
  package_id: string;
  package_version: number;
  approve: boolean;
  reason: string;
  request_id: string;
};
export type PrepareAccountingInceptionJournalInput = {
  package_id: string;
  package_version: number;
  item_id: string;
  reason: string;
  request_id: string;
};
export type PostAccountingInceptionJournalInput = {
  journal_id: string;
  expected_version: number;
  request_id: string;
};
export type AcceptAccountingInceptionPackageInput = {
  package_id: string;
  package_version: number;
  reason: string;
  request_id: string;
};
export type AccountingInceptionJournalMutation = {
  journal_id: string;
  version: number;
  status: "DRAFT" | "POSTED";
};
export type AccountingInceptionReviewResult = {
  review_id: string;
  decision: "APPROVE" | "REJECT";
};
export type AccountingInceptionAcceptanceResult = {
  acceptance_id: string;
  trial_balance: {
    as_of_date: string;
    recorded_at_cutoff: string;
    service_id: null;
    accounts: AccountingTrialBalanceAccount[];
    debit_balance_total_halalah: string;
    credit_balance_total_halalah: string;
    debits_equal_credits: true;
    account_count: number;
  };
};
export type AccountingInceptionPackageSummary = {
  package_id: string;
  current_version: number;
  accounting_start_date: string;
  cutover_boundary_date: string;
  created_at: string;
  accepted: boolean;
};
export type AccountingInceptionPackageVersion = {
  version: number;
  previous_version: number | null;
  accounting_start_date: string;
  cutover_boundary_date: string;
  payload: AccountingInceptionPayload;
  payload_fingerprint: string;
  created_by: string;
  created_at: string;
};
export type AccountingInceptionCoverageVersion = {
  coverage_id: string;
  source_domain: string;
  source_record_key: string;
  economic_event_key: string;
  version: number;
  previous_version: number | null;
  package_version: number;
  item_id: string;
  classification: AccountingInceptionClassification;
  resolution_state: AccountingInceptionResolution;
  is_material: boolean;
  reconciliation_category: AccountingInceptionReconciliationCategory;
  party_type: AccountingInceptionParty;
  party_reference: string | null;
  reconciliation_reference: string | null;
  evidence_count: number;
  payload_fingerprint: string;
  created_by: string;
  created_at: string;
};
export type AccountingInceptionReviewHistory = {
  review_id: string;
  package_version: number;
  decision: "APPROVE" | "REJECT";
  reviewer_user_id: string;
  reason: string;
  reviewed_at: string;
};
export type AccountingInceptionPackageDetail = {
  package_id: string;
  profile_id: string;
  current_version: number;
  created_at: string;
  version: AccountingInceptionPackageVersion;
  versions: AccountingInceptionPackageVersion[];
  coverage_history: AccountingInceptionCoverageVersion[];
  review_history: AccountingInceptionReviewHistory[];
  coverage: Array<{
    coverage_id: string;
    source_domain: string;
    source_record_key: string;
    economic_event_key: string;
    version: number;
    item_id: string;
    classification: AccountingInceptionClassification;
    resolution_state: AccountingInceptionResolution;
    is_material: boolean;
    reconciliation_category: AccountingInceptionReconciliationCategory;
    party_type: AccountingInceptionParty;
    party_reference: string | null;
    reconciliation_reference: string | null;
    evidence_count: number;
  }>;
  review: null | Omit<AccountingInceptionReviewHistory, "package_version">;
  acceptance: null | {
    acceptance_id: string;
    accepted_by: string;
    accepted_at: string;
    as_of_date: string;
    recorded_at_cutoff: string;
    trial_balance: AccountingInceptionAcceptanceResult["trial_balance"];
  };
};

export type AccountingArBridgeSourceType =
  | "INVOICE"
  | "PAYMENT"
  | "RECEIPT"
  | "ALLOCATION"
  | "RECEIPT_REVERSAL"
  | "ALLOCATION_REVERSAL"
  | "CREDIT_ADJUSTMENT"
  | "CREDIT_ADJUSTMENT_REVERSAL"
  | "CREDIT_APPLICATION"
  | "CREDIT_APPLICATION_REVERSAL"
  | "REFUND"
  | "REFUND_REVERSAL";

export type AccountingArBridgeClassification =
  | "UNCONDITIONAL_CONTRACT_LIABILITY"
  | "UNCONDITIONAL_CONTRACT_ASSET"
  | "CUSTOMER_ADVANCE"
  | "SETTLEMENT"
  | "REVERSAL"
  | "CUSTOMER_LIABILITY"
  | "CUSTOMER_LIABILITY_REFUND"
  | "HELD_UNSUPPORTED_ENTITLEMENT"
  | "HELD_UNSUPPORTED_CASH"
  | "HELD_REVENUE_CORRECTION"
  | "HELD_UNSUPPORTED_TREATMENT";

export type SaveAccountingArBridgeEventInput = {
  source_type: AccountingArBridgeSourceType;
  source_record_id: string;
  expected_version: number;
  classification: AccountingArBridgeClassification;
  accounting_date: string | null;
  evidence_ref: string | null;
  evidence_sha256: string | null;
  reason: string;
  request_id: string;
};

export type AccountingArBridgeEventMutationResult = {
  event_id: string;
  version: number;
  status: "READY" | "HELD";
};

export type PrepareAccountingArBridgeEventInput = {
  event_id: string;
  event_version: number;
  period_id: string;
  period_version: number;
  posting_rule_id: string;
  rule_version: number;
  reason: string;
  request_id: string;
};

export type PostAccountingArBridgeJournalInput = {
  journal_id: string;
  expected_version: number;
  request_id: string;
};

export type AccountingArBridgeReconciliationEvent = {
  source_type: AccountingArBridgeSourceType;
  source_record_id: string;
  source_record_key: string;
  economic_event_key: string;
  reconciliation_status: "POSTED" | "PREPARED" | "HELD" | "INCEPTION_COVERED" | "MISSING_EFFECT" | "DUPLICATE_CONFLICT";
  event_id: string | null;
  event_version: number | null;
  classification: AccountingArBridgeClassification | null;
  customer_id: string;
  service_id: string | null;
  invoice_id: string | null;
  amount_halalah: string;
  source_business_date: string | null;
  source_recorded_at: string;
  accounting_date: string | null;
  posted_accounting_date: string | null;
  posted_at: string | null;
  journal_id: string | null;
  held_code: string | null;
  expected_ar_delta_halalah: string;
  posted_ar_delta_halalah: string;
  source_snapshot_sha256: string | null;
};

export type AccountingArBridgePartyBalance = {
  customer_id: string;
  service_id: string | null;
  invoice_id: string | null;
  source_ar_delta_halalah: string;
  posted_ar_delta_halalah: string;
  difference_halalah: string;
};

export type AccountingArBridgeReconciliation =
  | { state: "NOT_INITIALIZED" }
  | {
      state: "READY";
      as_of_date: string;
      recorded_at_cutoff: string;
      source_event_count: number;
      posted_effect_count: number;
      held_unresolved_count: number;
      inception_covered_count: number;
      missing_effect_count: number;
      duplicate_conflict_count: number;
      party_difference_count: number;
      timing_difference_count: number;
      truncated: boolean;
      events: AccountingArBridgeReconciliationEvent[];
      party_balances: AccountingArBridgePartyBalance[];
    };

export type AccountingApBridgeSourceType =
  | "SERVICE_RECEIPT"
  | "SERVICE_RECEIPT_CORRECTION"
  | "SUPPLIER_BILL"
  | "SUPPLIER_PAYMENT"
  | "SUPPLIER_PAYMENT_REVERSAL"
  | "SUPPLIER_ADVANCE_PAYMENT"
  | "SUPPLIER_ADVANCE_PAYMENT_REVERSAL"
  | "SUPPLIER_ADVANCE_ALLOCATION"
  | "SUPPLIER_ADVANCE_ALLOCATION_REVERSAL"
  | "SUPPLIER_ADVANCE_REFUND";

export type AccountingApBridgeClassification =
  | "RECEIPT_ACCRUAL"
  | "RECEIPT_CORRECTION_DECREASE"
  | "RECEIPT_CORRECTION_INCREASE"
  | "SUPPLIER_BILL"
  | "SUPPLIER_PAYMENT"
  | "SUPPLIER_PAYMENT_REVERSAL"
  | "SUPPLIER_ADVANCE_PAYMENT"
  | "SUPPLIER_ADVANCE_PAYMENT_REVERSAL"
  | "SUPPLIER_ADVANCE_ALLOCATION"
  | "SUPPLIER_ADVANCE_ALLOCATION_REVERSAL"
  | "SUPPLIER_ADVANCE_REFUND"
  | "HELD_UNSUPPORTED_TREATMENT";

export type AccountingApBridgeDirectClassification = "DIRECT_EXPENSE" | "CAPITAL_ASSET" | "PREPAID_EXPENSE";

export type AccountingApBridgeEventInput = {
  source_type: AccountingApBridgeSourceType;
  source_record_id: string;
  expected_version: number;
  classification: AccountingApBridgeClassification;
  amount_halalah: string | null;
  matched_receipt_halalah: string;
  direct_classification: AccountingApBridgeDirectClassification | null;
  accounting_date: string;
  evidence_ref: string | null;
  evidence_sha256: string | null;
  cash_binding_evidence_ref: string | null;
  cash_binding_evidence_sha256: string | null;
  cash_account_id: string | null;
  cash_account_version: number | null;
  reason: string;
  request_id: string;
};

export type AccountingApBridgeReconciliationEvent = {
  source_type: AccountingApBridgeSourceType;
  source_record_id: string;
  source_record_key: string;
  economic_event_key: string;
  reconciliation_status: "POSTED" | "PREPARED" | "HELD" | "INCEPTION_COVERED" | "MISSING_EFFECT" | "MISSING_CLASSIFICATION" | "ACCOUNTING_DATE_AFTER_CUTOFF";
  event_id: string | null;
  event_version: number | null;
  classification: AccountingApBridgeClassification | null;
  supplier_id: string;
  service_id: string | null;
  receipt_id: string | null;
  bill_id: string | null;
  advance_id: string | null;
  amount_halalah: string;
  matched_receipt_halalah: string | null;
  source_business_date: string | null;
  source_recorded_at: string;
  accounting_date: string | null;
  posted_accounting_date: string | null;
  posted_at: string | null;
  journal_id: string | null;
  held_code: string | null;
  post_cutover_covered: boolean;
  inception_conflict: boolean;
};

export type AccountingApBridgeReconciliation =
  | { state: "NOT_INITIALIZED" }
  | {
      state: "READY";
      as_of_date: string;
      recorded_at_cutoff: string;
      cutover_boundary_date: string | null;
      bank_reconciled: false;
      source_event_count: number;
      posted_effect_count: number;
      held_count: number;
      missing_effect_count: number;
      inception_conflict_count: number;
      expected_effect_count: number;
      duplicate_conflict_count: number;
      control_difference_count: number;
      supplier_difference_count: number;
      service_difference_count: number;
      accrued_unbilled_halalah: string;
      accounts_payable_halalah: string;
      supplier_advance_halalah: string;
      control_balances: Array<{
        party_role: "ACCOUNTS_PAYABLE" | "ACCRUED_LIABILITY" | "SUPPLIER_ADVANCE";
        subledger_halalah: string;
        ledger_halalah: string;
        difference_halalah: string;
      }>;
      supplier_balances: Array<{
        supplier_id: string;
        accounts_payable_halalah: string;
        accrued_unbilled_halalah: string;
        supplier_advance_halalah: string;
        difference_halalah: string;
      }>;
      service_balances: Array<{
        service_id: string;
        accounts_payable_halalah: string;
        accrued_unbilled_halalah: string;
        supplier_advance_halalah: string;
        difference_halalah: string;
      }>;
      matching_coverage: {
        bill_amount_halalah: string;
        matched_receipt_halalah: string;
        direct_residual_halalah: string;
      };
      timing_difference_count: number;
      timing_differences: Array<{
        source_type: AccountingApBridgeSourceType;
        source_record_id: string;
        supplier_id: string;
        service_id: string | null;
        source_business_date: string;
        accounting_date: string;
        days_difference: number;
        amount_halalah: string;
      }>;
      truncated: boolean;
      events: AccountingApBridgeReconciliationEvent[];
    };
