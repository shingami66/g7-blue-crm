import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260923100000_w8b_event_cost_close.sql"),
  "utf8",
);
const runtimeRepairMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260923104803_w8b_event_cost_close_runtime_repair.sql"),
  "utf8",
);
const runtimeRegression = readFileSync(
  join(process.cwd(), "supabase/verification/w8b_event_cost_close_rollback_regression.sql"),
  "utf8",
);
const closeDeleteGuardMigrationNames = readdirSync(join(process.cwd(), "supabase/migrations")).filter((name) =>
  /^\d{14}_w8b_event_cost_close_delete_guard\.sql$/.test(name),
);
if (closeDeleteGuardMigrationNames.length !== 1) {
  throw new Error(`Expected exactly one W8B forward DELETE-guard migration; found ${closeDeleteGuardMigrationNames.length}`);
}
const closeDeleteGuardMigrationName = closeDeleteGuardMigrationNames[0];
if (!closeDeleteGuardMigrationName) throw new Error("W8B forward DELETE-guard migration name was unavailable");
const closeDeleteGuardMigration = readFileSync(
  join(process.cwd(), "supabase/migrations", closeDeleteGuardMigrationName),
  "utf8",
);

test("W8B preserves a versioned managerial Event Cost Close instead of reusing W3 close state", () => {
  assert.match(migration, /CREATE TABLE public\.event_cost_close_versions/);
  assert.match(migration, /CREATE TABLE public\.event_cost_close_reopenings/);
  assert.match(migration, /UNIQUE\(service_id, close_version\)/);
  assert.match(migration, /event_cost_close_history_immutable/);
  assert.match(migration, /FROM public\.service_lifecycle_states/);
  assert.match(migration, /operational_service_not_closed/);
  assert.match(migration, /get_event_costing\(p_service_id, p_as_of_date\)/);
  assert.doesNotMatch(migration, /UPDATE public\.service_lifecycle_states/);
});

