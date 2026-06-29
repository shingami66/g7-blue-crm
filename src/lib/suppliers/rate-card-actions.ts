"use server";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToSupplierRateCard } from "./rate-card-mappers";
import type { SupplierRateCardsListResult, SupplierRateCardRow } from "./rate-card-types";

const RATE_CARD_SELECT = `
  id,
  supplier_id,
  category,
  item_name,
  unit,
  currency,
  base_cost,
  valid_from,
  valid_to,
  status,
  notes,
  created_at,
  updated_at
`;

export async function getSupplierRateCards(supplierId: string): Promise<SupplierRateCardsListResult> {
  await requirePermission("supplier_costing:read");

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("supplier_rate_cards")
      .select(RATE_CARD_SELECT)
      .eq("supplier_id", supplierId)
      .eq("is_deleted", false);

    if (error) {
      console.error("[getSupplierRateCards] Supabase error:", error.message);
      return { rateCards: [], error: "rate_cards_load_failed" };
    }

    const rows = (data ?? []) as unknown as SupplierRateCardRow[];
    
    // Sort in memory because Supabase JS order doesn't easily do status='active' first without custom SQL or complex case logic
    const sorted = rows.map(mapRowToSupplierRateCard).sort((a, b) => {
      // 1. Status: active first
      if (a.status === "active" && b.status !== "active") return -1;
      if (a.status !== "active" && b.status === "active") return 1;
      
      // 2. valid_from desc
      const dateA = new Date(a.validFrom).getTime();
      const dateB = new Date(b.validFrom).getTime();
      if (dateA !== dateB) return dateB - dateA;
      
      // 3. created_at desc
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return { rateCards: sorted };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      // Don't swallow auth errors, let them propagate or handle explicitly
      throw err;
    }
    console.error("[getSupplierRateCards] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { rateCards: [], error: "rate_cards_load_failed" };
  }
}
