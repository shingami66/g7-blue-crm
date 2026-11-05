import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string) => { window: { document: Document } } };
const root = resolve(process.cwd(), "src");
const cache = new Map<string, Record<string, unknown>>();
const h = React.createElement;
let locale = "en";
let activeRoute = "/dashboard";
let legacyControl = false;
let settingsState: "ready" | "denied" | "unavailable" = "ready";
let navigationPending = false;
const permissions = new Set(["customers:read", "customers:write", "services:read", "services:write", "quotations:read", "quotations:write", "quotations:approve"]);
const forbiddenCall = () => { throw new Error("Heading render must not execute mutations or navigation"); };
const isolatedServerExports = new Proxy({ __esModule: true }, { get: (target, key) => key === "__esModule" ? target.__esModule : forbiddenCall });

// Actual page/client trees, dictionaries, headers, fields and navigation controls
// are rendered. Only server IO and Next transport are isolated; no UI is replaced.
function load(path: string): Record<string, unknown> {
  const file = [path, path + ".tsx", path + ".ts", resolve(path, "index.ts")].find(existsSync);
  assert.ok(file, `Missing test import: ${path}`);
  if (cache.has(file)) return cache.get(file)!;
  const compiled = { exports: {} as Record<string, unknown> };
  cache.set(file, compiled.exports);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const importModule = (name: string): unknown => {
    if (name === "server-only") return {};
    if (name === "next/navigation") return {
      useRouter: () => ({ push: forbiddenCall, replace: forbiddenCall, refresh: forbiddenCall }),
      usePathname: () => activeRoute, useSearchParams: () => new URLSearchParams(),
      redirect: forbiddenCall,
    };
    if (name === "next/link") return { __esModule: true,
      default: React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<{ href: string }>>(
        function TestLink({ children, ...props }, ref) { return h("a", { ...props, ref }, children); }),
      useLinkStatus: () => ({ pending: false }),
    };
    if (name === "@/lib/i18n/session-locale") return { getCurrentSessionEffectiveLocale: async () => locale };
    if (name === "@/lib/auth/permissions") return {
      requirePermission: async () => ({ id: "heading-test-user" }),
      checkPermission: async (permission: string) => permissions.has(permission),
    };
    if (name === "@/lib/settings") return { getCompanySettingsForPage: async () => {
      if (settingsState === "denied") {
        const { ForbiddenError } = load(resolve(root, "lib/auth/errors"));
        throw new (ForbiddenError as new (message: string) => Error)("Test denied");
      }
      return settingsState === "unavailable" ? { error: "settings_load_failed" } : settingsFixture;
    } };
    if (name === "@/lib/dashboard/queries") return {
      getDashboardCustomersData: async () => ({ totalCount: 1 }),
      getDashboardQuotationsData: async () => ({ totalCount: 1, recentQuotations: [] }),
      getDashboardServicesData: async () => ({ totalCount: 1, upcomingServices: [] }),
      getDashboardServiceLifecycleData: async () => ({ readyToStartCount: 0, inProgressCount: 1, readyToStartServices: [] }),
      getDashboardQuotationApprovalData: async () => ({ pendingQuotationApprovals: [{ id: "quote-fixture", quotationNumber: "QUO-TEST-001", status: "draft", createdAt: "2026-11-01T09:00:00Z", customer: { company: "Fixture" }, event: "Fixture event" }] }),
    };
    if (/\/actions(?:\.ts)?$|\/queries(?:\.ts)?$/.test(name)) return isolatedServerExports;
    if (name === "@/components/ui/PageHeader") {
      const Actual = component("components/ui/PageHeader");
      return { __esModule: true, default: (props: Record<string, unknown>) =>
        h(Actual, legacyControl ? { ...props, headingLevel: undefined } : props) };
    }
    if (name === "@/components/ui/useListNavigation") {
      const actual = load(resolve(root, "components/ui/useListNavigation"));
      return { useListNavigation: (key: string) => ({
        ...(actual.useListNavigation as (key: string) => object)(key),
        isPending: navigationPending, isSearchPending: navigationPending,
      }) };
    }
    if (name.startsWith("@/")) return load(resolve(root, name.slice(2)));
    if (name.startsWith(".")) return load(resolve(dirname(file), name));
    return require(name);
  };
  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}
