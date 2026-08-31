import type { ApprovedBillingScopeErrorCode } from "./errors";
import type { ApprovedBillingScopePermission } from "./permissions";

export const APPROVED_BILLING_SCOPE_STATUSES = [
  "draft",
  "approved",
  "voided",
] as const;

export type ApprovedBillingScopeStatus =
  (typeof APPROVED_BILLING_SCOPE_STATUSES)[number];

export const APPROVED_BILLING_SCOPE_LINE_SAFETY_STATUSES = [
  "pending_review",
  "safe",
  "unsafe",
] as const;

export type ApprovedBillingScopeLineSafetyStatus =
  (typeof APPROVED_BILLING_SCOPE_LINE_SAFETY_STATUSES)[number];

export const APPROVED_BILLING_SCOPE_ITEM_DECISIONS = [
  "accepted",
  "adjusted",
  "excluded",
  "customer_supplied",
] as const;

export type ApprovedBillingScopeItemDecision =
  (typeof APPROVED_BILLING_SCOPE_ITEM_DECISIONS)[number];

export const APPROVED_BILLING_SCOPE_REASON_CODES = [
  "customer_reduced_quantity",
  "customer_reduced_price",
  "customer_removed_item",
  "customer_supplied",
  "internal_scope_correction",
  "source_pricing_issue",
  "unsafe_line_item",
  "other",
] as const;

export type ApprovedBillingScopeReasonCode =
  (typeof APPROVED_BILLING_SCOPE_REASON_CODES)[number];

export const APPROVED_BILLING_SCOPE_VOID_REASON_CODES = [
  "service_cancelled",
  "customer_withdrew_scope",
  "approved_in_error",
  "other",
] as const;

export type ApprovedBillingScopeVoidReasonCode =
  (typeof APPROVED_BILLING_SCOPE_VOID_REASON_CODES)[number];

