import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ResolveHook = (
  specifier: string,
  context: ResolveContext,
  nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
) => ResolveResult;

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
      };
    }

    if (
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.startsWith(sourceRootUrl)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});

const QUOTATION_ID = "00000000-0000-4000-8000-000000000001";
const SERVICE_ID = "00000000-0000-4000-8000-000000000002";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000003";
const INSERTED_INVOICE_ID = "00000000-0000-4000-8000-000000000004";
const INVOICE_NUMBER = "INV-2026-0001";

class TestUnauthorizedError extends Error {}
class TestForbiddenError extends Error {}

type InsertError = { message: string; code?: string } | null;
type AuthorityResult =
  | { status: "active"; scope: { id: string; acceptedGrandTotal: number }; historyCount: number }
  | { status: "historical_only"; historyCount: number }
  | { status: "zero_history"; historyCount: 0 }
  | { status: "unavailable"; reason: string };

const ACTIVE_SCOPE_ID = "00000000-0000-4000-8000-000000000005";
const ACTIVE_SCOPE = { id: ACTIVE_SCOPE_ID, acceptedGrandTotal: 500 };

type PriorDepositRow = {
  id: string;
  invoice_number: string;
  invoice_type: "deposit";
  grand_total: unknown;
  status: string;
};

type ExposureRow = {
  id: string;
  grand_total: unknown;
  is_deleted?: boolean | null;
};

type ActionScenario = {
  role: unknown;
  denyPermission: boolean;
  clientCalls: number;
  databaseCalls: number;
  serviceReads: number;
  serviceQueryResult: unknown;
  duplicateDepositReads: number;
  duplicateFinalReads: number;
  insertAttempts: number;
  insertedPayloads: Array<Record<string, unknown>>;
  invoiceNumberCalls: number;
  exposureReads: number;
  exposureQueryResult: unknown;
  priorDepositReads: number;
  priorDepositQueryResult: unknown;
  snapshotCalls: number;
  snapshotScopeIds: Array<string | null>;
  snapshotInvoiceAmounts: Array<number | null>;
  snapshotInvoiceTypes: Array<string | null>;
  snapshotPayloads: Array<Record<string, unknown>>;
  authorityCalls: number;
  authority: AuthorityResult;
  operations: string[];
  insertError: InsertError;
  insertedInvoice: { id: string; invoice_number: string } | null;
};

let activeScenario: ActionScenario | null = null;

function currentScenario(): ActionScenario {
  if (!activeScenario) {
    throw new Error("Test scenario not initialized");
  }

  return activeScenario;
}

function createFakeSupabase() {
  return {
    from(table: string) {
      const scenario = currentScenario();
      scenario.databaseCalls += 1;
      scenario.operations.push(`from:${table}`);

      let selectedColumns = "";
      let isInsert = false;
      let invoiceTypeFilter: unknown = null;
      const query: Record<string, unknown> = {
        select(columns: string) {
          selectedColumns = columns;
          return query;
        },
        eq(column: string, value: unknown) {
          if (table === "invoices" && column === "invoice_type") {
            invoiceTypeFilter = value;
          }
          if (table === "invoices" && selectedColumns === "id, grand_total") {
            scenario.operations.push(`exposure:eq:${column}:${String(value)}`);
          }
          return query;
        },
        not(column: string, operator: string, value: unknown) {
          if (table === "invoices" && selectedColumns === "id, grand_total") {
            scenario.operations.push(
              `exposure:not:${column}:${operator}:${String(value)}`,
            );
          }
          return query;
        },
        is(column: string, value: unknown) {
          if (table === "invoices" && selectedColumns === "id, grand_total") {
            scenario.operations.push(`exposure:is:${column}:${String(value)}`);
          }
          return query;
        },
        insert(payload: Record<string, unknown>) {
          scenario.insertAttempts += 1;
          scenario.insertedPayloads.push(payload);
          isInsert = true;
          return query;
        },
        async maybeSingle() {
          if (table === "services") {
            scenario.serviceReads += 1;
            return scenario.serviceQueryResult;
          }

          if (table === "company_settings") {
            return { data: { vat_mode: "not_registered" }, error: null };
          }

          if (table === "invoices" && selectedColumns === "id") {
            if (invoiceTypeFilter === "deposit") {
              scenario.duplicateDepositReads += 1;
            }
            if (invoiceTypeFilter === "final") {
              scenario.duplicateFinalReads += 1;
            }
            return { data: null, error: null };
          }

          throw new Error(`Unexpected maybeSingle query for ${table}`);
        },
        async single() {
          if (table === "quotations") {
            return {
              data: {
                status: "approved",
                service_id: SERVICE_ID,
                customer_id: CUSTOMER_ID,
              },
              error: null,
            };
          }

          if (table === "invoices" && isInsert) {
            return {
              data: scenario.insertedInvoice,
              error: scenario.insertError,
            };
          }

          throw new Error(`Unexpected single query for ${table}`);
        },
        // Multi-row await (prior deposits list, etc.)
        then(
          onFulfilled?: (value: unknown) => unknown,
          onRejected?: (reason: unknown) => unknown,
        ) {
          if (table === "invoices" && !isInsert) {
            const isExposureRead = selectedColumns === "id, grand_total";
            if (isExposureRead) {
              scenario.exposureReads += 1;
            } else {
              scenario.priorDepositReads += 1;
            }
            const result = isExposureRead
              ? scenario.exposureQueryResult
              : scenario.priorDepositQueryResult;
            return Promise.resolve(result).then(
              onFulfilled,
              onRejected,
            );
          } else {
            return Promise.reject(
              new Error(`Unexpected multi-row await for ${table}`),
            ).then(onFulfilled, onRejected);
          }
        },
      };

      return query;
    },
    rpc(name: string) {
      if (name !== "generate_document_number") {
        throw new Error(`Unexpected RPC: ${name}`);
      }

      const scenario = currentScenario();
      scenario.invoiceNumberCalls += 1;
      scenario.operations.push(`rpc:${name}`);
      return { data: INVOICE_NUMBER, error: null };
    },
  };
}

