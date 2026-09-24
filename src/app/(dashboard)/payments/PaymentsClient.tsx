"use client";

import { useRef, useEffect, useState, type ComponentProps } from "react";
import Link from "next/link";
import { Banknote, CheckCircle2, Clock, Search } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/components/ui/data-table-contract";
import StatusBadge from "@/components/ui/StatusBadge";
import KpiCard from "@/components/ui/KpiCard";
import PaginationFooter from "@/components/ui/PaginationFooter";
import ModuleSearchInput from "@/components/ui/ModuleSearchInput";
import type { PaymentListItem, PaymentStatus, PaymentsListQuery, PaymentsListResult, PaymentsListPagination } from "@/lib/payments/types";
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  type PaymentsDictionary,
} from "@/lib/i18n/dictionaries/payments";
import { UiBidiText, UiLtrText, UiMoneyText, UiNumberText } from "@/components/i18n/UiValueText";
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
      >
        <Link
          href="/payments/receipts"
          className="rounded-lg border border-outline-variant px-3 py-2 text-[13px] font-semibold text-on-surface hover:bg-surface-container-low"
        >
          {dictionary.receiptsLink}
        </Link>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KpiCard
          label={dictionary.stats.confirmedCollected}
          value={<UiMoneyText locale={locale} value={stats.confirmedTotal} />}
          icon={CheckCircle2}
        />
        <KpiCard
          label={dictionary.stats.paymentRecords}
          value={<UiNumberText locale={locale} value={stats.paymentCount} />}
          icon={Banknote}
        />
        <KpiCard
          label={dictionary.stats.pendingPayments}
          value={<UiNumberText locale={locale} value={stats.pendingCount} />}
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
          {/* Desktop Table View (>= md) */}
          <div ref={scrollRef} className="hidden md:block w-full overflow-x-auto">
            <div className="min-w-[980px]">
              <DataTable
              columns={[
                { key: "payment", header: dictionary.table.payment, align: "start", kind: "identifier" },
                { key: "date", header: dictionary.table.date, align: "center", kind: "date" },
                { key: "customer", header: dictionary.table.customer, align: "start", kind: "text" },
                { key: "invoice", header: dictionary.table.invoice, align: "start", kind: "identifier" },
                { key: "service", header: dictionary.table.service, align: "start", kind: "text" },
                { key: "method", header: dictionary.table.method, align: "start", kind: "text" },
                { key: "reference", header: dictionary.table.reference, align: "start", kind: "text" },
                { key: "amount", header: dictionary.table.amount, align: "end", kind: "money" },
                { key: "status", header: dictionary.table.status, align: "center", kind: "status" },
              ] satisfies DataTableColumn[]}
            >
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-surface-container-low/50 transition-colors">
                  <td className="px-4 py-4 font-mono font-semibold text-primary whitespace-nowrap">
                    <UiLtrText>{payment.paymentNumber}</UiLtrText>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    <UiDateText locale={locale} value={payment.date} />
                  </td>
                  <td className="px-4 py-4 font-medium text-on-surface max-w-[180px] truncate" title={payment.customerName}>
                    <UiBidiText>{payment.customerName}</UiBidiText>
                  </td>
                  <td className="px-4 py-4 font-mono text-[12px] text-primary whitespace-nowrap">
                    <UiLtrText>{payment.invoiceNumber ?? "—"}</UiLtrText>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant max-w-[200px] whitespace-normal break-words" title={payment.serviceLabel ?? undefined}>
                    <UiBidiText>{payment.serviceLabel ?? "—"}</UiBidiText>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    {getPaymentMethodLabel(locale, payment.method)}
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant max-w-[150px] truncate" title={payment.reference ?? undefined}>
                    <UiBidiText>{payment.reference ?? "—"}</UiBidiText>
                  </td>
                  <td className="px-4 py-4 font-semibold text-on-surface tabular-nums whitespace-nowrap">
                    <UiMoneyText locale={locale} value={payment.amount} />
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

          {/* Mobile Cards View (< md) */}
          <div className="block md:hidden divide-y divide-surface-variant" data-testid="mobile-payment-cards">
            {payments.length === 0 ? (
              <div className="p-8 text-center text-on-surface-variant">
                {error
                  ? dictionary.states.paymentDataUnavailable
                  : query.search
                    ? dictionary.states.noFilteredPayments
                    : dictionary.table.empty}
              </div>
            ) : (
              payments.map((payment) => (
                <div key={payment.id} className="p-4 space-y-3 transition-colors hover:bg-surface-container-low/40">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-mono font-semibold text-primary">
                        <UiLtrText>{payment.paymentNumber}</UiLtrText>
                      </div>
                      <div className="mt-0.5 text-[12px] text-on-surface-variant">
                        <UiDateText locale={locale} value={payment.date} />
                      </div>
                    </div>
                    <div className="shrink-0">
                      <StatusBadge variant={getPaymentStatusBadgeVariant(payment.status)}>
                        {getPaymentStatusLabel(locale, payment.status)}
                      </StatusBadge>
                    </div>
                  </div>

                  <div className="space-y-1 text-[13px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-on-surface-variant">{dictionary.table.customer}:</span>
                      <span className="font-medium text-on-surface text-end break-words">
                        <UiBidiText>{payment.customerName}</UiBidiText>
                      </span>
                    </div>
                    {payment.invoiceNumber && (
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-on-surface-variant">{dictionary.table.invoice}:</span>
                        <span className="font-mono text-[12px] text-primary">
                          <UiLtrText>{payment.invoiceNumber}</UiLtrText>
                        </span>
                      </div>
                    )}
                    {payment.serviceLabel && (
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-on-surface-variant">{dictionary.table.service}:</span>
                        <span className="text-on-surface text-end break-words">
                          <UiBidiText>{payment.serviceLabel}</UiBidiText>
                        </span>
                      </div>
                    )}
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-on-surface-variant">{dictionary.table.method}:</span>
                      <span className="text-on-surface text-end">
                        {getPaymentMethodLabel(locale, payment.method)}
                      </span>
                    </div>
                    {payment.reference && (
                      <div className="flex items-baseline justify-between gap-2">
                        <span className="text-on-surface-variant">{dictionary.table.reference}:</span>
                        <span className="text-on-surface text-end truncate max-w-[200px]" title={payment.reference}>
                          <UiBidiText>{payment.reference}</UiBidiText>
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center justify-between border-t border-outline-variant/60 pt-2">
                    <span className="text-[12px] text-on-surface-variant">{dictionary.table.amount}</span>
                    <span className="font-semibold text-on-surface"><UiMoneyText locale={locale} value={payment.amount} /></span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
