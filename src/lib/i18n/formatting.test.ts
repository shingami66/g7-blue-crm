import assert from "node:assert/strict";
import test from "node:test";
import {
  FIRST_STRONG_ISOLATE,
  LEFT_TO_RIGHT_ISOLATE,
  POP_DIRECTIONAL_ISOLATE,
  isolateBidiText,
  isolateLtrText,
} from "./bidi.ts";
import {
  DOCUMENT_NUMBERING_SYSTEM,
  UI_CURRENCY_SAR,
  UI_EMPTY_VALUE,
  formatSarAmount,
  formatUiDate,
  formatUiDateTime,
  formatUiNumber,
  formatUiPercent,
  formatUiQuantity,
  getIntlLocale,
  isFiniteNumber,
  parseUiDateInput,
  withLatnNumberingSystem,
} from "./formatting.ts";
import type { Locale } from "./locales.ts";
import { SUPPORTED_LOCALES, isSupportedLocale } from "./locales.ts";

const ARABIC_INDIC_DIGITS = /[٠-٩۰-۹]/;
const ENGLISH_MONTH_ABBREV = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\b/;
const ARABIC_MONTH_NAMES =
  /يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر/;

const LRI = LEFT_TO_RIGHT_ISOLATE;
const PDI = POP_DIRECTIONAL_ISOLATE;
const FSI = FIRST_STRONG_ISOLATE;

/** Fixed local calendar instant: 10 July 2026, 14:30 */
const JULY_10_2026 = new Date(2026, 6, 10, 14, 30, 0);

function assertWesternDigits(value: string, label: string) {
  assert.doesNotMatch(value, ARABIC_INDIC_DIGITS, `${label} must use Western digits`);
  assert.match(value, /[0-9]/, `${label} must contain Western digits`);
}

test("bidi helpers wrap a display copy and do not mutate the source business value", () => {
  const source = "INV-2026-0001";
  const isolatedFsi = isolateBidiText(source);
  const isolatedLri = isolateLtrText(source);

  assert.equal(source, "INV-2026-0001");
  assert.equal(isolatedFsi, `${FSI}INV-2026-0001${PDI}`);
  assert.equal(isolatedLri, `${LRI}INV-2026-0001${PDI}`);
  assert.notEqual(isolatedFsi, isolatedLri);
  assert.equal(isolateLtrText("SAR 17,000.00"), `${LRI}SAR 17,000.00${PDI}`);
});

test("latn numbering helper and intl locale map remain authoritative", () => {
  assert.equal(DOCUMENT_NUMBERING_SYSTEM, "latn");
  assert.equal(UI_CURRENCY_SAR, "SAR");
  assert.equal(getIntlLocale("en"), "en-SA");
  assert.equal(getIntlLocale("ar"), "ar-SA");
  assert.deepEqual(withLatnNumberingSystem({ style: "decimal" }), {
    style: "decimal",
    numberingSystem: "latn",
  });
});

test("locale type surface accepts only supported Locale values", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["en", "ar"]);
  assert.equal(isSupportedLocale("en"), true);
  assert.equal(isSupportedLocale("ar"), true);
  assert.equal(isSupportedLocale("fr"), false);
  assert.equal(isSupportedLocale(undefined), false);

  const locales: Locale[] = ["en", "ar"];
  for (const locale of locales) {
    assert.ok(isSupportedLocale(locale));
    assert.match(getIntlLocale(locale), /-(SA)$/);
  }
});

test("parseUiDateInput accepts Date, epoch, YYYY-MM-DD, and ISO date-times only", () => {
  const localDate = parseUiDateInput("2026-07-10");
  assert.ok(localDate);
  assert.equal(localDate.getFullYear(), 2026);
  assert.equal(localDate.getMonth(), 6);
  assert.equal(localDate.getDate(), 10);

  assert.ok(parseUiDateInput(JULY_10_2026));
  assert.ok(parseUiDateInput(JULY_10_2026.getTime()));
  assert.ok(parseUiDateInput("2026-07-10T14:30:00"));
  assert.ok(parseUiDateInput("2026-07-10T14:30:00.123Z"));
  assert.ok(parseUiDateInput("2026-07-10T14:30:00+03:00"));

  // Ambiguous / free-form strings must not silently parse.
  assert.equal(parseUiDateInput("July 10, 2026"), null);
  assert.equal(parseUiDateInput("10/07/2026"), null);
  assert.equal(parseUiDateInput("10-07-2026"), null);
  assert.equal(parseUiDateInput("not-a-date"), null);
  assert.equal(parseUiDateInput(""), null);
  assert.equal(parseUiDateInput(null), null);
  assert.equal(parseUiDateInput(undefined), null);
  assert.equal(parseUiDateInput(Number.NaN), null);
  assert.equal(isFiniteNumber(12.5), true);
  assert.equal(isFiniteNumber(Number.NaN), false);
  assert.equal(isFiniteNumber(null), false);
});

test("Arabic UI date uses Arabic long month names and Western digits", () => {
  const arabic = formatUiDate("ar", JULY_10_2026);

  assertWesternDigits(arabic, "Arabic date");
  assert.match(arabic, ARABIC_MONTH_NAMES, "Arabic date must include an Arabic month name");
  assert.match(arabic, /يوليو/, "July must render as يوليو");
  assert.match(arabic, /\b10\b/, "day 10 must be present");
  assert.match(arabic, /2026/, "year 2026 must be present");
  assert.doesNotMatch(arabic, ENGLISH_MONTH_ABBREV, "Arabic date must not use English month abbreviations");
  assert.equal(arabic.includes(LRI), false, "default date output must not embed LRI markers");
  assert.equal(arabic.includes(PDI), false, "default date output must not embed PDI markers");
});

