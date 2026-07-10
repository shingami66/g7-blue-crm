import "server-only";

import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { APPROVED_BILLING_SCOPE_PERMISSIONS } from "./permissions";
import {
  applyApprovedBillingScopeReadMasking,
  mapApprovedBillingScopeItemRow,
  mapApprovedBillingScopeRow,
  mapApprovedBillingScopeSummaryRow,
} from "./mappers";
import type {
  ApprovedBillingScopeDetail,
  ApprovedBillingScopeItemRow,
  ApprovedBillingScopeListOptions,
  ApprovedBillingScopeRow,
  ApprovedBillingScopeRowWithItems,
  ApprovedBillingScopeReadResult,
  ApprovedBillingScopeSummary,
} from "./types";

const APPROVED_BILLING_SCOPE_WITH_ITEMS_SELECT =
  "*, approved_billing_scope_items:approved_billing_scope_items!approved_billing_scope_id(*)";
const DUPLICATE_DRAFT_ERROR_CODE = "scope_duplicate_draft";

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
    isActiveApprovedScope:
      row.status === "approved" &&
      row.superseded_at === null &&
      row.voided_at === null,
  };
}

function unexpectedReadResult(): {
  status: "error";
  error: "scope_unexpected_error";
} {
  return { status: "error", error: "scope_unexpected_error" };
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
