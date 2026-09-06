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

const require = createRequire(import.meta.url);
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
  shellDirection?: "ltr" | "rtl";
  currentPathname?: string;
  locale?: "en" | "ar";
} = {}) {
  const { locale = "en", ...sidebarProps } = props;
  return renderToStaticMarkup(
    React.createElement(
      TestLocaleProvider,
      { locale },
      React.createElement(Sidebar, sidebarProps),
    ),
  );
}

const ALL_SECTION_KEYS = [
  "customersAndSales",
  "operations",
  "suppliersAndProcurement",
  "billingAndPayments",
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

test("1. Dashboard and Reports remain standalone links, activate independently, and collapse all accordion sections", () => {
  // On /dashboard:
  const dashHtml = renderSidebar({ currentPathname: "/dashboard" });
  for (const key of ALL_SECTION_KEYS) {
    assert.equal(getSectionExpandedState(dashHtml, key), false, `Section ${key} must be collapsed on /dashboard`);
  }
  assert.ok(
    dashHtml.includes('href="/dashboard"') && dashHtml.includes("border-tertiary-fixed"),
    "Dashboard link must be active on /dashboard",
  );

  // On /reports:
  const repHtml = renderSidebar({ currentPathname: "/reports" });
  for (const key of ALL_SECTION_KEYS) {
    assert.equal(getSectionExpandedState(repHtml, key), false, `Section ${key} must be collapsed on /reports`);
  }
  assert.ok(
    repHtml.includes('href="/reports"') && repHtml.includes("border-tertiary-fixed"),
    "Reports link must be active on /reports",
  );
});

test("2 & 3. /customers expands Customers & Sales and renders Customers and Quotations underneath", () => {
  const html = renderSidebar({ currentPathname: "/customers" });

  assert.equal(getSectionExpandedState(html, "customersAndSales"), true, "Customers & Sales must be expanded on /customers");
  assert.equal(getSectionExpandedState(html, "operations"), false, "Operations must be collapsed on /customers");
  assert.equal(getSectionExpandedState(html, "suppliersAndProcurement"), false, "Suppliers & Procurement must be collapsed on /customers");
  assert.equal(getSectionExpandedState(html, "billingAndPayments"), false, "Billing & Payments must be collapsed on /customers");
  assert.equal(getSectionExpandedState(html, "administration"), false, "Administration must be collapsed on /customers");

  // Both children appear under Customers & Sales container
  assert.ok(html.includes('id="nav-section-content-customersAndSales"'));
  assert.ok(html.includes('href="/customers"'));
  assert.ok(html.includes('href="/quotations"'));

  // When on /quotations:
  const quotHtml = renderSidebar({ currentPathname: "/quotations" });
  assert.equal(getSectionExpandedState(quotHtml, "customersAndSales"), true, "Customers & Sales must be expanded on /quotations");
});

test("4. /services expands Operations accordion and activates Services", () => {
  const html = renderSidebar({ currentPathname: "/services" });

  assert.equal(getSectionExpandedState(html, "operations"), true, "Operations must be expanded on /services");
  assert.equal(getSectionExpandedState(html, "customersAndSales"), false, "Customers & Sales must be collapsed on /services");
  assert.ok(html.includes('id="nav-section-content-operations"'));
  assert.ok(html.includes('href="/services"'));
});

test("5. /suppliers expands Suppliers & Procurement accordion and activates Suppliers", () => {
  const html = renderSidebar({ currentPathname: "/suppliers" });

  assert.equal(getSectionExpandedState(html, "suppliersAndProcurement"), true, "Suppliers & Procurement must be expanded on /suppliers");
  assert.equal(getSectionExpandedState(html, "operations"), false, "Operations must be collapsed on /suppliers");
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

test("9. Only one accordion section is expanded at a time", () => {
  for (const path of ["/customers", "/services", "/suppliers", "/invoices", "/settings"]) {
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
  for (const key of ["operations", "suppliersAndProcurement", "billingAndPayments", "administration"]) {
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
  assert.ok(html.includes(navigationDictionaryAr.sections.operations), "Must render Arabic Operations");
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
  assert.equal(navigationDictionaryEn.sections.operations, "Operations");
  assert.equal(navigationDictionaryEn.sections.suppliersAndProcurement, "Suppliers & Procurement");
  assert.equal(navigationDictionaryEn.sections.billingAndPayments, "Billing & Payments");
  assert.equal(navigationDictionaryEn.sections.administration, "Administration");

  assert.equal(navigationDictionaryAr.sections.customersAndSales, "العملاء والمبيعات");
  assert.equal(navigationDictionaryAr.sections.operations, "العمليات");
  assert.equal(navigationDictionaryAr.sections.suppliersAndProcurement, "الموردون والمشتريات");
  assert.equal(navigationDictionaryAr.sections.billingAndPayments, "الفواتير والمدفوعات");
  assert.equal(navigationDictionaryAr.sections.administration, "الإدارة");
});

test("14. Deep contextual routes expand parent section and activate parent child without adding deep routes to global sidebar", () => {
  // Nested /services route
  const srvHtml = renderSidebar({ currentPathname: "/services/srv-123/procurement" });
  assert.equal(getSectionExpandedState(srvHtml, "operations"), true, "Deep service procurement route must expand Operations");
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
  assert.ok(!srvHtml.includes("Expenses &amp; Costing"));
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
