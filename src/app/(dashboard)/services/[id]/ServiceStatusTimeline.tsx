import type { Service } from "@/types/service";
import { getServiceStatusLabel, type ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { Check, ChevronDown } from "lucide-react";

const LINEAR_STATUSES = [
  "Inquiry",
  "Quoted",
  "Approved",
  "Deposit Paid",
  "In Progress",
  "Completed",
] as const;

type HistoryState = "reached" | "current" | "pending" | "notConfirmed";

interface ServiceStatusTimelineProps {
  status: Service["status"];
  cancellationReason: string | null;
  dictionary: ServicesDictionary;
}

export default function ServiceStatusTimeline({
  status,
  cancellationReason,
  dictionary,
}: ServiceStatusTimelineProps) {
  const workflowDisplay = getServiceWorkflowDisplay(status, dictionary);
  const historyItems = getHistoryItems(status);

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
        <h3 className="font-semibold text-primary">{dictionary.serviceStatusTimeline.title}</h3>
      </div>

      <div className="p-6">
        <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <WorkflowDetail
            label={dictionary.serviceStatusTimeline.currentPhaseLabel}
            value={workflowDisplay.currentPhase}
          />
          <WorkflowDetail
            label={dictionary.serviceStatusTimeline.nextActionLabel}
            value={workflowDisplay.nextAction}
          />
        </dl>

        <details className="mt-5 rounded-xl border border-surface-variant bg-surface">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-left marker:hidden [&::-webkit-details-marker]:hidden">
            <div>
              <p className="text-[14px] font-semibold text-on-surface">
                {dictionary.serviceStatusTimeline.historyLabel}
              </p>
              <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
                {dictionary.serviceStatusTimeline.historyHint}
              </p>
            </div>
            <ChevronDown
              aria-hidden="true"
              className="shrink-0 text-on-surface-variant"
              size={16}
            />
          </summary>

          <div className="border-t border-surface-variant px-4 py-4">
            {status === "Cancelled" && (
              <div className="mb-4 rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-on-error-container">
                <p className="text-[13px] font-semibold leading-[18px]">
                  {dictionary.serviceStatusTimeline.stopped}
                </p>
                {cancellationReason && (
                  <p dir="auto" className="mt-2 text-[13px] leading-[18px]">
                    {cancellationReason}
                  </p>
                )}
              </div>
            )}

            <ol className="space-y-3">
              {historyItems.map((item, index) => (
                <li key={item.status} className="flex items-start gap-3">
                  <HistoryMarker index={index} state={item.state} />
                  <div className="min-w-0">
                    <p className="text-[14px] font-semibold text-on-surface">
                      {getServiceStatusLabel(dictionary.locale, item.status)}
                    </p>
                    <p className="mt-1 text-[12px] leading-[16px] text-on-surface-variant">
                      {getHistoryLabel(dictionary, item.state)}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </details>
      </div>
    </section>
  );
}

function WorkflowDetail({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-surface-variant bg-surface px-4 py-4">
      <dt className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </dt>
      <dd dir="auto" className="mt-2 text-[14px] leading-[22px] font-medium text-on-surface">
        {value}
      </dd>
    </div>
  );
}

function HistoryMarker({
  index,
  state,
}: {
  index: number;
  state: HistoryState;
}) {
  if (state === "reached") {
    return (
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary bg-primary text-on-primary">
        <Check size={16} strokeWidth={3} />
      </span>
    );
  }

  if (state === "current") {
    return (
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-primary bg-primary/10 text-primary">
        <span className="h-2.5 w-2.5 rounded-full bg-primary" />
      </span>
    );
  }

  if (state === "notConfirmed") {
    return (
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-low text-on-surface-variant text-[12px] font-semibold">
        ?
      </span>
    );
  }

  return (
    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-outline-variant bg-surface-container-lowest text-on-surface-variant text-[12px] font-semibold">
      {index + 1}
    </span>
  );
}

function getServiceWorkflowDisplay(
  status: Service["status"],
  dictionary: ServicesDictionary,
) {
  return {
    currentPhase:
      dictionary.serviceStatusTimeline.phaseDescriptions[status] ??
      dictionary.serviceStatusTimeline.fallbackPhase,
    nextAction:
      dictionary.serviceStatusTimeline.nextActionDescriptions[status] ??
      dictionary.serviceStatusTimeline.fallbackNextAction,
  };
}

function getHistoryItems(status: Service["status"]) {
  if (status === "Cancelled") {
    return LINEAR_STATUSES.map((timelineStatus) => ({
      status: timelineStatus,
      state: "notConfirmed" as const,
    }));
  }

  const currentStatusIndex = LINEAR_STATUSES.indexOf(
    status as (typeof LINEAR_STATUSES)[number],
  );

  if (currentStatusIndex === -1) {
    return LINEAR_STATUSES.map((timelineStatus) => ({
      status: timelineStatus,
      state: "pending" as const,
    }));
  }

  return LINEAR_STATUSES.map((timelineStatus, index) => ({
    status: timelineStatus,
    state:
      index < currentStatusIndex
        ? ("reached" as const)
        : index === currentStatusIndex
          ? ("current" as const)
          : ("pending" as const),
  }));
}

function getHistoryLabel(dictionary: ServicesDictionary, state: HistoryState) {
  if (state === "reached") return dictionary.serviceStatusTimeline.reached;
  if (state === "current") return dictionary.serviceStatusTimeline.current;
  if (state === "notConfirmed") return dictionary.serviceStatusTimeline.notConfirmed;
  return dictionary.serviceStatusTimeline.pending;
}
