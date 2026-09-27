import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { composeDashboard } from "../dashboard/composition.ts";
import { getSharedUiStates } from "./dictionaries/common.ts";
import { getDashboardDictionary } from "./dictionaries/dashboard.ts";
import { getDashboardW9BDictionary } from "./dictionaries/dashboard-w9b.ts";
import { getReportCenterDictionary } from "./dictionaries/report-center.ts";
import { formatSarAmount, formatUiDate } from "./formatting.ts";

const ROOT = join(import.meta.dirname, "../../..");
const PAGE = readFileSync(join(ROOT, "src/app/(dashboard)/dashboard/page.tsx"), "utf8");
const ARABIC_MONTH = /يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر/;
const ARABIC_INDIC = /[٠-٩]/;

function nestedKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return prefix ? [prefix] : [];
  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    return nested && typeof nested === "object" && !Array.isArray(nested)
      ? nestedKeys(nested, path)
      : [path];
  });
}

test("Dashboard and W9B dictionaries have matching English/Arabic keys and localized headings", () => {
  const baseEn = getDashboardDictionary("en");
  const baseAr = getDashboardDictionary("ar");
  const en = getDashboardW9BDictionary("en");
  const ar = getDashboardW9BDictionary("ar");

  assert.deepEqual(nestedKeys(baseEn).sort(), nestedKeys(baseAr).sort());
  assert.deepEqual(nestedKeys(en).sort(), nestedKeys(ar).sort());
  assert.equal(baseEn.header.title, "Dashboard");
  assert.equal(baseAr.header.title, "لوحة التحكم");
  assert.equal(en.sections.actionCenter, "Action center");
  assert.equal(ar.sections.actionCenter, "مركز الإجراءات");
  assert.equal(en.widgets.accountsReceivable, "Customer receivables");
  assert.equal(ar.widgets.accountsReceivable, "ذمم العملاء المدينة");
  assert.equal(en.widgets.accountsPayable, "Supplier payables");
  assert.equal(en.widgets.eventEconomics, "Event costing status");
  assert.equal(ar.widgets.eventEconomics, "حالة تكاليف الفعاليات");
  assert.equal(getReportCenterDictionary("en").event.title, "Event Cost & Margin");
  assert.equal(getReportCenterDictionary("ar").event.title, "تكاليف وهوامش الفعاليات");
  assert.equal(en.sections.costingCompleteness, "Costing completeness");
  assert.equal(ar.sections.costingCompleteness, "اكتمال التكاليف");
  assert.equal(en.actions.currentBalancesOnly, "Current balances only; not a historical view.");
  assert.equal(ar.actions.currentBalancesOnly, "الأرصدة الحالية فقط؛ لا تمثل عرضًا تاريخيًا.");
  assert.equal(en.states.noActions, "No assigned actions in the available queues.");
  assert.equal(ar.states.noActions, "لا توجد إجراءات مسندة في قوائم العمل المتاحة.");
  assert.doesNotMatch(JSON.stringify(ar), /\b(revenue|profit)\b/i);
});

test("Access denial remains distinct from source unavailability and empty queues", () => {
  const sharedEn = getSharedUiStates("en");
  const sharedAr = getSharedUiStates("ar");
  const en = getDashboardW9BDictionary("en");
  const ar = getDashboardW9BDictionary("ar");

  assert.equal(sharedEn.accessDenied.title, "Access denied");
  assert.equal(sharedAr.accessDenied.title, "تم رفض الوصول");
  assert.notEqual(en.states.unavailable, en.states.noPendingQuotationApprovals);
  assert.notEqual(en.states.unavailable, en.states.noExpenseFinanceReviews);
  assert.notEqual(ar.states.unavailable, ar.states.noPendingQuotationApprovals);
  assert.notEqual(ar.states.unavailable, ar.states.noExpenseFinanceReviews);
  assert.match(PAGE, /requirePermission\("dashboard:read"\)/);
  assert.match(PAGE, /if \(error instanceof ForbiddenError\)/);
  assert.match(PAGE, /message=\{dictionary\.states\.accessDenied\}/);
  assert.doesNotMatch(PAGE, /unavailableForRole/);
});

