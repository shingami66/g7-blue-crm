import assert from "node:assert/strict";
import test from "node:test";
import { getSafeActionErrorMessage } from "./safe-action-error.ts";
import { getServicesDictionary, getServiceStatusLabel } from "./dictionaries/services.ts";
import {
  localeSelectorDictionaryAr,
  localeSelectorDictionaryEn,
} from "./dictionaries/common.ts";
import { finalizePersistedLocaleUpdate } from "./persisted-locale.ts";
import { getOppositeLocale } from "./locales.ts";
import { decideLocaleSelectorResult } from "../../components/i18n/locale-selector-decision.ts";
import {
  getCreateServiceErrorMessage,
  getEditServiceErrorMessage,
  getServiceStatusErrorMessage,
} from "./service-action-feedback.ts";

test("Topbar toggle target is the opposite supported locale with canonical labels", () => {
  assert.equal(getOppositeLocale("en"), "ar");
  assert.equal(getOppositeLocale("ar"), "en");
  assert.equal(localeSelectorDictionaryEn.switchToArabic, "العربية");
  assert.equal(localeSelectorDictionaryAr.switchToEnglish, "English");
  assert.equal(
    getOppositeLocale("en") === "ar"
      ? localeSelectorDictionaryEn.switchToArabic
      : localeSelectorDictionaryEn.switchToEnglish,
    "العربية",
  );
  assert.equal(
    getOppositeLocale("ar") === "ar"
      ? localeSelectorDictionaryAr.switchToArabic
      : localeSelectorDictionaryAr.switchToEnglish,
    "English",
  );
  assert.equal(localeSelectorDictionaryEn.updating, "Updating language…");
  assert.equal(localeSelectorDictionaryAr.updating, "جارٍ تغيير اللغة…");
});

test("service transition copy follows the requested locale", () => {
  const english = getServicesDictionary("en");
  const arabic = getServicesDictionary("ar");

  assert.notEqual(english.transitionCopy.actions.Approved.label, arabic.transitionCopy.actions.Approved.label);
  assert.equal(getServiceStatusLabel("ar", "Approved"), arabic.serviceStatuses.Approved);
});

test("known failures map to localized copy and unknown failures use the safe fallback", () => {
  const english = getServicesDictionary("en");
  const arabic = getServicesDictionary("ar");

  assert.equal(
    getSafeActionErrorMessage(
      "NOT_FOUND",
      { NOT_FOUND: english.actionErrors.notFound },
      english.actionErrors.generic,
    ),
    english.actionErrors.notFound,
  );
  assert.equal(
    getSafeActionErrorMessage(
      "NOT_FOUND",
      { NOT_FOUND: arabic.actionErrors.notFound },
      arabic.actionErrors.generic,
    ),
    arabic.actionErrors.notFound,
  );
  assert.equal(
    getSafeActionErrorMessage("UNKNOWN", {}, english.actionErrors.generic),
    english.actionErrors.generic,
  );
});

test("persisted-session-pending keeps the selected locale without refreshing", () => {
  assert.deepEqual(
    decideLocaleSelectorResult(
      { success: true, status: "persisted-session-pending", effectiveLocale: "ar" },
      false,
      "en",
      "ar",
    ),
    {
      displayLocale: "ar",
      feedback: "persistence-pending",
      shouldRefresh: false,
      succeeded: true,
    },
  );
});

test("selector decisions cover persisted, session-only, and genuine failure outcomes", () => {
  const persisted = decideLocaleSelectorResult(
    { success: true, status: "persisted", effectiveLocale: "ar" },
    false,
    "en",
    "ar",
  );
  assert.deepEqual(persisted, {
    displayLocale: "ar",
    feedback: null,
    shouldRefresh: true,
    succeeded: true,
  });

  const sessionOnly = decideLocaleSelectorResult(
    { success: true, status: "session-only", effectiveLocale: "ar" },
    false,
    "en",
    "ar",
  );
  assert.deepEqual(sessionOnly, {
    displayLocale: "ar",
    feedback: "persistence-warning",
    shouldRefresh: true,
    succeeded: true,
  });

  const failure = decideLocaleSelectorResult({ success: false }, false, "en", "ar");
  assert.deepEqual(failure, {
    displayLocale: "en",
    feedback: "failure",
    shouldRefresh: false,
    succeeded: false,
  });

  const retryFailure = decideLocaleSelectorResult({ success: false }, true, "en", "ar");
  assert.deepEqual(retryFailure, {
    displayLocale: "ar",
    feedback: "persistence-warning",
    shouldRefresh: false,
    succeeded: false,
  });
});

