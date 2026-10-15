import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission, getCurrentAppUser } from "@/lib/auth/permissions";
import {
  getAccountingBankReconciliation,
  getAccountingBankReconciliationHistory,
  getAccountingSetupStatus,
  listAccountingBankBindings,
} from "@/lib/accounting/queries";
import type {
  AccountingBankBindingRead,
  AccountingBankReconciliation,
  AccountingBankReconciliationHistory,
  AccountingSetupStatus,
} from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingOperationsDictionary } from "@/lib/i18n/dictionaries/accounting-operations";
import BankReconciliationWorkspace from "./BankReconciliationWorkspace";

type PageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";

function scalar(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function isCalendarDate(value: string | undefined): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export default async function BankReconciliationPage({
  searchParams,
}: {
  searchParams: Promise<{ asOfDate?: string | string[]; bindingId?: string | string[] }>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingOperationsDictionary(locale);
  const params = await searchParams;
  const requestedDate = scalar(params.asOfDate);
  const asOfDate = isCalendarDate(requestedDate)
    ? requestedDate
    : new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
  const recordedAtCutoff = new Date().toISOString();
  let state: PageState = "dependency-failure";
  let bindings: AccountingBankBindingRead[] = [];
  let selectedBindingId: string | null = null;
  let reconciliation: AccountingBankReconciliation | null = null;
  let history: AccountingBankReconciliationHistory | null = null;
  let canReconcile = false;
  let canViewAccounting = false;
  let canViewStatements = false;
  let actorId: string | null = null;

  try {
    const [canView, hasReconcileCapability, canViewStat, appUser] = await Promise.all([
      checkPermission("accounting:view"),
      checkPermission("accounting:reconcile_bank"),
      checkPermission("accounting:view_statements"),
      getCurrentAppUser(),
    ]);
    canViewAccounting = canView;
    canViewStatements = canViewStat;
    canReconcile = hasReconcileCapability;
    actorId = appUser?.id ?? null;
    if (!canView && !hasReconcileCapability) {
      state = "access-denied";
    } else {
      const setup: AccountingSetupStatus = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") state = "not-initialized";
      else if (setup.state === "RECOVERY_REQUIRED") state = "recovery-required";
      else {
        const bindingRead = await listAccountingBankBindings({
          as_of_date: asOfDate,
          recorded_at_cutoff: recordedAtCutoff,
          limit: 200,
        });
        if (bindingRead.state === "NOT_INITIALIZED") {
          state = "not-initialized";
        } else {
          bindings = bindingRead.bindings;
          const requestedBinding = scalar(params.bindingId);
          selectedBindingId = bindings.some((binding) => binding.binding_id === requestedBinding)
            ? requestedBinding ?? null
            : bindings[0]?.binding_id ?? null;
          if (selectedBindingId) {
            [reconciliation, history] = await Promise.all([
              getAccountingBankReconciliation({
                binding_id: selectedBindingId,
                as_of_date: asOfDate,
                recorded_at_cutoff: recordedAtCutoff,
                limit: 200,
              }),
              getAccountingBankReconciliationHistory({
                binding_id: selectedBindingId,
                as_of_date: asOfDate,
                recorded_at_cutoff: recordedAtCutoff,
                limit: 200,
              }),
            ]);
          }
          state = "ready";
        }
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
        <h1 className="text-2xl font-semibold text-on-surface">{dictionary.bank.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.bank.subtitle}</p>
      </header>
      <BankReconciliationWorkspace
        locale={locale}
        dictionary={dictionary}
        state={state}
        bindings={bindings}
        selectedBindingId={selectedBindingId}
        reconciliation={reconciliation}
        history={history}
        asOfDate={asOfDate}
        recordedAtCutoff={recordedAtCutoff}
        canReconcile={canReconcile}
        canViewAccounting={canViewAccounting}
        canViewStatements={canViewStatements}
        actorId={actorId}
      />
    </main>
  );
}
