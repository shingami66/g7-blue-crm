import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join } from "node:path";
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

const MUTATION_KEY = "00000000-0000-4000-8000-000000000009";
const QUOTATION_ID = "00000000-0000-4000-8000-000000000001";
const SERVICE_ID = "00000000-0000-4000-8000-000000000002";
const CUSTOMER_ID = "00000000-0000-4000-8000-000000000003";
const INSERTED_INVOICE_ID = "00000000-0000-4000-8000-000000000004";
const INVOICE_NUMBER = "INV-2026-0001";
const ACTOR_CLERK_USER_ID = "test-user";

class TestUnauthorizedError extends Error {}
class TestForbiddenError extends Error {}
class TestAuthDependencyError extends Error {}

type RpcTransportError = { message: string } | null;

type AtomicRpcRow = {
  error_code: string | null;
  invoice_id: string | null;
  invoice_number: string | null;
  is_replayed?: boolean | null;
};

type ReconcileRpcRow = {
  reconciliation_status: "MATCH" | "NOT_FOUND" | "CONFLICT";
  invoice_id: string | null;
  invoice_number: string | null;
};

type AtomicRpcArgs = {
  p_service_id: string;
  p_quotation_id: string;
  p_invoice_type: string;
  p_requested_amount: number | null;
  p_actor_clerk_user_id: string;
  p_document_label: string;
  p_vat_mode: string;
  p_snapshot_seller: unknown;
  p_snapshot_buyer: unknown;
  p_snapshot_quotation: unknown;
  p_snapshot_bank_details: unknown;
  p_snapshot_document_rules: unknown;
  p_mutation_key: string;
  p_invoice_date: string;
  p_due_date: string;
};

type ReconcileRpcArgs = {
  p_mutation_key: string;
  p_service_id: string;
  p_quotation_id: string;
  p_invoice_type: string;
  p_requested_amount: number | null;
};

type IssueRpcArgs = {
  p_invoice_id: string;
  p_actor_clerk_user_id: string;
};

type ActionScenario = {
  role: unknown;
  denyPermission: boolean;
  clientCalls: number;
  databaseCalls: number;
  invoiceTableCalls: number;
  invoiceInsertAttempts: number;
  documentNumberRpcCalls: number;
  reconcileRpcCalls: number;
  reconcileRpcArgs: ReconcileRpcArgs[];
  reconcileRpcData: unknown;
  reconcileRpcError: RpcTransportError;
  reconcileRpcResponses?: Array<{ data: unknown; error: RpcTransportError }>;
  atomicRpcCalls: number;
  atomicRpcArgs: AtomicRpcArgs[];
  atomicRpcData: unknown;
  atomicRpcError: RpcTransportError;
  issueRpcCalls: number;
  issueRpcArgs: IssueRpcArgs[];
  issueRpcData: unknown;
  issueRpcError: RpcTransportError;
  snapshotCalls: number;
  snapshotPayloads: Array<Record<string, unknown>>;
  snapshotError?: Error | null;
  operations: string[];
  quotationError?: Error | null;
  quotationRow?: unknown;
  companySettingsError?: Error | null;
  companySettingsRow?: unknown;
  issueInvoice: { id: string; status: string; is_deleted: boolean } | null;
  issueUpdateResult: { id: string } | null;
  issueUpdateError: RpcTransportError;
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

      if (table === "invoices") {
        scenario.invoiceTableCalls += 1;
      }

      let isInsert = false;
      let isUpdate = false;
      const query: Record<string, unknown> = {
        select() {
          return query;
        },
        eq() {
          return query;
        },
        insert() {
          if (table === "invoices") {
            scenario.invoiceInsertAttempts += 1;
          }
          isInsert = true;
          return query;
        },
        update() {
          isUpdate = true;
          return query;
        },
        async maybeSingle() {
          if (table === "company_settings") {
            if (scenario.companySettingsError) {
              return { data: null, error: scenario.companySettingsError };
            }
            return {
              data: scenario.companySettingsRow !== undefined
                ? scenario.companySettingsRow
                : { vat_mode: "not_registered" },
              error: null,
            };
          }

          if (table === "invoices" && !isInsert && !isUpdate) {
            return {
              data: scenario.issueInvoice,
              error: null,
            };
          }

          if (table === "invoices" && isUpdate) {
            return {
              data: scenario.issueUpdateResult,
              error: scenario.issueUpdateError,
            };
          }

          throw new Error(`Unexpected maybeSingle query for ${table}`);
        },
        async single() {
          if (table === "quotations") {
            if (scenario.quotationError) {
              return { data: null, error: scenario.quotationError };
            }
            return {
              data: scenario.quotationRow !== undefined
                ? scenario.quotationRow
                : {
                    status: "approved",
                    service_id: SERVICE_ID,
                    customer_id: CUSTOMER_ID,
                  },
              error: null,
            };
          }

          if (table === "invoices" && isInsert) {
            throw new Error(
              "createInvoiceAction must not insert invoices directly",
            );
          }

          throw new Error(`Unexpected single query for ${table}`);
        },
      };

      return query;
    },
    rpc(name: string, args?: Record<string, unknown>) {
      const scenario = currentScenario();
      scenario.operations.push(`rpc:${name}`);

      if (name === "generate_document_number") {
        scenario.documentNumberRpcCalls += 1;
        throw new Error(
          "createInvoiceAction must not call generate_document_number",
        );
      }

      if (name === "reconcile_invoice_create_mutation") {
        scenario.reconcileRpcCalls += 1;
        if (args) {
          scenario.reconcileRpcArgs.push(args as ReconcileRpcArgs);
        }
        if (scenario.reconcileRpcResponses && scenario.reconcileRpcResponses.length > 0) {
          const resp = scenario.reconcileRpcResponses.shift()!;
          return resp;
        }
        return {
          data: scenario.reconcileRpcData,
          error: scenario.reconcileRpcError,
        };
      }

      if (name === "issue_invoice_atomic") {
        scenario.issueRpcCalls += 1;
        if (args) {
          scenario.issueRpcArgs.push(args as IssueRpcArgs);
        }
        return {
          data: scenario.issueRpcData,
          error: scenario.issueRpcError,
        };
      }

      if (name !== "create_invoice_atomic") {
        throw new Error(`Unexpected RPC: ${name}`);
      }

      scenario.atomicRpcCalls += 1;
      if (args) {
        scenario.atomicRpcArgs.push(args as AtomicRpcArgs);
      }

      return {
        data: scenario.atomicRpcData,
        error: scenario.atomicRpcError,
      };
    },
  };
}

