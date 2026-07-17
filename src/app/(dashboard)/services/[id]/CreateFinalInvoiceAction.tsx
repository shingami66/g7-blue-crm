"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { createInvoiceAction } from "@/lib/invoices/actions";
import { presentFinalInvoiceActionError } from "@/lib/invoices/action-error-presentation";

type FinalActionDictionary = {
  unavailable: string;
  amountSummary: string;
  create: string;
  success: string;
  errors: {
    invalidInvoiceInput: string;
    finalInvoiceAlreadyExists: string;
    quotationNotFound: string;
    quotationNotApproved: string;
    quotationServiceMismatch: string;
    companySettingsUnavailable: string;
    invoiceSnapshotUnavailable: string;
    serviceLifecycleUnavailable: string;
    serviceNotEligibleForFinal: string;
    invoiceCreationFailed: string;
    unauthorized: string;
    forbidden: string;
    fallback: string;
  };
};

type CreateFinalInvoiceActionProps = {
  serviceId: string;
  quotationId: string | null;
  /** Null when remaining is not authoritative (e.g. historical ABS without active authority). */
  remainingAmount: number | null;
  canCreate: boolean;
  dictionary?: FinalActionDictionary;
};

export function CreateFinalInvoiceAction({
  serviceId,
  quotationId,
  remainingAmount,
  canCreate,
  dictionary: dictionaryProp,
}: CreateFinalInvoiceActionProps) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary =
    dictionaryProp ?? getServicesDictionary(locale).billing.finalAction;
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const disabled =
    !canCreate ||
    !quotationId ||
    remainingAmount == null ||
    remainingAmount <= 0;

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
        setSuccessMsg(
          dictionary.success.replace("{invoiceNumber}", isolateBidiText(result.invoiceNumber ?? "")),
        );
        router.refresh();
      } else {
        setError(
          presentFinalInvoiceActionError(result.error, dictionary.errors),
        );
      }
    });
  };

  if (disabled) {
    return (
      <div className="flex flex-col gap-3">
        <div className="text-[14px] text-on-surface-variant italic">
          {dictionary.unavailable}
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-sm">
      <div className="flex flex-col gap-2">
        <div className="text-[13px] text-on-surface-variant">
          {dictionary.amountSummary}
        </div>
        <div className="flex gap-2">
          <Button
            type="submit"
            disabled={isPending}
            className="px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            loading={isPending}
          >
            {dictionary.create}
          </Button>
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
