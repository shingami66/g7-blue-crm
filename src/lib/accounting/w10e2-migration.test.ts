import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const root = new URL("../../../", import.meta.url);
const read = (path: string) => readFileSync(new URL(path, root), "utf8");
const migration = read("supabase/migrations/20260929120000_w10e2_expense_cash_accounting_bridge.sql");
const prepareEventVersionFix = read("supabase/migrations/20260929143100_w10e2_prepare_event_version_alias_fix.sql");
const postEventJournalIdFix = read("supabase/migrations/20260929145412_w10e2_post_event_journal_id_alias_fix.sql");
const reconciliationInventoryAliasFix = read("supabase/migrations/20260929154055_w10e2_reconciliation_inventory_column_alias_fix.sql");
const reconciliationEmployeeScopeFix = read("supabase/migrations/20260929163000_w10e2_reconciliation_employee_balance_scope_fix.sql");
const fixture = read("supabase/verification/w10e2_expense_cash_accounting_bridge_rollback_regression.sql");
const types = read("src/lib/accounting/types.ts");
const schemas = read("src/lib/accounting/schemas.ts");
const actions = read("src/lib/accounting/actions.ts");
const queries = read("src/lib/accounting/queries.ts");
const databaseTypes = read("src/lib/supabase/database.types.ts");

test("W10E2 creates append-only bridge records, protected controls, and governed RPC grants", () => {
  assert.match(migration, /^-- W10E2:[^\n]+\n[\s\S]*?\nBEGIN;/);
  assert.match(migration, /COMMIT;\s*$/);
  assert.deepEqual([...migration.matchAll(/CREATE TABLE public\.(accounting_expense_bridge_[a-z_]+)/g)].map(([, n]) => n), [
    "accounting_expense_bridge_events", "accounting_expense_bridge_event_versions",
    "accounting_expense_bridge_journal_links", "accounting_expense_bridge_journal_lines",
  ]);
  for (const rpc of ["save_accounting_expense_bridge_event", "prepare_accounting_expense_bridge_event",
    "post_accounting_expense_bridge_journal", "get_accounting_expense_bridge_reconciliation"]) {
    assert.match(migration, new RegExp("GRANT EXECUTE ON FUNCTION public\\." + rpc + "\\("));
    assert.match(migration, new RegExp("REVOKE ALL ON FUNCTION public\\." + rpc + "\\("));
  }
  assert.match(migration, /accounting:manage_expense_bridge/);
  assert.match(migration, /'EXPENSE_BRIDGE'/);
  assert.match(migration, /'EMPLOYEE_REIMBURSEMENT_LIABILITY'/);
  assert.match(migration, /ENABLE ROW LEVEL SECURITY;[^]*FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /accounting_expense_bridge_(versions|links|lines)_immutable/);
});

