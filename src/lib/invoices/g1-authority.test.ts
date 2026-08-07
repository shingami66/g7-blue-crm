import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260807090000_g1_financial_lifecycle_authority.sql",
);
const ACTIONS = join(REPO_ROOT, "src/lib/invoices/actions.ts");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("active ABS is the only source for the stored invoice quotation snapshot", () => {
  const migration = read(MIGRATION);

  assert.match(
    migration,
    /ALTER FUNCTION public\.create_invoice_atomic\([\s\S]*?\) RENAME TO create_invoice_atomic_legacy;/,
  );
  assert.match(
    migration,
    /IF v_invoice\.approved_billing_scope_id IS NOT NULL[\s\S]*?build_active_abs_invoice_snapshot\(/,
  );
  assert.match(
    migration,
    /i\.decision IN \('accepted', 'adjusted'\)/,
  );
  assert.match(migration, /'approvedBillingScopeId', v_scope\.id/);
  assert.match(migration, /'approvedBillingScopeAcceptedGrandTotal'/);
  assert.match(migration, /'sourceQuotationId', v_scope\.source_quotation_id/);
  assert.match(migration, /invoiceAuthorityMode/);
  assert.match(migration, /legacy_quotation/);
  assert.match(migration, /'description', i\.source_description/);
  assert.match(migration, /'qty', i\.accepted_qty/);
  assert.match(migration, /'unit_price', i\.accepted_unit_price/);
  assert.match(migration, /'total', i\.accepted_grand_total/);
  assert.match(
    migration,
    /invoice_snapshot_authority_unavailable/,
  );
});

test("invoice creation and issue transitions write durable lifecycle events atomically", () => {
  const migration = read(MIGRATION);

  assert.match(
    migration,
    /INSERT INTO public\.audit_logs\([\s\S]*?'create',[\s\S]*?'invoice',[\s\S]*?'invoice\.created'/,
  );
  assert.match(
    migration,
    /INSERT INTO public\.audit_logs\([\s\S]*?'status_change',[\s\S]*?'invoice',[\s\S]*?'invoice\.issued'/,
  );
  assert.match(migration, /'old_state', NULL/);
  assert.match(migration, /'old_state', 'draft'/);
  assert.match(migration, /'new_state', 'draft'/);
  assert.match(migration, /'new_state', 'sent'/);
  assert.match(migration, /'actor_id', p_actor_clerk_user_id/);
  assert.match(migration, /'invoice_number', v_invoice\.invoice_number/);
  assert.match(migration, /'service_id', v_invoice\.service_id/);
  assert.match(migration, /'customer_id', v_invoice\.customer_id/);
});

test("issue action delegates final authority to the service-role RPC", () => {
  const migration = read(MIGRATION);
  const actions = read(ACTIONS);

  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.issue_invoice_atomic\(\s*p_invoice_id uuid,\s*p_actor_clerk_user_id text\s*\)/,
  );
  assert.match(
    migration,
    /PERFORM 1[\s\S]*FROM public\.services s[\s\S]*FOR UPDATE;/,
  );
  assert.match(
    migration,
    /FROM public\.invoices i[\s\S]*WHERE i\.id = p_invoice_id[\s\S]*FOR UPDATE;/,
  );
  assert.match(
    migration,
    /UPDATE public\.invoices i[\s\S]*i\.status = 'draft'[\s\S]*RETURNING/,
  );
  assert.match(actions, /ISSUE_INVOICE_ATOMIC_RPC = "issue_invoice_atomic"/);
  assert.match(actions, /p_actor_clerk_user_id: user\.clerk_user_id/);
  assert.doesNotMatch(
    actions,
    /issueInvoiceAction[\s\S]*?\.from\("invoices"\)[\s\S]*?\.update\(/,
  );
});

test("new financial RPCs use fixed search paths and service_role-only execution", () => {
  const migration = read(MIGRATION);

  assert.match(migration, /SET search_path = pg_catalog, public/g);
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.create_invoice_atomic\([\s\S]*?FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.create_invoice_atomic_legacy\([\s\S]*?FROM PUBLIC, anon, authenticated, service_role;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.create_invoice_atomic\([\s\S]*?TO service_role;/,
  );
  assert.match(
    migration,
    /REVOKE ALL ON FUNCTION public\.issue_invoice_atomic\(uuid, text\)\s+FROM PUBLIC, anon, authenticated;/,
  );
  assert.match(
    migration,
    /GRANT EXECUTE ON FUNCTION public\.issue_invoice_atomic\(uuid, text\)\s+TO service_role;/,
  );
});
