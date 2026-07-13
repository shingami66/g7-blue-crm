"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ServiceStatus,
  ServiceStatusTransitionAction,
  ServiceStatusTransitionState,
} from "@/types/service";
import { updateServiceStatusAction } from "@/lib/services/actions";
import { getServiceStatusErrorMessage } from "@/lib/i18n/service-action-feedback";
import { getServiceStatusLabel, type ServicesDictionary } from "@/lib/i18n/dictionaries/services";

interface ServiceStatusControlProps {
  serviceId: string;
  currentStatus: ServiceStatus;
  transitionState: ServiceStatusTransitionState;
  dictionary: ServicesDictionary;
}

export default function ServiceStatusControl({
  serviceId,
  currentStatus,
  transitionState,
  dictionary,
}: ServiceStatusControlProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const router = useRouter();

  const handleTransition = (action: ServiceStatusTransitionAction) => {
    setError(null);
    setSuccess(false);

    startTransition(async () => {
      const result = await updateServiceStatusAction(serviceId, {
        status: action.status,
        cancellation_reason: action.requiresCancellationReason
          ? cancellationReason
          : undefined,
      });

      if (result.success) {
        setSuccess(true);
        setCancellationReason("");
        router.refresh();
        setTimeout(() => setSuccess(false), 3000);
      } else {
        setError(getServiceStatusErrorMessage(result.code, dictionary));
      }
    });
  };

  const availableActions = transitionState.actions.filter(
    (action) => !action.blockedReason
  );
  const blockedActions = transitionState.actions.filter(
    (action) => action.blockedReason
  );
  const cancellationAction = availableActions.find(
    (action) => action.requiresCancellationReason
  );
  const forwardActions = availableActions.filter(
    (action) => !action.requiresCancellationReason
  );
  const cancellationReasonMissing =
    !!cancellationAction && cancellationReason.trim().length === 0;

  return (
    <div className="mt-6 mb-6 min-w-0 max-w-full overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="flex items-center justify-between border-b border-surface-variant bg-surface-bright px-6 py-4">
        <div className="min-w-0">
          <h3 className="font-semibold text-primary">{dictionary.serviceStatusControl.title}</h3>
          <p className="mt-1 break-words text-[13px] text-on-surface-variant">
            {dictionary.serviceStatusControl.currentStatus}: {getServiceStatusLabel(dictionary.locale, currentStatus)}
          </p>
        </div>
      </div>
      <div className="min-w-0 space-y-5 p-6">
        {transitionState.isTerminal ? (
          <p className="text-[14px] text-on-surface-variant">
            {dictionary.serviceStatusControl.terminalMessage}
          </p>
        ) : (
          <>
            <div className="flex flex-wrap gap-3">
              {forwardActions.map((action) => (
                <button
                  key={action.status}
                  onClick={() => handleTransition(action)}
                  disabled={isPending}
                  className="min-h-[40px] px-5 bg-primary text-on-primary font-semibold text-[14px] rounded-lg hover:bg-primary-container disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? dictionary.serviceStatusControl.saving : action.label}
                </button>
              ))}
              {forwardActions.length === 0 && !cancellationAction && (
                <p className="text-[14px] text-on-surface-variant">
                  {dictionary.serviceStatusControl.noActions}
                </p>
              )}
            </div>

            {forwardActions.map((action) => (
              <p key={`${action.status}-description`} className="text-[13px] text-on-surface-variant">
                {action.description}
              </p>
            ))}

            {cancellationAction && (
              <div className="border-t border-surface-variant pt-5 space-y-3">
                <label htmlFor="cancellation-reason" className="text-[13px] font-semibold text-on-surface">
                  {dictionary.serviceStatusControl.cancellationReason}
                </label>
                <textarea
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  disabled={isPending}
                  rows={3}
                  className="w-full max-w-2xl px-3 py-2 bg-surface border border-outline-variant rounded-lg text-[14px] text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder={dictionary.serviceStatusControl.cancellationPlaceholder}
                />
                <button
                  onClick={() => handleTransition(cancellationAction)}
                  disabled={isPending || cancellationReasonMissing}
                  className="min-h-[40px] px-5 bg-error text-on-error font-semibold text-[14px] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? dictionary.serviceStatusControl.saving : cancellationAction.label}
                </button>
              </div>
            )}

            {blockedActions.length > 0 && (
              <div className="min-w-0 rounded-lg border border-outline-variant bg-surface p-4">
                <h4 className="mb-2 text-[13px] font-semibold text-on-surface">
                  {dictionary.serviceStatusControl.blockedActions}
                </h4>
                <ul className="min-w-0 space-y-2">
                  {blockedActions.map((action) => (
                    <li
                      key={action.status}
                      className="min-w-0 break-words text-[13px] text-on-surface-variant"
                    >
                      <span className="font-semibold text-on-surface">{action.label}:</span>{" "}
                      {action.blockedReason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
        {error && (
          <div className="text-[13px] text-error">
            {error}
          </div>
        )}

        {success && (
          <div className="text-[13px] text-emerald-600 font-medium">
            {dictionary.serviceStatusControl.updatedSuccessfully}
          </div>
        )}
      </div>
    </div>
  );
}
