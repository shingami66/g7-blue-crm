import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  formatDocumentAmount,
  formatDocumentDate,
  formatDocumentQuantity,
  getInvoiceDocumentPresentation,
  getDocumentDictionary,
  resolveDocumentLocale,
} from "./locale.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const QUOTATION_PDF = join(REPO_ROOT, "src/app/(dashboard)/quotations/[id]/pdf/page.tsx");
const INVOICE_PDF = join(REPO_ROOT, "src/app/(dashboard)/invoices/[id]/pdf/page.tsx");
const QUOTATION_SCHEMA = join(REPO_ROOT, "src/lib/quotations/schemas.ts");
const INVOICE_SCHEMA = join(REPO_ROOT, "src/lib/invoices/schemas.ts");
const QUOTATION_MAPPER = join(REPO_ROOT, "src/lib/quotations/mappers.ts");
const INVOICE_MAPPER = join(REPO_ROOT, "src/lib/invoices/mappers.ts");
const INVOICE_SNAPSHOTS = join(REPO_ROOT, "src/lib/invoices/snapshots.ts");
const SELECTOR = join(REPO_ROOT, "src/components/documents/DocumentLocaleSelect.tsx");

function read(path: string) {
  return readFileSync(path, "utf8");
}

test("presentation language normalizes safely and keeps AR/EN dictionaries aligned", () => {
  assert.equal(resolveDocumentLocale({ lang: "ar" }), "ar");
  assert.equal(resolveDocumentLocale({ lang: "en" }), "en");
  assert.equal(resolveDocumentLocale({ lang: "fr" }), "en");
  assert.equal(resolveDocumentLocale({ lang: ["ar", "en"] }), "ar");
  assert.equal(getDocumentDictionary("ar").locale.label, "اللغة");
  assert.equal(getDocumentDictionary("en").locale.label, "Language");
  assert.equal(getDocumentDictionary("ar").common.print, "طباعة");
  assert.equal(getDocumentDictionary("en").common.print, "Print");
  assert.equal(getDocumentDictionary("ar").quotation.termsAndConditions, "الشروط والأحكام");
});

test("AR and EN fixtures preserve canonical financial authority while changing presentation", () => {
  const canonical = {
    id: "invoice-1",
    number: "INV-2026-001",
    invoiceType: "deposit" as const,
    subtotal: 1000,
    grandTotal: 1150,
    amountPaid: 575,
    balanceDue: 575,
  };
  const represent = (locale: "ar" | "en") => ({
    id: canonical.id,
    number: canonical.number,
    invoiceType: canonical.invoiceType,
    subtotal: canonical.subtotal,
    grandTotal: canonical.grandTotal,
    amountPaid: canonical.amountPaid,
    balanceDue: canonical.balanceDue,
    display: {
      subtotal: formatDocumentAmount(canonical.subtotal, locale),
      grandTotal: formatDocumentAmount(canonical.grandTotal, locale),
    },
    presentation: getInvoiceDocumentPresentation(locale, "vat_registered_phase_1"),
  });
  const english = represent("en");
  const arabic = represent("ar");

  assert.deepEqual(
    { ...english, display: undefined, presentation: undefined },
    { ...arabic, display: undefined, presentation: undefined },
  );
  assert.deepEqual(english.display, arabic.display);
  assert.equal(english.presentation.title, "Tax Invoice");
  assert.equal(arabic.presentation.title, "فاتورة ضريبية");
  assert.equal(resolveDocumentLocale({ lang: "ar" }), "ar");
  assert.equal(resolveDocumentLocale({ lang: "en" }), "en");
});

test("presentation formatting changes only labels, direction, and display formatting", () => {
  assert.equal(formatDocumentAmount(17000, "ar"), "17,000.00");
  assert.equal(formatDocumentAmount(17000, "en"), "17,000.00");
  assert.equal(formatDocumentQuantity(2.5, "ar"), "2.5");
  assert.match(formatDocumentDate("2026-08-09", "ar"), /2026/);
  assert.match(formatDocumentDate("2026-08-09", "en"), /2026/);
});

