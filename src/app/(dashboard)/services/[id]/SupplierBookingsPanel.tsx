import type { ComponentProps } from "react";
import type { SupplierBooking } from "@/lib/supplier-bookings/types";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import DataTable from "@/components/ui/DataTable";
import type { DataTableColumn } from "@/components/ui/data-table-contract";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { UiDateTimeText } from "@/components/i18n/UiDateText";
import { UiBidiText, UiLtrText, UiMoneyText, UiNumberText } from "@/components/i18n/UiValueText";
import type { Locale } from "@/lib/i18n/locales";
import Link from "next/link";
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

function BookingMoney({ locale, value, currency }: { locale: Locale; value: number | null; currency: string }) {
  if (value === null) return "—";
  return currency === "SAR"
    ? <UiMoneyText locale={locale} value={value} />
    : <UiLtrText>{formatBookingMoney(locale, value, currency)}</UiLtrText>;
}

type SupplierBookingsPanelProps = {
  bookings: SupplierBooking[];
  allocations: SupplierAllocation[];
  loadError?: boolean;
  canCreate?: boolean;
  canCancel?: boolean;
  serviceId?: string;
  serviceStatus?: string;
  showSupplierHistory?: boolean;
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
  loadError = false,
  canCreate,
  canCancel,
  serviceId,
  serviceStatus,
  showSupplierHistory = false,
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
      .filter((booking) => !booking.isDeleted && booking.status !== "cancelled")
      .map((booking) => [booking.sourceAllocationId, booking])
  );
  const canCreateForService = canCreate && serviceStatus !== "Completed" && serviceStatus !== "Cancelled";
  const hasCostColumns = bookings.some(
    (booking) => booking.estimatedUnitCost !== null || booking.estimatedTotalCost !== null
  );
  const bookingCostColumns: DataTableColumn[] = hasCostColumns ? [
    { key: "unit-cost", header: panelDictionary.columns.unitCost, align: "end", kind: "money" },
    { key: "total-cost", header: panelDictionary.columns.totalCost, align: "end", kind: "money" },
  ] : [];
  const bookingColumns: DataTableColumn[] = [
    { key: "booking-number", header: panelDictionary.columns.bookingNumber, align: "start", kind: "identifier" },
    { key: "status", header: panelDictionary.columns.status, align: "center", kind: "status" },
    { key: "supplier", header: panelDictionary.columns.supplier, align: "start", kind: "text" },
    { key: "item", header: panelDictionary.columns.item, align: "start", kind: "text" },
    { key: "quantity", header: panelDictionary.columns.qty, align: "end", kind: "number" },
    ...bookingCostColumns,
    { key: "created", header: panelDictionary.columns.created, align: "center", kind: "date" },
    { key: "internal-details", header: panelDictionary.columns.internalDetails, align: "start", kind: "text" },
    { key: "actions", header: panelDictionary.columns.actions, align: "end", kind: "actions" },
  ];

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden mt-6">
      <div className="flex min-w-0 flex-col gap-3 border-b border-surface-variant bg-surface-bright px-6 py-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <div>
          <h3 className="font-semibold text-primary">{panelDictionary.title}</h3>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            {panelDictionary.subtitle}
          </p>
        </div>
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

      {loadError ? (
        <div className="p-8 text-center text-error text-[14px]" role="alert">
          {panelDictionary.loadError}
        </div>
      ) : bookings.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant text-[14px]">
          <p>{panelDictionary.empty.noBookings}</p>
          {selectedAllocations.length === 0 ? (
            <p className="mt-2 text-[13px]">
              {panelDictionary.empty.selectAllocation}
            </p>
          ) : null}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-3 p-4 lg:hidden">
            {bookings.map((booking) => (
              <MobileBookingCard
                key={booking.id}
                booking={booking}
                canCancel={canCancel}
                hasCostColumns={hasCostColumns}
                locale={dictionary.locale}
                dictionary={panelDictionary}
              />
            ))}
          </div>
          <div className="hidden lg:block">
            <DataTable columns={bookingColumns}>
              {bookings.map((booking) => (
            <tr key={booking.id} className={booking.status === "cancelled" ? "opacity-70" : ""}>
              <td className="px-4 py-3 align-top font-mono font-semibold text-primary">
                <UiLtrText>{booking.bookingNumber}</UiLtrText>
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge variant={STATUS_VARIANT_MAP[booking.status]}>
                  {panelDictionary.statusLabels[booking.status]}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 align-top font-medium text-on-surface">
                <UiBidiText>{booking.supplierName || "—"}</UiBidiText>
              </td>
              <td className="px-4 py-3 align-top text-on-surface">
                <UiBidiText className="block font-medium">{booking.itemName}</UiBidiText>
                <UiBidiText className="block text-[12px] text-on-surface-variant">{booking.category}</UiBidiText>
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                <UiNumberText locale={dictionary.locale} value={booking.quantity} />{" "}<UiBidiText>{booking.unit}</UiBidiText>
              </td>
              {hasCostColumns && (
                <>
                  <td className="px-4 py-3 align-top text-on-surface">
                    <BookingMoney locale={dictionary.locale} value={booking.estimatedUnitCost} currency={booking.currency} />
                  </td>
                  <td className="px-4 py-3 align-top font-semibold text-on-surface">
                    <BookingMoney locale={dictionary.locale} value={booking.estimatedTotalCost} currency={booking.currency} />
                  </td>
                </>
              )}
              <td className="px-4 py-3 align-top text-on-surface-variant">
                <UiDateTimeText locale={dictionary.locale} value={booking.createdAt} />
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant min-w-[280px]">
                <BookingInternalDetails
                  booking={booking}
                  dictionary={dictionary.supplierBookings.details}
                  locale={dictionary.locale}
                />
              </td>
              <td className="px-4 py-3 align-top text-end min-w-[140px]">
                {canCancel && booking.status === "draft" && (
                  <SupplierBookingActions bookingId={booking.id} dictionary={dictionary.supplierBookings.cancelAction} />
                )}
              </td>
            </tr>
              ))}
            </DataTable>
          </div>
        </>
      )}

      {!loadError && selectedAllocations.length > 0 && (
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
                    <div className="font-medium text-on-surface">
                      <UiBidiText>{allocation.supplierName || "—"}</UiBidiText>
                    </div>
                    <div className="text-[13px] text-on-surface-variant">
                      <UiBidiText>{allocation.category}</UiBidiText>{" · "}<UiBidiText>{allocation.itemName}</UiBidiText>{" · "}<UiNumberText locale={dictionary.locale} value={allocation.quantity} />{" "}<UiBidiText>{allocation.unit}</UiBidiText>
                    </div>
                  </div>
                  {activeBooking ? (
                    <div className="flex flex-col items-start gap-2 text-[13px] text-on-surface-variant md:items-end">
                      <span className="text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">
                        {panelDictionary.linkedBooking}
                      </span>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono font-semibold text-primary">
                          <UiLtrText>{activeBooking.bookingNumber}</UiLtrText>
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
        <p>
          <span className="font-semibold text-on-surface">{detailsDictionary.scope}</span>{" "}
          <UiBidiText>{booking.scopeOfWork}</UiBidiText>
        </p>
      )}
      {booking.internalNotes && (
        <p>
          <span className="font-semibold text-on-surface">{detailsDictionary.notes}</span>{" "}
          <UiBidiText>{booking.internalNotes}</UiBidiText>
        </p>
      )}
      {booking.status === "cancelled" && (
        <p>
          <span className="font-semibold text-error">{detailsDictionary.cancelled}</span>{" "}
          <UiBidiText>{booking.cancelledReason || detailsDictionary.noReason}</UiBidiText>{" "}
          {booking.cancelledAt ? (
            <span>
              (<UiDateTimeText locale={locale} value={booking.cancelledAt} />)
            </span>
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

function MobileBookingCard({
  booking,
  canCancel,
  hasCostColumns,
  locale,
  dictionary,
}: {
  booking: SupplierBooking;
  canCancel?: boolean;
  hasCostColumns: boolean;
  locale: Locale;
  dictionary: ServicesDictionary["supplierBookings"];
}) {
  return (
    <article className="rounded-lg border border-outline-variant bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono font-semibold text-primary">
            <UiLtrText>{booking.bookingNumber}</UiLtrText>
          </p>
          <p className="mt-1 font-medium text-on-surface">
            <UiBidiText>{booking.supplierName || "—"}</UiBidiText>
          </p>
          <p className="mt-1 text-[12px] text-on-surface-variant">
            <UiBidiText>{booking.itemName}</UiBidiText> · <UiBidiText>{booking.category}</UiBidiText>
          </p>
        </div>
        <StatusBadge variant={STATUS_VARIANT_MAP[booking.status]}>
          {dictionary.statusLabels[booking.status]}
        </StatusBadge>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
        <div>
          <dt className="text-on-surface-variant">{dictionary.columns.qty}</dt>
          <dd className="mt-1 text-on-surface">
            <UiNumberText locale={locale} value={booking.quantity} />{" "}<UiBidiText>{booking.unit}</UiBidiText>
          </dd>
        </div>
        <div>
          <dt className="text-on-surface-variant">{dictionary.columns.created}</dt>
          <dd className="mt-1 text-on-surface">
            <UiDateTimeText locale={locale} value={booking.createdAt} />
          </dd>
        </div>
        {hasCostColumns && (
          <div>
            <dt className="text-on-surface-variant">{dictionary.columns.totalCost}</dt>
            <dd className="mt-1 font-semibold text-on-surface">
              <BookingMoney locale={locale} value={booking.estimatedTotalCost} currency={booking.currency} />
            </dd>
          </div>
        )}
      </dl>
      <div className="mt-3 border-t border-outline-variant pt-3 text-[12px] text-on-surface-variant">
        <BookingInternalDetails
          booking={booking}
          dictionary={dictionary.details}
          locale={locale}
        />
      </div>
      {canCancel && booking.status === "draft" && (
        <div className="mt-3 border-t border-outline-variant pt-3">
          <SupplierBookingActions
            bookingId={booking.id}
            dictionary={dictionary.cancelAction}
          />
        </div>
      )}
    </article>
  );
}