function startScenario(
  options: Partial<
    Pick<
      ActionScenario,
      | "denyPermission"
      | "role"
      | "reconcileRpcData"
      | "reconcileRpcError"
      | "reconcileRpcResponses"
      | "atomicRpcData"
      | "atomicRpcError"
      | "issueRpcData"
      | "issueRpcError"
      | "issueInvoice"
      | "issueUpdateResult"
      | "issueUpdateError"
      | "quotationError"
      | "quotationRow"
      | "companySettingsError"
      | "companySettingsRow"
      | "snapshotError"
    >
  > = {},
) {
  activeScenario = {
    role: Object.prototype.hasOwnProperty.call(options, "role")
      ? options.role
      : "manager",
    denyPermission: options.denyPermission ?? false,
    clientCalls: 0,
    databaseCalls: 0,
    invoiceTableCalls: 0,
    invoiceInsertAttempts: 0,
    documentNumberRpcCalls: 0,
    reconcileRpcCalls: 0,
    reconcileRpcArgs: [],
    reconcileRpcData: Object.prototype.hasOwnProperty.call(options, "reconcileRpcData")
      ? options.reconcileRpcData
      : [
          {
            reconciliation_status: "NOT_FOUND",
            invoice_id: null,
            invoice_number: null,
          } satisfies ReconcileRpcRow,
        ],
    reconcileRpcError: options.reconcileRpcError ?? null,
    reconcileRpcResponses: options.reconcileRpcResponses ? [...options.reconcileRpcResponses] : undefined,
    atomicRpcCalls: 0,
    atomicRpcArgs: [],
    atomicRpcData: Object.prototype.hasOwnProperty.call(options, "atomicRpcData")
      ? options.atomicRpcData
      : [
          {
            error_code: null,
            invoice_id: INSERTED_INVOICE_ID,
            invoice_number: INVOICE_NUMBER,
            is_replayed: false,
          } satisfies AtomicRpcRow,
        ],
    atomicRpcError: Object.prototype.hasOwnProperty.call(options, "atomicRpcError")
      ? (options.atomicRpcError ?? null)
      : null,
    issueRpcCalls: 0,
    issueRpcArgs: [],
    issueRpcData: Object.prototype.hasOwnProperty.call(options, "issueRpcData")
      ? options.issueRpcData
      : [
          {
            error_code: null,
            invoice_id: INSERTED_INVOICE_ID,
            invoice_number: INVOICE_NUMBER,
          } satisfies AtomicRpcRow,
        ],
    issueRpcError: Object.prototype.hasOwnProperty.call(options, "issueRpcError")
      ? (options.issueRpcError ?? null)
      : null,
    snapshotCalls: 0,
    snapshotPayloads: [],
    snapshotError: options.snapshotError ?? null,
    operations: [],
    quotationError: options.quotationError ?? null,
    quotationRow: options.quotationRow,
    companySettingsError: options.companySettingsError ?? null,
    companySettingsRow: options.companySettingsRow,
    issueInvoice: Object.prototype.hasOwnProperty.call(options, "issueInvoice")
      ? (options.issueInvoice ?? null)
      : {
          id: INSERTED_INVOICE_ID,
          status: "draft",
          is_deleted: false,
        },
    issueUpdateResult: Object.prototype.hasOwnProperty.call(
      options,
      "issueUpdateResult",
    )
      ? (options.issueUpdateResult ?? null)
      : { id: INSERTED_INVOICE_ID },
    issueUpdateError: options.issueUpdateError ?? null,
  };

  return activeScenario;
}

function validInput() {
  return {
    mutationKey: MUTATION_KEY,
    quotationId: QUOTATION_ID,
    serviceId: SERVICE_ID,
    invoiceType: "deposit" as const,
    requestedAmount: 100,
  };
}

function validFinalInput() {
  return {
    mutationKey: MUTATION_KEY,
    quotationId: QUOTATION_ID,
    serviceId: SERVICE_ID,
    invoiceType: "final" as const,
  };
}

