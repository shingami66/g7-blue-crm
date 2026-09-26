import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

test("W9A1 reporting projection delegates to W6/W8 authorities and remains outside accounting", () => {
  const sql = read("supabase/migrations/20260924065440_w9a_reporting_projections.sql");
  assert.match(sql, /supplier_bill_payment_balances/);
  assert.match(sql, /get_event_costing\(s\.service_id, p\.as_of_date\)/);
  assert.match(sql, /event_cost_close_versions/);
  assert.match(sql, /event_cost_close_reopenings/);
  assert.match(sql, /SECURITY DEFINER/);
  assert.match(sql, /SET search_path = pg_catalog, public/);
  assert.match(sql, /service_role/);
  assert.doesNotMatch(sql, /supplier_bookings|service_supplier_allocations|revenue_recognition|general_ledger|VAT|ZATCA/i);
});

test("W9A1 SQL exposes bounded filters and deterministic row ordering", () => {
  const sql = read("supabase/migrations/20260924065440_w9a_reporting_projections.sql");
  for (const token of ["p_page_size", "p_page_offset", "p_due_from", "p_due_to", "p_completeness", "p_close_state", "ORDER BY f.invoice_date DESC, f.bill_number ASC, f.supplier_bill_id ASC", "ORDER BY f.service_number ASC, f.service_id ASC"]) {
    assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(sql, /reopened_at >= \(\(p\.as_of_date \+ 1\)::timestamp AT TIME ZONE 'Asia\/Riyadh'\)/);
  assert.match(sql, /page_scope AS MATERIALIZED \(/);
  assert.match(sql, /completeness_scan_limit/);
  assert.match(sql, /report_state/);
  assert.match(sql, /detail_total_count', CASE/);
});

test("W9A1 AR and AP summaries aggregate the filtered result separately from the detail page", () => {
  const ar = read("supabase/migrations/20260922170000_w7d_accounts_receivable_reporting_runtime_repair.sql");
  const ap = read("supabase/migrations/20260924065440_w9a_reporting_projections.sql");
  const apFiltered = ap.match(/filtered AS \(([\s\S]*?)\), page AS \(/)?.[1];
  const apProjection = ap.slice(ap.indexOf("SELECT jsonb_build_object("));
  const arDetailPage = ar.match(/detail_page AS \(([\s\S]*?)\), customer_totals AS \(/)?.[1];

  assert.ok(apFiltered);
  assert.ok(arDetailPage);
  for (const filter of [
    /p\.status IS NULL OR b\.payment_status = p\.status/,
    /p\.supplier_search IS NULL OR sb\.supplier_name_snapshot/,
    /p\.service_search IS NULL/,
    /p\.supplier_id IS NULL OR b\.supplier_id = p\.supplier_id/,
    /p\.service_id IS NULL OR b\.service_id = p\.service_id/,
    /p\.due_from IS NULL OR sb\.due_date >= p\.due_from/,
    /p\.due_to IS NULL OR sb\.due_date <= p\.due_to/,
  ]) assert.match(apFiltered, filter);
  for (const metric of ["payable_amount", "paid_amount", "outstanding_amount", "open_bill_count", "detail_total_count"]) {
    assert.match(apProjection, new RegExp(`'${metric}'[\\s\\S]*?FROM filtered f`));
  }
  assert.match(apProjection, /jsonb_agg\(to_jsonb\(page\)[\s\S]*?FROM page/);
  assert.match(arDetailPage, /FROM classified d[\s\S]*?LIMIT p_page_size OFFSET p_page_offset/);
  assert.match(ar, /COUNT\(d\.id\)::bigint,[\s\S]*?LEFT JOIN classified d ON true/);
  assert.match(ar, /SUM\(d\.outstanding_amount\) FILTER \(WHERE d\.ageing_bucket = '91_plus'\)/);
});

test("W9A1 Event summary migration returns bounded whole-result counts without unbounded costing", () => {
  const sql = read("supabase/migrations/20260926055100_w9a1_event_whole_result_summary_and_export_cap.sql");
  const costScope = sql.match(/cost_scope AS MATERIALIZED \(([\s\S]*?)\), costed AS \(/)?.[1];

  assert.ok(costScope);
  assert.match(sql, /CREATE OR REPLACE FUNCTION public\.get_event_economics_report\(\s*p_as_of_date date,\s*p_search text DEFAULT NULL,\s*p_completeness text DEFAULT NULL,\s*p_close_state text DEFAULT NULL,\s*p_page_size integer DEFAULT 20,\s*p_page_offset integer DEFAULT 0\s*\)/);
  assert.match(sql, /RETURNS jsonb\s+LANGUAGE sql\s+STABLE\s+SECURITY DEFINER\s+SET search_path = pg_catalog, public/);
  assert.match(sql, /summary_scope AS MATERIALIZED \([\s\S]*?LIMIT \(\(SELECT completeness_scan_limit FROM params\) \+ 1\)/);
  assert.match(sql, /completeness_scope AS MATERIALIZED \([\s\S]*?LIMIT \(\(SELECT completeness_scan_limit FROM params\) \+ 1\)/);
  assert.match(costScope, /summary_scope[\s\S]*?candidate_count <= \(SELECT completeness_scan_limit FROM params\)/);
  assert.match(costScope, /page_scope[\s\S]*?candidate_count > \(SELECT completeness_scan_limit FROM params\)/);
  assert.match(costScope, /completeness_scope[\s\S]*?candidate_count <= \(SELECT completeness_scan_limit FROM params\)/);
  assert.doesNotMatch(costScope, /get_event_costing/);
  assert.match(sql, /public\.get_event_costing\(s\.service_id, p\.as_of_date\)/);
  assert.match(sql, /count\(\*\) FILTER \(WHERE s\.close_state = 'open'\)/);
  assert.match(sql, /count\(\*\) FILTER \(WHERE s\.close_state = 'closed'\)/);
  for (const key of ["detail_total_count", "open_count", "closed_count", "completeness_summary_state", "complete_count", "partial_count", "unavailable_count"]) {
    assert.match(sql, new RegExp(`'${key}'`));
  }
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.get_event_economics_report\(date,text,text,text,integer,integer\) FROM PUBLIC, anon, authenticated/);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.get_event_economics_report\(date,text,text,text,integer,integer\) TO service_role/);
});

test("W9A1 Event final pagination keeps OFFSET expressions independent of query-level aliases", () => {
  const sql = read("supabase/migrations/20260926055100_w9a1_event_whole_result_summary_and_export_cap.sql");
  const pageScope = sql.match(/page_scope AS MATERIALIZED \(([\s\S]*?)\), summary_scope AS MATERIALIZED \(/)?.[1];
  const page = sql.match(/\bpage AS \(([\s\S]*?)\n\)\s*SELECT jsonb_build_object\(/)?.[1];

  assert.ok(pageScope);
  assert.ok(page);

  const pageLimit = page.match(/\bLIMIT\b([\s\S]*?)\bOFFSET\b/i)?.[1]?.trim();
  const pageOffset = page.match(/\bOFFSET\b([\s\S]*)$/i)?.[1]?.trim();
  const normalizedOffset = pageOffset?.replace(/\s+/g, " ");

  assert.match(pageScope, /LIMIT \(SELECT page_size FROM params\)\s+OFFSET \(SELECT page_offset FROM params\)/);
  assert.match(page, /LIMIT \(SELECT page_size FROM params\)/);
  assert.doesNotMatch(page, /\bCROSS JOIN\b/i);
  assert.match(pageLimit ?? "", /^\(SELECT page_size FROM params\)$/i);
  assert.doesNotMatch(pageLimit ?? "", /\b(?:p|scope_count)\s*\./i);
  assert.match(normalizedOffset ?? "", /^\(\s*CASE\b[\s\S]*\bEND\s*\)$/i);
  assert.match(normalizedOffset ?? "", /\(SELECT completeness FROM params\) IS NOT NULL/i);
  assert.match(normalizedOffset ?? "", /\(SELECT candidate_count FROM summary_scope_count\)\s*<=\s*\(SELECT completeness_scan_limit FROM params\)/i);
  assert.match(normalizedOffset ?? "", /THEN \(SELECT page_offset FROM params\)\s+ELSE 0/i);
  assert.doesNotMatch(pageOffset ?? "", /\b(?:p|scope_count)\s*\./i);
});
