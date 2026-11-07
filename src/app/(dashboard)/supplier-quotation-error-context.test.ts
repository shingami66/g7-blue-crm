import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as {
  JSDOM: new (html: string) => { window: { document: Document } };
};
const root = resolve(process.cwd(), "src");
const moduleCache = new Map<string, { exports: Record<string, unknown> }>();
const h = React.createElement;

type Locale = "en" | "ar";
type Route = "new" | "detail";
type QueryName = "supplier" | "requirements" | "eligibleServices" | "package" | "packageRequirements" | "quotation";
type Supplier = { id: string; name: string; status: string; isDeleted: boolean };
type Quotation = { id: string; supplierId: string; supplierReference: string };
type SuppliersTestDictionary = {
  states: { accessDenied: string; genericError: string; detailForbidden: string; detailLoadError: string };
  detail: { backToSuppliers: string };
  quotationHistory: {
    newTitle: string;
    detailTitle: string;
    createUnavailableTitle: string;
    createUnavailable: string;
    backToHistory: string;
    serviceSelection: string;
    serviceUnavailable: string;
  };
};

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

const SUPPLIER_ID = "8d318f06-f312-4e17-9768-6e4e0b30e294";
const QUOTATION_ID = "b83c16a4-e4e1-4cb0-8b32-c781680a496b";
const SERVICE_ID = "3f78a37a-faf9-44de-a23f-5ee257a615c2";
const PACKAGE_ID = "e974cc43-67e4-4799-a944-c962349d3be2";
const SUPPLIER_NAME = "Private Supplier UX02B4";
const SUPPLIER_REFERENCE = "PRIVATE-QUOTE-UX02B4";
const SAFE_SERVICE_RETURN = "/services/123e4567-e89b-42d3-a456-426614174000/procurement";
const PRIVATE_QUERY_ERROR = "private supplier quotation query details";
const PRIVATE_VALUES = [SUPPLIER_ID, QUOTATION_ID, SUPPLIER_NAME, SUPPLIER_REFERENCE, PRIVATE_QUERY_ERROR];

const scenario: {
  locale: Locale;
  permissions: Record<string, boolean>;
  permissionFailures: Partial<Record<string, Error>>;
  permissionChecks: string[];
  queryCalls: QueryName[];
  queryArguments: Record<string, unknown>;
  failures: Partial<Record<QueryName, Error>>;
  supplierReply: { supplier?: Supplier | null; error?: unknown } | null;
  requirementsReply: { requirements: unknown[]; error?: unknown };
  eligibleServicesReply: { services: Array<{ serviceId: string; name: string; status: string }> };
  packageReply: { package: unknown };
  packageRequirementsReply: Array<{ id: string; title: string; sortOrder: number }>;
  quotationReply: { quotation?: Quotation | null; error?: unknown } | null;
  formProps: Record<string, unknown> | null;
  detailProps: Record<string, unknown> | null;
  packageValidationCalls: Array<{ pkg: unknown; params: unknown }>;
  mutationCalls: string[];
} = {
  locale: "en",
  permissions: {},
  permissionFailures: {},
  permissionChecks: [],
  queryCalls: [],
  queryArguments: {},
  failures: {},
  supplierReply: null,
  requirementsReply: { requirements: [] },
  eligibleServicesReply: { services: [] },
  packageReply: { package: null },
  packageRequirementsReply: [],
  quotationReply: null,
  formProps: null,
  detailProps: null,
  packageValidationCalls: [],
  mutationCalls: [],
};

function makeSupplier(overrides: Partial<Supplier> = {}): Supplier {
  return {
    id: SUPPLIER_ID,
    name: SUPPLIER_NAME,
    status: "active",
    isDeleted: false,
    ...overrides,
  };
}

function makeQuotation(overrides: Partial<Quotation> = {}): Quotation {
  return {
    id: QUOTATION_ID,
    supplierId: SUPPLIER_ID,
    supplierReference: SUPPLIER_REFERENCE,
    ...overrides,
  };
}

