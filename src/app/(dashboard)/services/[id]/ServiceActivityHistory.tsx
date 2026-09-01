import { ChevronDown } from "lucide-react";
import { UiDateTimeText } from "@/components/i18n/UiDateText";
import { getServiceStatusLabel, type ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { Locale } from "@/lib/i18n/locales";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { ServiceActivityEvent } from "@/lib/services/activity-queries";

type Props = {
  events: ServiceActivityEvent[];
  available: boolean;
  locale: Locale;
  dictionary: ServicesDictionary;
};

export default function ServiceActivityHistory({ events, available, locale, dictionary }: Props) {
  return (
    <details className="rounded-xl border border-surface-variant bg-surface-container-lowest overflow-hidden">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 marker:hidden [&::-webkit-details-marker]:hidden">
        <div>
          <h3 className="font-semibold text-primary">{dictionary.serviceActivity.title}</h3>
          <p className="mt-1 text-[12px] text-on-surface-variant">{dictionary.serviceActivity.hint}</p>
        </div>
        <ChevronDown size={17} className="shrink-0 text-on-surface-variant" aria-hidden="true" />
      </summary>
      <div className="border-t border-surface-variant px-5 py-4">
        {!available ? (
          <p className="text-[13px] text-on-surface-variant">{dictionary.serviceActivity.unavailable}</p>
        ) : events.length === 0 ? (
          <p className="text-[13px] text-on-surface-variant">{dictionary.serviceActivity.empty}</p>
        ) : (
          <ol className="space-y-4">
            {events.map((event) => (
              <li key={event.id} className="border-b border-surface-variant pb-4 last:border-b-0 last:pb-0">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[13px] font-semibold text-on-surface">
                    {event.trigger === "deposit_payment_confirmed"
                      ? dictionary.serviceActivity.depositPaymentConfirmed
                      : event.eventType === "service_lifecycle_changed"
                        ? dictionary.serviceLifecycle.title
                        : event.eventType === "service_status_changed"
                          ? dictionary.serviceActivity.statusChanged
                          : dictionary.serviceActivity.updated}
                  </p>
                  <UiDateTimeText locale={locale} value={event.timestamp} />
                </div>
                {(event.fromStatus || event.toStatus) && (
                  <p className="mt-1 text-[12px] text-on-surface-variant">
                    {dictionary.serviceActivity.from}: {event.fromStatus ? getServiceStatusLabel(locale, event.fromStatus as never) : "—"}
                    {" · "}
                    {dictionary.serviceActivity.to}: {event.toStatus ? getServiceStatusLabel(locale, event.toStatus as never) : "—"}
                  </p>
                )}
                {event.lifecycleDimension && (event.fromState || event.toState) && (
                  <p className="mt-1 text-[12px] text-on-surface-variant">
                    {dictionary.serviceActivity.lifecycle}: {dictionary.serviceLifecycle.dimensions[event.lifecycleDimension] ?? event.lifecycleDimension}
                    {" · "}
                    {event.fromState ? dictionary.serviceLifecycle.states[event.fromState] ?? isolateBidiText(event.fromState) : "—"}
                    {" → "}
                    {event.toState ? dictionary.serviceLifecycle.states[event.toState] ?? isolateBidiText(event.toState) : "—"}
                    {event.gateBasis && (
                      <>
                        {" · "}
                        {dictionary.serviceActivity.gateBasis}: {dictionary.serviceLifecycle.states[event.gateBasis] ?? event.gateBasis}
                      </>
                    )}
                  </p>
                )}
                {event.reason && (
                  <p dir="auto" className="mt-1 text-[12px] text-on-surface-variant">
                    {dictionary.serviceActivity.reason}: {isolateBidiText(event.reason)}
                  </p>
                )}
                {event.trigger === "deposit_payment_confirmed" && (
                  <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-on-surface-variant">
                    {event.invoiceId && (
                      <span>
                        {dictionary.serviceActivity.invoice}:{" "}
                        <bdi dir="ltr">{isolateBidiText(event.invoiceId)}</bdi>
                      </span>
                    )}
                    {(event.paymentNumber || event.paymentId) && (
                      <span>
                        {dictionary.serviceActivity.payment}:{" "}
                        <bdi dir="ltr">
                          {isolateBidiText(event.paymentNumber ?? event.paymentId ?? "")}
                        </bdi>
                      </span>
                    )}
                    {event.amount !== null && (
                      <span>
                        {dictionary.serviceActivity.amount}:{" "}
                        <bdi dir="ltr">{formatSarAmount(locale, event.amount)}</bdi>
                      </span>
                    )}
                  </div>
                )}
                <p className="mt-1 text-[12px] text-on-surface-variant">
                  {dictionary.serviceActivity.actor}: {event.actorDisplay
                    ? isolateBidiText(event.actorDisplay)
                    : event.actorKind === "system"
                      ? dictionary.serviceActivity.systemActor
                      : event.actorKind === "user"
                        ? dictionary.serviceActivity.userActor
                        : dictionary.serviceActivity.unknownActor}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>
    </details>
  );
}
