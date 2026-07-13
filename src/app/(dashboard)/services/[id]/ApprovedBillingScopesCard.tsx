import type { ComponentProps, ReactNode } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { listApprovedBillingScopesForServiceResult } from "@/lib/approved-billing-scopes/queries";
import {
  buildAbsCardBillingSnapshot,
  pickAbsCardScopes,
  resolveAbsCardMoneyFields,
  resolveAbsCardScenario,
  resolveDraftCreateContext,
  resolveSourceQuotationNumber,
  type AbsCardEffectiveStatus,
  type AbsCardMoneyField,
  type AbsCardScenario,
} from "@/lib/approved-billing-scopes/card-view-model";
import type {
  ApprovedBillingScopeLineSafetyStatus,
  ApprovedBillingScopeSummary,
} from "@/lib/approved-billing-scopes/types";
import type { ServiceBillingState } from "@/lib/invoices/types";
import { isTerminalServiceStatus } from "@/lib/services/status-transitions";
import type { ServiceStatus } from "@/types/service";
import CreateApprovedBillingScopeDraftAction from "./CreateApprovedBillingScopeDraftAction";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const EFFECTIVE_STATUS_VARIANTS: Record<AbsCardEffectiveStatus, StatusBadgeVariant> = {
  draft: "draft",
  active: "approved",
  superseded: "inactive",
  voided: "cancelled",
};

const LINE_SAFETY_VARIANTS: Record<
  ApprovedBillingScopeLineSafetyStatus,
  StatusBadgeVariant
> = {
  pending_review: "pending",
  safe: "active",
  unsafe: "cancelled",
};

type ApprovedBillingScopesCardProps = {
  serviceId: string;
  dictionary: ServicesDictionary;
  billingState: ServiceBillingState;
  serviceStatus: ServiceStatus;
  canReadInvoices: boolean;
  canReadQuotations: boolean;
  /** `approvedBillingScopes:create` — UI gate only; server action remains authoritative. */
  canCreateDraft: boolean;
  /** Safe quotation number lookup by id (from related quotations when permitted). */
  quotationNumbersById: Readonly<Record<string, string>>;
};

