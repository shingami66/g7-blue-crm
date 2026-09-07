"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  getExpensesDictionary,
  getExpenseStatusLabel,
  getExpenseOriginTypeLabel,
  getExpensePaymentMethodLabel,
  getExpenseContextTypeLabel,
  getExpenseReimbursementStatusLabel,
  getExceptionDispositionLabel,
  type ExpensesDictionary,
} from "@/lib/i18n/dictionaries/expenses";
import type { ExpenseAccountabilitySummary } from "@/lib/expenses/types";
import { Receipt, AlertCircle, FileCheck, HelpCircle } from "lucide-react";

interface ExpensesClientProps {
  canRead: boolean;
  expenses: ExpenseAccountabilitySummary[];
  loadError: string | null;
  dictionary?: ExpensesDictionary;
}

export default function ExpensesClient({
  canRead,
  expenses,
  loadError,
  dictionary: dictionaryProp,
}: ExpensesClientProps) {
  const locale = useLocale();
  const dictionary = dictionaryProp ?? getExpensesDictionary(locale);

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
      </div>

      {/* Load error alert if any */}
      {loadError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            {dictionary.states.noticePrefix} {loadError}
          </span>
        </div>
      )}

      {/* Bounded domain tabs indicator */}
      <div className="flex border-b border-border text-sm font-medium">
        <div className="border-b-2 border-primary text-primary px-4 py-2 flex items-center gap-2">
          <Receipt className="w-4 h-4" />
          {dictionary.tabs.expensesLedger}
        </div>
        <div className="text-muted-foreground px-4 py-2 cursor-not-allowed opacity-60">
          {dictionary.tabs.cashAdvancesLocked}
        </div>
        <div className="text-muted-foreground px-4 py-2 cursor-not-allowed opacity-60">
          {dictionary.tabs.pettyCashLocked}
        </div>
      </div>

      {/* Bounded Foundation Expenses Table */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between bg-muted/30">
          <h3 className="font-semibold text-sm">{dictionary.table.cardTitle}</h3>
          <span className="text-xs text-muted-foreground">
            <span dir="ltr">{expenses.length}</span> {dictionary.table.recordsLoaded}
          </span>
        </div>

        {expenses.length === 0 ? (
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
                  <th className="px-4 py-3 text-start">{dictionary.table.columns.originAndMethod}</th>
                  <th className="px-4 py-3 text-start">{dictionary.table.columns.evidence}</th>
                  <th className="px-4 py-3 text-end">{dictionary.table.columns.amount}</th>
                  <th className="px-4 py-3 text-center">{dictionary.table.columns.status}</th>
                  <th className="px-4 py-3 text-center">{dictionary.table.columns.reimbursement}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono font-medium text-xs text-start">
                      <span dir="ltr">{exp.expense_number}</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap text-start">
                      <span dir="ltr">{exp.expense_date}</span>
                    </td>
                    <td className="px-4 py-3 text-start">
                      {exp.context_type === "event" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
                          {getExpenseContextTypeLabel(locale, exp.context_type)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                          {getExpenseContextTypeLabel(locale, exp.context_type)}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-start">
                      <div className="text-xs font-medium">
                        {getExpenseOriginTypeLabel(locale, exp.origin_type)}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {getExpensePaymentMethodLabel(locale, exp.payment_method)}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-start">
                      {exp.evidence_status === "receipt_attached" && (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <FileCheck className="w-3 h-3" /> {dictionary.evidenceStatuses.receiptAttached}
                        </span>
                      )}
                      {exp.evidence_status.startsWith("exception_") && (
                        <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <AlertCircle className="w-3 h-3" /> {dictionary.evidenceStatuses.exception}{" "}
                          {exp.exception_disposition
                            ? `(${getExceptionDispositionLabel(locale, exp.exception_disposition)})`
                            : ""}
                        </span>
                      )}
                      {exp.evidence_status === "no_evidence" && (
                        <span className="inline-flex items-center gap-1 text-xs text-zinc-500 bg-zinc-100 px-2 py-0.5 rounded border border-zinc-200">
                          <HelpCircle className="w-3 h-3" /> {dictionary.evidenceStatuses.noEvidence}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-end font-mono font-semibold">
                      <span dir="ltr">
                        {Number(exp.amount).toFixed(2)} {exp.currency}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
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
                    </td>
                    <td className="px-4 py-3 text-center">
                      {exp.origin_type === "employee_paid" ? (
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
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
                        <span className="text-xs text-muted-foreground italic">
                          {dictionary.reimbursementStatuses.not_applicable}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
