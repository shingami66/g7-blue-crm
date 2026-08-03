import { UiDateText } from "@/components/i18n/UiDateText";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { AbsLifecycleAuditListData } from "@/lib/approved-billing-scopes/types";
import { formatBoundedHistoryNotice } from "@/lib/approved-billing-scopes/service-history-view-model";

type Props = {
  locale: ServicesDictionary["locale"];
  dictionary: ServicesDictionary["approvedBillingScopes"];
  audit: AbsLifecycleAuditListData | null;
  unavailable: boolean;
};

export default function AbsLifecycleAuditTable({
  locale,
  dictionary,
  audit,
  unavailable,
}: Props) {
  const auditDictionary = dictionary.detail.lifecycleAudit;

  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-2 border-b border-surface-variant bg-surface-bright px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-semibold text-primary">{auditDictionary.title}</h2>
        {audit && (audit.scopeDiscoveryLimitReached || audit.candidateAuditLimitReached) ? (
          <p className="text-[12px] text-on-surface-variant">
            {formatBoundedHistoryNotice(auditDictionary.showingLatestBounded, audit.limit)}
          </p>
        ) : null}
      </div>

      {unavailable ? (
        <p className="px-6 py-4 text-[14px] text-on-surface-variant">
          {auditDictionary.unavailable}
        </p>
      ) : !audit || audit.events.length === 0 ? (
        <p className="px-6 py-4 text-[14px] text-on-surface-variant">
          {auditDictionary.empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-start">
            <thead className="bg-surface text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 text-start">{auditDictionary.columns.event}</th>
                <th className="px-4 py-3 text-start">{auditDictionary.columns.version}</th>
                <th className="px-4 py-3 text-start">{auditDictionary.columns.timestamp}</th>
                <th className="px-4 py-3 text-start">{auditDictionary.columns.actor}</th>
                <th className="px-4 py-3 text-start">{auditDictionary.columns.reason}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {audit.events.map((event) => (
                <tr key={event.id}>
                  <td className="px-4 py-3 text-[14px] text-on-surface">
                    {auditDictionary.eventTypeLabels[event.eventType]}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-on-surface" dir="ltr">
                    {event.scopeVersion ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-[14px] text-on-surface">
                    <UiDateText locale={locale} value={event.timestamp} />
                  </td>
                  <td className="px-4 py-3 text-[14px] text-on-surface">
                    {event.actor.kind === "identified" ? (
                      <span dir="ltr" className="font-mono tabular-nums">
                        {isolateBidiText(event.actor.actorId)}
                      </span>
                    ) : (
                      auditDictionary.actorRecorded
                    )}
                  </td>
                  <td className="max-w-sm px-4 py-3 text-[14px] text-on-surface">
                    <div>{reasonLabel(event.reasonCode, dictionary)}</div>
                    {event.reasonNote ? (
                      <div className="mt-1 text-[12px] text-on-surface-variant" dir="auto">
                        {event.reasonNote}
                      </div>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function reasonLabel(
  reasonCode: string | null,
  dictionary: ServicesDictionary["approvedBillingScopes"],
) {
  if (!reasonCode) {
    return dictionary.detail.lifecycleAudit.noReason;
  }

  const labels: Record<string, string> = {
    ...dictionary.detail.editItem.reasonCodeLabels,
    ...dictionary.detail.voidScope.reasonCodeLabels,
  };

  return labels[reasonCode] ?? dictionary.detail.lifecycleAudit.noReason;
}
