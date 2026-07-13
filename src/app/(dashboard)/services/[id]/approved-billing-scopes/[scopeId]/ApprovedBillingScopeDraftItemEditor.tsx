"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { editApprovedBillingScopeItem } from "@/lib/approved-billing-scopes/actions";
import {
  APPROVED_BILLING_SCOPE_REASON_CODES,
  type ApprovedBillingScopeItem,
  type ApprovedBillingScopeItemDecision,
  type ApprovedBillingScopeReasonCode,
} from "@/lib/approved-billing-scopes/types";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";

type DraftItem = Pick<
  ApprovedBillingScopeItem,
  | "id"
  | "decision"
  | "sourceQty"
  | "sourceUnitPrice"
  | "sourceGrandTotal"
  | "acceptedQty"
  | "acceptedUnitPrice"
  | "acceptedGrandTotal"
  | "reasonCode"
  | "reasonNote"
>;

type Props = {
  scopeId: string;
  sourceVatRate: number;
  item: DraftItem;
  locale: ServicesDictionary["locale"];
  dictionary: ServicesDictionary["approvedBillingScopes"]["detail"]["editItem"];
  decisionLabels: ServicesDictionary["approvedBillingScopes"]["detail"]["itemDecisionLabels"];
};

const decisions: ApprovedBillingScopeItemDecision[] = [
  "accepted",
  "adjusted",
  "excluded",
  "customer_supplied",
];

function initialValues(item: DraftItem) {
  return {
    decision: item.decision,
    acceptedQty: item.acceptedQty?.toString() ?? "",
    acceptedUnitPrice: item.acceptedUnitPrice?.toString() ?? "",
    reasonCode: item.reasonCode ?? "",
    reasonNote: item.reasonNote ?? "",
  };
}

