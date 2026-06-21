import type { ComponentProps } from "react";
import Link from "next/link";
import StatusBadge from "@/components/ui/StatusBadge";
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
}

export default function RelatedQuotationsCard({
  quotations,
}: RelatedQuotationsCardProps) {
  return (
    <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
      <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold text-primary">Related Quotations</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
            Service-scoped quotation records.
          </p>
        </div>
        {quotations && (
          <div className="text-[13px] leading-[18px] text-on-surface-variant">
            {quotations.length} {quotations.length === 1 ? "quotation" : "quotations"}
          </div>
        )}
      </div>

      <div className="p-6">
        {quotations === null ? (
          <EmptyMessage message="You do not have permission to view related quotations." />
        ) : quotations.length === 0 ? (
          <EmptyMessage message="No quotations are linked to this service yet." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-surface-variant text-[12px] uppercase text-on-surface-variant">
                  <th className="py-3 pr-4 font-semibold">Quotation</th>
                  <th className="py-3 pr-4 font-semibold">Status</th>
                  <th className="py-3 pr-4 font-semibold">Issue Date</th>
                  <th className="py-3 pr-4 font-semibold">Valid Until</th>
                  <th className="py-3 text-right font-semibold">Grand Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px]">
                {quotations.map((quotation) => (
                  <tr key={quotation.id}>
                    <td className="py-4 pr-4 font-mono font-semibold">
                      <Link
                        href={`/quotations/${quotation.id}`}
                        className="text-primary hover:underline"
                      >
                        {quotation.quotationNumber}
                      </Link>
                    </td>
                    <td className="py-4 pr-4">
                      <StatusBadge variant={QUOTATION_STATUS_VARIANTS[quotation.status]}>
                        {formatStatus(quotation.status)}
                      </StatusBadge>
                    </td>
                    <td className="py-4 pr-4 text-on-surface-variant">
                      {quotation.date}
                    </td>
                    <td className="py-4 pr-4 text-on-surface-variant">
                      {quotation.validUntil ?? "—"}
                    </td>
                    <td className="py-4 text-right font-semibold text-on-surface">
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

function formatStatus(status: QuotationStatus) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatSar(amount: number) {
  return `${amount.toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} SAR`;
}
