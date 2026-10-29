import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261028113055_w11_m0_01_completed_g8_abs_retirement.sql", import.meta.url),
  "utf8",
);
const priorMigration = readFileSync(
  new URL("../../../supabase/migrations/20261027102347_w11_m0_01_14_approved_abs_retirement.sql", import.meta.url),
  "utf8",
);
const preflight = readFileSync(
  new URL("../../../supabase/verification/w11m0_01_completed_g8_preflight.sql", import.meta.url),
  "utf8",
);
const postflight = readFileSync(
  new URL("../../../supabase/verification/w11m0_01_completed_g8_postflight.sql", import.meta.url),
  "utf8",
);
const preservationSnapshot = readFileSync(
  new URL("../../../supabase/verification/w11m0_01_completed_g8_preservation_snapshot.sql", import.meta.url),
  "utf8",
);

function extractFunction(source, signature, terminator = "$function$;") {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, "missing " + signature);
  const end = source.indexOf(terminator, start);
  assert.notEqual(end, -1, "missing terminator for " + signature);
  return source.slice(start, end + terminator.length);
}

const target = extractFunction(migration, "CREATE FUNCTION public._w11_m0_01_completed_g8_targets()");
const downstream = extractFunction(migration, "CREATE FUNCTION public._w11_m0_01_completed_g8_downstream_link_counts()");
const priorDownstream = extractFunction(priorMigration, "CREATE FUNCTION public._w11_m0_01_downstream_link_counts()");
const rpc = extractFunction(migration, "CREATE FUNCTION public.retire_w11_m0_01_completed_g8_abs(p_owner_actor_id text)");
const invokerGuard = extractFunction(migration, "CREATE OR REPLACE FUNCTION public.enforce_w11_m0_01_retirement_context()");
const beforeWriteGuard = extractFunction(migration, "CREATE OR REPLACE FUNCTION public.check_approved_billing_scopes_before_write()", "$$;");

test("the new manifest freezes only the exact Completed G8 Service, Quotation, ABS, and Customer", () => {
  const ids = [...target.matchAll(/'([0-9a-f-]{36})'::uuid/g)].map((match) => match[1]);
  assert.deepEqual(ids, [
    "c7ca6503-9746-4604-964a-cbe53c118009",
    "87932c67-cdca-4d6c-bb20-691b59f8961f",
    "513f1e78-5bfa-4ff2-a8a8-6986498d1987",
    "21db71fc-ac14-44c1-b5f6-03fcfcf64fc9",
  ]);
  assert.match(target, /2026-08-17 10:13:40\.350\+00/);
  assert.match(target, /2026-08-17 10:13:40\.294923\+00/);
  assert.match(target, /800::numeric/);
  assert.match(target, /0f702aaea049a071bdcc9b13de930dd8/);
  assert.doesNotMatch(target, /p_(?:service|quotation|abs)_id/i);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.retire_w11_m0_01_approved_abs/);
  assert.doesNotMatch(migration, /DROP FUNCTION|DROP TRIGGER|ALTER TABLE|CREATE TABLE/i);
  assert.match(preflight, /c7ca6503-9746-4604-964a-cbe53c118009/);
});
test("the one-case helper preserves all 90 reviewed downstream relation paths", () => {
  const labels = (source) => [...source.matchAll(/UNION ALL SELECT '([^']+)', count\(\*\)/g)].map((match) => match[1]);
  const oneCasePaths = labels(downstream);
  const originalPaths = labels(priorDownstream);
  assert.equal(oneCasePaths.length, 90);
  assert.equal(new Set(oneCasePaths).size, 90);
  assert.deepEqual(oneCasePaths, originalPaths);
  assert.match(downstream, /FROM public\._w11_m0_01_completed_g8_targets\(\)/);
  assert.match(migration, /w11_m0_01_completed_g8_downstream_links_found/);
  assert.match(migration, /w11_m0_01_completed_g8_downstream_postcondition_failed/);
});

test("the trigger exception admits only the fixed G8 context and preserves the prior 14-case branch", () => {
  assert.match(invokerGuard, /SECURITY INVOKER\s+SET search_path = pg_catalog, public/);
  assert.match(invokerGuard, /current_user <> 'postgres'/);
  assert.match(invokerGuard, /W11-M0-01-14-APPROVED-ABS-RETIREMENT/);
  assert.match(invokerGuard, /W11-M0-01-COMPLETED-G8-ABS-RETIREMENT/);
  assert.match(invokerGuard, /public\._w11_m0_01_retirement_targets\(\)/);
  assert.match(invokerGuard, /public\._w11_m0_01_completed_g8_targets\(\)/);
  assert.match(invokerGuard, /to_jsonb\(NEW\)[\s\S]*?to_jsonb\(OLD\)/);
  assert.match(beforeWriteGuard, /SECURITY DEFINER\s+SET search_path = pg_catalog, public/);
  assert.match(beforeWriteGuard, /v_is_w11_m0_01_retirement AND v_service_status = 'Approved'/);
  assert.match(beforeWriteGuard, /v_is_w11_m0_01_completed_g8_retirement AND v_service_status = 'Completed'/);
  assert.match(beforeWriteGuard, /IF v_service_status = 'Completed' AND NOT v_is_w11_m0_01_completed_g8_retirement THEN/);
});

