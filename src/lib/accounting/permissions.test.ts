import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type State = {
  data: unknown;
  error: { code?: string } | null;
  throws: Error | null;
  calls: Array<{ name: string; args: Record<string, unknown> }>;
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

let state: State = { data: false, error: null, throws: null, calls: [] };
mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      rpc: async (name: string, args: Record<string, unknown>) => {
        state.calls.push({ name, args });
        if (state.throws) throw state.throws;
        return { data: state.data, error: state.error };
      },
    }),
  },
});

const { resolveAccountingCapability } = await import("./permissions.ts");
const { AuthDependencyError } = await import("../auth/errors.ts");

function reset(overrides: Partial<State> = {}) {
  state = { data: false, error: null, throws: null, calls: [], ...overrides };
}

test("resolver queries only the explicit accounting capability RPC", async () => {
  reset({ data: true });
  assert.equal(await resolveAccountingCapability("actor-uuid", "accounting:view"), true);
  assert.deepEqual(state.calls, [{
    name: "get_accounting_capability",
    args: { p_actor_user_id: "actor-uuid", p_capability: "accounting:view" },
  }]);
});

test("resolver returns the persisted deny and fails closed for unknown future keys", async () => {
  reset({ data: false });
  assert.equal(await resolveAccountingCapability("actor-uuid", "accounting:manage_authority"), false);
  assert.equal(await resolveAccountingCapability("actor-uuid", "accounting:future_key"), false);
  assert.equal(state.calls.length, 2);
  assert.equal(await resolveAccountingCapability("actor-uuid", "invoices:write"), false);
  assert.equal(state.calls.length, 2);
});

test("RPC errors, throws, and malformed values become AuthDependencyError", async () => {
  reset({ error: { code: "57P01" } });
  await assert.rejects(
    () => resolveAccountingCapability("actor-uuid", "accounting:view"),
    AuthDependencyError,
  );
  reset({ throws: new Error("connection detail") });
  await assert.rejects(
    () => resolveAccountingCapability("actor-uuid", "accounting:view"),
    (error: unknown) => error instanceof AuthDependencyError && !error.message.includes("connection detail"),
  );
  reset({ data: null });
  await assert.rejects(
    () => resolveAccountingCapability("actor-uuid", "accounting:view"),
    AuthDependencyError,
  );
});
