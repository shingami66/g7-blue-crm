"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { Plus, Filter, Download, X } from "lucide-react";
import { createCustomer } from "@/lib/customers/actions";
import type { Customer } from "@/types/customer";
import { CustomerCoreFields, CustomerOfficialBillingFields } from "./CustomerFormFields";

export default function CustomersClient({
  customers,
  canWrite,
}: {
  customers: Customer[];
  canWrite: boolean;
}) {
  const router = useRouter();
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const cities = Array.from(new Set(customers.map((customer) => customer.city))).sort();

  const filteredCustomers = customers.filter((customer) => {
    if (statusFilter !== "all" && customer.status !== statusFilter) return false;
    if (cityFilter !== "all" && customer.city !== cityFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filteredCustomers.length);
  const paginatedCustomers = filteredCustomers.slice(startIndex, startIndex + itemsPerPage);

  function exportCustomers() {
    if (filteredCustomers.length === 0) return;

    const headers = [
      "Customer Number",
      "Company",
      "Contact Person",
      "Email",
      "Phone",
      "City",
      "Status",
      "Projects",
      "Revenue",
    ];

    const rows = filteredCustomers.map((customer) => [
      escapeCsv(customer.customerNumber),
      escapeCsv(customer.company),
      escapeCsv(customer.contact),
      escapeCsv(customer.email),
      escapeCsv(customer.phone),
      escapeCsv(customer.city),
      escapeCsv(customer.status),
      escapeCsv(customer.projects),
      escapeCsv(customer.revenue),
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const date = new Date().toISOString().split("T")[0];

    link.setAttribute("href", url);
    link.setAttribute("download", `g7-blue-customers-${date}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  async function createCustomerFromForm(formData: FormData) {
    setActionError(null);
    startTransition(async () => {
      const result = await createCustomer(formData);

      if (result.success) {
        setShowAddModal(false);
        router.refresh();
      } else {
        setActionError(result.error ?? "Unknown error");
      }
    });
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Customers"
        subtitle="Manage your client relationships and contact information."
      >
        <button
          type="button"
          onClick={exportCustomers}
          disabled={customers.length === 0}
          className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={18} />
          Export
        </button>
        {canWrite && (
          <button
            type="button"
            onClick={() => {
              setActionError(null);
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors"
          >
            <Plus size={18} />
            Add Customer
          </button>
        )}
      </PageHeader>

      <div className="flex flex-1 min-h-0">
        <div className="flex-1 flex flex-col">
          <FilterBar>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">All Statuses</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="lead">Lead</option>
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="relative">
              <select
                value={cityFilter}
                onChange={(event) => {
                  setCityFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
              {filteredCustomers.length === 0
                ? "Showing 0 of 0 customers"
                : `Showing ${startIndex + 1}-${endIndex} of ${filteredCustomers.length} customers`}
            </div>
          </FilterBar>

          <div className="flex-1 overflow-auto">
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-surface-container-lowest border border-surface-variant rounded-b-xl">
                <p className="text-on-surface-variant text-[14px] leading-[20px]">
                  {customers.length === 0
                    ? "No customers yet. Click \"Add Customer\" to get started."
                    : "No customers match the selected filters."}
                </p>
              </div>
            ) : (
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
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => router.push(`/customers/${customer.id}`)}
                    className="hover:bg-surface-container-low/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-primary">
                        {customer.company}
                      </div>
                      <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                        {customer.customerNumber}
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
                      <StatusBadge variant={customer.status}>
                        {customer.status.charAt(0).toUpperCase() +
                          customer.status.slice(1)}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-on-surface">
                      {customer.projects}
                    </td>
                    <td className="px-4 py-4 font-semibold text-on-surface">
                      {customer.revenue}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>

          {filteredCustomers.length > itemsPerPage && (
            <div className="bg-surface-container-lowest border-t border-surface-variant p-4 flex justify-between items-center rounded-b-xl border border-x-0 border-b-0">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1 bg-surface border border-outline-variant rounded text-[14px] text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Previous
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 flex items-center justify-center rounded text-[14px] font-semibold transition-colors ${
                      currentPage === page
                        ? "bg-primary text-white"
                        : "bg-surface text-on-surface hover:bg-surface-container-low border border-transparent hover:border-outline-variant"
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-3 py-1 bg-surface border border-outline-variant rounded text-[14px] text-on-surface hover:bg-surface-container-low disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                Add Customer
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-on-surface-variant hover:text-primary"
                aria-label="Close add customer"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={createCustomerFromForm} className="space-y-4">
              <CustomerCoreFields customer={null} />
              <CustomerOfficialBillingFields customer={null} />

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-lg text-[14px] font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isPending ? "Creating..." : "Create Customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function escapeCsv(csvValue: string | number | null | undefined) {
  if (csvValue === null || csvValue === undefined) return '""';

  const serializedValue = String(csvValue);
  if (
    serializedValue.includes(",") ||
    serializedValue.includes('"') ||
    serializedValue.includes("\n")
  ) {
    return `"${serializedValue.replace(/"/g, '""')}"`;
  }

  return serializedValue;
}
