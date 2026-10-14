"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { saveAccountingStatementMapping } from "@/lib/accounting/actions";
import { getAccountingStatementClassification } from "@/lib/accounting/statement-mapping-contract";
import { saveAccountingStatementMappingInputSchema } from "@/lib/accounting/schemas";
import type {
  AccountingAccountVersion,
  AccountingActionErrorCode,
  AccountingActionResult,
  AccountingStatementMappingEntry,
  AccountingStatementMappingReadModel,
} from "@/lib/accounting/types";
import { getAccountingStatementMappingsDictionary } from "@/lib/i18n/dictionaries/accounting-statement-mappings";
import type { Locale } from "@/lib/i18n/locales";

export type StatementMappingsPageState = "ready" | "empty" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type SaveResult = AccountingActionResult<{ mapping_set_id: string; version: number }>;
type MappingDraft = AccountingStatementMappingEntry & { row_id: string; account_selection: string };
function makeDraft(entry?: AccountingStatementMappingEntry): MappingDraft {
  return {
    row_id: crypto.randomUUID(),
    account_id: entry?.account_id ?? "",
    account_version: entry?.account_version ?? 0,
    account_selection: entry ? `${entry.account_id}:${entry.account_version}` : "",
    statement_type: entry?.statement_type ?? "PROFIT_LOSS",
    section_key: entry?.section_key ?? "",
    line_key: entry?.line_key ?? "",
    label_en: entry?.label_en ?? "",
    label_ar: entry?.label_ar ?? "",
    display_order: entry?.display_order ?? 0,
  };
}

