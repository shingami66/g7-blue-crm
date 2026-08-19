"use client";

import { useRef, useEffect, useState, type ComponentProps } from "react";
import { Banknote, CheckCircle2, Clock, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import KpiCard from "@/components/ui/KpiCard";
import PaginationFooter from "@/components/ui/PaginationFooter";
import ModuleSearchInput from "@/components/ui/ModuleSearchInput";
import type { PaymentListItem, PaymentStatus, PaymentsListQuery, PaymentsListResult, PaymentsListPagination } from "@/lib/payments/types";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  type PaymentsDictionary,
} from "@/lib/i18n/dictionaries/payments";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import { useListNavigation } from "@/components/ui/useListNavigation";
import { cleanBusinessYearParam, getCurrentBusinessYear } from "@/lib/business-year";
import { LIST_PAGE_SIZES } from "@/lib/pagination";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import { getCommonDictionary } from "@/lib/i18n/dictionaries/common";

type PaymentsClientProps = {
  payments: PaymentListItem[];
  pagination: PaymentsListPagination;
  query: PaymentsListQuery;
  error?: PaymentsListResult["error"];
  dictionary: PaymentsDictionary;
};

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const getPaymentStatusBadgeVariant = (
  status: PaymentStatus,
): StatusBadgeVariant => {
  if (status === "failed" || status === "refunded") {
    return "rejected";
  }

  return status;
};

function buildPaymentStats(payments: PaymentListItem[]) {
  const confirmedPayments = payments.filter((payment) => payment.status === "confirmed");
  const confirmedTotal = confirmedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingCount = payments.filter((payment) => payment.status === "pending").length;

  return {
    confirmedTotal,
    paymentCount: payments.length,
    pendingCount,
  };
}

function paymentListHref(query: PaymentsListQuery, page = 1) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  const year = cleanBusinessYearParam(query.year ?? getCurrentBusinessYear());
  if (year) params.set("year", year);
  if (query.pageSize && query.pageSize !== LIST_PAGE_SIZES[0]) params.set("pageSize", String(query.pageSize));
  const search = sanitizeSearchTerm(query.search ?? "");
  if (search) params.set("search", search);
  const encoded = params.toString();
  return encoded ? `/payments?${encoded}` : "/payments";
}

