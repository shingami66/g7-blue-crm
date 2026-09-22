import "server-only";

import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getBusinessYearBounds, getServiceBusinessYearFilter } from "@/lib/business-year";
import { getCurrentRiyadhDate } from "./filters";
import type { ServiceStatus } from "@/types/service";
import { calculateCustomerOverview, calculateSalesBilling, calculateServiceOperations } from "./calculations";
import type {
  ReportAccountsReceivable,
  ReportCustomer,
  ReportCustomerRanking,
  ReportFilters,
  ReportInvoice,
  ReportPayment,
  ReportQuotation,
  ReportService,
  ReportsCenterData,
  ReportsSection,
  ReportsSectionStatus,
} from "./types";

export const RIYADH_TIME_ZONE = "Asia/Riyadh";
export const RIYADH_OFFSET = "+03:00";

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

export const REPORT_PAGE_SIZE = 500;
export const ACCOUNTS_RECEIVABLE_PAGE_SIZE = 50;

export function getNextCalendarDay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + 1));
  const nextYear = nextDate.getUTCFullYear();
  const nextMonth = String(nextDate.getUTCMonth() + 1).padStart(2, "0");
  const nextDay = String(nextDate.getUTCDate()).padStart(2, "0");
  return `${nextYear}-${nextMonth}-${nextDay}`;
}

export function formatRiyadhTimestampBoundary(dateStr: string, boundary: "start" | "end"): string {
  return boundary === "start" ? `${dateStr}T00:00:00${RIYADH_OFFSET}` : `${dateStr}T23:59:59.999${RIYADH_OFFSET}`;
}

export function dateFilter<
  T extends {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
    lt: (column: string, value: string) => T;
  },
>(query: T, filters: ReportFilters, column = "created_at", includeYear = true) {
  let filtered = query;
  const isDateColumn = column === "date" || column === "event_start_date";
  if (includeYear && filters.year) {
    const bounds = getBusinessYearBounds(filters.year);
    filtered = filtered
      .gte(column, isDateColumn ? bounds.start : formatRiyadhTimestampBoundary(bounds.start, "start"))
      .lt(column, isDateColumn ? bounds.end : formatRiyadhTimestampBoundary(bounds.end, "start"));
  }
  if (filters.from) {
    filtered = filtered.gte(
      column,
      isDateColumn ? filters.from : formatRiyadhTimestampBoundary(filters.from, "start"),
    );
  }
  if (filters.to) {
    if (isDateColumn) {
      filtered = filtered.lte(column, filters.to);
    } else {
      const nextDay = getNextCalendarDay(filters.to);
      filtered = filtered.lt(column, formatRiyadhTimestampBoundary(nextDay, "start"));
    }
  }
  return filtered;
}

export function serviceDateFilter<
  T extends {
    gte: (column: string, value: string) => T;
    lte: (column: string, value: string) => T;
    or: (filters: string) => T;
  },
>(query: T, filters: ReportFilters) {
  let filtered = query;
  if (filters.year) filtered = filtered.or(getServiceBusinessYearFilter(filters.year));
  if (filters.from) filtered = filtered.gte("event_start_date", filters.from);
  if (filters.to) filtered = filtered.lte("event_start_date", filters.to);
  return filtered;
}

export function applyLiveInvoiceFilter<
  T extends {
    eq: (column: string, value: string | boolean) => T;
    not: (column: string, operator: string, value: string | null) => T;
  },
>(query: T): T {
  return query
    .eq("is_deleted", false)
    .not("issued_at", "is", null)
    .not("status", "in", '("draft","cancelled","voided")');
}

