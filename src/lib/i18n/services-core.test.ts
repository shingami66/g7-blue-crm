import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getSharedUiStates } from "./dictionaries/common.ts";
import {
  getServiceStatusLabel,
  getServicesDictionary,
} from "./dictionaries/services.ts";
import { getQuotationStatusLabel } from "./dictionaries/quotations.ts";
import { formatSarAmount, formatUiDate, formatUiDateTime } from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const SERVICES_PAGE = join(REPO_ROOT, "src/app/(dashboard)/services/page.tsx");
const SERVICES_CLIENT = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/ServicesClient.tsx",
);
const SERVICE_DETAIL = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/page.tsx");
const RELATED_QUOTATIONS = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/RelatedQuotationsCard.tsx",
);
const TIMELINE = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx",
);
const EDIT_FORM = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/edit/EditServiceForm.tsx",
);
const EDIT_PAGE = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/edit/page.tsx");
const NEW_PAGE = join(REPO_ROOT, "src/app/(dashboard)/services/new/page.tsx");
const SERVICE_FORM = join(REPO_ROOT, "src/app/(dashboard)/services/new/ServiceForm.tsx");
const BILLING = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/BillingPanel.tsx");
const ABS_CARD = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/ApprovedBillingScopesCard.tsx",
);
const ALLOCATIONS = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx",
);
const BOOKINGS = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/SupplierBookingsPanel.tsx",
);

const ARABIC_INDIC = /[٠-٩]/;
const ARABIC_MONTH =
  /يناير|فبراير|مارس|أبريل|ابريل|مايو|يونيو|يوليو|أغسطس|اغسطس|سبتمبر|أكتوبر|اكتوبر|نوفمبر|ديسمبر/;

const CANONICAL_STATUSES = [
  "Inquiry",
  "Quoted",
  "Approved",
  "Deposit Paid",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;

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

test("1. Services dictionary English/Arabic shapes stay aligned", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
});

test("2. Services page headings and primary actions resolve in both locales", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.list.title, "Services");
  assert.equal(ar.list.title, "الخدمات");
  assert.equal(en.list.newService, "New Service");
  assert.equal(ar.list.newService, "خدمة جديدة");
  assert.equal(en.form.buttons.create, "Create Service");
  assert.equal(ar.form.buttons.create, "إنشاء الخدمة");
  assert.equal(en.form.editTitle, "Edit Service");
  assert.equal(ar.form.editTitle, "تعديل الخدمة");
});

test("3. List headings, filters, result count, and row actions are localized", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.list.table.serviceNumber, "Service Number");
  assert.equal(ar.list.table.serviceNumber, "رقم الخدمة");
  assert.equal(en.list.table.customer, "Customer");
  assert.equal(ar.list.table.customer, "العميل");
  assert.equal(en.list.allStatuses, "All Statuses");
  assert.equal(ar.list.allStatuses, "جميع الحالات");
  assert.equal(en.list.actions.view, "View");
  assert.equal(ar.list.actions.view, "عرض");
  assert.match(en.list.showingRange, /\{start\}.*\{end\}.*\{total\}/);
  assert.match(ar.list.showingRange, /\{start\}.*\{end\}.*\{total\}/);
});

test("4-7. Canonical Service status display labels; codes stable; Cancelled non-linear; no Confirmed", () => {
  assert.equal(getServiceStatusLabel("en", "Inquiry"), "Inquiry");
  assert.equal(getServiceStatusLabel("ar", "Inquiry"), "استفسار");
  assert.equal(getServiceStatusLabel("ar", "Quoted"), "تم تقديم عرض سعر");
  assert.equal(getServiceStatusLabel("ar", "Approved"), "معتمد");
  assert.equal(getServiceStatusLabel("ar", "Deposit Paid"), "تم سداد الدفعة المقدمة");
  assert.equal(getServiceStatusLabel("ar", "In Progress"), "قيد التنفيذ");
  assert.equal(getServiceStatusLabel("ar", "Completed"), "مكتمل");
  assert.equal(getServiceStatusLabel("ar", "Cancelled"), "ملغي");

  const en = getServicesDictionary("en");
  assert.deepEqual(Object.keys(en.serviceStatuses).sort(), [...CANONICAL_STATUSES].sort());
  assert.equal(Object.prototype.hasOwnProperty.call(en.serviceStatuses, "Confirmed"), false);

  const timeline = readFileSync(TIMELINE, "utf8");
  assert.match(timeline, /const LINEAR_STATUSES = \[[\s\S]*?"Completed",\s*\] as const/);
  assert.doesNotMatch(
    timeline,
    /const LINEAR_STATUSES = \[[\s\S]*?"Cancelled"[\s\S]*?\] as const/,
  );
  assert.match(timeline, /status === "Cancelled"/);
});

