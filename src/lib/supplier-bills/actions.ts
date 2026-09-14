"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { SUPPLIER_BILL_PERMISSIONS } from "@/lib/auth/role-permissions";
import {
  cleanupUploadedPrivateBusinessDocument,
  createPrivateSupplierBillInvoiceUrl,
  uploadPrivateSupplierBillInvoice,
} from "@/lib/documents/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  approveSupplierBillSchema,
  supplierBillDocumentSchema,
  supplierBillInputSchema,
  updateSupplierBillSchema,
  type SupplierBillInput,
} from "./schemas";
import type { SupplierBillActionResult } from "./types";

// The W6A migration is intentionally not applied to the generated Database
// type yet, so its service-role RPC boundary is kept explicit like W5.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupplierBillClient(): any {
  return createAdminClient();
}

function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function nullableString(value: FormDataEntryValue | null): string | null {
  const normalized = stringValue(value).trim();
  return normalized || null;
}

function numberValue(value: FormDataEntryValue | null): number {
  const raw = stringValue(value).trim();
  return raw ? Number(raw) : Number.NaN;
}

function validationErrorCode(error: { issues: Array<{ message: string; path: PropertyKey[] }> }): string {
  if (error.issues.some((issue) => issue.path.includes("total_amount") && issue.message === "Total must equal subtotal plus VAT.")) {
    return "supplier_bill_total_mismatch";
  }
  if (error.issues.some((issue) => issue.path.includes("due_date") && issue.message === "Due date cannot precede invoice date.")) {
    return "supplier_bill_due_date_invalid";
  }
  return "supplier_bill_fields_invalid";
}

function inputFromFormData(formData: FormData): SupplierBillInput {
  return {
    service_id: stringValue(formData.get("service_id")),
    supplier_id: stringValue(formData.get("supplier_id")),
    commitment_id: stringValue(formData.get("commitment_id")),
    service_receipt_id: stringValue(formData.get("service_receipt_id")),
    invoice_number: stringValue(formData.get("invoice_number")),
    invoice_date: stringValue(formData.get("invoice_date")),
    due_date: nullableString(formData.get("due_date")),
    currency: stringValue(formData.get("currency")) || "SAR",
    subtotal: numberValue(formData.get("subtotal")),
    vat_amount: numberValue(formData.get("vat_amount")),
    total_amount: numberValue(formData.get("total_amount")),
    request_id: stringValue(formData.get("request_id")),
  };
}

function actionError(errorCode = "supplier_bill_operation_failed"): SupplierBillActionResult<never> {
  return { success: false, error: errorCode, errorCode };
}

function hasFile(value: FormDataEntryValue | null): value is File {
  return typeof value === "object" && value !== null && "size" in value && Number(value.size) > 0;
}

type SupplierBillRpcRow = {
  error_code: string | null;
  bill_id: string;
  bill_number: string;
  status: string;
  idempotent_replay: boolean;
};

async function attachInvoiceFile(
  billId: string,
  serviceId: string,
  file: File,
  requestId: string,
  actor: { id: string; role: string },
): Promise<{ success: true } | { success: false; errorCode: string }> {
  const document = await uploadPrivateSupplierBillInvoice({
    file,
    documentType: "supplier_invoice",
    purpose: "Supplier invoice evidence",
    link: { serviceId, linkPurpose: "supplier_bill" },
  });
  const supabase = getSupplierBillClient();
  const { data, error } = await supabase.rpc("attach_supplier_bill_documents", {
    p_bill_id: billId,
    p_document_ids: [document.id],
    p_request_id: requestId,
    p_actor_id: actor.id,
    p_actor_role: actor.role,
  });
  const row = (Array.isArray(data) ? data[0] : null) as { error_code?: string | null } | null;
  if (error) {
    const { data: linked } = await supabase
      .from("supplier_bill_documents")
      .select("document_id")
      .eq("supplier_bill_id", billId)
      .eq("document_id", document.id)
      .maybeSingle();
    if (linked) return { success: true };
    const cleaned = await cleanupUploadedPrivateBusinessDocument(document, {
      serviceId,
      linkPurpose: "supplier_bill",
    });
    return { success: false, errorCode: cleaned ? (error.code ?? "supplier_bill_document_attach_failed") : "document_storage_cleanup_failed" };
  }
  if (row?.error_code) {
    const cleaned = await cleanupUploadedPrivateBusinessDocument(document, {
      serviceId,
      linkPurpose: "supplier_bill",
    });
    return { success: false, errorCode: cleaned ? row.error_code : "document_storage_cleanup_failed" };
  }
  return { success: true };
}

