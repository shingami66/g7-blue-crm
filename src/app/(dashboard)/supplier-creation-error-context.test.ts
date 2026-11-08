import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string) => { window: { document: Document } } };
const root = resolve(process.cwd(), "src");
const cache = new Map<string, { exports: Record<string, unknown> }>();
const h = React.createElement;
type Locale = "en" | "ar";
type Route = "bill" | "payment" | "advance";
type SearchParams = Record<string, string | string[] | undefined>;

class UnauthorizedError extends Error {}
class ForbiddenError extends Error {}
class RedirectSignal extends Error {
  readonly destination: string;
  constructor(destination: string) {
    super(`redirect:${destination}`);
    this.destination = destination;
  }
}

const scenario: {
  locale: Locale;
  canRecord: boolean;
  permissionChecks: string[];
  queryCalls: string[];
  queryArguments: Record<string, string>;
  failures: Partial<Record<"billOptions" | "bill" | "paymentSummary" | "advanceCommitments", Error>>;
  billOptions: unknown;
  billResult: unknown;
  paymentSummary: unknown;
  advanceCommitments: unknown;
  formProps: Record<string, Record<string, unknown>>;
  uuidCalls: number;
} = {
  locale: "en",
  canRecord: true,
  permissionChecks: [],
  queryCalls: [],
  queryArguments: {},
  failures: {},
  billOptions: null,
  billResult: null,
  paymentSummary: null,
  advanceCommitments: null,
  formProps: {},
  uuidCalls: 0,
};

function makeBill(status = "approved") {
  return {
    id: "bill-private-id",
    bill_number: "BILL-PRIVATE-9001",
    supplier_name: "Private Supplier LLC",
    service_number: "EVT-PRIVATE-008",
    status,
  };
}

function reset(locale: Locale) {
  scenario.locale = locale;
  scenario.canRecord = true;
  scenario.permissionChecks.length = 0;
  scenario.queryCalls.length = 0;
  scenario.queryArguments = {};
  scenario.failures = {};
  scenario.billOptions = {
    commitments: [{ id: "commitment-private-id", supplier_name: "Private Supplier LLC" }],
    receipts: [{ id: "receipt-private-id" }],
  };
  scenario.billResult = { bill: makeBill() };
  scenario.paymentSummary = { currency: "SAR", outstanding_amount: 125 };
  scenario.advanceCommitments = [{ id: "commitment-private-id", supplier_name: "Private Supplier LLC" }];
  scenario.formProps = {};
  scenario.uuidCalls = 0;
}

async function query<T>(name: keyof typeof scenario.failures, getValue: () => T): Promise<T> {
  scenario.queryCalls.push(name);
  const failure = scenario.failures[name];
  if (failure) throw failure;
  return getValue();
}

