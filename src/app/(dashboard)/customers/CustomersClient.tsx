"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import Button from "@/components/ui/Button";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { Plus, Filter, Download, X } from "lucide-react";
import { createCustomer } from "@/lib/customers/actions";
import type { CustomersDictionary } from "@/lib/i18n/dictionaries/customers";
import type { Customer } from "@/types/customer";
import { CustomerCoreFields, CustomerOfficialBillingFields } from "./CustomerFormFields";
import { generateExcelReport } from "@/lib/reports/exportExcel";

export default function CustomersClient({
  customers,
  canWrite,
  canExport,
  generatedBy,
  dictionary,
}: {
  customers: Customer[];
  canWrite: boolean;
  canExport?: boolean;
  generatedBy?: string;
  dictionary: CustomersDictionary;
}) {
  const router = useRouter();
  const { push } = useGlobalNavigationPending();
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

  async function exportCustomers() {
    if (!canExport || filteredCustomers.length === 0) return;

    const date = new Date();
    const dateStr = date.toISOString().split("T")[0];

    const activeFilters = [];
    if (statusFilter !== "all") {
      activeFilters.push(
        `${dictionary.list.report.statusFilter}: ${dictionary.customerStatuses[statusFilter as Customer["status"]]}`
      );
    }
    if (cityFilter !== "all") {
      activeFilters.push(`${dictionary.list.report.cityFilter}: ${cityFilter}`);
    }

    await generateExcelReport<Customer>({
      metadata: {
        companyName: "G SEVEN BLUE Company",
        brandName: "G7 BLUE CRM",
        reportTitle: dictionary.list.report.title,
        generatedAt: date,
        generatedBy: generatedBy || "System Generated",
        filters: activeFilters,
        totalRecords: filteredCustomers.length,
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
      rows: filteredCustomers,
    });
  }

  async function createCustomerFromForm(formData: FormData) {
    setActionError(null);
    startTransition(async () => {
      const result = await createCustomer(formData);

      if (result.success) {
        setShowAddModal(false);
        router.refresh();
      } else {
        setActionError(result.error ?? dictionary.states.unknownError);
      }
    });
  }

  function formatCustomersSummary() {
    if (filteredCustomers.length === 0) {
      return dictionary.list.customersSummaryZero;
    }

    if (dictionary.locale === "ar") {
      return `عرض ${startIndex + 1}-${endIndex} من إجمالي ${filteredCustomers.length} عميل`;
    }

    return `Showing ${startIndex + 1}-${endIndex} of ${filteredCustomers.length} customers`;
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader title={dictionary.list.title} subtitle={dictionary.list.subtitle}>
        {canExport && (
          <Button
            onClick={exportCustomers}
            disabled={customers.length === 0}
            variant="outline"
          >
            <Download size={18} />
            {dictionary.list.export}
          </Button>
        )}
        {canWrite && (
          <Button
            onClick={() => {
              setActionError(null);
              setShowAddModal(true);
            }}
          >
            <Plus size={18} />
            {dictionary.list.addCustomer}
          </Button>
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
                <option value="all">{dictionary.list.allStatuses}</option>
                <option value="active">{dictionary.customerStatuses.active}</option>
                <option value="inactive">{dictionary.customerStatuses.inactive}</option>
                <option value="lead">{dictionary.customerStatuses.lead}</option>
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
                <option value="all">{dictionary.list.allCities}</option>
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
              {formatCustomersSummary()}
            </div>
          </FilterBar>

          <div className="flex-1 overflow-auto">
            {filteredCustomers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 bg-surface-container-lowest border border-surface-variant rounded-b-xl">
                <p className="text-on-surface-variant text-[14px] leading-[20px]">
                  {customers.length === 0
                    ? dictionary.states.noCustomers
                    : dictionary.states.noFilteredCustomers}
                </p>
              </div>
            ) : (
              <DataTable
                columns={[
                  dictionary.list.table.company,
                  dictionary.list.table.contactPerson,
                  dictionary.list.table.location,
                  dictionary.list.table.status,
                  dictionary.list.table.services,
                  dictionary.list.table.quotedValue,
                ]}
              >
                {paginatedCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    onClick={() => push(`/customers/${customer.id}`)}
                    className="hover:bg-surface-container-low/50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div className="font-semibold text-primary">
                        {customer.company}
                      </div>
                      <div dir="ltr" className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                        {customer.customerNumber}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-on-surface">{customer.contact}</div>
                      <div dir="ltr" className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                        {customer.email}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-on-surface-variant">
                      {customer.city}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge variant={customer.status}>
                        {dictionary.customerStatuses[customer.status]}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-4 text-on-surface">
                      {customer.servicesCount}
                    </td>
                    <td dir="ltr" className="px-4 py-4 font-semibold text-on-surface">
                      SAR {customer.totalQuotedAmount.toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </DataTable>
            )}
          </div>

          {filteredCustomers.length > itemsPerPage && (
            <PaginationFooter
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
            />
          )}
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
                onClick={() => setShowAddModal(false)}
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
              <CustomerCoreFields customer={null} dictionary={dictionary} />
              <CustomerOfficialBillingFields customer={null} dictionary={dictionary} />

              <div className="flex justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setShowAddModal(false)}
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