function assertNoDirectCreateWrite(scenario: ActionScenario) {
  assert.equal(scenario.invoiceInsertAttempts, 0);
  assert.equal(scenario.documentNumberRpcCalls, 0);
  assert.equal(
    scenario.operations.includes("from:invoices"),
    false,
    "create path must not touch invoices table",
  );
}

mock.module("@/lib/auth/errors", {
  namedExports: {
    UnauthorizedError: TestUnauthorizedError,
    ForbiddenError: TestForbiddenError,
    AuthDependencyError: TestAuthDependencyError,
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

      return { clerk_user_id: ACTOR_CLERK_USER_ID, role: scenario.role };
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
    mapRowToQuotationDetail: () => ({
      id: QUOTATION_ID,
      grandTotal: 100,
      quotationNumber: "QT-2026-0001",
      serviceId: SERVICE_ID,
      customerId: CUSTOMER_ID,
      items: [],
      subtotal: 100,
      discount: 0,
      vatRate: 0,
      vatAmount: 0,
      status: "approved",
      createdAt: "2026-01-01T00:00:00.000Z",
      updatedAt: "2026-01-01T00:00:00.000Z",
    }),
  },
});
mock.module("./snapshots.ts", {
  namedExports: {
    buildInvoiceSnapshotData: () => {
      const scenario = currentScenario();
      scenario.snapshotCalls += 1;
      if (scenario.snapshotError) {
        throw scenario.snapshotError;
      }
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

const { createInvoiceAction, issueInvoiceAction } = await import("./actions.ts");

// =========================================================================
// 1. Role and Permission Tests (Baseline)
// =========================================================================

for (const role of ["admin", "manager"] as const) {
  test(`createInvoiceAction permits ${role} and uses one atomic RPC`, async () => {
    const scenario = startScenario({ role });

    const result = await createInvoiceAction(validInput());

    assert.deepEqual(result, {
      success: true,
      invoiceId: INSERTED_INVOICE_ID,
      invoiceNumber: INVOICE_NUMBER,
      isReplayed: false,
    });
    assert.equal(scenario.reconcileRpcCalls, 1);
    assert.equal(scenario.atomicRpcCalls, 1);
    assert.equal(scenario.snapshotCalls, 1);
    assertNoDirectCreateWrite(scenario);
    assert.equal(
      hasPermissionForRole(role, INVOICE_PERMISSIONS.write),
      true,
    );
  });

  test(`issueInvoiceAction permits ${role} past authorization`, async () => {
    const scenario = startScenario({ role });

    const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

    assert.notDeepEqual(result, { success: false, error: "Forbidden" });
    assert.ok(
      scenario.operations.indexOf("permission") <
        scenario.operations.indexOf("admin-client"),
    );
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
    assert.equal(scenario.reconcileRpcCalls, 0);
    assert.equal(scenario.atomicRpcCalls, 0);
    assert.equal(scenario.snapshotCalls, 0);
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
  assert.equal(scenario.atomicRpcCalls, 0);
});

// =========================================================================
// 2. Deposit & Final Route Invariants (Baseline)
// =========================================================================

test("createInvoiceAction Deposit routes through create_invoice_atomic with locked args", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction(validInput());

  assert.equal(result.success, true);
  assert.equal(scenario.reconcileRpcCalls, 1);
  assert.equal(scenario.atomicRpcCalls, 1);
  assert.equal(scenario.atomicRpcArgs.length, 1);

  const args = scenario.atomicRpcArgs[0];
  assert.equal(args.p_service_id, SERVICE_ID);
  assert.equal(args.p_quotation_id, QUOTATION_ID);
  assert.equal(args.p_invoice_type, "deposit");
  assert.equal(args.p_requested_amount, 100);
  assert.equal(args.p_actor_clerk_user_id, ACTOR_CLERK_USER_ID);
  assert.equal(args.p_document_label, "Commercial Invoice");
  assert.equal(args.p_vat_mode, "not_registered");
  assert.deepEqual(args.p_snapshot_seller, { source: "test" });
  assert.deepEqual(args.p_snapshot_buyer, { source: "test" });
  assert.deepEqual(args.p_snapshot_quotation, { source: "test" });
  assert.deepEqual(args.p_snapshot_bank_details, { source: "test" });
  assert.deepEqual(args.p_snapshot_document_rules, { source: "test" });
  assert.equal(args.p_mutation_key, MUTATION_KEY);
  assert.match(args.p_invoice_date, /^\d{4}-\d{2}-\d{2}$/);
  assert.match(args.p_due_date, /^\d{4}-\d{2}-\d{2}$/);
  assertNoDirectCreateWrite(scenario);
});

test("createInvoiceAction Final routes through create_invoice_atomic with null amount", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction(validFinalInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: INSERTED_INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
    isReplayed: false,
  });
  assert.equal(scenario.reconcileRpcCalls, 1);
  assert.equal(scenario.atomicRpcCalls, 1);
  assert.equal(scenario.atomicRpcArgs[0]?.p_invoice_type, "final");
  assert.equal(scenario.atomicRpcArgs[0]?.p_requested_amount, null);
  assert.equal(scenario.atomicRpcArgs[0]?.p_mutation_key, MUTATION_KEY);
  assertNoDirectCreateWrite(scenario);
});

test("createInvoiceAction returns RPC invoice identity without a second create write", async () => {
  const scenario = startScenario({
    atomicRpcData: [
      {
        error_code: null,
        invoice_id: "00000000-0000-4000-8000-000000000099",
        invoice_number: "INV-2026-0099",
        is_replayed: false,
      },
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: "00000000-0000-4000-8000-000000000099",
    invoiceNumber: "INV-2026-0099",
    isReplayed: false,
  });
  assert.equal(scenario.reconcileRpcCalls, 1);
  assert.equal(scenario.atomicRpcCalls, 1);
  assertNoDirectCreateWrite(scenario);
  assert.ok(
    scenario.operations.indexOf("permission") <
      scenario.operations.indexOf("admin-client"),
  );
  assert.ok(
    scenario.operations.indexOf("admin-client") <
      scenario.operations.indexOf("rpc:create_invoice_atomic"),
  );
});

// =========================================================================
// 3. Error Code Mappings & Fail-Closed Checks (Baseline 26 + 6 codes)
// =========================================================================

for (const errorCode of [
  "invalid_invoice_input",
  "vat_registered_invoice_not_implemented_in_this_slice",
  "deposit_amount_required",
  "invalid_deposit_amount",
  "deposit_amount_exceeds_remaining",
  "service_lifecycle_unavailable",
  "invoice_customer_unavailable",
  "service_not_eligible_for_deposit",
  "service_not_eligible_for_final",
  "quotation_not_found",
  "quotation_not_approved",
  "quotation_service_mismatch",
  "deposit_invoice_already_exists",
  "final_invoice_already_exists",
  "billing_scope_authority_unavailable",
  "billing_scope_inactive",
  "invoice_exposure_unavailable",
  "prior_invoices_exceed_billing_scope_ceiling",
  "prior_invoices_exceed_quotation_total",
  "invoice_amount_exceeds_ceiling",
  "billing_scope_service_mismatch",
  "invoice_grand_total_invalid",
  "invoice_number_unavailable",
  "invoice_insert_failed",
  "invoice_creation_failed",
  "invoice_snapshot_authority_unavailable",
] as const) {
  test(`createInvoiceAction preserves authoritative RPC error_code ${errorCode}`, async () => {
    const scenario = startScenario({
      atomicRpcData: [
        {
          error_code: errorCode,
          invoice_id: null,
          invoice_number: null,
          is_replayed: false,
        },
      ],
    });

    const result = await createInvoiceAction(
      errorCode === "service_not_eligible_for_final" ||
        errorCode === "final_invoice_already_exists" ||
        errorCode === "prior_invoices_exceed_billing_scope_ceiling" ||
        errorCode === "prior_invoices_exceed_quotation_total"
        ? validFinalInput()
        : validInput(),
    );

    assert.deepEqual(result, { success: false, error: errorCode });
    assert.equal(scenario.reconcileRpcCalls, 1);
    assert.equal(scenario.atomicRpcCalls, 1);
    assertNoDirectCreateWrite(scenario);
  });
}

for (const errorCode of [
  "SOME_UNKNOWN_CODE",
  " deposit_amount_exceeds_remaining",
  "deposit_amount_exceeds_remaining ",
  '{"error":"internal"}',
  "",
  "   ",
] as const) {
  test(`createInvoiceAction fails closed on untrusted RPC error_code ${JSON.stringify(errorCode)}`, async () => {
    const scenario = startScenario({
      atomicRpcData: [
        {
          error_code: errorCode,
          invoice_id: null,
          invoice_number: null,
          is_replayed: false,
        },
      ],
    });

    const result = await createInvoiceAction(validInput());

    assert.deepEqual(result, {
      success: false,
      error: "invoice_creation_failed",
    });
    assert.equal(scenario.reconcileRpcCalls, 1);
    assert.equal(scenario.atomicRpcCalls, 1);
    assertNoDirectCreateWrite(scenario);
  });
}

test("createInvoiceAction maps RPC transport failure without raw database leakage", async () => {
  const scenario = startScenario({
    atomicRpcData: null,
    atomicRpcError: {
      message: 'relation "invoices" does not exist DETAIL: stack trace',
    },
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "invoice_creation_failed",
  });
  assert.equal(scenario.atomicRpcCalls, 1);
  assertNoDirectCreateWrite(scenario);
  assert.notEqual(
    "error" in result && typeof result.error === "string"
      ? result.error.includes("relation")
      : false,
    true,
  );
});

test("createInvoiceAction fails closed on malformed RPC success row", async () => {
  const scenario = startScenario({
    atomicRpcData: [
      {
        error_code: null,
        invoice_id: null,
        invoice_number: null,
        is_replayed: false,
      },
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "invoice_creation_failed",
  });
  assert.equal(scenario.atomicRpcCalls, 1);
  assertNoDirectCreateWrite(scenario);
});

test("createInvoiceAction fails closed on multi-row RPC payload", async () => {
  const scenario = startScenario({
    atomicRpcData: [
      {
        error_code: null,
        invoice_id: INSERTED_INVOICE_ID,
        invoice_number: INVOICE_NUMBER,
        is_replayed: false,
      },
      {
        error_code: null,
        invoice_id: INSERTED_INVOICE_ID,
        invoice_number: INVOICE_NUMBER,
        is_replayed: false,
      },
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "invoice_creation_failed",
  });
  assert.equal(scenario.atomicRpcCalls, 1);
  assertNoDirectCreateWrite(scenario);
});

test("createInvoiceAction rejects Final with client amount before RPC", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction({
    ...validFinalInput(),
    requestedAmount: 50,
  });

  assert.deepEqual(result, {
    success: false,
    error: "invalid_invoice_input",
  });
  assert.equal(scenario.reconcileRpcCalls, 0);
  assert.equal(scenario.atomicRpcCalls, 0);
  assert.equal(scenario.clientCalls, 0);
});

test("createInvoiceAction rejects missing Deposit amount before RPC", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction({
    mutationKey: MUTATION_KEY,
    quotationId: QUOTATION_ID,
    serviceId: SERVICE_ID,
    invoiceType: "deposit",
  });

  assert.deepEqual(result, {
    success: false,
    error: "deposit_amount_required",
  });
  assert.equal(scenario.reconcileRpcCalls, 0);
  assert.equal(scenario.atomicRpcCalls, 0);
});

test("createInvoiceAction rejects invalid schema input before privileged client", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction({
    mutationKey: MUTATION_KEY,
    quotationId: "not-a-uuid",
    serviceId: SERVICE_ID,
    invoiceType: "deposit",
    requestedAmount: 100,
  });

  assert.deepEqual(result, {
    success: false,
    error: "invalid_invoice_input",
  });
  assert.equal(scenario.clientCalls, 0);
  assert.equal(scenario.reconcileRpcCalls, 0);
  assert.equal(scenario.atomicRpcCalls, 0);
});

test("createInvoiceAction never calls authority or exposure helpers", async () => {
  const scenario = startScenario();

  await createInvoiceAction(validInput());

  assert.equal(
    scenario.operations.some((operation) => operation.includes("authority")),
    false,
  );
  assert.equal(
    scenario.operations.some((operation) => operation.includes("exposure")),
    false,
  );
  assert.equal(scenario.operations.includes("rpc:create_invoice_atomic"), true);
  assert.equal(scenario.atomicRpcCalls, 1);
  assertNoDirectCreateWrite(scenario);
});

// =========================================================================
// 4. Issue Action Invariants (Baseline)
// =========================================================================

test("issueInvoiceAction issues a draft invoice", async () => {
  const scenario = startScenario();

  const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

  assert.deepEqual(result, { success: true });
  assert.equal(scenario.issueRpcCalls, 1);
  assert.deepEqual(scenario.issueRpcArgs, [
    {
      p_invoice_id: INSERTED_INVOICE_ID,
      p_actor_clerk_user_id: ACTOR_CLERK_USER_ID,
    },
  ]);
  assert.equal(scenario.invoiceTableCalls, 0);
  assert.equal(scenario.atomicRpcCalls, 0);
});

for (const errorCode of [
  "invoice_not_found",
  "invoice_not_draft",
  "invoice_issue_concurrency_conflict",
  "invoice_issue_failed",
] as const) {
  test(`issueInvoiceAction preserves authoritative RPC error_code ${errorCode}`, async () => {
    const scenario = startScenario({
      issueRpcData: [
        {
          error_code: errorCode,
          invoice_id: null,
          invoice_number: null,
        },
      ],
    });

    const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

    assert.deepEqual(result, { success: false, error: errorCode });
    assert.equal(scenario.issueRpcCalls, 1);
    assert.equal(scenario.invoiceTableCalls, 0);
  });
}

for (const errorCode of [
  "SOME_UNKNOWN_CODE",
  " invoice_not_found",
  "invoice_not_found ",
  '{"error":"internal"}',
  "",
  "   ",
] as const) {
  test(`issueInvoiceAction fails closed on untrusted RPC error_code ${JSON.stringify(errorCode)}`, async () => {
    const scenario = startScenario({
      issueRpcData: [
        {
          error_code: errorCode,
          invoice_id: null,
          invoice_number: null,
        },
      ],
    });

    const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

    assert.deepEqual(result, { success: false, error: "invoice_issue_failed" });
    assert.equal(scenario.issueRpcCalls, 1);
    assert.equal(scenario.invoiceTableCalls, 0);
  });
}

test("issueInvoiceAction maps RPC transport failure without raw database leakage", async () => {
  const scenario = startScenario({
    issueRpcData: null,
    issueRpcError: {
      message: 'relation "invoices" does not exist DETAIL: stack trace',
    },
  });

  const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

  assert.deepEqual(result, { success: false, error: "invoice_issue_failed" });
  assert.equal(scenario.issueRpcCalls, 1);
  assert.equal(scenario.invoiceTableCalls, 0);
  assert.notEqual(
    "error" in result && typeof result.error === "string"
      ? result.error.includes("relation")
      : false,
    true,
  );
});

test("issueInvoiceAction fails closed on malformed atomic RPC success data", async () => {
  const scenario = startScenario({
    issueRpcData: [
      {
        error_code: null,
        invoice_id: null,
        invoice_number: null,
      },
    ],
  });

  const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

  assert.deepEqual(result, { success: false, error: "invoice_issue_failed" });
  assert.equal(scenario.issueRpcCalls, 1);
});

test("createInvoiceAction logs operational correlation and sanitizes raw errors on RPC failure", async () => {
  startScenario({
    atomicRpcData: null,
    atomicRpcError: {
      message: 'FATAL: database "g7_crm" connection failed with internal password secret',
    },
  });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const result = await createInvoiceAction(validInput());
    assert.deepEqual(result, { success: false, error: "invoice_creation_failed" });
    assert.equal(loggedErrors.length, 1);
    assert.match(
      loggedErrors[0],
      /^\[createInvoiceAction\] \[[0-9a-f-]+\] Atomic create RPC transport error: database_transport_error$/,
    );
    assert.equal(loggedErrors[0].includes("password"), false);
    assert.equal(loggedErrors[0].includes("g7_crm"), false);
  } finally {
    console.error = originalConsoleError;
  }
});

test("issueInvoiceAction logs operational correlation and sanitizes raw errors on RPC failure", async () => {
  startScenario({
    issueRpcData: null,
    issueRpcError: {
      message: 'FATAL: database query timeout with sensitive internal trace',
    },
  });

  const loggedErrors: string[] = [];
  const originalConsoleError = console.error;
  console.error = (...args: unknown[]) => {
    loggedErrors.push(args.map((a) => String(a)).join(" "));
  };

  try {
    const result = await issueInvoiceAction(INSERTED_INVOICE_ID);
    assert.deepEqual(result, { success: false, error: "invoice_issue_failed" });
    assert.equal(loggedErrors.length, 1);
    assert.match(
      loggedErrors[0],
      /^\[issueInvoiceAction\] \[[0-9a-f-]+\] Atomic issue RPC transport error: database_transport_error$/,
    );
    assert.equal(loggedErrors[0].includes("sensitive"), false);
  } finally {
    console.error = originalConsoleError;
  }
});

// =========================================================================
// 5. Option 1 Replay Safety, Intent Gates, and Recovery Tests (G8)
// =========================================================================

test("createInvoiceAction rejects missing mutation key before reconciliation", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction({
    quotationId: QUOTATION_ID,
    serviceId: SERVICE_ID,
    invoiceType: "deposit",
    requestedAmount: 100,
  });

  assert.deepEqual(result, {
    success: false,
    error: "invalid_invoice_input",
  });
  assert.equal(scenario.clientCalls, 0);
  assert.equal(scenario.reconcileRpcCalls, 0);
});

