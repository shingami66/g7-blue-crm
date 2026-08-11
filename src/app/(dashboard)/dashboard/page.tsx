import {
  Users,
  FileText,
  Receipt,
  DollarSign,
  CreditCard,
  UserPlus,
  FilePlus,
  ReceiptText,
  BriefcaseBusiness,
} from "lucide-react";
import KpiCard from "@/components/ui/KpiCard";
import PageHeader from "@/components/ui/PageHeader";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import {
  getDashboardCustomersData,
  getDashboardQuotationsData,
  getDashboardInvoicesData,
  getDashboardServicesData,
  getDashboardPaymentsData,
  type DashboardRecentQuotation,
} from "@/lib/dashboard/queries";
import PendingLink from "@/components/ui/PendingLink";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import {
  getDashboardDictionary,
} from "@/lib/i18n/dictionaries/dashboard";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getQuotationStatusLabel } from "@/lib/i18n/dictionaries/quotations";
import type { Locale } from "@/lib/i18n/locales";
import { getDashboardAdvancementDictionary } from "@/lib/i18n/dictionaries/dashboard-advancement";

export const dynamic = "force-dynamic";

type LoadState<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable" };

type DashboardWidgetDefinition = {
  id: string;
  readPermission: string;
  scope: "business-year" | "global";
  sensitivity: "operational" | "financial";
  displayPriority: number;
  emptyState: "unavailableForRole";
  destination: string;
  yearScoped: boolean;
};

const DASHBOARD_WIDGETS = {
  customers: {
    id: "customers-kpi",
    readPermission: "customers:read",
    scope: "global",
    sensitivity: "operational",
    displayPriority: 10,
    emptyState: "unavailableForRole",
    destination: "/customers",
    yearScoped: false,
  },
  quotations: {
    id: "quotations-kpi-and-list",
    readPermission: "quotations:read",
    scope: "global",
    sensitivity: "operational",
    displayPriority: 20,
    emptyState: "unavailableForRole",
    destination: "/quotations",
    yearScoped: false,
  },
  invoices: {
    id: "invoices-kpi-and-attention",
    readPermission: "invoices:read",
    scope: "global",
    sensitivity: "financial",
    displayPriority: 30,
    emptyState: "unavailableForRole",
    destination: "/invoices",
    yearScoped: false,
  },
  services: {
    id: "services-kpi-and-workflow",
    readPermission: "services:read",
    scope: "global",
    sensitivity: "operational",
    displayPriority: 40,
    emptyState: "unavailableForRole",
    destination: "/services",
    yearScoped: false,
  },
  payments: {
    id: "payments-kpi-and-activity",
    readPermission: "payments:read",
    scope: "global",
    sensitivity: "financial",
    displayPriority: 50,
    emptyState: "unavailableForRole",
    destination: "/payments",
    yearScoped: false,
  },
} as const satisfies Record<string, DashboardWidgetDefinition>;

function formatDashboardCount(locale: Locale, value: number): string {
  return formatUiNumber(locale, value);
}

function formatDashboardAmount(locale: Locale, value: number): string {
  return formatSarAmount(locale, value);
}

function DashboardAmount({ locale, value }: { locale: Locale; value: number }) {
  return (
    <span dir="ltr" className="inline-block whitespace-nowrap tabular-nums">
      {formatDashboardAmount(locale, value)}
    </span>
  );
}

async function loadIfAllowed<T>(
  permission: string,
  load: () => Promise<T>,
): Promise<LoadState<T>> {
  const allowed = await checkPermission(permission);

  if (!allowed) {
    return { status: "unavailable" };
  }

  try {
    return { status: "ready", data: await load() };
  } catch (err) {
    console.error(
      `[DashboardPage] Failed to load ${permission}`,
      err instanceof Error ? err.message : "Unknown",
    );
    return { status: "unavailable" };
  }
}

