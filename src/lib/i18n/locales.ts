export const SUPPORTED_LOCALES = ["en", "ar"] as const;

export type Locale = (typeof SUPPORTED_LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export function isSupportedLocale(value: string): value is Locale {
  return SUPPORTED_LOCALES.includes(value as Locale);
}

export function parseLocale(value: string | null | undefined): Locale {
  if (!value) {
    return DEFAULT_LOCALE;
  }

  const normalized = value.trim().toLowerCase();

  return isSupportedLocale(normalized) ? normalized : DEFAULT_LOCALE;
}

export function getLocale(): Locale {
  // TODO: Wire to app_users.locale once locale migration and preference read path are approved.
  return DEFAULT_LOCALE;
}
