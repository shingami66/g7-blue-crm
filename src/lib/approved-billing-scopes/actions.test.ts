import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";
import {
  APPROVED_BILLING_SCOPE_ERROR_CODES,
  APPROVED_BILLING_SCOPE_ERROR_MESSAGES,
  type ApprovedBillingScopeErrorCode,
} from "./errors.ts";

const SOURCE_QUOTATION_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_SERVICE_ID = "22222222-2222-4222-8222-222222222222";
const SCOPE_ID = "33333333-3333-4333-8333-333333333333";
const ITEM_ID = "44444444-4444-4444-8444-444444444444";

type ServiceRow = {
  status: string;
  deleted_at: string | null;
};

type ScopeRow = Record<string, unknown> | null;
type ItemRow = Record<string, unknown>;

type ActionScenario = {
  service: ServiceRow | null;
  denyPermission?: boolean;
  clientCalls: number;
  insertTables: string[];
  operations: string[];
  permissionCalls: string[];
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  rpcResponses: Record<string, { data: unknown; error: { message: string } | null }>;
  readBackDetail: unknown;
  scope: ScopeRow;
  items: ItemRow[];
  activeScope: unknown;
  scopeUpdateResult: ScopeRow;
  scopeUpdateError: { message: string; code?: string } | null;
  updates: Array<{ table: string; values: Record<string, unknown> }>;
};

let activeScenario: ActionScenario | null = null;

class TestForbiddenError extends Error {}
class TestUnauthorizedError extends Error {}

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

const { isTerminalServiceStatus } = await import("../services/status-transitions.ts");

function currentScenario(): ActionScenario {
  if (!activeScenario) {
    throw new Error("Action scenario was not configured");
  }

  return activeScenario;
}

test("Approved billing scope taxonomy keeps scope_not_active exact and distinct", () => {
  const stableCode: ApprovedBillingScopeErrorCode = "scope_not_active";

  assert.equal(
    APPROVED_BILLING_SCOPE_ERROR_CODES.filter((code) => code === stableCode).length,
    1,
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      APPROVED_BILLING_SCOPE_ERROR_MESSAGES,
      stableCode,
    ),
    true,
  );
  assert.equal(
    APPROVED_BILLING_SCOPE_ERROR_MESSAGES[stableCode],
    "The approved billing scope is not the active approved scope for this service.",
  );
  assert.equal(
    Object.prototype.hasOwnProperty.call(
      APPROVED_BILLING_SCOPE_ERROR_MESSAGES,
      "scope_not_active_typo",
    ),
    false,
  );
});

function sourceQuotation() {
  return {
    id: SOURCE_QUOTATION_ID,
    service_id: SOURCE_SERVICE_ID,
    status: "approved",
    is_deleted: false,
  };
}

function draftScope(overrides: Record<string, unknown> = {}) {
  return {
    id: SCOPE_ID,
    status: "draft",
    service_id: SOURCE_SERVICE_ID,
    line_safety_status: "pending_review",
    accepted_subtotal: 100,
    accepted_vat_amount: 15,
    accepted_grand_total: 115,
    voided_at: null,
    superseded_at: null,
    ...overrides,
  };
}

function acceptedItem(overrides: Record<string, unknown> = {}) {
  return {
    id: ITEM_ID,
    decision: "accepted",
    source_qty: 1,
    source_unit_price: 100,
    source_subtotal: 100,
    source_vat_amount: 15,
    source_grand_total: 115,
    accepted_qty: 1,
    accepted_unit_price: 100,
    accepted_subtotal: 100,
    accepted_vat_amount: 15,
    accepted_grand_total: 115,
    reason_code: null,
    ...overrides,
  };
}

