import type { ComponentProps } from "react";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";
import Link from "next/link";
import { Plus } from "lucide-react";
import SupplierAllocationStatusActions from "./SupplierAllocationStatusActions";

function formatAllocationMoney(locale: Locale, value: number, currency: string) {
  if (currency === "SAR") {
    return formatSarAmount(locale, value);
  }

  return `${formatUiNumber(locale, value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

type SupplierAllocationsPanelProps = {
  allocations: SupplierAllocation[];
  activeBookingAllocationIds?: string[];
  loadError?: boolean;
  canReadCost: boolean;
  canWrite?: boolean;
  canCancel?: boolean;
  serviceId?: string;
  serviceStatus?: string;
  showDeleted?: boolean;
  dictionary: ServicesDictionary;
};

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<SupplierAllocation["status"], StatusBadgeVariant> = {
  draft: "draft",
  planned: "planning",
  selected: "confirmed",
  cancelled: "cancelled",
};

export default function SupplierAllocationsPanel({
  allocations,
  activeBookingAllocationIds = [],
  loadError = false,
  canReadCost,
  canWrite,
  canCancel,
  serviceId,
  serviceStatus,
  showDeleted = false,
  dictionary,
}: SupplierAllocationsPanelProps) {
  const panelDictionary = dictionary.supplierAllocations;
  const activeBookingIds = new Set(activeBookingAllocationIds);
  const hasAllocations = allocations.length > 0;
  const isServiceEditable =
    serviceStatus !== "Completed" && serviceStatus !== "Cancelled";

  const baseColumns = [
    panelDictionary.columns.status,
    panelDictionary.columns.supplier,
    panelDictionary.columns.category,
    panelDictionary.columns.item,
    panelDictionary.columns.unit,
    panelDictionary.columns.qty,
    panelDictionary.columns.costSource,
  ];
  const costColumns = canReadCost
    ? [panelDictionary.columns.unitCost, panelDictionary.columns.totalCost]
    : [];
  const actionColumns = [panelDictionary.columns.actions];
  const columns = [...baseColumns, ...costColumns, ...actionColumns];

  const canCreate = canWrite && canReadCost && isServiceEditable;

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden mt-6">
      <div className="flex min-w-0 flex-col gap-3 border-b border-surface-variant bg-surface-bright px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
          <h3 className="min-w-0 font-semibold text-primary">{panelDictionary.title}</h3>
          {serviceId && (
            <div className="flex min-w-0 flex-wrap items-center gap-2 text-[13px]">
              <Link
                href={`/services/${serviceId}`}
                className={`rounded-full px-3 py-1 transition-colors ${
                  !showDeleted
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {panelDictionary.tabs.active}
              </Link>
              <Link
                href={`/services/${serviceId}?showDeleted=true`}
                className={`rounded-full px-3 py-1 transition-colors ${
                  showDeleted
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {panelDictionary.tabs.showDeleted}
              </Link>
            </div>
          )}
        </div>
        {canCreate && serviceId && (
          <PendingLink
            href={`/services/${serviceId}/allocations/new`}
            className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-primary px-3 py-1.5 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-container"
          >
            <Plus size={16} />
            {panelDictionary.actions.newAllocation}
          </PendingLink>
        )}
      </div>
      
      {loadError ? (
        <div className="p-8 text-center text-error text-[14px]" role="alert">
          {panelDictionary.loadError}
        </div>
      ) : !hasAllocations ? (
        <div className="p-8 text-center text-on-surface-variant text-[14px]">
          {panelDictionary.empty}
        </div>
      ) : (
        <DataTable columns={columns}>
          {allocations.map((a) => (
            <tr key={a.id} className={a.isDeleted ? "opacity-60 bg-surface-container-lowest grayscale-[0.5]" : ""}>
              <td className="px-4 py-3 align-top">
                <StatusBadge variant={a.isDeleted ? "cancelled" : STATUS_VARIANT_MAP[a.status] || "draft"}>
                  {a.isDeleted ? panelDictionary.statusLabels.deleted : panelDictionary.statusLabels[a.status] || a.status}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 align-top font-medium text-on-surface">
                <span dir="auto">{isolateBidiText(a.supplierName || a.supplierId)}</span>
                {a.isDeleted && <span className="block text-[11px] text-error mt-1 font-semibold">{panelDictionary.deletedRecord}</span>}
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                <span dir="auto">{isolateBidiText(a.category)}</span>
              </td>
              <td className="px-4 py-3 align-top text-on-surface">
                <span dir="auto">{isolateBidiText(a.itemName)}</span>
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                <span dir="ltr">{isolateBidiText(a.unit)}</span>
              </td>
              <td dir="ltr" className="px-4 py-3 align-top text-on-surface tabular-nums">
                {formatUiNumber(dictionary.locale, a.quantity)}
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                {a.costSource === "manual_estimate"
                  ? panelDictionary.costSourceLabels.manual
                  : panelDictionary.costSourceLabels.rateCard}
                {a.approvedQuotationId && (
                  <span className="block text-[11px] text-primary mt-1">{panelDictionary.costSourceLabels.quoted}</span>
                )}
              </td>
              {canReadCost && (
                <>
                  <td dir="ltr" className="px-4 py-3 align-top text-end text-on-surface tabular-nums">
                    {a.estimatedUnitCost !== null
                      ? formatAllocationMoney(
                          dictionary.locale,
                          a.estimatedUnitCost,
                          a.currency,
                        )
                      : "—"}
                  </td>
                  <td dir="ltr" className="px-4 py-3 align-top text-end font-semibold text-on-surface tabular-nums">
                    {a.estimatedTotalCost !== null
                      ? formatAllocationMoney(
                          dictionary.locale,
                          a.estimatedTotalCost,
                          a.currency,
                        )
                      : "—"}
                  </td>
                </>
              )}
              <td className="px-4 py-3 align-top text-end">
                <div className="flex flex-col items-end gap-2">
                  <div className="flex flex-wrap items-center justify-end gap-3">
                    {!a.isDeleted && canWrite && a.status !== "cancelled" && isServiceEditable && !activeBookingIds.has(a.id) && (
                      <SupplierAllocationStatusActions
                        allocationId={a.id}
                        status={a.status}
                        dictionary={panelDictionary.statusActions}
                      />
                    )}
                    {!a.isDeleted && canWrite && canReadCost && a.status !== "cancelled" && a.costSource === "manual_estimate" && isServiceEditable && !activeBookingIds.has(a.id) && (
                      <PendingLink
                        href={`/services/${serviceId}/allocations/${a.id}/edit`}
                        className="text-[13px] font-semibold text-primary hover:underline"
                      >
                        {panelDictionary.actions.edit}
                      </PendingLink>
                    )}
                    {!a.isDeleted && canCancel && a.status !== "cancelled" && isServiceEditable && !activeBookingIds.has(a.id) && (
                      <PendingLink
                        href={`/services/${serviceId}/allocations/${a.id}/cancel`}
                        className="text-[13px] font-semibold text-error hover:underline"
                      >
                        {panelDictionary.actions.cancel}
                      </PendingLink>
                    )}
                    {!a.isDeleted && canWrite && a.costSource === "manual_estimate" && isServiceEditable && !activeBookingIds.has(a.id) && (
                      <PendingLink
                        href={`/services/${serviceId}/allocations/${a.id}/delete`}
                        className="text-[13px] font-semibold text-error hover:underline"
                      >
                        {panelDictionary.actions.delete}
                      </PendingLink>
                    )}
                    {a.isDeleted && canWrite && a.costSource === "manual_estimate" && isServiceEditable && (
                      <PendingLink
                        href={`/services/${serviceId}/allocations/${a.id}/restore`}
                        className="text-[13px] font-semibold text-primary hover:underline"
                      >
                        {panelDictionary.actions.restore}
                      </PendingLink>
                    )}
                  </div>
                  {!a.isDeleted && activeBookingIds.has(a.id) && (
                    <span className="max-w-[240px] text-end text-[11px] font-medium text-on-surface-variant">
                      {panelDictionary.activeBookingLock}
                    </span>
                  )}
                  {!a.isDeleted && a.status === "selected" && !activeBookingIds.has(a.id) && (
                    <span className="max-w-[220px] text-end text-[11px] font-medium text-on-surface-variant">
                      {panelDictionary.selectedHint}
                    </span>
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