function priorDepositQueryResponse(payload: unknown) {
  return { data: payload, error: null };
}

function exposureQueryResponse(payload: unknown) {
  return { data: payload, error: null };
}

function serviceQueryResponse(
  status: unknown,
  overrides: Record<string, unknown> = {},
) {
  return {
    data: {
      id: SERVICE_ID,
      status,
      deleted_at: null,
      ...overrides,
    },
    error: null,
  };
}

function startScenario(
  options: Partial<
    Pick<
      ActionScenario,
      | "denyPermission"
      | "role"
      | "insertError"
      | "insertedInvoice"
      | "authority"
      | "exposureQueryResult"
      | "priorDepositQueryResult"
      | "serviceQueryResult"
    >
  > = {}
) {
  const hasPriorDepositQueryResult = Object.prototype.hasOwnProperty.call(
    options,
    "priorDepositQueryResult",
  );
  const hasExposureQueryResult = Object.prototype.hasOwnProperty.call(
    options,
    "exposureQueryResult",
  );
  const hasServiceQueryResult = Object.prototype.hasOwnProperty.call(
    options,
    "serviceQueryResult",
  );

  activeScenario = {
    role: Object.prototype.hasOwnProperty.call(options, "role")
      ? options.role
      : "manager",
    denyPermission: options.denyPermission ?? false,
    clientCalls: 0,
    databaseCalls: 0,
    serviceReads: 0,
    serviceQueryResult: hasServiceQueryResult
      ? options.serviceQueryResult
      : serviceQueryResponse("Approved"),
    duplicateDepositReads: 0,
    duplicateFinalReads: 0,
    insertAttempts: 0,
    insertedPayloads: [],
    invoiceNumberCalls: 0,
    exposureReads: 0,
    exposureQueryResult: hasExposureQueryResult
      ? options.exposureQueryResult
      : exposureQueryResponse([]),
    priorDepositReads: 0,
    priorDepositQueryResult: hasPriorDepositQueryResult
      ? options.priorDepositQueryResult
      : priorDepositQueryResponse([]),
    snapshotCalls: 0,
    snapshotScopeIds: [],
    snapshotInvoiceAmounts: [],
    snapshotInvoiceTypes: [],
    snapshotPayloads: [],
    authorityCalls: 0,
    authority: options.authority ?? { status: "zero_history", historyCount: 0 },
    operations: [],
    insertError: options.insertError ?? null,
    insertedInvoice: options.insertedInvoice ?? {
      id: INSERTED_INVOICE_ID,
      invoice_number: INVOICE_NUMBER,
    },
  };

  return activeScenario;
}

function validInput() {
  return {
    quotationId: QUOTATION_ID,
    serviceId: SERVICE_ID,
    invoiceType: "deposit" as const,
    requestedAmount: 100,
  };
}

function validFinalInput() {
  return {
    quotationId: QUOTATION_ID,
    serviceId: SERVICE_ID,
    invoiceType: "final" as const,
  };
}

function priorDeposit(grandTotal: unknown, index = 0): PriorDepositRow {
  return {
    id: `prior-deposit-${index}`,
    invoice_number: `INV-2026-${String(index + 1).padStart(4, "0")}`,
    invoice_type: "deposit",
    grand_total: grandTotal,
    status: "draft",
  };
}

function exposureInvoice(
  grandTotal: unknown,
  index = 0,
  isDeleted?: boolean | null,
): ExposureRow {
  return {
    id: `existing-invoice-${index}`,
    grand_total: grandTotal,
    is_deleted: isDeleted,
  };
}

function finalSettlement(
  scenario: ActionScenario,
): Record<string, unknown> {
  const snapshotQuotation = scenario.snapshotPayloads[0]?.snapshot_quotation;
  assert.ok(snapshotQuotation && typeof snapshotQuotation === "object");

  const settlement = (snapshotQuotation as Record<string, unknown>)
    .final_invoice_settlement;
  assert.ok(settlement && typeof settlement === "object");
  return settlement as Record<string, unknown>;
}

function assertPriorDepositLookupFailed(
  scenario: ActionScenario,
  result: unknown,
) {
  assert.deepEqual(result, {
    success: false,
    error: "prior_invoice_lookup_failed",
  });
  assert.equal(scenario.priorDepositReads, 1);
  assert.equal(scenario.snapshotCalls, 0);
  assert.deepEqual(scenario.snapshotPayloads, []);
  assert.equal(scenario.invoiceNumberCalls, 0);
  assert.equal(scenario.insertAttempts, 0);
  assert.deepEqual(scenario.insertedPayloads, []);
}

