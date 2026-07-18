"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { INVOICE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { createAdminClient } from "@/lib/supabase/admin";
import { consumeRateLimit } from "@/lib/security/rate-limit";
import { createInvoiceSchema } from "./schemas";
import { buildInvoiceSnapshotData } from "./snapshots";
import { mapRowToQuotationDetail } from "@/lib/quotations/mappers";
import type { QuotationDetailRow } from "@/lib/quotations/types";
import type { CreateInvoiceResult, IssueInvoiceResult } from "./types";

const QUOTATION_DETAIL_SELECT =
  "*, quotation_items(*), customers(company, contact), services(service_number, service_title, status, event_name)";
const RATE_LIMIT_ERROR = "Too many attempts. Please wait a moment and try again.";
const CREATE_INVOICE_RATE_LIMIT = { limit: 5, windowMs: 60_000 };
const ISSUE_INVOICE_RATE_LIMIT = { limit: 10, windowMs: 60_000 };

const CREATE_INVOICE_ATOMIC_RPC = "create_invoice_atomic";
const CREATE_INVOICE_ATOMIC_ROW_KEYS = [
  "error_code",
  "invoice_id",
  "invoice_number",
] as const;

type CreateInvoiceAtomicRpcRow = {
  error_code: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
};

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwnDataProperties(
  value: object,
  propertyNames: readonly string[],
): boolean {
  return propertyNames.every((propertyName) => {
    const descriptor = Object.getOwnPropertyDescriptor(value, propertyName);
    return descriptor !== undefined && "value" in descriptor;
  });
}

function isCreateInvoiceAtomicRpcRow(
  value: unknown,
): value is CreateInvoiceAtomicRpcRow {
  if (
    !isPlainObject(value) ||
    !hasOwnDataProperties(value, CREATE_INVOICE_ATOMIC_ROW_KEYS)
  ) {
    return false;
  }

  const errorCode = value.error_code;
  const invoiceId = value.invoice_id;
  const invoiceNumber = value.invoice_number;

  const errorCodeOk =
    errorCode === null ||
    (typeof errorCode === "string" && errorCode.trim().length > 0);
  const invoiceIdOk =
    invoiceId === null ||
    (typeof invoiceId === "string" && invoiceId.trim().length > 0);
  const invoiceNumberOk =
    invoiceNumber === null ||
    (typeof invoiceNumber === "string" && invoiceNumber.trim().length > 0);

  return errorCodeOk && invoiceIdOk && invoiceNumberOk;
}

function parseCreateInvoiceAtomicRpcData(
  data: unknown,
): CreateInvoiceAtomicRpcRow | null {
  if (Array.isArray(data)) {
    if (data.length !== 1) {
      return null;
    }
    return isCreateInvoiceAtomicRpcRow(data[0]) ? data[0] : null;
  }

  return isCreateInvoiceAtomicRpcRow(data) ? data : null;
}

