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
import type { QuotationListItem } from "@/lib/quotations/types";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import {
  getDashboardDictionary,
  type DashboardWorkflowStage,
} from "@/lib/i18n/dictionaries/dashboard";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getQuotationStatusLabel } from "@/lib/i18n/dictionaries/quotations";
import type { Locale } from "@/lib/i18n/locales";

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

export default async function DashboardPage() {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getDashboardDictionary(locale);
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

  const [customersState, quotationsState, invoicesState, servicesState] =
    await Promise.all([
      loadIfAllowed("customers:read", getCustomers),
      loadIfAllowed("quotations:read", getQuotations),
      loadIfAllowed("invoices:read", getInvoices),
      loadIfAllowed("services:read", getServices),
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

      <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
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

        <div className="flex flex-col rounded-xl border border-surface-variant bg-surface-container-lowest p-8 md:col-span-4">
          <h3 className="mb-4 border-b border-surface-variant pb-2 text-[20px] font-semibold leading-[28px] text-primary">
            {dictionary.actions.title}
          </h3>
          <div className="flex-1 space-y-4">
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-[14px] leading-[20px] text-on-primary transition-colors hover:bg-primary-container"
            >
              <UserPlus size={18} />
              {dictionary.actions.newCustomer}
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-4 py-3 text-[14px] leading-[20px] text-primary transition-colors hover:bg-surface-container-low"
            >
              <FilePlus size={18} />
              {dictionary.actions.newQuotation}
            </button>
            <button
              type="button"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-4 py-3 text-[14px] leading-[20px] text-primary transition-colors hover:bg-surface-container-low"
            >
              <ReceiptText size={18} />
              {dictionary.actions.newInvoice}
            </button>
            <Link
              href="/services/new"
              className="flex w-full items-center justify-center gap-2 rounded-lg border border-primary bg-surface-container-lowest px-4 py-3 text-[14px] leading-[20px] text-primary transition-colors hover:bg-surface-container-low"
            >
              <BriefcaseBusiness size={18} />
              {dictionary.actions.newService}
            </Link>
          </div>
        </div>

        <div className="flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest md:col-span-6">
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

        <div className="flex flex-col overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest md:col-span-6">
          <div className="flex items-center justify-between border-b border-surface-variant p-4">
            <h3 className="text-[20px] font-semibold leading-[28px] text-primary">
              {dictionary.workflow.title}
            </h3>
            <Link
              href="/services"
              className="text-[12px] font-semibold leading-[16px] tracking-[0.05em] text-primary hover:underline"
            >
              {dictionary.workflow.viewServices}
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="px-4 py-2 text-start text-[12px] font-semibold uppercase leading-[16px] tracking-[0.05em] text-on-surface-variant">
                    {dictionary.workflow.stage}
                  </th>
                  <th className="px-4 py-2 text-start text-[12px] font-semibold uppercase leading-[16px] tracking-[0.05em] text-on-surface-variant">
                    {dictionary.workflow.focus}
                  </th>
                  <th className="px-4 py-2 text-start text-[12px] font-semibold uppercase leading-[16px] tracking-[0.05em] text-on-surface-variant">
                    {dictionary.workflow.owner}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                {(Object.keys(dictionary.workflow.rows) as DashboardWorkflowStage[]).map(
                  (stage) => (
                    <tr
                      key={stage}
                      className="transition-colors hover:bg-surface-container-low/50"
                    >
                      <td className="px-4 py-2 font-medium text-on-surface">
                        {dictionary.workflow.rows[stage].label}
                      </td>
                      <td className="px-4 py-2 text-on-surface-variant">
                        {dictionary.workflow.rows[stage].focus}
                      </td>
                      <td className="px-4 py-2 text-on-surface-variant">
                        {dictionary.workflow.rows[stage].owner}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
