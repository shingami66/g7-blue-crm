import "server-only";

import { z } from "zod";
import { ForbiddenError, AuthDependencyError } from "@/lib/auth/errors";
import { requirePermission, requireUser } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  accountingAccountVersionSchema,
  accountingCapabilityAssignmentSchema,
  accountingGeneralLedgerInputSchema,
  accountingGeneralLedgerResultSchema,
  accountingJournalDetailSchema,
  accountingJournalIdSchema,
  accountingPeriodVersionSchema,
  accountingPostingRuleVersionSchema,
  accountingProfileResultSchema,
  accountingTrialBalanceInputSchema,
  accountingTrialBalanceResultSchema,
  accountingInceptionPackageDetailSchema,
  accountingInceptionPackageSummarySchema,
  accountingArBridgeReconciliationInputSchema,
  accountingArBridgeReconciliationSchema,
  accountingApBridgeReconciliationInputSchema,
  accountingApBridgeReconciliationSchema,
  listAccountingCapabilityAssignmentsInputSchema,
} from "./schemas";
import { resolveAccountingCapability } from "./permissions";
import type {
  AccountingAccountVersion,
  AccountingCapabilityAssignment,
  AccountingJournalDetail,
  AccountingPeriodVersion,
  AccountingPostingRuleVersion,
  AccountingInceptionPackageDetail,
  AccountingInceptionPackageSummary,
  AccountingArBridgeReconciliation,
  AccountingApBridgeReconciliation,
} from "./types";

function throwSafeRpcError(error: { code?: string } | null): never {
  if (error?.code === "42501") {
    throw new ForbiddenError("Accounting capability required");
  }
  if (error?.code === "P0002") {
    throw new Error("Accounting target user was not found");
  }
  throw new AuthDependencyError("Accounting query dependency failed");
}

