/**
 * rpc-contract.test.ts
 *
 * Static contract tests for the payment recording hardening migration.
 * Inspects the exact migration file text and fails clearly when a required
 * financial invariant is absent.
 *
 * Test runner: Node.js built-in test runner
 *   node --no-warnings --experimental-strip-types --test src/lib/payments/rpc-contract.test.ts
 */

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATION_PATH = join(
  process.cwd(),
  "supabase/migrations/20260718190000_payment_recording_hardening.sql",
);

const rawSql = readFileSync(MIGRATION_PATH, "utf-8");

// Strip single-line and multi-line comments so assertions only see executable SQL.
const stripComments = (str: string) => {
  return str.replace(/--.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");
};

const sql = stripComments(rawSql);

// ---------------------------------------------------------------------------
// Schema contract: payments.request_id
// ---------------------------------------------------------------------------

test("request_id UUID column exists and is nullable", () => {
  // Migration must add the column; nullability is confirmed by absence of NOT NULL.
  assert.match(
    sql,
    /ADD COLUMN\s+request_id\s+uuid/i,
    "payments.request_id column must be added as uuid",
  );
  // The column definition must NOT include NOT NULL (historical rows stay null).
  const addColumnBlock = sql.match(/ADD COLUMN\s+request_id\s+uuid[^;]*/i)?.[0] ?? "";
  assert.doesNotMatch(
    addColumnBlock,
    /NOT\s+NULL/i,
    "request_id must be nullable to preserve historical rows",
  );
});

test("unique non-null request_id reservation index exists", () => {
  assert.match(
    sql,
    /CREATE UNIQUE INDEX\s+idx_payments_request_id_unique/i,
    "unique index idx_payments_request_id_unique must be created",
  );
  // Must be a partial index scoped to non-null values only.
  assert.match(
    sql,
    /WHERE\s+request_id\s+IS\s+NOT\s+NULL/i,
    "unique index must be partial (WHERE request_id IS NOT NULL) to avoid blocking historical null rows",
  );
});

test("snapshot columns are added and nullable for historical compatibility", () => {
  assert.match(sql, /ADD COLUMN\s+invoice_amount_paid_after\s+numeric/i);
  assert.match(sql, /ADD COLUMN\s+invoice_balance_due_after\s+numeric/i);
  assert.match(sql, /ADD COLUMN\s+invoice_status_after\s+text/i);

  const addColsBlock = sql.match(/ALTER TABLE public\.payments[\s\S]*?;/i)?.[0] ?? "";
  assert.doesNotMatch(addColsBlock, /NOT\s+NULL/i, "snapshot columns must be nullable");
});

test("snapshot completeness CHECK constraint exists and uses NOT VALID", () => {
  const checkPattern = /ADD\s+CONSTRAINT\s+payments_snapshot_completeness_check\s+CHECK\s*\(\s*request_id\s+IS\s+NULL\s+OR\s*\(\s*invoice_amount_paid_after\s+IS\s+NOT\s+NULL\s+AND\s+invoice_balance_due_after\s+IS\s+NOT\s+NULL\s+AND\s+invoice_status_after\s+IS\s+NOT\s+NULL\s*\)\s*\)\s+NOT\s+VALID/i;
  assert.match(sql, checkPattern, "must have payments_snapshot_completeness_check constraint");
});

test("positive table CHECK constraint exists and uses NOT VALID", () => {
  assert.match(
    sql,
    /ADD\s+CONSTRAINT\s+payments_amount_positive_check\s+CHECK\s*\(\s*amount\s*>\s*0\s*\)\s+NOT\s+VALID/i,
    "table must have CHECK (amount > 0) NOT VALID",
  );
});

// ---------------------------------------------------------------------------
// RPC contract: 7-arg hardened signature
// ---------------------------------------------------------------------------

test("hardened RPC accepts caller request UUID as p_request_id parameter", () => {
  assert.match(
    sql,
    /record_invoice_payment\s*\([^)]*p_request_id\s+uuid[^)]*\)/i,
    "hardened RPC signature must include p_request_id uuid parameter",
  );
});

