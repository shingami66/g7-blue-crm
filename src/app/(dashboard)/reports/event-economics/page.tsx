import Link from "next/link";
import { redirect } from "next/navigation";
import { UiBidiText, UiLtrText, UiMoneyText } from "@/components/i18n/UiValueText";
import DataTable from "@/components/ui/DataTable";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { getEventEconomicsReport, hasReportData } from "@/lib/reports/reporting";
import type { ReportDefinition } from "@/lib/reports/types";
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
    return <ReportWorkspace definition={definition} dictionary={dictionary} locale={locale} generatedAt={new Date().toISOString()} filterPanel={<EventEconomicsFilters dictionary={dictionary} values={values} />}><ReportState status={loadFailure ?? result?.status ?? "error"} dictionary={dictionary} /></ReportWorkspace>;
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
        filterPanel={<EventEconomicsFilters dictionary={dictionary} values={values} />}
      >
        <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="event-economics-detail">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant px-4 py-4">
            <div><h2 id="event-economics-detail" className="text-base font-semibold text-primary">{dictionary.event.title}</h2><p className="mt-1 text-xs text-on-surface-variant">{dictionary.event.description}</p></div>
            <span className="text-sm text-on-surface-variant">{dictionary.workspace.rows}: <UiLtrText>{report.pagination.total}</UiLtrText></span>
          </div>
          {report.rows.length > 0 ? (
            <DataTable columns={[
              { key: "service", header: dictionary.event.title, kind: "identifier", align: "start" },
              { key: "customer", header: dictionary.ar.customer, kind: "text", align: "start" },
              { key: "budget", header: dictionary.event.approvedBudget, kind: "money", align: "end" },
              { key: "commitment", header: dictionary.event.commitment, kind: "money", align: "end" },
              { key: "actual", header: dictionary.event.actual, kind: "money", align: "end" },
              { key: "paid", header: dictionary.event.paid, kind: "money", align: "end" },
              { key: "outstanding", header: dictionary.event.outstanding, kind: "money", align: "end" },
              { key: "etc", header: dictionary.event.etc, kind: "money", align: "end" },
              { key: "eac", header: dictionary.event.eac, kind: "money", align: "end" },
              { key: "commercial", header: dictionary.event.commercialValue, kind: "money", align: "end" },
              { key: "forecast", header: dictionary.event.forecastMargin, kind: "money", align: "end" },
              { key: "completeness", header: dictionary.event.completeness, kind: "status", align: "start" },
              { key: "close", header: dictionary.event.closeState, kind: "status", align: "start" },
              { key: "finalActual", header: dictionary.event.finalActual, kind: "money", align: "end" },
              { key: "finalMargin", header: dictionary.event.finalMargin, kind: "money", align: "end" },
            ]}>
              {report.rows.map((row) => (
                <tr key={row.serviceId}>
                  <td><Link href={`/services/${row.serviceId}/costing`} className="font-medium text-primary hover:underline"><UiLtrText>{row.serviceNumber}</UiLtrText> <span aria-hidden>·</span> <UiBidiText>{row.serviceTitle}</UiBidiText></Link></td>
                  <td>{row.customerName ? <Link href={`/customers/${row.customerId}`} className="hover:underline"><UiBidiText>{row.customerName}</UiBidiText></Link> : <span className="text-on-surface-variant">{dictionary.event.noCustomerIdentity}</span>}</td>
                  <td><UiMoneyText locale={locale} value={row.approvedBudgetCost} /></td>
                  <td><UiMoneyText locale={locale} value={row.openCommitment} /></td>
                  <td><UiMoneyText locale={locale} value={row.actualCost} /></td>
                  <td><UiMoneyText locale={locale} value={row.paidCost} /></td>
                  <td><UiMoneyText locale={locale} value={row.outstandingCost} /></td>
                  <td><UiMoneyText locale={locale} value={row.etc} /></td>
                  <td><UiMoneyText locale={locale} value={row.eac} /></td>
                  <td><UiMoneyText locale={locale} value={row.netApprovedCommercialValue} /></td>
                  <td><UiMoneyText locale={locale} value={row.forecastMargin} /></td>
                  <td><UiBidiText>{row.completenessStatus === "COMPLETE" ? dictionary.event.complete : row.completenessStatus === "PARTIAL" ? dictionary.event.partial : dictionary.event.unavailable}</UiBidiText></td>
                  <td><UiBidiText>{row.closeState === "closed" ? dictionary.event.closed : dictionary.event.open}</UiBidiText></td>
                  <td>{row.closeState === "closed" ? <UiMoneyText locale={locale} value={row.finalActualCost} /> : <span className="text-on-surface-variant">{dictionary.event.noFinalForOpen}</span>}</td>
                  <td>{row.closeState === "closed" ? <UiMoneyText locale={locale} value={row.finalManagerialMargin} /> : <span className="text-on-surface-variant">{dictionary.event.noFinalForOpen}</span>}</td>
                </tr>
              ))}
            </DataTable>
          ) : <p className="px-4 py-8 text-sm text-on-surface-variant">{dictionary.workspace.noRows}</p>}
          <ReportPagination pathname="/reports/event-economics" query={values} page={report.pagination.page} totalPages={report.pagination.totalPages} dictionary={dictionary} />
        </section>
      </ReportWorkspace>
    );
}

function EventEconomicsFilters({ dictionary, values }: { dictionary: ReturnType<typeof getReportCenterDictionary>; values: Record<string, string | undefined> }) {
  return <form method="get" className="flex min-w-0 flex-wrap items-end gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
    <label className="flex min-w-[10rem] flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.workspace.asOf}</span><input name="asOf" type="date" defaultValue={values.asOf} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.workspace.search}</span><input name="search" defaultValue={values.search} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <label className="flex min-w-[11rem] flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.event.completeness}</span><select name="completeness" defaultValue={values.completeness} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface"><option value="all">{dictionary.event.allCompleteness}</option><option value="COMPLETE">{dictionary.event.complete}</option><option value="PARTIAL">{dictionary.event.partial}</option><option value="UNAVAILABLE">{dictionary.event.unavailable}</option></select></label>
    <label className="flex min-w-[10rem] flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.event.closeState}</span><select name="closeState" defaultValue={values.closeState} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface"><option value="all">{dictionary.event.allCloseStates}</option><option value="open">{dictionary.event.open}</option><option value="closed">{dictionary.event.closed}</option></select></label>
    <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">{dictionary.workspace.apply}</button>
    <Link href="/reports/event-economics" className="inline-flex h-10 items-center rounded-md border border-outline-variant px-4 text-sm text-on-surface">{dictionary.workspace.clear}</Link>
  </form>;
}
