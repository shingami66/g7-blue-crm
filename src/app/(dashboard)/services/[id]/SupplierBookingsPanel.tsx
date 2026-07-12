import type { ComponentProps } from "react";
import type { SupplierBooking } from "@/lib/supplier-bookings/types";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount, formatUiDateTime, formatUiNumber } from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";
import SupplierBookingActions, {
  CreateSupplierBookingButton,
} from "./SupplierBookingActions";

function formatBookingMoney(locale: Locale, value: number | null, currency: string) {
  if (value === null) return "—";
  if (currency === "SAR") {
    return formatSarAmount(locale, value);
  }
  return `${formatUiNumber(locale, value, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

type SupplierBookingsPanelProps = {
  bookings: SupplierBooking[];
  allocations: SupplierAllocation[];
  canCreate?: boolean;
  canCancel?: boolean;
  serviceStatus?: string;
  dictionary: ServicesDictionary;
};

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<SupplierBooking["status"], StatusBadgeVariant> = {
  draft: "draft",
  cancelled: "cancelled",
};

export default function SupplierBookingsPanel({
  bookings,
  allocations,
  canCreate,
  canCancel,
  serviceStatus,
  dictionary,
}: SupplierBookingsPanelProps) {
  const panelDictionary = dictionary.supplierBookings;
  const isServiceBookingLocked =
    serviceStatus === "Completed" || serviceStatus === "Cancelled";
  const selectedAllocations = allocations.filter(
    (allocation) => !allocation.isDeleted && allocation.status === "selected"
  );
  const activeBookingByAllocationId = new Map(
    bookings
      .filter((booking) => booking.status !== "cancelled")
      .map((booking) => [booking.sourceAllocationId, booking])
  );
  const canCreateForService = canCreate && serviceStatus !== "Completed" && serviceStatus !== "Cancelled";
  const hasCostColumns = bookings.some(
    (booking) => booking.estimatedUnitCost !== null || booking.estimatedTotalCost !== null
  );
  const bookingColumns = [
    panelDictionary.columns.bookingNumber,
    panelDictionary.columns.status,
    panelDictionary.columns.supplier,
    panelDictionary.columns.item,
    panelDictionary.columns.qty,
    ...(hasCostColumns ? [panelDictionary.columns.unitCost, panelDictionary.columns.totalCost] : []),
    panelDictionary.columns.created,
    panelDictionary.columns.internalDetails,
    panelDictionary.columns.actions,
  ];

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
        <h3 className="font-semibold text-primary">{panelDictionary.title}</h3>
        <p className="text-[13px] text-on-surface-variant mt-1">
          {panelDictionary.subtitle}
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant text-[14px]">
          <p>{panelDictionary.empty.noBookings}</p>
          {selectedAllocations.length === 0 ? (
            <p className="mt-2 text-[13px]">
              {panelDictionary.empty.selectAllocation}
            </p>
          ) : null}
        </div>
      ) : (
        <DataTable columns={bookingColumns}>
          {bookings.map((booking) => (
            <tr key={booking.id} className={booking.status === "cancelled" ? "opacity-70" : ""}>
              <td dir="ltr" className="px-4 py-3 align-top font-mono font-semibold text-primary">
                {isolateBidiText(booking.bookingNumber)}
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge variant={STATUS_VARIANT_MAP[booking.status]}>
                  {panelDictionary.statusLabels[booking.status]}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 align-top font-medium text-on-surface">
                <span dir="auto">{isolateBidiText(booking.supplierName || booking.supplierId)}</span>
              </td>
              <td className="px-4 py-3 align-top text-on-surface">
                <span dir="auto" className="block font-medium">{isolateBidiText(booking.itemName)}</span>
                <span dir="auto" className="block text-[12px] text-on-surface-variant">{isolateBidiText(booking.category)}</span>
              </td>
              <td dir="ltr" className="px-4 py-3 align-top text-on-surface-variant tabular-nums">
                {`${formatUiNumber(dictionary.locale, booking.quantity)} ${booking.unit}`}
              </td>
              {hasCostColumns && (
                <>
                  <td dir="ltr" className="px-4 py-3 align-top text-end text-on-surface tabular-nums">
                    {formatBookingMoney(
                      dictionary.locale,
                      booking.estimatedUnitCost,
                      booking.currency,
                    )}
                  </td>
                  <td dir="ltr" className="px-4 py-3 align-top text-end font-semibold text-on-surface tabular-nums">
                    {formatBookingMoney(
                      dictionary.locale,
                      booking.estimatedTotalCost,
                      booking.currency,
                    )}
                  </td>
                </>
              )}
              <td dir="ltr" className="px-4 py-3 align-top text-on-surface-variant tabular-nums">
                {formatUiDateTime(dictionary.locale, booking.createdAt)}
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant min-w-[280px]">
                <BookingInternalDetails
                  booking={booking}
                  dictionary={dictionary.supplierBookings.details}
                  locale={dictionary.locale}
                />
              </td>
              <td className="px-4 py-3 align-top text-right min-w-[140px]">
                {canCancel && booking.status === "draft" && (
                  <SupplierBookingActions bookingId={booking.id} dictionary={dictionary.supplierBookings.cancelAction} />
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {selectedAllocations.length > 0 && (
        <div className="border-t border-surface-variant bg-surface px-6 py-5">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide mb-3">
            {panelDictionary.selectedAllocations}
          </h4>
          <div className="grid grid-cols-1 gap-3">
            {selectedAllocations.map((allocation) => {
              const activeBooking = activeBookingByAllocationId.get(allocation.id);

              return (
                <div
                  key={allocation.id}
                  className="flex flex-col gap-3 rounded-lg border border-outline-variant bg-surface-container-lowest p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div dir="auto" className="font-medium text-on-surface">
                      {isolateBidiText(allocation.supplierName || allocation.supplierId)}
                    </div>
                    <div dir="auto" className="text-[13px] text-on-surface-variant">
                      {isolateBidiText(`${allocation.category} / ${allocation.itemName} / ${allocation.quantity} ${allocation.unit}`)}
                    </div>
                  </div>
                  {activeBooking ? (
                    <div className="flex flex-col items-start gap-2 text-[13px] text-on-surface-variant md:items-end">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        {panelDictionary.linkedBooking}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span dir="ltr" className="font-mono font-semibold text-primary">
                          {isolateBidiText(activeBooking.bookingNumber)}
                        </span>
                        <StatusBadge variant={STATUS_VARIANT_MAP[activeBooking.status]}>
                          {panelDictionary.statusLabels[activeBooking.status]}
                        </StatusBadge>
                      </div>
                    </div>
                  ) : canCreateForService ? (
                    <CreateSupplierBookingButton allocationId={allocation.id} dictionary={dictionary.supplierBookings.createAction} />
                  ) : isServiceBookingLocked ? (
                    <span className="text-[13px] font-medium text-on-surface-variant">
                      {panelDictionary.locked}
                    </span>
                  ) : (
                    <span className="text-[13px] font-medium text-on-surface-variant">
                      {panelDictionary.noPermission}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

function BookingInternalDetails({
  booking,
  dictionary: detailsDictionary,
  locale,
}: {
  booking: SupplierBooking;
  dictionary: ServicesDictionary["supplierBookings"]["details"];
  locale: Locale;
}) {
  return (
    <div className="max-w-md space-y-1">
      {booking.scopeOfWork && (
        <p dir="auto">
          <span className="font-semibold text-on-surface">{detailsDictionary.scope}</span>{" "}
          {isolateBidiText(booking.scopeOfWork)}
        </p>
      )}
      {booking.internalNotes && (
        <p dir="auto">
          <span className="font-semibold text-on-surface">{detailsDictionary.notes}</span>{" "}
          {isolateBidiText(booking.internalNotes)}
        </p>
      )}
      {booking.status === "cancelled" && (
        <p dir="auto">
          <span className="font-semibold text-error">{detailsDictionary.cancelled}</span>{" "}
          {isolateBidiText(booking.cancelledReason || detailsDictionary.noReason)}{" "}
          {booking.cancelledAt ? (
            <span dir="ltr">({formatUiDateTime(locale, booking.cancelledAt)})</span>
          ) : (
            ""
          )}
        </p>
      )}
      {!booking.scopeOfWork &&
        !booking.internalNotes &&
        booking.status !== "cancelled" &&
        detailsDictionary.empty}
    </div>
  );
}
