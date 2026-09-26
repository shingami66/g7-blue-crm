import "server-only";

import { ForbiddenError } from "@/lib/auth/errors";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { SUPPLIER_BILL_PERMISSIONS, SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { normalizeListPageSize, type ListPageSize } from "@/lib/pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentRiyadhDate, isReportDate } from "./filters";
import { normalizeReportPage } from "./pagination";
import { readAccountsReceivable, type AccountsReceivablePageOptions } from "./queries";
import type {
  ReportAccountsPayable,
  ReportAccountsPayableRow,
  ReportEventEconomics,
  ReportEventEconomicsRow,
  ReportFilters,
  ReportPageResult,
  ReportPagination,
} from "./types";

const DEFAULT_PAGE_SIZE: ListPageSize = 20;
const MAX_EXPORT_ROWS = 500;
const EXPORT_PAGE_SIZE: ListPageSize = 50;

type RawRow = Record<string, unknown>;

// W9A1 RPCs are additive to migrations that are not yet reflected in the
// generated client schema. Keep the untyped boundary in this server module.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function reportClient(): any {
  return createAdminClient();
}

function rows(value: unknown): RawRow[] {
  return Array.isArray(value)
    ? value.filter((row): row is RawRow => typeof row === "object" && row !== null)
    : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value : null;
}

function requiredText(value: unknown): string {
  return text(value) ?? "";
}

function numberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function numberOrZero(value: unknown): number {
  return numberOrNull(value) ?? 0;
}

function reportCount(value: unknown): number | null {
  if (typeof value !== "number" && (typeof value !== "string" || !/^\d+$/.test(value.trim()))) return null;
  const count = Number(value);
  return count !== null && Number.isSafeInteger(count) && count >= 0 ? count : null;
}