function component(path: string) {
  return load(resolve(root, path)).default as React.ComponentType<Record<string, unknown>>;
}
function dictionary(name: string, getter: string): Record<string, unknown> {
  return (load(resolve(root, "lib/i18n/dictionaries", name))[getter] as (locale: string) => Record<string, unknown>)(locale);
}
function render(tree: React.ReactNode) {
  const Locale = load(resolve(root, "components/i18n/LocaleProvider")).LocaleProvider as React.ComponentType<React.PropsWithChildren<{ locale: string }>>;
  const html = renderToStaticMarkup(h(Locale, { locale }, h("main", { dir: locale === "ar" ? "rtl" : "ltr" }, tree)));
  return { html, doc: new JSDOM(html).window.document };
}
function assertTitle(doc: Document, title: string) {
  const headings = doc.querySelectorAll("main h1");
  assert.equal(headings.length, 1, activeRoute);
  assert.equal(headings[0].textContent, title, activeRoute);
  assert.ok(title.trim());
  assert.equal(headings[0].closest("[hidden], [aria-hidden=true], .sr-only"), null);
  assert.equal(doc.querySelector("main")!.getAttribute("dir"), locale === "ar" ? "rtl" : "ltr");
}
const pagination = { page: 1, pageSize: 10, total: 0, totalPages: 1 };
const settingsFixture = {
  canEdit: true, canViewBankDetails: true,
  settings: { id: null, settingKey: "default", legalNameEn: "Heading fixture", legalNameAr: "بيانات الاختبار",
    crNumber: "", tinNumber: null, vatMode: "not_registered", vatEffectiveDate: null, vatNumber: null,
    officialEmail: "", officialPhone: "", nationalAddress: "", bank: null, currency: "SAR",
    defaultVatPercent: 0, defaultTerms: "", createdAt: null, updatedAt: null },
};
const receipt = { paymentId: "receipt-fixture", paymentNumber: "RCPT-TEST-001", customerId: "customer-fixture",
  customerName: "عميل Test", date: "2026-11-01", amount: 100, method: "bank_transfer", reference: null,
  notes: null, allocatedAmount: 0, unappliedAmount: 100, receiptStatus: "unapplied", createdAt: "2026-11-01T09:00:00Z" };
const populatedLists: Record<string, Record<string, unknown>> = {
  "/customers": { customers: [{ id: "customer-fixture", company: "Fixture Customer", customerNumber: "CUST-TEST-001", contact: "Fixture", email: "", city: "Riyadh", status: "active", servicesCount: 1, totalQuotedAmount: 100 }] },
  "/suppliers": { suppliers: [{ id: "supplier-fixture", name: "Fixture Supplier", supplierNumber: "SUP-TEST-001", isPreferred: false, category: "other", supplierType: "company", city: "Riyadh", country: "SA", coverageArea: null, phone: "", status: "active" }] },
  "/services": { services: [{ id: "service-fixture", serviceNumber: "EVT-TEST-001", serviceTitle: "Fixture Event", eventName: "Fixture Event", customer: { company: "Fixture Customer" }, eventStartDate: "2026-11-01", status: "Inquiry", estimatedBudget: 100 }] },
  "/quotations": { quotations: [{ id: "quote-fixture", quotationNumber: "QUO-TEST-001", revisionNumber: 1, customer: { company: "Fixture Customer" }, event: "Fixture Event", date: "2026-11-01", grandTotal: 100, status: "draft", supersededAt: null }] },
  "/invoices": { initialInvoices: [{ id: "invoice-fixture", invoice_number: "INV-TEST-001", invoice_type: "deposit", document_label: null, customer: "Fixture Customer", issued_at: "2026-11-01", created_at: "2026-11-01", grand_total: 100, status: "draft" }] },
  "/payments": { payments: [{ id: "payment-fixture", paymentNumber: "PAY-TEST-001", date: "2026-11-01", customerName: "Fixture Customer", invoiceNumber: "INV-TEST-001", serviceLabel: "Fixture Event", amount: 100, method: "bank_transfer", status: "confirmed", reference: "Fixture" }] },
  "/supplier-bills": { bills: [{ id: "bill-fixture", bill_number: "BILL-TEST-001", invoice_number: "VENDOR-001", supplier_name: "Fixture Supplier", service_number: "EVT-TEST-001", event_name: "Fixture Event", service_title: "Fixture Event", invoice_date: "2026-11-01", total_amount: 100, status: "draft" }] },
  "/supplier-payments": { payments: [{ id: "payment-fixture", payment_number: "SPAY-TEST-001", supplier_bill_id: "bill-fixture", bill_number: "BILL-TEST-001", supplier_name: "Fixture Supplier", payment_date: "2026-11-01", amount: 100, method: "bank_transfer", status: "posted" }] },
  "/supplier-advances": { advances: [{ supplier_advance_id: "advance-fixture", advance_number: "SADV-TEST-001", supplier_name: "Fixture Supplier", service_number: "EVT-TEST-001", service_title: "Fixture Event", authorized_at: "2026-11-01", currency: "SAR", authorized_amount: 100, status: "authorized" }] },
};

