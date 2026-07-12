import type { Locale } from "./locales";

export const DICTIONARY_FALLBACK_TIERS = ["english", "generic"] as const;

export type DictionaryFallbackTier = (typeof DICTIONARY_FALLBACK_TIERS)[number];

export interface DictionaryDefectReport {
  readonly namespace: string;
  readonly key: string;
  readonly surface: string;
  readonly locale: Locale;
  readonly fallbackTier: DictionaryFallbackTier;
}

export type DictionaryDefectReporter = (report: DictionaryDefectReport) => void;

export function reportMissingDictionaryEntry(report: DictionaryDefectReport): void {
  const boundedReport: DictionaryDefectReport = {
    namespace: report.namespace,
    key: report.key,
    surface: report.surface,
    locale: report.locale,
    fallbackTier: report.fallbackTier,
  };

  console.warn("[i18n] Missing dictionary entry", boundedReport);
}
