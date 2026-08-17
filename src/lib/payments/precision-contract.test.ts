import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260810090430_g2_payment_precision_reject.sql",
);

const sql = readFileSync(MIGRATION_PATH, "utf-8")
  .replace(/\r\n/g, "\n")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--.*$/gm, "");

const functionStart = sql.indexOf("CREATE OR REPLACE FUNCTION public.record_invoice_payment(");
const functionEnd = sql.indexOf("\n$$;", functionStart);
const functionSql = sql.slice(functionStart, functionEnd);

test("precision migration preserves the current public seven-argument RPC contract", () => {
  assert.match(
    sql,
    /CREATE OR REPLACE FUNCTION public\.record_invoice_payment\(\s*p_invoice_id uuid,\s*p_amount numeric,\s*p_date date,\s*p_method text,\s*p_reference text,\s*p_user_id text,\s*p_request_id uuid\s*\)/i,
  );
  assert.match(sql, /RETURNS TABLE\([\s\S]*?error_code text[\s\S]*?invoice_status text/i);
  assert.match(sql, /LANGUAGE plpgsql\s+SECURITY DEFINER\s+SET search_path = pg_catalog, public/i);
});

test("precision rejection occurs before lock, replay lookup, context checks, and delegation", () => {
  assert.match(
    functionSql,
    /IF p_amount IS NULL[\s\S]*?p_amount::text IN \('NaN', 'Infinity', '-Infinity'\)[\s\S]*?p_amount <= 0[\s\S]*?p_amount <> round\(p_amount, 2\)[\s\S]*?THEN[\s\S]*?'invalid_payment_amount'/i,
  );
  const guardIndex = functionSql.indexOf("IF p_amount IS NULL");
  const lockIndex = functionSql.indexOf("pg_advisory_xact_lock");
  const delegateIndex = functionSql.indexOf("_record_invoice_payment_before_service_audit");
  assert.ok(guardIndex >= 0 && guardIndex < lockIndex);
  assert.ok(guardIndex < delegateIndex);
});

test("precision comparison does not normalize the delegated amount or add wrapper mutations", () => {
  assert.match(functionSql, /FROM public\._record_invoice_payment_before_service_audit\(/i);
  assert.match(functionSql, /\n\s*p_amount,\n\s*p_date,/i);
  assert.doesNotMatch(functionSql, /INSERT INTO public\.payments|UPDATE public\.invoices|UPDATE public\.services/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,numeric,date,text,text,text,uuid\)[\s\S]*?FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.record_invoice_payment\(uuid,numeric,date,text,text,text,uuid\)[\s\S]*?TO service_role/i);
});

test("the wrapper preserves replay and deposit-transition behavior", () => {
  assert.match(functionSql, /v_payment_existed_before boolean/i);
  assert.match(functionSql, /FROM public\.payments p\s+WHERE p\.request_id = p_request_id/i);
  assert.match(functionSql, /payment_service_audit_context_unavailable/i);
  assert.match(functionSql, /deposit_transition/i);
  assert.match(functionSql, /deposit_payment_confirmed/i);
});
