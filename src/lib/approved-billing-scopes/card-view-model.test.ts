import assert from "node:assert/strict";
import test from "node:test";
import type { ApprovedBillingScopeSummary } from "./types.ts";
import {
  buildAbsCardBillingSnapshot,
  deriveAbsCardEffectiveStatus,
  pickAbsCardScopes,
  resolveAbsCardMoneyFields,
  resolveAbsCardScenario,
  resolveDraftCreateContext,
  resolveSourceQuotationNumber,
} from "./card-view-model.ts";

function scope(
  partial: Partial<ApprovedBillingScopeSummary> &
    Pick<ApprovedBillingScopeSummary, "id" | "status">,
): ApprovedBillingScopeSummary {
  return {
    serviceId: "svc-1",
    sourceQuotationId: "qt-1",
    scopeVersion: 1,
    lineSafetyStatus: "pending_review",
    acceptedGrandTotal: 10000,
    isActiveApprovedScope: false,
    approvedAt: null,
    supersededAt: null,
    voidedAt: null,
    ...partial,
  };
}

const ELIGIBLE_DRAFT_CREATE_OPTIONS = {
  scopesLoadError: false,
  serviceLifecycleEligible: true,
} as const;

test("deriveAbsCardEffectiveStatus: draft / active / superseded / voided", () => {
  assert.equal(
    deriveAbsCardEffectiveStatus({
      status: "draft",
      supersededAt: null,
      voidedAt: null,
    }),
    "draft",
  );
  assert.equal(
    deriveAbsCardEffectiveStatus({
      status: "approved",
      supersededAt: null,
      voidedAt: null,
    }),
    "active",
  );
  assert.equal(
    deriveAbsCardEffectiveStatus({
      status: "approved",
      supersededAt: "2026-01-01T00:00:00Z",
      voidedAt: null,
    }),
    "superseded",
  );
  assert.equal(
    deriveAbsCardEffectiveStatus({
      status: "voided",
      supersededAt: null,
      voidedAt: "2026-01-01T00:00:00Z",
    }),
    "voided",
  );
  assert.equal(
    deriveAbsCardEffectiveStatus({
      status: "approved",
      supersededAt: null,
      voidedAt: "2026-01-01T00:00:00Z",
    }),
    "voided",
  );
});

test("pickAbsCardScopes: prefers active, then draft, tracks draft revision", () => {
  const active = scope({
    id: "a",
    status: "approved",
    isActiveApprovedScope: true,
    scopeVersion: 2,
    acceptedGrandTotal: 20000,
  });
  const draft = scope({
    id: "d",
    status: "draft",
    scopeVersion: 3,
    acceptedGrandTotal: 18000,
  });
  const superseded = scope({
    id: "s",
    status: "approved",
    scopeVersion: 1,
    supersededAt: "2026-01-01T00:00:00Z",
    acceptedGrandTotal: 15000,
  });

  const withBoth = pickAbsCardScopes([draft, active, superseded]);
  assert.equal(withBoth.primary?.id, "a");
  assert.equal(withBoth.active?.id, "a");
  assert.equal(withBoth.draft?.id, "d");
  assert.equal(withBoth.hasDraftRevision, true);
  assert.equal(withBoth.effectiveStatus, "active");
  assert.equal(withBoth.otherScopeCount, 2);

  const draftOnly = pickAbsCardScopes([draft]);
  assert.equal(draftOnly.primary?.id, "d");
  assert.equal(draftOnly.effectiveStatus, "draft");
  assert.equal(draftOnly.hasDraftRevision, false);

  const historicalOnly = pickAbsCardScopes([superseded]);
  assert.equal(historicalOnly.primary?.id, "s");
  assert.equal(historicalOnly.effectiveStatus, "superseded");
});

test("resolveAbsCardScenario matrix", () => {
  const active = scope({
    id: "a",
    status: "approved",
    isActiveApprovedScope: true,
  });
  const draft = scope({ id: "d", status: "draft" });
  const voided = scope({
    id: "v",
    status: "voided",
    voidedAt: "2026-01-01T00:00:00Z",
  });

  assert.equal(
    resolveAbsCardScenario({
      scopesLoadError: true,
      scopes: [],
      hasApprovedQuotation: true,
    }),
    "unavailable",
  );
  assert.equal(
    resolveAbsCardScenario({
      scopesLoadError: false,
      scopes: [],
      hasApprovedQuotation: false,
    }),
    "no_approved_quotation",
  );
  assert.equal(
    resolveAbsCardScenario({
      scopesLoadError: false,
      scopes: [],
      hasApprovedQuotation: true,
    }),
    "legacy_quotation_only",
  );
  assert.equal(
    resolveAbsCardScenario({
      scopesLoadError: false,
      scopes: [draft],
      hasApprovedQuotation: true,
    }),
    "draft_only",
  );
  assert.equal(
    resolveAbsCardScenario({
      scopesLoadError: false,
      scopes: [active],
      hasApprovedQuotation: true,
    }),
    "active",
  );
  assert.equal(
    resolveAbsCardScenario({
      scopesLoadError: false,
      scopes: [active, draft],
      hasApprovedQuotation: true,
    }),
    "active_with_draft",
  );
  assert.equal(
    resolveAbsCardScenario({
      scopesLoadError: false,
      scopes: [voided],
      hasApprovedQuotation: true,
    }),
    "historical_only",
  );
});

