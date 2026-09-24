import type { ComponentProps } from "react";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import DataTable from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/components/ui/data-table-contract";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";
import { UiBidiText, UiLtrText, UiMoneyText, UiNumberText } from "@/components/i18n/UiValueText";
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

function AllocationMoney({ locale, value, currency }: { locale: Locale; value: number | null; currency: string }) {
  if (value === null) return "—";
  return currency === "SAR"
    ? <UiMoneyText locale={locale} value={value} />
    : <UiLtrText>{formatAllocationMoney(locale, value, currency)}</UiLtrText>;
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
  showSupplierHistory?: boolean;
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
  showSupplierHistory = false,
  dictionary,
}: SupplierAllocationsPanelProps) {
  const panelDictionary = dictionary.supplierAllocations;
  const activeBookingIds = new Set(activeBookingAllocationIds);
  const hasAllocations = allocations.length > 0;
  const isServiceEditable =
    serviceStatus !== "Completed" && serviceStatus !== "Cancelled";

  const costColumns: DataTableColumn[] = canReadCost ? [
    { key: "unit-cost", header: panelDictionary.columns.unitCost, align: "end", kind: "money" },
    { key: "total-cost", header: panelDictionary.columns.totalCost, align: "end", kind: "money" },
  ] : [];

  const columns: DataTableColumn[] = [
    { key: "status", header: panelDictionary.columns.status, align: "center", kind: "status" },
    { key: "supplier", header: panelDictionary.columns.supplier, align: "start", kind: "text" },
    { key: "category", header: panelDictionary.columns.category, align: "start", kind: "text" },
    { key: "item", header: panelDictionary.columns.item, align: "start", kind: "text" },
    { key: "unit", header: panelDictionary.columns.unit, align: "start", kind: "text" },
    { key: "quantity", header: panelDictionary.columns.qty, align: "end", kind: "number" },
    { key: "cost-source", header: panelDictionary.columns.costSource, align: "start", kind: "text" },
    ...costColumns,
    { key: "actions", header: panelDictionary.columns.actions, align: "end", kind: "actions" },
  ];

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
                  !showSupplierHistory
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {panelDictionary.tabs.active}
              </Link>
              <Link
                href={`/services/${serviceId}?showSupplierHistory=true`}
                className={`rounded-full px-3 py-1 transition-colors ${
                  showSupplierHistory
                    ? "bg-primary-container text-on-primary-container font-semibold"
                    : "text-on-surface-variant hover:bg-surface-variant"
                }`}
              >
                {panelDictionary.tabs.history}
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
        <>
          <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
            {allocations.map((allocation) => (
              <MobileAllocationCard
                key={allocation.id}
                allocation={allocation}
                canReadCost={canReadCost}
                canWrite={canWrite}
                canCancel={canCancel}
                isServiceEditable={isServiceEditable}
                activeBooking={activeBookingIds.has(allocation.id)}
                serviceId={serviceId}
                locale={dictionary.locale}
                dictionary={panelDictionary}
              />
            ))}
          </div>
          <div className="hidden lg:block">
          <DataTable columns={columns}>
          {allocations.map((a) => (
            <tr key={a.id} className={a.isDeleted ? "opacity-60 bg-surface-container-lowest grayscale-[0.5]" : ""}>
              <td className="px-4 py-3 align-top">
                <StatusBadge variant={a.isDeleted ? "cancelled" : STATUS_VARIANT_MAP[a.status] || "draft"}>
                  {a.isDeleted ? panelDictionary.statusLabels.deleted : panelDictionary.statusLabels[a.status] || a.status}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 align-top font-medium text-on-surface">
                <UiBidiText>{a.supplierName || "—"}</UiBidiText>
                {a.isDeleted && <span className="block text-[11px] text-error mt-1 font-semibold">{panelDictionary.deletedRecord}</span>}
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                <UiBidiText>{a.category}</UiBidiText>
              </td>
              <td className="px-4 py-3 align-top text-on-surface">
                <UiBidiText>{a.itemName}</UiBidiText>
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                <UiBidiText>{a.unit}</UiBidiText>
              </td>
              <td className="px-4 py-3 align-top text-on-surface">
                <UiNumberText locale={dictionary.locale} value={a.quantity} />
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
                  <td className="px-4 py-3 align-top text-on-surface">
                    <AllocationMoney locale={dictionary.locale} value={a.estimatedUnitCost} currency={a.currency} />
                  </td>
                  <td className="px-4 py-3 align-top font-semibold text-on-surface">
                    <AllocationMoney locale={dictionary.locale} value={a.estimatedTotalCost} currency={a.currency} />
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
          </div>
        </>
      )}
    </section>
  );
}

