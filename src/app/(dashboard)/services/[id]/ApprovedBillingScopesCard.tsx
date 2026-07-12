import type { ComponentProps, ReactNode } from "react";
import StatusBadge from "@/components/ui/StatusBadge";
import PendingLink from "@/components/ui/PendingLink";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { ServicesDictionary } from "@/lib/i18n/dictionaries/services";
import { formatSarAmount } from "@/lib/i18n/formatting";
import { listApprovedBillingScopesForServiceResult } from "@/lib/approved-billing-scopes/queries";
import type {
  ApprovedBillingScopeLineSafetyStatus,
  ApprovedBillingScopeStatus,
  ApprovedBillingScopeSummary,
} from "@/lib/approved-billing-scopes/types";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const SCOPE_STATUS_VARIANTS: Record<ApprovedBillingScopeStatus, StatusBadgeVariant> = {
  draft: "draft",
  approved: "approved",
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
};

export default async function ApprovedBillingScopesCard({
  serviceId,
  dictionary,
}: ApprovedBillingScopesCardProps) {
  const cardDictionary = dictionary.approvedBillingScopes;
  const scopeResult = await listApprovedBillingScopesForServiceResult(serviceId);

  if (scopeResult.status === "error") {
    return (
      <ScopeCard title={cardDictionary.title} subtitle={cardDictionary.subtitle}>
        {cardDictionary.unavailable}
      </ScopeCard>
    );
  }

  if (scopeResult.data.length === 0) {
    return (
      <ScopeCard title={cardDictionary.title} subtitle={cardDictionary.subtitle}>
        {cardDictionary.empty}
      </ScopeCard>
    );
  }

  return <ScopeSummaryCard serviceId={serviceId} scopes={scopeResult.data} dictionary={dictionary} />;
}

function ScopeSummaryCard({
  serviceId,
  scopes,
  dictionary,
}: {
  serviceId: string;
  scopes: ApprovedBillingScopeSummary[];
  dictionary: ServicesDictionary;
}) {
  const cardDictionary = dictionary.approvedBillingScopes;
  const currentScope = scopes.find((scope) => scope.isActiveApprovedScope) ?? scopes[0];
  const otherScopeCount = scopes.length - 1;

  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="flex flex-col gap-3 border-b border-surface-variant bg-surface-bright px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="font-semibold text-primary">{cardDictionary.title}</h3>
          <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">{cardDictionary.subtitle}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <StatusBadge variant={SCOPE_STATUS_VARIANTS[currentScope.status]}>
            {currentScope.isActiveApprovedScope
              ? cardDictionary.active
              : cardDictionary.statusLabels[currentScope.status]}
          </StatusBadge>
          <PendingLink
            href={`/services/${serviceId}/approved-billing-scopes/${currentScope.id}`}
            className="text-[13px] font-semibold text-primary hover:underline"
            pendingLabel={cardDictionary.viewDetails}
          >
            {cardDictionary.viewDetails}
          </PendingLink>
        </div>
      </div>
      <dl className="grid grid-cols-1 gap-5 p-6 sm:grid-cols-3">
        <ScopeDetail
          label={cardDictionary.labels.version}
          value={isolateBidiText(`${cardDictionary.versionPrefix} ${currentScope.scopeVersion}`)}
        />
        <ScopeDetail
          label={cardDictionary.labels.lineSafety}
          value={
            <StatusBadge variant={LINE_SAFETY_VARIANTS[currentScope.lineSafetyStatus]}>
              {cardDictionary.lineSafetyLabels[currentScope.lineSafetyStatus]}
            </StatusBadge>
          }
        />
        <ScopeDetail
          label={cardDictionary.labels.acceptedGrandTotal}
          value={
            <span dir="ltr" className="tabular-nums">
              {formatSarAmount(dictionary.locale, currentScope.acceptedGrandTotal)}
            </span>
          }
        />
      </dl>
      {otherScopeCount > 0 && (
        <div className="border-t border-surface-variant bg-surface px-6 py-3 text-[13px] text-on-surface-variant">
          {otherScopeCount === 1
            ? cardDictionary.otherScopeSingular
            : cardDictionary.otherScopePlural.replace(
                "{count}",
                isolateBidiText(String(otherScopeCount)),
              )}
        </div>
      )}
    </section>
  );
}

function ScopeCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: string;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest">
      <div className="border-b border-surface-variant bg-surface-bright px-6 py-4">
        <h3 className="font-semibold text-primary">{title}</h3>
        <p className="mt-1 text-[13px] leading-[18px] text-on-surface-variant">{subtitle}</p>
      </div>
      <div className="p-6 text-[14px] leading-[20px] text-on-surface-variant">{children}</div>
    </section>
  );
}

function ScopeDetail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <dt className="mb-1 text-[12px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</dt>
      <dd className="font-medium text-on-surface">{value}</dd>
    </div>
  );
}
