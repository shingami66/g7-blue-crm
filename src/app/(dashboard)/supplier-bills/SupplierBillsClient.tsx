"use client";

import { Eye, Plus } from "lucide-react";
import PendingLink from "@/components/ui/PendingLink";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatSarAmount, formatUiDate } from "@/lib/i18n/formatting";
import type { SupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import type { SupplierBillListItem } from "@/lib/supplier-bills/types";

function statusVariant(status: SupplierBillListItem["status"]): "pending" | "active" {
  return status === "approved" ? "active" : "pending";
}

export default function SupplierBillsClient({
  bills,
  canRecord,
  canApprove,
  dictionary,
}: {
  bills: SupplierBillListItem[];
  canRecord: boolean;
  canApprove: boolean;
  dictionary: SupplierBillsDictionary;
}) {
  const locale = dictionary.locale;
  return (
    <div dir={locale === "ar" ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5 pb-12" data-supplier-bills-workspace="list">
      <PageHeader title={dictionary.title} subtitle={dictionary.subtitle}>
        {canRecord && (
          <Button asChild size="sm">
            <PendingLink href="/supplier-bills/new" pendingLabel={dictionary.newBill}>
              <Plus size={16} aria-hidden="true" />
              {dictionary.newBill}
            </PendingLink>
          </Button>
        )}
      </PageHeader>

      <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-label={dictionary.title}>
        <div className="border-b border-surface-variant bg-surface-container-low px-4 py-3 text-[12px] text-on-surface-variant">
          {dictionary.notices.approvalGate}
        </div>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[940px] table-fixed border-collapse text-start" data-testid="supplier-bills-desktop-table">
            <colgroup>
              <col className="w-[14%]" />
              <col className="w-[17%]" />
              <col className="w-[23%]" />
              <col className="w-[14%]" />
              <col className="w-[14%]" />
              <col className="w-[10%]" />
              <col className="w-[8%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-surface-variant text-[11px] font-semibold uppercase text-on-surface-variant">
                <th className="px-4 py-3 text-start">{dictionary.columns.bill}</th>
                <th className="px-4 py-3 text-start">{dictionary.columns.supplier}</th>
                <th className="px-4 py-3 text-start">{dictionary.columns.service}</th>
                <th className="px-4 py-3 text-start">{dictionary.columns.invoiceDate}</th>
                <th className="px-4 py-3 text-end">{dictionary.columns.total}</th>
                <th className="px-4 py-3 text-center">{dictionary.columns.status}</th>
                <th className="px-4 py-3 text-center">{dictionary.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant text-[13px]">
              {bills.map((bill) => (
                <tr key={bill.id} className="transition-colors hover:bg-surface-container-low/50">
                  <td className="px-4 py-4 align-top">
                    <PendingLink href={`/supplier-bills/${bill.id}`} pendingLabel={dictionary.actions.view} className="font-semibold text-primary hover:underline" dir="ltr">
                      {bill.bill_number}
                    </PendingLink>
                    <div className="mt-1 text-[12px] text-on-surface-variant" dir="ltr">{bill.invoice_number}</div>
                  </td>
                  <td className="break-words px-4 py-4 align-top text-on-surface" dir="auto">{bill.supplier_name}</td>
                  <td className="break-words px-4 py-4 align-top" dir="auto">
                    <div className="font-medium text-on-surface">{bill.service_number}</div>
                    <div className="mt-0.5 text-[12px] text-on-surface-variant">{bill.event_name || bill.service_title}</div>
                  </td>
                  <td className="px-4 py-4 align-top" dir="ltr"><bdi>{formatUiDate(locale, bill.invoice_date)}</bdi></td>
                  <td className="px-4 py-4 text-end align-top" dir="ltr"><bdi className="font-semibold tabular-nums">{formatSarAmount(locale, bill.total_amount)}</bdi></td>
                  <td className="px-4 py-4 text-center align-top"><StatusBadge variant={statusVariant(bill.status)}>{bill.status === "approved" ? dictionary.statuses.approved : dictionary.statuses.pending}</StatusBadge></td>
                  <td className="px-4 py-4 text-center align-top">
                    <PendingLink href={`/supplier-bills/${bill.id}`} pendingLabel={dictionary.actions.view} aria-label={`${dictionary.actions.view}: ${bill.bill_number}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
                      <Eye size={16} aria-hidden="true" />
                    </PendingLink>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-on-surface-variant">{dictionary.states.empty}</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-surface-variant lg:hidden" data-testid="supplier-bills-mobile-cards">
          {bills.map((bill) => (
            <article key={bill.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <PendingLink href={`/supplier-bills/${bill.id}`} pendingLabel={dictionary.actions.view} className="font-semibold text-primary hover:underline" dir="ltr">
                    <bdi>{bill.bill_number}</bdi>
                  </PendingLink>
                  <div className="mt-1 truncate text-[12px] text-on-surface-variant"><bdi dir="ltr">{bill.invoice_number}</bdi></div>
                </div>
                <StatusBadge variant={statusVariant(bill.status)}>{bill.status === "approved" ? dictionary.statuses.approved : dictionary.statuses.pending}</StatusBadge>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <div><dt className="text-on-surface-variant">{dictionary.columns.supplier}</dt><dd className="mt-0.5 break-words font-medium" dir="auto">{bill.supplier_name}</dd></div>
                <div><dt className="text-on-surface-variant">{dictionary.columns.service}</dt><dd className="mt-0.5 break-words font-medium" dir="auto">{bill.service_number}</dd></div>
                <div><dt className="text-on-surface-variant">{dictionary.columns.invoiceDate}</dt><dd className="mt-0.5"><bdi dir="ltr">{formatUiDate(locale, bill.invoice_date)}</bdi></dd></div>
                <div><dt className="text-on-surface-variant">{dictionary.columns.total}</dt><dd className="mt-0.5 text-end font-semibold tabular-nums"><bdi dir="ltr">{formatSarAmount(locale, bill.total_amount)}</bdi></dd></div>
              </dl>
              <PendingLink href={`/supplier-bills/${bill.id}`} pendingLabel={dictionary.actions.view} className="inline-flex text-[12px] font-semibold text-primary hover:underline">
                {dictionary.actions.view}
              </PendingLink>
            </article>
          ))}
          {bills.length === 0 && <div className="px-4 py-12 text-center text-on-surface-variant">{dictionary.states.empty}</div>}
        </div>
      </section>
      <span className="sr-only" data-supplier-bills-can-approve={canApprove ? "true" : "false"}>{canApprove ? dictionary.actions.approve : ""}</span>
    </div>
  );
}