export function ApprovedBillingScopeDraftItemEditor({
  scopeId,
  sourceVatRate,
  item,
  locale,
  dictionary,
  decisionLabels,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [values, setValues] = useState(() => initialValues(item));
  const [error, setError] = useState<string | null>(null);

  const isReductionDecision =
    values.decision === "excluded" || values.decision === "customer_supplied";
  const isAdjusted = values.decision === "adjusted";
  const needsReason = values.decision !== "accepted";

  function close() {
    if (isPending) return;
    setIsOpen(false);
    setError(null);
    setValues(initialValues(item));
  }

  function setDecision(decision: ApprovedBillingScopeItemDecision) {
    setValues((current) => ({
      ...current,
      decision,
      acceptedQty:
        decision === "accepted" ? item.sourceQty.toString() : current.acceptedQty,
      acceptedUnitPrice:
        decision === "accepted"
          ? item.sourceUnitPrice.toString()
          : current.acceptedUnitPrice,
    }));
  }

  function errorFor(code: string) {
    return dictionary.errors[code as keyof typeof dictionary.errors] ?? dictionary.errors.scope_unexpected_error;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    const acceptedQty = values.acceptedQty === "" ? undefined : Number(values.acceptedQty);
    const acceptedUnitPrice =
      values.acceptedUnitPrice === "" ? undefined : Number(values.acceptedUnitPrice);

    if (isAdjusted && acceptedQty === undefined && acceptedUnitPrice === undefined) {
      setError(dictionary.validation.adjustedValueRequired);
      return;
    }

    if (acceptedQty !== undefined && acceptedQty > item.sourceQty) {
      setError(dictionary.validation.quantityCannotIncrease);
      return;
    }

    if (acceptedUnitPrice !== undefined && acceptedUnitPrice > item.sourceUnitPrice) {
      setError(dictionary.validation.unitPriceCannotIncrease);
      return;
    }

    if (needsReason && !values.reasonCode) {
      setError(dictionary.validation.reasonRequired);
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await editApprovedBillingScopeItem({
        scopeId,
        itemId: item.id,
        decision: values.decision,
        ...(isAdjusted ? { acceptedQty, acceptedUnitPrice } : {}),
        ...(needsReason
          ? {
              reasonCode: values.reasonCode as ApprovedBillingScopeReasonCode,
              reasonNote: values.reasonNote.trim() || undefined,
            }
          : {}),
      });

      if (!result.success) {
        setError(errorFor(result.error ?? "scope_unexpected_error"));
        return;
      }

      setIsOpen(false);
      setValues(initialValues(item));
      router.refresh();
    });
  }

  return (
    <>
      <Button type="button" variant="outline" size="sm" onClick={() => setIsOpen(true)}>
        {dictionary.trigger}
      </Button>

      {isOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={dictionary.title}
        >
          <form
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-background p-6 shadow-lg"
            onSubmit={handleSubmit}
          >
            <h2 className="text-lg font-semibold">{dictionary.title}</h2>

            <div className="mt-5 grid gap-4 rounded-md border p-4 text-sm sm:grid-cols-2">
              <div>
                <p className="font-medium">{dictionary.sourceValues}</p>
                <dl className="mt-2 space-y-1 text-muted-foreground">
                  <div className="flex justify-between gap-3"><dt>{dictionary.sourceQuantity}</dt><dd dir="ltr">{item.sourceQty}</dd></div>
                  <div className="flex justify-between gap-3"><dt>{dictionary.sourceUnitPrice}</dt><dd dir="ltr">{formatSarAmount(locale, item.sourceUnitPrice)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>{dictionary.vatRate}</dt><dd dir="ltr">{sourceVatRate}%</dd></div>
                  <div className="flex justify-between gap-3"><dt>{dictionary.sourceLineTotal}</dt><dd dir="ltr">{formatSarAmount(locale, item.sourceGrandTotal)}</dd></div>
                </dl>
              </div>
              <div>
                <p className="font-medium">{dictionary.acceptedValues}</p>
                <dl className="mt-2 space-y-1 text-muted-foreground">
                  <div className="flex justify-between gap-3"><dt>{dictionary.acceptedQuantity}</dt><dd dir="ltr">{isReductionDecision ? 0 : item.acceptedQty}</dd></div>
                  <div className="flex justify-between gap-3"><dt>{dictionary.acceptedUnitPrice}</dt><dd dir="ltr">{formatSarAmount(locale, isReductionDecision ? 0 : item.acceptedUnitPrice)}</dd></div>
                  <div className="flex justify-between gap-3"><dt>{dictionary.acceptedLineTotal}</dt><dd dir="ltr">{formatSarAmount(locale, isReductionDecision ? 0 : item.acceptedGrandTotal)}</dd></div>
                </dl>
              </div>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="space-y-1 text-sm font-medium sm:col-span-2">
                <span>{dictionary.decision}</span>
                <select className="h-10 w-full rounded-md border bg-background px-3" value={values.decision} disabled={isPending} onChange={(event) => setDecision(event.target.value as ApprovedBillingScopeItemDecision)}>
                  {decisions.map((decision) => <option key={decision} value={decision}>{decisionLabels[decision]}</option>)}
                </select>
              </label>

              {isAdjusted ? <>
                <label className="space-y-1 text-sm font-medium"><span>{dictionary.acceptedQuantity}</span><input className="h-10 w-full rounded-md border bg-background px-3" type="number" dir="ltr" min="0" max={item.sourceQty} step="0.01" value={values.acceptedQty} disabled={isPending} onChange={(event) => setValues((current) => ({ ...current, acceptedQty: event.target.value }))} /></label>
                <label className="space-y-1 text-sm font-medium"><span>{dictionary.acceptedUnitPrice}</span><input className="h-10 w-full rounded-md border bg-background px-3" type="number" dir="ltr" min="0" max={item.sourceUnitPrice} step="0.01" value={values.acceptedUnitPrice} disabled={isPending} onChange={(event) => setValues((current) => ({ ...current, acceptedUnitPrice: event.target.value }))} /></label>
              </> : null}

              {needsReason ? <>
                <label className="space-y-1 text-sm font-medium"><span>{dictionary.reasonCode}</span><select className="h-10 w-full rounded-md border bg-background px-3" value={values.reasonCode} disabled={isPending} onChange={(event) => setValues((current) => ({ ...current, reasonCode: event.target.value }))}><option value="">{dictionary.reasonCode}</option>{APPROVED_BILLING_SCOPE_REASON_CODES.map((reasonCode) => <option key={reasonCode} value={reasonCode}>{dictionary.reasonCodeLabels[reasonCode]}</option>)}</select></label>
                <label className="space-y-1 text-sm font-medium"><span>{dictionary.reasonNote} ({dictionary.reasonNoteOptional})</span><input className="h-10 w-full rounded-md border bg-background px-3" value={values.reasonNote} disabled={isPending} onChange={(event) => setValues((current) => ({ ...current, reasonNote: event.target.value }))} /></label>
              </> : null}
            </div>

            {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}
            <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="outline" disabled={isPending} onClick={close}>{dictionary.cancel}</Button>
              <Button type="submit" disabled={isPending}>{isPending ? dictionary.saving : dictionary.save}</Button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
