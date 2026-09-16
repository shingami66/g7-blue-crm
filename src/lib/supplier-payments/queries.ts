import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import { normalizeListPage, normalizeListPageSize } from "@/lib/pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SupplierBillPaymentHistoryItem,
  SupplierBillPaymentSummary,
  SupplierPayment,
  SupplierPaymentDetail,
  SupplierPaymentDocument,
  SupplierPaymentListItem,
  SupplierPaymentListPagination,
  SupplierPaymentListQuery,
  SupplierPaymentsListResult,
  SupplierPaymentMethod,
} from "./types";

// W6B migration is authored before generated Database types are refreshed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupplierPaymentClient(): any {
  return createAdminClient();
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value)
    ? value.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null)
    : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : 0;
}

function method(value: unknown): SupplierPaymentMethod {
  return value === "bank_transfer" || value === "cheque" ? value : "cash";
}

function mapPayment(row: Record<string, unknown>, reversal?: Record<string, unknown>): SupplierPayment {
  return {
    id: text(row.id) ?? "",
    payment_number: text(row.payment_number) ?? "",
    supplier_bill_id: text(row.supplier_bill_id) ?? "",
    supplier_id: text(row.supplier_id) ?? "",
    service_id: text(row.service_id) ?? "",
    payment_date: text(row.payment_date) ?? "",
    amount: number(row.amount),
    method: method(row.method),
    reference: text(row.reference),
    bank_name_snapshot: text(row.bank_name_snapshot),
    bank_account_name_snapshot: text(row.bank_account_name_snapshot),
    iban_snapshot: text(row.iban_snapshot),
    notes: text(row.notes),
    recorded_by: text(row.recorded_by) ?? "",
    recorded_at: text(row.recorded_at) ?? "",
    record_request_id: text(row.record_request_id) ?? "",
    reversed_at: text(reversal?.reversed_at),
    reversal_reason: text(reversal?.reason),
    status: reversal ? "reversed" : "recorded",
  };
}

function mapSummary(row: Record<string, unknown>): SupplierBillPaymentSummary {
  const paymentStatus = row.payment_status === "paid" || row.payment_status === "partially_paid" ? row.payment_status : "unpaid";
  return {
    supplier_bill_id: text(row.supplier_bill_id) ?? "",
    bill_number: text(row.bill_number) ?? "",
    currency: text(row.currency) ?? "SAR",
    payable_amount: number(row.payable_amount),
    paid_amount: number(row.paid_amount),
    advance_allocated_amount: number(row.advance_allocated_amount),
    outstanding_amount: number(row.outstanding_amount),
    payment_status: paymentStatus,
  };
}

const SUPPLIER_PAYMENT_LIST_SELECT =
  "id,payment_number,supplier_bill_id,supplier_id,payment_date,amount,method";

type SupplierPaymentClient = ReturnType<typeof getSupplierPaymentClient>;
type SupplierPaymentEnriched = SupplierPayment & {
  bill_number: string;
  supplier_name: string;
  service_number: string;
  service_title: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reversalMap(supabase: any, paymentIds: string[]) {
  if (!paymentIds.length) return new Map<string, Record<string, unknown>>();
  const { data } = await supabase.from("supplier_payment_reversals").select("supplier_payment_id,reason,reversed_by,reversed_at").in("supplier_payment_id", paymentIds);
  return new Map(rows(data).map((row) => [text(row.supplier_payment_id) ?? "", row]));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichPayments(supabase: any, baseRows: Record<string, unknown>[]) {
  const payments = baseRows.map((row) => mapPayment(row));
  const reversalByPayment = await reversalMap(supabase, payments.map((payment) => payment.id).filter(Boolean));
  const enriched = payments.map((payment) => {
    const reversal = reversalByPayment.get(payment.id);
    return {
      ...payment,
      reversed_at: text(reversal?.reversed_at),
      reversal_reason: text(reversal?.reason),
      status: reversal ? "reversed" : "recorded",
    } satisfies SupplierPayment;
  });
  const billIds = [...new Set(enriched.map((payment) => payment.supplier_bill_id).filter(Boolean))];
  const supplierIds = [...new Set(enriched.map((payment) => payment.supplier_id).filter(Boolean))];
  const serviceIds = [...new Set(enriched.map((payment) => payment.service_id).filter(Boolean))];
  const [billsResult, suppliersResult, servicesResult] = await Promise.all([
    billIds.length ? supabase.from("supplier_bills").select("id,bill_number,total_amount,currency").in("id", billIds) : Promise.resolve({ data: [] }),
    supplierIds.length ? supabase.from("suppliers").select("id,name,display_name").in("id", supplierIds) : Promise.resolve({ data: [] }),
    serviceIds.length ? supabase.from("services").select("id,service_number,service_title").in("id", serviceIds) : Promise.resolve({ data: [] }),
  ]);
  const bills = new Map(rows(billsResult.data).map((row) => [text(row.id) ?? "", row]));
  const suppliers = new Map(rows(suppliersResult.data).map((row) => [text(row.id) ?? "", text(row.display_name) ?? text(row.name) ?? "—"]));
  const services = new Map(rows(servicesResult.data).map((row) => [text(row.id) ?? "", { number: text(row.service_number) ?? "—", title: text(row.service_title) ?? "—" }]));
  return enriched.map((payment) => {
    const bill = bills.get(payment.supplier_bill_id) ?? {};
    const service = services.get(payment.service_id) ?? { number: "—", title: "—" };
    return {
      ...payment,
      bill_number: text(bill.bill_number) ?? "—",
      supplier_name: suppliers.get(payment.supplier_id) ?? "—",
      service_number: service.number,
      service_title: service.title,
    } satisfies SupplierPaymentEnriched;
  });
}

function emptySupplierPaymentsResult(
  pageSize: ReturnType<typeof normalizeListPageSize>,
): SupplierPaymentsListResult {
  return {
    payments: [],
    pagination: { page: 1, pageSize, total: 0, totalPages: 1 },
    error: "supplier_payments_load_failed",
  };
}

async function getSupplierPaymentsCount(supabase: SupplierPaymentClient): Promise<number | null> {
  const { count, error: countError } = await supabase
    .from("supplier_payments")
    .select("id", { count: "exact", head: true });
  return countError ? null : count ?? 0;
}

function getSupplierPaymentsPagination(
  total: number,
  requestedPage: number | undefined,
  pageSize: ReturnType<typeof normalizeListPageSize>,
): SupplierPaymentListPagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page: Math.min(normalizeListPage(requestedPage), totalPages),
    pageSize,
    total,
    totalPages,
  };
}

