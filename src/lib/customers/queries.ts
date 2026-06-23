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
      .select("*")
      .eq("is_deleted", false)
      .order("customer_number", { ascending: true });

    if (error) {
      console.error("[getCustomers] Supabase error:", error.message);
      return [];
    }

    const { data: metricsData, error: metricsError } = await supabase
      .from("customer_report_metrics")
      .select("*");

    if (metricsError) {
      console.error("[getCustomers] Error fetching metrics:", metricsError.message);
    }

    const metricsMap = new Map<string, CustomerMetricsRow>();
    if (metricsData) {
      metricsData.forEach((m: CustomerMetricsRow & { customer_id: string }) => {
        metricsMap.set(m.customer_id, m as CustomerMetricsRow);
      });
    }

    return (data as CustomerRow[]).map(row => mapRowToCustomer(row, metricsMap.get(row.id)));
  } catch (err) {
    console.error("[getCustomers] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return [];
  }
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

    return mapRowToCustomer(data as CustomerRow, metricsData as CustomerMetricsRow | undefined);
  } catch (err) {
    console.error("[getCustomerById] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return null;
  }
}
