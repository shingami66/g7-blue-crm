import "server-only";

import { auth } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";

export class UnauthorizedError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ---------------------------------------------------------------------------
// PERMISSION MAP
// ---------------------------------------------------------------------------
export const ROLE_PERMISSIONS: Record<string, string[]> = {
  admin: ["*"], // Special case: wildcard means all permissions
  manager: [
    "customers:read",
    "customers:write",
    "quotations:read",
    "quotations:write",
    "invoices:read",
    "payments:read",
    "projects:read",
    "projects:write",
    "suppliers:read",
    "suppliers:write",
    "dashboard:read",
  ],
  sales: [
    "customers:read",
    "customers:write",
    "quotations:read",
    "quotations:write",
    "invoices:read",
    "payments:read",
    "dashboard:read",
  ],
  operations: [
    "customers:read",
    "quotations:read",
    "projects:read",
    "projects:write",
    "suppliers:read",
    "suppliers:write",
    "dashboard:read",
  ],
  accountant: [
    "customers:read",
    "quotations:read",
    "invoices:read",
    "invoices:write",
    "payments:read",
    "payments:write",
    "settings:read",
    "dashboard:read",
  ],
  viewer: [
    "customers:read",
    "quotations:read",
    "invoices:read",
    "payments:read",
    "projects:read",
    "suppliers:read",
    "dashboard:read",
    "settings:read",
  ],
};

// ---------------------------------------------------------------------------
// HELPERS
// ---------------------------------------------------------------------------

/**
 * Retrieves the current app user from Supabase using Clerk's userId.
 * Returns null if the user is not found or if an error occurs.
 */
export async function getCurrentAppUser() {
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
  } catch (err) {
    console.error("[getCurrentAppUser] Unexpected error");
    return null;
  }
}

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
  
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  
  const hasPermission = rolePermissions.includes("*") || rolePermissions.includes(permission);
  
  if (!hasPermission) {
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
  
  const rolePermissions = ROLE_PERMISSIONS[user.role] || [];
  return rolePermissions.includes("*") || rolePermissions.includes(permission);
}
