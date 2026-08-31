import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

const testModuleLoader = `
  export async function resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { url: "data:text/javascript,export default {}", shortCircuit: true };
    }
    if (specifier === "next/cache") {
      return { url: "data:text/javascript,export function revalidatePath(path) { globalThis.__lastRevalidatedPaths = globalThis.__lastRevalidatedPaths || []; globalThis.__lastRevalidatedPaths.push(path); }", shortCircuit: true };
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
  authError: "unauthorized" | "forbidden" | "unexpected" | null;
  permissionCalls: string[];
  rateLimitAllowed: boolean;
  serviceRecord: {
    id: string;
    serviceNumber: string;
    serviceTitle: string;
    status: string;
    eventStartDate?: string | null;
    eventEndDate?: string | null;
  } | null;
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  rpcData: unknown;
  rpcError: { message: string } | null;
};

let scenarioState: ScenarioState = {
  authError: null,
  permissionCalls: [],
  rateLimitAllowed: true,
  serviceRecord: {
    id: "11111111-1111-4111-8111-111111111111",
    serviceNumber: "SRV-2026-0001",
    serviceTitle: "Test Service",
    status: "Inquiry",
    eventStartDate: "2026-09-01",
    eventEndDate: "2026-09-05",
  },
  rpcCalls: [],
  rpcData: [
    {
      error_code: null,
      quotation_id: "22222222-2222-4222-8222-222222222222",
      quotation_number: "QT-2026-0001",
      subtotal: 1000,
      discount: 100,
      vat_amount: 0,
      grand_total: 900,
      is_replayed: false,
    },
  ],
  rpcError: null,
};

function resetScenario(overrides: Partial<ScenarioState> = {}) {
  (globalThis as unknown as { __lastRevalidatedPaths?: string[] }).__lastRevalidatedPaths = [];
  scenarioState = {
    authError: null,
    permissionCalls: [],
    rateLimitAllowed: true,
    serviceRecord: {
      id: "11111111-1111-4111-8111-111111111111",
      serviceNumber: "SRV-2026-0001",
      serviceTitle: "Test Service",
      status: "Inquiry",
      eventStartDate: "2026-09-01",
      eventEndDate: "2026-09-05",
    },
    rpcCalls: [],
    rpcData: [
      {
        error_code: null,
        quotation_id: "22222222-2222-4222-8222-222222222222",
        quotation_number: "QT-2026-0001",
        subtotal: 1000,
        discount: 100,
        vat_amount: 0,
        grand_total: 900,
        is_replayed: false,
      },
    ],
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
      if (scenarioState.authError === "unexpected") {
        throw new Error("Unexpected database fault during auth");
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

mock.module("@/lib/security/rate-limit", {
  namedExports: {
    consumeRateLimit: () => scenarioState.rateLimitAllowed,
  },
});

mock.module("@/lib/services/queries", {
  namedExports: {
    getServiceById: async (id: string) => {
      if (scenarioState.serviceRecord && scenarioState.serviceRecord.id === id) {
        return scenarioState.serviceRecord;
      }
      return null;
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        scenarioState.rpcCalls.push({ name, args });
        return {
          data: scenarioState.rpcData,
          error: scenarioState.rpcError,
        };
      },
    }),
  },
});

const { createQuotation, createQuotationRevision, setQuotationCommercialStructure } = await import("./actions");
const { createQuotationSchema, quotationRevisionSchema, updateQuotationSchema } = await import("./schemas");

const validQuotationInput = {
  mutation_key: "mutation-qt-001",
  service_id: "11111111-1111-4111-8111-111111111111",
  event: "Annual Gala",
  date: "2026-08-20",
  valid_until: "2026-08-30",
  discount: 100,
  items: [
    {
      description: "Audio Setup",
      details: "Full speaker array",
      category: "AV",
      qty: 1,
      unit_price: 1000,
    },
  ],
};

const validRevisionInput = {
  revision_reason: "Customer requested a revised commercial scope",
  mutation_key: "revision-qt-001",
};

test("createQuotationSchema requires mutation_key", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    mutation_key: undefined,
  });
  assert.strictEqual(result.success, false);
});

test("createQuotationSchema trims whitespace-only mutation_key and fails min length", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    mutation_key: "   ",
  });
  assert.strictEqual(result.success, false);
});

test("createQuotationSchema trims mutation_key with surrounding spaces", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    mutation_key: "  valid-key  ",
  });
  assert.strictEqual(result.success, true);
  if (result.success) {
    assert.strictEqual(result.data.mutation_key, "valid-key");
  }
});

test("createQuotationSchema rejects empty items", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    items: [],
  });
  assert.strictEqual(result.success, false);
});

test("createQuotationSchema rejects item with non-positive qty", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    items: [
      {
        description: "Test Item",
        qty: 0,
        unit_price: 100,
      },
    ],
  });
  assert.strictEqual(result.success, false);
});

test("createQuotationSchema rejects item with negative unit price", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    items: [
      {
        description: "Test Item",
        qty: 1,
        unit_price: -10,
      },
    ],
  });
  assert.strictEqual(result.success, false);
});

test("createQuotationSchema rejects invalid valid_until before date", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    date: "2026-08-25",
    valid_until: "2026-08-20",
  });
  assert.strictEqual(result.success, false);
});

test("createQuotationSchema accepts valid_until equal to date", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    date: "2026-08-20",
    valid_until: "2026-08-20",
  });
  assert.strictEqual(result.success, true);
});

test("createQuotationSchema accepts null valid_until", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    valid_until: null,
  });
  assert.strictEqual(result.success, true);
});

test("createQuotationSchema rejects negative discount", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    discount: -50,
  });
  assert.strictEqual(result.success, false);
});

test("createQuotationSchema rejects non-uuid service_id", () => {
  const result = createQuotationSchema.safeParse({
    ...validQuotationInput,
    service_id: "invalid-uuid",
  });
  assert.strictEqual(result.success, false);
});

test("updateQuotationSchema rejects unknown keys like mutation_key in strict mode", () => {
  const result = updateQuotationSchema.safeParse({
    event: "Updated Event",
    date: "2026-08-21",
    items: [
      {
        description: "Sound System",
        qty: 1,
        unit_price: 500,
      },
    ],
    mutation_key: "unexpected-key",
  });
  assert.strictEqual(result.success, false);
});

test("quotationRevisionSchema requires a bounded reason and mutation key", () => {
  assert.equal(quotationRevisionSchema.safeParse({ revision_reason: "", mutation_key: "key" }).success, false);
  assert.equal(quotationRevisionSchema.safeParse({ revision_reason: "Reason", mutation_key: "" }).success, false);
  const result = quotationRevisionSchema.safeParse({
    revision_reason: "  Reason  ",
    mutation_key: "  key-1  ",
  });
  assert.equal(result.success, true);
  if (result.success) {
    assert.equal(result.data.revision_reason, "Reason");
    assert.equal(result.data.mutation_key, "key-1");
  }
});

test("createQuotation rejects when unauthorized", async () => {
  resetScenario({ authError: "unauthorized" });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "UNAUTHORIZED");
});

test("createQuotationRevision denies before any RPC when unauthorized", async () => {
  resetScenario({ authError: "unauthorized" });
  const res = await createQuotationRevision("33333333-3333-4333-8333-333333333333", validRevisionInput);
  assert.equal(res.success, false);
  assert.equal(res.code, "UNAUTHORIZED");
  assert.equal(scenarioState.rpcCalls.length, 0);
});

test("createQuotationRevision rejects malformed input before any RPC", async () => {
  resetScenario();
  const res = await createQuotationRevision("33333333-3333-4333-8333-333333333333", {
    revision_reason: "",
    mutation_key: "revision-qt-001",
  });
  assert.equal(res.success, false);
  assert.equal(res.code, "INVALID_INPUT");
  assert.equal(scenarioState.rpcCalls.length, 0);
});

test("createQuotationRevision passes the existing authorization context and returns lineage evidence", async () => {
  resetScenario({
    rpcData: [{
      error_code: null,
      quotation_id: "44444444-4444-4444-8444-444444444444",
      quotation_number: "QT-2026-0002",
      source_quotation_id: "33333333-3333-4333-8333-333333333333",
      quotation_family_id: "55555555-5555-4555-8555-555555555555",
      revision_number: 2,
      service_id: "11111111-1111-4111-8111-111111111111",
      is_replayed: false,
    }],
  });
  const sourceId = "33333333-3333-4333-8333-333333333333";
  const res = await createQuotationRevision(sourceId, validRevisionInput);
  assert.equal(res.success, true);
  assert.deepEqual(scenarioState.permissionCalls, ["quotations:write", "services:read"]);
  assert.deepEqual(scenarioState.rpcCalls, [{
    name: "create_quotation_revision",
    args: {
      p_source_quotation_id: sourceId,
      p_revision_reason: validRevisionInput.revision_reason,
      p_mutation_key: validRevisionInput.mutation_key,
      p_user_id: "clerk_test_user",
    },
  }]);
  if (res.success) {
    assert.deepEqual(res.data, {
      quotation_id: "44444444-4444-4444-8444-444444444444",
      quotation_number: "QT-2026-0002",
      source_quotation_id: sourceId,
      quotation_family_id: "55555555-5555-4555-8555-555555555555",
      revision_number: 2,
      service_id: "11111111-1111-4111-8111-111111111111",
      is_replayed: false,
    });
  }
  assert.deepEqual((globalThis as unknown as { __lastRevalidatedPaths: string[] }).__lastRevalidatedPaths, [
    "/quotations",
    `/quotations/${sourceId}`,
    "/quotations/44444444-4444-4444-8444-444444444444",
    "/services/11111111-1111-4111-8111-111111111111",
  ]);
});

test("createQuotationRevision fails closed for approved sources and mutation conflicts", async () => {
  resetScenario({ rpcData: [{ error_code: "quotation_revision_approved_not_allowed" }] });
  const approved = await createQuotationRevision("33333333-3333-4333-8333-333333333333", validRevisionInput);
  assert.equal(approved.success, false);
  assert.equal(approved.code, "REVISION_FAILED");
  assert.equal(approved.error, "Approved quotations cannot be revised in this workflow.");

  resetScenario({ rpcData: [{ error_code: "mutation_key_conflict" }] });
  const conflict = await createQuotationRevision("33333333-3333-4333-8333-333333333333", validRevisionInput);
  assert.equal(conflict.success, false);
  assert.equal(conflict.code, "MUTATION_KEY_CONFLICT");
});

test("createQuotation rejects when forbidden", async () => {
  resetScenario({ authError: "forbidden" });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "FORBIDDEN");
});

test("createQuotation rejects when rate limited", async () => {
  resetScenario({ rateLimitAllowed: false });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "RATE_LIMITED");
});

test("createQuotation rejects invalid schema input", async () => {
  resetScenario();
  const res = await createQuotation({ ...validQuotationInput, mutation_key: "" });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "INVALID_INPUT");
});

test("createQuotation rejects when service not found", async () => {
  resetScenario({ serviceRecord: null });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "SERVICE_UNAVAILABLE");
});

test("createQuotation rejects when service status is not Inquiry or Quoted", async () => {
  resetScenario({
    serviceRecord: {
      id: "11111111-1111-4111-8111-111111111111",
      serviceNumber: "SRV-2026-0001",
      serviceTitle: "Test Service",
      status: "Confirmed",
      eventStartDate: "2026-09-01",
      eventEndDate: "2026-09-05",
    },
  });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "SERVICE_STATUS_INVALID");
});

test("createQuotation allows Quoted service status", async () => {
  resetScenario({
    serviceRecord: {
      id: "11111111-1111-4111-8111-111111111111",
      serviceNumber: "SRV-2026-0001",
      serviceTitle: "Test Service",
      status: "Quoted",
      eventStartDate: "2026-09-01",
      eventEndDate: "2026-09-05",
    },
  });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data?.quotation_number, "QT-2026-0001");
});

test("createQuotation rejects when service started before quotation issue date", async () => {
  resetScenario({
    serviceRecord: {
      id: "11111111-1111-4111-8111-111111111111",
      serviceNumber: "SRV-2026-0001",
      serviceTitle: "Test Service",
      status: "Inquiry",
      eventStartDate: "2026-08-10",
      eventEndDate: "2026-08-15",
    },
  });
  const res = await createQuotation({
    ...validQuotationInput,
    date: "2026-08-20",
    valid_until: "2026-08-25",
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "INVALID_VALIDITY_WINDOW");
});

test("createQuotation rejects when valid_until is after service start date", async () => {
  resetScenario({
    serviceRecord: {
      id: "11111111-1111-4111-8111-111111111111",
      serviceNumber: "SRV-2026-0001",
      serviceTitle: "Test Service",
      status: "Inquiry",
      eventStartDate: "2026-08-25",
      eventEndDate: "2026-08-30",
    },
  });
  const res = await createQuotation({
    ...validQuotationInput,
    date: "2026-08-20",
    valid_until: "2026-08-28",
  });
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "INVALID_VALIDITY_WINDOW");
});

test("createQuotation creates new quotation on first attempt with is_replayed: false", async () => {
  resetScenario();
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data?.is_replayed, false);
  assert.strictEqual(res.data?.isReplayed, false);
  assert.strictEqual(res.data?.quotation_number, "QT-2026-0001");
  assert.strictEqual(scenarioState.rpcCalls.length, 1);
  assert.strictEqual(scenarioState.rpcCalls[0].name, "create_quotation_with_items");
  const pQuotation = scenarioState.rpcCalls[0].args.p_quotation as Record<string, unknown>;
  assert.strictEqual(pQuotation.mutation_key, "mutation-qt-001");
  const paths = (globalThis as unknown as { __lastRevalidatedPaths?: string[] }).__lastRevalidatedPaths;
  assert.ok(paths?.includes("/quotations"));
  assert.ok(paths?.includes(`/services/${validQuotationInput.service_id}`));
});

test("createQuotation re-returns original quotation on replay with is_replayed: true", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: null,
        quotation_id: "22222222-2222-4222-8222-222222222222",
        quotation_number: "QT-2026-0001",
        subtotal: 1000,
        discount: 100,
        vat_amount: 0,
        grand_total: 900,
        is_replayed: true,
      },
    ],
  });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data?.is_replayed, true);
  assert.strictEqual(res.data?.isReplayed, true);
  assert.strictEqual(res.data?.quotation_number, "QT-2026-0001");
});

test("createQuotation maps mutation_key_conflict to MUTATION_KEY_CONFLICT", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: "mutation_key_conflict",
        quotation_id: null,
        quotation_number: null,
        subtotal: null,
        discount: null,
        vat_amount: null,
        grand_total: null,
        is_replayed: false,
      },
    ],
  });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "MUTATION_KEY_CONFLICT");
  assert.match(res.error ?? "", /already exists/i);
});

test("createQuotation maps RPC error_code service_unavailable", async () => {
  resetScenario({
    rpcData: [{ error_code: "service_unavailable" }],
  });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "SERVICE_UNAVAILABLE");
});

test("createQuotation maps RPC error_code service_status_invalid", async () => {
  resetScenario({
    rpcData: [{ error_code: "service_status_invalid" }],
  });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "SERVICE_STATUS_INVALID");
});

test("createQuotation maps RPC error_code invalid_input", async () => {
  resetScenario({
    rpcData: [{ error_code: "invalid_input" }],
  });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "INVALID_INPUT");
});

test("createQuotation handles generic RPC failure", async () => {
  resetScenario({
    rpcError: { message: "Database connection failed" },
  });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "CREATE_FAILED");
});

test("createQuotation handles unexpected runtime exception", async () => {
  resetScenario({ authError: "unexpected" });
  const res = await createQuotation(validQuotationInput);
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "UNKNOWN_ERROR");
});

const validCommercialStructure = {
  lines: [
    {
      quotation_item_id: "33333333-3333-4333-8333-333333333333",
      commercial_role: "authority_line",
      is_selected: true,
      unit: "service",
      description_ar: "الخدمة",
    },
  ],
};

test("setQuotationCommercialStructure denies before any RPC", async () => {
  resetScenario({ authError: "forbidden" });
  const res = await setQuotationCommercialStructure(
    "22222222-2222-4222-8222-222222222222",
    validCommercialStructure,
  );
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "FORBIDDEN");
  assert.deepStrictEqual(scenarioState.rpcCalls, []);
});

test("setQuotationCommercialStructure rejects malformed input before any RPC", async () => {
  resetScenario();
  const res = await setQuotationCommercialStructure(
    "22222222-2222-4222-8222-222222222222",
    { lines: [{ quotation_item_id: "not-a-uuid", commercial_role: "authority_line" }] },
  );
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "INVALID_INPUT");
  assert.deepStrictEqual(scenarioState.rpcCalls, []);
});

test("setQuotationCommercialStructure maps a database error code safely", async () => {
  resetScenario({ rpcData: [{ error_code: "quotation_not_draft" }] });
  const res = await setQuotationCommercialStructure(
    "22222222-2222-4222-8222-222222222222",
    validCommercialStructure,
  );
  assert.strictEqual(res.success, false);
  assert.strictEqual(res.code, "INVALID_INPUT");
  assert.match(res.error ?? "", /draft/i);
  assert.strictEqual(scenarioState.rpcCalls[0]?.name, "set_quotation_commercial_structure");
});

test("setQuotationCommercialStructure returns authoritative totals and revalidates paths", async () => {
  resetScenario({
    rpcData: [
      {
        error_code: null,
        quotation_id: "22222222-2222-4222-8222-222222222222",
        line_count: 2,
        subtotal: 125,
        discount: 0,
        vat_amount: 0,
        grand_total: 125,
      },
    ],
  });
  const res = await setQuotationCommercialStructure(
    "22222222-2222-4222-8222-222222222222",
    validCommercialStructure,
  );
  assert.strictEqual(res.success, true);
  assert.strictEqual(res.data?.grand_total, 125);
  const paths = (globalThis as unknown as { __lastRevalidatedPaths?: string[] }).__lastRevalidatedPaths;
  assert.ok(paths?.includes("/quotations/22222222-2222-4222-8222-222222222222"));
  assert.ok(paths?.includes("/quotations"));
});

test("migration static verification: durable canonical payload, no random-UUID item order dependency", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const migrationPath = path.join(process.cwd(), "supabase/migrations/20260817120000_g8_quotation_create_replay_safety.sql");
  const sql = fs.readFileSync(migrationPath, "utf8");

  // Must have transaction envelope
  assert.match(sql, /^BEGIN;/m, "Migration must start with BEGIN;");
  assert.match(sql, /COMMIT;\s*$/m, "Migration must end with COMMIT;");

  // Must add mutation_payload column
  assert.match(sql, /ADD COLUMN IF NOT EXISTS mutation_payload jsonb/i, "Migration must add mutation_payload jsonb");

  // Must NOT reconstruct canonical items using random UUID ordering
  assert.doesNotMatch(sql, /ORDER BY\s+qi\.id/i, "Replay comparison must NOT order items by random quotation_items.id UUID");
  assert.doesNotMatch(sql, /ORDER BY\s+quotation_items\.id/i, "Replay comparison must NOT order items by random quotation_items.id UUID");

  // Must store v_canonical_payload atomically on fresh insert
  assert.match(sql, /INSERT INTO public\.quotations\s*\([^)]*mutation_payload/i, "INSERT must persist mutation_payload");

  // Must compare stored mutation_payload directly on replay
  assert.match(sql, /v_existing_mutation_payload\s*=\s*v_canonical_payload/i, "Replay must compare stored mutation_payload against canonical payload");

  // Replay check must occur before document number generation
  const replayCheckIdx = sql.indexOf("v_existing_mutation_payload = v_canonical_payload");
  const docNumGenIdx = sql.indexOf("generate_document_number('quotation')");
  assert.ok(replayCheckIdx > 0 && docNumGenIdx > replayCheckIdx, "Replay check must precede document number generation");

  // Permissions must be service_role only
  assert.match(sql, /REVOKE EXECUTE ON FUNCTION public\.create_quotation_with_items/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_quotation_with_items\(jsonb, jsonb, text\) TO service_role/i);
});

test("canonical item normalization preserves caller array order and numeric semantics", () => {
  const itemA = { description: "Item A", qty: 2, unit_price: 50 };
  const itemB = { description: "Item B", qty: 1, unit_price: 100 };

  const payloadAB = {
    ...validQuotationInput,
    items: [itemA, itemB],
  };

  const parsed = createQuotationSchema.safeParse(payloadAB);
  assert.strictEqual(parsed.success, true);
  if (parsed.success) {
    assert.strictEqual(parsed.data.items[0].description, "Item A");
    assert.strictEqual(parsed.data.items[1].description, "Item B");
  }
});
