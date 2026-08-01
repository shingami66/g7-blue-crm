"use client";

import type { ComponentProps } from "react";
import Link from "next/link";
import type { Service, ServiceStatus } from "@/types/service";
import type { ServiceBillingState } from "@/lib/invoices/types";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import type { SupplierAllocation } from "@/lib/supplier-allocations/types";
import type { Locale } from "@/lib/i18n/locales";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { getServiceStatusLabel } from "@/lib/i18n/dictionaries/services";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { UiDateRangeText, UiDateText } from "@/components/i18n/UiDateText";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import { CalendarDays, MapPin, UserRound, ExternalLink } from "lucide-react";
import BillingPanel from "../BillingPanel";
import ServiceCostMarginSection from "./ServiceCostMarginSection";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const STATUS_VARIANT_MAP: Record<ServiceStatus, StatusBadgeVariant> = {
  Inquiry: "inquiry",
  Quoted: "quoted",
  Approved: "approved",
  "Deposit Paid": "deposit-paid",
  "In Progress": "in-progress",
  Completed: "completed",
  Cancelled: "cancelled",
} as const;

export type ServiceBillingWorkspaceClientProps = {
  service: Service;
  billingState: ServiceBillingState;
  dictionary: ServicesDictionary;
  canCreateInvoices: boolean;
  canReadCost: boolean;
  supplierAllocations: SupplierAllocation[] | null;
  intent?: "deposit" | "final";
};

export default function ServiceBillingWorkspaceClient({
  service,
  billingState,
  dictionary,
  canCreateInvoices,
  canReadCost,
  supplierAllocations,
  intent,
}: ServiceBillingWorkspaceClientProps) {
  const billingDict = dictionary.billing;
  const cardsDict = billingDict.cards;
  const locale = dictionary.locale;

  const authorityLabel =
    billingState.authorityMode === "active_abs"
      ? cardsDict.billingAuthorityAbs
      : billingState.authorityMode === "legacy_quotation"
        ? cardsDict.billingAuthorityQuotation
        : billingState.authorityMode === "historical_abs_only"
          ? cardsDict.billingAuthorityHistorical
          : cardsDict.billingAuthorityNone;

  const authorityRefNumber =
    billingState.authorityMode === "legacy_quotation"
      ? (billingState.approvedQuotation?.quotationNumber ?? null)
      : null;

  return (
    <div className="flex w-full min-w-0 max-w-full flex-col gap-5 pb-12">
      {/* Top Workspace Header */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:p-5">
        <div className="flex items-center justify-between gap-3 border-b border-outline-variant/50 pb-3">
          <PendingLink
            href="/invoices"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-primary transition-colors"
          >
            <LocaleBackIcon size={14} />
            <span>{billingDict.backToInvoices}</span>
          </PendingLink>

          <Link
            href={`/services/${service.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
          >
            <span>{billingDict.viewFullService}</span>
            <ExternalLink size={14} aria-hidden="true" />
          </Link>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex min-w-0 flex-col items-start gap-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-lg font-bold text-on-surface sm:text-xl">
                {billingDict.workspacePageTitle}
              </h1>
              <span dir="ltr" className="font-mono text-sm font-semibold text-primary">
                {isolateBidiText(service.serviceNumber)}
              </span>
              <StatusBadge variant={STATUS_VARIANT_MAP[service.status]}>
                {dictionary.detail.labels.status}: {getServiceStatusLabel(locale, service.status)}
              </StatusBadge>
            </div>
            <div className="w-fit max-w-full text-start">
              <h2 dir="auto" className="text-sm font-semibold text-on-surface-variant line-clamp-2 leading-snug text-start">
                {isolateBidiText(service.serviceTitle)}
              </h2>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-on-surface-variant pt-2 border-t border-outline-variant/40">
            <PendingLink
              href={`/customers/${service.customerId}`}
              className="inline-flex max-w-[240px] sm:max-w-xs items-center gap-1.5 text-primary hover:underline font-medium min-w-0"
              title={formatCustomerName(service, dictionary)}
              dir="auto"
            >
              <UserRound size={14} className="shrink-0" />
              <span className="truncate">{formatCustomerName(service, dictionary)}</span>
            </PendingLink>
            <span dir="ltr" className="inline-flex items-center gap-1.5 tabular-nums shrink-0">
              <CalendarDays size={14} className="shrink-0" />
              {formatServiceSchedule(locale, service, dictionary)}
            </span>
            {service.eventLocation && (
              <span dir="auto" className="inline-flex max-w-[200px] items-center gap-1.5 min-w-0" title={service.eventLocation}>
                <MapPin size={14} className="shrink-0" />
                <span className="truncate">{isolateBidiText(service.eventLocation)}</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Compact Financial Metric Summary Strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-outline-variant/60 bg-surface p-3 flex flex-col justify-between min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant truncate" title={cardsDict.billingCeiling}>
            {cardsDict.billingCeiling}
          </span>
          <span className="mt-1 block font-mono text-xs sm:text-sm font-semibold text-on-surface tabular-nums truncate" dir="ltr">
            {billingState.billingCeiling != null
              ? formatSarAmount(locale, billingState.billingCeiling)
              : cardsDict.amountUnavailable}
          </span>
        </div>

        <div className="rounded-lg border border-outline-variant/60 bg-surface p-3 flex flex-col justify-between min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant truncate" title={cardsDict.priorInvoiced}>
            {cardsDict.priorInvoiced}
          </span>
          <span className="mt-1 block font-mono text-xs sm:text-sm font-semibold text-on-surface tabular-nums truncate" dir="ltr">
            {billingState.activePriorInvoiceTotal != null
              ? formatSarAmount(locale, billingState.activePriorInvoiceTotal)
              : cardsDict.exposureUnavailable}
          </span>
        </div>

        <div className="rounded-lg border border-outline-variant/60 bg-surface p-3 flex flex-col justify-between min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant truncate" title={cardsDict.remaining}>
            {cardsDict.remaining}
          </span>
          <span className="mt-1 block font-mono text-xs sm:text-sm font-semibold text-primary tabular-nums truncate" dir="ltr">
            {billingState.remainingUninvoicedAmount != null
              ? formatSarAmount(locale, billingState.remainingUninvoicedAmount)
              : cardsDict.remainingUnavailable}
          </span>
        </div>

        <div className="rounded-lg border border-outline-variant/60 bg-surface p-3 flex flex-col justify-between min-w-0">
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant truncate" title={cardsDict.billingAuthority}>
            {cardsDict.billingAuthority}
          </span>
          <div className="mt-1 flex flex-col min-w-0">
            <span className="text-xs font-semibold text-on-surface truncate" title={authorityLabel}>
              {authorityLabel}
            </span>
            {authorityRefNumber ? (
              <span dir="ltr" className="font-mono text-[11px] font-semibold text-primary truncate" title={authorityRefNumber}>
                {isolateBidiText(authorityRefNumber)}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Main Billing Actions & Authority Panel */}
      <BillingPanel
        billingState={billingState}
        dictionary={dictionary}
        canCreateInvoices={canCreateInvoices}
        serviceStatus={service.status}
        invoiceActionIntent={intent}
      />

      {/* Analytical Cost & Margin Section */}
      <ServiceCostMarginSection
        billingCeiling={billingState.billingCeiling}
        supplierAllocations={supplierAllocations}
        canReadCost={canReadCost}
        dictionary={dictionary}
      />
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
