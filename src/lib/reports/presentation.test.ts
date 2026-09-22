import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

test("W7D Accounts Receivable owns the receivable summary and keeps Sales/Billing commercial", () => {
  const page = read("src/app/(dashboard)/reports/page.tsx");
  const billing = page.slice(page.indexOf("function BillingReport"), page.indexOf("function ReceivablesReport"));
  const receivables = page.slice(page.indexOf("function ReceivablesReport"), page.indexOf("function getAgeingLabel"));

  assert.doesNotMatch(billing, /dictionary\.metrics\.collectedCash/);
  assert.doesNotMatch(billing, /dictionary\.metrics\.outstanding(?:Receivable)?/);
  assert.match(billing, /dictionary\.metrics\.billed/);
  assert.match(receivables, /dictionary\.sections\.receivableSummary/);
  assert.match(receivables, /dictionary\.sections\.ageing/);
  assert.match(receivables, /dictionary\.metrics\.collectedCash/);
  assert.match(receivables, /dictionary\.metrics\.outstandingReceivable/);
});

test("W7D primary AR rows preserve decision fields and expose accessible reconciliation details", () => {
  const page = read("src/app/(dashboard)/reports/page.tsx");
  const receivables = page.slice(page.indexOf("function ReceivablesReport"), page.indexOf("function getAgeingLabel"));

  assert.match(receivables, /dictionary\.tables\.invoice/);
  assert.match(receivables, /dictionary\.tables\.customer/);
  assert.match(receivables, /dictionary\.tables\.dueDate/);
  assert.match(receivables, /dictionary\.metrics\.outstandingReceivable/);
  assert.match(receivables, /dictionary\.tables\.daysPastDue/);
  assert.match(receivables, /dictionary\.tables\.ageing/);
  assert.match(receivables, /<details className=/);
  assert.match(receivables, /dictionary\.tables\.viewDetails/);
  for (const field of ["service", "issueDate", "gross", "creditAdjustments", "netReceivable", "settled"]) {
    assert.match(receivables, new RegExp(`dictionary\\.tables\\.${field}`));
  }
  assert.match(receivables, /md:hidden/);
  assert.match(receivables, /overflow-x-auto/);
  assert.match(receivables, /<bdi dir="ltr">/);
});

test("W7D Reports dictionary keeps presentation labels available in English and Arabic", () => {
  const dictionary = read("src/lib/i18n/dictionaries/reports.ts");

  for (const label of ["receivableSummary", "ageing", "outstandingReceivable", "reconciliationDetails", "viewDetails"]) {
    assert.match(dictionary, new RegExp(`${label}:`));
  }
  assert.match(dictionary, /receivableSummary: "ملخص الذمم المدينة"/);
  assert.match(dictionary, /ageing: "أعمار الذمم"/);
  assert.match(dictionary, /viewDetails: "عرض التفاصيل"/);
});
