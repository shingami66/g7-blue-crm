"use server";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { parseAuthoritativeMoney } from "@/lib/invoices/money";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database.types";
import type { QuotationDetailRow, QuotationItemRow } from "@/lib/quotations/types";
import { isTerminalServiceStatus } from "@/lib/services/status-transitions";
import type { ServiceStatus } from "@/types/service";
import { APPROVED_BILLING_SCOPE_PERMISSIONS } from "./permissions";
import { APPROVED_BILLING_SCOPE_ERROR_CODES } from "./errors";
import {
  createApprovedBillingScopeDraftSchema,
  discardApprovedBillingScopeDraftSchema,
  editApprovedBillingScopeItemSchema,
  reviewApprovedBillingScopeLineSafetySchema,
  approveApprovedBillingScopeSchema,
  voidApprovedBillingScopeSchema,
} from "./schemas";
import { getApprovedBillingScopeById } from "./queries";
import type {
  ApprovedBillingScopeActionResult,
  ApprovedBillingScopeDetail,
  ApprovedBillingScopeErrorCode,
} from "./types";

const SOURCE_QUOTATION_SELECT =
  "id, quotation_number, service_id, event, date, valid_until, subtotal, discount, vat_rate, vat_amount, grand_total, status, is_deleted, snapshot_seller, quotation_items(id, quotation_id, description, details, category, qty, unit_price, vat, total, created_at, updated_at)";
const DEFAULT_SOURCE_CURRENCY = "SAR";
const MAX_SCOPE_CREATE_ATTEMPTS = 3;
const UNIQUE_VIOLATION_CODE = "23505";
const SERVICE_VERSION_CONSTRAINT =
  "approved_billing_scopes_service_version_key";

export interface CreateApprovedBillingScopeDraftData {
  scopeId: string;
  serviceId: string;
  sourceQuotationId: string;
  scopeVersion: number;
}

export type CreateApprovedBillingScopeDraftResult =
  ApprovedBillingScopeActionResult<CreateApprovedBillingScopeDraftData>;

export interface DiscardApprovedBillingScopeDraftData {
  scopeId: string;
  serviceId: string;
  sourceQuotationId: string;
  discarded: true;
}

export type DiscardApprovedBillingScopeDraftResult =
  ApprovedBillingScopeActionResult<DiscardApprovedBillingScopeDraftData>;

type DiscardApprovedBillingScopeDraftRpcRow = {
  error_code: string | null;
  scope_id: string | null;
  service_id: string | null;
  source_quotation_id: string | null;
  discarded: boolean;
};

type SourceServiceLifecycleRow = {
  status: ServiceStatus;
  deleted_at: string | null;
};

type ApprovedBillingScopeDraftInsertRow = {
  approved_billing_scope_id: string;
  source_quotation_id: string;
  source_quotation_item_id: string;
  display_order: number;
  decision: "accepted";
  source_description: string;
  source_details: string | null;
  source_category: string | null;
  source_qty: number;
  source_unit_price: number;
  source_subtotal: number;
  source_vat_amount: number;
  source_grand_total: number;
  accepted_qty: number;
  accepted_unit_price: number;
  accepted_subtotal: number;
  accepted_vat_amount: number;
  accepted_grand_total: number;
  reason_code: null;
  reason_note: null;
};

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * ABS write-side money boundary: reuse Invoice authoritative money helpers.
 * Never coerce malformed/non-finite/negative values to zero.
 * Returns null when the value is unavailable or non-canonical.
 */
function parseAbsWriteMoney(value: unknown): number | null {
  return parseAuthoritativeMoney(value);
}

function sourceCurrencyFromQuotation(row: QuotationDetailRow): string {
  const snapshot = row.snapshot_seller;

  if (
    snapshot &&
    typeof snapshot === "object" &&
    "currency" in snapshot &&
    typeof snapshot.currency === "string" &&
    snapshot.currency.trim().length > 0
  ) {
    return snapshot.currency.trim();
  }

  return DEFAULT_SOURCE_CURRENCY;
}

function buildSourcePricingContext(row: QuotationDetailRow): Json {
  return {
    quotationNumber: row.quotation_number,
    event: row.event,
    quotationDate: row.date,
    validUntil: row.valid_until,
  };
}

function normalizeQuotationItems(
  row: QuotationDetailRow
): QuotationItemRow[] {
  return [...(row.quotation_items ?? [])].sort((left, right) => {
    const createdAtCompare = left.created_at.localeCompare(right.created_at);
    if (createdAtCompare !== 0) {
      return createdAtCompare;
    }

    return left.id.localeCompare(right.id);
  });
}