test("W8B runtime repair qualifies the close-version output column in its aggregate", () => {
  assert.match(runtimeRepairMigration, /MAX\(c\.close_version\)/);
  assert.match(runtimeRepairMigration, /FROM public\.event_cost_close_versions AS c WHERE c\.service_id = p_service_id/);
  assert.doesNotMatch(runtimeRepairMigration, /SELECT COALESCE\(MAX\(close_version\)/);
});

test("W8B close snapshots use W8A authority and keep approved AP settlement separate", () => {
  assert.match(migration, /final_managerial_event_margin = net_approved_commercial_value - actual_cost/);
  assert.match(migration, /CONSTRAINT event_cost_close_versions_etc_check CHECK \(etc = 0\)/);
  assert.match(migration, /CONSTRAINT event_cost_close_versions_eac_check CHECK \(eac = actual_cost\)/);
  assert.match(migration, /approved_cost_outstanding_settlement/);
  assert.match(migration, /Settlement-only supplier payments\/reversals and reimbursement rows are/);
  assert.doesNotMatch(migration, /revenue recognition|General Ledger|VAT\/FATOORA\/ZATCA/i);
});

test("W8B readiness has server-side blockers for lifecycle, cost authority, and unresolved direct-cost sources", () => {
  for (const blocker of [
    "operational_execution_not_ended", "operational_completion_not_confirmed", "operational_service_not_closed",
    "event_costing_incomplete", "pending_supplier_bills", "pending_event_expenses", "pending_commitment_amount",
    "open_commitment_amount", "etc_not_zero", "pending_service_receipts", "unresolved_event_cash_advances",
    "unresolved_supplier_advance_reserve",
  ]) assert.match(migration, new RegExp(blocker));
  assert.match(migration, /LANGUAGE plpgsql SECURITY DEFINER SET search_path = pg_catalog, public/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_event_cost_close_readiness[\s\S]*TO service_role/);
});

test("W8B post-close database guards cover cost-authority mutations without blocking settlement tables", () => {
  for (const table of [
    "event_cost_budgets", "event_cost_etc_forecasts", "approved_commitments", "approved_commitment_amendments",
    "service_receipts", "service_receipt_corrections", "supplier_bills", "expenses", "employee_cash_advances",
    "supplier_advance_authorization_releases",
  ]) assert.match(migration, new RegExp(`a_event_cost_close_[a-z_]+\\n\\s+BEFORE [^;]+ ON public\\.${table}`));
  assert.doesNotMatch(migration, /event_cost_close_supplier_payment_guard/);
  assert.doesNotMatch(migration, /event_cost_close_expense_reimbursement_guard/);
});

test("W8B forward repair guards DELETE using OLD rows without guarding AP settlement", () => {
  assert.match(closeDeleteGuardMigration, /CREATE OR REPLACE FUNCTION public\.guard_event_cost_authority_mutation\(\)/);
  assert.match(closeDeleteGuardMigration, /TG_OP = 'DELETE'/);
  assert.match(closeDeleteGuardMigration, /TG_OP IN \('UPDATE', 'DELETE'\)/);
  assert.match(closeDeleteGuardMigration, /to_jsonb\(OLD\)/);
  assert.match(closeDeleteGuardMigration, /to_jsonb\(NEW\)/);
  assert.match(closeDeleteGuardMigration, /TG_TABLE_NAME = 'expense_evidence_exceptions'/);
  assert.match(closeDeleteGuardMigration, /expense_id/);
  assert.match(closeDeleteGuardMigration, /RETURN OLD/);
  for (const table of [
    "event_cost_budgets", "event_cost_etc_forecasts", "approved_commitments", "approved_commitment_amendments",
    "service_receipts", "service_receipt_corrections", "supplier_bills", "expenses", "employee_cash_advances",
    "expense_evidence_exceptions", "supplier_advances", "supplier_advance_authorization_releases",
  ]) {
    assert.match(closeDeleteGuardMigration, new RegExp(`BEFORE [^;]*DELETE[^;]* ON public\\.${table}`));
  }
  assert.doesNotMatch(closeDeleteGuardMigration, /CREATE TRIGGER [^;]+ ON public\.supplier_payments/);
  assert.doesNotMatch(closeDeleteGuardMigration, /CREATE TRIGGER [^;]+ ON public\.supplier_payment_reversals/);
});

test("connected W6C release is append-only, unused-only, serialized, and never invents cash", () => {
  assert.match(migration, /CREATE TABLE public\.supplier_advance_authorization_releases/);
  assert.match(migration, /supplier_advance_authorization_releases_immutable/);
  assert.match(migration, /supplier_advance_release_not_unused/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /guard_released_supplier_advance_event/);
  assert.match(migration, /WHERE ar\.id IS NULL/);
  assert.doesNotMatch(migration, /INSERT INTO public\.supplier_advance_payments[\s\S]*release_supplier_advance_authorization/);
  assert.doesNotMatch(migration, /INSERT INTO public\.supplier_advance_refunds[\s\S]*release_supplier_advance_authorization/);
});

test("W8B has rollback-only DEV behavioral coverage for readiness, close/reopen, and W6C release", () => {
  assert.match(runtimeRegression, /BEGIN;[\s\S]*DO \$w8b\$/);
  assert.match(runtimeRegression, /\$w8b\$;\s*ROLLBACK;/);
  assert.match(runtimeRegression, /get_event_cost_close_readiness\(/);
  assert.match(runtimeRegression, /close_event_cost\(/);
  assert.match(runtimeRegression, /reopen_event_cost\(/);
  assert.match(runtimeRegression, /release_supplier_advance_authorization\(/);
  assert.match(runtimeRegression, /supplier_advance_authorization_released/);
  assert.match(runtimeRegression, /supplier_advance_release_not_unused/);
  assert.match(runtimeRegression, /event_cost_closed_reopen_required/);
  assert.match(runtimeRegression, /public\.supplier_payments/);
  assert.match(runtimeRegression, /has_function_privilege\(/);
  assert.match(runtimeRegression, /RAISE NOTICE 'W8B_ROLLBACK_REGRESSION_PASS/);
  assert.doesNotMatch(runtimeRegression, /SELECT 'W8B_ROLLBACK_REGRESSION_PASS'/);
  assert.match(runtimeRegression, /DELETE FROM public\.event_cost_budgets/);
  assert.match(runtimeRegression, /DELETE FROM public\.supplier_bills/);
  assert.match(runtimeRegression, /DELETE FROM public\.expenses/);
  assert.match(runtimeRegression, /DELETE FROM public\.service_receipt_corrections/);
  assert.match(runtimeRegression, /DELETE FROM public\.supplier_advances/);
  assert.match(runtimeRegression, /DELETE FROM public\.supplier_advance_authorization_releases/);
  assert.match(runtimeRegression, /DELETE FROM public\.employee_cash_advances/);
  assert.match(runtimeRegression, /DELETE FROM public\.expense_evidence_exceptions/);
  assert.match(runtimeRegression, /unresolved_cost_evidence_exception/);
  assert.match(runtimeRegression, /UPDATE public\.approved_commitments[\s\S]*SET service_id = v_release_service/);
  assert.match(runtimeRegression, /SET service_id = v_close_service[\s\S]*WHERE id = v_transfer_commitment_id/);
  assert.match(runtimeRegression, /company_funds', v_viewer, 'approved', v_admin/);
  assert.match(runtimeRegression, /add_approved_commitment_amendment\(/);
  assert.match(runtimeRegression, /create_service_receipt\(/);
  assert.match(runtimeRegression, /reverse_supplier_payment\(/);
  assert.match(runtimeRegression, /get_event_costing\(v_existing_service, DATE '2026-09-21'\)/);
  assert.match(runtimeRegression, /get_event_costing\(v_existing_service, DATE '2026-09-22'\)/);
  assert.match(runtimeRegression, /2026-09-22 20:59:59\+00/);
  assert.match(runtimeRegression, /2026-09-22 21:00:00\+00/);
  assert.match(runtimeRegression, /v_viewer::text, 'viewer'/);
});
