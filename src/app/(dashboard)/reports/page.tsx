import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import PendingLink from "@/components/ui/PendingLink";
import StatusBadge from "@/components/ui/StatusBadge";
import { UiDateText } from "@/components/i18n/UiDateText";
import SharedAuthenticatedStatePanel from "@/components/ui/SharedAuthenticatedStatePanel";
import { UnauthorizedError, ForbiddenError } from "@/lib/auth/errors";
import { requirePermission } from "@/lib/auth/permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { formatSarAmount, formatUiDateRange, formatUiNumber } from "@/lib/i18n/formatting";
import { getReportsDictionary } from "@/lib/i18n/dictionaries/reports";
import { getServicesDictionary, getServiceStatusLabel } from "@/lib/i18n/dictionaries/services";
import { getSharedUiStates } from "@/lib/i18n/dictionaries/common";
import { getCommonDictionary } from "@/lib/i18n/dictionaries/common";
import { getReportsCenterData } from "@/lib/reports/queries";
import { getCurrentRiyadhDate, getQuickReportRange, resolveReportFilters } from "@/lib/reports/filters";
import { cleanBusinessYearParam, getCurrentBusinessYear } from "@/lib/business-year";
import { getBusinessYearPreference } from "@/lib/business-year-preference";
import type { ReportFilters } from "@/lib/reports/types";

export const dynamic = "force-dynamic";

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ year?: string; from?: string; to?: string; asOf?: string }> }) {
  const [locale, preferredYear, params] = await Promise.all([
    getCurrentSessionEffectiveLocale(),
    getBusinessYearPreference(),
    searchParams,
  ]);
  const dictionary = getReportsDictionary(locale);
  const sharedStates = getSharedUiStates(locale);
  const common = getCommonDictionary(locale);
  const serviceDictionary = getServicesDictionary(locale);
  const parsed = resolveReportFilters({
    ...params,
    year: params.year ?? String(preferredYear),
  });

  try {
    await requirePermission("dashboard:read");
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    if (error instanceof ForbiddenError) return <SharedAuthenticatedStatePanel title={sharedStates.accessDenied.title} message={dictionary.states.forbidden} />;
    return <SharedAuthenticatedStatePanel title={sharedStates.genericError.title} message={dictionary.states.error} role="alert" />;
  }

  const period = parsed.filters.from || parsed.filters.to
    ? formatUiDateRange(locale, parsed.filters.from, parsed.filters.to)
    : `${common.businessYear.label}: ${parsed.filters.year}`;
  const filterForm = <ReportFiltersForm filters={parsed.filters} dictionary={dictionary} />;
  if (parsed.error) {
    return <div className="space-y-6 pb-12"><ReportHeader dictionary={dictionary} period={period} /><div role="alert" className="rounded-lg border border-error/40 bg-error/10 px-4 py-3 text-[14px] text-error">{dictionary.filters.invalidRange}</div>{filterForm}</div>;
  }

  const report = await getReportsCenterData(parsed.filters);
  const partial =
    [report.salesBilling, report.accountsReceivable, report.serviceOperations, report.customerOverview, report.supplierOperations].some(
      (section) => section.status !== "ready",
    ) ||
    report.salesBilling.data.quotationCount === null ||
    report.salesBilling.data.invoicedValue === null ||
    report.customerOverview.data.activeCustomers === null ||
    report.customerOverview.data.outstandingCustomersCount === null ||
    report.supplierOperations.data.internalEstimatedCost === null;
  return <div className="space-y-6 pb-12"><ReportHeader dictionary={dictionary} period={period} />{filterForm}{partial && <div className="rounded-lg border border-tertiary-fixed bg-tertiary-fixed/40 px-4 py-3 text-[14px] text-on-surface" role="status">{dictionary.states.partial}</div>}<BillingReport report={report.salesBilling} dictionary={dictionary} locale={locale} /><ReceivablesReport report={report.accountsReceivable} dictionary={dictionary} locale={locale} /><OperationsReport report={report.serviceOperations} dictionary={dictionary} serviceDictionary={serviceDictionary} locale={locale} /><CustomerReport report={report.customerOverview} dictionary={dictionary} locale={locale} /><SupplierReport report={report.supplierOperations} dictionary={dictionary} locale={locale} /></div>;
}

