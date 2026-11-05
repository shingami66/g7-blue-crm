import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { QuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import type { SuppliersDictionary } from "@/lib/i18n/dictionaries/suppliers";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string) => { window: { document: Document } } };
const root = resolve(process.cwd(), "src");
const cache = new Map<string, { exports: Record<string, unknown> }>();
const h = React.createElement;
type Locale = "en" | "ar";
type SearchParams = Record<string, string | string[] | undefined>;
const quotationId = "123e4567-e89b-42d3-a456-426614174000";
const supplierId = "223e4567-e89b-42d3-a456-426614174000";
const privateQuotationNumber = "QT-PRIVATE-2001";
const privateSupplierName = "Private Supplier LLC";
const privateSupplierNumber = "SUP-PRIVATE-4001";

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

type QuotationFixture = {
  id: string;
  quotationNumber: string;
  status: string;
  isApprovedCommercialAmendment: boolean;
  serviceId: string;
  service: {
    serviceNumber: string;
    serviceTitle: string;
    status: string;
    eventName: string;
  } | null;
  customer: { id: string; name: string };
  grandTotal: number;
};

type SupplierFixture = {
  id: string;
  name: string;
  supplierNumber: string;
  isDeleted: boolean;
  status: string;
};

function makeQuotation(overrides: Partial<QuotationFixture> = {}): QuotationFixture {
  return {
    id: quotationId,
    quotationNumber: privateQuotationNumber,
    status: "draft",
    isApprovedCommercialAmendment: false,
    serviceId: "323e4567-e89b-42d3-a456-426614174000",
    service: {
      serviceNumber: "EVT-PRIVATE-008",
      serviceTitle: "Private Event Record",
      status: "Inquiry",
      eventName: "Private Event Name",
    },
    customer: { id: "423e4567-e89b-42d3-a456-426614174000", name: "Private Customer LLC" },
    grandTotal: 98765,
    ...overrides,
  };
}

function makeSupplier(overrides: Partial<SupplierFixture> = {}): SupplierFixture {
  return {
    id: supplierId,
    name: privateSupplierName,
    supplierNumber: privateSupplierNumber,
    isDeleted: false,
    status: "active",
    ...overrides,
  };
}

const scenario: {
  locale: Locale;
  permissionChecks: string[];
  permissionFailure: { permission?: string; error: Error } | null;
  supplierPermissions: Record<string, boolean>;
  quotationCalls: string[];
  quotationFailure: Error | null;
  quotation: ReturnType<typeof makeQuotation> | null;
  quotationFormProps: Record<string, unknown> | null;
  supplierCalls: Array<{ id: string; includeDeleted: boolean }>;
  supplierFailure: Error | null;
  supplier: ReturnType<typeof makeSupplier> | null;
  historyCalls: Array<{ id: string; includeDocuments: boolean }>;
  historyResult: { quotations: unknown[]; error: unknown };
  historyProps: Record<string, unknown> | null;
} = {
  locale: "en",
  permissionChecks: [],
  permissionFailure: null,
  supplierPermissions: {},
  quotationCalls: [],
  quotationFailure: null,
  quotation: null,
  quotationFormProps: null,
  supplierCalls: [],
  supplierFailure: null,
  supplier: null,
  historyCalls: [],
  historyResult: { quotations: [], error: null },
  historyProps: null,
};