test("resolveSourceQuotationNumber prefers map then matching billing quotation", () => {
  assert.equal(
    resolveSourceQuotationNumber({
      sourceQuotationId: "qt-1",
      quotationNumbersById: { "qt-1": "QT-2026-0001" },
      billingQuotation: null,
    }),
    "QT-2026-0001",
  );
  assert.equal(
    resolveSourceQuotationNumber({
      sourceQuotationId: "qt-1",
      quotationNumbersById: {},
      billingQuotation: { id: "qt-1", quotationNumber: "QT-2026-0002" },
    }),
    "QT-2026-0002",
  );
  assert.equal(
    resolveSourceQuotationNumber({
      sourceQuotationId: "qt-1",
      quotationNumbersById: {},
      billingQuotation: { id: "other", quotationNumber: "QT-X" },
    }),
    null,
  );
});

test("resolveAbsCardMoneyFields: active uses server totals; hidden without invoices:read", () => {
  const active = scope({
    id: "a",
    status: "approved",
    isActiveApprovedScope: true,
    acceptedGrandTotal: 30000,
  });
  const billing = buildAbsCardBillingSnapshot({
    approvedQuotation: {
      id: "qt-1",
      quotationNumber: "QT-1",
      grandTotal: 30000,
    },
    activePriorInvoiceTotal: 10000,
    remainingUninvoicedAmount: 20000,
    disabledReasons: [],
  });

  const shown = resolveAbsCardMoneyFields({
    scenario: "active",
    primary: active,
    billing,
    canReadInvoices: true,
  });
  assert.deepEqual(shown.ceiling, { kind: "value", amount: 30000 });
  assert.deepEqual(shown.invoiced, { kind: "value", amount: 10000 });
  assert.deepEqual(shown.remaining, { kind: "value", amount: 20000 });
  assert.equal(shown.usesLegacyQuotationAuthority, false);

  const hidden = resolveAbsCardMoneyFields({
    scenario: "active",
    primary: active,
    billing,
    canReadInvoices: false,
  });
  assert.equal(hidden.invoiced.kind, "hidden");
  assert.equal(hidden.remaining.kind, "hidden");
  assert.deepEqual(hidden.ceiling, { kind: "value", amount: 30000 });
});

test("resolveAbsCardMoneyFields: legacy quotation and unavailable billing", () => {
  const legacy = resolveAbsCardMoneyFields({
    scenario: "legacy_quotation_only",
    primary: null,
    billing: buildAbsCardBillingSnapshot({
      approvedQuotation: {
        id: "qt-1",
        quotationNumber: "QT-1",
        grandTotal: 50000,
      },
      activePriorInvoiceTotal: 0,
      remainingUninvoicedAmount: 50000,
      disabledReasons: [],
    }),
    canReadInvoices: true,
  });
  assert.deepEqual(legacy.ceiling, { kind: "value", amount: 50000 });
  assert.deepEqual(legacy.invoiced, { kind: "value", amount: 0 });
  assert.equal(legacy.usesLegacyQuotationAuthority, true);

  const unavailable = resolveAbsCardMoneyFields({
    scenario: "active",
    primary: scope({
      id: "a",
      status: "approved",
      isActiveApprovedScope: true,
      acceptedGrandTotal: 1000,
    }),
    billing: buildAbsCardBillingSnapshot({
      approvedQuotation: {
        id: "qt-1",
        quotationNumber: "QT-1",
        grandTotal: 1000,
      },
      activePriorInvoiceTotal: 0,
      remainingUninvoicedAmount: 0,
      disabledReasons: ["billing_state_unavailable"],
    }),
    canReadInvoices: true,
  });
  assert.equal(unavailable.invoiced.kind, "unavailable");
  assert.equal(unavailable.remaining.kind, "unavailable");
  assert.notEqual(unavailable.invoiced.kind, "value");
});

test("does not treat superseded as a database status string", () => {
  const status = deriveAbsCardEffectiveStatus({
    status: "approved",
    supersededAt: "2026-02-01T00:00:00Z",
    voidedAt: null,
  });
  assert.equal(status, "superseded");
  assert.notEqual(status, "approved");
});

