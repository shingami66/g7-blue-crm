import assert from "node:assert/strict";
import test from "node:test";
import {
  buildAbsScopeDetailHref,
  formatBoundedHistoryNotice,
  formatDetailsAriaLabel,
  historyProvesAbsExists,
  historyProvesExactlyZeroAbsScopesForLegacyFallback,
  historyProvesZeroScopes,
  isFullyAllocatedRemaining,
  mapAuthorityMoneyToCardField,
  mapHistoryRowsToSummaries,
  preserveHistoryRowOrder,
  resolveHistoryLifecycleDate,
} from "./service-history-view-model.ts";
import type { AbsScopeHistoryRow } from "./types.ts";

function row(
  partial: Partial<AbsScopeHistoryRow> &
    Pick<AbsScopeHistoryRow, "id" | "effectiveStatus">
): AbsScopeHistoryRow {
  return {
    serviceId: "svc-1",
    scopeVersion: 1,
    status: "approved",
    sourceQuotationId: "qt-1",
    sourceQuotationNumber: "QT-1",
    acceptedSubtotal: 1000,
    acceptedVatAmount: 0,
    acceptedGrandTotal: 1000,
    lineSafetyStatus: "safe",
    createdAt: "2026-07-01T00:00:00Z",
    lineSafetyReviewedAt: null,
    approvedAt: null,
    voidedAt: null,
    supersededAt: null,
    supersedesScopeId: null,
    supersededByScopeId: null,
    isActiveApprovedScope: false,
    ...partial,
  };
}

test("resolveHistoryLifecycleDate: voided takes precedence", () => {
  const result = resolveHistoryLifecycleDate(
    row({
      id: "1",
      effectiveStatus: "voided",
      voidedAt: "2026-07-10T00:00:00Z",
      supersededAt: "2026-07-09T00:00:00Z",
      approvedAt: "2026-07-02T00:00:00Z",
    })
  );
  assert.deepEqual(result, { at: "2026-07-10T00:00:00Z", kind: "voided" });
});

test("resolveHistoryLifecycleDate: superseded before approved", () => {
  const result = resolveHistoryLifecycleDate(
    row({
      id: "1",
      effectiveStatus: "superseded",
      supersededAt: "2026-07-08T00:00:00Z",
      approvedAt: "2026-07-02T00:00:00Z",
    })
  );
  assert.deepEqual(result, { at: "2026-07-08T00:00:00Z", kind: "superseded" });
});

test("resolveHistoryLifecycleDate: approved for active", () => {
  const result = resolveHistoryLifecycleDate(
    row({
      id: "1",
      effectiveStatus: "active",
      approvedAt: "2026-07-02T00:00:00Z",
      isActiveApprovedScope: true,
    })
  );
  assert.deepEqual(result, { at: "2026-07-02T00:00:00Z", kind: "approved" });
});

test("resolveHistoryLifecycleDate: reviewed draft then created fallback", () => {
  assert.deepEqual(
    resolveHistoryLifecycleDate(
      row({
        id: "1",
        effectiveStatus: "draft",
        status: "draft",
        lineSafetyReviewedAt: "2026-07-03T00:00:00Z",
      })
    ),
    { at: "2026-07-03T00:00:00Z", kind: "reviewed" }
  );
  assert.deepEqual(
    resolveHistoryLifecycleDate(
      row({
        id: "2",
        effectiveStatus: "draft",
        status: "draft",
        createdAt: "2026-07-01T12:00:00Z",
      })
    ),
    { at: "2026-07-01T12:00:00Z", kind: "created" }
  );
});

test("buildAbsScopeDetailHref uses service-owned path", () => {
  assert.equal(
    buildAbsScopeDetailHref("svc-abc", "scope-xyz"),
    "/services/svc-abc/approved-billing-scopes/scope-xyz"
  );
});

test("isFullyAllocatedRemaining only for zero value field", () => {
  assert.equal(isFullyAllocatedRemaining({ kind: "value", amount: 0 }), true);
  assert.equal(isFullyAllocatedRemaining({ kind: "value", amount: 1 }), false);
  assert.equal(isFullyAllocatedRemaining({ kind: "hidden" }), false);
  assert.equal(isFullyAllocatedRemaining({ kind: "unavailable" }), false);
});