test("8. New Service form labels and validation contracts remain localized", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.form.labels.serviceTitle, "Service Title");
  assert.equal(ar.form.labels.serviceTitle, "عنوان الخدمة");
  assert.equal(en.form.validation.validActiveCustomer.includes("active"), true);
  assert.match(ar.form.validation.validActiveCustomer, /عميل/);
  const form = readFileSync(SERVICE_FORM, "utf8");
  assert.match(form, /createService/);
  assert.match(form, /validActiveCustomer/);
  assert.match(form, /customerId/);
});

test("9. Edit Service form labels and error mapping stay dictionary-driven", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.form.buttons.saveChanges, "Save Changes");
  assert.equal(ar.form.buttons.saveChanges, "حفظ التغييرات");
  const form = readFileSync(EDIT_FORM, "utf8");
  assert.match(form, /updateService/);
  assert.match(form, /getEditServiceErrorMessage/);
});

test("10. Active/non-deleted customer validation remains on New Service page", () => {
  const page = readFileSync(NEW_PAGE, "utf8");
  assert.match(page, /c\.status === "active"/);
  assert.match(page, /requirePermission\("services:write"\)/);
  assert.match(page, /getCustomers/);
});

test("11. Service Detail core headings, customer context, and schedule copy resolve", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.detail.backToServices.toLowerCase().includes("back"), true);
  assert.equal(ar.detail.backToServices, "العودة إلى الخدمات");
  assert.equal(en.detail.sections.serviceSchedule, "Service Schedule");
  assert.equal(ar.detail.sections.serviceSchedule, "الجدول الزمني");
  assert.equal(en.detail.labels.customer, "Customer");
  assert.equal(ar.detail.labels.customer, "العميل");
  assert.equal(en.detail.labels.startDate, "Start Date");
  assert.equal(ar.detail.labels.startDate, "تاريخ البداية");
});

test("12. Status timeline remains read-only (no transition mutation in timeline)", () => {
  const timeline = readFileSync(TIMELINE, "utf8");
  assert.doesNotMatch(timeline, /updateService|transitionService|createInvoice|server action/i);
  assert.match(timeline, /getServiceStatusLabel/);
  assert.equal(getServicesDictionary("ar").serviceStatusTimeline.title, "مسار حالة الخدمة");
});

test("13. Related quotations passive display copy and empty/unavailable states", () => {
  const en = getServicesDictionary("en");
  const ar = getServicesDictionary("ar");
  assert.equal(en.relatedQuotations.title, "Related Quotations");
  assert.equal(ar.relatedQuotations.title, "عروض الأسعار المرتبطة");
  assert.equal(en.states.noRelatedQuotations.length > 0, true);
  assert.equal(ar.states.noRelatedQuotations.includes("عروض"), true);
  assert.equal(en.states.noPermissionToViewQuotations.length > 0, true);
  assert.notEqual(en.states.noRelatedQuotations, en.states.noPermissionToViewQuotations);
});

test("14. Quotation status uses authoritative helper; no approval mutation in RelatedQuotationsCard", () => {
  assert.equal(getQuotationStatusLabel("ar", "approved"), "معتمد");
  const card = readFileSync(RELATED_QUOTATIONS, "utf8");
  assert.match(card, /getQuotationStatusLabel/);
  assert.doesNotMatch(card, /approveQuotation|rejectQuotation|createQuotationAction|softDelete/);
});

test("15-17. Service/quotation numbers LTR; dates and SAR use shared formatters", () => {
  const client = readFileSync(SERVICES_CLIENT, "utf8");
  const detail = readFileSync(SERVICE_DETAIL, "utf8");
  const related = readFileSync(RELATED_QUOTATIONS, "utf8");
  assert.match(client, /isolateBidiText\(service\.serviceNumber\)/);
  assert.match(related, /isolateBidiText\(quotation\.quotationNumber\)/);
  assert.match(client, /formatUiDate/);
  assert.match(client, /formatSarAmount/);
  assert.match(detail, /formatUiDate/);
  assert.match(detail, /formatUiDateTime/);
  assert.match(detail, /formatSarAmount/);
  assert.match(related, /formatUiDate/);
  assert.match(related, /formatSarAmount/);
  assert.doesNotMatch(client, /toLocaleString/);
  assert.doesNotMatch(detail, /toLocaleString/);
  assert.doesNotMatch(related, /toLocaleString/);

  assert.equal(formatSarAmount("ar", 1500), "SAR 1,500.00");
  assert.doesNotMatch(formatSarAmount("ar", 1500), ARABIC_INDIC);
  const arDate = formatUiDate("ar", "2026-07-10");
  assert.match(arDate, ARABIC_MONTH);
  assert.doesNotMatch(arDate, ARABIC_INDIC);
  assert.match(formatUiDateTime("en", new Date(2026, 6, 10, 14, 30)), /Jul|2026/);
});

test("18. Stored customer/event/location/description data is not translated", () => {
  const client = readFileSync(SERVICES_CLIENT, "utf8");
  const detail = readFileSync(SERVICE_DETAIL, "utf8");
  assert.match(client, /service\.serviceTitle/);
  assert.match(client, /service\.eventName/);
  assert.match(client, /service\.customer\?\.company/);
  assert.match(detail, /service\.description/);
  assert.match(detail, /service\.eventLocation/);
  assert.doesNotMatch(client, /translateStored|localizeEvent/);
});

