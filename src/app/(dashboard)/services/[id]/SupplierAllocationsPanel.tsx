import type { ComponentProps } from "react";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";

type SupplierAllocationsPanelProps = {
  allocations: SupplierAllocation[];
  canReadCost: boolean;
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
}: SupplierAllocationsPanelProps) {
  const hasAllocations = allocations.length > 0;

  const baseColumns = ["Status", "Supplier", "Category", "Item", "Unit", "Qty", "Cost Source"];
  const costColumns = canReadCost ? ["Unit Cost", "Total Cost"] : [];
  const columns = [...baseColumns, ...costColumns];

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
        <h3 className="font-semibold text-primary">Supplier Allocations</h3>
      </div>
      
      {!hasAllocations ? (
        <div className="p-8 text-center text-on-surface-variant text-[14px]">
          No supplier allocations recorded for this service yet.
        </div>
      ) : (
        <DataTable columns={columns}>
          {allocations.map((a) => (
            <tr key={a.id}>
              <td className="px-4 py-3 align-top">
                <StatusBadge variant={STATUS_VARIANT_MAP[a.status] || "draft"}>
                  {STATUS_LABEL_MAP[a.status] || a.status}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 align-top font-medium text-on-surface">
                {a.supplierName || a.supplierId}
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
            </tr>
          ))}
        </DataTable>
      )}
    </section>
  );
}
