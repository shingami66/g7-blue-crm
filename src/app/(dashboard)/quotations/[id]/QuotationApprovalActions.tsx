"use client";

import { useState } from "react";
import { approveQuotation, rejectQuotation } from "@/lib/quotations/actions";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Props {
  quotationId: string;
  status: string;
}

export default function QuotationApprovalActions({ quotationId, status }: Props) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "approved" || status === "rejected") {
    return null;
  }

  const handleApprove = async () => {
    setIsApproving(true);
    setError(null);
    try {
      const res = await approveQuotation(quotationId);
      if (!res.success) {
        setError(res.error || "Failed to approve quotation");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    setIsRejecting(true);
    setError(null);
    try {
      const res = await rejectQuotation(quotationId);
      if (!res.success) {
        setError(res.error || "Failed to reject quotation");
      }
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <button
          onClick={handleApprove}
          disabled={isApproving || isRejecting}
          className="flex items-center gap-2 px-4 py-2 bg-[#2E7D32] text-white rounded-lg text-[14px] font-semibold hover:bg-[#1B5E20] disabled:opacity-50 transition-colors"
        >
          {isApproving ? <Loader2 size={18} className="animate-spin" /> : <CheckCircle size={18} />}
          Approve
        </button>
        <button
          onClick={handleReject}
          disabled={isApproving || isRejecting}
          className="flex items-center gap-2 px-4 py-2 bg-error text-on-error rounded-lg text-[14px] font-semibold hover:opacity-90 disabled:opacity-50 transition-colors"
        >
          {isRejecting ? <Loader2 size={18} className="animate-spin" /> : <XCircle size={18} />}
          Reject
        </button>
      </div>
      {error && <p className="text-error text-[13px] font-medium">{error}</p>}
    </div>
  );
}
