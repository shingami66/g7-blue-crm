"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { createInvoiceAction } from "@/lib/invoices/actions";

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
    depositInvoiceAlreadyExists: string;
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

type CreateDepositInvoiceActionProps = {
  serviceId: string;
  quotationId: string | null;
  quotationTotal: number;
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

  const disabled = !canCreate || !quotationId;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (disabled) return;

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
        const errMap: Record<string, string> = {
          "invalid_invoice_input": dictionary.errors.invalidInvoiceInput,
          "deposit_amount_required": dictionary.errors.depositAmountRequired,
          "deposit_amount_exceeds_quotation_total": dictionary.errors.depositAmountExceedsQuotationTotal,
          "deposit_invoice_already_exists": dictionary.errors.depositInvoiceAlreadyExists,
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
