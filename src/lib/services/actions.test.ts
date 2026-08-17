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
  rpcData: [{ error_code: null, service_id: "22222222-2222-4222-8222-222222222222", service_number: "SRV-2026-0001", is_replayed: false }],
  rpcError: null,
};

function resetScenario(overrides: Partial<ScenarioState> = {}) {
  scenarioState = {
    authError: null,
    permissionCalls: [],
    rpcCalls: [],
    rpcData: [{ error_code: null, service_id: "22222222-2222-4222-8222-222222222222", service_number: "SRV-2026-0001", is_replayed: false }],
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

const { createService } = await import("./actions");
const { createServiceSchema } = await import("./schemas");

const validPayload = {
  mutation_key: "srv_mut_key_12345",
  customer_id: "11111111-1111-4111-8111-111111111111",
  service_title: "Corporate Annual Gala 2026",
  event_name: "Annual Gala",
  event_type: "Conference",
  event_start_date: "2026-09-01",
  event_end_date: "2026-09-03",
  event_location: "Riyadh Exhibition Center",
  description: "Comprehensive event catering and setup",
  estimated_budget: 150000,
};

test("G8-SRV-01: fresh-key Service creation calls create_service_atomic RPC and returns new service", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: null,
        service_id: "22222222-2222-4222-8222-222222222222",
        service_number: "SRV-2026-0001",
        is_replayed: false,
      },
    ],
  });

  const result = await createService(validPayload);

  assert.equal(result.success, true);
  assert.equal(result.data?.id, "22222222-2222-4222-8222-222222222222");
  assert.equal(result.data?.serviceNumber, "SRV-2026-0001");
  assert.equal(result.data?.isReplayed, false);
  assert.equal(scenarioState.rpcCalls.length, 1);
  assert.equal(scenarioState.rpcCalls[0].name, "create_service_atomic");
  assert.equal(scenarioState.rpcCalls[0].args.p_mutation_key, "srv_mut_key_12345");
  assert.equal(scenarioState.rpcCalls[0].args.p_customer_id, "11111111-1111-4111-8111-111111111111");
  assert.equal(scenarioState.rpcCalls[0].args.p_service_title, "Corporate Annual Gala 2026");
  assert.equal(scenarioState.rpcCalls[0].args.p_created_by, "clerk_test_user");
});

test("G8-SRV-02: same key + same canonical payload reconciles to original service with isReplayed: true", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: null,
        service_id: "22222222-2222-4222-8222-222222222222",
        service_number: "SRV-2026-0001",
        is_replayed: true,
      },
    ],
  });

  const result = await createService(validPayload);

  assert.equal(result.success, true);
  assert.equal(result.data?.id, "22222222-2222-4222-8222-222222222222");
  assert.equal(result.data?.serviceNumber, "SRV-2026-0001");
  assert.equal(result.data?.isReplayed, true);
});

test("G8-SRV-03: same key + different canonical payload returns deterministic conflict error", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: "mutation_key_conflict",
        service_id: null,
        service_number: null,
        is_replayed: false,
      },
    ],
  });

  const result = await createService({
    ...validPayload,
    service_title: "Different Title Same Key",
  });

  assert.equal(result.success, false);
  assert.equal(result.code, "MUTATION_KEY_CONFLICT");
  assert.match(result.error ?? "", /mutation key already exists with different details/i);
});

test("G8-SRV-04: concurrent replay simulation ensures single logical creation and idempotent reconciliation", async () => {
  let createdCount = 0;
  resetScenario({
    rpcImplementation: async (args) => {
      if (args.p_mutation_key === "concurrent_key_1") {
        if (createdCount === 0) {
          createdCount++;
          return {
            data: [
              {
                error_code: null,
                service_id: "33333333-3333-4333-8333-333333333333",
                service_number: "SRV-2026-0002",
                is_replayed: false,
              },
            ],
            error: null,
          };
        }
        return {
          data: [
            {
              error_code: null,
              service_id: "33333333-3333-4333-8333-333333333333",
              service_number: "SRV-2026-0002",
              is_replayed: true,
            },
          ],
          error: null,
        };
      }
      return { data: [], error: { message: "unexpected key" } };
    },
  });

  const payload = { ...validPayload, mutation_key: "concurrent_key_1" };
  const [res1, res2] = await Promise.all([createService(payload), createService(payload)]);

  assert.equal(res1.success, true);
  assert.equal(res2.success, true);
  assert.equal(res1.data?.id, res2.data?.id);
  assert.equal(res1.data?.serviceNumber, res2.data?.serviceNumber);
  const replayedCount = [res1.data?.isReplayed, res2.data?.isReplayed].filter(Boolean).length;
  assert.equal(replayedCount, 1);
});

