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
  if (specifier === "server-only") {
    return { url: "data:text/javascript,export default {}", shortCircuit: true };
  }
  if (specifier === "next/navigation") {
    return { url: "data:text/javascript,export function redirect(path) { throw new Error('redirect:' + path); }", shortCircuit: true };
  }
  if (specifier === "next/link") {
    return { url: ${JSON.stringify(linkShimUrl)}, shortCircuit: true };
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
    if (existsSync(join(basePath, "index.tsx"))) {
      return { url: pathToFileURL(join(basePath, "index.tsx")).href, shortCircuit: true };
    }
    if (existsSync(join(basePath, "index.ts"))) {
      return { url: pathToFileURL(join(basePath, "index.ts")).href, shortCircuit: true };
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
    const source = readFileSync(fileURLToPath(url), "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    return { format: "module", shortCircuit: true, source: transpiled.outputText };
  }
  return nextLoad(url, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

type SetupPageState = {
  locale: "en" | "ar";
  status: unknown;
  statusError: Error | null;
  targets: Array<{ id: string; name: string | null; role: string }>;
  targetError: Error | null;
};

const pageState: SetupPageState = {
  locale: "en",
  status: { state: "NOT_INITIALIZED", can_bootstrap: true },
  statusError: null,
  targets: [{ id: "00000000-0000-4000-8000-00000000e101", name: "Initial authority", role: "accountant" }],
  targetError: null,
};

mock.module(new URL("../../../../lib/accounting/queries.ts", import.meta.url).href, {
  namedExports: {
    getAccountingSetupStatus: async () => {
      if (pageState.statusError) throw pageState.statusError;
      return pageState.status;
    },
    listAccountingSetupTargets: async () => {
      if (pageState.targetError) throw pageState.targetError;
      return pageState.targets;
    },
  },
});

mock.module(new URL("../../../../lib/i18n/session-locale.ts", import.meta.url).href, {
  namedExports: { getCurrentSessionEffectiveLocale: async () => pageState.locale },
});

mock.module(new URL("../../../../lib/i18n/index.ts", import.meta.url).href, {
  namedExports: { getDirection: (locale: "en" | "ar") => locale === "ar" ? "rtl" : "ltr" },
});

mock.module(new URL("../../../../lib/accounting/actions.ts", import.meta.url).href, {
  namedExports: {
    bootstrapAccountingFoundation: async () => ({ ok: true }),
    transferAccountingRootAuthority: async () => ({ ok: true }),
    recoverAccountingRootAuthority: async () => ({ ok: true }),
    updateAccountingSetupProfile: async () => ({ ok: true }),
  },
});

const { ForbiddenError, AuthDependencyError } = await import("../../../../lib/auth/errors.ts");
const { default: AccountingSetupPage } = await import("./page.tsx");

const profile = {
  id: "00000000-0000-4000-8000-00000000e102",
  singleton_key: "g7",
  company_settings_id: "00000000-0000-4000-8000-00000000e103",
  version: 1,
  framework_key: "SA_IFRS_FOR_SMES",
  framework_edition: 2025,
  policy_version: "W10 provisional policy",
  endorsement_context: "Controller approved provisional baseline",
  professional_validation_state: "DEFERRED",
  professional_validation_evidence_ref: null,
  functional_currency: "SAR",
  fiscal_start_month: 1,
  fiscal_start_day: 1,
  fiscal_end_month: 12,
  fiscal_end_day: 31,
  fiscal_timezone: "Asia/Riyadh",
  accounting_start_date: null,
  cutover_boundary_date: null,
  legal_fiscal_evidence_pending: true,
  legal_fiscal_evidence_ref: null,
  vat_mode: "not_registered",
  zatca_state: "INACTIVE",
  fatoora_state: "INACTIVE",
  activation_state: "INACTIVE",
  effective_from: "2026-01-01T00:00:00.000Z",
  reason: "Synthetic setup page fixture",
  evidence_ref: null,
  created_by: "00000000-0000-4000-8000-00000000e104",
  created_at: "2026-01-01T00:00:00.000Z",
};

async function renderPage() {
  return renderToStaticMarkup(await AccountingSetupPage());
}

test("Accounting Setup route renders explicit not-initialized and recovery states", async () => {
  pageState.locale = "en";
  pageState.statusError = null;
  pageState.status = { state: "NOT_INITIALIZED", can_bootstrap: true };
  let html = await renderPage();
  assert.match(html, /dir="ltr"/);
  assert.match(html, /Accounting foundation not initialized/);
  assert.match(html, /Initialize accounting setup/);
  assert.match(html, /Initial authority/);

  pageState.status = { state: "RECOVERY_REQUIRED", can_recover: true };
  html = await renderPage();
  assert.match(html, /Accounting authority recovery required/);
  assert.match(html, /Restore authority/);
});

test("Accounting Setup route renders initialized profile and progress in Arabic RTL with locked activation and tax fields", async () => {
  pageState.locale = "ar";
  pageState.statusError = null;
  pageState.status = {
    state: "INITIALIZED",
    profile,
    can_manage_profile: true,
    can_manage_authority: true,
    setup_progress: {
      chart_of_accounts_started: false,
      accounting_periods_started: true,
      posting_rules_started: false,
      inception_reconstruction_started: false,
    },
  };
  const html = await renderPage();
  assert.match(html, /dir="rtl"/);
  assert.match(html, /إعداد المحاسبة/);
  assert.match(html, /دليل الحسابات/);
  assert.match(html, /بدأ/);
  assert.match(html, /INACTIVE/);
  assert.match(html, /not_registered/);
  assert.doesNotMatch(html, /name="activation_state"/);
  assert.doesNotMatch(html, /name="vat_mode"/);
  assert.doesNotMatch(html, /name="zatca_state"/);
  assert.doesNotMatch(html, /name="fatoora_state"/);
});

test("Accounting Setup route separates access-denied from dependency-failure states", async () => {
  pageState.locale = "en";
  pageState.statusError = new ForbiddenError("private accounting status");
  let html = await renderPage();
  assert.match(html, /Access denied/);
  assert.doesNotMatch(html, /private accounting status/);

  pageState.statusError = new AuthDependencyError("private database failure");
  html = await renderPage();
  assert.match(html, /Accounting setup is temporarily unavailable/);
  assert.doesNotMatch(html, /private database failure/);
});
