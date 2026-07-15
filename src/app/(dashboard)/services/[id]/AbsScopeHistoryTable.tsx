import type { ComponentProps } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { UiDateText } from "@/components/i18n/UiDateText";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";
import type {
  AbsEffectiveDisplayStatus,
  AbsScopeHistoryListData,
  AbsScopeHistoryRow,
} from "@/lib/approved-billing-scopes/types";
import {
  buildAbsScopeDetailHref,
  formatBoundedHistoryNotice,
  formatDetailsAriaLabel,
  preserveHistoryRowOrder,
  resolveHistoryLifecycleDate,
} from "@/lib/approved-billing-scopes/service-history-view-model";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const EFFECTIVE_STATUS_VARIANTS: Record<
  AbsEffectiveDisplayStatus,
  StatusBadgeVariant
> = {
  draft: "draft",
  active: "approved",
  superseded: "inactive",
  voided: "cancelled",
};

type AbsScopeHistoryTableProps = {
  serviceId: string;
  locale: Locale;
  dictionary: ServicesDictionary["approvedBillingScopes"];
  history: AbsScopeHistoryListData | null;
  historyUnavailable?: boolean;
};

export default function AbsScopeHistoryTable({
  serviceId,
  locale,
  dictionary,
  history,
  historyUnavailable = false,
}: AbsScopeHistoryTableProps) {
  const historyDictionary = dictionary.history;

  if (historyUnavailable) {
    return (
      <div className="border-t border-surface-variant px-6 py-4">
        <h4 className="mb-2 text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {historyDictionary.title}
        </h4>
        <p className="text-[14px] leading-[20px] text-on-surface-variant">
          {dictionary.unavailable}
        </p>
      </div>
    );
  }

  if (!history) {
    return null;
  }

  const rows = preserveHistoryRowOrder(history.rows);

  return (
    <div className="border-t border-surface-variant">
      <div className="flex flex-col gap-2 border-b border-surface-variant bg-surface px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
        <h4 className="text-[13px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {historyDictionary.title}
        </h4>
        {history.limitReached ? (
          <p className="text-[12px] leading-[16px] text-on-surface-variant">
            {formatBoundedHistoryNotice(
              historyDictionary.showingLatestBounded,
              history.limit
            )}
          </p>
        ) : null}
      </div>

      {rows.length === 0 ? (
        <p className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {historyDictionary.empty}
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-start">
            <thead className="bg-surface-bright text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">
              <tr>
                <th className="px-4 py-3 text-start">
                  {historyDictionary.columns.version}
                </th>
                <th className="px-4 py-3 text-start">
                  {historyDictionary.columns.status}
                </th>
                <th className="px-4 py-3 text-start">
                  {historyDictionary.columns.acceptedTotal}
                </th>
                <th className="px-4 py-3 text-start">
                  {historyDictionary.columns.sourceQuotation}
                </th>
                <th className="px-4 py-3 text-start">
                  {historyDictionary.columns.lifecycleDate}
                </th>
                <th className="px-4 py-3 text-start">
                  {historyDictionary.columns.details}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant">
              {rows.map((row) => (
                <HistoryRow
                  key={row.id}
                  serviceId={serviceId}
                  locale={locale}
                  dictionary={dictionary}
                  row={row}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function HistoryRow({
  serviceId,
  locale,
  dictionary,
  row,
}: {
  serviceId: string;
  locale: Locale;
  dictionary: ServicesDictionary["approvedBillingScopes"];
  row: AbsScopeHistoryRow;
}) {
  const historyDictionary = dictionary.history;
  const statusLabel =
    row.effectiveStatus === "active"
      ? dictionary.active
      : dictionary.effectiveStatusLabels[row.effectiveStatus];
  const lifecycle = resolveHistoryLifecycleDate(row);
  const href = buildAbsScopeDetailHref(serviceId, row.id);
  const ariaLabel = formatDetailsAriaLabel(
    historyDictionary.detailsAria,
    row.scopeVersion
  );

  return (
    <tr className="bg-surface-container-lowest">
      <td className="px-4 py-3 text-[14px] font-medium text-on-surface">
        <span dir="ltr" className="tabular-nums">
          {isolateBidiText(`${dictionary.versionPrefix} ${row.scopeVersion}`)}
        </span>
        {row.isActiveApprovedScope ? (
          <span className="ms-2 text-[12px] font-semibold text-primary">
            {historyDictionary.activeIndicator}
          </span>
        ) : null}
      </td>
      <td className="px-4 py-3">
        <StatusBadge variant={EFFECTIVE_STATUS_VARIANTS[row.effectiveStatus]}>
          {statusLabel}
        </StatusBadge>
      </td>
      <td className="px-4 py-3 text-[14px] text-on-surface">
        <span dir="ltr" className="tabular-nums">
          {formatSarAmount(locale, row.acceptedGrandTotal)}
        </span>
      </td>
      <td className="px-4 py-3 text-[14px] text-on-surface">
        {row.sourceQuotationNumber ? (
          <span dir="ltr" className="font-mono tabular-nums">
            {isolateBidiText(row.sourceQuotationNumber)}
          </span>
        ) : (
          <span className="text-on-surface-variant">
            {dictionary.sourceQuotationUnavailable}
          </span>
        )}
      </td>
      <td className="px-4 py-3 text-[14px] text-on-surface">
        {lifecycle.at ? (
          <UiDateText locale={locale} value={lifecycle.at} />
        ) : (
          <span className="text-on-surface-variant">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <PendingLink
          href={href}
          className="text-[13px] font-semibold text-primary hover:underline"
          pendingLabel={historyDictionary.columns.details}
          aria-label={ariaLabel}
        >
          {historyDictionary.columns.details}
        </PendingLink>
      </td>
    </tr>
  );
}