const requirementRows = [{ id: "requirement-1", title: "Lighting", sortOrder: 1 }];
const eligibleServices = [{ serviceId: SERVICE_ID, name: "Private Event UX02B4", status: "In Progress" }];
const packageRequirementRows = [{ id: "package-requirement-1", title: "Stage equipment", sortOrder: 1 }];
const packageFixture = {
  id: PACKAGE_ID,
  serviceId: SERVICE_ID,
  selectedSupplierId: SUPPLIER_ID,
  status: "selected",
  name: "Package context fixture",
};

function reset(locale: Locale) {
  scenario.locale = locale;
  scenario.permissions = {};
  scenario.permissionFailures = {};
  scenario.permissionChecks.length = 0;
  scenario.queryCalls.length = 0;
  scenario.queryArguments = {};
  scenario.failures = {};
  scenario.supplierReply = { supplier: makeSupplier() };
  scenario.requirementsReply = { requirements: requirementRows };
  scenario.eligibleServicesReply = { services: eligibleServices };
  scenario.packageReply = { package: packageFixture };
  scenario.packageRequirementsReply = packageRequirementRows;
  scenario.quotationReply = { quotation: makeQuotation() };
  scenario.formProps = null;
  scenario.detailProps = null;
  scenario.packageValidationCalls.length = 0;
  scenario.mutationCalls.length = 0;
}

function query<T>(name: QueryName, value: () => T): T {
  scenario.queryCalls.push(name);
  const failure = scenario.failures[name];
  if (failure) throw failure;
  return value();
}

function findModule(path: string): string | undefined {
  return [path, `${path}.tsx`, `${path}.ts`, resolve(path, "index.tsx"), resolve(path, "index.ts")].find(existsSync);
}

function captureForm() {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      scenario.formProps = props;
      return h("div", { "data-testid": "supplier-quotation-form" });
    },
  };
}

function captureDetail() {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      scenario.detailProps = props;
      return h("div", { "data-testid": "supplier-quotation-detail" });
    },
  };
}