export default async function ApprovedBillingScopesCard({
  serviceId,
  dictionary,
  billingState,
  serviceStatus,
  canReadInvoices,
  canReadQuotations,
  canCreateDraft,
  quotationNumbersById,
}: ApprovedBillingScopesCardProps) {
  const cardDictionary = dictionary.approvedBillingScopes;
  const scopeResult = await listApprovedBillingScopesForServiceResult(serviceId);

  const scopesLoadError = scopeResult.status === "error";
  const scopes = scopeResult.status === "success" ? scopeResult.data : [];

  const billing = buildAbsCardBillingSnapshot({
    approvedQuotation: billingState.approvedQuotation,
    activePriorInvoiceTotal: billingState.activePriorInvoiceTotal,
    remainingUninvoicedAmount: billingState.remainingUninvoicedAmount,
    disabledReasons: billingState.disabledReasons,
  });

  const scenario = resolveAbsCardScenario({
    scopesLoadError,
    scopes,
    hasApprovedQuotation: billing.hasApprovedQuotation,
  });

  const draftCreate = resolveDraftCreateContext(scopes, billingState, {
    scopesLoadError,
    serviceLifecycleEligible: !isTerminalServiceStatus(serviceStatus),
  });
  // Completeness: listApprovedBillingScopesForServiceResult (no status filter)
  // returns draft, approved, voided, and superseded-derived rows for the Service.
  const sourceQuotationNumber =
    draftCreate.sourceQuotationId == null
      ? null
      : resolveSourceQuotationNumber({
          sourceQuotationId: draftCreate.sourceQuotationId,
          quotationNumbersById,
          billingQuotation: billingState.approvedQuotation
            ? {
                id: billingState.approvedQuotation.id,
                quotationNumber: billingState.approvedQuotation.quotationNumber,
              }
            : null,
        }) ?? billing.approvedQuotationNumber;

  if (scenario === "unavailable") {
    return (
      <ScopeCardShell title={cardDictionary.title} subtitle={cardDictionary.subtitle}>
        <p className="text-[14px] leading-[20px] text-on-surface-variant">
          {cardDictionary.unavailable}
        </p>
      </ScopeCardShell>
    );
  }

  if (scenario === "no_approved_quotation") {
    return (
      <ScopeCardShell title={cardDictionary.title} subtitle={cardDictionary.subtitle}>
        <p className="text-[14px] leading-[20px] text-on-surface-variant">
          {cardDictionary.noApprovedQuotation}
        </p>
        {canReadQuotations && (
          <p className="mt-3">
            <a
              href="#related-quotations"
              className="text-[13px] font-semibold text-primary hover:underline"
            >
              {cardDictionary.viewRelatedQuotations}
            </a>
          </p>
        )}
      </ScopeCardShell>
    );
  }

  if (scenario === "legacy_quotation_only") {
    const money = resolveAbsCardMoneyFields({
      scenario,
      primary: null,
      billing,
      canReadInvoices,
    });
    const quotationNumber =
      resolveSourceQuotationNumber({
        sourceQuotationId: billing.approvedQuotationId,
        quotationNumbersById,
        billingQuotation: billingState.approvedQuotation
          ? {
              id: billingState.approvedQuotation.id,
              quotationNumber: billingState.approvedQuotation.quotationNumber,
            }
          : null,
      }) ?? billing.approvedQuotationNumber;

    return (
      <ScopeCardShell title={cardDictionary.title} subtitle={cardDictionary.subtitle}>
        <p className="mb-5 text-[14px] leading-[20px] text-on-surface-variant">
          {cardDictionary.legacyQuotationAuthority}
        </p>
        <dl className="mb-5 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          <ScopeDetail
            label={cardDictionary.labels.sourceQuotation}
            value={
              quotationNumber ? (
                <span dir="ltr" className="font-mono tabular-nums">
                  {isolateBidiText(quotationNumber)}
                </span>
              ) : (
                cardDictionary.sourceQuotationUnavailable
              )
            }
          />
          <MoneyDetail
            label={cardDictionary.labels.billingCeiling}
            field={money.ceiling}
            locale={dictionary.locale}
            restrictedLabel={cardDictionary.invoiceTotalsRestricted}
            unavailableLabel={cardDictionary.unavailable}
          />
          <MoneyDetail
            label={cardDictionary.labels.invoicedAmount}
            field={money.invoiced}
            locale={dictionary.locale}
            restrictedLabel={cardDictionary.invoiceTotalsRestricted}
            unavailableLabel={cardDictionary.invoiceTotalsUnavailable}
          />
          <MoneyDetail
            label={cardDictionary.labels.remainingBillable}
            field={money.remaining}
            locale={dictionary.locale}
            restrictedLabel={cardDictionary.invoiceTotalsRestricted}
            unavailableLabel={cardDictionary.invoiceTotalsUnavailable}
          />
        </dl>
        {canCreateDraft &&
          draftCreate.showCreateDraft &&
          draftCreate.sourceQuotationId && (
            <CreateApprovedBillingScopeDraftAction
              serviceId={serviceId}
              sourceQuotationId={draftCreate.sourceQuotationId}
              sourceQuotationNumber={sourceQuotationNumber}
              existingDraftScopeId={null}
              dictionary={cardDictionary.createDraft}
              viewDraftLabel={cardDictionary.viewDraft}
            />
          )}
      </ScopeCardShell>
    );
  }

  return (
    <ScopeSummaryCard
      serviceId={serviceId}
      scopes={scopes}
      scenario={scenario}
      dictionary={dictionary}
      billing={billing}
      billingState={billingState}
      canReadInvoices={canReadInvoices}
      quotationNumbersById={quotationNumbersById}
    />
  );
}

