"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type {
  ServiceLifecycleGateBasis,
  ServiceLifecycleState,
} from "@/lib/services/lifecycle";
import {
  transitionServiceLifecycle,
  type ServiceLifecycleAction,
} from "@/lib/services/actions";
import { getServiceStatusErrorMessage } from "@/lib/i18n/service-action-feedback";
import {
  getServiceStatusLabel,
  type ServicesDictionary,
} from "@/lib/i18n/dictionaries/services";
import Button from "@/components/ui/Button";

type Props = {
  serviceId: string;
  lifecycle: ServiceLifecycleState;
  canAuthorizeCredit: boolean;
  canReopen: boolean;
  dictionary: ServicesDictionary;
};

const DIMENSION_ORDER = [
  "commercial",
  "payment",
  "readiness",
  "execution",
  "completion",
  "close",
] as const;

function stateLabel(dictionary: ServicesDictionary, value: string) {
  return dictionary.serviceLifecycle.states[value] ?? value;
}

export default function ServiceLifecycleActions({
  serviceId,
  lifecycle,
  canAuthorizeCredit,
  canReopen,
  dictionary,
}: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reason, setReason] = useState("");
  const [gateBasis, setGateBasis] = useState<ServiceLifecycleGateBasis>(
    lifecycle.paymentState === "settled" ? "settled_payment" : "authorized_credit",
  );
  const router = useRouter();

  const canStartWithPayment = lifecycle.paymentState === "settled";
  const canStartWithCredit = canAuthorizeCredit;
  const canStart =
    lifecycle.commercialState === "approved" &&
    lifecycle.readinessState === "ready" &&
    lifecycle.executionState === "not_started";
  const hasAction = lifecycle.source === "projection" && (
    (lifecycle.commercialState === "approved" && lifecycle.executionState === "not_started") ||
    lifecycle.executionState === "in_progress" ||
    (lifecycle.executionState === "ended" && lifecycle.closeState === "open") ||
    (canReopen && lifecycle.executionState === "ended")
  );

  const runAction = (action: ServiceLifecycleAction, selectedGateBasis?: ServiceLifecycleGateBasis) => {
    if (isPending) return;
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const result = await transitionServiceLifecycle(serviceId, action, {
        reason,
        gateBasis: selectedGateBasis,
      });
      if (!result.success) {
        setError(getServiceStatusErrorMessage(result.code, dictionary));
        return;
      }

      setReason("");
      setSuccess(true);
      router.refresh();
    });
  };

  return (
    <section
      aria-busy={isPending || undefined}
      className="rounded-xl border border-surface-variant bg-surface-container-lowest overflow-hidden"
    >
      <div className="border-b border-surface-variant bg-surface-bright px-5 py-3">
        <h3 className="font-semibold text-primary">{dictionary.serviceLifecycle.title}</h3>
        <p className="mt-1 text-[13px] text-on-surface-variant">{dictionary.serviceLifecycle.hint}</p>
      </div>
      <div className="space-y-4 p-5">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {DIMENSION_ORDER.map((dimension) => {
            const value = dimension === "commercial"
              ? lifecycle.commercialState
              : dimension === "payment"
                ? lifecycle.paymentState
                : dimension === "readiness"
                  ? lifecycle.readinessState
                  : dimension === "execution"
                    ? lifecycle.executionState
                    : dimension === "completion"
                      ? lifecycle.completionState
                      : lifecycle.closeState;
            return (
              <div key={dimension} className="rounded-lg border border-surface-variant bg-surface p-3">
                <dt className="text-[11px] uppercase tracking-wider text-on-surface-variant">
                  {dictionary.serviceLifecycle.dimensions[dimension]}
                </dt>
                <dd className="mt-1 text-[14px] font-semibold text-on-surface">
                  {stateLabel(dictionary, value)}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="text-[12px] text-on-surface-variant">
          <span className="font-semibold">{dictionary.serviceLifecycle.legacyStatus}: </span>
          {getServiceStatusLabel(dictionary.locale, lifecycle.legacyStatus)}
          {" · "}
          {lifecycle.source === "projection"
            ? dictionary.serviceLifecycle.sourceProjection
            : dictionary.serviceLifecycle.sourceFallback}
          <p className="mt-1">{dictionary.serviceLifecycle.paymentEvidence}</p>
        </div>

        {hasAction && (
          <div className="space-y-3">
            <label className="block text-[12px] font-semibold text-on-surface" htmlFor="service-lifecycle-reason">
              {dictionary.serviceLifecycle.reasonLabel}
              <textarea
                id="service-lifecycle-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder={dictionary.serviceLifecycle.reasonPlaceholder}
                maxLength={1000}
                rows={2}
                className="mt-1 block w-full rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] font-normal text-on-surface outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
              />
            </label>

            {canStart && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                {(canStartWithPayment || canStartWithCredit) && (
                  <label className="block text-[12px] font-semibold text-on-surface">
                    {dictionary.serviceLifecycle.gateLabel}
                    <select
                      value={gateBasis}
                      onChange={(event) => setGateBasis(event.target.value as ServiceLifecycleGateBasis)}
                      className="mt-1 block min-h-11 rounded-lg border border-outline-variant bg-surface px-3 text-[13px] font-normal text-on-surface"
                    >
                      {canStartWithPayment && (
                        <option value="settled_payment">{dictionary.serviceLifecycle.gatePayment}</option>
                      )}
                      {canStartWithCredit && (
                        <option value="authorized_credit">{dictionary.serviceLifecycle.gateCredit}</option>
                      )}
                    </select>
                  </label>
                )}
                {!canStartWithPayment && !canStartWithCredit && (
                  <p className="text-[13px] text-on-surface-variant">{dictionary.serviceLifecycle.noStartGate}</p>
                )}
                {(canStartWithPayment || canStartWithCredit) && (
                  <Button
                    type="button"
                    onClick={() => runAction("start", gateBasis)}
                    disabled={isPending || reason.trim().length === 0}
                    loading={isPending}
                    loadingLabel={dictionary.serviceStatusControl.saving}
                    variant="primary"
                    className="min-h-11 rounded-lg bg-primary px-5 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {gateBasis === "authorized_credit"
                      ? dictionary.serviceLifecycle.actions.startWithCredit
                      : dictionary.serviceLifecycle.actions.startExecution}
                  </Button>
                )}
              </div>
            )}

            {lifecycle.commercialState === "approved" &&
              lifecycle.executionState === "not_started" &&
              lifecycle.readinessState !== "ready" && (
                <Button
                  type="button"
                  onClick={() => runAction("mark_ready")}
                  disabled={isPending || reason.trim().length === 0}
                  loading={isPending}
                  loadingLabel={dictionary.serviceStatusControl.saving}
                  variant="primary"
                  className="min-h-11 rounded-lg bg-primary px-5 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {dictionary.serviceLifecycle.actions.markReady}
                </Button>
              )}

            {lifecycle.commercialState === "approved" &&
              lifecycle.executionState === "not_started" &&
              lifecycle.readinessState === "ready" && (
                <Button
                  type="button"
                  onClick={() => runAction("block_readiness")}
                  disabled={isPending || reason.trim().length === 0}
                  variant="secondary"
                  className="min-h-11 rounded-lg px-5 text-[14px] font-semibold"
                >
                  {dictionary.serviceLifecycle.actions.blockReadiness}
                </Button>
              )}

            {lifecycle.executionState === "in_progress" && (
              <Button
                type="button"
                onClick={() => runAction("complete")}
                disabled={isPending || reason.trim().length === 0}
                loading={isPending}
                loadingLabel={dictionary.serviceStatusControl.saving}
                variant="primary"
                className="min-h-11 rounded-lg bg-primary px-5 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dictionary.serviceLifecycle.actions.complete}
              </Button>
            )}

            {lifecycle.executionState === "ended" && lifecycle.closeState === "open" && (
              <Button
                type="button"
                onClick={() => runAction("close")}
                disabled={isPending || reason.trim().length === 0}
                loading={isPending}
                loadingLabel={dictionary.serviceStatusControl.saving}
                variant="primary"
                className="min-h-11 rounded-lg bg-primary px-5 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
              >
                {dictionary.serviceLifecycle.actions.close}
              </Button>
            )}

            {canReopen && lifecycle.executionState === "ended" && (
              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  onClick={() => runAction("reopen_delivery")}
                  disabled={isPending || reason.trim().length === 0}
                  variant="secondary"
                  className="min-h-11 rounded-lg px-5 text-[14px] font-semibold"
                >
                  {dictionary.serviceLifecycle.actions.reopenDelivery}
                </Button>
                {lifecycle.closeState === "closed" && (
                  <Button
                    type="button"
                    onClick={() => runAction("reopen_closeout")}
                    disabled={isPending || reason.trim().length === 0}
                    variant="secondary"
                    className="min-h-11 rounded-lg px-5 text-[14px] font-semibold"
                  >
                    {dictionary.serviceLifecycle.actions.reopenCloseout}
                  </Button>
                )}
              </div>
            )}
          </div>
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
