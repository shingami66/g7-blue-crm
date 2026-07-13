import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getPaymentMethodLabel,
  getPaymentStatusLabel,
  getPaymentsDictionary,
} from "./dictionaries/payments.ts";
import { getInvoicesDictionary } from "./dictionaries/invoices.ts";
import { formatSarAmount, formatUiDate, formatUiNumber } from "./formatting.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const LIST_PAGE = join(REPO_ROOT, "src/app/(dashboard)/payments/page.tsx");
const LIST_CLIENT = join(REPO_ROOT, "src/app/(dashboard)/payments/PaymentsClient.tsx");
const PAYMENT_MODAL = join(REPO_ROOT, "src/app/(dashboard)/invoices/RecordPaymentModal.tsx");
const QUERIES = join(REPO_ROOT, "src/lib/payments/queries.ts");
const ACTIONS = join(REPO_ROOT, "src/lib/payments/actions.ts");
const SCHEMAS = join(REPO_ROOT, "src/lib/payments/schemas.ts");
const PERMISSIONS = join(REPO_ROOT, "src/lib/auth/permissions.ts");
const INVOICE_DETAIL = join(REPO_ROOT, "src/app/(dashboard)/invoices/[id]/page.tsx");
const BILLING = join(REPO_ROOT, "src/app/(dashboard)/services/[id]/BillingPanel.tsx");

const ARABIC_INDIC = /[٠-٩]/;
const CANONICAL_METHODS = ["bank_transfer", "cash", "cheque", "online"] as const;
const CANONICAL_STATUSES = ["pending", "confirmed", "failed", "refunded"] as const;

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

test("1. Payments dictionary English/Arabic shapes stay aligned", () => {
  const en = getPaymentsDictionary("en");
  const ar = getPaymentsDictionary("ar");
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
});

test("2. List headings, KPIs, empty state, and columns localize", () => {
  const en = getPaymentsDictionary("en");
  const ar = getPaymentsDictionary("ar");
  assert.equal(en.title, "Payments");
  assert.equal(ar.title, "المدفوعات");
  assert.equal(ar.table.payment, "رقم الدفعة");
  assert.equal(ar.table.invoice, "رقم الفاتورة");
  assert.equal(ar.table.empty, "لم يتم العثور على مدفوعات");
  assert.equal(ar.states.paymentDataUnavailable, "بيانات المدفوعات غير متاحة");
  assert.match(read(LIST_CLIENT), /dictionary\.title/);
  assert.match(read(LIST_CLIENT), /KpiCard/);
  assert.match(read(LIST_CLIENT), /itemsPerPage = 10/);
  assert.match(read(LIST_CLIENT), /PaginationFooter/);
});

test("3-6. Methods and statuses: codes stable; display labels only; no invented options", () => {
  assert.equal(getPaymentMethodLabel("ar", "bank_transfer"), "تحويل بنكي");
  assert.equal(getPaymentMethodLabel("ar", "cash"), "نقداً");
  assert.equal(getPaymentMethodLabel("ar", "cheque"), "شيك");
  assert.equal(getPaymentMethodLabel("ar", "online"), "دفع إلكتروني");
  assert.equal(getPaymentStatusLabel("en", "pending"), "Pending");
  assert.equal(getPaymentStatusLabel("ar", "confirmed"), "مؤكدة");
  assert.equal(getPaymentStatusLabel("ar", "failed"), "فاشلة");
  assert.equal(getPaymentStatusLabel("ar", "refunded"), "مستردة");

  const en = getPaymentsDictionary("en");
  assert.deepEqual(Object.keys(en.methods).sort(), [...CANONICAL_METHODS].sort());
  assert.deepEqual(Object.keys(en.statuses).sort(), [...CANONICAL_STATUSES].sort());
  assert.equal(Object.prototype.hasOwnProperty.call(en.methods, "card"), false);
  assert.equal(Object.prototype.hasOwnProperty.call(en.statuses, "cleared"), false);

  // No status/method filter UI invented
  assert.doesNotMatch(read(LIST_CLIENT), /option value=|<select/);
});

test("7-10. RecordPaymentModal owned by Payments; action/payload preserved", () => {
  const modalDict = getInvoicesDictionary("ar").paymentModal;
  assert.equal(modalDict.title, "تسجيل دفعة");
  assert.equal(modalDict.submit, "تسجيل دفعة");
  assert.equal(modalDict.amountSar, "مبلغ الدفعة (SAR)");
  assert.equal(modalDict.balanceDue, "الرصيد المستحق");
  assert.equal(modalDict.success, "تم تسجيل الدفعة بنجاح.");
  assert.equal(modalDict.methods.online, "دفع إلكتروني");

  const modal = read(PAYMENT_MODAL);
  assert.match(modal, /recordPaymentAction/);
  assert.match(modal, /useLocale/);
  assert.match(modal, /formatSarAmount/);
  assert.match(modal, /isolateBidiText/);
  assert.match(modal, /invoiceId,/);
  assert.match(modal, /amount: numericAmount/);
  assert.match(modal, /method,/);
  assert.match(modal, /bank_transfer.*cash.*cheque.*online|bank_transfer/);
  assert.match(modal, /numericAmount > balanceDue/);
  // No lifecycle edit/delete/refund UI
  assert.doesNotMatch(modal, /deletePayment|refundPayment|reversePayment|editPayment/);
});

