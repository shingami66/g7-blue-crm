"use server";

import "server-only";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { SUPPLIER_ADVANCE_PERMISSIONS } from "@/lib/auth/role-permissions";
import {
  cleanupUploadedPrivateBusinessDocument,
  createPrivateSupplierAdvanceEvidenceUrl,
  uploadPrivateSupplierAdvanceAuthorizationEvidence,
  uploadPrivateSupplierAdvancePaymentEvidence,
  uploadPrivateSupplierAdvanceRefundEvidence,
} from "@/lib/documents/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  allocateSupplierAdvanceSchema,
  authorizeSupplierAdvanceSchema,
  correctSupplierAdvanceEventSchema,
  recordSupplierAdvancePaymentSchema,
  refundSupplierAdvanceSchema,
} from "./schemas";
import type { SupplierAdvanceActionResult } from "./types";

// W6C database types are generated only after the separately authorized apply.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function db(): any {
  return createAdminClient();
}

function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function hasFile(value: unknown): value is File {
  return typeof value === "object" && value !== null && "size" in value && Number(value.size) > 0;
}

function errorResult<T = never>(code: string): SupplierAdvanceActionResult<T> {
  return { success: false, error: code, errorCode: code };
}

async function sha256(file: File): Promise<string> {
  return createHash("sha256").update(Buffer.from(await file.arrayBuffer())).digest("hex");
}

type RpcRow = Record<string, unknown> & { error_code?: string | null; idempotent_replay?: boolean | null };

function firstRow(value: unknown): RpcRow | null {
  return Array.isArray(value) && value[0] && typeof value[0] === "object" ? value[0] as RpcRow : null;
}

async function advanceReplay(input: {
  request_id: string; commitment_id: string; amount: number; reason: string; evidence_sha256: string;
}): Promise<SupplierAdvanceActionResult<{ advance_id: string; advance_number: string }> | null> {
  const { data, error } = await db().from("supplier_advances")
    .select("id,advance_number,commitment_id,authorized_amount,reason,evidence_sha256")
    .eq("authorization_request_id", input.request_id).maybeSingle();
  if (error || !data) return null;
  if (data.commitment_id !== input.commitment_id || Number(data.authorized_amount) !== input.amount
      || data.reason !== input.reason || data.evidence_sha256 !== input.evidence_sha256) {
    return errorResult("supplier_advance_request_conflict");
  }
  return { success: true, data: { advance_id: data.id, advance_number: data.advance_number }, idempotentReplay: true };
}

async function paymentReplay(input: {
  request_id: string; advance_id: string; payment_date: string; amount: number; method: string;
  reference: string | null; notes: string | null; evidence_sha256: string;
}): Promise<SupplierAdvanceActionResult<{ payment_id: string; payment_number: string }> | null> {
  const { data, error } = await db().from("supplier_advance_payments")
    .select("id,payment_number,supplier_advance_id,payment_date,amount,method,reference,notes")
    .eq("record_request_id", input.request_id).maybeSingle();
  if (error || !data) return null;
  const { data: evidence } = await db().from("supplier_advance_payment_documents")
    .select("content_sha256").eq("supplier_advance_payment_id", data.id).maybeSingle();
  if (data.supplier_advance_id !== input.advance_id || data.payment_date !== input.payment_date
      || Number(data.amount) !== input.amount || data.method !== input.method
      || (data.reference ?? null) !== input.reference || (data.notes ?? null) !== input.notes
      || evidence?.content_sha256 !== input.evidence_sha256) {
    return errorResult("supplier_advance_request_conflict");
  }
  return { success: true, data: { payment_id: data.id, payment_number: data.payment_number }, idempotentReplay: true };
}

