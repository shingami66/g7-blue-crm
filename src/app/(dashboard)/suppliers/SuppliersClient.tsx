"use client";

import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable from "@/components/ui/DataTable";
import PendingLink from "@/components/ui/PendingLink";
import {
  Filter,
  Search,
  Star,
  Phone,
  Mail,
  FileText,
  CheckCircle2,
  User,
  MapPin,
  Plus,
  ShieldAlert,
} from "lucide-react";
import type { Supplier, SupplierStatus, SupplierType } from "@/types/supplier";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  formatSupplierCopy,
  getSupplierCategoryLabel,
  getSupplierStatusLabel,
  getSupplierTypeLabel,
  getSupplierVatRegistrationLabel,
  type SuppliersDictionary,
} from "@/lib/i18n/dictionaries/suppliers";
import { formatUiDate, formatUiNumber } from "@/lib/i18n/formatting";
import SupplierBlacklistActions from "./SupplierBlacklistActions";
import SupplierRateCardsList from "./SupplierRateCardsList";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_OPTIONS: SupplierStatus[] = ["active", "on_hold", "blacklisted", "inactive"];

const STATUS_VARIANT_MAP: Record<SupplierStatus, StatusBadgeVariant> = {
  active: "active",
  on_hold: "pending",
  blacklisted: "draft",
  inactive: "inactive",
};

function hasRating(supplier: Supplier) {
  return supplier.rating > 0;
}

function getSupplierInitial(supplier: Supplier) {
  return supplier.name.trim().charAt(0).toUpperCase() || "S";
}

function supplierMatchesSearch(supplier: Supplier, searchTerm: string) {
  if (!searchTerm) return true;

  const haystack = [
    supplier.supplierNumber,
    supplier.name,
    supplier.legalName,
    supplier.contactName,
    supplier.phone,
    supplier.whatsappPhone,
    supplier.email,
    supplier.city,
    supplier.country,
    supplier.coverageArea,
    supplier.category,
    supplier.service,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchTerm.toLowerCase());
}

