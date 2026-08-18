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
  type QuotationDetailRow,
  type QuotationItemRow,
  type QuotationListItem,
  type QuotationListQuery,
  type QuotationRowWithRelations,
  type QuotationsListResult,
} from "./types";
import { buildIlikeOrFilter } from "@/lib/search/server";
import { getBusinessYearBounds } from "@/lib/business-year";

const QUOTATION_SELECT = "*, customers(company, contact), services(service_number, service_title, status, event_name)";
const QUOTATION_DETAIL_SELECT = `${QUOTATION_SELECT}, quotation_items(*)`;

export function sanitizeQuotationRow(row: Record<string, unknown>): QuotationRowWithRelations {
  return {
    ...(row as unknown as QuotationRowWithRelations),
    subtotal: Number(row.subtotal) || 0,
    discount: Number(row.discount) || 0,
    vat_rate: Number(row.vat_rate) || 0,
    vat_amount: Number(row.vat_amount) || 0,
    grand_total: Number(row.grand_total) || 0,
    created_at: typeof row.created_at === "string" ? row.created_at : "",
    updated_at: typeof row.updated_at === "string" ? row.updated_at : "",
    is_deleted: Boolean(row.is_deleted),
    created_by: typeof row.created_by === "string" ? row.created_by : "",
    updated_by: typeof row.updated_by === "string" ? row.updated_by : "",
  };
}

export function sanitizeQuotationDetailRow(row: Record<string, unknown>): QuotationDetailRow {
  const base = sanitizeQuotationRow(row);
  const items = Array.isArray(row.quotation_items) ? row.quotation_items : [];
  return {
    ...base,
    quotation_items: items.map((item) => {
      const itemObj = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
      return {
        ...(itemObj as unknown as QuotationItemRow),
        qty: Number(itemObj.qty) || 0,
        unit_price: Number(itemObj.unit_price) || 0,
        vat: Number(itemObj.vat) || 0,
        total: Number(itemObj.total) || 0,
        created_at: typeof itemObj.created_at === "string" ? itemObj.created_at : "",
        updated_at: typeof itemObj.updated_at === "string" ? itemObj.updated_at : "",
      };
    }),
  };
}

export async function getQuotations(options: { year?: number } = {}): Promise<QuotationListItem[]> {
  await requirePermission("quotations:read");

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("quotations")
      .select(QUOTATION_SELECT)
      .eq("is_deleted", false);
    if (options.year) {
      const bounds = getBusinessYearBounds(options.year);
      query = query.gte("date", bounds.start).lt("date", bounds.end);
    }
    const { data, error } = await query
      .order("quotation_number", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true });

    if (error) {
      console.error("[getQuotations] Supabase error:", error.message);
      return [];
    }

    return (data || []).map((row) => mapRowToQuotationListItem(sanitizeQuotationRow(row)));
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
      .select(
        searchRelation === "customers"
          ? "*, customers!inner(company, contact), services(service_number, service_title, status, event_name)"
          : searchRelation === "services"
            ? "*, customers(company, contact), services!inner(service_number, service_title, status, event_name)"
            : "*, customers(company, contact), services(service_number, service_title, status, event_name)",
      )
      .eq("is_deleted", false);

    if (options.status) {
      countQuery = countQuery.eq("status", options.status);
      dataQuery = dataQuery.eq("status", options.status);
    }
    if (bounds) {
      countQuery = countQuery.gte("date", bounds.start).lt("date", bounds.end);
      dataQuery = dataQuery.gte("date", bounds.start).lt("date", bounds.end);
    }
    if (options.year) {
      const yearBounds = getBusinessYearBounds(options.year);
      countQuery = countQuery.gte("date", yearBounds.start).lt("date", yearBounds.end);
      dataQuery = dataQuery.gte("date", yearBounds.start).lt("date", yearBounds.end);
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
      quotations: (data ?? []).map((row) => mapRowToQuotationListItem(sanitizeQuotationRow(row))),
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

    return (data || []).map((row) => mapRowToQuotationListItem(sanitizeQuotationRow(row)));
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

    return mapRowToQuotationDetail(sanitizeQuotationDetailRow(data));
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getQuotationById] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return null;
  }
}