function reset(locale: Locale) {
  scenario.locale = locale;
  scenario.permissionChecks.length = 0;
  scenario.permissionFailure = null;
  scenario.supplierPermissions = {
    "supplier_costing:read": true,
    "supplier_costing:write": true,
    "documents:read": true,
  };
  scenario.quotationCalls.length = 0;
  scenario.quotationFailure = null;
  scenario.quotation = makeQuotation();
  scenario.quotationFormProps = null;
  scenario.supplierCalls.length = 0;
  scenario.supplierFailure = null;
  scenario.supplier = makeSupplier();
  scenario.historyCalls.length = 0;
  scenario.historyResult = { quotations: [{ id: "quotation-history-row" }], error: null };
  scenario.historyProps = null;
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
    if (specifier === "./NavigationFeedbackProvider") {
      return { useNavigationFeedback: () => ({ reportPending: () => {} }) };
    }
    if (specifier === "@/components/ui/NavigationFeedbackProvider") {
      return { useNavigationFeedback: () => ({ reportPending: () => {} }) };
    }
    if (specifier === "@/components/ui/useGlobalNavigationPending") {
      return { useGlobalNavigationPending: () => ({ isPending: false, push: () => {} }) };
    }
    if (specifier === "@/lib/auth/errors") return { UnauthorizedError, ForbiddenError };
    if (specifier === "@/lib/auth/permissions") {
      return {
        requirePermission: async (permission: string) => {
          scenario.permissionChecks.push(permission);
          if (scenario.permissionFailure && (!scenario.permissionFailure.permission || scenario.permissionFailure.permission === permission)) {
            throw scenario.permissionFailure.error;
          }
        },
        checkPermission: async (permission: string) => {
          scenario.permissionChecks.push(permission);
          if (scenario.permissionFailure && (!scenario.permissionFailure.permission || scenario.permissionFailure.permission === permission)) {
            throw scenario.permissionFailure.error;
          }
          return scenario.supplierPermissions[permission] ?? false;
        },
      };
    }
    if (specifier === "@/lib/i18n/session-locale") {
      return { getCurrentSessionEffectiveLocale: async () => scenario.locale };
    }
    if (specifier === "@/lib/quotations/queries") {
      return {
        getQuotationById: async (id: string) => {
          scenario.quotationCalls.push(id);
          if (scenario.quotationFailure) throw scenario.quotationFailure;
          return scenario.quotation;
        },
      };
    }
    if (specifier === "@/lib/suppliers/queries") {
      return {
        getSupplierById: async (id: string, options: { includeDeleted: boolean }) => {
          scenario.supplierCalls.push({ id, includeDeleted: options.includeDeleted });
          if (scenario.supplierFailure) throw scenario.supplierFailure;
          return { supplier: scenario.supplier, error: null };
        },
      };
    }
    if (specifier === "@/lib/procurement/queries") {
      return {
        getSupplierQuotationHistoryBySupplierId: async (id: string, options: { includeDocuments: boolean }) => {
          scenario.historyCalls.push({ id, includeDocuments: options.includeDocuments });
          return scenario.historyResult;
        },
      };
    }
    if (specifier === "@/lib/supabase/admin") return { createAdminClient: () => { throw new Error("unexpected admin query"); } };
    if (specifier === "../../new/QuotationForm") {
      return {
        __esModule: true,
        default: (props: Record<string, unknown>) => {
          scenario.quotationFormProps = props;
          return h("form", { "data-form-rendered": "quotation" });
        },
      };
    }
    if (specifier === "../SupplierQuotationHistory") {
      return {
        __esModule: true,
        default: (props: Record<string, unknown>) => {
          scenario.historyProps = props;
          return h("div", {
            "data-testid": "supplier-history",
            "data-load-error": props.loadError ? "true" : "false",
          });
        },
      };
    }
    if (specifier.startsWith("@/")) return loadModule(resolve(root, specifier.slice(2)));
    if (specifier.startsWith(".")) return loadModule(resolve(dirname(file), specifier));
    return require(specifier);
  };

  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}

type QuotationPage = (props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) => Promise<React.ReactNode>;
type SupplierPage = (props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ showDeleted?: string; returnTo?: string }>;
}) => Promise<React.ReactNode>;

const quotationPage = loadModule(resolve(root, "app/(dashboard)/quotations/[id]/edit/page")).default as QuotationPage;
const supplierPage = loadModule(resolve(root, "app/(dashboard)/suppliers/[id]/quotations/page")).default as SupplierPage;
const LocaleProvider = loadModule(resolve(root, "components/i18n/LocaleProvider")).LocaleProvider as React.ComponentType<React.PropsWithChildren<{ locale: Locale }>>;
const quotationsDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/quotations")).getQuotationsDictionary as (locale: Locale) => QuotationsDictionary;
const suppliersDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/suppliers")).getSuppliersDictionary as (locale: Locale) => SuppliersDictionary;
const commonDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/common")).getCommonDictionary as (locale: Locale) => { actions: { back: string } };

