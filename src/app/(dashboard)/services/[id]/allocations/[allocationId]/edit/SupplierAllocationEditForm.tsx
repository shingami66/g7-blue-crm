"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useGlobalNavigationPending } from "@/components/ui/useGlobalNavigationPending";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { updateSupplierAllocation } from "@/lib/supplier-allocations/actions";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";

function getUpdateSupplierAllocationErrorMessage(
  error: string | null | undefined,
  dictionary: ReturnType<
    typeof getServicesDictionary
  >["supplierAllocations"]["subflow"]["editForm"]
) {
  if (!error) {
    return dictionary.failed;
  }

  const mappedErrors: Record<string, string> = {
    "Supplier allocation id is required.":
      dictionary.errors.allocationIdRequired,
    "Supplier allocation not found.": dictionary.errors.notFound,
    "Cannot update a cancelled supplier allocation.":
      dictionary.errors.cancelled,
    "Rate-card allocations cannot be manually updated yet.":
      dictionary.errors.rateCardReadOnly,
    "This allocation cannot be modified because it is linked to an active supplier booking.":
      dictionary.errors.linkedActiveBooking,
    "Invalid supplier allocation status transition.":
      dictionary.errors.invalidTransition,
    "Service is unavailable for supplier allocation update.":
      dictionary.errors.serviceUnavailable,
    "Supplier is unavailable for allocation update.":
      dictionary.errors.supplierUnavailable,
    "Approved quotation is invalid for this service.":
      dictionary.errors.approvedQuotationInvalid,
    "Failed to update supplier allocation. Please try again.":
      dictionary.errors.updateFailedRetry,
    "Failed to verify booking status. Please try again.":
      dictionary.errors.bookingStatusVerifyFailed,
    "An unexpected error occurred while verifying booking status.":
      dictionary.errors.bookingStatusUnexpected,
    Unauthorized: dictionary.errors.unauthorized,
    Forbidden: dictionary.errors.forbidden,
    "An unexpected error occurred.": dictionary.errors.unexpected,
  };

  return mappedErrors[error] || error;
}

export default function SupplierAllocationEditForm({
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
  const dictionary = servicesDictionary.supplierAllocations.subflow.editForm;
  const statusLabels = servicesDictionary.supplierAllocations.statusLabels;
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Compute allowed status options
  // - current draft options: draft, planned
  // - current planned options: planned, selected
  // - current selected options: selected
  const statusOptions = [];
  if (allocation.status === "draft") {
    statusOptions.push({ value: "draft", label: statusLabels.draft });
    statusOptions.push({ value: "planned", label: statusLabels.planned });
  } else if (allocation.status === "planned") {
    statusOptions.push({ value: "planned", label: statusLabels.planned });
    statusOptions.push({ value: "selected", label: statusLabels.selected });
  } else if (allocation.status === "selected") {
    statusOptions.push({ value: "selected", label: statusLabels.selected });
  }
  const isStatusReadOnly = statusOptions.length <= 1;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const estimatedUnitCostStr = formData.get("estimatedUnitCost") as string;
    const quantityStr = formData.get("quantity") as string;

    const input = {
      id: allocation.id,
      status: formData.get("status") as "draft" | "planned" | "selected" | "cancelled",
      category: formData.get("category") as string,
      itemName: formData.get("itemName") as string,
      unit: formData.get("unit") as string,
      quantity: quantityStr ? parseFloat(quantityStr) : 0,
      currency: "SAR" as const,
      estimatedUnitCost: estimatedUnitCostStr ? parseFloat(estimatedUnitCostStr) : 0,
      costSource: "manual_estimate" as const,
      scopeOfWork: (formData.get("scopeOfWork") as string) || undefined,
      internalNotes: (formData.get("internalNotes") as string) || undefined,
    };

    const result = await updateSupplierAllocation(allocation.id, input);

    if (result.success) {
      push(`/services/${serviceId}`);
      router.refresh();
    } else {
      setError(getUpdateSupplierAllocationErrorMessage(result.error, dictionary));
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <label className="block text-sm font-semibold text-on-surface">
            {dictionary.supplier}
          </label>
          <div
            className="w-full px-4 py-2 bg-surface-container-low border border-outline-variant rounded-lg text-on-surface-variant font-medium"
            dir="auto"
          >
            {isolateBidiText(allocation.supplierName || allocation.supplierId)}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-semibold text-on-surface">
            {dictionary.category} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="category"
            name="category"
            defaultValue={allocation.category}
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder={dictionary.placeholders.category}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="itemName" className="block text-sm font-semibold text-on-surface">
            {dictionary.itemName} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="itemName"
            name="itemName"
            defaultValue={allocation.itemName}
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder={dictionary.placeholders.itemName}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="unit" className="block text-sm font-semibold text-on-surface">
            {dictionary.unit} <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="unit"
            name="unit"
            defaultValue={allocation.unit}
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder={dictionary.placeholders.unit}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="quantity" className="block text-sm font-semibold text-on-surface">
            {dictionary.quantity} <span className="text-error">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            defaultValue={allocation.quantity}
            min="0.01"
            step="0.01"
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder={dictionary.placeholders.quantity}
            disabled={isLoading}
            dir="ltr"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="estimatedUnitCost" className="block text-sm font-semibold text-on-surface">
            {dictionary.estimatedUnitCost} <span className="text-error">*</span>
          </label>
          <input
            type="number"
            id="estimatedUnitCost"
            name="estimatedUnitCost"
            defaultValue={allocation.estimatedUnitCost ?? ""}
            min="0"
            step="0.01"
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder={dictionary.placeholders.estimatedUnitCost}
            disabled={isLoading}
            dir="ltr"
          />
        </div>
        
        <div className="space-y-2">
          <label htmlFor="status" className="block text-sm font-semibold text-on-surface">
            {dictionary.status} <span className="text-error">*</span>
          </label>
          <select
            id="status"
            name={isStatusReadOnly ? undefined : "status"}
            defaultValue={allocation.status}
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            disabled={isLoading || isStatusReadOnly}
          >
            {statusOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
          {isStatusReadOnly && (
            <input type="hidden" name="status" value={allocation.status} />
          )}
        </div>

        <div className="md:col-span-2 space-y-2">
          <label htmlFor="scopeOfWork" className="block text-sm font-semibold text-on-surface">
            {dictionary.scopeOfWork}
          </label>
          <textarea
            id="scopeOfWork"
            name="scopeOfWork"
            defaultValue={allocation.scopeOfWork || ""}
            rows={3}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            placeholder={dictionary.placeholders.scopeOfWork}
            disabled={isLoading}
            dir="auto"
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label htmlFor="internalNotes" className="block text-sm font-semibold text-on-surface">
            {dictionary.internalNotes}
          </label>
          <textarea
            id="internalNotes"
            name="internalNotes"
            defaultValue={allocation.internalNotes || ""}
            rows={2}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            placeholder={dictionary.placeholders.internalNotes}
            disabled={isLoading}
            dir="auto"
          />
        </div>
      </div>

      {error && (
        <div className="px-6 py-4 bg-error-container text-on-error-container text-sm font-medium border-t border-error-container">
          {error}
        </div>
      )}

      <div className="px-6 py-4 bg-surface-bright border-t border-outline-variant flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={() => push(`/services/${serviceId}`)}
          disabled={isLoading}
          className="px-4 py-2 font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-50"
        >
          {dictionary.cancel}
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
          ) : (
            dictionary.update
          )}
        </button>
      </div>
    </form>
  );
}
