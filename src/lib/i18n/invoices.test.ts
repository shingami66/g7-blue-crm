import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getInvoiceDocumentLabelDisplay,
  getInvoiceStatusLabel,
  getInvoiceTypeLabel,
  getInvoicesDictionary,
} from "./dictionaries/invoices.ts";
import { formatSarAmount, formatUiDate, formatUiNumber } from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const LIST_PAGE = join(REPO_ROOT, "src/app/(dashboard)/invoices/page.tsx");
const LIST_CLIENT = join(REPO_ROOT, "src/app/(dashboard)/invoices/InvoicesListClient.tsx");
const DETAIL = join(REPO_ROOT, "src/app/(dashboard)/invoices/[id]/page.tsx");
const ISSUE = join(REPO_ROOT, "src/app/(dashboard)/invoices/IssueInvoiceAction.tsx");
const PAYMENT_MODAL = join(REPO_ROOT, "src/app/(dashboard)/invoices/RecordPaymentModal.tsx");
const PDF = join(REPO_ROOT, "src/app/(dashboard)/invoices/[id]/pdf/page.tsx");
// RecordPaymentModal is Payments-deferred; path retained only for ownership boundary assertions.
const PERMISSIONS = join(REPO_ROOT, "src/lib/auth/role-permissions.ts");
const ACTIONS = join(REPO_ROOT, "src/lib/invoices/actions.ts");
const SCHEMAS = join(REPO_ROOT, "src/lib/invoices/schemas.ts");
const MAPPERS = join(REPO_ROOT, "src/lib/invoices/mappers.ts");
const BILLING_PANEL = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/BillingPanel.tsx",
);

