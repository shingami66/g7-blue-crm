import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const MIGRATION_PATH = join(
  REPO_ROOT,
  "supabase/migrations/20260912100000_w5b3_expense_self_approval_authority_repair.sql",
);
const PAGE_PATH = join(REPO_ROOT, "src/app/(dashboard)/expenses/page.tsx");
const CLIENT_PATH = join(REPO_ROOT, "src/app/(dashboard)/expenses/ExpensesClient.tsx");
const ACTIONS_COMPONENT_PATH = join(
  REPO_ROOT,
  "src/app/(dashboard)/expenses/ExpenseWorkspaceActions.tsx",
);
const SERVER_ACTIONS_PATH = join(REPO_ROOT, "src/lib/expenses/actions.ts");

function read(path: string): string {
  return readFileSync(path, "utf8");
}

test("Corrective migration replaces only the Expense self-approval boundary", () => {
  const sql = read(MIGRATION_PATH);

  for (const required of [
    "DROP CONSTRAINT IF EXISTS chk_expense_no_self_approval",
    "CREATE OR REPLACE FUNCTION public.enforce_expense_approval_authority()",
    "current_setting('g7.expense_actor_role', true)",
    "CREATE TRIGGER enforce_expense_approval_authority_trg",
    "COALESCE(v_actor_role, '') NOT IN ('admin', 'accountant', 'manager')",
    "COALESCE(p_actor_role, '') NOT IN ('admin', 'accountant', 'manager')",
    "pg_catalog.set_config('g7.expense_actor_role', COALESCE(p_actor_role, ''), true)",
    "SECURITY DEFINER",
    "SET search_path = pg_catalog, public",
    "REVOKE ALL ON FUNCTION public.approve_expense(uuid, uuid, text, text)",
    "GRANT EXECUTE ON FUNCTION public.approve_expense(uuid, uuid, text, text) TO service_role",
  ]) {
    assert.ok(sql.includes(required), `Migration must contain ${required}`);
  }

  assert.ok(sql.includes("public.approve_expense(\n    p_expense_id uuid,\n    p_request_id uuid,\n    p_actor_id text,\n    p_actor_role text"));
  assert.equal(sql.includes("CREATE OR REPLACE FUNCTION public.reject_expense"), false);
  assert.equal(sql.includes("CREATE OR REPLACE FUNCTION public.review_expense_finance"), false);
  assert.equal(sql.includes("CREATE OR REPLACE FUNCTION public.submit_expense"), false);
  assert.equal(sql.includes("CASH_ADVANCE_PERMISSIONS"), false);
});

test("Approval migration preserves the Finance Review and idempotency gates", () => {
  const sql = read(MIGRATION_PATH);
  const setConfigIndex = sql.indexOf("pg_catalog.set_config('g7.expense_actor_role'");
  const updateIndex = sql.indexOf("UPDATE public.expenses");

  assert.ok(sql.includes("v_finance_reviewed_at IS NULL OR v_finance_reviewed_by IS NULL"));
  assert.ok(sql.includes("expense_not_finance_reviewed"));
  assert.ok(sql.includes("pg_advisory_xact_lock(hashtextextended('w5a:expense_approve:'"));
  assert.ok(sql.includes("expense_approve_request_conflict"));
  assert.ok(sql.includes("FOR UPDATE"));
  assert.ok(sql.includes("'expense_approved'"));
  assert.ok(setConfigIndex > sql.indexOf("expense_not_finance_reviewed"));
  assert.ok(updateIndex > setConfigIndex);
});

test("Expenses server computes final row capabilities and the client renders only supplied actions", () => {
  const page = read(PAGE_PATH);
  const client = read(CLIENT_PATH);
  const actions = read(ACTIONS_COMPONENT_PATH);
  const serverActions = read(SERVER_ACTIONS_PATH);

  assert.ok(page.includes("getCurrentAppUser"));
  assert.ok(page.includes("buildExpenseRowCapabilities"));
  assert.ok(page.includes("expense.submitted_by !== currentUser?.id"));
  assert.ok(page.includes("rowCapabilities={rowCapabilities}"));
  assert.ok(client.includes("rowCapabilities[exp.id] ?? EMPTY_ROW_CAPABILITIES"));
  assert.ok(actions.includes("capabilities.canApprove"));
  assert.ok(actions.includes("capabilities.canReject"));
  assert.equal(actions.includes("canApproveExpense && expense.status"), false);
  assert.ok(serverActions.includes("requirePermission(EXPENSE_PERMISSIONS.approve)"));
  assert.ok(serverActions.includes("requirePermission(EXPENSE_PERMISSIONS.financeReview)"));
});

test("Known-invalid self rejection is absent while self approval remains role-capable", () => {
  const page = read(PAGE_PATH);
  const actions = read(ACTIONS_COMPONENT_PATH);

  assert.ok(page.includes("canRejectThisRow"));
  assert.ok(page.includes("canApproveThisRow"));
  assert.ok(actions.includes("{canReject && ("));
  assert.equal(actions.includes("{canApprove && (\n          <>"), false);
});
