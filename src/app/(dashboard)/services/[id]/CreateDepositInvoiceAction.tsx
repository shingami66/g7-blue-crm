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
    amountCannotExceedRemaining: string;
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
    mutationKeyConflict?: string;
  };
};

/**
 * Authoritative remaining billable authority is usable only when it is a finite
 * number strictly greater than zero. Unavailable/null/NaN/zero must fail closed
 * (never substitute ceiling or coerce to zero for submission).
 */
export function isDepositRemainingAuthorityUsable(
  remainingAmount: number | null | undefined,
): remainingAmount is number {
  return (
    typeof remainingAmount === "number" &&
    Number.isFinite(remainingAmount) &&
    remainingAmount > 0
  );
}

/**
 * Client-side deposit max equals remaining authority when usable; otherwise null
 * (no HTML max / no client acceptance path).
 */
export function getDepositClientMax(
  remainingAmount: number | null | undefined,
): number | null {
  return isDepositRemainingAuthorityUsable(remainingAmount)
    ? remainingAmount
    : null;
}

/**
 * Client validation against remaining authority. Server remains authoritative.
 * Returns null when the amount is acceptable for client submission.
 */
export function validateDepositAmountAgainstRemaining(
  parsedAmount: number,
  remainingAmount: number | null | undefined,
): "invalid" | "non_positive" | "exceeds_remaining" | "remaining_unavailable" | null {
  if (!Number.isFinite(parsedAmount)) {
    return "invalid";
  }
  if (parsedAmount <= 0) {
    return "non_positive";
  }
  if (!isDepositRemainingAuthorityUsable(remainingAmount)) {
    return "remaining_unavailable";
  }
  if (parsedAmount > remainingAmount) {
    return "exceeds_remaining";
  }
  return null;
}

type CreateDepositInvoiceActionProps = {
  serviceId: string;
  quotationId: string | null;
  /** Authoritative remaining billable authority from Service billing state. */
  remainingAmount: number | null;
  canCreate: boolean;
  disabledReasons: string[];
  dictionary?: DepositActionDictionary;
};

export function CreateDepositInvoiceAction({
  serviceId,
  quotationId,
  remainingAmount,
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
  const [mutationKey, setMutationKey] = useState(() => crypto.randomUUID());
  const [hasSubmitted, setHasSubmitted] = useState(false);

  const remainingUsable = isDepositRemainingAuthorityUsable(remainingAmount);
  const clientMax = getDepositClientMax(remainingAmount);
  const disabled = !canCreate || !quotationId || !remainingUsable;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (disabled || !remainingUsable) return;

    const parsedAmount = parseFloat(amountStr);
    const validation = validateDepositAmountAgainstRemaining(
      parsedAmount,
      remainingAmount,
    );

    if (validation === "invalid") {
      setError(dictionary.validation.validAmount);
      return;
    }
    if (validation === "non_positive") {
      setError(dictionary.validation.amountGreaterThanZero);
      return;
    }
    if (
      validation === "remaining_unavailable" ||
      validation === "exceeds_remaining"
    ) {
      setError(dictionary.validation.amountCannotExceedRemaining);
      return;
    }

    setHasSubmitted(true);

    startTransition(async () => {
      const result = await createInvoiceAction({
        mutationKey,
        quotationId,
        serviceId,
        invoiceType: "deposit",
        requestedAmount: parsedAmount,
      });

      if (result.success) {
        setSuccessMsg(
          dictionary.success.replace(
            "{invoiceNumber}",
            isolateBidiText(result.invoiceNumber ?? ""),
          ),
        );
        setAmountStr("");
        setMutationKey(crypto.randomUUID());
        setHasSubmitted(false);
        router.refresh();
      } else {
        if (result.error === "MUTATION_KEY_CONFLICT") {
          setError(
            dictionary.errors.mutationKeyConflict ??
              "A conflicting request with this mutation key already exists.",
          );
        } else {
          setError(
            presentDepositInvoiceActionError(result.error, dictionary.errors),
          );
        }
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
        <label
          htmlFor="depositAmount"
          className="text-[13px] font-semibold text-on-surface uppercase tracking-wide"
        >
          {dictionary.amountLabel}
        </label>
        <div className="flex gap-2">
          <input
            id="depositAmount"
            type="number"
            min="0.01"
            step="0.01"
            max={clientMax ?? undefined}
            value={amountStr}
            onChange={(e) => {
              setAmountStr(e.target.value);
              if (hasSubmitted) {
                setMutationKey(crypto.randomUUID());
                setHasSubmitted(false);
              }
            }}
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
