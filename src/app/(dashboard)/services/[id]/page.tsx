import { notFound, redirect } from "next/navigation";
import type { ComponentProps, ReactNode } from "react";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { getServiceById } from "@/lib/services/queries";
import { createAdminClient } from "@/lib/supabase/admin";
import { getQuotationsByServiceId } from "@/lib/quotations/queries";
import { getServiceBillingState } from "@/lib/invoices";
import { getServiceStatusTransitionState } from "@/lib/services/status-transitions";
import StatusBadge from "@/components/ui/StatusBadge";
import { ArrowLeft, CalendarDays, Edit, FileText, MapPin, UserRound } from "lucide-react";
import Link from "next/link";
import ServiceStatusTimeline from "./ServiceStatusTimeline";
import RelatedQuotationsCard from "./RelatedQuotationsCard";
import BillingPanel from "./BillingPanel";
import ServiceStatusControl from "./ServiceStatusControl";
import type { Service } from "@/types/service";

export const dynamic = "force-dynamic";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<Service["status"], StatusBadgeVariant> = {
  "Inquiry": "inquiry",
  "Quoted": "quoted",
  "Approved": "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  "Completed": "completed",
  "Cancelled": "cancelled",
} as const;

export default async function ServiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-sm text-slate-500">
              You do not have permission to view services.
            </p>
          </div>
        </div>
      );
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
        <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
          <p className="text-sm text-slate-500">
            We couldn&apos;t load the necessary data at this time. Please try again later.
          </p>
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
  const canModifyService = service.status === "Inquiry" || service.status === "Quoted";

  const today = new Date().toISOString().split("T")[0];
  const serviceStarted = !!service.eventStartDate && service.eventStartDate < today;
  const quotationDisabledReason = serviceStarted
    ? "Cannot create a quotation because the service has already started."
    : undefined;

  const relatedQuotations = canReadQuotations
    ? await getQuotationsByServiceId(service.id)
    : null;
  const billingState = await getServiceBillingState(service.id);
  const statusTransitionState = canUpdateServiceStatus
    ? await getServiceStatusTransitionState(
        createAdminClient(),
        service.id,
        service.status
      )
    : null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <BackToServicesLink />
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-3">
              <h2 className="text-[28px] leading-[36px] font-semibold text-primary font-mono tracking-tight">
                {service.serviceNumber}
              </h2>
              <StatusBadge variant={STATUS_VARIANT_MAP[service.status]}>
                {service.status}
              </StatusBadge>
            </div>
            <div>
              <h1 className="text-[24px] leading-[32px] font-semibold text-on-surface">
                {service.serviceTitle}
              </h1>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-2 text-[14px] leading-[20px] text-on-surface-variant">
                <Link
                  href={`/customers/${service.customerId}`}
                  className="inline-flex items-center gap-2 text-primary hover:underline"
                >
                  <UserRound size={16} />
                  {formatCustomerName(service)}
                </Link>
                <span className="inline-flex items-center gap-2">
                  <CalendarDays size={16} />
                  {formatServiceSchedule(service)}
                </span>
                {service.eventLocation && (
                  <span className="inline-flex items-center gap-2">
                    <MapPin size={16} />
                    {service.eventLocation}
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
                Create Quotation
              </span>
            ) : (
              <Link
                href={`/quotations/new?serviceId=${service.id}`}
                className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary-container text-on-primary rounded-lg text-[14px] font-semibold transition-colors"
              >
                <FileText size={18} />
                Create Quotation
              </Link>
            )
          )}
          {canEditService && canModifyService && (
            <Link
              href={`/services/${service.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low text-[14px] font-semibold transition-colors"
            >
              <Edit size={18} />
              Edit
            </Link>
          )}
        </div>
      </div>

      <ServiceStatusTimeline
        status={service.status}
        cancellationReason={service.cancellationReason}
      />

      {canUpdateServiceStatus && statusTransitionState && (
        <ServiceStatusControl
          serviceId={service.id}
          currentStatus={service.status}
          transitionState={statusTransitionState}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
          <SectionHeader title="Service Schedule" />
          <dl className="p-6 grid grid-cols-1 gap-5">
            <DetailItem label="Event Name">{formatNullable(service.eventName)}</DetailItem>
            <DetailItem label="Event Type">{formatNullable(service.eventType)}</DetailItem>
            <DetailItem label="Start Date">{formatNullable(service.eventStartDate)}</DetailItem>
            <DetailItem label="End Date">{formatNullable(service.eventEndDate)}</DetailItem>
            <DetailItem label="Location">{formatNullable(service.eventLocation)}</DetailItem>
          </dl>
        </section>

        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
          <SectionHeader title="Customer Summary" />
          <dl className="p-6 grid grid-cols-1 gap-5">
            <DetailItem label="Customer">
              <Link
                href={`/customers/${service.customerId}`}
                className="text-primary hover:underline"
              >
                {formatCustomerName(service)}
              </Link>
            </DetailItem>
            <DetailItem label="Primary Contact">
              {formatNullable(service.customer?.contact)}
            </DetailItem>
            <DetailItem label="Customer Ref">
              <span className="font-mono text-[13px]">{service.customer?.customerNumber || "Customer reference unavailable"}</span>
            </DetailItem>
          </dl>
        </section>

        <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
          <SectionHeader title="Operational Details" />
          <dl className="p-6 grid grid-cols-1 gap-5">
            <DetailItem label="Estimated Budget">{formatBudget(service)}</DetailItem>
            <DetailItem label="Created At">{formatDateTime(service.createdAt)}</DetailItem>
            <DetailItem label="Updated At">{formatDateTime(service.updatedAt)}</DetailItem>
            <DetailItem label="Status">{service.status}</DetailItem>
          </dl>
        </section>
      </div>

      <section className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
          <h3 className="font-semibold text-primary">Description / Notes</h3>
        </div>
        <div className="p-6 text-[14px] leading-[22px] text-on-surface whitespace-pre-wrap">
          {service.description || "—"}
        </div>
      </section>

      <RelatedQuotationsCard
        quotations={relatedQuotations}
        serviceId={service.id}
        canCreateQuotation={canCreateQuotation && canModifyService}
        disabledReason={quotationDisabledReason}
      />
      <BillingPanel billingState={billingState} />
    </div>
  );
}

function BackToServicesLink() {
  return (
    <Link
      href="/services"
      className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
      aria-label="Back to services"
    >
      <ArrowLeft size={18} />
    </Link>
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

function formatCustomerName(service: Service) {
  const company = service.customer?.company;
  const contact = service.customer?.contact;

  if (company && contact) return `${company} (${contact})`;
  return company || contact || "Customer profile";
}

function formatServiceSchedule(service: Service) {
  if (service.eventStartDate && service.eventEndDate) {
    return `${service.eventStartDate} - ${service.eventEndDate}`;
  }

  return service.eventStartDate || service.eventEndDate || "Schedule not set";
}

function formatNullable(value: string | null | undefined) {
  return value || "—";
}

function formatBudget(service: Service) {
  if (service.estimatedBudget == null) return "—";

  return `${service.estimatedBudget.toLocaleString("en-SA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} SAR`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