test("hardened RPC returns a stable one-row result contract with error_code", () => {
  // RETURNS TABLE must declare error_code column.
  assert.match(
    sql,
    /RETURNS\s+TABLE\s*\([^)]*error_code\s+text[^)]*\)/i,
    "hardened RPC must declare error_code text in its RETURNS TABLE",
  );
  // Must also return payment_id, payment_number, amount_paid, balance_due, invoice_status.
  const returnsBlock = sql.match(/RETURNS\s+TABLE\s*\([^)]*\)/i)?.[0] ?? "";
  assert.match(returnsBlock, /payment_id\s+uuid/i,     "RETURNS TABLE must include payment_id uuid");
  assert.match(returnsBlock, /payment_number\s+text/i, "RETURNS TABLE must include payment_number text");
  assert.match(returnsBlock, /amount_paid\s+numeric/i, "RETURNS TABLE must include amount_paid numeric");
  assert.match(returnsBlock, /balance_due\s+numeric/i, "RETURNS TABLE must include balance_due numeric");
  assert.match(returnsBlock, /invoice_status\s+text/i, "RETURNS TABLE must include invoice_status text");
});

test("idempotency_conflict error code is defined in the migration", () => {
  assert.match(
    sql,
    /'idempotency_conflict'/,
    "migration must return 'idempotency_conflict' when same request_id maps to a different payload",
  );
});

// ---------------------------------------------------------------------------
// Idempotency & Locking structural order
// ---------------------------------------------------------------------------

