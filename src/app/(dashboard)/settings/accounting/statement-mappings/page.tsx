import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/permissions";
import { getAccountingSetupStatus, getAccountingStatementMappings, listAccountingAccounts } from "@/lib/accounting/queries";
import { resolveAccountingCapability } from "@/lib/accounting/permissions";
import type { AccountingAccountVersion, AccountingStatementMappingReadModel } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingStatementMappingsDictionary } from "@/lib/i18n/dictionaries/accounting-statement-mappings";
import StatementMappingsClient, { type StatementMappingsPageState } from "./StatementMappingsClient";

export default async function AccountingStatementMappingsPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingStatementMappingsDictionary(locale);
  let state: StatementMappingsPageState = "dependency-failure";
  let mappings: AccountingStatementMappingReadModel = { state: "NOT_INITIALIZED" };
  let accounts: AccountingAccountVersion[] = [];

  try {
    const actor = await requireUser();
    const canManage = await resolveAccountingCapability(actor.id, "accounting:manage_chart");
    if (!canManage) {
      const setup = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") state = "not-initialized";
      else if (setup.state === "RECOVERY_REQUIRED") state = "recovery-required";
      else state = "access-denied";
    } else {
      mappings = await getAccountingStatementMappings();
      if (mappings.state === "NOT_INITIALIZED") state = "not-initialized";
      else {
        accounts = await listAccountingAccounts();
        state = mappings.state === "EMPTY" ? "empty" : "ready";
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) state = "access-denied";
    else if (error instanceof AuthDependencyError) state = "dependency-failure";
    else state = "dependency-failure";
  }

  return (
    <main className="mx-auto flex h-full w-full min-w-0 max-w-6xl flex-col gap-6" dir={getDirection(locale)}>
      <header className="min-w-0">
        <Link href="/settings/accounting" className="text-sm font-semibold text-primary underline underline-offset-4">{dictionary.backToSetup}</Link>
        <h1 className="mt-3 text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>
      <StatementMappingsClient locale={locale} state={state} mappings={mappings} accounts={accounts} />
    </main>
  );
}
