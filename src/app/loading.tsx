import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getDirection } from "@/lib/i18n";
import { getPublicRequestLocale } from "@/lib/i18n/session-locale";
import PreparingWorkspace from "@/components/ui/PreparingWorkspace";

/** Minimal pre-shell state used only while the root application bootstraps. */
export default async function RootLoading() {
  const locale = await getPublicRequestLocale();
  const shared = getSharedUiStates(locale);

  return (
    <PreparingWorkspace
      message={shared.bootstrap.preparingWorkspace}
      direction={getDirection(locale)}
    />
  );
}
