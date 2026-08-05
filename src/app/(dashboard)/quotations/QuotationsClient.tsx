"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Filter, Eye, Trash2, Edit, AlertCircle, Printer } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import ModuleSearchControl from "@/components/ui/ModuleSearchControl";
import DenseTableIconAction from "@/components/ui/DenseTableIconAction";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import { ListInlineError } from "@/components/ui/ListPendingState";
import { useListNavigation } from "@/components/ui/useListNavigation";
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
import type {
  QuotationListItem,
  QuotationListQuery,
  QuotationListPagination,
  QuotationSearchMode,
} from "@/lib/quotations/types";
import type { EligibleQuotationService } from "@/lib/services/queries";
import { softDeleteQuotation } from "@/lib/quotations/actions";
import { getCommonDictionary, getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { LIST_PAGE_SIZES, type ListPageSize } from "@/lib/pagination";
import EligibleServiceSelector from "./EligibleServiceSelector";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import { cleanBusinessYearParam, getCurrentBusinessYear } from "@/lib/business-year";

interface QuotationsClientProps {
  quotations: QuotationListItem[];
  pagination: QuotationListPagination;
  query: QuotationListQuery;
  loadError?: "quotations_load_failed";
  canWrite: boolean;
  canSelectService: boolean;
  eligibleServices: EligibleQuotationService[];
  dictionary?: QuotationsDictionary;
}

type StatusBadgeVariant = React.ComponentProps<typeof StatusBadge>["variant"];

function formatCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

function quotationListHref(query: QuotationListQuery, page = 1) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  const year = cleanBusinessYearParam(query.year ?? getCurrentBusinessYear());
  if (year) params.set("year", year);
  if (query.pageSize && query.pageSize !== LIST_PAGE_SIZES[0]) params.set("pageSize", String(query.pageSize));
  const search = sanitizeSearchTerm(query.search ?? "");
  if (query.searchMode && search) {
    params.set("searchMode", query.searchMode);
    params.set("search", search);
  }
  if (query.status) params.set("status", query.status);
  if (query.month) params.set("month", query.month);
  const encoded = params.toString();
  return encoded ? `/quotations?${encoded}` : "/quotations";
}

