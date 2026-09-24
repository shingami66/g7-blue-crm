import type { ReportCenterDictionary } from "../i18n/dictionaries/report-center.ts";
import type {
  ExcelColumn,
  ExcelSummaryColumn,
  ExcelSummaryTable,
} from "./exportExcel.ts";
import type {
  ReportAccountsPayableRow,
  ReportEventEconomicsRow,
  ReportReceivableRow,
} from "./types.ts";

type Dictionary = ReportCenterDictionary;

function customerIdentity(number: string | null, name: string | null, fallback: string): string {
  if (number && name) return `${number} · ${name}`;
  return name ?? number ?? fallback;
}

function serviceIdentity(number: string | null, title: string | null, fallback: string): string {
  return number && title ? `${number} · ${title}` : fallback;
}

function ageingLabel(bucket: ReportReceivableRow["ageingBucket"], dictionary: Dictionary): string {
  switch (bucket) {
    case "not_due": return dictionary.ar.notDue;
    case "1_30": return dictionary.ar.oneToThirty;
    case "31_60": return dictionary.ar.thirtyOneToSixty;
    case "61_90": return dictionary.ar.sixtyOneToNinety;
    case "91_plus": return dictionary.ar.ninetyOnePlus;
  }
}

export function getAccountsReceivableExportColumns(
  dictionary: Dictionary,
): ExcelColumn<ReportReceivableRow>[] {
  return [
    { header: dictionary.ar.invoice, key: "invoiceNumber", format: "text", width: 20 },
    { header: dictionary.ar.customer, key: "customerName", format: "text", width: 32, value: (row) => customerIdentity(row.customerNumber, row.customerName, dictionary.ar.noCustomerIdentity) },
    { header: dictionary.data.serviceNumber, key: "serviceNumber", format: "text", width: 18, value: (row) => row.serviceNumber ?? "" },
    { header: dictionary.data.serviceTitle, key: "serviceTitle", format: "text", width: 34, value: (row) => row.serviceTitle ?? dictionary.ar.noServiceIdentity },
    { header: dictionary.ar.issueDate, key: "issueDate", format: "date", width: 14 },
    { header: dictionary.ar.dueDate, key: "dueDate", format: "date", width: 14 },
    { header: dictionary.ar.gross, key: "grossAmount", format: "currency", width: 18 },
    { header: dictionary.data.creditAdjustment, key: "creditAdjustmentAmount", format: "currency", width: 20 },
    { header: dictionary.data.creditApplication, key: "creditApplicationAmount", format: "currency", width: 20 },
    { header: dictionary.ar.net, key: "netReceivableAmount", format: "currency", width: 18 },
    { header: dictionary.ar.settled, key: "settledAmount", format: "currency", width: 18 },
    { header: dictionary.ar.outstandingColumn, key: "outstandingAmount", format: "currency", width: 18 },
    { header: dictionary.data.daysPastDue, key: "daysPastDue", format: "number", width: 16 },
    { header: dictionary.data.ageingBand, key: "ageingBucket", format: "text", width: 18, value: (row) => ageingLabel(row.ageingBucket, dictionary) },
  ];
}

export function getAccountsPayableExportColumns(
  dictionary: Dictionary,
): ExcelColumn<ReportAccountsPayableRow>[] {
  return [
    { header: dictionary.ap.bill, key: "billNumber", format: "text", width: 20 },
    { header: dictionary.ap.supplier, key: "supplierName", format: "text", width: 32, value: (row) => customerIdentity(null, row.supplierName, dictionary.ap.noSupplierIdentity) },
    { header: dictionary.data.serviceNumber, key: "serviceNumber", format: "text", width: 18, value: (row) => row.serviceNumber ?? "" },
    { header: dictionary.data.serviceTitle, key: "serviceTitle", format: "text", width: 34, value: (row) => row.serviceTitle ?? dictionary.ap.noServiceIdentity },
    { header: dictionary.ap.invoiceDate, key: "invoiceDate", format: "date", width: 14 },
    { header: dictionary.ap.dueDate, key: "dueDate", format: "date", width: 14 },
    { header: dictionary.ap.status, key: "status", format: "text", width: 18, value: (row) => row.status === "paid" ? dictionary.ap.paidStatus : row.status === "partially_paid" ? dictionary.ap.partiallyPaid : dictionary.ap.unpaid },
    { header: dictionary.data.currency, key: "currency", format: "text", width: 12 },
    { header: dictionary.ap.payable, key: "payableAmount", format: "currency", width: 18 },
    { header: dictionary.ap.paid, key: "paidAmount", format: "currency", width: 18 },
    { header: dictionary.ap.outstanding, key: "outstandingAmount", format: "currency", width: 18 },
    { header: dictionary.data.advanceAllocated, key: "advanceAllocatedAmount", format: "currency", width: 20 },
  ];
}

