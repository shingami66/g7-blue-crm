import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string) => { window: { document: Document } } };
const root = resolve(process.cwd(), "src");
const cache = new Map<string, Record<string, unknown>>();
let locale: "en" | "ar" = "en";
let permissions = new Set<string>();

// Only session/auth boundaries and Next's link transport are isolated.
// All shell, catalog, localization, state, and directional components are real.
function load(path: string): Record<string, unknown> {
  const file = [path, path + ".tsx", path + ".ts"].find(existsSync)!;
  if (cache.has(file)) return cache.get(file)!;
  const compiled = { exports: {} as Record<string, unknown> };
  cache.set(file, compiled.exports);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const importModule = (name: string): unknown => {
    if (name === "next/link") return { __esModule: true,
      default: React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<{ href: string }>>(
        function TestLink({ children, ...props }, ref) { return React.createElement("a", { ...props, ref }, children); }),
      useLinkStatus: () => ({ pending: false }),
    };
    if (name === "@/lib/i18n/session-locale") return { getCurrentSessionEffectiveLocale: async () => locale };
    if (name === "@/lib/auth/permissions") return { checkPermission: async (permission: string) => permissions.has(permission) };
    if (name.startsWith("@/")) return load(resolve(root, name.slice(2)));
    if (name.startsWith(".")) return load(resolve(file, "..", name));
    return require(name);
  };
  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}
const h = React.createElement;
const component = (path: string, name = "default") => load(resolve(root, path))[name] as React.ComponentType<Record<string, unknown>>;
const Workspace = component("app/(dashboard)/reports/ReportWorkspace");
const State = component("app/(dashboard)/reports/ReportState");
const Provider = component("components/i18n/LocaleProvider", "LocaleProvider");
const reportsPage = load(resolve(root, "app/(dashboard)/reports/page")).default as () => Promise<React.ReactNode>;
const { getReportDefinitions } = load(resolve(root, "lib/reports/catalog")) as typeof import("../../../lib/reports/catalog.ts");
const { getReportCenterDictionary } = load(resolve(root, "lib/i18n/dictionaries/report-center")) as typeof import("../../../lib/i18n/dictionaries/report-center.ts");
const render = (child: React.ReactNode) => new JSDOM(renderToStaticMarkup(h(Provider, { locale }, child))).window.document;

