import type { ComponentProps } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText } from "@/components/i18n/UiDateText";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getQuotationStatusLabel } from "@/lib/i18n/dictionaries/quotations";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { QuotationListItem, QuotationStatus } from "@/lib/quotations/types";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const QUOTATION_STATUS_VARIANTS: Record<QuotationStatus, StatusBadgeVariant> = {
  draft: "draft",
  sent: "sent",
  approved: "approved",
  rejected: "rejected",
  expired: "expired",
};

interface RelatedQuotationsCardProps {
  quotations: QuotationListItem[] | null;
  serviceId: string;
  canCreateQuotation: boolean;
  dictionary: ServicesDictionary;
  disabledReason?: string;
  loadError?: boolean;
}

export default function RelatedQuotationsCard({
  quotations,
  serviceId,
  canCreateQuotation,
  dictionary,
  disabledReason,
  loadError = false,
}: RelatedQuotationsCardProps) {
  return (
    <section
      id="related-quotations"
      className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden"
    >
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-primary">{dictionary.relatedQuotations.title}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
            {dictionary.relatedQuotations.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 sm:gap-4 shrink-0">
          {quotations && !loadError && (
            <div className="text-[13px] leading-[18px] text-on-surface-variant">
              {quotations.length}{" "}
              {quotations.length === 1
                ? dictionary.relatedQuotations.countSingular
                : dictionary.relatedQuotations.countPlural}
            </div>
          )}
          {canCreateQuotation && (
            disabledReason ? (
              <span
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-outline-variant text-on-surface-variant rounded-lg text-[13px] font-semibold cursor-not-allowed opacity-60"
                title={disabledReason}
              >
                <FileText size={16} />
                {dictionary.relatedQuotations.createQuotation}
              </span>
            ) : (
              <Link
                href={`/quotations/new?serviceId=${serviceId}`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[13px] font-semibold transition-colors"
              >
                <FileText size={16} />
                {dictionary.relatedQuotations.createQuotation}
              </Link>
            )
          )}
        </div>
      </div>

      <div className="p-6">
        {quotations === null ? (
          <EmptyMessage message={dictionary.states.noPermissionToViewQuotations} />
        ) : loadError ? (
          <EmptyMessage message={dictionary.states.genericError} />
        ) : quotations.length === 0 ? (
          <EmptyMessage message={dictionary.states.noRelatedQuotations} />
        ) : (
          <div className="min-w-0 max-w-full overflow-x-auto">
            <table className="w-full min-w-[720px] table-fixed border-collapse text-start">
              <thead>
                <tr className="border-b border-surface-variant text-[12px] uppercase text-on-surface-variant">
                  <th className="py-3 pe-6 w-[22%] font-semibold">
                    {dictionary.relatedQuotations.table.quotation}
                  </th>
                  <th className="py-3 pe-6 w-[16%] font-semibold">
                    {dictionary.relatedQuotations.table.status}
                  </th>
                  <th className="py-3 pe-6 w-[18%] font-semibold">
                    {dictionary.relatedQuotations.table.issueDate}
                  </th>
                  <th className="py-3 pe-6 w-[18%] font-semibold">
                    {dictionary.relatedQuotations.table.validUntil}
                  </th>
                  <th className="py-3 w-[26%] text-end font-semibold">
                    {dictionary.relatedQuotations.table.grandTotal}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px]">
                {quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td className="py-4 pe-6 font-mono font-semibold align-top">
                      <Link
                        href={`/quotations/${quotation.id}`}
                        className="text-primary hover:underline"
                      >
                        <span dir="ltr" className="inline-block whitespace-nowrap">
                          {isolateBidiText(quotation.quotationNumber)}
                        </span>
                      </Link>
                    </td>
                    <td className="py-4 pe-6 align-top">
                      <StatusBadge variant={QUOTATION_STATUS_VARIANTS[quotation.status]}>
                        {getQuotationStatusLabel(dictionary.locale, quotation.status)}
                      </StatusBadge>
                    </td>
                    <td className="py-4 pe-6 text-on-surface-variant align-top">
                      <UiDateText locale={dictionary.locale} value={quotation.date} />
                    </td>
                    <td className="py-4 pe-6 text-on-surface-variant align-top">
                      {quotation.validUntil ? (
                        <UiDateText locale={dictionary.locale} value={quotation.validUntil} />
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="py-4 text-end font-semibold text-on-surface tabular-nums align-top">
                      <span dir="ltr" className="inline-block whitespace-nowrap">
                        {formatSarAmount(dictionary.locale, quotation.grandTotal)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

function EmptyMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center rounded-lg border border-dashed border-outline-variant bg-surface py-10 text-[14px] leading-[20px] text-on-surface-variant">
      {message}
    </div>
  );
}
