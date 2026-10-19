import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { canAccessAccountingArBridge } from "@/lib/accounting/permissions";
import {
  getAccountingArBridgeReconciliation,
  getAccountingSetupStatus,
  listAccountingPeriods,
  listAccountingPostingRules,
} from "@/lib/accounting/queries";
import type {
  AccountingArBridgeReconciliation,
  AccountingPeriodVersion,
  AccountingPostingRuleVersion,
} from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingArBridgeDictionary } from "@/lib/i18n/dictionaries/accounting-ar-bridge";
import ArBridgeWorkspace from "./ArBridgeWorkspace";

type PageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";

function scalar(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function AccountingArBridgePage({
  searchParams,
}: {
  searchParams: Promise<{ asOfDate?: string | string[] }>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingArBridgeDictionary(locale);
  const params = await searchParams;
  const requestedDate = scalar(params.asOfDate);
  const asOfDate = isCalendarDate(requestedDate)
    ? requestedDate
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
  const recordedAtCutoff = new Date().toISOString();
  let state: PageState = "dependency-failure";
  let reconciliation: AccountingArBridgeReconciliation | null = null;
  let periods: AccountingPeriodVersion[] = [];
  let rules: AccountingPostingRuleVersion[] = [];
  let canManageArBridge = false;
  let canReadJournalConfiguration = false;

  try {
    const [canView, canManage] = await Promise.all([
      checkPermission("accounting:view"),
      checkPermission("accounting:manage_ar_bridge"),
    ]);
    canManageArBridge = canManage;
    if (!canAccessAccountingArBridge(canView, canManage)) {
      state = "access-denied";
    } else {
      const [canManageProfile, canManagePeriods, canManageChart] = canView
        ? [false, false, false]
        : await Promise.all([
            checkPermission("accounting:manage_profile"),
            checkPermission("accounting:manage_periods"),
            checkPermission("accounting:manage_chart"),
          ]);
      canReadJournalConfiguration = canView || (canManagePeriods && canManageChart);
      const setup = canView || canManageProfile ? await getAccountingSetupStatus() : null;
      if (setup?.state === "NOT_INITIALIZED") {
        state = "not-initialized";
      } else if (setup?.state === "RECOVERY_REQUIRED") {
        state = "recovery-required";
      } else {
        const [readModel, periodRows, ruleRows] = await Promise.all([
          getAccountingArBridgeReconciliation({
            as_of_date: asOfDate,
            recorded_at_cutoff: recordedAtCutoff,
            limit: 200,
          }),
          canView || canManagePeriods ? listAccountingPeriods() : Promise.resolve([]),
          canView || canManageChart ? listAccountingPostingRules() : Promise.resolve([]),
        ]);
        reconciliation = readModel;
        periods = periodRows;
        rules = ruleRows;
        state = readModel.state === "NOT_INITIALIZED" ? "not-initialized" : "ready";
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
        <p className="mt-2 max-w-4xl text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>
      <ArBridgeWorkspace
        locale={locale}
        dictionary={dictionary}
        state={state}
        reconciliation={reconciliation}
        periods={periods}
        rules={rules}
        asOfDate={asOfDate}
        recordedAtCutoff={recordedAtCutoff}
        canManageArBridge={canManageArBridge}
        canReadJournalConfiguration={canReadJournalConfiguration}
      />
    </main>
  );
}
