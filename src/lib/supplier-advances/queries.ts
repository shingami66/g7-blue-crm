import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { SUPPLIER_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { normalizeListPage, normalizeListPageSize } from "@/lib/pagination";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SupplierAdvanceAllocation,
  SupplierAdvanceBalance,
  SupplierAdvanceBillOption,
  SupplierAdvanceCommitmentOption,
  SupplierAdvanceDetail,
  SupplierAdvanceDocument,
  SupplierAdvanceListItem,
  SupplierAdvanceListPagination,
  SupplierAdvanceListQuery,
  SupplierAdvancesListResult,
  SupplierAdvancePayment,
  SupplierAdvanceRefund,
  SupplierBillAdvanceAllocationHistoryItem,
} from "./types";

// W6C migration is authored before generated Supabase types are refreshed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function client(): any {
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

function maskIban(value: string | null): string | null {
  const normalized = value?.replace(/\s/g, "") ?? "";
  return normalized ? `••••${normalized.slice(-4)}` : null;
}

function mapBalance(row: Record<string, unknown>): SupplierAdvanceBalance {
  const status = row.status === "paid" || row.status === "partially_paid" ? row.status : "authorized";
  return {
    supplier_advance_id: text(row.supplier_advance_id) ?? "",
    advance_number: text(row.advance_number) ?? "",
    commitment_id: text(row.commitment_id) ?? "",
    supplier_id: text(row.supplier_id) ?? "",
    service_id: text(row.service_id) ?? "",
    currency: text(row.currency)?.trim() ?? "",
    authorized_amount: number(row.authorized_amount),
    paid_amount: number(row.paid_amount),
    allocated_amount: number(row.allocated_amount),
    refunded_amount: number(row.refunded_amount),
    reversed_amount: number(row.reversed_amount),
    remaining_unallocated_amount: number(row.remaining_unallocated_amount),
    status,
  };
}

function displayName(row: Record<string, unknown> | undefined, fallback: string): string {
  return text(row?.name)?.trim() || text(row?.email)?.trim() || fallback;
}

async function namesById(supabase: ReturnType<typeof client>, ids: string[]): Promise<Map<string, string>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))];
  if (!uniqueIds.length) return new Map();
  const { data, error } = await supabase.from("app_users").select("id,name,email").in("id", uniqueIds);
  if (error) throw new Error("Supplier Advance audit identities could not be loaded");
  return new Map(rows(data).map((row) => [text(row.id) ?? "", displayName(row, "Unavailable")]));
}

async function commitmentContext(supabase: ReturnType<typeof client>, commitmentIds: string[]) {
  const uniqueIds = [...new Set(commitmentIds.filter(Boolean))];
  if (!uniqueIds.length) return new Map<string, { source: string; reference: string | null }>();
  const { data, error } = await supabase
    .from("approved_commitment_balances")
    .select("id,commitment_source,source_reference,supplier_quotation_id")
    .in("id", uniqueIds);
  if (error) throw new Error("Supplier Advance commitment context could not be loaded");
  const commitments = rows(data);
  const quotationIds = commitments.map((row) => text(row.supplier_quotation_id)).filter((value): value is string => Boolean(value));
  const quotationResult = quotationIds.length
    ? await supabase.from("supplier_quotations").select("id,supplier_reference").in("id", quotationIds)
    : { data: [] };
  if (quotationResult.error) throw new Error("Supplier Advance quotation context could not be loaded");
  const quotations = new Map(rows(quotationResult.data).map((row) => [text(row.id) ?? "", text(row.supplier_reference)]));
  return new Map(commitments.map((row) => {
    const quotationId = text(row.supplier_quotation_id);
    return [text(row.id) ?? "", {
      source: text(row.commitment_source) ?? "other_authorized",
      reference: text(row.source_reference) ?? (quotationId ? quotations.get(quotationId) ?? null : null),
    }];
  }));
}

