import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { CASH_ADVANCE_PERMISSIONS, EXPENSE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuotationStatus } from "@/types/quotation";
import { getCurrentRiyadhDate } from "@/lib/reports/filters";
import {
  getAccountsPayableReport,
  getAccountsReceivableReport,
  getEventEconomicsReport,
  hasReportData,
} from "@/lib/reports/reporting";

export type DashboardCustomersData = {
  totalCount: number;
};

export type DashboardRecentQuotation = {
  id: string;
  quotationNumber: string;
  grandTotal: number;
  status: QuotationStatus;
  createdAt: string;
  customer: { company: string | null } | null;
  event: string | null;
};

export type DashboardQuotationsData = {
  totalCount: number;
  recentQuotations: DashboardRecentQuotation[];
};

export type DashboardPendingQuotationApproval = {
  id: string;
  quotationNumber: string;
  status: QuotationStatus;
  createdAt: string;
  customer: { company: string | null } | null;
  event: string | null;
};

export type DashboardQuotationApprovalData = {
  pendingQuotationApprovals: DashboardPendingQuotationApproval[];
};

export type DashboardAttentionInvoice = {
  id: string;
  invoiceNumber: string;
  outstandingAmount: number;
};

export type DashboardReceivablesData = {
  asOfDate: string;
  detailTotalCount: number;
  collectedCashAmount: number;
  totalOutstanding: number;
  totalOverdue: number;
  attentionInvoices: DashboardAttentionInvoice[];
  hasMoreAttentionInvoices: boolean;
};

export type DashboardPayablesData = {
  currentOnly: true;
  detailTotalCount: number;
  payableAmount: number;
  paidAmount: number;
  outstandingAmount: number;
  openBillCount: number;
};

export type DashboardEventEconomicsData = {
  asOfDate: string;
  status: "ready" | "partial";
  detailTotalCount: number;
  openCount: number;
  closedCount: number;
  completenessSummaryState: "available" | "unavailable";
  completeCount: number | null;
  partialCount: number | null;
  unavailableCount: number | null;
};

export type DashboardUpcomingService = {
  id: string;
  serviceNumber: string;
  serviceTitle: string;
  eventStartDate: string | null;
};

export type DashboardServicesData = {
  totalCount: number;
  upcomingServices: DashboardUpcomingService[];
};

export type DashboardServiceLifecycleData = {
  readyToStartCount: number;
  inProgressCount: number;
  readyToStartServices: Array<Pick<DashboardUpcomingService, "id" | "serviceNumber" | "serviceTitle">>;
};

export type DashboardExpenseFinanceReviewItem = {
  id: string;
  expenseNumber: string;
  description: string;
};

export type DashboardCashAdvanceIssueItem = {
  id: string;
  advanceNumber: string;
};

type DashboardQueueResult = {
  data: unknown[] | null;
  error: { message: string } | null;
};

type DashboardQueueQuery = PromiseLike<DashboardQueueResult> & {
  select(columns: string): DashboardQueueQuery;
  eq(column: string, value: string): DashboardQueueQuery;
  is(column: string, value: null): DashboardQueueQuery;
  order(column: string, options: { ascending: boolean }): DashboardQueueQuery;
  limit(count: number): DashboardQueueQuery;
};

function dashboardQueueClient(): { from(relation: string): DashboardQueueQuery } {
  return createAdminClient() as unknown as { from(relation: string): DashboardQueueQuery };
}

function exactDashboardCount(count: number | null, source: string): number {
  if (count === null) throw new Error(`[${source}] Exact count unavailable`);
  return count;
}

export async function getDashboardCustomersData(): Promise<DashboardCustomersData> {
  await requirePermission("customers:read");

  const supabase = createAdminClient();
  const result = await supabase
    .from("customers")
    .select("id", { count: "exact", head: true })
    .eq("is_deleted", false);

  if (result.error) {
    throw new Error(`[getDashboardCustomersData] Database error: ${result.error.message}`);
  }

  return {
    totalCount: exactDashboardCount(result.count, "getDashboardCustomersData"),
  };
}