async function getSupplierPaymentListRows(
  supabase: SupplierPaymentClient,
  pagination: SupplierPaymentListPagination,
): Promise<Record<string, unknown>[] | null> {
  const rangeStart = (pagination.page - 1) * pagination.pageSize;
  const { data: paymentQueryData, error: paymentQueryError } = await supabase
    .from("supplier_payments")
    .select(SUPPLIER_PAYMENT_LIST_SELECT)
    .order("payment_date", { ascending: false })
    .order("payment_number", { ascending: true })
    .order("id", { ascending: true })
    .range(rangeStart, rangeStart + pagination.pageSize - 1);
  return paymentQueryError ? null : rows(paymentQueryData);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reversedPaymentIds(supabase: any, paymentIds: string[]): Promise<Set<string>> {
  if (!paymentIds.length) return new Set<string>();
  const { data } = await supabase
    .from("supplier_payment_reversals")
    .select("supplier_payment_id")
    .in("supplier_payment_id", paymentIds);
  return new Set(
    rows(data)
      .map((row) => text(row.supplier_payment_id))
      .filter((id): id is string => Boolean(id)),
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function enrichSupplierPaymentListRows(supabase: any, baseRows: Record<string, unknown>[]): Promise<SupplierPaymentListItem[]> {
  const paymentIds = baseRows.map((row) => text(row.id)).filter((id): id is string => Boolean(id));
  const billIds = [...new Set(baseRows.map((row) => text(row.supplier_bill_id)).filter((id): id is string => Boolean(id)))];
  const supplierIds = [...new Set(baseRows.map((row) => text(row.supplier_id)).filter((id): id is string => Boolean(id)))];
  const [reversedIds, billsResult, suppliersResult] = await Promise.all([
    reversedPaymentIds(supabase, paymentIds),
    billIds.length ? supabase.from("supplier_bills").select("id,bill_number").in("id", billIds) : Promise.resolve({ data: [] }),
    supplierIds.length ? supabase.from("suppliers").select("id,name,display_name").in("id", supplierIds) : Promise.resolve({ data: [] }),
  ]);
  const billNumbers = new Map(rows(billsResult.data).map((row) => [text(row.id) ?? "", text(row.bill_number) ?? "—"]));
  const supplierNames = new Map(rows(suppliersResult.data).map((row) => [text(row.id) ?? "", text(row.display_name) ?? text(row.name) ?? "—"]));
  return baseRows.map((row) => {
    const id = text(row.id) ?? "";
    const supplierBillId = text(row.supplier_bill_id) ?? "";
    const supplierId = text(row.supplier_id) ?? "";
    return {
      id,
      payment_number: text(row.payment_number) ?? "",
      supplier_bill_id: supplierBillId,
      payment_date: text(row.payment_date) ?? "",
      amount: number(row.amount),
      method: method(row.method),
      bill_number: billNumbers.get(supplierBillId) ?? "—",
      supplier_name: supplierNames.get(supplierId) ?? "—",
      status: reversedIds.has(id) ? "reversed" : "recorded",
    } satisfies SupplierPaymentListItem;
  });
}

export async function getSupplierPaymentsList(
  options: SupplierPaymentListQuery = {},
): Promise<SupplierPaymentsListResult> {
  await requirePermission(SUPPLIER_PAYMENT_PERMISSIONS.read);
  const pageSize = normalizeListPageSize(options.pageSize);
  const supabase = getSupplierPaymentClient();
  const total = await getSupplierPaymentsCount(supabase);
  if (total === null) return emptySupplierPaymentsResult(pageSize);
  const pagination = getSupplierPaymentsPagination(total, options.page, pageSize);
  const paymentRows = await getSupplierPaymentListRows(supabase, pagination);
  if (!paymentRows) return emptySupplierPaymentsResult(pageSize);
  return {
    payments: await enrichSupplierPaymentListRows(supabase, paymentRows),
    pagination,
  };
}

export async function getSupplierBillPaymentSummary(billId: string): Promise<SupplierBillPaymentSummary | null> {
  await requirePermission(SUPPLIER_PAYMENT_PERMISSIONS.read);
  const { data, error } = await getSupplierPaymentClient().from("supplier_bill_payment_balances").select("*").eq("supplier_bill_id", billId).maybeSingle();
  if (error || !data) return null;
  return mapSummary(data as Record<string, unknown>);
}

export async function getSupplierBillPaymentHistory(billId: string): Promise<SupplierBillPaymentHistoryItem[]> {
  await requirePermission(SUPPLIER_PAYMENT_PERMISSIONS.read);
  const supabase = getSupplierPaymentClient();
  const { data } = await supabase
    .from("supplier_payments")
    .select("id,payment_number,payment_date,amount,method,reference")
    .eq("supplier_bill_id", billId)
    .order("payment_date", { ascending: false })
    .order("payment_number", { ascending: true });
  const baseRows = rows(data);
  const reversalByPayment = await reversalMap(supabase, baseRows.map((row) => text(row.id) ?? "").filter(Boolean));
  return baseRows.map((row) => {
    const reversal = reversalByPayment.get(text(row.id) ?? "");
    return {
      id: text(row.id) ?? "",
      payment_number: text(row.payment_number) ?? "",
      payment_date: text(row.payment_date) ?? "",
      amount: number(row.amount),
      method: method(row.method),
      reference: text(row.reference),
      status: reversal ? "reversed" : "recorded",
      reversed_at: text(reversal?.reversed_at),
    } satisfies SupplierBillPaymentHistoryItem;
  });
}

export async function getSupplierPaymentById(id: string): Promise<{ payment: SupplierPaymentDetail | null; error?: string }> {
  await requirePermission(SUPPLIER_PAYMENT_PERMISSIONS.read);
  const supabase = getSupplierPaymentClient();
  const { data, error } = await supabase.from("supplier_payments").select("*").eq("id", id).maybeSingle();
  if (error) return { payment: null, error: "supplier_payment_load_failed" };
  if (!data) return { payment: null };
  const row = data as Record<string, unknown>;
  const payment = (await enrichPayments(supabase, [row]))[0];
  const [summaryResult, reversalResult, documentsResult] = await Promise.all([
    supabase.from("supplier_bill_payment_balances").select("*").eq("supplier_bill_id", payment.supplier_bill_id).maybeSingle(),
    supabase.from("supplier_payment_reversals").select("reason,reversed_by,reversed_at").eq("supplier_payment_id", payment.id).maybeSingle(),
    supabase.from("supplier_payment_documents").select("document_id,attached_at").eq("supplier_payment_id", payment.id).order("attached_at", { ascending: true }),
  ]);
  const reversal = (reversalResult.data ?? undefined) as Record<string, unknown> | undefined;
  const reversedById = text(reversal?.reversed_by);
  const reversedByResult = reversedById
    ? await supabase.from("app_users").select("id,name,email").eq("id", reversedById).maybeSingle()
    : { data: null };
  const reversedBy = (reversedByResult.data ?? undefined) as Record<string, unknown> | undefined;
  const reversedByName = text(reversedBy?.name)?.trim() || text(reversedBy?.email);
  const bill = (summaryResult.data ?? {}) as Record<string, unknown>;
  const documentLinks = rows(documentsResult.data);
  const documentIds = documentLinks.map((link) => text(link.document_id)).filter((value): value is string => Boolean(value));
  const metadataResult = documentIds.length
    ? await supabase.from("business_documents").select("id,original_filename,mime_type,file_size").in("id", documentIds)
    : { data: [] };
  const metadata = new Map(rows(metadataResult.data).map((item) => [text(item.id) ?? "", item]));
  const documents: SupplierPaymentDocument[] = documentLinks.map((link) => {
    const meta = metadata.get(text(link.document_id) ?? "") ?? {};
    return {
      document_id: text(link.document_id) ?? "",
      original_filename: text(meta.original_filename) ?? "payment evidence",
      mime_type: text(meta.mime_type) ?? "application/octet-stream",
      file_size: number(meta.file_size),
      attached_at: text(link.attached_at) ?? "",
    };
  });
  const effective = { ...payment, ...mapPayment(row, reversal) };
  return {
    payment: {
      ...effective,
      bill_currency: text(bill.currency) ?? "SAR",
      bill_total: number(bill.payable_amount),
      outstanding_amount: number(bill.outstanding_amount),
      documents,
      reversed_by_name: reversedByName,
    },
  };
}
