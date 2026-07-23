import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(join(import.meta.dirname, "../../../supabase/migrations/20260722120000_enforce_one_active_deposit_per_service.sql"), "utf8");
const functionStart = migration.indexOf("CREATE OR REPLACE FUNCTION public.create_invoice_atomic(");
const functionSql = migration.slice(functionStart, migration.indexOf("COMMENT ON FUNCTION", functionStart));
const depositStart = functionSql.indexOf("IF p_invoice_type = 'deposit' THEN", functionSql.indexOf("7–8."));
const finalStart = functionSql.indexOf("    ELSE", depositStart);
const depositBlock = functionSql.slice(depositStart, finalStart);
const finalBlock = functionSql.slice(finalStart, functionSql.indexOf("-- 9. Invoice", finalStart));
const insertException = functionSql.slice(functionSql.indexOf("    EXCEPTION", functionSql.indexOf("INSERT INTO public.invoices")));

test("migration preflight and data guard cover the locked schema and predicate", () => {
  for (const value of ["public.invoices", "public.services", "service_id", "approved_quotation_id", "invoice_type", "is_deleted", "voided_at", "status", "services','id", "to_regprocedure('public.create_invoice_atomic(uuid,uuid,text,numeric,text,text,text,jsonb,jsonb,jsonb,jsonb,jsonb,date,date)')", "prosecdef", "search_path=pg_catalog, public"]) assert.ok(migration.includes(value));
  const guard = migration.slice(0, migration.indexOf("CREATE OR REPLACE FUNCTION"));
  assert.ok(guard.indexOf("active_deposit_duplicates_require_manual_review") < guard.indexOf("CREATE UNIQUE INDEX"));
  for (const value of ["i.service_id IS NOT NULL", "i.invoice_type='deposit'", "COALESCE(i.is_deleted,false)=false", "i.voided_at IS NULL", "i.status NOT IN ('voided','cancelled')"]) assert.ok(guard.includes(value));
});

test("index handling validates absent, matching, and mismatched definitions", () => {
  const guard = migration.slice(0, functionStart);
  for (const value of ["v_index_oid IS NOT NULL", "pg_get_indexdef", "v_index_def <>", "active_deposit_index_definition_mismatch", "to_regclass('public.uq_invoices_one_active_deposit_per_service') IS NULL", "CREATE UNIQUE INDEX uq_invoices_one_active_deposit_per_service ON public.invoices (service_id)"]) assert.ok(guard.includes(value));
  for (const value of ["service_id IS NOT NULL", "invoice_type = ''deposit''", "COALESCE(is_deleted, false) = false", "voided_at IS NULL", "status NOT IN (''voided'', ''cancelled'')"]) assert.ok(guard.includes(value));
});

test("scoped RPC blocks preserve final behavior and narrowly map the exact index", () => {
  assert.equal(migration.includes("create_invoice_atomic_legacy"), false);
  assert.doesNotMatch(migration, /ALTER FUNCTION[\s\S]*RENAME/i);
  assert.doesNotMatch(migration, /pg_get_functiondef/i);
  assert.doesNotMatch(functionSql, /FROM public\.create_invoice_atomic\(/i);
  assert.match(functionSql, /RETURNS TABLE \([\s\S]*?error_code text,[\s\S]*?invoice_id uuid,[\s\S]*?invoice_number text[\s\S]*?\)[\s\S]*?LANGUAGE plpgsql[\s\S]*?SECURITY DEFINER[\s\S]*?SET search_path = pg_catalog, public/i);
  for (const value of ["i.service_id = p_service_id", "i.invoice_type = 'deposit'", "i.status NOT IN ('voided', 'cancelled')", "i.voided_at IS NULL", "COALESCE(i.is_deleted, false) = false", "deposit_invoice_already_exists"]) assert.ok(depositBlock.includes(value));
  assert.equal(depositBlock.includes("approved_quotation_id = p_quotation_id"), false);
  for (const value of ["i.service_id = p_service_id", "i.invoice_type = 'final'", "i.status NOT IN ('voided', 'cancelled')", "i.voided_at IS NULL", "COALESCE(i.is_deleted, false) = false", "final_invoice_already_exists"]) assert.ok(finalBlock.includes(value));
  assert.match(insertException, /WHEN unique_violation THEN[\s\S]*?CONSTRAINT_NAME[\s\S]*?v_constraint_name = 'uq_invoices_one_active_deposit_per_service'[\s\S]*?deposit_invoice_already_exists[\s\S]*?RETURN QUERY SELECT 'invoice_insert_failed'[\s\S]*?WHEN OTHERS THEN/i);
  for (const role of ["PUBLIC", "anon", "authenticated"]) assert.match(migration, new RegExp(`REVOKE ALL ON FUNCTION public\\.create_invoice_atomic[\\s\\S]*?FROM ${role};`, "i"));
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_invoice_atomic[\s\S]*?TO service_role;/i);
});
