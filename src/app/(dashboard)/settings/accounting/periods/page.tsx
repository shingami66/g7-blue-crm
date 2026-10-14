import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getAccountingSetupStatus, listAccountingPeriods } from "@/lib/accounting/queries";
import type { AccountingPeriodVersion } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingPeriodsDictionary } from "@/lib/i18n/dictionaries/accounting-periods";
import PeriodsClient, { type PeriodsPageState } from "./PeriodsClient";

export default async function AccountingPeriodsPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingPeriodsDictionary(locale);
  let state: PeriodsPageState = "dependency-failure";
  let periods: AccountingPeriodVersion[] = [];
  let canManage = false;

  try {
    canManage = await checkPermission("accounting:manage_periods");
    if (canManage) {
      // Period managers can use the independently authorized list RPC without setup-status access.
      periods = await listAccountingPeriods();
      state = "ready";
    } else {
      const setup = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") state = "not-initialized";
      else if (setup.state === "RECOVERY_REQUIRED") state = "recovery-required";
      else {
        periods = await listAccountingPeriods();
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
      <PeriodsClient locale={locale} state={state} periods={periods} canManage={canManage} />
    </main>
  );
}
