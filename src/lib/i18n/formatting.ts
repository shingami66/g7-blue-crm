import { isolateLtrText } from "./bidi.ts";
import type { Locale } from "./locales.ts";

/**
 * Authoritative UI formatting helpers for authenticated Arabic/English CRM surfaces.
 *
 * Locked contracts:
 * - Western digits only (`numberingSystem: "latn"`).
 * - Arabic dates use long Arabic month names (e.g. `10 يوليو 2026`) via `ar-SA` + latn.
 * - English dates use coherent en-SA business presentation (e.g. `Jul 10, 2026`).
 * - SAR UI amounts use stable `SAR 17,000.00` shape (prefix + grouping + 2 decimals).
 * - Display strings only — no mutation of stored values, no calculation changes.
 * - Prefer DOM `dir="ltr"` for LTR presentation; string isolation is opt-in only.
 * - PDF/document formatting is intentionally out of scope for this layer.
 */

export const DOCUMENT_NUMBERING_SYSTEM = "latn" as const;
export const UI_CURRENCY_SAR = "SAR" as const;
export const UI_EMPTY_VALUE = "—" as const;

/** Stable number locale for SAR amount digits/grouping (`SAR 17,000.00`). */
const SAR_AMOUNT_INTL_LOCALE = "en-SA" as const;

export const INTL_LOCALE_BY_LOCALE: Record<Locale, string> = {
  en: "en-SA",
  ar: "ar-SA",
};

/**
 * Supported UI date inputs:
 * - `Date` instance
 * - finite epoch milliseconds
 * - calendar date `YYYY-MM-DD` (local calendar day, not UTC midnight)
 * - ISO-8601 date-time strings with `T` separator
 *
 * Ambiguous free-form strings are rejected (return null → empty fallback).
 */
export type FormatDateInput = Date | string | number | null | undefined;
export type FormatNumberInput = number | null | undefined;

export type FormatUiOptions = {
  /**
   * When true, wrap the formatted value in LRI…PDI string isolation.
   * Default false — prefer semantic `dir="ltr"` at the call site.
   */
  isolate?: boolean;
  /** Fallback when the input is missing or invalid. Default: "—". */
  fallback?: string;
};

export type FormatUiDateOptions = FormatUiOptions &
  Pick<
    Intl.DateTimeFormatOptions,
    "dateStyle" | "year" | "month" | "day" | "weekday" | "era" | "calendar" | "timeZone"
  >;

export type FormatUiDateTimeOptions = FormatUiOptions &
  Pick<
    Intl.DateTimeFormatOptions,
    | "dateStyle"
    | "timeStyle"
    | "year"
    | "month"
    | "day"
    | "weekday"
    | "hour"
    | "minute"
    | "second"
    | "hour12"
    | "hourCycle"
    | "timeZone"
    | "timeZoneName"
    | "era"
    | "calendar"
  >;

export type FormatUiNumberOptions = FormatUiOptions &
  Pick<
    Intl.NumberFormatOptions,
    | "minimumFractionDigits"
    | "maximumFractionDigits"
    | "minimumIntegerDigits"
    | "useGrouping"
    | "signDisplay"
    | "notation"
  >;

export type FormatSarAmountOptions = FormatUiOptions &
  Pick<
    Intl.NumberFormatOptions,
    "minimumFractionDigits" | "maximumFractionDigits" | "useGrouping" | "signDisplay"
  >;

export type FormatUiQuantityOptions = FormatUiNumberOptions;

export type FormatUiPercentOptions = FormatUiNumberOptions & {
  /**
   * - `"points"` (default): `15` → `15%` (CRM VAT/rate convention, e.g. invoice detail)
   * - `"fraction"`: `0.15` → `15%` (Intl fraction convention)
   */
  valueMode?: "points" | "fraction";
};

const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;
const ISO_DATE_TIME =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:?\d{2})?$/;

const DEFAULT_MONEY_FRACTION_DIGITS = 2;
const DEFAULT_QUANTITY_MAX_FRACTION_DIGITS = 2;

export function getIntlLocale(locale: Locale): string {
  return INTL_LOCALE_BY_LOCALE[locale];
}