async function enrichListItems(
  supabase: ReturnType<typeof client>,
  base: Array<Pick<SupplierAdvanceBalance, "supplier_advance_id" | "advance_number" | "commitment_id" | "supplier_id" | "service_id" | "currency" | "authorized_amount" | "status">>,
  authorizedAtById: Map<string, string>,
): Promise<SupplierAdvanceListItem[]> {
  const supplierIds = [...new Set(base.map((item) => item.supplier_id).filter(Boolean))];
  const serviceIds = [...new Set(base.map((item) => item.service_id).filter(Boolean))];
  const context = await commitmentContext(supabase, base.map((item) => item.commitment_id));
  const [supplierResult, serviceResult] = await Promise.all([
    supplierIds.length ? supabase.from("suppliers").select("id,name,display_name").in("id", supplierIds) : Promise.resolve({ data: [] }),
    serviceIds.length ? supabase.from("services").select("id,service_number,service_title,event_name").in("id", serviceIds) : Promise.resolve({ data: [] }),
  ]);
  if (supplierResult.error || serviceResult.error) throw new Error("Supplier Advance business context could not be loaded");
  const suppliers = new Map(rows(supplierResult.data).map((row) => [text(row.id) ?? "", text(row.display_name) ?? text(row.name) ?? "—"]));
  const services = new Map(rows(serviceResult.data).map((row) => [text(row.id) ?? "", {
    number: text(row.service_number) ?? "—",
    title: text(row.event_name) ?? text(row.service_title) ?? "—",
  }]));
  return base.map((item) => {
    const service = services.get(item.service_id);
    const commitment = context.get(item.commitment_id);
    return {
      ...item,
      supplier_name: suppliers.get(item.supplier_id) ?? "—",
      service_number: service?.number ?? "—",
      service_title: service?.title ?? "—",
      commitment_source: commitment?.source ?? "other_authorized",
      commitment_reference: commitment?.reference ?? null,
      authorized_at: authorizedAtById.get(item.supplier_advance_id) ?? "",
    };
  });
}

const SUPPLIER_ADVANCE_LIST_SELECT =
  "supplier_advance_id,advance_number,commitment_id,supplier_id,service_id,currency,authorized_amount,authorized_at,status";

type SupplierAdvanceClient = ReturnType<typeof client>;

function emptySupplierAdvancesResult(
  pageSize: ReturnType<typeof normalizeListPageSize>,
): SupplierAdvancesListResult {
  return {
    advances: [],
    pagination: { page: 1, pageSize, total: 0, totalPages: 1 },
    error: "supplier_advances_load_failed",
  };
}

async function getSupplierAdvancesCount(supabase: SupplierAdvanceClient): Promise<number | null> {
  const { count, error: countError } = await supabase
    .from("supplier_advance_balances")
    .select("supplier_advance_id", { count: "exact", head: true });
  return countError ? null : count ?? 0;
}

function getSupplierAdvancesPagination(
  total: number,
  requestedPage: number | undefined,
  pageSize: ReturnType<typeof normalizeListPageSize>,
): SupplierAdvanceListPagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page: Math.min(normalizeListPage(requestedPage), totalPages),
    pageSize,
    total,
    totalPages,
  };
}

async function getSupplierAdvanceListRows(
  supabase: SupplierAdvanceClient,
  pagination: SupplierAdvanceListPagination,
): Promise<Record<string, unknown>[] | null> {
  const rangeStart = (pagination.page - 1) * pagination.pageSize;
  const { data: advanceQueryData, error: advanceQueryError } = await supabase
    .from("supplier_advance_balances")
    .select(SUPPLIER_ADVANCE_LIST_SELECT)
    .order("authorized_at", { ascending: false })
    .order("advance_number", { ascending: true })
    .order("supplier_advance_id", { ascending: true })
    .range(rangeStart, rangeStart + pagination.pageSize - 1);
  return advanceQueryError ? null : rows(advanceQueryData);
}

