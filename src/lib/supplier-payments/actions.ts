"use server";

import "server-only";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/permissions";
import { SUPPLIER_PAYMENT_PERMISSIONS } from "@/lib/auth/role-permissions";
import {
  cleanupUploadedPrivateBusinessDocument,
  createPrivateSupplierPaymentEvidenceUrl,
  uploadPrivateSupplierPaymentEvidence,
} from "@/lib/documents/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { reverseSupplierPaymentSchema, supplierPaymentInputSchema } from "./schemas";
import type { SupplierPaymentActionResult } from "./types";

// W6B is intentionally authored before generated Database types are refreshed.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSupplierPaymentClient(): any {
  return createAdminClient();
}

function stringValue(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}

function actionError(errorCode: string): SupplierPaymentActionResult<never> {
  return { success: false, error: errorCode, errorCode };
}

function hasFile(value: unknown): value is File {
  return typeof value === "object" && value !== null && "size" in value && Number(value.size) > 0;
}

function inputFromFormData(formData: FormData) {
  return {
    supplier_bill_id: stringValue(formData.get("supplier_bill_id")),
    payment_date: stringValue(formData.get("payment_date")),
    amount: stringValue(formData.get("amount")),
    method: stringValue(formData.get("method")),
    reference: stringValue(formData.get("reference")),
    notes: stringValue(formData.get("notes")),
    request_id: stringValue(formData.get("request_id")),
    document: formData.get("document"),
  };
}

type SupplierPaymentRpcRow = {
  error_code: string | null;
  payment_id: string | null;
  payment_number?: string | null;
  supplier_bill_id: string | null;
  paid_amount: number | string | null;
  outstanding_amount: number | string | null;
  payment_status: string | null;
  idempotent_replay: boolean;
};

async function existingPaymentForRequest(
  supabase: ReturnType<typeof getSupplierPaymentClient>,
  input: {
    supplier_bill_id: string;
    payment_date: string;
    amount: number;
    method: string;
    reference?: string;
    notes?: string;
    request_id: string;
  },
): Promise<SupplierPaymentActionResult<{ payment_id: string; payment_number: string; outstanding_amount: number; payment_status: string }> | null> {
  const { data, error } = await supabase
    .from("supplier_payments")
    .select("id,payment_number,supplier_bill_id,payment_date,amount,method,reference,notes,record_request_id")
    .eq("record_request_id", input.request_id)
    .maybeSingle();
  if (error || !data) return null;
  if (
    data.supplier_bill_id !== input.supplier_bill_id
    || data.payment_date !== input.payment_date
    || Number(data.amount) !== input.amount
    || data.method !== input.method
    || (data.reference ?? null) !== (input.reference || null)
    || (data.notes ?? null) !== (input.notes || null)
  ) {
    return actionError("supplier_payment_request_conflict");
  }
  const { data: summary } = await supabase
    .from("supplier_bill_payment_balances")
    .select("outstanding_amount,payment_status")
    .eq("supplier_bill_id", input.supplier_bill_id)
    .maybeSingle();
  return {
    success: true,
    data: {
      payment_id: data.id,
      payment_number: data.payment_number,
      outstanding_amount: Number(summary?.outstanding_amount ?? 0),
      payment_status: summary?.payment_status ?? "partially_paid",
    },
    idempotentReplay: true,
  };
}

