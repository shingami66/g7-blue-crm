import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ActionState = {
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string } | null }>;
  calls: Array<{ name: string; args: Record<string, unknown> }>;
  permission: string | null;
};

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (specifier: string, context: ResolveContext, nextResolve: (specifier: string, context: ResolveContext) => ResolveResult) => ResolveResult;
  }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return { shortCircuit: true, url: "data:text/javascript,export default {}" };
    }
    if (specifier.startsWith("@/")) {
      return { shortCircuit: true, url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href };
    }
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});

let state: ActionState = {
  rpc: async () => ({ data: null, error: null }),
  calls: [],
  permission: null,
};

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requirePermission: async (permission: string) => {
      state.permission = permission;
      return { id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f", role: "viewer", is_active: true };
    },
  },
});

mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        state.calls.push({ name, args });
        return state.rpc(name, args);
      },
    }),
  },
});

const { setAccountingCapability, updateAccountingProfile } = await import("./actions.ts");
const { AuthDependencyError } = await import("../auth/errors.ts");

const actorId = "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f";
const targetId = "9f09e715-9698-4804-a72b-331ebc776b8d";

function resetState(rpc: ActionState["rpc"]) {
  state = { rpc, calls: [], permission: null };
}

const assignment = {
  target_user_id: targetId,
  capability: "accounting:view",
  effect: "ALLOW",
  expires_at: null,
  expected_revision: 0,
  reason: "Approved by the Controller",
  evidence_ref: null,
  request_id: "6f5b2999-ea2b-4c2e-8928-93220196a910",
};

test("authority server action derives its actor from requirePermission and returns RPC revision", async () => {
  resetState(async () => ({
    data: [{ error_code: null, capability_event_id: "a226e8ef-0c08-4e5e-8b0a-c232cdb91903", revision: 1, idempotent_replay: false }],
    error: null,
  }));

  assert.deepEqual(await setAccountingCapability(assignment), {
    ok: true,
    value: { capability_event_id: "a226e8ef-0c08-4e5e-8b0a-c232cdb91903", revision: 1 },
    idempotentReplay: false,
  });
  assert.equal(state.permission, "accounting:manage_authority");
  assert.deepEqual(state.calls[0], {
    name: "set_accounting_capability",
    args: {
      p_actor_user_id: actorId,
      p_target_user_id: targetId,
      p_capability: "accounting:view",
      p_effect: "ALLOW",
      p_expires_at: null,
      p_expected_revision: 0,
      p_reason: "Approved by the Controller",
      p_evidence_ref: null,
      p_request_id: assignment.request_id,
    },
  });
  assert.equal("p_actor_role" in state.calls[0].args, false);
});

test("self assignment and browser actor injection are rejected before RPC", async () => {
  resetState(async () => ({ data: [], error: null }));
  assert.deepEqual(await setAccountingCapability({ ...assignment, target_user_id: actorId }), {
    ok: false,
    code: "invalid_input",
  });
  assert.deepEqual(await setAccountingCapability({ ...assignment, actor_user_id: targetId }), {
    ok: false,
    code: "invalid_input",
  });
  assert.equal(state.calls.length, 0);
});

test("safe SQL result codes are preserved while database internals are hidden", async () => {
  resetState(async () => ({
    data: [{ error_code: "request_payload_conflict", capability_event_id: null, revision: null, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await setAccountingCapability(assignment), {
    ok: false,
    code: "request_payload_conflict",
  });

  resetState(async () => ({
    data: [{ error_code: "capability_disabled", capability_event_id: null, revision: null, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await setAccountingCapability({ ...assignment, capability: "accounting:manage_chart", effect: "DENY" }), {
    ok: false,
    code: "capability_disabled",
  });

  resetState(async () => ({ data: null, error: { code: "57P01" } }));
  await assert.rejects(() => setAccountingCapability(assignment), (error: unknown) => {
    assert.ok(error instanceof AuthDependencyError);
    assert.equal(error.message.includes("57P01"), false);
    return true;
  });
});

test("profile action rejects unsupported production and tax states and maps company mismatch", async () => {
  const profile = {
    framework_key: "SA_IFRS_FOR_SMES",
    framework_edition: 2025,
    policy_version: "W10 provisional policy",
    endorsement_context: "Controller approved provisional baseline",
    professional_validation_state: "DEFERRED",
    professional_validation_evidence_ref: null,
    functional_currency: "SAR",
    fiscal_start_month: 1,
    fiscal_start_day: 1,
    fiscal_end_month: 12,
    fiscal_end_day: 31,
    fiscal_timezone: "Asia/Riyadh",
    accounting_start_date: "2026-01-01",
    cutover_boundary_date: "2026-12-31",
    legal_fiscal_evidence_pending: true,
    legal_fiscal_evidence_ref: null,
    vat_mode: "not_registered",
    zatca_state: "INACTIVE",
    fatoora_state: "INACTIVE",
    activation_state: "DEV_PROVISIONAL",
  };
  const request = {
    expected_version: 1,
    profile,
    reason: "Controller-approved provisional profile",
    evidence_ref: null,
    request_id: "d8a7561e-5571-41f6-a4fc-0843bd05dd38",
  };

  resetState(async () => ({ data: [], error: null }));
  assert.deepEqual(
    await updateAccountingProfile({ ...request, profile: { ...profile, activation_state: "PRODUCTION_ACTIVE" } }),
    { ok: false, code: "invalid_input" },
  );
  assert.deepEqual(
    await updateAccountingProfile({ ...request, profile: { ...profile, vat_mode: "registered" } }),
    { ok: false, code: "invalid_input" },
  );
  assert.equal(state.calls.length, 0);

  resetState(async () => ({
    data: [{ error_code: "company_settings_mismatch", profile_id: null, version: null, idempotent_replay: false }],
    error: null,
  }));
  assert.deepEqual(await updateAccountingProfile(request), {
    ok: false,
    code: "company_settings_mismatch",
  });
  assert.equal(state.permission, "accounting:manage_profile");
  assert.equal(state.calls[0].args.p_actor_user_id, actorId);
});
