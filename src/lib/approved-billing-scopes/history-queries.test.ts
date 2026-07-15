import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const SCOPE_ID = "22222222-2222-4222-8222-222222222222";
const QT_ID = "44444444-4444-4444-8444-444444444444";

type QueryCall = {
  table: string;
  filters: Array<{ op: string; args: unknown[] }>;
  orders: Array<{ column: string; ascending?: boolean }>;
  limit?: number;
  select?: string;
  terminal?: string;
};

type Scenario = {
  role: string;
  denyPermission: boolean;
  permissionCalls: string[];
  clientCalls: number;
  billingStateCalls: number;
  checkPermissionResults: Record<string, boolean>;
  queryCalls: QueryCall[];
  responses: Record<string, { data: unknown; error: unknown }>;
};

let activeScenario: Scenario | null = null;

class TestForbiddenError extends Error {
  name = "ForbiddenError";
}

class TestUnauthorizedError extends Error {
  name = "UnauthorizedError";
}

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

function currentScenario(): Scenario {
  if (!activeScenario) {
    throw new Error("scenario not configured");
  }
  return activeScenario;
}

function createQueryBuilder(table: string) {
  const call: QueryCall = {
    table,
    filters: [],
    orders: [],
  };
  currentScenario().queryCalls.push(call);

  const builder: Record<string, unknown> = {};

  builder.select = (cols: string) => {
    call.select = cols;
    return builder;
  };
  builder.eq = (...args: unknown[]) => {
    call.filters.push({ op: "eq", args });
    return builder;
  };
  builder.in = (...args: unknown[]) => {
    call.filters.push({ op: "in", args });
    return builder;
  };
  builder.is = (...args: unknown[]) => {
    call.filters.push({ op: "is", args });
    return builder;
  };
  builder.or = (...args: unknown[]) => {
    call.filters.push({ op: "or", args });
    return builder;
  };
  builder.order = (
    column: string,
    opts?: { ascending?: boolean; foreignTable?: string }
  ) => {
    call.orders.push({ column, ascending: opts?.ascending });
    return builder;
  };
  builder.limit = (n: number) => {
    call.limit = n;
    return builder;
  };
  builder.maybeSingle = async () => {
    call.terminal = "maybeSingle";
    return (
      currentScenario().responses[`${table}:maybeSingle`] ??
      currentScenario().responses[table] ?? { data: null, error: null }
    );
  };

  const execute = async () => {
    call.terminal = "list";
    return (
      currentScenario().responses[`${table}:list`] ??
      currentScenario().responses[table] ?? { data: [], error: null }
    );
  };

Object.assign(builder, {
    then(
      onfulfilled?: ((value: unknown) => unknown) | null,
      onrejected?: ((reason: unknown) => unknown) | null
    ) {
      return execute().then(
        onfulfilled ?? undefined,
        onrejected ?? undefined
      );
    },
  });

  return builder;
}

function createFakeSupabase() {
  return {
    from: (table: string) => createQueryBuilder(table),
  };
}

function resetScenario(partial: Partial<Scenario> = {}): Scenario {
  activeScenario = {
    role: "manager",
    denyPermission: false,
    permissionCalls: [],
    clientCalls: 0,
    billingStateCalls: 0,
    checkPermissionResults: { "invoices:read": true },
    queryCalls: [],
    responses: {},
    ...partial,
  };
  return activeScenario;
}

mock.module("@/lib/auth/errors", {
  namedExports: {
    ForbiddenError: TestForbiddenError,
    UnauthorizedError: TestUnauthorizedError,
  },
});

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      const scenario = currentScenario();
      scenario.permissionCalls.push(permission);
      if (scenario.denyPermission) {
        throw new TestForbiddenError("Denied by test scenario");
      }
      return { clerk_user_id: "test-user", role: scenario.role };
    },
    checkPermission: async (permission: string) => {
      const scenario = currentScenario();
      return scenario.checkPermissionResults[permission] ?? false;
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => {
      currentScenario().clientCalls += 1;
      return createFakeSupabase();
    },
  },
});

mock.module("@/lib/invoices/billing-state", {
  namedExports: {
    getServiceBillingState: async () => {
      currentScenario().billingStateCalls += 1;
      return {
        serviceId: SERVICE_ID,
        approvedQuotation: {
          id: QT_ID,
          quotationNumber: "QT-1",
          status: "approved",
          grandTotal: 1000,
        },
        depositInvoice: null,
        finalInvoice: null,
        activePriorInvoiceTotal: 250,
        remainingUninvoicedAmount: 750,
        canCreateDepositInvoice: false,
        canCreateFinalInvoice: false,
        disabledReasons: [],
      };
    },
  },
});

