import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261019063410_w10d_ar_bridge_reconciliation_evidence_read.sql", import.meta.url),
  "utf8",
);
const w10dMigration = readFileSync(
  new URL("../../../supabase/migrations/20260928105910_w10d_accounts_receivable_accounting_bridge.sql", import.meta.url),
  "utf8",
);
const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");

const rpcName = "get_accounting_ar_bridge_reconciliation_with_evidence";

test("W10D evidence-read migration adds one read RPC without schema or business-data mutation", () => {
  const createdFunctions = [...migration.matchAll(/CREATE FUNCTION public\.(\w+)\(/g)]
    .map((match) => match[1]);
  assert.deepEqual(createdFunctions, [rpcName]);
  assert.match(migration, /RETURNS jsonb[\s\S]*?LANGUAGE plpgsql STABLE SECURITY DEFINER[\s\S]*?SET search_path=pg_catalog,public/);
  assert.doesNotMatch(migration, /\b(?:INSERT INTO|UPDATE|DELETE FROM|TRUNCATE|CREATE TABLE|ALTER TABLE|DROP TABLE)\b/i);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.get_accounting_ar_bridge_reconciliation\b/);
  assert.match(migration, /to_regprocedure\('public\.get_accounting_ar_bridge_reconciliation\(uuid,date,timestamptz,integer\)'\)/);
  assert.match(migration, /to_regprocedure\('public\.get_accounting_ar_bridge_reconciliation_with_evidence\(uuid,date,timestamptz,integer\)'\) IS NOT NULL/);
});

test("W10D evidence RPC reuses existing actor authority, profile, event version, and cutoff contracts", () => {
  assert.match(
    w10dMigration,
    /IF NOT EXISTS\(SELECT 1 FROM public\.app_users u WHERE u\.id=p_actor_user_id AND u\.is_active\)[\s\S]*?public\.get_accounting_capability\(p_actor_user_id,'accounting:view'\)[\s\S]*?public\.get_accounting_capability\(p_actor_user_id,'accounting:manage_ar_bridge'\)/,
  );
  assert.match(
    migration,
    /public\.get_accounting_ar_bridge_reconciliation\([\s\S]*?p_actor_user_id, p_as_of_date, p_recorded_at_cutoff, p_limit/,
  );
  assert.match(migration, /p_limit IS NULL OR p_limit NOT BETWEEN 1 AND 500/);
  assert.match(migration, /WHERE p\.singleton_key='g7'/);
  assert.match(migration, /event_version\.event_id=source_events\.event_id/);
  assert.match(migration, /event_version\.version=source_events\.event_version/);
  assert.match(migration, /event_version\.created_at<=p_recorded_at_cutoff/);
  assert.match(migration, /event_version\.source_recorded_at<=p_recorded_at_cutoff/);
  assert.match(migration, /journal_link\.event_id=event_version\.event_id/);
  assert.match(migration, /journal_link\.event_version=event_version\.version/);
  assert.match(migration, /journal_link\.created_at<=p_recorded_at_cutoff/);
  assert.match(migration, /source_events\.reconciliation_status IN \('PREPARED','POSTED'\)/);
  assert.match(migration, /WHERE reconciliation_status IN \('PREPARED','POSTED'\)/);
  assert.match(migration, /ORDER BY ordinality/);
  assert.match(migration, /ACCOUNTING_AR_BRIDGE_EVIDENCE_INCOMPLETE/);
  assert.doesNotMatch(migration, /amount_halalah/);
});

test("W10D evidence RPC preserves protected table revocations and grants execute only to service_role", () => {
  assert.match(
    w10dMigration,
    /REVOKE ALL ON TABLE public\.accounting_ar_bridge_events,[\s\S]{0,250}FROM PUBLIC,anon,authenticated,service_role;/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.get_accounting_ar_bridge_reconciliation_with_evidence\(uuid,date,timestamptz,integer\)\s+FROM PUBLIC,anon,authenticated,service_role;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.get_accounting_ar_bridge_reconciliation_with_evidence\(uuid,date,timestamptz,integer\)\s+TO service_role;/,
  );
  assert.equal([...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\./g)].length, 1);
  assert.doesNotMatch(migration, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON TABLE public\.accounting_ar_bridge_/i);
  assert.doesNotMatch(migration, /GRANT\s+ALL\s+ON TABLE/i);
});

test("AR application query uses the governed evidence RPC and no protected direct-table reads", () => {
  assert.match(queries, new RegExp(`rpc\\("${rpcName}"`));
  assert.doesNotMatch(queries, /\.from\("accounting_ar_bridge_event_versions"\)/);
  assert.doesNotMatch(queries, /\.from\("accounting_ar_bridge_journal_links"\)/);
});
