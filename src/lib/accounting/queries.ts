import "server-only";

import { z } from "zod";
import { ForbiddenError, AuthDependencyError } from "@/lib/auth/errors";
import { checkPermission, requirePermission, requireUser } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { RpcArgument } from "@/lib/supabase/rpc-argument";
import {
  accountingAccountVersionSchema,
  accountingCapabilityAssignmentSchema,
  accountingGeneralLedgerInputSchema,
  accountingGeneralLedgerResultSchema,
  accountingJournalDetailSchema,
  accountingJournalIdSchema,
  accountingPeriodVersionSchema,
  accountingPeriodCloseReadModelSchema,
  getAccountingPeriodCloseEvidenceInputSchema,
  accountingPostingRuleVersionSchema,
  accountingProfileResultSchema,
  accountingSetupStatusSchema,
  accountingSetupTargetsSchema,
  accountingTrialBalanceInputSchema,
  accountingTrialBalanceResultSchema,
  accountingW10HReportInputSchema,
  accountingW10HReportResultSchema,
  accountingInceptionPackageDetailSchema,
  accountingInceptionPackageSummarySchema,
  accountingStatementMappingEntrySchema,
  accountingStatementMappingVersionSchema,
  accountingArBridgeReconciliationInputSchema,
  accountingArBridgeReconciliationSchema,
  accountingApBridgeReconciliationInputSchema,
  accountingApBridgeReconciliationSchema,
  accountingExpenseBridgeReconciliationInputSchema,
  accountingExpenseBridgeReconciliationSchema,
  accountingRevenueReconciliationInputSchema,
  accountingRevenueReconciliationSchema,
  accountingBankBindingReadInputSchema,
  accountingBankBindingReadModelSchema,
  accountingBankReconciliationInputSchema,
  accountingBankReconciliationSchema,
  accountingBankReconciliationHistoryInputSchema,
  accountingBankReconciliationHistorySchema,
  listAccountingCapabilityAssignmentsInputSchema,
} from "./schemas";
import { resolveAccountingCapability } from "./permissions";
import type {
  AccountingAccountVersion,
  AccountingCapabilityAssignment,
  AccountingJournalDetail,
  AccountingPeriodVersion,
  AccountingPeriodCloseReadModel,
  AccountingPostingRuleVersion,
  AccountingInceptionPackageDetail,
  AccountingInceptionPackageSummary,
  AccountingInceptionJournalLink,
  AccountingStatementMappingReadModel,
  AccountingStatementMappingEntry,
  AccountingStatementMappingVersionSummary,
  AccountingArBridgeReconciliation,
  AccountingApBridgeReconciliation,
  AccountingExpenseBridgeReconciliation,
  AccountingRevenueReconciliation,
  AccountingBankBindingReadModel,
  AccountingBankReconciliation,
  AccountingBankReconciliationHistory,
  AccountingSetupStatus,
  AccountingSetupTarget,
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

export async function getAccountingSetupStatus(): Promise<AccountingSetupStatus> {
  const actor = await requireUser();
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_setup_status", {
      p_actor_user_id: actor.id,
    });
  } catch {
    throw new AuthDependencyError("Accounting setup status dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingSetupStatusSchema.safeParse(result.data);
  if (!parsed.success) {
    throw new AuthDependencyError("Accounting setup status response was invalid");
  }
  return parsed.data;
}

export async function listAccountingSetupTargets(
  excludeCurrentActor = false,
): Promise<AccountingSetupTarget[]> {
  const actor = await requireUser();
  const canManageUsers = await checkPermission("users:manage");
  const canManageAuthority = canManageUsers
    ? false
    : await resolveAccountingCapability(actor.id, "accounting:manage_authority");
  if (!canManageUsers && !canManageAuthority) {
    throw new ForbiddenError("Accounting authority is required");
  }

  let result;
  try {
    let query = createAdminClient()
      .from("app_users")
      .select("id,name,role")
      .eq("is_active", true)
      .order("name", { ascending: true, nullsFirst: false })
      .order("id", { ascending: true });
    if (excludeCurrentActor) query = query.neq("id", actor.id);
    result = await query.limit(100);
  } catch {
    throw new AuthDependencyError("Accounting setup target dependency failed");
  }
  if (result.error) {
    throw new AuthDependencyError("Accounting setup target dependency failed");
  }
  const parsed = accountingSetupTargetsSchema.safeParse(result.data);
  if (!parsed.success) {
    throw new AuthDependencyError("Accounting setup target response was invalid");
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
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff as RpcArgument<"get_accounting_general_ledger", "p_recorded_at_cutoff">,
      p_account_id: parsedInput.data.account_id as RpcArgument<"get_accounting_general_ledger", "p_account_id">,
      p_service_id: parsedInput.data.service_id as RpcArgument<"get_accounting_general_ledger", "p_service_id">,
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
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff as RpcArgument<"get_accounting_trial_balance", "p_recorded_at_cutoff">,
      p_service_id: parsedInput.data.service_id as RpcArgument<"get_accounting_trial_balance", "p_service_id">,
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

export async function getAccountingW10HReport(input: unknown) {
  const parsedInput = accountingW10HReportInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting report request was invalid");
  // The RPC repeats capability authorization. A verified active user may receive only
  // the empty NOT_INITIALIZED result before any accounting profile exists.
  const actor = await requireUser();
  let result;
  try {
    result = await createAdminClient().rpc("get_w10h_accounting_report", {
      p_actor_user_id: actor.id,
      p_report_type: parsedInput.data.report_type,
      p_from_date: parsedInput.data.from_date,
      p_through_date: parsedInput.data.through_date,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff as RpcArgument<"get_w10h_accounting_report", "p_recorded_at_cutoff">,
      p_account_id: parsedInput.data.account_id as RpcArgument<"get_w10h_accounting_report", "p_account_id">,
      p_service_id: parsedInput.data.service_id as RpcArgument<"get_w10h_accounting_report", "p_service_id">,
      p_offset: parsedInput.data.offset,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting report dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingW10HReportResultSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting report response was invalid");
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
  const journalLinks = await listAccountingInceptionJournalLinks(
    parsed.data.profile_id,
    parsed.data.package_id,
    parsed.data.current_version,
  );
  return { ...parsed.data, journal_links: journalLinks };
}

async function listAccountingInceptionJournalLinks(
  profileId: string,
  packageId: string,
  packageVersion: number,
): Promise<AccountingInceptionJournalLink[]> {
  const client = createAdminClient();
  let linksResult;
  try {
    linksResult = await client
      .from("accounting_inception_journal_links")
      .select("item_id,package_version,journal_id,prepared_version")
      .eq("profile_id", profileId)
      .eq("package_id", packageId)
      .eq("package_version", packageVersion)
      .order("item_id", { ascending: true })
      .limit(500);
  } catch {
    throw new AuthDependencyError("Accounting inception journal status dependency failed");
  }
  if (linksResult.error || !Array.isArray(linksResult.data)) {
    throw new AuthDependencyError("Accounting inception journal status dependency failed");
  }
  const links = z.array(z.object({
    item_id: z.string().uuid(),
    package_version: z.number().int().positive(),
    journal_id: z.string().uuid(),
    prepared_version: z.number().int().positive(),
  }).strict()).safeParse(linksResult.data);
  if (!links.success) throw new AuthDependencyError("Accounting inception journal link response was invalid");
  if (links.data.length === 0) return [];

  let journalsResult;
  try {
    journalsResult = await client
      .from("accounting_journals")
      .select("id,current_version,current:accounting_journal_versions!accounting_journals_current_version_fkey(version,status)")
      .eq("profile_id", profileId)
      .in("id", links.data.map((link) => link.journal_id))
      .limit(500);
  } catch {
    throw new AuthDependencyError("Accounting inception journal status dependency failed");
  }
  if (journalsResult.error || !Array.isArray(journalsResult.data)) {
    throw new AuthDependencyError("Accounting inception journal status dependency failed");
  }
  const currentVersionSchema = z.object({
    version: z.number().int().positive(),
    status: z.enum(["DRAFT", "POSTED"]),
  }).strict();
  const currentRowsSchema = z.array(z.object({
    id: z.string().uuid(),
    current_version: z.number().int().positive(),
    current: z.union([currentVersionSchema, z.array(currentVersionSchema).length(1)]),
  }).strict());
  const currentRows = currentRowsSchema.safeParse(journalsResult.data);
  if (!currentRows.success) throw new AuthDependencyError("Accounting inception journal status response was invalid");
  const currentById = new Map(currentRows.data.map((journal) => {
    const current = Array.isArray(journal.current) ? journal.current[0] : journal.current;
    if (current.version !== journal.current_version) {
      throw new AuthDependencyError("Accounting inception journal status response was invalid");
    }
    return [journal.id, { version: current.version, status: current.status }] as const;
  }));

  const result: AccountingInceptionJournalLink[] = [];
  for (const link of links.data) {
    const current = currentById.get(link.journal_id);
    if (!current) throw new AuthDependencyError("Accounting inception journal status response was incomplete");
    result.push({ ...link, current_version: current.version, status: current.status });
  }
  return result;
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

export async function getAccountingInceptionOverview(): Promise<
  | { state: "NOT_INITIALIZED" }
  | { state: "READY"; packages: AccountingInceptionPackageSummary[] }
> {
  const actor = await requireUser();
  await requireInceptionReadCapability(actor.id);
  let profileResult;
  try {
    profileResult = await createAdminClient().from("accounting_profiles")
      .select("id")
      .eq("singleton_key", "g7")
      .maybeSingle();
  } catch {
    throw new AuthDependencyError("Accounting inception profile dependency failed");
  }
  if (profileResult.error) throw new AuthDependencyError("Accounting inception profile dependency failed");
  if (!profileResult.data) return { state: "NOT_INITIALIZED" };
  const profile = z.object({ id: z.string().uuid() }).strict().safeParse(profileResult.data);
  if (!profile.success) throw new AuthDependencyError("Accounting inception profile response was invalid");
  return { state: "READY", packages: await listAccountingInceptionPackages() };
}

export async function getAccountingStatementMappings(): Promise<AccountingStatementMappingReadModel> {
  const actor = await requireUser();
  if (!(await resolveAccountingCapability(actor.id, "accounting:manage_chart"))) {
    throw new ForbiddenError("Accounting chart management capability required");
  }
  const client = createAdminClient();
  let profileResult;
  try {
    profileResult = await client.from("accounting_profiles")
      .select("id")
      .eq("singleton_key", "g7")
      .maybeSingle();
  } catch {
    throw new AuthDependencyError("Accounting statement mapping dependency failed");
  }
  if (profileResult.error) throw new AuthDependencyError("Accounting statement mapping dependency failed");
  if (!profileResult.data) return { state: "NOT_INITIALIZED" };
  const profile = z.object({ id: z.string().uuid() }).strict().safeParse(profileResult.data);
  if (!profile.success) throw new AuthDependencyError("Accounting profile response was invalid");

  let setResult;
  try {
    setResult = await client.from("accounting_statement_mapping_sets")
      .select("id,profile_id,current_version")
      .eq("profile_id", profile.data.id)
      .maybeSingle();
  } catch {
    throw new AuthDependencyError("Accounting statement mapping dependency failed");
  }
  if (setResult.error) throw new AuthDependencyError("Accounting statement mapping dependency failed");
  if (!setResult.data) {
    return { state: "EMPTY", profile_id: profile.data.id, mapping_set_id: null, current_version: 0, history: [] };
  }
  const mappingSet = z.object({ id: z.string().uuid(), profile_id: z.string().uuid(), current_version: z.number().int().positive() })
    .strict().safeParse(setResult.data);
  if (!mappingSet.success || mappingSet.data.profile_id !== profile.data.id) {
    throw new AuthDependencyError("Accounting statement mapping set response was invalid");
  }

  let historyResult;
  try {
    historyResult = await client.from("accounting_statement_mapping_versions")
      .select("version,previous_version,effective_from,reason,evidence_ref,created_by,created_at")
      .eq("profile_id", profile.data.id)
      .eq("mapping_set_id", mappingSet.data.id)
      .order("version", { ascending: false })
      .limit(51);
  } catch {
    throw new AuthDependencyError("Accounting statement mapping history dependency failed");
  }
  if (historyResult.error || !Array.isArray(historyResult.data)) {
    throw new AuthDependencyError("Accounting statement mapping history dependency failed");
  }
  const parsedHistory = z.array(accountingStatementMappingVersionSchema).safeParse(historyResult.data);
  if (!parsedHistory.success || !parsedHistory.data.some((version) => version.version === mappingSet.data.current_version)) {
    throw new AuthDependencyError("Accounting statement mapping history response was invalid");
  }

  const readEntryPage = (from: number, to: number) => client.from("accounting_statement_mapping_entries")
    .select("account_id,account_version,statement_type,section_key,line_key,label_en,label_ar,display_order")
    .eq("profile_id", profile.data.id)
    .eq("mapping_set_id", mappingSet.data.id)
    .eq("mapping_version", mappingSet.data.current_version)
    .order("statement_type", { ascending: true })
    .order("display_order", { ascending: true })
    .order("account_id", { ascending: true })
    .range(from, to);
  let entryPages;
  try {
    entryPages = await Promise.all([readEntryPage(0, 999), readEntryPage(1000, 1999)]);
  } catch {
    throw new AuthDependencyError("Accounting statement mapping entries dependency failed");
  }
  if (entryPages.some((page) => page.error || !Array.isArray(page.data))) {
    throw new AuthDependencyError("Accounting statement mapping entries dependency failed");
  }
  const entriesRaw = [...entryPages[0].data!, ...entryPages[1].data!];
  if (entriesRaw.length > 2000) throw new AuthDependencyError("Accounting statement mapping entry limit was exceeded");
  const parsedEntries = z.array(accountingStatementMappingEntrySchema).safeParse(entriesRaw);
  if (!parsedEntries.success) throw new AuthDependencyError("Accounting statement mapping entries response was invalid");
  const history: AccountingStatementMappingVersionSummary[] = parsedHistory.data.slice(0, 50).reverse();
  const base = {
    profile_id: profile.data.id,
    mapping_set_id: mappingSet.data.id,
    current_version: mappingSet.data.current_version,
  };
  return {
    state: "READY",
    ...base,
    entries: parsedEntries.data as AccountingStatementMappingEntry[],
    history,
    history_truncated: parsedHistory.data.length > 50,
  };
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

export async function getAccountingExpenseBridgeReconciliation(
  input: unknown,
): Promise<AccountingExpenseBridgeReconciliation> {
  const actor = await requireUser();
  const [canView, canManage] = await Promise.all([
    resolveAccountingCapability(actor.id, "accounting:view"),
    resolveAccountingCapability(actor.id, "accounting:manage_expense_bridge"),
  ]);
  if (!canView && !canManage) throw new ForbiddenError("Accounting capability required");
  const parsedInput = accountingExpenseBridgeReconciliationInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting expense reconciliation request was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_expense_bridge_reconciliation", {
      p_actor: actor.id,
      p_as_of: parsedInput.data.as_of_date,
      p_cutoff: parsedInput.data.recorded_at_cutoff,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting expense reconciliation dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingExpenseBridgeReconciliationSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting expense reconciliation response was invalid");
  return parsed.data;
}

export async function getAccountingRevenueReconciliation(
  input: unknown,
): Promise<AccountingRevenueReconciliation> {
  const actor = await requireUser();
  const [canView, canManage] = await Promise.all([
    resolveAccountingCapability(actor.id, "accounting:view"),
    resolveAccountingCapability(actor.id, "accounting:manage_revenue_recognition"),
  ]);
  if (!canView && !canManage) throw new ForbiddenError("Accounting capability required");
  const parsedInput = accountingRevenueReconciliationInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting revenue reconciliation request was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_revenue_recognition_reconciliation", {
      p_actor: actor.id,
      p_as_of: parsedInput.data.as_of_date,
      p_cutoff: parsedInput.data.recorded_at_cutoff,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting revenue reconciliation dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingRevenueReconciliationSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting revenue reconciliation response was invalid");
  return parsed.data;
}

export async function getAccountingBankReconciliation(
  input: unknown,
): Promise<AccountingBankReconciliation> {
  const actor = await requireUser();
  const [canView, canReconcile] = await Promise.all([
    resolveAccountingCapability(actor.id, "accounting:view"),
    resolveAccountingCapability(actor.id, "accounting:reconcile_bank"),
  ]);
  if (!canView && !canReconcile) throw new ForbiddenError("Accounting capability required");
  const parsedInput = accountingBankReconciliationInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting bank reconciliation request was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_bank_reconciliation", {
      p_actor_user_id: actor.id,
      p_binding_id: parsedInput.data.binding_id,
      p_as_of_date: parsedInput.data.as_of_date,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting bank reconciliation dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingBankReconciliationSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting bank reconciliation response was invalid");
  return parsed.data;
}

export async function listAccountingBankBindings(input: unknown): Promise<AccountingBankBindingReadModel> {
  const actor = await requireUser();
  const [canView, canReconcile] = await Promise.all([
    resolveAccountingCapability(actor.id, "accounting:view"),
    resolveAccountingCapability(actor.id, "accounting:reconcile_bank"),
  ]);
  if (!canView && !canReconcile) throw new ForbiddenError("Accounting capability required");
  const parsedInput = accountingBankBindingReadInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting bank binding request was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("list_accounting_bank_bindings", {
      p_actor_user_id: actor.id,
      p_as_of_date: parsedInput.data.as_of_date,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting bank binding dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingBankBindingReadModelSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting bank binding response was invalid");
  return parsed.data;
}

export async function getAccountingBankReconciliationHistory(
  input: unknown,
): Promise<AccountingBankReconciliationHistory> {
  const actor = await requireUser();
  const [canView, canReconcile] = await Promise.all([
    resolveAccountingCapability(actor.id, "accounting:view"),
    resolveAccountingCapability(actor.id, "accounting:reconcile_bank"),
  ]);
  if (!canView && !canReconcile) throw new ForbiddenError("Accounting capability required");
  const parsedInput = accountingBankReconciliationHistoryInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting bank reconciliation history request was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_bank_reconciliation_history", {
      p_actor_user_id: actor.id,
      p_binding_id: parsedInput.data.binding_id,
      p_as_of_date: parsedInput.data.as_of_date,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff,
      p_limit: parsedInput.data.limit,
    });
  } catch {
    throw new AuthDependencyError("Accounting bank reconciliation history dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingBankReconciliationHistorySchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting bank reconciliation history response was invalid");
  return parsed.data;
}

export async function getAccountingPeriodCloseEvidence(
  input: unknown,
): Promise<AccountingPeriodCloseReadModel> {
  const actor = await requireUser();
  if (!await resolveAccountingCapability(actor.id, "accounting:view")) {
    throw new ForbiddenError("Accounting capability required");
  }
  const parsedInput = getAccountingPeriodCloseEvidenceInputSchema.safeParse(input);
  if (!parsedInput.success) throw new AuthDependencyError("Accounting close evidence request was invalid");
  let result;
  try {
    result = await createAdminClient().rpc("get_accounting_period_close_evidence", {
      p_actor_user_id: actor.id,
      p_period_id: parsedInput.data.period_id,
      p_recorded_at_cutoff: parsedInput.data.recorded_at_cutoff,
    });
  } catch {
    throw new AuthDependencyError("Accounting close evidence dependency failed");
  }
  if (result.error) throwSafeRpcError(result.error);
  const parsed = accountingPeriodCloseReadModelSchema.safeParse(result.data);
  if (!parsed.success) throw new AuthDependencyError("Accounting close evidence response was invalid");
  return parsed.data;
}
