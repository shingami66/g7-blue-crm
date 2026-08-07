import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const DETAIL_PAGE = join(
  REPO_ROOT,
  "src/app/(dashboard)/invoices/[id]/page.tsx",
);
const INVOICE_DICTIONARY = join(
  REPO_ROOT,
  "src/lib/i18n/dictionaries/invoices.ts",
);

test("invoice detail distinguishes active billing scope total from invoice snapshot total", () => {
  const page = readFileSync(DETAIL_PAGE, "utf8");
  const dictionary = readFileSync(INVOICE_DICTIONARY, "utf8");

  assert.match(
    page,
    /approvedBillingScopeAcceptedGrandTotal[\s\S]*?settlementTotal = approvedBillingScopeTotal \?\? approvedQuotationTotal/,
  );
  assert.match(page, /label=\{settlementTotalLabel\}/);
  assert.match(page, /value=\{formatAmount\(locale, settlementTotal\)\}/);
  assert.doesNotMatch(
    page,
    /label=\{dictionary\.detail\.labels\.approvedQuotationTotal\}[\s\S]*?value=\{formatAmount\(locale, approvedQuotationTotal\)\}/,
  );
  assert.match(dictionary, /approvedBillingScopeTotal: "Approved Billing Scope Total"/);
  assert.match(dictionary, /approvedBillingScopeTotal: "إجمالي نطاق الفوترة المعتمد"/);
});
