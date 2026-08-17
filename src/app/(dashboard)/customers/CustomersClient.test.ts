import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { getCustomersDictionary } from "../../../lib/i18n/dictionaries/customers.ts";
import type { Customer } from "@/types/customer";
import type { CustomerListPagination, CustomerListQuery } from "@/lib/customers/types";

const require = createRequire(import.meta.url);
const tsUrl = pathToFileURL(require.resolve("typescript")).href;

const nextNavDataUrl =
  "data:text/javascript," +
  encodeURIComponent(
    [
      'export function usePathname() { return "/customers"; }',
      "export function useRouter() { return { push: () => {}, replace: () => {}, refresh: () => {} }; }",
      "export function useSearchParams() { return new URLSearchParams(); }",
      "export function useParams() { return {}; }",
    ].join("\n"),
  );

const nextLinkDataUrl =
  "data:text/javascript," +
  encodeURIComponent(
    [
      'import { createElement as createElem } from "react";',
      "export default function Link({ href, children, ...props }) {",
      '  const targetHref = typeof href === "string" ? href : href?.pathname ?? "";',
      '  return createElem("a", { href: targetHref, ...props }, children);',
      "}",
      "export function useLinkStatus() {",
      "  return { pending: false };",
      "}",
    ].join("\n"),
  );

const nextCacheDataUrl =
  "data:text/javascript," +
  encodeURIComponent(
    [
      "export function revalidatePath() {}",
      "export function revalidateTag() {}",
      "export function unstable_cache(fn) { return fn; }",
    ].join("\n"),
  );

