import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import assert from "node:assert/strict";

const repoRoot = join(import.meta.dirname, "..", "..", "..");
const migration = readFileSync(
  join(repoRoot, "supabase", "migrations", "20260921062559_w7b_flexible_customer_billing.sql"),
  "utf8",
);
const actionSource = readFileSync(join(repoRoot, "src", "lib", "invoices", "actions.ts"), "utf8");
const draftCorrectionMigration = migration.slice(
  migration.indexOf("CREATE OR REPLACE FUNCTION public.update_draft_flexible_invoice_atomic"),
);
const draftEditorSource = readFileSync(
  join(repoRoot, "src", "app", "(dashboard)", "invoices", "[id]", "EditDraftProgressInvoiceAction.tsx"),
  "utf8",
);
const invoiceDetailPageSource = readFileSync(
  join(repoRoot, "src", "app", "(dashboard)", "invoices", "[id]", "page.tsx"),
  "utf8",
);

test("W7B migration adds descriptive progress classification without a schedule dependency", () => {
  assert.match(migration, /CHECK \(invoice_type IN \('deposit', 'progress', 'final'\)\)/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_flexible_invoice_atomic/);
  assert.match(
    migration,
    /CREATE OR REPLACE FUNCTION public\.build_active_abs_invoice_snapshot[\s\S]*?p_invoice_type NOT IN \('deposit', 'progress', 'final'\)/,
  );
  assert.match(migration, /IF p_invoice_type = 'progress' THEN[\s\S]*?'description', 'Progress Payment'/);
  assert.doesNotMatch(migration, /v_partial|Deposit Payment/);
  assert.match(migration, /'vat_amount', CASE[\s\S]*?p_invoice_type = 'progress'[\s\S]*?THEN 0/);
  assert.match(
    migration,
    /'discount', CASE[\s\S]*?p_invoice_type = 'progress'[\s\S]*?THEN 0[\s\S]*?source_discount/,
  );
  assert.match(migration, /q\.superseded_at IS NULL/);
  assert.doesNotMatch(migration, /billing_schedule|milestone_workflow|workflow_engine/i);
});

test("W7B flexible create is replay-safe, service-serialized, and ceiling-bounded", () => {
  assert.match(migration, /pg_advisory_xact_lock\(hashtext\('invoice_mutation_key:'/);
  assert.match(migration, /WHERE i\.mutation_key = v_key/);
  assert.match(migration, /v_existing\.mutation_payload = v_payload/);
  assert.match(migration, /p_requested_amount > v_remaining/);
  assert.match(migration, /invoice_amount_exceeds_remaining/);
  assert.match(migration, /v_quotation\.superseded_at IS NOT NULL[\s\S]*?billing_scope_inactive/);
  assert.match(migration, /FROM public\.services s[\s\S]*FOR UPDATE/);
});

test("W7B draft corrections stop at issue and preserve authority identity", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.update_draft_flexible_invoice_atomic/);
  assert.match(migration, /v_invoice\.status IS DISTINCT FROM 'draft'/);
  assert.match(migration, /OLD\.status IS DISTINCT FROM 'draft'[\s\S]*?NEW\.status IS DISTINCT FROM 'draft'/);
  assert.match(migration, /current_setting\('app\.w7b_progress_draft_update', true\)/);
  assert.match(migration, /current_setting\('app\.w7b_progress_draft_mutation_key', true\)/);
  assert.match(migration, /current_setting\('app\.w7b_progress_snapshot_update', true\)/);
  assert.match(migration, /snapshot_quotation = v_snapshot/);
  assert.match(migration, /Progress Payment/);
  assert.match(
    draftCorrectionMigration,
    /SELECT i\.service_id INTO v_invoice_service_id[\s\S]*?FROM public\.invoices i[\s\S]*?SELECT s\.id, s\.status, s\.deleted_at, s\.customer_id INTO v_service[\s\S]*?FOR UPDATE[\s\S]*?SELECT i\.\* INTO v_invoice[\s\S]*?FOR UPDATE/,
  );
  assert.match(migration, /m\.created_at = transaction_timestamp\(\)/);
  assert.match(migration, /OLD\.approved_billing_scope_id IS DISTINCT FROM NEW\.approved_billing_scope_id/);
  assert.match(migration, /OLD\.snapshot_quotation IS DISTINCT FROM NEW\.snapshot_quotation/);
  assert.match(migration, /invoice_draft_update_mutations_key_unique/);
  assert.match(migration, /invoice\.progress_draft_updated/);
  assert.match(migration, /p_mutation_key text/);
  assert.match(
    migration,
    /INSERT INTO public\.invoice_draft_update_mutations[\s\S]*?UPDATE public\.invoices[\s\S]*?invoice\.progress_draft_updated/,
  );
});

test("W7B draft corrections fail closed on malformed prior exposure", () => {
  assert.match(
    draftCorrectionMigration,
    /i\.id IS DISTINCT FROM v_invoice\.id[\s\S]*?i\.grand_total IS NULL OR i\.grand_total < 0 OR i\.grand_total <> round\(i\.grand_total, 2\)[\s\S]*?invoice_exposure_unavailable/,
  );
  assert.match(draftCorrectionMigration, /invoice_exposure_unavailable[\s\S]*?SELECT COALESCE\(sum\(i\.grand_total\)/);
});

test("W7B migration safely removes an optional legacy correction overload", () => {
  assert.doesNotMatch(
    migration,
    /REVOKE ALL ON FUNCTION public\.update_draft_flexible_invoice_atomic\(uuid, numeric, date, text\)/,
  );
  assert.match(
    migration,
    /DROP FUNCTION IF EXISTS public\.update_draft_flexible_invoice_atomic\(uuid, numeric, date, text\);/,
  );
});

test("W7B server action carries explicit due date and uses the flexible RPC", () => {
  assert.match(actionSource, /invoiceType === "progress"/);
  assert.match(actionSource, /CREATE_FLEXIBLE_INVOICE_RPC/);
  assert.match(actionSource, /p_due_date: resolvedDueDate/);
  assert.match(actionSource, /const resolvedDueDate = invoiceType === "progress" \? dueDate \?\? today : today/);
  assert.match(actionSource, /p_due_date: today/);
  assert.match(actionSource, /p_requested_amount: requestedAmount as number/);
  assert.match(actionSource, /invoiceType === "deposit" \|\| invoiceType === "progress"/);
});

test("W7B draft correction reuses a mutation key for an unchanged retry", () => {
  assert.match(draftEditorSource, /useRef<DraftMutationAttempt \| null>\(null\)/);
  assert.match(draftEditorSource, /previousAttempt\?\.amountText === amountText/);
  assert.match(draftEditorSource, /mutationKey,/);
  assert.doesNotMatch(draftEditorSource, /mutationKey: crypto\.randomUUID\(\)/);
});

test("W7B draft correction receives the persisted ISO due date", () => {
  assert.match(invoiceDetailPageSource, /dueDate=\{invoice\.documentDueDate \?\? invoice\.documentDate \?\? ""\}/);
  assert.doesNotMatch(invoiceDetailPageSource, /dueDate=\{invoice\.dueDate \?\? invoice\.date/);
});