function createFakeSupabase() {
  return {
    from(table: string) {
      const scenario = currentScenario();
      scenario.operations.push(`from:${table}`);

      const query = {
        isUpdate: false,
        select(columns: string) {
          scenario.operations.push(`select:${table}:${columns}`);
          return query;
        },
        eq(column: string, value: string) {
          scenario.operations.push(`eq:${table}:${column}:${value}`);
          return query;
        },
        is(column: string, value: unknown) {
          scenario.operations.push(`is:${table}:${column}:${String(value)}`);
          return query;
        },
        update(values: Record<string, unknown>) {
          scenario.operations.push(`update:${table}`);
          scenario.updates.push({ table, values });
          query.isUpdate = true;
          return query;
        },
        async maybeSingle() {
          if (table === "quotations") {
            return { data: sourceQuotation(), error: null };
          }

          if (table === "services") {
            return { data: scenario.service, error: null };
          }

          if (table === "approved_billing_scopes") {
            return query.isUpdate
              ? { data: scenario.scopeUpdateResult, error: scenario.scopeUpdateError }
              : { data: scenario.scope, error: null };
          }

          throw new Error(`Unexpected lookup table: ${table}`);
        },
        then<TResult1 = { data: unknown; error: null }, TResult2 = never>(
          onfulfilled?: ((value: { data: unknown; error: null }) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          if (table !== "approved_billing_scope_items") {
            return Promise.resolve({ data: null, error: null }).then(onfulfilled, onrejected);
          }

          return Promise.resolve({ data: scenario.items, error: null }).then(onfulfilled, onrejected);
        },
        insert() {
          scenario.insertTables.push(table);
          throw new Error(`Unexpected insert into ${table}`);
        },
      };

      return query;
    },
    rpc(name: string, args: Record<string, unknown>) {
      const scenario = currentScenario();
      scenario.rpcCalls.push({ name, args });
      const response = scenario.rpcResponses[name];
      if (!response) {
        throw new Error(`Unexpected RPC: ${name}`);
      }

      return {
        async single<T>() {
          return { data: response.data as T, error: response.error };
        },
        then<TResult1 = { data: unknown; error: { message: string } | null }, TResult2 = never>(
          onfulfilled?: ((value: { data: unknown; error: { message: string } | null }) => TResult1 | PromiseLike<TResult1>) | null,
          onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null,
        ) {
          return Promise.resolve({ data: response.data, error: response.error }).then(onfulfilled, onrejected);
        },
      };
    },
  };
}

function startScenario(
  service: ServiceRow | null,
  denyPermission = false,
  options: Partial<Pick<ActionScenario, "rpcResponses" | "readBackDetail" | "scope" | "items" | "activeScope" | "scopeUpdateResult" | "scopeUpdateError">> = {},
) {
  activeScenario = {
    service,
    denyPermission,
    clientCalls: 0,
    insertTables: [],
    operations: [],
    permissionCalls: [],
    rpcCalls: [],
    rpcResponses: options.rpcResponses ?? {},
    readBackDetail: options.readBackDetail ?? null,
    scope: "scope" in options ? options.scope ?? null : draftScope(),
    items: options.items ?? [acceptedItem()],
    activeScope: "activeScope" in options ? options.activeScope ?? null : null,
    scopeUpdateResult: "scopeUpdateResult" in options ? options.scopeUpdateResult ?? null : { id: SCOPE_ID },
    scopeUpdateError: options.scopeUpdateError ?? null,
    updates: [],
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

      return { clerk_user_id: "test-user", role: "manager" };
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
mock.module("@/lib/services/status-transitions", {
  namedExports: {
    isTerminalServiceStatus,
  },
});
mock.module("./queries.ts", {
  namedExports: {
    getActiveApprovedBillingScopeForService: async () => currentScenario().activeScope,
    getApprovedBillingScopeById: async () => currentScenario().readBackDetail,
  },
});

const {
  createApprovedBillingScopeDraft,
  discardApprovedBillingScopeDraft,
  editApprovedBillingScopeItem,
  reviewApprovedBillingScopeLineSafety,
  approveApprovedBillingScope,
} = await import("./actions.ts");

function assertNoDraftWrites(scenario: ActionScenario) {
  assert.deepEqual(scenario.insertTables, []);
  assert.equal(
    scenario.operations.some((operation) =>
      operation.startsWith("from:approved_billing_scopes"),
    ),
    false,
  );
  assert.equal(
    scenario.operations.some((operation) =>
      operation.startsWith("from:approved_billing_scope_items"),
    ),
    false,
  );
}

function assertNoScopeItemInserts(scenario: ActionScenario) {
  assert.deepEqual(scenario.insertTables, []);
  assert.equal(
    scenario.operations.some((operation) => operation.startsWith("from:approved_billing_scopes")),
    false,
  );
  assert.equal(
    scenario.operations.some((operation) => operation.startsWith("from:approved_billing_scope_items")),
    false,
  );
}

for (const status of ["Cancelled", "Completed"]) {
  test(`createApprovedBillingScopeDraft rejects ${status} Services before inserts`, async () => {
    const scenario = startScenario({ status, deleted_at: null });

    const response = await createApprovedBillingScopeDraft({
      sourceQuotationId: SOURCE_QUOTATION_ID,
    });

    assert.deepEqual(response, {
      success: false,
      error: "scope_service_lifecycle_ineligible",
    });
    assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:create"]);
    assert.ok(
      scenario.operations.includes(
        `eq:services:id:${SOURCE_SERVICE_ID}`,
      ),
    );
    assertNoDraftWrites(scenario);
  });
}

test("createApprovedBillingScopeDraft rejects a deleted Service before inserts", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: "2026-07-13T00:00:00.000Z" });

  const response = await createApprovedBillingScopeDraft({
    sourceQuotationId: SOURCE_QUOTATION_ID,
  });

  assert.deepEqual(response, {
    success: false,
    error: "scope_service_lifecycle_ineligible",
  });
  assertNoDraftWrites(scenario);
});

