import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getQuotationStatusLabel,
  getQuotationsDictionary,
} from "./dictionaries/quotations.ts";
import { formatSarAmount, formatUiDate, formatUiNumber } from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const LIST_PAGE = join(REPO_ROOT, "src/app/(dashboard)/quotations/page.tsx");
const LIST_CLIENT = join(REPO_ROOT, "src/app/(dashboard)/quotations/QuotationsClient.tsx");
const NEW_PAGE = join(REPO_ROOT, "src/app/(dashboard)/quotations/new/page.tsx");
const FORM = join(REPO_ROOT, "src/app/(dashboard)/quotations/new/QuotationForm.tsx");
const DETAIL = join(REPO_ROOT, "src/app/(dashboard)/quotations/[id]/page.tsx");
const EDIT = join(REPO_ROOT, "src/app/(dashboard)/quotations/[id]/edit/page.tsx");
const APPROVAL = join(
  REPO_ROOT,
  "src/app/(dashboard)/quotations/[id]/QuotationApprovalActions.tsx",
);
const PERMISSIONS = join(REPO_ROOT, "src/lib/auth/role-permissions.ts");
const ACTIONS = join(REPO_ROOT, "src/lib/quotations/actions.ts");
const SCHEMAS = join(REPO_ROOT, "src/lib/quotations/schemas.ts");

const ARABIC_INDIC = /[٠-٩]/;
const CANONICAL_STATUSES = ["draft", "sent", "approved", "rejected", "expired"] as const;

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

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("1. Quotations dictionary English/Arabic shapes stay aligned", () => {
  const en = getQuotationsDictionary("en");
  const ar = getQuotationsDictionary("ar");
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
});

test("2. List headings, filters, result count, and row actions localize", () => {
  const en = getQuotationsDictionary("en");
  const ar = getQuotationsDictionary("ar");
  assert.equal(en.list.title, "Quotations");
  assert.equal(ar.list.title, "عروض الأسعار");
  assert.equal(en.list.table.quotationNumber, "Quotation Number");
  assert.equal(ar.list.table.quotationNumber, "رقم عرض السعر");
  assert.equal(en.list.table.printPdf, "Print / PDF");
  assert.equal(ar.list.table.printPdf, "طباعة / PDF");
  assert.equal(en.list.allStatuses, "All Statuses");
  assert.equal(ar.list.allStatuses, "كل الحالات");
  assert.match(en.list.showingRange, /\{start\}.*\{end\}.*\{count\}/);
  assert.match(ar.list.showingRange, /\{start\}.*\{end\}.*\{count\}/);
  assert.equal(en.list.actionTitles.viewDetails.includes("View"), true);
  assert.equal(ar.list.actionTitles.editQuotation, "تعديل عرض السعر");
  assert.equal(ar.list.actionTitles.deleteQuotation, "حذف عرض السعر");
  assert.match(read(LIST_CLIENT), /dictionary\.list\.title/);
  assert.match(read(LIST_CLIENT), /ModuleSearchControl/);
  assert.match(read(LIST_CLIENT), /searchModes/);
  assert.match(read(LIST_CLIENT), /resetFilters/);
  assert.match(read(LIST_CLIENT), /PaginationFooter/);
});

