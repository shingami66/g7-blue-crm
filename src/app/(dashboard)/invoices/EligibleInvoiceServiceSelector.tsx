"use client";

import { useMemo, useState, type RefObject } from "react";
import { Search, ArrowLeft } from "lucide-react";
import PaginationFooter from "@/components/ui/PaginationFooter";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText } from "@/components/i18n/UiDateText";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServiceStatusLabel } from "@/lib/i18n/dictionaries/services";
import type { InvoicesDictionary } from "@/lib/i18n/dictionaries/invoices";
import type {
  EligibleInvoiceService,
  InvoiceChooserMode,
  InvoiceChooserLoadStatus,
} from "@/lib/invoices/eligible-service-selector";
import {
  getInvoiceSelectorResults,
  getInvoiceServiceHref,
  INVOICE_SELECTOR_ITEMS_PER_PAGE,
} from "@/lib/invoices/eligible-service-selector";

function formatCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) =>
    String(values[key] ?? ""),
  );
}

const STATUS_VARIANTS: Record<
  EligibleInvoiceService["status"],
  React.ComponentProps<typeof StatusBadge>["variant"]
> = {
  Inquiry: "inquiry",
  Quoted: "quoted",
  Approved: "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  Completed: "completed",
  Cancelled: "cancelled",
};

const DESKTOP_COLUMN_ORDER = {
  en: {
    service: "order-1",
    customer: "order-2",
    eventDate: "order-3",
    location: "order-4",
    status: "order-5",
    select: "order-6",
  },
  ar: {
    service: "order-6",
    customer: "order-5",
    eventDate: "order-4",
    location: "order-3",
    status: "order-2",
    select: "order-1",
  },
} as const;

type EligibleInvoiceServiceSelectorProps = {
  mode: InvoiceChooserMode;
  services: EligibleInvoiceService[];
  loadStatus: InvoiceChooserLoadStatus;
  dictionary: InvoicesDictionary;
  searchRef: RefObject<HTMLInputElement | null>;
  onBack: () => void;
};

