import type { Locale } from "./locales";

const ARABIC_SCRIPT_REGEX = /[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF\uFB50-\uFDFF\uFE70-\uFEFF]/;
const LATIN_SCRIPT_REGEX = /[A-Za-z]/;

export interface LocalizedRecordTitleFields {
  en?: string | null;
  ar?: string | null;
}

/**
 * Resolves a legacy composed title string ONLY when:
 * - The delimiter is exactly " | "
 * - Exactly two parts exist (not multiple delimiters)
 * - One part clearly contains Arabic script
 * - The other part clearly contains Latin script
 *
 * If any condition fails (ambiguous, multiple delimiters, neither or both have the scripts),
 * returns null so the original source value is preserved unchanged.
 */
export function parseLegacyComposedTitle(
  value: string,
): { en: string; ar: string } | null {
  if (!value || typeof value !== "string") return null;

  const parts = value.split(" | ");
  if (parts.length !== 2) {
    return null;
  }

  const part0 = parts[0].trim();
  const part1 = parts[1].trim();
  if (!part0 || !part1) return null;

  const part0HasArabic = ARABIC_SCRIPT_REGEX.test(part0);
  const part0HasLatin = LATIN_SCRIPT_REGEX.test(part0);
  const part1HasArabic = ARABIC_SCRIPT_REGEX.test(part1);
  const part1HasLatin = LATIN_SCRIPT_REGEX.test(part1);

  if (part0HasLatin && !part0HasArabic && part1HasArabic && !part1HasLatin) {
    return { en: part0, ar: part1 };
  }
  if (part0HasArabic && !part0HasLatin && part1HasLatin && !part1HasArabic) {
    return { en: part1, ar: part0 };
  }

  return null;
}

/**
 * Authoritative record title resolver for known record title/display contexts.
 * Precedence:
 * a. Explicit localized record fields, when they exist.
 * b. A narrowly scoped legacy composed-title fallback only in known record-title contexts.
 * c. Original source value unchanged.
 */
export function resolveRecordTitle(
  locale: Locale,
  primaryValue?: string | null,
  secondaryValue?: string | null,
  explicitFields?: LocalizedRecordTitleFields | null,
): string {
  // Precedence a: Explicit localized record fields, when they exist.
  if (explicitFields) {
    const target = locale === "ar" ? explicitFields.ar : explicitFields.en;
    if (target && target.trim().length > 0) {
      return target.trim();
    }
    const fallback = locale === "ar" ? explicitFields.en : explicitFields.ar;
    if (fallback && fallback.trim().length > 0) {
      return fallback.trim();
    }
  }

  const primary = primaryValue?.trim() ?? "";
  const secondary = secondaryValue?.trim() ?? "";

  // If both primary and secondary values exist as an explicit language pair
  // (e.g. serviceTitle in English and eventName in Arabic):
  if (primary && secondary) {
    const primaryArabic = ARABIC_SCRIPT_REGEX.test(primary) && !LATIN_SCRIPT_REGEX.test(primary);
    const primaryLatin = LATIN_SCRIPT_REGEX.test(primary) && !ARABIC_SCRIPT_REGEX.test(primary);
    const secondaryArabic = ARABIC_SCRIPT_REGEX.test(secondary) && !LATIN_SCRIPT_REGEX.test(secondary);
    const secondaryLatin = LATIN_SCRIPT_REGEX.test(secondary) && !ARABIC_SCRIPT_REGEX.test(secondary);

    if (primaryLatin && secondaryArabic) {
      return locale === "ar" ? secondary : primary;
    }
    if (primaryArabic && secondaryLatin) {
      return locale === "ar" ? primary : secondary;
    }
  }

  // Precedence b: Narrowly scoped legacy composed-title fallback in primary value
  if (primary) {
    const legacyComposed = parseLegacyComposedTitle(primary);
    if (legacyComposed) {
      return locale === "ar" ? legacyComposed.ar : legacyComposed.en;
    }
    // Precedence c: Original source value unchanged
    return primary;
  }

  // If primary was empty, check secondary
  if (secondary) {
    const legacyComposed = parseLegacyComposedTitle(secondary);
    if (legacyComposed) {
      return locale === "ar" ? legacyComposed.ar : legacyComposed.en;
    }
    return secondary;
  }

  return "";
}

/**
 * Resolves an explicit localized record value pair ({ en, ar }) without concatenation.
 */
export function resolveLocalizedRecordValue(
  locale: Locale,
  values?: LocalizedRecordTitleFields | null,
  fallback = "",
): string {
  if (!values) return fallback;
  const target = locale === "ar" ? values.ar : values.en;
  if (target && target.trim().length > 0) {
    return target.trim();
  }
  const alt = locale === "ar" ? values.en : values.ar;
  if (alt && alt.trim().length > 0) {
    return alt.trim();
  }
  return fallback;
}
