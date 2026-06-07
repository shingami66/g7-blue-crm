"use client";

import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { Plus, Filter, Download } from "lucide-react";
import { customersData } from "@/lib/data/customers";
import { useState } from "react";

export default function CustomersPage() {
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);

  const activeCustomer = customersData.find((c) => c.id === selectedCustomer);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Customers"
        subtitle="Manage your client relationships and contact information."
      >
        <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Download size={18} />
          Export
        </button>
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Plus size={18} />
          Add Customer
        </button>
      </PageHeader>

      <div className="flex flex-1 gap-6 min-h-0 relative">
        {/* Main Table Area */}
        <div
          className={`flex-1 flex flex-col transition-all duration-300 ${
            selectedCustomer ? "w-2/3" : "w-full"
          }`}
        >
          <FilterBar>
            <div className="relative">
              <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary">
                <option>All Statuses</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Potential</option>
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="relative">
              <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary">
                <option>All Cities</option>
                <option>Riyadh</option>
                <option>Jeddah</option>
                <option>Dammam</option>
                <option>NEOM</option>
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
              Showing 5 of 1,248 customers
            </div>
          </FilterBar>

          <div className="flex-1 overflow-auto">
            <DataTable
              columns={[
                "Company",
                "Contact Person",
                "Location",
                "Status",
                "Projects",
                "Revenue",
              ]}
            >
              {customersData.map((customer) => (
                <tr
                  key={customer.id}
                  onClick={() => setSelectedCustomer(customer.id)}
                  className={`hover:bg-surface-container-low/50 cursor-pointer transition-colors ${
                    selectedCustomer === customer.id ? "bg-primary-fixed/20" : ""
                  }`}
                >
                  <td className="px-4 py-4">
                    <div className="font-semibold text-primary">
                      {customer.company}
                    </div>
                    <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                      {customer.id}
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="text-on-surface">{customer.contact}</div>
                    <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                      {customer.email}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">
                    {customer.city}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge variant={customer.status as any}>
                      {customer.status.charAt(0).toUpperCase() +
                        customer.status.slice(1)}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4 text-on-surface">{customer.projects}</td>
                  <td className="px-4 py-4 font-semibold text-on-surface">
                    {customer.revenue}
                  </td>
                </tr>
              ))}
            </DataTable>
          </div>
        </div>

        {/* Side Detail Panel */}
        {selectedCustomer && activeCustomer && (
          <div className="w-1/3 bg-surface-container-lowest border border-surface-variant rounded-xl p-6 flex flex-col hidden lg:flex sticky top-0 h-fit max-h-[calc(100vh-8rem)] overflow-y-auto">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                  {activeCustomer.company}
                </h3>
                <p className="text-[14px] leading-[20px] text-on-surface-variant">
                  {activeCustomer.id}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-on-surface-variant hover:text-primary"
              >
                &times;
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase mb-2">
                  Contact Information
                </h4>
                <div className="bg-surface p-4 rounded-lg space-y-3">
                  <div>
                    <div className="text-[12px] leading-[16px] text-on-surface-variant">
                      Primary Contact
                    </div>
                    <div className="font-medium text-on-surface">
                      {activeCustomer.contact}
                    </div>
                  </div>
                  <div>
                    <div className="text-[12px] leading-[16px] text-on-surface-variant">
                      Email
                    </div>
                    <a
                      href={`mailto:${activeCustomer.email}`}
                      className="font-medium text-primary hover:underline"
                    >
                      {activeCustomer.email}
                    </a>
                  </div>
                  <div>
                    <div className="text-[12px] leading-[16px] text-on-surface-variant">
                      Phone
                    </div>
                    <div className="font-medium text-on-surface">
                      {activeCustomer.phone}
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase mb-2">
                  Business Summary
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface p-4 rounded-lg">
                    <div className="text-[12px] leading-[16px] text-on-surface-variant mb-1">
                      Total Projects
                    </div>
                    <div className="text-[20px] leading-[28px] font-semibold text-primary">
                      {activeCustomer.projects}
                    </div>
                  </div>
                  <div className="bg-surface p-4 rounded-lg">
                    <div className="text-[12px] leading-[16px] text-on-surface-variant mb-1">
                      Total Revenue
                    </div>
                    <div className="text-[20px] leading-[28px] font-semibold text-primary">
                      {activeCustomer.revenue}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-auto pt-6 flex gap-3">
              <button className="flex-1 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low py-2 rounded-lg font-semibold transition-colors">
                Edit Profile
              </button>
              <button className="flex-1 bg-primary text-on-primary hover:bg-primary-container py-2 rounded-lg font-semibold transition-colors">
                New Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
