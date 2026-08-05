import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { mapRowToQuotationListItem, mapRowToQuotationDetail } from "./mappers";
import {
  normalizeQuotationListPageSize,
  normalizeQuotationListSearch,
  normalizeQuotationSearchMode,
  type QuotationDetail,
  type QuotationListItem,
  type QuotationListQuery,
  type QuotationRowWithRelations,
  type QuotationsListResult,
} from "./types";
import { buildIlikeOrFilter } from "@/lib/search/server";

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

function monthBounds(month: string | undefined): { start: string; end: string } | null {
  if (!month || !/^\d{4}-\d{2}$/.test(month)) return null;
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = new Date(Date.UTC(year, monthNumber, 1));
  return {
    start: `${month}-01`,
    end: nextMonth.toISOString().slice(0, 10),
  };
}

function quotationSearchColumns(mode: QuotationListQuery["searchMode"]): string[] {
  if (mode === "customer") return ["company", "contact"];
  if (mode === "service") {
    return ["service_number", "service_title"];
  }
  return ["quotation_number"];
}

function quotationSearchRelation(mode: QuotationListQuery["searchMode"]): string | undefined {
  if (mode === "customer") return "customers";
  if (mode === "service") return "services";
  return undefined;
}

function quotationListSelect(searchRelation: string | undefined): string {
  const customerSelect = searchRelation === "customers"
    ? "customers!inner(company, contact)"
    : "customers(company, contact)";
  const serviceSelect = searchRelation === "services"
    ? "services!inner(service_number, service_title, status, event_name)"
    : "services(service_number, service_title, status, event_name)";
  return `*, ${customerSelect}, ${serviceSelect}`;
}

export async function getQuotationsList(
  options: QuotationListQuery = {},
): Promise<QuotationsListResult> {
  await requirePermission("quotations:read");

  const pageSize = normalizeQuotationListPageSize(options.pageSize);
  const search = normalizeQuotationListSearch(options.search);
  const searchMode = search ? normalizeQuotationSearchMode(options.searchMode) : undefined;
  const searchFilter = searchMode
    ? buildIlikeOrFilter(quotationSearchColumns(searchMode), search)
    : undefined;
  const searchRelation = searchFilter && searchMode ? quotationSearchRelation(searchMode) : undefined;
  const bounds = monthBounds(options.month);

  try {
    const supabase = createAdminClient();
    let countQuery = supabase
      .from("quotations")
      .select(searchRelation ? `id, ${searchRelation}!inner(id)` : "id", { count: "exact", head: true })
      .eq("is_deleted", false);
    let dataQuery = supabase
      .from("quotations")
      .select(quotationListSelect(searchRelation))
      .eq("is_deleted", false);

    if (options.status) {
      countQuery = countQuery.eq("status", options.status);
      dataQuery = dataQuery.eq("status", options.status);
    }
    if (bounds) {
      countQuery = countQuery.gte("date", bounds.start).lt("date", bounds.end);
      dataQuery = dataQuery.gte("date", bounds.start).lt("date", bounds.end);
    }
    if (searchFilter) {
      countQuery = countQuery.or(searchFilter, searchRelation ? { referencedTable: searchRelation } : undefined);
      dataQuery = dataQuery.or(searchFilter, searchRelation ? { referencedTable: searchRelation } : undefined);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error("[getQuotationsList] Count error:", countError.message);
      return { quotations: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "quotations_load_failed" };
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
    const rangeStart = (page - 1) * pageSize;
    const { data, error } = await dataQuery
      .order("quotation_number", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(rangeStart, rangeStart + pageSize - 1);

    if (error) {
      console.error("[getQuotationsList] Data error:", error.message);
      return { quotations: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "quotations_load_failed" };
    }

    return {
      quotations: (data ?? []).map((row) => mapRowToQuotationListItem(row as unknown as QuotationRowWithRelations)),
      pagination: { page, pageSize, total, totalPages },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getQuotationsList] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { quotations: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "quotations_load_failed" };
  }
}

export async function getQuotationsByServiceId(
  serviceId: string
): Promise<QuotationListItem[]> {
  await requirePermission("quotations:read");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("quotations")
      .select(QUOTATION_SELECT)
      .eq("service_id", serviceId)
      .eq("is_deleted", false)
      .order("quotation_number", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error("[getQuotationsByServiceId] Supabase error:", error.message);
      return [];
    }

    return (data || []).map(mapRowToQuotationListItem);
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error(
      "[getQuotationsByServiceId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
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
