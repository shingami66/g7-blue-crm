import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const migration = readFileSync(
  join(
    import.meta.dirname,
    "../../../supabase/migrations/20260803130000_deposit_service_audit_and_completed_billing_fix.sql",
  ),
  "utf8",
);

const sql = migration
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/--.*$/gm, "");
const wrapperStart = sql.indexOf("CREATE FUNCTION public.record_invoice_payment(");
const wrapperEnd = sql.indexOf("ALTER FUNCTION public.record_invoice_payment", wrapperStart);
const wrapperSql = sql.slice(wrapperStart, wrapperEnd);

test("payment correction preflights the deployed signature, return shape, and overload set", () => {
  assert.match(sql, /to_regprocedure\(\s*'public\.record_invoice_payment\(uuid,numeric,date,text,text,text,uuid\)'/i);
  assert.match(sql, /TABLE\(error_code text, payment_id uuid, payment_number text, amount_paid numeric, balance_due numeric, invoice_status text\)/i);
  assert.match(sql, /unexpected payment RPC overload exists/i);
  assert.match(sql, /required column or type missing/i);
  assert.match(sql, /payment transaction contract drift/i);
});

test("payment correction preserves the public RPC and delegates to the deployed transaction body", () => {
  assert.match(sql, /ALTER FUNCTION public\.record_invoice_payment\(uuid,numeric,date,text,text,text,uuid\)\s+RENAME TO _record_invoice_payment_before_service_audit/i);
  assert.match(wrapperSql, /RETURNS TABLE\([\s\S]*?error_code text[\s\S]*?invoice_status text/i);
  assert.match(wrapperSql, /FROM public\._record_invoice_payment_before_service_audit\(/i);
  assert.doesNotMatch(wrapperSql, /INSERT INTO public\.payments|UPDATE public\.invoices/i);
});

test("deposit audit wrapper returns a safe context error before delegating mutation", () => {
  const safeError = wrapperSql.indexOf("payment_service_audit_context_unavailable");
  const delegate = wrapperSql.indexOf("_record_invoice_payment_before_service_audit(");

  assert.notEqual(safeError, -1);
  assert.notEqual(delegate, -1);
  assert.ok(safeError < delegate);
  assert.match(wrapperSql, /RETURN QUERY SELECT\s+'payment_service_audit_context_unavailable'::text/);
  assert.match(wrapperSql, /FROM public\.services s[\s\S]*FOR UPDATE/);
  assert.match(wrapperSql, /FROM public\.invoices i[\s\S]*FOR UPDATE/);
  assert.match(wrapperSql, /FROM public\.app_users u[\s\S]*FOR SHARE/);
  assert.doesNotMatch(wrapperSql, /RAISE\s+EXCEPTION/i);
});

test("new full Deposit settlement creates one Service status audit with locked evidence", () => {
  for (const evidence of [
    /'status_change'/,
    /'service'/,
    /'event_type', 'service_status_changed'/,
    /'from_status', 'Approved'/,
    /'to_status', 'Deposit Paid'/,
    /'trigger', 'deposit_payment_confirmed'/,
    /'invoice_id', p_invoice_id/,
    /'payment_id', v_payment_result\.payment_id/,
    /'payment_number', v_payment_result\.payment_number/,
    /'amount', p_amount/,
    /'actor_id', p_user_id/,
    /'actor_role', v_actor_role/,
    /'transaction_timestamp', v_now/,
  ]) {
    assert.match(wrapperSql, evidence);
  }

  assert.match(wrapperSql, /FROM public\.app_users u[\s\S]*?u\.clerk_user_id = p_user_id[\s\S]*?u\.is_active = true/i);
});

test("partial, non-Deposit, failed, and replayed payments cannot add the Service audit", () => {
  assert.match(wrapperSql, /v_payment_result\.error_code IS NULL[\s\S]*?NOT v_payment_existed_before[\s\S]*?v_payment_result\.payment_id IS NOT NULL/i);
  assert.match(wrapperSql, /a\.action = 'payment_recorded'[\s\S]*?a\.entity_type = 'invoice'[\s\S]*?a\.details ->> 'deposit_transition' = 'true'/i);
  assert.match(wrapperSql, /IF v_deposit_transition THEN[\s\S]*?INSERT INTO public\.audit_logs/i);
  assert.match(wrapperSql, /a\.details ->> 'payment_id' = v_payment_result\.payment_id::text[\s\S]*?a\.details ->> 'trigger' = 'deposit_payment_confirmed'/i);
});

test("request idempotency is serialized before replay detection", () => {
  const advisoryLock = wrapperSql.indexOf("pg_catalog.pg_advisory_xact_lock");
  const replayCheck = wrapperSql.indexOf("SELECT EXISTS (", advisoryLock);
  const delegateCall = wrapperSql.indexOf("FROM public._record_invoice_payment_before_service_audit");

  assert.ok(advisoryLock >= 0);
  assert.ok(replayCheck > advisoryLock);
  assert.ok(delegateCall > replayCheck);
});

test("payment wrapper remains fixed-search-path and service-role only", () => {
  assert.match(wrapperSql, /SECURITY DEFINER\s+SET search_path = pg_catalog, public/i);
  assert.match(sql, /REVOKE ALL ON FUNCTION public\.record_invoice_payment\(uuid,numeric,date,text,text,text,uuid\)\s+FROM PUBLIC, anon, authenticated/i);
  assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.record_invoice_payment\(uuid,numeric,date,text,text,text,uuid\)\s+TO service_role/i);
  assert.match(sql, /^BEGIN;/m);
  assert.match(sql, /^COMMIT;/m);
});
