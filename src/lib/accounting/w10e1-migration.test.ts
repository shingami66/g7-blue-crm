import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const migration = read("supabase/migrations/20260929053102_w10e1_procurement_ap_accounting_bridge.sql");
const correction = read("supabase/migrations/20260929105800_w10e1_receipt_match_snapshot_path_correction.sql");
const fixture = read("supabase/verification/w10e1_procurement_ap_bridge_rollback_regression.sql");
const types = read("src/lib/accounting/types.ts");
const schemas = read("src/lib/accounting/schemas.ts");
const actions = read("src/lib/accounting/actions.ts");
const queries = read("src/lib/accounting/queries.ts");

const sourceTypes = [
  "SERVICE_RECEIPT", "SERVICE_RECEIPT_CORRECTION", "SUPPLIER_BILL", "SUPPLIER_PAYMENT",
  "SUPPLIER_PAYMENT_REVERSAL", "SUPPLIER_ADVANCE_PAYMENT", "SUPPLIER_ADVANCE_PAYMENT_REVERSAL",
  "SUPPLIER_ADVANCE_ALLOCATION", "SUPPLIER_ADVANCE_ALLOCATION_REVERSAL", "SUPPLIER_ADVANCE_REFUND",
];

test("W10E1 adds only the four versioned AP bridge records and grants only governed RPCs", () => {
  assert.match(migration, /^-- W10E1:[^\n]+\n[\s\S]*?\nBEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
  assert.deepEqual(
    [...migration.matchAll(/CREATE TABLE public\.(accounting_ap_bridge_[a-z_]+)/g)].map(([, name]) => name),
    [
      "accounting_ap_bridge_events", "accounting_ap_bridge_event_versions",
      "accounting_ap_bridge_journal_links", "accounting_ap_bridge_journal_lines",
    ],
  );
  for (const rpc of [
    "save_accounting_ap_bridge_event", "prepare_accounting_ap_bridge_event",
    "post_accounting_ap_bridge_journal", "get_accounting_ap_bridge_reconciliation",
  ]) {
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${rpc}\\(`));
    assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.${rpc}\\(`));
  }
  assert.match(migration, /accounting:manage_ap_bridge/);
  assert.match(migration, /IS DISTINCT FROM '9e1b901c370c6ffb7d776dacb5ba54c6'/);
  const accountSaveExtension = migration.match(/v_function:=to_regprocedure\('public\.save_accounting_account\([\s\S]*?v_function:=to_regprocedure\('public\.validate_accounting_posting_rule_mapping\(\)'\);/)?.[0];
  assert.ok(accountSaveExtension);
  assert.match(accountSaveExtension, /v_config IS DISTINCT FROM ARRAY\['search_path=pg_catalog, public, extensions'\]/);
  assert.match(accountSaveExtension, /SET search_path=pg_catalog, public, extensions AS %L/);
  assert.match(migration, /'AP_BRIDGE'/);
  assert.match(migration, /'ACCRUED_LIABILITY'/);
  assert.match(migration, /accounting_ap_bridge_event_versions ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /accounting_ap_bridge_links_immutable/);
  assert.match(migration, /accounting_ap_bridge_lines_immutable/);
});

test("W10E1 snapshots every supported W6 source and never creates an authorization or refund-reversal journal", () => {
  const snapshot = migration.match(/CREATE FUNCTION public\.accounting_ap_bridge_source_snapshot[\s\S]*?\$ap_source_snapshot\$;/)?.[0];
  const inventory = migration.match(/CREATE FUNCTION public\.accounting_ap_bridge_source_inventory[\s\S]*?\$ap_source_inventory\$;/)?.[0];
  assert.ok(snapshot);
  assert.ok(inventory);
  for (const sourceType of sourceTypes) {
    assert.ok(snapshot.includes(`WHEN '${sourceType}'`), `snapshot is missing ${sourceType}`);
    assert.ok(inventory.includes(`'${sourceType}'`), `inventory is missing ${sourceType}`);
  }
  assert.match(snapshot, /'received_amount_excluded',true/);
  assert.match(snapshot, /'prior_received_amount_excluded',true/);
  assert.match(snapshot, /'corrected_received_amount_excluded',true/);
  assert.doesNotMatch(snapshot, /round\(r\.received_amount/);
  assert.doesNotMatch(migration, /SUPPLIER_ADVANCE_REFUND_REVERSAL/);
  assert.doesNotMatch(inventory, /approved_commitment_amendments|supplier_advances a\s+WHERE/);
});

test("W10E1 additive correction matches receipt identity at the source snapshot root", () => {
  assert.match(correction, /^-- W10E1 corrective migration:[^\n]+\nBEGIN;/);
  assert.ok(correction.includes("v_old:='e.source_record_id=nullif(v_snapshot->''attributes''->>''receipt_id'','''')::uuid';"));
  assert.ok(correction.includes("v_new:='e.source_record_id=nullif(v_snapshot->>''receipt_id'','''')::uuid';"));
  assert.match(correction, /v_after_owner IS DISTINCT FROM v_owner OR v_after_acl IS DISTINCT FROM v_acl/);
  assert.match(correction, /v_after_config IS DISTINCT FROM v_config OR v_source IS DISTINCT FROM v_repaired/);
  assert.match(correction, /COMMIT;\s*$/);
});

test("receipt and bill journal rules require evidence, preserve identity, and enforce accrual coverage", () => {
  assert.match(migration, /p_source_type='SERVICE_RECEIPT_CORRECTION' AND p_amount_halalah IS NULL/);
  const saveInputGuard = migration.match(/IF p_actor_user_id IS NULL[\s\S]*?THEN\s+RETURN QUERY SELECT 'invalid_input'/)?.[0];
  assert.ok(saveInputGuard);
  assert.doesNotMatch(saveInputGuard, /p_source_type IN \('SERVICE_RECEIPT','SERVICE_RECEIPT_CORRECTION'\) AND p_amount_halalah IS NULL/);
  assert.match(migration, /p_source_type IN \('SERVICE_RECEIPT','SERVICE_RECEIPT_CORRECTION'\)\s+AND \(p_amount_halalah IS NULL OR p_evidence_ref IS NULL OR v_direct IS NULL\)/);
  assert.match(migration, /'accrued_liability','role','ACCRUED_LIABILITY','side','CREDIT'/);
  assert.match(migration, /'accrued_liability','role','ACCRUED_LIABILITY','side','DEBIT','amount',p_matched/);
  assert.match(migration, /direct_residual_evidence_missing/);
  assert.match(migration, /receipt_accrual_missing/);
  assert.match(migration, /receipt_match_exceeds_accrual/);
  assert.match(migration, /ev\.supplier_id=\(v_snapshot->>'supplier_id'\)::uuid/);
  assert.match(migration, /ev\.service_id IS NOT DISTINCT FROM nullif\(v_snapshot->>'service_id',''\)::uuid/);
  assert.match(migration, /commitment_id' IS NOT DISTINCT FROM v_snapshot->'attributes'->>'commitment_id'/);
  assert.match(migration, /vat_not_supported/);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.(?:get_supplier_bill_payment_balances|get_accounts_payable_report)/);
});

test("cash, payment, and advance journal shapes remain source-bound and do not imply bank reconciliation", () => {
  assert.match(migration, /'cash_account',\s*'role','CASH_ACCOUNT','side','CREDIT'/);
  assert.match(migration, /'cash_binding_evidence_ref'/);
  assert.match(migration, /p_mapping_key='cash_account'[\s\S]*?v_version\.cash_account_id IS DISTINCT FROM p_account_id/);
  assert.match(migration, /p_cash_binding_evidence_ref IS NULL OR p_cash_account_id IS NULL/);
  assert.match(migration, /'SUPPLIER_ADVANCE','side','DEBIT'/);
  assert.match(migration, /'ACCOUNTS_PAYABLE','side','DEBIT','amount',p_amount/);
  assert.match(migration, /'SUPPLIER_ADVANCE','side','CREDIT','amount',p_amount/);
  assert.match(migration, /advance_authorization_exceeded/);
  assert.match(migration, /'cash_movement',false,'expense_recognition',false/);
  assert.match(migration, /'refund_reversal_supported',false/);
  assert.match(migration, /'inception_coverage_conflict','cash_binding_mismatch'/);
  assert.match(migration, /'bank_reconciled',false/);
  assert.doesNotMatch(migration, /'SUPPLIER_ADVANCE_REFUND_REVERSAL'/);
  assert.doesNotMatch(migration, /INSERT INTO public\.(?:supplier_payments|supplier_advance_payments|supplier_advance_allocations|supplier_advance_refunds)/i);
});

test("historical AP reconciliation uses recorded-at and business cutoffs and reports control differences", () => {
  assert.match(migration, /accounting_ap_bridge_source_snapshot\(b\.source_type,b\.source_record_id,p_recorded_at_cutoff\)/);
  assert.match(migration, /x\.created_at<=p_recorded_at_cutoff AND x\.source_recorded_at<=p_recorded_at_cutoff/);
  assert.match(migration, /x\.created_at<=p_recorded_at_cutoff AND \(x\.status<>'POSTED' OR x\.posted_at<=p_recorded_at_cutoff\)/);
  assert.match(migration, /ACCOUNTING_DATE_AFTER_CUTOFF/);
  for (const field of [
    "expected_effect_count", "duplicate_conflict_count", "accrued_unbilled_halalah",
    "accounts_payable_halalah", "supplier_advance_halalah", "control_balances",
    "supplier_balances", "service_balances", "matching_coverage", "timing_differences",
  ]) assert.ok(migration.includes(`'${field}'`), `reconciliation omits ${field}`);
  assert.match(migration, /RECONSTRUCTED_HISTORY','OPENING_BALANCE','UNRESOLVED/);
  assert.match(migration, /POST_CUTOVER_SOURCE/);
  assert.match(migration, /LIMIT p_limit/);
  assert.doesNotMatch(migration, /supplier_bill_payment_balances|supplier_advance_balances|get_accounts_payable_report\(/);
});

test("typed server actions, capability checks, and schemas expose the minimum AP bridge surface", () => {
  assert.match(types, /"accounting:manage_ap_bridge"/);
  assert.match(types, /"AP_BRIDGE"/);
  assert.match(types, /AccountingApBridgeReconciliation/);
  assert.match(schemas, /saveAccountingApBridgeEventInputSchema/);
  assert.match(schemas, /Cash movement requires explicit account binding evidence/);
  assert.match(schemas, /Only receipt valuations accept an externally evidenced amount/);
  assert.match(actions, /requireAccountingCapabilities\(actor\.id, \["accounting:manage_ap_bridge"\]\)/);
  assert.match(queries, /resolveAccountingCapability\(actor\.id, "accounting:manage_ap_bridge"\)/);
});

test("rollback campaign names and asserts all 33 required scenarios", () => {
  assert.match(fixture, /^-- W10E1 synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  assert.match(fixture, /ROLLBACK;[\s\S]*DO \$residue_assertion\$/);
  for (let caseNumber = 1; caseNumber <= 33; caseNumber += 1) {
    assert.ok(fixture.includes(`(${caseNumber},`), `rollback fixture is missing scenario ${caseNumber}`);
  }
  assert.match(fixture, /w10e1_case_results/);
  assert.match(fixture, /FROM pg_temp\.w10e1_fixture_accounts a WHERE a\.mapping_key<>'cash_account_alt'/);
  assert.match(fixture, /\$setup_accounting\$;\s+-- Seed W6 source facts and inspect rollback-only accounting rows as the fixture owner\.\s+RESET ROLE;[\s\S]*?DO \$w10e1_campaign\$/);
  assert.match(fixture, /has_function_privilege\('service_role','public\.get_accounting_ap_bridge_reconciliation/);
  assert.match(fixture, /has_table_privilege\('service_role',table_name,'SELECT'\)/);
  assert.match(fixture, /SELECT count\(\*\) INTO v_event_count FROM pg_temp\.w10e1_case_results/);
  assert.match(fixture, /<>33/);
  for (const description of [
    "accepted receipt with supported expense valuation", "accepted receipt with unsupported valuation held",
    "partial Supplier Bill matching", "multiple bills against one eligible accrual",
    "payment reversal holds a mismatched cash binding before a supported correction",
    "advance payment reversal holds a mismatched cash binding before a supported correction",
    "correction conflicting with already matched bill held", "explicit bank cash binding requirement",
    "same request retry idempotency", "W10C inception replay protection", "accounting date cutoff",
    "recorded-at cutoff", "original/reversal historical cutoff", "explicit rollback",
    "rollback leaves zero synthetic residue",
  ]) assert.ok(fixture.toLowerCase().includes(description.toLowerCase()), `fixture is missing scenario ${description}`);
  assert.match(fixture, /supplier_bill_payment_balances|W9.*current-only/i);
});
