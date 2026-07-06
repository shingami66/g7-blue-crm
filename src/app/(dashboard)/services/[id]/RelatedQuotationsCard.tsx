import type { ComponentProps } from "react";
import Link from "next/link";
import { FileText } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { isolateBidiText } from "@/lib/i18n/bidi";
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
}

export default function RelatedQuotationsCard({
  quotations,
  serviceId,
  canCreateQuotation,
  dictionary,
  disabledReason,
}: RelatedQuotationsCardProps) {
  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-primary">{dictionary.relatedQuotations.title}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
            {dictionary.relatedQuotations.subtitle}
          </p>
        </div>
        <div className="flex items-center gap-4">
          {quotations && (
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
                className="flex items-center gap-1.5 px-3 py-1.5 bg-surface border border-outline-variant text-on-surface-variant rounded-lg text-[13px] font-semibold cursor-not-allowed opacity-60"
                title={disabledReason}
              >
                <FileText size={16} />
                {dictionary.relatedQuotations.createQuotation}
              </span>
            ) : (
              <Link
                href={`/quotations/new?serviceId=${serviceId}`}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[13px] font-semibold transition-colors"
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
        ) : quotations.length === 0 ? (
          <EmptyMessage message={dictionary.states.noRelatedQuotations} />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-variant text-[12px] uppercase text-on-surface-variant">
                  <th className="py-3 pr-4 font-semibold">{dictionary.relatedQuotations.table.quotation}</th>
                  <th className="py-3 pr-4 font-semibold">{dictionary.relatedQuotations.table.status}</th>
                  <th className="py-3 pr-4 font-semibold">{dictionary.relatedQuotations.table.issueDate}</th>
                  <th className="py-3 pr-4 font-semibold">{dictionary.relatedQuotations.table.validUntil}</th>
                  <th className="py-3 text-right font-semibold">{dictionary.relatedQuotations.table.grandTotal}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px]">
                {quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td dir="ltr" className="py-4 pr-4 font-mono font-semibold">
                      <Link
                        href={`/quotations/${quotation.id}`}
                        className="text-primary hover:underline"
                      >
                        {isolateBidiText(quotation.quotationNumber)}
                      </Link>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusBadge variant={QUOTATION_STATUS_VARIANTS[quotation.status]}>
                        {dictionary.quotationStatuses[quotation.status]}
                      </StatusBadge>
                    </td>
                    <td dir="ltr" className="py-4 pr-4 text-on-surface-variant">
                      {isolateBidiText(quotation.date)}
                    </td>
                    <td dir="ltr" className="py-4 pr-4 text-on-surface-variant">
                      {quotation.validUntil ? isolateBidiText(quotation.validUntil) : "—"}
                    </td>
                    <td dir="ltr" className="py-4 text-right font-semibold text-on-surface">
                      {formatSar(quotation.grandTotal)}
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

function formatSar(amount: number) {
  return isolateBidiText(`${amount.toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} SAR`);
}