function assertDepositExposureFailed(
  scenario: ActionScenario,
  result: unknown,
  error: "deposit_amount_exceeds_remaining" | "invoice_exposure_unavailable",
) {
  assert.deepEqual(result, { success: false, error });
  assert.equal(scenario.authorityCalls, 1);
  assert.equal(scenario.exposureReads, 1);
  assert.equal(scenario.priorDepositReads, 0);
  assert.equal(scenario.snapshotCalls, 0);
  assert.deepEqual(scenario.snapshotPayloads, []);
  assert.equal(scenario.invoiceNumberCalls, 0);
  assert.equal(scenario.insertAttempts, 0);
  assert.deepEqual(scenario.insertedPayloads, []);
}

function assertNullableSoftDeleteExposurePredicate(
  scenario: ActionScenario,
) {
  assert.deepEqual(
    scenario.operations.filter((operation) => operation.startsWith("exposure:")),
    [
      `exposure:eq:service_id:${SERVICE_ID}`,
      "exposure:not:is_deleted:is:true",
      "exposure:is:voided_at:null",
      'exposure:not:status:in:("voided","cancelled")',
    ],
  );
}

function assertLifecycleDenied(
  scenario: ActionScenario,
  result: unknown,
  error:
    | "service_lifecycle_unavailable"
    | "service_not_eligible_for_deposit"
    | "service_not_eligible_for_final",
) {
  assert.deepEqual(result, { success: false, error });
  assert.equal(scenario.serviceReads, 1);
  assert.equal(scenario.authorityCalls, 0);
  assert.equal(scenario.exposureReads, 0);
  assert.equal(scenario.priorDepositReads, 0);
  assert.equal(scenario.duplicateDepositReads, 0);
  assert.equal(scenario.duplicateFinalReads, 0);
  assert.equal(scenario.snapshotCalls, 0);
  assert.deepEqual(scenario.snapshotPayloads, []);
  assert.equal(scenario.invoiceNumberCalls, 0);
  assert.equal(scenario.insertAttempts, 0);
  assert.deepEqual(scenario.insertedPayloads, []);
}

mock.module("@/lib/auth/errors", {
  namedExports: {
    UnauthorizedError: TestUnauthorizedError,
    ForbiddenError: TestForbiddenError,
  },
});
const { INVOICE_PERMISSIONS, hasPermissionForRole } = await import(
  "../auth/role-permissions.ts"
);
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      const scenario = currentScenario();
      scenario.operations.push("permission");

      if (
        scenario.denyPermission ||
        !hasPermissionForRole(scenario.role, permission)
      ) {
        throw new TestForbiddenError("Denied by test scenario");
      }

      return { clerk_user_id: "test-user", role: scenario.role };
    },
  },
});
mock.module("@/lib/security/rate-limit", {
  namedExports: {
    consumeRateLimit: () => {
      currentScenario().operations.push("rate-limit");
      return true;
    },
  },
});
mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => {
      const scenario = currentScenario();
      scenario.clientCalls += 1;
      scenario.operations.push("admin-client");
      return createFakeSupabase();
    },
  },
});
mock.module("@/lib/quotations/mappers", {
  namedExports: {
    mapRowToQuotationDetail: () => ({ grandTotal: 100 }),
  },
});
mock.module("./snapshots.ts", {
  namedExports: {
    buildInvoiceSnapshotData: (
      _settings: unknown,
      _quotation: unknown,
      activeScope: { id?: string } | null,
      invoiceAmount?: number,
      invoiceType?: string,
    ) => {
      const scenario = currentScenario();
      scenario.snapshotCalls += 1;
      scenario.snapshotScopeIds.push(activeScope?.id ?? null);
      scenario.snapshotInvoiceAmounts.push(invoiceAmount ?? null);
      scenario.snapshotInvoiceTypes.push(invoiceType ?? null);
      const snapshotPayload = {
        snapshot_seller: { source: "test" },
        snapshot_buyer: { source: "test" },
        snapshot_quotation: { source: "test" },
        snapshot_bank_details: { source: "test" },
        snapshot_document_rules: { source: "test" },
        vat_mode: "not_registered",
        vat_rate: 0,
        document_label: "Commercial Invoice",
      };
      scenario.snapshotPayloads.push(snapshotPayload);
      return snapshotPayload;
    },
  },
});
mock.module("../approved-billing-scopes/queries.ts", {
  namedExports: {
    resolveInvoiceBillingAuthorityForService: async () => {
      const scenario = currentScenario();
      scenario.authorityCalls += 1;
      return scenario.authority;
    },
  },
});

const { createInvoiceAction, issueInvoiceAction } = await import("./actions.ts");

for (const role of ["admin", "manager"] as const) {
  test(`createInvoiceAction permits ${role} through the Invoice mutation boundary`, async () => {
    const scenario = startScenario({ role });

    const result = await createInvoiceAction(validInput());

    assert.equal(result.success, true);
    assert.equal(scenario.authorityCalls, 1);
    assert.equal(scenario.snapshotCalls, 1);
    assert.equal(scenario.invoiceNumberCalls, 1);
    assert.equal(scenario.insertAttempts, 1);
    assert.equal(
      hasPermissionForRole(role, INVOICE_PERMISSIONS.write),
      true,
    );
  });

  test(`issueInvoiceAction permits ${role} past authorization`, async () => {
    const scenario = startScenario({ role });

    const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

    assert.notDeepEqual(result, { success: false, error: "Forbidden" });
    assert.ok(scenario.operations.indexOf("permission") < scenario.operations.indexOf("admin-client"));
    assert.equal(scenario.clientCalls, 1);
  });
}