export async function getDashboardQuotationsData(): Promise<DashboardQuotationsData> {
  await requirePermission("quotations:read");

  const supabase = createAdminClient();
  const [countResult, recentResult] = await Promise.all([
    supabase
      .from("quotations")
      .select("id", { count: "exact", head: true })
      .eq("is_deleted", false),
    supabase
      .from("quotations")
      .select("id, quotation_number, grand_total, status, created_at, services(service_number, service_title, status, event_name), customers(company)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(4),
  ]);

  if (countResult.error) {
    throw new Error(`[getDashboardQuotationsData] Count error: ${countResult.error.message}`);
  }
  if (recentResult.error) {
    throw new Error(`[getDashboardQuotationsData] Recent error: ${recentResult.error.message}`);
  }

  const totalCount = exactDashboardCount(countResult.count, "getDashboardQuotationsData");
  const rawQuotations = (recentResult.data ?? []) as unknown as Array<{
    id: string;
    quotation_number: string;
    grand_total: number | string | null;
    status: string;
    created_at: string;
    services: {
      service_number: string | null;
      service_title: string | null;
      status: string | null;
      event_name: string | null;
    } | null;
    customers: { company: string | null } | null;
  }>;
  const recentQuotations: DashboardRecentQuotation[] = rawQuotations.map((row) => ({
    id: row.id,
    quotationNumber: row.quotation_number,
    grandTotal: Number(row.grand_total ?? 0),
    status: row.status as QuotationStatus,
    createdAt: row.created_at,
    customer: row.customers ? { company: row.customers.company } : null,
    event: row.services?.event_name ?? null,
  }));

  return { totalCount, recentQuotations };
}

export async function getDashboardQuotationApprovalData(): Promise<DashboardQuotationApprovalData> {
  await requirePermission("quotations:read");
  await requirePermission("quotations:approve");

  const supabase = createAdminClient();
  const result = await supabase
    .from("quotations")
    .select("id, quotation_number, status, created_at, services!inner(service_title, status, event_name, deleted_at), customers(company)")
    .eq("is_deleted", false)
    .in("status", ["draft", "sent"])
    .in("services.status", ["Inquiry", "Quoted"])
    .is("services.deleted_at", null)
    .order("created_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(6);

  if (result.error) {
    throw new Error(`[getDashboardQuotationApprovalData] Pending approval error: ${result.error.message}`);
  }

  const rawQuotations = (result.data ?? []) as unknown as Array<{
    id: string;
    quotation_number: string;
    status: string;
    created_at: string;
    services: {
      service_title: string | null;
      status: string | null;
      event_name: string | null;
      deleted_at: string | null;
    } | null;
    customers: { company: string | null } | null;
  }>;
  const pendingQuotationApprovals: DashboardPendingQuotationApproval[] = rawQuotations.map((row) => ({
    id: row.id,
    quotationNumber: row.quotation_number,
    status: row.status as QuotationStatus,
    createdAt: row.created_at,
    customer: row.customers ? { company: row.customers.company } : null,
    event: row.services?.event_name ?? null,
  }));

  return { pendingQuotationApprovals };
}

export async function getDashboardReceivablesData(
  asOfDate = getCurrentRiyadhDate(),
): Promise<DashboardReceivablesData> {
  const result = await getAccountsReceivableReport({
    filters: { asOf: asOfDate },
    page: 1,
    pageSize: 10,
  });
  if (!hasReportData(result)) {
    throw new Error(`[getDashboardReceivablesData] Report unavailable: ${result.error ?? result.status}`);
  }

  const data = result.data;
  const outstandingRows = data.rows.filter((row) => row.outstandingAmount > 0);
  const attentionInvoices = outstandingRows.slice(0, 6).map((row) => ({
    id: row.invoiceId,
    invoiceNumber: row.invoiceNumber,
    outstandingAmount: row.outstandingAmount,
  }));

  return {
    asOfDate: data.asOfDate,
    detailTotalCount: data.detailTotalCount,
    collectedCashAmount: data.collectedCashAmount,
    totalOutstanding: data.totalOutstanding,
    totalOverdue: data.totalOverdue,
    attentionInvoices,
    hasMoreAttentionInvoices: outstandingRows.length > attentionInvoices.length,
  };
}

export async function getDashboardPayablesData(): Promise<DashboardPayablesData> {
  const result = await getAccountsPayableReport({ page: 1, pageSize: 1 });
  if (!hasReportData(result)) {
    throw new Error(`[getDashboardPayablesData] Report unavailable: ${result.error ?? result.status}`);
  }

  if (!result.data.currentOnly) {
    throw new Error("[getDashboardPayablesData] Expected current-only payable semantics");
  }

  return {
    currentOnly: true,
    detailTotalCount: result.data.detailTotalCount,
    payableAmount: result.data.payableAmount,
    paidAmount: result.data.paidAmount,
    outstandingAmount: result.data.outstandingAmount,
    openBillCount: result.data.openBillCount,
  };
}

export async function getDashboardEventEconomicsData(
  asOfDate = getCurrentRiyadhDate(),
): Promise<DashboardEventEconomicsData> {
  const result = await getEventEconomicsReport({ asOfDate, page: 1, pageSize: 1 });
  if (!hasReportData(result)) {
    throw new Error(`[getDashboardEventEconomicsData] Report unavailable: ${result.error ?? result.status}`);
  }

  return {
    asOfDate: result.data.asOfDate,
    status: result.status === "partial" ? "partial" : "ready",
    detailTotalCount: result.data.pagination.total,
    openCount: result.data.summary.openCount,
    closedCount: result.data.summary.closedCount,
    completenessSummaryState: result.data.summary.completenessSummaryState,
    completeCount: result.data.summary.completeCount,
    partialCount: result.data.summary.partialCount,
    unavailableCount: result.data.summary.unavailableCount,
  };
}

export async function getDashboardServicesData(todayOverride = getCurrentRiyadhDate()): Promise<DashboardServicesData> {
  await requirePermission("services:read");

  const supabase = createAdminClient();
  const [countResult, upcomingResult] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("services")
      .select("id, service_number, service_title, event_start_date")
      .is("deleted_at", null)
      .gte("event_start_date", todayOverride)
      .order("event_start_date", { ascending: true })
      .order("service_number", { ascending: true })
      .order("id", { ascending: true })
      .limit(6),
  ]);

  if (countResult.error) {
    throw new Error(`[getDashboardServicesData] Count error: ${countResult.error.message}`);
  }
  if (upcomingResult.error) {
    throw new Error(`[getDashboardServicesData] Upcoming error: ${upcomingResult.error.message}`);
  }
  const totalCount = exactDashboardCount(countResult.count, "getDashboardServicesData");
  const rawUpcoming = (upcomingResult.data ?? []) as unknown as Array<{
    id: string;
    service_number: string;
    service_title: string;
    event_start_date: string | null;
  }>;
  const upcomingServices: DashboardUpcomingService[] = rawUpcoming.map((row) => ({
    id: row.id,
    serviceNumber: row.service_number,
    serviceTitle: row.service_title,
    eventStartDate: row.event_start_date,
  }));

  return {
    totalCount,
    upcomingServices,
  };
}

