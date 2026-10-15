"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { prepareAccountingJournal } from "@/lib/accounting/actions";
import { parseSarAsHalalah } from "@/lib/accounting/journal-operations";
import type {
  AccountingAccountVersion,
  AccountingActionResult,
  AccountingJournalInput,
  AccountingJournalVersion,
  AccountingPeriodVersion,
  AccountingPostingRuleVersion,
} from "@/lib/accounting/types";
import type { AccountingJournalListItem } from "@/lib/accounting/journal-operations-queries";
import type { AccountingJournalDictionary } from "@/lib/i18n/dictionaries/accounting-journals";
import type { Locale } from "@/lib/i18n/locales";
import { formatHalalahAsSar } from "@/lib/accounting/exact-money";
import { lookupJournalService } from "./actions";

type WorkspaceState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type DraftLine = {
  id: string;
  mapping_key: string;
  side: "DEBIT" | "CREDIT";
  amount_sar: string;
  service_id: string | null;
  service_number: string;
  service_label: string;
  service_state: "idle" | "found" | "missing" | "failed";
  description_en: string;
  description_ar: string;
};

function newLine(mappingKey = ""): DraftLine {
  return {
    id: crypto.randomUUID(),
    mapping_key: mappingKey,
    side: "DEBIT",
    amount_sar: "",
    service_id: null,
    service_number: "",
    service_label: "",
    service_state: "idle",
    description_en: "",
    description_ar: "",
  };
}

function sarFromHalalah(value: string): string {
  const amount = BigInt(value);
  return (amount / BigInt(100)).toString() + "." + String(amount % BigInt(100)).padStart(2, "0");
}

function exactTotal(lines: DraftLine[], side: DraftLine["side"]): bigint {
  return lines.reduce((total, line) => {
    if (line.side !== side) return total;
    const amount = parseSarAsHalalah(line.amount_sar);
    return total + (amount ? BigInt(amount) : BigInt(0));
  }, BigInt(0));
}

function formatTotal(value: bigint): string {
  return formatHalalahAsSar(value.toString());
}

function accountForMapping(
  mappingKey: string,
  rule: AccountingPostingRuleVersion | undefined,
  accounts: AccountingAccountVersion[],
) {
  const mapping = rule?.mappings.find((candidate) => candidate.mapping_key === mappingKey);
  const account = mapping
    ? accounts.find((candidate) => candidate.account_id === mapping.account_id && candidate.version === mapping.account_version)
    : undefined;
  return { mapping, account };
}

