import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type QueryState = {
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

let state: QueryState = {
  rpc: async () => ({ data: null, error: null }),
  calls: [],
  permission: null,
};

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requireUser: async () => ({ id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f", role: "viewer", is_active: true }),
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

const { getAccountingProfile, listAccountingAccounts, listAccountingCapabilityAssignments, listAccountingPeriods } = await import("./queries.ts");
const { AuthDependencyError } = await import("../auth/errors.ts");

function resetState(rpc: QueryState["rpc"]) {
  state = { rpc, calls: [], permission: null };
}

test("profile query allows an explicit manage_profile grant without a CRM role grant", async () => {
  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return { data: args.p_capability === "accounting:manage_profile", error: null };
    }
    return { data: { state: "NOT_INITIALIZED" }, error: null };
  });

  assert.deepEqual(await getAccountingProfile(), { state: "NOT_INITIALIZED" });
  assert.deepEqual(state.calls.map(({ name }) => name), [
    "get_accounting_capability",
    "get_accounting_capability",
    "get_accounting_profile",
  ]);
  assert.equal(state.calls[2].args.p_actor_user_id, "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f");
  assert.equal("p_actor_role" in state.calls[2].args, false);
});

test("authority assignment query requires the canonical capability and sends no browser actor", async () => {
  resetState(async () => ({ data: [], error: null }));
  assert.deepEqual(
    await listAccountingCapabilityAssignments({ target_user_id: "9f09e715-9698-4804-a72b-331ebc776b8d" }),
    [],
  );
  assert.equal(state.permission, "accounting:manage_authority");
  assert.deepEqual(state.calls, [
    {
      name: "list_accounting_capability_assignments",
      args: {
        p_actor_user_id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f",
        p_target_user_id: "9f09e715-9698-4804-a72b-331ebc776b8d",
      },
    },
  ]);
});

test("query dependency and malformed responses fail closed without exposing database details", async () => {
  resetState(async (name) => ({
    data: name === "get_accounting_capability"
      ? true
      : { state: "NOT_INITIALIZED", secret: "hidden" },
    error: null,
  }));
  await assert.rejects(() => getAccountingProfile(), (error: unknown) => {
    assert.ok(error instanceof AuthDependencyError);
    assert.equal(error.message.includes("hidden"), false);
    return true;
  });

  resetState(async () => ({ data: null, error: { code: "57P01" } }));
  await assert.rejects(() => listAccountingCapabilityAssignments({ target_user_id: "9f09e715-9698-4804-a72b-331ebc776b8d" }), AuthDependencyError);
});


test("chart and period reads use the existing explicit accounting capability resolver and validate history", async () => {
  const accountRow = {
    account_id: "00000000-0000-4000-8000-00000000a591",
    profile_id: "00000000-0000-4000-8000-00000000a592",
    version: 1,
    is_current: true,
    previous_version: null,
    account_code: "TEMP-001",
    name_en: "Synthetic account",
    name_ar: "حساب اصطناعي",
    account_type: "ASSET",
    category: "synthetic",
    normal_balance: "DEBIT",
    account_kind: "POSTING",
    parent_account_id: null,
    is_active: true,
    is_protected: false,
    control_classification: "NONE",
    effective_from: "2026-09-27T00:00:00Z",
    reason: "Synthetic chart read",
    evidence_ref: null,
    created_by: "00000000-0000-4000-8000-00000000a593",
    created_at: "2026-09-27T00:00:00Z",
  };
  const periodRow = {
    period_id: "00000000-0000-4000-8000-00000000a594",
    profile_id: "00000000-0000-4000-8000-00000000a592",
    version: 1,
    is_current: true,
    previous_version: null,
    start_date: "2026-10-03",
    end_date: "2026-10-19",
    status: "OPEN",
    effective_from: "2026-09-27T00:00:00Z",
    reason: "Synthetic period read",
    evidence_ref: null,
    created_by: "00000000-0000-4000-8000-00000000a593",
    created_at: "2026-09-27T00:00:00Z",
  };
  resetState(async (name, args) => {
    if (name === "get_accounting_capability") {
      return {
        data: args.p_capability === "accounting:manage_chart" || args.p_capability === "accounting:manage_periods",
        error: null,
      };
    }
    if (name === "list_accounting_accounts") return { data: [accountRow], error: null };
    if (name === "list_accounting_periods") return { data: [periodRow], error: null };
    return { data: null, error: null };
  });

  assert.deepEqual(await listAccountingAccounts(), [accountRow]);
  assert.deepEqual(await listAccountingPeriods(), [periodRow]);
  const capabilityCalls = state.calls.filter(({ name }) => name === "get_accounting_capability");
  assert.deepEqual(
    capabilityCalls.map(({ args }) => args.p_capability),
    ["accounting:view", "accounting:manage_chart", "accounting:view", "accounting:manage_periods"],
  );
  assert.equal(state.calls.find(({ name }) => name === "list_accounting_accounts")?.args.p_actor_user_id,
    "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f");
  assert.equal("p_actor_role" in (state.calls.find(({ name }) => name === "list_accounting_periods")?.args ?? {}), false);
});

test("chart and period reads fail closed when explicit accounting grants are absent", async () => {
  resetState(async () => ({ data: false, error: null }));
  await assert.rejects(() => listAccountingAccounts(), /Accounting capability required/);
  assert.equal(state.calls.some(({ name }) => name === "list_accounting_accounts"), false);
});
