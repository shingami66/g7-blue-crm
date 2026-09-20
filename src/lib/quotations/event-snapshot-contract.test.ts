import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20260920110000_w7p0_event_quotation_customer_document_hardening.sql", import.meta.url),
  "utf8",
);
const w2bMigration = readFileSync(
  new URL("../../../supabase/migrations/20260831120000_w2b_quotation_revision_lineage.sql", import.meta.url),
  "utf8",
);
const amendmentMigration = readFileSync(
  new URL("../../../supabase/migrations/20260919152000_w7p0a_approved_commercial_amendment_creation_ambiguity_recovery.sql", import.meta.url),
  "utf8",
);

test("event snapshot migration captures Service truth and labels legacy compatibility", () => {
  assert.match(migration, /ADD COLUMN event_snapshot jsonb NULL/);
  assert.match(migration, /CREATE FUNCTION public\.capture_quotation_event_snapshot/);
  assert.match(migration, /BEFORE INSERT ON public\.quotations/);
  for (const field of ["event_name", "event_type", "event_start_date", "event_end_date", "event_location"]) {
    assert.match(migration, new RegExp(`v_service\\.${field}`));
  }
  assert.match(migration, /'snapshotSource', 'service_at_quotation_creation'/);
  assert.match(migration, /'snapshotSource', 'legacy_service_compatibility'/);
  assert.match(migration, /not original capture evidence/);
  assert.match(migration, /q\.status IS DISTINCT FROM 'approved'/);
  assert.match(migration, /NEW\.revision_of_quotation_id IS NOT NULL/);
  assert.match(migration, /SELECT q\.event_snapshot/);
  assert.match(migration, /quotation_event_snapshot_immutable/);
});

test("revision and Commercial Amendment successor inserts stay snapshot-independent", () => {
  assert.match(w2bMigration, /v_source\.snapshot_seller/);
  assert.match(w2bMigration, /INSERT INTO public\.quotations/);
  assert.match(amendmentMigration, /v_source\.snapshot_seller/);
  assert.match(amendmentMigration, /INSERT INTO public\.quotations/);
  assert.doesNotMatch(w2bMigration, /UPDATE public\.quotations[\s\S]*event_snapshot/);
  assert.doesNotMatch(amendmentMigration, /UPDATE public\.quotations[\s\S]*event_snapshot/);
});

test("event snapshot migration does not introduce financial or billing authority fields", () => {
  const executableMigration = migration.replace(/--.*$/gm, "");
  assert.doesNotMatch(executableMigration, /subtotal|discount|vat_amount|grand_total|approved_billing_scopes|invoices|payments|receipts/i);
});