test("19. Edit Service subtitle isolates Service number without forcing full sentence LTR", () => {
  const form = readFileSync(EDIT_FORM, "utf8");
  assert.match(form, /service\.serviceNumber/);
  assert.match(form, /dictionary\.form\.editSubtitle/);
  // Number is LTR-isolated; subtitle remains a separate natural-direction span.
  assert.match(
    form,
    /dir="ltr"[^>]*>[\s\S]*?isolateBidiText\(service\.serviceNumber\)[\s\S]*?<span>\{dictionary\.form\.editSubtitle\}<\/span>/,
  );
  assert.doesNotMatch(
    form,
    /dir="ltr"[^>]*>[\s\S]*?\$\{service\.serviceNumber\} - \$\{dictionary\.form\.editSubtitle\}/,
  );
  assert.doesNotMatch(form, /\$\{service\.serviceNumber\} - \$\{dictionary\.form\.editSubtitle\}/);
});

test("20. Empty, filtered-empty, unavailable, and denied states remain distinct", () => {
  const en = getServicesDictionary("en");
  assert.notEqual(en.states.noServices, en.states.noFilteredServices);
  assert.notEqual(en.states.noServicesFound, en.states.noFilteredServices);
  assert.notEqual(en.states.servicesForbidden, en.states.servicesLoadError);
  const client = readFileSync(SERVICES_CLIENT, "utf8");
  assert.match(client, /noServices/);
  assert.match(client, /noFilteredServices/);
  assert.match(client, /noServicesFound/);
});

test("21. services:read and services:write enforcement remain on pages", () => {
  const list = readFileSync(SERVICES_PAGE, "utf8");
  const detail = readFileSync(SERVICE_DETAIL, "utf8");
  const edit = readFileSync(EDIT_PAGE, "utf8");
  const create = readFileSync(NEW_PAGE, "utf8");
  assert.match(list, /getServices\(/);
  assert.match(list, /services:write/);
  assert.match(detail, /requirePermission\("services:read"\)/);
  assert.match(edit, /requirePermission\("services:write"\)/);
  assert.match(create, /requirePermission\("services:write"\)/);
  assert.match(list, /SharedAuthenticatedStatePanel/);
  assert.match(detail, /SharedAuthenticatedStatePanel/);
});

test("22-23. Create/update contracts and list pagination behavior remain", () => {
  const form = readFileSync(SERVICE_FORM, "utf8");
  const edit = readFileSync(EDIT_FORM, "utf8");
  const client = readFileSync(SERVICES_CLIENT, "utf8");
  assert.match(form, /createService/);
  assert.match(edit, /updateService/);
  assert.match(client, /itemsPerPage = 10/);
  assert.match(client, /PaginationFooter/);
  assert.match(client, /statusFilter/);
});

test("24. No raw internal errors introduced on Services core surfaces", () => {
  for (const file of [SERVICES_PAGE, SERVICE_DETAIL, SERVICES_CLIENT, RELATED_QUOTATIONS]) {
    const source = readFileSync(file, "utf8");
    assert.doesNotMatch(source, /\{error\.message\}/);
    assert.doesNotMatch(source, /service_role|PGRST|postgres/i);
  }
});

test("25. No hardcoded English UI shells remain on Services list/detail pages", () => {
  const list = readFileSync(SERVICES_PAGE, "utf8");
  const client = readFileSync(SERVICES_CLIENT, "utf8");
  const forbidden = ["Access Denied", "Something went wrong", "New Service", "Service Number"];
  const offenders = forbidden.filter(
    (phrase) =>
      list.includes(`"${phrase}"`) ||
      client.includes(`"${phrase}"`) ||
      list.includes(`'${phrase}'`) ||
      client.includes(`'${phrase}'`),
  );
  assert.deepEqual(offenders, []);
});

test("26-28. Operational subflow files and PDF/VAT surfaces remain untouched by this task's formatter migration intent", () => {
  // Operational files still exist and are not required to use shared SAR helpers yet.
  assert.match(readFileSync(BILLING, "utf8"), /BillingPanel|formatCurrency|Intl|toLocaleString|amount/i);
  assert.match(readFileSync(ABS_CARD, "utf8"), /ApprovedBilling|formatSar|acceptedGrandTotal/i);
  assert.match(readFileSync(ALLOCATIONS, "utf8"), /SupplierAllocations|estimatedUnitCost/i);
  assert.match(readFileSync(BOOKINGS, "utf8"), /SupplierBookings|booking/i);

  // Core detail still composes them but this slice must not rewrite their internals.
  const detail = readFileSync(SERVICE_DETAIL, "utf8");
  assert.match(detail, /BillingPanel/);
  assert.match(detail, /ApprovedBillingScopesCard/);
  assert.match(detail, /SupplierAllocationsPanel/);
  assert.match(detail, /SupplierBookingsPanel/);

  assert.equal(getSharedUiStates("en").accessDenied.title, "Access denied");
});
