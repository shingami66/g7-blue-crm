"use server";

import { requirePermission } from "@/lib/auth/permissions";
import { INVOICE_PERMISSIONS } from "@/lib/auth/role-permissions";
import { UnauthorizedError, ForbiddenError, AuthDependencyError } from "@/lib/auth/errors";
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

const RECONCILE_INVOICE_CREATE_MUTATION_RPC = "reconcile_invoice_create_mutation";
const RECONCILE_INVOICE_CREATE_ROW_KEYS = [
  "reconciliation_status",
  "invoice_id",
  "invoice_number",
] as const;

const CREATE_INVOICE_ATOMIC_RPC = "create_invoice_atomic";
const CREATE_INVOICE_ATOMIC_ROW_KEYS = [
  "error_code",
  "invoice_id",
  "invoice_number",
  "is_replayed",
] as const;

const ISSUE_INVOICE_ATOMIC_RPC = "issue_invoice_atomic";
const ISSUE_INVOICE_ATOMIC_ROW_KEYS = [
  "error_code",
  "invoice_id",
  "invoice_number",
] as const;

const CREATE_INVOICE_ATOMIC_ERROR_CODES = [
  "invalid_invoice_input",
  "vat_registered_invoice_not_implemented_in_this_slice",
  "deposit_amount_required",
  "invalid_deposit_amount",
  "deposit_amount_exceeds_remaining",
  "service_lifecycle_unavailable",
  "invoice_customer_unavailable",
  "service_not_eligible_for_deposit",
  "service_not_eligible_for_final",
  "quotation_not_found",
  "quotation_not_approved",
  "quotation_service_mismatch",
  "deposit_invoice_already_exists",
  "final_invoice_already_exists",
  "billing_scope_authority_unavailable",
  "billing_scope_inactive",
  "invoice_exposure_unavailable",
  "prior_invoices_exceed_billing_scope_ceiling",
  "prior_invoices_exceed_quotation_total",
  "invoice_amount_exceeds_ceiling",
  "billing_scope_service_mismatch",
  "invoice_grand_total_invalid",
  "invoice_number_unavailable",
  "invoice_insert_failed",
  "invoice_creation_failed",
  "invoice_snapshot_authority_unavailable",
  "mutation_key_conflict",
] as const;

const ISSUE_INVOICE_ATOMIC_ERROR_CODES = [
  "invoice_not_found",
  "invoice_not_draft",
  "invoice_issue_concurrency_conflict",
  "invoice_issue_failed",
] as const;

export type ReconcileInvoiceCreateRpcRow = {
  reconciliation_status: "MATCH" | "NOT_FOUND" | "CONFLICT";
  invoice_id: string | null;
  invoice_number: string | null;
};

type CreateInvoiceAtomicRpcRow = {
  error_code: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  is_replayed: boolean | null;
};

type IssueInvoiceAtomicRpcRow = {
  error_code: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
};

function isCreateInvoiceAtomicErrorCode(
  value: string,
): value is (typeof CREATE_INVOICE_ATOMIC_ERROR_CODES)[number] {
  return CREATE_INVOICE_ATOMIC_ERROR_CODES.some((code) => code === value);
}

function isIssueInvoiceAtomicErrorCode(
  value: string,
): value is (typeof ISSUE_INVOICE_ATOMIC_ERROR_CODES)[number] {
  return ISSUE_INVOICE_ATOMIC_ERROR_CODES.some((code) => code === value);
}

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

function isReconcileInvoiceCreateRpcRow(
  value: unknown,
): value is ReconcileInvoiceCreateRpcRow {
  if (
    !isPlainObject(value) ||
    !hasOwnDataProperties(value, RECONCILE_INVOICE_CREATE_ROW_KEYS)
  ) {
    return false;
  }

  const status = value.reconciliation_status;
  const invoiceId = value.invoice_id;
  const invoiceNumber = value.invoice_number;

  if (status === "MATCH") {
    return (
      typeof invoiceId === "string" &&
      invoiceId.trim().length > 0 &&
      typeof invoiceNumber === "string" &&
      invoiceNumber.trim().length > 0
    );
  }

  if (status === "NOT_FOUND" || status === "CONFLICT") {
    return invoiceId === null && invoiceNumber === null;
  }

  return false;
}

