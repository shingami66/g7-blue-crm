"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import type { Locale } from "./locales";
import { localePreferenceSchema } from "./schemas";
import {
  clearCurrentSessionLocaleOverride,
  setCurrentSessionLocaleOverride,
} from "./session-locale";
import { finalizePersistedLocaleUpdate } from "./persisted-locale";

export type LocalePreferenceUpdateFailureCode =
  | "INVALID_LOCALE"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "PERSISTENCE_FAILED"
  | "RESULT_MISMATCH"
  | "UNEXPECTED_PERSISTENCE_FAILURE";

export type LocalePreferenceUpdateResult =
  | {
      success: true;
      status: "persisted";
      locale: Locale;
    }
  | {
      success: false;
      code: LocalePreferenceUpdateFailureCode;
    };

type RejectedLocalePreferenceCode = "INVALID_LOCALE" | "UNAUTHORIZED" | "FORBIDDEN";
type PersistenceState = "persisted" | "not-persisted" | "unknown";

export type LocalePreferenceBridgeResult =
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
    }
  | {
      success: true;
      status: "session-only";
      persistenceState: "not-persisted";
      requestedLocale: Locale;
      effectiveLocale: Locale;
      code: "PERSISTENCE_FAILED";
    }
  | {
      success: true;
      status: "session-only";
      persistenceState: "unknown";
      requestedLocale: Locale;
      effectiveLocale: Locale;
      code: "RESULT_MISMATCH";
    }
  | {
      success: false;
      status: "rejected";
      code: RejectedLocalePreferenceCode;
    }
  | {
      success: false;
      status: "bridge-failed";
      code: "SESSION_OVERRIDE_FAILED";
      persistenceState: Exclude<PersistenceState, "persisted">;
      requestedLocale: Locale;
    }
  | {
      success: false;
      status: "bridge-failed";
      code: "UNEXPECTED_BRIDGE_FAILURE";
      persistenceState: "unknown";
      requestedLocale: Locale;
    };

export async function updateCurrentUserLocale(
  input: unknown,
): Promise<LocalePreferenceUpdateResult> {
  const parsed = localePreferenceSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, code: "INVALID_LOCALE" };
  }

  try {
    const currentUser = await requirePermission("dashboard:read");
    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("app_users")
      .update({ locale: parsed.data })
      .eq("id", currentUser.id)
      .select("id, locale");

    if (error) {
      console.error("[updateCurrentUserLocale] Persistence failed");
      return { success: false, code: "PERSISTENCE_FAILED" };
    }

    if (
      !data ||
      data.length !== 1 ||
      data[0]?.id !== currentUser.id ||
      data[0]?.locale !== parsed.data
    ) {
      console.error("[updateCurrentUserLocale] Persisted result mismatch");
      return { success: false, code: "RESULT_MISMATCH" };
    }

    return {
      success: true,
      status: "persisted",
      locale: parsed.data,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return { success: false, code: "UNAUTHORIZED" };
    }

    if (error instanceof ForbiddenError) {
      return { success: false, code: "FORBIDDEN" };
    }

    console.error("[updateCurrentUserLocale] Unexpected failure");
    return { success: false, code: "UNEXPECTED_PERSISTENCE_FAILURE" };
  }
}

export async function applyCurrentUserLocalePreference(
  input: unknown,
): Promise<LocalePreferenceBridgeResult> {
  const parsed = localePreferenceSchema.safeParse(input);

  if (!parsed.success) {
    return { success: false, status: "rejected", code: "INVALID_LOCALE" };
  }

  let persistenceResult: LocalePreferenceUpdateResult;

  try {
    persistenceResult = await updateCurrentUserLocale(parsed.data);
  } catch {
    console.error("[applyCurrentUserLocalePreference] Persistence bridge failed");
    return {
      success: false,
      status: "bridge-failed",
      code: "UNEXPECTED_BRIDGE_FAILURE",
      persistenceState: "unknown",
      requestedLocale: parsed.data,
    };
  }

  if (persistenceResult.success) {
    return finalizePersistedLocaleUpdate(
      persistenceResult.locale,
      clearCurrentSessionLocaleOverride,
      setCurrentSessionLocaleOverride,
    );
  }

  if (persistenceResult.code === "UNEXPECTED_PERSISTENCE_FAILURE") {
    return {
      success: false,
      status: "bridge-failed",
      code: "UNEXPECTED_BRIDGE_FAILURE",
      persistenceState: "unknown",
      requestedLocale: parsed.data,
    };
  }

  if (persistenceResult.code === "PERSISTENCE_FAILED") {
    try {
      await setCurrentSessionLocaleOverride(parsed.data);
    } catch {
      console.error("[applyCurrentUserLocalePreference] Session override creation failed");
      return {
        success: false,
        status: "bridge-failed",
        code: "SESSION_OVERRIDE_FAILED",
        persistenceState: "not-persisted",
        requestedLocale: parsed.data,
      };
    }

    return {
      success: true,
      status: "session-only",
      persistenceState: "not-persisted",
      requestedLocale: parsed.data,
      effectiveLocale: parsed.data,
      code: "PERSISTENCE_FAILED",
    };
  }

  if (persistenceResult.code === "RESULT_MISMATCH") {
    try {
      await setCurrentSessionLocaleOverride(parsed.data);
    } catch {
      console.error("[applyCurrentUserLocalePreference] Session override creation failed");
      return {
        success: false,
        status: "bridge-failed",
        code: "SESSION_OVERRIDE_FAILED",
        persistenceState: "unknown",
        requestedLocale: parsed.data,
      };
    }

    return {
      success: true,
      status: "session-only",
      persistenceState: "unknown",
      requestedLocale: parsed.data,
      effectiveLocale: parsed.data,
      code: "RESULT_MISMATCH",
    };
  }

  return {
    success: false,
    status: "rejected",
    code: persistenceResult.code,
  };
}