export async function recordSupplierPaymentAction(
  formData: FormData,
): Promise<SupplierPaymentActionResult<{ payment_id: string; payment_number: string; outstanding_amount: number; payment_status: string }>> {
  let uploadedDocument: Awaited<ReturnType<typeof uploadPrivateSupplierPaymentEvidence>> | null = null;
  const link = { serviceId: "", linkPurpose: "supplier_payment" };
  try {
    const user = await requirePermission(SUPPLIER_PAYMENT_PERMISSIONS.record);
    const parsed = supplierPaymentInputSchema.safeParse(inputFromFormData(formData));
    if (!parsed.success || !hasFile(parsed.data.document)) return actionError("supplier_payment_request_invalid");

    const supabase = getSupplierPaymentClient();
    const replay = await existingPaymentForRequest(supabase, {
      supplier_bill_id: parsed.data.supplier_bill_id,
      payment_date: parsed.data.payment_date,
      amount: Number(parsed.data.amount),
      method: parsed.data.method,
      reference: parsed.data.reference,
      notes: parsed.data.notes,
      request_id: parsed.data.request_id,
    });
    if (replay) return replay;
    const { data: bill, error: billError } = await supabase
      .from("supplier_bills")
      .select("service_id")
      .eq("id", parsed.data.supplier_bill_id)
      .maybeSingle();
    if (billError || !bill?.service_id) return actionError("supplier_payment_bill_not_found");
    link.serviceId = bill.service_id;

    uploadedDocument = await uploadPrivateSupplierPaymentEvidence({
      file: parsed.data.document,
      documentType: "supplier_payment_evidence",
      purpose: "Supplier payment evidence",
      link,
    });

    const { data, error } = await supabase.rpc("record_supplier_payment", {
      p_supplier_bill_id: parsed.data.supplier_bill_id,
      p_payment_date: parsed.data.payment_date,
      p_amount: Number(parsed.data.amount),
      p_method: parsed.data.method,
      p_reference: parsed.data.reference || null,
      p_notes: parsed.data.notes || null,
      p_document_id: uploadedDocument.id,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });
    if (error) {
      const { data: linkedPayment } = await supabase
        .from("supplier_payment_documents")
        .select("supplier_payment_id")
        .eq("document_id", uploadedDocument.id)
        .maybeSingle();
      if (linkedPayment?.supplier_payment_id) {
        const [{ data: persistedPayment }, { data: persistedSummary }] = await Promise.all([
          supabase.from("supplier_payments").select("id,payment_number,record_request_id").eq("id", linkedPayment.supplier_payment_id).maybeSingle(),
          supabase.from("supplier_bill_payment_balances").select("outstanding_amount,payment_status").eq("supplier_bill_id", parsed.data.supplier_bill_id).maybeSingle(),
        ]);
        if (persistedPayment?.record_request_id === parsed.data.request_id) {
          return {
            success: true,
            data: {
              payment_id: persistedPayment.id,
              payment_number: persistedPayment.payment_number,
              outstanding_amount: Number(persistedSummary?.outstanding_amount ?? 0),
              payment_status: persistedSummary?.payment_status ?? "partially_paid",
            },
            idempotentReplay: true,
          };
        }
      }
      await cleanupUploadedPrivateBusinessDocument(uploadedDocument, link);
      return actionError("supplier_payment_record_failed");
    }
    const row = (Array.isArray(data) ? data[0] : null) as SupplierPaymentRpcRow | null;
    if (!row || row.error_code || !row.payment_id || !row.payment_number) {
      if (row?.error_code === "supplier_payment_request_conflict") {
        const replay = await existingPaymentForRequest(supabase, {
          supplier_bill_id: parsed.data.supplier_bill_id,
          payment_date: parsed.data.payment_date,
          amount: Number(parsed.data.amount),
          method: parsed.data.method,
          reference: parsed.data.reference,
          notes: parsed.data.notes,
          request_id: parsed.data.request_id,
        });
        if (replay?.success) {
          await cleanupUploadedPrivateBusinessDocument(uploadedDocument, link);
          return replay;
        }
      }
      await cleanupUploadedPrivateBusinessDocument(uploadedDocument, link);
      return actionError(row?.error_code ?? "supplier_payment_record_failed");
    }

    revalidatePath("/supplier-payments");
    revalidatePath(`/supplier-payments/${row.payment_id}`);
    revalidatePath(`/supplier-bills/${parsed.data.supplier_bill_id}`);
    revalidatePath("/supplier-bills");
    const { data: billBalance } = await supabase
      .from("supplier_bill_payment_balances")
      .select("outstanding_amount,payment_status")
      .eq("supplier_bill_id", parsed.data.supplier_bill_id)
      .maybeSingle();
    return {
      success: true,
      data: {
        payment_id: row.payment_id,
        payment_number: row.payment_number,
        outstanding_amount: Number(billBalance?.outstanding_amount ?? row.outstanding_amount ?? 0),
        payment_status: billBalance?.payment_status ?? row.payment_status ?? "partially_paid",
      },
      idempotentReplay: row.idempotent_replay,
    };
  } catch {
    if (uploadedDocument && link.serviceId) await cleanupUploadedPrivateBusinessDocument(uploadedDocument, link);
    return actionError("supplier_payment_record_failed");
  }
}

