import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  navigationDictionaryAr,
  navigationDictionaryEn,
} from "../../lib/i18n/dictionaries/navigation.ts";
import { getReportDefinitions } from "../../lib/reports/catalog.ts";
import { getReportCenterDictionary } from "../../lib/i18n/dictionaries/report-center.ts";
import type { ReportNavigationItem } from "../../lib/reports/types.ts";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string, options?: { url: string }) => { window: Window & typeof globalThis } };
const tsUrl = pathToFileURL(require.resolve("typescript")).href;

const nextNavDataUrl =
  "data:text/javascript," +
  encodeURIComponent(
    [
      'export function usePathname() { return globalThis.__mockPathname || "/customers"; }',
      "export function useRouter() { return { push: () => {}, replace: () => {}, refresh: () => {} }; }",
      "export function useSearchParams() { return new URLSearchParams(); }",
      "export function useParams() { return {}; }",
    ].join("\n"),
  );

const nextLinkDataUrl =
  "data:text/javascript," +
  encodeURIComponent(
    [
      'import { createElement as createElem } from "react";',
      "export default function Link({ href, children, ...props }) {",
      '  const targetHref = typeof href === "string" ? href : href?.pathname ?? "";',
      '  return createElem("a", { href: targetHref, ...props }, children);',
      "}",
      "export function useLinkStatus() {",
      "  return { pending: false };",
      "}",
    ].join("\n"),
  );

