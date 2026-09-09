"use client";

import { useRouter } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState, useTransition } from "react";
import {
  Check,
  CircleDollarSign,
  FileCheck2,
  Loader2,
  ReceiptText,
  RotateCcw,
  Send,
  ShieldCheck,
  X,
} from "lucide-react";
import {
  approveCashAdvanceAction,
  approveExpenseAction,
  attachCashAdvanceExpenseReceiptAction,
  issueCashAdvanceAction,
  recordCashAdvanceReturnAction,
  rejectCashAdvanceAction,
  rejectExpenseAction,
  reviewExpenseFinanceAction,
  settleCashAdvanceSpendAction,
  submitCashAdvanceExpenseOnBehalfAction,
  submitOwnCashAdvanceExpenseAction,
} from "@/lib/expenses/actions";
import type {
  CashAdvanceBalanceSummary,
  EnrichedCashAdvance,
  ExpenseStatus,
  LinkedCashAdvanceExpense,
  W5ActionResult,
} from "@/lib/expenses/types";
import type { CashAdvancesDictionary } from "@/lib/i18n/dictionaries/cash-advances";

interface CapabilityFlags {
  canApproveAdvance: boolean;
  canIssueAdvance: boolean;
  canSubmitOwnSpend: boolean;
  canSubmitSpendOnBehalf: boolean;
  canFinanceReviewExpense: boolean;
  canApproveExpense: boolean;
  canSettleSpend: boolean;
  canRecordReturn: boolean;
}

interface ActionProps {
  advance: EnrichedCashAdvance;
  balance: CashAdvanceBalanceSummary | null;
  capabilities: CapabilityFlags;
  isRecipient: boolean;
  dictionary: CashAdvancesDictionary;
}

interface ExpenseActionProps {
  expense: LinkedCashAdvanceExpense;
  advance: EnrichedCashAdvance;
  balance: CashAdvanceBalanceSummary | null;
  capabilities: CapabilityFlags;
  dictionary: CashAdvancesDictionary;
}

type ActionResult = W5ActionResult<Record<string, string>>;

function safeActionError(
  result: ActionResult,
  dictionary: CashAdvancesDictionary,
): string {
  switch (result.errorCode) {
    case "validation_error":
      return dictionary.actions.errors.validation;
    case "cash_advance_unavailable":
      return dictionary.actions.errors.advanceUnavailable;
    case "advance_not_in_issued_status":
      return dictionary.actions.errors.advanceNotIssued;
    case "expense_amount_exceeds_available_advance_balance":
    case "return_amount_exceeds_available_balance":
      return dictionary.actions.errors.staleBalance;
    case "advance_approval_not_allowed_for_requester":
    case "advance_approval_not_allowed_for_recipient":
    case "advance_self_approval_forbidden":
      return dictionary.actions.errors.selfApproval;
    case "missing_file":
      return dictionary.actions.errors.receiptRequired;
    default:
      return dictionary.actions.errors.generic;
  }
}

function formatMoney(value: number | null | undefined, currency: string) {
  return (
    <span dir="ltr">
      {Number(value ?? 0).toFixed(2)} {currency}
    </span>
  );
}

function getExpenseStatusLabel(status: ExpenseStatus, dictionary: CashAdvancesDictionary) {
  return dictionary.linkedExpenses.statuses[status];
}

