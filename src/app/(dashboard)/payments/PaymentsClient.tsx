"use client";

import { useState, useRef, useEffect, type ComponentProps } from "react";
import { Banknote, CheckCircle2, Clock } from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import KpiCard from "@/components/ui/KpiCard";
import PaginationFooter from "@/components/ui/PaginationFooter";
import ModuleSearchInput from "@/components/ui/ModuleSearchInput";
import type { PaymentListItem, PaymentStatus, PaymentsListResult } from "@/lib/payments/types";
import { isolateBidiText } from "@/lib/i18n/bidi";
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  type PaymentsDictionary,
} from "@/lib/i18n/dictionaries/payments";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { UiDateText } from "@/components/i18n/UiDateText";
import { matchesLocalSearch } from "@/lib/search/local";

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
  const [searchTerm, setSearchTerm] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollLeft = 0;
    }
  }, [currentPage]);

  const locale = dictionary.locale;
  const stats = buildPaymentStats(payments);
  const filteredPayments = payments.filter((payment) =>
    matchesLocalSearch(searchTerm, [
      payment.paymentNumber,
      payment.invoiceNumber,
      payment.reference,
      payment.customerName,
      payment.serviceLabel,
    ]),
  );
  const totalPages = Math.max(1, Math.ceil(filteredPayments.length / itemsPerPage));
  const paginatedPayments = filteredPayments.slice(
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

      <div className="mb-4 w-full max-w-sm">
        <ModuleSearchInput
          value={searchTerm}
          onChange={(value) => {
            setSearchTerm(value);
            setCurrentPage(1);
          }}
          placeholder={dictionary.searchPlaceholder}
          ariaLabel={dictionary.searchPlaceholder}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <div className="flex-1 overflow-auto min-h-0 overflow-y-auto overflow-x-hidden">
          <div ref={scrollRef} className="w-full overflow-x-auto">
            <div className="min-w-[980px]">
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
                  <td className="px-4 py-4 font-mono font-semibold text-primary whitespace-nowrap">
                    <span dir="ltr">{isolateBidiText(payment.paymentNumber)}</span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    <UiDateText locale={locale} value={payment.date} />
                  </td>
                  <td className="px-4 py-4 font-medium text-on-surface max-w-[180px] truncate" title={payment.customerName}>
                    <span dir="auto">{payment.customerName}</span>
                  </td>
                  <td className="px-4 py-4 font-mono text-[12px] text-primary whitespace-nowrap">
                    <span dir="ltr">
                      {isolateBidiText(payment.invoiceNumber ?? payment.invoiceId)}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant max-w-[200px] whitespace-normal break-words" title={payment.serviceLabel ?? undefined}>
                    <span dir="auto">{payment.serviceLabel ?? "—"}</span>
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant whitespace-nowrap">
                    {getPaymentMethodLabel(locale, payment.method)}
                  </td>
                  <td className="px-4 py-4 text-on-surface-variant max-w-[150px] truncate" title={payment.reference ?? undefined}>
                    <span dir="auto">{payment.reference ?? "—"}</span>
                  </td>
                  <td className="px-4 py-4 font-semibold text-on-surface tabular-nums whitespace-nowrap">
                    <span dir="ltr" className="inline-block whitespace-nowrap">
                      {formatSarAmount(locale, payment.amount)}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <StatusBadge variant={getPaymentStatusBadgeVariant(payment.status)}>
                      {getPaymentStatusLabel(locale, payment.status)}
                    </StatusBadge>
                  </td>
                </tr>
              ))}
              {filteredPayments.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-on-surface-variant">
                    {error
                      ? dictionary.states.paymentDataUnavailable
                      : payments.length === 0
                        ? dictionary.table.empty
                        : dictionary.states.noFilteredPayments}
                  </td>
                </tr>
              )}
            </DataTable>
            </div>
          </div>
        </div>

        {payments.length > itemsPerPage && (
          <PaginationFooter
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            className="border-t-0"
          />
        )}
      </div>
    </div>
  );
}
