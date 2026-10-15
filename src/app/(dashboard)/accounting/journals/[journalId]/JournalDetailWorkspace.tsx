"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { postAccountingJournal, reverseAccountingJournal } from "@/lib/accounting/actions";
import { formatHalalahAsSar } from "@/lib/accounting/exact-money";
import type {
  AccountingJournalDetail,
  AccountingJournalVersion,
  AccountingPeriodVersion,
} from "@/lib/accounting/types";
import type { AccountingJournalDictionary } from "@/lib/i18n/dictionaries/accounting-journals";
import type { Locale } from "@/lib/i18n/locales";
import { ManualJournalForm as ManualJournalRevisionForm } from "../JournalOperationsWorkspace";

function ProofField({ label, value, direction = "auto" }: { label: string; value: string | null; direction?: "ltr" | "rtl" | "auto" }) {
  return (
    <div className="grid min-w-0 gap-1">
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-on-surface"><bdi dir={direction}>{value || "—"}</bdi></dd>
    </div>
  );
}

function JournalActionControls({
  detail,
  current,
  periods,
  dictionary,
  canPost,
  canReverse,
  reversalJournalId,
}: {
  detail: AccountingJournalDetail;
  current: AccountingJournalVersion;
  periods: AccountingPeriodVersion[];
  dictionary: AccountingJournalDictionary;
  canPost: boolean;
  canReverse: boolean;
  reversalJournalId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const requestId = useRef<string | null>(null);
  const openPeriods = periods.filter((period) => period.is_current && period.status === "OPEN");
  const canPostCurrent = canPost && current.source_domain === "CONTROLLED_MANUAL" && current.status === "DRAFT";
  const canReverseCurrent = canReverse
    && current.source_domain === "CONTROLLED_MANUAL"
    && current.status === "POSTED"
    && detail.reversal_of_journal_id === null
    && !reversalJournalId;

  function post() {
    const nextRequestId = requestId.current ?? crypto.randomUUID();
    requestId.current = nextRequestId;
    startTransition(async () => {
      try {
        const result = await postAccountingJournal({
          journal_id: detail.journal_id,
          expected_version: detail.current_version,
          request_id: nextRequestId,
        });
        setMessage(result.ok ? dictionary.posted : dictionary.mutationFailed);
        if (result.ok) {
          requestId.current = null;
          router.refresh();
        }
      } catch {
        setMessage(dictionary.mutationFailed);
      }
    });
  }

  function reverse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const period = openPeriods.find((item) => item.period_id === String(data.get("period_id")));
    const accountingDate = String(data.get("accounting_date") ?? "");
    if (!period || accountingDate < period.start_date || accountingDate > period.end_date) {
      setMessage(dictionary.mutationFailed);
      return;
    }
    const nextRequestId = requestId.current ?? crypto.randomUUID();
    requestId.current = nextRequestId;
    const reason = String(data.get("reason") ?? "").trim();
    const evidence = String(data.get("evidence_ref") ?? "").trim();
    startTransition(async () => {
      try {
        const result = await reverseAccountingJournal({
          original_journal_id: detail.journal_id,
          period_id: period.period_id,
          accounting_date: accountingDate,
          reason,
          evidence_ref: evidence || null,
          request_id: nextRequestId,
        });
        setMessage(result.ok ? dictionary.reversed : dictionary.mutationFailed);
        if (result.ok) {
          requestId.current = null;
          router.push("/accounting/journals/" + result.value.journal_id);
          router.refresh();
        }
      } catch {
        setMessage(dictionary.mutationFailed);
      }
    });
  }

  if (!canPostCurrent && !canReverseCurrent) return null;
  return (
    <section className="grid min-w-0 gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
      {canPostCurrent ? (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={post} disabled={isPending} className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary disabled:opacity-50">{isPending ? dictionary.posting : dictionary.post}</button>
        </div>
      ) : null}
      {canReverseCurrent ? (
        <form className="grid min-w-0 gap-3 border-t border-outline-variant pt-4" onSubmit={reverse} onChange={() => { requestId.current = null; setMessage(null); }}>
          <h2 className="text-base font-semibold text-on-surface">{dictionary.reverseTitle}</h2>
          {openPeriods.length === 0 ? <p className="text-sm text-on-surface-variant">{dictionary.noOpenPeriod}</p> : (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                {dictionary.reversePeriod}
                <select name="period_id" required defaultValue="" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                  <option value="" disabled>—</option>
                  {openPeriods.map((period) => <option key={period.period_id + ":" + period.version} value={period.period_id}>{period.start_date} – {period.end_date} · v{period.version}</option>)}
                </select>
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                {dictionary.accountingDate}
                <input name="accounting_date" type="date" required disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                {dictionary.reason}
                <textarea name="reason" required maxLength={2000} rows={2} dir="auto" disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
              </label>
              <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                {dictionary.evidence}
                <textarea name="evidence_ref" maxLength={2000} rows={2} dir="auto" disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
              </label>
              <div className="flex justify-end sm:col-span-2">
                <button type="submit" disabled={isPending || openPeriods.length === 0} className="min-h-11 rounded-md border border-outline-variant px-5 text-sm font-semibold text-on-surface disabled:opacity-50">{isPending ? dictionary.reversing : dictionary.reverse}</button>
              </div>
            </div>
          )}
        </form>
      ) : null}
      {message ? <p role="status" className="text-sm text-on-surface-variant">{message}</p> : null}
    </section>
  );
}