function recentQuotationPrimaryLabel(quotation: DashboardRecentQuotation): {
  text: string;
  dir: "auto" | "ltr";
} {
  if (quotation.customer?.company) {
    return { text: quotation.customer.company, dir: "auto" };
  }
  if (quotation.event) {
    return { text: quotation.event, dir: "auto" };
  }
  return { text: quotation.quotationNumber, dir: "ltr" };
}

const WORKFLOW_STAGES = ["Inquiry", "Quoted", "Approved", "Deposit Paid"] as const;

export default async function DashboardPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getDashboardDictionary(locale);
  const advancementDictionary = getDashboardAdvancementDictionary(locale);
  const sharedStates = getSharedUiStates(locale);

  try {
    await requirePermission("dashboard:read");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <SharedAuthenticatedStatePanel
          title={sharedStates.accessDenied.title}
          message={dictionary.states.unavailableForRole}
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

  const [customersState, quotationsState, invoicesState, servicesState, paymentsState] =
    await Promise.all([
      loadIfAllowed(DASHBOARD_WIDGETS.customers.readPermission, getDashboardCustomersData),
      loadIfAllowed(DASHBOARD_WIDGETS.quotations.readPermission, getDashboardQuotationsData),
      loadIfAllowed(DASHBOARD_WIDGETS.invoices.readPermission, getDashboardInvoicesData),
      loadIfAllowed(DASHBOARD_WIDGETS.services.readPermission, getDashboardServicesData),
      loadIfAllowed(DASHBOARD_WIDGETS.payments.readPermission, getDashboardPaymentsData),
    ]);
  const [canCreateCustomer, canCreateQuotation, canCreateInvoice, canCreateService] = await Promise.all([
    checkPermission("customers:write"),
    checkPermission("quotations:write"),
    Promise.all([checkPermission("invoices:write"), checkPermission("services:read")]).then(([invoice, services]) => invoice && services),
    checkPermission("services:write"),
  ]);

  const invoicesData = invoicesState.status === "ready" ? invoicesState.data : null;
  const openInvoiceCount = invoicesData?.openInvoiceCount ?? 0;
  const totalCollected = invoicesData?.totalCollected ?? null;
  const pendingBalance = invoicesData?.pendingBalance ?? null;
  const attentionInvoices = invoicesData?.attentionInvoices ?? [];
  const hasMoreAttentionInvoices = invoicesData?.hasMoreAttentionInvoices ?? false;

  const quotationsData = quotationsState.status === "ready" ? quotationsState.data : null;
  const recentQuotations = quotationsData?.recentQuotations ?? [];

  const servicesData = servicesState.status === "ready" ? servicesState.data : null;
  const upcoming = servicesData?.upcomingServices ?? [];
  const readyToStartCount = servicesData?.readyToStartCount ?? 0;
  const inProgressCount = servicesData?.inProgressCount ?? 0;

  const recentPayments = paymentsState.status === "ready" ? paymentsState.data.payments.slice(0, 5) : [];

  return (
    <div data-dashboard-workspace="command" data-dashboard-content-frame="true" className="mx-auto w-full max-w-[1240px]">
      <PageHeader title={dictionary.header.title} subtitle={dictionary.header.subtitle}>
        <div data-dashboard-section="quick-actions" className="flex w-full max-w-full flex-wrap gap-2 sm:w-auto">
          {canCreateCustomer && <Link href="/customers" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-[13px] font-semibold leading-[18px] text-on-primary transition-colors hover:bg-primary-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <UserPlus size={16} aria-hidden="true" />
            {dictionary.actions.newCustomer}
          </Link>}
          {canCreateQuotation && <Link href="/quotations" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-3 py-2 text-[13px] font-semibold leading-[18px] text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <FilePlus size={16} aria-hidden="true" />
            {dictionary.actions.newQuotation}
          </Link>}
          {canCreateInvoice && <Link href="/invoices" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-3 py-2 text-[13px] font-semibold leading-[18px] text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <ReceiptText size={16} aria-hidden="true" />
            {dictionary.actions.newInvoice}
          </Link>}
          {canCreateService && <Link href="/services/new" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-3 py-2 text-[13px] font-semibold leading-[18px] text-primary transition-colors hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2">
            <BriefcaseBusiness size={16} aria-hidden="true" />
            {dictionary.actions.newService}
          </Link>}
        </div>
      </PageHeader>

      <section data-dashboard-section="business-snapshot" aria-labelledby="dashboard-business-snapshot" className="mb-8">
        <h3 id="dashboard-business-snapshot" className="mb-3 text-[18px] font-semibold leading-[24px] text-primary">
          {dictionary.sections.businessSnapshot}
        </h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <KpiCard
            label={dictionary.metrics.totalCustomers}
            value={
              customersState.status === "ready"
                ? formatDashboardCount(locale, customersState.data.totalCount)
                : dictionary.states.unavailable
            }
            trend="flat"
            trendLabel={
              customersState.status === "ready"
                ? dictionary.metrics.basedOnLiveRecords
                : dictionary.states.unavailableForRole
            }
            icon={Users}
          />
          <KpiCard
            label={dictionary.metrics.totalQuotations}
            value={
              quotationsState.status === "ready"
                ? formatDashboardCount(locale, quotationsState.data.totalCount)
                : dictionary.states.unavailable
            }
            trend="flat"
            trendLabel={
              quotationsState.status === "ready"
                ? dictionary.metrics.basedOnLiveRecords
                : dictionary.states.unavailableForRole
            }
            icon={FileText}
          />
          <KpiCard
            label={dictionary.metrics.openInvoices}
            value={
              invoicesState.status === "ready"
                ? formatDashboardCount(locale, openInvoiceCount)
                : dictionary.states.unavailable
            }
            trend="flat"
            trendLabel={
              invoicesState.status === "ready"
                ? dictionary.metrics.fromCurrentInvoices
                : dictionary.states.unavailableForRole
            }
            icon={Receipt}
          />
          <KpiCard
            label={dictionary.metrics.services}
            value={
              servicesState.status === "ready"
                ? formatDashboardCount(locale, servicesState.data.totalCount)
                : dictionary.states.unavailable
            }
            trend="flat"
            trendLabel={
              servicesState.status === "ready"
                ? dictionary.metrics.basedOnLiveRecords
                : dictionary.states.unavailableForRole
            }
            icon={BriefcaseBusiness}
          />
          <KpiCard
            label={dictionary.metrics.totalCollected}
            value={
              invoicesState.status === "ready" && totalCollected !== null
                ? <DashboardAmount locale={locale} value={totalCollected} />
                : dictionary.states.unavailable
            }
            trend="flat"
            trendLabel={
              invoicesState.status === "ready" && totalCollected !== null
                ? dictionary.metrics.collectedOnRecordedInvoices
                : dictionary.states.unavailableForRole
            }
            icon={DollarSign}
          />
          <KpiCard
            label={dictionary.metrics.pendingBalance}
            value={
              invoicesState.status === "ready" && pendingBalance !== null
                ? <DashboardAmount locale={locale} value={pendingBalance} />
                : dictionary.states.unavailable
            }
            trend="flat"
            trendLabel={
              invoicesState.status === "ready" && pendingBalance !== null
                ? dictionary.metrics.fromCurrentInvoices
                : dictionary.states.unavailableForRole
            }
            icon={CreditCard}
          />
        </div>
      </section>

      <div data-dashboard-section="dashboard-main-columns" className="mb-8">
        <div data-dashboard-main-columns="true" className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div data-dashboard-column="left" className="min-w-0 space-y-6 lg:col-span-5">
            <DashboardFocusCard headingId="dashboard-attention-needed" title={advancementDictionary.attentionTitle} status={invoicesState.status} unavailable={dictionary.states.unavailableForRole}>
              <FocusGroup
                title={advancementDictionary.outstandingInvoices}
                empty={advancementDictionary.noAttention}
                action={hasMoreAttentionInvoices ? <Link href="/invoices" className="shrink-0 text-[12px] font-semibold leading-[16px] tracking-[0.05em] text-primary hover:underline">{dictionary.quotations.viewAll}</Link> : undefined}
              >
                {attentionInvoices.map((invoice) => <PendingLink key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2 hover:bg-surface-container-low"><span className="inline-block whitespace-nowrap text-[13px] text-on-surface" dir="ltr">{invoice.invoice_number}</span><DashboardAmount locale={locale} value={Number(invoice.balance_due)} /></PendingLink>)}
              </FocusGroup>
            </DashboardFocusCard>

            <section data-dashboard-section="workflow" aria-labelledby="dashboard-workflow" className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
              <div className="flex items-center justify-between gap-3 border-b border-surface-variant pb-3">
                <div>
                  <h3 id="dashboard-workflow" className="text-[18px] font-semibold leading-[24px] text-primary">{dictionary.workflow.title}</h3>
                  <p className="mt-1 text-[12px] text-on-surface-variant">{dictionary.metrics.basedOnLiveRecords}</p>
                </div>
                <Link href="/services" className="shrink-0 text-[12px] font-semibold leading-[16px] tracking-[0.05em] text-primary hover:underline">{dictionary.workflow.viewServices}</Link>
              </div>
              {servicesState.status === "ready" ? <div className="mt-4 grid grid-cols-2 gap-3">{WORKFLOW_STAGES.map((stage) => <PendingLink key={stage} href={`/services?status=${encodeURIComponent(stage)}`} className="rounded-lg border border-outline-variant p-3 hover:bg-surface-container-low"><span className="block text-[12px] text-on-surface-variant">{dictionary.workflow.rows[stage].label}</span><span className="mt-1 block text-[22px] font-semibold text-primary tabular-nums" dir="ltr">{formatDashboardCount(locale, servicesData?.workflowCounts[stage] ?? 0)}</span></PendingLink>)}</div> : <p className="mt-4 text-[14px] text-on-surface-variant">{dictionary.states.unavailableForRole}</p>}
            </section>
          </div>

          <div data-dashboard-column="right" className="min-w-0 space-y-6 lg:col-span-7">
            <section data-dashboard-section="operations-focus" aria-labelledby="dashboard-operations-focus">
              <DashboardFocusCard headingId="dashboard-operations-focus" title={advancementDictionary.operationsTitle} status={servicesState.status} unavailable={dictionary.states.unavailableForRole}>
                <FocusGroup title={advancementDictionary.upcoming} empty={advancementDictionary.noUpcoming}>{upcoming.map((service) => <PendingLink key={service.id} href={`/services/${service.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2 hover:bg-surface-container-low"><span className="min-w-0 truncate text-[13px] text-on-surface" dir="auto">{service.serviceTitle}</span><span className="shrink-0 whitespace-nowrap text-[12px] text-primary" dir="ltr">{service.serviceNumber}</span></PendingLink>)}</FocusGroup>
                <div className="grid grid-cols-2 gap-3"><MetricPill label={advancementDictionary.readyToStart} value={formatDashboardCount(locale, readyToStartCount)} /><MetricPill label={advancementDictionary.inProgress} value={formatDashboardCount(locale, inProgressCount)} /></div>
              </DashboardFocusCard>
            </section>

            <section data-dashboard-section="recent-activity" aria-labelledby="dashboard-recent-activity" className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
              <h3 id="dashboard-recent-activity" className="text-[18px] font-semibold leading-[24px] text-primary">{dictionary.sections.recentActivity}</h3>
              <div className="mt-4 space-y-6">
                <section data-dashboard-section="quotations" aria-labelledby="dashboard-recent-quotations">
                  <div className="flex items-center justify-between gap-3 border-b border-surface-variant pb-3">
                    <h4 id="dashboard-recent-quotations" className="text-[14px] font-semibold leading-[20px] text-primary">{dictionary.sections.recentQuotations}</h4>
                    <Link href="/quotations" className="shrink-0 text-[12px] font-semibold leading-[16px] tracking-[0.05em] text-primary hover:underline">{dictionary.quotations.viewAll}</Link>
                  </div>
                  {quotationsState.status === "unavailable" ? <p className="mt-4 text-[13px] text-on-surface-variant">{dictionary.quotations.unavailableForRole}</p> : recentQuotations.length === 0 ? <p className="mt-4 text-[13px] text-on-surface-variant">{dictionary.quotations.noRecentActivity}</p> : <div className="mt-3 space-y-2" role="list">{recentQuotations.map((quotation) => { const primary = recentQuotationPrimaryLabel(quotation); return <div key={quotation.id} role="listitem" className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2 hover:bg-surface-container-low/50"><span className="min-w-0 flex-1 truncate text-[13px] text-on-surface" dir={primary.dir}>{primary.text}</span><div className="flex shrink-0 flex-wrap items-center gap-2"><DashboardAmount locale={locale} value={quotation.grandTotal} /><StatusBadge variant={quotation.status}>{getQuotationStatusLabel(locale, quotation.status)}</StatusBadge></div></div>; })}</div>}
                </section>

                <section data-dashboard-section="payments" aria-labelledby="dashboard-recent-payments">
                  <div className="flex items-center justify-between gap-3 border-b border-surface-variant pb-3">
                    <h4 id="dashboard-recent-payments" className="text-[14px] font-semibold leading-[20px] text-primary">{dictionary.sections.recentPayments}</h4>
                    <Link href="/payments" className="shrink-0 text-[12px] font-semibold leading-[16px] tracking-[0.05em] text-primary hover:underline">{dictionary.quotations.viewAll}</Link>
                  </div>
                  {paymentsState.status === "unavailable" ? <p className="mt-4 text-[13px] text-on-surface-variant">{dictionary.states.unavailableForRole}</p> : recentPayments.length === 0 ? <p className="mt-4 text-[13px] text-on-surface-variant">{advancementDictionary.noPayments}</p> : <div className="mt-3 space-y-2" role="list">{recentPayments.map((payment) => <PendingLink key={payment.id} href={`/invoices/${payment.invoiceId}`} role="listitem" className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2 hover:bg-surface-container-low"><span className="inline-block whitespace-nowrap text-[13px] text-on-surface" dir="ltr">{payment.paymentNumber}</span><DashboardAmount locale={locale} value={payment.amount} /></PendingLink>)}</div>}
                </section>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardFocusCard({ headingId, title, status, unavailable, children }: { headingId?: string; title: string; status: LoadState<unknown>["status"]; unavailable: string; children: React.ReactNode }) {
  return <section data-dashboard-card="focus" className="self-start rounded-xl border border-surface-variant bg-surface-container-lowest p-5"><h4 id={headingId} className="mb-4 text-[18px] font-semibold text-primary">{title}</h4>{status === "unavailable" ? <p className="text-[14px] text-on-surface-variant">{unavailable}</p> : <div className="space-y-4">{children}</div>}</section>;
}

function FocusGroup({ title, empty, action, children }: { title: string; empty: string; action?: React.ReactNode; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  return <div><div className="mb-2 flex items-center justify-between gap-3"><h5 className="text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">{title}</h5>{action}</div>{items && (Array.isArray(items) ? items.length > 0 : true) ? <div className="space-y-2">{children}</div> : <p className="text-[13px] text-on-surface-variant">{empty}</p>}</div>;
}

function MetricPill({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-outline-variant bg-surface p-3"><span className="block text-[11px] text-on-surface-variant">{label}</span><span className="mt-1 block text-[18px] font-semibold text-primary" dir="ltr">{value}</span></div>; }
