"use client";

import type { ComponentProps } from "react";
import PageHeader from "@/components/ui/PageHeader";
import FilterBar from "@/components/ui/FilterBar";
import DataTable from "@/components/ui/DataTable";
import StatusBadge from "@/components/ui/StatusBadge";
import KpiCard from "@/components/ui/KpiCard";
import { CreditCard, CheckCircle2, Clock, Filter, Download } from "lucide-react";
import { paymentsData } from "@/lib/data/payments";

type StatusBadgeVariant = ComponentProps<typeof StatusBadge>["variant"];
type PaymentStatus = (typeof paymentsData)[number]["status"];

const getPaymentStatusBadgeVariant = (
  status: PaymentStatus,
): StatusBadgeVariant => {
  if (status === "failed" || status === "refunded") {
    return "draft";
  }

  return status;
};

export default function PaymentsPage() {
  return (
    <div className="flex flex-col h-full">
      <PageHeader
        title="Payments Tracking"
        subtitle="Monitor incoming payments and reconcile accounts."
      >
        <button className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant text-on-surface hover:bg-surface-container-low px-4 py-2 rounded-lg text-[14px] leading-[20px] font-semibold transition-colors">
          <Download size={18} />
          Export
        </button>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <KpiCard
          label="Total Received (Oct)"
          value="SAR 850K"
          trend="up"
          trendLabel="+12% vs Sep"
          icon={CheckCircle2}
        />
        <KpiCard
          label="Pending Clearance"
          value="SAR 125K"
          trend="flat"
          trendLabel="3 Transactions"
          icon={Clock}
        />
        <KpiCard
          label="Unmatched Receipts"
          value="SAR 45K"
          trend="warning"
          trendLabel="Action Required"
          icon={CreditCard}
        />
      </div>

      <div className="flex-1 flex flex-col min-h-0">
        <FilterBar>
          <div className="relative">
            <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary">
              <option>All Methods</option>
              <option>Bank Transfer</option>
              <option>Credit Card</option>
              <option>Cheque</option>
            </select>
            <Filter
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>
          <div className="relative">
            <select className="appearance-none bg-surface border border-outline-variant rounded-lg pl-3 pr-8 py-2 text-[14px] leading-[20px] text-on-surface focus:outline-none focus:border-primary">
              <option>All Statuses</option>
              <option>Completed</option>
              <option>Processing</option>
              <option>Failed</option>
            </select>
            <Filter
              size={14}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant pointer-events-none"
            />
          </div>
        </FilterBar>

        <div className="flex-1 overflow-auto">
          <DataTable
            columns={[
              "Payment ID",
              "Date",
              "Client",
              "Invoice Ref",
              "Method",
              "Amount (SAR)",
              "Status",
            ]}
          >
            {paymentsData.map((p) => (
              <tr key={p.id} className="hover:bg-surface-container-low/50 transition-colors">
                <td className="px-4 py-4 font-mono font-semibold text-primary">
                  {p.id}
                </td>
                <td className="px-4 py-4 text-on-surface-variant">{p.date}</td>
                <td className="px-4 py-4 font-medium text-on-surface">{p.customer}</td>
                <td className="px-4 py-4">
                  <span className="text-primary hover:underline cursor-pointer font-mono text-[12px]">
                    {p.invoiceId}
                  </span>
                </td>
                <td className="px-4 py-4 text-on-surface-variant">{p.method}</td>
                <td className="px-4 py-4 font-semibold text-on-surface">{p.amount}</td>
                <td className="px-4 py-4">
                  <StatusBadge variant={getPaymentStatusBadgeVariant(p.status)}>
                    {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </DataTable>
        </div>
      </div>
    </div>
  );
}
