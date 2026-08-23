import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import DataTable from "@/components/ui/DataTable";
import { UiDateText } from "@/components/i18n/UiDateText";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import { getInvoiceStatusLabel, getInvoiceTypeLabel } from "@/lib/i18n/dictionaries/invoices";
import { getPaymentMethodLabel, getPaymentStatusLabel } from "@/lib/i18n/dictionaries/payments";
import { getQuotationStatusLabel } from "@/lib/i18n/dictionaries/quotations";
import { getServiceStatusLabel } from "@/lib/i18n/dictionaries/services";
import { isolateBidiText } from "@/lib/i18n/bidi";
import type { Locale } from "@/lib/i18n/locales";
import type { Customer360Activity, Customer360Data, Customer360SectionStatus } from "@/lib/customer-360/types";
import { customerInvoiceWorkspaceHref } from "@/lib/customer-360/navigation";
import type { Customer360Dictionary } from "@/lib/i18n/dictionaries/customer-360";

const STATUS_VARIANTS = {
  draft: "draft", sent: "sent", approved: "approved", rejected: "rejected", expired: "expired",
  paid: "paid", partial: "pending", overdue: "overdue", cancelled: "cancelled", voided: "cancelled",
  pending: "pending", confirmed: "confirmed", failed: "rejected", refunded: "cancelled",
} as const;