test("G8-SRV-05: lost-response retry returns original service without duplicate creation", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: null,
        service_id: "44444444-4444-4444-8444-444444444444",
        service_number: "SRV-2026-0003",
        is_replayed: true,
      },
    ],
  });

  const retryResult = await createService({ ...validPayload, mutation_key: "lost_response_key" });

  assert.equal(retryResult.success, true);
  assert.equal(retryResult.data?.id, "44444444-4444-4444-8444-444444444444");
  assert.equal(retryResult.data?.serviceNumber, "SRV-2026-0003");
  assert.equal(retryResult.data?.isReplayed, true);
});

test("G8-SRV-06: failure before commit allows subsequent retry with same key to succeed", async () => {
  let attempt = 0;
  resetScenario({
    rpcImplementation: async () => {
      attempt++;
      if (attempt === 1) {
        return { data: null, error: { message: "Connection reset by peer" } };
      }
      return {
        data: [
          {
            error_code: null,
            service_id: "55555555-5555-4555-8555-555555555555",
            service_number: "SRV-2026-0004",
            is_replayed: false,
          },
        ],
        error: null,
      };
    },
  });

  const firstAttempt = await createService(validPayload);
  assert.equal(firstAttempt.success, false);
  assert.equal(firstAttempt.code, "GENERIC_FAILURE");

  const secondAttempt = await createService(validPayload);
  assert.equal(secondAttempt.success, true);
  assert.equal(secondAttempt.data?.id, "55555555-5555-4555-8555-555555555555");
  assert.equal(secondAttempt.data?.isReplayed, false);
});

test("G8-SRV-07: fresh distinct key creates a distinct new service", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: null,
        service_id: "66666666-6666-4666-8666-666666666666",
        service_number: "SRV-2026-0005",
        is_replayed: false,
      },
    ],
  });

  const result = await createService({ ...validPayload, mutation_key: "srv_fresh_key_999" });

  assert.equal(result.success, true);
  assert.equal(result.data?.id, "66666666-6666-4666-8666-666666666666");
  assert.equal(result.data?.serviceNumber, "SRV-2026-0005");
  assert.equal(result.data?.isReplayed, false);
});

test("G8-SRV-08: missing, undefined, or empty mutation_key is rejected before RPC execution", async () => {
  resetScenario();

  const missingKeyPayload = { ...validPayload };
  delete (missingKeyPayload as Record<string, unknown>).mutation_key;
  const resMissing = await createService(missingKeyPayload);
  assert.equal(resMissing.success, false);
  assert.equal(resMissing.code, "INVALID_INPUT");
  assert.match(resMissing.error ?? "", /mutation key is required/i);

  const emptyKeyPayload = { ...validPayload, mutation_key: "" };
  const resEmpty = await createService(emptyKeyPayload);
  assert.equal(resEmpty.success, false);
  assert.equal(resEmpty.code, "INVALID_INPUT");
  assert.match(resEmpty.error ?? "", /mutation key is required/i);

  const whitespaceKeyPayload = { ...validPayload, mutation_key: "   " };
  const resWhitespace = await createService(whitespaceKeyPayload);
  assert.equal(resWhitespace.success, false);
  assert.equal(resWhitespace.code, "INVALID_INPUT");
  assert.match(resWhitespace.error ?? "", /mutation key is required/i);

  assert.equal(scenarioState.rpcCalls.length, 0);
});

test("G8-SRV-09: schema validation rejects invalid service input without invoking RPC", async () => {
  resetScenario();

  const invalidTitlePayload = { ...validPayload, service_title: "" };
  const resTitle = await createService(invalidTitlePayload);
  assert.equal(resTitle.success, false);
  assert.equal(resTitle.code, "INVALID_INPUT");

  const invalidCustomerPayload = { ...validPayload, customer_id: "not-a-uuid" };
  const resCust = await createService(invalidCustomerPayload);
  assert.equal(resCust.success, false);
  assert.equal(resCust.code, "INVALID_INPUT");

  const invalidDateRange = {
    ...validPayload,
    event_start_date: "2026-09-10",
    event_end_date: "2026-09-01",
  };
  const resDate = await createService(invalidDateRange);
  assert.equal(resDate.success, false);
  assert.equal(resDate.code, "INVALID_INPUT");

  assert.equal(scenarioState.rpcCalls.length, 0);
});

test("G8-SRV-10: enforces services:write permission gate and handles unauthorized/forbidden errors", async () => {
  resetScenario({ authError: "unauthorized" });
  const resUnauth = await createService(validPayload);
  assert.equal(resUnauth.success, false);
  assert.equal(resUnauth.code, "UNAUTHORIZED");
  assert.equal(scenarioState.permissionCalls.includes("services:write"), true);
  assert.equal(scenarioState.rpcCalls.length, 0);

  resetScenario({ authError: "forbidden" });
  const resForbidden = await createService(validPayload);
  assert.equal(resForbidden.success, false);
  assert.equal(resForbidden.code, "FORBIDDEN");
  assert.equal(scenarioState.rpcCalls.length, 0);
});

