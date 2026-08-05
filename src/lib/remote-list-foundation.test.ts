import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../..");

function read(relativePath: string) {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

const LIST_CLIENTS = [
  "src/app/(dashboard)/services/ServicesClient.tsx",
  "src/app/(dashboard)/invoices/InvoicesListClient.tsx",
  "src/app/(dashboard)/quotations/QuotationsClient.tsx",
  "src/app/(dashboard)/suppliers/SuppliersClient.tsx",
];

test("relation-aware list counts use inner embeds and referenced-table filters", () => {
  const services = read("src/lib/services/queries.ts");
  const invoices = read("src/lib/invoices/queries.ts");
  const quotations = read("src/lib/quotations/queries.ts");

  assert.match(services, /customers!inner\(id\)/);
  assert.match(services, /customers!inner\(company, contact, customer_number\)/);
  assert.match(services, /referencedTable: searchRelation/);
  assert.match(invoices, /customers!inner\(id\)/);
  assert.match(invoices, /customers!inner\(company,contact\)/);
  assert.match(invoices, /referencedTable: searchRelation/);
  assert.match(quotations, /\$\{searchRelation\}!inner\(id\)/);
  assert.match(quotations, /customers!inner\(company, contact\)/);
  assert.match(quotations, /services!inner\(service_number, service_title, status, event_name\)/);
  assert.match(quotations, /referencedTable: searchRelation/);
});

test("remote list queries keep permission gates, exact counts, deterministic ranges, and safe count failure", () => {
  for (const relativePath of [
    "src/lib/services/queries.ts",
    "src/lib/invoices/queries.ts",
    "src/lib/quotations/queries.ts",
    "src/lib/suppliers/queries.ts",
  ]) {
    const source = read(relativePath);
    assert.match(source, /requirePermission\("[a-z_]+:read"\)/);
    assert.match(source, /count: "exact", head: true/);
    assert.match(source, /\.range\(/);
    assert.match(source, /load_failed/);
  }
});

test("all authorized list clients submit search explicitly and keep list operations local", () => {
  for (const relativePath of LIST_CLIENTS) {
    const source = read(relativePath);
    assert.match(source, /ModuleSearchControl/);
    assert.match(source, /onSubmit=/);
    assert.match(source, /useListNavigation/);
    assert.match(source, /aria-busy=/);
    assert.match(source, /ListInlineError/);
    assert.match(source, /isSearchPending/);
    assert.match(source, /paginationMode="bounded"/);
    assert.match(source, /pageSize/);
    assert.doesNotMatch(source, /onQueryChange=\{\(search\) => update/);
    assert.doesNotMatch(source, /CenterPendingBolt/);
  }
});

test("search control is form-submit driven and keeps draft input out of router state", () => {
  const source = read("src/components/ui/ModuleSearchControl.tsx");
  assert.match(source, /<form/);
  assert.match(source, /type="submit"/);
  assert.match(source, /onSubmit\?\.\(draftMode, normalizedDraftQuery\)/);
  assert.match(source, /setDraftQuery\(nextQuery\)/);
  assert.doesNotMatch(source, /router\./);
});

test("subsequent list transitions keep rows visible without a list-local rail", () => {
  const pending = read("src/components/ui/ListPendingState.tsx");
  const navigation = read("src/components/ui/useListNavigation.ts");
  const global = read("src/components/ui/GlobalPendingProvider.tsx");
  assert.match(pending, /ListInlineError/);
  assert.doesNotMatch(pending, /ListPendingState/);
  assert.doesNotMatch(pending, /h-\[3px\]|bg-primary|setTimeout/);
  assert.match(navigation, /startTransition/);
  assert.match(navigation, /router\.refresh/);
  assert.match(global, /CenterPendingBolt/);

  for (const relativePath of LIST_CLIENTS) {
    const source = read(relativePath);
    assert.match(source, /pendingLabel=\{common\.states\.searching\}/);
    assert.match(source, /isSearchPending=\{isSearchPending\}/);
    assert.match(source, /aria-busy=\{isPending \|\| undefined\}/);
    assert.match(source, /isPending=\{isPending\}/);
    assert.doesNotMatch(source, /isPending\s*\?/);
  }

  for (const relativePath of LIST_CLIENTS) {
    assert.doesNotMatch(read(relativePath), /<ListPendingState/);
  }
});

test("search pending feedback is immediate, localized, and duplicate-safe", () => {
  const control = read("src/components/ui/ModuleSearchControl.tsx");
  const common = read("src/lib/i18n/dictionaries/common.ts");
  const navigation = read("src/components/ui/useListNavigation.ts");

  assert.match(control, /pendingLabel/);
  assert.match(control, /const actionLabel = isSearchPending \? pendingLabel : submitLabel/);
  assert.match(control, /aria-busy=\{isSearchPending \|\| undefined\}/);
  assert.match(control, /className=\{isSearchPending \? "" : "hidden sm:inline"\}/);
  assert.match(common, /searching: "Searching…"/);
  assert.match(common, /searching: "جاري البحث…"/);
  assert.match(navigation, /if \(pendingRef\.current\) return false/);
});

test("dense table Print / PDF actions stay icon-only and accessible", () => {
  const action = read("src/components/ui/DenseTableIconAction.tsx");
  assert.match(action, /h-8 w-8/);
  assert.match(action, /bg-transparent/);
  assert.match(action, /aria-label=\{label\}/);
  assert.match(action, /title=\{label\}/);
  assert.match(action, /focus-visible/);
  assert.doesNotMatch(action, /border|rounded-full/);

  for (const relativePath of [LIST_CLIENTS[1], LIST_CLIENTS[2]]) {
    const source = read(relativePath);
    assert.match(source, /DenseTableIconAction/);
    assert.match(source, /label=\{dictionary\.list\.table\.printPdf\}/);
    assert.match(source, /<Printer size=\{16\} aria-hidden="true" \/>/);
    assert.match(source, /w-\[72px\]/);
    assert.match(source, /text-center/);
    assert.doesNotMatch(source, /items-center gap-1\.5 rounded-full border/);
    assert.doesNotMatch(source, /<Printer[\s\S]*>\{dictionary\.list\.table\.printPdf\}/);
  }
});

test("bounded pagination preserves semantic labels while disabling duplicate navigation", () => {
  const pagination = read("src/components/ui/PaginationFooter.tsx");
  assert.match(pagination, /aria-busy=\{isPending \|\| undefined\}/);
  assert.match(pagination, /disabled=\{isPending\}/);
  assert.match(pagination, /disabled=\{isPending \|\| currentPage/);
});

test("remote lists use the shared reset wording while input clear remains separate", () => {
  const expected = {
    en: "Reset filters",
    ar: "إعادة ضبط الفلاتر",
  };
  const dictionaries = [
    "src/lib/i18n/dictionaries/services.ts",
    "src/lib/i18n/dictionaries/invoices.ts",
    "src/lib/i18n/dictionaries/quotations.ts",
    "src/lib/i18n/dictionaries/suppliers.ts",
  ];

  for (const relativePath of dictionaries) {
    const source = read(relativePath);
    assert.match(source, new RegExp(`resetFilters: "${expected.en}"`));
    assert.match(source, new RegExp(`resetFilters: "${expected.ar}"`));
  }

  const control = read("src/components/ui/ModuleSearchControl.tsx");
  assert.match(control, /clearLabel=\{clearLabel\}/);
  assert.match(control, /aria-label=\{resetLabel\}/);
});

test("quotation date filtering has a localized empty state instead of a cryptic month placeholder", () => {
  const client = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const dictionary = read("src/lib/i18n/dictionaries/quotations.ts");
  assert.match(client, /dictionary\.list\.dateFilter\.anyMonth/);
  assert.match(client, /type="month"/);
  assert.match(dictionary, /dateFilter: \{ label: "Issue date", anyMonth: "Any issue month" \}/);
  assert.match(dictionary, /dateFilter: \{ label: "تاريخ الإصدار", anyMonth: "كل أشهر الإصدار" \}/);
  assert.match(client, /actionTitles\.viewDetails/);
  assert.match(client, /<Eye size=\{17\}/);
  assert.doesNotMatch(client, /<a[^>]*quotationNumber/);
});

test("remote-list surfaces keep toolbar, rows, and URL-backed pagination together", () => {
  for (const relativePath of LIST_CLIENTS) {
    const source = read(relativePath);
    assert.match(source, /relative flex [^\"]*flex-1/);
    assert.match(source, /rounded-xl border border-surface-variant/);
    assert.match(source, /<FilterBar>|border-b border-surface-variant/);
    assert.match(source, /paginationMode="bounded"/);
    assert.match(source, /onPageChange=\{/);
  }
});

test("quotation number remains non-navigating and supplier search scope remains directory-wide", () => {
  const quotations = read("src/app/(dashboard)/quotations/QuotationsClient.tsx");
  const suppliers = read("src/lib/suppliers/queries.ts");
  assert.doesNotMatch(quotations, /<a[^>]*quotationNumber/);
  assert.match(quotations, /<Eye size=\{17\}/);
  assert.match(suppliers, /display_name.*legal_name.*name.*supplier_number/);
  assert.match(suppliers, /coverage_area.*country/);
});
