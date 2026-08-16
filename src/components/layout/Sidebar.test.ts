import test, { mock } from "node:test";
import assert from "node:assert/strict";
import { createRequire, register } from "node:module";
import { pathToFileURL } from "node:url";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  navigationDictionaryAr,
  navigationDictionaryEn,
} from "../../lib/i18n/dictionaries/navigation.ts";

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
    usePathname: () => "/customers",
    useRouter: () => ({ push: () => {}, replace: () => {}, refresh: () => {} }),
  },
});

mock.module("next/link", {
  defaultExport: ({ href, children, ...props }: { href: string; children?: React.ReactNode }) =>
    React.createElement("a", { href, ...props }, children),
  namedExports: {
    useLinkStatus: () => ({ pending: false }),
  },
});

const { default: Sidebar } = await import("./Sidebar.tsx");
const { LocaleProvider } = await import("../i18n/LocaleProvider.tsx");
const TestLocaleProvider = LocaleProvider as React.ComponentType<{ locale: "en" | "ar"; children?: React.ReactNode }>;

test("W5-A11Y-001: mobile sidebar exposes accessible disclosure button, closed-drawer hidden/invisible semantics, and desktop visibility", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      TestLocaleProvider,
      { locale: "en" },
      React.createElement(Sidebar, { isAdmin: false, shellDirection: "ltr" }),
    ),
  );

  // Trigger button disclosure semantics
  assert.ok(html.includes('aria-expanded="false"'), "Trigger button must be collapsed by default");
  assert.ok(html.includes('aria-controls="mobile-sidebar-nav"'), "Trigger must control mobile sidebar nav element");
  assert.ok(
    html.includes(`aria-label="${navigationDictionaryEn.menu.open}"`),
    "Trigger button must have accessible open label when collapsed",
  );

  // Nav element landmark and identity
  assert.ok(html.includes('id="mobile-sidebar-nav"'), "Sidebar must have mobile-sidebar-nav ID");
  assert.ok(
    html.includes(`aria-label="${navigationDictionaryEn.menu.mainNavigation}"`),
    "Nav element must have accessible main navigation label",
  );

  // Closed mobile state: invisible on mobile to remove from tab order and screen readers, visible on desktop
  assert.ok(
    html.includes("invisible md:visible"),
    "Closed mobile sidebar must use invisible md:visible to stay non-focusable on mobile while preserving desktop visibility",
  );
  assert.ok(
    html.includes("-translate-x-full md:translate-x-0"),
    "Sidebar must slide offscreen on mobile and reset to normal position on desktop",
  );

  // Backdrop overlay is not rendered when collapsed
  assert.ok(!html.includes("bg-black/50"), "Backdrop overlay must not be rendered when drawer is closed");

  // Core navigation links rendered
  assert.ok(html.includes('href="/dashboard"'));
  assert.ok(html.includes('href="/customers"'));
  assert.ok(html.includes('href="/services"'));
  assert.ok(html.includes('href="/quotations"'));
  assert.ok(html.includes('href="/invoices"'));
  assert.ok(html.includes('href="/suppliers"'));
  assert.ok(html.includes('href="/payments"'));
  assert.ok(html.includes('href="/reports"'));
  assert.ok(html.includes('href="/settings"'));

  // Non-admin view must not render admin links
  assert.ok(!html.includes('href="/admin/users"'), "Non-admin view must not render admin links");
});

test("Sidebar renders admin section and links when isAdmin is true", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      TestLocaleProvider,
      { locale: "en" },
      React.createElement(Sidebar, { isAdmin: true, shellDirection: "ltr" }),
    ),
  );

  assert.ok(html.includes('href="/admin/users"'), "Admin view must render admin users link");
  assert.ok(html.includes(navigationDictionaryEn.admin), "Admin section header must be rendered");
});

test("Sidebar supports Arabic RTL rendering with localized accessible names and RTL positioning", () => {
  const html = renderToStaticMarkup(
    React.createElement(
      TestLocaleProvider,
      { locale: "ar" },
      React.createElement(Sidebar, { isAdmin: false, shellDirection: "rtl" }),
    ),
  );

  assert.ok(
    html.includes(`aria-label="${navigationDictionaryAr.menu.open}"`),
    "Trigger button must use Arabic open label",
  );
  assert.ok(
    html.includes(`aria-label="${navigationDictionaryAr.menu.mainNavigation}"`),
    "Nav element must use Arabic main navigation label",
  );
  assert.ok(html.includes('dir="rtl"'), "Sidebar must apply RTL direction");
  assert.ok(
    html.includes("translate-x-full"),
    "RTL collapsed sidebar must position to right with translate-x-full",
  );
});

test("Sidebar menu dictionary strings are defined and localized in both EN and AR", () => {
  assert.equal(navigationDictionaryEn.menu.open, "Open navigation menu");
  assert.equal(navigationDictionaryEn.menu.close, "Close navigation menu");
  assert.equal(navigationDictionaryEn.menu.mainNavigation, "Main navigation");

  assert.equal(navigationDictionaryAr.menu.open, "فتح قائمة التنقل");
  assert.equal(navigationDictionaryAr.menu.close, "إغلاق قائمة التنقل");
  assert.equal(navigationDictionaryAr.menu.mainNavigation, "التنقل الرئيسي");
});