export async function getDashboardServiceLifecycleData(
  includeReadyToStartActions: boolean,
): Promise<DashboardServiceLifecycleData> {
  await requirePermission("services:read");
  if (includeReadyToStartActions) await requirePermission("services:update_status");
  const supabase = createAdminClient();
  const [readyResult, inProgressResult] = await Promise.all([
    includeReadyToStartActions
      ? supabase
        .from("service_lifecycle_states")
        .select("service_id, start_gate_basis, payment_state, services!inner(id, service_number, service_title)", { count: "exact" })
        .eq("commercial_state", "approved")
        .eq("readiness_state", "ready")
        .eq("execution_state", "not_started")
        .eq("payment_state", "settled")
        .eq("start_gate_basis", "settled_payment")
        .is("services.deleted_at", null)
        .order("service_id", { ascending: true })
        .limit(6)
      : supabase
        .from("service_lifecycle_states")
        .select("service_id, services!inner(deleted_at)", { count: "exact", head: true })
        .eq("commercial_state", "approved")
        .eq("readiness_state", "ready")
        .eq("execution_state", "not_started")
        .eq("payment_state", "settled")
        .eq("start_gate_basis", "settled_payment")
        .is("services.deleted_at", null),
    supabase
      .from("service_lifecycle_states")
      .select("service_id, services!inner(deleted_at)", { count: "exact", head: true })
      .eq("execution_state", "in_progress")
      .is("services.deleted_at", null),
  ]);

  if (readyResult.error) {
    throw new Error(`[getDashboardServiceLifecycleData] Ready-to-start projection unavailable: ${readyResult.error.message}`);
  }
  if (inProgressResult.error) {
    throw new Error(`[getDashboardServiceLifecycleData] In-progress projection unavailable: ${inProgressResult.error.message}`);
  }
  const readyToStartCount = exactDashboardCount(readyResult.count, "getDashboardServiceLifecycleData");
  const inProgressCount = exactDashboardCount(inProgressResult.count, "getDashboardServiceLifecycleData");

  const rawServices = (readyResult.data ?? []) as unknown as Array<{
    service_id: string;
    services: {
      id: string;
      service_number: string;
      service_title: string;
    } | null;
  }>;

  return {
    readyToStartCount,
    inProgressCount,
    readyToStartServices: includeReadyToStartActions
      ? rawServices.flatMap((row) => row.services ? [{
        id: row.services.id,
        serviceNumber: row.services.service_number,
        serviceTitle: row.services.service_title,
      }] : [])
      : [],
  };
}

