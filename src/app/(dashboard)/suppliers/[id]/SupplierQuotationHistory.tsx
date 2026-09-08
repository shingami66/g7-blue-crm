import Link from "next/link";
import PendingLink from "@/components/ui/PendingLink";
import { FileText } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { isolateBidiText, isolateLtrText } from "@/lib/i18n/bidi";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import { formatSarAmount, formatUiDate, formatUiNumber } from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";
import type { SupplierQuotationHistoryRecord } from "@/lib/procurement/types";
import type { SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";

type Dictionary = SuppliersDictionary["quotationHistory"];

type Props = {
  supplierId: string;
  supplierIsDeleted: boolean;
  locale: Locale;
  quotations: SupplierQuotationHistoryRecord[];
  documentsAccessible: boolean;
  loadError?: boolean;
  dictionary: Dictionary;
  currentHistoryUrl?: string;
};

export default function SupplierQuotationHistory({
  supplierId,
  supplierIsDeleted,
  locale,
  quotations,
  documentsAccessible,
  loadError = false,
  dictionary,
  currentHistoryUrl,
}: Props) {
  if (loadError) {
    return (
      <p className="rounded-lg border border-error/30 bg-error-container/30 p-4 text-[13px] text-error" role="alert">
        {dictionary.loadFailed}
      </p>
    );
  }

  if (quotations.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-outline-variant p-5 text-[13px] text-on-surface-variant">
        {dictionary.empty}
      </p>
    );
  }

  return (
    <div>
      {/* Desktop Table View (>= md) */}
      <div className="hidden md:block overflow-x-auto rounded-lg border border-outline-variant">
        <table className="min-w-[820px] w-full text-[13px] text-on-surface">
          <caption className="sr-only">{dictionary.title}</caption>
          <thead className="bg-surface-bright text-start text-[12px] font-semibold text-on-surface-variant">
            <tr>
              <th scope="col" className="px-4 py-3">{dictionary.recorded}</th>
              <th scope="col" className="px-4 py-3">{dictionary.supplierReference}</th>
              <th scope="col" className="px-4 py-3">{dictionary.service}</th>
              <th scope="col" className="px-4 py-3 text-center">{dictionary.coveredRequirements}</th>
              <th scope="col" className="px-4 py-3 text-end">{dictionary.packageTotal}</th>
              <th scope="col" className="px-4 py-3">{dictionary.originalDocuments}</th>
              <th scope="col" className="px-4 py-3 text-end">{dictionary.actions}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/70">
            {quotations.map((quotation) => {
              const compatibilityBackfill = isCompatibilityBackfilled(quotation);
              const historyPath = `/suppliers/${supplierId}/quotations${supplierIsDeleted ? "?showDeleted=true" : ""}`;
              const baseHistory = currentHistoryUrl ?? historyPath;
              const detailQuery = new URLSearchParams({ returnTo: baseHistory });
              if (supplierIsDeleted) detailQuery.set("showDeleted", "true");
              const detailHref = `/suppliers/${supplierId}/quotations/${quotation.id}?${detailQuery.toString()}`;
              const serviceHref = `/services/${encodeURIComponent(quotation.serviceId)}?returnTo=${encodeURIComponent(baseHistory)}`;

              return (
                <tr key={quotation.id} className="align-top hover:bg-surface-container-low">
                  <td className="whitespace-nowrap px-4 py-4">
                    <div className="font-medium tabular-nums" dir="ltr">{formatUiDate(locale, quotation.recordedAt)}</div>
                    {compatibilityBackfill && (
                      <div className="mt-2">
                        <StatusBadge variant="planning">{dictionary.legacyRecordedEvidence}</StatusBadge>
                      </div>
                    )}
                  </td>
                  <td className="max-w-[190px] px-4 py-4">
                    <span className="break-words" dir="auto">
                      {quotation.supplierReference
                        ? isolateBidiText(quotation.supplierReference)
                        : dictionary.unknownSupplierReference}
                    </span>
                  </td>
                  <td className="min-w-[210px] px-4 py-4">
                    {quotation.serviceDeleted ? (
                      <span className="font-semibold text-on-surface-variant" dir="ltr">
                        {isolateLtrText(quotation.serviceNumber)}
                      </span>
                    ) : (
                      <Link href={serviceHref} className="font-semibold text-primary hover:underline" dir="ltr">
                        {isolateLtrText(quotation.serviceNumber)}
                      </Link>
                    )}
                    <p className="mt-1 max-w-[260px] break-words" dir="auto">{isolateBidiText(resolveRecordTitle(locale, quotation.serviceTitle, quotation.eventName))}</p>
                    {quotation.eventName && (
                      <p className="mt-1 text-on-surface-variant" dir="auto">
                        <span className="font-semibold">{dictionary.event}:</span> {isolateBidiText(quotation.eventName)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-4 text-center tabular-nums" dir="ltr">{formatUiNumber(locale, quotation.requirements.length)}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-end tabular-nums" dir="ltr">
                    {quotation.packageTotal === null ? "—" : formatSarAmount(locale, quotation.packageTotal)}
                  </td>
                  <td className="min-w-[150px] px-4 py-4">
                    {documentsAccessible ? (
                      quotation.documents.length > 0
                        ? `${formatUiNumber(locale, quotation.documents.length)} ${quotation.documents.length === 1 ? dictionary.documentSingular : dictionary.documentPlural}`
                        : dictionary.noDocuments
                    ) : dictionary.documentsRestricted}
                  </td>
                  <td className="px-4 py-4 text-end">
                    <PendingLink
                      href={detailHref}
                      pendingLabel={dictionary.navigationPending}
                      className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-2 font-semibold text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                    >
                      <FileText size={15} aria-hidden="true" />
                      {dictionary.view}
                    </PendingLink>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards View (< md) */}
      <div className="block md:hidden divide-y divide-outline-variant/70 rounded-lg border border-outline-variant bg-surface-container-lowest" data-testid="mobile-quotation-history-cards">
        {quotations.map((quotation) => {
          const compatibilityBackfill = isCompatibilityBackfilled(quotation);
          const historyPath = `/suppliers/${supplierId}/quotations${supplierIsDeleted ? "?showDeleted=true" : ""}`;
          const baseHistory = currentHistoryUrl ?? historyPath;
          const detailQuery = new URLSearchParams({ returnTo: baseHistory });
          if (supplierIsDeleted) detailQuery.set("showDeleted", "true");
          const detailHref = `/suppliers/${supplierId}/quotations/${quotation.id}?${detailQuery.toString()}`;
          const serviceHref = `/services/${encodeURIComponent(quotation.serviceId)}?returnTo=${encodeURIComponent(baseHistory)}`;

          return (
            <div key={quotation.id} className="p-4 space-y-3 transition-colors hover:bg-surface-container-low/40">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-medium text-[13px] tabular-nums" dir="ltr">
                    {formatUiDate(locale, quotation.recordedAt)}
                  </div>
                  {compatibilityBackfill && (
                    <div className="mt-1">
                      <StatusBadge variant="planning">{dictionary.legacyRecordedEvidence}</StatusBadge>
                    </div>
                  )}
                </div>
                <div className="text-end font-semibold text-on-surface tabular-nums text-[13px]" dir="ltr">
                  {quotation.packageTotal === null ? "—" : formatSarAmount(locale, quotation.packageTotal)}
                </div>
              </div>

              <div className="space-y-1 text-[13px]">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-on-surface-variant">{dictionary.supplierReference}:</span>
                  <span className="font-medium text-on-surface text-end break-words" dir="auto">
                    {quotation.supplierReference
                      ? isolateBidiText(quotation.supplierReference)
                      : dictionary.unknownSupplierReference}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-on-surface-variant">{dictionary.service}:</span>
                  <div className="text-end">
                    {quotation.serviceDeleted ? (
                      <span className="font-semibold text-on-surface-variant" dir="ltr">
                        {isolateLtrText(quotation.serviceNumber)}
                      </span>
                    ) : (
                      <Link href={serviceHref} className="font-semibold text-primary hover:underline" dir="ltr">
                        {isolateLtrText(quotation.serviceNumber)}
                      </Link>
                    )}
                  </div>
                </div>
                <div className="text-end text-[12px] text-on-surface-variant break-words" dir="auto">
                  {isolateBidiText(resolveRecordTitle(locale, quotation.serviceTitle, quotation.eventName))}
                </div>
                {quotation.eventName && (
                  <div className="text-end text-[12px] text-on-surface-variant" dir="auto">
                    <span className="font-semibold">{dictionary.event}:</span> {isolateBidiText(quotation.eventName)}
                  </div>
                )}

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-on-surface-variant">{dictionary.coveredRequirements}:</span>
                  <span className="font-semibold text-on-surface tabular-nums" dir="ltr">
                    {formatUiNumber(locale, quotation.requirements.length)}
                  </span>
                </div>

                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-on-surface-variant">{dictionary.originalDocuments}:</span>
                  <span className="text-on-surface text-end text-[12px]">
                    {documentsAccessible ? (
                      quotation.documents.length > 0
                        ? `${formatUiNumber(locale, quotation.documents.length)} ${quotation.documents.length === 1 ? dictionary.documentSingular : dictionary.documentPlural}`
                        : dictionary.noDocuments
                    ) : dictionary.documentsRestricted}
                  </span>
                </div>
              </div>

              <div className="pt-1">
                <PendingLink
                  href={detailHref}
                  pendingLabel={dictionary.navigationPending}
                  className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-outline-variant bg-surface py-2 text-[13px] font-semibold text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                >
                  <FileText size={15} aria-hidden="true" />
                  <span>{dictionary.view}</span>
                </PendingLink>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function isCompatibilityBackfilled(quotation: SupplierQuotationHistoryRecord) {
  return quotation.sourceCandidateRequirementId !== null && quotation.sourceCandidateSupplierId !== null;
}