test("11-13. Invoice linkage and overpayment rules; no standalone payments", () => {
  const actions = read(ACTIONS);
  assert.match(actions, /recordPaymentAction/);
  assert.match(actions, /invoiceId|invoice_id/);
  assert.doesNotMatch(actions, /customerIdOnly|serviceOnlyPayment/);
  assert.match(read(PAYMENT_MODAL), /invoiceId/);
  assert.match(read(PAYMENT_MODAL), /balanceDue/);
});

test("14-16. Sort/pagination/KPI contracts match baseline", () => {
  assert.match(read(QUERIES), /payment_number[\s\S]*ascending:\s*true|order\("payment_number"/);
  assert.match(read(QUERIES), /order\("date"/);
  assert.match(read(QUERIES), /order\("created_at"/);
  assert.match(read(LIST_CLIENT), /itemsPerPage = 10/);
  assert.match(read(LIST_CLIENT), /status === "confirmed"/);
  assert.match(read(LIST_CLIENT), /status === "pending"/);
  // KPI math remains client presentation over full dataset
  assert.match(read(LIST_CLIENT), /buildPaymentStats|confirmedTotal/);
});

test("17-20. Formatting, Western digits, bidi, stored data", () => {
  assert.match(read(LIST_CLIENT), /formatSarAmount/);
  assert.match(read(LIST_CLIENT), /UiDateText|formatUiDate/);
  assert.match(read(LIST_CLIENT), /formatUiNumber/);
  assert.match(read(LIST_CLIENT), /isolateBidiText\(payment\.paymentNumber\)/);
  assert.doesNotMatch(read(LIST_CLIENT), /toLocaleString|Intl\.NumberFormat/);

  assert.equal(formatSarAmount("ar", 900), "SAR 900.00");
  assert.doesNotMatch(formatSarAmount("ar", 900), ARABIC_INDIC);
  assert.doesNotMatch(formatUiNumber("ar", 12), ARABIC_INDIC);
  assert.doesNotMatch(formatUiDate("ar", "2026-07-10"), ARABIC_INDIC);

  assert.match(read(LIST_CLIENT), /payment\.customerName|payment\.reference/);
  assert.match(read(LIST_CLIENT), /dir="auto"/);
  assert.doesNotMatch(read(LIST_CLIENT), /translateStored|localizeCustomer/);
});

test("21-24. Empty/unavailable/denied distinct; no raw errors; RBAC", () => {
  const en = getPaymentsDictionary("en");
  assert.notEqual(en.table.empty, en.states.paymentDataUnavailable);
  assert.notEqual(en.states.accessDeniedMessage, en.states.inlineError);
  assert.match(read(LIST_PAGE), /getCurrentSessionEffectiveLocale/);
  assert.match(read(LIST_PAGE), /ForbiddenError|accessDenied/);
  assert.match(read(PERMISSIONS), /payments:read/);
  for (const file of [LIST_PAGE, LIST_CLIENT, PAYMENT_MODAL]) {
    assert.doesNotMatch(read(file), /\{error\.message\}/);
    assert.doesNotMatch(read(file), /service_role|PGRST|postgres error/i);
  }
});

test("25-28. No schema/action/calculation changes; append-only; VAT/doc exclusions", () => {
  assert.match(read(ACTIONS), /recordPaymentAction/);
  assert.doesNotMatch(read(ACTIONS), /deletePayment|updatePaymentAmount|refundPayment/);
  assert.doesNotMatch(read(LIST_CLIENT), /deletePayment|edit amount|reverse/);
  for (const file of [LIST_CLIENT, LIST_PAGE, PAYMENT_MODAL]) {
    assert.doesNotMatch(read(file), /ZATCA|FATOORA|Tax Invoice|فاتورة ضريبية|15%|clearance/i);
  }
  // Schemas file may or may not exist; action contract is source of truth for methods
  try {
    const schemas = read(SCHEMAS);
    assert.match(schemas, /bank_transfer|cash|cheque|online/);
  } catch {
    // optional
  }
});

test("29-31. Supplier payments excluded; regressions and no hardcoded English shells", () => {
  assert.doesNotMatch(read(LIST_CLIENT), /supplier_payment|Supplier Payment/);
  assert.match(read(INVOICE_DETAIL), /getInvoicesDictionary|formatSarAmount|getInvoiceStatusLabel/);
  assert.match(read(BILLING), /BillingPanel|billingDictionary/);

  const forbidden = [
    "Access Denied",
    "Payments",
    "No payments found",
    "Bank Transfer",
    "Record Payment",
  ];
  for (const file of [LIST_PAGE, LIST_CLIENT]) {
    const source = read(file);
    const offenders = forbidden.filter(
      (phrase) =>
        source.includes(`"${phrase}"`) ||
        source.includes(`'${phrase}'`) ||
        source.includes(`>${phrase}<`),
    );
    assert.deepEqual(offenders, [], `Hardcoded English in ${file}: ${offenders.join(", ")}`);
  }
});

test("Invoice paymentModal dictionary shape remains EN/AR aligned", () => {
  const en = getInvoicesDictionary("en").paymentModal;
  const ar = getInvoicesDictionary("ar").paymentModal;
  assert.deepEqual(listNestedKeys(en).sort(), listNestedKeys(ar).sort());
  assert.equal(en.success.length > 0, true);
  assert.equal(ar.success.includes("تم"), true);
});
