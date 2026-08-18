import "server-only";

import { checkPermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { deriveBusinessYearOptions, type BusinessYear } from "./business-year";

const MAX_YEAR_VALUES_PER_SOURCE = 5000;

async function readServicesStartDates(permission: string): Promise<string[]> {
  if (!(await checkPermission(permission))) return [];
  const client = createAdminClient();
  const { data, error } = await client
    .from("services")
    .select("event_start_date")
    .is("deleted_at", null)
    .not("event_start_date", "is", null)
    .limit(MAX_YEAR_VALUES_PER_SOURCE);
  if (error) {
    console.error("[business-year] Failed to read services.event_start_date:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => row.event_start_date)
    .filter((value): value is string => typeof value === "string");
}

async function readServicesEndDates(permission: string): Promise<string[]> {
  if (!(await checkPermission(permission))) return [];
  const client = createAdminClient();
  const { data, error } = await client
    .from("services")
    .select("event_end_date")
    .is("deleted_at", null)
    .not("event_end_date", "is", null)
    .limit(MAX_YEAR_VALUES_PER_SOURCE);
  if (error) {
    console.error("[business-year] Failed to read services.event_end_date:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => row.event_end_date)
    .filter((value): value is string => typeof value === "string");
}

async function readQuotationsDates(permission: string): Promise<string[]> {
  if (!(await checkPermission(permission))) return [];
  const client = createAdminClient();
  const { data, error } = await client
    .from("quotations")
    .select("date")
    .eq("is_deleted", false)
    .not("date", "is", null)
    .limit(MAX_YEAR_VALUES_PER_SOURCE);
  if (error) {
    console.error("[business-year] Failed to read quotations.date:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => row.date)
    .filter((value): value is string => typeof value === "string");
}

async function readInvoicesDates(permission: string): Promise<string[]> {
  if (!(await checkPermission(permission))) return [];
  const client = createAdminClient();
  const { data, error } = await client
    .from("invoices")
    .select("issued_at")
    .eq("is_deleted", false)
    .not("issued_at", "is", null)
    .limit(MAX_YEAR_VALUES_PER_SOURCE);
  if (error) {
    console.error("[business-year] Failed to read invoices.issued_at:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => row.issued_at)
    .filter((value): value is string => typeof value === "string");
}

async function readPaymentsDates(permission: string): Promise<string[]> {
  if (!(await checkPermission(permission))) return [];
  const client = createAdminClient();
  const { data, error } = await client
    .from("payments")
    .select("date")
    .eq("is_deleted", false)
    .not("date", "is", null)
    .limit(MAX_YEAR_VALUES_PER_SOURCE);
  if (error) {
    console.error("[business-year] Failed to read payments.date:", error.message);
    return [];
  }
  return (data ?? [])
    .map((row) => row.date)
    .filter((value): value is string => typeof value === "string");
}

export async function getBusinessYearOptions(): Promise<BusinessYear[]> {
  const [serviceStarts, serviceEnds, quotations, invoices, payments] = await Promise.all([
    readServicesStartDates("services:read"),
    readServicesEndDates("services:read"),
    readQuotationsDates("quotations:read"),
    readInvoicesDates("invoices:read"),
    readPaymentsDates("payments:read"),
  ]);
  return deriveBusinessYearOptions([
    ...serviceStarts,
    ...serviceEnds,
    ...quotations,
    ...invoices,
    ...payments,
  ]);
}
