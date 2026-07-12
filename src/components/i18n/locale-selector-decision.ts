import type { Locale } from "../../lib/i18n/locales.ts";

export type LocaleSelectorDecisionResult =
  | {
      success: true;
      status: "persisted" | "persisted-session-pending" | "session-only";
      effectiveLocale: Locale;
    }
  | { success: false };

export function decideLocaleSelectorResult(
  result: LocaleSelectorDecisionResult,
  isRetry: boolean,
  providerLocale: Locale,
  currentLocale: Locale,
): {
  displayLocale: Locale;
  feedback: "failure" | "persistence-warning" | "persistence-pending" | null;
  shouldRefresh: boolean;
  succeeded: boolean;
} {
  if (result.success) {
    return {
      displayLocale: result.effectiveLocale,
      feedback:
        result.status === "session-only"
          ? "persistence-warning"
          : result.status === "persisted-session-pending"
            ? "persistence-pending"
            : null,
      shouldRefresh: result.status !== "persisted-session-pending",
      succeeded: true,
    };
  }

  return {
    displayLocale: isRetry ? currentLocale : providerLocale,
    feedback: isRetry ? "persistence-warning" : "failure",
    shouldRefresh: false,
    succeeded: false,
  };
}
