"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  acceptAccountingInceptionPackage,
  postAccountingInceptionJournal,
  prepareAccountingInceptionJournal,
  reviewAccountingInceptionPackage,
} from "@/lib/accounting/actions";
import type { AccountingActionErrorCode, AccountingActionResult, AccountingInceptionPackageDetail } from "@/lib/accounting/types";
import { getInceptionItemLifecyclePolicy, getInceptionLifecyclePolicy } from "@/lib/accounting/inception-ui-policy";
import { getAccountingInceptionDictionary } from "@/lib/i18n/dictionaries/accounting-inception";
import type { Locale } from "@/lib/i18n/locales";
import { InceptionPackageForm } from "../InceptionPackagesClient";

export type InceptionDetailPageState = "ready" | "not-found" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type OperationResult = AccountingActionResult<unknown>;
type Operation =
  | { kind: "prepare"; packageId: string; packageVersion: number; itemId: string }
  | { kind: "post"; journalId: string; expectedVersion: number }
  | { kind: "accept"; packageId: string; packageVersion: number };
type ReviewOperation = { packageId: string; packageVersion: number };

function ErrorState({ state, locale }: { state: Exclude<InceptionDetailPageState, "ready">; locale: Locale }) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const title = state === "not-found" ? dictionary.packageNotFoundTitle
    : state === "not-initialized" ? dictionary.notInitializedTitle
      : state === "recovery-required" ? dictionary.recoveryRequiredTitle
        : state === "access-denied" ? dictionary.accessDeniedTitle : dictionary.dependencyFailureTitle;
  const body = state === "not-found" ? dictionary.packageNotFoundBody
    : state === "not-initialized" ? dictionary.notInitializedBody
      : state === "recovery-required" ? dictionary.recoveryRequiredBody
        : state === "access-denied" ? dictionary.accessDeniedBody : dictionary.dependencyFailureBody;
  return <section className="rounded-lg border border-outline-variant bg-surface-container-low p-5"><h2 className="text-lg font-semibold text-on-surface">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{body}</p><Link href="/settings/accounting/inception" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4">{dictionary.backToPackages}</Link></section>;
}

function OperationForm({ operation, locale, onComplete, disabled = false }: { operation: Operation; locale: Locale; onComplete: () => void; disabled?: boolean }) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<OperationResult | null>(null);
  const [acceptance, setAcceptance] = useState<Extract<OperationResult, { ok: true }> | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const requestIdValue = requestId.current ?? crypto.randomUUID();
    requestId.current = requestIdValue;
    startTransition(async () => {
      let nextResult: OperationResult;
      try {
        if (operation.kind === "prepare") {
          nextResult = await prepareAccountingInceptionJournal({
            package_id: operation.packageId,
            package_version: operation.packageVersion,
            item_id: operation.itemId,
            reason,
            request_id: requestIdValue,
          });
        } else if (operation.kind === "post") {
          nextResult = await postAccountingInceptionJournal({
            journal_id: operation.journalId,
            expected_version: operation.expectedVersion,
            request_id: requestIdValue,
          });
        } else {
          nextResult = await acceptAccountingInceptionPackage({
            package_id: operation.packageId,
            package_version: operation.packageVersion,
            reason,
            request_id: requestIdValue,
          });
        }
      } catch {
        nextResult = { ok: false, code: "dependency_failure" };
      }
      setResult(nextResult);
      if (nextResult.ok) {
        requestId.current = null;
        if (operation.kind === "accept") setAcceptance(nextResult);
        onComplete();
        router.refresh();
      }
    });
  }

  const errorCode = result && !result.ok ? result.code as AccountingActionErrorCode : null;
  return (
    <form className="grid min-w-0 gap-2" onSubmit={submit} onChange={() => { requestId.current = null; setResult(null); }}>
      {operation.kind !== "post" ? <label className="grid min-w-0 gap-1 text-xs font-medium text-on-surface-variant">{dictionary.operationReason}<textarea required maxLength={2000} value={reason} onChange={(event) => { requestId.current = null; setReason(event.target.value); setResult(null); }} rows={2} disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm font-normal text-on-surface" /></label> : null}
      <button type="submit" disabled={isPending || disabled} className="min-h-10 justify-self-start rounded-md bg-primary px-3 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">{isPending ? dictionary.saving : operation.kind === "prepare" ? dictionary.prepareJournal : operation.kind === "post" ? dictionary.postJournal : dictionary.acceptPackage}</button>
      {errorCode ? <p role="alert" className="text-sm text-error">{dictionary.errors[errorCode] ?? dictionary.dependencyFailureBody}</p> : null}
      {result?.ok ? <p role="status" aria-live="polite" className="text-sm text-on-surface-variant">{dictionary.actionCompleted}</p> : null}
      {acceptance?.ok && operation.kind === "accept" ? <OperationAcceptanceSummary result={acceptance} locale={locale} /> : null}
    </form>
  );
}

