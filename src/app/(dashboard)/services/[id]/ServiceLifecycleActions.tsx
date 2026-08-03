"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ServiceStatus } from "@/types/service";
import {
  cancelService,
  completeService,
  startServiceExecution,
} from "@/lib/services/actions";
import { getServiceStatusErrorMessage } from "@/lib/i18n/service-action-feedback";
import {
  getServiceStatusLabel,
  type ServicesDictionary,
} from "@/lib/i18n/dictionaries/services";

type Props = {
  serviceId: string;
  status: ServiceStatus;
  dictionary: ServicesDictionary;
};

export default function ServiceLifecycleActions({ serviceId, status, dictionary }: Props) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [isCancellationOpen, setIsCancellationOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const cancelTriggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const isStart = status === "Deposit Paid";
  const isComplete = status === "In Progress";
  const isCancellable = status === "Inquiry" || status === "Quoted" || status === "Approved";

  const runAction = (action: () => Promise<{ success: boolean; code?: string }>) => {
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

  if (!isStart && !isComplete && !isCancellable) return null;

  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest overflow-hidden">
      <div className="border-b border-surface-variant bg-surface-bright px-5 py-3">
        <h3 className="font-semibold text-primary">{dictionary.serviceStatusControl.title}</h3>
        <p className="mt-1 text-[13px] text-on-surface-variant">
          {getServiceStatusLabel(dictionary.locale, status)}
        </p>
      </div>
      <div className="space-y-4 p-5">
        {(isStart || isComplete) && (
          <button
            type="button"
            onClick={() => runAction(isStart
              ? () => startServiceExecution(serviceId)
              : () => completeService(serviceId))}
            disabled={isPending}
            className="min-h-11 rounded-lg bg-primary px-5 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isPending
              ? dictionary.serviceStatusControl.saving
              : isStart
                ? dictionary.serviceStatusControl.startExecution
                : dictionary.serviceStatusControl.completeService}
          </button>
        )}

        {isCancellable && (
          <div className="space-y-3 border-t border-surface-variant pt-4">
            {!isCancellationOpen ? (
              <button
                ref={cancelTriggerRef}
                type="button"
                aria-expanded="false"
                aria-controls="service-cancellation-disclosure"
                onClick={() => {
                  setError(null);
                  setSuccess(false);
                  setIsCancellationOpen(true);
                }}
                disabled={isPending}
                className="min-h-11 rounded-lg border border-error bg-surface px-5 text-[14px] font-semibold text-error transition-colors hover:bg-error-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dictionary.serviceStatusControl.cancelService}
              </button>
            ) : (
              <form
                id="service-cancellation-disclosure"
                className="max-w-2xl rounded-lg border border-error/40 bg-error-container p-4"
                onSubmit={(event) => {
                  event.preventDefault();
                  runAction(() => cancelService(serviceId, reason));
                }}
              >
                <p className="text-[13px] text-on-error-container">
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
                  <button type="submit" disabled={isPending || reason.trim().length === 0} className="min-h-11 rounded-lg bg-error px-4 text-[14px] font-semibold text-on-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error disabled:cursor-not-allowed disabled:opacity-50">{isPending ? dictionary.serviceStatusControl.saving : dictionary.serviceStatusControl.confirmCancel}</button>
                  <button type="button" onClick={closeCancellation} disabled={isPending} className="min-h-11 rounded-lg border border-outline-variant bg-surface px-4 text-[14px] font-semibold text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50">{dictionary.serviceStatusControl.keepService}</button>
                </div>
              </form>
            )}
          </div>
        )}

        {error && <p className="text-[13px] text-error" role="alert">{error}</p>}
        {success && (
          <p className="text-[13px] font-medium text-emerald-600" role="status">
            {dictionary.serviceStatusControl.updatedSuccessfully}
          </p>
        )}
      </div>
    </section>
  );
}
