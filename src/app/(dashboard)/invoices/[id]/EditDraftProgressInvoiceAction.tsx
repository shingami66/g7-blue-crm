"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { useLocale } from "@/components/i18n/LocaleProvider";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { updateDraftFlexibleInvoiceAction } from "@/lib/invoices/actions";

type DraftMutationAttempt = {
  mutationKey: string;
  amountText: string;
  dueDate: string;
};

export function EditDraftProgressInvoiceAction({
  invoiceId,
  amount,
  dueDate,
}: {
  invoiceId: string;
  amount: number;
  dueDate: string;
}) {
  const router = useRouter();
  const locale = useLocale();
  const dictionary = getServicesDictionary(locale).billing.flexibleAction;
  const [amountText, setAmountText] = useState(amount.toFixed(2));
  const [resolvedDueDate, setResolvedDueDate] = useState(dueDate);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();
  const mutationAttemptRef = useRef<DraftMutationAttempt | null>(null);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setSaved(false);
    const previousAttempt = mutationAttemptRef.current;
    const mutationKey =
      previousAttempt?.amountText === amountText &&
      previousAttempt.dueDate === resolvedDueDate
        ? previousAttempt.mutationKey
        : crypto.randomUUID();
    mutationAttemptRef.current = {
      mutationKey,
      amountText,
      dueDate: resolvedDueDate,
    };
    startTransition(async () => {
      const result = await updateDraftFlexibleInvoiceAction({
        mutationKey,
        invoiceId,
        requestedAmount: Number(amountText),
        dueDate: resolvedDueDate,
      });
      if (result.success) {
        mutationAttemptRef.current = null;
        setSaved(true);
        router.refresh();
      } else {
        setError(
          result.error === "invoice_amount_exceeds_remaining"
            ? dictionary.errors.invoiceAmountExceedsRemaining
            : result.error === "invalid_flexible_amount"
              ? dictionary.errors.invalidFlexibleAmount
              : dictionary.errors.fallback,
        );
      }
    });
  };

  return (
    <form onSubmit={submit} className="mt-4 pt-4 border-t border-surface-variant space-y-3">
      <p className="text-sm font-semibold text-primary">{dictionary.amountLabel}</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <input
          type="number"
          min="0.01"
          step="0.01"
          value={amountText}
          onChange={(event) => setAmountText(event.target.value)}
          disabled={isPending}
          dir="ltr"
          className="px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm tabular-nums"
          aria-label={dictionary.amountLabel}
        />
        <input
          type="date"
          value={resolvedDueDate}
          onChange={(event) => setResolvedDueDate(event.target.value)}
          disabled={isPending}
          dir="ltr"
          className="px-3 py-2 bg-surface border border-outline-variant rounded-lg text-sm"
          aria-label={dictionary.dueDateLabel}
        />
      </div>
      <Button type="submit" disabled={isPending} loading={isPending}>
        {dictionary.create}
      </Button>
      {saved && <p className="text-sm text-green-700">{dictionary.success.replace("{invoiceNumber}", "")}</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
    </form>
  );
}