export async function getSupplierAdvancesList(
  options: SupplierAdvanceListQuery = {},
): Promise<SupplierAdvancesListResult> {
  await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.read);
  const supabase = client();
  const pageSize = normalizeListPageSize(options.pageSize);
  const total = await getSupplierAdvancesCount(supabase);
  if (total === null) return emptySupplierAdvancesResult(pageSize);
  const pagination = getSupplierAdvancesPagination(total, options.page, pageSize);
  const balanceRows = await getSupplierAdvanceListRows(supabase, pagination);
  if (!balanceRows) return emptySupplierAdvancesResult(pageSize);
  const base = balanceRows.map((row) => ({
    supplier_advance_id: text(row.supplier_advance_id) ?? "",
    advance_number: text(row.advance_number) ?? "",
    commitment_id: text(row.commitment_id) ?? "",
    supplier_id: text(row.supplier_id) ?? "",
    service_id: text(row.service_id) ?? "",
    currency: text(row.currency)?.trim() ?? "",
    authorized_amount: number(row.authorized_amount),
    status: row.status === "paid" || row.status === "partially_paid" ? row.status : "authorized",
  } satisfies Pick<SupplierAdvanceBalance, "supplier_advance_id" | "advance_number" | "commitment_id" | "supplier_id" | "service_id" | "currency" | "authorized_amount" | "status">));
  const times = new Map(balanceRows.map((row) => [text(row.supplier_advance_id) ?? "", text(row.authorized_at) ?? ""]));
  return { advances: await enrichListItems(supabase, base, times), pagination };
}

export async function hasEligibleSupplierAdvanceCommitments(): Promise<boolean> {
  await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.read);
  const { data, error } = await client()
    .from("supplier_advance_commitment_balances")
    .select("commitment_id")
    .eq("commitment_status", "open")
    .gt("available_authorization_amount", 0)
    .limit(1);
  if (error) throw new Error("Supplier Advance commitments could not be loaded");
  return rows(data).length > 0;
}

export async function getSupplierAdvanceCommitmentOptions(): Promise<SupplierAdvanceCommitmentOption[]> {
  await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.read);
  const supabase = client();
  const { data, error } = await supabase
    .from("supplier_advance_commitment_balances")
    .select("commitment_id,service_id,supplier_id,currency,authorized_amount,open_commitment_amount,existing_advance_reserve,available_authorization_amount,commitment_source,source_reference,supplier_quotation_reference")
    .eq("commitment_status", "open")
    .gt("available_authorization_amount", 0)
    .order("commitment_approved_at", { ascending: false });
  if (error) throw new Error("Supplier Advance commitments could not be loaded");
  const commitments = rows(data);
  const supplierIds = [...new Set(commitments.map((row) => text(row.supplier_id)).filter((value): value is string => Boolean(value)))];
  const serviceIds = [...new Set(commitments.map((row) => text(row.service_id)).filter((value): value is string => Boolean(value)))];
  const [supplierResult, serviceResult] = await Promise.all([
    supplierIds.length ? supabase.from("suppliers").select("id,name,display_name").eq("is_deleted", false).is("deleted_at", null).in("id", supplierIds) : Promise.resolve({ data: [] }),
    serviceIds.length ? supabase.from("services").select("id,service_number,service_title,event_name").is("deleted_at", null).in("id", serviceIds) : Promise.resolve({ data: [] }),
  ]);
  if (supplierResult.error || serviceResult.error) throw new Error("Supplier Advance commitment context could not be loaded");
  const suppliers = new Map(rows(supplierResult.data).map((row) => [text(row.id) ?? "", text(row.display_name) ?? text(row.name) ?? "—"]));
  const services = new Map(rows(serviceResult.data).map((row) => [text(row.id) ?? "", {
    number: text(row.service_number) ?? "—",
    title: text(row.event_name) ?? text(row.service_title) ?? "—",
  }]));
  return commitments.map((row) => {
    const id = text(row.commitment_id) ?? "";
    const supplierId = text(row.supplier_id) ?? "";
    const serviceId = text(row.service_id) ?? "";
    const service = services.get(serviceId);
    return {
      id,
      supplier_id: supplierId,
      service_id: serviceId,
      supplier_name: suppliers.get(supplierId) ?? "—",
      service_number: service?.number ?? "—",
      service_title: service?.title ?? "—",
      commitment_source: text(row.commitment_source) ?? "other_authorized",
      commitment_reference: text(row.source_reference) ?? text(row.supplier_quotation_reference),
      currency: text(row.currency)?.trim() ?? "",
      authorized_amount: number(row.authorized_amount),
      open_commitment_amount: number(row.open_commitment_amount),
      existing_advance_reserve: number(row.existing_advance_reserve),
      available_authorization_amount: number(row.available_authorization_amount),
    } satisfies SupplierAdvanceCommitmentOption;
  }).filter((row) => row.id && row.supplier_id && row.service_id);
}