function ReportHeader({ dictionary, period }: { dictionary: ReturnType<typeof getReportsDictionary>; period: string }) {
  return <div><h1 className="text-[28px] font-semibold leading-[36px] text-primary">{dictionary.title}</h1><p className="mt-2 text-[14px] text-on-surface-variant">{dictionary.subtitle}</p><p className="mt-3 inline-flex flex-wrap items-center gap-2 rounded-lg bg-surface-container-low px-3 py-2 text-[13px] text-on-surface-variant"><span className="font-semibold text-primary">{dictionary.filters.period}:</span><span dir="ltr">{period}</span></p></div>;
}

function ReportFiltersForm({ filters, dictionary }: { filters: ReportFilters; dictionary: ReturnType<typeof getReportsDictionary> }) {
  const last30 = getQuickReportRange(30);
  const last90 = getQuickReportRange(90);
  const asOf = filters.asOf ?? getCurrentRiyadhDate();
  const year = cleanBusinessYearParam(filters.year ?? getCurrentBusinessYear());
  const yearQuery = year ? `&year=${encodeURIComponent(year)}` : "";
  const query = (range: { from?: string; to?: string }) => `/reports?from=${range.from}&to=${range.to}&asOf=${encodeURIComponent(asOf)}${yearQuery}`;
  const clearHref = year ? `/reports?year=${encodeURIComponent(year)}` : "/reports";
  return (
    <form className="flex flex-wrap items-end gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4" method="get">
      {year && <input type="hidden" name="year" value={year} />}
      <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-[12px] font-semibold text-on-surface-variant">
        <span>{dictionary.filters.from}</span>
        <input name="from" type="date" defaultValue={filters.from ?? ""} className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none" />
      </label>
      <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-[12px] font-semibold text-on-surface-variant">
        <span>{dictionary.filters.to}</span>
        <input name="to" type="date" defaultValue={filters.to ?? ""} className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none" />
      </label>
      <label className="flex min-w-[150px] flex-1 flex-col gap-1 text-[12px] font-semibold text-on-surface-variant">
        <span>{dictionary.filters.asOf}</span>
        <input name="asOf" type="date" defaultValue={asOf} className="h-9 rounded-lg border border-outline-variant bg-surface px-3 text-[13px] text-on-surface focus:border-primary focus:outline-none" />
      </label>
      <button type="submit" className="inline-flex min-h-9 items-center justify-center rounded-lg bg-primary px-3.5 py-1.5 text-[13px] font-semibold text-on-primary hover:bg-primary-container transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        {dictionary.filters.apply}
      </button>
      <PendingLink href={query(last30)} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-outline-variant bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-primary hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        {dictionary.filters.last30}
      </PendingLink>
      <PendingLink href={query(last90)} className="inline-flex min-h-9 items-center justify-center rounded-lg border border-outline-variant bg-surface px-3.5 py-1.5 text-[13px] font-semibold text-primary hover:bg-surface-container-low transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        {dictionary.filters.last90}
      </PendingLink>
      <PendingLink href={clearHref} className="inline-flex min-h-9 items-center justify-center px-2.5 py-1.5 text-[13px] font-semibold text-on-surface-variant hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">
        {dictionary.filters.clear}
      </PendingLink>
    </form>
  );
}

function BillingReport({ report, dictionary, locale }: { report: Awaited<ReturnType<typeof getReportsCenterData>>["salesBilling"]; dictionary: ReturnType<typeof getReportsDictionary>; locale: "en" | "ar" }) {
  if (report.status !== "ready") return <ReportSection title={dictionary.sections.salesBilling} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error} />;
  const metrics: Array<[string, string]> = [
    [dictionary.metrics.quotationCount, report.data.quotationCount === null ? "—" : formatUiNumber(locale, report.data.quotationCount)],
    [dictionary.metrics.quotationValue, report.data.quotationValue === null ? "—" : formatSarAmount(locale, report.data.quotationValue)],
    [dictionary.metrics.approvedValue, report.data.approvedQuotationValue === null ? "—" : formatSarAmount(locale, report.data.approvedQuotationValue)],
    [dictionary.metrics.billed, report.data.invoicedValue === null ? "—" : formatSarAmount(locale, report.data.invoicedValue)],
    [dictionary.metrics.deposit, report.data.depositInvoiceCount === null ? "—" : formatUiNumber(locale, report.data.depositInvoiceCount)],
    [dictionary.metrics.final, report.data.finalInvoiceCount === null ? "—" : formatUiNumber(locale, report.data.finalInvoiceCount)],
  ];
  return <ReportSection title={dictionary.sections.salesBilling} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error}><div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-4">{metrics.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div></ReportSection>;
}