function buildDraftItemInsertRows(
  scopeId: string,
  sourceQuotationId: string,
  items: QuotationItemRow[]
): ApprovedBillingScopeDraftInsertRow[] | null {
  const rows: ApprovedBillingScopeDraftInsertRow[] = [];

  for (const [index, item] of items.entries()) {
    const sourceQty = parseAbsWriteMoney(item.qty);
    const sourceUnitPrice = parseAbsWriteMoney(item.unit_price);
    const sourceVatAmount = parseAbsWriteMoney(item.vat);

    if (
      sourceQty == null ||
      sourceUnitPrice == null ||
      sourceVatAmount == null
    ) {
      return null;
    }

    // Domain: source qty must be positive for draft copy.
    if (sourceQty <= 0) {
      return null;
    }

    const sourceSubtotal = roundMoney(sourceQty * sourceUnitPrice);
    if (!Number.isFinite(sourceSubtotal) || sourceSubtotal < 0) {
      return null;
    }

    let sourceGrandTotal: number;
    if (item.total != null) {
      const parsedTotal = parseAbsWriteMoney(item.total);
      if (parsedTotal == null) {
        return null;
      }
      sourceGrandTotal = parsedTotal;
    } else {
      sourceGrandTotal = roundMoney(sourceSubtotal + sourceVatAmount);
      if (!Number.isFinite(sourceGrandTotal) || sourceGrandTotal < 0) {
        return null;
      }
    }

    rows.push({
      approved_billing_scope_id: scopeId,
      source_quotation_id: sourceQuotationId,
      source_quotation_item_id: item.id,
      display_order: index,
      decision: "accepted",
      source_description: item.description,
      source_details: item.details,
      source_category: item.category ?? null,
      source_qty: sourceQty,
      source_unit_price: sourceUnitPrice,
      source_subtotal: sourceSubtotal,
      source_vat_amount: sourceVatAmount,
      source_grand_total: sourceGrandTotal,
      accepted_qty: sourceQty,
      accepted_unit_price: sourceUnitPrice,
      accepted_subtotal: sourceSubtotal,
      accepted_vat_amount: sourceVatAmount,
      accepted_grand_total: sourceGrandTotal,
      reason_code: null,
      reason_note: null,
    });
  }

  return rows;
}

function parseQuotationHeaderMoney(quotation: QuotationDetailRow): {
  vatRate: number;
  discount: number;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
} | null {
  const vatRate = parseAbsWriteMoney(quotation.vat_rate);
  const discount = parseAbsWriteMoney(quotation.discount);
  const subtotal = parseAbsWriteMoney(quotation.subtotal);
  const vatAmount = parseAbsWriteMoney(quotation.vat_amount);
  const grandTotal = parseAbsWriteMoney(quotation.grand_total);

  if (
    vatRate == null ||
    discount == null ||
    subtotal == null ||
    vatAmount == null ||
    grandTotal == null
  ) {
    return null;
  }

  return { vatRate, discount, subtotal, vatAmount, grandTotal };
}

function draftTotals(items: ApprovedBillingScopeDraftInsertRow[]) {
  return items.reduce(
    (totals, item) => ({
      acceptedSubtotal: roundMoney(totals.acceptedSubtotal + item.accepted_subtotal),
      acceptedVatAmount: roundMoney(
        totals.acceptedVatAmount + item.accepted_vat_amount
      ),
      acceptedGrandTotal: roundMoney(
        totals.acceptedGrandTotal + item.accepted_grand_total
      ),
    }),
    {
      acceptedSubtotal: 0,
      acceptedVatAmount: 0,
      acceptedGrandTotal: 0,
    }
  );
}

async function nextScopeVersion(
  supabase: ReturnType<typeof createAdminClient>,
  serviceId: string
): Promise<number | null> {
  const { data, error } = await supabase
    .from("approved_billing_scopes")
    .select("scope_version")
    .eq("service_id", serviceId)
    .order("scope_version", { ascending: false })
    .limit(1);

  if (error) {
    console.error("[createApprovedBillingScopeDraft] Scope version lookup error:", error.message);
    return null;
  }

  const currentMax = Number(data?.[0]?.scope_version ?? 0);
  return Number.isFinite(currentMax) ? currentMax + 1 : 1;
}

async function cleanupDraftScopeInsert(
  supabase: ReturnType<typeof createAdminClient>,
  scopeId: string
): Promise<boolean> {
  const { error: itemsDeleteError } = await supabase
    .from("approved_billing_scope_items")
    .delete()
    .eq("approved_billing_scope_id", scopeId);

  if (itemsDeleteError) {
    console.error(
      "[createApprovedBillingScopeDraft] Compensation item cleanup error:",
      itemsDeleteError.message
    );
    return false;
  }

  const { error: scopeDeleteError } = await supabase
    .from("approved_billing_scopes")
    .delete()
    .eq("id", scopeId)
    .eq("status", "draft");

  if (scopeDeleteError) {
    console.error(
      "[createApprovedBillingScopeDraft] Compensation scope cleanup error:",
      scopeDeleteError.message
    );
    return false;
  }

  return true;
}

