import { notFound, redirect } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import { Printer, FileEdit } from "lucide-react";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import Link from "next/link";
import PendingLink from "@/components/ui/PendingLink";
import { getQuotationById } from "@/lib/quotations/queries";
import { requirePermission, checkPermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getQuotationStatusLabel, getQuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import type { ComponentProps } from "react";
import QuotationApprovalActions from "./QuotationApprovalActions";
import { getServiceById } from "@/lib/services/queries";
import { getServiceBillingState } from "@/lib/invoices";
import { buildQuotationBillingAuthority } from "@/lib/quotations/billing-authority";
import QuotationBillingAuthorityCard from "./QuotationBillingAuthorityCard";
import RecordNavigation from "@/components/records/RecordNavigation";
import { getRecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import { getQuotationRecordNavigation, safeRecordReturnTo } from "@/lib/record-navigation/queries";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

export default async function QuotationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const { id } = await params;
  const resolvedSearchParams = await searchParams;
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, "/quotations");
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getQuotationsDictionary(locale);

  try {
    await requirePermission("quotations:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      redirect("/sign-in");
    }
    if (error instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="text-error mb-2">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h2 className="text-[24px] font-semibold text-on-surface">
            {dictionary.states.accessDenied}
          </h2>
          <p className="text-on-surface-variant text-[14px]">
            {dictionary.detail.states.detailForbidden}
          </p>
          <Link
            href="/dashboard"
            className="mt-4 px-4 py-2 bg-primary text-on-primary rounded-lg text-[14px] font-semibold hover:bg-primary-container transition-colors"
          >
            {dictionary.actions.backToDashboard}
          </Link>
        </div>
      );
    }
    throw error;
  }

  const quotation = await getQuotationById(id);

  if (!quotation) {
    notFound();
  }

  const recordNavigation = await getQuotationRecordNavigation(id, quotation.quotationNumber);
  const recordNavigationDictionary = getRecordNavigationDictionary(locale);

  const [canApprove, linkedService] = await Promise.all([
    checkPermission("quotations:approve"),
    getServiceById(quotation.serviceId),
  ]);
  const billingState = linkedService
    ? await getServiceBillingState(linkedService.id)
    : null;
  const billingAuthority = buildQuotationBillingAuthority({
    quotationId: quotation.id,
    linkedServiceId: linkedService?.id ?? null,
    billingState,
  });

  const formatMoney = (val: number | null | undefined) =>
    formatSarAmount(locale, val ?? 0);
  const formatQuantity = (val: number | null | undefined) =>
    formatUiNumber(locale, val ?? 0, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    });
  const isTaxVatNotApplied = quotation.vatRate === 0 && quotation.vatAmount === 0;
  const formatCopy = (template: string, values: Record<string, string | number>) =>
    template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? ""));

  return (
    <div className="flex flex-col gap-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <PendingLink
            href={returnTo}
            className="p-2 bg-surface border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low transition-colors"
          >
            <LocaleBackIcon size={18} />
          </PendingLink>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-[28px] leading-[36px] font-semibold text-primary font-mono tracking-tight" dir="ltr">
                {isolateBidiText(quotation.quotationNumber)}
              </h2>
              <StatusBadge variant={quotation.status as StatusBadgeVariant}>
                {getQuotationStatusLabel(dictionary.locale, quotation.status)}
              </StatusBadge>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <RecordNavigation basePath="/quotations" recordType={dictionary.list.title} navigation={recordNavigation} dictionary={recordNavigationDictionary} returnTo={returnTo} />
          {canApprove && (quotation.status === "draft" || quotation.status === "sent") && (
            <QuotationApprovalActions quotationId={quotation.id} status={quotation.status} dictionary={dictionary.approval} />
          )}
          {quotation.status === "draft" && (
            <PendingLink
              href={`/quotations/${quotation.id}/edit`}
              className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg text-on-surface hover:bg-surface-container-low text-[14px] font-semibold transition-colors"
            >
              <FileEdit size={18} />
              {dictionary.detail.actions.edit}
            </PendingLink>
          )}
          <Link
            href={`/quotations/${quotation.id}/pdf`}
            target="_blank"
            className="flex items-center gap-2 px-4 py-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low rounded-lg text-[14px] font-semibold transition-colors"
          >
            <Printer size={18} />
            {dictionary.detail.actions.printPdf}
          </Link>
        </div>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (Main details) */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Info Card */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-semibold text-primary">{dictionary.detail.sections.details}</h3>
            </div>
            <div className="p-6 grid grid-cols-2 gap-6">
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  {dictionary.detail.labels.client}
                </div>
                <div className="text-on-surface font-medium" dir="auto">
                  {quotation.customer?.company || dictionary.detail.states.unknownCompany}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  {dictionary.detail.labels.eventName}
                </div>
                <div className="text-on-surface font-medium" dir="auto">
                  {quotation.event}
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  {dictionary.detail.labels.issueDate}
                </div>
                <div className="text-on-surface font-medium">
                  <UiDateText locale={locale} value={quotation.date} />
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  {dictionary.detail.labels.validUntil}
                </div>
                <div className="text-on-surface font-medium">
                  {quotation.validUntil ? (
                    <UiDateText locale={locale} value={quotation.validUntil} />
                  ) : (
                    "—"
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-semibold text-primary">{dictionary.detail.sections.lineItems}</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase w-12">
                      #
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase">
                      {dictionary.detail.labels.service}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-center w-16">
                      {dictionary.detail.labels.qty}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right">
                      {dictionary.detail.labels.unitSar}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-right">
                      {dictionary.detail.labels.totalSar}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant text-[14px]">
                  {quotation.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4 text-on-surface-variant align-top" dir="ltr">
                        {i + 1}
                      </td>
                      <td className="px-4 py-4 align-top">
                        <div className="font-semibold text-on-surface mb-1" dir="auto">
                          {item.description}
                        </div>
                        <div className="text-[12px] text-on-surface-variant leading-relaxed" dir="auto">
                          {item.details}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-on-surface align-top" dir="ltr">
                        {formatQuantity(item.qty)}
                      </td>
                      <td className="px-4 py-4 text-right text-on-surface align-top" dir="ltr">
                        {formatMoney(item.unitPrice)}
                      </td>
                      <td className="px-4 py-4 text-right font-medium text-on-surface align-top" dir="ltr">
                        {formatMoney(item.total)}
                      </td>
                    </tr>
                  ))}
                  {quotation.items.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-8 text-center text-on-surface-variant"
                      >
                        {dictionary.detail.states.noLineItems}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column (Summary & Actions) */}
        <div className="flex flex-col gap-6">
          {/* Financial Summary */}
          <div className="bg-surface-container-lowest border border-surface-variant rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-surface-variant bg-surface-bright flex justify-between items-center">
              <h3 className="font-semibold text-primary">{dictionary.detail.sections.financialSummary}</h3>
            </div>
            <div className="p-6">
              <div className="space-y-3">
                <div className="flex justify-between gap-4 text-[14px] text-on-surface-variant">
                  <span>{dictionary.detail.labels.subtotal}</span>
                  <span dir="ltr" className="tabular-nums">
                    {formatMoney(quotation.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[14px] text-on-surface-variant">
                  <span>{dictionary.detail.labels.discount}</span>
                  <span dir="ltr" className="tabular-nums">
                    {formatMoney(quotation.discount)}
                  </span>
                </div>
                <div className="flex justify-between gap-4 text-[14px] text-on-surface-variant">
                  <span>
                    {isTaxVatNotApplied
                      ? dictionary.detail.labels.taxVat
                      : formatCopy(dictionary.detail.vatWithRate, {
                          rate: formatUiNumber(locale, quotation.vatRate, {
                            maximumFractionDigits: 2,
                          }),
                        })}
                  </span>
                  <span dir="ltr" className="tabular-nums">
                    {isTaxVatNotApplied
                      ? dictionary.detail.states.notApplied
                      : formatMoney(quotation.vatAmount)}
                  </span>
                </div>
                <div className="border-t border-surface-variant pt-3 mt-3 flex justify-between gap-4">
                  <span className="font-semibold text-[18px] text-primary">
                    {dictionary.detail.labels.grandTotal}
                  </span>
                  <span dir="ltr" className="font-semibold text-[18px] text-primary tabular-nums">
                    {formatMoney(quotation.grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Canonical Service billing authority */}
          {quotation.status === "approved" && (
            <QuotationBillingAuthorityCard
              authority={billingAuthority}
              dictionary={dictionary}
            />
          )}
        </div>
      </div>
    </div>
  );
}
