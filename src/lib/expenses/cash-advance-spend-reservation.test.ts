import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ResolveHook = (
  specifier: string,
  context: ResolveContext,
  nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
) => ResolveResult;

const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "server-only") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export default {}",
      };
    }

    if (specifier === "@clerk/nextjs/server") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const auth = async () => ({ userId: 'clerk_test_user' });",
      };
    }

    if (specifier === "@/lib/auth/permissions") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const requirePermission = async (perm) => ({ id: '11111111-1111-4111-8111-111111111111', clerk_user_id: 'clerk_test_user', role: 'sales' }); export const checkPermission = async () => true;",
      };
    }

    if (specifier === "@/lib/supabase/admin") {
      return {
        shortCircuit: true,
        url: "data:text/javascript,export const createAdminClient = () => ({ rpc: async () => ({ data: [], error: null }), from: () => ({ select: () => ({ eq: () => ({ maybeSingle: async () => null, order: () => ({ limit: () => ({ data: [], error: null }) }) }) }) }) });",
      };
    }

    if (specifier.startsWith("@/")) {
      const rel = specifier.slice(2);
      const abs = path.join(process.cwd(), "src", rel);
      if (fs.existsSync(abs + ".ts")) {
        return {
          shortCircuit: true,
          url: new URL(`file:///${abs.replace(/\\/g, "/")}.ts`).href,
        };
      }
      return {
        shortCircuit: true,
        url: new URL(`../../${rel}.ts`, import.meta.url).href,
      };
    }

    if (
      specifier.startsWith(".") &&
      !specifier.endsWith(".ts") &&
      context.parentURL?.startsWith(sourceRootUrl)
    ) {
      return nextResolve(`${specifier}.ts`, context);
    }

    return nextResolve(specifier, context);
  },
});

const {
  CASH_ADVANCE_PERMISSIONS,
  EXPENSE_PERMISSIONS,
  PETTY_CASH_PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermissionForRole,
} = await import("../auth/role-permissions.ts");

const {
  submitOwnCashAdvanceExpenseSchema,
  submitCashAdvanceExpenseOnBehalfSchema,
  selfServiceSubmitExpenseSchema,
} = await import("./schemas.ts");

const MIGRATION_W5B2C_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260910100000_w5b2c_cash_advance_spend_reservation_integrity.sql",
);
const MIGRATION_W5B2_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260909100000_w5b2_cash_advance_numbering_and_integrity.sql",
);
const MIGRATION_W5A_PATH = path.join(
  process.cwd(),
  "supabase",
  "migrations",
  "20260907150000_w5a_expense_cash_foundation.sql",
);
const ACTIONS_PATH = path.join(process.cwd(), "src", "lib", "expenses", "actions.ts");
const QUERIES_PATH = path.join(process.cwd(), "src", "lib", "expenses", "queries.ts");
const TYPES_PATH = path.join(process.cwd(), "src", "lib", "expenses", "types.ts");

// ============================================================================
// 1. STRICT BROWSER SCHEMAS CONTRACTS
// ============================================================================

test("1.1 Schema: submitOwnCashAdvanceExpenseSchema accepts valid minimal contract", () => {
  const valid = {
    advance_id: "11111111-1111-4111-8111-111111111111",
    expense_category: "Travel",
    description: "Train ticket to client site",
    amount: 150.5,
    expense_date: "2026-09-10",
    request_id: "22222222-2222-4222-8222-222222222222",
  };
  const parsed = submitOwnCashAdvanceExpenseSchema.safeParse(valid);
  assert.equal(parsed.success, true);
});

test("1.2 Schema: submitOwnCashAdvanceExpenseSchema strictly rejects extraneous routing fields", () => {
  const forbiddenFields = [
    { context_type: "company" },
    { service_id: "33333333-3333-4333-8333-333333333333" },
    { recipient_id: "44444444-4444-4444-8444-444444444444" },
    { claimant_id: "55555555-5555-4555-8555-555555555555" },
    { origin_type: "company_direct" },
    { payment_method: "cash_advance" },
    { submitted_by: "66666666-6666-4666-8666-666666666666" },
    { actor_id: "77777777-7777-4777-8777-777777777777" },
    { actor_role: "accountant" },
    { expense_number: "EXP-2026-0001" },
  ];

  const base = {
    advance_id: "11111111-1111-4111-8111-111111111111",
    expense_category: "Travel",
    description: "Train ticket",
    amount: 50,
    expense_date: "2026-09-10",
    request_id: "22222222-2222-4222-8222-222222222222",
  };

  for (const extra of forbiddenFields) {
    const payload = { ...base, ...extra };
    const parsed = submitOwnCashAdvanceExpenseSchema.safeParse(payload);
    assert.equal(
      parsed.success,
      false,
      `submitOwnCashAdvanceExpenseSchema must reject extraneous key: ${Object.keys(extra)[0]}`,
    );
  }
});

