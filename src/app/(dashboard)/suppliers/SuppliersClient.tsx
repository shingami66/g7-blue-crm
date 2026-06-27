"use client";

import type { ComponentProps } from "react";
import { useMemo, useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable from "@/components/ui/DataTable";
import { Filter, Search, Star, Phone, Mail, FileText, CheckCircle2, User, MapPin } from "lucide-react";
import type { Supplier, SupplierStatus } from "@/types/supplier";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_OPTIONS: SupplierStatus[] = ["active", "on_hold", "blacklisted", "inactive"];

const STATUS_VARIANT_MAP: Record<SupplierStatus, StatusBadgeVariant> = {
  active: "active",
  on_hold: "pending",
  blacklisted: "draft",
  inactive: "inactive",
};

function formatOption(value: string | null) {
  if (!value) return "-";

  return value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatStatus(value: SupplierStatus) {
  return formatOption(value);
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
}: {
  suppliers: Supplier[];
  loadError?: "suppliers_load_failed";
}) {
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
      <PageHeader
        title="Supplier Network"
        subtitle="Review live supplier directory records from the database."
      />

      {loadError && (
        <div className="mb-4 rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-[14px] font-medium text-on-error-container">
          Suppliers could not be loaded right now.
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
                placeholder="Search suppliers..."
                className="w-64 pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value)}
                className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                {STATUS_OPTIONS.map((status) => (
                  <option key={status} value={status}>
                    {formatStatus(status)}
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
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {formatOption(category)}
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
                ? "Showing 0 suppliers"
                : `Showing ${filteredSuppliers.length} of ${suppliers.length} suppliers`}
            </div>
          </FilterBar>

          <div className="flex-1 overflow-auto">
            <DataTable columns={["Supplier", "Category", "Type", "Location", "Rating", "Status"]}>
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
                          {supplier.name}
                          {supplier.isPreferred && (
                            <Star size={14} className="text-tertiary-fixed-dim fill-current" />
                          )}
                        </div>
                        <div className="text-[12px] text-on-surface-variant mt-0.5">
                          {supplier.supplierNumber ?? supplier.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="bg-surface-variant text-on-surface px-2 py-1 rounded text-[12px] font-medium">
                      {formatOption(supplier.category ?? supplier.service)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">
                    {formatOption(supplier.supplierType)}
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">
                    {[supplier.city, supplier.country].filter(Boolean).join(", ") || "-"}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Star size={16} className="text-tertiary-fixed-dim fill-current" />
                      <span className="font-semibold text-on-surface">{supplier.rating.toFixed(1)}</span>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge variant={STATUS_VARIANT_MAP[supplier.status]}>
                      {formatStatus(supplier.status)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-on-surface-variant">
                    {suppliers.length === 0
                      ? "No suppliers found in the live directory."
                      : "No suppliers match the selected filters."}
                  </td>
                </tr>
              )}
            </DataTable>
          </div>
        </div>

        {selectedSupplierId && activeSupplier && (
          <div className="w-1/3 bg-surface-container-lowest border border-surface-variant rounded-xl p-6 flex-col hidden lg:flex sticky top-0 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b border-surface-variant pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-bold text-[24px]">
                  {getSupplierInitial(activeSupplier)}
                </div>
                <div>
                  <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                    {activeSupplier.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] font-mono text-on-surface-variant">
                      {activeSupplier.supplierNumber ?? activeSupplier.id}
                    </span>
                    <span className="bg-surface-variant text-on-surface px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {formatOption(activeSupplier.category ?? activeSupplier.service)}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSupplierId(null)}
                className="text-on-surface-variant hover:text-primary"
                aria-label="Close supplier details"
              >
                &times;
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  Contact Information
                </h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-[14px]">
                    <User size={18} className="text-outline" />
                    <span className="text-on-surface font-medium">{activeSupplier.contactName || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px]">
                    <Phone size={18} className="text-outline" />
                    <span className="text-on-surface">{activeSupplier.phone || "-"}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px]">
                    <Mail size={18} className="text-outline" />
                    <span className="text-on-surface">{activeSupplier.email ?? "-"}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  Directory Details
                </h4>
                <div className="bg-surface p-4 rounded-lg border border-surface-variant space-y-2 text-[14px]">
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-on-surface-variant">Status</span>
                    <StatusBadge variant={STATUS_VARIANT_MAP[activeSupplier.status]}>
                      {formatStatus(activeSupplier.status)}
                    </StatusBadge>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-on-surface-variant">VAT Registration</span>
                    <span className="text-on-surface font-medium">
                      {formatOption(activeSupplier.vatRegistrationStatus)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center gap-4">
                    <span className="text-on-surface-variant">Preferred</span>
                    <span className="flex items-center gap-1 text-on-surface font-medium">
                      {activeSupplier.isPreferred && <CheckCircle2 size={14} />}
                      {activeSupplier.isPreferred ? "Yes" : "No"}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  Coverage
                </h4>
                <div className="border border-outline-variant/50 rounded-lg p-3 flex items-start gap-3">
                  <MapPin size={18} className="text-outline mt-0.5" />
                  <div>
                    <div className="text-[14px] font-medium text-on-surface">
                      {[activeSupplier.city, activeSupplier.country].filter(Boolean).join(", ") || "-"}
                    </div>
                    <div className="text-[12px] text-on-surface-variant mt-1">
                      {activeSupplier.coverageArea ?? "No coverage area recorded."}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  Recent Activity
                </h4>
                <div className="border border-outline-variant/50 rounded-lg p-3 flex items-center gap-3">
                  <div className="p-2 bg-surface rounded">
                    <FileText size={16} className="text-outline" />
                  </div>
                  <div>
                    <div className="text-[14px] font-medium text-on-surface">
                      {activeSupplier.recentProject
                        ? `Contract ${activeSupplier.recentProject}`
                        : "No recent project recorded"}
                    </div>
                    <div className="text-[12px] text-on-surface-variant">
                      Live supplier directory record
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
