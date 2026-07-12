import type { Metadata } from "next";
import { SignOutButton } from "@clerk/nextjs";
import { getDirection } from "@/lib/i18n";
import { getUnauthorizedDictionary } from "@/lib/i18n/dictionaries/unauthorized";
import { getPublicRequestLocale } from "@/lib/i18n/session-locale";

export async function generateMetadata(): Promise<Metadata> {
  const locale = await getPublicRequestLocale();
  const dictionary = getUnauthorizedDictionary(locale);
  return {
    title: dictionary.metaTitle,
  };
}

/**
 * Access-pending surface for signed-in users who are inactive / not approved.
 * Outside the authenticated dashboard shell. Locale from public/cookie authority only.
 */
export default async function UnauthorizedPage() {
  const locale = await getPublicRequestLocale();
  const dictionary = getUnauthorizedDictionary(locale);
  const direction = getDirection(locale);

  return (
    <div
      className="min-h-screen bg-primary flex items-center justify-center p-4"
      dir={direction}
      lang={locale}
    >
      <div className="w-full max-w-md text-center">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-on-primary mb-2">
            {dictionary.brandMark}
          </h1>
          <div className="w-12 h-0.5 bg-tertiary-fixed-dim mx-auto" />
        </div>

        <div className="bg-surface-container-lowest rounded-xl shadow-lg p-8">
          <div className="w-14 h-14 rounded-full bg-tertiary-fixed flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-7 h-7 text-tertiary"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
              />
            </svg>
          </div>

          <h2 className="text-lg font-semibold text-on-surface mb-2">
            {dictionary.title}
          </h2>
          <p className="text-sm text-on-surface-variant mb-6 leading-relaxed">
            {dictionary.body}
          </p>

          <SignOutButton redirectUrl="/sign-in">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-on-primary hover:bg-primary-container transition-colors"
            >
              {dictionary.signOut}
            </button>
          </SignOutButton>
        </div>

        <p className="mt-6 text-xs text-on-primary/60">{dictionary.footer}</p>
      </div>
    </div>
  );
}
