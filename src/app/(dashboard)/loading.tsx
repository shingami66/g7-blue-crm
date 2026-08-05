import WorkspaceLoadingFrame from "@/components/ui/WorkspaceLoadingFrame";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";

/** Authenticated dashboard route loading state with a destination-shaped skeleton. */
export default async function DashboardLoading() {
  const locale = await getCurrentSessionEffectiveLocale();

  return <WorkspaceLoadingFrame locale={locale} />;
}
