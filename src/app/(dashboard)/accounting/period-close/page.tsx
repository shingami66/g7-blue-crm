import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission, getCurrentAppUser } from "@/lib/auth/permissions";
import {
  getAccountingPeriodCloseEvidence,
  getAccountingSetupStatus,
  listAccountingPeriods,
} from "@/lib/accounting/queries";
import type {
  AccountingPeriodCloseReadModel,
  AccountingPeriodVersion,
  AccountingSetupStatus,
} from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingOperationsDictionary } from "@/lib/i18n/dictionaries/accounting-operations";
import PeriodCloseWorkspace from "./PeriodCloseWorkspace";

type PageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";

function scalar(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function PeriodClosePage({
  searchParams,
}: {
  searchParams: Promise<{ periodId?: string | string[] }>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingOperationsDictionary(locale);
  const params = await searchParams;
  const recordedAtCutoff = new Date().toISOString();
  let state: PageState = "dependency-failure";
  let periods: AccountingPeriodVersion[] = [];
  let selectedPeriodId: string | null = null;
  let evidence: AccountingPeriodCloseReadModel | null = null;
  let canClosePeriod = false;
  let canReopenPeriod = false;
  let canViewStatements = false;
  let actorId: string | null = null;

  try {
    const [canView, canClose, canReopen, canViewStat, appUser] = await Promise.all([
      checkPermission("accounting:view"),
      checkPermission("accounting:close_period"),
      checkPermission("accounting:reopen_period"),
      checkPermission("accounting:view_statements"),
      getCurrentAppUser(),
    ]);
    canClosePeriod = canClose;
    canReopenPeriod = canReopen;
    canViewStatements = canViewStat;
    actorId = appUser?.id ?? null;
    if (!canView) {
      state = "access-denied";
    } else {
      const setup: AccountingSetupStatus = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") state = "not-initialized";
      else if (setup.state === "RECOVERY_REQUIRED") state = "recovery-required";
      else {
        periods = await listAccountingPeriods();
        const requestedPeriodId = scalar(params.periodId);
        selectedPeriodId = periods.some((period) => period.period_id === requestedPeriodId)
          ? requestedPeriodId ?? null
          : periods[0]?.period_id ?? null;
        if (selectedPeriodId) {
          evidence = await getAccountingPeriodCloseEvidence({
            period_id: selectedPeriodId,
            recorded_at_cutoff: recordedAtCutoff,
          });
        }
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
        <h1 className="text-2xl font-semibold text-on-surface">{dictionary.period.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.period.subtitle}</p>
      </header>
      <PeriodCloseWorkspace
        locale={locale}
        dictionary={dictionary}
        state={state}
        periods={periods}
        selectedPeriodId={selectedPeriodId}
        evidence={evidence}
        recordedAtCutoff={recordedAtCutoff}
        canClosePeriod={canClosePeriod}
        canReopenPeriod={canReopenPeriod}
        canViewStatements={canViewStatements}
        actorId={actorId}
      />
    </main>
  );
}
