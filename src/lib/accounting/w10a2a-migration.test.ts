import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL(
    "../../../supabase/migrations/20260927200220_w10a2a_chart_period_foundation.sql",
    import.meta.url,
  ),
  "utf8",
);
const rollbackFixture = readFileSync(
  new URL(
    "../../../supabase/verification/w10a2a_chart_period_rollback_regression.sql",
    import.meta.url,
  ),
  "utf8",
);

test("W10A2a creates only versioned account and period tables and four RPCs", () => {
  const tables = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(tables.sort(), [
    "accounting_account_versions",
    "accounting_accounts",
    "accounting_period_versions",
    "accounting_periods",
  ]);

  const functions = [...migration.matchAll(/CREATE FUNCTION public\.(\w+)/g)].map((match) => match[1]);
  assert.deepEqual(
    functions.filter((name) => [
      "list_accounting_accounts",
      "list_accounting_periods",
      "save_accounting_account",
      "save_accounting_period",
    ].includes(name)).sort(),
    ["list_accounting_accounts", "list_accounting_periods", "save_accounting_account", "save_accounting_period"],
  );
  assert.doesNotMatch(migration, /CREATE TABLE public\.accounting_(?:journals|journal_lines)\b/i);
  const schemaBootstrap = migration.slice(0, migration.indexOf("CREATE TABLE public.accounting_accounts"));
  assert.doesNotMatch(
    schemaBootstrap,
    /INSERT INTO public\.(?:accounting_accounts|accounting_account_versions|accounting_periods|accounting_period_versions)\b/i,
  );
});

test("W10A2a enables only chart and period grants through the existing catalog", () => {
  const dropAt = migration.indexOf("DROP CONSTRAINT accounting_capability_catalog_state_check");
  const updateAt = migration.indexOf("UPDATE public.accounting_capability_catalog");
  const addAt = migration.indexOf("ADD CONSTRAINT accounting_capability_catalog_state_check");
  assert.ok(dropAt >= 0 && updateAt > dropAt && addAt > updateAt);
  assert.match(migration, /SET enabled=true,runtime_allow_grantable=true\s+WHERE capability IN \('accounting:manage_chart','accounting:manage_periods'\)/);
  assert.doesNotMatch(migration, /INSERT INTO public\.accounting_capability_events\b/i);
  assert.doesNotMatch(migration, /'accounting:close_period'[^\n]*true|'accounting:reopen_period'[^\n]*true/i);
  assert.match(migration, /get_accounting_capability\(p_actor_user_id,'accounting:manage_chart'\)/);
  assert.match(migration, /get_accounting_capability\(p_actor_user_id,'accounting:manage_periods'\)/);
});

test("account identities and versions enforce profile-local hierarchy, cycles, protected controls, and immutable history", () => {
  assert.match(migration, /CONSTRAINT accounting_account_versions_parent_fkey\s+FOREIGN KEY \(profile_id,parent_account_id\)\s+REFERENCES public\.accounting_accounts\(profile_id,id\)/);
  assert.match(migration, /account_kind text NOT NULL CHECK \(account_kind IN \('POSTING','NON_POSTING'\)\)/);
  assert.match(migration, /accounting_account_versions_control_protected_check\s+CHECK \(control_classification='NONE' OR is_protected\)/);
  assert.match(migration, /WITH RECURSIVE ancestors\(account_id,parent_account_id\)/);
  assert.match(migration, /ACCOUNTING_ACCOUNT_HIERARCHY_CYCLE/);
  assert.match(migration, /ACCOUNTING_ACCOUNT_PARENT_MUST_BE_NON_POSTING/);
  assert.match(migration, /ACCOUNTING_PROTECTED_ACCOUNT_INVARIANT/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_account_versions/);
  assert.match(migration, /BEFORE TRUNCATE ON public\.accounting_account_versions/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_period_versions/);
  assert.match(migration, /foundation_event_id uuid NOT NULL REFERENCES public\.accounting_foundation_events/);
});

