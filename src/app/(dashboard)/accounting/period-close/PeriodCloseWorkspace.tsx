"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { prepareAccountingPeriodClose, reviewAccountingPeriodClose } from "@/lib/accounting/actions";
import type {
  AccountingActionResult,
  AccountingPeriodClosePackageKind,
  AccountingPeriodCloseReadModel,
  AccountingPeriodVersion,
} from "@/lib/accounting/types";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import { UiBidiText, UiLtrText } from "@/components/i18n/UiValueText";
import type { AccountingOperationsDictionary } from "@/lib/i18n/dictionaries/accounting-operations";
import type { Locale } from "@/lib/i18n/locales";

type PageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type PeriodRecord = {
  period_id: string;
  version: number;
  status: string;
  start_date: string;
  end_date: string;
  effective_from: string;
  reason: string;
  evidence_ref: string | null;
  created_by: string;
  created_at: string;
};
type ClosePackage = {
  package_id: string;
  package_version: number;
  package_kind: AccountingPeriodClosePackageKind;
  package_state: string;
  starting_period_version: number;
  period_start_date: string;
  period_end_date: string;
  accounting_cutoff: string;
  recorded_at_cutoff: string;
  preparer_user_id: string;
  prepared_at: string;
  reason: string;
  evidence_ref: string;
  previous_package_id: string | null;
  previous_package_version: number | null;
  evidence_snapshot: Record<string, unknown>;
  exception_codes: string[];
  evidence_fingerprint: string;
  ledger_fingerprint: string;
  review: {
    reviewer_user_id: string;
    decision: "APPROVED" | "REJECTED" | "STALE";
    reason: string;
    recorded_at: string;
    resulting_period_version: number | null;
  } | null;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function text(record: Record<string, unknown>, key: string): string | null {
  return typeof record[key] === "string" ? record[key] as string : null;
}

function integer(record: Record<string, unknown>, key: string): number | null {
  return typeof record[key] === "number" && Number.isSafeInteger(record[key]) ? record[key] as number : null;
}

function nullableInteger(record: Record<string, unknown>, key: string): number | null {
  const value = record[key];
  return value === null || value === undefined ? null : typeof value === "number" && Number.isSafeInteger(value) ? value : null;
}

function periodRecord(value: unknown): PeriodRecord | null {
  const row = asRecord(value);
  if (!row) return null;
  const periodId = text(row, "period_id");
  const version = integer(row, "version");
  const status = text(row, "status");
  const startDate = text(row, "start_date");
  const endDate = text(row, "end_date");
  const effectiveFrom = text(row, "effective_from");
  const reason = text(row, "reason");
  const createdBy = text(row, "created_by");
  const createdAt = text(row, "created_at");
  if (!periodId || version === null || !status || !startDate || !endDate || !effectiveFrom || !reason || !createdBy || !createdAt) return null;
  return {
    period_id: periodId,
    version,
    status,
    start_date: startDate,
    end_date: endDate,
    effective_from: effectiveFrom,
    reason,
    evidence_ref: text(row, "evidence_ref"),
    created_by: createdBy,
    created_at: createdAt,
  };
}

function closePackage(value: Record<string, unknown>): ClosePackage | null {
  const packageId = text(value, "package_id");
  const packageVersion = integer(value, "package_version");
  const packageKind = text(value, "package_kind");
  const packageState = text(value, "package_state");
  const startingVersion = integer(value, "starting_period_version");
  const startDate = text(value, "period_start_date");
  const endDate = text(value, "period_end_date");
  const accountingCutoff = text(value, "accounting_cutoff");
  const recordedAtCutoff = text(value, "recorded_at_cutoff");
  const preparer = text(value, "preparer_user_id");
  const preparedAt = text(value, "prepared_at");
  const reason = text(value, "reason");
  const evidenceRef = text(value, "evidence_ref");
  const snapshot = asRecord(value.evidence_snapshot);
  const exceptionCodes = Array.isArray(value.exception_codes) && value.exception_codes.every((code) => typeof code === "string")
    ? value.exception_codes as string[]
    : null;
  const evidenceFingerprint = text(value, "evidence_fingerprint");
  const ledgerFingerprint = text(value, "ledger_fingerprint");
  if (!packageId || packageVersion === null || !["CLOSE", "LOCK", "REOPEN"].includes(packageKind ?? "")
      || !packageState || startingVersion === null || !startDate || !endDate || !accountingCutoff
      || !recordedAtCutoff || !preparer || !preparedAt || !reason || evidenceRef === null
      || !snapshot || !exceptionCodes || !evidenceFingerprint || !ledgerFingerprint) return null;
  const reviewValue = asRecord(value.review);
  let review: ClosePackage["review"] = null;
  if (reviewValue) {
    const reviewer = text(reviewValue, "reviewer_user_id");
    const decision = text(reviewValue, "decision");
    const reviewReason = text(reviewValue, "reason");
    const recordedAt = text(reviewValue, "recorded_at");
    if (!reviewer || !["APPROVED", "REJECTED", "STALE"].includes(decision ?? "") || !reviewReason || !recordedAt) return null;
    review = {
      reviewer_user_id: reviewer,
      decision: decision as NonNullable<ClosePackage["review"]>["decision"],
      reason: reviewReason,
      recorded_at: recordedAt,
      resulting_period_version: nullableInteger(reviewValue, "resulting_period_version"),
    };
  }
  return {
    package_id: packageId,
    package_version: packageVersion,
    package_kind: packageKind as AccountingPeriodClosePackageKind,
    package_state: packageState,
    starting_period_version: startingVersion,
    period_start_date: startDate,
    period_end_date: endDate,
    accounting_cutoff: accountingCutoff,
    recorded_at_cutoff: recordedAtCutoff,
    preparer_user_id: preparer,
    prepared_at: preparedAt,
    reason,
    evidence_ref: evidenceRef,
    previous_package_id: text(value, "previous_package_id"),
    previous_package_version: nullableInteger(value, "previous_package_version"),
    evidence_snapshot: snapshot,
    exception_codes: exceptionCodes,
    evidence_fingerprint: evidenceFingerprint,
    ledger_fingerprint: ledgerFingerprint,
    review,
  };
}

function closeKindLabel(kind: AccountingPeriodClosePackageKind, dictionary: AccountingOperationsDictionary) {
  return kind === "CLOSE" ? dictionary.period.close : kind === "LOCK" ? dictionary.period.lock : dictionary.period.reopen;
}

function StateMessage({ state, dictionary }: { state: PageState; dictionary: AccountingOperationsDictionary }) {
  const message = state === "access-denied" ? dictionary.common.accessDenied
    : state === "not-initialized" ? dictionary.common.notInitialized
    : state === "recovery-required" ? dictionary.common.recoveryRequired
    : dictionary.common.dependencyFailure;
  return <p role="status" className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{message}</p>;
}

export default function PeriodCloseWorkspace({
  locale,
  dictionary,
  state,
  periods,
  selectedPeriodId,
  evidence,
  recordedAtCutoff,
  canClosePeriod,
  canReopenPeriod,
  canViewStatements,
  actorId,
}: {
  locale: Locale;
  dictionary: AccountingOperationsDictionary;
  state: PageState;
  periods: AccountingPeriodVersion[];
  selectedPeriodId: string | null;
  evidence: AccountingPeriodCloseReadModel | null;
  recordedAtCutoff: string;
  canClosePeriod: boolean;
  canReopenPeriod: boolean;
  canViewStatements: boolean;
  actorId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [packageKind, setPackageKind] = useState<AccountingPeriodClosePackageKind>("CLOSE");
  const [prepareReason, setPrepareReason] = useState("");
  const [prepareEvidenceRef, setPrepareEvidenceRef] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const periodCopy = dictionary.period;
  const common = dictionary.common;

  if (state !== "ready") return <StateMessage state={state} dictionary={dictionary} />;
  const selectedPeriod = periods.find((period) => period.period_id === selectedPeriodId) ?? null;
  if (periods.length === 0) return <p role="status" className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{periodCopy.noPeriods}</p>;
  const currentPeriod = periodRecord(evidence?.current_period) ?? selectedPeriod;
  const evidencePeriod = periodRecord(evidence?.period);
  const packages = evidence?.state === "READY"
    ? (evidence.packages ?? []).map(closePackage).filter((item): item is ClosePackage => item !== null)
    : [];
  const availableKinds: AccountingPeriodClosePackageKind[] = [];
  if (currentPeriod?.status === "OPEN" && canClosePeriod) availableKinds.push("CLOSE");
  if (currentPeriod?.status === "CLOSED" && canClosePeriod) availableKinds.push("LOCK");
  if ((currentPeriod?.status === "CLOSED" || currentPeriod?.status === "LOCKED") && canReopenPeriod) availableKinds.push("REOPEN");
  const effectivePackageKind = availableKinds.includes(packageKind) ? packageKind : availableKinds[0];
  const reportLinks = [
    ["/reports/general-ledger", periodCopy.generalLedger, true],
    ["/reports/trial-balance", periodCopy.trialBalance, true],
    ["/reports/profit-and-loss", periodCopy.profitAndLoss, canViewStatements],
    ["/reports/balance-sheet", periodCopy.balanceSheet, canViewStatements],
  ] as const;
  const snapshotSummary = (snapshot: Record<string, unknown>) => {
    const stateValue = typeof snapshot.state === "string" ? snapshot.state : null;
    const reasonCodes = Array.isArray(snapshot.reason_codes) && snapshot.reason_codes.every((code) => typeof code === "string")
      ? snapshot.reason_codes as string[]
      : [];
    return { stateValue, reasonCodes };
  };

  const prepare = () => {
    setError(null);
    setMessage(null);
    if (!currentPeriod || !selectedPeriodId || !effectivePackageKind) {
      setError(common.stale);
      return;
    }
    if (!prepareReason.trim() || !prepareEvidenceRef.trim()) {
      setError(periodCopy.prepareReason);
      return;
    }
    startTransition(async () => {
      try {
        const result: AccountingActionResult<{
          package_id: string;
          package_version: number;
          package_state: "PREPARED";
          evidence_snapshot: Record<string, unknown>;
        }> = await prepareAccountingPeriodClose({
          period_id: selectedPeriodId,
          expected_period_version: currentPeriod.version,
          package_kind: effectivePackageKind,
          reason: prepareReason.trim(),
          evidence_ref: prepareEvidenceRef.trim(),
          recorded_at_cutoff: recordedAtCutoff,
          request_id: crypto.randomUUID(),
        });
        if (!result.ok) setMessage(`${common.failed} ${common.actionCode}: ${result.code}`);
        else {
          setMessage(`${periodCopy.packageHistory}: ${result.value.package_id} · v${result.value.package_version}`);
          router.refresh();
        }
      } catch {
        setMessage(common.dependencyFailure);
      }
    });
  };

  const review = (closePackageRow: ClosePackage, approve: boolean) => {
    setError(null);
    setMessage(null);
    if (!reviewReason.trim()) {
      setError(periodCopy.reviewReason);
      return;
    }
    startTransition(async () => {
      try {
        const result: AccountingActionResult<{
          package_id: string;
          package_version: number;
          decision: "APPROVED" | "REJECTED" | "STALE";
          resulting_period_version: number | null;
        }> = await reviewAccountingPeriodClose({
          package_id: closePackageRow.package_id,
          package_version: closePackageRow.package_version,
          approve,
          reason: reviewReason.trim(),
          request_id: crypto.randomUUID(),
        });
        if (!result.ok) setMessage(`${common.failed} ${common.actionCode}: ${result.code}`);
        else {
          setMessage(`${periodCopy.review}: ${result.value.decision}`);
          router.refresh();
        }
      } catch {
        setMessage(common.dependencyFailure);
      }
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <form method="get" className="grid min-w-0 gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-medium text-on-surface">{periodCopy.period}
          <select name="periodId" defaultValue={selectedPeriodId ?? ""} dir="ltr" className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm">
            <option value="">{periodCopy.choosePeriod}</option>
            {periods.map((period) => <option key={period.period_id} value={period.period_id}>{period.start_date} – {period.end_date} · {period.status} · v{period.version}</option>)}
          </select>
        </label>
        <button type="submit" className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90">{common.refresh}</button>
      </form>

      <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-on-surface-variant">
        <span>{common.recordedAtCutoff}: <UiDateTimeText locale={locale} value={recordedAtCutoff} /></span>
        {evidencePeriod && <span>{common.asOfDate}: <UiDateText locale={locale} value={evidencePeriod.end_date} /></span>}
      </div>

      {!selectedPeriodId || !currentPeriod ? (
        <p role="status" className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{common.empty}</p>
      ) : evidence?.state === "NOT_INITIALIZED" ? (
        <StateMessage state="not-initialized" dictionary={dictionary} />
      ) : evidence?.state === "NOT_FOUND" ? (
        <p role="status" className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{common.stale}</p>
      ) : (
        <>
          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
            <h2 className="text-base font-semibold text-on-surface">{periodCopy.period}</h2>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs text-on-surface-variant">{common.asOfDate}</dt><dd className="mt-1 text-sm"><UiDateText locale={locale} value={currentPeriod.start_date} /> – <UiDateText locale={locale} value={currentPeriod.end_date} /></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{periodCopy.periodStatus}</dt><dd className="mt-1 font-medium">{currentPeriod.status}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">{periodCopy.periodVersion}</dt><dd className="mt-1"><UiLtrText>v{currentPeriod.version}</UiLtrText></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{common.preparedBy}</dt><dd className="mt-1 break-all"><UiLtrText>{currentPeriod.created_by}</UiLtrText></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{common.preparedAt}</dt><dd className="mt-1"><UiDateTimeText locale={locale} value={currentPeriod.created_at} /></dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-on-surface-variant">{common.reason}</dt><dd className="mt-1 break-words"><UiBidiText>{currentPeriod.reason}</UiBidiText></dd></div>
            </dl>
          </section>

          {availableKinds.length > 0 && <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
            <h2 className="text-base font-semibold text-on-surface">{periodCopy.prepare}</h2>
            <div className="mt-4 grid min-w-0 gap-3 md:grid-cols-[minmax(0,.7fr)_minmax(0,1fr)_minmax(0,1fr)_auto] md:items-end">
              <label className="grid gap-1 text-sm font-medium text-on-surface">{periodCopy.packageKind}
                <select value={effectivePackageKind ?? ""} onChange={(event) => setPackageKind(event.target.value as AccountingPeriodClosePackageKind)} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm">
                  {availableKinds.map((kind) => <option key={kind} value={kind}>{closeKindLabel(kind, dictionary)}</option>)}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-medium text-on-surface">{periodCopy.prepareReason}<input maxLength={2000} value={prepareReason} onChange={(event) => setPrepareReason(event.target.value)} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
              <label className="grid gap-1 text-sm font-medium text-on-surface">{periodCopy.prepareEvidence}<input maxLength={2000} value={prepareEvidenceRef} onChange={(event) => setPrepareEvidenceRef(event.target.value)} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
              <button type="button" disabled={isPending} onClick={prepare} className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50">{isPending ? common.loading : periodCopy.prepare}</button>
            </div>
          </section>}

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
            <h2 className="mb-4 text-base font-semibold text-on-surface">{periodCopy.packageHistory}</h2>
            {packages.length === 0 ? <p className="text-sm text-on-surface-variant">{common.noHistory}</p> : <div className="space-y-4">
              {packages.map((item) => {
                const stale = item.review?.decision === "STALE" || item.starting_period_version !== currentPeriod.version;
                const canReviewPackage = !item.review && !stale && item.package_state === "PREPARED"
                  && actorId !== null && actorId !== item.preparer_user_id
                  && (item.package_kind === "REOPEN" ? canReopenPeriod : canClosePeriod);
                const snapshot = snapshotSummary(item.evidence_snapshot);
                return <article key={`${item.package_id}:${item.package_version}`} className="min-w-0 rounded-lg border border-outline-variant p-4">
                  <header className="flex flex-wrap items-start justify-between gap-2">
                    <div><h3 className="font-semibold text-on-surface">{closeKindLabel(item.package_kind, dictionary)} · <UiLtrText>{item.package_id} · v{item.package_version}</UiLtrText></h3><p className="mt-1 text-xs text-on-surface-variant">{item.package_state} · {item.review?.decision ?? (stale ? common.stale : periodCopy.review)}</p></div>
                    <span className="rounded-full bg-surface-container-low px-2 py-1 text-xs">{periodCopy.startingVersion}: <UiLtrText>v{item.starting_period_version}</UiLtrText></span>
                  </header>
                  <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
                    <div><dt className="text-xs text-on-surface-variant">{common.preparedBy}</dt><dd className="break-all"><UiLtrText>{item.preparer_user_id}</UiLtrText></dd></div>
                    <div><dt className="text-xs text-on-surface-variant">{common.preparedAt}</dt><dd><UiDateTimeText locale={locale} value={item.prepared_at} /></dd></div>
                    <div><dt className="text-xs text-on-surface-variant">{common.asOfDate}</dt><dd><UiDateText locale={locale} value={item.period_start_date} /> – <UiDateText locale={locale} value={item.period_end_date} /></dd></div>
                    <div><dt className="text-xs text-on-surface-variant">{common.recordedAtCutoff}</dt><dd><UiDateTimeText locale={locale} value={item.recorded_at_cutoff} /></dd></div>
                    <div><dt className="text-xs text-on-surface-variant">{common.evidenceRef}</dt><dd className="break-words"><UiBidiText>{item.evidence_ref}</UiBidiText></dd></div>
                    <div className="sm:col-span-2"><dt className="text-xs text-on-surface-variant">{common.reason}</dt><dd className="break-words"><UiBidiText>{item.reason}</UiBidiText></dd></div>
                    <div><dt className="text-xs text-on-surface-variant">{periodCopy.exceptionCodes}</dt><dd className="break-words">{item.exception_codes.length ? item.exception_codes.join(", ") : "—"}</dd></div>
                  </dl>
                  {item.previous_package_id && <p className="mt-2 text-xs text-on-surface-variant">Previous package: <UiLtrText>{item.previous_package_id} · v{item.previous_package_version ?? "—"}</UiLtrText></p>}
                  {item.review && <div className="mt-3 rounded-md bg-surface-container-low p-3 text-sm">
                    <h4 className="font-semibold">{periodCopy.review}: {item.review.decision}</h4>
                    <p className="mt-1 text-xs text-on-surface-variant">{common.reviewedBy}: <UiLtrText>{item.review.reviewer_user_id}</UiLtrText> · {common.reviewedAt}: <UiDateTimeText locale={locale} value={item.review.recorded_at} /></p>
                    <p className="mt-1 break-words"><UiBidiText>{item.review.reason}</UiBidiText></p>
                    {item.review.resulting_period_version !== null && <p className="mt-1 text-xs">{periodCopy.resultPeriodVersion}: <UiLtrText>v{item.review.resulting_period_version}</UiLtrText></p>}
                  </div>}
                  {stale && <p className="mt-3 rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{periodCopy.staleExplanation}</p>}
                  <details className="mt-3 rounded-md bg-surface-container-low p-3">
                    <summary className="cursor-pointer text-sm font-semibold">{periodCopy.evidenceSnapshot} · {snapshot.stateValue ?? "READY"}</summary>
                    {snapshot.reasonCodes.length > 0 && <p className="mt-2 break-words text-xs text-on-surface-variant">{snapshot.reasonCodes.join(", ")}</p>}
                    <pre className="mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-md border border-outline-variant bg-surface p-3 text-xs" dir="ltr">{JSON.stringify(item.evidence_snapshot, null, 2)}</pre>
                    <p className="mt-2 break-all text-xs text-on-surface-variant">Evidence fingerprint: <UiLtrText>{item.evidence_fingerprint}</UiLtrText></p>
                    <p className="mt-1 break-all text-xs text-on-surface-variant">Ledger fingerprint: <UiLtrText>{item.ledger_fingerprint}</UiLtrText></p>
                  </details>
                  {canReviewPackage && <div className="mt-3 grid gap-2 border-t border-outline-variant pt-3">
                    <label className="grid gap-1 text-xs font-medium">{periodCopy.reviewReason}<input maxLength={2000} value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} className="min-h-9 min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm" /></label>
                    <div className="flex flex-wrap gap-2"><button type="button" disabled={isPending} onClick={() => review(item, true)} className="min-h-9 rounded-md bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-50">{periodCopy.approve}</button><button type="button" disabled={isPending} onClick={() => review(item, false)} className="min-h-9 rounded-md border border-outline-variant px-3 text-sm disabled:opacity-50">{periodCopy.reject}</button></div>
                  </div>}
                </article>;
              })}
            </div>}
          </section>

          <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
            <h2 className="mb-3 text-base font-semibold text-on-surface">{periodCopy.reports}</h2>
            <nav aria-label={periodCopy.reports} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {reportLinks.filter(([, , allowed]) => allowed).map(([href, label]) => <Link key={href} href={href} className="font-medium text-primary underline-offset-4 hover:underline">{label}</Link>)}
            </nav>
          </section>
        </>
      )}

      {error && <p role="alert" className="rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{error}</p>}
      {message && <p role="status" className="rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{message}</p>}
    </div>
  );
}
