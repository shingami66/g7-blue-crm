import { redirect } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import { appendReturnTo, safeRecordReturnTo } from "@/lib/record-navigation/return-to";
import {
  getQuotationsDictionary,
  type QuotationsDictionary,
} from "@/lib/i18n/dictionaries/quotations";
import QuotationForm from "./QuotationForm";

export const dynamic = "force-dynamic";

interface NewQuotationPageProps {
  searchParams?: Promise<{ serviceId?: string | string[]; returnTo?: string }>;
}

function getRequestedServiceId(searchParams: { serviceId?: string | string[] }) {
  const serviceId = searchParams.serviceId;
  return Array.isArray(serviceId) ? serviceId[0] : serviceId;
}

function serviceCanReceiveQuotation(status: string) {
  return status === "Inquiry" || status === "Quoted";
}

export default async function NewQuotationPage({ searchParams }: NewQuotationPageProps) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getQuotationsDictionary(locale);
  const formDictionary: QuotationsDictionary = dictionary;
  let authError: unknown = null;

  try {
    await requirePermission("quotations:write");
    await requirePermission("services:read");
  } catch (err) {
    authError = err;
  }

  if (authError instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (authError instanceof ForbiddenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
          <p className="text-sm text-slate-500">
            {dictionary.states.createForbidden}
          </p>
        </div>
      </div>
    );
  }

  if (authError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">
            {dictionary.states.createDataLoadError}
          </p>
        </div>
      </div>
    );
  }

  const resolvedSearchParams = searchParams ? await searchParams : {};
  const serviceId = getRequestedServiceId(resolvedSearchParams);

  if (!serviceId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.selectServiceTitle}</h2>
          <p className="text-sm text-slate-500 mb-4">
            {dictionary.states.selectServiceMessage}
          </p>
          <Link href="/services" className="text-primary hover:underline font-medium">
            {dictionary.actions.goToServices}
          </Link>
        </div>
      </div>
    );
  }

  let serviceLoadError: unknown = null;
  let service: Awaited<ReturnType<typeof getServiceById>> = null;

  try {
    service = await getServiceById(serviceId);
  } catch (err) {
    serviceLoadError = err;
  }

  if (serviceLoadError instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (serviceLoadError instanceof ForbiddenError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
          <p className="text-sm text-slate-500">
            {dictionary.states.selectedServiceForbidden}
          </p>
        </div>
      </div>
    );
  }

  if (serviceLoadError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">
            {dictionary.states.selectedServiceLoadError}
          </p>
        </div>
      </div>
    );
  }

  if (!service) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.serviceUnavailableTitle}</h2>
          <p className="text-sm text-slate-500 mb-4">
            {dictionary.states.serviceUnavailableMessage}
          </p>
          <Link href="/services" className="text-primary hover:underline font-medium">
            {dictionary.actions.backToServices}
          </Link>
        </div>
      </div>
    );
  }

  if (!serviceCanReceiveQuotation(service.status)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.creationLockedTitle}</h2>
          <p className="text-sm text-slate-500 mb-4">
            {dictionary.states.creationLockedMessage}
          </p>
          <Link href={`/services/${service.id}`} className="text-primary hover:underline font-medium">
            {dictionary.actions.backToService}
          </Link>
        </div>
      </div>
    );
  }

  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, `/services/${service.id}`);
  const serviceDetailHref = returnTo === `/services/${service.id}` || returnTo.startsWith(`/services/${service.id}?`)
    ? returnTo
    : appendReturnTo(`/services/${service.id}`, returnTo);
  const servicesDictionary = getServicesDictionary(locale);

  return (
    <PageFrame variant="form">
      <PageLocation
        breadcrumbs={{
          label: dictionary.detail.locationLabel,
          items: [
            { label: servicesDictionary.list.title, href: "/services" },
            { label: service.serviceTitle, href: serviceDetailHref, dir: "auto" },
            { label: dictionary.form.newTitle, current: true },
          ],
        }}
        returnControl={<RecordBackButton href={returnTo} locale={locale} variant="labeled" label={dictionary.actions.backToService} />}
      />
      <PageHeader variant="composed" title={dictionary.form.newTitle} subtitle={dictionary.form.newSubtitle} />
      <QuotationForm service={service} dictionary={formDictionary} />
    </PageFrame>
  );
}