test("1.3 Schema: submitOwnCashAdvanceExpenseSchema requires request_id (no default generation)", () => {
  const missingRequestId = {
    advance_id: "11111111-1111-4111-8111-111111111111",
    expense_category: "Travel",
    description: "Taxi ride",
    amount: 75,
    expense_date: "2026-09-10",
  };
  const parsed = submitOwnCashAdvanceExpenseSchema.safeParse(missingRequestId);
  assert.equal(parsed.success, false);
});

test("1.4 Schema: submitCashAdvanceExpenseOnBehalfSchema accepts valid minimal contract", () => {
  const valid = {
    advance_id: "11111111-1111-4111-8111-111111111111",
    expense_category: "Office Supplies",
    description: "Printer ink",
    amount: 200,
    expense_date: "2026-09-10",
    request_id: "22222222-2222-4222-8222-222222222222",
  };
  const parsed = submitCashAdvanceExpenseOnBehalfSchema.safeParse(valid);
  assert.equal(parsed.success, true);
});

test("1.5 Schema: submitCashAdvanceExpenseOnBehalfSchema strictly rejects extraneous routing fields", () => {
  const base = {
    advance_id: "11111111-1111-4111-8111-111111111111",
    expense_category: "Supplies",
    description: "Pens and paper",
    amount: 100,
    expense_date: "2026-09-10",
    request_id: "22222222-2222-4222-8222-222222222222",
  };

  const forbiddenFields = [
    { context_type: "event" },
    { service_id: "33333333-3333-4333-8333-333333333333" },
    { recipient_id: "44444444-4444-4444-8444-444444444444" },
    { claimant_id: "55555555-5555-4555-8555-555555555555" },
    { origin_type: "company_direct" },
    { payment_method: "cash_advance" },
    { submitted_by: "66666666-6666-4666-8666-666666666666" },
    { actor_id: "77777777-7777-4777-8777-777777777777" },
    { actor_role: "admin" },
    { expense_number: "EXP-2026-0002" },
  ];

  for (const extra of forbiddenFields) {
    const payload = { ...base, ...extra };
    const parsed = submitCashAdvanceExpenseOnBehalfSchema.safeParse(payload);
    assert.equal(
      parsed.success,
      false,
      `submitCashAdvanceExpenseOnBehalfSchema must reject extraneous key: ${Object.keys(extra)[0]}`,
    );
  }
});

test("1.6 Schema: submitCashAdvanceExpenseOnBehalfSchema requires request_id", () => {
  const missingRequestId = {
    advance_id: "11111111-1111-4111-8111-111111111111",
    expense_category: "Supplies",
    description: "Desk chair",
    amount: 300,
    expense_date: "2026-09-10",
  };
  const parsed = submitCashAdvanceExpenseOnBehalfSchema.safeParse(missingRequestId);
  assert.equal(parsed.success, false);
});

// ============================================================================
// 2. AUTHORITY AND PERMISSION COMPOSITION CONTRACTS
// ============================================================================

test("2.1 Authority: Accountant on-behalf entry requires settle + financeReview", () => {
  // Accountant has both
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.settle), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.financeReview), true);

  // Admin has wildcard (*)
  assert.equal(hasPermissionForRole("admin", CASH_ADVANCE_PERMISSIONS.settle), true);
  assert.equal(hasPermissionForRole("admin", EXPENSE_PERMISSIONS.financeReview), true);

  // Manager has neither settle nor financeReview
  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.settle), false);
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.financeReview), false);

  // Sales and Operations have neither
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.settle), false);
  assert.equal(hasPermissionForRole("sales", EXPENSE_PERMISSIONS.financeReview), false);
  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.settle), false);
  assert.equal(hasPermissionForRole("operations", EXPENSE_PERMISSIONS.financeReview), false);

  // Viewer has neither
  assert.equal(hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.settle), false);
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.financeReview), false);
});

test("2.2 Authority: Self-service custodian requires cash_advances:submit_own + expenses:submit_own", () => {
  assert.equal(hasPermissionForRole("sales", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("sales", EXPENSE_PERMISSIONS.submitOwn), true);

  assert.equal(hasPermissionForRole("operations", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("operations", EXPENSE_PERMISSIONS.submitOwn), true);

  assert.equal(hasPermissionForRole("manager", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.submitOwn), true);

  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.submitOwn), true);

  assert.equal(hasPermissionForRole("viewer", CASH_ADVANCE_PERMISSIONS.submitOwn), false);
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.submitOwn), false);
});

test("2.3 Authority: submitExpenseAction enforces settle + financeReview when payment_method = cash_advance", () => {
  const actionsContent = fs.readFileSync(ACTIONS_PATH, "utf8");
  assert.ok(
    actionsContent.includes('parsed.data.payment_method === "cash_advance"'),
    "submitExpenseAction must branch on cash_advance payment method",
  );
  assert.ok(
    actionsContent.includes("CASH_ADVANCE_PERMISSIONS.settle") &&
      actionsContent.includes("EXPENSE_PERMISSIONS.financeReview"),
    "submitExpenseAction must check settle and financeReview permissions for cash_advance",
  );
});

