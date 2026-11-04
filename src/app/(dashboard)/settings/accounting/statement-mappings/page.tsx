import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requireUser } from "@/lib/auth/permissions";
import { getAccountingSetupStatus, getAccountingStatementMappings, listAccountingAccounts } from "@/lib/accounting/queries";
import { resolveAccountingCapability } from "@/lib/accounting/permissions";
import type { AccountingAccountVersion, AccountingStatementMappingReadModel } from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingStatementMappingsDictionary } from "@/lib/i18n/dictionaries/accounting-statement-mappings";
import { getAccountingSetupDictionary } from "@/lib/i18n/dictionaries/accounting-setup";
import { navigationDictionaryAr, navigationDictionaryEn } from "@/lib/i18n/dictionaries/navigation";
import StatementMappingsClient, { type StatementMappingsPageState } from "./StatementMappingsClient";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import PageLocation from "@/components/navigation/PageLocation";
import RecordBackButton from "@/components/navigation/RecordBackButton";

export default async function AccountingStatementMappingsPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingStatementMappingsDictionary(locale);
  const setupDictionary = getAccountingSetupDictionary(locale);
  const accountingLabel = (locale === "ar" ? navigationDictionaryAr : navigationDictionaryEn).modules.accounting;
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
    <div dir={getDirection(locale)} className="min-w-0">
      <PageFrame variant="workspace">
        <PageLocation
          breadcrumbs={{
            label: accountingLabel,
            items: [
              { label: accountingLabel },
              { label: setupDictionary.title },
              { label: dictionary.title, current: true },
            ],
          }}
          returnControl={<RecordBackButton href="/settings/accounting" locale={locale} variant="labeled" label={dictionary.backToSetup} />}
        />
        <PageHeader variant="composed" title={dictionary.title} subtitle={dictionary.subtitle} />
        <StatementMappingsClient locale={locale} state={state} mappings={mappings} accounts={accounts} />
      </PageFrame>
    </div>
  );
}
