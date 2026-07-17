import type {
  AbsEffectiveDisplayStatus,
  AbsMoneyField,
  AbsScopeHistoryListData,
  AbsScopeHistoryRow,
  ApprovedBillingScopeSummary,
} from "./types";
import type { AbsCardMoneyField } from "./card-view-model";

export type AbsHistoryLifecycleDateKind =
  | "voided"
  | "superseded"
  | "approved"
  | "reviewed"
  | "created";

export type AbsHistoryLifecycleDate = {
  at: string | null;
  kind: AbsHistoryLifecycleDateKind;
};

/**
 * Compact lifecycle date for history table (not the sole canonical timeline).
 * Precedence: voided → superseded → approved → line-safety reviewed → created.
 */
export function resolveHistoryLifecycleDate(
  row: Pick<
    AbsScopeHistoryRow,
    | "effectiveStatus"
    | "voidedAt"
    | "supersededAt"
    | "approvedAt"
    | "lineSafetyReviewedAt"
    | "createdAt"
  >
): AbsHistoryLifecycleDate {
  if (row.effectiveStatus === "voided" && row.voidedAt) {
    return { at: row.voidedAt, kind: "voided" };
  }
  if (row.effectiveStatus === "superseded" && row.supersededAt) {
    return { at: row.supersededAt, kind: "superseded" };
  }
  if (row.approvedAt) {
    return { at: row.approvedAt, kind: "approved" };
  }
  if (row.lineSafetyReviewedAt) {
    return { at: row.lineSafetyReviewedAt, kind: "reviewed" };
  }
  return { at: row.createdAt, kind: "created" };
}

export function buildAbsScopeDetailHref(
  serviceId: string,
  scopeId: string
): string {
  return `/services/${serviceId}/approved-billing-scopes/${scopeId}`;
}

/** Remaining zero is valid fully-allocated authority — not an error. */
export function isFullyAllocatedRemaining(field: AbsMoneyField): boolean {
  return field.kind === "value" && field.amount === 0;
}

/**
 * Map server AbsMoneyField for card display.
 * Unexpected negatives become unavailable (never shown as billable).
 */
export function mapAuthorityMoneyToCardField(
  field: AbsMoneyField
): AbsCardMoneyField {
  if (field.kind === "hidden") {
    return { kind: "hidden" };
  }
  if (field.kind === "unavailable") {
    return { kind: "unavailable" };
  }
  if (!Number.isFinite(field.amount) || field.amount < 0) {
    return { kind: "unavailable" };
  }
  return { kind: "value", amount: field.amount };
}

export function historyStatusLabelKey(
  status: AbsEffectiveDisplayStatus
): AbsEffectiveDisplayStatus {
  return status;
}

/** Preserve server row order exactly — do not re-sort in UI. */
export function preserveHistoryRowOrder<T>(rows: readonly T[]): T[] {
  return [...rows];
}

export function formatBoundedHistoryNotice(
  template: string,
  limit: number
): string {
  return template.replace("{limit}", String(limit));
}

export function formatDetailsAriaLabel(
  template: string,
  scopeVersion: number
): string {
  return template.replace("{version}", String(scopeVersion));
}

/** Map history DTO rows to summary shape for pick/draft helpers (no re-sort). */
export function mapHistoryRowsToSummaries(
  rows: readonly AbsScopeHistoryRow[]
): ApprovedBillingScopeSummary[] {
  return preserveHistoryRowOrder(rows).map((row) => ({
    id: row.id,
    serviceId: row.serviceId,
    sourceQuotationId: row.sourceQuotationId,
    scopeVersion: row.scopeVersion,
    status: row.status,
    lineSafetyStatus: row.lineSafetyStatus,
    acceptedGrandTotal: row.acceptedGrandTotal,
    isActiveApprovedScope: row.isActiveApprovedScope,
    approvedAt: row.approvedAt,
    supersededAt: row.supersededAt,
    voidedAt: row.voidedAt,
  }));
}

/**
 * Positive proof of exactly zero ABS scopes for legacy Quotation eligibility.
 *
 * Requires a successful history payload with empty rows and no limit/truncation.
 * Never true for:
 * - query failure / unavailable history
 * - null history
 * - any Draft/Approved/Voided/Superseded row
 * - limitReached / truncated history
 * - contradictory non-empty rows
 */
export function historyProvesZeroScopes(
  history: AbsScopeHistoryListData | null,
  historyUnavailable: boolean
): boolean {
  if (historyUnavailable || history == null) {
    return false;
  }
  if (history.limitReached) {
    return false;
  }
  if (!Array.isArray(history.rows) || history.rows.length !== 0) {
    return false;
  }
  return true;
}

/**
 * Positive proof that ABS history exists (any status, including Draft).
 * limitReached alone also proves existence when rows may be truncated.
 */
export function historyProvesAbsExists(
  history: AbsScopeHistoryListData | null
): boolean {
  if (history == null) {
    return false;
  }
  return history.rows.length > 0 || history.limitReached === true;
}

/**
 * Alias for callers that must emphasize positive zero-history proof for
 * legacy Quotation authority (never assume empty when proof is incomplete).
 */
export function historyProvesExactlyZeroAbsScopesForLegacyFallback(
  history: AbsScopeHistoryListData | null,
  historyUnavailable: boolean
): boolean {
  return historyProvesZeroScopes(history, historyUnavailable);
}