export default function SuppliersClient({
  suppliers,
  loadError,
  canCreateSuppliers = false,
  canViewCosting = false,
  dictionary,
}: {
  suppliers: Supplier[];
  loadError?: "suppliers_load_failed";
  canCreateSuppliers?: boolean;
  canViewCosting?: boolean;
  dictionary: SuppliersDictionary;
}) {
  const locale = dictionary.locale;
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const categories = useMemo(
    () =>
      Array.from(
        new Set(
          suppliers
            .map((supplier) => supplier.category)
            .filter((category): category is string => Boolean(category)),
        ),
      ).sort(),
    [suppliers],
  );

  const filteredSuppliers = suppliers.filter((supplier) => {
    if (statusFilter !== "all" && supplier.status !== statusFilter) return false;
    if (categoryFilter !== "all" && supplier.category !== categoryFilter) return false;
    return supplierMatchesSearch(supplier, searchTerm.trim());
  });

  const activeSupplier = suppliers.find((supplier) => supplier.id === selectedSupplierId);

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle} />

      {canCreateSuppliers && (
        <div className="mb-4 flex justify-end">
          <PendingLink
            href="/suppliers/new"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            <Plus size={16} />
            {dictionary.list.newSupplier}
          </PendingLink>
        </div>
      )}

      {loadError && (
        <div className="mb-4 rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-[14px] font-medium text-on-error-container">
          {dictionary.states.listInlineError}
        </div>
      )}

      <div className="flex flex-1 gap-6 min-h-0 relative">
        <div
          className={`flex-1 flex flex-col min-w-0 transition-all duration-300 ${
            selectedSupplierId ? "lg:w-2/3" : "w-full"
          }`}
        >
          <FilterBar>
            <div className="relative">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-outline"
              />
              <input
                type="text"
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder={dictionary.list.searchPlaceholder}
                className="w-64 pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">{dictionary.list.allStatuses}</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {getSupplierStatusLabel(locale, status)}
                  </option>
                ))}
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(event) => setCategoryFilter(event.target.value)}
                className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">{dictionary.list.allCategories}</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {getSupplierCategoryLabel(locale, category)}
                  </option>
                ))}
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
              {filteredSuppliers.length === 0
                ? dictionary.list.showingZero
                : formatSupplierCopy(dictionary.list.showingRange, {
                    filtered: formatUiNumber(locale, filteredSuppliers.length),
                    total: formatUiNumber(locale, suppliers.length),
                  })}
            </div>
          </FilterBar>

          <div className="flex-1 overflow-auto">
            <DataTable
              columns={[
                dictionary.list.columns.supplier,
                dictionary.list.columns.category,
                dictionary.list.columns.type,
                dictionary.list.columns.location,
                dictionary.list.columns.rating,
                dictionary.list.columns.status,
              ]}
            >
              {filteredSuppliers.map((supplier) => (
                <tr
                  key={supplier.id}
                  onClick={() => setSelectedSupplierId(supplier.id)}
                  className={`hover:bg-surface-container-low/50 cursor-pointer transition-colors ${
                    selectedSupplierId === supplier.id ? "bg-primary-fixed/20" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-primary-fixed flex items-center justify-center text-primary font-bold text-[16px]">
                        {getSupplierInitial(supplier)}
                      </div>
                      <div>
                        <div className="font-semibold text-primary flex items-center gap-2">
                          <span dir="auto">{supplier.name}</span>
                          {supplier.isPreferred && (
                            <Star size={14} className="text-tertiary-fixed-dim fill-current" />
                          )}
                        </div>
                        <div
                          className={`mt-0.5 max-w-[160px] truncate ${
                            supplier.supplierNumber
                              ? "text-[12px] text-on-surface-variant"
                              : "font-mono text-xs text-on-surface-variant opacity-40"
                          }`}
                          title={supplier.supplierNumber ?? supplier.id}
                          dir="ltr"
                        >
                          {isolateBidiText(supplier.supplierNumber ?? supplier.id)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="bg-surface-variant text-on-surface px-2 py-1 rounded text-[12px] font-medium">
                      {getSupplierCategoryLabel(locale, supplier.category ?? supplier.service)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">
                    {supplier.supplierType
                      ? getSupplierTypeLabel(locale, supplier.supplierType as SupplierType)
                      : "—"}
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">
                    <span dir="auto">
                      {[supplier.city, supplier.country].filter(Boolean).join(", ") || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {hasRating(supplier) ? (
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-tertiary-fixed-dim fill-current" />
                        <span className="font-semibold text-on-surface tabular-nums" dir="ltr">
                          {formatUiNumber(locale, supplier.rating, {
                            minimumFractionDigits: 1,
                            maximumFractionDigits: 1,
                          })}
                        </span>
                      </div>
                    ) : (
                      <span className="text-on-surface-variant">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge variant={STATUS_VARIANT_MAP[supplier.status]}>
                      {getSupplierStatusLabel(locale, supplier.status)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                    {suppliers.length === 0
                      ? dictionary.states.noSuppliers
                      : dictionary.states.noFilteredSuppliers}
                  </td>
                </tr>
              )}
            </DataTable>
          </div>
        </div>

        {selectedSupplierId && activeSupplier && (
          <div className="w-1/3 bg-surface-container-lowest border border-surface-variant rounded-xl p-6 flex-col hidden lg:flex sticky top-0 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b border-surface-variant pb-6 gap-4">
              <div className="flex min-w-0 flex-1 basis-0 items-start gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-bold text-[24px] shrink-0">
                  {getSupplierInitial(activeSupplier)}
                </div>
                <div className="min-w-0 flex-1">
                  <h3
                    className="text-[20px] leading-[28px] font-semibold text-primary min-w-0 max-h-[56px] overflow-hidden whitespace-normal break-words"
                    title={activeSupplier.name}
                    data-supplier-panel-title="true"
                  >
                    <span dir="auto">{activeSupplier.name}</span>
                  </h3>
                  <div className="flex items-center gap-2 mt-1 min-w-0">
                    <span
                      className={
                        activeSupplier.supplierNumber
                          ? "text-[12px] font-mono text-on-surface-variant"
                          : "max-w-[180px] truncate font-mono text-xs text-on-surface-variant opacity-40"
                      }
                      title={activeSupplier.supplierNumber ?? activeSupplier.id}
                      dir="ltr"
                    >
                      {isolateBidiText(activeSupplier.supplierNumber ?? activeSupplier.id)}
                    </span>
                    <span className="bg-surface-variant text-on-surface px-2 py-0.5 rounded text-[10px] font-bold uppercase shrink-0">
                      {getSupplierCategoryLabel(
                        locale,
                        activeSupplier.category ?? activeSupplier.service,
                      )}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                {canCreateSuppliers && (
                  <>
                    <SupplierBlacklistActions
                      supplier={activeSupplier}
                      dictionary={dictionary.blacklist}
                    />
                    <PendingLink
                      href={`/suppliers/${activeSupplier.id}/edit`}
                      className="text-[12px] font-medium text-primary hover:underline px-2 py-1 rounded hover:bg-surface-variant"
                    >
                      {dictionary.panel.edit}
                    </PendingLink>
                  </>
                )}

                <button
                  type="button"
                  onClick={() => setSelectedSupplierId(null)}
                  className="text-on-surface-variant hover:text-primary"
                  aria-label={dictionary.panel.closeDetails}
                >
                  &times;
                </button>
              </div>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  {dictionary.panel.contactInformation}
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[14px]">
                    <User size={18} className="text-outline" />
                    <span className="text-on-surface font-medium" dir="auto">
                      {activeSupplier.contactName || "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px]">
                    <Phone size={18} className="text-outline" />
                    <span className="text-on-surface" dir="ltr">
                      {activeSupplier.phone
                        ? isolateBidiText(activeSupplier.phone)
                        : "—"}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px]">
                    <Mail size={18} className="text-outline" />
                    <span className="text-on-surface" dir="ltr">
                      {activeSupplier.email
                        ? isolateBidiText(activeSupplier.email)
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>

              {activeSupplier.status === "blacklisted" && activeSupplier.blacklistedReason && (
                <div>
                  <h4 className="text-[12px] font-semibold text-error uppercase tracking-wider mb-3 flex items-center gap-2">
                    <ShieldAlert size={14} />
                    {dictionary.panel.blacklistDetails}
                  </h4>
                  <div className="bg-error-container/20 border border-error/30 rounded-lg p-4 space-y-2 text-[14px]">
                    <div className="text-on-surface-variant">
                      <span className="font-semibold text-error">{dictionary.panel.reason} </span>
                      <span dir="auto">{activeSupplier.blacklistedReason}</span>
                    </div>
                    {activeSupplier.blacklistedAt && (
                      <div className="text-[12px] text-on-surface-variant mt-2 pt-2 border-t border-error/20">
                        {formatSupplierCopy(dictionary.panel.blacklistedOn, {
                          date: formatUiDate(locale, activeSupplier.blacklistedAt),
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  {dictionary.panel.directoryDetails}
                </h4>
                <div className="bg-surface p-4 rounded-lg border border-surface-variant space-y-2 text-[14px]">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-on-surface-variant">{dictionary.panel.status}</span>
                    <StatusBadge variant={STATUS_VARIANT_MAP[activeSupplier.status]}>
                      {getSupplierStatusLabel(locale, activeSupplier.status)}
                    </StatusBadge>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-on-surface-variant">
                      {dictionary.panel.vatRegistration}
                    </span>
                    <span className="text-on-surface font-medium">
                      {getSupplierVatRegistrationLabel(
                        locale,
                        activeSupplier.vatRegistrationStatus,
                      )}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-on-surface-variant">{dictionary.panel.preferred}</span>
                    <span className="flex items-center gap-1 text-on-surface font-medium">
                      {activeSupplier.isPreferred && <CheckCircle2 size={14} />}
                      {activeSupplier.isPreferred
                        ? dictionary.panel.yes
                        : dictionary.panel.no}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  {dictionary.panel.coverage}
                </h4>
                <div className="border border-outline-variant/50 rounded-lg p-3 flex items-start gap-3">
                  <MapPin size={18} className="text-outline mt-0.5" />
                  <div>
                    <div className="text-[14px] font-medium text-on-surface" dir="auto">
                      {[activeSupplier.city, activeSupplier.country].filter(Boolean).join(", ") ||
                        "—"}
                    </div>
                    <div className="text-[12px] text-on-surface-variant mt-1" dir="auto">
                      {activeSupplier.coverageArea ?? dictionary.panel.noCoverage}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  {dictionary.panel.recentActivity}
                </h4>
                <div className="border border-outline-variant/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="p-2 bg-surface rounded">
                    <FileText size={16} className="text-outline" />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-on-surface" dir="auto">
                      {activeSupplier.recentProject
                        ? formatSupplierCopy(dictionary.panel.servicePrefix, {
                            id: activeSupplier.recentProject,
                          })
                        : dictionary.panel.noRecentService}
                    </div>
                    <div className="text-[12px] text-on-surface-variant">
                      {dictionary.panel.liveRecord}
                    </div>
                  </div>
                </div>
              </div>

              {canViewCosting && (
                <div>
                  <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                    {dictionary.panel.internalRateCards}
                  </h4>
                  <SupplierRateCardsList
                    supplierId={activeSupplier.id}
                    dictionary={dictionary.rateCards}
                    locale={locale}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
