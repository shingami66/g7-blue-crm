"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition, type FormEvent } from "react";
import {
  prepareAccountingBankReconciliation,
  reviewAccountingBankReconciliation,
  saveAccountingBankStatementBatch,
  saveAccountingBankStatementLine,
  unmatchAccountingBankReconciliation,
} from "@/lib/accounting/actions";
import { formatHalalahAsSar } from "@/lib/accounting/exact-money";
import { parseSarAsSafeHalalahNumber } from "@/lib/accounting/bank-reconciliation-operations";
import type {
  AccountingBankBindingRead,
  AccountingBankAllocation,
  AccountingBankReconciliation,
  AccountingBankReconciliationGroupRead,
  AccountingBankReconciliationHistory,
  AccountingBankReconciliationRow,
} from "@/lib/accounting/types";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import { UiBidiText, UiLtrText } from "@/components/i18n/UiValueText";
import type { AccountingOperationsDictionary } from "@/lib/i18n/dictionaries/accounting-operations";
import type { Locale } from "@/lib/i18n/locales";

type PageState = "ready" | "not-initialized" | "recovery-required" | "access-denied" | "dependency-failure";
type DraftAllocation = {
  id: string;
  statementKey: string;
  ledgerKey: string;
  amountSar: string;
  rationale: string;
};

function recordText(row: AccountingBankReconciliationRow, key: string): string | null {
  const value = row[key];
  return typeof value === "string" ? value : typeof value === "number" ? String(value) : null;
}

function integerText(row: AccountingBankReconciliationRow, key: string): string | null {
  const value = row[key];
  if (typeof value === "string" && /^-?(0|[1-9][0-9]*)$/.test(value)) return value;
  if (typeof value === "number" && Number.isSafeInteger(value)) return String(value);
  return null;
}

function amountText(value: string | undefined, locale: Locale): string {
  if (value === undefined || !/^-?(0|[1-9][0-9]*)$/.test(value)) return "—";
  void locale;
  return `SAR ${formatHalalahAsSar(value)}`;
}

function statementKey(row: AccountingBankReconciliationRow): string | null {
  const id = recordText(row, "line_id");
  const version = integerText(row, "version");
  return id && version ? `${id}:${version}` : null;
}

function ledgerKey(row: AccountingBankReconciliationRow): string | null {
  const id = recordText(row, "journal_id");
  const version = integerText(row, "journal_version");
  const line = integerText(row, "line_number");
  return id && version && line ? `${id}:${version}:${line}` : null;
}

function statementSign(row: AccountingBankReconciliationRow): 1 | -1 | null {
  const value = integerText(row, "signed_amount_halalah");
  if (value === null || BigInt(value) === BigInt(0)) return null;
  return BigInt(value) < BigInt(0) ? -1 : 1;
}

function ledgerSign(row: AccountingBankReconciliationRow): 1 | -1 | null {
  const signed = integerText(row, "signed_amount");
  if (signed !== null && BigInt(signed) !== BigInt(0)) return BigInt(signed) < BigInt(0) ? -1 : 1;
  const side = recordText(row, "side");
  if (side === "DEBIT") return 1;
  if (side === "CREDIT") return -1;
  return null;
}

function remainingByStatement(groups: AccountingBankReconciliationGroupRead[]) {
  const used = new Map<string, bigint>();
  for (const group of groups) {
    if (group.latest_review_decision !== "APPROVED" && group.latest_review_decision !== "IMPACT_REVIEW_REQUIRED") continue;
    for (const allocation of group.allocations) {
      const key = `${allocation.statement_line_id}:${allocation.statement_line_version}`;
    used.set(key, (used.get(key) ?? BigInt(0)) + BigInt(allocation.statement_allocated_halalah.replace("-", "").replace(/^0+/, "") || "0"));
    }
  }
  return used;
}

function remainingByLedger(groups: AccountingBankReconciliationGroupRead[]) {
  const used = new Map<string, bigint>();
  for (const group of groups) {
    if (group.latest_review_decision !== "APPROVED" && group.latest_review_decision !== "IMPACT_REVIEW_REQUIRED") continue;
    for (const allocation of group.allocations) {
      const key = `${allocation.ledger_journal_id}:${allocation.ledger_journal_version}:${allocation.ledger_line_number}`;
    used.set(key, (used.get(key) ?? BigInt(0)) + BigInt(allocation.ledger_allocated_halalah.replace("-", "").replace(/^0+/, "") || "0"));
    }
  }
  return used;
}

function lineOption(row: AccountingBankReconciliationRow, key: string, locale: Locale): string {
  const dateKey = key === "line_id" ? "transaction_date" : "accounting_date";
  const id = recordText(row, key) ?? "";
  const version = integerText(row, key === "line_id" ? "version" : "journal_version") ?? "";
  const amountKey = key === "line_id" ? "signed_amount_halalah" : "signed_amount";
  return `${id.slice(0, 8)} · v${version} · ${recordText(row, dateKey) ?? "—"} · ${amountText(integerText(row, amountKey) ?? undefined, locale)}`;
}

function shortId(value: string): string {
  return value.length > 12 ? `${value.slice(0, 8)}…${value.slice(-4)}` : value;
}

function DataPanel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="min-w-0 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 md:p-5">
      <h2 className="mb-4 text-base font-semibold text-on-surface">{title}</h2>
      {children}
    </section>
  );
}

function StateMessage({ state, dictionary }: { state: PageState; dictionary: AccountingOperationsDictionary }) {
  const common = dictionary.common;
  const message = state === "access-denied" ? common.accessDenied
    : state === "not-initialized" ? common.notInitialized
    : state === "recovery-required" ? common.recoveryRequired
    : common.dependencyFailure;
  return <p role="status" className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{message}</p>;
}

function SummaryValue({ label, value, locale }: { label: string; value: string | undefined; locale: Locale }) {
  return (
    <div className="min-w-0 rounded-lg bg-surface-container-low p-3">
      <dt className="text-xs text-on-surface-variant">{label}</dt>
      <dd className="mt-1 break-words font-semibold tabular-nums text-on-surface"><UiLtrText>{amountText(value, locale)}</UiLtrText></dd>
    </div>
  );
}

