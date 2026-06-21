"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import {
  inviteUserSchema,
  updateUserRoleSchema,
  toggleUserActiveSchema,
  CRM_ROLES,
} from "./schemas";

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

const NO_ROW_ERROR_CODE = "PGRST116";
const LAST_ACTIVE_ADMIN_ERROR = "At least one active admin must remain.";

async function hasOtherActiveAdmin(excludedUserId: string): Promise<ActionResult<boolean>> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("app_users")
    .select("id", { count: "exact", head: true })
    .eq("role", "admin")
    .eq("is_active", true)
    .neq("id", excludedUserId);

  if (error) {
    console.error("[hasOtherActiveAdmin] Supabase error:", error.message);
    return { success: false, error: "Failed to verify admin access safety. Please try again." };
  }

  return { success: true, data: (count ?? 0) > 0 };
}

/**
 * Invites a new user via Clerk Invitations API.
 * Stores the intended CRM role in the invitation's publicMetadata.
 * The role is bootstrap-only — final authorization uses app_users.role.
 */
export async function inviteUser(input: unknown): Promise<ActionResult> {
  try {
    await requirePermission("users:invite");
    const parsed = inviteUserSchema.safeParse(input);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const { email, role } = parsed.data;

    // Validate role against CRM whitelist (defense in depth beyond Zod)
    if (!CRM_ROLES.includes(role)) {
      return { success: false, error: "Invalid role selected." };
    }

    const clerk = await clerkClient();
    await clerk.invitations.createInvitation({
      emailAddress: email,
      publicMetadata: { crm_role: role },
      ignoreExisting: false,
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };

    // Handle Clerk-specific duplicate invitation errors
    if (err instanceof Error && err.message.includes("already has a pending invitation")) {
      return { success: false, error: "This email already has a pending invitation." };
    }
    if (err instanceof Error && err.message.includes("already exists")) {
      return { success: false, error: "A user with this email already exists in Clerk." };
    }

    console.error("[inviteUser] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "Failed to send invitation. Please try again." };
  }
}

/**
 * Updates the role of an existing app_users row.
 * Validates role against the CRM whitelist.
 */
export async function updateUserRole(input: unknown): Promise<ActionResult> {
  try {
    const currentUser = await requirePermission("users:manage");
    const parsed = updateUserRoleSchema.safeParse(input);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const { userId, role } = parsed.data;

    if (userId === currentUser.id) {
      return { success: false, error: "You cannot change your own role." };
    }

    if (!CRM_ROLES.includes(role)) {
      return { success: false, error: "Invalid role selected." };
    }

    const supabase = createAdminClient();
    const { data: targetUser, error: fetchError } = await supabase
      .from("app_users")
      .select("id, role, is_active")
      .eq("id", userId)
      .single();

    if (fetchError?.code === NO_ROW_ERROR_CODE) {
      return { success: false, error: "User not found." };
    }

    if (fetchError) {
      console.error("[updateUserRole] Supabase error:", fetchError.message);
      return { success: false, error: "Failed to load user. Please try again." };
    }

    if (!targetUser) {
      return { success: false, error: "User not found." };
    }

    if (targetUser.role === "admin" && targetUser.is_active && role !== "admin") {
      const activeAdminCheck = await hasOtherActiveAdmin(userId);
      if (!activeAdminCheck.success) return { success: false, error: activeAdminCheck.error };
      if (!activeAdminCheck.data) {
        return { success: false, error: LAST_ACTIVE_ADMIN_ERROR };
      }
    }

    const { error } = await supabase
      .from("app_users")
      .update({ role, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("[updateUserRole] Supabase error:", error.message);
      return { success: false, error: "Failed to update role. Please try again." };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[updateUserRole] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Toggles the is_active status of an existing app_users row.
 * Blocks self-deactivation to prevent lockout.
 */
export async function toggleUserActive(input: unknown): Promise<ActionResult> {
  try {
    const currentUser = await requirePermission("users:manage");
    const parsed = toggleUserActiveSchema.safeParse(input);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const { userId } = parsed.data;

    // Block self-deactivation
    if (userId === currentUser.id) {
      return { success: false, error: "You cannot deactivate your own account." };
    }

    const supabase = createAdminClient();

    // Fetch target user's current state
    const { data: targetUser, error: fetchError } = await supabase
      .from("app_users")
      .select("id, role, is_active")
      .eq("id", userId)
      .single();

    if (fetchError?.code === NO_ROW_ERROR_CODE) {
      return { success: false, error: "User not found." };
    }

    if (fetchError) {
      console.error("[toggleUserActive] Supabase error:", fetchError.message);
      return { success: false, error: "Failed to load user. Please try again." };
    }

    if (!targetUser) {
      return { success: false, error: "User not found." };
    }

    const newActiveStatus = !targetUser.is_active;

    if (targetUser.role === "admin" && targetUser.is_active && !newActiveStatus) {
      const activeAdminCheck = await hasOtherActiveAdmin(userId);
      if (!activeAdminCheck.success) return { success: false, error: activeAdminCheck.error };
      if (!activeAdminCheck.data) {
        return { success: false, error: LAST_ACTIVE_ADMIN_ERROR };
      }
    }

    const { error } = await supabase
      .from("app_users")
      .update({ is_active: newActiveStatus, updated_at: new Date().toISOString() })
      .eq("id", userId);

    if (error) {
      console.error("[toggleUserActive] Supabase error:", error.message);
      return { success: false, error: "Failed to update user status. Please try again." };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[toggleUserActive] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Revokes a pending Clerk invitation by invitation ID.
 */
export async function revokeInvitation(invitationId: string): Promise<ActionResult> {
  try {
    await requirePermission("users:manage");

    if (!invitationId || typeof invitationId !== "string") {
      return { success: false, error: "Invalid invitation ID." };
    }

    const clerk = await clerkClient();
    await clerk.invitations.revokeInvitation(invitationId);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[revokeInvitation] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "Failed to revoke invitation. Please try again." };
  }
}

/**
 * Fetches pending Clerk invitations.
 * Returns safe data for the Admin UI only.
 */
export async function getPendingInvitations(): Promise<ActionResult<Array<{
  id: string;
  emailAddress: string;
  role: string;
  status: string;
  createdAt: number;
}>>> {
  try {
    await requirePermission("users:manage");

    const clerk = await clerkClient();
    const response = await clerk.invitations.getInvitationList({ status: "pending" });
    const invitations = response.data.map((inv) => ({
      id: inv.id,
      emailAddress: inv.emailAddress,
      role: (inv.publicMetadata as Record<string, unknown>)?.crm_role as string ?? "unknown",
      status: inv.status,
      createdAt: inv.createdAt,
    }));

    return { success: true, data: invitations };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[getPendingInvitations] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { success: false, error: "Failed to fetch pending invitations." };
  }
}
