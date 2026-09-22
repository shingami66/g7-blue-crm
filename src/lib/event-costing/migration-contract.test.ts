import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260922180000_w8a_event_costing_foundation.sql"),
  "utf8",
);
const correctiveMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260922200000_w8a_event_costing_rpc_ambiguity_repair.sql"),
  "utf8",
);
const historicalSemanticsMigration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260922210000_w8a_historical_costing_semantics_repair.sql"),
  "utf8",
);
const historicalCostingFunction = historicalSemanticsMigration.slice(
  historicalSemanticsMigration.indexOf("CREATE OR REPLACE FUNCTION public.get_event_costing"),
);

test("W8A migration owns immutable budget and ETC versioned persistence", () => {
  assert.match(migration, /CREATE TABLE public\.event_cost_budgets/);
  assert.match(migration, /approved_budget_cost numeric\(14,2\) GENERATED ALWAYS AS \(base_budget_amount \+ contingency_amount\)/);
  assert.match(migration, /CREATE TABLE public\.event_cost_etc_forecasts/);
  assert.match(migration, /CREATE UNIQUE INDEX event_cost_budgets_active_service_key/);
  assert.match(migration, /CREATE UNIQUE INDEX event_cost_etc_active_service_key/);
  assert.match(migration, /event_cost_version_immutable/);
});

test("W8A migration uses permission-gated service-role RPC boundaries", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.get_event_costing\(/);
  assert.match(migration, /SET search_path = pg_catalog, public/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.get_event_costing/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_event_costing[\s\S]*TO service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.approve_event_cost_budget[\s\S]*TO service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.record_event_cost_etc[\s\S]*TO service_role/);
});

test("W8A corrective migration qualifies version columns in write RPCs", () => {
  assert.match(correctiveMigration, /MAX\(b\.budget_version\)/);
  assert.match(correctiveMigration, /MAX\(f\.forecast_version\)/);
  assert.match(correctiveMigration, /CREATE OR REPLACE FUNCTION public\.approve_event_cost_budget/);
  assert.match(correctiveMigration, /CREATE OR REPLACE FUNCTION public\.record_event_cost_etc/);
});

test("W8A source contract excludes bookings, receipts, rate cards, and legacy estimated budget from authoritative cost", () => {
  assert.match(migration, /FROM public\.approved_commitment_balances/);
  assert.match(migration, /FROM public\.supplier_bills b/);
  assert.match(migration, /FROM public\.expenses e/);
  assert.doesNotMatch(migration, /services\.estimated_budget/);
  assert.doesNotMatch(migration, /supplier_allocations/);
  assert.match(migration, /LIMIT 50/);
});

test("W8A read model preserves separate paid and outstanding cost and null forecast margin", () => {
  assert.match(migration, /'paid_cost', t\.paid_cost/);
  assert.match(migration, /'outstanding_cost', greatest\(t\.actual_cost - t\.paid_cost, 0\)/);
  assert.match(migration, /'forecast_margin', CASE WHEN t\.etc_amount IS NULL OR t\.commercial_amount IS NULL THEN NULL/);
  assert.match(migration, /supplier_payment_reversals/);
  assert.match(migration, /supplier_advance_allocation_reversals/);
});

test("W8A historical repair treats approved company-funded direct expense as already paid", () => {
  assert.match(historicalCostingFunction, /expense_status\.status = 'approved'[\s\S]*e\.origin_type = 'company_direct'[\s\S]*e\.payment_method = 'company_funds'[\s\S]*THEN e\.amount/);
  assert.match(historicalCostingFunction, /'outstanding_cost', greatest\(t\.actual_cost - t\.paid_cost, 0\)/);
});

