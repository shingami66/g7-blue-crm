"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { Plus, Filter, Download, Pencil, Trash2, X } from "lucide-react";
import { createCustomer, updateCustomer, softDeleteCustomer } from "@/lib/customers/actions";
import type { Customer } from "@/types/customer";

export default function CustomersClient({ customers }: { customers: Customer[] }) {
  const router = useRouter();
  const [selectedCustomer, setSelectedCustomer] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");

  const activeCustomer = customers.find((c) => c.id === selectedCustomer);

  // Derive unique cities from data
  const cities = Array.from(new Set(customers.map((c) => c.city))).sort();

  // Apply filters
  const filtered = customers.filter((c) => {
    if (statusFilter !== "all" && c.status !== statusFilter) return false;
    if (cityFilter !== "all" && c.city !== cityFilter) return false;
    return true;
  });

  // -----------------------------------------------------------------------
  // Handlers
  // -----------------------------------------------------------------------
  function handleExport() {
    if (customers.length === 0) return;

    const headers = [
      "Company",
      "Contact Person",
      "Email",
      "Phone",
      "City",
      "Status",
      "Projects",
      "Revenue"
    ];

    const escapeCsv = (val: string | number | null | undefined) => {
      if (val === null || val === undefined) return '""';
      const str = String(val);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = customers.map((c) => [
      escapeCsv(c.company),
      escapeCsv(c.contact),
      escapeCsv(c.email),
      escapeCsv(c.phone),
      escapeCsv(c.city),
      escapeCsv(c.status),
      escapeCsv(c.projects),
      escapeCsv(c.revenue),
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
  async function handleCreate(formData: FormData) {
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

  async function handleUpdate(formData: FormData) {
    if (!selectedCustomer) return;
    setActionError(null);
    startTransition(async () => {
      const result = await updateCustomer(selectedCustomer, formData);
      if (result.success) {
        setShowEditModal(false);
        router.refresh();
      } else {
        setActionError(result.error ?? "Unknown error");
      }
    });
  }

  async function handleDelete() {
    if (!selectedCustomer) return;
    setActionError(null);
    startTransition(async () => {
      const result = await softDeleteCustomer(selectedCustomer);
      if (result.success) {
        setShowDeleteConfirm(false);
        setSelectedCustomer(null);
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
          onClick={handleExport}
          disabled={customers.length === 0}
          className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Download size={18} />
          Export
        </button>
        <button
          onClick={() => { setActionError(null); setShowAddModal(true); }}
          className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors"
        >
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
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                onChange={(e) => setCityFilter(e.target.value)}
                className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">All Cities</option>
                {cities.map((city) => (
                  <option key={city} value={city}>{city}</option>
                ))}
              </select>
              <Filter
                size={14}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
              Showing {filtered.length} of {customers.length} customers
            </div>
          </FilterBar>

          <div className="flex-1 overflow-auto">
            {filtered.length === 0 ? (
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
                {filtered.map((customer) => (
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
                        {customer.id.slice(0, 8)}
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
                    <td className="px-4 py-4 text-on-surface">{customer.projects}</td>
                    <td className="px-4 py-4 font-semibold text-on-surface">
                      {customer.revenue}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
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
                  {activeCustomer.id.slice(0, 8)}
                </p>
              </div>
              <button
                onClick={() => setSelectedCustomer(null)}
                className="text-on-surface-variant hover:text-primary"
              >
                <X size={18} />
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
              <button
                onClick={() => { setActionError(null); setShowEditModal(true); }}
                className="flex-1 flex items-center justify-center gap-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low py-2 rounded-lg font-semibold transition-colors"
              >
                <Pencil size={16} />
                Edit Profile
              </button>
              <button
                onClick={() => { setActionError(null); setShowDeleteConfirm(true); }}
                className="flex items-center justify-center gap-2 bg-surface-container-lowest border border-error text-error hover:bg-error-container/30 px-4 py-2 rounded-lg font-semibold transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ================================================================= */}
      {/* ADD CUSTOMER MODAL                                                 */}
      {/* ================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                Add Customer
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-on-surface-variant hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Company *
                  </label>
                  <input
                    name="company"
                    required
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Contact Person *
                  </label>
                  <input
                    name="contact"
                    required
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="Contact name"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Phone *
                  </label>
                  <input
                    name="phone"
                    required
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="+966 5X XXX XXXX"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    City *
                  </label>
                  <input
                    name="city"
                    required
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                    placeholder="Riyadh"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue="lead"
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

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

      {/* ================================================================= */}
      {/* EDIT CUSTOMER MODAL                                                */}
      {/* ================================================================= */}
      {showEditModal && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-lg mx-4 shadow-xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
                Edit Customer
              </h3>
              <button
                onClick={() => setShowEditModal(false)}
                className="text-on-surface-variant hover:text-primary"
              >
                <X size={18} />
              </button>
            </div>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <form action={handleUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Company *
                  </label>
                  <input
                    name="company"
                    required
                    defaultValue={activeCustomer.company}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Contact Person *
                  </label>
                  <input
                    name="contact"
                    required
                    defaultValue={activeCustomer.contact}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Phone *
                  </label>
                  <input
                    name="phone"
                    required
                    defaultValue={activeCustomer.phone}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Email *
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    defaultValue={activeCustomer.email}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    City *
                  </label>
                  <input
                    name="city"
                    required
                    defaultValue={activeCustomer.city}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-[12px] leading-[16px] font-semibold text-on-surface-variant uppercase tracking-[0.05em] mb-1">
                    Status
                  </label>
                  <select
                    name="status"
                    defaultValue={activeCustomer.status}
                    className="w-full bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
                  >
                    <option value="lead">Lead</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-lg text-[14px] font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50"
                >
                  {isPending ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* DELETE CONFIRMATION MODAL                                          */}
      {/* ================================================================= */}
      {showDeleteConfirm && activeCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-surface-container-lowest border border-surface-variant rounded-2xl p-6 w-full max-w-sm mx-4 shadow-xl">
            <h3 className="text-[20px] leading-[28px] font-semibold text-on-surface mb-2">
              Delete Customer
            </h3>
            <p className="text-[14px] leading-[20px] text-on-surface-variant mb-6">
              Are you sure you want to delete{" "}
              <span className="font-semibold text-on-surface">
                {activeCustomer.company}
              </span>
              ? This action can be undone by an administrator.
            </p>

            {actionError && (
              <div className="mb-4 p-3 bg-error-container/30 border border-error/30 rounded-lg text-error text-[13px]">
                {actionError}
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low rounded-lg text-[14px] font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="px-4 py-2 bg-error hover:bg-error/80 text-on-error rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50"
              >
                {isPending ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