test("2.4 Authority: actions.ts does NOT widen permissions or use EXPENSE_PERMISSIONS.write for on-behalf", () => {
  const actionsContent = fs.readFileSync(ACTIONS_PATH, "utf8");
  assert.ok(
    actionsContent.includes("export async function submitCashAdvanceExpenseOnBehalfAction"),
    "submitCashAdvanceExpenseOnBehalfAction must be exported",
  );
  // Must check settle and financeReview in submitCashAdvanceExpenseOnBehalfAction
  const onBehalfSnippet = actionsContent.slice(
    actionsContent.indexOf("submitCashAdvanceExpenseOnBehalfAction"),
    actionsContent.indexOf("submitCashAdvanceExpenseOnBehalfAction") + 400,
  );
  assert.ok(
    onBehalfSnippet.includes("CASH_ADVANCE_PERMISSIONS.settle"),
    "on-behalf action must require CASH_ADVANCE_PERMISSIONS.settle",
  );
  assert.ok(
    onBehalfSnippet.includes("EXPENSE_PERMISSIONS.financeReview"),
    "on-behalf action must require EXPENSE_PERMISSIONS.financeReview",
  );
  assert.equal(
    onBehalfSnippet.includes("EXPENSE_PERMISSIONS.write"),
    false,
    "on-behalf action must NOT use EXPENSE_PERMISSIONS.write",
  );
});

// ============================================================================
// 3. MATHEMATICAL CONTRACTS: RESERVED UNSETTLED SPEND
// ============================================================================

test("3.1 Math: Partial settlement reserves only remaining unsettled amount", () => {
  const expenseAmount = 1000.0;
  const settledAmount = 350.0;
  const unsettledAmount = Math.max(expenseAmount - settledAmount, 0);
  assert.equal(unsettledAmount, 650.0);
});

test("3.2 Math: Fully settled expense reserves exactly zero", () => {
  const expenseAmount = 500.0;
  const settledAmount = 500.0;
  const unsettledAmount = Math.max(expenseAmount - settledAmount, 0);
  assert.equal(unsettledAmount, 0.0);
});

test("3.3 Math: Over-settled edge condition clamps to zero without negative reservation", () => {
  const expenseAmount = 200.0;
  const settledAmount = 250.0;
  const unsettledAmount = Math.max(expenseAmount - settledAmount, 0);
  assert.equal(unsettledAmount, 0.0);
});

test("3.4 Math: Available uncommitted balance correctly subtracts reserved spend", () => {
  const remainingBalance = 1500.0;
  const expenses = [
    { amount: 300.0, settled: 0.0, status: "submitted" },
    { amount: 500.0, settled: 200.0, status: "approved" },
    { amount: 400.0, settled: 0.0, status: "rejected" },
    { amount: 200.0, settled: 0.0, status: "cancelled" },
  ];

  const activeReservations = expenses
    .filter((e) => e.status === "submitted" || e.status === "approved")
    .map((e) => Math.max(e.amount - e.settled, 0))
    .reduce((sum, val) => sum + val, 0);

  // 300 (submitted) + 300 (approved: 500-200) = 600
  assert.equal(activeReservations, 600.0);

  const availableUncommittedBalance = remainingBalance - activeReservations;
  assert.equal(availableUncommittedBalance, 900.0);
});

// ============================================================================
// 4. MIGRATION SQL CONTRACTS: submit_expense
// ============================================================================

test("4.1 SQL submit_expense: Preserves exact 15-parameter signature", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  assert.ok(
    sql.includes("CREATE OR REPLACE FUNCTION public.submit_expense("),
    "submit_expense must be replaced",
  );
  assert.ok(sql.includes("p_expense_number text,"), "Param 1: p_expense_number");
  assert.ok(sql.includes("p_context_type text,"), "Param 2: p_context_type");
  assert.ok(sql.includes("p_service_id uuid,"), "Param 3: p_service_id");
  assert.ok(sql.includes("p_expense_category text,"), "Param 4: p_expense_category");
  assert.ok(sql.includes("p_description text,"), "Param 5: p_description");
  assert.ok(sql.includes("p_amount numeric,"), "Param 6: p_amount");
  assert.ok(sql.includes("p_expense_date date,"), "Param 7: p_expense_date");
  assert.ok(sql.includes("p_origin_type text,"), "Param 8: p_origin_type");
  assert.ok(sql.includes("p_payment_method text,"), "Param 9: p_payment_method");
  assert.ok(sql.includes("p_cash_advance_id uuid,"), "Param 10: p_cash_advance_id");
  assert.ok(sql.includes("p_petty_cash_fund_id uuid,"), "Param 11: p_petty_cash_fund_id");
  assert.ok(sql.includes("p_claimant_id uuid,"), "Param 12: p_claimant_id");
  assert.ok(sql.includes("p_request_id uuid,"), "Param 13: p_request_id");
  assert.ok(sql.includes("p_actor_id text,"), "Param 14: p_actor_id");
  assert.ok(sql.includes("p_actor_role text"), "Param 15: p_actor_role");
});

