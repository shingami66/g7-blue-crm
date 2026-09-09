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
  assert.match(list, /hidden overflow-x-auto/);
  assert.match(detail, /transactionLedger/);
  assert.match(detail, /md:grid-cols-8/);
  assert.match(detail, /mobile-petty-cash-expense-cards/);
  assert.match(detail, /mobile-petty-cash-expense-card/);
  assert.match(detail, /desktop-petty-cash-expense-table/);
  assert.match(detail, /hidden overflow-x-auto[^\"]*md:block/);
  assert.match(detail, /dictionary\.labels\.replenishmentCapacity/);
  assert.match(list, /Math\.max\(0, fund\.float_limit - fund\.current_balance\)/);
  assert.match(detail, /Math\.max\(0, fund\.float_limit - fund\.current_balance\)/);
  assert.match(dictionary, /replenishmentCapacity: "Replenishment Capacity"/);
  assert.match(dictionary, /replenishmentCapacity: "المتاح لإعادة التغذية"/);
  assert.doesNotMatch(list, /dictionary\.labels\.utilized/);
  assert.doesNotMatch(detail, /dictionary\.labels\.utilized/);
  assert.match(detail, /crypto\.randomUUID\(\)/);
  assert.match(detail, /attachExpenseReceiptAction/);
  assert.match(detail, /partialReceipt/);
  assert.match(detail, /retryReceipt/);
  assert.match(detail, /formData\.append\("request_id", partialReceipt\.requestId\)/);
  assert.doesNotMatch(list, /max-w-/);
  assert.doesNotMatch(detail, /max-w-/);
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
