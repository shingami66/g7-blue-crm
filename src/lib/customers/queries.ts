/**
 * Server-only queries for the customers table.
 *
 * These functions use the Supabase admin client (service role key) and must
 * NEVER be imported in Client Components.
 */
import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { mapRowToCustomer } from "./mappers";
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

    return (data as CustomerRow[]).map(mapRowToCustomer);
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

    return mapRowToCustomer(data as CustomerRow);
  } catch (err) {
    console.error("[getCustomerById] Unexpected error:", err instanceof Error ? err.message : "Unknown");
    return null;
  }
}
