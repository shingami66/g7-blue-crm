"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getExpensesDictionary,
  getExpenseStatusLabel,
  getExpenseOriginTypeLabel,
  getExpensePaymentMethodLabel,
  getExpenseContextTypeLabel,
  getExpenseReimbursementStatusLabel,
  type ExpensesDictionary,
} from "@/lib/i18n/dictionaries/expenses";
import type {
  ExpenseAccountabilitySummary,
  ExpenseServiceOption,
} from "@/lib/expenses/types";
import {
  getPrivateExpenseReceiptUrlAction,
  attachExpenseReceiptAction,
} from "@/lib/expenses/actions";
import { ExpenseSubmissionModal } from "./ExpenseSubmissionModal";
import {
  Receipt,
  AlertCircle,
  FileCheck,
  HelpCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Upload,
  Loader2,
  CheckCircle2,
  Clock,
  ShieldCheck,
} from "lucide-react";

interface ExpensesClientProps {
  canRead: boolean;
  canSubmitOwn?: boolean;
  myExpenses?: ExpenseAccountabilitySummary[];
  expenses?: ExpenseAccountabilitySummary[];
  eligibleServices?: ExpenseServiceOption[];
  loadError: string | null;
  dictionary?: ExpensesDictionary;
}

export default function ExpensesClient({
  canRead,
  canSubmitOwn = false,
  myExpenses: myExpensesProp,
  expenses: legacyExpensesProp,
  eligibleServices = [],
  loadError,
  dictionary: dictionaryProp,
}: ExpensesClientProps) {
  const locale = useLocale();
  const router = useRouter();
  const dictionary = dictionaryProp ?? getExpensesDictionary(locale);

  const expensesList = myExpensesProp ?? legacyExpensesProp ?? [];

  // Modal state
  const [isSubmissionModalOpen, setIsSubmissionModalOpen] = useState(false);

  // Expanded row state (for details)
  const [expandedExpenseId, setExpandedExpenseId] = useState<string | null>(null);

  // Success / Notice banner state
  const [notice, setNotice] = useState<{
    type: "full_success" | "partial_success" | "receipt_attached" | "error";
    message: string;
    expenseNumber?: string;
  } | null>(null);

  // Receipt URL loading state
  const [loadingReceiptId, setLoadingReceiptId] = useState<string | null>(null);
  const [receiptUrlError, setReceiptUrlError] = useState<string | null>(null);

  // Receipt retry attachment state
  const [attachingReceiptExpenseId, setAttachingReceiptExpenseId] = useState<string | null>(null);
  const [isAttachingReceipt, startAttachingTransition] = useTransition();
  const [retryError, setRetryError] = useState<string | null>(null);
  const retryFileInputRef = useRef<HTMLInputElement>(null);

  if (!canRead) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-red-900">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-red-600" />
            {dictionary.states.accessRestricted}
          </h2>
          <p className="mt-1 text-sm text-red-700">
            {dictionary.states.accessRestrictedMessage}
          </p>
        </div>
      </div>
    );
  }

  const toggleRowExpansion = (id: string) => {
    setExpandedExpenseId((prev) => (prev === id ? null : id));
    setReceiptUrlError(null);
    setRetryError(null);
  };

  const handleViewReceipt = async (expenseId: string) => {
    setLoadingReceiptId(expenseId);
    setReceiptUrlError(null);
    try {
      const res = await getPrivateExpenseReceiptUrlAction(expenseId);
      if (!res.success || !res.data?.signedUrl) {
        setReceiptUrlError(res.error ?? "Could not generate receipt URL");
      } else {
        window.open(res.data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch (err: unknown) {
      setReceiptUrlError(err instanceof Error ? err.message : "Error opening receipt");
    } finally {
      setLoadingReceiptId(null);
    }
  };

  const handleRetryFileSelected = (
    expenseId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];

    if (file.size > 25 * 1024 * 1024) {
      setRetryError(
        locale === "ar"
          ? "حجم الملف يتجاوز 25 ميجابايت"
          : "File size exceeds 25 MB limit"
      );
      return;
    }

    const formData = new FormData();
    formData.append("expense_id", expenseId);
    formData.append("receipt", file);

    setRetryError(null);
    setAttachingReceiptExpenseId(expenseId);

    startAttachingTransition(async () => {
      try {
        const res = await attachExpenseReceiptAction(formData);
        if (res.error) {
          setRetryError(res.error);
        } else {
          setNotice({
            type: "receipt_attached",
            message: dictionary.notices.receiptAttachedSuccess,
          });
          router.refresh();
        }
      } catch (err: unknown) {
        setRetryError(err instanceof Error ? err.message : "Failed to attach receipt");
      } finally {
        setAttachingReceiptExpenseId(null);
        if (retryFileInputRef.current) {
          retryFileInputRef.current.value = "";
        }
      }
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">
            <span>{dictionary.header.sectionBadge}</span>
            <span>•</span>
            <span className="text-primary font-medium">{dictionary.header.stageBadge}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            {dictionary.header.title}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {dictionary.header.subtitle}
          </p>
        </div>

        {/* Primary Action: New Expense */}
        {canSubmitOwn && (
          <button
            type="button"
            onClick={() => {
              setNotice(null);
              setIsSubmissionModalOpen(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>{dictionary.header.newExpense}</span>
          </button>
        )}
      </div>

      {/* Notices / Alert banners */}
      {notice && (
        <div
          className={`rounded-xl border p-4 text-sm flex items-start justify-between gap-3 ${
            notice.type === "full_success" || notice.type === "receipt_attached"
              ? "border-emerald-200 bg-emerald-50 text-emerald-900"
              : notice.type === "partial_success"
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-red-200 bg-red-50 text-red-900"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notice.type === "full_success" || notice.type === "receipt_attached" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : notice.type === "partial_success" ? (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-semibold">
                {notice.type === "full_success" && dictionary.notices.fullSuccess}
                {notice.type === "partial_success" && dictionary.notices.partialSuccess}
                {notice.type === "receipt_attached" && dictionary.notices.receiptAttachedSuccess}
                {notice.type === "error" && notice.message}
              </p>
              {notice.type === "partial_success" && notice.message && notice.message !== dictionary.notices.partialSuccess && (
                <p className="text-xs mt-1 text-amber-800">
                  {notice.message}
                </p>
              )}
              {notice.expenseNumber && (
                <p className="text-xs mt-1 font-mono">
                  {dictionary.table.columns.expenseNumber}:{" "}
                  <span dir="ltr" className="font-bold">
                    {notice.expenseNumber}
                  </span>
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="text-xs font-semibold underline opacity-70 hover:opacity-100"
          >
            {dictionary.detail.close}
          </button>
        </div>
      )}

      {/* Load error alert if any */}
      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {dictionary.states.noticePrefix} {loadError}
          </span>
        </div>
      )}

      {/* Section Title: My Expenses */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            {dictionary.myExpenses.title}
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            {dictionary.myExpenses.subtitle}
          </p>
        </div>
        <span className="text-xs text-muted-foreground bg-muted/60 px-2.5 py-1 rounded-full font-medium">
          <span dir="ltr">{expensesList.length}</span> {dictionary.table.recordsLoaded}
        </span>
      </div>

      {/* Expenses Table / Cards */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {expensesList.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground space-y-3">
            <Receipt className="w-10 h-10 mx-auto opacity-30" />
            <p className="font-medium text-foreground">{dictionary.table.empty.title}</p>
            <p className="text-xs max-w-sm mx-auto">
              {dictionary.table.empty.description}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-sm">
              <thead className="bg-muted/50 text-xs font-semibold text-muted-foreground border-b border-border uppercase">
                <tr>
                  <th className="px-4 py-3 text-start">{dictionary.table.columns.expenseNumber}</th>
                  <th className="px-4 py-3 text-start">{dictionary.table.columns.date}</th>
                  <th className="px-4 py-3 text-start">{dictionary.table.columns.context}</th>
                  <th className="px-4 py-3 text-start">{dictionary.table.columns.evidence}</th>
                  <th className="px-4 py-3 text-end">{dictionary.table.columns.amount}</th>
                  <th className="px-4 py-3 text-center">{dictionary.table.columns.status}</th>
                  <th className="px-4 py-3 text-center">{dictionary.table.columns.financeReview}</th>
                  <th className="px-4 py-3 text-center">{dictionary.table.columns.reimbursement}</th>
                  <th className="px-4 py-3 text-center">{dictionary.table.columns.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expensesList.map((exp) => {
                  const isExpanded = expandedExpenseId === exp.id;
                  const isReviewed = Boolean(exp.finance_reviewed_at);

                  return (
                    <tr key={exp.id} className="group hover:bg-muted/20 transition-colors">
                      <td colSpan={9} className="p-0">
                        {/* Summary Row */}
                        <div className="flex items-center px-4 py-3 text-xs w-full divide-x-0">
                          {/* Expense Number */}
                          <div className="w-[14%] font-mono font-bold text-start text-foreground">
                            <span dir="ltr">{exp.expense_number}</span>
                          </div>

                          {/* Date */}
                          <div className="w-[11%] text-muted-foreground whitespace-nowrap text-start">
                            <span dir="ltr">{exp.expense_date}</span>
                          </div>

                          {/* Context */}
                          <div className="w-[14%] text-start">
                            {exp.context_type === "event" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                                {getExpenseContextTypeLabel(locale, exp.context_type)}
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                {getExpenseContextTypeLabel(locale, exp.context_type)}
                              </span>
                            )}
                          </div>

                          {/* Evidence Status */}
                          <div className="w-[15%] text-start">
                            {exp.evidence_status === "receipt_attached" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <FileCheck className="w-3 h-3 shrink-0" />
                                {dictionary.evidenceStatuses.receiptAttached}
                              </span>
                            )}
                            {exp.evidence_status.startsWith("exception_") && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                <AlertCircle className="w-3 h-3 shrink-0" />
                                {dictionary.evidenceStatuses.exception}
                              </span>
                            )}
                            {exp.evidence_status === "no_evidence" && (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-600 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                                <HelpCircle className="w-3 h-3 shrink-0" />
                                {dictionary.evidenceStatuses.noEvidence}
                              </span>
                            )}
                          </div>

                          {/* Amount */}
                          <div className="w-[12%] text-end font-mono font-bold">
                            <span dir="ltr">
                              {Number(exp.amount).toFixed(2)} {exp.currency}
                            </span>
                          </div>

                          {/* Status */}
                          <div className="w-[11%] text-center">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${
                                exp.status === "approved"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : exp.status === "rejected"
                                    ? "bg-rose-100 text-rose-800"
                                    : exp.status === "cancelled"
                                      ? "bg-zinc-100 text-zinc-700"
                                      : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {getExpenseStatusLabel(locale, exp.status)}
                            </span>
                          </div>

                          {/* Finance Review State */}
                          <div className="w-[11%] text-center">
                            {isReviewed ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                                <ShieldCheck className="w-3 h-3" />
                                {dictionary.financeReviewStates.reviewed}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-zinc-500 bg-zinc-50 px-2 py-0.5 rounded border border-zinc-200">
                                <Clock className="w-3 h-3" />
                                {dictionary.financeReviewStates.pending}
                              </span>
                            )}
                          </div>

                          {/* Reimbursement State */}
                          <div className="w-[8%] text-center">
                            {exp.origin_type === "employee_paid" ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                  exp.reimbursement_status === "fully_settled"
                                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                    : exp.reimbursement_status === "partially_settled"
                                      ? "bg-blue-50 text-blue-700 border border-blue-200"
                                      : "bg-amber-50 text-amber-700 border border-amber-200"
                                }`}
                              >
                                {getExpenseReimbursementStatusLabel(locale, exp.reimbursement_status)}
                              </span>
                            ) : (
                              <span className="text-[11px] text-muted-foreground italic">
                                {dictionary.reimbursementStatuses.not_applicable}
                              </span>
                            )}
                          </div>

                          {/* Actions / Expansion trigger */}
                          <div className="w-[4%] text-center">
                            <button
                              type="button"
                              onClick={() => toggleRowExpansion(exp.id)}
                              className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                              aria-label={dictionary.table.columns.actions}
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-4 h-4" />
                              ) : (
                                <ChevronDown className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expandable Detail Panel */}
                        {isExpanded && (
                          <div className="border-t border-border bg-muted/10 p-5 space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                              {/* Column 1: Core Details */}
                              <div className="space-y-2 rounded-lg border border-border bg-card p-3 shadow-2xs">
                                <h4 className="font-semibold text-foreground border-b border-border pb-1">
                                  {dictionary.detail.title}
                                </h4>
                                <div>
                                  <span className="text-muted-foreground">{dictionary.detail.description}:</span>
                                  <p className="font-medium text-foreground mt-0.5">{exp.description}</p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1">
                                  <div>
                                    <span className="text-muted-foreground">{dictionary.detail.category}:</span>
                                    <p className="font-medium text-foreground">
                                      {dictionary.categories[exp.expense_category] ?? exp.expense_category}
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{dictionary.table.columns.originAndMethod}:</span>
                                    <p className="font-medium text-foreground">
                                      {getExpenseOriginTypeLabel(locale, exp.origin_type)} (
                                      {getExpensePaymentMethodLabel(locale, exp.payment_method)})
                                    </p>
                                  </div>
                                </div>
                              </div>

                              {/* Column 2: Evidence & Receipt Access */}
                              <div className="space-y-2 rounded-lg border border-border bg-card p-3 shadow-2xs">
                                <h4 className="font-semibold text-foreground border-b border-border pb-1">
                                  {dictionary.detail.receiptDocument}
                                </h4>
                                <div>
                                  <span className="text-muted-foreground">{dictionary.detail.evidenceStatus}:</span>
                                  <p className="font-medium text-foreground mt-0.5">
                                    {exp.evidence_status === "receipt_attached"
                                      ? dictionary.evidenceStatuses.receiptAttached
                                      : exp.evidence_status === "no_evidence"
                                        ? dictionary.evidenceStatuses.noEvidence
                                        : dictionary.evidenceStatuses.exception}
                                  </p>
                                </div>

                                {/* View Receipt button if attached */}
                                {exp.evidence_status === "receipt_attached" && (
                                  <div className="pt-2">
                                    <button
                                      type="button"
                                      onClick={() => handleViewReceipt(exp.id)}
                                      disabled={loadingReceiptId === exp.id}
                                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border bg-background text-primary hover:bg-primary/5 font-medium transition-all"
                                    >
                                      {loadingReceiptId === exp.id ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                      ) : (
                                        <ExternalLink className="w-3.5 h-3.5" />
                                      )}
                                      <span>{dictionary.detail.viewReceipt}</span>
                                    </button>
                                  </div>
                                )}

                                {/* Retry / Attach Receipt if missing */}
                                {exp.evidence_status !== "receipt_attached" && canSubmitOwn && (
                                  <div className="pt-2 space-y-2">
                                    <input
                                      ref={retryFileInputRef}
                                      type="file"
                                      accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                      onChange={(e) => handleRetryFileSelected(exp.id, e)}
                                      disabled={isAttachingReceipt}
                                      className="hidden"
                                      id={`retry-file-${exp.id}`}
                                    />
                                    <label
                                      htmlFor={`retry-file-${exp.id}`}
                                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground font-medium cursor-pointer hover:bg-primary/90 transition-all ${
                                        isAttachingReceipt ? "pointer-events-none opacity-50" : ""
                                      }`}
                                    >
                                      {attachingReceiptExpenseId === exp.id ? (
                                        <>
                                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                          <span>{dictionary.detail.attachingReceipt}</span>
                                        </>
                                      ) : (
                                        <>
                                          <Upload className="w-3.5 h-3.5" />
                                          <span>{dictionary.detail.attachReceipt}</span>
                                        </>
                                      )}
                                    </label>
                                  </div>
                                )}

                                {receiptUrlError && (
                                  <p className="text-[11px] text-red-600 mt-1">{receiptUrlError}</p>
                                )}
                                {retryError && (
                                  <p className="text-[11px] text-red-600 mt-1">{retryError}</p>
                                )}
                              </div>

                              {/* Column 3: Review & Reimbursement (Display-Only) */}
                              <div className="space-y-2 rounded-lg border border-border bg-card p-3 shadow-2xs">
                                <h4 className="font-semibold text-foreground border-b border-border pb-1">
                                  {dictionary.detail.financeReview} & {dictionary.detail.reimbursementStatus}
                                </h4>
                                <div>
                                  <span className="text-muted-foreground">{dictionary.detail.financeReview}:</span>
                                  <p className="font-medium text-foreground">
                                    {isReviewed ? (
                                      <span className="text-emerald-700 font-semibold">
                                        {dictionary.financeReviewStates.reviewed}
                                        {exp.finance_reviewed_at && (
                                          <span className="text-muted-foreground font-normal text-[11px] block" dir="ltr">
                                            {exp.finance_reviewed_at}
                                          </span>
                                        )}
                                      </span>
                                    ) : (
                                      <span className="text-muted-foreground italic">
                                        {dictionary.financeReviewStates.pending}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <div className="grid grid-cols-2 gap-2 pt-1 border-t border-border">
                                  <div>
                                    <span className="text-muted-foreground">{dictionary.detail.reimbursedAmount}:</span>
                                    <p className="font-medium font-mono text-foreground">
                                      <span dir="ltr">
                                        {Number(exp.reimbursed_amount ?? 0).toFixed(2)} {exp.currency}
                                      </span>
                                    </p>
                                  </div>
                                  <div>
                                    <span className="text-muted-foreground">{dictionary.detail.remainingAmount}:</span>
                                    <p className="font-medium font-mono text-foreground">
                                      <span dir="ltr">
                                        {(Number(exp.amount) - Number(exp.reimbursed_amount ?? 0)).toFixed(2)} {exp.currency}
                                      </span>
                                    </p>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Submission Modal */}
      {isSubmissionModalOpen && (
        <ExpenseSubmissionModal
          isOpen={isSubmissionModalOpen}
          onClose={() => setIsSubmissionModalOpen(false)}
          onSuccess={(result) => {
            if (result.outcome === "full_success") {
              setNotice({
                type: "full_success",
                message: dictionary.notices.fullSuccess,
                expenseNumber: result.expenseNumber,
              });
            } else if (result.outcome === "partial_success") {
              setNotice({
                type: "partial_success",
                message: dictionary.notices.partialSuccess,
                expenseNumber: result.expenseNumber,
              });
            }
            router.refresh();
          }}
          eligibleServices={eligibleServices}
          dictionary={dictionary}
          locale={locale}
        />
      )}
    </div>
  );
}
