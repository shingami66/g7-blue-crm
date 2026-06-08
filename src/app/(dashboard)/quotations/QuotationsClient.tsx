"use client";

import { useState } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { Plus, Filter, FileSearch, Trash2, Edit, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { QuotationListItem } from "@/lib/quotations/types";
import { softDeleteQuotation } from "@/lib/quotations/actions";

interface QuotationsClientProps {
  quotations: QuotationListItem[];
  canWrite: boolean;
}

export default function QuotationsClient({ quotations, canWrite }: QuotationsClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setError(null);

    const confirmed = window.confirm("Are you sure you want to delete this quotation?");
    if (!confirmed) return;

    const result = await softDeleteQuotation(id);
    if (!result.success) {
      setError(result.error || "Failed to delete quotation.");
    } else {
      router.refresh();
    }
  };

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Quotations"
        subtitle="Manage client proposals, event estimates, and approvals."
      >
        {canWrite && (
          <Link 
            href="/quotations/new"
            className="flex items-center gap-2 bg-primary hover:bg-primary-container text-on-primary px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors"
          >
            <Plus size={18} />
            New Quotation
          </Link>
        )}
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
            Showing {quotations.length} quotations
          </div>
        </FilterBar>

        {error && (
          <div className="mx-4 mt-4 flex items-center gap-2 p-3 bg-error-container text-on-error-container rounded-lg text-[14px]">
            <AlertCircle size={18} />
            {error}
          </div>
        )}

        <div className="flex-1 overflow-auto">
          {quotations.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-on-surface-variant">
              <p>No quotations found.</p>
              {canWrite && <p className="text-[14px]">Click "New Quotation" to create one.</p>}
            </div>
          ) : (
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
              {quotations.map((q) => (
                <tr
                  key={q.id}
                  className="hover:bg-surface-container-low/50 transition-colors cursor-pointer"
                  onClick={() => router.push(`/quotations/${q.id}`)}
                >
                  <td className="px-4 py-4 font-mono font-semibold text-primary">
                    {q.quotationNumber}
                  </td>
                  <td className="px-4 py-4">
                    <div className="font-semibold text-on-surface">
                      {q.customer?.company || "Unknown Company"}
                    </div>
                    <div className="text-[12px] leading-[16px] text-on-surface-variant mt-1">
                      {q.event}
                    </div>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant">{q.date}</td>
                  <td className="px-4 py-4 font-semibold text-on-surface">
                    {q.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                      
                      {canWrite && (
                        <>
                          {q.status === "draft" ? (
                            <button
                              className="text-primary hover:text-primary-container p-1 rounded transition-colors"
                              title="Edit Quotation"
                              onClick={(e) => {
                                e.stopPropagation();
                                router.push(`/quotations/${q.id}/edit`);
                              }}
                            >
                              <Edit size={18} />
                            </button>
                          ) : (
                            <button
                              className="text-on-surface-variant opacity-50 p-1 rounded cursor-not-allowed"
                              title="Only draft quotations can be edited"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Edit size={18} />
                            </button>
                          )}

                          <button
                            className={`p-1 rounded transition-colors ${
                              q.status === "approved"
                                ? "text-on-surface-variant opacity-50 cursor-not-allowed"
                                : "text-on-surface-variant hover:text-error hover:bg-error-container"
                            }`}
                            title={q.status === "approved" ? "Approved quotations cannot be deleted" : "Delete Quotation"}
                            onClick={(e) => {
                              if (q.status !== "approved") {
                                handleDelete(e, q.id);
                              } else {
                                e.stopPropagation();
                              }
                            }}
                            disabled={q.status === "approved"}
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>

        {/* Pagination Footer */}
        {quotations.length > 0 && (
          <div className="bg-surface-container-lowest border-t border-surface-variant p-4 flex justify-between items-center rounded-b-xl border border-t-0">
            <button className="px-3 py-1 bg-surface border border-outline-variant rounded text-[14px] text-on-surface hover:bg-surface-container-low">
              Previous
            </button>
            <div className="flex gap-1">
              <button className="w-8 h-8 flex items-center justify-center rounded bg-primary text-white text-[14px] font-semibold">
                1
              </button>
            </div>
            <button className="px-3 py-1 bg-surface border border-outline-variant rounded text-[14px] text-on-surface hover:bg-surface-container-low">
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
