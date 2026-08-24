import "server-only";

import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { mapRowToCustomer, type CustomerMetricsRow } from "@/lib/customers/mappers";
import type { CustomerRow } from "@/lib/customers/types";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Customer360Activity, Customer360FinancialSummary, Customer360Invoice, Customer360Payment, Customer360ProfileResult, Customer360Quotation, Customer360Result, Customer360SecondaryResult, Customer360Section, Customer360SectionStatus, Customer360Service } from "./types";
import { isLiveCustomerInvoice } from "./summary";

function numberValue(value: unknown): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeCustomerDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  if (!normalized || /^(?:9999|0000)[-/]/.test(normalized)) return null;
  return normalized;
}

function section<T>(status: Customer360Section<T>["status"], items: T[] = []): Customer360Section<T> {
  return { status, items };
}

async function readPermissionSection<T>(
  permission: string,
  load: () => Promise<T[]>,
): Promise<Customer360Section<T>> {
  const result = await readPermissionValue(permission, load);
  return section(result.status, result.value ?? []);
}

async function readPermissionValue<T>(
  permission: string,
  load: () => Promise<T>,
): Promise<{ status: Customer360SectionStatus; value: T | null }> {
  if (!(await checkPermission(permission))) return { status: "forbidden", value: null };

  try {
    return { status: "ready", value: await load() };
  } catch (error) {
    console.error(`[Customer360] Failed to load ${permission}:`, error instanceof Error ? error.message : "Unknown");
    return { status: "error", value: null };
  }
}

async function readCustomer(id: string) {
  const supabase = createAdminClient();
  const customerRead = supabase
    .from("customers")
    .select("*")
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle();
  const metricsRead = supabase
    .from("customer_report_metrics")
    .select("services_count, quotations_count, approved_quotations_count, draft_quotations_count, total_quoted_amount")
    .eq("customer_id", id)
    .maybeSingle();
  const [{ data, error }, { data: metricsData, error: metricsError }] = await Promise.all([
    customerRead,
    metricsRead,
  ]);

  if (error) {
    console.error("[Customer360] Customer lookup failed:", error.message);
    return { status: "error" as const };
  }
  if (!data) return { status: "not_found" as const };

  if (metricsError && metricsError.code !== "PGRST116") {
    console.error("[Customer360] Customer metrics unavailable:", metricsError.message);
  }

  return {
    status: "ready" as const,
    customer: mapRowToCustomer(data as CustomerRow, metricsData as CustomerMetricsRow | undefined),
  };
}

async function readServices(customerId: string): Promise<Customer360Service[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("services")
    .select("id, service_number, service_title, event_start_date, status, created_at")
    .eq("customer_id", customerId)
    .is("deleted_at", null)
    .order("event_start_date", { ascending: true, nullsFirst: false })
    .order("service_number", { ascending: true });
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    serviceNumber: String(row.service_number),
    serviceTitle: String(row.service_title),
    eventStartDate: safeCustomerDate(row.event_start_date),
    createdAt: safeCustomerDate(row.created_at) ?? "",
    status: row.status as Customer360Service["status"],
  }));
}

async function readQuotations(customerId: string): Promise<Customer360Quotation[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("quotations")
    .select("id, quotation_number, service_id, event, date, grand_total, status, services(service_number,service_title)")
    .eq("customer_id", customerId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map((row) => {
    const service = Array.isArray(row.services) ? row.services[0] : row.services;
    return {
      id: String(row.id),
      quotationNumber: String(row.quotation_number),
      serviceId: String(row.service_id),
      serviceNumber: service?.service_number ? String(service.service_number) : null,
      serviceTitle: service?.service_title ? String(service.service_title) : null,
      event: String(row.event),
      date: safeCustomerDate(row.date) ?? "",
      grandTotal: numberValue(row.grand_total),
      status: row.status as Customer360Quotation["status"],
    };
  });
}

export const CUSTOMER_360_PAGE_SIZE = 500;
const CUSTOMER_360_INVOICE_PREVIEW_LIMIT = 10;
const CUSTOMER_360_FINANCIAL_ACTIVITY_LIMIT = 8;
const CUSTOMER_360_INVOICE_PREVIEW_COLUMNS = "id, invoice_number, service_id, invoice_type, status, grand_total, amount_paid, balance_due, issued_at, created_at, services(service_number,service_title)";
const CUSTOMER_360_INVOICE_FINANCIAL_FACT_COLUMNS = "id, invoice_number, invoice_type, status, grand_total, amount_paid, balance_due, issued_at, created_at";

export async function fetchAllCustomer360Pages<T>(
  buildQuery: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }> },
  pageSize = CUSTOMER_360_PAGE_SIZE,
): Promise<T[]> {
  const allRows: T[] = [];
  let from = 0;
  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await buildQuery().range(from, to);
    if (error) throw error;
    const rows = (data ?? []) as T[];
    if (rows.length === 0) {
      break;
    }
    allRows.push(...rows);
    from += rows.length;
  }
  return allRows;
}

