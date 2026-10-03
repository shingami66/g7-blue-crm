"use server";

import { AuthDependencyError, ForbiddenError } from "@/lib/auth/errors";
import { requirePermission, requireUser } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { RpcArgument } from "@/lib/supabase/rpc-argument";
import { resolveAccountingCapability } from "./permissions";
import {
  saveAccountingAccountInputSchema,
  saveAccountingPeriodInputSchema,
  saveAccountingPostingRuleInputSchema,
  prepareAccountingJournalInputSchema,
  postAccountingJournalInputSchema,
  reverseAccountingJournalInputSchema,
  saveAccountingInceptionPackageInputSchema,
  reviewAccountingInceptionPackageInputSchema,
  prepareAccountingInceptionJournalInputSchema,
  postAccountingInceptionJournalInputSchema,
  acceptAccountingInceptionPackageInputSchema,
  accountingInceptionAcceptanceResultSchema,
  accountingInceptionJournalMutationResultSchema,
  accountingInceptionReviewResultSchema,
  saveAccountingArBridgeEventInputSchema,
  prepareAccountingArBridgeEventInputSchema,
  postAccountingArBridgeJournalInputSchema,
  accountingArBridgeEventMutationResultSchema,
  accountingArBridgeJournalMutationResultSchema,
  saveAccountingApBridgeEventInputSchema,
  prepareAccountingApBridgeEventInputSchema,
  postAccountingApBridgeJournalInputSchema,
  accountingApBridgeEventMutationResultSchema,
  accountingApBridgeJournalMutationResultSchema,
  saveAccountingExpenseBridgeEventInputSchema,
  prepareAccountingExpenseBridgeEventInputSchema,
  postAccountingExpenseBridgeJournalInputSchema,
  accountingExpenseBridgeEventMutationResultSchema,
  accountingExpenseBridgeJournalMutationResultSchema,
  saveAccountingRevenueArrangementInputSchema,
  reviewAccountingRevenueArrangementInputSchema,
  saveAccountingRevenuePerformanceEvidenceInputSchema,
  reviewAccountingRevenuePerformanceEvidenceInputSchema,
  prepareAccountingRevenueRecognitionInputSchema,
  postAccountingRevenueRecognitionJournalInputSchema,
  accountingRevenueArrangementMutationResultSchema,
  accountingRevenueReviewResultSchema,
  accountingRevenueEvidenceMutationResultSchema,
  accountingRevenueJournalMutationResultSchema,
  saveAccountingBankBindingInputSchema,
  reviewAccountingBankBindingInputSchema,
  saveAccountingBankStatementBatchInputSchema,
  saveAccountingBankStatementLineInputSchema,
  prepareAccountingBankReconciliationInputSchema,
  reviewAccountingBankReconciliationInputSchema,
  unmatchAccountingBankReconciliationInputSchema,
  accountingBankBindingMutationResultSchema,
  accountingBankBatchMutationResultSchema,
  accountingBankLineMutationResultSchema,
  accountingBankReconciliationMutationResultSchema,
  accountingBankReviewResultSchema,
  prepareAccountingPeriodCloseInputSchema,
  reviewAccountingPeriodCloseInputSchema,
  accountingPeriodClosePreparationResultSchema,
  accountingPeriodCloseReviewResultSchema,
  setAccountingCapabilityInputSchema,
  updateAccountingProfileInputSchema,
} from "./schemas";
import type {
  AccountingActionErrorCode,
  AccountingActionResult,
  AccountingInceptionAcceptanceResult,
  AccountingPeriodClosePreparation,
  AccountingPeriodCloseReview,
} from "./types";

const SAFE_ERROR_CODES = new Set([
  "invalid_input",
  "actor_inactive",
  "authority_denied",
  "user_not_found",
  "profile_not_initialized",
  "unknown_capability",
  "capability_disabled",
  "capability_not_grantable",
  "invalid_expiry",
  "revision_conflict",
  "request_payload_conflict",
  "profile_version_unavailable",
  "transition_required",
  "unsupported_profile_value",
  "profile_incomplete",
  "account_not_found",
  "period_not_found",
  "account_code_conflict",
  "parent_not_found",
  "parent_must_be_non_posting",
  "account_cycle",
  "account_has_children",
  "protected_account_invariant",
  "invalid_period_boundary",
  "period_overlap",
  "company_settings_mismatch",
  "profile_not_active",
  "posting_rule_not_found",
  "source_identity_immutable",
  "mapping_conflict",
  "mapping_invalid",
  "posting_rule_unavailable",
  "posting_rule_changed",
  "journal_not_found",
  "journal_not_draft",
  "journal_not_posted",
  "journal_unbalanced",
  "economic_effect_conflict",
  "period_not_open",
  "period_version_changed",
  "period_date_mismatch",
  "profile_version_changed",
  "account_not_posting",
  "service_dimension_invalid",
  "service_not_found",
  "already_reversed",
  "package_not_found",
  "duplicate_coverage",
  "unsupported_classification",
  "unsupported_source",
  "evidence_required",
  "unresolved_material_evidence",
  "incomplete_coverage",
  "review_required",
  "separation_required",
  "trial_balance_incomplete",
  "source_payload_conflict",
  "original_effect_missing",
  "cash_account_evidence_missing",
  "classification_evidence_missing",
  "revenue_correction_required",
  "unsupported_source_treatment",
  "vat_not_supported",
  "receipt_accrual_missing",
  "receipt_match_exceeds_accrual",
  "direct_residual_evidence_missing",
  "payable_balance_insufficient",
  "supplier_advance_balance_insufficient",
  "advance_authorization_exceeded",
  "source_not_eligible",
  "reimbursement_ceiling_exceeded",
  "cash_advance_effect_missing",
  "advance_balance_exceeded",
  "expense_settlement_exceeds_expense",
  "petty_cash_balance_insufficient",
  "ADVANCE_OFFSET_PROVENANCE_REQUIRED",
  "PETTY_CASH_RETURN_PROVENANCE_REQUIRED",
  "source_customer_missing",
  "review_exists",
  "independent_review_required",
  "stale_commercial_authority",
  "unsupported_evidence",
  "evidence_not_approved",
  "arrangement_not_approved",
  "point_in_time_evidence_incomplete",
  "negative_delta_requires_correction",
  "no_new_recognition_delta",
  "recognition_before_performance",
  "source_identity_immutable",
  "recognition_ceiling_exceeded",
  "revenue_correction_lineage_invalid",
  "revenue_correction_ceiling_exceeded",
  "revenue_correction_evidence_required",
  "bank_account_not_eligible",
  "bank_binding_conflict",
  "binding_version_unavailable",
  "binding_not_approved",
  "duplicate_statement_evidence",
  "statement_batch_not_found",
  "reconciliation_not_found",
  "reconciliation_not_approved",
  "mismatched_allocation_totals",
  "bank_coverage_exceeded",
  "unmatched_adjustment_required",
  "period_not_finalized",
  "period_not_closed",
  "earlier_period_open",
  "earlier_period_not_locked",
  "later_finalized_period_exists",
  "close_package_not_found",
  "close_package_stale",
  "close_evidence_incomplete",
  "year_end_result_treatment_pending",
  "review_exists",
  "period_transition_required",
]);