function ReceivablesReport({ report, dictionary, locale }: { report: Awaited<ReturnType<typeof getReportsCenterData>>["accountsReceivable"]; dictionary: ReturnType<typeof getReportsDictionary>; locale: "en" | "ar" }) {
  if (report.status !== "ready") return <ReportSection title={dictionary.sections.accountsReceivable} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error} />;
  const summaryMetrics: Array<[string, string]> = [
    [dictionary.metrics.outstandingReceivable, formatSarAmount(locale, report.data.totalOutstanding)],
    [dictionary.metrics.collectedCash, formatSarAmount(locale, report.data.collectedCashAmount)],
    [dictionary.metrics.overdue, formatSarAmount(locale, report.data.totalOverdue)],
  ];
  const ageingMetrics: Array<[string, string]> = [
    [dictionary.metrics.notDue, formatSarAmount(locale, report.data.notDueAmount)],
    [dictionary.metrics.ageing1To30, formatSarAmount(locale, report.data.ageing1To30Amount)],
    [dictionary.metrics.ageing31To60, formatSarAmount(locale, report.data.ageing31To60Amount)],
    [dictionary.metrics.ageing61To90, formatSarAmount(locale, report.data.ageing61To90Amount)],
    [dictionary.metrics.ageing91Plus, formatSarAmount(locale, report.data.ageing91PlusAmount)],
  ];
  return <ReportSection title={dictionary.sections.accountsReceivable} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error}>
    <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-on-surface-variant" dir="auto"><span><span className="font-semibold text-primary">{dictionary.filters.asOf}:</span> <UiDateText locale={locale} value={report.data.asOfDate} /></span><span>{formatUiNumber(locale, report.data.detailTotalCount)} {dictionary.tables.invoice.toLocaleLowerCase(locale === "ar" ? "ar-SA" : "en-SA")}</span></div>
    <div className="space-y-5">
      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-primary">{dictionary.sections.receivableSummary}</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{summaryMetrics.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div>
      </div>
      <div>
        <h3 className="mb-2 text-[13px] font-semibold text-primary">{dictionary.sections.ageing}</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{ageingMetrics.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div>
      </div>
    </div>
    {report.data.rows.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-outline-variant px-3 py-5 text-center text-[13px] text-on-surface-variant">{dictionary.states.empty}</p> : <>
      <div className="mt-5 hidden overflow-x-auto rounded-lg border border-outline-variant md:block">
        <table className="w-full min-w-[860px] text-[13px]"><caption className="sr-only">{dictionary.sections.accountsReceivable}</caption>
          <thead><tr className="border-b border-surface-variant text-start text-[11px] uppercase text-on-surface-variant">
            <th className="px-3 py-2 text-start">{dictionary.tables.invoice}</th><th className="px-3 py-2 text-start">{dictionary.tables.customer}</th><th className="px-3 py-2 text-start">{dictionary.tables.dueDate}</th><th className="px-3 py-2 text-end">{dictionary.metrics.outstandingReceivable}</th><th className="px-3 py-2 text-end">{dictionary.tables.daysPastDue}</th><th className="px-3 py-2 text-start">{dictionary.tables.ageing}</th><th className="px-3 py-2 text-start">{dictionary.tables.reconciliationDetails}</th>
          </tr></thead>
          <tbody>{report.data.rows.map((row) => <tr key={row.invoiceId} className="border-b border-surface-variant align-top last:border-b-0">
            <td className="px-3 py-3"><PendingLink href={`/invoices/${row.invoiceId}`} className="text-primary hover:underline"><bdi dir="ltr">{row.invoiceNumber}</bdi></PendingLink></td>
            <td className="px-3 py-3">{row.customerName ? <PendingLink href={`/customers/${row.customerId}`} className="text-primary hover:underline"><span dir="auto">{row.customerName}</span>{row.customerNumber ? <bdi className="ms-2 text-[11px] text-on-surface-variant" dir="ltr">{row.customerNumber}</bdi> : null}</PendingLink> : <span className="text-on-surface-variant">{dictionary.tables.identityUnavailable}</span>}</td>
            <td className="px-3 py-3 whitespace-nowrap"><UiDateText locale={locale} value={row.dueDate} /></td>
            <td className="px-3 py-3 text-end font-semibold tabular-nums" dir="ltr">{formatSarAmount(locale, row.outstandingAmount)}</td><td className="px-3 py-3 text-end tabular-nums" dir="ltr">{formatUiNumber(locale, row.daysPastDue)}</td><td className="px-3 py-3">{getAgeingLabel(dictionary, row.ageingBucket)}</td>
            <td className="px-3 py-3"><ReceivableDetails row={row} dictionary={dictionary} locale={locale} /></td>
          </tr>)}</tbody>
        </table>
      </div>
      <div className="mt-5 space-y-3 md:hidden">
        {report.data.rows.map((row) => <article key={row.invoiceId} className="rounded-lg border border-outline-variant bg-surface p-3">
          <div className="flex flex-wrap items-start justify-between gap-2"><PendingLink href={`/invoices/${row.invoiceId}`} className="text-[13px] font-semibold text-primary hover:underline"><bdi dir="ltr">{row.invoiceNumber}</bdi></PendingLink><span className="font-semibold tabular-nums" dir="ltr">{formatSarAmount(locale, row.outstandingAmount)}</span></div>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px]"><div><dt className="text-on-surface-variant">{dictionary.tables.customer}</dt><dd className="mt-1 break-words text-on-surface">{row.customerName ? <><span dir="auto">{row.customerName}</span>{row.customerNumber ? <bdi className="ms-1 text-on-surface-variant" dir="ltr">{row.customerNumber}</bdi> : null}</> : dictionary.tables.identityUnavailable}</dd></div><div><dt className="text-on-surface-variant">{dictionary.tables.dueDate}</dt><dd className="mt-1 text-on-surface"><UiDateText locale={locale} value={row.dueDate} /></dd></div><div><dt className="text-on-surface-variant">{dictionary.tables.daysPastDue}</dt><dd className="mt-1 tabular-nums" dir="ltr">{formatUiNumber(locale, row.daysPastDue)}</dd></div><div><dt className="text-on-surface-variant">{dictionary.tables.ageing}</dt><dd className="mt-1 text-on-surface">{getAgeingLabel(dictionary, row.ageingBucket)}</dd></div></dl>
          <ReceivableDetails row={row} dictionary={dictionary} locale={locale} />
        </article>)}
      </div>
    </>}
  </ReportSection>;
}

