import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";

export interface AppUserRow {
  id: string;
  email: string;
  name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type AppUsersQueryResult =
  | { success: true; users: AppUserRow[] }
  | { success: false; error: string };

/**
 * Fetches all app_users for the Admin Users page.
 * Requires users:manage permission (Admin only).
 */
export async function getAppUsers(): Promise<AppUsersQueryResult> {
  await requirePermission("users:manage");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_users")
      .select("id, email, name, role, is_active, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getAppUsers] Supabase error:", error.message);
      return { success: false, error: "Unable to load users. Please try again." };
    }

    const users: AppUserRow[] = (data || []).map((u) => ({
      id: u.id,
      email: u.email ?? "",
      name: u.name ?? "",
      role: u.role,
      is_active: Boolean(u.is_active),
      created_at: u.created_at ?? "",
      updated_at: u.updated_at ?? "",
    }));

    return { success: true, users };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getAppUsers] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "Unable to load users. Please try again." };
  }
}