function ScopeSummaryCard({
  serviceId,
  scopes,
  scenario,
  dictionary,
  billing,
  billingState,
  canReadInvoices,
  quotationNumbersById,
}: {
  serviceId: string;
  scopes: ApprovedBillingScopeSummary[];
  scenario: Exclude<AbsCardScenario, "unavailable" | "no_approved_quotation" | "legacy_quotation_only">;
  dictionary: ServicesDictionary;
  billing: ReturnType<typeof buildAbsCardBillingSnapshot>;
  billingState: ServiceBillingState;
  canReadInvoices: boolean;
  quotationNumbersById: Readonly<Record<string, string>>;
}) {
  const cardDictionary = dictionary.approvedBillingScopes;
  const pick = pickAbsCardScopes(scopes);
  const primary = pick.primary;
  if (!primary || !pick.effectiveStatus) {
    return (
      <ScopeCardShell title={cardDictionary.title} subtitle={cardDictionary.subtitle}>
        <p className="text-[14px] leading-[20px] text-on-surface-variant">
          {cardDictionary.empty}
        </p>
      </ScopeCardShell>
    );
  }

  const money = resolveAbsCardMoneyFields({
    scenario,
    primary,
    billing,
    canReadInvoices,
  });

  const sourceQuotationNumber = resolveSourceQuotationNumber({
    sourceQuotationId: primary.sourceQuotationId,
    quotationNumbersById,
    billingQuotation: billingState.approvedQuotation
      ? {
          id: billingState.approvedQuotation.id,
          quotationNumber: billingState.approvedQuotation.quotationNumber,
        }
      : null,
  });

  const statusLabel =
    pick.effectiveStatus === "active"
      ? cardDictionary.active
      : cardDictionary.effectiveStatusLabels[pick.effectiveStatus];

  const detailHref = `/services/${serviceId}/approved-billing-scopes/${primary.id}`;
  const draftHref =
    pick.draft && pick.draft.id !== primary.id
      ? `/services/${serviceId}/approved-billing-scopes/${pick.draft.id}`
      : null;

  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-3 border-b border-surface-variant bg-surface-bright px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-semibold text-primary">{cardDictionary.title}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
            {cardDictionary.subtitle}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant={EFFECTIVE_STATUS_VARIANTS[pick.effectiveStatus]}>
            {statusLabel}
          </StatusBadge>
          <PendingLink
            href={detailHref}
            className="text-[13px] font-semibold text-primary hover:underline"
            pendingLabel={cardDictionary.viewDetails}
          >
            {cardDictionary.viewDetails}
          </PendingLink>
        </div>
      </div>

      {scenario === "historical_only" && (
        <div className="border-b border-surface-variant bg-surface px-6 py-3 text-[13px] leading-[18px] text-on-surface-variant">
          {cardDictionary.historicalNotAuthority}
        </div>
      )}

      {money.usesLegacyQuotationAuthority &&
        (scenario === "draft_only" || scenario === "historical_only") && (
          <div className="border-b border-surface-variant bg-surface px-6 py-3 text-[13px] leading-[18px] text-on-surface-variant">
            {cardDictionary.legacyQuotationAuthority}
          </div>
        )}

      {pick.hasDraftRevision && (
        <div className="flex flex-col gap-2 border-b border-surface-variant bg-surface px-6 py-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] font-medium text-on-surface">
            {cardDictionary.draftRevisionExists}
          </p>
          {draftHref && (
            <PendingLink
              href={draftHref}
              className="text-[13px] font-semibold text-primary hover:underline"
              pendingLabel={cardDictionary.viewDraft}
            >
              {cardDictionary.viewDraft}
            </PendingLink>
          )}
        </div>
      )}

      <dl className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-2 xl:grid-cols-3">
        <ScopeDetail
          label={cardDictionary.labels.version}
          value={
            <span dir="ltr" className="tabular-nums">
              {isolateBidiText(`${cardDictionary.versionPrefix} ${primary.scopeVersion}`)}
            </span>
          }
        />
        <ScopeDetail
          label={cardDictionary.labels.sourceQuotation}
          value={
            sourceQuotationNumber ? (
              <span dir="ltr" className="font-mono tabular-nums">
                {isolateBidiText(sourceQuotationNumber)}
              </span>
            ) : (
              <span className="text-on-surface-variant">
                {cardDictionary.sourceQuotationUnavailable}
              </span>
            )
          }
        />
        <ScopeDetail
          label={cardDictionary.labels.lineSafety}
          value={
            <StatusBadge variant={LINE_SAFETY_VARIANTS[primary.lineSafetyStatus]}>
              {cardDictionary.lineSafetyLabels[primary.lineSafetyStatus]}
            </StatusBadge>
          }
        />
        <MoneyDetail
          label={cardDictionary.labels.billingCeiling}
          field={money.ceiling}
          locale={dictionary.locale}
          restrictedLabel={cardDictionary.invoiceTotalsRestricted}
          unavailableLabel={cardDictionary.unavailable}
        />
        <MoneyDetail
          label={cardDictionary.labels.acceptedGrandTotal}
          field={{ kind: "value", amount: primary.acceptedGrandTotal }}
          locale={dictionary.locale}
          restrictedLabel={cardDictionary.invoiceTotalsRestricted}
          unavailableLabel={cardDictionary.unavailable}
        />
        <MoneyDetail
          label={cardDictionary.labels.invoicedAmount}
          field={money.invoiced}
          locale={dictionary.locale}
          restrictedLabel={cardDictionary.invoiceTotalsRestricted}
          unavailableLabel={cardDictionary.invoiceTotalsUnavailable}
        />
        <MoneyDetail
          label={cardDictionary.labels.remainingBillable}
          field={money.remaining}
          locale={dictionary.locale}
          restrictedLabel={cardDictionary.invoiceTotalsRestricted}
          unavailableLabel={cardDictionary.invoiceTotalsUnavailable}
        />
      </dl>

      {(pick.otherScopeCount > 0 || pick.historyCount > 0) && (
        <div className="flex flex-col gap-1 border-t border-surface-variant bg-surface px-6 py-3 text-[13px] text-on-surface-variant">
          {pick.otherScopeCount > 0 && (
            <p>
              {pick.otherScopeCount === 1
                ? cardDictionary.otherScopeSingular
                : cardDictionary.otherScopePlural.replace(
                    "{count}",
                    isolateBidiText(String(pick.otherScopeCount)),
                  )}
            </p>
          )}
          {pick.historyCount > 0 && (
            <p>
              {pick.historyCount === 1
                ? cardDictionary.historyCountSingular
                : cardDictionary.historyCountPlural.replace(
                    "{count}",
                    isolateBidiText(String(pick.historyCount)),
                  )}
            </p>
          )}
        </div>
      )}

      {/*
        Create Draft is only for zero ABS history (legacy_quotation_only card path).
        Draft / active / historical summary states must not offer create.
      */}
    </section>
  );
}

