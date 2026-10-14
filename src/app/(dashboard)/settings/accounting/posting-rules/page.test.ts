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

type RulePageState = {
  locale: "en" | "ar";
  status: unknown;
  statusError: Error | null;
  rulesError: Error | null;
  accountsError: Error | null;
  canManage: boolean;
  canReadRules: boolean;
  canReadSetup: boolean;
  rules: Array<Record<string, unknown>>;
  accounts: Array<Record<string, unknown>>;
  setupCalls: number;
  rulesCalls: number;
  accountsCalls: number;
  saveCalls: unknown[];
  saveResults: unknown[];
};
const state: RulePageState = {
  locale: "en", status: { state: "INITIALIZED" }, statusError: null, rulesError: null, accountsError: null,
  canManage: false, canReadRules: true, canReadSetup: true, rules: [], accounts: [],
  setupCalls: 0, rulesCalls: 0, accountsCalls: 0, saveCalls: [], saveResults: [],
};
mock.module(new URL("../../../../../lib/accounting/queries.ts", import.meta.url).href, {
  namedExports: {
    getAccountingSetupStatus: async () => { state.setupCalls += 1; if (state.statusError) throw state.statusError; if (!state.canReadSetup) throw new ForbiddenError("setup denied"); return state.status; },
    listAccountingPostingRules: async () => { state.rulesCalls += 1; if (!state.canReadRules && !state.canManage) throw new ForbiddenError("rules denied"); if (state.rulesError) throw state.rulesError; return state.rules; },
    listAccountingAccounts: async () => { state.accountsCalls += 1; if (!state.canReadRules && !state.canManage) throw new ForbiddenError("accounts denied"); if (state.accountsError) throw state.accountsError; return state.accounts; },
  },
});
mock.module(new URL("../../../../../lib/auth/permissions.ts", import.meta.url).href, {
  namedExports: { checkPermission: async (permission: string) => permission === "accounting:manage_chart" && state.canManage },
});
mock.module(new URL("../../../../../lib/i18n/session-locale.ts", import.meta.url).href, {
  namedExports: { getCurrentSessionEffectiveLocale: async () => state.locale },
});
mock.module(new URL("../../../../../lib/i18n/index.ts", import.meta.url).href, {
  namedExports: { getDirection: (locale: "en" | "ar") => locale === "ar" ? "rtl" : "ltr" },
});
mock.module(new URL("../../../../../lib/accounting/actions.ts", import.meta.url).href, {
  namedExports: {
    saveAccountingPostingRule: async (input: unknown) => {
      state.saveCalls.push(input);
      return state.saveResults.shift() ?? { ok: true, value: { posting_rule_id: ruleId, version: 1 }, idempotentReplay: false };
    },
  },
});

