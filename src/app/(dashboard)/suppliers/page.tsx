"use client";

import type { ComponentProps } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import { Plus, Filter, Search, Star, Phone, Mail, FileText, CheckCircle2, User } from "lucide-react";
import { suppliersData } from "@/lib/data/suppliers";
import { useState } from "react";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];
type SupplierStatus = (typeof suppliersData)[number]["status"];

const getSupplierStatusBadgeVariant = (
  status: SupplierStatus,
): StatusBadgeVariant => {
  if (status === "blacklisted") {
    return "draft";
  }

  return status;
};

export default function SuppliersPage() {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const activeSupplier = suppliersData.find((s) => s.id === selectedSupplier);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Supplier Network"
        subtitle="Manage vendors, sub-contractors, and procurement partners."
      >
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Plus size={18} />
          Add Supplier
        </button>
      </PageHeader>

      <div className="flex flex-1 gap-6 min-h-0 relative">
        {/* Main Table Area */}
        <div
          className={`flex-1 flex flex-col bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden transition-all duration-300 ${
            selectedSupplier ? "w-2/3" : "w-full"
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
                placeholder="Search suppliers..."
                className="w-64 pl-9 pr-4 py-2 bg-surface border border-outline-variant rounded-lg text-[14px] text-on-surface focus:outline-none focus:border-primary"
              />
            </div>
            <div className="relative">
              <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary">
                <option>All Services</option>
                <option>Production</option>
                <option>A/V Tech</option>
                <option>Structures</option>
                <option>Manpower</option>
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
          </FilterBar>

          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low border-b border-surface-variant">
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Supplier
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Service Type
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Rating
                  </th>
                  <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px]">
                {suppliersData.map((sup) => (
                  <tr
                    key={sup.id}
                    onClick={() => setSelectedSupplier(sup.id)}
                    className={`hover:bg-surface-container-low/50 cursor-pointer transition-colors ${
                      selectedSupplier === sup.id ? "bg-primary-fixed/20" : ""
                    }`}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded bg-primary-fixed flex items-center justify-center text-primary font-bold text-[16px]">
                          {sup.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-semibold text-primary">
                            {sup.name}
                          </div>
                          <div className="text-[12px] text-on-surface-variant mt-0.5">
                            {sup.id}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="bg-surface-variant text-on-surface px-2 py-1 rounded text-[12px] font-medium">
                        {sup.service}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <Star size={16} className="text-tertiary-fixed-dim fill-current" />
                        <span className="font-semibold text-on-surface">{sup.rating}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge variant={getSupplierStatusBadgeVariant(sup.status)}>
                        {sup.status.charAt(0).toUpperCase() + sup.status.slice(1)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Side Detail Panel */}
        {selectedSupplier && activeSupplier && (
          <div className="w-1/3 bg-surface-container-lowest border border-surface-variant rounded-xl p-6 flex flex-col hidden lg:flex sticky top-0 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="flex justify-between items-start mb-6 border-b border-surface-variant pb-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-lg bg-primary-fixed flex items-center justify-center text-primary font-bold text-[24px]">
                  {activeSupplier.name.charAt(0)}
                </div>
                <div>
                  <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                    {activeSupplier.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[12px] font-mono text-on-surface-variant">{activeSupplier.id}</span>
                    <span className="bg-surface-variant text-on-surface px-2 py-0.5 rounded text-[10px] font-bold uppercase">
                      {activeSupplier.service}
                    </span>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedSupplier(null)}
                className="text-on-surface-variant hover:text-primary"
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
                    <span className="text-on-surface font-medium">{activeSupplier.contact}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px]">
                    <Phone size={18} className="text-outline" />
                    <span className="text-on-surface">{activeSupplier.phone}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[14px]">
                    <Mail size={18} className="text-outline" />
                    <span className="text-primary hover:underline cursor-pointer">
                      contact@supplier.com
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  Compliance & Terms
                </h4>
                <div className="bg-surface p-4 rounded-lg border border-surface-variant space-y-2 text-[14px]">
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Vendor Reg.</span>
                    <span className="flex items-center gap-1 text-status-completed-text text-[12px] font-semibold">
                      <CheckCircle2 size={14} /> Approved
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-on-surface-variant">Payment Terms</span>
                    <span className="text-on-surface font-medium">Net 30</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mb-3">
                  Recent Activity
                </h4>
                <div className="border border-outline-variant/50 rounded-lg p-3 flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-surface rounded">
                      <FileText size={16} className="text-outline" />
                    </div>
                    <div>
                      <div className="text-[14px] font-medium text-on-surface">Contract {activeSupplier.recentProject}</div>
                      <div className="text-[12px] text-on-surface-variant">Last active: 2 days ago</div>
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