function captureForm(name: string) {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      scenario.formProps[name] = props;
      return h("form", { "data-form-rendered": name });
    },
  };
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
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  } }).outputText;
  const importModule = (specifier: string): unknown => {
    if (specifier === "server-only") return {};
    if (specifier === "next/navigation") return { redirect: (destination: string) => { throw new RedirectSignal(destination); } };
    if (specifier === "next/link") {
      const Link = React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>>(
        function TestLink(props, ref) { return h("a", { ...props, ref }, props.children); },
      );
      return { __esModule: true, default: Link, useLinkStatus: () => ({ pending: false }) };
    }
    if (specifier === "@/components/ui/NavigationFeedbackProvider") return { useNavigationFeedback: () => ({ reportPending: () => {} }) };
    if (specifier === "@/components/ui/useGlobalNavigationPending") return { useGlobalNavigationPending: () => ({ isPending: false, push: () => {} }) };
    if (specifier === "@/lib/auth/errors") return { UnauthorizedError, ForbiddenError };
    if (specifier === "@/lib/auth/permissions") return {
      checkPermission: async (permission: string) => {
        scenario.permissionChecks.push(permission);
        return scenario.canRecord;
      },
    };
    if (specifier === "@/lib/auth/role-permissions") return {
      SUPPLIER_BILL_PERMISSIONS: { record: "supplier_bills:record" },
      SUPPLIER_PAYMENT_PERMISSIONS: { record: "supplier_payments:record" },
      SUPPLIER_ADVANCE_PERMISSIONS: { authorize: "supplier_advances:authorize" },
    };
    if (specifier === "@/lib/i18n/session-locale") return { getCurrentSessionEffectiveLocale: async () => scenario.locale };
    if (specifier === "@/lib/supplier-bills/queries") return {
      getSupplierBillFormOptions: async () => query("billOptions", () => scenario.billOptions),
      getSupplierBillById: async (id: string) => {
        scenario.queryArguments.billId = id;
        return query("bill", () => scenario.billResult);
      },
    };
    if (specifier === "@/lib/supplier-payments/queries") return {
      getSupplierBillPaymentSummary: async (id: string) => {
        scenario.queryArguments.summaryBillId = id;
        return query("paymentSummary", () => scenario.paymentSummary);
      },
    };
    if (specifier === "@/lib/supplier-advances/queries") return {
      getSupplierAdvanceCommitmentOptions: async () => query("advanceCommitments", () => scenario.advanceCommitments),
    };
    if (specifier === "node:crypto") return { randomUUID: () => { scenario.uuidCalls += 1; return "request-id-fixture"; } };
    if (specifier === "../SupplierBillForm") return captureForm("supplier-bill");
    if (specifier === "../SupplierPaymentForm") return captureForm("supplier-payment");
    if (specifier === "../SupplierAdvanceAuthorizationForm") return captureForm("supplier-advance");
    if (specifier.startsWith("@/")) return loadModule(resolve(root, specifier.slice(2)));
    if (specifier.startsWith(".")) return loadModule(resolve(dirname(file), specifier));
    return require(specifier);
  };
  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}

type Page = (props: { searchParams: Promise<SearchParams> }) => Promise<React.ReactNode>;
const pages: Record<Route, Page> = {
  bill: loadModule(resolve(root, "app/(dashboard)/supplier-bills/new/page")).default as Page,
  payment: loadModule(resolve(root, "app/(dashboard)/supplier-payments/new/page")).default as Page,
  advance: loadModule(resolve(root, "app/(dashboard)/supplier-advances/new/page")).default as Page,
};
const LocaleProvider = loadModule(resolve(root, "components/i18n/LocaleProvider")).LocaleProvider as React.ComponentType<React.PropsWithChildren<{ locale: Locale }>>;

type StateDictionary = { accessDenied: string; loadError: string; invalidBill?: string; noOptions?: string; noCommitments?: string };
type ModuleDictionary = {
  title: string;
  newBill?: string;
  recordPayment?: string;
  authorizeAdvance?: string;
  backToList: string;
  backToBill?: string;
  states: StateDictionary;
  notices?: { approvalGate: string };
};
function getDictionary(route: Route, locale: Locale): ModuleDictionary {
  const entries: Record<Route, [string, string]> = {
    bill: ["supplier-bills", "getSupplierBillsDictionary"],
    payment: ["supplier-payments", "getSupplierPaymentsDictionary"],
    advance: ["supplier-advances", "getSupplierAdvancesDictionary"],
  };
  const [file, getter] = entries[route];
  return (loadModule(resolve(root, "lib/i18n/dictionaries", file))[getter] as (locale: Locale) => ModuleDictionary)(locale);
}
function getBackLabel(locale: Locale): string {
  const common = loadModule(resolve(root, "lib/i18n/dictionaries/common")).getCommonDictionary as (locale: Locale) => { actions: { back: string } };
  return common(locale).actions.back;
}

async function renderPage(route: Route, searchParams: SearchParams = {}) {
  const tree = await pages[route]({ searchParams: Promise.resolve(searchParams) });
  const markup = renderToStaticMarkup(h(LocaleProvider, { locale: scenario.locale }, tree));
  return new JSDOM(markup).window.document;
}

function taskTitle(route: Route, dictionary: ModuleDictionary): string {
  if (route === "bill") return dictionary.newBill!;
  if (route === "payment") return dictionary.recordPayment!;
  return dictionary.authorizeAdvance!;
}
function modulePath(route: Route): string {
  return route === "bill" ? "/supplier-bills" : route === "payment" ? "/supplier-payments" : "/supplier-advances";
}