function ReviewForm({ operation, locale, disabled, approveDisabled, onComplete }: { operation: ReviewOperation; locale: Locale; disabled: boolean; approveDisabled: boolean; onComplete: () => void }) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<OperationResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter as HTMLButtonElement | null;
    const approve = submitter?.value === "approve";
    const requestIdValue = requestId.current ?? crypto.randomUUID();
    requestId.current = requestIdValue;
    startTransition(async () => {
      let nextResult: OperationResult;
      try {
        nextResult = await reviewAccountingInceptionPackage({
          package_id: operation.packageId,
          package_version: operation.packageVersion,
          approve,
          reason,
          request_id: requestIdValue,
        });
      } catch {
        nextResult = { ok: false, code: "dependency_failure" };
      }
      setResult(nextResult);
      if (nextResult.ok) {
        requestId.current = null;
        onComplete();
        router.refresh();
      }
    });
  }
  const errorCode = result && !result.ok ? result.code as AccountingActionErrorCode : null;
  return (
    <form className="grid min-w-0 gap-3" onSubmit={submit} onChange={() => { requestId.current = null; setResult(null); }}>
      <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">{dictionary.reviewReason}<textarea required maxLength={2000} value={reason} onChange={(event) => { requestId.current = null; setReason(event.target.value); setResult(null); }} rows={3} disabled={disabled || isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" /></label>
      <div className="flex min-w-0 flex-wrap gap-2">
        <button type="submit" name="decision" value="approve" disabled={disabled || approveDisabled || isPending} className="min-h-10 rounded-md bg-primary px-3 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">{isPending ? dictionary.saving : dictionary.approve}</button>
        <button type="submit" name="decision" value="reject" disabled={disabled || isPending} className="min-h-10 rounded-md border border-outline-variant px-3 text-sm font-semibold text-on-surface disabled:cursor-not-allowed disabled:opacity-60">{dictionary.reject}</button>
      </div>
      {errorCode ? <p role="alert" className="text-sm text-error">{dictionary.errors[errorCode] ?? dictionary.dependencyFailureBody}</p> : null}
      {result?.ok ? <p role="status" aria-live="polite" className="text-sm text-on-surface-variant">{dictionary.actionCompleted}</p> : null}
    </form>
  );
}

function OperationAcceptanceSummary({ result, locale }: { result: Extract<OperationResult, { ok: true }>; locale: Locale }) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const value = result.value as { acceptance_id?: string; trial_balance?: { as_of_date: string; debit_balance_total_halalah: string; credit_balance_total_halalah: string; account_count: number } };
  if (!value.trial_balance) return null;
  return <dl className="grid min-w-0 gap-2 rounded-md border border-outline-variant p-3 sm:grid-cols-2"><div><dt className="text-xs text-on-surface-variant">{dictionary.trialBalance}</dt><dd className="break-all text-xs text-on-surface"><bdi dir="ltr">{value.acceptance_id}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.cutoverDate}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{value.trial_balance.as_of_date}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.debitTotal}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{value.trial_balance.debit_balance_total_halalah}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.creditTotal}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{value.trial_balance.credit_balance_total_halalah}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.accountCount}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{value.trial_balance.account_count}</bdi></dd></div></dl>;
}

