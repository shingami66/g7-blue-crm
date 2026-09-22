"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode, RefObject } from "react";
import PendingLink from "@/components/ui/PendingLink";
import { UiDateText } from "@/components/i18n/UiDateText";
import { formatSarAmount, formatUiNumber } from "@/lib/i18n/formatting";
import type { ReportsDictionary } from "@/lib/i18n/dictionaries/reports";
import type { ReportAccountsReceivable, ReportReceivableRow, ReportsSection } from "@/lib/reports/types";

type ReceivablesReportProps = {
  report: ReportsSection<ReportAccountsReceivable>;
  dictionary: ReportsDictionary;
  locale: "en" | "ar";
};

const DETAILS_PANEL_ID = "accounts-receivable-details-panel";

export default function ReceivablesReport({ report, dictionary, locale }: ReceivablesReportProps) {
  const [selectedRow, setSelectedRow] = useState<ReportReceivableRow | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLButtonElement | null>(null);

  const openDetails = (row: ReportReceivableRow, opener: HTMLButtonElement) => {
    openerRef.current = opener;
    setSelectedRow(row);
  };
  const closeDetails = useCallback(() => {
    const opener = openerRef.current;
    setSelectedRow(null);
    window.requestAnimationFrame(() => opener?.focus());
  }, []);

  useEffect(() => {
    if (!selectedRow) return;
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeDetails();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDetails, selectedRow]);

  if (report.status !== "ready") {
    return <ReportSection title={dictionary.sections.accountsReceivable} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error} />;
  }

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

  return (
    <ReportSection title={dictionary.sections.accountsReceivable} status={report.status} unavailable={dictionary.states.forbidden} error={dictionary.states.error}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-on-surface-variant" dir="auto">
        <span><span className="font-semibold text-primary">{dictionary.filters.asOf}:</span> <UiDateText locale={locale} value={report.data.asOfDate} /></span>
        <span>{formatUiNumber(locale, report.data.detailTotalCount)} {dictionary.tables.invoice.toLocaleLowerCase(locale === "ar" ? "ar-SA" : "en-SA")}</span>
      </div>
      <div className="space-y-5">
        <div>
          <h3 className="mb-2 text-[13px] font-semibold text-primary">{dictionary.sections.receivableSummary}</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">{summaryMetrics.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div>
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-primary">{dictionary.sections.ageing}</h3>
          <p className="mt-1 text-[12px] text-on-surface-variant">{dictionary.hints.ageing}</p>
          <div className="mt-2 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">{ageingMetrics.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div>
        </div>
      </div>
      {report.data.rows.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-outline-variant px-3 py-5 text-center text-[13px] text-on-surface-variant">{dictionary.states.empty}</p> : <>
        <div className="mt-5 hidden overflow-x-auto rounded-lg border border-outline-variant md:block">
          <table className="w-full min-w-[760px] text-[13px]"><caption className="sr-only">{dictionary.sections.accountsReceivable}</caption>
            <thead><tr className="border-b border-surface-variant text-start text-[11px] uppercase text-on-surface-variant">
              <th className="px-3 py-2 text-start">{dictionary.tables.invoice}</th><th className="px-3 py-2 text-start">{dictionary.tables.customer}</th><th className="px-3 py-2 text-start">{dictionary.tables.dueDate}</th><th className="px-3 py-2 text-end">{dictionary.metrics.outstandingReceivable}</th><th className="px-3 py-2 text-start">{dictionary.tables.dueStatus}</th><th className="px-3 py-2 text-start">{dictionary.tables.details}</th>
            </tr></thead>
            <tbody>{report.data.rows.map((row) => <ReceivableTableRow key={row.invoiceId} row={row} dictionary={dictionary} locale={locale} selected={selectedRow?.invoiceId === row.invoiceId} onDetails={(opener) => openDetails(row, opener)} />)}</tbody>
          </table>
        </div>
        <div className="mt-5 space-y-3 md:hidden">
          {report.data.rows.map((row) => <article key={row.invoiceId} className={`rounded-lg border border-outline-variant bg-surface p-3 ${selectedRow?.invoiceId === row.invoiceId ? "ring-2 ring-primary/30" : ""}`}>
            <div className="flex flex-wrap items-start justify-between gap-2"><InvoiceLink row={row} /><Money locale={locale} value={row.outstandingAmount} className="font-semibold" /></div>
            <dl className="mt-3 grid grid-cols-2 gap-3 text-[12px]"><div><dt className="text-on-surface-variant">{dictionary.tables.customer}</dt><dd className="mt-1 break-words text-on-surface"><CustomerIdentity row={row} dictionary={dictionary} /></dd></div><div><dt className="text-on-surface-variant">{dictionary.tables.dueDate}</dt><dd className="mt-1 text-on-surface"><UiDateText locale={locale} value={row.dueDate} /></dd></div><div className="col-span-2"><dt className="text-on-surface-variant">{dictionary.tables.dueStatus}</dt><dd className="mt-1 text-on-surface"><DueStatus row={row} dictionary={dictionary} locale={locale} /></dd></div></dl>
            <DetailsButton row={row} dictionary={dictionary} selected={selectedRow?.invoiceId === row.invoiceId} onDetails={(opener) => openDetails(row, opener)} />
          </article>)}
        </div>
      </>}
      <ReceivableDetailsPanel closeButtonRef={closeButtonRef} row={selectedRow} dictionary={dictionary} locale={locale} onClose={closeDetails} />
    </ReportSection>
  );
}