test("customer-safe scope labels and structured identifiers preserve canonical values", () => {
  const english = getDocumentDictionary("en");
  const arabic = getDocumentDictionary("ar");

  assert.equal(english.invoice.approvedBillingScopeTotal, "Approved Service Scope Total");
  assert.equal(arabic.invoice.approvedBillingScopeTotal, "إجمالي نطاق الخدمة المعتمد");
  assert.doesNotMatch(english.invoice.approvedBillingScopeTotal, /Approved Billing Scope/);
  assert.doesNotMatch(arabic.invoice.approvedBillingScopeTotal, /نطاق الفوترة/);

  const quotationSource = read(QUOTATION_PDF);
  const invoiceSource = read(INVOICE_PDF);
  const sellerIdentifierBoundary = /<span dir="ltr" className="document-bidi-number">\{seller\.entityUnifiedNumber\}<\/span>/;
  const sellerTinBoundary = /<span dir="ltr" className="document-bidi-number">\{seller\.tin\}<\/span>/;

  for (const source of [quotationSource, invoiceSource]) {
    assert.match(source, sellerIdentifierBoundary);
    assert.match(source, sellerTinBoundary);
  }

  assert.match(
    quotationSource,
    /<span dir="ltr" className="document-bidi-number">\{seller\.bank\.iban\}<\/span>/,
  );
});

test("quotation and invoice PDFs select language transiently and never read persisted language authority", () => {
  for (const source of [read(QUOTATION_PDF), read(INVOICE_PDF)]) {
    assert.match(source, /searchParams/);
    assert.match(source, /resolveDocumentLocale\(resolvedSearchParams\)/);
    assert.match(source, /DocumentPreviewToolbar/);
    assert.match(source, /getDocumentDictionary/);
    assert.match(source, /getDirection\(documentLocale\)/);
    assert.match(source, /dir="ltr" className="document-bidi-number"/);
    assert.doesNotMatch(source, /document_locale|readDocumentLocaleFromSnapshot|quotation\.documentLocale|invoice\.document_locale/);
    assert.doesNotMatch(source, /useLocale|getLocale/);
  }

  const selector = read(SELECTOR);
  assert.match(selector, /searchParams\.set\("lang", nextLanguage\)/);
  assert.match(selector, /router\.replace/);
  assert.match(selector, /labels\.hint/);
  assert.match(selector, /dir=\{selectDirection\}/);
  assert.doesNotMatch(selector, /dir="ltr"/);
  assert.match(read(INVOICE_PDF), /getInvoiceDocumentPresentation/);
  assert.doesNotMatch(read(INVOICE_PDF), /invoice\.document_label/);
});

test("PDF preview controls avoid fixed top-bar collision and use responsive shared toolbar", () => {
  const toolbarPath = join(REPO_ROOT, "src/components/documents/DocumentPreviewToolbar.tsx");
  const toolbarSource = read(toolbarPath);

  assert.match(toolbarSource, /DocumentLocaleSelect/);
  assert.match(toolbarSource, /PrintButton/);
  assert.match(toolbarSource, /printHelp/);
  assert.match(toolbarSource, /no-print/);
  assert.doesNotMatch(toolbarSource, /fixed top-4/);

  for (const source of [read(QUOTATION_PDF), read(INVOICE_PDF)]) {
    assert.match(source, /<DocumentPreviewToolbar/);
    assert.doesNotMatch(source, /fixed top-4 right-4/);
  }
});