const testModuleLoader = `
import ts from ${JSON.stringify(tsUrl)};
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export default {}", shortCircuit: true };
  }
  if (specifier === "next/navigation") {
    return { url: ${JSON.stringify(nextNavDataUrl)}, shortCircuit: true };
  }
  if (specifier === "next/link") {
    return { url: ${JSON.stringify(nextLinkDataUrl)}, shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const rel = specifier.slice(2);
    const basePath = join(process.cwd(), "src", rel);
    if (existsSync(basePath + ".tsx")) {
      return { url: pathToFileURL(basePath + ".tsx").href, shortCircuit: true };
    }
    if (existsSync(basePath + ".ts")) {
      return { url: pathToFileURL(basePath + ".ts").href, shortCircuit: true };
    }
  }
  if (specifier.startsWith(".")) {
    const parentDir = context.parentURL ? fileURLToPath(new URL(".", context.parentURL)) : process.cwd();
    const candidate = join(parentDir, specifier);
    if (existsSync(candidate + ".tsx")) {
      return { url: pathToFileURL(candidate + ".tsx").href, shortCircuit: true };
    }
    if (existsSync(candidate + ".ts")) {
      return { url: pathToFileURL(candidate + ".ts").href, shortCircuit: true };
    }
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && (url.endsWith(".tsx") || url.endsWith(".ts"))) {
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    return {
      format: "module",
      shortCircuit: true,
      source: transpiled.outputText,
    };
  }
  return nextLoad(url, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

mock.module("next/navigation", {
  namedExports: {
    usePathname: () => (globalThis as unknown as { __mockPathname?: string }).__mockPathname || "/customers",
    useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  },
});

mock.module("next/link", {
  defaultExport: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
  namedExports: {
    useLinkStatus: () => ({ pending: false }),
  },
});

const { default: Sidebar } = await import("./Sidebar.tsx");
const { LocaleProvider } = await import("../i18n/LocaleProvider.tsx");
const TestLocaleProvider = LocaleProvider as React.ComponentType<{ locale: "en" | "ar"; children?: React.ReactNode }>;

function renderSidebar(props: {
  isAdmin?: boolean;
  canViewAccounting?: boolean;
  canManageArBridge?: boolean;
  canReconcileBank?: boolean;
  canReadSupplierBills?: boolean;
  canReadSupplierPayments?: boolean;
  canReadSupplierAdvances?: boolean;
  canAccessAccountingSetup?: boolean;
  shellDirection?: "ltr" | "rtl";
  currentPathname?: string;
  locale?: "en" | "ar";
  authorizedReports?: ReportNavigationItem[];
} = {}) {
  const { locale = "en", authorizedReports, ...sidebarProps } = props;
  const reportItems = authorizedReports ?? getReportDefinitions(locale).map(({ key, title, route }) => ({ key, title, route }));
  return renderToStaticMarkup(
    React.createElement(
      TestLocaleProvider,
      { locale },
      React.createElement(Sidebar, { ...sidebarProps, authorizedReports: reportItems }),
    ),
  );
}

const ALL_SECTION_KEYS = [
  "customersAndSales",
  "suppliersAndProcurement",
  "billingAndPayments",
  "expensesAndCosting",
  "reports",
  "administration",
] as const;

function getSectionExpandedState(html: string, sectionKey: string): boolean {
  const match = html.match(new RegExp(`id="nav-section-trigger-${sectionKey}"[^>]*aria-expanded="(true|false)"`));
  if (!match) {
    throw new Error(`Trigger for section ${sectionKey} not found in html`);
  }
  return match[1] === "true";
}

test("W5-A11Y-001: mobile sidebar exposes accessible disclosure button, closed-drawer hidden/invisible semantics, and desktop visibility", () => {
  const html = renderSidebar({ isAdmin: false, shellDirection: "ltr", currentPathname: "/customers" });

  // Trigger button disclosure semantics
  assert.ok(html.includes('aria-expanded="false"'), "Trigger button must be collapsed by default");
  assert.ok(html.includes('aria-controls="mobile-sidebar-nav"'), "Trigger must control mobile sidebar nav element");
  assert.ok(
    html.includes(`aria-label="${navigationDictionaryEn.menu.open}"`),
    "Trigger button must have accessible open label when collapsed",
  );

  // Nav element landmark and identity
  assert.ok(html.includes('id="mobile-sidebar-nav"'), "Sidebar must have mobile-sidebar-nav ID");
  assert.ok(
    html.includes(`aria-label="${navigationDictionaryEn.menu.mainNavigation}"`),
    "Nav element must have accessible main navigation label",
  );

  // Closed mobile state: invisible on mobile to remove from tab order and screen readers, visible on desktop
  assert.ok(
    html.includes("invisible md:visible"),
    "Closed mobile sidebar must use invisible md:visible to stay non-focusable on mobile while preserving desktop visibility",
  );
  assert.ok(
    html.includes("-translate-x-full md:translate-x-0"),
    "Sidebar must slide offscreen on mobile and reset to normal position on desktop",
  );

  // Backdrop overlay is not rendered when collapsed
  assert.ok(!html.includes("bg-black/50"), "Backdrop overlay must not be rendered when drawer is closed");

  // Core navigation links rendered
  assert.ok(html.includes('href="/dashboard"'));
  assert.ok(html.includes('href="/customers"'));
  assert.ok(html.includes('href="/services"'));
  assert.ok(html.includes('href="/quotations"'));
  assert.ok(html.includes('href="/invoices"'));
  assert.ok(html.includes('href="/suppliers"'));
  assert.ok(html.includes('href="/payments"'));
  assert.ok(html.includes('href="/reports"'));
  assert.ok(html.includes('href="/settings"'));

  // Non-admin view must not render admin links
  assert.ok(!html.includes('href="/admin/users"'), "Non-admin view must not render admin links");
});

test("journal operations navigation is shown only with accounting view authority", () => {
  const allowed = renderSidebar({
    canViewAccounting: true,
    currentPathname: "/accounting/journals",
  });
  assert.ok(allowed.includes('href="/accounting/journals"'));
  assert.ok(allowed.includes("Journal Operations"));
  assert.match(allowed, /nav-section-trigger-accountingOperations[^>]*aria-expanded="true"/);

  const denied = renderSidebar({
    canViewAccounting: false,
    currentPathname: "/accounting/journals",
  });
  assert.ok(!denied.includes('href="/accounting/journals"'));
});

test("AAR-D7 navigation exposes bank reconciliation to reconcile-only users and period close to accounting viewers", () => {
  const reconcileOnly = renderSidebar({ canReconcileBank: true, currentPathname: "/accounting/bank-reconciliation" });
  assert.ok(reconcileOnly.includes('href="/accounting/bank-reconciliation"'));
  assert.ok(!reconcileOnly.includes('href="/accounting/journals"'));
  assert.ok(!reconcileOnly.includes('href="/accounting/period-close"'));

  const accountingViewer = renderSidebar({ canViewAccounting: true, currentPathname: "/accounting/period-close" });
  assert.ok(accountingViewer.includes('href="/accounting/bank-reconciliation"'));
  assert.ok(accountingViewer.includes('href="/accounting/period-close"'));
  assert.match(accountingViewer, /nav-section-trigger-accountingOperations[^>]*aria-expanded="true"/);

  const arabicRtl = renderSidebar({ canReconcileBank: true, currentPathname: "/accounting/bank-reconciliation", locale: "ar", shellDirection: "rtl" });
  assert.ok(arabicRtl.includes("تسوية البنك"));
});

test("AR bridge navigation is available to scoped managers without exposing other accounting operations", () => {
  const managerOnly = renderSidebar({ canManageArBridge: true, currentPathname: "/accounting/ar-bridge" });
  assert.ok(managerOnly.includes('href="/accounting/ar-bridge"'));
  assert.ok(managerOnly.includes(navigationDictionaryEn.modules.accountsReceivableBridge));
  assert.ok(!managerOnly.includes('href="/accounting/journals"'));
  assert.ok(!managerOnly.includes('href="/accounting/bank-reconciliation"'));
  assert.ok(!managerOnly.includes('href="/accounting/period-close"'));

  const denied = renderSidebar({ currentPathname: "/accounting/ar-bridge" });
  assert.ok(!denied.includes('href="/accounting/ar-bridge"'));

  const arabicRtl = renderSidebar({
    canManageArBridge: true,
    currentPathname: "/accounting/ar-bridge",
    locale: "ar",
    shellDirection: "rtl",
  });
  assert.ok(arabicRtl.includes(navigationDictionaryAr.modules.accountsReceivableBridge));
  assert.ok(arabicRtl.includes('dir="rtl"'));
});

test("Accounts Payable preserves the permission-filtered accordion for zero, one, two, and three children", () => {
  const noAccess = renderSidebar({ currentPathname: "/supplier-bills" });
  assert.ok(!noAccess.includes('id="nav-section-trigger-accountsPayable"'));

  const billsOnly = renderSidebar({ canReadSupplierBills: true, currentPathname: "/supplier-bills" });
  assert.equal(getSectionExpandedState(billsOnly, "accountsPayable"), true);
  assert.ok(billsOnly.includes('id="nav-section-content-accountsPayable"'));
  assert.ok(billsOnly.includes('href="/supplier-bills"'));
  assert.ok(!billsOnly.includes('href="/supplier-payments"'));
  assert.ok(!billsOnly.includes('href="/supplier-advances"'));

  const billsAndPayments = renderSidebar({
    canReadSupplierBills: true,
    canReadSupplierPayments: true,
    currentPathname: "/supplier-bills",
  });
  assert.ok(billsAndPayments.includes('href="/supplier-bills"'));
  assert.ok(billsAndPayments.includes('href="/supplier-payments"'));
  assert.ok(!billsAndPayments.includes('href="/supplier-advances"'));

  const allPayables = renderSidebar({
    canReadSupplierBills: true,
    canReadSupplierPayments: true,
    canReadSupplierAdvances: true,
    currentPathname: "/supplier-bills",
  });
  for (const route of ["/supplier-bills", "/supplier-payments", "/supplier-advances"]) {
    assert.ok(allPayables.includes(`href="${route}"`));
  }
});

test("1. Dashboard remains standalone and the Reports accordion follows report-route state", () => {
  const dashHtml = renderSidebar({ currentPathname: "/dashboard" });
  for (const key of ALL_SECTION_KEYS) {
    assert.equal(getSectionExpandedState(dashHtml, key), false, `Section ${key} must be collapsed on /dashboard`);
  }
  assert.ok(dashHtml.includes('href="/dashboard"') && dashHtml.includes("border-tertiary-fixed"));
  assert.ok(dashHtml.includes('href="/dashboard" aria-current="page"'));
  assert.ok(!dashHtml.includes('href="/customers" aria-current="page"'));

  const reportsHtml = renderSidebar({ currentPathname: "/reports" });
  assert.equal(getSectionExpandedState(reportsHtml, "reports"), true, "Reports accordion must expand on /reports");
  assert.ok(reportsHtml.includes(`href="/reports"`));
  assert.ok(reportsHtml.includes(`>${getReportCenterDictionary("en").title}<`));
  assert.ok(reportsHtml.includes('href="/reports" aria-current="page"'));
  assert.ok(!reportsHtml.includes('href="/reports/'));

  const noReportsHtml = renderSidebar({ currentPathname: "/reports", authorizedReports: [] });
  assert.ok(!noReportsHtml.includes('id="nav-section-trigger-reports"'), "Reports section must be hidden with no authorized reports");
  assert.ok(!noReportsHtml.includes('href="/reports"'));
});

test("Reports keeps only localized Report Center for one or many authorized reports and hides for none", () => {
  for (const locale of ["en", "ar"] as const) {
    const definitions = getReportDefinitions(locale);
    for (const authorizedReports of [[], definitions.slice(0, 1), definitions]) {
      const html = renderSidebar({ currentPathname: "/reports", locale, shellDirection: locale === "ar" ? "rtl" : "ltr", authorizedReports });
      const doc = new JSDOM(html).window.document;
      const trigger = doc.getElementById("nav-section-trigger-reports");
      if (authorizedReports.length === 0) {
        assert.equal(trigger, null);
        assert.equal(doc.querySelector('a[href="/reports"]'), null);
        continue;
      }
      assert.equal(trigger!.tagName, "BUTTON");
      assert.equal(trigger!.getAttribute("aria-expanded"), "true");
      assert.equal(trigger!.getAttribute("aria-controls"), "nav-section-content-reports");
      assert.equal(trigger!.textContent, locale === "ar" ? "التقارير" : "Reports");
      const links = doc.querySelectorAll("#nav-section-content-reports a");
      assert.equal(links.length, 1);
      assert.equal(links[0].getAttribute("href"), "/reports");
      assert.equal(links[0].textContent, locale === "ar" ? "مركز التقارير" : "Report Center");
      assert.equal(links[0].getAttribute("aria-current"), "page");
      assert.equal(doc.querySelectorAll('a[href^="/reports/"]').length, 0);
    }
  }
});

test("all seven individual report routes expand Reports without activating Report Center", () => {
  for (const locale of ["en", "ar"] as const) {
    const definitions = getReportDefinitions(locale);
    for (const { route } of definitions) {
      const html = renderSidebar({ currentPathname: route, locale, shellDirection: locale === "ar" ? "rtl" : "ltr", authorizedReports: definitions });
      assert.equal(getSectionExpandedState(html, "reports"), true);
      assert.ok(html.includes('href="/reports"'));
      assert.ok(!html.includes('href="/reports" aria-current="page"'));
      assert.ok(!html.includes('href="/reports/'));
    }
  }
});

test("Reports retains its current-section highlight through manual collapse, route changes and mobile drawer interaction", async () => {
  const dom = new JSDOM("<!doctype html><html><body><div id='root'></div></body></html>", { url: "http://localhost" });
  const globals = { window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, IS_REACT_ACT_ENVIRONMENT: true };
  const original = new Map(Object.keys(globals).map((name) => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
  const { createRoot } = await import("react-dom/client");
  const container = dom.window.document.getElementById("root")!;
  const root = createRoot(container);
  const click = async (element: Element) => React.act(() => { element.dispatchEvent(new dom.window.MouseEvent("click", { bubbles: true })); });
  try {
    for (const locale of ["en", "ar"] as const) {
      const render = async (pathname: string) => React.act(() => root.render(React.createElement(TestLocaleProvider, { locale }, React.createElement(Sidebar, {
        currentPathname: pathname, shellDirection: locale === "ar" ? "rtl" : "ltr", authorizedReports: getReportDefinitions(locale),
      }))));
      await render("/reports/accounts-receivable");
      const reports = container.querySelector("#nav-section-trigger-reports")!;
      const center = container.querySelector('a[href="/reports"]')!;
      assert.equal(reports.getAttribute("aria-expanded"), "true");
      assert.equal(center.getAttribute("aria-current"), null);
      await click(reports);
      assert.equal(reports.getAttribute("aria-expanded"), "false");
      assert.ok(reports.classList.contains("text-white"), "current Reports section stays identified when collapsed");
      assert.ok(container.querySelector("#nav-section-content-reports")!.hasAttribute("hidden"));
      await click(container.querySelector("#nav-section-trigger-customersAndSales")!);
      assert.equal(reports.getAttribute("aria-expanded"), "false");
      assert.ok(reports.classList.contains("text-white"));
      await render("/reports");
      assert.equal(reports.getAttribute("aria-expanded"), "true");
      assert.equal(center.getAttribute("aria-current"), "page");
      assert.equal(container.querySelectorAll('button[id^="nav-section-trigger-"][aria-expanded="true"]').length, 1);

      const menu = container.querySelector('button[aria-controls="mobile-sidebar-nav"]')!;
      await click(menu);
      assert.equal(menu.getAttribute("aria-expanded"), "true");
      await React.act(() => { dom.window.dispatchEvent(new dom.window.KeyboardEvent("keydown", { key: "Escape", bubbles: true })); });
      assert.equal(menu.getAttribute("aria-expanded"), "false");
      assert.equal(dom.window.document.activeElement, menu);
      await click(menu);
      await click(center);
      assert.equal(menu.getAttribute("aria-expanded"), "false");
      assert.equal(dom.window.document.activeElement, menu);
    }
  } finally {
    await React.act(() => root.unmount());
    for (const [name, descriptor] of original) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    dom.window.close();
  }
});

test("2 & 3. Customers & Sales orders Customers, Quotations, and Events", () => {
  const html = renderSidebar({ currentPathname: "/customers" });

  assert.equal(getSectionExpandedState(html, "customersAndSales"), true, "Customers & Sales must be expanded on /customers");
  assert.ok(!html.includes('id="nav-section-trigger-operations"'), "The Operations section must not render in the Sidebar");
  assert.ok(html.includes('id="nav-section-content-customersAndSales"'));
  assert.ok(html.includes('href="/services"'));
  assert.ok(html.indexOf('href="/customers"') < html.indexOf('href="/quotations"'));
  assert.ok(html.indexOf('href="/quotations"') < html.indexOf('href="/services"'));
  assert.ok(html.includes('href="/customers" aria-current="page"'));

  const quotationsHtml = renderSidebar({ currentPathname: "/quotations" });
  assert.equal(getSectionExpandedState(quotationsHtml, "customersAndSales"), true);
  assert.ok(quotationsHtml.includes('href="/quotations" aria-current="page"'));
});

test("4. /services expands Customers & Sales and activates Events", () => {
  const html = renderSidebar({ currentPathname: "/services" });

  assert.equal(getSectionExpandedState(html, "customersAndSales"), true, "Customers & Sales must expand on /services");
  assert.ok(!html.includes('id="nav-section-trigger-operations"'), "The Operations section must not render in the Sidebar");
  assert.ok(html.includes('id="nav-section-content-customersAndSales"'));
  assert.ok(html.indexOf('href="/customers"') < html.indexOf('href="/quotations"'));
  assert.ok(html.indexOf('href="/quotations"') < html.indexOf('href="/services"'));
  assert.ok(html.includes('href="/services" aria-current="page"'));
  assert.ok(!html.includes(">Operations<"));
});

test("5. /suppliers expands Suppliers & Procurement accordion and activates Suppliers", () => {
  const html = renderSidebar({ currentPathname: "/suppliers" });

  assert.equal(getSectionExpandedState(html, "suppliersAndProcurement"), true, "Suppliers & Procurement must be expanded on /suppliers");
  assert.ok(html.includes('id="nav-section-content-suppliersAndProcurement"'));
  assert.ok(html.includes('href="/suppliers"'));
});

test("6. /invoices and /payments map to Billing & Payments accordion", () => {
  const invHtml = renderSidebar({ currentPathname: "/invoices" });
  assert.equal(getSectionExpandedState(invHtml, "billingAndPayments"), true, "Billing & Payments must be expanded on /invoices");
  assert.equal(getSectionExpandedState(invHtml, "customersAndSales"), false, "Customers & Sales must be collapsed on /invoices");
  assert.ok(invHtml.includes('id="nav-section-content-billingAndPayments"'));
  assert.ok(invHtml.includes('href="/invoices"'));
  assert.ok(invHtml.includes('href="/payments"'));

  const payHtml = renderSidebar({ currentPathname: "/payments" });
  assert.equal(getSectionExpandedState(payHtml, "billingAndPayments"), true, "Billing & Payments must be expanded on /payments");
});

test("7. /settings maps to Administration accordion", () => {
  const html = renderSidebar({ currentPathname: "/settings", isAdmin: false });

  assert.equal(getSectionExpandedState(html, "administration"), true, "Administration must be expanded on /settings");
  assert.equal(getSectionExpandedState(html, "billingAndPayments"), false, "Billing & Payments must be collapsed on /settings");
  assert.ok(html.includes('id="nav-section-content-administration"'));
  assert.ok(html.includes('href="/settings"'));
});

test("8. Administration renders Settings for all, but Users appears only for admin", () => {
  // Non-admin view
  const nonAdminHtml = renderSidebar({ isAdmin: false, currentPathname: "/settings" });
  assert.ok(nonAdminHtml.includes('href="/settings"'), "Settings must be rendered for non-admin");
  assert.ok(!nonAdminHtml.includes('href="/admin/users"'), "Users must NOT render for non-admin");

  // Admin view
  const adminHtml = renderSidebar({ isAdmin: true, currentPathname: "/admin/users" });
  assert.equal(getSectionExpandedState(adminHtml, "administration"), true, "Administration must be expanded on /admin/users");
  assert.ok(adminHtml.includes('href="/settings"'), "Settings must be rendered for admin");
  assert.ok(adminHtml.includes('href="/admin/users"'), "Users must be rendered for admin");
  assert.ok(adminHtml.includes(navigationDictionaryEn.sections.administration), "Administration header must be rendered");
});

test("Accounting setup navigation is permission-gated and localized", () => {
  const hidden = renderSidebar({ isAdmin: true, canAccessAccountingSetup: false, currentPathname: "/settings" });
  assert.ok(!hidden.includes('href="/settings/accounting"'));

  const accountingOnly = renderSidebar({
    canAccessAccountingSetup: true,
    currentPathname: "/settings/accounting",
  });
  const accountingOnlyDoc = new JSDOM(accountingOnly).window.document;
  const accountingOnlyLinks = accountingOnlyDoc.querySelectorAll("#nav-section-content-accountingOperations a");
  assert.equal(getSectionExpandedState(accountingOnly, "accountingOperations"), true);
  assert.equal(getSectionExpandedState(accountingOnly, "administration"), false);
  assert.deepEqual([...accountingOnlyLinks].map((link) => link.getAttribute("href")), ["/settings/accounting"]);
  assert.equal(accountingOnlyDoc.querySelectorAll('a[href="/settings/accounting"]').length, 1);
  assert.equal(accountingOnlyDoc.querySelector('a[href="/settings/accounting"]')?.getAttribute("aria-current"), "page");
  assert.equal(accountingOnlyDoc.querySelector('a[href="/settings"]')?.getAttribute("aria-current"), null);

  const english = renderSidebar({
    canViewAccounting: true,
    canManageArBridge: true,
    canReconcileBank: true,
    canAccessAccountingSetup: true,
    currentPathname: "/settings/accounting",
  });
  const englishDoc = new JSDOM(english).window.document;
  const accountingLinks = englishDoc.querySelectorAll("#nav-section-content-accountingOperations a");
  assert.deepEqual([...accountingLinks].map((link) => link.getAttribute("href")), [
    "/accounting/journals",
    "/accounting/ar-bridge",
    "/accounting/bank-reconciliation",
    "/accounting/period-close",
    "/settings/accounting",
  ]);
  assert.equal(getSectionExpandedState(english, "accountingOperations"), true);
  assert.equal(getSectionExpandedState(english, "administration"), false);
  assert.equal(englishDoc.querySelectorAll('a[href="/settings/accounting"]').length, 1);
  assert.match(english, /href="\/settings\/accounting"[^>]*aria-current="page"/);

  const admin = renderSidebar({
    isAdmin: true,
    canAccessAccountingSetup: true,
    currentPathname: "/settings",
  });
  const adminDoc = new JSDOM(admin).window.document;
  const administrationLinks = adminDoc.querySelectorAll("#nav-section-content-administration a");
  assert.deepEqual([...administrationLinks].map((link) => link.getAttribute("href")), ["/settings", "/admin/users"]);
  assert.equal(adminDoc.querySelectorAll('a[href="/settings/accounting"]').length, 1);

  const arabic = renderSidebar({
    canAccessAccountingSetup: true,
    currentPathname: "/settings/accounting",
    locale: "ar",
    shellDirection: "rtl",
  });
  assert.ok(arabic.includes(navigationDictionaryAr.modules.accounting));
  assert.match(arabic, /href="\/settings\/accounting"[^>]*aria-current="page"/);
  assert.ok(arabic.includes('dir="rtl"'));
});

test("all Accounting Setup routes expand Accounting and activate only the Accounting Setup link", () => {
  const routes = [
    "/settings/accounting",
    "/settings/accounting/chart-of-accounts",
    "/settings/accounting/periods",
    "/settings/accounting/posting-rules",
    "/settings/accounting/statement-mappings",
    "/settings/accounting/permissions",
    "/settings/accounting/inception",
    "/settings/accounting/inception/package-1",
  ];

  for (const currentPathname of routes) {
    const html = renderSidebar({ canAccessAccountingSetup: true, currentPathname });
    const doc = new JSDOM(html).window.document;
    assert.equal(getSectionExpandedState(html, "accountingOperations"), true, currentPathname);
    assert.equal(getSectionExpandedState(html, "administration"), false, currentPathname);
    assert.equal(doc.querySelectorAll('a[href="/settings/accounting"]').length, 1, currentPathname);
    assert.equal(doc.querySelector('a[href="/settings/accounting"]')?.getAttribute("aria-current"), "page", currentPathname);
    assert.equal(doc.querySelector('a[href="/settings"]')?.getAttribute("aria-current"), null, currentPathname);
  }

  const settings = renderSidebar({ canAccessAccountingSetup: true, currentPathname: "/settings/company" });
  const settingsDoc = new JSDOM(settings).window.document;
  assert.equal(getSectionExpandedState(settings, "administration"), true);
  assert.equal(getSectionExpandedState(settings, "accountingOperations"), false);
  assert.equal(settingsDoc.querySelector('a[href="/settings"]')?.getAttribute("aria-current"), "page");

  const nearMatch = renderSidebar({ canAccessAccountingSetup: true, currentPathname: "/settings/accountingish" });
  assert.equal(getSectionExpandedState(nearMatch, "administration"), true);
  assert.equal(getSectionExpandedState(nearMatch, "accountingOperations"), false);
});

test("9. Only one accordion section is expanded at a time", () => {
  for (const path of ["/customers", "/services", "/suppliers", "/invoices", "/settings", "/expenses", "/advances"]) {
    const html = renderSidebar({ currentPathname: path, isAdmin: true });
    const expandedSections = ALL_SECTION_KEYS.filter((key) => getSectionExpandedState(html, key));
    assert.equal(expandedSections.length, 1, `Exactly one section should be expanded on path ${path}, got: ${expandedSections.join(", ")}`);
  }
});

test("10. Accordion triggers expose real buttons with aria-expanded and aria-controls matching container IDs", () => {
  const html = renderSidebar({ currentPathname: "/customers", isAdmin: true });

  for (const key of ALL_SECTION_KEYS) {
    const triggerPattern = new RegExp(`<button[^>]*id="nav-section-trigger-${key}"[^>]*aria-controls="nav-section-content-${key}"`);
    assert.ok(triggerPattern.test(html), `Trigger for ${key} must be a button with matching aria-controls`);
    const containerPattern = new RegExp(`<div[^>]*id="nav-section-content-${key}"[^>]*aria-labelledby="nav-section-trigger-${key}"`);
    assert.ok(containerPattern.test(html), `Container for ${key} must have matching id and aria-labelledby`);
  }
});

test("11. Collapsed child navigation is hidden and not rendered as active navigation", () => {
  const html = renderSidebar({ currentPathname: "/customers", isAdmin: true });

  // Customers & Sales is expanded: not hidden
  assert.ok(
    html.includes('id="nav-section-content-customersAndSales"') &&
    !html.includes('id="nav-section-content-customersAndSales" role="region" aria-labelledby="nav-section-trigger-customersAndSales" hidden=""'),
    "Expanded section must not have hidden attribute",
  );

  // Other sections are collapsed: must have hidden attribute
  for (const key of ["suppliersAndProcurement", "billingAndPayments", "expensesAndCosting", "administration"]) {
    const collapsedPattern = new RegExp(`id="nav-section-content-${key}"[^>]*hidden=""`);
    assert.ok(collapsedPattern.test(html), `Collapsed section ${key} must have hidden attribute`);
  }
});

test("12. Sidebar supports Arabic RTL rendering with localized accessible names and RTL positioning", () => {
  const html = renderSidebar({ isAdmin: true, shellDirection: "rtl", locale: "ar", currentPathname: "/customers" });

  assert.ok(
    html.includes(`aria-label="${navigationDictionaryAr.menu.open}"`),
    "Trigger button must use Arabic open label",
  );
  assert.ok(
    html.includes(`aria-label="${navigationDictionaryAr.menu.mainNavigation}"`),
    "Nav element must use Arabic main navigation label",
  );
  assert.ok(html.includes('dir="rtl"'), "Sidebar must apply RTL direction");
  assert.ok(
    html.includes("translate-x-full"),
    "RTL collapsed sidebar must position to right with translate-x-full",
  );

  // Localized section titles in Arabic
  assert.ok(html.includes(navigationDictionaryAr.sections.customersAndSales), "Must render Arabic Customers & Sales");
  assert.ok(html.includes(navigationDictionaryAr.modules.services), "Must render Arabic Events");
  assert.ok(html.includes(navigationDictionaryAr.sections.suppliersAndProcurement), "Must render Arabic Suppliers & Procurement");
  assert.ok(html.includes(navigationDictionaryAr.sections.billingAndPayments), "Must render Arabic Billing & Payments");
  assert.ok(html.includes(navigationDictionaryAr.sections.administration), "Must render Arabic Administration");

  // Localized module labels in Arabic
  assert.ok(html.includes(navigationDictionaryAr.modules.customers), "Must render Arabic Customers");
  assert.ok(html.includes(navigationDictionaryAr.modules.quotations), "Must render Arabic Quotations");
});

test("13. Sidebar menu and sections dictionary strings are defined and localized in both EN and AR", () => {
  assert.equal(navigationDictionaryEn.menu.open, "Open navigation menu");
  assert.equal(navigationDictionaryEn.menu.close, "Close navigation menu");
  assert.equal(navigationDictionaryEn.menu.mainNavigation, "Main navigation");

  assert.equal(navigationDictionaryAr.menu.open, "فتح قائمة التنقل");
  assert.equal(navigationDictionaryAr.menu.close, "إغلاق قائمة التنقل");
  assert.equal(navigationDictionaryAr.menu.mainNavigation, "التنقل الرئيسي");

  assert.equal(navigationDictionaryEn.sections.customersAndSales, "Customers & Sales");
  assert.equal(navigationDictionaryEn.sections.suppliersAndProcurement, "Suppliers & Procurement");
  assert.equal(navigationDictionaryEn.sections.billingAndPayments, "Billing & Payments");
  assert.equal(navigationDictionaryEn.sections.administration, "Administration");

  assert.equal(navigationDictionaryAr.sections.customersAndSales, "العملاء والمبيعات");
  assert.equal(navigationDictionaryAr.sections.suppliersAndProcurement, "الموردون والمشتريات");
  assert.equal(navigationDictionaryAr.sections.billingAndPayments, "الفواتير والمدفوعات");
  assert.equal(navigationDictionaryAr.sections.administration, "الإدارة");
});

test("14. Deep contextual routes expand parent section and activate parent child without adding deep routes to global sidebar", () => {
  // Nested /services route
  const srvHtml = renderSidebar({ currentPathname: "/services/srv-123/procurement" });
  assert.equal(getSectionExpandedState(srvHtml, "customersAndSales"), true, "Deep service procurement route must expand Customers & Sales");
  assert.ok(srvHtml.includes('href="/services"') && srvHtml.includes("border-tertiary-fixed"), "Services child link must be active");
  assert.ok(!srvHtml.includes('href="/services/srv-123/procurement"'), "Deep procurement route must NOT be a global sidebar link");

  // Nested /suppliers route
  const supHtml = renderSidebar({ currentPathname: "/suppliers/sup-456/quotations" });
  assert.equal(getSectionExpandedState(supHtml, "suppliersAndProcurement"), true, "Deep supplier quotations route must expand Suppliers & Procurement");
  assert.ok(supHtml.includes('href="/suppliers"') && supHtml.includes("border-tertiary-fixed"), "Suppliers child link must be active");
  assert.ok(!supHtml.includes('href="/suppliers/sup-456/quotations"'), "Deep quotations route must NOT be a global sidebar link");

  // Unauthorized module routes must not be present
  assert.ok(!srvHtml.includes("Procurement Packages"));
  assert.ok(!srvHtml.includes("Supplier Quotations"));
  assert.ok(!srvHtml.includes("Approved Commitments"));
  assert.ok(!srvHtml.includes("Service Receipts"));
  assert.ok(!srvHtml.includes("Finance &amp; Accounting"));
});

test("15. /projects is NOT present anywhere in the sidebar", () => {
  const html = renderSidebar({ currentPathname: "/dashboard", isAdmin: true });
  assert.ok(!html.includes('href="/projects"'), "/projects must NOT be in the sidebar");
  assert.ok(!html.includes(">Projects<"), "Projects label must NOT be in the sidebar");
});

test("16. Sidebar renders compact G7 / BLUE brand mark and omits visible CRM / Enterprise CRM text", () => {
  const html = renderSidebar({ currentPathname: "/dashboard" });
  assert.ok(html.includes('aria-label="G7 BLUE"'), "Brand mark container with aria-label G7 BLUE must be present");
  assert.ok(html.includes(">G7<"), "Brand mark must contain G7 text");
  assert.ok(html.includes(">BLUE<"), "Brand mark must contain BLUE text");
  assert.ok(html.includes("g7-brand-ring"), "Brand mark must include animated ring element");
  assert.ok(!html.includes("G7 BLUE CRM"), "Old G7 BLUE CRM title must NOT be rendered");
  assert.ok(!html.includes("Enterprise CRM"), "Old Enterprise CRM subtitle must NOT be rendered");
});

const { default: PreparingWorkspace } = await import("../ui/PreparingWorkspace.tsx");

test("17. PreparingWorkspace renders centered brand mark, status text, and accessibility semantics for EN and AR", () => {
  // English default
  const enHtml = renderToStaticMarkup(React.createElement(PreparingWorkspace));
  assert.ok(enHtml.includes('aria-busy="true"'), "Must expose aria-busy=true");
  assert.ok(enHtml.includes('role="status"'), "Must expose role=status");
  assert.ok(enHtml.includes('aria-live="polite"'), "Must expose aria-live=polite");
  assert.ok(enHtml.includes("Preparing your workspace…"), "Must render default English copy");
  assert.ok(enHtml.includes('aria-label="G7 BLUE"'), "Must render G7 BLUE brand mark");
  assert.ok(enHtml.includes(">G7<") && enHtml.includes(">BLUE<"), "Must render G7 and BLUE in brand mark");
  assert.ok(!enHtml.includes("WorkspaceSkeleton"), "Must not include route skeletons");

  // Arabic localized
  const arHtml = renderToStaticMarkup(
    React.createElement(PreparingWorkspace, {
      message: "جاري تجهيز مساحة العمل…",
      direction: "rtl",
    }),
  );
  assert.ok(arHtml.includes('dir="rtl"'), "Must support RTL direction");
  assert.ok(arHtml.includes("جاري تجهيز مساحة العمل…"), "Must render Arabic copy");
});

test("18. /expenses expands Expenses & Costing accordion, activates Expenses and renders both Expenses and Cash Advances children", () => {
  const html = renderSidebar({ currentPathname: "/expenses" });
  assert.equal(
    getSectionExpandedState(html, "expensesAndCosting"),
    true,
    "/expenses route must expand Expenses & Costing",
  );
  assert.ok(html.includes('href="/expenses"'), "Expenses child link must be rendered");
  assert.ok(html.includes('href="/advances"'), "Cash Advances child link must be rendered");
});

test("19. /advances and /advances/:id expand Expenses & Costing accordion and activate Cash Advances", () => {
  // /advances root
  const advHtml = renderSidebar({ currentPathname: "/advances" });
  assert.equal(
    getSectionExpandedState(advHtml, "expensesAndCosting"),
    true,
    "/advances must expand Expenses & Costing",
  );
  assert.ok(advHtml.includes('href="/advances"'), "Cash Advances child link must be rendered");
  assert.ok(advHtml.includes('href="/expenses"'), "Expenses child link must be rendered");

  // Nested /advances/:id route (detail page)
  const advDetailHtml = renderSidebar({ currentPathname: "/advances/adv-uuid-123" });
  assert.equal(
    getSectionExpandedState(advDetailHtml, "expensesAndCosting"),
    true,
    "/advances/:id must expand Expenses & Costing",
  );

  // All other sections must be collapsed
  const otherSections = ["customersAndSales", "suppliersAndProcurement", "billingAndPayments", "administration"] as const;
  for (const key of otherSections) {
    assert.equal(
      getSectionExpandedState(advHtml, key),
      false,
      `Section ${key} must be collapsed on /advances`,
    );
  }
});

test("20. Expenses & Costing section dictionary labels are correctly localized EN and AR", () => {
  assert.equal(navigationDictionaryEn.sections.expensesAndCosting, "Expenses & Costing");
  assert.equal(navigationDictionaryAr.sections.expensesAndCosting, "المصروفات والتكاليف");
  assert.equal(navigationDictionaryEn.modules.expenses, "Expenses");
  assert.equal(navigationDictionaryEn.modules.advances, "Cash Advances");
  assert.equal(navigationDictionaryAr.modules.expenses, "المصروفات");
  assert.equal(navigationDictionaryAr.modules.advances, "العهد النقدية");
});
