import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const QUOTATION_PDF = join(
  REPO_ROOT,
  "src/app/(dashboard)/quotations/[id]/pdf/page.tsx",
);
const PRINT_CSS = join(REPO_ROOT, "src/app/globals.css");

function read(path: string) {
  return readFileSync(path, "utf8");
}

function getQuotationTemplate(source: string) {
  const start = source.lastIndexOf("return (");
  const end = source.length;
  assert.notEqual(start, -1, "Quotation PDF return block must exist");
  return source.slice(start, end);
}

function getPrintStyles(source: string) {
  const start = source.indexOf("@media print {");
  assert.notEqual(start, -1, "print media block must exist");
  return source.slice(start);
}

test("Quotation customer PDF removes internal-only presentation", () => {
  const source = read(QUOTATION_PDF);
  const template = getQuotationTemplate(source);

  for (const removed of [
    "Prepared By",
    "System Generated",
    "item.details",
    "Page 1 of 1",
    "This is a system generated document.",
  ]) {
    assert.doesNotMatch(template, new RegExp(removed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }

  assert.doesNotMatch(
    template,
    /font-\[cursive\][\s\S]*?>\s*System\s*</,
    "the removed standalone System signature must not remain",
  );
  assert.doesNotMatch(source, /System generated totals shown as values\./);
  assert.match(template, /item\.description/);
  assert.match(template, /item\.category/);
  assert.match(template, /formatQuantity\(item\.qty\)/);
  assert.match(template, /formatAmountWithCurrency\(item\.unitPrice\)/);
  assert.match(template, /dictionary\.common\.notApplied/);
  assert.match(template, /formatAmountWithCurrency\(item\.total\)/);
  assert.match(template, /formatAmountWithCurrency\(quotation\.subtotal\)/);
  assert.match(template, /formatAmountWithCurrency\(quotation\.discount\)/);
  assert.match(template, /formatAmountWithCurrency\(quotation\.grandTotal\)/);
  assert.match(template, /dictionary\.common\.clientApproval/);
  assert.match(template, /dictionary\.common\.signatureDate/);
  assert.match(template, /dictionary\.common\.officialStamp/);
  assert.match(template, /seller\.bank\.bankName/);
  assert.match(template, /seller\.bank\.accountName/);
  assert.match(template, /seller\.bank\.iban/);
  assert.match(template, /seller\.terms/);
  assert.match(template, /dictionary\.quotation\.termsAndConditions/);
  assert.match(template, /quotation\.quotationNumber/);
  assert.match(template, /quotation\.date/);
  assert.match(template, /quotation\.validUntil/);
  assert.match(template, /buyer\.name/);
  assert.match(template, /quotation\.event/);
});

test("Quotation print contract preserves A4 and natural pagination", () => {
  const styles = read(PRINT_CSS);
  const print = getPrintStyles(styles);
  const keepTogetherRule = print.match(
    /\.quotation-print-document header,[\s\S]*?page-break-inside: avoid;/,
  )?.[0];

  assert.match(styles, /@page\s*\{\s*size: A4;/);
  assert.match(print, /\.a4-page\s*\{[\s\S]*?width: 100% !important;/);
  assert.match(print, /\.quotation-print-document thead\s*\{\s*display: table-header-group;/);
  assert.match(
    print,
    /\.quotation-print-document tr\s*\{[\s\S]*?break-inside: avoid;[\s\S]*?page-break-inside: avoid;/,
  );
  assert.ok(keepTogetherRule, "major Quotation blocks must retain a scoped keep-together rule");
  assert.doesNotMatch(keepTogetherRule, /quotation-print-footer/);
  assert.match(keepTogetherRule, /quotation-print-terms/);
  assert.doesNotMatch(read(QUOTATION_PDF), /@\/app\/\(dashboard\)\/invoices|@\/lib\/invoices/);
  assert.doesNotMatch(read(QUOTATION_PDF), /getLocale|useLocale/);
  assert.match(read(QUOTATION_PDF), /getDocumentDictionary/);
  assert.match(read(QUOTATION_PDF), /searchParams/);
  assert.match(read(QUOTATION_PDF), /resolveDocumentLocale\(resolvedSearchParams\)/);
  assert.doesNotMatch(read(QUOTATION_PDF), /quotation\.documentLocale|document_locale|readDocumentLocaleFromSnapshot/);
  assert.match(read(QUOTATION_PDF), /dir=\{documentDirection\}/);
});
