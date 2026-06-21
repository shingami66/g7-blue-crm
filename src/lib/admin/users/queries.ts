import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";

export interface AppUserRow {
  id: string;
  clerk_user_id: string;
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
      .select("id, clerk_user_id, email, name, role, is_active, created_at, updated_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[getAppUsers] Supabase error:", error.message);
      return { success: false, error: "Unable to load users. Please try again." };
    }

    return { success: true, users: data || [] };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getAppUsers] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "Unable to load users. Please try again." };
  }
}
