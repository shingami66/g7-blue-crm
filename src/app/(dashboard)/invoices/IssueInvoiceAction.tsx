"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { issueInvoiceAction } from "@/lib/invoices/actions";
import Button from "@/components/ui/Button";
import { getLocale } from "@/lib/i18n/locales";
import { getInvoicesDictionary } from "@/lib/i18n/dictionaries/invoices";

type IssueInvoiceActionProps = {
  invoiceId: string;
};

type KnownIssueError = keyof ReturnType<typeof getInvoicesDictionary>["issueAction"]["errors"];

export function IssueInvoiceAction({ invoiceId }: IssueInvoiceActionProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const dictionary = getInvoicesDictionary(getLocale());

  const handleSubmit = () => {
    setError(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const result = await issueInvoiceAction(invoiceId);

      if (result.success) {
        setSuccessMsg(dictionary.issueAction.success);
        router.refresh();
      } else {
        const errMap = dictionary.issueAction.errors as Record<KnownIssueError, string>;
        const errMsg = result.error
          ? errMap[result.error as KnownIssueError] || result.error
          : dictionary.issueAction.genericError;
        setError(errMsg);
      }
    });
  };

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13px] text-on-surface-variant">
        {dictionary.issueAction.helper}
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
          {isPending ? dictionary.issueAction.submitting : dictionary.issueAction.submit}
        </Button>
      )}
    </div>
  );
}
