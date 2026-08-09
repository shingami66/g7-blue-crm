"use client";

import { Eye, Filter, Plus } from "lucide-react";
import type { ReactNode } from "react";
import FilterBar from "@/components/ui/FilterBar";
import ModuleSearchControl from "@/components/ui/ModuleSearchControl";
import { ListInlineError } from "@/components/ui/ListPendingState";
import { useListNavigation } from "@/components/ui/useListNavigation";
import PageHeader from "@/components/ui/PageHeader";
import PaginationFooter from "@/components/ui/PaginationFooter";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getCommonDictionary, getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import {
  getSupplierCategoryLabel,
  getSupplierStatusLabel,
  getSupplierTypeLabel,
  type SuppliersDictionary,
} from "@/lib/i18n/dictionaries/suppliers";
import { SUPPLIER_CATEGORIES } from "@/lib/suppliers/schemas";
import type { SupplierDirectoryItem, SupplierStatus } from "@/types/supplier";
import { normalizeSupplierListSearch, type SupplierListPagination } from "@/lib/suppliers/types";
import { LIST_PAGE_SIZES, type ListPageSize } from "@/lib/pagination";

const STATUS_OPTIONS: SupplierStatus[] = ["active", "on_hold", "blacklisted", "inactive"];
const STATUS_VARIANT_MAP = {
  active: "active",
  on_hold: "pending",
  blacklisted: "draft",
  inactive: "inactive",
} as const;

type SupplierFilters = {
  search: string;
  status: string;
  category: string;
  page: number;
  pageSize: ListPageSize;
};

function supplierListHref(filters: SupplierFilters, showDeleted: boolean) {
  const params = new URLSearchParams();
  if (showDeleted) params.set("showDeleted", "true");
  const normalizedSearch = normalizeSupplierListSearch(filters.search);
  if (normalizedSearch) params.set("search", normalizedSearch);
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.page > 1) params.set("page", String(filters.page));
  if (filters.pageSize !== LIST_PAGE_SIZES[0]) params.set("pageSize", String(filters.pageSize));
  const query = params.toString();
  return query ? `/suppliers?${query}` : "/suppliers";
}

function supplierDetailHref(id: string, showDeleted: boolean, returnTo: string) {
  const params = new URLSearchParams();
  if (showDeleted) params.set("showDeleted", "true");
  params.set("returnTo", returnTo);
  return `/suppliers/${id}?${params.toString()}`;
}

function displaySupplierText(value: string | null | undefined) {
  if (typeof value !== "string" || value.trim().length === 0) return "—";
  return value;
}

function locationFields(supplier: SupplierDirectoryItem) {
  return {
    city: displaySupplierText(supplier.city),
    coverageArea: displaySupplierText(supplier.coverageArea),
    country: displaySupplierText(supplier.country),
  };
}

function MobileFieldLabel({ children }: { children: ReactNode }) {
  return <span className="shrink-0 text-[11px] font-semibold uppercase text-on-surface-variant lg:hidden">{children}</span>;
}

