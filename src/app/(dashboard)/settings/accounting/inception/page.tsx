import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getAccountingSetupStatus, getAccountingInceptionOverview } from "@/lib/accounting/queries";
import { requireUser } from "@/lib/auth/permissions";
import { resolveAccountingCapability } from "@/lib/accounting/permissions";
import type { AccountingInceptionPackageSummary } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingInceptionDictionary } from "@/lib/i18n/dictionaries/accounting-inception";
import { getAccountingSetupDictionary } from "@/lib/i18n/dictionaries/accounting-setup";
import { navigationDictionaryAr, navigationDictionaryEn } from "@/lib/i18n/dictionaries/navigation";
import InceptionPackagesClient, { type InceptionPageState } from "./InceptionPackagesClient";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import PageLocation from "@/components/navigation/PageLocation";
import RecordBackButton from "@/components/navigation/RecordBackButton";

export default async function AccountingInceptionPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingInceptionDictionary(locale);
  const setupDictionary = getAccountingSetupDictionary(locale);
  const settingsLabel = (locale === "ar" ? navigationDictionaryAr : navigationDictionaryEn).modules.settings;
  let state: InceptionPageState = "dependency-failure";
  let packages: AccountingInceptionPackageSummary[] = [];
  let canManage = false;

  try {
    const actor = await requireUser();
    const [canView, canManageInception] = await Promise.all([
      resolveAccountingCapability(actor.id, "accounting:view"),
      resolveAccountingCapability(actor.id, "accounting:manage_inception"),
    ]);
    canManage = canManageInception;
    if (canView || canManageInception) {
      const overview = await getAccountingInceptionOverview();
      if (overview.state === "NOT_INITIALIZED") state = "not-initialized";
      else {
        packages = overview.packages;
        state = packages.length === 0 ? "empty" : "ready";
      }
    } else {
      const setup = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") state = "not-initialized";
      else if (setup.state === "RECOVERY_REQUIRED") state = "recovery-required";
      else state = "access-denied";
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
        <PageLocation
          breadcrumbs={{
            label: settingsLabel,
            items: [
              { label: settingsLabel },
              { label: setupDictionary.title },
              { label: dictionary.accountingInceptionLabel, current: true },
            ],
          }}
          returnControl={<RecordBackButton href="/settings/accounting" locale={locale} variant="labeled" label={dictionary.backToSetup} />}
        />
        <PageHeader variant="composed" title={dictionary.title} subtitle={dictionary.subtitle} />
        <InceptionPackagesClient locale={locale} state={state} packages={packages} canManage={canManage} />
      </PageFrame>
    </div>
  );
}
