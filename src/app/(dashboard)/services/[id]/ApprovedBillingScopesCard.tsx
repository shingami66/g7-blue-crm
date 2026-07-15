import type { ComponentProps, ReactNode } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { UiDateText } from "@/components/i18n/UiDateText";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";
import {
  getServiceApprovedBillingAuthoritySummaryResult,
  listServiceApprovedBillingScopeHistoryResult,
} from "@/lib/approved-billing-scopes/queries";
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
import {
  historyProvesAbsExists,
  historyProvesZeroScopes,
  isFullyAllocatedRemaining,
  mapAuthorityMoneyToCardField,
  mapHistoryRowsToSummaries,
} from "@/lib/approved-billing-scopes/service-history-view-model";
import type {
  AbsMoneyField,
  AbsScopeHistoryListData,
  ApprovedBillingScopeLineSafetyStatus,
  ApprovedBillingScopeSummary,
  ServiceAbsAuthoritySummary,
} from "@/lib/approved-billing-scopes/types";
import type { ServiceBillingState } from "@/lib/invoices/types";
import { isTerminalServiceStatus } from "@/lib/services/status-transitions";
import type { ServiceStatus } from "@/types/service";
import CreateApprovedBillingScopeDraftAction from "./CreateApprovedBillingScopeDraftAction";
import AbsScopeHistoryTable from "./AbsScopeHistoryTable";

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

  // Card-level reads: authority summary + bounded history only (no separate full-list contract).
  const [authorityResult, historyResult] = await Promise.all([
    getServiceApprovedBillingAuthoritySummaryResult(serviceId),
    listServiceApprovedBillingScopeHistoryResult(serviceId),
  ]);

  const authority: ServiceAbsAuthoritySummary | null =
    authorityResult.status === "success" ? authorityResult.data : null;
  const authorityFailed = authorityResult.status !== "success";
  const history: AbsScopeHistoryListData | null =
    historyResult.status === "success" ? historyResult.data : null;
  const historyUnavailable = historyResult.status !== "success";

  const historySummaries: ApprovedBillingScopeSummary[] =
    history != null ? mapHistoryRowsToSummaries(history.rows) : [];

  const absHistoryExists = historyProvesAbsExists(history);
  const zeroHistoryProven = historyProvesZeroScopes(history, historyUnavailable);

  const billing = buildAbsCardBillingSnapshot({
    approvedQuotation: billingState.approvedQuotation,
    activePriorInvoiceTotal: billingState.activePriorInvoiceTotal,
    remainingUninvoicedAmount: billingState.remainingUninvoicedAmount,
    disabledReasons: billingState.disabledReasons,
  });

  // Scenario: prefer authority; if authority failed but history proves ABS, use historical_only
  // so we never fall into legacy QT authority presentation.
  let scenario: AbsCardScenario;
  if (authority != null) {
    scenario = authority.scenario;
  } else if (historyUnavailable && authorityFailed) {
    scenario = "unavailable";
  } else if (absHistoryExists) {
    scenario = resolveAbsCardScenario({
      scopesLoadError: false,
      scopes: historySummaries,
      hasApprovedQuotation: billing.hasApprovedQuotation,
    });
    if (scenario === "no_approved_quotation" || scenario === "legacy_quotation_only") {
      scenario = "historical_only";
    }
  } else if (zeroHistoryProven) {
    scenario = resolveAbsCardScenario({
      scopesLoadError: false,
      scopes: [],
      hasApprovedQuotation: billing.hasApprovedQuotation,
    });
  } else {
    // History failed and authority failed, or ambiguous empty
    scenario = authorityFailed ? "unavailable" : "unavailable";
  }

  // Draft-create: zero history must be positively proven; history error never opens create.
  const draftCreate = resolveDraftCreateContext(
    zeroHistoryProven ? [] : historySummaries,
    billingState,
    {
      // Any unproven zero-history (error, limitReached, or rows present) blocks create.
      scopesLoadError: !zeroHistoryProven,
      serviceLifecycleEligible: !isTerminalServiceStatus(serviceStatus),
    },
  );
  const showCreateDraft =
    canCreateDraft &&
    zeroHistoryProven &&
    draftCreate.showCreateDraft &&
    draftCreate.sourceQuotationId != null;

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
      <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
        <div className="border-b border-surface-variant bg-surface-bright px-6 py-4">
          <h3 className="font-semibold text-primary">{cardDictionary.title}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
            {cardDictionary.subtitle}
          </p>
        </div>
        <p className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {cardDictionary.unavailable}
        </p>
        {!historyUnavailable && history ? (
          <AbsScopeHistoryTable
            serviceId={serviceId}
            locale={dictionary.locale}
            dictionary={cardDictionary}
            history={history}
            historyUnavailable={false}
          />
        ) : null}
      </section>
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

  // Legacy QT path only when zero ABS history is proven AND authority agrees (or is unavailable
  // without historical ABS). Never when history proves ABS rows exist.
  if (scenario === "legacy_quotation_only" && zeroHistoryProven && !absHistoryExists) {
    const money = resolveAbsCardMoneyFields({
      scenario,
      primary: null,
      billing,
      canReadInvoices,
    });
    // When authority failed, do not present financial totals as ABS-authoritative.
    const showAuthoritativeMoney = authority != null && !authorityFailed;
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
          {authorityFailed
            ? cardDictionary.unavailable
            : cardDictionary.legacyQuotationAuthority}
        </p>
        {showAuthoritativeMoney ? (
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
              label={cardDictionary.labels.lifetimeInvoiceExposure}
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
        ) : (
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
          </dl>
        )}
        {showCreateDraft && draftCreate.sourceQuotationId && (
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

  // If we expected legacy but history proves ABS (should not happen after coercion), fall through.
  return (
    <ScopeSummaryCard
      serviceId={serviceId}
      scopes={historySummaries}
      scenario={
        (scenario === "legacy_quotation_only"
          ? "historical_only"
          : scenario) as Exclude<
          AbsCardScenario,
          "unavailable" | "no_approved_quotation" | "legacy_quotation_only"
        >
      }
      dictionary={dictionary}
      billingState={billingState}
      quotationNumbersById={quotationNumbersById}
      authority={authority}
      authorityFailed={authorityFailed}
      history={history}
      historyUnavailable={historyUnavailable}
      absHistoryExists={absHistoryExists}
    />
  );
}

function ScopeSummaryCard({
  serviceId,
  scopes,
  scenario,
  dictionary,
  billingState,
  quotationNumbersById,
  authority,
  authorityFailed,
  history,
  historyUnavailable,
  absHistoryExists,
}: {
  serviceId: string;
  scopes: ApprovedBillingScopeSummary[];
  scenario: Exclude<
    AbsCardScenario,
    "unavailable" | "no_approved_quotation" | "legacy_quotation_only"
  >;
  dictionary: ServicesDictionary;
  billingState: ServiceBillingState;
  quotationNumbersById: Readonly<Record<string, string>>;
  authority: ServiceAbsAuthoritySummary | null;
  authorityFailed: boolean;
  history: AbsScopeHistoryListData | null;
  historyUnavailable: boolean;
  absHistoryExists: boolean;
}) {
  const cardDictionary = dictionary.approvedBillingScopes;
  const pick = pickAbsCardScopes(scopes);

  // Prefer authority-identified active scope for navigation; never treat first historical as active.
  const authorityActive = authority?.activeScope ?? null;
  const displayPrimary =
    authorityActive ??
    pick.primary ??
    (scopes.length > 0 ? scopes[0] : null);

  const effectiveStatus: AbsCardEffectiveStatus | null = authorityActive
    ? "active"
    : pick.effectiveStatus ??
      (displayPrimary
        ? displayPrimary.isActiveApprovedScope
          ? "active"
          : displayPrimary.status === "draft"
            ? "draft"
            : displayPrimary.voidedAt
              ? "voided"
              : displayPrimary.supersededAt
                ? "superseded"
                : "voided"
        : null);

  if (!displayPrimary || !effectiveStatus) {
    return (
      <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
        <div className="border-b border-surface-variant bg-surface-bright px-6 py-4">
          <h3 className="font-semibold text-primary">{cardDictionary.title}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">
            {cardDictionary.subtitle}
          </p>
        </div>
        <p className="px-6 py-4 text-[14px] leading-[20px] text-on-surface-variant">
          {authorityFailed ? cardDictionary.unavailable : cardDictionary.empty}
        </p>
        <AbsScopeHistoryTable
          serviceId={serviceId}
          locale={dictionary.locale}
          dictionary={cardDictionary}
          history={history}
          historyUnavailable={historyUnavailable}
        />
      </section>
    );
  }

  // Financial totals only when authority contract succeeded.
  const showAuthoritativeMoney = authority != null && !authorityFailed;
  const ceiling: AbsCardMoneyField = showAuthoritativeMoney
    ? mapAuthorityMoneyToCardField(authority.activeCeiling)
    : { kind: "unavailable" };
  const lifetimeExposure: AbsCardMoneyField = showAuthoritativeMoney
    ? mapAuthorityMoneyToCardField(authority.lifetimeInvoiceExposure)
    : { kind: "unavailable" };
  const remaining: AbsCardMoneyField = showAuthoritativeMoney
    ? mapAuthorityMoneyToCardField(authority.remainingAuthority)
    : { kind: "unavailable" };

  const remainingSource: AbsMoneyField | null = showAuthoritativeMoney
    ? authority.remainingAuthority
    : null;
  const fullyAllocated =
    remainingSource != null && isFullyAllocatedRemaining(remainingSource);

  const sourceQuotationNumber =
    authority?.sourceQuotation?.quotationNumber ??
    resolveSourceQuotationNumber({
      sourceQuotationId: displayPrimary.sourceQuotationId,
      quotationNumbersById,
      billingQuotation: billingState.approvedQuotation
        ? {
            id: billingState.approvedQuotation.id,
            quotationNumber: billingState.approvedQuotation.quotationNumber,
          }
        : null,
    });

  const statusLabel =
    effectiveStatus === "active"
      ? cardDictionary.active
      : cardDictionary.effectiveStatusLabels[effectiveStatus];

  // Detail link: prefer authority active id when present.
  const detailScopeId = authorityActive?.id ?? displayPrimary.id;
  const detailHref = `/services/${serviceId}/approved-billing-scopes/${detailScopeId}`;
  const draftHref =
    pick.draft && pick.draft.id !== detailScopeId
      ? `/services/${serviceId}/approved-billing-scopes/${pick.draft.id}`
      : null;

  const lineSafetyStatus =
    authority?.lineSafetyStatus ?? displayPrimary.lineSafetyStatus;
  const approvedAt = authority?.approvedAt ?? displayPrimary.approvedAt;
  const version =
    authority?.activeScopeVersion ?? displayPrimary.scopeVersion;

  const showNoActiveAuthority =
    scenario === "historical_only" ||
    authorityActive == null ||
    (authority != null &&
      authority.activeScope == null &&
      authority.hasHistoricalAbsAuthority) ||
    (authorityFailed && absHistoryExists);

  const showHistoricalRetained =
    showNoActiveAuthority &&
    (absHistoryExists ||
      effectiveStatus === "voided" ||
      pick.effectiveStatus === "voided" ||
      scopes.some((s) => s.status === "voided" || s.voidedAt != null));

  // Never show QT-fallback authority wording when history proves ABS exists,
  // or when authority failed while ABS history exists.
  const showLegacyQuotationWording =
    !authorityFailed &&
    authority != null &&
    authority.usesLegacyQuotationFallback &&
    !authority.hasHistoricalAbsAuthority &&
    !absHistoryExists &&
    (scenario === "draft_only" || scenario === "historical_only");

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
          <StatusBadge variant={EFFECTIVE_STATUS_VARIANTS[effectiveStatus]}>
            {statusLabel}
          </StatusBadge>
          <PendingLink
            href={detailHref}
            className="inline-flex min-h-9 shrink-0 items-center justify-center rounded-lg border border-outline-variant bg-surface-container-lowest px-3 py-2 text-[13px] font-semibold text-on-surface transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tertiary-fixed focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            pendingLabel={cardDictionary.viewDetails}
            aria-label={cardDictionary.viewDetails}
          >
            {cardDictionary.viewDetails}
          </PendingLink>
        </div>
      </div>

      {authorityFailed ? (
        <div className="border-b border-surface-variant bg-surface px-6 py-3 text-[13px] leading-[18px] text-on-surface-variant">
          {cardDictionary.unavailable}
        </div>
      ) : null}

      {showNoActiveAuthority && (
        <div className="border-b border-surface-variant bg-surface px-6 py-3 text-[13px] leading-[18px] text-on-surface-variant">
          {showHistoricalRetained
            ? cardDictionary.historicalAuthorityRetained
            : cardDictionary.noActiveAuthority}
        </div>
      )}

      {showLegacyQuotationWording && (
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
              {isolateBidiText(`${cardDictionary.versionPrefix} ${version}`)}
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
            <StatusBadge variant={LINE_SAFETY_VARIANTS[lineSafetyStatus]}>
              {cardDictionary.lineSafetyLabels[lineSafetyStatus]}
            </StatusBadge>
          }
        />
        {approvedAt ? (
          <ScopeDetail
            label={cardDictionary.labels.approvedAt}
            value={<UiDateText locale={dictionary.locale} value={approvedAt} />}
          />
        ) : null}
        <MoneyDetail
          label={cardDictionary.labels.billingCeiling}
          field={ceiling}
          locale={dictionary.locale}
          restrictedLabel={cardDictionary.invoiceTotalsRestricted}
          unavailableLabel={cardDictionary.unavailable}
        />
        <MoneyDetail
          label={cardDictionary.labels.lifetimeInvoiceExposure}
          field={lifetimeExposure}
          locale={dictionary.locale}
          restrictedLabel={cardDictionary.invoiceTotalsRestricted}
          unavailableLabel={cardDictionary.invoiceTotalsUnavailable}
        />
        <MoneyDetail
          label={cardDictionary.labels.remainingBillable}
          field={remaining}
          locale={dictionary.locale}
          restrictedLabel={cardDictionary.invoiceTotalsRestricted}
          unavailableLabel={cardDictionary.invoiceTotalsUnavailable}
          fullyAllocatedLabel={
            fullyAllocated ? cardDictionary.fullyAllocated : null
          }
        />
      </dl>

      <AbsScopeHistoryTable
        serviceId={serviceId}
        locale={dictionary.locale}
        dictionary={cardDictionary}
        history={history}
        historyUnavailable={historyUnavailable}
      />
    </section>
  );
}

function MoneyDetail({
  label,
  field,
  locale,
  restrictedLabel,
  unavailableLabel,
  fullyAllocatedLabel = null,
}: {
  label: string;
  field: AbsCardMoneyField;
  locale: ServicesDictionary["locale"];
  restrictedLabel: string;
  unavailableLabel: string;
  fullyAllocatedLabel?: string | null;
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
        <span className="inline-flex flex-col gap-1">
          <span dir="ltr" className="tabular-nums">
            {formatSarAmount(locale, field.amount)}
          </span>
          {fullyAllocatedLabel ? (
            <span className="text-[12px] font-medium text-on-surface-variant">
              {fullyAllocatedLabel}
            </span>
          ) : null}
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
