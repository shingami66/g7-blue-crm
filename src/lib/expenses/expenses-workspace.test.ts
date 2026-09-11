import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const PAGE_PATH = join(REPO_ROOT, "src/app/(dashboard)/expenses/page.tsx");
const CLIENT_PATH = join(REPO_ROOT, "src/app/(dashboard)/expenses/ExpensesClient.tsx");
const ACTIONS_PATH = join(REPO_ROOT, "src/app/(dashboard)/expenses/ExpenseWorkspaceActions.tsx");
const SERVER_ACTIONS_PATH = join(REPO_ROOT, "src/lib/expenses/actions.ts");
const SUBMISSION_MODAL_PATH = join(REPO_ROOT, "src/app/(dashboard)/expenses/ExpenseSubmissionModal.tsx");
const DICTIONARY_PATH = join(REPO_ROOT, "src/lib/i18n/dictionaries/expenses.ts");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("Expenses workspace is Expenses-only and removes implementation-stage copy", () => {
  const client = read(CLIENT_PATH);
  const dictionary = read(DICTIONARY_PATH);

  assert.equal(dictionary.includes("stageBadge"), false);
  assert.equal(dictionary.includes("W5A Foundation"), false);
  assert.equal(dictionary.includes("تأسيس W5A"), false);
  assert.equal(dictionary.includes("Expenses & Cash"), false);
  assert.equal(dictionary.includes("المصروفات والعهد"), false);
  assert.ok(dictionary.includes('petty_cash: "نقدية نثرية"'));
  assert.ok(dictionary.includes('title: "Expenses"'));
  assert.ok(dictionary.includes('title: "المصروفات"'));
  assert.equal(client.includes("dictionary.header.stageBadge"), false);
});

test("Expenses page loads bounded own and broad datasets only when authorized", () => {
  const page = read(PAGE_PATH);

  assert.ok(page.includes("getOwnExpensesAccountabilityList"));
  assert.ok(page.includes("getExpensesAccountabilityList"));
  assert.match(page, /canReadOwn[\s\S]*getOwnExpensesAccountabilityList/);
  assert.match(page, /canReadBroad[\s\S]*getExpensesAccountabilityList/);
  assert.ok(page.includes("getOwnExpensesAccountabilityList({ limit: 100 })"));
  assert.ok(page.includes("getExpensesAccountabilityList({ limit: 100 })"));
  assert.ok(page.includes("Promise.all"));
  assert.ok(page.includes("myExpenses={myExpenses}"));
  assert.ok(page.includes("expenses={expenses}"));
});

test("Expenses workspace keeps own and broad views separate with a My Expenses default", () => {
  const client = read(CLIENT_PATH);

  assert.ok(client.includes("canReadOwn"));
  assert.ok(client.includes("canReadBroad"));
  assert.ok(client.includes('useState<"mine" | "all">'));
  assert.ok(client.includes('hasOwnView && hasBroadView'));
  assert.ok(client.includes('selectedView === "mine" ? myExpenses : allExpenses'));
  assert.ok(client.includes("dictionary.tabs.myExpenses"));
  assert.ok(client.includes("dictionary.tabs.allExpenses"));
  assert.equal(client.includes("cashAdvancesLocked"), false);
  assert.equal(client.includes("pettyCashLocked"), false);
});

test("Expenses ledger exposes funding method and governed row-level finance actions", () => {
  const client = read(CLIENT_PATH);
  const actions = read(ACTIONS_PATH);
  const serverActions = read(SERVER_ACTIONS_PATH);
  const submissionModal = read(SUBMISSION_MODAL_PATH);

  assert.ok(client.includes("getExpenseOriginTypeLabel"));
  assert.ok(client.includes("getExpensePaymentMethodLabel"));
  assert.ok(client.includes("exp.payment_method"));
  assert.ok(client.includes("<ExpenseWorkspaceActions"));
  assert.ok(actions.includes("reviewExpenseFinanceAction"));
  assert.ok(actions.includes("approveExpenseAction"));
  assert.ok(actions.includes("rejectExpenseAction"));
  assert.ok(actions.includes("capabilities.canFinanceReview"));
  assert.ok(actions.includes("capabilities.canApprove"));
  assert.ok(actions.includes("capabilities.canReject"));
  assert.equal(actions.includes("setError(result.error)"), false);
  assert.ok(serverActions.includes("finance_review_required"));
  assert.ok(serverActions.includes('from("expense_accountability_summaries")'));
  assert.equal(client.includes("setReceiptUrlError(res.error"), false);
  assert.equal(client.includes("setRetryError(res.error"), false);
  assert.equal(submissionModal.includes("setError(result.error"), false);
  assert.equal(submissionModal.includes("receiptError: result.data.warning"), false);
});

test("Expenses page keeps infrastructure failures behind stable user-facing copy", () => {
  const page = read(PAGE_PATH);
  const client = read(CLIENT_PATH);

  assert.equal(page.includes("err.message"), false);
  assert.ok(page.includes("loadError = true"));
  assert.ok(client.includes("dictionary.states.loadErrorDefault"));
  assert.equal(client.includes("{loadError}") , false);
});

test("Expenses desktop ledger uses shared table columns for headers and summary rows", () => {
  const client = read(CLIENT_PATH);
  assert.match(client, /table className="[^"]*table-fixed/);
  assert.match(client, /<colgroup>[\s\S]*<col className="w-\[12%\]"[\s\S]*<\/colgroup>/);
  assert.match(client, /<td className="px-4 py-3 align-top font-mono/);
  assert.match(client, /<tr key=\{`\$\{exp\.id\}-details`\}[\s\S]*<td colSpan=\{9\}/);
  assert.equal(client.includes("<td colSpan={9} className=\"p-0\">\n                          {/* Summary Row */}"), false);
  assert.equal(client.includes("w-[14%]"), false);
});