const ARABIC_INDIC = /[٠-٩]/;
const CANONICAL_STATUSES = [
  "draft",
  "sent",
  "paid",
  "partial",
  "overdue",
  "cancelled",
  "voided",
] as const;
const FILTER_OPTIONS = [
  "all",
  "paid",
  "overdue",
  "draft",
  "sent",
  "partial",
  "cancelled",
  "voided",
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

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("1. Invoices dictionary English/Arabic shapes stay aligned", () => {
  const en = getInvoicesDictionary("en");
  const ar = getInvoicesDictionary("ar");
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
});

test("2. List headings, filters, result count, and row actions localize", () => {
  const en = getInvoicesDictionary("en");
  const ar = getInvoicesDictionary("ar");
  assert.equal(en.list.title, "Invoices");
  assert.equal(ar.list.title, "الفواتير");
  assert.equal(ar.list.table.invoice, "رقم الفاتورة");
  assert.equal(ar.list.table.preview, "عرض");
  assert.equal(ar.list.table.noInvoices, "لم يتم العثور على فواتير");
  assert.equal(ar.list.table.noFilteredInvoices, "لا توجد فواتير مطابقة للفلاتر الحالية");
  assert.match(en.list.summary.showingRange, /\{start\}.*\{end\}.*\{count\}/);
  assert.match(read(LIST_CLIENT), /dictionary\.list\.title/);
  assert.match(read(LIST_CLIENT), /PaginationFooter/);
  assert.match(read(LIST_CLIENT), /ModuleSearchControl/);
  assert.match(read(LIST_CLIENT), /searchModeLabel/);
  assert.doesNotMatch(read(LIST_CLIENT), /resetFilters|resetLabel|onReset/);
});

test("3-6. Type/status labels; codes stable; no new types; filter set preserved", () => {
  assert.equal(getInvoiceTypeLabel("en", "deposit"), "Deposit Invoice");
  assert.equal(getInvoiceTypeLabel("ar", "deposit"), "فاتورة دفعة مقدمة");
  assert.equal(getInvoiceTypeLabel("ar", "final"), "الفاتورة النهائية");
  assert.equal(getInvoiceStatusLabel("ar", "draft"), "مسودة");
  assert.equal(getInvoiceStatusLabel("ar", "sent"), "صادرة");
  assert.equal(getInvoiceStatusLabel("ar", "paid"), "مدفوعة");

  const en = getInvoicesDictionary("en");
  assert.deepEqual(Object.keys(en.statuses).sort(), [...CANONICAL_STATUSES].sort());
  assert.deepEqual(Object.keys(en.invoiceTypes).sort(), ["deposit", "final"]);
  assert.equal(Object.prototype.hasOwnProperty.call(en.invoiceTypes, "progress"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(en.statuses, "cleared"), false);

  const client = read(LIST_CLIENT);
  for (const option of FILTER_OPTIONS) {
    assert.match(client, new RegExp(`value="${option}"`));
  }
  // No newly invented filter values beyond the existing set
  assert.doesNotMatch(client, /value="progress"|value="credit"/);
});

test("7. Document-label UI mapping is display-only", () => {
  assert.equal(
    getInvoiceDocumentLabelDisplay("en", "Commercial Invoice"),
    "Commercial Invoice",
  );
  assert.equal(
    getInvoiceDocumentLabelDisplay("ar", "Commercial Invoice"),
    "فاتورة تجارية",
  );
  // Tax Invoice is not localized as an available tax document type
  assert.equal(getInvoiceDocumentLabelDisplay("ar", "Tax Invoice"), "Tax Invoice");
  assert.match(read(LIST_CLIENT), /getInvoiceDocumentLabelDisplay/);
  assert.match(read(DETAIL), /getInvoiceDocumentLabelDisplay/);
  // Mapping must not rewrite stored labels in mappers/actions
  assert.doesNotMatch(read(MAPPERS), /فاتورة تجارية|documentLabels/);
  assert.doesNotMatch(read(ACTIONS), /فاتورة تجارية/);
});

test("8-11. Detail, line items, financial summary, passive settlement", () => {
  const ar = getInvoicesDictionary("ar");
  assert.equal(ar.detail.sections.overview, "تفاصيل الفاتورة");
  assert.equal(ar.detail.sections.lineItems, "بنود الفاتورة");
  assert.equal(ar.detail.labels.grandTotal, "الإجمالي");
  assert.equal(ar.detail.labels.amountPaid, "المبلغ المسدد");
  assert.equal(ar.detail.labels.balanceDue, "الرصيد المستحق");
  assert.equal(ar.detail.sections.settlement, "سجل المدفوعات");
  assert.match(read(DETAIL), /formatSarAmount|formatAmount/);
  assert.match(read(DETAIL), /amount_paid|balance_due/);
  assert.match(read(DETAIL), /item\.description|description/);
  assert.match(read(DETAIL), /vat_mode === "not_registered"/);
});

test("12-14. Service/quotation references; ABS not rewritten; no invoice-to-invoice FK UI", () => {
  const detail = read(DETAIL);
  assert.match(detail, /service_id|getServiceById/);
  assert.match(detail, /approved_quotation_id/);
  assert.doesNotMatch(detail, /parent_invoice_id|deposit_invoice_id|related_invoice_id/);
  assert.doesNotMatch(detail, /voidInvoice|reverseInvoice|creditNote|replacementInvoice/);
  // No ABS management mutations
  assert.doesNotMatch(detail, /approveBillingScope|voidApprovedBillingScope/);
});

test("15-16. PDF controls are UI-only; PDF body excluded", () => {
  assert.match(read(LIST_CLIENT), /\/invoices\/\$\{invoice\.id\}\?returnTo=/);
  assert.match(read(LIST_CLIENT), /window\.open\(`\/invoices\/\$\{invoice\.id\}\/pdf`/);
  assert.match(read(DETAIL), /\/invoices\/\$\{invoice\.id\}\/pdf/);
  assert.match(read(DETAIL), /printPdf|Print/);
  // PDF route not localized by this task
  assert.match(read(PDF), /Commercial Invoice|toLocaleString/);
  assert.doesNotMatch(read(PDF), /getInvoicesDictionary|useLocale/);
});

test("17-20. Issue action and no financial mutation changes; payment modal deferred", () => {
  const en = getInvoicesDictionary("en");
  const ar = getInvoicesDictionary("ar");
  assert.equal(en.issueAction.submit, "Issue Invoice");
  assert.equal(ar.issueAction.submit, "إصدار الفاتورة");
  assert.match(read(ISSUE), /issueInvoiceAction/);
  assert.match(read(ISSUE), /dictionary\.success|dictionary\.errors/);
  // RecordPaymentModal is Payments-owned; list/detail still must not invent payment lifecycle writes.
  assert.match(read(PAYMENT_MODAL), /recordPaymentAction/);
  assert.match(read(ACTIONS), /export async function issueInvoiceAction|createInvoiceAction/);
  assert.match(read(SCHEMAS), /deposit.*final|invoiceType/);
  assert.doesNotMatch(read(DETAIL), /voidInvoice|refundPayment|reversePayment/);
});

test("21-24. Formatters, Western digits, bidi, stored data", () => {
  assert.match(read(LIST_CLIENT), /formatSarAmount/);
  assert.match(read(LIST_CLIENT), /UiDateText|formatUiDate/);
  assert.match(read(LIST_CLIENT), /isolateBidiText/);
  assert.match(read(DETAIL), /formatSarAmount|UiDateText|formatUiDate|formatUiNumber/);
  assert.match(read(DETAIL), /isolateBidiText/);
  assert.doesNotMatch(read(LIST_CLIENT), /toLocaleString/);
  assert.doesNotMatch(read(DETAIL), /toLocaleString/);

  assert.equal(formatSarAmount("ar", 12500), "SAR 12,500.00");
  assert.doesNotMatch(formatSarAmount("ar", 12500), ARABIC_INDIC);
  assert.doesNotMatch(formatUiNumber("ar", 3), ARABIC_INDIC);
  assert.doesNotMatch(formatUiDate("ar", "2026-07-10"), ARABIC_INDIC);

  assert.match(read(LIST_CLIENT), /invoice\.customer/);
  assert.match(read(DETAIL), /dir="auto"/);
  assert.doesNotMatch(read(DETAIL), /translateStored|localizeCustomer/);
});

test("25-26. Empty/filtered/denied/unavailable distinct; no raw errors", () => {
  const en = getInvoicesDictionary("en");
  assert.notEqual(en.list.table.noInvoices, en.list.table.noFilteredInvoices);
  assert.notEqual(en.states.invoicesForbidden, en.states.invoicesLoadError);
  assert.notEqual(en.detail.states.detailForbidden, en.detail.states.unavailable);
  assert.match(read(LIST_PAGE), /invoices:read|requirePermission/);
  for (const file of [LIST_PAGE, LIST_CLIENT, DETAIL, ISSUE, PAYMENT_MODAL]) {
    assert.doesNotMatch(read(file), /\{error\.message\}/);
    assert.doesNotMatch(read(file), /service_role|PGRST|postgres error/i);
  }
});

test("27-30. VAT, ABS, financial invariants, no new lifecycle writes", () => {
  assert.match(read(DETAIL), /vat_mode === "not_registered"/);
  assert.equal(getInvoicesDictionary("ar").detail.states.notApplied, "غير مطبق");
  for (const file of [LIST_CLIENT, DETAIL, ISSUE]) {
    assert.doesNotMatch(read(file), /ZATCA|FATOORA|Tax Invoice|فاتورة ضريبية|15%|clearance/i);
  }
  assert.doesNotMatch(read(ACTIONS), /status:\s*"voided"|voided_at:\s*new Date/);
  assert.doesNotMatch(read(DETAIL), /status:\s*"voided"/);
  // Service operational billing still uses services dictionary deposit terminology
  assert.match(read(BILLING_PANEL), /BillingPanel|billingDictionary/);
});

test("31-32. Payments/PDF modules excluded; no hardcoded English shells", () => {
  assert.doesNotMatch(read(LIST_PAGE), /PaymentsClient/);
  assert.doesNotMatch(read(LIST_CLIENT), /PaymentsClient/);
  const forbidden = [
    "Access Denied",
    "Invoices",
    "No invoices found",
    "Deposit Invoice",
    "Final Invoice",
    "Commercial Invoice",
    "Issue Invoice",
    "Record Payment",
  ];
  for (const file of [LIST_PAGE, LIST_CLIENT, DETAIL, ISSUE]) {
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
  assert.match(read(DETAIL), /getCurrentSessionEffectiveLocale/);
});

test("RBAC and issue permission remain", () => {
  const permissions = read(PERMISSIONS);
  assert.match(permissions, /invoices:read/);
  assert.match(read(DETAIL), /checkPermission\("invoices:write"\)|canIssueInvoice/);
  assert.match(read(ISSUE), /issueInvoiceAction/);
});