test("the fixed RPC is service-role-only, locked in order, atomic, and narrowly audited", () => {
  assert.match(rpc, /SECURITY DEFINER\s+SET search_path = pg_catalog, public/);
  assert.doesNotMatch(rpc, /p_(?:service|quotation|abs)_id|p_amount|p_reason|p_target/i);
  const lockMarkers = [
    "PERFORM s.id",
    "PERFORM sl.service_id",
    "PERFORM c.id",
    "PERFORM q.id",
    "PERFORM a.id",
    "PERFORM i.id",
  ].map((marker) => rpc.indexOf(marker));
  assert.ok(lockMarkers.every((position) => position >= 0));
  assert.deepEqual([...lockMarkers].sort((a, b) => a - b), lockMarkers);
  assert.match(rpc, /p_owner_actor_id text/);
  assert.match(rpc, /u\.role = 'admin'[\s\S]*?u\.is_active IS TRUE/);
  assert.match(rpc, /v_manifest_count <> 1/);
  assert.match(rpc, /idempotent_replay', true/);
  assert.match(rpc, /idempotent_replay', false/);
  assert.match(rpc, /OWNER-AUTHORIZED M0-01 G8 DEV TEST-DATA AUTHORITY RETIREMENT/);
  assert.match(rpc, /historical Completed mechanism UNKNOWN/);
  assert.match(rpc, /historical financial impact UNKNOWN/);
  assert.match(rpc, /SAR 800\.00 was commercial authority only/);
  assert.match(rpc, /OWNER AUTHORIZATION — FINAL M0-01 COMPLETED G8 DEV REPAIR/);
  assert.match(rpc, /'owner_authorized_remediation'/);
  assert.match(rpc, /'approved_billing_scope'/);
  const updates = [...migration.matchAll(/^\s*UPDATE\s+public\.(\w+)/gim)].map((match) => match[1]);
  const inserts = [...migration.matchAll(/^\s*INSERT\s+INTO\s+public\.(\w+)/gim)].map((match) => match[1]);
  assert.deepEqual(updates, ["approved_billing_scopes"]);
  assert.deepEqual(inserts, ["audit_logs"]);
  const serviceRoleGrants = [...migration.matchAll(/^GRANT EXECUTE ON FUNCTION public\.(\w+)\([^\n]* TO service_role;/gim)].map((match) => match[1]);
  assert.deepEqual(serviceRoleGrants, ["retire_w11_m0_01_completed_g8_abs"]);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.retire_w11_m0_01_completed_g8_abs\(text\) FROM PUBLIC, anon, authenticated/);
  assert.doesNotMatch(migration, /GRANT\s+(?:SELECT|INSERT|UPDATE|DELETE|ALL)\s+ON\s+(?:TABLE\s+)?public\./i);
});

test("read-only postflight and preservation snapshots cover target, prior repairs, M0-02, and M0-03", () => {
  assert.match(postflight, /all_checks_pass/);
  assert.match(postflight, /expected_downstream_guard_path_count', 90/);
  assert.match(postflight, /prior14_retired_state_count/);
  assert.match(postflight, /invoice_created_audit_reference_count/);
  assert.match(preservationSnapshot, /target_preserved_state/);
  assert.match(preservationSnapshot, /prior_14_repairs/);
  assert.match(preservationSnapshot, /m0_02_preservation/);
  assert.match(preservationSnapshot, /m0_03_raw_evidence_preservation/);
  const m0_03 = preservationSnapshot.slice(preservationSnapshot.indexOf("m0_03_references(invoice_id)"));
  assert.equal([...m0_03.matchAll(/\('[0-9a-f-]{36}'::uuid\)/g)].length, 14);
  assert.match(preservationSnapshot, /source_invoice_row_count/);
  assert.match(preservationSnapshot, /raw_audit_hash/);
  for (const query of [preflight, postflight, preservationSnapshot]) {
    assert.match(query, /Read-only|Read-only|read-only/i);
    assert.doesNotMatch(query, /\b(?:INSERT\s+INTO|UPDATE\s+public\.|DELETE\s+FROM|TRUNCATE|ALTER|CREATE\s+(?:TABLE|FUNCTION|TRIGGER))\b/i);
  }
});
