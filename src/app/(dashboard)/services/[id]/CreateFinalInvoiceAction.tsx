"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/lib/invoices/actions";

type CreateFinalInvoiceActionProps = {
  serviceId: string;
  quotationId: string | null;
  remainingAmount: number;
  canCreate: boolean;
};

export function CreateFinalInvoiceAction({
  serviceId,
  quotationId,
  remainingAmount,
  canCreate,
}: CreateFinalInvoiceActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const disabled = !canCreate || !quotationId || remainingAmount <= 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (disabled) return;

    startTransition(async () => {
      const result = await createInvoiceAction({
        quotationId,
        serviceId,
        invoiceType: "final",
      });

      if (result.success) {
        setSuccessMsg(`Final invoice created successfully (Invoice #${result.invoiceNumber}).`);
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          "invalid_invoice_input": "Invalid input provided.",
          "final_invoice_already_exists": "An active final invoice already exists.",
          "quotation_not_found": "Quotation not found.",
          "quotation_not_approved": "Quotation is not approved.",
          "quotation_service_mismatch": "Quotation does not match the current service.",
          "company_settings_unavailable": "Company settings are unavailable.",
          "invoice_snapshot_unavailable": "Unable to generate invoice snapshots.",
          "invoice_creation_failed": "Failed to insert the invoice.",
          "Unauthorized": "You are not authorized to perform this action.",
          "Forbidden": "You do not have permission to create invoices.",
        };
        const errMsg = result.error ? (errMap[result.error] || `Unable to create final invoice. Error code: ${result.error}`) : "Unable to create final invoice. Please try again.";
        setError(errMsg);
      }
    });
  };

  if (disabled) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[14px] text-on-surface-variant italic">
          Final invoice is not available.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <div className="flex flex-col gap-2">
        <div className="text-[13px] text-on-surface-variant">
          Final invoice amount will be calculated automatically from the approved quotation minus active deposit invoices.
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isPending ? "Creating..." : "Create Final Invoice"}
          </button>
        </div>
      </div>
      {error && (
        <div className="text-[13px] text-red-600 bg-red-50 p-2 rounded border border-red-100">
          {error}
        </div>
      )}
      {successMsg && (
        <div className="text-[13px] text-green-700 bg-green-50 p-2 rounded border border-green-100">
          {successMsg}
        </div>
      )}
    </form>
  );
}
