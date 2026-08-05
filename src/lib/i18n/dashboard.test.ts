import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getSharedUiStates } from "./dictionaries/common.ts";
import { getDashboardDictionary } from "./dictionaries/dashboard.ts";
import { formatSarAmount, formatUiDate } from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const DASHBOARD_PAGE = join(
  REPO_ROOT,
  "src/app/(dashboard)/dashboard/page.tsx",
);
const KPI_CARD = join(REPO_ROOT, "src/components/ui/KpiCard.tsx");
const DASHBOARD_LAYOUT = join(REPO_ROOT, "src/app/(dashboard)/layout.tsx");
const DASHBOARD_DICTIONARY = join(
  REPO_ROOT,
  "src/lib/i18n/dictionaries/dashboard.ts",
);

const ARABIC_INDIC = /[٠-٩]/;
const ARABIC_MONTH =
  /يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر/;

function listNestedKeys(value: unknown, prefix = ""): string[] {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return prefix ? [prefix] : [];
  }

  return Object.entries(value as Record<string, unknown>).flatMap(([key, nested]) => {
    const path = prefix ? `${prefix}.${key}` : key;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      return listNestedKeys(nested, path);
    }
    return [path];
  });
}

test("1. Dashboard dictionary English and Arabic shapes stay aligned", () => {
  const english = getDashboardDictionary("en");
  const arabic = getDashboardDictionary("ar");

  assert.deepEqual(listNestedKeys(english).sort(), listNestedKeys(arabic).sort());
  assert.equal(english.locale, "en");
  assert.equal(arabic.locale, "ar");
});

test("2. Required Dashboard headings and KPI labels resolve in both locales", () => {
  const english = getDashboardDictionary("en");
  const arabic = getDashboardDictionary("ar");

  assert.equal(english.header.title, "Dashboard");
  assert.equal(arabic.header.title, "لوحة التحكم");
  assert.match(english.header.subtitle, /Overview/i);
  assert.match(arabic.header.subtitle, /نظرة عامة/);

  assert.equal(english.metrics.totalCustomers, "Total Customers");
  assert.equal(arabic.metrics.totalCustomers, "إجمالي العملاء");
  assert.equal(english.metrics.totalQuotations, "Total Quotations");
  assert.equal(arabic.metrics.totalQuotations, "إجمالي عروض الأسعار");
  assert.equal(english.metrics.openInvoices, "Open Invoices");
  assert.equal(arabic.metrics.openInvoices, "الفواتير المفتوحة");
  assert.equal(english.metrics.services, "Services");
  assert.equal(arabic.metrics.services, "الخدمات");
  assert.equal(english.metrics.totalCollected, "Total Collected");
  assert.equal(arabic.metrics.totalCollected, "إجمالي المحصل");
  assert.equal(english.metrics.pendingBalance, "Pending Balance");
  assert.equal(arabic.metrics.pendingBalance, "الرصيد المستحق");
  assert.equal(english.sections.recentActivity, "Recent Activity");
  assert.equal(arabic.sections.recentActivity, "النشاط الأخير");
  assert.equal(english.sections.recentPayments, "Recent Payments");
  assert.equal(arabic.sections.recentPayments, "أحدث المدفوعات");
  assert.equal(english.quotations.viewAll, "View all");
  assert.equal(arabic.quotations.viewAll, "عرض الكل");
  assert.doesNotMatch(JSON.stringify(arabic.metrics), /إيرادات|revenue/i);
});

