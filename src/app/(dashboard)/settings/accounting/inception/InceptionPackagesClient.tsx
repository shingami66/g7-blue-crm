"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import { saveAccountingInceptionPackage } from "@/lib/accounting/actions";
import { saveAccountingInceptionPackageInputSchema } from "@/lib/accounting/schemas";
import type {
  AccountingActionErrorCode,
  AccountingActionResult,
  AccountingInceptionPackageSummary,
  AccountingInceptionPayload,
  AccountingInceptionPackageVersion,
} from "@/lib/accounting/types";
import { getAccountingInceptionDictionary } from "@/lib/i18n/dictionaries/accounting-inception";
import type { Locale } from "@/lib/i18n/locales";

export type InceptionPageState = "ready" | "empty" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type SaveResult = AccountingActionResult<{ package_id: string; version: number }>;

export function InceptionPackageForm({
  locale,
  packageId,
  version,
  onCancel,
}: {
  locale: Locale;
  packageId: string | null;
  version: AccountingInceptionPackageVersion | null;
  onCancel: () => void;
}) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const router = useRouter();
  const [evidenceJson, setEvidenceJson] = useState(() => JSON.stringify(version?.payload.evidence_inventory ?? [], null, 2));
  const [itemsJson, setItemsJson] = useState(() => JSON.stringify(version?.payload.items ?? [], null, 2));
  const [referencesJson, setReferencesJson] = useState(() => JSON.stringify(version?.payload.reconciliation_references ?? [], null, 2));
  const [startDate, setStartDate] = useState(version?.payload.accounting_start_date ?? "");
  const [cutoverDate, setCutoverDate] = useState(version?.payload.cutover_boundary_date ?? "");
  const [reason, setReason] = useState("");
  const [result, setResult] = useState<SaveResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const requestId = useRef<string | null>(null);

  function clearRequest() {
    requestId.current = null;
    setResult(null);
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    let evidenceInventory: unknown;
    let items: unknown;
    let reconciliationReferences: unknown;
    try {
      evidenceInventory = JSON.parse(evidenceJson);
      items = JSON.parse(itemsJson);
      reconciliationReferences = JSON.parse(referencesJson);
    } catch {
      setResult({ ok: false, code: "invalid_input" });
      return;
    }
    const payload: AccountingInceptionPayload = {
      accounting_start_date: startDate,
      cutover_boundary_date: cutoverDate,
      evidence_inventory: evidenceInventory as AccountingInceptionPayload["evidence_inventory"],
      items: items as AccountingInceptionPayload["items"],
      reconciliation_references: reconciliationReferences as AccountingInceptionPayload["reconciliation_references"],
    };
    const input = {
      package_id: packageId,
      expected_version: version?.version ?? 0,
      package: payload,
      reason,
      request_id: requestId.current ?? crypto.randomUUID(),
    };
    requestId.current = input.request_id;
    const parsed = saveAccountingInceptionPackageInputSchema.safeParse(input);
    if (!parsed.success) {
      setResult({ ok: false, code: "invalid_input" });
      return;
    }
    startTransition(async () => {
      let nextResult: SaveResult;
      try {
        nextResult = await saveAccountingInceptionPackage(parsed.data);
      } catch {
        nextResult = { ok: false, code: "dependency_failure" };
      }
      setResult(nextResult);
      if (nextResult.ok) {
        requestId.current = null;
        router.push(`/settings/accounting/inception/${nextResult.value.package_id}`);
        router.refresh();
      }
    });
  }

  const errorCode = result && !result.ok ? result.code as AccountingActionErrorCode : null;

  return (
    <section className="grid min-w-0 gap-4 rounded-lg border border-outline-variant bg-surface-container-low p-5">
      <h2 className="text-lg font-semibold text-on-surface">{packageId ? dictionary.revisePackage : dictionary.createPackage}</h2>
      <p className="text-sm text-on-surface-variant">{dictionary.payloadHelp}</p>
      <details className="min-w-0 rounded-md border border-outline-variant p-3"><summary className="cursor-pointer text-sm font-semibold text-primary">{dictionary.payload}</summary><p className="mt-2 break-words text-xs text-on-surface-variant">{dictionary.payloadShape}</p></details>
      <form className="grid min-w-0 gap-4" onSubmit={submit} onChange={clearRequest}>
        <div className="grid min-w-0 gap-3 sm:grid-cols-2">
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">{dictionary.startDate}<input type="date" required value={startDate} onChange={(event) => { clearRequest(); setStartDate(event.target.value); }} disabled={isPending} dir="ltr" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" /></label>
          <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">{dictionary.cutoverDate}<input type="date" required value={cutoverDate} onChange={(event) => { clearRequest(); setCutoverDate(event.target.value); }} disabled={isPending} dir="ltr" className="min-h-11 min-w-0 rounded-md border border-outline-variant bg-surface px-3 font-normal" /></label>
        </div>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">{dictionary.evidenceInventory}<textarea required value={evidenceJson} onChange={(event) => { clearRequest(); setEvidenceJson(event.target.value); }} rows={5} disabled={isPending} spellCheck={false} dir="ltr" className="min-w-0 overflow-x-auto rounded-md border border-outline-variant bg-surface px-3 py-2 font-mono text-xs font-normal" /></label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">{dictionary.items}<textarea required value={itemsJson} onChange={(event) => { clearRequest(); setItemsJson(event.target.value); }} rows={12} disabled={isPending} spellCheck={false} dir="ltr" className="min-w-0 overflow-x-auto rounded-md border border-outline-variant bg-surface px-3 py-2 font-mono text-xs font-normal" /></label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">{dictionary.reconciliationReferences}<textarea required value={referencesJson} onChange={(event) => { clearRequest(); setReferencesJson(event.target.value); }} rows={5} disabled={isPending} spellCheck={false} dir="ltr" className="min-w-0 overflow-x-auto rounded-md border border-outline-variant bg-surface px-3 py-2 font-mono text-xs font-normal" /></label>
        <label className="grid min-w-0 gap-1 text-sm font-medium text-on-surface">{dictionary.operationReason}<textarea required maxLength={2000} value={reason} onChange={(event) => { clearRequest(); setReason(event.target.value); }} rows={3} disabled={isPending} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 font-normal" /></label>
        {errorCode ? <p role="alert" className="text-sm text-error">{errorCode === "invalid_input" ? dictionary.invalidPayload : dictionary.errors[errorCode] ?? dictionary.dependencyFailureBody}</p> : null}
        <div className="flex min-w-0 flex-wrap items-center gap-3">
          <button type="submit" disabled={isPending} className="min-h-11 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-60">{isPending ? dictionary.saving : dictionary.savePackage}</button>
          <button type="button" disabled={isPending} onClick={onCancel} className="min-h-11 rounded-md border border-outline-variant px-4 py-2 text-sm font-semibold text-on-surface">{dictionary.cancel}</button>
        </div>
      </form>
    </section>
  );
}

