"use client";

import { useEffect, useRef, useState } from "react";
import { Plus, Filter, Eye, Printer, LoaderCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import PageHeader from "@/components/ui/PageHeader";
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
  canSelectService,
  eligibleServices,
  dictionary: dictionaryProp,
}: QuotationsClientProps) {
  const locale = useLocale();
  const dictionary = dictionaryProp ?? getQuotationsDictionary(locale);
  const { isPending: isNavigationPending, push } = useGlobalNavigationPending();
  const [isSelectorOpen, setIsSelectorOpen] = useState(false);
  const [pendingDocumentId, setPendingDocumentId] = useState<string | null>(null);
  const selectorTriggerRef = useRef<HTMLButtonElement>(null);
  const documentTimerRef = useRef<number | null>(null);
  const activeMode = query.searchMode;
  const stateKey = `${activeMode ?? ""}|${query.search ?? ""}|${query.status ?? ""}|${query.month ?? ""}|${pagination.page}|${pagination.pageSize}|${loadError ?? ""}`;
  const { isPending, isSearchPending, navigate, refresh } = useListNavigation(stateKey);
  const common = getCommonDictionary(dictionary.locale);
  const sharedStates = getSharedUiStates(dictionary.locale);

  useEffect(() => {
    return () => {
      if (documentTimerRef.current !== null) window.clearTimeout(documentTimerRef.current);
    };
  }, []);

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

  function openQuotationPdf(quotation: Pick<QuotationListItem, "id">) {
    if (pendingDocumentId) return;
    setPendingDocumentId(quotation.id);
    const preview = window.open(`/quotations/${quotation.id}/pdf`, "_blank", "noopener,noreferrer");
    if (!preview) {
      setPendingDocumentId(null);
      return;
    }
    documentTimerRef.current = window.setTimeout(() => {
      setPendingDocumentId((current) => (current === quotation.id ? null : current));
    }, 800);
  }

  const returnTo = quotationListHref(query, pagination.page);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle}>
        {canSelectService && (
          <Button asChild size="sm">
            <button
              ref={selectorTriggerRef}
              type="button"
              onClick={() => setIsSelectorOpen(true)}
              aria-haspopup="dialog"
              aria-expanded={isSelectorOpen}
            >
              <Plus size={16} />
              {dictionary.list.selectService}
            </button>
          </Button>
        )}
      </PageHeader>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-busy={isPending || undefined}>
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-variant bg-surface-bright p-4">
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
        />

        <div className="relative min-h-0 flex-1 overflow-auto">
          {loadError ? (
            <ListInlineError message={dictionary.states.quotationsLoadError} retryLabel={sharedStates.retry.tryAgain} onRetry={refresh} pending={isPending} />
          ) : quotations.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center text-on-surface-variant">
              <p>{pagination.total === 0 && !query.search && !query.status && !query.month ? dictionary.list.noQuotations : dictionary.list.noFilteredQuotations}</p>
            </div>
          ) : (
            <div className="w-full overflow-x-auto border border-surface-variant rounded-b-xl bg-surface-container-lowest">
              <table className="w-full min-w-[1100px] table-fixed border-collapse text-start">
                <colgroup>
                  <col className="w-[18%]" />
                  <col className="w-[26%]" />
                  <col className="w-[14%]" />
                  <col className="w-[15%]" />
                  <col className="w-[11%]" />
                  <col className="w-[7%]" />
                  <col className="w-[9%]" />
                </colgroup>
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className="px-4 py-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase text-start">{dictionary.list.table.quotationNumber}</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase text-start">{dictionary.list.table.clientEvent}</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase text-start">{dictionary.list.table.issueDate}</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase text-end">{dictionary.list.table.amountSar}</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase text-start">{dictionary.list.table.status}</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase text-center">{dictionary.list.table.view}</th>
                    <th className="px-4 py-3 text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase text-center">{dictionary.list.table.printPdf}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
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
                  <td className="px-4 py-4 text-end font-semibold text-on-surface tabular-nums"><span dir="ltr" className="inline-block whitespace-nowrap">{formatSarAmount(dictionary.locale, quotation.grandTotal)}</span></td>
                  <td className="px-4 py-4"><StatusBadge variant={quotation.status as StatusBadgeVariant}>{getQuotationStatusLabel(dictionary.locale, quotation.status)}</StatusBadge></td>
                  <td className="px-4 py-4 text-center"><button type="button" disabled={isNavigationPending} aria-busy={isNavigationPending || undefined} className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50" aria-label={`${dictionary.list.actionTitles.viewDetails} ${quotation.quotationNumber}`} title={dictionary.list.actionTitles.viewDetails} onClick={() => push(`/quotations/${quotation.id}?returnTo=${encodeURIComponent(returnTo)}`)}><Eye size={17} /></button></td>
                  <td className="px-4 py-4 text-center"><div className="grid place-items-center"><DenseTableIconAction label={dictionary.list.table.printPdf} disabled={pendingDocumentId !== null} aria-busy={pendingDocumentId === quotation.id || undefined} onClick={() => openQuotationPdf(quotation)}>{pendingDocumentId === quotation.id ? <LoaderCircle size={16} aria-hidden="true" className="motion-safe:animate-spin" /> : <Printer size={16} aria-hidden="true" />}</DenseTableIconAction></div></td>
                </tr>
              ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {canSelectService && isSelectorOpen && <EligibleServiceSelector services={eligibleServices} dictionary={dictionary} triggerRef={selectorTriggerRef} onClose={() => setIsSelectorOpen(false)} />}
    </div>
  );
}