function assertPageShell(doc: Document, route: Route, locale: Locale, dictionary: ModuleDictionary) {
  const title = taskTitle(route, dictionary);
  assert.equal(doc.querySelectorAll("h1").length, 1, route);
  assert.equal(doc.querySelector("h1")?.textContent, title, route);
  assert.equal(doc.querySelector("h1")?.getAttribute("dir"), "auto", route);
  const frame = doc.querySelector<HTMLElement>('[data-page-frame="form"]');
  assert.ok(frame, `${route} uses the form page frame`);
  assert.ok(frame.classList.contains("max-w-5xl"), route);
  assert.equal(frame.parentElement?.getAttribute("dir"), locale === "ar" ? "rtl" : "ltr", route);
  const navigation = doc.querySelector("nav");
  assert.ok(navigation, `${route} exposes structural breadcrumbs`);
  assert.deepEqual([...navigation.querySelectorAll("li")].map((item) => item.textContent?.trim()), [dictionary.title, title], route);
  assert.equal(navigation.querySelector(`a[href="${modulePath(route)}"]`)?.textContent?.trim(), dictionary.title, route);
  assert.equal(navigation.querySelector('[aria-current="page"]')?.textContent?.trim(), title, route);
  assert.equal(doc.querySelectorAll("main").length, 0, route);
}

function assertReturn(doc: Document, locale: Locale, href: string, label = getBackLabel(locale)) {
  const link = [...doc.querySelectorAll<HTMLAnchorElement>("a")].find((candidate) => candidate.getAttribute("aria-label") === label);
  assert.ok(link, `missing localized Return control (${label})`);
  assert.equal(link.getAttribute("href"), href);
  assert.equal(link.textContent?.trim(), label);
  assert.ok(link.className.includes("focus-visible:ring-2"));
  assert.equal(link.querySelector("svg")?.classList.contains("scale-x-[-1]"), locale === "ar");
  assert.equal([...doc.querySelectorAll("a")].filter((candidate) => candidate.getAttribute("aria-label") === label).length, 1);
  assert.equal(doc.querySelectorAll("a a, a button, button a, button button").length, 0);
}

function assertErrorShell(
  doc: Document,
  route: Route,
  locale: Locale,
  dictionary: ModuleDictionary,
  message: string,
  role: "alert" | "status",
  returnHref: string,
  protectedValues: string[] = [],
  returnLabel = getBackLabel(locale),
) {
  assertPageShell(doc, route, locale, dictionary);
  assert.equal(doc.querySelectorAll("h2").length, 1, route);
  const heading = doc.querySelector("h2");
  assert.equal(heading?.textContent, message, route);
  const card = doc.querySelector<HTMLElement>(`[role="${role}"]`);
  assert.ok(card, `${route} should expose role=${role}`);
  assert.equal(card.getAttribute("aria-labelledby"), heading?.id);
  assert.equal(doc.querySelectorAll("[role=alert], [role=status]").length, 1, route);
  assert.equal(card.querySelector("p")?.textContent, message, route);
  assertReturn(doc, locale, returnHref, returnLabel);
  assert.equal(doc.querySelectorAll("form, button, input, select, textarea").length, 0, route);
  const markup = doc.documentElement.innerHTML;
  for (const value of protectedValues) assert.equal(markup.includes(value), false, `${route} exposed ${value}`);
}

const allowedReturn = "/services/123e4567-e89b-42d3-a456-426614174000/procurement";
const recordReturn = "/supplier-bills/123e4567-e89b-42d3-a456-426614174000";
const protectedBillValues = ["bill-private-id", "BILL-PRIVATE-9001", "Private Supplier LLC", "EVT-PRIVATE-008", "125"];

