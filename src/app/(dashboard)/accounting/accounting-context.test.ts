import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (markup: string) => { window: { document: Document } } };
const root = resolve(process.cwd(), "src");
const cache = new Map<string, { exports: Record<string, unknown> }>();
const routeState: {
  locale: "en" | "ar";
  permissions: Set<string>;
  permissionChecks: string[];
  setup: { state: string };
  setupFailure: boolean;
  journal: Record<string, unknown> | null;
  journalFailure: boolean;
  workspaces: Record<string, Record<string, unknown>>;
} = {
  locale: "en",
  permissions: new Set(),
  permissionChecks: [],
  setup: { state: "INITIALIZED" },
  setupFailure: false,
  journal: null,
  journalFailure: false,
  workspaces: {},
};

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}
class AuthDependencyError extends Error {}

function findModule(path: string): string {
  return [path, `${path}.tsx`, `${path}.ts`, resolve(path, "index.tsx"), resolve(path, "index.ts")].find(existsSync)!;
}

function captureWorkspace(name: string) {
  return function CapturedAccountingWorkspace(props: Record<string, unknown>) {
    routeState.workspaces[name] = props;
    return React.createElement("div", { "data-accounting-workspace": name, "data-state": props.state });
  };
}

function testLinkModule() {
  const Link = React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>>(
    function TestLink(props, ref) { return React.createElement("a", { ...props, ref }, props.children); },
  );
  return { __esModule: true, default: Link, useLinkStatus: () => ({ pending: false }) };
}

function testDataModule() {
  return {
    getAccountingSetupStatus: async () => {
      if (routeState.setupFailure) throw new Error("setup dependency unavailable");
      return routeState.setup;
    },
    listAccountingJournals: async () => ({ items: [], nextCursor: null }),
    listAccountingPeriods: async () => [],
    listAccountingPostingRules: async () => [],
    listAccountingAccounts: async () => [],
    getAccountingArBridgeReconciliation: async () => ({ state: "READY" }),
    listAccountingBankBindings: async () => ({ state: "READY", bindings: [] }),
    getAccountingBankReconciliation: async () => null,
    getAccountingBankReconciliationHistory: async () => null,
    getAccountingPeriodCloseEvidence: async () => ({ state: "READY", packages: [] }),
    getAccountingJournal: async () => {
      if (routeState.journalFailure) throw new Error("journal dependency unavailable");
      return routeState.journal;
    },
    getAccountingJournalReversalId: async () => null,
  };
}

function stubImport(parent: string, specifier: string): unknown {
  if (specifier === "server-only") return {};
  if (specifier === "next/link") return testLinkModule();
  if (specifier === "next/navigation") return {
    redirect: (path: string) => { throw new Error(`redirect:${path}`); },
    notFound: () => { throw new Error("not-found"); },
  };
  if (specifier === "@/lib/auth/errors") return { UnauthorizedError, ForbiddenError, AuthDependencyError };
  if (specifier === "@/lib/auth/permissions") return {
    checkPermission: async (permission: string) => {
      routeState.permissionChecks.push(permission);
      return routeState.permissions.has(permission);
    },
    getCurrentAppUser: async () => ({ id: "test-user" }),
  };
  if (specifier === "@/lib/accounting/queries") return testDataModule();
  if (specifier === "@/lib/accounting/journal-operations-queries") return testDataModule();
  if (specifier === "@/lib/accounting/permissions") return { canAccessAccountingArBridge: (view: boolean, manage: boolean) => view || manage };
  if (specifier === "@/lib/i18n") return { getDirection: (locale: string) => locale === "ar" ? "rtl" : "ltr" };
  if (specifier === "@/lib/i18n/session-locale") return { getCurrentSessionEffectiveLocale: async () => routeState.locale };
  const workspaceNames: Record<string, string> = {
    "./JournalOperationsWorkspace": "journals",
    "./JournalDetailWorkspace": "journal-detail",
    "./ArBridgeWorkspace": "ar-bridge",
    "./BankReconciliationWorkspace": "bank-reconciliation",
    "./PeriodCloseWorkspace": "period-close",
  };
  if (workspaceNames[specifier]) return { __esModule: true, default: captureWorkspace(workspaceNames[specifier]) };
  if (specifier.startsWith("@/")) return loadModule(resolve(root, specifier.slice(2)));
  if (specifier.startsWith(".")) return loadModule(resolve(dirname(parent), specifier));
  return require(specifier);
}

