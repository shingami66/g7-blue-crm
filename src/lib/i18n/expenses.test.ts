import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  getExpensesDictionary,
  getExpenseStatusLabel,
  getExpensePaymentMethodLabel,
  getExpenseOriginTypeLabel,
  getExpenseContextTypeLabel,
  getExpenseReimbursementStatusLabel,
  getExceptionDispositionLabel,
} from "./dictionaries/expenses.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const EXPENSES_PAGE = join(REPO_ROOT, "src/app/(dashboard)/expenses/page.tsx");
const EXPENSES_CLIENT = join(REPO_ROOT, "src/app/(dashboard)/expenses/ExpensesClient.tsx");

function read(path: string) {
  return readFileSync(path, "utf8");
}

function isDictionaryObject(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function leafKeys(value: unknown, prefix = ""): string[] {
  if (!isDictionaryObject(value)) return prefix ? [prefix] : [];
  return Object.entries(value).flatMap(([key, child]) =>
    leafKeys(child, prefix ? `${prefix}.${key}` : key)
  );
}

test("Expenses dictionary English and Arabic shapes remain aligned", () => {
  const enKeys = leafKeys(getExpensesDictionary("en")).sort();
  const arKeys = leafKeys(getExpensesDictionary("ar")).sort();
  assert.deepEqual(enKeys, arKeys);
});

test("Expenses dictionary exposes the Expenses-only bilingual workspace contract", () => {
  const arDict = getExpensesDictionary("ar");
  const enDict = getExpensesDictionary("en");

  assert.equal(enDict.header.title, "Expenses");
  assert.equal(enDict.header.sectionBadge, "Expenses & Costing");
  assert.equal("stageBadge" in enDict.header, false);
  assert.doesNotMatch(enDict.header.subtitle, /Cash Advances|Petty Cash|W5A/);
  assert.equal(arDict.header.title, "المصروفات");
  assert.equal(arDict.header.sectionBadge, "المصروفات والتكاليف");
  assert.equal(arDict.tabs.myExpenses, "مصروفاتي");
  assert.equal(arDict.tabs.allExpenses, "كل المصروفات");
  assert.equal("stageBadge" in arDict.header, false);
  assert.doesNotMatch(arDict.header.subtitle, /السلف|العهد/);
  assert.equal(arDict.table.empty.title, "لا توجد مصروفات مسجلة");
});

test("Expenses labels and statuses resolve correctly for en and ar", () => {
  // Statuses
  assert.equal(getExpenseStatusLabel("en", "approved"), "Approved");
  assert.equal(getExpenseStatusLabel("ar", "approved"), "معتمد");
  assert.equal(getExpenseStatusLabel("ar", "rejected"), "مرفوض");
  assert.equal(getExpenseStatusLabel("ar", "submitted"), "مقدم");
  assert.equal(getExpenseStatusLabel("ar", "draft"), "مسودة");
  assert.equal(getExpenseStatusLabel("ar", "cancelled"), "ملغى");

  // Origin types
  assert.equal(getExpenseOriginTypeLabel("en", "company_direct"), "Company Direct");
  assert.equal(getExpenseOriginTypeLabel("ar", "company_direct"), "مباشر من الشركة");
  assert.equal(getExpenseOriginTypeLabel("ar", "employee_paid"), "مدفوع من الموظف");

  // Payment methods
  assert.equal(getExpensePaymentMethodLabel("en", "company_funds"), "Company Funds");
  assert.equal(getExpensePaymentMethodLabel("ar", "company_funds"), "أموال الشركة");
  assert.equal(getExpensePaymentMethodLabel("ar", "petty_cash"), "نقدية نثرية");
  assert.equal(getExpensePaymentMethodLabel("ar", "cash_advance"), "العهدة النقدية");
  assert.equal(getExpensePaymentMethodLabel("ar", "personal_funds"), "أموال شخصية");

  // Context types
  assert.equal(getExpenseContextTypeLabel("en", "event"), "Event Direct");
  assert.equal(getExpenseContextTypeLabel("ar", "event"), "خاص بالفعالية");
  assert.equal(getExpenseContextTypeLabel("ar", "company"), "عام للشركة");

  // Reimbursement statuses
  assert.equal(getExpenseReimbursementStatusLabel("en", "fully_settled"), "Fully Settled");
  assert.equal(getExpenseReimbursementStatusLabel("ar", "fully_settled"), "مسوى بالكامل");
  assert.equal(getExpenseReimbursementStatusLabel("ar", "partially_settled"), "مسوى جزئياً");
  assert.equal(getExpenseReimbursementStatusLabel("ar", "pending"), "معلق");
  assert.equal(getExpenseReimbursementStatusLabel("ar", "not_applicable"), "لا ينطبق");

  // Exception dispositions
  assert.equal(getExceptionDispositionLabel("en", "accepted"), "Accepted");
  assert.equal(getExceptionDispositionLabel("ar", "accepted"), "مقبول");
  assert.equal(getExceptionDispositionLabel("ar", "pending"), "قيد المراجعة");
  assert.equal(getExceptionDispositionLabel("ar", "rejected"), "مرفوض");
  assert.equal(getExceptionDispositionLabel("ar", "rectified"), "تمت التسوية");
});

test("Expenses UI adheres to LocaleProvider and repository i18n architecture", () => {
  const clientContent = read(EXPENSES_CLIENT);
  const pageContent = read(EXPENSES_PAGE);

  // Client component uses LocaleProvider
  assert.match(clientContent, /useLocale/);
  assert.match(clientContent, /from "@\/components\/i18n\/LocaleProvider"/);
  assert.match(clientContent, /^"use client";/m);

  // Server page delegates to client component
  assert.match(pageContent, /<ExpensesClient/);

  // Hardcoded English strings are completely removed from UI templates
  const forbiddenPhrases = [
    ">Access Restricted<",
    ">Expenses &amp; Cash Accountability<",
    ">Expenses & Costing<",
    ">Expenses Ledger<",
    ">Cash Advances (W5B)<",
    ">Petty Cash (W5B)<",
    ">No expense records found<",
    ">Expense #<",
    ">Origin &amp; Method<",
    ">Receipt Attached<",
    "W5A Foundation",
    "تأسيس W5A",
    "Expenses & Cash",
    "المصروفات والعهد",
  ];

  for (const phrase of forbiddenPhrases) {
    assert.equal(
      clientContent.includes(phrase),
      false,
      `ExpensesClient contains forbidden hardcoded phrase: ${phrase}`
    );
    assert.equal(
      pageContent.includes(phrase),
      false,
      `ExpensesPage contains forbidden hardcoded phrase: ${phrase}`
    );
  }
});