for (const [label, role] of [
  ["Accountant", "accountant"],
  ["unknown role", "unknown"],
  ["missing role", null],
] as const) {
  test(`createInvoiceAction denies ${label} before all privileged work`, async () => {
    const scenario = startScenario({ role });

    const result = await createInvoiceAction(validInput());

    assert.deepEqual(result, { success: false, error: "Forbidden" });
    assert.deepEqual(scenario.operations, ["permission"]);
    assert.equal(scenario.clientCalls, 0);
    assert.equal(scenario.databaseCalls, 0);
    assert.equal(scenario.authorityCalls, 0);
    assert.equal(scenario.exposureReads, 0);
    assert.equal(scenario.snapshotCalls, 0);
    assert.equal(scenario.invoiceNumberCalls, 0);
    assert.equal(scenario.insertAttempts, 0);
  });

  test(`issueInvoiceAction denies ${label} before privileged work`, async () => {
    const scenario = startScenario({ role });

    const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

    assert.deepEqual(result, { success: false, error: "Forbidden" });
    assert.deepEqual(scenario.operations, ["permission"]);
    assert.equal(scenario.clientCalls, 0);
    assert.equal(scenario.databaseCalls, 0);
  });
}

test("createInvoiceAction rejects forbidden users before creating a privileged client", async () => {
  const scenario = startScenario({ denyPermission: true });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, { success: false, error: "Forbidden" });
  assert.deepEqual(scenario.operations, ["permission"]);
  assert.equal(scenario.clientCalls, 0);
  assert.equal(scenario.databaseCalls, 0);
  assert.equal(scenario.exposureReads, 0);
  assert.equal(scenario.insertAttempts, 0);
});

for (const status of ["Inquiry", "Quoted", "Approved"] as const) {
  test(`createInvoiceAction permits a Deposit in ${status} past the lifecycle boundary`, async () => {
    const scenario = startScenario({
      serviceQueryResult: serviceQueryResponse(status),
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    });

    const result = await createInvoiceAction(validInput());

    assert.equal(result.success, true);
    assert.equal(scenario.serviceReads, 1);
    assert.equal(scenario.authorityCalls, 1);
    assert.equal(scenario.exposureReads, 1);
    assert.equal(scenario.duplicateDepositReads, 1);
    assert.equal(scenario.insertAttempts, 1);
  });
}

for (const status of [
  "Deposit Paid",
  "In Progress",
  "Completed",
  "Cancelled",
] as const) {
  test(`createInvoiceAction denies a Deposit in ${status} before financial work`, async () => {
    const scenario = startScenario({
      serviceQueryResult: serviceQueryResponse(status),
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      exposureQueryResult: exposureQueryResponse([]),
    });

    const result = await createInvoiceAction(validInput());

    assertLifecycleDenied(
      scenario,
      result,
      "service_not_eligible_for_deposit",
    );
  });
}

for (const status of [
  "Inquiry",
  "Quoted",
  "Approved",
  "Deposit Paid",
  "In Progress",
] as const) {
  test(`createInvoiceAction permits a direct Final in ${status} past the lifecycle boundary`, async () => {
    const scenario = startScenario({
      serviceQueryResult: serviceQueryResponse(status),
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      priorDepositQueryResult: priorDepositQueryResponse([]),
    });

    const result = await createInvoiceAction(validFinalInput());

    assert.equal(result.success, true);
    assert.equal(scenario.serviceReads, 1);
    assert.equal(scenario.authorityCalls, 1);
    assert.equal(scenario.priorDepositReads, 1);
    assert.equal(scenario.duplicateFinalReads, 1);
    assert.equal(scenario.insertAttempts, 1);
  });
}

for (const status of ["Completed", "Cancelled"] as const) {
  test(`createInvoiceAction denies a Final in ${status} before prior-Deposit work`, async () => {
    const scenario = startScenario({
      serviceQueryResult: serviceQueryResponse(status),
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      priorDepositQueryResult: priorDepositQueryResponse([priorDeposit(100)]),
    });

    const result = await createInvoiceAction(validFinalInput());

    assertLifecycleDenied(
      scenario,
      result,
      "service_not_eligible_for_final",
    );
  });
}

const serviceRowMissingId = {
  status: "Approved",
  deleted_at: null,
};