const { ForbiddenError, AuthDependencyError } = await import("../../../../../lib/auth/errors.ts");
const { default: PostingRulesPage } = await import("./page.tsx");
const { default: PostingRulesClient } = await import("./PostingRulesClient.tsx");
const React = require("react") as { createElement: (type: unknown, props: unknown) => unknown };
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string, options: { url: string }) => { window: Window & typeof globalThis } };
const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost" });
for (const [name, value] of Object.entries({ window: dom.window, document: dom.window.document, navigator: dom.window.navigator, HTMLElement: dom.window.HTMLElement, Node: dom.window.Node, MutationObserver: dom.window.MutationObserver, FormData: dom.window.FormData })) {
  Object.defineProperty(globalThis, name, { configurable: true, writable: true, value });
}
(globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
const { render, fireEvent, screen, cleanup, waitFor } = await import("@testing-library/react");

const profileId = "00000000-0000-4000-8000-00000000f201";
const ruleId = "00000000-0000-4000-8000-00000000f202";
const actorId = "00000000-0000-4000-8000-00000000f203";
const accountId = "00000000-0000-4000-8000-00000000f204";
const secondAccountId = "00000000-0000-4000-8000-00000000f205";
function account(overrides: Record<string, unknown> = {}) {
  return {
    account_id: accountId, profile_id: profileId, version: 2, is_current: true, previous_version: 1,
    account_code: "5100", name_en: "Direct expense", name_ar: "مصروف مباشر", account_type: "EXPENSE", category: "Operating expense",
    normal_balance: "DEBIT", account_kind: "POSTING", parent_account_id: null, is_active: true, is_protected: false,
    control_classification: "NONE", effective_from: "2026-01-01T00:00:00.000Z", reason: "Synthetic account fixture",
    evidence_ref: null, created_by: actorId, created_at: "2026-01-01T00:00:00.000Z", ...overrides,
  };
}
const currentAccount = account();
const priorAccount = account({ version: 1, is_current: false, previous_version: null, name_en: "Prior direct expense" });
const secondAccount = account({
  account_id: secondAccountId, version: 1, previous_version: null, account_code: "1200", name_en: "Direct asset", name_ar: "أصل مباشر",
  account_type: "ASSET", normal_balance: "DEBIT",
});
function rule(overrides: Record<string, unknown> = {}) {
  return {
    posting_rule_id: ruleId, profile_id: profileId, version: 2, is_current: true, previous_version: 1,
    rule_code: "SYNTHETIC_RULE", name_en: "Synthetic rule — قاعدة", name_ar: "قاعدة اصطناعية", is_active: true,
    effective_from: "2026-01-01T00:00:00.000Z", reason: "Synthetic rule fixture", evidence_ref: "rule-evidence",
    created_by: actorId, created_at: "2026-01-01T00:00:00.000Z",
    mappings: [
      { mapping_key: "direct_expense", account_id: accountId, account_version: 2, allowed_side: "DEBIT", service_requirement: "OPTIONAL" },
      { mapping_key: "direct_asset", account_id: secondAccountId, account_version: 1, allowed_side: "CREDIT", service_requirement: "FORBIDDEN" },
    ],
    ...overrides,
  };
}
function resetState() {
  state.locale = "en"; state.status = { state: "INITIALIZED" }; state.statusError = null; state.rulesError = null; state.accountsError = null;
  state.canManage = false; state.canReadRules = true; state.canReadSetup = true; state.rules = []; state.accounts = [];
  state.setupCalls = 0; state.rulesCalls = 0; state.accountsCalls = 0; state.saveCalls.length = 0; state.saveResults.length = 0;
}
afterEach(() => { cleanup(); resetState(); });
async function renderPage() { return renderToStaticMarkup(await PostingRulesPage()); }
function renderClient(rules: Array<Record<string, unknown>>, accounts: Array<Record<string, unknown>>, locale: "en" | "ar" = "en", canManage = true) {
  return render(React.createElement(PostingRulesClient, { locale, state: "ready", rules, accounts, canManage }) as Parameters<typeof render>[0]);
}
function setText(label: string, value: string) {
  const input = screen.getByLabelText(label);
  fireEvent.change(input, { target: { value } });
}
function setMappingKey(index: number, value: string) {
  fireEvent.change(screen.getAllByLabelText("Mapping key")[index], { target: { value } });
}
function setMappingAccount(index: number, value: string) {
  fireEvent.change(screen.getByLabelText(`Posting account ${index + 1}`), { target: { value } });
}
function fillNewRule() {
  setText("Rule code", "SYNTHETIC_RULE");
  setText("English name", "Synthetic posting rule");
  setText("Arabic name", "قاعدة ترحيل اصطناعية");
  setMappingKey(0, "direct_expense");
  setMappingKey(1, "direct_asset");
  setMappingAccount(0, `${accountId}:2`);
  setMappingAccount(1, `${secondAccountId}:1`);
  setText("Reason for change", "Synthetic rule setup");
}

test("NOT_INITIALIZED is explicit and does not read rules", async () => {
  state.status = { state: "NOT_INITIALIZED", can_bootstrap: true };
  const html = await renderPage();
  assert.match(html, /Accounting profile is not initialized/);
  assert.equal(state.rulesCalls, 0);
  assert.equal(state.accountsCalls, 0);
});

test("empty chart shows a prerequisite instead of an error and does not offer rule creation", async () => {
  state.canManage = true;
  state.accounts = [];
  const html = await renderPage();
  assert.match(html, /Chart of Accounts setup is required/);
  assert.match(html, /No sample accounts are provided/);
  assert.match(html, /chart-of-accounts/);
  assert.doesNotMatch(html, /Create rule/);
});

test("saved rules do not offer revision when there are no eligible current posting accounts", () => {
  const nonPostingAccounts = [
    account({ account_kind: "HEADER" }),
    account({ account_id: secondAccountId, account_kind: "HEADER", account_code: "1200" }),
  ];
  renderClient([rule()], nonPostingAccounts);
  assert.ok(screen.getByText(/No active posting accounts are available/));
  assert.ok(screen.getByText("SYNTHETIC_RULE"));
  assert.equal(screen.queryByRole("button", { name: "Revise" }), null);
  assert.equal(screen.queryByRole("button", { name: "Create rule" }), null);
});

test("empty rules, current version, mapping details, account names, and history render", async () => {
  let html = await renderToStaticMarkup(React.createElement(PostingRulesClient, { locale: "en", state: "ready", rules: [], accounts: [currentAccount, secondAccount], canManage: false }) as Parameters<typeof renderToStaticMarkup>[0]);
  assert.match(html, /No posting rules have been configured/);
  state.rules = [rule(), rule({ version: 1, is_current: false, previous_version: null, name_en: "Prior rule", mappings: [{ mapping_key: "direct_expense", account_id: accountId, account_version: 1, allowed_side: "DEBIT", service_requirement: "OPTIONAL" }] })];
  state.accounts = [currentAccount, priorAccount, secondAccount];
  html = await renderPage();
  assert.match(html, /SYNTHETIC_RULE/);
  assert.match(html, /Synthetic rule — قاعدة/);
  assert.match(html, /Previous versions \(1\)/);
  assert.match(html, /Prior rule/);
  assert.match(html, /5100 · v2/);
  assert.match(html, /direct_expense/);
});

test("create binds the selected current account versions and sends rule fields and mapping options", async () => {
  state.canManage = true;
  const { container } = renderClient([], [currentAccount, priorAccount, secondAccount]);
  fireEvent.click(screen.getByRole("button", { name: "Create rule" }));
  fillNewRule();
  const selects = screen.getAllByLabelText("Allowed side");
  fireEvent.change(selects[0], { target: { value: "DEBIT" } });
  fireEvent.change(selects[1], { target: { value: "CREDIT" } });
  const serviceSelects = screen.getAllByLabelText("Service requirement");
  fireEvent.change(serviceSelects[0], { target: { value: "REQUIRED" } });
  fireEvent.change(serviceSelects[1], { target: { value: "FORBIDDEN" } });
  fireEvent.click(screen.getByRole("button", { name: "Save rule version" }));
  await waitFor(() => assert.equal(state.saveCalls.length, 1));
  const input = state.saveCalls[0] as { posting_rule_id: string | null; expected_version: number; rule: { rule_code: string; mappings: Array<{ mapping_key: string; account_id: string; account_version: number; allowed_side: string; service_requirement: string }> }; reason: string; request_id: string };
  assert.equal(input.posting_rule_id, null);
  assert.equal(input.expected_version, 0);
  assert.equal(input.rule.rule_code, "SYNTHETIC_RULE");
  assert.deepEqual(input.rule.mappings.map(({ mapping_key, account_id, account_version, allowed_side, service_requirement }) => ({ mapping_key, account_id, account_version, allowed_side, service_requirement })), [
    { mapping_key: "direct_expense", account_id: accountId, account_version: 2, allowed_side: "DEBIT", service_requirement: "REQUIRED" },
    { mapping_key: "direct_asset", account_id: secondAccountId, account_version: 1, allowed_side: "CREDIT", service_requirement: "FORBIDDEN" },
  ]);
  assert.equal(input.reason, "Synthetic rule setup");
  assert.match(input.request_id, /^[0-9a-f-]{36}$/i);
  assert.equal(container.querySelectorAll("select[name='']").length, 0);
});

test("revision uses current rule expected_version and requires explicit selection when a mapping account version is stale", async () => {
  const staleRule = rule({ mappings: [
    { mapping_key: "direct_expense", account_id: accountId, account_version: 1, allowed_side: "DEBIT", service_requirement: "OPTIONAL" },
    { mapping_key: "direct_asset", account_id: secondAccountId, account_version: 1, allowed_side: "CREDIT", service_requirement: "FORBIDDEN" },
  ] });
  renderClient([staleRule], [currentAccount, priorAccount, secondAccount]);
  fireEvent.click(screen.getByRole("button", { name: "Revise" }));
  assert.ok(screen.getByText(/Stored account version is no longer current/));
  const accountSelect = screen.getByLabelText("Posting account 1") as HTMLSelectElement;
  assert.equal(accountSelect.value, "");
  setMappingAccount(0, `${accountId}:2`);
  setText("Reason for change", "Explicitly bind the current account version");
  fireEvent.click(screen.getByRole("button", { name: "Save rule version" }));
  await waitFor(() => assert.equal(state.saveCalls.length, 1));
  const input = state.saveCalls[0] as { posting_rule_id: string; expected_version: number; rule: { mappings: Array<{ account_id: string; account_version: number }> } };
  assert.equal(input.posting_rule_id, ruleId);
  assert.equal(input.expected_version, 2);
  assert.deepEqual(input.rule.mappings[0], { mapping_key: "direct_expense", account_id: accountId, account_version: 2, allowed_side: "DEBIT", service_requirement: "OPTIONAL" });
});

test("duplicate mapping keys are blocked and the two-row minimum cannot be removed", async () => {
  const { container } = renderClient([], [currentAccount, secondAccount]);
  fireEvent.click(screen.getByRole("button", { name: "Create rule" }));
  fillNewRule();
  setMappingKey(1, "direct_expense");
  assert.equal(screen.getAllByRole("button", { name: "Remove" }).filter((button) => (button as HTMLButtonElement).disabled).length, 2);
  fireEvent.click(screen.getByRole("button", { name: "Save rule version" }));
  assert.equal(state.saveCalls.length, 0);
  assert.ok(screen.getByRole("alert").textContent?.includes("Each mapping key must be unique"));
  assert.ok(container.querySelectorAll("fieldset").length > 0);
});

test("mapping minimum, allowed side and service requirement are visible and enforced by controls", async () => {
  renderClient([], [currentAccount, secondAccount]);
  fireEvent.click(screen.getByRole("button", { name: "Create rule" }));
  assert.match(screen.getByText(/At least two mappings are required/).textContent ?? "", /At least two/);
  assert.equal(screen.getAllByLabelText("Allowed side").length, 2);
  assert.equal(screen.getAllByLabelText("Service requirement").length, 2);
  assert.equal(screen.getAllByRole("button", { name: "Remove" }).every((button) => (button as HTMLButtonElement).disabled), true);
});

test("version conflict is translated with an explicit reload action", async () => {
  state.saveResults.push({ ok: false, code: "revision_conflict" });
  renderClient([rule()], [currentAccount, secondAccount]);
  fireEvent.click(screen.getByRole("button", { name: "Revise" }));
  setText("Reason for change", "Conflict fixture");
  fireEvent.click(screen.getByRole("button", { name: "Save rule version" }));
  await waitFor(() => assert.equal(state.saveCalls.length, 1));
  assert.ok(screen.getByText(/changed after you opened it/));
  assert.ok(screen.getByRole("button", { name: "Reload the latest rule version" }));
});

test("read permission, access denial, and Arabic RTL are explicit", async () => {
  state.canManage = false;
  state.canReadRules = true;
  state.status = { state: "INITIALIZED" };
  state.rules = [rule()];
  state.accounts = [currentAccount, secondAccount];
  let html = await renderPage();
  assert.match(html, /dir="ltr"/);
  assert.doesNotMatch(html, /Create rule/);
  assert.doesNotMatch(html, />Revise</);
  state.canReadRules = false;
  state.canReadSetup = false;
  html = await renderPage();
  assert.match(html, /Access denied/);
  assert.doesNotMatch(html, /rules denied/);
  state.canReadRules = true;
  state.canReadSetup = true;
  state.locale = "ar";
  state.rules = [rule()];
  state.accounts = [currentAccount, secondAccount];
  html = await renderPage();
  assert.match(html, /dir="rtl"/);
  assert.match(html, /قواعد الترحيل/);
  assert.match(html, /قاعدة اصطناعية/);
  assert.match(html, /dir="ltr" class="font-semibold text-on-surface">SYNTHETIC_RULE/);
});

test("dependency failures do not expose backend details", async () => {
  state.rulesError = new AuthDependencyError("private posting-rule database error");
  const html = await renderPage();
  assert.match(html, /Posting Rules are temporarily unavailable/);
  assert.doesNotMatch(html, /private posting-rule database error/);
});
