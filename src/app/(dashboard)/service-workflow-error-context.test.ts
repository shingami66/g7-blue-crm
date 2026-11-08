import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { ProcurementCommitmentDictionary } from "@/lib/i18n/dictionaries/procurement-commitments";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string) => { window: { document: Document } } };
const root = resolve(process.cwd(), "src");
const cache = new Map<string, { exports: Record<string, unknown> }>();
const h = React.createElement;
type Locale = "en" | "ar";
type SearchParams = Record<string, string | string[] | undefined>;
type Route = "procurement" | "commitments";

const serviceId = "123e4567-e89b-42d3-a456-426614174000";
const otherServiceId = "223e4567-e89b-42d3-a456-426614174000";
const privateValues = [
  serviceId,
  otherServiceId,
  "EVT-PRIVATE-008",
  "Private Event Record",
  "Private Event Name",
  "Private Customer LLC",
  "Private Supplier LLC",
  "SUP-PRIVATE-4001",
  "PKG-PRIVATE-9001",
  "Private Package Name",
  "COM-PRIVATE-3001",
  "receipt-private-reference",
  "private query detail and supplier name",
];

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}
class RedirectSignal extends Error {
  readonly destination: string;

  constructor(destination: string) {
    super(`redirect:${destination}`);
    this.destination = destination;
  }
}
class NotFoundSignal extends Error {}

const scenario: {
  locale: Locale;
  serviceResult: Record<string, unknown>;
  serviceFailure: Error | null;
  permissions: Record<string, boolean>;
  permissionChecks: string[];
  permissionFailure: { permission?: string; error: Error } | null;
  calls: string[];
  packageResult: Record<string, unknown>;
  quotationResult: { quotations: unknown[] };
  supplierResult: { suppliers: unknown[] };
  commitmentResult: Record<string, unknown>;
  quotationOptions: { quotations: unknown[] };
  workspaceProps: { procurement: Record<string, unknown> | null; commitments: Record<string, unknown> | null };
} = {
  locale: "en",
  serviceResult: {},
  serviceFailure: null,
  permissions: {},
  permissionChecks: [],
  permissionFailure: null,
  calls: [],
  packageResult: {},
  quotationResult: { quotations: [] },
  supplierResult: { suppliers: [] },
  commitmentResult: {},
  quotationOptions: { quotations: [] },
  workspaceProps: { procurement: null, commitments: null },
};

function makeService() {
  return {
    serviceNumber: "EVT-PRIVATE-008",
    serviceTitle: "Private Event Record",
    eventName: "Private Event Name",
    status: "Inquiry",
    customer: { company: "Private Customer LLC" },
  };
}

function reset(locale: Locale) {
  scenario.locale = locale;
  scenario.serviceResult = { status: "ready", service: makeService() };
  scenario.serviceFailure = null;
  scenario.permissions = {
    "supplier_costing:read": true,
    "supplier_costing:write": true,
    "procurement_commitments:read": true,
    "procurement_commitments:write": true,
    "procurement_commitments:amend": true,
    "procurement_commitments:lifecycle": true,
    "service_receipts:write": true,
    "service_receipts:accept": true,
    "service_receipts:correct": true,
    "documents:write": true,
  };
  scenario.permissionChecks.length = 0;
  scenario.permissionFailure = null;
  scenario.calls.length = 0;
  scenario.packageResult = { packages: [{ id: "package-row" }] };
  scenario.quotationResult = { quotations: [{ id: "quotation-row" }] };
  scenario.supplierResult = { suppliers: [{ id: "supplier-row" }] };
  scenario.commitmentResult = { commitments: [{ id: "commitment-row" }], error: null };
  scenario.quotationOptions = { quotations: [{ id: "quotation-option" }] };
  scenario.workspaceProps = { procurement: null, commitments: null };
}

function findModule(path: string): string | undefined {
  return [path, `${path}.tsx`, `${path}.ts`, resolve(path, "index.tsx"), resolve(path, "index.ts")].find(existsSync);
}