async function refundReplay(input: {
  request_id: string; advance_id: string; business_date: string; amount: number; reason: string;
  reference: string | null; evidence_sha256: string;
}): Promise<SupplierAdvanceActionResult<{ refund_id: string; refund_number: string }> | null> {
  const { data, error } = await db().from("supplier_advance_refunds")
    .select("id,refund_number,supplier_advance_id,business_date,amount,reason,reference,evidence_sha256")
    .eq("record_request_id", input.request_id).maybeSingle();
  if (error || !data) return null;
  const { data: evidence } = await db().from("supplier_advance_refund_documents")
    .select("content_sha256").eq("supplier_advance_refund_id", data.id).maybeSingle();
  if (data.supplier_advance_id !== input.advance_id || data.business_date !== input.business_date
      || Number(data.amount) !== input.amount || data.reason !== input.reason
      || (data.reference ?? null) !== input.reference || data.evidence_sha256 !== input.evidence_sha256
      || evidence?.content_sha256 !== input.evidence_sha256) {
    return errorResult("supplier_advance_request_conflict");
  }
  return { success: true, data: { refund_id: data.id, refund_number: data.refund_number }, idempotentReplay: true };
}

async function discardUncommittedEvidence(
  uploaded: Awaited<ReturnType<typeof uploadPrivateSupplierAdvancePaymentEvidence>>,
  link: { serviceId: string; linkPurpose: string },
  relation: string,
  foreignKey: string,
): Promise<boolean> {
  const { data, error } = await db().from(relation).select(foreignKey).eq("document_id", uploaded.id).maybeSingle();
  if (error) return false;
  if (data) return false;
  return cleanupUploadedPrivateBusinessDocument(uploaded, link);
}

export async function authorizeSupplierAdvanceAction(formData: FormData): Promise<SupplierAdvanceActionResult<{ advance_id: string; advance_number: string }>> {
  let uploaded: Awaited<ReturnType<typeof uploadPrivateSupplierAdvanceAuthorizationEvidence>> | null = null;
  let mutationAttempted = false;
  const link = { serviceId: "", linkPurpose: "supplier_advance_authorization" };
  try {
    const user = await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.authorize);
    const parsed = authorizeSupplierAdvanceSchema.safeParse({
      commitment_id: stringValue(formData.get("commitment_id")), amount: stringValue(formData.get("amount")),
      reason: stringValue(formData.get("reason")), request_id: stringValue(formData.get("request_id")),
      document: formData.get("document"),
    });
    if (!parsed.success || !hasFile(parsed.data.document)) return errorResult("supplier_advance_request_invalid");
    const evidenceHash = await sha256(parsed.data.document);
    const replay = await advanceReplay({ ...parsed.data, amount: Number(parsed.data.amount), evidence_sha256: evidenceHash });
    if (replay) return replay;
    const supabase = db();
    const { data: commitment, error: commitmentError } = await supabase.from("approved_commitments")
      .select("service_id").eq("id", parsed.data.commitment_id).maybeSingle();
    if (commitmentError || !commitment?.service_id) return errorResult("supplier_advance_commitment_not_found");
    link.serviceId = commitment.service_id;
    uploaded = await uploadPrivateSupplierAdvanceAuthorizationEvidence({
      file: parsed.data.document, documentType: "supplier_advance_authorization_evidence",
      purpose: "Supplier Advance authorization evidence", link,
    });
    mutationAttempted = true;
    const { data, error } = await supabase.rpc("authorize_supplier_advance", {
      p_commitment_id: parsed.data.commitment_id, p_amount: Number(parsed.data.amount), p_reason: parsed.data.reason,
      p_document_id: uploaded.id, p_evidence_sha256: evidenceHash, p_request_id: parsed.data.request_id,
      p_actor_id: user.id, p_actor_role: user.role,
    });
    const row = firstRow(data);
    if (error) {
      const { data: existing } = await supabase.from("supplier_advance_authorization_documents")
        .select("supplier_advance_id").eq("document_id", uploaded.id).maybeSingle();
      if (existing?.supplier_advance_id) {
        const { data: event } = await supabase.from("supplier_advances").select("id,advance_number,authorization_request_id").eq("id", existing.supplier_advance_id).maybeSingle();
        if (event?.authorization_request_id === parsed.data.request_id) {
          revalidatePath("/supplier-advances");
          return { success: true, data: { advance_id: event.id, advance_number: event.advance_number }, idempotentReplay: true };
        }
      }
      const { data: linked, error: linkedError } = await supabase.from("supplier_advance_authorization_documents")
        .select("document_id").eq("document_id", uploaded.id).maybeSingle();
      if (!linkedError && !linked) await cleanupUploadedPrivateBusinessDocument(uploaded, link);
      return errorResult("supplier_advance_record_failed");
    }
    if (!row || row.error_code || typeof row.advance_id !== "string" || typeof row.advance_number !== "string") {
      await cleanupUploadedPrivateBusinessDocument(uploaded, link);
      return errorResult(typeof row?.error_code === "string" ? row.error_code : "supplier_advance_record_failed");
    }
    if (row.idempotent_replay === true) {
      await discardUncommittedEvidence(uploaded, link, "supplier_advance_authorization_documents", "supplier_advance_id");
    }
    revalidatePath("/supplier-advances");
    revalidatePath(`/supplier-advances/${row.advance_id}`);
    return { success: true, data: { advance_id: row.advance_id, advance_number: row.advance_number }, idempotentReplay: row.idempotent_replay === true };
  } catch {
    if (uploaded && link.serviceId && !mutationAttempted) await cleanupUploadedPrivateBusinessDocument(uploaded, link);
    return errorResult("supplier_advance_record_failed");
  }
}

