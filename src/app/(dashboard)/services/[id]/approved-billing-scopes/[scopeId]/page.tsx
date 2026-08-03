import "server-only";

import type { ComponentProps, ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getApprovedBillingScopeByIdResult } from "@/lib/approved-billing-scopes/queries";
import { listApprovedBillingScopeLifecycleAuditEventsForServiceResult } from "@/lib/approved-billing-scopes/audit-queries";
import { deriveAbsEffectiveDisplayStatus } from "@/lib/approved-billing-scopes/mappers";
import type {
  AbsLifecycleAuditListData,
  ApprovedBillingScopeDetail,
  ApprovedBillingScopeItemDecision,
  ApprovedBillingScopeLineSafetyStatus,
} from "@/lib/approved-billing-scopes/types";
import { getInvoicesByApprovedBillingScopeId } from "@/lib/invoices/queries";
import type { Invoice } from "@/types/invoice";
import { getServiceById } from "@/lib/services/queries";
import { getServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { isTerminalServiceStatus } from "@/lib/services/status-transitions";
import { UiDateText } from "@/components/i18n/UiDateText";
import type { Locale } from "@/lib/i18n/locales";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { isolateBidiText } from "@/lib/i18n/bidi";
import { ApprovedBillingScopeDraftItemEditor } from "./ApprovedBillingScopeDraftItemEditor";
import { DiscardApprovedBillingScopeDraftAction } from "./DiscardApprovedBillingScopeDraftAction";
import { ReviewApprovedBillingScopeLineSafetyAction } from "./ReviewApprovedBillingScopeLineSafetyAction";
import { ApproveApprovedBillingScopeAction } from "./ApproveApprovedBillingScopeAction";
import { VoidApprovedBillingScopeAction } from "./VoidApprovedBillingScopeAction";
import AbsLifecycleAuditTable from "./AbsLifecycleAuditTable";

export const dynamic = "force-dynamic";

type StatusVariant = ComponentProps<typeof StatusBadge>["variant"];

const effectiveStatusVariants: Record<
  ReturnType<typeof deriveAbsEffectiveDisplayStatus>,
  StatusVariant
> = {
  draft: "draft",
  active: "approved",
  superseded: "inactive",
  voided: "cancelled",
};

const lineSafetyVariants: Record<ApprovedBillingScopeLineSafetyStatus, StatusVariant> = {
  pending_review: "pending",
  safe: "active",
  unsafe: "cancelled",
};

const decisionVariants: Record<ApprovedBillingScopeItemDecision, StatusVariant> = {
  accepted: "approved",
  adjusted: "pending",
  excluded: "cancelled",
  customer_supplied: "active",
};

export default async function ApprovedBillingScopeDetailPage({
  params,
}: {
  params: Promise<{ id: string; scopeId: string }>;
}) {
  const { id: serviceId, scopeId } = await params;
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getServicesDictionary(locale);
  const detailDictionary = dictionary.approvedBillingScopes.detail;

  try {
    await requirePermission("approvedBillingScopes:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) {
      return <AccessDenied title={dictionary.states.accessDenied} message={dictionary.states.serviceReadForbidden} />;
    }
    throw error;
  }

  const scopeResult = await getApprovedBillingScopeByIdResult(scopeId);
  if (scopeResult.status === "not_found") notFound();
  if (scopeResult.status === "error") {
    return <Unavailable dictionary={detailDictionary} />;
  }

  const scope = scopeResult.data;
  const service = await getServiceById(serviceId);
  if (!service || scope.serviceId !== service.id) notFound();

  const isDraft = scope.status === "draft";
  const [canUpdateDraftItems, canReviewDraft, canApproveDraft, canDiscardDraft, canVoidScope, canReadInvoices] = await Promise.all([
    isDraft ? checkPermission("approvedBillingScopes:update") : false,
    isDraft ? checkPermission("approvedBillingScopes:review") : false,
    isDraft ? checkPermission("approvedBillingScopes:approve") : false,
    isDraft ? checkPermission("approvedBillingScopes:discard") : false,
    checkPermission("approvedBillingScopes:void"),
    checkPermission("invoices:read"),
  ]);
  const [invoiceResult, auditResult] = await Promise.all([
    canReadInvoices
      ? getInvoicesByApprovedBillingScopeId(scope.id)
      : Promise.resolve(null),
    listApprovedBillingScopeLifecycleAuditEventsForServiceResult(service.id),
  ]);
  const audit: AbsLifecycleAuditListData | null =
    auditResult.status === "success" ? auditResult.data : null;
  const auditUnavailable = auditResult.status !== "success";
  const effectiveStatus = deriveAbsEffectiveDisplayStatus(scope);
  const voidEligible =
    canVoidScope &&
    effectiveStatus === "active" &&
    !isTerminalServiceStatus(service.status);
  const voidBlockedReason = canVoidScope
    ? effectiveStatus === "voided"
      ? detailDictionary.voidScope.blockedVoided
      : effectiveStatus === "superseded"
        ? detailDictionary.voidScope.blockedSuperseded
        : effectiveStatus !== "active"
          ? detailDictionary.voidScope.blockedNotApproved
          : isTerminalServiceStatus(service.status)
            ? detailDictionary.voidScope.blockedServiceLifecycle
            : null
    : null;

  return (
    <div className="flex flex-col gap-6 pb-12">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex items-start gap-4">
          <PendingLink
            href={`/services/${service.id}`}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface text-on-surface hover:bg-surface-container-low"
            aria-label={detailDictionary.backToService}
            title={detailDictionary.backToService}
          >
            <ArrowLeft size={18} />
          </PendingLink>
          <div className="space-y-2">
            <p className="text-[13px] text-on-surface-variant" dir="auto">
              {isolateBidiText(service.serviceNumber)} · {isolateBidiText(service.serviceTitle)}
            </p>
            <h1 className="text-[28px] leading-[36px] font-semibold text-primary">
              {detailDictionary.title}
            </h1>
          </div>
        </div>
        {((isDraft && (canReviewDraft || canApproveDraft || canDiscardDraft)) || canVoidScope) ? (
          <div className="flex flex-wrap items-center gap-2">
            {isDraft && canReviewDraft ? (
              <ReviewApprovedBillingScopeLineSafetyAction
                scopeId={scope.id}
                lineSafetyStatus={scope.lineSafetyStatus}
                dictionary={detailDictionary.reviewLineSafety}
                lineSafetyLabels={dictionary.approvedBillingScopes.lineSafetyLabels}
                reasonCodeLabels={detailDictionary.editItem.reasonCodeLabels}
              />
            ) : null}
            {isDraft && canApproveDraft ? (
              <ApproveApprovedBillingScopeAction
                scopeId={scope.id}
                sourceQuotationId={scope.sourceQuotationId}
                acceptedGrandTotal={scope.acceptedGrandTotal}
                itemCount={scope.items.length}
                billableItemCount={scope.items.filter((item) => item.acceptedGrandTotal > 0).length}
                lineSafetyStatus={scope.lineSafetyStatus}
                locale={locale}
                dictionary={detailDictionary.approveScope}
                lineSafetyLabels={dictionary.approvedBillingScopes.lineSafetyLabels}
              />
            ) : null}
            {isDraft && canDiscardDraft ? (
              <DiscardApprovedBillingScopeDraftAction
                scopeId={scope.id}
                serviceId={service.id}
                dictionary={detailDictionary.discardDraft}
              />
            ) : null}
            {voidEligible ? (
              <VoidApprovedBillingScopeAction
                scopeId={scope.id}
                dictionary={detailDictionary.voidScope}
              />
            ) : voidBlockedReason ? (
              <p className="text-[13px] text-on-surface-variant" role="status">
                {voidBlockedReason}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
        <SectionHeader title={detailDictionary.sectionSummary} />
        <dl className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 lg:grid-cols-3">
          <Field label={detailDictionary.labels.status}>
            <StatusBadge variant={effectiveStatusVariants[effectiveStatus]}>
              {scopeStatusLabel(scope, dictionary)}
            </StatusBadge>
          </Field>
          <Field label={detailDictionary.labels.version} value={formatNumber(locale, scope.scopeVersion)} dir="ltr" />
          <Field label={detailDictionary.labels.lineSafety}>
            <StatusBadge variant={lineSafetyVariants[scope.lineSafetyStatus]}>
              {dictionary.approvedBillingScopes.lineSafetyLabels[scope.lineSafetyStatus]}
            </StatusBadge>
          </Field>
          <Field label={detailDictionary.labels.acceptedGrandTotal} value={formatSar(locale, scope.acceptedGrandTotal)} dir="ltr" />
          <Field label={detailDictionary.labels.createdAt} value={formatDate(locale, scope.createdAt)} />
          {scope.approvedAt && (
            <Field label={detailDictionary.labels.approvedAt} value={formatDate(locale, scope.approvedAt)} />
          )}
          {scope.voidedAt && (
            <Field label={detailDictionary.labels.voidedAt} value={formatDate(locale, scope.voidedAt)} />
          )}
          {scope.voidReason && (
            <Field label={detailDictionary.labels.voidReason} value={isolateBidiText(scope.voidReason)} dir="auto" />
          )}
        </dl>
      </section>

      <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
        <SectionHeader title={detailDictionary.sectionItems} />
        {scope.items.length === 0 ? (
          <div className="p-6 text-[14px] text-on-surface-variant">{detailDictionary.noItems}</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left">
              <thead>
                <tr className="border-b border-surface-variant bg-surface-container-low">
                  <Th>{detailDictionary.labels.description}</Th>
                  <Th>{detailDictionary.labels.category}</Th>
                  <Th>{detailDictionary.labels.decision}</Th>
                  <Th>{detailDictionary.labels.acceptedQuantity}</Th>
                  <Th>{detailDictionary.labels.unitPrice}</Th>
                  <Th>{detailDictionary.labels.lineTotal}</Th>
                  {canUpdateDraftItems ? <Th>{detailDictionary.editItem.trigger}</Th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px]">
                {scope.items.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-4 align-top">
                      <div className="font-medium text-on-surface" dir="auto">{isolateBidiText(item.sourceDescription)}</div>
                      {item.sourceDetails && <div className="mt-1 text-[12px] text-on-surface-variant" dir="auto">{isolateBidiText(item.sourceDetails)}</div>}
                    </td>
                    <td className="px-4 py-4 align-top text-on-surface-variant" dir="auto">{item.sourceCategory ? isolateBidiText(item.sourceCategory) : "—"}</td>
                    <td className="px-4 py-4 align-top"><StatusBadge variant={decisionVariants[item.decision]}>{detailDictionary.itemDecisionLabels[item.decision]}</StatusBadge></td>
                    <td className="px-4 py-4 align-top text-on-surface tabular-nums" dir="ltr">{formatNumber(locale, item.acceptedQty)}</td>
                    <td className="px-4 py-4 align-top text-on-surface tabular-nums" dir="ltr">{formatSar(locale, item.acceptedUnitPrice)}</td>
                    <td className="px-4 py-4 align-top font-medium text-on-surface tabular-nums" dir="ltr">{formatSar(locale, item.acceptedGrandTotal)}</td>
                    {canUpdateDraftItems ? (
                      <td className="px-4 py-4 align-top">
                        <ApprovedBillingScopeDraftItemEditor
                          scopeId={scope.id}
                          sourceVatRate={scope.sourceVatRate}
                          item={item}
                          locale={locale}
                          dictionary={detailDictionary.editItem}
                          decisionLabels={detailDictionary.itemDecisionLabels}
                        />
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {canReadInvoices && (
        <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
          <SectionHeader title={detailDictionary.sectionInvoices} />
          {invoiceResult?.status === "error" ? (
            <div className="p-6 text-[14px] text-on-surface-variant">{detailDictionary.invoicesUnavailable}</div>
          ) : invoiceResult?.data.length === 0 ? (
            <div className="p-6 text-[14px] text-on-surface-variant">{detailDictionary.noInvoices}</div>
          ) : (
            <div className="divide-y divide-surface-variant">
              {invoiceResult?.data.map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  dictionary={detailDictionary}
                  locale={locale}
                />
              ))}
            </div>
          )}
        </section>
      )}

      <AbsLifecycleAuditTable
        locale={locale}
        dictionary={dictionary.approvedBillingScopes}
        audit={audit}
        unavailable={auditUnavailable}
      />
    </div>
  );
}

function AccessDenied({ title, message }: { title: string; message: string }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-4"><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h2 className="mb-2 text-xl font-semibold text-slate-900">{title}</h2><p className="text-sm text-slate-500">{message}</p></div></div>;
}

function Unavailable({ dictionary }: { dictionary: ReturnType<typeof getServicesDictionary>["approvedBillingScopes"]["detail"] }) {
  return <div className="flex min-h-[60vh] items-center justify-center px-4"><div className="w-full max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm"><h2 className="mb-2 text-xl font-semibold text-slate-900">{dictionary.title}</h2><p className="text-sm text-slate-500">{dictionary.unavailable}</p></div></div>;
}

function SectionHeader({ title }: { title: string }) {
  return <div className="border-b border-surface-variant bg-surface-bright px-6 py-4"><h2 className="font-semibold text-primary">{title}</h2></div>;
}

function Field({ label, value, dir, children }: { label: string; value?: ReactNode; dir?: "ltr" | "auto"; children?: ReactNode }) {
  return <div><dt className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</dt><dd className="font-medium text-on-surface" dir={dir}>{children ?? value}</dd></div>;
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 text-[12px] font-semibold uppercase text-on-surface-variant">{children}</th>;
}

function InvoiceRow({
  invoice,
  dictionary,
  locale,
}: {
  invoice: Invoice;
  dictionary: ReturnType<typeof getServicesDictionary>["approvedBillingScopes"]["detail"];
  locale: Locale;
}) {
  return (
    <div className="flex flex-col gap-3 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-[14px] sm:grid-cols-5">
        <Field label={dictionary.labels.invoiceNumber} value={invoice.invoice_number} dir="ltr" />
        <Field label={dictionary.labels.invoiceType} value={dictionary.invoiceTypeLabels[invoice.invoice_type]} />
        <Field label={dictionary.labels.invoiceStatus} value={dictionary.invoiceStatusLabels[invoice.status]} />
        <Field
          label={dictionary.labels.grandTotal}
          value={formatSarAmount(locale, invoice.grand_total)}
          dir="ltr"
        />
        <Field
          label={dictionary.labels.issueDate}
          value={formatDate(locale, invoice.issued_at ?? invoice.created_at)}
        />
      </div>
      <PendingLink
        href={`/invoices/${invoice.id}`}
        className="shrink-0 text-[13px] font-semibold text-primary hover:underline"
      >
        {dictionary.viewDetails}
      </PendingLink>
    </div>
  );
}

function scopeStatusLabel(scope: ApprovedBillingScopeDetail, dictionary: ReturnType<typeof getServicesDictionary>) {
  const effectiveStatus = deriveAbsEffectiveDisplayStatus(scope);
  return effectiveStatus === "active"
    ? dictionary.approvedBillingScopes.active
    : dictionary.approvedBillingScopes.effectiveStatusLabels[effectiveStatus];
}

function formatNumber(locale: Locale, value: number) {
  return formatUiNumber(locale, value, { maximumFractionDigits: 2 });
}

function formatSar(locale: Locale, value: number) {
  return formatSarAmount(locale, value);
}

function formatDate(locale: Locale, value: string) {
  return <UiDateText locale={locale} value={value} />;
}
