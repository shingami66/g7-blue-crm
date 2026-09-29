import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260929194520_w10f_revenue_recognition_bridge.sql", import.meta.url),
  "utf8",
);
const fixture = readFileSync(
  new URL("../../../supabase/verification/w10f_revenue_recognition_rollback_regression.sql", import.meta.url),
  "utf8",
);

const tables = [
  "accounting_revenue_arrangements",
  "accounting_revenue_arrangement_versions",
  "accounting_revenue_arrangement_reviews",
  "accounting_revenue_performance_units",
  "accounting_revenue_performance_unit_versions",
  "accounting_revenue_performance_evidence",
  "accounting_revenue_performance_evidence_versions",
  "accounting_revenue_performance_evidence_reviews",
  "accounting_revenue_recognition_events",
  "accounting_revenue_recognition_journal_links",
  "accounting_revenue_recognition_journal_lines",
];

const rpcs = [
  "save_accounting_revenue_arrangement",
  "review_accounting_revenue_arrangement",
  "save_accounting_revenue_performance_evidence",
  "review_accounting_revenue_performance_evidence",
  "prepare_accounting_revenue_recognition",
  "post_accounting_revenue_recognition_journal",
  "get_accounting_revenue_recognition_reconciliation",
];

test("W10F adds only its immutable revenue evidence tables and seven RPC grants", () => {
  const createdTables = [...migration.matchAll(/CREATE TABLE public\.(\w+)/g)].map(([, name]) => name);
  assert.deepEqual(createdTables.sort(), [...tables].sort());
  const grantedRpcs = [...migration.matchAll(/GRANT EXECUTE ON FUNCTION public\.(\w+)\(/g)].map(([, name]) => name);
  assert.deepEqual(grantedRpcs.sort(), [...rpcs].sort());
  assert.match(migration, /FOREACH t IN ARRAY ARRAY\[[\s\S]*?'accounting_revenue_recognition_journal_lines'\]/);
  assert.match(migration, /ALTER TABLE public\.%I ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /ALTER TABLE public\.%I FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /REVOKE ALL ON public\.%I FROM PUBLIC,anon,authenticated,service_role/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.%I/);
  assert.match(migration, /'accounting:manage_revenue_recognition'[\s\S]{0,160}'W10F'/);
  assert.match(migration, /ADD CONSTRAINT accounting_journal_versions_source_domain_check[\s\S]{0,180}CHECK\(source_domain IN \('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE','REVENUE_RECOGNITION'\)\)/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.(?:accounting_(?:invoices|payments|bank_reconciliation|revenue_postings))\b/i);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.reverse_accounting_journal\b/i);
  assert.doesNotMatch(migration, /CREATE FUNCTION public\.(?:close|reopen|lock)_accounting_period\b/i);
});