export function getEventEconomicsExportColumns(
  dictionary: Dictionary,
): ExcelColumn<ReportEventEconomicsRow>[] {
  return [
    { header: dictionary.event.eventService, key: "serviceNumber", format: "text", width: 34, value: (row) => serviceIdentity(row.serviceNumber, row.serviceTitle, row.serviceNumber) },
    { header: dictionary.ar.customer, key: "customerName", format: "text", width: 32, value: (row) => customerIdentity(row.customerNumber, row.customerName, dictionary.event.noCustomerIdentity) },
    { header: dictionary.event.approvedBudget, key: "approvedBudgetCost", format: "currency", width: 19 },
    { header: dictionary.event.commitment, key: "openCommitment", format: "currency", width: 19 },
    { header: dictionary.event.actual, key: "actualCost", format: "currency", width: 19 },
    { header: dictionary.event.paid, key: "paidCost", format: "currency", width: 19 },
    { header: dictionary.event.outstanding, key: "outstandingCost", format: "currency", width: 20 },
    { header: dictionary.event.etc, key: "etc", format: "currency", width: 19 },
    { header: dictionary.event.eac, key: "eac", format: "currency", width: 19 },
    { header: dictionary.event.commercialValue, key: "netApprovedCommercialValue", format: "currency", width: 22 },
    { header: dictionary.event.forecastMargin, key: "forecastMargin", format: "currency", width: 20 },
    { header: dictionary.event.completeness, key: "completenessStatus", format: "text", width: 20, value: (row) => row.completenessStatus === "COMPLETE" ? dictionary.event.complete : row.completenessStatus === "PARTIAL" ? dictionary.event.partial : dictionary.event.unavailable },
    { header: dictionary.event.closeState, key: "closeState", format: "text", width: 16, value: (row) => row.closeState === "closed" ? dictionary.event.closed : dictionary.event.open },
    { header: dictionary.event.finalActual, key: "finalActualCost", format: "currency", width: 20, value: (row) => row.closeState === "closed" ? row.finalActualCost : null },
    { header: dictionary.event.finalMargin, key: "finalManagerialMargin", format: "currency", width: 22, value: (row) => row.closeState === "closed" ? row.finalManagerialMargin : null },
    { header: dictionary.data.closeVersion, key: "closeVersion", format: "number", width: 16 },
    { header: dictionary.data.closeEffectiveDate, key: "closeEffectiveDate", format: "date", width: 20 },
    { header: dictionary.data.closedAt, key: "closedAt", format: "datetime", width: 20 },
  ];
}

export function getEventEconomicsOverviewSummary(
  rows: readonly ReportEventEconomicsRow[],
  dictionary: Dictionary,
): ExcelSummaryTable {
  const columns: ExcelSummaryColumn[] = [
    { header: dictionary.event.eventService, format: "text", width: 34 },
    { header: dictionary.ar.customer, format: "text", width: 32 },
    { header: dictionary.event.approvedBudget, format: "currency", width: 19 },
    { header: dictionary.event.actual, format: "currency", width: 19 },
    { header: dictionary.event.eac, format: "currency", width: 19 },
    { header: dictionary.event.forecastMargin, format: "currency", width: 20 },
    { header: dictionary.event.completeness, format: "text", width: 20 },
    { header: dictionary.event.closeState, format: "text", width: 16 },
  ];
  const tableRows = rows.map((row) => [
    serviceIdentity(row.serviceNumber, row.serviceTitle, row.serviceNumber),
    customerIdentity(row.customerNumber, row.customerName, dictionary.event.noCustomerIdentity),
    row.approvedBudgetCost,
    row.actualCost,
    row.eac,
    row.forecastMargin,
    row.completenessStatus === "COMPLETE" ? dictionary.event.complete : row.completenessStatus === "PARTIAL" ? dictionary.event.partial : dictionary.event.unavailable,
    row.closeState === "closed" ? dictionary.event.closed : dictionary.event.open,
  ]);
  return { title: dictionary.event.title, columns, rows: tableRows };
}
