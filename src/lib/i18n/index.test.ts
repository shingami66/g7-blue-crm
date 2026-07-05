import assert from "node:assert/strict";
import test from "node:test";

type I18nModule = typeof import("./index.ts");

async function loadI18nModule(): Promise<Partial<I18nModule>> {
  try {
    return await import("./index.ts");
  } catch {
    return {};
  }
}

function requireValue<T>(value: T | undefined, message: string): NonNullable<T> {
  assert.notEqual(value, undefined, message);
  return value as NonNullable<T>;
}

test("exposes supported locales with a safe default parser", async () => {
  const i18n = await loadI18nModule();
  const parseLocale = requireValue(i18n.parseLocale, "parseLocale should exist");
  const getLocale = requireValue(i18n.getLocale, "getLocale should exist");

  assert.deepEqual(requireValue(i18n.SUPPORTED_LOCALES, "SUPPORTED_LOCALES should exist"), ["en", "ar"]);
  assert.equal(i18n.DEFAULT_LOCALE, "en");
  assert.equal(parseLocale("en"), "en");
  assert.equal(parseLocale("ar"), "ar");
  assert.equal(parseLocale("fr"), "en");
  assert.equal(parseLocale(undefined), "en");
  assert.equal(getLocale(), "en");
});

test("resolves locale direction for English and Arabic", async () => {
  const i18n = await loadI18nModule();
  const getDirection = requireValue(i18n.getDirection, "getDirection should exist");

  assert.equal(getDirection("en"), "ltr");
  assert.equal(getDirection("ar"), "rtl");
});

test("provides bidi isolation and latn numbering helpers", async () => {
  const i18n = await loadI18nModule();
  const isolateBidiText = requireValue(i18n.isolateBidiText, "isolateBidiText should exist");
  const withLatnNumberingSystem = requireValue(
    i18n.withLatnNumberingSystem,
    "withLatnNumberingSystem should exist",
  );

  assert.equal(isolateBidiText("INV-2026-0001"), "\u2068INV-2026-0001\u2069");
  assert.deepEqual(
    withLatnNumberingSystem({
      style: "currency",
      currency: "SAR",
    }),
    {
      style: "currency",
      currency: "SAR",
      numberingSystem: "latn",
    },
  );
  assert.equal(i18n.DOCUMENT_NUMBERING_SYSTEM, "latn");
});

test("ships English-only dictionary skeletons for the approved namespaces", async () => {
  const i18n = await loadI18nModule();
  const commonDictionaryEn = requireValue(i18n.commonDictionaryEn, "commonDictionaryEn should exist");
  const navigationDictionaryEn = requireValue(
    i18n.navigationDictionaryEn,
    "navigationDictionaryEn should exist",
  );
  const statusDictionariesEn = requireValue(i18n.statusDictionariesEn, "statusDictionariesEn should exist");
  const documentTypeDictionaryEn = requireValue(
    i18n.documentTypeDictionaryEn,
    "documentTypeDictionaryEn should exist",
  );

  assert.equal(commonDictionaryEn.actions.save, "Save");
  assert.equal(navigationDictionaryEn.modules.services, "Services");
  assert.equal(statusDictionariesEn.service.Inquiry, "Inquiry");
  assert.equal(statusDictionariesEn.payment.confirmed, "Confirmed");
  assert.equal(documentTypeDictionaryEn.invoiceType.deposit, "Deposit");
});