export default function Customer360Workspace({
  data,
  locale,
  dictionary,
  returnTo,
}: {
  data: Customer360Data;
  locale: Locale;
  dictionary: Customer360Dictionary;
  returnTo: string;
}) {
  const invoiceWorkspaceHref = customerInvoiceWorkspaceHref(data.customer.company);

  return (
    <div className="space-y-5">
      <nav aria-label={dictionary.title} className="flex flex-wrap gap-2 rounded-lg border border-surface-variant bg-surface-container-lowest p-2">
        <Anchor href="#customer360-overview">{dictionary.sections.overview}</Anchor>
        <Anchor href="#customer360-services">{dictionary.sections.services}</Anchor>
        <Anchor href="#customer360-billing">{dictionary.sections.billing}</Anchor>
        <Anchor href="#customer360-activity">{dictionary.sections.activity}</Anchor>
      </nav>

      <section id="customer360-overview" className="scroll-mt-20 space-y-3">
        <div><h3 className="font-semibold text-primary">{dictionary.title}</h3><p className="text-[14px] text-on-surface-variant">{dictionary.subtitle}</p></div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <SummaryCard label={dictionary.summary.invoiced} value={formatSarAmount(locale, data.summary.totalInvoiced)} />
          <SummaryCard label={dictionary.summary.collected} value={formatSarAmount(locale, data.summary.totalCollected)} />
          <SummaryCard label={dictionary.summary.outstanding} value={formatSarAmount(locale, data.summary.outstandingBalance)} />
          <SummaryCard label={dictionary.summary.upcoming} value={formatUiNumber(locale, data.upcomingServices.length)} />
        </div>
      </section>

      <section id="customer360-services" className="scroll-mt-20 rounded-xl border border-surface-variant bg-surface-container-lowest p-5">
        <h3 className="mb-3 font-semibold text-primary">{dictionary.sections.services}</h3>
        {data.services.status === "forbidden" ? <EmptyState text={dictionary.states.forbidden} /> : data.services.status === "error" ? <EmptyState text={dictionary.states.error} /> : data.services.items.length === 0 ? <EmptyState text={dictionary.states.noServices} /> : <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{data.services.items.map((service) => <PendingLink key={service.id} href={withReturnTo(`/services/${service.id}`, returnTo)} className="flex min-w-0 items-center justify-between gap-3 rounded-lg border border-outline-variant p-3 hover:bg-surface-container-low"><span className="min-w-0"><span className="block font-semibold text-primary" dir="ltr">{isolateBidiText(service.serviceNumber)}</span><span className="block truncate text-[14px] text-on-surface" dir="auto">{isolateBidiText(service.serviceTitle)}</span></span><span className="shrink-0 text-[12px] text-on-surface-variant" dir="ltr"><UiDateText locale={locale} value={service.eventStartDate ?? service.createdAt} /></span></PendingLink>)}</div>}
      </section>

      <details id="customer360-billing" open className="scroll-mt-20 space-y-4">
        <summary className="cursor-pointer rounded-lg border border-surface-variant bg-surface-container-lowest px-4 py-3 font-semibold text-primary">{dictionary.sections.billing}</summary>
        <div className="space-y-4">
          <RecordSection title={dictionary.sections.quotations} status={data.quotations.status} dictionary={dictionary}>{data.quotations.items.length === 0 ? <EmptyState text={dictionary.states.empty} /> : <DataTable columns={[dictionary.columns.quotation, dictionary.columns.service, dictionary.columns.date, dictionary.columns.status, dictionary.columns.amount]}>{data.quotations.items.map((quotation) => <tr key={quotation.id}><td className="px-4 py-3"><PendingLink href={withReturnTo(`/quotations/${quotation.id}`, returnTo)} className="font-semibold text-primary hover:underline" dir="ltr">{isolateBidiText(quotation.quotationNumber)}</PendingLink></td><td className="px-4 py-3"><span dir="ltr">{isolateBidiText(quotation.serviceNumber ?? "—")}</span>{quotation.serviceTitle ? <span className="ms-2 text-[12px] text-on-surface-variant" dir="auto">{isolateBidiText(quotation.serviceTitle)}</span> : null}</td><td className="px-4 py-3" dir="ltr"><UiDateText locale={locale} value={quotation.date} /></td><td className="px-4 py-3"><StatusBadge variant={STATUS_VARIANTS[quotation.status]}>{getQuotationStatusLabel(locale, quotation.status)}</StatusBadge></td><td className="px-4 py-3 text-end tabular-nums" dir="ltr">{formatSarAmount(locale, quotation.grandTotal)}</td></tr>)}</DataTable>}</RecordSection>
          <RecordSection title={dictionary.sections.invoices} status={data.invoices.status} dictionary={dictionary} action={data.invoices.status === "ready" && invoiceWorkspaceHref ? <PendingLink href={invoiceWorkspaceHref} className="inline-flex shrink-0 items-center gap-1 text-[13px] font-semibold text-primary hover:underline">{dictionary.links.viewAll}<ArrowUpRight size={14} aria-hidden="true" /></PendingLink> : undefined}>{data.invoices.items.length === 0 ? <EmptyState text={dictionary.states.empty} /> : <DataTable columns={[dictionary.columns.invoice, dictionary.columns.service, dictionary.columns.date, dictionary.columns.status, dictionary.columns.amount]}>{data.invoices.items.map((invoice) => <tr key={invoice.id}><td className="px-4 py-3"><PendingLink href={withReturnTo(`/invoices/${invoice.id}`, returnTo)} className="font-semibold text-primary hover:underline" dir="ltr">{isolateBidiText(invoice.invoiceNumber)}</PendingLink><span className="ms-2 text-[12px] text-on-surface-variant">{getInvoiceTypeLabel(locale, invoice.invoiceType)}</span></td><td className="px-4 py-3"><span dir="ltr">{isolateBidiText(invoice.serviceNumber ?? "—")}</span>{invoice.serviceTitle ? <span className="ms-2 text-[12px] text-on-surface-variant" dir="auto">{isolateBidiText(invoice.serviceTitle)}</span> : null}</td><td className="px-4 py-3" dir="ltr"><UiDateText locale={locale} value={invoice.date} /></td><td className="px-4 py-3"><StatusBadge variant={STATUS_VARIANTS[invoice.status]}>{getInvoiceStatusLabel(locale, invoice.status)}</StatusBadge></td><td className="px-4 py-3 text-end tabular-nums" dir="ltr">{formatSarAmount(locale, invoice.grandTotal)}</td></tr>)}</DataTable>}</RecordSection>
          <RecordSection title={dictionary.sections.payments} status={data.payments.status} dictionary={dictionary}>{data.payments.items.length === 0 ? <EmptyState text={dictionary.states.empty} /> : <DataTable columns={[dictionary.columns.payment, dictionary.columns.date, dictionary.columns.reference, dictionary.columns.status, dictionary.columns.amount]}>{data.payments.items.map((payment) => <tr key={payment.id}><td className="px-4 py-3 font-semibold" dir="ltr">{isolateBidiText(payment.paymentNumber)}</td><td className="px-4 py-3" dir="ltr"><UiDateText locale={locale} value={payment.date} /></td><td className="px-4 py-3" dir="auto">{payment.reference ? isolateBidiText(payment.reference) : getPaymentMethodLabel(locale, payment.method)}</td><td className="px-4 py-3"><StatusBadge variant={STATUS_VARIANTS[payment.status]}>{getPaymentStatusLabel(locale, payment.status)}</StatusBadge></td><td className="px-4 py-3 text-end tabular-nums" dir="ltr">{formatSarAmount(locale, payment.amount)}</td></tr>)}</DataTable>}</RecordSection>
        </div>
      </details>

      <details id="customer360-activity" open className="scroll-mt-20 space-y-4">
        <summary className="cursor-pointer rounded-lg border border-surface-variant bg-surface-container-lowest px-4 py-3 font-semibold text-primary">{dictionary.sections.activity}</summary>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2"><ActivitySection title={dictionary.sections.operationalActivity} activities={data.recentOperationalActivity} locale={locale} dictionary={dictionary} returnTo={returnTo} /><ActivitySection title={dictionary.sections.financialActivity} activities={data.recentFinancialActivity} locale={locale} dictionary={dictionary} returnTo={returnTo} /></div>
      </details>
    </div>
  );
}

