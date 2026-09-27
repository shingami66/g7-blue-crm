import type { ReactNode } from "react";
import {
  BriefcaseBusiness,
  CalendarClock,
  CircleAlert,
  FilePlus,
  FileText,
  Landmark,
  ReceiptText,
  UserPlus,
  Users,
  WalletCards,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { DashboardQueueRowContent } from "@/components/dashboard/DashboardQueueSecondaryValue";
import PageHeader from "@/components/ui/PageHeader";
import PendingLink from "@/components/ui/PendingLink";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiBidiText, UiLtrText, UiMoneyText, UiNumberText } from "@/components/i18n/UiValueText";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import {
  composeDashboard,
  getDashboardPermissionsToResolve,
} from "@/lib/dashboard/composition";
import {
  getDashboardActionCenterPresentation,
  getDashboardMainColumnsPresentation,
  getDashboardPreview,
} from "@/lib/dashboard/presentation";
import {
  getDashboardCashAdvanceIssueData,
  getDashboardCustomersData,
  getDashboardEventEconomicsData,
  getDashboardExpenseFinanceReviewData,
  getDashboardPayablesData,
  getDashboardPaymentsData,
  getDashboardQuotationApprovalData,
  getDashboardQuotationsData,
  getDashboardReceivablesData,
  getDashboardServiceLifecycleData,
  getDashboardServicesData,
} from "@/lib/dashboard/queries";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getQuotationStatusLabel } from "@/lib/i18n/dictionaries/quotations";
import { getDashboardDictionary } from "@/lib/i18n/dictionaries/dashboard";
import { getDashboardW9BDictionary } from "@/lib/i18n/dictionaries/dashboard-w9b";
import { formatUiDate } from "@/lib/i18n/formatting";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import type { Locale } from "@/lib/i18n/locales";
import type {
  DashboardCashAdvanceIssueItem,
  DashboardExpenseFinanceReviewItem,
  DashboardRecentQuotation,
} from "@/lib/dashboard/queries";

export const dynamic = "force-dynamic";

type LoadState<T> = { status: "ready"; data: T } | { status: "unavailable" };
type DashboardActionQueueItem = {
  id: string;
  href: string;
  primary: ReactNode;
  secondary?: ReactNode;
  secondaryCanWrap?: boolean;
  trailing?: ReactNode;
};
type DashboardActionQueueView = {
  id: string;
  title: string;
  destination: string;
  status: "ready" | "unavailable";
  items: DashboardActionQueueItem[];
  sourceHasMore?: boolean;
};

async function loadIfComposed<T>(
  included: boolean,
  contributionId: string,
  load: () => Promise<T>,
): Promise<LoadState<T> | null> {
  if (!included) return null;
  try {
    return { status: "ready", data: await load() };
  } catch (error) {
    console.error(
      `[DashboardPage] ${contributionId} source unavailable`,
      error instanceof Error ? error.message : "Unknown",
    );
    return { status: "unavailable" };
  }
}

function hasId(items: readonly { id: string }[], id: string): boolean {
  return items.some((item) => item.id === id);
}

function DashboardAmount({ locale, value }: { locale: Locale; value: number }) {
  return <UiMoneyText locale={locale} value={value} />;
}

function SnapshotCard({
  id,
  title,
  href,
  children,
  note,
  emphasis,
  icon,
  badge,
}: {
  id: string;
  title: string;
  href: string;
  children: ReactNode;
  note?: ReactNode;
  emphasis?: "financial";
  icon?: ReactNode;
  badge?: ReactNode;
}) {
  return (
    <article
      data-dashboard-widget={id}
      data-dashboard-emphasis={emphasis}
      data-dashboard-card-kind={emphasis === "financial" ? "financial" : "operational"}
      className={`@container min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 ${
        emphasis === "financial" ? "border-t-2 border-t-primary" : ""
      }`}
    >
      <div className="flex min-h-7 min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {icon ? <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-container-low text-on-surface-variant">{icon}</span> : null}
          <h3 className="min-w-0 text-[13px] font-semibold leading-5 text-on-surface-variant">
            <Link href={href} className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">
              {title}
            </Link>
          </h3>
        </div>
        {badge ? <span className="shrink-0 whitespace-nowrap rounded-full bg-surface-container-low px-2 py-0.5 text-[11px] font-semibold leading-4 text-on-surface-variant">{badge}</span> : null}
      </div>
      <div className="mt-3 grid min-w-0 grid-cols-1 gap-x-4 gap-y-2.5 @[18rem]:grid-cols-2">{children}</div>
      {note ? <div className="mt-3 border-t border-surface-variant pt-2 text-[12px] leading-4 text-on-surface-variant">{note}</div> : null}
    </article>
  );
}

