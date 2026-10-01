import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261001072553_w10i_accounting_period_close_lock_reopen.sql", import.meta.url),
  "utf8",
);
const fingerprintMigration = readFileSync(
  new URL("../../../supabase/migrations/20261001074513_w10i_live_fingerprint_uuid_text_cast.sql", import.meta.url),
  "utf8",
);
const w10hCompatibilityMigration = readFileSync(
  new URL("../../../supabase/migrations/20261001075335_w10i_post_cutover_report_boundary_compatibility.sql", import.meta.url),
  "utf8",
);
const auditActionCompatibilityMigration = readFileSync(
  new URL("../../../supabase/migrations/20261001082334_w10i_audit_action_compatibility.sql", import.meta.url),
  "utf8",
);
const controlledManualDraftMigration = readFileSync(
  new URL("../../../supabase/migrations/20261001102032_w10i_controlled_manual_draft_completeness.sql", import.meta.url),
  "utf8",
);
const fiscalYearBoundaryMigration = readFileSync(
  new URL("../../../supabase/migrations/20261001115425_w10i_balance_sheet_fiscal_year_boundary.sql", import.meta.url),
  "utf8",
);
const w10hStatementMigration = readFileSync(
  new URL("../../../supabase/migrations/20260930141934_w10h_accounting_statement_reporting.sql", import.meta.url),
  "utf8",
);
const fixture = readFileSync(
  new URL("../../../supabase/verification/w10i_accounting_period_close_lock_reopen_rollback_regression.sql", import.meta.url),
  "utf8",
);
const actions = readFileSync(new URL("./actions.ts", import.meta.url), "utf8");
const schemas = readFileSync(new URL("./schemas.ts", import.meta.url), "utf8");
const types = readFileSync(new URL("./types.ts", import.meta.url), "utf8");
const databaseTypes = readFileSync(new URL("../supabase/database.types.ts", import.meta.url), "utf8");

test("W10I adds only append-only close packages and review evidence", () => {
  const created = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map(([, name]) => name).sort();
  assert.deepEqual(created, ["accounting_period_close_packages", "accounting_period_close_reviews"]);
  for (const fn of [
    "prepare_accounting_period_close",
    "review_accounting_period_close",
    "get_accounting_period_close_evidence",
  ]) assert.match(migration, new RegExp(`CREATE FUNCTION public\\.${fn}\\b`));
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_period_close_packages/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_period_close_reviews/);
  assert.match(migration, /UNIQUE\(profile_id,period_id,package_version\)/);
  assert.match(migration, /FOREIGN KEY\(profile_id,period_id,package_id,package_version\)/);
  assert.doesNotMatch(migration, /INSERT INTO public\.accounting_journal(?:_versions|_line_versions)?\b/i);
});

test("W10I audit logs admit only the governed period transition actions", () => {
  assert.ok(migration.includes("v_package.package_kind||'_ACCOUNTING_PERIOD'"));
  assert.match(auditActionCompatibilityMigration, /entity_type='accounting_period'/);
  for (const action of ["CLOSE_ACCOUNTING_PERIOD", "LOCK_ACCOUNTING_PERIOD", "REOPEN_ACCOUNTING_PERIOD"]) {
    assert.match(auditActionCompatibilityMigration, new RegExp(`'${action}'::text`));
  }
  for (const inherited of ["customer_receipt_reversed", "accounting_revenue_recognition_event", "accounting_inception_package"]) {
    assert.ok(auditActionCompatibilityMigration.includes(inherited));
  }
});

test("W10I gates all period transitions and protects the W10A2 generic period writer", () => {
  assert.match(migration, /ACCOUNTING_PERIOD_CLOSE_REQUIRES_W10I/);
  assert.match(migration, /ACCOUNTING_PERIOD_LOCK_REQUIRES_W10I/);
  assert.match(migration, /ACCOUNTING_PERIOD_REOPEN_REQUIRES_W10I/);
  assert.match(migration, /v_prior\.status='OPEN' AND NEW\.status='CLOSED'/);
  assert.match(migration, /v_prior\.status='CLOSED' AND NEW\.status='LOCKED'/);
  assert.match(migration, /v_prior\.status IN \('CLOSED','LOCKED'\) AND NEW\.status='OPEN'/);
  assert.match(migration, /ACCOUNTING_PERIOD_BOUNDARY_IMMUTABLE_AFTER_POSTING/);
  assert.match(migration, /w10a2a-period:/);
  assert.match(migration, /earlier_period_open/);
  assert.match(migration, /later_finalized_period_exists/);
});