test("W8A reconstructs commitment authority and balances from approved source events", () => {
  assert.match(historicalCostingFunction, /FROM public\.approved_commitments c/);
  assert.match(historicalCostingFunction, /FROM public\.approved_commitment_amendments am[\s\S]*am\.approved_at[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /LEFT JOIN receipt_totals r ON r\.commitment_id = c\.id/);
  assert.doesNotMatch(historicalCostingFunction, /approved_commitment_balances/);
});

test("W8A receipt history preserves submission, acceptance, and correction cutoffs", () => {
  assert.match(historicalCostingFunction, /FROM public\.service_receipts r[\s\S]*JOIN public\.approved_commitments commitment[\s\S]*commitment\.service_id = p_service_id[\s\S]*WHERE r\.service_id = p_service_id/);
  assert.match(historicalCostingFunction, /r\.performance_date <= p_as_of_date/);
  assert.match(historicalCostingFunction, /r\.submitted_at[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /service_receipt_corrections c[\s\S]*corrected_at[\s\S]*> p_as_of_date/);
  assert.match(historicalCostingFunction, /future_correction\.prior_acceptance_status/);
  assert.match(historicalCostingFunction, /past_correction\.corrected_acceptance_status/);
  assert.match(historicalCostingFunction, /future_correction\.prior_decision_at/);
});

test("W8A commitment cancellation and closure take effect only at their Riyadh event date", () => {
  assert.match(historicalCostingFunction, /c\.cancelled_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /c\.closed_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /c\.approved_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*p_as_of_date/);
});

test("W8A commercial authority is selected by effective ABS lineage and preserves legacy fallback", () => {
  assert.match(historicalCostingFunction, /s\.approved_at[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /s\.superseded_at[\s\S]*> p_as_of_date/);
  assert.match(historicalCostingFunction, /s\.voided_at[\s\S]*> p_as_of_date/);
  assert.match(historicalCostingFunction, /h\.has_history = false/);
  assert.match(historicalCostingFunction, /quotation_approved/);
});

test("W8A supplier bills are included only when recorded and dated by the as-of boundary", () => {
  assert.match(historicalCostingFunction, /b\.invoice_date <= p_as_of_date/);
  assert.match(historicalCostingFunction, /b\.recorded_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /b\.approved_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*THEN 'approved'[\s\S]*ELSE 'pending'/);
});

test("W8A event-expense pending and approval states are reconstructed at the cutoff", () => {
  assert.match(historicalCostingFunction, /e\.submitted_at IS NOT NULL/);
  assert.match(historicalCostingFunction, /e\.expense_date <= p_as_of_date/);
  assert.match(historicalCostingFunction, /e\.approved_at, 2, 'approved'/);
  assert.match(historicalCostingFunction, /e\.rejected_at, 3, 'rejected'/);
  assert.match(historicalCostingFunction, /e\.cancelled_at, 4, 'cancelled'/);
});

test("W8A supplier payment reversals affect totals and drill flags only after their effective date", () => {
  assert.match(historicalCostingFunction, /supplier_payment_reversals r[\s\S]*r\.reversed_at[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /FILTER \(WHERE NOT p\.reversed\)/);
  assert.match(historicalCostingFunction, /'reversed', p\.reversed/);
  assert.match(historicalCostingFunction, /p\.payment_date <= p_as_of_date[\s\S]*p\.recorded_at/);
});

test("W8A advance allocation reversals are historical in both paid totals and drill rows", () => {
  assert.match(historicalCostingFunction, /supplier_advance_allocation_reversals r[\s\S]*r\.corrected_at[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /FILTER \(WHERE NOT a\.reversed\)/);
  assert.match(historicalCostingFunction, /a\.allocated_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /'reversed', a\.reversed/);
});

test("W8A settlement timestamps use Riyadh dates and customer refunds remain outside costing", () => {
  assert.match(historicalCostingFunction, /ers\.settled_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /caes\.settled_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*p_as_of_date/);
  assert.match(historicalCostingFunction, /pct\.recorded_at[\s\S]*timezone\('Asia\/Riyadh'[\s\S]*p_as_of_date/);
  assert.doesNotMatch(historicalCostingFunction, /customer_refunds|refunds/);
});

test("W8A historical drill remains service-scoped and deterministically bounded", () => {
  assert.match(historicalCostingFunction, /WHERE service_id = p_service_id[\s\S]*ORDER BY budget_version DESC LIMIT 50/);
  assert.match(historicalCostingFunction, /WHERE service_id = p_service_id[\s\S]*forecast_date <= p_as_of_date[\s\S]*LIMIT 50/);
  assert.match(historicalCostingFunction, /ORDER BY payment_date DESC, payment_number DESC, id ASC LIMIT 50/);
  assert.match(historicalCostingFunction, /ORDER BY allocated_at DESC, allocation_number DESC, id ASC LIMIT 50/);
  assert.match(historicalCostingFunction, /CREATE OR REPLACE FUNCTION public\.get_event_costing[\s\S]*SECURITY DEFINER[\s\S]*SET search_path = pg_catalog, public/);
});