function SnapshotMetric({ label, value, className, prominence = "standard", hideLabel = false }: { label: string; value: ReactNode; className?: string; prominence?: "standard" | "primary" | "financial" | "financial-primary"; hideLabel?: boolean }) {
  return (
    <div className={`min-w-0 ${className ?? ""}`} data-dashboard-metric-prominence={prominence}>
      {hideLabel ? <span className="sr-only">{label}</span> : <span className="block text-[11px] leading-4 text-on-surface-variant">{label}</span>}
      <span className={`block min-w-0 tabular-nums text-primary ${
        prominence === "primary" ? "mt-0.5 text-[30px] font-semibold leading-9" : prominence === "financial-primary" ? "mt-0.5 text-[24px] font-semibold leading-7" : prominence === "financial" ? "mt-0.5 text-[18px] font-semibold leading-6" : "mt-0.5 text-[15px] font-semibold leading-5"
      }`}>{value}</span>
    </div>
  );
}

function SourceUnavailable({ children }: { children: ReactNode }) {
  return <p className="mt-3 rounded-lg bg-surface-container-low px-3 py-2.5 text-[13px] leading-5 text-on-surface-variant">{children}</p>;
}

function DashboardActionQueue({
  title,
  items,
  viewAll,
  itemCount,
}: {
  title: string;
  items: DashboardActionQueueItem[];
  viewAll?: { href: string; label: string };
  itemCount: number;
}) {
  return (
    <section className="min-w-0" aria-label={title}>
      <div className="mb-1.5 flex min-w-0 items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <h3 className="min-w-0 text-[13px] font-semibold leading-5 text-on-surface-variant">{title}</h3>
          <span className="shrink-0 rounded-full bg-surface-container-low px-1.5 py-0.5 text-[11px] font-semibold leading-4 text-on-surface-variant" aria-label={`${itemCount}`}>{itemCount}</span>
        </div>
        {viewAll ? <Link href={viewAll.href} className="shrink-0 text-[12px] font-semibold text-primary hover:underline">{viewAll.label}</Link> : null}
      </div>
      <ul className="overflow-hidden rounded-lg border border-surface-variant divide-y divide-surface-variant">
          {items.map((item) => (
            <li key={item.id}>
              <PendingLink
                href={item.href}
                className="block min-h-11 min-w-0 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <DashboardQueueRowContent
                  primary={item.primary}
                  secondary={item.secondary}
                  secondaryCanWrap={item.secondaryCanWrap}
                  trailing={item.trailing}
                />
              </PendingLink>
            </li>
          ))}
        </ul>
    </section>
  );
}

function recentQuotationPrimaryLabel(
  quotation: Pick<DashboardRecentQuotation, "quotationNumber" | "customer" | "event">,
): { text: string; direction: "auto" | "ltr" } {
  if (quotation.customer?.company) return { text: quotation.customer.company, direction: "auto" };
  if (quotation.event) return { text: quotation.event, direction: "auto" };
  return { text: quotation.quotationNumber, direction: "ltr" };
}