function loadModule(path: string): Record<string, unknown> {
  const file = findModule(path);
  if (cache.has(file)) return cache.get(file)!.exports;
  const compiled = { exports: {} as Record<string, unknown> };
  cache.set(file, compiled);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  new Function("require", "module", "exports", code)(
    (specifier: string) => stubImport(file, specifier), compiled, compiled.exports,
  );
  return compiled.exports;
}

type Page = (props: Record<string, unknown>) => Promise<React.ReactNode>;
const page = (path: string) => loadModule(resolve(root, path)).default as Page;
const pages = {
  journals: page("app/(dashboard)/accounting/journals/page"),
  journalDetail: page("app/(dashboard)/accounting/journals/[journalId]/page"),
  arBridge: page("app/(dashboard)/accounting/ar-bridge/page"),
  bank: page("app/(dashboard)/accounting/bank-reconciliation/page"),
  period: page("app/(dashboard)/accounting/period-close/page"),
};
const journalsDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/accounting-journals"))
  .getAccountingJournalsDictionary as (locale: "en" | "ar") => Record<string, unknown>;
const arBridgeDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/accounting-ar-bridge"))
  .getAccountingArBridgeDictionary as (locale: "en" | "ar") => Record<string, unknown>;
const operationsDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/accounting-operations"))
  .getAccountingOperationsDictionary as (locale: "en" | "ar") => Record<string, unknown>;
const LocaleProvider = loadModule(resolve(root, "components/i18n/LocaleProvider"))
  .LocaleProvider as React.ComponentType<React.PropsWithChildren<{ locale: "en" | "ar" }>>;
const navigation = loadModule(resolve(root, "lib/i18n/dictionaries/navigation"));

const journalId = "journal-2026-0007";
function journalFixture() {
  return {
    journal_id: journalId,
    profile_id: "profile-1",
    correction_group_id: "correction-1",
    reversal_of_journal_id: null,
    current_version: 1,
    versions: [{ version: 1, status: "DRAFT", source_domain: "CONTROLLED_MANUAL", lines: [] }],
  };
}

function resetState(locale: "en" | "ar" = "en") {
  routeState.locale = locale;
  routeState.permissions = new Set([
    "accounting:view", "accounting:prepare_journal", "accounting:manage_ar_bridge", "services:read",
    "accounting:reconcile_bank", "accounting:view_statements", "accounting:close_period", "accounting:reopen_period",
    "accounting:post_journal", "accounting:reverse_journal",
  ]);
  routeState.permissionChecks.length = 0;
  routeState.setup = { state: "INITIALIZED" };
  routeState.setupFailure = false;
  routeState.journal = journalFixture();
  routeState.journalFailure = false;
  routeState.workspaces = {};
}

async function renderPage(component: Page, props: Record<string, unknown> = {}) {
  routeState.workspaces = {};
  const markup = renderToStaticMarkup(React.createElement(LocaleProvider, { locale: routeState.locale }, await component(props)));
  return new JSDOM(markup).window.document;
}

function rootRouteCases(locale: "en" | "ar") {
  const journal = journalsDictionary(locale);
  const bridge = arBridgeDictionary(locale);
  const operations = operationsDictionary(locale) as { bank: Record<string, string>; period: Record<string, string> };
  return [
    { name: "journals", page: pages.journals, title: journal.title as string, subtitle: journal.subtitle as string },
    { name: "ar-bridge", page: pages.arBridge, title: bridge.title as string, subtitle: bridge.subtitle as string },
    { name: "bank-reconciliation", page: pages.bank, title: operations.bank.title, subtitle: operations.bank.subtitle },
    { name: "period-close", page: pages.period, title: operations.period.title, subtitle: operations.period.subtitle },
  ];
}