function localDateTime(value?: string) {
  const date = value ? new Date(value) : new Date();
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function getExactAccount(accounts: AccountingAccountVersion[], selection: string) {
  const [accountId, rawVersion] = selection.split(":");
  const version = Number(rawVersion);
  return accounts.find((account) => account.account_id === accountId && account.version === version);
}

function createEntryFromDraft(draft: MappingDraft, accounts: AccountingAccountVersion[]): AccountingStatementMappingEntry {
  const account = getExactAccount(accounts, draft.account_selection);
  if (!account) {
    return { ...draft, account_id: draft.account_id, account_version: Number(draft.account_version) };
  }
  const classification = getAccountingStatementClassification(account.account_type);
  return {
    account_id: account.account_id,
    account_version: account.version,
    statement_type: classification.statement_type,
    section_key: classification.section_key,
    line_key: draft.line_key.trim().toUpperCase(),
    label_en: draft.label_en.trim(),
    label_ar: draft.label_ar.trim(),
    display_order: Number(draft.display_order),
  };
}

function MappingForm({
  mappings,
  accounts,
  locale,
  onCancel,
  onSaved,
}: {
  mappings: AccountingStatementMappingReadModel;
  accounts: AccountingAccountVersion[];
  locale: Locale;
  onCancel: () => void;
  onSaved: (version: number) => void;
}) {
  const dictionary = getAccountingStatementMappingsDictionary(locale);
  const router = useRouter();
  const [drafts, setDrafts] = useState<MappingDraft[]>(() => mappings.state === "READY" ? mappings.entries.map(makeDraft) : []);
  const [result, setResult] = useState<SaveResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);
  const [effectiveFrom, setEffectiveFrom] = useState(() => localDateTime());
  const [reason, setReason] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");

  function updateDraft(rowId: string, patch: Partial<MappingDraft>) {
    requestId.current = null;
    setResult(null);
    setDrafts((current) => current.map((draft) => {
      if (draft.row_id !== rowId) return draft;
      const next = { ...draft, ...patch };
      if (patch.account_selection !== undefined) {
        const account = getExactAccount(accounts, patch.account_selection);
        if (account) {
          const classification = getAccountingStatementClassification(account.account_type);
          next.account_id = account.account_id;
          next.account_version = account.version;
          next.statement_type = classification.statement_type;
          next.section_key = classification.section_key;
        }
      }
      return next;
    }));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const profileId = mappings.state === "NOT_INITIALIZED" ? "" : mappings.profile_id;
    const mappingSetId = mappings.state === "READY" ? mappings.mapping_set_id : null;
    const expectedVersion = mappings.state === "READY" ? mappings.current_version : 0;
    const instant = new Date(effectiveFrom);
    const requestIdValue = requestId.current ?? crypto.randomUUID();
    requestId.current = requestIdValue;
    const input = {
      profile_id: profileId,
      mapping_set_id: mappingSetId,
      expected_version: expectedVersion,
      effective_from: instant.toISOString(),
      reason,
      evidence_ref: evidenceRef,
      entries: drafts.map((draft) => createEntryFromDraft(draft, accounts)),
      request_id: requestIdValue,
    };
    const parsed = saveAccountingStatementMappingInputSchema.safeParse(input);
    if (!instant.getTime() || !parsed.success) {
      setResult({ ok: false, code: "invalid_input" });
      return;
    }
    startTransition(async () => {
      let nextResult: SaveResult;
      try {
        nextResult = await saveAccountingStatementMapping(parsed.data);
      } catch {
        nextResult = { ok: false, code: "dependency_failure" };
      }
      setResult(nextResult);
      if (nextResult.ok) {
        requestId.current = null;
        onSaved(nextResult.value.version);
        router.refresh();
      }
    });
  }

  const errorCode = result && !result.ok ? result.code as AccountingActionErrorCode : null;
  const feedback = result?.ok
    ? dictionary.savedVersion.replace("{version}", String(result.value.version))
    : errorCode ? dictionary.errors[errorCode] ?? dictionary.invalidEntries : null;

  return (
    <section className="grid min-w-0 gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-5">
      <h2 className="text-lg font-semibold text-on-surface">{mappings.state === "READY" ? dictionary.revise : dictionary.create}</h2>
      <p className="text-sm text-on-surface-variant">{dictionary.noProfessionalDefaults}</p>
      <form className="grid min-w-0 gap-4" onSubmit={submit} onChange={() => { requestId.current = null; setResult(null); }}>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.effectiveFrom}
          <input type="datetime-local" required value={effectiveFrom} onChange={(event) => { requestId.current = null; setEffectiveFrom(event.target.value); setResult(null); }} disabled={isPending} dir="ltr" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.reason}
          <textarea required maxLength={2000} value={reason} onChange={(event) => { requestId.current = null; setReason(event.target.value); setResult(null); }} rows={3} disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.evidenceReference}
          <input required maxLength={2000} value={evidenceRef} onChange={(event) => { requestId.current = null; setEvidenceRef(event.target.value); setResult(null); }} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
        </label>
        <section className="grid min-w-0 gap-4" aria-labelledby="mapping-entries-heading">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <h3 id="mapping-entries-heading" className="text-base font-semibold text-on-surface">{dictionary.entries}</h3>
            <button type="button" disabled={isPending} onClick={() => { requestId.current = null; setDrafts((current) => [...current, makeDraft()]); setResult(null); }} className="min-h-10 rounded-md border border-outline-variant px-3 text-sm font-semibold text-primary">{dictionary.addEntry}</button>
          </div>
          <p className="text-sm text-on-surface-variant">{dictionary.pnlRestriction} {dictionary.balanceSheetRestriction}</p>
          {drafts.length === 0 ? <p className="rounded-md border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">{dictionary.emptyBody}</p> : null}
          <ol className="grid min-w-0 gap-3">
            {drafts.map((draft, index) => {
              const selectedAccount = getExactAccount(accounts, draft.account_selection);
              const eligible = accounts.filter((account) => account.is_current && account.is_active && account.account_kind === "POSTING");
              const preserved = selectedAccount && !eligible.some((account) => account.account_id === selectedAccount.account_id && account.version === selectedAccount.version)
                ? [selectedAccount]
                : [];
              const options = [...preserved, ...eligible].filter((account, position, all) => all.findIndex((candidate) => candidate.account_id === account.account_id && candidate.version === account.version) === position);
              return (
                <li key={draft.row_id} className="min-w-0 list-none rounded-lg border border-outline-variant bg-surface p-4">
                  <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
                    <h4 className="font-semibold text-on-surface">{dictionary.entries} {index + 1}</h4>
                    <button type="button" disabled={isPending} onClick={() => { requestId.current = null; setDrafts((current) => current.filter((item) => item.row_id !== draft.row_id)); setResult(null); }} className="min-h-9 rounded-md px-2 text-sm font-semibold text-error underline underline-offset-4">{dictionary.removeEntry}</button>
                  </div>
                  <div className="grid min-w-0 gap-3 sm:grid-cols-2">
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface sm:col-span-2">
                      {dictionary.account}
                      <select required value={draft.account_selection} onChange={(event) => updateDraft(draft.row_id, { account_selection: event.target.value })} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal">
                        <option value="">—</option>
                        {options.map((account) => <option key={`${account.account_id}:${account.version}`} value={`${account.account_id}:${account.version}`}>{account.account_code} · {locale === "ar" ? account.name_ar : account.name_en} · {dictionary.accountTypes[account.account_type]} · v{account.version}{account.is_protected ? ` · ${dictionary.protected}` : ""}</option>)}
                      </select>
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.statementType}
                        <input readOnly value={selectedAccount ? (getAccountingStatementClassification(selectedAccount.account_type).statement_type === "PROFIT_LOSS" ? dictionary.profitLoss : dictionary.balanceSheet) : ""} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface-container-low px-3 font-normal" />
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.section}
                        <input readOnly value={selectedAccount ? dictionary.sections[getAccountingStatementClassification(selectedAccount.account_type).section_key] : ""} dir="auto" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface-container-low px-3 font-normal" />
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.lineKey}
                      <input required pattern="[A-Z][A-Z0-9_]{0,59}" maxLength={60} value={draft.line_key} onChange={(event) => updateDraft(draft.row_id, { line_key: event.target.value.toUpperCase() })} disabled={isPending} dir="ltr" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-mono font-normal" />
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.displayOrder}
                      <input required type="number" min={0} max={100000} step={1} value={draft.display_order} onChange={(event) => updateDraft(draft.row_id, { display_order: Number(event.target.value) })} disabled={isPending} dir="ltr" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.labelEn}
                      <input required maxLength={160} value={draft.label_en} onChange={(event) => updateDraft(draft.row_id, { label_en: event.target.value })} disabled={isPending} dir="auto" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
                    </label>
                    <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
                      {dictionary.labelAr}
                      <input required maxLength={160} value={draft.label_ar} onChange={(event) => updateDraft(draft.row_id, { label_ar: event.target.value })} disabled={isPending} dir="auto" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
                    </label>
                  </div>
                </li>
              );
            })}
          </ol>
        </section>
        {errorCode ? <p role="alert" className="text-sm text-error">{dictionary.errors[errorCode] ?? dictionary.invalidEntries}</p> : null}
        {feedback ? <p role="status" aria-live="polite" className="text-sm text-on-surface-variant">{feedback}</p> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending || accounts.length === 0} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">{isPending ? dictionary.saving : dictionary.save}</button>
          <button type="button" disabled={isPending} onClick={onCancel} className="min-h-11 rounded-md border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface">{dictionary.cancel}</button>
        </div>
      </form>
    </section>
  );
}

