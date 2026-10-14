import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { listAccountingCapabilityAssignments, listAccountingSetupTargets } from "@/lib/accounting/queries";
import type { AccountingCapabilityAssignment, AccountingSetupTarget } from "@/lib/accounting/types";
import { getAccountingPermissionsDictionary } from "@/lib/i18n/dictionaries/accounting-permissions";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import AccountingPermissionsClient from "./AccountingPermissionsClient";

type PageProps = {
  searchParams: Promise<{ target_user_id?: string | string[] }>;
};

export default async function AccountingPermissionsPage({ searchParams }: PageProps) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingPermissionsDictionary(locale);
  let targets: AccountingSetupTarget[] = [];
  let assignments: AccountingCapabilityAssignment[] = [];
  let selectedTargetId: string | null = null;
  let accessDenied = false;
  let dependencyFailure = false;

  try {
    await requirePermission("accounting:manage_authority");
    targets = await listAccountingSetupTargets(true);
    const params = await searchParams;
    const requestedTargetId = typeof params.target_user_id === "string" ? params.target_user_id : null;
    const selectedTarget = targets.find((target) => target.id === requestedTargetId) ?? null;
    if (selectedTarget) {
      selectedTargetId = selectedTarget.id;
      assignments = await listAccountingCapabilityAssignments({ target_user_id: selectedTarget.id });
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) accessDenied = true;
    else if (error instanceof AuthDependencyError) dependencyFailure = true;
    else dependencyFailure = true;
  }

  return (
    <main className="mx-auto flex h-full w-full min-w-0 max-w-5xl flex-col gap-6" dir={getDirection(locale)}>
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>
      {accessDenied ? (
        <section className="rounded-lg border border-error/20 bg-error-container p-6 text-on-error-container" role="status">
          <h2 className="text-lg font-semibold">{dictionary.accessDeniedTitle}</h2>
          <p className="mt-2 text-sm">{dictionary.accessDeniedBody}</p>
        </section>
      ) : dependencyFailure ? (
        <section className="rounded-lg border border-error/20 bg-error-container p-6 text-on-error-container" role="status">
          <h2 className="text-lg font-semibold">{dictionary.dependencyFailureTitle}</h2>
          <p className="mt-2 text-sm">{dictionary.dependencyFailureBody}</p>
        </section>
      ) : (
        <AccountingPermissionsClient
          key={selectedTargetId ?? "no-target"}
          locale={locale}
          targets={targets}
          selectedTargetId={selectedTargetId}
          assignments={assignments}
        />
      )}
    </main>
  );
}