test("W10I binds close evidence to exact W10C-H period and recorded-at boundaries", () => {
  for (const fn of [
    "get_accounting_ar_bridge_reconciliation",
    "get_accounting_ap_bridge_reconciliation",
    "get_accounting_expense_bridge_reconciliation",
    "get_accounting_revenue_recognition_reconciliation",
    "get_accounting_bank_reconciliation",
    "get_w10h_accounting_report",
  ]) assert.ok(migration.includes(`public.${fn}(`), `missing ${fn}`);
  assert.match(migration, /v_ar->>'as_of_date' IS DISTINCT FROM v_period\.end_date::text/);
  assert.match(migration, /v_ap->>'as_of_date' IS DISTINCT FROM v_period\.end_date::text/);
  assert.match(migration, /v_expense->>'as_of_date' IS DISTINCT FROM v_period\.end_date::text/);
  assert.match(migration, /v_revenue->>'as_of_date' IS DISTINCT FROM v_period\.end_date::text/);
  assert.match(migration, /recorded_at_cutoff.*IS DISTINCT FROM p_recorded_at_cutoff/);
  assert.match(migration, /v_trial->>'from_date' IS DISTINCT FROM v_period\.start_date::text/);
  assert.match(migration, /v_balance->>'through_date' IS DISTINCT FROM v_period\.end_date::text/);
  assert.match(migration, /INCEPTION_ACCEPTANCE_UNAVAILABLE_OR_INCOMPATIBLE/);
  assert.match(migration, /UNAUTHORIZED_RESULT_TRANSFER_SOURCE_PRESENT/);
  assert.match(migration, /HELD_OR_UNRESOLVED_SOURCE_EFFECTS/);
});

test("W10I handles stale reviews, independent approval, year-end lock hold, and reopen lineage", () => {
  assert.match(migration, /ACCOUNTING_PERIOD_CLOSE_INDEPENDENT_REVIEW_REQUIRED/);
  assert.match(migration, /v_fingerprint IS DISTINCT FROM v_package\.evidence_fingerprint/);
  assert.match(migration, /v_snapshot->>'ledger_fingerprint' IS DISTINCT FROM v_package\.ledger_fingerprint/);
  assert.match(migration, /year_end_result_treatment_pending/);
  assert.match(migration, /prior_finalization/);
  assert.match(migration, /resulting_period_version=v_period\.version/);
  assert.match(migration, /v_package\.package_kind='REOPEN'/);
  assert.match(migration, /accounting_period_close_live_fingerprint/);
  assert.match(migration, /p_recorded_at_cutoff>clock_timestamp\(\)/);
});

test("W10I fingerprints text-backed profile IDs without weakening helper access", () => {
  assert.match(fingerprintMigration, /CREATE OR REPLACE FUNCTION public\.accounting_period_close_live_fingerprint/);
  assert.ok(fingerprintMigration.includes("''profile_id''=$1::text"));
  assert.match(fingerprintMigration, /SECURITY DEFINER[\s\S]*SET search_path=pg_catalog,public/);
  assert.match(fingerprintMigration, /REVOKE ALL ON FUNCTION public\.accounting_period_close_live_fingerprint\(uuid\)[\s\S]*FROM PUBLIC,anon,authenticated,service_role/);
});

test("W10I carries accepted cutover balances into later W10H reports", () => {
  assert.match(w10hCompatibilityMigration, /pg_get_functiondef/);
  assert.match(w10hCompatibilityMigration, /a\.as_of_date>=p_through_date OR/);
  assert.match(w10hCompatibilityMigration, /pv_cutover\.cutover_boundary_date=a\.as_of_date/);
  assert.match(w10hCompatibilityMigration, /pv_cutover\.created_at<=v_cutoff/);
  assert.match(w10hCompatibilityMigration, /pv_cutover\.effective_from</);
  assert.match(w10hCompatibilityMigration, /REPLACE\(v_definition,v_old,v_new\)/i);
  assert.doesNotMatch(w10hCompatibilityMigration, /DROP FUNCTION/i);
});

