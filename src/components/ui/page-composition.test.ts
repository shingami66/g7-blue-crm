import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string) => { window: { document: Document } } };
const root = fileURLToPath(new URL("../../", import.meta.url));
const cache = new Map<string, Record<string, unknown>>();

// Load actual TSX components using the repository's existing transpile-test pattern.
// Only Next's link transport and pending hooks are isolated; UI/locale logic is real.
function load(path: string): Record<string, unknown> {
  const file = [path, path + ".tsx", path + ".ts"].find(existsSync)!;
  if (cache.has(file)) return cache.get(file)!;
  const compiled = { exports: {} as Record<string, unknown> };
  cache.set(file, compiled.exports);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const importModule = (name: string): unknown => {
    if (name === "next/link") return { __esModule: true,
      default: React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<{ href: string }>>(
        function TestLink({ children, ...props }, ref) { return React.createElement("a", { ...props, ref }, children); }),
      useLinkStatus: () => ({ pending: false }),
    };
    if (name === "@/components/ui/NavigationFeedbackProvider") return { useNavigationFeedback: () => ({ reportPending: () => {} }) };
    if (name === "@/components/ui/useGlobalNavigationPending") return { useGlobalNavigationPending: () => ({ isPending: false, push: () => {} }) };
    if (name.startsWith("@/")) return load(resolve(root, name.slice(2)));
    if (name.startsWith(".")) return load(resolve(file, "..", name));
    return require(name);
  };
  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}

function component(path: string, name = "default") {
  return load(resolve(root, path))[name] as React.ComponentType<Record<string, unknown>>;
}
const Frame = component("components/ui/PageFrame");
const Header = component("components/ui/PageHeader");
const Location = component("components/navigation/PageLocation");
const Crumbs = component("components/navigation/Breadcrumbs");
const Back = component("components/navigation/RecordBackButton");
const Region = component("components/records/RecordNavigationRegion");
const Pager = component("components/records/RecordNavigation");
const Button = component("components/ui/Button");
const Locale = component("components/i18n/LocaleProvider", "LocaleProvider");
const h = React.createElement;
function render(child: React.ReactNode, locale = "en") {
  const html = renderToStaticMarkup(h(Locale, { locale }, child));
  return { html, doc: new JSDOM(html).window.document };
}

test("frame variants express width intent without adding main landmarks", () => {
  for (const variant of ["workspace", "record", "form"]) {
    const { doc } = render(h(Frame, { variant }, "Content"));
    const frame = doc.querySelector("[data-page-frame]")!;
    assert.equal(frame.tagName, "DIV");
    assert.equal(frame.getAttribute("data-page-frame"), variant);
    assert.ok(frame.classList.contains(variant === "form" ? "max-w-5xl" : "max-w-full"));
    assert.equal(doc.querySelectorAll("main").length, 0);
  }
});

for (const locale of ["en", "ar"]) {
  test(`${locale}: structural crumbs retain input order, independent origin and mixed text`, () => {
    const labels = locale === "ar" ? ["المشتريات", "الموردون", "شركة FrameLine 123 ".repeat(12)] : ["Procurement", "Suppliers", "FrameLine شركة 123 ".repeat(12)];
    const label = locale === "ar" ? "مسار الصفحة" : "Breadcrumbs";
    const { doc } = render(h("div", { dir: locale === "ar" ? "rtl" : "ltr" }, h(Location, {
      breadcrumbs: { label, items: [{ label: labels[0] }, { label: labels[1], href: "/suppliers" }, { label: labels[2], current: true }] },
      returnControl: h(Back, { href: "/suppliers?search=AV&page=2", locale, variant: "labeled", label: locale === "ar" ? "العودة إلى النتائج" : "Return to results" }),
    })), locale);
    const nav = doc.querySelector("nav")!;
    assert.equal(nav.getAttribute("aria-label"), label);
    assert.equal(nav.querySelectorAll("ol > li").length, 3);
    assert.deepEqual([...nav.querySelectorAll("bdi")].map((item) => item.textContent), labels);
    assert.equal(nav.querySelectorAll("a").length, 1);
    assert.equal(nav.querySelector("a")!.getAttribute("href"), "/suppliers");
    assert.equal(nav.querySelector('[aria-current="page"] bdi')!.getAttribute("dir"), "auto");
    assert.ok(nav.querySelector('[aria-current="page"]')!.classList.contains("break-words"));
    assert.equal(doc.querySelectorAll("a")[1].getAttribute("href"), "/suppliers?search=AV&page=2");
    assert.ok([...nav.querySelectorAll("li > svg")].every((svg) => svg.getAttribute("aria-hidden") === "true" && svg.classList.contains("rtl:rotate-180")));
    const link = nav.querySelector("a")!;
    link.focus();
    assert.equal(doc.activeElement, link);
    assert.ok(link.className.includes("focus-visible:ring-2"));
  });
}

test("breadcrumbs reject invalid current semantics and external ancestors", () => {
  for (const items of [[], [{ label: "No current" }], [{ label: "A", current: true }, { label: "B", current: true }], [{ label: "Current", current: true, href: "/suppliers" }], [{ label: "External", href: "https://example.com" }, { label: "Current", current: true }]]) {
    assert.throws(() => render(h(Crumbs, { label: "Breadcrumbs", items })));
  }
  assert.equal(render(h(Location, {})).html, "");
});

