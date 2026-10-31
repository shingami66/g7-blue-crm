import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string) => { window: { document: Document } } };
const root = fileURLToPath(new URL("../../", import.meta.url));
const h = React.createElement;
const id = "11111111-1111-4111-8111-111111111111";
const neighbor = "22222222-2222-4222-8222-222222222222";

// Render the real pages, shared composition, navigation, dictionaries, and action
// controls. Only server data/authority, Next transport, and unrelated workspaces
// are isolated. No test action can reach a database.
function harness(locale: "en" | "ar", permissions: string[], deleted = false, status = "active") {
  const cache = new Map<string, Record<string, unknown>>();
  const calls: Array<unknown[]> = [];
  const name = locale === "ar" ? "شركة التجهيزات العربية Example 123 ".repeat(4) : "Example Customer Supplier";
  const customer = { id, company: name, customerNumber: "CUS-001", status: "active", customerType: "individual" };
  const supplier = { id, name, supplierNumber: "SUP-001", status, isDeleted: deleted, isPreferred: false, canViewSensitive: false, canReadBank: false };
  const navigation = { first: neighbor, previous: null, next: neighbor, last: neighbor };
  function load(path: string): Record<string, unknown> {
    const file = [path, path + ".tsx", path + ".ts"].find(existsSync)!;
    if (!file) throw new Error(`Missing module: ${path}`);
    if (cache.has(file)) return cache.get(file)!;
    const compiled = { exports: {} as Record<string, unknown> };
    cache.set(file, compiled.exports);
    const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
      module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
    } }).outputText;
    const importModule = (module: string): unknown => {
      if (module === "server-only") return {};
      if (module === "next/navigation") return { useRouter: () => ({ refresh() {}, push() {} }), notFound: () => { throw new Error("notFound"); }, redirect: () => { throw new Error("redirect"); } };
      if (module === "next/link") return { __esModule: true, default: React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<{ href: string }>>(function Link({ children, ...props }, ref) { return h("a", { ...props, ref }, children); }), useLinkStatus: () => ({ pending: false }) };
      if (module.endsWith("/NavigationFeedbackProvider")) return { useNavigationFeedback: () => ({ reportPending() {} }) };
      if (module.endsWith("/useGlobalNavigationPending")) return { useGlobalNavigationPending: () => ({ isPending: false, push() {} }) };
      if (module === "@/lib/i18n/session-locale") return { getCurrentSessionEffectiveLocale: async () => locale };
      if (module === "@/lib/auth/permissions") return { checkPermission: async (permission: string) => { calls.push(["permission", permission]); return permissions.includes(permission); } };
      if (module === "@/lib/customer-360/queries") return { getCustomerProfile: async () => ({ status: "ready", customer }), getCustomer360Secondary: async () => ({ data: {} }) };
      if (module === "@/lib/suppliers/queries") return { getSupplierById: async (...args: unknown[]) => { calls.push(["supplier", ...args]); return { supplier }; } };
      if (module === "@/lib/record-navigation/queries") return { ...load(resolve(root, "lib/record-navigation/return-to")), getCustomerRecordNavigation: async (...args: unknown[]) => { calls.push(["customerNavigation", ...args]); return navigation; }, getSupplierRecordNavigation: async (...args: unknown[]) => { calls.push(["supplierNavigation", ...args]); return navigation; } };
      if (["@/lib/customers/actions", "@/lib/suppliers/actions"].includes(module)) return new Proxy({}, { get: () => () => { throw new Error("Mutation forbidden in presentation tests"); } });
      if (["./Customer360Workspace", "../SupplierRateCardsList"].includes(module)) return { __esModule: true, default: () => h("div", { "data-domain-workspace": true }) };
      if (module === "../CustomerFormFields") return { CustomerCoreFields: () => null, CustomerOfficialBillingFields: () => null };
      if (module.startsWith("@/")) return load(resolve(root, module.slice(2)));
      if (module.startsWith(".")) return load(resolve(dirname(file), module));
      return require(module);
    };
    new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
    return compiled.exports;
  }
  // Resolve async Server Components before React's synchronous SSR, leaving
  // client components to React so real hooks and permission rendering are used.
  async function settle(node: React.ReactNode): Promise<React.ReactNode> {
    if (Array.isArray(node)) return Promise.all(React.Children.toArray(node).map(settle));
    if (!React.isValidElement(node)) return node;
    const element = node as React.ReactElement<{ children?: React.ReactNode }>;
    if (typeof element.type === "function" && element.type.constructor.name === "AsyncFunction") {
      return settle(await (element.type as (props: unknown) => Promise<React.ReactNode>)(element.props));
    }
    return element.props.children === undefined ? element : React.cloneElement(element, {}, await settle(element.props.children));
  }
  async function render(kind: "customers" | "suppliers", search: Record<string, string> = {}) {
    const Page = load(resolve(root, `app/(dashboard)/${kind}/[id]/page`)).default as (props: unknown) => Promise<React.ReactNode>;
    const Locale = load(resolve(root, "components/i18n/LocaleProvider")).LocaleProvider as React.ComponentType<React.PropsWithChildren<{ locale: string }>>;
    const tree = await settle(await Page({ params: Promise.resolve({ id }), searchParams: Promise.resolve(search) }));
    return new JSDOM(renderToStaticMarkup(h(Locale, { locale }, h("div", { dir: locale === "ar" ? "rtl" : "ltr" }, tree)))).window.document;
  }
  return { render, calls, name, load };
}