function ReceivableDetails({ row, dictionary, locale }: { row: Awaited<ReturnType<typeof getReportsCenterData>>["accountsReceivable"]["data"]["rows"][number]; dictionary: ReturnType<typeof getReportsDictionary>; locale: "en" | "ar" }) {
  return <details className="rounded-lg border border-outline-variant/70 bg-surface-container-low">
    <summary className="cursor-pointer list-none px-3 py-2 text-[12px] font-semibold text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">{dictionary.tables.viewDetails}</summary>
    <div className="border-t border-outline-variant/70 p-3"><dl className="grid grid-cols-1 gap-3 text-[12px] sm:grid-cols-2">
      <div><dt className="text-on-surface-variant">{dictionary.tables.service}</dt><dd className="mt-1 break-words text-on-surface">{row.serviceNumber && row.serviceId ? <PendingLink href={`/services/${row.serviceId}`} className="text-primary hover:underline"><bdi dir="ltr">{row.serviceNumber}</bdi>{row.serviceTitle ? <span className="ms-1" dir="auto">{row.serviceTitle}</span> : null}</PendingLink> : "—"}</dd></div>
      <div><dt className="text-on-surface-variant">{dictionary.tables.issueDate}</dt><dd className="mt-1 text-on-surface"><UiDateText locale={locale} value={row.issueDate} /></dd></div>
      <div><dt className="text-on-surface-variant">{dictionary.tables.gross}</dt><dd className="mt-1 tabular-nums" dir="ltr">{formatSarAmount(locale, row.grossAmount)}</dd></div>
      <div><dt className="text-on-surface-variant">{dictionary.tables.creditAdjustments}</dt><dd className="mt-1 tabular-nums" dir="ltr">{formatSarAmount(locale, row.creditAdjustmentAmount)}</dd></div>
      <div><dt className="text-on-surface-variant">{dictionary.tables.netReceivable}</dt><dd className="mt-1 tabular-nums" dir="ltr">{formatSarAmount(locale, row.netReceivableAmount)}</dd></div>
      <div><dt className="text-on-surface-variant">{dictionary.tables.settled}</dt><dd className="mt-1 tabular-nums" dir="ltr">{formatSarAmount(locale, row.settledAmount)}</dd></div>
      <div><dt className="text-on-surface-variant">{dictionary.metrics.outstandingReceivable}</dt><dd className="mt-1 font-semibold tabular-nums" dir="ltr">{formatSarAmount(locale, row.outstandingAmount)}</dd></div>
    </dl></div>
  </details>;
}

