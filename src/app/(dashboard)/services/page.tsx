import { redirect } from "next/navigation";
import { getServices } from "@/lib/services/queries";
import { checkPermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import ServicesClient from "./ServicesClient";

export const dynamic = "force-dynamic";

export default async function ServicesPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getServicesDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  let services;
  let canWrite;

  try {
    services = await getServices();
    canWrite = await checkPermission("services:write");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.servicesForbidden}
        />
      );
    }

    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.servicesLoadError}
        role="alert"
      />
    );
  }

  return <ServicesClient services={services} canWrite={canWrite} dictionary={dictionary} />;
}