test("Quotation list print action opens the authoritative PDF without row navigation", () => {
  const source = read(LIST_CLIENT);

  assert.match(source, /Printer/);
  assert.match(source, /dictionary\.list\.table\.printPdf/);
  assert.match(source, /window\.open\(`\/quotations\/\$\{quotation\.id\}\/pdf`, "_blank", "noopener,noreferrer"\)/);
  assert.match(source, /aria-label=\{`\$\{dictionary\.list\.actionTitles\.viewDetails\}/);
  assert.match(source, /onClick=\{\(\) => push\(/);
  assert.match(source, /returnTo=/);
  assert.doesNotMatch(source, /<tr[^>]+onClick=/);
});

test("3-6. Canonical status labels; no accepted/superseded; codes stable", () => {
  assert.equal(getQuotationStatusLabel("en", "draft"), "Draft");
  assert.equal(getQuotationStatusLabel("ar", "draft"), "مسودة");
  assert.equal(getQuotationStatusLabel("ar", "sent"), "مُرسل");
  assert.equal(getQuotationStatusLabel("ar", "approved"), "معتمد");
  assert.equal(getQuotationStatusLabel("ar", "rejected"), "مرفوض");
  assert.equal(getQuotationStatusLabel("ar", "expired"), "منتهي الصلاحية");

  const en = getQuotationsDictionary("en");
  assert.deepEqual(Object.keys(en.statuses).sort(), [...CANONICAL_STATUSES].sort());
  assert.equal(Object.prototype.hasOwnProperty.call(en.statuses, "accepted"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(en.statuses, "superseded"), false);
  // Status filter UI options match pre-task set (no new expired filter option).
  assert.match(read(LIST_CLIENT), /value="draft"/);
  assert.match(read(LIST_CLIENT), /value="sent"/);
  assert.match(read(LIST_CLIENT), /value="approved"/);
  assert.match(read(LIST_CLIENT), /value="rejected"/);
  assert.doesNotMatch(read(LIST_CLIENT), /value="expired"/);
  // Expired remains a canonical display status for badges/detail.
  assert.equal(en.statuses.expired, "Expired");
  assert.equal(getQuotationStatusLabel("ar", "expired"), "منتهي الصلاحية");
  assert.match(read(LIST_CLIENT), /getQuotationStatusLabel/);
});

test("7-8. Create/edit form copy and draft-only edit contracts", () => {
  const en = getQuotationsDictionary("en");
  const ar = getQuotationsDictionary("ar");
  assert.equal(en.form.newTitle, "New Quotation");
  assert.equal(ar.form.newTitle, "عرض سعر جديد");
  assert.equal(en.form.createQuotation, "Create Quotation");
  assert.equal(ar.form.createQuotation, "إنشاء عرض سعر");
  assert.equal(en.form.editTitle, "Edit Quotation");
  assert.equal(ar.form.editTitle, "تعديل عرض السعر");
  assert.equal(ar.form.lineItems, "بنود عرض السعر");
  assert.equal(ar.form.addItem, "إضافة بند");
  assert.equal(ar.form.removeItem, "إزالة البند");
  assert.equal(ar.form.subtotal, "المجموع الفرعي");
  assert.equal(ar.form.grandTotal, "الإجمالي");
  assert.match(read(FORM), /createQuotation|updateQuotation/);
  assert.match(read(FORM), /service_id: service\.id/);
  assert.match(read(EDIT), /quotation\.status !== "draft"/);
  assert.match(read(EDIT), /requirePermission\("quotations:write"\)/);
  assert.match(read(EDIT), /dictionary\.editStates\.locked/);
});

test("9. Detail headings, item table, totals, and metadata localize", () => {
  const en = getQuotationsDictionary("en");
  const ar = getQuotationsDictionary("ar");
  assert.equal(ar.detail.sections.details, "تفاصيل عرض السعر");
  assert.equal(ar.detail.sections.lineItems, "بنود عرض السعر");
  assert.equal(ar.detail.labels.issueDate, "تاريخ الإصدار");
  assert.equal(ar.detail.labels.validUntil, "صالح حتى");
  assert.equal(ar.detail.labels.grandTotal, "الإجمالي");
  assert.equal(en.detail.sections.billingAuthority, "Billing Authority");
  assert.equal(ar.detail.sections.billingAuthority, "مرجعية الفوترة");
  assert.equal(
    en.detail.billingAuthority.openServiceBilling,
    "Open Service billing",
  );
  assert.equal(
    ar.detail.billingAuthority.amountUnavailable,
    "المبلغ غير متاح",
  );
  assert.match(read(DETAIL), /getQuotationStatusLabel/);
  assert.match(read(DETAIL), /formatSarAmount|formatMoney/);
  assert.match(read(DETAIL), /item\.description/);
});

test("10-12. Service scope required; customer from Service; multi-quotation allowed", () => {
  const newPage = read(NEW_PAGE);
  assert.match(newPage, /serviceId/);
  assert.match(newPage, /selectServiceTitle|Select a Service/);
  assert.match(newPage, /getServiceById/);
  assert.match(newPage, /Inquiry.*Quoted|serviceCanReceiveQuotation/);
  assert.doesNotMatch(newPage, /customer_id:\s*searchParams|customerId\s*=\s*searchParams/);
  assert.match(read(FORM), /service\.customer/);
  assert.match(read(FORM), /service_id: service\.id/);
  // No UNIQUE(service_id) constraint introduced in UI/schemas
  assert.doesNotMatch(read(SCHEMAS), /UNIQUE\s*\(\s*service_id\s*\)/i);
});

test("13-16. Approval separate from write; Sales lacks approve; approved locked; actions unchanged", () => {
  const permissions = read(PERMISSIONS);
  const salesBlock = permissions.match(/sales:\s*\[([\s\S]*?)\],\s*operations:/)?.[1] ?? "";
  const managerBlock = permissions.match(/manager:\s*\[([\s\S]*?)\],\s*sales:/)?.[1] ?? "";
  assert.equal(salesBlock.includes("quotations:write"), true);
  assert.equal(salesBlock.includes("quotations:approve"), false);
  assert.equal(managerBlock.includes("quotations:approve"), true);

  assert.match(read(DETAIL), /checkPermission\("quotations:approve"\)/);
  assert.match(read(APPROVAL), /approveQuotation|rejectQuotation/);
  assert.match(read(APPROVAL), /status === "approved" \|\| status === "rejected"/);
  assert.match(read(LIST_CLIENT), /quotation\.status === "approved"/);
  assert.match(read(LIST_CLIENT), /onlyDraftEditable|approvedCannotDelete/);
  assert.match(read(LIST_CLIENT), /status === "draft"/);
});

test("17. Issue-date and valid-until validation contracts remain", () => {
  const form = read(FORM);
  assert.match(form, /validUntilBeforeIssueDate|valid_until/);
  assert.match(form, /validUntilAfterServiceStart/);
  assert.match(form, /serviceAlreadyStarted/);
  assert.match(form, /valid_until: validUntil/);
  assert.match(form, /new Date\(validUntil\) < new Date\(date\)/);
});

test("18-20. Server total authority; no client-trusted totals; number generation untouched", () => {
  const form = read(FORM);
  assert.match(form, /CLIENT-SIDE PREVIEW ONLY|Preview only|previewOnly/);
  assert.match(form, /createQuotation|updateQuotation/);
  assert.doesNotMatch(form, /grand_total:\s*grandTotal|subtotal:\s*subtotal/);
  const actions = read(ACTIONS);
  assert.match(actions, /createQuotation|updateQuotation/);
  assert.doesNotMatch(actions, /clientGrandTotal|trustClientTotal/);
});

test("21-23. Shared formatters, Western digits, bidi isolation", () => {
  assert.match(read(LIST_CLIENT), /formatSarAmount/);
  assert.match(read(LIST_CLIENT), /UiDateText|formatUiDate/);
  assert.match(read(LIST_CLIENT), /isolateBidiText\(quotation\.quotationNumber\)/);
  assert.match(read(FORM), /formatSarAmount/);
  assert.match(read(FORM), /isolateBidiText\(service\.serviceNumber\)/);
  assert.match(read(DETAIL), /formatSarAmount|UiDateText|formatUiDate|formatUiNumber/);
  assert.match(read(DETAIL), /isolateBidiText\(quotation\.quotationNumber\)/);
  assert.doesNotMatch(read(LIST_CLIENT), /toLocaleString/);
  assert.doesNotMatch(read(FORM), /toLocaleString/);
  assert.doesNotMatch(read(DETAIL), /toLocaleString/);

  assert.equal(formatSarAmount("ar", 2500), "SAR 2,500.00");
  assert.doesNotMatch(formatSarAmount("ar", 2500), ARABIC_INDIC);
  assert.doesNotMatch(formatUiNumber("ar", 3.5), ARABIC_INDIC);
  assert.doesNotMatch(formatUiDate("ar", "2026-07-10"), ARABIC_INDIC);
});

test("24. Stored customer/Service/event/item text is not translated", () => {
  assert.match(read(LIST_CLIENT), /quotation\.customer\?\.company|quotation\.event/);
  assert.match(read(FORM), /service\.serviceTitle|service\.customer/);
  assert.match(read(DETAIL), /item\.description|quotation\.event/);
  assert.match(read(LIST_CLIENT), /dir="auto"/);
  assert.doesNotMatch(read(LIST_CLIENT), /translateStored|localizeEvent/);
});

test("25-26. Empty/filtered/denied/unavailable states distinct; no raw errors", () => {
  const en = getQuotationsDictionary("en");
  assert.notEqual(en.list.noQuotations, en.list.noFilteredQuotations);
  assert.notEqual(en.states.quotationsForbidden, en.states.quotationsLoadError);
  assert.notEqual(en.states.createForbidden, en.states.selectServiceMessage);
  assert.notEqual(en.editStates.lockedMessage, en.editStates.notFoundMessage);
  assert.match(read(LIST_CLIENT), /noQuotations|noFilteredQuotations/);
  assert.match(read(LIST_PAGE), /quotationsForbidden|quotationsLoadError/);
  for (const file of [LIST_CLIENT, FORM, DETAIL, APPROVAL, NEW_PAGE, EDIT]) {
    assert.doesNotMatch(read(file), /\{error\.message\}/);
    assert.doesNotMatch(read(file), /service_role|PGRST|postgres error/i);
  }
});

test("27-28. VAT mode and tax claims remain safe", () => {
  const form = read(FORM);
  const detail = read(DETAIL);
  assert.match(form, /notApplied|Not applied/);
  assert.match(detail, /isTaxVatNotApplied|notApplied/);
  for (const file of [FORM, DETAIL, LIST_CLIENT]) {
    assert.doesNotMatch(read(file), /ZATCA|FATOORA|Tax Invoice|clearance|QR code|15%/i);
  }
  assert.equal(getQuotationsDictionary("ar").form.notApplied, "غير مطبقة");
});

test("29-30. Quotation detail delegates billing authority without managing ABS lifecycle", () => {
  assert.doesNotMatch(read(LIST_CLIENT), /ApprovedBillingScope|approved_billing_scope/);
  assert.doesNotMatch(read(FORM), /approvedBillingScopes|createInvoiceAction/);
  assert.match(read(DETAIL), /getServiceBillingState/);
  assert.match(read(DETAIL), /QuotationBillingAuthorityCard/);
  assert.doesNotMatch(read(DETAIL), /CreateDepositInvoiceAction|CreateFinalInvoiceAction/);
  assert.doesNotMatch(read(DETAIL), /getInvoicesByQuotationId/);
  assert.doesNotMatch(read(DETAIL), /supersede|voidApprovedBillingScope/);
  assert.doesNotMatch(read(LIST_PAGE), /PaymentsClient|InvoicesListClient/);
});

test("31. No hardcoded English shells on source-proven Quotations Arabic UI surfaces", () => {
  const forbidden = [
    "Access Denied",
    "Quotations",
    "New Quotation",
    "Create Quotation",
    "Edit Quotation",
    "No quotations found",
    "Approve Quotation",
    "Reject Quotation",
  ];
  for (const file of [LIST_PAGE, LIST_CLIENT, NEW_PAGE, FORM, DETAIL, EDIT, APPROVAL]) {
    const source = read(file);
    const offenders = forbidden.filter(
      (phrase) =>
        source.includes(`"${phrase}"`) ||
        source.includes(`'${phrase}'`) ||
        source.includes(`>${phrase}<`),
    );
    assert.deepEqual(offenders, [], `Hardcoded English in ${file}: ${offenders.join(", ")}`);
  }
  assert.match(read(LIST_PAGE), /getCurrentSessionEffectiveLocale/);
  assert.match(read(NEW_PAGE), /getCurrentSessionEffectiveLocale/);
  assert.match(read(DETAIL), /getCurrentSessionEffectiveLocale/);
  assert.match(read(EDIT), /getCurrentSessionEffectiveLocale/);
  assert.match(read(LIST_CLIENT), /useLocale/);
  assert.match(read(FORM), /useLocale/);
});

test("Locale authority and soft-delete guards remain", () => {
  assert.match(read(LIST_CLIENT), /softDeleteQuotation/);
  assert.match(read(LIST_CLIENT), /quotation\.status === "approved"/);
  assert.match(read(LIST_PAGE), /checkPermission\("quotations:write"\)|canWrite/);
  assert.match(read(NEW_PAGE), /requirePermission\("quotations:write"\)/);
});
