/**
 * Server-only queries for the customers table.
 *
 * These functions use the Supabase admin client (service role key) and must
 * NEVER be imported in Client Components.
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { mapRowToCustomer, type CustomerMetricsRow } from "./mappers";
import type { Customer } from "@/types/customer";
import type { CustomerRow } from "./types";
import { buildIlikeOrFilter } from "@/lib/search/server";
import {
  normalizeCustomerListPageSize,
  normalizeCustomerListSearch,
  type CustomerListQuery,
  type CustomersListResult,
} from "./types";
import type { ListPageSize } from "@/lib/pagination";

const CUSTOMER_LIST_COLUMNS =
  "id, customer_number, company, contact, phone, email, city, status, customer_type, legal_name, commercial_registration_number, vat_number, national_address_building_number, national_address_street, national_address_district, national_address_city, national_address_postal_code, national_address_additional_number, national_address_country, billing_email, finance_contact_name, finance_contact_phone, payment_terms, po_required, created_at, updated_at";

const CUSTOMER_METRICS_COLUMNS =
  "customer_id, services_count, quotations_count, approved_quotations_count, draft_quotations_count, total_quoted_amount";

/**
 * Fetches all non-deleted customers, ordered by most-recently created first.
 * Returns an empty array on error (logged server-side only).
 */
export async function getCustomers(): Promise<Customer[]> {
  await requirePermission("customers:read");

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("customers")
      .select(CUSTOMER_LIST_COLUMNS)
      .eq("is_deleted", false)
      .order("customer_number", { ascending: true });

    if (error) {
      console.error("[getCustomers] Supabase error:", error.message);
      return [];
    }

    const { data: metricsData, error: metricsError } = await supabase
      .from("customer_report_metrics")
      .select(CUSTOMER_METRICS_COLUMNS);

    if (metricsError) {
      console.error("[getCustomers] Error fetching metrics:", metricsError.message);
    }

    const metricsMap = new Map<string, CustomerMetricsRow>();
    if (metricsData) {
      metricsData.forEach((m) => {
        if (m.customer_id) {
          metricsMap.set(m.customer_id, {
            services_count: m.services_count ?? 0,
            quotations_count: m.quotations_count ?? 0,
            approved_quotations_count: m.approved_quotations_count ?? 0,
            draft_quotations_count: m.draft_quotations_count ?? 0,
            total_quoted_amount: m.total_quoted_amount ?? 0,
          });
        }
      });
    }

    return (data as CustomerRow[]).map(row => mapRowToCustomer(row, metricsMap.get(row.id)));
  } catch (err) {
    console.error("[getCustomers] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return [];
  }
}

function emptyCustomersResult(pageSize: ListPageSize): CustomersListResult {
  return { customers: [], pagination: { page: 1, pageSize, total: 0, totalPages: 1 }, error: "customers_load_failed" };
}

export async function getCustomersList(options: CustomerListQuery = {}): Promise<CustomersListResult> {
  await requirePermission("customers:read");
  const pageSize = normalizeCustomerListPageSize(options.pageSize);
  const search = normalizeCustomerListSearch(options.search);

  try {
    const supabase = createAdminClient();
    let countQuery = supabase.from("customers").select("id", { count: "exact", head: true }).eq("is_deleted", false);
    let dataQuery = supabase.from("customers").select(CUSTOMER_LIST_COLUMNS).eq("is_deleted", false);
    if (options.status) {
      countQuery = countQuery.eq("status", options.status);
      dataQuery = dataQuery.eq("status", options.status);
    }
    if (options.city) {
      countQuery = countQuery.eq("city", options.city);
      dataQuery = dataQuery.eq("city", options.city);
    }
    if (search) {
      const filter = buildIlikeOrFilter(["customer_number", "company", "contact", "phone", "email"], search);
      if (filter) {
        countQuery = countQuery.or(filter);
        dataQuery = dataQuery.or(filter);
      }
    }
    const { count, error: countError } = await countQuery;
    if (countError) {
      console.error("[getCustomersList] Count error:", countError.message);
      return emptyCustomersResult(pageSize);
    }
    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const page = Math.min(Math.max(options.page ?? 1, 1), totalPages);
    const rangeStart = (page - 1) * pageSize;
    const { data, error } = await dataQuery
      .order("customer_number", { ascending: true })
      .range(rangeStart, rangeStart + pageSize - 1);
    if (error) {
      console.error("[getCustomersList] Data error:", error.message);
      return emptyCustomersResult(pageSize);
    }
    const rows = (data ?? []) as CustomerRow[];
    const ids = rows.map((row) => row.id);
    const { data: metricsData, error: metricsError } = ids.length > 0
      ? await supabase.from("customer_report_metrics").select(CUSTOMER_METRICS_COLUMNS).in("customer_id", ids)
      : { data: [], error: null };
    if (metricsError) console.error("[getCustomersList] Metrics error:", metricsError.message);
    const metricsMap = new Map<string, CustomerMetricsRow>();
    for (const metric of metricsData ?? []) {
      if (metric.customer_id) {
        metricsMap.set(metric.customer_id, {
          services_count: metric.services_count ?? 0,
          quotations_count: metric.quotations_count ?? 0,
          approved_quotations_count: metric.approved_quotations_count ?? 0,
          draft_quotations_count: metric.draft_quotations_count ?? 0,
          total_quoted_amount: metric.total_quoted_amount ?? 0,
        });
      }
    }
    return {
      customers: rows.map((row) => mapRowToCustomer(row, metricsMap.get(row.id))),
      pagination: { page, pageSize, total, totalPages },
    };
  } catch (err) {
    console.error("[getCustomersList] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return emptyCustomersResult(pageSize);
  }
}

export async function getCustomerCities(): Promise<string[]> {
  await requirePermission("customers:read");
  const { data, error } = await createAdminClient()
    .from("customers")
    .select("city")
    .eq("is_deleted", false)
    .not("city", "is", null)
    .limit(5000);
  if (error) {
    console.error("[getCustomerCities] Supabase error:", error.message);
    return [];
  }
  return [...new Set((data ?? []).map((row) => String(row.city)).filter(Boolean))].sort();
}

/**
 * Fetches a single customer by ID.
 * Returns null if not found, deleted, or on error.
 */
export async function getCustomerById(id: string): Promise<Customer | null> {
  await requirePermission("customers:read");

  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("customers")
      .select("*")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (error) {
      console.error("[getCustomerById] Supabase error:", error.message);
      return null;
    }

    const { data: metricsData, error: metricsError } = await supabase
      .from("customer_report_metrics")
      .select("*")
      .eq("customer_id", id)
      .single();

    if (metricsError && metricsError.code !== "PGRST116") {
      console.error("[getCustomerById] Error fetching metrics:", metricsError.message);
    }

    const metrics: CustomerMetricsRow | undefined = metricsData
      ? {
          services_count: metricsData.services_count ?? 0,
          quotations_count: metricsData.quotations_count ?? 0,
          approved_quotations_count: metricsData.approved_quotations_count ?? 0,
          draft_quotations_count: metricsData.draft_quotations_count ?? 0,
          total_quoted_amount: metricsData.total_quoted_amount ?? 0,
        }
      : undefined;

    return mapRowToCustomer(data as CustomerRow, metrics);
  } catch (err) {
    console.error("[getCustomerById] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return null;
  }
}