export async function recordSupplierAdvancePaymentAction(formData: FormData): Promise<SupplierAdvanceActionResult<{ payment_id: string; payment_number: string }>> {
  let uploaded: Awaited<ReturnType<typeof uploadPrivateSupplierAdvancePaymentEvidence>> | null = null;
  let mutationAttempted = false;
  const link = { serviceId: "", linkPurpose: "supplier_advance_payment" };
  try {
    const user = await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.pay);
    const parsed = recordSupplierAdvancePaymentSchema.safeParse({
      advance_id: stringValue(formData.get("advance_id")), payment_date: stringValue(formData.get("payment_date")),
      amount: stringValue(formData.get("amount")), method: stringValue(formData.get("method")),
      reference: stringValue(formData.get("reference")), notes: stringValue(formData.get("notes")),
      request_id: stringValue(formData.get("request_id")), document: formData.get("document"),
    });
    if (!parsed.success || !hasFile(parsed.data.document)) return errorResult("supplier_advance_request_invalid");
    const evidenceHash = await sha256(parsed.data.document);
    const replay = await paymentReplay({
      ...parsed.data, amount: Number(parsed.data.amount), reference: parsed.data.reference || null,
      notes: parsed.data.notes || null, evidence_sha256: evidenceHash,
    });
    if (replay) return replay;
    const supabase = db();
    const { data: advance, error: advanceError } = await supabase.from("supplier_advances").select("service_id")
      .eq("id", parsed.data.advance_id).maybeSingle();
    if (advanceError || !advance?.service_id) return errorResult("supplier_advance_not_found");
    link.serviceId = advance.service_id;
    uploaded = await uploadPrivateSupplierAdvancePaymentEvidence({
      file: parsed.data.document, documentType: "supplier_advance_payment_evidence",
      purpose: "Supplier Advance payment evidence", link,
    });
    mutationAttempted = true;
    const { data, error } = await supabase.rpc("record_supplier_advance_payment", {
      p_advance_id: parsed.data.advance_id, p_payment_date: parsed.data.payment_date,
      p_amount: Number(parsed.data.amount), p_method: parsed.data.method,
      p_reference: parsed.data.reference || null, p_notes: parsed.data.notes || null,
      p_document_id: uploaded.id, p_evidence_sha256: evidenceHash, p_request_id: parsed.data.request_id,
      p_actor_id: user.id, p_actor_role: user.role,
    });
    const row = firstRow(data);
    if (error) {
      const { data: eventLink } = await supabase.from("supplier_advance_payment_documents")
        .select("supplier_advance_payment_id").eq("document_id", uploaded.id).maybeSingle();
      if (eventLink?.supplier_advance_payment_id) {
        const { data: event } = await supabase.from("supplier_advance_payments").select("id,payment_number,record_request_id")
          .eq("id", eventLink.supplier_advance_payment_id).maybeSingle();
        if (event?.record_request_id === parsed.data.request_id) {
          revalidatePath("/supplier-advances"); revalidatePath(`/supplier-advances/${parsed.data.advance_id}`);
          return { success: true, data: { payment_id: event.id, payment_number: event.payment_number }, idempotentReplay: true };
        }
      }
      await discardUncommittedEvidence(uploaded, link, "supplier_advance_payment_documents", "supplier_advance_payment_id");
      return errorResult("supplier_advance_payment_failed");
    }
    if (!row || row.error_code || typeof row.payment_id !== "string" || typeof row.payment_number !== "string") {
      await cleanupUploadedPrivateBusinessDocument(uploaded, link);
      return errorResult(typeof row?.error_code === "string" ? row.error_code : "supplier_advance_payment_failed");
    }
    if (row.idempotent_replay === true) {
      await discardUncommittedEvidence(uploaded, link, "supplier_advance_payment_documents", "supplier_advance_payment_id");
    }
    revalidatePath("/supplier-advances"); revalidatePath(`/supplier-advances/${parsed.data.advance_id}`);
    return { success: true, data: { payment_id: row.payment_id, payment_number: row.payment_number }, idempotentReplay: row.idempotent_replay === true };
  } catch {
    if (uploaded && link.serviceId && !mutationAttempted) await cleanupUploadedPrivateBusinessDocument(uploaded, link);
    return errorResult("supplier_advance_payment_failed");
  }
}