async function draftConflictStatus(
  supabase: ReturnType<typeof createAdminClient>,
  sourceQuotationId: string
): Promise<"none" | "existing" | "duplicate" | "error"> {
  const { data: rows, error } = await supabase
    .from("approved_billing_scopes")
    .select("id")
    .eq("source_quotation_id", sourceQuotationId)
    .eq("status", "draft")
    .is("voided_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(2);

  if (error) {
    console.error(
      "[createApprovedBillingScopeDraft] Draft conflict lookup error:",
      error.message
    );
    return "error";
  }

  const draftRows = rows ?? [];

  if (draftRows.length === 0) {
    return "none";
  }

  if (draftRows.length > 1) {
    console.error(
      "[createApprovedBillingScopeDraft] Duplicate draft billing scopes detected for source quotation:",
      sourceQuotationId
    );
    return "duplicate";
  }

  return "existing";
}

function errorResult<T>(
  error: ApprovedBillingScopeErrorCode
): ApprovedBillingScopeActionResult<T> {
  return { success: false, error };
}

function isUniqueViolation(error: { code?: string | null } | null | undefined): boolean {
  return error?.code === UNIQUE_VIOLATION_CODE;
}

function isServiceVersionConflict(
  error:
    | {
        code?: string | null;
        message?: string | null;
      }
    | null
    | undefined
): boolean {
  if (!isUniqueViolation(error)) {
    return false;
  }

  return (error?.message ?? "").includes(SERVICE_VERSION_CONSTRAINT);
}

export async function createApprovedBillingScopeDraft(
  input: unknown
): Promise<CreateApprovedBillingScopeDraftResult> {
  try {
    const user = await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.create);
    const parsed = createApprovedBillingScopeDraftSchema.safeParse(input);
    const supabase = createAdminClient();

    if (!parsed.success) {
      return errorResult("scope_unexpected_error");
    }

    const { data: quotationRow, error: quotationError } = await supabase
      .from("quotations")
      .select(SOURCE_QUOTATION_SELECT)
      .eq("id", parsed.data.sourceQuotationId)
      .maybeSingle();

    if (quotationError) {
      console.error(
        "[createApprovedBillingScopeDraft] Source quotation lookup error:",
        quotationError.message
      );
      return errorResult("scope_unexpected_error");
    }

    if (!quotationRow) {
      return errorResult("scope_not_found");
    }

    const quotation = quotationRow as QuotationDetailRow;

    if (quotation.status !== "approved") {
      return errorResult("scope_source_not_approved");
    }

    if (quotation.is_deleted) {
      return errorResult("scope_source_deleted");
    }

    if (!quotation.service_id) {
      return errorResult("scope_source_service_mismatch");
    }

    const { data: serviceRow, error: serviceError } = await supabase
      .from("services")
      .select("status, deleted_at")
      .eq("id", quotation.service_id)
      .maybeSingle();

    if (serviceError) {
      console.error(
        "[createApprovedBillingScopeDraft] Source Service lookup error:",
        serviceError.message
      );
      return errorResult("scope_unexpected_error");
    }

    if (!serviceRow) {
      return errorResult("scope_source_service_mismatch");
    }

    const sourceService = serviceRow as SourceServiceLifecycleRow;

    if (
      sourceService.deleted_at != null ||
      isTerminalServiceStatus(sourceService.status)
    ) {
      return errorResult("scope_service_lifecycle_ineligible");
    }

    const headerMoney = parseQuotationHeaderMoney(quotation);
    if (headerMoney == null) {
      return errorResult("scope_unexpected_error");
    }

    if (headerMoney.discount > 0) {
      return errorResult("scope_discount_not_supported");
    }

    const normalizedItems = normalizeQuotationItems(quotation);

    if (normalizedItems.length === 0) {
      return errorResult("scope_no_items");
    }

    const draftConflict = await draftConflictStatus(supabase, quotation.id);

    if (draftConflict === "error") {
      return errorResult("scope_unexpected_error");
    }

    if (draftConflict === "existing" || draftConflict === "duplicate") {
      return errorResult("scope_duplicate_draft");
    }

    for (
      let attempt = 1;
      attempt <= MAX_SCOPE_CREATE_ATTEMPTS;
      attempt += 1
    ) {
      const currentDraftConflict = await draftConflictStatus(
        supabase,
        quotation.id
      );

      if (currentDraftConflict === "error") {
        return errorResult("scope_unexpected_error");
      }

      if (
        currentDraftConflict === "existing" ||
        currentDraftConflict === "duplicate"
      ) {
        return errorResult("scope_duplicate_draft");
      }

      const scopeVersion = await nextScopeVersion(supabase, quotation.service_id);

      if (!scopeVersion) {
        return errorResult("scope_unexpected_error");
      }

      const itemInsertRows = buildDraftItemInsertRows(
        crypto.randomUUID(),
        quotation.id,
        normalizedItems
      );
      if (itemInsertRows == null || itemInsertRows.length === 0) {
        return errorResult("scope_unexpected_error");
      }
      const totals = draftTotals(itemInsertRows);

      const { data: createdScope, error: scopeInsertError } = await supabase
        .from("approved_billing_scopes")
        .insert({
          id: itemInsertRows[0].approved_billing_scope_id,
          service_id: quotation.service_id,
          source_quotation_id: quotation.id,
          scope_version: scopeVersion,
          status: "draft",
          accepted_subtotal: totals.acceptedSubtotal,
          accepted_vat_amount: totals.acceptedVatAmount,
          accepted_grand_total: totals.acceptedGrandTotal,
          source_vat_rate: headerMoney.vatRate,
          source_discount: headerMoney.discount,
          source_currency: sourceCurrencyFromQuotation(quotation),
          source_quotation_subtotal: headerMoney.subtotal,
          source_quotation_vat_amount: headerMoney.vatAmount,
          source_quotation_grand_total: headerMoney.grandTotal,
          source_pricing_context: buildSourcePricingContext(quotation),
          line_safety_status: "pending_review",
          created_by: user.clerk_user_id,
          updated_by: user.clerk_user_id,
        })
        .select("id, service_id, source_quotation_id, scope_version")
        .single();

      if (scopeInsertError || !createdScope) {
        const postConflictDraftStatus = await draftConflictStatus(
          supabase,
          quotation.id
        );

        if (
          postConflictDraftStatus === "existing" ||
          postConflictDraftStatus === "duplicate"
        ) {
          return errorResult("scope_duplicate_draft");
        }

        if (postConflictDraftStatus === "error") {
          return errorResult("scope_unexpected_error");
        }

        if (isServiceVersionConflict(scopeInsertError)) {
          if (attempt === MAX_SCOPE_CREATE_ATTEMPTS) {
            console.error(
              "[createApprovedBillingScopeDraft] Scope version conflict retries exhausted for service:",
              quotation.service_id
            );
            return errorResult("scope_concurrency_conflict");
          }

          continue;
        }

        console.error(
          "[createApprovedBillingScopeDraft] Scope insert error:",
          scopeInsertError?.message ?? "Unknown"
        );
        return errorResult("scope_unexpected_error");
      }

      const { error: itemInsertError } = await supabase
        .from("approved_billing_scope_items")
        .insert(itemInsertRows);

      if (itemInsertError) {
        console.error(
          "[createApprovedBillingScopeDraft] Scope item insert error:",
          itemInsertError.message
        );

        const cleanedUp = await cleanupDraftScopeInsert(supabase, createdScope.id);

        if (!cleanedUp) {
          console.error(
            "[createApprovedBillingScopeDraft] Compensation cleanup failed for scope:",
            createdScope.id
          );
        }

        return errorResult("scope_unexpected_error");
      }

      return {
        success: true,
        data: {
          scopeId: createdScope.id,
          serviceId: createdScope.service_id,
          sourceQuotationId: createdScope.source_quotation_id,
          scopeVersion: createdScope.scope_version,
        },
      };
    }

    return errorResult("scope_concurrency_conflict");
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return errorResult("scope_permission_denied");
    }

    console.error(
      "[createApprovedBillingScopeDraft] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return errorResult("scope_unexpected_error");
  }
}

