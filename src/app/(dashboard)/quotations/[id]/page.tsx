import { notFound, redirect } from "next/navigation";
import StatusBadge from "@/components/ui/StatusBadge";
import { Printer, FileEdit } from "lucide-react";
import { LocaleBackIcon } from "@/components/i18n/LocaleBackIcon";
import Link from "next/link";
import PendingLink from "@/components/ui/PendingLink";
import Button from "@/components/ui/Button";
import { getQuotationByIdResult } from "@/lib/quotations/queries";
import { requirePermission, checkPermission } from "@/lib/auth/permissions";
import { SERVICE_BILLING_SUMMARY_PERMISSIONS } from "@/lib/auth/role-permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { getQuotationStatusLabel, getQuotationsDictionary } from "@/lib/i18n/dictionaries/quotations";
import { getCommonDictionary } from "@/lib/i18n/dictionaries/common";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import { Suspense, type ComponentProps } from "react";
import QuotationApprovalActions from "./QuotationApprovalActions";
import { getServiceById } from "@/lib/services/queries";
import { getServiceBillingState } from "@/lib/invoices";
import { buildQuotationBillingAuthority } from "@/lib/quotations/billing-authority";
import QuotationBillingAuthorityCard from "./QuotationBillingAuthorityCard";
import RecordNavigationSlot from "@/components/records/RecordNavigationSlot";
import { RecordNavigationPlaceholder } from "@/components/records/RecordNavigation";
import { getRecordNavigationDictionary } from "@/lib/i18n/dictionaries/record-navigation";
import { getQuotationRecordNavigation, safeRecordReturnTo } from "@/lib/record-navigation/queries";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

async function QuotationBillingAuthoritySection({
  quotationId,
  serviceId,
  dictionary,
}: {
  quotationId: string;
  serviceId: string;
  dictionary: ReturnType<typeof getQuotationsDictionary>;
}) {
  let linkedService: Awaited<ReturnType<typeof getServiceById>> = null;
  let billingState: Awaited<ReturnType<typeof getServiceBillingState>> | null = null;

  try {
    if (await checkPermission(SERVICE_BILLING_SUMMARY_PERMISSIONS.read)) {
      linkedService = await getServiceById(serviceId);
      billingState = linkedService ? await getServiceBillingState(linkedService.id) : null;
    }
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    linkedService = null;
    billingState = null;
  }

  const billingAuthority = buildQuotationBillingAuthority({
    quotationId,
    linkedServiceId: linkedService?.id ?? null,
    billingState,
  });

  return (
    <div data-p2-detail-secondary-complete="true">
      <QuotationBillingAuthorityCard authority={billingAuthority} dictionary={dictionary} />
    </div>
  );
}

function QuotationSecondaryLoading({ label }: { label: string }) {
  return (
    <div role="status" aria-label={label} className="rounded-xl border border-surface-variant bg-surface-container-lowest p-6 text-[14px] text-on-surface-variant">
      {label}
    </div>
  );
}

