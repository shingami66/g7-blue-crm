"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { approveQuotation, rejectQuotation, softDeleteQuotation } from "@/lib/quotations/actions";
import { CheckCircle, Trash2, XCircle } from "lucide-react";
import Button from "@/components/ui/Button";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";

interface Props {
  quotationId: string;
  status: string;
  canApprove: boolean;
  canWrite: boolean;
  dictionary: QuotationsDictionary["approval"];
  listDictionary: QuotationsDictionary["list"];
}

export default function QuotationApprovalActions({ quotationId, status, canApprove, canWrite, dictionary, listDictionary }: Props) {
  const router = useRouter();
  const [isApproving, setIsApproving] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const isPending = isApproving || isRejecting || isDeleting;
  const showApprovalActions = canApprove && (status === "draft" || status === "sent");

  if (!showApprovalActions && !canWrite) {
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

  const handleDelete = async () => {
    if (!canWrite || isPending || status === "approved") return;
    if (!window.confirm(listDictionary.deleteConfirm)) return;

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const result = await softDeleteQuotation(quotationId);
      if (!result.success) setDeleteError(listDictionary.deleteFailed);
      else router.refresh();
    } catch {
      setDeleteError(listDictionary.deleteFailed);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex flex-wrap items-start gap-2">
      {showApprovalActions && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Button
              onClick={handleApprove}
              disabled={isPending && !isApproving}
              loading={isApproving}
              loadingLabel={dictionary.approve}
              variant="primary"
              size="sm"
              className="h-9 min-h-9 whitespace-nowrap"
            >
              {!isApproving && <CheckCircle size={15} />}
              {dictionary.approve}
            </Button>
            <Button
              onClick={handleReject}
              disabled={isPending && !isRejecting}
              loading={isRejecting}
              loadingLabel={dictionary.reject}
              variant="danger"
              size="sm"
              className="h-9 min-h-9 whitespace-nowrap"
            >
              {!isRejecting && <XCircle size={15} />}
              {dictionary.reject}
            </Button>
          </div>
          {error && <p className="text-error text-[13px] font-medium" role="alert">{error}</p>}
        </div>
      )}
      {canWrite && (
        <div className="flex flex-col gap-2">
          <Button
            type="button"
            onClick={handleDelete}
            disabled={status === "approved" || isPending}
            loading={isDeleting}
            variant="danger"
            size="sm"
            className="h-9 w-9 min-h-9 p-0"
            title={status === "approved" ? listDictionary.actionTitles.approvedCannotDelete : listDictionary.actionTitles.deleteQuotation}
            aria-label={status === "approved" ? listDictionary.actionTitles.approvedCannotDelete : listDictionary.actionTitles.deleteQuotation}
          >
            {!isDeleting && <Trash2 size={15} aria-hidden="true" />}
          </Button>
          {deleteError && <p className="text-error text-[13px] font-medium" role="alert">{deleteError}</p>}
        </div>
      )}
    </div>
  );
}