export function ManualJournalForm({
  locale,
  dictionary,
  periods,
  rules,
  accounts,
  canReadServices,
  today,
  initial,
  journalId,
}: {
  locale: Locale;
  dictionary: AccountingJournalDictionary;
  periods: AccountingPeriodVersion[];
  rules: AccountingPostingRuleVersion[];
  accounts: AccountingAccountVersion[];
  canReadServices: boolean;
  today: string;
  initial?: AccountingJournalVersion;
  journalId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [lines, setLines] = useState<DraftLine[]>(() => initial?.lines.map((line) => ({
    id: crypto.randomUUID(),
    mapping_key: line.mapping_key,
    side: line.side,
    amount_sar: sarFromHalalah(line.amount_halalah),
    service_id: line.service_id,
    service_number: line.service_number ?? "",
    service_label: [line.service_number, line.event_name].filter(Boolean).join(" · "),
    service_state: line.service_id ? "found" : "idle",
    description_en: line.description_en,
    description_ar: line.description_ar,
  })) ?? [newLine(), newLine()]);
  const [selectedRuleId, setSelectedRuleId] = useState(initial?.posting_rule_id ?? "");
  const [result, setResult] = useState<AccountingActionResult<{ journal_id: string; version: number; status: "DRAFT" | "POSTED" }> | null>(null);
  const [localProblem, setLocalProblem] = useState<"amount" | "balance" | "service" | null>(null);
  const requestId = useRef<string | null>(null);
  const openPeriods = periods.filter((period) => period.is_current && period.status === "OPEN");
  const activeRules = rules.filter((rule) => rule.is_current && rule.is_active);
  const selectedRule = activeRules.find((rule) => rule.posting_rule_id === selectedRuleId);
  const debit = exactTotal(lines, "DEBIT");
  const credit = exactTotal(lines, "CREDIT");
  const allAmountsValid = lines.every((line) => parseSarAsHalalah(line.amount_sar) !== null);
  const balanced = lines.length >= 2 && allAmountsValid && debit > BigInt(0) && debit === credit;

  function updateLine(id: string, update: Partial<DraftLine>) {
    setLines((current) => current.map((line) => line.id === id ? { ...line, ...update } : line));
    requestId.current = null;
    setResult(null);
    setLocalProblem(null);
  }

  function chooseMapping(id: string, mappingKey: string) {
    const mapping = selectedRule?.mappings.find((item) => item.mapping_key === mappingKey);
    updateLine(id, {
      mapping_key: mappingKey,
      side: mapping?.allowed_side === "CREDIT" ? "CREDIT" : "DEBIT",
      service_id: null,
      service_number: "",
      service_label: "",
      service_state: "idle",
    });
  }

  async function resolveService(line: DraftLine) {
    try {
      const service = await lookupJournalService(line.service_number);
      if (!service) {
        updateLine(line.id, { service_id: null, service_label: "", service_state: "missing" });
        return;
      }
      const label = [service.service_number, service.event_name, service.service_title].filter(Boolean).join(" · ");
      updateLine(line.id, {
        service_id: service.id,
        service_number: service.service_number,
        service_label: label,
        service_state: "found",
      });
    } catch {
      updateLine(line.id, { service_id: null, service_label: "", service_state: "failed" });
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const period = openPeriods.find((item) => item.period_id === String(data.get("period_id")));
    const rule = activeRules.find((item) => item.posting_rule_id === selectedRuleId);
    const accountingDate = String(data.get("accounting_date") ?? "");
    const hasValidDate = period && accountingDate >= period.start_date && accountingDate <= period.end_date;
    const preparedLines = lines.map((line) => ({
      line,
      amount: parseSarAsHalalah(line.amount_sar),
      mapping: rule?.mappings.find((item) => item.mapping_key === line.mapping_key),
    }));
    if (preparedLines.some(({ amount }) => !amount)) {
      setLocalProblem("amount");
      return;
    }
    if (!hasValidDate || !rule || !balanced || preparedLines.some(({ mapping }) => !mapping)) {
      setLocalProblem("balance");
      return;
    }
    if (preparedLines.some(({ line, mapping }) =>
      (mapping?.service_requirement === "REQUIRED" && !line.service_id) ||
      (mapping?.service_requirement === "FORBIDDEN" && line.service_id) ||
      (line.service_number.trim() !== "" && !line.service_id),
    )) {
      setLocalProblem("service");
      return;
    }
    const reason = String(data.get("reason") ?? "").trim();
    const evidence = String(data.get("evidence_ref") ?? "").trim();
    const journal: AccountingJournalInput = {
      accounting_date: accountingDate,
      period_id: period.period_id,
      period_version: period.version,
      posting_rule_id: rule.posting_rule_id,
      rule_version: rule.version,
      source_record_key: String(data.get("source_record_key") ?? "").trim(),
      economic_event_key: String(data.get("economic_event_key") ?? "").trim(),
      posting_purpose: String(data.get("posting_purpose") ?? "").trim(),
      description_en: String(data.get("description_en") ?? "").trim(),
      description_ar: String(data.get("description_ar") ?? "").trim(),
      lines: preparedLines.map(({ line, amount }) => ({
        mapping_key: line.mapping_key,
        side: line.side,
        amount_halalah: amount!,
        service_id: line.service_id,
        description_en: line.description_en.trim(),
        description_ar: line.description_ar.trim(),
      })),
    };
    const nextRequestId = requestId.current ?? crypto.randomUUID();
    requestId.current = nextRequestId;
    setLocalProblem(null);
    startTransition(async () => {
      let nextResult: AccountingActionResult<{ journal_id: string; version: number; status: "DRAFT" | "POSTED" }>;
      try {
        nextResult = await prepareAccountingJournal({
          journal_id: journalId ?? null,
          expected_version: initial?.version ?? 0,
          journal,
          reason,
          evidence_ref: evidence || null,
          request_id: nextRequestId,
        });
      } catch {
        nextResult = { ok: false, code: "dependency_failure" };
      }
      setResult(nextResult);
      if (nextResult.ok) {
        requestId.current = null;
        router.push("/accounting/journals/" + nextResult.value.journal_id);
        router.refresh();
      }
    });
  }

  const message = localProblem === "amount" ? dictionary.invalidAmount
    : localProblem === "balance" ? dictionary.invalidBalance
    : localProblem === "service" ? dictionary.invalidService
    : result?.ok ? dictionary.created
    : result ? dictionary.mutationFailed
    : null;

  return (
    <section className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
      <h2 className="text-lg font-semibold text-on-surface">{initial ? dictionary.editTitle : dictionary.createTitle}</h2>
      {openPeriods.length === 0 ? <p className="mt-3 text-sm text-on-surface-variant">{dictionary.noOpenPeriod}</p> : null}
      {activeRules.length === 0 ? <p className="mt-2 text-sm text-on-surface-variant">{dictionary.noActiveRule}</p> : null}
      {openPeriods.length > 0 && activeRules.length > 0 ? (
        <form className="mt-4 grid min-w-0 gap-4" noValidate onSubmit={submit} onChange={() => { requestId.current = null; setResult(null); }}>
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.accountingDate}
              <input name="accounting_date" type="date" defaultValue={today} required disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.period}
              <select name="period_id" required disabled={isPending} defaultValue={openPeriods.some((period) => period.period_id === initial?.period_id) ? initial?.period_id : ""} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                <option value="" disabled>—</option>
                {openPeriods.map((period) => <option key={period.period_id + ":" + period.version} value={period.period_id}>{period.start_date} – {period.end_date} · v{period.version}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.postingRule}
              <select required value={selectedRuleId} onChange={(event) => {
                setSelectedRuleId(event.currentTarget.value);
                setLines([newLine(), newLine()]);
                requestId.current = null;
                setResult(null);
              }} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                <option value="" disabled>—</option>
                {activeRules.map((rule) => <option key={rule.posting_rule_id} value={rule.posting_rule_id}>{rule.rule_code} · {locale === "ar" ? rule.name_ar : rule.name_en} · v{rule.version}</option>)}
              </select>
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.purpose}
              <input name="posting_purpose" required maxLength={80} dir="auto" readOnly={Boolean(initial)} defaultValue={initial?.posting_purpose ?? ""} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal read-only:bg-surface-container-low" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.sourceRecord}
              <input name="source_record_key" required maxLength={200} dir="auto" readOnly={Boolean(initial)} defaultValue={initial?.source_record_key ?? ""} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal read-only:bg-surface-container-low" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.economicEvent}
              <input name="economic_event_key" required maxLength={200} dir="auto" readOnly={Boolean(initial)} defaultValue={initial?.economic_event_key ?? ""} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal read-only:bg-surface-container-low" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface sm:col-span-2">
              {dictionary.descriptionEn}
              <input name="description_en" required maxLength={500} dir="ltr" defaultValue={initial?.description_en ?? ""} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface sm:col-span-2">
              {dictionary.descriptionAr}
              <input name="description_ar" required maxLength={500} dir="rtl" defaultValue={initial?.description_ar ?? ""} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
            </label>
          </div>

          <fieldset className="grid min-w-0 gap-3 rounded-lg border border-outline-variant p-3">
            <legend className="px-1 text-sm font-semibold text-on-surface">{dictionary.line}</legend>
            {lines.map((line, index) => {
              const { mapping, account } = accountForMapping(line.mapping_key, selectedRule, accounts);
              const sideOptions = mapping?.allowed_side === "DEBIT" ? ["DEBIT"] as const
                : mapping?.allowed_side === "CREDIT" ? ["CREDIT"] as const
                : ["DEBIT", "CREDIT"] as const;
              const serviceDisabled = !mapping || mapping.service_requirement === "FORBIDDEN" || !canReadServices || isPending;
              return (
                <div key={line.id} className="grid min-w-0 gap-3 rounded-md bg-surface-container-low p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h3 className="text-sm font-semibold text-on-surface">{dictionary.lineNumber} <bdi dir="ltr">{index + 1}</bdi></h3>
                    <button type="button" onClick={() => { setLines((current) => current.filter((item) => item.id !== line.id)); requestId.current = null; }} disabled={isPending || lines.length <= 2} className="min-h-9 rounded-md border border-outline-variant px-3 text-xs font-semibold text-on-surface disabled:opacity-50">{dictionary.removeLine}</button>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.mapping}
                      <select value={line.mapping_key} required onChange={(event) => chooseMapping(line.id, event.currentTarget.value)} disabled={!selectedRule || isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                        <option value="" disabled>—</option>
                        {selectedRule?.mappings.map((item) => {
                          const resolved = accountForMapping(item.mapping_key, selectedRule, accounts).account;
                          return <option key={item.mapping_key} value={item.mapping_key}>{item.mapping_key}{resolved ? " · " + resolved.account_code : ""}</option>;
                        })}
                      </select>
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.account}
                      <span className="flex min-h-11 min-w-0 items-center rounded-md border border-outline-variant bg-surface-container-low px-3 text-sm font-normal">
                        {account ? <><bdi dir="ltr">{account.account_code}</bdi><span className="ms-2 truncate">{locale === "ar" ? account.name_ar : account.name_en} · v{account.version}</span></> : "—"}
                      </span>
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.side}
                      <select value={line.side} onChange={(event) => updateLine(line.id, { side: event.currentTarget.value as DraftLine["side"] })} disabled={!mapping || isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                        {sideOptions.map((side) => <option key={side} value={side}>{side === "DEBIT" ? dictionary.debit : dictionary.credit}</option>)}
                      </select>
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.amount}
                      <input inputMode="decimal" value={line.amount_sar} onChange={(event) => updateLine(line.id, { amount_sar: event.currentTarget.value })} required dir="ltr" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
                    </label>
                    <div className="grid min-w-0 gap-1 text-sm font-medium text-on-surface sm:col-span-2">
                      <label htmlFor={"service-number-" + line.id}>{dictionary.serviceNumber}</label>
                      <div className="flex min-w-0 flex-wrap gap-2">
                        <input id={"service-number-" + line.id} value={line.service_number} onChange={(event) => updateLine(line.id, { service_number: event.currentTarget.value, service_id: null, service_label: "", service_state: "idle" })} dir="ltr" disabled={serviceDisabled} className="min-h-11 min-w-0 flex-1 rounded-md border border-outline-variant bg-surface px-3 font-normal disabled:opacity-60" />
                        <button type="button" onClick={() => void resolveService(line)} disabled={serviceDisabled || !line.service_number.trim()} className="min-h-11 rounded-md border border-outline-variant px-3 text-xs font-semibold text-on-surface disabled:opacity-50">{dictionary.findService}</button>
                      </div>
                      {line.service_label ? <span className="text-xs text-on-surface-variant"><bdi dir="auto">{line.service_label}</bdi></span> : null}
                      {!canReadServices && mapping?.service_requirement !== "FORBIDDEN" ? <span className="text-xs text-on-surface-variant">{dictionary.servicePermission}</span> : null}
                      {mapping?.service_requirement === "REQUIRED" && !line.service_id ? <span className="text-xs text-error">{dictionary.serviceRequired}</span> : null}
                      {mapping?.service_requirement === "FORBIDDEN" ? <span className="text-xs text-on-surface-variant">{dictionary.serviceForbidden}</span> : null}
                      {line.service_state === "missing" ? <span className="text-xs text-error">{dictionary.noServiceMatch}</span> : null}
                    </div>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.descriptionEn}
                      <input value={line.description_en} onChange={(event) => updateLine(line.id, { description_en: event.currentTarget.value })} required maxLength={500} dir="ltr" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.descriptionAr}
                      <input value={line.description_ar} onChange={(event) => updateLine(line.id, { description_ar: event.currentTarget.value })} required maxLength={500} dir="rtl" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
                    </label>
                  </div>
                </div>
              );
            })}
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button type="button" onClick={() => setLines((current) => [...current, newLine(selectedRule?.mappings[0]?.mapping_key ?? "")])} disabled={isPending || lines.length >= 20} className="min-h-10 rounded-md border border-outline-variant px-3 text-sm font-semibold text-on-surface disabled:opacity-50">{dictionary.addLine}</button>
              <div className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
                <span>{dictionary.debitTotal}: <bdi dir="ltr" className="font-semibold">{formatTotal(debit)} SAR</bdi></span>
                <span>{dictionary.creditTotal}: <bdi dir="ltr" className="font-semibold">{formatTotal(credit)} SAR</bdi></span>
                <span className={balanced ? "font-semibold text-tertiary" : "font-semibold text-error"}>{balanced ? dictionary.balanced : dictionary.unbalanced}</span>
              </div>
            </div>
          </fieldset>

          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.reason}
              <textarea name="reason" required maxLength={2000} rows={2} dir="auto" defaultValue={initial?.reason ?? ""} disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
            </label>
            <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
              {dictionary.evidence}
              <textarea name="evidence_ref" maxLength={2000} rows={2} dir="auto" defaultValue={initial?.evidence_ref ?? ""} disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
            </label>
          </div>
          {message ? <p role="status" className={result?.ok ? "text-sm text-tertiary" : "text-sm text-error"}>{message}</p> : null}
          <div className="flex justify-end">
            <button type="submit" disabled={isPending || !balanced || !selectedRule} className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50">{isPending ? dictionary.preparing : initial ? dictionary.saveRevision : dictionary.prepare}</button>
          </div>
        </form>
      ) : null}
    </section>
  );
}