function ActionDialog({
  title,
  description,
  submitLabel,
  danger = false,
  pending,
  error,
  onClose,
  onSubmit,
  children,
  cancelLabel,
}: {
  title: string;
  description?: string;
  submitLabel: string;
  danger?: boolean;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
  cancelLabel: string;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableSelector =
      'button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [href], [tabindex]:not([tabindex="-1"])';
    const focusFirstControl = window.requestAnimationFrame(() => {
      dialogRef.current?.querySelector<HTMLElement>(focusableSelector)?.focus();
    });
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab") return;
      const controls = dialogRef.current?.querySelectorAll<HTMLElement>(focusableSelector);
      if (!controls?.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFirstControl);
      document.removeEventListener("keydown", handleKeyDown);
      previousFocus?.focus();
    };
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/40 p-3 sm:items-center sm:p-6">
      <div
        ref={dialogRef}
        className="max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-lg sm:max-h-[calc(100dvh-3rem)]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cash-advance-dialog-title"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-5 py-4">
          <div>
            <h2 id="cash-advance-dialog-title" className="text-base font-semibold text-primary">
              {title}
            </h2>
            {description && <p className="mt-1 text-sm text-on-surface-variant">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            aria-label={cancelLabel}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <form onSubmit={onSubmit} className="space-y-5 p-5">
          {children}
          {error && (
            <p className="rounded-lg border border-error bg-error-container/50 px-3 py-2 text-sm text-on-error-container" role="alert">
              {error}
            </p>
          )}
          <div className="flex flex-col-reverse gap-2 border-t border-outline-variant pt-4 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="min-h-10 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm font-medium text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-semibold disabled:opacity-50 ${
                danger
                  ? "bg-error text-on-error hover:bg-error/90"
                  : "bg-primary text-on-primary hover:bg-primary/90"
              }`}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function BalanceCallout({
  balance,
  dictionary,
}: {
  balance: CashAdvanceBalanceSummary | null;
  dictionary: CashAdvancesDictionary;
}) {
  if (!balance) return null;
  return (
    <div className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 sm:grid-cols-3">
      <div>
        <span className="block text-xs text-on-surface-variant">{dictionary.actions.fields.remainingBalance}</span>
        <strong className="mt-1 block font-mono text-sm text-on-surface">
          {formatMoney(balance.remaining_balance, dictionary.accountability.currency)}
        </strong>
      </div>
      <div>
        <span className="block text-xs text-on-surface-variant">{dictionary.actions.fields.reservedSpend}</span>
        <strong className="mt-1 block font-mono text-sm text-on-surface">
          {formatMoney(balance.reserved_unsettled_spend, dictionary.accountability.currency)}
        </strong>
      </div>
      <div>
        <span className="block text-xs text-on-surface-variant">{dictionary.actions.fields.availableBalance}</span>
        <strong className="mt-1 block font-mono text-sm text-primary">
          {formatMoney(balance.available_uncommitted_balance, dictionary.accountability.currency)}
        </strong>
      </div>
    </div>
  );
}

function TextField({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  dir,
  min,
  step,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  dir?: "ltr" | "auto";
  min?: string;
  step?: string;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-on-surface">{label}{required ? " *" : ""}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        required={required}
        min={min}
        step={step}
        dir={dir}
        placeholder={placeholder}
        className="w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
      />
    </label>
  );
}

export function CashAdvanceOperationalActions({
  advance,
  balance,
  capabilities,
  isRecipient,
  dictionary,
}: ActionProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"approve" | "reject" | "issue" | "spend" | "return" | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const requestIdRef = useRef<string | null>(null);
  const receiptRequestIdRef = useRef<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [expenseDescription, setExpenseDescription] = useState("");
  const [expenseAmount, setExpenseAmount] = useState("");
  const [expenseDate, setExpenseDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [returnAmount, setReturnAmount] = useState("");
  const [returnReceiptReference, setReturnReceiptReference] = useState("");
  const [returnNotes, setReturnNotes] = useState("");

  const resetDialog = () => {
    if (pending) return;
    setDialog(null);
    setError("");
    requestIdRef.current = null;
    receiptRequestIdRef.current = null;
    setRejectionReason("");
    setPaymentReference("");
    setExpenseCategory("");
    setExpenseDescription("");
    setExpenseAmount("");
    setReceiptFile(null);
    setReturnAmount("");
    setReturnReceiptReference("");
    setReturnNotes("");
  };

  const openDialog = (nextDialog: NonNullable<typeof dialog>) => {
    requestIdRef.current = crypto.randomUUID();
    receiptRequestIdRef.current = crypto.randomUUID();
    setError("");
    setDialog(nextDialog);
    if (nextDialog === "return") {
      setReturnAmount(String(Math.max(Number(balance?.available_uncommitted_balance ?? 0), 0)));
    }
  };

  const finish = () => {
    resetDialog();
    router.refresh();
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestId = requestIdRef.current;
    if (!requestId) {
      setError(dictionary.actions.errors.generic);
      return;
    }

    startTransition(async () => {
      let result: ActionResult;
      if (dialog === "approve") {
        result = await approveCashAdvanceAction({ advance_id: advance.id, request_id: requestId });
      } else if (dialog === "reject") {
        if (!rejectionReason.trim()) {
          setError(dictionary.actions.errors.rejectionReasonRequired);
          return;
        }
        result = await rejectCashAdvanceAction({
          advance_id: advance.id,
          rejection_reason: rejectionReason,
          request_id: requestId,
        });
      } else if (dialog === "issue") {
        result = await issueCashAdvanceAction({
          advance_id: advance.id,
          payment_reference: paymentReference.trim() || undefined,
          request_id: requestId,
        });
      } else if (dialog === "spend") {
        const amount = Number(expenseAmount);
        if (!expenseCategory.trim() || !expenseDescription.trim() || !expenseDate || !Number.isFinite(amount) || amount <= 0) {
          setError(dictionary.actions.errors.validation);
          return;
        }
        result = isRecipient && capabilities.canSubmitOwnSpend
          ? await submitOwnCashAdvanceExpenseAction({
              advance_id: advance.id,
              expense_category: expenseCategory,
              description: expenseDescription,
              amount,
              expense_date: expenseDate,
              request_id: requestId,
            })
          : await submitCashAdvanceExpenseOnBehalfAction({
              advance_id: advance.id,
              expense_category: expenseCategory,
              description: expenseDescription,
              amount,
              expense_date: expenseDate,
              request_id: requestId,
            });
        if (result.success && receiptFile && result.data?.expense_id) {
          const receiptRequestId = receiptRequestIdRef.current;
          if (!receiptRequestId) {
            setError(dictionary.actions.errors.receiptFailed);
            return;
          }
          const receiptData = new FormData();
          receiptData.set("expense_id", result.data.expense_id);
          receiptData.set("receipt", receiptFile);
          receiptData.set("request_id", receiptRequestId);
          const receiptResult = await attachCashAdvanceExpenseReceiptAction(receiptData);
          if (!receiptResult.success) {
            setError(dictionary.actions.errors.receiptFailed);
            return;
          }
        }
      } else if (dialog === "return") {
        const amount = Number(returnAmount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > Number(balance?.available_uncommitted_balance ?? 0)) {
          setError(dictionary.actions.errors.returnAmountInvalid);
          return;
        }
        result = await recordCashAdvanceReturnAction({
          advance_id: advance.id,
          amount,
          receipt_reference: returnReceiptReference.trim() || undefined,
          notes: returnNotes.trim() || undefined,
          request_id: requestId,
        });
      } else {
        return;
      }

      if (result.success) {
        finish();
      } else {
        setError(safeActionError(result, dictionary));
      }
    });
  };

  const showApproveReject = advance.status === "submitted" && capabilities.canApproveAdvance;
  const showIssue = advance.status === "approved" && capabilities.canIssueAdvance;
  const showSpend = advance.status === "issued" && (capabilities.canSubmitSpendOnBehalf || (isRecipient && capabilities.canSubmitOwnSpend));
  const showReturn = advance.status === "issued" && capabilities.canRecordReturn;

  if (!showApproveReject && !showIssue && !showSpend && !showReturn) return null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 sm:justify-end" aria-label={dictionary.actions.sectionLabel}>
        {showApproveReject && (
          <>
            <button type="button" onClick={() => openDialog("approve")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90">
              <Check className="h-4 w-4" /> {dictionary.actions.approve}
            </button>
            <button type="button" onClick={() => openDialog("reject")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-error/40 px-4 text-sm font-semibold text-error hover:bg-error-container/40">
              <X className="h-4 w-4" /> {dictionary.actions.reject}
            </button>
          </>
        )}
        {showIssue && (
          <button type="button" onClick={() => openDialog("issue")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90">
            <Send className="h-4 w-4" /> {dictionary.actions.issue}
          </button>
        )}
        {showSpend && (
          <button type="button" onClick={() => openDialog("spend")} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-on-primary hover:bg-primary/90">
            <ReceiptText className="h-4 w-4" />
            {isRecipient && capabilities.canSubmitOwnSpend ? dictionary.actions.recordSpend : dictionary.actions.recordSpendOnBehalf}
          </button>
        )}
        {showReturn && (
          <button type="button" onClick={() => openDialog("return")} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-outline-variant bg-surface-container-lowest px-4 text-sm font-semibold text-primary hover:bg-surface-container-low">
            <RotateCcw className="h-4 w-4" /> {dictionary.actions.recordConfirmedCashReturn}
          </button>
        )}
      </div>

      {dialog === "approve" && (
        <ActionDialog title={dictionary.actions.approve} description={dictionary.actions.confirmations.approve} submitLabel={dictionary.actions.approve} pending={pending} error={error} onClose={resetDialog} onSubmit={handleSubmit} cancelLabel={dictionary.requestModal.cancel}>
          <p className="text-sm text-on-surface">{advance.advance_number}</p>
        </ActionDialog>
      )}
      {dialog === "reject" && (
        <ActionDialog title={dictionary.actions.reject} description={dictionary.actions.confirmations.reject} submitLabel={dictionary.actions.reject} danger pending={pending} error={error} onClose={resetDialog} onSubmit={handleSubmit} cancelLabel={dictionary.requestModal.cancel}>
          <TextField label={dictionary.actions.fields.rejectionReason} value={rejectionReason} onChange={setRejectionReason} required />
        </ActionDialog>
      )}
      {dialog === "issue" && (
        <ActionDialog title={dictionary.actions.issue} description={dictionary.actions.confirmations.issue} submitLabel={dictionary.actions.issue} pending={pending} error={error} onClose={resetDialog} onSubmit={handleSubmit} cancelLabel={dictionary.requestModal.cancel}>
          <TextField label={dictionary.actions.fields.paymentReference} value={paymentReference} onChange={setPaymentReference} dir="ltr" />
        </ActionDialog>
      )}
      {dialog === "spend" && (
        <ActionDialog
          title={isRecipient && capabilities.canSubmitOwnSpend ? dictionary.actions.recordSpend : dictionary.actions.recordSpendOnBehalf}
          description={isRecipient && capabilities.canSubmitOwnSpend ? dictionary.actions.confirmations.recordSpend : dictionary.actions.confirmations.recordSpendOnBehalf}
          submitLabel={dictionary.actions.submitExpense}
          pending={pending}
           error={error}
           onClose={resetDialog}
           onSubmit={handleSubmit}
           cancelLabel={dictionary.requestModal.cancel}
        >
          <BalanceCallout balance={balance} dictionary={dictionary} />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <TextField label={dictionary.actions.fields.expenseCategory} value={expenseCategory} onChange={setExpenseCategory} required />
            <TextField label={dictionary.actions.fields.amount} value={expenseAmount} onChange={setExpenseAmount} type="number" min="0.01" step="0.01" dir="ltr" required />
          </div>
          <TextField label={dictionary.actions.fields.expenseDate} value={expenseDate} onChange={setExpenseDate} type="date" dir="ltr" required />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-on-surface">{dictionary.actions.fields.description} *</span>
            <textarea value={expenseDescription} onChange={(event) => setExpenseDescription(event.target.value)} rows={3} required className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-on-surface">{dictionary.actions.fields.receiptOptional}</span>
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png" onChange={(event) => setReceiptFile(event.target.files?.[0] ?? null)} className="block w-full rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-sm text-on-surface" />
            <span className="block text-xs text-on-surface-variant">{dictionary.actions.states.privateReceipt}</span>
          </label>
          {!isRecipient || !capabilities.canSubmitOwnSpend ? (
            <p className="rounded-lg border border-outline-variant bg-surface-container-low px-3 py-2 text-sm text-on-surface-variant">
              <strong className="text-on-surface">{dictionary.actions.states.recordedByFinance}</strong>{" "}
              {dictionary.actions.states.accountableCustodian}: {advance.recipientName || "—"}
            </p>
          ) : null}
        </ActionDialog>
      )}
      {dialog === "return" && (
        <ActionDialog title={dictionary.actions.recordConfirmedCashReturn} description={dictionary.actions.confirmations.recordReturn} submitLabel={dictionary.actions.recordConfirmedCashReturn} pending={pending} error={error} onClose={resetDialog} onSubmit={handleSubmit} cancelLabel={dictionary.requestModal.cancel}>
          <BalanceCallout balance={balance} dictionary={dictionary} />
          <TextField label={dictionary.actions.fields.amount} value={returnAmount} onChange={setReturnAmount} type="number" min="0.01" step="0.01" dir="ltr" required />
          <TextField label={dictionary.actions.fields.receiptReference} value={returnReceiptReference} onChange={setReturnReceiptReference} dir="ltr" />
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-on-surface">{dictionary.actions.fields.notes}</span>
            <textarea value={returnNotes} onChange={(event) => setReturnNotes(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" />
          </label>
        </ActionDialog>
      )}
    </>
  );
}

export function CashAdvanceExpensesSection({
  expenses,
  advance,
  balance,
  capabilities,
  dictionary,
}: {
  expenses: LinkedCashAdvanceExpense[];
  advance: EnrichedCashAdvance;
  balance: CashAdvanceBalanceSummary | null;
  capabilities: CapabilityFlags;
  dictionary: CashAdvancesDictionary;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="flex items-center gap-2 border-b border-surface-variant bg-surface-bright px-6 py-4">
        <CircleDollarSign className="h-4 w-4 text-primary" />
        <h2 className="font-semibold text-primary">{dictionary.linkedExpenses.title}</h2>
      </div>
      <div className="p-6">
        {expenses.length === 0 ? (
          <p className="text-sm italic text-on-surface-variant">{dictionary.linkedExpenses.empty}</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-start text-sm">
                <thead className="border-b border-outline-variant bg-surface-container-low text-xs font-semibold text-on-surface-variant">
                  <tr>
                    <th className="px-4 py-3 text-start">{dictionary.linkedExpenses.fields.expenseNumber}</th>
                    <th className="px-4 py-3 text-start">{dictionary.linkedExpenses.fields.status}</th>
                    <th className="px-4 py-3 text-start">{dictionary.linkedExpenses.fields.category}</th>
                    <th className="px-4 py-3 text-start">{dictionary.linkedExpenses.fields.description}</th>
                    <th className="px-4 py-3 text-start">{dictionary.linkedExpenses.fields.expenseDate}</th>
                    <th className="px-4 py-3 text-end">{dictionary.linkedExpenses.fields.amount}</th>
                    <th className="px-4 py-3 text-end">{dictionary.linkedExpenses.fields.settledAmount}</th>
                    <th className="px-4 py-3 text-end">{dictionary.linkedExpenses.fields.unsettledAmount}</th>
                    <th className="px-4 py-3 text-end">{dictionary.linkedExpenses.fields.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {expenses.map((expense) => (
                    <tr key={expense.expense_id} className="align-top hover:bg-surface-container-low/50">
                      <td className="px-4 py-3 font-mono font-semibold text-on-surface"><span dir="ltr">{expense.expense_number}</span></td>
              <td className="px-4 py-3 text-on-surface">{getExpenseStatusLabel(expense.status, dictionary)}</td>
                      <td className="px-4 py-3 text-on-surface-variant">{expense.expense_category}</td>
                      <td className="max-w-xs px-4 py-3 text-on-surface-variant">{expense.description}</td>
                      <td className="px-4 py-3 text-on-surface-variant"><span dir="ltr">{expense.expense_date}</span></td>
                      <td className="px-4 py-3 text-end font-mono text-on-surface">{formatMoney(expense.amount, dictionary.accountability.currency)}</td>
                      <td className="px-4 py-3 text-end font-mono text-on-surface">{formatMoney(expense.settled_amount, dictionary.accountability.currency)}</td>
                      <td className="px-4 py-3 text-end font-mono text-on-surface">{formatMoney(expense.unsettled_amount, dictionary.accountability.currency)}</td>
                      <td className="px-4 py-3 text-end"><ExpenseLifecycleActions expense={expense} advance={advance} balance={balance} capabilities={capabilities} dictionary={dictionary} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-3 md:hidden">
              {expenses.map((expense) => (
                <article key={expense.expense_id} className="rounded-lg border border-outline-variant bg-surface-container-low p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-mono font-semibold text-on-surface"><span dir="ltr">{expense.expense_number}</span></p>
                      <p className="mt-1 text-sm text-on-surface-variant">{expense.expense_category}</p>
                    </div>
                <span className="rounded-full border border-outline-variant px-2 py-1 text-xs font-semibold text-on-surface">{getExpenseStatusLabel(expense.status, dictionary)}</span>
                  </div>
                  <p className="mt-3 break-words text-sm text-on-surface">{expense.description}</p>
                  <dl className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div><dt className="text-xs text-on-surface-variant">{dictionary.linkedExpenses.fields.expenseDate}</dt><dd className="mt-1 text-on-surface"><span dir="ltr">{expense.expense_date}</span></dd></div>
                    <div><dt className="text-xs text-on-surface-variant">{dictionary.linkedExpenses.fields.amount}</dt><dd className="mt-1 font-mono text-on-surface">{formatMoney(expense.amount, dictionary.accountability.currency)}</dd></div>
                    <div><dt className="text-xs text-on-surface-variant">{dictionary.linkedExpenses.fields.settledAmount}</dt><dd className="mt-1 font-mono text-on-surface">{formatMoney(expense.settled_amount, dictionary.accountability.currency)}</dd></div>
                    <div><dt className="text-xs text-on-surface-variant">{dictionary.linkedExpenses.fields.unsettledAmount}</dt><dd className="mt-1 font-mono text-on-surface">{formatMoney(expense.unsettled_amount, dictionary.accountability.currency)}</dd></div>
                  </dl>
                  <div className="mt-4"><ExpenseLifecycleActions expense={expense} advance={advance} balance={balance} capabilities={capabilities} dictionary={dictionary} /></div>
                </article>
              ))}
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function ExpenseLifecycleActions({ expense, advance, balance, capabilities, dictionary }: ExpenseActionProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<"finance" | "approve" | "reject" | "settle" | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const requestIdRef = useRef<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [settlementAmount, setSettlementAmount] = useState(String(Math.max(Number(expense.unsettled_amount), 0)));
  const [settlementNotes, setSettlementNotes] = useState("");
  const isReviewed = Boolean(expense.finance_reviewed_at);

  const openDialog = (nextDialog: NonNullable<typeof dialog>) => {
    requestIdRef.current = crypto.randomUUID();
    setError("");
    setDialog(nextDialog);
    if (nextDialog === "settle") setSettlementAmount(String(Math.max(Number(expense.unsettled_amount), 0)));
  };
  const closeDialog = () => {
    if (pending) return;
    setDialog(null);
    setError("");
    requestIdRef.current = null;
    setRejectionReason("");
    setSettlementNotes("");
  };
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestId = requestIdRef.current;
    if (!requestId) {
      setError(dictionary.actions.errors.generic);
      return;
    }
    startTransition(async () => {
      let result: ActionResult;
      if (dialog === "finance") {
        result = await reviewExpenseFinanceAction({ expense_id: expense.expense_id, request_id: requestId });
      } else if (dialog === "approve") {
        result = await approveExpenseAction({ expense_id: expense.expense_id, request_id: requestId });
      } else if (dialog === "reject") {
        if (!rejectionReason.trim()) {
          setError(dictionary.actions.errors.rejectionReasonRequired);
          return;
        }
        result = await rejectExpenseAction({ expense_id: expense.expense_id, rejection_reason: rejectionReason, request_id: requestId });
      } else if (dialog === "settle") {
        const amount = Number(settlementAmount);
        if (!Number.isFinite(amount) || amount <= 0 || amount > Number(expense.unsettled_amount)) {
          setError(dictionary.actions.errors.settlementAmountInvalid);
          return;
        }
        result = await settleCashAdvanceSpendAction({ advance_id: advance.id, expense_id: expense.expense_id, amount, notes: settlementNotes.trim() || undefined, request_id: requestId });
      } else {
        return;
      }
      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(safeActionError(result, dictionary));
      }
    });
  };

  const canReview = expense.status === "submitted" && capabilities.canFinanceReviewExpense;
  const canApprove = expense.status === "submitted" && capabilities.canApproveExpense && isReviewed;
  const canAwaitReview = expense.status === "submitted" && capabilities.canApproveExpense && !isReviewed;
  const canSettle = expense.status === "approved" && capabilities.canSettleSpend && Number(expense.unsettled_amount) > 0;

  if (!canReview && !canApprove && !canAwaitReview && !canSettle) return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canReview && <button type="button" onClick={() => openDialog("finance")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-primary hover:bg-surface-container-low"><ShieldCheck className="h-3.5 w-3.5" />{dictionary.actions.financeReview}</button>}
        {canAwaitReview && <span className="inline-flex min-h-9 items-center rounded-lg bg-surface-container-low px-3 text-xs font-medium text-on-surface-variant">{dictionary.actions.states.awaitingFinanceReview}</span>}
        {canApprove && <button type="button" onClick={() => openDialog("approve")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary/90"><Check className="h-3.5 w-3.5" />{dictionary.actions.approveExpense}</button>}
        {canApprove && <button type="button" onClick={() => openDialog("reject")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-error/40 px-3 text-xs font-semibold text-error hover:bg-error-container/40"><X className="h-3.5 w-3.5" />{dictionary.actions.rejectExpense}</button>}
        {canSettle && <button type="button" onClick={() => openDialog("settle")} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-primary hover:bg-surface-container-low"><FileCheck2 className="h-3.5 w-3.5" />{dictionary.actions.settleSpend}</button>}
      </div>
      {dialog === "finance" && <ActionDialog title={dictionary.actions.financeReview} description={dictionary.actions.confirmations.financeReview} submitLabel={dictionary.actions.financeReview} pending={pending} error={error} onClose={closeDialog} onSubmit={handleSubmit} cancelLabel={dictionary.requestModal.cancel}><p className="font-mono text-sm text-on-surface"><span dir="ltr">{expense.expense_number}</span></p></ActionDialog>}
      {dialog === "approve" && <ActionDialog title={dictionary.actions.approveExpense} description={dictionary.actions.confirmations.approveExpense} submitLabel={dictionary.actions.approveExpense} pending={pending} error={error} onClose={closeDialog} onSubmit={handleSubmit} cancelLabel={dictionary.requestModal.cancel}><p className="font-mono text-sm text-on-surface"><span dir="ltr">{expense.expense_number}</span></p></ActionDialog>}
      {dialog === "reject" && <ActionDialog title={dictionary.actions.rejectExpense} description={dictionary.actions.confirmations.rejectExpense} submitLabel={dictionary.actions.rejectExpense} danger pending={pending} error={error} onClose={closeDialog} onSubmit={handleSubmit} cancelLabel={dictionary.requestModal.cancel}><TextField label={dictionary.actions.fields.rejectionReason} value={rejectionReason} onChange={setRejectionReason} required /></ActionDialog>}
      {dialog === "settle" && <ActionDialog title={dictionary.actions.settleSpend} description={dictionary.actions.confirmations.settleSpend} submitLabel={dictionary.actions.settleSpend} pending={pending} error={error} onClose={closeDialog} onSubmit={handleSubmit} cancelLabel={dictionary.requestModal.cancel}>
        <div className="grid grid-cols-1 gap-3 rounded-lg border border-outline-variant bg-surface-container-low p-4 text-sm sm:grid-cols-2">
          <div><span className="block text-xs text-on-surface-variant">{dictionary.actions.fields.expenseNumber}</span><strong className="mt-1 block font-mono text-on-surface"><span dir="ltr">{expense.expense_number}</span></strong></div>
          <div><span className="block text-xs text-on-surface-variant">{dictionary.actions.fields.totalAmount}</span><strong className="mt-1 block font-mono text-on-surface">{formatMoney(expense.amount, dictionary.accountability.currency)}</strong></div>
          <div><span className="block text-xs text-on-surface-variant">{dictionary.actions.fields.settledAmount}</span><strong className="mt-1 block font-mono text-on-surface">{formatMoney(expense.settled_amount, dictionary.accountability.currency)}</strong></div>
          <div><span className="block text-xs text-on-surface-variant">{dictionary.actions.fields.unsettledAmount}</span><strong className="mt-1 block font-mono text-on-surface">{formatMoney(expense.unsettled_amount, dictionary.accountability.currency)}</strong></div>
        </div>
        <BalanceCallout balance={balance} dictionary={dictionary} />
        <TextField label={dictionary.actions.fields.settlementAmount} value={settlementAmount} onChange={setSettlementAmount} type="number" min="0.01" step="0.01" dir="ltr" required />
        <label className="block space-y-1.5"><span className="text-sm font-medium text-on-surface">{dictionary.actions.fields.notes}</span><textarea value={settlementNotes} onChange={(event) => setSettlementNotes(event.target.value)} rows={3} className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20" /></label>
      </ActionDialog>}
    </>
  );
}
