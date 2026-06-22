"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PaginationFooter from "@/components/ui/PaginationFooter";
import { Filter, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
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
}

export default function ServicesClient({ services, canWrite }: ServicesClientProps) {
  const router = useRouter();
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

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Services"
        subtitle="Manage client services, event bookings, and operational workflow."
      >
        {canWrite && (
          <Link
            href="/services/new"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-[14px] font-semibold hover:bg-primary-container transition-colors"
          >
            <Plus size={18} />
            New Service
          </Link>
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
              <option value="all">All Statuses</option>
              <option value="Inquiry">Inquiry</option>
              <option value="Quoted">Quoted</option>
              <option value="Approved">Approved</option>
              <option value="Deposit Paid">Deposit Paid</option>
              <option value="In Progress">In Progress</option>
              <option value="Completed">Completed</option>
              <option value="Cancelled">Cancelled</option>
            </select>
            <Filter
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>
          <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
            {filtered.length === 0
              ? "Showing 0 of 0 services"
              : `Showing ${startIndex + 1}-${endIndex} of ${filtered.length} services`}
          </div>
        </FilterBar>

        <div className="flex-1 overflow-auto">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 bg-surface-container-lowest border border-surface-variant rounded-b-xl">
              <p className="text-on-surface-variant text-[14px] leading-[20px]">
                {services.length === 0
                  ? canWrite
                    ? "No services yet. Create your first service to get started."
                    : "No services found."
                  : "No services match the selected filters."}
              </p>
            </div>
          ) : (
            <DataTable
              columns={[
                "Service Number",
                "Service Title / Event Name",
                "Customer",
                "Event Date",
                "Status",
                "Budget",
              ]}
            >
              {paginatedServices.map((service) => (
                <tr
                  key={service.id}
                  className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/services/${service.id}`)}
                >
                  <td className="px-4 py-4 font-mono font-semibold text-primary">
                    {service.serviceNumber}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-on-surface">
                      {service.serviceTitle}
                    </div>
                    <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                      {service.eventName || "—"}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">
                    {service.customer?.company || "—"}
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">
                    {service.eventStartDate || "—"}
                  </td>
                  <td className="px-4 py-4">
                    <StatusBadge variant={(STATUS_VARIANT_MAP[service.status] ?? "pending") as React.ComponentProps<typeof StatusBadge>["variant"]}>
                      {service.status}
                    </StatusBadge>
                  </td>
                  <td className="px-4 py-4 font-semibold text-on-surface">
                    {service.estimatedBudget != null
                      ? `${Number(service.estimatedBudget).toLocaleString("en-SA")} SAR`
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
