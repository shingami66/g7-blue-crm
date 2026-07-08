"use server";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import type { QuotationDetailRow, QuotationItemRow } from "@/lib/quotations/types";
import { APPROVED_BILLING_SCOPE_PERMISSIONS } from "./permissions";
import { createApprovedBillingScopeDraftSchema } from "./schemas";
import type {
  ApprovedBillingScopeActionResult,
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

function parseMoney(value: number | string | null | undefined): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? roundMoney(parsed) : 0;
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

function buildSourcePricingContext(row: QuotationDetailRow): Record<string, unknown> {
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
): ApprovedBillingScopeDraftInsertRow[] {
  return items.map((item, index) => {
    const sourceQty = parseMoney(item.qty);
    const sourceUnitPrice = parseMoney(item.unit_price);
    const sourceSubtotal = roundMoney(sourceQty * sourceUnitPrice);
    const sourceVatAmount = parseMoney(item.vat);
    const sourceGrandTotal =
      item.total != null
        ? parseMoney(item.total)
        : roundMoney(sourceSubtotal + sourceVatAmount);

    return {
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
    };
  });
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

function errorResult(
  error: ApprovedBillingScopeErrorCode
): CreateApprovedBillingScopeDraftResult {
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

    const draftConflict = await draftConflictStatus(
      supabase,
      parsed.data.sourceQuotationId
    );

    if (draftConflict === "error") {
      return errorResult("scope_unexpected_error");
    }

    if (draftConflict === "existing" || draftConflict === "duplicate") {
      return errorResult("scope_duplicate_draft");
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

    if (parseMoney(quotation.discount) > 0) {
      return errorResult("scope_discount_not_supported");
    }

    const normalizedItems = normalizeQuotationItems(quotation);

    if (normalizedItems.length === 0) {
      return errorResult("scope_no_items");
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
          source_vat_rate: parseMoney(quotation.vat_rate),
          source_discount: parseMoney(quotation.discount),
          source_currency: sourceCurrencyFromQuotation(quotation),
          source_quotation_subtotal: parseMoney(quotation.subtotal),
          source_quotation_vat_amount: parseMoney(quotation.vat_amount),
          source_quotation_grand_total: parseMoney(quotation.grand_total),
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
