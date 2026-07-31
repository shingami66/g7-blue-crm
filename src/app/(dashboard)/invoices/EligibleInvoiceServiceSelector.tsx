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
                <div className="hidden md:grid grid-cols-12 gap-3 px-4 py-2 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70 border-b border-outline-variant/60 bg-surface-bright/40 text-start">
                  <div className="col-span-4">{chooser.customer ? chooser.customer.replace(/.*/, "Service / الخدمة") : "Service"}</div>
                  <div className="col-span-2">{chooser.customer}</div>
                  <div className="col-span-2">{chooser.eventDate}</div>
                  <div className="col-span-2">{chooser.location}</div>
                  <div className="col-span-1">{dictionary.list.table.status}</div>
                  <div className="col-span-1 text-end">{chooser.select}</div>
                </div>

                {paginatedServices.map((service) => (
                  <div key={service.serviceId} className="group">
                    {/* Desktop Table-List Row */}
                    <div className="hidden md:grid grid-cols-12 gap-3 items-center min-h-[58px] py-2.5 px-4 text-start hover:bg-surface-container-lowest/60 transition-colors">
                      <div className="col-span-4 min-w-0 pr-2">
                        <span
                          dir="ltr"
                          className="font-mono text-xs font-semibold text-primary block truncate mb-0.5"
                        >
                          {isolateBidiText(service.serviceNumber)}
                        </span>
                        <span
                          className="block text-xs font-semibold text-on-surface line-clamp-2 leading-snug"
                          dir="auto"
                          title={service.serviceTitle}
                        >
                          {service.serviceTitle}
                        </span>
                      </div>
                      <div className="col-span-2 min-w-0">
                        <span
                          className="block text-xs text-on-surface-variant truncate"
                          dir="auto"
                          title={service.customerDisplay || "—"}
                        >
                          {service.customerDisplay || "—"}
                        </span>
                      </div>
                      <div className="col-span-2 min-w-0">
                        {service.eventStartDate ? (
                          <span className="block text-xs text-on-surface-variant truncate" dir="ltr">
                            <UiDateText locale={dictionary.locale} value={service.eventStartDate} />
                          </span>
                        ) : (
                          <span className="text-xs text-on-surface-variant/50">—</span>
                        )}
                      </div>
                      <div className="col-span-2 min-w-0">
                        <span
                          className="block text-xs text-on-surface-variant truncate"
                          dir="auto"
                          title={service.eventLocation || "—"}
                        >
                          {service.eventLocation || "—"}
                        </span>
                      </div>
                      <div className="col-span-1 min-w-0">
                        <StatusBadge variant={STATUS_VARIANTS[service.status]}>
                          {getServiceStatusLabel(dictionary.locale, service.status)}
                        </StatusBadge>
                      </div>
                      <div className="col-span-1 min-w-0 text-end">
                        <button
                          type="button"
                          onClick={() => selectService(service.serviceId)}
                          disabled={isNavigating}
                          aria-busy={isNavigating}
                          className="inline-flex h-8 shrink-0 items-center justify-center rounded-md border border-outline-variant bg-surface px-3 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:bg-primary-fixed/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
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
                      <p
                        className="text-xs sm:text-sm font-semibold text-on-surface leading-snug"
                        dir="auto"
                        title={service.serviceTitle}
                      >
                        {service.serviceTitle}
                      </p>
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                        {service.customerDisplay && (
                          <span className="truncate max-w-[160px]" dir="auto" title={service.customerDisplay}>
                            <span className="text-on-surface-variant/70 me-1 font-medium">{chooser.customer}:</span>
                            {service.customerDisplay}
                          </span>
                        )}
                        {service.eventStartDate && (
                          <span className="shrink-0" dir="ltr">
                            <span className="text-on-surface-variant/70 me-1 font-medium" dir="auto">{chooser.eventDate}:</span>
                            <UiDateText locale={dictionary.locale} value={service.eventStartDate} />
                          </span>
                        )}
                        {service.eventLocation && (
                          <span className="truncate max-w-[130px]" dir="auto" title={service.eventLocation}>
                            <span className="text-on-surface-variant/70 me-1 font-medium">{chooser.location}:</span>
                            {service.eventLocation}
                          </span>
                        )}
                      </div>
                      <div className="mt-1 flex justify-end">
                        <button
                          type="button"
                          onClick={() => selectService(service.serviceId)}
                          disabled={isNavigating}
                          aria-busy={isNavigating}
                          className="inline-flex h-8 items-center justify-center rounded-md border border-outline-variant bg-surface px-3 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:bg-primary-fixed/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
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