export async function getSupplierAdvanceEligibleBills(advanceId: string): Promise<SupplierAdvanceBillOption[]> {
  await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.read);
  const supabase = client();
  const { data: advance, error: advanceError } = await supabase
    .from("supplier_advances")
    .select("commitment_id,service_id,supplier_id,currency")
    .eq("id", advanceId)
    .maybeSingle();
  if (advanceError) throw new Error("Supplier Advance could not be loaded");
  if (!advance) return [];
  const { data: bills, error } = await supabase
    .from("supplier_bills")
    .select("id,bill_number,invoice_number,invoice_date,currency")
    .eq("commitment_id", advance.commitment_id)
    .eq("service_id", advance.service_id)
    .eq("supplier_id", advance.supplier_id)
    .eq("currency", advance.currency)
    .eq("status", "approved")
    .order("invoice_date", { ascending: true });
  if (error) throw new Error("Supplier Advance eligible bills could not be loaded");
  if (!bills?.length) return [];
  const ids = rows(bills).map((row) => text(row.id) ?? "").filter(Boolean);
  const { data: balances, error: balanceError } = await supabase
    .from("supplier_bill_payment_balances")
    .select("supplier_bill_id,payable_amount,paid_amount,advance_allocated_amount,outstanding_amount")
    .in("supplier_bill_id", ids);
  if (balanceError) throw new Error("Supplier Bill balances could not be loaded");
  const balanceById = new Map(rows(balances).map((row) => [text(row.supplier_bill_id) ?? "", row]));
  return rows(bills).map((bill) => {
    const id = text(bill.id) ?? "";
    const balance = balanceById.get(id) ?? {};
    return {
      id,
      bill_number: text(bill.bill_number) ?? "",
      invoice_number: text(bill.invoice_number) ?? "",
      invoice_date: text(bill.invoice_date) ?? "",
      currency: text(bill.currency)?.trim() ?? "",
      payable_amount: number(balance.payable_amount),
      paid_amount: number(balance.paid_amount),
      advance_allocated_amount: number(balance.advance_allocated_amount),
      outstanding_amount: number(balance.outstanding_amount),
    } satisfies SupplierAdvanceBillOption;
  }).filter((bill) => bill.id && bill.outstanding_amount > 0);
}

async function documentsForEventRows(
  supabase: ReturnType<typeof client>,
  relation: string,
  foreignKey: string,
  ids: string[],
  kind: SupplierAdvanceDocument["kind"],
): Promise<Map<string, SupplierAdvanceDocument[]>> {
  const keys = [...new Set(ids.filter(Boolean))];
  if (!keys.length) return new Map();
  const { data: links, error: linkError } = await supabase.from(relation).select(`${foreignKey},document_id,attached_at`).in(foreignKey, keys);
  if (linkError) throw new Error("Supplier Advance evidence links could not be loaded");
  const linkRows = rows(links);
  const documentIds = linkRows.map((row) => text(row.document_id)).filter((value): value is string => Boolean(value));
  const { data: metadata, error: metadataError } = documentIds.length
    ? await supabase.from("business_documents").select("id,original_filename,mime_type,file_size").in("id", documentIds)
    : { data: [] };
  if (metadataError) throw new Error("Supplier Advance evidence metadata could not be loaded");
  const metadataById = new Map(rows(metadata).map((row) => [text(row.id) ?? "", row]));
  const grouped = new Map<string, SupplierAdvanceDocument[]>();
  for (const link of linkRows) {
    const eventId = text(link[foreignKey]) ?? "";
    const documentId = text(link.document_id) ?? "";
    const meta = metadataById.get(documentId) ?? {};
    const entry: SupplierAdvanceDocument = {
      document_id: documentId,
      original_filename: text(meta.original_filename) ?? "evidence",
      mime_type: text(meta.mime_type) ?? "application/octet-stream",
      file_size: number(meta.file_size),
      attached_at: text(link.attached_at) ?? "",
      kind,
      event_id: eventId,
    };
    grouped.set(eventId, [...(grouped.get(eventId) ?? []), entry]);
  }
  return grouped;
}