export async function createSupplierBillAction(
  formData: FormData,
): Promise<SupplierBillActionResult<{ bill_id: string; bill_number: string; warning_code?: string }>> {
  try {
    const user = await requirePermission(SUPPLIER_BILL_PERMISSIONS.record);
    const parsed = supplierBillInputSchema.safeParse(inputFromFormData(formData));
    if (!parsed.success) return actionError(validationErrorCode(parsed.error));
    const supabase = getSupplierBillClient();
    const { data, error } = await supabase.rpc("create_supplier_bill", {
      p_service_id: parsed.data.service_id,
      p_supplier_id: parsed.data.supplier_id,
      p_commitment_id: parsed.data.commitment_id,
      p_service_receipt_id: parsed.data.service_receipt_id,
      p_invoice_number: parsed.data.invoice_number,
      p_invoice_date: parsed.data.invoice_date,
      p_due_date: parsed.data.due_date ?? null,
      p_currency: parsed.data.currency,
      p_subtotal: parsed.data.subtotal,
      p_vat_amount: parsed.data.vat_amount,
      p_total_amount: parsed.data.total_amount,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });
    if (error) return actionError(error.code ?? "supplier_bill_record_failed");
    const row = (Array.isArray(data) ? data[0] : null) as SupplierBillRpcRow | null;
    if (!row || row.error_code) return actionError(row?.error_code ?? "supplier_bill_record_failed");

    let warningCode: string | undefined;
    const invoice = formData.get("invoice");
    if (hasFile(invoice)) {
      const attachment = await attachInvoiceFile(row.bill_id, parsed.data.service_id, invoice, parsed.data.request_id, user);
      if (!attachment.success) warningCode = attachment.errorCode;
    }
    revalidatePath("/supplier-bills");
    revalidatePath(`/supplier-bills/${row.bill_id}`);
    return {
      success: true,
      data: { bill_id: row.bill_id, bill_number: row.bill_number, ...(warningCode ? { warning_code: warningCode } : {}) },
      idempotentReplay: row.idempotent_replay,
    };
  } catch {
    return actionError();
  }
}

export async function updateSupplierBillAction(
  formData: FormData,
): Promise<SupplierBillActionResult<{ bill_id: string; bill_number: string }>> {
  try {
    const user = await requirePermission(SUPPLIER_BILL_PERMISSIONS.record);
    const parsed = updateSupplierBillSchema.safeParse({ ...inputFromFormData(formData), bill_id: stringValue(formData.get("bill_id")) });
    if (!parsed.success) return actionError(validationErrorCode(parsed.error));
    const supabase = getSupplierBillClient();
    const { data, error } = await supabase.rpc("update_supplier_bill", {
      p_bill_id: parsed.data.bill_id,
      p_service_id: parsed.data.service_id,
      p_supplier_id: parsed.data.supplier_id,
      p_commitment_id: parsed.data.commitment_id,
      p_service_receipt_id: parsed.data.service_receipt_id,
      p_invoice_number: parsed.data.invoice_number,
      p_invoice_date: parsed.data.invoice_date,
      p_due_date: parsed.data.due_date ?? null,
      p_currency: parsed.data.currency,
      p_subtotal: parsed.data.subtotal,
      p_vat_amount: parsed.data.vat_amount,
      p_total_amount: parsed.data.total_amount,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });
    if (error) return actionError(error.code ?? "supplier_bill_update_failed");
    const row = (Array.isArray(data) ? data[0] : null) as SupplierBillRpcRow | null;
    if (!row || row.error_code) return actionError(row?.error_code ?? "supplier_bill_update_failed");
    revalidatePath("/supplier-bills");
    revalidatePath(`/supplier-bills/${row.bill_id}`);
    return { success: true, data: { bill_id: row.bill_id, bill_number: row.bill_number }, idempotentReplay: row.idempotent_replay };
  } catch {
    return actionError();
  }
}

