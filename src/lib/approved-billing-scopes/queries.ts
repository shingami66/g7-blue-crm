import "server-only";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import {
  checkPermission,
  requirePermission,
} from "@/lib/auth/permissions";
import { getServiceBillingState } from "@/lib/invoices/billing-state";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPROVED_BILLING_SCOPE_PERMISSIONS } from "./permissions";
import {
  applyApprovedBillingScopeReadMasking,
  composeServiceAbsAuthoritySummary,
  isActiveApprovedScope,
  mapAbsScopeHistoryRow,
  mapAbsScopeLineageSummary,
  mapApprovedBillingScopeItemRow,
  mapApprovedBillingScopeRow,
  mapApprovedBillingScopeSummaryRow,
} from "./mappers";
import {
  resolveAbsCardScenario,
  pickAbsCardScopes,
} from "./card-view-model";
import type {
  AbsScopeHistoryListData,
  AbsServiceOwnedScopeDetail,
  ApprovedBillingScopeDetail,
  ApprovedBillingScopeItemRow,
  ApprovedBillingScopeListOptions,
  ApprovedBillingScopeRow,
  ApprovedBillingScopeRowWithItems,
  ApprovedBillingScopeReadResult,
  ApprovedBillingScopeSummary,
  ServiceAbsAuthoritySummary,
} from "./types";
import { ABS_SCOPE_HISTORY_HARD_LIMIT } from "./types";

const APPROVED_BILLING_SCOPE_WITH_ITEMS_SELECT =
  "*, approved_billing_scope_items:approved_billing_scope_items!approved_billing_scope_id(*)";
const DUPLICATE_DRAFT_ERROR_CODE = "scope_duplicate_draft";

const HISTORY_SELECT =
  "id, service_id, source_quotation_id, scope_version, status, accepted_subtotal, accepted_vat_amount, accepted_grand_total, line_safety_status, created_at, line_safety_reviewed_at, approved_at, voided_at, superseded_at, supersedes_scope_id, superseded_by_scope_id";

const LINEAGE_SELECT =
  "id, service_id, source_quotation_id, scope_version, status, line_safety_status, accepted_grand_total, approved_at, superseded_at, voided_at, supersedes_scope_id, superseded_by_scope_id";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isApprovedBillingScopeUuid(value: string): boolean {
  return typeof value === "string" && UUID_RE.test(value);
}

function canReadApprovedBillingScopeInternalFields(role: string): boolean {
  return role === "admin" || role === "manager";
}

function mapApprovedBillingScopeDetail(
  row: ApprovedBillingScopeRowWithItems
): ApprovedBillingScopeDetail {
  const scope = mapApprovedBillingScopeRow(row);
  const items = (row.approved_billing_scope_items ?? [])
    .map((item) => mapApprovedBillingScopeItemRow(item as ApprovedBillingScopeItemRow))
    .sort((left, right) => left.displayOrder - right.displayOrder);

  return {
    ...scope,
    items,
    isActiveApprovedScope: isActiveApprovedScope(row),
  };
}

function unexpectedReadResult(): {
  status: "error";
  error: "scope_unexpected_error";
} {
  return { status: "error", error: "scope_unexpected_error" };
}

function invalidIdResult(): {
  status: "error";
  error: "scope_invalid_id";
} {
  return { status: "error", error: "scope_invalid_id" };
}

export async function listApprovedBillingScopesForServiceResult(
  serviceId: string,
  options?: ApprovedBillingScopeListOptions
): Promise<
  ApprovedBillingScopeReadResult<
    ApprovedBillingScopeSummary[],
    "scope_unexpected_error"
  >
> {
  await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);

  try {
    const supabase = createAdminClient();
    let query = supabase
      .from("approved_billing_scopes")
      .select("*")
      .eq("service_id", serviceId);

    if (options?.status) {
      query = query.eq("status", options.status);
    }

    const { data: rows, error } = await query
      .order("scope_version", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false });

    if (error) {
      console.error(
        "[listApprovedBillingScopesForService] Supabase error:",
        error.message
      );
      return unexpectedReadResult();
    }

    return {
      status: "success",
      data: (rows ?? []).map((row) =>
        mapApprovedBillingScopeSummaryRow(row as ApprovedBillingScopeRow)
      ),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[listApprovedBillingScopesForService] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}