function pagination(total: number, page: number, pageSize: number): ReportPagination {
  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

function pageInputs(pageValue: unknown, pageSizeValue: unknown) {
  const pageSize = normalizeListPageSize(pageSizeValue ?? DEFAULT_PAGE_SIZE);
  const page = normalizeReportPage(pageValue, pageSize);
  return { page, pageSize };
}

export function hasReportData<T>(result: ReportPageResult<T>): result is Extract<ReportPageResult<T>, { data: T }> {
  return result.status === "ready" || result.status === "partial" || result.status === "empty";
}

export type AccountsReceivableReportOptions = {
  filters: ReportFilters;
  page?: number;
  pageSize?: number;
};

export async function getAccountsReceivableReport(
  options: AccountsReceivableReportOptions,
): Promise<ReportPageResult<Awaited<ReturnType<typeof readAccountsReceivable>>>> {
  await requirePermission("invoices:read");
  const { page, pageSize } = pageInputs(options.page, options.pageSize);
  const readOptions: AccountsReceivablePageOptions = { page, pageSize };
  const data = await readAccountsReceivable(options.filters, readOptions);
  return data.detailTotalCount === 0 ? { status: "empty", data } : { status: "ready", data };
}

export type AccountsPayableReportOptions = {
  status?: "all" | "unpaid" | "partially_paid" | "paid";
  supplierSearch?: string;
  serviceSearch?: string;
  supplierId?: string;
  serviceId?: string;
  dueFrom?: string;
  dueTo?: string;
  page?: number;
  pageSize?: number;
};

function mapPayableStatus(value: unknown): ReportAccountsPayableRow["status"] {
  return value === "paid" || value === "partially_paid" ? value : "unpaid";
}

async function loadServiceIdentity(serviceIds: string[], canReadServices: boolean): Promise<Map<string, { number: string; title: string }>> {
  if (!canReadServices || serviceIds.length === 0) return new Map();
  const { data, error } = await reportClient()
    .from("services")
    .select("id,service_number,service_title")
    .in("id", serviceIds);
  if (error) {
    console.error("[Reports] AP service identity unavailable:", error.message);
    return new Map();
  }
  return new Map(rows(data).map((row) => [
    requiredText(row.id),
    { number: requiredText(row.service_number), title: requiredText(row.service_title) },
  ]));
}

export async function getAccountsPayableReport(
  options: AccountsPayableReportOptions = {},
): Promise<ReportPageResult<ReportAccountsPayable>> {
  await requirePermission(SUPPLIER_BILL_PERMISSIONS.read);
  await requirePermission(SUPPLIER_PAYMENT_PERMISSIONS.read);
  const { page, pageSize } = pageInputs(options.page, options.pageSize);
  const dueFrom = isReportDate(options.dueFrom) ? options.dueFrom : null;
  const dueTo = isReportDate(options.dueTo) ? options.dueTo : null;
  const canReadServices = await checkPermission("services:read");
  const serviceSearch = text(options.serviceSearch);
  const serviceId = text(options.serviceId);
  if (!canReadServices && (serviceSearch !== null || serviceId !== null)) {
    throw new ForbiddenError();
  }
  if (dueFrom && dueTo && dueFrom > dueTo) {
    return { status: "error", error: "reversed_due_range" };
  }

  const { data, error } = await reportClient().rpc("get_accounts_payable_report", {
    p_status: options.status && options.status !== "all" ? options.status : null,
    p_supplier_search: text(options.supplierSearch),
    p_service_search: serviceSearch,
    p_supplier_id: options.supplierId || null,
    p_service_id: serviceId,
    p_due_from: dueFrom,
    p_due_to: dueTo,
    p_page_size: pageSize,
    p_page_offset: (page - 1) * pageSize,
  });
  if (error) {
    console.error("[Reports] AP RPC unavailable:", error.message);
    return { status: "unavailable", error: "accounts_payable_unavailable" };
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object") return { status: "unavailable", error: "accounts_payable_unavailable" };
  const report = result as RawRow;
  const rawRows = rows(report.detail_rows);
  const serviceIds = Array.from(new Set(rawRows.map((row) => text(row.service_id)).filter((id): id is string => Boolean(id))));
  const services = await loadServiceIdentity(serviceIds, canReadServices);
  const mappedRows: ReportAccountsPayableRow[] = rawRows.map((row) => {
    const serviceId = text(row.service_id);
    const service = serviceId ? services.get(serviceId) : undefined;
    return {
      billId: requiredText(row.supplier_bill_id),
      billNumber: requiredText(row.bill_number),
      supplierId: requiredText(row.supplier_id),
      supplierName: text(row.supplier_name_snapshot),
      serviceId,
      serviceNumber: service?.number ?? null,
      serviceTitle: service?.title ?? null,
      invoiceDate: requiredText(row.invoice_date),
      dueDate: text(row.due_date),
      status: mapPayableStatus(row.payment_status),
      currency: text(row.currency) ?? "SAR",
      payableAmount: numberOrZero(row.payable_amount),
      paidAmount: numberOrZero(row.paid_amount),
      outstandingAmount: numberOrZero(row.outstanding_amount),
      advanceAllocatedAmount: numberOrZero(row.advance_allocated_amount),
    };
  });
  const detailTotalCount = numberOrZero(report.detail_total_count);
  const output: ReportAccountsPayable = {
    currentOnly: true,
    source: "supplier_bill_payment_balances",
    payableAmount: numberOrZero(report.payable_amount),
    paidAmount: numberOrZero(report.paid_amount),
    outstandingAmount: numberOrZero(report.outstanding_amount),
    openBillCount: numberOrZero(report.open_bill_count),
    detailTotalCount,
    rows: mappedRows,
    pagination: pagination(detailTotalCount, page, pageSize),
  };
  return detailTotalCount === 0 ? { status: "empty", data: output } : { status: "ready", data: output };
}

export type EventEconomicsReportOptions = {
  asOfDate?: string;
  search?: string;
  completeness?: "all" | "COMPLETE" | "PARTIAL" | "UNAVAILABLE";
  closeState?: "all" | "open" | "closed";
  page?: number;
  pageSize?: number;
};

async function loadCustomerIdentity(customerIds: string[]): Promise<Map<string, { number: string | null; name: string | null }>> {
  if (!(await checkPermission("customers:read")) || customerIds.length === 0) return new Map();
  const { data, error } = await reportClient()
    .from("customers")
    .select("id,customer_number,company")
    .in("id", customerIds);
  if (error) {
    console.error("[Reports] Event customer identity unavailable:", error.message);
    return new Map();
  }
  return new Map(rows(data).map((row) => [
    requiredText(row.id),
    { number: text(row.customer_number), name: text(row.company) },
  ]));
}

export async function getEventEconomicsReport(
  options: EventEconomicsReportOptions = {},
): Promise<ReportPageResult<ReportEventEconomics>> {
  await requirePermission("services:read");
  await requirePermission("supplier_costing:read");
  if (options.asOfDate !== undefined && !isReportDate(options.asOfDate)) {
    return { status: "invalid", error: "invalid_as_of" };
  }
  const { page, pageSize } = pageInputs(options.page, options.pageSize);
  const asOfDate = isReportDate(options.asOfDate) ? options.asOfDate : getCurrentRiyadhDate();
  const { data, error } = await reportClient().rpc("get_event_economics_report", {
    p_as_of_date: asOfDate,
    p_search: text(options.search),
    p_completeness: options.completeness && options.completeness !== "all" ? options.completeness : null,
    p_close_state: options.closeState && options.closeState !== "all" ? options.closeState : null,
    p_page_size: pageSize,
    p_page_offset: (page - 1) * pageSize,
  });
  if (error) {
    console.error("[Reports] Event Economics RPC unavailable:", error.message);
    return { status: "unavailable", error: "event_economics_unavailable" };
  }
  const result = Array.isArray(data) ? data[0] : data;
  if (!result || typeof result !== "object") return { status: "unavailable", error: "event_economics_unavailable" };
  const report = result as RawRow;
  if (report.report_state === "unavailable") {
    return { status: "unavailable", error: text(report.error) ?? "event_economics_filter_bounded" };
  }
  if (report.report_state !== "ready") {
    return { status: "unavailable", error: "event_economics_unavailable" };
  }
  const detailTotalCount = reportCount(report.detail_total_count);
  const openCount = reportCount(report.open_count);
  const closedCount = reportCount(report.closed_count);
  const completenessSummaryState = report.completeness_summary_state;
  const completeCount = reportCount(report.complete_count);
  const partialCount = reportCount(report.partial_count);
  const unavailableCount = reportCount(report.unavailable_count);
  if (
    detailTotalCount === null
    || openCount === null
    || closedCount === null
    || (completenessSummaryState !== "available" && completenessSummaryState !== "unavailable")
    || (completenessSummaryState === "available" && (completeCount === null || partialCount === null || unavailableCount === null))
    || (completenessSummaryState === "unavailable" && (completeCount !== null || partialCount !== null || unavailableCount !== null))
  ) {
    return { status: "unavailable", error: "event_economics_summary_unavailable" };
  }
  const rawRows = rows(report.detail_rows);
  const customerIds = Array.from(new Set(rawRows.map((row) => text(row.customer_id)).filter((id): id is string => Boolean(id))));
  const customers = await loadCustomerIdentity(customerIds);
  const mappedRows: ReportEventEconomicsRow[] = rawRows.map((row) => {
    const customerId = requiredText(row.customer_id);
    const customer = customers.get(customerId);
    const completenessStatus = row.completeness_status === "COMPLETE" || row.completeness_status === "UNAVAILABLE"
      ? row.completeness_status
      : "PARTIAL";
    return {
      serviceId: requiredText(row.service_id),
      serviceNumber: requiredText(row.service_number),
      serviceTitle: requiredText(row.service_title),
      customerId,
      customerNumber: customer?.number ?? null,
      customerName: customer?.name ?? null,
      approvedBudgetCost: numberOrNull(row.approved_budget_cost),
      openCommitment: numberOrNull(row.open_commitment),
      actualCost: numberOrNull(row.actual_cost),
      paidCost: numberOrNull(row.paid_cost),
      outstandingCost: numberOrNull(row.outstanding_cost),
      etc: numberOrNull(row.etc),
      eac: numberOrNull(row.eac),
      netApprovedCommercialValue: numberOrNull(row.net_approved_commercial_value),
      forecastMargin: numberOrNull(row.forecast_margin),
      completenessStatus,
      completenessReasonCodes: Array.isArray(row.completeness_reason_codes)
        ? row.completeness_reason_codes.filter((code): code is string => typeof code === "string")
        : [],
      closeState: row.close_state === "closed" ? "closed" : "open",
      closeVersion: numberOrNull(row.close_version),
      closeEffectiveDate: text(row.close_effective_date),
      finalActualCost: numberOrNull(row.final_actual_cost),
      finalManagerialMargin: numberOrNull(row.final_managerial_margin),
      closedAt: text(row.closed_at),
    };
  });
  const output: ReportEventEconomics = {
    asOfDate: text(report.as_of_date) ?? asOfDate,
    source: "get_event_costing + event_cost_close_versions",
    summary: {
      completenessSummaryState,
      completeCount,
      partialCount,
      unavailableCount,
      openCount,
      closedCount,
    },
    rows: mappedRows,
    pagination: pagination(detailTotalCount, page, pageSize),
  };
  if (detailTotalCount === 0) return { status: "empty", data: output };
  const hasIncomplete = completenessSummaryState === "available"
    && ((partialCount !== null && partialCount > 0) || (unavailableCount !== null && unavailableCount > 0));
  return hasIncomplete ? { status: "partial", data: output } : { status: "ready", data: output };
}

export async function readAccountsReceivableExport(filters: ReportFilters): Promise<{
  data: Awaited<ReturnType<typeof readAccountsReceivable>>;
  truncated: boolean;
}> {
  await requirePermission("invoices:read");
  const firstPage = await readAccountsReceivable(filters, { page: 1, pageSize: 100 });
  const rows = [...firstPage.rows];
  const pages = Math.min(Math.ceil(firstPage.detailTotalCount / 100), Math.ceil(MAX_EXPORT_ROWS / 100));
  for (let page = 2; page <= pages; page += 1) {
    const next = await readAccountsReceivable(filters, { page, pageSize: 100 });
    rows.push(...next.rows);
  }
  return { data: { ...firstPage, rows: rows.slice(0, MAX_EXPORT_ROWS) }, truncated: firstPage.detailTotalCount > MAX_EXPORT_ROWS };
}

export async function readAccountsPayableExport(options: AccountsPayableReportOptions = {}) {
  const first = await getAccountsPayableReport({ ...options, page: 1, pageSize: EXPORT_PAGE_SIZE });
  if (!hasReportData(first)) {
    throw new Error(first.error ?? "accounts_payable_unavailable");
  }
  const rows = [...first.data.rows];
  const pages = Math.min(first.data.pagination.totalPages, Math.ceil(MAX_EXPORT_ROWS / EXPORT_PAGE_SIZE));
  for (let page = 2; page <= pages; page += 1) {
    const next = await getAccountsPayableReport({ ...options, page, pageSize: EXPORT_PAGE_SIZE });
    if (!hasReportData(next)) {
      throw new Error(next.error ?? "accounts_payable_export_page_unavailable");
    }
    rows.push(...next.data.rows);
  }
  const expectedRows = Math.min(first.data.pagination.total, MAX_EXPORT_ROWS);
  const exportedRows = rows.slice(0, MAX_EXPORT_ROWS);
  if (exportedRows.length !== expectedRows) {
    throw new Error("accounts_payable_export_incomplete");
  }
  return {
    data: { ...first.data, rows: exportedRows },
    truncated: first.data.pagination.total > MAX_EXPORT_ROWS,
  };
}

export async function readEventEconomicsExport(options: EventEconomicsReportOptions = {}) {
  const first = await getEventEconomicsReport({ ...options, page: 1, pageSize: EXPORT_PAGE_SIZE });
  if (!hasReportData(first)) {
    if (first.status === "invalid") throw new Error("invalid_as_of");
    throw new Error(first.error ?? "event_economics_unavailable");
  }
  const rows = [...first.data.rows];
  const pages = Math.min(first.data.pagination.totalPages, Math.ceil(MAX_EXPORT_ROWS / EXPORT_PAGE_SIZE));
  for (let page = 2; page <= pages; page += 1) {
    const next = await getEventEconomicsReport({ ...options, page, pageSize: EXPORT_PAGE_SIZE });
    if (!hasReportData(next)) {
      throw new Error(next.error ?? "event_economics_export_page_unavailable");
    }
    rows.push(...next.data.rows);
  }
  const expectedRows = Math.min(first.data.pagination.total, MAX_EXPORT_ROWS);
  const exportedRows = rows.slice(0, MAX_EXPORT_ROWS);
  if (exportedRows.length !== expectedRows) {
    throw new Error("event_economics_export_incomplete");
  }
  return {
    data: { ...first.data, rows: exportedRows },
    truncated: first.data.pagination.total > MAX_EXPORT_ROWS,
  };
}

export { MAX_EXPORT_ROWS };