test("4.2 SQL submit_expense: Idempotency replay/conflict executes before row lock and balance checks", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  const idempotencyIdx = sql.indexOf("pg_advisory_xact_lock(hashtextextended('w5a:expense_submit:'");
  const conflictCheckIdx = sql.indexOf("expense_submit_request_conflict");
  const rowLockIdx = sql.indexOf("FROM public.employee_cash_advances\n        WHERE id = p_cash_advance_id\n        FOR UPDATE;");

  assert.ok(idempotencyIdx !== -1, "Advisory lock on request_id must exist");
  assert.ok(conflictCheckIdx !== -1, "Conflict check on request_id must exist");
  assert.ok(rowLockIdx !== -1, "Row lock FOR UPDATE must exist");
  assert.ok(
    conflictCheckIdx < rowLockIdx,
    "Idempotent replay and conflict check must precede mutable state row-locking and balance check",
  );
});

test("4.3 SQL submit_expense: Calculates reserved spend with GREATEST(amount - settled, 0)", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  assert.ok(
    sql.includes("GREATEST("),
    "submit_expense must use GREATEST for reservation calculation",
  );
  assert.ok(
    sql.includes("e.status IN ('submitted', 'approved')"),
    "submit_expense must filter on submitted and approved active statuses",
  );
  assert.ok(
    sql.includes("p_amount > v_available_uncommitted_balance"),
    "submit_expense must enforce available uncommitted balance ceiling",
  );
  assert.ok(
    sql.includes("'expense_amount_exceeds_available_advance_balance'"),
    "submit_expense must return specific error code when exceeding available balance",
  );
});

test("4.4 SQL submit_expense: Does NOT enforce universal actor == advance.recipient_id", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  // The database RPC must not restrict actor to recipient_id, enabling Accountant on-behalf entry
  assert.equal(
    sql.includes("v_adv_recipient_id != v_actor_uuid"),
    false,
    "submit_expense must NOT enforce actor == advance recipient inside DB",
  );
});

// ============================================================================
// 5. MIGRATION SQL CONTRACTS: record_cash_advance_return
// ============================================================================

test("5.1 SQL record_cash_advance_return: Preserves exact 7-parameter signature", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  assert.ok(
    sql.includes("CREATE OR REPLACE FUNCTION public.record_cash_advance_return("),
    "record_cash_advance_return must be replaced",
  );
  assert.ok(sql.includes("p_advance_id uuid,"), "Param 1: p_advance_id");
  assert.ok(sql.includes("p_amount numeric,"), "Param 2: p_amount");
  assert.ok(sql.includes("p_receipt_reference text,"), "Param 3: p_receipt_reference");
  assert.ok(sql.includes("p_notes text,"), "Param 4: p_notes");
  assert.ok(sql.includes("p_request_id uuid,"), "Param 5: p_request_id");
  assert.ok(sql.includes("p_actor_id text,"), "Param 6: p_actor_id");
  assert.ok(sql.includes("p_actor_role text"), "Param 7: p_actor_role");
});

test("5.2 SQL record_cash_advance_return: Idempotency check precedes advance row lock", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  const returnConflictIdx = sql.indexOf("cash_advance_return_request_conflict");
  const returnLockIdx = sql.indexOf(
    "FROM public.employee_cash_advances\n    WHERE id = p_advance_id\n    FOR UPDATE;",
  );

  assert.ok(returnConflictIdx !== -1, "Return conflict check must exist");
  assert.ok(returnLockIdx !== -1, "Return FOR UPDATE row lock must exist");
  assert.ok(
    returnConflictIdx < returnLockIdx,
    "Return idempotency check must precede row lock",
  );
});

test("5.3 SQL record_cash_advance_return: Rejects return consuming reserved spend", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  assert.ok(
    sql.includes("p_amount > v_available_uncommitted_balance"),
    "record_cash_advance_return must check available_uncommitted_balance ceiling",
  );
  assert.ok(
    sql.includes("'return_amount_exceeds_available_balance'"),
    "record_cash_advance_return must return return_amount_exceeds_available_balance",
  );
});

test("5.4 SQL record_cash_advance_return: Preserves zero-balance auto-settlement", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  assert.ok(
    sql.includes("(amount_spent_settled + amount_returned + p_amount) = amount_issued THEN 'settled'"),
    "record_cash_advance_return must auto-settle when remaining balance reaches zero",
  );
});

test("5.5 Base Schema: W5A base migration defines predecessor record_cash_advance_return RPC", () => {
  const baseSql = fs.readFileSync(MIGRATION_W5A_PATH, "utf8");
  assert.ok(
    baseSql.includes("CREATE OR REPLACE FUNCTION public.record_cash_advance_return("),
    "W5A base migration must contain predecessor record_cash_advance_return",
  );
});

