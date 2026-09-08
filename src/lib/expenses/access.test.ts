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

    if (specifier.startsWith("@/")) {
      return {
        shortCircuit: true,
        url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href,
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
  EXPENSE_PERMISSIONS,
  BUSINESS_DOCUMENT_PERMISSIONS,
  hasPermissionForRole,
} = await import("../auth/role-permissions.ts");

test("W5B-1A Authority Matrix: Exactly matches approved role behavior", () => {
  // Sales / Operations: submit own employee-paid expenses; read own records only
  for (const role of ["sales", "operations"] as const) {
    assert.equal(hasPermissionForRole(role, EXPENSE_PERMISSIONS.readOwn), true, `${role} must have readOwn`);
    assert.equal(hasPermissionForRole(role, EXPENSE_PERMISSIONS.submitOwn), true, `${role} must have submitOwn`);
    assert.equal(hasPermissionForRole(role, EXPENSE_PERMISSIONS.read), false, `${role} must NOT have company-wide read`);
    assert.equal(hasPermissionForRole(role, EXPENSE_PERMISSIONS.write), false, `${role} must NOT have broad write`);
    assert.equal(hasPermissionForRole(role, EXPENSE_PERMISSIONS.approve), false, `${role} must NOT have approve`);
    assert.equal(hasPermissionForRole(role, EXPENSE_PERMISSIONS.financeReview), false, `${role} must NOT have financeReview`);
    assert.equal(hasPermissionForRole(role, EXPENSE_PERMISSIONS.settle), false, `${role} must NOT have settle`);
    assert.equal(hasPermissionForRole(role, BUSINESS_DOCUMENT_PERMISSIONS.write), false, `${role} must NOT have documents:write`);
  }

  // Manager: self-service + full Expense read + approve/reject others
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.approve), true);
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.write), false, "Manager must NOT have expenses:write");
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.financeReview), false, "Manager must NOT have financeReview");
  assert.equal(hasPermissionForRole("manager", EXPENSE_PERMISSIONS.settle), false, "Manager must NOT have settle");

  // Accountant: self-service + full Expense read + Finance review + reimbursement settlement
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.financeReview), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.settle), true);
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.write), false, "Accountant must NOT have expenses:write");
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.approve), false, "Accountant must NOT have approve");

  // Viewer: no W5 access
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.readOwn), false);
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.submitOwn), false);
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.read), false);
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.write), false);
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.approve), false);
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.financeReview), false);
  assert.equal(hasPermissionForRole("viewer", EXPENSE_PERMISSIONS.settle), false);

  // Admin: wildcard satisfies all
  assert.equal(hasPermissionForRole("admin", EXPENSE_PERMISSIONS.readOwn), true);
  assert.equal(hasPermissionForRole("admin", EXPENSE_PERMISSIONS.submitOwn), true);
  assert.equal(hasPermissionForRole("admin", EXPENSE_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("admin", EXPENSE_PERMISSIONS.write), true);
  assert.equal(hasPermissionForRole("admin", EXPENSE_PERMISSIONS.approve), true);
  assert.equal(hasPermissionForRole("admin", EXPENSE_PERMISSIONS.financeReview), true);
  assert.equal(hasPermissionForRole("admin", EXPENSE_PERMISSIONS.settle), true);
});

test("W5B-1A Self-Scoped Read Contract: Server-enforces ownership and rejects client filtering leakage", () => {
  const queriesSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/expenses/queries.ts"),
    "utf8",
  );

  // 1. Must use server-only
  assert.ok(queriesSource.includes('import "server-only";'));

  // 2. Self-scoped list helper verifies EXPENSE_PERMISSIONS.readOwn and filters on submitted_by OR claimant_id
  assert.ok(queriesSource.includes("export async function getOwnExpensesAccountabilityList"));
  assert.ok(queriesSource.includes("requirePermission(EXPENSE_PERMISSIONS.readOwn)"));
  assert.ok(queriesSource.includes("submitted_by.eq.${user.id},claimant_id.eq.${user.id}"));

  // 3. Self-scoped detail helper verifies ownership server-side
  assert.ok(queriesSource.includes("export async function getOwnExpenseDetailById"));
  assert.ok(queriesSource.includes("expenseData.submitted_by !== user.id && expenseData.claimant_id !== user.id"));

  // 4. Company-wide read functions remain governed by EXPENSE_PERMISSIONS.read
  assert.ok(queriesSource.includes("export async function getExpensesAccountabilityList"));
  assert.ok(queriesSource.includes("requirePermission(EXPENSE_PERMISSIONS.read)"));
});

test("W5B-1A Finance Review Gate Contract: Action requires financeReview permission and validates schema", () => {
  const actionsSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/expenses/actions.ts"),
    "utf8",
  );

  assert.ok(actionsSource.includes("export async function reviewExpenseFinanceAction"));
  assert.ok(actionsSource.includes("requirePermission(EXPENSE_PERMISSIONS.financeReview)"));
  assert.ok(actionsSource.includes("reviewExpenseFinanceSchema.safeParse"));
  assert.ok(actionsSource.includes("review_expense_finance"));
});

test("W5B-1A Receipt Authority Requirement (Next Runtime Step): Upload uses narrow Expense boundary without documents:write", () => {
  const actionsSource = fs.readFileSync(
    path.join(process.cwd(), "src/lib/expenses/actions.ts"),
    "utf8",
  );

  // Assert that attachExpenseDocumentAction allows EXPENSE_PERMISSIONS.submitOwn when user owns the expense
  assert.ok(actionsSource.includes("export async function attachExpenseDocumentAction"));
  assert.ok(actionsSource.includes("requirePermission(EXPENSE_PERMISSIONS.submitOwn)"));
  assert.ok(actionsSource.includes("exp.submitted_by !== user.id && exp.claimant_id !== user.id"));

  // Verify that employee self-service does not require generic documents:write
  for (const role of ["sales", "operations", "accountant"] as const) {
    assert.equal(
      hasPermissionForRole(role, BUSINESS_DOCUMENT_PERMISSIONS.write),
      false,
      `${role} must NOT require generic documents:write for expense receipts`,
    );
    assert.equal(
      hasPermissionForRole(role, EXPENSE_PERMISSIONS.submitOwn),
      true,
      `${role} has narrow submitOwn boundary for receipt attachment`,
    );
  }
});
