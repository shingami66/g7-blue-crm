import type { Locale } from "./locales.ts";

export const DOCUMENT_NUMBERING_SYSTEM = "latn" as const;

export const INTL_LOCALE_BY_LOCALE: Record<Locale, string> = {
  en: "en-SA",
  ar: "ar-SA",
};

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
