"use client";

import { useState } from "react";
import { Eye, Filter, Plus, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import DataTable from "@/components/ui/DataTable";
import FilterBar from "@/components/ui/FilterBar";
import PageHeader from "@/components/ui/PageHeader";
import PaginationFooter from "@/components/ui/PaginationFooter";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatUiNumber } from "@/lib/i18n/formatting";
import {
  formatSupplierCopy,
  getSupplierCategoryLabel,
  getSupplierStatusLabel,
  getSupplierTypeLabel,
  type SuppliersDictionary,
} from "@/lib/i18n/dictionaries/suppliers";
import { SUPPLIER_CATEGORIES } from "@/lib/suppliers/schemas";
import type { SupplierDirectoryItem, SupplierStatus } from "@/types/supplier";
import type { SupplierListPagination } from "@/lib/suppliers/types";

const STATUS_OPTIONS: SupplierStatus[] = ["active", "on_hold", "blacklisted", "inactive"];
const STATUS_VARIANT_MAP = { active: "active", on_hold: "pending", blacklisted: "draft", inactive: "inactive" } as const;

type SupplierFilters = {
  search: string;
  status: string;
  category: string;
  page: number;
};

function supplierListHref(filters: SupplierFilters, showDeleted: boolean) {
  const params = new URLSearchParams();
  if (showDeleted) params.set("showDeleted", "true");
  if (filters.search.trim()) params.set("search", filters.search.trim());
  if (filters.status !== "all") params.set("status", filters.status);
  if (filters.category !== "all") params.set("category", filters.category);
  if (filters.page > 1) params.set("page", String(filters.page));

  const query = params.toString();
  return query ? `/suppliers?${query}` : "/suppliers";
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
  const router = useRouter();
  const { locale } = dictionary;
  const [searchTerm, setSearchTerm] = useState(search);
  const filters: SupplierFilters = {
    search: searchTerm,
    status: statusFilter,
    category: categoryFilter,
    page: pagination.page,
  };

  function updateFilters(next: Partial<SupplierFilters>, resetPage = false) {
    const nextFilters = {
      ...filters,
      ...next,
      page: resetPage ? 1 : (next.page ?? filters.page),
    };
    if (next.search !== undefined) setSearchTerm(next.search);
    router.replace(supplierListHref(nextFilters, showDeleted));
  }

  const visibleStart = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.pageSize + 1;
  const visibleEnd = Math.min(visibleStart + suppliers.length - 1, pagination.total);
  const hasFilters = Boolean(search || statusFilter !== "all" || categoryFilter !== "all");
  const deletedHref = supplierListHref({ ...filters, page: 1 }, !showDeleted);

  return <div className="flex h-full flex-col"><PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle} />
    <div className="mb-4 flex flex-wrap justify-end gap-2">
      {canManageDeleted && <PendingLink href={deletedHref} className="rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] font-semibold text-on-surface transition-colors hover:bg-surface-container-low">{showDeleted ? dictionary.list.showCurrent : dictionary.list.showDeleted}</PendingLink>}
      {canCreateSuppliers && !showDeleted && <PendingLink href="/suppliers/new" className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container"><Plus size={16} />{dictionary.list.newSupplier}</PendingLink>}
    </div>
    {loadError && <div className="mb-4 rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-[14px] font-medium text-on-error-container">{dictionary.states.listInlineError}</div>}
    <FilterBar><div className="relative"><Search size={16} className="absolute start-3 top-1/2 -translate-y-1/2 text-outline" /><input type="search" value={searchTerm} onChange={(event) => updateFilters({ search: event.target.value }, true)} placeholder={dictionary.list.searchPlaceholder} className="w-full min-w-0 max-w-xs border border-outline-variant bg-surface py-2 ps-9 pe-4 text-[14px] text-on-surface focus:border-primary focus:outline-none sm:w-64" /></div><SelectFilter value={filters.status} onChange={(status) => updateFilters({ status }, true)}><><option value="all">{dictionary.list.allStatuses}</option>{STATUS_OPTIONS.map((status) => <option key={status} value={status}>{getSupplierStatusLabel(locale, status)}</option>)}</></SelectFilter><SelectFilter value={filters.category} onChange={(category) => updateFilters({ category }, true)}><><option value="all">{dictionary.list.allCategories}</option>{SUPPLIER_CATEGORIES.map((category) => <option key={category} value={category}>{getSupplierCategoryLabel(locale, category)}</option>)}</></SelectFilter><div className="ml-auto text-[14px] leading-[20px] text-on-surface-variant">{pagination.total === 0 ? dictionary.list.showingZero : formatSupplierCopy(dictionary.list.showingRange, { start: formatUiNumber(locale, visibleStart), end: formatUiNumber(locale, visibleEnd), total: formatUiNumber(locale, pagination.total) })}</div></FilterBar>
    <div className="flex-1 overflow-auto"><DataTable columns={[dictionary.list.columns.supplier, dictionary.list.columns.category, dictionary.list.columns.type, dictionary.list.columns.location, dictionary.list.columns.rating, dictionary.list.columns.status, dictionary.list.columns.actions]}>{suppliers.map((supplier) => <tr key={supplier.id} className="transition-colors hover:bg-surface-container-low/50"><td className="px-4 py-4"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded bg-primary-fixed text-[16px] font-bold text-primary">{supplier.name.trim().charAt(0).toUpperCase() || "S"}</div><div><div className="font-semibold text-primary" dir="auto">{supplier.name}</div>{supplier.supplierNumber && <div className="mt-0.5 text-[12px] text-on-surface-variant" dir="ltr">{isolateBidiText(supplier.supplierNumber)}</div>}</div></div></td><td className="px-4 py-4"><span className="rounded bg-surface-variant px-2 py-1 text-[12px] font-medium text-on-surface">{getSupplierCategoryLabel(locale, supplier.category)}</span></td><td className="px-4 py-4 text-on-surface-variant">{supplier.supplierType ? getSupplierTypeLabel(locale, supplier.supplierType) : "—"}</td><td className="px-4 py-4 text-on-surface-variant" dir="auto">{[supplier.city, supplier.country].filter(Boolean).join(", ") || "—"}</td><td className="px-4 py-4 text-on-surface-variant">{supplier.rating > 0 ? formatUiNumber(locale, supplier.rating, { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : "—"}</td><td className="px-4 py-4"><StatusBadge variant={STATUS_VARIANT_MAP[supplier.status]}>{getSupplierStatusLabel(locale, supplier.status)}</StatusBadge></td><td className="px-4 py-4"><PendingLink href={showDeleted ? `/suppliers/${supplier.id}?showDeleted=true` : `/suppliers/${supplier.id}`} className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed" aria-label={dictionary.list.viewSupplier} title={dictionary.list.viewSupplier}><Eye size={17} /></PendingLink></td></tr>)}{suppliers.length === 0 && <tr><td colSpan={7} className="px-4 py-8 text-center text-on-surface-variant">{hasFilters ? dictionary.states.noFilteredSuppliers : dictionary.states.noSuppliers}</td></tr>}</DataTable></div>
    {pagination.totalPages > 1 && <PaginationFooter currentPage={pagination.page} totalPages={pagination.totalPages} onPageChange={(page) => router.push(supplierListHref({ ...filters, page }, showDeleted))} className="border-t-0" />}
  </div>;
}

function SelectFilter({ value, onChange, children }: { value: string; onChange: (value: string) => void; children: React.ReactNode }) {
  return <div className="relative"><select value={value} onChange={(event) => onChange(event.target.value)} className="appearance-none border border-outline-variant bg-surface py-2 ps-3 pe-8 text-[14px] leading-[20px] text-on-surface focus:border-primary focus:outline-none">{children}</select><Filter size={14} className="pointer-events-none absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant" /></div>;
}