test("null request-id validation occurs before advisory locking", () => {
  const nullCheckPattern = /IF\s+p_request_id\s+IS\s+NULL\s+THEN/i;
  const advisoryLockPattern = /pg_catalog\.pg_advisory_xact_lock\s*\(/i;

  const nullCheckMatch = nullCheckPattern.exec(sql);
  const advisoryLockMatch = advisoryLockPattern.exec(sql);

  assert.ok(nullCheckMatch, "p_request_id IS NULL check must exist");
  assert.ok(advisoryLockMatch, "advisory lock must exist");
  assert.ok(
    nullCheckMatch.index < advisoryLockMatch.index,
    "null check must occur before advisory lock"
  );
});

test("advisory transaction lock exists before first request_id SELECT", () => {
  const advisoryLockPattern = /pg_catalog\.pg_advisory_xact_lock\s*\(\s*pg_catalog\.hashtextextended\s*\(\s*p_request_id::text\s*,\s*8583\s*\)\s*\)/i;
  const advisoryLockMatch = advisoryLockPattern.exec(sql);

  assert.ok(advisoryLockMatch, "advisory transaction lock with fixed seed 8583 must exist");

  const selectPattern = /SELECT\s+py\.id,\s*py\.payment_number,\s*py\.amount,\s*py\.invoice_id,\s*py\.date,\s*py\.method,\s*py\.reference,\s*py\.invoice_amount_paid_after,\s*py\.invoice_balance_due_after,\s*py\.invoice_status_after\s+INTO\s+v_payment_record\s+FROM\s+public\.payments\s+py\s+WHERE\s+py\.request_id\s*=\s*p_request_id/i;
  const selectMatch = selectPattern.exec(sql);

  assert.ok(selectMatch, "request_id lookup SELECT must exist");
  assert.ok(
    advisoryLockMatch.index < selectMatch.index,
    "advisory lock must occur before request_id lookup",
  );

  const beforeAdvisory = sql.slice(0, advisoryLockMatch.index);
  assert.doesNotMatch(
    beforeAdvisory,
    /FROM\s+public\.payments\s+.*?WHERE.*?request_id/i,
    "no request_id lookup exists before the advisory lock",
  );
});

test("replay/conflict branch appears after advisory lock and before Service lock", () => {
  const advisoryLockPattern = /pg_catalog\.pg_advisory_xact_lock\s*\(/i;
  const foundPattern = /IF\s+FOUND\s+THEN/i;
  const serviceLockPattern = /FROM\s+public\.services\s+s\s+WHERE\s+s\.id\s*=\s*v_service_id\s+FOR\s+UPDATE/i;

  const advisoryMatch = advisoryLockPattern.exec(sql);
  const foundMatch = foundPattern.exec(sql);
  const serviceLockMatch = serviceLockPattern.exec(sql);

  assert.ok(foundMatch, "IF FOUND THEN must exist");
  assert.ok(serviceLockMatch, "Service FOR UPDATE must exist");

  assert.ok(
    advisoryMatch!.index < foundMatch.index && foundMatch.index < serviceLockMatch.index,
    "replay/conflict handling must appear between advisory lock and Service lock",
  );
});

test("Service FOR UPDATE appears before Invoice FOR UPDATE", () => {
  const serviceLockPattern = /FROM\s+public\.services\s+s\s+WHERE\s+s\.id\s*=\s*v_service_id\s+FOR\s+UPDATE/i;
  const invoiceLockPattern = /FROM\s+public\.invoices\s+i\s+WHERE\s+i\.id\s*=\s*p_invoice_id\s+AND\s+\(\s*v_service_id\s+IS\s+NULL\s+OR\s+i\.service_id\s*=\s*v_service_id\s*\)\s+FOR\s+UPDATE/i;

  const serviceLockMatch = serviceLockPattern.exec(sql);
  const invoiceLockMatch = invoiceLockPattern.exec(sql);

  assert.ok(serviceLockMatch, "Service FOR UPDATE must exist");
  assert.ok(invoiceLockMatch, "Invoice FOR UPDATE must exist");

  assert.ok(
    serviceLockMatch.index < invoiceLockMatch.index,
    "Service FOR UPDATE must appear before Invoice FOR UPDATE",
  );
});

test("mutations occur in correct order after locks", () => {
  const invoiceLockPattern = /FROM\s+public\.invoices\s+i\s+WHERE\s+i\.id\s*=\s*p_invoice_id[\s\S]*?FOR\s+UPDATE/i;
  const nextvalPattern = /public\.generate_document_number\s*\(\s*'payment'\s*\)/i;
  const paymentInsertPattern = /INSERT\s+INTO\s+public\.payments\s*\(/i;
  const invoiceUpdatePattern = /UPDATE\s+public\.invoices\s+i\s+SET/i;
  const auditInsertPattern = /INSERT\s+INTO\s+public\.audit_logs/i;

  const invoiceLockMatch = invoiceLockPattern.exec(sql);
  const nextvalMatch = nextvalPattern.exec(sql);
  const paymentInsertMatch = paymentInsertPattern.exec(sql);
  const invoiceUpdateMatch = invoiceUpdatePattern.exec(sql);
  const auditInsertMatch = auditInsertPattern.exec(sql);

  assert.ok(invoiceLockMatch && nextvalMatch && paymentInsertMatch && invoiceUpdateMatch && auditInsertMatch);

  assert.ok(invoiceLockMatch.index < nextvalMatch.index, "Invoice FOR UPDATE must appear before nextval");
  assert.ok(nextvalMatch.index < paymentInsertMatch.index, "nextval must appear before Payment insert");
  assert.ok(paymentInsertMatch.index < invoiceUpdateMatch.index, "Payment insert must appear before Invoice update");
  assert.ok(invoiceUpdateMatch.index < auditInsertMatch.index, "Invoice update must appear before audit insertion");
});

test("Payment INSERT stores the snapshot fields and success response uses same variables", () => {
  const insertPattern = /INSERT\s+INTO\s+public\.payments[\s\S]*?invoice_amount_paid_after[\s\S]*?invoice_balance_due_after[\s\S]*?invoice_status_after[\s\S]*?VALUES[\s\S]*?v_new_amount_paid[\s\S]*?v_new_balance_due[\s\S]*?v_new_status/i;
  assert.match(sql, insertPattern, "Payment INSERT must store calculated new snapshot variables");

  const returnPattern = /RETURN\s+QUERY\s+SELECT\s+NULL::text,\s*v_payment_id,\s*v_payment_number,\s*v_new_amount_paid,\s*v_new_balance_due,\s*v_new_status;/i;
  assert.match(sql, returnPattern, "Success response must use v_new_amount_paid, v_new_balance_due, v_new_status");
});

test("Replay response strictly uses the stored snapshot without rereading mutable state", () => {
  const foundBranchPattern = /IF\s+FOUND\s+THEN([\s\S]*?)SELECT\s+i\.service_id/i;
  const foundBranchMatch = foundBranchPattern.exec(sql);
  assert.ok(foundBranchMatch, "IF FOUND THEN branch must exist");
  const branchSql = foundBranchMatch[1];

  assert.match(branchSql, /RETURN\s+QUERY\s+SELECT\s+NULL::text,\s*v_payment_record\.id,\s*v_payment_record\.payment_number,\s*v_payment_record\.invoice_amount_paid_after,\s*v_payment_record\.invoice_balance_due_after,\s*v_payment_record\.invoice_status_after;/i);
  assert.doesNotMatch(branchSql, /FROM\s+public\.invoices/i, "replay must not query invoices");
  assert.doesNotMatch(branchSql, /FROM\s+public\.services/i, "replay must not query services");
  assert.doesNotMatch(branchSql, /COALESCE\s*\(\s*v_payment_record\.invoice_amount_paid_after/i, "no coalesce allowed on snapshot fields");
});

// ---------------------------------------------------------------------------
// Financial rules: amount and overpayment
// ---------------------------------------------------------------------------

test("positive amount enforcement exists at database level", () => {
  // The RPC must reject p_amount <= 0 and return a stable error code.
  assert.match(
    sql,
    /p_amount\s*(IS\s+NULL\s+OR\s+p_amount\s*<=\s*0|<=\s*0)/i,
    "migration must check p_amount <= 0 and return invalid_payment_amount",
  );
  assert.match(
    sql,
    /'invalid_payment_amount'/,
    "migration must return 'invalid_payment_amount' error code for non-positive amounts",
  );
});

test("overpayment block enforced using locked Invoice values", () => {
  // Must check amount against balance_due from the locked record (v_invoice_record.balance_due),
  // not against a client-submitted value.
  assert.match(
    sql,
    /v_norm_amount\s*>\s*v_invoice_record\.balance_due/,
    "overpayment check must compare v_norm_amount to v_invoice_record.balance_due (locked value)",
  );
  assert.match(
    sql,
    /'payment_exceeds_balance'/,
    "migration must return 'payment_exceeds_balance' error code for overpayment",
  );
});

// ---------------------------------------------------------------------------
// Lifecycle rules: Deposit transition
// ---------------------------------------------------------------------------

test("Deposit transition UPDATE is guarded by executable conditions", () => {
  const depositGuardPattern = /IF\s+v_invoice_type\s*=\s*'deposit'\s+AND\s+v_new_balance_due\s*=\s*0\s+AND\s+v_service_id\s+IS\s+NOT\s+NULL\s+THEN\s+SELECT\s+s\.status\s+INTO\s+v_service_status\s+FROM\s+public\.services\s+s\s+WHERE\s+s\.id\s*=\s*v_service_id\s*;\s+IF\s+v_service_status\s*=\s*'Approved'\s+THEN\s+UPDATE\s+public\.services\s+s\s+SET\s+status\s*=\s*'Deposit Paid'/i;

  assert.match(
    sql,
    depositGuardPattern,
    "Deposit transition must be structurally guarded by invoice_type='deposit', balance_due=0, and source status='Approved'",
  );
});

test("Final invoices cannot enter the Deposit transition update", () => {
  assert.doesNotMatch(
    sql,
    /v_invoice_type\s*=\s*'final'[\s\S]*?UPDATE\s+public\.services\s+s\s+SET\s+status\s*=\s*'Deposit Paid'/i,
    "final invoices must not trigger Deposit Paid transition",
  );
});

// ---------------------------------------------------------------------------
// Transaction atomicity: all mutations inside one RPC body
// ---------------------------------------------------------------------------

test("Payment, Invoice, lifecycle, numbering, and audit operations are in one RPC transaction", () => {
  // All of these must be present within the single CREATE OR REPLACE FUNCTION body.
  // The migration wraps the whole file in BEGIN/COMMIT, so these are all one txn.
  assert.match(sql, /generate_document_number\('payment'\)/,      "payment number generation must be inside the RPC");
  assert.match(sql, /INSERT INTO public\.payments/,               "payment INSERT must be inside the RPC");
  assert.match(sql, /UPDATE public\.invoices/,                    "invoice settlement UPDATE must be inside the RPC");
  assert.match(sql, /UPDATE public\.services/,                    "service lifecycle UPDATE must be inside the RPC");
  assert.match(sql, /INSERT INTO public\.audit_logs/,             "audit log INSERT must be inside the RPC");
  // The migration itself is wrapped in a transaction.
  assert.match(sql, /^BEGIN;/m,  "migration must open an explicit transaction with BEGIN");
  assert.match(sql, /^COMMIT;/m, "migration must close the transaction with COMMIT");
});
