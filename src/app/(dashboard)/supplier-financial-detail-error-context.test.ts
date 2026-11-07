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
const moduleCache = new Map<string, { exports: Record<string, unknown> }>();
const h = React.createElement;

type Locale = "en" | "ar";
type Route = "bill" | "payment" | "advance";
type SearchParams = { returnTo?: string | string[] };
type QueryName = "bill" | "billOptions" | "payment" | "advance" | "eligibleBills";
type Dictionary = { title: string; backToList: string; states: { accessDenied: string; loadError: string } };

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
  permissions: Record<string, boolean>;
  permissionChecks: string[];
  queryCalls: QueryName[];
  queryArguments: Record<string, string>;
  failures: Partial<Record<QueryName, Error>>;
  billResult: unknown;
  billOptions: unknown;
  paymentResult: unknown;
  advanceResult: unknown;
  eligibleBills: unknown;
  detailProps: Partial<Record<Route, Record<string, unknown>>>;
} = {
  locale: "en",
  permissions: {},
  permissionChecks: [],
  queryCalls: [],
  queryArguments: {},
  failures: {},
  billResult: null,
  billOptions: null,
  paymentResult: null,
  advanceResult: null,
  eligibleBills: null,
  detailProps: {},
};

const privateRecordId = "private-financial-record-id-824";
const safeReturnTo = "/services/123e4567-e89b-42d3-a456-426614174000/procurement";
const privateValues = [
  privateRecordId,
  "BILL-PRIVATE-824",
  "PAY-PRIVATE-824",
  "ADV-PRIVATE-824",
  "Private Supplier LLC",
  "PRIVATE_AMOUNT_824",
  "PRIVATE_BANK_NAME_824",
  "SA00BANKPRIVATE8240001",
  "private query error details",
  "private eligibility query details",
  "private advance query error",
];

function makeBill() {
  return {
    id: privateRecordId,
    bill_number: "BILL-PRIVATE-824",
    supplier_name: "Private Supplier LLC",
    total_amount: "PRIVATE_AMOUNT_824",
    bank_name: "PRIVATE_BANK_NAME_824",
    iban: "SA00BANKPRIVATE8240001",
  };
}

function makePayment() {
  return {
    id: privateRecordId,
    payment_number: "PAY-PRIVATE-824",
    supplier_name: "Private Supplier LLC",
    amount: "PRIVATE_AMOUNT_824",
    status: "private-payment-status",
    bank_name: "PRIVATE_BANK_NAME_824",
    iban: "SA00BANKPRIVATE8240001",
  };
}

function makeAdvance() {
  return {
    id: privateRecordId,
    advance_number: "ADV-PRIVATE-824",
    supplier_name: "Private Supplier LLC",
    amount: "PRIVATE_AMOUNT_824",
    status: "private-advance-status",
    bank_name: "PRIVATE_BANK_NAME_824",
    iban: "SA00BANKPRIVATE8240001",
  };
}

