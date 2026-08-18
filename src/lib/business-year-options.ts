import "server-only";

import { checkPermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveBusinessYearOptions, type BusinessYear } from "./business-year";

const MAX_YEAR_VALUES_PER_SOURCE = 5000;

type DateRow = Record<string, unknown>;

type YearTableSource = "services" | "quotations" | "invoices" | "payments";

async function readDateValues(
  permission: string,
  table: YearTableSource,
  column: string,
  filter: "active-services" | "quotations" | "invoices" | "payments",
): Promise<string[]> {
  if (!(await checkPermission(permission))) return [];
  const client = createAdminClient();
  let query = client.from(table).select(column as never).limit(MAX_YEAR_VALUES_PER_SOURCE);
  if (filter === "active-services") {
    query = query.is("deleted_at" as never, null).not(column as never, "is", null);
  } else if (filter === "quotations") {
    query = query.eq("is_deleted" as never, false).not("date" as never, "is", null);
  } else if (filter === "invoices") {
    query = query.eq("is_deleted" as never, false).not("issued_at" as never, "is", null);
  } else {
    query = query.eq("is_deleted" as never, false).not("date" as never, "is", null);
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
