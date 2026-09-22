import Link from "next/link";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { EventCostingReadResult } from "@/lib/event-costing/types";

type Props = {
  serviceId: string;
  workspaceHref?: string;
  result: EventCostingReadResult;
  dictionary: ServicesDictionary;
};

export default function EventCostingSummaryCard({ serviceId, workspaceHref, result, dictionary }: Props) {
  const copy = dictionary.eventCosting;
  const targetHref = workspaceHref ?? `/services/${serviceId}/costing`;
  const data = result.status === "success" ? result.data : null;

  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-3 border-b border-surface-variant bg-surface-bright px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-primary">{copy.title}</h3>
          <p className="mt-1 text-[13px] text-on-surface-variant">{copy.subtitle}</p>
        </div>
        <Link
          href={targetHref}
          className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        >
          {copy.openWorkspace}
        </Link>
      </div>
      {!data ? (
        <p className="p-5 text-[14px] text-error" role="alert">{copy.unavailable}</p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-5 gap-y-5 p-5 sm:grid-cols-4">
          <Metric label={copy.labels.approvedBudgetCost} value={money(dictionary, data.approvedBudgetCost, copy.unavailable)} />
          <Metric label={copy.labels.actualCost} value={money(dictionary, data.actualCost, copy.unavailable)} />
          <Metric label={copy.labels.eac} value={money(dictionary, data.eac, copy.unavailable)} />
          <Metric label={copy.labels.forecastMargin} value={money(dictionary, data.forecastMargin, copy.unavailable)} accent />
          <div className="col-span-2 sm:col-span-4">
            <dt className="text-[12px] font-semibold text-on-surface-variant">{copy.completeness}</dt>
            <dd className="mt-1 text-[13px] font-semibold text-on-surface">
              {copy.statusLabels[data.completeness.status]}
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}

function money(dictionary: ServicesDictionary, value: number | null, unavailable: string) {
  return value == null
    ? unavailable
    : formatSarAmount(dictionary.locale, value, { isolate: true });
}

function Metric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-semibold text-on-surface-variant">{label}</dt>
      <dd dir="ltr" className={`mt-1 break-words font-mono text-[14px] font-semibold tabular-nums ${accent ? "text-primary" : "text-on-surface"}`}>
        {value}
      </dd>
    </div>
  );
}
