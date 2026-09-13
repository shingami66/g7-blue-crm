import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (file: string) => fs.readFileSync(path.join(process.cwd(), file), "utf8");

test("W5C workspace exposes exactly the Petty Cash sibling navigation and gated route", () => {
  const sidebar = read("src/components/layout/Sidebar.tsx");
  const navigation = read("src/lib/i18n/dictionaries/navigation.ts");
  const layout = read("src/app/(dashboard)/layout.tsx");
  assert.match(sidebar, /pathname === \"\/petty-cash\"/);
  assert.match(sidebar, /canReadPettyCash/);
  assert.match(sidebar, /href: \"\/petty-cash\"/);
  assert.match(navigation, /pettyCash: \"Petty Cash\"/);
  assert.match(navigation, /pettyCash: \"المصروفات النثرية\"/);
  assert.match(layout, /checkPermission\(PETTY_CASH_PERMISSIONS\.read\)/);
});

test("W5C list and detail surfaces preserve canonical dashboard shell and responsive ledger", () => {
  const list = read("src/app/(dashboard)/petty-cash/PettyCashClient.tsx");
  const detail = read("src/app/(dashboard)/petty-cash/[id]/PettyCashDetailClient.tsx");
  const dictionary = read("src/lib/i18n/dictionaries/petty-cash.ts");
  assert.match(list, /getPettyCashDictionary/);
  assert.match(list, /md:hidden/);
  assert.match(list, /hidden rounded-xl border border-outline-variant bg-surface-container-lowest md:block/);
  assert.match(detail, /transactionLedger/);
  assert.match(detail, /desktop-petty-cash-transaction-table/);
  assert.match(detail, /mobile-petty-cash-expense-cards/);
  assert.match(detail, /mobile-petty-cash-expense-card/);
  assert.match(detail, /desktop-petty-cash-expense-table/);
  assert.match(detail, /hidden overflow-hidden[^\"]*md:block/);
  assert.match(detail, /dictionary\.labels\.replenishmentCapacity/);
  assert.match(list, /Math\.max\(0, fund\.float_limit - fund\.current_balance\)/);
  assert.match(detail, /Math\.max\(0, fund\.float_limit - fund\.current_balance\)/);
  assert.match(dictionary, /replenishmentCapacity: "Replenishment Capacity"/);
  assert.match(dictionary, /replenishmentCapacity: "المتاح لإعادة التغذية"/);
  assert.doesNotMatch(list, /dictionary\.labels\.utilized/);
  assert.doesNotMatch(detail, /dictionary\.labels\.utilized/);
  assert.doesNotMatch(detail, /dictionary\.labels\.review/);
  assert.match(detail, /crypto\.randomUUID\(\)/);
  assert.match(detail, /attachExpenseReceiptAction/);
  assert.match(detail, /partialReceipt/);
  assert.match(detail, /retryReceipt/);
  assert.match(detail, /formData\.append\("request_id", partialReceipt\.requestId\)/);
  assert.doesNotMatch(list, /max-w-/);
  assert.doesNotMatch(detail, /max-w-/);
});

test("W5C record-expense context controls the service field and payload", () => {
  const detail = read("src/app/(dashboard)/petty-cash/[id]/PettyCashDetailClient.tsx");
  assert.match(detail, /useState<"company" \| "event">\("company"\)/);
  assert.match(detail, /name="context_type" value=\{contextType\}/);
  assert.match(detail, /contextType === "event" && <TextInput name="service_id"/);
  assert.match(detail, /if \(next === "company"\) setServiceId\(""\)/);
  assert.match(detail, /data\.set\("context_type", contextType\)/);
  assert.match(detail, /if \(contextType === "company"\) \{\s*data\.delete\("service_id"\)/);
  assert.match(detail, /data\.set\("service_id", serviceId\)/);
  assert.match(detail, /value=\{serviceId\} onChange=/);
});

test("W5C linked expenses and transactions use real desktop table column models", () => {
  const detail = read("src/app/(dashboard)/petty-cash/[id]/PettyCashDetailClient.tsx");
  assert.match(detail, /desktop-petty-cash-expense-table[\s\S]*<table className="w-full table-fixed/);
  assert.match(detail, /desktop-petty-cash-transaction-table[\s\S]*<table className="w-full table-fixed/);
  assert.match(detail, /labels\.transactionType/);
  assert.match(detail, /labels\.balanceChange/);
  assert.match(detail, /labels\.recordedAt/);
  assert.match(detail, /<bdi dir="ltr">\{expense\.expense_number\}<\/bdi>/);
  assert.match(detail, /<bdi dir="ltr">\{formatTransactionDateTime\(tx\.recorded_at\)\}<\/bdi>/);
  assert.doesNotMatch(detail, /<td[^>]*dir="ltr"/);
  assert.doesNotMatch(detail, /md:grid-cols-8/);
});

test("W5C fund-list Last Activity stays bounded to fund rows", () => {
  const queries = read("src/lib/expenses/queries.ts");
  const start = queries.indexOf("export async function getPettyCashFundsList");
  const end = queries.indexOf("export async function getPettyCashFundDetailById", start);
  assert.ok(start >= 0 && end > start, "Petty Cash fund-list query must remain identifiable");
  const fundsList = queries.slice(start, end);
  assert.doesNotMatch(fundsList, /petty_cash_transactions/);
  assert.match(fundsList, /last_activity_at: fund\.updated_at/);
});

test("W5C fund list keeps fixed desktop columns and an explicit action column", () => {
  const list = read("src/app/(dashboard)/petty-cash/PettyCashClient.tsx");
  assert.match(list, /table className="[^"]*table-fixed/);
  assert.match(list, /<colgroup>[\s\S]*<col className="w-\[17%\]"[\s\S]*<col className="w-\[14%\]"[\s\S]*<col className="w-\[12%\]"[\s\S]*<\/colgroup>/);
  assert.match(list, /<th className="px-3 py-3 text-end font-semibold">\{dictionary\.labels\.viewFund\}<\/th>/);
  assert.match(list, /<td className="px-3 py-3 text-end font-mono"><bdi dir="ltr">\{money\(fund\.float_limit\)\}<\/bdi><\/td>/);
  assert.match(list, /<td className="px-3 py-3 text-end font-mono"><bdi dir="ltr">\{money\(fund\.current_balance\)\}<\/bdi><\/td>/);
  assert.match(list, /<td className="px-3 py-3 text-end font-mono"><bdi dir="ltr">\{money\(Math\.max\(0, fund\.float_limit - fund\.current_balance\)\)\}<\/bdi><\/td>/);
  assert.match(list, /<td className="px-3 py-3 text-start text-on-surface-variant"><bdi dir="ltr">\{formatFundDate\(fund\.last_activity_at\)\}<\/bdi><\/td>/);
  assert.match(list, /formatToParts/);
  assert.doesNotMatch(list, /ar-SA/);
  assert.doesNotMatch(list, /<td[^>]*dir="ltr"/);
  assert.doesNotMatch(list, /min-w-\[980px\]/);
  assert.doesNotMatch(list, /w-\[5%\]/);
});

test("W5C detail exposes distinct financial metrics without internal implementation copy", () => {
  const detail = read("src/app/(dashboard)/petty-cash/[id]/PettyCashDetailClient.tsx");
  const dictionary = read("src/lib/i18n/dictionaries/petty-cash.ts");
  assert.match(detail, /Metric label=\{dictionary\.labels\.replenishmentCapacity\} value=\{money\(Math\.max\(0, fund\.float_limit - fund\.current_balance\)\)\}/);
  assert.equal(detail.includes("Metric label={dictionary.labels.availableCash}"), false);
  assert.equal(detail.includes("dictionary.labels.database"), false);
  assert.equal(detail.includes("dictionary.labels.governedBoundary"), false);
  assert.equal(detail.includes("<span dir=\"ltr\">({partialReceipt.expenseId})</span>"), false);
  assert.equal(dictionary.includes("Governed RPC"), false);
  assert.equal(dictionary.includes("service-role"), false);
  assert.equal(dictionary.includes("database: "), false);
});

test("W5C detail renders one active action panel directly below the action toolbar", () => {
  const detail = read("src/app/(dashboard)/petty-cash/[id]/PettyCashDetailClient.tsx");
  const toolbarIndex = detail.indexOf('id="petty-cash-action-toolbar"');
  const panelIndex = detail.indexOf('{panel === "manage"');
  const statusIndex = detail.indexOf("{statusTarget &&");

  assert.ok(toolbarIndex >= 0 && panelIndex > toolbarIndex && panelIndex < statusIndex);
  assert.equal((detail.match(/<Panel id=/g) ?? []).length, 4);
  for (const action of ["manage", "replenish", "expense", "withdraw"]) {
    assert.ok(detail.includes(`aria-expanded={panel === "${action}"}`));
    assert.ok(detail.includes(`aria-controls="petty-cash-${action}-panel"`));
  }
  assert.doesNotMatch(detail, /petty-cash-disburse-panel/);
  assert.ok(detail.includes("actionButtonClass(panel"));
  assert.ok((detail.match(/autoFocus/g) ?? []).length >= 5);
  assert.equal(detail.includes("locale: Locale"), false);
});

test("W5C transaction timestamps use clean Riyadh Gregorian Latin-digit output", () => {
  const detail = read("src/app/(dashboard)/petty-cash/[id]/PettyCashDetailClient.tsx");
  assert.match(detail, /function formatTransactionDateTime/);
  assert.match(detail, /calendar: "gregory"/);
  assert.match(detail, /numberingSystem: "latn"/);
  assert.match(detail, /timeZone: "Asia\/Riyadh"/);
  assert.match(detail, /hourCycle: "h23"/);
  assert.match(detail, /formatToParts\(date\)/);
  assert.match(detail, /<bdi dir="ltr">\{formatTransactionDateTime\(transaction\.recorded_at\)\}<\/bdi>/);
  assert.doesNotMatch(detail, /transaction\.recorded_at\)\.toLocaleString/);
  assert.doesNotMatch(detail, /transaction\.recorded_at\}\)\.toLocaleString/);
});

test("W5C one-click Petty Cash completion composes the governed Expense and ledger RPCs", () => {
  const detail = read("src/app/(dashboard)/petty-cash/[id]/PettyCashDetailClient.tsx");
  const actions = read("src/lib/expenses/actions.ts");
  const schemas = read("src/lib/expenses/schemas.ts");
  const dictionary = read("src/lib/i18n/dictionaries/petty-cash.ts");
  const migration = read("supabase/migrations/20260913110000_w5c_petty_cash_approve_and_disburse.sql");

  assert.match(detail, /approveAndDisbursePettyCashExpenseAction/);
  assert.match(detail, /dictionary\.actions\.approveAndDisburse/);
  assert.match(detail, /dictionary\.labels\.disbursed/);
  assert.match(detail, /dictionary\.labels\.action/);
  assert.doesNotMatch(detail, /dictionary\.labels\.review/);
  assert.match(dictionary, /approveAndDisburse: "Approve & Disburse"/);
  assert.match(dictionary, /approveAndDisburse: "اعتماد وصرف"/);
  assert.match(actions, /requirePermission\(PETTY_CASH_PERMISSIONS\.transact\)/);
  assert.match(actions, /approve_and_disburse_petty_cash_expense/);
  assert.match(schemas, /approveAndDisbursePettyCashExpenseSchema/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.approve_and_disburse_petty_cash_expense/);
  assert.match(migration, /public\.review_expense_finance\(/);
  assert.match(migration, /public\.approve_expense\(/);
  assert.match(migration, /public\.record_petty_cash_transaction\(/);
  assert.match(migration, /COALESCE\(p_actor_role, ''\) NOT IN \('admin', 'accountant'\)/);
  assert.match(migration, /u\.is_active = true/);
  assert.match(migration, /v_expense_fund_id IS DISTINCT FROM p_fund_id/);
  assert.match(migration, /v_disbursed_amount/);
  assert.match(migration, /WHERE t\.request_id = p_request_id/);
  assert.match(migration, /v_existing_transaction_id, true/);
  assert.match(migration, /v_error_code := v_review_error;[\s\S]*RAISE EXCEPTION/);
  assert.match(migration, /v_error_code := v_transaction_error;[\s\S]*RAISE EXCEPTION/);
  assert.match(migration, /COALESCE\(v_error_code, 'petty_cash_approve_disburse_failed'\)/);
  assert.match(migration, /EXCEPTION WHEN OTHERS THEN/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION public\.approve_and_disburse_petty_cash_expense/);
  assert.doesNotMatch(migration, /CREATE OR REPLACE FUNCTION public\.(review_expense_finance|approve_expense|record_petty_cash_transaction)\(/);
});
