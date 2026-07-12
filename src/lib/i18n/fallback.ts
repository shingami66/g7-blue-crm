import {
  reportMissingDictionaryEntry,
  type DictionaryDefectReporter,
  type DictionaryFallbackTier,
} from "./reporting.ts";
import type { Locale } from "./locales";

export type DictionaryFallbackCategory = "action" | "content" | "field" | "label" | "message";

export interface DictionaryLookupInput {
  activeValue: unknown;
  category: DictionaryFallbackCategory;
  englishValue: unknown;
  key: string;
  locale: Locale;
  namespace: string;
  reporter?: DictionaryDefectReporter;
  surface: string;
}

const genericFallbacks: Record<Locale, Record<DictionaryFallbackCategory, string>> = {
  en: {
    action: "Unavailable action",
    content: "Unavailable content",
    field: "Unavailable field",
    label: "Unavailable label",
    message: "Something went wrong",
  },
  ar: {
    action: "إجراء غير متاح",
    content: "محتوى غير متاح",
    field: "حقل غير متاح",
    label: "تسمية غير متاحة",
    message: "حدث خطأ ما",
  },
};

function usableDictionaryValue(value: unknown, key: string): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.trim() !== key;
}

function reportFallback(input: DictionaryLookupInput, fallbackTier: DictionaryFallbackTier): void {
  const reporter = input.reporter ?? reportMissingDictionaryEntry;

  try {
    reporter({
      namespace: input.namespace,
      key: input.key,
      surface: input.surface,
      locale: input.locale,
      fallbackTier,
    });
  } catch {
    // Reporting is quality metadata only; fallback rendering must remain available.
  }
}

export function resolveDictionaryValue(input: DictionaryLookupInput): string {
  const { activeValue, category, englishValue, key, locale } = input;

  if (usableDictionaryValue(activeValue, key)) {
    return activeValue.trim();
  }

  if (usableDictionaryValue(englishValue, key)) {
    reportFallback(input, "english");
    return englishValue.trim();
  }

  reportFallback(input, "generic");
  return genericFallbacks[locale][category];
}