// Documents/PDFs permanently use Western digits. Future UI-only preferences, if approved,
// must not change this document rule.
export function withLatnNumberingSystem<T extends Intl.NumberFormatOptions | Intl.DateTimeFormatOptions>(
  options: T,
): T & { numberingSystem: "latn" };
export function withLatnNumberingSystem(): { numberingSystem: "latn" };
export function withLatnNumberingSystem(
  options?: Intl.NumberFormatOptions | Intl.DateTimeFormatOptions,
) {
  return {
    ...(options ?? {}),
    numberingSystem: DOCUMENT_NUMBERING_SYSTEM,
  };
}

function getDefaultDateOptions(locale: Locale): Intl.DateTimeFormatOptions {
  return {
    year: "numeric",
    // Arabic: long month names (`يوليو`). English: short business month (`Jul`).
    month: locale === "ar" ? "long" : "short",
    day: "numeric",
  };
}

function getDefaultDateTimeOptions(locale: Locale): Intl.DateTimeFormatOptions {
  return {
    ...getDefaultDateOptions(locale),
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  };
}

/**
 * Parse supported UI date inputs safely.
 * Rejects ambiguous free-form strings so callers cannot silently get machine-local junk dates.
 */
export function parseUiDateInput(value: FormatDateInput): Date | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }

  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }

  // Local calendar date — avoid UTC shift from `new Date("YYYY-MM-DD")`.
  if (ISO_DATE_ONLY.test(trimmed)) {
    const localDate = new Date(`${trimmed}T00:00:00`);
    return Number.isNaN(localDate.getTime()) ? null : localDate;
  }

  if (ISO_DATE_TIME.test(trimmed)) {
    const parsed = new Date(trimmed);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

export function isFiniteNumber(value: FormatNumberInput): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function resolveFallback(fallback?: string): string {
  return fallback ?? UI_EMPTY_VALUE;
}

function maybeIsolate(formatted: string, isolate: boolean | undefined): string {
  return isolate === true ? isolateLtrText(formatted) : formatted;
}

function omitUiOptions<T extends FormatUiOptions>(
  options: T | undefined,
): Omit<T, "isolate" | "fallback"> {
  if (!options) {
    return {} as Omit<T, "isolate" | "fallback">;
  }

  const intlOptions = { ...options };
  delete intlOptions.isolate;
  delete intlOptions.fallback;
  return intlOptions;
}

function hasExplicitDateShape(
  options: Omit<FormatUiDateOptions | FormatUiDateTimeOptions, "isolate" | "fallback">,
): boolean {
  return Object.keys(options).length > 0;
}

/**
 * Locale-aware calendar date with Western digits.
 * Arabic → long Arabic month names; English → short en-SA month.
 * Signature follows repo convention: `(locale, value, options?)`.
 */
export function formatUiDate(
  locale: Locale,
  value: FormatDateInput,
  options: FormatUiDateOptions = {},
): string {
  const parsed = parseUiDateInput(value);
  if (!parsed) {
    return resolveFallback(options.fallback);
  }

  const intlOptions = omitUiOptions(options);
  const formatOptions = hasExplicitDateShape(intlOptions)
    ? intlOptions
    : getDefaultDateOptions(locale);

  const formatted = new Intl.DateTimeFormat(
    getIntlLocale(locale),
    withLatnNumberingSystem(formatOptions),
  ).format(parsed);

  return maybeIsolate(formatted, options.isolate);
}

/**
 * Locale-aware date-time with Western digits and readable hour/minute.
 * Same month policy as `formatUiDate`; deterministic `hour12: true` defaults.
 */
export function formatUiDateTime(
  locale: Locale,
  value: FormatDateInput,
  options: FormatUiDateTimeOptions = {},
): string {
  const parsed = parseUiDateInput(value);
  if (!parsed) {
    return resolveFallback(options.fallback);
  }

  const intlOptions = omitUiOptions(options);
  const formatOptions = hasExplicitDateShape(intlOptions)
    ? intlOptions
    : getDefaultDateTimeOptions(locale);

  const formatted = new Intl.DateTimeFormat(
    getIntlLocale(locale),
    withLatnNumberingSystem(formatOptions),
  ).format(parsed);

  return maybeIsolate(formatted, options.isolate);
}

/**
 * Locale-aware number with Western digits.
 * Prefer `dir="ltr"` at the call site for Arabic layouts.
 */
export function formatUiNumber(
  locale: Locale,
  value: FormatNumberInput,
  options: FormatUiNumberOptions = {},
): string {
  if (!isFiniteNumber(value)) {
    return resolveFallback(options.fallback);
  }

  const intlOptions = omitUiOptions(options);
  const formatted = new Intl.NumberFormat(
    getIntlLocale(locale),
    withLatnNumberingSystem(intlOptions),
  ).format(value);

  return maybeIsolate(formatted, options.isolate);
}

/**
 * SAR monetary amount for UI surfaces.
 *
 * Locked shape: `SAR 17,000.00`
 * - stable ASCII `SAR` label (not localized currency symbols)
 * - Western digits and en-SA grouping/decimals
 * - exactly two fraction digits by default
 * - no rounding beyond Intl half-up for the requested fraction digits
 * - does not alter calculations or stored values
 *
 * `locale` is accepted so call sites pass the active UI locale consistently;
 * the SAR display contract is intentionally language-stable for MVP.
 */
export function formatSarAmount(
  locale: Locale,
  value: FormatNumberInput,
  options: FormatSarAmountOptions = {},
): string {
  // Keep the Locale parameter on the public surface for consistent call-site ergonomics.
  void locale;

  if (!isFiniteNumber(value)) {
    return resolveFallback(options.fallback);
  }

  const {
    minimumFractionDigits = DEFAULT_MONEY_FRACTION_DIGITS,
    maximumFractionDigits = DEFAULT_MONEY_FRACTION_DIGITS,
    useGrouping = true,
    ...rest
  } = omitUiOptions(options);

  const amount = new Intl.NumberFormat(
    SAR_AMOUNT_INTL_LOCALE,
    withLatnNumberingSystem({
      ...rest,
      minimumFractionDigits,
      maximumFractionDigits,
      useGrouping,
    }),
  ).format(value);

  return maybeIsolate(`${UI_CURRENCY_SAR} ${amount}`, options.isolate);
}

/** @deprecated Use `formatSarAmount`. Alias retained for transitional imports only. */
export const formatUiMoneySar = formatSarAmount;

/** Quantity / count values (0–2 fraction digits by default). Justified by invoice line quantities. */
export function formatUiQuantity(
  locale: Locale,
  value: FormatNumberInput,
  options: FormatUiQuantityOptions = {},
): string {
  if (!isFiniteNumber(value)) {
    return resolveFallback(options.fallback);
  }

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = DEFAULT_QUANTITY_MAX_FRACTION_DIGITS,
    ...rest
  } = omitUiOptions(options);

  const formatted = new Intl.NumberFormat(
    getIntlLocale(locale),
    withLatnNumberingSystem({
      ...rest,
      minimumFractionDigits,
      maximumFractionDigits,
    }),
  ).format(value);

  return maybeIsolate(formatted, options.isolate);
}

/**
 * Percentage for UI (VAT rates, etc.).
 * Justified by invoice detail `${vat}%` presentation.
 * Always ASCII `%` with Western digits.
 */
export function formatUiPercent(
  locale: Locale,
  value: FormatNumberInput,
  options: FormatUiPercentOptions = {},
): string {
  if (!isFiniteNumber(value)) {
    return resolveFallback(options.fallback);
  }

  const { valueMode = "points", ...restOptions } = options;
  const intlOptions = omitUiOptions(restOptions);
  const points = valueMode === "fraction" ? value * 100 : value;

  const {
    minimumFractionDigits = 0,
    maximumFractionDigits = 2,
    ...rest
  } = intlOptions;

  const formattedNumber = new Intl.NumberFormat(
    getIntlLocale(locale),
    withLatnNumberingSystem({
      ...rest,
      minimumFractionDigits,
      maximumFractionDigits,
    }),
  ).format(points);

  return maybeIsolate(`${formattedNumber}%`, options.isolate);
}