export async function allocateSupplierAdvanceAction(input: unknown): Promise<SupplierAdvanceActionResult<{ allocation_id: string; allocation_number: string; bill_id: string }>> {
  try {
    const user = await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.allocate);
    const parsed = allocateSupplierAdvanceSchema.safeParse(input);
    if (!parsed.success) return errorResult("supplier_advance_request_invalid");
    const { data, error } = await db().rpc("allocate_supplier_advance", {
      p_advance_id: parsed.data.advance_id, p_supplier_bill_id: parsed.data.supplier_bill_id,
      p_amount: Number(parsed.data.amount), p_request_id: parsed.data.request_id, p_actor_id: user.id, p_actor_role: user.role,
    });
    if (error) return errorResult("supplier_advance_allocation_failed");
    const row = firstRow(data);
    if (!row || row.error_code || typeof row.allocation_id !== "string" || typeof row.allocation_number !== "string") {
      return errorResult(typeof row?.error_code === "string" ? row.error_code : "supplier_advance_allocation_failed");
    }
    revalidatePath("/supplier-advances"); revalidatePath(`/supplier-advances/${parsed.data.advance_id}`);
    revalidatePath("/supplier-bills"); revalidatePath(`/supplier-bills/${parsed.data.supplier_bill_id}`);
    return { success: true, data: { allocation_id: row.allocation_id, allocation_number: row.allocation_number, bill_id: parsed.data.supplier_bill_id }, idempotentReplay: row.idempotent_replay === true };
  } catch { return errorResult("supplier_advance_allocation_failed"); }
}

