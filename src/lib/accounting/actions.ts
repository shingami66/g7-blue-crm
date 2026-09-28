"use server";

import { AuthDependencyError, ForbiddenError } from "@/lib/auth/errors";
import { requirePermission, requireUser } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
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
  setAccountingCapabilityInputSchema,
  updateAccountingProfileInputSchema,
} from "./schemas";
import type {
  AccountingActionErrorCode,
  AccountingActionResult,
  AccountingInceptionAcceptanceResult,
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
      p_expires_at: parsed.data.expires_at ?? null,
      p_expected_revision: parsed.data.expected_revision,
      p_reason: parsed.data.reason,
      p_evidence_ref: parsed.data.evidence_ref ?? null,
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
      p_evidence_ref: parsed.data.evidence_ref ?? null,
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
      p_account_id: parsed.data.account_id,
      p_expected_version: parsed.data.expected_version,
      p_account: parsed.data.account as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: parsed.data.evidence_ref ?? null,
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
      p_period_id: parsed.data.period_id,
      p_expected_version: parsed.data.expected_version,
      p_period: parsed.data.period as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: parsed.data.evidence_ref ?? null,
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
      p_posting_rule_id: parsed.data.posting_rule_id,
      p_expected_version: parsed.data.expected_version,
      p_rule: parsed.data.rule as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: parsed.data.evidence_ref ?? null,
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
      p_journal_id: parsed.data.journal_id,
      p_expected_version: parsed.data.expected_version,
      p_journal: parsed.data.journal as Json,
      p_reason: parsed.data.reason,
      p_evidence_ref: parsed.data.evidence_ref ?? null,
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
      p_evidence_ref: parsed.data.evidence_ref ?? null,
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
  capabilities: Array<"accounting:manage_inception" | "accounting:manage_ar_bridge" | "accounting:prepare_journal" | "accounting:post_journal" | "accounting:view">,
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
    p_actor_user_id: actor.id, p_package_id: parsed.data.package_id,
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
    p_accounting_date: parsed.data.accounting_date,
    p_evidence_ref: parsed.data.evidence_ref,
    p_evidence_sha256: parsed.data.evidence_sha256,
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
