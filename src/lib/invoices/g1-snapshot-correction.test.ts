import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const CORRECTION_MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260807133000_g1_invoice_snapshot_insert_correction.sql",
);

function readCorrection() {
  return readFileSync(CORRECTION_MIGRATION, "utf8");
}

test("G1 correction establishes the final snapshot during INSERT", () => {
  const migration = readCorrection();

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.check_invoices_before_write/);
  assert.match(
    migration,
    /IF TG_OP = 'INSERT' THEN[\s\S]*?build_active_abs_invoice_snapshot\(/,
  );
  assert.match(migration, /NEW\.snapshot_quotation := v_snapshot;/);
  assert.match(migration, /NEW\.snapshot_quotation := jsonb_set\(/);
  assert.doesNotMatch(
    migration,
    /UPDATE public\.invoices\s+SET\s+snapshot_quotation\s*=/,
  );
});

test("G1 correction preserves ABS authority and zero-ABS fallback markers", () => {
  const migration = readCorrection();

  assert.match(migration, /approved_billing_scope_id/);
  assert.match(migration, /approvedBillingScopeId/);
  assert.match(migration, /approvedBillingScopeAcceptedGrandTotal/);
  assert.match(migration, /sourceQuotationId/);
  assert.match(migration, /invoiceAuthorityMode/);
  assert.match(migration, /legacy_quotation/);
  assert.match(
    migration,
    /public\.build_active_abs_invoice_snapshot\(\s*v_active_scope_id/,
  );
});

test("G1 correction preserves final settlement and durable audit boundaries", () => {
  const migration = readCorrection();

  assert.match(migration, /final_invoice_settlement/);
  assert.match(migration, /SERVICE_LIFETIME_EXPOSURE/);
  assert.match(migration, /'event_type', 'invoice\.created'/);
  assert.match(migration, /INSERT INTO public\.audit_logs/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_invoice_atomic\(/);
  assert.match(migration, /FROM public\.create_invoice_atomic_legacy\(/);
});

test("G1 correction does not weaken immutability or create a bypass", () => {
  const migration = readCorrection();

  assert.match(
    migration,
    /invoice financial totals and document snapshots are immutable after creation/,
  );
  assert.doesNotMatch(migration, /DISABLE TRIGGER|ENABLE TRIGGER/);
  assert.doesNotMatch(migration, /set_config\(|current_setting\(/);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.create_invoice_atomic\([\s\S]*?FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.create_invoice_atomic\([\s\S]*?TO service_role;/,
  );
});
