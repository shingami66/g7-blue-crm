import assert from "node:assert/strict";
import test from "node:test";
import { getReportCenterDictionary } from "../i18n/dictionaries/report-center.ts";
import {
  getAccountsPayableExportColumns,
  getAccountsReceivableExportColumns,
  getEventEconomicsExportColumns,
  getEventEconomicsOverviewSummary,
} from "./exportColumns.ts";
import type { ReportAccountsPayableRow, ReportEventEconomicsRow, ReportReceivableRow } from "./types.ts";

const eventRow: ReportEventEconomicsRow = {
  serviceId: "internal-service-uuid",
  serviceNumber: "SVC-2041",
  serviceTitle: "Riyadh Summit",
  customerId: "internal-customer-uuid",
  customerNumber: "CUS-2041",
  customerName: "Riyadh Company",
  approvedBudgetCost: null,
  openCommitment: null,
  actualCost: null,
  paidCost: null,
  outstandingCost: null,
  etc: null,
  eac: null,
  netApprovedCommercialValue: null,
  forecastMargin: null,
  completenessStatus: "PARTIAL",
  completenessReasonCodes: ["internal_reason_code"],
  closeState: "open",
  closeVersion: null,
  closeEffectiveDate: null,
  finalActualCost: 22,
  finalManagerialMargin: 22,
  closedAt: null,
};

test("Event Data columns keep unavailable money blank and suppress open-event final amounts", () => {
  const dictionary = getReportCenterDictionary("en");
  const columns = getEventEconomicsExportColumns(dictionary);
  const currencyColumns = columns.filter((column) => column.format === "currency");
  assert.equal(currencyColumns.length, 11);
  for (const column of currencyColumns) {
    const value = column.value ? column.value(eventRow) : eventRow[column.key as keyof ReportEventEconomicsRow];
    assert.equal(value, null, `${String(column.key)} should serialize as blank while unavailable/open`);
  }
  assert.equal(columns.some((column) => String(column.key).endsWith("Id")), false);
  assert.equal(columns.some((column) => column.header === "internal_reason_code"), false);
  assert.ok(columns.some((column) => column.key === "closeVersion"));
  assert.ok(columns.some((column) => column.key === "closedAt"));
});

test("Event export and overview expose localized user-facing statuses, not RPC enums", () => {
  const dictionary = getReportCenterDictionary("ar");
  const columns = getEventEconomicsExportColumns(dictionary);
  const completeness = columns.find((column) => column.key === "completenessStatus");
  const close = columns.find((column) => column.key === "closeState");
  assert.equal(completeness?.value?.(eventRow), dictionary.event.partial);
  assert.equal(close?.value?.(eventRow), dictionary.event.open);
  const summary = getEventEconomicsOverviewSummary([eventRow], dictionary);
  assert.equal(summary.rows.length, 1);
  assert.deepEqual(summary.rows[0], [
    "SVC-2041 · Riyadh Summit",
    "CUS-2041 · Riyadh Company",
    null,
    null,
    null,
    null,
    dictionary.event.partial,
    dictionary.event.open,
  ]);
  assert.doesNotMatch(JSON.stringify(summary), /PARTIAL|COMPLETE|UNAVAILABLE|open|closed/);
});

test("AR and AP exports retain full authorized detail fields without internal UUID identifiers", () => {
  const dictionary = getReportCenterDictionary("en");
  const arColumns = getAccountsReceivableExportColumns(dictionary);
  const apColumns = getAccountsPayableExportColumns(dictionary);
  const arKeys = arColumns.map((column) => column.key);
  const apKeys = apColumns.map((column) => column.key);
  assert.deepEqual(arKeys, [
    "invoiceNumber", "customerName", "serviceNumber", "serviceTitle", "issueDate", "dueDate",
    "grossAmount", "creditAdjustmentAmount", "creditApplicationAmount", "netReceivableAmount",
    "settledAmount", "outstandingAmount", "daysPastDue", "ageingBucket",
  ]);
  assert.deepEqual(apKeys, [
    "billNumber", "supplierName", "serviceNumber", "serviceTitle", "invoiceDate", "dueDate",
    "status", "currency", "payableAmount", "paidAmount", "outstandingAmount", "advanceAllocatedAmount",
  ]);
  assert.equal([...arKeys, ...apKeys].some((key) => String(key).endsWith("Id")), false);
  const apRow: ReportAccountsPayableRow = {
    billId: "internal-bill-uuid", billNumber: "BILL-2041", supplierId: "internal-supplier-uuid",
    supplierName: "Supplier A", serviceId: null, serviceNumber: null, serviceTitle: null,
    invoiceDate: "2026-09-01", dueDate: null, status: "partially_paid", currency: "SAR",
    payableAmount: 100, paidAmount: 40, outstandingAmount: 60, advanceAllocatedAmount: 2,
  };
  const status = apColumns.find((column) => column.key === "status");
  assert.equal(status?.value?.(apRow), dictionary.ap.partiallyPaid);
  const arRow: ReportReceivableRow = {
    invoiceId: "internal-invoice-uuid", invoiceNumber: "INV-2041", customerId: "internal-customer-uuid",
    customerNumber: "CUS-2041", customerName: "Customer A", serviceId: null, serviceNumber: null,
    serviceTitle: null, issueDate: "2026-09-01", dueDate: "2026-09-21", grossAmount: 100,
    creditAdjustmentAmount: 2, creditApplicationAmount: 3, netReceivableAmount: 95, settledAmount: 5,
    outstandingAmount: 90, daysPastDue: 0, ageingBucket: "not_due",
  };
  assert.equal(arColumns.find((column) => column.key === "ageingBucket")?.value?.(arRow), dictionary.ar.notDue);
});