export default function QuotationsClient({
  quotations,
  pagination,
  query,
  loadError,
  canWrite,
  canSelectService,
  eligibleServices,
  dictionary: dictionaryProp,
}: QuotationsClientProps) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = dictionaryProp ?? getQuotationsDictionary(locale);
  const { push } = useGlobalNavigationPending();
  const [error, setError] = useState<string | null>(null);
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const selectorTriggerRef = useRef<HTMLButtonElement>(null);
  const activeMode = query.searchMode;
  const stateKey = `${activeMode ?? ""}|${query.search ?? ""}|${query.status ?? ""}|${query.month ?? ""}|${pagination.page}|${pagination.pageSize}|${loadError ?? ""}`;
  const { isPending, isSearchPending, navigate, refresh } = useListNavigation(stateKey);
  const common = getCommonDictionary(dictionary.locale);
  const sharedStates = getSharedUiStates(dictionary.locale);

  const searchModes = [
    {
      value: "quotationNumber",
      label: dictionary.list.searchModes.quotationNumber,
      placeholder: dictionary.list.searchPlaceholders.quotationNumber,
    },
    {
      value: "customer",
      label: dictionary.list.searchModes.customer,
      placeholder: dictionary.list.searchPlaceholders.customer,
    },
    {
      value: "service",
      label: dictionary.list.searchModes.service,
      placeholder: dictionary.list.searchPlaceholders.service,
    },
  ] as const;

  function updateQuery(next: Partial<QuotationListQuery>, kind: "navigation" | "search" = "navigation") {
    navigate(quotationListHref({ ...query, ...next }, 1), "replace", kind);
  }

  async function handleDelete(event: React.MouseEvent, id: string) {
    event.stopPropagation();
    setError(null);
    if (!window.confirm(dictionary.list.deleteConfirm)) return;

    const result = await softDeleteQuotation(id);
    if (!result.success) setError(dictionary.list.deleteFailed);
    else router.refresh();
  }

  const visibleStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const visibleEnd = Math.min(visibleStart + quotations.length - 1, pagination.total);
  const returnTo = quotationListHref(query, pagination.page);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle}>
        {canSelectService && (
          <button
            ref={selectorTriggerRef}
            type="button"
            onClick={() => setIsSelectorOpen(true)}
            aria-haspopup="dialog"
            aria-expanded={isSelectorOpen}
            className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold leading-[20px] text-on-primary transition-colors hover:bg-primary-container"
          >
            <Plus size={18} />
            {dictionary.list.selectService}
          </button>
        )}
      </PageHeader>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-busy={isPending || undefined}>
        <FilterBar>
          <ModuleSearchControl
            mode={activeMode}
            modes={searchModes}
            query={query.search ?? ""}
            modeLabel={dictionary.list.searchModeLabel}
            submitLabel={common.labels.search}
            pendingLabel={common.states.searching}
            clearLabel={common.actions.clear}
            isPending={isPending}
            isSearchPending={isSearchPending}
            selectModeLabel={common.labels.select}
            disabledPlaceholder={common.labels.searchTypeFirst}
            onSubmit={(mode, search) => updateQuery({ searchMode: mode as QuotationSearchMode, search: search || undefined }, "search")}
            onModeChange={(mode) => { if (!mode) updateQuery({ searchMode: undefined, search: undefined }); }}
          />
          <div className="relative shrink-0">
            <select
              value={query.status ?? "all"}
              disabled={isPending}
              onChange={(event) => updateQuery({ status: event.target.value === "all" ? undefined : event.target.value as QuotationListQuery["status"] })}
              aria-label={dictionary.list.allStatuses}
              className="appearance-none rounded-lg border border-outline-variant bg-surface py-2 ps-3 pe-8 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              <option value="all">{dictionary.list.allStatuses}</option>
              <option value="draft">{dictionary.statuses.draft}</option>
              <option value="sent">{dictionary.statuses.sent}</option>
              <option value="approved">{dictionary.statuses.approved}</option>
              <option value="rejected">{dictionary.statuses.rejected}</option>
            </select>
            <Filter size={14} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>
          <div className="relative shrink-0">
            <label className="sr-only" htmlFor="quotation-month-filter">{dictionary.list.dateFilter.label}</label>
            <input
              id="quotation-month-filter"
              type="month"
              value={query.month ?? ""}
              disabled={isPending}
              onChange={(event) => updateQuery({ month: event.target.value || undefined })}
              aria-label={dictionary.list.dateFilter.label}
              className={`rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 ${query.month ? "" : "text-transparent"}`}
            />
            {!query.month && <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 start-3 flex items-center pe-6 text-[14px] text-on-surface-variant">{dictionary.list.dateFilter.anyMonth}</span>}
          </div>
          <div className="ms-auto shrink-0 text-[14px] leading-[20px] text-on-surface-variant">
            {pagination.total === 0
              ? dictionary.list.showingZero
              : formatCopy(dictionary.list.showingRange, { start: visibleStart, end: visibleEnd, count: pagination.total })}
          </div>
        </FilterBar>
        {error && (
          <div className="mx-4 mt-4 flex items-center gap-2 rounded-lg bg-error-container p-3 text-[14px] text-on-error-container" role="alert">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="relative min-h-0 flex-1 overflow-auto">
          {loadError ? (
            <ListInlineError message={dictionary.states.quotationsLoadError} retryLabel={sharedStates.retry.tryAgain} onRetry={refresh} pending={isPending} />
          ) : quotations.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center text-on-surface-variant">
              <p>{pagination.total === 0 && !query.search && !query.status && !query.month ? dictionary.list.noQuotations : dictionary.list.noFilteredQuotations}</p>
            </div>
          ) : (
            <DataTable centeredColumns={[5]} columns={[dictionary.list.table.quotationNumber, dictionary.list.table.clientEvent, dictionary.list.table.issueDate, dictionary.list.table.amountSar, dictionary.list.table.status, dictionary.list.table.printPdf, dictionary.list.table.actions]}>
              {quotations.map((quotation) => (
                <tr key={quotation.id} className="transition-colors hover:bg-surface-container-low/50">
                  <td className="px-4 py-4 font-mono font-semibold text-primary">
                    <span dir="ltr" className="inline-block whitespace-nowrap">{isolateBidiText(quotation.quotationNumber)}</span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-on-surface"><span dir="auto">{quotation.customer?.company || dictionary.list.unknownCompany}</span></div>
                    <div className="mt-1 text-[12px] leading-[16px] text-on-surface-variant"><span dir="auto">{quotation.event}</span></div>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant"><UiDateText locale={dictionary.locale} value={quotation.date} /></td>
                  <td className="px-4 py-4 font-semibold text-on-surface tabular-nums"><span dir="ltr" className="inline-block whitespace-nowrap">{formatSarAmount(dictionary.locale, quotation.grandTotal)}</span></td>
                  <td className="px-4 py-4"><StatusBadge variant={quotation.status as StatusBadgeVariant}>{getQuotationStatusLabel(dictionary.locale, quotation.status)}</StatusBadge></td>
                  <td className="w-[72px] px-4 py-4 text-center"><div className="grid place-items-center"><DenseTableIconAction label={dictionary.list.table.printPdf} onClick={() => window.open(`/quotations/${quotation.id}/pdf`, "_blank", "noopener,noreferrer")}><Printer size={16} aria-hidden="true" /></DenseTableIconAction></div></td>
                  <td className="px-4 py-4">
                    <div className="flex gap-2">
                      <button type="button" className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed focus:outline-none focus:ring-2 focus:ring-primary/40" aria-label={`${dictionary.list.actionTitles.viewDetails} ${quotation.quotationNumber}`} title={dictionary.list.actionTitles.viewDetails} onClick={() => push(`/quotations/${quotation.id}?returnTo=${encodeURIComponent(returnTo)}`)}><Eye size={17} /></button>
                      {canWrite && (
                        <>
                          {quotation.status === "draft" ? (
                            <button type="button" className="rounded p-1 text-primary transition-colors hover:text-primary-container focus:outline-none focus:ring-2 focus:ring-primary/40" title={dictionary.list.actionTitles.editQuotation} aria-label={`${dictionary.list.actionTitles.editQuotation} ${quotation.quotationNumber}`} onClick={() => push(`/quotations/${quotation.id}/edit`)}><Edit size={18} /></button>
                          ) : (
                            <button type="button" disabled className="cursor-not-allowed rounded p-1 text-on-surface-variant opacity-50" title={dictionary.list.actionTitles.onlyDraftEditable} aria-label={dictionary.list.actionTitles.onlyDraftEditable}><Edit size={18} /></button>
                          )}
                          <button type="button" disabled={quotation.status === "approved"} className={`rounded p-1 transition-colors focus:outline-none focus:ring-2 focus:ring-primary/40 ${quotation.status === "approved" ? "cursor-not-allowed text-on-surface-variant opacity-50" : "text-on-surface-variant hover:bg-error-container hover:text-error"}`} title={quotation.status === "approved" ? dictionary.list.actionTitles.approvedCannotDelete : dictionary.list.actionTitles.deleteQuotation} aria-label={`${dictionary.list.actionTitles.deleteQuotation} ${quotation.quotationNumber}`} onClick={(event) => { if (quotation.status !== "approved") void handleDelete(event, quotation.id); }}>{<Trash2 size={18} />}</button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        <PaginationFooter
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          paginationMode="bounded"
          isPending={isPending}
          onPageChange={(page) => navigate(quotationListHref(query, page), "push")}
          onPageSizeChange={(pageSize: ListPageSize) => updateQuery({ pageSize })}
          className="border-t-0"
        />
      </div>

      {canSelectService && isSelectorOpen && <EligibleServiceSelector services={eligibleServices} dictionary={dictionary} triggerRef={selectorTriggerRef} onClose={() => setIsSelectorOpen(false)} />}
    </div>
  );
}
