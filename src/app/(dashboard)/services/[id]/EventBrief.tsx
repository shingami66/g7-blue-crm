import type { ReactNode } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { UiDateText } from "@/components/i18n/UiDateText";
import { isolateBidiText, isolateLtrText } from "@/lib/i18n/bidi";
import {
  getServiceEventTypeLabel,
  getServiceStatusLabel,
  type ServicesDictionary,
} from "@/lib/i18n/dictionaries/services";
import { eventBriefValue } from "@/lib/services/event-brief";
import type { ServiceLifecycleState } from "@/lib/services/lifecycle";
import type { Locale } from "@/lib/i18n/locales";
import type { Service } from "@/types/service";

const STATUS_VARIANTS = {
  Inquiry: "inquiry",
  Quoted: "quoted",
  Approved: "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;

interface EventBriefProps {
  service: Service;
  lifecycle: ServiceLifecycleState;
  locale: Locale;
  dictionary: ServicesDictionary;
}

export default function EventBrief({ service, lifecycle, locale, dictionary }: EventBriefProps) {
  const lifecycleItems = [
    ["commercial", lifecycle.commercialState],
    ["payment", lifecycle.paymentState],
    ["readiness", lifecycle.readinessState],
    ["execution", lifecycle.executionState],
    ["completion", lifecycle.completionState],
    ["close", lifecycle.closeState],
  ] as const;

  return (
    <section aria-labelledby="event-brief-title" className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="border-b border-surface-variant bg-surface-bright px-6 py-5">
        <p className="text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">
          {dictionary.detail.sections.eventBrief}
        </p>
        <p dir="ltr" className="font-mono text-[14px] font-semibold text-primary">
          {isolateLtrText(service.serviceNumber)}
        </p>
        <div className="mt-2 min-w-0">
          <h1 id="event-brief-title" className="min-w-0 break-words text-[24px] font-semibold leading-[32px] text-on-surface">
            {isolateBidiText(service.serviceTitle)}
          </h1>
        </div>
      </div>

      <dl className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-5 p-6 sm:grid-cols-2 xl:grid-cols-3">
        <BriefItem label={dictionary.detail.labels.customer}>
          <PendingLink
            href={`/customers/${service.customerId}`}
            pendingLabel={dictionary.list.actions.opening}
            className="break-words text-primary hover:underline"
          >
            {customerName(service, dictionary)}
          </PendingLink>
        </BriefItem>
        <BriefItem label={dictionary.detail.labels.primaryContact}>
          <BidiValue value={eventBriefValue(service.customer?.contact, dictionary.detail.fallbacks.empty)} />
        </BriefItem>
        <BriefItem label={dictionary.detail.labels.customerRef}>
          {service.customer?.customerNumber ? (
            <bdi dir="ltr" className="font-mono text-[13px]">{isolateLtrText(service.customer.customerNumber)}</bdi>
          ) : (
            dictionary.detail.fallbacks.customerReferenceUnavailable
          )}
        </BriefItem>
        <BriefItem label={dictionary.detail.labels.status}>
          <StatusBadge variant={STATUS_VARIANTS[service.status]}>
            {getServiceStatusLabel(dictionary.locale, service.status)}
          </StatusBadge>
        </BriefItem>
        <BriefItem label={dictionary.detail.labels.eventName}>
          <BidiValue value={eventBriefValue(service.eventName, dictionary.detail.fallbacks.empty)} />
        </BriefItem>
        <BriefItem label={dictionary.detail.labels.eventType}>
          <BidiValue value={eventBriefValue(getServiceEventTypeLabel(locale, service.eventType), dictionary.detail.fallbacks.empty)} />
        </BriefItem>
        <BriefItem label={dictionary.detail.labels.location}>
          <BidiValue value={eventBriefValue(service.eventLocation, dictionary.detail.fallbacks.empty)} />
        </BriefItem>
        <BriefItem label={dictionary.detail.labels.startDate}>
          {service.eventStartDate ? <UiDateText locale={locale} value={service.eventStartDate} /> : dictionary.detail.fallbacks.empty}
        </BriefItem>
        <BriefItem label={dictionary.detail.labels.endDate}>
          {service.eventEndDate ? <UiDateText locale={locale} value={service.eventEndDate} /> : dictionary.detail.fallbacks.empty}
        </BriefItem>
        <BriefItem label={dictionary.serviceLifecycle.title} className="sm:col-span-2 xl:col-span-3">
          <ul className="flex min-w-0 flex-wrap gap-x-4 gap-y-2 text-[13px] text-on-surface-variant">
            {lifecycleItems.map(([dimension, state]) => (
              <li key={dimension} className="min-w-0">
                <span className="font-semibold text-on-surface">{dictionary.serviceLifecycle.dimensions[dimension]}: </span>
                <span>{dictionary.serviceLifecycle.states[state]}</span>
              </li>
            ))}
          </ul>
        </BriefItem>
        <BriefItem label={dictionary.detail.sections.descriptionNotes} className="sm:col-span-2 xl:col-span-3">
          <BidiValue value={eventBriefValue(service.description, dictionary.detail.fallbacks.empty)} preserveWhitespace />
        </BriefItem>
      </dl>
    </section>
  );
}

function BriefItem({ label, children, className = "" }: { label: string; children: ReactNode; className?: string }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <dt className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd className="min-w-0 break-words font-medium text-on-surface">{children}</dd>
    </div>
  );
}

function BidiValue({ value, preserveWhitespace = false }: { value: string; preserveWhitespace?: boolean }) {
  return <span dir="auto" className={preserveWhitespace ? "whitespace-pre-wrap" : undefined}>{isolateBidiText(value)}</span>;
}

function customerName(service: Service, dictionary: ServicesDictionary) {
  const company = service.customer?.company;
  const contact = service.customer?.contact;
  return isolateBidiText(company || contact || dictionary.detail.fallbacks.customerProfile);
}
