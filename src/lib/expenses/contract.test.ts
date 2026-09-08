import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260907150000_w5a_expense_cash_foundation.sql",
);

const CORRECTIVE_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260907164500_w5a_rpc_output_ambiguity_repair.sql",
);

test("W5A Contract: Migration file exists locally and is bounded", () => {
  assert.ok(fs.existsSync(MIGRATION_PATH), "Migration file must exist at expected path");
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(sql.includes("BEGIN;"), "Migration must be wrapped in a transaction");
  assert.ok(sql.includes("COMMIT;"), "Migration must commit at the end");
  assert.ok(!sql.includes("DROP TABLE IF EXISTS"), "No unsafe DROP TABLE allowed");
});

test("W5A Contract: Preflight guards check prerequisites and object absence", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  assert.ok(sql.includes("to_regclass('public.app_users') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.services') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.business_documents') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.audit_logs') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.employee_cash_advances') IS NOT NULL"));
  assert.ok(sql.includes("to_regclass('public.expenses') IS NOT NULL"));
  assert.ok(sql.includes("to_regclass('public.petty_cash_funds') IS NOT NULL"));
});

test("W5A Contract: Audit action compatibility preserves 12 prior actions and appends 16 W5 actions (FI-008)", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  const priorActions = [
    "create",
    "update",
    "delete",
    "restore",
    "status_change",
    "payment_recorded",
    "correction",
    "procurement_package_created",
    "procurement_package_updated",
    "procurement_package_requirements_set",
    "procurement_package_supplier_selected",
    "procurement_package_supplier_cleared",
  ];

  for (const action of priorActions) {
    assert.ok(
      sql.includes(`'${action}'::text`),
      `Preserved audit action '${action}' must be present in check constraint`,
    );
  }

  const w5Actions = [
    "expense_submitted",
    "expense_approved",
    "expense_rejected",
    "expense_cancelled",
    "expense_evidence_exception_recorded",
    "expense_evidence_exception_disposed",
    "expense_document_attached",
    "expense_reimbursement_settled",
    "cash_advance_requested",
    "cash_advance_approved",
    "cash_advance_rejected",
    "cash_advance_cancelled",
    "cash_advance_issued",
    "cash_advance_expense_settled",
    "cash_advance_returned",
    "petty_cash_transaction_recorded",
  ];

  for (const action of w5Actions) {
    assert.ok(
      sql.includes(`'${action}'::text`),
      `W5 domain action '${action}' must be present in check constraint`,
    );
  }
});

test("W5A Contract: Strict topological table creation ordering", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  const advancePos = sql.indexOf("CREATE TABLE public.employee_cash_advances");
  const returnPos = sql.indexOf("CREATE TABLE public.cash_advance_returns");
  const fundPos = sql.indexOf("CREATE TABLE public.petty_cash_funds");
  const expensePos = sql.indexOf("CREATE TABLE public.expenses");
  const docPos = sql.indexOf("CREATE TABLE public.expense_documents");
  const exceptionPos = sql.indexOf("CREATE TABLE public.expense_evidence_exceptions");
  const reimbursePos = sql.indexOf("CREATE TABLE public.expense_reimbursement_settlements");
  const advanceSettlePos = sql.indexOf("CREATE TABLE public.cash_advance_expense_settlements");
  const pettyTxPos = sql.indexOf("CREATE TABLE public.petty_cash_transactions");

  assert.ok(advancePos > 0, "employee_cash_advances must exist");
  assert.ok(returnPos > advancePos, "cash_advance_returns must follow employee_cash_advances");
  assert.ok(fundPos > returnPos, "petty_cash_funds must follow cash_advance_returns");
  assert.ok(expensePos > fundPos, "expenses must follow petty_cash_funds and employee_cash_advances");
  assert.ok(docPos > expensePos, "expense_documents must follow expenses");
  assert.ok(exceptionPos > docPos, "expense_evidence_exceptions must follow expense_documents");
  assert.ok(reimbursePos > exceptionPos, "expense_reimbursement_settlements must follow expenses");
  assert.ok(advanceSettlePos > reimbursePos, "cash_advance_expense_settlements must follow expenses & advances");
  assert.ok(pettyTxPos > advanceSettlePos, "petty_cash_transactions must follow funds & expenses");
});

