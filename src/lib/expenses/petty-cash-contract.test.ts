import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const migration = fs.readFileSync(path.join(process.cwd(), "supabase/migrations/20260913100000_w5c_petty_cash_governed_workspace_foundation.sql"), "utf8");
const actions = fs.readFileSync(path.join(process.cwd(), "src/lib/expenses/actions.ts"), "utf8");

test("W5C migration is authored as a bounded unapplied extension", () => {
  assert.match(migration, /BEGIN;/);
  assert.match(migration, /COMMIT;/);
  assert.doesNotMatch(migration, /DROP TABLE/i);
  assert.match(migration, /to_regclass\('public\.petty_cash_funds'\) IS NULL/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.create_petty_cash_fund/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.update_petty_cash_fund/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.set_petty_cash_fund_status/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.create_petty_cash_fund\(text, uuid, numeric, uuid, text, text\)/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.create_petty_cash_fund\(text, uuid, numeric, uuid, text, text\)/);
});

test("W5C transaction authority covers withdrawal, linked disbursement, notes replay, and balance locks", () => {
  assert.match(migration, /treasury_withdrawal/);
  assert.match(migration, /petty_cash_disbursement_expense_required/);
  assert.match(migration, /v_existing_notes IS DISTINCT FROM NULLIF\(btrim\(p_notes\), ''\)/);
  assert.match(migration, /FROM public\.petty_cash_funds[\s\S]*FOR UPDATE/);
  assert.match(migration, /expense_must_be_approved_for_petty_cash_disbursement/);
  assert.match(migration, /petty_cash_fund_close_requires_zero_balance/);
  assert.match(migration, /SECURITY DEFINER/);
  assert.match(migration, /SET search_path = pg_catalog, public/);
  assert.match(migration, /REVOKE ALL ON FUNCTION public\.record_petty_cash_transaction/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.record_petty_cash_transaction[\s\S]*TO service_role/);
});

test("W5C Petty Cash Expense action forces the canonical company-direct funding path", () => {
  assert.match(actions, /export async function recordPettyCashExpenseAction/);
  assert.match(actions, /p_origin_type: \"company_direct\"/);
  assert.match(actions, /p_payment_method: \"petty_cash\"/);
  assert.match(actions, /p_cash_advance_id: null/);
  assert.match(actions, /p_claimant_id: null/);
  assert.match(actions, /p_petty_cash_fund_id: parsed\.data\.fund_id/);
  assert.match(actions, /uploadAndAttachExpenseReceiptInternal/);
  assert.match(actions, /outcome: "partial_success"/);
  assert.match(actions, /warning_code: "receipt_attachment_failed"/);
  assert.match(actions, /receipt_request_id: receiptRequestId/);
  assert.match(actions, /const receiptRequestId = parsed\.data\.request_id/);
  assert.match(actions, /details->>operation/);
  assert.match(actions, /from\("expense_documents"\)/);
  assert.match(actions, /document_attachment_uncertain/);
  assert.match(actions, /outcome: "full_success"/);
});
