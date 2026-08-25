import { notFound, redirect } from "next/navigation";
import { Suspense, type ComponentProps, type ReactNode } from "react";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import {
  INVOICE_PERMISSIONS,
  SERVICE_BILLING_SUMMARY_PERMISSIONS,
} from "@/lib/auth/role-permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceByIdResult } from "@/lib/services/queries";
import { getQuotationsByServiceIdResult } from "@/lib/quotations/queries";
import { getServiceBillingSummary } from "@/lib/invoices";
import { listServiceActivity } from "@/lib/services/activity-queries";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import {
  getServicesDictionary,
  getServiceStatusLabel,
  type ServicesDictionary,
} from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { UiDateRangeText, UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import type { Locale } from "@/lib/i18n/locales";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { CalendarDays, Edit, FileText, MapPin, UserRound } from "lucide-react";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import Link from "next/link";
import RelatedQuotationsCard from "./RelatedQuotationsCard";
import ServiceBillingSummaryCard from "./ServiceBillingSummaryCard";
import ServiceLifecycleActions from "./ServiceLifecycleActions";
import ServiceCancellationActions from "./ServiceCancellationActions";
import ServiceActivityHistory from "./ServiceActivityHistory";
import SupplierAllocationsPanel from "./SupplierAllocationsPanel";
import { getSupplierAllocationsByServiceId } from "@/lib/supplier-allocations/queries";
import { getSupplierBookingsByServiceId } from "@/lib/supplier-bookings/queries";
import type { Service } from "@/types/service";
import SupplierBookingsPanel from "./SupplierBookingsPanel";
import RecordNavigationSlot from "@/components/records/RecordNavigationSlot";
import { RecordNavigationPlaceholder } from "@/components/records/RecordNavigation";
import { getRecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import { getServiceRecordNavigation, safeRecordReturnTo } from "@/lib/record-navigation/queries";

export const dynamic = "force-dynamic";

// ApprovedBillingScopesCard remains available only on the nested technical evidence surface.

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<Service["status"], StatusBadgeVariant> = {
  Inquiry: "inquiry",
  Quoted: "quoted",
  Approved: "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;

export default async function ServiceDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const localePromise = getCurrentSessionEffectiveLocale();
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, "/services");
  const showDeleted = resolvedSearchParams?.showDeleted === "true";
  const showSupplierHistory =
    resolvedSearchParams?.showSupplierHistory === "true" || showDeleted;
  const requestedInvoiceAction = resolvedSearchParams?.invoiceAction;
  if (requestedInvoiceAction === "deposit" || requestedInvoiceAction === "final") {
    await localePromise;
    redirect(`/services/${encodeURIComponent(id)}/billing?intent=${requestedInvoiceAction}`);
  }

  const [locale, [serviceAuthResult, serviceReadResult]] = await Promise.all([
    localePromise,
    Promise.allSettled([
      requirePermission("services:read"),
      getServiceByIdResult(id),
    ]),
  ]);
  const dictionary = getServicesDictionary(locale);
  const sharedStates = getSharedUiStates(locale);

  if (serviceAuthResult.status === "rejected") {
    const error = serviceAuthResult.reason;
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (error instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.serviceReadForbidden}
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

  if (serviceReadResult.status === "rejected") {
    throw serviceReadResult.reason;
  }

  const serviceResult = serviceReadResult.value;

  if (serviceResult.status === "not_found") {
    notFound();
  }

  if (serviceResult.status === "error") {
    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.serviceDataLoadError}
        role="alert"
      />
    );
  }

  const { service } = serviceResult;

  const recordNavigationDictionary = getRecordNavigationDictionary(locale);

  const canCreateQuotation = await checkPermission("quotations:write");
  const canEditService = await checkPermission("services:write");
  const canUpdateServiceStatus = await checkPermission("services:update_status");
  const canModifyService = service.status === "Inquiry" || service.status === "Quoted";

  const today = new Date().toISOString().split("T")[0];
  const serviceStarted = !!service.eventStartDate && service.eventStartDate < today;
  const quotationDisabledReason = serviceStarted
    ? dictionary.detail.quotationDisabledReasonStarted
    : undefined;

  return (
    <div data-p2-detail-primary-ready="true" className="flex w-full min-w-0 max-w-full flex-col gap-6 pb-12">
      <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <BackToServicesLink label={dictionary.detail.backToServices} returnTo={returnTo} />
          <div className="min-w-0 space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 dir="ltr" className="text-[28px] leading-[36px] font-semibold text-primary font-mono tracking-tight">
                {isolateBidiText(service.serviceNumber)}
              </h2>
              <StatusBadge variant={STATUS_VARIANT_MAP[service.status]}>
                {getServiceStatusLabel(dictionary.locale, service.status)}
              </StatusBadge>
            </div>
            <div>
              <h1 dir="auto" className="text-[24px] leading-[32px] font-semibold text-on-surface">
                {isolateBidiText(service.serviceTitle)}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[14px] leading-[20px] text-on-surface-variant">
                <PendingLink
                  href={`/customers/${service.customerId}`}
                  pendingLabel={dictionary.list.actions.opening}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                  dir="auto"
                >
                  <UserRound size={16} />
                  {formatCustomerName(service, dictionary)}
                </PendingLink>
                <span dir="ltr" className="inline-flex items-center gap-2 tabular-nums">
                  <CalendarDays size={16} />
                  {formatServiceSchedule(locale, service, dictionary)}
                </span>
                {service.eventLocation && (
                  <span dir="auto" className="inline-flex items-center gap-2">
                    <MapPin size={16} />
                    {isolateBidiText(service.eventLocation)}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Suspense
            fallback={
              <RecordNavigationPlaceholder
                recordType={dictionary.list.title}
                dictionary={recordNavigationDictionary}
                state="loading"
              />
            }
          >
            <RecordNavigationSlot
              loadNavigation={() => getServiceRecordNavigation(id, service.serviceNumber)}
              basePath="/services"
              recordType={dictionary.list.title}
              dictionary={recordNavigationDictionary}
              returnTo={returnTo}
              pendingLabel={dictionary.list.actions.opening}
            />
          </Suspense>
          {canCreateQuotation && canModifyService && (
            quotationDisabledReason ? (
              <span
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-outline-variant text-on-surface-variant rounded-lg text-[14px] font-semibold cursor-not-allowed opacity-60"
                title={quotationDisabledReason}
              >
                <FileText size={18} />
                {dictionary.detail.createQuotation}
              </span>
            ) : (
              <Link
                href={`/quotations/new?serviceId=${service.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors"
              >
                <FileText size={18} />
                {dictionary.detail.createQuotation}
              </Link>
            )
          )}
          {canEditService && canModifyService && (
            <PendingLink
              href={`/services/${service.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low text-[14px] font-semibold transition-colors"
            >
              <Edit size={18} />
              {dictionary.detail.edit}
            </PendingLink>
          )}
        </div>
      </div>

      {canUpdateServiceStatus && (
        <ServiceLifecycleActions
          serviceId={service.id}
          status={service.status}
          dictionary={dictionary}
        />
      )}

      {canUpdateServiceStatus && (
        <ServiceCancellationActions
          serviceId={service.id}
          status={service.status}
          dictionary={dictionary}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
          <SectionHeader title={dictionary.detail.sections.serviceSchedule} />
          <dl className="p-6 grid grid-cols-1 gap-5">
            <DetailItem label={dictionary.detail.labels.eventName}>{formatNullable(service.eventName, "auto", dictionary)}</DetailItem>
            <DetailItem label={dictionary.detail.labels.eventType}>{formatNullable(service.eventType, "auto", dictionary)}</DetailItem>
            <DetailItem label={dictionary.detail.labels.startDate}>
              {service.eventStartDate ? (
                <UiDateText locale={locale} value={service.eventStartDate} />
              ) : (
                dictionary.detail.fallbacks.empty
              )}
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.endDate}>
              {service.eventEndDate ? (
                <UiDateText locale={locale} value={service.eventEndDate} />
              ) : (
                dictionary.detail.fallbacks.empty
              )}
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.location}>{formatNullable(service.eventLocation, "auto", dictionary)}</DetailItem>
          </dl>
        </section>

        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
          <SectionHeader title={dictionary.detail.sections.customerSummary} />
          <dl className="p-6 grid grid-cols-1 gap-5">
            <DetailItem label={dictionary.detail.labels.customer}>
              <PendingLink
                href={`/customers/${service.customerId}`}
                pendingLabel={dictionary.list.actions.opening}
                className="text-primary hover:underline"
                dir="auto"
              >
                {formatCustomerName(service, dictionary)}
              </PendingLink>
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.primaryContact}>
              {formatNullable(service.customer?.contact, "auto", dictionary)}
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.customerRef}>
              <span dir="ltr" className="font-mono text-[13px]">
                {service.customer?.customerNumber
                  ? isolateBidiText(service.customer.customerNumber)
                  : dictionary.detail.fallbacks.customerReferenceUnavailable}
              </span>
            </DetailItem>
          </dl>
        </section>

        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
          <SectionHeader title={dictionary.detail.sections.operationalDetails} />
          <dl className="p-6 grid grid-cols-1 gap-5">
            <DetailItem label={dictionary.detail.labels.estimatedBudget}>
              {formatBudget(locale, service, dictionary)}
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.createdAt}>
              <UiDateTimeText locale={locale} value={service.createdAt} />
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.updatedAt}>
              <UiDateTimeText locale={locale} value={service.updatedAt} />
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.status}>{getServiceStatusLabel(dictionary.locale, service.status)}</DetailItem>
          </dl>
        </section>
      </div>

      <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
          <h3 className="font-semibold text-primary">{dictionary.detail.sections.descriptionNotes}</h3>
        </div>
        <div dir="auto" className="p-6 text-[14px] leading-[22px] text-on-surface whitespace-pre-wrap">
          {service.description ? isolateBidiText(service.description) : dictionary.detail.fallbacks.empty}
        </div>
      </section>

      <Suspense fallback={<SecondaryLoadingPanel label={sharedStates.loading.workspace} />}>
        <ServiceSecondarySections
          service={service}
          locale={locale}
          dictionary={dictionary}
          sharedStates={sharedStates}
          showSupplierHistory={showSupplierHistory}
          canCreateQuotation={canCreateQuotation && canModifyService}
          quotationDisabledReason={quotationDisabledReason}
        />
      </Suspense>
    </div>
  );
}

