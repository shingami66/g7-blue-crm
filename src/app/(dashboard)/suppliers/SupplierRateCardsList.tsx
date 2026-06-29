"use client";

import { useEffect, useState } from "react";
import { getSupplierRateCards } from "@/lib/suppliers/rate-card-actions";
import type { SupplierRateCard } from "@/lib/suppliers/rate-card-types";
import StatusBadge from "@/components/ui/StatusBadge";
import { Banknote } from "lucide-react";

export default function SupplierRateCardsList({ supplierId }: { supplierId: string }) {
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
        <span className="text-[14px]">Loading rate cards...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-error-container/20 border border-error/30 rounded-lg p-4 text-[14px] text-on-surface-variant">
        Failed to load rate cards. Please try again.
      </div>
    );
  }

  if (rateCards.length === 0) {
    return (
      <div className="border border-outline-variant/50 rounded-lg p-4 text-center text-on-surface-variant text-[14px]">
        No rate cards recorded for this supplier.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {rateCards.map((rate) => (
        <div key={rate.id} className="border border-outline-variant/50 rounded-lg p-4 bg-surface">
          <div className="flex justify-between items-start mb-2 gap-4">
            <div className="min-w-0">
              <h5 className="text-[14px] font-bold text-on-surface truncate" title={rate.itemName}>
                {rate.itemName}
              </h5>
              <div className="text-[12px] text-on-surface-variant flex items-center gap-2 mt-0.5">
                {rate.category && (
                  <span className="bg-surface-variant text-on-surface px-1.5 py-0.5 rounded uppercase font-medium text-[10px]">
                    {rate.category.replace("_", " ")}
                  </span>
                )}
                <span>per {rate.unit}</span>
              </div>
            </div>
            <StatusBadge variant={rate.status === "active" ? "active" : "inactive"}>
              {rate.status === "active" ? "Active" : "Inactive"}
            </StatusBadge>
          </div>
          
          <div className="flex items-center gap-2 text-primary font-bold text-[16px] mb-3">
            <Banknote size={16} />
            <span>
              {rate.currency} {rate.baseCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-[12px] text-on-surface-variant mb-2">
            <div>
              <span className="block text-[10px] uppercase font-semibold text-outline tracking-wider mb-0.5">Valid From</span>
              {new Date(rate.validFrom).toLocaleDateString()}
            </div>
            <div>
              <span className="block text-[10px] uppercase font-semibold text-outline tracking-wider mb-0.5">Valid To</span>
              {rate.validTo ? new Date(rate.validTo).toLocaleDateString() : "Current"}
            </div>
          </div>
          
          {rate.notes && (
            <div className="mt-3 pt-3 border-t border-outline-variant/30 text-[12px] text-on-surface-variant italic">
              {rate.notes}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
