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
  "accounting:manage_expense_bridge",
  "accounting:manage_revenue_recognition",
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
  | "source_not_eligible"
  | "reimbursement_ceiling_exceeded"
  | "cash_advance_effect_missing"
  | "advance_balance_exceeded"
  | "expense_settlement_exceeds_expense"
  | "petty_cash_balance_insufficient"
  | "ADVANCE_OFFSET_PROVENANCE_REQUIRED"
  | "PETTY_CASH_RETURN_PROVENANCE_REQUIRED"
  | "source_customer_missing"
  | "review_exists"
  | "independent_review_required"
  | "stale_commercial_authority"
  | "unsupported_evidence"
  | "evidence_not_approved"
  | "arrangement_not_approved"
  | "point_in_time_evidence_incomplete"
  | "negative_delta_requires_correction"
  | "no_new_recognition_delta"
  | "recognition_before_performance"
  | "source_identity_immutable"
  | "recognition_ceiling_exceeded"
  | "revenue_correction_lineage_invalid"
  | "revenue_correction_ceiling_exceeded"
  | "revenue_correction_evidence_required"
  | "inception_coverage_conflict"
  | "bank_account_not_eligible"
  | "bank_binding_conflict"
  | "binding_version_unavailable"
  | "binding_not_approved"
  | "duplicate_statement_evidence"
  | "statement_batch_not_found"
  | "reconciliation_not_found"
  | "reconciliation_not_approved"
  | "mismatched_allocation_totals"
  | "bank_coverage_exceeded"
  | "unmatched_adjustment_required"
  | "period_not_finalized"
  | "period_not_closed"
  | "earlier_period_open"
  | "earlier_period_not_locked"
  | "later_finalized_period_exists"
  | "close_package_not_found"
  | "close_package_stale"
  | "close_evidence_incomplete"
  | "year_end_result_treatment_pending"
  | "review_exists"
  | "period_transition_required"
  | "dependency_failure";

export type AccountingActionResult<T> =
  | { ok: true; value: T; idempotentReplay?: boolean }
  | { ok: false; code: AccountingActionErrorCode };

export type AccountingPeriodClosePackageKind = "CLOSE" | "LOCK" | "REOPEN";

export type PrepareAccountingPeriodCloseInput = {
  period_id: string;
  expected_period_version: number;
  package_kind: AccountingPeriodClosePackageKind;
  reason: string;
  evidence_ref: string;
  recorded_at_cutoff: string;
  request_id: string;
};

export type ReviewAccountingPeriodCloseInput = {
  package_id: string;
  package_version: number;
  approve: boolean;
  reason: string;
  request_id: string;
};

export type AccountingPeriodClosePreparation = {
  package_id: string;
  package_version: number;
  package_state: "PREPARED";
  evidence_snapshot: Record<string, unknown>;
};

export type AccountingPeriodCloseReview = {
  package_id: string;
  package_version: number;
  decision: "APPROVED" | "REJECTED" | "STALE";
  resulting_period_version: number | null;
};

export type AccountingPeriodCloseReadModel = {
  state: "NOT_INITIALIZED" | "NOT_FOUND" | "READY";
  period?: Record<string, unknown>;
  current_period?: Record<string, unknown>;
  packages?: Array<Record<string, unknown>>;
  recorded_at_cutoff?: string;
};

export type AccountingBankBindingInput = {
  binding_id?: string | null;
  expected_version: number;
  account_id: string;
  account_version: number;
  bank_identity_ref: string;
  bank_identity_sha256: string;
  effective_from: string;
  effective_through: string | null;
  masked_display_identity: string;
  evidence_ref: string;
  evidence_sha256: string;
  reason: string;
  request_id: string;
};

export type AccountingBankStatementBatchInput = {
  batch_id?: string | null;
  expected_version: number;
  binding_id: string;
  binding_version: number;
  source_document_ref: string;
  evidence_sha256: string;
  evidence_identity: string;
  coverage_start: string;
  coverage_end: string;
  opening_balance_halalah: number;
  closing_balance_halalah: number;
  reason: string;
  request_id: string;
};

