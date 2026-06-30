"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelSupplierAllocation } from "@/lib/supplier-allocations/actions";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ComponentProps } from "react";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<SupplierAllocation["status"], StatusBadgeVariant> = {
  draft: "draft",
  planned: "planning",
  selected: "confirmed",
  cancelled: "cancelled",
};

const STATUS_LABEL_MAP: Record<SupplierAllocation["status"], string> = {
  draft: "Draft",
  planned: "Planned",
  selected: "Selected",
  cancelled: "Cancelled",
};

export default function SupplierAllocationCancelForm({
  serviceId,
  allocation,
}: {
  serviceId: string;
  allocation: SupplierAllocation;
}) {
  const router = useRouter();
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
      router.push(`/services/${serviceId}`);
      router.refresh();
    } else {
      setError(result.error || "Failed to cancel supplier allocation");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-on-surface mb-4">Allocation Summary</h3>
        <dl className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-6">
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Supplier
            </dt>
            <dd className="text-sm font-medium text-on-surface">
              {allocation.supplierName || allocation.supplierId}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Category
            </dt>
            <dd className="text-sm font-medium text-on-surface">
              {allocation.category}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Item Name
            </dt>
            <dd className="text-sm font-medium text-on-surface">
              {allocation.itemName}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Quantity
            </dt>
            <dd className="text-sm font-medium text-on-surface">
              {allocation.quantity}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Unit
            </dt>
            <dd className="text-sm font-medium text-on-surface">
              {allocation.unit}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
              Status
            </dt>
            <dd>
              <StatusBadge variant={STATUS_VARIANT_MAP[allocation.status] || "draft"}>
                {STATUS_LABEL_MAP[allocation.status] || allocation.status}
              </StatusBadge>
            </dd>
          </div>
        </dl>

        <div className="space-y-2 border-t border-outline-variant pt-6 mt-2">
          <label htmlFor="cancelledReason" className="block text-sm font-semibold text-on-surface">
            Cancellation Reason <span className="text-error">*</span>
          </label>
          <textarea
            id="cancelledReason"
            name="cancelledReason"
            required
            rows={3}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-error focus:border-transparent transition-all resize-none"
            placeholder="Please provide a reason for cancelling this allocation..."
            disabled={isLoading}
          />
          <p className="text-xs text-on-surface-variant">
            This action cannot be undone. The allocation will be preserved for history but its status will change to cancelled.
          </p>
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
          onClick={() => router.push(`/services/${serviceId}`)}
          disabled={isLoading}
          className="px-4 py-2 font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-50"
        >
          Go Back
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-error text-on-error font-semibold rounded-lg hover:bg-[#8C1D18] transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-on-error border-t-transparent rounded-full animate-spin"></span>
          ) : (
            "Cancel Allocation"
          )}
        </button>
      </div>
    </form>
  );
}
