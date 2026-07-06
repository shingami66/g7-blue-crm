"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getLocale } from "@/lib/i18n/locales";
import { transitionSupplierAllocationStatus } from "@/lib/supplier-allocations/actions";
import type { SupplierAllocationStatus } from "@/lib/supplier-allocations/types";

type SupplierAllocationStatusActionsProps = {
  allocationId: string;
  status: SupplierAllocationStatus;
};

function getAllocationStatusErrorMessage(
  error: string | null | undefined,
  dictionary: ReturnType<typeof getServicesDictionary>["supplierAllocations"]["statusActions"]
) {
  if (!error) {
    return dictionary.updateFailed;
  }

  const mappedErrors: Record<string, string> = {
    "Supplier allocation id is required.": dictionary.errors.allocationIdRequired,
    "Supplier allocation not found.": dictionary.errors.notFound,
    "Cannot change status for a cancelled supplier allocation.":
      dictionary.errors.cancelled,
    "Invalid supplier allocation status transition.":
      dictionary.errors.invalidTransition,
    "This allocation cannot be modified because it is linked to an active supplier booking.":
      dictionary.errors.linkedActiveBooking,
    "Service is unavailable for supplier allocation update.":
      dictionary.errors.serviceUnavailable,
    "Supplier is unavailable for allocation update.":
      dictionary.errors.supplierUnavailable,
    "Failed to update supplier allocation. Please try again.":
      dictionary.errors.updateFailedRetry,
    Unauthorized: dictionary.errors.unauthorized,
    Forbidden: dictionary.errors.forbidden,
    "An unexpected error occurred.": dictionary.errors.unexpected,
  };

  return mappedErrors[error] || error;
}

export default function SupplierAllocationStatusActions({
  allocationId,
  status,
}: SupplierAllocationStatusActionsProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const dictionary =
    getServicesDictionary(getLocale()).supplierAllocations.statusActions;

  if (status === "selected") {
    return (
      <span className="text-[12px] font-semibold text-primary">
        {dictionary.selected}
      </span>
    );
  }

  if (status === "cancelled") {
    return null;
  }

  const action = {
    draft: {
      label: dictionary.draft.label,
      loadingLabel: dictionary.draft.loadingLabel,
      nextStatus: "planned" as const,
    },
    planned: {
      label: dictionary.planned.label,
      loadingLabel: dictionary.planned.loadingLabel,
      nextStatus: "selected" as const,
    },
  }[status];

  function handleTransition() {
    setError(null);

    startTransition(async () => {
      const result = await transitionSupplierAllocationStatus(
        allocationId,
        action.nextStatus
      );

      if (result.success) {
        router.refresh();
        return;
      }

      setError(getAllocationStatusErrorMessage(result.error, dictionary));
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={status === "draft" ? "outline" : "primary"}
        loading={isPending}
        loadingLabel={action.loadingLabel}
        onClick={handleTransition}
      >
        {action.label}
      </Button>
      {error ? (
        <p className="max-w-[220px] text-right text-[12px] font-medium text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}