test("W10F keeps commercial authority separate from performance evidence and holds unsupported treatments", () => {
  assert.match(migration, /approved_billing_scope_items i[\s\S]*?i\.accepted_subtotal-i\.source_discount_allocated/);
  assert.match(migration, /source_snapshot_sha256/);
  assert.match(migration, /satisfaction_method text NOT NULL CHECK\(satisfaction_method IN \('POINT_IN_TIME','OVER_TIME'\)\)/);
  assert.match(migration, /u->>'satisfaction_method'='POINT_IN_TIME' AND u->>'required_evidence_basis' NOT IN \('CUSTOMER_ACCEPTANCE','TRANSFER_OF_CONTROL'\)/);
  assert.match(migration, /uv\.satisfaction_method='POINT_IN_TIME' AND evv\.recognized_to_date_halalah<>uv\.allocated_halalah/);
  assert.match(migration, /p_accounting_date<evv\.performance_through[\s\S]*'recognition_before_performance'/);
  assert.match(migration, /v\.principal_agent_basis<>'PRINCIPAL'/);
  assert.match(migration, /REVENUE_CORRECTION_EVIDENCE_REQUIRED/);
  assert.match(migration, /correction_of_recognition_event_id/);
  assert.match(migration, /OPENING_BALANCE','RECONSTRUCTED_HISTORY','UNRESOLVED/);
  assert.match(migration, /REVENUE_RECOGNITION'[\s\S]{0,500}accounting:manage_revenue_recognition/);
  assert.match(migration, /p_as_of[\s\S]{0,300}p_cutoff/);
  assert.match(migration, /source_snapshot_sha256/);
  assert.doesNotMatch(migration, /WHEN p_source_type='INVOICE'[\s\S]{0,500}'credit_key','REVENUE'/);
  assert.doesNotMatch(migration, /CREATE TRIGGER[^;]*(?:public\.(?:invoices|payments|services)|event_cost|cost_close)[^;]*REVENUE_RECOGNITION/i);
});

test("W10F reconciliation is cutoff-aware and bounds every returned detail array", () => {
  assert.match(migration, /row_number\(\) OVER\(ORDER BY arrangement_id\)::integer display_number/);
  assert.match(migration, /FILTER\(WHERE v\.display_number<=p_limit\)/);
  assert.match(migration, /recognition_event_count/);
  assert.match(migration, /held_evidence_count/);
  assert.match(migration, /contract_diff_count>p_limit/);
  assert.match(migration, /'recognition_events',recognition_events/);
  assert.match(migration, /'contract_balance_difference_count',contract_diff_count/);
  assert.match(migration, /'bank_reconciled',false/);
  assert.match(migration, /e\.accounting_date<=p_as_of AND jv\.status='POSTED' AND jv\.posted_at<=p_cutoff/);
  assert.match(migration, /v\.created_at<=p_cutoff AND v\.source_approved_at<=p_cutoff/);
  assert.match(migration, /state:='TRUNCATED'/);
});

test("W10F does not broaden W10B function metadata or generic journal reversal authority", () => {
  for (const marker of [
    "W10F postflight: W10D helper metadata changed",
    "W10F postflight: account-save metadata changed",
    "W10F postflight: posting-mapping validator metadata changed",
    "W10F postflight: journal-prepare metadata changed",
    "W10F postflight: journal-post metadata changed",
  ]) assert.ok(migration.includes(marker), `missing metadata postflight ${marker}`);
  assert.match(migration, /header\.source_domain<>'REVENUE_RECOGNITION'[\s\S]{0,400}accounting_revenue_recognition_journal_link_authorized/);
  assert.doesNotMatch(migration, /v_original\.source_domain='REVENUE_RECOGNITION'/);
  assert.match(migration, /source_identity_immutable/);
});

test("W10F DEV proof is synthetic, rollback-only, and covers independent performance and contract authority", () => {
  assert.match(fixture, /^-- W10F synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  assert.match(fixture, /ROLLBACK;\s+DO \$w10f_residue_assertion\$/);
  assert.match(fixture, /capability='accounting:manage_ar_bridge' AND enabled AND runtime_allow_grantable AND owner_slice='W10D'/);
  assert.match(fixture, /capability='accounting:manage_revenue_recognition' AND enabled AND runtime_allow_grantable AND owner_slice='W10F'/);
  assert.match(fixture, /owner_slice='W10F' AND capability<>'accounting:manage_revenue_recognition'/);
  assert.match(fixture, /credits_refunds_requiring_revenue_review_count'<>'2'/);
  assert.match(fixture, /pg_temp\.w10f_fixture_hold\([\s\S]{0,160}'CREDIT_ADJUSTMENT'[\s\S]{0,120}'revenue_correction_required'/);
  assert.match(fixture, /pg_temp\.w10f_fixture_hold\([\s\S]{0,120}'REFUND'[\s\S]{0,120}'revenue_correction_required'/);
  for (const invariant of [
    "Invoice alone created Revenue",
    "Payment alone changed W10F Revenue",
    "Service completion alone created Revenue",
    "Event Cost Close alone created Revenue",
    "recognition_before_performance",
    "W10F lost stored W2C discount allocation",
    "POINT_IN_TIME",
    "OVER_TIME",
    "Explicit synthetic Revenue correction",
    "duplicate_coverage",
    "source_identity_immutable",
    "RECOGNITION_AMOUNT_OUTSIDE_UNIT_CEILING",
    "Hold changed promised output after W7 amendment",
    "Hold changed unit allocation after W7 amendment",
    "positive commercial successor",
    "MODIFICATION_BELOW_RECOGNIZED_AMOUNT",
    "stale_commercial_authority",
    "revenue_classification'='none'",
    "contract_asset_balance_halalah",
    "contract_liability_balance_halalah",
    "credits_refunds_requiring_revenue_review_count",
    "inception_covered_count",
    "fi012_timing_difference_count",
    "debits_equal_credits",
    "W10F synthetic residue detected after rollback",
  ]) assert.ok(fixture.includes(invariant), `missing W10F fixture invariant ${invariant}`);
  assert.doesNotMatch(fixture, /COMMIT;/);
});
