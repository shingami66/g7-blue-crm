"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { createInvoiceAction } from "@/lib/invoices/actions";

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
    invoiceCreationFailed: string;
    unauthorized: string;
    forbidden: string;
    fallbackWithCode: string;
    fallback: string;
  };
};

type CreateFinalInvoiceActionProps = {
  serviceId: string;
  quotationId: string | null;
  remainingAmount: number;
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

  const disabled = !canCreate || !quotationId || remainingAmount <= 0;

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
        const errMap: Record<string, string> = {
          "invalid_invoice_input": dictionary.errors.invalidInvoiceInput,
          "final_invoice_already_exists": dictionary.errors.finalInvoiceAlreadyExists,
          "quotation_not_found": dictionary.errors.quotationNotFound,
          "quotation_not_approved": dictionary.errors.quotationNotApproved,
          "quotation_service_mismatch": dictionary.errors.quotationServiceMismatch,
          "company_settings_unavailable": dictionary.errors.companySettingsUnavailable,
          "invoice_snapshot_unavailable": dictionary.errors.invoiceSnapshotUnavailable,
          "invoice_creation_failed": dictionary.errors.invoiceCreationFailed,
          "Unauthorized": dictionary.errors.unauthorized,
          "Forbidden": dictionary.errors.forbidden,
        };
        const errMsg = result.error
          ? (errMap[result.error] || dictionary.errors.fallbackWithCode.replace("{code}", result.error))
          : dictionary.errors.fallback;
        setError(errMsg);
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
