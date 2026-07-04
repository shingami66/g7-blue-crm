"use client";

import { useState } from "react";
import { approveQuotation, rejectQuotation } from "@/lib/quotations/actions";
import { CheckCircle, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";

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
        <Button
          onClick={handleApprove}
          loading={isApproving}
          variant="primary"
        >
          {!isApproving && <CheckCircle size={18} />}
          Approve
        </Button>
        <Button
          onClick={handleReject}
          loading={isRejecting}
          variant="danger"
        >
          {!isRejecting && <XCircle size={18} />}
          Reject
        </Button>
      </div>
      {error && <p className="text-error text-[13px] font-medium">{error}</p>}
    </div>
  );
}
