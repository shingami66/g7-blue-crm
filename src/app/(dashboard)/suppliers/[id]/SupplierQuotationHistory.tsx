import Link from "next/link";
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
    <div className="overflow-x-auto rounded-lg border border-outline-variant">
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
                  <Link
                    href={detailHref}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-2 font-semibold text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
                  >
                    <FileText size={15} aria-hidden="true" />
                    {dictionary.view}
                  </Link>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function isCompatibilityBackfilled(quotation: SupplierQuotationHistoryRecord) {
  return quotation.sourceCandidateRequirementId !== null && quotation.sourceCandidateSupplierId !== null;
}
