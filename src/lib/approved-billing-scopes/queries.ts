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

export async function listApprovedBillingScopesForService(
  serviceId: string,
  options?: ApprovedBillingScopeListOptions
): Promise<ApprovedBillingScopeSummary[]> {
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
      return [];
    }

    return (rows ?? []).map((row) =>
      mapApprovedBillingScopeSummaryRow(row as ApprovedBillingScopeRow)
    );
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[listApprovedBillingScopesForService] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return [];
  }
}

export async function getApprovedBillingScopeById(
  scopeId: string
): Promise<ApprovedBillingScopeDetail | null> {
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
      return null;
    }

    if (!row) {
      return null;
    }

    return applyApprovedBillingScopeReadMasking(
      mapApprovedBillingScopeDetail(row as ApprovedBillingScopeRowWithItems),
      { canReadInternalNotes }
    );
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getApprovedBillingScopeById] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}

export async function getActiveApprovedBillingScopeForService(
  serviceId: string
): Promise<ApprovedBillingScopeDetail | null> {
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
      return null;
    }

    if (!row) {
      return null;
    }

    return applyApprovedBillingScopeReadMasking(
      mapApprovedBillingScopeDetail(row as ApprovedBillingScopeRowWithItems),
      { canReadInternalNotes }
    );
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getActiveApprovedBillingScopeForService] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}

export async function getExistingDraftScopeForQuotation(
  sourceQuotationId: string
): Promise<ApprovedBillingScopeSummary | null> {
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
      return null;
    }

    const draftRows = rows ?? [];

    if (draftRows.length === 0) {
      return null;
    }

    if (draftRows.length > 1) {
      console.error(
        "[getExistingDraftScopeForQuotation] Duplicate draft billing scopes detected for source quotation:",
        sourceQuotationId
      );
      throw new Error(DUPLICATE_DRAFT_ERROR_CODE);
    }

    return mapApprovedBillingScopeSummaryRow(
      draftRows[0] as ApprovedBillingScopeRow
    );
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    if (
      err instanceof Error &&
      err.message === DUPLICATE_DRAFT_ERROR_CODE
    ) {
      throw err;
    }

    console.error(
      "[getExistingDraftScopeForQuotation] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}

export async function getApprovedBillingScopeSummary(
  scopeId: string
): Promise<ApprovedBillingScopeSummary | null> {
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
      return null;
    }

    return row
      ? mapApprovedBillingScopeSummaryRow(row as ApprovedBillingScopeRow)
      : null;
  } catch (err) {
    if (err instanceof UnauthorizedError || err instanceof ForbiddenError) {
      throw err;
    }

    console.error(
      "[getApprovedBillingScopeSummary] Unexpected error:",
      err instanceof Error ? err.message : "Unknown"
    );
    return null;
  }
}
