"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelSupplierAllocation } from "@/lib/supplier-allocations/actions";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import StatusBadge from "@/components/ui/StatusBadge";
import Button from "@/components/ui/Button";
import type { ComponentProps } from "react";
import { getSafeActionErrorMessage } from "@/lib/i18n/safe-action-error";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<SupplierAllocation["status"], StatusBadgeVariant> = {
  draft: "draft",
  planned: "planning",
  selected: "confirmed",
  cancelled: "cancelled",
};

function getCancelSupplierAllocationErrorMessage(
  error: string | null | undefined,
  dictionary: ReturnType<
    typeof getServicesDictionary
  >["supplierAllocations"]["subflow"]["cancelForm"]
) {
  if (!error) {
    return dictionary.failed;
  }

  const mappedErrors: Record<string, string> = {
    "Supplier allocation id is required.":
      dictionary.errors.allocationIdRequired,
    "Supplier allocation not found.": dictionary.errors.notFound,
    "Supplier allocation is already cancelled.":
      dictionary.errors.alreadyCancelled,
    "This allocation cannot be modified because it is linked to an active supplier booking.":
      dictionary.errors.linkedActiveBooking,
    "Service is unavailable for supplier allocation cancel.":
      dictionary.errors.serviceUnavailable,
    "Failed to cancel supplier allocation. Please try again.":
      dictionary.errors.cancelFailedRetry,
    "Supplier allocation changed before this action could be completed. Refresh and try again.":
      dictionary.errors.staleConflict,
    "Failed to verify booking status. Please try again.":
      dictionary.errors.bookingStatusVerifyFailed,
    "An unexpected error occurred while verifying booking status.":
      dictionary.errors.bookingStatusUnexpected,
    Unauthorized: dictionary.errors.unauthorized,
    Forbidden: dictionary.errors.forbidden,
    "An unexpected error occurred.": dictionary.errors.unexpected,
  };

  return getSafeActionErrorMessage(error, mappedErrors, dictionary.errors.unexpected);
}

export default function SupplierAllocationCancelForm({
  serviceId,
  allocation,
}: {
  serviceId: string;
  allocation: SupplierAllocation;
}) {
  const router = useRouter();
  const { push } = useGlobalNavigationPending();
  const locale = useLocale();
  const servicesDictionary = getServicesDictionary(locale);
  const dictionary = servicesDictionary.supplierAllocations.subflow.cancelForm;
  const common = servicesDictionary.supplierAllocations.subflow.common;
  const statusLabels = servicesDictionary.supplierAllocations.statusLabels;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const cancelledReason = formData.get("cancelledReason") as string;

    const result = await cancelSupplierAllocation(allocation.id, {
      cancelledReason,
    });

    if (result.success) {
      push(`/services/${serviceId}`);
      router.refresh();
    } else {
      setError(getCancelSupplierAllocationErrorMessage(result.error, dictionary));
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-4">
          {common.allocationSummary}
        </h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              {common.supplier}
            </dt>
            <dd className="text-sm font-medium text-on-surface" dir="auto">
              {isolateBidiText(allocation.supplierName || allocation.supplierId)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              {common.category}
            </dt>
            <dd className="text-sm font-medium text-on-surface" dir="auto">
              {isolateBidiText(allocation.category)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              {common.itemName}
            </dt>
            <dd className="text-sm font-medium text-on-surface" dir="auto">
              {isolateBidiText(allocation.itemName)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              {common.quantity}
            </dt>
            <dd className="text-sm font-medium text-on-surface" dir="ltr">
              {isolateBidiText(String(allocation.quantity))}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              {common.unit}
            </dt>
            <dd className="text-sm font-medium text-on-surface" dir="ltr">
              {isolateBidiText(allocation.unit)}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              {common.status}
            </dt>
            <dd>
              <StatusBadge variant={STATUS_VARIANT_MAP[allocation.status] || "draft"}>
                {statusLabels[allocation.status] || allocation.status}
              </StatusBadge>
            </dd>
          </div>
        </dl>

        <div className="space-y-2 border-t border-outline-variant pt-6 mt-2">
          <label htmlFor="cancelledReason" className="block text-sm font-semibold text-on-surface">
            {dictionary.reasonLabel} <span className="text-error">*</span>
          </label>
          <textarea
            id="cancelledReason"
            name="cancelledReason"
            required
            rows={3}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-error focus:border-transparent transition-all resize-none"
            placeholder={dictionary.reasonPlaceholder}
            disabled={isLoading}
            dir="auto"
          />
          <p className="text-xs text-on-surface-variant">
            {dictionary.warning}
          </p>
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-error-container text-on-error-container text-sm font-medium border-t border-error-container">
          {error}
        </div>
      )}

      <div className="px-6 py-4 bg-surface-bright border-t border-outline-variant flex items-center justify-end gap-3">
        <Button
          type="button"
          onClick={() => push(`/services/${serviceId}`)}
          variant="ghost"
        >
          {dictionary.back}
        </Button>
        <Button
          type="submit"
          className="min-w-[120px]"
          loading={isLoading}
          variant="danger"
        >
          {isLoading ? dictionary.loadingLabel : dictionary.confirm}
        </Button>
      </div>
    </form>
  );
}