function ReceivableTableRow({ row, dictionary, locale, selected, onDetails }: { row: ReportReceivableRow; dictionary: ReportsDictionary; locale: "en" | "ar"; selected: boolean; onDetails: (opener: HTMLButtonElement) => void }) {
  return <tr className={`border-b border-surface-variant align-top last:border-b-0 ${selected ? "bg-primary/5" : ""}`} aria-current={selected ? "true" : undefined}>
    <td className="px-3 py-3"><InvoiceLink row={row} /></td>
    <td className="px-3 py-3"><CustomerIdentity row={row} dictionary={dictionary} /></td>
    <td className="whitespace-nowrap px-3 py-3"><UiDateText locale={locale} value={row.dueDate} /></td>
    <td className="px-3 py-3 text-end tabular-nums" dir="ltr"><Money locale={locale} value={row.outstandingAmount} className="font-semibold" /></td>
    <td className="px-3 py-3"><DueStatus row={row} dictionary={dictionary} locale={locale} /></td>
    <td className="px-3 py-3"><DetailsButton row={row} dictionary={dictionary} selected={selected} onDetails={onDetails} /></td>
  </tr>;
}

function InvoiceLink({ row }: { row: ReportReceivableRow }) {
  return <PendingLink href={`/invoices/${row.invoiceId}`} className="text-primary hover:underline"><bdi dir="ltr">{row.invoiceNumber}</bdi></PendingLink>;
}

function CustomerIdentity({ row, dictionary }: { row: ReportReceivableRow; dictionary: ReportsDictionary }) {
  if (!row.customerName) return <span className="text-on-surface-variant">{dictionary.tables.identityUnavailable}</span>;
  return <PendingLink href={`/customers/${row.customerId}`} className="flex min-w-0 flex-col items-start text-primary hover:underline"><span className="max-w-full break-words" dir="auto">{row.customerName}</span>{row.customerNumber ? <bdi className="text-[11px] text-on-surface-variant" dir="ltr">{row.customerNumber}</bdi> : null}</PendingLink>;
}

function DetailsButton({ row, dictionary, selected, onDetails }: { row: ReportReceivableRow; dictionary: ReportsDictionary; selected: boolean; onDetails: (opener: HTMLButtonElement) => void }) {
  return <button type="button" aria-controls={DETAILS_PANEL_ID} aria-expanded={selected} aria-label={`${dictionary.tables.details}: ${row.invoiceNumber}`} onClick={(event) => onDetails(event.currentTarget)} className="inline-flex min-h-9 items-center rounded-lg border border-outline-variant px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.tables.details}</button>;
}

function DueStatus({ row, dictionary, locale }: { row: ReportReceivableRow; dictionary: ReportsDictionary; locale: "en" | "ar" }) {
  const overdue = row.daysPastDue > 0;
  return <span className="flex flex-col gap-0.5" dir="auto"><span className="font-semibold">{overdue ? <>{dictionary.tables.overdueBy} <bdi dir="ltr">{formatUiNumber(locale, row.daysPastDue)}</bdi> {dictionary.tables.days}</> : dictionary.tables.notDueYet}</span>{overdue ? <span className="text-[11px] text-on-surface-variant">{getAgeingLabel(dictionary, row.ageingBucket)}</span> : null}</span>;
}

function Money({ locale, value, className }: { locale: "en" | "ar"; value: number; className?: string }) {
  return <bdi dir="ltr" className={`tabular-nums ${className ?? ""}`}>{formatSarAmount(locale, value)}</bdi>;
}