test("createApprovedBillingScopeDraft rejects a missing Service before inserts", async () => {
  const scenario = startScenario(null);

  const response = await createApprovedBillingScopeDraft({
    sourceQuotationId: SOURCE_QUOTATION_ID,
  });

  assert.deepEqual(response, {
    success: false,
    error: "scope_source_service_mismatch",
  });
  assertNoDraftWrites(scenario);
});

test("createApprovedBillingScopeDraft resolves the Service from the quotation, not browser input", async () => {
  const scenario = startScenario({ status: "Cancelled", deleted_at: null });

  const response = await createApprovedBillingScopeDraft({
    sourceQuotationId: SOURCE_QUOTATION_ID,
    serviceId: "browser-supplied-service-id",
    serviceStatus: "Approved",
  });

  assert.deepEqual(response, {
    success: false,
    error: "scope_service_lifecycle_ineligible",
  });
  assert.ok(
    scenario.operations.includes(
      `eq:services:id:${SOURCE_SERVICE_ID}`,
    ),
  );
  assert.equal(
    scenario.operations.includes("eq:services:id:browser-supplied-service-id"),
    false,
  );
  assertNoDraftWrites(scenario);
});

test("createApprovedBillingScopeDraft checks authorization before creating a write client", async () => {
  const scenario = startScenario({ status: "Cancelled", deleted_at: null }, true);

  const response = await createApprovedBillingScopeDraft({
    sourceQuotationId: SOURCE_QUOTATION_ID,
  });

  assert.deepEqual(response, {
    success: false,
    error: "scope_permission_denied",
  });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:create"]);
  assert.equal(scenario.clientCalls, 0);
  assert.deepEqual(scenario.operations, []);
  assertNoDraftWrites(scenario);
});