function cases() {
  const list = (name: string, getter: string) => dictionary(name, getter);
  return [
    { route: "/customers", path: "customers/CustomersClient", dict: list("customers", "getCustomersDictionary"), props: { customers: [], cities: [], pagination, query: {}, canWrite: true, canExport: true } },
    { route: "/suppliers", path: "suppliers/SuppliersClient", dict: list("suppliers", "getSuppliersDictionary"), props: { suppliers: [], pagination, search: "", statusFilter: "all", categoryFilter: "all", canCreateSuppliers: true, canManageDeleted: true, showDeleted: false } },
    { route: "/services", path: "services/ServicesClient", dict: list("services", "getServicesDictionary"), props: { services: [], pagination, query: {}, canWrite: true } },
    { route: "/quotations", path: "quotations/QuotationsClient", dict: list("quotations", "getQuotationsDictionary"), props: { quotations: [], pagination, query: {}, canWrite: true, canSelectService: true, eligibleServices: [] } },
    { route: "/invoices", path: "invoices/InvoicesListClient", dict: list("invoices", "getInvoicesDictionary"), props: { initialInvoices: [], pagination, query: {}, canCreateInvoiceChooser: true } },
    { route: "/payments", path: "payments/PaymentsClient", dict: list("payments", "getPaymentsDictionary"), props: { payments: [], pagination, query: {} } },
    { route: "/payments/receipts", path: "payments/receipts/CustomerReceiptsClient", dict: list("customer-receipts", "getCustomerReceiptsDictionary"), props: { data: { receipts: [receipt], customers: [], pagination: { ...pagination, total: 1 } }, initialAllocationPage: { allocations: [], pagination }, query: { page: 1, pageSize: 10 } } },
    { route: "/supplier-bills", path: "supplier-bills/SupplierBillsClient", dict: list("supplier-bills", "getSupplierBillsDictionary"), props: { bills: [], pagination, canRecord: true, canApprove: true } },
    { route: "/supplier-payments", path: "supplier-payments/SupplierPaymentsClient", dict: list("supplier-payments", "getSupplierPaymentsDictionary"), props: { payments: [], pagination } },
    { route: "/supplier-advances", path: "supplier-advances/SupplierAdvancesClient", dict: list("supplier-advances", "getSupplierAdvancesDictionary"), props: { advances: [], pagination, canAuthorize: true } },
    { route: "/settings", path: "settings/SettingsForm", dict: list("settings", "getSettingsDictionary"), props: settingsFixture },
  ];
}

