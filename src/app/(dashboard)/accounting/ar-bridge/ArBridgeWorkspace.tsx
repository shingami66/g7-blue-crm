"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition, type FormEvent } from "react";
import {
  postAccountingArBridgeJournal,
  prepareAccountingArBridgeEvent,
  saveAccountingArBridgeEvent,
} from "@/lib/accounting/actions";
import { formatHalalahAsSar } from "@/lib/accounting/exact-money";
import type {
  AccountingArBridgeClassification,
  AccountingArBridgeReconciliation,
  AccountingArBridgeReconciliationEvent,
  AccountingArBridgeSourceType,
  AccountingPeriodVersion,
  AccountingPostingRuleVersion,
} from "@/lib/accounting/types";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import { UiBidiText, UiLtrText } from "@/components/i18n/UiValueText";
import type { AccountingArBridgeDictionary } from "@/lib/i18n/dictionaries/accounting-ar-bridge";
import type { Locale } from "@/lib/i18n/locales";

type PageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";

const SOURCE_CLASSIFICATIONS: Record<AccountingArBridgeSourceType, AccountingArBridgeClassification[]> = {
  INVOICE: ["UNCONDITIONAL_CONTRACT_LIABILITY", "UNCONDITIONAL_CONTRACT_ASSET"],
  PAYMENT: ["CUSTOMER_ADVANCE"],
  RECEIPT: ["CUSTOMER_ADVANCE"],
  ALLOCATION: ["SETTLEMENT"],
  RECEIPT_REVERSAL: ["REVERSAL"],
  ALLOCATION_REVERSAL: ["REVERSAL"],
  CREDIT_ADJUSTMENT: ["CUSTOMER_LIABILITY", "UNCONDITIONAL_CONTRACT_LIABILITY"],
  CREDIT_ADJUSTMENT_REVERSAL: ["REVERSAL"],
  CREDIT_APPLICATION: ["SETTLEMENT"],
  CREDIT_APPLICATION_REVERSAL: ["REVERSAL"],
  REFUND: ["CUSTOMER_LIABILITY_REFUND"],
  REFUND_REVERSAL: ["REVERSAL"],
};

const HELD_CLASSIFICATIONS: AccountingArBridgeClassification[] = [
  "HELD_UNSUPPORTED_ENTITLEMENT",
  "HELD_UNSUPPORTED_CASH",
  "HELD_REVENUE_CORRECTION",
  "HELD_UNSUPPORTED_TREATMENT",
];

const EVIDENCE_REQUIRED = new Set<AccountingArBridgeClassification>([
  "UNCONDITIONAL_CONTRACT_LIABILITY",
  "UNCONDITIONAL_CONTRACT_ASSET",
  "CUSTOMER_ADVANCE",
  "CUSTOMER_LIABILITY",
  "CUSTOMER_LIABILITY_REFUND",
]);

function mappingKeySets(
  sourceType: AccountingArBridgeSourceType,
  classification: AccountingArBridgeClassification | null,
): string[][] {
  switch (classification) {
    case "UNCONDITIONAL_CONTRACT_LIABILITY":
      return [["AR_CONTROL", "CONTRACT_LIABILITY"]];
    case "UNCONDITIONAL_CONTRACT_ASSET":
      return [["AR_CONTROL", "CONTRACT_ASSET"]];
    case "CUSTOMER_ADVANCE":
      return [["CASH_ACCOUNT", "CUSTOMER_ADVANCE"]];
    case "SETTLEMENT":
      return [["CUSTOMER_ADVANCE", "AR_CONTROL"]];
    case "CUSTOMER_LIABILITY":
      return [["CONTRACT_LIABILITY", "CUSTOMER_ADVANCE"]];
    case "CUSTOMER_LIABILITY_REFUND":
      return [["CUSTOMER_ADVANCE", "CASH_ACCOUNT"]];
    case "REVERSAL":
      if (sourceType === "RECEIPT_REVERSAL" || sourceType === "REFUND_REVERSAL") {
        return [["CUSTOMER_ADVANCE", "CASH_ACCOUNT"]];
      }
      if (sourceType === "CREDIT_ADJUSTMENT_REVERSAL") {
        return [
          ["AR_CONTROL", "CONTRACT_LIABILITY"],
          ["CUSTOMER_ADVANCE", "CONTRACT_LIABILITY"],
        ];
      }
      return [["AR_CONTROL", "CUSTOMER_ADVANCE"]];
    default:
      return [];
  }
}

