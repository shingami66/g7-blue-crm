"use client";

import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import Button from "@/components/ui/Button";
import PendingLink from "@/components/ui/PendingLink";
import ModuleSearchControl from "@/components/ui/ModuleSearchControl";
import { ListInlineError } from "@/components/ui/ListPendingState";
import { useListNavigation } from "@/components/ui/useListNavigation";
import { Eye, Filter, Plus } from "lucide-react";
import { getServiceStatusLabel, type ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import { getCommonDictionary, getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { LIST_PAGE_SIZES, type ListPageSize } from "@/lib/pagination";
import type { Service } from "@/types/service";
import type { ServiceListPagination, ServiceListQuery, ServiceSearchMode } from "@/lib/services/types";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import { cleanBusinessYearParam, getCurrentBusinessYear } from "@/lib/business-year";

const STATUS_VARIANT_MAP: Record<string, string> = {
  Inquiry: "inquiry",
  Quoted: "quoted",
  Approved: "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  Completed: "completed",
  Cancelled: "cancelled",
};

const TABLE_HEADER_BASE = "px-4 py-3 text-[12px] font-semibold uppercase text-on-surface-variant";
const TABLE_CELL_BASE = "px-4 py-4 align-top";
const COLUMN_LAYOUT = {
  serviceNumber: "w-[16%] min-w-[160px] text-start",
  serviceTitle: "w-[26%] min-w-[240px] text-start",
  customer: "w-[18%] min-w-[180px] text-start",
  eventDate: "w-[12%] min-w-[130px] text-center",
  status: "w-[12%] min-w-[120px] text-center",
  budget: "w-[10%] min-w-[140px] text-end",
  view: "w-[6%] min-w-[110px] text-center",
} as const;

function serviceListHref(query: ServiceListQuery, page = 1) {
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
  const encoded = params.toString();
  return encoded ? `/services?${encoded}` : "/services";
}

export default function ServicesClient({
  services,
  pagination,
  query,
  loadError,
  canWrite,
  dictionary,
}: {
  services: Service[];
  pagination: ServiceListPagination;
  query: ServiceListQuery;
  loadError?: "services_load_failed";
  canWrite: boolean;
  dictionary: ServicesDictionary;
}) {
  const activeMode = query.searchMode;
  const stateKey = `${activeMode ?? ""}|${query.search ?? ""}|${query.status ?? ""}|${pagination.page}|${pagination.pageSize}|${loadError ?? ""}`;
  const { isPending, isSearchPending, navigate, refresh } = useListNavigation(stateKey);
  const common = getCommonDictionary(dictionary.locale);
  const sharedStates = getSharedUiStates(dictionary.locale);
  const returnTo = serviceListHref(query, pagination.page);
  const searchModes = [
    { value: "serviceNumber", label: dictionary.list.searchModes.serviceNumber, placeholder: dictionary.list.searchPlaceholders.serviceNumber },
    { value: "serviceName", label: dictionary.list.searchModes.serviceName, placeholder: dictionary.list.searchPlaceholders.serviceName },
    { value: "customer", label: dictionary.list.searchModes.customer, placeholder: dictionary.list.searchPlaceholders.customer },
  ] as const;

  function updateQuery(next: Partial<ServiceListQuery>, kind: "navigation" | "search" = "navigation") {
    navigate(serviceListHref({ ...query, ...next }, 1), "replace", kind);
  }

  function formatServicesSummary() {
    if (pagination.total === 0) return dictionary.list.showingZero;
    return dictionary.list.showingRange
      .replace("{start}", isolateBidiText(String((pagination.page - 1) * pagination.pageSize + 1)))
      .replace("{end}", isolateBidiText(String((pagination.page - 1) * pagination.pageSize + services.length)))
      .replace("{total}", isolateBidiText(String(pagination.total)));
  }

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle}>
        {canWrite && <Button asChild><PendingLink href="/services/new"><Plus size={18} />{dictionary.list.newService}</PendingLink></Button>}
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
            onSubmit={(mode, search) => updateQuery({ searchMode: mode as ServiceSearchMode, search: search || undefined }, "search")}
            onModeChange={(mode) => { if (!mode) updateQuery({ searchMode: undefined, search: undefined }); }}
          />
          <div className="relative shrink-0">
            <select value={query.status ?? "all"} disabled={isPending} onChange={(event) => updateQuery({ status: event.target.value === "all" ? undefined : event.target.value as ServiceListQuery["status"] })} aria-label={dictionary.list.allStatuses} className="appearance-none rounded-lg border border-outline-variant bg-surface py-2 ps-3 pe-8 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60">
              <option value="all">{dictionary.list.allStatuses}</option>
              <option value="Inquiry">{dictionary.serviceStatuses.Inquiry}</option>
              <option value="Quoted">{dictionary.serviceStatuses.Quoted}</option>
              <option value="Approved">{dictionary.serviceStatuses.Approved}</option>
              <option value="Deposit Paid">{dictionary.serviceStatuses["Deposit Paid"]}</option>
              <option value="In Progress">{dictionary.serviceStatuses["In Progress"]}</option>
              <option value="Completed">{dictionary.serviceStatuses.Completed}</option>
              <option value="Cancelled">{dictionary.serviceStatuses.Cancelled}</option>
            </select>
            <Filter size={14} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
          </div>
          <div className="ms-auto shrink-0 text-[14px] leading-[20px] text-on-surface-variant">{formatServicesSummary()}</div>
        </FilterBar>
        <div className="relative min-h-0 flex-1 overflow-auto">
          {loadError ? (
            <ListInlineError message={dictionary.states.servicesLoadError} retryLabel={sharedStates.retry.tryAgain} onRetry={refresh} pending={isPending} />
          ) : services.length === 0 ? (
            <div className="flex min-h-[14rem] flex-col items-center justify-center rounded-b-xl border border-surface-variant bg-surface-container-lowest"><p className="text-[14px] text-on-surface-variant">{pagination.total === 0 && !query.search && !query.status ? (canWrite ? dictionary.states.noServices : dictionary.states.noServicesFound) : dictionary.states.noFilteredServices}</p></div>
          ) : (
            <div className="w-full overflow-x-auto rounded-b-xl border border-surface-variant bg-surface-container-lowest">
              <table className="w-full min-w-[1120px] table-fixed border-collapse text-start">
                <thead><tr className="border-b border-surface-variant bg-surface-container-low">
                  <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.serviceNumber}`}>{dictionary.list.table.serviceNumber}</th>
                  <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.serviceTitle}`}>{dictionary.list.table.serviceTitle}</th>
                  <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.customer}`}>{dictionary.list.table.customer}</th>
                  <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.eventDate}`}>{dictionary.list.table.eventDate}</th>
                  <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.status}`}>{dictionary.list.table.status}</th>
                  <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.budget}`}>{dictionary.list.table.budget}</th>
                  <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.view}`}>{dictionary.list.actions.view}</th>
                </tr></thead>
                <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                  {services.map((service) => (
                    <tr key={service.id} className="transition-colors hover:bg-surface-container-low/50">
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.serviceNumber} font-mono font-semibold text-primary`}><span dir="ltr" className="inline-block whitespace-nowrap">{isolateBidiText(service.serviceNumber)}</span></td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.serviceTitle}`}><div className="font-semibold text-on-surface"><span dir="auto">{service.serviceTitle}</span></div><div className="mt-1 text-[12px] leading-[16px] text-on-surface-variant"><span dir="auto">{service.eventName || "—"}</span></div></td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.customer} text-on-surface-variant`}><span dir="auto">{service.customer?.company || "—"}</span></td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.eventDate} text-on-surface-variant`}>{service.eventStartDate ? <UiDateText locale={dictionary.locale} value={service.eventStartDate} /> : "—"}</td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.status}`}><div className="flex justify-center"><StatusBadge variant={(STATUS_VARIANT_MAP[service.status] ?? "pending") as React.ComponentProps<typeof StatusBadge>["variant"]}>{getServiceStatusLabel(dictionary.locale, service.status)}</StatusBadge></div></td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.budget} font-semibold text-on-surface tabular-nums`}><span dir="ltr" className="inline-block whitespace-nowrap">{service.estimatedBudget != null ? formatSarAmount(dictionary.locale, Number(service.estimatedBudget)) : "—"}</span></td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.view}`}><div className="flex justify-center"><PendingLink href={`/services/${service.id}?returnTo=${encodeURIComponent(returnTo)}`} aria-label={`${dictionary.list.actions.view} ${service.serviceNumber}`} title={`${dictionary.list.actions.view} ${service.serviceNumber}`} className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed focus:outline-none focus:ring-2 focus:ring-primary/40"><Eye size={17} /></PendingLink></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <PaginationFooter
          currentPage={pagination.page}
          totalPages={pagination.totalPages}
          total={pagination.total}
          pageSize={pagination.pageSize}
          paginationMode="bounded"
          isPending={isPending}
          onPageChange={(page) => navigate(serviceListHref(query, page), "push")}
          onPageSizeChange={(pageSize: ListPageSize) => updateQuery({ pageSize })}
        />
      </div>
    </div>
  );
}