// ---------------------------------------------------------------------------
// Draft-create historical gate
// ---------------------------------------------------------------------------

test("draft-create: approved QT + zero ABS records shows Create Draft", () => {
  const result = resolveDraftCreateContext(
    [],
    { approvedQuotation: { id: "qt-1" } },
    ELIGIBLE_DRAFT_CREATE_OPTIONS,
  );
  assert.equal(result.sourceQuotationId, "qt-1");
  assert.equal(result.existingDraftScopeId, null);
  assert.equal(result.showCreateDraft, true);
});

test("draft-create: existing draft hides Create Draft and exposes draft id", () => {
  const result = resolveDraftCreateContext(
    [scope({ id: "d1", status: "draft", sourceQuotationId: "qt-1" })],
    { approvedQuotation: { id: "qt-1" } },
    ELIGIBLE_DRAFT_CREATE_OPTIONS,
  );
  assert.equal(result.showCreateDraft, false);
  assert.equal(result.existingDraftScopeId, "d1");
});

test("draft-create: active approved scope hides Create Draft", () => {
  const result = resolveDraftCreateContext(
    [
      scope({
        id: "a1",
        status: "approved",
        isActiveApprovedScope: true,
      }),
    ],
    { approvedQuotation: { id: "qt-1" } },
    ELIGIBLE_DRAFT_CREATE_OPTIONS,
  );
  assert.equal(result.showCreateDraft, false);
});

test("draft-create: voided-only history hides Create Draft", () => {
  const result = resolveDraftCreateContext(
    [scope({ id: "v1", status: "voided", voidedAt: "2026-01-01T00:00:00Z" })],
    { approvedQuotation: { id: "qt-1" } },
    ELIGIBLE_DRAFT_CREATE_OPTIONS,
  );
  assert.equal(result.showCreateDraft, false);
});

test("draft-create: superseded-derived-only history hides Create Draft", () => {
  const result = resolveDraftCreateContext(
    [
      scope({
        id: "s1",
        status: "approved",
        isActiveApprovedScope: false,
        supersededAt: "2026-03-01T00:00:00Z",
      }),
    ],
    { approvedQuotation: { id: "qt-1" } },
    ELIGIBLE_DRAFT_CREATE_OPTIONS,
  );
  assert.equal(result.showCreateDraft, false);
});

test("draft-create: mixed historical records hide Create Draft", () => {
  const result = resolveDraftCreateContext(
    [
      scope({
        id: "s1",
        status: "approved",
        supersededAt: "2026-01-01T00:00:00Z",
        scopeVersion: 1,
      }),
      scope({
        id: "v1",
        status: "voided",
        voidedAt: "2026-02-01T00:00:00Z",
        scopeVersion: 2,
      }),
    ],
    { approvedQuotation: { id: "qt-1" } },
    ELIGIBLE_DRAFT_CREATE_OPTIONS,
  );
  assert.equal(result.showCreateDraft, false);
});

test("draft-create: no-active is not equivalent to zero-scope", () => {
  // Voided history is not active, but must not authorize create.
  const result = resolveDraftCreateContext(
    [scope({ id: "v1", status: "voided", voidedAt: "2026-01-01T00:00:00Z" })],
    { approvedQuotationId: "qt-1" },
    ELIGIBLE_DRAFT_CREATE_OPTIONS,
  );
  assert.equal(result.showCreateDraft, false);
});

test("draft-create: Cancelled Service hides Create Draft", () => {
  const result = resolveDraftCreateContext(
    [],
    { approvedQuotationId: "qt-1" },
    { scopesLoadError: false, serviceLifecycleEligible: false },
  );
  assert.equal(result.showCreateDraft, false);
});

test("draft-create: Completed Service hides Create Draft", () => {
  const result = resolveDraftCreateContext(
    [],
    { approvedQuotationId: "qt-1" },
    { scopesLoadError: false, serviceLifecycleEligible: false },
  );
  assert.equal(result.showCreateDraft, false);
});

test("draft-create: scopes load error hides Create Draft", () => {
  const result = resolveDraftCreateContext(
    [],
    { approvedQuotationId: "qt-1" },
    { scopesLoadError: true, serviceLifecycleEligible: true },
  );
  assert.equal(result.showCreateDraft, false);
});

test("draft-create: no approved quotation hides Create Draft", () => {
  const result = resolveDraftCreateContext(
    [],
    { approvedQuotation: null },
    ELIGIBLE_DRAFT_CREATE_OPTIONS,
  );
  assert.equal(result.showCreateDraft, false);
  assert.equal(result.sourceQuotationId, null);
});
