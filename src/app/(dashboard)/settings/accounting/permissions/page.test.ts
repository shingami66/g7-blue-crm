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
  if (specifier === "next/navigation") return { url: "data:text/javascript," + encodeURIComponent("export function redirect(path) { throw new Error('redirect:' + path); } export function useRouter() { return globalThis.__aarD5Router; }"), shortCircuit: true };
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

type TestState = {
  locale: "en" | "ar";
  accessDenied: boolean;
  targetError: Error | null;
  assignmentError: Error | null;
  targets: Array<{ id: string; name: string | null; role: string }>;
  assignments: Array<Record<string, unknown>>;
  targetExcludeCurrentActor: boolean | null;
  assignmentQueries: unknown[];
  permissionChecks: string[];
  actionCalls: Array<Record<string, unknown>>;
  actionResults: unknown[];
  refreshCount: number;
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
const { ForbiddenError, AuthDependencyError } = await import("../../../../../lib/auth/errors.ts");

const targetId = "9f09e715-9698-4804-a72b-331ebc776b8d";
const requestId = "a1b75d3d-27ea-42be-b972-33fbbeb19a32";
let state: TestState;

function resetState() {
  cleanup();
  state = {
    locale: "en",
    accessDenied: false,
    targetError: null,
    assignmentError: null,
    targets: [{ id: targetId, name: "Accounting Reviewer", role: "accountant" }],
    assignments: [],
    targetExcludeCurrentActor: null,
    assignmentQueries: [],
    permissionChecks: [],
    actionCalls: [],
    actionResults: [],
    refreshCount: 0,
  };
  (globalThis as typeof globalThis & { __aarD5Router: { refresh: () => void } }).__aarD5Router = {
    refresh: () => { state.refreshCount += 1; },
  };
  Object.defineProperty(globalThis, "crypto", {
    configurable: true,
    value: { randomUUID: () => requestId },
  });
}

resetState();

mock.module(new URL("../../../../../lib/auth/permissions.ts", import.meta.url).href, {
  namedExports: {
    requirePermission: async (permission: string) => {
      state.permissionChecks.push(permission);
      if (state.accessDenied) throw new ForbiddenError("sensitive permission detail");
      return { id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f", role: "viewer", is_active: true };
    },
  },
});

mock.module(new URL("../../../../../lib/accounting/queries.ts", import.meta.url).href, {
  namedExports: {
    listAccountingSetupTargets: async (excludeCurrentActor: boolean) => {
      state.targetExcludeCurrentActor = excludeCurrentActor;
      if (state.targetError) throw state.targetError;
      return state.targets;
    },
    listAccountingCapabilityAssignments: async (input: unknown) => {
      state.assignmentQueries.push(input);
      if (state.assignmentError) throw state.assignmentError;
      return state.assignments;
    },
  },
});

mock.module(new URL("../../../../../lib/i18n/session-locale.ts", import.meta.url).href, {
  namedExports: { getCurrentSessionEffectiveLocale: async () => state.locale },
});

mock.module(new URL("../../../../../lib/i18n/index.ts", import.meta.url).href, {
  namedExports: { getDirection: (locale: "en" | "ar") => locale === "ar" ? "rtl" : "ltr" },
});

mock.module(new URL("../../../../../lib/accounting/actions.ts", import.meta.url).href, {
  namedExports: {
    setAccountingCapability: async (input: Record<string, unknown>) => {
      state.actionCalls.push(input);
      return state.actionResults.shift() ?? { ok: true, value: { capability_event_id: "event-1", revision: 8 } };
    },
  },
});

const { default: AccountingPermissionsPage } = await import("./page.tsx");
const { default: AccountingPermissionsClient } = await import("./AccountingPermissionsClient.tsx");

const baseAssignment = {
  capability: "accounting:manage_chart",
  effect: "DENY",
  revision: 7,
  expires_at: null,
  actor_user_id: "8cefe8c1-7914-4b3b-915d-24d6fcdfc76f",
  created_at: "2026-10-01T08:30:00.000Z",
};

async function renderPage(target_user_id?: string) {
  const page = await AccountingPermissionsPage({
    searchParams: Promise.resolve(target_user_id ? { target_user_id } : {}),
  });
  return renderToStaticMarkup(page);
}

function renderClient(assignments: Array<Record<string, unknown>>, locale: "en" | "ar" = "en") {
  return render(React.createElement(AccountingPermissionsClient, {
    locale,
    targets: state.targets,
    selectedTargetId: targetId,
    assignments,
  }) as Parameters<typeof render>[0]);
}

function field(container: HTMLElement, name: string): HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement {
  const found = container.querySelector(`[name="${name}"]`);
  assert.ok(found, `Expected field ${name}`);
  return found as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
}

function fillRequiredFields(container: HTMLElement) {
  fireEvent.change(field(container, "reason"), { target: { value: "Controller-approved test change" } });
}

test("permissions route requires accounting authority and reads only the selected active user's assignments", async () => {
  resetState();
  state.assignments = [{ ...baseAssignment, capability: "accounting:close_period", effect: "ALLOW", revision: 3 }];
  const html = await renderPage(targetId);

  assert.deepEqual(state.permissionChecks, ["accounting:manage_authority"]);
  assert.equal(state.targetExcludeCurrentActor, true);
  assert.deepEqual(state.assignmentQueries, [{ target_user_id: targetId }]);
  assert.match(html, /dir="ltr"/);
  assert.match(html, /Accounting permissions/);
  assert.match(html, /Accounting Reviewer/);
  assert.match(html, /accounting:close_period/);
  assert.match(html, /Current revision/);
  assert.match(html, /href="\/settings\/accounting"/);
});

test("permissions route denies CRM-role-only access and renders dependency failures without internals", async () => {
  resetState();
  state.accessDenied = true;
  let html = await renderPage(targetId);
  assert.match(html, /Access denied/);
  assert.doesNotMatch(html, /sensitive permission detail/);
  assert.deepEqual(state.assignmentQueries, []);

  resetState();
  state.locale = "ar";
  state.targetError = new AuthDependencyError("private query detail");
  html = await renderPage(targetId);
  assert.match(html, /dir="rtl"/);
  assert.match(html, /صلاحيات المحاسبة غير متاحة مؤقتاً/);
  assert.doesNotMatch(html, /private query detail/);
});

test("capability change submits the latest expected revision, ALLOW expiry, reason, and optional evidence", async () => {
  resetState();
  state.actionResults = [{ ok: true, value: { capability_event_id: "event-1", revision: 8 } }];
  const view = renderClient([baseAssignment]);
  fireEvent.click(screen.getByRole("button", { name: /Manage.*Chart of Accounts/ }));
  fireEvent.change(field(view.container, "effect"), { target: { value: "ALLOW" } });
  fireEvent.change(field(view.container, "expires_at"), { target: { value: "2027-01-01T12:30" } });
  fillRequiredFields(view.container);
  fireEvent.change(field(view.container, "evidence_ref"), { target: { value: "evidence://aar-d5/ui-test" } });
  fireEvent.click(screen.getByRole("button", { name: "Save capability change" }));

  await waitFor(() => assert.equal(state.actionCalls.length, 1));
  assert.deepEqual(state.actionCalls[0], {
    target_user_id: targetId,
    capability: "accounting:manage_chart",
    effect: "ALLOW",
    expires_at: new Date("2027-01-01T12:30").toISOString(),
    expected_revision: 7,
    reason: "Controller-approved test change",
    evidence_ref: "evidence://aar-d5/ui-test",
    request_id: requestId,
  });
  assert.equal(state.refreshCount, 1);
  assert.match(view.container.textContent ?? "", /Capability change recorded/);
});

test("root authority is read-only in the generic UI and revoke is unavailable without an assignment", () => {
  resetState();
  const view = renderClient([{
    ...baseAssignment,
    capability: "accounting:manage_authority",
    effect: "ALLOW",
    revision: 4,
  }]);
  const rootCard = view.container.querySelector('[data-capability="accounting:manage_authority"]');
  assert.ok(rootCard);
  assert.equal(rootCard.querySelector("button"), null);
  assert.equal(rootCard.querySelector("form"), null);
  assert.match(rootCard.textContent ?? "", /Root accounting authority/);
  assert.ok(rootCard.querySelector('a[href="/settings/accounting"]'));

  const effect = field(view.container, "effect") as HTMLSelectElement;
  const revokeOption = effect.querySelector('option[value="REVOKE"]') as HTMLOptionElement | null;
  assert.equal(revokeOption?.disabled, true);
  fireEvent.change(effect, { target: { value: "DENY" } });
  assert.equal((field(view.container, "expires_at") as HTMLInputElement).disabled, true);
});

test("Arabic permissions UI is RTL and a revision conflict refreshes before the next expected revision", async () => {
  resetState();
  state.locale = "ar";
  state.actionResults = [
    { ok: false, code: "revision_conflict" },
    { ok: true, value: { capability_event_id: "event-2", revision: 9 } },
  ];
  const view = renderClient([baseAssignment], "ar");
  assert.equal(view.container.firstElementChild?.getAttribute("dir"), "rtl");
  assert.match(view.container.textContent ?? "", /تعيينات الصلاحيات الحالية/);
  fireEvent.click(screen.getByRole("button", { name: /إدارة.*دليل الحسابات/ }));
  fillRequiredFields(view.container);
  fireEvent.click(screen.getByRole("button", { name: "حفظ تغيير الصلاحية" }));
  await waitFor(() => assert.equal(state.actionCalls.length, 1));
  assert.match(view.container.textContent ?? "", /تم تسجيل تغيير آخر للصلاحية/);
  assert.equal(state.refreshCount, 1);

  view.rerender(React.createElement(AccountingPermissionsClient, {
    locale: "ar",
    targets: state.targets,
    selectedTargetId: targetId,
    assignments: [{ ...baseAssignment, revision: 8 }],
  }) as Parameters<typeof render>[0]);
  fillRequiredFields(view.container);
  fireEvent.click(screen.getByRole("button", { name: "حفظ تغيير الصلاحية" }));
  await waitFor(() => assert.equal(state.actionCalls.length, 2));
  assert.equal(state.actionCalls[1].expected_revision, 8);
  assert.equal(state.refreshCount, 2);
  assert.doesNotMatch(view.container.textContent ?? "", /private|database|stack trace/i);
});
