export const ACCOUNTING_CAPABILITIES = [
  "accounting:view",
  "accounting:manage_profile",
  "accounting:manage_authority",
  "accounting:manage_chart",
  "accounting:manage_periods",
  "accounting:prepare_journal",
  "accounting:post_journal",
  "accounting:reverse_journal",
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

export type AccountingPeriodStatus = "OPEN";

export type AccountingPeriodInput = {
  start_date: string;
  end_date: string;
  status: AccountingPeriodStatus;
};

export type AccountingPeriodVersion = AccountingPeriodInput & {
  period_id: string;
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

export type AccountingVersionResult = {
  account_id?: string;
  period_id?: string;
  version: number;
};
