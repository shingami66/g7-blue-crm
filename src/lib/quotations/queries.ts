import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { mapRowToQuotationListItem, mapRowToQuotationDetail } from "./mappers";
import type { QuotationListItem, QuotationDetail } from "./types";

const QUOTATION_SELECT = "*, customers(company, contact), services(service_number, service_title, status, event_name)";
const QUOTATION_DETAIL_SELECT = `${QUOTATION_SELECT}, quotation_items(*)`;

export async function getQuotations(): Promise<QuotationListItem[]> {
  await requirePermission("quotations:read");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("quotations")
      .select(QUOTATION_SELECT)
      .eq("is_deleted", false)
      .order("quotation_number", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

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
      .select(QUOTATION_DETAIL_SELECT)
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
