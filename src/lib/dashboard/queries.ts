import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuotationStatus } from "@/types/quotation";
import { getServiceStatusTransitionState } from "@/lib/services/status-transitions";
import type { Locale } from "@/lib/i18n/locales";

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
  invoice_number: string;
  balance_due: number | string;
};

export type DashboardInvoicesData = {
  openInvoiceCount: number;
  totalCollected: number | null;
  pendingBalance: number | null;
  attentionInvoices: DashboardAttentionInvoice[];
  hasMoreAttentionInvoices: boolean;
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
  workflowCounts: Record<string, number>;
  readyToStartCount: number;
  inProgressCount: number;
};

export type DashboardReadyToStartService = Pick<
  DashboardUpcomingService,
  "id" | "serviceNumber" | "serviceTitle"
>;

export type DashboardReadyToStartServicesData = {
  readyToStartServices: DashboardReadyToStartService[];
};

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
    totalCount: result.count ?? 0,
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

  const totalCount = countResult.count ?? 0;
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

export async function getDashboardInvoicesData(): Promise<DashboardInvoicesData> {
  await requirePermission("invoices:read");

  const supabase = createAdminClient();
  const attentionResult = await supabase
    .from("invoices")
    .select("id, invoice_number, balance_due", { count: "exact" })
    .eq("is_deleted", false)
    .gt("balance_due", 0)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(6);

  if (attentionResult.error) {
    throw new Error(`[getDashboardInvoicesData] Attention error: ${attentionResult.error.message}`);
  }

  const openInvoiceCount = attentionResult.count ?? 0;
  const rawAttention = (attentionResult.data ?? []) as unknown as Array<{
    id: string;
    invoice_number: string;
    balance_due: number | string;
  }>;
  const attentionInvoices: DashboardAttentionInvoice[] = rawAttention.map((row) => ({
    id: row.id,
    invoice_number: row.invoice_number,
    balance_due: row.balance_due,
  }));
  const hasMoreAttentionInvoices = openInvoiceCount > attentionInvoices.length;

  return {
    openInvoiceCount,
    totalCollected: null,
    pendingBalance: null,
    attentionInvoices,
    hasMoreAttentionInvoices,
  };
}

export async function getDashboardServicesData(todayOverride?: string): Promise<DashboardServicesData> {
  await requirePermission("services:read");
  const today = todayOverride ?? new Date().toISOString().slice(0, 10);

  const supabase = createAdminClient();
  const [
    countResult,
    upcomingResult,
    inquiryCountResult,
    quotedCountResult,
    approvedCountResult,
    depositPaidCountResult,
    inProgressCountResult,
  ] = await Promise.all([
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null),
    supabase
      .from("services")
      .select("id, service_number, service_title, event_start_date")
      .is("deleted_at", null)
      .not("event_start_date", "is", null)
      .gte("event_start_date", today)
      .order("event_start_date", { ascending: true })
      .order("service_number", { ascending: true })
      .order("id", { ascending: true })
      .limit(6),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "Inquiry"),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "Quoted"),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "Approved"),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "Deposit Paid"),
    supabase
      .from("services")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null)
      .eq("status", "In Progress"),
  ]);

  if (countResult.error) {
    throw new Error(`[getDashboardServicesData] Count error: ${countResult.error.message}`);
  }
  if (upcomingResult.error) {
    throw new Error(`[getDashboardServicesData] Upcoming error: ${upcomingResult.error.message}`);
  }
  if (inquiryCountResult.error) {
    throw new Error(`[getDashboardServicesData] Inquiry count error: ${inquiryCountResult.error.message}`);
  }
  if (quotedCountResult.error) {
    throw new Error(`[getDashboardServicesData] Quoted count error: ${quotedCountResult.error.message}`);
  }
  if (approvedCountResult.error) {
    throw new Error(`[getDashboardServicesData] Approved count error: ${approvedCountResult.error.message}`);
  }
  if (depositPaidCountResult.error) {
    throw new Error(`[getDashboardServicesData] Deposit Paid count error: ${depositPaidCountResult.error.message}`);
  }
  if (inProgressCountResult.error) {
    throw new Error(`[getDashboardServicesData] In Progress count error: ${inProgressCountResult.error.message}`);
  }

  const totalCount = countResult.count ?? 0;
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

  const workflowCounts: Record<string, number> = {
    Inquiry: inquiryCountResult.count ?? 0,
    Quoted: quotedCountResult.count ?? 0,
    Approved: approvedCountResult.count ?? 0,
    "Deposit Paid": depositPaidCountResult.count ?? 0,
  };

  return {
    totalCount,
    upcomingServices,
    workflowCounts,
    readyToStartCount: depositPaidCountResult.count ?? 0,
    inProgressCount: inProgressCountResult.count ?? 0,
  };
}

/**
 * Returns only the bounded set of Services whose persisted lifecycle state is
 * ready for the existing start-execution transition. The transition helper
 * remains the source of readiness evidence; this loader never mutates state.
 */
export async function getDashboardReadyToStartServicesData(
  locale: Locale = "en",
): Promise<DashboardReadyToStartServicesData> {
  await requirePermission("services:update_status");

  const supabase = createAdminClient();
  const result = await supabase
    .from("services")
    .select("id, service_number, service_title, status")
    .is("deleted_at", null)
    .eq("status", "Deposit Paid")
    .order("service_number", { ascending: true })
    .order("id", { ascending: true })
    .limit(6);

  if (result.error) {
    throw new Error(`[getDashboardReadyToStartServicesData] Ready-to-start error: ${result.error.message}`);
  }

  const rawServices = (result.data ?? []) as unknown as Array<{
    id: string;
    service_number: string;
    service_title: string;
    status: "Deposit Paid";
  }>;
  const transitionResults = await Promise.all(
    rawServices.map(async (service) => ({
      service,
      transitionState: await getServiceStatusTransitionState(
        supabase,
        service.id,
        service.status,
        locale,
      ),
    })),
  );
  const readyToStartServices: DashboardReadyToStartService[] = transitionResults
    .filter(({ transitionState }) => {
      const startAction = transitionState.actions.find(
        (action) => action.status === "In Progress",
      );
      return Boolean(startAction && startAction.blockedReason === null);
    })
    .map(({ service }) => ({
      id: service.id,
      serviceNumber: service.service_number,
      serviceTitle: service.service_title,
    }));

  return { readyToStartServices };
}

export async function getDashboardPaymentsData() {
  await requirePermission("payments:read");
  const { getPaymentsList } = await import("@/lib/payments/queries");
  const result = await getPaymentsList({ pageSize: 10 });
  return { payments: result.payments.slice(0, 5) };
}