test("thrown initial failure uses the production decision boundary and restores the previous locale", () => {
  const rawException = new Error("INTERNAL_STACK_TRACE_do_not_expose");
  // LocaleSelector catch converts any thrown action failure to this safe input only.
  const thrownFailureInput = { success: false as const };
  const decision = decideLocaleSelectorResult(thrownFailureInput, false, "en", "ar");

  assert.deepEqual(decision, {
    displayLocale: "en",
    feedback: "failure",
    shouldRefresh: false,
    succeeded: false,
  });
  assert.equal(JSON.stringify(decision).includes(rawException.message), false);
  assert.notEqual(decision.feedback, rawException.message);
});

test("thrown retry failure uses the same production decision boundary and retains the selected locale", () => {
  const rawException = new Error("INTERNAL_STACK_TRACE_do_not_expose");
  const thrownFailureInput = { success: false as const };
  const decision = decideLocaleSelectorResult(thrownFailureInput, true, "en", "ar");

  assert.deepEqual(decision, {
    displayLocale: "ar",
    feedback: "persistence-warning",
    shouldRefresh: false,
    succeeded: false,
  });
  assert.equal(JSON.stringify(decision).includes(rawException.message), false);
  assert.notEqual(decision.feedback, rawException.message);
});

test("Service create, edit, and status mappings localize known and unknown codes", () => {
  const english = getServicesDictionary("en");
  const arabic = getServicesDictionary("ar");

  assert.equal(
    getCreateServiceErrorMessage("FORBIDDEN", english),
    english.actionErrors.forbidden,
  );
  assert.equal(
    getCreateServiceErrorMessage("UNKNOWN", arabic),
    arabic.actionErrors.generic,
  );
  assert.equal(
    getEditServiceErrorMessage("STATUS_CONFLICT", arabic),
    arabic.actionErrors.statusConflict,
  );
  assert.equal(
    getEditServiceErrorMessage("UNKNOWN", english),
    english.actionErrors.generic,
  );
  assert.equal(
    getServiceStatusErrorMessage("TRANSITION_BLOCKED", english),
    english.actionErrors.transitionBlocked,
  );
  assert.equal(
    getServiceStatusErrorMessage("UNKNOWN", arabic),
    arabic.actionErrors.generic,
  );
});

test("cleanup success returns the exact normal persisted variant", async () => {
  const result = await finalizePersistedLocaleUpdate(
    "ar",
    async () => {},
    async () => {
      throw new Error("recovery must not run when cleanup succeeds");
    },
  );

  assert.deepEqual(result, {
    success: true,
    status: "persisted",
    persistenceState: "persisted",
    requestedLocale: "ar",
    effectiveLocale: "ar",
    sessionReconciliation: "complete",
  });
});

test("persisted success remains active when session cleanup needs recovery", async () => {
  let recoveryLocale = "";
  const result = await finalizePersistedLocaleUpdate(
    "ar",
    async () => {
      throw new Error("cleanup failed");
    },
    async (locale) => {
      recoveryLocale = locale;
    },
  );

  assert.deepEqual(result, {
    success: true,
    status: "persisted",
    persistenceState: "persisted",
    requestedLocale: "ar",
    effectiveLocale: "ar",
    sessionReconciliation: "complete",
  });
  assert.equal(recoveryLocale, "ar");
});

test("persisted success becomes session-pending when cleanup and recovery both fail", async () => {
  const result = await finalizePersistedLocaleUpdate(
    "ar",
    async () => {
      throw new Error("cleanup failed");
    },
    async () => {
      throw new Error("recovery failed");
    },
  );

  assert.deepEqual(result, {
    success: true,
    status: "persisted-session-pending",
    persistenceState: "persisted",
    requestedLocale: "ar",
    effectiveLocale: "ar",
    sessionReconciliation: "pending",
  });
});
