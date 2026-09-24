import Link from "next/link";
import { redirect } from "next/navigation";
import { UiBidiText, UiLtrText, UiMoneyText } from "@/components/i18n/UiValueText";
import { UiDateText } from "@/components/i18n/UiDateText";
import DataTable from "@/components/ui/DataTable";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { resolveReportFilters } from "@/lib/reports/filters";
import { getAccountsReceivableReport, hasReportData } from "@/lib/reports/reporting";
import type { ReportDefinition } from "@/lib/reports/types";
import ReportMetricCard from "../ReportMetricCard";
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
  return `/api/reports/accounts-receivable/export?${params.toString()}`;
}

export default async function AccountsReceivableReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getReportCenterDictionary(locale);
  const definition = getReportDefinitions(locale).find((item) => item.key === "accounts_receivable") as ReportDefinition;
  const query = await searchParams;
  const from = value(query.from);
  const to = value(query.to);
  const asOf = value(query.asOf);
  const page = Math.max(Number(value(query.page)) || 1, 1);
  const { filters, error: filterError } = resolveReportFilters({ from, to, asOf });
  const queryValues = { from, to, asOf };

  if (filterError) {
    return <ReportWorkspace definition={definition} dictionary={dictionary} locale={locale} generatedAt={new Date().toISOString()} filterPanel={<AccountsReceivableFilters dictionary={dictionary} values={queryValues} />}><ReportState status="error" dictionary={dictionary} /></ReportWorkspace>;
  }

  let result: Awaited<ReturnType<typeof getAccountsReceivableReport>> | null = null;
  let loadFailure: "forbidden" | "unavailable" | "error" | null = null;
  try {
    result = await getAccountsReceivableReport({ filters, page, pageSize: 20 });
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    loadFailure = error instanceof ForbiddenError ? "forbidden" : error instanceof AuthDependencyError ? "unavailable" : "error";
  }
  if (loadFailure || !result || !hasReportData(result)) {
    return <ReportWorkspace definition={definition} dictionary={dictionary} locale={locale} generatedAt={new Date().toISOString()} filterPanel={<AccountsReceivableFilters dictionary={dictionary} values={queryValues} />}><ReportState status={loadFailure ?? result?.status ?? "error"} dictionary={dictionary} /></ReportWorkspace>;
  }
  const report = result.data;
  return (
      <ReportWorkspace
        definition={definition}
        dictionary={dictionary}
        locale={locale}
        asOfDate={report.asOfDate}
        periodFrom={report.periodFrom}
        periodTo={report.periodTo}
        generatedAt={new Date().toISOString()}
        exportHref={exportQuery(queryValues)}
        filterPanel={<AccountsReceivableFilters dictionary={dictionary} values={queryValues} />}
      >
        <div className="space-y-6">
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportMetricCard label={dictionary.ar.billed} value={<UiMoneyText locale={locale} value={report.billedAmount} />} />
            <ReportMetricCard label={dictionary.ar.collectedCash} value={<UiMoneyText locale={locale} value={report.collectedCashAmount} />} />
            <ReportMetricCard label={dictionary.ar.outstanding} value={<UiMoneyText locale={locale} value={report.totalOutstanding} />} />
            <ReportMetricCard label={dictionary.ar.overdue} value={<UiMoneyText locale={locale} value={report.totalOverdue} />} />
          </dl>
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <ReportMetricCard label={dictionary.ar.notDue} value={<UiMoneyText locale={locale} value={report.notDueAmount} />} />
            <ReportMetricCard label={dictionary.ar.oneToThirty} value={<UiMoneyText locale={locale} value={report.ageing1To30Amount} />} />
            <ReportMetricCard label={dictionary.ar.thirtyOneToSixty} value={<UiMoneyText locale={locale} value={report.ageing31To60Amount} />} />
            <ReportMetricCard label={dictionary.ar.sixtyOneToNinety} value={<UiMoneyText locale={locale} value={report.ageing61To90Amount} />} />
            <ReportMetricCard label={dictionary.ar.ninetyOnePlus} value={<UiMoneyText locale={locale} value={report.ageing91PlusAmount} />} />
          </dl>
          <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="ar-invoice-detail">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant px-4 py-4">
              <h2 id="ar-invoice-detail" className="text-base font-semibold text-primary">{dictionary.ar.invoice}</h2>
              <span className="text-sm text-on-surface-variant">{dictionary.workspace.rows}: <UiLtrText>{report.detailTotalCount}</UiLtrText></span>
            </div>
            {report.rows.length > 0 ? (
              <DataTable columns={[
                { key: "invoice", header: dictionary.ar.invoice, kind: "identifier", align: "start" },
                { key: "customer", header: dictionary.ar.customer, kind: "text", align: "start" },
                { key: "service", header: dictionary.ar.service, kind: "text", align: "start" },
                { key: "issue", header: dictionary.ar.issueDate, kind: "date", align: "start" },
                { key: "due", header: dictionary.ar.dueDate, kind: "date", align: "start" },
                { key: "gross", header: dictionary.ar.gross, kind: "money", align: "end" },
                { key: "credits", header: dictionary.ar.credits, kind: "money", align: "end" },
                { key: "net", header: dictionary.ar.net, kind: "money", align: "end" },
                { key: "settled", header: dictionary.ar.settled, kind: "money", align: "end" },
                { key: "outstanding", header: dictionary.ar.outstandingColumn, kind: "money", align: "end" },
              ]}>
                {report.rows.map((row) => (
                  <tr key={row.invoiceId}>
                    <td><Link className="font-medium text-primary hover:underline" href={`/invoices/${row.invoiceId}`}><UiLtrText>{row.invoiceNumber}</UiLtrText></Link></td>
                    <td>{row.customerName ? <Link href={`/customers/${row.customerId}`} className="hover:underline"><UiBidiText>{row.customerName}</UiBidiText></Link> : <span className="text-on-surface-variant">{dictionary.ar.noCustomerIdentity}</span>}</td>
                    <td>{row.serviceTitle && row.serviceId ? <Link href={`/services/${row.serviceId}`} className="hover:underline"><UiBidiText>{row.serviceNumber} · {row.serviceTitle}</UiBidiText></Link> : <span className="text-on-surface-variant">{dictionary.ar.noServiceIdentity}</span>}</td>
                    <td><UiDateText locale={locale} value={row.issueDate} /></td>
                    <td><UiDateText locale={locale} value={row.dueDate} /></td>
                    <td><UiMoneyText locale={locale} value={row.grossAmount} /></td>
                    <td><UiMoneyText locale={locale} value={row.creditAdjustmentAmount + row.creditApplicationAmount} /></td>
                    <td><UiMoneyText locale={locale} value={row.netReceivableAmount} /></td>
                    <td><UiMoneyText locale={locale} value={row.settledAmount} /></td>
                    <td><UiMoneyText locale={locale} value={row.outstandingAmount} /></td>
                  </tr>
                ))}
              </DataTable>
            ) : <p className="px-4 py-8 text-sm text-on-surface-variant">{dictionary.workspace.noRows}</p>}
            <ReportPagination pathname="/reports/accounts-receivable" query={queryValues} page={report.detailTotalCount === 0 ? 1 : page} totalPages={Math.max(1, Math.ceil(report.detailTotalCount / 20))} dictionary={dictionary} />
          </section>
          {report.outstandingCustomers.length > 0 ? (
            <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="ar-customer-ranking">
              <h2 id="ar-customer-ranking" className="border-b border-surface-variant px-4 py-4 text-base font-semibold text-primary">{dictionary.ar.customerRanking}</h2>
              <DataTable columns={[{ key: "customer", header: dictionary.ar.customer, kind: "text", align: "start" }, { key: "amount", header: dictionary.ar.outstandingColumn, kind: "money", align: "end" }]}>
                {report.outstandingCustomers.map((customer) => <tr key={customer.customerId}><td><Link href={`/customers/${customer.customerId}`} className="hover:underline"><UiBidiText>{customer.company ?? customer.customerNumber ?? dictionary.ar.noCustomerIdentity}</UiBidiText></Link></td><td><UiMoneyText locale={locale} value={customer.amount} /></td></tr>)}
              </DataTable>
            </section>
          ) : null}
        </div>
      </ReportWorkspace>
    );
}

function AccountsReceivableFilters({ dictionary, values }: { dictionary: ReturnType<typeof getReportCenterDictionary>; values: Record<string, string | undefined> }) {
  return <form method="get" className="flex min-w-0 flex-wrap items-end gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
    <label className="flex min-w-[9rem] flex-1 flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.workspace.period}</span><span className="flex min-w-0 flex-wrap items-center gap-2"><input name="from" type="date" defaultValue={values.from} className="h-10 min-w-0 flex-1 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /><span aria-hidden>–</span><input name="to" type="date" defaultValue={values.to} className="h-10 min-w-0 flex-1 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></span></label>
    <label className="flex min-w-[10rem] flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.workspace.asOf}</span><input name="asOf" type="date" defaultValue={values.asOf} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">{dictionary.workspace.apply}</button>
    <Link href="/reports/accounts-receivable" className="inline-flex h-10 items-center rounded-md border border-outline-variant px-4 text-sm text-on-surface">{dictionary.workspace.clear}</Link>
  </form>;
}