async function assertRootShell(component: Page, title: string, subtitle: string, locale: "en" | "ar") {
  const doc = await renderPage(component, { searchParams: Promise.resolve({}) });
  const modules = navigation[locale === "ar" ? "navigationDictionaryAr" : "navigationDictionaryEn"] as { modules: { accounting: string } };
  const accounting = modules.modules.accounting;
  assert.equal(doc.querySelectorAll('[data-page-frame="workspace"]').length, 1);
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(doc.querySelector("h1")?.textContent, title);
  assert.equal(doc.querySelector("header p")?.textContent, subtitle);
  assert.deepEqual([...doc.querySelectorAll("nav li")].map((item) => item.textContent?.trim()), [accounting, title]);
  assert.equal(doc.querySelector('nav li [aria-current="page"]')?.textContent, title);
  assert.equal(doc.querySelectorAll("main").length, 0);
  assert.equal(doc.querySelector("[dir]")?.getAttribute("dir"), locale === "ar" ? "rtl" : "ltr");
}

test("root accounting workspaces share the localized wide shell and preserve ready workspace props", async () => {
  for (const locale of ["en", "ar"] as const) {
    resetState(locale);
    for (const item of rootRouteCases(locale)) {
      await assertRootShell(item.page, item.title, item.subtitle, locale);
      const props = routeState.workspaces[item.name];
      assert.equal(props?.state, "ready");
      assert.ok(props?.dictionary);
    }
  }
});

test("root accounting workspaces keep their shared shell through access and readiness states", async () => {
  const stateCases: { setup?: string; setupFailure?: boolean; denied?: boolean; expected: string }[] = [
    { setup: "NOT_INITIALIZED", expected: "not-initialized" },
    { setup: "RECOVERY_REQUIRED", expected: "recovery-required" },
    { setupFailure: true, expected: "dependency-failure" },
    { denied: true, expected: "access-denied" },
  ];
  for (const stateCase of stateCases) {
    resetState("ar");
    if (stateCase.setup) routeState.setup = { state: stateCase.setup };
    routeState.setupFailure = stateCase.setupFailure ?? false;
    if (stateCase.denied) routeState.permissions.clear();
    for (const item of rootRouteCases("ar")) {
      await assertRootShell(item.page, item.title, item.subtitle, "ar");
      assert.equal(routeState.workspaces[item.name]?.state, stateCase.expected);
    }
  }
});

test("Journal Detail links its location and labeled Return to Journal Operations in both locales", async () => {
  for (const locale of ["en", "ar"] as const) {
    resetState(locale);
    const doc = await renderPage(pages.journalDetail, { params: Promise.resolve({ journalId }) });
    const dictionary = journalsDictionary(locale);
    const modules = navigation[locale === "ar" ? "navigationDictionaryAr" : "navigationDictionaryEn"] as { modules: { accounting: string } };
    const accounting = modules.modules.accounting;
    const operations = dictionary.title as string;
    const detailTitle = dictionary.journalDetail as string;
    assert.equal(doc.querySelectorAll('[data-page-frame="record"]').length, 1);
    assert.equal(doc.querySelectorAll("h1").length, 1);
    assert.equal(doc.querySelector("h1")?.textContent, detailTitle);
    assert.deepEqual([...doc.querySelectorAll("nav li")].map((item) => item.textContent?.trim()), [accounting, operations, `${detailTitle} · ${journalId}`]);
    assert.equal(doc.querySelector('nav a[href="/accounting/journals"]')?.textContent, operations);
    assert.equal(doc.querySelector(`a[aria-label="${dictionary.backToJournals}"]`)?.getAttribute("href"), "/accounting/journals");
    assert.equal(doc.querySelectorAll(`a[aria-label="${dictionary.backToJournals}"]`).length, 1);
    assert.equal(doc.querySelector(`nav li:last-child bdi[dir="ltr"]`)?.textContent, ` · ${journalId}`);
    assert.equal(doc.querySelectorAll("main").length, 0);
  }
});

