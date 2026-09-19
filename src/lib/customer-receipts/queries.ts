import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { buildIlikeOrFilter } from "@/lib/search/server";
import { sanitizeSearchTerm } from "@/lib/search/sanitize";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  CustomerOption,
  CustomerReceiptAllocation,
  CustomerReceiptMethod,
  CustomerReceiptWorkspaceData,
  CustomerReceiptWorkspaceQuery,
  EligibleCustomerInvoice,
} from "./types";

type QueryResponse<T> = {
  data: T;
  error: { message: string } | null;
  count?: number | null;
};

type QueryBuilder = {
  select: (columns?: string, options?: Record<string, unknown>) => QueryBuilder;
  eq: (column: string, value: unknown) => QueryBuilder;
  in: (column: string, values: string[]) => QueryBuilder;
  is: (column: string, value: unknown) => QueryBuilder;
  or: (filter: string) => QueryBuilder;
  ilike: (column: string, value: string) => QueryBuilder;
  gt: (column: string, value: unknown) => QueryBuilder;
  order: (column: string, options?: { ascending?: boolean }) => QueryBuilder;
  limit: (value: number) => QueryBuilder;
  range: (from: number, to: number) => QueryBuilder;
} & PromiseLike<QueryResponse<unknown>>;

type ReceiptSupabaseClient = {
  from: (table: string) => QueryBuilder;
};

interface ReceiptViewRow {
  payment_id: string;
  payment_number: string;
  customer_id: string;
  date: string;
  receipt_amount: number | string;
  method: string;
  reference?: string | null;
  notes?: string | null;
  allocated_amount: number | string;
  unapplied_amount: number | string;
  receipt_status: string;
  created_at: string;
}

interface AllocationRow {
  id: string;
  payment_id: string;
  invoice_id: string;
  amount: number | string;
  allocated_at: string;
  allocated_by: string;
  customer_receipt_allocation_reversals?: Array<{ id: string }> | { id: string } | null;
}

interface CustomerRow {
  id: string;
  company?: string | null;
  contact?: string | null;
}