export async function fetchAllPages<T>(
  buildQuery: () => { range: (from: number, to: number) => PromiseLike<{ data: unknown; error: unknown }> },
  pageSize = REPORT_PAGE_SIZE,
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

export async function readQuotations(filters: ReportFilters): Promise<ReportQuotation[]> {
  const data = await fetchAllPages<Record<string, unknown>>(() => {
    let query = createAdminClient()
      .from("quotations")
      .select("id, quotation_number, customer_id, event, grand_total, status, created_at, date")
      .eq("is_deleted", false);
    query = dateFilter(query, filters, "date");
    return query.order("created_at", { ascending: false }).order("id", { ascending: false });
  });

  return data.map((row) => ({
    id: String(row.id),
    quotationNumber: String(row.quotation_number),
    customerId: String(row.customer_id),
    event: String(row.event),
    grandTotal: numberValue(row.grand_total),
    status: row.status as ReportQuotation["status"],
    createdAt: String(row.created_at),
  }));
}

export async function readInvoices(filters: ReportFilters): Promise<ReportInvoice[]> {
  const data = await fetchAllPages<Record<string, unknown>>(() => {
    let query = createAdminClient()
      .from("invoices")
      .select("id, invoice_number, customer_id, invoice_type, status, grand_total, amount_paid, balance_due, issued_at");
    query = applyLiveInvoiceFilter(query);
    query = dateFilter(query, filters, "issued_at");
    return query.order("issued_at", { ascending: false }).order("id", { ascending: false });
  });

  return data.map((row) => {
    if (!row.issued_at) {
      throw new Error(`[ReportsCenter] Invariant violation: invoice ${row.id} has no issued_at timestamp`);
    }
    return {
      id: String(row.id),
      invoiceNumber: String(row.invoice_number),
      customerId: String(row.customer_id),
      invoiceType: row.invoice_type as ReportInvoice["invoiceType"],
      status: row.status as ReportInvoice["status"],
      grandTotal: numberValue(row.grand_total),
      amountPaid: numberValue(row.amount_paid),
      balanceDue: numberValue(row.balance_due),
      issuedAt: String(row.issued_at),
      createdAt: String(row.issued_at),
    };
  });
}

export async function readServices(filters: ReportFilters): Promise<ReportService[]> {
  const data = await fetchAllPages<Record<string, unknown>>(() => {
    let query = createAdminClient()
      .from("services")
      .select("id, service_number, service_title, customer_id, event_start_date, event_end_date, status, created_at")
      .is("deleted_at", null);
    query = serviceDateFilter(query, filters);
    return query
      .order("event_start_date", { ascending: true, nullsFirst: false })
      .order("service_number", { ascending: true })
      .order("id", { ascending: true });
  });

  return data.map((row) => ({
    id: String(row.id),
    serviceNumber: String(row.service_number),
    serviceTitle: String(row.service_title),
    customerId: String(row.customer_id),
    eventStartDate: (row.event_start_date as string | null) ?? null,
    status: row.status as ReportService["status"],
  }));
}

export async function readCustomers(_filters: ReportFilters = {}): Promise<ReportCustomer[]> {
  void _filters;
  const data = await fetchAllPages<Record<string, unknown>>(() => {
    return createAdminClient()
      .from("customers")
      .select("id, customer_number, company, status")
      .eq("is_deleted", false)
      .order("customer_number", { ascending: true })
      .order("id", { ascending: true });
  });

  return data.map((row) => ({
    id: String(row.id),
    customerNumber: String(row.customer_number),
    company: String(row.company),
    status: String(row.status),
  }));
}

export async function readPayments(filters: ReportFilters): Promise<ReportPayment[]> {
  const data = await fetchAllPages<Record<string, unknown>>(() => {
    let query = createAdminClient()
      .from("payments")
      .select("id, payment_number, customer_id, amount, status, date, created_at")
      .eq("is_deleted", false);
    query = dateFilter(query, filters, "date");
    return query.order("date", { ascending: false }).order("id", { ascending: false });
  });

  return data.map((row) => ({
    id: String(row.id),
    paymentNumber: String(row.payment_number),
    customerId: String(row.customer_id),
    amount: numberValue(row.amount),
    status: row.status as ReportPayment["status"],
    date: String(row.date),
  }));
}

function optionalText(value: unknown): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function receivableBucket(value: unknown): ReportAccountsReceivable["rows"][number]["ageingBucket"] {
  return value === "1_30" || value === "31_60" || value === "61_90" || value === "91_plus" ? value : "not_due";
}

export async function readAccountsReceivable(filters: ReportFilters): Promise<ReportAccountsReceivable> {
  const asOf = filters.asOf ?? getCurrentRiyadhDate();
  const yearBounds = filters.year ? getBusinessYearBounds(filters.year) : null;
  const periodFrom = filters.from ?? yearBounds?.start ?? null;
  const periodTo = filters.to ?? yearBounds?.end ?? null;
  const canReadCustomerIdentity = await checkPermission("customers:read");
  const canReadServiceIdentity = await checkPermission("services:read");
  const admin = createAdminClient() as unknown as {
    rpc: (
      name: string,
      args: Record<string, unknown>,
    ) => PromiseLike<{ data: unknown; error: { message?: string } | null }>;
  };
  const { data, error } = await admin.rpc("get_accounts_receivable_report", {
    p_as_of_date: asOf,
    p_from_date: periodFrom,
    p_to_date: periodTo,
    p_page_size: ACCOUNTS_RECEIVABLE_PAGE_SIZE,
    p_page_offset: 0,
  });
  if (error) throw new Error(error.message ?? "Accounts receivable report failed");
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object") throw new Error("Accounts receivable report returned no row");
  const row = result as Record<string, unknown>;
  if (typeof row.as_of_date !== "string") throw new Error("Accounts receivable report returned no as-of date");
  const rawDetails = Array.isArray(row.detail_rows) ? row.detail_rows : [];
  const rows = rawDetails.filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object")).map((detail) => ({
    invoiceId: String(detail.invoice_id),
    invoiceNumber: String(detail.invoice_number),
    customerId: String(detail.customer_id),
    customerNumber: canReadCustomerIdentity ? optionalText(detail.customer_number) : null,
    customerName: canReadCustomerIdentity ? optionalText(detail.customer_name) : null,
    serviceId: optionalText(detail.service_id),
    serviceNumber: canReadServiceIdentity ? optionalText(detail.service_number) : null,
    serviceTitle: canReadServiceIdentity ? optionalText(detail.service_title) : null,
    issueDate: String(detail.issue_date),
    dueDate: String(detail.due_date),
    grossAmount: numberValue(detail.gross_amount),
    creditAdjustmentAmount: numberValue(detail.credit_adjustment_amount),
    creditApplicationAmount: numberValue(detail.credit_application_amount),
    netReceivableAmount: numberValue(detail.net_receivable_amount),
    settledAmount: numberValue(detail.settled_amount),
    outstandingAmount: numberValue(detail.outstanding_amount),
    daysPastDue: numberValue(detail.days_past_due),
    ageingBucket: receivableBucket(detail.ageing_bucket),
  }));
  const rawCustomers = Array.isArray(row.outstanding_customer_rows) ? row.outstanding_customer_rows : [];
  const outstandingCustomers = canReadCustomerIdentity
    ? rawCustomers
        .filter((value): value is Record<string, unknown> => Boolean(value && typeof value === "object"))
        .map((customer) => ({
          customerId: String(customer.customer_id),
          customerNumber: optionalText(customer.customer_number),
          company: optionalText(customer.customer_name),
          amount: numberValue(customer.amount),
        } satisfies ReportCustomerRanking))
    : [];
  return {
    asOfDate: row.as_of_date,
    periodFrom: optionalText(row.period_from),
    periodTo: optionalText(row.period_to),
    billedAmount: numberValue(row.billed_amount),
    collectedCashAmount: numberValue(row.collected_cash_amount),
    totalOutstanding: numberValue(row.total_outstanding),
    totalOverdue: numberValue(row.total_overdue),
    notDueAmount: numberValue(row.not_due_amount),
    ageing1To30Amount: numberValue(row.ageing_1_30_amount),
    ageing31To60Amount: numberValue(row.ageing_31_60_amount),
    ageing61To90Amount: numberValue(row.ageing_61_90_amount),
    ageing91PlusAmount: numberValue(row.ageing_91_plus_amount),
    detailTotalCount: numberValue(row.detail_total_count),
    rows,
    outstandingCustomerCount: canReadCustomerIdentity ? numberValue(row.outstanding_customer_count) : null,
    outstandingCustomers,
  };
}