function parseReconcileInvoiceCreateRpcData(
  data: unknown,
): ReconcileInvoiceCreateRpcRow | null {
  if (Array.isArray(data)) {
    if (data.length !== 1) {
      return null;
    }
    return isReconcileInvoiceCreateRpcRow(data[0]) ? data[0] : null;
  }

  return isReconcileInvoiceCreateRpcRow(data) ? data : null;
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
  const isReplayed = value.is_replayed;

  const errorCodeOk =
    errorCode === null ||
    (typeof errorCode === "string" && errorCode.trim().length > 0);
  const invoiceIdOk =
    invoiceId === null ||
    (typeof invoiceId === "string" && invoiceId.trim().length > 0);
  const invoiceNumberOk =
    invoiceNumber === null ||
    (typeof invoiceNumber === "string" && invoiceNumber.trim().length > 0);
  const isReplayedOk =
    isReplayed === null || typeof isReplayed === "boolean";

  return errorCodeOk && invoiceIdOk && invoiceNumberOk && isReplayedOk;
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

function isIssueInvoiceAtomicRpcRow(
  value: unknown,
): value is IssueInvoiceAtomicRpcRow {
  if (
    !isPlainObject(value) ||
    !hasOwnDataProperties(value, ISSUE_INVOICE_ATOMIC_ROW_KEYS)
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

function parseIssueInvoiceAtomicRpcData(
  data: unknown,
): IssueInvoiceAtomicRpcRow | null {
  if (Array.isArray(data)) {
    if (data.length !== 1) {
      return null;
    }
    return isIssueInvoiceAtomicRpcRow(data[0]) ? data[0] : null;
  }

  return isIssueInvoiceAtomicRpcRow(data) ? data : null;
}

async function reconcileInvoiceMutation(
  supabase: ReturnType<typeof createAdminClient>,
  mutationKey: string,
  serviceId: string,
  quotationId: string,
  invoiceType: string,
  requestedAmount?: number | null,
): Promise<ReconcileInvoiceCreateRpcRow | null> {
  const { data, error } = await supabase.rpc(
    RECONCILE_INVOICE_CREATE_MUTATION_RPC,
    {
      p_mutation_key: mutationKey,
      p_service_id: serviceId,
      p_quotation_id: quotationId,
      p_invoice_type: invoiceType,
      p_requested_amount:
        invoiceType === "deposit" && requestedAmount !== undefined && requestedAmount !== null
          ? requestedAmount
          : null,
    },
  );

  if (error) {
    return null;
  }

  return parseReconcileInvoiceCreateRpcData(data);
}

export async function createInvoiceAction(
  input: unknown,
): Promise<CreateInvoiceResult> {
  const correlationId = crypto.randomUUID();
  try {
    // 1. Authorization check
    const user = await requirePermission(INVOICE_PERMISSIONS.write);

    // 2. Rate limit check
    if (
      !consumeRateLimit(
        "createInvoiceAction",
        user.clerk_user_id,
        CREATE_INVOICE_RATE_LIMIT,
      )
    ) {
      return { success: false, error: RATE_LIMIT_ERROR };
    }

    // 3. Schema validation
    const parsed = createInvoiceSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: "invalid_invoice_input" };
    }

    const { mutationKey, quotationId, serviceId, invoiceType, requestedAmount } = parsed.data;

    // 4. Deterministic logical-intent validation (before reconciliation)
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

      // Reject amounts with more than 2 decimal places (do not silently round invalid input)
      const amountStr = requestedAmount.toString();
      const decimals = amountStr.includes(".") ? amountStr.split(".")[1] : "";
      if (decimals.length > 2 || Number(requestedAmount.toFixed(2)) !== requestedAmount) {
        return { success: false, error: "invalid_deposit_amount" };
      }
    }

    if (invoiceType === "final" && requestedAmount !== undefined && requestedAmount !== null) {
      return { success: false, error: "invalid_invoice_input" };
    }

    const supabase = createAdminClient();

    // 5. Dedicated initial reconciliation RPC
    const initialReconciliation = await reconcileInvoiceMutation(
      supabase,
      mutationKey,
      serviceId,
      quotationId,
      invoiceType,
      requestedAmount,
    );

    if (!initialReconciliation) {
      console.error(
        `[createInvoiceAction] [${correlationId}] Initial reconciliation RPC transport or parser failure`,
      );
      return { success: false, error: "invoice_creation_failed" };
    }

    if (initialReconciliation.reconciliation_status === "MATCH") {
      return {
        success: true,
        invoiceId: initialReconciliation.invoice_id!,
        invoiceNumber: initialReconciliation.invoice_number!,
        isReplayed: true,
      };
    }

    if (initialReconciliation.reconciliation_status === "CONFLICT") {
      return {
        success: false,
        error: "MUTATION_KEY_CONFLICT",
      };
    }

    // Recovery helper for mutable pre-RPC preparation failures after initial NOT_FOUND
    const handlePreworkFailure = async (originalError: string): Promise<CreateInvoiceResult> => {
      const recovery = await reconcileInvoiceMutation(
        supabase,
        mutationKey,
        serviceId,
        quotationId,
        invoiceType,
        requestedAmount,
      );

      if (recovery) {
        if (recovery.reconciliation_status === "MATCH") {
          return {
            success: true,
            invoiceId: recovery.invoice_id!,
            invoiceNumber: recovery.invoice_number!,
            isReplayed: true,
          };
        }
        if (recovery.reconciliation_status === "CONFLICT") {
          return {
            success: false,
            error: "MUTATION_KEY_CONFLICT",
          };
        }
      }

      return { success: false, error: originalError };
    };

    // 6. Fresh-create preparation only reached after NOT_FOUND
    const { data: quotationRow, error: quotationError } = await supabase
      .from("quotations")
      .select(QUOTATION_DETAIL_SELECT)
      .eq("id", quotationId)
      .eq("is_deleted", false)
      .single();

    if (quotationError || !quotationRow) {
      return await handlePreworkFailure("quotation_not_found");
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
      return await handlePreworkFailure("company_settings_unavailable");
    }

    if (settings.vat_mode !== "not_registered") {
      return await handlePreworkFailure("vat_registered_invoice_not_implemented_in_this_slice");
    }

    let snapshotData;
    try {
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
        return await handlePreworkFailure("invoice_snapshot_unavailable");
      }
    } catch {
      console.error(
        `[createInvoiceAction] [${correlationId}] Snapshot build error: snapshot_generation_failed`,
      );
      return await handlePreworkFailure("invoice_snapshot_unavailable");
    }

    const today = new Date().toISOString().slice(0, 10);

    // 7. Atomic create RPC invocation with mutation key
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
        p_mutation_key: mutationKey,
        p_invoice_date: today,
        p_due_date: today,
      },
    );

    if (rpcError) {
      console.error(
        `[createInvoiceAction] [${correlationId}] Atomic create RPC transport error: database_transport_error`,
      );
      // Transport uncertainty recovery: perform one reconciliation attempt
      const transportRecovery = await reconcileInvoiceMutation(
        supabase,
        mutationKey,
        serviceId,
        quotationId,
        invoiceType,
        requestedAmount,
      );

      if (transportRecovery) {
        if (transportRecovery.reconciliation_status === "MATCH") {
          return {
            success: true,
            invoiceId: transportRecovery.invoice_id!,
            invoiceNumber: transportRecovery.invoice_number!,
            isReplayed: true,
          };
        }
        if (transportRecovery.reconciliation_status === "CONFLICT") {
          return {
            success: false,
            error: "MUTATION_KEY_CONFLICT",
          };
        }
      }

      return { success: false, error: "invoice_creation_failed" };
    }

    const rpcRow = parseCreateInvoiceAtomicRpcData(rpcData);
    if (!rpcRow) {
      console.error(
        `[createInvoiceAction] [${correlationId}] Atomic create RPC returned invalid row shape: malformed_rpc_payload`,
      );
      return { success: false, error: "invoice_creation_failed" };
    }

    if (rpcRow.error_code !== null) {
      if (rpcRow.error_code === "mutation_key_conflict") {
        return {
          success: false,
          error: "MUTATION_KEY_CONFLICT",
        };
      }
      return {
        success: false,
        error: isCreateInvoiceAtomicErrorCode(rpcRow.error_code)
          ? rpcRow.error_code
          : "invoice_creation_failed",
      };
    }

    if (
      rpcRow.invoice_id === null ||
      rpcRow.invoice_number === null ||
      rpcRow.invoice_id.trim().length === 0 ||
      rpcRow.invoice_number.trim().length === 0
    ) {
      console.error(
        `[createInvoiceAction] [${correlationId}] Atomic create RPC returned success without invoice identity: missing_identity`,
      );
      return { success: false, error: "invoice_creation_failed" };
    }

    return {
      success: true,
      invoiceId: rpcRow.invoice_id,
      invoiceNumber: rpcRow.invoice_number,
      isReplayed: rpcRow.is_replayed === true,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "Unauthorized" };
    }
    if (err instanceof ForbiddenError) {
      return { success: false, error: "Forbidden" };
    }
    if (err instanceof AuthDependencyError) {
      console.error(
        `[createInvoiceAction] [${correlationId}] Auth dependency failure: auth_unavailable`,
      );
      return { success: false, error: "An unexpected error occurred." };
    }
    console.error(
      `[createInvoiceAction] [${correlationId}] Unexpected error: internal_error`,
    );
    return { success: false, error: "An unexpected error occurred." };
  }
}

