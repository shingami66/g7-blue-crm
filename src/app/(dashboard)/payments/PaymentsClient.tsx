"use client";

import { useState, type ComponentProps } from "react";
import { Banknote, CheckCircle2, Clock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import KpiCard from "@/components/ui/KpiCard";
import PaginationFooter from "@/components/ui/PaginationFooter";
import type { PaymentListItem, PaymentStatus, PaymentsListResult } from "@/lib/payments/types";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  type PaymentsDictionary,
} from "@/lib/i18n/dictionaries/payments";
import { formatSarAmount, formatUiDate, formatUiNumber } from "@/lib/i18n/formatting";

type PaymentsClientProps = {
  payments: PaymentListItem[];
  error?: PaymentsListResult["error"];
  dictionary: PaymentsDictionary;
};

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];

const itemsPerPage = 10;

const getPaymentStatusBadgeVariant = (
  status: PaymentStatus,
): StatusBadgeVariant => {
  if (status === "failed" || status === "refunded") {
    return "rejected";
  }

  return status;
};

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

export default function PaymentsClient({ payments, error, dictionary }: PaymentsClientProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const locale = dictionary.locale;
  const stats = buildPaymentStats(payments);
  const totalPages = Math.max(1, Math.ceil(payments.length / itemsPerPage));
  const paginatedPayments = payments.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title={dictionary.title}
        subtitle={dictionary.subtitle}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KpiCard
          label={dictionary.stats.confirmedCollected}
          value={formatSarAmount(locale, stats.confirmedTotal)}
          icon={CheckCircle2}
        />
        <KpiCard
          label={dictionary.stats.paymentRecords}
          value={formatUiNumber(locale, stats.paymentCount)}
          icon={Banknote}
        />
        <KpiCard
          label={dictionary.stats.pendingPayments}
          value={formatUiNumber(locale, stats.pendingCount)}
          icon={Clock}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-error-container bg-error-container/40 px-4 py-3 text-[14px] font-medium text-on-error-container">
          {dictionary.states.inlineError}
        </div>
      )}

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto">
          <DataTable
            columns={[
              dictionary.table.payment,
              dictionary.table.date,
              dictionary.table.customer,
              dictionary.table.invoice,
              dictionary.table.service,
              dictionary.table.method,
              dictionary.table.reference,
              dictionary.table.amount,
              dictionary.table.status,
            ]}
          >
            {paginatedPayments.map((payment) => (
              <tr key={payment.id} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="px-4 py-4 font-mono font-semibold text-primary">
                  <span dir="ltr">{isolateBidiText(payment.paymentNumber)}</span>
                </td>
                <td className="px-4 py-4 text-on-surface-variant tabular-nums" dir="ltr">
                  {formatUiDate(locale, payment.date)}
                </td>
                <td className="px-4 py-4 font-medium text-on-surface">
                  <span dir="auto">{payment.customerName}</span>
                </td>
                <td className="px-4 py-4 font-mono text-[12px] text-primary">
                  <span dir="ltr">
                    {isolateBidiText(payment.invoiceNumber ?? payment.invoiceId)}
                  </span>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  <span dir="auto">{payment.serviceLabel ?? "—"}</span>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  {getPaymentMethodLabel(locale, payment.method)}
                </td>
                <td className="px-4 py-4 text-on-surface-variant">
                  <span dir="auto">{payment.reference ?? "—"}</span>
                </td>
                <td className="px-4 py-4 font-semibold text-on-surface tabular-nums">
                  <span dir="ltr">{formatSarAmount(locale, payment.amount)}</span>
                </td>
                <td className="px-4 py-4">
                  <StatusBadge variant={getPaymentStatusBadgeVariant(payment.status)}>
                    {getPaymentStatusLabel(locale, payment.status)}
                  </StatusBadge>
                </td>
              </tr>
            ))}
            {payments.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                  {error
                    ? dictionary.states.paymentDataUnavailable
                    : dictionary.table.empty}
                </td>
              </tr>
            )}
          </DataTable>
        </div>

        {payments.length > itemsPerPage && (
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            className="border-t-0"
          />
        )}
      </div>
    </div>
  );
}
