import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import test from "node:test";
import { pathToFileURL } from "node:url";
import React, { isValidElement, type ReactNode } from "react";

const require = createRequire(import.meta.url);
const tsUrl = pathToFileURL(require.resolve("typescript")).href;
const grantedPermissions = new Set<string>();
const checkedPermissions: string[] = [];
const layoutTestState = {
  grantedPermissions,
  checkedPermissions,
  locale: "en" as "en" | "ar",
};

function SidebarStub() {
  return null;
}

function TopbarStub() {
  return null;
}

function LocaleProviderStub() {
  return null;
}

function BusinessYearSelectorStub() {
  return null;
}

function FeedbackProviderStub() {
  return null;
}

function FeedbackBoundaryStub() {
  return null;
}

const layoutTestGlobals = globalThis as typeof globalThis & {
  __ux03aLayoutTestState?: typeof layoutTestState;
  __ux03aLayoutTestStubs?: Record<string, unknown>;
};
layoutTestGlobals.__ux03aLayoutTestState = layoutTestState;
layoutTestGlobals.__ux03aLayoutTestStubs = {
  SidebarStub,
  TopbarStub,
  LocaleProviderStub,
  BusinessYearSelectorStub,
  FeedbackProviderStub,
  FeedbackBoundaryStub,
};

function dataModule(source: string) {
  return `data:text/javascript,${encodeURIComponent(source)}`;
}

const mockedModules = {
  "@/lib/auth/permissions": dataModule(`
    export async function checkPermission(permission) {
      const state = globalThis.__ux03aLayoutTestState;
      state.checkedPermissions.push(permission);
      return state.grantedPermissions.has(permission);
    }
    export async function getCurrentAppUser() { return { is_active: true }; }
  `),
  "@/lib/auth/role-permissions": dataModule(`
    export const PETTY_CASH_PERMISSIONS = { read: "petty_cash:read" };
    export const SUPPLIER_ADVANCE_PERMISSIONS = { read: "supplier_advances:read" };
    export const SUPPLIER_BILL_PERMISSIONS = { read: "supplier_bills:read" };
    export const SUPPLIER_PAYMENT_PERMISSIONS = { read: "supplier_payments:read" };
  `),
  "@/components/layout/Sidebar": dataModule("export default globalThis.__ux03aLayoutTestStubs.SidebarStub;"),
  "@/components/layout/Topbar": dataModule("export default globalThis.__ux03aLayoutTestStubs.TopbarStub;"),
  "@/components/i18n/LocaleProvider": dataModule("export const LocaleProvider = globalThis.__ux03aLayoutTestStubs.LocaleProviderStub;"),
  "@/components/i18n/BusinessYearSelectorData": dataModule("export default globalThis.__ux03aLayoutTestStubs.BusinessYearSelectorStub;"),
  "@/components/ui/NavigationFeedbackProvider": dataModule(`
    export const NavigationFeedbackProvider = globalThis.__ux03aLayoutTestStubs.FeedbackProviderStub;
    export const NavigationFeedbackBoundary = globalThis.__ux03aLayoutTestStubs.FeedbackBoundaryStub;
  `),
  "@/lib/i18n": dataModule("export function getDirection(locale) { return locale === 'ar' ? 'rtl' : 'ltr'; }"),
  "@/lib/i18n/session-locale": dataModule("export async function getCurrentSessionEffectiveLocale() { return globalThis.__ux03aLayoutTestState.locale; }"),
  "@/lib/reports/catalog": dataModule(`
    export function getReportDefinitions() { return []; }
    export function filterAuthorizedReportDefinitions() { return []; }
  `),
};

