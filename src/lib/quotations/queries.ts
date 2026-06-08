import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { mapRowToQuotationListItem, mapRowToQuotationDetail } from "./mappers";
import type { QuotationListItem, QuotationDetail } from "./types";

export async function getQuotations(): Promise<QuotationListItem[]> {
  await requirePermission("quotations:read");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("quotations")
      .select("*, customers(company, contact)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("[getQuotations] Supabase error:", error.message);
      return [];
    }

    return (data || []).map(mapRowToQuotationListItem);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getQuotations] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return [];
  }
}

export async function getQuotationById(id: string): Promise<QuotationDetail | null> {
  await requirePermission("quotations:read");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("quotations")
      .select("*, customers(company, contact), quotation_items(*)")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) {
      console.error("[getQuotationById] Supabase error:", error.message);
      return null;
    }

    return mapRowToQuotationDetail(data);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getQuotationById] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return null;
  }
}
