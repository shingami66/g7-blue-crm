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

type ActionScenario = {
  denyPermission: boolean;
  clientCalls: number;
  databaseCalls: number;
  insertAttempts: number;
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
      const query = {
        select(columns: string) {
          selectedColumns = columns;
          return query;
        },
        eq() {
          return query;
        },
        not() {
          return query;
        },
        is() {
          return query;
        },
        insert() {
          scenario.insertAttempts += 1;
          isInsert = true;
          return query;
        },
        async maybeSingle() {
          if (table === "company_settings") {
            return { data: { vat_mode: "not_registered" }, error: null };
          }

          if (table === "invoices" && selectedColumns === "id") {
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
      };

      return query;
    },
    rpc(name: string) {
      if (name !== "generate_document_number") {
        throw new Error(`Unexpected RPC: ${name}`);
      }

      return { data: INVOICE_NUMBER, error: null };
    },
  };
}

function startScenario(options: Partial<Pick<ActionScenario, "denyPermission" | "insertError" | "insertedInvoice">> = {}) {
  activeScenario = {
    denyPermission: options.denyPermission ?? false,
    clientCalls: 0,
    databaseCalls: 0,
    insertAttempts: 0,
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

mock.module("@/lib/auth/errors", {
  namedExports: {
    UnauthorizedError: TestUnauthorizedError,
    ForbiddenError: TestForbiddenError,
  },
});
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async () => {
      const scenario = currentScenario();
      scenario.operations.push("permission");

      if (scenario.denyPermission) {
        throw new TestForbiddenError("Denied by test scenario");
      }

      return { clerk_user_id: "test-user" };
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
    buildInvoiceSnapshotData: () => ({
      snapshot_seller: { source: "test" },
      snapshot_buyer: { source: "test" },
      snapshot_quotation: { source: "test" },
      snapshot_bank_details: { source: "test" },
      snapshot_document_rules: { source: "test" },
      vat_mode: "not_registered",
      vat_rate: 0,
      document_label: "Commercial Invoice",
    }),
  },
});
mock.module("../approved-billing-scopes/queries.ts", {
  namedExports: {
    getActiveApprovedBillingScopeForService: async () => null,
  },
});

const { createInvoiceAction } = await import("./actions.ts");

test("createInvoiceAction rejects forbidden users before creating a privileged client", async () => {
  const scenario = startScenario({ denyPermission: true });

  const result = await createInvoiceAction(validInput());

  assert.deepEqual(result, { success: false, error: "Forbidden" });
  assert.deepEqual(scenario.operations, ["permission"]);
  assert.equal(scenario.clientCalls, 0);
  assert.equal(scenario.databaseCalls, 0);
  assert.equal(scenario.insertAttempts, 0);
});

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
