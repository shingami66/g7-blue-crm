"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Loader2,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  inviteUser,
  updateUserRole,
  setUserActive,
  revokeInvitation,
} from "@/lib/admin/users/actions";
import { CRM_ROLES } from "@/lib/admin/users/schemas";
import type { AppUserRow } from "@/lib/admin/users/queries";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  formatAdminUsersCopy,
  getCrmRoleLabel,
  mapAdminUsersActionError,
  type AdminUsersDictionary,
} from "@/lib/i18n/dictionaries/admin-users";
import { formatUiNumber } from "@/lib/i18n/formatting";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";

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
  dictionary: AdminUsersDictionary;
}

export function AdminUsersClient({
  initialUsers,
  initialPendingInvitations,
  pendingInvitationsWarning,
  currentUserId,
  dictionary,
}: AdminUsersClientProps) {
  const router = useRouter();
  const locale = dictionary.locale;
  const [activeTab, setActiveTab] = useState<"users" | "invitations">("users");
  const [isInviting, setIsInviting] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<string>("viewer");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const [pendingRevokeInvitation, setPendingRevokeInvitation] =
    useState<PendingInvitation | null>(null);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsInviting(true);
    setInviteError("");
    setInviteSuccess("");
    setActionError("");

    const result = await inviteUser({ email: inviteEmail, role: inviteRole });

    if (result.success) {
      setInviteSuccess(
        formatAdminUsersCopy(dictionary.invite.success, { email: inviteEmail }),
      );
      setInviteEmail("");
      setInviteRole("viewer");
      router.refresh();
    } else {
      setInviteError(
        mapAdminUsersActionError(locale, result.error, dictionary.invite.failed),
      );
    }
    setIsInviting(false);
  };

  const handleToggleActive = async (userId: string, currentActive: boolean) => {
    setActionLoadingId(userId);
    setActionError("");
    const result = await setUserActive({ userId, isActive: !currentActive });
    if (result.success) {
      router.refresh();
    } else {
      setActionError(
        mapAdminUsersActionError(
          locale,
          result.error,
          dictionary.clientErrors.updateStatusFailed,
        ),
      );
    }
    setActionLoadingId(null);
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    if (userId === currentUserId) {
      setActionError(dictionary.clientErrors.cannotChangeOwnRole);
      return;
    }

    setActionLoadingId(userId);
    setActionError("");
    const result = await updateUserRole({ userId, role: newRole });
    if (result.success) {
      router.refresh();
    } else {
      setActionError(
        mapAdminUsersActionError(
          locale,
          result.error,
          dictionary.clientErrors.updateRoleFailed,
        ),
      );
    }
    setActionLoadingId(null);
  };

  const openRevokeModal = (invitation: PendingInvitation) => {
    setActionError("");
    setPendingRevokeInvitation(invitation);
  };

  const closeRevokeModal = () => {
    if (pendingRevokeInvitation && actionLoadingId === pendingRevokeInvitation.id) return;
    setPendingRevokeInvitation(null);
  };

  const confirmRevokeInvitation = async () => {
    if (!pendingRevokeInvitation) return;

    setActionLoadingId(pendingRevokeInvitation.id);
    setActionError("");
    const result = await revokeInvitation(pendingRevokeInvitation.id);
    if (result.success) {
      setPendingRevokeInvitation(null);
      setActionError("");
      router.refresh();
    } else {
      setActionError(
        mapAdminUsersActionError(
          locale,
          result.error,
          dictionary.clientErrors.revokeFailed,
        ),
      );
    }
    setActionLoadingId(null);
  };

  const isRevokingPendingInvitation = Boolean(
    pendingRevokeInvitation && actionLoadingId === pendingRevokeInvitation.id,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="bg-surface-container rounded-xl p-6 border border-outline-variant">
        <div className="flex items-center gap-2 mb-4 text-on-surface">
          <UserPlus size={20} />
          <h2 className="text-lg font-semibold">{dictionary.invite.title}</h2>
        </div>

        <form
          onSubmit={handleInvite}
          className="flex flex-col md:flex-row gap-4 items-end"
        >
          <div className="flex-1 w-full">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              {dictionary.invite.email}
            </label>
            <input
              type="email"
              required
              value={inviteEmail}
              onChange={(e) => setInviteEmail(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
              placeholder={dictionary.invite.emailPlaceholder}
              dir="ltr"
            />
          </div>
          <div className="w-full md:w-48">
            <label className="block text-sm font-medium text-on-surface-variant mb-1">
              {dictionary.invite.role}
            </label>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value)}
              className="w-full bg-surface border border-outline-variant rounded-lg px-4 py-2 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {CRM_ROLES.map((role) => (
                <option key={role} value={role}>
                  {getCrmRoleLabel(locale, role)}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={isInviting || !inviteEmail}
            className="w-full md:w-auto bg-primary text-on-primary font-semibold px-6 py-2 rounded-lg hover:bg-primary/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[120px]"
          >
            {isInviting ? (
              <Loader2 size={20} className="animate-spin" aria-label={dictionary.invite.submitting} />
            ) : (
              dictionary.invite.submit
            )}
          </button>
        </form>

        {inviteError && <div className="mt-4 text-error text-sm">{inviteError}</div>}
        {inviteSuccess && (
          <div className="mt-4 text-primary text-sm font-medium">{inviteSuccess}</div>
        )}
      </div>

      <div className="flex border-b border-outline-variant gap-6">
        <button
          type="button"
          onClick={() => setActiveTab("users")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "users"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {formatAdminUsersCopy(dictionary.tabs.users, {
            count: formatUiNumber(locale, initialUsers.length),
          })}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("invitations")}
          className={`pb-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "invitations"
              ? "border-primary text-primary"
              : "border-transparent text-on-surface-variant hover:text-on-surface"
          }`}
        >
          {formatAdminUsersCopy(dictionary.tabs.invitations, {
            count: formatUiNumber(locale, initialPendingInvitations.length),
          })}
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

      <div className="bg-surface-container border border-outline-variant rounded-xl overflow-hidden">
        {activeTab === "users" && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-high text-on-surface-variant">
                <tr>
                  <th className="px-6 py-3 font-medium">{dictionary.usersTable.user}</th>
                  <th className="px-6 py-3 font-medium">{dictionary.usersTable.role}</th>
                  <th className="px-6 py-3 font-medium">{dictionary.usersTable.status}</th>
                  <th className="px-6 py-3 font-medium">{dictionary.usersTable.joined}</th>
                  <th className="px-6 py-3 font-medium text-right">
                    {dictionary.usersTable.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-on-surface">
                {initialUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-on-surface-variant"
                    >
                      {dictionary.usersTable.empty}
                    </td>
                  </tr>
                ) : (
                  initialUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="hover:bg-surface-container-high/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium" dir="auto">
                            {user.name || dictionary.usersTable.unnamed}
                          </span>
                          <span className="text-on-surface-variant text-xs" dir="ltr">
                            {isolateBidiText(user.email)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          disabled={
                            actionLoadingId === user.id || currentUserId === user.id
                          }
                          className="bg-surface border border-outline-variant rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
                        >
                          {CRM_ROLES.map((role) => (
                            <option key={role} value={role}>
                              {getCrmRoleLabel(locale, role)}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            user.is_active
                              ? "bg-primary-fixed text-on-primary-fixed-variant"
                              : "bg-error-container text-on-error-container"
                          }`}
                        >
                          {user.is_active ? (
                            <CheckCircle2 size={14} />
                          ) : (
                            <XCircle size={14} />
                          )}
                          {user.is_active
                            ? dictionary.usersTable.active
                            : dictionary.usersTable.inactive}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        <UiDateText locale={locale} value={user.created_at} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleToggleActive(user.id, user.is_active)}
                          disabled={
                            actionLoadingId === user.id || currentUserId === user.id
                          }
                          className={`text-sm font-medium px-3 py-1.5 rounded-md transition-colors ${
                            user.is_active
                              ? "text-error hover:bg-error/10"
                              : "text-primary hover:bg-primary/10"
                          } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                          {actionLoadingId === user.id ? (
                            <Loader2 size={16} className="animate-spin inline" />
                          ) : user.is_active ? (
                            dictionary.usersTable.deactivate
                          ) : (
                            dictionary.usersTable.activate
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
                  <th className="px-6 py-3 font-medium">
                    {dictionary.invitationsTable.email}
                  </th>
                  <th className="px-6 py-3 font-medium">
                    {dictionary.invitationsTable.intendedRole}
                  </th>
                  <th className="px-6 py-3 font-medium">
                    {dictionary.invitationsTable.sentAt}
                  </th>
                  <th className="px-6 py-3 font-medium text-right">
                    {dictionary.invitationsTable.actions}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant text-on-surface">
                {initialPendingInvitations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-8 text-center text-on-surface-variant"
                    >
                      {pendingInvitationsWarning ?? dictionary.invitationsTable.empty}
                    </td>
                  </tr>
                ) : (
                  initialPendingInvitations.map((inv) => (
                    <tr
                      key={inv.id}
                      className="hover:bg-surface-container-high/50 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Mail size={16} className="text-on-surface-variant" />
                          <span className="font-medium" dir="ltr">
                            {isolateBidiText(inv.emailAddress)}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="bg-surface-container-highest px-2.5 py-1 rounded-md text-xs font-medium">
                          {getCrmRoleLabel(locale, inv.role)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        <UiDateTimeText locale={locale} value={inv.createdAt} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => openRevokeModal(inv)}
                          disabled={actionLoadingId === inv.id}
                          className="text-error hover:bg-error/10 text-sm font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-50 inline-flex items-center gap-1.5"
                        >
                          {actionLoadingId === inv.id ? (
                            <Loader2 size={16} className="animate-spin" />
                          ) : (
                            <>
                              <Trash2 size={16} />
                              <span>{dictionary.invitationsTable.revoke}</span>
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

      {pendingRevokeInvitation && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-surface/80 px-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="revoke-invitation-title"
        >
          <div className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container p-6 shadow-xl">
            <div className="flex items-start gap-3">
              <div className="rounded-full bg-error-container p-2 text-error">
                <Trash2 size={20} />
              </div>
              <div className="min-w-0 flex-1">
                <h2
                  id="revoke-invitation-title"
                  className="text-lg font-semibold text-on-surface"
                >
                  {dictionary.revokeModal.title}
                </h2>
                <p className="mt-2 text-sm text-on-surface-variant">
                  {formatAdminUsersCopy(dictionary.revokeModal.body, {
                    email: pendingRevokeInvitation.emailAddress,
                  })}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="mt-4 rounded-lg border border-error/20 bg-error-container/40 p-3 text-sm text-on-error-container">
                {actionError}
              </div>
            )}

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={closeRevokeModal}
                disabled={isRevokingPendingInvitation}
                className="rounded-lg border border-outline-variant px-4 py-2 text-sm font-medium text-on-surface hover:bg-surface-container-high disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dictionary.revokeModal.cancel}
              </button>
              <button
                type="button"
                onClick={confirmRevokeInvitation}
                disabled={isRevokingPendingInvitation}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isRevokingPendingInvitation && (
                  <Loader2 size={16} className="animate-spin" />
                )}
                <span>{dictionary.revokeModal.confirm}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
