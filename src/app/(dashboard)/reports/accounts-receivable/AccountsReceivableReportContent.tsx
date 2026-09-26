import Link from "next/link";
import { UiBidiText, UiLtrText, UiMoneyText, UiNumberText } from "@/components/i18n/UiValueText";
import { UiDateText } from "@/components/i18n/UiDateText";
import DataTable from "@/components/ui/DataTable";
import { resolveRecordTitle } from "@/lib/i18n/record-title";
import type { ReportCenterDictionary } from "@/lib/i18n/dictionaries/report-center";
import type { Locale } from "@/lib/i18n/locales";
import type { ReportAccountsReceivable } from "@/lib/reports/types";
import { getReportTotalPages } from "@/lib/reports/pagination";
import ReportPagination from "../ReportPagination";

type Props = {
  report: ReportAccountsReceivable;
  locale: Locale;
  dictionary: ReportCenterDictionary;
  page: number;
  queryValues: Record<string, string | undefined>;
};

export function getReceivablesPresentation(
  locale: Locale,
  dictionary: ReportCenterDictionary,
  asOfDate?: string | null,
) {
  return {
    description: dictionary.ar.presentationDescription,
    detailsLabel: dictionary.ar.reportDetails,
    contextSummary: (
      <span className="inline-flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
        {asOfDate ? (
          <>
            <span>{dictionary.workspace.asOf} <UiDateText locale={locale} value={asOfDate} /></span>
            <span aria-hidden="true">·</span>
          </>
        ) : null}
        <span>{dictionary.ar.historicalLabel}</span>
        <span aria-hidden="true">·</span>
        <span>{dictionary.workspace.timezone}</span>
      </span>
    ),
  };
}