export async function createInvoiceAction(
  input: unknown,
): Promise<CreateInvoiceResult> {
  try {
    const user = await requirePermission(INVOICE_PERMISSIONS.write);

    if (
      !consumeRateLimit(
        "createInvoiceAction",
        user.clerk_user_id,
        CREATE_INVOICE_RATE_LIMIT,
      )
    ) {
      return { success: false, error: RATE_LIMIT_ERROR };
    }

    const parsed = createInvoiceSchema.safeParse(input);

    if (!parsed.success) {
      return { success: false, error: "invalid_invoice_input" };
    }

    const { quotationId, serviceId, invoiceType, requestedAmount } = parsed.data;

    if (invoiceType === "deposit") {
      if (requestedAmount === undefined || requestedAmount === null) {
        return { success: false, error: "deposit_amount_required" };
      }

      if (
        typeof requestedAmount !== "number" ||
        !Number.isFinite(requestedAmount) ||
        requestedAmount <= 0
      ) {
        return { success: false, error: "invalid_deposit_amount" };
      }
    }

    if (invoiceType === "final" && requestedAmount !== undefined) {
      return { success: false, error: "invalid_invoice_input" };
    }

    const supabase = createAdminClient();

    // Presentation reads only: RPC remains sole financial authority for create.
    const { data: quotationRow, error: quotationError } = await supabase
      .from("quotations")
      .select(QUOTATION_DETAIL_SELECT)
      .eq("id", quotationId)
      .eq("is_deleted", false)
      .single();

    if (quotationError || !quotationRow) {
      return { success: false, error: "quotation_not_found" };
    }

    const quotationDetail = mapRowToQuotationDetail(
      quotationRow as unknown as QuotationDetailRow,
    );

    const { data: settings, error: settingsError } = await supabase
      .from("company_settings")
      .select("*")
      .eq("setting_key", "default")
      .maybeSingle();

    if (settingsError || !settings || !settings.vat_mode) {
      return { success: false, error: "company_settings_unavailable" };
    }

    if (settings.vat_mode !== "not_registered") {
      return {
        success: false,
        error: "vat_registered_invoice_not_implemented_in_this_slice",
      };
    }

    let snapshotData;
    try {
      // Presentation snapshots only. Do not resolve ABS/exposure/amounts here —
      // create_invoice_atomic recomputes financial authority and may enrich Final settlement.
      snapshotData = buildInvoiceSnapshotData(
        settings,
        quotationDetail,
        null,
        invoiceType === "deposit" ? requestedAmount : undefined,
        invoiceType,
      );

      if (
        !snapshotData ||
        !snapshotData.snapshot_seller ||
        !snapshotData.snapshot_buyer ||
        !snapshotData.snapshot_quotation ||
        !snapshotData.snapshot_bank_details ||
        !snapshotData.snapshot_document_rules ||
        !snapshotData.vat_mode ||
        typeof snapshotData.vat_rate !== "number" ||
        !snapshotData.document_label
      ) {
        return { success: false, error: "invoice_snapshot_unavailable" };
      }
    } catch (err) {
      console.error(
        "[createInvoiceAction] Snapshot error:",
        err instanceof Error ? err.message : "Unknown",
      );
      return { success: false, error: "invoice_snapshot_unavailable" };
    }

    const today = new Date().toISOString().slice(0, 10);

    const { data: rpcData, error: rpcError } = await supabase.rpc(
      CREATE_INVOICE_ATOMIC_RPC,
      {
        p_service_id: serviceId,
        p_quotation_id: quotationId,
        p_invoice_type: invoiceType,
        p_requested_amount:
          invoiceType === "deposit" ? requestedAmount : null,
        p_actor_clerk_user_id: user.clerk_user_id,
        p_document_label: snapshotData.document_label,
        p_vat_mode: snapshotData.vat_mode,
        p_snapshot_seller: snapshotData.snapshot_seller,
        p_snapshot_buyer: snapshotData.snapshot_buyer,
        p_snapshot_quotation: snapshotData.snapshot_quotation,
        p_snapshot_bank_details: snapshotData.snapshot_bank_details,
        p_snapshot_document_rules: snapshotData.snapshot_document_rules,
        p_invoice_date: today,
        p_due_date: today,
      },
    );

    if (rpcError) {
      console.error(
        "[createInvoiceAction] Atomic create RPC transport error:",
        rpcError.message,
      );
      return { success: false, error: "invoice_creation_failed" };
    }

    const rpcRow = parseCreateInvoiceAtomicRpcData(rpcData);
    if (!rpcRow) {
      console.error(
        "[createInvoiceAction] Atomic create RPC returned an invalid row shape",
      );
      return { success: false, error: "invoice_creation_failed" };
    }

    if (rpcRow.error_code !== null) {
      return { success: false, error: rpcRow.error_code };
    }

    if (
      rpcRow.invoice_id === null ||
      rpcRow.invoice_number === null ||
      rpcRow.invoice_id.trim().length === 0 ||
      rpcRow.invoice_number.trim().length === 0
    ) {
      console.error(
        "[createInvoiceAction] Atomic create RPC returned success without invoice identity",
      );
      return { success: false, error: "invoice_creation_failed" };
    }

    return {
      success: true,
      invoiceId: rpcRow.invoice_id,
      invoiceNumber: rpcRow.invoice_number,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "Unauthorized" };
    }
    if (err instanceof ForbiddenError) {
      return { success: false, error: "Forbidden" };
    }
    console.error(
      "[createInvoiceAction] Unexpected error:",
      err instanceof Error ? err.message : "Unknown",
    );
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function issueInvoiceAction(
  invoiceId: string,
): Promise<IssueInvoiceResult> {
  try {
    const user = await requirePermission(INVOICE_PERMISSIONS.write);

    if (
      !consumeRateLimit(
        "issueInvoiceAction",
        user.clerk_user_id,
        ISSUE_INVOICE_RATE_LIMIT,
      )
    ) {
      return { success: false, error: RATE_LIMIT_ERROR };
    }

    if (!invoiceId || typeof invoiceId !== "string") {
      return { success: false, error: "invalid_invoice_id" };
    }

    const supabase = createAdminClient();

    const { data: invoice, error: fetchError } = await supabase
      .from("invoices")
      .select("id, status, is_deleted")
      .eq("id", invoiceId)
      .maybeSingle();

    if (fetchError || !invoice) {
      return { success: false, error: "invoice_not_found" };
    }

    if (invoice.is_deleted) {
      return { success: false, error: "invoice_not_found" };
    }

    if (invoice.status !== "draft") {
      return { success: false, error: "invoice_not_draft" };
    }

    const { data: updatedInvoice, error: updateError } = await supabase
      .from("invoices")
      .update({
        status: "sent",
        issued_at: new Date().toISOString(),
      })
      .eq("id", invoiceId)
      .eq("status", "draft")
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[issueInvoiceAction] Invoice update failed:", updateError);
      return { success: false, error: "invoice_update_failed" };
    }

    if (!updatedInvoice) {
      return { success: false, error: "invoice_not_draft" };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "Unauthorized" };
    }
    if (err instanceof ForbiddenError) {
      return { success: false, error: "Forbidden" };
    }
    console.error(
      "[issueInvoiceAction] Unexpected error:",
      err instanceof Error ? err.message : "Unknown",
    );
    return { success: false, error: "An unexpected error occurred." };
  }
}