export async function getDashboardExpenseFinanceReviewData(): Promise<DashboardExpenseFinanceReviewItem[]> {
  await requirePermission(EXPENSE_PERMISSIONS.read);
  await requirePermission(EXPENSE_PERMISSIONS.financeReview);
  const { data, error } = await dashboardQueueClient()
    .from("expense_accountability_summaries")
    .select("id, expense_number, description, submitted_at")
    .eq("status", "submitted")
    .is("finance_reviewed_at", null)
    .order("submitted_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(6);

  if (error) {
    throw new Error(`[getDashboardExpenseFinanceReviewData] Queue unavailable: ${error.message}`);
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    expense_number: string;
    description: string;
  }>).map((row) => ({
    id: row.id,
    expenseNumber: row.expense_number,
    description: row.description,
  }));
}

export async function getDashboardCashAdvanceIssueData(): Promise<DashboardCashAdvanceIssueItem[]> {
  await requirePermission(CASH_ADVANCE_PERMISSIONS.read);
  await requirePermission(CASH_ADVANCE_PERMISSIONS.issue);
  const { data, error } = await dashboardQueueClient()
    .from("employee_cash_advances")
    .select("id, advance_number, status")
    .eq("status", "approved")
    .order("approved_at", { ascending: true })
    .order("id", { ascending: true })
    .limit(6);

  if (error) {
    throw new Error(`[getDashboardCashAdvanceIssueData] Queue unavailable: ${error.message}`);
  }

  return ((data ?? []) as unknown as Array<{
    id: string;
    advance_number: string;
    status: "approved";
  }>).map((row) => ({
    id: row.id,
    advanceNumber: row.advance_number,
  }));
}

export async function getDashboardPaymentsData() {
  await requirePermission("payments:read");
  const { getPaymentsList } = await import("@/lib/payments/queries");
  const result = await getPaymentsList({ pageSize: 10 });
  return { payments: result.payments.slice(0, 5) };
}
