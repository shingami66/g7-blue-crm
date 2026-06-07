"use client";

import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { Plus, Filter, FileSearch } from "lucide-react";
import { quotationsData } from "@/lib/data/quotations";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function QuotationsPage() {
  const router = useRouter();

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Quotations"
        subtitle="Manage client proposals, event estimates, and approvals."
      >
        <button className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Plus size={18} />
          New Quotation
        </button>
      </PageHeader>

      <div className="flex-1 flex flex-col min-h-0">
        <FilterBar>
          <div className="relative">
            <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary">
              <option>All Statuses</option>
              <option>Draft</option>
              <option>Sent</option>
              <option>Approved</option>
              <option>Rejected</option>
            </select>
            <Filter
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>
          <div className="relative">
            <input
              type="month"
              className="appearance-none bg-surface border border-outline-variant rounded-lg px-3 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary"
            />
          </div>
          <div className="text-[14px] leading-[20px] text-on-surface-variant ml-auto">
            Showing 5 of 342 quotations
          </div>
        </FilterBar>

        <div className="flex-1 overflow-auto">
          <DataTable
            columns={[
              "Quote Number",
              "Client / Event",
              "Issue Date",
              "Amount (SAR)",
              "Status",
              "Actions",
            ]}
          >
            {quotationsData.map((q) => (
              <tr
                key={q.id}
                className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                onClick={() => router.push(`/quotations/${q.id}`)}
              >
                <td className="px-4 py-4 font-mono font-semibold text-primary">
                  {q.id}
                </td>
                <td className="px-4 py-4">
                  <div className="font-semibold text-on-surface">
                    {q.customer}
                  </div>
                  <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                    {q.event}
                  </div>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">{q.date}</td>
                <td className="px-4 py-4 font-semibold text-on-surface">
                  {q.amount}
                </td>
                <td className="px-4 py-4">
                  <StatusBadge variant={q.status as any}>
                    {q.status.charAt(0).toUpperCase() + q.status.slice(1)}
                  </StatusBadge>
                </td>
                <td className="px-4 py-4">
                  <div className="flex gap-2">
                    <button
                      className="text-primary hover:text-primary-container p-1 rounded transition-colors"
                      title="View Details"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/quotations/${q.id}`);
                      }}
                    >
                      <FileSearch size={18} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>

        {/* Pagination Footer */}
        <div className="bg-surface-container-lowest border-t border-surface-variant p-4 flex justify-between items-center rounded-b-xl border border-t-0">
          <button className="px-3 py-1 bg-surface border border-outline-variant rounded text-[14px] text-on-surface hover:bg-surface-container-low">
            Previous
          </button>
          <div className="flex gap-1">
            <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white text-[14px] font-semibold">
              1
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-container-low text-[14px]">
              2
            </button>
            <button className="w-8 h-8 flex items-center justify-center rounded text-on-surface hover:bg-surface-container-low text-[14px]">
              3
            </button>
            <span className="w-8 h-8 flex items-center justify-center text-on-surface-variant">
              ...
            </span>
          </div>
          <button className="px-3 py-1 bg-surface border border-outline-variant rounded text-[14px] text-on-surface hover:bg-surface-container-low">
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
