import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { getSharedUiStates } from "./dictionaries/common.ts";
import {
  formatCustomersSummaryCopy,
  getCustomerStatusLabel,
  getCustomersDictionary,
} from "./dictionaries/customers.ts";
import { formatSarAmount, formatUiDate, formatUiNumber } from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const CUSTOMERS_PAGE = join(REPO_ROOT, "src/app/(dashboard)/customers/page.tsx");
const CUSTOMERS_CLIENT = join(
  REPO_ROOT,
  "src/app/(dashboard)/customers/CustomersClient.tsx",
);
const CUSTOMER_PROFILE = join(
  REPO_ROOT,
  "src/app/(dashboard)/customers/[id]/page.tsx",
);
const PROFILE_ACTIONS = join(
  REPO_ROOT,
  "src/app/(dashboard)/customers/[id]/CustomerProfileActions.tsx",
);
const FORM_FIELDS = join(
  REPO_ROOT,
  "src/app/(dashboard)/customers/CustomerFormFields.tsx",
);
const KPI_CARD = join(REPO_ROOT, "src/components/ui/KpiCard.tsx");
const PAYMENTS_CLIENT = join(
  REPO_ROOT,
  "src/app/(dashboard)/payments/PaymentsClient.tsx",
);
const EXPORT_EXCEL = join(REPO_ROOT, "src/lib/reports/exportExcel.ts");

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

test("1. Customers dictionary English/Arabic shapes stay aligned", () => {
  const english = getCustomersDictionary("en");
  const arabic = getCustomersDictionary("ar");
  assert.deepEqual(listNestedKeys(english).sort(), listNestedKeys(arabic).sort());
  assert.equal(english.locale, "en");
  assert.equal(arabic.locale, "ar");
});

test("2. Page headings and primary actions resolve in both locales", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.equal(en.list.title, "Customers");
  assert.equal(ar.list.title, "العملاء");
  assert.equal(en.list.addCustomer, "Add Customer");
  assert.equal(ar.list.addCustomer, "إضافة عميل");
  assert.equal(en.list.createCustomer, "Create Customer");
  assert.equal(ar.list.createCustomer, "إنشاء عميل");
  assert.equal(en.list.export, "Export");
  assert.equal(ar.list.export, "تصدير");
  assert.equal(en.actions.editProfile, "Edit Profile");
  assert.equal(ar.actions.editProfile, "تعديل الملف");
});

test("3. Search filters, result count, and export UI labels are localized", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.equal(en.list.allStatuses, "All Statuses");
  assert.equal(ar.list.allStatuses, "جميع الحالات");
  assert.equal(en.list.allCities, "All Cities");
  assert.equal(ar.list.allCities, "كل المدن");
  assert.equal(en.list.customersSummaryZero, "Showing 0 of 0 customers");
  assert.equal(ar.list.customersSummaryZero, "عرض 0 من 0 عميل");
  assert.equal(
    formatCustomersSummaryCopy(en.list.customersSummary, {
      range: "1-10",
      total: "42",
    }),
    "Showing 1-10 of 42 customers",
  );
  assert.equal(
    formatCustomersSummaryCopy(ar.list.customersSummary, {
      range: "1-10",
      total: "42",
    }),
    "عرض 1-10 من إجمالي 42 عميل",
  );
  assert.equal(en.list.export, "Export");
  assert.equal(ar.list.export, "تصدير");
});

test("4. Lead/Active/Inactive display labels localize while internal codes stay stable", () => {
  assert.equal(getCustomerStatusLabel("en", "lead"), "Lead");
  assert.equal(getCustomerStatusLabel("ar", "lead"), "عميل محتمل");
  assert.equal(getCustomerStatusLabel("en", "active"), "Active");
  assert.equal(getCustomerStatusLabel("ar", "active"), "نشط");
  assert.equal(getCustomerStatusLabel("en", "inactive"), "Inactive");
  assert.equal(getCustomerStatusLabel("ar", "inactive"), "غير نشط");
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  assert.match(client, /value="lead"/);
  assert.match(client, /value="active"/);
  assert.match(client, /value="inactive"/);
});