export default function PaymentsClient({ payments, pagination, query, error, dictionary }: PaymentsClientProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const submittedSearch = query.search ?? "";
  const [draftSearch, setDraftSearch] = useState(submittedSearch);
  const lastSubmittedSearch = useRef(submittedSearch);
  const searchComposing = useRef(false);
  const stateKey = `${submittedSearch}|${pagination.page}|${pagination.pageSize}|${error ?? ""}`;
  const { isPending, isSearchPending, navigate } = useListNavigation(stateKey);

  useEffect(() => {
    if (lastSubmittedSearch.current === submittedSearch) return;
    lastSubmittedSearch.current = submittedSearch;
    setDraftSearch(submittedSearch);
  }, [submittedSearch]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [pagination.page]);

  function submitSearch(rawSearch = draftSearch) {
    const search = sanitizeSearchTerm(rawSearch);
    lastSubmittedSearch.current = search;
    setDraftSearch(search);
    navigate(paymentListHref({ ...query, search: search || undefined }, 1), "replace", "search");
  }

  function handleClear() {
    lastSubmittedSearch.current = "";
    setDraftSearch("");
    if (submittedSearch) {
      navigate(paymentListHref({ ...query, search: undefined }, 1), "replace", "search");
    }
  }

  const locale = dictionary.locale;
  const common = getCommonDictionary(locale);
  const stats = buildPaymentStats(payments);
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={dictionary.title}
        subtitle={dictionary.subtitle}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KpiCard
          label={dictionary.stats.confirmedCollected}
          value={formatSarAmount(locale, stats.confirmedTotal)}
          icon={CheckCircle2}
        />
        <KpiCard
          label={dictionary.stats.paymentRecords}
          value={formatUiNumber(locale, stats.paymentCount)}
          icon={Banknote}
        />
        <KpiCard
          label={dictionary.stats.pendingPayments}
          value={formatUiNumber(locale, stats.pendingCount)}
          icon={Clock}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-[14px] font-medium text-on-error-container">
          {dictionary.states.inlineError}
        </div>
      )}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
        <div className="flex flex-wrap items-center gap-3 border-b border-surface-variant bg-surface-bright p-4">
          <form
            className="flex w-full max-w-sm min-w-0 flex-1 items-center gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (!searchComposing.current) submitSearch();
            }}
            aria-busy={isSearchPending || undefined}
          >
            <ModuleSearchInput
              value={draftSearch}
              onChange={(value) => setDraftSearch(value)}
              onClear={handleClear}
              placeholder={dictionary.searchPlaceholder}
              ariaLabel={dictionary.searchPlaceholder}
              clearLabel={common.actions.clear}
              disabled={isPending}
              className="min-w-0 flex-1"
            />
            <button
              type="submit"
              disabled={isPending}
              aria-busy={isSearchPending || undefined}
              aria-label={isSearchPending ? common.states.searching : common.labels.search}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search size={14} aria-hidden="true" />
              <span className={isSearchPending ? "" : "hidden sm:inline"}>
                {isSearchPending ? common.states.searching : common.labels.search}
              </span>
            </button>
          </form>
          {isSearchPending && <span className="text-[12px] text-on-surface-variant">{common.states.searching}</span>}
        </div>

        <PaginationFooter
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          paginationMode="bounded"
          isPending={isPending}
          onPageChange={(page) => navigate(paymentListHref(query, page), "push")}
          onPageSizeChange={(pageSize) => navigate(paymentListHref({ ...query, pageSize }, 1), "replace")}
        />
        <div className="flex-1 overflow-auto min-h-0 overflow-y-auto overflow-x-hidden">
          <div ref={scrollRef} className="w-full overflow-x-auto">
            <div className="min-w-[980px]">
              <DataTable
              columns={[
                dictionary.table.payment,
                dictionary.table.date,
                dictionary.table.customer,
                dictionary.table.invoice,
                dictionary.table.service,
                dictionary.table.method,
                dictionary.table.reference,
                dictionary.table.amount,
                dictionary.table.status,
              ]}
            >
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-4 font-mono font-semibold text-primary whitespace-nowrap">
                    <span dir="ltr">{isolateBidiText(payment.paymentNumber)}</span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    <UiDateText locale={locale} value={payment.date} />
                  </td>
                  <td className="px-4 py-4 font-medium text-on-surface max-w-[180px] truncate" title={payment.customerName}>
                    <span dir="auto">{payment.customerName}</span>
                  </td>
                  <td className="px-4 py-4 font-mono text-[12px] text-primary whitespace-nowrap">
                    <span dir="ltr">
                      {isolateBidiText(payment.invoiceNumber ?? payment.invoiceId)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant max-w-[200px] whitespace-normal break-words" title={payment.serviceLabel ?? undefined}>
                    <span dir="auto">{payment.serviceLabel ?? "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    {getPaymentMethodLabel(locale, payment.method)}
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant max-w-[150px] truncate" title={payment.reference ?? undefined}>
                    <span dir="auto">{payment.reference ?? "—"}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-on-surface tabular-nums whitespace-nowrap">
                    <span dir="ltr" className="inline-block whitespace-nowrap">
                      {formatSarAmount(locale, payment.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <StatusBadge variant={getPaymentStatusBadgeVariant(payment.status)}>
                      {getPaymentStatusLabel(locale, payment.status)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                    {error
                      ? dictionary.states.paymentDataUnavailable
                      : query.search
                        ? dictionary.states.noFilteredPayments
                        : dictionary.table.empty}
                  </td>
                </tr>
              )}
            </DataTable>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
