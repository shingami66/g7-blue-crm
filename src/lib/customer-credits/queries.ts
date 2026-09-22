import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CustomerCreditAdjustmentBalance,
  CustomerCreditBalance,
  CustomerInvoiceReceivableBalance,
} from "./types";

type QueryResponse<T> = {
  data: T;
  error: { message: string } | null;
};

type CreditQueryBuilder = {
  select: (columns?: string, options?: Record<string, unknown>) => CreditQueryBuilder;
  eq: (column: string, value: unknown) => CreditQueryBuilder;
  neq: (column: string, value: unknown) => CreditQueryBuilder;
  gt: (column: string, value: unknown) => CreditQueryBuilder;
  in: (column: string, values: string[]) => CreditQueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => CreditQueryBuilder;
  limit: (value: number) => CreditQueryBuilder;
  maybeSingle: () => Promise<QueryResponse<Record<string, unknown> | null>>;
} & PromiseLike<QueryResponse<unknown>>;

type CreditQueryClient = {
  from: (table: string) => CreditQueryBuilder;
};

function money(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function requiredString(row: Record<string, unknown>, key: string): string {
  return typeof row[key] === "string" ? row[key] as string : "";
}

export async function getCustomerInvoiceReceivableBalance(
  invoiceId: string,
): Promise<CustomerInvoiceReceivableBalance | null> {
  await requirePermission("invoices:read");
  const supabase = createAdminClient() as unknown as CreditQueryClient;
  const { data, error } = await supabase
    .from("customer_invoice_receivable_balances")
    .select("*")
    .eq("invoice_id", invoiceId)
    .maybeSingle();
  if (error || !data) return null;
  return {
    invoiceId: requiredString(data, "invoice_id"),
    serviceId: requiredString(data, "service_id"),
    invoiceNumber: requiredString(data, "invoice_number"),
    customerId: requiredString(data, "customer_id"),
    grossIssuedAmount: money(data.gross_issued_amount),
    creditAdjustmentAmount: money(data.credit_adjustment_amount),
    creditApplicationAmount: money(data.credit_application_amount),
    netReceivableAmount: money(data.net_receivable_amount),
    settledAmount: money(data.settled_amount),
    outstandingAmount: money(data.outstanding_amount),
    customerCreditAmount: money(data.customer_credit_amount),
    invoiceAmountPaid: money(data.invoice_amount_paid),
    invoiceBalanceDue: money(data.invoice_balance_due),
    invoiceStatus: requiredString(data, "invoice_status"),
  };
}

export async function getCustomerCreditBalance(customerId: string): Promise<CustomerCreditBalance> {
  await requirePermission("invoices:read");
  const supabase = createAdminClient() as unknown as CreditQueryClient;
  const { data, error } = await supabase
    .from("customer_credit_balances")
    .select("*")
    .eq("customer_id", customerId)
    .maybeSingle();
  if (error || !data) {
    return {
      customerId,
      creditAdjustmentCount: 0,
      creditedAmount: 0,
      refundedAmount: 0,
      appliedAmount: 0,
      availableCreditAmount: 0,
    };
  }
  return {
    customerId: requiredString(data, "customer_id"),
    creditAdjustmentCount: money(data.credit_adjustment_count),
    creditedAmount: money(data.credited_amount),
    refundedAmount: money(data.refunded_amount),
    appliedAmount: money(data.applied_amount),
    availableCreditAmount: money(data.available_credit_amount),
  };
}

export async function getCustomerCreditAdjustmentsForInvoice(
  invoiceId: string,
): Promise<CustomerCreditAdjustmentBalance[]> {
  await requirePermission("invoices:read");
  const supabase = createAdminClient() as unknown as CreditQueryClient;
  const { data, error } = await supabase
    .from("customer_credit_adjustment_balances")
    .select("*")
    .eq("invoice_id", invoiceId)
    .order("effective_date", { ascending: false })
    .order("credit_adjustment_id", { ascending: false });
  if (error || !Array.isArray(data)) return [];
  return (data as Array<Record<string, unknown>>).map((row) => ({
    creditAdjustmentId: requiredString(row, "credit_adjustment_id"),
    customerId: requiredString(row, "customer_id"),
    serviceId: requiredString(row, "service_id"),
    invoiceId: requiredString(row, "invoice_id"),
    sourceApprovedBillingScopeId: typeof row.source_approved_billing_scope_id === "string" ? row.source_approved_billing_scope_id : null,
    successorApprovedBillingScopeId: typeof row.successor_approved_billing_scope_id === "string" ? row.successor_approved_billing_scope_id : null,
    creditedAmount: money(row.credited_amount),
    eligibleAmount: money(row.eligible_credit_amount),
    refundedAmount: money(row.refunded_amount),
    appliedAmount: money(row.applied_amount),
    availableAmount: money(row.available_amount),
    reasonCode: row.reason_code as CustomerCreditAdjustmentBalance["reasonCode"],
    reason: requiredString(row, "reason"),
    effectiveDate: requiredString(row, "effective_date"),
    createdBy: requiredString(row, "created_by"),
    createdAt: requiredString(row, "created_at"),
  }));
}

export async function getEligibleCustomerCreditInvoices(
  customerId: string,
  sourceInvoiceId?: string,
): Promise<CustomerInvoiceReceivableBalance[]> {
  await requirePermission("payments:read");
  const supabase = createAdminClient() as unknown as CreditQueryClient;
  let query = supabase
    .from("customer_invoice_receivable_balances")
    .select("*")
    .eq("customer_id", customerId)
    .in("invoice_status", ["sent", "partial", "overdue"])
    .gt("outstanding_amount", 0)
    .order("invoice_number", { ascending: true })
    .limit(20);
  if (sourceInvoiceId) query = query.neq("invoice_id", sourceInvoiceId);
  const { data, error } = await query;
  if (error || !Array.isArray(data)) return [];
  return (data as Array<Record<string, unknown>>).map((row) => ({
    invoiceId: requiredString(row, "invoice_id"),
    serviceId: requiredString(row, "service_id"),
    invoiceNumber: requiredString(row, "invoice_number"),
    customerId: requiredString(row, "customer_id"),
    grossIssuedAmount: money(row.gross_issued_amount),
    creditAdjustmentAmount: money(row.credit_adjustment_amount),
    creditApplicationAmount: money(row.credit_application_amount),
    netReceivableAmount: money(row.net_receivable_amount),
    settledAmount: money(row.settled_amount),
    outstandingAmount: money(row.outstanding_amount),
    customerCreditAmount: money(row.customer_credit_amount),
    invoiceAmountPaid: money(row.invoice_amount_paid),
    invoiceBalanceDue: money(row.invoice_balance_due),
    invoiceStatus: requiredString(row, "invoice_status"),
  }));
}