export default function EligibleInvoiceServiceSelector({
  mode,
  services,
  loadStatus,
  dictionary,
  searchRef,
  onBack,
}: EligibleInvoiceServiceSelectorProps) {
  const { push } = useGlobalNavigationPending();
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const chooser = dictionary.list.invoiceChooser;
  const desktopColumnOrder = DESKTOP_COLUMN_ORDER[dictionary.locale];
  const selectAlignment = dictionary.locale === "ar" ? "text-start" : "text-end";
  const {
    eligibleServices,
    filteredServices,
    page,
    totalPages,
    paginatedServices,
  } = useMemo(
    () =>
      getInvoiceSelectorResults({
        services,
        mode,
        search,
        requestedPage: currentPage,
      }),
    [currentPage, mode, search, services],
  );

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function selectService(serviceId: string) {
    if (isNavigating) return;
    setIsNavigating(true);
    push(getInvoiceServiceHref(serviceId, mode), {
      label: chooser.navigating,
    });
  }

  const noEligibleCopy =
    mode === "deposit" ? chooser.noEligibleDeposit : chooser.noEligibleFinal;
  const noMatchCopy =
    mode === "deposit" ? chooser.noMatchingDeposit : chooser.noMatchingFinal;
  const statusCopy = isNavigating
    ? chooser.navigating
    : loadStatus === "loading"
      ? chooser.loading
    : loadStatus === "error"
      ? chooser.loadError
      : eligibleServices.length === 0
        ? noEligibleCopy
        : filteredServices.length === 0
          ? noMatchCopy
          : formatCopy(chooser.resultsCount, {
              count: filteredServices.length,
            });

  return (
    <>
      <p className="sr-only" role="status" aria-live="polite">
        {statusCopy}
      </p>
      <div className="flex items-center gap-3 border-b border-outline-variant bg-surface-bright/30 px-4 py-2.5 sm:px-6 shrink-0">
        <button
          type="button"
          onClick={onBack}
          disabled={isNavigating}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 text-xs font-semibold text-primary transition-colors hover:bg-primary-fixed/30 hover:border-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
        >
          <ArrowLeft size={16} className="shrink-0 rtl:rotate-180" aria-hidden="true" />
          <span>{chooser.back}</span>
        </button>
        <label className="sr-only" htmlFor="eligible-invoice-service-search">
          {chooser.searchPlaceholder}
        </label>
        <div className="relative min-w-0 flex-1">
          <Search
            size={16}
            aria-hidden="true"
            className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
          />
          <input
            ref={searchRef}
            id="eligible-invoice-service-search"
            type="search"
            value={search}
            onChange={(event) => handleSearchChange(event.target.value)}
            placeholder={chooser.searchPlaceholder}
            disabled={isNavigating || loadStatus === "loading"}
            className="h-9 w-full rounded-lg border border-outline-variant bg-surface py-1.5 pe-3 ps-9 text-xs sm:text-sm text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
        </div>
      </div>

      <div
        aria-busy={isNavigating}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6"
      >
        {loadStatus === "loading" ? (
          <p
            role="status"
            className="py-12 text-center text-xs sm:text-sm text-on-surface-variant"
          >
            {chooser.loading}
          </p>
        ) : loadStatus === "error" ? (
          <p
            role="alert"
            className="py-12 text-center text-xs sm:text-sm text-on-surface-variant"
          >
            {chooser.loadError}
          </p>
        ) : (
          <>
            {loadStatus === "partial" && (
              <p
                role="alert"
                className="mb-3 rounded-lg border border-outline-variant bg-surface px-4 py-2.5 text-xs text-on-surface-variant"
              >
                {chooser.partialWarning}
              </p>
            )}
            {eligibleServices.length === 0 ? (
              <p className="py-12 text-center text-xs sm:text-sm text-on-surface-variant">
                {noEligibleCopy}
              </p>
            ) : filteredServices.length === 0 ? (
              <p className="py-12 text-center text-xs sm:text-sm text-on-surface-variant">
                {noMatchCopy}
              </p>
            ) : (
              <div className="rounded-lg border border-outline-variant/60 bg-surface overflow-hidden divide-y divide-outline-variant/60">
                {/* Desktop Column Header */}
                <div dir="ltr" className="hidden grid-cols-12 gap-3 border-b border-outline-variant/60 bg-surface-bright/40 px-4 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70 md:grid">
                  <div className={`col-span-3 ${desktopColumnOrder.service}`}>Service / الخدمة</div>
                  <div className={`col-span-2 ${desktopColumnOrder.customer}`}>{chooser.customer}</div>
                  <div className={`col-span-2 ${desktopColumnOrder.eventDate}`}>{chooser.eventDate}</div>
                  <div className={`col-span-2 ${desktopColumnOrder.location}`}>{chooser.location}</div>
                  <div className={`col-span-1 ${desktopColumnOrder.status}`}>{dictionary.list.table.status}</div>
                  <div className={`col-span-2 ${desktopColumnOrder.select} min-w-[6.5rem] ${selectAlignment}`}>{chooser.select}</div>
                </div>

                {paginatedServices.map((service) => (
                  <div key={service.serviceId} className="group">
                    {/* Desktop Table-List Row */}
                    <div dir="ltr" className="hidden min-h-[58px] grid-cols-12 items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-surface-container-lowest/60 md:grid">
                      <div className={`col-span-3 ${desktopColumnOrder.service} min-w-0 pe-2`}>
                        <span dir="ltr" className="mb-0.5 block truncate font-mono text-xs font-semibold text-primary">
                          {isolateBidiText(service.serviceNumber)}
                        </span>
                        <span dir="auto" className="inline-block max-w-full align-top" title={service.serviceTitle}>
                          <span className="block line-clamp-2 text-xs font-semibold leading-snug text-on-surface">
                            {service.serviceTitle}
                          </span>
                        </span>
                      </div>
                      <div className={`col-span-2 ${desktopColumnOrder.customer} min-w-0`}>
                        <span dir="auto" className="inline-block max-w-full truncate align-top text-xs text-on-surface-variant" title={service.customerDisplay || "—"}>
                          {service.customerDisplay || "—"}
                        </span>
                      </div>
                      <div className={`col-span-2 ${desktopColumnOrder.eventDate} min-w-0`}>
                        {service.eventStartDate ? (
                          <span dir="ltr" className="block truncate text-xs text-on-surface-variant">
                            <UiDateText locale={dictionary.locale} value={service.eventStartDate} />
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant/50">—</span>
                        )}
                      </div>
                      <div className={`col-span-2 ${desktopColumnOrder.location} min-w-0`}>
                        <span dir="auto" className="inline-block max-w-full truncate align-top text-xs text-on-surface-variant" title={service.eventLocation || "—"}>
                          {service.eventLocation || "—"}
                        </span>
                      </div>
                      <div className={`col-span-1 ${desktopColumnOrder.status} min-w-0`}>
                        <StatusBadge variant={STATUS_VARIANTS[service.status]}>
                          {getServiceStatusLabel(dictionary.locale, service.status)}
                        </StatusBadge>
                      </div>
                      <div className={`col-span-2 ${desktopColumnOrder.select} min-w-[6.5rem] ${selectAlignment}`}>
                        <button
                          type="button"
                          onClick={() => selectService(service.serviceId)}
                          disabled={isNavigating}
                          aria-busy={isNavigating}
                          className="inline-flex min-h-8 min-w-[5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:bg-primary-fixed/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {isNavigating ? chooser.navigating : chooser.select}
                        </button>
                      </div>
                    </div>

                    {/* Mobile Stacked Record Row */}
                    <div className="flex flex-col gap-2 p-3 text-start hover:bg-surface-container-lowest/60 transition-colors md:hidden">
                      <div className="flex items-center justify-between gap-2">
                        <span
                          dir="ltr"
                          className="font-mono text-xs font-semibold text-primary"
                        >
                          {isolateBidiText(service.serviceNumber)}
                        </span>
                        <StatusBadge variant={STATUS_VARIANTS[service.status]}>
                          {getServiceStatusLabel(dictionary.locale, service.status)}
                        </StatusBadge>
                      </div>
                      <p className="text-xs font-semibold leading-snug text-on-surface sm:text-sm" title={service.serviceTitle}>
                        <span dir="auto" className="inline-block max-w-full align-top">
                          {service.serviceTitle}
                        </span>
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                        {service.customerDisplay && (
                          <span className="inline-block max-w-[160px] truncate align-top" title={service.customerDisplay}>
                            <span className="text-on-surface-variant/70 me-1 font-medium">{chooser.customer}:</span>
                            <span dir="auto">{service.customerDisplay}</span>
                          </span>
                        )}
                        {service.eventStartDate && (
                          <span className="shrink-0" dir="ltr">
                            <span className="text-on-surface-variant/70 me-1 font-medium" dir="auto">{chooser.eventDate}:</span>
                            <UiDateText locale={dictionary.locale} value={service.eventStartDate} />
                          </span>
                        )}
                        {service.eventLocation && (
                          <span className="inline-block max-w-[130px] truncate align-top" title={service.eventLocation}>
                            <span className="text-on-surface-variant/70 me-1 font-medium">{chooser.location}:</span>
                            <span dir="auto">{service.eventLocation}</span>
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => selectService(service.serviceId)}
                          disabled={isNavigating}
                          aria-busy={isNavigating}
                          className="inline-flex min-h-8 min-w-[5rem] items-center justify-center whitespace-nowrap rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:bg-primary-fixed/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                        >
                          {isNavigating ? chooser.navigating : chooser.select}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface px-4 py-2.5 sm:px-6 text-xs text-on-surface-variant shrink-0">
        <div>
          {loadStatus !== "loading" && loadStatus !== "error" && eligibleServices.length > 0 && (
            <span className="font-medium text-on-surface-variant">
              {formatCopy(chooser.resultsCount, { count: filteredServices.length })}
            </span>
          )}
        </div>
        {loadStatus !== "loading" &&
          loadStatus !== "error" &&
          filteredServices.length > INVOICE_SELECTOR_ITEMS_PER_PAGE && (
            <PaginationFooter
              currentPage={page}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              className="border-0 p-0 bg-transparent shadow-none rounded-none"
            />
          )}
      </div>
    </>
  );
}