export default function SuppliersClient({
  suppliers,
  pagination,
  search,
  statusFilter,
  categoryFilter,
  loadError,
  canCreateSuppliers,
  canManageDeleted,
  showDeleted,
  dictionary,
}: {
  suppliers: SupplierDirectoryItem[];
  pagination: SupplierListPagination;
  search: string;
  statusFilter: string;
  categoryFilter: string;
  loadError?: "suppliers_load_failed";
  canCreateSuppliers: boolean;
  canManageDeleted: boolean;
  showDeleted: boolean;
  dictionary: SuppliersDictionary;
}) {
  const { locale } = dictionary;
  const filters: SupplierFilters = {
    search,
    status: statusFilter,
    category: categoryFilter,
    page: pagination.page,
    pageSize: pagination.pageSize,
  };
  const stateKey = `${search}|${statusFilter}|${categoryFilter}|${showDeleted}|${pagination.page}|${pagination.pageSize}|${loadError ?? ""}`;
  const { isPending, isSearchPending, navigate, refresh } = useListNavigation(stateKey);
  const common = getCommonDictionary(locale);
  const sharedStates = getSharedUiStates(locale);

  function updateFilters(next: Partial<SupplierFilters>, resetPage = false, kind?: "navigation" | "search") {
    const nextFilters = {
      ...filters,
      ...next,
      page: resetPage ? 1 : (next.page ?? filters.page),
    };
    const navigationKind = kind ?? (next.search?.trim() ? "search" : "navigation");
    navigate(supplierListHref(nextFilters, showDeleted), "replace", navigationKind);
  }

  const hasFilters = Boolean(search || statusFilter !== "all" || categoryFilter !== "all");
  const returnTo = supplierListHref(filters, showDeleted);
  const deletedHref = supplierListHref({ ...filters, page: 1 }, !showDeleted);

  return (
    <div className="flex flex-col" data-supplier-directory="workspace">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle}>
        <div className="flex flex-wrap justify-end gap-2">
          {canManageDeleted && (
            <button
              type="button"
              disabled={isPending}
              onClick={() => navigate(deletedHref)}
              className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60"
            >
              {showDeleted ? dictionary.list.showCurrent : dictionary.list.showDeleted}
            </button>
          )}
          {canCreateSuppliers && !showDeleted && (
            <PendingLink
              href="/suppliers/new"
              className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container"
            >
              <Plus size={16} aria-hidden="true" />
              {dictionary.list.newSupplier}
            </PendingLink>
          )}
        </div>
      </PageHeader>

      <div
        className="relative flex min-w-0 flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest"
        aria-busy={isPending || undefined}
      >
        <FilterBar>
          <ModuleSearchControl
            mode="supplier"
            modes={[{ value: "supplier", label: dictionary.list.searchPlaceholder, placeholder: dictionary.list.searchPlaceholder }]}
            query={search}
            modeLabel={dictionary.list.searchPlaceholder}
            submitLabel={common.labels.search}
            pendingLabel={common.states.searching}
            clearLabel={common.actions.clear}
            showModeSelect={false}
            isPending={isPending}
            isSearchPending={isSearchPending}
            onSubmit={(_, nextSearch) => updateFilters({ search: nextSearch }, true)}
            className="w-full max-w-xl"
          />
          <SelectFilter
            value={filters.status}
            label={dictionary.list.allStatuses}
            disabled={isPending}
            onChange={(status) => updateFilters({ status }, true)}
          >
            <>
              <option value="all">{dictionary.list.allStatuses}</option>
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getSupplierStatusLabel(locale, status)}
                </option>
              ))}
            </>
          </SelectFilter>
          <SelectFilter
            value={filters.category}
            label={dictionary.list.allCategories}
            disabled={isPending}
            onChange={(category) => updateFilters({ category }, true)}
          >
            <>
              <option value="all">{dictionary.list.allCategories}</option>
              {SUPPLIER_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {getSupplierCategoryLabel(locale, category)}
                </option>
              ))}
            </>
          </SelectFilter>
        </FilterBar>

        <div className="relative overflow-x-auto overflow-y-visible">
          {loadError ? (
            <ListInlineError
              message={dictionary.states.listInlineError}
              retryLabel={sharedStates.retry.tryAgain}
              onRetry={refresh}
              pending={isPending}
            />
          ) : null}

          <table
            className="block w-full min-w-0 border-collapse text-start lg:table lg:min-w-[1080px]"
            data-supplier-result-count="single"
          >
            <colgroup className="hidden lg:table-column-group">
              <col className="w-[24%]" />
              <col className="w-[12%]" />
              <col className="w-[11%]" />
              <col className="w-[9%]" />
              <col className="w-[10%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[7%]" />
              <col className="w-[3%]" />
            </colgroup>
            <thead className="hidden lg:table-header-group">
              <tr className="border-b border-surface-variant bg-surface-container-low">
                <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.supplier}</th>
                <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.detail.phone}</th>
                <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.category}</th>
                <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.type}</th>
                <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.detail.city}</th>
                <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.detail.coverageArea}</th>
                <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.detail.country}</th>
                <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.status}</th>
                <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="block lg:table-row-group lg:divide-y lg:divide-surface-variant lg:text-[14px] lg:leading-[20px]">
              {!loadError && suppliers.map((supplier) => {
                const location = locationFields(supplier);
                const supplierName = displaySupplierText(supplier.name);
                const viewLabel = `${dictionary.list.viewSupplier}: ${isolateBidiText(supplierName)}`;
                const initial = supplier.name.trim().charAt(0).toUpperCase();

                return (
                  <tr
                    key={supplier.id}
                    className="block border-b border-surface-variant p-4 transition-colors last:border-b-0 hover:bg-surface-container-low/50 lg:table-row lg:border-0 lg:p-0"
                  >
                    <td className="block px-0 py-0 lg:table-cell lg:px-4 lg:py-4 lg:align-top">
                      <div className="flex min-w-0 items-start gap-3">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-fixed text-[16px] font-bold text-primary" aria-hidden="true">
                          {initial}
                        </div>
                        <div className="min-w-0">
                          <div className="break-words font-semibold text-primary" dir="auto">{supplierName}</div>
                          {supplier.supplierNumber && (
                            <div className="mt-0.5 text-[12px] text-on-surface-variant" dir="ltr">
                              {isolateBidiText(supplier.supplierNumber)}
                            </div>
                          )}
                          {supplier.isPreferred && (
                            <div className="mt-1 text-[11px] font-semibold text-primary" dir="auto">{dictionary.detail.preferred}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="mt-3 flex items-baseline justify-between gap-3 border-t border-surface-variant pt-3 text-on-surface lg:mt-0 lg:table-cell lg:border-0 lg:px-4 lg:py-4 lg:align-top">
                      <MobileFieldLabel>{dictionary.detail.phone}</MobileFieldLabel>
                      <span dir="ltr">{supplier.phone ? isolateBidiText(supplier.phone) : "—"}</span>
                    </td>
                    <td className="flex items-baseline justify-between gap-3 pt-2 lg:table-cell lg:px-4 lg:py-4 lg:align-top">
                      <MobileFieldLabel>{dictionary.list.columns.category}</MobileFieldLabel>
                      <span className="break-words rounded bg-surface-variant px-2 py-1 text-[12px] font-medium text-on-surface" dir="auto">{getSupplierCategoryLabel(locale, supplier.category)}</span>
                    </td>
                    <td className="flex items-baseline justify-between gap-3 pt-2 text-on-surface-variant lg:table-cell lg:px-4 lg:py-4 lg:align-top">
                      <MobileFieldLabel>{dictionary.list.columns.type}</MobileFieldLabel>
                      <span dir="auto">{supplier.supplierType ? getSupplierTypeLabel(locale, supplier.supplierType) : "—"}</span>
                    </td>
                    <td className="flex items-baseline justify-between gap-3 pt-2 text-on-surface-variant lg:table-cell lg:px-4 lg:py-4 lg:align-top" dir="auto">
                      <MobileFieldLabel>{dictionary.detail.city}</MobileFieldLabel>
                      <span className="break-words text-end lg:text-start">{location.city}</span>
                    </td>
                    <td className="flex items-baseline justify-between gap-3 pt-2 text-on-surface-variant lg:table-cell lg:px-4 lg:py-4 lg:align-top" dir="auto">
                      <MobileFieldLabel>{dictionary.detail.coverageArea}</MobileFieldLabel>
                      <span className="break-words text-end lg:text-start">{location.coverageArea}</span>
                    </td>
                    <td className="flex items-baseline justify-between gap-3 pt-2 text-on-surface-variant lg:table-cell lg:px-4 lg:py-4 lg:align-top" dir="auto">
                      <MobileFieldLabel>{dictionary.detail.country}</MobileFieldLabel>
                      <span className="break-words text-end lg:text-start">{location.country}</span>
                    </td>
                    <td className="flex items-center justify-between gap-3 pt-3 lg:table-cell lg:px-4 lg:py-4 lg:align-top">
                      <MobileFieldLabel>{dictionary.list.columns.status}</MobileFieldLabel>
                      <StatusBadge variant={STATUS_VARIANT_MAP[supplier.status]}>{getSupplierStatusLabel(locale, supplier.status)}</StatusBadge>
                    </td>
                    <td className="flex items-center justify-end pt-3 lg:table-cell lg:px-4 lg:py-4 lg:align-top">
                      <PendingLink
                        href={supplierDetailHref(supplier.id, showDeleted, returnTo)}
                        pendingLabel={dictionary.list.openingSupplier}
                        className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-transparent text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 focus-visible:ring-offset-surface"
                        aria-label={viewLabel}
                        title={viewLabel}
                      >
                        <Eye size={17} aria-hidden="true" />
                      </PendingLink>
                    </td>
                  </tr>
                );
              })}
              {!loadError && suppliers.length === 0 && (
                <tr className="block lg:table-row">
                  <td colSpan={9} className="block px-4 py-8 text-center text-on-surface-variant lg:table-cell">
                    {hasFilters ? dictionary.states.noFilteredSuppliers : dictionary.states.noSuppliers}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {pagination.total === 0 ? (
          <div className="flex items-center border-t border-surface-variant bg-surface-container-lowest p-3 text-[13px] text-on-surface-variant" data-supplier-empty-count="true">
            {dictionary.list.showingZero}
          </div>
        ) : (
          <PaginationFooter
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            paginationMode="bounded"
            isPending={isPending}
            onPageChange={(page) => navigate(supplierListHref({ ...filters, page }, showDeleted), "push")}
            onPageSizeChange={(pageSize: ListPageSize) => updateFilters({ pageSize }, true)}
            className="border-t-0"
          />
        )}
      </div>
    </div>
  );
}

function SelectFilter({
  value,
  label,
  onChange,
  disabled,
  children,
}: {
  value: string;
  label: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <select
        value={value}
        disabled={disabled}
        aria-label={label}
        onChange={(event) => onChange(event.target.value)}
        className="appearance-none rounded-lg border border-outline-variant bg-surface py-2 ps-3 pe-8 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60"
      >
        {children}
      </select>
      <Filter size={14} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant" />
    </div>
  );
}
