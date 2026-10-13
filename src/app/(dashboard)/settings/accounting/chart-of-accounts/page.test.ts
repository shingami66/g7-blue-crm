import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import test, { mock } from "node:test";
import { pathToFileURL } from "node:url";
import { renderToStaticMarkup } from "react-dom/server";

const require = createRequire(import.meta.url);
const tsUrl = pathToFileURL(require.resolve("typescript")).href;
const linkShimUrl = `data:text/javascript,${encodeURIComponent(
  `import React from ${JSON.stringify(pathToFileURL(require.resolve("react")).href)}; export default function Link(props) { return React.createElement("a", props, props.children); }`,
)}`;

const testModuleLoader = `
import ts from ${JSON.stringify(tsUrl)};
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export default {}", shortCircuit: true };
  if (specifier === "next/navigation") return { url: "data:text/javascript,export function redirect(path) { throw new Error('redirect:' + path); } export function useRouter() { return { refresh() {} }; }", shortCircuit: true };
  if (specifier === "next/link") return { url: ${JSON.stringify(linkShimUrl)}, shortCircuit: true };
  if (specifier.startsWith("@/")) {
    const basePath = join(process.cwd(), "src", specifier.slice(2));
    if (existsSync(basePath + ".tsx")) return { url: pathToFileURL(basePath + ".tsx").href, shortCircuit: true };
    if (existsSync(basePath + ".ts")) return { url: pathToFileURL(basePath + ".ts").href, shortCircuit: true };
    if (existsSync(join(basePath, "index.tsx"))) return { url: pathToFileURL(join(basePath, "index.tsx")).href, shortCircuit: true };
    if (existsSync(join(basePath, "index.ts"))) return { url: pathToFileURL(join(basePath, "index.ts")).href, shortCircuit: true };
  }
  if (specifier.startsWith(".")) {
    const parentDir = context.parentURL ? fileURLToPath(new URL(".", context.parentURL)) : process.cwd();
    const candidate = join(parentDir, specifier);
    if (existsSync(candidate + ".tsx")) return { url: pathToFileURL(candidate + ".tsx").href, shortCircuit: true };
    if (existsSync(candidate + ".ts")) return { url: pathToFileURL(candidate + ".ts").href, shortCircuit: true };
  }
  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:") && (url.endsWith(".tsx") || url.endsWith(".ts"))) {
    const source = readFileSync(fileURLToPath(url), "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX },
    });
    return { format: "module", shortCircuit: true, source: transpiled.outputText };
  }
  return nextLoad(url, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

type ChartPageState = {
  locale: "en" | "ar";
  status: unknown;
  setupError: Error | null;
  accounts: unknown[];
  listError: Error | null;
  canManage: boolean;
  canViewChart: boolean;
  canReadSetupStatus: boolean;
  setupCalls: number;
  listCalls: number;
  saveCalls: unknown[];
  saveResults: unknown[];
};

const React = require("react") as { createElement: (type: unknown, props: unknown) => unknown };
const { JSDOM } = require("jsdom") as {
  JSDOM: new (html: string, options: { url: string }) => { window: Window & typeof globalThis };
};
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const [name, value] of Object.entries({
  window: dom.window,
  document: dom.window.document,
  navigator: dom.window.navigator,
  HTMLElement: dom.window.HTMLElement,
  Node: dom.window.Node,
  MutationObserver: dom.window.MutationObserver,
  FormData: dom.window.FormData,
})) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const { render, fireEvent, screen, cleanup, waitFor } = await import("@testing-library/react");

const pageState: ChartPageState = {
  locale: "en",
  status: { state: "NOT_INITIALIZED", can_bootstrap: true },
  setupError: null,
  accounts: [],
  listError: null,
  canManage: false,
  canViewChart: false,
  canReadSetupStatus: true,
  setupCalls: 0,
  listCalls: 0,
  saveCalls: [],
  saveResults: [],
};

mock.module(new URL("../../../../../lib/accounting/queries.ts", import.meta.url).href, {
  namedExports: {
    getAccountingSetupStatus: async () => {
      pageState.setupCalls += 1;
      if (pageState.setupError) throw pageState.setupError;
      if (!pageState.canReadSetupStatus) throw new ForbiddenError("setup status capability required");
      return pageState.status;
    },
    listAccountingAccounts: async () => {
      pageState.listCalls += 1;
      if (!pageState.canViewChart && !pageState.canManage) throw new ForbiddenError("chart capability required");
      if (pageState.listError) throw pageState.listError;
      return pageState.accounts;
    },
  },
});

mock.module(new URL("../../../../../lib/auth/permissions.ts", import.meta.url).href, {
  namedExports: {
    checkPermission: async (permission: string) => permission === "accounting:manage_chart" && pageState.canManage,
  },
});

mock.module(new URL("../../../../../lib/i18n/session-locale.ts", import.meta.url).href, {
  namedExports: { getCurrentSessionEffectiveLocale: async () => pageState.locale },
});

mock.module(new URL("../../../../../lib/i18n/index.ts", import.meta.url).href, {
  namedExports: { getDirection: (locale: "en" | "ar") => locale === "ar" ? "rtl" : "ltr" },
});

mock.module(new URL("../../../../../lib/accounting/actions.ts", import.meta.url).href, {
  namedExports: {
    saveAccountingAccount: async (input: unknown) => {
      pageState.saveCalls.push(input);
      return pageState.saveResults.shift() ?? { ok: true, value: { account_id: rootId, version: 1 }, idempotentReplay: false };
    },
  },
});

const { ForbiddenError, AuthDependencyError } = await import("../../../../../lib/auth/errors.ts");
const { default: ChartOfAccountsPage } = await import("./page.tsx");
const { default: ChartOfAccountsClient } = await import("./ChartOfAccountsClient.tsx");

const profileId = "00000000-0000-4000-8000-00000000c101";
const rootId = "00000000-0000-4000-8000-00000000c102";
const childId = "00000000-0000-4000-8000-00000000c103";
const creatorId = "00000000-0000-4000-8000-00000000c104";

function account(overrides: Record<string, unknown> = {}) {
  return {
    account_id: rootId,
    profile_id: profileId,
    version: 2,
    is_current: true,
    previous_version: 1,
    account_code: "1000",
    name_en: "Receivables — ذمم مدينة",
    name_ar: "الذمم المدينة",
    account_type: "ASSET",
    category: "synthetic test category",
    normal_balance: "DEBIT",
    account_kind: "NON_POSTING",
    parent_account_id: null,
    is_active: true,
    is_protected: false,
    control_classification: "NONE",
    effective_from: "2026-10-13T12:00:00.000Z",
    reason: "Synthetic route fixture",
    evidence_ref: null,
    created_by: creatorId,
    created_at: "2026-10-13T12:00:00.000Z",
    ...overrides,
  };
}

const rootCurrent = account();
const rootPrevious = account({
  version: 1,
  is_current: false,
  previous_version: null,
  name_en: "Prior receivables",
  category: "prior synthetic category",
  normal_balance: "CREDIT",
  is_active: false,
  is_protected: true,
  control_classification: "CONTRACT_ASSET",
  reason: "Prior synthetic version",
  evidence_ref: "prior-evidence-reference",
});
const childCurrent = account({
  account_id: childId,
  version: 1,
  is_current: true,
  previous_version: null,
  account_code: "1100",
  name_en: "Customer control",
  name_ar: "حساب العملاء",
  account_kind: "POSTING",
  parent_account_id: rootId,
  control_classification: "ACCOUNTS_RECEIVABLE",
  is_protected: true,
});
const descendantHeading = account({
  account_id: "00000000-0000-4000-8000-00000000c105",
  version: 1,
  is_current: true,
  previous_version: null,
  account_code: "1050",
  name_en: "Receivable groups",
  name_ar: "مجموعات الذمم",
  parent_account_id: rootId,
  account_kind: "NON_POSTING",
});
const otherRoot = account({
  account_id: "00000000-0000-4000-8000-00000000c106",
  version: 1,
  is_current: true,
  previous_version: null,
  account_code: "2000",
  name_en: "Other root",
  name_ar: "حساب رئيسي آخر",
  account_kind: "NON_POSTING",
});

async function renderPage() {
  return renderToStaticMarkup(await ChartOfAccountsPage());
}

function renderChartClient(accounts: unknown[], locale: "en" | "ar" = "en") {
  return render(React.createElement(ChartOfAccountsClient, {
    locale, state: "ready", accounts, canManage: true,
  }) as Parameters<typeof render>[0]);
}

function fieldByName(container: HTMLElement, name: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const field = container.querySelector(`[name="${name}"]`);
  assert.ok(field, `Expected field "${name}"`);
  return field as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
}

function setField(container: HTMLElement, name: string, value: string) {
  fireEvent.change(fieldByName(container, name), { target: { value } });
}

test("uninitialized and recovery-required states do not read or create chart accounts", async () => {
  pageState.locale = "en";
  pageState.setupError = null;
  pageState.listError = null;
  pageState.accounts = [];
  pageState.canManage = false;
  pageState.canViewChart = false;
  pageState.canReadSetupStatus = true;
  pageState.listCalls = 0;

  pageState.status = { state: "NOT_INITIALIZED", can_bootstrap: true };
  let html = await renderPage();
  assert.match(html, /Accounting profile is not initialized/);
  assert.match(html, /This screen does not initialize the profile/);
  assert.doesNotMatch(html, /Add account/);
  assert.equal(pageState.listCalls, 0);

  pageState.status = { state: "RECOVERY_REQUIRED", can_recover: true };
  html = await renderPage();
  assert.match(html, /Accounting authority recovery is required/);
  assert.doesNotMatch(html, /Add account/);
  assert.equal(pageState.listCalls, 0);
});

test("English current account tree displays prior versions and gates edit controls by capability", async () => {
  pageState.locale = "en";
  pageState.status = { state: "INITIALIZED" };
  pageState.setupError = null;
  pageState.listError = null;
  pageState.accounts = [rootCurrent, rootPrevious, childCurrent];
  pageState.canManage = true;
  pageState.canViewChart = false;
  pageState.canReadSetupStatus = true;
  let html = await renderPage();
  assert.match(html, /dir="ltr"/);
  assert.match(html, /Chart of Accounts/);
  assert.match(html, /Receivables — ذمم مدينة/);
  assert.match(html, /Customer control/);
  assert.match(html, /Previous versions \(1\)/);
  assert.match(html, /prior synthetic category/);
  assert.match(html, /Contract asset/);
  assert.match(html, /Prior synthetic version/);
  assert.match(html, /prior-evidence-reference/);
  assert.match(html, /Prior receivables/);
  assert.match(html, /Add account/);
  assert.match(html, /Edit/);
  assert.ok(html.indexOf("1000") < html.indexOf("1100"));

  pageState.canManage = false;
  pageState.canViewChart = true;
  pageState.canReadSetupStatus = true;
  html = await renderPage();
  assert.match(html, /Customer control/);
  assert.doesNotMatch(html, /Add account/);
  assert.doesNotMatch(html, />Edit</);
});

test("Arabic chart keeps RTL alignment, bilingual account names, and an honest empty state", async () => {
  pageState.locale = "ar";
  pageState.status = { state: "INITIALIZED" };
  pageState.setupError = null;
  pageState.listError = null;
  pageState.accounts = [];
  pageState.canManage = true;
  pageState.canViewChart = false;
  pageState.canReadSetupStatus = true;
  let html = await renderPage();
  assert.match(html, /dir="rtl"/);
  assert.match(html, /دليل الحسابات/);
  assert.match(html, /لم يتم إعداد حسابات/);
  assert.match(html, /لا توجد حسابات نموذجية أو افتراضية/);
  assert.match(html, /إضافة حساب/);

  pageState.accounts = [rootCurrent, childCurrent];
  html = await renderPage();
  assert.match(html, /Receivables — ذمم مدينة/);
  assert.match(html, /الذمم المدينة/);
  assert.match(html, /bdi dir="auto">Receivables — ذمم مدينة/);
  assert.match(html, /bdi dir="auto">الذمم المدينة/);
});

test("access denial and dependency failure remain distinct and do not leak backend errors", async () => {
  pageState.locale = "en";
  pageState.status = { state: "INITIALIZED" };
  pageState.setupError = null;
  pageState.canManage = false;
  pageState.canViewChart = false;
  pageState.canReadSetupStatus = false;
  pageState.accounts = [];
  pageState.listError = null;
  let html = await renderPage();
  assert.match(html, /Access denied/);

  pageState.canReadSetupStatus = true;
  pageState.canViewChart = true;
  pageState.listError = new AuthDependencyError("private accounting database error");
  html = await renderPage();
  assert.match(html, /Chart of Accounts is temporarily unavailable/);
  assert.doesNotMatch(html, /private accounting database error/);
});

test("chart managers can read the chart without the setup-status capability", async () => {
  pageState.locale = "en";
  pageState.status = { state: "INITIALIZED" };
  pageState.setupError = null;
  pageState.listError = null;
  pageState.accounts = [rootCurrent];
  pageState.canManage = true;
  pageState.canViewChart = false;
  pageState.canReadSetupStatus = false;
  pageState.setupCalls = 0;
  pageState.listCalls = 0;

  const html = await renderPage();

  assert.match(html, /Chart of Accounts/);
  assert.match(html, /Receivables — ذمم مدينة/);
  assert.match(html, /Add account/);
  assert.match(html, />Edit</);
  assert.equal(pageState.setupCalls, 0);
  assert.equal(pageState.listCalls, 1);
});

test("create form filters posting parents and retries the same new-account request", async () => {
  pageState.saveCalls.length = 0;
  pageState.saveResults = [
    { ok: false, code: "dependency_failure" },
    { ok: true, value: { account_id: "00000000-0000-4000-8000-00000000c107", version: 1 }, idempotentReplay: false },
  ];
  const { container } = renderChartClient([rootCurrent, descendantHeading, childCurrent, otherRoot]);
  try {
    fireEvent.click(screen.getByRole("button", { name: "Add account" }));

    const parentIds = Array.from((fieldByName(container, "parent_account_id") as HTMLSelectElement).options).map((option) => option.value);
    assert.ok(parentIds.includes(rootId));
    assert.ok(parentIds.includes(descendantHeading.account_id as string));
    assert.ok(parentIds.includes(otherRoot.account_id as string));
    assert.ok(!parentIds.includes(childId));

    setField(container, "control_classification", "ACCOUNTS_RECEIVABLE");
    await waitFor(() => assert.equal((fieldByName(container, "is_protected") as HTMLInputElement).checked, true));

    const values = {
      account_code: "1200",
      name_en: "Customer receivables",
      name_ar: "ذمم العملاء",
      account_type: "ASSET",
      category: "accounts receivable",
      normal_balance: "DEBIT",
      account_kind: "POSTING",
      parent_account_id: rootId,
      control_classification: "ACCOUNTS_RECEIVABLE",
      is_active: "on",
      is_protected: "on",
      reason: "Synthetic chart test",
      evidence_ref: "",
    };

    for (const [name, value] of Object.entries(values)) {
      if (name !== "is_active" && name !== "is_protected") setField(container, name, value);
    }
    fireEvent.click(screen.getByRole("button", { name: "Save account version" }));
    await waitFor(() => assert.equal(pageState.saveCalls.length, 1));
    assert.equal(pageState.saveCalls.length, 1);
    const firstRequest = pageState.saveCalls[0] as {
      account_id: string | null;
      expected_version: number;
      request_id: string;
      account: { parent_account_id: string | null; is_protected: boolean; control_classification: string };
    };
    assert.equal(firstRequest.account_id, null);
    assert.equal(firstRequest.expected_version, 0);
    assert.match(firstRequest.request_id, /^[0-9a-f-]{36}$/i);
    assert.equal(firstRequest.account.parent_account_id, rootId);
    assert.equal(firstRequest.account.is_protected, true);
    assert.equal(firstRequest.account.control_classification, "ACCOUNTS_RECEIVABLE");
    await waitFor(() => assert.match(screen.getByRole("status").textContent ?? "", /could not be completed/));
    await waitFor(() => assert.ok(screen.getByRole("button", { name: "Save account version" })));

    fireEvent.click(screen.getByRole("button", { name: "Save account version" }));
    await waitFor(() => assert.equal(pageState.saveCalls.length, 2));
    assert.equal(pageState.saveCalls.length, 2);
    const secondRequest = pageState.saveCalls[1] as { request_id: string };
    assert.equal(secondRequest.request_id, firstRequest.request_id);
    await waitFor(() => assert.match(screen.getByRole("status").textContent ?? "", /saved as version 1/));
  } finally {
    cleanup();
  }
});

test("account-code conflicts show localized English and Arabic feedback", async () => {
  for (const [locale, message] of [
    ["en", "That account code is already in use. Choose a different code."],
    ["ar", "رمز الحساب مستخدم بالفعل. اختر رمزاً آخر."],
  ] as const) {
    pageState.saveCalls.length = 0;
    pageState.saveResults = [{ ok: false, code: "account_code_conflict" }];
    const { container } = renderChartClient([], locale);
    try {
      fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Add account" : "إضافة حساب" }));
      const values = {
        account_code: "1200",
        name_en: "Customer receivables",
        name_ar: "ذمم العملاء",
        account_type: "ASSET",
        category: "receivables",
        normal_balance: "DEBIT",
        account_kind: "POSTING",
        control_classification: "NONE",
        reason: "Synthetic account-code conflict test",
      };
      for (const [name, value] of Object.entries(values)) setField(container, name, value);

      fireEvent.click(screen.getByRole("button", { name: locale === "en" ? "Save account version" : "حفظ إصدار الحساب" }));
      await waitFor(() => assert.equal(pageState.saveCalls.length, 1));
      assert.equal(pageState.saveCalls.length, 1);
      await waitFor(() => assert.equal(screen.getByRole("status").textContent, message));
    } finally {
      cleanup();
    }
  }
});

test("revision conflict uses the current version, excludes self and descendants as parents, and offers reload", async () => {
  pageState.saveCalls.length = 0;
  pageState.saveResults = [{ ok: false, code: "revision_conflict" }];
  const { container } = renderChartClient([rootCurrent, descendantHeading, childCurrent, otherRoot]);
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  let reloadCalls = 0;
  const testWindow = Object.create(dom.window) as Window;
  Object.defineProperty(testWindow, "location", {
    configurable: true,
    value: { reload: () => { reloadCalls += 1; } },
  });
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    writable: true,
    value: testWindow,
  });

  try {
    fireEvent.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const parentIds = Array.from((fieldByName(container, "parent_account_id") as HTMLSelectElement).options).map((option) => option.value);
    assert.deepEqual(parentIds, ["", otherRoot.account_id as string]);
    const postingOption = container.querySelector('option[value="POSTING"]');
    assert.equal((postingOption as HTMLOptionElement | null)?.disabled, true);

    const values = {
      account_code: "1000",
      name_en: "Updated receivables",
      name_ar: "ذمم محدثة",
      account_type: "ASSET",
      category: "synthetic test category",
      normal_balance: "DEBIT",
      account_kind: "NON_POSTING",
      parent_account_id: otherRoot.account_id as string,
      control_classification: "NONE",
      is_active: "on",
      reason: "Synthetic revision conflict test",
      evidence_ref: "",
    };
    for (const [name, value] of Object.entries(values)) {
      if (name !== "is_active") setField(container, name, value);
    }
    fireEvent.click(screen.getByRole("button", { name: "Save account version" }));
    await waitFor(() => assert.equal(pageState.saveCalls.length, 1));
    await waitFor(() => assert.match(screen.getByRole("status").textContent ?? "", /changed after you opened it/));

    const request = pageState.saveCalls[0] as { account_id: string; expected_version: number; account: { parent_account_id: string | null } };
    assert.equal(request.account_id, rootId);
    assert.equal(request.expected_version, rootCurrent.version);
    assert.equal(request.account.parent_account_id, otherRoot.account_id);
    await waitFor(() => assert.ok(screen.getByRole("button", { name: "Reload the latest account version" })));

    fireEvent.click(screen.getByRole("button", { name: "Reload the latest account version" }));
    assert.equal(reloadCalls, 1);
  } finally {
    cleanup();
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow);
    else Reflect.deleteProperty(globalThis, "window");
  }
});

test("protected control-account revisions keep structural fields locked", async () => {
  const { container } = renderChartClient([childCurrent]);
  try {
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    for (const name of [
      "account_code",
      "category",
      "account_type",
      "normal_balance",
      "account_kind",
      "parent_account_id",
      "control_classification",
    ]) {
      assert.equal(fieldByName(container, name).disabled, true, `${name} remains locked`);
    }
    assert.equal(fieldByName(container, "name_en").disabled, false);
    assert.equal(fieldByName(container, "name_ar").disabled, false);
    assert.equal(fieldByName(container, "is_active").disabled, false);
    assert.equal(fieldByName(container, "is_protected").disabled, true);
    assert.match(screen.getByText(/Protected accounts keep their code/).textContent ?? "", /Protected accounts keep their code/);
  } finally {
    cleanup();
  }
});