export interface ApprovedBillingScopeRow {
  id: string;
  service_id: string;
  source_quotation_id: string;
  scope_version: number;
  status: ApprovedBillingScopeStatus;
  accepted_subtotal: number | string;
  accepted_vat_amount: number | string;
  accepted_grand_total: number | string;
  source_vat_rate: number | string;
  source_discount: number | string;
  source_currency: string;
  source_quotation_subtotal: number | string;
  source_quotation_vat_amount: number | string;
  source_quotation_grand_total: number | string;
  source_pricing_context: Record<string, unknown>;
  line_safety_status: ApprovedBillingScopeLineSafetyStatus;
  line_safety_reason_code: ApprovedBillingScopeReasonCode | null;
  /** Free-text line-safety reviewer note (DB: line_safety_note). */
  line_safety_note: string | null;
  line_safety_reviewed_by: string | null;
  line_safety_reviewed_at: string | null;
  change_summary_reason: string | null;
  approved_at: string | null;
  approved_by: string | null;
  superseded_at: string | null;
  superseded_by_scope_id: string | null;
  /** Predecessor lineage (DB: supersedes_scope_id). Installed by financial lifecycle migration. */
  supersedes_scope_id?: string | null;
  voided_at: string | null;
  voided_by: string | null;
  /** Free-text void note (DB: void_reason). No separate void_reason_note column exists. */
  void_reason: string | null;
  created_by: string | null;
  updated_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovedBillingScopeItemRow {
  id: string;
  approved_billing_scope_id: string;
  source_quotation_id: string;
  source_quotation_item_id: string;
  display_order: number;
  decision: ApprovedBillingScopeItemDecision;
  source_description: string;
  source_details: string | null;
  source_category: string | null;
  source_qty: number | string;
  source_unit_price: number | string;
  source_subtotal: number | string;
  source_vat_amount: number | string;
  source_grand_total: number | string;
  source_discount_allocated: number | string;
  accepted_qty: number | string;
  accepted_unit_price: number | string;
  accepted_subtotal: number | string;
  accepted_vat_amount: number | string;
  accepted_grand_total: number | string;
  reason_code: ApprovedBillingScopeReasonCode | null;
  reason_note: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApprovedBillingScopeRowWithItems
  extends ApprovedBillingScopeRow {
  approved_billing_scope_items?: ApprovedBillingScopeItemRow[] | null;
}

export interface ApprovedBillingScope {
  id: string;
  serviceId: string;
  sourceQuotationId: string;
  scopeVersion: number;
  status: ApprovedBillingScopeStatus;
  acceptedSubtotal: number;
  acceptedVatAmount: number;
  acceptedGrandTotal: number;
  sourceVatRate: number;
  sourceDiscount: number;
  sourceCurrency: string;
  sourceQuotationSubtotal: number;
  sourceQuotationVatAmount: number;
  sourceQuotationGrandTotal: number;
  sourcePricingContext: Record<string, unknown>;
  lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus;
  lineSafetyReasonCode: ApprovedBillingScopeReasonCode | null;
  /** Maps DB line_safety_note (reviewer free text). */
  lineSafetyNote: string | null;
  lineSafetyReviewedBy: string | null;
  lineSafetyReviewedAt: string | null;
  changeSummaryReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  supersededAt: string | null;
  supersededByScopeId: string | null;
  /** Maps DB supersedes_scope_id (predecessor). */
  supersedesScopeId: string | null;
  voidedAt: string | null;
  voidedBy: string | null;
  /** Maps DB void_reason (free text). */
  voidReason: string | null;
  createdBy: string | null;
  updatedBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedBillingScopeDetail extends ApprovedBillingScope {
  items: ApprovedBillingScopeItem[];
  isActiveApprovedScope: boolean;
}

/** Display-only effective status. Not a DB enum (`superseded` is timestamp-derived). */
export type AbsEffectiveDisplayStatus =
  | "draft"
  | "active"
  | "superseded"
  | "voided";

export type AbsMoneyField =
  | { kind: "value"; amount: number }
  | { kind: "hidden" }
  | { kind: "unavailable" };

export interface AbsScopeHistoryRow {
  id: string;
  serviceId: string;
  scopeVersion: number;
  status: ApprovedBillingScopeStatus;
  effectiveStatus: AbsEffectiveDisplayStatus;
  sourceQuotationId: string;
  sourceQuotationNumber: string | null;
  acceptedSubtotal: number;
  acceptedVatAmount: number;
  acceptedGrandTotal: number;
  lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus;
  createdAt: string;
  lineSafetyReviewedAt: string | null;
  approvedAt: string | null;
  voidedAt: string | null;
  supersededAt: string | null;
  supersedesScopeId: string | null;
  supersededByScopeId: string | null;
  isActiveApprovedScope: boolean;
}

export interface AbsScopeHistoryListData {
  rows: AbsScopeHistoryRow[];
  limit: number;
  limitReached: boolean;
}

export interface AbsScopeLineageSummary {
  id: string;
  scopeVersion: number;
  status: ApprovedBillingScopeStatus;
  effectiveStatus: AbsEffectiveDisplayStatus;
  acceptedGrandTotal: number;
  isActiveApprovedScope: boolean;
  approvedAt: string | null;
  supersededAt: string | null;
  voidedAt: string | null;
}

export interface AbsSourceQuotationSummary {
  id: string;
  quotationNumber: string | null;
}

export interface AbsServiceOwnedScopeDetail {
  scope: ApprovedBillingScopeDetail;
  sourceQuotation: AbsSourceQuotationSummary | null;
  predecessor: AbsScopeLineageSummary | null;
  successor: AbsScopeLineageSummary | null;
}

export type AbsAuthorityScenario =
  | "unavailable"
  | "no_approved_quotation"
  | "legacy_quotation_only"
  | "draft_only"
  | "active"
  | "active_with_draft"
  | "historical_only";

export interface ServiceAbsAuthoritySummary {
  scenario: AbsAuthorityScenario;
  activeScope: ApprovedBillingScopeSummary | null;
  activeScopeVersion: number | null;
  activeCeiling: AbsMoneyField;
  lifetimeInvoiceExposure: AbsMoneyField;
  remainingAuthority: AbsMoneyField;
  sourceQuotation: AbsSourceQuotationSummary | null;
  lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus | null;
  approvedAt: string | null;
  hasHistoricalAbsAuthority: boolean;
  canReadInvoiceFinancials: boolean;
  /** True only for pre-authority transitional QT fallback (never after historical ABS). */
  usesLegacyQuotationFallback: boolean;
}

/**
 * Authoritative raw audit_logs.details.event_type values emitted by the
 * financial lifecycle migration RPCs. Single source for types, filters, and recognition.
 */
export const ABS_LIFECYCLE_AUDIT_EVENT_TYPES = [
  "approved_billing_scope_line_safety_reviewed",
  "approved_billing_scope_approved",
  "approved_billing_scope_voided",
  "approved_billing_scope_successor_created",
  "approved_billing_scope_superseded",
] as const;

export type AbsLifecycleAuditEventType =
  (typeof ABS_LIFECYCLE_AUDIT_EVENT_TYPES)[number];

export type AbsAuditActorDisplay =
  | { kind: "identified"; actorId: string; actorRole: string | null }
  | { kind: "recorded" };

export interface AbsLifecycleAuditEvent {
  id: string;
  action: string;
  eventType: AbsLifecycleAuditEventType;
  scopeId: string;
  timestamp: string;
  actor: AbsAuditActorDisplay;
  scopeVersion: number | null;
  lifecycleOutcome: string | null;
  reasonCode: string | null;
  /** Internal free text; null for Accountant and when absent. */
  reasonNote: string | null;
  sourceScopeId: string | null;
  successorScopeId: string | null;
}

/**
 * Bounded Service lifecycle audit page.
 * Does not claim complete lifetime history when discovery or candidate caps are hit.
 */
export interface AbsLifecycleAuditListData {
  events: AbsLifecycleAuditEvent[];
  /** Clamped page size for recognized lifecycle events. */
  limit: number;
  /**
   * True when more Service-owned ABS scope IDs exist than the discovery cap
   * (ABS_SCOPE_HISTORY_HARD_LIMIT) used to bound the audit entity_id set.
   */
  scopeDiscoveryLimitReached: boolean;
  /**
   * True when more candidate audit_logs rows matched the Service-owned filters
   * than the candidate page size (limit + 1 fetch). After DB filtering to
   * recognized event types, this means the recognized result may be truncated.
   */
  candidateAuditLimitReached: boolean;
  /** events.length — recognized lifecycle events returned for this page. */
  recognizedEventCount: number;
}

export const ABS_SCOPE_HISTORY_HARD_LIMIT = 50;
export const ABS_LIFECYCLE_AUDIT_DEFAULT_LIMIT = 40;
export const ABS_LIFECYCLE_AUDIT_MAX_LIMIT = 100;

export interface ApprovedBillingScopeItem {
  id: string;
  approvedBillingScopeId: string;
  sourceQuotationId: string;
  sourceQuotationItemId: string;
  displayOrder: number;
  decision: ApprovedBillingScopeItemDecision;
  sourceDescription: string;
  sourceDetails: string | null;
  sourceCategory: string | null;
  sourceQty: number;
  sourceUnitPrice: number;
  sourceSubtotal: number;
  sourceVatAmount: number;
  sourceGrandTotal: number;
  sourceDiscountAllocated?: number;
  acceptedQty: number;
  acceptedUnitPrice: number;
  acceptedSubtotal: number;
  acceptedVatAmount: number;
  acceptedGrandTotal: number;
  reasonCode: ApprovedBillingScopeReasonCode | null;
  reasonNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ApprovedBillingScopeSummary {
  id: string;
  serviceId: string;
  sourceQuotationId: string;
  scopeVersion: number;
  status: ApprovedBillingScopeStatus;
  lineSafetyStatus: ApprovedBillingScopeLineSafetyStatus;
  acceptedGrandTotal: number;
  isActiveApprovedScope: boolean;
  approvedAt: string | null;
  supersededAt: string | null;
  voidedAt: string | null;
}

export type ApprovedBillingScopeReadMaskingOptions = {
  canReadInternalNotes?: boolean;
};

export type ApprovedBillingScopeListOptions = {
  status?: ApprovedBillingScopeStatus;
};

export type ApprovedBillingScopeReadErrorCode =
  | "scope_not_found"
  | "scope_duplicate_draft"
  | "scope_invalid_id"
  | "scope_unexpected_error";

export type ApprovedBillingScopeReadResult<
  T,
  E extends ApprovedBillingScopeReadErrorCode =
    | "scope_not_found"
    | "scope_unexpected_error"
> =
  | {
      status: "success";
      data: T;
    }
  | ("scope_not_found" extends E
      ? {
          status: "not_found";
          data: null;
          error: "scope_not_found";
        }
      : never)
  | ("scope_duplicate_draft" extends E
      ? {
          status: "error";
          error: "scope_duplicate_draft";
        }
      : never)
  | ("scope_invalid_id" extends E
      ? {
          status: "error";
          error: "scope_invalid_id";
        }
      : never)
  | ("scope_unexpected_error" extends E
      ? {
          status: "error";
          error: "scope_unexpected_error";
        }
      : never);

export interface ApprovedBillingScopeActionResult<T = void> {
  success: boolean;
  data?: T;
  error?: ApprovedBillingScopeErrorCode;
}

export type {
  ApprovedBillingScopePermission,
  ApprovedBillingScopeErrorCode,
};