test("editApprovedBillingScopeItem sends only the editable draft-item fields and reads back success", async () => {
  const detail = { id: SCOPE_ID, items: [] };
  const scenario = startScenario({ status: "Approved", deleted_at: null }, false, {
    readBackDetail: detail,
    rpcResponses: {
      edit_approved_billing_scope_item: {
        data: {
          error_code: null,
          scope_id: SCOPE_ID,
          item_id: ITEM_ID,
          accepted_subtotal: 100,
          accepted_vat_amount: 15,
          accepted_grand_total: 115,
          line_safety_status: "pending_review",
          updated: true,
        },
        error: null,
      },
    },
  });

  const response = await editApprovedBillingScopeItem({
    scopeId: SCOPE_ID,
    itemId: ITEM_ID,
    decision: "adjusted",
    acceptedQty: 2,
    acceptedUnitPrice: 50,
    reasonCode: "customer_reduced_quantity",
    reasonNote: "Customer confirmed",
  });

  assert.deepEqual(response, { success: true, data: detail });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:update"]);
  assert.deepEqual(scenario.rpcCalls, [{
    name: "edit_approved_billing_scope_item",
    args: {
      p_scope_id: SCOPE_ID,
      p_item_id: ITEM_ID,
      p_decision: "adjusted",
      p_accepted_qty: 2,
      p_accepted_unit_price: 50,
      p_reason_code: "customer_reduced_quantity",
      p_reason_note: "Customer confirmed",
      p_display_order: null,
    },
  }]);
  assertNoScopeItemInserts(scenario);
});

for (const [label, errorCode] of [
  ["a non-draft scope", "scope_not_draft"],
  ["a missing scope or item", "scope_not_found"],
  ["a quantity increase", "scope_reduction_invalid"],
  ["a concurrent edit", "scope_concurrency_conflict"],
] as const) {
  test(`editApprovedBillingScopeItem rejects ${label} without scope-item inserts`, async () => {
    const scenario = startScenario({ status: "Approved", deleted_at: null }, false, {
      rpcResponses: {
        edit_approved_billing_scope_item: {
          data: {
            error_code: errorCode,
            scope_id: null,
            item_id: null,
            accepted_subtotal: null,
            accepted_vat_amount: null,
            accepted_grand_total: null,
            line_safety_status: null,
            updated: false,
          },
          error: null,
        },
      },
    });

    const response = await editApprovedBillingScopeItem({
      scopeId: SCOPE_ID,
      itemId: ITEM_ID,
      decision: "adjusted",
      acceptedQty: 101,
      reasonCode: "customer_reduced_quantity",
    });

    assert.deepEqual(response, { success: false, error: errorCode });
    assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:update"]);
    assertNoScopeItemInserts(scenario);
  });
}

test("editApprovedBillingScopeItem rejects a missing required reason before the RPC", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null });

  const response = await editApprovedBillingScopeItem({
    scopeId: SCOPE_ID,
    itemId: ITEM_ID,
    decision: "excluded",
  });

  assert.deepEqual(response, { success: false, error: "scope_unexpected_error" });
  assert.deepEqual(scenario.rpcCalls, []);
  assertNoScopeItemInserts(scenario);
});

test("editApprovedBillingScopeItem keeps a nearby unknown RPC code on the safe fallback path", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, false, {
    rpcResponses: {
      edit_approved_billing_scope_item: {
        data: {
          error_code: "scope_not_active_typo",
          scope_id: null,
          item_id: null,
          accepted_subtotal: null,
          accepted_vat_amount: null,
          accepted_grand_total: null,
          line_safety_status: null,
          updated: false,
        },
        error: null,
      },
    },
  });

  const response = await editApprovedBillingScopeItem({
    scopeId: SCOPE_ID,
    itemId: ITEM_ID,
    decision: "adjusted",
    acceptedQty: 101,
    reasonCode: "customer_reduced_quantity",
  });

  assert.deepEqual(response, { success: false, error: "scope_unexpected_error" });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:update"]);
  assertNoScopeItemInserts(scenario);
});

test("editApprovedBillingScopeItem checks authorization before creating its write client", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, true);

  const response = await editApprovedBillingScopeItem({
    scopeId: SCOPE_ID,
    itemId: ITEM_ID,
    decision: "accepted",
  });

  assert.deepEqual(response, { success: false, error: "scope_permission_denied" });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:update"]);
  assert.equal(scenario.clientCalls, 0);
  assert.deepEqual(scenario.rpcCalls, []);
  assertNoScopeItemInserts(scenario);
});

