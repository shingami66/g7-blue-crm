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

  assert.match(source, /getQuotations\(\)/);
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

test("selector protects dialog accessibility, local search, pagination reset, and responsive stored text", () => {
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
  assert.match(source, /sm:flex-row/);
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
    "chooseService",
    "customer",
    "eventDate",
    "location",
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
});
