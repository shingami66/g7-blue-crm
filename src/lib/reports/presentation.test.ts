import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

test("W9A1 Reports Center is a report catalog, not a dashboard composition", () => {
  const page = read("src/app/(dashboard)/reports/page.tsx");
  const catalog = read("src/lib/reports/catalog.ts");
  assert.match(page, /data-reports-center="catalog"/);
  assert.match(catalog, /accounts_receivable/);
  assert.match(catalog, /accounts_payable/);
  assert.match(catalog, /event_economics/);
  assert.doesNotMatch(page, /getReportsCenterData|BillingReport|OperationsReport/);
  for (const route of [
    "src/app/(dashboard)/reports/accounts-receivable/page.tsx",
    "src/app/(dashboard)/reports/accounts-payable/page.tsx",
    "src/app/(dashboard)/reports/event-economics/page.tsx",
  ]) {
    assert.match(read(route), /ReportWorkspace/);
    assert.match(read(route), /DataTable/);
  }
});

test("W9A1 event report preserves English copy and rejects invalid as-of input", () => {
  const dictionary = read("src/lib/i18n/dictionaries/report-center.ts");
  const eventPage = read("src/app/(dashboard)/reports/event-economics/page.tsx");
  const reporting = read("src/lib/reports/reporting.ts");
  assert.match(dictionary, /title: "Accounts Payable"/);
  assert.match(dictionary, /title: "Event economics"/);
  assert.match(eventPage, /dictionary\.event\.completeness/);
  assert.match(reporting, /status: "invalid", error: "invalid_as_of"/);
});

test("W7D primary AR rows use a stable table and accessible contextual details panel", () => {
  const page = read("src/app/(dashboard)/reports/ReceivablesReport.tsx");
  const receivables = page;

  assert.match(receivables, /dictionary\.tables\.invoice/);
  assert.match(receivables, /dictionary\.tables\.customer/);
  assert.match(receivables, /dictionary\.tables\.dueDate/);
  assert.match(receivables, /dictionary\.metrics\.outstandingReceivable/);
  assert.match(receivables, /dictionary\.tables\.dueStatus/);
  assert.match(receivables, /dictionary\.tables\.details/);
  assert.doesNotMatch(receivables, /<details/);
  assert.match(receivables, /aria-expanded=\{selected\}/);
  assert.match(receivables, /aria-controls=\{DETAILS_PANEL_ID\}/);
  assert.match(receivables, /role="dialog"/);
  assert.match(receivables, /key === "Escape"/);
  assert.match(receivables, /requestAnimationFrame/);
  assert.match(receivables, /openerRef/);
  assert.match(receivables, /event\.currentTarget/);
  assert.match(receivables, /hidden=\{!row\}/);
  assert.match(receivables, /invoiceNumber/);
  for (const field of ["invoiceNumber", "service", "issueDate", "gross", "creditAdjustments", "netReceivable", "settled"]) {
    assert.match(receivables, new RegExp(`dictionary\\.tables\\.${field}`));
  }
  assert.match(receivables, /md:hidden/);
  assert.match(receivables, /overflow-x-auto/);
  assert.match(receivables, /<bdi dir="ltr">/);
  assert.match(receivables, /className="max-w-full break-words" dir="auto"/);
  assert.match(receivables, /className="flex min-w-0 flex-col/);
});

test("W7D Reports dictionary keeps presentation labels available in English and Arabic", () => {
  const dictionary = read("src/lib/i18n/dictionaries/reports.ts");

  for (const label of ["receivableSummary", "ageing", "outstandingReceivable", "dueStatus", "invoiceDetails", "notDueYet", "overdueBy", "reconciliationFormula"]) {
    assert.match(dictionary, new RegExp(`${label}:`));
  }
  assert.match(dictionary, /accountsReceivable: "مستحقات العملاء"/);
  assert.match(dictionary, /receivableSummary: "ملخص مستحقات العملاء"/);
  assert.match(dictionary, /ageing: "أعمار الديون"/);
  assert.match(dictionary, /overdue: "متأخر عن السداد"/);
  assert.match(dictionary, /notDue: "غير مستحق بعد"/);
  assert.match(dictionary, /netReceivable: "صافي المستحق"/);
  assert.doesNotMatch(dictionary, /الذمم المدينة|أعمار الذمم|صافي الذمم/);
  assert.match(dictionary, /hints: \{ ageing: "توزيع المبالغ المستحقة حسب مدة التأخر عن تاريخ الاستحقاق\." \}/);
});