for (const [name, serviceQueryResult] of [
  ["a Service query error", { data: null, error: { message: "query failed" } }],
  ["a missing Service row", { data: null, error: null }],
  ["undefined Service data", { data: undefined, error: null }],
  ["a malformed query result", {}],
  ["a null query result", null],
  ["an undefined query result", undefined],
  ["a Service row missing id", { data: serviceRowMissingId, error: null }],
  [
    "a mismatched Service id",
    serviceQueryResponse("Approved", { id: "00000000-0000-4000-8000-999999999999" }),
  ],
  [
    "a deleted Service",
    serviceQueryResponse("Approved", { deleted_at: "2026-07-16T00:00:00.000Z" }),
  ],
  ["a null Service status", serviceQueryResponse(null)],
  ["an undefined Service status", serviceQueryResponse(undefined)],
  ["a blank Service status", serviceQueryResponse("")],
  ["a whitespace-only Service status", serviceQueryResponse("   ")],
  ["an unknown Service status", serviceQueryResponse("Archived")],
  ["a numeric Service status", serviceQueryResponse(1)],
  ["an object Service status", serviceQueryResponse({})],
  ["an Array Service status", serviceQueryResponse([])],
  [
    "an Array-shaped Service row",
    { data: Object.assign([], { id: SERVICE_ID, status: "Approved", deleted_at: null }), error: null },
  ],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction fails closed for ${name}`, async () => {
    const scenario = startScenario({ serviceQueryResult });

    const result = await createInvoiceAction(validInput());

    assertLifecycleDenied(
      scenario,
      result,
      "service_lifecycle_unavailable",
    );
  });
}

test("createInvoiceAction uses active ABS authority and does not select quotation fallback", async () => {
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
  });

  const requestedAmount = 150;
  const result = await createInvoiceAction({
    ...validInput(),
    requestedAmount,
  });

  assert.equal(result.success, true);
  assert.equal(scenario.authorityCalls, 1);
  assert.deepEqual(scenario.snapshotScopeIds, [ACTIVE_SCOPE_ID]);
  assert.equal(scenario.insertedPayloads[0]?.grand_total, requestedAmount);
  assert.equal(
    scenario.insertedPayloads[0]?.approved_billing_scope_id,
    ACTIVE_SCOPE_ID,
  );
  assert.equal(scenario.insertAttempts, 1);
});

test("createInvoiceAction allows an active-ABS Deposit below remaining exposure", async () => {
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    exposureQueryResult: exposureQueryResponse([exposureInvoice(300)]),
  });

  const result = await createInvoiceAction({
    ...validInput(),
    requestedAmount: 150,
  });

  assert.equal(result.success, true);
  assert.equal(scenario.exposureReads, 1);
  assert.equal(scenario.insertAttempts, 1);
  assert.equal(scenario.insertedPayloads[0]?.grand_total, 150);
  assertNullableSoftDeleteExposurePredicate(scenario);
});

test("createInvoiceAction allows an active-ABS Deposit equal to nullable-row remaining exposure", async () => {
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    exposureQueryResult: exposureQueryResponse([
      exposureInvoice("300", 0, null),
    ]),
  });

  const result = await createInvoiceAction({
    ...validInput(),
    requestedAmount: 200,
  });

  assert.equal(result.success, true);
  assert.equal(scenario.exposureReads, 1);
  assert.equal(scenario.insertAttempts, 1);
  assert.equal(scenario.insertedPayloads[0]?.grand_total, 200);
  assertNullableSoftDeleteExposurePredicate(scenario);
});

test("createInvoiceAction rejects an active-ABS Deposit above nullable-row remaining exposure", async () => {
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    exposureQueryResult: exposureQueryResponse([
      exposureInvoice(300, 0, null),
    ]),
  });

  const result = await createInvoiceAction({
    ...validInput(),
    requestedAmount: 250,
  });

  assertDepositExposureFailed(
    scenario,
    result,
    "deposit_amount_exceeds_remaining",
  );
  assertNullableSoftDeleteExposurePredicate(scenario);
});

for (const [name, existingExposure] of [
  ["fully allocated", 500],
  ["already overexposed", 550],
] as const) {
  test(`createInvoiceAction rejects an active-ABS Deposit when the Service is ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      exposureQueryResult: exposureQueryResponse([
        exposureInvoice(existingExposure),
      ]),
    });

    const result = await createInvoiceAction({
      ...validInput(),
      requestedAmount: 1,
    });

    assertDepositExposureFailed(
      scenario,
      result,
      "deposit_amount_exceeds_remaining",
    );
  });
}

test("createInvoiceAction treats an explicit empty active-ABS exposure Array as authoritative zero", async () => {
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    exposureQueryResult: exposureQueryResponse([]),
  });

  const result = await createInvoiceAction({
    ...validInput(),
    requestedAmount: 150,
  });

  assert.equal(result.success, true);
  assert.equal(scenario.exposureReads, 1);
  assert.equal(scenario.insertedPayloads[0]?.grand_total, 150);
});

test("createInvoiceAction blocks historical-only ABS before fallback or insert", async () => {
  const scenario = startScenario({
    authority: { status: "historical_only", historyCount: 2 },
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, { success: false, error: "billing_scope_inactive" });
  assert.equal(scenario.authorityCalls, 1);
  assert.equal(scenario.exposureReads, 0);
  assert.equal(scenario.snapshotCalls, 0);
  assert.equal(scenario.insertAttempts, 0);
  assert.deepEqual(scenario.insertedPayloads, []);
});

test("createInvoiceAction preserves quotation fallback only for proven zero ABS history", async () => {
  const scenario = startScenario({
    authority: { status: "zero_history", historyCount: 0 },
  });

  const result = await createInvoiceAction(validInput());

  assert.equal(result.success, true);
  assert.equal(scenario.authorityCalls, 1);
  assert.deepEqual(scenario.snapshotScopeIds, [null]);
  assert.equal(
    scenario.insertedPayloads[0]?.approved_billing_scope_id,
    null,
  );
  assert.equal(scenario.insertAttempts, 1);
});

test("createInvoiceAction allows a legacy-Quotation Deposit equal to nullable-row remaining exposure", async () => {
  const scenario = startScenario({
    authority: { status: "zero_history", historyCount: 0 },
    exposureQueryResult: exposureQueryResponse([
      exposureInvoice(80, 0, null),
    ]),
  });

  const result = await createInvoiceAction({
    ...validInput(),
    requestedAmount: 20,
  });

  assert.equal(result.success, true);
  assert.equal(scenario.exposureReads, 1);
  assert.equal(scenario.insertedPayloads[0]?.grand_total, 20);
  assert.equal(scenario.insertedPayloads[0]?.approved_billing_scope_id, null);
  assertNullableSoftDeleteExposurePredicate(scenario);
});

test("createInvoiceAction rejects a legacy-Quotation Deposit above nullable-row remaining exposure", async () => {
  const scenario = startScenario({
    authority: { status: "zero_history", historyCount: 0 },
    exposureQueryResult: exposureQueryResponse([
      exposureInvoice(80, 0, null),
    ]),
  });

  const result = await createInvoiceAction({
    ...validInput(),
    requestedAmount: 25,
  });

  assertDepositExposureFailed(
    scenario,
    result,
    "deposit_amount_exceeds_remaining",
  );
  assertNullableSoftDeleteExposurePredicate(scenario);
});

test("createInvoiceAction does not query Payments or restore paid Invoice exposure", async () => {
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    exposureQueryResult: exposureQueryResponse([
      {
        ...exposureInvoice(300),
        status: "paid",
        payment_status: "confirmed",
      },
    ]),
  });

  const result = await createInvoiceAction({
    ...validInput(),
    requestedAmount: 250,
  });

  assertDepositExposureFailed(
    scenario,
    result,
    "deposit_amount_exceeds_remaining",
  );
  assert.equal(
    scenario.operations.some((operation) => operation === "from:payments"),
    false,
  );
});

