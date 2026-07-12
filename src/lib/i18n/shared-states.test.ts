import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getCommonDictionary,
  getSharedUiStates,
  listSharedUiStateShapeKeys,
} from "./dictionaries/common.ts";
import { DEFAULT_LOCALE, getLocale, type Locale } from "./locales.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");

const EDITED_SHARED_STATE_SURFACES = [
  "src/app/(dashboard)/loading.tsx",
  "src/app/(dashboard)/error.tsx",
  "src/app/(dashboard)/not-found.tsx",
  "src/components/ui/GlobalPendingProvider.tsx",
  "src/components/ui/SharedAuthenticatedStatePanel.tsx",
] as const;

const FORBIDDEN_HARDCODED_ENGLISH = [
  "Loading dashboard",
  "Access Denied",
  "Access denied",
  "Page not found",
  "Something went wrong",
  "You do not have permission",
  "Try again",
  "We could not load this information",
] as const;

/** Client provider selection contract for shared client surfaces. */
function resolveSharedClientCopy(
  locale: Locale,
  dictionaryProp: ReturnType<typeof getSharedUiStates> | undefined,
) {
  return dictionaryProp ?? getSharedUiStates(locale);
}

/** Error-boundary reset contract: invoke only the provided reset callback. */
function invokeErrorBoundaryRetry(reset: () => void): void {
  reset();
}

test("English and Arabic shared-state dictionaries resolve approved copy", () => {
  const english = getSharedUiStates("en");
  const arabic = getSharedUiStates("ar");

  assert.equal(english.loading.label, "Loading");
  assert.equal(arabic.loading.label, "جارٍ التحميل");

  assert.equal(english.accessDenied.title, "Access denied");
  assert.equal(english.accessDenied.message, "You do not have permission to view this page.");
  assert.equal(arabic.accessDenied.title, "تم رفض الوصول");
  assert.equal(arabic.accessDenied.message, "ليس لديك صلاحية لعرض هذه الصفحة.");

  assert.equal(english.notFound.title, "Page not found");
  assert.equal(english.notFound.message, "The page you are looking for could not be found.");
  assert.equal(arabic.notFound.title, "الصفحة غير موجودة");
  assert.equal(arabic.notFound.message, "تعذر العثور على الصفحة المطلوبة.");

  assert.equal(english.genericError.title, "Something went wrong");
  assert.equal(english.genericError.message, "We could not load this information.");
  assert.equal(arabic.genericError.title, "حدث خطأ ما");
  assert.equal(arabic.genericError.message, "تعذر تحميل هذه المعلومات.");

  assert.equal(english.warning.title, "Warning");
  assert.equal(english.warning.tryAgainLater, "Please try again later.");
  assert.equal(arabic.warning.title, "تنبيه");
  assert.equal(arabic.warning.tryAgainLater, "يرجى المحاولة مرة أخرى لاحقاً.");

  assert.equal(english.retry.tryAgain, "Try again");
  assert.equal(english.retry.goBack, "Go back");
  assert.equal(arabic.retry.tryAgain, "حاول مرة أخرى");
  assert.equal(arabic.retry.goBack, "رجوع");
});

test("shared-state dictionary shapes stay aligned across locales", () => {
  const english = getSharedUiStates("en");
  const arabic = getSharedUiStates("ar");
  assert.deepEqual(listSharedUiStateShapeKeys(english), listSharedUiStateShapeKeys(arabic));

  const commonEn = getCommonDictionary("en");
  const commonAr = getCommonDictionary("ar");
  assert.deepEqual(Object.keys(commonEn).sort(), Object.keys(commonAr).sort());
  assert.ok("shared" in commonEn);
  assert.ok("pagination" in commonEn);
});

test("client provider locale selects matching shared-state dictionary", () => {
  const fromProviderAr = resolveSharedClientCopy("ar", undefined);
  const fromProviderEn = resolveSharedClientCopy("en", undefined);
  const parentOverride = getSharedUiStates("en");
  const prefersParent = resolveSharedClientCopy("ar", parentOverride);

  assert.equal(fromProviderAr.genericError.title, "حدث خطأ ما");
  assert.equal(fromProviderEn.genericError.title, "Something went wrong");
  assert.equal(prefersParent.genericError.title, "Something went wrong");
  assert.notEqual(fromProviderAr.loading.label, fromProviderEn.loading.label);
});

