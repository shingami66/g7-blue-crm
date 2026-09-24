import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { UiBidiText, UiLtrText, UiMoneyText } from "@/components/i18n/UiValueText";
import DataTable from "@/components/ui/DataTable";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import type { DataTableColumn } from "@/components/ui/data-table-contract";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { getEventEconomicsReport, hasReportData } from "@/lib/reports/reporting";
import type { ReportDefinition, ReportEventEconomicsRow } from "@/lib/reports/types";
import {
  buildEventEconomicsViewHref,
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
  const page = Math.max(Number(value(query.page)) || 1, 1);
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
  return (
      <ReportWorkspace
        definition={definition}
        dictionary={dictionary}
        locale={locale}
        asOfDate={report.asOfDate}
        generatedAt={new Date().toISOString()}
        exportHref={exportQuery(values)}
        stateNote={result.status === "partial" ? <p className="text-sm text-on-surface-variant">{dictionary.workspace.partial}</p> : null}
        filterPanel={<EventEconomicsFilters dictionary={dictionary} values={pageValues} />}
      >
        <EventEconomicsViewSelector view={view} filters={values} dictionary={dictionary} />
        <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="event-economics-detail">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant px-4 py-4">
            <h2 id="event-economics-detail" className="text-base font-semibold text-primary">{dictionary.event.views[view === "cost" ? "costAnalysis" : view === "commercial" ? "commercialClose" : "overview"]}</h2>
            <span className="text-sm text-on-surface-variant">{dictionary.workspace.rows}: <UiLtrText>{report.pagination.total}</UiLtrText></span>
          </div>
          {report.rows.length > 0 ? (
            <DataTable minWidth={eventViewMinWidth(view)} ariaLabel={dictionary.event.views[view === "cost" ? "costAnalysis" : view === "commercial" ? "commercialClose" : "overview"]} columns={EVENT_ECONOMICS_VIEW_COLUMNS[view].map((key) => eventColumnDefinition(key, dictionary))}>
              {report.rows.map((row) => (
                <tr key={row.serviceId}>
                  {EVENT_ECONOMICS_VIEW_COLUMNS[view].map((key) => <td key={key}>{renderEventColumn(key, row, locale, dictionary)}</td>)}
                </tr>
              ))}
            </DataTable>
          ) : <p className="px-4 py-8 text-sm text-on-surface-variant">{dictionary.workspace.noRows}</p>}
          <ReportPagination pathname="/reports/event-economics" query={pageValues} page={report.pagination.page} totalPages={report.pagination.totalPages} dictionary={dictionary} />
        </section>
      </ReportWorkspace>
    );
}