export async function getAccountingProfile() {
  const actor = await requireUser();
  const canView = await resolveAccountingCapability(actor.id, "accounting:view");
  const canManageProfile = canView
    ? false
    : await resolveAccountingCapability(actor.id, "accounting:manage_profile");
  if (!canView && !canManageProfile) {
    throw new ForbiddenError("Accounting capability required");
  }

  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_profile", {
      p_actor_user_id: actor.id,
    });
  } catch {
    throw new AuthDependencyError("Accounting profile dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingProfileResultSchema.safeParse(result.data);
  if (!parsed.success) {
    throw new AuthDependencyError("Accounting profile response was invalid");
  }
  return parsed.data;
}

export async function listAccountingCapabilityAssignments(input: unknown) {
  const actor = await requirePermission("accounting:manage_authority");
  const parsedInput = listAccountingCapabilityAssignmentsInputSchema.safeParse(input);
  if (!parsedInput.success) {
    throw new ForbiddenError("A valid accounting target user is required");
  }

  let result;
  try {
    result = await createAdminClient().rpc("list_accounting_capability_assignments", {
      p_actor_user_id: actor.id,
      p_target_user_id: parsedInput.data.target_user_id,
    });
  } catch {
    throw new AuthDependencyError("Accounting assignments dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  if (!Array.isArray(result.data)) {
    throw new AuthDependencyError("Accounting assignments response was invalid");
  }
  const assignments: AccountingCapabilityAssignment[] = [];
  for (const row of result.data) {
    const parsedRow = accountingCapabilityAssignmentSchema.safeParse(row);
    if (!parsedRow.success) {
      throw new AuthDependencyError("Accounting assignments response was invalid");
    }
    assignments.push(parsedRow.data);
  }
  return assignments;
}


async function requireAccountingReadCapability(actorId: string, managerCapability: "accounting:manage_chart" | "accounting:manage_periods") {
  const canView = await resolveAccountingCapability(actorId, "accounting:view");
  const canManage = canView ? false : await resolveAccountingCapability(actorId, managerCapability);
  if (!canView && !canManage) {
    throw new ForbiddenError("Accounting capability required");
  }
}

export async function listAccountingAccounts(): Promise<AccountingAccountVersion[]> {
  const actor = await requireUser();
  await requireAccountingReadCapability(actor.id, "accounting:manage_chart");

  let result;
  try {
    result = await createAdminClient().rpc("list_accounting_accounts", {
      p_actor_user_id: actor.id,
    });
  } catch {
    throw new AuthDependencyError("Accounting chart dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  if (!Array.isArray(result.data)) {
    throw new AuthDependencyError("Accounting chart response was invalid");
  }
  const versions: AccountingAccountVersion[] = [];
  for (const row of result.data) {
    const parsed = accountingAccountVersionSchema.safeParse(row);
    if (!parsed.success) {
      throw new AuthDependencyError("Accounting chart response was invalid");
    }
    versions.push(parsed.data);
  }
  return versions;
}

export async function listAccountingPeriods(): Promise<AccountingPeriodVersion[]> {
  const actor = await requireUser();
  await requireAccountingReadCapability(actor.id, "accounting:manage_periods");

  let result;
  try {
    result = await createAdminClient().rpc("list_accounting_periods", {
      p_actor_user_id: actor.id,
    });
  } catch {
    throw new AuthDependencyError("Accounting periods dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  if (!Array.isArray(result.data)) {
    throw new AuthDependencyError("Accounting periods response was invalid");
  }
  const versions: AccountingPeriodVersion[] = [];
  for (const row of result.data) {
    const parsed = accountingPeriodVersionSchema.safeParse(row);
    if (!parsed.success) {
      throw new AuthDependencyError("Accounting periods response was invalid");
    }
    versions.push(parsed.data);
  }
  return versions;
}

export async function listAccountingPostingRules(): Promise<AccountingPostingRuleVersion[]> {
  const actor = await requireUser();
  await requireAccountingReadCapability(actor.id, "accounting:manage_chart");

  let result;
  try {
    result = await createAdminClient().rpc("list_accounting_posting_rules", {
      p_actor_user_id: actor.id,
    });
  } catch {
    throw new AuthDependencyError("Accounting posting rules dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  if (!Array.isArray(result.data)) {
    throw new AuthDependencyError("Accounting posting rules response was invalid");
  }
  const versions: AccountingPostingRuleVersion[] = [];
  for (const row of result.data) {
    const parsed = accountingPostingRuleVersionSchema.safeParse(row);
    if (!parsed.success) {
      throw new AuthDependencyError("Accounting posting rules response was invalid");
    }
    versions.push(parsed.data);
  }
  return versions;
}

export async function getAccountingJournal(journalId: string): Promise<AccountingJournalDetail | null> {
  const actor = await requirePermission("accounting:view");
  const parsedId = accountingJournalIdSchema.safeParse(journalId);
  if (!parsedId.success) throw new AuthDependencyError("Accounting journal request was invalid");

  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_journal", {
      p_actor_user_id: actor.id,
      p_journal_id: parsedId.data,
    });
  } catch {
    throw new AuthDependencyError("Accounting journal dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  if (result.data === null) return null;
  const parsed = accountingJournalDetailSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting journal response was invalid");
  return parsed.data;
}

export async function getAccountingGeneralLedger(input: unknown) {
  const actor = await requirePermission("accounting:view");
  const parsedInput = accountingGeneralLedgerInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting ledger request was invalid");

  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_general_ledger", {
      p_actor_user_id: actor.id,
      p_from_date: parsedInput.data.from_date,
      p_through_date: parsedInput.data.through_date,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff,
      p_account_id: parsedInput.data.account_id,
      p_service_id: parsedInput.data.service_id,
      p_offset: parsedInput.data.offset,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting ledger dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  if (!Array.isArray(result.data) || result.data.length !== 1) {
    throw new AuthDependencyError("Accounting ledger response was invalid");
  }
  const parsed = accountingGeneralLedgerResultSchema.safeParse(result.data[0]);
  if (!parsed.success) throw new AuthDependencyError("Accounting ledger response was invalid");
  return parsed.data;
}

export async function getAccountingTrialBalance(input: unknown) {
  const actor = await requirePermission("accounting:view");
  const parsedInput = accountingTrialBalanceInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting Trial Balance request was invalid");

  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_trial_balance", {
      p_actor_user_id: actor.id,
      p_as_of_date: parsedInput.data.as_of_date,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff,
      p_service_id: parsedInput.data.service_id,
      p_offset: parsedInput.data.offset,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting Trial Balance dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  if (!Array.isArray(result.data) || result.data.length !== 1) {
    throw new AuthDependencyError("Accounting Trial Balance response was invalid");
  }
  const parsed = accountingTrialBalanceResultSchema.safeParse(result.data[0]);
  if (!parsed.success) throw new AuthDependencyError("Accounting Trial Balance response was invalid");
  return parsed.data;
}

async function requireInceptionReadCapability(actorId: string) {
  const [canView, canManage] = await Promise.all([
    resolveAccountingCapability(actorId, "accounting:view"),
    resolveAccountingCapability(actorId, "accounting:manage_inception"),
  ]);
  if (!canView && !canManage) throw new ForbiddenError("Accounting capability required");
}

export async function getAccountingInceptionPackage(
  packageId: unknown,
): Promise<AccountingInceptionPackageDetail | null> {
  const actor = await requireUser();
  await requireInceptionReadCapability(actor.id);
  const parsedId = accountingJournalIdSchema.safeParse(packageId);
  if (!parsedId.success) throw new AuthDependencyError("Accounting inception package id was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_inception_package", {
      p_actor_user_id: actor.id,
      p_package_id: parsedId.data,
    });
  } catch {
    throw new AuthDependencyError("Accounting inception query dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  if (result.data === null) return null;
  const parsed = accountingInceptionPackageDetailSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting inception package response was invalid");
  return parsed.data;
}

export async function listAccountingInceptionPackages(): Promise<AccountingInceptionPackageSummary[]> {
  const actor = await requireUser();
  await requireInceptionReadCapability(actor.id);
  let result;
  try {
    result = await createAdminClient().rpc("list_accounting_inception_packages", {
      p_actor_user_id: actor.id,
    });
  } catch {
    throw new AuthDependencyError("Accounting inception query dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = z.array(accountingInceptionPackageSummarySchema).safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting inception package list was invalid");
  return parsed.data;
}

export async function getAccountingArBridgeReconciliation(
  input: unknown,
): Promise<AccountingArBridgeReconciliation> {
  const actor = await requireUser();
  const [canView, canManage] = await Promise.all([
    resolveAccountingCapability(actor.id, "accounting:view"),
    resolveAccountingCapability(actor.id, "accounting:manage_ar_bridge"),
  ]);
  if (!canView && !canManage) throw new ForbiddenError("Accounting capability required");
  const parsedInput = accountingArBridgeReconciliationInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting AR reconciliation request was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_ar_bridge_reconciliation", {
      p_actor_user_id: actor.id,
      p_as_of_date: parsedInput.data.as_of_date,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting AR reconciliation dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingArBridgeReconciliationSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting AR reconciliation response was invalid");
  return parsed.data;
}

export async function getAccountingApBridgeReconciliation(
  input: unknown,
): Promise<AccountingApBridgeReconciliation> {
  const actor = await requireUser();
  const [canView, canManage] = await Promise.all([
    resolveAccountingCapability(actor.id, "accounting:view"),
    resolveAccountingCapability(actor.id, "accounting:manage_ap_bridge"),
  ]);
  if (!canView && !canManage) throw new ForbiddenError("Accounting capability required");
  const parsedInput = accountingApBridgeReconciliationInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting AP reconciliation request was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_ap_bridge_reconciliation", {
      p_actor_user_id: actor.id,
      p_as_of_date: parsedInput.data.as_of_date,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting AP reconciliation dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingApBridgeReconciliationSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting AP reconciliation response was invalid");
  return parsed.data;
}
