import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../..");
const read = (path: string) =>
  readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

const MODULE_SEARCH_CONTROL = "src/components/ui/ModuleSearchControl.tsx";
const CUSTOMERS_CLIENT = "src/app/(dashboard)/customers/CustomersClient.tsx";
const QUOTATIONS_CLIENT = "src/app/(dashboard)/quotations/QuotationsClient.tsx";
const SERVICES_CLIENT = "src/app/(dashboard)/services/ServicesClient.tsx";
const SUPPLIERS_CLIENT = "src/app/(dashboard)/suppliers/SuppliersClient.tsx";
const PAYMENTS_CLIENT = "src/app/(dashboard)/payments/PaymentsClient.tsx";
const SUPPLIER_QUOTATION_HISTORY = "src/app/(dashboard)/suppliers/[id]/SupplierQuotationHistory.tsx";

test("1. ModuleSearchControl has a mobile-safe composition", () => {
  const source = read(MODULE_SEARCH_CONTROL);
  // Select is responsive (w-full sm:w-auto) and avoids fixed rigid width on mobile
  assert.match(source, /className=["'][^"']*w-full sm:w-auto sm:min-w-\[9\.5rem\][^"']*["']/);
  // Input preserves responsive mobile-safe width contract
  assert.match(source, /className=["'][^"']*w-full min-w-\[12rem\] sm:flex-1[^"']*["']/);
  // Form container flexes and wraps cleanly
  assert.match(source, /<form[^>]*flex min-w-0 flex-1 flex-wrap items-center gap-2/);
  // Submit button remains visible and tappable
  assert.match(source, /<button[^>]*type="submit"[^>]*inline-flex shrink-0 items-center/);
});

test("2. Quotations search and page filters do not share an unsafe narrow-width row", () => {
  const source = read(QUOTATIONS_CLIENT);
  // Controls header wraps cleanly on sm+
  assert.match(source, /flex flex-wrap items-center gap-3/);
  // Search control owns a full-width row on mobile
  assert.match(source, /<div className="w-full sm:flex-1 sm:min-w-0">[\s\S]*?<ModuleSearchControl/);
  // Filters flow cleanly below
  assert.match(source, /<div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">/);
});

test("3. Services search and filters have a mobile-safe layout", () => {
  const source = read(SERVICES_CLIENT);
  // Controls header wraps cleanly on sm+
  assert.match(source, /flex flex-wrap items-center gap-3/);
  // Search control owns a full-width row on mobile
  assert.match(source, /<div className="w-full sm:flex-1 sm:min-w-0">[\s\S]*?<ModuleSearchControl/);
  // Filters flow cleanly below
  assert.match(source, /<div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">/);
});

test("4. Suppliers search/status/category filters have a mobile-safe layout", () => {
  const source = read(SUPPLIERS_CLIENT);
  // Controls header wraps cleanly on sm+
  assert.match(source, /flex flex-wrap items-center gap-3/);
  // Search control owns full-width on mobile without forbidden flex-1/h-full/min-h-0 in SuppliersClient
  assert.match(source, /<div className="w-full sm:w-auto sm:max-w-xl grow">[\s\S]*?<ModuleSearchControl/);
  // Filters flow cleanly below
  assert.match(source, /<div className="flex flex-wrap items-center gap-2 sm:gap-3 w-full sm:w-auto">/);
});

test("5. Customers has separate mobile presentation", () => {
  const source = read(CUSTOMERS_CLIENT);
  assert.match(source, /data-testid="mobile-customer-cards"/);
  assert.match(source, /className="block md:hidden divide-y divide-surface-variant"/);
  // Exposes essential record fields
  assert.match(source, /customer\.company/);
  assert.match(source, /customer\.customerNumber/);
  assert.match(source, /customer\.contact/);
  assert.match(source, /customer\.status/);
  assert.match(source, /customer\.servicesCount/);
  assert.match(source, /customer\.totalQuotedAmount/);
  assert.match(source, /dictionary\.list\.actions\.view/);
});

test("6. Customers desktop table remains", () => {
  const source = read(CUSTOMERS_CLIENT);
  assert.match(source, /className="hidden md:block w-full overflow-x-auto"/);
  assert.match(source, /<table className="w-full min-w-\[1060px\]/);
});

test("7. Quotations has separate mobile presentation", () => {
  const source = read(QUOTATIONS_CLIENT);
  assert.match(source, /data-testid="mobile-quotation-cards"/);
  assert.match(source, /className="block md:hidden divide-y divide-surface-variant"/);
  // Exposes essential record fields
  assert.match(source, /quotation\.quotationNumber/);
  assert.match(source, /quotation\.customer\?\.company/);
  assert.match(source, /quotation\.date/);
  assert.match(source, /quotation\.grandTotal/);
  assert.match(source, /quotation\.status/);
  assert.match(source, /openQuotationPdf/);
});

test("8. Quotations desktop table remains", () => {
  const source = read(QUOTATIONS_CLIENT);
  assert.match(source, /className="hidden md:block w-full overflow-x-auto"/);
  assert.match(source, /<table className="w-full min-w-\[1100px\]/);
});

test("9. Services has separate mobile presentation", () => {
  const source = read(SERVICES_CLIENT);
  assert.match(source, /data-testid="mobile-service-cards"/);
  assert.match(source, /className="block md:hidden divide-y divide-surface-variant"/);
  // Exposes essential record fields
  assert.match(source, /service\.serviceNumber/);
  assert.match(source, /service\.customer\?\.company/);
  assert.match(source, /service\.eventStartDate/);
  assert.match(source, /service\.status/);
  assert.match(source, /service\.estimatedBudget/);
  assert.match(source, /dictionary\.list\.actions\.view/);
});

test("10. Services desktop table remains", () => {
  const source = read(SERVICES_CLIENT);
  assert.match(source, /className="hidden md:block w-full overflow-x-auto"/);
  assert.match(source, /<table className="w-full min-w-\[1120px\]/);
});

test("11. Payments has separate mobile presentation", () => {
  const source = read(PAYMENTS_CLIENT);
  assert.match(source, /data-testid="mobile-payment-cards"/);
  assert.match(source, /className="block md:hidden divide-y divide-surface-variant"/);
  // Exposes essential record fields
  assert.match(source, /payment\.paymentNumber/);
  assert.match(source, /payment\.date/);
  assert.match(source, /payment\.customerName/);
  assert.match(source, /payment\.amount/);
  assert.match(source, /payment\.status/);
});

test("12. Payments desktop table remains", () => {
  const source = read(PAYMENTS_CLIENT);
  assert.match(source, /className="hidden md:block w-full overflow-x-auto"/);
  assert.match(source, /<DataTable/);
  // Exactly one overflow-x-auto preserved
  const overflowMatches = source.match(/overflow-x-auto/g) || [];
  assert.strictEqual(overflowMatches.length, 1);
});

test("13. Supplier Quotation History has separate mobile presentation", () => {
  const source = read(SUPPLIER_QUOTATION_HISTORY);
  assert.match(source, /data-testid="mobile-quotation-history-cards"/);
  assert.match(source, /className="block md:hidden divide-y/);
  // Exposes essential record fields
  assert.match(source, /quotation\.recordedAt/);
  assert.match(source, /quotation\.supplierReference/);
  assert.match(source, /quotation\.serviceNumber/);
  assert.match(source, /quotation\.requirements\.length/);
  assert.match(source, /quotation\.packageTotal/);
  assert.match(source, /quotation\.documents\.length/);
  assert.match(source, /dictionary\.view/);
});

test("14. Supplier Quotation History desktop table remains", () => {
  const source = read(SUPPLIER_QUOTATION_HISTORY);
  assert.match(source, /className="hidden md:block overflow-x-auto rounded-lg border border-outline-variant"/);
  assert.match(source, /<table className="min-w-\[820px\] w-full/);
});

test("15. Existing actions are preserved in mobile representations", () => {
  // Customers view link preserved
  assert.match(read(CUSTOMERS_CLIENT), /aria-label=\{`\$\{dictionary\.list\.actions\.view\} \$\{customer\.customerNumber\}`\}/);
  // Quotations view and print actions preserved
  assert.match(read(QUOTATIONS_CLIENT), /aria-label=\{`\$\{dictionary\.list\.actionTitles\.viewDetails\} \$\{quotation\.quotationNumber\}`\}/);
  assert.match(read(QUOTATIONS_CLIENT), /aria-label=\{`\$\{dictionary\.list\.table\.printPdf\} \$\{quotation\.quotationNumber\}`\}/);
  // Services view link preserved
  assert.match(read(SERVICES_CLIENT), /aria-label=\{`\$\{dictionary\.list\.actions\.view\} \$\{service\.serviceNumber\}`\}/);
  // Supplier Quotation History view link preserved
  assert.match(read(SUPPLIER_QUOTATION_HISTORY), /<Link[\s\S]*?href=\{detailHref\}[\s\S]*?\{dictionary\.view\}/);
});

test("16. Search semantics are unchanged", () => {
  // ModuleSearchControl
  assert.match(read(MODULE_SEARCH_CONTROL), /onSubmit\?\.`?\s*\(draftMode,\s*normalizedDraftQuery\)/);
  // Quotations
  assert.match(read(QUOTATIONS_CLIENT), /updateQuery\(\{ searchMode: mode as QuotationSearchMode, search: search \|\| undefined \}, "search"\)/);
  // Services
  assert.match(read(SERVICES_CLIENT), /updateQuery\(\{ searchMode: mode as ServiceSearchMode, search: search \|\| undefined \}, "search"\)/);
  // Suppliers
  assert.match(read(SUPPLIERS_CLIENT), /updateFilters\(\{ search: nextSearch \}, true\)/);
  // Customers
  assert.match(read(CUSTOMERS_CLIENT), /submitSearch/);
  assert.match(read(CUSTOMERS_CLIENT), /clearSearch/);
  // Payments
  assert.match(read(PAYMENTS_CLIENT), /submitSearch/);
  assert.match(read(PAYMENTS_CLIENT), /handleClear/);
});

test("17. Filter values and meaning are unchanged", () => {
  // Quotations status and month filters
  assert.match(read(QUOTATIONS_CLIENT), /updateQuery\(\{ status: event\.target\.value === "all" \? undefined : event\.target\.value as QuotationListQuery\["status"\] \}\)/);
  assert.match(read(QUOTATIONS_CLIENT), /updateQuery\(\{ month: event\.target\.value \|\| undefined \}\)/);
  // Services status filter
  assert.match(read(SERVICES_CLIENT), /updateQuery\(\{ status: event\.target\.value === "all" \? undefined : event\.target\.value as ServiceListQuery\["status"\] \}\)/);
  // Suppliers status and category filters
  assert.match(read(SUPPLIERS_CLIENT), /updateFilters\(\{ status \}, true\)/);
  assert.match(read(SUPPLIERS_CLIENT), /updateFilters\(\{ category \}, true\)/);
  // Customers status and city filters
  assert.match(read(CUSTOMERS_CLIENT), /status: event\.target\.value as CustomerListQuery\["status"\]/);
  assert.match(read(CUSTOMERS_CLIENT), /city: event\.target\.value/);
});

test("18. Pagination remains present and unchanged where applicable", () => {
  for (const path of [CUSTOMERS_CLIENT, QUOTATIONS_CLIENT, SERVICES_CLIENT, SUPPLIERS_CLIENT, PAYMENTS_CLIENT]) {
    const source = read(path);
    assert.match(source, /<PaginationFooter/);
    assert.match(source, /paginationMode="bounded"/);
  }
});

test("19. No unauthorized mutation controls are introduced", () => {
  // No DELETE/PUT/POST mutations added in card loops
  for (const path of [CUSTOMERS_CLIENT, QUOTATIONS_CLIENT, SERVICES_CLIENT, PAYMENTS_CLIENT, SUPPLIER_QUOTATION_HISTORY]) {
    const source = read(path);
    assert.doesNotMatch(source, /deleteRecord|handleDelete|removeCustomer|voidPayment/);
  }
});

test("20. EN/AR behavior remains intact", () => {
  // Uses dictionary tokens and bidi helpers across cards
  for (const path of [CUSTOMERS_CLIENT, QUOTATIONS_CLIENT, SERVICES_CLIENT, PAYMENTS_CLIENT, SUPPLIER_QUOTATION_HISTORY]) {
    const source = read(path);
    assert.match(source, /dictionary/);
    assert.match(source, /dir="auto"|dir="ltr"/);
  }
});

test("21. LTR identifier isolation remains intact", () => {
  // Identifiers and numbers must have explicit dir="ltr"
  assert.match(read(CUSTOMERS_CLIENT), /dir="ltr" className="inline-block font-mono">[\s\S]*?\{customer\.customerNumber\}/);
  assert.match(read(QUOTATIONS_CLIENT), /dir="ltr" className="font-mono font-semibold text-primary text-\[14px\]">[\s\S]*?\{isolateBidiText\(quotation\.quotationNumber\)\}/);
  assert.match(read(SERVICES_CLIENT), /dir="ltr" className="font-mono font-semibold text-primary text-\[14px\]">[\s\S]*?\{isolateBidiText\(service\.serviceNumber\)\}/);
  assert.match(read(PAYMENTS_CLIENT), /dir="ltr">[\s\S]*?\{isolateBidiText\(payment\.paymentNumber\)\}/);
  assert.match(read(SUPPLIER_QUOTATION_HISTORY), /dir="ltr">[\s\S]*?\{isolateLtrText\(quotation\.serviceNumber\)\}/);
});

test("22. G7 design-token compliance remains intact", () => {
  for (const path of [CUSTOMERS_CLIENT, QUOTATIONS_CLIENT, SERVICES_CLIENT, SUPPLIERS_CLIENT, PAYMENTS_CLIENT, SUPPLIER_QUOTATION_HISTORY]) {
    const source = read(path);
    // Standard G7 canonical tokens
    assert.match(source, /bg-surface|bg-surface-bright|bg-surface-container-lowest|bg-surface-container-low/);
    assert.match(source, /text-primary|text-on-surface|text-on-surface-variant/);
    // No foreign shadcn/radix tokens
    assert.doesNotMatch(source, /bg-card|text-card-foreground|bg-muted|text-muted-foreground|bg-destructive/);
  }
});

test("23. No new DB/auth/RBAC code is introduced", () => {
  for (const path of [MODULE_SEARCH_CONTROL, CUSTOMERS_CLIENT, QUOTATIONS_CLIENT, SERVICES_CLIENT, SUPPLIERS_CLIENT, PAYMENTS_CLIENT, SUPPLIER_QUOTATION_HISTORY]) {
    const source = read(path);
    assert.doesNotMatch(source, /supabase\.rpc|createClient|from\(["']|INSERT INTO|UPDATE\s+|DELETE FROM/);
  }
});

test("24. No page-level mobile layout intentionally depends on horizontal scrolling for primary record information", () => {
  // The mobile card lists must not have overflow-x-auto on themselves
  const filesWithCards = [
    { path: CUSTOMERS_CLIENT, testid: "mobile-customer-cards" },
    { path: QUOTATIONS_CLIENT, testid: "mobile-quotation-cards" },
    { path: SERVICES_CLIENT, testid: "mobile-service-cards" },
    { path: PAYMENTS_CLIENT, testid: "mobile-payment-cards" },
    { path: SUPPLIER_QUOTATION_HISTORY, testid: "mobile-quotation-history-cards" },
  ];

  for (const { path, testid } of filesWithCards) {
    const source = read(path);
    const cardStart = source.indexOf(`data-testid="${testid}"`);
    assert.ok(cardStart !== -1, `Could not find ${testid} in ${path}`);
    const cardSnippet = source.slice(Math.max(0, cardStart - 100), cardStart + 100);
    assert.doesNotMatch(cardSnippet, /overflow-x-auto/, `Mobile card container in ${path} should not have overflow-x-auto`);
  }
});
