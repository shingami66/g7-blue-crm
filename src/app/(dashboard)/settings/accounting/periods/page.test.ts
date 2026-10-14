import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import test, { afterEach, mock } from "node:test";
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
    const transpiled = ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX } });
    return { format: "module", shortCircuit: true, source: transpiled.outputText };
  }
  return nextLoad(url, context);
}
`;
register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

type PeriodPageState = {
  locale: "en" | "ar";
  status: unknown;
  statusError: Error | null;
  listError: Error | null;
  canManage: boolean;
  canReadPeriods: boolean;
  canReadSetup: boolean;
  periods: Array<Record<string, unknown>>;
  setupCalls: number;
  listCalls: number;
  saveCalls: unknown[];
  saveResults: unknown[];
};
const state: PeriodPageState = {
  locale: "en", status: { state: "INITIALIZED" }, statusError: null, listError: null,
  canManage: false, canReadPeriods: true, canReadSetup: true, periods: [], setupCalls: 0, listCalls: 0,
  saveCalls: [], saveResults: [],
};

mock.module(new URL("../../../../../lib/accounting/queries.ts", import.meta.url).href, {
  namedExports: {
    getAccountingSetupStatus: async () => { state.setupCalls += 1; if (state.statusError) throw state.statusError; if (!state.canReadSetup) throw new ForbiddenError("setup denied"); return state.status; },
    listAccountingPeriods: async () => { state.listCalls += 1; if (!state.canReadPeriods && !state.canManage) throw new ForbiddenError("periods denied"); if (state.listError) throw state.listError; return state.periods; },
  },
});
mock.module(new URL("../../../../../lib/auth/permissions.ts", import.meta.url).href, {
  namedExports: { checkPermission: async (permission: string) => permission === "accounting:manage_periods" && state.canManage },
});
mock.module(new URL("../../../../../lib/i18n/session-locale.ts", import.meta.url).href, {
  namedExports: { getCurrentSessionEffectiveLocale: async () => state.locale },
});
mock.module(new URL("../../../../../lib/i18n/index.ts", import.meta.url).href, {
  namedExports: { getDirection: (locale: "en" | "ar") => locale === "ar" ? "rtl" : "ltr" },
});
mock.module(new URL("../../../../../lib/accounting/actions.ts", import.meta.url).href, {
  namedExports: {
    saveAccountingPeriod: async (input: unknown) => {
      state.saveCalls.push(input);
      return state.saveResults.shift() ?? { ok: true, value: { period_id: periodId, version: 1 }, idempotentReplay: false };
    },
  },
});

const { ForbiddenError, AuthDependencyError } = await import("../../../../../lib/auth/errors.ts");
const { default: AccountingPeriodsPage } = await import("./page.tsx");
const { default: PeriodsClient } = await import("./PeriodsClient.tsx");
const React = require("react") as { createElement: (type: unknown, props: unknown) => unknown };
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string, options: { url: string }) => { window: Window & typeof globalThis } };
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, MutationObserver: dom.window.MutationObserver, FormData: dom.window.FormData })) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const { render, fireEvent, screen, cleanup, waitFor } = await import("@testing-library/react");

const profileId = "00000000-0000-4000-8000-00000000f101";
const periodId = "00000000-0000-4000-8000-00000000f102";
const actorId = "00000000-0000-4000-8000-00000000f103";
function period(overrides: Record<string, unknown> = {}) {
  return {
    period_id: periodId, profile_id: profileId, version: 2, is_current: true, previous_version: 1,
    start_date: "2026-01-01", end_date: "2026-12-31", status: "OPEN", effective_from: "2026-01-01T00:00:00.000Z",
    reason: "Synthetic period fixture", evidence_ref: "fixture-evidence", created_by: actorId, created_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}
function resetState() {
  state.locale = "en"; state.status = { state: "INITIALIZED" }; state.statusError = null; state.listError = null;
  state.canManage = false; state.canReadPeriods = true; state.canReadSetup = true; state.periods = [];
  state.setupCalls = 0; state.listCalls = 0; state.saveCalls.length = 0; state.saveResults.length = 0;
}
afterEach(() => { cleanup(); resetState(); });
async function renderPage() { return renderToStaticMarkup(await AccountingPeriodsPage()); }
function renderClient(periods: Array<Record<string, unknown>>, locale: "en" | "ar" = "en", canManage = true) {
  return render(React.createElement(PeriodsClient, { locale, state: "ready", periods, canManage }) as Parameters<typeof render>[0]);
}
function field(container: HTMLElement, name: string) {
  const found = container.querySelector(`[name="${name}"]`);
  assert.ok(found, `Expected ${name}`);
  return found as HTMLInputElement | HTMLTextAreaElement;
}
function setField(container: HTMLElement, name: string, value: string) {
  fireEvent.change(field(container, name), { target: { value } });
}

test("period route handles NOT_INITIALIZED without listing periods", async () => {
  state.status = { state: "NOT_INITIALIZED", can_bootstrap: true };
  const html = await renderPage();
  assert.match(html, /Accounting profile is not initialized/);
  assert.equal(state.listCalls, 0);
});

test("empty state and versioned period list render in English", async () => {
  let html = await renderToStaticMarkup(React.createElement(PeriodsClient, { locale: "en", state: "ready", periods: [], canManage: false }) as Parameters<typeof renderToStaticMarkup>[0]);
  assert.match(html, /No accounting periods have been configured/);
  state.periods = [period(), period({ version: 1, is_current: false, previous_version: null, start_date: "2026-01-01", end_date: "2026-12-31", reason: "Prior fixture" })];
  html = await renderPage();
  assert.match(html, /Accounting Periods/);
  assert.match(html, /Previous versions \(1\)/);
  assert.match(html, /Prior fixture/);
  assert.match(html, /2026-01-01/);
});

test("create sends OPEN version zero and evidence with the existing save action", async () => {
  state.canManage = true;
  const { container } = renderClient([]);
  fireEvent.click(screen.getByRole("button", { name: "Create period" }));
  setField(container, "start_date", "2027-01-01");
  setField(container, "end_date", "2027-12-31");
  setField(container, "reason", "Approved synthetic calendar");
  setField(container, "evidence_ref", "calendar-approval");
  fireEvent.click(screen.getByRole("button", { name: "Save period version" }));
  await waitFor(() => assert.equal(state.saveCalls.length, 1));
  const input = state.saveCalls[0] as { period_id: string | null; expected_version: number; period: { status: string; start_date: string; end_date: string }; reason: string; evidence_ref: string | null; request_id: string };
  assert.equal(input.period_id, null);
  assert.equal(input.expected_version, 0);
  assert.equal(input.period.status, "OPEN");
  assert.equal(input.period.start_date, "2027-01-01");
  assert.equal(input.period.end_date, "2027-12-31");
  assert.equal(input.reason, "Approved synthetic calendar");
  assert.equal(input.evidence_ref, "calendar-approval");
  assert.match(input.request_id, /^[0-9a-f-]{36}$/i);
});

test("revision uses the current identity and expected version; closed and locked periods have no revise action", async () => {
  const locked = period({ period_id: "00000000-0000-4000-8000-00000000f104", status: "LOCKED", version: 1, previous_version: null });
  const { container } = renderClient([period(), locked]);
  assert.equal(screen.getAllByRole("button", { name: "Revise" }).length, 1);
  fireEvent.click(screen.getByRole("button", { name: "Revise" }));
  setField(container, "start_date", "2026-02-01");
  setField(container, "end_date", "2026-12-31");
  setField(container, "reason", "Corrected period boundary");
  fireEvent.click(screen.getByRole("button", { name: "Save period version" }));
  await waitFor(() => assert.equal(state.saveCalls.length, 1));
  const input = state.saveCalls[0] as { period_id: string; expected_version: number; period: { status: string } };
  assert.equal(input.period_id, periodId);
  assert.equal(input.expected_version, 2);
  assert.equal(input.period.status, "OPEN");
});

test("invalid date range is rejected before calling the save action", async () => {
  const { container } = renderClient([]);
  fireEvent.click(screen.getByRole("button", { name: "Create period" }));
  setField(container, "start_date", "2027-12-31");
  setField(container, "end_date", "2027-01-01");
  setField(container, "reason", "Invalid synthetic range");
  fireEvent.click(screen.getByRole("button", { name: "Save period version" }));
  assert.equal(state.saveCalls.length, 0);
  assert.ok(screen.getAllByText("The end date must be on or after the start date.").length > 0);
});

test("revision conflict is translated and exposes a latest-version reload action", async () => {
  state.saveResults.push({ ok: false, code: "revision_conflict" });
  const { container } = renderClient([period()]);
  fireEvent.click(screen.getByRole("button", { name: "Revise" }));
  setField(container, "reason", "Conflict fixture");
  fireEvent.click(screen.getByRole("button", { name: "Save period version" }));
  await waitFor(() => assert.equal(state.saveCalls.length, 1));
  assert.ok(screen.getAllByText(/changed after you opened it/).length > 0);
  assert.ok(screen.getByRole("button", { name: "Reload the latest period version" }));
});

test("read permission displays periods without controls; denied access and Arabic RTL stay explicit", async () => {
  state.canManage = false;
  state.canReadPeriods = true;
  state.status = { state: "INITIALIZED" };
  state.periods = [period()];
  let html = await renderPage();
  assert.match(html, /dir="ltr"/);
  assert.doesNotMatch(html, /Create period/);
  assert.doesNotMatch(html, />Revise</);

  state.canReadPeriods = false;
  state.canReadSetup = false;
  html = await renderPage();
  assert.match(html, /Access denied/);
  assert.doesNotMatch(html, /periods denied/);

  state.canReadPeriods = true;
  state.canReadSetup = true;
  state.locale = "ar";
  state.periods = [period()];
  html = await renderPage();
  assert.match(html, /dir="rtl"/);
  assert.match(html, /الفترات المحاسبية/);
  assert.match(html, /مفتوحة/);
  assert.match(html, /dir="ltr">2026-01-01/);
});

test("dependency failures do not expose backend details", async () => {
  state.statusError = new AuthDependencyError("private periods dependency error");
  const html = await renderPage();
  assert.match(html, /Accounting Periods are temporarily unavailable/);
  assert.doesNotMatch(html, /private periods dependency error/);
});
