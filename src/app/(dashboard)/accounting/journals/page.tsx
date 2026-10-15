import { redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import {
  getAccountingSetupStatus,
  listAccountingAccounts,
  listAccountingPeriods,
  listAccountingPostingRules,
} from "@/lib/accounting/queries";
import { listAccountingJournals } from "@/lib/accounting/journal-operations-queries";
import type {
  AccountingAccountVersion,
  AccountingPeriodVersion,
  AccountingPostingRuleVersion,
  AccountingSetupStatus,
} from "@/lib/accounting/types";
import type { AccountingJournalListItem } from "@/lib/accounting/journal-operations-queries";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingJournalsDictionary } from "@/lib/i18n/dictionaries/accounting-journals";
import JournalOperationsWorkspace from "./JournalOperationsWorkspace";

type PageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";

export default async function JournalOperationsPage({
  searchParams,
}: {
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingJournalsDictionary(locale);
  const params = await searchParams;
  const cursor = Array.isArray(params.cursor) ? params.cursor[0] : params.cursor;
  let state: PageState = "dependency-failure";
  let journals: AccountingJournalListItem[] = [];
  let nextCursor: string | null = null;
  let periods: AccountingPeriodVersion[] = [];
  let rules: AccountingPostingRuleVersion[] = [];
  let accounts: AccountingAccountVersion[] = [];
  let canPrepare = false;
  let canReadServices = false;

  try {
    const [canView, preparePermission, servicePermission] = await Promise.all([
      checkPermission("accounting:view"),
      checkPermission("accounting:prepare_journal"),
      checkPermission("services:read"),
    ]);
    canPrepare = preparePermission;
    canReadServices = servicePermission;
    if (!canView) {
      state = "access-denied";
    } else {
      const setup: AccountingSetupStatus = await getAccountingSetupStatus();
      if (setup.state === "NOT_INITIALIZED") state = "not-initialized";
      else if (setup.state === "RECOVERY_REQUIRED") state = "recovery-required";
      else {
        const [journalPage, periodRows, ruleRows, accountRows] = await Promise.all([
          listAccountingJournals(cursor),
          listAccountingPeriods(),
          listAccountingPostingRules(),
          listAccountingAccounts(),
        ]);
        journals = journalPage.items;
        nextCursor = journalPage.nextCursor;
        periods = periodRows;
        rules = ruleRows;
        accounts = accountRows;
        state = "ready";
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) state = "access-denied";
    else if (error instanceof AuthDependencyError) state = "dependency-failure";
    else state = "dependency-failure";
  }

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
  return (
    <main className="mx-auto flex h-full w-full min-w-0 max-w-6xl flex-col gap-6" dir={getDirection(locale)}>
      <header className="min-w-0">
        <h1 className="text-2xl font-semibold text-on-surface">{dictionary.title}</h1>
        <p className="mt-2 text-sm text-on-surface-variant">{dictionary.subtitle}</p>
      </header>
      <JournalOperationsWorkspace
        locale={locale}
        dictionary={dictionary}
        state={state}
        journals={journals}
        nextCursor={nextCursor}
        periods={periods}
        rules={rules}
        accounts={accounts}
        canPrepare={canPrepare}
        canReadServices={canReadServices}
        today={today}
      />
    </main>
  );
}
