"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { createInvoiceAction } from "@/lib/invoices/actions";
import { presentDepositInvoiceActionError } from "@/lib/invoices/action-error-presentation";

type DepositActionDictionary = {
  unavailable: string;
  amountLabel: string;
  amountPlaceholder: string;
  create: string;
  validation: {
    validAmount: string;
    amountGreaterThanZero: string;
    amountCannotExceedQuotationTotal: string;
  };
  success: string;
  errors: {
    invalidInvoiceInput: string;
    depositAmountRequired: string;
    depositAmountExceedsQuotationTotal: string;
    depositAmountExceedsRemaining: string;
    depositInvoiceAlreadyExists: string;
    quotationNotFound: string;
    quotationNotApproved: string;
    quotationServiceMismatch: string;
    companySettingsUnavailable: string;
    invoiceSnapshotUnavailable: string;
    invoiceExposureUnavailable: string;
    serviceLifecycleUnavailable: string;
    serviceNotEligibleForDeposit: string;
    invoiceCreationFailed: string;
    unauthorized: string;
    forbidden: string;
    fallback: string;
  };
};

type CreateDepositInvoiceActionProps = {
  serviceId: string;
  quotationId: string | null;
  quotationTotal: number | null;
  canCreate: boolean;
  disabledReasons: string[];
  dictionary?: DepositActionDictionary;
};

export function CreateDepositInvoiceAction({
  serviceId,
  quotationId,
  quotationTotal,
  canCreate,
  dictionary: dictionaryProp,
}: CreateDepositInvoiceActionProps) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary =
    dictionaryProp ?? getServicesDictionary(locale).billing.depositAction;
  const [isPending, startTransition] = useTransition();
  const [amountStr, setAmountStr] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const disabled = !canCreate || !quotationId || quotationTotal == null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (disabled || quotationTotal == null) return;

    const parsedAmount = parseFloat(amountStr);

    if (isNaN(parsedAmount) || !isFinite(parsedAmount)) {
      setError(dictionary.validation.validAmount);
      return;
    }

    if (parsedAmount <= 0) {
      setError(dictionary.validation.amountGreaterThanZero);
      return;
    }

    if (parsedAmount > quotationTotal) {
      setError(dictionary.validation.amountCannotExceedQuotationTotal);
      return;
    }

    startTransition(async () => {
      const result = await createInvoiceAction({
        quotationId,
        serviceId,
        invoiceType: "deposit",
        requestedAmount: parsedAmount,
      });

      if (result.success) {
        setSuccessMsg(
          dictionary.success.replace("{invoiceNumber}", isolateBidiText(result.invoiceNumber ?? "")),
        );
        setAmountStr("");
        router.refresh();
      } else {
        setError(
          presentDepositInvoiceActionError(result.error, dictionary.errors),
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
      <div className="flex flex-col gap-1">
        <label htmlFor="depositAmount" className="text-[13px] font-semibold text-on-surface uppercase tracking-wide">
          {dictionary.amountLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="depositAmount"
            type="number"
            min="0.01"
            step="0.01"
            max={quotationTotal}
            value={amountStr}
            onChange={(e) => setAmountStr(e.target.value)}
            disabled={isPending}
            dir="ltr"
            className="flex-1 px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface text-[14px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder={dictionary.amountPlaceholder}
            required
          />
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
