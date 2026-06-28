"use client";

import PageHeader from "@/components/ui/PageHeader";
import KpiCard from "@/components/ui/KpiCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { Filter, Download, Receipt, FileText, CheckCircle2 } from "lucide-react";
import { useMemo, useState } from "react";
import Link from "next/link";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
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

const statusLabel: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Issued",
  paid: "Paid",
  partial: "Partial",
  overdue: "Overdue",
  cancelled: "Cancelled",
  voided: "Voided",
};

interface InvoicesListClientProps {
  initialInvoices: Invoice[];
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
  `SAR ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

export default function InvoicesListClient({ initialInvoices }: InvoicesListClientProps) {
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
        title="Invoices"
        subtitle="Manage billing documents and payment tracking."
      >
        <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Download size={18} />
          Export
        </button>
        <div className="flex items-center text-[13px] text-on-surface-variant max-w-[240px] text-right leading-tight hidden sm:block">
          Invoices are created from approved quotations or service billing actions.
        </div>
      </PageHeader>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-6">
        <KpiCard
          label="Total Outstanding"
          value={formatSar(invoiceStats.totalOutstanding)}
          trend="flat"
          trendLabel={`${invoiceStats.openInvoices} open invoices`}
          icon={Receipt}
        />
        <KpiCard
          label="Open Invoices"
          value={invoiceStats.openInvoices.toString()}
          trend="flat"
          trendLabel="Based on live balances"
          icon={FileText}
        />
        <KpiCard
          label="Total Collected"
          value={formatSar(invoiceStats.totalCollected)}
          trend="flat"
          trendLabel="Collected on recorded invoices"
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
                <option>All Statuses</option>
                <option>Paid</option>
                <option>Unpaid</option>
                <option>Overdue</option>
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
                    Invoice
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Type
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Document
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Client
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Issue Date
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right">
                    Amount (SAR)
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Status
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
                    <td className="px-4 py-4 font-mono font-semibold text-primary">
                      {inv.invoice_number || inv.id}
                    </td>
                    <td className="px-4 py-4 text-on-surface capitalize">
                      {inv.invoice_type || "—"}
                    </td>
                    <td className="px-4 py-4 text-on-surface">
                      {inv.document_label || "—"}
                    </td>
                    <td className="px-4 py-4 font-medium text-on-surface">
                      {inv.customer}
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">
                      {inv.date}
                    </td>
                    <td className="px-4 py-4 font-semibold text-on-surface text-right">
                      {inv.amount}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge variant={invoiceStatusBadgeVariant[inv.status]}>
                        {statusLabel[inv.status]}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {initialInvoices.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-on-surface-variant">
                      No invoices found.
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
                <h3 className="text-[20px] leading-[28px] font-semibold text-primary font-mono tracking-tight">
                  {activeInvoice.invoice_number || activeInvoice.id}
                </h3>
                <p className="text-[14px] leading-[20px] text-on-surface-variant mt-1">
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
                    Amount Due
                  </div>
                  <div className="text-[24px] font-bold text-primary">
                    {activeInvoice.balance_due ?? 0} SAR
                  </div>
                </div>
                <div className="w-16 h-16 border border-outline-variant bg-white rounded flex items-center justify-center flex-col text-center">
                  <Receipt size={24} className="text-outline mb-1" />
                  <span className="text-[8px] font-bold text-outline uppercase">Preview</span>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider">
                  Details
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">Issue Date</div>
                    <div className="text-[14px] font-medium text-on-surface">{activeInvoice.date}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">Due Date</div>
                    <div className="text-[14px] font-medium text-on-surface">{activeInvoice.dueDate}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">Type</div>
                    <div className="text-[14px] font-medium text-on-surface capitalize">{activeInvoice.invoice_type || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">Document Label</div>
                    <div className="text-[14px] font-medium text-on-surface">{activeInvoice.document_label || "—"}</div>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">Status</div>
                    <StatusBadge variant={invoiceStatusBadgeVariant[activeInvoice.status]}>
                      {statusLabel[activeInvoice.status]}
                    </StatusBadge>
                  </div>
                  <div>
                    <div className="text-[12px] text-on-surface-variant mb-1">Quotation ID</div>
                    {activeInvoice.relatedQuote ? (
                      <Link href={`/quotations/${activeInvoice.relatedQuote}`} className="text-[14px] font-medium text-primary hover:underline truncate block" title={activeInvoice.relatedQuote}>
                        {activeInvoice.relatedQuote}
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
                View PDF
              </button>
              {canRecordPayment ? (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="w-full flex justify-center items-center gap-2 bg-primary border border-primary text-on-primary py-2 rounded-lg text-[14px] font-semibold hover:bg-primary/90 transition-colors"
                >
                  Record Payment
                </button>
              ) : (
                <button
                  disabled
                  title={activeInvoice.status === "draft" ? "Draft invoices cannot be paid." : "Invoice is fully paid or unavailable."}
                  className="w-full flex justify-center items-center gap-2 bg-surface-container-low border border-outline-variant text-on-surface-variant py-2 rounded-lg text-[14px] font-semibold cursor-not-allowed"
                >
                  Record Payment
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