function mapInvoiceRow(row: Record<string, unknown>): Customer360Invoice {
  const service = Array.isArray(row.services) ? row.services[0] : row.services;
  const issuedAt = safeCustomerDate(row.issued_at);
  return {
    id: String(row.id),
    invoiceNumber: String(row.invoice_number),
    serviceId: row.service_id ? String(row.service_id) : null,
    serviceNumber: service?.service_number ? String(service.service_number) : null,
    serviceTitle: service?.service_title ? String(service.service_title) : null,
    invoiceType: row.invoice_type as Customer360Invoice["invoiceType"],
    status: row.status as Customer360Invoice["status"],
    grandTotal: numberValue(row.grand_total),
    amountPaid: numberValue(row.amount_paid),
    balanceDue: numberValue(row.balance_due),
    date: issuedAt ?? safeCustomerDate(row.created_at) ?? "",
    issuedAt,
  };
}

function toInvoiceFinancialActivity(invoice: Customer360Invoice): Customer360Activity {
  return {
    id: `invoice-${invoice.id}`,
    date: invoice.date,
    kind: "financial",
    eventType: "invoice",
    identifier: invoice.invoiceNumber,
    subject: invoice.invoiceType,
    status: invoice.status,
    amount: invoice.grandTotal,
    href: `/invoices/${invoice.id}`,
  };
}

function compareRecentFinancialActivity(left: Customer360Activity, right: Customer360Activity): number {
  return right.date.localeCompare(left.date) || left.id.localeCompare(right.id);
}

function retainRecentFinancialActivity(
  activities: Customer360Activity[],
  activity: Customer360Activity,
): void {
  activities.push(activity);
  activities.sort(compareRecentFinancialActivity);
  activities.length = Math.min(activities.length, CUSTOMER_360_FINANCIAL_ACTIVITY_LIMIT);
}

function addInvoiceToFinancialSummary(
  summary: Customer360FinancialSummary,
  invoice: Customer360Invoice,
): Customer360FinancialSummary {
  if (!isLiveCustomerInvoice(invoice)) return summary;

  return {
    totalInvoiced: (summary.totalInvoiced ?? 0) + invoice.grandTotal,
    totalCollected: (summary.totalCollected ?? 0) + invoice.amountPaid,
    outstandingBalance: (summary.outstandingBalance ?? 0) + Math.max(invoice.balanceDue, 0),
  };
}

function unavailableFinancialSummary(): Customer360FinancialSummary {
  return {
    totalInvoiced: null,
    totalCollected: null,
    outstandingBalance: null,
  };
}

type Customer360InvoiceReadModel = {
  preview: Customer360Invoice[];
  summary: Customer360FinancialSummary;
  invoiceActivities: Customer360Activity[];
};

async function readInvoices(customerId: string): Promise<Customer360InvoiceReadModel> {
  const preview: Customer360Invoice[] = [];
  const invoiceActivities: Customer360Activity[] = [];
  let summary: Customer360FinancialSummary = {
    totalInvoiced: 0,
    totalCollected: 0,
    outstandingBalance: 0,
  };
  let from = 0;

  while (true) {
    const includesPreviewFields = preview.length < CUSTOMER_360_INVOICE_PREVIEW_LIMIT;
    const { data, error } = await createAdminClient()
      .from("invoices")
      .select(
        includesPreviewFields
          ? CUSTOMER_360_INVOICE_PREVIEW_COLUMNS
          : CUSTOMER_360_INVOICE_FINANCIAL_FACT_COLUMNS,
      )
      .eq("customer_id", customerId)
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(from, from + CUSTOMER_360_PAGE_SIZE - 1);
    if (error) throw error;

    const rows = (data ?? []) as unknown as Record<string, unknown>[];
    if (rows.length === 0) break;

    for (const row of rows) {
      const invoice = mapInvoiceRow(row);
      if (preview.length < CUSTOMER_360_INVOICE_PREVIEW_LIMIT) preview.push(invoice);
      summary = addInvoiceToFinancialSummary(summary, invoice);
      if (isLiveCustomerInvoice(invoice)) {
        retainRecentFinancialActivity(invoiceActivities, toInvoiceFinancialActivity(invoice));
      }
    }

    from += rows.length;
  }

  return { preview, summary, invoiceActivities };
}

