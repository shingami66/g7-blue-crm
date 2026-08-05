import "server-only";

import { checkPermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveBusinessYearOptions, type BusinessYear } from "./business-year";

const MAX_YEAR_VALUES_PER_SOURCE = 5000;

type DateRow = Record<string, unknown>;

async function readDateValues(
  permission: string,
  table: string,
  column: string,
  filter: "active-services" | "quotations" | "invoices" | "payments",
): Promise<string[]> {
  if (!(await checkPermission(permission))) return [];
  let query = createAdminClient().from(table).select(column).limit(MAX_YEAR_VALUES_PER_SOURCE);
  if (filter === "active-services") {
    query = query.is("deleted_at", null).not(column, "is", null);
  } else if (filter === "quotations") {
    query = query.eq("is_deleted", false).not("date", "is", null);
  } else if (filter === "invoices") {
    query = query.eq("is_deleted", false).not("issued_at", "is", null);
  } else {
    query = query.eq("is_deleted", false).not("date", "is", null);
  }
  const { data, error } = await query;
  if (error) {
    console.error(`[business-year] Failed to read ${table}.${column}:`, error.message);
    return [];
  }
  return ((data as unknown as DateRow[] | null) ?? [])
    .map((row) => row[column])
    .filter((value): value is string => typeof value === "string");
}

export async function getBusinessYearOptions(): Promise<BusinessYear[]> {
  const [serviceStarts, serviceEnds, quotations, invoices, payments] = await Promise.all([
    readDateValues("services:read", "services", "event_start_date", "active-services"),
    readDateValues("services:read", "services", "event_end_date", "active-services"),
    readDateValues("quotations:read", "quotations", "date", "quotations"),
    readDateValues("invoices:read", "invoices", "issued_at", "invoices"),
    readDateValues("payments:read", "payments", "date", "payments"),
  ]);
  return deriveBusinessYearOptions([
    ...serviceStarts,
    ...serviceEnds,
    ...quotations,
    ...invoices,
    ...payments,
  ]);
}
