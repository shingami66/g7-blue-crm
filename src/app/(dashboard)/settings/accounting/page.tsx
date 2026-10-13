import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getAccountingSetupDictionary } from "@/lib/i18n/dictionaries/accounting-setup";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingSetupStatus, listAccountingSetupTargets } from "@/lib/accounting/queries";
import type { AccountingSetupStatus, AccountingSetupTarget } from "@/lib/accounting/types";
import AccountingSetupClient from "./AccountingSetupClient";

export default async function AccountingSetupPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingSetupDictionary(locale);
  let status: AccountingSetupStatus | null = null;
  let targets: AccountingSetupTarget[] = [];
  let accessDenied = false;
  let dependencyFailure = false;

  try {
    status = await getAccountingSetupStatus();
    if (
      status.state === "NOT_INITIALIZED" ||
      status.state === "RECOVERY_REQUIRED" ||
      (status.state === "INITIALIZED" && status.can_manage_authority)
    ) {
      targets = await listAccountingSetupTargets(
        status.state === "INITIALIZED" && status.can_manage_authority,
      );
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) accessDenied = true;
    else if (error instanceof AuthDependencyError) dependencyFailure = true;
    else dependencyFailure = true;
  }

  return (
    <div className="mx-auto flex h-full w-full min-w-0 max-w-5xl flex-col gap-6" dir={getDirection(locale)}>
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>

      {accessDenied ? (
        <section className="rounded-lg border border-error/20 bg-error-container p-6 text-on-error-container" role="status">
          <h2 className="text-lg font-semibold">{dictionary.accessDeniedTitle}</h2>
          <p className="mt-2 text-sm">{dictionary.accessDeniedBody}</p>
        </section>
      ) : dependencyFailure || !status ? (
        <section className="rounded-lg border border-error/20 bg-error-container p-6 text-on-error-container" role="status">
          <h2 className="text-lg font-semibold">{dictionary.dependencyFailureTitle}</h2>
          <p className="mt-2 text-sm">{dictionary.dependencyFailureBody}</p>
        </section>
      ) : (
        <AccountingSetupClient
          locale={locale}
          status={status}
          targets={targets}
          requestIds={{
            bootstrap: randomUUID(),
            recovery: randomUUID(),
            succession: randomUUID(),
            profile: randomUUID(),
          }}
        />
      )}
    </div>
  );
}