export default function JournalDetailWorkspace({
  locale,
  dictionary,
  detail,
  periods,
  rules,
  accounts,
  canPrepare,
  canReadServices,
  canPost,
  canReverse,
  reversalJournalId,
  today,
}: {
  locale: Locale;
  dictionary: AccountingJournalDictionary;
  detail: AccountingJournalDetail;
  periods: AccountingPeriodVersion[];
  rules: import("@/lib/accounting/types").AccountingPostingRuleVersion[];
  accounts: import("@/lib/accounting/types").AccountingAccountVersion[];
  canPrepare: boolean;
  canReadServices: boolean;
  canPost: boolean;
  canReverse: boolean;
  reversalJournalId: string | null;
  today: string;
}) {
  const current = detail.versions.find((version) => version.version === detail.current_version);
  if (!current) return <section role="status" className="rounded-xl border border-outline-variant p-5 text-sm text-error">{dictionary.dependencyFailure}</section>;
  const isManual = current.source_domain === "CONTROLLED_MANUAL";
  const canRevise = canPrepare && isManual && current.status === "DRAFT";

  return (
    <div className="grid min-w-0 gap-5">
      <Link href="/accounting/journals" className="w-fit text-sm font-semibold text-primary hover:underline">← {dictionary.backToJournals}</Link>
      <section className="grid min-w-0 gap-4 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="grid min-w-0 gap-2">
            <h1 className="text-xl font-semibold text-on-surface">{dictionary.sourceProof}</h1>
            <bdi dir="ltr" className="break-all font-mono text-xs text-on-surface-variant">{detail.journal_id}</bdi>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-semibold">{current.status === "DRAFT" ? dictionary.statusDraft : dictionary.statusPosted}</span>
            <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-semibold">{dictionary.sourceDomains[current.source_domain]}</span>
            <span className="text-xs text-on-surface-variant">{dictionary.currentVersion} <bdi dir="ltr">v{detail.current_version}</bdi></span>
          </div>
        </div>
        {!isManual ? <p className="rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant">{dictionary.manualOnly}</p> : null}
        <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProofField label={dictionary.accountingDate} value={current.accounting_date} direction="ltr" />
          <ProofField label={dictionary.period} value={current.period_id + " · v" + current.period_version} direction="ltr" />
          <ProofField label={dictionary.postingRule} value={current.posting_rule_id + " · v" + current.rule_version} direction="ltr" />
          <ProofField label={dictionary.sourceRecord} value={current.source_record_key} />
          <ProofField label={dictionary.economicEvent} value={current.economic_event_key} />
          <ProofField label={dictionary.purpose} value={current.posting_purpose} />
          <ProofField label={dictionary.description} value={locale === "ar" ? current.description_ar : current.description_en} />
          <ProofField label={dictionary.preparedBy} value={current.prepared_by} direction="ltr" />
          <ProofField label={dictionary.preparedAt} value={current.prepared_at} direction="ltr" />
          <ProofField label={dictionary.postedBy} value={current.posted_by} direction="ltr" />
          <ProofField label={dictionary.postedAt} value={current.posted_at} direction="ltr" />
          <ProofField label={dictionary.correctionGroup} value={detail.correction_group_id} direction="ltr" />
          <ProofField label={dictionary.reversalOf} value={detail.reversal_of_journal_id} direction="ltr" />
          {reversalJournalId ? <ProofField label={dictionary.reversedBy} value={reversalJournalId} direction="ltr" /> : null}
          <ProofField label={dictionary.reason} value={current.reason} />
          <ProofField label={dictionary.evidence} value={current.evidence_ref} />
        </dl>
      </section>

      <JournalActionControls detail={detail} current={current} periods={periods} dictionary={dictionary} canPost={canPost} canReverse={canReverse} reversalJournalId={reversalJournalId} />
      {canRevise ? (
        <ManualJournalRevisionForm
          locale={locale}
          dictionary={dictionary}
          periods={periods}
          rules={rules}
          accounts={accounts}
          canReadServices={canReadServices}
          today={today}
          initial={current}
          journalId={detail.journal_id}
        />
      ) : null}

      <section className="grid min-w-0 gap-3">
        <h2 className="text-lg font-semibold text-on-surface">{dictionary.versionHistory}</h2>
        {detail.versions.slice().sort((left, right) => right.version - left.version).map((version) => (
          <details key={version.version} open={version.version === detail.current_version} className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest">
            <summary className="flex cursor-pointer flex-wrap items-center justify-between gap-2 px-4 py-3 text-sm font-semibold text-on-surface">
              <span>{dictionary.currentVersion} <bdi dir="ltr">v{version.version}</bdi> · {version.status === "DRAFT" ? dictionary.statusDraft : dictionary.statusPosted}</span>
              <span>{dictionary.sourceDomains[version.source_domain]} · <bdi dir="ltr">{version.accounting_date}</bdi></span>
            </summary>
            <div className="grid min-w-0 gap-3 border-t border-outline-variant p-4">
              <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <ProofField label={dictionary.profileId} value={detail.profile_id} direction="ltr" />
                <ProofField label={dictionary.profileVersion} value={"v" + version.profile_version} direction="ltr" />
                <ProofField label={dictionary.previousVersion} value={version.previous_version === null ? null : "v" + version.previous_version} direction="ltr" />
                <ProofField label={dictionary.sourceDomain} value={dictionary.sourceDomains[version.source_domain]} />
                <ProofField label={dictionary.accountingDate} value={version.accounting_date} direction="ltr" />
                <ProofField label={dictionary.period} value={version.period_id + " · v" + version.period_version} direction="ltr" />
                <ProofField label={dictionary.postingRule} value={version.posting_rule_id + " · v" + version.rule_version} direction="ltr" />
                <ProofField label={dictionary.sourceRecord} value={version.source_record_key} />
                <ProofField label={dictionary.economicEvent} value={version.economic_event_key} />
                <ProofField label={dictionary.purpose} value={version.posting_purpose} />
                <ProofField label={dictionary.currency} value={version.currency} direction="ltr" />
                <ProofField label={dictionary.descriptionEn} value={version.description_en} direction="ltr" />
                <ProofField label={dictionary.descriptionAr} value={version.description_ar} direction="rtl" />
                <ProofField label={dictionary.preparedBy} value={version.prepared_by} direction="ltr" />
                <ProofField label={dictionary.preparedAt} value={version.prepared_at} direction="ltr" />
                <ProofField label={dictionary.postedBy} value={version.posted_by} direction="ltr" />
                <ProofField label={dictionary.postedAt} value={version.posted_at} direction="ltr" />
                <ProofField label={dictionary.reason} value={version.reason} />
                <ProofField label={dictionary.evidence} value={version.evidence_ref} />
              </dl>
              <div className="min-w-0 overflow-x-auto rounded-lg border border-outline-variant">
                <table className="w-full min-w-[1080px] border-collapse text-start text-xs">
                  <thead className="bg-surface-container-low text-on-surface-variant">
                    <tr>
                      <th className="px-3 py-2 text-start">{dictionary.lineNumber}</th>
                      <th className="px-3 py-2 text-start">{dictionary.accountSnapshot}</th>
                      <th className="px-3 py-2 text-start">{dictionary.mapping}</th>
                      <th className="px-3 py-2 text-start">{dictionary.side}</th>
                      <th className="px-3 py-2 text-end">{dictionary.amount}</th>
                      <th className="px-3 py-2 text-start">{dictionary.lineDescription}</th>
                      <th className="px-3 py-2 text-start">{dictionary.serviceDetails}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {version.lines.map((line) => (
                      <tr key={line.line_number} className="border-t border-outline-variant">
                        <td className="px-3 py-2"><bdi dir="ltr">{line.line_number}</bdi></td>
                        <td className="px-3 py-2">
                          <div>{dictionary.accountId}: <bdi dir="ltr">{line.account_id}</bdi></div>
                          <div><bdi dir="ltr">{line.account_code}</bdi> · <bdi dir="ltr">{line.name_en}</bdi></div>
                          <div><bdi dir="rtl">{line.name_ar}</bdi></div>
                          <div className="text-on-surface-variant">{dictionary.accountVersion} <bdi dir="ltr">v{line.account_version}</bdi> · {dictionary.accountType}: {line.account_type} · {dictionary.normalBalance}: {line.normal_balance}</div>
                        </td>
                        <td className="px-3 py-2"><bdi dir="ltr">{line.mapping_key}</bdi></td>
                        <td className="px-3 py-2">{line.side === "DEBIT" ? dictionary.debit : dictionary.credit}</td>
                        <td className="px-3 py-2 text-end"><bdi dir="ltr">{formatHalalahAsSar(line.amount_halalah)} SAR</bdi></td>
                        <td className="px-3 py-2">
                          <div>{dictionary.descriptionEn}: <bdi dir="ltr">{line.description_en}</bdi></div>
                          <div>{dictionary.descriptionAr}: <bdi dir="rtl">{line.description_ar}</bdi></div>
                        </td>
                        <td className="px-3 py-2">
                          {line.service_id ? <div>{dictionary.serviceId}: <bdi dir="ltr">{line.service_id}</bdi></div> : null}
                          {line.service_number ? <div>{dictionary.serviceNumber}: <bdi dir="ltr">{line.service_number}</bdi></div> : null}
                          {line.event_name ? <div>{dictionary.eventName}: <bdi dir="auto">{line.event_name}</bdi></div> : null}
                          {line.event_type ? <div>{dictionary.eventType}: <bdi dir="auto">{line.event_type}</bdi></div> : null}
                          {line.event_start_date ? <div>{dictionary.eventStartDate}: <bdi dir="ltr">{line.event_start_date}</bdi></div> : null}
                          {line.event_end_date ? <div>{dictionary.eventEndDate}: <bdi dir="ltr">{line.event_end_date}</bdi></div> : null}
                          {!line.service_id && !line.service_number && !line.event_name && !line.event_type && !line.event_start_date && !line.event_end_date ? "—" : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </details>
        ))}
      </section>
    </div>
  );
}
