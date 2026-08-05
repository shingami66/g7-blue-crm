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
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import StatusBadge from "@/components/ui/StatusBadge";
import Link from "next/link";
import { redirect } from "next/navigation";
import { checkPermission, requirePermission } from "@/lib/auth/permissions";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCustomers } from "@/lib/customers/queries";
import { getQuotations } from "@/lib/quotations/queries";
import { getInvoices } from "@/lib/invoices/queries";
import { getServices } from "@/lib/services/queries";
import { getPaymentsList } from "@/lib/payments/queries";
import PendingLink from "@/components/ui/PendingLink";
import type { QuotationListItem } from "@/lib/quotations/types";
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

function formatDashboardCount(locale: Locale, value: number): string {
  return formatUiNumber(locale, value);
}

function formatDashboardAmount(locale: Locale, value: number): string {
  return formatSarAmount(locale, value);
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

function getRecentQuotations(quotations: QuotationListItem[]) {
  return [...quotations]
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .slice(0, 4);
}

function recentQuotationPrimaryLabel(quotation: QuotationListItem): {
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

function upcomingServices(services: Awaited<ReturnType<typeof getServices>>) {
  const today = new Date().toISOString().slice(0, 10);
  return services.filter((service) => service.eventStartDate !== null && service.eventStartDate >= today).sort((left, right) => (left.eventStartDate ?? "").localeCompare(right.eventStartDate ?? "") || left.serviceNumber.localeCompare(right.serviceNumber)).slice(0, 6);
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
      loadIfAllowed("customers:read", getCustomers),
      loadIfAllowed("quotations:read", getQuotations),
      loadIfAllowed("invoices:read", getInvoices),
      loadIfAllowed("services:read", getServices),
      loadIfAllowed("payments:read", getPaymentsList),
    ]);
  const [canCreateCustomer, canCreateQuotation, canCreateInvoice, canCreateService] = await Promise.all([
    checkPermission("customers:write"),
    checkPermission("quotations:write"),
    Promise.all([checkPermission("invoices:write"), checkPermission("services:read")]).then(([invoice, services]) => invoice && services),
    checkPermission("services:write"),
  ]);

  const invoices = invoicesState.status === "ready" ? invoicesState.data : [];
  const openInvoiceCount = invoices.filter(
    (invoice) => Number(invoice.balance_due) > 0,
  ).length;
  const totalCollected = invoices.reduce(
    (sum, invoice) => sum + Number(invoice.amount_paid || 0),
    0,
  );
  const pendingBalance = invoices.reduce(
    (sum, invoice) => sum + Math.max(Number(invoice.balance_due || 0), 0),
    0,
  );
  const recentQuotations =
    quotationsState.status === "ready"
      ? getRecentQuotations(quotationsState.data)
      : [];
  const liveServices = servicesState.status === "ready" ? servicesState.data : [];
  const upcoming = upcomingServices(liveServices);
  const readyToStart = liveServices.filter((service) => service.status === "Deposit Paid");
  const inProgress = liveServices.filter((service) => service.status === "In Progress");
  const recentPayments = paymentsState.status === "ready" ? paymentsState.data.payments.slice(0, 5) : [];
  const attentionInvoices = invoices.filter((invoice) => Number(invoice.balance_due) > 0).slice(0, 6);

  return (
    <>
      <div className="mb-8">
        <h2 className="text-[28px] font-semibold leading-[36px] tracking-[-0.01em] text-primary">
          {dictionary.header.title}
        </h2>
        <p className="mt-2 text-[14px] leading-[20px] text-on-surface-variant">
          {dictionary.header.subtitle}
        </p>
      </div>

      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-12 md:gap-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-8 lg:grid-cols-3">
          <KpiCard
            label={dictionary.metrics.totalCustomers}
            value={
              customersState.status === "ready"
                ? formatDashboardCount(locale, customersState.data.length)
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
                ? formatDashboardCount(locale, quotationsState.data.length)
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
                ? formatDashboardCount(locale, servicesState.data.length)
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
              invoicesState.status === "ready"
                ? formatDashboardAmount(locale, totalCollected)
                : dictionary.states.unavailable
            }
            trend="flat"
            trendLabel={
              invoicesState.status === "ready"
                ? dictionary.metrics.collectedOnRecordedInvoices
                : dictionary.states.unavailableForRole
            }
            icon={DollarSign}
          />
          <KpiCard
            label={dictionary.metrics.pendingBalance}
            value={
              invoicesState.status === "ready"
                ? formatDashboardAmount(locale, pendingBalance)
                : dictionary.states.unavailable
            }
            trend="flat"
            trendLabel={
              invoicesState.status === "ready"
                ? dictionary.metrics.fromCurrentInvoices
                : dictionary.states.unavailableForRole
            }
            icon={CreditCard}
          />
        </div>

        <div className="flex self-start flex-col rounded-xl border border-surface-variant bg-surface-container-lowest p-8 md:col-span-4">
          <h3 className="mb-4 border-b border-surface-variant pb-2 text-[20px] font-semibold leading-[28px] text-primary">
            {dictionary.actions.title}
          </h3>
          <div className="space-y-4">
            {canCreateCustomer && <Link href="/customers" className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-[14px] leading-[20px] text-on-primary transition-colors hover:bg-primary-container">
              <UserPlus size={18} />
              {dictionary.actions.newCustomer}
            </Link>}
            {canCreateQuotation && <Link href="/quotations" className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-4 py-3 text-[14px] leading-[20px] text-primary transition-colors hover:bg-surface-container-low">
              <FilePlus size={18} />
              {dictionary.actions.newQuotation}
            </Link>}
            {canCreateInvoice && <Link href="/invoices" className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-4 py-3 text-[14px] leading-[20px] text-primary transition-colors hover:bg-surface-container-low">
              <ReceiptText size={18} />
              {dictionary.actions.newInvoice}
            </Link>}
            {canCreateService && <Link href="/services/new" className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-4 py-3 text-[14px] leading-[20px] text-primary transition-colors hover:bg-surface-container-low">
              <BriefcaseBusiness size={18} />
              {dictionary.actions.newService}
            </Link>}
          </div>
        </div>

        <div data-dashboard-section="priority-work" className="order-2 grid grid-cols-1 items-start gap-6 md:col-span-12 lg:grid-cols-2">
          <DashboardFocusCard title={advancementDictionary.attentionTitle} status={invoicesState.status} unavailable={dictionary.states.unavailableForRole}>
            <FocusGroup title={advancementDictionary.outstandingInvoices} empty={advancementDictionary.noAttention}>{attentionInvoices.map((invoice) => <PendingLink key={invoice.id} href={`/invoices/${invoice.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2 hover:bg-surface-container-low"><span className="text-[13px] text-on-surface" dir="ltr">{invoice.invoice_number}</span><span className="text-[13px] font-semibold text-primary tabular-nums" dir="ltr">{formatDashboardAmount(locale, Number(invoice.balance_due))}</span></PendingLink>)}</FocusGroup>
            <FocusGroup title={advancementDictionary.recentPayments} empty={advancementDictionary.noPayments}>{recentPayments.map((payment) => <PendingLink key={payment.id} href={`/invoices/${payment.invoiceId}`} className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2 hover:bg-surface-container-low"><span className="text-[13px] text-on-surface" dir="ltr">{payment.paymentNumber}</span><span className="text-[13px] font-semibold text-primary tabular-nums" dir="ltr">{formatDashboardAmount(locale, payment.amount)}</span></PendingLink>)}</FocusGroup>
          </DashboardFocusCard>
          <DashboardFocusCard title={advancementDictionary.operationsTitle} status={servicesState.status} unavailable={dictionary.states.unavailableForRole}>
            <FocusGroup title={advancementDictionary.upcoming} empty={advancementDictionary.noUpcoming}>{upcoming.map((service) => <PendingLink key={service.id} href={`/services/${service.id}`} className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2 hover:bg-surface-container-low"><span className="min-w-0 truncate text-[13px] text-on-surface" dir="auto">{service.serviceTitle}</span><span className="shrink-0 text-[12px] text-primary" dir="ltr">{service.serviceNumber}</span></PendingLink>)}</FocusGroup>
            <div className="grid grid-cols-2 gap-3"><MetricPill label={advancementDictionary.readyToStart} value={formatDashboardCount(locale, readyToStart.length)} /><MetricPill label={advancementDictionary.inProgress} value={formatDashboardCount(locale, inProgress.length)} /></div>
          </DashboardFocusCard>
        </div>

        <div data-dashboard-section="quotations" className="order-4 flex self-start flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest md:col-span-6">
          <div className="flex items-center justify-between border-b border-surface-variant p-4">
            <h3 className="text-[20px] font-semibold leading-[28px] text-primary">
              {dictionary.quotations.title}
            </h3>
            <Link
              href="/quotations"
              className="text-[12px] font-semibold leading-[16px] tracking-[0.05em] text-primary hover:underline"
            >
              {dictionary.quotations.viewAll}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-4 py-2 text-start text-[12px] font-semibold uppercase leading-[16px] tracking-[0.05em] text-on-surface-variant">
                    {dictionary.quotations.client}
                  </th>
                  <th className="px-4 py-2 text-start text-[12px] font-semibold uppercase leading-[16px] tracking-[0.05em] text-on-surface-variant">
                    {dictionary.quotations.value}
                  </th>
                  <th className="px-4 py-2 text-start text-[12px] font-semibold uppercase leading-[16px] tracking-[0.05em] text-on-surface-variant">
                    {dictionary.quotations.status}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                {recentQuotations.map((quotation) => {
                  const primary = recentQuotationPrimaryLabel(quotation);
                  return (
                    <tr
                      key={quotation.id}
                      className="transition-colors hover:bg-surface-container-low/50"
                    >
                      <td className="px-4 py-2 text-on-surface">
                        <span dir={primary.dir}>{primary.text}</span>
                      </td>
                      <td className="px-4 py-2 text-on-surface-variant">
                        <span dir="ltr" className="tabular-nums">
                          {formatDashboardAmount(locale, quotation.grandTotal)}
                        </span>
                      </td>
                      <td className="px-4 py-2">
                        <StatusBadge variant={quotation.status}>
                          {getQuotationStatusLabel(locale, quotation.status)}
                        </StatusBadge>
                      </td>
                    </tr>
                  );
                })}
                {recentQuotations.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-on-surface-variant"
                    >
                      {quotationsState.status === "ready"
                        ? dictionary.quotations.noRecentActivity
                        : dictionary.quotations.unavailableForRole}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div data-dashboard-section="workflow" className="order-3 flex self-start flex-col rounded-xl border border-surface-variant bg-surface-container-lowest p-5 md:col-span-6">
          <div className="flex items-center justify-between gap-3 border-b border-surface-variant pb-3">
            <div><h3 className="text-[20px] font-semibold leading-[28px] text-primary">{dictionary.workflow.title}</h3><p className="mt-1 text-[12px] text-on-surface-variant">{dictionary.metrics.basedOnLiveRecords}</p></div>
            <Link href="/services" className="shrink-0 text-[12px] font-semibold leading-[16px] tracking-[0.05em] text-primary hover:underline">{dictionary.workflow.viewServices}</Link>
          </div>
          {servicesState.status === "ready" ? <div className="mt-4 grid grid-cols-2 gap-3">{WORKFLOW_STAGES.map((stage) => <PendingLink key={stage} href={`/services?status=${encodeURIComponent(stage)}`} className="rounded-lg border border-outline-variant p-3 hover:bg-surface-container-low"><span className="block text-[12px] text-on-surface-variant">{dictionary.workflow.rows[stage].label}</span><span className="mt-1 block text-[22px] font-semibold text-primary tabular-nums" dir="ltr">{formatDashboardCount(locale, liveServices.filter((service) => service.status === stage).length)}</span></PendingLink>)}</div> : <p className="mt-4 text-[14px] text-on-surface-variant">{dictionary.states.unavailableForRole}</p>}
        </div>
      </div>

    </>
  );
}

function DashboardFocusCard({ title, status, unavailable, children }: { title: string; status: LoadState<unknown>["status"]; unavailable: string; children: React.ReactNode }) {
  return <section data-dashboard-card="focus" className="self-start rounded-xl border border-surface-variant bg-surface-container-lowest p-5"><h3 className="mb-4 text-[18px] font-semibold text-primary">{title}</h3>{status === "unavailable" ? <p className="text-[14px] text-on-surface-variant">{unavailable}</p> : <div className="space-y-4">{children}</div>}</section>;
}

function FocusGroup({ title, empty, children }: { title: string; empty: string; children: React.ReactNode }) {
  const items = Array.isArray(children) ? children.filter(Boolean) : children;
  return <div><h4 className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-on-surface-variant">{title}</h4>{items && (Array.isArray(items) ? items.length > 0 : true) ? <div className="space-y-2">{children}</div> : <p className="text-[13px] text-on-surface-variant">{empty}</p>}</div>;
}

function MetricPill({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-outline-variant bg-surface p-3"><span className="block text-[11px] text-on-surface-variant">{label}</span><span className="mt-1 block text-[18px] font-semibold text-primary" dir="ltr">{value}</span></div>; }
