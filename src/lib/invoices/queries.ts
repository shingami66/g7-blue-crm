import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { APPROVED_BILLING_SCOPE_PERMISSIONS } from "@/lib/approved-billing-scopes/permissions";
import type { ApprovedBillingScopeReadResult } from "@/lib/approved-billing-scopes/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceRow } from "./types";
import { mapRowToInvoice } from "./mappers";
import type { Invoice } from "@/types/invoice";
import { buildIlikeOrFilter } from "@/lib/search/server";
import { getBusinessYearBounds } from "@/lib/business-year";
import {
  normalizeInvoiceListPageSize,
  normalizeInvoiceListSearch,
  normalizeInvoiceSearchMode,
  type InvoiceListQuery,
  type InvoicesListResult,
} from "./types";

export async function getInvoicesByApprovedBillingScopeId(
  approvedBillingScopeId: string
): Promise<
  ApprovedBillingScopeReadResult<Invoice[], "scope_unexpected_error">
> {
  await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);
  await requirePermission("invoices:read");

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("invoices")
      .select("*")
      .eq("approved_billing_scope_id", approvedBillingScopeId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(
        "[getInvoicesByApprovedBillingScopeId] Supabase error:",
        error.message
      );
      return { status: "error", error: "scope_unexpected_error" };
    }

    return {
      status: "success",
      data: (data ?? []).map((row) => mapRowToInvoice(row as InvoiceRow)),
    };
  } catch (err) {
    console.error(
      "[getInvoicesByApprovedBillingScopeId] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return { status: "error", error: "scope_unexpected_error" };
  }
}

export async function getInvoiceById(id: string): Promise<Invoice | null> {
  await requirePermission("invoices:read");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();

  if (error || !data) {
    if (error && error.code !== "PGRST116") {
      console.error("[getInvoiceById] Supabase error:", error.message);
    }
    return null;
  }

  return mapRowToInvoice(data as InvoiceRow);
}

export async function getInvoicesByServiceId(serviceId: string): Promise<Invoice[]> {
  await requirePermission("invoices:read");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("service_id", serviceId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getInvoicesByServiceId] Supabase error:", error.message);
    return [];
  }

  return (data as InvoiceRow[]).map(mapRowToInvoice);
}

export async function getInvoicesByQuotationId(quotationId: string): Promise<Invoice[]> {
  await requirePermission("invoices:read");
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("approved_quotation_id", quotationId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[getInvoicesByQuotationId] Supabase error:", error.message);
    return [];
  }

  return (data as InvoiceRow[]).map(mapRowToInvoice);
}

const INVOICE_LIST_COLUMNS =
  "id, invoice_number, approved_quotation_id, approved_billing_scope_id, customer_id, invoice_type, service_id, date, due_date, status, subtotal, discount_amount, vat_rate, vat_amount, grand_total, amount_paid, balance_due, currency, document_label, vat_mode, snapshot_seller, snapshot_buyer, snapshot_quotation, snapshot_bank_details, snapshot_document_rules, issued_at, voided_at, void_reason, created_at, updated_at, is_deleted, deleted_at";

export async function getInvoices(options: { year?: number } = {}): Promise<Invoice[]> {
  await requirePermission("invoices:read");
  const supabase = createAdminClient();
  let query = supabase
    .from("invoices")
    .select(`${INVOICE_LIST_COLUMNS}, customers(company,contact), services(service_number,service_title)`)
    .eq("is_deleted", false);
  if (options.year) {
    const bounds = getBusinessYearBounds(options.year);
    query = query.not("issued_at", "is", null).gte("issued_at", `${bounds.start}T00:00:00.000Z`).lt("issued_at", `${bounds.end}T00:00:00.000Z`);
  }
  const { data, error } = await query.order("invoice_number", { ascending: true });

  if (error) {
    console.error("[getInvoices] Supabase error:", error.message);
    return [];
  }

  return (data as unknown as InvoiceRow[]).map(mapRowToInvoice);
}

function invoiceSearchColumns(mode: InvoiceListQuery["searchMode"]): string[] {
  return mode === "customer" ? ["company", "contact"] : ["invoice_number"];
}

function invoiceSearchRelation(mode: InvoiceListQuery["searchMode"]): string | undefined {
  return mode === "customer" ? "customers" : undefined;
}

export async function getInvoicesList(
  options: InvoiceListQuery = {},
): Promise<InvoicesListResult> {
  await requirePermission("invoices:read");

  const pageSize = normalizeInvoiceListPageSize(options.pageSize);
  const search = normalizeInvoiceListSearch(options.search);
  const searchMode = search ? normalizeInvoiceSearchMode(options.searchMode) : undefined;
  const searchFilter = searchMode
    ? buildIlikeOrFilter(invoiceSearchColumns(searchMode), search)
    : undefined;
  const searchRelation = searchFilter && searchMode ? invoiceSearchRelation(searchMode) : undefined;

  try {
    const supabase = createAdminClient();
    let countQuery = supabase
      .from("invoices")
      .select(searchRelation ? "id, customers!inner(id)" : "id", { count: "exact", head: true })
      .eq("is_deleted", false);
    let dataQuery = supabase
      .from("invoices")
      .select(
        searchRelation
          ? `${INVOICE_LIST_COLUMNS}, customers!inner(company,contact), services(service_number,service_title)`
          : `${INVOICE_LIST_COLUMNS}, customers(company,contact), services(service_number,service_title)`,
      )
      .eq("is_deleted", false);

    if (options.status && options.status !== "all") {
      countQuery = countQuery.eq("status", options.status);
      dataQuery = dataQuery.eq("status", options.status);
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
      console.error("[getInvoicesList] Count error:", countError.message);
      return { invoices: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "invoices_load_failed" };
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
    const rangeStart = (page - 1) * pageSize;
    const { data, error } = await dataQuery
      .order("invoice_number", { ascending: true })
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(rangeStart, rangeStart + pageSize - 1);

    if (error) {
      console.error("[getInvoicesList] Data error:", error.message);
      return { invoices: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "invoices_load_failed" };
    }

    return {
      invoices: (data ?? []).map((row) => mapRowToInvoice(row as unknown as InvoiceRow)),
      pagination: { page, pageSize, total, totalPages },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) throw err;
    console.error("[getInvoicesList] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return { invoices: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "invoices_load_failed" };
  }
}