function reset(locale: Locale) {
  scenario.locale = locale;
  scenario.permissions = {};
  scenario.permissionChecks.length = 0;
  scenario.queryCalls.length = 0;
  scenario.queryArguments = {};
  scenario.failures = {};
  scenario.billResult = { bill: makeBill() };
  scenario.billOptions = { commitments: [{ id: "private-commitment-824" }], receipts: [{ id: "private-receipt-824" }] };
  scenario.paymentResult = { payment: makePayment() };
  scenario.advanceResult = { advance: makeAdvance() };
  scenario.eligibleBills = [{ id: "private-eligible-bill-824", bill_number: "BILL-PRIVATE-824" }];
  scenario.detailProps = {};
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

function captureDetail(route: Route) {
  return {
    __esModule: true,
    default: (props: Record<string, unknown>) => {
      scenario.detailProps[route] = props;
      return h("div", { "data-testid": `${route}-detail-client` });
    },
  };
}

function loadModule(path: string): Record<string, unknown> {
  const file = findModule(path);
  assert.ok(file, `Missing test import: ${path}`);
  if (moduleCache.has(file)) return moduleCache.get(file)!.exports;

  const compiled = { exports: {} as Record<string, unknown> };
  moduleCache.set(file, compiled);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    esModuleInterop: true,
  } }).outputText;
  const importModule = (specifier: string): unknown => {
    if (specifier === "server-only") return {};
    if (specifier === "next/navigation") return {
      redirect: (destination: string) => { throw new RedirectSignal(destination); },
      notFound: () => { throw new NotFoundSignal("not-found"); },
    };
    if (specifier === "next/link") {
      const Link = React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>>(
        function TestLink(props, ref) { return h("a", { ...props, ref }, props.children); },
      );
      return { __esModule: true, default: Link, useLinkStatus: () => ({ pending: false }) };
    }
    if (specifier === "@/components/ui/PendingLink") {
      const PendingLink = React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<React.AnchorHTMLAttributes<HTMLAnchorElement>>>(
        function TestPendingLink(props, ref) { return h("a", { ...props, ref }, props.children); },
      );
      return { __esModule: true, default: PendingLink };
    }
    if (specifier === "./Breadcrumbs" || specifier === "./PageActions") return { __esModule: true, default: () => null };
    if (specifier === "@/lib/auth/errors") return { UnauthorizedError, ForbiddenError };
    if (specifier === "@/lib/auth/permissions") return {
      checkPermission: async (permission: string) => {
        scenario.permissionChecks.push(permission);
        return scenario.permissions[permission] ?? true;
      },
    };
    if (specifier === "@/lib/auth/role-permissions") return {
      SUPPLIER_BILL_PERMISSIONS: { read: "supplier_bills:read", record: "supplier_bills:record", approve: "supplier_bills:approve" },
      SUPPLIER_PAYMENT_PERMISSIONS: { record: "supplier_payments:record", reverse: "supplier_payments:reverse" },
      SUPPLIER_ADVANCE_PERMISSIONS: {
        read: "supplier_advances:read",
        pay: "supplier_advances:pay",
        allocate: "supplier_advances:allocate",
        refund: "supplier_advances:refund",
        reverse: "supplier_advances:reverse",
        correct: "supplier_advances:correct",
        release: "supplier_advances:release_authorization",
      },
    };
    if (specifier === "@/lib/i18n/session-locale") return { getCurrentSessionEffectiveLocale: async () => scenario.locale };
    if (specifier === "@/lib/supplier-bills/queries") return {
      getSupplierBillById: async (id: string) => {
        scenario.queryArguments.billId = id;
        return query("bill", () => scenario.billResult);
      },
      getSupplierBillFormOptions: async () => query("billOptions", () => scenario.billOptions),
    };
    if (specifier === "@/lib/supplier-payments/queries") return {
      getSupplierPaymentById: async (id: string) => {
        scenario.queryArguments.paymentId = id;
        return query("payment", () => scenario.paymentResult);
      },
    };
    if (specifier === "@/lib/supplier-advances/queries") return {
      getSupplierAdvanceById: async (id: string) => {
        scenario.queryArguments.advanceId = id;
        return query("advance", () => scenario.advanceResult);
      },
      getSupplierAdvanceEligibleBills: async (id: string) => {
        scenario.queryArguments.eligibleBillsId = id;
        return query("eligibleBills", () => scenario.eligibleBills);
      },
    };
    if (specifier === "../SupplierBillDetailClient") return captureDetail("bill");
    if (specifier === "../SupplierPaymentDetailClient") return captureDetail("payment");
    if (specifier === "./SupplierAdvanceDetailClient") return captureDetail("advance");
    if (specifier.startsWith("@/")) return loadModule(resolve(root, specifier.slice(2)));
    if (specifier.startsWith(".")) return loadModule(resolve(dirname(file), specifier));
    return require(specifier);
  };
  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}

type Page = (props: { params: Promise<{ id: string }>; searchParams: Promise<SearchParams> }) => Promise<React.ReactNode>;
const pages: Record<Route, Page> = {
  bill: loadModule(resolve(root, "app/(dashboard)/supplier-bills/[id]/page")).default as Page,
  payment: loadModule(resolve(root, "app/(dashboard)/supplier-payments/[id]/page")).default as Page,
  advance: loadModule(resolve(root, "app/(dashboard)/supplier-advances/[id]/page")).default as Page,
};
const LocaleProvider = loadModule(resolve(root, "components/i18n/LocaleProvider")).LocaleProvider as React.ComponentType<React.PropsWithChildren<{ locale: Locale }>>;

