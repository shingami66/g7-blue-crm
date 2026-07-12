import Link from "next/link";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";

/**
 * Authenticated dashboard not-found state.
 * Keeps not-found semantics (not access-denied / not generic error).
 */
export default async function DashboardNotFound() {
  const locale = await getCurrentSessionEffectiveLocale();
  const copy = getSharedUiStates(locale);

  return (
    <SharedAuthenticatedStatePanel
      title={copy.notFound.title}
      message={copy.notFound.message}
      action={
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-[14px] font-semibold leading-[20px] text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed focus-visible:ring-offset-2"
        >
          {copy.retry.goBack}
        </Link>
      }
    />
  );
}