async function ServiceSecondarySections({
  service,
  locale,
  dictionary,
  sharedStates,
  showSupplierHistory,
  canCreateQuotation,
  quotationDisabledReason,
}: {
  service: Service;
  locale: Locale;
  dictionary: ServicesDictionary;
  sharedStates: ReturnType<typeof getSharedUiStates>;
  showSupplierHistory: boolean;
  canCreateQuotation: boolean;
  quotationDisabledReason?: string;
}) {
  let loaded: {
    canReadQuotations: boolean;
    canReadSupplierAllocations: boolean;
    canReadCost: boolean;
    canWriteAllocations: boolean;
    canCancelAllocations: boolean;
    canReadSupplierBookings: boolean;
    canWriteSupplierBookings: boolean;
    canCancelSupplierBookings: boolean;
    canReadInvoices: boolean;
    relatedQuotationsResult: Awaited<ReturnType<typeof getQuotationsByServiceIdResult>> | null;
    billingSummary: Awaited<ReturnType<typeof getServiceBillingSummary>> | null;
    activity: Awaited<ReturnType<typeof listServiceActivity>>;
    supplierAllocationsResult: Awaited<ReturnType<typeof getSupplierAllocationsByServiceId>> | null;
    supplierBookingsResult: Awaited<ReturnType<typeof getSupplierBookingsByServiceId>> | null;
  };
  try {
    const [
      canReadQuotations,
      canReadSupplierAllocations,
      canReadCost,
      canWriteAllocations,
      canCancelAllocations,
      canReadSupplierBookings,
      canWriteSupplierBookings,
      canCancelSupplierBookings,
      canReadInvoices,
      canReadBillingSummary,
    ] = await Promise.all([
      checkPermission("quotations:read"),
      checkPermission("supplier_allocations:read"),
      checkPermission("supplier_allocations:read_cost"),
      checkPermission("supplier_allocations:write"),
      checkPermission("supplier_allocations:cancel"),
      checkPermission("supplier_bookings:read"),
      checkPermission("supplier_bookings:write"),
      checkPermission("supplier_bookings:cancel"),
      checkPermission(INVOICE_PERMISSIONS.read),
      checkPermission(SERVICE_BILLING_SUMMARY_PERMISSIONS.read),
    ]);
    const [
      relatedQuotationsSettled,
      billingSummarySettled,
      activitySettled,
      supplierAllocationsSettled,
      supplierBookingsSettled,
    ] = await Promise.allSettled([
      canReadQuotations ? getQuotationsByServiceIdResult(service.id) : Promise.resolve(null),
      canReadBillingSummary ? getServiceBillingSummary(service.id) : Promise.resolve(null),
      listServiceActivity(service.id),
      canReadSupplierAllocations
        ? getSupplierAllocationsByServiceId(service.id, {
            includeDeleted: showSupplierHistory,
            onlyActive: !showSupplierHistory,
          })
        : Promise.resolve(null),
      canReadSupplierBookings
        ? getSupplierBookingsByServiceId(service.id, {
            includeDeleted: showSupplierHistory,
            onlyActive: !showSupplierHistory,
          })
        : Promise.resolve(null),
    ]);
    const relatedQuotationsResult = relatedQuotationsSettled.status === "fulfilled"
      ? relatedQuotationsSettled.value
      : canReadQuotations
        ? { quotations: [], error: "quotations_load_failed" as const }
        : null;
    const billingSummary = billingSummarySettled.status === "fulfilled"
      ? billingSummarySettled.value
      : null;
    const activity = activitySettled.status === "fulfilled"
      ? activitySettled.value
      : { success: false, events: [] };
    const supplierAllocationsResult = supplierAllocationsSettled.status === "fulfilled"
      ? supplierAllocationsSettled.value
      : canReadSupplierAllocations
        ? { allocations: [], error: "supplier_allocations_load_failed" as const }
        : null;
    const supplierBookingsResult = supplierBookingsSettled.status === "fulfilled"
      ? supplierBookingsSettled.value
      : canReadSupplierBookings
        ? { bookings: [], error: "supplier_bookings_load_failed" as const }
        : null;
    loaded = {
      canReadQuotations,
      canReadSupplierAllocations,
      canReadCost,
      canWriteAllocations,
      canCancelAllocations,
      canReadSupplierBookings,
      canWriteSupplierBookings,
      canCancelSupplierBookings,
      canReadInvoices,
      relatedQuotationsResult,
      billingSummary,
      activity,
      supplierAllocationsResult,
      supplierBookingsResult,
    };
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.serviceDataLoadError}
        role="alert"
      />
    );
  }

  const {
    canReadSupplierAllocations,
    canReadCost,
    canWriteAllocations,
    canCancelAllocations,
    canReadSupplierBookings,
    canWriteSupplierBookings,
    canCancelSupplierBookings,
    canReadInvoices,
    relatedQuotationsResult,
    billingSummary,
    activity,
    supplierAllocationsResult,
    supplierBookingsResult,
  } = loaded;
  const supplierAllocations = supplierAllocationsResult?.allocations ?? null;
  const supplierBookings = supplierBookingsResult?.bookings ?? null;
  const activeBookingAllocationIds = (supplierBookings ?? [])
    .filter((booking) => !booking.isDeleted && booking.status !== "cancelled")
    .map((booking) => booking.sourceAllocationId);

  return (
      <div data-p2-detail-secondary-complete="true" className="contents">
        <RelatedQuotationsCard
          quotations={relatedQuotationsResult?.quotations ?? null}
          loadError={!!relatedQuotationsResult?.error}
          serviceId={service.id}
          canCreateQuotation={canCreateQuotation}
          dictionary={dictionary}
          disabledReason={quotationDisabledReason}
        />
        {canReadSupplierAllocations && supplierAllocationsResult && supplierAllocations && (
          <SupplierAllocationsPanel
            allocations={supplierAllocations}
            loadError={!!supplierAllocationsResult.error}
            activeBookingAllocationIds={activeBookingAllocationIds}
            canReadCost={canReadCost}
            canWrite={canWriteAllocations}
            canCancel={canCancelAllocations}
            serviceId={service.id}
            serviceStatus={service.status}
            showSupplierHistory={showSupplierHistory}
            dictionary={dictionary}
          />
        )}
        {canReadSupplierBookings && supplierBookingsResult && supplierBookings && (
          <SupplierBookingsPanel
            bookings={supplierBookings}
            allocations={supplierAllocations ?? []}
            loadError={!!supplierBookingsResult.error}
            canCreate={canWriteSupplierBookings}
            canCancel={canCancelSupplierBookings}
            serviceId={service.id}
            serviceStatus={service.status}
            showSupplierHistory={showSupplierHistory}
            dictionary={dictionary}
          />
        )}
        {billingSummary && (
          <ServiceBillingSummaryCard
            serviceId={service.id}
            billingSummary={billingSummary}
            canReadInvoices={canReadInvoices}
            dictionary={dictionary}
          />
        )}
        <ServiceActivityHistory
          events={activity.events}
          available={activity.success}
          locale={locale}
          dictionary={dictionary}
        />
      </div>
  );
}