for (const [name, malformedAmount] of [
  ["hexadecimal money", "0x10"],
  ["exponent money", "1e3"],
  ["signed positive money", "+5"],
  ["negative money", -1],
  ["non-finite money", Number.POSITIVE_INFINITY],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction fails closed for Deposit exposure with ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      exposureQueryResult: exposureQueryResponse([
        exposureInvoice(malformedAmount),
      ]),
    });

    const result = await createInvoiceAction(validInput());

    assertDepositExposureFailed(
      scenario,
      result,
      "invoice_exposure_unavailable",
    );
  });
}

test("createInvoiceAction fails closed when Deposit exposure accumulation overflows", async () => {
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    exposureQueryResult: exposureQueryResponse([
      exposureInvoice(Number.MAX_VALUE),
      exposureInvoice(Number.MAX_VALUE, 1),
    ]),
  });

  const result = await createInvoiceAction(validInput());

  assertDepositExposureFailed(
    scenario,
    result,
    "invoice_exposure_unavailable",
  );
});

for (const [name, malformedPayload] of [
  ["null data", null],
  ["undefined data", undefined],
  ["object data", {}],
  ["non-array string data", "not-an-array"],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction fails closed for Deposit exposure with ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      exposureQueryResult: exposureQueryResponse(malformedPayload),
    });

    const result = await createInvoiceAction(validInput());

    assertDepositExposureFailed(
      scenario,
      result,
      "invoice_exposure_unavailable",
    );
  });
}

for (const [name, malformedResult] of [
  ["query error", { data: [], error: { message: "query failed" } }],
  ["missing data", { error: null }],
  ["missing error", { data: [] }],
  ["null result", null],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction fails closed for Deposit exposure with ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      exposureQueryResult: malformedResult,
    });

    const result = await createInvoiceAction(validInput());

    assertDepositExposureFailed(
      scenario,
      result,
      "invoice_exposure_unavailable",
    );
  });
}

test("createInvoiceAction rejects an Array-shaped Deposit exposure query result", async () => {
  const deceptiveResult: unknown[] = [];
  Object.assign(deceptiveResult, { data: [], error: null });
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    exposureQueryResult: deceptiveResult,
  });

  const result = await createInvoiceAction(validInput());

  assertDepositExposureFailed(
    scenario,
    result,
    "invoice_exposure_unavailable",
  );
});

for (const [name, malformedRow] of [
  ["a null row", null],
  ["a row missing grand_total", { id: "missing-total" }],
  ["a row missing Invoice identity", { grand_total: 10 }],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction fails closed for Deposit exposure with ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      exposureQueryResult: exposureQueryResponse([malformedRow]),
    });

    const result = await createInvoiceAction(validInput());

    assertDepositExposureFailed(
      scenario,
      result,
      "invoice_exposure_unavailable",
    );
  });
}

test("createInvoiceAction rejects an Array-shaped Deposit exposure row", async () => {
  const deceptiveRow: unknown[] = [];
  Object.assign(deceptiveRow, exposureInvoice(10));
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    exposureQueryResult: exposureQueryResponse([deceptiveRow]),
  });

  const result = await createInvoiceAction(validInput());

  assertDepositExposureFailed(
    scenario,
    result,
    "invoice_exposure_unavailable",
  );
});

for (const [name, malformedAmount] of [
  ["hexadecimal string", "0x10"],
  ["binary string", "0b10"],
  ["exponent string", "1e3"],
  ["signed positive string", "+5"],
  ["null", null],
  ["negative number", -1],
  ["non-finite number", Number.POSITIVE_INFINITY],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction blocks a Final Invoice for malformed prior Deposit money: ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      priorDepositQueryResult: priorDepositQueryResponse([
        priorDeposit(100),
        priorDeposit(malformedAmount, 1),
      ]),
    });

    const result = await createInvoiceAction(validFinalInput());

    assertPriorDepositLookupFailed(scenario, result);
  });
}

