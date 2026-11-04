import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getAccountingSetupStatus, listAccountingPeriods } from "@/lib/accounting/queries";
import type { AccountingPeriodVersion } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingPeriodsDictionary } from "@/lib/i18n/dictionaries/accounting-periods";
import { getAccountingSetupDictionary } from "@/lib/i18n/dictionaries/accounting-setup";
import { navigationDictionaryAr, navigationDictionaryEn } from "@/lib/i18n/dictionaries/navigation";
import PeriodsClient, { type PeriodsPageState } from "./PeriodsClient";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import PageLocation from "@/components/navigation/PageLocation";

export default async function AccountingPeriodsPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingPeriodsDictionary(locale);
  const setupDictionary = getAccountingSetupDictionary(locale);
  const settingsLabel = (locale === "ar" ? navigationDictionaryAr : navigationDictionaryEn).modules.settings;
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
    <div dir={getDirection(locale)} className="min-w-0">
      <PageFrame variant="workspace">
        <PageLocation breadcrumbs={{
          label: settingsLabel,
          items: [
            { label: settingsLabel },
            { label: setupDictionary.title },
            { label: dictionary.title, current: true },
          ],
        }} />
        <PageHeader variant="composed" title={dictionary.title} subtitle={dictionary.subtitle} />
        <PeriodsClient locale={locale} state={state} periods={periods} canManage={canManage} />
      </PageFrame>
    </div>
  );
}
