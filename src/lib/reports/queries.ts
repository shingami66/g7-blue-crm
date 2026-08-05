import "server-only";

import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { ServiceStatus } from "@/types/service";
import { calculateSalesBilling, calculateServiceOperations } from "./calculations";
import type { ReportCustomer, ReportFilters, ReportInvoice, ReportPayment, ReportQuotation, ReportService, ReportsCenterData, ReportsSection } from "./types";

function numberValue(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function emptyServiceCounts(): Record<ServiceStatus, number> {
  return { Inquiry: 0, Quoted: 0, Approved: 0, "Deposit Paid": 0, "In Progress": 0, Completed: 0, Cancelled: 0 };
}

async function readSection<T>(permission: string, load: () => Promise<T>): Promise<ReportsSection<T>> {
  if (!(await checkPermission(permission))) return { status: "forbidden", data: await Promise.resolve(loadEmpty<T>()) };
  try {
    return { status: "ready", data: await load() };
  } catch (error) {
    console.error(`[ReportsCenter] Failed to load ${permission}:`, error instanceof Error ? error.message : "Unknown");
    return { status: "error", data: await Promise.resolve(loadEmpty<T>()) };
  }
}

function loadEmpty<T>(): T {
  return {} as T;
}

function dateFilter<T extends { gte: (column: string, value: string) => T; lte: (column: string, value: string) => T }>(query: T, filters: ReportFilters) {
  let filtered = query;
  if (filters.from) filtered = filtered.gte("created_at", `${filters.from}T00:00:00.000Z`);
  if (filters.to) filtered = filtered.lte("created_at", `${filters.to}T23:59:59.999Z`);
  return filtered;
}

async function readQuotations(filters: ReportFilters): Promise<ReportQuotation[]> {
  let query = createAdminClient().from("quotations").select("id, quotation_number, customer_id, event, grand_total, status, created_at").eq("is_deleted", false);
  query = dateFilter(query, filters);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), quotationNumber: String(row.quotation_number), customerId: String(row.customer_id), event: String(row.event), grandTotal: numberValue(row.grand_total), status: row.status as ReportQuotation["status"], createdAt: String(row.created_at) }));
}

async function readInvoices(filters: ReportFilters): Promise<ReportInvoice[]> {
  let query = createAdminClient().from("invoices").select("id, invoice_number, customer_id, invoice_type, status, grand_total, amount_paid, balance_due, created_at").eq("is_deleted", false);
  query = dateFilter(query, filters);
  const { data, error } = await query.order("created_at", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), invoiceNumber: String(row.invoice_number), customerId: String(row.customer_id), invoiceType: row.invoice_type as ReportInvoice["invoiceType"], status: row.status as ReportInvoice["status"], grandTotal: numberValue(row.grand_total), amountPaid: numberValue(row.amount_paid), balanceDue: numberValue(row.balance_due), createdAt: String(row.created_at) }));
}

async function readServices(filters: ReportFilters): Promise<ReportService[]> {
  let query = createAdminClient().from("services").select("id, service_number, service_title, customer_id, event_start_date, status, created_at").is("deleted_at", null);
  query = dateFilter(query, filters);
  const { data, error } = await query.order("event_start_date", { ascending: true, nullsFirst: false }).order("service_number", { ascending: true }).limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), serviceNumber: String(row.service_number), serviceTitle: String(row.service_title), customerId: String(row.customer_id), eventStartDate: (row.event_start_date as string | null) ?? null, status: row.status as ReportService["status"] }));
}

async function readCustomers(filters: ReportFilters): Promise<ReportCustomer[]> {
  let query = createAdminClient().from("customers").select("id, customer_number, company, status, created_at").eq("is_deleted", false);
  query = dateFilter(query, filters);
  const { data, error } = await query.order("customer_number", { ascending: true }).limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), customerNumber: String(row.customer_number), company: String(row.company), status: String(row.status) }));
}

async function readPayments(filters: ReportFilters): Promise<ReportPayment[]> {
  let query = createAdminClient().from("payments").select("id, payment_number, customer_id, amount, status, date, created_at").eq("is_deleted", false);
  query = dateFilter(query, filters);
  const { data, error } = await query.order("date", { ascending: false }).limit(500);
  if (error) throw error;
  return (data ?? []).map((row) => ({ id: String(row.id), paymentNumber: String(row.payment_number), customerId: String(row.customer_id), amount: numberValue(row.amount), status: row.status as ReportPayment["status"], date: String(row.date) }));
}