export type AccountingBankStatementLineInput = {
  line_id?: string | null;
  expected_version: number;
  batch_id: string;
  batch_version: number;
  stable_line_identity: string;
  transaction_date: string;
  value_date: string | null;
  signed_amount_halalah: number;
  reference: string | null;
  description: string | null;
  source_row_identity: string;
  duplicate_fingerprint: string;
  reason: string;
  request_id: string;
};

export type AccountingBankAllocation = {
  statement_line_id: string;
  statement_line_version: number;
  ledger_journal_id: string;
  ledger_journal_version: number;
  ledger_line_number: number;
  statement_allocated_halalah: number;
  ledger_allocated_halalah: number;
  rationale?: string;
};

export type AccountingBankReconciliationInput = {
  group_id?: string | null;
  expected_version: number;
  binding_id: string;
  binding_version: number;
  as_of_date: string;
  recorded_at_cutoff: string;
  allocations: AccountingBankAllocation[];
  rationale: string;
  evidence_ref: string | null;
  request_id: string;
};

export type AccountingBankMutationResult = {
  error_code: string | null;
  binding_id?: string | null;
  batch_id?: string | null;
  line_id?: string | null;
  group_id?: string | null;
  version?: number | null;
  group_version?: number | null;
  status?: string | null;
  decision?: string | null;
  duplicate_candidate?: boolean;
  idempotent_replay: boolean;
};

export type AccountingBankReconciliationRow = Record<string, unknown> & Partial<Record<
  | "signed_amount_halalah"
  | "amount_halalah"
  | "signed_amount"
  | "statement_allocated_halalah"
  | "ledger_allocated_halalah"
  | "opening_balance_halalah"
  | "closing_balance_halalah",
  string
>>;

export type AccountingBankReconciliation =
  | { state: "NOT_INITIALIZED"; binding_id: string; bank_reconciled: false }
  | {
      state: "READY" | "TRUNCATED";
      binding_id: string;
      binding_version?: number;
      account_id?: string;
      account_version?: number;
      currency?: "SAR";
      as_of_date?: string;
      recorded_at_cutoff?: string;
      statement_opening_balance_halalah?: string;
      statement_closing_balance_halalah?: string;
      ledger_opening_balance_halalah?: string;
      ledger_closing_balance_halalah?: string;
      statement_inflows_halalah?: string;
      statement_outflows_halalah?: string;
      ledger_inflows_halalah?: string;
      ledger_outflows_halalah?: string;
      matched_amount_halalah?: string;
      partially_matched_amount_halalah?: string;
      unmatched_statement_amount_halalah?: string;
      unmatched_ledger_amount_halalah?: string;
      duplicate_statement_candidates?: number;
      timing_difference_halalah?: string;
      impact_review_required_count?: number;
      unexplained_difference_halalah?: string;
      preparation_review_status?: string;
      evidence_cutoff?: string;
      adjustment_required_statement_items: AccountingBankReconciliationRow[];
      statement_lines: AccountingBankReconciliationRow[];
      ledger_cash_lines: AccountingBankReconciliationRow[];
    };

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
  | "EMPLOYEE_ADVANCE" | "EMPLOYEE_REIMBURSEMENT_LIABILITY"
  | "CONTRACT_ASSET";

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
  source_domain: "CONTROLLED_MANUAL" | "INCEPTION" | "AR_BRIDGE" | "AP_BRIDGE" | "EXPENSE_BRIDGE" | "REVENUE_RECOGNITION";
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

export type AccountingExpenseBridgeSourceType =
  | "EXPENSE"
  | "EXPENSE_REIMBURSEMENT_SETTLEMENT"
  | "CASH_ADVANCE_ISSUE"
  | "CASH_ADVANCE_EXPENSE_SETTLEMENT"
  | "CASH_ADVANCE_RETURN"
  | "PETTY_CASH_TRANSACTION"
  | "CASH_ADVANCE_GOVERNANCE_EVENT"
  | "PETTY_CASH_FUND_GOVERNANCE_EVENT";

