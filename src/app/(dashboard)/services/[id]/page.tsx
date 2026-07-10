import { notFound, redirect } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotationsByServiceId } from "@/lib/quotations/queries";
import { getServiceBillingState } from "@/lib/invoices";
import { getServiceStatusTransitionState } from "@/lib/services/status-transitions";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getLocale } from "@/lib/i18n/locales";
import {
  getServicesDictionary,
  type ServicesDictionary,
} from "@/lib/i18n/dictionaries/services";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { ArrowLeft, CalendarDays, Edit, FileText, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import ServiceStatusTimeline from "./ServiceStatusTimeline";
import RelatedQuotationsCard from "./RelatedQuotationsCard";
import BillingPanel from "./BillingPanel";
import ServiceStatusControl from "./ServiceStatusControl";
import SupplierAllocationsPanel from "./SupplierAllocationsPanel";
import { getSupplierAllocationsByServiceId } from "@/lib/supplier-allocations/queries";
import { getSupplierBookingsByServiceId } from "@/lib/supplier-bookings/queries";
import type { Service } from "@/types/service";
import SupplierBookingsPanel from "./SupplierBookingsPanel";
import ApprovedBillingScopesCard from "./ApprovedBillingScopesCard";

export const dynamic = "force-dynamic";

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
  const locale = getLocale();
  const dictionary = getServicesDictionary(locale);
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const showDeleted = resolvedSearchParams?.showDeleted === "true";

  try {
    await requirePermission("services:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (error instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.accessDenied}</h2>
            <p className="text-sm text-slate-500">{dictionary.states.serviceReadForbidden}</p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">{dictionary.states.genericError}</h2>
          <p className="text-sm text-slate-500">{dictionary.states.serviceDataLoadError}</p>
        </div>
      </div>
    );
  }

  const service = await getServiceById(id);

  if (!service) {
    notFound();
  }

  const canCreateQuotation = await checkPermission("quotations:write");
  const canEditService = await checkPermission("services:write");
  const canUpdateServiceStatus = await checkPermission("services:update_status");
  const canReadQuotations = await checkPermission("quotations:read");
  const canReadSupplierAllocations = await checkPermission("supplier_allocations:read");
  const canReadCost = await checkPermission("supplier_allocations:read_cost");
  const canWriteAllocations = await checkPermission("supplier_allocations:write");
  const canCancelAllocations = await checkPermission("supplier_allocations:cancel");
  const canReadSupplierBookings = await checkPermission("supplier_bookings:read");
  const canWriteSupplierBookings = await checkPermission("supplier_bookings:write");
  const canCancelSupplierBookings = await checkPermission("supplier_bookings:cancel");
  const canReadApprovedBillingScopes = await checkPermission("approvedBillingScopes:read");
  const canModifyService = service.status === "Inquiry" || service.status === "Quoted";

  const today = new Date().toISOString().split("T")[0];
  const serviceStarted = !!service.eventStartDate && service.eventStartDate < today;
  const quotationDisabledReason = serviceStarted
    ? dictionary.detail.quotationDisabledReasonStarted
    : undefined;

  const relatedQuotations = canReadQuotations
    ? await getQuotationsByServiceId(service.id)
    : null;
  const billingState = await getServiceBillingState(service.id);
  const statusTransitionState = canUpdateServiceStatus
    ? await getServiceStatusTransitionState(createAdminClient(), service.id, service.status)
    : null;

  const supplierAllocations = canReadSupplierAllocations
    ? await getSupplierAllocationsByServiceId(service.id, { includeDeleted: showDeleted })
    : null;
  const supplierBookings = canReadSupplierBookings
    ? await getSupplierBookingsByServiceId(service.id)
    : null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <BackToServicesLink label={dictionary.detail.backToServices} />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 dir="ltr" className="text-[28px] leading-[36px] font-semibold text-primary font-mono tracking-tight">
                {isolateBidiText(service.serviceNumber)}
              </h2>
              <StatusBadge variant={STATUS_VARIANT_MAP[service.status]}>
                {dictionary.serviceStatuses[service.status]}
              </StatusBadge>
            </div>
            <div>
              <h1 dir="auto" className="text-[24px] leading-[32px] font-semibold text-on-surface">
                {isolateBidiText(service.serviceTitle)}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[14px] leading-[20px] text-on-surface-variant">
                <PendingLink
                  href={`/customers/${service.customerId}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                  dir="auto"
                >
                  <UserRound size={16} />
                  {formatCustomerName(service, dictionary)}
                </PendingLink>
                <span dir="ltr" className="inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  {formatServiceSchedule(service, dictionary)}
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

      <ServiceStatusTimeline
        status={service.status}
        cancellationReason={service.cancellationReason}
        dictionary={dictionary}
      />

      {canUpdateServiceStatus && statusTransitionState && (
        <ServiceStatusControl
          serviceId={service.id}
          currentStatus={service.status}
          transitionState={statusTransitionState}
          dictionary={dictionary}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
          <SectionHeader title={dictionary.detail.sections.serviceSchedule} />
          <dl className="p-6 grid grid-cols-1 gap-5">
            <DetailItem label={dictionary.detail.labels.eventName}>{formatNullable(service.eventName, "auto", dictionary)}</DetailItem>
            <DetailItem label={dictionary.detail.labels.eventType}>{formatNullable(service.eventType, "auto", dictionary)}</DetailItem>
            <DetailItem label={dictionary.detail.labels.startDate}>{formatNullable(service.eventStartDate, "ltr", dictionary)}</DetailItem>
            <DetailItem label={dictionary.detail.labels.endDate}>{formatNullable(service.eventEndDate, "ltr", dictionary)}</DetailItem>
            <DetailItem label={dictionary.detail.labels.location}>{formatNullable(service.eventLocation, "auto", dictionary)}</DetailItem>
          </dl>
        </section>

        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
          <SectionHeader title={dictionary.detail.sections.customerSummary} />
          <dl className="p-6 grid grid-cols-1 gap-5">
            <DetailItem label={dictionary.detail.labels.customer}>
              <PendingLink
                href={`/customers/${service.customerId}`}
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
            <DetailItem label={dictionary.detail.labels.estimatedBudget}>{formatBudget(service, dictionary)}</DetailItem>
            <DetailItem label={dictionary.detail.labels.createdAt}>
              <span dir="ltr">{formatDateTime(service.createdAt)}</span>
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.updatedAt}>
              <span dir="ltr">{formatDateTime(service.updatedAt)}</span>
            </DetailItem>
            <DetailItem label={dictionary.detail.labels.status}>{dictionary.serviceStatuses[service.status]}</DetailItem>
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

      <RelatedQuotationsCard
        quotations={relatedQuotations}
        serviceId={service.id}
        canCreateQuotation={canCreateQuotation && canModifyService}
        dictionary={dictionary}
        disabledReason={quotationDisabledReason}
      />
      {canReadApprovedBillingScopes && (
        <ApprovedBillingScopesCard serviceId={service.id} dictionary={dictionary} />
      )}
      {canReadSupplierAllocations && supplierAllocations && (
        <SupplierAllocationsPanel
          allocations={supplierAllocations}
          canReadCost={canReadCost}
          canWrite={canWriteAllocations}
          canCancel={canCancelAllocations}
          serviceId={service.id}
          serviceStatus={service.status}
          showDeleted={showDeleted}
        />
      )}
      {canReadSupplierBookings && supplierBookings && (
        <SupplierBookingsPanel
          bookings={supplierBookings}
          allocations={supplierAllocations ?? []}
          canCreate={canWriteSupplierBookings}
          canCancel={canCancelSupplierBookings}
          serviceStatus={service.status}
        />
      )}
      <BillingPanel billingState={billingState} />
    </div>
  );
}

function BackToServicesLink({ label }: { label: string }) {
  return (
    <PendingLink
      href="/services"
      className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
      aria-label={label}
    >
      <ArrowLeft size={18} />
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

function formatServiceSchedule(service: Service, dictionary: ServicesDictionary) {
  if (service.eventStartDate && service.eventEndDate) {
    return isolateBidiText(`${service.eventStartDate} - ${service.eventEndDate}`);
  }

  return isolateBidiText(
    service.eventStartDate || service.eventEndDate || dictionary.detail.fallbacks.scheduleNotSet,
  );
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

function formatBudget(service: Service, dictionary: ServicesDictionary) {
  if (service.estimatedBudget == null) {
    return dictionary.detail.fallbacks.empty;
  }

  return (
    <span dir="ltr">
      {isolateBidiText(
        `${service.estimatedBudget.toLocaleString("en-SA", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })} SAR`,
      )}
    </span>
  );
}

function formatDateTime(value: string) {
  return isolateBidiText(
    new Date(value).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  );
}
