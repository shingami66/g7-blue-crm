import type { ComponentProps } from "react";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import { Plus } from "lucide-react";

type SupplierAllocationsPanelProps = {
  allocations: SupplierAllocation[];
  canReadCost: boolean;
  canWrite?: boolean;
  canCancel?: boolean;
  serviceId?: string;
  serviceStatus?: string;
  showDeleted?: boolean;
};

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<SupplierAllocation["status"], StatusBadgeVariant> = {
  draft: "draft",
  planned: "planning",
  selected: "confirmed",
  cancelled: "cancelled",
};

const STATUS_LABEL_MAP: Record<SupplierAllocation["status"], string> = {
  draft: "Draft",
  planned: "Planned",
  selected: "Selected",
  cancelled: "Cancelled",
};

export default function SupplierAllocationsPanel({
  allocations,
  canReadCost,
  canWrite,
  canCancel,
  serviceId,
  serviceStatus,
  showDeleted = false,
}: SupplierAllocationsPanelProps) {
  const hasAllocations = allocations.length > 0;

  const baseColumns = ["Status", "Supplier", "Category", "Item", "Unit", "Qty", "Cost Source"];
  const costColumns = canReadCost ? ["Unit Cost", "Total Cost"] : [];
  const actionColumns = [""]; // Empty header for actions
  const columns = [...baseColumns, ...costColumns, ...actionColumns];

  const canCreate = canWrite && canReadCost && serviceStatus !== "Completed" && serviceStatus !== "Cancelled";

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center gap-4">
        <div className="flex items-center gap-4">
          <h3 className="font-semibold text-primary">Supplier Allocations</h3>
          {serviceId && (
            <div className="flex items-center gap-2 text-[13px]">
              <Link
                href={`/services/${serviceId}`}
                className={`px-3 py-1 rounded-full transition-colors ${
                  !showDeleted
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                Active
              </Link>
              <Link
                href={`/services/${serviceId}?showDeleted=true`}
                className={`px-3 py-1 rounded-full transition-colors ${
                  showDeleted
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                Show Deleted
              </Link>
            </div>
          )}
        </div>
        {canCreate && serviceId && (
          <Link
            href={`/services/${serviceId}/allocations/new`}
            className="flex items-center gap-2 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[13px] font-semibold transition-colors"
          >
            <Plus size={16} />
            New Allocation
          </Link>
        )}
      </div>
      
      {!hasAllocations ? (
        <div className="p-8 text-center text-on-surface-variant text-[14px]">
          No supplier allocations recorded for this service yet.
        </div>
      ) : (
        <DataTable columns={columns}>
          {allocations.map((a) => (
            <tr key={a.id} className={a.isDeleted ? "opacity-60 bg-surface-container-lowest grayscale-[0.5]" : ""}>
              <td className="px-4 py-3 align-top">
                <StatusBadge variant={a.isDeleted ? "cancelled" : STATUS_VARIANT_MAP[a.status] || "draft"}>
                  {a.isDeleted ? "Deleted" : STATUS_LABEL_MAP[a.status] || a.status}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 align-top font-medium text-on-surface">
                {a.supplierName || a.supplierId}
                {a.isDeleted && <span className="block text-[11px] text-error mt-1 font-semibold">Deleted Record</span>}
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                {a.category}
              </td>
              <td className="px-4 py-3 align-top text-on-surface">
                {a.itemName}
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                {a.unit}
              </td>
              <td className="px-4 py-3 align-top text-on-surface">
                {a.quantity}
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                {a.costSource === "manual_estimate" ? "Manual" : "Rate Card"}
                {a.approvedQuotationId && (
                  <span className="block text-[11px] text-primary mt-1">Quoted</span>
                )}
              </td>
              {canReadCost && (
                <>
                  <td className="px-4 py-3 align-top text-on-surface text-right">
                    {a.estimatedUnitCost !== null 
                      ? `${a.estimatedUnitCost.toLocaleString("en-SA", { minimumFractionDigits: 2 })} ${a.currency}` 
                      : "—"}
                  </td>
                  <td className="px-4 py-3 align-top text-on-surface text-right font-semibold">
                    {a.estimatedTotalCost !== null 
                      ? `${a.estimatedTotalCost.toLocaleString("en-SA", { minimumFractionDigits: 2 })} ${a.currency}` 
                      : "—"}
                  </td>
                </>
              )}
              <td className="px-4 py-3 align-top text-right">
                <div className="flex items-center justify-end gap-3">
                  {!a.isDeleted && canWrite && canReadCost && a.status !== "cancelled" && a.costSource === "manual_estimate" && serviceStatus !== "Completed" && serviceStatus !== "Cancelled" && (
                    <Link
                      href={`/services/${serviceId}/allocations/${a.id}/edit`}
                      className="text-[13px] font-semibold text-primary hover:underline"
                    >
                      Edit
                    </Link>
                  )}
                  {!a.isDeleted && canCancel && a.status !== "cancelled" && serviceStatus !== "Completed" && serviceStatus !== "Cancelled" && (
                    <Link
                      href={`/services/${serviceId}/allocations/${a.id}/cancel`}
                      className="text-[13px] font-semibold text-error hover:underline"
                    >
                      Cancel
                    </Link>
                  )}
                  {!a.isDeleted && canWrite && serviceStatus !== "Completed" && serviceStatus !== "Cancelled" && (
                    <Link
                      href={`/services/${serviceId}/allocations/${a.id}/delete`}
                      className="text-[13px] font-semibold text-error hover:underline"
                    >
                      Delete
                    </Link>
                  )}
                  {a.isDeleted && canWrite && serviceStatus !== "Completed" && serviceStatus !== "Cancelled" && (
                    <Link
                      href={`/services/${serviceId}/allocations/${a.id}/restore`}
                      className="text-[13px] font-semibold text-primary hover:underline"
                    >
                      Restore
                    </Link>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </DataTable>
      )}
    </section>
  );
}