export default async function QuotationDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ returnTo?: string }>;
}) {
  const localePromise = getCurrentSessionEffectiveLocale();
  const [{ id }, resolvedSearchParams] = await Promise.all([params, searchParams]);
  const returnTo = safeRecordReturnTo(resolvedSearchParams.returnTo, "/quotations");
  const pageReadAuthorizationResult = await requirePermission("quotations:read")
    .then(() => ({ status: "fulfilled" as const }))
    .catch((reason: unknown) => ({ status: "rejected" as const, reason }));

  if (pageReadAuthorizationResult.status === "rejected") {
    const locale = await localePromise;
    const dictionary = getQuotationsDictionary(locale);
    const error = pageReadAuthorizationResult.reason;
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

  const quotationResultPromise = getQuotationByIdResult(id);
  const [locale, quotationResult] = await Promise.all([localePromise, quotationResultPromise]);
  const dictionary = getQuotationsDictionary(locale);

  if (quotationResult.status === "not_found") {
    notFound();
  }

  if (quotationResult.status === "error") {
    return (
      <div role="alert" className="flex min-h-[40vh] flex-col items-center justify-center gap-3 px-4 text-center">
        <h2 className="text-[24px] font-semibold text-on-surface">{dictionary.states.genericError}</h2>
        <p className="text-[14px] text-on-surface-variant">{dictionary.states.quotationsLoadError}</p>
      </div>
    );
  }

  const { quotation } = quotationResult;

  const recordNavigationDictionary = getRecordNavigationDictionary(locale);

  const [canApprove, canWrite] = await Promise.all([
    checkPermission("quotations:approve"),
    checkPermission("quotations:write"),
  ]);

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
    <div data-p2-detail-primary-ready="true" className="flex flex-col gap-6 pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <PendingLink
            href={returnTo}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-label={getCommonDictionary(locale).actions.back}
          >
            <LocaleBackIcon size={16} />
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
              loadNavigation={() => getQuotationRecordNavigation(id, quotation.quotationNumber)}
              basePath="/quotations"
              recordType={dictionary.list.title}
              dictionary={recordNavigationDictionary}
              returnTo={returnTo}
              pendingLabel={dictionary.list.navigationPending}
            />
          </Suspense>
          <div aria-hidden="true" className="hidden h-6 w-px bg-surface-variant sm:block" />
          {(canApprove || canWrite) && (
            <QuotationApprovalActions
              quotationId={quotation.id}
              status={quotation.status}
              canApprove={canApprove}
              canWrite={canWrite}
              dictionary={dictionary.approval}
              listDictionary={dictionary.list}
            />
          )}
          {canWrite && (quotation.status === "draft" ? (
            <Button asChild variant="outline" size="sm" className="h-9 min-h-9 whitespace-nowrap">
              <PendingLink href={`/quotations/${quotation.id}/edit`}>
                <span className="inline-flex items-center gap-2 whitespace-nowrap">
                  <FileEdit size={16} />
                  <span>{dictionary.detail.actions.edit}</span>
                </span>
              </PendingLink>
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9 min-h-9 whitespace-nowrap"
              disabled
              title={dictionary.list.actionTitles.onlyDraftEditable}
              aria-label={dictionary.list.actionTitles.onlyDraftEditable}
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <FileEdit size={16} aria-hidden="true" />
                <span>{dictionary.detail.actions.edit}</span>
              </span>
            </Button>
          ))}
          <Button asChild variant="outline" size="sm" className="h-9 min-h-9 whitespace-nowrap">
            <Link
              href={`/quotations/${quotation.id}/pdf`}
              target="_blank"
            >
              <span className="inline-flex items-center gap-2 whitespace-nowrap">
                <Printer size={16} />
                <span>{dictionary.detail.actions.printPdf}</span>
              </span>
            </Link>
          </Button>
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
                <div className="text-on-surface font-medium text-start">
                  <bdi dir="auto">{quotation.customer?.company || dictionary.detail.states.unknownCompany}</bdi>
                </div>
              </div>
              <div>
                <div className="text-[12px] uppercase text-on-surface-variant font-semibold tracking-wider mb-1">
                  {dictionary.detail.labels.eventName}
                </div>
                <div className="text-on-surface font-medium text-start">
                  <bdi dir="auto">{quotation.event}</bdi>
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
              <table className="w-full min-w-[760px] table-fixed text-start">
                <colgroup>
                  <col className="w-[6%]" />
                  <col className="w-[44%]" />
                  <col className="w-[10%]" />
                  <col className="w-[20%]" />
                  <col className="w-[20%]" />
                </colgroup>
                <thead>
                  <tr className="bg-surface-container-low border-b border-surface-variant">
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-center">
                      #
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-start">
                      {dictionary.detail.labels.service}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-center">
                      {dictionary.detail.labels.qty}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-end">
                      {dictionary.detail.labels.unitSar}
                    </th>
                    <th className="px-4 py-3 text-[12px] font-semibold text-on-surface-variant uppercase text-end">
                      {dictionary.detail.labels.totalSar}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-variant text-[14px]">
                  {quotation.items.map((item, i) => (
                    <tr key={i}>
                      <td className="px-4 py-4 text-center text-on-surface-variant align-top">
                        <span dir="ltr">{i + 1}</span>
                      </td>
                      <td className="px-4 py-4 text-start align-top">
                        <div className="font-semibold text-on-surface mb-1">
                          <bdi dir="auto">{item.description}</bdi>
                        </div>
                        <div className="text-[12px] text-on-surface-variant leading-relaxed">
                          <bdi dir="auto">{item.details}</bdi>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-center text-on-surface align-top">
                        <span dir="ltr">{formatQuantity(item.qty)}</span>
                      </td>
                      <td className="px-4 py-4 text-end text-on-surface align-top">
                        <span dir="ltr">{formatMoney(item.unitPrice)}</span>
                      </td>
                      <td className="px-4 py-4 text-end font-medium text-on-surface align-top">
                        <span dir="ltr">{formatMoney(item.total)}</span>
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
            <Suspense fallback={<QuotationSecondaryLoading label={getCommonDictionary(locale).shared.loading.workspace} />}>
              <QuotationBillingAuthoritySection quotationId={quotation.id} serviceId={quotation.serviceId} dictionary={dictionary} />
            </Suspense>
          )}
        </div>
      </div>
    </div>
  );
}
