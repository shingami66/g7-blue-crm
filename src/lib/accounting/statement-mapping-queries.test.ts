import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test, { mock } from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type QueryRecord = {
  table: string;
  columns: string | null;
  filters: Array<{ method: "eq" | "in"; column: string; value: unknown }>;
  orders: Array<{ column: string; ascending: boolean }>;
  limit: number | null;
  range: [number, number] | null;
};
type QueryState = {
  canManage: boolean;
  queries: QueryRecord[];
  rpc: (name: string, args: Record<string, unknown>) => Promise<{ data: unknown; error: { code?: string } | null }>;
  readTable: (query: QueryRecord) => { data: unknown; error: { code?: string } | null };
};

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (specifier: string, context: { parentURL?: string }, nextResolve: (specifier: string, context: { parentURL?: string }) => ResolveResult) => ResolveResult;
  }) => void;
};
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") return { url: "data:text/javascript,export default {}", shortCircuit: true };
    if (specifier.startsWith("@/")) return { url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href, shortCircuit: true };
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

let state: QueryState = {
  canManage: true,
  queries: [],
  rpc: async () => ({ data: false, error: null }),
  readTable: () => ({ data: null, error: null }),
};

mock.module("@/lib/auth/permissions", {
  namedExports: {
    requireUser: async () => ({ id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f", role: "accountant", is_active: true }),
    requirePermission: async () => ({ id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f", role: "accountant", is_active: true }),
    checkPermission: async () => false,
  },
});
mock.module(new URL("./permissions.ts", import.meta.url).href, {
  namedExports: {
    resolveAccountingCapability: async (_actorId: string, capability: string) =>
      ["accounting:manage_chart", "accounting:view", "accounting:manage_inception"].includes(capability) && state.canManage,
  },
});
mock.module("@/lib/supabase/admin", {
  namedExports: {
    createAdminClient: () => ({
      rpc: (name: string, args: Record<string, unknown>) => state.rpc(name, args),
      from: (table: string) => {
        const queryRecord: QueryRecord = { table, columns: null, filters: [], orders: [], limit: null, range: null };
        state.queries.push(queryRecord);
        const finish = () => Promise.resolve(state.readTable(queryRecord));
        const query = {
          select(columns: string) { queryRecord.columns = columns; return query; },
          eq(column: string, value: unknown) { queryRecord.filters.push({ method: "eq", column, value }); return query; },
          in(column: string, value: unknown[]) { queryRecord.filters.push({ method: "in", column, value }); return query; },
          order(column: string, options: { ascending: boolean }) { queryRecord.orders.push({ column, ascending: options.ascending }); return query; },
          async maybeSingle() { return finish(); },
          async limit(value: number) { queryRecord.limit = value; return finish(); },
          async range(from: number, to: number) { queryRecord.range = [from, to]; return finish(); },
        };
        return query;
      },
    }),
  },
});

const { getAccountingStatementMappings, getAccountingInceptionPackage } = await import("./queries.ts");
const { ForbiddenError, AuthDependencyError } = await import("../auth/errors.ts");
const profileId = "00000000-0000-4000-8000-00000000d401";
const mappingSetId = "00000000-0000-4000-8000-00000000d402";
const accountId = "00000000-0000-4000-8000-00000000d403";
const creatorId = "00000000-0000-4000-8000-00000000d404";
const packageId = "00000000-0000-4000-8000-00000000d405";
const itemId = "00000000-0000-4000-8000-00000000d406";
const journalId = "00000000-0000-4000-8000-00000000d407";

function resetState(readTable: QueryState["readTable"] = () => ({ data: null, error: null })) {
  state = { canManage: true, queries: [], rpc: async () => ({ data: false, error: null }), readTable };
}

function mappingEntry() {
  return {
    account_id: accountId,
    account_version: 2,
    statement_type: "PROFIT_LOSS",
    section_key: "EXPENSE",
    line_key: "OPERATING_COSTS",
    label_en: "Operating costs",
    label_ar: "تكاليف التشغيل",
    display_order: 10,
  };
}

test("statement mapping query enforces chart management before reading protected tables", async () => {
  resetState();
  state.canManage = false;
  await assert.rejects(() => getAccountingStatementMappings(), ForbiddenError);
  assert.deepEqual(state.queries, []);
});

test("statement mapping query distinguishes an uninitialized profile from an empty mapping set", async () => {
  resetState((query) => query.table === "accounting_profiles"
    ? { data: null, error: null }
    : { data: null, error: null });
  assert.deepEqual(await getAccountingStatementMappings(), { state: "NOT_INITIALIZED" });

  resetState((query) => {
    if (query.table === "accounting_profiles") return { data: { id: profileId }, error: null };
    if (query.table === "accounting_statement_mapping_sets") return { data: null, error: null };
    return { data: null, error: null };
  });
  assert.deepEqual(await getAccountingStatementMappings(), {
    state: "EMPTY", profile_id: profileId, mapping_set_id: null, current_version: 0, history: [],
  });
  assert.equal(state.queries.some((query) => query.table === "accounting_statement_mapping_entries"), false);
});

test("statement mapping query returns exact current account versions and a bounded version history", async () => {
  const history = Array.from({ length: 51 }, (_, index) => {
    const version = 51 - index;
    return {
      version,
      previous_version: version > 1 ? version - 1 : null,
      effective_from: `2026-10-${String(Math.min(version, 28)).padStart(2, "0")}T00:00:00.000Z`,
      reason: `Revision ${version}`,
      evidence_ref: `evidence-${version}`,
      created_by: creatorId,
      created_at: `2026-10-${String(Math.min(version, 28)).padStart(2, "0")}T00:00:00.000Z`,
    };
  });
  resetState((query) => {
    if (query.table === "accounting_profiles") return { data: { id: profileId }, error: null };
    if (query.table === "accounting_statement_mapping_sets") return { data: { id: mappingSetId, profile_id: profileId, current_version: 51 }, error: null };
    if (query.table === "accounting_statement_mapping_versions") return { data: history, error: null };
    if (query.table === "accounting_statement_mapping_entries") return { data: query.range?.[0] === 0 ? [mappingEntry()] : [], error: null };
    return { data: null, error: null };
  });

  const result = await getAccountingStatementMappings();
  assert.equal(result.state, "READY");
  if (result.state !== "READY") return;
  assert.equal(result.current_version, 51);
  assert.equal(result.history.length, 50);
  assert.equal(result.history_truncated, true);
  assert.equal(result.history[0].version, 2);
  assert.equal(result.history.at(-1)?.version, 51);
  assert.deepEqual(result.entries, [mappingEntry()]);
  assert.deepEqual(state.queries.filter((query) => query.table === "accounting_statement_mapping_entries").map((query) => query.range), [[0, 999], [1000, 1999]]);
  assert.ok(state.queries.filter((query) => query.table === "accounting_statement_mapping_entries").every((query) => query.filters.some((filter) => filter.column === "mapping_version" && filter.value === 51)));
});

test("inception detail query reads persisted linked journal status at the current journal version", async () => {
  const payload = {
    accounting_start_date: "2501-01-01",
    cutover_boundary_date: "2501-01-31",
    evidence_inventory: [],
    reconciliation_references: [{ category: "OTHER", reference: "reconciliation-evidence" }],
    items: [{
      item_id: itemId,
      source_domain: "W10C_TEST",
      source_record_key: "source-record",
      economic_event_key: "economic-event",
      classification: "UNRESOLVED",
      resolution_state: "UNRESOLVED",
      is_material: false,
      reconciliation_category: "OTHER",
      reconciliation_reference: null,
      party_type: "NONE",
      party_reference: null,
      evidence_refs: [],
      journal: null,
    }],
  };
  const packageDetail = {
    package_id: packageId,
    profile_id: profileId,
    current_version: 1,
    created_at: "2026-10-01T00:00:00.000Z",
    version: { version: 1, previous_version: null, accounting_start_date: "2501-01-01", cutover_boundary_date: "2501-01-31", payload, payload_fingerprint: "a".repeat(64), created_by: creatorId, created_at: "2026-10-01T00:00:00.000Z" },
    versions: [{ version: 1, previous_version: null, accounting_start_date: "2501-01-01", cutover_boundary_date: "2501-01-31", payload, payload_fingerprint: "a".repeat(64), created_by: creatorId, created_at: "2026-10-01T00:00:00.000Z" }],
    coverage_history: [],
    review_history: [],
    coverage: [],
    review: null,
    acceptance: null,
  };
  resetState((query) => {
    if (query.table === "accounting_inception_journal_links") return { data: [{ item_id: itemId, package_version: 1, journal_id: journalId, prepared_version: 1 }], error: null };
    if (query.table === "accounting_journals") return { data: [{ id: journalId, current_version: 2, current: { version: 2, status: "POSTED" } }], error: null };
    return { data: null, error: null };
  });
  state.rpc = async (name) => name === "get_accounting_inception_package" ? { data: packageDetail, error: null } : { data: false, error: null };

  const result = await getAccountingInceptionPackage(packageId);
  assert.equal(result?.journal_links.length, 1);
  assert.deepEqual(result?.journal_links[0], {
    item_id: itemId,
    package_version: 1,
    journal_id: journalId,
    prepared_version: 1,
    current_version: 2,
    status: "POSTED",
  });
  assert.ok(state.queries.some((query) => query.table === "accounting_journals" && query.columns?.includes("accounting_journals_current_version_fkey")));
  assert.equal(AuthDependencyError.name, "AuthDependencyError");
});