function loadModule(path: string): Record<string, unknown> {
  const file = findModule(path);
  assert.ok(file, `Missing test import: ${path}`);
  if (cache.has(file)) return cache.get(file)!.exports;

  const compiled = { exports: {} as Record<string, unknown> };
  cache.set(file, compiled);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;

  const importModule = (specifier: string): unknown => {
    if (specifier === "server-only") return {};
    if (specifier === "next/navigation") {
      return {
        redirect: (destination: string) => { throw new RedirectSignal(destination); },
        notFound: () => { throw new NotFoundSignal("not found"); },
      };
    }
    if (specifier === "next/link") {
      const Link = React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>>(
        function TestLink(props, ref) { return h("a", { ...props, ref }, props.children); },
      );
      return { __esModule: true, default: Link, useLinkStatus: () => ({ pending: false }) };
    }
    if (specifier === "./NavigationFeedbackProvider" || specifier === "@/components/ui/NavigationFeedbackProvider") {
      return { useNavigationFeedback: () => ({ reportPending: () => {} }) };
    }
    if (specifier === "@/components/ui/useGlobalNavigationPending") {
      return { useGlobalNavigationPending: () => ({ isPending: false, push: () => {} }) };
    }
    if (specifier === "@/lib/auth/errors") return { UnauthorizedError, ForbiddenError };
    if (specifier === "@/lib/auth/permissions") {
      const check = async (permission: string) => {
        scenario.permissionChecks.push(permission);
        if (scenario.permissionFailure && (!scenario.permissionFailure.permission || scenario.permissionFailure.permission === permission)) {
          throw scenario.permissionFailure.error;
        }
        return scenario.permissions[permission] ?? true;
      };
      return {
        requirePermission: async (permission: string) => {
          const allowed = await check(permission);
          if (!allowed) throw new ForbiddenError("permission denied");
        },
        checkPermission: check,
      };
    }
    if (specifier === "@/lib/auth/role-permissions") {
      return {
        BUSINESS_DOCUMENT_PERMISSIONS: { read: "documents:read", write: "documents:write" },
        PROCUREMENT_COMMITMENT_PERMISSIONS: {
          read: "procurement_commitments:read",
          write: "procurement_commitments:write",
          amend: "procurement_commitments:amend",
          lifecycle: "procurement_commitments:lifecycle",
        },
        SERVICE_RECEIPT_PERMISSIONS: {
          read: "service_receipts:read",
          write: "service_receipts:write",
          accept: "service_receipts:accept",
          correct: "service_receipts:correct",
        },
      };
    }
    if (specifier === "@/lib/i18n/session-locale") {
      return { getCurrentSessionEffectiveLocale: async () => scenario.locale };
    }
    if (specifier === "@/lib/services/queries") {
      return {
        getServiceByIdResult: async (id: string) => {
          scenario.calls.push(`service:${id}`);
          if (scenario.serviceFailure) throw scenario.serviceFailure;
          return scenario.serviceResult;
        },
      };
    }
    if (specifier === "@/lib/procurement/queries") {
      return { getActiveProcurementSupplierOptions: async () => {
        scenario.calls.push("suppliers");
        return scenario.supplierResult;
      } };
    }
    if (specifier === "@/lib/procurement/package-queries") {
      return {
        getProcurementPackagesByServiceId: async () => { scenario.calls.push("packages"); return scenario.packageResult; },
        getSupplierQuotationsByServiceId: async () => { scenario.calls.push("quotations"); return scenario.quotationResult; },
      };
    }
    if (specifier === "@/lib/procurement/commitment-receipt-queries") {
      return {
        getApprovedCommitmentsByServiceId: async () => { scenario.calls.push("commitments"); return scenario.commitmentResult; },
        getSupplierQuotationCommitmentOptions: async () => { scenario.calls.push("commitment-quotations"); return scenario.quotationOptions; },
      };
    }
    if (specifier === "@/lib/supabase/admin") return { createAdminClient: () => { throw new Error("unexpected admin query"); } };
    if (specifier === "./ProcurementPackageWorkspace") {
      return { __esModule: true, default: (props: Record<string, unknown>) => {
        scenario.workspaceProps.procurement = props;
        return h("div", { "data-testid": "procurement-workspace" });
      } };
    }
    if (specifier === "./CommitmentReceiptWorkspace") {
      return { __esModule: true, default: (props: Record<string, unknown>) => {
        scenario.workspaceProps.commitments = props;
        return h("div", { "data-testid": "commitments-workspace", "data-load-error": props.loadError ? "true" : "false" });
      } };
    }
    if (specifier.startsWith("@/")) return loadModule(resolve(root, specifier.slice(2)));
    if (specifier.startsWith(".")) return loadModule(resolve(dirname(file), specifier));
    return require(specifier);
  };

  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}