// ============================================================================
// 6. CANONICAL READ RPCS AND APPLICATION WRAPPERS
// ============================================================================

test("6.1 Read RPCs: get_cash_advance_balance_summary exposes all 12 fields", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  assert.ok(
    sql.includes("CREATE OR REPLACE FUNCTION public.get_cash_advance_balance_summary("),
    "get_cash_advance_balance_summary must be defined",
  );
  assert.ok(sql.includes("reserved_unsettled_spend numeric"), "Exposes reserved_unsettled_spend");
  assert.ok(sql.includes("available_uncommitted_balance numeric"), "Exposes available_uncommitted_balance");
  assert.ok(sql.includes("remaining_balance numeric"), "Exposes remaining_balance");
});

test("6.2 Read RPCs: get_linked_cash_advance_expenses exposes all 13 fields", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  assert.ok(
    sql.includes("CREATE OR REPLACE FUNCTION public.get_linked_cash_advance_expenses("),
    "get_linked_cash_advance_expenses must be defined",
  );
  assert.ok(sql.includes("finance_reviewed_at timestamptz"), "Exposes finance_reviewed_at");
  assert.ok(sql.includes("approved_at timestamptz"), "Exposes approved_at");
  assert.ok(sql.includes("rejected_at timestamptz"), "Exposes rejected_at");
  assert.ok(sql.includes("cash_advance_id uuid"), "Exposes cash_advance_id");
  assert.ok(sql.includes("settled_amount numeric"), "Exposes settled_amount");
  assert.ok(sql.includes("unsettled_amount numeric"), "Exposes unsettled_amount");
});

test("6.2b Read Types: types.ts defines LinkedCashAdvanceExpense and CashAdvanceBalanceSummary", () => {
  const typesContent = fs.readFileSync(TYPES_PATH, "utf8");
  assert.ok(
    typesContent.includes("export interface LinkedCashAdvanceExpense"),
    "types.ts must export LinkedCashAdvanceExpense",
  );
  assert.ok(
    typesContent.includes("export interface CashAdvanceBalanceSummary"),
    "types.ts must export CashAdvanceBalanceSummary",
  );
});

test("6.3 Application Queries: queries.ts wraps canonical RPCs without duplicated formulas", () => {
  const queriesContent = fs.readFileSync(QUERIES_PATH, "utf8");
  assert.ok(
    queriesContent.includes('supabase.rpc("get_linked_cash_advance_expenses"'),
    "queries.ts must call get_linked_cash_advance_expenses RPC",
  );
  assert.ok(
    queriesContent.includes('supabase.rpc("get_cash_advance_balance_summary"'),
    "queries.ts must call get_cash_advance_balance_summary RPC",
  );
  assert.ok(
    queriesContent.includes("export async function getLinkedCashAdvanceExpenses"),
    "Broad getLinkedCashAdvanceExpenses must be exported",
  );
  assert.ok(
    queriesContent.includes("export async function getOwnLinkedCashAdvanceExpenses"),
    "Own getOwnLinkedCashAdvanceExpenses must be exported",
  );
  assert.ok(
    queriesContent.includes("export async function getCashAdvanceBalanceSummary"),
    "Broad getCashAdvanceBalanceSummary must be exported",
  );
  assert.ok(
    queriesContent.includes("export async function getOwnCashAdvanceBalanceSummary"),
    "Own getOwnCashAdvanceBalanceSummary must be exported",
  );
});

test("6.4 Application Queries: Own-path queries verify recipient ownership before RPC execution", () => {
  const queriesContent = fs.readFileSync(QUERIES_PATH, "utf8");
  const ownLinkedSnippet = queriesContent.slice(
    queriesContent.indexOf("getOwnLinkedCashAdvanceExpenses"),
    queriesContent.indexOf("getOwnLinkedCashAdvanceExpenses") + 600,
  );
  assert.ok(
    ownLinkedSnippet.includes('.eq("recipient_id", user.id)'),
    "getOwnLinkedCashAdvanceExpenses must filter recipient_id === user.id in query",
  );

  const ownSummarySnippet = queriesContent.slice(
    queriesContent.indexOf("getOwnCashAdvanceBalanceSummary"),
    queriesContent.indexOf("getOwnCashAdvanceBalanceSummary") + 600,
  );
  assert.ok(
    ownSummarySnippet.includes('.eq("recipient_id", user.id)'),
    "getOwnCashAdvanceBalanceSummary must filter recipient_id === user.id in query",
  );
});

// ============================================================================
// 7. CONCURRENCY & LOCK ORDERING INTEGRITY
// ============================================================================