for (const locale of ["en", "ar"] as const) {
  test(`${locale}: successful supplier creation forms retain their current shell, props, and return labels`, async () => {
    reset(locale);
    const billDictionary = getDictionary("bill", locale);
    const billDoc = await renderPage("bill", { returnTo: allowedReturn });
    assertPageShell(billDoc, "bill", locale, billDictionary);
    assert.ok(billDoc.querySelector('[data-form-rendered="supplier-bill"]'));
    assert.equal(scenario.formProps["supplier-bill"]?.options, scenario.billOptions);
    assertReturn(billDoc, locale, allowedReturn, billDictionary.backToList);
    assert.deepEqual(scenario.permissionChecks, ["supplier_bills:record"]);
    assert.deepEqual(scenario.queryCalls, ["billOptions"]);

    reset(locale);
    const paymentDictionary = getDictionary("payment", locale);
    const billId = "bill-private-id";
    const paymentDoc = await renderPage("payment", { billId, returnTo: recordReturn });
    assertPageShell(paymentDoc, "payment", locale, paymentDictionary);
    assert.ok(paymentDoc.querySelector('[data-form-rendered="supplier-payment"]'));
    assert.equal(scenario.formProps["supplier-payment"]?.supplierBillId, "bill-private-id");
    assert.equal(scenario.formProps["supplier-payment"]?.returnTo, recordReturn);
    assertReturn(paymentDoc, locale, recordReturn, paymentDictionary.backToBill!);
    assert.deepEqual(scenario.permissionChecks, ["supplier_payments:record"]);
    assert.deepEqual(scenario.queryCalls, ["bill", "paymentSummary"]);

    reset(locale);
    const advanceDictionary = getDictionary("advance", locale);
    const advanceDoc = await renderPage("advance", { returnTo: allowedReturn });
    assertPageShell(advanceDoc, "advance", locale, advanceDictionary);
    assert.ok(advanceDoc.querySelector('[data-form-rendered="supplier-advance"]'));
    assert.equal(scenario.formProps["supplier-advance"]?.commitments, scenario.advanceCommitments);
    assert.equal(scenario.formProps["supplier-advance"]?.requestId, "request-id-fixture");
    assert.equal(scenario.uuidCalls, 1);
    assertReturn(advanceDoc, locale, allowedReturn, advanceDictionary.backToList);
    assert.deepEqual(scenario.permissionChecks, ["supplier_advances:authorize"]);
    assert.deepEqual(scenario.queryCalls, ["advanceCommitments"]);
  });

  test(`${locale}: Supplier Payment Return labels follow the validated destination`, async () => {
    const dictionary = getDictionary("payment", locale);
    const billId = "bill-private-id";
    const paymentList = "/supplier-payments";
    const paymentListWithQuery = "/supplier-payments?page=3&search=Supplier%20A";
    const supplierBillWithQuery = `${recordReturn}?tab=payments`;
    const otherAllowedRoute = "/services/123e4567-e89b-42d3-a456-426614174001";
    const cases = [
      { params: { billId, returnTo: recordReturn }, href: recordReturn, label: dictionary.backToBill! },
      { params: { billId, returnTo: supplierBillWithQuery }, href: supplierBillWithQuery, label: dictionary.backToBill! },
      { params: { billId, returnTo: paymentList }, href: paymentList, label: dictionary.backToList },
      { params: { billId, returnTo: paymentListWithQuery }, href: paymentListWithQuery, label: dictionary.backToList },
      { params: { billId }, href: paymentList, label: dictionary.backToList },
      { params: { billId, returnTo: "https://outside.example/private" }, href: paymentList, label: dictionary.backToList },
      { params: { billId, returnTo: "//outside.example/private" }, href: paymentList, label: dictionary.backToList },
      { params: { billId, returnTo: "/settings?tab=security" }, href: paymentList, label: dictionary.backToList },
      { params: { billId, returnTo: otherAllowedRoute }, href: otherAllowedRoute, label: getBackLabel(locale) },
    ];

    for (const scenarioCase of cases) {
      reset(locale);
      const doc = await renderPage("payment", scenarioCase.params);
      assertPageShell(doc, "payment", locale, dictionary);
      assertReturn(doc, locale, scenarioCase.href, scenarioCase.label);
      assert.equal(scenario.formProps["supplier-payment"]?.supplierBillId, billId);
      assert.equal(scenario.formProps["supplier-payment"]?.returnTo, scenarioCase.href);
    }
  });

  test(`${locale}: Supplier Bill permission, forbidden, load, missing-options, and empty states retain safe task context`, async () => {
    const dictionary = getDictionary("bill", locale);
    const deniedMessage = dictionary.states.accessDenied;
    const loadMessage = dictionary.states.loadError;

    reset(locale);
    scenario.canRecord = false;
    let doc = await renderPage("bill", { returnTo: recordReturn });
    assertErrorShell(doc, "bill", locale, dictionary, deniedMessage, "status", "/supplier-bills", ["123e4567-e89b-42d3-a456-426614174000", ...protectedBillValues]);
    assert.deepEqual(scenario.permissionChecks, ["supplier_bills:record"]);
    assert.deepEqual(scenario.queryCalls, []);

    reset(locale);
    scenario.failures.billOptions = new ForbiddenError("private commitment access denied");
    doc = await renderPage("bill", { returnTo: recordReturn });
    assertErrorShell(doc, "bill", locale, dictionary, deniedMessage, "status", "/supplier-bills", ["private commitment access denied", ...protectedBillValues]);

    reset(locale);
    scenario.failures.billOptions = new Error("private query detail and supplier name");
    doc = await renderPage("bill", { returnTo: allowedReturn });
    assertErrorShell(doc, "bill", locale, dictionary, loadMessage, "alert", allowedReturn, ["private query detail and supplier name", ...protectedBillValues]);

    reset(locale);
    scenario.billOptions = null;
    doc = await renderPage("bill");
    assertErrorShell(doc, "bill", locale, dictionary, loadMessage, "alert", "/supplier-bills", protectedBillValues);

    reset(locale);
    scenario.billOptions = { commitments: [{ id: "eligible-commitment" }], receipts: [] };
    doc = await renderPage("bill", { returnTo: allowedReturn });
    assertPageShell(doc, "bill", locale, dictionary);
    assert.equal(doc.querySelector("h2")?.textContent, dictionary.states.noOptions);
    assert.equal(doc.querySelector("p")?.textContent, dictionary.notices?.approvalGate);
    assert.equal(doc.querySelectorAll("[role=alert], [role=status]").length, 0);
    assert.equal(doc.querySelectorAll("form, button, input, select, textarea").length, 0);
    assertReturn(doc, locale, allowedReturn, dictionary.backToList);
  });

  test(`${locale}: Supplier Payment prerequisite and data errors retain context and hide bill details`, async () => {
    const dictionary = getDictionary("payment", locale);
    const invalidMessage = dictionary.states.invalidBill!;
    const deniedMessage = dictionary.states.accessDenied;
    const loadMessage = dictionary.states.loadError;

    reset(locale);
    let doc = await renderPage("payment", { returnTo: "https://evil.example/private" });
    assertErrorShell(doc, "payment", locale, dictionary, invalidMessage, "alert", "/supplier-payments", protectedBillValues, dictionary.backToList);
    assert.deepEqual(scenario.queryCalls, []);

    reset(locale);
    scenario.billResult = { bill: null };
    doc = await renderPage("payment", { billId: "missing-bill-reference", returnTo: "/supplier-payments" });
    assertErrorShell(doc, "payment", locale, dictionary, invalidMessage, "alert", "/supplier-payments", [...protectedBillValues, "missing-bill-reference"], dictionary.backToList);

    reset(locale);
    scenario.billResult = { bill: makeBill("pending") };
    doc = await renderPage("payment", { billId: "bill-private-id", returnTo: "/supplier-payments" });
    assertErrorShell(doc, "payment", locale, dictionary, invalidMessage, "alert", "/supplier-payments", protectedBillValues, dictionary.backToList);

    reset(locale);
    scenario.paymentSummary = null;
    doc = await renderPage("payment", { billId: "bill-private-id", returnTo: "/supplier-payments" });
    assertErrorShell(doc, "payment", locale, dictionary, invalidMessage, "alert", "/supplier-payments", protectedBillValues, dictionary.backToList);

    reset(locale);
    scenario.failures.bill = new ForbiddenError("private bill access denied");
    doc = await renderPage("payment", { billId: "bill-private-id", returnTo: recordReturn });
    assertErrorShell(doc, "payment", locale, dictionary, deniedMessage, "status", "/supplier-payments", ["bill-private-id", "123e4567-e89b-42d3-a456-426614174000", ...protectedBillValues], dictionary.backToList);
    assert.deepEqual(scenario.queryCalls, ["bill"]);
    assert.equal(scenario.queryArguments.billId, "bill-private-id");

    reset(locale);
    scenario.failures.bill = new Error("private query details and supplier name");
    doc = await renderPage("payment", { billId: "bill-private-id", returnTo: recordReturn });
    assertErrorShell(doc, "payment", locale, dictionary, loadMessage, "alert", recordReturn, ["private query details and supplier name", ...protectedBillValues], dictionary.backToBill!);

    reset(locale);
    scenario.failures.bill = new Error("private query details and supplier name");
    doc = await renderPage("payment", { billId: "bill-private-id", returnTo: "/services/123e4567-e89b-42d3-a456-426614174001" });
    assertErrorShell(doc, "payment", locale, dictionary, loadMessage, "alert", "/services/123e4567-e89b-42d3-a456-426614174001", ["private query details and supplier name", ...protectedBillValues], getBackLabel(locale));

    reset(locale);
    scenario.failures.paymentSummary = new Error("payment summary transport details");
    doc = await renderPage("payment", { billId: "bill-private-id", returnTo: "//evil.example" });
    assertErrorShell(doc, "payment", locale, dictionary, loadMessage, "alert", "/supplier-payments", ["payment summary transport details", ...protectedBillValues], dictionary.backToList);
    assert.deepEqual(scenario.permissionChecks, ["supplier_payments:record"]);
  });

  test(`${locale}: Supplier Advance denied/load/empty states retain context and create no request ID`, async () => {
    const dictionary = getDictionary("advance", locale);
    const deniedMessage = dictionary.states.accessDenied;
    const loadMessage = dictionary.states.loadError;

    reset(locale);
    scenario.canRecord = false;
    let doc = await renderPage("advance", { returnTo: recordReturn });
    assertErrorShell(doc, "advance", locale, dictionary, deniedMessage, "status", "/supplier-advances", ["123e4567-e89b-42d3-a456-426614174000", "commitment-private-id", "Private Supplier LLC"]);
    assert.deepEqual(scenario.permissionChecks, ["supplier_advances:authorize"]);
    assert.deepEqual(scenario.queryCalls, []);
    assert.equal(scenario.uuidCalls, 0);

    reset(locale);
    scenario.failures.advanceCommitments = new ForbiddenError("private commitments access denied");
    doc = await renderPage("advance", { returnTo: recordReturn });
    assertErrorShell(doc, "advance", locale, dictionary, deniedMessage, "status", "/supplier-advances", ["private commitments access denied", "123e4567-e89b-42d3-a456-426614174000", "commitment-private-id", "Private Supplier LLC"]);
    assert.equal(scenario.uuidCalls, 0);

    reset(locale);
    scenario.failures.advanceCommitments = new Error("private commitment query details");
    doc = await renderPage("advance", { returnTo: allowedReturn });
    assertErrorShell(doc, "advance", locale, dictionary, loadMessage, "alert", allowedReturn, ["private commitment query details", "commitment-private-id", "Private Supplier LLC"]);
    assert.equal(scenario.uuidCalls, 0);

    reset(locale);
    scenario.advanceCommitments = [];
    doc = await renderPage("advance", { returnTo: allowedReturn });
    assertPageShell(doc, "advance", locale, dictionary);
    assert.equal(doc.querySelector('[data-testid="supplier-advance-no-commitments"] h2')?.textContent, dictionary.states.noCommitments);
    assert.equal(doc.querySelectorAll("form, button, input, select, textarea").length, 0);
    assertReturn(doc, locale, allowedReturn, dictionary.backToList);
    assert.equal(scenario.uuidCalls, 0);
  });
}

test("all three create pages preserve the sign-in redirect for UnauthorizedError", async () => {
  for (const route of ["bill", "payment", "advance"] as const) {
    reset("en");
    const queryName = route === "bill" ? "billOptions" : route === "payment" ? "bill" : "advanceCommitments";
    scenario.failures[queryName] = new UnauthorizedError("authentication required");
    const searchParams = route === "payment" ? { billId: "bill-private-id" } : {};
    await assert.rejects(
      () => renderPage(route, searchParams),
      (error: unknown) => error instanceof RedirectSignal && error.destination === "/sign-in",
      `${route} must redirect unauthenticated users to /sign-in`,
    );
  }
});