function MobileAllocationCard({ allocation, canReadCost, canWrite, canCancel, isServiceEditable, activeBooking, serviceId, locale, dictionary }: { allocation: SupplierAllocation; canReadCost: boolean; canWrite?: boolean; canCancel?: boolean; isServiceEditable: boolean; activeBooking: boolean; serviceId?: string; locale: Locale; dictionary: ServicesDictionary["supplierAllocations"] }) {
  const editable = !allocation.isDeleted && allocation.status !== "cancelled" && isServiceEditable && !activeBooking;
  return (
    <article className="rounded-lg border border-outline-variant bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold text-on-surface"><UiBidiText>{allocation.supplierName || "—"}</UiBidiText></p>
          <p className="mt-1 text-[12px] text-on-surface-variant"><UiBidiText>{allocation.itemName}</UiBidiText></p>
        </div>
        <StatusBadge variant={allocation.isDeleted ? "cancelled" : STATUS_VARIANT_MAP[allocation.status] || "draft"}>
          {allocation.isDeleted ? dictionary.statusLabels.deleted : dictionary.statusLabels[allocation.status] || allocation.status}
        </StatusBadge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <dt className="text-on-surface-variant">{dictionary.columns.category}</dt>
          <dd className="mt-1 text-on-surface"><UiBidiText>{allocation.category}</UiBidiText></dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">{dictionary.columns.qty}</dt>
          <dd className="mt-1 text-on-surface"><UiNumberText locale={locale} value={allocation.quantity} />{" "}<UiBidiText>{allocation.unit}</UiBidiText></dd>
        </div>
        {canReadCost && (
          <div>
            <dt className="text-on-surface-variant">{dictionary.columns.totalCost}</dt>
            <dd className="mt-1 font-semibold text-on-surface">
              <AllocationMoney locale={locale} value={allocation.estimatedTotalCost} currency={allocation.currency} />
            </dd>
          </div>
        )}
      </dl>
      {editable && (
        <div className="mt-4 flex flex-wrap gap-3 border-t border-outline-variant pt-3">
          {canWrite && <SupplierAllocationStatusActions allocationId={allocation.id} status={allocation.status} dictionary={dictionary.statusActions} />}
          {canWrite && canReadCost && <PendingLink href={`/services/${serviceId}/allocations/${allocation.id}/edit`} className="text-[13px] font-semibold text-primary hover:underline">{dictionary.actions.edit}</PendingLink>}
          {canCancel && <PendingLink href={`/services/${serviceId}/allocations/${allocation.id}/cancel`} className="text-[13px] font-semibold text-error hover:underline">{dictionary.actions.cancel}</PendingLink>}
          {canWrite && <PendingLink href={`/services/${serviceId}/allocations/${allocation.id}/delete`} className="text-[13px] font-semibold text-error hover:underline">{dictionary.actions.delete}</PendingLink>}
        </div>
      )}
      {allocation.isDeleted && canWrite && allocation.costSource === "manual_estimate" && isServiceEditable && (
        <div className="mt-4 border-t border-outline-variant pt-3">
          <PendingLink href={`/services/${serviceId}/allocations/${allocation.id}/restore`} className="text-[13px] font-semibold text-primary hover:underline">{dictionary.actions.restore}</PendingLink>
        </div>
      )}
      {activeBooking && <p className="mt-3 text-[12px] text-on-surface-variant">{dictionary.activeBookingLock}</p>}
    </article>
  );
}