export default function BankReconciliationWorkspace({
  locale,
  dictionary,
  state,
  bindings,
  selectedBindingId,
  reconciliation,
  history,
  asOfDate,
  recordedAtCutoff,
  canReconcile,
  canViewAccounting,
  canViewStatements,
  actorId,
}: {
  locale: Locale;
  dictionary: AccountingOperationsDictionary;
  state: PageState;
  bindings: AccountingBankBindingRead[];
  selectedBindingId: string | null;
  reconciliation: AccountingBankReconciliation | null;
  history: AccountingBankReconciliationHistory | null;
  asOfDate: string;
  recordedAtCutoff: string;
  canReconcile: boolean;
  canViewAccounting: boolean;
  canViewStatements: boolean;
  actorId: string | null;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [allocations, setAllocations] = useState<DraftAllocation[]>([{ id: "allocation-1", statementKey: "", ledgerKey: "", amountSar: "", rationale: "" }]);
  const allocationId = useRef(1);
  const [prepareReason, setPrepareReason] = useState("");
  const [evidenceRef, setEvidenceRef] = useState("");
  const [reviewReason, setReviewReason] = useState("");
  const [unmatchReason, setUnmatchReason] = useState("");
  const [batchReason, setBatchReason] = useState("");
  const [batchForm, setBatchForm] = useState({
    source_document_ref: "",
    evidence_sha256: "",
    evidence_identity: "",
    coverage_start: asOfDate,
    coverage_end: asOfDate,
    opening_balance_sar: "",
    closing_balance_sar: "",
  });
  const [lineForm, setLineForm] = useState({
    batchKey: "",
    stable_line_identity: "",
    transaction_date: asOfDate,
    value_date: "",
    signed_amount_sar: "",
    reference: "",
    description: "",
    source_row_identity: "",
    duplicate_fingerprint: "",
    reason: "",
  });
  const [selectedBatchKey, setSelectedBatchKey] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const bank = dictionary.bank;
  const common = dictionary.common;

  if (state !== "ready") return <StateMessage state={state} dictionary={dictionary} />;

  const selectedBinding = bindings.find((binding) => binding.binding_id === selectedBindingId) ?? null;
  const currentBinding = Boolean(selectedBinding && selectedBinding.status === "APPROVED"
    && selectedBinding.current_status === "APPROVED" && selectedBinding.version === selectedBinding.current_version);
  const summary = reconciliation?.state === "READY" || reconciliation?.state === "TRUNCATED" ? reconciliation : null;
  const groups = history?.state === "READY" ? history.groups : [];
  const statementBatches = history?.state === "READY" ? history.statement_batches : [];
  const selectedBatch = statementBatches.find((batch) => `${batch.batch_id}:${batch.version}` === (selectedBatchKey || lineForm.batchKey)) ?? null;
  const statementLines = summary?.statement_lines ?? [];
  const ledgerLines = summary?.ledger_cash_lines ?? [];
  const statementByKey = new Map(statementLines.map((line) => [statementKey(line), line]).filter((entry): entry is [string, AccountingBankReconciliationRow] => Boolean(entry[0])));
  const ledgerByKey = new Map(ledgerLines.map((line) => [ledgerKey(line), line]).filter((entry): entry is [string, AccountingBankReconciliationRow] => Boolean(entry[0])));
  const statementUsed = remainingByStatement(groups);
  const ledgerUsed = remainingByLedger(groups);
  const pendingGroups = groups.filter((group) => group.is_current_version && group.status === "PREPARED" && group.latest_review_decision === null);
  const canPrepare = canReconcile && currentBinding && pendingGroups.length === 0 && Boolean(selectedBinding && summary && history?.state === "READY");
  const reports = [
    ["/reports/general-ledger", "General Ledger", canViewAccounting],
    ["/reports/trial-balance", "Trial Balance", canViewAccounting],
    ["/reports/profit-and-loss", "Profit & Loss", canViewAccounting && canViewStatements],
    ["/reports/balance-sheet", "Balance Sheet", canViewAccounting && canViewStatements],
  ] as const;

  const updateAllocation = (id: string, update: Partial<DraftAllocation>) => {
    setAllocations((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  };

  const startNewAllocation = () => {
    allocationId.current += 1;
    setAllocations((current) => [...current, {
      id: `allocation-${allocationId.current}`,
      statementKey: "",
      ledgerKey: "",
      amountSar: "",
      rationale: "",
    }]);
  };

  const prepare = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setActionMessage(null);
    if (!canPrepare || !selectedBinding || !summary) {
      setFormError(bank.readOnlyBinding);
      return;
    }
    if (!prepareReason.trim() || allocations.length === 0) {
      setFormError(bank.noEligibleLines);
      return;
    }
    const inputAllocations: AccountingBankAllocation[] = [];
    const allocatedInDraftByStatement = new Map<string, bigint>();
    const allocatedInDraftByLedger = new Map<string, bigint>();
    for (const draft of allocations) {
      const statement = statementByKey.get(draft.statementKey);
      const ledger = ledgerByKey.get(draft.ledgerKey);
      const parsed = parseSarAsSafeHalalahNumber(draft.amountSar);
      if (!statement || !ledger || parsed === null || parsed <= 0) {
        setFormError(bank.amountInvalid);
        return;
      }
      const sSign = statementSign(statement);
      const lSign = ledgerSign(ledger);
      if (!sSign || !lSign) {
        setFormError(bank.noEligibleLines);
        return;
      }
      if (sSign !== lSign) {
        setFormError(bank.oppositeSigns);
        return;
      }
      const absolute = BigInt(parsed);
      const sAmount = BigInt(sSign) * absolute;
      const lAmount = BigInt(lSign) * absolute;
      const maxStatement = BigInt(integerText(statement, "signed_amount_halalah") ?? "0");
      const maxLedger = BigInt(integerText(ledger, "signed_amount") ?? "0");
      const statementRemaining = (maxStatement < BigInt(0) ? -maxStatement : maxStatement)
        - (statementUsed.get(draft.statementKey) ?? BigInt(0))
        - (allocatedInDraftByStatement.get(draft.statementKey) ?? BigInt(0));
      const ledgerKeyValue = draft.ledgerKey;
      const ledgerRemaining = (maxLedger < BigInt(0) ? -maxLedger : maxLedger)
        - (ledgerUsed.get(ledgerKeyValue) ?? BigInt(0))
        - (allocatedInDraftByLedger.get(ledgerKeyValue) ?? BigInt(0));
      if (absolute > statementRemaining || absolute > ledgerRemaining) {
        setFormError(bank.amountInvalid);
        return;
      }
      allocatedInDraftByStatement.set(draft.statementKey, (allocatedInDraftByStatement.get(draft.statementKey) ?? BigInt(0)) + absolute);
      allocatedInDraftByLedger.set(ledgerKeyValue, (allocatedInDraftByLedger.get(ledgerKeyValue) ?? BigInt(0)) + absolute);
      inputAllocations.push({
        statement_line_id: recordText(statement, "line_id")!,
        statement_line_version: Number(integerText(statement, "version")),
        ledger_journal_id: recordText(ledger, "journal_id")!,
        ledger_journal_version: Number(integerText(ledger, "journal_version")),
        ledger_line_number: Number(integerText(ledger, "line_number")),
        statement_allocated_halalah: Number(sAmount),
        ledger_allocated_halalah: Number(lAmount),
        rationale: draft.rationale.trim() || prepareReason.trim(),
      });
    }
    startTransition(async () => {
      try {
        const result = await prepareAccountingBankReconciliation({
        group_id: null,
        expected_version: 0,
        binding_id: selectedBinding.binding_id,
        binding_version: selectedBinding.version,
        as_of_date: asOfDate,
        recorded_at_cutoff: recordedAtCutoff,
        allocations: inputAllocations,
        rationale: prepareReason.trim(),
        evidence_ref: evidenceRef.trim() || null,
        request_id: crypto.randomUUID(),
        });
        if (!result.ok) {
          setActionMessage(`${common.failed} ${common.actionCode}: ${result.code}`);
        } else {
          setActionMessage(`${bank.preparationResult}: ${result.value.group_id} · v${result.value.version}`);
          router.refresh();
        }
      } catch {
        setActionMessage(common.dependencyFailure);
      }
    });
  };

  const review = (group: AccountingBankReconciliationGroupRead, approve: boolean) => {
    setActionMessage(null);
    if (!reviewReason.trim()) {
      setFormError(bank.reviewReason);
      return;
    }
    startTransition(async () => {
      try {
        const result = await reviewAccountingBankReconciliation({
        group_id: group.group_id,
        group_version: group.version,
        approve,
        reason: reviewReason.trim(),
        request_id: crypto.randomUUID(),
        });
        if (!result.ok) setActionMessage(`${common.failed} ${common.actionCode}: ${result.code}`);
        else {
          setActionMessage(`${bank.reviewResult}: ${result.value.decision}`);
          router.refresh();
        }
      } catch {
        setActionMessage(common.dependencyFailure);
      }
    });
  };

  const unmatch = (group: AccountingBankReconciliationGroupRead) => {
    setActionMessage(null);
    if (!unmatchReason.trim()) {
      setFormError(bank.unmatchReason);
      return;
    }
    startTransition(async () => {
      try {
        const result = await unmatchAccountingBankReconciliation({
        group_id: group.group_id,
        group_version: group.version,
        reason: unmatchReason.trim(),
        request_id: crypto.randomUUID(),
        });
        if (!result.ok) setActionMessage(`${common.failed} ${common.actionCode}: ${result.code}`);
        else {
          setActionMessage(`${bank.reviewResult}: ${result.value.decision}`);
          router.refresh();
        }
      } catch {
        setActionMessage(common.dependencyFailure);
      }
    });
  };

  const saveBatch = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setActionMessage(null);
    if (!canReconcile || !currentBinding || !selectedBinding) {
      setFormError(bank.readOnlyBinding);
      return;
    }
    const opening = parseSarAsSafeHalalahNumber(batchForm.opening_balance_sar, { allowZero: true });
    const closing = parseSarAsSafeHalalahNumber(batchForm.closing_balance_sar, { allowZero: true });
    if (opening === null || closing === null || !batchReason.trim()) {
      setFormError(bank.amountInvalid);
      return;
    }
    startTransition(async () => {
      try {
        const result = await saveAccountingBankStatementBatch({
          batch_id: null,
          expected_version: 0,
          binding_id: selectedBinding.binding_id,
          binding_version: selectedBinding.version,
          source_document_ref: batchForm.source_document_ref.trim(),
          evidence_sha256: batchForm.evidence_sha256.trim().toLowerCase(),
          evidence_identity: batchForm.evidence_identity.trim(),
          coverage_start: batchForm.coverage_start,
          coverage_end: batchForm.coverage_end,
          opening_balance_halalah: opening,
          closing_balance_halalah: closing,
          reason: batchReason.trim(),
          request_id: crypto.randomUUID(),
        });
        if (!result.ok) setActionMessage(`${common.failed} ${common.actionCode}: ${result.code}`);
        else {
          const batchKey = `${result.value.batch_id}:${result.value.version}`;
          setSelectedBatchKey(batchKey);
          setLineForm((current) => ({ ...current, batchKey }));
          setActionMessage(`${bank.saveStatementBatch}: ${result.value.batch_id} · v${result.value.version}`);
          router.refresh();
        }
      } catch {
        setActionMessage(common.dependencyFailure);
      }
    });
  };

  const saveLine = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setActionMessage(null);
    if (!canReconcile || !currentBinding || !selectedBinding || !selectedBatch) {
      setFormError(bank.readOnlyBinding);
      return;
    }
    const signedAmount = parseSarAsSafeHalalahNumber(lineForm.signed_amount_sar);
    if (signedAmount === null || signedAmount === 0) {
      setFormError(bank.amountInvalid);
      return;
    }
    if (lineForm.transaction_date < selectedBatch.coverage_start || lineForm.transaction_date > selectedBatch.coverage_end) {
      setFormError(bank.dateCoverageError);
      return;
    }
    startTransition(async () => {
      try {
        const result = await saveAccountingBankStatementLine({
          line_id: null,
          expected_version: 0,
          batch_id: selectedBatch.batch_id,
          batch_version: selectedBatch.version,
          stable_line_identity: lineForm.stable_line_identity.trim(),
          transaction_date: lineForm.transaction_date,
          value_date: lineForm.value_date || null,
          signed_amount_halalah: signedAmount,
          reference: lineForm.reference.trim() || null,
          description: lineForm.description.trim() || null,
          source_row_identity: lineForm.source_row_identity.trim(),
          duplicate_fingerprint: lineForm.duplicate_fingerprint.trim().toLowerCase(),
          reason: lineForm.reason.trim(),
          request_id: crypto.randomUUID(),
        });
        if (!result.ok) setActionMessage(`${common.failed} ${common.actionCode}: ${result.code}`);
        else {
          setActionMessage(`${bank.saveStatementLine}: ${result.value.line_id} · v${result.value.version}${result.value.duplicate_candidate ? ` · ${bank.duplicate}` : ""}`);
          router.refresh();
        }
      } catch {
        setActionMessage(common.dependencyFailure);
      }
    });
  };

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <form method="get" className="grid min-w-0 gap-3 rounded-xl border border-outline-variant bg-surface-container-lowest p-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)_auto] sm:items-end">
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {common.asOfDate}
          <input name="asOfDate" type="date" defaultValue={asOfDate} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" />
        </label>
        <label className="grid gap-1 text-sm font-medium text-on-surface">
          {bank.binding}
          <select name="bindingId" defaultValue={selectedBindingId ?? ""} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" disabled={bindings.length === 0}>
            <option value="">{bank.chooseBinding}</option>
            {bindings.map((binding) => (
              <option key={binding.binding_id} value={binding.binding_id}>
                {binding.masked_display_identity} · v{binding.version} · {binding.current_status}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="min-h-10 rounded-md bg-primary px-4 text-sm font-semibold text-on-primary hover:opacity-90">{common.refresh}</button>
      </form>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-on-surface-variant">
        <span>{common.recordedAtCutoff}: <UiDateTimeText locale={locale} value={recordedAtCutoff} /></span>
        <span>{common.asOfDate}: <UiDateText locale={locale} value={asOfDate} /></span>
      </div>

      {bindings.length === 0 ? (
        <p role="status" className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{bank.noBindings}</p>
      ) : selectedBinding ? (
        <>
          <DataPanel title={bank.binding}>
            <dl className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div><dt className="text-xs text-on-surface-variant">{bank.maskedIdentity}</dt><dd className="mt-1 break-words font-medium text-on-surface"><UiBidiText>{selectedBinding.masked_display_identity}</UiBidiText></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{bank.account}</dt><dd className="mt-1 break-all text-sm text-on-surface"><UiLtrText>{selectedBinding.account_id} · v{selectedBinding.account_version}</UiLtrText></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{bank.status}</dt><dd className="mt-1 text-sm text-on-surface">{selectedBinding.current_status}</dd></div>
              <div><dt className="text-xs text-on-surface-variant">{bank.currentVersion}</dt><dd className="mt-1 text-sm text-on-surface"><UiLtrText>v{selectedBinding.current_version}</UiLtrText></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{bank.effective}</dt><dd className="mt-1 text-sm text-on-surface"><UiDateText locale={locale} value={selectedBinding.effective_from} /> – <UiDateText locale={locale} value={selectedBinding.effective_through} /></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{common.preparedBy}</dt><dd className="mt-1 break-all text-sm text-on-surface"><UiLtrText>{selectedBinding.prepared_by}</UiLtrText></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{common.preparedAt}</dt><dd className="mt-1 text-sm text-on-surface"><UiDateTimeText locale={locale} value={selectedBinding.prepared_at} /></dd></div>
              <div><dt className="text-xs text-on-surface-variant">{common.evidenceRef}</dt><dd className="mt-1 break-words text-sm text-on-surface"><UiBidiText>{selectedBinding.evidence_ref}</UiBidiText></dd></div>
              <div className="sm:col-span-2"><dt className="text-xs text-on-surface-variant">{common.reason}</dt><dd className="mt-1 break-words text-sm text-on-surface"><UiBidiText>{selectedBinding.reason}</UiBidiText></dd></div>
            </dl>
            {!currentBinding && <p className="mt-4 rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{bank.readOnlyBinding}</p>}
          </DataPanel>

          {canReconcile && currentBinding && selectedBinding && <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <DataPanel title={bank.saveStatementBatch}>
              <form onSubmit={saveBatch} className="grid min-w-0 gap-3 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1 text-xs font-medium">{bank.sourceDocument}<input required maxLength={2000} value={batchForm.source_document_ref} onChange={(event) => setBatchForm((current) => ({ ...current, source_document_ref: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium">{bank.evidenceHash}<input required pattern="[0-9a-fA-F]{64}" maxLength={64} value={batchForm.evidence_sha256} onChange={(event) => setBatchForm((current) => ({ ...current, evidence_sha256: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" dir="ltr" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium">{bank.evidenceIdentity}<input required maxLength={300} value={batchForm.evidence_identity} onChange={(event) => setBatchForm((current) => ({ ...current, evidence_identity: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium">{common.reason}<input required maxLength={2000} value={batchReason} onChange={(event) => setBatchReason(event.target.value)} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid gap-1 text-xs font-medium">{bank.coverageStart}<input required type="date" value={batchForm.coverage_start} onChange={(event) => setBatchForm((current) => ({ ...current, coverage_start: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid gap-1 text-xs font-medium">{bank.coverageEnd}<input required type="date" value={batchForm.coverage_end} onChange={(event) => setBatchForm((current) => ({ ...current, coverage_end: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid gap-1 text-xs font-medium">{bank.openingBalance}<input required inputMode="decimal" value={batchForm.opening_balance_sar} onChange={(event) => setBatchForm((current) => ({ ...current, opening_balance_sar: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" dir="ltr" /></label>
                <label className="grid gap-1 text-xs font-medium">{bank.closingBalance}<input required inputMode="decimal" value={batchForm.closing_balance_sar} onChange={(event) => setBatchForm((current) => ({ ...current, closing_balance_sar: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" dir="ltr" /></label>
                <button type="submit" disabled={isPending} className="min-h-10 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50 sm:col-span-2">{isPending ? common.loading : bank.save}</button>
              </form>
            </DataPanel>
            <DataPanel title={bank.saveStatementLine}>
              {statementBatches.length === 0 ? <p className="text-sm text-on-surface-variant">{common.noHistory}</p> : <form onSubmit={saveLine} className="grid min-w-0 gap-3 sm:grid-cols-2">
                <label className="grid min-w-0 gap-1 text-xs font-medium sm:col-span-2">{bank.statementBatch}
                  <select required value={selectedBatchKey || lineForm.batchKey} onChange={(event) => { setSelectedBatchKey(event.target.value); setLineForm((current) => ({ ...current, batchKey: event.target.value })); }} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm">
                    <option value="">{bank.statementBatch}</option>
                    {statementBatches.map((batch) => <option key={`${batch.batch_id}:${batch.version}`} value={`${batch.batch_id}:${batch.version}`}>{shortId(batch.batch_id)} · v{batch.version} · {batch.coverage_start}–{batch.coverage_end}</option>)}
                  </select>
                </label>
                <label className="grid min-w-0 gap-1 text-xs font-medium">{bank.stableLineIdentity}<input required maxLength={300} value={lineForm.stable_line_identity} onChange={(event) => setLineForm((current) => ({ ...current, stable_line_identity: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium">{bank.sourceRowIdentity}<input required maxLength={300} value={lineForm.source_row_identity} onChange={(event) => setLineForm((current) => ({ ...current, source_row_identity: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium">{bank.duplicateFingerprint}<input required pattern="[0-9a-fA-F]{64}" maxLength={64} value={lineForm.duplicate_fingerprint} onChange={(event) => setLineForm((current) => ({ ...current, duplicate_fingerprint: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" dir="ltr" /></label>
                <label className="grid gap-1 text-xs font-medium">{bank.transactionDate}<input required type="date" value={lineForm.transaction_date} onChange={(event) => setLineForm((current) => ({ ...current, transaction_date: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid gap-1 text-xs font-medium">{bank.valueDate}<input type="date" value={lineForm.value_date} onChange={(event) => setLineForm((current) => ({ ...current, value_date: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium">{bank.amountSar}<input required inputMode="decimal" value={lineForm.signed_amount_sar} onChange={(event) => setLineForm((current) => ({ ...current, signed_amount_sar: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" dir="ltr" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium">{bank.reference}<input maxLength={500} value={lineForm.reference} onChange={(event) => setLineForm((current) => ({ ...current, reference: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium sm:col-span-2">{bank.description}<textarea maxLength={2000} value={lineForm.description} onChange={(event) => setLineForm((current) => ({ ...current, description: event.target.value }))} rows={2} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm" /></label>
                <label className="grid min-w-0 gap-1 text-xs font-medium sm:col-span-2">{common.reason}<input required maxLength={2000} value={lineForm.reason} onChange={(event) => setLineForm((current) => ({ ...current, reason: event.target.value }))} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm" /></label>
                <button type="submit" disabled={isPending || !selectedBatch} className="min-h-10 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:opacity-50 sm:col-span-2">{isPending ? common.loading : bank.save}</button>
              </form>}
            </DataPanel>
          </div>}

          {summary ? (
            <DataPanel title={bank.summary}>
              <p className="mb-3 text-sm text-on-surface-variant">{summary.state === "TRUNCATED" ? common.summaryIncomplete : summary.preparation_review_status}</p>
              <dl className="grid min-w-0 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
                <SummaryValue label={bank.statementOpening} value={summary.statement_opening_balance_halalah} locale={locale} />
                <SummaryValue label={bank.statementClosing} value={summary.statement_closing_balance_halalah} locale={locale} />
                <SummaryValue label={bank.statementInflows} value={summary.statement_inflows_halalah} locale={locale} />
                <SummaryValue label={bank.statementOutflows} value={summary.statement_outflows_halalah} locale={locale} />
                <SummaryValue label={bank.ledgerOpening} value={summary.ledger_opening_balance_halalah} locale={locale} />
                <SummaryValue label={bank.ledgerClosing} value={summary.ledger_closing_balance_halalah} locale={locale} />
                <SummaryValue label={bank.ledgerInflows} value={summary.ledger_inflows_halalah} locale={locale} />
                <SummaryValue label={bank.ledgerOutflows} value={summary.ledger_outflows_halalah} locale={locale} />
                <SummaryValue label={bank.matched} value={summary.matched_amount_halalah} locale={locale} />
                <SummaryValue label={bank.unmatchedStatement} value={summary.unmatched_statement_amount_halalah} locale={locale} />
                <SummaryValue label={bank.unmatchedLedger} value={summary.unmatched_ledger_amount_halalah} locale={locale} />
                <SummaryValue label={bank.timingDifference} value={summary.timing_difference_halalah} locale={locale} />
                <SummaryValue label={bank.unexplainedDifference} value={summary.unexplained_difference_halalah} locale={locale} />
                <div className="rounded-lg bg-surface-container-low p-3"><dt className="text-xs text-on-surface-variant">{bank.duplicateCandidates}</dt><dd className="mt-1 font-semibold tabular-nums"><UiLtrText>{summary.duplicate_statement_candidates ?? 0}</UiLtrText></dd></div>
                <div className="rounded-lg bg-surface-container-low p-3"><dt className="text-xs text-on-surface-variant">{bank.impactReviewRequired}</dt><dd className="mt-1 font-semibold tabular-nums"><UiLtrText>{summary.impact_review_required_count ?? 0}</UiLtrText></dd></div>
              </dl>
              {(summary.impact_review_required_count ?? 0) > 0 && <p className="mt-3 rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{bank.impactReviewRequired}: {summary.impact_review_required_count}</p>}
            </DataPanel>
          ) : reconciliation?.state === "NOT_INITIALIZED" ? (
            <p role="status" className="rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm text-on-surface-variant">{common.notInitialized}</p>
          ) : null}

          {summary?.adjustment_required_statement_items.length ? <DataPanel title={bank.adjustmentItems}>
            <ul className="space-y-2">
              {summary.adjustment_required_statement_items.map((line, index) => <li key={statementKey(line) ?? `adjustment-${index}`} className="min-w-0 rounded-md bg-surface-container-low p-3 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong><UiLtrText>{shortId(recordText(line, "line_id") ?? "—")} · v{integerText(line, "version") ?? "—"}</UiLtrText></strong>
                  <span className="tabular-nums"><UiLtrText>{amountText(integerText(line, "signed_amount_halalah") ?? undefined, locale)}</UiLtrText></span>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant"><UiDateText locale={locale} value={recordText(line, "transaction_date")} /> · {line.duplicate_candidate === true ? bank.duplicate : ""}</p>
                <p className="mt-1 break-words"><UiBidiText>{recordText(line, "reference") ?? recordText(line, "description") ?? recordText(line, "source_row_identity") ?? "—"}</UiBidiText></p>
              </li>)}
            </ul>
          </DataPanel> : null}

          {summary && <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <DataPanel title={bank.statementLines}>
              {statementLines.length === 0 ? <p className="text-sm text-on-surface-variant">{bank.noLines}</p> : (
                <div className="max-w-full overflow-x-auto rounded-lg border border-outline-variant">
                  <table className="w-full min-w-[620px] text-start text-sm">
                    <thead className="bg-surface-container-low text-xs text-on-surface-variant"><tr><th className="px-3 py-2 text-start">{bank.statementLine}</th><th className="px-3 py-2 text-start">{common.asOfDate}</th><th className="px-3 py-2 text-end">{bank.amountSar}</th><th className="px-3 py-2 text-start">{bank.duplicate}</th></tr></thead>
                    <tbody>{statementLines.map((line, index) => <tr key={statementKey(line) ?? index} className="border-t border-outline-variant">
                      <td className="px-3 py-2"><div className="font-medium"><UiLtrText>{shortId(recordText(line, "line_id") ?? "—")} · v{integerText(line, "version") ?? "—"}</UiLtrText></div><div className="max-w-[28rem] truncate text-xs text-on-surface-variant"><UiBidiText>{recordText(line, "reference") ?? recordText(line, "description") ?? ""}</UiBidiText></div></td>
                      <td className="px-3 py-2"><UiDateText locale={locale} value={recordText(line, "transaction_date")} /></td>
                      <td className="px-3 py-2 text-end font-medium tabular-nums"><UiLtrText>{amountText(integerText(line, "signed_amount_halalah") ?? undefined, locale)}</UiLtrText></td>
                      <td className="px-3 py-2">{line.duplicate_candidate === true ? bank.duplicate : "—"}</td>
                    </tr>)}</tbody>
                  </table>
                </div>
              )}
            </DataPanel>
            <DataPanel title={bank.ledgerLines}>
              {ledgerLines.length === 0 ? <p className="text-sm text-on-surface-variant">{bank.noLines}</p> : (
                <div className="max-w-full overflow-x-auto rounded-lg border border-outline-variant">
                  <table className="w-full min-w-[620px] text-start text-sm">
                    <thead className="bg-surface-container-low text-xs text-on-surface-variant"><tr><th className="px-3 py-2 text-start">{bank.ledgerLine}</th><th className="px-3 py-2 text-start">{common.asOfDate}</th><th className="px-3 py-2 text-start">{bank.status}</th><th className="px-3 py-2 text-end">{bank.amountSar}</th></tr></thead>
                    <tbody>{ledgerLines.map((line, index) => <tr key={ledgerKey(line) ?? index} className="border-t border-outline-variant">
                      <td className="px-3 py-2"><div><UiLtrText>{shortId(recordText(line, "journal_id") ?? "—")} · v{integerText(line, "journal_version") ?? "—"} · #{integerText(line, "line_number") ?? "—"}</UiLtrText></div></td>
                      <td className="px-3 py-2"><UiDateText locale={locale} value={recordText(line, "accounting_date")} /></td>
                      <td className="px-3 py-2">{recordText(line, "side") ?? "—"}</td>
                      <td className="px-3 py-2 text-end font-medium tabular-nums"><UiLtrText>{amountText(integerText(line, "signed_amount") ?? undefined, locale)}</UiLtrText></td>
                    </tr>)}</tbody>
                  </table>
                </div>
              )}
            </DataPanel>
          </div>}

          {history?.state === "READY" && <div className="grid min-w-0 gap-4 xl:grid-cols-2">
            <DataPanel title={bank.statementBatches}>
              {history.statement_batches.length === 0 ? <p className="text-sm text-on-surface-variant">{common.noHistory}</p> : <ol className="space-y-3">
                {history.statement_batches.map((batch) => <li key={`${batch.batch_id}:${batch.version}`} className="rounded-lg bg-surface-container-low p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2"><strong><UiLtrText>{shortId(batch.batch_id)} · v{batch.version}</UiLtrText></strong><span className="text-xs text-on-surface-variant">{batch.status}</span></div>
                  <p className="mt-2 break-words text-sm"><UiBidiText>{batch.source_document_ref}</UiBidiText></p>
                  <p className="mt-1 text-xs text-on-surface-variant"><UiDateText locale={locale} value={batch.coverage_start} /> – <UiDateText locale={locale} value={batch.coverage_end} /> · {common.recordedAt}: <UiDateTimeText locale={locale} value={batch.recorded_at} /></p>
                  <p className="mt-1 break-all text-xs text-on-surface-variant">SHA-256: <UiLtrText>{batch.evidence_sha256}</UiLtrText></p>
                  <p className="mt-1 text-sm">{amountText(batch.opening_balance_halalah, locale)} → {amountText(batch.closing_balance_halalah, locale)}</p>
                  <p className="mt-1 text-xs text-on-surface-variant">{common.recordedBy}: <UiLtrText>{batch.recorded_by}</UiLtrText> · {common.reason}: <UiBidiText>{batch.reason}</UiBidiText></p>
                </li>)}
              </ol>}
              {history.statement_batches_truncated && <p className="mt-3 text-xs text-on-surface-variant">{common.truncated}</p>}
            </DataPanel>
            <DataPanel title={bank.reconciliationHistory}>
              {groups.length === 0 ? <p className="text-sm text-on-surface-variant">{common.noHistory}</p> : <div className="space-y-3">
                {groups.map((group) => <ReconciliationGroupCard
                  key={`${group.group_id}:${group.version}`}
                  group={group}
                  locale={locale}
                  dictionary={dictionary}
                  actorId={actorId}
                  canReconcile={canReconcile}
                  isPending={isPending}
                  reviewReason={reviewReason}
                  setReviewReason={setReviewReason}
                  unmatchReason={unmatchReason}
                  setUnmatchReason={setUnmatchReason}
                  onReview={review}
                  onUnmatch={unmatch}
                />)}
              </div>}
              {history.groups_truncated && <p className="mt-3 text-xs text-on-surface-variant">{common.truncated}</p>}
            </DataPanel>
          </div>}

          {canReconcile && currentBinding && summary && history?.state === "READY" && <DataPanel title={bank.prepare}>
            {pendingGroups.length > 0 && <p className="mb-4 rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{bank.prepareDisabled}</p>}
            {!currentBinding && <p className="mb-4 text-sm text-on-surface-variant">{bank.readOnlyBinding}</p>}
            <form onSubmit={prepare} className="grid min-w-0 gap-4">
              <div className="space-y-3">
                {allocations.map((item) => <div key={item.id} className="grid min-w-0 gap-3 rounded-lg bg-surface-container-low p-3 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1.2fr)_minmax(10rem,.7fr)_minmax(0,1fr)_auto] xl:items-end">
                  <label className="grid min-w-0 gap-1 text-xs font-medium text-on-surface">{bank.statementLine}
                    <select value={item.statementKey} onChange={(event) => updateAllocation(item.id, { statementKey: event.target.value })} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm">
                      <option value="">{bank.statementLine}</option>
                      {statementLines.map((line) => {
                        const key = statementKey(line);
                        if (!key) return null;
                        const signed = integerText(line, "signed_amount_halalah");
                        const remaining = signed === null ? BigInt(0) : (BigInt(signed) < BigInt(0) ? -BigInt(signed) : BigInt(signed)) - (statementUsed.get(key) ?? BigInt(0));
                        return <option key={key} value={key} disabled={remaining <= BigInt(0)}>{lineOption(line, "line_id", locale)}</option>;
                      })}
                    </select>
                  </label>
                  <label className="grid min-w-0 gap-1 text-xs font-medium text-on-surface">{bank.ledgerLine}
                    <select value={item.ledgerKey} onChange={(event) => updateAllocation(item.id, { ledgerKey: event.target.value })} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm">
                      <option value="">{bank.ledgerLine}</option>
                      {ledgerLines.map((line) => {
                        const key = ledgerKey(line);
                        if (!key) return null;
                        const signed = integerText(line, "signed_amount");
                        const remaining = signed === null ? BigInt(0) : (BigInt(signed) < BigInt(0) ? -BigInt(signed) : BigInt(signed)) - (ledgerUsed.get(key) ?? BigInt(0));
                        return <option key={key} value={key} disabled={remaining <= BigInt(0)}>{lineOption(line, "journal_id", locale)}</option>;
                      })}
                    </select>
                  </label>
                  <label className="grid gap-1 text-xs font-medium text-on-surface">{bank.amountSar}<input inputMode="decimal" value={item.amountSar} onChange={(event) => updateAllocation(item.id, { amountSar: event.target.value })} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm" /></label>
                  <label className="grid gap-1 text-xs font-medium text-on-surface">{bank.allocationReason}<input value={item.rationale} onChange={(event) => updateAllocation(item.id, { rationale: event.target.value })} className="min-h-10 min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm" /></label>
                  <button type="button" onClick={() => setAllocations((current) => current.length === 1 ? current : current.filter((entry) => entry.id !== item.id))} className="min-h-10 rounded-md border border-outline-variant px-3 text-sm hover:bg-surface">{bank.removeAllocation}</button>
                </div>)}
              </div>
              <button type="button" onClick={startNewAllocation} className="w-fit rounded-md border border-outline-variant px-3 py-2 text-sm font-medium hover:bg-surface">{bank.addAllocation}</button>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="grid gap-1 text-sm font-medium text-on-surface">{bank.rationale}<textarea required maxLength={2000} value={prepareReason} onChange={(event) => setPrepareReason(event.target.value)} rows={3} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm" /></label>
                <label className="grid gap-1 text-sm font-medium text-on-surface">{common.evidenceRef}<textarea maxLength={2000} value={evidenceRef} onChange={(event) => setEvidenceRef(event.target.value)} rows={3} className="min-w-0 rounded-md border border-outline-variant bg-surface px-3 py-2 text-sm" /></label>
              </div>
              <button type="submit" disabled={!canPrepare || isPending || statementLines.length === 0 || ledgerLines.length === 0} className="min-h-10 w-fit rounded-md bg-primary px-4 text-sm font-semibold text-on-primary disabled:cursor-not-allowed disabled:opacity-50">{isPending ? common.loading : bank.prepare}</button>
            </form>
          </DataPanel>}

          {formError && <p role="alert" className="rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{formError}</p>}
          {actionMessage && <p role="status" className="rounded-md border border-outline-variant p-3 text-sm text-on-surface-variant">{actionMessage}</p>}

          {reports.some(([, , allowed]) => allowed) && <DataPanel title={bank.allReports}>
            <nav aria-label={bank.allReports} className="flex flex-wrap gap-x-5 gap-y-2 text-sm">
              {reports.filter(([, , allowed]) => allowed).map(([href, label]) => <Link key={href} href={href} className="font-medium text-primary underline-offset-4 hover:underline">{label}</Link>)}
            </nav>
          </DataPanel>}
        </>
      ) : null}
    </div>
  );
}

function ReconciliationGroupCard({
  group,
  locale,
  dictionary,
  actorId,
  canReconcile,
  isPending,
  reviewReason,
  setReviewReason,
  unmatchReason,
  setUnmatchReason,
  onReview,
  onUnmatch,
}: {
  group: AccountingBankReconciliationGroupRead;
  locale: Locale;
  dictionary: AccountingOperationsDictionary;
  actorId: string | null;
  canReconcile: boolean;
  isPending: boolean;
  reviewReason: string;
  setReviewReason: (value: string) => void;
  unmatchReason: string;
  setUnmatchReason: (value: string) => void;
  onReview: (group: AccountingBankReconciliationGroupRead, approve: boolean) => void;
  onUnmatch: (group: AccountingBankReconciliationGroupRead) => void;
}) {
  const bank = dictionary.bank;
  const common = dictionary.common;
  const isCurrent = group.is_current_version && group.current_version === group.version;
  const awaitingReview = isCurrent && group.status === "PREPARED" && group.latest_review_decision === null;
  const canReview = canReconcile && awaitingReview && actorId !== null && actorId !== group.prepared_by;
  const canUnmatch = canReconcile && isCurrent && (group.latest_review_decision === "APPROVED" || group.latest_review_decision === "IMPACT_REVIEW_REQUIRED");
  return (
    <article className="min-w-0 rounded-lg border border-outline-variant p-3">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="font-semibold text-on-surface"><UiLtrText>{shortId(group.group_id)} · v{group.version}</UiLtrText></h3>
          <p className="mt-1 text-xs text-on-surface-variant">{group.status} · {bank.latestDecision}: {group.latest_review_decision ?? bank.pendingReview}</p>
        </div>
        <span className="rounded-full bg-surface-container-low px-2 py-1 text-xs">{isCurrent ? bank.current : `${bank.version} ${group.current_version}`}</span>
      </header>
      <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
        <div><dt className="text-xs text-on-surface-variant">{common.preparedBy}</dt><dd><UiLtrText>{group.prepared_by}</UiLtrText></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{common.preparedAt}</dt><dd><UiDateTimeText locale={locale} value={group.prepared_at} /></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{common.asOfDate}</dt><dd><UiDateText locale={locale} value={group.as_of_date} /></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{common.recordedAtCutoff}</dt><dd><UiDateTimeText locale={locale} value={group.recorded_at_cutoff} /></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{common.evidenceRef}</dt><dd className="break-words"><UiBidiText>{group.evidence_ref ?? "—"}</UiBidiText></dd></div>
        <div><dt className="text-xs text-on-surface-variant">{common.reason}</dt><dd className="break-words"><UiBidiText>{group.rationale}</UiBidiText></dd></div>
      </dl>
      <div className="mt-3">
        <h4 className="text-xs font-semibold text-on-surface">{bank.allocations}</h4>
        {group.allocations.length === 0 ? <p className="mt-1 text-xs text-on-surface-variant">{bank.noAllocations}</p> : (
          <ul className="mt-2 space-y-2">
            {group.allocations.map((allocation) => <li key={allocation.allocation_number} className="rounded-md bg-surface-container-low p-2 text-xs">
              <p><UiLtrText>#{allocation.allocation_number} · {shortId(allocation.statement_line_id)} v{allocation.statement_line_version} ↔ {shortId(allocation.ledger_journal_id)} v{allocation.ledger_journal_version} #{allocation.ledger_line_number}</UiLtrText></p>
              <p className="mt-1">{amountText(allocation.statement_allocated_halalah, locale)} ↔ {amountText(allocation.ledger_allocated_halalah, locale)}</p>
              <p className="mt-1 break-words text-on-surface-variant"><UiBidiText>{allocation.rationale}</UiBidiText></p>
            </li>)}
          </ul>
        )}
        {group.allocations_truncated && <p className="mt-2 text-xs text-on-surface-variant">{common.truncated}</p>}
      </div>
      <div className="mt-3">
        <h4 className="text-xs font-semibold text-on-surface">{bank.reviewHistory}</h4>
        {group.review_history.length === 0 ? <p className="mt-1 text-xs text-on-surface-variant">{common.noHistory}</p> : <ul className="mt-2 space-y-2">{group.review_history.map((review, index) => <li key={`${review.recorded_at}:${index}`} className="rounded-md bg-surface-container-low p-2 text-xs">
          <p className="font-semibold">{review.decision} · <UiDateTimeText locale={locale} value={review.recorded_at} /></p>
          <p className="mt-1">{common.reviewedBy}: <UiLtrText>{review.reviewer_user_id}</UiLtrText></p>
          <p className="mt-1 break-words"><UiBidiText>{review.reason}</UiBidiText></p>
        </li>)}</ul>}
        {group.review_history_truncated && <p className="mt-2 text-xs text-on-surface-variant">{common.truncated}</p>}
      </div>
      {canReview && <div className="mt-3 grid gap-2 border-t border-outline-variant pt-3">
        <label className="grid gap-1 text-xs font-medium">{bank.reviewReason}<input value={reviewReason} onChange={(event) => setReviewReason(event.target.value)} className="min-h-9 min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm" /></label>
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={isPending} onClick={() => onReview(group, true)} className="min-h-9 rounded-md bg-primary px-3 text-sm font-semibold text-on-primary disabled:opacity-50">{bank.approve}</button>
          <button type="button" disabled={isPending} onClick={() => onReview(group, false)} className="min-h-9 rounded-md border border-outline-variant px-3 text-sm disabled:opacity-50">{bank.reject}</button>
        </div>
      </div>}
      {canUnmatch && <div className="mt-3 grid gap-2 border-t border-outline-variant pt-3">
        <label className="grid gap-1 text-xs font-medium">{bank.unmatchReason}<input value={unmatchReason} onChange={(event) => setUnmatchReason(event.target.value)} className="min-h-9 min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm" /></label>
        <button type="button" disabled={isPending} onClick={() => onUnmatch(group)} className="min-h-9 w-fit rounded-md border border-outline-variant px-3 text-sm disabled:opacity-50">{bank.unmatch}</button>
      </div>}
      {!isCurrent && <p className="mt-3 text-xs text-on-surface-variant">{common.stale}</p>}
    </article>
  );
}