function getDictionary(route: Route, locale: Locale): Dictionary {
  const entries: Record<Route, [string, string]> = {
    bill: ["supplier-bills", "getSupplierBillsDictionary"],
    payment: ["supplier-payments", "getSupplierPaymentsDictionary"],
    advance: ["supplier-advances", "getSupplierAdvancesDictionary"],
  };
  const [file, getter] = entries[route];
  return (loadModule(resolve(root, "lib/i18n/dictionaries", file))[getter] as (locale: Locale) => Dictionary)(locale);
}

function modulePath(route: Route): string {
  if (route === "bill") return "/supplier-bills";
  if (route === "payment") return "/supplier-payments";
  return "/supplier-advances";
}

async function renderPage(route: Route, searchParams: SearchParams = {}) {
  const tree = await pages[route]({
    params: Promise.resolve({ id: privateRecordId }),
    searchParams: Promise.resolve(searchParams),
  });
  const markup = renderToStaticMarkup(h(LocaleProvider, { locale: scenario.locale }, tree));
  return new JSDOM(markup).window.document;
}

function assertErrorState(
  doc: Document,
  route: Route,
  locale: Locale,
  dictionary: Dictionary,
  message: string,
  role: "alert" | "status",
) {
  assert.equal(doc.querySelectorAll("h1").length, 1, route);
  const h1 = doc.querySelector("h1");
  assert.equal(h1?.textContent, dictionary.title, route);
  assert.equal(h1?.getAttribute("dir"), "auto", route);
  assert.equal(doc.querySelectorAll('[data-page-header="composed"]').length, 1, route);
  const frame = doc.querySelector<HTMLElement>('[data-page-frame="record"]');
  assert.ok(frame, `${route} uses the record page frame`);
  assert.equal(frame.parentElement?.getAttribute("dir"), locale === "ar" ? "rtl" : "ltr", route);
  assert.equal(doc.querySelectorAll('[data-page-location="true"]').length, 1, route);
  assert.equal(doc.querySelectorAll("nav").length, 0, `${route} does not expose record breadcrumbs`);

  assert.equal(doc.querySelectorAll("h2").length, 1, route);
  const heading = doc.querySelector("h2");
  assert.equal(heading?.textContent, message, route);
  const state = doc.querySelector<HTMLElement>(`[role="${role}"]`);
  assert.ok(state, `${route} should expose role=${role}`);
  assert.equal(state.getAttribute("aria-labelledby"), heading?.id, route);
  assert.equal(doc.querySelectorAll("[role=alert], [role=status]").length, 1, route);
  assert.equal(state.querySelector("p")?.textContent, message, route);

  const links = [...doc.querySelectorAll<HTMLAnchorElement>("a")];
  assert.equal(links.length, 1, `${route} has one recovery link`);
  assert.equal(links[0].getAttribute("href"), modulePath(route), route);
  assert.equal(links[0].getAttribute("aria-label"), dictionary.backToList, route);
  assert.equal(links[0].textContent?.trim(), dictionary.backToList, route);
  assert.ok(links[0].className.includes("focus-visible:ring-2"), route);
  assert.equal(links[0].querySelector("svg")?.classList.contains("scale-x-[-1]"), locale === "ar", `${route} back icon direction`);
  assert.equal(doc.querySelectorAll("a a, a button, button a, button button").length, 0, route);
  assert.equal(doc.querySelectorAll("form, button, input, select, textarea").length, 0, route);

  const markup = doc.documentElement.innerHTML;
  for (const value of privateValues) assert.equal(markup.includes(value), false, `${route} exposed ${value}`);
}

async function assertRedirect(route: Route, queryName: QueryName) {
  await assert.rejects(
    () => renderPage(route),
    (error: unknown) => error instanceof RedirectSignal && error.destination === "/sign-in",
    `${route} keeps its unauthenticated redirect`,
  );
  assert.ok(scenario.queryCalls.includes(queryName), `${route} reached its existing query boundary`);
}

