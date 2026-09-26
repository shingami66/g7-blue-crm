import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { UiBidiText, UiLtrText, UiMoneyText, UiNumberText } from "@/components/i18n/UiValueText";
import { UiDateText } from "@/components/i18n/UiDateText";
import DataTable from "@/components/ui/DataTable";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import type { DataTableColumn } from "@/components/ui/data-table-contract";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { buildReportPageHref, clampReportPage, normalizeReportPage } from "@/lib/reports/pagination";
import { getEventEconomicsReport, hasReportData } from "@/lib/reports/reporting";
import type { ReportDefinition, ReportEventEconomicsRow, ReportEventEconomicsSummary } from "@/lib/reports/types";
import {
  buildEventEconomicsViewHref,
  getEventAmountTone,
  getEventEconomicsColumnAlignment,
  EVENT_ECONOMICS_VIEW_COLUMNS,
  EVENT_ECONOMICS_VIEW_OPTIONS,
  resolveEventEconomicsView,
  type EventEconomicsColumnKey,
  type EventEconomicsView,
} from "@/lib/reports/presentation";
import ReportPagination from "../ReportPagination";
import ReportState from "../ReportState";
import ReportWorkspace from "../ReportWorkspace";

export const dynamic = "force-dynamic";

function value(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

function exportQuery(values: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  Object.entries(values).forEach(([key, item]) => { if (item) params.set(key, item); });
  return `/api/reports/event-economics/export?${params.toString()}`;
}

export default async function EventEconomicsReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getReportCenterDictionary(locale);
  const definition = getReportDefinitions(locale).find((item) => item.key === "event_economics") as ReportDefinition;
  const query = await searchParams;
  const values = {
    asOf: value(query.asOf),
    search: value(query.search),
    completeness: value(query.completeness) ?? "all",
    closeState: value(query.closeState) ?? "all",
  };
  const view = resolveEventEconomicsView(value(query.view));
  const pageValues = { ...values, view };
  const requestedPage = value(query.page);
  const page = normalizeReportPage(requestedPage);
  const completeness = values.completeness === "COMPLETE" || values.completeness === "PARTIAL" || values.completeness === "UNAVAILABLE" ? values.completeness : "all";
  const closeState = values.closeState === "open" || values.closeState === "closed" ? values.closeState : "all";
  let result: Awaited<ReturnType<typeof getEventEconomicsReport>> | null = null;
  let loadFailure: "forbidden" | "unavailable" | "error" | null = null;
  try {
    result = await getEventEconomicsReport({ asOfDate: values.asOf, search: values.search, completeness, closeState, page, pageSize: 20 });
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    loadFailure = error instanceof ForbiddenError ? "forbidden" : error instanceof AuthDependencyError ? "unavailable" : "error";
  }
  if (loadFailure || !result || !hasReportData(result)) {
    return <ReportWorkspace definition={definition} dictionary={dictionary} locale={locale} generatedAt={new Date().toISOString()} filterPanel={<EventEconomicsFilters dictionary={dictionary} values={pageValues} />}><ReportState status={loadFailure ?? result?.status ?? "error"} dictionary={dictionary} /></ReportWorkspace>;
  }
  const report = result.data;
  const finalPage = clampReportPage(page, report.pagination.totalPages);
  if (requestedPage !== undefined && requestedPage !== String(page)) {
    redirect(buildReportPageHref("/reports/event-economics", pageValues, page));
  }
  if (finalPage !== page) {
    redirect(buildReportPageHref("/reports/event-economics", pageValues, finalPage));
  }
  return (
      <ReportWorkspace
        definition={definition}
        dictionary={dictionary}
        locale={locale}
        asOfDate={report.asOfDate}
        generatedAt={new Date().toISOString()}
        exportHref={exportQuery(values)}
        presentation={{
          description: definition.description,
          detailsLabel: dictionary.event.reportDetails,
          contextSummary: (
            <>
              <span>{dictionary.workspace.asOf}: <UiDateText locale={locale} value={report.asOfDate} /></span>
              <span aria-hidden="true">·</span>
              <span>{dictionary.event.historicalLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{dictionary.workspace.timezone}</span>
              <span aria-hidden="true">·</span>
            </>
          ),
        }}
        stateNote={report.summary.completenessSummaryState === "unavailable" ? (
          <p role="status" aria-atomic="true" className="rounded-md border border-status-potential-text/25 bg-status-potential-bg px-4 py-3 text-sm leading-5 text-status-potential-text">
            {dictionary.event.completenessSummaryUnavailable}
          </p>
        ) : result.status === "partial" ? (
          <p role="status" aria-atomic="true" className="rounded-md border border-status-potential-text/25 bg-status-potential-bg px-4 py-3 text-sm leading-5 text-status-potential-text">
            {dictionary.event.incompleteSourceWarning}
          </p>
        ) : null}
        filterPanel={<EventEconomicsFilters dictionary={dictionary} values={pageValues} />}
      >
        <EventEconomicsSummaryCounts totalCount={report.pagination.total} summary={report.summary} locale={locale} dictionary={dictionary} />
        <EventEconomicsViewSelector view={view} filters={values} page={report.pagination.page} dictionary={dictionary} />
        <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="event-economics-detail">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant px-4 py-4">
            <h2 id="event-economics-detail" className="text-base font-semibold text-primary">{dictionary.event.views[view === "cost" ? "costAnalysis" : view === "commercial" ? "commercialClose" : "overview"]}</h2>
          </div>
          {report.rows.length > 0 ? (
            <DataTable minWidth="100%" ariaLabel={dictionary.event.views[view === "cost" ? "costAnalysis" : view === "commercial" ? "commercialClose" : "overview"]} columns={EVENT_ECONOMICS_VIEW_COLUMNS[view].map((key) => eventColumnDefinition(key, dictionary))}>
              {report.rows.map((row) => (
                <tr key={row.serviceId}>
                  {EVENT_ECONOMICS_VIEW_COLUMNS[view].map((key) => <td key={key} className="px-3 py-2.5 align-top">{renderEventColumn(key, row, locale, dictionary)}</td>)}
                </tr>
              ))}
            </DataTable>
          ) : <p className="px-4 py-8 text-sm text-on-surface-variant">{dictionary.workspace.noRows}</p>}
          <ReportPagination pathname="/reports/event-economics" query={pageValues} page={report.pagination.page} totalPages={report.pagination.totalPages} dictionary={dictionary} />
        </section>
      </ReportWorkspace>
    );
}

function EventEconomicsSummaryCounts({ totalCount, summary, locale, dictionary }: {
  totalCount: number;
  summary: ReportEventEconomicsSummary;
  locale: "en" | "ar";
  dictionary: ReturnType<typeof getReportCenterDictionary>;
}) {
  const items = [
    { label: dictionary.event.eventsShown, value: totalCount },
    { label: dictionary.event.complete, value: summary.completeCount },
    { label: dictionary.event.partial, value: summary.partialCount },
    { label: dictionary.event.open, value: summary.openCount },
    { label: dictionary.event.closed, value: summary.closedCount },
  ];

  return (
    <>
      <dl aria-label={dictionary.event.summaryCounts} className="grid min-w-0 grid-cols-2 divide-x divide-y divide-surface-variant rounded-lg border border-surface-variant bg-surface-container-low sm:grid-cols-5 sm:divide-y-0 rtl:divide-x-reverse">
        {items.map(({ label, value }) => (
          <div key={label} className="flex min-w-0 flex-col justify-center gap-0.5 px-3 py-2 text-start">
            <dt className="text-xs leading-4 text-on-surface-variant">{label}</dt>
            <dd className="text-sm font-semibold leading-5 tabular-nums text-on-surface">
              {value === null
                ? <><span aria-hidden="true">—</span><span className="sr-only">{dictionary.event.completenessSummaryUnavailable}</span></>
                : <UiNumberText locale={locale} value={value} />}
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}

function EventEconomicsViewSelector({ view, filters, page, dictionary }: {
  view: EventEconomicsView;
  filters: { asOf?: string; search?: string; completeness: string; closeState: string };
  page: number;
  dictionary: ReturnType<typeof getReportCenterDictionary>;
}) {
  return (
    <nav aria-label={dictionary.event.views.selector} className="flex min-w-0 flex-wrap items-center gap-3">
      <div className="flex min-w-0 flex-wrap rounded-lg border border-outline-variant bg-surface-container-low p-1">
        {EVENT_ECONOMICS_VIEW_OPTIONS.map(({ key, labelKey }) => {
          const selected = view === key;
          return (
            <Link
              key={key}
              href={buildEventEconomicsViewHref(key, filters, page)}
              aria-current={selected ? "page" : undefined}
              className={`inline-flex min-h-9 items-center justify-center rounded-md px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 ${selected ? "bg-primary text-white shadow-sm" : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface"}`}
            >
              {dictionary.event.views[labelKey]}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

function eventColumnDefinition(key: EventEconomicsColumnKey, dictionary: ReturnType<typeof getReportCenterDictionary>): DataTableColumn {
  const header: Record<EventEconomicsColumnKey, string> = {
    service: dictionary.event.eventService,
    budget: dictionary.event.approvedBudget,
    commitment: dictionary.event.commitment,
    actual: dictionary.event.actual,
    paid: dictionary.event.paid,
    outstanding: dictionary.event.outstanding,
    etc: dictionary.event.etc,
    eac: dictionary.event.eac,
    commercialValue: dictionary.event.commercialValue,
    forecast: dictionary.event.forecastMargin,
    status: dictionary.event.status,
    close: dictionary.event.closeState,
    finalActual: dictionary.event.finalActual,
    finalMargin: dictionary.event.finalMargin,
  };
  const kind: NonNullable<DataTableColumn["kind"]> = key === "service" ? "identifier" : key === "status" || key === "close" ? "status" : "money";
  const minWidthByKey: Record<EventEconomicsColumnKey, number> = {
    service: 320,
    budget: 136,
    commitment: 136,
    actual: 136,
    paid: 136,
    outstanding: 136,
    etc: 136,
    eac: 136,
    commercialValue: 148,
    forecast: 136,
    status: 208,
    close: 112,
    finalActual: 148,
    finalMargin: 160,
  };
  const minWidth = minWidthByKey[key];
  const align = getEventEconomicsColumnAlignment(key);
  return { key, header: header[key], kind, align, minWidth, noWrap: kind === "money" || key === "close" };
}

function renderEventColumn(
  key: EventEconomicsColumnKey,
  row: ReportEventEconomicsRow,
  locale: "en" | "ar",
  dictionary: ReturnType<typeof getReportCenterDictionary>,
): ReactNode {
  if (key === "service") {
    const serviceTitle = resolveRecordTitle(locale, row.serviceTitle);
    const customerTitle = resolveRecordTitle(locale, row.customerName);
    return (
      <div className="w-full min-w-0 text-start">
        <Link href={`/services/${row.serviceId}/costing`} className="block w-full min-w-0 text-start text-primary hover:underline">
          <span title={serviceTitle} className="block w-full min-w-0 truncate text-start font-medium leading-5"><UiBidiText>{serviceTitle}</UiBidiText></span>
        </Link>
        <div className="mt-0.5 flex min-w-0 items-baseline gap-1 text-start text-xs leading-4 text-on-surface-variant">
          <span className="shrink-0"><UiLtrText>{row.serviceNumber}</UiLtrText></span>
          <span aria-hidden="true" className="shrink-0">·</span>
          {customerTitle ? (
            <Link href={`/customers/${row.customerId}`} title={customerTitle} className="min-w-0 flex-1 truncate hover:text-primary hover:underline"><UiBidiText>{customerTitle}</UiBidiText></Link>
          ) : <span title={dictionary.event.noCustomerIdentity} className="min-w-0 flex-1 truncate">{dictionary.event.noCustomerIdentity}</span>}
        </div>
      </div>
    );
  }
  if (key === "status") {
    const completeness = row.completenessStatus === "COMPLETE" ? "complete" : row.completenessStatus === "PARTIAL" ? "partial" : "unavailable";
    const completenessLabel = row.completenessStatus === "COMPLETE" ? dictionary.event.complete : row.completenessStatus === "PARTIAL" ? dictionary.event.partial : dictionary.event.unavailable;
    const closeTone = row.closeState === "closed" ? "closed" : "open";
    const closeLabel = row.closeState === "closed" ? dictionary.event.closed : dictionary.event.open;
    return (
      <div role="group" aria-label={dictionary.event.status} className="flex min-w-0 flex-wrap items-center gap-1.5 text-start">
        <span className="sr-only">{dictionary.event.completeness}: {completenessLabel}</span>
        <EventStatusBadge ariaHidden tone={completeness}>{completenessLabel}</EventStatusBadge>
        <span className="sr-only">{dictionary.event.closeState}: {closeLabel}</span>
        <EventStatusBadge ariaHidden tone={closeTone}>{closeLabel}</EventStatusBadge>
      </div>
    );
  }
  if (key === "close") {
    return <EventStatusBadge tone={row.closeState === "closed" ? "closed" : "open"}>{row.closeState === "closed" ? dictionary.event.closed : dictionary.event.open}</EventStatusBadge>;
  }
  if (key === "finalActual" || key === "finalMargin") {
    if (row.closeState !== "closed") return <span aria-label={dictionary.event.noFinalForOpen} title={dictionary.event.noFinalForOpen} className="text-xs text-on-surface-variant">—</span>;
    const amount = key === "finalActual" ? row.finalActualCost : row.finalManagerialMargin;
    return <UiMoneyText locale={locale} value={amount} className={moneyToneClassName(amount)} />;
  }
  const value: Record<Exclude<EventEconomicsColumnKey, "service" | "status" | "close" | "finalActual" | "finalMargin">, number | null> = {
    budget: row.approvedBudgetCost,
    commitment: row.openCommitment,
    actual: row.actualCost,
    paid: row.paidCost,
    outstanding: row.outstandingCost,
    etc: row.etc,
    eac: row.eac,
    commercialValue: row.netApprovedCommercialValue,
    forecast: row.forecastMargin,
  };
  const amount = value[key];
  return <UiMoneyText locale={locale} value={amount} className={moneyToneClassName(amount)} />;
}

function moneyToneClassName(amount: number | null) {
  const tone = getEventAmountTone(amount);
  if (tone === "meaningful") return undefined;
  return tone === "zero" ? "text-on-surface-variant" : "text-xs text-on-surface-variant";
}

type EventStatusTone = "complete" | "partial" | "unavailable" | "open" | "closed";

function EventStatusBadge({ tone, children, ariaHidden = false }: { tone: EventStatusTone; children: ReactNode; ariaHidden?: boolean }) {
  const toneClass: Record<EventStatusTone, string> = {
    complete: "border-status-completed-text/20 bg-status-completed-bg text-status-completed-text",
    partial: "border-status-potential-text/20 bg-status-potential-bg text-status-potential-text",
    unavailable: "border-status-inactive-text/20 bg-status-inactive-bg text-status-inactive-text",
    open: "border-status-potential-text/20 bg-status-potential-bg text-status-potential-text",
    closed: "border-status-completed-text/20 bg-status-completed-bg text-status-completed-text",
  };
  return <span aria-hidden={ariaHidden} className={`inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-medium leading-4 ${toneClass[tone]}`}><UiBidiText>{children}</UiBidiText></span>;
}

function EventEconomicsFilters({ dictionary, values }: { dictionary: ReturnType<typeof getReportCenterDictionary>; values: Record<string, string | undefined> }) {
  return <form method="get" className="grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4 sm:grid-cols-2 xl:grid-cols-[minmax(8rem,3fr)_minmax(11rem,5fr)_minmax(10rem,4fr)_minmax(10rem,4fr)_minmax(11rem,4fr)]">
    <input type="hidden" name="view" value={values.view ?? "overview"} />
    <label className="flex min-w-0 flex-col gap-2 text-sm text-on-surface-variant"><span>{dictionary.workspace.asOf}</span><input name="asOf" type="date" defaultValue={values.asOf} className="h-11 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <label className="flex min-w-0 flex-col gap-2 text-sm text-on-surface-variant"><span>{dictionary.workspace.search}</span><input name="search" defaultValue={values.search} className="h-11 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm text-on-surface" /></label>
    <label className="flex min-w-0 flex-col gap-2 text-sm text-on-surface-variant"><span>{dictionary.event.completeness}</span><select name="completeness" defaultValue={values.completeness} className="h-11 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface"><option value="all">{dictionary.event.allCompleteness}</option><option value="COMPLETE">{dictionary.event.complete}</option><option value="PARTIAL">{dictionary.event.partial}</option><option value="UNAVAILABLE">{dictionary.event.unavailable}</option></select></label>
    <label className="flex min-w-0 flex-col gap-2 text-sm text-on-surface-variant"><span>{dictionary.event.closeState}</span><select name="closeState" defaultValue={values.closeState} className="h-11 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface"><option value="all">{dictionary.event.allCloseStates}</option><option value="open">{dictionary.event.open}</option><option value="closed">{dictionary.event.closed}</option></select></label>
    <div className="flex min-w-0 flex-wrap items-end justify-end gap-2 sm:col-span-2 xl:col-span-1">
      <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.workspace.apply}</button>
      <Link href="/reports/event-economics" className="inline-flex h-11 items-center justify-center rounded-md border border-outline-variant px-5 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.workspace.clear}</Link>
    </div>
  </form>;
}
