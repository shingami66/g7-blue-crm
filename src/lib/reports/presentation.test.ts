import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const ROOT = join(import.meta.dirname, "../../..");
const read = (path: string) => readFileSync(join(ROOT, path), "utf8").replace(/\r\n/g, "\n");

test("W7D Accounts Receivable owns the receivable summary and keeps Sales/Billing commercial", () => {
  const page = read("src/app/(dashboard)/reports/page.tsx");
  const billing = page.slice(page.indexOf("function BillingReport"), page.indexOf("function OperationsReport"));
  const receivables = read("src/app/(dashboard)/reports/ReceivablesReport.tsx");

  assert.doesNotMatch(billing, /dictionary\.metrics\.collectedCash/);
  assert.doesNotMatch(billing, /dictionary\.metrics\.outstanding(?:Receivable)?/);
  assert.match(billing, /dictionary\.metrics\.billed/);
  assert.match(receivables, /dictionary\.sections\.receivableSummary/);
  assert.match(receivables, /dictionary\.sections\.ageing/);
  assert.match(receivables, /dictionary\.metrics\.collectedCash/);
  assert.match(receivables, /dictionary\.metrics\.outstandingReceivable/);
});

test("W7D primary AR rows use a stable table and accessible contextual details panel", () => {
  const page = read("src/app/(dashboard)/reports/ReceivablesReport.tsx");
  const receivables = page;

  assert.match(receivables, /dictionary\.tables\.invoice/);
  assert.match(receivables, /dictionary\.tables\.customer/);
  assert.match(receivables, /dictionary\.tables\.dueDate/);
  assert.match(receivables, /dictionary\.metrics\.outstandingReceivable/);
  assert.match(receivables, /dictionary\.tables\.dueStatus/);
  assert.match(receivables, /dictionary\.tables\.details/);
  assert.doesNotMatch(receivables, /<details/);
  assert.match(receivables, /aria-expanded=\{selected\}/);
  assert.match(receivables, /aria-controls=\{DETAILS_PANEL_ID\}/);
  assert.match(receivables, /role="dialog"/);
  assert.match(receivables, /key === "Escape"/);
  assert.match(receivables, /requestAnimationFrame/);
  assert.match(receivables, /openerRef/);
  assert.match(receivables, /event\.currentTarget/);
  assert.match(receivables, /hidden=\{!row\}/);
  assert.match(receivables, /invoiceNumber/);
  for (const field of ["invoiceNumber", "service", "issueDate", "gross", "creditAdjustments", "netReceivable", "settled"]) {
    assert.match(receivables, new RegExp(`dictionary\\.tables\\.${field}`));
  }
  assert.match(receivables, /md:hidden/);
  assert.match(receivables, /overflow-x-auto/);
  assert.match(receivables, /<bdi dir="ltr">/);
  assert.match(receivables, /className="max-w-full break-words" dir="auto"/);
  assert.match(receivables, /className="flex min-w-0 flex-col/);
});

test("W7D Reports dictionary keeps presentation labels available in English and Arabic", () => {
  const dictionary = read("src/lib/i18n/dictionaries/reports.ts");

  for (const label of ["receivableSummary", "ageing", "outstandingReceivable", "dueStatus", "invoiceDetails", "notDueYet", "overdueBy", "reconciliationFormula"]) {
    assert.match(dictionary, new RegExp(`${label}:`));
  }
  assert.match(dictionary, /accountsReceivable: "مستحقات العملاء"/);
  assert.match(dictionary, /receivableSummary: "ملخص مستحقات العملاء"/);
  assert.match(dictionary, /ageing: "أعمار الديون"/);
  assert.match(dictionary, /overdue: "متأخر عن السداد"/);
  assert.match(dictionary, /notDue: "غير مستحق بعد"/);
  assert.match(dictionary, /netReceivable: "صافي المستحق"/);
  assert.doesNotMatch(dictionary, /الذمم المدينة|أعمار الذمم|صافي الذمم/);
  assert.match(dictionary, /hints: \{ ageing: "توزيع المبالغ المستحقة حسب مدة التأخر عن تاريخ الاستحقاق\." \}/);
});