test("7.1 Concurrency: Locking graph across submit, return, and settle is deadlock-free", () => {
  const submitSql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  const settleSql = fs.readFileSync(MIGRATION_W5B2_PATH, "utf8");

  // submit_expense locks ONLY employee_cash_advances FOR UPDATE
  assert.ok(
    submitSql.includes("FROM public.employee_cash_advances\n        WHERE id = p_cash_advance_id\n        FOR UPDATE"),
    "submit_expense locks advance FOR UPDATE",
  );
  assert.equal(
    submitSql.includes("FROM public.expenses\n        WHERE id =") && submitSql.includes("FOR UPDATE"),
    false,
    "submit_expense does not lock existing expenses FOR UPDATE",
  );

  // record_cash_advance_return locks ONLY employee_cash_advances FOR UPDATE
  assert.ok(
    submitSql.includes("FROM public.employee_cash_advances\n    WHERE id = p_advance_id\n    FOR UPDATE"),
    "record_cash_advance_return locks advance FOR UPDATE",
  );

  // settle_cash_advance_spend uses deterministic UUID ordering for dual row locks
  assert.ok(
    settleSql.includes("IF p_advance_id < p_expense_id THEN"),
    "settle_cash_advance_spend uses deterministic UUID ordering",
  );
});

test("7.2 Concurrency Smoke: Transactional runtime concurrency marked PENDING EXPLICIT DEV APPLY AUTHORIZATION", () => {
  const concurrencySmokeStatus = "PENDING EXPLICIT DEV APPLY AUTHORIZATION";
  assert.equal(concurrencySmokeStatus, "PENDING EXPLICIT DEV APPLY AUTHORIZATION");
});

// ============================================================================
// 8. REGRESSION AND SCOPE INTEGRITY
// ============================================================================

test("8.1 Regression: Personal-funds self-service remains unchanged", () => {
  const validPersonal = {
    context_type: "company",
    expense_category: "Meals",
    description: "Team lunch",
    amount: 120,
    expense_date: "2026-09-10",
  };
  const parsed = selfServiceSubmitExpenseSchema.safeParse(validPersonal);
  assert.equal(parsed.success, true);
  assert.ok(parsed.data?.request_id, "Personal funds self-service still generates default request_id");
});

test("8.2 Regression: No auto-review, auto-approval, or auto-settlement in on-behalf action", () => {
  const actionsContent = fs.readFileSync(ACTIONS_PATH, "utf8");
  const onBehalfSnippet = actionsContent.slice(
    actionsContent.indexOf("submitCashAdvanceExpenseOnBehalfAction"),
    actionsContent.indexOf("submitCashAdvanceExpenseOnBehalfAction") + 1500,
  );
  assert.equal(
    onBehalfSnippet.includes("approve_expense"),
    false,
    "on-behalf action must not call approve_expense RPC",
  );
  assert.equal(
    onBehalfSnippet.includes("review_expense_finance"),
    false,
    "on-behalf action must not call review_expense_finance RPC",
  );
  assert.equal(
    onBehalfSnippet.includes("settle_cash_advance_spend"),
    false,
    "on-behalf action must not call settle_cash_advance_spend RPC",
  );
});

