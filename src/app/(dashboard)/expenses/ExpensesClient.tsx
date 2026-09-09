"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getExpensesDictionary,
  getExpenseActionErrorMessage,
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
  ExpenseRowCapabilities,
} from "@/lib/expenses/types";
import {
  getPrivateExpenseReceiptUrlAction,
  attachExpenseReceiptAction,
} from "@/lib/expenses/actions";
import { ExpenseSubmissionModal } from "./ExpenseSubmissionModal";
import ExpenseWorkspaceActions from "./ExpenseWorkspaceActions";
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
  canReadOwn?: boolean;
  canReadBroad?: boolean;
  canSubmitOwn?: boolean;
  myExpenses?: ExpenseAccountabilitySummary[];
  expenses?: ExpenseAccountabilitySummary[];
  eligibleServices?: ExpenseServiceOption[];
  loadError: boolean;
  rowCapabilities?: Record<string, ExpenseRowCapabilities>;
  dictionary?: ExpensesDictionary;
}

const EMPTY_ROW_CAPABILITIES: ExpenseRowCapabilities = {
  canFinanceReview: false,
  canApprove: false,
  canReject: false,
};

export default function ExpensesClient({
  canRead,
  canReadOwn,
  canReadBroad,
  canSubmitOwn = false,
  myExpenses: myExpensesProp,
  expenses: legacyExpensesProp,
  eligibleServices = [],
  loadError = false,
  rowCapabilities = {},
  dictionary: dictionaryProp,
}: ExpensesClientProps) {
  const locale = useLocale();
  const router = useRouter();
  const dictionary = dictionaryProp ?? getExpensesDictionary(locale);

  const hasOwnView = canReadOwn ?? myExpensesProp !== undefined;
  const hasBroadView = canReadBroad ?? legacyExpensesProp !== undefined;
  const myExpenses = myExpensesProp ?? [];
  const allExpenses = legacyExpensesProp ?? [];
  const [activeView, setActiveView] = useState<"mine" | "all">(
    hasOwnView ? "mine" : "all",
  );
  const selectedView =
    hasOwnView && hasBroadView ? activeView : hasOwnView ? "mine" : "all";
  const expensesList = selectedView === "mine" ? myExpenses : allExpenses;
  const selectedViewTitle =
    selectedView === "mine" ? dictionary.tabs.myExpenses : dictionary.tabs.allExpenses;
  const selectedViewSubtitle =
    selectedView === "mine"
      ? dictionary.myExpenses.subtitle
      : dictionary.tabs.allExpensesSubtitle;

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

  // Auto-dismiss transient success notices after ~5 seconds
  useEffect(() => {
    if (notice?.type === "full_success" || notice?.type === "receipt_attached") {
      const timer = setTimeout(() => {
        setNotice((curr) => {
          if (curr?.type === "full_success" || curr?.type === "receipt_attached") {
            return null;
          }
          return curr;
        });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

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
        <div className="rounded-xl border border-error bg-error-container/40 p-6 text-on-error-container">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-error" />
            {dictionary.states.accessRestricted}
          </h2>
          <p className="mt-1 text-sm text-on-error-container">
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
        setReceiptUrlError(getExpenseActionErrorMessage(dictionary, res.errorCode));
      } else {
        window.open(res.data.signedUrl, "_blank", "noopener,noreferrer");
      }
    } catch {
      setReceiptUrlError(getExpenseActionErrorMessage(dictionary));
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
          setRetryError(getExpenseActionErrorMessage(dictionary, res.errorCode));
        } else {
          setNotice({
            type: "receipt_attached",
            message: dictionary.notices.receiptAttachedSuccess,
          });
          router.refresh();
        }
      } catch {
        setRetryError(getExpenseActionErrorMessage(dictionary));
      } finally {
        setAttachingReceiptExpenseId(null);
        if (retryFileInputRef.current) {
          retryFileInputRef.current.value = "";
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-outline-variant pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-on-surface-variant mb-1">
            <span>{dictionary.header.sectionBadge}</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-on-surface flex items-center gap-2">
            <Receipt className="w-6 h-6 text-primary" />
            {dictionary.header.title}
          </h1>
          <p className="text-sm text-on-surface-variant mt-1">
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
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-primary text-on-primary text-sm font-semibold hover:bg-primary/90 transition-all shadow-sm shrink-0"
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
                : "border-error bg-error-container/40 text-on-error-container"
          }`}
        >
          <div className="flex items-start gap-2.5">
            {notice.type === "full_success" || notice.type === "receipt_attached" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : notice.type === "partial_success" ? (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-error shrink-0 mt-0.5" />
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
            {dictionary.states.noticePrefix} {dictionary.states.loadErrorDefault}
          </span>
        </div>
      )}

      {/* Workspace views */}
      {hasOwnView && hasBroadView && (
        <div className="flex flex-wrap gap-2 border-b border-outline-variant pb-3" role="tablist" aria-label={dictionary.header.title}>
          <button
            type="button"
            role="tab"
            aria-selected={selectedView === "mine"}
            onClick={() => setActiveView("mine")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              selectedView === "mine"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            {dictionary.tabs.myExpenses}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={selectedView === "all"}
            onClick={() => setActiveView("all")}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition-colors ${
              selectedView === "all"
                ? "bg-primary text-on-primary"
                : "text-on-surface-variant hover:bg-surface-container-low"
            }`}
          >
            {dictionary.tabs.allExpenses}
          </button>
        </div>
      )}

      {/* Section Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-on-surface">
            {selectedViewTitle}
          </h2>
          <p className="text-xs text-on-surface-variant mt-0.5">
            {selectedViewSubtitle}
          </p>
        </div>
        <span className="text-xs text-on-surface-variant bg-surface-container px-2.5 py-1 rounded-full font-medium">
          <span dir="ltr">{expensesList.length}</span> {dictionary.table.recordsLoaded}
        </span>
      </div>

      {/* Expenses Table / Cards Container */}
      <div className="rounded-xl border border-outline-variant bg-surface-container-lowest shadow-sm overflow-hidden">
        {expensesList.length === 0 ? (
          <div className="p-12 text-center text-on-surface-variant space-y-3">
            <Receipt className="w-10 h-10 mx-auto opacity-30 text-on-surface-variant" />
            <p className="font-medium text-on-surface">{dictionary.table.empty.title}</p>
            <p className="text-xs max-w-sm mx-auto text-on-surface-variant">
              {dictionary.table.empty.description}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="bg-surface-container-low text-xs font-semibold text-on-surface-variant border-b border-outline-variant uppercase">
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
                <tbody className="divide-y divide-outline-variant">
                  {expensesList.map((exp) => {
                    const isExpanded = expandedExpenseId === exp.id;
                    const isReviewed = Boolean(exp.finance_reviewed_at);

                    return (
                      <tr key={exp.id} className="group hover:bg-surface-container-low/60 transition-colors">
                        <td colSpan={9} className="p-0">
                          {/* Summary Row */}
                          <div className="flex items-center px-4 py-3 text-xs w-full divide-x-0">
                            {/* Expense Number */}
                            <div className="w-[14%] font-mono font-bold text-start text-on-surface">
                              <span dir="ltr">{exp.expense_number}</span>
                            </div>

                            {/* Date */}
                            <div className="w-[11%] text-on-surface-variant whitespace-nowrap text-start">
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
                              <p className="mt-1 text-[10px] text-on-surface-variant">
                                {getExpenseOriginTypeLabel(locale, exp.origin_type)} · {getExpensePaymentMethodLabel(locale, exp.payment_method)}
                              </p>
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
                            <div className="w-[12%] text-end font-mono font-bold text-on-surface">
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
                                <span className="text-[11px] text-on-surface-variant italic">
                                  {dictionary.reimbursementStatuses.not_applicable}
                                </span>
                              )}
                            </div>

                            {/* Actions / Expansion trigger */}
                            <div className="w-[4%] text-center">
                              <button
                                type="button"
                                onClick={() => toggleRowExpansion(exp.id)}
                                className="p-1 rounded text-on-surface-variant hover:bg-surface-container hover:text-on-surface transition-colors"
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
                            <div className="border-t border-outline-variant bg-surface-container-low/40 p-5 space-y-4">
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                                {/* Column 1: Core Details */}
                                <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-xs">
                                  <h4 className="font-semibold text-on-surface border-b border-outline-variant pb-1">
                                    {dictionary.detail.title}
                                  </h4>
                                  <div>
                                    <span className="text-on-surface-variant">{dictionary.detail.description}:</span>
                                    <p className="font-medium text-on-surface mt-0.5">{exp.description}</p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-1">
                                    <div>
                                      <span className="text-on-surface-variant">{dictionary.detail.category}:</span>
                                      <p className="font-medium text-on-surface">
                                        {dictionary.categories[exp.expense_category] ?? exp.expense_category}
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-on-surface-variant">{dictionary.table.columns.originAndMethod}:</span>
                                      <p className="font-medium text-on-surface">
                                        {getExpenseOriginTypeLabel(locale, exp.origin_type)} (
                                        {getExpensePaymentMethodLabel(locale, exp.payment_method)})
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                {/* Column 2: Evidence & Receipt Access */}
                                <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-xs">
                                  <h4 className="font-semibold text-on-surface border-b border-outline-variant pb-1">
                                    {dictionary.detail.receiptDocument}
                                  </h4>
                                  <div>
                                    <span className="text-on-surface-variant">{dictionary.detail.evidenceStatus}:</span>
                                    <p className="font-medium text-on-surface mt-0.5">
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
                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-primary hover:bg-surface-container font-medium transition-all"
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
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-medium cursor-pointer hover:bg-primary/90 transition-all shadow-xs ${
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
                                    <p className="text-[11px] text-error mt-1">{receiptUrlError}</p>
                                  )}
                                  {retryError && (
                                    <p className="text-[11px] text-error mt-1">{retryError}</p>
                                  )}
                                </div>

                                {/* Column 3: Review & Reimbursement (Display-Only) */}
                                <div className="space-y-2 rounded-lg border border-outline-variant bg-surface-container-lowest p-3 shadow-xs">
                                  <h4 className="font-semibold text-on-surface border-b border-outline-variant pb-1">
                                    {dictionary.detail.financeReview} & {dictionary.detail.reimbursementStatus}
                                  </h4>
                                  <div>
                                    <span className="text-on-surface-variant">{dictionary.detail.financeReview}:</span>
                                    <p className="font-medium text-on-surface mt-0.5">
                                      {isReviewed ? (
                                        <span className="text-emerald-700 font-semibold">
                                          {dictionary.financeReviewStates.reviewed}
                                          {exp.finance_reviewed_at && (
                                            <span className="text-on-surface-variant font-normal text-[11px] block" dir="ltr">
                                              {exp.finance_reviewed_at}
                                            </span>
                                          )}
                                        </span>
                                      ) : (
                                        <span className="text-on-surface-variant italic">
                                          {dictionary.financeReviewStates.pending}
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant">
                                    <div>
                                      <span className="text-on-surface-variant">{dictionary.detail.reimbursedAmount}:</span>
                                      <p className="font-medium font-mono text-on-surface">
                                        <span dir="ltr">
                                          {Number(exp.reimbursed_amount ?? 0).toFixed(2)} {exp.currency}
                                        </span>
                                      </p>
                                    </div>
                                    <div>
                                      <span className="text-on-surface-variant">{dictionary.detail.remainingAmount}:</span>
                                      <p className="font-medium font-mono text-on-surface">
                                        <span dir="ltr">
                                          {(Number(exp.amount) - Number(exp.reimbursed_amount ?? 0)).toFixed(2)} {exp.currency}
                                        </span>
                                      </p>
                                    </div>
                                  </div>
                                  <div className="border-t border-outline-variant pt-2">
                                    <ExpenseWorkspaceActions
                                      expense={exp}
                                      capabilities={rowCapabilities[exp.id] ?? EMPTY_ROW_CAPABILITIES}
                                      dictionary={dictionary}
                                    />
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

            {/* Mobile Cards View (< md) */}
            <div className="block md:hidden divide-y divide-outline-variant" data-testid="mobile-expense-cards">
              {expensesList.map((exp) => {
                const isExpanded = expandedExpenseId === exp.id;
                const isReviewed = Boolean(exp.finance_reviewed_at);

                return (
                  <div key={exp.id} className="p-4 space-y-3 hover:bg-surface-container-low/40 transition-colors">
                    {/* Top: Expense Number, Date, Amount */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span dir="ltr" className="font-mono font-bold text-sm text-on-surface">
                          {exp.expense_number}
                        </span>
                        <span dir="ltr" className="block text-xs text-on-surface-variant mt-0.5">
                          {exp.expense_date}
                        </span>
                      </div>
                      <div className="text-end font-mono font-bold text-sm text-on-surface">
                        <span dir="ltr">
                          {Number(exp.amount).toFixed(2)} {exp.currency}
                        </span>
                      </div>
                    </div>

                    {/* Badges: Context, Evidence, Status */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      {/* Context */}
                      {exp.context_type === "event" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {getExpenseContextTypeLabel(locale, exp.context_type)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {getExpenseContextTypeLabel(locale, exp.context_type)}
                        </span>
                      )}

                      {/* Evidence */}
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

                      {/* Lifecycle Status */}
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
                      <span className="inline-flex items-center rounded border border-outline-variant px-2 py-0.5 text-[11px] font-medium text-on-surface-variant">
                        {getExpensePaymentMethodLabel(locale, exp.payment_method)}
                      </span>
                    </div>

                    {/* Secondary Info: Finance Review & Reimbursement */}
                    <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-outline-variant/60">
                      <div className="flex items-center gap-1">
                        {isReviewed ? (
                          <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                            <ShieldCheck className="w-3.5 h-3.5" />
                            {dictionary.financeReviewStates.reviewed}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-zinc-500">
                            <Clock className="w-3.5 h-3.5" />
                            {dictionary.financeReviewStates.pending}
                          </span>
                        )}
                      </div>
                      <div>
                        {exp.origin_type === "employee_paid" ? (
                          <span className="text-[11px] font-medium text-on-surface">
                            {getExpenseReimbursementStatusLabel(locale, exp.reimbursement_status)}
                          </span>
                        ) : (
                          <span className="text-[11px] italic">
                            {dictionary.reimbursementStatuses.not_applicable}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action: Expand Details */}
                    <button
                      type="button"
                      onClick={() => toggleRowExpansion(exp.id)}
                      className="w-full flex items-center justify-center gap-1 py-1.5 text-xs font-medium text-primary hover:bg-surface-container-low rounded-lg transition-colors border border-outline-variant"
                    >
                      <span>{isExpanded ? dictionary.detail.close : dictionary.table.columns.actions}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    {/* Mobile Expanded Detail Drawer */}
                    {isExpanded && (
                      <div className="pt-2 space-y-3 text-xs border-t border-outline-variant">
                        {/* Core Details */}
                        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 space-y-2">
                          <h4 className="font-semibold text-on-surface border-b border-outline-variant pb-1">
                            {dictionary.detail.title}
                          </h4>
                          <div>
                            <span className="text-on-surface-variant">{dictionary.detail.description}:</span>
                            <p className="font-medium text-on-surface mt-0.5">{exp.description}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <span className="text-on-surface-variant">{dictionary.detail.category}:</span>
                              <p className="font-medium text-on-surface">
                                {dictionary.categories[exp.expense_category] ?? exp.expense_category}
                              </p>
                            </div>
                            <div>
                              <span className="text-on-surface-variant">{dictionary.table.columns.originAndMethod}:</span>
                              <p className="font-medium text-on-surface">
                                {getExpenseOriginTypeLabel(locale, exp.origin_type)} ({getExpensePaymentMethodLabel(locale, exp.payment_method)})
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Evidence & Receipt */}
                        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 space-y-2">
                          <h4 className="font-semibold text-on-surface border-b border-outline-variant pb-1">
                            {dictionary.detail.receiptDocument}
                          </h4>
                          <div>
                            <span className="text-on-surface-variant">{dictionary.detail.evidenceStatus}:</span>
                            <p className="font-medium text-on-surface mt-0.5">
                              {exp.evidence_status === "receipt_attached"
                                ? dictionary.evidenceStatuses.receiptAttached
                                : exp.evidence_status === "no_evidence"
                                  ? dictionary.evidenceStatuses.noEvidence
                                  : dictionary.evidenceStatuses.exception}
                            </p>
                          </div>

                          {/* View Receipt */}
                          {exp.evidence_status === "receipt_attached" && (
                            <div className="pt-1">
                              <button
                                type="button"
                                onClick={() => handleViewReceipt(exp.id)}
                                disabled={loadingReceiptId === exp.id}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-outline-variant bg-surface-container-lowest text-primary hover:bg-surface-container font-medium transition-all"
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

                          {/* Retry / Attach Receipt */}
                          {exp.evidence_status !== "receipt_attached" && canSubmitOwn && (
                            <div className="pt-1 space-y-2">
                              <input
                                ref={retryFileInputRef}
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png"
                                onChange={(e) => handleRetryFileSelected(exp.id, e)}
                                disabled={isAttachingReceipt}
                                className="hidden"
                                id={`mobile-retry-file-${exp.id}`}
                              />
                              <label
                                htmlFor={`mobile-retry-file-${exp.id}`}
                                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-on-primary font-medium cursor-pointer hover:bg-primary/90 transition-all shadow-xs ${
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
                            <p className="text-[11px] text-error mt-1">{receiptUrlError}</p>
                          )}
                          {retryError && (
                            <p className="text-[11px] text-error mt-1">{retryError}</p>
                          )}
                        </div>

                        {/* Review & Reimbursement */}
                        <div className="rounded-lg border border-outline-variant bg-surface-container-low p-3 space-y-2">
                          <h4 className="font-semibold text-on-surface border-b border-outline-variant pb-1">
                            {dictionary.detail.financeReview} & {dictionary.detail.reimbursementStatus}
                          </h4>
                          <div>
                            <span className="text-on-surface-variant">{dictionary.detail.financeReview}:</span>
                            <p className="font-medium text-on-surface mt-0.5">
                              {isReviewed ? (
                                <span className="text-emerald-700 font-semibold">
                                  {dictionary.financeReviewStates.reviewed}
                                  {exp.finance_reviewed_at && (
                                    <span className="text-on-surface-variant font-normal text-[11px] block" dir="ltr">
                                      {exp.finance_reviewed_at}
                                    </span>
                                  )}
                                </span>
                              ) : (
                                <span className="text-on-surface-variant italic">
                                  {dictionary.financeReviewStates.pending}
                                </span>
                              )}
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-outline-variant">
                            <div>
                              <span className="text-on-surface-variant">{dictionary.detail.reimbursedAmount}:</span>
                              <p className="font-medium font-mono text-on-surface">
                                <span dir="ltr">
                                  {Number(exp.reimbursed_amount ?? 0).toFixed(2)} {exp.currency}
                                </span>
                              </p>
                            </div>
                            <div>
                              <span className="text-on-surface-variant">{dictionary.detail.remainingAmount}:</span>
                              <p className="font-medium font-mono text-on-surface">
                                <span dir="ltr">
                                  {(Number(exp.amount) - Number(exp.reimbursed_amount ?? 0)).toFixed(2)} {exp.currency}
                                </span>
                              </p>
                            </div>
                          </div>
                          <div className="border-t border-outline-variant pt-2">
                            <ExpenseWorkspaceActions
                              expense={exp}
                              capabilities={rowCapabilities[exp.id] ?? EMPTY_ROW_CAPABILITIES}
                              dictionary={dictionary}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
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