function loadModule(path: string): Record<string, unknown> {
  const file = findModule(path);
  assert.ok(file, `Missing test import: ${path}`);
  if (moduleCache.has(file)) return moduleCache.get(file)!.exports;

  const compiled = { exports: {} as Record<string, unknown> };
  moduleCache.set(file, compiled);
  const code = ts.transpileModule(readFileSync(file, "utf8"), {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;
  const TestIcon = ({ size = 16, className, ...props }: Record<string, unknown>) =>
    h("svg", { width: size, height: size, className, ...props });
  const importModule = (specifier: string): unknown => {
    if (specifier === "server-only") return {};
    if (specifier === "next/navigation") return {
      redirect: (destination: string) => { throw new RedirectSignal(destination); },
      notFound: () => { throw new NotFoundSignal("not-found"); },
    };
    if (specifier === "lucide-react") {
      return { ArrowLeft: TestIcon, FileText: TestIcon, FilePlus2: TestIcon };
    }
    if (specifier === "next/link" || specifier === "@/components/ui/PendingLink") {
      const Link = React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>>(
        function TestLink(props, ref) { return h("a", { ...props, ref }, props.children); },
      );
      return { __esModule: true, default: Link, useLinkStatus: () => ({ pending: false }) };
    }
    if (specifier === "./Breadcrumbs" || specifier === "./PageActions") {
      return { __esModule: true, default: () => null };
    }
    if (specifier === "@/lib/auth/errors") return { UnauthorizedError, ForbiddenError };
    if (specifier === "@/lib/auth/permissions") return {
      checkPermission: async (permission: string) => {
        scenario.permissionChecks.push(permission);
        const failure = scenario.permissionFailures[permission];
        if (failure) throw failure;
        return scenario.permissions[permission] ?? true;
      },
      requirePermission: async () => undefined,
    };
    if (specifier === "@/lib/i18n/session-locale") {
      return { getCurrentSessionEffectiveLocale: async () => scenario.locale };
    }
    if (specifier === "@/lib/procurement/queries") return {
      getSupplierQuotationRequirementOptions: async (supplierId: string) => {
        scenario.queryArguments.requirementsSupplierId = supplierId;
        return query("requirements", () => scenario.requirementsReply);
      },
      getEligibleServicesForSupplierQuotation: async () =>
        query("eligibleServices", () => scenario.eligibleServicesReply),
      getPackageRequirementsForQuotation: async (packageId: string, serviceId: string) => {
        scenario.queryArguments.packageRequirements = { packageId, serviceId };
        return query("packageRequirements", () => scenario.packageRequirementsReply);
      },
      getSupplierQuotationById: async (quotationId: string, options: { includeDocuments: boolean }) => {
        scenario.queryArguments.quotation = { quotationId, options };
        return query("quotation", () => scenario.quotationReply);
      },
    };
    if (specifier === "@/lib/procurement/package-queries") return {
      getProcurementPackageById: async (packageId: string) => {
        scenario.queryArguments.packageId = packageId;
        return query("package", () => scenario.packageReply);
      },
    };
    if (specifier === "@/lib/procurement/package-context") {
      const actual = loadModule(resolve(root, "lib/procurement/package-context"));
      const validate = actual.validatePackageQuotationContext as (pkg: unknown, params: unknown) => unknown;
      return {
        ...actual,
        validatePackageQuotationContext: (pkg: unknown, params: unknown) => {
          scenario.packageValidationCalls.push({ pkg, params });
          return validate(pkg, params);
        },
      };
    }
    if (specifier === "@/lib/suppliers/queries") return {
      getSupplierById: async (supplierId: string, options: { includeDeleted: boolean }) => {
        scenario.queryArguments.supplierId = supplierId;
        scenario.queryArguments.supplierOptions = options;
        return query("supplier", () => scenario.supplierReply);
      },
    };
    if (specifier === "@/lib/record-navigation/queries") {
      return loadModule(resolve(root, "lib/record-navigation/queries"));
    }
    if (specifier === "@/lib/supabase/admin") return { createAdminClient: () => ({}) };
    if (specifier === "../SupplierQuotationForm") return captureForm();
    if (specifier === "../SupplierQuotationDetail") return captureDetail();
    if (specifier.startsWith("@/")) return loadModule(resolve(root, specifier.slice(2)));
    if (specifier.startsWith(".")) return loadModule(resolve(dirname(file), specifier));
    return require(specifier);
  };
  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}

type PageProps = {
  params: Promise<{ id: string; quotationId?: string }>;
  searchParams: Promise<{ returnTo?: string; showDeleted?: string; serviceId?: string; packageId?: string }>;
};
type Page = (props: PageProps) => Promise<React.ReactNode>;
const pages: Record<Route, Page> = {
  new: loadModule(resolve(root, "app/(dashboard)/suppliers/[id]/quotations/new/page")).default as Page,
  detail: loadModule(resolve(root, "app/(dashboard)/suppliers/[id]/quotations/[quotationId]/page")).default as Page,
};
const LocaleProvider = loadModule(resolve(root, "components/i18n/LocaleProvider")).LocaleProvider as React.ComponentType<
  React.PropsWithChildren<{ locale: Locale }>
>;
const getSuppliersDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/suppliers"))
  .getSuppliersDictionary as (locale: Locale) => SuppliersTestDictionary;
const getCommonDictionary = loadModule(resolve(root, "lib/i18n/dictionaries/common"))
  .getCommonDictionary as (locale: Locale) => { actions: { back: string } };

async function renderPage(route: Route, searchParams: PageProps["searchParams"] extends Promise<infer T> ? T : never = {}) {
  const tree = await pages[route]({
    params: Promise.resolve({ id: SUPPLIER_ID, quotationId: QUOTATION_ID }),
    searchParams: Promise.resolve(searchParams),
  });
  const markup = renderToStaticMarkup(h(LocaleProvider, { locale: scenario.locale }, tree));
  return new JSDOM(markup).window.document;
}

function assertErrorShell(
  doc: Document,
  options: {
    route: Route;
    locale: Locale;
    pageTitle: string;
    errorTitle: string;
    message: string;
    role: "alert" | "status";
    frame: "form" | "record";
    returnHref: string;
    returnLabel: string;
    protectedValues?: string[];
  },
) {
  const { route, locale, pageTitle, errorTitle, message, role, frame, returnHref, returnLabel } = options;
  assert.equal(doc.querySelectorAll("h1").length, 1, route);
  const h1 = doc.querySelector("h1");
  assert.equal(h1?.textContent, pageTitle, route);
  assert.equal(h1?.getAttribute("dir"), "auto", route);
  assert.ok(h1?.className.includes("break-words"), route);
  assert.equal(doc.querySelectorAll('[data-page-header="composed"]').length, 1, route);

  const pageFrame = doc.querySelector<HTMLElement>(`[data-page-frame="${frame}"]`);
  assert.ok(pageFrame, `${route} uses the ${frame} page frame`);
  assert.equal(pageFrame.parentElement?.getAttribute("dir"), locale === "ar" ? "rtl" : "ltr", route);
  assert.equal(doc.querySelectorAll('[data-page-location="true"]').length, 1, route);
  assert.equal(doc.querySelectorAll("nav").length, 0, route);

  assert.equal(doc.querySelectorAll("h2").length, 1, route);
  const h2 = doc.querySelector("h2");
  assert.equal(h2?.textContent, errorTitle, route);
  const region = doc.querySelector<HTMLElement>(`[role="${role}"]`);
  assert.ok(region, `${route} uses role=${role}`);
  assert.equal(region.getAttribute("aria-labelledby"), h2?.id, route);
  assert.equal(region.querySelector("p")?.textContent, message, route);
  assert.equal(doc.querySelectorAll("[role=alert], [role=status]").length, 1, route);
  assert.ok(region.className.includes("min-w-0"), route);
  assert.ok(region.className.includes("w-full"), route);
  assert.ok(region.className.includes("sm:p-6"), route);
  assert.ok(region.querySelector("p")?.className.includes("break-words"), route);

  const links = [...doc.querySelectorAll<HTMLAnchorElement>("a")];
  assert.equal(links.length, 1, `${route} has one Return control`);
  assert.equal(links[0].getAttribute("href"), returnHref, route);
  assert.equal(links[0].getAttribute("aria-label"), returnLabel, route);
  assert.equal(links[0].textContent?.trim(), returnLabel, route);
  assert.ok(links[0].className.includes("focus-visible:ring-2"), route);
  assert.equal(links[0].querySelector("svg")?.classList.contains("scale-x-[-1]"), locale === "ar", route);
  assert.equal(doc.querySelectorAll("a a, a button, button a, button button").length, 0, route);
  assert.equal(doc.querySelectorAll("form, button, input, select, textarea").length, 0, route);

  const html = doc.documentElement.innerHTML;
  for (const value of options.protectedValues ?? PRIVATE_VALUES) {
    assert.equal(html.includes(value), false, `${route} exposed ${value}`);
  }
}

function expectedReturnLabels(locale: Locale) {
  const suppliers = getSuppliersDictionary(locale);
  const common = getCommonDictionary(locale);
  return {
    suppliers: suppliers.detail.backToSuppliers,
    history: suppliers.quotationHistory.backToHistory,
    generic: common.actions.back,
  };
}

async function assertRedirect(route: Route) {
  await assert.rejects(
    () => renderPage(route),
    (error: unknown) => error instanceof RedirectSignal && error.destination === "/sign-in",
    `${route} preserves the sign-in redirect`,
  );
}

async function assertNotFound(route: Route) {
  await assert.rejects(
    () => renderPage(route),
    (error: unknown) => error instanceof NotFoundSignal,
    `${route} preserves notFound()`,
  );
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale}: supplier quotation creation failures keep localized context and safe module recovery`, async () => {
    const dictionary = getSuppliersDictionary(locale);
    const labels = expectedReturnLabels(locale);
    const searchParams = { returnTo: `/suppliers/${SUPPLIER_ID}/quotations/${QUOTATION_ID}` };

    reset(locale);
    scenario.failures.supplier = new ForbiddenError("private supplier permission details");
    let doc = await renderPage("new", searchParams);
    assertErrorShell(doc, {
      route: "new", locale, pageTitle: dictionary.quotationHistory.newTitle,
      errorTitle: dictionary.states.accessDenied, message: dictionary.states.detailForbidden,
      role: "status", frame: "form", returnHref: "/suppliers", returnLabel: labels.suppliers,
      protectedValues: [...PRIVATE_VALUES, "private supplier permission details"],
    });
    assert.deepEqual(scenario.permissionChecks, ["supplier_costing:write", "documents:write"]);
    assert.deepEqual(scenario.queryCalls, ["supplier"]);

    reset(locale);
    scenario.supplierReply = { supplier: makeSupplier(), error: "private query error details" };
    doc = await renderPage("new", searchParams);
    assertErrorShell(doc, {
      route: "new", locale, pageTitle: dictionary.quotationHistory.newTitle,
      errorTitle: dictionary.states.genericError, message: dictionary.states.detailLoadError,
      role: "alert", frame: "form", returnHref: "/suppliers", returnLabel: labels.suppliers,
      protectedValues: [...PRIVATE_VALUES, "private query error details"],
    });

    reset(locale);
    scenario.permissions["supplier_costing:write"] = false;
    doc = await renderPage("new", searchParams);
    assertErrorShell(doc, {
      route: "new", locale, pageTitle: dictionary.quotationHistory.newTitle,
      errorTitle: dictionary.states.accessDenied, message: dictionary.states.detailForbidden,
      role: "status", frame: "form", returnHref: "/suppliers", returnLabel: labels.suppliers,
    });
    assert.deepEqual(scenario.queryCalls, ["supplier"]);
    assert.deepEqual(scenario.permissionChecks, ["supplier_costing:write", "documents:write"]);
    assert.equal(scenario.formProps, null);
  });

  test(`${locale}: inactive and deleted supplier restrictions preserve status and safe origin labels`, async () => {
    const dictionary = getSuppliersDictionary(locale);
    const labels = expectedReturnLabels(locale);
    for (const supplier of [
      makeSupplier({ status: "inactive" }),
      makeSupplier({ isDeleted: true, status: "inactive" }),
    ]) {
      reset(locale);
      scenario.supplierReply = { supplier };
      const doc = await renderPage("new", { showDeleted: "true", returnTo: SAFE_SERVICE_RETURN });
      assertErrorShell(doc, {
        route: "new", locale, pageTitle: dictionary.quotationHistory.newTitle,
        errorTitle: dictionary.quotationHistory.createUnavailableTitle,
        message: dictionary.quotationHistory.createUnavailable,
        role: "status", frame: "form", returnHref: SAFE_SERVICE_RETURN, returnLabel: labels.generic,
        protectedValues: [QUOTATION_ID, SUPPLIER_NAME, SUPPLIER_REFERENCE, PRIVATE_QUERY_ERROR],
      });
      assert.equal(scenario.queryArguments.supplierOptions && (scenario.queryArguments.supplierOptions as { includeDeleted: boolean }).includeDeleted, true);
      assert.deepEqual(scenario.queryCalls, ["supplier"]);
      assert.equal(scenario.formProps, null);
    }

    for (const unsafeReturn of [
      "https://external.example/private",
      "//external.example/private",
      "/suppliers/not-a-uuid/quotations",
    ]) {
      reset(locale);
      scenario.supplierReply = { supplier: makeSupplier({ status: "inactive" }) };
      const doc = await renderPage("new", { returnTo: unsafeReturn });
      assertErrorShell(doc, {
        route: "new", locale, pageTitle: dictionary.quotationHistory.newTitle,
        errorTitle: dictionary.quotationHistory.createUnavailableTitle,
        message: dictionary.quotationHistory.createUnavailable,
        role: "status", frame: "form",
        returnHref: `/suppliers/${SUPPLIER_ID}/quotations`,
        returnLabel: labels.history,
        protectedValues: [QUOTATION_ID, SUPPLIER_NAME, SUPPLIER_REFERENCE, PRIVATE_QUERY_ERROR],
      });
    }
  });

  test(`${locale}: creation preserves not-found, authentication, Event, package, form props, and document-write behavior`, async () => {
    const dictionary = getSuppliersDictionary(locale);
    reset(locale);
    scenario.supplierReply = { supplier: null };
    await assertNotFound("new");

    reset(locale);
    scenario.failures.supplier = new UnauthorizedError("authentication required");
    await assertRedirect("new");

    reset(locale);
    let doc = await renderPage("new", { serviceId: "invalid-service-id", returnTo: SAFE_SERVICE_RETURN });
    assert.equal(doc.querySelectorAll("h1").length, 1);
    assert.equal(doc.querySelector("h1")?.textContent, dictionary.quotationHistory.newTitle);
    assert.equal(doc.querySelectorAll("a").length, 1);
    assert.equal(doc.querySelectorAll("h2").length, 1);
    assert.equal(doc.querySelector("h2")?.textContent, dictionary.quotationHistory.serviceSelection);
    assert.equal(doc.querySelectorAll("p")[1]?.textContent, dictionary.quotationHistory.serviceUnavailable);
    assert.equal(doc.querySelector('a[href="' + SAFE_SERVICE_RETURN + '"]') !== null, true);
    assert.equal(scenario.formProps, null);

    reset(locale);
    scenario.permissions["documents:write"] = false;
    scenario.requirementsReply = { requirements: requirementRows, error: "private requirement load details" };
    doc = await renderPage("new", {
      serviceId: SERVICE_ID,
      packageId: PACKAGE_ID,
      returnTo: SAFE_SERVICE_RETURN,
    });
    assert.ok(doc.querySelector('[data-testid="supplier-quotation-form"]'));
    assert.equal(scenario.queryArguments.supplierId, SUPPLIER_ID);
    assert.deepEqual(scenario.queryArguments.supplierOptions, { includeDeleted: false });
    assert.equal(scenario.queryArguments.requirementsSupplierId, SUPPLIER_ID);
    assert.equal(scenario.queryArguments.packageId, PACKAGE_ID);
    assert.deepEqual(scenario.queryArguments.packageRequirements, { packageId: PACKAGE_ID, serviceId: SERVICE_ID });
    assert.deepEqual(scenario.permissionChecks, ["supplier_costing:write", "documents:write"]);
    assert.deepEqual(scenario.packageValidationCalls, [{
      pkg: packageFixture,
      params: { packageId: PACKAGE_ID, serviceId: SERVICE_ID, supplierId: SUPPLIER_ID },
    }]);
    assert.deepEqual(scenario.formProps, {
      locale,
      supplierId: SUPPLIER_ID,
      requirements: requirementRows,
      requirementsLoadError: true,
      canWriteDocuments: false,
      returnTo: SAFE_SERVICE_RETURN,
      dictionary: dictionary.quotationHistory,
      contextualService: eligibleServices[0],
      packageRequirements: packageRequirementRows,
      eligibleServices,
      packageContext: { packageId: PACKAGE_ID, packageTitle: "Package context fixture" },
    });
    assert.deepEqual(scenario.queryCalls, ["supplier", "requirements", "eligibleServices", "package", "packageRequirements"]);
    assert.deepEqual(scenario.mutationCalls, []);
  });

  test(`${locale}: supplier quotation detail failures keep private records hidden and preserve safe recovery`, async () => {
    const dictionary = getSuppliersDictionary(locale);
    const labels = expectedReturnLabels(locale);
    const params = { returnTo: `/suppliers/${SUPPLIER_ID}/quotations/${QUOTATION_ID}` };

    reset(locale);
    scenario.permissions["supplier_costing:read"] = false;
    let doc = await renderPage("detail", params);
    assertErrorShell(doc, {
      route: "detail", locale, pageTitle: dictionary.quotationHistory.detailTitle,
      errorTitle: dictionary.states.accessDenied, message: dictionary.states.detailForbidden,
      role: "status", frame: "record", returnHref: "/suppliers", returnLabel: labels.suppliers,
    });
    assert.deepEqual(scenario.permissionChecks, ["supplier_costing:read"]);
    assert.deepEqual(scenario.queryCalls, []);

    reset(locale);
    scenario.failures.quotation = new ForbiddenError("private quotation access details");
    doc = await renderPage("detail", params);
    assertErrorShell(doc, {
      route: "detail", locale, pageTitle: dictionary.quotationHistory.detailTitle,
      errorTitle: dictionary.states.accessDenied, message: dictionary.states.detailForbidden,
      role: "status", frame: "record", returnHref: "/suppliers", returnLabel: labels.suppliers,
      protectedValues: [...PRIVATE_VALUES, "private quotation access details"],
    });
    assert.deepEqual(scenario.queryArguments.quotation, { quotationId: QUOTATION_ID, options: { includeDocuments: true } });

    reset(locale);
    scenario.failures.quotation = new Error(PRIVATE_QUERY_ERROR);
    doc = await renderPage("detail", params);
    assertErrorShell(doc, {
      route: "detail", locale, pageTitle: dictionary.quotationHistory.detailTitle,
      errorTitle: dictionary.states.genericError, message: dictionary.states.detailLoadError,
      role: "alert", frame: "record", returnHref: "/suppliers", returnLabel: labels.suppliers,
    });
    assert.equal(doc.documentElement.innerHTML.includes(PRIVATE_QUERY_ERROR), false);

    reset(locale);
    scenario.supplierReply = { supplier: makeSupplier(), error: PRIVATE_QUERY_ERROR };
    doc = await renderPage("detail", params);
    assertErrorShell(doc, {
      route: "detail", locale, pageTitle: dictionary.quotationHistory.detailTitle,
      errorTitle: dictionary.states.genericError, message: dictionary.states.detailLoadError,
      role: "alert", frame: "record", returnHref: "/suppliers", returnLabel: labels.suppliers,
    });
  });

  test(`${locale}: quotation detail keeps not-found, supplier association, auth, document, deleted, and success contracts`, async () => {
    reset(locale);
    scenario.quotationReply = { quotation: null };
    await assertNotFound("detail");

    reset(locale);
    scenario.quotationReply = { quotation: makeQuotation({ supplierId: "f516f1e1-d57d-4fdb-ae54-26e419aa874c" }) };
    await assertNotFound("detail");
    assert.deepEqual(scenario.queryCalls, ["quotation"]);

    reset(locale);
    scenario.supplierReply = { supplier: null };
    await assertNotFound("detail");

    reset(locale);
    scenario.failures.quotation = new UnauthorizedError("authentication required");
    await assertRedirect("detail");

    reset(locale);
    scenario.permissions["documents:read"] = false;
    const unsafeReturn = await renderPage("detail", { returnTo: "https://external.example/private" });
    assert.ok(unsafeReturn.querySelector('[data-testid="supplier-quotation-detail"]'));
    assert.deepEqual(scenario.queryArguments.quotation, {
      quotationId: QUOTATION_ID,
      options: { includeDocuments: false },
    });
    assert.deepEqual(scenario.detailProps, {
      quotation: (scenario.quotationReply as { quotation: Quotation }).quotation,
      supplierName: SUPPLIER_NAME,
      locale,
      returnTo: `/suppliers/${SUPPLIER_ID}/quotations`,
      documentsAccessible: false,
      dictionary: getSuppliersDictionary(locale).quotationHistory,
    });
    assert.equal(unsafeReturn.querySelectorAll("a")[0].getAttribute("href"), `/suppliers/${SUPPLIER_ID}/quotations`);

    reset(locale);
    scenario.permissions["documents:read"] = true;
    scenario.supplierReply = { supplier: makeSupplier({ isDeleted: true, status: "inactive" }) };
    const deletedDoc = await renderPage("detail", { showDeleted: "true" });
    assert.ok(deletedDoc.querySelector('[data-testid="supplier-quotation-detail"]'));
    assert.deepEqual(scenario.queryArguments.supplierOptions, { includeDeleted: true });
    assert.deepEqual(scenario.queryArguments.quotation, {
      quotationId: QUOTATION_ID,
      options: { includeDocuments: true },
    });
    assert.equal(
      scenario.detailProps?.returnTo,
      `/suppliers/${SUPPLIER_ID}/quotations?showDeleted=true`,
    );
    assert.equal(scenario.detailProps?.documentsAccessible, true);
    assert.equal(scenario.detailProps?.quotation, (scenario.quotationReply as { quotation: Quotation }).quotation);
    assert.deepEqual(scenario.mutationCalls, []);
  });
}