export async function listApprovedBillingScopesForService(
  serviceId: string,
  options?: ApprovedBillingScopeListOptions
): Promise<ApprovedBillingScopeSummary[]> {
  const result = await listApprovedBillingScopesForServiceResult(serviceId, options);
  return result.status === "success" ? result.data : [];
}

export async function getApprovedBillingScopeByIdResult(
  scopeId: string
): Promise<ApprovedBillingScopeReadResult<ApprovedBillingScopeDetail>> {
  const user = await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);
  const canReadInternalNotes = canReadApprovedBillingScopeInternalFields(
    user.role
  );

  try {
    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("approved_billing_scopes")
      .select(APPROVED_BILLING_SCOPE_WITH_ITEMS_SELECT)
      .eq("id", scopeId)
      .order("display_order", {
        ascending: true,
        foreignTable: "approved_billing_scope_items",
      })
      .maybeSingle();

    if (error) {
      console.error("[getApprovedBillingScopeById] Supabase error:", error.message);
      return unexpectedReadResult();
    }

    if (!row) {
      return { status: "not_found", data: null, error: "scope_not_found" };
    }

    return {
      status: "success",
      data: applyApprovedBillingScopeReadMasking(
        mapApprovedBillingScopeDetail(row as ApprovedBillingScopeRowWithItems),
        { canReadInternalNotes }
      ),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getApprovedBillingScopeById] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}

export async function getApprovedBillingScopeById(
  scopeId: string
): Promise<ApprovedBillingScopeDetail | null> {
  const result = await getApprovedBillingScopeByIdResult(scopeId);
  return result.status === "success" ? result.data : null;
}

export async function getActiveApprovedBillingScopeForServiceResult(
  serviceId: string
): Promise<ApprovedBillingScopeReadResult<ApprovedBillingScopeDetail>> {
  const user = await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);
  const canReadInternalNotes = canReadApprovedBillingScopeInternalFields(
    user.role
  );

  try {
    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("approved_billing_scopes")
      .select(APPROVED_BILLING_SCOPE_WITH_ITEMS_SELECT)
      .eq("service_id", serviceId)
      .eq("status", "approved")
      .is("superseded_at", null)
      .is("voided_at", null)
      .order("display_order", {
        ascending: true,
        foreignTable: "approved_billing_scope_items",
      })
      .maybeSingle();

    if (error) {
      console.error(
        "[getActiveApprovedBillingScopeForService] Supabase error:",
        error.message
      );
      return unexpectedReadResult();
    }

    if (!row) {
      return { status: "not_found", data: null, error: "scope_not_found" };
    }

    return {
      status: "success",
      data: applyApprovedBillingScopeReadMasking(
        mapApprovedBillingScopeDetail(row as ApprovedBillingScopeRowWithItems),
        { canReadInternalNotes }
      ),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getActiveApprovedBillingScopeForService] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}

export async function getActiveApprovedBillingScopeForService(
  serviceId: string
): Promise<ApprovedBillingScopeDetail | null> {
  const result = await getActiveApprovedBillingScopeForServiceResult(serviceId);
  return result.status === "success" ? result.data : null;
}

export async function getExistingDraftScopeForQuotationResult(
  sourceQuotationId: string
): Promise<
  ApprovedBillingScopeReadResult<
    ApprovedBillingScopeSummary,
    | "scope_not_found"
    | "scope_duplicate_draft"
    | "scope_unexpected_error"
  >
> {
  await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);

  try {
    const supabase = createAdminClient();
    const { data: rows, error } = await supabase
      .from("approved_billing_scopes")
      .select(
        "id, service_id, source_quotation_id, scope_version, status, line_safety_status, accepted_grand_total, approved_at, superseded_at, voided_at"
      )
      .eq("source_quotation_id", sourceQuotationId)
      .eq("status", "draft")
      .is("voided_at", null)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(2);

    if (error) {
      console.error(
        "[getExistingDraftScopeForQuotation] Supabase error:",
        error.message
      );
      return unexpectedReadResult();
    }

    const draftRows = rows ?? [];

    if (draftRows.length === 0) {
      return { status: "not_found", data: null, error: "scope_not_found" };
    }

    if (draftRows.length > 1) {
      console.error(
        "[getExistingDraftScopeForQuotation] Duplicate draft billing scopes detected for source quotation:",
        sourceQuotationId
      );
      return { status: "error", error: DUPLICATE_DRAFT_ERROR_CODE };
    }

    return {
      status: "success",
      data: mapApprovedBillingScopeSummaryRow(
        draftRows[0] as ApprovedBillingScopeRow
      ),
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getExistingDraftScopeForQuotation] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}

