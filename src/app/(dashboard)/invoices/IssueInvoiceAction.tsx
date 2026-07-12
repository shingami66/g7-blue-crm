"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueInvoiceAction } from "@/lib/invoices/actions";
import Button from "@/components/ui/Button";
import type { InvoicesDictionary } from "@/lib/i18n/dictionaries/invoices";

type IssueInvoiceActionProps = {
  invoiceId: string;
  dictionary: InvoicesDictionary["issueAction"];
};

type KnownIssueError = keyof InvoicesDictionary["issueAction"]["errors"];

export function IssueInvoiceAction({ invoiceId, dictionary }: IssueInvoiceActionProps) {
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
        setSuccessMsg(dictionary.success);
        router.refresh();
      } else {
        const errMap = dictionary.errors as Record<KnownIssueError, string>;
        const errMsg = result.error
          ? errMap[result.error as KnownIssueError] || dictionary.genericError
          : dictionary.genericError;
        setError(errMsg);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-on-surface-variant">
        {dictionary.helper}
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
        <Button
          onClick={handleSubmit}
          className="w-full"
          loading={isPending}
          variant="primary"
        >
          {isPending ? dictionary.submitting : dictionary.submit}
        </Button>
      )}
    </div>
  );
}