const ReceivableDetailsPanel = ({ row, dictionary, locale, onClose, closeButtonRef }: { row: ReportReceivableRow | null; dictionary: ReportsDictionary; locale: "en" | "ar"; onClose: () => void; closeButtonRef: RefObject<HTMLButtonElement | null> }) => {
  return <aside id={DETAILS_PANEL_ID} hidden={!row} aria-hidden={!row} role="dialog" aria-modal="false" aria-labelledby="accounts-receivable-details-title" className="fixed inset-y-0 start-auto end-0 z-40 w-full max-w-none overflow-y-auto border-surface-variant bg-surface-container-lowest p-5 shadow-2xl md:max-w-md md:border" dir={locale === "ar" ? "rtl" : "ltr"}>
    <div className="flex items-start justify-between gap-4 border-b border-surface-variant pb-4"><div><h3 id="accounts-receivable-details-title" className="text-[18px] font-semibold text-primary">{dictionary.tables.invoiceDetails}</h3>{row ? <p className="mt-1 text-[12px] text-on-surface-variant"><bdi dir="ltr">{row.invoiceNumber}</bdi></p> : null}</div>{row ? <button ref={closeButtonRef} type="button" onClick={onClose} className="inline-flex min-h-9 items-center rounded-lg border border-outline-variant px-3 py-1.5 text-[12px] font-semibold text-primary hover:bg-surface-container-low focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40">{dictionary.tables.close}</button> : null}</div>
    {row ? <div className="mt-5 space-y-5">
      <dl className="grid grid-cols-1 gap-4 text-[13px] sm:grid-cols-2">
        <PanelField label={dictionary.tables.invoiceNumber}><bdi dir="ltr">{row.invoiceNumber}</bdi></PanelField>
        <PanelField label={dictionary.tables.customer}><CustomerIdentity row={row} dictionary={dictionary} /></PanelField>
        <PanelField label={dictionary.tables.service}><ServiceIdentity row={row} /></PanelField>
        <PanelField label={dictionary.tables.issueDate}><UiDateText locale={locale} value={row.issueDate} /></PanelField>
        <PanelField label={dictionary.tables.dueDate}><UiDateText locale={locale} value={row.dueDate} /></PanelField>
        <PanelField label={dictionary.tables.dueStatus}><DueStatus row={row} dictionary={dictionary} locale={locale} /></PanelField>
      </dl>
      <div><h4 className="text-[13px] font-semibold text-primary">{dictionary.tables.reconciliation}</h4><div className="mt-2 rounded-lg border border-outline-variant bg-surface p-3"><ReconciliationLine label={dictionary.tables.gross} value={row.grossAmount} locale={locale} /><ReconciliationLine label={dictionary.tables.creditAdjustments} value={row.creditAdjustmentAmount} locale={locale} operator="−" /><ReconciliationLine label={dictionary.tables.netReceivable} value={row.netReceivableAmount} locale={locale} emphasized operator="=" /><ReconciliationLine label={dictionary.tables.settled} value={row.settledAmount} locale={locale} operator="−" /><ReconciliationLine label={dictionary.metrics.outstandingReceivable} value={row.outstandingAmount} locale={locale} emphasized operator="=" /></div><p className="mt-2 text-[12px] text-on-surface-variant" dir="ltr">{dictionary.tables.reconciliationFormula}</p></div>
    </div> : null}
  </aside>;
};

function PanelField({ label, children }: { label: string; children: ReactNode }) {
  return <div><dt className="text-on-surface-variant">{label}</dt><dd className="mt-1 break-words text-on-surface">{children}</dd></div>;
}

function ServiceIdentity({ row }: { row: ReportReceivableRow }) {
  if (!row.serviceId || !row.serviceNumber) return <span>—</span>;
  return <PendingLink href={`/services/${row.serviceId}`} className="flex min-w-0 flex-col items-start text-primary hover:underline"><bdi dir="ltr">{row.serviceNumber}</bdi>{row.serviceTitle ? <span className="max-w-full break-words" dir="auto">{row.serviceTitle}</span> : null}</PendingLink>;
}

function ReconciliationLine({ label, value, locale, operator, emphasized }: { label: string; value: number; locale: "en" | "ar"; operator?: string; emphasized?: boolean }) {
  return <div className={`flex items-center justify-between gap-3 py-2 ${emphasized ? "border-t border-outline-variant font-semibold text-primary" : ""}`}><span>{operator ? `${operator} ${label}` : label}</span><Money locale={locale} value={value} /></div>;
}

function getAgeingLabel(dictionary: ReportsDictionary, bucket: ReportReceivableRow["ageingBucket"]) {
  if (bucket === "not_due") return dictionary.metrics.notDue;
  if (bucket === "1_30") return dictionary.metrics.ageing1To30;
  if (bucket === "31_60") return dictionary.metrics.ageing31To60;
  if (bucket === "61_90") return dictionary.metrics.ageing61To90;
  return dictionary.metrics.ageing91Plus;
}

function ReportSection({ title, status, unavailable, error, children }: { title: string; status: "ready" | "forbidden" | "error"; unavailable: string; error: string; children?: ReactNode }) {
  return <section className="rounded-xl border border-surface-variant bg-surface-container-lowest p-5"><h2 className="mb-4 text-[18px] font-semibold text-primary">{title}</h2>{status === "forbidden" ? <p className="text-[14px] text-on-surface-variant">{unavailable}</p> : status === "error" ? <p className="text-[14px] text-error" role="alert">{error}</p> : children}</section>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return <div className="rounded-lg border border-outline-variant bg-surface p-3"><span className="block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant">{label}</span><span className="mt-2 block text-[16px] font-semibold text-primary tabular-nums" dir="ltr">{value}</span></div>;
}
