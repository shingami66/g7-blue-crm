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
const correctiveMigration = readFileSync(
  new URL("../../../supabase/migrations/20260930000000_w10f_reconciliation_unit_total_arrangement_alias_fix.sql", import.meta.url),
  "utf8",
);
const revenueAliasMigration = readFileSync(
  new URL("../../../supabase/migrations/20260930010000_w10f_reconciliation_revenue_alias_fix.sql", import.meta.url),
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
  assert.match(migration, /source_effect_id uuid NOT NULL REFERENCES public\.accounting_source_effects\(id\) ON DELETE RESTRICT/);
  assert.match(migration, /old_text:=\$old\$ IF v_header\.status='POSTED' THEN\$old\$/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.%I/);
  assert.match(migration, /'accounting:manage_revenue_recognition'[\s\S]{0,160}'W10F'/);
  assert.match(migration, /ADD CONSTRAINT accounting_journal_versions_source_domain_check[\s\S]{0,180}CHECK\(source_domain IN \('CONTROLLED_MANUAL','INCEPTION','AR_BRIDGE','AP_BRIDGE','EXPENSE_BRIDGE','REVENUE_RECOGNITION'\)\)/);
  assert.doesNotMatch(migration, /CREATE TABLE public\.(?:accounting_(?:invoices|payments|bank_reconciliation|revenue_postings))\b/i);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.reverse_accounting_journal\b/i);
  assert.doesNotMatch(migration, /CREATE FUNCTION public\.(?:close|reopen|lock)_accounting_period\b/i);
});

test("W10F keeps commercial authority separate from performance evidence and holds unsupported treatments", () => {
  assert.match(migration, /approved_billing_scope_items i[\s\S]*?i\.accepted_subtotal-i\.source_discount_allocated/);
  assert.match(migration, /SELECT coalesce\(sum\(round\(\(i\.accepted_subtotal-i\.source_discount_allocated\)\*100,0\)\),0\)::bigint\s+INTO amount[\s\S]*?i\.decision IN \('accepted','adjusted'\) AND \(i\.source_commercial_role='authority_line'/);
  assert.match(migration, /SELECT coalesce\(bool_or\(i\.accepted_vat_amount<>0[\s\S]*?\),false\)\s+OR s\.accepted_vat_amount<>0 OR s\.source_vat_rate<>0 OR upper\(s\.source_currency\)<>'SAR'\s+INTO unsupported\s+FROM public\.approved_billing_scope_items i WHERE i\.approved_billing_scope_id=s\.id AND i\.decision IN \('accepted','adjusted'\);/);
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

test("W10F post-apply reconciliation repair is additive, exact-source guarded, and metadata-preserving", () => {
  assert.match(correctiveMigration, /^-- W10F additive correction:[\s\S]*?\nBEGIN;/);
  assert.match(correctiveMigration, /md5\(src\) IS DISTINCT FROM '9a072554114044cfc52ad4ca3de420e4'/);
  assert.match(correctiveMigration, /old_text:=\$old\$unit_totals AS \([\s\S]*?WHERE a\.rn=1 GROUP BY a\.id\s+\)\$old\$/);
  assert.match(correctiveMigration, /new_text:=\$new\$unit_totals AS \([\s\S]*?WHERE a\.rn=1 GROUP BY a\.arrangement_id\s+\)\$new\$/);
  assert.match(correctiveMigration, /CREATE OR REPLACE FUNCTION public\.get_accounting_revenue_recognition_reconciliation/);
  assert.match(correctiveMigration, /p\.proargnames,p\.proargdefaults::text,pg_catalog\.pg_get_function_arguments\(p\.oid\)/);
  assert.match(correctiveMigration, /arg_names IS DISTINCT FROM ARRAY\['p_actor','p_as_of','p_cutoff','p_limit'\]/);
  assert.match(correctiveMigration, /signature IS DISTINCT FROM 'p_actor uuid, p_as_of date, p_cutoff timestamp with time zone, p_limit integer DEFAULT 200'/);
  assert.match(correctiveMigration, /p_limit integer DEFAULT 200/);
  assert.match(correctiveMigration, /after_arg_names IS DISTINCT FROM arg_names[\s\S]*?after_arg_defaults IS DISTINCT FROM arg_defaults[\s\S]*?after_signature IS DISTINCT FROM signature/);
  assert.match(correctiveMigration, /postflight: function metadata changed/);
  assert.match(correctiveMigration, /COMMIT;\s*$/);
});

test("W10F Revenue balance repair qualifies the CTE output and preserves the function interface", () => {
  assert.match(revenueAliasMigration, /^-- W10F additive correction:[\s\S]*?\nBEGIN;/);
  assert.match(revenueAliasMigration, /md5\(src\) IS DISTINCT FROM '9902defb4dfbb6059428bdc6162300e4'/);
  assert.match(revenueAliasMigration, /old_text:=\$old\$SELECT contract_asset,contract_liability,revenue INTO asset,liability,revenue FROM balances\$old\$/);
  assert.match(revenueAliasMigration, /new_text:=\$new\$SELECT b\.contract_asset,b\.contract_liability,b\.revenue INTO asset,liability,revenue FROM balances b\$new\$/);
  assert.match(revenueAliasMigration, /arg_names IS DISTINCT FROM ARRAY\['p_actor','p_as_of','p_cutoff','p_limit'\]/);
  assert.match(revenueAliasMigration, /signature IS DISTINCT FROM 'p_actor uuid, p_as_of date, p_cutoff timestamp with time zone, p_limit integer DEFAULT 200'/);
  assert.match(revenueAliasMigration, /after_arg_names IS DISTINCT FROM arg_names[\s\S]*?after_arg_defaults IS DISTINCT FROM arg_defaults[\s\S]*?after_signature IS DISTINCT FROM signature/);
  assert.match(revenueAliasMigration, /postflight: function metadata changed/);
  assert.match(revenueAliasMigration, /COMMIT;\s*$/);
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
