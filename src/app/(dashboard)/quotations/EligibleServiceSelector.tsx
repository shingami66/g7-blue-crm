"use client";

import { useEffect, useId, useMemo, useRef, useState, type RefObject } from "react";
import { Search, X } from "lucide-react";
import PaginationFooter from "@/components/ui/PaginationFooter";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText } from "@/components/i18n/UiDateText";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServiceStatusLabel } from "@/lib/i18n/dictionaries/services";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import type { EligibleQuotationService } from "@/lib/services/queries";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";

const ITEMS_PER_PAGE = 10;

const STATUS_VARIANTS: Record<string, React.ComponentProps<typeof StatusBadge>["variant"]> = {
  Inquiry: "inquiry",
  Quoted: "quoted",
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

function normalizeSearchText(value: string | null | undefined) {
  return (value ?? "").normalize("NFKD").toLocaleLowerCase();
}

function matchesSearch(service: EligibleQuotationService, search: string) {
  const haystack = [
    service.serviceNumber,
    service.serviceTitle,
    service.customer?.company,
    service.customer?.contact,
    service.eventName,
    service.eventStartDate,
    service.eventLocation,
  ]
    .map(normalizeSearchText)
    .join(" ");

  return haystack.includes(search);
}

function formatCopy(template: string, values: Record<string, string | number>) {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));
}

interface EligibleServiceSelectorProps {
  services: EligibleQuotationService[];
  dictionary: QuotationsDictionary;
  triggerRef: RefObject<HTMLButtonElement | null>;
  onClose: () => void;
}

