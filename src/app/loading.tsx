import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getDirection } from "@/lib/i18n";
import { getPublicRequestLocale } from "@/lib/i18n/session-locale";

/** Minimal pre-shell state used only while the root application bootstraps. */
export default async function RootLoading() {
  const locale = await getPublicRequestLocale();
  const shared = getSharedUiStates(locale);

  return (
    <main
      aria-busy="true"
      className="flex min-h-screen items-center justify-center bg-surface px-6 text-center"
      dir={getDirection(locale)}
      lang={locale}
    >
      <div className="space-y-4">
        <div
          aria-hidden="true"
          className="text-xl font-semibold tracking-[0.18em] text-primary"
        >
          G7 BLUE
        </div>
        <p aria-live="polite" role="status" className="text-sm text-on-surface-variant">
          {shared.bootstrap.preparingWorkspace}
        </p>
      </div>
    </main>
  );
}
