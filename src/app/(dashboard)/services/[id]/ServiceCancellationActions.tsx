"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ServiceStatus } from "@/types/service";
import { cancelService } from "@/lib/services/actions";
import { getServiceStatusErrorMessage } from "@/lib/i18n/service-action-feedback";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import Button from "@/components/ui/Button";

type Props = {
  serviceId: string;
  status: ServiceStatus;
  dictionary: ServicesDictionary;
};

export default function ServiceCancellationActions({ serviceId, status, dictionary }: Props) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [isCancellationOpen, setIsCancellationOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();
  const isCancellable = status === "Inquiry" || status === "Quoted" || status === "Approved";

  const runAction = (action: () => Promise<{ success: boolean; code?: string }>) => {
    if (isPending) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await action();
      if (!result.success) {
        setError(getServiceStatusErrorMessage(result.code, dictionary));
        return;
      }

      setReason("");
      setIsCancellationOpen(false);
      setSuccess(true);
      router.refresh();
    });
  };

  const closeCancellation = () => {
    setIsCancellationOpen(false);
    setReason("");
    setError(null);
    window.requestAnimationFrame(() => cancelTriggerRef.current?.focus());
  };

  if (!isCancellable) return null;

  return (
    <section
      aria-labelledby="service-danger-zone-title"
      aria-busy={isPending || undefined}
      className="overflow-hidden rounded-xl border border-error/20 bg-surface-container-lowest"
    >
      <div className="border-b border-error/20 bg-surface-bright px-5 py-3">
        <h3 id="service-danger-zone-title" className="font-semibold text-error">
          {dictionary.serviceStatusControl.dangerZoneTitle}
        </h3>
        <p className="mt-1 text-[13px] text-on-surface-variant">
          {dictionary.serviceStatusControl.dangerZoneHint}
        </p>
      </div>
      <div className="space-y-3 p-5">
        {!isCancellationOpen ? (
          <button
            ref={cancelTriggerRef}
            type="button"
            aria-expanded={isCancellationOpen}
            aria-controls="service-cancellation-disclosure"
            onClick={() => {
              setError(null);
              setSuccess(false);
              setIsCancellationOpen(true);
            }}
            disabled={isPending}
            className="min-h-11 rounded-lg border border-error/70 bg-surface px-5 text-[14px] font-semibold text-error transition-colors hover:bg-error-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:cursor-not-allowed disabled:opacity-50"
          >
            {dictionary.serviceStatusControl.cancelService}
          </button>
        ) : (
          <form
            id="service-cancellation-disclosure"
            aria-describedby="service-cancellation-warning"
            className="max-w-2xl rounded-lg border border-error/40 bg-error-container p-4"
            onSubmit={(event) => {
              event.preventDefault();
              runAction(() => cancelService(serviceId, reason));
            }}
          >
            <p id="service-cancellation-warning" className="text-[13px] text-on-error-container">
              {dictionary.serviceStatusControl.cancellationConfirm}
            </p>
            <label
              htmlFor="service-cancellation-reason"
              className="mt-3 block text-[13px] font-semibold text-on-error-container"
            >
              {dictionary.serviceStatusControl.cancellationReasonLabel}
            </label>
            <textarea
              id="service-cancellation-reason"
              autoFocus
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={1000}
              disabled={isPending}
              rows={3}
              placeholder={dictionary.serviceStatusControl.cancellationReasonPlaceholder}
              className="mt-2 w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[14px] text-on-surface focus:border-error focus:outline-none focus:ring-1 focus:ring-error disabled:opacity-50"
            />
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                type="submit"
                disabled={isPending || reason.trim().length === 0}
                loading={isPending}
                loadingLabel={dictionary.serviceStatusControl.saving}
                variant="danger"
                className="min-h-11 rounded-lg px-4 text-[14px] focus-visible:ring-error"
              >
                {dictionary.serviceStatusControl.confirmCancel}
              </Button>
              <Button
                type="button"
                onClick={closeCancellation}
                disabled={isPending}
                variant="outline"
                className="min-h-11 rounded-lg px-4 text-[14px] focus-visible:ring-primary"
              >
                {dictionary.serviceStatusControl.keepService}
              </Button>
            </div>
          </form>
        )}

        {error && <p className="text-[13px] text-error" role="alert" aria-live="assertive">{error}</p>}
        {success && (
          <p className="text-[13px] font-medium text-emerald-600" role="status" aria-live="polite">
            {dictionary.serviceStatusControl.updatedSuccessfully}
          </p>
        )}
      </div>
    </section>
  );
}
