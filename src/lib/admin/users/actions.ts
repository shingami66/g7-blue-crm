"use server";

import { revalidatePath } from "next/cache";
import { clerkClient } from "@clerk/nextjs/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import {
  inviteUserSchema,
  updateUserRoleSchema,
  setUserActiveSchema,
  CRM_ROLES,
} from "./schemas";

export type ActionResult<T = void> = {
  success: boolean;
  error?: string;
  data?: T;
};

// Invariant: At least one active admin must remain (enforced atomically via update_app_user_role / set_app_user_active RPCs; legacy hasOtherActiveAdmin retired).
const LAST_ACTIVE_ADMIN_ERROR = "At least one active admin must remain.";

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

    console.error("[inviteUser] Unexpected error: invitation_dependency_failed");
    return { success: false, error: "Failed to send invitation. Please try again." };
  }
}

/**
 * Updates the role of an existing app_users row.
 * Validates role against the CRM whitelist.
 * Atomically enforces that at least one active admin remains and logs an audit event.
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
    const { data, error } = await supabase.rpc("update_app_user_role", {
      p_user_id: userId,
      p_role: role,
      p_actor_id: currentUser.clerk_user_id,
      p_actor_role: currentUser.role,
    });

    if (error) {
      console.error("[updateUserRole] RPC error: user_role_mutation_failed");
      return { success: false, error: "Failed to update role. Please try again." };
    }

    const resultRow = Array.isArray(data) ? data[0] : data;
    if (!resultRow) {
      return { success: false, error: "Failed to update role. Please try again." };
    }

    if (resultRow.error_code) {
      switch (resultRow.error_code) {
        case "user_not_found":
          return { success: false, error: "User not found." };
        case "cannot_change_own_role":
          return { success: false, error: "You cannot change your own role." };
        case "last_active_admin":
          return { success: false, error: LAST_ACTIVE_ADMIN_ERROR };
        case "invalid_role":
          return { success: false, error: "Invalid role selected." };
        case "invalid_actor":
        case "invalid_input":
        default:
          return { success: false, error: "Failed to update role. Please try again." };
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[updateUserRole] Unexpected error: user_role_dependency_failed");
    return { success: false, error: "An unexpected error occurred." };
  }
}

/**
 * Sets the is_active status of an existing app_users row to a desired state.
 * Blocks self-deactivation to prevent lockout.
 * Idempotent: repeated calls with the same desired state succeed safely.
 * Atomically enforces that at least one active admin remains and logs an audit event.
 */
export async function setUserActive(input: unknown): Promise<ActionResult> {
  try {
    const currentUser = await requirePermission("users:manage");
    const parsed = setUserActiveSchema.safeParse(input);

    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message ?? "Validation failed";
      return { success: false, error: firstError };
    }

    const { userId, isActive } = parsed.data;

    // Block self-deactivation
    if (userId === currentUser.id && !isActive) {
      return { success: false, error: "You cannot deactivate your own account." };
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("set_app_user_active", {
      p_user_id: userId,
      p_is_active: isActive,
      p_actor_id: currentUser.clerk_user_id,
      p_actor_role: currentUser.role,
    });

    if (error) {
      console.error("[setUserActive] RPC error: user_status_mutation_failed");
      return { success: false, error: "Failed to update user status. Please try again." };
    }

    const resultRow = Array.isArray(data) ? data[0] : data;
    if (!resultRow) {
      return { success: false, error: "Failed to update user status. Please try again." };
    }

    if (resultRow.error_code) {
      switch (resultRow.error_code) {
        case "user_not_found":
          return { success: false, error: "User not found." };
        case "cannot_deactivate_own_account":
          return { success: false, error: "You cannot deactivate your own account." };
        case "last_active_admin":
          return { success: false, error: LAST_ACTIVE_ADMIN_ERROR };
        case "invalid_actor":
        case "invalid_input":
        default:
          return { success: false, error: "Failed to update user status. Please try again." };
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) return { success: false, error: "Unauthorized" };
    if (err instanceof ForbiddenError) return { success: false, error: "Forbidden" };
    console.error("[setUserActive] Unexpected error: user_status_dependency_failed");
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
    console.error("[revokeInvitation] Unexpected error: invitation_dependency_failed");
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
    console.error("[getPendingInvitations] Unexpected error: invitation_list_dependency_failed");
    return { success: false, error: "Failed to fetch pending invitations." };
  }
}
