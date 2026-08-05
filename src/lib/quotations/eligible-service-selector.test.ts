import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const SERVICE_QUERIES = join(REPO_ROOT, "src/lib/services/queries.ts");
const QUOTATIONS_PAGE = join(REPO_ROOT, "src/app/(dashboard)/quotations/page.tsx");
const QUOTATIONS_CLIENT = join(REPO_ROOT, "src/app/(dashboard)/quotations/QuotationsClient.tsx");
const SELECTOR = join(REPO_ROOT, "src/app/(dashboard)/quotations/EligibleServiceSelector.tsx");
const DICTIONARY = join(REPO_ROOT, "src/lib/i18n/dictionaries/quotations.ts");

function read(path: string) {
  return readFileSync(path, "utf8");
}

function functionBlock(source: string, signature: string) {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `${signature} must exist`);
  const nextExport = source.indexOf("\nexport ", start + signature.length);
  return source.slice(start, nextExport === -1 ? undefined : nextExport);
}

function dictionaryBlock(source: string, locale: "En" | "Ar") {
  const start = source.indexOf(`const quotationsDictionary${locale}:`);
  const end = source.indexOf(`const quotationsDictionary${locale === "En" ? "Ar" : "En"}:`, start + 1);
  assert.notEqual(start, -1, `${locale} quotations dictionary must exist`);
  return source.slice(start, end === -1 ? undefined : end);
}

test("eligible Service query is guarded, lifecycle-bounded, mapped, and deterministic", () => {
  const source = read(SERVICE_QUERIES);
  const query = functionBlock(source, "export async function getEligibleServicesForQuotation");

  assert.match(source, /import "server-only"/);
  assert.match(query, /requirePermission\("services:read"\)/);
  assert.match(query, /\.is\("deleted_at", null\)/);
  assert.match(query, /\.in\("status", \["Inquiry", "Quoted"\]\)/);
  assert.match(query, /mapRowToService/);
  assert.match(query, /toEligibleQuotationService/);
  assert.match(query, /\.order\("service_number", \{ ascending: true \}\)/);
  assert.match(query, /\.order\("id", \{ ascending: true \}\)/);
  assert.doesNotMatch(source, /\.from\(["']quotations["']\)|UNIQUE\(service_id\)|service_id.*count/i);
});

test("Quotations page gates selector data on both permissions without changing list authority", () => {
  const source = read(QUOTATIONS_PAGE);

  assert.match(source, /getQuotationsList\(/);
  assert.match(source, /checkPermission\("quotations:write"\)/);
  assert.match(source, /checkPermission\("services:read"\)/);
  assert.match(source, /const canSelectService = canWrite && canReadServices/);
  assert.match(source, /canSelectService\s*\?\s*await getEligibleServicesForQuotation\(\)\s*:\s*\[\]/);
});

test("selector navigates only through the existing encoded Service-scoped route", () => {
  const selector = read(SELECTOR);
  const client = read(QUOTATIONS_CLIENT);

  assert.match(selector, /`\/quotations\/new\?serviceId=\$\{encodeURIComponent\(serviceId\)\}`/);
  assert.doesNotMatch(selector, /["']\/services["']/);
  assert.doesNotMatch(selector, /createQuotation|create_quotation_with_items|customerId|formAction|<form\b/i);
  assert.doesNotMatch(client, /createQuotation|create_quotation_with_items|customerId/);
  assert.doesNotMatch(selector, /\b(price|total|subtotal|grandTotal|vat|discount)\b|rpc\(/i);
});

test("selector protects dialog accessibility, local search, pagination reset, and responsive table rows", () => {
  const source = read(SELECTOR);

  assert.match(source, /role="dialog"/);
  assert.match(source, /aria-modal="true"/);
  assert.match(source, /aria-labelledby=\{titleId\}/);
  assert.match(source, /aria-label=\{dictionary\.list\.selector\.close\}/);
  assert.match(source, /const opener = triggerRef\.current;/);
  assert.match(source, /opener\?\.focus\(\)/);
  assert.doesNotMatch(source, /triggerRef\.current\?\.focus\(\)/);
  assert.match(source, /setCurrentPage\(1\)/);
  assert.match(source, /PaginationFooter/);
  assert.match(source, /dir="auto"/);
  assert.match(source, /grid-cols-12/);
  assert.match(source, /md:hidden/);
  assert.match(source, /const DESKTOP_COLUMN_ORDER =/);
  assert.match(source, /en:\s*\{[\s\S]*service: "order-1"[\s\S]*select: "order-6"/);
  assert.match(source, /ar:\s*\{[\s\S]*service: "order-6"[\s\S]*select: "order-1"/);
  assert.match(source, /<div dir="ltr" className="hidden grid-cols-12/);
  assert.match(source, /<div dir="ltr" className="hidden min-h-\[58px\]/);
  assert.match(source, /const selectAlignment = dictionary\.locale === "ar"/);
  assert.match(source, /desktopColumnOrder\.service/);
  assert.match(source, /desktopColumnOrder\.select/);
  assert.match(source, /dir="auto" className="inline-block max-w-full/);
  assert.match(source, /dir="ltr" className="mb-0\.5 block truncate/);
  assert.match(source, /dir="ltr" className="block truncate text-xs/);
  assert.match(source, /col-span-2 \$\{desktopColumnOrder\.select\} min-w-\[6\.5rem\]/);
  assert.match(source, /min-w-\[5rem\].*whitespace-nowrap/);
  assert.match(source, /dictionary\.list\.selector\.resultsCount/);
  assert.match(source, /dictionary\.list\.selector\.select/);
  assert.match(source, /dictionary\.form\.quotationEventLabel/);
  assert.match(source, /service\.eventName/);
  assert.doesNotMatch(source, /dictionary\.list\.selector\.chooseService/);
  assert.match(source, /<div>\s*<span className="font-medium text-on-surface-variant">/);
  assert.match(source, /focus\(\)/);
});

test("English and Arabic selector dictionary keys remain aligned", () => {
  const source = read(DICTIONARY);
  const english = dictionaryBlock(source, "En");
  const arabic = dictionaryBlock(source, "Ar");
  const requiredKeys = [
    "title",
    "description",
    "searchPlaceholder",
    "service",
    "customer",
    "eventDate",
    "location",
    "select",
    "resultsCount",
    "noEligibleServices",
    "noSearchResults",
    "close",
    "navigationPending",
  ];

  for (const key of requiredKeys) {
    const pattern = new RegExp(`selector:[\\s\\S]*?\\b${key}:`);
    assert.match(english, pattern, `English selector key ${key} must exist`);
    assert.match(arabic, pattern, `Arabic selector key ${key} must exist`);
  }

  assert.match(english, /select: "Select"/);
  assert.match(arabic, /select: "اختيار"/);
});