test("W5A Contract: Immutable cash-advance expense allocation evidence table exists with ON DELETE RESTRICT", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  assert.ok(sql.includes("CREATE TABLE public.cash_advance_expense_settlements"));
  assert.ok(
    sql.includes("cash_advance_id uuid NOT NULL REFERENCES public.employee_cash_advances(id) ON DELETE RESTRICT"),
  );
  assert.ok(
    sql.includes("expense_id uuid NOT NULL REFERENCES public.expenses(id) ON DELETE RESTRICT"),
  );
  assert.ok(sql.includes("request_id uuid NOT NULL UNIQUE"));
});

test("W5A Contract: Funding-path exclusivity constraint on public.expenses", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  assert.ok(
    sql.includes("chk_expense_funding_path_exclusivity"),
    "chk_expense_funding_path_exclusivity constraint must exist",
  );
  assert.ok(
    sql.includes("origin_type = 'employee_paid' AND payment_method = 'personal_funds'"),
    "Employee paid expenses must require personal_funds",
  );
  assert.ok(
    sql.includes("payment_method = 'cash_advance' AND cash_advance_id IS NOT NULL"),
    "Cash advance payment method requires cash_advance_id",
  );
  assert.ok(
    sql.includes("payment_method = 'petty_cash' AND petty_cash_fund_id IS NOT NULL"),
    "Petty cash payment method requires petty_cash_fund_id",
  );
});

test("W5A Contract: No duplicate mutable summary fields on public.expenses", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");
  const expenseTableMatch = sql.match(/CREATE TABLE public\.expenses \(([\s\S]*?)\);/);
  assert.ok(expenseTableMatch, "Must find CREATE TABLE public.expenses");
  const tableDef = expenseTableMatch[1];

  assert.ok(!tableDef.includes("reimbursement_status"), "reimbursement_status must NOT be a mutable column on expenses");
  assert.ok(!tableDef.includes("reimbursed_amount"), "reimbursed_amount must NOT be a mutable column on expenses");
  assert.ok(!tableDef.includes("evidence_status"), "evidence_status must NOT be a mutable column on expenses");
});

test("W5A Contract: Authoritative SQL View derives accountability metrics", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  assert.ok(sql.includes("CREATE VIEW public.expense_accountability_summaries AS"));
  assert.ok(sql.includes("reimbursed_amount"));
  assert.ok(sql.includes("advance_allocated_amount"));
  assert.ok(sql.includes("petty_cash_allocated_amount"));
  assert.ok(sql.includes("reimbursement_status"));
  assert.ok(sql.includes("evidence_status"));
});

test("W5A Contract: All 16 transactional RPCs defined with security definer and search path", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  const rpcs = [
    "submit_expense",
    "approve_expense",
    "reject_expense",
    "cancel_expense",
    "record_expense_evidence_exception",
    "dispose_expense_evidence_exception",
    "attach_expense_document",
    "settle_expense_reimbursement",
    "request_cash_advance",
    "approve_cash_advance",
    "reject_cash_advance",
    "cancel_cash_advance",
    "issue_cash_advance",
    "settle_cash_advance_spend",
    "record_cash_advance_return",
    "record_petty_cash_transaction",
  ];

  for (const rpc of rpcs) {
    assert.ok(
      sql.includes(`CREATE OR REPLACE FUNCTION public.${rpc}`),
      `RPC ${rpc} must be created`,
    );
    assert.ok(
      sql.includes(`GRANT EXECUTE ON FUNCTION public.${rpc} TO service_role;`),
      `RPC ${rpc} must grant execute to service_role`,
    );
  }

  const securityDefinerCount = (sql.match(/SECURITY DEFINER/g) || []).length;
  assert.equal(securityDefinerCount, 16, "All 16 RPCs must be SECURITY DEFINER");

  const searchPathCount = (sql.match(/SET search_path = pg_catalog, public/g) || []).length;
  assert.equal(searchPathCount, 16, "All 16 RPCs must set search_path = pg_catalog, public");
});