function InceptionItemCard({
  item,
  itemIndex,
  detail,
  locale,
  canManage,
  canPrepare,
  canPost,
  isCreator,
  isReviewer,
  accepted,
}: {
  item: AccountingInceptionPackageDetail["version"]["payload"]["items"][number];
  itemIndex: number;
  detail: AccountingInceptionPackageDetail;
  locale: Locale;
  canManage: boolean;
  canPrepare: boolean;
  canPost: boolean;
  isCreator: boolean;
  isReviewer: boolean;
  accepted: boolean;
}) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const link = detail.journal_links.find((candidate) => candidate.item_id === item.item_id);
  const journalVersionsMatch = link !== undefined && link.current_version === link.prepared_version;
  const evidenceById = new Map(detail.version.payload.evidence_inventory.map((evidence) => [`${evidence.evidence_id}:${evidence.version}`, evidence]));
  const missingEvidence = item.is_material && (item.evidence_refs.length === 0 || item.evidence_refs.some((reference) => !evidenceById.has(`${reference.evidence_id}:${reference.version}`)));
  const itemPolicy = getInceptionItemLifecyclePolicy({
    canManage,
    canPrepare,
    canPost,
    isCreator,
    isReviewer,
    accepted,
    reviewDecision: detail.review?.decision ?? null,
    classification: item.classification,
    journalStatus: link?.status ?? null,
    journalVersionsMatch,
  });
  const canPrepareThis = itemPolicy.canPrepare;
  const canPostThis = itemPolicy.canPost;
  return (
    <li className="min-w-0 list-none rounded-lg border border-outline-variant bg-surface p-4">
      <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><h3 className="min-w-0 font-semibold text-on-surface">{dictionary.item} {itemIndex + 1} · {dictionary.states.classifications[item.classification]}</h3><span className="text-xs text-on-surface-variant">{dictionary.resolution}: {dictionary.resolutions[item.resolution_state]}</span></div>
      <dl className="mt-3 grid min-w-0 gap-2 sm:grid-cols-2">
        <div className="min-w-0"><dt className="text-xs text-on-surface-variant">{dictionary.source}</dt><dd className="break-words text-sm text-on-surface"><bdi dir="ltr">{item.source_domain} · {item.source_record_key} · {item.economic_event_key}</bdi></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.material}</dt><dd className="text-sm text-on-surface">{item.is_material ? dictionary.yes : dictionary.no}</dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.reconciliation}</dt><dd className="break-words text-sm text-on-surface">{dictionary.states.reconciliationCategories[item.reconciliation_category]} · {item.reconciliation_reference ?? "—"}</dd></div>
        <div><dt className="text-xs text-on-surface-variant">{dictionary.party}</dt><dd className="break-words text-sm text-on-surface">{dictionary.states.parties[item.party_type]} · {item.party_reference ?? "—"}</dd></div>
      </dl>
      {item.classification === "UNRESOLVED" || item.resolution_state === "UNRESOLVED" ? <p className="mt-3 rounded-md border border-error/20 bg-error-container p-3 text-sm text-on-error-container">{dictionary.unresolved}</p> : null}
      {missingEvidence ? <p className="mt-3 rounded-md border border-error/20 bg-error-container p-3 text-sm text-on-error-container">{dictionary.missingEvidence}</p> : null}
      <section className="mt-3 grid min-w-0 gap-2">
        <h4 className="text-sm font-semibold text-on-surface">{dictionary.evidence}</h4>
        {item.evidence_refs.length === 0 ? <p className="text-sm text-on-surface-variant">—</p> : item.evidence_refs.map((reference) => {
          const evidence = evidenceById.get(`${reference.evidence_id}:${reference.version}`);
          return <p key={`${reference.evidence_id}:${reference.version}`} className="break-all text-sm text-on-surface-variant"><bdi dir="ltr">{reference.evidence_id} v{reference.version}</bdi>{evidence ? ` · ${dictionary.states.evidenceTypes[evidence.evidence_type]} · ${evidence.evidence_ref} · ${evidence.sha256}` : ` · ${dictionary.missingEvidence}`}</p>;
        })}
      </section>
      {item.journal ? <section className="mt-3 grid min-w-0 gap-2 rounded-md border border-outline-variant p-3">
        <h4 className="text-sm font-semibold text-on-surface">{dictionary.journal}</h4>
        <p className="text-sm text-on-surface"><bdi dir="ltr">{item.journal.accounting_date} · {item.journal.period_id} v{item.journal.period_version}</bdi></p>
        <p className="break-words text-sm text-on-surface">{item.journal.description_en} · <span dir="rtl">{item.journal.description_ar}</span></p>
        <ul className="grid min-w-0 gap-2">{item.journal.lines.map((line, lineIndex) => <li key={`${line.account_id}:${line.account_version}:${lineIndex}`} className="min-w-0 list-none rounded-md bg-surface-container-low p-2 text-xs text-on-surface-variant"><bdi dir="ltr">{line.side} · {line.amount_halalah} halalah · {line.account_id} v{line.account_version}</bdi><p className="mt-1 break-words">{line.description_en} · <span dir="rtl">{line.description_ar}</span></p></li>)}</ul>
      </section> : null}
      <section className="mt-3 grid min-w-0 gap-2 rounded-md border border-outline-variant p-3">
        <h4 className="text-sm font-semibold text-on-surface">{dictionary.journalStatus}</h4>
        {link ? <div className="grid min-w-0 gap-2 text-sm text-on-surface-variant"><p>{dictionary.journalId}: <bdi dir="ltr" className="break-all">{link.journal_id}</bdi></p><p>{dictionary.preparedJournalVersion}: <bdi dir="ltr">{link.prepared_version}</bdi></p><p>{dictionary.journalVersion}: <bdi dir="ltr">{link.current_version}</bdi> · {link.status === "POSTED" ? dictionary.posted : dictionary.draft}</p>
          {canPostThis ? <OperationForm operation={{ kind: "post", journalId: link.journal_id, expectedVersion: link.prepared_version }} locale={locale} onComplete={() => undefined} /> : null}
          {link.status === "DRAFT" && !canPostThis ? <p>{!journalVersionsMatch ? dictionary.journalVersionChanged : dictionary.postRequired}</p> : null}
        </div> : <p className="text-sm text-on-surface-variant">{itemPolicy.requiresJournal ? dictionary.requiredJournalPending : "—"}</p>}
        {canPrepareThis ? <OperationForm operation={{ kind: "prepare", packageId: detail.package_id, packageVersion: detail.current_version, itemId: item.item_id }} locale={locale} onComplete={() => undefined} /> : null}
        {itemPolicy.requiresJournal && !link && !canPrepareThis ? <p className="text-sm text-on-surface-variant">{detail.review?.decision !== "APPROVE" ? dictionary.reviewRequired : isCreator ? dictionary.prepareRequired : dictionary.separationReviewer}</p> : null}
      </section>
    </li>
  );
}

