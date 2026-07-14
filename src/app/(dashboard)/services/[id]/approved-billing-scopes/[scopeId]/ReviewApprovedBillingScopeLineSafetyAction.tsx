"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { reviewApprovedBillingScopeLineSafety } from "@/lib/approved-billing-scopes/actions";
import type {
  ApprovedBillingScopeLineSafetyStatus,
  ApprovedBillingScopeReasonCode,
} from "@/lib/approved-billing-scopes/types";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";

type ReviewStatus = Extract<ApprovedBillingScopeLineSafetyStatus, "safe" | "unsafe">;

type Props = {
  scopeId: string;
  lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus;
  dictionary: ServicesDictionary["approvedBillingScopes"]["detail"]["reviewLineSafety"];
  lineSafetyLabels: ServicesDictionary["approvedBillingScopes"]["lineSafetyLabels"];
  reasonCodeLabels: ServicesDictionary["approvedBillingScopes"]["detail"]["editItem"]["reasonCodeLabels"];
};

const reasonCodes = Object.keys as <T extends object>(value: T) => Array<keyof T>;

function reviewStatusFor(lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus): ReviewStatus {
  return lineSafetyStatus === "unsafe" ? "unsafe" : "safe";
}

export function ReviewApprovedBillingScopeLineSafetyAction({
  scopeId,
  lineSafetyStatus,
  dictionary,
  lineSafetyLabels,
  reasonCodeLabels,
}: Props) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>(() => reviewStatusFor(lineSafetyStatus));
  const [reasonCode, setReasonCode] = useState("");
  const [reviewerNote, setReviewerNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const needsUnsafeReason = reviewStatus === "unsafe";

  function reset() {
    setReviewStatus(reviewStatusFor(lineSafetyStatus));
    setReasonCode("");
    setReviewerNote("");
    setError(null);
  }

  function close() {
    if (isPending) return;
    setIsOpen(false);
    reset();
  }

  function open() {
    setSuccess(null);
    reset();
    setIsOpen(true);
  }

  function errorFor(code: string) {
    return dictionary.errors[code as keyof typeof dictionary.errors] ?? dictionary.errors.scope_unexpected_error;
  }

  function submit() {
    if (isPending) return;

    if (needsUnsafeReason && !reasonCode) {
      setError(dictionary.validation.unsafeReasonRequired);
      return;
    }

    if (needsUnsafeReason && !reviewerNote.trim()) {
      setError(dictionary.validation.unsafeNoteRequired);
      return;
    }

    setError(null);
    setSuccess(null);
    startTransition(async () => {
      const result = await reviewApprovedBillingScopeLineSafety({
        scopeId,
        lineSafetyStatus: reviewStatus,
        ...(needsUnsafeReason
          ? {
              reasonCode: reasonCode as ApprovedBillingScopeReasonCode,
              reviewerNote: reviewerNote.trim(),
            }
          : {}),
      });

      if (!result.success) {
        setError(errorFor(result.error ?? "scope_unexpected_error"));
        return;
      }

      setIsOpen(false);
      reset();
      setSuccess(dictionary.success);
      router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <Button type="button" variant="outline" size="sm" onClick={open}>
        {dictionary.trigger}
      </Button>
      {success ? <p className="text-sm text-emerald-700" role="status">{success}</p> : null}

      {isOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" role="dialog" aria-modal="true" aria-label={dictionary.title}>
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold">{dictionary.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{dictionary.body}</p>

            <dl className="mt-5 rounded-md border p-4 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">{dictionary.currentStatus}</dt>
                <dd className="font-medium">{lineSafetyLabels[lineSafetyStatus]}</dd>
              </div>
            </dl>

            <fieldset className="mt-5 space-y-3" disabled={isPending}>
              <legend className="sr-only">{dictionary.title}</legend>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="line-safety-status"
                  value="safe"
                  checked={reviewStatus === "safe"}
                  onChange={() => setReviewStatus("safe")}
                />
                {dictionary.markSafe}
              </label>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="radio"
                  name="line-safety-status"
                  value="unsafe"
                  checked={reviewStatus === "unsafe"}
                  onChange={() => setReviewStatus("unsafe")}
                />
                {dictionary.markUnsafe}
              </label>
            </fieldset>

            {needsUnsafeReason ? (
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <label className="space-y-1 text-sm font-medium">
                  <span>{dictionary.reasonCode}</span>
                  <select
                    className="h-10 w-full rounded-md border bg-background px-3"
                    value={reasonCode}
                    disabled={isPending}
                    onChange={(event) => setReasonCode(event.target.value)}
                  >
                    <option value="">{dictionary.reasonCode}</option>
                    {reasonCodes(reasonCodeLabels).map((code) => (
                      <option key={code} value={code}>{reasonCodeLabels[code]}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-1 text-sm font-medium">
                  <span>{dictionary.reviewerNote}</span>
                  <textarea
                    className="min-h-10 w-full rounded-md border bg-background px-3 py-2"
                    value={reviewerNote}
                    disabled={isPending}
                    onChange={(event) => setReviewerNote(event.target.value)}
                  />
                </label>
              </div>
            ) : null}

            {error ? <p className="mt-4 text-sm text-destructive" role="alert">{error}</p> : null}
            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <Button type="button" variant="outline" disabled={isPending} onClick={close}>{dictionary.cancel}</Button>
              <Button type="button" disabled={isPending} onClick={submit}>{isPending ? dictionary.saving : dictionary.save}</Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
