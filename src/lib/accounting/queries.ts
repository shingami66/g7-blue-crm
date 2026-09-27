import "server-only";

import { ForbiddenError, AuthDependencyError } from "@/lib/auth/errors";
import { requirePermission, requireUser } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  accountingAccountVersionSchema,
  accountingCapabilityAssignmentSchema,
  accountingPeriodVersionSchema,
  accountingProfileResultSchema,
  listAccountingCapabilityAssignmentsInputSchema,
} from "./schemas";
import { resolveAccountingCapability } from "./permissions";
import type {
  AccountingAccountVersion,
  AccountingCapabilityAssignment,
  AccountingPeriodVersion,
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