const {
  listServiceApprovedBillingScopeHistoryResult,
  getApprovedBillingScopeDetailForServiceResult,
  getServiceApprovedBillingAuthoritySummaryResult,
  isApprovedBillingScopeUuid,
} = await import("./queries.ts");

const {
  listApprovedBillingScopeLifecycleAuditEventsForServiceResult,
} = await import("./audit-queries.ts");

const activeScopeRow = {
  id: SCOPE_ID,
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
  line_safety_note: null,
  line_safety_reviewed_by: null,
  line_safety_reviewed_at: null,
  change_summary_reason: null,
  approved_at: "2026-07-02T00:00:00Z",
  approved_by: "a",
  superseded_at: null,
  superseded_by_scope_id: null,
  supersedes_scope_id: null,
  voided_at: null,
  voided_by: null,
  void_reason: null,
  created_by: null,
  updated_by: null,
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-02T00:00:00Z",
  approved_billing_scope_items: [],
};

test("isApprovedBillingScopeUuid validates UUID shape", () => {
  assert.equal(isApprovedBillingScopeUuid(SERVICE_ID), true);
  assert.equal(isApprovedBillingScopeUuid("not-a-uuid"), false);
});

test("history query: authorization occurs before admin client use", async () => {
  const scenario = resetScenario({ denyPermission: true });
  await assert.rejects(
    () => listServiceApprovedBillingScopeHistoryResult(SERVICE_ID),
    (err: unknown) => err instanceof TestForbiddenError
  );
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:read"]);
  assert.equal(scenario.clientCalls, 0);
});

test("history query: invalid service id does not open admin client", async () => {
  const scenario = resetScenario();
  const result = await listServiceApprovedBillingScopeHistoryResult("bad-id");
  assert.equal(result.status, "error");
  if (result.status === "error") {
    assert.equal(result.error, "scope_invalid_id");
  }
  assert.equal(scenario.clientCalls, 0);
});

test("history query: unexpected failure is not empty list", async () => {
  resetScenario({
    responses: {
      approved_billing_scopes: {
        data: null,
        error: { message: "db down" },
      },
    },
  });

  const result = await listServiceApprovedBillingScopeHistoryResult(SERVICE_ID);
  assert.equal(result.status, "error");
  if (result.status === "error") {
    assert.equal(result.error, "scope_unexpected_error");
  }
});

test("history query: empty success, service filter, order, limit 51", async () => {
  const scenario = resetScenario({
    responses: {
      approved_billing_scopes: { data: [], error: null },
    },
  });

  const result = await listServiceApprovedBillingScopeHistoryResult(SERVICE_ID);
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.deepEqual(result.data.rows, []);
    assert.equal(result.data.limit, 50);
    assert.equal(result.data.limitReached, false);
  }

  const scopeQuery = scenario.queryCalls.find(
    (c) => c.table === "approved_billing_scopes"
  );
  assert.ok(scopeQuery);
  assert.deepEqual(scopeQuery?.filters[0], {
    op: "eq",
    args: ["service_id", SERVICE_ID],
  });
  assert.equal(scopeQuery?.limit, 51);
  assert.deepEqual(
    scopeQuery?.orders.map((o) => o.column),
    ["scope_version", "created_at", "id"]
  );
});

test("service-owned detail dual-filters id and service_id; missing is not_found", async () => {
  const scenario = resetScenario({
    responses: {
      "approved_billing_scopes:maybeSingle": { data: null, error: null },
    },
  });

  const result = await getApprovedBillingScopeDetailForServiceResult(
    SERVICE_ID,
    SCOPE_ID
  );
  assert.equal(result.status, "not_found");

  const scopeQuery = scenario.queryCalls.find(
    (c) => c.table === "approved_billing_scopes" && c.terminal === "maybeSingle"
  );
  assert.ok(scopeQuery);
  const eqFilters = scopeQuery?.filters.filter((f) => f.op === "eq") ?? [];
  assert.ok(eqFilters.some((f) => f.args[0] === "id" && f.args[1] === SCOPE_ID));
  assert.ok(
    eqFilters.some((f) => f.args[0] === "service_id" && f.args[1] === SERVICE_ID)
  );
});

