"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { saveAccountingPeriod } from "@/lib/accounting/actions";
import type {
  AccountingActionErrorCode,
  AccountingActionResult,
  AccountingPeriodVersion,
} from "@/lib/accounting/types";
import { getAccountingPeriodsDictionary } from "@/lib/i18n/dictionaries/accounting-periods";
import type { Locale } from "@/lib/i18n/locales";

export type PeriodsPageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type SaveResult = AccountingActionResult<{ period_id: string; version: number }>;
type PeriodGroup = { current: AccountingPeriodVersion | null; history: AccountingPeriodVersion[] };

function groupPeriods(periods: AccountingPeriodVersion[]): PeriodGroup[] {
  const grouped = new Map<string, PeriodGroup>();
  for (const period of periods) {
    const group = grouped.get(period.period_id) ?? { current: null, history: [] };
    if (period.is_current) group.current = period;
    else group.history.push(period);
    grouped.set(period.period_id, group);
  }
  return [...grouped.values()].sort((left, right) =>
    (right.current?.start_date ?? right.history[0]?.start_date ?? "").localeCompare(left.current?.start_date ?? left.history[0]?.start_date ?? ""),
  );
}

function PeriodForm({
  period,
  dictionary,
  onCancel,
  onSaved,
  onReload,
}: {
  period: AccountingPeriodVersion | null;
  dictionary: ReturnType<typeof getAccountingPeriodsDictionary>;
  onCancel: () => void;
  onSaved: (version: number) => void;
  onReload: () => void;
}) {
  const [result, setResult] = useState<SaveResult | null>(null);
  const [rangeInvalid, setRangeInvalid] = useState(false);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const startDate = String(data.get("start_date") ?? "").trim();
    const endDate = String(data.get("end_date") ?? "").trim();
    if (!startDate || !endDate || endDate < startDate) {
      setRangeInvalid(true);
      setResult({ ok: false, code: "invalid_period_boundary" });
      return;
    }
    setRangeInvalid(false);
    const requestIdForSave = requestId.current ?? crypto.randomUUID();
    requestId.current = requestIdForSave;
    const input = {
      period_id: period?.period_id ?? null,
      expected_version: period?.version ?? 0,
      period: { start_date: startDate, end_date: endDate, status: "OPEN" as const },
      reason: String(data.get("reason") ?? "").trim(),
      evidence_ref: String(data.get("evidence_ref") ?? "").trim() || null,
      request_id: requestIdForSave,
    };

    startTransition(async () => {
      let nextResult: SaveResult;
      try {
        nextResult = await saveAccountingPeriod(input);
      } catch {
        nextResult = { ok: false, code: "dependency_failure" };
      }
      setResult(nextResult);
      if (nextResult.ok) {
        requestId.current = null;
        onSaved(nextResult.value.version);
      }
    });
  }

  const errorCode = result && !result.ok ? result.code as AccountingActionErrorCode : null;
  const feedback = result?.ok
    ? dictionary.savedVersion.replace("{version}", String(result.value.version))
    : errorCode ? dictionary.errors[errorCode] ?? dictionary.actionFailure : null;

  return (
    <section className="min-w-0 rounded-lg border border-outline-variant bg-surface-container-low p-5">
      <h2 className="text-lg font-semibold text-on-surface">{period ? dictionary.reviseTitle : dictionary.createTitle}</h2>
      <p className="mt-2 text-sm text-on-surface-variant">{dictionary.openOnlyNote}</p>
      <form
        className="mt-4 grid min-w-0 gap-4"
        noValidate
        onSubmit={submit}
        onChange={() => { requestId.current = null; setResult(null); setRangeInvalid(false); }}
      >
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.startDate}
            <input type="date" name="start_date" required defaultValue={period?.start_date ?? ""} dir="ltr" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
            {dictionary.endDate}
            <input type="date" name="end_date" required defaultValue={period?.end_date ?? ""} dir="ltr" disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
          </label>
        </div>
        {rangeInvalid ? <p className="text-sm text-error" role="alert">{dictionary.errors.invalid_period_boundary}</p> : null}
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.reason}
          <textarea name="reason" required maxLength={2000} rows={3} disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" />
        </label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">
          {dictionary.evidenceReference}
          <input name="evidence_ref" maxLength={2000} disabled={isPending} className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" />
        </label>
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">
            {isPending ? dictionary.saving : dictionary.save}
          </button>
          <button type="button" onClick={onCancel} disabled={isPending} className="min-h-11 rounded-md border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface">{dictionary.cancel}</button>
          {errorCode === "revision_conflict" ? <button type="button" onClick={onReload} className="min-h-11 text-sm font-semibold text-primary underline">{dictionary.reloadLatest}</button> : null}
          {feedback ? <p className="text-sm text-on-surface-variant" role="status" aria-live="polite">{feedback}</p> : null}
        </div>
      </form>
    </section>
  );
}

