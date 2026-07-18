"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import {
  cancelSupplierBooking,
  createSupplierBookingFromAllocation,
} from "@/lib/supplier-bookings/actions";
import { getSafeActionErrorMessage } from "@/lib/i18n/safe-action-error";

function getCreateSupplierBookingErrorMessage(
  error: string | null | undefined,
  dictionary: ReturnType<typeof getServicesDictionary>["supplierBookings"]["createAction"]
) {
  if (!error) {
    return dictionary.failed;
  }

  const mappedErrors: Record<string, string> = {
    "Supplier Booking create input can only include sourceAllocationId.":
      dictionary.errors.invalidInput,
    "Failed to load source allocation. Please try again.":
      dictionary.errors.sourceLoadFailed,
    "Source allocation not found.": dictionary.errors.sourceNotFound,
    "Source allocation is deleted.": dictionary.errors.sourceDeleted,
    "Source allocation must be selected before booking.":
      dictionary.errors.sourceMustBeSelected,
    "Failed to verify service status. Please try again.":
      dictionary.errors.serviceStatusVerifyFailed,
    "Service is unavailable for Supplier Booking.":
      dictionary.errors.serviceUnavailable,
    "Failed to verify Supplier status. Please try again.":
      dictionary.errors.supplierStatusVerifyFailed,
    "Supplier is unavailable for Supplier Booking.":
      dictionary.errors.supplierUnavailable,
    "Source allocation already has an active Supplier Booking.":
      dictionary.errors.activeBookingExists,
    "Failed to create Supplier Booking. Please try again.":
      dictionary.errors.createFailedRetry,
    Unauthorized: dictionary.errors.unauthorized,
    Forbidden: dictionary.errors.forbidden,
    "An unexpected error occurred.": dictionary.errors.unexpected,
  };

  return getSafeActionErrorMessage(error, mappedErrors, dictionary.errors.unexpected);
}

function getCancelSupplierBookingErrorMessage(
  error: string | null | undefined,
  dictionary: ReturnType<typeof getServicesDictionary>["supplierBookings"]["cancelAction"]
) {
  if (!error) {
    return dictionary.failed;
  }

  const mappedErrors: Record<string, string> = {
    "Failed to load Supplier Booking. Please try again.":
      dictionary.errors.bookingLoadFailed,
    "Supplier Booking not found.": dictionary.errors.bookingNotFound,
    "Supplier Booking is already cancelled.":
      dictionary.errors.alreadyCancelled,
    "Failed to verify service status. Please try again.":
      dictionary.errors.serviceStatusVerifyFailed,
    "Service is unavailable for Supplier Booking cancellation.":
      dictionary.errors.serviceUnavailable,
    "Failed to cancel Supplier Booking. Please try again.":
      dictionary.errors.cancelFailedRetry,
    "Supplier Booking changed before this action could be completed. Refresh and try again.":
      dictionary.errors.staleConflict,
    Unauthorized: dictionary.errors.unauthorized,
    Forbidden: dictionary.errors.forbidden,
    "An unexpected error occurred.": dictionary.errors.unexpected,
  };

  return getSafeActionErrorMessage(error, mappedErrors, dictionary.errors.unexpected);
}

export function CreateSupplierBookingButton({
  allocationId,
  dictionary,
}: {
  allocationId: string;
  dictionary: ReturnType<typeof getServicesDictionary>["supplierBookings"]["createAction"];
}) {
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

      setError(getCreateSupplierBookingErrorMessage(result.error, dictionary));
    });
  }

  return (
    <div className="flex flex-col items-start gap-2 md:items-end">
      <Button
        onClick={createSupplierBooking}
        size="sm"
        loading={isPending}
        loadingLabel={dictionary.loadingLabel}
      >
        {dictionary.label}
      </Button>
      {error && <p className="max-w-xs text-[12px] font-medium text-error">{error}</p>}
    </div>
  );
}

export default function SupplierBookingActions({
  bookingId,
  dictionary,
}: {
  bookingId: string;
  dictionary: ReturnType<typeof getServicesDictionary>["supplierBookings"]["cancelAction"];
}) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelledReason, setCancelledReason] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const reasonRef = useRef<HTMLTextAreaElement>(null);
  const pendingRef = useRef(false);
  const titleId = useId();
  const descriptionId = useId();
  const triggerId = `cancel-supplier-booking-trigger-${bookingId}`;

  useEffect(() => {
    pendingRef.current = isPending;
  }, [isPending]);

  useEffect(() => {
    if (!isCancelling) return;

    const previousFocus = document.activeElement;
    reasonRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pendingRef.current) {
        event.preventDefault();
        setIsCancelling(false);
        setCancelledReason("");
        setError(null);
        return;
      }

      if (event.key !== "Tab") return;

      const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
        'button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus instanceof HTMLElement) {
        previousFocus.focus();
      }
    };
  }, [isCancelling]);

  function closeDialog() {
    if (pendingRef.current) return;
    setIsCancelling(false);
    setCancelledReason("");
    setError(null);
  }

  function submitCancellation() {
    const trimmedReason = cancelledReason.trim();
    if (!trimmedReason) {
      setError(dictionary.validationReasonRequired);
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

      setError(getCancelSupplierBookingErrorMessage(result.error, dictionary));
    });
  }

  if (!isCancelling) {
    return (
      <Button
        id={triggerId}
        onClick={() => setIsCancelling(true)}
        size="sm"
        variant="ghost"
        aria-haspopup="dialog"
        aria-expanded={isCancelling}
      >
        {dictionary.trigger}
      </Button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        className="w-full max-w-lg rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl"
      >
        <div className="border-b border-outline-variant px-6 py-4">
          <h4 id={titleId} className="text-base font-semibold text-on-surface">
            {dictionary.title}
          </h4>
          <p id={descriptionId} className="mt-1 text-[13px] text-on-surface-variant">
            {dictionary.subtitle}
          </p>
        </div>
        <div className="space-y-3 px-6 py-5 text-start">
          <label
            htmlFor={`cancel-supplier-booking-${bookingId}`}
            className="block text-[12px] font-semibold text-on-surface"
          >
            {dictionary.reasonLabel}
          </label>
          <textarea
            ref={reasonRef}
            id={`cancel-supplier-booking-${bookingId}`}
            value={cancelledReason}
            onChange={(event) => setCancelledReason(event.target.value)}
            disabled={isPending}
            rows={4}
            className="w-full resize-none rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] text-on-surface focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50"
            placeholder={dictionary.reasonPlaceholder}
          />
          {error && <p className="text-[12px] font-medium text-error" role="alert">{error}</p>}
        </div>
        <div className="flex justify-end gap-3 border-t border-outline-variant px-6 py-4">
          <Button
            type="button"
            onClick={closeDialog}
            disabled={isPending}
            variant="ghost"
          >
            {dictionary.back}
          </Button>
          <Button
            type="button"
            onClick={submitCancellation}
            disabled={cancelledReason.trim().length === 0}
            loading={isPending}
            loadingLabel={dictionary.loadingLabel}
            variant="danger"
          >
            {dictionary.confirm}
          </Button>
        </div>
      </div>
    </div>
  );
}