export default async function DashboardPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getDashboardDictionary(locale);
  const labels = getDashboardW9BDictionary(locale);
  const sharedStates = getSharedUiStates(locale);

  try {
    await requirePermission("dashboard:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.accessDenied}
        />
      );
    }
    return (
      <SharedAuthenticatedStatePanel
        title={sharedStates.genericError.title}
        message={dictionary.states.loadError}
        role="alert"
      />
    );
  }

  const resolved = await Promise.all(getDashboardPermissionsToResolve().map(async (permission) => {
    try {
      return await checkPermission(permission) ? permission : null;
    } catch (error) {
      console.error(
        "[DashboardPage] Effective permission could not be resolved",
        error instanceof Error ? error.message : "Unknown",
      );
      return null;
    }
  }));
  const composition = composeDashboard(new Set(resolved.filter((value): value is string => value !== null)));
  const hasWidget = (id: string) => hasId(composition.widgets, id);
  const hasAction = (id: string) => hasId(composition.actionGroups, id);
  const hasQuickAction = (id: string) => hasId(composition.quickActions, id);

  const [customersState, quotationsState, servicesState, lifecycleState, receivablesState, payablesState,
    eventState, quotationApprovalState, expenseReviewState, cashAdvanceIssueState, paymentsState] = await Promise.all([
    loadIfComposed(hasWidget("customers"), "customers", getDashboardCustomersData),
    loadIfComposed(hasWidget("quotations"), "quotations", getDashboardQuotationsData),
    loadIfComposed(hasWidget("services"), "services", getDashboardServicesData),
    loadIfComposed(hasWidget("service-lifecycle"), "service-lifecycle", () =>
      getDashboardServiceLifecycleData(hasAction("service-start"))),
    loadIfComposed(hasWidget("accounts-receivable"), "accounts-receivable", getDashboardReceivablesData),
    loadIfComposed(hasWidget("accounts-payable"), "accounts-payable", getDashboardPayablesData),
    loadIfComposed(hasWidget("event-economics"), "event-economics", getDashboardEventEconomicsData),
    loadIfComposed(hasAction("quotation-approval"), "quotation-approval", getDashboardQuotationApprovalData),
    loadIfComposed(hasAction("expense-finance-review"), "expense-finance-review", getDashboardExpenseFinanceReviewData),
    loadIfComposed(hasAction("cash-advance-issue"), "cash-advance-issue", getDashboardCashAdvanceIssueData),
    loadIfComposed(hasWidget("recent-payments"), "recent-payments", getDashboardPaymentsData),
  ]);

  const snapshotCards: ReactNode[] = [];
  if (customersState) {
    snapshotCards.push(
      <SnapshotCard key="customers" id="customers" title={labels.metrics.customers} href="/customers" icon={<Users size={16} />}>
        <SnapshotMetric className="col-span-full" label={labels.metrics.customers} hideLabel prominence="primary" value={customersState.status === "ready" ? <UiNumberText locale={locale} value={customersState.data.totalCount} /> : labels.states.unavailable} />
      </SnapshotCard>,
    );
  }
  if (quotationsState) {
    snapshotCards.push(
      <SnapshotCard key="quotations" id="quotations" title={labels.metrics.quotations} href="/quotations" icon={<FileText size={16} />}>
        <SnapshotMetric className="col-span-full" label={labels.metrics.quotations} hideLabel prominence="primary" value={quotationsState.status === "ready" ? <UiNumberText locale={locale} value={quotationsState.data.totalCount} /> : labels.states.unavailable} />
      </SnapshotCard>,
    );
  }
  if (servicesState) {
    snapshotCards.push(
      <SnapshotCard key="services" id="services" title={labels.metrics.services} href="/services" icon={<BriefcaseBusiness size={16} />}
        note={lifecycleState?.status === "ready" ? <div className="flex min-w-0 flex-wrap gap-x-4 gap-y-1 text-[11px] leading-4"><span>{labels.metrics.readyToStart}: <UiNumberText locale={locale} value={lifecycleState.data.readyToStartCount} /></span><span>{labels.metrics.inProgress}: <UiNumberText locale={locale} value={lifecycleState.data.inProgressCount} /></span></div> : <span>{labels.sections.serviceLifecycle}: {labels.states.unavailable}</span>}>
        <SnapshotMetric className="col-span-full" label={labels.metrics.services} hideLabel prominence="primary" value={servicesState.status === "ready" ? <UiNumberText locale={locale} value={servicesState.data.totalCount} /> : labels.states.unavailable} />
      </SnapshotCard>,
    );
  }
  if (receivablesState) {
    snapshotCards.push(
      <SnapshotCard key="accounts-receivable" id="accounts-receivable" emphasis="financial" title={labels.widgets.accountsReceivable} href="/reports/accounts-receivable" icon={<WalletCards size={16} />}
        badge={receivablesState.status === "ready" && receivablesState.data.detailTotalCount > 0 ? <><UiNumberText locale={locale} value={receivablesState.data.detailTotalCount} /> {labels.metrics.openInvoices}</> : undefined}
        note={receivablesState.status === "ready" ? <><span>{labels.actions.asOf} </span><span dir="auto">{formatUiDate(locale, receivablesState.data.asOfDate)}</span>{receivablesState.data.detailTotalCount === 0 ? <span className="ms-2">{labels.states.noOutstandingInvoices}</span> : null}</> : undefined}>
        {receivablesState.status === "ready" ? <>
          <SnapshotMetric label={labels.metrics.collectedCash} prominence="financial" value={<DashboardAmount locale={locale} value={receivablesState.data.collectedCashAmount} />} />
          <SnapshotMetric label={labels.metrics.outstandingReceivables} prominence="financial-primary" value={<DashboardAmount locale={locale} value={receivablesState.data.totalOutstanding} />} />
          <SnapshotMetric className="border-t border-surface-variant pt-2" label={labels.metrics.overdueReceivables} value={<DashboardAmount locale={locale} value={receivablesState.data.totalOverdue} />} />
          <SnapshotMetric className="border-t border-surface-variant pt-2" label={labels.metrics.openInvoices} value={<UiNumberText locale={locale} value={receivablesState.data.detailTotalCount} />} />
        </> : <div className="col-span-full"><SourceUnavailable>{labels.states.unavailable}</SourceUnavailable></div>}
      </SnapshotCard>,
    );
  }
  if (payablesState) {
    snapshotCards.push(
      <SnapshotCard key="accounts-payable" id="accounts-payable" emphasis="financial" title={labels.widgets.accountsPayable} href="/reports/accounts-payable" icon={<Landmark size={16} />} badge={payablesState.status === "ready" && payablesState.data.openBillCount > 0 ? <><UiNumberText locale={locale} value={payablesState.data.openBillCount} /> {labels.metrics.openBills}</> : undefined} note={payablesState.status === "ready" ? <>{labels.actions.currentBalancesOnly}{payablesState.data.detailTotalCount === 0 ? ` ${labels.states.noRecords}` : ""}</> : undefined}>
        {payablesState.status === "ready" ? <>
          <SnapshotMetric label={labels.metrics.payable} prominence="financial" value={<DashboardAmount locale={locale} value={payablesState.data.payableAmount} />} />
          <SnapshotMetric label={labels.metrics.paid} prominence="financial" value={<DashboardAmount locale={locale} value={payablesState.data.paidAmount} />} />
          <SnapshotMetric className="border-t border-surface-variant pt-2" label={labels.metrics.outstandingPayables} value={<DashboardAmount locale={locale} value={payablesState.data.outstandingAmount} />} />
          <SnapshotMetric className="border-t border-surface-variant pt-2" label={labels.metrics.openBills} value={<UiNumberText locale={locale} value={payablesState.data.openBillCount} />} />
        </> : <div className="col-span-full"><SourceUnavailable>{labels.states.unavailable}</SourceUnavailable></div>}
      </SnapshotCard>,
    );
  }
  if (eventState) {
    snapshotCards.push(
      <SnapshotCard key="event-economics" id="event-economics" emphasis="financial" title={labels.widgets.eventEconomics} href="/reports/event-economics" icon={<ReceiptText size={16} />}
        note={eventState.status === "ready" ? <div className="space-y-1"><p><span>{labels.actions.asOf} </span><span dir="auto">{formatUiDate(locale, eventState.data.asOfDate)}</span>{eventState.data.detailTotalCount === 0 ? <span className="ms-2">{labels.states.noRecords}</span> : null}</p>{eventState.data.status === "partial" ? <p className="text-[11px] leading-4">{labels.states.partialCompleteness}</p> : null}</div> : undefined}>
        {eventState.status === "ready" ? <>
          <SnapshotMetric label={labels.metrics.openEvents} value={<UiNumberText locale={locale} value={eventState.data.openCount} />} />
          <SnapshotMetric label={labels.metrics.closedEvents} value={<UiNumberText locale={locale} value={eventState.data.closedCount} />} />
          {eventState.data.completenessSummaryState === "available" ? <>
            <div className="col-span-full min-w-0 border-t border-surface-variant pt-2">
              <h4 className="text-[11px] font-semibold leading-4 text-on-surface-variant">{labels.sections.costingCompleteness}</h4>
              <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className="text-[13px] leading-5 text-on-surface-variant">{labels.metrics.partialEvents}</span>
                <span className="text-[16px] font-semibold leading-5 tabular-nums text-primary">{eventState.data.partialCount === null ? "—" : <UiNumberText locale={locale} value={eventState.data.partialCount} />}</span>
              </div>
              <div className="mt-0.5 flex min-w-0 flex-wrap gap-x-2 gap-y-1 text-[11px] leading-4 text-on-surface-variant">
                <span>{labels.metrics.completeEvents}: {eventState.data.completeCount === null ? "—" : <UiNumberText locale={locale} value={eventState.data.completeCount} />}</span>
                <span aria-hidden="true">·</span>
                <span>{labels.metrics.unavailableEvents}: {eventState.data.unavailableCount === null ? "—" : <UiNumberText locale={locale} value={eventState.data.unavailableCount} />}</span>
              </div>
            </div>
          </> : <div className="col-span-full text-[11px] leading-4 text-on-surface-variant">{labels.states.completenessUnavailable}</div>}
        </> : <div className="col-span-full"><SourceUnavailable>{labels.states.unavailable}</SourceUnavailable></div>}
      </SnapshotCard>,
    );
  }

  const actionQueues: DashboardActionQueueView[] = composition.actionGroups.map((group) => {
    if (group.id === "invoice-follow-up") {
      const status = receivablesState?.status ?? "unavailable";
      const items = receivablesState?.status === "ready" ? receivablesState.data.attentionInvoices.map((invoice) => ({
        id: invoice.id,
        href: `/invoices/${invoice.id}`,
        primary: <UiLtrText>{invoice.invoiceNumber}</UiLtrText>,
        trailing: <DashboardAmount locale={locale} value={invoice.outstandingAmount} />,
      })) : [];
      return {
        id: group.id,
        title: labels.groups.invoiceFollowUp,
        destination: group.destination,
        status,
        items,
        sourceHasMore: receivablesState?.status === "ready" && receivablesState.data.hasMoreAttentionInvoices,
      };
    }
    if (group.id === "quotation-approval") {
      const status = quotationApprovalState?.status ?? "unavailable";
      const items = quotationApprovalState?.status === "ready" ? quotationApprovalState.data.pendingQuotationApprovals.map((quotation) => {
        const context = recentQuotationPrimaryLabel(quotation);
        return {
          id: quotation.id,
          href: `/quotations/${quotation.id}`,
          primary: <UiLtrText>{quotation.quotationNumber}</UiLtrText>,
          secondary: context.direction === "auto" ? <UiBidiText>{context.text}</UiBidiText> : undefined,
          secondaryCanWrap: context.direction === "auto",
        };
      }) : [];
      return { id: group.id, title: labels.groups.quotationApprovals, destination: group.destination, status, items };
    }
    if (group.id === "service-start") {
      const status = lifecycleState?.status ?? "unavailable";
      const items = lifecycleState?.status === "ready" ? lifecycleState.data.readyToStartServices.map((service) => ({
        id: service.id,
        href: `/services/${service.id}`,
        primary: <UiBidiText>{service.serviceTitle}</UiBidiText>,
        secondary: <UiLtrText>{service.serviceNumber}</UiLtrText>,
      })) : [];
      return { id: group.id, title: labels.groups.servicesToStart, destination: group.destination, status, items };
    }
    if (group.id === "expense-finance-review") {
      const status = expenseReviewState?.status ?? "unavailable";
      const items = expenseReviewState?.status === "ready" ? expenseReviewState.data.map((expense: DashboardExpenseFinanceReviewItem) => ({
        id: expense.id,
        href: group.destination,
        primary: <UiLtrText>{expense.expenseNumber}</UiLtrText>,
        secondary: <UiBidiText>{expense.description}</UiBidiText>,
        secondaryCanWrap: true,
      })) : [];
      return { id: group.id, title: labels.groups.expenseFinanceReview, destination: group.destination, status, items };
    }
    const status = cashAdvanceIssueState?.status ?? "unavailable";
    const items = cashAdvanceIssueState?.status === "ready" ? cashAdvanceIssueState.data.map((advance: DashboardCashAdvanceIssueItem) => ({
      id: advance.id,
      href: `${group.destination}/${advance.id}`,
      primary: <UiLtrText>{advance.advanceNumber}</UiLtrText>,
    })) : [];
    return { id: group.id, title: labels.groups.cashAdvancesToIssue, destination: group.destination, status, items };
  });
  const actionCenterPresentation = getDashboardActionCenterPresentation(actionQueues.map(({ id, status, items }) => ({
    id,
    status,
    itemCount: items.length,
  })));
  const actionQueueById = new Map(actionQueues.map((queue) => [queue.id, queue]));
  const visibleActionQueues = actionCenterPresentation.visibleGroupIds.flatMap((id) => {
    const queue = actionQueueById.get(id);
    return queue ? [queue] : [];
  });
  const actionQueueViewAllDestinations = new Set(visibleActionQueues.flatMap((queue) =>
    getDashboardPreview(queue.items, queue.sourceHasMore).hasMore ? [queue.destination] : [],
  ));
  const visibleActionItemCount = visibleActionQueues.reduce((count, queue) =>
    count + getDashboardPreview(queue.items, queue.sourceHasMore).items.length, 0);

  const hasActionCenter = composition.actionGroups.length > 0;
  const hasRecentActivity = Boolean(quotationsState || paymentsState);
  const hasOperations = Boolean(servicesState || lifecycleState);
  const mainColumns = getDashboardMainColumnsPresentation({
    hasActionCenter,
    hasOperationsFocus: hasOperations,
    hasRecentActivity,
  });

  return (
    <div data-dashboard-workspace="permission-aware" data-dashboard-content-frame="true" className="mx-auto w-full max-w-[1240px] space-y-5">
      <div className="border-b border-surface-variant pb-4">
        <PageHeader title={dictionary.header.title} subtitle={dictionary.header.subtitle}>
        <div data-dashboard-section="quick-actions" className="flex w-full max-w-full flex-wrap gap-2 sm:w-auto">
          {hasQuickAction("new-customer") ? <Link href="/customers" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold leading-[18px] text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><UserPlus size={16} aria-hidden="true" />{labels.actions.newCustomer}</Link> : null}
          {hasQuickAction("new-quotation") ? <Link href="/quotations" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-3 py-2 text-[13px] font-semibold leading-[18px] text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><FilePlus size={16} aria-hidden="true" />{labels.actions.newQuotation}</Link> : null}
          {hasQuickAction("new-invoice") ? <Link href="/invoices" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-3 py-2 text-[13px] font-semibold leading-[18px] text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><ReceiptText size={16} aria-hidden="true" />{labels.actions.newInvoice}</Link> : null}
          {hasQuickAction("new-service") ? <Link href="/services/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-3 py-2 text-[13px] font-semibold leading-[18px] text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"><BriefcaseBusiness size={16} aria-hidden="true" />{labels.actions.newService}</Link> : null}
        </div>
        </PageHeader>
      </div>

      {snapshotCards.length > 0 ? (
        <section data-dashboard-section="business-snapshot" aria-labelledby="dashboard-business-snapshot">
          <h2 id="dashboard-business-snapshot" className="mb-2.5 text-[18px] font-semibold leading-6 text-primary">{labels.sections.businessSnapshot}</h2>
          <div className="grid min-w-0 grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">{snapshotCards}</div>
        </section>
      ) : null}

      {mainColumns.shouldRender ? <div data-dashboard-main-columns="true" className="grid min-w-0 grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {mainColumns.showActionCenter ? <div data-dashboard-column="left" className={mainColumns.actionCenterClassName ?? undefined}>
          <section data-dashboard-section="action-center" aria-labelledby="dashboard-action-center" className="rounded-xl border border-surface-variant border-s-2 border-s-primary bg-surface-container-lowest p-4">
            <div data-dashboard-section-header="action-center" className="mb-3 flex min-w-0 items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <CircleAlert size={15} aria-hidden="true" className="shrink-0 text-primary" />
                  <h2 id="dashboard-action-center" className="text-[17px] font-semibold leading-6 text-primary">{labels.sections.actionCenter}</h2>
                </div>
                <p className="mt-1 text-[12px] leading-4 text-on-surface-variant">{labels.sections.actionCenterDescription}</p>
              </div>
              {visibleActionItemCount > 0 ? <span data-dashboard-action-count={visibleActionItemCount} className="shrink-0 rounded-full bg-surface-container-low px-2 py-1 text-[11px] font-semibold leading-4 text-on-surface-variant"><UiNumberText locale={locale} value={visibleActionItemCount} /></span> : null}
            </div>
            <div className="space-y-2.5">
              {visibleActionQueues.map((queue) => {
                const preview = getDashboardPreview(queue.items, queue.sourceHasMore);
                return <DashboardActionQueue
                  key={queue.id}
                  title={queue.title}
                  items={preview.items}
                  itemCount={preview.items.length}
                  viewAll={preview.hasMore ? { href: queue.destination, label: labels.actions.viewAll } : undefined}
                />;
              })}
              {actionCenterPresentation.hasUnavailableSource ? <p className="text-[12px] leading-4 text-on-surface-variant">{labels.states.unavailable}</p> : null}
              {actionCenterPresentation.showEmptyState ? <p className="text-[13px] leading-5 text-on-surface-variant">{labels.states.noActions}</p> : null}
            </div>
          </section>
        </div> : null}

        {mainColumns.showRightColumn ? <div
          data-dashboard-column="right"
          className={mainColumns.rightColumnClassName ?? undefined}
        >
          {hasOperations ? <section data-dashboard-section="operations-focus" aria-labelledby="dashboard-operations-focus" className="min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
            <div data-dashboard-section-header="operations-focus" className="mb-3 flex items-start justify-between gap-3">
              <div className="min-w-0"><h2 id="dashboard-operations-focus" className="text-[17px] font-semibold leading-6 text-primary">{labels.sections.operationsFocus}</h2><p className="mt-1 text-[12px] leading-4 text-on-surface-variant">{labels.sections.operationsFocusDescription}</p></div>
              {servicesState?.status === "ready" && servicesState.data.upcomingServices.length > 3 && !actionQueueViewAllDestinations.has("/services") ? <Link href="/services" className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-[12px] font-semibold text-primary hover:bg-surface-container-low hover:underline">{labels.actions.viewAll}</Link> : null}
            </div>
            {servicesState ? <div aria-label={labels.metrics.upcoming}>
              <h3 className="mb-1 text-[12px] font-semibold text-on-surface-variant">{labels.metrics.upcoming}</h3>
              {servicesState.status === "unavailable" ? <p className="text-[13px] leading-5 text-on-surface-variant">{labels.states.unavailable}</p> : servicesState.data.upcomingServices.length === 0 ? <p className="text-[13px] leading-5 text-on-surface-variant">{labels.states.noUpcomingServices}</p> : <ul className="overflow-hidden rounded-lg border border-surface-variant divide-y divide-surface-variant">{servicesState.data.upcomingServices.slice(0, 3).map((service) => <li key={service.id} className="min-w-0"><PendingLink href={`/services/${service.id}`} className="flex min-h-11 w-full min-w-0 items-start gap-2.5 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span aria-hidden="true" className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md bg-surface-container-low text-on-surface-variant"><CalendarClock size={14} /></span><span className="min-w-0"><span className="block min-w-0 text-[13px] leading-5 text-on-surface"><UiBidiText>{service.serviceTitle}</UiBidiText></span><span className="mt-0.5 block min-w-0 text-start"><UiLtrText className="text-[12px] leading-4 text-primary">{service.serviceNumber}</UiLtrText></span></span></PendingLink></li>)}</ul>}
            </div> : null}
            {lifecycleState ? <div className="mt-2.5 flex min-w-0 flex-wrap gap-x-5 gap-y-1 rounded-lg bg-surface-container-low px-3 py-1.5" aria-label={labels.sections.serviceLifecycle}>
              {lifecycleState.status === "ready" ? <>
                <span className="text-[12px] leading-5 text-on-surface-variant">{labels.metrics.readyToStart}: <UiNumberText locale={locale} value={lifecycleState.data.readyToStartCount} /></span>
                <span className="text-[12px] leading-5 text-on-surface-variant">{labels.metrics.inProgress}: <UiNumberText locale={locale} value={lifecycleState.data.inProgressCount} /></span>
              </> : <span className="text-[12px] leading-5 text-on-surface-variant">{labels.sections.serviceLifecycle}: {labels.states.unavailable}</span>}
            </div> : null}
          </section> : null}

          {hasRecentActivity ? <section data-dashboard-section="recent-activity" aria-labelledby="dashboard-recent-activity" className="min-w-0 rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
            <div data-dashboard-section-header="recent-activity" className="mb-3"><h2 id="dashboard-recent-activity" className="text-[17px] font-semibold leading-6 text-primary">{labels.sections.recentActivity}</h2><p className="mt-1 text-[12px] leading-4 text-on-surface-variant">{labels.sections.recentActivityDescription}</p></div>
            <div className="space-y-2.5">
              {quotationsState ? <section className="min-w-0" aria-label={labels.sections.recentQuotations}>
                <div className="mb-1.5 flex items-center justify-between gap-3"><h3 className="text-[12px] font-semibold text-on-surface-variant">{labels.sections.recentQuotations}</h3>{quotationsState.status === "ready" && quotationsState.data.recentQuotations.length > 0 && quotationsState.data.totalCount > 3 && !actionQueueViewAllDestinations.has("/quotations") ? <Link href="/quotations" className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-[12px] font-semibold text-primary hover:bg-surface-container-low hover:underline">{labels.actions.viewAll}</Link> : null}</div>
                {quotationsState.status === "unavailable" ? <p className="text-[13px] leading-5 text-on-surface-variant">{labels.states.unavailable}</p> : quotationsState.data.recentQuotations.length === 0 ? <p className="text-[13px] leading-5 text-on-surface-variant">{labels.states.noRecentQuotations}</p> : <ul className="overflow-hidden rounded-lg border border-surface-variant divide-y divide-surface-variant">{quotationsState.data.recentQuotations.slice(0, 3).map((quotation) => {
                  const primary = recentQuotationPrimaryLabel(quotation);
                  return <li key={quotation.id} className="min-w-0 px-2 py-1.5"><span className="block min-w-0 text-start text-[13px] leading-5 text-on-surface">{primary.direction === "ltr" ? <UiLtrText>{primary.text}</UiLtrText> : <UiBidiText>{primary.text}</UiBidiText>}</span><div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[12px] leading-4"><DashboardAmount locale={locale} value={quotation.grandTotal} /><StatusBadge variant={quotation.status}>{getQuotationStatusLabel(locale, quotation.status)}</StatusBadge></div></li>;
                })}</ul>}
              </section> : null}

              {paymentsState ? <section className="min-w-0" aria-label={labels.sections.recentPayments}>
                <div className="mb-1.5 flex items-center justify-between gap-3"><h3 className="text-[12px] font-semibold text-on-surface-variant">{labels.sections.recentPayments}</h3>{paymentsState.status === "ready" && paymentsState.data.payments.length > 3 ? <Link href="/payments" className="inline-flex min-h-11 shrink-0 items-center rounded-md px-2 text-[12px] font-semibold text-primary hover:bg-surface-container-low hover:underline">{labels.actions.viewAll}</Link> : null}</div>
                {paymentsState.status === "unavailable" ? <p className="text-[13px] leading-5 text-on-surface-variant">{labels.states.unavailable}</p> : paymentsState.data.payments.length === 0 ? <p className="text-[13px] leading-5 text-on-surface-variant">{labels.states.noRecentPayments}</p> : <ul className="overflow-hidden rounded-lg border border-surface-variant divide-y divide-surface-variant">{paymentsState.data.payments.slice(0, 3).map((payment) => <li key={payment.id} className="min-w-0"><PendingLink href={`/invoices/${payment.invoiceId}`} className="block min-h-11 min-w-0 rounded-md px-2 py-1.5 text-start transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="block min-w-0 text-start text-[13px] leading-5 text-on-surface"><UiLtrText>{payment.paymentNumber}</UiLtrText></span><span className="mt-0.5 block text-start text-[12px] leading-4 text-on-surface-variant"><DashboardAmount locale={locale} value={payment.amount} /></span></PendingLink></li>)}</ul>}
              </section> : null}
            </div>
          </section> : null}
        </div> : null}
      </div> : null}
    </div>
  );
}