test("authority summary: no Invoice path without invoices:read", async () => {
  const scenario = resetScenario({
    checkPermissionResults: { "invoices:read": false },
    responses: {
      approved_billing_scopes: {
        data: [activeScopeRow],
        error: null,
      },
      quotations: {
        data: [{ id: QT_ID, quotation_number: "QT-1", status: "approved" }],
        error: null,
      },
    },
  });

  const result = await getServiceApprovedBillingAuthoritySummaryResult(SERVICE_ID);
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.data.canReadInvoiceFinancials, false);
    assert.equal(result.data.lifetimeInvoiceExposure.kind, "hidden");
    assert.equal(result.data.remainingAuthority.kind, "hidden");
    assert.notEqual(result.data.lifetimeInvoiceExposure.kind, "value");
    assert.notEqual(result.data.remainingAuthority.kind, "value");
  }
  assert.equal(scenario.billingStateCalls, 0);
  assert.ok(
    !scenario.queryCalls.some((c) => c.table === "invoices"),
    "must not query invoices without invoices:read"
  );
});

test("audit query: empty Service scope set returns no events and avoids .in()", async () => {
  const scenario = resetScenario({
    responses: {
      approved_billing_scopes: { data: [], error: null },
    },
  });

  const result =
    await listApprovedBillingScopeLifecycleAuditEventsForServiceResult(SERVICE_ID);
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.deepEqual(result.data.events, []);
    assert.equal(result.data.limit, 40);
    assert.equal(result.data.scopeDiscoveryLimitReached, false);
    assert.equal(result.data.candidateAuditLimitReached, false);
    assert.equal(result.data.recognizedEventCount, 0);
  }
  assert.ok(!scenario.queryCalls.some((c) => c.table === "audit_logs"));
});

test("audit query: scope discovery fetches cap+1 and reports over-cap", async () => {
  const scopeIds = Array.from({ length: 51 }, (_, i) => {
    const n = (i + 1).toString(16).padStart(12, "0");
    return `22222222-2222-4222-8222-${n}`;
  });

  const scenario = resetScenario({
    responses: {
      approved_billing_scopes: {
        data: scopeIds.map((id) => ({ id })),
        error: null,
      },
      audit_logs: { data: [], error: null },
    },
  });

  const result =
    await listApprovedBillingScopeLifecycleAuditEventsForServiceResult(SERVICE_ID);
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.data.scopeDiscoveryLimitReached, true);
    assert.equal(result.data.candidateAuditLimitReached, false);
  }

  const discoveryCall = scenario.queryCalls.find(
    (c) => c.table === "approved_billing_scopes"
  );
  assert.equal(discoveryCall?.limit, 51);

  const auditCall = scenario.queryCalls.find((c) => c.table === "audit_logs");
  assert.ok(auditCall);
  const inFilter = auditCall?.filters.find((f) => f.op === "in");
  assert.ok(inFilter);
  assert.equal((inFilter?.args[1] as string[]).length, 50);
  assert.ok(
    auditCall?.filters.some(
      (f) =>
        f.op === "or" &&
        typeof f.args[0] === "string" &&
        String(f.args[0]).includes("approved_billing_scope_voided")
    )
  );
});

test("audit query: scopeDiscoveryLimitReached false within cap", async () => {
  resetScenario({
    responses: {
      approved_billing_scopes: {
        data: [{ id: SCOPE_ID }],
        error: null,
      },
      audit_logs: { data: [], error: null },
    },
  });

  const result =
    await listApprovedBillingScopeLifecycleAuditEventsForServiceResult(SERVICE_ID);
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.data.scopeDiscoveryLimitReached, false);
  }
});

test("audit query: candidateAuditLimitReached vs recognized count", async () => {
  const auditRows = Array.from({ length: 41 }, (_, i) => ({
    id: `aud-${i}`,
    action: "status_change",
    entity_type: "approved_billing_scope",
    entity_id: SCOPE_ID,
    user_id: "user-1",
    timestamp: `2026-07-${String((i % 28) + 1).padStart(2, "0")}T00:00:00Z`,
    details: {
      event_type: "approved_billing_scope_voided",
      lifecycle_outcome: "voided",
    },
  }));

  resetScenario({
    responses: {
      approved_billing_scopes: {
        data: [{ id: SCOPE_ID }],
        error: null,
      },
      audit_logs: { data: auditRows, error: null },
    },
  });

  const result =
    await listApprovedBillingScopeLifecycleAuditEventsForServiceResult(SERVICE_ID, {
      limit: 40,
    });
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.data.candidateAuditLimitReached, true);
    assert.equal(result.data.recognizedEventCount, 40);
    assert.equal(result.data.events.length, 40);
    assert.equal(result.data.scopeDiscoveryLimitReached, false);
  }
});

