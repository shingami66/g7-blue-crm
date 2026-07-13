"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import { useGlobalPending } from "@/components/ui/GlobalPendingProvider";
import { applyCurrentUserLocalePreference } from "@/lib/i18n/actions";
import {
  getSharedUiStates,
  localeSelectorDictionaryAr,
  localeSelectorDictionaryEn,
} from "@/lib/i18n/dictionaries/common";
import { getOppositeLocale, type Locale } from "@/lib/i18n/locales";
import { useLocale } from "./LocaleProvider";
import { decideLocaleSelectorResult } from "./locale-selector-decision";

type LocaleSelectorFeedback = "failure" | "persistence-warning" | "persistence-pending" | null;

export function LocaleSelector() {
  const providerLocale = useLocale();
  const router = useRouter();
  const { showPending, hidePending } = useGlobalPending();
  const submissionInFlight = useRef(false);
  const pendingIdRef = useRef<symbol | null>(null);
  const awaitingLocaleRef = useRef<Locale | null>(null);
  const [optimisticLocale, setOptimisticLocale] = useState<Locale | null>(null);
  const [seenProviderLocale, setSeenProviderLocale] = useState(providerLocale);
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<LocaleSelectorFeedback>(null);

  // When the authenticated layout/provider locale changes (refresh or external update),
  // drop any local optimistic override so display follows the trusted provider value.
  if (providerLocale !== seenProviderLocale) {
    setSeenProviderLocale(providerLocale);
    setOptimisticLocale(null);
  }

  function clearPendingSafely() {
    if (pendingIdRef.current != null) {
      hidePending(pendingIdRef.current);
      pendingIdRef.current = null;
    }
    awaitingLocaleRef.current = null;
    submissionInFlight.current = false;
  }

  // Keep the global bolt active through preference update + router.refresh().
  // Clear only after the provider/locale contract observes the requested locale
  // (not merely because refresh was invoked).
  useEffect(() => {
    const awaited = awaitingLocaleRef.current;
    if (awaited != null && providerLocale === awaited) {
      clearPendingSafely();
    }
    // clearPendingSafely closes over hidePending; re-run when locale or hidePending changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional locale observation
  }, [providerLocale, hidePending]);

  const displayLocale = optimisticLocale ?? providerLocale;
  const copy =
    displayLocale === "ar"
      ? localeSelectorDictionaryAr
      : localeSelectorDictionaryEn;
  const targetLocale = getOppositeLocale(displayLocale);
  const targetLabel =
    targetLocale === "ar" ? copy.switchToArabic : copy.switchToEnglish;
  const statusId = "topbar-locale-status";
  const feedbackId = "topbar-locale-feedback";

  function applyDecisionDisplayLocale(
    nextDisplayLocale: Locale,
    providerSnapshot: Locale,
  ) {
    setOptimisticLocale(
      nextDisplayLocale === providerSnapshot ? null : nextDisplayLocale,
    );
  }

  function submitLocalePreference(requestedLocale: Locale, isRetry = false) {
    if (submissionInFlight.current) {
      return;
    }

    const providerSnapshot = providerLocale;
    const baselineDisplayLocale = optimisticLocale ?? providerLocale;
    setOptimisticLocale(requestedLocale);
    if (!isRetry) {
      setFeedback(null);
    }
    submissionInFlight.current = true;
    // Existing global centered bolt only — no local button spinner or pending text.
    const pendingId = showPending(getSharedUiStates(providerLocale).loading.label);
    pendingIdRef.current = pendingId;
    awaitingLocaleRef.current = null;

    startTransition(async () => {
      try {
        let actionResult: Parameters<typeof decideLocaleSelectorResult>[0];
        try {
          actionResult = await applyCurrentUserLocalePreference(requestedLocale);
        } catch {
          // Thrown action failures share the same pure decision path as typed failures.
          actionResult = { success: false };
        }

        const decision = decideLocaleSelectorResult(
          actionResult,
          isRetry,
          providerSnapshot,
          baselineDisplayLocale,
        );

        applyDecisionDisplayLocale(decision.displayLocale, providerSnapshot);
        setFeedback(decision.feedback);

        if (decision.shouldRefresh) {
          // Hold bolt until providerLocale reflects the requested locale after refresh.
          awaitingLocaleRef.current = requestedLocale;
          router.refresh();
          // If provider already matches (e.g. same-locale edge), clear immediately.
          if (providerLocale === requestedLocale) {
            clearPendingSafely();
          }
          return;
        }

        // No refresh path (error, or session-pending): clear bolt safely now.
        clearPendingSafely();
      } catch {
        clearPendingSafely();
      }
    });
  }

  function handleToggle() {
    if (isPending || submissionInFlight.current) {
      return;
    }

    const requestedLocale = getOppositeLocale(providerLocale);
    if (requestedLocale === providerLocale) {
      return;
    }

    submitLocalePreference(requestedLocale);
  }

  function handleRetry() {
    if (isPending || submissionInFlight.current) {
      return;
    }

    // Retry the currently displayed/selected locale (accepted retry contract).
    submitLocalePreference(displayLocale, true);
  }

  const showWarning =
    feedback === "persistence-warning" || feedback === "persistence-pending";
  const showFailure = feedback === "failure";

  return (
    <div className="relative flex max-w-[11rem] flex-col items-stretch sm:max-w-none">
      <button
        type="button"
        aria-busy={isPending || undefined}
        aria-controls={showWarning || showFailure ? feedbackId : undefined}
        aria-describedby={statusId}
        aria-label={`${copy.label}: ${targetLabel}`}
        className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-outline-variant bg-surface-container-low px-2.5 py-1.5 text-[12px] leading-[16px] font-medium text-on-surface transition-colors hover:bg-surface-container hover:text-primary focus:outline-none focus:ring-2 focus:ring-tertiary-fixed disabled:cursor-not-allowed disabled:opacity-60"
        disabled={isPending}
        onClick={handleToggle}
      >
        <Globe aria-hidden className="size-4 shrink-0 text-on-surface-variant" size={16} />
        <span
          className="max-w-[7.5rem] truncate sm:max-w-none"
          dir={targetLocale === "ar" ? "rtl" : "ltr"}
          lang={targetLocale}
        >
          {targetLabel}
        </span>
      </button>

      <span aria-live="polite" className="sr-only" id={statusId}>
        {isPending ? getSharedUiStates(providerLocale).loading.label : ""}
      </span>

      {showWarning ? (
        <div
          aria-live="assertive"
          className="absolute top-full z-50 mt-1 w-56 rounded-md border border-error/30 bg-surface-container-lowest p-2 text-[11px] leading-[15px] text-error shadow-lg sm:w-64"
          id={feedbackId}
          role="alert"
          style={{ insetInlineEnd: 0 }}
        >
          <p>
            {feedback === "persistence-pending"
              ? copy.persistencePending
              : copy.persistenceWarning}
          </p>
          <button
            type="button"
            aria-label={copy.retry}
            className="mt-1 underline focus:outline-none focus:ring-2 focus:ring-tertiary-fixed disabled:opacity-60"
            disabled={isPending}
            onClick={handleRetry}
          >
            {copy.retry}
          </button>
        </div>
      ) : showFailure ? (
        <div
          aria-live="assertive"
          className="absolute top-full z-50 mt-1 w-56 rounded-md border border-error/30 bg-surface-container-lowest p-2 text-[11px] leading-[15px] text-error shadow-lg sm:w-64"
          id={feedbackId}
          role="alert"
          style={{ insetInlineEnd: 0 }}
        >
          <p>{copy.failure}</p>
          <button
            type="button"
            aria-label={copy.retry}
            className="mt-1 underline focus:outline-none focus:ring-2 focus:ring-tertiary-fixed disabled:opacity-60"
            disabled={isPending}
            onClick={() => {
              if (isPending || submissionInFlight.current) {
                return;
              }
              // After initial failure, display is restored to provider; retry the opposite again.
              submitLocalePreference(getOppositeLocale(providerLocale), false);
            }}
          >
            {copy.retry}
          </button>
        </div>
      ) : null}
    </div>
  );
}
