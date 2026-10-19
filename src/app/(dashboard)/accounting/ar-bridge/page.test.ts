import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import test, { mock } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
const tsUrl = pathToFileURL(require.resolve("typescript")).href;
const projectRoot = fileURLToPath(new URL("../../../../../", import.meta.url));
const testModuleLoader = `
import ts from ${JSON.stringify(tsUrl)};
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export default {}", shortCircuit: true };
  if (specifier === "next/navigation") return { url: "data:text/javascript,export function redirect(path) { throw new Error('redirect:' + path); }", shortCircuit: true };
  if (specifier === "./ArBridgeWorkspace") {
    return { url: "data:text/javascript," + encodeURIComponent("export default function ArBridgeWorkspace() {}"), shortCircuit: true };
  }
  if (specifier.startsWith("@/")) {
    const basePath = join(${JSON.stringify(projectRoot)}, "src", specifier.slice(2));
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

type ArBridgePageTestState = {
  capabilities: Set<string>;
  checks: string[];
  setupStatus: unknown;
  reconciliation: unknown;
  setupCalls: number;
  reconciliationCalls: number;
  periodCalls: number;
  ruleCalls: number;
};

const state: ArBridgePageTestState = {
  capabilities: new Set(),
  checks: [],
  setupStatus: { state: "INITIALIZED" },
  reconciliation: { state: "READY" },
  setupCalls: 0,
  reconciliationCalls: 0,
  periodCalls: 0,
  ruleCalls: 0,
};

mock.module(new URL("../../../../lib/auth/permissions.ts", import.meta.url).href, {
  namedExports: {
    checkPermission: async (capability: string) => {
      state.checks.push(capability);
      return state.capabilities.has(capability);
    },
  },
});
mock.module(new URL("../../../../lib/accounting/permissions.ts", import.meta.url).href, {
  namedExports: {
    canAccessAccountingArBridge: (canView: boolean, canManageArBridge: boolean) => canView || canManageArBridge,
  },
});
mock.module(new URL("../../../../lib/accounting/queries.ts", import.meta.url).href, {
  namedExports: {
    getAccountingSetupStatus: async () => { state.setupCalls += 1; return state.setupStatus; },
    getAccountingArBridgeReconciliation: async () => { state.reconciliationCalls += 1; return state.reconciliation; },
    listAccountingPeriods: async () => { state.periodCalls += 1; return []; },
    listAccountingPostingRules: async () => { state.ruleCalls += 1; return []; },
  },
});
mock.module(new URL("../../../../lib/i18n/index.ts", import.meta.url).href, {
  namedExports: { getDirection: () => "ltr" },
});
mock.module(new URL("../../../../lib/i18n/session-locale.ts", import.meta.url).href, {
  namedExports: { getCurrentSessionEffectiveLocale: async () => "en" },
});
mock.module(new URL("../../../../lib/i18n/dictionaries/accounting-ar-bridge.ts", import.meta.url).href, {
  namedExports: { getAccountingArBridgeDictionary: () => ({ title: "AR Bridge", subtitle: "Bridge operations" }) },
});

const { default: AccountingArBridgePage } = await import("./page.tsx");

function resetState() {
  state.capabilities.clear();
  state.checks.length = 0;
  state.setupStatus = { state: "INITIALIZED" };
  state.reconciliation = { state: "READY" };
  state.setupCalls = 0;
  state.reconciliationCalls = 0;
  state.periodCalls = 0;
  state.ruleCalls = 0;
}

async function getWorkspaceProps() {
  const page = await AccountingArBridgePage({ searchParams: Promise.resolve({}) });
  const children = (page as { props: { children: unknown[] } }).props.children;
  assert.ok(Array.isArray(children));
  return (children[1] as { props: Record<string, unknown> }).props;
}

test("AR bridge manager can read reconciliation without journal configuration permissions", async () => {
  resetState();
  state.capabilities.add("accounting:manage_ar_bridge");

  const props = await getWorkspaceProps();

  assert.equal(props.state, "ready");
  assert.equal(props.canManageArBridge, true);
  assert.equal(props.canReadJournalConfiguration, false);
  assert.equal(state.setupCalls, 0);
  assert.equal(state.periodCalls, 0);
  assert.equal(state.ruleCalls, 0);
  assert.equal(state.reconciliationCalls, 1);
  assert.deepEqual(state.checks, [
    "accounting:view",
    "accounting:manage_ar_bridge",
    "accounting:manage_profile",
    "accounting:manage_periods",
    "accounting:manage_chart",
  ]);
});

test("accounting viewer retains journal configuration reads on the AR bridge", async () => {
  resetState();
  state.capabilities.add("accounting:view");

  const props = await getWorkspaceProps();

  assert.equal(props.state, "ready");
  assert.equal(props.canManageArBridge, false);
  assert.equal(props.canReadJournalConfiguration, true);
  assert.equal(state.setupCalls, 1);
  assert.equal(state.periodCalls, 1);
  assert.equal(state.ruleCalls, 1);
  assert.equal(state.reconciliationCalls, 1);
});

test("AR bridge route denies users without either read or bridge-management authority", async () => {
  resetState();

  const props = await getWorkspaceProps();

  assert.equal(props.state, "access-denied");
  assert.equal(props.canManageArBridge, false);
  assert.equal(state.setupCalls, 0);
  assert.equal(state.periodCalls, 0);
  assert.equal(state.ruleCalls, 0);
  assert.equal(state.reconciliationCalls, 0);
});
