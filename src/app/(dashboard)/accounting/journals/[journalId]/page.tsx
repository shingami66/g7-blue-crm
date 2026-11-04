import { notFound, redirect } from "next/navigation";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import {
  getAccountingJournal,
  listAccountingAccounts,
  listAccountingPeriods,
  listAccountingPostingRules,
} from "@/lib/accounting/queries";
import { getAccountingJournalReversalId } from "@/lib/accounting/journal-operations-queries";
import type {
  AccountingAccountVersion,
  AccountingJournalDetail,
  AccountingPeriodVersion,
  AccountingPostingRuleVersion,
} from "@/lib/accounting/types";
import { getDirection } from "@/lib/i18n";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getAccountingJournalsDictionary } from "@/lib/i18n/dictionaries/accounting-journals";
import { navigationDictionaryAr, navigationDictionaryEn } from "@/lib/i18n/dictionaries/navigation";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import PageLocation from "@/components/navigation/PageLocation";
import RecordBackButton from "@/components/navigation/RecordBackButton";
import JournalDetailWorkspace from "./JournalDetailWorkspace";

type PageState = "ready" | "access-denied" | "dependency-failure" | "not-found";

export default async function JournalDetailPage({
  params,
}: {
  params: Promise<{ journalId: string }>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getAccountingJournalsDictionary(locale);
  const { journalId } = await params;
  let state: PageState = "dependency-failure";
  let detail: AccountingJournalDetail | null = null;
  let periods: AccountingPeriodVersion[] = [];
  let rules: AccountingPostingRuleVersion[] = [];
  let accounts: AccountingAccountVersion[] = [];
  let canPrepare = false;
  let canReadServices = false;
  let canPost = false;
  let canReverse = false;
  let reversalJournalId: string | null = null;

  try {
    const [canView, preparePermission, servicePermission, postPermission, reversePermission] = await Promise.all([
      checkPermission("accounting:view"),
      checkPermission("accounting:prepare_journal"),
      checkPermission("services:read"),
      checkPermission("accounting:post_journal"),
      checkPermission("accounting:reverse_journal"),
    ]);
    canPrepare = preparePermission;
    canReadServices = servicePermission;
    canPost = postPermission;
    canReverse = reversePermission;
    if (!canView) {
      state = "access-denied";
    } else {
      detail = await getAccountingJournal(journalId);
      if (!detail) {
        state = "not-found";
      } else {
        const current = detail.versions.find((version) => version.version === detail!.current_version);
        const canUseManualTools = current?.source_domain === "CONTROLLED_MANUAL";
        const [periodRows, ruleRows, accountRows, reverseId] = await Promise.all([
          listAccountingPeriods(),
          canPrepare && canUseManualTools ? listAccountingPostingRules() : Promise.resolve([]),
          canPrepare && canUseManualTools ? listAccountingAccounts() : Promise.resolve([]),
          canUseManualTools && current?.status === "POSTED" && detail.reversal_of_journal_id === null
            ? getAccountingJournalReversalId(journalId)
            : Promise.resolve(null),
        ]);
        periods = periodRows;
        rules = ruleRows;
        accounts = accountRows;
        reversalJournalId = reverseId;
        state = "ready";
      }
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) state = "access-denied";
    else if (error instanceof AuthDependencyError) state = "dependency-failure";
    else state = "dependency-failure";
  }

  if (state === "not-found") notFound();
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Riyadh" }).format(new Date());
  const accountingLabel = (locale === "ar" ? navigationDictionaryAr : navigationDictionaryEn).modules.accounting;
  const visibleJournalId = state === "ready" && detail
    && detail.versions.some((version) => version.version === detail.current_version)
    ? detail.journal_id
    : undefined;
  const message = state === "access-denied" ? dictionary.accessDenied : dictionary.dependencyFailure;
  return (
    <div dir={getDirection(locale)} className="min-w-0">
      <PageFrame variant="record">
        <PageLocation
          breadcrumbs={{
            label: accountingLabel,
            items: [
              { label: accountingLabel },
              { label: dictionary.title, href: "/accounting/journals" },
              { label: dictionary.journalDetail, ...(visibleJournalId ? { identifier: visibleJournalId } : {}), current: true },
            ],
          }}
          returnControl={<RecordBackButton href="/accounting/journals" locale={locale} variant="labeled" label={dictionary.backToJournals} />}
        />
        <PageHeader variant="composed" title={dictionary.journalDetail} />
        {state === "ready" && detail ? (
          <JournalDetailWorkspace
            locale={locale}
            dictionary={dictionary}
            detail={detail}
            periods={periods}
            rules={rules}
            accounts={accounts}
            canPrepare={canPrepare}
            canReadServices={canReadServices}
            canPost={canPost}
            canReverse={canReverse}
            reversalJournalId={reversalJournalId}
            today={today}
          />
        ) : (
          <section role="status" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-sm text-on-surface-variant">{message}</section>
        )}
      </PageFrame>
    </div>
  );
}
