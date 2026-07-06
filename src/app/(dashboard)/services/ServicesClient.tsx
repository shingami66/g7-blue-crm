"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import Button from "@/components/ui/Button";
import PendingLink from "@/components/ui/PendingLink";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { Filter, Plus } from "lucide-react";
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

interface ServicesClientProps {
  services: Service[];
  canWrite: boolean;
  dictionary: ServicesDictionary;
}

export default function ServicesClient({ services, canWrite, dictionary }: ServicesClientProps) {
  const { push } = useGlobalNavigationPending();
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
            <DataTable
              columns={[
                dictionary.list.table.serviceNumber,
                dictionary.list.table.serviceTitle,
                dictionary.list.table.customer,
                dictionary.list.table.eventDate,
                dictionary.list.table.status,
                dictionary.list.table.budget,
              ]}
            >
              {paginatedServices.map((service) => (
                <tr
                  key={service.id}
                  className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  onClick={() => push(`/services/${service.id}`)}
                >
                  <td dir="ltr" className="px-4 py-4 font-mono font-semibold text-primary">
                    {isolateBidiText(service.serviceNumber)}
                  </td>
                  <td className="px-4 py-4">
                    <div dir="auto" className="font-semibold text-on-surface">
                      {isolateBidiText(service.serviceTitle)}
                    </div>
                    <div dir="auto" className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                      {service.eventName ? isolateBidiText(service.eventName) : "—"}
                    </div>
                  </td>
                  <td dir="auto" className="px-4 py-4 text-on-surface-variant">
                    {service.customer?.company ? isolateBidiText(service.customer.company) : "—"}
                  </td>
                  <td dir="ltr" className="px-4 py-4 text-on-surface-variant">
                    {service.eventStartDate ? isolateBidiText(service.eventStartDate) : "—"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge variant={(STATUS_VARIANT_MAP[service.status] ?? "pending") as React.ComponentProps<typeof StatusBadge>["variant"]}>
                      {dictionary.serviceStatuses[service.status]}
                    </StatusBadge>
                  </td>
                  <td dir="ltr" className="px-4 py-4 font-semibold text-on-surface">
                    {service.estimatedBudget != null
                      ? isolateBidiText(`${Number(service.estimatedBudget).toLocaleString("en-SA")} SAR`)
                      : "—"}
                  </td>
                </tr>
              ))}
            </DataTable>
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