function Anchor({ href, children }: { href: string; children: ReactNode }) { return <a href={href} className="rounded-md px-3 py-2 text-[13px] font-semibold text-primary hover:bg-surface-container-low">{children}</a>; }
function SummaryCard({ label, value }: { label: string; value: string }) { return <div className="rounded-lg border border-outline-variant bg-surface-container-lowest p-4"><span className="block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">{label}</span><span className="mt-2 block text-lg font-semibold text-primary tabular-nums" dir="ltr">{value}</span></div>; }
function RecordSection({ title, status, dictionary, action, children }: { title: string; status: Customer360SectionStatus; dictionary: Customer360Dictionary; action?: ReactNode; children: ReactNode }) { return <section className="overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest"><div className="flex items-center justify-between gap-3 border-b border-surface-variant bg-surface-bright px-5 py-4"><h3 className="font-semibold text-primary">{title}</h3>{action}</div><div className="p-0">{status === "forbidden" ? <EmptyState text={dictionary.states.forbidden} /> : status === "error" ? <EmptyState text={dictionary.states.error} /> : children}</div></section>; }
function EmptyState({ text }: { text: string }) { return <p className="px-5 py-8 text-center text-[14px] text-on-surface-variant">{text}</p>; }

function ActivitySection({ title, activities, locale, dictionary, returnTo }: { title: string; activities: Customer360Activity[]; locale: Locale; dictionary: Customer360Dictionary; returnTo: string }) {
  return <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5"><h3 className="mb-3 font-semibold text-primary">{title}</h3>{activities.length === 0 ? <EmptyState text={dictionary.states.noActivity} /> : <ol className="space-y-3">{activities.map((activity) => <li key={activity.id} className="flex items-start justify-between gap-3 border-b border-surface-variant pb-3 last:border-b-0 last:pb-0"><div className="min-w-0"><p className="text-[14px] font-semibold text-on-surface"><span>{activityLabel(activity, dictionary)}</span>{" "}<span dir="ltr">{isolateBidiText(activity.identifier)}</span></p><p className="truncate text-[13px] text-on-surface-variant" dir="auto">{isolateBidiText(activity.subject)}</p><p className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-on-surface-variant"><UiDateText locale={locale} value={activity.date} />{activity.status ? <span dir="auto">· {activityStatus(activity, locale)}</span> : null}{activity.amount !== null ? <span dir="ltr">· {dictionary.activity.amount}: {formatSarAmount(locale, activity.amount)}</span> : null}</p></div><PendingLink href={withReturnTo(activity.href, returnTo)} className="inline-flex shrink-0 items-center gap-1 text-[12px] font-semibold text-primary hover:underline">{dictionary.links.view}<ArrowUpRight size={14} aria-hidden="true" /></PendingLink></li>)}</ol>}</section>;
}

function withReturnTo(path: string, returnTo: string) {
  return `${path}${path.includes("?") ? "&" : "?"}returnTo=${encodeURIComponent(returnTo)}`;
}

function activityLabel(activity: Customer360Activity, dictionary: Customer360Dictionary) { return dictionary.activity[activity.eventType]; }
function activityStatus(activity: Customer360Activity, locale: Locale) { if (activity.eventType === "service") return getServiceStatusLabel(locale, activity.status as Parameters<typeof getServiceStatusLabel>[1]); if (activity.eventType === "invoice") return getInvoiceStatusLabel(locale, activity.status as Parameters<typeof getInvoiceStatusLabel>[1]); return getPaymentStatusLabel(locale, activity.status as Parameters<typeof getPaymentStatusLabel>[1]); }