async function render(tree: React.ReactNode, locale: Locale) {
  const markup = renderToStaticMarkup(
    h(LocaleProvider, { locale }, h("div", { dir: locale === "ar" ? "rtl" : "ltr" }, tree)),
  );
  return new JSDOM(markup).window.document;
}

async function renderQuotation(searchParams: SearchParams = {}) {
  const tree = await quotationPage({
    params: Promise.resolve({ id: quotationId }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(tree, scenario.locale);
}

async function renderSupplier(searchParams: SearchParams = {}) {
  const tree = await supplierPage({
    params: Promise.resolve({ id: supplierId }),
    searchParams: Promise.resolve(searchParams),
  });
  return render(tree, scenario.locale);
}

function assertStateShell(doc: Document, config: {
  locale: Locale;
  taskTitle: string;
  moduleTitle: string;
  locationLabel: string;
  moduleHref: string;
  returnLabel: string;
  returnHref: string;
  title: string;
  message: string;
  role: "alert" | "status";
  errorId: string;
  pageFrame: "form" | "record";
  protectedValues?: string[];
}) {
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(doc.querySelector("h1")?.textContent, config.taskTitle);
  assert.equal(doc.querySelector("h1")?.getAttribute("dir"), "auto");
  assert.ok(doc.querySelector(`[data-page-frame="${config.pageFrame}"]`));
  const pageFrame = doc.querySelector<HTMLElement>(`[data-page-frame="${config.pageFrame}"]`);
  assert.ok(pageFrame?.className.includes("w-full"));
  assert.equal(doc.querySelector("nav")?.getAttribute("aria-label"), config.locationLabel);
  assert.ok(doc.querySelector("nav ol")?.className.includes("flex-wrap"));
  assert.deepEqual(
    [...doc.querySelectorAll("nav li")].map((item) => item.textContent?.trim()),
    [config.moduleTitle, config.taskTitle],
  );
  assert.equal(doc.querySelector(`nav a[href="${config.moduleHref}"]`)?.textContent?.trim(), config.moduleTitle);
  assert.equal(doc.querySelector('nav [aria-current="page"]')?.textContent?.trim(), config.taskTitle);
  const state = doc.querySelector<HTMLElement>(`[role="${config.role}"]`);
  assert.ok(state);
  assert.equal(state.getAttribute("aria-labelledby"), config.errorId);
  const heading = state.querySelector("h2");
  assert.equal(heading?.textContent, config.title);
  assert.equal(state.querySelector("p")?.textContent, config.message);
  assert.ok(state.className.includes("sm:p-"));
  assert.ok(doc.querySelector("h1")?.className.includes("break-words"));
  assert.equal(doc.querySelectorAll("h2").length, 1);
  assert.equal(doc.querySelectorAll("[role=alert], [role=status]").length, 1);

  const returnControl = [...doc.querySelectorAll<HTMLAnchorElement>("a")]
    .find((link) => link.getAttribute("aria-label") === config.returnLabel);
  assert.ok(returnControl, "localized labeled Return control is present");
  assert.equal(returnControl.getAttribute("href"), config.returnHref);
  assert.equal(returnControl.textContent?.trim(), config.returnLabel);
  assert.ok(returnControl.className.includes("focus-visible:ring-2"));
  const returnIcon = returnControl.querySelector("svg");
  assert.ok(returnIcon);
  assert.equal(returnIcon.classList.contains("scale-x-[-1]"), config.locale === "ar");
  if (config.locale === "ar") {
    const directionOwner = config.pageFrame === "record" ? pageFrame?.firstElementChild : pageFrame?.parentElement;
    assert.equal(directionOwner?.getAttribute("dir"), "rtl");
  }
  assert.equal(doc.querySelectorAll("form, button, input, select, textarea").length, 0);
  assert.equal(doc.querySelectorAll("a a, a button, button a, button button").length, 0);

  const markup = doc.documentElement.innerHTML;
  for (const value of config.protectedValues ?? []) assert.equal(markup.includes(value), false, `exposed protected value: ${value}`);
}

function quotationStateConfig(locale: Locale, state: {
  title: string;
  message: string;
  role: "alert" | "status";
  returnHref?: string;
  protectedValues?: string[];
}) {
  const dictionary = quotationsDictionary(locale);
  return {
    locale,
    taskTitle: dictionary.form.editTitle,
    moduleTitle: dictionary.list.title,
    locationLabel: dictionary.detail.locationLabel,
    moduleHref: "/quotations",
    returnLabel: dictionary.editStates.backToQuotations,
    returnHref: state.returnHref ?? "/quotations",
    title: state.title,
    message: state.message,
    role: state.role,
    errorId: "quotation-edit-error-title",
    pageFrame: "form" as const,
    protectedValues: state.protectedValues,
  };
}

function supplierStateConfig(locale: Locale, state: {
  title: string;
  message: string;
  role: "alert" | "status";
  protectedValues?: string[];
}) {
  const dictionary = suppliersDictionary(locale);
  return {
    locale,
    taskTitle: dictionary.quotationHistory.title,
    moduleTitle: dictionary.list.title,
    locationLabel: dictionary.quotationHistory.title,
    moduleHref: "/suppliers",
    returnLabel: commonDictionary(locale).actions.back,
    returnHref: "/suppliers",
    title: state.title,
    message: state.message,
    role: state.role,
    errorId: "supplier-quotation-history-error-title",
    pageFrame: "record" as const,
    protectedValues: state.protectedValues,
  };
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale}: Quotation Edit keeps the authorized draft form and return context`, async () => {
    reset(locale);
    const dictionary = quotationsDictionary(locale);
    const doc = await renderQuotation({ returnTo: "/quotations" });

    assert.equal(doc.querySelectorAll("h1").length, 1);
    assert.equal(doc.querySelector("h1")?.textContent, dictionary.form.editTitle);
    assert.ok(doc.querySelector('[data-page-frame="form"]'));
    assert.equal(doc.querySelector("form[data-form-rendered=quotation]") !== null, true);
    assert.equal(doc.querySelectorAll("[role=alert], [role=status]").length, 0);
    assert.equal(scenario.quotationFormProps?.initialData, scenario.quotation);
    assert.equal(scenario.quotationFormProps?.dictionary, dictionary);
    assert.deepEqual(scenario.quotationFormProps?.service, {
      id: scenario.quotation?.serviceId,
      serviceNumber: scenario.quotation?.service?.serviceNumber,
      serviceTitle: scenario.quotation?.service?.serviceTitle,
      status: scenario.quotation?.service?.status,
      eventName: scenario.quotation?.service?.eventName,
      customer: scenario.quotation?.customer,
    });
    assert.equal(scenario.permissionChecks.join(","), "quotations:write,services:read");
    assert.deepEqual(scenario.quotationCalls, [quotationId]);
    assert.equal(doc.querySelector('a[aria-label="' + dictionary.editStates.backToQuotations + '"]')?.getAttribute("href"), "/quotations");
    assert.deepEqual([...doc.querySelectorAll("nav li")].map((item) => item.textContent?.trim()), [
      dictionary.list.title,
      privateQuotationNumber,
      dictionary.form.editTitle,
    ]);
  });

  test(`${locale}: Quotation Edit failure states retain localized context and hide protected quotation data`, async () => {
    const dictionary = quotationsDictionary(locale);
    const protectedValues = [
      quotationId,
      privateQuotationNumber,
      "423e4567-e89b-42d3-a456-426614174000",
      "323e4567-e89b-42d3-a456-426614174000",
      "Private Customer LLC",
      "Private Event Name",
      "EVT-PRIVATE-008",
      "98765",
    ];

    reset(locale);
    scenario.permissionFailure = { permission: "quotations:write", error: new ForbiddenError("private denial detail") };
    let doc = await renderQuotation({ returnTo: `/quotations/${quotationId}` });
    assertStateShell(doc, quotationStateConfig(locale, {
      title: dictionary.states.accessDenied,
      message: dictionary.states.createForbidden,
      role: "status",
      protectedValues: [...protectedValues, "private denial detail"],
    }));
    assert.deepEqual(scenario.permissionChecks, ["quotations:write"]);
    assert.deepEqual(scenario.quotationCalls, []);

    reset(locale);
    scenario.permissionFailure = { permission: "services:read", error: new ForbiddenError("private service denial") };
    doc = await renderQuotation({ returnTo: `/quotations/${quotationId}` });
    assertStateShell(doc, quotationStateConfig(locale, {
      title: dictionary.states.accessDenied,
      message: dictionary.states.createForbidden,
      role: "status",
      protectedValues: [...protectedValues, "private service denial"],
    }));
    assert.deepEqual(scenario.permissionChecks, ["quotations:write", "services:read"]);
    assert.deepEqual(scenario.quotationCalls, []);

    reset(locale);
    scenario.quotationFailure = new Error("private SQL details and customer data");
    doc = await renderQuotation({ returnTo: "//external.example/private" });
    assertStateShell(doc, quotationStateConfig(locale, {
      title: dictionary.states.genericError,
      message: dictionary.states.createDataLoadError,
      role: "alert",
      protectedValues: [...protectedValues, "private SQL details and customer data"],
    }));
    assert.deepEqual(scenario.quotationCalls, [quotationId]);

    reset(locale);
    scenario.quotation = null;
    doc = await renderQuotation({ returnTo: `/quotations/${quotationId}` });
    assertStateShell(doc, quotationStateConfig(locale, {
      title: dictionary.editStates.notFound,
      message: dictionary.editStates.notFoundMessage,
      role: "status",
      protectedValues,
    }));

    reset(locale);
    scenario.quotation = makeQuotation({ status: "sent" });
    doc = await renderQuotation({ returnTo: `/suppliers/${supplierId}` });
    assertStateShell(doc, quotationStateConfig(locale, {
      title: dictionary.editStates.locked,
      message: dictionary.editStates.lockedMessage,
      role: "status",
      returnHref: `/suppliers/${supplierId}`,
    }));

    reset(locale);
    scenario.quotation = makeQuotation({ service: null });
    doc = await renderQuotation({ returnTo: "https://external.example/private" });
    assertStateShell(doc, quotationStateConfig(locale, {
      title: dictionary.editStates.serviceContextRequired,
      message: dictionary.editStates.serviceContextMessage,
      role: "status",
      returnHref: `/quotations/${quotationId}`,
    }));
  });

  test(`${locale}: Quotation Edit preserves amendment redirects and sign-in behavior`, async () => {
    reset(locale);
    scenario.quotation = makeQuotation({ isApprovedCommercialAmendment: true });
    await assert.rejects(
      () => renderQuotation(),
      (error: unknown) => error instanceof RedirectSignal && error.destination === `/quotations/${quotationId}/amendment`,
    );
    assert.equal(scenario.quotationFormProps, null);

    reset(locale);
    scenario.permissionFailure = { permission: "quotations:write", error: new UnauthorizedError("authentication required") };
    await assert.rejects(
      () => renderQuotation(),
      (error: unknown) => error instanceof RedirectSignal && error.destination === "/sign-in",
    );
    assert.deepEqual(scenario.quotationCalls, []);
  });

  test(`${locale}: Supplier Quotation History errors use generic localized context and preserve not-found behavior`, async () => {
    const dictionary = suppliersDictionary(locale);
    const protectedValues = [supplierId, privateSupplierName, privateSupplierNumber];

    reset(locale);
    scenario.supplierPermissions["supplier_costing:read"] = false;
    let doc = await renderSupplier({ returnTo: `/suppliers/${supplierId}` });
    assertStateShell(doc, supplierStateConfig(locale, {
      title: dictionary.states.accessDenied,
      message: dictionary.states.detailForbidden,
      role: "status",
      protectedValues,
    }));
    assert.equal(scenario.supplierCalls[0]?.id, supplierId);
    assert.deepEqual(scenario.historyCalls, []);

    reset(locale);
    scenario.supplierFailure = new Error("private supplier query / SQL diagnostic");
    doc = await renderSupplier({ returnTo: `/suppliers/${supplierId}` });
    assertStateShell(doc, supplierStateConfig(locale, {
      title: dictionary.states.genericError,
      message: dictionary.states.detailLoadError,
      role: "alert",
      protectedValues: [...protectedValues, "private supplier query / SQL diagnostic"],
    }));

    reset(locale);
    scenario.supplier = null;
    await assert.rejects(() => renderSupplier(), (error: unknown) => error instanceof NotFoundSignal);
    assert.deepEqual(scenario.historyCalls, []);

    reset(locale);
    scenario.permissionFailure = { permission: "supplier_costing:read", error: new UnauthorizedError("authentication required") };
    await assert.rejects(
      () => renderSupplier(),
      (error: unknown) => error instanceof RedirectSignal && error.destination === "/sign-in",
    );
    assert.deepEqual(scenario.historyCalls, []);
  });

  test(`${locale}: Supplier Quotation History preserves the specialized success layout, safe returns, deletion, and inline history errors`, async () => {
    const validReturn = `/suppliers/${supplierId}`;

    reset(locale);
    let doc = await renderSupplier({ returnTo: validReturn });
    assert.equal(doc.querySelectorAll("h1").length, 1);
    assert.equal(doc.querySelector("h1")?.textContent, privateSupplierName);
    assert.equal(doc.querySelector("h1")?.getAttribute("dir"), "auto");
    assert.equal(doc.querySelector('[data-page-frame]'), null);
    assert.equal(doc.querySelector('[data-testid="supplier-history"]')?.getAttribute("data-load-error"), "false");
    assert.equal(scenario.historyProps?.supplierId, supplierId);
    assert.equal(scenario.historyProps?.supplierIsDeleted, false);
    assert.equal(scenario.historyProps?.documentsAccessible, true);
    assert.deepEqual(scenario.historyCalls, [{ id: supplierId, includeDocuments: true }]);
    assert.ok(doc.querySelector(`a[href^="/suppliers/${supplierId}/quotations/new?"]`));
    const returnLink = [...doc.querySelectorAll<HTMLAnchorElement>("a")].find((link) => link.getAttribute("aria-label") === commonDictionary(locale).actions.back);
    assert.equal(returnLink?.getAttribute("href"), validReturn);

    reset(locale);
    scenario.supplierPermissions["supplier_costing:write"] = false;
    doc = await renderSupplier({ returnTo: validReturn });
    assert.equal(doc.querySelector(`a[href^="/suppliers/${supplierId}/quotations/new?"]`), null);

    reset(locale);
    doc = await renderSupplier({ returnTo: "https://external.example/private" });
    const fallbackLink = [...doc.querySelectorAll<HTMLAnchorElement>("a")].find((link) => link.getAttribute("aria-label") === commonDictionary(locale).actions.back);
    assert.equal(fallbackLink?.getAttribute("href"), `/suppliers/${supplierId}`);

    reset(locale);
    scenario.supplier = makeSupplier({ isDeleted: true, status: "inactive" });
    doc = await renderSupplier({ showDeleted: "true" });
    assert.deepEqual(scenario.supplierCalls, [{ id: supplierId, includeDeleted: true }]);
    assert.equal(scenario.historyProps?.supplierIsDeleted, true);
    assert.equal(doc.querySelector(`a[href^="/suppliers/${supplierId}/quotations/new?"]`), null);
    const deletedReturn = [...doc.querySelectorAll<HTMLAnchorElement>("a")].find((link) => link.getAttribute("aria-label") === commonDictionary(locale).actions.back);
    assert.equal(deletedReturn?.getAttribute("href"), `/suppliers/${supplierId}?showDeleted=true`);

    reset(locale);
    scenario.supplier = makeSupplier({ isDeleted: true, status: "inactive" });
    scenario.historyResult = { quotations: [], error: new Error("history query diagnostic") };
    doc = await renderSupplier({ showDeleted: "true" });
    assert.equal(doc.querySelector("h1")?.textContent, privateSupplierName);
    assert.equal(doc.querySelector('[data-testid="supplier-history"]')?.getAttribute("data-load-error"), "true");
    assert.equal(scenario.historyProps?.supplierIsDeleted, true);
    assert.equal(scenario.historyProps?.currentHistoryUrl, `/suppliers/${supplierId}/quotations?showDeleted=true`);
    assert.equal(doc.querySelector(`a[href^="/suppliers/${supplierId}/quotations/new?"]`), null);
  });
}
