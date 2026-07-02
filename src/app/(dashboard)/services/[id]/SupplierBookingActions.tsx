"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
      <button
        type="button"
        onClick={createSupplierBooking}
        disabled={isPending}
        className="min-h-[36px] rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isPending ? "Creating..." : "Create Supplier Booking"}
      </button>
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
      <button
        type="button"
        onClick={() => setIsCancelling(true)}
        className="text-[13px] font-semibold text-error hover:underline"
      >
        Cancel
      </button>
    );
  }

  return (
    <div className="min-w-[260px] space-y-2 text-left">
      <label htmlFor={`cancel-supplier-booking-${bookingId}`} className="text-[12px] font-semibold text-on-surface">
        Cancellation Reason
      </label>
      <textarea
        id={`cancel-supplier-booking-${bookingId}`}
        value={cancelledReason}
        onChange={(event) => setCancelledReason(event.target.value)}
        disabled={isPending}
        rows={3}
        className="w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
        placeholder="Explain why this Supplier Booking is being cancelled."
      />
      {error && <p className="text-[12px] font-medium text-error">{error}</p>}
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => {
            setIsCancelling(false);
            setCancelledReason("");
            setError(null);
          }}
          disabled={isPending}
          className="rounded-lg px-3 py-1.5 text-[12px] font-semibold text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={submitCancellation}
          disabled={isPending || cancelledReason.trim().length === 0}
          className="rounded-lg bg-error px-3 py-1.5 text-[12px] font-semibold text-on-error hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? "Cancelling..." : "Cancel Supplier Booking"}
        </button>
      </div>
    </div>
  );
}
