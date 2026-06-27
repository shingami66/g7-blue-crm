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

export const dynamic = "force-dynamic";

type LoadState<T> =
  | { status: "ready"; data: T }
  | { status: "unavailable" };

const serviceWorkflow = [
  { stage: "Inquiry", focus: "Capture event or booking request", owner: "Sales" },
  { stage: "Quoted", focus: "Prepare Service-scoped quotation", owner: "Sales" },
  { stage: "Approved", focus: "Record customer approval", owner: "Manager" },
  { stage: "Deposit Paid", focus: "Confirm cleared deposit payment", owner: "Accountant" },
];

const formatCount = (value: number) => new Intl.NumberFormat("en-SA").format(value);

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(value);

const formatStatus = (value: string) =>
  value.charAt(0).toUpperCase() + value.slice(1);

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

function SafeErrorState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500">
          We couldn&apos;t load the dashboard at this time. Please try again later.
        </p>
      </div>
    </div>
  );
}

export default async function DashboardPage() {
  try {
    await requirePermission("dashboard:read");
  } catch (err) {
    if (err instanceof UnauthorizedError) {
      redirect("/sign-in");
    }

    if (err instanceof ForbiddenError) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
          <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Access Denied</h2>
            <p className="text-sm text-slate-500">
              You don&apos;t have permission to view the dashboard.
            </p>
          </div>
        </div>
      );
    }

    return <SafeErrorState />;
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
    quotationsState.status === "ready" ? getRecentQuotations(quotationsState.data) : [];

  return (
    <>
      {/* Page Header */}
      <div className="mb-8">
        <h2 className="text-[28px] leading-[36px] tracking-[-0.01em] font-semibold text-primary">
          Executive Dashboard
        </h2>
        <p className="text-[14px] leading-[20px] text-on-surface-variant mt-2">
          Welcome back. Here is your overview for today.
        </p>
      </div>

      {/* Bento Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 md:gap-6">
        {/* KPI Cards */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <KpiCard
            label="Total Customers"
            value={
              customersState.status === "ready"
                ? formatCount(customersState.data.length)
                : "Unavailable"
            }
            trend="flat"
            trendLabel={
              customersState.status === "ready"
                ? "Based on live records"
                : "Unavailable for this role"
            }
            icon={Users}
          />
          <KpiCard
            label="Total Quotations"
            value={
              quotationsState.status === "ready"
                ? formatCount(quotationsState.data.length)
                : "Unavailable"
            }
            trend="flat"
            trendLabel={
              quotationsState.status === "ready"
                ? "Based on live records"
                : "Unavailable for this role"
            }
            icon={FileText}
          />
          <KpiCard
            label="Open Invoices"
            value={
              invoicesState.status === "ready"
                ? formatCount(openInvoiceCount)
                : "Unavailable"
            }
            trend="flat"
            trendLabel={
              invoicesState.status === "ready"
                ? "From current invoices"
                : "Unavailable for this role"
            }
            icon={Receipt}
          />
          <KpiCard
            label="Services"
            value={
              servicesState.status === "ready"
                ? formatCount(servicesState.data.length)
                : "Unavailable"
            }
            trend="flat"
            trendLabel={
              servicesState.status === "ready"
                ? "Based on live records"
                : "Unavailable for this role"
            }
            icon={BriefcaseBusiness}
          />
          <KpiCard
            label="Total Collected"
            value={
              invoicesState.status === "ready"
                ? formatCurrency(totalCollected)
                : "Unavailable"
            }
            trend="flat"
            trendLabel={
              invoicesState.status === "ready"
                ? "Collected on recorded invoices"
                : "Unavailable for this role"
            }
            icon={DollarSign}
          />
          <KpiCard
            label="Pending Balance"
            value={
              invoicesState.status === "ready"
                ? formatCurrency(pendingBalance)
                : "Unavailable"
            }
            trend="flat"
            trendLabel={
              invoicesState.status === "ready"
                ? "From current invoices"
                : "Unavailable for this role"
            }
            icon={CreditCard}
          />
        </div>

        {/* Quick Actions */}
        <div className="md:col-span-4 bg-surface-container-lowest rounded-xl border border-surface-variant p-8 flex flex-col">
          <h3 className="text-[20px] leading-[28px] font-semibold text-primary border-b border-surface-variant pb-2 mb-4">
            Quick Actions
          </h3>
          <div className="space-y-4 flex-1">
            <button className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-container text-on-primary py-3 px-4 rounded-lg text-[14px] leading-[20px] transition-colors">
              <UserPlus size={18} />
              New Customer
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low py-3 px-4 rounded-lg text-[14px] leading-[20px] transition-colors">
              <FilePlus size={18} />
              New Quotation
            </button>
            <button className="w-full flex items-center justify-center gap-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low py-3 px-4 rounded-lg text-[14px] leading-[20px] transition-colors">
              <ReceiptText size={18} />
              New Invoice
            </button>
            <Link
              href="/services/new"
              className="w-full flex items-center justify-center gap-2 bg-surface-container-lowest border border-primary text-primary hover:bg-surface-container-low py-3 px-4 rounded-lg text-[14px] leading-[20px] transition-colors"
            >
              <BriefcaseBusiness size={18} />
              New Service
            </Link>
          </div>
        </div>

        {/* Recent Quotations */}
        <div className="md:col-span-6 bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-variant flex justify-between items-center">
            <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
              Recent Quotations
            </h3>
            <Link
              href="/quotations"
              className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-primary hover:underline"
            >
              View All
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Client
                  </th>
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Value
                  </th>
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                {recentQuotations.map((q) => (
                  <tr
                    key={q.id}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-on-surface">
                      {q.customer?.company ?? q.event ?? q.quotationNumber}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">
                      {formatCurrency(q.grandTotal)}
                    </td>
                    <td className="px-4 py-2">
                      <StatusBadge variant={q.status}>
                        {formatStatus(q.status)}
                      </StatusBadge>
                    </td>
                  </tr>
                ))}
                {recentQuotations.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
                      className="px-4 py-8 text-center text-on-surface-variant"
                    >
                      {quotationsState.status === "ready"
                        ? "No recent activity yet"
                        : "Recent quotations unavailable for this role."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Service Workflow */}
        <div className="md:col-span-6 bg-surface-container-lowest rounded-xl border border-surface-variant overflow-hidden flex flex-col">
          <div className="p-4 border-b border-surface-variant flex justify-between items-center">
            <h3 className="text-[20px] leading-[28px] font-semibold text-primary">
              Service Workflow
            </h3>
            <Link
              href="/services"
              className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-primary hover:underline"
            >
              View Services
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container-low">
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Service Stage
                  </th>
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Focus
                  </th>
                  <th className="text-[12px] leading-[16px] tracking-[0.05em] font-semibold text-on-surface-variant uppercase px-4 py-2">
                    Owner
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-variant text-[14px] leading-[20px]">
                {serviceWorkflow.map((stage, i) => (
                  <tr
                    key={i}
                    className="hover:bg-surface-container-low/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-on-surface font-medium">
                      {stage.stage}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">
                      {stage.focus}
                    </td>
                    <td className="px-4 py-2 text-on-surface-variant">
                      {stage.owner}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );
}