function PeriodCard({
  group,
  dictionary,
  canManage,
  onEdit,
}: {
  group: PeriodGroup;
  dictionary: ReturnType<typeof getAccountingPeriodsDictionary>;
  canManage: boolean;
  onEdit: (periodId: string) => void;
}) {
  const period = group.current ?? [...group.history].sort((a, b) => b.version - a.version)[0];
  if (!period) return null;
  return (
    <li className="min-w-0 list-none">
      <article className="min-w-0 rounded-lg border border-outline-variant bg-surface p-4">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-semibold text-on-surface"><bdi dir="ltr">{period.start_date}</bdi> – <bdi dir="ltr">{period.end_date}</bdi></p>
            <p className="mt-1 text-sm text-on-surface-variant">{dictionary.version} <bdi dir="ltr">{period.version}</bdi> · {dictionary.statuses[period.status]}</p>
          </div>
          {canManage && group.current?.status === "OPEN" ? (
            <button type="button" onClick={() => onEdit(period.period_id)} className="min-h-10 rounded-md border border-outline-variant px-3 text-sm font-semibold text-on-surface">{dictionary.revise}</button>
          ) : null}
        </div>
        <dl className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
          <div className="min-w-0 rounded-md border border-outline-variant/70 p-3"><dt className="text-xs text-on-surface-variant">{dictionary.effectiveFrom}</dt><dd className="mt-1 text-sm"><time dateTime={period.effective_from}><bdi dir="ltr">{period.effective_from.slice(0, 10)}</bdi></time></dd></div>
          <div className="min-w-0 rounded-md border border-outline-variant/70 p-3"><dt className="text-xs text-on-surface-variant">{dictionary.reason}</dt><dd className="mt-1 break-words text-sm"><bdi dir="auto">{period.reason}</bdi></dd></div>
          {period.evidence_ref ? <div className="min-w-0 rounded-md border border-outline-variant/70 p-3"><dt className="text-xs text-on-surface-variant">{dictionary.evidenceReference}</dt><dd className="mt-1 break-all text-sm"><bdi dir="ltr">{period.evidence_ref}</bdi></dd></div> : null}
        </dl>
        {group.history.length > 0 ? (
          <details className="mt-3 rounded-md border border-outline-variant/70 px-3 py-2">
            <summary className="cursor-pointer text-sm font-medium text-on-surface">{dictionary.versionHistory} ({group.history.length})</summary>
            <ul className="mt-3 grid min-w-0 gap-2">
              {group.history.sort((a, b) => b.version - a.version).map((version) => (
                <li key={`${version.period_id}:${version.version}`} className="min-w-0 rounded-md bg-surface-container-low p-3 text-sm">
                  <p>{dictionary.version} <bdi dir="ltr">{version.version}</bdi> · {dictionary.statuses[version.status]}</p>
                  <p className="mt-1"><bdi dir="ltr">{version.start_date}</bdi> – <bdi dir="ltr">{version.end_date}</bdi></p>
                  <p className="mt-1 break-words text-xs text-on-surface-variant">{dictionary.reason}: <bdi dir="auto">{version.reason}</bdi></p>
                  {version.evidence_ref ? <p className="mt-1 break-all text-xs text-on-surface-variant">{dictionary.evidenceReference}: <bdi dir="ltr">{version.evidence_ref}</bdi></p> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </article>
    </li>
  );
}

export default function PeriodsClient({
  locale,
  state,
  periods,
  canManage,
}: {
  locale: Locale;
  state: PeriodsPageState;
  periods: AccountingPeriodVersion[];
  canManage: boolean;
}) {
  const dictionary = getAccountingPeriodsDictionary(locale);
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savedVersion, setSavedVersion] = useState<number | null>(null);
  const groups = groupPeriods(periods);
  const selected = editingId && editingId !== "new" ? periods.find((period) => period.period_id === editingId && period.is_current && period.status === "OPEN") ?? null : null;

  if (state !== "ready") {
    const stateContent = {
      "not-initialized": [dictionary.notInitializedTitle, dictionary.notInitializedBody],
      "recovery-required": [dictionary.recoveryRequiredTitle, dictionary.recoveryRequiredBody],
      "access-denied": [dictionary.accessDeniedTitle, dictionary.accessDeniedBody],
      "dependency-failure": [dictionary.dependencyFailureTitle, dictionary.dependencyFailureBody],
      ready: ["", ""],
    }[state];
    return (
      <section className="rounded-lg border border-error/20 bg-error-container p-5 text-on-error-container" role="status">
        <h2 className="text-lg font-semibold">{stateContent[0]}</h2>
        <p className="mt-2 text-sm">{stateContent[1]}</p>
        <Link href="/settings/accounting" className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold underline">{dictionary.backToSetup}</Link>
      </section>
    );
  }

  return (
    <div className="grid min-w-0 gap-6">
      <section className="min-w-0 rounded-lg border border-outline-variant p-5">
        <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-lg font-semibold text-on-surface">{dictionary.currentPeriods}</h2>{savedVersion !== null ? <p className="mt-1 text-sm text-on-surface-variant" role="status">{dictionary.savedVersion.replace("{version}", String(savedVersion))}</p> : null}</div>
          {canManage ? <button type="button" onClick={() => { setSavedVersion(null); setEditingId("new"); }} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary">{dictionary.create}</button> : null}
        </div>
        {groups.length === 0 ? (
          <div className="mt-4 rounded-md border border-dashed border-outline-variant p-4"><h3 className="font-medium text-on-surface">{dictionary.emptyTitle}</h3><p className="mt-1 text-sm text-on-surface-variant">{dictionary.emptyBody}</p></div>
        ) : (
          <ul className="mt-4 grid min-w-0 gap-3">{groups.map((group) => <PeriodCard key={group.current?.period_id ?? group.history[0]?.period_id} group={group} dictionary={dictionary} canManage={canManage} onEdit={(id) => { setSavedVersion(null); setEditingId(id); }} />)}</ul>
        )}
      </section>
      {canManage && editingId !== null ? (
        <PeriodForm
          key={`${selected?.period_id ?? "new"}:${selected?.version ?? 0}`}
          period={selected}
          dictionary={dictionary}
          onCancel={() => setEditingId(null)}
          onReload={() => { setEditingId(null); router.refresh(); }}
          onSaved={(version) => { setEditingId(null); setSavedVersion(version); router.refresh(); }}
        />
      ) : null}
      <Link href="/settings/accounting" className="text-sm font-medium text-primary underline underline-offset-4">{dictionary.backToSetup}</Link>
    </div>
  );
}
