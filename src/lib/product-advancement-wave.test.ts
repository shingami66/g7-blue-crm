import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { sanitizeSearchTerm } from "./search/sanitize.ts";

const REPO_ROOT = join(import.meta.dirname, "../..");

function read(relativePath: string): string {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

test("quotation search exposes exactly number, customer, and Service modes", () => {
  const client = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const queries = read("src/lib/quotations/queries.ts");

  assert.match(client, /value: "quotationNumber"/);
  assert.match(client, /value: "customer"/);
  assert.match(client, /value: "service"/);
  assert.match(queries, /customers!inner/);
  assert.match(queries, /services!inner/);
  assert.match(queries, /getQuotationsList/);
});

test("invoice search exposes exactly number and customer modes", () => {
  const client = read("src/app/(dashboard)/invoices/InvoicesListClient.tsx");
  const queries = read("src/lib/invoices/queries.ts");

  assert.match(client, /value: "invoiceNumber"/);
  assert.match(client, /value: "customer"/);
  assert.match(queries, /customers!inner/);
  assert.match(queries, /invoice_number/);
  assert.match(queries, /getInvoicesList/);
});

test("Service search exposes number, name, and customer modes", () => {
  const client = read("src/app/(dashboard)/services/ServicesClient.tsx");
  const queries = read("src/lib/services/queries.ts");

  assert.match(client, /value: "serviceNumber"/);
  assert.match(client, /value: "serviceName"/);
  assert.match(client, /value: "customer"/);
  assert.match(queries, /service_title/);
  assert.match(queries, /customers!inner/);
  assert.match(queries, /getServicesList/);
});

test("list search inputs are normalized and bounded before server filtering", () => {
  assert.equal(sanitizeSearchTerm("  QT-1,%(demo)  "), "QT-1, (demo)");
  assert.equal(sanitizeSearchTerm("\u2068 INV-2026-0031 \u2069"), "INV-2026-0031");
  assert.equal(sanitizeSearchTerm("\u200eشركة O'Reilly & Sons\u200f"), "شركة O'Reilly & Sons");
  assert.equal(sanitizeSearchTerm("!!!"), "!!!");
  assert.equal(sanitizeSearchTerm("a".repeat(100)).length, 80);
});

test("unsupported search modes fail closed instead of selecting the first mode", () => {
  const serviceTypes = read("src/lib/services/types.ts");
  const invoiceTypes = read("src/lib/invoices/types.ts");
  const quotationTypes = read("src/lib/quotations/types.ts");
  assert.match(serviceTypes, /value === "serviceNumber" \|\| value === "serviceName" \|\| value === "customer"/);
  assert.match(invoiceTypes, /value === "invoiceNumber" \|\| value === "customer"/);
  assert.match(quotationTypes, /value === "quotationNumber" \|\| value === "customer" \|\| value === "service"/);
  assert.match(serviceTypes, /\| undefined/);
  assert.match(invoiceTypes, /\| undefined/);
  assert.match(quotationTypes, /\| undefined/);
});

test("quotation, invoice, and Service list changes reset pagination and preserve filters", () => {
  for (const relativePath of [
    "src/app/(dashboard)/quotations/QuotationsClient.tsx",
    "src/app/(dashboard)/invoices/InvoicesListClient.tsx",
    "src/app/(dashboard)/services/ServicesClient.tsx",
  ]) {
    const source = read(relativePath);
    assert.match(source, /navigate\([^\n]+,?\s*1\)/);
    assert.match(source, /\.\.\.query/);
    assert.match(source, /onReset/);
    assert.doesNotMatch(source, /matchesLocalSearch/);
  }
});

test("server list queries use permission gates, exact counts, deterministic ranges, and no browser filtering", () => {
  const queryFiles = [
    "src/lib/quotations/queries.ts",
    "src/lib/invoices/queries.ts",
    "src/lib/services/queries.ts",
  ];

  for (const relativePath of queryFiles) {
    const source = read(relativePath);
    assert.match(source, /requirePermission\([^\n]+:read/);
    assert.match(source, /count: "exact", head: true/);
    assert.match(source, /\.range\(/);
    assert.match(source, /\.order\("id"/);
  }
});

test("Supplier directory keeps phone, location fallback, mobile cards, and no Rating column", () => {
  const client = read("src/app/(dashboard)/suppliers/SuppliersClient.tsx");
  const queries = read("src/lib/suppliers/queries.ts");
  const mapper = read("src/lib/suppliers/mappers.ts");

  assert.match(queries, /phone/);
  assert.match(mapper, /phone:/);
  assert.match(client, /supplier\.phone/);
  assert.match(client, /supplier\.city \|\| supplier\.country/);
  assert.match(client, /lg:hidden/);
  assert.doesNotMatch(client, /columns\.rating|Rating/);
});

test("quotation rows use a dedicated eye action and keep the quotation number non-navigating", () => {
  const client = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");

  assert.match(client, /<Eye size=\{17\}/);
  assert.match(client, /actionTitles\.viewDetails/);
  assert.match(client, /push\(`/);
  assert.doesNotMatch(client, /<a[^>]*quotationNumber/);
  assert.doesNotMatch(client, /<tr[^>]+onClick=/);
});

test("detail record navigation is permission-scoped, bounded, localized, and return-context aware", () => {
  const navigation = read("src/lib/record-navigation/queries.ts");
  const control = read("src/components/records/RecordNavigation.tsx");
  const dictionary = read("src/lib/i18n/dictionaries/record-navigation.ts");

  assert.match(navigation, /requirePermission\("customers:read"\)/);
  assert.match(navigation, /requirePermission\("services:read"\)/);
  assert.match(navigation, /requirePermission\("quotations:read"\)/);
  assert.match(navigation, /requirePermission\("invoices:read"\)/);
  assert.match(navigation, /requirePermission\("suppliers:read"\)/);
  assert.match(navigation, /\.limit\(1\)/);
  assert.match(navigation, /safeRecordReturnTo/);
  assert.match(control, /disabled/);
  assert.match(control, /aria-disabled="true"/);
  assert.match(control, /returnTo/);
  assert.match(dictionary, /Record navigation/);
  assert.match(dictionary, /التنقل بين السجلات/);
});

test("record navigation is integrated on customer, Service, quotation, invoice, and supplier details", () => {
  const detailFiles = [
    "src/app/(dashboard)/customers/[id]/page.tsx",
    "src/app/(dashboard)/services/[id]/page.tsx",
    "src/app/(dashboard)/quotations/[id]/page.tsx",
    "src/app/(dashboard)/invoices/[id]/page.tsx",
    "src/app/(dashboard)/suppliers/[id]/page.tsx",
  ];

  for (const relativePath of detailFiles) {
    const source = read(relativePath);
    assert.match(source, /RecordNavigation/);
    assert.match(source, /get[A-Za-z]+RecordNavigation/);
    assert.match(source, /safeRecordReturnTo/);
  }
});

test("Dashboard layout marks the requested operational hierarchy and avoids equal-height stretching", () => {
  const page = read("src/app/(dashboard)/dashboard/page.tsx");

  assert.match(page, /data-dashboard-section="priority-work"/);
  assert.match(page, /data-dashboard-section="workflow"/);
  assert.match(page, /data-dashboard-section="quotations"/);
  assert.match(page, /items-start/);
  assert.match(page, /self-start/);
  assert.match(page, /DashboardFocusCard/);
});
