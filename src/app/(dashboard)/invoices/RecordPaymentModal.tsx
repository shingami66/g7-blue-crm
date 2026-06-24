"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { X, Receipt, Loader2 } from "lucide-react";
import { recordPaymentAction } from "@/lib/payments/actions";

interface RecordPaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  balanceDue: number;
  onClose: () => void;
}

export function RecordPaymentModal({
  invoiceId,
  invoiceNumber,
  balanceDue,
  onClose,
}: RecordPaymentModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [amount, setAmount] = useState(balanceDue.toString());
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<"bank_transfer" | "cash" | "cheque" | "online">("bank_transfer");
  const [reference, setReference] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setError("Please enter a valid positive amount.");
      return;
    }

    if (numericAmount > balanceDue) {
      setError(`Payment cannot exceed the balance due (${balanceDue}).`);
      return;
    }

    if (!date) {
      setError("Please select a date.");
      return;
    }

    startTransition(async () => {
      const result = await recordPaymentAction({
        invoiceId,
        amount: numericAmount,
        date,
        method,
        reference: reference.trim() || undefined,
      });

      if (result.success) {
        router.refresh();
        onClose();
      } else {
        const errorMsg: Record<string, string> = {
          invalid_payment_input: "Please check your inputs.",
          invoice_not_found: "The invoice was not found.",
          payment_exceeds_balance: "Payment exceeds remaining balance.",
          invoice_not_payable: "This invoice cannot accept payments.",
          invoice_deleted: "This invoice has been deleted.",
          invalid_payment_amount: "Invalid payment amount.",
          Unauthorized: "You must be signed in.",
          Forbidden: "You don't have permission to record payments.",
        };
        setError(errorMsg[result.error!] || result.error || "An error occurred.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-surface-container-lowest border border-surface-variant rounded-xl shadow-lg w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-variant bg-surface-bright">
          <div className="flex items-center gap-2">
            <Receipt className="text-primary" size={20} />
            <h2 className="text-lg font-semibold text-on-surface">Record Payment</h2>
          </div>
          <button
            onClick={onClose}
            className="text-on-surface-variant hover:text-on-surface transition-colors rounded-full p-1 hover:bg-surface-container"
            disabled={isPending}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <p className="text-sm text-on-surface-variant mb-4">
              Recording payment for invoice <span className="font-mono font-bold text-primary">{invoiceNumber}</span>
              <br />
              Balance due: <span className="font-bold text-on-surface">{balanceDue} SAR</span>
            </p>
          </div>

          <div className="space-y-1">
            <label htmlFor="amount" className="block text-[14px] font-medium text-on-surface">
              Amount (SAR) <span className="text-red-500">*</span>
            </label>
            <input
              id="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={balanceDue}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              required
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="date" className="block text-[14px] font-medium text-on-surface">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={isPending}
              required
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          <div className="space-y-1">
            <label htmlFor="method" className="block text-[14px] font-medium text-on-surface">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <select
              id="method"
              value={method}
              onChange={(e) => setMethod(e.target.value as "bank_transfer" | "cash" | "cheque" | "online")}
              disabled={isPending}
              required
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            >
              <option value="bank_transfer">Bank Transfer</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="online">Online</option>
            </select>
          </div>

          <div className="space-y-1">
            <label htmlFor="reference" className="block text-[14px] font-medium text-on-surface">
              Reference / Notes
            </label>
            <input
              id="reference"
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              disabled={isPending}
              placeholder="e.g. Transaction ID, Check #..."
              className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-600 text-[13px] font-medium">
              {error}
            </div>
          )}

          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2 text-[14px] font-semibold text-on-surface-variant hover:bg-surface-container rounded-lg border border-transparent hover:border-outline-variant transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg text-[14px] font-semibold hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Recording...
                </>
              ) : (
                "Record Payment"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
