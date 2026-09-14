import "server-only";

import { requirePermission } from "@/lib/auth/permissions";
import { SUPPLIER_BILL_PERMISSIONS } from "@/lib/auth/role-permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  SupplierBill,
  SupplierBillCommitmentOption,
  SupplierBillDetail,
  SupplierBillDocument,
  SupplierBillFormOptions,
  SupplierBillListItem,
  SupplierBillReceiptOption,
  SupplierBillServiceOption,
  SupplierBillSupplierOption,
} from "./types";

// The W6A migration is intentionally authored but not applied to the current
// generated Database type. Keep this boundary explicit until schema types are
// regenerated after the approved migration is applied.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupplierBillClient(): any {
  return createAdminClient();
}

function rows(value: unknown): Record<string, unknown>[] {
  return Array.isArray(value) ? value.filter((row): row is Record<string, unknown> => typeof row === "object" && row !== null) : [];
}

function text(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function number(value: unknown): number {
  const result = typeof value === "number" ? value : Number(value);
  return Number.isFinite(result) ? result : 0;
}

function mapBill(row: Record<string, unknown>): SupplierBill {
  return {
    id: text(row.id) ?? "",
    bill_number: text(row.bill_number) ?? "",
    service_id: text(row.service_id) ?? "",
    supplier_id: text(row.supplier_id) ?? "",
    commitment_id: text(row.commitment_id) ?? "",
    service_receipt_id: text(row.service_receipt_id) ?? "",
    invoice_number: text(row.invoice_number) ?? "",
    invoice_date: text(row.invoice_date) ?? "",
    due_date: text(row.due_date),
    currency: text(row.currency) ?? "SAR",
    subtotal: number(row.subtotal),
    vat_amount: number(row.vat_amount),
    total_amount: number(row.total_amount),
    supplier_name_snapshot: text(row.supplier_name_snapshot) ?? "",
    supplier_legal_name_snapshot: text(row.supplier_legal_name_snapshot) ?? "",
    supplier_cr_number_snapshot: text(row.supplier_cr_number_snapshot),
    supplier_vat_registration_status_snapshot: text(row.supplier_vat_registration_status_snapshot),
    supplier_vat_number_snapshot: text(row.supplier_vat_number_snapshot),
    status: row.status === "approved" ? "approved" : "pending",
    recorded_by: text(row.recorded_by) ?? "",
    recorded_at: text(row.recorded_at) ?? "",
    updated_by: text(row.updated_by) ?? "",
    updated_at: text(row.updated_at) ?? "",
    approved_by: text(row.approved_by),
    approved_at: text(row.approved_at),
    record_request_id: text(row.record_request_id) ?? "",
  };
}

export async function getSupplierBillsList(): Promise<{ bills: SupplierBillListItem[]; error?: string }> {
  await requirePermission(SUPPLIER_BILL_PERMISSIONS.read);
  const supabase = getSupplierBillClient();
  const { data, error } = await supabase
    .from("supplier_bills")
    .select("*")
    .order("invoice_date", { ascending: false })
    .order("bill_number", { ascending: true })
    .order("id", { ascending: true });
  if (error) return { bills: [], error: "supplier_bills_load_failed" };

  const bills = rows(data).map(mapBill);
  const supplierIds = [...new Set(bills.map((bill) => bill.supplier_id).filter(Boolean))];
  const serviceIds = [...new Set(bills.map((bill) => bill.service_id).filter(Boolean))];
  const [supplierResult, serviceResult] = await Promise.all([
    supplierIds.length ? supabase.from("suppliers").select("id,name,display_name,legal_name").in("id", supplierIds) : Promise.resolve({ data: [], error: null }),
    serviceIds.length ? supabase.from("services").select("id,service_number,service_title,event_name").in("id", serviceIds) : Promise.resolve({ data: [], error: null }),
  ]);
  const suppliers = new Map(rows(supplierResult.data).map((row) => [text(row.id) ?? "", text(row.display_name) ?? text(row.name) ?? "—"]));
  const services = new Map(rows(serviceResult.data).map((row) => [text(row.id) ?? "", {
    serviceNumber: text(row.service_number) ?? "—",
    serviceTitle: text(row.service_title) ?? "—",
    eventName: text(row.event_name),
  }]));
  return {
    bills: bills.map((bill) => {
      const service = services.get(bill.service_id);
      return {
        ...bill,
        supplier_name: suppliers.get(bill.supplier_id) ?? bill.supplier_name_snapshot,
        service_number: service?.serviceNumber ?? "—",
        service_title: service?.serviceTitle ?? "—",
        event_name: service?.eventName ?? null,
      };
    }),
  };
}

export async function getSupplierBillById(id: string): Promise<{ bill: SupplierBillDetail | null; error?: string }> {
  await requirePermission(SUPPLIER_BILL_PERMISSIONS.read);
  const supabase = getSupplierBillClient();
  const { data, error } = await supabase.from("supplier_bills").select("*").eq("id", id).maybeSingle();
  if (error) return { bill: null, error: "supplier_bill_load_failed" };
  if (!data) return { bill: null };
  const base = mapBill(data as Record<string, unknown>);
  const [supplierResult, serviceResult, commitmentResult, receiptResult, documentLinksResult] = await Promise.all([
    supabase.from("suppliers").select("id,name,display_name,legal_name").eq("id", base.supplier_id).maybeSingle(),
    supabase.from("services").select("id,service_number,service_title,event_name").eq("id", base.service_id).maybeSingle(),
    supabase.from("approved_commitment_balances").select("commitment_source,source_reference,supplier_quotation_id,currency,status,authorized_amount,accepted_amount").eq("id", base.commitment_id).maybeSingle(),
    supabase.from("service_receipts").select("acceptance_status,performance_date,received_amount,delivered_scope,reviewed_at,reviewed_by").eq("id", base.service_receipt_id).maybeSingle(),
    supabase.from("supplier_bill_documents").select("document_id,attached_at,attached_by").eq("supplier_bill_id", base.id).order("attached_at", { ascending: true }),
  ]);
  const supplier = (supplierResult.data ?? {}) as Record<string, unknown>;
  const service = (serviceResult.data ?? {}) as Record<string, unknown>;
  const commitment = (commitmentResult.data ?? {}) as Record<string, unknown>;
  const receipt = (receiptResult.data ?? {}) as Record<string, unknown>;
  const quotationId = text(commitment.supplier_quotation_id);
  const quotationResult = quotationId
    ? await supabase.from("supplier_quotations").select("supplier_reference").eq("id", quotationId).maybeSingle()
    : { data: null };
  const quotation = (quotationResult.data ?? {}) as Record<string, unknown>;
  const linkRows = rows(documentLinksResult.data);
  const documentIds = linkRows.map((row) => text(row.document_id)).filter((value): value is string => Boolean(value));
  const metadataResult = documentIds.length
    ? await supabase.from("business_documents").select("id,original_filename,mime_type,file_size").in("id", documentIds)
    : { data: [], error: null };
  const metadata = new Map(rows(metadataResult.data).map((row) => [text(row.id) ?? "", row]));
  const documents: SupplierBillDocument[] = linkRows.map((link) => {
    const meta = metadata.get(text(link.document_id) ?? "") ?? {};
    return {
      document_id: text(link.document_id) ?? "",
      original_filename: text(meta.original_filename) ?? "invoice",
      mime_type: text(meta.mime_type) ?? "application/octet-stream",
      file_size: number(meta.file_size),
      attached_at: text(link.attached_at) ?? "",
      attached_by: text(link.attached_by) ?? "",
    };
  });
  return {
    bill: {
      ...base,
      supplier_name: text(supplier.display_name) ?? text(supplier.name) ?? base.supplier_name_snapshot,
      supplier_legal_name: text(supplier.legal_name) ?? base.supplier_legal_name_snapshot,
      service_number: text(service.service_number) ?? "—",
      service_title: text(service.service_title) ?? "—",
      event_name: text(service.event_name),
      commitment_currency: text(commitment.currency) ?? base.currency,
      commitment_source: text(commitment.commitment_source) ?? "",
      commitment_source_reference: text(commitment.source_reference),
      commitment_quotation_reference: text(quotation.supplier_reference),
      commitment_status: text(commitment.status) ?? "unknown",
      authorized_amount: number(commitment.authorized_amount),
      accepted_amount: number(commitment.accepted_amount),
      receipt_acceptance_status: text(receipt.acceptance_status) ?? "unknown",
      receipt_performance_date: text(receipt.performance_date) ?? "",
      receipt_received_amount: receipt.received_amount == null ? null : number(receipt.received_amount),
      receipt_delivered_scope: text(receipt.delivered_scope) ?? "",
      receipt_reviewed_at: text(receipt.reviewed_at),
      receipt_reviewed_by: text(receipt.reviewed_by),
      documents,
    },
  };
}

export async function getSupplierBillFormOptions(): Promise<SupplierBillFormOptions> {
  await requirePermission(SUPPLIER_BILL_PERMISSIONS.read);
  const supabase = getSupplierBillClient();
  const [supplierResult, serviceResult, commitmentResult, receiptResult] = await Promise.all([
    supabase.from("suppliers").select("id,name,display_name,legal_name,cr_number,vat_registration_status,vat_number").eq("is_deleted", false).is("deleted_at", null).in("status", ["active", "on_hold"]).order("name", { ascending: true }),
    supabase.from("services").select("id,service_number,service_title,event_name").is("deleted_at", null).neq("status", "Cancelled").order("service_number", { ascending: true }),
    supabase.from("approved_commitment_balances").select("id,service_id,supplier_id,currency,status,authorized_amount,open_commitment_amount").eq("status", "open").order("approved_at", { ascending: false }).order("id", { ascending: true }),
    supabase.from("service_receipts").select("id,service_id,supplier_id,commitment_id,acceptance_status,performance_date,received_amount,delivered_scope").in("acceptance_status", ["PENDING", "ACCEPTED", "ACCEPTED_WITH_CONDITIONS"]).order("performance_date", { ascending: false }),
  ]);
  const suppliers: SupplierBillSupplierOption[] = rows(supplierResult.data).map((row) => ({
    id: text(row.id) ?? "",
    name: text(row.display_name) ?? text(row.name) ?? "—",
    legalName: text(row.legal_name),
    crNumber: text(row.cr_number),
    vatRegistrationStatus: text(row.vat_registration_status),
    vatNumber: text(row.vat_number),
  })).filter((row) => row.id);
  const services: SupplierBillServiceOption[] = rows(serviceResult.data).map((row) => ({
    id: text(row.id) ?? "",
    serviceNumber: text(row.service_number) ?? "—",
    serviceTitle: text(row.service_title) ?? "—",
    eventName: text(row.event_name),
  })).filter((row) => row.id);
  const commitments: SupplierBillCommitmentOption[] = rows(commitmentResult.data).map((row) => ({
    id: text(row.id) ?? "",
    serviceId: text(row.service_id) ?? "",
    supplierId: text(row.supplier_id) ?? "",
    currency: text(row.currency) ?? "SAR",
    status: text(row.status) ?? "open",
    authorizedAmount: number(row.authorized_amount),
    openCommitmentAmount: number(row.open_commitment_amount),
  })).filter((row) => row.id && row.serviceId && row.supplierId);
  const receipts: SupplierBillReceiptOption[] = rows(receiptResult.data).map((row) => ({
    id: text(row.id) ?? "",
    serviceId: text(row.service_id) ?? "",
    supplierId: text(row.supplier_id) ?? "",
    commitmentId: text(row.commitment_id) ?? "",
    acceptanceStatus: text(row.acceptance_status) ?? "PENDING",
    performanceDate: text(row.performance_date) ?? "",
    receivedAmount: row.received_amount == null ? null : number(row.received_amount),
    deliveredScope: text(row.delivered_scope) ?? "",
  })).filter((row) => row.id && row.commitmentId);
  return { suppliers, services, commitments, receipts };
}
