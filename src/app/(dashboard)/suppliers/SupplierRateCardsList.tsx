"use client";

import { useEffect, useState } from "react";
import { getSupplierRateCards } from "@/lib/suppliers/rate-card-actions";
import type { SupplierRateCard } from "@/lib/suppliers/rate-card-types";
import StatusBadge from "@/components/ui/StatusBadge";
import { Banknote } from "lucide-react";
import {
  formatSupplierCopy,
  type SuppliersDictionary,
} from "@/lib/i18n/dictionaries/suppliers";
import { formatSarAmount, formatUiDate, formatUiNumber } from "@/lib/i18n/formatting";
import type { Locale } from "@/lib/i18n/locales";
import { isolateBidiText } from "@/lib/i18n/bidi";

export default function SupplierRateCardsList({
  supplierId,
  dictionary,
  locale,
}: {
  supplierId: string;
  dictionary: SuppliersDictionary["rateCards"];
  locale: Locale;
}) {
  const [rateCards, setRateCards] = useState<SupplierRateCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function fetchRateCards() {
      setLoading(true);
      setError(null);

      const result = await getSupplierRateCards(supplierId);

      if (!mounted) return;

      if (result.error) {
        setError(result.error);
      } else {
        setRateCards(result.rateCards);
      }

      setLoading(false);
    }

    fetchRateCards();

    return () => {
      mounted = false;
    };
  }, [supplierId]);

  if (loading) {
    return (
      <div className="flex justify-center p-6 text-on-surface-variant">
        <span className="text-[14px]">{dictionary.loading}</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container/20 border border-error/30 rounded-lg p-4 text-[14px] text-on-surface-variant">
        {dictionary.loadFailed}
      </div>
    );
  }

  if (rateCards.length === 0) {
    return (
      <div className="border border-outline-variant/50 rounded-lg p-4 text-center text-on-surface-variant text-[14px]">
        {dictionary.empty}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rateCards.map((rate) => (
        <div key={rate.id} className="border border-outline-variant/50 rounded-lg p-4 bg-surface">
          <div className="flex justify-between items-start mb-2 gap-4">
            <div className="min-w-0">
              <h5
                className="text-[14px] font-bold text-on-surface truncate"
                title={rate.itemName}
                dir="auto"
              >
                {rate.itemName}
              </h5>
              <div className="text-[12px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                {rate.category && (
                  <span
                    className="bg-surface-variant text-on-surface px-1.5 py-0.5 rounded uppercase font-medium text-[10px]"
                    dir="auto"
                  >
                    {rate.category.replace("_", " ")}
                  </span>
                )}
                <span dir="auto">
                  {formatSupplierCopy(dictionary.perUnit, { unit: rate.unit })}
                </span>
              </div>
            </div>
            <StatusBadge variant={rate.status === "active" ? "active" : "inactive"}>
              {rate.status === "active" ? dictionary.active : dictionary.inactive}
            </StatusBadge>
          </div>

          <div className="flex items-center gap-2 text-primary font-bold text-[16px] mb-3 tabular-nums">
            <Banknote size={16} />
            <span dir="ltr">
              {rate.currency === "SAR"
                ? formatSarAmount(locale, rate.baseCost)
                : `${isolateBidiText(rate.currency)} ${formatUiNumber(locale, rate.baseCost, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-[12px] text-on-surface-variant mb-2">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-outline tracking-wider mb-0.5">
                {dictionary.validFrom}
              </span>
              <span dir="ltr" className="tabular-nums">
                {formatUiDate(locale, rate.validFrom)}
              </span>
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-outline tracking-wider mb-0.5">
                {dictionary.validTo}
              </span>
              <span dir="ltr" className="tabular-nums">
                {rate.validTo ? formatUiDate(locale, rate.validTo) : dictionary.current}
              </span>
            </div>
          </div>

          {rate.notes && (
            <div
              className="mt-3 pt-3 border-t border-outline-variant/30 text-[12px] text-on-surface-variant italic"
              dir="auto"
            >
              {rate.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
