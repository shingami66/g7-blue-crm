"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { ExternalLink } from "lucide-react";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { isolateBidiText, isolateLtrText } from "@/lib/i18n/bidi";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import { formatSarAmount, formatUiDate } from "@/lib/i18n/formatting";
import { createSupplierQuotationDocumentViewUrl } from "@/lib/procurement/actions";
import type { SupplierQuotationHistoryRecord } from "@/lib/procurement/types";
import type { Locale } from "@/lib/i18n/locales";
import type { SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";

type Dictionary = SuppliersDictionary["quotationHistory"];

type Props = {
  quotation: SupplierQuotationHistoryRecord;
  supplierName: string;
  locale: Locale;
  returnTo: string;
  documentsAccessible: boolean;
  dictionary: Dictionary;
};

export default function SupplierQuotationDetail({
  quotation,
  supplierName,
  locale,
  returnTo,
  documentsAccessible,
  dictionary,
}: Props) {
  const serviceHref = `/services/${encodeURIComponent(quotation.serviceId)}?returnTo=${encodeURIComponent(returnTo)}`;
  const compatibilityBackfill = isCompatibilityBackfilled(quotation);
  const hasLegacyEvidence = quotation.requirements.some((line) => line.legacyEvidenceRef !== null);

  return (
    <div className="space-y-5">
      {compatibilityBackfill && (
        <div className="rounded-lg border border-tertiary/30 bg-tertiary-fixed/30 p-4 text-[13px] text-on-surface" role="status">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge variant="planning">{dictionary.legacyRecordedEvidence}</StatusBadge>
            <span>{dictionary.legacyDetailNotice}</span>
          </div>
        </div>
      )}

      <section className="rounded-lg border border-surface-variant bg-surface-container-lowest p-5">
        <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Detail label={dictionary.supplier} value={supplierName} />
          <div className="min-w-0">
            <dt className="font-semibold text-on-surface-variant">{dictionary.service}</dt>
            <dd className="mt-1">
              {quotation.serviceDeleted ? (
                <span className="font-semibold text-on-surface-variant" dir="ltr">
                  {isolateLtrText(quotation.serviceNumber)}
                </span>
              ) : (
                <Link href={serviceHref} className="font-semibold text-primary hover:underline" dir="ltr">
                  {isolateLtrText(quotation.serviceNumber)}
                </Link>
              )}
              <p className="mt-1 break-words text-on-surface" dir="auto">{isolateBidiText(resolveRecordTitle(locale, quotation.serviceTitle, quotation.eventName))}</p>
              {quotation.eventName && <p className="mt-1 text-[13px] text-on-surface-variant" dir="auto">{dictionary.event}: {isolateBidiText(quotation.eventName)}</p>}
            </dd>
          </div>
          <Detail label={dictionary.supplierReference} value={quotation.supplierReference ?? dictionary.unknownSupplierReference} />
          <Detail label={dictionary.quotationDate} value={quotation.quotationDate ? formatUiDate(locale, quotation.quotationDate) : dictionary.unknownQuotationDate} />
          <Detail label={dictionary.recorded} value={formatUiDate(locale, quotation.recordedAt)} />
          <Detail label={dictionary.packageTotal} value={quotation.packageTotal === null ? "—" : formatSarAmount(locale, quotation.packageTotal)} numeric />
          <Detail
            label={dictionary.pricingMode}
            value={
              quotation.pricingMode === "detailed"
                ? dictionary.detailedPricing
                : quotation.pricingMode === "total_only"
                  ? dictionary.totalOnlyPricing
                  : dictionary.legacyPricing
            }
          />
        </dl>
      </section>

      {quotation.pricingMode === "detailed" ? (
        <section className="overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest">
          <div className="border-b border-surface-variant bg-surface-bright px-5 py-4 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-primary">{dictionary.detailedItems}</h2>
            <span className="text-[12px] text-on-surface-variant font-medium">
              {quotation.lines.length} {dictionary.detailedPricing}
            </span>
          </div>
          {quotation.lines.length === 0 ? (
            <p className="p-5 text-[13px] text-on-surface-variant">{dictionary.noRequirementsOnQuotation}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-[13px] text-on-surface">
                <caption className="sr-only">{dictionary.detailedItems}</caption>
                <thead className="bg-surface-bright text-start text-[12px] font-semibold text-on-surface-variant">
                  <tr>
                    <th scope="col" className="px-4 py-3">{dictionary.itemDescription}</th>
                    <th scope="col" className="px-4 py-3">{dictionary.packageRequirement}</th>
                    <th scope="col" className="px-4 py-3 text-end">{dictionary.quantity}</th>
                    <th scope="col" className="px-4 py-3">{dictionary.unit}</th>
                    <th scope="col" className="px-4 py-3 text-end">{dictionary.unitPrice}</th>
                    <th scope="col" className="px-4 py-3 text-end">{dictionary.lineTotal}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/70">
                  {quotation.lines.map((line) => (
                    <tr key={line.id} className="align-top">
                      <td className="min-w-[200px] px-4 py-4 font-semibold" dir="auto">
                        {isolateBidiText(line.description)}
                      </td>
                      <td className="min-w-[150px] px-4 py-4 text-on-surface-variant" dir="auto">
                        {line.packageRequirementTitle ? isolateBidiText(line.packageRequirementTitle) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-end tabular-nums" dir="ltr">
                        {line.quantity !== null ? line.quantity : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4" dir="auto">
                        {line.unit ? isolateBidiText(line.unit) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-end tabular-nums" dir="ltr">
                        {line.unitPrice !== null ? formatSarAmount(locale, line.unitPrice) : "—"}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-end font-semibold tabular-nums" dir="ltr">
                        {formatSarAmount(locale, line.lineTotal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="border-t-2 border-surface-variant bg-surface-bright/80 font-semibold">
                  <tr>
                    <td colSpan={5} className="px-4 py-3 text-end">{dictionary.quotationTotal}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-end tabular-nums" dir="ltr">
                      {quotation.packageTotal !== null
                        ? formatSarAmount(locale, quotation.packageTotal)
                        : formatSarAmount(locale, quotation.lines.reduce((s, l) => s + l.lineTotal, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </section>
      ) : quotation.pricingMode === "total_only" ? (
        <section className="rounded-lg border border-surface-variant bg-surface-container-lowest p-5">
          <h2 className="text-[15px] font-semibold text-primary">{dictionary.totalOnlyPricing}</h2>
          <p className="mt-2 text-[13px] text-on-surface-variant">
            {dictionary.packageTotal}: <strong className="font-semibold text-on-surface font-sans" dir="ltr">{quotation.packageTotal !== null ? formatSarAmount(locale, quotation.packageTotal) : "—"}</strong>
          </p>
        </section>
      ) : (
        <section className="overflow-hidden rounded-lg border border-surface-variant bg-surface-container-lowest">
          <div className="border-b border-surface-variant bg-surface-bright px-5 py-4">
            <h2 className="text-[15px] font-semibold text-primary">{dictionary.requirements}</h2>
          </div>
          {quotation.requirements.length === 0 ? (
            <p className="p-5 text-[13px] text-on-surface-variant">{dictionary.noRequirementsOnQuotation}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[640px] w-full text-[13px] text-on-surface">
                <caption className="sr-only">{dictionary.requirements}</caption>
                <thead className="bg-surface-bright text-start text-[12px] font-semibold text-on-surface-variant">
                  <tr>
                    <th scope="col" className="px-4 py-3">{dictionary.requirement}</th>
                    <th scope="col" className="px-4 py-3">{dictionary.scopeSummary}</th>
                    <th scope="col" className="px-4 py-3 text-end">{dictionary.lineAmount}</th>
                    {hasLegacyEvidence && <th scope="col" className="px-4 py-3">{dictionary.legacyEvidenceReference}</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/70">
                  {quotation.requirements.map((line) => (
                    <tr key={line.requirementId} className="align-top">
                      <td className="min-w-[170px] px-4 py-4 font-semibold" dir="auto">{isolateBidiText(line.requirement)}</td>
                      <td className="min-w-[230px] whitespace-pre-wrap px-4 py-4" dir="auto">{isolateBidiText(line.lineSummary)}</td>
                      <td className="whitespace-nowrap px-4 py-4 text-end tabular-nums" dir="ltr">{line.lineAmount === null ? "—" : formatSarAmount(locale, line.lineAmount)}</td>
                      {hasLegacyEvidence && <td className="max-w-[220px] break-words px-4 py-4" dir="auto">{line.legacyEvidenceRef ? isolateBidiText(line.legacyEvidenceRef) : "—"}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <section className="rounded-lg border border-surface-variant bg-surface-container-lowest p-5">
        <h2 className="text-[15px] font-semibold text-primary">{dictionary.originalDocuments}</h2>
        {!documentsAccessible ? (
          <p className="mt-3 text-[13px] text-on-surface-variant">{dictionary.documentsRestricted}</p>
        ) : quotation.documents.length === 0 ? (
          <p className="mt-3 text-[13px] text-on-surface-variant">{dictionary.noDocuments}</p>
        ) : (
          <div className="mt-3 flex flex-wrap gap-2">
            {quotation.documents.map((document) => (
              <PrivateDocumentLink key={document.documentId} document={document} quotation={quotation} dictionary={dictionary} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function PrivateDocumentLink({
  document,
  quotation,
  dictionary,
}: {
  document: SupplierQuotationHistoryRecord["documents"][number];
  quotation: SupplierQuotationHistoryRecord;
  dictionary: Dictionary;
}) {
  const [isPending, startTransition] = useTransition();
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [error, setError] = useState(false);

  function preparePrivateLink() {
    setError(false);
    startTransition(async () => {
      const result = await createSupplierQuotationDocumentViewUrl({
        documentId: document.documentId,
        quotationId: quotation.id,
      });
      if (!result.success) {
        setError(true);
        return;
      }
      setSignedUrl(result.data.signedUrl);
    });
  }

  if (signedUrl) {
    return (
      <a href={signedUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-2 rounded-lg border border-outline-variant bg-surface px-3 py-2 text-[13px] font-semibold text-primary hover:bg-surface-container-low">
        {isolateBidiText(document.originalFilename)}
        <ExternalLink size={14} aria-hidden="true" />
      </a>
    );
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" size="sm" loading={isPending} loadingLabel={dictionary.loadingOriginal} onClick={preparePrivateLink}>
        {dictionary.viewOriginal}: {isolateBidiText(document.originalFilename)}
      </Button>
      {error && <span className="text-[12px] text-error" role="alert">{dictionary.viewFailed}</span>}
    </div>
  );
}

function isCompatibilityBackfilled(quotation: SupplierQuotationHistoryRecord) {
  return quotation.sourceCandidateRequirementId !== null && quotation.sourceCandidateSupplierId !== null;
}

function Detail({ label, value, numeric = false }: { label: string; value: string; numeric?: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="font-semibold text-on-surface-variant">{label}</dt>
      <dd className={`mt-1 break-words text-on-surface ${numeric ? "tabular-nums" : ""}`} dir={numeric ? "ltr" : "auto"}>
        {isolateBidiText(value)}
      </dd>
    </div>
  );
}
