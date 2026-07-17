import "server-only";

import { auth } from "@clerk/nextjs/server";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePersistedLocale, type Locale } from "@/lib/i18n/locales";
import { hasPermissionForRole } from "./role-permissions";
import { UnauthorizedError, ForbiddenError } from "./errors";

export { ROLE_PERMISSIONS } from "./role-permissions";

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Retrieves the current app user from Supabase using Clerk's userId.
 * Returns null if the user is not found or if an error occurs.
 */
export const getCurrentAppUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) return null;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_users")
      .select("*")
      .eq("clerk_user_id", userId)
      .single();

    if (error) {
      console.error("[getCurrentAppUser] Database error fetching user");
      return null;
    }

    return data;
  } catch {
    console.error("[getCurrentAppUser] Unexpected error");
    return null;
  }
});

/**
 * Requires a valid user to be signed in and present in `app_users`.
 * Ensures the user is active.
 * Throws UnauthorizedError if not signed in or not found.
 * Throws ForbiddenError if user is inactive.
 */
export async function requireUser() {
  const user = await getCurrentAppUser();
  if (!user) {
    throw new UnauthorizedError("Sign-in required or user not found");
  }
  
  if (!user.is_active) {
    throw new ForbiddenError("Account is inactive");
  }

  return user;
}

export async function getCurrentUserLocale(): Promise<Locale> {
  const user = await requireUser();
  return normalizePersistedLocale(user.locale);
}

/**
 * Requires the current user to have a specific role.
 */
export async function requireRole(role: string) {
  const user = await requireUser();
  
  if (user.role !== role) {
    throw new ForbiddenError(`Role '${role}' required`);
  }

  return user;
}

/**
 * Requires the current user to have a specific permission based on their role.
 */
export async function requirePermission(permission: string) {
  const user = await requireUser();
  
  if (!hasPermissionForRole(user.role, permission)) {
    throw new ForbiddenError(`Permission '${permission}' required`);
  }

  return user;
}

/**
 * Non-throwing permission check for conditional UI rendering.
 * Returns true if the current user has the specified permission, false otherwise.
 */
export async function checkPermission(permission: string): Promise<boolean> {
  const user = await getCurrentAppUser();
  if (!user || !user.is_active) {
    return false;
  }
  
  return hasPermissionForRole(user.role, permission);
}
