import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

const SOURCE_QUOTATION_ID = "11111111-1111-4111-8111-111111111111";
const SOURCE_SERVICE_ID = "22222222-2222-4222-8222-222222222222";

type ServiceRow = {
  status: string;
  deleted_at: string | null;
};

type ActionScenario = {
  service: ServiceRow | null;
  denyPermission?: boolean;
  clientCalls: number;
  insertTables: string[];
  operations: string[];
  permissionCalls: string[];
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

function sourceQuotation() {
  return {
    id: SOURCE_QUOTATION_ID,
    service_id: SOURCE_SERVICE_ID,
    status: "approved",
    is_deleted: false,
  };
}

function createFakeSupabase() {
  return {
    from(table: string) {
      const scenario = currentScenario();
      scenario.operations.push(`from:${table}`);

      const query = {
        select(columns: string) {
          scenario.operations.push(`select:${table}:${columns}`);
          return query;
        },
        eq(column: string, value: string) {
          scenario.operations.push(`eq:${table}:${column}:${value}`);
          return query;
        },
        async maybeSingle() {
          if (table === "quotations") {
            return { data: sourceQuotation(), error: null };
          }

          if (table === "services") {
            return { data: scenario.service, error: null };
          }

          throw new Error(`Unexpected lookup table: ${table}`);
        },
        insert() {
          scenario.insertTables.push(table);
          throw new Error(`Unexpected insert into ${table}`);
        },
      };

      return query;
    },
  };
}

function startScenario(service: ServiceRow | null, denyPermission = false) {
  activeScenario = {
    service,
    denyPermission,
    clientCalls: 0,
    insertTables: [],
    operations: [],
    permissionCalls: [],
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

      return { clerk_user_id: "test-user" };
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
    getActiveApprovedBillingScopeForService: async () => null,
    getApprovedBillingScopeById: async () => null,
  },
});

const { createApprovedBillingScopeDraft } = await import("./actions.ts");

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
