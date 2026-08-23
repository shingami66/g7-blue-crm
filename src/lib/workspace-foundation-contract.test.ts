import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8");

test("transactional list surfaces use server-side Business Year and bounded search", () => {
  const files = [
    "src/lib/services/queries.ts",
    "src/lib/quotations/queries.ts",
    "src/lib/invoices/queries.ts",
    "src/lib/payments/queries.ts",
    "src/lib/customers/queries.ts",
  ];
  for (const file of files) {
    const source = read(file);
    assert.match(source, /count: "exact", head: true/);
    assert.match(source, /\.range\(/);
  }
  assert.match(read("src/lib/payments/queries.ts"), /payment_number[\s\S]*reference/);
  assert.match(read("src/lib/customers/queries.ts"), /customer_number[\s\S]*company[\s\S]*contact[\s\S]*phone[\s\S]*email/);
  assert.match(read("src/lib/invoices/queries.ts"), /issued_at/);
  assert.match(read("src/lib/reports/queries.ts"), /getBusinessYearBounds/);
});

test("Business Year predicates are paired across count and rows for dated lists", () => {
  const datedQueries = [
    ["src/lib/services/queries.ts", "getServiceBusinessYearFilter"],
    ["src/lib/quotations/queries.ts", "date"],
    ["src/lib/invoices/queries.ts", "date"],
    ["src/lib/payments/queries.ts", "date"],
  ] as const;
  for (const [file, column] of datedQueries) {
    const source = read(file);
    assert.match(source, file.includes("services/") ? /getServiceBusinessYearFilter/ : /getBusinessYearBounds/);
    assert.match(source, new RegExp(`countQuery[\\s\\S]*${column}`));
    assert.match(source, new RegExp(`dataQuery[\\s\\S]*${column}`));
  }
  assert.doesNotMatch(read("src/lib/customers/queries.ts"), /getBusinessYearBounds|yearBounds/);
  assert.doesNotMatch(read("src/lib/suppliers/queries.ts"), /getBusinessYearBounds|yearBounds/);

  const invoices = read("src/lib/invoices/queries.ts");
  const invoiceListScope = invoices.slice(
    invoices.indexOf("if (options.status && options.status !== \"all\")"),
    invoices.indexOf("if (searchFilter)")
  );
  assert.match(invoiceListScope, /countQuery = countQuery\.eq\("status", options\.status\)[\s\S]*dataQuery = dataQuery\.eq\("status", options\.status\)/);
  assert.match(invoiceListScope, /countQuery = countQuery\.gte\("date", yearBounds\.start\)[\s\S]*dataQuery = dataQuery\.gte\("date", yearBounds\.start\)/);
  assert.doesNotMatch(invoiceListScope, /issued_at/);
});

test("Business Year scope is limited to temporal list routes and persists through the server-readable preference", () => {
  const selector = read("src/components/i18n/BusinessYearSelector.tsx");
  const preference = read("src/lib/business-year-preference.ts");
  const options = read("src/lib/business-year-options.ts");
  const layout = read("src/app/(dashboard)/layout.tsx");
  const selectorData = read("src/components/i18n/BusinessYearSelectorData.tsx");
  const topbar = read("src/components/layout/Topbar.tsx");
  assert.match(selector, /YEAR_SCOPED_LIST_PATHS/);
  assert.doesNotMatch(selector, /dashboard/);
  assert.doesNotMatch(selector, /startsWith/);
  assert.match(selector, /BUSINESS_YEAR_COOKIE/);
  assert.match(preference, /cookies\(\)/);
  assert.match(options, /event_start_date/);
  assert.match(options, /event_end_date/);
  assert.match(layout, /Suspense/);
  assert.match(layout, /BusinessYearSelectorData/);
  assert.doesNotMatch(layout, /getBusinessYearOptions|getBusinessYearPreference/);
  assert.match(selectorData, /Promise\.all/);
  assert.match(selectorData, /getBusinessYearOptions/);
  assert.match(selectorData, /getBusinessYearPreference/);
  assert.match(selectorData, /BusinessYearSelector years=\{years\} preferredYear=\{preferredYear\}/);
  assert.match(topbar, /businessYearSelector: ReactNode/);
  assert.match(topbar, /isSignedIn \? businessYearSelector : null/);
  for (const file of [
    "src/app/(dashboard)/services/page.tsx",
    "src/app/(dashboard)/quotations/page.tsx",
    "src/app/(dashboard)/invoices/page.tsx",
    "src/app/(dashboard)/payments/page.tsx",
    "src/app/(dashboard)/reports/page.tsx",
  ]) {
    assert.match(read(file), /getBusinessYearPreference/);
  }
});

test("Dashboard remains global and does not consume or propagate Business Year", () => {
  const dashboard = read("src/app/(dashboard)/dashboard/page.tsx");
  assert.doesNotMatch(dashboard, /parseBusinessYear|cleanBusinessYearParam|yearQuery|selectedYear/);
  assert.match(dashboard, /scope: "global"/);
  assert.match(dashboard, /yearScoped: false/);
  assert.match(dashboard, /getDashboardQuotationsData/);
  assert.match(dashboard, /getDashboardInvoicesData/);
  assert.match(dashboard, /getDashboardServicesData/);
  assert.match(dashboard, /getDashboardPaymentsData/);
});

test("Business Year preserves authoritative temporal fields and keeps supplier reports unscoped", () => {
  const invoices = read("src/lib/invoices/queries.ts");
  const quotations = read("src/lib/quotations/queries.ts");
  const payments = read("src/lib/payments/queries.ts");
  const reports = read("src/lib/reports/queries.ts");
  assert.match(quotations, /getBusinessYearBounds[\s\S]*\.gte\("date"/);
  assert.match(invoices, /getBusinessYearBounds[\s\S]*\.gte\("date"/);
  assert.doesNotMatch(invoices.slice(invoices.indexOf("if (options.year)"), invoices.indexOf("if (searchFilter)")), /created_at/);
  assert.match(payments, /getBusinessYearBounds[\s\S]*\.gte\("date"/);
  assert.match(reports, /serviceDateFilter/);
  assert.match(reports, /dateFilter\(allocationQuery, filters, "created_at", false\)/);
  assert.match(reports, /dateFilter\(bookingQuery, filters, "created_at", false\)/);
});

test("list pages keep one clear control and preserve Business Year in URLs", () => {
  for (const file of [
    "src/app/(dashboard)/customers/CustomersClient.tsx",
    "src/app/(dashboard)/services/ServicesClient.tsx",
    "src/app/(dashboard)/quotations/QuotationsClient.tsx",
    "src/app/(dashboard)/invoices/InvoicesListClient.tsx",
    "src/app/(dashboard)/payments/PaymentsClient.tsx",
    "src/app/(dashboard)/suppliers/SuppliersClient.tsx",
  ]) {
    const source = read(file);
    assert.doesNotMatch(source, /resetLabel|onReset/);
  }
  assert.match(read("src/components/i18n/BusinessYearSelector.tsx"), /router\.replace/);
  assert.match(read("src/app/(dashboard)/layout.tsx"), /BusinessYearSelectorData/);
  const yearSelector = read("src/components/i18n/BusinessYearSelector.tsx");
  assert.match(yearSelector, /params\.delete\("page"\)/);
  assert.match(yearSelector, /params\.delete\("month"\)/);
  assert.match(yearSelector, /params\.delete\("from"\)/);
  assert.match(yearSelector, /params\.delete\("to"\)/);
  assert.doesNotMatch(yearSelector, /\/customers|\/suppliers/);
});

test("Dashboard separates financial activity from attention and Customer 360 avoids sentinel destinations", () => {
  const dashboard = read("src/app/(dashboard)/dashboard/page.tsx");
  const customerQueries = read("src/lib/customer-360/queries.ts");
  assert.match(dashboard, /data-dashboard-section="recent-activity"/);
  assert.doesNotMatch(dashboard.slice(dashboard.indexOf("data-dashboard-section=\"priority-work\""), dashboard.indexOf("data-dashboard-section=\"quotations\"")), /recentPayments/);
  assert.doesNotMatch(customerQueries, /payment=\$\{encodeURIComponent\(payment\.id\)\}/);
});

test("Dashboard widget definitions carry future role-ready composition metadata", () => {
  const dashboard = read("src/app/(dashboard)/dashboard/page.tsx");
  for (const field of ["id", "readPermission", "scope", "sensitivity", "displayPriority", "emptyState", "destination", "yearScoped"]) {
    assert.match(dashboard, new RegExp(`\\b${field}:`));
  }
  assert.match(dashboard, /as const satisfies Record<string, DashboardWidgetDefinition>/);
});

test("Reports do not select supplier cost fields without the existing cost permission", () => {
  const reports = read("src/lib/reports/queries.ts");
  assert.match(reports, /const allocationSelect = canReadCost \?/);
  assert.match(reports, /const bookingSelect = canReadCost \?/);
  assert.match(reports, /supplier_allocations:read_cost/);
});

test("Customer list navigation preserves the active server-list context", () => {
  const customers = read("src/app/(dashboard)/customers/CustomersClient.tsx");
  assert.match(customers, /const returnTo = customerListHref\(\{\}, pagination\.page\)/);
  assert.match(customers, /encodeURIComponent\(returnTo\)/);
  assert.doesNotMatch(customers, /returnTo=%2Fcustomers/);
});

test("Customer 360 sanitizes sentinel and invalid calendar dates before presentation", () => {
  const queries = read("src/lib/customer-360/queries.ts");
  const workspace = read("src/app/(dashboard)/customers/[id]/Customer360Workspace.tsx");
  assert.match(queries, /safeCustomerDate/);
  assert.match(queries, /9999\|0000/);
  assert.match(workspace, /UiDateText/);
  assert.doesNotMatch(workspace, /9999|0000-00-00/);
});
