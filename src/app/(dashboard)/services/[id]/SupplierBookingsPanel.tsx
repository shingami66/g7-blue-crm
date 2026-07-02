import type { ComponentProps } from "react";
import type { SupplierBooking } from "@/lib/supplier-bookings/types";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import SupplierBookingActions, {
  CreateSupplierBookingButton,
} from "./SupplierBookingActions";

type SupplierBookingsPanelProps = {
  bookings: SupplierBooking[];
  allocations: SupplierAllocation[];
  canCreate?: boolean;
  canCancel?: boolean;
  serviceStatus?: string;
};

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<SupplierBooking["status"], StatusBadgeVariant> = {
  draft: "draft",
  cancelled: "cancelled",
};

const STATUS_LABEL_MAP: Record<SupplierBooking["status"], string> = {
  draft: "Draft",
  cancelled: "Cancelled",
};

export default function SupplierBookingsPanel({
  bookings,
  allocations,
  canCreate,
  canCancel,
  serviceStatus,
}: SupplierBookingsPanelProps) {
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
    "SBK Number",
    "Status",
    "Supplier",
    "Item",
    "Qty",
    ...(hasCostColumns ? ["Unit Cost", "Total Cost"] : []),
    "Created",
    "Internal Details",
    "",
  ];

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden mt-6">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
        <h3 className="font-semibold text-primary">Supplier Bookings</h3>
        <p className="text-[13px] text-on-surface-variant mt-1">
          Internal SBK records created from selected supplier allocations.
        </p>
      </div>

      {bookings.length === 0 ? (
        <div className="p-8 text-center text-on-surface-variant text-[14px]">
          No Supplier Bookings recorded for this service yet.
        </div>
      ) : (
        <DataTable columns={bookingColumns}>
          {bookings.map((booking) => (
            <tr key={booking.id} className={booking.status === "cancelled" ? "opacity-70" : ""}>
              <td className="px-4 py-3 align-top font-mono font-semibold text-primary">
                {booking.bookingNumber}
              </td>
              <td className="px-4 py-3 align-top">
                <StatusBadge variant={STATUS_VARIANT_MAP[booking.status]}>
                  {STATUS_LABEL_MAP[booking.status]}
                </StatusBadge>
              </td>
              <td className="px-4 py-3 align-top font-medium text-on-surface">
                {booking.supplierName || booking.supplierId}
              </td>
              <td className="px-4 py-3 align-top text-on-surface">
                <span className="block font-medium">{booking.itemName}</span>
                <span className="block text-[12px] text-on-surface-variant">{booking.category}</span>
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                {booking.quantity} {booking.unit}
              </td>
              {hasCostColumns && (
                <>
                  <td className="px-4 py-3 align-top text-right text-on-surface">
                    {formatMoney(booking.estimatedUnitCost, booking.currency)}
                  </td>
                  <td className="px-4 py-3 align-top text-right text-on-surface font-semibold">
                    {formatMoney(booking.estimatedTotalCost, booking.currency)}
                  </td>
                </>
              )}
              <td className="px-4 py-3 align-top text-on-surface-variant">
                {formatDateTime(booking.createdAt)}
              </td>
              <td className="px-4 py-3 align-top text-on-surface-variant">
                <BookingInternalDetails booking={booking} />
              </td>
              <td className="px-4 py-3 align-top text-right">
                {canCancel && booking.status === "draft" && (
                  <SupplierBookingActions bookingId={booking.id} />
                )}
              </td>
            </tr>
          ))}
        </DataTable>
      )}

      {selectedAllocations.length > 0 && (
        <div className="border-t border-surface-variant bg-surface px-6 py-5">
          <h4 className="text-[13px] font-semibold text-on-surface uppercase tracking-wide mb-3">
            Selected Allocations
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
                      {allocation.supplierName || allocation.supplierId}
                    </div>
                    <div className="text-[13px] text-on-surface-variant">
                      {allocation.category} / {allocation.itemName} / {allocation.quantity} {allocation.unit}
                    </div>
                  </div>
                  {activeBooking ? (
                    <div className="flex flex-wrap items-center gap-2 text-[13px] text-on-surface-variant">
                      <span className="font-mono font-semibold text-primary">
                        {activeBooking.bookingNumber}
                      </span>
                      <StatusBadge variant={STATUS_VARIANT_MAP[activeBooking.status]}>
                        {STATUS_LABEL_MAP[activeBooking.status]}
                      </StatusBadge>
                    </div>
                  ) : canCreateForService ? (
                    <CreateSupplierBookingButton allocationId={allocation.id} />
                  ) : (
                    <span className="text-[13px] font-medium text-on-surface-variant">
                      Supplier Booking unavailable for this service state.
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

function BookingInternalDetails({ booking }: { booking: SupplierBooking }) {
  return (
    <div className="max-w-sm space-y-1">
      {booking.scopeOfWork && (
        <p>
          <span className="font-semibold text-on-surface">Scope:</span> {booking.scopeOfWork}
        </p>
      )}
      {booking.internalNotes && (
        <p>
          <span className="font-semibold text-on-surface">Notes:</span> {booking.internalNotes}
        </p>
      )}
      {booking.status === "cancelled" && (
        <p>
          <span className="font-semibold text-error">Cancelled:</span>{" "}
          {booking.cancelledReason || "No reason recorded"}{" "}
          {booking.cancelledAt ? `(${formatDateTime(booking.cancelledAt)})` : ""}
        </p>
      )}
      {!booking.scopeOfWork && !booking.internalNotes && booking.status !== "cancelled" && "—"}
    </div>
  );
}

function formatMoney(value: number | null, currency: string) {
  if (value === null) return "—";

  return `${value.toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} ${currency}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