test("5. Add Customer form labels and pending/create copy are localized", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.equal(en.form.core.company.includes("Company"), true);
  assert.equal(ar.form.core.company.includes("الشركة"), true);
  assert.equal(en.form.core.contactPerson.includes("Contact Person"), true);
  assert.equal(ar.form.core.contactPerson.includes("مسؤول التواصل"), true);
  assert.equal(en.list.creatingCustomer, "Creating...");
  assert.match(ar.list.creatingCustomer, /جارٍ إنشاء/);
  assert.equal(en.states.validationFailed.length > 0, true);
  assert.equal(ar.states.validationFailed.length > 0, true);
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  assert.match(client, /CustomerCoreFields/);
  assert.match(client, /CustomerOfficialBillingFields/);
  assert.match(client, /dictionary\.list\.createCustomer/);
});

test("6. Edit Profile labels and action error mapping stay localized", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.equal(en.actions.saveChanges, "Save Changes");
  assert.equal(ar.actions.saveChanges, "حفظ التغييرات");
  assert.equal(en.actions.cancel, "Cancel");
  assert.equal(ar.actions.cancel, "إلغاء");
  const actions = readFileSync(PROFILE_ACTIONS, "utf8");
  assert.match(actions, /updateCustomer/);
  assert.match(actions, /dictionary\.actions\.editProfile/);
  assert.match(actions, /Unauthorized/);
  assert.match(actions, /dictionary\.states\.unauthorized/);
});

test("7. Customer Profile headings and official/billing labels resolve in both locales", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.equal(en.profile.customerProfile, "Customer Profile");
  assert.equal(ar.profile.customerProfile, "ملف العميل");
  assert.equal(en.profile.customerNumber, "Customer Number");
  assert.equal(ar.profile.customerNumber, "رقم العميل");
  assert.equal(en.form.officialBilling.legalName, "Legal Name");
  assert.equal(ar.form.officialBilling.legalName, "الاسم القانوني");
  assert.equal(en.form.officialBilling.crNumber, "Commercial Registration Number");
  assert.equal(ar.form.officialBilling.crNumber, "رقم السجل التجاري");
  assert.equal(en.form.officialBilling.vatNumber, "VAT Number");
  assert.equal(ar.form.officialBilling.vatNumber, "الرقم الضريبي");
  assert.equal(en.form.officialBilling.nationalAddress, "National Address");
  assert.equal(ar.form.officialBilling.nationalAddress, "العنوان الوطني");
  assert.equal(en.form.officialBilling.poRequired, "Purchase Order Required");
  assert.equal(ar.form.officialBilling.poRequired, "يتطلب أمر شراء");
});

test("8. Individual/Company display labels localize without changing internal values", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.equal(en.customerTypes.individual, "Individual");
  assert.equal(ar.customerTypes.individual, "فرد");
  assert.equal(en.customerTypes.company, "Company");
  assert.equal(ar.customerTypes.company, "شركة");
  const fields = readFileSync(FORM_FIELDS, "utf8");
  assert.match(fields, /value="individual"/);
  assert.match(fields, /value="company"/);
});

test("9. Conditional official-field contracts remain in CustomerFormFields", () => {
  const fields = readFileSync(FORM_FIELDS, "utf8");
  assert.match(fields, /CustomerOfficialBillingFields|customer_type|customerType|individual/i);
  assert.match(fields, /dir="ltr"/);
});

test("10. Related Services headings and empty state are localized", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.equal(en.profile.relatedServices, "Related Services");
  assert.equal(ar.profile.relatedServices, "الخدمات المرتبطة");
  assert.equal(en.states.noRelatedServices, "No related services");
  assert.equal(ar.states.noRelatedServices, "لا توجد خدمات مرتبطة");
});

