"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  UserPlus
} from "lucide-react";
import {
  inviteUser,
  updateUserRole,
  toggleUserActive,
  revokeInvitation
} from "@/lib/admin/users/actions";
import { CRM_ROLES } from "@/lib/admin/users/schemas";
import type { AppUserRow } from "@/lib/admin/users/queries";

type PendingInvitation = {
  id: string;
  emailAddress: string;
  role: string;
  status: string;
  createdAt: number;
};

interface AdminUsersClientProps {
  initialUsers: AppUserRow[];
  initialPendingInvitations: PendingInvitation[];
  pendingInvitationsWarning: string | null;
  currentUserId: string;
}

export function AdminUsersClient({
  initialUsers,
  initialPendingInvitations,
  pendingInvitationsWarning,
  currentUserId
}: AdminUsersClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"users" | "invitations">("users");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");
    setActionError("");

    const result = await inviteUser({ email: inviteEmail, role: inviteRole });

    if (result.success) {
      setInviteSuccess(`Invitation sent to ${inviteEmail}`);
      setInviteEmail("");
      setInviteRole("viewer");
      router.refresh();
    } else {
      setInviteError(result.error || "Failed to send invitation");
    }
    setIsInviting(false);
  };

  const handleToggleActive = async (userId: string) => {
    setActionLoadingId(userId);
    setActionError("");
    const result = await toggleUserActive({ userId });
    if (result.success) {
      router.refresh();
    } else {
      setActionError(result.error || "Failed to update user status.");
    }
    setActionLoadingId(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUserId) {
      setActionError("You cannot change your own role.");
      return;
    }

    setActionLoadingId(userId);
    setActionError("");
    const result = await updateUserRole({ userId, role: newRole });
    if (result.success) {
      router.refresh();
    } else {
      setActionError(result.error || "Failed to update role.");
    }
    setActionLoadingId(null);
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm("Are you sure you want to revoke this invitation?")) return;

    setActionLoadingId(invitationId);
    setActionError("");
    const result = await revokeInvitation(invitationId);
    if (result.success) {
      router.refresh();
    } else {
      setActionError(result.error || "Failed to revoke invitation.");
    }
    setActionLoadingId(null);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Invite Form Card */}
      <div className="bg-surface-container rounded-xl p-6 border border-outline-variant">
        <div className="flex items-center gap-2 mb-4 text-on-surface">
          <UserPlus size={20} />
          <h2 className="text-lg font-semibold">Invite New User</h2>
        </div>

        <form onSubmit={handleInvite} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Email Address</label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder="user@example.com"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">Role</label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CRM_ROLES.map(role => (
                <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isInviting || !inviteEmail}
            className="w-full md:w-auto bg-primary text-on-primary font-semibold px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
          >
            {isInviting ? <Loader2 size={20} className="animate-spin" /> : "Send Invite"}
          </button>
        </form>

        {inviteError && <div className="mt-4 text-error text-sm">{inviteError}</div>}
        {inviteSuccess && <div className="mt-4 text-primary text-sm font-medium">{inviteSuccess}</div>}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-outline-variant gap-6">
        <button
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Active Users ({initialUsers.length})
        </button>
        <button
          onClick={() => setActiveTab("invitations")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "invitations"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          Pending Invitations ({initialPendingInvitations.length})
        </button>
      </div>

      {actionError && (
        <div className="bg-error-container text-on-error-container border border-error/20 rounded-lg p-4 text-sm">
          {actionError}
        </div>
      )}

      {pendingInvitationsWarning && (
        <div className="bg-error-container/40 text-on-error-container border border-error/20 rounded-lg p-4 text-sm">
          {pendingInvitationsWarning}
        </div>
      )}

      {/* Tab Content */}
      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {activeTab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-high text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-medium">User</th>
                  <th className="px-6 py-3 font-medium">Role</th>
                  <th className="px-6 py-3 font-medium">Status</th>
                  <th className="px-6 py-3 font-medium">Joined</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-on-surface">
                {initialUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant">
                      No users found.
                    </td>
                  </tr>
                ) : (
                  initialUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium">{user.name || "Unnamed User"}</span>
                          <span className="text-on-surface-variant text-xs">{user.email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={actionLoadingId === user.id || currentUserId === user.id}
                          className="bg-surface border border-outline-variant rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        >
                          {CRM_ROLES.map(role => (
                            <option key={role} value={role}>{role.charAt(0).toUpperCase() + role.slice(1)}</option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                          user.is_active
                            ? "bg-primary-fixed text-on-primary-fixed-variant"
                            : "bg-error-container text-on-error-container"
                        }`}>
                          {user.is_active ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                          {user.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleToggleActive(user.id)}
                          disabled={actionLoadingId === user.id || currentUserId === user.id}
                          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                            user.is_active
                              ? "text-error hover:bg-error/10"
                              : "text-primary hover:bg-primary/10"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {actionLoadingId === user.id ? (
                            <Loader2 size={16} className="animate-spin inline" />
                          ) : (
                            user.is_active ? "Deactivate" : "Activate"
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "invitations" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-high text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-medium">Email</th>
                  <th className="px-6 py-3 font-medium">Intended Role</th>
                  <th className="px-6 py-3 font-medium">Sent At</th>
                  <th className="px-6 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-on-surface">
                {initialPendingInvitations.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-on-surface-variant">
                      {pendingInvitationsWarning ?? "No pending invitations."}
                    </td>
                  </tr>
                ) : (
                  initialPendingInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-surface-container-high/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-on-surface-variant" />
                          <span className="font-medium">{inv.emailAddress}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-surface-container-highest px-2.5 py-1 rounded-md text-xs font-medium">
                          {inv.role.charAt(0).toUpperCase() + inv.role.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {new Date(inv.createdAt).toLocaleString(undefined, { year: 'numeric', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleRevoke(inv.id)}
                          disabled={actionLoadingId === inv.id}
                          className="text-error hover:bg-error/10 text-sm font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {actionLoadingId === inv.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <Trash2 size={16} />
                              <span>Revoke</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
