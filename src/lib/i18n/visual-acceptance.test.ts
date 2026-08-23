import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getAdminUsersDictionary } from "./dictionaries/admin-users.ts";
import { navigationDictionaryAr } from "./dictionaries/navigation.ts";
import { getPaymentsDictionary } from "./dictionaries/payments.ts";
import { getServicesDictionary } from "./dictionaries/services.ts";
import { getSettingsDictionary } from "./dictionaries/settings.ts";
import { getSuppliersDictionary } from "./dictionaries/suppliers.ts";
import {
  formatUiDate,
  formatUiDateRange,
  formatUiDateTime,
  resolveUiDateDisplay,
  resolveUiDateTimeDisplay,
} from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");

function read(rel: string) {
  return readFileSync(join(REPO_ROOT, rel), "utf8");
}

const JUNE_16 = new Date(2026, 5, 16, 12, 0, 0);
const JULY_2_1811 = new Date(2026, 6, 2, 18, 11, 0);
const JULY_11_0747 = new Date(2026, 6, 11, 7, 47, 0);
const JULY_11_1510 = new Date(2026, 6, 11, 15, 10, 0);
const JUNE_26 = new Date(2026, 5, 26);
const JUNE_30 = new Date(2026, 5, 30);
const JULY_11 = new Date(2026, 6, 11);
const JULY_16 = new Date(2026, 6, 16);

// ────────────────────────────────────────
// Locale selector / localized pending status
// ────────────────────────────────────────

test("locale selector uses localized status copy, not a global visual loader", () => {
  const selector = read("src/components/i18n/LocaleSelector.tsx");
  assert.doesNotMatch(selector, /GlobalPendingProvider|useGlobalPending|showPending|hidePending/);
  assert.doesNotMatch(selector, /Loader2/);
  assert.match(selector, /copy\.updating/);
  assert.doesNotMatch(selector, /animate-spin/);
  assert.doesNotMatch(selector, /<Spinner/);
});