test("W10E2 additive correction qualifies the return-column conflict and guards deployed identity", () => {
  assert.match(prepareEventVersionFix, /^-- W10E2 additive correction:[^\n]+\nBEGIN;[\s\S]*COMMIT;\s*$/);
  assert.match(prepareEventVersionFix, /md5\(v_before\.prosrc\)<>'9174ae9e235ce6354d5870267816194e'/);
  assert.match(prepareEventVersionFix, /v_old_anchor text := '[^']*event_id=e\.id AND version=p_event_version;'/);
  assert.match(prepareEventVersionFix, /v_new_anchor text := '[^']*event_id=e\.id AND ev\.version=p_event_version;'/);
  assert.match(prepareEventVersionFix, /pg_get_function_identity_arguments\(v_function\)[\s\S]*?pg_get_function_result\(v_function\)/);
  assert.match(prepareEventVersionFix, /v_before\.proacl::text IS DISTINCT FROM '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
  assert.match(prepareEventVersionFix, /v_after\.proacl::text IS DISTINCT FROM '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
  assert.match(prepareEventVersionFix, /v_after\.prosrc IS DISTINCT FROM v_expected_source/);
  assert.match(prepareEventVersionFix, /EXECUTE v_updated/);
});

test("W10E2 post correction qualifies journal id and serializes exact PL/pgSQL replacement", () => {
  assert.match(postEventJournalIdFix, /^-- W10E2 additive correction:[^\n]+\nBEGIN;\s*-- Serialize cooperating retries[^\n]*\nSELECT pg_catalog\.pg_advisory_xact_lock\(pg_catalog\.hashtextextended\([\s\S]*?'g7:w10e2:post_accounting_expense_bridge_journal', 0[\s\S]*?\);[\s\S]*COMMIT;\s*$/);
  assert.doesNotMatch(postEventJournalIdFix, /LOCK TABLE pg_catalog\.pg_proc/);
  assert.match(postEventJournalIdFix, /pg_catalog\.pg_language l ON l\.oid=p\.prolang/);
  assert.match(postEventJournalIdFix, /v_before\.language_name IS DISTINCT FROM 'plpgsql'/);
  assert.match(postEventJournalIdFix, /v_before\.probin IS NOT NULL/);
  assert.match(postEventJournalIdFix, /v_before\.pronargdefaults IS DISTINCT FROM 0/);
  assert.match(postEventJournalIdFix, /v_before\.proargdefaults_text IS NOT NULL/);
  assert.match(postEventJournalIdFix, /v_before\.prosqlbody_text IS NOT NULL/);
  assert.match(postEventJournalIdFix, /pg_catalog\.md5\(v_before\.prosrc\) IS DISTINCT FROM 'f26b19c03eec9b34550e4ab8b8dea3d6'/);
  assert.match(postEventJournalIdFix, /v_old_anchor text := '[^']*accounting_expense_bridge_journal_links WHERE profile_id=profile AND journal_id=p_journal;'/);
  assert.match(postEventJournalIdFix, /v_new_anchor text := '[^']*accounting_expense_bridge_journal_links AS link WHERE link\.profile_id=profile AND link\.journal_id=p_journal;'/);
  assert.match(postEventJournalIdFix, /v_before\.proacl::text IS DISTINCT FROM '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
  assert.match(postEventJournalIdFix, /v_after\.proacl::text IS DISTINCT FROM '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
  assert.match(postEventJournalIdFix, /v_after\.prosrc IS DISTINCT FROM v_expected_source/);
  assert.match(postEventJournalIdFix, /EXECUTE v_updated/);
});

test("W10E2 reconciliation correction aliases the SETOF jsonb inventory column with identity guards", () => {
  assert.match(reconciliationInventoryAliasFix, /^-- W10E2 additive correction:[^\n]+\nBEGIN;\s*-- Serialize cooperating retries[^\n]*\nSELECT pg_catalog\.pg_advisory_xact_lock\(pg_catalog\.hashtextextended\([\s\S]*?'g7:w10e2:get_accounting_expense_bridge_reconciliation_inventory_alias', 0[\s\S]*?\);[\s\S]*COMMIT;\s*$/);
  assert.doesNotMatch(reconciliationInventoryAliasFix, /LOCK TABLE pg_catalog\.pg_proc/);
  assert.match(reconciliationInventoryAliasFix, /pg_catalog\.md5\(v_before\.prosrc\) IS DISTINCT FROM '40f52408bd586b0cebf579c166770641'/);
  assert.match(reconciliationInventoryAliasFix, /v_identity text := 'p_actor uuid, p_as_of date, p_cutoff timestamp with time zone, p_limit integer'/);
  assert.match(reconciliationInventoryAliasFix, /v_arguments text := 'p_actor uuid, p_as_of date, p_cutoff timestamp with time zone, p_limit integer DEFAULT 200'/);
  assert.equal([...reconciliationInventoryAliasFix.matchAll(/pg_catalog\.pg_get_function_arguments\(v_function\) IS DISTINCT FROM v_arguments/g)].length, 2);
  assert.match(reconciliationInventoryAliasFix, /v_old_anchor text := 'SELECT item FROM public\.accounting_expense_bridge_source_inventory\(p_as_of,p_cutoff,p_limit\+1\)'/);
  assert.match(reconciliationInventoryAliasFix, /v_new_anchor text := 'SELECT item FROM public\.accounting_expense_bridge_source_inventory\(p_as_of,p_cutoff,p_limit\+1\) AS source_inventory\(item\)'/);
  assert.match(reconciliationInventoryAliasFix, /v_before\.language_name IS DISTINCT FROM 'plpgsql'/);
  assert.match(reconciliationInventoryAliasFix, /v_before\.proargdefaults_text IS NULL/);
  assert.match(reconciliationInventoryAliasFix, /v_before\.pronargdefaults IS DISTINCT FROM 1/);
  assert.match(reconciliationInventoryAliasFix, /v_before\.proacl::text IS DISTINCT FROM '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
  assert.match(reconciliationInventoryAliasFix, /v_after\.proacl::text IS DISTINCT FROM '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
  assert.match(reconciliationInventoryAliasFix, /v_after\.prosrc IS DISTINCT FROM v_expected_source/);
  assert.match(reconciliationInventoryAliasFix, /exact prosrc equality and[\s\S]*?singleton new-anchor check/);
  assert.match(reconciliationInventoryAliasFix, /replace\(v_definition,v_new_anchor,''\)\)\)\/length\(v_new_anchor\)<>1/);
  assert.doesNotMatch(reconciliationInventoryAliasFix, /position\(v_old_anchor IN v_definition\)>0/);
  assert.match(reconciliationInventoryAliasFix, /W10E2 reconciliation correction changed function properties/);
  assert.match(reconciliationInventoryAliasFix, /W10E2 reconciliation correction source differs from the exact expected replacement/);
  assert.match(reconciliationInventoryAliasFix, /W10E2 reconciliation correction lost the function default expression/);
  assert.match(reconciliationInventoryAliasFix, /W10E2 reconciliation correction changed the function execute ACL/);
  assert.match(reconciliationInventoryAliasFix, /EXECUTE v_updated/);
});

test("W10E2 reconciliation scopes employee balances to employee liabilities and advances", () => {
  assert.match(reconciliationEmployeeScopeFix, /^-- W10E2 additive correction:[^\n]+\nBEGIN;\s*-- Serialize cooperating retries[^\n]*\nSELECT pg_catalog\.pg_advisory_xact_lock\(pg_catalog\.hashtextextended\([\s\S]*?'g7:w10e2:get_accounting_expense_bridge_reconciliation_employee_scope', 0[\s\S]*?\);[\s\S]*COMMIT;\s*$/);
  assert.doesNotMatch(reconciliationEmployeeScopeFix, /LOCK TABLE pg_catalog\.pg_proc/);
  assert.match(reconciliationEmployeeScopeFix, /pg_catalog\.md5\(v_before\.prosrc\) IS DISTINCT FROM '8a1ae70dbcffda77bcde655153c3da09'/);
  assert.match(reconciliationEmployeeScopeFix, /v_old_anchor text := 'WHERE employee_id IS NOT NULL'/);
  assert.match(reconciliationEmployeeScopeFix, /v_new_anchor text := 'WHERE employee_id IS NOT NULL AND party_role IN \(''EMPLOYEE_REIMBURSEMENT_LIABILITY'',''EMPLOYEE_ADVANCE''\)'/);
  assert.match(reconciliationEmployeeScopeFix, /<>2/);
  assert.match(reconciliationEmployeeScopeFix, /v_after\.prosrc IS DISTINCT FROM v_expected_source/);
  assert.match(reconciliationEmployeeScopeFix, /pg_catalog\.pg_get_function_arguments\(v_function\) IS DISTINCT FROM v_arguments/);
  assert.match(reconciliationEmployeeScopeFix, /v_after\.proacl::text IS DISTINCT FROM '\{postgres=X\/postgres,service_role=X\/postgres\}'/);
});

test("W10E2 snapshots lifecycle and transaction facts without current-balance summary authority", () => {
  const snapshot = migration.match(/CREATE FUNCTION public\.accounting_expense_bridge_source_snapshot[\s\S]*?\$snapshot\$;/)?.[0];
  const inventory = migration.match(/CREATE FUNCTION public\.accounting_expense_bridge_source_inventory[\s\S]*?\$inventory\$;/)?.[0];
  assert.ok(snapshot && inventory);
  for (const source of ["EXPENSE", "EXPENSE_REIMBURSEMENT_SETTLEMENT", "CASH_ADVANCE_ISSUE",
    "CASH_ADVANCE_EXPENSE_SETTLEMENT", "CASH_ADVANCE_RETURN", "PETTY_CASH_TRANSACTION",
    "CASH_ADVANCE_GOVERNANCE_EVENT", "PETTY_CASH_FUND_GOVERNANCE_EVENT"]) {
    assert.ok(snapshot.includes("WHEN '" + source + "'"), "snapshot omits " + source);
  }
  for (const field of ["attached_documents", "evidence_exceptions", "accountable_owner_id", "audit_lineage"]) {
    assert.ok(snapshot.includes(field), "snapshot omits " + field);
  }
  assert.match(snapshot, /balance_before_after_excluded_from_historical_truth/);
  assert.match(snapshot, /mutable_balance_summaries_excluded/);
  assert.doesNotMatch(migration, /expense_accountability_summaries|employee_cash_advances\.(remaining_balance|amount_spent_settled|amount_returned)|petty_cash_funds\.current_balance/);
  assert.match(inventory, /expense_approved/);
});

test("W10E2 fails closed for missing provenance and caps effects from posted bridge lineage", () => {
  for (const code of ["ADVANCE_OFFSET_PROVENANCE_REQUIRED", "PETTY_CASH_RETURN_PROVENANCE_REQUIRED",
    "reimbursement_ceiling_exceeded", "cash_advance_effect_missing", "advance_balance_exceeded",
    "expense_settlement_exceeds_expense", "petty_cash_balance_insufficient", "inception_coverage_conflict"]) {
    assert.ok(migration.includes(code), "migration omits " + code);
  }
  assert.match(migration, /direction IS DISTINCT FROM 'FROM_TREASURY'/);
  assert.match(migration, /snapshot->>'payment_method' IN \('petty_cash','cash_advance'\)[\s\S]*?NO_EFFECT/);
  assert.match(migration, /POST_CUTOVER_SOURCE/);
  assert.match(migration, /status IN \('PREPARED','POSTED'\)/);
  assert.match(migration, /economic_effect_conflict/);
});

test("W10E2 reconciliation keeps both cutoffs and source/account dimensions without claiming bank clearance", () => {
  const recon = migration.match(/CREATE FUNCTION public\.get_accounting_expense_bridge_reconciliation[\s\S]*?\$reconcile\$;/)?.[0];
  assert.ok(recon);
  for (const field of ["as_of_date", "recorded_at_cutoff", "held_count", "missing_effect_count",
    "inception_conflict_count", "duplicate_conflict_count", "control_balances", "employee_balances",
    "fund_balances", "service_balances", "timing_differences"]) assert.ok(recon.includes("'" + field + "'"));
  assert.match(recon, /ACCOUNTING_DATE_AFTER_CUTOFF/);
  assert.match(recon, /source_record_key=i\.item->>'source_record_key'[\s\S]*?se\.created_at<=p_cutoff/);
  assert.match(recon, /'bank_reconciled',false/);
  assert.match(recon, /LIMIT p_limit/);
});

test("W10E2 rollback fixture follows W5 evidence and Finance Review gates before approval", () => {
  const makeExpense = fixture.match(/CREATE FUNCTION pg_temp\.w10e2_make_expense[\s\S]*?\$w10e2_make_expense\$;/)?.[0];
  assert.ok(makeExpense);
  assert.ok(makeExpense.includes("document_id::text||'.pdf','w10e2-evidence-'||p_sequence::text||'.pdf',\n      'application/pdf',128,'expense_receipt'"));
  assert.match(fixture, /w10e2-rollback-finance-reviewer[^\n]*'accountant'/);
  assert.match(makeExpense, /object_path[\s\S]*?'business-documents\/'\|\|document_id::text\|\|'\.pdf'/);
  assert.match(makeExpense, /INSERT INTO public\.business_documents[\s\S]*?public\.attach_expense_document[\s\S]*?public\.review_expense_finance[\s\S]*?public\.approve_expense/);
  assert.match(makeExpense, /public\.record_expense_evidence_exception[\s\S]*?public\.dispose_expense_evidence_exception[\s\S]*?public\.review_expense_finance/);
  assert.match(makeExpense, /public\.review_expense_finance\(expense_id,[\s\S]*?c\.finance_reviewer_id::text,'accountant'[\s\S]*?public\.approve_expense\(expense_id,[\s\S]*?c\.admin_id::text,'admin'/);
  assert.match(fixture, /w10e2_make_expense\(3,75,'employee_paid','personal_funds',NULL,NULL,true\)/);
  assert.match(fixture, /e7:=pg_temp\.w10e2_make_expense\(7,50,'company_direct','cash_advance',advance1,NULL\)/);
  assert.match(fixture, /e8:=pg_temp\.w10e2_make_expense\(8,15,'company_direct','cash_advance',advance1,NULL\)/);
  assert.match(fixture, /record_cutoff:=\(public\.accounting_expense_bridge_source_snapshot\('EXPENSE',e15\)->>'source_recorded_at'\)::timestamptz/);
  assert.match(fixture, /recorded-at cutoff \(error=%; saved=%/);
  assert.match(fixture, /'W10E2 synthetic record cutoff classification',pg_temp\.w10e2_req\(900032\)/);
  assert.match(fixture, /W10E2 case 34 failed: employee reconciliation/);
});

test("W10E2 typed actions, queries, schemas, and generated database RPCs are bounded", () => {
  assert.match(types, /"accounting:manage_expense_bridge"/);
  assert.match(types, /"EXPENSE_BRIDGE"/);
  assert.match(types, /AccountingExpenseBridgeReconciliation/);
  assert.match(schemas, /saveAccountingExpenseBridgeEventInputSchema/);
  assert.match(schemas, /accountingExpenseBridgeReconciliationSchema/);
  assert.match(actions, /requireAccountingCapabilities\(actor\.id, \["accounting:manage_expense_bridge"\]\)/);
  assert.match(queries, /resolveAccountingCapability\(actor\.id, "accounting:manage_expense_bridge"\)/);
  for (const rpc of ["save_accounting_expense_bridge_event", "prepare_accounting_expense_bridge_event",
    "post_accounting_expense_bridge_journal", "get_accounting_expense_bridge_reconciliation"]) assert.ok(databaseTypes.includes(rpc));
});

test("W10E2 rollback campaign asserts 40 named cases, rollback, and zero residue", () => {
  assert.match(fixture, /^-- W10E2 synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  assert.match(fixture, /ROLLBACK;[\s\S]*DO \$residue_assertion\$/);
  assert.match(fixture, /SELECT \('00000000-0000-4000-8000-'\|\|lpad\(to_hex\(p_tag\),12,'0'\)\)::uuid/);
  for (let n = 1; n <= 40; n++) assert.ok(fixture.includes("(" + n + ","), "missing case " + n);
  for (const name of ["unsupported Expense classification held", "accepted evidence exception remains accounting-held",
    "partial employee reimbursement", "advance offset requires structured provenance", "Cash Advance return",
    "linked Petty Cash Expense has one effect", "generic Petty Cash return provenance held",
    "ordinary manual protected-account bypass rejection", "W10C inception replay protection",
    "employee reconciliation", "advance reconciliation", "Petty Cash fund reconciliation",
    "Service reconciliation", "balanced GL and trial balance", "explicit rollback", "zero synthetic residue"]) {
    assert.ok(fixture.toLowerCase().includes(name.toLowerCase()), "missing scenario " + name);
  }
  assert.match(fixture, /mutable W5 summary/i);
  assert.match(fixture, /SELECT count\(\*\) INTO v_case_count FROM pg_temp\.w10e2_case_results/);
  assert.match(fixture, /<>40/);
});
