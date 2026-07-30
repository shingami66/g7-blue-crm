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
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl sm:max-h-[calc(100dvh-2rem)]"
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

        <div className="border-b border-outline-variant px-4 py-3 sm:px-6">
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
              className="w-full rounded-lg border border-outline-variant bg-surface px-3 py-3 ps-10 text-[14px] text-on-surface outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
          {services.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-on-surface-variant">
              {dictionary.list.selector.noEligibleServices}
            </p>
          ) : filteredServices.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-on-surface-variant">
              {dictionary.list.selector.noSearchResults}
            </p>
          ) : (
            <div className="space-y-3">
              {paginatedServices.map((service) => (
                <div
                  key={service.id}
                  className="flex flex-col gap-4 rounded-xl border border-outline-variant bg-surface p-4 text-start sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span dir="ltr" className="font-mono text-sm font-semibold text-primary">
                        {isolateBidiText(service.serviceNumber)}
                      </span>
                      <StatusBadge variant={STATUS_VARIANTS[service.status] ?? "pending"}>
                        {getServiceStatusLabel(dictionary.locale, service.status)}
                      </StatusBadge>
                    </div>
                    <p className="font-semibold text-on-surface" dir="auto">
                      {service.serviceTitle}
                    </p>
                    <dl className="grid gap-x-4 gap-y-2 text-[13px] text-on-surface-variant sm:grid-cols-2">
                      <div>
                        <dt className="font-medium text-on-surface">{dictionary.list.selector.customer}</dt>
                        <dd dir="auto">{service.customer?.company || dictionary.list.unknownCompany}</dd>
                      </div>
                      {service.eventStartDate && (
                        <div>
                          <dt className="font-medium text-on-surface">{dictionary.list.selector.eventDate}</dt>
                          <dd dir="ltr"><UiDateText locale={dictionary.locale} value={service.eventStartDate} /></dd>
                        </div>
                      )}
                      {service.eventName && (
                        <div>
                          <dt className="font-medium text-on-surface">{dictionary.form.quotationEventLabel}</dt>
                          <dd dir="auto">{service.eventName}</dd>
                        </div>
                      )}
                      {service.eventLocation && (
                        <div>
                          <dt className="font-medium text-on-surface">{dictionary.list.selector.location}</dt>
                          <dd dir="auto">{service.eventLocation}</dd>
                        </div>
                      )}
                    </dl>
                  </div>
                  <button
                    type="button"
                    onClick={() => selectService(service.id)}
                    disabled={isNavigating}
                    className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isNavigating ? dictionary.list.selector.navigationPending : dictionary.list.selector.chooseService}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {filteredServices.length > ITEMS_PER_PAGE && (
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="rounded-none border-x-0 border-b-0"
          />
        )}
      </div>
    </div>
  );
}
