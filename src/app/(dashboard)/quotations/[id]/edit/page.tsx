import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getQuotationById } from "@/lib/quotations/queries";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getQuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import QuotationForm from "../../new/QuotationForm";
import PageLocation from "@/components/navigation/PageLocation";
import { RecordBackButton } from "@/components/navigation/RecordBackButton";
import PageFrame from "@/components/ui/PageFrame";
import PageHeader from "@/components/ui/PageHeader";
import { appendReturnTo, safeRecordReturnTo } from "@/lib/record-navigation/return-to";

export const dynamic = "force-dynamic";

export default async function EditQuotationPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const returnTo = safeRecordReturnTo((await searchParams).returnTo, `/quotations/${id}`);
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getQuotationsDictionary(locale);
  let authOrLoadError: unknown = null;
  let quotation: Awaited<ReturnType<typeof getQuotationById>> = null;

  try {
    await requirePermission("quotations:write");
    await requirePermission("services:read");
    quotation = await getQuotationById(id);
  } catch (err) {
    authOrLoadError = err;
  }

  if (authOrLoadError instanceof UnauthorizedError) {
    redirect("/sign-in");
  }

  if (authOrLoadError instanceof ForbiddenError) {
    return (
      <EditState
        locale={locale}
        title={dictionary.states.accessDenied}
        message={dictionary.states.createForbidden}
        role="status"
        returnTo="/quotations"
        taskTitle={dictionary.form.editTitle}
        moduleTitle={dictionary.list.title}
        locationLabel={dictionary.detail.locationLabel}
        returnLabel={dictionary.editStates.backToQuotations}
      />
    );
  }

  if (authOrLoadError) {
    return (
      <EditState
        locale={locale}
        title={dictionary.states.genericError}
        message={dictionary.states.createDataLoadError}
        role="alert"
        returnTo="/quotations"
        taskTitle={dictionary.form.editTitle}
        moduleTitle={dictionary.list.title}
        locationLabel={dictionary.detail.locationLabel}
        returnLabel={dictionary.editStates.backToQuotations}
      />
    );
  }

  if (!quotation) {
    return (
      <EditState
        locale={locale}
        title={dictionary.editStates.notFound}
        message={dictionary.editStates.notFoundMessage}
        role="status"
        returnTo="/quotations"
        taskTitle={dictionary.form.editTitle}
        moduleTitle={dictionary.list.title}
        locationLabel={dictionary.detail.locationLabel}
        returnLabel={dictionary.editStates.backToQuotations}
      />
    );
  }

  if (quotation.status !== "draft") {
    return (
      <EditState
        locale={locale}
        title={dictionary.editStates.locked}
        message={dictionary.editStates.lockedMessage}
        role="status"
        returnTo={returnTo}
        taskTitle={dictionary.form.editTitle}
        moduleTitle={dictionary.list.title}
        locationLabel={dictionary.detail.locationLabel}
        returnLabel={dictionary.editStates.backToQuotations}
      />
    );
  }

  if (quotation.isApprovedCommercialAmendment) {
    redirect(`/quotations/${quotation.id}/amendment`);
  }

  if (!quotation.service) {
    return (
      <EditState
        locale={locale}
        title={dictionary.editStates.serviceContextRequired}
        message={dictionary.editStates.serviceContextMessage}
        role="status"
        returnTo={returnTo}
        taskTitle={dictionary.form.editTitle}
        moduleTitle={dictionary.list.title}
        locationLabel={dictionary.detail.locationLabel}
        returnLabel={dictionary.editStates.backToQuotations}
      />
    );
  }

  const quotationDetailHref = returnTo === `/quotations/${quotation.id}` || returnTo.startsWith(`/quotations/${quotation.id}?`)
    ? returnTo
    : appendReturnTo(`/quotations/${quotation.id}`, returnTo);

  return (
    <PageFrame variant="form">
      <PageLocation
        breadcrumbs={{
          label: dictionary.detail.locationLabel,
          items: [
            { label: dictionary.list.title, href: "/quotations" },
            { label: quotation.quotationNumber, href: quotationDetailHref, dir: "ltr" },
            { label: dictionary.form.editTitle, current: true },
          ],
        }}
        returnControl={<RecordBackButton href={returnTo} locale={locale} variant="labeled" label={dictionary.editStates.backToQuotations} />}
      />
      <PageHeader
        variant="composed"
        title={dictionary.form.editTitle}
        subtitle={dictionary.form.editSubtitle}
        identifier={<bdi dir="ltr">{quotation.quotationNumber}</bdi>}
      />
      <QuotationForm
        service={{
          id: quotation.serviceId,
          serviceNumber: quotation.service.serviceNumber,
          serviceTitle: quotation.service.serviceTitle,
          status: quotation.service.status,
          eventName: quotation.service.eventName,
          customer: quotation.customer,
        }}
        initialData={quotation}
        dictionary={dictionary}
      />
    </PageFrame>
  );
}

function EditState({
  locale,
  title,
  message,
  role,
  returnTo,
  taskTitle,
  moduleTitle,
  locationLabel,
  returnLabel,
}: {
  locale: "en" | "ar";
  title: string;
  message: string;
  role: "alert" | "status";
  returnTo: string;
  taskTitle: string;
  moduleTitle: string;
  locationLabel: string;
  returnLabel: string;
}) {
  return (
    <PageFrame variant="form">
      <PageLocation
        breadcrumbs={{
          label: locationLabel,
          items: [
            { label: moduleTitle, href: "/quotations" },
            { label: taskTitle, current: true },
          ],
        }}
        returnControl={
          <RecordBackButton
            href={returnTo}
            locale={locale}
            variant="labeled"
            label={returnLabel}
          />
        }
      />
      <PageHeader variant="composed" title={taskTitle} titleDir="auto" />
      <section
        role={role}
        aria-labelledby="quotation-edit-error-title"
        className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 sm:p-8"
      >
        <h2 id="quotation-edit-error-title" className="text-lg font-semibold text-primary">
          {title}
        </h2>
        <p className="mt-2 text-sm leading-6 text-on-surface-variant">{message}</p>
      </section>
    </PageFrame>
  );
}