type Page = (props: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) => Promise<React.ReactNode>;
const pages: Record<Route, Page> = {
  procurement: loadModule(resolve(root, "app/(dashboard)/services/[id]/procurement/page")).default as Page,
  commitments: loadModule(resolve(root, "app/(dashboard)/services/[id]/commitments/page")).default as Page,
};
const LocaleProvider = loadModule(resolve(root, "components/i18n/LocaleProvider")).LocaleProvider as React.ComponentType<React.PropsWithChildren<{ locale: Locale }>>;
const getServicesDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/services")).getServicesDictionary as (locale: Locale) => ServicesDictionary;
const getCommitmentsDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/procurement-commitments")).getProcurementCommitmentDictionary as (locale: Locale) => ProcurementCommitmentDictionary;
const getCommonDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/common")).getCommonDictionary as (locale: Locale) => { actions: { back: string } };

async function render(route: Route, searchParams: SearchParams = {}) {
  const tree = await pages[route]({ params: Promise.resolve({ id: serviceId }), searchParams: Promise.resolve(searchParams) });
  const markup = renderToStaticMarkup(h(LocaleProvider, { locale: scenario.locale }, tree));
  return new JSDOM(markup).window.document;
}

function assertErrorShell(doc: Document, route: Route, locale: Locale, config: {
  taskTitle: string;
  title: string;
  message: string;
  role: "alert" | "status";
  returnHref: string;
  returnLabel: string;
  protectedValues?: string[];
}) {
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(doc.querySelector("h1")?.textContent, config.taskTitle);
  assert.equal(doc.querySelector("h1")?.getAttribute("dir"), "auto");
  assert.equal(doc.querySelectorAll("h2").length, 1);
  assert.equal(doc.querySelector("h2")?.textContent, config.title);
  const state = doc.querySelector<HTMLElement>(`[role="${config.role}"]`);
  assert.ok(state);
  assert.equal(state.getAttribute("aria-labelledby"), `${route}-error-title`);
  assert.equal(state.querySelector("p")?.textContent, config.message);
  assert.equal(doc.querySelectorAll("[role=alert], [role=status]").length, 1);
  assert.equal(scenario.workspaceProps[route], null, "failure states do not render the specialized workspace");

  const back = [...doc.querySelectorAll<HTMLAnchorElement>("a")].find((link) => link.getAttribute("aria-label") === config.returnLabel);
  assert.ok(back, "localized labeled Return link is visible");
  assert.equal(back.getAttribute("href"), config.returnHref);
  assert.equal(back.textContent?.trim(), config.returnLabel);
  assert.equal(doc.querySelectorAll("a").length, 1, "failure state has one Return control");
  assert.ok(back.className.includes("focus-visible:ring-2"));
  assert.equal(back.querySelector("svg")?.classList.contains("scale-x-[-1]"), locale === "ar");
  assert.equal(doc.querySelector(`[dir="${locale === "ar" ? "rtl" : "ltr"}"]`), doc.body.firstElementChild);
  const shell = doc.querySelector<HTMLElement>(".max-w-7xl");
  assert.ok(shell?.className.includes("min-w-0"));
  assert.ok(shell?.className.includes("w-full"));
  assert.ok(state.className.includes("sm:p-8"));
  assert.equal(doc.querySelectorAll("form, button, input, select, textarea").length, 0);
  assert.equal(doc.querySelectorAll("a a, a button, button a, button button").length, 0);
  const markup = doc.documentElement.innerHTML;
  for (const value of config.protectedValues ?? privateValues) assert.equal(markup.includes(value), false, `exposed protected value: ${value}`);
}

