"use client";

import { Eye } from "lucide-react";
import PendingLink from "@/components/ui/PendingLink";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText } from "@/components/i18n/UiDateText";
import { formatSarAmount } from "@/lib/i18n/formatting";
import PaginationFooter from "@/components/ui/PaginationFooter";
import { useListNavigation } from "@/components/ui/useListNavigation";
import type { ListPageSize } from "@/lib/pagination";
import type { SupplierPaymentsDictionary } from "@/lib/i18n/dictionaries/supplier-payments";
import { supplierPaymentsHref } from "@/lib/supplier-payments/navigation";
import type { SupplierPaymentListItem, SupplierPaymentListPagination } from "@/lib/supplier-payments/types";

export default function SupplierPaymentsClient({
  payments,
  pagination,
  dictionary,
}: {
  payments: SupplierPaymentListItem[];
  pagination: SupplierPaymentListPagination;
  dictionary: SupplierPaymentsDictionary;
}) {
  const locale = dictionary.locale;
  const isRtl = locale === "ar";
  const stateKey = `${pagination.page}|${pagination.pageSize}`;
  const { isPending, navigate } = useListNavigation(stateKey);
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5 pb-12" data-supplier-payments-workspace="list">
      <PageHeader title={dictionary.title} subtitle={dictionary.subtitle} />
      <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-label={dictionary.title}>
        {pagination.total > 0 && (
          <PaginationFooter
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            paginationMode="bounded"
            isPending={isPending}
            onPageChange={(page) => navigate(supplierPaymentsHref(page, pagination.pageSize), "push")}
            onPageSizeChange={(pageSize: ListPageSize) => navigate(supplierPaymentsHref(1, pageSize), "replace")}
          />
        )}
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[960px] table-fixed border-collapse text-start" data-testid="supplier-payments-desktop-table">
            <colgroup>
              <col className="w-[14%]" /><col className="w-[16%]" /><col className="w-[18%]" /><col className="w-[12%]" /><col className="w-[13%]" /><col className="w-[12%]" /><col className="w-[10%]" /><col className="w-[5%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-surface-variant text-[11px] font-semibold uppercase text-on-surface-variant">
                <th className="px-4 py-3 text-start">{dictionary.columns.payment}</th>
                <th className="px-4 py-3 text-start">{dictionary.columns.bill}</th>
                <th className="px-4 py-3 text-start">{dictionary.columns.supplier}</th>
                <th className="px-4 py-3 text-start">{dictionary.columns.date}</th>
                <th className="px-4 py-3 text-end">{dictionary.columns.amount}</th>
                <th className="px-4 py-3 text-start">{dictionary.columns.method}</th>
                <th className="px-4 py-3 text-center">{dictionary.columns.status}</th>
                <th className="px-4 py-3 text-center">{dictionary.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant text-[13px]">
              {payments.map((payment) => (
                <tr key={payment.id} className="transition-colors hover:bg-surface-container-low/50">
                  <td className="px-4 py-4 align-top text-start"><PendingLink href={`/supplier-payments/${payment.id}`} pendingLabel={dictionary.actions.view} className="font-semibold text-primary hover:underline"><bdi dir="ltr">{payment.payment_number}</bdi></PendingLink></td>
                  <td className="px-4 py-4 align-top text-start"><PendingLink href={`/supplier-bills/${payment.supplier_bill_id}`} pendingLabel={dictionary.columns.bill} className="text-primary hover:underline"><bdi dir="ltr">{payment.bill_number}</bdi></PendingLink></td>
                  <td className="break-words px-4 py-4 align-top text-start"><bdi dir="auto">{payment.supplier_name}</bdi></td>
                  <td className="px-4 py-4 align-top text-start"><UiDateText locale={locale} value={payment.payment_date} /></td>
                  <td className="px-4 py-4 align-top text-end"><bdi dir="ltr" className="font-semibold tabular-nums">{formatSarAmount(locale, payment.amount)}</bdi></td>
                  <td className="px-4 py-4 align-top text-start">{dictionary.methods[payment.method]}</td>
                  <td className="px-4 py-4 align-top text-center"><StatusBadge variant={payment.status === "reversed" ? "inactive" : "active"}>{dictionary.statuses[payment.status]}</StatusBadge></td>
                  <td className="px-4 py-4 align-top text-center"><PendingLink href={`/supplier-payments/${payment.id}`} pendingLabel={dictionary.actions.view} aria-label={`${dictionary.actions.view}: ${payment.payment_number}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><Eye size={16} aria-hidden="true" /></PendingLink></td>
                </tr>
              ))}
              {payments.length === 0 && <tr><td colSpan={8} className="px-4 py-12 text-center text-on-surface-variant">{dictionary.states.empty}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-surface-variant lg:hidden" data-testid="supplier-payments-mobile-cards">
          {payments.map((payment) => (
            <article key={payment.id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><PendingLink href={`/supplier-payments/${payment.id}`} pendingLabel={dictionary.actions.view} className="font-semibold text-primary hover:underline"><bdi dir="ltr">{payment.payment_number}</bdi></PendingLink><div className="mt-1 truncate text-[12px] text-on-surface-variant"><bdi dir="ltr">{payment.bill_number}</bdi></div></div><StatusBadge variant={payment.status === "reversed" ? "inactive" : "active"}>{dictionary.statuses[payment.status]}</StatusBadge></div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]"><div><dt className="text-on-surface-variant">{dictionary.columns.supplier}</dt><dd className="mt-0.5 break-words font-medium"><bdi dir="auto">{payment.supplier_name}</bdi></dd></div><div><dt className="text-on-surface-variant">{dictionary.columns.date}</dt><dd className="mt-0.5"><UiDateText locale={locale} value={payment.payment_date} /></dd></div><div><dt className="text-on-surface-variant">{dictionary.columns.amount}</dt><dd className="mt-0.5 text-end font-semibold"><bdi dir="ltr">{formatSarAmount(locale, payment.amount)}</bdi></dd></div><div><dt className="text-on-surface-variant">{dictionary.columns.method}</dt><dd className="mt-0.5 font-medium">{dictionary.methods[payment.method]}</dd></div></dl>
              <PendingLink href={`/supplier-payments/${payment.id}`} pendingLabel={dictionary.actions.view} className="inline-flex text-[12px] font-semibold text-primary hover:underline">{dictionary.actions.view}</PendingLink>
            </article>
          ))}
          {payments.length === 0 && <div className="px-4 py-12 text-center text-on-surface-variant">{dictionary.states.empty}</div>}
        </div>
      </section>
    </div>
  );
}
