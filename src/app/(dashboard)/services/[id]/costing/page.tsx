import { notFound, redirect } from "next/navigation";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import { getEventCostingResult } from "@/lib/event-costing/queries";
import { getEventCostCloseStatus } from "@/lib/event-cost-close/queries";
import { EVENT_COST_CLOSE_PERMISSIONS } from "@/lib/auth/role-permissions";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import EventCostingWorkspace from "./EventCostingWorkspace";

export const dynamic = "force-dynamic";

export default async function EventCostingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ result?: string; error?: string }>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getServicesDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  const { id } = await params;
  const query = await searchParams;

  try {
    await requirePermission("services:read");
    await requirePermission("supplier_costing:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) {
      return <SharedAuthenticatedStatePanel title={sharedStates.accessDenied.title} message={dictionary.eventCosting.permissionDenied} />;
    }
    return <SharedAuthenticatedStatePanel title={sharedStates.genericError.title} message={dictionary.eventCosting.unavailable} role="alert" />;
  }

  const [service, costingResult, closeResult, canCloseEventCost, canReopenEventCost] = await Promise.all([
    getServiceById(id),
    getEventCostingResult(id),
    getEventCostCloseStatus(id),
    checkPermission(EVENT_COST_CLOSE_PERMISSIONS.close),
    checkPermission(EVENT_COST_CLOSE_PERMISSIONS.reopen),
  ]);
  if (!service) notFound();
  if (costingResult.status === "error") {
    return <SharedAuthenticatedStatePanel title={sharedStates.genericError.title} message={dictionary.eventCosting.unavailable} role="alert" />;
  }
  if (closeResult.status === "error") {
    return <SharedAuthenticatedStatePanel title={sharedStates.genericError.title} message={dictionary.eventCosting.costClose.error} role="alert" />;
  }

  const resultMessage = query.result === "budget_saved"
    ? dictionary.eventCosting.forms.budgetSaved
    : query.result === "etc_saved"
      ? dictionary.eventCosting.forms.etcSaved
      : query.result === "event_cost_closed"
        ? dictionary.eventCosting.costClose.closeAction
        : query.result === "event_cost_reopened"
          ? dictionary.eventCosting.costClose.reopenAction
      : undefined;
  const errorMessage = query.error ? dictionary.eventCosting.forms.errors[query.error] ?? dictionary.eventCosting.costClose.error : undefined;

  return <EventCostingWorkspace service={service} model={costingResult.data} dictionary={dictionary} resultMessage={resultMessage} errorMessage={errorMessage} closeStatus={closeResult.data} canCloseEventCost={canCloseEventCost} canReopenEventCost={canReopenEventCost} />;
}