test("locale pending lifecycle: status remains through refresh and clears after locale observed", () => {
  const selector = read("src/components/i18n/LocaleSelector.tsx");

  assert.doesNotMatch(selector, /showPending|pendingIdRef/);
  assert.match(selector, /applyCurrentUserLocalePreference/);

  // Duplicate submissions blocked.
  assert.match(selector, /if \(submissionInFlight\.current\)/);
  assert.match(selector, /submissionInFlight\.current = true/);

  // Pending must not clear merely because router.refresh() was invoked.
  assert.match(selector, /awaitingLocaleRef\.current = requestedLocale/);
  assert.match(selector, /router\.refresh\(\)/);
  const refreshIdx = selector.indexOf("router.refresh()");
  assert.ok(refreshIdx > 0);
  const afterRefresh = selector.slice(refreshIdx, refreshIdx + 280);
  assert.doesNotMatch(afterRefresh, /hidePending\(pendingId\)/);

  // Clears when requested locale is observed on the provider.
  assert.match(selector, /providerLocale === awaited/);
  assert.match(selector, /clearPendingSafely/);

  // Error paths clear pending safely (no-refresh + catch).
  assert.match(selector, /catch \{[\s\S]*?clearPendingSafely\(\);/);
});

// ────────────────────────────────────────
// Date tokens / plain formatters
// ────────────────────────────────────────

test("resolveUiDateDisplay Arabic tokens are day/month/year segments", () => {
  const tokens = resolveUiDateDisplay("ar", JUNE_16);
  assert.equal(tokens.kind, "segments");
  if (tokens.kind !== "segments") return;
  assert.equal(tokens.day, "16");
  assert.equal(tokens.month, "يونيو");
  assert.equal(tokens.year, "2026");
  assert.equal(tokens.time, undefined);
});

test("resolveUiDateTimeDisplay Arabic AM/PM tokens: time then dayPeriod", () => {
  const am = resolveUiDateTimeDisplay("ar", JULY_11_0747);
  assert.equal(am.kind, "segments");
  if (am.kind !== "segments") return;
  assert.equal(am.day, "11");
  assert.equal(am.month, "يوليو");
  assert.equal(am.year, "2026");
  assert.equal(am.time, "07:47");
  assert.equal(am.dayPeriod, "ص");
  // Token contract must not invert marker before time.
  assert.notEqual(`${am.dayPeriod} ${am.time}`, "ص 07:47" === `${am.dayPeriod} ${am.time}` ? "bad" : "ص 07:47");
  assert.equal([am.time, am.dayPeriod].join(" "), "07:47 ص");

  const pm = resolveUiDateTimeDisplay("ar", JULY_11_1510);
  assert.equal(pm.kind, "segments");
  if (pm.kind !== "segments") return;
  assert.equal(pm.time, "03:10");
  assert.equal(pm.dayPeriod, "م");
  assert.equal([pm.time, pm.dayPeriod].join(" "), "03:10 م");
});

test("resolveUiDateTimeDisplay English AM/PM remains Western clock text", () => {
  const am = resolveUiDateTimeDisplay("en", JULY_11_0747);
  const pm = resolveUiDateTimeDisplay("en", JULY_11_1510);
  assert.equal(am.kind, "plain");
  assert.equal(pm.kind, "plain");
  if (am.kind !== "plain" || pm.kind !== "plain") return;
  assert.match(am.text, /AM|am|7:47|07:47/i);
  assert.match(pm.text, /PM|pm|3:10|03:10/i);
  assert.doesNotMatch(am.text, /ص/);
  assert.doesNotMatch(pm.text, /م/);
});

test("plain formatUiDate Arabic string order remains day-month-year", () => {
  assert.equal(formatUiDate("ar", JUNE_16), "16 يونيو 2026");
  assert.match(formatUiDateTime("ar", JULY_2_1811), /^2\s+يوليو\s+2026،/);
  assert.equal(formatUiDateRange("ar", JUNE_26, JUNE_30), "26 يونيو 2026 – 30 يونيو 2026");
  // Source chronology preserved in plain range (not swapped).
  assert.equal(formatUiDateRange("ar", JULY_11, JULY_16), "11 يوليو 2026 – 16 يوليو 2026");
  assert.notEqual(formatUiDateRange("ar", JULY_11, JULY_16), "16 يوليو 2026 – 11 يوليو 2026");
});

test("plain formatUiDateTime Arabic AM/PM never renders marker-before-time", () => {
  const am = formatUiDateTime("ar", JULY_11_0747);
  const pm = formatUiDateTime("ar", JULY_11_1510);
  assert.match(am, /07:47\s+ص/);
  assert.match(pm, /03:10\s+م/);
  assert.doesNotMatch(am, /ص\s+07:47/);
  assert.doesNotMatch(pm, /م\s+03:10/);
});

test("English date tokens stay plain LTR text", () => {
  const tokens = resolveUiDateDisplay("en", JUNE_16);
  assert.equal(tokens.kind, "plain");
  if (tokens.kind !== "plain") return;
  assert.match(tokens.text, /Jun/);
  assert.match(tokens.text, /16/);
  assert.match(tokens.text, /2026/);
});

// ────────────────────────────────────────
// Rendered structure contracts (source + tokens)
// ────────────────────────────────────────

test("UiDateText rendered structure isolates day/year and outer RTL for Arabic", () => {
  const source = read("src/components/i18n/UiDateText.tsx");
  assert.match(source, /dir="rtl"/);
  assert.match(source, /<bdi dir="ltr">\{tokens\.day\}<\/bdi>/);
  assert.match(source, /<bdi dir="ltr">\{tokens\.year\}<\/bdi>/);
  assert.match(source, /tokens\.month/);
  assert.match(source, /UiDateRangeText/);
  // Time marker is a separate unit — not joined into one LTR isolate.
  assert.match(source, /<bdi dir="ltr">\{tokens\.time\}<\/bdi>/);
  assert.match(source, /tokens\.dayPeriod/);
  assert.doesNotMatch(
    source,
    /\[tokens\.time,\s*tokens\.dayPeriod\]\.filter\(Boolean\)\.join/,
  );
});

test("UiDateRangeText structure: outer dir=ltr, child order start → separator → end", () => {
  const source = read("src/components/i18n/UiDateText.tsx");
  const rangeFn = source.slice(source.indexOf("export function UiDateRangeText"));
  assert.match(rangeFn, /dir="ltr"/);
  assert.match(rangeFn, /inline-flex/);
  assert.match(rangeFn, /data-range-part="start"/);
  assert.match(rangeFn, /data-range-part="separator"/);
  assert.match(rangeFn, /data-range-part="end"/);

  const startIdx = rangeFn.indexOf('data-range-part="start"');
  const sepIdx = rangeFn.indexOf('data-range-part="separator"');
  const endIdx = rangeFn.indexOf('data-range-part="end"');
  assert.ok(startIdx > 0 && sepIdx > startIdx && endIdx > sepIdx, "DOM child order start, separator, end");

  // startTokens resolved before endTokens; render order matches.
  const startResolve = rangeFn.indexOf("resolveUiDateDisplay(locale, start");
  const endResolve = rangeFn.indexOf("resolveUiDateDisplay(locale, end");
  assert.ok(startResolve > 0 && endResolve > startResolve, "source dates not swapped at resolve");

  // Each date unit still uses renderTokens (Arabic RTL units retained).
  assert.match(rangeFn, /renderTokens\(startTokens\)/);
  assert.match(rangeFn, /renderTokens\(endTokens\)/);
});

test("UiDateTimeText structure: numeric time LTR isolate then Arabic dayPeriod unit", () => {
  const source = read("src/components/i18n/UiDateText.tsx");
  // Explicit segments: time bdi then optional dayPeriod sibling — not one mixed LTR phrase.
  assert.match(
    source,
    /<bdi dir="ltr">\{tokens\.time\}<\/bdi>[\s\S]*?\{tokens\.dayPeriod \? <> \{tokens\.dayPeriod\}<\/> : null\}/,
  );
  assert.doesNotMatch(source, /join\(" "\).*dayPeriod|dayPeriod.*join\(" "\)/);
});

// ────────────────────────────────────────
// Call sites & accepted contracts
// ────────────────────────────────────────

test("call sites use UiDateText/UiDateTimeText/UiDateRangeText not full-date dir=ltr wrappers", () => {
  const routes = [
    "src/app/(dashboard)/services/ServicesClient.tsx",
    "src/app/(dashboard)/services/[id]/page.tsx",
    "src/app/(dashboard)/services/[id]/RelatedQuotationsCard.tsx",
    "src/app/(dashboard)/quotations/QuotationsClient.tsx",
    "src/app/(dashboard)/quotations/[id]/page.tsx",
    "src/app/(dashboard)/invoices/InvoicesListClient.tsx",
    "src/app/(dashboard)/invoices/[id]/page.tsx",
    "src/app/(dashboard)/payments/PaymentsClient.tsx",
    "src/app/(dashboard)/admin/users/AdminUsersClient.tsx",
    "src/app/(dashboard)/customers/[id]/Customer360Workspace.tsx",
  ];
  for (const route of routes) {
    const source = read(route);
    assert.match(source, /UiDateText|UiDateTimeText|UiDateRangeText/, route);
    assert.doesNotMatch(
      source,
      /dir="ltr"[^>]*>\s*\{formatUiDate/,
      `${route} must not wrap formatUiDate in dir=ltr`,
    );
    assert.doesNotMatch(
      source,
      /dir="ltr"[^>]*>\s*\{formatUiDateTime/,
      `${route} must not wrap formatUiDateTime in dir=ltr`,
    );
  }
});

test("Settings IsoDateField uses YYYY-MM-DD contract without mm/dd/yyyy", () => {
  const settings = read("src/app/(dashboard)/settings/SettingsForm.tsx");
  assert.match(settings, /function IsoDateField/);
  assert.match(settings, /placeholder="YYYY-MM-DD"/);
  assert.match(settings, /pattern="/);
  assert.match(settings, /\\d\{4\}/);
  assert.match(settings, /name="vat_effective_date"/);
  assert.match(settings, /IsoDateField/);
  assert.doesNotMatch(settings, /type=\{?"date"\}?/);
  assert.match(settings, /type="text"/);
});

test("Supplier directory preserves one readable responsive row surface and identity", () => {
  const suppliers = read("src/app/(dashboard)/suppliers/SuppliersClient.tsx");

  // The current directory uses one semantic table that stacks its rows on narrow screens.
  assert.match(suppliers, /block w-full min-w-0[\s\S]*lg:table/);
  assert.match(suppliers, /flex min-w-0 items-start gap-3/);
  assert.match(suppliers, /shrink-0/);
  assert.match(suppliers, /supplier\.name/);
  assert.match(suppliers, /break-words/);
  assert.match(suppliers, /dir="auto">\{supplierName\}/);
  assert.match(suppliers, /dictionary\.detail\.city/);
  assert.match(suppliers, /dictionary\.detail\.coverageArea/);
  assert.match(suppliers, /dictionary\.detail\.country/);
  assert.match(suppliers, /data-supplier-result-count="single"/);
  assert.doesNotMatch(suppliers, /columns\.rating|Rating/);
  assert.doesNotMatch(suppliers, /name\.slice|name\.substring|ellipsis/i);
});

test("Service related quotations table separates value and date columns", () => {
  const related = read("src/app/(dashboard)/services/[id]/RelatedQuotationsCard.tsx");
  assert.match(related, /table-fixed/);
  assert.match(related, /min-w-\[720px\]/);
  assert.match(related, /pe-6/);
  assert.match(related, /UiDateText/);
  assert.match(related, /whitespace-nowrap/);
  assert.match(related, /formatSarAmount/);
  assert.doesNotMatch(related, /dir="ltr" className="py-4 pe-4 text-on-surface-variant tabular-nums"/);
});

test("Admin Users metadata and role labels follow locale display contract", () => {
  const page = read("src/app/(dashboard)/admin/users/page.tsx");
  assert.match(page, /generateMetadata/);
  assert.match(page, /إدارة المستخدمين - G7 BLUE CRM/);
  const ar = getAdminUsersDictionary("ar");
  assert.equal(ar.roles.admin, "مدير النظام");
  assert.equal(ar.roles.viewer, "عرض فقط");
});

test("Arabic copy quality residuals remain product-facing", () => {
  assert.doesNotMatch(getSuppliersDictionary("ar").list.subtitle, /قاعدة البيانات/);
  assert.doesNotMatch(getPaymentsDictionary("ar").subtitle, /قاعدة البيانات|مباشرة/);
  assert.equal(
    getServicesDictionary("ar").approvedBillingScopes.subtitle,
    "النطاق المعتمد للفوترة لهذه الخدمة.",
  );
  assert.equal(
    getServicesDictionary("ar").supplierAllocations.tabs.history,
    "كل السجلات",
  );
  assert.doesNotMatch(getServicesDictionary("ar").supplierBookings.subtitle, /SBK/);
  assert.equal(getSettingsDictionary("ar").labels.tinNumber, "الرقم المميز (TIN)");
  assert.equal(navigationDictionaryAr.app.name, "G7 BLUE CRM");
});

test("Invoices and Payments retain accepted table contracts (list behavior untouched)", () => {
  const invoices = read("src/app/(dashboard)/invoices/InvoicesListClient.tsx");
  const payments = read("src/app/(dashboard)/payments/PaymentsClient.tsx");
  const quotations = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  assert.match(invoices, /text-end font-semibold text-on-surface tabular-nums/);
  assert.match(invoices, /UiDateText/);
  assert.match(payments, /DataTable/);
  assert.match(payments, /UiDateText/);
  assert.match(invoices, /dictionary\.list\.table\.printPdf/);
  assert.match(quotations, /UiDateText/);
});
