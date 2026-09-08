import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string) =>
  readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

const INVOICES_CLIENT = "src/app/(dashboard)/invoices/InvoicesListClient.tsx";

test("1. Desktop Invoice table remains", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /className="hidden md:block w-full overflow-x-auto"/);
  assert.match(source, /<table className="w-full min-w-\[1060px\] table-fixed border-collapse text-start">/);
});

test("2. Desktop table retains all existing operational columns", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /const INVOICE_COLUMN_WIDTHS = \[/);
  assert.match(source, /const INVOICE_COLUMN_ALIGNMENTS = \[/);
  assert.match(source, /\{INVOICE_COLUMN_WIDTHS\.map\(\(width, index\) => <col key=\{index\} className=\{width\} \/>\)\}/);

  const headers = [
    "dictionary.list.table.invoice",
    "dictionary.list.table.type",
    "dictionary.list.table.document",
    "dictionary.list.table.customer",
    "dictionary.list.table.issueDate",
    "dictionary.list.table.amountSar",
    "dictionary.list.table.status",
    "dictionary.list.table.preview",
    "dictionary.list.table.printPdf",
  ];
  let lastIndex = -1;
  for (const header of headers) {
    const idx = source.indexOf(header);
    assert.ok(idx > lastIndex, `${header} should be present in operational column order`);
    lastIndex = idx;
  }
});

test("3. Mobile Invoice card representation exists", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /data-testid="mobile-invoice-cards"/);
  assert.match(source, /className="block md:hidden divide-y divide-surface-variant"/);
});

test("4. Mobile cards expose invoice number", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /\{isolateBidiText\(invoice\.invoice_number \|\| invoice\.id\)\}/);
});

test("5. Mobile cards expose status", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /<StatusBadge variant=\{invoiceStatusBadgeVariant\[invoice\.status\]\}>/);
  assert.match(cardSection, /\{getInvoiceStatusLabel\(dictionary\.locale, invoice\.status\)\}/);
});

test("6. Mobile cards expose issue date", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /<UiDateText locale=\{locale\} value=\{invoice\.issued_at \?\? invoice\.created_at\} \/>/);
});

test("7. Mobile cards expose invoice type", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /invoice\.invoice_type \? getInvoiceTypeLabel\(locale, invoice\.invoice_type\) : "—"/);
});

test("8. Mobile cards expose document label", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /\{getInvoiceDocumentLabelDisplay\(locale, invoice\.document_label\)\}/);
});

test("9. Mobile cards expose customer", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /<div className="font-semibold text-on-surface break-words text-\[14px\]" dir="auto">[\s\S]*?\{invoice\.customer\}[\s\S]*?<\/div>/);
});

test("10. Mobile cards expose formatted amount", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /\{dictionary\.list\.table\.amountSar\}/);
  assert.match(cardSection, /\{formatSarAmount\(locale, invoice\.grand_total\)\}/);
});

test("11. Invoice number remains LTR isolated", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /dir="ltr" className="font-mono font-semibold text-primary text-\[14px\]">[\s\S]*?\{isolateBidiText\(invoice\.invoice_number \|\| invoice\.id\)\}/);
});

test("12. Amount remains LTR/tabular isolated", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /className="font-semibold text-on-surface text-\[14px\] tabular-nums" dir="ltr">[\s\S]*?\{formatSarAmount\(locale, invoice\.grand_total\)\}/);
});

test("13. View href and returnTo semantics are unchanged", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /const returnTo = invoiceListHref\(query, pagination\.page\);/);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /href=\{`\/invoices\/\$\{invoice\.id\}\?returnTo=\$\{encodeURIComponent\(returnTo\)\}`\}/);
});

test("14. View still uses PendingLink/navigationPending", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /<PendingLink[\s\S]*?pendingLabel=\{dictionary\.list\.navigationPending\}[\s\S]*?\{dictionary\.list\.table\.preview\}/);
});

test("15. Print/PDF route semantics remain unchanged", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);
  assert.match(cardSection, /window\.open\(`\/invoices\/\$\{invoice\.id\}\/pdf`, "_blank", "noopener,noreferrer"\)/);
  assert.match(cardSection, /\{dictionary\.list\.table\.printPdf\}/);
});

test("16. Search modes remain invoiceNumber + customer", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /value: "invoiceNumber"/);
  assert.match(source, /value: "customer"/);
  assert.match(source, /onSubmit=\{\(mode, search\) => updateQuery\(\{ searchMode: mode as InvoiceSearchMode, search: search \|\| undefined \}, "search"\)\}/);
});

test("17. Status query semantics remain unchanged", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /updateQuery\(\{ status: event\.target\.value === "all" \? undefined : event\.target\.value \}\)/);
  for (const status of ["all", "paid", "overdue", "draft", "sent", "partial", "cancelled", "voided"]) {
    assert.match(source, new RegExp(`value="${status}"`));
  }
});

test("18. Pagination behavior remains unchanged", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /<PaginationFooter/);
  assert.match(source, /paginationMode="bounded"/);
  assert.match(source, /onPageChange=\{\(page\) => navigate\(invoiceListHref\(query, page\), "push"\)\}/);
  assert.match(source, /onPageSizeChange=\{\(pageSize: ListPageSize\) => updateQuery\(\{ pageSize \}\)\}/);
});

test("19. Business-year behavior remains unchanged", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /cleanBusinessYearParam\(query\.year \?\? getCurrentBusinessYear\(\)\)/);
});

test("20. Mobile filter composition does not rely on the desktop min-width table", () => {
  const source = read(INVOICES_CLIENT);
  assert.match(source, /<div className="w-full sm:flex-1 sm:min-w-0">[\s\S]*?<ModuleSearchControl/);
  assert.match(source, /<div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">/);
  assert.match(source, /className="w-full sm:w-auto appearance-none rounded-lg/);

  const cardStart = source.indexOf('data-testid="mobile-invoice-cards"');
  assert.ok(cardStart !== -1);
  const cardSnippet = source.slice(cardStart, cardStart + 200);
  assert.doesNotMatch(cardSnippet, /overflow-x-auto/);
  assert.doesNotMatch(cardSnippet, /min-w-/);
});

test("21. No DB/RPC/auth/RBAC/financial logic changed", () => {
  const source = read(INVOICES_CLIENT);
  assert.doesNotMatch(source, /supabase\.rpc|createClient|from\(["']|INSERT INTO|UPDATE\s+|DELETE FROM/);
});

test("22. EN/AR/Bidi contracts remain intact", () => {
  const source = read(INVOICES_CLIENT);
  const cardStart = source.indexOf('className="block md:hidden');
  assert.ok(cardStart !== -1);
  const cardSection = source.slice(cardStart);

  assert.match(cardSection, /dir="auto"/);
  assert.match(cardSection, /dir="ltr"/);
  assert.match(cardSection, /isolateBidiText/);

  // Canonical G7 design tokens
  assert.match(cardSection, /bg-surface/);
  assert.match(cardSection, /text-primary/);
  assert.match(cardSection, /text-on-surface/);
  assert.match(cardSection, /text-on-surface-variant/);
  assert.match(cardSection, /divide-surface-variant/);
  assert.match(cardSection, /border-outline-variant/);
});