export async function getSupplierAdvanceById(id: string): Promise<{ advance: SupplierAdvanceDetail | null; error?: string }> {
  await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.read);
  const supabase = client();
  const { data: rawAdvance, error } = await supabase.from("supplier_advances").select("*").eq("id", id).maybeSingle();
  if (error) return { advance: null, error: "supplier_advance_load_failed" };
  if (!rawAdvance) return { advance: null };
  const advance = rawAdvance as Record<string, unknown>;
  const [balanceResult, supplierResult, serviceResult, commitmentResult, capacityResult, paymentResult, allocationResult, refundResult] = await Promise.all([
    supabase.from("supplier_advance_balances").select("*").eq("supplier_advance_id", id).maybeSingle(),
    supabase.from("suppliers").select("id,name,display_name").eq("id", text(advance.supplier_id) ?? "").maybeSingle(),
    supabase.from("services").select("id,service_number,service_title,event_name").eq("id", text(advance.service_id) ?? "").maybeSingle(),
    supabase.from("approved_commitment_balances").select("commitment_source,source_reference,supplier_quotation_id,original_approved_amount,authorized_amount,currency,status").eq("id", text(advance.commitment_id) ?? "").maybeSingle(),
    supabase.from("supplier_advance_commitment_balances").select("open_commitment_amount,existing_advance_reserve,available_authorization_amount").eq("commitment_id", text(advance.commitment_id) ?? "").maybeSingle(),
    supabase.from("supplier_advance_payments").select("*").eq("supplier_advance_id", id).order("payment_date", { ascending: false }).order("payment_number", { ascending: true }),
    supabase.from("supplier_advance_allocations").select("*").eq("supplier_advance_id", id).order("allocated_at", { ascending: false }),
    supabase.from("supplier_advance_refunds").select("*").eq("supplier_advance_id", id).order("business_date", { ascending: false }).order("refund_number", { ascending: true }),
  ]);
  if ([balanceResult, supplierResult, serviceResult, commitmentResult, capacityResult, paymentResult, allocationResult, refundResult].some((result) => result.error)
    || !balanceResult.data || !commitmentResult.data || !capacityResult.data) {
    return { advance: null, error: "supplier_advance_load_failed" };
  }
  const balance = mapBalance((balanceResult.data ?? {}) as Record<string, unknown>);
  const [context, authorizationDocuments] = await Promise.all([
    commitmentContext(supabase, [text(advance.commitment_id) ?? ""]),
    documentsForEventRows(supabase, "supplier_advance_authorization_documents", "supplier_advance_id", [id], "authorization"),
  ]);
  const commitment = (commitmentResult.data ?? {}) as Record<string, unknown>;
  const capacity = (capacityResult.data ?? {}) as Record<string, unknown>;
  const quotationId = text(commitment.supplier_quotation_id);
  const quotationResult = quotationId
    ? await supabase.from("supplier_quotations").select("supplier_reference").eq("id", quotationId).maybeSingle()
    : { data: null };
  const supplier = (supplierResult.data ?? {}) as Record<string, unknown>;
  const service = (serviceResult.data ?? {}) as Record<string, unknown>;
  const serviceNumber = text(service.service_number) ?? "—";
  const serviceTitle = text(service.event_name) ?? text(service.service_title) ?? "—";
  const commitmentDetails = context.get(balance.commitment_id);

  const paymentRows = rows(paymentResult.data);
  const paymentIds = paymentRows.map((row) => text(row.id) ?? "").filter(Boolean);
  const [paymentReversalResult, paymentDocs, allocationRows, refundRows] = await Promise.all([
    paymentIds.length ? supabase.from("supplier_advance_payment_reversals").select("supplier_advance_payment_id,reason,reversed_by,reversed_at").in("supplier_advance_payment_id", paymentIds) : Promise.resolve({ data: [] }),
    documentsForEventRows(supabase, "supplier_advance_payment_documents", "supplier_advance_payment_id", paymentIds, "payment"),
    Promise.resolve(rows(allocationResult.data)),
    Promise.resolve(rows(refundResult.data)),
  ]);
  if (paymentReversalResult.error) return { advance: null, error: "supplier_advance_load_failed" };
  const allocationIds = allocationRows.map((row) => text(row.id) ?? "").filter(Boolean);
  const refundRowsValue = refundRows;
  const refundIds = refundRowsValue.map((row) => text(row.id) ?? "").filter(Boolean);
  const [actualAllocationReversals, actualRefundDocs] = await Promise.all([
    allocationIds.length ? supabase.from("supplier_advance_allocation_reversals").select("supplier_advance_allocation_id,reason,corrected_by,corrected_at").in("supplier_advance_allocation_id", allocationIds) : Promise.resolve({ data: [] }),
    documentsForEventRows(supabase, "supplier_advance_refund_documents", "supplier_advance_refund_id", refundIds, "refund"),
  ]);
  if (actualAllocationReversals.error) return { advance: null, error: "supplier_advance_load_failed" };

  const reversalByPayment = new Map(rows(paymentReversalResult.data).map((row) => [text(row.supplier_advance_payment_id) ?? "", row]));
  const reversalByAllocation = new Map(rows(actualAllocationReversals.data).map((row) => [text(row.supplier_advance_allocation_id) ?? "", row]));
  const supplierBillIds = [...new Set(allocationRows.map((row) => text(row.supplier_bill_id)).filter((value): value is string => Boolean(value)))];
  const billResult = supplierBillIds.length
    ? await supabase.from("supplier_bills").select("id,bill_number").in("id", supplierBillIds)
    : { data: [] };
  if (billResult.error) return { advance: null, error: "supplier_advance_load_failed" };
  const billNumbers = new Map(rows(billResult.data).map((row) => [text(row.id) ?? "", text(row.bill_number) ?? "—"]));
  const actorIds = [
    text(advance.authorized_by),
    ...paymentRows.map((row) => text(row.recorded_by)),
    ...[...reversalByPayment.values()].map((row) => text(row.reversed_by)),
    ...allocationRows.map((row) => text(row.allocated_by)),
    ...[...reversalByAllocation.values()].map((row) => text(row.corrected_by)),
    ...refundRowsValue.map((row) => text(row.recorded_by)),
  ].filter((value): value is string => Boolean(value));
  const userNames = await namesById(supabase, actorIds);

  const payments: SupplierAdvancePayment[] = paymentRows.map((row) => {
    const paymentId = text(row.id) ?? "";
    const reversal = reversalByPayment.get(paymentId);
    return {
      id: paymentId,
      payment_number: text(row.payment_number) ?? "",
      payment_date: text(row.payment_date) ?? "",
      amount: number(row.amount),
      method: row.method === "bank_transfer" || row.method === "cheque" ? row.method : "cash",
      reference: text(row.reference),
      notes: text(row.notes),
      bank_name_snapshot: text(row.bank_name_snapshot),
      bank_account_name_snapshot: text(row.bank_account_name_snapshot),
      iban_snapshot_masked: maskIban(text(row.iban_snapshot)),
      recorded_at: text(row.recorded_at) ?? "",
      recorded_by_name: userNames.get(text(row.recorded_by) ?? "") ?? "Unavailable",
      reversal_reason: text(reversal?.reason),
      reversed_at: text(reversal?.reversed_at),
      reversed_by_name: reversal ? userNames.get(text(reversal.reversed_by) ?? "") ?? "Unavailable" : null,
      documents: paymentDocs.get(paymentId) ?? [],
    };
  });

  const allocations: SupplierAdvanceAllocation[] = allocationRows.map((row) => {
    const allocationId = text(row.id) ?? "";
    const correction = reversalByAllocation.get(allocationId);
    return {
      id: allocationId,
      bill_id: text(row.supplier_bill_id) ?? "",
      bill_number: billNumbers.get(text(row.supplier_bill_id) ?? "") ?? "—",
      amount: number(row.amount),
      allocated_at: text(row.allocated_at) ?? "",
      allocated_by_name: userNames.get(text(row.allocated_by) ?? "") ?? "Unavailable",
      correction_reason: text(correction?.reason),
      corrected_at: text(correction?.corrected_at),
      corrected_by_name: correction ? userNames.get(text(correction.corrected_by) ?? "") ?? "Unavailable" : null,
    };
  });

  const refunds: SupplierAdvanceRefund[] = refundRowsValue.map((row) => {
    const refundId = text(row.id) ?? "";
    return {
      id: refundId,
      refund_number: text(row.refund_number) ?? "",
      business_date: text(row.business_date) ?? "",
      amount: number(row.amount),
      reason: text(row.reason) ?? "",
      reference: text(row.reference),
      recorded_at: text(row.recorded_at) ?? "",
      recorded_by_name: userNames.get(text(row.recorded_by) ?? "") ?? "Unavailable",
      documents: actualRefundDocs.get(refundId) ?? [],
    };
  });

  const baseItem = await enrichListItems(supabase, [balance], new Map([[id, text(advance.authorized_at) ?? ""]]));
  return {
    advance: {
      ...balance,
      ...baseItem[0],
      reason: text(advance.reason) ?? "",
      authorized_by_name: userNames.get(text(advance.authorized_by) ?? "") ?? "Unavailable",
      documents: authorizationDocuments.get(id) ?? [],
      payments,
      allocations,
      refunds,
      commitment_source: commitmentDetails?.source ?? "other_authorized",
      commitment_reference: text(commitment.source_reference) ?? text(quotationResult.data?.supplier_reference) ?? commitmentDetails?.reference ?? null,
      commitment_authorized_amount: number(commitment.authorized_amount),
      commitment_open_amount: number(capacity.open_commitment_amount),
      commitment_reserved_amount: number(capacity.existing_advance_reserve),
      commitment_available_authorization_amount: number(capacity.available_authorization_amount),
      service_number: serviceNumber,
      service_title: serviceTitle,
      supplier_name: text(supplier.display_name) ?? text(supplier.name) ?? "—",
    },
  };
}