test("Effective permission composition hides denied contributions and supports a custom permission set", () => {
  const viewer = composeDashboard(new Set(["customers:read", "quotations:read", "invoices:read"]));
  const custom = composeDashboard(new Set([
    "services:read",
    "supplier_costing:read",
    "quotations:read",
    "quotations:approve",
  ]));

  assert.deepEqual(viewer.widgets.map((item) => item.id), [
    "customers",
    "quotations",
    "accounts-receivable",
    "recent-quotations",
  ]);
  assert.deepEqual(viewer.actionGroups.map((item) => item.id), ["invoice-follow-up"]);
  assert.ok(!viewer.widgets.some((item) => item.id === "accounts-payable"));
  assert.ok(custom.widgets.some((item) => item.id === "event-economics"));
  assert.ok(custom.actionGroups.some((item) => item.id === "quotation-approval"));
  assert.ok(!custom.actionGroups.some((item) => item.id === "service-start"));
  assert.match(PAGE, /composeDashboard\(new Set\(resolved/);
  assert.match(PAGE, /if \(!included\) return null/);
});

test("Dashboard uses canonical report/read-model loaders and keeps source failures local", () => {
  assert.match(PAGE, /getDashboardReceivablesData/);
  assert.match(PAGE, /getDashboardPayablesData/);
  assert.match(PAGE, /getDashboardEventEconomicsData/);
  assert.match(PAGE, /getDashboardServiceLifecycleData/);
  assert.match(PAGE, /loadIfComposed\(hasWidget\("accounts-receivable"\)/);
  assert.match(PAGE, /loadIfComposed\(hasWidget\("accounts-payable"\)/);
  assert.match(PAGE, /loadIfComposed\(hasWidget\("event-economics"\)/);
  assert.match(PAGE, /return \{ status: "unavailable" \}/);
  assert.match(PAGE, /receivablesState\.data\.hasMoreAttentionInvoices/);
  assert.doesNotMatch(PAGE, /createCustomer|createInvoice|createPayment|approveQuotationAction|startServiceExecution/);
});

test("Dashboard date and amount display use shared locale-safe formatters", () => {
  const sarEn = formatSarAmount("en", 1250.5);
  const sarAr = formatSarAmount("ar", 1250.5);
  const dateAr = formatUiDate("ar", "2026-09-26");

  assert.equal(sarEn, "SAR 1,250.50");
  assert.equal(sarAr, "SAR 1,250.50");
  assert.doesNotMatch(sarAr, ARABIC_INDIC);
  assert.match(dateAr, ARABIC_MONTH);
  assert.doesNotMatch(dateAr, ARABIC_INDIC);
  assert.match(PAGE, /formatUiDate\(locale, receivablesState\.data\.asOfDate\)/);
  assert.match(PAGE, /<UiMoneyText locale=\{locale\} value=\{value\} \/>/);
  assert.match(PAGE, /<UiNumberText locale=\{locale\} value=/);
});

test("Stored mixed-direction identities use leaf bidi isolation without forcing the Dashboard LTR", () => {
  assert.match(PAGE, /<UiBidiText>\{service\.serviceTitle\}<\/UiBidiText>/);
  assert.match(PAGE, /<UiLtrText>\{service\.serviceNumber\}<\/UiLtrText>/);
  assert.match(PAGE, /<UiBidiText>\{primary\.text\}<\/UiBidiText>/);
  assert.doesNotMatch(PAGE, /dir="ltr"/);
  assert.doesNotMatch(PAGE, /translateStored|localizeName|localizeEvent/);
});

test("Dashboard remains global, responsive, and does not branch on named roles", () => {
  assert.match(PAGE, /data-dashboard-content-frame="true"/);
  assert.match(PAGE, /grid min-w-0 grid-cols-1 gap-3\.5 sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(PAGE, /min-w-0/);
  assert.doesNotMatch(PAGE, /currentUser\.role|user\.role/);
  assert.doesNotMatch(PAGE, /BusinessYearSelector|selectedYear|yearQuery/);
});

test("Dashboard snapshot has six capabilities and Service Operations owns lifecycle context", () => {
  const snapshotCards = [...PAGE.matchAll(/<SnapshotCard key="([^"]+)" id="([^"]+)"/g)]
    .map((match) => match[2]);

  assert.deepEqual(snapshotCards, [
    "customers",
    "quotations",
    "services",
    "accounts-receivable",
    "accounts-payable",
    "event-economics",
  ]);
  assert.match(PAGE, /id="services" title=\{labels\.metrics\.services\}/);
  assert.match(PAGE, /labels\.metrics\.readyToStart/);
  assert.match(PAGE, /labels\.metrics\.inProgress/);
  assert.doesNotMatch(PAGE, /key="service-lifecycle" id="service-lifecycle"/);
  const financialWidgets = [...PAGE.matchAll(/<SnapshotCard\b[^>]*>/g)]
    .map((match) => match[0])
    .filter((tag) => tag.includes('emphasis="financial"'))
    .map((tag) => tag.match(/id="([^"]+)"/)?.[1]);
  assert.deepEqual(financialWidgets, ["accounts-receivable", "accounts-payable", "event-economics"]);
  assert.match(PAGE, /data-dashboard-emphasis=\{emphasis\}/);
  assert.match(PAGE, /border-t-2 border-t-primary/);
  assert.doesNotMatch(PAGE, /<SnapshotCard key="customers"[^>]*note=\{labels\.actions\.currentRecords\}/);
  assert.doesNotMatch(PAGE, /<SnapshotCard key="quotations"[^>]*note=\{labels\.actions\.currentRecords\}/);
  assert.match(PAGE, /<SnapshotMetric label=\{labels\.metrics\.openEvents\}/);
  assert.match(PAGE, /labels\.states\.completenessUnavailable/);
});

test("Dashboard restores independent 5/7 command columns and bounded zero-group-aware queues", () => {
  assert.match(PAGE, /data-dashboard-main-columns="true"/);
  assert.match(PAGE, /data-dashboard-column="left" className=\{mainColumns\.actionCenterClassName/);
  assert.match(PAGE, /data-dashboard-column="right"/);
  assert.match(PAGE, /getDashboardMainColumnsPresentation\(/);
  assert.match(PAGE, /mainColumns\.showActionCenter/);
  assert.match(PAGE, /mainColumns\.showRightColumn/);
  assert.match(PAGE, /mainColumns\.rightColumnClassName/);
  assert.match(PAGE, /getDashboardActionCenterPresentation\(actionQueues/);
  assert.match(PAGE, /getDashboardPreview\(queue\.items, queue\.sourceHasMore\)/);
  assert.match(PAGE, /secondaryCanWrap/);
  assert.match(PAGE, /secondary: <UiBidiText>\{expense\.description\}<\/UiBidiText>,\s*secondaryCanWrap: true,/);
  assert.match(PAGE, /primary: <UiLtrText>\{quotation\.quotationNumber\}<\/UiLtrText>,\s*secondary: context\.direction === "auto" \? <UiBidiText>\{context\.text\}<\/UiBidiText> : undefined,/);
  assert.match(PAGE, /actionCenterPresentation\.showEmptyState/);
  assert.match(PAGE, /actionCenterPresentation\.hasUnavailableSource/);
  assert.match(PAGE, /data-dashboard-section="operations-focus"[\s\S]*data-dashboard-section="recent-activity"/);
  assert.match(PAGE, /quotationsState\.data\.recentQuotations\.slice\(0, 3\)/);
  assert.match(PAGE, /paymentsState\.data\.payments\.slice\(0, 3\)/);
  assert.match(PAGE, /servicesState\.data\.upcomingServices\.length > 3/);
  assert.match(PAGE, /quotationsState\.data\.totalCount > 3/);
  assert.match(PAGE, /paymentsState\.data\.payments\.length > 3/);
});

test("W9B previews expose destinations only for omitted rows and keep dashboard content naturally sized", () => {
  const actionCenter = PAGE
    .split('data-dashboard-section="action-center"')[1]
    ?.split('data-dashboard-column="right"')[0] ?? "";

  assert.ok(actionCenter.length > 0);
  assert.doesNotMatch(actionCenter, /className="[^"]*\b(?:min-h|h)-\d/);
  assert.match(PAGE, /viewAll=\{preview\.hasMore \? \{ href: queue\.destination, label: labels\.actions\.viewAll \} : undefined\}/);
  assert.match(PAGE, /servicesState\.data\.upcomingServices\.length > 3 && !actionQueueViewAllDestinations\.has\("\/services"\)/);
  assert.match(PAGE, /quotationsState\.data\.totalCount > 3 && !actionQueueViewAllDestinations\.has\("\/quotations"\)/);
  assert.match(PAGE, /paymentsState\.data\.payments\.slice\(0, 3\)/);
  assert.match(PAGE, /data-dashboard-section-header="action-center"/);
  assert.match(PAGE, /data-dashboard-action-count=\{visibleActionItemCount\}/);
  assert.match(PAGE, /data-dashboard-card-kind=\{emphasis === "financial" \? "financial" : "operational"\}/);
  assert.match(PAGE, /data-dashboard-metric-prominence=\{prominence\}/);
  assert.match(PAGE, /overflow-hidden rounded-lg border border-surface-variant divide-y divide-surface-variant/);
});

test("W9B visual hierarchy is sourced from real dashboard values, not Stitch mock semantics", () => {
  assert.match(PAGE, /visibleActionItemCount = visibleActionQueues\.reduce/);
  assert.match(PAGE, /<UiNumberText locale=\{locale\} value=\{visibleActionItemCount\} \/>/);
  assert.match(PAGE, /badge=\{receivablesState\.status === "ready" && receivablesState\.data\.detailTotalCount > 0/);
  assert.match(PAGE, /id="event-economics"[\s\S]*?note=\{eventState\.status === "ready"[\s\S]*?labels\.states\.partialCompleteness/);
  assert.doesNotMatch(PAGE, /id="event-economics"[^>]*badge=/);
  assert.match(PAGE, /labels\.metrics\.partialEvents/);
  assert.match(PAGE, /labels\.metrics\.completeEvents/);
  assert.match(PAGE, /labels\.metrics\.unavailableEvents/);
  assert.match(PAGE, /<SnapshotMetric label=\{labels\.metrics\.collectedCash\} prominence="financial"/);
  assert.match(PAGE, /<SnapshotMetric label=\{labels\.metrics\.outstandingReceivables\} prominence="financial-primary"/);
  assert.match(PAGE, /data-dashboard-section-header="operations-focus"/);
  assert.match(PAGE, /data-dashboard-section-header="recent-activity"/);
  assert.doesNotMatch(PAGE, /due soon|Awaiting approval|Operationally active|New invoice issued/i);
});
