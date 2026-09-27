import assert from "node:assert/strict";
import test from "node:test";
import {
  composeDashboard,
  DASHBOARD_ACTION_GROUPS,
  DASHBOARD_QUICK_ACTIONS,
  DASHBOARD_WIDGETS,
  getDashboardPermissionsToResolve,
} from "./composition.ts";

const ids = (items: readonly { id: string }[]) => items.map((item) => item.id);

test("Dashboard contribution metadata is complete, stable, and declares source-time semantics", () => {
  for (const item of [...DASHBOARD_WIDGETS, ...DASHBOARD_ACTION_GROUPS, ...DASHBOARD_QUICK_ACTIONS]) {
    assert.ok(item.id.length > 0);
    assert.ok(item.requiredEffectivePermissions.length > 0);
    assert.ok(item.destination.startsWith("/"));
    assert.ok(item.sourceDomain.length > 0);
    assert.ok(item.displayPriority > 0);
    assert.ok(["current", "current_only", "historical_as_of_riyadh_date"].includes(item.timeSemantics));
  }

  assert.equal(
    new Set(DASHBOARD_WIDGETS.map((item) => item.id)).size,
    DASHBOARD_WIDGETS.length,
  );
  assert.ok(getDashboardPermissionsToResolve().includes("supplier_costing:read"));
});

test("manager-like effective permissions compose operational, financial, and costing widgets without role branches", () => {
  const composition = composeDashboard(new Set([
    "customers:read",
    "customers:write",
    "quotations:read",
    "quotations:write",
    "quotations:approve",
    "services:read",
    "services:write",
    "services:update_status",
    "invoices:read",
    "invoices:write",
    "payments:read",
    "supplier_bills:read",
    "supplier_payments:read",
    "supplier_costing:read",
  ]));

  assert.deepEqual(ids(composition.widgets), [
    "customers",
    "quotations",
    "services",
    "service-lifecycle",
    "accounts-receivable",
    "accounts-payable",
    "event-economics",
    "recent-quotations",
    "recent-payments",
  ]);
  assert.deepEqual(ids(composition.actionGroups), [
    "invoice-follow-up",
    "quotation-approval",
    "service-start",
  ]);
  assert.deepEqual(ids(composition.quickActions), [
    "new-customer",
    "new-quotation",
    "new-invoice",
    "new-service",
  ]);
});

test("accountant-like effective permissions include finance review and advance issue but not ungranted costing or service start", () => {
  const composition = composeDashboard(new Set([
    "customers:read",
    "quotations:read",
    "services:read",
    "invoices:read",
    "payments:read",
    "supplier_bills:read",
    "supplier_payments:read",
    "expenses:read",
    "expenses:finance_review",
    "cash_advances:read",
    "cash_advances:issue",
  ]));

  assert.ok(ids(composition.widgets).includes("accounts-payable"));
  assert.ok(ids(composition.widgets).includes("accounts-receivable"));
  assert.ok(!ids(composition.widgets).includes("event-economics"));
  assert.ok(ids(composition.actionGroups).includes("expense-finance-review"));
  assert.ok(ids(composition.actionGroups).includes("cash-advance-issue"));
  assert.ok(!ids(composition.actionGroups).includes("service-start"));
  assert.ok(!ids(composition.actionGroups).includes("quotation-approval"));
});

test("operations-like, sales-like, and viewer-like permissions expose only their effective sources and actions", () => {
  const operations = composeDashboard(new Set([
    "services:read",
    "services:update_status",
    "quotations:read",
  ]));
  const sales = composeDashboard(new Set([
    "customers:read",
    "customers:write",
    "quotations:read",
    "quotations:write",
    "services:read",
    "services:write",
    "invoices:read",
    "payments:read",
  ]));
  const viewer = composeDashboard(new Set([
    "customers:read",
    "quotations:read",
    "services:read",
    "invoices:read",
    "payments:read",
  ]));

  assert.deepEqual(ids(operations.actionGroups), ["service-start"]);
  assert.ok(!ids(operations.widgets).includes("accounts-receivable"));
  assert.deepEqual(ids(sales.quickActions), ["new-customer", "new-quotation", "new-service"]);
  assert.deepEqual(ids(sales.actionGroups), ["invoice-follow-up"]);
  assert.deepEqual(ids(viewer.actionGroups), ["invoice-follow-up"]);
  assert.deepEqual(ids(viewer.quickActions), []);
  assert.ok(!ids(viewer.actionGroups).includes("expense-finance-review"));
  assert.ok(!ids(viewer.widgets).includes("accounts-payable"));
});

test("custom effective permissions compose independently of named role profiles", () => {
  const custom = composeDashboard(new Set([
    "quotations:read",
    "quotations:approve",
    "services:read",
    "supplier_costing:read",
    "invoices:read",
    "supplier_bills:read",
  ]));

  assert.ok(ids(custom.widgets).includes("event-economics"));
  assert.ok(!ids(custom.widgets).includes("accounts-payable"));
  assert.ok(ids(custom.actionGroups).includes("quotation-approval"));
  assert.ok(!ids(custom.actionGroups).includes("service-start"));
  assert.ok(ids(custom.actionGroups).includes("invoice-follow-up"));
});