export async function issueInvoiceAction(
  invoiceId: string,
): Promise<IssueInvoiceResult> {
  const correlationId = crypto.randomUUID();
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
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      ISSUE_INVOICE_ATOMIC_RPC,
      {
        p_invoice_id: invoiceId,
        p_actor_clerk_user_id: user.clerk_user_id,
      },
    );

    if (rpcError) {
      console.error(
        `[issueInvoiceAction] [${correlationId}] Atomic issue RPC transport error: database_transport_error`,
      );
      return { success: false, error: "invoice_issue_failed" };
    }

    const rpcRow = parseIssueInvoiceAtomicRpcData(rpcData);
    if (!rpcRow) {
      console.error(
        `[issueInvoiceAction] [${correlationId}] Atomic issue RPC returned invalid row shape: malformed_rpc_payload`,
      );
      return { success: false, error: "invoice_issue_failed" };
    }

    if (rpcRow.error_code !== null) {
      return {
        success: false,
        error: isIssueInvoiceAtomicErrorCode(rpcRow.error_code)
          ? rpcRow.error_code
          : "invoice_issue_failed",
      };
    }

    if (
      rpcRow.invoice_id === null ||
      rpcRow.invoice_number === null ||
      rpcRow.invoice_id.trim().length === 0 ||
      rpcRow.invoice_number.trim().length === 0
    ) {
      console.error(
        `[issueInvoiceAction] [${correlationId}] Atomic issue RPC returned success without invoice identity: missing_identity`,
      );
      return { success: false, error: "invoice_issue_failed" };
    }

    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      return { success: false, error: "Unauthorized" };
    }
    if (err instanceof ForbiddenError) {
      return { success: false, error: "Forbidden" };
    }
    if (err instanceof AuthDependencyError) {
      console.error(
        `[issueInvoiceAction] [${correlationId}] Auth dependency failure: auth_unavailable`,
      );
      return { success: false, error: "An unexpected error occurred." };
    }
    console.error(
      `[issueInvoiceAction] [${correlationId}] Unexpected error: internal_error`,
    );
    return { success: false, error: "An unexpected error occurred." };
  }
}