function getAgeingLabel(dictionary: ReturnType<typeof getReportsDictionary>, bucket: "not_due" | "1_30" | "31_60" | "61_90" | "91_plus") {
  if (bucket === "not_due") return dictionary.metrics.notDue;
  if (bucket === "1_30") return dictionary.metrics.ageing1To30;
  if (bucket === "31_60") return dictionary.metrics.ageing31To60;
  if (bucket === "61_90") return dictionary.metrics.ageing61To90;
  return dictionary.metrics.ageing91Plus;
}

function OperationsReport({ report, dictionary, serviceDictionary, locale }: { report: Awaited<ReturnType<typeof getReportsCenterData>>["serviceOperations"]; dictionary: ReturnType<typeof getReportsDictionary>; serviceDictionary: ReturnType<typeof getServicesDictionary>; locale: "en" | "ar" }) {
  if (report.status !== "ready") return <ReportSection title={dictionary.sections.operations} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error} />;
  return <ReportSection title={dictionary.sections.operations} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error}><div className="overflow-x-auto"><table className="w-full min-w-[560px] text-[14px]"><thead><tr className="border-b border-surface-variant text-start text-[12px] uppercase text-on-surface-variant"><th className="px-3 py-2 text-start">{dictionary.tables.status}</th><th className="px-3 py-2 text-start">{dictionary.tables.count}</th></tr></thead><tbody>{(Object.keys(report.data.statusCounts) as Array<keyof typeof report.data.statusCounts>).map((status) => <tr key={status} className="border-b border-surface-variant"><td className="px-3 py-2"><StatusBadge variant={status === "In Progress" ? "in-progress" : status === "Deposit Paid" ? "deposit-paid" : status === "Cancelled" ? "cancelled" : status === "Completed" ? "completed" : "planning"}>{getServiceStatusLabel(locale, status)}</StatusBadge></td><td className="px-3 py-2 tabular-nums" dir="ltr">{formatUiNumber(locale, report.data.statusCounts[status])}</td></tr>)}</tbody></table></div><div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">{[[dictionary.metrics.upcomingServices, report.data.upcoming.length], [dictionary.metrics.readyToStart, report.data.readyToStart.length], [dictionary.metrics.inProgress, report.data.inProgress.length]].map(([label, value]) => <Metric key={String(label)} label={String(label)} value={formatUiNumber(locale, Number(value))} />)}</div><div className="mt-4 flex flex-wrap gap-2">{report.data.upcoming.slice(0, 8).map((service) => <PendingLink key={service.id} href={`/services/${service.id}`} className="rounded-lg border border-outline-variant px-3 py-2 text-[13px] text-primary"><span dir="ltr">{service.serviceNumber}</span> · <span dir="auto">{service.serviceTitle}</span></PendingLink>)}</div><span className="sr-only">{serviceDictionary.detail.sections.operationalDetails}</span></ReportSection>;
}