function ErrorState({ state, locale }: { state: Exclude<StatementMappingsPageState, "ready" | "empty">; locale: Locale }) {
  const dictionary = getAccountingStatementMappingsDictionary(locale);
  const title = state === "not-initialized" ? dictionary.notInitializedTitle
    : state === "recovery-required" ? dictionary.recoveryRequiredTitle
      : state === "access-denied" ? dictionary.accessDeniedTitle : dictionary.dependencyFailureTitle;
  const body = state === "not-initialized" ? dictionary.notInitializedBody
    : state === "recovery-required" ? dictionary.recoveryRequiredBody
      : state === "access-denied" ? dictionary.accessDeniedBody : dictionary.dependencyFailureBody;
  return <section className="rounded-lg border border-outline-variant bg-surface-container-low p-5"><h2 className="text-lg font-semibold text-on-surface">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{body}</p><Link href="/settings/accounting" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4">{dictionary.backToSetup}</Link></section>;
}

export default function StatementMappingsClient({
  locale,
  state,
  mappings,
  accounts,
}: {
  locale: Locale;
  state: StatementMappingsPageState;
  mappings: AccountingStatementMappingReadModel;
  accounts: AccountingAccountVersion[];
}) {
  const dictionary = getAccountingStatementMappingsDictionary(locale);
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  if (state !== "ready" && state !== "empty") return <ErrorState state={state} locale={locale} />;
  if (mappings.state === "NOT_INITIALIZED") return <ErrorState state="not-initialized" locale={locale} />;
  const currentVersion = mappings.state === "READY" ? mappings.current_version : 0;
  const currentHistory = mappings.state === "READY" ? mappings.history.find((version) => version.version === currentVersion) : null;
  const activeEntries = mappings.state === "READY" ? mappings.entries : [];
  const currentAccountFor = (entry: AccountingStatementMappingEntry) => accounts.find((account) => account.account_id === entry.account_id && account.version === entry.account_version);

  return (
    <div className="grid min-w-0 gap-6">
      {savedVersion ? <p role="status" aria-live="polite" className="rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{dictionary.savedVersion.replace("{version}", String(savedVersion))}</p> : null}
      {editing ? <MappingForm mappings={mappings} accounts={accounts} locale={locale} onCancel={() => setEditing(false)} onSaved={(version) => { setSavedVersion(version); setEditing(false); }} /> : (
        <section className="grid min-w-0 gap-4 rounded-lg border border-outline-variant bg-surface p-5">
          <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-on-surface">{mappings.state === "EMPTY" ? dictionary.emptyTitle : dictionary.currentVersion}</h2>
              <p className="mt-2 text-sm text-on-surface-variant">{mappings.state === "EMPTY" ? dictionary.emptyBody : `${dictionary.version} ${currentVersion}`}</p>
            </div>
            {mappings.state === "READY" ? <button type="button" onClick={() => setEditing(true)} className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary">{dictionary.revise}</button>
              : <button type="button" onClick={() => setEditing(true)} className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary">{dictionary.create}</button>}
          </div>
          {accounts.length === 0 ? <p role="status" className="rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{dictionary.noAccounts}</p> : null}
          <p className="text-sm text-on-surface-variant">{dictionary.noProfessionalDefaults}</p>
          {activeEntries.length > 0 ? (
            <ul className="grid min-w-0 gap-3">
              {activeEntries.map((entry, index) => {
                const account = currentAccountFor(entry);
                return <li key={`${entry.account_id}:${entry.account_version}:${entry.statement_type}`} className="min-w-0 list-none rounded-lg border border-outline-variant p-4">
                  <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0"><p className="font-semibold text-on-surface"><bdi dir="ltr">{account?.account_code ?? entry.account_id}</bdi> · {locale === "ar" ? account?.name_ar : account?.name_en}</p><p className="mt-1 text-sm text-on-surface-variant"><bdi dir="ltr">v{entry.account_version} · {entry.statement_type} · {entry.section_key} · {entry.line_key}</bdi></p></div>
                    <span className="text-xs text-on-surface-variant">{dictionary.displayOrder}: <bdi dir="ltr">{entry.display_order}</bdi></span>
                  </div>
                  <p className="mt-3 text-sm text-on-surface"><span dir="ltr">{entry.label_en}</span><span aria-hidden="true"> · </span><span dir="rtl">{entry.label_ar}</span></p>
                  {account?.is_protected ? <p className="mt-2 text-xs font-medium text-on-surface-variant">{dictionary.protected} · {account.control_classification}</p> : null}
                  <span className="sr-only">{index + 1}</span>
                </li>;
              })}
            </ul>
          ) : null}
          {mappings.state === "READY" && currentHistory ? <dl className="grid min-w-0 gap-2 border-t border-outline-variant pt-4 sm:grid-cols-2"><div><dt className="text-xs text-on-surface-variant">{dictionary.effectiveFrom}</dt><dd className="break-words text-sm text-on-surface"><bdi dir="ltr">{new Date(currentHistory.effective_from).toLocaleString(locale)}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.reason}</dt><dd className="break-words text-sm text-on-surface">{currentHistory.reason}</dd></div><div className="sm:col-span-2"><dt className="text-xs text-on-surface-variant">{dictionary.evidenceReference}</dt><dd className="break-all text-sm text-on-surface">{currentHistory.evidence_ref}</dd></div></dl> : null}
        </section>
      )}
      {mappings.state === "READY" ? <section className="grid min-w-0 gap-3 rounded-lg border border-outline-variant p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold text-on-surface">{dictionary.versionHistory}</h2>{mappings.history_truncated ? <p className="text-sm text-on-surface-variant">{dictionary.historyTruncated}</p> : null}</div>
        <ol className="grid min-w-0 gap-2">
          {[...mappings.history].sort((left, right) => right.version - left.version).map((version) => <li key={version.version} className="min-w-0 list-none rounded-md border border-outline-variant p-3">
            <div className="flex min-w-0 flex-wrap justify-between gap-2"><strong className="text-sm text-on-surface">{dictionary.version} <bdi dir="ltr">{version.version}</bdi>{version.version === currentVersion ? ` · ${dictionary.currentVersion}` : ""}</strong><span className="text-xs text-on-surface-variant"><bdi dir="ltr">{new Date(version.effective_from).toLocaleString(locale)}</bdi></span></div>
            <p className="mt-1 break-words text-sm text-on-surface-variant">{version.reason}</p>
            <p className="mt-1 break-all text-xs text-on-surface-variant">{dictionary.evidenceReference}: {version.evidence_ref}</p>
          </li>)}
        </ol>
        <button type="button" onClick={() => router.refresh()} className="min-h-10 justify-self-start text-sm font-semibold text-primary underline underline-offset-4">{dictionary.revise}</button>
      </section> : null}
    </div>
  );
}
