"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createInvoiceAction } from "@/lib/invoices/actions";

type CreateDepositInvoiceActionProps = {
  serviceId: string;
  quotationId: string | null;
  quotationTotal: number;
  canCreate: boolean;
  disabledReasons: string[];
};

export function CreateDepositInvoiceAction({
  serviceId,
  quotationId,
  quotationTotal,
  canCreate,
}: CreateDepositInvoiceActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const disabled = !canCreate || !quotationId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (disabled) return;

    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
      setError("Please enter a valid numeric amount.");
      return;
    }

    if (parsedAmount <= 0) {
      setError("Deposit amount must be greater than 0.");
      return;
    }

    if (parsedAmount > quotationTotal) {
      setError("Deposit amount cannot exceed quotation total.");
      return;
    }

    startTransition(async () => {
      const result = await createInvoiceAction({
        quotationId,
        serviceId,
        invoiceType: "deposit",
        requestedAmount: parsedAmount,
      });

      if (result.success) {
        setSuccessMsg(`Deposit invoice created successfully (Invoice #${result.invoiceNumber}).`);
        setAmountStr("");
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          "invalid_invoice_input": "Invalid input provided.",
          "deposit_amount_required": "Deposit amount is required.",
          "deposit_amount_exceeds_quotation_total": "Deposit amount exceeds quotation total.",
          "deposit_invoice_already_exists": "An active deposit invoice already exists.",
          "quotation_not_found": "Quotation not found.",
          "quotation_not_approved": "Quotation is not approved.",
          "quotation_service_mismatch": "Quotation does not match the current service.",
          "company_settings_unavailable": "Company settings are unavailable.",
          "invoice_snapshot_unavailable": "Unable to generate invoice snapshots.",
          "invoice_creation_failed": "Failed to insert the invoice.",
          "Unauthorized": "You are not authorized to perform this action.",
          "Forbidden": "You do not have permission to create invoices.",
        };
        const errMsg = result.error ? (errMap[result.error] || `Unable to create deposit invoice. Error code: ${result.error}`) : "Unable to create deposit invoice. Please try again.";
        setError(errMsg);
      }
    });
  };

  if (disabled) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[14px] text-on-surface-variant italic">
          Deposit invoice is not available.
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <div className="flex flex-col gap-1">
        <label htmlFor="depositAmount" className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">
          Deposit Amount (SAR)
        </label>
        <div className="flex gap-2">
          <input
            id="depositAmount"
            type="number"
            min="0.01"
            step="0.01"
            max={quotationTotal}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            disabled={isPending}
            className="flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder="0.00"
            required
          />
          <button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {isPending ? "Creating..." : "Create Deposit"}
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