test("W10I excludes only the prepared controlled-manual draft from W10H and close completeness", () => {
  for (const signature of [
    "public.get_w10h_accounting_report(uuid,text,date,date,timestamptz,uuid,uuid,integer,integer)",
    "public.accounting_period_close_capture(uuid,uuid,timestamptz)",
  ]) assert.ok(controlledManualDraftMigration.includes(signature), "missing " + signature);
  assert.equal(
    [...controlledManualDraftMigration.matchAll(/e\.status='PREPARED' AND j\.status='DRAFT' AND e\.source_domain='CONTROLLED_MANUAL'/g)].length,
    2,
  );
  assert.match(controlledManualDraftMigration, /length\(v_report_before\.prosrc\)-length\(replace\(v_report_before\.prosrc,v_report_old,''\)\)<>length\(v_report_old\)/);
  assert.match(controlledManualDraftMigration, /length\(v_close_before\.prosrc\)-length\(replace\(v_close_before\.prosrc,v_close_old,''\)\)<>length\(v_close_old\)/);
  assert.match(controlledManualDraftMigration, /proacl IS DISTINCT FROM v_report_before\.proacl/);
  assert.match(controlledManualDraftMigration, /proacl IS DISTINCT FROM v_close_before\.proacl/);
  assert.doesNotMatch(controlledManualDraftMigration, /UPDATE public\.accounting_source_effects|DELETE FROM public\.accounting_source_effects|DROP FUNCTION/i);
});

