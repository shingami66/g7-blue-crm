"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import Button from "@/components/ui/Button";
import PendingLink from "@/components/ui/PendingLink";
import { Eye, Filter, Plus } from "lucide-react";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { Service } from "@/types/service";

const STATUS_VARIANT_MAP: Record<string, string> = {
  "Inquiry": "inquiry",
  "Quoted": "quoted",
  "Approved": "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  "Completed": "completed",
  "Cancelled": "cancelled",
};

const TABLE_HEADER_BASE =
  "px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase";
const TABLE_CELL_BASE = "px-4 py-4 align-top";
const COLUMN_LAYOUT = {
  serviceNumber: "w-[16%] min-w-[160px] text-left",
  serviceTitle: "w-[26%] min-w-[240px] text-left",
  customer: "w-[18%] min-w-[180px] text-left",
  eventDate: "w-[12%] min-w-[130px] text-center",
  status: "w-[12%] min-w-[120px] text-center",
  budget: "w-[10%] min-w-[140px] text-right",
  view: "w-[6%] min-w-[110px] text-center",
} as const;

interface ServicesClientProps {
  services: Service[];
  canWrite: boolean;
  dictionary: ServicesDictionary;
}

export default function ServicesClient({ services, canWrite, dictionary }: ServicesClientProps) {
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filtered = services.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;
    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, filtered.length);
  const paginatedServices = filtered.slice(startIndex, startIndex + itemsPerPage);

  function formatServicesSummary() {
    if (filtered.length === 0) {
      return dictionary.list.showingZero;
    }

    return dictionary.list.showingRange
      .replace("{start}", String(startIndex + 1))
      .replace("{end}", String(endIndex))
      .replace("{total}", String(filtered.length));
  }

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={dictionary.list.title}
        subtitle={dictionary.list.subtitle}
      >
        {canWrite && (
          <Button asChild>
            <PendingLink href="/services/new">
              <Plus size={18} />
              {dictionary.list.newService}
            </PendingLink>
          </Button>
        )}
      </PageHeader>

      <div className="flex-1 flex flex-col min-h-0">
        <FilterBar>
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
            >
              <option value="all">{dictionary.list.allStatuses}</option>
              <option value="Inquiry">{dictionary.serviceStatuses.Inquiry}</option>
              <option value="Quoted">{dictionary.serviceStatuses.Quoted}</option>
              <option value="Approved">{dictionary.serviceStatuses.Approved}</option>
              <option value="Deposit Paid">{dictionary.serviceStatuses["Deposit Paid"]}</option>
              <option value="In Progress">{dictionary.serviceStatuses["In Progress"]}</option>
              <option value="Completed">{dictionary.serviceStatuses.Completed}</option>
              <option value="Cancelled">{dictionary.serviceStatuses.Cancelled}</option>
            </select>
            <Filter
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>
          <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
            {formatServicesSummary()}
          </div>
        </FilterBar>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-surface-container-lowest border border-surface-variant rounded-b-xl">
              <p className="text-on-surface-variant text-[14px] leading-[20px]">
                {services.length === 0
                  ? canWrite
                    ? dictionary.states.noServices
                    : dictionary.states.noServicesFound
                  : dictionary.states.noFilteredServices}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full border border-surface-variant rounded-b-xl bg-surface-container-lowest">
              <table className="w-full min-w-[1120px] table-fixed border-collapse text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.serviceNumber}`}>
                      {dictionary.list.table.serviceNumber}
                    </th>
                    <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.serviceTitle}`}>
                      {dictionary.list.table.serviceTitle}
                    </th>
                    <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.customer}`}>
                      {dictionary.list.table.customer}
                    </th>
                    <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.eventDate}`}>
                      {dictionary.list.table.eventDate}
                    </th>
                    <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.status}`}>
                      {dictionary.list.table.status}
                    </th>
                    <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.budget}`}>
                      {dictionary.list.table.budget}
                    </th>
                    <th className={`${TABLE_HEADER_BASE} ${COLUMN_LAYOUT.view}`}>
                      {dictionary.list.actions.view}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                  {paginatedServices.map((service) => (
                    <tr key={service.id} className="hover:bg-surface-container-low/50 transition-colors">
                      <td dir="ltr" className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.serviceNumber} font-mono font-semibold text-primary`}>
                        {isolateBidiText(service.serviceNumber)}
                      </td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.serviceTitle}`}>
                        <div dir="auto" className="font-semibold text-on-surface">
                          {isolateBidiText(service.serviceTitle)}
                        </div>
                        <div dir="auto" className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                          {service.eventName ? isolateBidiText(service.eventName) : "—"}
                        </div>
                      </td>
                      <td dir="auto" className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.customer} text-on-surface-variant`}>
                        {service.customer?.company ? isolateBidiText(service.customer.company) : "—"}
                      </td>
                      <td dir="ltr" className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.eventDate} text-on-surface-variant`}>
                        {service.eventStartDate ? isolateBidiText(service.eventStartDate) : "—"}
                      </td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.status}`}>
                        <div className="flex justify-center">
                          <StatusBadge variant={(STATUS_VARIANT_MAP[service.status] ?? "pending") as React.ComponentProps<typeof StatusBadge>["variant"]}>
                            {dictionary.serviceStatuses[service.status]}
                          </StatusBadge>
                        </div>
                      </td>
                      <td dir="ltr" className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.budget} font-semibold text-on-surface`}>
                        {service.estimatedBudget != null
                          ? isolateBidiText(`${Number(service.estimatedBudget).toLocaleString("en-SA")} SAR`)
                          : "—"}
                      </td>
                      <td className={`${TABLE_CELL_BASE} ${COLUMN_LAYOUT.view}`}>
                        <div className="flex justify-center">
                          <PendingLink
                            href={`/services/${service.id}`}
                            aria-label={`${dictionary.list.actions.view} ${service.serviceNumber}`}
                            title={`${dictionary.list.actions.view} ${service.serviceNumber}`}
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-outline-variant bg-surface-container-lowest px-3 py-1.5 text-[12px] font-semibold text-on-surface transition-colors hover:border-primary/40 hover:bg-surface-container hover:text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/40 whitespace-nowrap"
                          >
                            <Eye size={14} />
                            {dictionary.list.actions.view}
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

        {filtered.length > itemsPerPage && (
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
          />
        )}
      </div>
    </div>
  );
}
