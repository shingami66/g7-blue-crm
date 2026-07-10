import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { APPROVED_BILLING_SCOPE_PERMISSIONS } from "@/lib/approved-billing-scopes/permissions";
import type { ApprovedBillingScopeReadResult } from "@/lib/approved-billing-scopes/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { InvoiceRow } from "./types";
import { mapRowToInvoice } from "./mappers";
import type { Invoice } from "@/types/invoice";

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

export async function getInvoices(): Promise<Invoice[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("invoices")
    .select("*")
    .eq("is_deleted", false)
    .order("invoice_number", { ascending: true });

  if (error) {
    console.error("[getInvoices] Supabase error:", error.message);
    return [];
  }

  return (data as InvoiceRow[]).map(mapRowToInvoice);
}
