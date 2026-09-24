import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildEventEconomicsViewHref, EVENT_ECONOMICS_VIEW_COLUMNS, resolveEventEconomicsView } from "./presentation.ts";
import { getReportCenterDictionary } from "../i18n/dictionaries/report-center.ts";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

test("W9A1 AR outstanding column uses the report's business-facing label in both locales", () => {
  assert.equal(getReportCenterDictionary("en").ar.outstandingColumn, "Outstanding");
  assert.equal(getReportCenterDictionary("ar").ar.outstandingColumn, "الرصيد المستحق");
});

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
    assert.match(read(route), /<DataTable minWidth=(?:"\d+px"|\{eventViewMinWidth\(view\)\}) ariaLabel=\{/);
  }
});

test("W9A1 report workspaces demote back navigation and use compact, discoverable report context", () => {
  const workspace = read("src/app/(dashboard)/reports/ReportWorkspace.tsx");
  const dictionary = read("src/lib/i18n/dictionaries/report-center.ts");
  assert.match(workspace, /href="\/reports"/);
  assert.match(workspace, /About this report|dictionary\.workspace\.definition/);
  assert.doesNotMatch(workspace, /grid-cols-2[\s\S]*source/);
  assert.match(workspace, /dictionary\.workspace\.source/);
  assert.match(workspace, /dictionary\.workspace\.timeBasis/);
  assert.match(workspace, /dictionary\.workspace\.freshness/);
  assert.match(dictionary, /backToReports: "Back to Reports Center"/);
  assert.match(dictionary, /backToReports: "العودة إلى مركز التقارير"/);
  for (const route of [
    "src/app/(dashboard)/reports/accounts-receivable/page.tsx",
    "src/app/(dashboard)/reports/accounts-payable/page.tsx",
    "src/app/(dashboard)/reports/event-economics/page.tsx",
  ]) {
    assert.match(read(route), /grid min-w-0 grid-cols-1[\s\S]*?sm:grid-cols-2[\s\S]*?xl:grid-cols-12/);
  }
});

test("W9A1 report web tables keep focused AR/AP defaults and URL-addressable Event views", () => {
  const ar = read("src/app/(dashboard)/reports/accounts-receivable/page.tsx");
  const ap = read("src/app/(dashboard)/reports/accounts-payable/page.tsx");
  const event = read("src/app/(dashboard)/reports/event-economics/page.tsx");
  assert.match(ar, /dictionary\.ar\.ageing/);
  assert.match(ar, /minWidth="1160px" ariaLabel=\{dictionary\.ar\.invoice\}/);
  assert.match(ar, /dictionary\.ar\.net/);
  assert.doesNotMatch(ar, /key: "gross"|key: "credits"|key: "issue"/);
  assert.match(ar, /minWidth="420px" ariaLabel=\{dictionary\.ar\.customerRanking\}/);
  assert.match(ap, /minWidth="1240px" ariaLabel=\{dictionary\.ap\.bill\}/);
  assert.doesNotMatch(ap, /key: "invoiceDate"/);
  assert.match(event, /EVENT_ECONOMICS_VIEW_COLUMNS\[view\]/);
  assert.match(event, /aria-current=\{selected \? "page"/);
  assert.match(event, /name="view" value=\{values\.view/);
  assert.match(event, /aria-label=\{dictionary\.event\.noFinalForOpen\} title=\{dictionary\.event\.noFinalForOpen\}[^>]*>—<\/span>/);
  assert.doesNotMatch(event, /<span[^>]*>\{dictionary\.event\.noFinalForOpen\}<\/span>/);
  assert.deepEqual(EVENT_ECONOMICS_VIEW_COLUMNS.overview, ["service", "customer", "budget", "actual", "eac", "forecast", "completeness", "close"]);
  assert.deepEqual(EVENT_ECONOMICS_VIEW_COLUMNS.cost, ["service", "budget", "commitment", "actual", "paid", "outstanding", "etc", "eac"]);
  assert.deepEqual(EVENT_ECONOMICS_VIEW_COLUMNS.commercial, ["service", "customer", "commercialValue", "forecast", "close", "finalActual", "finalMargin"]);
  assert.equal(new Set([...EVENT_ECONOMICS_VIEW_COLUMNS.overview, ...EVENT_ECONOMICS_VIEW_COLUMNS.cost, ...EVENT_ECONOMICS_VIEW_COLUMNS.commercial]).size, 15);
  assert.equal(resolveEventEconomicsView("cost"), "cost");
  assert.equal(resolveEventEconomicsView("commercial"), "commercial");
  assert.equal(resolveEventEconomicsView("invalid"), "overview");
  assert.equal(buildEventEconomicsViewHref("cost", { asOf: "2026-09-24", search: "Riyadh", completeness: "PARTIAL", closeState: "open" }), "/reports/event-economics?view=cost&asOf=2026-09-24&search=Riyadh&completeness=PARTIAL&closeState=open");
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