for (const [name, malformedPayload] of [
  ["null data", null],
  ["undefined data", undefined],
  ["object data", {}],
  ["array-like object data", { 0: priorDeposit(100), length: 1 }],
  ["string data", "not-an-array"],
  ["numeric data", 0],
  ["boolean data", false],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction blocks a Final Invoice for ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      priorDepositQueryResult: priorDepositQueryResponse(malformedPayload),
    });

    const result = await createInvoiceAction(validFinalInput());

    assertPriorDepositLookupFailed(scenario, result);
  });
}

for (const [name, malformedQueryResult] of [
  ["a missing data property", { error: null }],
  ["a missing error property", { data: [] }],
  ["a null query result", null],
  ["an undefined query result", undefined],
  ["a primitive query result", "malformed-result"],
  ["a Date query result", new Date()],
  [
    "a function query result",
    Object.assign(() => undefined, { data: [], error: null }),
  ],
  ["an inherited-only query result", Object.create({ data: [], error: null })],
  [
    "a getter-backed query result",
    Object.defineProperties({}, {
      data: {
        get() {
          throw new Error("Getter must not be evaluated");
        },
      },
      error: { value: null },
    }),
  ],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction blocks a Final Invoice for ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      priorDepositQueryResult: malformedQueryResult,
    });

    const result = await createInvoiceAction(validFinalInput());

    assertPriorDepositLookupFailed(scenario, result);
  });
}

test("createInvoiceAction rejects an Array-shaped prior Deposit query result", async () => {
  const deceptiveResult: unknown[] = [];
  Object.assign(deceptiveResult, {
    data: [],
    error: null,
  });
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    priorDepositQueryResult: deceptiveResult,
  });

  const result = await createInvoiceAction(validFinalInput());

  assertPriorDepositLookupFailed(scenario, result);
});

const rowMissingInvoiceNumber: Record<string, unknown> = {
  ...priorDeposit(100),
};
delete rowMissingInvoiceNumber.invoice_number;

