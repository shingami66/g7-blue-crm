import Link from "next/link";
import { redirect } from "next/navigation";
import { UiBidiText, UiLtrText, UiMoneyText } from "@/components/i18n/UiValueText";
import { UiDateText } from "@/components/i18n/UiDateText";
import DataTable from "@/components/ui/DataTable";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { getAccountsPayableReport, hasReportData } from "@/lib/reports/reporting";
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
  return `/api/reports/accounts-payable/export?${params.toString()}`;
}

export default async function AccountsPayableReportPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const locale = await getCurrentSessionEffectiveLocale();
  const dictionary = getReportCenterDictionary(locale);
  const definition = getReportDefinitions(locale).find((item) => item.key === "accounts_payable") as ReportDefinition;
  const query = await searchParams;
  const values = {
    status: value(query.status) ?? "all",
    supplierSearch: value(query.supplierSearch),
    serviceSearch: value(query.serviceSearch),
    dueFrom: value(query.dueFrom),
    dueTo: value(query.dueTo),
  };
  const page = Math.max(Number(value(query.page)) || 1, 1);
  const status = values.status === "unpaid" || values.status === "partially_paid" || values.status === "paid" ? values.status : "all";
  let result: Awaited<ReturnType<typeof getAccountsPayableReport>> | null = null;
  let loadFailure: "forbidden" | "unavailable" | "error" | null = null;
  try {
    result = await getAccountsPayableReport({ ...values, status, page, pageSize: 20 });
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    loadFailure = error instanceof ForbiddenError ? "forbidden" : error instanceof AuthDependencyError ? "unavailable" : "error";
  }
  if (loadFailure || !result || !hasReportData(result)) {
    return <ReportWorkspace definition={definition} dictionary={dictionary} locale={locale} generatedAt={new Date().toISOString()} stateNote={<p className="text-sm text-on-surface-variant">{dictionary.ap.currentOnly}</p>} filterPanel={<AccountsPayableFilters dictionary={dictionary} values={values} />}><ReportState status={loadFailure ?? result?.status ?? "error"} dictionary={dictionary} /></ReportWorkspace>;
  }
  const report = result.data;
  return (
    <ReportWorkspace
      definition={definition}
      dictionary={dictionary}
      locale={locale}
      generatedAt={new Date().toISOString()}
      exportHref={exportQuery(values)}
      stateNote={<p className="text-sm text-on-surface-variant">{dictionary.ap.currentOnly} {dictionary.ap.source}.</p>}
      filterPanel={<AccountsPayableFilters dictionary={dictionary} values={values} />}
    >
      <div className="space-y-6">
          <dl className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <ReportMetricCard label={dictionary.ap.payable} value={<UiMoneyText locale={locale} value={report.payableAmount} />} />
            <ReportMetricCard label={dictionary.ap.paid} value={<UiMoneyText locale={locale} value={report.paidAmount} />} />
            <ReportMetricCard label={dictionary.ap.outstanding} value={<UiMoneyText locale={locale} value={report.outstandingAmount} />} />
            <ReportMetricCard label={dictionary.ap.openBills} value={<UiLtrText>{report.openBillCount}</UiLtrText>} />
          </dl>
          <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="ap-bill-detail">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant px-4 py-4">
              <h2 id="ap-bill-detail" className="text-base font-semibold text-primary">{dictionary.ap.bill}</h2>
              <span className="text-sm text-on-surface-variant">{dictionary.workspace.rows}: <UiLtrText>{report.detailTotalCount}</UiLtrText></span>
            </div>
            {report.rows.length > 0 ? (
              <DataTable columns={[
                { key: "bill", header: dictionary.ap.bill, kind: "identifier", align: "start" },
                { key: "supplier", header: dictionary.ap.supplier, kind: "text", align: "start" },
                { key: "service", header: dictionary.ap.service, kind: "text", align: "start" },
                { key: "invoiceDate", header: dictionary.ap.invoiceDate, kind: "date", align: "start" },
                { key: "dueDate", header: dictionary.ap.dueDate, kind: "date", align: "start" },
                { key: "status", header: dictionary.ap.status, kind: "status", align: "start" },
                { key: "payable", header: dictionary.ap.payable, kind: "money", align: "end" },
                { key: "paid", header: dictionary.ap.paid, kind: "money", align: "end" },
                { key: "outstanding", header: dictionary.ap.outstanding, kind: "money", align: "end" },
              ]}>
                {report.rows.map((row) => (
                  <tr key={row.billId}>
                    <td><Link href={`/supplier-bills/${row.billId}`} className="font-medium text-primary hover:underline"><UiLtrText>{row.billNumber}</UiLtrText></Link></td>
                    <td>{row.supplierName ? <UiBidiText>{row.supplierName}</UiBidiText> : <span className="text-on-surface-variant">{dictionary.ap.noSupplierIdentity}</span>}</td>
                    <td>{row.serviceNumber && row.serviceId ? <Link href={`/services/${row.serviceId}`} className="hover:underline"><UiBidiText>{row.serviceNumber} · {row.serviceTitle}</UiBidiText></Link> : <span className="text-on-surface-variant">{dictionary.ap.noServiceIdentity}</span>}</td>
                    <td><UiDateText locale={locale} value={row.invoiceDate} /></td>
                    <td><UiDateText locale={locale} value={row.dueDate ?? ""} /></td>
                    <td><UiBidiText>{row.status === "paid" ? dictionary.ap.paidStatus : row.status === "partially_paid" ? dictionary.ap.partiallyPaid : dictionary.ap.unpaid}</UiBidiText></td>
                    <td><UiMoneyText locale={locale} value={row.payableAmount} /></td>
                    <td><UiMoneyText locale={locale} value={row.paidAmount} /></td>
                    <td><UiMoneyText locale={locale} value={row.outstandingAmount} /></td>
                  </tr>
                ))}
              </DataTable>
            ) : <p className="px-4 py-8 text-sm text-on-surface-variant">{dictionary.workspace.noRows}</p>}
            <ReportPagination pathname="/reports/accounts-payable" query={values} page={report.pagination.page} totalPages={report.pagination.totalPages} dictionary={dictionary} />
          </section>
      </div>
    </ReportWorkspace>
  );
}