test("discardApprovedBillingScopeDraft returns its server-confirmed identifiers on success", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, false, {
    rpcResponses: {
      discard_approved_billing_scope_draft: {
        data: {
          error_code: null,
          scope_id: SCOPE_ID,
          service_id: SOURCE_SERVICE_ID,
          source_quotation_id: SOURCE_QUOTATION_ID,
          discarded: true,
        },
        error: null,
      },
    },
  });

  const response = await discardApprovedBillingScopeDraft({ scopeId: SCOPE_ID });

  assert.deepEqual(response, {
    success: true,
    data: {
      scopeId: SCOPE_ID,
      serviceId: SOURCE_SERVICE_ID,
      sourceQuotationId: SOURCE_QUOTATION_ID,
      discarded: true,
    },
  });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:discard"]);
  assert.deepEqual(scenario.rpcCalls, [{
    name: "discard_approved_billing_scope_draft",
    args: { p_scope_id: SCOPE_ID },
  }]);
  assertNoScopeItemInserts(scenario);
});

for (const errorCode of ["scope_not_found", "scope_not_draft"] as const) {
  test(`discardApprovedBillingScopeDraft returns ${errorCode}`, async () => {
    const scenario = startScenario({ status: "Approved", deleted_at: null }, false, {
      rpcResponses: {
        discard_approved_billing_scope_draft: {
          data: {
            error_code: errorCode,
            scope_id: null,
            service_id: null,
            source_quotation_id: null,
            discarded: false,
          },
          error: null,
        },
      },
    });

    const response = await discardApprovedBillingScopeDraft({ scopeId: SCOPE_ID });
    assert.deepEqual(response, { success: false, error: errorCode });
    assertNoScopeItemInserts(scenario);
  });
}

test("discardApprovedBillingScopeDraft checks authorization before creating its write client", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, true);

  const response = await discardApprovedBillingScopeDraft({ scopeId: SCOPE_ID });

  assert.deepEqual(response, { success: false, error: "scope_permission_denied" });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:discard"]);
  assert.equal(scenario.clientCalls, 0);
  assert.deepEqual(scenario.rpcCalls, []);
  assertNoScopeItemInserts(scenario);
});

test("reviewApprovedBillingScopeLineSafety marks consistent draft items safe and reads back the scope", async () => {
  const detail = { id: SCOPE_ID, lineSafetyStatus: "safe" };
  const scenario = startScenario({ status: "Approved", deleted_at: null }, false, {
    readBackDetail: detail,
  });

  const response = await reviewApprovedBillingScopeLineSafety({
    scopeId: SCOPE_ID,
    lineSafetyStatus: "safe",
  });

  assert.deepEqual(response, { success: true, data: detail });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:review"]);
  assert.equal(scenario.updates.length, 1);
  assert.equal(scenario.updates[0]?.table, "approved_billing_scopes");
  assert.equal(scenario.updates[0]?.values.line_safety_status, "safe");
  assert.equal(scenario.updates[0]?.values.line_safety_reason_code, null);
  assert.equal(scenario.updates[0]?.values.line_safety_note, null);
});

test("reviewApprovedBillingScopeLineSafety records an unsafe review with its allowed fields only", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, false, {
    readBackDetail: { id: SCOPE_ID, lineSafetyStatus: "unsafe" },
  });

  const response = await reviewApprovedBillingScopeLineSafety({
    scopeId: SCOPE_ID,
    lineSafetyStatus: "unsafe",
    reasonCode: "unsafe_line_item",
    reviewerNote: "Item decision needs correction",
  });

  assert.equal(response.success, true);
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:review"]);
  assert.deepEqual(
    {
      line_safety_status: scenario.updates[0]?.values.line_safety_status,
      line_safety_reason_code: scenario.updates[0]?.values.line_safety_reason_code,
      line_safety_note: scenario.updates[0]?.values.line_safety_note,
    },
    {
      line_safety_status: "unsafe",
      line_safety_reason_code: "unsafe_line_item",
      line_safety_note: "Item decision needs correction",
    },
  );
});