function errorConfig(route: Route, locale: Locale, kind: "denied" | "load", returnHref: string, returnLabel = getServicesDictionary(locale).detail.backToServices) {
  const services = getServicesDictionary(locale);
  const taskTitle = route === "procurement" ? services.procurementWorkspace.title : getCommitmentsDictionary(locale).title;
  const commitments = getCommitmentsDictionary(locale);
  return {
    taskTitle,
    title: kind === "denied" ? services.states.accessDenied : services.states.genericError,
    message: route === "procurement"
      ? kind === "denied" ? services.states.serviceReadForbidden : services.states.serviceDataLoadError
      : kind === "denied" ? commitments.noPermission : commitments.loadError,
    role: kind === "denied" ? "status" as const : "alert" as const,
    returnHref,
    returnLabel,
  };
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale}: Procurement denied and load failures keep safe task context`, async () => {
    const services = getServicesDictionary(locale);
    reset(locale);
    scenario.permissionFailure = { permission: "services:read", error: new ForbiddenError("private access detail") };
    let doc = await render("procurement", { returnTo: "https://outside.example/private" });
    assertErrorShell(doc, "procurement", locale, errorConfig("procurement", locale, "denied", "/services"));
    assert.deepEqual(scenario.calls, []);

    reset(locale);
    scenario.serviceResult = { status: "error", detail: "private query detail and supplier name" };
    doc = await render("procurement", { returnTo: `/services/${otherServiceId}` });
    assertErrorShell(doc, "procurement", locale, errorConfig("procurement", locale, "load", "/services"));
    assert.deepEqual(scenario.permissionChecks, ["services:read"]);

    reset(locale);
    scenario.permissions["supplier_costing:read"] = false;
    doc = await render("procurement", { returnTo: `/services/${otherServiceId}` });
    assertErrorShell(doc, "procurement", locale, errorConfig("procurement", locale, "denied", "/services"));
    assert.equal(scenario.calls.some((call) => ["packages", "suppliers", "quotations"].includes(call)), false);

    const serviceDetail = `/services/${otherServiceId}`;
    const serviceList = "/services";
    const fallbackServiceDetail = `/services/${serviceId}`;
    const otherCustomer = "/customers/123e4567-e89b-42d3-a456-426614174111";
    const specializedProcurement = `${serviceDetail}/procurement?tab=packages`;
    const packageFailureCases = [
      {
        params: { returnTo: serviceDetail },
        returnHref: serviceDetail,
        returnLabel: services.procurementWorkspace.backToService,
      },
      {
        params: { returnTo: `${serviceDetail}?tab=overview` },
        returnHref: `${serviceDetail}?tab=overview`,
        returnLabel: services.procurementWorkspace.backToService,
      },
      {
        params: { returnTo: serviceList },
        returnHref: serviceList,
        returnLabel: services.detail.backToServices,
      },
      {
        params: { returnTo: "/services?page=2&status=Inquiry" },
        returnHref: "/services?page=2&status=Inquiry",
        returnLabel: services.detail.backToServices,
      },
      {
        params: {},
        returnHref: fallbackServiceDetail,
        returnLabel: services.procurementWorkspace.backToService,
      },
      {
        params: { returnTo: "https://outside.example/private" },
        returnHref: fallbackServiceDetail,
        returnLabel: services.procurementWorkspace.backToService,
      },
      {
        params: { returnTo: "//outside.example/private" },
        returnHref: fallbackServiceDetail,
        returnLabel: services.procurementWorkspace.backToService,
      },
      {
        params: { returnTo: "/settings?tab=security" },
        returnHref: fallbackServiceDetail,
        returnLabel: services.procurementWorkspace.backToService,
      },
      {
        params: { returnTo: otherCustomer },
        returnHref: otherCustomer,
        returnLabel: getCommonDictionary(locale).actions.back,
      },
      {
        params: { returnTo: specializedProcurement },
        returnHref: specializedProcurement,
        returnLabel: getCommonDictionary(locale).actions.back,
      },
    ];

    for (const context of packageFailureCases) {
      reset(locale);
      scenario.packageResult = { packages: [], error: new Error("private query detail and supplier name") };
      doc = await render("procurement", context.params);
      assertErrorShell(doc, "procurement", locale, {
        ...errorConfig("procurement", locale, "load", context.returnHref, context.returnLabel),
        protectedValues: privateValues.filter((value) => !context.returnHref.includes(value)),
      });
      assert.deepEqual(scenario.calls, [`service:${serviceId}`, "packages", "suppliers", "quotations"]);
    }
    assert.equal(services.procurementWorkspace.title, doc.querySelector("h1")?.textContent);
  });

  test(`${locale}: Commitments denied and service-load failures keep safe task context`, async () => {
    reset(locale);
    scenario.serviceFailure = new ForbiddenError("private service detail");
    let doc = await render("commitments", { returnTo: `/services/${otherServiceId}` });
    assertErrorShell(doc, "commitments", locale, errorConfig("commitments", locale, "denied", "/services"));
    assert.deepEqual(scenario.permissionChecks, []);

    reset(locale);
    scenario.serviceResult = { status: "error", detail: "private query detail and supplier name" };
    doc = await render("commitments", { returnTo: "https://outside.example/private" });
    assertErrorShell(doc, "commitments", locale, errorConfig("commitments", locale, "load", "/services"));
    assert.deepEqual(scenario.permissionChecks, []);

    reset(locale);
    scenario.permissions["procurement_commitments:read"] = false;
    doc = await render("commitments", { returnTo: `/services/${otherServiceId}` });
    assertErrorShell(doc, "commitments", locale, errorConfig("commitments", locale, "denied", "/services"));
    assert.deepEqual(scenario.calls, [`service:${serviceId}`]);
    assert.equal(scenario.calls.some((call) => call.startsWith("commitments") || call.startsWith("commitment-quotations")), false);
  });
}

test("Procurement keeps authorized workspace props and gates the commitments link", async () => {
  reset("en");
  scenario.permissions["supplier_costing:write"] = false;
  scenario.permissions["procurement_commitments:read"] = false;
  let doc = await render("procurement", { returnTo: `/services/${otherServiceId}` });
  const props = scenario.workspaceProps.procurement;
  assert.ok(props);
  assert.equal(doc.querySelector('[data-testid="procurement-workspace"]') !== null, true);
  assert.equal(doc.querySelector("h1")?.textContent, getServicesDictionary("en").procurementWorkspace.title);
  assert.equal(doc.querySelector("p")?.textContent, "Private Event Record");
  const procurementBack = [...doc.querySelectorAll<HTMLAnchorElement>("a")]
    .find((link) => link.getAttribute("aria-label") === getCommonDictionary("en").actions.back);
  assert.equal(procurementBack?.getAttribute("href"), `/services/${otherServiceId}`);
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(props.serviceId, serviceId);
  assert.equal(props.serviceNumber, "EVT-PRIVATE-008");
  assert.equal(props.serviceStatus, "Inquiry");
  assert.deepEqual(props.packages, scenario.packageResult.packages);
  assert.deepEqual(props.suppliers, []);
  assert.deepEqual(props.quotations, scenario.quotationResult.quotations);
  assert.equal(props.canWrite, false);
  assert.equal(props.returnTo, `/services/${otherServiceId}`);
  assert.equal(props.locale, "en");
  assert.equal(props.dictionary, getServicesDictionary("en").procurementWorkspace);
  assert.deepEqual(scenario.permissionChecks, [
    "services:read",
    "supplier_costing:read",
    "supplier_costing:write",
    "procurement_commitments:read",
  ]);
  assert.equal(doc.querySelector('a[href*="/commitments"]'), null);
  assert.equal(scenario.calls.includes("suppliers"), false);

  reset("ar");
  doc = await render("procurement");
  assert.ok(scenario.workspaceProps.procurement);
  assert.ok(doc.querySelector('a[href*="/commitments"]'));
  assert.equal(scenario.workspaceProps.procurement?.canWrite, true);
  assert.equal(scenario.workspaceProps.procurement?.locale, "ar");
  assert.ok(doc.querySelector('[data-testid="procurement-workspace"]'));
});

test("Commitments keeps authorized workspace props and the inline load-error contract", async () => {
  reset("ar");
  scenario.commitmentResult = { commitments: [], error: new Error("private query detail and supplier name") };
  scenario.permissions["procurement_commitments:write"] = false;
  const doc = await render("commitments", { returnTo: `/services/${otherServiceId}` });
  const props = scenario.workspaceProps.commitments;
  assert.ok(props);
  assert.equal(doc.querySelector('[data-testid="commitments-workspace"]')?.getAttribute("data-load-error"), "true");
  assert.equal(doc.querySelector("h1")?.textContent, getCommitmentsDictionary("ar").title);
  assert.equal(doc.querySelector("p")?.textContent, "Private Event Record");
  const commitmentsBack = [...doc.querySelectorAll<HTMLAnchorElement>("a")]
    .find((link) => link.getAttribute("aria-label") === getCommonDictionary("ar").actions.back);
  assert.equal(commitmentsBack?.getAttribute("href"), `/services/${otherServiceId}`);
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(props.serviceId, serviceId);
  assert.equal(props.returnTo, `/services/${otherServiceId}`);
  assert.equal(props.serviceStatus, "Inquiry");
  assert.deepEqual(props.commitments, []);
  assert.deepEqual(props.suppliers, []);
  assert.deepEqual(props.quotationOptions, []);
  assert.equal(props.loadError, true);
  assert.equal(props.canCreateCommitment, false);
  assert.equal(props.canAmend, true);
  assert.equal(props.canTransition, true);
  assert.equal(props.canWriteReceipt, true);
  assert.equal(props.canAcceptReceipt, true);
  assert.equal(props.canCorrectReceipt, true);
  assert.equal(props.canUploadDocuments, true);
  assert.equal(props.dictionary, getCommitmentsDictionary("ar"));
  assert.deepEqual(scenario.calls, [`service:${serviceId}`, "commitments"]);
  assert.deepEqual(scenario.permissionChecks, [
    "procurement_commitments:read",
    "procurement_commitments:write",
    "procurement_commitments:amend",
    "procurement_commitments:lifecycle",
    "service_receipts:write",
    "service_receipts:accept",
    "service_receipts:correct",
    "documents:write",
  ]);
});

test("Both workflows preserve sign-in redirects, not-found behavior, and unexpected errors", async () => {
  for (const route of ["procurement", "commitments"] as const) {
    reset("en");
    if (route === "procurement") scenario.permissionFailure = { permission: "services:read", error: new UnauthorizedError("sign in") };
    else scenario.serviceFailure = new UnauthorizedError("sign in");
    await assert.rejects(() => render(route), (error: unknown) => error instanceof RedirectSignal && error.destination === "/sign-in");

    reset("en");
    scenario.serviceResult = { status: "not_found" };
    await assert.rejects(() => render(route), (error: unknown) => error instanceof NotFoundSignal);

    reset("en");
    const unexpected = new Error("unexpected internal failure");
    if (route === "procurement") scenario.permissionFailure = { permission: "services:read", error: unexpected };
    else scenario.serviceFailure = unexpected;
    await assert.rejects(() => render(route), (error: unknown) => error === unexpected);
  }

  reset("en");
  const permissionError = new Error("unexpected permission failure");
  scenario.permissionFailure = { permission: "procurement_commitments:read", error: permissionError };
  await assert.rejects(() => render("commitments"), (error: unknown) => error === permissionError);
});