export default function AccountsReceivableReportContent({
  report,
  locale,
  dictionary,
  page,
  queryValues,
}: Props) {
  const ageingMetrics = [
    { label: dictionary.ar.notDue, value: report.notDueAmount },
    { label: dictionary.ar.oneToThirty, value: report.ageing1To30Amount },
    { label: dictionary.ar.thirtyOneToSixty, value: report.ageing31To60Amount },
    { label: dictionary.ar.sixtyOneToNinety, value: report.ageing61To90Amount },
    { label: dictionary.ar.ninetyOnePlus, value: report.ageing91PlusAmount },
  ];
  const highestOutstanding = Math.max(0, ...report.outstandingCustomers.map((customer) => customer.amount));

  return (
    <div className="min-w-0 space-y-4">
      <dl className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-surface-variant bg-surface-variant sm:grid-cols-4">
        <SummaryMetric label={dictionary.ar.billed} value={report.billedAmount} locale={locale} />
        <SummaryMetric label={dictionary.ar.collectedCash} value={report.collectedCashAmount} locale={locale} />
        <SummaryMetric label={dictionary.ar.outstanding} value={report.totalOutstanding} locale={locale} featured />
        <SummaryMetric label={dictionary.ar.overdue} value={report.totalOverdue} locale={locale} subdued={report.totalOverdue === 0} />
      </dl>

      <section className="min-w-0" aria-label={dictionary.ar.ageing}>
        <h2 className="mb-2 text-sm font-semibold text-on-surface">{dictionary.ar.ageing}</h2>
        <dl className="grid min-w-0 grid-cols-2 gap-px overflow-hidden rounded-xl border border-surface-variant bg-surface-variant sm:grid-cols-5">
          {ageingMetrics.map((metric) => (
            <div key={metric.label} className="min-w-0 bg-surface-container-lowest p-3">
              <dt className="text-xs leading-5 text-on-surface-variant">{metric.label}</dt>
              <dd className="mt-1 text-sm font-semibold leading-6 tabular-nums text-on-surface sm:text-base">
                <UiMoneyText locale={locale} value={metric.value} />
              </dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="ar-invoice-detail">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-surface-variant px-4 py-3">
          <h2 id="ar-invoice-detail" className="text-base font-semibold text-primary">{dictionary.ar.invoicesHeading}</h2>
          <span className="inline-flex items-center gap-1 text-sm text-on-surface-variant">
            <UiNumberText locale={locale} value={report.detailTotalCount} />
            {" "}
            {report.detailTotalCount === 1 ? dictionary.ar.invoiceCountSingular : dictionary.ar.invoiceCountPlural}
          </span>
        </div>
        {report.rows.length > 0 ? (
          <DataTable minWidth="100%" ariaLabel={dictionary.ar.invoicesHeading} columns={[
            { key: "invoice", header: dictionary.ar.invoice, kind: "identifier", align: "start", minWidth: 126, noWrap: true },
            { key: "customer", header: dictionary.ar.customer, kind: "text", align: "start", minWidth: 200 },
            { key: "service", header: dictionary.ar.service, kind: "text", align: "start", minWidth: 250 },
            { key: "due", header: dictionary.ar.dueDate, kind: "date", align: "start", minWidth: 120, noWrap: true },
            { key: "net", header: dictionary.ar.net, kind: "money", align: "end", minWidth: 128, noWrap: true },
            { key: "settled", header: dictionary.ar.settled, kind: "money", align: "end", minWidth: 128, noWrap: true },
            { key: "outstanding", header: dictionary.ar.outstandingColumn, kind: "money", align: "end", minWidth: 128, noWrap: true },
          ]}>
            {report.rows.map((row) => (
              <tr key={row.invoiceId}>
                <td className="align-middle px-3 py-2.5" style={{ width: "13%" }}>
                  <Link className="font-medium text-primary hover:underline" href={`/invoices/${row.invoiceId}`}>
                    <UiLtrText>{row.invoiceNumber}</UiLtrText>
                  </Link>
                </td>
                <td className="align-middle px-3 py-2.5" style={{ width: "19%" }}>
                  {row.customerName ? (
                    <Link href={`/customers/${row.customerId}`} className="min-w-0 break-words hover:underline">
                      <UiBidiText>{resolveRecordTitle(locale, row.customerName)}</UiBidiText>
                    </Link>
                  ) : <span className="text-on-surface-variant">{dictionary.ar.noCustomerIdentity}</span>}
                </td>
                <td className="align-middle py-2.5 ps-4 pe-5" style={{ width: "28%" }}>
                  {row.serviceTitle && row.serviceId ? (
                    <Link href={`/services/${row.serviceId}`} className="flex min-w-0 w-full flex-col items-stretch gap-1 text-start hover:underline">
                      <span className="line-clamp-2 w-full min-w-0 break-words text-start font-medium leading-5">
                        <UiBidiText>{resolveRecordTitle(locale, row.serviceTitle)}</UiBidiText>
                      </span>
                      {row.serviceNumber ? (
                        <span className="block w-full text-start text-xs leading-4 text-on-surface-variant">
                          <UiLtrText className="whitespace-nowrap">{row.serviceNumber}</UiLtrText>
                        </span>
                      ) : null}
                    </Link>
                  ) : <span className="text-on-surface-variant">{dictionary.ar.noServiceIdentity}</span>}
                </td>
                <td className="align-middle py-2.5 ps-4 pe-3" style={{ width: "10%" }}>
                  <UiDateText locale={locale} value={row.dueDate} />
                </td>
                <td className="align-middle px-3 py-2.5" style={{ width: "10%" }}>
                  <UiMoneyText locale={locale} value={row.netReceivableAmount} />
                </td>
                <td className="align-middle px-3 py-2.5" style={{ width: "10%" }}>
                  <UiMoneyText locale={locale} value={row.settledAmount} />
                </td>
                <td className="align-middle px-3 py-2.5" style={{ width: "10%" }}>
                  <UiMoneyText locale={locale} value={row.outstandingAmount} />
                </td>
              </tr>
            ))}
          </DataTable>
        ) : <p className="px-4 py-8 text-sm text-on-surface-variant">{dictionary.workspace.noRows}</p>}
        <ReportPagination pathname="/reports/accounts-receivable" query={queryValues} page={report.detailTotalCount === 0 ? 1 : page} totalPages={getReportTotalPages(report.detailTotalCount)} dictionary={dictionary} />
      </section>

      {report.outstandingCustomers.length > 0 ? (
        <section className="min-w-0 overflow-hidden rounded-xl border border-surface-variant bg-surface-container-lowest" aria-labelledby="ar-customer-ranking">
          <h2 id="ar-customer-ranking" className="border-b border-surface-variant px-4 py-3 text-base font-semibold text-primary">{dictionary.ar.customerRanking}</h2>
          <ol className="divide-y divide-surface-variant px-4">
            {report.outstandingCustomers.map((customer) => {
              const share = highestOutstanding > 0
                ? Math.min(100, Math.max(0, (customer.amount / highestOutstanding) * 100))
                : 0;

              return (
                <li key={customer.customerId} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 py-3">
                  <Link href={`/customers/${customer.customerId}`} className="min-w-0 break-words font-medium text-on-surface hover:underline">
                    <UiBidiText>{customer.company ? resolveRecordTitle(locale, customer.company) : dictionary.ar.noCustomerIdentity}</UiBidiText>
                  </Link>
                  <span className="justify-self-end font-semibold tabular-nums text-on-surface">
                    <span className="sr-only">{dictionary.ar.outstandingColumn}: </span>
                    <UiMoneyText locale={locale} value={customer.amount} />
                  </span>
                  <span className="col-span-2 flex h-2 overflow-hidden rounded-full bg-surface-variant" aria-hidden="true">
                    <span className="h-full rounded-full bg-primary" style={{ width: `${share}%` }} />
                  </span>
                </li>
              );
            })}
          </ol>
        </section>
      ) : null}
    </div>
  );
}

function SummaryMetric({
  label,
  value,
  locale,
  featured = false,
  subdued = false,
}: {
  label: string;
  value: number;
  locale: Locale;
  featured?: boolean;
  subdued?: boolean;
}) {
  return (
    <div className={`min-w-0 bg-surface-container-lowest p-3 sm:p-4 ${featured ? "bg-primary/5" : ""}`}>
      <dt className={featured ? "text-sm font-semibold text-primary" : "text-sm text-on-surface-variant"}>{label}</dt>
      <dd className={`mt-1 whitespace-nowrap tabular-nums ${featured ? "text-2xl font-semibold leading-8 text-primary" : "text-xl font-semibold leading-7 text-on-surface"} ${subdued ? "text-on-surface-variant" : ""}`}>
        <UiMoneyText locale={locale} value={value} />
      </dd>
    </div>
  );
}