export async function getSupplierBillAdvanceAllocationHistory(billId: string): Promise<SupplierBillAdvanceAllocationHistoryItem[]> {
  await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.read);
  const supabase = client();
  const { data, error } = await supabase
    .from("supplier_advance_allocations")
    .select("id,supplier_advance_id,amount,allocated_at")
    .eq("supplier_bill_id", billId)
    .order("allocated_at", { ascending: false });
  if (error || !data?.length) return [];
  const allocations = rows(data);
  const ids = allocations.map((row) => text(row.id) ?? "").filter(Boolean);
  const advances = [...new Set(allocations.map((row) => text(row.supplier_advance_id)).filter((value): value is string => Boolean(value)))];
  const [reversalResult, advanceResult] = await Promise.all([
    supabase.from("supplier_advance_allocation_reversals").select("supplier_advance_allocation_id").in("supplier_advance_allocation_id", ids),
    advances.length ? supabase.from("supplier_advances").select("id,advance_number").in("id", advances) : Promise.resolve({ data: [] }),
  ]);
  const reversed = new Set(rows(reversalResult.data).map((row) => text(row.supplier_advance_allocation_id) ?? ""));
  const numbers = new Map(rows(advanceResult.data).map((row) => [text(row.id) ?? "", text(row.advance_number) ?? "—"]));
  return allocations.map((row) => {
    const id = text(row.id) ?? "";
    const advanceId = text(row.supplier_advance_id) ?? "";
    return {
      id,
      advance_id: advanceId,
      advance_number: numbers.get(advanceId) ?? "—",
      amount: number(row.amount),
      allocated_at: text(row.allocated_at) ?? "",
      status: reversed.has(id) ? "corrected" : "allocated",
    };
  });
}
