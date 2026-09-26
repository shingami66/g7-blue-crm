import Link from "next/link";
import { redirect } from "next/navigation";
import { UiBidiText, UiLtrText, UiMoneyText, UiNumberText } from "@/components/i18n/UiValueText";
import { UiDateText, UiDateTimeText } from "@/components/i18n/UiDateText";
import DataTable from "@/components/ui/DataTable";
import { AuthDependencyError, ForbiddenError, UnauthorizedError } from "@/lib/auth/errors";
import { checkPermission } from "@/lib/auth/permissions";
import { getCurrentSessionEffectiveLocale } from "@/lib/i18n/session-locale";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import { getReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import { getReportDefinitions } from "@/lib/reports/catalog";
import { buildReportPageHref, clampReportPage, normalizeReportPage } from "@/lib/reports/pagination";
import { getAccountsPayableReport, hasReportData } from "@/lib/reports/reporting";
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
  const generatedAt = new Date().toISOString();
  const presentation = {
    description: dictionary.ap.description,
    detailsLabel: dictionary.ap.reportDetails,
    currentOnlyDetail: { label: dictionary.ap.currentOnlyLabel, value: dictionary.ap.currentOnly },
    generatedAtDetail: {
      label: dictionary.ap.generatedAt,
      value: <UiDateTimeText locale={locale} value={generatedAt} options={{ timeZone: "Asia/Riyadh", dateStyle: "medium", timeStyle: "short" }} />,
    },
    contextSummary: (
      <>
        <span className="font-medium text-on-surface">{dictionary.ap.currentOnlyLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{dictionary.workspace.timezone}</span>
        <span aria-hidden="true">·</span>
        <span>{dictionary.ap.updated}: <UiDateText locale={locale} value={generatedAt} options={{ timeZone: "Asia/Riyadh", dateStyle: "medium" }} /></span>
        <span className="basis-full leading-5">{dictionary.ap.currentOnly}</span>
      </>
    ),
  };
  const query = await searchParams;
  const values = {
    status: value(query.status) ?? "all",
    supplierSearch: value(query.supplierSearch),
    serviceSearch: value(query.serviceSearch),
    dueFrom: value(query.dueFrom),
    dueTo: value(query.dueTo),
  };
  const requestedPage = value(query.page);
  const page = normalizeReportPage(requestedPage);
  const status = values.status === "unpaid" || values.status === "partially_paid" || values.status === "paid" ? values.status : "all";
  let result: Awaited<ReturnType<typeof getAccountsPayableReport>> | null = null;
  let canReadServices = false;
  let loadFailure: "forbidden" | "unavailable" | "error" | null = null;
  try {
    canReadServices = await checkPermission("services:read");
    result = await getAccountsPayableReport({ ...values, status, page, pageSize: 20 });
  } catch (error) {
    if (error instanceof UnauthorizedError) redirect("/sign-in");
    loadFailure = error instanceof ForbiddenError ? "forbidden" : error instanceof AuthDependencyError ? "unavailable" : "error";
  }
  if (loadFailure || !result || !hasReportData(result)) {
    return <ReportWorkspace definition={definition} dictionary={dictionary} locale={locale} generatedAt={generatedAt} presentation={presentation} filterPanel={<AccountsPayableFilters dictionary={dictionary} values={values} showServiceFilter={canReadServices} />}><ReportState status={loadFailure ?? result?.status ?? "error"} dictionary={dictionary} /></ReportWorkspace>;
  }
  const report = result.data;
  const finalPage = clampReportPage(page, report.pagination.totalPages);
  if (requestedPage !== undefined && requestedPage !== String(page)) {
    redirect(buildReportPageHref("/reports/accounts-payable", values, page));
  }
  if (finalPage !== page) {
    redirect(buildReportPageHref("/reports/accounts-payable", values, finalPage));
  }
  return (
    <ReportWorkspace
      definition={definition}
      dictionary={dictionary}
      locale={locale}
      generatedAt={generatedAt}
      exportHref={exportQuery(values)}
      presentation={presentation}
      filterPanel={<AccountsPayableFilters dictionary={dictionary} values={values} showServiceFilter={canReadServices} />}
    >
      <div className="min-w-0 space-y-4">
        <dl className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-surface-variant bg-surface-variant sm:grid-cols-4">
          <PayablesSummaryMetric label={dictionary.ap.summaryPayables} value={report.payableAmount} locale={locale} />
          <PayablesSummaryMetric label={dictionary.ap.paid} value={report.paidAmount} locale={locale} />
          <PayablesSummaryMetric label={dictionary.ap.outstanding} value={report.outstandingAmount} locale={locale} featured />
          <PayablesSummaryMetric label={dictionary.ap.openBills} value={report.openBillCount} locale={locale} count />
        </dl>
        <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="ap-bill-detail">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant px-4 py-3">
            <h2 id="ap-bill-detail" className="text-base font-semibold text-primary">{dictionary.ap.invoicesHeading}</h2>
            <span className="inline-flex items-center gap-1 text-sm text-on-surface-variant">
              <UiNumberText locale={locale} value={report.detailTotalCount} />
              {" "}
              {report.detailTotalCount === 1 ? dictionary.ap.billCountSingular : dictionary.ap.billCountPlural}
            </span>
          </div>
          {report.rows.length > 0 ? (
            <DataTable minWidth="100%" ariaLabel={dictionary.ap.invoicesHeading} columns={[
              { key: "bill", header: dictionary.ap.bill, kind: "identifier", align: "start", minWidth: 126, noWrap: true },
              { key: "supplier", header: dictionary.ap.supplier, kind: "text", align: "start", minWidth: 150 },
              { key: "service", header: dictionary.ap.service, kind: "text", align: "start", minWidth: 190 },
              { key: "dueDate", header: dictionary.ap.dueDate, kind: "date", align: "start", minWidth: 110, noWrap: true },
              { key: "status", header: dictionary.ap.status, kind: "status", align: "center", minWidth: 110, noWrap: true },
              { key: "payable", header: dictionary.ap.payable, kind: "money", align: "end", minWidth: 128, noWrap: true },
              { key: "paid", header: dictionary.ap.paid, kind: "money", align: "end", minWidth: 128, noWrap: true },
              { key: "outstanding", header: dictionary.ap.outstanding, kind: "money", align: "end", minWidth: 128, noWrap: true },
            ]}>
              {report.rows.map((row) => {
                const statusLabel = row.status === "paid"
                  ? dictionary.ap.paidStatus
                  : row.status === "partially_paid"
                    ? dictionary.ap.partiallyPaid
                    : dictionary.ap.unpaid;
                return (
                  <tr key={row.billId}>
                    <td className="align-middle px-2 py-2" style={{ width: "13%" }}>
                      <Link href={`/supplier-bills/${row.billId}`} className="font-medium text-primary hover:underline"><UiLtrText className="whitespace-nowrap">{row.billNumber}</UiLtrText></Link>
                    </td>
                    <td className="align-middle px-2 py-2" style={{ width: "16%" }}>
                      {row.supplierName ? <UiBidiText>{resolveRecordTitle(locale, row.supplierName)}</UiBidiText> : <span className="text-on-surface-variant">{dictionary.ap.noSupplierIdentity}</span>}
                    </td>
                    <td className="align-middle py-2 ps-4 pe-4" style={{ width: "22%" }}>
                      {row.serviceId && row.serviceTitle ? (
                        <Link href={`/services/${row.serviceId}`} className="flex min-w-0 w-full flex-col items-stretch gap-1 text-start hover:underline">
                          <span className="line-clamp-2 block w-full min-w-0 break-words text-start font-medium leading-5">
                            <UiBidiText>{resolveRecordTitle(locale, row.serviceTitle)}</UiBidiText>
                          </span>
                          {row.serviceNumber ? (
                            <span className="block w-full text-start text-xs leading-4 text-on-surface-variant">
                              <UiLtrText className="whitespace-nowrap">{row.serviceNumber}</UiLtrText>
                            </span>
                          ) : null}
                        </Link>
                      ) : <span className="text-on-surface-variant">{dictionary.ap.noServiceIdentity}</span>}
                    </td>
                    <td className="align-middle py-2 ps-4 pe-2" style={{ width: "10%" }}><UiDateText locale={locale} value={row.dueDate ?? ""} /></td>
                    <td className="align-middle px-2 py-2 text-center" style={{ width: "11%" }}>
                      <span className="inline-flex min-h-7 max-w-full items-center rounded-md border border-outline-variant bg-surface-container-low px-2 text-xs font-medium text-on-surface">
                        <UiBidiText>{statusLabel}</UiBidiText>
                      </span>
                    </td>
                    <td className="align-middle px-2 py-2" style={{ width: "9.33%" }}><UiMoneyText locale={locale} value={row.payableAmount} /></td>
                    <td className="align-middle px-2 py-2" style={{ width: "9.33%" }}><UiMoneyText locale={locale} value={row.paidAmount} /></td>
                    <td className="align-middle px-2 py-2" style={{ width: "9.33%" }}><UiMoneyText locale={locale} value={row.outstandingAmount} /></td>
                  </tr>
                );
              })}
            </DataTable>
          ) : <p className="px-4 py-8 text-sm text-on-surface-variant">{dictionary.workspace.noRows}</p>}
          <ReportPagination pathname="/reports/accounts-payable" query={values} page={report.pagination.page} totalPages={report.pagination.totalPages} dictionary={dictionary} />
        </section>
      </div>
    </ReportWorkspace>
  );
}

function PayablesSummaryMetric({
  label,
  value,
  locale,
  featured = false,
  count = false,
}: {
  label: string;
  value: number;
  locale: "en" | "ar";
  featured?: boolean;
  count?: boolean;
}) {
  return (
    <div className={`min-w-0 bg-surface-container-lowest p-3 sm:p-4 ${featured ? "bg-primary/5" : ""}`}>
      <dt className={featured ? "text-sm font-semibold text-primary" : "text-sm text-on-surface-variant"}>{label}</dt>
      <dd className={`mt-1 whitespace-nowrap tabular-nums ${featured ? "text-xl font-semibold leading-7 text-primary" : "text-lg font-semibold leading-7 text-on-surface"}`}>
        {count ? <UiNumberText locale={locale} value={value} /> : <UiMoneyText locale={locale} value={value} />}
      </dd>
    </div>
  );
}

function AccountsPayableFilters({ dictionary, values, showServiceFilter }: { dictionary: ReturnType<typeof getReportCenterDictionary>; values: Record<string, string | undefined>; showServiceFilter: boolean }) {
  return <form method="get" className={`grid min-w-0 grid-cols-1 gap-3 rounded-xl border border-surface-variant bg-surface-container-lowest p-3 sm:grid-cols-2 xl:items-end ${showServiceFilter ? "xl:grid-cols-[minmax(7rem,0.9fr)_minmax(9rem,1.2fr)_minmax(9rem,1.2fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto]" : "xl:grid-cols-[minmax(7rem,0.9fr)_minmax(9rem,1.2fr)_minmax(8rem,1fr)_minmax(8rem,1fr)_auto]"}`}>
    <label className="flex min-w-0 flex-col gap-1.5 text-sm text-on-surface-variant"><span>{dictionary.ap.status}</span><select name="status" defaultValue={values.status} className="h-10 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface"><option value="all">{dictionary.ap.allStatuses}</option><option value="unpaid">{dictionary.ap.unpaid}</option><option value="partially_paid">{dictionary.ap.partiallyPaid}</option><option value="paid">{dictionary.ap.paidStatus}</option></select></label>
    <label className="flex min-w-0 flex-col gap-1.5 text-sm text-on-surface-variant"><span>{dictionary.ap.supplier}</span><input name="supplierSearch" defaultValue={values.supplierSearch} className="h-10 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm text-on-surface" /></label>
    {showServiceFilter ? <label className="flex min-w-0 flex-col gap-1.5 text-sm text-on-surface-variant"><span>{dictionary.ap.service}</span><input name="serviceSearch" defaultValue={values.serviceSearch} className="h-10 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-3 text-sm text-on-surface" /></label> : null}
    <fieldset className="grid min-w-0 grid-cols-1 gap-3 sm:col-span-2 sm:grid-cols-2 xl:col-span-2 xl:grid-cols-2">
      <legend className="sr-only">{dictionary.ap.dueDate}</legend>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm text-on-surface-variant"><span>{dictionary.workspace.fromDate}</span><input name="dueFrom" type="date" defaultValue={values.dueFrom} className="h-10 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
      <label className="flex min-w-0 flex-col gap-1.5 text-sm text-on-surface-variant"><span>{dictionary.workspace.toDate}</span><input name="dueTo" type="date" defaultValue={values.dueTo} className="h-10 w-full min-w-0 rounded-md border border-outline-variant bg-surface px-2 text-sm text-on-surface" /></label>
    </fieldset>
    <div className="flex min-w-0 items-end gap-2 sm:col-span-2 xl:col-span-1">
      <button type="submit" className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 text-sm font-semibold text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.workspace.apply}</button>
      <Link href="/reports/accounts-payable" className="inline-flex h-10 items-center justify-center rounded-md border border-outline-variant px-4 text-sm text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.workspace.clear}</Link>
    </div>
  </form>;
}
