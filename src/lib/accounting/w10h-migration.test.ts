import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260930141934_w10h_accounting_statement_reporting.sql", import.meta.url),
  "utf8",
);
const currentResultSignRepair = readFileSync(
  new URL("../../../supabase/migrations/20261001045524_w10h_balance_sheet_current_result_sign.sql", import.meta.url),
  "utf8",
);
const fixture = readFileSync(
  new URL("../../../supabase/verification/w10h_accounting_reporting_rollback_regression.sql", import.meta.url),
  "utf8",
);
const reportPage = readFileSync(new URL("../../app/(dashboard)/reports/[report]/page.tsx", import.meta.url), "utf8");
const reportExport = readFileSync(new URL("../../app/api/reports/accounting/[report]/export/route.ts", import.meta.url), "utf8");
const queries = readFileSync(new URL("./queries.ts", import.meta.url), "utf8");

test("W10H mapping authority is append-only, effective and recorded, and pinned to account versions", () => {
  assert.match(migration, /CREATE TABLE public\.accounting_statement_mapping_sets/);
  assert.match(migration, /CREATE TABLE public\.accounting_statement_mapping_versions/);
  assert.match(migration, /CREATE TABLE public\.accounting_statement_mapping_entries/);
  assert.match(migration, /FOREIGN KEY\(profile_id,account_id,account_version\)/);
  assert.match(migration, /mv\.effective_from<v_mapping_cutoff AND mv\.created_at<=v_cutoff/);
  assert.match(migration, /min\(e\.label_en\) IS DISTINCT FROM max\(e\.label_en\)/);
  assert.match(migration, /ACCOUNTING_STATEMENT_TYPE_ACCOUNT_MISMATCH/);
  assert.match(migration, /ACCOUNTING_STATEMENT_SECTION_ACCOUNT_MISMATCH/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_statement_mapping_versions/);
  assert.match(migration, /BEFORE UPDATE OR DELETE ON public\.accounting_statement_mapping_entries/);
  assert.match(migration, /public\.get_accounting_capability\(p_actor_user_id,'accounting:manage_chart'\)/);
  assert.doesNotMatch(migration, /INSERT INTO public\.accounting_(?:accounts|account_versions|journals|journal_versions|journal_line_versions)\b/i);
});

test("W10H reports are capability-gated, posted-only, snapshot-based, exact, and private", () => {
  assert.match(migration, /accounting:view_statements/);
  assert.match(migration, /UPDATE public\.accounting_capability_catalog[\s\S]*SET enabled=true,runtime_allow_grantable=true/);
  assert.match(migration, /SECURITY DEFINER SET search_path=pg_catalog,public/);
  assert.match(migration, /get_accounting_capability\(p_actor_user_id,v_capability\)/);
  assert.match(migration, /v\.status='POSTED'[\s\S]*?v\.posted_at<=v_cutoff/);
  assert.match(migration, /amount_halalah::text/);
  assert.match(migration, /fiscal_start_month/);
  assert.match(migration, /PRIOR_RESULT_NOT_CLOSED/);
  assert.match(migration, /STATEMENT_MAPPING_MISSING_FOR_ACCOUNT_VERSION/);
  assert.match(migration, /FORCE ROW LEVEL SECURITY/);
  assert.match(migration, /FROM PUBLIC,anon,authenticated,service_role/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.get_w10h_accounting_report[\s\S]*TO service_role/);
  assert.doesNotMatch(migration, /GRANT (?:SELECT|INSERT|UPDATE|DELETE|ALL) ON TABLE public\.accounting_statement_mapping_/i);
  assert.doesNotMatch(migration, /Number\s*\(/);
  assert.match(queries, /const actor = await requireUser\(\)/);
  assert.match(reportPage, /Provisional internal accounting output\. Not a statutory financial statement\./);
  assert.match(reportPage, /<div dir=\{locale === "ar" \? "rtl" : "ltr"\}/);
  assert.match(reportExport, /formatHalalahForExcel/);
  assert.match(reportExport, /format: "text"/);
  assert.doesNotMatch(reportExport, /Number\s*\(/);
});

test("W10H current-year earnings subtract debit Expense balances through an additive guarded repair", () => {
  assert.match(currentResultSignRepair, /pg_get_functiondef\(v_signature\)/);
  assert.match(currentResultSignRepair, /expected exactly one uncorrected Expense sign expression/);
  assert.match(currentResultSignRepair, /THEN l\.amount_halalah::numeric ELSE -l\.amount_halalah::numeric END END\),0\) result/);
  assert.match(currentResultSignRepair, /THEN -l\.amount_halalah::numeric ELSE l\.amount_halalah::numeric END END\),0\) result/);
  assert.match(currentResultSignRepair, /EXECUTE replace\(v_definition,v_old_expression,v_new_expression\)/);
  assert.match(currentResultSignRepair, /current-result sign correction was not installed exactly once/);
});

test("W10H rollback fixture names required scenarios and terminates with zero-residue assertions", () => {
  assert.match(fixture, /^-- W10H synthetic DEV regression only\.[\s\S]*?\nBEGIN;/);
  assert.match(fixture, /ROLLBACK;/);
  assert.match(fixture, /public\.save_accounting_revenue_arrangement/);
  assert.match(fixture, /public\.review_accounting_revenue_arrangement/);
  assert.match(fixture, /public\.save_accounting_revenue_performance_evidence/);
  assert.match(fixture, /public\.review_accounting_revenue_performance_evidence/);
  assert.match(fixture, /public\.prepare_accounting_revenue_recognition/);
  assert.match(fixture, /public\.post_accounting_revenue_recognition_journal/);
  assert.match(fixture, /W10H large Expense prepare failed/);
  const cases = [
    "accounting:view reads GL/TB", "accounting:view_statements reads P&L/Balance Sheet",
    "Admin wildcard denied", "inactive actor denied", "GL opening/activity/closing",
    "TB opening/activity/ending", "TB debit equals credit", "P&L Revenue minus Expense",
    "governed W10F Revenue recognition",
    "Balance Sheet equation", "current-year earnings exactly once", "no retained-earnings journal",
    "prior-year result unresolved", "unmapped account/version", "later mapping does not rewrite earlier report",
    "account rename does not rewrite historical report", "original journal before reversal cutoff",
    "reversal appears at later cutoff", "Service filter", "unassigned shared overhead", "managerial values excluded",
    "unavailable evidence is not zero", "journal lineage", "protected source content hidden", "exact large halalah",
    "XLSX precision", "EN report definitions", "AR report definitions", "RTL report shell",
    "statement capability enabled without persistent grant", "rollback zero residue", "NOT_INITIALIZED",
  ];
  for (const name of cases) assert.ok(fixture.includes(`W10H CASE: ${name}`), `missing ${name}`);
});
