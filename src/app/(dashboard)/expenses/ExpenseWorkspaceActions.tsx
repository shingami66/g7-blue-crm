"use client";

import { useRef, useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, ShieldCheck, X } from "lucide-react";
import {
  approveExpenseAction,
  rejectExpenseAction,
  reviewExpenseFinanceAction,
} from "@/lib/expenses/actions";
import type { ExpenseAccountabilitySummary, W5ActionResult } from "@/lib/expenses/types";
import {
  getExpenseActionErrorMessage,
  type ExpensesDictionary,
} from "@/lib/i18n/dictionaries/expenses";

type DialogKind = "finance" | "approve" | "reject";
type ActionResult = W5ActionResult<Record<string, string>>;

interface ExpenseWorkspaceActionsProps {
  expense: ExpenseAccountabilitySummary;
  canFinanceReview: boolean;
  canApproveExpense: boolean;
  dictionary: ExpensesDictionary;
}

function safeActionError(result: ActionResult, dictionary: ExpensesDictionary): string {
  return getExpenseActionErrorMessage(dictionary, result.errorCode);
}

function ActionDialog({
  title,
  description,
  submitLabel,
  pendingLabel,
  danger = false,
  pending,
  error,
  onClose,
  onSubmit,
  children,
  cancelLabel,
}: {
  title: string;
  description: string;
  submitLabel: string;
  pendingLabel: string;
  danger?: boolean;
  pending: boolean;
  error: string;
  onClose: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  children?: ReactNode;
  cancelLabel: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="presentation">
      <div
        className="w-full max-w-md rounded-xl border border-outline-variant bg-surface-container-lowest p-5 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-on-surface">{title}</h3>
          <p className="text-sm text-on-surface-variant">{description}</p>
        </div>
        <form onSubmit={onSubmit} className="mt-4 space-y-4">
          {children}
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={pending}
              className="rounded-lg border border-outline-variant px-3 py-2 text-sm font-semibold text-on-surface hover:bg-surface-container-low disabled:opacity-50"
            >
              {cancelLabel}
            </button>
            <button
              type="submit"
              disabled={pending}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-50 ${
                danger
                  ? "bg-error text-on-error hover:bg-error/90"
                  : "bg-primary text-on-primary hover:bg-primary/90"
              }`}
            >
              {pending && <Loader2 className="h-4 w-4 animate-spin" />}
              {pending ? pendingLabel : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function ExpenseWorkspaceActions({
  expense,
  canFinanceReview,
  canApproveExpense,
  dictionary,
}: ExpenseWorkspaceActionsProps) {
  const router = useRouter();
  const [dialog, setDialog] = useState<DialogKind | null>(null);
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const requestIdRef = useRef<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");

  const isReviewed = Boolean(expense.finance_reviewed_at);
  const canReview = canFinanceReview && expense.status === "submitted" && !isReviewed;
  const canApprove = canApproveExpense && expense.status === "submitted" && isReviewed;

  const openDialog = (nextDialog: DialogKind) => {
    setError("");
    setRejectionReason("");
    requestIdRef.current =
      typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : null;
    if (!requestIdRef.current) {
      setError(dictionary.actions.errors.requestUnavailable);
      return;
    }
    setDialog(nextDialog);
  };

  const closeDialog = () => {
    if (pending) return;
    setDialog(null);
    setError("");
    setRejectionReason("");
    requestIdRef.current = null;
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestId = requestIdRef.current;
    if (!requestId || !dialog) {
      setError(dictionary.actions.errors.requestUnavailable);
      return;
    }

    if (dialog === "reject" && !rejectionReason.trim()) {
      setError(dictionary.actions.errors.rejectionReasonRequired);
      return;
    }

    startTransition(async () => {
      let result: ActionResult;
      if (dialog === "finance") {
        result = await reviewExpenseFinanceAction({
          expense_id: expense.id,
          request_id: requestId,
        });
      } else if (dialog === "approve") {
        result = await approveExpenseAction({
          expense_id: expense.id,
          request_id: requestId,
        });
      } else {
        result = await rejectExpenseAction({
          expense_id: expense.id,
          rejection_reason: rejectionReason.trim(),
          request_id: requestId,
        });
      }

      if (result.success) {
        closeDialog();
        router.refresh();
      } else {
        setError(safeActionError(result, dictionary));
      }
    });
  };

  if (!canReview && !canApprove) return null;

  return (
    <>
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canReview && (
          <button
            type="button"
            onClick={() => openDialog("finance")}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant px-3 text-xs font-semibold text-primary hover:bg-surface-container-low"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {dictionary.actions.financeReview}
          </button>
        )}
        {canApprove && (
          <>
            <button
              type="button"
              onClick={() => openDialog("approve")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-on-primary hover:bg-primary/90"
            >
              <Check className="h-3.5 w-3.5" />
              {dictionary.actions.approveExpense}
            </button>
            <button
              type="button"
              onClick={() => openDialog("reject")}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-error/40 px-3 text-xs font-semibold text-error hover:bg-error-container/40"
            >
              <X className="h-3.5 w-3.5" />
              {dictionary.actions.rejectExpense}
            </button>
          </>
        )}
      </div>

      {dialog === "finance" && (
        <ActionDialog
          title={dictionary.actions.financeReview}
          description={dictionary.actions.confirmations.financeReview}
          submitLabel={dictionary.actions.financeReview}
          pendingLabel={dictionary.actions.pending}
          pending={pending}
          error={error}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          cancelLabel={dictionary.actions.cancel}
        />
      )}
      {dialog === "approve" && (
        <ActionDialog
          title={dictionary.actions.approveExpense}
          description={dictionary.actions.confirmations.approveExpense}
          submitLabel={dictionary.actions.approveExpense}
          pendingLabel={dictionary.actions.pending}
          pending={pending}
          error={error}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          cancelLabel={dictionary.actions.cancel}
        />
      )}
      {dialog === "reject" && (
        <ActionDialog
          title={dictionary.actions.rejectExpense}
          description={dictionary.actions.confirmations.rejectExpense}
          submitLabel={dictionary.actions.rejectExpense}
          pendingLabel={dictionary.actions.pending}
          danger
          pending={pending}
          error={error}
          onClose={closeDialog}
          onSubmit={handleSubmit}
          cancelLabel={dictionary.actions.cancel}
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-on-surface">
              {dictionary.actions.fields.rejectionReason}
            </span>
            <textarea
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              rows={3}
              required
              className="w-full resize-y rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2.5 text-sm text-on-surface outline-none focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </label>
        </ActionDialog>
      )}
    </>
  );
}
