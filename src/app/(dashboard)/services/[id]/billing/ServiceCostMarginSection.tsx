import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { TrendingUp, DollarSign, Calculator } from "lucide-react";

export type ServiceCostMarginSectionProps = {
  billingCeiling: number | null;
  supplierAllocations: SupplierAllocation[] | null;
  canReadCost: boolean;
  dictionary: ServicesDictionary;
};

export default function ServiceCostMarginSection({
  billingCeiling,
  supplierAllocations,
  canReadCost,
  dictionary,
}: ServiceCostMarginSectionProps) {
  const billingDict = dictionary.billing;
  const locale = dictionary.locale;

  if (!canReadCost || !supplierAllocations || supplierAllocations.length === 0) {
    return null;
  }

  const validCosts = supplierAllocations
    .map((a) => a.estimatedTotalCost)
    .filter((cost): cost is number => typeof cost === "number" && !isNaN(cost));

  if (validCosts.length === 0) {
    return null;
  }

  const totalSupplierCost = validCosts.reduce((sum, cost) => sum + cost, 0);

  const grossMargin =
    typeof billingCeiling === "number" ? billingCeiling - totalSupplierCost : null;

  const marginPercentage =
    typeof billingCeiling === "number" && billingCeiling > 0 && grossMargin !== null
      ? Math.round((grossMargin / billingCeiling) * 100)
      : null;

  return (
    <section className="rounded-xl border border-surface-variant bg-surface-container-lowest overflow-hidden">
      <div className="flex items-center justify-between gap-3 border-b border-surface-variant bg-surface-bright px-6 py-4">
        <div className="flex items-center gap-2 min-w-0">
          <TrendingUp size={18} className="text-primary shrink-0" aria-hidden="true" />
          <div>
            <h3 className="font-semibold text-primary truncate">
              {billingDict.costMarginTitle}
            </h3>
            <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
              {billingDict.costMarginSubtitle}
            </p>
          </div>
        </div>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-outline-variant/60 bg-surface p-4">
            <div className="flex items-center gap-2 text-on-surface-variant mb-1">
              <DollarSign size={14} aria-hidden="true" />
              <span className="text-xs font-semibold uppercase tracking-wider">
                {billingDict.totalSupplierCost}
              </span>
            </div>
            <span className="block font-mono text-base font-semibold text-on-surface tabular-nums" dir="ltr">
              {formatSarAmount(locale, totalSupplierCost)}
            </span>
          </div>

          <div className="rounded-lg border border-outline-variant/60 bg-surface p-4">
            <div className="flex items-center justify-between gap-2 text-on-surface-variant mb-1">
              <div className="flex items-center gap-2">
                <Calculator size={14} aria-hidden="true" />
                <span className="text-xs font-semibold uppercase tracking-wider">
                  {billingDict.estimatedGrossMargin}
                </span>
              </div>
              {marginPercentage !== null && (
                <span className="text-xs font-bold text-primary">
                  {marginPercentage}%
                </span>
              )}
            </div>
            <span className="block font-mono text-base font-semibold text-primary tabular-nums" dir="ltr">
              {grossMargin !== null
                ? formatSarAmount(locale, grossMargin)
                : dictionary.billing.cards.amountUnavailable}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
