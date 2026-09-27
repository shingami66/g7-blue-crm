import "server-only";

import { ForbiddenError, AuthDependencyError } from "@/lib/auth/errors";
import { requirePermission, requireUser } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  accountingCapabilityAssignmentSchema,
  accountingProfileResultSchema,
  listAccountingCapabilityAssignmentsInputSchema,
} from "./schemas";
import { resolveAccountingCapability } from "./permissions";
import type { AccountingCapabilityAssignment } from "./types";

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