test("Journal Detail failure shells preserve safe navigation without exposing the record ID", async () => {
  for (const locale of ["en", "ar"] as const) {
    resetState(locale);
    routeState.permissions.clear();
    const denied = await renderPage(pages.journalDetail, { params: Promise.resolve({ journalId }) });
    const dictionary = journalsDictionary(locale);
    assert.equal(denied.querySelector("h1")?.textContent, dictionary.journalDetail);
    assert.equal(denied.querySelector('[role="status"]')?.textContent, dictionary.accessDenied);
    assert.ok(denied.querySelector('a[href="/accounting/journals"]'));
    assert.equal(denied.body.textContent?.includes(journalId), false);

    resetState(locale);
    routeState.journalFailure = true;
    const failed = await renderPage(pages.journalDetail, { params: Promise.resolve({ journalId }) });
    assert.equal(failed.querySelector("h1")?.textContent, dictionary.journalDetail);
    assert.equal(failed.querySelector('[role="status"]')?.textContent, dictionary.dependencyFailure);
    assert.equal(failed.body.textContent?.includes(journalId), false);
    routeState.journalFailure = false;
    routeState.journal = null;
    await assert.rejects(() => pages.journalDetail({ params: Promise.resolve({ journalId }) }), /not-found/);
  }
});

test("accounting presentation keeps operational controls, authorization gates, and table scrolling connected", () => {
  const journals = readFileSync(resolve(root, "app/(dashboard)/accounting/journals/JournalOperationsWorkspace.tsx"), "utf8");
  const detail = readFileSync(resolve(root, "app/(dashboard)/accounting/journals/[journalId]/JournalDetailWorkspace.tsx"), "utf8");
  const bridge = readFileSync(resolve(root, "app/(dashboard)/accounting/ar-bridge/ArBridgeWorkspace.tsx"), "utf8");
  const bank = readFileSync(resolve(root, "app/(dashboard)/accounting/bank-reconciliation/BankReconciliationWorkspace.tsx"), "utf8");
  const period = readFileSync(resolve(root, "app/(dashboard)/accounting/period-close/PeriodCloseWorkspace.tsx"), "utf8");
  const pagesSource = [
    "app/(dashboard)/accounting/journals/page.tsx",
    "app/(dashboard)/accounting/journals/[journalId]/page.tsx",
    "app/(dashboard)/accounting/ar-bridge/page.tsx",
    "app/(dashboard)/accounting/bank-reconciliation/page.tsx",
    "app/(dashboard)/accounting/period-close/page.tsx",
  ].map((path) => readFileSync(resolve(root, path), "utf8")).join("\n");
  assert.match(pagesSource, /checkPermission\("accounting:view"\)/);
  assert.match(pagesSource, /accounting:prepare_journal/);
  assert.match(pagesSource, /canAccessAccountingArBridge/);
  assert.match(pagesSource, /accounting:reconcile_bank/);
  assert.match(pagesSource, /accounting:close_period/);
  assert.match(pagesSource, /accounting:reopen_period/);
  assert.match(journals, /ManualJournalForm/);
  assert.match(journals, /listTitle/);
  assert.match(detail, /postAccountingJournal/);
  assert.match(detail, /reverseAccountingJournal/);
  assert.match(detail, /<h2[^>]*>\{dictionary\.sourceProof\}<\/h2>/);
  assert.match(detail, /<bdi dir="ltr" className="break-all font-mono text-xs text-on-surface-variant">\{detail\.journal_id\}<\/bdi>/);
  assert.match(bridge, /classificationEvidence/);
  assert.match(bank, /overflow-x-auto/);
  assert.match(period, /prepareAccountingPeriodClose/);
  assert.match(period, /reviewAccountingPeriodClose/);
});