for (const [label, input] of [
  ["reason", { scopeId: SCOPE_ID, lineSafetyStatus: "unsafe", reviewerNote: "Needs correction" }],
  ["note", { scopeId: SCOPE_ID, lineSafetyStatus: "unsafe", reasonCode: "unsafe_line_item" }],
] as const) {
  test(`reviewApprovedBillingScopeLineSafety rejects an unsafe review without a ${label}`, async () => {
    const scenario = startScenario({ status: "Approved", deleted_at: null });

    const response = await reviewApprovedBillingScopeLineSafety(input);

    assert.deepEqual(response, { success: false, error: "scope_unexpected_error" });
    assert.deepEqual(scenario.updates, []);
  });
}

test("reviewApprovedBillingScopeLineSafety rejects inconsistent safe decisions before updating", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, false, {
    items: [acceptedItem({ accepted_grand_total: 110 })],
  });

  const response = await reviewApprovedBillingScopeLineSafety({
    scopeId: SCOPE_ID,
    lineSafetyStatus: "safe",
  });

  assert.deepEqual(response, { success: false, error: "scope_reduction_invalid" });
  assert.deepEqual(scenario.updates, []);
});

test("reviewApprovedBillingScopeLineSafety rejects missing draft items before updating", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, false, { items: [] });

  const response = await reviewApprovedBillingScopeLineSafety({
    scopeId: SCOPE_ID,
    lineSafetyStatus: "safe",
  });

  assert.deepEqual(response, { success: false, error: "scope_no_items" });
  assert.deepEqual(scenario.updates, []);
});

for (const [label, scope, errorCode] of [
  ["a missing scope", null, "scope_not_found"],
  ["a non-draft scope", draftScope({ status: "approved" }), "scope_not_draft"],
] as const) {
  test(`reviewApprovedBillingScopeLineSafety rejects ${label} before updating`, async () => {
    const scenario = startScenario({ status: "Approved", deleted_at: null }, false, { scope });

    const response = await reviewApprovedBillingScopeLineSafety({
      scopeId: SCOPE_ID,
      lineSafetyStatus: "safe",
    });

    assert.deepEqual(response, { success: false, error: errorCode });
    assert.deepEqual(scenario.updates, []);
  });
}

test("reviewApprovedBillingScopeLineSafety checks permission before creating its write client", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, true);

  const response = await reviewApprovedBillingScopeLineSafety({
    scopeId: SCOPE_ID,
    lineSafetyStatus: "safe",
  });

  assert.deepEqual(response, { success: false, error: "scope_permission_denied" });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:review"]);
  assert.equal(scenario.clientCalls, 0);
  assert.deepEqual(scenario.operations, []);
  assert.deepEqual(scenario.updates, []);
});

function approvedRpcRow(overrides: Record<string, unknown> = {}) {
  return {
    error_code: null,
    scope_id: SCOPE_ID,
    service_id: SOURCE_SERVICE_ID,
    scope_version: 1,
    approved_at: "2026-07-14T00:00:00.000Z",
    approved: true,
    ...overrides,
  };
}

function approvalScenario(
  data: unknown = [approvedRpcRow()],
  error: { message: string } | null = null,
) {
  return startScenario({ status: "Approved", deleted_at: null }, false, {
    rpcResponses: {
      approve_approved_billing_scope: { data, error },
    },
  });
}

function assertNoApprovalTableMutation(scenario: ActionScenario) {
  assert.equal(scenario.updates.length, 0);
  assert.deepEqual(scenario.insertTables, []);
  assert.deepEqual(scenario.operations, []);
}

test("approveApprovedBillingScope validates before privileged execution", async () => {
  const scenario = approvalScenario();

  const response = await approveApprovedBillingScope({ scopeId: "not-a-uuid" });

  assert.deepEqual(response, { success: false, error: "scope_unexpected_error" });
  assert.deepEqual(scenario.permissionCalls, []);
  assert.equal(scenario.clientCalls, 0);
  assert.deepEqual(scenario.rpcCalls, []);
  assertNoApprovalTableMutation(scenario);
});

