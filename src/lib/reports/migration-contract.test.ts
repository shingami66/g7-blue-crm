import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

test("W9A1 reporting projection delegates to W6/W8 authorities and remains outside accounting", () => {
  const sql = read("supabase/migrations/20260924090000_w9a_reporting_projections.sql");
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
  const sql = read("supabase/migrations/20260924090000_w9a_reporting_projections.sql");
  for (const token of ["p_page_size", "p_page_offset", "p_due_from", "p_due_to", "p_completeness", "p_close_state", "ORDER BY f.invoice_date DESC, f.bill_number ASC, f.supplier_bill_id ASC", "ORDER BY f.service_number ASC, f.service_id ASC"]) {
    assert.match(sql, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
  assert.match(sql, /reopened_at >= \(\(p\.as_of_date \+ 1\)::timestamp AT TIME ZONE 'Asia\/Riyadh'\)/);
  assert.match(sql, /page_scope AS MATERIALIZED \(/);
  assert.match(sql, /completeness_scan_limit/);
  assert.match(sql, /report_state/);
  assert.match(sql, /detail_total_count', CASE/);
});
