import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";

const testModuleLoader = `
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,", shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    return {
      url: new URL("./src/" + specifier.slice(2) + ".ts", "file:///" + process.cwd().replaceAll("\\\\", "/") + "/").href,
      shortCircuit: true,
    };
  }
  if (specifier.startsWith(".") && !/\\.(?:[cm]?js|tsx?|json)$/.test(specifier)) {
    return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

const {
  applyApprovedBillingScopeReadMasking,
  buildAbsLifecycleAuditEventTypeOrFilter,
  clampNonNegativeMoney,
  composeServiceAbsAuthoritySummary,
  deriveAbsEffectiveDisplayStatus,
  hasHistoricalAbsAuthority,
  isActiveApprovedScope,
  isRecognizedAbsLifecycleEventType,
  mapAbsLifecycleAuditEvent,
  mapAbsScopeHistoryRow,
  mapApprovedBillingScopeRow,
  normalizeAbsAuditLimit,
  ABS_LIFECYCLE_AUDIT_EVENT_TYPES,
} = await import("./mappers.ts");
import type {
  ApprovedBillingScopeDetail,
  ApprovedBillingScopeRow,
  ApprovedBillingScopeSummary,
} from "./types.ts";
const {
  ABS_LIFECYCLE_AUDIT_DEFAULT_LIMIT,
  ABS_LIFECYCLE_AUDIT_MAX_LIMIT,
  ABS_SCOPE_HISTORY_HARD_LIMIT,
} = await import("./types.ts");

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const SCOPE_A = "22222222-2222-4222-8222-222222222222";
const SCOPE_B = "33333333-3333-4333-8333-333333333333";
const QT_ID = "44444444-4444-4444-8444-444444444444";

function baseRow(
  overrides: Partial<ApprovedBillingScopeRow> = {}
): ApprovedBillingScopeRow {
  return {
    id: SCOPE_A,
    service_id: SERVICE_ID,
    source_quotation_id: QT_ID,
    scope_version: 1,
    status: "approved",
    accepted_subtotal: 1000,
    accepted_vat_amount: 0,
    accepted_grand_total: 1000,
    source_vat_rate: 0,
    source_discount: 0,
    source_currency: "SAR",
    source_quotation_subtotal: 1000,
    source_quotation_vat_amount: 0,
    source_quotation_grand_total: 1000,
    source_pricing_context: {},
    line_safety_status: "safe",
    line_safety_reason_code: null,
    line_safety_note: "internal review note",
    line_safety_reviewed_by: "actor-1",
    line_safety_reviewed_at: "2026-07-01T00:00:00Z",
    change_summary_reason: "internal summary",
    approved_at: "2026-07-02T00:00:00Z",
    approved_by: "actor-1",
    superseded_at: null,
    superseded_by_scope_id: null,
    supersedes_scope_id: null,
    voided_at: null,
    voided_by: null,
    void_reason: null,
    created_by: "actor-1",
    updated_by: "actor-1",
    created_at: "2026-07-01T00:00:00Z",
    updated_at: "2026-07-02T00:00:00Z",
    ...overrides,
  };
}

function summary(
  partial: Partial<ApprovedBillingScopeSummary> &
    Pick<ApprovedBillingScopeSummary, "id" | "status">
): ApprovedBillingScopeSummary {
  return {
    serviceId: SERVICE_ID,
    sourceQuotationId: QT_ID,
    scopeVersion: 1,
    lineSafetyStatus: "safe",
    acceptedGrandTotal: 1000,
    isActiveApprovedScope: false,
    approvedAt: null,
    supersededAt: null,
    voidedAt: null,
    ...partial,
  };
}

test("maps supersedesScopeId and supersededByScopeId", () => {
  const mapped = mapApprovedBillingScopeRow(
    baseRow({
      supersedes_scope_id: SCOPE_B,
      superseded_by_scope_id: SCOPE_A,
    })
  );

  assert.equal(mapped.supersedesScopeId, SCOPE_B);
  assert.equal(mapped.supersededByScopeId, SCOPE_A);
  assert.equal(mapped.lineSafetyReviewedAt, "2026-07-01T00:00:00Z");
  assert.equal(mapped.lineSafetyReviewedBy, "actor-1");
  assert.equal(mapped.lineSafetyNote, "internal review note");
  assert.equal(mapped.voidReason, null);
});

test("maps null supersedes_scope_id when column omitted", () => {
  const row = baseRow();
  delete row.supersedes_scope_id;
  const mapped = mapApprovedBillingScopeRow(row);
  assert.equal(mapped.supersedesScopeId, null);
});

test("effective status: active / superseded / voided / draft", () => {
  assert.equal(
    deriveAbsEffectiveDisplayStatus({
      status: "approved",
      supersededAt: null,
      voidedAt: null,
    }),
    "active"
  );
  assert.equal(
    deriveAbsEffectiveDisplayStatus({
      status: "approved",
      supersededAt: "2026-07-03T00:00:00Z",
      voidedAt: null,
    }),
    "superseded"
  );
  assert.equal(
    deriveAbsEffectiveDisplayStatus({
      status: "voided",
      supersededAt: null,
      voidedAt: "2026-07-03T00:00:00Z",
    }),
    "voided"
  );
  assert.equal(
    deriveAbsEffectiveDisplayStatus({
      status: "draft",
      supersededAt: null,
      voidedAt: null,
    }),
    "draft"
  );
});

test("isActiveApprovedScope requires approved + null supersession + null void", () => {
  assert.equal(
    isActiveApprovedScope({
      status: "approved",
      superseded_at: null,
      voided_at: null,
    }),
    true
  );
  assert.equal(
    isActiveApprovedScope({
      status: "approved",
      superseded_at: "2026-07-03T00:00:00Z",
      voided_at: null,
    }),
    false
  );
  assert.equal(
    isActiveApprovedScope({
      status: "voided",
      superseded_at: null,
      voided_at: "2026-07-03T00:00:00Z",
    }),
    false
  );
  assert.equal(
    isActiveApprovedScope({
      status: "draft",
      superseded_at: null,
      voided_at: null,
    }),
    false
  );
});

test("history row mapping includes lineage and quotation number", () => {
  const row = mapAbsScopeHistoryRow(
    baseRow({
      supersedes_scope_id: SCOPE_B,
      superseded_by_scope_id: null,
      scope_version: 2,
    }),
    { [QT_ID]: "QT-2026-0009" }
  );

  assert.equal(row.supersedesScopeId, SCOPE_B);
  assert.equal(row.supersededByScopeId, null);
  assert.equal(row.sourceQuotationNumber, "QT-2026-0009");
  assert.equal(row.effectiveStatus, "active");
  assert.equal(row.isActiveApprovedScope, true);
  assert.equal(row.acceptedSubtotal, 1000);
  assert.equal(row.acceptedVatAmount, 0);
});

test("history hard limit constant is 50", () => {
  assert.equal(ABS_SCOPE_HISTORY_HARD_LIMIT, 50);
});

test("history limit-reached indicator helper via slice semantics", () => {
  const fetched = Array.from({ length: 51 }, (_, i) => i);
  const limitReached = fetched.length > ABS_SCOPE_HISTORY_HARD_LIMIT;
  const rows = limitReached
    ? fetched.slice(0, ABS_SCOPE_HISTORY_HARD_LIMIT)
    : fetched;
  assert.equal(limitReached, true);
  assert.equal(rows.length, 50);
});

test("empty history success shape", () => {
  const data = {
    rows: [] as ReturnType<typeof mapAbsScopeHistoryRow>[],
    limit: ABS_SCOPE_HISTORY_HARD_LIMIT,
    limitReached: false,
  };
  assert.equal(data.rows.length, 0);
  assert.equal(data.limitReached, false);
});

test("Accountant internal-field masking clears notes and reasons", () => {
  const detail: ApprovedBillingScopeDetail = {
    ...mapApprovedBillingScopeRow(
      baseRow({
        void_reason: "secret void note",
        line_safety_reason_code: "unsafe_line_item",
      })
    ),
    items: [
      {
        id: "item-1",
        approvedBillingScopeId: SCOPE_A,
        sourceQuotationId: QT_ID,
        sourceQuotationItemId: "qi-1",
        displayOrder: 1,
        decision: "adjusted",
        sourceDescription: "Line",
        sourceDetails: null,
        sourceCategory: null,
        sourceQty: 1,
        sourceUnitPrice: 100,
        sourceSubtotal: 100,
        sourceVatAmount: 0,
        sourceGrandTotal: 100,
        acceptedQty: 1,
        acceptedUnitPrice: 90,
        acceptedSubtotal: 90,
        acceptedVatAmount: 0,
        acceptedGrandTotal: 90,
        reasonCode: "customer_reduced_price",
        reasonNote: "internal item note",
        createdAt: "2026-07-01T00:00:00Z",
        updatedAt: "2026-07-01T00:00:00Z",
      },
    ],
    isActiveApprovedScope: true,
  };

  const masked = applyApprovedBillingScopeReadMasking(detail, {
    canReadInternalNotes: false,
  });

  assert.equal(masked.lineSafetyNote, null);
  assert.equal(masked.lineSafetyReasonCode, null);
  assert.equal(masked.voidReason, null);
  assert.equal(masked.changeSummaryReason, null);
  assert.equal(masked.items[0].reasonCode, null);
  assert.equal(masked.items[0].reasonNote, null);
  assert.equal(masked.acceptedGrandTotal, 1000);
});

test("invoice financial fields hidden rather than zeroed without invoices:read", () => {
  const result = composeServiceAbsAuthoritySummary({
    scenario: "active",
    scopes: [
      summary({
        id: SCOPE_A,
        status: "approved",
        isActiveApprovedScope: true,
        acceptedGrandTotal: 5000,
        approvedAt: "2026-07-02T00:00:00Z",
      }),
    ],
    activeScope: summary({
      id: SCOPE_A,
      status: "approved",
      isActiveApprovedScope: true,
      acceptedGrandTotal: 5000,
      approvedAt: "2026-07-02T00:00:00Z",
    }),
    canReadInvoiceFinancials: false,
    billing: {
      billingUnavailable: false,
      lifetimeInvoiceExposure: 0,
      approvedQuotation: { id: QT_ID, quotationNumber: "QT-1" },
      billingCeilingFromBillingState: 5000,
    },
  });

  assert.equal(result.activeCeiling.kind, "value");
  assert.equal(result.lifetimeInvoiceExposure.kind, "hidden");
  assert.equal(result.remainingAuthority.kind, "hidden");
  assert.notEqual(result.lifetimeInvoiceExposure.kind, "value");
});

test("zero remaining authority when ceiling equals exposure", () => {
  const result = composeServiceAbsAuthoritySummary({
    scenario: "active",
    scopes: [
      summary({
        id: SCOPE_A,
        status: "approved",
        isActiveApprovedScope: true,
        acceptedGrandTotal: 2000,
      }),
    ],
    activeScope: summary({
      id: SCOPE_A,
      status: "approved",
      isActiveApprovedScope: true,
      acceptedGrandTotal: 2000,
    }),
    canReadInvoiceFinancials: true,
    billing: {
      billingUnavailable: false,
      lifetimeInvoiceExposure: 2000,
      approvedQuotation: { id: QT_ID, quotationNumber: "QT-1" },
      billingCeilingFromBillingState: 2000,
    },
  });

  assert.deepEqual(result.remainingAuthority, { kind: "value", amount: 0 });
  assert.equal(clampNonNegativeMoney(2000 - 2000), 0);
  assert.equal(clampNonNegativeMoney(-50), 0);
  assert.equal(clampNonNegativeMoney(Number.POSITIVE_INFINITY), null);
});

test("malformed authority money remains unavailable", () => {
  const malformed = composeServiceAbsAuthoritySummary({
    scenario: "active",
    scopes: [
      summary({
        id: SCOPE_A,
        status: "approved",
        isActiveApprovedScope: true,
        acceptedGrandTotal: Number.POSITIVE_INFINITY,
      }),
    ],
    activeScope: summary({
      id: SCOPE_A,
      status: "approved",
      isActiveApprovedScope: true,
      acceptedGrandTotal: Number.POSITIVE_INFINITY,
    }),
    canReadInvoiceFinancials: true,
    billing: {
      billingUnavailable: false,
      lifetimeInvoiceExposure: -1,
      approvedQuotation: { id: QT_ID, quotationNumber: "QT-1" },
      billingCeilingFromBillingState: Number.NaN,
    },
  });

  assert.deepEqual(malformed.activeCeiling, { kind: "unavailable" });
  assert.deepEqual(malformed.lifetimeInvoiceExposure, {
    kind: "unavailable",
  });
  assert.deepEqual(malformed.remainingAuthority, { kind: "unavailable" });
});

test("historical authority prevents invalid quotation fallback", () => {
  const result = composeServiceAbsAuthoritySummary({
    scenario: "historical_only",
    scopes: [
      summary({
        id: SCOPE_A,
        status: "voided",
        voidedAt: "2026-07-04T00:00:00Z",
        acceptedGrandTotal: 3000,
      }),
    ],
    activeScope: null,
    canReadInvoiceFinancials: true,
    billing: {
      billingUnavailable: false,
      lifetimeInvoiceExposure: 0,
      approvedQuotation: { id: QT_ID, quotationNumber: "QT-1" },
      billingCeilingFromBillingState: 9999,
    },
  });

  assert.equal(result.hasHistoricalAbsAuthority, true);
  assert.equal(result.usesLegacyQuotationFallback, false);
  assert.equal(result.activeCeiling.kind, "unavailable");
  assert.equal(result.remainingAuthority.kind, "unavailable");
  assert.deepEqual(result.lifetimeInvoiceExposure, { kind: "value", amount: 0 });
});

test("hasHistoricalAbsAuthority detects approved and voided only", () => {
  assert.equal(
    hasHistoricalAbsAuthority([summary({ id: "1", status: "draft" })]),
    false
  );
  assert.equal(
    hasHistoricalAbsAuthority([summary({ id: "1", status: "approved" })]),
    true
  );
  assert.equal(
    hasHistoricalAbsAuthority([summary({ id: "1", status: "voided" })]),
    true
  );
});

test("audit limit default and maximum normalization", () => {
  assert.equal(
    normalizeAbsAuditLimit(undefined, ABS_LIFECYCLE_AUDIT_DEFAULT_LIMIT, ABS_LIFECYCLE_AUDIT_MAX_LIMIT),
    40
  );
  assert.equal(
    normalizeAbsAuditLimit(0, ABS_LIFECYCLE_AUDIT_DEFAULT_LIMIT, ABS_LIFECYCLE_AUDIT_MAX_LIMIT),
    1
  );
  assert.equal(
    normalizeAbsAuditLimit(1000, ABS_LIFECYCLE_AUDIT_DEFAULT_LIMIT, ABS_LIFECYCLE_AUDIT_MAX_LIMIT),
    100
  );
  assert.equal(
    normalizeAbsAuditLimit(25, ABS_LIFECYCLE_AUDIT_DEFAULT_LIMIT, ABS_LIFECYCLE_AUDIT_MAX_LIMIT),
    25
  );
});

test("single authoritative event-name source recognizes all five prefixed values", () => {
  assert.deepEqual([...ABS_LIFECYCLE_AUDIT_EVENT_TYPES], [
    "approved_billing_scope_line_safety_reviewed",
    "approved_billing_scope_approved",
    "approved_billing_scope_voided",
    "approved_billing_scope_successor_created",
    "approved_billing_scope_superseded",
  ]);
  for (const eventType of ABS_LIFECYCLE_AUDIT_EVENT_TYPES) {
    assert.equal(isRecognizedAbsLifecycleEventType(eventType), true);
  }
  assert.equal(isRecognizedAbsLifecycleEventType("payment_recorded"), false);
  assert.equal(isRecognizedAbsLifecycleEventType("voided"), false);
  assert.equal(isRecognizedAbsLifecycleEventType("random"), false);

  const orFilter = buildAbsLifecycleAuditEventTypeOrFilter();
  for (const eventType of ABS_LIFECYCLE_AUDIT_EVENT_TYPES) {
    assert.ok(orFilter.includes(eventType));
  }
});

test("audit raw details are not returned; only sanitized DTO fields", () => {
  const event = mapAbsLifecycleAuditEvent({
    id: "audit-1",
    action: "status_change",
    entityId: SCOPE_A,
    timestamp: "2026-07-05T00:00:00Z",
    userId: "user-1",
    details: {
      event_type: "approved_billing_scope_voided",
      actor_role: "manager",
      reason_code: "other",
      reason_note: "secret note",
      lifecycle_outcome: "voided",
      service_id: SERVICE_ID,
      extra_secret: "must-not-appear",
    },
    canReadInternalNotes: true,
  });

  assert.ok(event);
  assert.equal(event.eventType, "approved_billing_scope_voided");
  assert.equal(event.reasonNote, "secret note");
  assert.equal(event.actor.kind, "identified");
  assert.equal(
    Object.prototype.hasOwnProperty.call(event, "details"),
    false
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(event, "extra_secret"),
    false
  );
});

test("Accountant audit actor and note masking", () => {
  const event = mapAbsLifecycleAuditEvent({
    id: "audit-2",
    action: "status_change",
    entityId: SCOPE_A,
    timestamp: "2026-07-05T00:00:00Z",
    userId: "user-1",
    details: {
      event_type: "approved_billing_scope_voided",
      actor_role: "manager",
      reason_code: "other",
      reason_note: "secret note",
      lifecycle_outcome: "voided",
    },
    canReadInternalNotes: false,
  });

  assert.ok(event);
  assert.deepEqual(event.actor, { kind: "recorded" });
  assert.equal(event.reasonCode, null);
  assert.equal(event.reasonNote, null);
  assert.equal(event.lifecycleOutcome, "voided");
});

test("unrecognized audit event maps to null", () => {
  const event = mapAbsLifecycleAuditEvent({
    id: "audit-3",
    action: "update",
    entityId: SCOPE_A,
    timestamp: "2026-07-05T00:00:00Z",
    userId: "user-1",
    details: { event_type: "something_else" },
    canReadInternalNotes: true,
  });
  assert.equal(event, null);
});

test("audit empty scope set semantics", () => {
  const scopeIds: string[] = [];
  const events = scopeIds.length === 0 ? [] : ["would-query"];
  assert.deepEqual(events, []);
});

test("audit ordering prefers later timestamps", () => {
  const events = [
    { id: "a", timestamp: "2026-07-01T00:00:00Z" },
    { id: "b", timestamp: "2026-07-03T00:00:00Z" },
    { id: "c", timestamp: "2026-07-02T00:00:00Z" },
  ].sort((left, right) => {
    if (left.timestamp === right.timestamp) {
      return right.id.localeCompare(left.id);
    }
    return right.timestamp.localeCompare(left.timestamp);
  });

  assert.deepEqual(
    events.map((e) => e.id),
    ["b", "c", "a"]
  );
});

test("legacy quotation fallback only without historical ABS", () => {
  const result = composeServiceAbsAuthoritySummary({
    scenario: "legacy_quotation_only",
    scopes: [],
    activeScope: null,
    canReadInvoiceFinancials: true,
    billing: {
      billingUnavailable: false,
      lifetimeInvoiceExposure: 100,
      approvedQuotation: { id: QT_ID, quotationNumber: "QT-1" },
      billingCeilingFromBillingState: 1000,
    },
  });

  assert.equal(result.usesLegacyQuotationFallback, true);
  assert.deepEqual(result.activeCeiling, { kind: "value", amount: 1000 });
  assert.deepEqual(result.remainingAuthority, { kind: "value", amount: 900 });
});
