"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { createInvoiceAction } from "@/lib/invoices/actions";
import { presentFlexibleInvoiceActionError } from "@/lib/invoices/action-error-presentation";

type FlexibleActionDictionary = {
  unavailable: string;
  amountLabel: string;
  amountPlaceholder: string;
  dueDateLabel: string;
  dueDateHelper: string;
  create: string;
  success: string;
  validation: {
    validAmount: string;
    amountGreaterThanZero: string;
    amountCannotExceedRemaining: string;
    dueDateRequired: string;
  };
  errors: {
    invalidInvoiceInput: string;
    invalidFlexibleAmount: string;
    invoiceAmountExceedsRemaining: string;
    quotationNotFound: string;
    quotationNotApproved: string;
    quotationServiceMismatch: string;
    companySettingsUnavailable: string;
    invoiceSnapshotUnavailable: string;
    invoiceCreationFailed: string;
    unauthorized: string;
    forbidden: string;
    fallback: string;
    serviceLifecycleUnavailable: string;
    serviceNotEligibleForFlexible: string;
    billingScopeInactive: string;
    billingScopeAuthorityUnavailable: string;
    mutationKeyConflict?: string;
  };
};

type CreateFlexibleInvoiceActionProps = {
  serviceId: string;
  quotationId: string | null;
  remainingAmount: number | null;
  canCreate: boolean;
  dictionary?: FlexibleActionDictionary;
};

function isUsableRemaining(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function hasAtMostTwoDecimals(value: number): boolean {
  const text = value.toString();
  const decimals = text.includes(".") ? text.split(".")[1] : "";
  return decimals.length <= 2 && Number(value.toFixed(2)) === value;
}

export function CreateFlexibleInvoiceAction({
  serviceId,
  quotationId,
  remainingAmount,
  canCreate,
  dictionary: dictionaryProp,
}: CreateFlexibleInvoiceActionProps) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary =
    dictionaryProp ?? getServicesDictionary(locale).billing.flexibleAction;
  const [isPending, startTransition] = useTransition();
  const [amountStr, setAmountStr] = useState("");
  const [dueDate, setDueDate] = useState(() =>
    new Date().toISOString().slice(0, 10),
  );
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [mutationKey, setMutationKey] = useState(() => crypto.randomUUID());

  const remainingUsable = isUsableRemaining(remainingAmount);
  const disabled = !canCreate || !quotationId || !remainingUsable;

  const resetMutation = () => setMutationKey(crypto.randomUUID());

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccessMsg(null);
    if (disabled || !remainingUsable || !quotationId) return;

    const parsedAmount = Number(amountStr);
    if (!Number.isFinite(parsedAmount)) {
      setError(dictionary.validation.validAmount);
      return;
    }
    if (parsedAmount <= 0) {
      setError(dictionary.validation.amountGreaterThanZero);
      return;
    }
    if (!hasAtMostTwoDecimals(parsedAmount) || parsedAmount > remainingAmount) {
      setError(dictionary.validation.amountCannotExceedRemaining);
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
      setError(dictionary.validation.dueDateRequired);
      return;
    }

    startTransition(async () => {
      const result = await createInvoiceAction({
        mutationKey,
        quotationId,
        serviceId,
        invoiceType: "progress",
        requestedAmount: parsedAmount,
        dueDate,
      });

      if (result.success) {
        setSuccessMsg(
          dictionary.success.replace(
            "{invoiceNumber}",
            isolateBidiText(result.invoiceNumber ?? ""),
          ),
        );
        setAmountStr("");
        resetMutation();
        router.refresh();
      } else if (result.error === "MUTATION_KEY_CONFLICT") {
        setError(
          dictionary.errors.mutationKeyConflict ??
            "A conflicting request with this mutation key already exists.",
        );
      } else {
        setError(
          presentFlexibleInvoiceActionError(result.error, dictionary.errors),
        );
      }
    });
  };

  if (disabled) {
    return (
      <div className="text-[14px] text-on-surface-variant italic">
        {dictionary.unavailable}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3 max-w-xl">
      <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_auto] gap-3">
        <div className="flex flex-col gap-1">
          <label htmlFor="progressInvoiceAmount" className="text-[13px] font-semibold text-on-surface">
            {dictionary.amountLabel}
          </label>
          <input
            id="progressInvoiceAmount"
            type="number"
            min="0.01"
            step="0.01"
            value={amountStr}
            onChange={(event) => {
              setAmountStr(event.target.value);
              setError(null);
              resetMutation();
            }}
            disabled={isPending}
            dir="ltr"
            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface text-[14px] tabular-nums focus:outline-none focus:ring-2 focus:ring-primary/50"
            placeholder={dictionary.amountPlaceholder}
            required
          />
        </div>
        <div className="flex flex-col gap-1">
          <label htmlFor="progressInvoiceDueDate" className="text-[13px] font-semibold text-on-surface">
            {dictionary.dueDateLabel}
          </label>
          <input
            id="progressInvoiceDueDate"
            type="date"
            value={dueDate}
            onChange={(event) => {
              setDueDate(event.target.value);
              setError(null);
              resetMutation();
            }}
            disabled={isPending}
            dir="ltr"
            className="px-3 py-2 bg-surface border border-outline-variant rounded-lg text-on-surface text-[14px] focus:outline-none focus:ring-2 focus:ring-primary/50"
            required
          />
        </div>
      </div>
      <p className="text-xs text-on-surface-variant">{dictionary.dueDateHelper}</p>
      <Button
        type="submit"
        disabled={isPending}
        className="self-start px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
        loading={isPending}
      >
        {dictionary.create}
      </Button>
      {error && <div className="text-[13px] text-red-600 bg-red-50 p-2 rounded border border-red-100">{error}</div>}
      {successMsg && <div className="text-[13px] text-green-700 bg-green-50 p-2 rounded border border-green-100">{successMsg}</div>}
    </form>
  );
}