export async function readSupplierOperations(
  filters: ReportFilters,
  canReadAllocationCost: boolean,
  canReadBookingCost: boolean,
) {
  type SupplierOperationRow = { service_id: string | null; estimated_total_cost?: unknown };
  const allocationSelect = canReadAllocationCost
    ? "service_id, estimated_total_cost, status, created_at"
    : "service_id, status, created_at";
  const bookingSelect = canReadBookingCost
    ? "service_id, status, estimated_total_cost, created_at"
    : "service_id, status, created_at";

  const [allocations, bookings] = await Promise.all([
    fetchAllPages<SupplierOperationRow>(() => {
      let allocationQuery = createAdminClient()
        .from("service_supplier_allocations")
        .select(allocationSelect)
        .eq("is_deleted", false)
        .neq("status", "cancelled");
      allocationQuery = dateFilter(allocationQuery, filters, "created_at", false);
      return allocationQuery.order("created_at", { ascending: false }).order("id", { ascending: false });
    }),
    fetchAllPages<SupplierOperationRow>(() => {
      let bookingQuery = createAdminClient()
        .from("supplier_bookings")
        .select(bookingSelect)
        .eq("is_deleted", false)
        .neq("status", "cancelled");
      bookingQuery = dateFilter(bookingQuery, filters, "created_at", false);
      return bookingQuery.order("created_at", { ascending: false }).order("id", { ascending: false });
    }),
  ]);

  const activeAllocations = allocations;
  const activeBookings = bookings;
  const pendingServiceIds = Array.from(new Set(activeAllocations.flatMap((row) => row.service_id ? [row.service_id] : []))).sort();
  return {
    activeAllocations: activeAllocations.length,
    activeBookings: activeBookings.length,
    pendingServiceIds,
    internalEstimatedCost:
      canReadAllocationCost || canReadBookingCost
        ? [
            ...(canReadAllocationCost ? activeAllocations : []),
            ...(canReadBookingCost ? activeBookings : []),
          ].reduce((total, row) => total + numberValue(row.estimated_total_cost), 0)
        : null,
  };
}

