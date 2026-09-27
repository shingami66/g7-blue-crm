import "server-only";

import { AuthDependencyError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import type { AccountingCapability } from "./types";

/** Resolves only explicit, persisted accounting authority for a trusted app user. */
export async function resolveAccountingCapability(
  actorUserId: string,
  capability: string,
): Promise<boolean> {
  if (!capability.startsWith("accounting:")) return false;

  try {
    const { data, error } = await createAdminClient().rpc(
      "get_accounting_capability",
      {
        p_actor_user_id: actorUserId,
        p_capability: capability as AccountingCapability,
      },
    );
    if (error || typeof data !== "boolean") {
      throw new AuthDependencyError("Accounting authority dependency failed");
    }
    return data;
  } catch (error) {
    if (error instanceof AuthDependencyError) throw error;
    throw new AuthDependencyError("Accounting authority dependency failed");
  }
}