test("back variants separate visible content from presentation and retain legacy defaults", () => {
  const legacyIcon = render(h(Back, { href: "/suppliers", locale: "en" }));
  assert.ok(legacyIcon.doc.querySelector("a")!.classList.contains("h-8"));
  assert.equal(legacyIcon.doc.querySelector("a")!.getAttribute("aria-label"), "Back");
  const legacyLabeled = render(h(Back, { href: "/suppliers", locale: "en", label: "Suppliers" }));
  assert.ok(legacyLabeled.doc.querySelector("a")!.classList.contains("min-h-10"));
  const icon = render(h(Back, { href: "/suppliers", locale: "en", variant: "icon", label: "Suppliers" }));
  assert.ok(icon.doc.querySelector("a")!.classList.contains("h-8"));
  assert.equal(icon.doc.querySelector("a")!.textContent, "");
  assert.equal(icon.doc.querySelector("a")!.getAttribute("aria-label"), "Suppliers");
  const labeled = render(h(Back, { href: "/suppliers", locale: "en", variant: "labeled", ariaLabel: " ", label: " " }));
  assert.equal(labeled.doc.querySelector("a")!.textContent, "Back");
  for (const href of ["https://evil.example", "//evil.example", "/\\evil.example", "javascript:alert(1)", "/suppliers\n"]) {
    assert.throws(() => render(h(Back, { href, locale: "en" })));
  }
});

test("back arrow uses actual locale logic for EN and AR", () => {
  for (const locale of ["en", "ar"]) {
    const { doc } = render(h(Back, { href: "/suppliers", locale, variant: "labeled" }), locale);
    const link = doc.querySelector("a")!;
    assert.ok(link.getAttribute("aria-label")!.trim());
    assert.equal(doc.querySelector("svg")!.classList.contains("scale-x-[-1]"), locale === "ar");
    assert.ok(link.className.includes("focus-visible:ring-2"));
  }
});

test("legacy header output remains unchanged and composed mode owns one h1", () => {
  const legacy = render(h(Header, { title: "Directory", subtitle: "Subtitle" }, h("button", null, "New"))).doc;
  assert.equal(legacy.querySelectorAll("h1").length, 0);
  assert.equal(legacy.querySelectorAll("h2").length, 1);
  assert.equal(legacy.body.firstElementChild!.className, "mb-6 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between");
  const { doc } = render(h(Header, { variant: "composed", title: "Record" }));
  assert.equal(doc.querySelectorAll("h1").length, 1);
  // The detail pilot exposed identity compression beside a wide action cluster.
  // Keep the composed header able to wrap, without changing legacy consumers.
  assert.ok(doc.querySelector("header")!.classList.contains("sm:flex-wrap"));
  assert.ok(doc.querySelector("h1")!.parentElement!.parentElement!.classList.contains("sm:basis-72"));
  assert.equal(doc.querySelectorAll("h2, main, [role=group]").length, 0);
  assert.equal(render(h(Header, { variant: "composed", title: "Reference", identifier: 0 })).doc.querySelector("[data-page-identifier]")!.textContent, "0");
});

test("composed identity/status and action slots retain semantics in both directions", () => {
  for (const dir of ["ltr", "rtl"]) {
    const { doc } = render(h("div", { dir }, h(Header, {
      variant: "composed", title: "شركة Example".repeat(10), subtitle: "Context",
      identifier: h("bdi", { dir: "ltr" }, "SUP-123"), status: h("span", null, "Active"),
      actions: { label: "Record actions", primary: h(Button, { disabled: true }, "Save"), secondary: h("a", { href: "/suppliers" }, "Cancel"), overflow: h("button", { type: "button" }, "More") },
    })));
    assert.equal(doc.querySelectorAll("h1").length, 1);
    assert.equal(doc.querySelector("h1")!.getAttribute("dir"), "auto");
    assert.equal(doc.querySelector("[data-page-identifier] bdi")!.getAttribute("dir"), "ltr");
    assert.ok(doc.querySelector("h1")!.parentElement!.querySelector("[data-page-status]"));
    const group = doc.querySelector('[role="group"]')!;
    assert.equal(group.getAttribute("aria-label"), "Record actions");
    assert.equal(group.querySelectorAll("[data-page-actions]").length, 3);
    assert.equal(group.querySelector("[data-page-status]"), null);
    assert.equal((group.querySelector('[data-page-actions="primary"] button') as HTMLButtonElement).disabled, true);
    assert.equal(doc.querySelectorAll("a a, a button, button a, button button").length, 0);
  }
});

test("record region is optional and preserves actual pager links and LTR convention", () => {
  assert.equal(render(h(Region, { label: "Records" })).html, "");
  const props = { basePath: "/suppliers", recordType: "Suppliers", navigation: { first: "one", previous: null, next: "two", last: "last" }, dictionary: { title: "Browse", first: "First", previous: "Previous", next: "Next", last: "Last" }, returnTo: "/suppliers?page=2", recordQuery: { showDeleted: "true" } };
  const standalone = render(h(Pager, props)).doc;
  const wrapped = render(h("div", { dir: "rtl" }, h(Region, { label: "Browse suppliers" }, h(Pager, props))), "ar").doc;
  assert.equal(wrapped.querySelector("section")!.getAttribute("aria-label"), "Browse suppliers");
  assert.equal(wrapped.querySelector("nav")!.getAttribute("dir"), "ltr");
  assert.deepEqual([...wrapped.querySelectorAll("a")].map((link) => link.getAttribute("href")), [...standalone.querySelectorAll("a")].map((link) => link.getAttribute("href")));
  assert.ok(wrapped.querySelector('button[disabled][aria-disabled="true"]'));
  assert.equal(wrapped.querySelectorAll("main").length, 0);
});