test("11-12. Customer/Service numbers and LTR-safe values remain direction-safe", () => {
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  const profile = readFileSync(CUSTOMER_PROFILE, "utf8");
  assert.match(client, /dir="ltr"/);
  assert.match(client, /customer\.customerNumber/);
  assert.match(profile, /dir="ltr"/);
  assert.match(profile, /service\.serviceNumber/);
  assert.match(profile, /customer\.vatNumber|vatNumber/);
  assert.match(profile, /commercialRegistrationNumber|crNumber|vatNumber|postal/i);
});

test("13. SAR and counts use shared formatters with Western digits", () => {
  assert.equal(formatSarAmount("ar", 12500), "SAR 12,500.00");
  assert.doesNotMatch(formatSarAmount("ar", 12500), ARABIC_INDIC);
  assert.doesNotMatch(formatUiNumber("ar", 42), ARABIC_INDIC);
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  const profile = readFileSync(CUSTOMER_PROFILE, "utf8");
  assert.match(client, /formatSarAmount/);
  assert.match(client, /formatUiNumber/);
  assert.match(profile, /formatSarAmount/);
  assert.match(profile, /formatUiNumber/);
  assert.doesNotMatch(client, /toLocaleString/);
  assert.doesNotMatch(profile, /Intl\.NumberFormat/);
});

test("14. Dates use approved locale formatters with Arabic month names where present", () => {
  const arabicDate = formatUiDate("ar", "2026-07-10");
  assert.match(arabicDate, ARABIC_MONTH);
  assert.doesNotMatch(arabicDate, ARABIC_INDIC);
  const profile = readFileSync(CUSTOMER_PROFILE, "utf8");
  assert.match(profile, /formatUiDate/);
  assert.match(profile, /formatEventDate\(locale,/);
});

test("15. Stored names, addresses, notes, and city data are not translated", () => {
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  const profile = readFileSync(CUSTOMER_PROFILE, "utf8");
  assert.match(client, /customer\.company/);
  assert.match(client, /customer\.contact/);
  assert.match(client, /customer\.city/);
  assert.match(profile, /customer\.company/);
  assert.match(profile, /customer\.legalName/);
  assert.doesNotMatch(client, /translateStored|localizeCity|localizeCompany/);
});

test("16. Quoted Value is not labeled Revenue", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.equal(en.list.table.quotedValue, "Quoted Value");
  assert.equal(ar.list.table.quotedValue, "قيمة العروض");
  assert.equal(en.profile.totalQuotedAmount, "Quoted Value");
  assert.equal(ar.profile.totalQuotedAmount, "قيمة العروض");
  assert.doesNotMatch(JSON.stringify(en), /Revenue/);
  assert.doesNotMatch(JSON.stringify(ar), /إيرادات/);
});

test("17. Empty and unavailable/filtered states remain distinct", () => {
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");
  assert.notEqual(en.states.noCustomers, en.states.noFilteredCustomers);
  assert.notEqual(ar.states.noCustomers, ar.states.noFilteredCustomers);
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  assert.match(client, /customers\.length === 0/);
  assert.match(client, /noCustomers/);
  assert.match(client, /noFilteredCustomers/);
});