export type AccountingExpenseBridgeClassification =
  | "EMPLOYEE_PAID_EXPENSE"
  | "COMPANY_DIRECT_EXPENSE"
  | "REIMBURSEMENT_CASH"
  | "REIMBURSEMENT_ADVANCE_OFFSET"
  | "CASH_ADVANCE_ISSUE"
  | "CASH_ADVANCE_EXPENSE_SETTLEMENT"
  | "CASH_ADVANCE_RETURN"
  | "PETTY_REPLENISHMENT"
  | "PETTY_EXPENSE_DISBURSEMENT"
  | "PETTY_TREASURY_WITHDRAWAL"
  | "PETTY_RETURN_TO_TREASURY"
  | "PETTY_RETURN_FROM_TREASURY"
  | "NO_MONETARY_EFFECT"
  | "HELD_UNSUPPORTED_TREATMENT";

export type AccountingExpenseBridgeDirectClassification =
  | "DIRECT_EXPENSE"
  | "CAPITAL_ASSET"
  | "PREPAID_EXPENSE";

export type AccountingExpenseBridgeEventInput = {
  source_type: AccountingExpenseBridgeSourceType;
  source_record_id: string;
  expected_version: number;
  classification: AccountingExpenseBridgeClassification;
  direct_classification: AccountingExpenseBridgeDirectClassification | null;
  accounting_date: string | null;
  service_attribution: "SERVICE" | "OVERHEAD";
  expense_account_id: string | null;
  expense_account_version: number | null;
  control_account_id: string | null;
  control_account_version: number | null; advance_account_id: string | null; advance_account_version: number | null;
  cash_account_id: string | null;
  cash_account_version: number | null;
  cash_binding_evidence_ref: string | null;
  cash_binding_evidence_sha256: string | null;
  evidence_ref: string | null;
  evidence_sha256: string | null;
  related_advance_id: string | null;
  advance_provenance_evidence_ref: string | null;
  advance_provenance_evidence_sha256: string | null;
  return_direction: "TO_TREASURY" | "FROM_TREASURY" | null;
  reason: string;
  request_id: string;
};

export type AccountingExpenseBridgeReconciliationEvent = {
  source_type: AccountingExpenseBridgeSourceType;
  source_record_id: string;
  source_record_key: string;
  economic_event_key: string;
  reconciliation_status:
    | "POSTED"
    | "PREPARED"
    | "HELD"
    | "NO_EFFECT"
    | "INCEPTION_COVERED"
    | "MISSING_EFFECT"
    | "MISSING_CLASSIFICATION"
    | "ACCOUNTING_DATE_AFTER_CUTOFF"
    | "SOURCE_PAYLOAD_CONFLICT";
  event_id: string | null;
  event_version: number | null;
  classification: AccountingExpenseBridgeClassification | null;
  employee_id: string | null;
  service_id: string | null;
  expense_id: string | null;
  advance_id: string | null;
  fund_id: string | null;
  amount_halalah: string;
  source_business_date: string | null;
  source_recorded_at: string;
  accounting_date: string | null;
  posted_at: string | null;
  journal_id: string | null;
  held_code: string | null;
  post_cutover_covered: boolean;
  inception_conflict: boolean;
  source_conflict: boolean;
};