export async function refundSupplierAdvanceAction(formData: FormData): Promise<SupplierAdvanceActionResult<{ refund_id: string; refund_number: string }>> {
  let uploaded: Awaited<ReturnType<typeof uploadPrivateSupplierAdvanceRefundEvidence>> | null = null;
  let mutationAttempted = false;
  const link = { serviceId: "", linkPurpose: "supplier_advance_refund" };
  try {
    const user = await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.refund);
    const parsed = refundSupplierAdvanceSchema.safeParse({
      advance_id: stringValue(formData.get("advance_id")), business_date: stringValue(formData.get("business_date")),
      amount: stringValue(formData.get("amount")), reason: stringValue(formData.get("reason")),
      reference: stringValue(formData.get("reference")), request_id: stringValue(formData.get("request_id")), document: formData.get("document"),
    });
    if (!parsed.success || !hasFile(parsed.data.document)) return errorResult("supplier_advance_request_invalid");
    const evidenceHash = await sha256(parsed.data.document);
    const replay = await refundReplay({ ...parsed.data, amount: Number(parsed.data.amount), reference: parsed.data.reference || null, evidence_sha256: evidenceHash });
    if (replay) return replay;
    const supabase = db();
    const { data: advance, error: advanceError } = await supabase.from("supplier_advances").select("service_id")
      .eq("id", parsed.data.advance_id).maybeSingle();
    if (advanceError || !advance?.service_id) return errorResult("supplier_advance_not_found");
    link.serviceId = advance.service_id;
    uploaded = await uploadPrivateSupplierAdvanceRefundEvidence({
      file: parsed.data.document, documentType: "supplier_advance_refund_evidence",
      purpose: "Supplier Advance refund evidence", link,
    });
    mutationAttempted = true;
    const { data, error } = await supabase.rpc("refund_supplier_advance", {
      p_advance_id: parsed.data.advance_id, p_business_date: parsed.data.business_date,
      p_amount: Number(parsed.data.amount), p_reason: parsed.data.reason, p_reference: parsed.data.reference || null,
      p_document_id: uploaded.id, p_evidence_sha256: evidenceHash, p_request_id: parsed.data.request_id,
      p_actor_id: user.id, p_actor_role: user.role,
    });
    const row = firstRow(data);
    if (error) {
      const { data: linked } = await supabase.from("supplier_advance_refund_documents").select("supplier_advance_refund_id")
        .eq("document_id", uploaded.id).maybeSingle();
      if (linked?.supplier_advance_refund_id) {
        const { data: event } = await supabase.from("supplier_advance_refunds").select("id,refund_number,record_request_id")
          .eq("id", linked.supplier_advance_refund_id).maybeSingle();
        if (event?.record_request_id === parsed.data.request_id) {
          revalidatePath("/supplier-advances"); revalidatePath(`/supplier-advances/${parsed.data.advance_id}`);
          return { success: true, data: { refund_id: event.id, refund_number: event.refund_number }, idempotentReplay: true };
        }
      }
      await discardUncommittedEvidence(uploaded, link, "supplier_advance_refund_documents", "supplier_advance_refund_id");
      return errorResult("supplier_advance_refund_failed");
    }
    if (!row || row.error_code || typeof row.refund_id !== "string" || typeof row.refund_number !== "string") {
      await cleanupUploadedPrivateBusinessDocument(uploaded, link);
      return errorResult(typeof row?.error_code === "string" ? row.error_code : "supplier_advance_refund_failed");
    }
    if (row.idempotent_replay === true) {
      await discardUncommittedEvidence(uploaded, link, "supplier_advance_refund_documents", "supplier_advance_refund_id");
    }
    revalidatePath("/supplier-advances"); revalidatePath(`/supplier-advances/${parsed.data.advance_id}`);
    return { success: true, data: { refund_id: row.refund_id, refund_number: row.refund_number }, idempotentReplay: row.idempotent_replay === true };
  } catch {
    if (uploaded && link.serviceId && !mutationAttempted) await cleanupUploadedPrivateBusinessDocument(uploaded, link);
    return errorResult("supplier_advance_refund_failed");
  }
}