test("mapAuthorityMoneyToCardField never surfaces negative as billable", () => {
  assert.deepEqual(mapAuthorityMoneyToCardField({ kind: "hidden" }), {
    kind: "hidden",
  });
  assert.deepEqual(mapAuthorityMoneyToCardField({ kind: "unavailable" }), {
    kind: "unavailable",
  });
  assert.deepEqual(mapAuthorityMoneyToCardField({ kind: "value", amount: 100 }), {
    kind: "value",
    amount: 100,
  });
  assert.deepEqual(mapAuthorityMoneyToCardField({ kind: "value", amount: -5 }), {
    kind: "unavailable",
  });
});

test("preserveHistoryRowOrder keeps server order", () => {
  const input = [{ id: "c" }, { id: "a" }, { id: "b" }];
  assert.deepEqual(
    preserveHistoryRowOrder(input).map((r) => r.id),
    ["c", "a", "b"]
  );
});

test("formatBoundedHistoryNotice and details aria", () => {
  assert.equal(
    formatBoundedHistoryNotice("Showing latest {limit} only.", 50),
    "Showing latest 50 only."
  );
  assert.equal(
    formatDetailsAriaLabel("View details for version {version}", 3),
    "View details for version 3"
  );
});

test("historyProvesZeroScopes requires success empty without limitReached", () => {
  assert.equal(historyProvesZeroScopes(null, true), false);
  assert.equal(historyProvesZeroScopes(null, false), false);
  assert.equal(
    historyProvesZeroScopes({ rows: [], limit: 50, limitReached: false }, false),
    true
  );
  assert.equal(
    historyProvesZeroScopes({ rows: [], limit: 50, limitReached: true }, false),
    false
  );
  assert.equal(
    historyProvesZeroScopes(
      {
        rows: [row({ id: "1", effectiveStatus: "active" })],
        limit: 50,
        limitReached: false,
      },
      false
    ),
    false
  );
});

test("historyProvesZeroScopes: draft/voided/superseded rows never prove zero", () => {
  for (const effectiveStatus of ["draft", "voided", "superseded", "active"] as const) {
    assert.equal(
      historyProvesZeroScopes(
        {
          rows: [row({ id: "h1", effectiveStatus })],
          limit: 50,
          limitReached: false,
        },
        false
      ),
      false
    );
    assert.equal(
      historyProvesAbsExists({
        rows: [row({ id: "h1", effectiveStatus })],
        limit: 50,
        limitReached: false,
      }),
      true
    );
  }
  assert.equal(
    historyProvesExactlyZeroAbsScopesForLegacyFallback(
      { rows: [], limit: 50, limitReached: false },
      false
    ),
    true
  );
  assert.equal(
    historyProvesExactlyZeroAbsScopesForLegacyFallback(
      {
        rows: [row({ id: "d1", effectiveStatus: "draft", status: "draft" })],
        limit: 50,
        limitReached: false,
      },
      false
    ),
    false
  );
});

test("historyProvesAbsExists for rows or limitReached", () => {
  assert.equal(historyProvesAbsExists(null), false);
  assert.equal(
    historyProvesAbsExists({ rows: [], limit: 50, limitReached: false }),
    false
  );
  assert.equal(
    historyProvesAbsExists({ rows: [], limit: 50, limitReached: true }),
    true
  );
  assert.equal(
    historyProvesAbsExists({
      rows: [row({ id: "1", effectiveStatus: "voided" })],
      limit: 50,
      limitReached: false,
    }),
    true
  );
});

test("mapHistoryRowsToSummaries preserves order and active flag", () => {
  const mapped = mapHistoryRowsToSummaries([
    row({
      id: "b",
      effectiveStatus: "superseded",
      scopeVersion: 2,
      isActiveApprovedScope: false,
    }),
    row({
      id: "a",
      effectiveStatus: "active",
      scopeVersion: 1,
      isActiveApprovedScope: true,
    }),
  ]);
  assert.deepEqual(
    mapped.map((m) => m.id),
    ["b", "a"]
  );
  assert.equal(mapped[1].isActiveApprovedScope, true);
  assert.equal(mapped[0].isActiveApprovedScope, false);
});
