import Link from "next/link";
import type { ServiceBillingState } from "@/lib/invoices/types";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { Receipt, ArrowUpRight } from "lucide-react";

export type ServiceBillingSummaryCardProps = {
  serviceId: string;
  billingState: ServiceBillingState;
  dictionary: ServicesDictionary;
};

export default function ServiceBillingSummaryCard({
  serviceId,
  billingState,
  dictionary,
}: ServiceBillingSummaryCardProps) {
  const billingDict = dictionary.billing;
  const cardsDict = billingDict.cards;
  const locale = dictionary.locale;

  const authorityLabel =
    billingState.authorityMode === "active_abs"
      ? cardsDict.billingAuthorityAbs
      : billingState.authorityMode === "legacy_quotation"
      ? cardsDict.billingAuthorityQuotation
      : billingState.authorityMode === "historical_abs_only"
      ? cardsDict.billingAuthorityHistorical
      : cardsDict.billingAuthorityNone;

  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant bg-surface-bright px-6 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <Receipt size={18} className="text-primary shrink-0" aria-hidden="true" />
          <h3 className="font-semibold text-primary truncate">
            {billingDict.title}
          </h3>
        </div>
        <Link
          href={`/services/${encodeURIComponent(serviceId)}/billing`}
          className="inline-flex items-center gap-1.5 rounded-lg border border-outline-variant bg-surface px-3 py-1.5 text-xs font-semibold text-on-surface hover:border-primary/50 hover:bg-surface-container-lowest hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <span>{billingDict.openWorkspace}</span>
          <ArrowUpRight size={14} className="rtl:rotate-[-90deg]" aria-hidden="true" />
        </Link>
      </div>

      <div className="p-6 space-y-5">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-lg border border-outline-variant/60 bg-surface p-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              {cardsDict.billingCeiling}
            </span>
            <span className="mt-1 block font-mono text-sm font-semibold text-on-surface tabular-nums" dir="ltr">
              {billingState.billingCeiling
                ? formatSarAmount(locale, billingState.billingCeiling)
                : cardsDict.amountUnavailable}
            </span>
          </div>

          <div className="rounded-lg border border-outline-variant/60 bg-surface p-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              {cardsDict.priorInvoiced}
            </span>
            <span className="mt-1 block font-mono text-sm font-semibold text-on-surface tabular-nums" dir="ltr">
              {billingState.activePriorInvoiceTotal != null
                ? formatSarAmount(locale, billingState.activePriorInvoiceTotal)
                : cardsDict.exposureUnavailable}
            </span>
          </div>

          <div className="rounded-lg border border-outline-variant/60 bg-surface p-3.5">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
              {cardsDict.remaining}
            </span>
            <span className="mt-1 block font-mono text-sm font-semibold text-primary tabular-nums" dir="ltr">
              {billingState.remainingUninvoicedAmount
                ? formatSarAmount(locale, billingState.remainingUninvoicedAmount)
                : cardsDict.remainingUnavailable}
            </span>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-on-surface-variant pt-1 border-t border-outline-variant/40">
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-medium">{cardsDict.billingAuthority}:</span>
            <span className="font-semibold text-on-surface truncate">{authorityLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <span>
              {cardsDict.depositInvoice}:{" "}
              <strong className="text-on-surface">
                {billingState.depositInvoice
                  ? isolateBidiText(billingState.depositInvoice.invoiceNumber)
                  : cardsDict.noActiveDepositInvoice}
              </strong>
            </span>
            <span>|</span>
            <span>
              {cardsDict.finalInvoice}:{" "}
              <strong className="text-on-surface">
                {billingState.finalInvoice
                  ? isolateBidiText(billingState.finalInvoice.invoiceNumber)
                  : cardsDict.noActiveFinalInvoice}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
