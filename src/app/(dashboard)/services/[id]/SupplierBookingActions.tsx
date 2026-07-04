"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import {
  cancelSupplierBooking,
  createSupplierBookingFromAllocation,
} from "@/lib/supplier-bookings/actions";

export function CreateSupplierBookingButton({ allocationId }: { allocationId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function createSupplierBooking() {
    setError(null);

    startTransition(async () => {
      const result = await createSupplierBookingFromAllocation({
        sourceAllocationId: allocationId,
      });

      if (result.success) {
        router.refresh();
        return;
      }

      setError(result.error || "Failed to create Supplier Booking.");
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <Button
        onClick={createSupplierBooking}
        size="sm"
        loading={isPending}
      >
        {isPending ? "Creating..." : "Create Supplier Booking"}
      </Button>
      {error && <p className="max-w-xs text-[12px] font-medium text-error">{error}</p>}
    </div>
  );
}

export default function SupplierBookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelledReason, setCancelledReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function submitCancellation() {
    const trimmedReason = cancelledReason.trim();
    if (!trimmedReason) {
      setError("Cancellation reason is required.");
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await cancelSupplierBooking(bookingId, {
        cancelledReason: trimmedReason,
      });

      if (result.success) {
        setIsCancelling(false);
        setCancelledReason("");
        router.refresh();
        return;
      }

      setError(result.error || "Failed to cancel Supplier Booking.");
    });
  }

  if (!isCancelling) {
    return (
      <Button
        onClick={() => setIsCancelling(true)}
        size="sm"
        variant="ghost"
      >
        Cancel
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl">
        <div className="border-b border-outline-variant px-6 py-4">
          <h4 className="text-base font-semibold text-on-surface">
            Cancel Supplier Booking
          </h4>
          <p className="mt-1 text-[13px] text-on-surface-variant">
            Add a reason before cancelling this internal Supplier Booking.
          </p>
        </div>
        <div className="space-y-3 px-6 py-5 text-left">
          <label
            htmlFor={`cancel-supplier-booking-${bookingId}`}
            className="block text-[12px] font-semibold text-on-surface"
          >
            Cancellation Reason
          </label>
          <textarea
            id={`cancel-supplier-booking-${bookingId}`}
            value={cancelledReason}
            onChange={(event) => setCancelledReason(event.target.value)}
            disabled={isPending}
            rows={4}
            className="w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            placeholder="Explain why this Supplier Booking is being cancelled."
          />
          {error && <p className="text-[12px] font-medium text-error">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-outline-variant px-6 py-4">
          <Button
            type="button"
            onClick={() => {
              setIsCancelling(false);
              setCancelledReason("");
              setError(null);
            }}
            disabled={isPending}
            variant="ghost"
          >
            Back
          </Button>
          <Button
            type="button"
            onClick={submitCancellation}
            disabled={cancelledReason.trim().length === 0}
            loading={isPending}
            variant="danger"
          >
            {isPending ? "Cancelling..." : "Cancel Supplier Booking"}
          </Button>
        </div>
      </div>
    </div>
  );
}