test("18. Access-denied UI is localized while server permission enforcement is unchanged", () => {
  const shared = getSharedUiStates("ar");
  assert.equal(shared.accessDenied.title, "تم رفض الوصول");
  const page = readFileSync(CUSTOMERS_PAGE, "utf8");
  const profile = readFileSync(CUSTOMER_PROFILE, "utf8");
  assert.match(page, /getCustomers\(/);
  assert.match(page, /checkPermission\("customers:write"\)/);
  assert.match(page, /checkPermission\("customers:export"\)/);
  assert.match(page, /SharedAuthenticatedStatePanel/);
  assert.match(page, /sharedStates\.accessDenied\.title/);
  assert.match(profile, /requirePermission\("customers:read"\)/);
  assert.match(profile, /SharedAuthenticatedStatePanel/);
});

test("19. Viewer/export permission behavior is unchanged", () => {
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  const page = readFileSync(CUSTOMERS_PAGE, "utf8");
  assert.match(page, /customers:export/);
  assert.match(client, /canExport/);
  assert.match(client, /exportCustomers/);
  assert.match(client, /if \(!canExport \|\| filteredCustomers\.length === 0\) return/);
});

test("20. Customers Excel export passes locale + chrome; permissions and brands preserved", () => {
  const exportSource = readFileSync(EXPORT_EXCEL, "utf8");
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  const page = readFileSync(CUSTOMERS_PAGE, "utf8");
  const en = getCustomersDictionary("en");
  const ar = getCustomersDictionary("ar");

  assert.match(exportSource, /generateExcelReport|exceljs|ExcelJS/i);
  assert.match(exportSource, /ExcelExportChromeCopy|buildExcelExportMetaLine/);
  assert.match(exportSource, /formatExcelExportDateTime|numberingSystem/);
  assert.match(client, /generateExcelReport/);
  assert.match(client, /locale:\s*dictionary\.locale/);
  assert.match(client, /chrome:\s*dictionary\.list\.report\.chrome/);
  assert.match(client, /G SEVEN BLUE Company/);
  assert.match(client, /G7 BLUE CRM/);
  assert.match(client, /g7-blue-customers-/);
  assert.match(page, /customers:export/);
  assert.match(page, /dictionary\.list\.report\.chrome\.systemGenerated/);
  assert.equal(en.list.report.chrome.systemGenerated, "System Generated");
  assert.equal(ar.list.report.chrome.defaultSheetName, "تقرير");
  assert.equal(ar.list.report.columns.email, "البريد الإلكتروني");
});

test("21. Customer queries/mutations/payloads remain on existing action contracts", () => {
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  const actions = readFileSync(PROFILE_ACTIONS, "utf8");
  const page = readFileSync(CUSTOMERS_PAGE, "utf8");
  assert.match(page, /getCustomers/);
  assert.match(client, /createCustomer/);
  assert.match(actions, /updateCustomer/);
  assert.doesNotMatch(client, /createInvoice|createPayment|createQuotation/);
});

test("22. No raw internal errors are introduced on Customers surfaces", () => {
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  const profile = readFileSync(CUSTOMER_PROFILE, "utf8");
  assert.doesNotMatch(client, /\{error\.message\}/);
  assert.doesNotMatch(profile, /\{error\.message\}/);
  assert.doesNotMatch(client, /supabase|postgres|PGRST|service_role/i);
  assert.doesNotMatch(profile, /supabase|postgres|PGRST|service_role/i);
});

test("23. No hardcoded English UI literals remain in source-proven Customers page shells", () => {
  const page = readFileSync(CUSTOMERS_PAGE, "utf8");
  const client = readFileSync(CUSTOMERS_CLIENT, "utf8");
  const forbidden = [
    "Access Denied",
    "Something went wrong",
    "Showing ",
    "Add Customer",
    "Quoted Value",
    "Revenue",
  ];
  const offenders = forbidden.filter(
    (phrase) =>
      page.includes(`"${phrase}"`) ||
      page.includes(`'${phrase}'`) ||
      client.includes(`"${phrase}"`) ||
      client.includes(`'${phrase}'`) ||
      (phrase === "Showing " && client.includes("Showing ${")),
  );
  assert.deepEqual(offenders, []);
});

test("24. KpiCard blast-radius is documented as safe for existing numeric consumers", () => {
  const kpi = readFileSync(KPI_CARD, "utf8");
  const payments = readFileSync(PAYMENTS_CLIENT, "utf8");
  assert.match(kpi, /dir="ltr"/);
  assert.match(kpi, /tabular-nums/);
  assert.match(payments, /KpiCard/);
  // Payments passes preformatted numeric strings into KpiCard, not dictionary prose as value.
  assert.match(payments, /formatSarAmount|formatUiNumber|formatCurrency|toString\(/);
  assert.doesNotMatch(payments, /value=\{dictionary\./);
});
