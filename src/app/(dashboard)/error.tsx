"use client";

import { useLocale } from "@/components/i18n/LocaleProvider";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Authenticated dashboard error boundary.
 * Preserves Next.js reset() contract. Never renders the raw exception string.
 */
export default function DashboardError({ error, reset }: DashboardErrorProps) {
  // Accept the framework error prop; only safe dictionary copy is shown.
  void error;

  const locale = useLocale();
  const copy = getSharedUiStates(locale);

  return (
    <SharedAuthenticatedStatePanel
      title={copy.genericError.title}
      message={copy.genericError.message}
      role="alert"
      action={
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold leading-[20px] text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed focus-visible:ring-offset-2"
        >
          {copy.retry.tryAgain}
        </button>
      }
    />
  );
}
