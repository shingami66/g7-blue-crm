import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260930104338_w10_integrity_r1_accounting_guards.sql", import.meta.url),
  "utf8",
);
const fixture = readFileSync(
  new URL("../../../supabase/verification/w10f_revenue_recognition_rollback_regression.sql", import.meta.url),
  "utf8",
);

test("W10-INTEGRITY-R1 is additive and source-guards the three deployed RPCs", () => {
  assert.match(migration, /^-- W10-INTEGRITY-R1:[\s\S]*?\nBEGIN;/);
  assert.match(migration, /md5\(src\) IS DISTINCT FROM '36299c23ccbb8604914e779e4b23e559'/);
  assert.match(migration, /md5\(src\) IS DISTINCT FROM 'c6e4160e581b9e08ccb301043ad0863c'/);
  assert.match(migration, /md5\(src\) IS DISTINCT FROM 'cc7b4dca3fdf88c1feba223297c87465'/);
  assert.doesNotMatch(migration, /migration history|UPDATE supabase_migrations|DROP TABLE|DROP FUNCTION/i);
  assert.match(migration, /W10-INTEGRITY-R1 postflight: journal-prepare metadata changed/);
  assert.match(migration, /W10-INTEGRITY-R1 postflight: journal-reverse metadata changed/);
  assert.match(migration, /W10-INTEGRITY-R1 postflight: AP reconciliation metadata changed/);
});

test("W10-INTEGRITY-R1 blocks AR reversal, manual Revenue, and missing evidence", () => {
  assert.match(migration, /v_original\.source_domain='AR_BRIDGE'/);
  assert.match(migration, /v_source_domain='CONTROLLED_MANUAL'[\s\S]{0,180}p_evidence_ref/);
  assert.match(migration, /av\.account_type<>'REVENUE'/);
  assert.match(migration, /length\(btrim\(coalesce\(p_evidence_ref,''\)\)\)=0/);
  assert.match(fixture, /generic AR bridge reversal/);
  assert.match(fixture, /accepted manual preparation without evidence/);
  assert.match(fixture, /accepted direct manual Revenue posting/);
  assert.match(fixture, /accepted reversal without evidence/);
  assert.match(fixture, /governed Revenue correction lineage/);
  assert.match(fixture, /accounting:reconcile_bank' AND enabled AND runtime_allow_grantable AND owner_slice='W10G'/);
  assert.match(fixture, /accounting:close_period','accounting:reopen_period/);
});

test("W10-INTEGRITY-R1 selects AP profile metadata valid at recorded-at cutoff", () => {
  assert.match(migration, /pv0\.effective_from<=p_recorded_at_cutoff/);
  assert.match(migration, /pv0\.created_at<=p_recorded_at_cutoff/);
  assert.match(migration, /ORDER BY pv0\.effective_from DESC,pv0\.version DESC LIMIT 1/);
  assert.match(migration, /old_text:=\$old\$JOIN public\.accounting_profile_versions pv ON pv\.profile_id=p\.id AND pv\.version=p\.current_version/);
  assert.doesNotMatch(migration, /RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER PARALLEL UNSAFE COST 100 ROWS 0/);
  assert.match(fixture, /GRANT SELECT ON w10f_profile_cutover TO service_role/);
  assert.match(fixture, /coverage_payload:=jsonb_build_object\('accounting_start_date','2000-01-01','cutover_boundary_date','2001-12-31'/);
});