for (const locale of ["en", "ar"] as const) {
  test(`${locale}: supplier bill detail failures retain safe context and successful props`, async () => {
    const dictionary = getDictionary("bill", locale);
    const detailReturn = `/supplier-bills/${privateRecordId}`;

    reset(locale);
    scenario.permissions["supplier_bills:read"] = false;
    let doc = await renderPage("bill", { returnTo: detailReturn });
    assertErrorState(doc, "bill", locale, dictionary, dictionary.states.accessDenied, "status");
    assert.deepEqual(scenario.permissionChecks, ["supplier_bills:read", "supplier_bills:record", "supplier_bills:approve", "supplier_payments:record"]);
    assert.deepEqual(scenario.queryCalls, []);

    reset(locale);
    scenario.failures.billOptions = new ForbiddenError("private commitment access denied");
    doc = await renderPage("bill", { returnTo: detailReturn });
    assertErrorState(doc, "bill", locale, dictionary, dictionary.states.accessDenied, "status");
    assert.equal(doc.documentElement.innerHTML.includes("private commitment access denied"), false);

    reset(locale);
    scenario.failures.bill = new Error("private query error details");
    doc = await renderPage("bill", { returnTo: safeReturnTo });
    assertErrorState(doc, "bill", locale, dictionary, dictionary.states.loadError, "alert");

    reset(locale);
    scenario.billResult = { bill: null, error: "private query error details" };
    doc = await renderPage("bill", { returnTo: detailReturn });
    assertErrorState(doc, "bill", locale, dictionary, dictionary.states.loadError, "alert");

    reset(locale);
    scenario.billResult = null;
    doc = await renderPage("bill", { returnTo: detailReturn });
    assertErrorState(doc, "bill", locale, dictionary, dictionary.states.loadError, "alert");

    reset(locale);
    scenario.billOptions = null;
    doc = await renderPage("bill", { returnTo: detailReturn });
    assertErrorState(doc, "bill", locale, dictionary, dictionary.states.loadError, "alert");

    reset(locale);
    scenario.billResult = { bill: null };
    await assert.rejects(() => renderPage("bill"), (error: unknown) => error instanceof NotFoundSignal);

    reset(locale);
    scenario.failures.billOptions = new UnauthorizedError("authentication required");
    await assertRedirect("bill", "billOptions");

    reset(locale);
    const docSuccess = await renderPage("bill", { returnTo: safeReturnTo });
    assert.ok(docSuccess.querySelector('[data-testid="bill-detail-client"]'));
    assert.equal(scenario.detailProps.bill?.bill, (scenario.billResult as { bill: unknown }).bill);
    assert.equal(scenario.detailProps.bill?.options, scenario.billOptions);
    assert.equal(scenario.detailProps.bill?.returnTo, safeReturnTo);
    assert.equal(scenario.detailProps.bill?.canRecord, true);
    assert.equal(scenario.detailProps.bill?.canApprove, true);
    assert.equal(scenario.detailProps.bill?.canRecordPayment, true);
    assert.deepEqual(scenario.permissionChecks, ["supplier_bills:read", "supplier_bills:record", "supplier_bills:approve", "supplier_payments:record"]);
    assert.equal(scenario.queryArguments.billId, privateRecordId);
  });

  test(`${locale}: supplier payment detail failures preserve auth and safe recovery`, async () => {
    const dictionary = getDictionary("payment", locale);
    const detailReturn = `/supplier-payments/${privateRecordId}`;

    reset(locale);
    scenario.failures.payment = new ForbiddenError("private payment access denied");
    let doc = await renderPage("payment", { returnTo: detailReturn });
    assertErrorState(doc, "payment", locale, dictionary, dictionary.states.accessDenied, "status");
    assert.equal(doc.documentElement.innerHTML.includes("private payment access denied"), false);
    assert.deepEqual(scenario.permissionChecks, ["supplier_payments:reverse"]);

    reset(locale);
    scenario.failures.payment = new Error("private query error details");
    doc = await renderPage("payment", { returnTo: "https://private.example/record" });
    assertErrorState(doc, "payment", locale, dictionary, dictionary.states.loadError, "alert");

    reset(locale);
    scenario.paymentResult = { payment: null, error: "private query error details" };
    doc = await renderPage("payment", { returnTo: detailReturn });
    assertErrorState(doc, "payment", locale, dictionary, dictionary.states.loadError, "alert");

    reset(locale);
    scenario.paymentResult = { payment: null };
    await assert.rejects(() => renderPage("payment"), (error: unknown) => error instanceof NotFoundSignal);

    reset(locale);
    scenario.failures.payment = new UnauthorizedError("authentication required");
    await assertRedirect("payment", "payment");

    reset(locale);
    const docSuccess = await renderPage("payment", { returnTo: safeReturnTo });
    assert.ok(docSuccess.querySelector('[data-testid="payment-detail-client"]'));
    assert.equal(scenario.detailProps.payment?.payment, (scenario.paymentResult as { payment: unknown }).payment);
    assert.equal(scenario.detailProps.payment?.canReverse, true);
    assert.equal(scenario.detailProps.payment?.returnTo, safeReturnTo);
    assert.deepEqual(scenario.permissionChecks, ["supplier_payments:reverse"]);
    assert.equal(scenario.queryArguments.paymentId, privateRecordId);
  });

  test(`${locale}: supplier advance detail errors retain safe context and all action permissions`, async () => {
    const dictionary = getDictionary("advance", locale);
    const detailReturn = `/supplier-advances/${privateRecordId}`;
    const expectedPermissions = [
      "supplier_advances:read",
      "supplier_advances:pay",
      "supplier_advances:allocate",
      "supplier_advances:refund",
      "supplier_advances:reverse",
      "supplier_advances:correct",
      "supplier_advances:release_authorization",
    ];

    reset(locale);
    scenario.permissions["supplier_advances:read"] = false;
    let doc = await renderPage("advance", { returnTo: detailReturn });
    assertErrorState(doc, "advance", locale, dictionary, dictionary.states.accessDenied, "status");
    assert.deepEqual(scenario.permissionChecks, expectedPermissions);
    assert.deepEqual(scenario.queryCalls, []);

    reset(locale);
    scenario.failures.advance = new ForbiddenError("private advance access denied");
    doc = await renderPage("advance", { returnTo: detailReturn });
    assertErrorState(doc, "advance", locale, dictionary, dictionary.states.accessDenied, "status");
    assert.equal(doc.documentElement.innerHTML.includes("private advance access denied"), false);

    reset(locale);
    scenario.failures.eligibleBills = new Error("private eligibility query details");
    doc = await renderPage("advance", { returnTo: safeReturnTo });
    assertErrorState(doc, "advance", locale, dictionary, dictionary.states.loadError, "alert");

    reset(locale);
    scenario.advanceResult = { error: "private advance query error" };
    doc = await renderPage("advance", { returnTo: detailReturn });
    assertErrorState(doc, "advance", locale, dictionary, dictionary.states.loadError, "alert");

    reset(locale);
    scenario.advanceResult = { advance: null };
    await assert.rejects(() => renderPage("advance"), (error: unknown) => error instanceof NotFoundSignal);

    reset(locale);
    scenario.failures.advance = new UnauthorizedError("authentication required");
    await assertRedirect("advance", "advance");

    reset(locale);
    scenario.permissions = {
      "supplier_advances:pay": false,
      "supplier_advances:allocate": true,
      "supplier_advances:refund": false,
      "supplier_advances:reverse": true,
      "supplier_advances:correct": false,
      "supplier_advances:release_authorization": true,
    };
    const docSuccess = await renderPage("advance", { returnTo: safeReturnTo });
    assert.ok(docSuccess.querySelector('[data-testid="advance-detail-client"]'));
    assert.equal(scenario.detailProps.advance?.advance, (scenario.advanceResult as { advance: unknown }).advance);
    assert.equal(scenario.detailProps.advance?.eligibleBills, scenario.eligibleBills);
    assert.equal(scenario.detailProps.advance?.canPay, false);
    assert.equal(scenario.detailProps.advance?.canAllocate, true);
    assert.equal(scenario.detailProps.advance?.canRefund, false);
    assert.equal(scenario.detailProps.advance?.canReverse, true);
    assert.equal(scenario.detailProps.advance?.canCorrect, false);
    assert.equal(scenario.detailProps.advance?.canRelease, true);
    assert.equal(scenario.detailProps.advance?.returnTo, safeReturnTo);
    assert.deepEqual(scenario.permissionChecks, expectedPermissions);
    assert.equal(scenario.queryArguments.advanceId, privateRecordId);
    assert.equal(scenario.queryArguments.eligibleBillsId, privateRecordId);
  });
}