function safeCode(code: string | null | undefined) {
  return code && SAFE_ERROR_CODES.has(code)
    ? (code as AccountingActionErrorCode)
    : "dependency_failure";
}

function safeFailure(error: { code?: string } | null) {
  if (error?.code === "42501") return { ok: false as const, code: "authority_denied" as const };
  if (error?.code === "P0002") return { ok: false as const, code: "user_not_found" as const };
  if (error?.code === "40001") return { ok: false as const, code: "revision_conflict" as const };
  throw new AuthDependencyError("Accounting mutation dependency failed");
}

export async function setAccountingCapability(
  input: unknown,
): Promise<AccountingActionResult<{ capability_event_id: string; revision: number }>> {
  const actor = await requirePermission("accounting:manage_authority");
  const parsed = setAccountingCapabilityInputSchema.safeParse(input);
  if (!parsed.success || parsed.data.target_user_id === actor.id) {
    return { ok: false, code: "invalid_input" };
  }

  let result;
  try {
    result = await createAdminClient().rpc("set_accounting_capability", {
      p_actor_user_id: actor.id,
      p_target_user_id: parsed.data.target_user_id,
      p_capability: parsed.data.capability,
      p_effect: parsed.data.effect,
      p_expires_at: (parsed.data.expires_at ?? null) as RpcArgument<"set_accounting_capability", "p_expires_at">,
      p_expected_revision: parsed.data.expected_revision,
      p_reason: parsed.data.reason,
      p_evidence_ref: (parsed.data.evidence_ref ?? null) as RpcArgument<"set_accounting_capability", "p_evidence_ref">,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting mutation response was invalid");
  if (row.error_code) return { ok: false, code: safeCode(row.error_code) };
  if (!row.capability_event_id || row.revision == null) {
    throw new AuthDependencyError("Accounting mutation response was invalid");
  }
  return {
    ok: true,
    value: { capability_event_id: row.capability_event_id, revision: row.revision },
    idempotentReplay: row.idempotent_replay,
  };
}

export async function updateAccountingProfile(
  input: unknown,
): Promise<AccountingActionResult<{ profile_id: string; version: number }>> {
  const actor = await requirePermission("accounting:manage_profile");
  const parsed = updateAccountingProfileInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  let result;
  try {
    result = await createAdminClient().rpc("update_accounting_profile", {
      p_actor_user_id: actor.id,
      p_expected_version: parsed.data.expected_version,
      p_profile: parsed.data.profile as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: (parsed.data.evidence_ref ?? null) as RpcArgument<"update_accounting_profile", "p_evidence_ref">,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting mutation response was invalid");
  if (row.error_code) return { ok: false, code: safeCode(row.error_code) };
  if (!row.profile_id || row.version == null) {
    throw new AuthDependencyError("Accounting mutation response was invalid");
  }
  return {
    ok: true,
    value: { profile_id: row.profile_id, version: row.version },
    idempotentReplay: row.idempotent_replay,
  };
}

export async function saveAccountingAccount(
  input: unknown,
): Promise<AccountingActionResult<{ account_id: string; version: number }>> {
  const actor = await requirePermission("accounting:manage_chart");
  const parsed = saveAccountingAccountInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  let result;
  try {
    result = await createAdminClient().rpc("save_accounting_account", {
      p_actor_user_id: actor.id,
      p_account_id: parsed.data.account_id as RpcArgument<"save_accounting_account", "p_account_id">,
      p_expected_version: parsed.data.expected_version,
      p_account: parsed.data.account as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: (parsed.data.evidence_ref ?? null) as RpcArgument<"save_accounting_account", "p_evidence_ref">,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting mutation response was invalid");
  if (row.error_code) return { ok: false, code: safeCode(row.error_code) };
  if (!row.account_id || row.version == null) {
    throw new AuthDependencyError("Accounting mutation response was invalid");
  }
  return {
    ok: true,
    value: { account_id: row.account_id, version: row.version },
    idempotentReplay: row.idempotent_replay,
  };
}

export async function saveAccountingPeriod(
  input: unknown,
): Promise<AccountingActionResult<{ period_id: string; version: number }>> {
  const actor = await requirePermission("accounting:manage_periods");
  const parsed = saveAccountingPeriodInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  let result;
  try {
    result = await createAdminClient().rpc("save_accounting_period", {
      p_actor_user_id: actor.id,
      p_period_id: parsed.data.period_id as RpcArgument<"save_accounting_period", "p_period_id">,
      p_expected_version: parsed.data.expected_version,
      p_period: parsed.data.period as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: (parsed.data.evidence_ref ?? null) as RpcArgument<"save_accounting_period", "p_evidence_ref">,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting mutation response was invalid");
  if (row.error_code) return { ok: false, code: safeCode(row.error_code) };
  if (!row.period_id || row.version == null) {
    throw new AuthDependencyError("Accounting mutation response was invalid");
  }
  return {
    ok: true,
    value: { period_id: row.period_id, version: row.version },
    idempotentReplay: row.idempotent_replay,
  };
}

export async function prepareAccountingPeriodClose(
  input: unknown,
): Promise<AccountingActionResult<AccountingPeriodClosePreparation>> {
  const actor = await requireUser();
  const parsed = prepareAccountingPeriodCloseInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  await requireAccountingCapabilities(actor.id, [
    parsed.data.package_kind === "REOPEN" ? "accounting:reopen_period" : "accounting:close_period",
  ]);

  let result;
  try {
    result = await createAdminClient().rpc("prepare_accounting_period_close", {
      p_actor_user_id: actor.id,
      p_period_id: parsed.data.period_id,
      p_expected_period_version: parsed.data.expected_period_version,
      p_package_kind: parsed.data.package_kind,
      p_reason: parsed.data.reason,
      p_evidence_ref: parsed.data.evidence_ref,
      p_recorded_at_cutoff: parsed.data.recorded_at_cutoff,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting close preparation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  const parsedRow = accountingPeriodClosePreparationResultSchema.safeParse(row);
  if (!parsedRow.success) throw new AuthDependencyError("Accounting close preparation response was invalid");
  if (parsedRow.data.error_code) return { ok: false, code: safeCode(parsedRow.data.error_code) };
  if (!parsedRow.data.package_id || parsedRow.data.package_version == null
      || !parsedRow.data.package_state || !parsedRow.data.evidence_snapshot) {
    throw new AuthDependencyError("Accounting close preparation response was invalid");
  }
  return {
    ok: true,
    value: {
      package_id: parsedRow.data.package_id,
      package_version: parsedRow.data.package_version,
      package_state: parsedRow.data.package_state,
      evidence_snapshot: parsedRow.data.evidence_snapshot,
    },
    idempotentReplay: parsedRow.data.idempotent_replay,
  };
}

export async function reviewAccountingPeriodClose(
  input: unknown,
): Promise<AccountingActionResult<AccountingPeriodCloseReview>> {
  const actor = await requireUser();
  const parsed = reviewAccountingPeriodCloseInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };
  const [canClose, canReopen] = await Promise.all([
    resolveAccountingCapability(actor.id, "accounting:close_period"),
    resolveAccountingCapability(actor.id, "accounting:reopen_period"),
  ]);
  if (!canClose && !canReopen) throw new ForbiddenError("Accounting capability required");

  let result;
  try {
    result = await createAdminClient().rpc("review_accounting_period_close", {
      p_actor_user_id: actor.id,
      p_package_id: parsed.data.package_id,
      p_package_version: parsed.data.package_version,
      p_approve: parsed.data.approve,
      p_reason: parsed.data.reason,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting close review dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const parsedRow = accountingPeriodCloseReviewResultSchema.safeParse(result.data?.[0]);
  if (!parsedRow.success) throw new AuthDependencyError("Accounting close review response was invalid");
  if (parsedRow.data.error_code) return { ok: false, code: safeCode(parsedRow.data.error_code) };
  if (!parsedRow.data.package_id || parsedRow.data.package_version == null || !parsedRow.data.decision) {
    throw new AuthDependencyError("Accounting close review response was invalid");
  }
  return {
    ok: true,
    value: {
      package_id: parsedRow.data.package_id,
      package_version: parsedRow.data.package_version,
      decision: parsedRow.data.decision,
      resulting_period_version: parsedRow.data.resulting_period_version,
    },
    idempotentReplay: parsedRow.data.idempotent_replay,
  };
}

export async function saveAccountingPostingRule(
  input: unknown,
): Promise<AccountingActionResult<{ posting_rule_id: string; version: number }>> {
  const actor = await requirePermission("accounting:manage_chart");
  const parsed = saveAccountingPostingRuleInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  let result;
  try {
    result = await createAdminClient().rpc("save_accounting_posting_rule", {
      p_actor_user_id: actor.id,
      p_posting_rule_id: parsed.data.posting_rule_id as RpcArgument<"save_accounting_posting_rule", "p_posting_rule_id">,
      p_expected_version: parsed.data.expected_version,
      p_rule: parsed.data.rule as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: (parsed.data.evidence_ref ?? null) as RpcArgument<"save_accounting_posting_rule", "p_evidence_ref">,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting response was invalid");
  if (row.error_code) return { ok: false, code: safeCode(row.error_code) };
  if (!row.posting_rule_id || row.version == null) {
    throw new AuthDependencyError("Accounting response was invalid");
  }
  return {
    ok: true,
    value: { posting_rule_id: row.posting_rule_id, version: row.version },
    idempotentReplay: row.idempotent_replay,
  };
}

export async function prepareAccountingJournal(
  input: unknown,
): Promise<AccountingActionResult<{ journal_id: string; version: number; status: "DRAFT" | "POSTED" }>> {
  const actor = await requirePermission("accounting:prepare_journal");
  const parsed = prepareAccountingJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  let result;
  try {
    result = await createAdminClient().rpc("prepare_accounting_journal", {
      p_actor_user_id: actor.id,
      p_journal_id: parsed.data.journal_id as RpcArgument<"prepare_accounting_journal", "p_journal_id">,
      p_expected_version: parsed.data.expected_version,
      p_journal: parsed.data.journal as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: (parsed.data.evidence_ref ?? null) as RpcArgument<"prepare_accounting_journal", "p_evidence_ref">,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting response was invalid");
  if (row.error_code) return { ok: false, code: safeCode(row.error_code) };
  if (!row.journal_id || row.version == null || (row.status !== "DRAFT" && row.status !== "POSTED")) {
    throw new AuthDependencyError("Accounting response was invalid");
  }
  return {
    ok: true,
    value: { journal_id: row.journal_id, version: row.version, status: row.status },
    idempotentReplay: row.idempotent_replay,
  };
}

export async function postAccountingJournal(
  input: unknown,
): Promise<AccountingActionResult<{ journal_id: string; version: number; status: "POSTED" }>> {
  const actor = await requirePermission("accounting:post_journal");
  const parsed = postAccountingJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  let result;
  try {
    result = await createAdminClient().rpc("post_accounting_journal", {
      p_actor_user_id: actor.id,
      p_journal_id: parsed.data.journal_id,
      p_expected_version: parsed.data.expected_version,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting response was invalid");
  if (row.error_code) return { ok: false, code: safeCode(row.error_code) };
  if (!row.journal_id || row.version == null || row.status !== "POSTED") {
    throw new AuthDependencyError("Accounting response was invalid");
  }
  return {
    ok: true,
    value: { journal_id: row.journal_id, version: row.version, status: "POSTED" },
    idempotentReplay: row.idempotent_replay,
  };
}

export async function reverseAccountingJournal(
  input: unknown,
): Promise<AccountingActionResult<{ journal_id: string; version: number; original_journal_id: string }>> {
  const actor = await requirePermission("accounting:reverse_journal");
  const parsed = reverseAccountingJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, code: "invalid_input" };

  let result;
  try {
    result = await createAdminClient().rpc("reverse_accounting_journal", {
      p_actor_user_id: actor.id,
      p_original_journal_id: parsed.data.original_journal_id,
      p_period_id: parsed.data.period_id,
      p_accounting_date: parsed.data.accounting_date,
      p_reason: parsed.data.reason,
      p_evidence_ref: (parsed.data.evidence_ref ?? null) as RpcArgument<"reverse_accounting_journal", "p_evidence_ref">,
      p_request_id: parsed.data.request_id,
    });
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return safeFailure(result.error);
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting response was invalid");
  if (row.error_code) return { ok: false, code: safeCode(row.error_code) };
  if (!row.journal_id || row.version == null || !row.original_journal_id) {
    throw new AuthDependencyError("Accounting response was invalid");
  }
  return {
    ok: true,
    value: {
      journal_id: row.journal_id,
      version: row.version,
      original_journal_id: row.original_journal_id,
    },
    idempotentReplay: row.idempotent_replay,
  };
}

async function requireAccountingCapabilities(
  actorId: string,
  capabilities: Array<"accounting:manage_inception" | "accounting:manage_ar_bridge" | "accounting:manage_ap_bridge" | "accounting:manage_expense_bridge" | "accounting:manage_revenue_recognition" | "accounting:reconcile_bank" | "accounting:prepare_journal" | "accounting:post_journal" | "accounting:view" | "accounting:close_period" | "accounting:reopen_period">,
) {
  const allowed = await Promise.all(capabilities.map((capability) =>
    resolveAccountingCapability(actorId, capability)));
  if (allowed.some((value) => !value)) throw new ForbiddenError("Accounting capability required");
}

async function callInceptionRpc<T extends { error_code: string | null }>(
  call: () => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>,
): Promise<{ row: T } | { failure: Extract<AccountingActionResult<never>, { ok: false }> }> {
  let result: { data: T[] | null; error: { code?: string } | null };
  try {
    result = await call();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return { failure: safeFailure(result.error) as Extract<AccountingActionResult<never>, { ok: false }> };
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting response was invalid");
  return { row };
}

export async function saveAccountingInceptionPackage(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_inception"]);
  const parsed = saveAccountingInceptionPackageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callInceptionRpc(() => createAdminClient().rpc("save_accounting_inception_package", {
    p_actor_user_id: actor.id, p_package_id: parsed.data.package_id as RpcArgument<"save_accounting_inception_package", "p_package_id">,
    p_expected_version: parsed.data.expected_version, p_package: parsed.data.package as Json,
    p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = result.row;
  if (row.error_code) return { ok: false as const, code: safeCode(row.error_code) };
  if (!row.package_id || row.version == null) throw new AuthDependencyError("Accounting response was invalid");
  return { ok: true as const, value: { package_id: row.package_id, version: row.version }, idempotentReplay: row.idempotent_replay };
}

export async function reviewAccountingInceptionPackage(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_inception"]);
  const parsed = reviewAccountingInceptionPackageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callInceptionRpc(() => createAdminClient().rpc("review_accounting_inception_package", {
    p_actor_user_id: actor.id, p_package_id: parsed.data.package_id,
    p_package_version: parsed.data.package_version, p_approve: parsed.data.approve,
    p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const parsedRow = accountingInceptionReviewResultSchema.safeParse(result.row);
  if (!parsedRow.success) throw new AuthDependencyError("Accounting response was invalid");
  if (parsedRow.data.error_code) return { ok: false as const, code: safeCode(parsedRow.data.error_code) };
  if (!parsedRow.data.review_id || !parsedRow.data.decision) throw new AuthDependencyError("Accounting response was invalid");
  return { ok: true as const, value: { review_id: parsedRow.data.review_id, decision: parsedRow.data.decision }, idempotentReplay: parsedRow.data.idempotent_replay };
}

export async function prepareAccountingInceptionJournal(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_inception", "accounting:prepare_journal"]);
  const parsed = prepareAccountingInceptionJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callInceptionRpc(() => createAdminClient().rpc("prepare_accounting_inception_journal", {
    p_actor_user_id: actor.id, p_package_id: parsed.data.package_id,
    p_package_version: parsed.data.package_version, p_item_id: parsed.data.item_id,
    p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const parsedRow = accountingInceptionJournalMutationResultSchema.safeParse(result.row);
  if (!parsedRow.success) throw new AuthDependencyError("Accounting response was invalid");
  if (parsedRow.data.error_code) return { ok: false as const, code: safeCode(parsedRow.data.error_code) };
  if (!parsedRow.data.journal_id || parsedRow.data.version == null || !parsedRow.data.status) throw new AuthDependencyError("Accounting response was invalid");
  return { ok: true as const, value: { journal_id: parsedRow.data.journal_id, version: parsedRow.data.version, status: parsedRow.data.status }, idempotentReplay: parsedRow.data.idempotent_replay };
}

export async function postAccountingInceptionJournal(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_inception", "accounting:post_journal"]);
  const parsed = postAccountingInceptionJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callInceptionRpc(() => createAdminClient().rpc("post_accounting_inception_journal", {
    p_actor_user_id: actor.id, p_journal_id: parsed.data.journal_id,
    p_expected_version: parsed.data.expected_version, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const parsedRow = accountingInceptionJournalMutationResultSchema.safeParse(result.row);
  if (!parsedRow.success) throw new AuthDependencyError("Accounting response was invalid");
  if (parsedRow.data.error_code) return { ok: false as const, code: safeCode(parsedRow.data.error_code) };
  if (!parsedRow.data.journal_id || parsedRow.data.version == null || parsedRow.data.status !== "POSTED") throw new AuthDependencyError("Accounting response was invalid");
  return { ok: true as const, value: { journal_id: parsedRow.data.journal_id, version: parsedRow.data.version, status: "POSTED" as const }, idempotentReplay: parsedRow.data.idempotent_replay };
}

export async function acceptAccountingInceptionPackage(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_inception", "accounting:view"]);
  const parsed = acceptAccountingInceptionPackageInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callInceptionRpc(() => createAdminClient().rpc("accept_accounting_inception_package", {
    p_actor_user_id: actor.id, p_package_id: parsed.data.package_id,
    p_package_version: parsed.data.package_version, p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const parsedRow = accountingInceptionAcceptanceResultSchema.safeParse(result.row);
  if (!parsedRow.success) throw new AuthDependencyError("Accounting response was invalid");
  if (parsedRow.data.error_code) return { ok: false as const, code: safeCode(parsedRow.data.error_code) };
  if (!parsedRow.data.acceptance_id || !parsedRow.data.trial_balance) throw new AuthDependencyError("Accounting response was invalid");
  return {
    ok: true as const,
    value: { acceptance_id: parsedRow.data.acceptance_id, trial_balance: parsedRow.data.trial_balance } satisfies AccountingInceptionAcceptanceResult,
    idempotentReplay: parsedRow.data.idempotent_replay,
  };
}

async function callArBridgeRpc<T extends { error_code: string | null }>(
  call: () => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>,
): Promise<{ row: T } | { failure: Extract<AccountingActionResult<never>, { ok: false }> }> {
  let result: { data: T[] | null; error: { code?: string } | null };
  try {
    result = await call();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting mutation dependency failed");
  }
  if (result.error) return { failure: safeFailure(result.error) as Extract<AccountingActionResult<never>, { ok: false }> };
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting response was invalid");
  return { row };
}

export async function saveAccountingArBridgeEvent(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_ar_bridge"]);
  const parsed = saveAccountingArBridgeEventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("save_accounting_ar_bridge_event", {
    p_actor_user_id: actor.id,
    p_source_type: parsed.data.source_type,
    p_source_record_id: parsed.data.source_record_id,
    p_expected_version: parsed.data.expected_version,
    p_classification: parsed.data.classification,
    p_accounting_date: parsed.data.accounting_date as RpcArgument<"save_accounting_ar_bridge_event", "p_accounting_date">,
    p_evidence_ref: parsed.data.evidence_ref as RpcArgument<"save_accounting_ar_bridge_event", "p_evidence_ref">,
    p_evidence_sha256: parsed.data.evidence_sha256 as RpcArgument<"save_accounting_ar_bridge_event", "p_evidence_sha256">,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingArBridgeEventMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting AR bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.event_id || row.data.version == null || !row.data.status) {
    throw new AuthDependencyError("Accounting AR bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { event_id: row.data.event_id, version: row.data.version, status: row.data.status },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function prepareAccountingArBridgeEvent(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_ar_bridge"]);
  const parsed = prepareAccountingArBridgeEventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("prepare_accounting_ar_bridge_event", {
    p_actor_user_id: actor.id,
    p_event_id: parsed.data.event_id,
    p_event_version: parsed.data.event_version,
    p_period_id: parsed.data.period_id,
    p_period_version: parsed.data.period_version,
    p_posting_rule_id: parsed.data.posting_rule_id,
    p_rule_version: parsed.data.rule_version,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingArBridgeJournalMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting AR bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.journal_id || row.data.version == null || !row.data.status) {
    throw new AuthDependencyError("Accounting AR bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { journal_id: row.data.journal_id, version: row.data.version, status: row.data.status },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function postAccountingArBridgeJournal(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_ar_bridge"]);
  const parsed = postAccountingArBridgeJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("post_accounting_ar_bridge_journal", {
    p_actor_user_id: actor.id,
    p_journal_id: parsed.data.journal_id,
    p_expected_version: parsed.data.expected_version,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingArBridgeJournalMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting AR bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.journal_id || row.data.version == null || row.data.status !== "POSTED") {
    throw new AuthDependencyError("Accounting AR bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { journal_id: row.data.journal_id, version: row.data.version, status: "POSTED" as const },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function saveAccountingApBridgeEvent(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_ap_bridge"]);
  const parsed = saveAccountingApBridgeEventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("save_accounting_ap_bridge_event", {
    p_actor_user_id: actor.id,
    p_source_type: parsed.data.source_type,
    p_source_record_id: parsed.data.source_record_id,
    p_expected_version: parsed.data.expected_version,
    p_classification: parsed.data.classification,
    // Keep PostgreSQL bigint amounts as decimal strings; JS numbers can round halalah values.
    p_amount_halalah: parsed.data.amount_halalah as unknown as RpcArgument<"save_accounting_ap_bridge_event", "p_amount_halalah">,
    p_matched_receipt_halalah: parsed.data.matched_receipt_halalah as unknown as RpcArgument<"save_accounting_ap_bridge_event", "p_matched_receipt_halalah">,
    p_direct_classification: parsed.data.direct_classification as RpcArgument<"save_accounting_ap_bridge_event", "p_direct_classification">,
    p_accounting_date: parsed.data.accounting_date,
    p_evidence_ref: parsed.data.evidence_ref as RpcArgument<"save_accounting_ap_bridge_event", "p_evidence_ref">,
    p_evidence_sha256: parsed.data.evidence_sha256 as RpcArgument<"save_accounting_ap_bridge_event", "p_evidence_sha256">,
    p_cash_binding_evidence_ref: parsed.data.cash_binding_evidence_ref as RpcArgument<"save_accounting_ap_bridge_event", "p_cash_binding_evidence_ref">,
    p_cash_binding_evidence_sha256: parsed.data.cash_binding_evidence_sha256 as RpcArgument<"save_accounting_ap_bridge_event", "p_cash_binding_evidence_sha256">,
    p_cash_account_id: parsed.data.cash_account_id as RpcArgument<"save_accounting_ap_bridge_event", "p_cash_account_id">,
    p_cash_account_version: parsed.data.cash_account_version as RpcArgument<"save_accounting_ap_bridge_event", "p_cash_account_version">,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingApBridgeEventMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting AP bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.event_id || row.data.version == null || !row.data.status) {
    throw new AuthDependencyError("Accounting AP bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { event_id: row.data.event_id, version: row.data.version, status: row.data.status },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function prepareAccountingApBridgeEvent(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_ap_bridge"]);
  const parsed = prepareAccountingApBridgeEventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("prepare_accounting_ap_bridge_event", {
    p_actor_user_id: actor.id,
    p_event_id: parsed.data.event_id,
    p_event_version: parsed.data.event_version,
    p_period_id: parsed.data.period_id,
    p_period_version: parsed.data.period_version,
    p_posting_rule_id: parsed.data.posting_rule_id,
    p_rule_version: parsed.data.rule_version,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingApBridgeJournalMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting AP bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.journal_id || row.data.version == null || !row.data.status) {
    throw new AuthDependencyError("Accounting AP bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { journal_id: row.data.journal_id, version: row.data.version, status: row.data.status },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function postAccountingApBridgeJournal(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_ap_bridge"]);
  const parsed = postAccountingApBridgeJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("post_accounting_ap_bridge_journal", {
    p_actor_user_id: actor.id,
    p_journal_id: parsed.data.journal_id,
    p_expected_version: parsed.data.expected_version,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingApBridgeJournalMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting AP bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.journal_id || row.data.version == null || row.data.status !== "POSTED") {
    throw new AuthDependencyError("Accounting AP bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { journal_id: row.data.journal_id, version: row.data.version, status: "POSTED" as const },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function saveAccountingExpenseBridgeEvent(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_expense_bridge"]);
  const parsed = saveAccountingExpenseBridgeEventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const { source_type, source_record_id, expected_version, reason, request_id, ...contract } = parsed.data;
  const result = await callArBridgeRpc(() => createAdminClient().rpc("save_accounting_expense_bridge_event", {
    p_actor: actor.id,
    p_type: source_type,
    p_source_id: source_record_id,
    p_expected: expected_version,
    p_contract: contract as Json,
    p_reason: reason,
    p_request: request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingExpenseBridgeEventMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting expense bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.event_id || row.data.version == null || !row.data.status) {
    throw new AuthDependencyError("Accounting expense bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { event_id: row.data.event_id, version: row.data.version, status: row.data.status },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function prepareAccountingExpenseBridgeEvent(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_expense_bridge"]);
  const parsed = prepareAccountingExpenseBridgeEventInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("prepare_accounting_expense_bridge_event", {
    p_actor: actor.id,
    p_event_id: parsed.data.event_id,
    p_event_version: parsed.data.event_version,
    p_period: parsed.data.period_id,
    p_period_version: parsed.data.period_version,
    p_rule: parsed.data.posting_rule_id,
    p_rule_version: parsed.data.rule_version,
    p_reason: parsed.data.reason,
    p_request: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingExpenseBridgeJournalMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting expense bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.journal_id || row.data.version == null || !row.data.status) {
    throw new AuthDependencyError("Accounting expense bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { journal_id: row.data.journal_id, version: row.data.version, status: row.data.status },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function postAccountingExpenseBridgeJournal(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_expense_bridge"]);
  const parsed = postAccountingExpenseBridgeJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("post_accounting_expense_bridge_journal", {
    p_actor: actor.id,
    p_journal: parsed.data.journal_id,
    p_expected: parsed.data.expected_version,
    p_request: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingExpenseBridgeJournalMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting expense bridge response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.journal_id || row.data.version == null || row.data.status !== "POSTED") {
    throw new AuthDependencyError("Accounting expense bridge response was invalid");
  }
  return {
    ok: true as const,
    value: { journal_id: row.data.journal_id, version: row.data.version, status: "POSTED" as const },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function saveAccountingRevenueArrangement(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_revenue_recognition"]);
  const parsed = saveAccountingRevenueArrangementInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("save_accounting_revenue_arrangement", {
    p_actor: actor.id,
    p_service_id: parsed.data.service_id,
    p_abs_id: parsed.data.abs_id,
    p_expected_version: parsed.data.expected_version,
    p_units: parsed.data.units as Json,
    p_principal_agent_basis: parsed.data.principal_agent_basis,
    p_policy_version: parsed.data.policy_version,
    p_modification_evidence_ref: parsed.data.modification_evidence_ref as RpcArgument<"save_accounting_revenue_arrangement", "p_modification_evidence_ref">,
    p_modification_evidence_sha256: parsed.data.modification_evidence_sha256 as RpcArgument<"save_accounting_revenue_arrangement", "p_modification_evidence_sha256">,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingRevenueArrangementMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting revenue arrangement response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.arrangement_id || row.data.version == null || !row.data.status || row.data.consideration_halalah === null) {
    throw new AuthDependencyError("Accounting revenue arrangement response was invalid");
  }
  return {
    ok: true as const,
    value: {
      arrangement_id: row.data.arrangement_id,
      version: row.data.version,
      status: row.data.status,
      held_code: row.data.held_code,
      consideration_halalah: row.data.consideration_halalah,
    },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function reviewAccountingRevenueArrangement(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_revenue_recognition"]);
  const parsed = reviewAccountingRevenueArrangementInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("review_accounting_revenue_arrangement", {
    p_actor: actor.id,
    p_arrangement_id: parsed.data.arrangement_id,
    p_arrangement_version: parsed.data.arrangement_version,
    p_approve: parsed.data.approve,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingRevenueReviewResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting revenue review response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.review_id || !row.data.decision) throw new AuthDependencyError("Accounting revenue review response was invalid");
  return {
    ok: true as const,
    value: { review_id: row.data.review_id, decision: row.data.decision },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function saveAccountingRevenuePerformanceEvidence(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_revenue_recognition"]);
  const parsed = saveAccountingRevenuePerformanceEvidenceInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("save_accounting_revenue_performance_evidence", {
    p_actor: actor.id,
    p_unit_id: parsed.data.unit_id,
    p_evidence_key: parsed.data.evidence_key,
    p_expected_version: parsed.data.expected_version,
    p_evidence_basis: parsed.data.evidence_basis,
    p_performance_from: parsed.data.performance_from,
    p_performance_through: parsed.data.performance_through,
    p_evidence_ref: parsed.data.evidence_ref,
    p_evidence_sha256: parsed.data.evidence_sha256,
    p_recognized_to_date_halalah: parsed.data.recognized_to_date_halalah as RpcArgument<"save_accounting_revenue_performance_evidence", "p_recognized_to_date_halalah">,
    p_correction_of_recognition_event_id: parsed.data.correction_of_recognition_event_id as RpcArgument<"save_accounting_revenue_performance_evidence", "p_correction_of_recognition_event_id">,
    p_correction_amount_halalah: parsed.data.correction_amount_halalah as RpcArgument<"save_accounting_revenue_performance_evidence", "p_correction_amount_halalah">,
    p_rationale: parsed.data.rationale,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingRevenueEvidenceMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting revenue evidence response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.evidence_id || row.data.version == null || !row.data.status) {
    throw new AuthDependencyError("Accounting revenue evidence response was invalid");
  }
  return {
    ok: true as const,
    value: { evidence_id: row.data.evidence_id, version: row.data.version, status: row.data.status, held_code: row.data.held_code },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function reviewAccountingRevenuePerformanceEvidence(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_revenue_recognition"]);
  const parsed = reviewAccountingRevenuePerformanceEvidenceInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("review_accounting_revenue_performance_evidence", {
    p_actor: actor.id,
    p_evidence_id: parsed.data.evidence_id,
    p_evidence_version: parsed.data.evidence_version,
    p_approve: parsed.data.approve,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingRevenueReviewResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting revenue evidence review response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.review_id || !row.data.decision) throw new AuthDependencyError("Accounting revenue evidence review response was invalid");
  return {
    ok: true as const,
    value: { review_id: row.data.review_id, decision: row.data.decision },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function prepareAccountingRevenueRecognition(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_revenue_recognition"]);
  const parsed = prepareAccountingRevenueRecognitionInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("prepare_accounting_revenue_recognition", {
    p_actor: actor.id,
    p_evidence_id: parsed.data.evidence_id,
    p_evidence_version: parsed.data.evidence_version,
    p_period_id: parsed.data.period_id,
    p_period_version: parsed.data.period_version,
    p_posting_rule_id: parsed.data.posting_rule_id,
    p_rule_version: parsed.data.rule_version,
    p_accounting_date: parsed.data.accounting_date,
    p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingRevenueJournalMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting revenue journal response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.journal_id || row.data.version == null || !row.data.status) {
    throw new AuthDependencyError("Accounting revenue journal response was invalid");
  }
  return {
    ok: true as const,
    value: { journal_id: row.data.journal_id, version: row.data.version, status: row.data.status },
    idempotentReplay: row.data.idempotent_replay,
  };
}

export async function postAccountingRevenueRecognitionJournal(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:manage_revenue_recognition"]);
  const parsed = postAccountingRevenueRecognitionJournalInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callArBridgeRpc(() => createAdminClient().rpc("post_accounting_revenue_recognition_journal", {
    p_actor: actor.id,
    p_journal_id: parsed.data.journal_id,
    p_expected_version: parsed.data.expected_version,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingRevenueJournalMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting revenue journal response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.journal_id || row.data.version == null || row.data.status !== "POSTED") {
    throw new AuthDependencyError("Accounting revenue journal response was invalid");
  }
  return {
    ok: true as const,
    value: { journal_id: row.data.journal_id, version: row.data.version, status: "POSTED" as const },
    idempotentReplay: row.data.idempotent_replay,
  };
}

async function callBankRpc<T extends { error_code: string | null }>(
  call: () => PromiseLike<{ data: T[] | null; error: { code?: string } | null }>,
): Promise<{ row: T } | { failure: Extract<AccountingActionResult<never>, { ok: false }> }> {
  let result: { data: T[] | null; error: { code?: string } | null };
  try {
    result = await call();
  } catch (error) {
    if (error instanceof ForbiddenError || error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting bank reconciliation dependency failed");
  }
  if (result.error) return { failure: safeFailure(result.error) as Extract<AccountingActionResult<never>, { ok: false }> };
  const row = result.data?.[0];
  if (!row) throw new AuthDependencyError("Accounting bank reconciliation response was invalid");
  return { row };
}

export async function saveAccountingBankBinding(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:reconcile_bank"]);
  const parsed = saveAccountingBankBindingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callBankRpc(() => createAdminClient().rpc("save_accounting_bank_binding", {
    p_actor_user_id: actor.id, p_binding_id: (parsed.data.binding_id ?? null) as RpcArgument<"save_accounting_bank_binding", "p_binding_id">,
    p_expected_version: parsed.data.expected_version, p_account_id: parsed.data.account_id,
    p_account_version: parsed.data.account_version, p_bank_identity_ref: parsed.data.bank_identity_ref,
    p_bank_identity_sha256: parsed.data.bank_identity_sha256, p_effective_from: parsed.data.effective_from,
    p_effective_through: parsed.data.effective_through as RpcArgument<"save_accounting_bank_binding", "p_effective_through">, p_masked_display_identity: parsed.data.masked_display_identity,
    p_evidence_ref: parsed.data.evidence_ref, p_evidence_sha256: parsed.data.evidence_sha256,
    p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingBankBindingMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting bank binding response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.binding_id || row.data.version == null || !row.data.status) throw new AuthDependencyError("Accounting bank binding response was invalid");
  return { ok: true as const, value: { binding_id: row.data.binding_id, version: row.data.version, status: row.data.status }, idempotentReplay: row.data.idempotent_replay };
}

export async function reviewAccountingBankBinding(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:reconcile_bank"]);
  const parsed = reviewAccountingBankBindingInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callBankRpc(() => createAdminClient().rpc("review_accounting_bank_binding", {
    p_actor_user_id: actor.id, p_binding_id: parsed.data.binding_id, p_binding_version: parsed.data.binding_version,
    p_approve: parsed.data.approve, p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingBankBindingMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting bank binding review response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.binding_id || row.data.version == null || !row.data.status) throw new AuthDependencyError("Accounting bank binding review response was invalid");
  return { ok: true as const, value: { binding_id: row.data.binding_id, version: row.data.version, status: row.data.status }, idempotentReplay: row.data.idempotent_replay };
}

export async function saveAccountingBankStatementBatch(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:reconcile_bank"]);
  const parsed = saveAccountingBankStatementBatchInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callBankRpc(() => createAdminClient().rpc("save_accounting_bank_statement_batch", {
    p_actor_user_id: actor.id, p_batch_id: (parsed.data.batch_id ?? null) as RpcArgument<"save_accounting_bank_statement_batch", "p_batch_id">, p_expected_version: parsed.data.expected_version,
    p_binding_id: parsed.data.binding_id, p_binding_version: parsed.data.binding_version,
    p_source_document_ref: parsed.data.source_document_ref, p_evidence_sha256: parsed.data.evidence_sha256,
    p_evidence_identity: parsed.data.evidence_identity, p_coverage_start: parsed.data.coverage_start,
    p_coverage_end: parsed.data.coverage_end, p_opening_balance_halalah: parsed.data.opening_balance_halalah,
    p_closing_balance_halalah: parsed.data.closing_balance_halalah, p_reason: parsed.data.reason,
    p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingBankBatchMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting bank statement batch response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.batch_id || row.data.version == null || !row.data.status) throw new AuthDependencyError("Accounting bank statement batch response was invalid");
  return { ok: true as const, value: { batch_id: row.data.batch_id, version: row.data.version, status: row.data.status }, idempotentReplay: row.data.idempotent_replay };
}

export async function saveAccountingBankStatementLine(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:reconcile_bank"]);
  const parsed = saveAccountingBankStatementLineInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callBankRpc(() => createAdminClient().rpc("save_accounting_bank_statement_line", {
    p_actor_user_id: actor.id, p_line_id: (parsed.data.line_id ?? null) as RpcArgument<"save_accounting_bank_statement_line", "p_line_id">, p_expected_version: parsed.data.expected_version,
    p_batch_id: parsed.data.batch_id, p_batch_version: parsed.data.batch_version,
    p_stable_line_identity: parsed.data.stable_line_identity, p_transaction_date: parsed.data.transaction_date,
    p_value_date: parsed.data.value_date as RpcArgument<"save_accounting_bank_statement_line", "p_value_date">, p_signed_amount_halalah: parsed.data.signed_amount_halalah,
    p_reference: parsed.data.reference as RpcArgument<"save_accounting_bank_statement_line", "p_reference">, p_description: parsed.data.description as RpcArgument<"save_accounting_bank_statement_line", "p_description">,
    p_source_row_identity: parsed.data.source_row_identity, p_duplicate_fingerprint: parsed.data.duplicate_fingerprint,
    p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingBankLineMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting bank statement line response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.line_id || row.data.version == null || row.data.status !== "RECORDED") throw new AuthDependencyError("Accounting bank statement line response was invalid");
  return { ok: true as const, value: { line_id: row.data.line_id, version: row.data.version, duplicate_candidate: row.data.duplicate_candidate }, idempotentReplay: row.data.idempotent_replay };
}

export async function prepareAccountingBankReconciliation(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:reconcile_bank"]);
  const parsed = prepareAccountingBankReconciliationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callBankRpc(() => createAdminClient().rpc("prepare_accounting_bank_reconciliation", {
    p_actor_user_id: actor.id, p_group_id: (parsed.data.group_id ?? null) as RpcArgument<"prepare_accounting_bank_reconciliation", "p_group_id">, p_expected_version: parsed.data.expected_version,
    p_binding_id: parsed.data.binding_id, p_binding_version: parsed.data.binding_version,
    p_as_of_date: parsed.data.as_of_date, p_recorded_at_cutoff: parsed.data.recorded_at_cutoff,
    p_allocations: parsed.data.allocations as unknown as Json, p_rationale: parsed.data.rationale,
    p_evidence_ref: parsed.data.evidence_ref as RpcArgument<"prepare_accounting_bank_reconciliation", "p_evidence_ref">, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingBankReconciliationMutationResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting bank reconciliation response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.group_id || row.data.version == null || row.data.status !== "PREPARED") throw new AuthDependencyError("Accounting bank reconciliation response was invalid");
  return { ok: true as const, value: { group_id: row.data.group_id, version: row.data.version, status: row.data.status }, idempotentReplay: row.data.idempotent_replay };
}

export async function reviewAccountingBankReconciliation(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:reconcile_bank"]);
  const parsed = reviewAccountingBankReconciliationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callBankRpc(() => createAdminClient().rpc("review_accounting_bank_reconciliation", {
    p_actor_user_id: actor.id, p_group_id: parsed.data.group_id, p_group_version: parsed.data.group_version,
    p_approve: parsed.data.approve, p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingBankReviewResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting bank reconciliation review response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.group_id || row.data.group_version == null || !row.data.decision) throw new AuthDependencyError("Accounting bank reconciliation review response was invalid");
  return { ok: true as const, value: { group_id: row.data.group_id, group_version: row.data.group_version, decision: row.data.decision }, idempotentReplay: row.data.idempotent_replay };
}

export async function unmatchAccountingBankReconciliation(input: unknown) {
  const actor = await requireUser();
  await requireAccountingCapabilities(actor.id, ["accounting:reconcile_bank"]);
  const parsed = unmatchAccountingBankReconciliationInputSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, code: "invalid_input" as const };
  const result = await callBankRpc(() => createAdminClient().rpc("unmatch_accounting_bank_reconciliation", {
    p_actor_user_id: actor.id, p_group_id: parsed.data.group_id, p_group_version: parsed.data.group_version,
    p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
  }));
  if ("failure" in result) return result.failure;
  const row = accountingBankReviewResultSchema.safeParse(result.row);
  if (!row.success) throw new AuthDependencyError("Accounting bank reconciliation unmatch response was invalid");
  if (row.data.error_code) return { ok: false as const, code: safeCode(row.data.error_code) };
  if (!row.data.group_id || row.data.group_version == null || row.data.decision !== "UNMATCHED") throw new AuthDependencyError("Accounting bank reconciliation unmatch response was invalid");
  return { ok: true as const, value: { group_id: row.data.group_id, group_version: row.data.group_version, decision: row.data.decision }, idempotentReplay: row.data.idempotent_replay };
}