test("createInvoiceAction rejects empty or whitespace mutation key before reconciliation", async () => {
  const scenario = startScenario();

  for (const emptyKey of ["", "   ", "\t"]) {
    const result = await createInvoiceAction({
      mutationKey: emptyKey,
      quotationId: QUOTATION_ID,
      serviceId: SERVICE_ID,
      invoiceType: "deposit",
      requestedAmount: 100,
    });

    assert.deepEqual(result, {
      success: false,
      error: "invalid_invoice_input",
    });
  }
  assert.equal(scenario.reconcileRpcCalls, 0);
});

test("createInvoiceAction rejects non-positive or non-finite Deposit amount before reconciliation", async () => {
  const scenario = startScenario();

  for (const invalidAmount of [0, -10, NaN, Infinity, -Infinity]) {
    const result = await createInvoiceAction({
      mutationKey: MUTATION_KEY,
      quotationId: QUOTATION_ID,
      serviceId: SERVICE_ID,
      invoiceType: "deposit",
      requestedAmount: invalidAmount,
    });

    assert.deepEqual(result, {
      success: false,
      error: "invalid_invoice_input",
    });
  }
  assert.equal(scenario.reconcileRpcCalls, 0);
});

test("createInvoiceAction rejects Deposit amount with more than 2 decimal places before reconciliation", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction({
    mutationKey: MUTATION_KEY,
    quotationId: QUOTATION_ID,
    serviceId: SERVICE_ID,
    invoiceType: "deposit",
    requestedAmount: 100.555,
  });

  assert.deepEqual(result, {
    success: false,
    error: "invalid_deposit_amount",
  });
  assert.equal(scenario.reconcileRpcCalls, 0);
});

