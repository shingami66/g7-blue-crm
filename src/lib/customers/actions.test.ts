import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { register } from "node:module";
import test, { mock } from "node:test";

const testModuleLoader = `
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export default {}", shortCircuit: true };
    }
    if (specifier === "next/cache") {
      return { url: "data:text/javascript,export function revalidatePath() {}", shortCircuit: true };
    }
    if (specifier.startsWith("@/")) {
      return { url: new URL("./src/" + specifier.slice(2) + ".ts", "file:///" + process.cwd().replaceAll("\\\\", "/") + "/").href, shortCircuit: true };
    }
    if (specifier.startsWith(".") && !/\\.(?:[cm]?js|tsx?|json)$/.test(specifier)) {
      return { url: new URL(specifier + ".ts", context.parentURL).href, shortCircuit: true };
    }
    return nextResolve(specifier, context);
  }
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

class TestUnauthorizedError extends Error {}
class TestForbiddenError extends Error {}

type ScenarioState = {
  authError: "unauthorized" | "forbidden" | null;
  permissionCalls: string[];
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  rpcImplementation?: (args: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>;
  rpcData: unknown;
  rpcError: { message: string } | null;
};

let scenarioState: ScenarioState = {
  authError: null,
  permissionCalls: [],
  rpcCalls: [],
  rpcData: [{ error_code: null, customer_id: "11111111-1111-4111-8111-111111111111", customer_number: "CUST-2026-0001", is_replayed: false }],
  rpcError: null,
};

function resetScenario(overrides: Partial<ScenarioState> = {}) {
  scenarioState = {
    authError: null,
    permissionCalls: [],
    rpcCalls: [],
    rpcData: [{ error_code: null, customer_id: "11111111-1111-4111-8111-111111111111", customer_number: "CUST-2026-0001", is_replayed: false }],
    rpcError: null,
    ...overrides,
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
    requirePermission: async (perm: string) => {
      scenarioState.permissionCalls.push(perm);
      if (scenarioState.authError === "unauthorized") {
        throw new TestUnauthorizedError("Sign in required");
      }
      if (scenarioState.authError === "forbidden") {
        throw new TestForbiddenError("Permission denied");
      }
      return {
        id: "user-1",
        clerk_user_id: "clerk_test_user",
        role: "admin",
        is_active: true,
      };
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        scenarioState.rpcCalls.push({ name, args });
        if (scenarioState.rpcImplementation) {
          return await scenarioState.rpcImplementation(args);
        }
        return {
          data: scenarioState.rpcData,
          error: scenarioState.rpcError,
        };
      },
    }),
  },
});

const { createCustomer } = await import("./actions.ts");

function validCustomerPayload(mutationKey = "mut-key-001") {
  return {
    company: "Alpha Enterprises",
    contact: "Alice Smith",
    phone: "+966501112233",
    email: "alice@alpha.com",
    city: "Riyadh",
    status: "active" as const,
    customer_type: "company" as const,
    legal_name: "Alpha Enterprises LLC",
    commercial_registration_number: "1010123456",
    vat_number: "300012345600003",
    mutation_key: mutationKey,
  };
}

test("G8-CUST-01: fresh-key creation invokes create_customer_atomic RPC and returns new customer", async () => {
  resetScenario({
    rpcData: [{
      error_code: null,
      customer_id: "c-1111",
      customer_number: "CUST-2026-0001",
      is_replayed: false,
    }],
  });

  const payload = validCustomerPayload("key-fresh-100");
  const result = await createCustomer(payload);

  assert.deepEqual(result, {
    success: true,
    customerId: "c-1111",
    customerNumber: "CUST-2026-0001",
    isReplayed: false,
  });

  assert.deepEqual(scenarioState.permissionCalls, ["customers:write"]);
  assert.equal(scenarioState.rpcCalls.length, 1);
  assert.equal(scenarioState.rpcCalls[0].name, "create_customer_atomic");
  assert.equal(scenarioState.rpcCalls[0].args.p_company, "Alpha Enterprises");
  assert.equal(scenarioState.rpcCalls[0].args.p_mutation_key, "key-fresh-100");
  assert.equal(scenarioState.rpcCalls[0].args.p_created_by, "clerk_test_user");
});

test("G8-CUST-02: same key + same canonical payload reconciles to original customer (replay)", async () => {
  resetScenario({
    rpcData: [{
      error_code: null,
      customer_id: "c-1111",
      customer_number: "CUST-2026-0001",
      is_replayed: true,
    }],
  });

  const payload = validCustomerPayload("key-replay-200");
  const result = await createCustomer(payload);

  assert.deepEqual(result, {
    success: true,
    customerId: "c-1111",
    customerNumber: "CUST-2026-0001",
    isReplayed: true,
  });
  assert.equal(scenarioState.rpcCalls[0].args.p_mutation_key, "key-replay-200");
});

test("G8-CUST-03: same key + different canonical payload deterministically returns conflict error", async () => {
  resetScenario({
    rpcData: [{
      error_code: "mutation_key_conflict",
      customer_id: null,
      customer_number: null,
      is_replayed: false,
    }],
  });

  const payload = validCustomerPayload("key-conflict-300");
  const result = await createCustomer(payload);

  assert.deepEqual(result, {
    success: false,
    error: "A customer creation request with this mutation key already exists with different details.",
  });
});

test("G8-CUST-04: concurrent replay simulation ensures single creation and idempotent reconciliation", async () => {
  const dbStore = new Map<string, { id: string; number: string; payload: Record<string, unknown> }>();
  let docSeq = 1;

  resetScenario({
    rpcImplementation: async (args) => {
      const key = args.p_mutation_key as string;
      if (key && dbStore.has(key)) {
        const existing = dbStore.get(key)!;
        // Compare payload
        if (existing.payload.company !== args.p_company || existing.payload.email !== args.p_email) {
          return {
            data: [{ error_code: "mutation_key_conflict", customer_id: null, customer_number: null, is_replayed: false }],
            error: null,
          };
        }
        return {
          data: [{ error_code: null, customer_id: existing.id, customer_number: existing.number, is_replayed: true }],
          error: null,
        };
      }

      const newId = `c-uuid-${docSeq}`;
      const newNum = `CUST-2026-000${docSeq++}`;
      if (key) {
        dbStore.set(key, { id: newId, number: newNum, payload: { company: args.p_company, email: args.p_email } });
      }
      return {
        data: [{ error_code: null, customer_id: newId, customer_number: newNum, is_replayed: false }],
        error: null,
      };
    },
  });

  const payload = validCustomerPayload("key-concurrent-400");

  // Call 1: fresh create
  const result1 = await createCustomer(payload);
  assert.equal(result1.success, true);
  assert.equal(result1.isReplayed, false);
  assert.equal(result1.customerId, "c-uuid-1");

  // Call 2: concurrent/retry with same key & same payload -> reconciles
  const result2 = await createCustomer(payload);
  assert.equal(result2.success, true);
  assert.equal(result2.isReplayed, true);
  assert.equal(result2.customerId, "c-uuid-1");
  assert.equal(result2.customerNumber, "CUST-2026-0001");

  // Call 3: same key with different payload -> conflict
  const result3 = await createCustomer({ ...payload, company: "Different Corp" });
  assert.equal(result3.success, false);
  assert.equal(result3.error, "A customer creation request with this mutation key already exists with different details.");
});

test("G8-CUST-05: lost-response retry returns previously created customer", async () => {
  const mutationKey = "key-lost-response-500";

  // Attempt 1: DB committed, but response was lost to client
  resetScenario({
    rpcData: [{
      error_code: null,
      customer_id: "c-durable-999",
      customer_number: "CUST-2026-0999",
      is_replayed: false,
    }],
  });
  await createCustomer(validCustomerPayload(mutationKey));

  // Attempt 2: Client retries with same mutation key -> reconciles
  resetScenario({
    rpcData: [{
      error_code: null,
      customer_id: "c-durable-999",
      customer_number: "CUST-2026-0999",
      is_replayed: true,
    }],
  });
  const retryResult = await createCustomer(validCustomerPayload(mutationKey));

  assert.equal(retryResult.success, true);
  assert.equal(retryResult.customerId, "c-durable-999");
  assert.equal(retryResult.customerNumber, "CUST-2026-0999");
  assert.equal(retryResult.isReplayed, true);
});

test("G8-CUST-06: failure before commit allows subsequent retry with same key to succeed", async () => {
  const mutationKey = "key-fail-before-commit-600";

  // Attempt 1: Transient transport failure before DB commit
  resetScenario({
    rpcError: { message: "Connection reset by peer" },
  });
  const failResult = await createCustomer(validCustomerPayload(mutationKey));
  assert.deepEqual(failResult, {
    success: false,
    error: "Failed to create customer. Please try again.",
  });

  // Attempt 2: Retry with same mutation key succeeds
  resetScenario({
    rpcData: [{
      error_code: null,
      customer_id: "c-success-600",
      customer_number: "CUST-2026-0600",
      is_replayed: false,
    }],
  });
  const successResult = await createCustomer(validCustomerPayload(mutationKey));
  assert.deepEqual(successResult, {
    success: true,
    customerId: "c-success-600",
    customerNumber: "CUST-2026-0600",
    isReplayed: false,
  });
});

test("G8-CUST-07: enforces authentication and authorization before RPC execution", async () => {
  // Unauthorized
  resetScenario({ authError: "unauthorized" });
  const unauthResult = await createCustomer(validCustomerPayload("key-auth-1"));
  assert.deepEqual(unauthResult, { success: false, error: "Unauthorized" });
  assert.equal(scenarioState.rpcCalls.length, 0);

  // Forbidden
  resetScenario({ authError: "forbidden" });
  const forbidResult = await createCustomer(validCustomerPayload("key-auth-2"));
  assert.deepEqual(forbidResult, { success: false, error: "Forbidden" });
  assert.equal(scenarioState.rpcCalls.length, 0);
});

test("G8-CUST-08: schema validation runs before RPC execution", async () => {
  resetScenario();

  // Missing company
  const invalidInput = { ...validCustomerPayload(), company: "" };
  const result = await createCustomer(invalidInput);

  assert.equal(result.success, false);
  assert.equal(result.error, "Company is required");
  assert.equal(scenarioState.rpcCalls.length, 0);

  // Invalid email
  const invalidEmailInput = { ...validCustomerPayload(), email: "not-an-email" };
  const resultEmail = await createCustomer(invalidEmailInput);

  assert.equal(resultEmail.success, false);
  assert.equal(resultEmail.error, "Invalid email address");
  assert.equal(scenarioState.rpcCalls.length, 0);
});

test("G8-CUST-09: individual customer type normalizes company billing fields", async () => {
  resetScenario({
    rpcData: [{
      error_code: null,
      customer_id: "c-indiv-1",
      customer_number: "CUST-2026-0005",
      is_replayed: false,
    }],
  });

  const payload = {
    ...validCustomerPayload("key-indiv-1"),
    customer_type: "individual" as const,
    legal_name: "Should Be Cleared",
    commercial_registration_number: "1234567890",
  };

  const result = await createCustomer(payload);
  assert.equal(result.success, true);
  assert.equal(scenarioState.rpcCalls[0].args.p_customer_type, "individual");
  assert.equal(scenarioState.rpcCalls[0].args.p_legal_name, null);
  assert.equal(scenarioState.rpcCalls[0].args.p_commercial_registration_number, null);
  assert.equal(scenarioState.rpcCalls[0].args.p_po_required, false);
});

test("G8-CUST-10: FormData input extracts mutation_key and propagates to RPC", async () => {
  resetScenario({
    rpcData: [{
      error_code: null,
      customer_id: "c-form-1",
      customer_number: "CUST-2026-0006",
      is_replayed: false,
    }],
  });

  const formData = new FormData();
  formData.set("company", "Beta Corp");
  formData.set("contact", "Bob Jones");
  formData.set("phone", "+966509998877");
  formData.set("email", "bob@beta.com");
  formData.set("city", "Jeddah");
  formData.set("status", "active");
  formData.set("mutation_key", "form-mutation-key-999");

  const result = await createCustomer(formData);
  assert.equal(result.success, true);
  assert.equal(scenarioState.rpcCalls[0].args.p_company, "Beta Corp");
  assert.equal(scenarioState.rpcCalls[0].args.p_mutation_key, "form-mutation-key-999");
});

test("G8-CUST-11: SQL migration 20260816200000_g8_customer_create_replay_safety.sql satisfies G8 contract", () => {
  const migrationSql = readFileSync(
    new URL("../../../supabase/migrations/20260816200000_g8_customer_create_replay_safety.sql", import.meta.url),
    "utf8"
  );

  // Column addition
  assert.match(migrationSql, /ALTER\s+TABLE\s+public\.customers\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s+mutation_key\s+text;/i);

  // Partial unique index
  assert.match(migrationSql, /CREATE\s+UNIQUE\s+INDEX\s+IF\s+NOT\s+EXISTS\s+idx_customers_mutation_key_unique\s+ON\s+public\.customers\s*\(\s*mutation_key\s*\)\s+WHERE\s+mutation_key\s+IS\s+NOT\s+NULL;/i);

  // Mandatory mutation_key check in input validation
  assert.match(migrationSql, /p_mutation_key\s+IS\s+NULL\s+OR\s+btrim\(p_mutation_key\)\s*=\s*''/i);

  // Advisory lock
  assert.match(migrationSql, /pg_advisory_xact_lock/i);

  // Security definer
  assert.match(migrationSql, /SECURITY\s+DEFINER/i);

  // Permission restrictions
  assert.match(migrationSql, /REVOKE\s+EXECUTE\s+ON\s+FUNCTION\s+public\.create_customer_atomic\s+FROM\s+PUBLIC;/i);
  assert.match(migrationSql, /GRANT\s+EXECUTE\s+ON\s+FUNCTION\s+public\.create_customer_atomic\s+TO\s+service_role;/i);

  // Document numbering consumed only on insert
  const generateDocIndex = migrationSql.indexOf("generate_document_number");
  const advisoryLockIndex = migrationSql.indexOf("pg_advisory_xact_lock");
  assert.ok(generateDocIndex > advisoryLockIndex, "Document number generation must occur after mutation_key check");
});

test("G8-CUST-12: missing, empty, or whitespace mutation_key is rejected before RPC execution", async () => {
  resetScenario();

  // 1. Missing mutation_key
  const payloadWithoutKey = { ...validCustomerPayload() };
  delete (payloadWithoutKey as { mutation_key?: string }).mutation_key;
  const resultMissing = await createCustomer(payloadWithoutKey);
  assert.equal(resultMissing.success, false);
  assert.equal(resultMissing.error, "Mutation key is required");
  assert.equal(scenarioState.rpcCalls.length, 0);

  // 2. Empty string mutation_key
  const resultEmpty = await createCustomer({ ...validCustomerPayload(), mutation_key: "" });
  assert.equal(resultEmpty.success, false);
  assert.equal(resultEmpty.error, "Mutation key is required");
  assert.equal(scenarioState.rpcCalls.length, 0);

  // 3. Whitespace-only mutation_key
  const resultWhitespace = await createCustomer({ ...validCustomerPayload(), mutation_key: "   " });
  assert.equal(resultWhitespace.success, false);
  assert.equal(resultWhitespace.error, "Mutation key is required");
  assert.equal(scenarioState.rpcCalls.length, 0);
});
