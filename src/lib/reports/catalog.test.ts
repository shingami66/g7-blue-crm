import assert from "node:assert/strict";
import test from "node:test";
import { filterAuthorizedReportDefinitions, getReportDefinitions } from "./catalog.ts";

test("Reports Center catalog includes the implemented operations and W10H accounting definitions", () => {
  const en = getReportDefinitions("en");
  const ar = getReportDefinitions("ar");
  assert.deepEqual(en.map((definition) => definition.key), ["accounts_receivable", "accounts_payable", "event_economics", "general_ledger", "trial_balance", "profit_and_loss", "balance_sheet"]);
  assert.deepEqual(en.map((definition) => definition.route), [
    "/reports/accounts-receivable",
    "/reports/accounts-payable",
    "/reports/event-economics",
    "/reports/general-ledger",
    "/reports/trial-balance",
    "/reports/profit-and-loss",
    "/reports/balance-sheet",
  ]);
  assert.equal(en[0].timeModel, "period_and_as_of");
  assert.equal(en[1].timeModel, "current_only");
  assert.equal(en[2].timeModel, "historical_as_of");
  assert.deepEqual(en[0].requiredPermissions, ["invoices:read"]);
  assert.deepEqual(en[1].requiredPermissions, ["supplier_bills:read", "supplier_payments:read"]);
  assert.deepEqual(en[2].requiredPermissions, ["services:read", "supplier_costing:read"]);
  assert.deepEqual(en[3].requiredPermissions, ["accounting:view"]);
  assert.deepEqual(en[4].requiredPermissions, ["accounting:view"]);
  assert.deepEqual(en[5].requiredPermissions, ["accounting:view_statements"]);
  assert.deepEqual(en[6].requiredPermissions, ["accounting:view_statements"]);
  assert.notEqual(en[0].title, ar[0].title);
  assert.notEqual(en[1].title, ar[1].title);
  assert.notEqual(en[2].title, ar[2].title);
  assert.notEqual(en[3].title, ar[3].title);
  assert.equal(en[0].title, "Customer Receivables");
  assert.equal(en[1].title, "Supplier Payables");
  assert.equal(en[2].title, "Event Cost & Margin");
  assert.equal(ar[0].title, "مستحقات العملاء");
  assert.equal(ar[1].title, "مستحقات الموردين");
  assert.equal(ar[2].title, "تكاليف وهوامش الفعاليات");
  assert.equal(en[3].title, "General Ledger");
  assert.equal(en[4].title, "Trial Balance");
  assert.equal(en[5].title, "Profit & Loss");
  assert.equal(en[6].title, "Balance Sheet");
  assert.equal(ar[3].title, "دفتر الأستاذ العام");
  assert.equal(ar[4].title, "ميزان المراجعة");
  assert.equal(ar[5].title, "الأرباح والخسائر");
  assert.equal(ar[6].title, "الميزانية العمومية");
  for (const definition of [...en, ...ar]) {
    assert.equal(definition.exportSupported, true);
    assert.ok(definition.sourceDomain.length > 0);
    assert.ok(definition.freshness.length > 0);
  }
});

test("report navigation includes only definitions whose complete effective permission set is granted", () => {
  const definitions = getReportDefinitions("en");
  const accessible = filterAuthorizedReportDefinitions(definitions, new Map([
    ["invoices:read", true],
    ["supplier_bills:read", true],
    ["supplier_payments:read", false],
    ["services:read", true],
    ["supplier_costing:read", true],
    ["accounting:view", false],
    ["accounting:view_statements", false],
    ["*", true],
  ]));

  assert.deepEqual(accessible.map(({ key }) => key), ["accounts_receivable", "event_economics"]);
});