function assertShell(doc: Document, module: string, name: string, returnTo: string, location: string, back: string) {
  assert.equal(doc.querySelectorAll('[data-page-frame="record"]').length, 1);
  assert.equal(doc.querySelectorAll("h1").length, 1);
  assert.equal(doc.querySelector("h1")!.textContent, name);
  assert.equal(doc.querySelector("h1")!.getAttribute("dir"), "auto");
  const crumbs = doc.querySelector(`nav[aria-label="${location}"]`)!;
  assert.equal(crumbs.querySelector("a")!.getAttribute("href"), `/${module}`);
  assert.equal(crumbs.querySelector('[aria-current="page"]')!.textContent, name);
  assert.equal(crumbs.querySelector('[aria-current="page"] a'), null);
  assert.equal(crumbs.querySelector('[aria-current="page"] bdi')!.getAttribute("dir"), "auto");
  const origin = doc.querySelector(`a[aria-label="${back}"]`)!;
  assert.equal(origin.getAttribute("href"), returnTo);
  assert.ok(!origin.textContent!.includes("?"));
  assert.equal(origin.closest("section"), null);
  const region = doc.querySelector("section[aria-label]")!;
  const pager = region.querySelector("nav")!;
  assert.equal(pager.getAttribute("dir"), "ltr");
  assert.ok(region.compareDocumentPosition(doc.querySelector("[data-page-header]")!) & 2);
  for (const link of pager.querySelectorAll("a")) assert.equal(new URL(link.getAttribute("href")!, "https://local").searchParams.get("returnTo"), returnTo);
  assert.ok(doc.querySelector("[data-page-status]")!.textContent!.trim());
  assert.equal(doc.querySelectorAll("[data-page-status] button, a a, a button, button a, button button").length, 0);
}