test("G8-SRV-11: handles customer_unavailable error from RPC when customer is inactive or deleted", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: "customer_unavailable",
        service_id: null,
        service_number: null,
        is_replayed: false,
      },
    ],
  });

  const result = await createService(validPayload);

  assert.equal(result.success, false);
  assert.equal(result.code, "CUSTOMER_UNAVAILABLE");
  assert.match(result.error ?? "", /Selected customer is unavailable/i);
});

test("G8-SRV-12: createServiceSchema enforces initial status Inquiry and trims string fields", () => {
  const parsed = createServiceSchema.parse({
    mutation_key: "  test_key_123  ",
    customer_id: "11111111-1111-4111-8111-111111111111",
    service_title: "  Event Setup  ",
    event_name: "  Launch Party  ",
  });

  assert.equal(parsed.mutation_key, "test_key_123");
  assert.equal(parsed.service_title, "Event Setup");
  assert.equal(parsed.event_name, "Launch Party");
  assert.equal(parsed.status, "Inquiry");
});

test("G8-SRV-13: ServiceForm UI component propagates mutation key and handles retry preservation", () => {
  const formCode = readFileSync("src/app/(dashboard)/services/new/ServiceForm.tsx", "utf8");

  assert.match(formCode, /generateMutationKey/);
  assert.match(formCode, /mutationKey/);
  assert.match(formCode, /mutation_key:\s*mutationKey/);
});

test("G8-SRV-14: Migration SQL invariants - table qualified RETURNING, advisory lock, and permissions", () => {
  const migrationSql = readFileSync(
    "supabase/migrations/20260817100000_g8_service_create_replay_safety.sql",
    "utf8"
  );

  // Explicit transaction envelope
  assert.match(migrationSql, /^BEGIN;/m);
  assert.match(migrationSql, /^COMMIT;/m);

  // Column and unique index
  assert.match(migrationSql, /ALTER TABLE public\.services ADD COLUMN mutation_key text/);
  assert.match(migrationSql, /CREATE UNIQUE INDEX IF NOT EXISTS idx_services_mutation_key_unique/);

  // Function signature and security
  assert.match(migrationSql, /CREATE OR REPLACE FUNCTION public\.create_service_atomic/);
  assert.match(migrationSql, /SECURITY DEFINER/);
  assert.match(migrationSql, /SET search_path = pg_catalog, public/);

  // Advisory lock
  assert.match(migrationSql, /pg_catalog\.pg_advisory_xact_lock/);

  // Qualified RETURNING clause to prevent PL/pgSQL variable collision
  assert.match(migrationSql, /RETURNING services\.id,\s*services\.service_number/);

  // Customer active check
  assert.match(migrationSql, /WHERE c\.id = p_customer_id\s+AND c\.status = 'active'/);

  // Default initial status 'Inquiry'
  assert.match(migrationSql, /'Inquiry'/);

  // Strict role permissions
  assert.match(migrationSql, /REVOKE EXECUTE ON FUNCTION public\.create_service_atomic FROM PUBLIC/);
  assert.match(migrationSql, /REVOKE EXECUTE ON FUNCTION public\.create_service_atomic FROM anon/);
  assert.match(migrationSql, /REVOKE EXECUTE ON FUNCTION public\.create_service_atomic FROM authenticated/);
  assert.match(migrationSql, /GRANT EXECUTE ON FUNCTION public\.create_service_atomic TO service_role/);
});

test("G8-SRV-15: getCreateServiceErrorMessage maps MUTATION_KEY_CONFLICT to dedicated localized messages in EN and AR", async () => {
  const { getCreateServiceErrorMessage, getEditServiceErrorMessage } = await import("@/lib/i18n/service-action-feedback");
  const { getServicesDictionary } = await import("@/lib/i18n/dictionaries/services");

  const dictEn = getServicesDictionary("en");
  const dictAr = getServicesDictionary("ar");

  const msgEn = getCreateServiceErrorMessage("MUTATION_KEY_CONFLICT", dictEn);
  assert.equal(msgEn, dictEn.actionErrors.mutationKeyConflict);
  assert.match(msgEn, /already exists/i);

  const msgAr = getCreateServiceErrorMessage("MUTATION_KEY_CONFLICT", dictAr);
  assert.equal(msgAr, dictAr.actionErrors.mutationKeyConflict);

  // Ordinary STATUS_CONFLICT in edit flow remains distinct
  const editConflictEn = getEditServiceErrorMessage("STATUS_CONFLICT", dictEn);
  assert.equal(editConflictEn, dictEn.actionErrors.statusConflict);
  assert.notEqual(editConflictEn, msgEn);
});