function PersistedAcceptanceSummary({ detail, locale }: { detail: AccountingInceptionPackageDetail; locale: Locale }) {
  const dictionary = getAccountingInceptionDictionary(locale);
  if (!detail.acceptance) return null;
  const trialBalance = detail.acceptance.trial_balance;
  return <section className="grid min-w-0 gap-3 rounded-lg border border-outline-variant p-5"><h2 className="text-lg font-semibold text-on-surface">{dictionary.trialBalance}</h2><dl className="grid min-w-0 gap-3 sm:grid-cols-2"><div><dt className="text-xs text-on-surface-variant">{dictionary.cutoverDate}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{trialBalance.as_of_date}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.accountCount}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{trialBalance.account_count}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.debitTotal}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{trialBalance.debit_balance_total_halalah}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.creditTotal}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{trialBalance.credit_balance_total_halalah}</bdi></dd></div></dl><p className="break-all text-xs text-on-surface-variant"><bdi dir="ltr">{detail.acceptance.acceptance_id} · {detail.acceptance.accepted_at}</bdi></p><div className="overflow-x-auto"><table className="w-full min-w-[36rem] border-collapse text-start text-sm"><thead><tr className="border-b border-outline-variant"><th className="p-2">{dictionary.account}</th><th className="p-2">{dictionary.accountType}</th><th className="p-2">{dictionary.debitTotal}</th><th className="p-2">{dictionary.creditTotal}</th></tr></thead><tbody>{trialBalance.accounts.map((account) => <tr key={account.account_id} className="border-b border-outline-variant"><td className="p-2"><bdi dir="ltr">{account.account_code}</bdi> · {locale === "ar" ? account.account_name_ar : account.account_name_en}</td><td className="p-2">{dictionary.accountTypes[account.account_type]}</td><td className="p-2"><bdi dir="ltr">{account.debit_balance_halalah}</bdi></td><td className="p-2"><bdi dir="ltr">{account.credit_balance_halalah}</bdi></td></tr>)}</tbody></table></div></section>;
}