for (const locale of ["en", "ar"] as const) {
  const location = locale === "ar" ? "مسار الصفحة" : "Page location";
  test(`${locale}: Customer real page retains identity, origin, pager and authorized Edit`, async () => {
    const env = harness(locale, ["customers:write"]);
    const origin = "/customers?search=Example&page=3&status=active";
    const doc = await env.render("customers", { returnTo: origin });
    const dictionary = (env.load(resolve(root, "lib/i18n/dictionaries/customers")).getCustomersDictionary as (locale: string) => { actions: { editProfile: string } })(locale);
    assertShell(doc, "customers", env.name, origin, location, locale === "ar" ? "العودة إلى العملاء" : "Back to customers");
    assert.equal(doc.querySelector('[data-page-identifier] bdi')!.textContent, "CUS-001");
    assert.equal(doc.querySelector('[data-page-actions="primary"] button')!.textContent, dictionary.actions.editProfile);
    assert.ok(env.calls.some((call) => call[0] === "customerNavigation" && call[1] === id && call[2] === "CUS-001"));
    const readOnly = await harness(locale, []).render("customers");
    assert.equal(readOnly.querySelector('[data-page-actions]'), null);
  });
  test(`${locale}: Supplier real page preserves current/deleted mode and action authority`, async () => {
    for (const deleted of [false, true]) {
      const env = harness(locale, ["suppliers:write", "suppliers:delete"], deleted);
      const origin = `/suppliers?search=AV&page=2${deleted ? "&showDeleted=true" : ""}`;
      const doc = await env.render("suppliers", { returnTo: origin, ...(deleted ? { showDeleted: "true" } : {}) });
      const d = (env.load(resolve(root, "lib/i18n/dictionaries/suppliers")).getSuppliersDictionary as (locale: string) => { detail: { edit: string; deleted: string }; deleteRestore: { delete: string; restore: string } })(locale);
      assertShell(doc, "suppliers", env.name, origin, location, locale === "ar" ? "العودة إلى الموردين" : "Back to suppliers");
      assert.ok(!doc.querySelector('[data-page-frame="record"]')!.className.includes("max-w-6xl"));
      assert.equal(doc.querySelector('[data-page-identifier] bdi')!.textContent, "SUP-001");
      const primary = doc.querySelector('[data-page-actions="primary"]')!;
      if (deleted) {
        assert.equal(primary.querySelector("button")!.textContent, d.deleteRestore.restore);
        assert.ok(doc.querySelector("[data-page-status]")!.textContent!.includes(d.detail.deleted));
        assert.equal(doc.querySelector('[data-page-actions="overflow"]'), null);
        assert.equal(doc.querySelector('a[href*="/edit"]'), null);
      } else {
        const edit = primary.querySelector("a")!;
        assert.equal(edit.textContent, d.detail.edit);
        const recordOrigin = new URL(edit.getAttribute("href")!, "https://local").searchParams.get("returnTo")!;
        assert.equal(new URL(recordOrigin, "https://local").searchParams.get("returnTo"), origin);
        const secondary = doc.querySelector('[data-page-actions="overflow"]')!;
        assert.equal(secondary.querySelectorAll("button").length, 2);
        assert.ok(secondary.textContent!.includes(d.deleteRestore.delete));
        assert.ok(!secondary.querySelector("button:last-child")!.className.includes("bg-error "));
      }
      for (const link of doc.querySelectorAll("section[aria-label] nav a")) assert.equal(new URL(link.getAttribute("href")!, "https://local").searchParams.get("showDeleted"), deleted ? "true" : null);
      assert.ok(env.calls.some((call) => call[0] === "supplierNavigation" && call[3] === deleted));
      assert.ok(env.calls.some((call) => call[0] === "supplier" && (call[2] as { includeDeleted: boolean }).includeDeleted === deleted));
    }
    const noAuthority = await harness(locale, []).render("suppliers");
    assert.equal(noAuthority.querySelector('[data-page-actions]'), null);
    const deleteOnly = await harness(locale, ["suppliers:delete"]).render("suppliers");
    assert.equal(deleteOnly.querySelector('[data-page-actions="primary"]'), null);
    assert.equal(deleteOnly.querySelector('[data-page-actions="overflow"]')!.querySelectorAll("button").length, 1);
    const editOnly = await harness(locale, ["suppliers:write"]).render("suppliers");
    assert.equal(editOnly.querySelector('[data-page-actions="overflow"]')!.querySelectorAll("button").length, 1);
  });
  test(`${locale}: invalid origins fall back safely; blacklist reversal remains available`, async () => {
    const env = harness(locale, ["suppliers:write"], false, "blacklisted");
    const doc = await env.render("suppliers", { returnTo: "https://evil.invalid" });
    assert.equal(doc.querySelector('a[aria-label="' + (locale === "ar" ? "العودة إلى الموردين" : "Back to suppliers") + '"]')!.getAttribute("href"), "/suppliers");
    assert.ok(doc.querySelector('[data-page-actions="overflow"] button'));
    const deleted = await harness(locale, ["suppliers:delete"], true).render("suppliers", { showDeleted: "true" });
    assert.equal(deleted.querySelector('a[aria-label="' + (locale === "ar" ? "العودة إلى الموردين" : "Back to suppliers") + '"]')!.getAttribute("href"), "/suppliers?showDeleted=true");
  });
}
