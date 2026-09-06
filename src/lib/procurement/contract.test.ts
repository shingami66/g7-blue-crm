import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = process.cwd();

const migration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260901061855_w4_procurement_requirement_sourcing.sql"),
  "utf8",
);
const quotationMigration = readFileSync(
  join(REPO_ROOT, "supabase/migrations/20260902090000_w4_first_class_supplier_quotations.sql"),
  "utf8",
);

function withoutSqlComments(source: string) {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/--.*$/gm, "");
}

test("W4 migration is additive, bounded, and has no commitment/accounting surface", () => {
  const executable = withoutSqlComments(migration);

  assert.match(executable, /CREATE TABLE public\.service_procurement_requirements/);
  assert.match(executable, /CREATE TABLE public\.service_procurement_candidates/);
  assert.match(executable, /PRIMARY KEY \(requirement_id, supplier_id\)/);
  assert.match(executable, /sourcing_path IN \('make', 'rent', 'buy', 'source', 'sole_source', 'emergency'\)/);
  assert.match(executable, /selection_status IN \('open', 'selected'\)/);
  assert.match(executable, /selection_status = 'open'/);
  assert.match(executable, /selection_status = 'selected'/);
  assert.match(executable, /quoted_amount numeric\(14,2\)/);
  assert.match(executable, /currency text NOT NULL DEFAULT 'SAR'/);

  assert.deepEqual(
    [...executable.matchAll(/CREATE INDEX\s+([a-z0-9_]+)/gi)].map((match) => match[1]),
    ["service_procurement_requirements_service_created_idx"],
  );
  assert.equal((executable.match(/CREATE OR REPLACE FUNCTION/g) ?? []).length, 3);
  assert.equal((executable.match(/SET search_path = pg_catalog, public/g) ?? []).length, 3);
  assert.equal((executable.match(/SECURITY DEFINER/g) ?? []).length, 3);

  assert.match(executable, /p_actor_role NOT IN \('admin', 'manager'\)/);
  assert.match(executable, /pg_advisory_xact_lock\(hashtextextended\('w4-procurement:'/);
  assert.match(executable, /'request_id', p_request_id::text/);
  assert.match(executable, /'from', v_before/);
  assert.match(executable, /'payload', v_payload/);
  assert.match(executable, /'procurement_supplier_selected'/);
  assert.match(executable, /REVOKE ALL ON TABLE public\.service_procurement_requirements FROM PUBLIC, anon, authenticated/);
  assert.match(executable, /REVOKE ALL ON TABLE public\.service_procurement_candidates FROM PUBLIC, anon, authenticated/);
  assert.match(executable, /GRANT EXECUTE ON FUNCTION public\.select_service_procurement_supplier/);
  assert.doesNotMatch(executable, /app_user_permission_overrides|supplier_bookings|purchase_orders|receipts|accounts_payable|accounting_entries|supplier_payments/i);
});

test("Supplier quotation history is first-class, additive, and remains evidence-only", () => {
  const executable = withoutSqlComments(quotationMigration);
  const normalized = executable.replace(/\s+/g, " ");
  const createFunctionStart = executable.indexOf("CREATE OR REPLACE FUNCTION public.create_supplier_quotation");
  const attachFunctionStart = executable.indexOf("CREATE OR REPLACE FUNCTION public.attach_supplier_quotation_documents");
  const createFunction = executable.slice(createFunctionStart, attachFunctionStart);

  assert.match(executable, /CREATE TABLE public\.supplier_quotations/);
  assert.match(executable, /CREATE TABLE public\.supplier_quotation_requirements/);
  assert.match(executable, /CREATE TABLE public\.supplier_quotation_documents/);
  assert.match(executable, /supplier_reference text,/);
  assert.match(executable, /quotation_date date,/);
  assert.doesNotMatch(executable, /supplier_reference text NOT NULL/);
  assert.doesNotMatch(executable, /quotation_date date NOT NULL/);
  assert.match(executable, /package_total numeric\(14,2\)/);
  assert.match(executable, /PRIMARY KEY \(quotation_id, requirement_id\)/);
  assert.match(executable, /line_amount numeric\(14,2\)/);
  assert.match(executable, /line_evidence_ref text,/);
  assert.doesNotMatch(executable, /line_evidence_ref text NOT NULL/);
  assert.match(executable, /COMMENT ON COLUMN public\.supplier_quotation_requirements\.line_evidence_ref/);
  assert.match(executable, /REFERENCES public\.business_documents\(id\) ON DELETE RESTRICT/);
  assert.match(executable, /FOREIGN KEY \(quotation_id, service_id\)/);
  assert.match(executable, /FOREIGN KEY \(requirement_id, service_id\)/);
  assert.match(executable, /CREATE OR REPLACE FUNCTION public\.create_supplier_quotation/);
  assert.match(executable, /CREATE OR REPLACE FUNCTION public\.attach_supplier_quotation_documents/);
  assert.match(executable, /ON CONFLICT ON CONSTRAINT supplier_quotations_compatibility_source_key DO NOTHING/);
  assert.match(executable, /ON CONFLICT \(quotation_id, requirement_id\) DO NOTHING/);
  assert.match(executable, /ON CONFLICT \(document_id\) DO NOTHING/);
  assert.match(executable, /source_candidate_requirement_id/);
  assert.match(executable, /source_candidate_supplier_id/);
  assert.doesNotMatch(executable, /W4-CANDIDATE-/);
  assert.match(normalized, /SELECT c\.supplier_id, r\.service_id, NULL, NULL, NULL, 'SAR', c\.created_at,/);
  assert.match(normalized, /c\.offer_summary, c\.quoted_amount, c\.evidence_ref, c\.created_at,/);
  assert.match(createFunction, /v_supplier_reference IS NULL/);
  assert.match(createFunction, /p_quotation_date IS NULL/);
  assert.doesNotMatch(createFunction, /line_evidence_ref/);
  assert.match(executable, /system:w4-compatibility-backfill/);
  assert.match(executable, /supplier_quotation_compatibility_backfill/);
  assert.match(executable, /SET search_path = pg_catalog, public/);
  assert.equal((executable.match(/SECURITY DEFINER/g) ?? []).length, 2);
  assert.match(executable, /p_actor_role NOT IN \('admin', 'manager'\)/);
  assert.match(executable, /REVOKE ALL ON TABLE public\.supplier_quotations FROM PUBLIC, anon, authenticated/);
  assert.match(executable, /GRANT EXECUTE ON FUNCTION public\.create_supplier_quotation/);
  assert.match(executable, /GRANT EXECUTE ON FUNCTION public\.attach_supplier_quotation_documents/);
  assert.doesNotMatch(executable, /service_procurement_candidates[\s\S]*?PRIMARY KEY \(requirement_id, supplier_id\)/);
  assert.doesNotMatch(executable, /supplier_bookings|purchase_orders|receipts|accounts_payable|accounting_entries|supplier_payments/i);
});