const customerActionsDataUrl =
  "data:text/javascript," +
  encodeURIComponent(
    [
      "export async function createCustomer() { return { success: true }; }",
      "export async function updateCustomer() { return { success: true }; }",
      "export async function deleteCustomer() { return { success: true }; }",
    ].join("\n"),
  );

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
    return { url: ${JSON.stringify(nextNavDataUrl)}, shortCircuit: true };
  }
  if (specifier === "next/link") {
    return { url: ${JSON.stringify(nextLinkDataUrl)}, shortCircuit: true };
  }
  if (specifier === "next/cache") {
    return { url: ${JSON.stringify(nextCacheDataUrl)}, shortCircuit: true };
  }
  if (
    specifier === "@/lib/customers/actions" ||
    specifier === "@/lib/customers/actions.ts" ||
    specifier.endsWith("customers/actions") ||
    specifier.endsWith("customers/actions.ts")
  ) {
    return { url: ${JSON.stringify(customerActionsDataUrl)}, shortCircuit: true };
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
    const filePath = fileURLToPath(url);
    const source = readFileSync(filePath, "utf8");
    const transpiled = ts.transpileModule(source, {
      compilerOptions: {
        target: ts.ScriptTarget.ES2022,
        module: ts.ModuleKind.ESNext,
        jsx: ts.JsxEmit.ReactJSX,
      },
    });
    return {
      format: "module",
      shortCircuit: true,
      source: transpiled.outputText,
    };
  }
  return nextLoad(url, context);
}
`;

register(`data:text/javascript,${encodeURIComponent(testModuleLoader)}`, import.meta.url);

mock.module("next/navigation", {
  namedExports: {
    useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
    usePathname: () => "/customers",
  },
});

mock.module("next/link", {
  defaultExport: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
  namedExports: {
    useLinkStatus: () => ({ pending: false }),
  },
});

mock.module("@/lib/customers/actions", {
  namedExports: {
    createCustomer: async () => ({ success: true }),
    updateCustomer: async () => ({ success: true }),
    deleteCustomer: async () => ({ success: true }),
  },
});

const { default: CustomersClient } = await import("./CustomersClient.tsx");
const { CustomerCoreFields, CustomerOfficialBillingFields } = await import("./CustomerFormFields.tsx");
const { LocaleProvider } = await import("../../../components/i18n/LocaleProvider.tsx");
const TestLocaleProvider = LocaleProvider as React.ComponentType<{ locale: "en" | "ar"; children?: React.ReactNode }>;

const mockCustomer: Customer = {
  id: "c-1",
  customerNumber: "CUST-2026-0001",
  company: "Acme Corp",
  contact: "John Doe",
  email: "john@acme.com",
  phone: "0501234567",
  city: "Riyadh",
  status: "active",
  customerType: "company",
  servicesCount: 2,
  quotationsCount: 2,
  approvedQuotationsCount: 1,
  draftQuotationsCount: 1,
  totalQuotedAmount: 50000,
};

const mockPagination: CustomerListPagination = {
  page: 1,
  pageSize: 20,
  total: 1,
  totalPages: 1,
};

const mockQuery: CustomerListQuery = {
  page: 1,
  pageSize: 20,
};

test("W5-A11Y-002: Customer form fields programmatically associate rendered labels with controls via matching id and htmlFor", () => {
  const dictionary = getCustomersDictionary("en");

  const coreHtml = renderToStaticMarkup(
    React.createElement(CustomerCoreFields, { customer: null, dictionary }),
  );

  // Text inputs have htmlFor matching input id
  assert.ok(coreHtml.includes('for="customer-field-company"'));
  assert.ok(coreHtml.includes('id="customer-field-company"'));

  assert.ok(coreHtml.includes('for="customer-field-contact"'));
  assert.ok(coreHtml.includes('id="customer-field-contact"'));

  assert.ok(coreHtml.includes('for="customer-field-email"'));
  assert.ok(coreHtml.includes('id="customer-field-email"'));

  assert.ok(coreHtml.includes('for="customer-field-phone"'));
  assert.ok(coreHtml.includes('id="customer-field-phone"'));

  assert.ok(coreHtml.includes('for="customer-field-city"'));
  assert.ok(coreHtml.includes('id="customer-field-city"'));

  // Status select association
  assert.ok(coreHtml.includes('for="customer-field-status"'));
  assert.ok(coreHtml.includes('id="customer-field-status"'));

  const billingHtml = renderToStaticMarkup(
    React.createElement(CustomerOfficialBillingFields, { customer: null, dictionary }),
  );

  // Customer type select association
  assert.ok(billingHtml.includes('for="customer-field-customer-type"'));
  assert.ok(billingHtml.includes('id="customer-field-customer-type"'));

  // Payment terms textarea association
  assert.ok(billingHtml.includes('for="customer-field-payment-terms"'));
  assert.ok(billingHtml.includes('id="customer-field-payment-terms"'));

  // PO required checkbox association
  assert.ok(billingHtml.includes('for="customer-field-po-required"'));
  assert.ok(billingHtml.includes('id="customer-field-po-required"'));
});

test("W5-A11Y-003: CustomersClient status and city filter selects use intended accessible names without implementation overrides", () => {
  const dictionary = getCustomersDictionary("en");
  const html = renderToStaticMarkup(
    React.createElement(
      TestLocaleProvider,
      { locale: "en" },
      React.createElement(CustomersClient, {
        customers: [mockCustomer],
        pagination: mockPagination,
        query: mockQuery,
        cities: ["Riyadh", "Jeddah"],
        canWrite: true,
        canExport: true,
        dictionary,
      }),
    ),
  );

  // Status filter label association
  assert.ok(
    html.includes('<label for="customer-status-filter" class="sr-only">Status</label>'),
    "Status filter must have associated screen-reader label with intended filter name",
  );
  assert.ok(
    html.includes('id="customer-status-filter"'),
    "Status select must have customer-status-filter ID matching label htmlFor",
  );
  assert.ok(
    !html.includes('id="customer-status-filter" value="all" aria-label="All Statuses"'),
    "Status select must NOT override label with aria-label='All Statuses'",
  );
  assert.match(
    html,
    /<option[^>]*value="all"[^>]*>All Statuses<\/option>/,
    "Status select must render default All Statuses option",
  );

  // City filter label association
  assert.ok(
    html.includes('<label for="customer-city-filter" class="sr-only">City</label>'),
    "City filter must have associated screen-reader label with intended filter name",
  );
  assert.ok(
    html.includes('id="customer-city-filter"'),
    "City select must have customer-city-filter ID matching label htmlFor",
  );
  assert.ok(
    !html.includes('id="customer-city-filter" value="all" aria-label="All Cities"'),
    "City select must NOT override label with aria-label='All Cities'",
  );
  assert.match(
    html,
    /<option[^>]*value="all"[^>]*>All Cities<\/option>/,
    "City select must render default All Cities option",
  );
  assert.ok(html.includes('<option value="Riyadh">Riyadh</option>'));
  assert.ok(html.includes('<option value="Jeddah">Jeddah</option>'));

  // Search input accessible attributes
  assert.ok(html.includes('type="search"'));
  assert.ok(html.includes(`placeholder="${dictionary.list.searchPlaceholder}"`));
  assert.ok(html.includes(`aria-label="${dictionary.list.searchPlaceholder}"`));

  // Action buttons
  assert.ok(html.includes(dictionary.list.addCustomer), "Add Customer button must be rendered when canWrite is true");
  assert.ok(html.includes(dictionary.list.export), "Export button must be rendered when canExport is true");
});

test("CustomersClient renders Arabic accessible filter labels and options", () => {
  const dictionary = getCustomersDictionary("ar");
  const html = renderToStaticMarkup(
    React.createElement(
      TestLocaleProvider,
      { locale: "ar" },
      React.createElement(CustomersClient, {
        customers: [mockCustomer],
        pagination: mockPagination,
        query: mockQuery,
        cities: ["الرياض", "جدة"],
        canWrite: false,
        canExport: false,
        dictionary,
      }),
    ),
  );

  // Localized Arabic label associations
  assert.ok(
    html.includes(`<label for="customer-status-filter" class="sr-only">${dictionary.list.report.statusFilter}</label>`),
    "Status filter must render Arabic filter label",
  );
  assert.ok(
    html.includes(`<label for="customer-city-filter" class="sr-only">${dictionary.list.report.cityFilter}</label>`),
    "City filter must render Arabic filter label",
  );
  assert.match(
    html,
    new RegExp(`<option[^>]*value="all"[^>]*>${dictionary.list.allStatuses}</option>`),
  );
  assert.match(
    html,
    new RegExp(`<option[^>]*value="all"[^>]*>${dictionary.list.allCities}</option>`),
  );

  // Permission restrictions honored
  assert.ok(!html.includes(dictionary.list.addCustomer), "Add button must not be rendered when canWrite is false");
  assert.ok(!html.includes(dictionary.list.export), "Export button must not be rendered when canExport is false");
});

test("CustomersClient renders clear button with accessible label when search query is present", () => {
  const dictionary = getCustomersDictionary("en");
  const html = renderToStaticMarkup(
    React.createElement(
      TestLocaleProvider,
      { locale: "en" },
      React.createElement(CustomersClient, {
        customers: [mockCustomer],
        pagination: mockPagination,
        query: { ...mockQuery, search: "Acme" },
        cities: ["Riyadh"],
        canWrite: true,
        dictionary,
      }),
    ),
  );

  assert.ok(
    html.includes(`aria-label="Clear: ${dictionary.list.searchPlaceholder}"`),
    "Clear button must have accessible label including field name",
  );
});

test("Customers dictionary contains filter labels for both English and Arabic", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");

  assert.equal(typeof en.list.report.statusFilter, "string");
  assert.equal(typeof ar.list.report.statusFilter, "string");
  assert.equal(typeof en.list.report.cityFilter, "string");
  assert.equal(typeof ar.list.report.cityFilter, "string");
});

test("CustomersClient source includes hidden mutation_key input for G8 replay safety", async () => {
  const { readFileSync } = await import("node:fs");
  const clientSource = readFileSync(
    new URL("./CustomersClient.tsx", import.meta.url),
    "utf8"
  );
  assert.match(
    clientSource,
    /<input[^>]*name="mutation_key"/,
    "CustomersClient modal must include hidden mutation_key input"
  );
  assert.match(
    clientSource,
    /generateMutationKey/,
    "CustomersClient must generate caller mutation key on modal open"
  );
});
