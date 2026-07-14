"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { approveApprovedBillingScope } from "@/lib/approved-billing-scopes/actions";
import type { ApprovedBillingScopeLineSafetyStatus } from "@/lib/approved-billing-scopes/types";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";

type Props = {
  scopeId: string;
  sourceQuotationId: string;
  acceptedGrandTotal: number;
  itemCount: number;
  billableItemCount: number;
  lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus;
  locale: ServicesDictionary["locale"];
  dictionary: ServicesDictionary["approvedBillingScopes"]["detail"]["approveScope"];
  lineSafetyLabels: ServicesDictionary["approvedBillingScopes"]["lineSafetyLabels"];
};

export function ApproveApprovedBillingScopeAction({
  scopeId,
  sourceQuotationId,
  acceptedGrandTotal,
  itemCount,
  billableItemCount,
  lineSafetyStatus,
  locale,
  dictionary,
  lineSafetyLabels,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const canConfirm = lineSafetyStatus === "safe";

  function close() {
    if (isPending) return;
    setIsOpen(false);
    setError(null);
  }

  function open() {
    setSuccess(null);
    setError(null);
    setIsOpen(true);
  }

  function errorFor(code: string) {
    return dictionary.errors[code as keyof typeof dictionary.errors] ?? dictionary.errors.scope_unexpected_error;
  }

  function approve() {
    if (isPending || !canConfirm) return;
    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await approveApprovedBillingScope({ scopeId });
      if (!result.success) {
        setError(errorFor(result.error ?? "scope_unexpected_error"));
        return;
      }

      setIsOpen(false);
      setSuccess(dictionary.success);
      router.refresh();
    });
  }

  const readinessMessage =
    lineSafetyStatus === "safe"
      ? dictionary.ready
      : lineSafetyStatus === "unsafe"
        ? dictionary.unsafe
        : dictionary.pendingReview;

  return (
    <div className="space-y-2">
      <Button type="button" size="sm" onClick={open}>
        {dictionary.trigger}
      </Button>
      {success ? <p className="text-sm text-emerald-700" role="status">{success}</p> : null}

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={dictionary.title}>
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{dictionary.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{dictionary.body}</p>

            <section className="mt-5 rounded-md border p-4" aria-labelledby="approval-readiness-title">
              <h3 id="approval-readiness-title" className="font-medium">{dictionary.readiness}</h3>
              <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
                <ReadinessField label={dictionary.sourceQuotation} value={sourceQuotationId} dir="ltr" />
                <ReadinessField label={dictionary.acceptedCeiling} value={formatSarAmount(locale, acceptedGrandTotal)} dir="ltr" />
                <ReadinessField label={dictionary.itemCount} value={String(itemCount)} dir="ltr" />
                <ReadinessField label={dictionary.billableItemCount} value={String(billableItemCount)} dir="ltr" />
                <ReadinessField label={dictionary.lineSafety} value={lineSafetyLabels[lineSafetyStatus]} />
              </dl>
              <p className={`mt-4 text-sm ${canConfirm ? "text-emerald-700" : "text-destructive"}`} role="status">
                {readinessMessage}
              </p>
            </section>

            {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" disabled={isPending} onClick={close}>{dictionary.cancel}</Button>
              <Button type="button" disabled={isPending || !canConfirm} onClick={approve}>{isPending ? dictionary.approving : dictionary.confirm}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ReadinessField({ label, value, dir }: { label: string; value: string; dir?: "ltr" }) {
  return (
    <div>
      <dt className="text-xs font-medium text-muted-foreground">{label}</dt>
      <dd className="mt-1 font-medium" dir={dir}>{value}</dd>
    </div>
  );
}
