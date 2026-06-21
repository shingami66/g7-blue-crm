import type { Service } from "@/types/service";
import { Check } from "lucide-react";

const LINEAR_STATUSES = [
  "Inquiry",
  "Quoted",
  "Approved",
  "Deposit Paid",
  "In Progress",
  "Completed",
] as const;

interface ServiceStatusTimelineProps {
  status: Service["status"];
  cancellationReason: string | null;
}

export default function ServiceStatusTimeline({
  status,
  cancellationReason,
}: ServiceStatusTimelineProps) {
  const currentStatusIndex = LINEAR_STATUSES.indexOf(
    status as (typeof LINEAR_STATUSES)[number]
  );
  const serviceCancelled = status === "Cancelled";

  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
        <h3 className="font-semibold text-primary">Service Status Timeline</h3>
        <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
          Display-only workflow view. Status transitions remain controlled by future workflow actions.
        </p>
      </div>

      <div className="p-6 md:py-8 md:px-6">
        <ol className="relative flex flex-col md:flex-row w-full">
          {LINEAR_STATUSES.map((timelineStatus, index) => {
            const isCurrent = status === timelineStatus;
            const isPast = !serviceCancelled && currentStatusIndex > index;
            const isFuture = serviceCancelled || currentStatusIndex < index;
            const isLast = index === LINEAR_STATUSES.length - 1;

            return (
              <li
                key={timelineStatus}
                className="relative flex flex-row md:flex-col items-start md:items-center flex-1 group"
              >
                {/* Desktop Connecting Line */}
                {!isLast && (
                  <div
                    className={`hidden md:block absolute top-4 left-[50%] w-full h-[2px] -translate-y-[1px] z-0 transition-colors ${
                      isPast ? "bg-primary" : "bg-surface-variant"
                    }`}
                  />
                )}
                {/* Mobile Connecting Line */}
                {!isLast && (
                  <div
                    className={`md:hidden absolute top-8 left-4 w-[2px] h-[calc(100%-32px)] -translate-x-[1px] z-0 transition-colors ${
                      isPast ? "bg-primary" : "bg-surface-variant"
                    }`}
                  />
                )}

                {/* Step Indicator */}
                <div
                  className={`relative z-10 flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-full border-2 transition-colors ${
                    isPast
                      ? "border-primary bg-primary text-on-primary"
                      : isCurrent
                      ? "border-primary bg-surface-container-lowest text-primary"
                      : "border-outline-variant bg-surface-container-lowest text-on-surface-variant"
                  }`}
                >
                  {isPast ? (
                    <Check size={16} strokeWidth={3} />
                  ) : isCurrent ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary" />
                  ) : (
                    <span className="text-[12px] font-semibold">{index + 1}</span>
                  )}
                </div>

                {/* Step Text */}
                <div className="ml-4 md:ml-0 md:mt-3 md:text-center pb-6 md:pb-0 pt-1 md:pt-0">
                  <p
                    className={`text-[13px] leading-[18px] font-semibold transition-colors ${
                      isCurrent ? "text-primary" : "text-on-surface"
                    }`}
                  >
                    {timelineStatus}
                  </p>
                  <p className="mt-0.5 text-[12px] leading-[16px] text-on-surface-variant">
                    {getStatusLabel(isCurrent, isPast, isFuture)}
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        {serviceCancelled && (
          <div className="mt-2 md:mt-6 border border-error-container bg-error-container/40 text-on-error-container rounded-lg px-4 py-3">
            <div className="text-[13px] leading-[18px] font-semibold">
              Cancelled is terminal and non-linear.
            </div>
            {cancellationReason && (
              <p className="mt-1 text-[13px] leading-[18px]">
                {cancellationReason}
              </p>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

function getStatusLabel(
  isCurrent: boolean,
  isPast: boolean,
  isFuture: boolean
) {
  if (isCurrent) return "Current status";
  if (isPast) return "Reached";
  if (isFuture) return "Pending workflow";
  return "Pending";
}