test("W10I validates Balance Sheet from_date against the W10H fiscal-year boundary", () => {
  assert.match(fiscalYearBoundaryMigration, /v_old_boundary[\s\S]*v_balance->>'from_date' IS DISTINCT FROM v_period\.start_date::text/);
  assert.match(fiscalYearBoundaryMigration, /v_new_boundary[\s\S]*v_balance->>'from_date' IS DISTINCT FROM \(CASE/);
  assert.match(fiscalYearBoundaryMigration, /v_profile_version\.fiscal_start_month/);
  assert.match(fiscalYearBoundaryMigration, /v_profile_version\.fiscal_start_day-1/);
  assert.match(fiscalYearBoundaryMigration, /extract\(year FROM v_period\.end_date\)::integer-1/);
  assert.match(fiscalYearBoundaryMigration, /IS DISTINCT FROM \(CASE[\s\S]*?END\)::text/);
  assert.match(fiscalYearBoundaryMigration, /length\(v_before\.prosrc\)-length\(replace\(v_before\.prosrc,v_old_boundary,''\)\)<>length\(v_old_boundary\)/);
  assert.match(fiscalYearBoundaryMigration, /v_after\.proacl IS DISTINCT FROM v_before\.proacl/);
  assert.doesNotMatch(fiscalYearBoundaryMigration, /1901-01-01|2026-01-01/);

  assert.match(migration, /SELECT pv\.\* INTO v_profile_version[\s\S]*pv\.created_at<=p_recorded_at_cutoff[\s\S]*AT TIME ZONE 'Asia\/Riyadh'/);
  assert.match(w10hStatementMigration, /v_current_fy_start:=make_date\(extract\(year FROM p_through_date\)::integer,v_fiscal_start_month,1\)\+\(v_fiscal_start_day-1\)/);
  assert.match(w10hStatementMigration, /v_mapping_cutoff:=\(p_through_date::timestamp\+interval '1 day'\) AT TIME ZONE v_fiscal_timezone/);

  assert.match(migration, /v_trial->>'from_date' IS DISTINCT FROM v_period\.start_date::text/);
  assert.match(migration, /v_pnl->>'from_date' IS DISTINCT FROM v_period\.start_date::text/);
  for (const report of ["v_trial", "v_pnl", "v_balance"]) {
    assert.match(migration, new RegExp(`${report}->>'through_date' IS DISTINCT FROM v_period\\.end_date::text`));
    assert.match(migration, new RegExp(`\\(${report}->>'recorded_at_cutoff'\\)::timestamptz IS DISTINCT FROM p_recorded_at_cutoff`));
  }
  assert.ok(fixture.includes("W10I CASE: first fiscal period accepts the fiscal-year Balance Sheet boundary"));
  assert.ok(fixture.includes("W10I CASE: later fiscal period accepts the fiscal-year Balance Sheet boundary"));
  const missingCoverageGuard = fixture.indexOf("BANK_RECONCILIATION_INCOMPLETE_OR_INCOMPATIBLE");
  const februaryStatementSetup = fixture.indexOf("'Record W10I February statement'");
  assert.ok(missingCoverageGuard >= 0 && februaryStatementSetup > missingCoverageGuard,
    "February bank coverage must be created after the missing-coverage blocker is asserted");
  assert.ok(fixture.includes("W10I CASE: empty February coverage requires no reconciliation allocation group"));
  assert.ok(!fixture.includes("synthetic://w10i/bank/reconcile/february"),
    "the fixture must not call the bank reconciliation RPC with an empty allocation array");
});

test("W10I enables only its existing capabilities and keeps evidence RPCs private", () => {
  assert.match(migration, /UPDATE public\.accounting_capability_catalog[\s\S]*?SET enabled=true,runtime_allow_grantable=true[\s\S]*?accounting:close_period/);
  assert.match(migration, /owner_slice='W10I'/);
  assert.match(migration, /accounting_capability_catalog_state_check/);
  assert.match(migration, /FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /FROM PUBLIC,anon,authenticated,service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.prepare_accounting_period_close[\s\S]*TO service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.review_accounting_period_close[\s\S]*TO service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_accounting_period_close_evidence[\s\S]*TO service_role/);
  assert.match(migration, /search_path=pg_catalog,public/);
  assert.match(migration, /OWNER TO postgres/);
});

test("W10I TypeScript contract validates preparation, review, and as-known period state", () => {
  assert.match(actions, /prepareAccountingPeriodClose/);
  assert.match(actions, /reviewAccountingPeriodClose/);
  assert.match(actions, /accounting:close_period/);
  assert.match(actions, /accounting:reopen_period/);
  assert.match(schemas, /prepareAccountingPeriodCloseInputSchema/);
  assert.match(schemas, /reviewAccountingPeriodCloseInputSchema/);
  assert.match(schemas, /current_period/);
  assert.match(types, /AccountingPeriodClose/);
  assert.match(databaseTypes, /prepare_accounting_period_close/);
  assert.match(databaseTypes, /review_accounting_period_close/);
  assert.match(databaseTypes, /get_accounting_period_close_evidence/);
});

test("W10I rollback fixture names at least 54 regression cases and ends with residue proof", () => {
  assert.match(fixture, /^-- W10I synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  assert.match(fixture, /ROLLBACK;\s+DO \$w10i_residue_assertion\$/);
  const cases = [...fixture.matchAll(/^-- W10I CASE: .+$/gm)];
  assert.ok(cases.length >= 54, `expected at least 54 W10I fixture cases; found ${cases.length}`);
  for (const text of [
    "capability activation", "Admin wildcard denied", "direct DML denied", "RLS forced", "RPC ACL",
    "UUID profile fingerprint handles text-backed rows",
    "accepted inception supports post-cutover W10H evidence",
    "close readiness", "independent review", "stale close", "closed period blocks post",
    "closed period blocks reversal", "year-end close accepted", "year-end lock held",
    "locked period blocks post", "locked period blocks reversal", "reopen lineage",
    "reopen requires separate capability", "save period cannot reopen", "later period chronology",
    "controlled-manual draft does not block close", "close preserves prepared controlled-manual draft",
    "stale draft remains unpostable after reopen",
    "accepted W10C inception at cutoff",
    "rollback zero residue",
  ]) assert.ok(fixture.includes(`W10I CASE: ${text}`), `missing ${text}`);
  assert.match(fixture, /'cutover_boundary_date','1900-01-01'/);
  assert.match(fixture, /accounting_ar_bridge_source_inventory\('1900-12-31'/);
  assert.match(fixture, /W10I synthetic cutoff overlaps live bridge source inventory/);
  assert.match(fixture, /UNAUTHORIZED_RESULT_TRANSFER_SOURCE_PRESENT/);
  for (const fn of [
    "save_accounting_inception_package", "review_accounting_inception_package",
    "prepare_accounting_inception_journal", "post_accounting_inception_journal",
    "accept_accounting_inception_package",
  ]) assert.ok(fixture.includes(`public.${fn}(`), `missing accepted W10C setup call ${fn}`);
  assert.match(fixture, /inception_result\.acceptance_id IS NULL/);
  assert.match(fixture, /post_accounting_journal\(c\.operator_id,c\.draft_journal_id,c\.draft_journal_version,[\s\S]*?pg_temp\.w10i_req\(361\)\)/);
  assert.match(fixture, /j\.status='DRAFT' AND j\.posted_at IS NULL[\s\S]*?e\.status='PREPARED' AND e\.source_domain='CONTROLLED_MANUAL'/);
});