async function readPayments(customerId: string): Promise<Customer360Payment[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("payments")
    .select("id, payment_number, invoice_id, date, amount, method, reference, status")
    .eq("customer_id", customerId)
    .eq("is_deleted", false)
    .order("date", { ascending: false })
    .order("payment_number", { ascending: false })
    .limit(50);
  if (error) throw error;

  return (data ?? []).map((row) => ({
    id: String(row.id),
    paymentNumber: String(row.payment_number),
    invoiceId: String(row.invoice_id),
    date: safeCustomerDate(row.date) ?? "",
    amount: numberValue(row.amount),
    method: row.method as Customer360Payment["method"],
    reference: (row.reference as string | null) ?? null,
    status: row.status as Customer360Payment["status"],
  }));
}

function buildOperationalActivity(services: Customer360Service[]): Customer360Activity[] {
  return services
    .filter((service) => service.createdAt.length > 0)
    .map((service) => ({
      id: service.id,
      date: service.createdAt,
      kind: "operational" as const,
      eventType: "service" as const,
      identifier: service.serviceNumber,
      subject: service.serviceTitle,
      status: service.status,
      amount: null,
      href: `/services/${service.id}`,
    }))
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 6);
}

function buildFinancialActivity(invoiceActivities: Customer360Activity[], payments: Customer360Payment[]): Customer360Activity[] {
  const paymentActivity = payments.map((payment) => ({
    id: `payment-${payment.id}`,
    date: payment.date,
    kind: "financial" as const,
    eventType: "payment" as const,
    identifier: payment.paymentNumber,
    subject: payment.reference ?? payment.method,
    status: payment.status,
    amount: payment.amount,
    href: `/invoices/${payment.invoiceId}`,
  }));

  return [...invoiceActivities, ...paymentActivity]
    .sort(compareRecentFinancialActivity)
    .slice(0, 8);
}

export async function getCustomerProfile(id: string): Promise<Customer360ProfileResult> {
  await requirePermission("customers:read");
  const customerResult = await readCustomer(id);
  if (customerResult.status === "error") return { status: "error", error: "customer_load_failed" };
  if (customerResult.status === "not_found") return customerResult;

  return { status: "ready", customer: customerResult.customer };
}

async function loadCustomer360Secondary(id: string): Promise<Customer360SecondaryResult["data"]> {

  const [services, quotations, invoiceReadModel, payments] = await Promise.all([
    readPermissionSection("services:read", () => readServices(id)),
    readPermissionSection("quotations:read", () => readQuotations(id)),
    readPermissionValue("invoices:read", () => readInvoices(id)),
    readPermissionSection("payments:read", () => readPayments(id)),
  ]);
  const invoices = section(invoiceReadModel.status, invoiceReadModel.value?.preview ?? []);
  const invoiceFinancialRead = invoiceReadModel.value;
  const serviceItems = services.items;
  const today = new Date().toISOString().slice(0, 10);

  return {
    services,
    quotations,
    invoices,
    payments,
    summary: invoiceFinancialRead?.summary ?? unavailableFinancialSummary(),
    upcomingServices: serviceItems.filter((service) => service.eventStartDate !== null && service.eventStartDate >= today).slice(0, 6),
    recentOperationalActivity: buildOperationalActivity(serviceItems),
    recentFinancialActivity: buildFinancialActivity(invoiceFinancialRead?.invoiceActivities ?? [], payments.items),
  };
}

export async function getCustomer360Secondary(id: string): Promise<Customer360SecondaryResult> {
  await requirePermission("customers:read");
  return { status: "ready", data: await loadCustomer360Secondary(id) };
}

export async function getCustomer360(id: string): Promise<Customer360Result> {
  const profile = await getCustomerProfile(id);
  if (profile.status !== "ready") return profile;

  return {
    status: "ready",
    data: {
      customer: profile.customer,
      ...(await loadCustomer360Secondary(id)),
    },
  };
}