export async function getReportsCenterData(filters: ReportFilters = {}): Promise<ReportsCenterData> {
  await requirePermission("dashboard:read");
  const supplierSectionPromise = (async () => {
    const supplierAllowed = (await checkPermission("supplier_allocations:read")) && (await checkPermission("supplier_bookings:read"));
    const canReadAllocationCost = supplierAllowed && (await checkPermission("supplier_allocations:read_cost"));
    const canReadBookingCost = supplierAllowed && (await checkPermission("supplier_bookings:read_cost"));
    const section = supplierAllowed
      ? await readSection("supplier_allocations:read", () =>
          readSupplierOperations(filters, canReadAllocationCost, canReadBookingCost),
        )
      : { status: "forbidden" as const, data: { activeAllocations: 0, activeBookings: 0, pendingServiceIds: [], internalEstimatedCost: null } };
    return section;
  })();

  const [supplierSection, quotations, invoices, receivables, services, customers, payments] = await Promise.all([
    supplierSectionPromise,
    readSection("quotations:read", () => readQuotations(filters)),
    readSection("invoices:read", () => readInvoices(filters)),
    readSection("invoices:read", () => readAccountsReceivable(filters)),
    readSection("services:read", () => readServices(filters)),
    readSection("customers:read", () => readCustomers(filters)),
    readSection("payments:read", () => readPayments(filters)),
  ]);

  const quotationRows = quotations.status === "ready" ? quotations.data : null;
  const invoiceRows = invoices.status === "ready" ? invoices.data : null;
  const receivableData = receivables.status === "ready" ? receivables.data : null;
  const serviceRows = services.status === "ready" ? services.data : null;
  const customerRows = customers.status === "ready" ? customers.data : null;
  const paymentRows = payments.status === "ready" ? payments.data : null;

  const billingSummaryBase = calculateSalesBilling(quotationRows, invoiceRows);
  const billingSummary = {
    ...billingSummaryBase,
    invoicedValue: receivableData?.billedAmount ?? null,
    collectedValue: receivableData?.collectedCashAmount ?? null,
    outstandingValue: receivableData?.totalOutstanding ?? null,
  };
  const operationsSummary = calculateServiceOperations(serviceRows ?? [], new Date().toISOString().slice(0, 10), filters);
  const customerSummary = calculateCustomerOverview(customerRows, invoiceRows, paymentRows, {
    quotations: quotationRows,
    services: serviceRows,
    authoritativeOutstanding: receivableData
      ? { count: receivableData.outstandingCustomerCount, rows: receivableData.outstandingCustomers }
      : null,
  });
  const salesBillingStatus: ReportsSectionStatus =
    quotations.status === "error" && invoices.status === "error"
      ? "error"
      : quotations.status === "forbidden" && invoices.status === "forbidden"
        ? "forbidden"
        : quotations.status === "error" || invoices.status === "error"
          ? quotationRows === null && invoiceRows === null
            ? "error"
            : "ready"
          : "ready";

  const customerOverviewStatus: ReportsSectionStatus =
    customers.status === "error" && invoices.status === "error" && payments.status === "error"
      ? "error"
      : customers.status === "forbidden" && invoices.status === "forbidden" && payments.status === "forbidden"
        ? "forbidden"
        : "ready";

  return {
    filters,
    salesBilling: {
      status: salesBillingStatus,
      data: {
        ...billingSummary,
        quotations: quotationRows ?? [],
        invoices: invoiceRows ?? [],
      },
    },
    accountsReceivable: receivables,
    serviceOperations: {
      status: services.status,
      data: {
        services: serviceRows ?? [],
        ...operationsSummary,
        statusCounts: operationsSummary.statusCounts ?? emptyServiceCounts(),
      },
    },
    customerOverview: {
      status: customerOverviewStatus,
      data: {
        customers: customerRows ?? [],
        ...customerSummary,
      },
    },
    supplierOperations: supplierSection,
  };
}