for (const language of ["en", "ar"]) {
  test(`${language}: all eleven delegated primary pages own one localized h1 and preserve their entire rendered UI`, () => {
    locale = language;
    for (const entry of cases()) {
      activeRoute = entry.route;
      const title = (entry.dict.list as { title?: string } | undefined)?.title
        ?? (entry.dict.page as { title?: string } | undefined)?.title ?? entry.dict.title as string;
      const tree = h(component(`app/(dashboard)/${entry.path}`), { ...entry.props, dictionary: entry.dict });
      legacyControl = false;
      const current = render(tree);
      assertTitle(current.doc, title);
      legacyControl = true;
      const previous = render(tree);
      legacyControl = false;
      assert.equal(current.html.replaceAll("<h1", "<h2").replaceAll("</h1>", "</h2>"), previous.html, entry.route);
      if (entry.route === "/payments/receipts") {
        assert.equal(current.doc.querySelector('h2[dir="ltr"]')!.textContent, `\u2068${receipt.paymentNumber}\u2069`);
        assert.ok(current.doc.querySelector("h3"));
      }
      if (entry.route === "/settings") assert.ok(current.doc.querySelector("#company-settings-form"));
    }
  });

  test(`${language}: actual Dashboard success retains its subordinate sections and actions`, async () => {
    locale = language; activeRoute = "/dashboard"; legacyControl = false;
    const Page = load(resolve(root, "app/(dashboard)/dashboard/page")).default as () => Promise<React.ReactNode>;
    const tree = await Page();
    const current = render(tree);
    const dict = dictionary("dashboard", "getDashboardDictionary");
    assertTitle(current.doc, (dict.header as { title: string }).title);
    for (const section of ["business-snapshot", "action-center", "operations-focus", "recent-activity"]) {
      assert.ok(current.doc.querySelector(`[data-dashboard-section="${section}"] h2`), section);
    }
    assert.ok(current.doc.querySelector('[data-dashboard-section="quick-actions"] a'));
    legacyControl = true;
    const previous = render(tree);
    legacyControl = false;
    assert.equal(current.html.replaceAll("<h1", "<h2").replaceAll("</h1>", "</h2>"), previous.html);
  });

  test(`${language}: populated list rows retain one page heading, actions and Supplier explicit View controls`, () => {
    locale = language; legacyControl = false;
    for (const entry of cases().filter((item) => populatedLists[item.route])) {
      activeRoute = entry.route;
      const props = { ...entry.props, ...populatedLists[entry.route], pagination: { ...pagination, total: 1 }, dictionary: entry.dict };
      const tree = h(component(`app/(dashboard)/${entry.path}`), props);
      const current = render(tree);
      const title = (entry.dict.list as { title?: string } | undefined)?.title ?? entry.dict.title as string;
      assertTitle(current.doc, title);
      assert.ok(current.doc.querySelectorAll("a,button").length > 0);
      legacyControl = true;
      const previous = render(tree);
      legacyControl = false;
      assert.equal(current.html.replaceAll("<h1", "<h2").replaceAll("</h1>", "</h2>"), previous.html, entry.route);
      if (entry.route === "/suppliers") {
        assert.ok([...current.doc.querySelectorAll('a[href^="/suppliers/supplier-fixture"]')].length >= 2);
        assert.ok([...current.doc.querySelectorAll("a")].every((link) => !link.textContent?.includes("Fixture Supplier")));
      }
    }
  });

  test(`${language}: list inline error and pending states retain the sole localized page heading`, () => {
    locale = language; activeRoute = "/services"; legacyControl = false;
    const entry = cases().find((item) => item.route === activeRoute)!;
    for (const pending of [false, true]) {
      navigationPending = pending;
      const { doc } = render(h(component(`app/(dashboard)/${entry.path}`), {
        ...entry.props, dictionary: entry.dict, loadError: "services_load_failed",
      }));
      assertTitle(doc, (entry.dict.list as { title: string }).title);
      assert.equal(Boolean(doc.querySelector('[aria-busy="true"]')), pending);
    }
    navigationPending = false;
  });

  test(`${language}: Settings success, access denied and unavailable keep exactly one existing page title`, async () => {
    locale = language; activeRoute = "/settings"; legacyControl = false;
    const Page = load(resolve(root, "app/(dashboard)/settings/page")).default as () => Promise<React.ReactNode>;
    const dict = dictionary("settings", "getSettingsDictionary");
    for (const state of ["ready", "denied", "unavailable"] as const) {
      settingsState = state;
      const { doc } = render(await Page());
      const states = dict.states as Record<string, string>;
      assertTitle(doc, state === "ready" ? (dict.page as { title: string }).title : state === "denied" ? states.accessDenied : states.unavailable);
      assert.equal(Boolean(doc.querySelector("form")), state === "ready");
    }
    settingsState = "ready";
  });
}
