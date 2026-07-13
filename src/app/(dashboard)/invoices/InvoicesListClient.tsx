"use client";

import PageHeader from "@/components/ui/PageHeader";
import PaginationFooter from "@/components/ui/PaginationFooter";
import StatusBadge from "@/components/ui/StatusBadge";
import {
  Download,
  Filter,
  Eye,
  Printer,
  Search,
} from "lucide-react";
import { useState } from "react";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  getInvoiceDocumentLabelDisplay,
  getInvoiceStatusLabel,
  getInvoiceTypeLabel,
  type InvoicesDictionary,
} from "@/lib/i18n/dictionaries/invoices";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import PendingLink from "@/components/ui/PendingLink";

const invoiceStatusBadgeVariant = {
  draft: "draft",
  sent: "sent",
  paid: "approved",
  partial: "pending",
  overdue: "overdue",
  cancelled: "rejected",
  voided: "rejected",
} as const satisfies Record<
  InvoiceStatus,
  "draft" | "sent" | "approved" | "pending" | "overdue" | "rejected"
>;

interface InvoicesListClientProps {
  initialInvoices: Invoice[];
  dictionary: InvoicesDictionary;
}

const formatCopy = (template: string, values: Record<string, string | number>) =>
  template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

export default function InvoicesListClient({
  initialInvoices,
  dictionary,
}: InvoicesListClientProps) {
  const locale = dictionary.locale;
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const normalizedSearch = searchQuery.trim().toLowerCase();

  const filteredInvoices = initialInvoices.filter((invoice) => {
    const matchesStatus =
      statusFilter === "all"
        ? true
        : invoice.status === statusFilter;

    const matchesSearch =
      normalizedSearch === ""
        ? true
        : [invoice.invoice_number, invoice.customer]
            .filter((value): value is string => Boolean(value))
            .some((value) => value.toLowerCase().includes(normalizedSearch));

    return matchesStatus && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredInvoices.length / itemsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredInvoices.length);
  const paginatedInvoices = filteredInvoices.slice(startIndex, startIndex + itemsPerPage);

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

      <div className="flex flex-1 gap-6 min-h-0">
        <div
          className="flex-1 flex flex-col bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden"
        >
          <div className="p-4 border-b border-surface-variant flex flex-wrap gap-3 items-center bg-surface-bright">
            <div className="relative w-full min-w-0 flex-1 max-w-sm sm:min-w-[220px]">
              <Search
                size={14}
                className="absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => {
                  setSearchQuery(event.target.value);
                  setCurrentPage(1);
                }}
                placeholder={dictionary.list.filters.searchPlaceholder}
                className="w-full min-w-0 bg-surface border border-outline-variant rounded-lg ps-9 pe-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-surface border border-outline-variant rounded-lg ps-3 pe-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">{dictionary.list.filters.allStatuses}</option>
                <option value="paid">{dictionary.list.filters.paid}</option>
                <option value="overdue">{dictionary.list.filters.overdue}</option>
                <option value="draft">{dictionary.statuses.draft}</option>
                <option value="sent">{dictionary.statuses.sent}</option>
                <option value="partial">{dictionary.statuses.partial}</option>
                <option value="cancelled">{dictionary.statuses.cancelled}</option>
                <option value="voided">{dictionary.statuses.voided}</option>
              </select>
              <Filter
                size={14}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
              {filteredInvoices.length === 0
                ? dictionary.list.summary.showingZero
                : formatCopy(dictionary.list.summary.showingRange, {
                    start: startIndex + 1,
                    end: endIndex,
                    count: filteredInvoices.length,
                  })}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-variant">
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
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    {dictionary.list.table.preview}
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    {dictionary.list.table.printPdf}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px]">
                {paginatedInvoices.map((inv) => (
                  <tr
                    key={inv.id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-4 py-4 font-mono font-semibold text-primary">
                      <span dir="ltr" className="inline-block whitespace-nowrap">
                        {isolateBidiText(inv.invoice_number || inv.id)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-on-surface">
                      {inv.invoice_type
                        ? getInvoiceTypeLabel(locale, inv.invoice_type)
                        : "—"}
                    </td>
                    <td className="px-4 py-4 text-on-surface">
                      <span dir="auto">
                        {getInvoiceDocumentLabelDisplay(locale, inv.document_label)}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-medium text-on-surface">
                      <span dir="auto">{inv.customer}</span>
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">
                      <UiDateText locale={locale} value={inv.issued_at ?? inv.created_at} />
                    </td>
                    <td className="px-4 py-4 font-semibold text-on-surface text-right tabular-nums">
                      <span dir="ltr" className="inline-block whitespace-nowrap">
                        {formatSarAmount(locale, inv.grand_total)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge variant={invoiceStatusBadgeVariant[inv.status]}>
                        {getInvoiceStatusLabel(dictionary.locale, inv.status)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4">
                      <PendingLink
                        href={`/invoices/${inv.id}`}
                        aria-label={`${dictionary.list.table.preview} ${inv.invoice_number || inv.id}`}
                        title={`${dictionary.list.table.preview} ${inv.invoice_number || inv.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-[12px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <Eye size={14} />
                        {dictionary.list.table.preview}
                      </PendingLink>
                    </td>
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={() => window.open(`/invoices/${inv.id}/pdf`, "_blank", "noopener,noreferrer")}
                        aria-label={`${dictionary.list.table.printPdf} ${inv.invoice_number || inv.id}`}
                        title={`${dictionary.list.table.printPdf} ${inv.invoice_number || inv.id}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-[12px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                      >
                        <Printer size={14} />
                        {dictionary.list.table.printPdf}
                      </button>
                    </td>
                  </tr>
                ))}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                      {initialInvoices.length === 0
                        ? dictionary.list.table.noInvoices
                        : dictionary.list.table.noFilteredInvoices}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {filteredInvoices.length > itemsPerPage && (
            <PaginationFooter
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
        </div>
      </div>
    </div>
  );
}