function AccountsPayableFilters({ dictionary, values }: { dictionary: ReturnType<typeof getReportCenterDictionary>; values: Record<string, string | undefined> }) {
  return <form method="get" className="flex min-w-0 flex-wrap items-end gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-4">
    <label className="flex min-w-[10rem] flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.ap.status}</span><select name="status" defaultValue={values.status} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface"><option value="all">{dictionary.ap.allStatuses}</option><option value="unpaid">{dictionary.ap.unpaid}</option><option value="partially_paid">{dictionary.ap.partiallyPaid}</option><option value="paid">{dictionary.ap.paidStatus}</option></select></label>
    <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.ap.supplier}</span><input name="supplierSearch" defaultValue={values.supplierSearch} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <label className="flex min-w-[12rem] flex-1 flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.ap.service}</span><input name="serviceSearch" defaultValue={values.serviceSearch} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <label className="flex min-w-[9rem] flex-col gap-1 text-sm text-on-surface-variant"><span>{dictionary.ap.dueDate}</span><input name="dueFrom" type="date" defaultValue={values.dueFrom} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <label className="flex min-w-[9rem] flex-col gap-1 text-sm text-on-surface-variant"><span aria-hidden>&nbsp;</span><input name="dueTo" type="date" defaultValue={values.dueTo} className="h-10 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    <button type="submit" className="h-10 rounded-md bg-primary px-4 text-sm font-semibold text-white">{dictionary.workspace.apply}</button>
    <Link href="/reports/accounts-payable" className="inline-flex h-10 items-center rounded-md border border-outline-variant px-4 text-sm text-on-surface">{dictionary.workspace.clear}</Link>
  </form>;
}
