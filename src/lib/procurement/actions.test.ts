import assert from "node:assert/strict";
import { register } from "node:module";
import test, { mock } from "node:test";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const REQUIREMENT_ID = "22222222-2222-4222-8222-222222222222";
const SUPPLIER_ID = "33333333-3333-4333-8333-333333333333";
const REQUEST_ID = "44444444-4444-4444-8444-444444444444";

type Scenario = {
  denyPermission: boolean;
  permissionCalls: string[];
  rpcCalls: Array<{ name: string; args: Record<string, unknown> }>;
  rpcData: unknown;
  rpcError: { message: string } | null;
  existingCandidate?: { quoted_amount: number | string | null; comparison_notes: string | null } | null;
};

let activeScenario: Scenario | null = null;

class TestForbiddenError extends Error {}
class TestUnauthorizedError extends Error {}

function scenario(): Scenario {
  if (!activeScenario) throw new Error("Procurement scenario was not configured");
  return activeScenario;
}

function startScenario(overrides: Partial<Scenario> = {}) {
  activeScenario = {
    denyPermission: false,
    permissionCalls: [],
    rpcCalls: [],
    rpcData: [{
      error_code: null,
      requirement_id: REQUIREMENT_ID,
      supplier_id: SUPPLIER_ID,
      selected_supplier_id: SUPPLIER_ID,
      service_id: SERVICE_ID,
      selection_status: "selected",
      idempotent_replay: false,
    }],
    rpcError: null,
    existingCandidate: null,
    ...overrides,
  };
  return activeScenario;
}

const testModuleLoader = `
  export async function resolve(specifier, context, nextResolve) {
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

mock.module("@/lib/auth/errors", {
  namedExports: { ForbiddenError: TestForbiddenError, UnauthorizedError: TestUnauthorizedError },
});
mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      const active = scenario();
      active.permissionCalls.push(permission);
      if (active.denyPermission) throw new TestForbiddenError("denied");
      return { clerk_user_id: "server-derived-actor", role: "manager" };
    },
  },
});
mock.module("@/lib/documents/storage", {
  namedExports: {
    cleanupUploadedPrivateBusinessDocument: async () => true,
    preflightPrivateBusinessDocumentUpload: async () => undefined,
    createPrivateBusinessDocumentUrlForService: async () => ({ signedUrl: "https://example.invalid/private" }),
    uploadPrivateBusinessDocument: async () => ({ id: "55555555-5555-4555-8555-555555555555", object_path: "test/path" }),
  },
});
mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      from: () => ({
        select: () => ({
          eq: () => ({
            eq: () => ({
              maybeSingle: async () => ({
                data: scenario().existingCandidate ?? null,
                error: null,
              }),
            }),
          }),
        }),
      }),
      rpc: async (name: string, args: Record<string, unknown>) => {
        scenario().rpcCalls.push({ name, args });
        return { data: scenario().rpcData, error: scenario().rpcError };
      },
    }),
  },
});

const {
  selectProcurementSupplier,
  upsertProcurementCandidate,
  upsertProcurementRequirement,
} = await import("./actions.ts");

test("procurement actions derive actor identity and send bounded RPC payloads", async () => {
  const active = startScenario();

  const requirement = await upsertProcurementRequirement({
    serviceId: SERVICE_ID,
    requirement: "Two event ushers",
    sourcingPath: "source",
    sourcingReason: "External coverage is needed.",
    sourcingEvidence: "Operations request OPS-42",
    requestId: REQUEST_ID,
  });
  const candidate = await upsertProcurementCandidate({
    requirementId: REQUIREMENT_ID,
    supplierId: SUPPLIER_ID,
    offerSummary: "Availability confirmed.",
    evidenceRef: "supplier-quote-17",
    quotedAmount: "1250.50",
    comparisonNotes: "Earliest availability.",
    requestId: REQUEST_ID,
  });
  const selection = await selectProcurementSupplier({
    requirementId: REQUIREMENT_ID,
    supplierId: SUPPLIER_ID,
    selectionReason: "Best documented fit.",
    selectionEvidence: "Comparison record COMP-9",
    requestId: REQUEST_ID,
  });

  assert.equal(requirement.success, true);
  assert.equal(candidate.success, true);
  assert.equal(selection.success, true);
  assert.deepEqual(active.permissionCalls, [
    "supplier_costing:write",
    "supplier_costing:write",
    "supplier_costing:write",
  ]);
  assert.deepEqual(active.rpcCalls.map((call) => call.name), [
    "upsert_service_procurement_requirement",
    "upsert_service_procurement_candidate",
    "select_service_procurement_supplier",
  ]);
  assert.equal(active.rpcCalls[0]?.args.p_actor_id, "server-derived-actor");
  assert.equal(active.rpcCalls[0]?.args.p_actor_role, "manager");
  assert.equal(active.rpcCalls[1]?.args.p_quoted_amount, 1250.5);
  assert.equal(active.rpcCalls[2]?.args.p_selection_evidence, "Comparison record COMP-9");
});

test("procurement actions validate before any database client call", async () => {
  const active = startScenario();
  const result = await upsertProcurementCandidate({
    requirementId: REQUIREMENT_ID,
    supplierId: SUPPLIER_ID,
    offerSummary: "",
    evidenceRef: "quote",
    quotedAmount: "10",
    comparisonNotes: "",
    requestId: REQUEST_ID,
  });

  assert.equal(result.code, "INVALID_INPUT");
  assert.equal(active.rpcCalls.length, 0);
});

test("procurement actions map permission denial without reaching the RPC", async () => {
  const active = startScenario({ denyPermission: true });
  const result = await selectProcurementSupplier({
    requirementId: REQUIREMENT_ID,
    supplierId: SUPPLIER_ID,
    selectionReason: "Best fit.",
    selectionEvidence: "Comparison record COMP-9",
    requestId: REQUEST_ID,
  });

  assert.equal(result.code, "FORBIDDEN");
  assert.equal(active.rpcCalls.length, 0);
});

test("procurement candidate upsert preserves existing stored quotedAmount and comparisonNotes when client submits sourcing inputs only", async () => {
  const active = startScenario({
    existingCandidate: {
      quoted_amount: 3450.75,
      comparison_notes: "Preserved historical notes.",
    },
  });

  const result = await upsertProcurementCandidate({
    requirementId: REQUIREMENT_ID,
    supplierId: SUPPLIER_ID,
    offerSummary: "Updated sourcing offer summary.",
    evidenceRef: "updated-supplier-evidence",
    requestId: REQUEST_ID,
  });

  assert.equal(result.success, true);
  assert.equal(active.rpcCalls.length, 1);
  assert.equal(active.rpcCalls[0]?.name, "upsert_service_procurement_candidate");
  assert.equal(active.rpcCalls[0]?.args.p_quoted_amount, 3450.75);
  assert.equal(active.rpcCalls[0]?.args.p_comparison_notes, "Preserved historical notes.");
});