test("audit query: Service-owned scope ID filter and no raw details", async () => {
  const scenario = resetScenario({
    responses: {
      approved_billing_scopes: {
        data: [{ id: SCOPE_ID }],
        error: null,
      },
      audit_logs: {
        data: [
          {
            id: "aud-1",
            action: "status_change",
            entity_type: "approved_billing_scope",
            entity_id: SCOPE_ID,
            user_id: "user-1",
            timestamp: "2026-07-05T00:00:00Z",
            details: {
              event_type: "approved_billing_scope_voided",
              reason_note: "secret",
              actor_role: "manager",
              lifecycle_outcome: "voided",
            },
          },
        ],
        error: null,
      },
    },
  });

  const result =
    await listApprovedBillingScopeLifecycleAuditEventsForServiceResult(SERVICE_ID);

  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.data.events.length, 1);
    assert.equal(result.data.events[0].scopeId, SCOPE_ID);
    assert.equal(result.data.recognizedEventCount, 1);
    assert.equal(
      Object.prototype.hasOwnProperty.call(result.data.events[0], "details"),
      false
    );
  }

  const auditCall = scenario.queryCalls.find((c) => c.table === "audit_logs");
  assert.ok(auditCall);
  assert.ok(
    auditCall?.filters.some(
      (f) =>
        f.op === "eq" &&
        f.args[0] === "entity_type" &&
        f.args[1] === "approved_billing_scope"
    )
  );
  assert.ok(
    auditCall?.filters.some(
      (f) => f.op === "in" && f.args[0] === "entity_id"
    )
  );
  assert.equal(auditCall?.limit, 41);
});

test("audit query: Accountant masks actor and notes", async () => {
  resetScenario({
    role: "accountant",
    responses: {
      approved_billing_scopes: {
        data: [{ id: SCOPE_ID }],
        error: null,
      },
      audit_logs: {
        data: [
          {
            id: "aud-1",
            action: "status_change",
            entity_type: "approved_billing_scope",
            entity_id: SCOPE_ID,
            user_id: "user-1",
            timestamp: "2026-07-05T00:00:00Z",
            details: {
              event_type: "approved_billing_scope_voided",
              reason_note: "secret",
              reason_code: "other",
              actor_role: "manager",
              lifecycle_outcome: "voided",
            },
          },
        ],
        error: null,
      },
    },
  });

  const result =
    await listApprovedBillingScopeLifecycleAuditEventsForServiceResult(SERVICE_ID);
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.data.events[0].actor.kind, "recorded");
    assert.equal(result.data.events[0].reasonNote, null);
    assert.equal(result.data.events[0].reasonCode, null);
  }
});

test("history quotation batch includes service_id", async () => {
  const scenario = resetScenario({
    responses: {
      approved_billing_scopes: {
        data: [activeScopeRow],
        error: null,
      },
      quotations: {
        data: [{ id: QT_ID, quotation_number: "QT-1" }],
        error: null,
      },
    },
  });

  const result = await listServiceApprovedBillingScopeHistoryResult(SERVICE_ID);
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.data.rows[0]?.sourceQuotationNumber, "QT-1");
  }

  const quotationCall = scenario.queryCalls.find((c) => c.table === "quotations");
  assert.ok(quotationCall);
  assert.ok(
    quotationCall?.filters.some(
      (f) => f.op === "eq" && f.args[0] === "service_id" && f.args[1] === SERVICE_ID
    )
  );
  assert.ok(
    quotationCall?.filters.some((f) => f.op === "in" && f.args[0] === "id")
  );
});

test("detail quotation lookup includes service_id; cross-service yields null number", async () => {
  const scenario = resetScenario({
    responses: {
      "approved_billing_scopes:maybeSingle": {
        data: activeScopeRow,
        error: null,
      },
      // No quotation returned under dual filter → null number
      quotations: { data: null, error: null },
    },
  });

  // maybeSingle path for quotations
  scenario.responses["quotations:maybeSingle"] = { data: null, error: null };

  const result = await getApprovedBillingScopeDetailForServiceResult(
    SERVICE_ID,
    SCOPE_ID
  );
  assert.equal(result.status, "success");
  if (result.status === "success") {
    assert.equal(result.data.sourceQuotation?.id, QT_ID);
    assert.equal(result.data.sourceQuotation?.quotationNumber, null);
  }

  const quotationCall = scenario.queryCalls.find(
    (c) => c.table === "quotations" && c.terminal === "maybeSingle"
  );
  assert.ok(quotationCall);
  const eqs = quotationCall?.filters.filter((f) => f.op === "eq") ?? [];
  assert.ok(eqs.some((f) => f.args[0] === "id" && f.args[1] === QT_ID));
  assert.ok(
    eqs.some((f) => f.args[0] === "service_id" && f.args[1] === SERVICE_ID)
  );
});
