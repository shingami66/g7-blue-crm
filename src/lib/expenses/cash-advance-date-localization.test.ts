import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import type { Locale } from "../i18n/locales.ts";

const require = createRequire(import.meta.url);
const { JSDOM } = require("jsdom") as { JSDOM: new (html: string) => { window: { document: Document } } };
const root = resolve(process.cwd(), "src");
const cache = new Map<string, Record<string, unknown>>();
const h = React.createElement;
const forbiddenCall = () => { throw new Error("Date rendering must not execute server IO or navigation"); };

// Use the existing TSX test pattern: render the real client, locale provider,
// date component and dictionaries; isolate only Next transport and server IO.
function load(path: string): Record<string, unknown> {
  const file = [path, path + ".tsx", path + ".ts"].find(existsSync);
  assert.ok(file, `Missing test import: ${path}`);
  if (cache.has(file)) return cache.get(file)!;
  const compiled = { exports: {} as Record<string, unknown> };
  cache.set(file, compiled.exports);
  const code = ts.transpileModule(readFileSync(file, "utf8"), { compilerOptions: {
    target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true,
  } }).outputText;
  const importModule = (name: string): unknown => {
    if (name === "next/navigation") return { useRouter: () => ({ refresh: forbiddenCall, push: forbiddenCall }) };
    if (name === "next/link") return { __esModule: true,
      default: React.forwardRef<HTMLAnchorElement, React.PropsWithChildren<{ href: string }>>(
        function TestLink({ children, ...props }, ref) { return h("a", { ...props, ref }, children); }),
      useLinkStatus: () => ({ pending: false }),
    };
    if (/\/actions(?:\.ts)?$/.test(name)) return new Proxy({}, { get: () => forbiddenCall });
    if (name.startsWith("@/")) return load(resolve(root, name.slice(2)));
    if (name.startsWith(".")) return load(resolve(dirname(file), name));
    return require(name);
  };
  new Function("require", "module", "exports", code)(importModule, compiled, compiled.exports);
  return compiled.exports;
}

const AdvancesClient = load(resolve(root, "app/(dashboard)/advances/AdvancesClient")).default as React.ComponentType<Record<string, unknown>>;
const LocaleProvider = load(resolve(root, "components/i18n/LocaleProvider")).LocaleProvider as React.ComponentType<React.PropsWithChildren<{ locale: Locale }>>;

function render(locale: Locale, requestedAt: string) {
  const advance = {
    id: "date-fixture", advance_number: "ADV-2026-0001", status: "issued",
    context_type: "company", purpose: "UX-05 date fixture", requested_at: requestedAt,
    amount_issued: 100, amount_spent_settled: 25, amount_returned: 10, remaining_balance: 65,
  };
  return new JSDOM(renderToStaticMarkup(h(LocaleProvider, { locale },
    h("main", { dir: locale === "ar" ? "rtl" : "ltr" },
      h(AdvancesClient, { canRead: true, myAdvances: [advance], loadError: null }),
    ),
  ))).window.document;
}

for (const locale of ["en", "ar"] as const) {
  for (const fixture of [
    { value: "2026-07-10T14:30:00", text: locale === "ar" ? "10 يوليو 2026" : "Jul 10, 2026" },
    { value: "2026-11-08T14:30:00", text: locale === "ar" ? "8 نوفمبر 2026" : "Nov 8, 2026" },
    { value: "malformed-timestamp", text: "—" },
  ]) {
    test(`UX-05: ${locale} mobile and desktop requested_at=${fixture.value}`, () => {
      const doc = render(locale, fixture.value);
      const mobile = doc.querySelector(".md\\:hidden")!;
      const desktop = doc.querySelector("table")!;
      const mobileDate = mobile.querySelector(".lucide-clock")!.nextElementSibling!;
      const desktopDate = desktop.querySelector("tbody tr td:nth-child(2)")!.firstElementChild!;
      assert.equal(mobileDate.outerHTML, desktopDate.outerHTML);
      for (const date of [mobileDate, desktopDate]) {
        assert.equal(date.textContent, fixture.text);
        assert.doesNotMatch(date.textContent!, /[٠-٩۰-۹]|Invalid Date|NaN|malformed/);
        if (fixture.text === "—") continue;
        assert.equal(date.getAttribute("dir"), locale === "ar" ? "rtl" : "ltr");
        if (locale === "ar") {
          assert.equal(date.parentElement!.closest('[dir="ltr"]'), null);
          assert.deepEqual(Array.from(date.querySelectorAll("bdi"), node => [node.getAttribute("dir"), node.textContent]),
            [["ltr", fixture.text.split(" ")[0]], ["ltr", "2026"]]);
        }
      }
      for (const surface of [mobile, desktop]) {
        assert.equal(surface.querySelector("a")!.getAttribute("href"), "/advances/date-fixture?returnTo=%2Fadvances");
        for (const amount of ["100.00", "25.00", "10.00", "65.00"]) assert.ok(surface.textContent!.includes(amount));
        assert.equal(surface.querySelector('[dir="ltr"]')!.textContent, "ADV-2026-0001");
      }
    });
  }
}

test("UX-05: Cash Advance list has no browser-default date formatting", () => {
  const source = readFileSync(resolve(root, "app/(dashboard)/advances/AdvancesClient.tsx"), "utf8");
  assert.doesNotMatch(source, /toLocaleDateString\s*\(/);
});