export async function attachSupplierBillInvoiceAction(
  formData: FormData,
): Promise<SupplierBillActionResult<{ bill_id: string }>> {
  try {
    const user = await requirePermission(SUPPLIER_BILL_PERMISSIONS.record);
    const parsed = supplierBillDocumentSchema.safeParse({ bill_id: stringValue(formData.get("bill_id")), request_id: stringValue(formData.get("request_id")) });
    const invoice = formData.get("invoice");
    if (!parsed.success || !hasFile(invoice)) return actionError("supplier_bill_invoice_file_required");
    const supabase = getSupplierBillClient();
    const { data: bill, error: billError } = await supabase.from("supplier_bills").select("service_id").eq("id", parsed.data.bill_id).maybeSingle();
    if (billError || !bill?.service_id) return actionError("supplier_bill_not_found");
    const attachment = await attachInvoiceFile(parsed.data.bill_id, bill.service_id, invoice, parsed.data.request_id, user);
    if (!attachment.success) return actionError(attachment.errorCode);
    revalidatePath("/supplier-bills");
    revalidatePath(`/supplier-bills/${parsed.data.bill_id}`);
    return { success: true, data: { bill_id: parsed.data.bill_id } };
  } catch {
    return actionError();
  }
}

export async function approveSupplierBillAction(
  input: unknown,
): Promise<SupplierBillActionResult<{ bill_id: string; bill_number: string }>> {
  try {
    const user = await requirePermission(SUPPLIER_BILL_PERMISSIONS.approve);
    const parsed = approveSupplierBillSchema.safeParse(input);
    if (!parsed.success) return actionError("supplier_bill_approval_request_invalid");
    const { data, error } = await getSupplierBillClient().rpc("approve_supplier_bill", {
      p_bill_id: parsed.data.bill_id,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });
    if (error) return actionError(error.code ?? "supplier_bill_approval_failed");
    const row = (Array.isArray(data) ? data[0] : null) as SupplierBillRpcRow | null;
    if (!row || row.error_code) return actionError(row?.error_code ?? "supplier_bill_approval_failed");
    revalidatePath("/supplier-bills");
    revalidatePath(`/supplier-bills/${row.bill_id}`);
    return { success: true, data: { bill_id: row.bill_id, bill_number: row.bill_number }, idempotentReplay: row.idempotent_replay };
  } catch {
    return actionError();
  }
}

export async function createSupplierBillDocumentViewUrl(
  input: unknown,
): Promise<SupplierBillActionResult<{ signedUrl: string; expiresInSeconds: number }>> {
  try {
    const user = await requirePermission(SUPPLIER_BILL_PERMISSIONS.read);
    if (typeof input !== "object" || input === null) return actionError("supplier_bill_document_request_invalid");
    const value = input as { billId?: unknown; documentId?: unknown };
    if (typeof value.billId !== "string" || typeof value.documentId !== "string") return actionError("supplier_bill_document_request_invalid");
    const supabase = getSupplierBillClient();
    const { data: bill } = await supabase.from("supplier_bills").select("service_id").eq("id", value.billId).maybeSingle();
    const { data: link } = await supabase.from("supplier_bill_documents").select("document_id").eq("supplier_bill_id", value.billId).eq("document_id", value.documentId).maybeSingle();
    if (!bill?.service_id || !link) return actionError("supplier_bill_document_not_found");
    const result = await createPrivateSupplierBillInvoiceUrl({ documentId: value.documentId, serviceId: bill.service_id });
    void user;
    return { success: true, data: { signedUrl: result.signedUrl, expiresInSeconds: result.expiresInSeconds } };
  } catch {
    return actionError("supplier_bill_document_read_failed");
  }
}