test("approveApprovedBillingScope checks permission before creating its write client", async () => {
  const scenario = startScenario({ status: "Approved", deleted_at: null }, true);

  const response = await approveApprovedBillingScope({ scopeId: SCOPE_ID });

  assert.deepEqual(response, { success: false, error: "scope_permission_denied" });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:approve"]);
  assert.equal(scenario.clientCalls, 0);
  assert.deepEqual(scenario.rpcCalls, []);
  assertNoApprovalTableMutation(scenario);
});

test("approveApprovedBillingScope invokes the ordinary approval RPC with trusted actor context", async () => {
  const scenario = approvalScenario();

  const response = await approveApprovedBillingScope({ scopeId: SCOPE_ID });

  assert.deepEqual(response, { success: true });
  assert.deepEqual(scenario.permissionCalls, ["approvedBillingScopes:approve"]);
  assert.equal(scenario.clientCalls, 1);
  assert.deepEqual(scenario.rpcCalls, [{
    name: "approve_approved_billing_scope",
    args: {
      p_scope_id: SCOPE_ID,
      p_actor_id: "test-user",
      p_actor_role: "manager",
    },
  }]);
  assertNoApprovalTableMutation(scenario);
});

test("approveApprovedBillingScope rejects browser-supplied approval authority fields", async () => {
  const scenario = approvalScenario();

  const response = await approveApprovedBillingScope({
    scopeId: SCOPE_ID,
    actorId: "browser-user",
    actorRole: "admin",
    serviceId: "browser-service",
    acceptedGrandTotal: 1,
  });

  assert.deepEqual(response, { success: false, error: "scope_unexpected_error" });
  assert.deepEqual(scenario.permissionCalls, []);
  assert.equal(scenario.clientCalls, 0);
  assert.deepEqual(scenario.rpcCalls, []);
  assertNoApprovalTableMutation(scenario);
});

for (const errorCode of [
  "scope_not_found",
  "scope_not_active",
  "scope_not_draft",
  "scope_not_safe",
  "scope_no_items",
  "scope_no_billable_items",
  "scope_reduction_invalid",
  "scope_reason_required",
  "scope_active_conflict",
  "scope_service_lifecycle_ineligible",
  "scope_concurrency_conflict",
  "scope_unexpected_error",
] as const) {
  test(`approveApprovedBillingScope preserves RPC error ${errorCode}`, async () => {
    const scenario = approvalScenario([approvedRpcRow({ error_code: errorCode })]);

    const response = await approveApprovedBillingScope({ scopeId: SCOPE_ID });

    assert.deepEqual(response, { success: false, error: errorCode });
    assert.equal(scenario.rpcCalls.length, 1);
    assertNoApprovalTableMutation(scenario);
  });
}

for (const [label, data, error] of [
  ["a transport error", null, { message: "RPC transport failed" }],
  ["null data", null, null],
  ["an empty result", [], null],
  ["multiple result rows", [approvedRpcRow(), approvedRpcRow()], null],
  ["an unknown business error", [approvedRpcRow({ error_code: "scope_not_active_typo" })], null],
  ["a malformed scope version", [approvedRpcRow({ scope_version: "1" })], null],
  ["approved false", [approvedRpcRow({ approved: false })], null],
  ["a missing approval timestamp", [approvedRpcRow({ approved_at: null })], null],
  ["a mismatched scope id", [approvedRpcRow({ scope_id: ITEM_ID })], null],
] as const) {
  test(`approveApprovedBillingScope rejects ${label}`, async () => {
    const scenario = approvalScenario(data, error);

    const response = await approveApprovedBillingScope({ scopeId: SCOPE_ID });

    assert.deepEqual(response, { success: false, error: "scope_unexpected_error" });
    assert.equal(scenario.rpcCalls.length, 1);
    assertNoApprovalTableMutation(scenario);
  });
}
