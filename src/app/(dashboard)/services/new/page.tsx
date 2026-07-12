import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getCustomers } from "@/lib/customers/queries";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import ServiceForm from "./ServiceForm";

export const dynamic = "force-dynamic";

export default async function NewServicePage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getServicesDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  let activeCustomers;

  try {
    await requirePermission("services:write");
    const allCustomers = await getCustomers();
    // Filter out inactive/lead/archived
    activeCustomers = allCustomers.filter((c) => c.status === "active");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.createForbidden}
        />
      );
    }

    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.serviceDataLoadError}
        role="alert"
      />
    );
  }

  return (
    <div className="flex flex-col h-full max-w-5xl mx-auto w-full pb-12">
      <ServiceForm customers={activeCustomers} dictionary={dictionary} />
    </div>
  );
}