test("English UI date uses English month presentation and Western digits", () => {
  const english = formatUiDate("en", JULY_10_2026);

  assertWesternDigits(english, "English date");
  assert.match(english, /Jul/, "English date must present July as Jul");
  assert.match(english, /10/, "day 10 must be present");
  assert.match(english, /2026/, "year 2026 must be present");
  assert.doesNotMatch(english, ARABIC_MONTH_NAMES);
  assert.equal(english.includes(LRI), false);
});

test("Arabic UI date-time keeps Arabic month names with Western date/time digits", () => {
  const arabic = formatUiDateTime("ar", JULY_10_2026);

  assertWesternDigits(arabic, "Arabic date-time");
  assert.match(arabic, /يوليو/);
  assert.doesNotMatch(arabic, ENGLISH_MONTH_ABBREV);
  assert.match(arabic, /2026/);
  // Readable hour/minute present (12h clock with latn digits).
  assert.match(arabic, /[0-9]{1,2}:[0-9]{2}/);
  assert.equal(arabic.includes(LRI), false);
});

test("English UI date-time keeps coherent en-SA presentation with Western digits", () => {
  const english = formatUiDateTime("en", JULY_10_2026);

  assertWesternDigits(english, "English date-time");
  assert.match(english, /Jul/);
  assert.match(english, /2026/);
  assert.match(english, /[0-9]{1,2}:[0-9]{2}/);
});

test("formatSarAmount preserves exact SAR contract with grouping and two decimals", () => {
  const english = formatSarAmount("en", 17000);
  const arabic = formatSarAmount("ar", 17000);
  const withCents = formatSarAmount("en", 17000.5);

  assert.equal(english, "SAR 17,000.00");
  assert.equal(arabic, "SAR 17,000.00");
  assert.equal(withCents, "SAR 17,000.50");
  assertWesternDigits(english, "English SAR");
  assertWesternDigits(arabic, "Arabic SAR");
  assert.match(english, /^SAR /);
  assert.doesNotMatch(english, ARABIC_INDIC_DIGITS);
  assert.equal(english.includes(LRI), false);
  assert.equal(formatSarAmount("en", 17000, { isolate: true }), `${LRI}SAR 17,000.00${PDI}`);
});

test("formatUiNumber and formatUiQuantity keep Western digits in both locales", () => {
  const enNumber = formatUiNumber("en", 1248);
  const arNumber = formatUiNumber("ar", 1248);
  const quantity = formatUiQuantity("ar", 12.5);

  assertWesternDigits(enNumber, "English number");
  assertWesternDigits(arNumber, "Arabic number");
  assertWesternDigits(quantity, "Arabic quantity");
  assert.match(enNumber, /1[,.]?248|1248/);
  assert.match(arNumber, /1[,.]?248|1248/);
  assert.doesNotMatch(arNumber, ARABIC_INDIC_DIGITS);
});

test("formatUiPercent supports CRM percentage points with ASCII percent marker", () => {
  assert.equal(formatUiPercent("en", 15), "15%");
  assert.equal(formatUiPercent("ar", 15), "15%");
  assert.equal(formatUiPercent("en", 0.15, { valueMode: "fraction" }), "15%");
  assert.doesNotMatch(formatUiPercent("ar", 15), /٪/);
});

test("invalid and null inputs return empty fallback without inventing dates or NaN", () => {
  assert.equal(formatUiDate("en", null), UI_EMPTY_VALUE);
  assert.equal(formatUiDate("ar", "July 10, 2026"), UI_EMPTY_VALUE);
  assert.equal(formatUiDate("en", "bogus"), UI_EMPTY_VALUE);
  assert.equal(formatUiDateTime("en", undefined), UI_EMPTY_VALUE);
  assert.equal(formatSarAmount("ar", null), UI_EMPTY_VALUE);
  assert.equal(formatSarAmount("en", Number.NaN), UI_EMPTY_VALUE);
  assert.equal(formatUiNumber("en", undefined), UI_EMPTY_VALUE);
  assert.equal(formatUiPercent("ar", null), UI_EMPTY_VALUE);
  assert.equal(formatUiQuantity("en", Number.POSITIVE_INFINITY), UI_EMPTY_VALUE);

  assert.doesNotMatch(formatUiDate("en", null), /2026|NaN|Invalid/i);
  assert.doesNotMatch(formatSarAmount("en", null), /NaN/i);
  assert.equal(formatUiDate("en", null, { fallback: "N/A" }), "N/A");
  assert.equal(formatSarAmount("en", null, { fallback: "SAR 0.00" }), "SAR 0.00");
});

test("date-only YYYY-MM-DD formats as local calendar day without UTC shift", () => {
  const arabic = formatUiDate("ar", "2026-07-10");
  const english = formatUiDate("en", "2026-07-10");

  assert.match(arabic, /يوليو/);
  assert.match(arabic, /\b10\b/);
  assert.match(english, /Jul/);
  assert.match(english, /10/);
});
