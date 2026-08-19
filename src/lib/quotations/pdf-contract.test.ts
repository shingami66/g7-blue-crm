import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const QUOTATION_PDF = join(
  REPO_ROOT,
  "src/app/(dashboard)/quotations/[id]/pdf/page.tsx",
);
const QUOTATION_DETAIL = join(
  REPO_ROOT,
  "src/app/(dashboard)/quotations/[id]/page.tsx",
);
const INVOICE_PDF = join(
  REPO_ROOT,
  "src/app/(dashboard)/invoices/[id]/pdf/page.tsx",
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

test("Quotation PDF line items conditionally present optional category and details", () => {
  const source = read(QUOTATION_PDF);
  const template = getQuotationTemplate(source);
  const tableStart = template.indexOf('<table className="w-full table-fixed text-start border-collapse">');
  const tableEnd = template.indexOf("</table>", tableStart);
  const table = template.slice(tableStart, tableEnd);

  assert.notEqual(tableStart, -1);
  assert.ok(tableEnd > tableStart);
  assert.match(source, /const hasAnyCategory = quotation\.items\.some\(\(item\) => item\.category\.trim\(\)\.length > 0\);/);

  // An all-empty category set omits the header/cells and uses six fixed columns.
  assert.match(table, /\{hasAnyCategory && \([\s\S]*?dictionary\.quotation\.category/);
  assert.match(table, /\{hasAnyCategory && \([\s\S]*?<td className="py-4 px-2 align-top text-\[12px\] text-start">/);
  assert.deepEqual(table.match(/<col className="w-\[\d+%\]" \/>/g), [
    '<col className="w-[5%]" />', '<col className="w-[31%]" />', '<col className="w-[12%]" />',
    '<col className="w-[8%]" />', '<col className="w-[16%]" />', '<col className="w-[12%]" />',
    '<col className="w-[16%]" />', '<col className="w-[5%]" />', '<col className="w-[39%]" />',
    '<col className="w-[8%]" />', '<col className="w-[17%]" />', '<col className="w-[14%]" />',
    '<col className="w-[17%]" />',
  ]);
  assert.match(table, /colSpan=\{hasAnyCategory \? 7 : 6\}/);

  // A populated category set renders its stored category; an empty row uses only an em dash.
  assert.match(table, /item\.category\.trim\(\) \? <bdi dir="auto">\{item\.category\}<\/bdi> : "—"/);

  // Details remain secondary and appear only when meaningfully present.
  assert.match(table, /<bdi dir="auto">\{item\.description\}<\/bdi>/);
  assert.match(table, /item\.details\?\.trim\(\) && \([\s\S]*?<bdi dir="auto">\{item\.details\}<\/bdi>/);
  assert.doesNotMatch(table, /<div[^>]*dir="auto"/);

  // Numeric and VAT presentation remains isolated and otherwise unchanged.
  assert.match(table, /<span dir="ltr" className="document-bidi-number">\{formatAmountWithCurrency\(item\.unitPrice\)\}<\/span>/);
  assert.match(table, /<span dir="ltr" className="document-bidi-number">\{formatAmountWithCurrency\(item\.total\)\}<\/span>/);
  assert.match(table, /dictionary\.common\.notApplied/);

  // Frozen dashboard and Invoice PDF contracts remain present.
  assert.match(read(QUOTATION_DETAIL), /<bdi dir="auto">\{quotation\.customer\?\.company \|\| dictionary\.detail\.states\.unknownCompany\}<\/bdi>/);
  assert.match(read(INVOICE_PDF), /invoice-print-document/);
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