export default function EligibleServiceSelector({
  services,
  dictionary,
  triggerRef,
  onClose,
}: EligibleServiceSelectorProps) {
  const { push } = useGlobalNavigationPending();
  const dialogRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [isNavigating, setIsNavigating] = useState(false);
  const titleId = useId();
  const descriptionId = useId();
  const normalizedSearch = normalizeSearchText(search.trim());
  const desktopColumnOrder = DESKTOP_COLUMN_ORDER[dictionary.locale];
  const selectAlignment = dictionary.locale === "ar" ? "text-start" : "text-end";

  const filteredServices = useMemo(
    () => services.filter((service) => matchesSearch(service, normalizedSearch)),
    [normalizedSearch, services]
  );
  const totalPages = Math.max(1, Math.ceil(filteredServices.length / ITEMS_PER_PAGE));
  const paginatedServices = filteredServices.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    const opener = triggerRef.current;
    searchRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !isNavigating) {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== "Tab") return;
      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      opener?.focus();
    };
  }, [isNavigating, onClose, triggerRef]);

  function handleSearchChange(value: string) {
    setSearch(value);
    setCurrentPage(1);
  }

  function selectService(serviceId: string) {
    if (isNavigating) return;
    setIsNavigating(true);
    push(`/quotations/new?serviceId=${encodeURIComponent(serviceId)}`, {
      label: dictionary.list.selector.navigationPending,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-3 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl sm:max-h-[calc(100dvh-2rem)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant px-4 py-4 sm:px-6">
          <div className="text-start">
            <h2 id={titleId} className="text-base font-semibold text-on-surface">
              {dictionary.list.selector.title}
            </h2>
            <p id={descriptionId} className="mt-1 text-[13px] text-on-surface-variant">
              {dictionary.list.selector.description}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isNavigating}
            aria-label={dictionary.list.selector.close}
            className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-lg text-on-surface-variant hover:bg-surface-container disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <div className="border-b border-outline-variant bg-surface-bright/30 px-4 py-2.5 sm:px-6">
          <label className="sr-only" htmlFor="eligible-service-search">
            {dictionary.list.selector.searchPlaceholder}
          </label>
          <div className="relative">
            <Search
              size={18}
              aria-hidden="true"
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
            />
            <input
              ref={searchRef}
              id="eligible-service-search"
              type="search"
              value={search}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={dictionary.list.selector.searchPlaceholder}
              disabled={isNavigating}
              className="h-9 w-full rounded-lg border border-outline-variant bg-surface py-1.5 pe-3 ps-10 text-xs text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 sm:text-sm"
            />
          </div>
        </div>

        <div
          aria-busy={isNavigating}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-6"
        >
          {services.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-on-surface-variant">
              {dictionary.list.selector.noEligibleServices}
            </p>
          ) : filteredServices.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-on-surface-variant">
              {dictionary.list.selector.noSearchResults}
            </p>
          ) : (
            <div className="overflow-hidden rounded-lg border border-outline-variant/60 bg-surface divide-y divide-outline-variant/60">
              <div dir="ltr" className="hidden grid-cols-12 gap-3 border-b border-outline-variant/60 bg-surface-bright/40 px-4 py-2 text-start text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant/70 md:grid">
                <div className={`col-span-3 ${desktopColumnOrder.service}`}>{dictionary.list.selector.service}</div>
                <div className={`col-span-2 ${desktopColumnOrder.customer}`}>{dictionary.list.selector.customer}</div>
                <div className={`col-span-2 ${desktopColumnOrder.eventDate}`}>{dictionary.list.selector.eventDate}</div>
                <div className={`col-span-2 ${desktopColumnOrder.location}`}>{dictionary.list.selector.location}</div>
                <div className={`col-span-1 ${desktopColumnOrder.status}`}>{dictionary.list.table.status}</div>
                <div className={`col-span-2 ${desktopColumnOrder.select} min-w-[6.5rem] ${selectAlignment}`}>{dictionary.list.selector.select}</div>
              </div>

              {paginatedServices.map((service) => (
                <div key={service.id} className="group">
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
                      <span dir="auto" className="inline-block max-w-full truncate align-top text-xs text-on-surface-variant" title={service.customer?.company || dictionary.list.unknownCompany}>
                        {service.customer?.company || dictionary.list.unknownCompany}
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
                      <StatusBadge variant={STATUS_VARIANTS[service.status] ?? "pending"}>
                        {getServiceStatusLabel(dictionary.locale, service.status)}
                      </StatusBadge>
                    </div>
                    <div className={`col-span-2 ${desktopColumnOrder.select} min-w-[6.5rem] ${selectAlignment}`}>
                      <button
                        type="button"
                        onClick={() => selectService(service.id)}
                        disabled={isNavigating}
                        aria-busy={isNavigating}
                        className="inline-flex min-h-8 min-w-[5rem] shrink-0 items-center justify-center whitespace-nowrap rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:bg-primary-fixed/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {isNavigating ? dictionary.list.selector.navigationPending : dictionary.list.selector.select}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 p-3 text-start transition-colors hover:bg-surface-container-lowest/60 md:hidden">
                    <div className="flex items-center justify-between gap-2">
                      <span dir="ltr" className="font-mono text-xs font-semibold text-primary">
                        {isolateBidiText(service.serviceNumber)}
                      </span>
                      <StatusBadge variant={STATUS_VARIANTS[service.status] ?? "pending"}>
                        {getServiceStatusLabel(dictionary.locale, service.status)}
                      </StatusBadge>
                    </div>
                    <p className="text-xs font-semibold leading-snug text-on-surface sm:text-sm" title={service.serviceTitle}>
                      <span dir="auto" className="inline-block max-w-full align-top">
                        {service.serviceTitle}
                      </span>
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-on-surface-variant">
                      <span className="inline-block max-w-[160px] truncate align-top" dir="auto" title={service.customer?.company || dictionary.list.unknownCompany}>
                        <span className="me-1 font-medium text-on-surface-variant/70">{dictionary.list.selector.customer}:</span>
                        {service.customer?.company || dictionary.list.unknownCompany}
                      </span>
                      {service.eventName && (
                        <span className="inline-block max-w-[160px] truncate align-top" dir="auto" title={service.eventName}>
                          <span className="me-1 font-medium text-on-surface-variant/70">{dictionary.form.quotationEventLabel}:</span>
                          <span dir="auto">{service.eventName}</span>
                        </span>
                      )}
                      {service.eventStartDate && (
                        <span className="shrink-0" dir="ltr">
                          <span className="me-1 font-medium text-on-surface-variant/70" dir="auto">{dictionary.list.selector.eventDate}:</span>
                          <UiDateText locale={dictionary.locale} value={service.eventStartDate} />
                        </span>
                      )}
                      {service.eventLocation && (
                        <span className="inline-block max-w-[130px] truncate align-top" dir="auto" title={service.eventLocation}>
                          <span className="me-1 font-medium text-on-surface-variant/70">{dictionary.list.selector.location}:</span>
                          {service.eventLocation}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => selectService(service.id)}
                        disabled={isNavigating}
                        aria-busy={isNavigating}
                        className="inline-flex min-h-8 min-w-[5rem] items-center justify-center whitespace-nowrap rounded-md border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface transition-colors hover:border-primary hover:bg-primary-fixed/30 hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-primary"
                      >
                        {isNavigating ? dictionary.list.selector.navigationPending : dictionary.list.selector.select}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {services.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant bg-surface px-4 py-2.5 text-xs text-on-surface-variant sm:px-6">
            <div>
              <span className="font-medium text-on-surface-variant">
                {formatCopy(dictionary.list.selector.resultsCount, {
                  count: filteredServices.length,
                })}
              </span>
            </div>
            {filteredServices.length > ITEMS_PER_PAGE && (
              <PaginationFooter
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                className="border-0 bg-transparent p-0 shadow-none rounded-none"
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
