"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ServiceStatus,
  ServiceStatusTransitionAction,
  ServiceStatusTransitionState,
} from "@/types/service";
import { updateServiceStatusAction } from "@/lib/services/actions";

interface ServiceStatusControlProps {
  serviceId: string;
  currentStatus: ServiceStatus;
  transitionState: ServiceStatusTransitionState;
}

export default function ServiceStatusControl({
  serviceId,
  currentStatus,
  transitionState,
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
        setError(result.error || "Failed to update status");
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
    <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden mt-6 mb-6">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
        <div>
          <h3 className="font-semibold text-primary">Status Actions</h3>
          <p className="text-[13px] text-on-surface-variant mt-1">
            Current status: {currentStatus}
          </p>
        </div>
      </div>
      <div className="p-6 space-y-5">
        {transitionState.isTerminal ? (
          <p className="text-[14px] text-on-surface-variant">
            This Service is in a terminal status. No further status actions are available.
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
                  {isPending ? "Saving..." : action.label}
                </button>
              ))}
              {forwardActions.length === 0 && !cancellationAction && (
                <p className="text-[14px] text-on-surface-variant">
                  No status action is currently available.
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
                  Cancellation Reason
                </label>
                <textarea
                  id="cancellation-reason"
                  value={cancellationReason}
                  onChange={(event) => setCancellationReason(event.target.value)}
                  disabled={isPending}
                  rows={3}
                  className="w-full max-w-2xl px-3 py-2 bg-surface border border-outline-variant rounded-lg text-[14px] text-on-surface focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50 disabled:cursor-not-allowed"
                  placeholder="Explain why this Service is being cancelled."
                />
                <button
                  onClick={() => handleTransition(cancellationAction)}
                  disabled={isPending || cancellationReasonMissing}
                  className="min-h-[40px] px-5 bg-error text-on-error font-semibold text-[14px] rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isPending ? "Saving..." : cancellationAction.label}
                </button>
              </div>
            )}

            {blockedActions.length > 0 && (
              <div className="rounded-lg border border-outline-variant bg-surface p-4">
                <h4 className="text-[13px] font-semibold text-on-surface mb-2">
                  Blocked Actions
                </h4>
                <ul className="space-y-2">
                  {blockedActions.map((action) => (
                    <li key={action.status} className="text-[13px] text-on-surface-variant">
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
            Status updated successfully!
          </div>
        )}
      </div>
    </div>
  );
}