export async function discardApprovedBillingScopeDraft(
  input: unknown
): Promise<DiscardApprovedBillingScopeDraftResult> {
  try {
    await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.discard);
    const parsed = discardApprovedBillingScopeDraftSchema.safeParse(input);
    const supabase = createAdminClient();

    if (!parsed.success) {
      return errorResult("scope_unexpected_error");
    }

    const { data: discardResult, error: discardError } = await supabase
      .rpc("discard_approved_billing_scope_draft", {
        p_scope_id: parsed.data.scopeId,
      })
      .single<DiscardApprovedBillingScopeDraftRpcRow>();

    if (discardError) {
      console.error(
        "[discardApprovedBillingScopeDraft] Atomic discard RPC error:",
        discardError.message
      );
      return errorResult("scope_unexpected_error");
    }

    if (!discardResult) {
      console.error(
        "[discardApprovedBillingScopeDraft] Atomic discard RPC returned no row for scope:",
        parsed.data.scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    if (discardResult.error_code === "scope_not_found") {
      return errorResult("scope_not_found");
    }

    if (discardResult.error_code === "scope_not_draft") {
      return errorResult("scope_not_draft");
    }

    if (
      discardResult.error_code ||
      !discardResult.discarded ||
      !discardResult.scope_id ||
      !discardResult.service_id ||
      !discardResult.source_quotation_id
    ) {
      console.error(
        "[discardApprovedBillingScopeDraft] Atomic discard RPC returned unexpected payload for scope:",
        parsed.data.scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    return {
      success: true,
      data: {
        scopeId: discardResult.scope_id,
        serviceId: discardResult.service_id,
        sourceQuotationId: discardResult.source_quotation_id,
        discarded: true,
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return errorResult("scope_permission_denied");
    }

    console.error(
      "[discardApprovedBillingScopeDraft] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return errorResult("scope_unexpected_error");
  }
}

export type EditApprovedBillingScopeItemResult =
  ApprovedBillingScopeActionResult<ApprovedBillingScopeDetail>;

type EditApprovedBillingScopeItemRpcRow = {
  error_code: string | null;
  scope_id: string | null;
  item_id: string | null;
  accepted_subtotal: number | null;
  accepted_vat_amount: number | null;
  accepted_grand_total: number | null;
  line_safety_status: string | null;
  updated: boolean;
};

export async function editApprovedBillingScopeItem(
  input: unknown
): Promise<EditApprovedBillingScopeItemResult> {
  try {
    await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.update);
    const parsed = editApprovedBillingScopeItemSchema.safeParse(input);
    const supabase = createAdminClient();

    if (!parsed.success) {
      return errorResult("scope_unexpected_error");
    }

    const {
      scopeId,
      itemId,
      decision,
      acceptedQty,
      acceptedUnitPrice,
      reasonCode,
      reasonNote,
      displayOrder,
    } = parsed.data;

    let normalizedAcceptedQty: number | null = null;
    if (acceptedQty !== undefined) {
      const qty = parseAbsWriteMoney(acceptedQty);
      if (qty == null) {
        return errorResult("scope_unexpected_error");
      }
      // Domain: accepted qty must remain non-negative; zero allowed for exclude paths.
      normalizedAcceptedQty = qty;
    }

    let normalizedAcceptedUnitPrice: number | null = null;
    if (acceptedUnitPrice !== undefined) {
      const unitPrice = parseAbsWriteMoney(acceptedUnitPrice);
      if (unitPrice == null) {
        return errorResult("scope_unexpected_error");
      }
      normalizedAcceptedUnitPrice = unitPrice;
    }

    const { data: editResult, error: editError } = await supabase
      .rpc("edit_approved_billing_scope_item", {
        p_scope_id: scopeId,
        p_item_id: itemId,
        p_decision: decision,
        p_accepted_qty: (normalizedAcceptedQty !== undefined ? normalizedAcceptedQty : null) as number,
        p_accepted_unit_price: (normalizedAcceptedUnitPrice !== undefined ? normalizedAcceptedUnitPrice : null) as number,
        p_reason_code: (reasonCode !== undefined ? reasonCode : null) as string,
        p_reason_note: (reasonNote !== undefined ? reasonNote : null) as string,
        p_display_order: (displayOrder !== undefined ? displayOrder : null) as number,
      })
      .single<EditApprovedBillingScopeItemRpcRow>();

    if (editError) {
      console.error(
        "[editApprovedBillingScopeItem] Atomic edit RPC error:",
        editError.message
      );
      return errorResult("scope_unexpected_error");
    }

    if (!editResult) {
      console.error(
        "[editApprovedBillingScopeItem] Atomic edit RPC returned no row for scope:",
        scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    if (editResult.error_code === "scope_not_found") {
      return errorResult("scope_not_found");
    }

    if (editResult.error_code === "scope_not_draft") {
      return errorResult("scope_not_draft");
    }

    if (editResult.error_code === "scope_reduction_invalid") {
      return errorResult("scope_reduction_invalid");
    }

    if (editResult.error_code === "scope_reason_required") {
      return errorResult("scope_reason_required");
    }

    if (editResult.error_code === "scope_concurrency_conflict") {
      return errorResult("scope_concurrency_conflict");
    }

    if (
      editResult.error_code ||
      !editResult.updated ||
      !editResult.scope_id ||
      !editResult.item_id
    ) {
      console.error(
        "[editApprovedBillingScopeItem] Atomic edit RPC returned unexpected payload for scope:",
        scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    // Read back scope detail
    const detail = await getApprovedBillingScopeById(scopeId);
    if (!detail) {
      console.error(
        "[editApprovedBillingScopeItem] Failed to read back updated scope detail for scope:",
        scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    return {
      success: true,
      data: detail,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return errorResult("scope_permission_denied");
    }

    console.error(
      "[editApprovedBillingScopeItem] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return errorResult("scope_unexpected_error");
  }
}

export type ReviewApprovedBillingScopeLineSafetyResult =
  ApprovedBillingScopeActionResult<ApprovedBillingScopeDetail>;

export async function reviewApprovedBillingScopeLineSafety(
  input: unknown
): Promise<ReviewApprovedBillingScopeLineSafetyResult> {
  try {
    const user = await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.review);
    const parsed = reviewApprovedBillingScopeLineSafetySchema.safeParse(input);
    const supabase = createAdminClient();

    if (!parsed.success) {
      return errorResult("scope_unexpected_error");
    }

    const { scopeId, lineSafetyStatus, reasonCode, reviewerNote } = parsed.data;

    // Load scope and its items
    const { data: scope, error: scopeError } = await supabase
      .from("approved_billing_scopes")
      .select("id, status, line_safety_status, service_id, voided_at, superseded_at")
      .eq("id", scopeId)
      .maybeSingle();

    if (scopeError) {
      console.error("[reviewApprovedBillingScopeLineSafety] Error loading scope:", scopeError.message);
      return errorResult("scope_unexpected_error");
    }

    if (!scope) {
      return errorResult("scope_not_found");
    }

    if (scope.voided_at) {
      return errorResult("scope_terminal_voided");
    }

    if (scope.superseded_at) {
      return errorResult("scope_not_draft");
    }

    if (scope.status !== "draft") {
      return errorResult("scope_not_draft");
    }

    const { data: items, error: itemsError } = await supabase
      .from("approved_billing_scope_items")
      .select("*")
      .eq("approved_billing_scope_id", scopeId);

    if (itemsError) {
      console.error("[reviewApprovedBillingScopeLineSafety] Error loading items:", itemsError.message);
      return errorResult("scope_unexpected_error");
    }

    if (!items || items.length === 0) {
      return errorResult("scope_no_items");
    }

    // Determine whether line decisions are safe based on current item decisions and required reasons/zero amounts.
    if (lineSafetyStatus === "safe") {
      for (const item of items) {
        const decision = item.decision;
        const acceptedQty = Number(item.accepted_qty);
        const acceptedUnitPrice = Number(item.accepted_unit_price);
        const acceptedSubtotal = Number(item.accepted_subtotal);
        const acceptedVatAmount = Number(item.accepted_vat_amount);
        const acceptedGrandTotal = Number(item.accepted_grand_total);
        const sourceQty = Number(item.source_qty);
        const sourceUnitPrice = Number(item.source_unit_price);
        const sourceSubtotal = Number(item.source_subtotal);
        const sourceVatAmount = Number(item.source_vat_amount);
        const sourceGrandTotal = Number(item.source_grand_total);

        // d) all numeric values must be finite.
        if (
          !Number.isFinite(acceptedQty) ||
          !Number.isFinite(acceptedUnitPrice) ||
          !Number.isFinite(acceptedSubtotal) ||
          !Number.isFinite(acceptedVatAmount) ||
          !Number.isFinite(acceptedGrandTotal)
        ) {
          return errorResult("scope_unexpected_error");
        }

        // 1. accepted: accepted qty/unit_price/subtotal/vat/grand_total must equal source values
        if (decision === "accepted") {
          if (
            acceptedQty !== sourceQty ||
            acceptedUnitPrice !== sourceUnitPrice ||
            acceptedSubtotal !== sourceSubtotal ||
            acceptedVatAmount !== sourceVatAmount ||
            acceptedGrandTotal !== sourceGrandTotal
          ) {
            return errorResult("scope_reduction_invalid");
          }
        }
        // 2. excluded and customer_supplied: accepted quantities/prices/totals must all be zero, and require a reason_code
        else if (decision === "excluded" || decision === "customer_supplied") {
          if (
            acceptedQty !== 0 ||
            acceptedUnitPrice !== 0 ||
            acceptedSubtotal !== 0 ||
            acceptedVatAmount !== 0 ||
            acceptedGrandTotal !== 0
          ) {
            return errorResult("scope_reduction_invalid");
          }
          if (!item.reason_code || !item.reason_code.trim()) {
            return errorResult("scope_reason_required");
          }
        }
        // 3. adjusted: accepted values must be reductions-only, and require a reason_code
        else if (decision === "adjusted") {
          if (
            acceptedQty > sourceQty ||
            acceptedUnitPrice > sourceUnitPrice ||
            acceptedSubtotal > sourceSubtotal ||
            acceptedVatAmount > sourceVatAmount ||
            acceptedGrandTotal > sourceGrandTotal
          ) {
            return errorResult("scope_reduction_invalid");
          }
          if (Math.abs(acceptedGrandTotal - (acceptedSubtotal + acceptedVatAmount)) > 0.01) {
            return errorResult("scope_reduction_invalid");
          }
          if (!item.reason_code || !item.reason_code.trim()) {
            return errorResult("scope_reason_required");
          }
        } else {
          return errorResult("scope_unexpected_error");
        }
      }
    }

    // Perform database update
    const { data: updatedScope, error: updateError } = await supabase
      .from("approved_billing_scopes")
      .update({
        line_safety_status: lineSafetyStatus,
        line_safety_reason_code: lineSafetyStatus === "unsafe" ? (reasonCode ?? null) : null,
        line_safety_note: lineSafetyStatus === "unsafe" ? (reviewerNote ?? null) : null,
        line_safety_reviewed_by: user.clerk_user_id,
        line_safety_reviewed_at: new Date().toISOString(),
        updated_by: user.clerk_user_id,
      })
      .eq("id", scopeId)
      .eq("status", "draft")
      .is("voided_at", null)
      .is("superseded_at", null)
      .select("id")
      .maybeSingle();

    if (updateError) {
      console.error("[reviewApprovedBillingScopeLineSafety] Error updating scope:", updateError.message);
      return errorResult("scope_unexpected_error");
    }

    if (!updatedScope) {
      return errorResult("scope_concurrency_conflict");
    }

    const detail = await getApprovedBillingScopeById(scopeId);
    if (!detail) {
      console.error("[reviewApprovedBillingScopeLineSafety] Failed to read back updated scope detail:", scopeId);
      return errorResult("scope_unexpected_error");
    }

    return {
      success: true,
      data: detail,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return errorResult("scope_permission_denied");
    }

    console.error(
      "[reviewApprovedBillingScopeLineSafety] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return errorResult("scope_unexpected_error");
  }
}

export type ApproveApprovedBillingScopeResult =
  ApprovedBillingScopeActionResult<ApprovedBillingScopeDetail>;

type ApproveApprovedBillingScopeRpcRow = {
  error_code: string | null;
  scope_id: string | null;
  service_id: string | null;
  scope_version: number | null;
  approved_at: string | null;
  approved: boolean;
};

function isApprovedBillingScopeErrorCode(
  errorCode: string
): errorCode is ApprovedBillingScopeErrorCode {
  return APPROVED_BILLING_SCOPE_ERROR_CODES.some((code) => code === errorCode);
}

function isApprovedBillingScopeRpcSuccess(
  approval: ApproveApprovedBillingScopeRpcRow,
  scopeId: string
): boolean {
  return (
    approval.error_code === null &&
    approval.scope_id === scopeId &&
    typeof approval.service_id === "string" &&
    approval.service_id.length > 0 &&
    Number.isInteger(approval.scope_version) &&
    (approval.scope_version ?? 0) > 0 &&
    typeof approval.approved_at === "string" &&
    !Number.isNaN(Date.parse(approval.approved_at)) &&
    approval.approved === true
  );
}

export async function approveApprovedBillingScope(
  input: unknown
): Promise<ApproveApprovedBillingScopeResult> {
  try {
    const parsed = approveApprovedBillingScopeSchema.safeParse(input);

    if (!parsed.success) {
      return errorResult("scope_unexpected_error");
    }

    const user = await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.approve);
    const { scopeId } = parsed.data;
    const supabase = createAdminClient();
    const { data: approvals, error: approvalError } = await supabase.rpc(
      "approve_approved_billing_scope",
      {
        p_scope_id: scopeId,
        p_actor_id: user.clerk_user_id,
        p_actor_role: user.role,
      }
    );

    if (approvalError) {
      console.error(
        "[approveApprovedBillingScope] Atomic approval RPC error:",
        approvalError.message
      );
      return errorResult("scope_unexpected_error");
    }

    if (!Array.isArray(approvals) || approvals.length !== 1) {
      console.error(
        "[approveApprovedBillingScope] Atomic approval RPC returned an invalid row count for scope:",
        scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    const approval = approvals[0] as ApproveApprovedBillingScopeRpcRow;

    if (typeof approval?.error_code === "string") {
      return isApprovedBillingScopeErrorCode(approval.error_code)
        ? errorResult(approval.error_code)
        : errorResult("scope_unexpected_error");
    }

    if (!isApprovedBillingScopeRpcSuccess(approval, scopeId)) {
      console.error(
        "[approveApprovedBillingScope] Atomic approval RPC returned an invalid success payload for scope:",
        scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    return {
      success: true,
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return errorResult("scope_permission_denied");
    }

    console.error(
      "[approveApprovedBillingScope] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return errorResult("scope_unexpected_error");
  }
}

export type VoidApprovedBillingScopeResult =
  ApprovedBillingScopeActionResult;

type VoidApprovedBillingScopeRpcRow = {
  error_code: string | null;
  scope_id: string | null;
  service_id: string | null;
  scope_version: number | null;
  applicable_invoice_count: number | string;
  lifetime_invoice_total: number | string;
  payment_history_count: number | string;
  voided_at: string | null;
  voided: boolean;
};

const VOID_RPC_RESULT_KEYS = [
  "error_code",
  "scope_id",
  "service_id",
  "scope_version",
  "applicable_invoice_count",
  "lifetime_invoice_total",
  "payment_history_count",
  "voided_at",
  "voided",
] as const;

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

function isNonNegativeInteger(value: unknown): value is number | string {
  if (typeof value === "number") {
    return Number.isSafeInteger(value) && value >= 0;
  }

  return (
    typeof value === "string" &&
    /^\d+$/.test(value) &&
    Number.isSafeInteger(Number(value))
  );
}

function isNonNegativeNumeric(value: unknown): value is number | string {
  if (typeof value === "number") {
    return Number.isFinite(value) && value >= 0;
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return false;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0;
}

function isVoidApprovedBillingScopeRpcRow(
  value: unknown
): value is VoidApprovedBillingScopeRpcRow {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return false;
  }

  const row = value as Record<string, unknown>;
  const keys = Object.keys(row);

  if (
    keys.length !== VOID_RPC_RESULT_KEYS.length ||
    VOID_RPC_RESULT_KEYS.some(
      (key) => !Object.prototype.hasOwnProperty.call(row, key)
    )
  ) {
    return false;
  }

  return (
    (row.error_code === null || typeof row.error_code === "string") &&
    (row.scope_id === null || isUuid(row.scope_id)) &&
    (row.service_id === null || isUuid(row.service_id)) &&
    (row.scope_version === null ||
      (typeof row.scope_version === "number" &&
        Number.isSafeInteger(row.scope_version) &&
        row.scope_version > 0)) &&
    isNonNegativeInteger(row.applicable_invoice_count) &&
    isNonNegativeNumeric(row.lifetime_invoice_total) &&
    isNonNegativeInteger(row.payment_history_count) &&
    (row.voided_at === null ||
      (typeof row.voided_at === "string" &&
        !Number.isNaN(Date.parse(row.voided_at)))) &&
    typeof row.voided === "boolean"
  );
}

function isVoidApprovedBillingScopeRpcSuccess(
  row: VoidApprovedBillingScopeRpcRow,
  scopeId: string
): boolean {
  return (
    row.error_code === null &&
    row.scope_id === scopeId &&
    row.service_id !== null &&
    row.scope_version !== null &&
    row.voided_at !== null &&
    row.voided === true
  );
}

export async function voidApprovedBillingScope(
  input: unknown
): Promise<VoidApprovedBillingScopeResult> {
  try {
    const parsed = voidApprovedBillingScopeSchema.safeParse(input);

    if (!parsed.success) {
      return errorResult("scope_unexpected_error");
    }

    const user = await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.void);
    const { scopeId, reasonCode, reasonNote } = parsed.data;
    const supabase = createAdminClient();
    const { data: voidResults, error: voidError } = await supabase.rpc(
      "void_approved_billing_scope",
      {
        p_scope_id: scopeId,
        p_reason_code: reasonCode,
        p_reason_note: reasonNote,
        p_actor_id: user.clerk_user_id,
        p_actor_role: user.role,
      }
    );

    if (voidError) {
      console.error(
        "[voidApprovedBillingScope] Atomic void RPC error:",
        voidError.message
      );
      return errorResult("scope_unexpected_error");
    }

    if (
      !Array.isArray(voidResults) ||
      voidResults.length !== 1 ||
      !isVoidApprovedBillingScopeRpcRow(voidResults[0])
    ) {
      console.error(
        "[voidApprovedBillingScope] Atomic void RPC returned an invalid result for scope:",
        scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    const voidResult = voidResults[0];

    if (typeof voidResult.error_code === "string") {
      return isApprovedBillingScopeErrorCode(voidResult.error_code)
        ? errorResult(voidResult.error_code)
        : errorResult("scope_unexpected_error");
    }

    if (!isVoidApprovedBillingScopeRpcSuccess(voidResult, scopeId)) {
      console.error(
        "[voidApprovedBillingScope] Atomic void RPC returned an invalid success payload for scope:",
        scopeId
      );
      return errorResult("scope_unexpected_error");
    }

    return { success: true };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      return errorResult("scope_permission_denied");
    }

    console.error(
      "[voidApprovedBillingScope] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return errorResult("scope_unexpected_error");
  }
}
