import type {
  AbsEffectiveDisplayStatus,
  AbsLifecycleAuditEvent,
  AbsLifecycleAuditEventType,
  AbsMoneyField,
  AbsScopeHistoryRow,
  AbsScopeLineageSummary,
  AbsSourceQuotationSummary,
  ApprovedBillingScope,
  ApprovedBillingScopeDetail,
  ApprovedBillingScopeItem,
  ApprovedBillingScopeItemRow,
  ApprovedBillingScopeReadMaskingOptions,
  ApprovedBillingScopeRow,
  ApprovedBillingScopeSummary,
  ServiceAbsAuthoritySummary,
  AbsAuthorityScenario,
} from "./types";
import { ABS_LIFECYCLE_AUDIT_EVENT_TYPES } from "./types";
import { parseAuthoritativeMoney } from "../invoices/money.ts";

/** Derived from the single authoritative constant — do not maintain a parallel list. */
const RECOGNIZED_ABS_LIFECYCLE_AUDIT_EVENT_TYPES: ReadonlySet<string> = new Set(
  ABS_LIFECYCLE_AUDIT_EVENT_TYPES
);

/** PostgREST `.or()` filter for recognized details.event_type values. */
export function buildAbsLifecycleAuditEventTypeOrFilter(): string {
  return ABS_LIFECYCLE_AUDIT_EVENT_TYPES.map(
    (eventType) => `details->>event_type.eq.${eventType}`
  ).join(",");
}

function mapAuthoritativeDecimal(value: number | string): number {
  return parseAuthoritativeMoney(value) ?? Number.NaN;
}

export function isActiveApprovedScope(row: {
  status: string;
  superseded_at?: string | null;
  voided_at?: string | null;
  supersededAt?: string | null;
  voidedAt?: string | null;
}): boolean {
  const supersededAt =
    row.superseded_at !== undefined ? row.superseded_at : row.supersededAt ?? null;
  const voidedAt = row.voided_at !== undefined ? row.voided_at : row.voidedAt ?? null;
  return row.status === "approved" && supersededAt === null && voidedAt === null;
}

/**
 * Display-only effective status. `superseded` is never a DB status enum value.
 */
export function deriveAbsEffectiveDisplayStatus(scope: {
  status: string;
  supersededAt?: string | null;
  voidedAt?: string | null;
  superseded_at?: string | null;
  voided_at?: string | null;
}): AbsEffectiveDisplayStatus {
  const supersededAt =
    scope.supersededAt !== undefined
      ? scope.supersededAt
      : scope.superseded_at ?? null;
  const voidedAt =
    scope.voidedAt !== undefined ? scope.voidedAt : scope.voided_at ?? null;

  if (scope.status === "draft") {
    return "draft";
  }

  if (scope.status === "voided" || voidedAt != null) {
    return "voided";
  }

  if (supersededAt != null) {
    return "superseded";
  }

  if (scope.status === "approved") {
    return "active";
  }

  return "voided";
}

export function hasHistoricalAbsAuthority(
  scopes: ReadonlyArray<{ status: string }>
): boolean {
  return scopes.some(
    (scope) => scope.status === "approved" || scope.status === "voided"
  );
}

