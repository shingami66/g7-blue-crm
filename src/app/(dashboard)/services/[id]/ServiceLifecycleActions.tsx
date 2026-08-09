"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ServiceStatus } from "@/types/service";
import {
  completeService,
  startServiceExecution,
} from "@/lib/services/actions";
import { getServiceStatusErrorMessage } from "@/lib/i18n/service-action-feedback";
import {
  getServiceStatusLabel,
  type ServicesDictionary,
} from "@/lib/i18n/dictionaries/services";
import Button from "@/components/ui/Button";

type Props = {
  serviceId: string;
  status: ServiceStatus;
  dictionary: ServicesDictionary;
};

export default function ServiceLifecycleActions({ serviceId, status, dictionary }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();

  const isStart = status === "Deposit Paid";
  const isComplete = status === "In Progress";

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

      setSuccess(true);
      router.refresh();
    });
  };

  if (!isStart && !isComplete) return null;

  return (
    <section
      aria-busy={isPending || undefined}
      className="rounded-xl border border-surface-variant bg-surface-container-lowest overflow-hidden"
    >
      <div className="border-b border-surface-variant bg-surface-bright px-5 py-3">
        <h3 className="font-semibold text-primary">{dictionary.serviceStatusControl.title}</h3>
        <p className="mt-1 text-[13px] text-on-surface-variant">
          {getServiceStatusLabel(dictionary.locale, status)}
        </p>
      </div>
      <div className="space-y-4 p-5">
        <Button
          type="button"
          onClick={() => runAction(isStart
            ? () => startServiceExecution(serviceId)
            : () => completeService(serviceId))}
          disabled={isPending}
          loading={isPending}
          loadingLabel={dictionary.serviceStatusControl.saving}
          variant="primary"
          className="min-h-11 rounded-lg bg-primary px-5 text-[14px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isStart
            ? dictionary.serviceStatusControl.startExecution
            : dictionary.serviceStatusControl.completeService}
        </Button>

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