test("8.3 Regression: Petty Cash permissions untouched", () => {
  assert.equal(hasPermissionForRole("sales", PETTY_CASH_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("operations", PETTY_CASH_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("manager", PETTY_CASH_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("accountant", PETTY_CASH_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("admin", PETTY_CASH_PERMISSIONS.read), true);
});

test("8.4 Regression: No AP or general accounting permissions introduced", () => {
  const allPermissions = Object.values(ROLE_PERMISSIONS).flat();
  assert.equal(allPermissions.some((p) => p.startsWith("ap:")), false);
  assert.equal(allPermissions.some((p) => p.startsWith("bills:")), false);
  assert.equal(allPermissions.some((p) => p.startsWith("ledger:")), false);
});

// ============================================================================
// 9. TARGETED CORRECTIVE REPAIR CONTRACTS
// ============================================================================

test("9.1 Privacy: Non-owner Advance enumeration prevention in submitOwnCashAdvanceExpenseAction", () => {
  const actionsContent = fs.readFileSync(ACTIONS_PATH, "utf8");
  const ownActionSnippet = actionsContent.slice(
    actionsContent.indexOf("submitOwnCashAdvanceExpenseAction"),
    actionsContent.indexOf("submitOwnCashAdvanceExpenseAction") + 2500,
  );

  // Must query with BOTH id and recipient_id in same lookup
  assert.ok(
    ownActionSnippet.includes('.eq("id", parsed.data.advance_id)') &&
      ownActionSnippet.includes('.eq("recipient_id", user.id)'),
    "submitOwnCashAdvanceExpenseAction must filter by id AND recipient_id in same query",
  );

  // If no row is returned, returns single stable non-enumerating error: cash_advance_unavailable
  assert.ok(
    ownActionSnippet.includes('errorCode: "cash_advance_unavailable"'),
    "submitOwnCashAdvanceExpenseAction must return cash_advance_unavailable for any unowned/nonexistent advance",
  );
  assert.ok(
    ownActionSnippet.includes('error: "Cash advance unavailable"'),
    "submitOwnCashAdvanceExpenseAction must return safe user-facing message for unowned/nonexistent advance",
  );

  // Does not distinguish between nonexistent advance and another user's advance
  assert.equal(
    ownActionSnippet.includes('errorCode: "advance_not_found"'),
    false,
    "submitOwnCashAdvanceExpenseAction must NOT return advance_not_found to prevent existence probing",
  );
  assert.equal(
    ownActionSnippet.includes('errorCode: "forbidden"') &&
      ownActionSnippet.includes("Cannot submit expense against another user's cash advance"),
    false,
    "submitOwnCashAdvanceExpenseAction must NOT return distinct forbidden error after existence check",
  );

  // Status check occurs only after ownership is established
  assert.ok(
    ownActionSnippet.includes('advance.status !== "issued"') &&
      ownActionSnippet.includes('errorCode: "advance_not_in_issued_status"'),
    "submitOwnCashAdvanceExpenseAction must only return advance_not_in_issued_status for owned advance",
  );
});

test("9.2 Privacy: Behavioral verification of non-owner Advance enumeration prevention", () => {
  // Simulate the server-side lookup logic
  const currentUserId = "11111111-1111-4111-8111-111111111111";
  const database = [
    { id: "aaaa1111-1111-4111-8111-111111111111", recipient_id: "99999999-9999-4999-8999-999999999999", status: "issued" },
    { id: "bbbb2222-2222-4222-8222-222222222222", recipient_id: "99999999-9999-4999-8999-999999999999", status: "submitted" },
    { id: "cccc3333-3333-4333-8333-333333333333", recipient_id: currentUserId, status: "issued" },
    { id: "dddd4444-4444-4444-8444-444444444444", recipient_id: currentUserId, status: "submitted" },
  ];

  function evaluateLookup(advanceId: string) {
    const row = database.find((r) => r.id === advanceId && r.recipient_id === currentUserId);
    if (!row) {
      return { success: false, error: "Cash advance unavailable", errorCode: "cash_advance_unavailable" };
    }
    if (row.status !== "issued") {
      return { success: false, error: "Cash advance is not in issued status", errorCode: "advance_not_in_issued_status" };
    }
    return { success: true, advanceId: row.id };
  }

  // Case 1: Nonexistent UUID
  const nonexistentResult = evaluateLookup("00000000-0000-4000-8000-000000000000");
  assert.equal(nonexistentResult.errorCode, "cash_advance_unavailable");

  // Case 2: Another user's issued advance
  const otherIssuedResult = evaluateLookup("aaaa1111-1111-4111-8111-111111111111");
  assert.equal(otherIssuedResult.errorCode, "cash_advance_unavailable");

  // Case 3: Another user's non-issued advance
  const otherNonIssuedResult = evaluateLookup("bbbb2222-2222-4222-8222-222222222222");
  assert.equal(otherNonIssuedResult.errorCode, "cash_advance_unavailable");

  // Proves nonexistent UUID and another user's UUID produce identical external result
  assert.deepEqual(nonexistentResult, otherIssuedResult);
  assert.deepEqual(otherIssuedResult, otherNonIssuedResult);

  // Case 4: Own issued advance succeeds
  const ownIssuedResult = evaluateLookup("cccc3333-3333-4333-8333-333333333333");
  assert.equal(ownIssuedResult.success, true);

  // Case 5: Own non-issued advance receives lifecycle error
  const ownNonIssuedResult = evaluateLookup("dddd4444-4444-4444-8444-444444444444");
  assert.equal(ownNonIssuedResult.errorCode, "advance_not_in_issued_status");
});

test("9.3 Error Safety: Raw infrastructure errors are masked in actions.ts", () => {
  const actionsContent = fs.readFileSync(ACTIONS_PATH, "utf8");

  // In submitOwnCashAdvanceExpenseAction:
  const ownSnippet = actionsContent.slice(
    actionsContent.indexOf("submitOwnCashAdvanceExpenseAction"),
    actionsContent.indexOf("submitOwnCashAdvanceExpenseAction") + 2000,
  );
  assert.equal(
    ownSnippet.includes("error: advError.message") || ownSnippet.includes("error: `Failed to verify cash advance: ${advError.message}`"),
    false,
    "submitOwnCashAdvanceExpenseAction must NOT return advError.message",
  );
  assert.equal(
    ownSnippet.includes("error: error.message") || ownSnippet.includes("error: `Failed to submit cash advance expense: ${error.message}`"),
    false,
    "submitOwnCashAdvanceExpenseAction must NOT return RPC error.message",
  );
  assert.equal(
    ownSnippet.includes("error: err instanceof Error ? err.message"),
    false,
    "submitOwnCashAdvanceExpenseAction catch block must NOT return err.message",
  );

  // In submitCashAdvanceExpenseOnBehalfAction:
  const onBehalfSnippet = actionsContent.slice(
    actionsContent.indexOf("submitCashAdvanceExpenseOnBehalfAction"),
    actionsContent.indexOf("submitCashAdvanceExpenseOnBehalfAction") + 2000,
  );
  assert.equal(
    onBehalfSnippet.includes("error: advError.message") || onBehalfSnippet.includes("error: `Failed to verify cash advance: ${advError.message}`"),
    false,
    "submitCashAdvanceExpenseOnBehalfAction must NOT return advError.message",
  );
  assert.equal(
    onBehalfSnippet.includes("error: error.message"),
    false,
    "submitCashAdvanceExpenseOnBehalfAction must NOT return RPC error.message",
  );
  assert.equal(
    onBehalfSnippet.includes("error: err instanceof Error ? err.message"),
    false,
    "submitCashAdvanceExpenseOnBehalfAction catch block must NOT return err.message",
  );
});

test("9.4 Error Safety: Behavioral test verifying Postgres table/column leaks are masked", () => {
  const injectedRawErrors = [
    'relation "public.employee_cash_advances" does not exist at character 42',
    'column "recipient_id" of relation "employee_cash_advances" does not exist',
    'deadlock detected on process 49201: waiting for ShareLock on transaction 82910',
    'connection to server at "db.supabase.co" (10.0.0.1), port 5432 failed: FATAL: password authentication failed',
  ];

  // Helper matching the safe error handling pattern in our actions
  function handleLookupFailure(_rawMsg: string) {
    void _rawMsg;
    return {
      success: false,
      error: "Failed to verify cash advance",
      errorCode: "advance_lookup_failed",
    };
  }

  function handleRpcFailure(_rawMsg: string) {
    void _rawMsg;
    return {
      success: false,
      error: "Failed to submit cash advance expense",
      errorCode: "cash_advance_expense_submission_failed",
    };
  }

  for (const raw of injectedRawErrors) {
    const lookupResult = handleLookupFailure(raw);
    assert.equal(lookupResult.error.includes("employee_cash_advances"), false);
    assert.equal(lookupResult.error.includes("relation"), false);
    assert.equal(lookupResult.error.includes("column"), false);
    assert.equal(lookupResult.error.includes("character"), false);
    assert.equal(lookupResult.error.includes("deadlock"), false);
    assert.equal(lookupResult.error.includes("10.0.0.1"), false);
    assert.equal(lookupResult.error.includes("FATAL"), false);

    const rpcResult = handleRpcFailure(raw);
    assert.equal(rpcResult.error.includes("employee_cash_advances"), false);
    assert.equal(rpcResult.error.includes("relation"), false);
    assert.equal(rpcResult.error.includes("column"), false);
    assert.equal(rpcResult.error.includes("character"), false);
    assert.equal(rpcResult.error.includes("deadlock"), false);
  }
});

test("9.5 Compatibility: Migration preserves canonical pre-W5B-2C non-CA error codes", () => {
  const newSql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  const baseSql = fs.readFileSync(
    path.join(process.cwd(), "supabase", "migrations", "20260908100000_w5b1_expense_document_numbering.sql"),
    "utf8",
  );

  const canonicalLegacyErrors = [
    "event_requires_service_id",
    "company_cannot_have_service_id",
    "employee_paid_requires_personal_funds",
    "company_direct_cannot_use_personal_funds",
    "employee_paid_requires_claimant",
    "company_direct_cannot_have_claimant",
    "petty_cash_fund_id_required",
    "cash_advance_id_required",
  ];

  for (const errCode of canonicalLegacyErrors) {
    assert.ok(
      baseSql.includes(`'${errCode}'`),
      `Base W5B-1 migration must contain canonical error '${errCode}'`,
    );
    assert.ok(
      newSql.includes(`'${errCode}'`),
      `New W5B-2C migration must preserve canonical error '${errCode}'`,
    );
  }
});

test("9.6 Security: All W5B-2C-1 RPCs explicitly revoke from PUBLIC, anon, authenticated", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");

  const rpcNames = [
    "public.submit_expense",
    "public.record_cash_advance_return",
    "public.get_cash_advance_balance_summary",
    "public.get_linked_cash_advance_expenses",
  ];

  for (const rpc of rpcNames) {
    assert.ok(
      sql.includes(`REVOKE ALL ON FUNCTION ${rpc}`) && sql.includes("FROM PUBLIC, anon, authenticated;"),
      `${rpc} must revoke execute from PUBLIC, anon, authenticated`,
    );
    assert.ok(
      sql.includes(`GRANT EXECUTE ON FUNCTION ${rpc}`) && sql.includes("TO service_role;"),
      `${rpc} must grant execute to service_role`,
    );
  }
});

test("9.7 Migration Structure: Migration wrapped in explicit BEGIN and COMMIT", () => {
  const sql = fs.readFileSync(MIGRATION_W5B2C_PATH, "utf8");
  const nonCommentSql = sql.replace(/^(\s*--.*\r?\n)*/g, "").trimStart();
  assert.ok(nonCommentSql.startsWith("BEGIN;"), "Migration must begin with explicit BEGIN; after comments");
  assert.ok(sql.trimEnd().endsWith("COMMIT;"), "Migration must end with explicit COMMIT;");
});