export type AccountingExpenseBridgeReconciliation =
  | { state: "NOT_INITIALIZED" }
  | {
      state: "READY" | "TRUNCATED";
      as_of_date: string;
      recorded_at_cutoff: string;
      cutover_boundary_date: string | null;
      bank_reconciled: false;
      source_event_count_partial: boolean;
      source_event_count: number;
      posted_effect_count: number;
      held_count: number;
      no_effect_count: number;
      missing_effect_count: number;
      inception_conflict_count: number;
      expected_effect_count: number;
      source_payload_conflict_count: number;
      duplicate_conflict_count: number;
      control_difference_count: number | null;
      employee_difference_count: number | null;
      fund_difference_count: number | null;
      service_difference_count: number | null;
      recognized_expense_asset_halalah: string;
      employee_reimbursement_liability_halalah: string;
      employee_advance_balance_halalah: string;
      petty_cash_accountability_halalah: string;
      reimbursements_paid_halalah: string;
      reimbursement_advance_offsets_halalah: string;
      advance_settlements_halalah: string;
      advance_returns_halalah: string;
      petty_replenishments_halalah: string;
      petty_disbursements_halalah: string;
      petty_treasury_transfers_halalah: string;
      control_balances: Array<{
        party_role: "EMPLOYEE_REIMBURSEMENT_LIABILITY" | "EMPLOYEE_ADVANCE" | "CASH_ACCOUNTABILITY";
        subledger_halalah: string;
        ledger_halalah: string;
        difference_halalah: string;
      }> | null;
      employee_balances: Array<{
        employee_id: string;
        reimbursement_liability_halalah: string;
        reimbursement_liability_expected_halalah: string;
        reimbursement_liability_difference_halalah: string;
        advance_balance_halalah: string;
        advance_balance_expected_halalah: string;
        advance_balance_difference_halalah: string;
        difference_halalah: string;
      }> | null;
      fund_balances: Array<{
        fund_id: string;
        petty_cash_halalah: string;
        petty_cash_expected_halalah: string;
        difference_halalah: string;
      }> | null;
      service_balances: Array<{
        service_id: string;
        recognized_expense_asset_halalah: string;
        recognized_expense_asset_expected_halalah: string;
        reimbursement_liability_halalah: string;
        reimbursement_liability_expected_halalah: string;
        employee_advance_halalah: string;
        employee_advance_expected_halalah: string;
        petty_cash_halalah: string;
        petty_cash_expected_halalah: string;
        difference_halalah: string;
      }> | null;
      timing_difference_count: number;
      timing_differences: Array<{
        source_type: AccountingExpenseBridgeSourceType;
        source_record_id: string;
        source_business_date: string | null;
        accounting_date: string;
        days_difference: number;
        amount_halalah: string;
      }>;
      truncated: boolean;
      events: AccountingExpenseBridgeReconciliationEvent[];
    };

