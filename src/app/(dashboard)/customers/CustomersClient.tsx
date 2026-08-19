"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import Button from "@/components/ui/Button";
import PendingLink from "@/components/ui/PendingLink";
import { ListInlineError } from "@/components/ui/ListPendingState";
import { Eye, Plus, Filter, Download, Search, X } from "lucide-react";
import { createCustomer } from "@/lib/customers/actions";
import {
  getCustomerStatusLabel,
  type CustomersDictionary,
} from "@/lib/i18n/dictionaries/customers";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import type { Customer } from "@/types/customer";
import { CustomerCoreFields, CustomerOfficialBillingFields } from "./CustomerFormFields";
import { generateExcelReport } from "@/lib/reports/exportExcel";
import { useListNavigation } from "@/components/ui/useListNavigation";
import { LIST_PAGE_SIZES, type ListPageSize } from "@/lib/pagination";
import { normalizeCustomerListSearch, type CustomerListPagination, type CustomerListQuery } from "@/lib/customers/types";
import { getCommonDictionary, getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";

const TABLE_HEADER_BASE =
  "px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase";
const TABLE_CELL_BASE = "px-4 py-4 align-top";
const COLUMN_LAYOUT = {
  company: "w-[28%] min-w-[240px] text-start",
  contact: "w-[24%] min-w-[220px] text-start",
  location: "w-[12%] min-w-[120px] text-start",
  status: "w-[12%] min-w-[120px] text-center",
  services: "w-[10%] min-w-[110px] text-center",
  quotedValue: "w-[14%] min-w-[140px] text-end",
  view: "w-[10%] min-w-[110px] text-center",
} as const;

function generateMutationKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export default function CustomersClient({
  customers,
  pagination,
  query,
  cities,
  loadError,
  canWrite,
  canExport,
  generatedBy,
  dictionary,
}: {
  customers: Customer[];
  pagination: CustomerListPagination;
  query: CustomerListQuery;
  cities: string[];
  loadError?: "customers_load_failed";
  canWrite: boolean;
  canExport?: boolean;
  generatedBy?: string;
  dictionary: CustomersDictionary;
}) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [mutationKey, setMutationKey] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const submittedSearch = query.search ?? "";
  const [draftSearch, setDraftSearch] = useState(submittedSearch);
  const lastSubmittedSearch = useRef(submittedSearch);
  const searchComposing = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const stateKey = `${submittedSearch}|${query.status ?? ""}|${query.city ?? ""}|${pagination.page}|${pagination.pageSize}`;
  const { isPending: isListPending, isSearchPending, navigate } = useListNavigation(stateKey);
  const common = getCommonDictionary(dictionary.locale);
  const sharedStates = getSharedUiStates(dictionary.locale);
  const statusFilter = query.status ?? "all";
  const cityFilter = query.city ?? "all";
  const hasFilters = Boolean(query.search || query.status || query.city);
  const returnTo = customerListHref({}, pagination.page);

  function openAddModal() {
    setActionError(null);
    setMutationKey(generateMutationKey());
    setShowAddModal(true);
  }

  function closeAddModal() {
    setShowAddModal(false);
    setMutationKey("");
    setActionError(null);
  }

  useEffect(() => {
    if (lastSubmittedSearch.current === submittedSearch) return;
    lastSubmittedSearch.current = submittedSearch;
    setDraftSearch(submittedSearch);
  }, [submittedSearch]);

  function customerListHref(next: Partial<CustomerListQuery>, page = 1) {
    const params = new URLSearchParams();
    if (page > 1) params.set("page", String(page));
    const pageSize = next.pageSize ?? query.pageSize ?? LIST_PAGE_SIZES[0];
    if (pageSize !== LIST_PAGE_SIZES[0]) params.set("pageSize", String(pageSize));
    const search = normalizeCustomerListSearch(next.search ?? query.search);
    if (search) params.set("search", search);
    const status = next.status !== undefined ? next.status : query.status;
    if (status && String(status) !== "all") params.set("status", status);
    const city = next.city !== undefined ? next.city : query.city;
    if (city && city !== "all") params.set("city", city);
    const encoded = params.toString();
    return encoded ? `/customers?${encoded}` : "/customers";
  }

  function submitSearch(rawSearch = draftSearch) {
    const search = sanitizeSearchTerm(rawSearch);
    lastSubmittedSearch.current = search;
    setDraftSearch(search);
    navigate(customerListHref({ search }, 1), "replace", "search");
  }

  function clearSearch() {
    lastSubmittedSearch.current = "";
    setDraftSearch("");
    if (!submittedSearch) {
      searchInputRef.current?.focus();
      return;
    }
    navigate(customerListHref({ search: "" }, 1), "replace", "search");
    searchInputRef.current?.focus();
  }

  async function exportCustomers() {
    if (!canExport || customers.length === 0) return;

    const date = new Date();
    const dateStr = date.toISOString().split("T")[0];

    const activeFilters = [];
    if (query.status) {
      activeFilters.push(
        `${dictionary.list.report.statusFilter}: ${getCustomerStatusLabel(dictionary.locale, query.status)}`
      );
    }
    if (query.city) {
      activeFilters.push(`${dictionary.list.report.cityFilter}: ${query.city}`);
    }

    await generateExcelReport<Customer>({
      locale: dictionary.locale,
      chrome: dictionary.list.report.chrome,
      metadata: {
        companyName: "G SEVEN BLUE Company",
        brandName: "G7 BLUE CRM",
        reportTitle: dictionary.list.report.title,
        generatedAt: date,
        generatedBy:
          generatedBy || dictionary.list.report.chrome.systemGenerated,
        filters: activeFilters,
        totalRecords: customers.length,
        sheetName: dictionary.list.report.chrome.defaultSheetName,
        fileName: `g7-blue-customers-${dateStr}.xlsx`,
      },
      columns: [
        { header: dictionary.list.report.columns.customerNumber, key: "customerNumber", width: 20, format: "text" },
        { header: dictionary.list.report.columns.company, key: "company", width: 30, format: "text" },
        { header: dictionary.list.report.columns.contactPerson, key: "contact", width: 25, format: "text" },
        { header: dictionary.list.report.columns.email, key: "email", width: 30, format: "text" },
        { header: dictionary.list.report.columns.phone, key: "phone", width: 20, format: "text" },
        { header: dictionary.list.report.columns.city, key: "city", width: 20, format: "text" },
        { header: dictionary.list.report.columns.status, key: "status", width: 15, format: "text" },
        { header: dictionary.list.report.columns.servicesCount, key: "servicesCount", width: 15, format: "number" },
        { header: dictionary.list.report.columns.quotationsCount, key: "quotationsCount", width: 15, format: "number" },
        { header: dictionary.list.report.columns.totalQuotedAmount, key: "totalQuotedAmount", width: 25, format: "currency" },
      ],
      rows: customers,
    });
  }

  async function createCustomerFromForm(formData: FormData) {
    setActionError(null);
    startTransition(async () => {
      if (!formData.get("mutation_key") && mutationKey) {
        formData.set("mutation_key", mutationKey);
      }
      const result = await createCustomer(formData);

      if (result.success) {
        closeAddModal();
        router.refresh();
      } else {
        setActionError(getLocalizedActionError(result.error, dictionary));
      }
    });
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle}>
        {canExport && (
          <Button asChild variant="outline" size="sm">
            <button
              type="button"
              onClick={exportCustomers}
              disabled={customers.length === 0 || isListPending}
            >
              <Download size={16} />
              {dictionary.list.export}
            </button>
          </Button>
        )}
        {canWrite && (
          <Button asChild size="sm">
            <button type="button" onClick={openAddModal}>
              <Plus size={16} />
              {dictionary.list.addCustomer}
            </button>
          </Button>
        )}
      </PageHeader>

      <div className="flex min-h-0 flex-1 gap-6">
        <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
          <div className="flex flex-wrap items-center gap-3 border-b border-surface-variant bg-surface-bright p-4">
            <form
              className="flex w-full max-w-sm min-w-0 flex-1 items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                if (!searchComposing.current) submitSearch();
              }}
              aria-busy={isSearchPending || undefined}
            >
              <div className="relative min-w-0 flex-1">
                <Search
                  size={16}
                  aria-hidden="true"
                  className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                />
                <input
                  ref={searchInputRef}
                  type="search"
                  value={draftSearch}
                  onChange={(event) => setDraftSearch(event.target.value)}
                  onCompositionStart={() => {
                    searchComposing.current = true;
                  }}
                  onCompositionEnd={() => {
                    searchComposing.current = false;
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Escape" && draftSearch.length > 0) {
                      event.preventDefault();
                      clearSearch();
                    }
                    if (event.key === "Enter" && (searchComposing.current || event.nativeEvent.isComposing)) {
                      event.preventDefault();
                    }
                  }}
                  placeholder={dictionary.list.searchPlaceholder}
                  aria-label={dictionary.list.searchPlaceholder}
                  disabled={isListPending}
                  className="w-full min-w-0 rounded-lg border border-outline-variant bg-surface py-2 ps-9 pe-10 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
                />
                {draftSearch.length > 0 ? (
                  <button
                    type="button"
                    onClick={clearSearch}
                    disabled={isListPending}
                    aria-label={`${common.actions.clear}: ${dictionary.list.searchPlaceholder}`}
                    className="absolute end-2 top-1/2 inline-flex -translate-y-1/2 rounded p-1 text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <X size={15} aria-hidden="true" />
                  </button>
                ) : null}
              </div>
              <button
                type="submit"
                disabled={isListPending}
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
            <div className="relative">
              <label htmlFor="customer-status-filter" className="sr-only">
                {dictionary.list.report.statusFilter}
              </label>
              <select
                id="customer-status-filter"
                value={statusFilter}
                onChange={(event) => navigate(customerListHref({ status: event.target.value as CustomerListQuery["status"] }), "replace")}
                disabled={isListPending}
                className="appearance-none bg-surface border border-outline-variant rounded-lg ps-3 pe-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">{dictionary.list.allStatuses}</option>
                <option value="active">{getCustomerStatusLabel(dictionary.locale, "active")}</option>
                <option value="inactive">{getCustomerStatusLabel(dictionary.locale, "inactive")}</option>
                <option value="lead">{getCustomerStatusLabel(dictionary.locale, "lead")}</option>
              </select>
              <Filter
                size={14}
                aria-hidden="true"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="relative">
              <label htmlFor="customer-city-filter" className="sr-only">
                {dictionary.list.report.cityFilter}
              </label>
              <select
                id="customer-city-filter"
                value={cityFilter}
                onChange={(event) => navigate(customerListHref({ city: event.target.value }), "replace")}
                disabled={isListPending}
                className="appearance-none bg-surface border border-outline-variant rounded-lg ps-3 pe-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">{dictionary.list.allCities}</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <Filter
                size={14}
                aria-hidden="true"
                className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            {isSearchPending && <span className="text-[12px] text-on-surface-variant">{common.states.searching}</span>}
          </div>

          <PaginationFooter
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            paginationMode="bounded"
            isPending={isListPending}
            onPageChange={(page) => navigate(customerListHref({}, page), "push")}
            onPageSizeChange={(pageSize: ListPageSize) => navigate(customerListHref({ pageSize }, 1), "replace")}
          />

          <div className="flex-1 overflow-auto" aria-busy={isListPending || undefined}>
            {loadError ? (
              <div className="p-4">
                <ListInlineError message={dictionary.states.customersLoadError} retryLabel={sharedStates.retry.tryAgain} onRetry={() => router.refresh()} pending={isListPending} />
              </div>
            ) : customers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16">
                <p className="text-on-surface-variant text-[14px] leading-[20px]">
                  {!hasFilters
                    ? dictionary.states.noCustomers
                    : dictionary.states.noFilteredCustomers}
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full min-w-[1060px] table-fixed border-collapse text-start">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-surface-variant">
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.company}`}>
                        {dictionary.list.table.company}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.contact}`}>
                        {dictionary.list.table.contactPerson}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.location}`}>
                        {dictionary.list.table.location}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.status}`}>
                        {dictionary.list.table.status}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.services}`}>
                        {dictionary.list.table.services}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.quotedValue}`}>
                        {dictionary.list.table.quotedValue}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.view}`}>
                        {dictionary.list.actions.view}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                    {customers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.company}`}>
                          <div className="font-semibold text-primary">
                            <span dir="auto">{customer.company}</span>
                          </div>
                          <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                            <span dir="ltr" className="inline-block whitespace-nowrap">
                              {customer.customerNumber}
                            </span>
                          </div>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.contact}`}>
                          <div className="text-on-surface">
                            <span dir="auto">{customer.contact}</span>
                          </div>
                          <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                            <span dir="ltr" className="inline-block whitespace-nowrap">
                              {customer.email}
                            </span>
                          </div>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.location} text-on-surface-variant`}>
                          <span dir="auto">{customer.city}</span>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.status}`}>
                          <div className="flex justify-center">
                            <StatusBadge variant={customer.status}>
                              {getCustomerStatusLabel(dictionary.locale, customer.status)}
                            </StatusBadge>
                          </div>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.services} font-semibold text-on-surface tabular-nums`}>
                          <span dir="ltr" className="inline-block whitespace-nowrap">
                            {formatUiNumber(dictionary.locale, customer.servicesCount)}
                          </span>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.quotedValue} font-semibold text-on-surface tabular-nums`}>
                          <span dir="ltr" className="inline-block whitespace-nowrap">
                            {formatSarAmount(dictionary.locale, customer.totalQuotedAmount)}
                          </span>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.view}`}>
                          <div className="flex justify-center">
                            <PendingLink
                              href={`/customers/${customer.id}?returnTo=${encodeURIComponent(returnTo)}`}
                              pendingLabel={dictionary.list.actions.opening}
                              aria-label={`${dictionary.list.actions.view} ${customer.customerNumber}`}
                              title={`${dictionary.list.actions.view} ${customer.customerNumber}`}
                              className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed"
                            >
                              <Eye size={17} />
                            </PendingLink>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                {dictionary.list.addCustomer}
              </h3>
              <Button
                onClick={closeAddModal}
                aria-label={dictionary.actions.closeAddCustomer}
                size="icon"
                variant="ghost"
              >
                <X size={18} />
              </Button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={createCustomerFromForm} className="space-y-4">
              <input type="hidden" name="mutation_key" value={mutationKey} />
              <CustomerCoreFields customer={null} dictionary={dictionary} />
              <CustomerOfficialBillingFields customer={null} dictionary={dictionary} />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={closeAddModal}
                >
                  {dictionary.actions.cancel}
                </Button>
                <Button
                  loading={isPending}
                  type="submit"
                >
                  {isPending ? dictionary.list.creatingCustomer : dictionary.list.createCustomer}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function getLocalizedActionError(
  error: string | undefined,
  dictionary: CustomersDictionary,
): string {
  if (error === "Unauthorized") return dictionary.states.unauthorized;
  if (error === "Forbidden") return dictionary.states.forbidden;
  if (error === "Validation failed") return dictionary.states.validationFailed;
  return error ? dictionary.states.actionFailed : dictionary.states.unknownError;
}