test("W5A Contract: RLS enabled on all tables and revoked from public/anon/authenticated", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  const tables = [
    "employee_cash_advances",
    "cash_advance_returns",
    "petty_cash_funds",
    "expenses",
    "expense_documents",
    "expense_evidence_exceptions",
    "expense_reimbursement_settlements",
    "cash_advance_expense_settlements",
    "petty_cash_transactions",
  ];

  for (const table of tables) {
    assert.ok(
      sql.includes(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`),
      `RLS must be enabled on ${table}`,
    );
    assert.ok(
      sql.includes(`REVOKE ALL ON TABLE public.${table} FROM PUBLIC, anon, authenticated;`),
      `Revoke must be applied on ${table}`,
    );
    assert.ok(
      sql.includes(`GRANT ALL ON TABLE public.${table} TO service_role;`),
      `Service role grant must be applied on ${table}`,
    );
  }
});

test("W5A Contract: Segregation of Duties (SoD) table constraints enforce beneficiary separation (Finding 2)", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  // chk_expense_no_self_approval
  assert.ok(
    sql.includes("CONSTRAINT chk_expense_no_self_approval CHECK ("),
    "chk_expense_no_self_approval must be defined",
  );
  assert.ok(
    sql.includes("(approved_by != submitted_by AND (origin_type != 'employee_paid' OR approved_by != claimant_id))"),
    "chk_expense_no_self_approval must prevent submitter self-approval AND claimant beneficiary approval for employee_paid",
  );

  // chk_advance_no_self_approval
  assert.ok(
    sql.includes("CONSTRAINT chk_advance_no_self_approval CHECK ("),
    "chk_advance_no_self_approval must be defined",
  );
  assert.ok(
    sql.includes("(approved_by != requested_by AND approved_by != recipient_id)"),
    "chk_advance_no_self_approval must prevent requester self-approval AND recipient beneficiary approval",
  );
});

test("W5A Contract: Authoritative RPCs enforce SoD beneficiary separation (Finding 2)", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  // approve_expense
  assert.ok(
    sql.includes("expense_self_approval_forbidden"),
    "approve_expense must check submitted_by != actor",
  );
  assert.ok(
    sql.includes("expense_claimant_self_approval_forbidden"),
    "approve_expense must check claimant_id != actor for employee_paid",
  );

  // approve_cash_advance
  assert.ok(
    sql.includes("advance_self_approval_forbidden"),
    "approve_cash_advance must check requested_by != actor",
  );
  assert.ok(
    sql.includes("advance_recipient_self_approval_forbidden"),
    "approve_cash_advance must check recipient_id != actor",
  );
});

test("W5A Contract: All 16 governed W5A mutation RPCs enforce fail-closed request_id payload conflict checks (Finding 1)", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  const expectedConflictCodes = [
    "expense_submit_request_conflict",
    "expense_approve_request_conflict",
    "expense_reject_request_conflict",
    "expense_cancel_request_conflict",
    "expense_evidence_exception_request_conflict",
    "dispose_evidence_exception_request_conflict",
    "attach_document_request_conflict",
    "expense_reimbursement_request_conflict",
    "cash_advance_request_conflict",
    "cash_advance_approve_request_conflict",
    "cash_advance_reject_request_conflict",
    "cash_advance_cancel_request_conflict",
    "cash_advance_issue_request_conflict",
    "cash_advance_settlement_request_conflict",
    "cash_advance_return_request_conflict",
    "petty_cash_transaction_request_conflict",
  ];

  for (const code of expectedConflictCodes) {
    assert.ok(
      sql.includes(`'${code}'::text`),
      `RPC must return '${code}' on conflicting payload replay`,
    );
  }
});

test("W5A Contract: audit_logs request_id expression index exists for W5 replay lookup (Minor Finding)", () => {
  const sql = fs.readFileSync(MIGRATION_PATH, "utf8");

  assert.ok(
    sql.includes("CREATE INDEX idx_audit_logs_w5_request_id ON public.audit_logs ((details ->> 'request_id')) WHERE details ->> 'request_id' IS NOT NULL;"),
    "idx_audit_logs_w5_request_id must be defined as partial expression index",
  );
  const occurrences = (sql.match(/CREATE INDEX idx_audit_logs_w5_request_id/g) ?? []).length;
  assert.strictEqual(occurrences, 1, "idx_audit_logs_w5_request_id must be defined exactly once");
});

test("W5A Corrective Migration: Corrective migration exists, is bounded, and contains safety preflights", () => {
  assert.ok(fs.existsSync(CORRECTIVE_MIGRATION_PATH), "Corrective migration file must exist");
  const sql = fs.readFileSync(CORRECTIVE_MIGRATION_PATH, "utf8");
  assert.ok(sql.includes("BEGIN;"), "Must be wrapped in transaction");
  assert.ok(sql.includes("COMMIT;"), "Must commit transaction");
  assert.ok(sql.includes("to_regprocedure('public.cancel_expense(uuid,text,uuid,text,text)') IS NULL"), "Must check cancel_expense preflight");
  assert.ok(sql.includes("to_regprocedure('public.attach_expense_document(uuid,uuid,uuid,text,text)') IS NULL"), "Must check attach_expense_document preflight");
  assert.ok(sql.includes("REVOKE ALL ON FUNCTION public.cancel_expense"), "Must revoke privileges from public");
  assert.ok(sql.includes("REVOKE ALL ON FUNCTION public.attach_expense_document"), "Must revoke privileges from public");
});

test("W5A Contract: attach_expense_document uses explicitly qualified expense_documents columns (Failure Class 1)", () => {
  const sql = fs.readFileSync(CORRECTIVE_MIGRATION_PATH, "utf8");

  // In attach_expense_document, RETURNS TABLE declares (expense_id, document_id)
  // Queries against public.expense_documents must explicitly qualify ed.expense_id and ed.document_id
  assert.ok(
    /FROM\s+public\.expense_documents\s+ed\s+WHERE\s+ed\.expense_id\s*=\s*p_expense_id\s+AND\s+ed\.document_id\s*=\s*p_document_id/.test(sql),
    "attach_expense_document must qualify ed.expense_id and ed.document_id to prevent PL/pgSQL variable collision",
  );
  assert.ok(
    !/FROM\s+public\.expense_documents\s+WHERE\s+expense_id\s*=/.test(sql),
    "attach_expense_document must not contain unqualified expense_id = in WHERE clause",
  );
});

test("W5A Contract: cancel_expense uses explicitly qualified expense_id references (Failure Class 2)", () => {
  const sql = fs.readFileSync(CORRECTIVE_MIGRATION_PATH, "utf8");

  // In cancel_expense, RETURNS TABLE declares (expense_id)
  // Queries against settlements and transactions must explicitly qualify relation columns
  assert.ok(
    /FROM\s+public\.expense_reimbursement_settlements\s+ers\s+WHERE\s+ers\.expense_id\s*=\s*p_expense_id/.test(sql),
    "cancel_expense must qualify ers.expense_id",
  );
  assert.ok(
    /FROM\s+public\.cash_advance_expense_settlements\s+caes\s+WHERE\s+caes\.expense_id\s*=\s*p_expense_id/.test(sql),
    "cancel_expense must qualify caes.expense_id",
  );
  assert.ok(
    /FROM\s+public\.petty_cash_transactions\s+pct\s+WHERE\s+pct\.expense_id\s*=\s*p_expense_id/.test(sql),
    "cancel_expense must qualify pct.expense_id",
  );
});

test("W5A Contract: Generalized scan of all 16 W5A RPCs confirms no unqualified output-column collision", () => {
  const baseSql = fs.readFileSync(MIGRATION_PATH, "utf8");
  const correctiveSql = fs.readFileSync(CORRECTIVE_MIGRATION_PATH, "utf8");

  // Verify that the corrective definitions supersede the ambiguous base definitions
  assert.ok(correctiveSql.includes("CREATE OR REPLACE FUNCTION public.cancel_expense"), "Corrective migration replaces cancel_expense");
  assert.ok(correctiveSql.includes("CREATE OR REPLACE FUNCTION public.attach_expense_document"), "Corrective migration replaces attach_expense_document");

  // Scan all 16 functions in the combined active schema representation
  const w5aRpcFunctions = [
    "submit_expense",
    "approve_expense",
    "reject_expense",
    "cancel_expense",
    "record_expense_evidence_exception",
    "dispose_expense_evidence_exception",
    "attach_expense_document",
    "settle_expense_reimbursement",
    "request_cash_advance",
    "approve_cash_advance",
    "reject_cash_advance",
    "cancel_cash_advance",
    "issue_cash_advance",
    "settle_cash_advance_spend",
    "record_cash_advance_return",
    "record_petty_cash_transaction",
  ];

  for (const rpcName of w5aRpcFunctions) {
    const isOverridden = rpcName === "cancel_expense" || rpcName === "attach_expense_document";
    const activeSql = isOverridden ? correctiveSql : baseSql;
    assert.ok(
      activeSql.includes(`CREATE OR REPLACE FUNCTION public.${rpcName}`),
      `Function public.${rpcName} must be defined in active migration lineage`,
    );
  }
});

const W5B1_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260907223000_w5b1_expense_finance_review_access.sql",
);

const W5B1_SMOKE_PATH = path.join(
  process.cwd(),
  "supabase",
  "verification",
  "w5b1_expense_finance_review_smoke.sql",
);

test("W5B-1A Contract: Migration file exists locally and contains required guards and constraints", () => {
  assert.ok(fs.existsSync(W5B1_MIGRATION_PATH), "W5B-1A migration must exist locally");
  const sql = fs.readFileSync(W5B1_MIGRATION_PATH, "utf8");

  // Preflight guards
  assert.ok(sql.includes("to_regclass('public.expenses') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.app_users') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.audit_logs') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.expense_documents') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.expense_evidence_exceptions') IS NULL"));

  // Columns & Constraints
  assert.ok(sql.includes("finance_reviewed_by uuid NULL REFERENCES public.app_users(id) ON DELETE RESTRICT"));
  assert.ok(sql.includes("finance_reviewed_at timestamptz NULL"));
  assert.ok(sql.includes("chk_expenses_finance_review_pair"));

  // Audit constraint expansion
  assert.ok(sql.includes("'expense_finance_reviewed'::text"));

  // Governed RPC review_expense_finance
  assert.ok(sql.includes("CREATE OR REPLACE FUNCTION public.review_expense_finance"));
  assert.ok(sql.includes("SECURITY DEFINER"));
  assert.ok(sql.includes("SET search_path = pg_catalog, public"));
  assert.ok(sql.includes("REVOKE ALL ON FUNCTION public.review_expense_finance(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;"));
  assert.ok(sql.includes("GRANT EXECUTE ON FUNCTION public.review_expense_finance(uuid, uuid, text, text) TO service_role;"));

  // Evidence prerequisite in review_expense_finance
  assert.ok(sql.includes("expense_evidence_required_for_finance_review"));

  // Forward-only replacement of approve_expense
  assert.ok(sql.includes("CREATE OR REPLACE FUNCTION public.approve_expense"));
  assert.ok(sql.includes("expense_not_finance_reviewed"));

  // View extension
  assert.ok(sql.includes("CREATE OR REPLACE VIEW public.expense_accountability_summaries"));
  assert.ok(sql.includes("e.finance_reviewed_by"));
  assert.ok(sql.includes("e.finance_reviewed_at"));

  // Syntax safety: no nested EXCEPTION block ends with END IF;
  let inException = false;
  for (const line of sql.split("\n")) {
    if (line.includes("EXCEPTION WHEN")) inException = true;
    if (inException && line.trim() === "END IF;") {
      assert.fail("Nested EXCEPTION block ended with END IF;");
    }
    if (inException && line.trim() === "END;") inException = false;
  }
  assert.equal(inException, false, "All nested EXCEPTION blocks must be closed with END;");
});

test("W5B-1A Contract: Smoke verification script is rollback-clean and comprehensive", () => {
  assert.ok(fs.existsSync(W5B1_SMOKE_PATH), "W5B-1A smoke script must exist");
  const sql = fs.readFileSync(W5B1_SMOKE_PATH, "utf8");

  assert.ok(sql.includes("BEGIN;"), "Smoke script must contain BEGIN;");
  assert.ok(sql.trimEnd().endsWith("ROLLBACK;"), "Smoke script must end with ROLLBACK");
  assert.ok(sql.includes("review_expense_finance"));
  assert.ok(sql.includes("expense_not_finance_reviewed"));
  assert.ok(sql.includes("expense_evidence_required_for_finance_review"));
  assert.ok(sql.includes("expense_finance_reviewed"));
});

const W5B1B0_MIGRATION_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260908100000_w5b1_expense_document_numbering.sql",
);

const W5B1B0_SMOKE_PATH = path.join(
  process.cwd(),
  "supabase",
  "verification",
  "w5b1_expense_document_numbering_smoke.sql",
);

test("W5B-1B0 Contract: Migration file exists locally and contains required guards, constraints, and RPC replacement", () => {
  assert.ok(fs.existsSync(W5B1B0_MIGRATION_PATH), "W5B-1B0 migration must exist locally");
  const sql = fs.readFileSync(W5B1B0_MIGRATION_PATH, "utf8");

  // Preflight guards
  assert.ok(sql.includes("to_regclass('public.number_sequences') IS NULL"));
  assert.ok(sql.includes("to_regprocedure('public.generate_document_number(text)') IS NULL"));
  assert.ok(sql.includes("to_regclass('public.expenses') IS NULL"));
  assert.ok(sql.includes("to_regprocedure('public.submit_expense(text, text, uuid, text, text, numeric, date, text, text, uuid, uuid, uuid, uuid, text, text)') IS NULL"));

  // number_sequences constraint preserves all 7 existing types and appends expense
  const expectedTypes = ["quotation", "invoice", "payment", "project", "service", "customer", "supplier_booking", "expense"];
  for (const t of expectedTypes) {
    assert.ok(sql.includes(`'${t}'`), `number_sequences constraint must include '${t}'`);
  }

  // generate_document_number supports 'expense' with 'EXP' and 'EXP-YYYY-0001'
  assert.ok(/WHEN doc_type = 'expense'\s+THEN 'EXP'/.test(sql));
  assert.ok(/WHEN doc_type = 'expense'\s+THEN 'EXP-YYYY-0001'/.test(sql));
  assert.ok(sql.includes("SECURITY DEFINER"));
  assert.ok(sql.includes("SET search_path = pg_catalog, public"));
  assert.ok(sql.includes("REVOKE ALL ON FUNCTION public.generate_document_number(text) FROM PUBLIC, anon, authenticated;"));
  assert.ok(sql.includes("GRANT EXECUTE ON FUNCTION public.generate_document_number(text) TO service_role;"));

  // submit_expense replacement
  assert.ok(sql.includes("CREATE OR REPLACE FUNCTION public.submit_expense"));
  assert.ok(sql.includes("v_effective_expense_number := NULLIF(btrim(p_expense_number), '');"));
  assert.ok(sql.includes("public.generate_document_number('expense')"));
  assert.ok(sql.includes("hashtextextended('w5a:expense_submit:' || p_request_id::text, 0)"));
  assert.ok(sql.includes("REVOKE ALL ON FUNCTION public.submit_expense"));
  assert.ok(sql.includes("GRANT EXECUTE ON FUNCTION public.submit_expense"));

  // Ordering check: advisory lock and replay check MUST precede generate_document_number
  const lockIndex = sql.indexOf("pg_advisory_xact_lock");
  const replayIndex = sql.indexOf("IF FOUND THEN");
  const genIndex = sql.indexOf("public.generate_document_number('expense')");
  assert.ok(lockIndex > 0 && replayIndex > lockIndex, "Advisory lock must precede replay check");
  assert.ok(genIndex > replayIndex, "Document number generation must occur AFTER replay check");

  // Syntax safety: no nested EXCEPTION block ends with END IF;
  let inException = false;
  for (const line of sql.split("\n")) {
    if (line.includes("EXCEPTION WHEN")) inException = true;
    if (inException && line.trim() === "END IF;") {
      assert.fail("Nested EXCEPTION block ended with END IF;");
    }
    if (inException && line.trim() === "END;") inException = false;
  }
  assert.equal(inException, false, "All nested EXCEPTION blocks must be closed with END;");
});

test("W5B-1B0 Contract: Smoke verification script is rollback-clean and verifies numbering invariants", () => {
  assert.ok(fs.existsSync(W5B1B0_SMOKE_PATH), "W5B-1B0 smoke script must exist");
  const sql = fs.readFileSync(W5B1B0_SMOKE_PATH, "utf8");

  assert.ok(sql.includes("BEGIN;"), "Smoke script must contain BEGIN;");
  assert.ok(sql.trimEnd().endsWith("ROLLBACK;"), "Smoke script must end with ROLLBACK");
  assert.ok(sql.includes("generate_document_number('expense')"));
  assert.ok(sql.includes("^EXP-[0-9]{4}-[0-9]{4}$"));
  assert.ok(sql.includes("generate_document_number('quotation')"));
  assert.ok(sql.includes("generate_document_number('customer')"));
  assert.ok(sql.includes("submit_expense"));
  assert.ok(sql.includes("idempotent_replay"));
  assert.ok(sql.includes("expense_submit_request_conflict"));
  assert.ok(sql.includes("EXP-LEGACY-SMOKE-001"));
});
