import type { ComponentProps } from "react";
import { redirect } from "next/navigation";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import KpiCard from "@/components/ui/KpiCard";
import { Banknote, CheckCircle2, Clock } from "lucide-react";
import { getPaymentsList } from "@/lib/payments/queries";
import { ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import type { PaymentListItem, PaymentStatus } from "@/lib/payments/types";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const getPaymentStatusBadgeVariant = (
  status: PaymentStatus,
): StatusBadgeVariant => {
  if (status === "failed" || status === "refunded") {
    return "rejected";
  }

  return status;
};

const formatCurrency = (value: number) =>
  new Intl.NumberFormat("en-SA", {
    style: "currency",
    currency: "SAR",
    minimumFractionDigits: 2,
  }).format(value);

const formatDate = (value: string) =>
  new Date(`${value}T00:00:00`).toLocaleDateString("en-SA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

const formatMethod = (value: string) =>
  value
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const formatStatus = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);

function buildPaymentStats(payments: PaymentListItem[]) {
  const confirmedPayments = payments.filter((payment) => payment.status === "confirmed");
  const confirmedTotal = confirmedPayments.reduce((sum, payment) => sum + payment.amount, 0);
  const pendingCount = payments.filter((payment) => payment.status === "pending").length;

  return {
    confirmedTotal,
    paymentCount: payments.length,
    pendingCount,
  };
}

function SafeErrorState() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm text-center">
        <h2 className="text-xl font-semibold text-slate-900 mb-2">Something went wrong</h2>
        <p className="text-sm text-slate-500">
          We couldn&apos;t load payments at this time. Please try again later.
        </p>
      </div>
    </div>
  );
}

export const dynamic = "force-dynamic";

export default async function PaymentsPage() {
  let result: Awaited<ReturnType<typeof getPaymentsList>>;

  try {
    result = await getPaymentsList();
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
              You don&apos;t have permission to view the payments module.
            </p>
          </div>
        </div>
      );
    }

    return <SafeErrorState />;
  }

  const { payments } = result;
  const stats = buildPaymentStats(payments);

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Payments Tracking"
        subtitle="Review recorded invoice payments from the live database."
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KpiCard
          label="Confirmed Collected"
          value={formatCurrency(stats.confirmedTotal)}
          icon={CheckCircle2}
        />
        <KpiCard
          label="Payment Records"
          value={stats.paymentCount.toString()}
          icon={Banknote}
        />
        <KpiCard
          label="Pending Payments"
          value={stats.pendingCount.toString()}
          icon={Clock}
        />
      </div>

      {result.error && (
        <div className="mb-4 rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-[14px] font-medium text-on-error-container">
          Payments could not be loaded right now.
        </div>
      )}

      <div className="flex-1 overflow-auto">
        <DataTable
          columns={[
            "Payment",
            "Date",
            "Customer",
            "Invoice",
            "Service",
            "Method",
            "Reference",
            "Amount",
            "Status",
          ]}
        >
          {payments.map((payment) => (
            <tr key={payment.id} className="hover:bg-surface-container-low/50 transition-colors">
              <td className="px-4 py-4 font-mono font-semibold text-primary">
                {payment.paymentNumber}
              </td>
              <td className="px-4 py-4 text-on-surface-variant">
                {formatDate(payment.date)}
              </td>
              <td className="px-4 py-4 font-medium text-on-surface">
                {payment.customerName}
              </td>
              <td className="px-4 py-4 font-mono text-[12px] text-primary">
                {payment.invoiceNumber ?? payment.invoiceId}
              </td>
              <td className="px-4 py-4 text-on-surface-variant">
                {payment.serviceLabel ?? "-"}
              </td>
              <td className="px-4 py-4 text-on-surface-variant">
                {formatMethod(payment.method)}
              </td>
              <td className="px-4 py-4 text-on-surface-variant">
                {payment.reference ?? "-"}
              </td>
              <td className="px-4 py-4 font-semibold text-on-surface">
                {formatCurrency(payment.amount)}
              </td>
              <td className="px-4 py-4">
                <StatusBadge variant={getPaymentStatusBadgeVariant(payment.status)}>
                  {formatStatus(payment.status)}
                </StatusBadge>
              </td>
            </tr>
          ))}
          {payments.length === 0 && (
            <tr>
              <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                No payments have been recorded yet.
              </td>
            </tr>
          )}
        </DataTable>
      </div>
    </div>
  );
}