function MoneyDetail({
  label,
  field,
  locale,
  restrictedLabel,
  unavailableLabel,
}: {
  label: string;
  field: AbsCardMoneyField;
  locale: ServicesDictionary["locale"];
  restrictedLabel: string;
  unavailableLabel: string;
}) {
  if (field.kind === "hidden") {
    return (
      <ScopeDetail
        label={label}
        value={
          <span className="text-[14px] text-on-surface-variant">{restrictedLabel}</span>
        }
      />
    );
  }

  if (field.kind === "unavailable") {
    return (
      <ScopeDetail
        label={label}
        value={
          <span className="text-[14px] text-on-surface-variant">{unavailableLabel}</span>
        }
      />
    );
  }

  return (
    <ScopeDetail
      label={label}
      value={
        <span dir="ltr" className="tabular-nums">
          {formatSarAmount(locale, field.amount)}
        </span>
      }
    />
  );
}

function ScopeCardShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="border-b border-surface-variant bg-surface-bright px-6 py-4">
        <h3 className="font-semibold text-primary">{title}</h3>
        <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">{subtitle}</p>
      </div>
      <div className="p-6">{children}</div>
    </section>
  );
}

function ScopeDetail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">
        {label}
      </dt>
      <dd className="font-medium text-on-surface">{value}</dd>
    </div>
  );
}
