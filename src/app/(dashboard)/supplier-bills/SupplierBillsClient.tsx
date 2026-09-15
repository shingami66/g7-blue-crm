"use client";

import { Eye, Plus } from "lucide-react";
import PendingLink from "@/components/ui/PendingLink";
import PageHeader from "@/components/ui/PageHeader";
import Button from "@/components/ui/Button";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText } from "@/components/i18n/UiDateText";
import { formatSarAmount } from "@/lib/i18n/formatting";
import type { SupplierBillsDictionary } from "@/lib/i18n/dictionaries/supplier-bills";
import type { SupplierBillListItem, SupplierBillListPagination } from "@/lib/supplier-bills/types";
import PaginationFooter from "@/components/ui/PaginationFooter";
import { useListNavigation } from "@/components/ui/useListNavigation";
import type { ListPageSize } from "@/lib/pagination";

function supplierBillsHref(page: number, pageSize: ListPageSize) {
  const params = new URLSearchParams();
  if (page > 1) params.set("page", String(page));
  if (pageSize !== 10) params.set("pageSize", String(pageSize));
  const query = params.toString();
  return query ? `/supplier-bills?${query}` : "/supplier-bills";
}

function statusVariant(status: SupplierBillListItem["status"]): "pending" | "active" {
  return status === "approved" ? "active" : "pending";
}

export default function SupplierBillsClient({
  bills,
  pagination,
  canRecord,
  canApprove,
  dictionary,
}: {
  bills: SupplierBillListItem[];
  pagination: SupplierBillListPagination;
  canRecord: boolean;
  canApprove: boolean;
  dictionary: SupplierBillsDictionary;
}) {
  const locale = dictionary.locale;
  const stateKey = `${pagination.page}|${pagination.pageSize}`;
  const { isPending, navigate } = useListNavigation(stateKey);
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
        {pagination.total > 0 && (
          <PaginationFooter
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            pageSize={pagination.pageSize}
            paginationMode="bounded"
            isPending={isPending}
            onPageChange={(page) => navigate(supplierBillsHref(page, pagination.pageSize), "push")}
            onPageSizeChange={(pageSize: ListPageSize) => navigate(supplierBillsHref(1, pageSize), "replace")}
          />
        )}
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
                  <td className="px-4 py-4 align-top text-start">
                    <PendingLink href={`/supplier-bills/${bill.id}`} pendingLabel={dictionary.actions.view} className="font-semibold text-primary hover:underline">
                      <bdi dir="ltr">{bill.bill_number}</bdi>
                    </PendingLink>
                    <div className="mt-1 text-[12px] text-on-surface-variant"><bdi dir="ltr">{bill.invoice_number}</bdi></div>
                  </td>
                  <td className="break-words px-4 py-4 align-top text-start text-on-surface"><bdi dir="auto">{bill.supplier_name}</bdi></td>
                  <td className="break-words px-4 py-4 align-top text-start">
                    <div className="font-medium text-on-surface"><bdi dir="ltr">{bill.service_number}</bdi></div>
                    <div className="mt-0.5 text-[12px] text-on-surface-variant"><bdi dir="auto">{bill.event_name || bill.service_title}</bdi></div>
                  </td>
                  <td className="px-4 py-4 align-top text-start"><UiDateText locale={locale} value={bill.invoice_date} /></td>
                  <td className="px-4 py-4 text-end align-top"><bdi dir="ltr" className="font-semibold tabular-nums">{formatSarAmount(locale, bill.total_amount)}</bdi></td>
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
                  <PendingLink href={`/supplier-bills/${bill.id}`} pendingLabel={dictionary.actions.view} className="font-semibold text-primary hover:underline">
                    <bdi dir="ltr">{bill.bill_number}</bdi>
                  </PendingLink>
                  <div className="mt-1 truncate text-[12px] text-on-surface-variant"><bdi dir="ltr">{bill.invoice_number}</bdi></div>
                </div>
                <StatusBadge variant={statusVariant(bill.status)}>{bill.status === "approved" ? dictionary.statuses.approved : dictionary.statuses.pending}</StatusBadge>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]">
                <div><dt className="text-on-surface-variant">{dictionary.columns.supplier}</dt><dd className="mt-0.5 break-words font-medium"><bdi dir="auto">{bill.supplier_name}</bdi></dd></div>
                <div><dt className="text-on-surface-variant">{dictionary.columns.service}</dt><dd className="mt-0.5 break-words font-medium"><bdi dir="ltr">{bill.service_number}</bdi></dd></div>
                <div><dt className="text-on-surface-variant">{dictionary.columns.invoiceDate}</dt><dd className="mt-0.5"><UiDateText locale={locale} value={bill.invoice_date} /></dd></div>
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