export function mapApprovedBillingScopeRow(
  row: ApprovedBillingScopeRow
): ApprovedBillingScope {
  return {
    id: row.id,
    serviceId: row.service_id,
    sourceQuotationId: row.source_quotation_id,
    scopeVersion: row.scope_version,
    status: row.status,
    acceptedSubtotal: mapAuthoritativeDecimal(row.accepted_subtotal),
    acceptedVatAmount: mapAuthoritativeDecimal(row.accepted_vat_amount),
    acceptedGrandTotal: mapAuthoritativeDecimal(row.accepted_grand_total),
    sourceVatRate: mapAuthoritativeDecimal(row.source_vat_rate),
    sourceDiscount: mapAuthoritativeDecimal(row.source_discount),
    sourceCurrency: row.source_currency,
    sourceQuotationSubtotal: mapAuthoritativeDecimal(row.source_quotation_subtotal),
    sourceQuotationVatAmount: mapAuthoritativeDecimal(row.source_quotation_vat_amount),
    sourceQuotationGrandTotal: mapAuthoritativeDecimal(row.source_quotation_grand_total),
    sourcePricingContext: row.source_pricing_context,
    lineSafetyStatus: row.line_safety_status,
    lineSafetyReasonCode: row.line_safety_reason_code,
    lineSafetyNote: row.line_safety_note,
    lineSafetyReviewedBy: row.line_safety_reviewed_by,
    lineSafetyReviewedAt: row.line_safety_reviewed_at,
    changeSummaryReason: row.change_summary_reason,
    approvedAt: row.approved_at,
    approvedBy: row.approved_by,
    supersededAt: row.superseded_at,
    supersededByScopeId: row.superseded_by_scope_id,
    supersedesScopeId: row.supersedes_scope_id ?? null,
    voidedAt: row.voided_at,
    voidedBy: row.voided_by,
    voidReason: row.void_reason,
    createdBy: row.created_by,
    updatedBy: row.updated_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapApprovedBillingScopeItemRow(
  row: ApprovedBillingScopeItemRow
): ApprovedBillingScopeItem {
  return {
    id: row.id,
    approvedBillingScopeId: row.approved_billing_scope_id,
    sourceQuotationId: row.source_quotation_id,
    sourceQuotationItemId: row.source_quotation_item_id,
    displayOrder: row.display_order,
    decision: row.decision,
    sourceDescription: row.source_description,
    sourceDetails: row.source_details,
    sourceCategory: row.source_category,
    sourceQty: mapAuthoritativeDecimal(row.source_qty),
    sourceUnitPrice: mapAuthoritativeDecimal(row.source_unit_price),
    sourceSubtotal: mapAuthoritativeDecimal(row.source_subtotal),
    sourceVatAmount: mapAuthoritativeDecimal(row.source_vat_amount),
    sourceGrandTotal: mapAuthoritativeDecimal(row.source_grand_total),
    sourceDiscountAllocated: mapAuthoritativeDecimal(row.source_discount_allocated ?? 0),
    acceptedQty: mapAuthoritativeDecimal(row.accepted_qty),
    acceptedUnitPrice: mapAuthoritativeDecimal(row.accepted_unit_price),
    acceptedSubtotal: mapAuthoritativeDecimal(row.accepted_subtotal),
    acceptedVatAmount: mapAuthoritativeDecimal(row.accepted_vat_amount),
    acceptedGrandTotal: mapAuthoritativeDecimal(row.accepted_grand_total),
    reasonCode: row.reason_code,
    reasonNote: row.reason_note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapApprovedBillingScopeSummaryRow(
  row: ApprovedBillingScopeRow
): ApprovedBillingScopeSummary {
  return {
    id: row.id,
    serviceId: row.service_id,
    sourceQuotationId: row.source_quotation_id,
    scopeVersion: row.scope_version,
    status: row.status,
    lineSafetyStatus: row.line_safety_status,
    acceptedGrandTotal: mapAuthoritativeDecimal(row.accepted_grand_total),
    isActiveApprovedScope: isActiveApprovedScope(row),
    approvedAt: row.approved_at,
    supersededAt: row.superseded_at,
    voidedAt: row.voided_at,
  };
}

export function mapAbsScopeHistoryRow(
  row: ApprovedBillingScopeRow,
  quotationNumbersById: Readonly<Record<string, string>> = {}
): AbsScopeHistoryRow {
  const supersededAt = row.superseded_at;
  const voidedAt = row.voided_at;
  const active = isActiveApprovedScope(row);

  return {
    id: row.id,
    serviceId: row.service_id,
    scopeVersion: row.scope_version,
    status: row.status,
    effectiveStatus: deriveAbsEffectiveDisplayStatus(row),
    sourceQuotationId: row.source_quotation_id,
    sourceQuotationNumber: quotationNumbersById[row.source_quotation_id] ?? null,
    acceptedSubtotal: mapAuthoritativeDecimal(row.accepted_subtotal),
    acceptedVatAmount: mapAuthoritativeDecimal(row.accepted_vat_amount),
    acceptedGrandTotal: mapAuthoritativeDecimal(row.accepted_grand_total),
    lineSafetyStatus: row.line_safety_status,
    createdAt: row.created_at,
    lineSafetyReviewedAt: row.line_safety_reviewed_at,
    approvedAt: row.approved_at,
    voidedAt,
    supersededAt,
    supersedesScopeId: row.supersedes_scope_id ?? null,
    supersededByScopeId: row.superseded_by_scope_id,
    isActiveApprovedScope: active,
  };
}

export function mapAbsScopeLineageSummary(
  row: ApprovedBillingScopeRow
): AbsScopeLineageSummary {
  return {
    id: row.id,
    scopeVersion: row.scope_version,
    status: row.status,
    effectiveStatus: deriveAbsEffectiveDisplayStatus(row),
    acceptedGrandTotal: mapAuthoritativeDecimal(row.accepted_grand_total),
    isActiveApprovedScope: isActiveApprovedScope(row),
    approvedAt: row.approved_at,
    supersededAt: row.superseded_at,
    voidedAt: row.voided_at,
  };
}

export function applyApprovedBillingScopeReadMasking(
  detail: ApprovedBillingScopeDetail,
  options: ApprovedBillingScopeReadMaskingOptions = {}
): ApprovedBillingScopeDetail {
  if (options.canReadInternalNotes) {
    return detail;
  }

  return {
    ...detail,
    lineSafetyReasonCode: null,
    lineSafetyNote: null,
    changeSummaryReason: null,
    voidReason: null,
    items: detail.items.map((item) => ({
      ...item,
      reasonCode: null,
      reasonNote: null,
    })),
  };
}

export function clampNonNegativeMoney(amount: number): number | null {
  if (!Number.isFinite(amount)) {
    return null;
  }
  return Math.max(0, amount);
}

/**
 * Server-side authority composition for history/read surfaces.
 * Does not revive quotation fallback after historical approved/voided ABS authority.
 */
export function composeServiceAbsAuthoritySummary(input: {
  scenario: AbsAuthorityScenario;
  scopes: ReadonlyArray<ApprovedBillingScopeSummary>;
  activeScope: ApprovedBillingScopeSummary | null;
  canReadInvoiceFinancials: boolean;
  billing: {
    billingUnavailable: boolean;
    lifetimeInvoiceExposure: number | null;
    approvedQuotation: AbsSourceQuotationSummary | null;
    billingCeilingFromBillingState: number | null;
  };
}): ServiceAbsAuthoritySummary {
  const hasHistorical = hasHistoricalAbsAuthority(input.scopes);
  const active = input.activeScope;

  let activeCeiling: AbsMoneyField = { kind: "unavailable" };
  let remainingAuthority: AbsMoneyField = { kind: "unavailable" };
  let lifetimeInvoiceExposure: AbsMoneyField = { kind: "unavailable" };
  let usesLegacyQuotationFallback = false;
  const activeCeilingAmount = parseAuthoritativeMoney(
    active?.acceptedGrandTotal ?? null
  );
  const fallbackCeilingAmount = parseAuthoritativeMoney(
    input.billing.billingCeilingFromBillingState
  );
  const invoiceExposure = parseAuthoritativeMoney(
    input.billing.lifetimeInvoiceExposure
  );

  if (active && activeCeilingAmount != null) {
    activeCeiling = { kind: "value", amount: activeCeilingAmount };
  } else if (
    !active &&
    !hasHistorical &&
    (input.scenario === "legacy_quotation_only" ||
      input.scenario === "draft_only") &&
    fallbackCeilingAmount != null
  ) {
    activeCeiling = {
      kind: "value",
      amount: fallbackCeilingAmount,
    };
    usesLegacyQuotationFallback = true;
  } else if (hasHistorical) {
    // Historical ABS closed quotation fallback — no active ceiling authority.
    activeCeiling = { kind: "unavailable" };
    usesLegacyQuotationFallback = false;
  }

  if (!input.canReadInvoiceFinancials) {
    lifetimeInvoiceExposure = { kind: "hidden" };
    remainingAuthority = { kind: "hidden" };
  } else if (input.billing.billingUnavailable) {
    lifetimeInvoiceExposure = { kind: "unavailable" };
    remainingAuthority = { kind: "unavailable" };
  } else if (invoiceExposure == null) {
    lifetimeInvoiceExposure = { kind: "unavailable" };
    remainingAuthority = { kind: "unavailable" };
  } else {
    lifetimeInvoiceExposure = {
      kind: "value",
      amount: invoiceExposure,
    };

    if (activeCeiling.kind === "value") {
      const remaining = clampNonNegativeMoney(
        activeCeiling.amount - invoiceExposure
      );
      remainingAuthority = remaining == null
        ? { kind: "unavailable" }
        : { kind: "value", amount: remaining };
    } else {
      remainingAuthority = { kind: "unavailable" };
    }
  }

  const sourceQuotation: AbsSourceQuotationSummary | null = active
    ? {
        id: active.sourceQuotationId,
        quotationNumber: null,
      }
    : input.billing.approvedQuotation;

  return {
    scenario: input.scenario,
    activeScope: active,
    activeScopeVersion: active?.scopeVersion ?? null,
    activeCeiling,
    lifetimeInvoiceExposure,
    remainingAuthority,
    sourceQuotation,
    lineSafetyStatus: active?.lineSafetyStatus ?? null,
    approvedAt: active?.approvedAt ?? null,
    hasHistoricalAbsAuthority: hasHistorical,
    canReadInvoiceFinancials: input.canReadInvoiceFinancials,
    usesLegacyQuotationFallback,
  };
}

export function isRecognizedAbsLifecycleEventType(
  value: unknown
): value is AbsLifecycleAuditEventType {
  return (
    typeof value === "string" &&
    RECOGNIZED_ABS_LIFECYCLE_AUDIT_EVENT_TYPES.has(value)
  );
}

export { ABS_LIFECYCLE_AUDIT_EVENT_TYPES };

export function mapAbsLifecycleAuditEvent(input: {
  id: string;
  action: string;
  entityId: string;
  timestamp: string;
  userId: string;
  details: Record<string, unknown> | null | undefined;
  canReadInternalNotes: boolean;
}): AbsLifecycleAuditEvent | null {
  const details = input.details ?? {};
  const eventTypeRaw = details.event_type;
  if (!isRecognizedAbsLifecycleEventType(eventTypeRaw)) {
    return null;
  }

  const reasonCode =
    typeof details.reason_code === "string" ? details.reason_code : null;
  const reasonNoteRaw =
    typeof details.reason_note === "string" ? details.reason_note : null;
  const actorRole =
    typeof details.actor_role === "string" ? details.actor_role : null;
  const scopeVersion =
    typeof details.scope_version === "number"
      ? details.scope_version
      : typeof details.successor_scope_version === "number"
        ? details.successor_scope_version
        : null;
  const lifecycleOutcome =
    typeof details.lifecycle_outcome === "string"
      ? details.lifecycle_outcome
      : null;
  const sourceScopeId =
    typeof details.source_scope_id === "string"
      ? details.source_scope_id
      : null;
  const successorScopeId =
    typeof details.successor_scope_id === "string"
      ? details.successor_scope_id
      : null;

  return {
    id: input.id,
    action: input.action,
    eventType: eventTypeRaw,
    scopeId: input.entityId,
    timestamp: input.timestamp,
    actor: input.canReadInternalNotes
      ? {
          kind: "identified",
          actorId: input.userId,
          actorRole,
        }
      : { kind: "recorded" },
    scopeVersion,
    lifecycleOutcome,
    reasonCode: input.canReadInternalNotes ? reasonCode : null,
    reasonNote: input.canReadInternalNotes ? reasonNoteRaw : null,
    sourceScopeId,
    successorScopeId,
  };
}

export function normalizeAbsAuditLimit(
  requested: number | undefined,
  defaultLimit: number,
  maxLimit: number
): number {
  if (requested == null || !Number.isFinite(requested)) {
    return defaultLimit;
  }
  const asInt = Math.trunc(requested);
  if (asInt < 1) {
    return 1;
  }
  if (asInt > maxLimit) {
    return maxLimit;
  }
  return asInt;
}