test("3. Access-denied uses localized shared title while dashboard:read enforcement remains", () => {
  const sharedEn = getSharedUiStates("en");
  const sharedAr = getSharedUiStates("ar");
  const dashEn = getDashboardDictionary("en");
  const dashAr = getDashboardDictionary("ar");
  const page = readFileSync(DASHBOARD_PAGE, "utf8");

  assert.equal(sharedEn.accessDenied.title, "Access denied");
  assert.equal(sharedAr.accessDenied.title, "تم رفض الوصول");
  assert.equal(dashEn.states.unavailableForRole, "Unavailable for this role");
  assert.equal(dashAr.states.unavailableForRole, "غير متاح لهذا الدور");

  assert.match(page, /requirePermission\("dashboard:read"\)/);
  assert.match(page, /SharedAuthenticatedStatePanel/);
  assert.match(page, /sharedStates\.accessDenied\.title/);
  assert.match(page, /dictionary\.states\.unavailableForRole/);
  assert.match(page, /UnauthorizedError/);
  assert.match(page, /ForbiddenError/);
  assert.match(page, /redirect\("\/sign-in"\)/);
  // UI localization must not replace enforcement.
  assert.doesNotMatch(page, /requirePermission\([^)]*dictionary/);
});

test("4. Recent Quotations headings and empty/unavailable copy stay distinct in both locales", () => {
  const english = getDashboardDictionary("en");
  const arabic = getDashboardDictionary("ar");
  const page = readFileSync(DASHBOARD_PAGE, "utf8");

  assert.equal(english.quotations.title, "Recent Quotations");
  assert.equal(arabic.quotations.title, "أحدث عروض الأسعار");
  assert.equal(english.quotations.client, "Customer");
  assert.equal(arabic.quotations.client, "العميل");
  assert.equal(english.quotations.value, "Amount");
  assert.equal(arabic.quotations.value, "المبلغ");
  assert.equal(english.quotations.status, "Status");
  assert.equal(arabic.quotations.status, "الحالة");
  assert.equal(english.quotations.noRecentActivity, "No recent quotations");
  assert.equal(arabic.quotations.noRecentActivity, "لا توجد عروض أسعار حديثة");
  assert.equal(
    english.quotations.unavailableForRole,
    "Recent quotations unavailable for this role.",
  );
  assert.equal(
    arabic.quotations.unavailableForRole,
    "عروض الأسعار الحديثة غير متاحة لهذا الدور.",
  );
  assert.notEqual(
    english.quotations.noRecentActivity,
    english.quotations.unavailableForRole,
  );
  assert.notEqual(
    arabic.quotations.noRecentActivity,
    arabic.quotations.unavailableForRole,
  );

  // Empty (ready + zero rows) vs unavailable (permission/load failure) remain separate branches.
  assert.match(page, /quotationsState\.status === "ready"/);
  assert.match(page, /dictionary\.quotations\.noRecentActivity/);
  assert.match(page, /dictionary\.quotations\.unavailableForRole/);
});

test("5. Service Workflow labels and descriptions resolve in both locales", () => {
  const english = getDashboardDictionary("en");
  const arabic = getDashboardDictionary("ar");

  assert.equal(english.workflow.title, "Service Workflow");
  assert.equal(arabic.workflow.title, "مسار عمل الخدمة");
  assert.equal(english.workflow.stage, "Service stage");
  assert.equal(arabic.workflow.stage, "مرحلة الخدمة");
  assert.equal(english.workflow.rows.Inquiry.label, "Inquiry");
  assert.equal(arabic.workflow.rows.Inquiry.label, "استفسار");
  assert.equal(english.workflow.rows.Quoted.focus, "Prepare Service-scoped quotation");
  assert.equal(arabic.workflow.rows.Quoted.focus, "إعداد عرض سعر مرتبط بالخدمة");
  assert.equal(english.workflow.rows["Deposit Paid"].owner, "Accountant");
  assert.equal(arabic.workflow.rows["Deposit Paid"].owner, "المحاسبة");
  // Cancelled is not treated as a linear workflow stage on the Dashboard.
  assert.equal(
    Object.prototype.hasOwnProperty.call(english.workflow.rows, "Cancelled"),
    false,
  );
});

