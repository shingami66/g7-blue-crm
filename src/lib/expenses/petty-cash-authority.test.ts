import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
const require = createRequire(import.meta.url);
const sourceRootUrl = new URL("../../", import.meta.url).href;
const { registerHooks } = require("node:module") as { registerHooks: (hooks: { resolve: (specifier: string, context: ResolveContext, nextResolve: (specifier: string, context: ResolveContext) => ResolveResult) => ResolveResult }) => void };

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith("@/")) return { shortCircuit: true, url: new URL(`../../${specifier.slice(2)}.ts`, import.meta.url).href };
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) return nextResolve(`${specifier}.ts`, context);
    return nextResolve(specifier, context);
  },
});

const { PETTY_CASH_PERMISSIONS, EXPENSE_PERMISSIONS, CASH_ADVANCE_PERMISSIONS, hasPermissionForRole } = await import("../auth/role-permissions.ts");
const { recordPettyCashTransactionSchema } = await import("./schemas.ts");

test("W5C authority matrix grants governed Petty Cash only to Admin and Accountant", () => {
  for (const permission of Object.values(PETTY_CASH_PERMISSIONS)) {
    assert.equal(hasPermissionForRole("admin", permission), true);
    assert.equal(hasPermissionForRole("accountant", permission), true);
  }
  assert.equal(hasPermissionForRole("manager", PETTY_CASH_PERMISSIONS.read), true);
  assert.equal(hasPermissionForRole("manager", PETTY_CASH_PERMISSIONS.manage), false);
  assert.equal(hasPermissionForRole("manager", PETTY_CASH_PERMISSIONS.transact), false);
  for (const role of ["sales", "operations", "viewer"] as const) {
    for (const permission of Object.values(PETTY_CASH_PERMISSIONS)) assert.equal(hasPermissionForRole(role, permission), false);
  }
  assert.equal(hasPermissionForRole("accountant", EXPENSE_PERMISSIONS.financeReview), true);
  assert.equal(hasPermissionForRole("accountant", CASH_ADVANCE_PERMISSIONS.approve), true);
});

test("W5C transaction schema rejects unlinked disbursement and requires treasury evidence", () => {
  const base = { fund_id: "11111111-1111-4111-8111-111111111111", amount: 25, request_id: "22222222-2222-4222-8222-222222222222" };
  const disbursement = recordPettyCashTransactionSchema.safeParse({ ...base, transaction_type: "disbursement" });
  assert.equal(disbursement.success, false);
  assert.match(disbursement.error.issues[0]?.message ?? "", /expense/i);
  const withdrawal = recordPettyCashTransactionSchema.safeParse({ ...base, transaction_type: "treasury_withdrawal" });
  assert.equal(withdrawal.success, false);
  assert.match(withdrawal.error.issues[0]?.message ?? "", /reference/i);
  const valid = recordPettyCashTransactionSchema.safeParse({ ...base, transaction_type: "treasury_withdrawal", reference: "TR-001" });
  assert.equal(valid.success, true);
});

test("W5C action and query modules remain server-only boundaries", () => {
  const actions = fs.readFileSync(path.join(process.cwd(), "src/lib/expenses/actions.ts"), "utf8");
  const queries = fs.readFileSync(path.join(process.cwd(), "src/lib/expenses/queries.ts"), "utf8");
  assert.match(actions, /import \"server-only\";/);
  assert.match(queries, /import \"server-only\";/);
  assert.match(actions, /requirePermission\(PETTY_CASH_PERMISSIONS\.manage\)/);
  assert.match(actions, /requirePermission\(PETTY_CASH_PERMISSIONS\.transact\)/);
});