export async function getExistingDraftScopeForQuotation(
  sourceQuotationId: string
): Promise<ApprovedBillingScopeSummary | null> {
  const result = await getExistingDraftScopeForQuotationResult(sourceQuotationId);

  if (result.status === "error" && result.error === DUPLICATE_DRAFT_ERROR_CODE) {
    throw new Error(DUPLICATE_DRAFT_ERROR_CODE);
  }

  return result.status === "success" ? result.data : null;
}

export async function getApprovedBillingScopeSummaryResult(
  scopeId: string
): Promise<ApprovedBillingScopeReadResult<ApprovedBillingScopeSummary>> {
  await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);

  try {
    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("approved_billing_scopes")
      .select(
        "id, service_id, source_quotation_id, scope_version, status, line_safety_status, accepted_grand_total, approved_at, superseded_at, voided_at"
      )
      .eq("id", scopeId)
      .maybeSingle();

    if (error) {
      console.error(
        "[getApprovedBillingScopeSummary] Supabase error:",
        error.message
      );
      return unexpectedReadResult();
    }

    return row
      ? {
          status: "success",
          data: mapApprovedBillingScopeSummaryRow(row as ApprovedBillingScopeRow),
        }
      : { status: "not_found", data: null, error: "scope_not_found" };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getApprovedBillingScopeSummary] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}

export async function getApprovedBillingScopeSummary(
  scopeId: string
): Promise<ApprovedBillingScopeSummary | null> {
  const result = await getApprovedBillingScopeSummaryResult(scopeId);
  return result.status === "success" ? result.data : null;
}

/**
 * Ordered Service ABS history for the financial lifecycle history surface.
 * Hard-capped at ABS_SCOPE_HISTORY_HARD_LIMIT (50).
 */
export async function listServiceApprovedBillingScopeHistoryResult(
  serviceId: string
): Promise<
  ApprovedBillingScopeReadResult<
    AbsScopeHistoryListData,
    "scope_invalid_id" | "scope_unexpected_error"
  >