test("periods remain OPEN-only with inclusive nonoverlap checks and versioned boundaries", () => {
  assert.match(migration, /status text NOT NULL DEFAULT 'OPEN' CHECK \(status='OPEN'\)/);
  assert.match(migration, /NEW\.start_date<=v\.end_date AND NEW\.end_date>=v\.start_date/);
  assert.match(migration, /ACCOUNTING_PERIOD_OVERLAP/);
  assert.match(migration, /pg_advisory_xact_lock\([\s\S]*?'w10a2a-period:'/);
  assert.match(
    migration,
    /capability IN \('accounting:close_period','accounting:reopen_period'\)\s+AND NOT enabled AND NOT runtime_allow_grantable AND owner_slice='W10I'/,
  );
  assert.doesNotMatch(migration, /CREATE FUNCTION public\.(?:close|reopen|lock)_accounting_period\b/i);
});

test("all new tables are RPC-only and event history binds to the resulting identity version", () => {
  for (const table of [
    "accounting_accounts",
    "accounting_account_versions",
    "accounting_periods",
    "accounting_period_versions",
  ]) {
    assert.match(migration, new RegExp(`ALTER TABLE public\\.${table} ENABLE ROW LEVEL SECURITY;`));
  }
  assert.match(
    migration,
    /REVOKE ALL ON TABLE public\.accounting_accounts,public\.accounting_account_versions,[\s\S]*?FROM PUBLIC,anon,authenticated,service_role;/,
  );
  const grants = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\(/g)].map((match) => match[1]);
  assert.deepEqual(grants.sort(), [
    "list_accounting_accounts",
    "list_accounting_periods",
    "save_accounting_account",
    "save_accounting_period",
  ]);
  assert.match(migration, /ACCOUNTING_ACCOUNT_EVENT_MISMATCH/);
  assert.match(migration, /ACCOUNTING_PERIOD_EVENT_MISMATCH/);
  assert.doesNotMatch(migration, /v_event\.event_type IS DISTINCT FROM CASE/i);
  assert.match(migration, /NEW\.version IS DISTINCT FROM 1\s+AND v_event\.event_type IS DISTINCT FROM 'accounting_account_updated'/);
  assert.match(migration, /NEW\.version=1\s+AND v_event\.event_type IS DISTINCT FROM 'accounting_account_created'/);
  assert.match(migration, /NEW\.version IS DISTINCT FROM 1\s+AND v_event\.event_type IS DISTINCT FROM 'accounting_period_updated'/);
  assert.match(migration, /NEW\.version=1\s+AND v_event\.event_type IS DISTINCT FROM 'accounting_period_created'/);
  assert.match(migration, /'accounting_account_created','accounting_account_updated'/);
  assert.match(migration, /'accounting_period_created','accounting_period_updated'/);
});

test("DEV verification fixture rolls back synthetic profile, hierarchy, periods, grants, and audit evidence", () => {
  assert.match(rollbackFixture, /^-- FUTURE CONTROLLER-AUTHORIZED DEV EXECUTION ONLY[\s\S]*?\nBEGIN;/);
  assert.match(rollbackFixture, /SET LOCAL ROLE service_role;/);
  assert.match(rollbackFixture, /account_cycle/);
  assert.match(rollbackFixture, /parent_must_be_non_posting/);
  assert.match(rollbackFixture, /protected_account_invariant/);
  assert.match(rollbackFixture, /period_overlap/);
  assert.match(rollbackFixture, /latest chart DENY did not override prior ALLOW/);
  assert.match(rollbackFixture, /CRM Admin wildcard leaked into accounting authority/);
  assert.match(rollbackFixture, /Arbitrary adjacent period/);
  assert.match(rollbackFixture, /ROLLBACK;\s*\n\s*-- Run after rollback/);
  assert.match(rollbackFixture, /W10A2a rollback fixture residue detected/);
  assert.doesNotMatch(rollbackFixture, /^\s*(?:COMMIT|DROP|TRUNCATE)\b/im);
});