export default function InceptionPackageDetailClient({
  locale,
  state,
  detail,
  isCreator,
  isReviewer,
  canManage,
  canPrepare,
  canPost,
  canView,
}: {
  locale: Locale;
  state: InceptionDetailPageState;
  detail: AccountingInceptionPackageDetail | null;
  isCreator: boolean;
  isReviewer: boolean;
  canManage: boolean;
  canPrepare: boolean;
  canPost: boolean;
  canView: boolean;
}) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const [editing, setEditing] = useState(false);
  if (state !== "ready" || !detail) return <ErrorState state={state === "ready" ? "not-found" : state} locale={locale} />;
  const accepted = detail.acceptance !== null;
  const currentPayload = detail.version.payload;
  const unresolvedCount = currentPayload.items.filter((item) => item.classification === "UNRESOLVED" || item.resolution_state === "UNRESOLVED").length;
  const evidenceVersions = new Set(currentPayload.evidence_inventory.map((evidence) => `${evidence.evidence_id}:${evidence.version}`));
  const missingEvidenceCount = currentPayload.items.filter((item) =>
    item.is_material && (
      item.evidence_refs.length === 0
      || item.evidence_refs.some((reference) => !evidenceVersions.has(`${reference.evidence_id}:${reference.version}`))
    ),
  ).length;
  const requiredJournalItems = currentPayload.items.filter((item) => item.classification === "RECONSTRUCTED_HISTORY" || item.classification === "OPENING_BALANCE");
  const journalByItem = new Map(detail.journal_links.map((link) => [link.item_id, link]));
  const pendingJournalCount = requiredJournalItems.filter((item) => journalByItem.get(item.item_id)?.status !== "POSTED").length;
  const lifecycle = getInceptionLifecyclePolicy({
    canManage,
    canView,
    canPrepare,
    canPost,
    isCreator,
    isReviewer,
    accepted,
    hasReview: detail.review !== null,
    reviewDecision: detail.review?.decision ?? null,
    unresolvedCount,
    missingEvidenceCount,
    requiredJournalCount: requiredJournalItems.length,
    pendingJournalCount,
  });

  return (
    <div className="grid min-w-0 gap-6">
      <section className="grid min-w-0 gap-4 rounded-lg border border-outline-variant bg-surface p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3"><div className="min-w-0"><h2 className="text-lg font-semibold text-on-surface">{dictionary.package} <bdi dir="ltr" className="break-all">{detail.package_id}</bdi></h2><p className="mt-2 text-sm text-on-surface-variant">{dictionary.currentVersion}: <bdi dir="ltr">{detail.current_version}</bdi> · {accepted ? dictionary.accepted : dictionary.pending}</p></div>{lifecycle.canRevise && !editing ? <button type="button" onClick={() => setEditing(true)} className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary">{dictionary.revisePackage}</button> : null}</div>
        {editing ? <InceptionPackageForm locale={locale} packageId={detail.package_id} version={detail.version} onCancel={() => setEditing(false)} /> : (
          <dl className="grid min-w-0 gap-3 border-t border-outline-variant pt-4 sm:grid-cols-2"><div><dt className="text-xs text-on-surface-variant">{dictionary.startDate}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{detail.version.accounting_start_date}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.cutoverDate}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{detail.version.cutover_boundary_date}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.createdBy}</dt><dd className="break-all text-sm text-on-surface"><bdi dir="ltr">{detail.version.created_by}</bdi></dd></div><div><dt className="text-xs text-on-surface-variant">{dictionary.createdAt}</dt><dd className="text-sm text-on-surface"><bdi dir="ltr">{new Date(detail.version.created_at).toLocaleString(locale)}</bdi></dd></div></dl>
        )}
        {!editing ? <Link href="/settings/accounting/inception" className="inline-flex min-h-10 items-center justify-self-start text-sm font-semibold text-primary underline underline-offset-4">{dictionary.backToPackages}</Link> : null}
      </section>

      <section className="grid min-w-0 gap-3 rounded-lg border border-outline-variant p-5"><h2 className="text-lg font-semibold text-on-surface">{dictionary.currentCoverage}</h2>
        {unresolvedCount > 0 ? <p className="rounded-md border border-error/20 bg-error-container p-3 text-sm text-on-error-container">{dictionary.unresolved} <bdi dir="ltr">{unresolvedCount}</bdi></p> : null}
        {missingEvidenceCount > 0 ? <p className="rounded-md border border-error/20 bg-error-container p-3 text-sm text-on-error-container">{dictionary.missingEvidence} <bdi dir="ltr">{missingEvidenceCount}</bdi></p> : null}
        {pendingJournalCount > 0 ? <p className="rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{dictionary.requiredJournalPending} <bdi dir="ltr">{pendingJournalCount}</bdi></p> : null}
        <ol className="grid min-w-0 gap-3">{currentPayload.items.map((item, index) => <InceptionItemCard key={item.item_id} item={item} itemIndex={index} detail={detail} locale={locale} canManage={canManage} canPrepare={canPrepare} canPost={canPost} isCreator={isCreator} isReviewer={isReviewer} accepted={accepted} />)}</ol>
        <div className="grid min-w-0 gap-2 border-t border-outline-variant pt-3"><h3 className="font-semibold text-on-surface">{dictionary.evidenceInventory}</h3>{currentPayload.evidence_inventory.length === 0 ? <p className="text-sm text-on-surface-variant">—</p> : currentPayload.evidence_inventory.map((evidence) => <p key={`${evidence.evidence_id}:${evidence.version}`} className="break-all text-sm text-on-surface-variant"><bdi dir="ltr">{evidence.evidence_id} v{evidence.version} · {evidence.sha256}</bdi> · {dictionary.states.evidenceTypes[evidence.evidence_type]} · {evidence.evidence_ref}</p>)}</div>
        <div className="grid min-w-0 gap-2"><h3 className="font-semibold text-on-surface">{dictionary.reconciliationReferences}</h3>{currentPayload.reconciliation_references.length === 0 ? <p className="text-sm text-on-surface-variant">—</p> : currentPayload.reconciliation_references.map((reference, index) => <p key={`${reference.category}:${index}`} className="break-words text-sm text-on-surface-variant">{dictionary.states.reconciliationCategories[reference.category]} · {reference.reference}</p>)}</div>
      </section>

      <section className="grid min-w-0 gap-4 rounded-lg border border-outline-variant p-5"><h2 className="text-lg font-semibold text-on-surface">{dictionary.reviewHistory}</h2>
        {detail.review ? <div className="rounded-md border border-outline-variant p-3"><p className="font-medium text-on-surface">{detail.review.decision === "APPROVE" ? dictionary.approvalRecorded : dictionary.rejectionRecorded} · <bdi dir="ltr">{detail.review.reviewed_at}</bdi></p><p className="mt-1 break-words text-sm text-on-surface-variant">{detail.review.reason}</p><p className="mt-1 break-all text-xs text-on-surface-variant"><bdi dir="ltr">{detail.review.reviewer_user_id}</bdi></p></div> : <p className="text-sm text-on-surface-variant">{dictionary.noReview}</p>}
        {canManage && !accepted && !detail.review ? <div className="grid min-w-0 gap-2 rounded-md border border-outline-variant p-3"><h3 className="font-semibold text-on-surface">{dictionary.reviewAction}</h3>{isCreator ? <p className="text-sm text-on-surface-variant">{dictionary.separationCreator}</p> : null}{lifecycle.reviewBlocked ? <p className="text-sm text-on-surface-variant">{dictionary.unresolved} {dictionary.missingEvidence}</p> : null}<p className="text-sm text-on-surface-variant">{dictionary.separationReviewer}</p><ReviewForm operation={{ packageId: detail.package_id, packageVersion: detail.current_version }} locale={locale} disabled={!lifecycle.canReview} approveDisabled={lifecycle.reviewBlocked} onComplete={() => undefined} /></div> : null}
        {detail.review_history.some((review) => review.package_version !== detail.current_version) ? <ol className="grid min-w-0 gap-2">{detail.review_history.filter((review) => review.package_version !== detail.current_version).map((review) => <li key={review.review_id} className="min-w-0 list-none rounded-md border border-outline-variant p-3"><p className="text-sm font-medium text-on-surface">{review.decision === "APPROVE" ? dictionary.approvalRecorded : dictionary.rejectionRecorded} · {dictionary.version} <bdi dir="ltr">{review.package_version}</bdi></p><p className="mt-1 break-words text-sm text-on-surface-variant">{review.reason}</p><p className="mt-1 break-all text-xs text-on-surface-variant"><bdi dir="ltr">{review.reviewer_user_id} · {review.reviewed_at}</bdi></p></li>)}</ol> : null}
      </section>

      {canManage && !accepted && detail.review?.decision === "APPROVE" ? <section className="grid min-w-0 gap-3 rounded-lg border border-outline-variant p-5"><h2 className="text-lg font-semibold text-on-surface">{dictionary.acceptPackage}</h2><p className="text-sm text-on-surface-variant">{dictionary.acceptRequired}</p>{lifecycle.acceptanceBlocked ? <p className="rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{unresolvedCount > 0 ? dictionary.unresolved : missingEvidenceCount > 0 ? dictionary.missingEvidence : dictionary.requiredJournalPending}</p> : null}<OperationForm operation={{ kind: "accept", packageId: detail.package_id, packageVersion: detail.current_version }} locale={locale} disabled={!lifecycle.canAccept} onComplete={() => undefined} /><p className="text-xs text-on-surface-variant">{!lifecycle.canAccept ? dictionary.acceptRequired : dictionary.trialBalance}</p></section> : null}

      <section className="grid min-w-0 gap-3 rounded-lg border border-outline-variant p-5"><h2 className="text-lg font-semibold text-on-surface">{dictionary.previousVersions}</h2><ol className="grid min-w-0 gap-2">{[...detail.versions].sort((left, right) => right.version - left.version).map((version) => <li key={version.version} className="min-w-0 list-none rounded-md border border-outline-variant p-3"><div className="flex min-w-0 flex-wrap justify-between gap-2"><strong className="text-sm text-on-surface">{dictionary.version} <bdi dir="ltr">{version.version}</bdi>{version.version === detail.current_version ? ` · ${dictionary.currentVersion}` : ""}</strong><span className="text-xs text-on-surface-variant"><bdi dir="ltr">{new Date(version.created_at).toLocaleString(locale)}</bdi></span></div><p className="mt-1 text-sm text-on-surface-variant">{dictionary.startDate}: <bdi dir="ltr">{version.accounting_start_date}</bdi> · {dictionary.cutoverDate}: <bdi dir="ltr">{version.cutover_boundary_date}</bdi></p><p className="mt-1 break-all text-xs text-on-surface-variant">{dictionary.items}: <bdi dir="ltr">{version.payload.items.length}</bdi> · {dictionary.evidenceInventory}: <bdi dir="ltr">{version.payload.evidence_inventory.length}</bdi> · {dictionary.createdBy}: <bdi dir="ltr">{version.created_by}</bdi></p></li>)}</ol></section>
      {detail.coverage_history.length > 0 ? <section className="grid min-w-0 gap-3 rounded-lg border border-outline-variant p-5"><h2 className="text-lg font-semibold text-on-surface">{dictionary.coverageHistory}</h2><ol className="grid min-w-0 gap-2">{detail.coverage_history.map((entry) => <li key={`${entry.coverage_id}:${entry.version}`} className="min-w-0 list-none rounded-md border border-outline-variant p-3"><p className="break-words text-sm text-on-surface"><bdi dir="ltr">{entry.source_domain} · {entry.source_record_key} · {entry.economic_event_key}</bdi></p><p className="mt-1 text-xs text-on-surface-variant">{dictionary.version} <bdi dir="ltr">{entry.version}</bdi> · {dictionary.states.classifications[entry.classification]} · {dictionary.resolutions[entry.resolution_state]} · {entry.evidence_count} {dictionary.evidenceInventory}</p></li>)}</ol></section> : null}
      {detail.acceptance ? <PersistedAcceptanceSummary detail={detail} locale={locale} /> : null}
    </div>
  );
}