for (const language of ["en", "ar"] as const) {
  test(`${language}: Report Center retains every catalog entry and gates Open on the complete permission set`, async () => {
    locale = language;
    const dictionary = getReportCenterDictionary(locale);
    const definitions = getReportDefinitions(locale);
    for (permissions of [new Set<string>(), new Set(["invoices:read", "supplier_bills:read", "services:read", "supplier_costing:read", "accounting:view"])]) {
      const doc = render(await reportsPage());
      assert.equal(doc.querySelectorAll('[data-page-frame="workspace"]').length, 1);
      assert.equal(doc.querySelectorAll("h1").length, 1);
      assert.equal(doc.querySelector("h1")!.textContent, locale === "ar" ? "مركز التقارير" : "Report Center");
      assert.equal(doc.querySelector("header p")!.textContent, dictionary.subtitle);
      assert.equal(doc.querySelector("nav [aria-current=page]")!.textContent, locale === "ar" ? "التقارير" : "Reports");
      assert.deepEqual([...doc.querySelectorAll("h2")].map((item) => item.textContent), [dictionary.catalog.financialOperations, dictionary.catalog.eventCosting]);
      assert.equal(doc.querySelectorAll("article").length, 7);
      for (const definition of definitions) {
        const card = doc.querySelector(`[data-report-definition="${definition.key}"]`)!;
        assert.equal(card.querySelector("h3")!.textContent, definition.title);
        const available = definition.requiredPermissions.every((permission) => permissions.has(permission));
        assert.equal(card.querySelector("a")?.getAttribute("href") ?? null, available ? definition.route : null);
        if (!available) assert.ok(card.textContent!.includes(dictionary.catalog.unavailable));
        for (const text of [definition.description, definition.sourceDomain, definition.freshness, dictionary.catalog.exportAvailable]) assert.ok(card.textContent!.includes(text));
        assert.equal(card.querySelectorAll("dt").length, 3);
      }
      assert.equal(doc.querySelectorAll("main").length, 0);
      assert.equal(doc.querySelectorAll("nav").length, 1);
      assert.equal(doc.querySelector('[aria-label="' + dictionary.workspace.returnToCenter + '"]'), null);
    }
  });

  test(`${language}: every report keeps its location, labeled Return, metadata, filters and body across states`, () => {
    locale = language;
    const dictionary = getReportCenterDictionary(locale);
    for (const definition of getReportDefinitions(locale)) {
      for (const status of ["error", "empty", "unavailable", "invalid", "forbidden"] as const) {
        const exportHref = status === "empty" ? `/api/reports/example/export?from=2026-01-01&asOf=2026-09-25` : undefined;
        const doc = render(h(Workspace, {
          definition, dictionary, locale, generatedAt: "2026-09-25T08:15:00.000Z",
          periodFrom: "2026-01-01", periodTo: "2026-09-25", asOfDate: "2026-09-25", exportHref,
          filterPanel: h("form", { method: "get" }, h("label", null, "Date", h("input", { type: "date", name: "asOf" }))),
          stateNote: h("p", { role: "note" }, "Context warning"),
        }, h(State, { status, dictionary }), h("div", { "data-results": true }, "Specialized results")));
        assert.equal(doc.querySelectorAll('[data-page-frame="workspace"]').length, 1);
        assert.equal(doc.querySelectorAll("h1").length, 1);
        assert.equal(doc.querySelector("h1")!.textContent, definition.title);
        assert.deepEqual([...doc.querySelectorAll("nav li bdi")].map((item) => item.textContent), [locale === "ar" ? "التقارير" : "Reports", definition.title]);
        const back = doc.querySelector(`a[aria-label="${dictionary.workspace.returnToCenter}"]`)!;
        assert.equal(back.getAttribute("href"), "/reports");
        assert.ok(back.textContent!.includes(locale === "ar" ? "العودة إلى مركز التقارير" : "Return to Report Center"));
        assert.equal(back.querySelector("svg")!.classList.contains("scale-x-[-1]"), locale === "ar");
        assert.equal(doc.querySelector(`a[aria-label="${dictionary.workspace.export}"]`)?.getAttribute("href") ?? null, exportHref ?? null);
        for (const value of [definition.description, definition.sourceDomain, definition.freshness, "Asia/Riyadh (+03:00)", dictionary.workspace.period, dictionary.workspace.asOf, dictionary.workspace.generated]) assert.ok(doc.body.textContent!.includes(value));
        assert.ok(doc.querySelector("details > summary"));
        assert.ok(doc.querySelector('form[method="get"] label input[name="asOf"]'));
        assert.equal(doc.querySelector('[role="note"]')!.textContent, "Context warning");
        assert.ok(doc.body.textContent!.includes(dictionary.workspace[status]));
        assert.equal(doc.querySelector("[data-results]")!.textContent, "Specialized results");
        assert.equal(doc.querySelectorAll("nav").length, 1);
        assert.equal(doc.querySelectorAll("main, a a, a button, button a").length, 0);
        (back as HTMLAnchorElement).focus();
        assert.equal(doc.activeElement, back);
      }
    }
  });
}

test("operational and dynamic accounting routes keep ReportWorkspace around report states and results", () => {
  for (const route of ["accounts-receivable", "accounts-payable", "event-economics", "[report]"]) {
    const source = readFileSync(resolve(root, `app/(dashboard)/reports/${route}/page.tsx`), "utf8");
    assert.match(source, /import ReportWorkspace from "\.\.\/ReportWorkspace"/);
    assert.match(source, /<ReportWorkspace[\s\S]*<ReportState[\s\S]*<\/ReportWorkspace>/);
    assert.doesNotMatch(source, /<h1\b|router\.back\(/);
  }
  const accounting = readFileSync(resolve(root, "app/(dashboard)/reports/[report]/page.tsx"), "utf8");
  for (const slug of ["general-ledger", "trial-balance", "profit-and-loss", "balance-sheet"]) assert.ok(accounting.includes(`"${slug}":`));
});
