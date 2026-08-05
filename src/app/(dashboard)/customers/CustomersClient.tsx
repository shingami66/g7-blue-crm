"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import Button from "@/components/ui/Button";
import PendingLink from "@/components/ui/PendingLink";
import ModuleSearchInput from "@/components/ui/ModuleSearchInput";
import { Eye, Plus, Filter, Download, X } from "lucide-react";
import { createCustomer } from "@/lib/customers/actions";
import {
  formatCustomersSummaryCopy,
  getCustomerStatusLabel,
  type CustomersDictionary,
} from "@/lib/i18n/dictionaries/customers";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import type { Customer } from "@/types/customer";
import { matchesLocalSearch } from "@/lib/search/local";
import { CustomerCoreFields, CustomerOfficialBillingFields } from "./CustomerFormFields";
import { generateExcelReport } from "@/lib/reports/exportExcel";

const TABLE_HEADER_BASE =
  "px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase";
const TABLE_CELL_BASE = "px-4 py-4 align-top";
const COLUMN_LAYOUT = {
  company: "w-[28%] min-w-[240px] text-start",
  contact: "w-[24%] min-w-[220px] text-start",
  location: "w-[12%] min-w-[120px] text-start",
  status: "w-[12%] min-w-[120px] text-center",
  services: "w-[10%] min-w-[110px] text-center",
  quotedValue: "w-[14%] min-w-[140px] text-end",
  view: "w-[10%] min-w-[110px] text-center",
} as const;

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
  const [showAddModal, setShowAddModal] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [statusFilter, setStatusFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const cities = Array.from(new Set(customers.map((customer) => customer.city))).sort();

  const filteredCustomers = customers.filter((customer) => {
    if (statusFilter !== "all" && customer.status !== statusFilter) return false;
    if (cityFilter !== "all" && customer.city !== cityFilter) return false;
    if (!matchesLocalSearch(searchTerm, [customer.customerNumber, customer.company, customer.contact, customer.phone, customer.email])) return false;
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
        `${dictionary.list.report.statusFilter}: ${getCustomerStatusLabel(dictionary.locale, statusFilter as Customer["status"])}`
      );
    }
    if (cityFilter !== "all") {
      activeFilters.push(`${dictionary.list.report.cityFilter}: ${cityFilter}`);
    }

    await generateExcelReport<Customer>({
      locale: dictionary.locale,
      chrome: dictionary.list.report.chrome,
      metadata: {
        companyName: "G SEVEN BLUE Company",
        brandName: "G7 BLUE CRM",
        reportTitle: dictionary.list.report.title,
        generatedAt: date,
        generatedBy:
          generatedBy || dictionary.list.report.chrome.systemGenerated,
        filters: activeFilters,
        totalRecords: filteredCustomers.length,
        sheetName: dictionary.list.report.chrome.defaultSheetName,
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
        setActionError(getLocalizedActionError(result.error, dictionary));
      }
    });
  }

  function formatCustomersSummary() {
    if (filteredCustomers.length === 0) {
      return dictionary.list.customersSummaryZero;
    }

    return formatCustomersSummaryCopy(dictionary.list.customersSummary, {
      range: isolateBidiText(`${startIndex + 1}-${endIndex}`),
      total: isolateBidiText(String(filteredCustomers.length)),
    });
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
            <ModuleSearchInput
              value={searchTerm}
              onChange={(value) => {
                setSearchTerm(value);
                setCurrentPage(1);
              }}
              placeholder={dictionary.list.searchPlaceholder}
              ariaLabel={dictionary.list.searchPlaceholder}
              className="w-full max-w-sm sm:min-w-[240px] sm:flex-1"
            />
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(event) => {
                  setStatusFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-surface border border-outline-variant rounded-lg ps-3 pe-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
              >
                <option value="all">{dictionary.list.allStatuses}</option>
                <option value="active">{getCustomerStatusLabel(dictionary.locale, "active")}</option>
                <option value="inactive">{getCustomerStatusLabel(dictionary.locale, "inactive")}</option>
                <option value="lead">{getCustomerStatusLabel(dictionary.locale, "lead")}</option>
              </select>
              <Filter
                size={14}
                className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
              />
            </div>
            <div className="relative">
              <select
                value={cityFilter}
                onChange={(event) => {
                  setCityFilter(event.target.value);
                  setCurrentPage(1);
                }}
                className="appearance-none bg-surface border border-outline-variant rounded-lg ps-3 pe-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
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
                className="absolute end-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
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
              <div className="overflow-x-auto w-full border border-surface-variant rounded-b-xl bg-surface-container-lowest">
                <table className="w-full min-w-[1060px] table-fixed border-collapse text-start">
                  <thead>
                    <tr className="bg-surface-container-low border-b border-surface-variant">
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.company}`}>
                        {dictionary.list.table.company}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.contact}`}>
                        {dictionary.list.table.contactPerson}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.location}`}>
                        {dictionary.list.table.location}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.status}`}>
                        {dictionary.list.table.status}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.services}`}>
                        {dictionary.list.table.services}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.quotedValue}`}>
                        {dictionary.list.table.quotedValue}
                      </th>
                      <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.view}`}>
                        {dictionary.list.actions.view}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                    {paginatedCustomers.map((customer) => (
                      <tr key={customer.id} className="hover:bg-surface-container-low/50 transition-colors">
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.company}`}>
                          <div className="font-semibold text-primary">
                            <span dir="auto">{customer.company}</span>
                          </div>
                          <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                            <span dir="ltr" className="inline-block whitespace-nowrap">
                              {customer.customerNumber}
                            </span>
                          </div>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.contact}`}>
                          <div className="text-on-surface">
                            <span dir="auto">{customer.contact}</span>
                          </div>
                          <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                            <span dir="ltr" className="inline-block whitespace-nowrap">
                              {customer.email}
                            </span>
                          </div>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.location} text-on-surface-variant`}>
                          <span dir="auto">{customer.city}</span>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.status}`}>
                          <div className="flex justify-center">
                            <StatusBadge variant={customer.status}>
                              {getCustomerStatusLabel(dictionary.locale, customer.status)}
                            </StatusBadge>
                          </div>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.services} font-semibold text-on-surface tabular-nums`}>
                          <span dir="ltr" className="inline-block whitespace-nowrap">
                            {formatUiNumber(dictionary.locale, customer.servicesCount)}
                          </span>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.quotedValue} font-semibold text-on-surface tabular-nums`}>
                          <span dir="ltr" className="inline-block whitespace-nowrap">
                            {formatSarAmount(dictionary.locale, customer.totalQuotedAmount)}
                          </span>
                        </td>
                        <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.view}`}>
                          <div className="flex justify-center">
                            <PendingLink
                              href={`/customers/${customer.id}?returnTo=%2Fcustomers`}
                              aria-label={`${dictionary.list.actions.view} ${customer.customerNumber}`}
                              title={`${dictionary.list.actions.view} ${customer.customerNumber}`}
                              className="inline-flex rounded p-2 text-primary hover:bg-primary-fixed"
                            >
                              <Eye size={17} />
                            </PendingLink>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
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

function getLocalizedActionError(
  error: string | undefined,
  dictionary: CustomersDictionary,
): string {
  if (error === "Unauthorized") return dictionary.states.unauthorized;
  if (error === "Forbidden") return dictionary.states.forbidden;
  if (error === "Validation failed") return dictionary.states.validationFailed;
  return error ? dictionary.states.actionFailed : dictionary.states.unknownError;
}
