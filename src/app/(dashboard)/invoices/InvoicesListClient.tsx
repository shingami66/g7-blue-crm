"use client";

import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { Filter, Download, Receipt, FileText, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import type { InvoicesDictionary } from "@/lib/i18n/dictionaries/invoices";
import { IssueInvoiceAction } from "./IssueInvoiceAction";
import { RecordPaymentModal } from "./RecordPaymentModal";

const invoiceStatusBadgeVariant = {
  draft: "draft",
  sent: "sent",
  paid: "paid",
  partial: "pending",
  overdue: "overdue",
  cancelled: "rejected",
  voided: "rejected",
} as const satisfies Record<
  InvoiceStatus,
  "draft" | "sent" | "paid" | "pending" | "overdue" | "rejected"
>;

interface InvoicesListClientProps {
  initialInvoices: Invoice[];
  dictionary: InvoicesDictionary;
}

const inactiveInvoiceStatuses = new Set<InvoiceStatus>(["cancelled", "voided"]);

const toSafeNumber = (value: number | string | null | undefined) => {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === "string") {
    const parsed = Number(value.replace(/,/g, ""));
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
};

const formatSar = (value: number) =>
  `\u2066SAR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}\u2069`;

const formatCopy = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

const toLtrText = (value: string | number) => `\u2066${String(value)}\u2069`;

export default function InvoicesListClient({
  initialInvoices,
  dictionary,
}: InvoicesListClientProps) {
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const activeInvoice = initialInvoices.find((i) => i.id === selectedInvoiceId);
  const invoiceStats = useMemo(() => {
    const activeInvoices = initialInvoices.filter(
      (invoice) => !inactiveInvoiceStatuses.has(invoice.status)
    );

    return activeInvoices.reduce(
      (stats, invoice) => {
        const balanceDue = Math.max(toSafeNumber(invoice.balance_due), 0);
        const amountPaid = Math.max(toSafeNumber(invoice.amount_paid), 0);

        return {
          totalOutstanding: stats.totalOutstanding + balanceDue,
          openInvoices: stats.openInvoices + (balanceDue > 0 ? 1 : 0),
          totalCollected: stats.totalCollected + amountPaid,
        };
      },
      {
        totalOutstanding: 0,
        openInvoices: 0,
        totalCollected: 0,
      }
    );
  }, [initialInvoices]);

  const canRecordPayment = activeInvoice
    ? (activeInvoice.status === "sent" || activeInvoice.status === "partial") &&
      (activeInvoice.balance_due ?? 0) > 0
    : false;

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={dictionary.list.title}
        subtitle={dictionary.list.subtitle}
      >
        <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Download size={18} />
          {dictionary.list.export}
        </button>
        <div className="flex items-center text-[13px] text-on-surface-variant max-w-[240px] text-right leading-tight hidden sm:block">
          {dictionary.list.creationHint}
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <KpiCard
          label={dictionary.list.stats.totalOutstanding}
          value={formatSar(invoiceStats.totalOutstanding)}
          trend="flat"
          trendLabel={formatCopy(dictionary.list.stats.openInvoicesCount, {
            count: toLtrText(invoiceStats.openInvoices),
          })}
          icon={Receipt}
        />
        <KpiCard
          label={dictionary.list.stats.openInvoices}
          value={toLtrText(invoiceStats.openInvoices)}
          trend="flat"
          trendLabel={dictionary.list.stats.basedOnLiveBalances}
          icon={FileText}
        />
        <KpiCard
          label={dictionary.list.stats.totalCollected}
          value={formatSar(invoiceStats.totalCollected)}
          trend="flat"
          trendLabel={dictionary.list.stats.collectedOnRecordedInvoices}
          icon={CheckCircle2}
        />
      </div>

      <div className="flex flex-1 gap-6 min-h-0 relative">
        {/* Main Table Area */}
        <div
          className={`flex-1 flex flex-col bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden transition-all duration-300 ${
            selectedInvoiceId ? "w-2/3" : "w-full"
          }`}
        >
          <div className="p-4 border-b border-surface-variant flex flex-wrap gap-3 items-center bg-surface-bright">
            <div className="relative">
              <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary">
                <option>{dictionary.list.filters.allStatuses}</option>
                <option>{dictionary.list.filters.paid}</option>
                <option>{dictionary.list.filters.unpaid}</option>
                <option>{dictionary.list.filters.overdue}</option>
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-variant">
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase w-10">
                    <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    {dictionary.list.table.invoice}
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    {dictionary.list.table.type}
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    {dictionary.list.table.document}
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    {dictionary.list.table.customer}
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    {dictionary.list.table.issueDate}
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right">
                    {dictionary.list.table.amountSar}
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    {dictionary.list.table.status}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px]">
                {initialInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => setSelectedInvoiceId(inv.id)}
                    className={`hover:bg-surface-container-low/50 cursor-pointer transition-colors ${
                      selectedInvoiceId === inv.id ? "bg-primary-fixed/20" : ""
                    }`}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input type="checkbox" className="rounded border-outline-variant text-primary focus:ring-primary" />
                    </td>
                    <td className="px-4 py-4 font-mono font-semibold text-primary" dir="ltr">
                      {inv.invoice_number || inv.id}
                    </td>
                    <td className="px-4 py-4 text-on-surface">
                      {inv.invoice_type ? dictionary.invoiceTypes[inv.invoice_type] : "—"}
                    </td>
                    <td className="px-4 py-4 text-on-surface" dir="auto">
                      {inv.document_label || "—"}
                    </td>
                    <td className="px-4 py-4 font-medium text-on-surface" dir="auto">
                      {inv.customer}
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant" dir="ltr">
                      {inv.date}
                    </td>
                    <td className="px-4 py-4 font-semibold text-on-surface text-right" dir="ltr">
                      {inv.amount}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge variant={invoiceStatusBadgeVariant[inv.status]}>
                        {dictionary.statuses[inv.status]}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {initialInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">
                      {dictionary.list.table.noInvoices}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Detail Panel */}
        {selectedInvoiceId && activeInvoice && (
          <div className="w-1/3 bg-surface-container-lowest border border-surface-variant rounded-xl flex flex-col hidden lg:flex sticky top-0 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto overflow-x-hidden">
            <div className="p-6 border-b border-surface-variant flex justify-between items-start bg-surface-bright">
              <div>
                <h3 className="text-[20px] leading-[28px] font-semibold text-primary font-mono tracking-tight" dir="ltr">
                  {activeInvoice.invoice_number || activeInvoice.id}
                </h3>
                <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1" dir="auto">
                  {activeInvoice.customer}
                </p>
              </div>
              <button
                onClick={() => setSelectedInvoiceId(null)}
                className="text-on-surface-variant hover:text-primary"
              >
                &times;
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex justify-between items-center bg-surface p-4 rounded-lg border border-outline-variant/50">
                <div>
                  <div className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1">
                    {dictionary.list.sidePanel.amountDue}
                  </div>
                  <div className="text-[24px] font-bold text-primary" dir="ltr">
                    {activeInvoice.balance_due ?? 0} SAR
                  </div>
                </div>
                <div className="w-16 h-16 border border-outline-variant bg-white rounded flex items-center justify-center flex-col text-center">
                  <Receipt size={24} className="text-outline mb-1" />
                  <span className="text-[8px] font-bold text-outline uppercase">{dictionary.list.sidePanel.preview}</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  {dictionary.list.sidePanel.details}
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">{dictionary.list.table.issueDate}</div>
                    <div className="text-[14px] font-medium text-on-surface" dir="ltr">{activeInvoice.date}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">{dictionary.list.sidePanel.dueDate}</div>
                    <div className="text-[14px] font-medium text-on-surface" dir="ltr">{activeInvoice.dueDate}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">{dictionary.list.sidePanel.type}</div>
                    <div className="text-[14px] font-medium text-on-surface">
                      {activeInvoice.invoice_type
                        ? dictionary.invoiceTypes[activeInvoice.invoice_type]
                        : "—"}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">{dictionary.list.sidePanel.documentLabel}</div>
                    <div className="text-[14px] font-medium text-on-surface" dir="auto">{activeInvoice.document_label || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">{dictionary.list.sidePanel.status}</div>
                    <StatusBadge variant={invoiceStatusBadgeVariant[activeInvoice.status]}>
                      {dictionary.statuses[activeInvoice.status]}
                    </StatusBadge>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">{dictionary.list.sidePanel.quotationRef}</div>
                    {activeInvoice.relatedQuote ? (
                      <Link href={`/quotations/${activeInvoice.relatedQuote}`} className="text-[14px] font-medium text-primary hover:underline truncate block" title={activeInvoice.relatedQuoteNumber || activeInvoice.relatedQuote} dir="ltr">
                        {activeInvoice.relatedQuoteNumber || dictionary.list.sidePanel.quotationReferenceUnavailable}
                      </Link>
                    ) : (
                      <span className="text-[14px] font-medium text-on-surface-variant">-</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto p-6 border-t border-surface-variant bg-surface flex flex-col gap-3 rounded-b-xl">
              {activeInvoice.status === "draft" && (
                <IssueInvoiceAction invoiceId={activeInvoice.id} />
              )}
              <button
                type="button"
                onClick={() => window.open(`/invoices/${activeInvoice.id}/pdf`, "_blank", "noopener,noreferrer")}
                className="w-full flex justify-center items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface py-2 rounded-lg text-[14px] font-semibold hover:bg-surface-container-low transition-colors"
              >
                {dictionary.list.actions.viewPdf}
              </button>
              {canRecordPayment ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex justify-center items-center gap-2 bg-primary border border-primary text-on-primary py-2 rounded-lg text-[14px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  {dictionary.list.actions.recordPayment}
                </button>
              ) : (
                <button
                  disabled
                  title={
                    activeInvoice.status === "draft"
                      ? dictionary.list.tooltips.draftCannotBePaid
                      : dictionary.list.tooltips.invoiceUnavailableForPayment
                  }
                  className="w-full flex justify-center items-center gap-2 bg-surface-container-low border border-outline-variant text-on-surface-variant py-2 rounded-lg text-[14px] font-semibold cursor-not-allowed"
                >
                  {dictionary.list.actions.recordPayment}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {showPaymentModal && activeInvoice && (
        <RecordPaymentModal
          invoiceId={activeInvoice.id}
          invoiceNumber={activeInvoice.invoice_number || activeInvoice.id}
          balanceDue={activeInvoice.balance_due ?? 0}
          onClose={() => setShowPaymentModal(false)}
        />
      )}
    </div>
  );
}