function money(value: unknown): number {
  const numeric = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function customerLabel(row: { company?: string | null; contact?: string | null }): string {
  return row.company?.trim() || row.contact?.trim() || "—";
}

async function getCustomerOptions(supabase: ReceiptSupabaseClient, rawSearch?: string): Promise<CustomerOption[]> {
  const search = sanitizeSearchTerm(rawSearch ?? "");
  let customerQuery = supabase
    .from("customers")
    .select("id, company, contact")
    .eq("is_deleted", false)
    .eq("status", "active")
    .order("company", { ascending: true })
    .limit(50);
  if (search) {
    customerQuery = customerQuery.or(buildIlikeOrFilter(["company", "contact"], search) ?? "id.is.null");
  }
  const { data, error } = await customerQuery;

  if (error) throw new Error("customer_receipts_customers_failed");
  const rows = Array.isArray(data) ? data as CustomerRow[] : [];
  return rows.map((row) => ({ id: row.id, label: customerLabel(row) }));
}

export async function searchCustomerOptions(rawSearch?: string): Promise<CustomerOption[]> {
  await requirePermission("payments:read");
  const supabase = createAdminClient() as unknown as ReceiptSupabaseClient;
  return getCustomerOptions(supabase, rawSearch);
}

export async function getCustomerReceiptWorkspaceData(
  query: CustomerReceiptWorkspaceQuery,
): Promise<CustomerReceiptWorkspaceData> {
  await requirePermission("payments:read");
  const supabase = createAdminClient() as unknown as ReceiptSupabaseClient;
  const search = sanitizeSearchTerm(query.search ?? "");

  let customerIds: string[] = [];
  if (search) {
    const customerFilter = buildIlikeOrFilter(["company", "contact"], search);
    const { data, error } = await supabase
      .from("customers")
      .select("id")
      .eq("is_deleted", false)
      .or(customerFilter ?? "id.is.null")
      .limit(50);
    if (error) throw new Error("customer_receipts_search_failed");
    customerIds = (Array.isArray(data) ? data as Array<{ id: string }> : []).map((row) => row.id);
  }

  let countQuery = supabase
    .from("customer_receipt_balances")
    .select("payment_id", { count: "exact", head: true });
  let dataQuery = supabase
    .from("customer_receipt_balances")
    .select("*");
  const directFilter = search ? buildIlikeOrFilter(["payment_number", "reference"], search) : undefined;
  const relatedFilter = customerIds.length > 0 ? `customer_id.in.(${customerIds.join(",")})` : undefined;
  const combinedFilter = [directFilter, relatedFilter].filter(Boolean).join(",");

  if (search && !combinedFilter) {
    return {
      receipts: [],
      customers: await getCustomerOptions(supabase),
      pagination: { page: 1, pageSize: query.pageSize, total: 0, totalPages: 1 },
    };
  }
  if (combinedFilter) {
    countQuery = countQuery.or(combinedFilter);
    dataQuery = dataQuery.or(combinedFilter);
  }

  const { count, error: countError } = await countQuery;
  if (countError) throw new Error("customer_receipts_count_failed");

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / query.pageSize));
  const page = Math.min(Math.max(query.page, 1), totalPages);
  const rangeStart = (page - 1) * query.pageSize;
  const { data, error } = await dataQuery
    .order("created_at", { ascending: false })
    .range(rangeStart, rangeStart + query.pageSize - 1);
  if (error) throw new Error("customer_receipts_data_failed");

  const rows = (Array.isArray(data) ? data : []) as ReceiptViewRow[];
  const paymentIds = rows.map((row) => row.payment_id);
  const customerIdSet = [...new Set(rows.map((row) => row.customer_id))];

  const [allocationResult, customerResult] = await Promise.all([
    paymentIds.length > 0
      ? supabase
        .from("customer_receipt_allocations")
        .select("id, payment_id, invoice_id, customer_id, amount, allocated_at, allocated_by, customer_receipt_allocation_reversals(id)")
        .in("payment_id", paymentIds)
        .limit(Math.max(50, paymentIds.length * 20))
      : Promise.resolve({ data: [], error: null }),
    customerIdSet.length > 0
      ? supabase.from("customers").select("id, company, contact").in("id", customerIdSet).limit(customerIdSet.length)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (allocationResult.error || customerResult.error) throw new Error("customer_receipts_detail_failed");

  const allocationRows = (Array.isArray(allocationResult.data) ? allocationResult.data : []) as AllocationRow[];
  const invoiceIds = [...new Set(allocationRows.map((row) => row.invoice_id))];
  const { data: invoiceRows, error: invoiceError } = invoiceIds.length > 0
    ? await supabase.from("invoices").select("id, invoice_number").in("id", invoiceIds).limit(invoiceIds.length)
    : { data: [], error: null };
  if (invoiceError) throw new Error("customer_receipts_invoice_detail_failed");

  const invoiceRowsTyped = (Array.isArray(invoiceRows) ? invoiceRows : []) as Array<{ id: string; invoice_number: string | null }>;
  const customerRowsTyped = (Array.isArray(customerResult.data) ? customerResult.data : []) as CustomerRow[];
  const invoiceNumberById = new Map<string, string | null>(
    invoiceRowsTyped.map((row): [string, string | null] => [row.id, row.invoice_number ?? null]),
  );
  const customerNameById = new Map<string, string>(
    customerRowsTyped.map((row): [string, string] => [row.id, customerLabel(row)]),
  );
  const allocationsByPayment = new Map<string, CustomerReceiptAllocation[]>();
  for (const row of allocationRows) {
    const allocation: CustomerReceiptAllocation = {
      id: row.id,
      paymentId: row.payment_id,
      invoiceId: row.invoice_id,
      invoiceNumber: invoiceNumberById.get(row.invoice_id) ?? null,
      amount: money(row.amount),
      allocatedAt: row.allocated_at,
      allocatedBy: row.allocated_by,
      reversed: Array.isArray(row.customer_receipt_allocation_reversals)
        ? row.customer_receipt_allocation_reversals.length > 0
        : Boolean(row.customer_receipt_allocation_reversals),
    };
    const list = allocationsByPayment.get(row.payment_id) ?? [];
    list.push(allocation);
    allocationsByPayment.set(row.payment_id, list);
  }

  return {
    receipts: rows.map((row) => ({
      paymentId: row.payment_id,
      paymentNumber: row.payment_number,
      customerId: row.customer_id,
      customerName: customerNameById.get(row.customer_id) ?? "—",
      date: row.date,
      amount: money(row.receipt_amount),
      method: row.method as CustomerReceiptMethod,
      reference: row.reference ?? null,
      notes: row.notes ?? null,
      allocatedAmount: money(row.allocated_amount),
      unappliedAmount: money(row.unapplied_amount),
      receiptStatus: row.receipt_status,
      createdAt: row.created_at,
      allocations: allocationsByPayment.get(row.payment_id) ?? [],
    })),
    customers: await getCustomerOptions(supabase),
    pagination: { page, pageSize: query.pageSize, total, totalPages },
  };
}

export async function getEligibleCustomerInvoices(
  customerId: string,
  rawSearch?: string,
): Promise<EligibleCustomerInvoice[]> {
  await requirePermission("payments:read");
  const supabase = createAdminClient() as unknown as ReceiptSupabaseClient;
  const search = sanitizeSearchTerm(rawSearch ?? "");
  let invoiceQuery = supabase
    .from("customer_invoice_settlement_balances")
    .select("invoice_id, invoice_number, customer_id, grand_total, outstanding_amount, invoice_amount_paid, invoice_balance_due, invoice_status")
    .eq("customer_id", customerId)
    .in("invoice_status", ["sent", "partial"])
    .gt("outstanding_amount", 0)
    .order("invoice_number", { ascending: true })
    .limit(20);
  if (search) {
    invoiceQuery = invoiceQuery.ilike("invoice_number", `%${search}%`);
  }
  const { data, error } = await invoiceQuery;
  if (error) throw new Error("customer_receipts_invoice_search_failed");
  const rows = (Array.isArray(data) ? data : []) as Array<Record<string, unknown>>;
  return rows.map((row) => ({
    invoiceId: String(row.invoice_id),
    invoiceNumber: String(row.invoice_number),
    customerId: String(row.customer_id),
    grandTotal: money(row.grand_total),
    outstandingAmount: money(row.outstanding_amount),
    invoiceAmountPaid: money(row.invoice_amount_paid),
    invoiceBalanceDue: money(row.invoice_balance_due),
    invoiceStatus: String(row.invoice_status),
  }));
}