test("6. SAR amounts use the shared formatter and retain Western digits", () => {
  const moneyEn = formatSarAmount("en", 1_250_000.5);
  const moneyAr = formatSarAmount("ar", 1_250_000.5);
  const page = readFileSync(DASHBOARD_PAGE, "utf8");

  assert.equal(moneyEn, "SAR 1,250,000.50");
  assert.equal(moneyAr, "SAR 1,250,000.50");
  assert.doesNotMatch(moneyAr, ARABIC_INDIC);
  assert.match(page, /formatSarAmount/);
  assert.match(page, /formatUiNumber/);
  assert.doesNotMatch(page, /style:\s*["']currency["']/);
  assert.doesNotMatch(page, /Intl\.NumberFormat/);
});

test("7. Arabic date formatter remains available with Arabic months and Western digits (Dashboard has no date columns)", () => {
  const page = readFileSync(DASHBOARD_PAGE, "utf8");
  // Source-proven: current Dashboard UI does not render date/time values.
  // (createdAt is used only for server-side recent-sort ordering, not display.)
  assert.doesNotMatch(page, /formatUiDate|formatUiDateTime|toLocaleDateString/);

  // Shared contract remains intact for any future Dashboard date surface.
  const arabicDate = formatUiDate("ar", new Date(2026, 6, 10));
  assert.match(arabicDate, ARABIC_MONTH);
  assert.doesNotMatch(arabicDate, ARABIC_INDIC);
  assert.match(arabicDate, /10/);
  assert.match(arabicDate, /2026/);
});

test("8. Quotation/document numbers remain LTR at the Dashboard call site", () => {
  const page = readFileSync(DASHBOARD_PAGE, "utf8");

  assert.match(page, /recentQuotationPrimaryLabel/);
  assert.match(page, /dir:\s*"ltr"/);
  assert.match(page, /quotation\.quotationNumber/);
  assert.match(page, /dir=\{primary\.dir\}/);
  assert.match(page, /dir="ltr"/);
});

test("9. Stored customer, Service, event, and quotation data is not translated", () => {
  const page = readFileSync(DASHBOARD_PAGE, "utf8");

  assert.match(page, /quotation\.customer\?\.company/);
  assert.match(page, /quotation\.event/);
  assert.match(page, /quotation\.quotationNumber/);
  // Display path uses stored fields directly, not dictionary lookups of business values.
  assert.doesNotMatch(page, /dictionary\.[^\n]*company/);
  assert.doesNotMatch(page, /translateStored|localizeName|localizeEvent/);
});

test("10. Large KPI amount styling prevents clipping/nowrap regression without changing values", () => {
  const source = readFileSync(KPI_CARD, "utf8");

  assert.match(source, /min-w-0/);
  assert.match(source, /break-words|overflow-wrap/);
  assert.match(source, /clamp\(/);
  assert.match(source, /tabular-nums/);
  assert.match(source, /dir="ltr"/);
  assert.doesNotMatch(source, /whitespace-nowrap/);
  assert.doesNotMatch(source, /toExponential|scientific|notation:\s*["']compact["']/);
});

test("11. No remaining source-proven hardcoded English UI literals in Dashboard-owned page", () => {
  const page = readFileSync(DASHBOARD_PAGE, "utf8");
  const forbidden = [
    "Executive Dashboard",
    "Welcome back",
    "Total Customers",
    "Total Quotations",
    "Open Invoices",
    "Total Collected",
    "Pending Balance",
    "Recent Quotations",
    "Service Workflow",
    "No recent activity",
    "Access Denied",
    "Something went wrong",
    "Loading dashboard",
  ];

  const offenders = forbidden.filter(
    (phrase) => page.includes(`"${phrase}"`) || page.includes(`'${phrase}'`),
  );
  assert.deepEqual(offenders, []);
});

test("12. Dashboard query, permission, formula, and data-source contracts remain intact", () => {
  const page = readFileSync(DASHBOARD_PAGE, "utf8");

  assert.match(page, /getCustomers/);
  assert.match(page, /getQuotations/);
  assert.match(page, /getInvoices/);
  assert.match(page, /getServices/);
  assert.match(page, /customers: \{[\s\S]*?id: "customers-kpi"[\s\S]*?readPermission: "customers:read"/);
  assert.match(page, /quotations: \{[\s\S]*?id: "quotations-kpi-and-list"[\s\S]*?readPermission: "quotations:read"/);
  assert.match(page, /invoices: \{[\s\S]*?id: "invoices-kpi-and-attention"[\s\S]*?readPermission: "invoices:read"/);
  assert.match(page, /services: \{[\s\S]*?id: "services-kpi-and-workflow"[\s\S]*?readPermission: "services:read"/);
  assert.match(page, /payments: \{[\s\S]*?id: "payments-kpi-and-activity"[\s\S]*?readPermission: "payments:read"/);
  assert.match(page, /displayPriority: 10[\s\S]*?destination: "\/customers"[\s\S]*?yearScoped: false/);
  assert.match(page, /sensitivity: "financial"[\s\S]*?emptyState: "unavailableForRole"[\s\S]*?destination: "\/invoices"/);
  assert.match(page, /loadIfAllowed\(DASHBOARD_WIDGETS\.customers\.readPermission/);
  assert.match(page, /loadIfAllowed\(DASHBOARD_WIDGETS\.quotations\.readPermission/);
  assert.match(page, /loadIfAllowed\(DASHBOARD_WIDGETS\.invoices\.readPermission/);
  assert.match(page, /loadIfAllowed\(DASHBOARD_WIDGETS\.services\.readPermission/);
  assert.match(page, /loadIfAllowed\(DASHBOARD_WIDGETS\.payments\.readPermission/);
  assert.match(page, /checkPermission\(permission\)/);
  assert.match(page, /requirePermission\("dashboard:read"\)/);
  assert.match(page, /amount_paid/);
  assert.match(page, /balance_due/);
  assert.match(page, /\.slice\(0,\s*4\)/);
  assert.match(page, /createdAt\.localeCompare/);
  assert.doesNotMatch(page, /createCustomer|createInvoice|createPayment|updateQuotation/);
  assert.doesNotMatch(page, /mock|placeholderKpi|fakeSar|sampleQuotation/i);
});

test("13. No raw internal errors are introduced on the Dashboard surface", () => {
  const page = readFileSync(DASHBOARD_PAGE, "utf8");

  assert.match(page, /console\.error/);
  assert.match(page, /status: "unavailable"/);
  assert.doesNotMatch(page, /\{error\.message\}/);
  assert.doesNotMatch(page, /err\.stack|error\.stack/);
  assert.doesNotMatch(page, /supabase|postgres|rpc|PGRST/i);
  assert.doesNotMatch(page, /service_role|SUPABASE_/);
});

test("14. Provider and session-effective locale contracts remain intact", () => {
  const page = readFileSync(DASHBOARD_PAGE, "utf8");
  const layout = readFileSync(
    join(REPO_ROOT, "src/app/(dashboard)/layout.tsx"),
    "utf8",
  );

  assert.match(page, /getCurrentSessionEffectiveLocale/);
  assert.match(page, /getDashboardDictionary\(locale\)/);
  assert.match(layout, /LocaleProvider locale=\{locale\}/);
  assert.match(layout, /getCurrentSessionEffectiveLocale/);
  assert.doesNotMatch(page, /localStorage|navigator\.language|document\.dir/);
  assert.doesNotMatch(page, /getLocale\(\)/);
});

test("Dashboard dictionary export remains the single module copy source", () => {
  const dictionarySource = readFileSync(DASHBOARD_DICTIONARY, "utf8");
  assert.match(dictionarySource, /export function getDashboardDictionary/);
  assert.match(dictionarySource, /dashboardDictionaryEn/);
  assert.match(dictionarySource, /dashboardDictionaryAr/);
});

test("Dashboard final density uses a bounded frame, no obsolete heading, and a bounded Attention preview", () => {
  const page = readFileSync(DASHBOARD_PAGE, "utf8");
  const layout = readFileSync(DASHBOARD_LAYOUT, "utf8");
  const quotationSections = page.match(/data-dashboard-section="quotations"/g) ?? [];
  const quotationMaps = page.match(/recentQuotations\.map/g) ?? [];
  const dashboardColumns = page.match(/data-dashboard-column="(?:left|right)"/g) ?? [];
  const quotationSectionStart = page.indexOf('data-dashboard-section="quotations"');
  const paymentsSectionStart = page.indexOf('data-dashboard-section="payments"');

  assert.match(page, /<PageHeader title=\{dictionary\.header\.title\}/);
  assert.match(page, /data-dashboard-section="quick-actions"/);
  assert.doesNotMatch(page, /dictionary\.actions\.title/);
  assert.match(page, /data-dashboard-content-frame="true" className="mx-auto w-full max-w-\[1240px\]"/);
  assert.match(layout, /<main className="dashboard-main mx-auto w-full min-w-0 max-w-\[1440px\] flex-1 p-4 md:p-6">/);
  assert.match(page, /canCreateCustomer && <Link href="\/customers"/);
  assert.match(page, /canCreateQuotation && <Link href="\/quotations"/);
  assert.match(page, /canCreateInvoice && <Link href="\/invoices"/);
  assert.match(page, /canCreateService && <Link href="\/services\/new"/);
  assert.match(page, /data-dashboard-section="business-snapshot"/);
  assert.match(page, /grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3/);
  assert.match(page, /data-dashboard-main-columns="true"/);
  assert.equal(dashboardColumns.length, 2);
  assert.match(page, /data-dashboard-column="left" className="min-w-0 space-y-6 lg:col-span-5"/);
  assert.match(page, /data-dashboard-column="right" className="min-w-0 space-y-6 lg:col-span-7"/);
  assert.match(page, /data-dashboard-section="workflow"/);
  assert.match(page, /data-dashboard-section="operations-focus"/);
  assert.match(page, /data-dashboard-section="recent-activity"/);
  assert.match(page, /data-dashboard-section="quotations"/);
  assert.match(page, /data-dashboard-section="payments"/);
  assert.match(page, /items-start/);
  assert.match(page, /self-start/);
  assert.doesNotMatch(page, /data-dashboard-section="priority-work"|dashboard-priority-work|dictionary\.sections\.priorityWork/);
  assert.doesNotMatch(page, /Priority Work|أعمال ذات أولوية/);
  assert.match(page, /const outstandingAttentionInvoices = invoices\.filter\(\(invoice\) => Number\(invoice\.balance_due\) > 0\);/);
  assert.match(page, /const attentionInvoices = outstandingAttentionInvoices\.slice\(0, 5\);/);
  assert.match(page, /const hasMoreAttentionInvoices = outstandingAttentionInvoices\.length > attentionInvoices\.length;/);
  assert.match(page, /action=\{hasMoreAttentionInvoices \? <Link href="\/invoices"/);
  assert.match(page, /dictionary\.quotations\.viewAll/);
  assert.match(page, /advancementDictionary\.attentionTitle/);
  assert.match(page, /advancementDictionary\.operationsTitle/);
  assert.match(page, /dictionary\.workflow\.title/);
  assert.match(page, /dictionary\.sections\.recentQuotations/);
  assert.match(page, /dictionary\.sections\.recentPayments/);
  assert.match(page, /<div className="mt-4 space-y-6">/);
  assert.match(page, /<DashboardAmount locale=\{locale\} value=\{totalCollected\}/);
  assert.match(page, /whitespace-nowrap/);
  assert.match(page, /dir="ltr"/);
  assert.doesNotMatch(page, /DashboardFocusCard title=\{advancementDictionary\.recentPayments\}/);
  assert.doesNotMatch(page, /data-dashboard-section="operational-snapshot"/);
  assert.doesNotMatch(page, /dictionary\.sections\.operationalSnapshot/);
  assert.doesNotMatch(page, /xl:grid-cols-2/);
  assert.doesNotMatch(page, /BusinessYearSelector|searchParams|business_year|year=/i);
  assert.equal(quotationSections.length, 1);
  assert.equal(quotationMaps.length, 1);
  assert.ok(quotationSectionStart > 0 && paymentsSectionStart > quotationSectionStart);
  assert.match(page, /slice\(0,\s*4\)/);
});
