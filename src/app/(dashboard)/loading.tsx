import CenterPendingBolt from "@/components/ui/CenterPendingBolt";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";

/**
 * Authenticated dashboard route loading state.
 * Visual pending bolt is unchanged; only the screen-reader label is localized.
 */
export default async function DashboardLoading() {
  const locale = await getCurrentSessionEffectiveLocale();
  const label = getSharedUiStates(locale).loading.label;

  return <CenterPendingBolt label={label} />;
}
