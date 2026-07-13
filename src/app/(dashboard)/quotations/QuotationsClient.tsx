"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import { Plus, Filter, FileSearch, Trash2, Edit, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  getQuotationStatusLabel,
  getQuotationsDictionary,
  type QuotationsDictionary,
} from "@/lib/i18n/dictionaries/quotations";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import type { QuotationListItem } from "@/lib/quotations/types";
import { softDeleteQuotation } from "@/lib/quotations/actions";

interface QuotationsClientProps {
  quotations: QuotationListItem[];
  canWrite: boolean;
  dictionary?: QuotationsDictionary;
}

type StatusBadgeVariant = React.ComponentProps<typeof StatusBadge>["variant"];

function formatCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

export default function QuotationsClient({
  quotations,
  canWrite,
  dictionary: dictionaryProp,
}: QuotationsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = dictionaryProp ?? getQuotationsDictionary(locale);
  const { push } = useGlobalNavigationPending();
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("");
  const itemsPerPage = 10;

  const handleStatusFilterChange = (value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleMonthFilterChange = (value: string) => {
    setMonthFilter(value);
    setCurrentPage(1);
  };

  const filteredQuotations = quotations.filter((quotation) => {
    const matchesStatus =
      statusFilter === "all" ? true : quotation.status === statusFilter;
    const matchesMonth =
      monthFilter === "" ? true : String(quotation.date).startsWith(monthFilter);

    return matchesStatus && matchesMonth;
  });

  const totalPages = Math.max(1, Math.ceil(filteredQuotations.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredQuotations.length);
  const paginatedQuotations = filteredQuotations.slice(
    startIndex,
    startIndex + itemsPerPage
  );

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setError(null);

    const confirmed = window.confirm(dictionary.list.deleteConfirm);
    if (!confirmed) return;

    const result = await softDeleteQuotation(id);
    if (!result.success) {
      setError(dictionary.list.deleteFailed);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={dictionary.list.title}
        subtitle={dictionary.list.subtitle}
      >
        {canWrite && (
          <Link 
            href="/services"
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors"
          >
            <Plus size={18} />
            {dictionary.list.selectService}
          </Link>
        )}
      </PageHeader>

      <div className="flex-1 flex flex-col min-h-0">
        <FilterBar>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilterChange(e.target.value)}
              className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="all">{dictionary.list.allStatuses}</option>
              <option value="draft">{dictionary.statuses.draft}</option>
              <option value="sent">{dictionary.statuses.sent}</option>
              <option value="approved">{dictionary.statuses.approved}</option>
              <option value="rejected">{dictionary.statuses.rejected}</option>
            </select>
            <Filter
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>
          <div className="relative">
            <input
              type="month"
              value={monthFilter}
              onChange={(e) => handleMonthFilterChange(e.target.value)}
              className="appearance-none bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
            {filteredQuotations.length === 0
              ? dictionary.list.showingZero
              : formatCopy(dictionary.list.showingRange, {
                  start: startIndex + 1,
                  end: endIndex,
                  count: filteredQuotations.length,
                })}
          </div>
        </FilterBar>

        {error && (
          <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-error-container text-on-error-container rounded-lg text-[14px]">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {filteredQuotations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant">
              <p>
                {quotations.length === 0
                  ? dictionary.list.noQuotations
                  : dictionary.list.noFilteredQuotations}
              </p>
            </div>
          ) : (
            <DataTable
              columns={[
                dictionary.list.table.quotationNumber,
                dictionary.list.table.clientEvent,
                dictionary.list.table.issueDate,
                dictionary.list.table.amountSar,
                dictionary.list.table.status,
                dictionary.list.table.actions,
              ]}
            >
              {paginatedQuotations.map((q) => (
                <tr
                  key={q.id}
                  className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  onClick={() => push(`/quotations/${q.id}`)}
                >
                  <td className="px-4 py-4 font-mono font-semibold text-primary">
                    <span dir="ltr" className="inline-block whitespace-nowrap">
                      {isolateBidiText(q.quotationNumber)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-on-surface">
                      <span dir="auto">
                        {q.customer?.company || dictionary.list.unknownCompany}
                      </span>
                    </div>
                    <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                      <span dir="auto">{q.event}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">
                    <UiDateText locale={dictionary.locale} value={q.date} />
                  </td>
                  <td className="px-4 py-4 font-semibold text-on-surface tabular-nums">
                    <span dir="ltr" className="inline-block whitespace-nowrap">
                      {formatSarAmount(dictionary.locale, q.grandTotal)}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge variant={q.status as StatusBadgeVariant}>
                      {getQuotationStatusLabel(dictionary.locale, q.status)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button
                        className="text-primary hover:text-primary-container p-1 rounded transition-colors"
                        title={dictionary.list.actionTitles.viewDetails}
                        onClick={(e) => {
                          e.stopPropagation();
                          push(`/quotations/${q.id}`);
                        }}
                      >
                        <FileSearch size={18} />
                      </button>
                      
                      {canWrite && (
                        <>
                          {q.status === "draft" ? (
                            <button
                              className="text-primary hover:text-primary-container p-1 rounded transition-colors"
                              title={dictionary.list.actionTitles.editQuotation}
                              onClick={(e) => {
                                e.stopPropagation();
                                push(`/quotations/${q.id}/edit`);
                              }}
                            >
                              <Edit size={18} />
                            </button>
                          ) : (
                            <button
                              className="text-on-surface-variant opacity-50 p-1 rounded cursor-not-allowed"
                              title={dictionary.list.actionTitles.onlyDraftEditable}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Edit size={18} />
                            </button>
                          )}

                          <button
                            className={`p-1 rounded transition-colors ${
                              q.status === "approved"
                                ? "text-on-surface-variant opacity-50 cursor-not-allowed"
                                : "text-on-surface-variant hover:text-error hover:bg-error-container"
                            }`}
                            title={
                              q.status === "approved"
                                ? dictionary.list.actionTitles.approvedCannotDelete
                                : dictionary.list.actionTitles.deleteQuotation
                            }
                            onClick={(e) => {
                              if (q.status !== "approved") {
                                handleDelete(e, q.id);
                              } else {
                                e.stopPropagation();
                              }
                            }}
                            disabled={q.status === "approved"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredQuotations.length > itemsPerPage && (
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="border-t-0"
          />
        )}
      </div>
    </div>
  );
}