test("initial reconciliation MATCH returns original invoice immediately and bypasses prework", async () => {
  const scenario = startScenario({
    reconcileRpcData: [
      {
        reconciliation_status: "MATCH",
        invoice_id: "00000000-0000-4000-8000-000000000077",
        invoice_number: "INV-2026-0077",
      } satisfies ReconcileRpcRow,
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: "00000000-0000-4000-8000-000000000077",
    invoiceNumber: "INV-2026-0077",
    isReplayed: true,
  });
  assert.equal(scenario.reconcileRpcCalls, 1);
  assert.deepEqual(scenario.reconcileRpcArgs[0], {
    p_mutation_key: MUTATION_KEY,
    p_service_id: SERVICE_ID,
    p_quotation_id: QUOTATION_ID,
    p_invoice_type: "deposit",
    p_requested_amount: 100,
  });
  assert.equal(scenario.databaseCalls, 0);
  assert.equal(scenario.snapshotCalls, 0);
  assert.equal(scenario.atomicRpcCalls, 0);
  assertNoDirectCreateWrite(scenario);
});

test("initial reconciliation CONFLICT returns MUTATION_KEY_CONFLICT immediately and bypasses prework", async () => {
  const scenario = startScenario({
    reconcileRpcData: [
      {
        reconciliation_status: "CONFLICT",
        invoice_id: null,
        invoice_number: null,
      } satisfies ReconcileRpcRow,
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "MUTATION_KEY_CONFLICT",
  });
  assert.equal(scenario.reconcileRpcCalls, 1);
  assert.equal(scenario.databaseCalls, 0);
  assert.equal(scenario.snapshotCalls, 0);
  assert.equal(scenario.atomicRpcCalls, 0);
});

test("initial reconciliation transport failure returns safe error without leak", async () => {
  const scenario = startScenario({
    reconcileRpcData: null,
    reconcileRpcError: { message: "connection timeout" },
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "invoice_creation_failed",
  });
  assert.equal(scenario.reconcileRpcCalls, 1);
  assert.equal(scenario.atomicRpcCalls, 0);
});

test("initial NOT_FOUND + quotation lookup failure + recovery MATCH returns success", async () => {
  const scenario = startScenario({
    reconcileRpcResponses: [
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
      {
        data: [{ reconciliation_status: "MATCH", invoice_id: INSERTED_INVOICE_ID, invoice_number: INVOICE_NUMBER }],
        error: null,
      },
    ],
    quotationError: new Error("Quotation locked/not found"),
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: INSERTED_INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
    isReplayed: true,
  });
  assert.equal(scenario.reconcileRpcCalls, 2);
  assert.equal(scenario.atomicRpcCalls, 0);
});

test("initial NOT_FOUND + company settings failure + recovery MATCH returns success", async () => {
  const scenario = startScenario({
    reconcileRpcResponses: [
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
      {
        data: [{ reconciliation_status: "MATCH", invoice_id: INSERTED_INVOICE_ID, invoice_number: INVOICE_NUMBER }],
        error: null,
      },
    ],
    companySettingsError: new Error("Company settings unavailable"),
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: INSERTED_INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
    isReplayed: true,
  });
  assert.equal(scenario.reconcileRpcCalls, 2);
});

test("initial NOT_FOUND + snapshot build failure + recovery MATCH returns success", async () => {
  const scenario = startScenario({
    reconcileRpcResponses: [
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
      {
        data: [{ reconciliation_status: "MATCH", invoice_id: INSERTED_INVOICE_ID, invoice_number: INVOICE_NUMBER }],
        error: null,
      },
    ],
    snapshotError: new Error("Snapshot building failed"),
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: INSERTED_INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
    isReplayed: true,
  });
  assert.equal(scenario.reconcileRpcCalls, 2);
});

test("initial NOT_FOUND + prework failure + recovery NOT_FOUND returns genuine prework error", async () => {
  const scenario = startScenario({
    reconcileRpcResponses: [
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
    ],
    quotationError: new Error("Not found"),
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "quotation_not_found",
  });
  assert.equal(scenario.reconcileRpcCalls, 2);
});

test("initial NOT_FOUND + prework failure + recovery CONFLICT returns MUTATION_KEY_CONFLICT", async () => {
  const scenario = startScenario({
    reconcileRpcResponses: [
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
      {
        data: [{ reconciliation_status: "CONFLICT", invoice_id: null, invoice_number: null }],
        error: null,
      },
    ],
    quotationError: new Error("Not found"),
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "MUTATION_KEY_CONFLICT",
  });
  assert.equal(scenario.reconcileRpcCalls, 2);
});

test("create RPC transport failure + recovery MATCH returns success", async () => {
  const scenario = startScenario({
    reconcileRpcResponses: [
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
      {
        data: [{ reconciliation_status: "MATCH", invoice_id: INSERTED_INVOICE_ID, invoice_number: INVOICE_NUMBER }],
        error: null,
      },
    ],
    atomicRpcData: null,
    atomicRpcError: { message: "504 Gateway Timeout" },
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: INSERTED_INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
    isReplayed: true,
  });
  assert.equal(scenario.atomicRpcCalls, 1);
  assert.equal(scenario.reconcileRpcCalls, 2);
});

test("create RPC transport failure + recovery CONFLICT returns MUTATION_KEY_CONFLICT", async () => {
  startScenario({
    reconcileRpcResponses: [
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
      {
        data: [{ reconciliation_status: "CONFLICT", invoice_id: null, invoice_number: null }],
        error: null,
      },
    ],
    atomicRpcData: null,
    atomicRpcError: { message: "Network error" },
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "MUTATION_KEY_CONFLICT",
  });
});

test("create RPC transport failure + recovery NOT_FOUND returns invoice_creation_failed", async () => {
  startScenario({
    reconcileRpcResponses: [
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
      {
        data: [{ reconciliation_status: "NOT_FOUND", invoice_id: null, invoice_number: null }],
        error: null,
      },
    ],
    atomicRpcData: null,
    atomicRpcError: { message: "Network error" },
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "invoice_creation_failed",
  });
});

test("createInvoiceAction maps atomic RPC is_replayed: true properly", async () => {
  startScenario({
    atomicRpcData: [
      {
        error_code: null,
        invoice_id: INSERTED_INVOICE_ID,
        invoice_number: INVOICE_NUMBER,
        is_replayed: true,
      },
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: INSERTED_INVOICE_ID,
    invoiceNumber: INVOICE_NUMBER,
    isReplayed: true,
  });
});

test("createInvoiceAction maps atomic RPC mutation_key_conflict error to MUTATION_KEY_CONFLICT", async () => {
  startScenario({
    atomicRpcData: [
      {
        error_code: "mutation_key_conflict",
        invoice_id: null,
        invoice_number: null,
        is_replayed: false,
      },
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "MUTATION_KEY_CONFLICT",
  });
});

// =========================================================================
// 6. Migration Source Contract Tests (Option 1 DB Invariants)
// =========================================================================

const migrationPath = join(
  import.meta.dirname,
  "../../../supabase/migrations/20260817140000_g8_invoice_create_replay_safety.sql",
);
const migrationSql = readFileSync(migrationPath, "utf8");

test("migration source contract enforces forward-only transactional Option 1 rules", () => {
  assert.match(migrationSql, /^BEGIN;/m, "Migration must be wrapped in explicit BEGIN");
  assert.match(migrationSql, /COMMIT;\s*$/, "Migration must end with explicit COMMIT");

  // Schema alterations
  assert.match(migrationSql, /ALTER TABLE public\.invoices[\s\S]*?ADD COLUMN IF NOT EXISTS mutation_key text NULL/i);
  assert.match(migrationSql, /ADD COLUMN IF NOT EXISTS mutation_payload jsonb NULL/i);
  assert.match(migrationSql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_invoices_mutation_key\s+ON public\.invoices\s*\(mutation_key\)\s+WHERE mutation_key IS NOT NULL;/i);

  // ALL-ROWS lookup (no soft-delete or status filter)
  assert.match(migrationSql, /SELECT i\.id, i\.invoice_number, i\.mutation_payload[\s\S]*?FROM public\.invoices i[\s\S]*?WHERE i\.mutation_key = v_mutation_key/i);
  assert.doesNotMatch(migrationSql, /WHERE i\.mutation_key = v_mutation_key\s+AND i\.is_deleted = false/i);
  assert.doesNotMatch(migrationSql, /WHERE i\.mutation_key = v_mutation_key\s+AND i\.status/i);

  // Canonical helper
  assert.match(migrationSql, /CREATE OR REPLACE FUNCTION public\._canonical_invoice_create_mutation/i);
  assert.match(migrationSql, /REVOKE ALL ON FUNCTION public\._canonical_invoice_create_mutation\(uuid, uuid, text, numeric\) FROM PUBLIC, anon, authenticated;/i);
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\._canonical_invoice_create_mutation\(uuid, uuid, text, numeric\) TO service_role;/i);

  // Advisory lock
  assert.match(migrationSql, /PERFORM pg_advisory_xact_lock\(hashtext\('invoice_mutation_key:' \|\| v_mutation_key\)\);/i);

  // Stale overload removal
  assert.match(migrationSql, /DROP FUNCTION IF EXISTS public\.create_invoice_atomic\s*\([\s\S]*?uuid,\s*uuid,\s*text,\s*numeric,\s*text,\s*text,\s*text,\s*jsonb,\s*jsonb,\s*jsonb,\s*jsonb,\s*jsonb,\s*date,\s*date\s*\);/i);
  assert.match(migrationSql, /DROP FUNCTION IF EXISTS public\.create_invoice_atomic_legacy\s*\([\s\S]*?uuid,\s*uuid,\s*text,\s*numeric,\s*text,\s*text,\s*text,\s*jsonb,\s*jsonb,\s*jsonb,\s*jsonb,\s*jsonb,\s*date,\s*date\s*\);/i);

  // New signatures
  assert.match(migrationSql, /CREATE OR REPLACE FUNCTION public\.reconcile_invoice_create_mutation\([\s\S]*?p_mutation_key text,[\s\S]*?p_service_id uuid,[\s\S]*?p_quotation_id uuid,[\s\S]*?p_invoice_type text,[\s\S]*?p_requested_amount numeric[\s\S]*?\)\s*RETURNS TABLE \(\s*reconciliation_status text,\s*invoice_id uuid,\s*invoice_number text\s*\)/i);
  assert.match(migrationSql, /CREATE OR REPLACE FUNCTION public\.create_invoice_atomic\([\s\S]*?p_mutation_key text,[\s\S]*?p_invoice_date date DEFAULT CURRENT_DATE,[\s\S]*?p_due_date date DEFAULT CURRENT_DATE[\s\S]*?\)\s*RETURNS TABLE \(\s*error_code text,\s*invoice_id uuid,\s*invoice_number text,\s*is_replayed boolean\s*\)/i);
  assert.match(migrationSql, /CREATE OR REPLACE FUNCTION public\.create_invoice_atomic_legacy\([\s\S]*?p_mutation_key text,[\s\S]*?p_mutation_payload jsonb,[\s\S]*?p_invoice_date date DEFAULT CURRENT_DATE,[\s\S]*?p_due_date date DEFAULT CURRENT_DATE[\s\S]*?\)/i);

  // Immutability trigger checks
  assert.match(migrationSql, /OLD\.mutation_key IS DISTINCT FROM NEW\.mutation_key/i);
  assert.match(migrationSql, /OLD\.mutation_payload IS DISTINCT FROM NEW\.mutation_payload/i);

  // Security & Grants
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.reconcile_invoice_create_mutation[\s\S]*?TO service_role;/i);
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.create_invoice_atomic[\s\S]*?TO service_role;/i);
  assert.match(migrationSql, /REVOKE ALL ON FUNCTION public\.create_invoice_atomic_legacy[\s\S]*?FROM PUBLIC, anon, authenticated, service_role;/i);
});