async function readSupplierOperations(filters: ReportFilters, canReadCost: boolean) {
  const supabase = createAdminClient();
  let allocationQuery = supabase.from("service_supplier_allocations").select("service_id, estimated_total_cost, status, created_at").eq("is_deleted", false).neq("status", "cancelled");
  let bookingQuery = supabase.from("supplier_bookings").select("service_id, status, estimated_total_cost, created_at").eq("is_deleted", false).neq("status", "cancelled");
  allocationQuery = dateFilter(allocationQuery, filters);
  bookingQuery = dateFilter(bookingQuery, filters);
  const [{ data: allocations, error: allocationError }, { data: bookings, error: bookingError }] = await Promise.all([allocationQuery, bookingQuery]);
  if (allocationError) throw allocationError;
  if (bookingError) throw bookingError;
  const activeAllocations = allocations ?? [];
  const activeBookings = bookings ?? [];
  const pendingServiceIds = Array.from(new Set(activeAllocations.map((row) => String(row.service_id)))).sort();
  return {
    activeAllocations: activeAllocations.length,
    activeBookings: activeBookings.length,
    pendingServiceIds,
    internalEstimatedCost: canReadCost ? [...activeAllocations, ...activeBookings].reduce((total, row) => total + numberValue(row.estimated_total_cost), 0) : null,
  };
}

export async function getReportsCenterData(filters: ReportFilters = {}): Promise<ReportsCenterData> {
  await requirePermission("dashboard:read");
  const [quotations, invoices, services, customers, payments] = await Promise.all([
    readSection("quotations:read", () => readQuotations(filters)),
    readSection("invoices:read", () => readInvoices(filters)),
    readSection("services:read", () => readServices(filters)),
    readSection("customers:read", () => readCustomers(filters)),
    readSection("payments:read", () => readPayments(filters)),
  ]);
  const quotationRows = quotations.status === "ready" ? quotations.data : [];
  const invoiceRows = invoices.status === "ready" ? invoices.data : [];
  const serviceRows = services.status === "ready" ? services.data : [];
  const customerRows = customers.status === "ready" ? customers.data : [];
  const paymentRows = payments.status === "ready" ? payments.data : [];
  const billingSummary = calculateSalesBilling(quotationRows, invoiceRows);
  const operationsSummary = calculateServiceOperations(serviceRows, new Date().toISOString().slice(0, 10), filters);
  const customerTotals = invoiceRows.reduce<Map<string, number>>((totals, invoice) => totals.set(invoice.customerId, (totals.get(invoice.customerId) ?? 0) + invoice.grandTotal), new Map());
  const customerById = new Map(customerRows.map((customer) => [customer.id, customer]));
  const toCustomerRanking = ([customerId, amount]: [string, number]) => ({ customerId, customerNumber: customerById.get(customerId)?.customerNumber ?? null, company: customerById.get(customerId)?.company ?? null, amount });
  const outstandingCustomers = Array.from(invoiceRows.reduce<Map<string, number>>((totals, invoice) => totals.set(invoice.customerId, (totals.get(invoice.customerId) ?? 0) + Math.max(invoice.balanceDue, 0)), new Map())).filter(([, amount]) => amount > 0).sort((left, right) => right[1] - left[1]).slice(0, 10).map(toCustomerRanking);
  const highestInvoicedCustomers = Array.from(customerTotals).sort((left, right) => right[1] - left[1]).slice(0, 10).map(toCustomerRanking);
  const supplierAllowed = await checkPermission("supplier_allocations:read") && await checkPermission("supplier_bookings:read");
  const supplierSection = supplierAllowed ? await readSection("supplier_allocations:read", () => readSupplierOperations(filters, false)) : { status: "forbidden" as const, data: { activeAllocations: 0, activeBookings: 0, pendingServiceIds: [], internalEstimatedCost: null } };
  if (supplierSection.status === "ready" && await checkPermission("supplier_allocations:read_cost")) supplierSection.data = await readSupplierOperations(filters, true);

  return {
    filters,
    salesBilling: { status: quotations.status === "error" || invoices.status === "error" ? "error" : quotations.status === "forbidden" && invoices.status === "forbidden" ? "forbidden" : "ready", data: { ...billingSummary, quotations: quotationRows, invoices: invoiceRows } },
    serviceOperations: { status: services.status, data: { services: serviceRows, ...operationsSummary, statusCounts: operationsSummary.statusCounts ?? emptyServiceCounts() } },
    customerOverview: { status: customers.status === "error" || payments.status === "error" ? "error" : customers.status === "forbidden" && payments.status === "forbidden" ? "forbidden" : "ready", data: { customers: customerRows, activeCustomers: customerRows.filter((customer) => customer.status === "active").length, outstandingCustomers, highestInvoicedCustomers, recentPayments: paymentRows.slice(0, 10) } },
    supplierOperations: supplierSection,
  };
}
