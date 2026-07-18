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
const ACTOR_CLERK_USER_ID = "test-user";

class TestUnauthorizedError extends Error {}
class TestForbiddenError extends Error {}

type RpcTransportError = { message: string } | null;

type AtomicRpcRow = {
  error_code: string | null;
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
  p_invoice_date: string;
  p_due_date: string;
};

type ActionScenario = {
  role: unknown;
  denyPermission: boolean;
  clientCalls: number;
  databaseCalls: number;
  invoiceTableCalls: number;
  invoiceInsertAttempts: number;
  documentNumberRpcCalls: number;
  atomicRpcCalls: number;
  atomicRpcArgs: AtomicRpcArgs[];
  atomicRpcData: unknown;
  atomicRpcError: RpcTransportError;
  snapshotCalls: number;
  snapshotPayloads: Array<Record<string, unknown>>;
  operations: string[];
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
            return { data: { vat_mode: "not_registered" }, error: null };
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
      | "atomicRpcData"
      | "atomicRpcError"
      | "issueInvoice"
      | "issueUpdateResult"
      | "issueUpdateError"
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
    atomicRpcCalls: 0,
    atomicRpcArgs: [],
    atomicRpcData: Object.prototype.hasOwnProperty.call(options, "atomicRpcData")
      ? options.atomicRpcData
      : [
          {
            error_code: null,
            invoice_id: INSERTED_INVOICE_ID,
            invoice_number: INVOICE_NUMBER,
          } satisfies AtomicRpcRow,
        ],
    atomicRpcError: Object.prototype.hasOwnProperty.call(options, "atomicRpcError")
      ? (options.atomicRpcError ?? null)
      : null,
    snapshotCalls: 0,
    snapshotPayloads: [],
    operations: [],
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

for (const role of ["admin", "manager"] as const) {
  test(`createInvoiceAction permits ${role} and uses one atomic RPC`, async () => {
    const scenario = startScenario({ role });

    const result = await createInvoiceAction(validInput());

    assert.deepEqual(result, {
      success: true,
      invoiceId: INSERTED_INVOICE_ID,
      invoiceNumber: INVOICE_NUMBER,
    });
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

test("createInvoiceAction Deposit routes through create_invoice_atomic with locked args", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction(validInput());

  assert.equal(result.success, true);
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
  });
  assert.equal(scenario.atomicRpcCalls, 1);
  assert.equal(scenario.atomicRpcArgs[0]?.p_invoice_type, "final");
  assert.equal(scenario.atomicRpcArgs[0]?.p_requested_amount, null);
  assertNoDirectCreateWrite(scenario);
});

test("createInvoiceAction returns RPC invoice identity without a second create write", async () => {
  const scenario = startScenario({
    atomicRpcData: [
      {
        error_code: null,
        invoice_id: "00000000-0000-4000-8000-000000000099",
        invoice_number: "INV-2026-0099",
      },
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: true,
    invoiceId: "00000000-0000-4000-8000-000000000099",
    invoiceNumber: "INV-2026-0099",
  });
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

test("createInvoiceAction maps RPC error_code without insert or numbering writes", async () => {
  const scenario = startScenario({
    atomicRpcData: [
      {
        error_code: "deposit_amount_exceeds_remaining",
        invoice_id: null,
        invoice_number: null,
      },
    ],
  });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, {
    success: false,
    error: "deposit_amount_exceeds_remaining",
  });
  assert.equal(scenario.atomicRpcCalls, 1);
  assertNoDirectCreateWrite(scenario);
});

for (const errorCode of [
  "invalid_invoice_input",
  "quotation_not_approved",
  "quotation_service_mismatch",
  "service_not_eligible_for_deposit",
  "service_not_eligible_for_final",
  "billing_scope_inactive",
  "billing_scope_authority_unavailable",
  "invoice_exposure_unavailable",
  "deposit_invoice_already_exists",
  "final_invoice_already_exists",
  "prior_invoices_exceed_billing_scope_ceiling",
  "prior_invoices_exceed_quotation_total",
  "invoice_number_unavailable",
  "invoice_customer_unavailable",
  "invoice_insert_failed",
] as const) {
  test(`createInvoiceAction surfaces RPC error_code ${errorCode}`, async () => {
    const scenario = startScenario({
      atomicRpcData: [
        {
          error_code: errorCode,
          invoice_id: null,
          invoice_number: null,
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
      },
      {
        error_code: null,
        invoice_id: INSERTED_INVOICE_ID,
        invoice_number: INVOICE_NUMBER,
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
  assert.equal(scenario.atomicRpcCalls, 0);
  assert.equal(scenario.clientCalls, 0);
});

test("createInvoiceAction rejects missing Deposit amount before RPC", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction({
    quotationId: QUOTATION_ID,
    serviceId: SERVICE_ID,
    invoiceType: "deposit",
  });

  assert.deepEqual(result, {
    success: false,
    error: "deposit_amount_required",
  });
  assert.equal(scenario.atomicRpcCalls, 0);
});

test("createInvoiceAction rejects invalid schema input before privileged client", async () => {
  const scenario = startScenario();

  const result = await createInvoiceAction({
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

test("issueInvoiceAction issues a draft invoice", async () => {
  const scenario = startScenario();

  const result = await issueInvoiceAction(INSERTED_INVOICE_ID);

  assert.deepEqual(result, { success: true });
  assert.equal(scenario.invoiceTableCalls >= 1, true);
  assert.equal(scenario.atomicRpcCalls, 0);
});
