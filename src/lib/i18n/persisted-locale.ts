import type { Locale } from "./locales.ts";

export type PersistedLocaleSuccess =
  | {
      success: true;
      status: "persisted";
      persistenceState: "persisted";
      requestedLocale: Locale;
      effectiveLocale: Locale;
      sessionReconciliation: "complete";
    }
  | {
      success: true;
      status: "persisted-session-pending";
      persistenceState: "persisted";
      requestedLocale: Locale;
      effectiveLocale: Locale;
      sessionReconciliation: "pending";
    };

export async function finalizePersistedLocaleUpdate(
  locale: Locale,
  clearOverride: () => Promise<void>,
  setOverride: (locale: Locale) => Promise<void>,
): Promise<PersistedLocaleSuccess> {
  try {
    await clearOverride();
  } catch {
    try {
      await setOverride(locale);
      return {
        success: true,
        status: "persisted",
        persistenceState: "persisted",
        requestedLocale: locale,
        effectiveLocale: locale,
        sessionReconciliation: "complete",
      };
    } catch {
      return {
        success: true,
        status: "persisted-session-pending",
        persistenceState: "persisted",
        requestedLocale: locale,
        effectiveLocale: locale,
        sessionReconciliation: "pending",
      };
    }
  }

  return {
    success: true,
    status: "persisted",
    persistenceState: "persisted",
    requestedLocale: locale,
    effectiveLocale: locale,
    sessionReconciliation: "complete",
  };
}
