import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getAccountingSetupStatus, listAccountingAccounts } from "@/lib/accounting/queries";
import type { AccountingAccountVersion } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingChartDictionary } from "@/lib/i18n/dictionaries/accounting-chart";
import ChartOfAccountsClient, { type ChartPageState } from "./ChartOfAccountsClient";

export default async function ChartOfAccountsPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingChartDictionary(locale);
  let state: ChartPageState = "dependency-failure";
  let accounts: AccountingAccountVersion[] = [];
  let canManage = false;

  try {
    canManage = await checkPermission("accounting:manage_chart");
    if (canManage) {
      // The setup-status RPC is intentionally limited to view/profile managers;
      // the chart-list RPC independently authorizes chart managers.
      accounts = await listAccountingAccounts();
      state = "ready";
    } else {
      const setup = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") {
        state = "not-initialized";
      } else if (setup.state === "RECOVERY_REQUIRED") {
        state = "recovery-required";
      } else {
        accounts = await listAccountingAccounts();
        state = "ready";
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
        <h1 className="text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>
      <ChartOfAccountsClient locale={locale} state={state} accounts={accounts} canManage={canManage} />
    </main>
  );
}