for (const [name, malformedRow] of [
  ["a null row", null],
  ["an undefined row", undefined],
  ["an empty object row", {}],
  ["a primitive row", "not-a-row"],
  [
    "a row missing Invoice identity",
    {
      invoice_number: null,
      invoice_type: "deposit",
      grand_total: 100,
      status: "draft",
    },
  ],
  [
    "a row missing grand_total",
    {
      id: "prior-deposit-missing-total",
      invoice_number: "INV-2026-0002",
      invoice_type: "deposit",
      status: "draft",
    },
  ],
  ["a row with a blank Invoice id", { ...priorDeposit(100), id: "" }],
  [
    "a row with a whitespace-only Invoice id",
    { ...priorDeposit(100), id: "   " },
  ],
  [
    "a row with the wrong Invoice type",
    { ...priorDeposit(100), invoice_type: "final" },
  ],
  [
    "a row with an unsupported status",
    { ...priorDeposit(100), status: "refunded" },
  ],
  ["a row with voided status", { ...priorDeposit(100), status: "voided" }],
  [
    "a row with cancelled status",
    { ...priorDeposit(100), status: "cancelled" },
  ],
  ["a row with a blank status", { ...priorDeposit(100), status: "" }],
  [
    "a row with a numeric Invoice number",
    { ...priorDeposit(100), invoice_number: 1 },
  ],
  [
    "a row with an object Invoice number",
    { ...priorDeposit(100), invoice_number: {} },
  ],
  [
    "a row with a blank Invoice number",
    { ...priorDeposit(100), invoice_number: "" },
  ],
  [
    "a row with a whitespace-only Invoice number",
    { ...priorDeposit(100), invoice_number: "   " },
  ],
  ["a row missing its Invoice number", rowMissingInvoiceNumber],
] as Array<[string, unknown]>) {
  test(`createInvoiceAction blocks a Final Invoice for ${name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      priorDepositQueryResult: priorDepositQueryResponse([malformedRow]),
    });

    const result = await createInvoiceAction(validFinalInput());

    assertPriorDepositLookupFailed(scenario, result);
  });
}

test("createInvoiceAction rejects an Array-shaped prior Deposit row", async () => {
  const deceptiveRow: unknown[] = [];
  Object.assign(deceptiveRow, {
    id: "invoice-1",
    invoice_number: "INV-1",
    invoice_type: "deposit",
    status: "draft",
    grand_total: "100",
  });
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    priorDepositQueryResult: priorDepositQueryResponse([deceptiveRow]),
  });

  const result = await createInvoiceAction(validFinalInput());

  assertPriorDepositLookupFailed(scenario, result);
});

test("createInvoiceAction preserves prior Deposit query-error handling", async () => {
  const scenario = startScenario({
    authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
    priorDepositQueryResult: {
      data: null,
      error: { message: "query failed" },
    },
  });

  const result = await createInvoiceAction(validFinalInput());

  assertPriorDepositLookupFailed(scenario, result);
});

for (const finalCase of [
  {
    name: "an empty prior Deposit collection",
    rawAmounts: [],
    expectedAmounts: [],
    expectedPriorTotal: 0,
    expectedFinalAmount: 500,
  },
  {
    name: "a numeric prior Deposit",
    rawAmounts: [100],
    expectedAmounts: [100],
    expectedPriorTotal: 100,
    expectedFinalAmount: 400,
  },
  {
    name: "a canonical decimal-string prior Deposit",
    rawAmounts: ["100.25"],
    expectedAmounts: [100.25],
    expectedPriorTotal: 100.25,
    expectedFinalAmount: 399.75,
  },
  {
    name: "canonical string zero",
    rawAmounts: ["0"],
    expectedAmounts: [0],
    expectedPriorTotal: 0,
    expectedFinalAmount: 500,
  },
  {
    name: "multiple canonical prior Deposits",
    rawAmounts: [100, "50.25", "0.75"],
    expectedAmounts: [100, 50.25, 0.75],
    expectedPriorTotal: 151,
    expectedFinalAmount: 349,
  },
]) {
  test(`createInvoiceAction creates a Final Invoice from ${finalCase.name}`, async () => {
    const scenario = startScenario({
      authority: { status: "active", scope: ACTIVE_SCOPE, historyCount: 1 },
      priorDepositQueryResult: priorDepositQueryResponse(
        finalCase.rawAmounts.map(priorDeposit),
      ),
    });

    const result = await createInvoiceAction(validFinalInput());

    assert.deepEqual(result, {
      success: true,
      invoiceId: INSERTED_INVOICE_ID,
      invoiceNumber: INVOICE_NUMBER,
    });
    assert.equal(scenario.priorDepositReads, 1);
    assert.equal(scenario.snapshotCalls, 1);
    assert.deepEqual(scenario.snapshotScopeIds, [ACTIVE_SCOPE_ID]);
    assert.deepEqual(scenario.snapshotInvoiceAmounts, [
      finalCase.expectedFinalAmount,
    ]);
    assert.deepEqual(scenario.snapshotInvoiceTypes, ["final"]);
    assert.equal(scenario.invoiceNumberCalls, 1);
    assert.equal(scenario.insertAttempts, 1);
    assert.equal(
      scenario.insertedPayloads[0]?.grand_total,
      finalCase.expectedFinalAmount,
    );
    assert.equal(
      scenario.insertedPayloads[0]?.approved_billing_scope_id,
      ACTIVE_SCOPE_ID,
    );

    const settlement = finalSettlement(scenario);
    assert.equal(settlement.billing_ceiling, ACTIVE_SCOPE.acceptedGrandTotal);
    assert.equal(
      settlement.active_prior_invoice_total,
      finalCase.expectedPriorTotal,
    );
    assert.equal(
      settlement.final_invoice_amount,
      scenario.insertedPayloads[0]?.grand_total,
    );

    const snapshotPriorInvoices = settlement.prior_invoices;
    assert.ok(Array.isArray(snapshotPriorInvoices));
    assert.deepEqual(
      snapshotPriorInvoices.map(
        (invoice) => (invoice as Record<string, unknown>).amount,
      ),
      finalCase.expectedAmounts,
    );
  });
}

for (const reason of [
  "active_query_error",
  "history_query_error",
  "history_null_payload",
  "history_malformed_count",
  "duplicate_active_scopes",
  "authority_contradiction",
  "invalid_active_scope",
]) {
  test(`createInvoiceAction fails closed without fallback or insert for ${reason}`, async () => {
    const scenario = startScenario({
      authority: { status: "unavailable", reason },
    });

    const result = await createInvoiceAction(validInput());

    assert.deepEqual(result, {
      success: false,
      error: "billing_scope_authority_unavailable",
    });
    assert.equal(scenario.authorityCalls, 1);
    assert.equal(scenario.snapshotCalls, 0);
    assert.equal(scenario.insertAttempts, 0);
    assert.deepEqual(scenario.insertedPayloads, []);
  });
}

test("createInvoiceAction maps the exact inactive billing scope token without retrying", async () => {
  const errorMessage = "billing_scope_inactive";
  const scenario = startScenario({ insertError: { message: errorMessage }, insertedInvoice: null });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, { success: false, error: "billing_scope_inactive" });
  assert.notEqual(result.error, "invoice_insert_failed");
  assert.equal(scenario.insertAttempts, 1);
  assert.ok(scenario.operations.indexOf("permission") < scenario.operations.indexOf("admin-client"));
});

test("createInvoiceAction preserves the legacy inactive billing scope mapping", async () => {
  const scenario = startScenario({
    insertError: { message: "approved billing scope not active or is voided/superseded" },
    insertedInvoice: null,
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, { success: false, error: "billing_scope_inactive" });
  assert.equal(scenario.insertAttempts, 1);
});

for (const errorMessage of ["billing_scope_inactive_typo", "billing_scope_inactive_extra"]) {
  test(`createInvoiceAction keeps ${errorMessage} generic`, async () => {
    const scenario = startScenario({ insertError: { message: errorMessage }, insertedInvoice: null });

    const result = await createInvoiceAction(validInput());

    assert.deepEqual(result, { success: false, error: "invoice_insert_failed" });
    assert.equal(scenario.insertAttempts, 1);
  });
}

test("createInvoiceAction keeps unrelated insert failures generic", async () => {
  const scenario = startScenario({
    insertError: { message: "violates invoices_customer_id_fkey" },
    insertedInvoice: null,
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, { success: false, error: "invoice_insert_failed" });
  assert.equal(scenario.insertAttempts, 1);
});

test("createInvoiceAction returns the existing success shape after one insert", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: INSERTED_INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
  });
  assert.equal(scenario.insertAttempts, 1);
  assert.ok(scenario.operations.indexOf("permission") < scenario.operations.indexOf("admin-client"));
});