test("dates render with document direction and are not forced into LTR boundaries", () => {
  const quotationSource = read(QUOTATION_PDF);
  const invoiceSource = read(INVOICE_PDF);

  // Quotation issue date and valid until date use document direction
  assert.match(quotationSource, /dir=\{documentDirection\}>\{formatDocumentDate\(quotation\.date, documentLocale\)\}/);
  assert.match(quotationSource, /dir=\{documentDirection\}>\{formatDocumentDate\(quotation\.validUntil, documentLocale\)\}/);
  assert.doesNotMatch(quotationSource, /dir="ltr">\{formatDocumentDate/);

  // Invoice issue date uses document direction
  assert.match(invoiceSource, /dir=\{documentDirection\}>\{formatDocumentDate\(invoice\.issued_at/);
  assert.doesNotMatch(invoiceSource, /dir="ltr">\{formatDocumentDate/);
});

test("PDF surfaces use logical text alignment for clean RTL mirroring", () => {
  const quotationSource = read(QUOTATION_PDF);
  const invoiceSource = read(INVOICE_PDF);

  // Headquarters blocks use text-end instead of physical text-right
  assert.match(quotationSource, /className="text-end flex flex-col gap-1/);
  assert.match(invoiceSource, /className="text-end flex flex-col gap-1/);

  // Quotation print geometry is fixed while retaining logical table alignment.
  assert.match(quotationSource, /<table className="w-full table-fixed text-start border-collapse">/);
  assert.match(quotationSource, /<colgroup>[\s\S]*?hasAnyCategory[\s\S]*?<\/colgroup>/);
  assert.match(invoiceSource, /table className="w-full table-fixed text-start border-collapse/);

  // Footers use text-end for official stamp
  assert.match(invoiceSource, /className="text-end">/);
});

test("AR and EN quotation representations consume the same canonical quotation authority", () => {
  const source = read(QUOTATION_PDF);
  assert.match(source, /formatAmountWithCurrency\(quotation\.subtotal\)/);
  assert.match(source, /formatAmountWithCurrency\(quotation\.grandTotal\)/);
  assert.match(source, /formatDocumentAmount\(val, documentLocale\)/);
  assert.match(source, /quotation\.quotationNumber/);
  assert.match(source, /quotation\.event/);
  assert.match(source, /quotation\.items\.map/);
  assert.match(source, /seller\.terms/);
});

test("AR and EN deposit/final representations retain invoice and settlement authority", () => {
  const source = read(INVOICE_PDF);
  for (const field of [
    "invoice.invoice_number",
    "invoice.invoice_type",
    "invoice.grand_total",
    "invoice.amount_paid",
    "invoice.balance_due",
    "dictionary.invoice.depositSummary",
    "dictionary.invoice.finalSummary",
    "finalInvoiceSettlement",
  ]) {
    assert.match(source, new RegExp(field.replace(/[.*+?^${}()|[\\]\\]/g, "\\\\$&")));
  }
  assert.match(source, /formatAmountWithCurrency\(invoice\.grand_total\)/);
  assert.match(source, /formatAmountWithCurrency\(invoice\.amount_paid\)/);
  assert.match(source, /formatAmountWithCurrency\(invoice\.balance_due\)/);
});

test("quotation and invoice creation/snapshot boundaries contain no permanent language field", () => {
  for (const path of [QUOTATION_SCHEMA, INVOICE_SCHEMA, QUOTATION_MAPPER, INVOICE_MAPPER, INVOICE_SNAPSHOTS]) {
    assert.doesNotMatch(read(path), /document_locale|documentLocale/);
  }
  assert.match(read(INVOICE_SNAPSHOTS), /terms:\s*settings\.default_terms/);
  assert.match(read(INVOICE_SNAPSHOTS), /buildDocumentRulesSnapshot/);
});

test("legacy customer descriptions remain stored text without automatic translation", () => {
  for (const source of [read(QUOTATION_PDF), read(INVOICE_PDF)]) {
    assert.match(source, /item\.description/);
    assert.doesNotMatch(source, /translateStored|localizeCustomer|autoTranslate|translationDraft/);
  }
});
