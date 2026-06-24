"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueInvoiceAction } from "@/lib/invoices/actions";

type IssueInvoiceActionProps = {
  invoiceId: string;
};

export function IssueInvoiceAction({ invoiceId }: IssueInvoiceActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSubmit = () => {
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await issueInvoiceAction(invoiceId);

      if (result.success) {
        setSuccessMsg("Invoice issued successfully.");
        router.refresh();
      } else {
        const errMap: Record<string, string> = {
          "invalid_invoice_id": "Invalid invoice ID.",
          "invoice_not_found": "Invoice not found or deleted.",
          "invoice_not_draft": "Only draft invoices can be issued.",
          "invoice_update_failed": "Failed to update invoice status.",
          "Unauthorized": "You are not authorized to perform this action.",
          "Forbidden": "You do not have permission to issue invoices.",
        };
        const errMsg = result.error ? (errMap[result.error] || `Unable to issue invoice. Error code: ${result.error}`) : "Unable to issue invoice. Please try again.";
        setError(errMsg);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-on-surface-variant">
        Issuing this invoice will mark it as Issued and set the issue date. Amounts and snapshots will not be changed.
      </p>
      
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

      {!successMsg && (
        <button
          onClick={handleSubmit}
          disabled={isPending}
          className="w-full flex justify-center items-center gap-2 bg-primary hover:bg-primary-container text-on-primary py-2 rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? "Issuing..." : "Issue Invoice"}
        </button>
      )}
    </div>
  );
}