function CustomerReport({ report, dictionary, locale }: { report: Awaited<ReturnType<typeof getReportsCenterData>>["customerOverview"]; dictionary: ReturnType<typeof getReportsDictionary>; locale: "en" | "ar" }) {
  if (report.status !== "ready") return <ReportSection title={dictionary.sections.customers} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error} />;
  return <ReportSection title={dictionary.sections.customers} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error}><div className="grid grid-cols-1 gap-3 md:grid-cols-3"><Metric label={dictionary.metrics.activeCustomers} value={report.data.activeCustomers === null ? "—" : formatUiNumber(locale, report.data.activeCustomers)} /><Metric label={dictionary.metrics.outstandingCustomers} value={report.data.outstandingCustomersCount === null ? "—" : formatUiNumber(locale, report.data.outstandingCustomersCount)} /><Metric label={dictionary.metrics.highestInvoicedCustomers} value={report.data.highestInvoicedCustomersCount === null ? "—" : formatUiNumber(locale, report.data.highestInvoicedCustomersCount)} /></div><div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2"><CustomerRanking title={dictionary.metrics.outstandingCustomers} rows={report.data.outstandingCustomers} dictionary={dictionary} locale={locale} /><CustomerRanking title={dictionary.metrics.highestInvoicedCustomers} rows={report.data.highestInvoicedCustomers} dictionary={dictionary} locale={locale} /></div></ReportSection>;
}

function CustomerRanking({ title, rows, dictionary, locale }: { title: string; rows: Array<{ customerId: string; customerNumber: string | null; company: string | null; amount: number }>; dictionary: ReturnType<typeof getReportsDictionary>; locale: "en" | "ar" }) {
  return <div><h3 className="mb-2 text-[13px] font-semibold text-on-surface-variant">{title}</h3>{rows.length === 0 ? <p className="text-[13px] text-on-surface-variant">{dictionary.states.empty}</p> : <ul className="space-y-2">{rows.slice(0, 6).map((customer) => { const hasIdentity = Boolean(customer.company || customer.customerNumber); return <li key={customer.customerId} className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-3 py-2">{hasIdentity ? <PendingLink href={`/customers/${customer.customerId}`} className="min-w-0 truncate text-[13px] text-primary hover:underline"><span dir="auto">{customer.company || dictionary.tables.identityUnavailable}</span>{customer.customerNumber ? <span className="ms-2 text-[12px] text-on-surface-variant" dir="ltr">{customer.customerNumber}</span> : null}</PendingLink> : <span className="min-w-0 truncate text-[13px] text-on-surface-variant">{dictionary.tables.identityUnavailable}</span>}{hasIdentity ? <span dir="ltr" className="shrink-0 text-[13px] font-semibold tabular-nums">{formatSarAmount(locale, customer.amount)}</span> : null}</li>; })}</ul>}</div>;
}

function SupplierReport({ report, dictionary, locale }: { report: Awaited<ReturnType<typeof getReportsCenterData>>["supplierOperations"]; dictionary: ReturnType<typeof getReportsDictionary>; locale: "en" | "ar" }) {
  if (report.status !== "ready") return <ReportSection title={dictionary.sections.suppliers} status={report.status} unavailable={dictionary.states.noSupplierAccess} error={dictionary.states.error} />;
  return <ReportSection title={dictionary.sections.suppliers} status={report.status} unavailable={dictionary.states.noSupplierAccess} error={dictionary.states.error}><div className="grid grid-cols-1 gap-3 md:grid-cols-3"><Metric label={dictionary.metrics.activeAllocations} value={formatUiNumber(locale, report.data.activeAllocations)} /><Metric label={dictionary.metrics.activeBookings} value={formatUiNumber(locale, report.data.activeBookings)} /><Metric label={dictionary.metrics.internalCost} value={report.data.internalEstimatedCost === null ? "—" : formatSarAmount(locale, report.data.internalEstimatedCost)} /></div><p className="mt-3 text-[12px] text-on-surface-variant">{dictionary.states.noSupplierAccess}</p></ReportSection>;
}

function ReportSection({ title, status, unavailable, error, children }: { title: string; status: "ready" | "forbidden" | "error"; unavailable: string; error: string; children?: ReactNode }) {
  return <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5"><h2 className="mb-4 text-[18px] font-semibold text-primary">{title}</h2>{status === "forbidden" ? <p className="text-[14px] text-on-surface-variant">{unavailable}</p> : status === "error" ? <p className="text-[14px] text-error" role="alert">{error}</p> : children}</section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-outline-variant bg-surface p-3"><span className="block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</span><span className="mt-2 block text-[16px] font-semibold text-primary tabular-nums" dir="ltr">{value}</span></div>;
}