const nextNavigationDataUrl = `data:text/javascript,${encodeURIComponent(
  "export function redirect(path) { throw new Error('redirect:' + path); }",
)}`;
const testModuleLoader = `
import ts from ${JSON.stringify(tsUrl)};
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { join } from "node:path";
const mockedModules = ${JSON.stringify(mockedModules)};

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "server-only") return { url: "data:text/javascript,export default {}", shortCircuit: true };
  if (specifier === "next/navigation") return { url: ${JSON.stringify(nextNavigationDataUrl)}, shortCircuit: true };
  if (mockedModules[specifier]) return { url: mockedModules[specifier], shortCircuit: true };
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

const { default: DashboardLayout } = await import("./layout.tsx");

function findSidebarProps(node: ReactNode): Record<string, unknown> | null {
  if (Array.isArray(node)) {
    for (const child of node) {
      const props = findSidebarProps(child);
      if (props) return props;
    }
    return null;
  }
  if (!isValidElement(node)) return null;

  if (node.type === SidebarStub) return node.props as Record<string, unknown>;
  return findSidebarProps((node.props as { children?: ReactNode }).children);
}

async function getSidebarProps(permissions: string[], locale: "en" | "ar" = "en") {
  grantedPermissions.clear();
  checkedPermissions.length = 0;
  for (const permission of permissions) grantedPermissions.add(permission);
  layoutTestState.locale = locale;

  const tree = await DashboardLayout({ children: React.createElement("main") });
  const props = findSidebarProps(tree);
  assert.ok(props, "Dashboard Layout must render the Sidebar");
  return props;
}

test("authority-only permission result reaches Sidebar without enabling Accounting Setup", async () => {
  const props = await getSidebarProps(["accounting:manage_authority"]);

  assert.equal(checkedPermissions.filter((permission) => permission === "accounting:manage_authority").length, 1);
  assert.equal(props.canManageAccountingAuthority, true);
  assert.equal(props.canAccessAccountingSetup, false);
  assert.equal(props.canViewAccounting, false);
  assert.equal(props.isAdmin, false);
});

test("view and profile permissions keep Setup separate from authority management", async () => {
  const viewOnly = await getSidebarProps(["accounting:view"]);
  assert.equal(viewOnly.canAccessAccountingSetup, true);
  assert.equal(viewOnly.canManageAccountingAuthority, false);

  const profileOnly = await getSidebarProps(["accounting:manage_profile"]);
  assert.equal(profileOnly.canAccessAccountingSetup, true);
  assert.equal(profileOnly.canManageAccountingAuthority, false);

  const viewAndAuthority = await getSidebarProps(["accounting:view", "accounting:manage_authority"]);
  assert.equal(viewAndAuthority.canAccessAccountingSetup, true);
  assert.equal(viewAndAuthority.canManageAccountingAuthority, true);

  const profileAndAuthority = await getSidebarProps(["accounting:manage_profile", "accounting:manage_authority"]);
  assert.equal(profileAndAuthority.canAccessAccountingSetup, true);
  assert.equal(profileAndAuthority.canManageAccountingAuthority, true);
});

test("Admin Setup eligibility is preserved without synthesizing authority access", async () => {
  const adminOnly = await getSidebarProps(["users:manage"]);
  assert.equal(adminOnly.isAdmin, true);
  assert.equal(adminOnly.canAccessAccountingSetup, true);
  assert.equal(adminOnly.canManageAccountingAuthority, false);

  const adminWithAuthority = await getSidebarProps(["users:manage", "accounting:manage_authority"]);
  assert.equal(adminWithAuthority.isAdmin, true);
  assert.equal(adminWithAuthority.canAccessAccountingSetup, true);
  assert.equal(adminWithAuthority.canManageAccountingAuthority, true);
});

test("Chart, Period, and Inception capabilities do not synthesize Accounting Setup or authority navigation", async () => {
  for (const permission of ["accounting:manage_chart", "accounting:manage_periods", "accounting:manage_inception"]) {
    const props = await getSidebarProps([permission]);
    assert.equal(props.canAccessAccountingSetup, false, permission);
    assert.equal(props.canManageAccountingAuthority, false, permission);
    assert.equal(props.canViewAccounting, false, permission);
    assert.equal(props.isAdmin, false, permission);
  }
});
