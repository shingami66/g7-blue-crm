import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getCustomers } from "@/lib/customers/queries";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import { safeRecordReturnTo } from "@/lib/record-navigation/return-to";
import ServiceForm from "./ServiceForm";

export const dynamic = "force-dynamic";

export default async function NewServicePage({ searchParams }: { searchParams: Promise<{ returnTo?: string }> }) {
  const returnTo = safeRecordReturnTo((await searchParams).returnTo, "/services");
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
    <PageFrame variant="form">
      <PageLocation
        breadcrumbs={{
          label: dictionary.detail.locationLabel,
          items: [
            { label: dictionary.list.title, href: "/services" },
            { label: dictionary.form.newTitle, current: true },
          ],
        }}
        returnControl={<RecordBackButton href={returnTo} locale={locale} variant="labeled" label={dictionary.detail.backToServices} />}
      />
      <PageHeader variant="composed" title={dictionary.form.newTitle} subtitle={dictionary.form.newSubtitle} />
      <ServiceForm customers={activeCustomers} dictionary={dictionary} returnTo={returnTo} />
    </PageFrame>
  );
}
