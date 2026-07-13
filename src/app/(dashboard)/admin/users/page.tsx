import type { Metadata } from "next";
import { getAppUsers } from "@/lib/admin/users/queries";
import { getPendingInvitations } from "@/lib/admin/users/actions";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import {
  getAdminUsersDictionary,
  mapAdminUsersActionError,
} from "@/lib/i18n/dictionaries/admin-users";
import { AdminUsersClient } from "./AdminUsersClient";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAdminUsersDictionary(locale);
  return {
    title:
      locale === "ar"
        ? "إدارة المستخدمين - G7 BLUE CRM"
        : "Admin Users - G7 BLUE CRM",
    description: dictionary.page.subtitle,
  };
}

export default async function AdminUsersPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAdminUsersDictionary(locale);
  const currentUser = await requirePermission("users:manage");

  const [usersResult, pendingInvitationsResult] = await Promise.all([
    getAppUsers(),
    getPendingInvitations(),
  ]);

  if (!usersResult.success) {
    return (
      <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">{dictionary.page.title}</h1>
          <p className="text-sm text-on-surface-variant mt-1">{dictionary.page.subtitle}</p>
        </div>

        <div className="bg-error-container text-on-error-container border border-error/20 rounded-lg p-6">
          <h2 className="text-lg font-semibold">{dictionary.page.loadUsersFailed}</h2>
          <p className="mt-2 text-sm">
            {mapAdminUsersActionError(
              locale,
              usersResult.error,
              dictionary.page.loadUsersFailed,
            )}
          </p>
        </div>
      </div>
    );
  }

  const pendingInvitations =
    pendingInvitationsResult.success && pendingInvitationsResult.data
      ? pendingInvitationsResult.data
      : [];
  const pendingInvitationsWarning = pendingInvitationsResult.success
    ? null
    : dictionary.page.invitationsWarning;

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto w-full">
      <div>
        <h1 className="text-2xl font-bold text-on-surface">{dictionary.page.title}</h1>
        <p className="text-sm text-on-surface-variant mt-1">{dictionary.page.subtitle}</p>
      </div>

      <AdminUsersClient
        initialUsers={usersResult.users}
        initialPendingInvitations={pendingInvitations}
        pendingInvitationsWarning={pendingInvitationsWarning}
        currentUserId={currentUser.id}
        dictionary={dictionary}
      />
    </div>
  );
}
