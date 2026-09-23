import { formatSarAmount } from "@/lib/i18n/formatting";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { closeEventCost, reopenEventCost } from "@/lib/event-cost-close/actions";
import type { EventCostCloseStatus } from "@/lib/event-cost-close/types";

export default function EventCostClosePanel({
  serviceId,
  dictionary,
  status,
  canClose,
  canReopen,
}: {
  serviceId: string;
  dictionary: ServicesDictionary;
  status: EventCostCloseStatus;
  canClose: boolean;
  canReopen: boolean;
}) {
  const copy = dictionary.eventCosting.costClose;
  const readiness = status.readiness;
  const closeAction = closeEventCost.bind(null, serviceId);
  const reopenAction = reopenEventCost.bind(null, serviceId);
  const active = status.activeClose;

  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-semibold text-primary">{copy.title}</h2>
          <p className="mt-1 text-sm text-on-surface-variant">{copy.subtitle}</p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${readiness.ready ? "bg-success-container text-on-success-container" : "bg-error-container text-on-error-container"}`}>
          {readiness.ready ? copy.readinessReady : copy.readinessBlocked}
        </span>
      </div>

      {active ? (
        <div className="mt-4 rounded-lg border border-primary/30 bg-primary-container/20 p-4">
          <h3 className="font-semibold text-primary">{copy.activeClose} · {active.closeVersion}</h3>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
            <CloseMetric label={copy.closedAt} value={active.closedAt} />
            <CloseMetric label={dictionary.eventCosting.labels.actualCost} value={money(dictionary, active.actualCost)} />
            <CloseMetric label={dictionary.eventCosting.labels.outstandingCost} value={money(dictionary, active.outstandingCost)} />
            <CloseMetric label={copy.finalManagerialEventMargin} value={money(dictionary, active.finalManagerialEventMargin)} accent />
          </dl>
          <p className="mt-3 text-xs text-on-surface-variant">{copy.blockedMutationNotice}</p>
          {canReopen && (
            <form action={reopenAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
              <input type="hidden" name="requestId" value={crypto.randomUUID()} />
              <label className="grid gap-1 text-sm font-medium text-on-surface">
                <span>{copy.reason}</span>
                <input name="reason" required minLength={5} maxLength={2000} className="min-h-10 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
              </label>
              <button type="submit" className="mt-auto min-h-10 rounded-lg border border-primary px-4 py-2 text-sm font-semibold text-primary hover:bg-primary-container">{copy.reopenAction}</button>
            </form>
          )}
        </div>
      ) : (
        <p className="mt-4 text-sm text-on-surface-variant">{copy.noActiveClose}</p>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <ReadinessList title={copy.blockers} empty={copy.noBlockers} rows={readiness.blockers} labels={copy.blockerLabels} />
        <ReadinessList title={copy.warnings} empty="—" rows={readiness.warnings} labels={copy.warningLabels} />
      </div>

      {!active && canClose && (
        <form action={closeAction} className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <input type="hidden" name="requestId" value={crypto.randomUUID()} />
          <label className="grid gap-1 text-sm font-medium text-on-surface">
            <span>{copy.reason}</span>
            <input name="reason" required minLength={5} maxLength={2000} className="min-h-10 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-sm text-on-surface" />
          </label>
          <button type="submit" disabled={!readiness.ready} className="mt-auto min-h-10 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-on-primary enabled:hover:bg-primary-container disabled:cursor-not-allowed disabled:opacity-50">{copy.closeAction}</button>
        </form>
      )}

      <div className="mt-5 border-t border-surface-variant pt-4">
        <h3 className="font-semibold text-primary">{copy.closeHistory}</h3>
        {status.history.length === 0 ? <p className="mt-2 text-sm text-on-surface-variant">—</p> : (
          <ul className="mt-3 grid gap-2">
            {status.history.map((entry) => (
              <li key={`${entry.closeVersion}-${entry.closedAt}`} className="rounded-lg border border-outline-variant/60 p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-on-surface">{entry.reopenedAt ? copy.priorClose : copy.activeClose} · {entry.closeVersion}</span>
                  <span dir="ltr" className="font-mono tabular-nums text-primary">{money(dictionary, entry.finalManagerialEventMargin)}</span>
                </div>
                <p className="mt-1 text-xs text-on-surface-variant">{entry.reason}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function ReadinessList({ title, empty, rows, labels }: {
  title: string;
  empty: string;
  rows: EventCostCloseStatus["readiness"]["blockers"];
  labels: Record<string, string>;
}) {
  return <div className="rounded-lg bg-surface-container-low p-3">
    <h3 className="text-sm font-semibold text-on-surface">{title}</h3>
    {rows.length === 0 ? <p className="mt-2 text-sm text-on-surface-variant">{empty}</p> : <ul className="mt-2 grid gap-1 text-sm text-on-surface-variant">
      {rows.map((row, index) => <li key={`${row.code}-${index}`}>{labels[row.code] ?? title}</li>)}
    </ul>}
  </div>;
}

function CloseMetric({ label, value, accent = false }: { label: string; value: string; accent?: boolean }) {
  return <div><dt className="text-xs font-semibold text-on-surface-variant">{label}</dt><dd dir="ltr" className={`mt-1 font-mono text-sm font-semibold tabular-nums ${accent ? "text-primary" : "text-on-surface"}`}>{value}</dd></div>;
}

function money(dictionary: ServicesDictionary, value: number) {
  return formatSarAmount(dictionary.locale, value, { isolate: true });
}