export async function reverseSupplierPaymentAction(
  input: unknown,
): Promise<SupplierPaymentActionResult<{ payment_id: string; supplier_bill_id: string; outstanding_amount: number; payment_status: string }>> {
  try {
    const user = await requirePermission(SUPPLIER_PAYMENT_PERMISSIONS.reverse);
    const parsed = reverseSupplierPaymentSchema.safeParse(input);
    if (!parsed.success) return actionError("supplier_payment_reversal_request_invalid");
    const { data, error } = await getSupplierPaymentClient().rpc("reverse_supplier_payment", {
      p_payment_id: parsed.data.payment_id,
      p_reason: parsed.data.reason,
      p_request_id: parsed.data.request_id,
      p_actor_id: user.id,
      p_actor_role: user.role,
    });
    if (error) return actionError("supplier_payment_reversal_failed");
    const row = (Array.isArray(data) ? data[0] : null) as SupplierPaymentRpcRow | null;
    if (!row || row.error_code || !row.payment_id || !row.supplier_bill_id) {
      return actionError(row?.error_code ?? "supplier_payment_reversal_failed");
    }
    revalidatePath("/supplier-payments");
    revalidatePath(`/supplier-payments/${row.payment_id}`);
    revalidatePath(`/supplier-bills/${row.supplier_bill_id}`);
    const { data: billBalance } = await getSupplierPaymentClient()
      .from("supplier_bill_payment_balances")
      .select("outstanding_amount,payment_status")
      .eq("supplier_bill_id", row.supplier_bill_id)
      .maybeSingle();
    return {
      success: true,
      data: {
        payment_id: row.payment_id,
        supplier_bill_id: row.supplier_bill_id,
        outstanding_amount: Number(billBalance?.outstanding_amount ?? row.outstanding_amount ?? 0),
        payment_status: billBalance?.payment_status ?? row.payment_status ?? "unpaid",
      },
      idempotentReplay: row.idempotent_replay,
    };
  } catch {
    return actionError("supplier_payment_reversal_failed");
  }
}

export async function createSupplierPaymentDocumentViewUrl(
  input: unknown,
): Promise<SupplierPaymentActionResult<{ signedUrl: string; expiresInSeconds: number }>> {
  try {
    await requirePermission(SUPPLIER_PAYMENT_PERMISSIONS.read);
    if (typeof input !== "object" || input === null) return actionError("supplier_payment_request_invalid");
    const value = input as { paymentId?: unknown; documentId?: unknown };
    if (typeof value.paymentId !== "string" || typeof value.documentId !== "string") return actionError("supplier_payment_request_invalid");
    const supabase = getSupplierPaymentClient();
    const [{ data: payment }, { data: documentLink }] = await Promise.all([
      supabase.from("supplier_payments").select("service_id").eq("id", value.paymentId).maybeSingle(),
      supabase.from("supplier_payment_documents").select("document_id").eq("supplier_payment_id", value.paymentId).eq("document_id", value.documentId).maybeSingle(),
    ]);
    if (!payment?.service_id || !documentLink) return actionError("supplier_payment_document_failed");
    const result = await createPrivateSupplierPaymentEvidenceUrl({ documentId: value.documentId, serviceId: payment.service_id });
    return { success: true, data: { signedUrl: result.signedUrl, expiresInSeconds: result.expiresInSeconds } };
  } catch {
    return actionError("supplier_payment_document_failed");
  }
}
