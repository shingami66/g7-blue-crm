"use client";

import { Eye } from "lucide-react";
import PendingLink from "@/components/ui/PendingLink";
import PageHeader from "@/components/ui/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText } from "@/components/i18n/UiDateText";
import { formatSupplierAdvanceAmount } from "@/lib/supplier-advances/formatting";
import type { SupplierAdvancesDictionary } from "@/lib/i18n/dictionaries/supplier-advances";
import type { SupplierAdvanceListItem } from "@/lib/supplier-advances/types";

export default function SupplierAdvancesClient({
  advances,
  canAuthorize,
  dictionary,
}: {
  advances: SupplierAdvanceListItem[];
  canAuthorize: boolean;
  dictionary: SupplierAdvancesDictionary;
}) {
  const locale = dictionary.locale;
  const isRtl = locale === "ar";
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="mx-auto flex w-full max-w-7xl min-w-0 flex-col gap-5 pb-12" data-supplier-advances-workspace="list">
      <PageHeader title={dictionary.title} subtitle={dictionary.subtitle}>
        {canAuthorize && <PendingLink href="/supplier-advances/new" pendingLabel={dictionary.authorizeAdvance} className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 py-2 text-[13px] font-semibold text-on-primary hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.authorizeAdvance}</PendingLink>}
      </PageHeader>
      <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-label={dictionary.title}>
        <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-0 table-fixed border-collapse text-start" data-testid="supplier-advances-desktop-table">
            <colgroup>
              <col className="w-[15%]" /><col className="w-[19%]" /><col className="w-[18%]" /><col className="w-[13%]" /><col className="w-[15%]" /><col className="w-[10%]" /><col className="w-[10%]" />
            </colgroup>
            <thead>
              <tr className="border-b border-surface-variant text-[11px] font-semibold uppercase text-on-surface-variant">
                <th className="px-3 py-3 text-start">{dictionary.columns.advance}</th>
                <th className="px-3 py-3 text-start">{dictionary.columns.supplier}</th>
                <th className="px-3 py-3 text-start">{dictionary.columns.service}</th>
                <th className="px-3 py-3 text-start">{dictionary.columns.date}</th>
                <th className="px-3 py-3 text-end">{dictionary.columns.amount}</th>
                <th className="px-3 py-3 text-center">{dictionary.columns.status}</th>
                <th className="px-3 py-3 text-center">{dictionary.columns.actions}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-variant text-[13px]">
              {advances.map((advance) => (
                <tr key={advance.supplier_advance_id} className="transition-colors hover:bg-surface-container-low/50">
                  <td className="px-3 py-3 align-middle text-start"><PendingLink href={`/supplier-advances/${advance.supplier_advance_id}`} pendingLabel={dictionary.actions.view} className="font-semibold text-primary hover:underline"><bdi dir="ltr">{advance.advance_number}</bdi></PendingLink></td>
                  <td className="break-words px-3 py-3 align-middle text-start"><bdi dir="auto">{advance.supplier_name}</bdi></td>
                  <td className="px-3 py-3 align-middle text-start"><span className="flex min-w-0 flex-col gap-0.5"><bdi dir="ltr" className="text-[12px] font-medium">{advance.service_number}</bdi><bdi dir="auto" className="break-words text-[12px] text-on-surface-variant">{advance.service_title}</bdi></span></td>
                  <td className="px-3 py-3 align-middle text-start"><UiDateText locale={locale} value={advance.authorized_at} /></td>
                  <td className="px-3 py-3 align-middle text-end"><bdi dir="ltr" className="font-semibold tabular-nums">{formatSupplierAdvanceAmount(advance.currency, advance.authorized_amount)}</bdi></td>
                  <td className="px-3 py-3 align-middle text-center"><StatusBadge variant={advance.status === "paid" ? "active" : "pending"}>{dictionary.statuses[advance.status]}</StatusBadge></td>
                  <td className="px-3 py-3 align-middle text-center"><PendingLink href={`/supplier-advances/${advance.supplier_advance_id}`} pendingLabel={dictionary.actions.view} aria-label={`${dictionary.actions.view}: ${advance.advance_number}`} className="inline-flex h-8 w-8 items-center justify-center rounded-md text-on-surface-variant hover:bg-surface-container-low hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"><Eye size={16} aria-hidden="true" /></PendingLink></td>
                </tr>
              ))}
              {advances.length === 0 && <tr><td colSpan={7} className="px-4 py-12 text-center text-on-surface-variant">{dictionary.states.empty}</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="divide-y divide-surface-variant lg:hidden" data-testid="supplier-advances-mobile-cards">
          {advances.map((advance) => (
            <article key={advance.supplier_advance_id} className="space-y-3 p-4">
              <div className="flex items-start justify-between gap-3"><div className="min-w-0"><PendingLink href={`/supplier-advances/${advance.supplier_advance_id}`} pendingLabel={dictionary.actions.view} className="font-semibold text-primary hover:underline"><bdi dir="ltr">{advance.advance_number}</bdi></PendingLink><div className="mt-1 truncate text-[12px] text-on-surface-variant"><bdi dir="auto">{advance.supplier_name}</bdi></div></div><StatusBadge variant={advance.status === "paid" ? "active" : "pending"}>{dictionary.statuses[advance.status]}</StatusBadge></div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px]"><div><dt className="text-on-surface-variant">{dictionary.columns.service}</dt><dd className="mt-0.5 flex flex-col font-medium"><bdi dir="ltr">{advance.service_number}</bdi><bdi dir="auto">{advance.service_title}</bdi></dd></div><div><dt className="text-on-surface-variant">{dictionary.columns.date}</dt><dd className="mt-0.5"><UiDateText locale={locale} value={advance.authorized_at} /></dd></div><div className="col-span-2"><dt className="text-on-surface-variant">{dictionary.columns.amount}</dt><dd className="mt-0.5 text-end font-semibold"><bdi dir="ltr">{formatSupplierAdvanceAmount(advance.currency, advance.authorized_amount)}</bdi></dd></div></dl>
              <PendingLink href={`/supplier-advances/${advance.supplier_advance_id}`} pendingLabel={dictionary.actions.view} className="inline-flex text-[12px] font-semibold text-primary hover:underline">{dictionary.actions.view}</PendingLink>
            </article>
          ))}
          {advances.length === 0 && <div className="px-4 py-12 text-center text-on-surface-variant">{dictionary.states.empty}</div>}
        </div>
      </section>
    </div>
  );
}