function SecondaryLoadingPanel({ label }: { label: string }) {
  return (
    <div
      role="status"
      aria-label={label}
      className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 text-[14px] text-on-surface-variant"
    >
      {label}
    </div>
  );
}

function BackToServicesLink({ label, returnTo }: { label: string; returnTo: string }) {
  return (
    <PendingLink
      href={returnTo}
      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
      aria-label={label}
    >
      <LocaleBackIcon size={16} />
    </PendingLink>
  );
}

function SectionHeader({ title }: { title: string }) {
  return (
    <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright">
      <h3 className="font-semibold text-primary">{title}</h3>
    </div>
  );
}

function DetailItem({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div>
      <dt className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
        {label}
      </dt>
      <dd className="text-on-surface font-medium">{children}</dd>
    </div>
  );
}

function formatCustomerName(service: Service, dictionary: ServicesDictionary) {
  const company = service.customer?.company;
  const contact = service.customer?.contact;

  if (company && contact) {
    return isolateBidiText(`${company} (${contact})`);
  }

  return isolateBidiText(company || contact || dictionary.detail.fallbacks.customerProfile);
}

function formatServiceSchedule(
  locale: Locale,
  service: Service,
  dictionary: ServicesDictionary,
) {
  if (service.eventStartDate && service.eventEndDate) {
    return (
      <UiDateRangeText
        locale={locale}
        start={service.eventStartDate}
        end={service.eventEndDate}
      />
    );
  }

  if (service.eventStartDate) {
    return <UiDateText locale={locale} value={service.eventStartDate} />;
  }

  if (service.eventEndDate) {
    return <UiDateText locale={locale} value={service.eventEndDate} />;
  }

  return dictionary.detail.fallbacks.scheduleNotSet;
}

function formatNullable(
  value: string | null | undefined,
  dir: "auto" | "ltr",
  dictionary: ServicesDictionary,
) {
  if (!value) {
    return dictionary.detail.fallbacks.empty;
  }

  return <span dir={dir}>{isolateBidiText(value)}</span>;
}

function formatBudget(
  locale: Locale,
  service: Service,
  dictionary: ServicesDictionary,
) {
  if (service.estimatedBudget == null) {
    return dictionary.detail.fallbacks.empty;
  }

  return (
    <span dir="ltr" className="tabular-nums">
      {formatSarAmount(locale, Number(service.estimatedBudget))}
    </span>
  );
}
