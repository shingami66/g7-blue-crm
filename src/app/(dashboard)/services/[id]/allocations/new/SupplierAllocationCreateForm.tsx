"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupplierAllocation } from "@/lib/supplier-allocations/actions";
import type { SupplierOption } from "@/lib/suppliers/types";

export default function SupplierAllocationCreateForm({
  serviceId,
  suppliers,
}: {
  serviceId: string;
  suppliers: SupplierOption[];
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const estimatedUnitCostStr = formData.get("estimatedUnitCost") as string;
    const quantityStr = formData.get("quantity") as string;

    const input = {
      serviceId,
      supplierId: formData.get("supplierId") as string,
      category: formData.get("category") as string,
      itemName: formData.get("itemName") as string,
      unit: formData.get("unit") as string,
      quantity: quantityStr ? parseFloat(quantityStr) : 0,
      currency: "SAR",
      estimatedUnitCost: estimatedUnitCostStr ? parseFloat(estimatedUnitCostStr) : 0,
      costSource: "manual_estimate",
      scopeOfWork: (formData.get("scopeOfWork") as string) || undefined,
      internalNotes: (formData.get("internalNotes") as string) || undefined,
    };

    const result = await createSupplierAllocation(input);

    if (result.success) {
      router.push(`/services/${serviceId}`);
      router.refresh();
    } else {
      setError(result.error || "Failed to create supplier allocation");
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden">
      <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="md:col-span-2 space-y-2">
          <label htmlFor="supplierId" className="block text-sm font-semibold text-on-surface">
            Supplier <span className="text-error">*</span>
          </label>
          <select
            id="supplierId"
            name="supplierId"
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            disabled={isLoading}
          >
            <option value="">Select a supplier...</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label htmlFor="category" className="block text-sm font-semibold text-on-surface">
            Category <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="category"
            name="category"
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="e.g. Venue, Catering, AV"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="itemName" className="block text-sm font-semibold text-on-surface">
            Item Name <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="itemName"
            name="itemName"
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="e.g. Main Hall Rental"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="unit" className="block text-sm font-semibold text-on-surface">
            Unit <span className="text-error">*</span>
          </label>
          <input
            type="text"
            id="unit"
            name="unit"
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="e.g. Days, Pax, Pieces"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="quantity" className="block text-sm font-semibold text-on-surface">
            Quantity <span className="text-error">*</span>
          </label>
          <input
            type="number"
            id="quantity"
            name="quantity"
            min="0.01"
            step="0.01"
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="1"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="estimatedUnitCost" className="block text-sm font-semibold text-on-surface">
            Estimated Unit Cost (SAR) <span className="text-error">*</span>
          </label>
          <input
            type="number"
            id="estimatedUnitCost"
            name="estimatedUnitCost"
            min="0"
            step="0.01"
            required
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
            placeholder="0.00"
            disabled={isLoading}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label htmlFor="scopeOfWork" className="block text-sm font-semibold text-on-surface">
            Scope of Work
          </label>
          <textarea
            id="scopeOfWork"
            name="scopeOfWork"
            rows={3}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            placeholder="Detailed description of what the supplier will provide..."
            disabled={isLoading}
          />
        </div>

        <div className="md:col-span-2 space-y-2">
          <label htmlFor="internalNotes" className="block text-sm font-semibold text-on-surface">
            Internal Notes
          </label>
          <textarea
            id="internalNotes"
            name="internalNotes"
            rows={2}
            className="w-full px-4 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all resize-none"
            placeholder="Internal notes for operations team..."
            disabled={isLoading}
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
          onClick={() => router.push(`/services/${serviceId}`)}
          disabled={isLoading}
          className="px-4 py-2 font-semibold text-on-surface hover:bg-surface-container-low rounded-lg transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isLoading}
          className="px-6 py-2 bg-primary text-on-primary font-semibold rounded-lg hover:bg-primary-container transition-colors disabled:opacity-50 flex items-center justify-center min-w-[120px]"
        >
          {isLoading ? (
            <span className="w-5 h-5 border-2 border-on-primary border-t-transparent rounded-full animate-spin"></span>
          ) : (
            "Create Allocation"
          )}
        </button>
      </div>
    </form>
  );
}
