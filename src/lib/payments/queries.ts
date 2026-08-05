import "server-only";

import { getBusinessYearBounds } from "@/lib/business-year";
import { requirePermission } from "@/lib/auth/permissions";
import { buildIlikeOrFilter } from "@/lib/search/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { mapRowToPaymentListItem } from "./mappers";
import type {
  PaymentListRow,
  PaymentsListQuery,
  PaymentsListResult,
} from "./types";
import {
  normalizePaymentsListPageSize,
  normalizePaymentsListSearch,
} from "./types";

const PAYMENT_LIST_SELECT = `
  id,
  payment_number,
  invoice_id,
  customer_id,
  date,
  amount,
  method,
  reference,
  status,
  created_at,
  created_by,
  invoices (
    invoice_number,
    invoice_type,
    service_id,
    services (
      service_number,
      service_title
    )
  ),
  customers (
    company,
    contact
  )
`;

type IdRow = { id: string };

async function getRelatedPaymentIds(
  supabase: ReturnType<typeof createAdminClient>,
  search: string,
): Promise<{ invoiceIds: string[]; customerIds: string[]; serviceIds: string[] }> {
  const invoiceFilter = buildIlikeOrFilter(["invoice_number"], search);
  const customerFilter = buildIlikeOrFilter(["company", "contact"], search);
  const serviceFilter = buildIlikeOrFilter(["service_number", "service_title"], search);

  const [invoices, customers, services] = await Promise.all([
    supabase
      .from("invoices")
      .select("id")
      .eq("is_deleted", false)
      .or(invoiceFilter ?? "id.is.null")
      .limit(1000),
    supabase
      .from("customers")
      .select("id")
      .eq("is_deleted", false)
      .or(customerFilter ?? "id.is.null")
      .limit(1000),
    supabase
      .from("services")
      .select("id")
      .is("deleted_at", null)
      .or(serviceFilter ?? "id.is.null")
      .limit(1000),
  ]);

  const serviceIds = ((services.data ?? []) as IdRow[]).map((row) => row.id);
  const serviceInvoices = serviceIds.length > 0
    ? await supabase
      .from("invoices")
      .select("id")
      .eq("is_deleted", false)
      .in("service_id", serviceIds)
      .limit(1000)
    : { data: [] as IdRow[] };

  return {
    invoiceIds: [
      ...new Set([
        ...((invoices.data ?? []) as IdRow[]).map((row) => row.id),
        ...((serviceInvoices.data ?? []) as IdRow[]).map((row) => row.id),
      ]),
    ],
    customerIds: ((customers.data ?? []) as IdRow[]).map((row) => row.id),
    serviceIds,
  };
}

function buildPaymentSearchFilter(
  search: string,
  relatedIds: { invoiceIds: string[]; customerIds: string[]; serviceIds: string[] },
): string | undefined {
  const directFilter = buildIlikeOrFilter(["payment_number", "reference"], search);
  const relatedFilters = [
    relatedIds.invoiceIds.length > 0 ? `invoice_id.in.(${relatedIds.invoiceIds.join(",")})` : undefined,
    relatedIds.customerIds.length > 0 ? `customer_id.in.(${relatedIds.customerIds.join(",")})` : undefined,
  ].filter((value): value is string => Boolean(value));

  return [directFilter, ...relatedFilters].filter((value): value is string => Boolean(value)).join(",") || undefined;
}

function emptyResult(pageSize: ReturnType<typeof normalizePaymentsListPageSize>): PaymentsListResult {
  return {
    payments: [],
    pagination: { page: 1, pageSize, total: 0, totalPages: 1 },
    error: "payments_load_failed",
  };
}

export async function getPaymentsList(options: PaymentsListQuery = {}): Promise<PaymentsListResult> {
  await requirePermission("payments:read");

  const pageSize = normalizePaymentsListPageSize(options.pageSize);
  const search = normalizePaymentsListSearch(options.search);

  try {
    const supabase = createAdminClient();
    const relatedIds = search
      ? await getRelatedPaymentIds(supabase, search)
      : { invoiceIds: [], customerIds: [], serviceIds: [] };
    const searchFilter = search ? buildPaymentSearchFilter(search, relatedIds) : undefined;

    let countQuery = supabase
      .from("payments")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false);
    let dataQuery = supabase
      .from("payments")
      .select(PAYMENT_LIST_SELECT)
      .eq("is_deleted", false);

    if (options.status) {
      countQuery = countQuery.eq("status", options.status);
      dataQuery = dataQuery.eq("status", options.status);
    }
    if (options.year) {
      const bounds = getBusinessYearBounds(options.year);
      countQuery = countQuery.gte("date", bounds.start).lt("date", bounds.end);
      dataQuery = dataQuery.gte("date", bounds.start).lt("date", bounds.end);
    }
    if (searchFilter) {
      countQuery = countQuery.or(searchFilter);
      dataQuery = dataQuery.or(searchFilter);
    }

    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error("[getPaymentsList] Count error:", countError.message);
      return emptyResult(pageSize);
    }

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
    const rangeStart = (page - 1) * pageSize;
    const { data, error } = await dataQuery
      .order("payment_number", { ascending: true })
      .order("date", { ascending: true })
      .order("created_at", { ascending: true })
      .range(rangeStart, rangeStart + pageSize - 1);

    if (error) {
      console.error("[getPaymentsList] Data error:", error.message);
      return emptyResult(pageSize);
    }

    return {
      payments: (data as unknown as PaymentListRow[]).map(mapRowToPaymentListItem),
      pagination: { page, pageSize, total, totalPages },
    };
  } catch (err) {
    console.error("[getPaymentsList] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return emptyResult(pageSize);
  }
}