function InceptionErrorState({ state, locale }: { state: Exclude<InceptionPageState, "ready" | "empty">; locale: Locale }) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const title = state === "not-initialized" ? dictionary.notInitializedTitle
    : state === "recovery-required" ? dictionary.recoveryRequiredTitle
      : state === "access-denied" ? dictionary.accessDeniedTitle : dictionary.dependencyFailureTitle;
  const body = state === "not-initialized" ? dictionary.notInitializedBody
    : state === "recovery-required" ? dictionary.recoveryRequiredBody
      : state === "access-denied" ? dictionary.accessDeniedBody : dictionary.dependencyFailureBody;
  return <section className="rounded-lg border border-outline-variant bg-surface-container-low p-5"><h2 className="text-lg font-semibold text-on-surface">{title}</h2><p className="mt-2 text-sm text-on-surface-variant">{body}</p><Link href="/settings/accounting" className="mt-4 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4">{dictionary.backToSetup}</Link></section>;
}

export default function InceptionPackagesClient({
  locale,
  state,
  packages,
  canManage,
}: {
  locale: Locale;
  state: InceptionPageState;
  packages: AccountingInceptionPackageSummary[];
  canManage: boolean;
}) {
  const dictionary = getAccountingInceptionDictionary(locale);
  const [creating, setCreating] = useState(false);
  if (state !== "ready" && state !== "empty") return <InceptionErrorState state={state} locale={locale} />;
  return (
    <div className="grid min-w-0 gap-6">
      <section className="grid min-w-0 gap-4 rounded-lg border border-outline-variant bg-surface p-5">
        <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
          <div className="min-w-0"><h2 className="text-lg font-semibold text-on-surface">{dictionary.packageList}</h2><p className="mt-2 text-sm text-on-surface-variant">{packages.length === 0 ? dictionary.emptyBody : dictionary.subtitle}</p></div>
          {canManage && !creating ? <button type="button" onClick={() => setCreating(true)} className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary">{dictionary.createPackage}</button> : null}
        </div>
        {packages.length === 0 ? <p className="rounded-md border border-dashed border-outline-variant p-4 text-sm text-on-surface-variant">{dictionary.emptyTitle}</p> : (
          <ul className="grid min-w-0 gap-3">
            {packages.map((item) => <li key={item.package_id} className="min-w-0 list-none rounded-lg border border-outline-variant bg-surface-container-low p-4">
              <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0"><h3 className="font-semibold text-on-surface">{dictionary.package} <bdi dir="ltr">{item.package_id}</bdi></h3><p className="mt-1 text-sm text-on-surface-variant">{dictionary.currentVersion}: <bdi dir="ltr">{item.current_version}</bdi></p><p className="mt-1 text-sm text-on-surface-variant">{dictionary.startDate}: <bdi dir="ltr">{item.accounting_start_date}</bdi> · {dictionary.cutoverDate}: <bdi dir="ltr">{item.cutover_boundary_date}</bdi></p></div>
                <span className="rounded-full border border-outline-variant px-3 py-1 text-xs text-on-surface-variant">{item.accepted ? dictionary.accepted : dictionary.pending}</span>
              </div>
              <Link href={`/settings/accounting/inception/${item.package_id}`} className="mt-3 inline-flex min-h-10 items-center text-sm font-semibold text-primary underline underline-offset-4">{dictionary.package}</Link>
            </li>)}
          </ul>
        )}
      </section>
      {creating ? <InceptionPackageForm locale={locale} packageId={null} version={null} onCancel={() => setCreating(false)} /> : null}
    </div>
  );
}