export async function reverseSupplierAdvancePaymentAction(input: unknown): Promise<SupplierAdvanceActionResult<{ payment_id: string; advance_id: string }>> {
  try {
    const user = await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.reverse);
    const parsed = correctSupplierAdvanceEventSchema.safeParse(input);
    if (!parsed.success) return errorResult("supplier_advance_request_invalid");
    const { data, error } = await db().rpc("reverse_supplier_advance_payment", {
      p_payment_id: parsed.data.event_id, p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
      p_actor_id: user.id, p_actor_role: user.role,
    });
    if (error) return errorResult("supplier_advance_reversal_failed");
    const row = firstRow(data);
    if (!row || row.error_code || typeof row.payment_id !== "string" || typeof row.advance_id !== "string") {
      return errorResult(typeof row?.error_code === "string" ? row.error_code : "supplier_advance_reversal_failed");
    }
    revalidatePath("/supplier-advances"); revalidatePath(`/supplier-advances/${row.advance_id}`);
    return { success: true, data: { payment_id: row.payment_id, advance_id: row.advance_id }, idempotentReplay: row.idempotent_replay === true };
  } catch { return errorResult("supplier_advance_reversal_failed"); }
}

export async function correctSupplierAdvanceAllocationAction(input: unknown): Promise<SupplierAdvanceActionResult<{ allocation_id: string; advance_id: string; bill_id: string }>> {
  try {
    const user = await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.correct);
    const parsed = correctSupplierAdvanceEventSchema.safeParse(input);
    if (!parsed.success) return errorResult("supplier_advance_request_invalid");
    const { data, error } = await db().rpc("reverse_supplier_advance_allocation", {
      p_allocation_id: parsed.data.event_id, p_reason: parsed.data.reason, p_request_id: parsed.data.request_id,
      p_actor_id: user.id, p_actor_role: user.role,
    });
    if (error) return errorResult("supplier_advance_correction_failed");
    const row = firstRow(data);
    if (!row || row.error_code || typeof row.allocation_id !== "string" || typeof row.advance_id !== "string" || typeof row.bill_id !== "string") {
      return errorResult(typeof row?.error_code === "string" ? row.error_code : "supplier_advance_correction_failed");
    }
    revalidatePath("/supplier-advances"); revalidatePath(`/supplier-advances/${row.advance_id}`);
    revalidatePath("/supplier-bills"); revalidatePath(`/supplier-bills/${row.bill_id}`);
    return { success: true, data: { allocation_id: row.allocation_id, advance_id: row.advance_id, bill_id: row.bill_id }, idempotentReplay: row.idempotent_replay === true };
  } catch { return errorResult("supplier_advance_correction_failed"); }
}

export async function createSupplierAdvanceEvidenceUrl(input: unknown): Promise<SupplierAdvanceActionResult<{ signedUrl: string; expiresInSeconds: number }>> {
  try {
    await requirePermission(SUPPLIER_ADVANCE_PERMISSIONS.read);
    if (typeof input !== "object" || input === null) return errorResult("supplier_advance_request_invalid");
    const value = input as { eventId?: unknown; documentId?: unknown; kind?: unknown };
    if (typeof value.eventId !== "string" || typeof value.documentId !== "string"
        || (value.kind !== "authorization" && value.kind !== "payment" && value.kind !== "refund")) {
      return errorResult("supplier_advance_request_invalid");
    }
    const configs = {
      authorization: { table: "supplier_advance_authorization_documents", key: "supplier_advance_id", parent: "supplier_advances" },
      payment: { table: "supplier_advance_payment_documents", key: "supplier_advance_payment_id", parent: "supplier_advance_payments" },
      refund: { table: "supplier_advance_refund_documents", key: "supplier_advance_refund_id", parent: "supplier_advance_refunds" },
    } as const;
    const config = configs[value.kind];
    const supabase = db();
    const [{ data: relation }, { data: event }] = await Promise.all([
      supabase.from(config.table).select("document_id").eq(config.key, value.eventId).eq("document_id", value.documentId).maybeSingle(),
      supabase.from(config.parent).select("service_id").eq("id", value.eventId).maybeSingle(),
    ]);
    if (!relation || !event?.service_id) return errorResult("supplier_advance_document_failed");
    const result = await createPrivateSupplierAdvanceEvidenceUrl({ documentId: value.documentId, serviceId: event.service_id });
    return { success: true, data: { signedUrl: result.signedUrl, expiresInSeconds: result.expiresInSeconds } };
  } catch { return errorResult("supplier_advance_document_failed"); }
}