export type AccountingRevenueEvidenceBasis = "CUSTOMER_ACCEPTANCE" | "TRANSFER_OF_CONTROL" | "MEASURED_OUTPUT";
export type AccountingRevenueSatisfactionMethod = "POINT_IN_TIME" | "OVER_TIME";
export type AccountingRevenuePrincipalAgentBasis = "PRINCIPAL" | "AGENT";
export type AccountingRevenueUnitAllocation = { source_item_id: string; amount_halalah: string };
export type AccountingRevenuePerformanceUnitInput = {
  unit_key: string;
  promised_output: string;
  satisfaction_method: AccountingRevenueSatisfactionMethod;
  required_evidence_basis: AccountingRevenueEvidenceBasis;
  allocations: AccountingRevenueUnitAllocation[];
};
export type SaveAccountingRevenueArrangementInput = {
  service_id: string;
  abs_id: string;
  expected_version: number;
  units: AccountingRevenuePerformanceUnitInput[];
  principal_agent_basis: AccountingRevenuePrincipalAgentBasis;
  policy_version: string;
  modification_evidence_ref: string | null;
  modification_evidence_sha256: string | null;
  reason: string;
  request_id: string;
};
export type ReviewAccountingRevenueArrangementInput = {
  arrangement_id: string;
  arrangement_version: number;
  approve: boolean;
  reason: string;
  request_id: string;
};
export type SaveAccountingRevenuePerformanceEvidenceInput = {
  unit_id: string;
  evidence_key: string;
  expected_version: number;
  evidence_basis: AccountingRevenueEvidenceBasis;
  performance_from: string;
  performance_through: string;
  evidence_ref: string;
  evidence_sha256: string;
  recognized_to_date_halalah: string | null;
  correction_of_recognition_event_id: string | null;
  correction_amount_halalah: string | null;
  rationale: string;
  request_id: string;
};
export type ReviewAccountingRevenuePerformanceEvidenceInput = {
  evidence_id: string;
  evidence_version: number;
  approve: boolean;
  reason: string;
  request_id: string;
};
export type PrepareAccountingRevenueRecognitionInput = {
  evidence_id: string;
  evidence_version: number;
  period_id: string;
  period_version: number;
  posting_rule_id: string;
  rule_version: number;
  accounting_date: string;
  reason: string;
  request_id: string;
};
export type PostAccountingRevenueRecognitionJournalInput = {
  journal_id: string;
  expected_version: number;
  request_id: string;
};
export type AccountingRevenueReconciliationInput = {
  as_of_date: string;
  recorded_at_cutoff: string;
  limit: number;
};
export type AccountingRevenueReconciliationArrangement = {
  arrangement_id: string;
  service_id: string;
  customer_id: string;
  approved_billing_scope_id: string;
  version: number;
  status: "PREPARED" | "HELD";
  held_code: string | null;
  consideration_halalah: string;
  allocated_halalah: string;
  unallocated_halalah: string;
  recognized_to_date_halalah: string;
  remaining_unrecognized_halalah: string;
  supersedes_arrangement_id: string | null;
  stale_authority: boolean;
  service_customer_difference: boolean;
  source_snapshot_sha256: string;
  source_snapshot: Record<string, unknown>;
  units: AccountingRevenuePerformanceUnitInput[];
  arrangement_review: "APPROVED" | "HELD" | null;
  unit_count: number;
};
export type AccountingRevenueReconciliation =
  | { state: "NOT_INITIALIZED"; bank_reconciled: false }
  | {
      state: "READY" | "TRUNCATED";
      as_of_date: string;
      recorded_at_cutoff: string;
      bank_reconciled: false;
      authoritative_consideration_halalah: string;
      performance_unit_allocations_halalah: string;
      unallocated_consideration_halalah: string;
      recognized_to_date_halalah: string;
      remaining_unrecognized_consideration_halalah: string;
      revenue_posted_halalah: string;
      contract_asset_balance_halalah: string;
      contract_liability_balance_halalah: string;
      contract_balance_difference_count: number;
      arrangement_count: number;
      held_evidence_count: number;
      contract_balances: Array<{
        service_id: string;
        control: "CONTRACT_ASSET" | "CONTRACT_LIABILITY";
        subledger_halalah: string;
        ledger_halalah: string;
        difference_halalah: string;
      }>;
      recognition_event_count: number;
      recognition_events: Array<{
        recognition_event_id: string;
        arrangement_id: string;
        arrangement_version: number;
        unit_id: string;
        evidence_id: string;
        evidence_version: number;
        service_id: string;
        customer_id: string;
        accounting_date: string;
        performance_from: string;
        performance_through: string;
        signed_delta_halalah: string;
        correction_of_recognition_event_id: string | null;
        journal_id: string | null;
        journal_status: string;
        posted_at: string | null;
        source_snapshot_sha256: string;
      }>;
      held_evidence: Array<{
        evidence_id: string;
        unit_id: string;
        arrangement_id: string;
        evidence_version: number;
        status: "SUBMITTED" | "HELD";
        held_code: string | null;
        evidence_basis: AccountingRevenueEvidenceBasis;
        performance_from: string;
        performance_through: string;
        evidence_ref: string;
        created_at: string;
        review_decision: "APPROVED" | "HELD" | null;
      }>;
      superseded_or_stale_authority_count: number;
      service_customer_difference_count: number;
      credits_refunds_requiring_revenue_review_count: number;
      inception_covered_count: number;
      fi012_timing_difference_count: number;
      truncated: boolean;
      arrangements: AccountingRevenueReconciliationArrangement[];
    };
