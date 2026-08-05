"use client";

import { Eye, Filter, Plus } from "lucide-react";
import FilterBar from "@/components/ui/FilterBar";
import ModuleSearchControl from "@/components/ui/ModuleSearchControl";
import { ListInlineError } from "@/components/ui/ListPendingState";
import { useListNavigation } from "@/components/ui/useListNavigation";
import PageHeader from "@/components/ui/PageHeader";
import PaginationFooter from "@/components/ui/PaginationFooter";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatUiNumber } from "@/lib/i18n/formatting";
import { getCommonDictionary, getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { formatSupplierCopy, getSupplierCategoryLabel, getSupplierStatusLabel, getSupplierTypeLabel, type SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";
import { SUPPLIER_CATEGORIES } from "@/lib/suppliers/schemas";
import type { SupplierDirectoryItem, SupplierStatus } from "@/types/supplier";
import { normalizeSupplierListSearch, type SupplierListPagination } from "@/lib/suppliers/types";
import { LIST_PAGE_SIZES, type ListPageSize } from "@/lib/pagination";

const STATUS_OPTIONS: SupplierStatus[] = ["active", "on_hold", "blacklisted", "inactive"];
const STATUS_VARIANT_MAP = { active: "active", on_hold: "pending", blacklisted: "draft", inactive: "inactive" } as const;

type SupplierFilters = { search: string; status: string; category: string; page: number; pageSize: ListPageSize };

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

function locationLines(supplier: SupplierDirectoryItem) {
  const primary = supplier.city || supplier.country || "—";
  const secondary = supplier.coverageArea || (supplier.city ? supplier.country : null);
  return { primary, secondary };
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
  const filters: SupplierFilters = { search, status: statusFilter, category: categoryFilter, page: pagination.page, pageSize: pagination.pageSize };
  const stateKey = `${search}|${statusFilter}|${categoryFilter}|${showDeleted}|${pagination.page}|${pagination.pageSize}|${loadError ?? ""}`;
  const { isPending, isSearchPending, navigate, refresh } = useListNavigation(stateKey);
  const common = getCommonDictionary(locale);
  const sharedStates = getSharedUiStates(locale);

  function updateFilters(next: Partial<SupplierFilters>, resetPage = false, kind?: "navigation" | "search") {
    const nextFilters = { ...filters, ...next, page: resetPage ? 1 : (next.page ?? filters.page) };
    const navigationKind = kind ?? (next.search?.trim() ? "search" : "navigation");
    navigate(supplierListHref(nextFilters, showDeleted), "replace", navigationKind);
  }

  const visibleStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const visibleEnd = Math.min(visibleStart + suppliers.length - 1, pagination.total);
  const hasFilters = Boolean(search || statusFilter !== "all" || categoryFilter !== "all");
  const returnTo = supplierListHref(filters, showDeleted);
  const deletedHref = supplierListHref({ ...filters, page: 1 }, !showDeleted);

  return (
    <div className="flex h-full flex-col">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle} />
      <div className="flex min-h-0 flex-1 flex-col">
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          {canManageDeleted && <button type="button" disabled={isPending} onClick={() => navigate(deletedHref)} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-semibold text-on-surface transition-colors hover:bg-surface-container-low disabled:opacity-60">{showDeleted ? dictionary.list.showCurrent : dictionary.list.showDeleted}</button>}
          {canCreateSuppliers && !showDeleted && <PendingLink href="/suppliers/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container"><Plus size={16} />{dictionary.list.newSupplier}</PendingLink>}
        </div>

        <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-busy={isPending || undefined}>
          <FilterBar>
            <ModuleSearchControl mode="supplier" modes={[{ value: "supplier", label: dictionary.list.searchPlaceholder, placeholder: dictionary.list.searchPlaceholder }]} query={search} modeLabel={dictionary.list.searchPlaceholder} resetLabel={dictionary.list.resetFilters} submitLabel={common.labels.search} pendingLabel={common.states.searching} clearLabel={common.actions.clear} showModeSelect={false} isPending={isPending} isSearchPending={isSearchPending} onSubmit={(_, nextSearch) => updateFilters({ search: nextSearch }, true)} onReset={() => updateFilters({ search: "", status: "all", category: "all", pageSize: LIST_PAGE_SIZES[0] }, true, "navigation")} className="w-full max-w-xl" />
            <SelectFilter value={filters.status} disabled={isPending} onChange={(status) => updateFilters({ status }, true)}><><option value="all">{dictionary.list.allStatuses}</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{getSupplierStatusLabel(locale, status)}</option>)}</></SelectFilter>
            <SelectFilter value={filters.category} disabled={isPending} onChange={(category) => updateFilters({ category }, true)}><><option value="all">{dictionary.list.allCategories}</option>{SUPPLIER_CATEGORIES.map((category) => <option key={category} value={category}>{getSupplierCategoryLabel(locale, category)}</option>)}</></SelectFilter>
            <div className="ms-auto text-[14px] leading-[20px] text-on-surface-variant">{pagination.total === 0 ? dictionary.list.showingZero : formatSupplierCopy(dictionary.list.showingRange, { start: formatUiNumber(locale, visibleStart), end: formatUiNumber(locale, visibleEnd), total: formatUiNumber(locale, pagination.total) })}</div>
          </FilterBar>
          <div className="relative min-h-0 flex-1 overflow-auto">
        {loadError ? <ListInlineError message={dictionary.states.listInlineError} retryLabel={sharedStates.retry.tryAgain} onRetry={refresh} pending={isPending} /> : null}
        <div className="grid grid-cols-1 gap-3 p-1 lg:hidden">
          {!loadError && suppliers.map((supplier) => {
            const location = locationLines(supplier);
            return <article key={supplier.id} className="rounded-lg border border-outline-variant bg-surface p-4"><div className="flex items-start justify-between gap-3"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-fixed text-[16px] font-bold text-primary">{supplier.name.trim().charAt(0).toUpperCase() || "S"}</div><div className="min-w-0"><div className="break-words font-semibold text-primary" dir="auto">{supplier.name}</div>{supplier.supplierNumber && <div className="mt-0.5 text-[12px] text-on-surface-variant" dir="ltr">{isolateBidiText(supplier.supplierNumber)}</div>}</div></div><StatusBadge variant={STATUS_VARIANT_MAP[supplier.status]}>{getSupplierStatusLabel(locale, supplier.status)}</StatusBadge></div><dl className="mt-4 grid grid-cols-2 gap-3 text-[12px]"><div><dt className="text-on-surface-variant">{dictionary.list.columns.category}</dt><dd className="mt-1 break-words text-on-surface" dir="auto">{getSupplierCategoryLabel(locale, supplier.category)}</dd></div><div><dt className="text-on-surface-variant">{dictionary.list.columns.type}</dt><dd className="mt-1 break-words text-on-surface" dir="auto">{supplier.supplierType ? getSupplierTypeLabel(locale, supplier.supplierType) : "—"}</dd></div><div><dt className="text-on-surface-variant">{dictionary.list.columns.location}</dt><dd className="mt-1 break-words text-on-surface"><span className="block" dir="auto">{location.primary}</span>{location.secondary && <span className="block text-[11px] text-on-surface-variant" dir="auto">{location.secondary}</span>}</dd></div><div><dt className="text-on-surface-variant">{dictionary.detail.phone}</dt><dd className="mt-1 break-words text-on-surface" dir="ltr">{supplier.phone ? isolateBidiText(supplier.phone) : "—"}</dd></div></dl>{supplier.isPreferred && <div className="mt-3 text-[12px] font-semibold text-primary" dir="auto">{dictionary.detail.preferred}</div>}<PendingLink href={supplierDetailHref(supplier.id, showDeleted, returnTo)} className="mt-4 inline-flex w-full items-center justify-center rounded-lg border border-outline-variant px-3 py-2 text-[13px] font-semibold text-primary hover:bg-primary-fixed">{dictionary.list.viewSupplier}</PendingLink></article>;
          })}
          {!loadError && suppliers.length === 0 && <div className="px-4 py-8 text-center text-on-surface-variant">{hasFilters ? dictionary.states.noFilteredSuppliers : dictionary.states.noSuppliers}</div>}
        </div>

        <div className="hidden overflow-x-auto rounded-lg border border-surface-variant bg-surface-container-lowest lg:block">
          <table className="w-full min-w-[1180px] table-fixed border-collapse text-start">
            <colgroup><col className="w-[25%]" /><col className="w-[16%]" /><col className="w-[12%]" /><col className="w-[10%]" /><col className="w-[20%]" /><col className="w-[11%]" /><col className="w-[6%]" /></colgroup>
            <thead><tr className="border-b border-surface-variant bg-surface-container-low">
              <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.supplier}</th>
              <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.detail.phone}</th>
              <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.category}</th>
              <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.type}</th>
              <th className="px-4 py-3 text-start text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.location}</th>
              <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.status}</th>
              <th className="px-4 py-3 text-center text-[12px] font-semibold uppercase text-on-surface-variant">{dictionary.list.columns.actions}</th>
            </tr></thead>
            <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
              {!loadError && suppliers.map((supplier) => {
                const location = locationLines(supplier);
                return <tr key={supplier.id} className="transition-colors hover:bg-surface-container-low/50"><td className="px-4 py-4 align-top"><div className="flex min-w-0 items-center gap-3"><div className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-primary-fixed text-[16px] font-bold text-primary">{supplier.name.trim().charAt(0).toUpperCase() || "S"}</div><div className="min-w-0"><div className="break-words font-semibold text-primary" dir="auto">{supplier.name}</div>{supplier.supplierNumber && <div className="mt-0.5 text-[12px] text-on-surface-variant" dir="ltr">{isolateBidiText(supplier.supplierNumber)}</div>}{supplier.isPreferred && <div className="mt-1 text-[11px] font-semibold text-primary" dir="auto">{dictionary.detail.preferred}</div>}</div></div></td><td className="px-4 py-4 align-top text-on-surface" dir="ltr">{supplier.phone ? isolateBidiText(supplier.phone) : "—"}</td><td className="px-4 py-4 align-top"><span className="break-words rounded bg-surface-variant px-2 py-1 text-[12px] font-medium text-on-surface" dir="auto">{getSupplierCategoryLabel(locale, supplier.category)}</span></td><td className="px-4 py-4 align-top text-on-surface-variant" dir="auto">{supplier.supplierType ? getSupplierTypeLabel(locale, supplier.supplierType) : "—"}</td><td className="px-4 py-4 align-top text-on-surface-variant"><span className="block break-words" dir="auto">{location.primary}</span>{location.secondary && <span className="mt-1 block break-words text-[11px]" dir="auto">{location.secondary}</span>}</td><td className="px-4 py-4 align-top"><div className="flex justify-center"><StatusBadge variant={STATUS_VARIANT_MAP[supplier.status]}>{getSupplierStatusLabel(locale, supplier.status)}</StatusBadge></div></td><td className="px-4 py-4 align-top"><div className="flex justify-center"><PendingLink href={supplierDetailHref(supplier.id, showDeleted, returnTo)} className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed focus:outline-none focus:ring-2 focus:ring-primary/40" aria-label={`${dictionary.list.viewSupplier} ${supplier.name}`} title={dictionary.list.viewSupplier}><Eye size={17} /></PendingLink></div></td></tr>;
              })}
              {!loadError && suppliers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">{hasFilters ? dictionary.states.noFilteredSuppliers : dictionary.states.noSuppliers}</td></tr>}
            </tbody>
          </table>
        </div>
          </div>
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
        </div>
      </div>
    </div>
  );
}

function SelectFilter({ value, onChange, disabled, children }: { value: string; onChange: (value: string) => void; disabled?: boolean; children: React.ReactNode }) {
  return <div className="relative"><select value={value} disabled={disabled} onChange={(event) => onChange(event.target.value)} className="appearance-none rounded-lg border border-outline-variant bg-surface py-2 ps-3 pe-8 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60">{children}</select><Filter size={14} aria-hidden="true" className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /></div>;
}
