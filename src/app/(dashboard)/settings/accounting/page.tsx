import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { checkPermission } from "@/lib/auth/permissions";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getAccountingSetupDictionary } from "@/lib/i18n/dictionaries/accounting-setup";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingSetupStatus, listAccountingSetupTargets } from "@/lib/accounting/queries";
import type { AccountingSetupStatus, AccountingSetupTarget } from "@/lib/accounting/types";
import AccountingSetupClient, { type AccountingSetupNavigationAccess } from "./AccountingSetupClient";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import PageLocation from "@/components/navigation/PageLocation";
import { navigationDictionaryAr, navigationDictionaryEn } from "@/lib/i18n/dictionaries/navigation";

export default async function AccountingSetupPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingSetupDictionary(locale);
  const navigation = locale === "ar" ? navigationDictionaryAr : navigationDictionaryEn;
  const accountingLabel = navigation.modules.accounting;
  let status: AccountingSetupStatus | null = null;
  let targets: AccountingSetupTarget[] = [];
  let accessDenied = false;
  let dependencyFailure = false;
  let navigationAccess: AccountingSetupNavigationAccess = {
    chartOfAccounts: false,
    accountingPeriods: false,
    postingRules: false,
    inception: false,
    statementMappings: false,
    accountingPermissions: false,
  };

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
    if (status.state === "INITIALIZED") {
      const [
        canViewAccounting,
        canManageAccountingChart,
        canManageAccountingPeriods,
        canManageAccountingInception,
        canManageAccountingAuthority,
      ] = await Promise.all([
        checkPermission("accounting:view"),
        checkPermission("accounting:manage_chart"),
        checkPermission("accounting:manage_periods"),
        checkPermission("accounting:manage_inception"),
        checkPermission("accounting:manage_authority"),
      ]);
      navigationAccess = {
        chartOfAccounts: canViewAccounting || canManageAccountingChart,
        accountingPeriods: canViewAccounting || canManageAccountingPeriods,
        postingRules: canViewAccounting || canManageAccountingChart,
        inception: canViewAccounting || canManageAccountingInception,
        statementMappings: canManageAccountingChart,
        accountingPermissions: canManageAccountingAuthority,
      };
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) accessDenied = true;
    else if (error instanceof AuthDependencyError) dependencyFailure = true;
    else dependencyFailure = true;
  }

  return (
    <div dir={getDirection(locale)} className="min-w-0">
      <PageFrame variant="workspace">
        <PageLocation breadcrumbs={{
          label: accountingLabel,
          items: [{ label: accountingLabel }, { label: dictionary.title, current: true }],
        }} />
        <PageHeader variant="composed" title={dictionary.title} subtitle={dictionary.subtitle} />

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
            navigationAccess={navigationAccess}
            requestIds={{
              bootstrap: randomUUID(),
              recovery: randomUUID(),
              succession: randomUUID(),
              profile: randomUUID(),
            }}
          />
        )}
      </PageFrame>
    </div>
  );
}