export default function JournalOperationsWorkspace({
  locale,
  dictionary,
  state,
  journals,
  nextCursor,
  periods,
  rules,
  accounts,
  canPrepare,
  canReadServices,
  today,
}: {
  locale: Locale;
  dictionary: AccountingJournalDictionary;
  state: WorkspaceState;
  journals: AccountingJournalListItem[];
  nextCursor: string | null;
  periods: AccountingPeriodVersion[];
  rules: AccountingPostingRuleVersion[];
  accounts: AccountingAccountVersion[];
  canPrepare: boolean;
  canReadServices: boolean;
  today: string;
}) {
  const stateMessages: Record<Exclude<WorkspaceState, "ready">, string> = {
    "not-initialized": dictionary.notInitialized,
    "recovery-required": dictionary.recoveryRequired,
    "access-denied": dictionary.accessDenied,
    "dependency-failure": dictionary.dependencyFailure,
  };
  if (state !== "ready") {
    return <section role="status" className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-sm text-on-surface-variant">{stateMessages[state]}</section>;
  }
  return (
    <div className="grid min-w-0 gap-6">
      {canPrepare ? <ManualJournalForm locale={locale} dictionary={dictionary} periods={periods} rules={rules} accounts={accounts} canReadServices={canReadServices} today={today} /> : null}
      <section className="grid min-w-0 gap-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-lg font-semibold text-on-surface">{dictionary.listTitle}</h2>
          <span className="text-xs text-on-surface-variant"><bdi dir="ltr">{journals.length}</bdi></span>
        </div>
        {journals.length === 0 ? <p className="rounded-xl border border-outline-variant bg-surface-container-lowest p-5 text-sm text-on-surface-variant">{dictionary.empty}</p> : null}
        <div className="grid min-w-0 gap-3">
          {journals.map((journal) => {
            const current = journal.current;
            return (
              <Link key={journal.journal_id} href={"/accounting/journals/" + journal.journal_id} className="grid min-w-0 gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 transition-colors hover:bg-surface-container-low focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary">
                <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <span className="rounded-full bg-surface-container-low px-2.5 py-1 text-xs font-semibold">{current.status === "DRAFT" ? dictionary.statusDraft : dictionary.statusPosted}</span>
                    <span className="text-sm font-semibold text-on-surface">{dictionary.sourceDomains[current.source_domain]}</span>
                    <bdi dir="ltr" className="font-mono text-xs text-on-surface-variant">{journal.journal_id}</bdi>
                  </div>
                  <span className="text-xs text-on-surface-variant"><bdi dir="ltr">{current.accounting_date} · v{journal.current_version}</bdi></span>
                </div>
                <p className="min-w-0 text-sm text-on-surface">{locale === "ar" ? current.description_ar : current.description_en}</p>
                <div className="grid min-w-0 gap-2 text-xs text-on-surface-variant sm:grid-cols-2">
                  <span>{dictionary.sourceRecord}: <bdi dir="auto" className="font-mono">{current.source_record_key}</bdi></span>
                  <span>{dictionary.economicEvent}: <bdi dir="auto" className="font-mono">{current.economic_event_key}</bdi></span>
                  <span>{dictionary.purpose}: <bdi dir="auto">{current.posting_purpose}</bdi></span>
                  {journal.reversal_of_journal_id ? <span>{dictionary.reversalOf}: <bdi dir="ltr" className="font-mono">{journal.reversal_of_journal_id}</bdi></span> : null}
                </div>
              </Link>
            );
          })}
        </div>
        {nextCursor ? <div className="flex justify-end"><Link href={"/accounting/journals?cursor=" + encodeURIComponent(nextCursor)} className="min-h-10 rounded-md border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface">{dictionary.nextPage}</Link></div> : null}
      </section>
    </div>
  );
}