function matchingPeriods(periods: AccountingPeriodVersion[], event: AccountingArBridgeReconciliationEvent) {
  if (!event.accounting_date) return [];
  return periods.filter((period) =>
    period.is_current
    && period.status === "OPEN"
    && period.start_date <= event.accounting_date!
    && period.end_date >= event.accounting_date!,
  );
}

function matchingRules(
  rules: AccountingPostingRuleVersion[],
  event: AccountingArBridgeReconciliationEvent,
) {
  const keySets = mappingKeySets(event.source_type, event.classification);
  if (keySets.length === 0) return [];
  return rules.filter((rule) => {
    if (!rule.is_current || !rule.is_active) return false;
    const keys = new Set(rule.mappings.map((mapping) => mapping.mapping_key));
    return keySets.some((required) => required.every((key) => keys.has(key)));
  });
}

function money(value: string): string {
  return `SAR ${formatHalalahAsSar(value)}`;
}

function shortId(value: string): string {
  return value.slice(0, 8);
}

export default function ArBridgeWorkspace({
  locale,
  dictionary,
  state,
  reconciliation,
  periods,
  rules,
  asOfDate,
  recordedAtCutoff,
  canManageArBridge,
  canReadJournalConfiguration,
}: {
  locale: Locale;
  dictionary: AccountingArBridgeDictionary;
  state: PageState;
  reconciliation: AccountingArBridgeReconciliation | null;
  periods: AccountingPeriodVersion[];
  rules: AccountingPostingRuleVersion[];
  asOfDate: string;
  recordedAtCutoff: string;
  canManageArBridge: boolean;
  canReadJournalConfiguration: boolean;
}) {
  const ready = state === "ready" && reconciliation?.state === "READY";
  const statusMessage = state === "access-denied"
    ? dictionary.accessDenied
    : state === "not-initialized"
      ? dictionary.notInitialized
      : state === "recovery-required"
        ? dictionary.recoveryRequired
        : state === "dependency-failure"
          ? dictionary.dependencyFailure
          : null;

  return (
    <div className="grid min-w-0 gap-6">
      <form method="get" className="flex flex-wrap items-end gap-3 rounded-lg border border-outline-variant p-3">
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {dictionary.asOfDate}
          <input type="date" name="asOfDate" defaultValue={asOfDate} required className="min-h-10 rounded-md border border-outline-variant bg-surface px-3" />
        </label>
        <button type="submit" className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary">{dictionary.applyDate}</button>
        <p className="text-xs text-on-surface-variant">
          {dictionary.recordedAtCutoff}: <UiDateTimeText locale={locale} value={recordedAtCutoff} />
        </p>
      </form>

      {statusMessage ? (
        <section role="status" className="rounded-lg border border-outline-variant p-4 text-sm text-on-surface-variant">{statusMessage}</section>
      ) : null}

      {ready && reconciliation?.state === "READY" ? (
        <>
          <section aria-labelledby="ar-bridge-summary" className="grid min-w-0 gap-3">
            <h2 id="ar-bridge-summary" className="text-lg font-semibold text-on-surface">{dictionary.summary}</h2>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {[
                [dictionary.sourceEvents, reconciliation.source_event_count],
                [dictionary.postedEffects, reconciliation.posted_effect_count],
                [dictionary.heldEvents, reconciliation.held_unresolved_count],
                [dictionary.missingEffects, reconciliation.missing_effect_count],
                [dictionary.inceptionCovered, reconciliation.inception_covered_count],
                [dictionary.duplicateConflicts, reconciliation.duplicate_conflict_count],
                [dictionary.partyDifferences, reconciliation.party_difference_count],
                [dictionary.timingDifferences, reconciliation.timing_difference_count],
              ].map(([label, value]) => (
                <article key={String(label)} className="min-w-0 rounded-lg border border-outline-variant bg-surface p-3">
                  <p className="text-xs text-on-surface-variant">{label}</p>
                  <p className="mt-1 text-xl font-semibold tabular-nums text-on-surface">{value}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="grid min-w-0 gap-3">
            <h2 className="text-lg font-semibold text-on-surface">{dictionary.partyBalances}</h2>
            {reconciliation.party_balances.length === 0 ? (
              <p className="rounded-lg border border-outline-variant p-4 text-sm text-on-surface-variant">{dictionary.noHistory}</p>
            ) : (
              <div className="max-w-full overflow-x-auto rounded-lg border border-outline-variant">
                <table className="w-full min-w-[760px] text-start text-sm">
                  <thead className="bg-surface-container-low text-xs text-on-surface-variant"><tr>
                    <th className="px-3 py-2 text-start">{dictionary.customer}</th>
                    <th className="px-3 py-2 text-start">{dictionary.service}</th>
                    <th className="px-3 py-2 text-start">{dictionary.invoice}</th>
                    <th className="px-3 py-2 text-end">{dictionary.sourceBalance}</th>
                    <th className="px-3 py-2 text-end">{dictionary.ledgerBalance}</th>
                    <th className="px-3 py-2 text-end">{dictionary.difference}</th>
                  </tr></thead>
                  <tbody>{reconciliation.party_balances.map((balance, index) => (
                    <tr key={`${balance.customer_id}:${balance.service_id ?? "none"}:${balance.invoice_id ?? "none"}:${index}`} className="border-t border-outline-variant">
                      <td className="px-3 py-2"><UiLtrText>{shortId(balance.customer_id)}</UiLtrText></td>
                      <td className="px-3 py-2">{balance.service_id ? <UiLtrText>{shortId(balance.service_id)}</UiLtrText> : "—"}</td>
                      <td className="px-3 py-2">{balance.invoice_id ? <UiLtrText>{shortId(balance.invoice_id)}</UiLtrText> : "—"}</td>
                      <td className="px-3 py-2 text-end tabular-nums"><UiLtrText>{money(balance.source_ar_delta_halalah)}</UiLtrText></td>
                      <td className="px-3 py-2 text-end tabular-nums"><UiLtrText>{money(balance.posted_ar_delta_halalah)}</UiLtrText></td>
                      <td className="px-3 py-2 text-end font-medium tabular-nums"><UiLtrText>{money(balance.difference_halalah)}</UiLtrText></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </section>

          <section className="grid min-w-0 gap-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-lg font-semibold text-on-surface">{dictionary.events}</h2>
              {reconciliation.truncated ? <p className="text-xs text-on-surface-variant">{dictionary.truncated}</p> : null}
            </div>
            {reconciliation.events.length === 0 ? (
              <p className="rounded-lg border border-outline-variant p-4 text-sm text-on-surface-variant">{dictionary.noEvents}</p>
            ) : (
              <div className="space-y-3">
                {reconciliation.events.map((event) => (
                  <ArBridgeEventCard
                    key={`${event.source_type}:${event.source_record_id}:${event.economic_event_key}:${event.event_version ?? 0}`}
                    event={event}
                    locale={locale}
                    dictionary={dictionary}
                    periods={periods}
                    rules={rules}
                    canManageArBridge={canManageArBridge}
                    canReadJournalConfiguration={canReadJournalConfiguration}
                  />
                ))}
              </div>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}

function ArBridgeEventCard({
  event,
  locale,
  dictionary,
  periods,
  rules,
  canManageArBridge,
  canReadJournalConfiguration,
}: {
  event: AccountingArBridgeReconciliationEvent;
  locale: Locale;
  dictionary: AccountingArBridgeDictionary;
  periods: AccountingPeriodVersion[];
  rules: AccountingPostingRuleVersion[];
  canManageArBridge: boolean;
  canReadJournalConfiguration: boolean;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [classification, setClassification] = useState<AccountingArBridgeClassification | "">(
    event.classification ?? SOURCE_CLASSIFICATIONS[event.source_type][0] ?? "",
  );
  const [accountingDate, setAccountingDate] = useState(event.accounting_date ?? event.source_business_date ?? "");
  const [evidenceRef, setEvidenceRef] = useState(event.classification_evidence_ref ?? "");
  const [evidenceHash, setEvidenceHash] = useState(event.classification_evidence_sha256 ?? "");
  const [reason, setReason] = useState(event.classification_reason ?? "");
  const [prepareReason, setPrepareReason] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [selectedRuleId, setSelectedRuleId] = useState("");
  const [actionResult, setActionResult] = useState<{ success: boolean; code?: string } | null>(null);

  const classifiable = canManageArBridge
    && ["MISSING_EFFECT", "HELD"].includes(event.reconciliation_status);
  const heldClassification = classification.startsWith("HELD_");
  const evidenceRequired = classification !== "" && EVIDENCE_REQUIRED.has(classification);
  const eventPeriods = matchingPeriods(periods, event);
  const eventRules = matchingRules(rules, event);
  const currentPeriod = eventPeriods.find((period) => period.period_id === selectedPeriodId) ?? eventPeriods[0];
  const currentRule = eventRules.find((rule) => rule.posting_rule_id === selectedRuleId) ?? eventRules[0];
  const canPrepareFromEvent = event.reconciliation_status === "MISSING_EFFECT"
    && event.event_id !== null
    && event.event_version !== null
    && event.classification !== null
    && event.held_code === null
    && !event.classification.startsWith("HELD_");
  const readyToPrepare = canManageArBridge && canReadJournalConfiguration && canPrepareFromEvent;
  const journalConfigurationUnavailable = canManageArBridge && !canReadJournalConfiguration && canPrepareFromEvent;
  const readyToPost = canManageArBridge
    && event.reconciliation_status === "PREPARED"
    && event.journal_id !== null
    && event.prepared_journal_version !== null;

  function submitClassification(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setActionResult(null);
    if (!classification) return;
    startTransition(async () => {
      try {
        const result = await saveAccountingArBridgeEvent({
          source_type: event.source_type,
          source_record_id: event.source_record_id,
          expected_version: event.event_version ?? 0,
          classification,
          accounting_date: accountingDate || null,
          evidence_ref: evidenceRef.trim() || null,
          evidence_sha256: evidenceHash.trim() || null,
          reason,
          request_id: crypto.randomUUID(),
        });
        if (!result.ok) {
          setActionResult({ success: false, code: result.code });
          return;
        }
        setActionResult({ success: true });
        router.refresh();
      } catch {
        setActionResult({ success: false, code: "dependency_failure" });
      }
    });
  }

  function submitPreparation(formEvent: FormEvent<HTMLFormElement>) {
    formEvent.preventDefault();
    setActionResult(null);
    if (!event.event_id || event.event_version === null || !currentPeriod || !currentRule) return;
    startTransition(async () => {
      try {
        const result = await prepareAccountingArBridgeEvent({
          event_id: event.event_id!,
          event_version: event.event_version!,
          period_id: currentPeriod.period_id,
          period_version: currentPeriod.version,
          posting_rule_id: currentRule.posting_rule_id,
          rule_version: currentRule.version,
          reason: prepareReason,
          request_id: crypto.randomUUID(),
        });
        if (!result.ok) {
          setActionResult({ success: false, code: result.code });
          return;
        }
        setActionResult({ success: true });
        router.refresh();
      } catch {
        setActionResult({ success: false, code: "dependency_failure" });
      }
    });
  }

  function submitPost() {
    setActionResult(null);
    if (!event.journal_id || event.prepared_journal_version === null) return;
    startTransition(async () => {
      try {
        const result = await postAccountingArBridgeJournal({
          journal_id: event.journal_id!,
          expected_version: event.prepared_journal_version,
          request_id: crypto.randomUUID(),
        });
        if (!result.ok) {
          setActionResult({ success: false, code: result.code });
          return;
        }
        setActionResult({ success: true });
        router.refresh();
      } catch {
        setActionResult({ success: false, code: "dependency_failure" });
      }
    });
  }

  return (
    <article className="min-w-0 rounded-lg border border-outline-variant bg-surface p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-on-surface">{dictionary.sourceType[event.source_type]}</h3>
          <p className="mt-1 text-xs text-on-surface-variant">
            <UiLtrText>{shortId(event.source_record_id)} · {event.event_id ? `v${event.event_version}` : "unclassified"}</UiLtrText>
          </p>
        </div>
        <span className="rounded-full bg-surface-container-low px-2 py-1 text-xs">{dictionary.status[event.reconciliation_status]}</span>
      </header>

      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
        <div><dt className="text-xs text-on-surface-variant">{dictionary.customer}</dt><dd><UiLtrText>{shortId(event.customer_id)}</UiLtrText></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.service}</dt><dd>{event.service_id ? <UiLtrText>{shortId(event.service_id)}</UiLtrText> : "—"}</dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.invoice}</dt><dd>{event.invoice_id ? <UiLtrText>{shortId(event.invoice_id)}</UiLtrText> : "—"}{event.invoice_id ? <Link className="ms-2 text-primary underline-offset-4 hover:underline" href={`/invoices/${event.invoice_id}`}>{dictionary.openInvoice}</Link> : null}</dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.amount}</dt><dd className="font-medium tabular-nums"><UiLtrText>{money(event.amount_halalah)}</UiLtrText></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.sourceDate}</dt><dd><UiDateText locale={locale} value={event.source_business_date} /></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.recordedAt}</dt><dd><UiDateTimeText locale={locale} value={event.source_recorded_at} /></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.accountingDate}</dt><dd><UiDateText locale={locale} value={event.accounting_date} /></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.postedDate}</dt><dd><UiDateText locale={locale} value={event.posted_accounting_date} /></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.postedAt}</dt><dd><UiDateTimeText locale={locale} value={event.posted_at} /></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.expectedArDelta}</dt><dd className="tabular-nums"><UiLtrText>{money(event.expected_ar_delta_halalah)}</UiLtrText></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.postedArDelta}</dt><dd className="tabular-nums"><UiLtrText>{money(event.posted_ar_delta_halalah)}</UiLtrText></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.classification}</dt><dd>{event.classification ? dictionary.classificationOption[event.classification] : "—"}</dd></div>
        {event.classification_reason ? <div><dt className="text-xs text-on-surface-variant">{dictionary.classificationReason}</dt><dd className="whitespace-pre-wrap">{event.classification_reason}</dd></div> : null}
        {event.classification_evidence_ref ? <div className="min-w-0"><dt className="text-xs text-on-surface-variant">{dictionary.classificationEvidence}</dt><dd className="break-all"><UiBidiText>{event.classification_evidence_ref}</UiBidiText></dd></div> : null}
        {event.classification_evidence_sha256 ? <div className="min-w-0"><dt className="text-xs text-on-surface-variant">{dictionary.classificationEvidenceHash}</dt><dd className="break-all text-xs"><UiLtrText>{event.classification_evidence_sha256}</UiLtrText></dd></div> : null}
        {event.classified_by ? <div><dt className="text-xs text-on-surface-variant">{dictionary.classifiedBy}</dt><dd><UiLtrText>{shortId(event.classified_by)}</UiLtrText></dd></div> : null}
        {event.classified_at ? <div><dt className="text-xs text-on-surface-variant">{dictionary.classifiedAt}</dt><dd><UiDateTimeText locale={locale} value={event.classified_at} /></dd></div> : null}
        {event.held_code ? <div><dt className="text-xs text-on-surface-variant">{dictionary.heldCode}</dt><dd><UiLtrText>{event.held_code}</UiLtrText></dd></div> : null}
        {event.source_snapshot_sha256 ? <div className="min-w-0"><dt className="text-xs text-on-surface-variant">{dictionary.sourceHash}</dt><dd className="break-all text-xs"><UiLtrText>{event.source_snapshot_sha256}</UiLtrText></dd></div> : null}
        {event.journal_id ? <div><dt className="text-xs text-on-surface-variant">{dictionary.journal}</dt><dd><Link href={`/accounting/journals/${event.journal_id}`} className="text-primary underline-offset-4 hover:underline"><UiLtrText>{shortId(event.journal_id)}</UiLtrText></Link></dd></div> : null}
      </dl>

      {!canManageArBridge ? <p className="mt-4 rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant">{dictionary.readOnly}</p> : null}

      {classifiable ? (
        <form onSubmit={submitClassification} className="mt-4 grid min-w-0 gap-3 border-t border-outline-variant pt-4">
          <h4 className="font-semibold text-on-surface">{event.event_id ? dictionary.updateClassification : dictionary.classify}</h4>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.classification}
              <select value={classification} onChange={(change) => setClassification(change.target.value as AccountingArBridgeClassification)} required className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-2">
                <option value="">{dictionary.chooseClassification}</option>
                {[...SOURCE_CLASSIFICATIONS[event.source_type], ...HELD_CLASSIFICATIONS].map((option) => (
                  <option key={option} value={option}>{dictionary.classificationOption[option]}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-medium text-on-surface">
              {dictionary.accountingDate}
              <input type="date" value={accountingDate} onChange={(change) => setAccountingDate(change.target.value)} required={!heldClassification} className="min-h-10 rounded-md border border-outline-variant bg-surface px-3" />
            </label>
          </div>
          {evidenceRequired ? <p className="text-xs text-on-surface-variant">{dictionary.requiresEvidence}</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.evidenceRef}
              <input value={evidenceRef} onChange={(change) => setEvidenceRef(change.target.value)} maxLength={2000} required={evidenceRequired} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.evidenceHash}
              <input value={evidenceHash} onChange={(change) => setEvidenceHash(change.target.value)} minLength={64} maxLength={64} pattern="[0-9a-f]{64}" required={evidenceRequired} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-mono text-xs" />
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-on-surface">
            {dictionary.reason}
            <textarea value={reason} onChange={(change) => setReason(change.target.value)} maxLength={2000} required rows={3} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2" />
          </label>
          <button type="submit" disabled={isPending || !classification} className="min-h-10 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">{isPending ? dictionary.failed : event.event_id ? dictionary.updateClassification : dictionary.classify}</button>
        </form>
      ) : null}
      {journalConfigurationUnavailable ? <p className="mt-4 rounded-md bg-surface-container-low p-3 text-sm text-on-surface-variant">{dictionary.journalConfigurationUnavailable}</p> : null}

      {readyToPrepare ? (
        <form onSubmit={submitPreparation} className="mt-4 grid min-w-0 gap-3 border-t border-outline-variant pt-4">
          <h4 className="font-semibold text-on-surface">{dictionary.prepare}</h4>
          {!eventPeriods.length ? <p className="text-sm text-on-surface-variant">{dictionary.noOpenPeriod}</p> : null}
          {!eventRules.length ? <p className="text-sm text-on-surface-variant">{dictionary.noMatchingPostingRule}</p> : null}
          <div className="grid gap-3 md:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.period}
              <select value={currentPeriod?.period_id ?? ""} onChange={(change) => setSelectedPeriodId(change.target.value)} required disabled={!eventPeriods.length} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-2 disabled:opacity-50">
                <option value="">{dictionary.choosePeriod}</option>
                {eventPeriods.map((period) => <option key={period.period_id} value={period.period_id}>{period.start_date} – {period.end_date} · v{period.version}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.postingRule}
              <select value={currentRule?.posting_rule_id ?? ""} onChange={(change) => setSelectedRuleId(change.target.value)} required disabled={!eventRules.length} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-2 disabled:opacity-50">
                <option value="">{dictionary.choosePostingRule}</option>
                {eventRules.map((rule) => <option key={rule.posting_rule_id} value={rule.posting_rule_id}>{locale === "ar" ? rule.name_ar : rule.name_en} · {rule.rule_code} · v{rule.version}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-1 text-sm font-medium text-on-surface">
            {dictionary.prepareReason}
            <textarea value={prepareReason} onChange={(change) => setPrepareReason(change.target.value)} maxLength={2000} required rows={2} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2" />
          </label>
          <button type="submit" disabled={isPending || !currentPeriod || !currentRule} className="min-h-10 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">{dictionary.prepare}</button>
        </form>
      ) : null}

      {readyToPost ? (
        <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-outline-variant pt-4">
          <button type="button" onClick={submitPost} disabled={isPending} className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">{dictionary.post}</button>
        </div>
      ) : null}

      {actionResult ? (
        <p role={actionResult.success ? "status" : "alert"} className="mt-4 rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">
          {actionResult.success ? dictionary.success : <>{dictionary.failed} {dictionary.actionCode}: <UiLtrText>{actionResult.code ?? "unknown"}</UiLtrText></>}
        </p>
      ) : null}
    </article>
  );
}
