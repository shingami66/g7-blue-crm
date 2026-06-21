import { Metadata } from "next";
import { getAppUsers } from "@/lib/admin/users/queries";
import { getPendingInvitations } from "@/lib/admin/users/actions";
import { requirePermission } from "@/lib/auth/permissions";
import { AdminUsersClient } from "./AdminUsersClient";

export const metadata: Metadata = {
  title: "Admin Users - G7 BLUE CRM",
  description: "Manage CRM users and invitations.",
};

export default async function AdminUsersPage() {
  const currentUser = await requirePermission("users:manage");

  const [usersResult, pendingInvitationsResult] = await Promise.all([
    getAppUsers(),
    getPendingInvitations(),
  ]);

  if (!usersResult.success) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">User Management</h1>
          <p className="text-sm text-on-surface-variant mt-1">
            Invite users, manage roles, and control access.
          </p>
        </div>

        <div className="bg-error-container text-on-error-container border border-error/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold">Unable to load users</h2>
          <p className="mt-2 text-sm">{usersResult.error}</p>
        </div>
      </div>
    );
  }

  const pendingInvitations = pendingInvitationsResult.success && pendingInvitationsResult.data
    ? pendingInvitationsResult.data
    : [];
  const pendingInvitationsWarning = pendingInvitationsResult.success
    ? null
    : "Unable to load pending invitations. User management remains available.";

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">User Management</h1>
        <p className="text-sm text-on-surface-variant mt-1">
          Invite users, manage roles, and control access.
        </p>
      </div>

      <AdminUsersClient
        initialUsers={usersResult.users}
        initialPendingInvitations={pendingInvitations}
        pendingInvitationsWarning={pendingInvitationsWarning}
        currentUserId={currentUser.id}
      />
    </div>
  );
}
