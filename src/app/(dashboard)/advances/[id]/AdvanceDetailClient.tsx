"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getCashAdvancesDictionary,
  getCashAdvanceStatusLabel,
  getCashAdvanceContextTypeLabel,
  type CashAdvancesDictionary,
} from "@/lib/i18n/dictionaries/cash-advances";
import type {
  EnrichedCashAdvance,
  EnrichedCashAdvanceExpenseSettlement,
  CashAdvanceReturn,
  CashAdvanceStatus,
} from "@/lib/expenses/types";
import PendingLink from "@/components/ui/PendingLink";
import {
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Building2,
  Calendar,
  User,
  Clock,
  Receipt,
  RotateCcw,
} from "lucide-react";

interface AdvanceDetailClientProps {
  canRead: boolean;
  advance: EnrichedCashAdvance | null;
  allocations: EnrichedCashAdvanceExpenseSettlement[];
  returns: CashAdvanceReturn[];
  approverName?: string | null;
  issuerName?: string | null;
  rejecterName?: string | null;
  cancellerName?: string | null;
  requesterName?: string | null;
  dictionary?: CashAdvancesDictionary;
}

export default function AdvanceDetailClient({
  canRead,
  advance,
  allocations,
  returns,
  approverName,
  issuerName,
  rejecterName,
  cancellerName,
  requesterName,
  dictionary: dictionaryProp,
}: AdvanceDetailClientProps) {
  const locale = useLocale();
  const dictionary = dictionaryProp ?? getCashAdvancesDictionary(locale);
  const isRtl = locale === "ar";

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

  if (!advance) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <PendingLink
          href="/advances"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{dictionary.detail.backToAdvances}</span>
        </PendingLink>

        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-10 text-center text-on-surface-variant space-y-2">
          <AlertCircle className="w-10 h-10 mx-auto text-amber-600" />
          <h2 className="text-base font-bold text-on-surface">
            {dictionary.states.notFoundTitle}
          </h2>
          <p className="text-xs max-w-md mx-auto text-on-surface-variant">
            {dictionary.states.notFoundMessage}
          </p>
        </div>
      </div>
    );
  }

  const getStatusBadgeClass = (status: CashAdvanceStatus) => {
    switch (status) {
      case "approved":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "issued":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "settled":
        return "bg-zinc-100 text-zinc-700 border-zinc-200";
      case "rejected":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "cancelled":
        return "bg-zinc-100 text-zinc-600 border-zinc-200";
      case "submitted":
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <div className="space-y-6 max-w-5xl">
        {/* Top Back Navigation */}
      <div>
        <PendingLink
          href="/advances"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline transition-colors"
        >
          {isRtl ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
          <span>{dictionary.detail.backToAdvances}</span>
        </PendingLink>
      </div>

      {/* Header Banner */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[11px] font-semibold text-on-surface-variant uppercase tracking-wider">
              {dictionary.detail.fields.advanceNumber}
            </span>
            <h1 className="text-2xl font-mono font-bold text-primary flex items-center gap-2">
              <span dir="ltr">{advance.advance_number}</span>
            </h1>
          </div>

          <div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadgeClass(
                advance.status,
              )}`}
            >
              {getCashAdvanceStatusLabel(locale, advance.status)}
            </span>
          </div>
        </div>

        {/* Purpose */}
        <div className="pt-2 border-t border-outline-variant/60">
          <span className="text-[11px] font-semibold text-on-surface-variant block">
            {dictionary.detail.fields.purpose}
          </span>
          <p className="text-sm text-on-surface mt-0.5 leading-relaxed">
            {advance.purpose}
          </p>
        </div>
      </div>

      {/* 4-Metric Accountability Block */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Issued */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs">
          <span className="text-[11px] font-medium text-on-surface-variant block">
            {dictionary.accountability.amountIssued}
          </span>
          <p className="text-lg font-mono font-bold text-on-surface mt-1">
            <span dir="ltr">
              {Number(advance.amount_issued).toFixed(2)} {dictionary.accountability.currency}
            </span>
          </p>
        </div>

        {/* Spent */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs">
          <span className="text-[11px] font-medium text-on-surface-variant block">
            {dictionary.accountability.amountSpent}
          </span>
          <p className="text-lg font-mono font-medium text-on-surface mt-1">
            <span dir="ltr">
              {Number(advance.amount_spent_settled).toFixed(2)} {dictionary.accountability.currency}
            </span>
          </p>
        </div>

        {/* Returned */}
        <div className="rounded-xl border border-outline-variant bg-surface-container-lowest p-4 shadow-xs">
          <span className="text-[11px] font-medium text-on-surface-variant block">
            {dictionary.accountability.amountReturned}
          </span>
          <p className="text-lg font-mono font-medium text-on-surface mt-1">
            <span dir="ltr">
              {Number(advance.amount_returned).toFixed(2)} {dictionary.accountability.currency}
            </span>
          </p>
        </div>

        {/* Remaining */}
        <div className="rounded-xl border border-primary/30 bg-primary-container/20 p-4 shadow-xs">
          <span className="text-[11px] font-bold text-primary block">
            {dictionary.accountability.remainingBalance}
          </span>
          <p className="text-lg font-mono font-bold text-primary mt-1">
            <span dir="ltr">
              {Number(advance.remaining_balance).toFixed(2)} {dictionary.accountability.currency}
            </span>
          </p>
        </div>
      </div>

      {/* Identity & Context Details */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
          <User className="w-4 h-4 text-primary" />
          {dictionary.detail.sections.identity}
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-on-surface-variant block">{dictionary.detail.fields.recipient}:</span>
            <p className="font-semibold text-on-surface mt-0.5">
              {advance.recipientName || "—"}
            </p>
          </div>

          <div>
            <span className="text-on-surface-variant block">{dictionary.detail.fields.requestedAt}:</span>
            <p className="font-medium text-on-surface mt-0.5" dir="ltr">
              {new Date(advance.requested_at).toLocaleString()}
            </p>
            {requesterName && (
              <span className="text-[11px] text-on-surface-variant mt-0.5 block">
                {dictionary.detail.fields.requestedBy}: {requesterName}
              </span>
            )}
          </div>

          <div>
            <span className="text-on-surface-variant block">{dictionary.detail.fields.context}:</span>
            <div className="mt-0.5">
              {advance.context_type === "company" ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                  <Building2 className="w-3 h-3" />
                  {getCashAdvanceContextTypeLabel(locale, advance.context_type)}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  <Calendar className="w-3 h-3" />
                  {getCashAdvanceContextTypeLabel(locale, advance.context_type)}
                </span>
              )}
            </div>
          </div>

          {advance.service_id && (
            <div className="sm:col-span-2">
              <span className="text-on-surface-variant block">{dictionary.detail.fields.service}:</span>
              <p className="font-medium text-on-surface mt-0.5">
                {advance.serviceNumber && (
                  <span dir="ltr" className="font-mono font-bold me-1.5">
                    [{advance.serviceNumber}]
                  </span>
                )}
                {advance.serviceTitle}
                {advance.eventName && (
                  <span className="text-on-surface-variant ms-1">
                    ({advance.eventName})
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Lifecycle & Audit (Only rendered if meaningful values exist) */}
      {(advance.approved_at ||
        advance.issued_at ||
        advance.payment_reference ||
        advance.settled_at ||
        advance.rejection_reason ||
        advance.cancellation_reason) && (
        <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
            <Clock className="w-4 h-4 text-primary" />
            {dictionary.detail.sections.lifecycle}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {advance.approved_at && (
              <div>
                <span className="text-on-surface-variant block">{dictionary.detail.fields.approvedAt}:</span>
                <p className="font-medium text-on-surface mt-0.5" dir="ltr">
                  {new Date(advance.approved_at).toLocaleString()}
                </p>
                {approverName && (
                  <span className="text-[11px] text-on-surface-variant mt-0.5 block">
                    {dictionary.detail.fields.approvedBy}: {approverName}
                  </span>
                )}
              </div>
            )}

            {advance.issued_at && (
              <div>
                <span className="text-on-surface-variant block">{dictionary.detail.fields.issuedAt}:</span>
                <p className="font-medium text-on-surface mt-0.5" dir="ltr">
                  {new Date(advance.issued_at).toLocaleString()}
                </p>
                {issuerName && (
                  <span className="text-[11px] text-on-surface-variant mt-0.5 block">
                    {dictionary.detail.fields.issuedBy}: {issuerName}
                  </span>
                )}
              </div>
            )}

            {advance.payment_reference && (
              <div>
                <span className="text-on-surface-variant block">
                  {dictionary.detail.fields.paymentReference}:
                </span>
                <p className="font-mono font-medium text-on-surface mt-0.5" dir="ltr">
                  {advance.payment_reference}
                </p>
              </div>
            )}

            {advance.settled_at && (
              <div>
                <span className="text-on-surface-variant block">{dictionary.detail.fields.settledAt}:</span>
                <p className="font-medium text-on-surface mt-0.5" dir="ltr">
                  {new Date(advance.settled_at).toLocaleString()}
                </p>
              </div>
            )}

            {advance.rejection_reason && (
              <div className="sm:col-span-2">
                <span className="text-rose-700 font-semibold block">
                  {dictionary.detail.fields.rejectionReason}:
                </span>
                <p className="text-rose-800 bg-rose-50 border border-rose-200 rounded-lg p-2.5 mt-1">
                  {advance.rejection_reason}
                </p>
                {rejecterName && (
                  <span className="text-[11px] text-on-surface-variant mt-1 block">
                    {dictionary.detail.fields.rejectedBy}: {rejecterName}
                  </span>
                )}
                {advance.rejected_at && (
                  <span className="text-[11px] text-on-surface-variant mt-0.5 block" dir="ltr">
                    {dictionary.detail.fields.rejectedAt}: {new Date(advance.rejected_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}

            {advance.cancellation_reason && (
              <div className="sm:col-span-2">
                <span className="text-zinc-700 font-semibold block">
                  {dictionary.detail.fields.cancellationReason}:
                </span>
                <p className="text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg p-2.5 mt-1">
                  {advance.cancellation_reason}
                </p>
                {cancellerName && (
                  <span className="text-[11px] text-on-surface-variant mt-1 block">
                    {dictionary.detail.fields.cancelledBy}: {cancellerName}
                  </span>
                )}
                {advance.cancelled_at && (
                  <span className="text-[11px] text-on-surface-variant mt-0.5 block" dir="ltr">
                    {dictionary.detail.fields.cancelledAt}: {new Date(advance.cancelled_at).toLocaleString()}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Spend / Allocation History */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
          <Receipt className="w-4 h-4 text-primary" />
          {dictionary.detail.sections.allocations}
        </h2>

        {allocations.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-2">
            {dictionary.detail.allocationsTable.empty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-2.5 text-start">
                    {dictionary.detail.allocationsTable.expenseNumber}
                  </th>
                  <th className="px-4 py-2.5 text-end">
                    {dictionary.detail.allocationsTable.amount}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {dictionary.detail.allocationsTable.settledAt}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {dictionary.detail.allocationsTable.notes}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {allocations.map((alloc) => (
                  <tr key={alloc.id} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-2.5 font-mono font-bold text-on-surface">
                      <span dir="ltr">{alloc.expenseNumber || alloc.expense_id}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-end text-on-surface">
                      <span dir="ltr">
                        {Number(alloc.amount).toFixed(2)} {dictionary.accountability.currency}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      <span dir="ltr">{new Date(alloc.settled_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      {alloc.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cash Return History */}
      <div className="rounded-2xl border border-outline-variant bg-surface-container-lowest p-6 shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-on-surface flex items-center gap-2 border-b border-outline-variant pb-2">
          <RotateCcw className="w-4 h-4 text-primary" />
          {dictionary.detail.sections.returns}
        </h2>

        {returns.length === 0 ? (
          <p className="text-xs text-on-surface-variant italic py-2">
            {dictionary.detail.returnsTable.empty}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-start text-xs">
              <thead className="bg-surface-container-low text-on-surface-variant font-semibold border-b border-outline-variant">
                <tr>
                  <th className="px-4 py-2.5 text-end">
                    {dictionary.detail.returnsTable.amount}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {dictionary.detail.returnsTable.returnedAt}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {dictionary.detail.returnsTable.receiptReference}
                  </th>
                  <th className="px-4 py-2.5 text-start">
                    {dictionary.detail.returnsTable.notes}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {returns.map((ret) => (
                  <tr key={ret.id} className="hover:bg-surface-container-low/50">
                    <td className="px-4 py-2.5 font-mono text-end text-on-surface font-semibold">
                      <span dir="ltr">
                        {Number(ret.amount).toFixed(2)} {dictionary.accountability.currency}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      <span dir="ltr">{new Date(ret.returned_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-on-surface-variant">
                      {ret.receipt_reference ? <span dir="ltr">{ret.receipt_reference}</span> : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-on-surface-variant">
                      {ret.notes || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  </div>
  );
}