> {
  await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);

  if (!isApprovedBillingScopeUuid(serviceId)) {
    return invalidIdResult();
  }

  try {
    const supabase = createAdminClient();
    const fetchLimit = ABS_SCOPE_HISTORY_HARD_LIMIT + 1;

    const { data: rows, error } = await supabase
      .from("approved_billing_scopes")
      .select(HISTORY_SELECT)
      .eq("service_id", serviceId)
      .order("scope_version", { ascending: false })
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(fetchLimit);

    if (error) {
      console.error(
        "[listServiceApprovedBillingScopeHistory] Supabase error:",
        error.message
      );
      return unexpectedReadResult();
    }

    const allRows = (rows ?? []) as ApprovedBillingScopeRow[];
    const limitReached = allRows.length > ABS_SCOPE_HISTORY_HARD_LIMIT;
    const limitedRows = limitReached
      ? allRows.slice(0, ABS_SCOPE_HISTORY_HARD_LIMIT)
      : allRows;

    const quotationIds = [
      ...new Set(limitedRows.map((row) => row.source_quotation_id).filter(Boolean)),
    ];

    const quotationNumbersById: Record<string, string> = {};
    if (quotationIds.length > 0) {
      const { data: quotations, error: quotationError } = await supabase
        .from("quotations")
        .select("id, quotation_number")
        .eq("service_id", serviceId)
        .in("id", quotationIds);

      if (quotationError) {
        console.error(
          "[listServiceApprovedBillingScopeHistory] Quotation lookup error:",
          quotationError.message
        );
        // Continue without numbers rather than failing the whole history read.
      } else {
        for (const quotation of quotations ?? []) {
          if (quotation?.id && quotation.quotation_number) {
            quotationNumbersById[quotation.id] = quotation.quotation_number;
          }
        }
      }
    }

    return {
      status: "success",
      data: {
        rows: limitedRows.map((row) =>
          mapAbsScopeHistoryRow(row, quotationNumbersById)
        ),
        limit: ABS_SCOPE_HISTORY_HARD_LIMIT,
        limitReached,
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[listServiceApprovedBillingScopeHistory] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}

/**
 * Service authority summary for ABS history/read surfaces.
 * Invoice totals require invoices:read; never fake zeroes when hidden.
 */
export async function getServiceApprovedBillingAuthoritySummaryResult(
  serviceId: string
): Promise<
  ApprovedBillingScopeReadResult<
    ServiceAbsAuthoritySummary,
    "scope_invalid_id" | "scope_unexpected_error"
  >
> {
  await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);

  if (!isApprovedBillingScopeUuid(serviceId)) {
    return invalidIdResult();
  }

  const canReadInvoiceFinancials = await checkPermission("invoices:read");

  try {
    const scopesResult = await listApprovedBillingScopesForServiceResult(serviceId);
    if (scopesResult.status === "error") {
      return unexpectedReadResult();
    }

    const scopes = scopesResult.data;
    const pick = pickAbsCardScopes(scopes);
    const active =
      pick.active ??
      scopes.find((scope) => scope.isActiveApprovedScope) ??
      null;

    let billingUnavailable = false;
    let lifetimeInvoiceExposure: number | null = null;
    let approvedQuotation: {
      id: string;
      quotationNumber: string | null;
    } | null = null;
    let billingCeilingFromBillingState: number | null = null;
    let hasApprovedQuotation = false;

    if (canReadInvoiceFinancials) {
      const billingState = await getServiceBillingState(serviceId);
      billingUnavailable = billingState.disabledReasons.includes(
        "billing_state_unavailable"
      );
      lifetimeInvoiceExposure = billingUnavailable
        ? null
        : billingState.activePriorInvoiceTotal;
      if (billingState.approvedQuotation) {
        hasApprovedQuotation = true;
        approvedQuotation = {
          id: billingState.approvedQuotation.id,
          quotationNumber: billingState.approvedQuotation.quotationNumber,
        };
        billingCeilingFromBillingState =
          billingState.approvedQuotation.grandTotal;
      }
    } else {
      // Still need QT presence for scenario without invoice totals.
      const supabase = createAdminClient();
      const { data: quotations, error: quotationsError } = await supabase
        .from("quotations")
        .select("id, quotation_number, status")
        .eq("service_id", serviceId)
        .eq("status", "approved")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(1);

      if (quotationsError) {
        console.error(
          "[getServiceApprovedBillingAuthoritySummary] Quotation error:",
          quotationsError.message
        );
        billingUnavailable = true;
      } else if (quotations && quotations.length > 0) {
        hasApprovedQuotation = true;
        approvedQuotation = {
          id: quotations[0].id,
          quotationNumber: quotations[0].quotation_number ?? null,
        };
      }
    }

    const scenario = resolveAbsCardScenario({
      scopesLoadError: false,
      scopes,
      hasApprovedQuotation,
    });

    const summary = composeServiceAbsAuthoritySummary({
      scenario,
      scopes,
      activeScope: active,
      canReadInvoiceFinancials,
      billing: {
        billingUnavailable,
        lifetimeInvoiceExposure,
        approvedQuotation,
        billingCeilingFromBillingState,
      },
    });

    // Prefer active source quotation number from batch lookup when available.
    if (summary.activeScope && summary.sourceQuotation) {
      if (canReadInvoiceFinancials && approvedQuotation?.id === summary.activeScope.sourceQuotationId) {
        summary.sourceQuotation = {
          id: summary.activeScope.sourceQuotationId,
          quotationNumber: approvedQuotation.quotationNumber,
        };
      } else if (
        !summary.sourceQuotation.quotationNumber &&
        approvedQuotation?.id === summary.activeScope.sourceQuotationId
      ) {
        summary.sourceQuotation = {
          id: summary.activeScope.sourceQuotationId,
          quotationNumber: approvedQuotation.quotationNumber,
        };
      } else {
        summary.sourceQuotation = {
          id: summary.activeScope.sourceQuotationId,
          quotationNumber: summary.sourceQuotation.quotationNumber,
        };
      }
    }

    return { status: "success", data: summary };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getServiceApprovedBillingAuthoritySummary] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}

/**
 * Service-owned scope detail with dual-identifier filtering and one-hop lineage.
 */
export async function getApprovedBillingScopeDetailForServiceResult(
  serviceId: string,
  scopeId: string
): Promise<
  ApprovedBillingScopeReadResult<
    AbsServiceOwnedScopeDetail,
    "scope_not_found" | "scope_invalid_id" | "scope_unexpected_error"
  >
> {
  const user = await requirePermission(APPROVED_BILLING_SCOPE_PERMISSIONS.read);
  const canReadInternalNotes = canReadApprovedBillingScopeInternalFields(
    user.role
  );

  if (
    !isApprovedBillingScopeUuid(serviceId) ||
    !isApprovedBillingScopeUuid(scopeId)
  ) {
    return invalidIdResult();
  }

  try {
    const supabase = createAdminClient();
    const { data: row, error } = await supabase
      .from("approved_billing_scopes")
      .select(APPROVED_BILLING_SCOPE_WITH_ITEMS_SELECT)
      .eq("id", scopeId)
      .eq("service_id", serviceId)
      .order("display_order", {
        ascending: true,
        foreignTable: "approved_billing_scope_items",
      })
      .maybeSingle();

    if (error) {
      console.error(
        "[getApprovedBillingScopeDetailForService] Supabase error:",
        error.message
      );
      return unexpectedReadResult();
    }

    if (!row) {
      return { status: "not_found", data: null, error: "scope_not_found" };
    }

    const typedRow = row as ApprovedBillingScopeRowWithItems;
    const scope = applyApprovedBillingScopeReadMasking(
      mapApprovedBillingScopeDetail(typedRow),
      { canReadInternalNotes }
    );

    let sourceQuotation: AbsServiceOwnedScopeDetail["sourceQuotation"] = {
      id: scope.sourceQuotationId,
      quotationNumber: null,
    };

    const { data: quotation, error: quotationError } = await supabase
      .from("quotations")
      .select("id, quotation_number")
      .eq("id", scope.sourceQuotationId)
      .eq("service_id", serviceId)
      .maybeSingle();

    if (quotationError) {
      console.error(
        "[getApprovedBillingScopeDetailForService] Quotation error:",
        quotationError.message
      );
      // Keep id with null number — do not unscoped-fallback.
    } else if (quotation) {
      sourceQuotation = {
        id: quotation.id,
        quotationNumber: quotation.quotation_number ?? null,
      };
    }
    // Cross-service or missing quotation: leave quotationNumber null.

    const lineageIds = [
      scope.supersedesScopeId,
      scope.supersededByScopeId,
    ].filter((id): id is string => typeof id === "string" && id.length > 0);

    const lineageById: Record<string, ReturnType<typeof mapAbsScopeLineageSummary>> =
      {};

    if (lineageIds.length > 0) {
      const { data: lineageRows, error: lineageError } = await supabase
        .from("approved_billing_scopes")
        .select(LINEAGE_SELECT)
        .eq("service_id", serviceId)
        .in("id", lineageIds);

      if (lineageError) {
        console.error(
          "[getApprovedBillingScopeDetailForService] Lineage error:",
          lineageError.message
        );
      } else {
        for (const lineageRow of lineageRows ?? []) {
          const mapped = mapAbsScopeLineageSummary(
            lineageRow as ApprovedBillingScopeRow
          );
          lineageById[mapped.id] = mapped;
        }
      }
    }

    return {
      status: "success",
      data: {
        scope,
        sourceQuotation,
        predecessor: scope.supersedesScopeId
          ? lineageById[scope.supersedesScopeId] ?? null
          : null,
        successor: scope.supersededByScopeId
          ? lineageById[scope.supersededByScopeId] ?? null
          : null,
      },
    };
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getApprovedBillingScopeDetailForService] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return unexpectedReadResult();
  }
}