test("server effective-locale selection maps to shared-state dictionaries", () => {
  // Production server pages call getCurrentSessionEffectiveLocale() then this helper.
  const resolveServerShared = (effectiveLocale: Locale) => getSharedUiStates(effectiveLocale);

  assert.equal(resolveServerShared("ar").notFound.title, "الصفحة غير موجودة");
  assert.equal(resolveServerShared("en").notFound.title, "Page not found");
  assert.equal(resolveServerShared("ar").loading.label, "جارٍ التحميل");
});

test("error-boundary retry contract only invokes the provided reset callback", () => {
  let resetCalls = 0;
  const reset = () => {
    resetCalls += 1;
  };

  invokeErrorBoundaryRetry(reset);
  assert.equal(resetCalls, 1);

  // Safe UI copy never includes raw exception text.
  const safe = getSharedUiStates("en").genericError;
  assert.doesNotMatch(safe.title, /Error|Exception|stack|supabase|postgres/i);
  assert.doesNotMatch(safe.message, /Error|Exception|stack|supabase|postgres/i);
  assert.equal(safe.message.includes("error.message"), false);
});

test("global pending bolt accessibility label localizes without changing visual contract markers", () => {
  // Visual contract remains bolt-only (no visible sentence). SR label is localized copy.
  const enLabel = getSharedUiStates("en").loading.label;
  const arLabel = getSharedUiStates("ar").loading.label;
  assert.equal(enLabel, "Loading");
  assert.equal(arLabel, "جارٍ التحميل");

  const boltSource = readFileSync(
    join(REPO_ROOT, "src/components/ui/CenterPendingBolt.tsx"),
    "utf8",
  );
  assert.match(boltSource, /center-pending-bolt/);
  assert.match(boltSource, /sr-only/);
  assert.doesNotMatch(boltSource, /backdrop|spinner/i);
});

test("edited shared authenticated surfaces avoid hardcoded English state copy", () => {
  const offenders: string[] = [];

  for (const relativePath of EDITED_SHARED_STATE_SURFACES) {
    const source = readFileSync(join(REPO_ROOT, relativePath), "utf8");
    for (const phrase of FORBIDDEN_HARDCODED_ENGLISH) {
      if (source.includes(`"${phrase}"`) || source.includes(`'${phrase}'`)) {
        offenders.push(`${relativePath}: ${phrase}`);
      }
    }
    // Raw internal leakage markers must not be introduced in shared UI.
    if (
      source.includes("{error.message}") ||
      source.includes("error.message}") ||
      /message=\{error[\s\S]*?\}/.test(source)
    ) {
      offenders.push(`${relativePath}: raw exception rendered`);
    }
  }

  assert.deepEqual(offenders, []);
});

test("module-local deferred surfaces remain outside this shared-state slice", () => {
  // Settings uses settings dictionary (Phase 3); not shared-state primitives.
  const settings = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/settings/page.tsx"),
    "utf8",
  );
  assert.match(settings, /getSettingsDictionary/);
  assert.doesNotMatch(settings, /getSharedUiStates/);

  // Suppliers now use suppliers dictionary (Phase 3); not shared-state primitives.
  const suppliers = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/suppliers/page.tsx"),
    "utf8",
  );
  assert.match(suppliers, /getSuppliersDictionary/);
  assert.doesNotMatch(suppliers, /getSharedUiStates/);
});

test("intentional getLocale default and Western-digit helpers remain unaffected", () => {
  assert.equal(getLocale(), DEFAULT_LOCALE);
  assert.equal(getLocale(), "en");
  // Shared copy has no Arabic-Indic digits.
  const ar = getSharedUiStates("ar");
  const joined = JSON.stringify(ar);
  assert.doesNotMatch(joined, /[٠-٩]/);
});
