import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import test from "node:test";
import { getQuotationsDictionary } from "./dictionaries/quotations.ts";
import { getServicesDictionary } from "./dictionaries/services.ts";
import {
  DEFAULT_LOCALE,
  getLocale,
  type Locale,
} from "./locales.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");

const FORCED_DEFAULT_PATTERNS = [
  "getServicesDictionary(getLocale())",
  "getQuotationsDictionary(getLocale())",
] as const;

/** Source-proven authenticated Service/Quotation UI roots for regression scan. */
const AUTHENTICATED_UI_SCAN_ROOTS = [
  "src/app/(dashboard)/services",
  "src/app/(dashboard)/quotations",
] as const;

function listSourceFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(dir, entry);
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      files.push(...listSourceFiles(fullPath));
      continue;
    }
    if (fullPath.endsWith(".ts") || fullPath.endsWith(".tsx")) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Pure client-side dictionary selection contract used by LocaleProvider-backed
 * components when a parent does not pass a pre-resolved dictionary.
 */
function resolveClientDictionary<T>(
  locale: Locale,
  dictionaryProp: T | undefined,
  resolve: (locale: Locale) => T,
): T {
  return dictionaryProp ?? resolve(locale);
}

test("effective Arabic/English locale resolves matching Services dictionary copy", () => {
  const english = getServicesDictionary("en");
  const arabic = getServicesDictionary("ar");

  assert.equal(english.billing.depositAction.create, "Create Deposit Invoice");
  assert.equal(arabic.billing.depositAction.create, "إنشاء فاتورة دفعة مقدمة");
  assert.equal(english.billing.finalAction.create, "Create Final Invoice");
  assert.equal(arabic.billing.finalAction.create, "إنشاء الفاتورة النهائية");
  assert.notEqual(
    english.supplierAllocations.subflow.createForm.create,
    arabic.supplierAllocations.subflow.createForm.create,
  );
});

test("effective Arabic/English locale resolves matching Quotations dictionary copy", () => {
  const english = getQuotationsDictionary("en");
  const arabic = getQuotationsDictionary("ar");

  assert.equal(english.list.title, "Quotations");
  assert.equal(arabic.list.title, "عروض الأسعار");
  assert.notEqual(english.form.createQuotation, arabic.form.createQuotation);
});

test("client dictionary selection uses provider locale without default-only fallback", () => {
  const fromProviderAr = resolveClientDictionary(
    "ar",
    undefined,
    getQuotationsDictionary,
  );
  const fromProviderEn = resolveClientDictionary(
    "en",
    undefined,
    getQuotationsDictionary,
  );
  const parentOverride = getQuotationsDictionary("en");
  const prefersParent = resolveClientDictionary(
    "ar",
    parentOverride,
    getQuotationsDictionary,
  );

  assert.equal(fromProviderAr.list.title, "عروض الأسعار");
  assert.equal(fromProviderEn.list.title, "Quotations");
  assert.equal(prefersParent.list.title, "Quotations");
  assert.notEqual(fromProviderAr.list.title, fromProviderEn.list.title);
  // Provider Arabic must not collapse to the intentional getLocale() default path.
  assert.notEqual(fromProviderAr.list.title, getQuotationsDictionary(getLocale()).list.title);
});

test("intentional getLocale default fallback remains English DEFAULT_LOCALE", () => {
  assert.equal(DEFAULT_LOCALE, "en");
  assert.equal(getLocale(), "en");
  assert.equal(getLocale(), DEFAULT_LOCALE);
});

test("authenticated Service/Quotation UI has no forced-default dictionary patterns", () => {
  const offenders: string[] = [];

  for (const root of AUTHENTICATED_UI_SCAN_ROOTS) {
    const absoluteRoot = join(REPO_ROOT, root);
    for (const filePath of listSourceFiles(absoluteRoot)) {
      const source = readFileSync(filePath, "utf8");
      for (const pattern of FORCED_DEFAULT_PATTERNS) {
        if (source.includes(pattern)) {
          offenders.push(`${relative(REPO_ROOT, filePath)}: ${pattern}`);
        }
      }
    }
  }

  assert.deepEqual(offenders, []);
});
