"use client";

import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";

type GlobalErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Root recovery boundary for unexpected root layout or root-level application errors.
 * Preserves the Next.js reset() contract without leaking raw exception strings or
 * converting dependency failures into misleading unauthorized states.
 */
export default function GlobalError({ error, reset }: GlobalErrorProps) {
  void error;

  const copy = getSharedUiStates("en");

  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-surface">
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
      </body>
    </html>
  );
}