function EventEconomicsViewSelector({ view, filters, dictionary }: {
  view: EventEconomicsView;
  filters: { asOf?: string; search?: string; completeness: string; closeState: string };
  dictionary: ReturnType<typeof getReportCenterDictionary>;
}) {
  return (
    <nav aria-label={dictionary.event.views.selector} className="flex min-w-0 flex-wrap items-center gap-3">
      <span className="text-xs font-semibold text-on-surface-variant">{dictionary.event.views.selector}</span>
      <div className="flex min-w-0 flex-wrap rounded-lg border border-outline-variant bg-surface-container-low p-1">
        {EVENT_ECONOMICS_VIEW_OPTIONS.map(({ key, labelKey }) => {
          const selected = view === key;
          return (
            <Link
              key={key}
              href={buildEventEconomicsViewHref(key, filters)}
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
    customer: dictionary.ar.customer,
    budget: dictionary.event.approvedBudget,
    commitment: dictionary.event.commitment,
    actual: dictionary.event.actual,
    paid: dictionary.event.paid,
    outstanding: dictionary.event.outstanding,
    etc: dictionary.event.etc,
    eac: dictionary.event.eac,
    commercialValue: dictionary.event.commercialValue,
    forecast: dictionary.event.forecastMargin,
    completeness: dictionary.event.completeness,
    close: dictionary.event.closeState,
    finalActual: dictionary.event.finalActual,
    finalMargin: dictionary.event.finalMargin,
  };
  const kind: NonNullable<DataTableColumn["kind"]> = key === "service" ? "identifier" : key === "customer" ? "text" : key === "completeness" || key === "close" ? "status" : "money";
  const minWidth = key === "service" ? 280 : key === "customer" ? 220 : kind === "status" ? 160 : 150;
  const align: DataTableColumn["align"] = kind === "money" ? "end" : kind === "status" ? "center" : "start";
  return { key, header: header[key], kind, align, minWidth, noWrap: kind === "money" || kind === "status" };
}

function eventViewMinWidth(view: EventEconomicsView) {
  if (view === "overview") return "1450px";
  return view === "cost" ? "1320px" : "1260px";
}

function renderEventColumn(
  key: EventEconomicsColumnKey,
  row: ReportEventEconomicsRow,
  locale: "en" | "ar",
  dictionary: ReturnType<typeof getReportCenterDictionary>,
): ReactNode {
  if (key === "service") {
    return <Link href={`/services/${row.serviceId}/costing`} className="font-medium text-primary hover:underline"><UiLtrText>{row.serviceNumber}</UiLtrText> <span aria-hidden>·</span> <UiBidiText>{row.serviceTitle}</UiBidiText></Link>;
  }
  if (key === "customer") {
    return row.customerName ? <Link href={`/customers/${row.customerId}`} className="hover:underline"><UiBidiText>{row.customerName}</UiBidiText></Link> : <span className="text-on-surface-variant">{dictionary.event.noCustomerIdentity}</span>;
  }
  if (key === "completeness") {
    return <UiBidiText>{row.completenessStatus === "COMPLETE" ? dictionary.event.complete : row.completenessStatus === "PARTIAL" ? dictionary.event.partial : dictionary.event.unavailable}</UiBidiText>;
  }
  if (key === "close") {
    return <UiBidiText>{row.closeState === "closed" ? dictionary.event.closed : dictionary.event.open}</UiBidiText>;
  }
  if (key === "finalActual" || key === "finalMargin") {
    if (row.closeState !== "closed") return <span aria-label={dictionary.event.noFinalForOpen} title={dictionary.event.noFinalForOpen} className="text-on-surface-variant">—</span>;
    return <UiMoneyText locale={locale} value={key === "finalActual" ? row.finalActualCost : row.finalManagerialMargin} />;
  }
  const value: Record<Exclude<EventEconomicsColumnKey, "service" | "customer" | "completeness" | "close" | "finalActual" | "finalMargin">, number | null> = {
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
  return <UiMoneyText locale={locale} value={value[key]} />;
}

function EventEconomicsFilters({ dictionary, values }: { dictionary: ReturnType<typeof getReportCenterDictionary>; values: Record<string, string | undefined> }) {
  return <form method="get" className="grid min-w-0 grid-cols-1 gap-4 rounded-xl border border-surface-variant bg-surface-container-lowest p-5 sm:grid-cols-2 xl:grid-cols-12">
    <input type="hidden" name="view" value={values.view ?? "overview"} />
    <label className="flex min-w-0 flex-col gap-2 text-sm text-on-surface-variant xl:col-span-2"><span>{dictionary.workspace.asOf}</span><input name="asOf" type="date" defaultValue={values.asOf} className="h-11 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <label className="flex min-w-0 flex-col gap-2 text-sm text-on-surface-variant xl:col-span-4"><span>{dictionary.workspace.search}</span><input name="search" defaultValue={values.search} className="h-11 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm text-on-surface" /></label>
    <label className="flex min-w-0 flex-col gap-2 text-sm text-on-surface-variant xl:col-span-3"><span>{dictionary.event.completeness}</span><select name="completeness" defaultValue={values.completeness} className="h-11 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface"><option value="all">{dictionary.event.allCompleteness}</option><option value="COMPLETE">{dictionary.event.complete}</option><option value="PARTIAL">{dictionary.event.partial}</option><option value="UNAVAILABLE">{dictionary.event.unavailable}</option></select></label>
    <label className="flex min-w-0 flex-col gap-2 text-sm text-on-surface-variant xl:col-span-3"><span>{dictionary.event.closeState}</span><select name="closeState" defaultValue={values.closeState} className="h-11 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface"><option value="all">{dictionary.event.allCloseStates}</option><option value="open">{dictionary.event.open}</option><option value="closed">{dictionary.event.closed}</option></select></label>
    <div className="flex min-w-0 flex-wrap items-center gap-2 sm:col-span-2 xl:col-span-12 xl:justify-end">
      <button type="submit" className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-5 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.workspace.apply}</button>
      <Link href="/reports/event-economics" className="inline-flex h-11 items-center justify-center rounded-md border border-outline-variant px-5 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.workspace.clear}</Link>
    </div>
  </form>;
}
