"use client";

import { useState } from "react";
import { approveQuotation, rejectQuotation } from "@/lib/quotations/actions";
import { CheckCircle, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";

interface Props {
  quotationId: string;
  status: string;
  dictionary: QuotationsDictionary["approval"];
}

export default function QuotationApprovalActions({ quotationId, status, dictionary }: Props) {
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isPending = isApproving || isRejecting;

  if (status === "approved" || status === "rejected") {
    return null;
  }

  const handleApprove = async () => {
    if (isPending) return;
    setIsApproving(true);
    setError(null);
    try {
      const res = await approveQuotation(quotationId);
      if (!res.success) {
        setError(dictionary.approveFailed);
      }
    } catch {
      setError(dictionary.unexpectedError);
    } finally {
      setIsApproving(false);
    }
  };

  const handleReject = async () => {
    if (isPending) return;
    setIsRejecting(true);
    setError(null);
    try {
      const res = await rejectQuotation(quotationId);
      if (!res.success) {
        setError(dictionary.rejectFailed);
      }
    } catch {
      setError(dictionary.unexpectedError);
    } finally {
      setIsRejecting(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <Button
          onClick={handleApprove}
          disabled={isPending && !isApproving}
          loading={isApproving}
          loadingLabel={dictionary.approve}
          variant="primary"
        >
          {!isApproving && <CheckCircle size={18} />}
          {dictionary.approve}
        </Button>
        <Button
          onClick={handleReject}
          disabled={isPending && !isRejecting}
          loading={isRejecting}
          loadingLabel={dictionary.reject}
          variant="danger"
        >
          {!isRejecting && <XCircle size={18} />}
          {dictionary.reject}
        </Button>
      </div>
      {error && <p className="text-error text-[13px] font-medium" role="alert">{error}</p>}
    </div>
  );
}
