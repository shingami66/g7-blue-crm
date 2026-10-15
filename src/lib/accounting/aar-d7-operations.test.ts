import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path: string) => readFileSync(new URL(path, import.meta.url), "utf8");
const bankPage = source("../../app/(dashboard)/accounting/bank-reconciliation/page.tsx");
const bankWorkspace = source("../../app/(dashboard)/accounting/bank-reconciliation/BankReconciliationWorkspace.tsx");
const periodPage = source("../../app/(dashboard)/accounting/period-close/page.tsx");
const periodWorkspace = source("../../app/(dashboard)/accounting/period-close/PeriodCloseWorkspace.tsx");
const dictionary = source("../i18n/dictionaries/accounting-operations.ts");

test("AAR-D7 bank route uses server capability gates and constrains requested bindings to discovery results", () => {
  assert.match(bankPage, /accounting:view/);
  assert.match(bankPage, /accounting:reconcile_bank/);
  assert.match(bankPage, /listAccountingBankBindings/);
  assert.match(bankPage, /bindings\.some\(\(binding\) => binding\.binding_id === requestedBinding\)/);
  assert.match(bankPage, /recorded_at_cutoff/);
  assert.match(bankPage, /getAccountingBankReconciliationHistory/);
});

test("AAR-D7 bank workspace exposes statement evidence, current-line matching, review, and unmatch operations", () => {
  for (const action of [
    "saveAccountingBankStatementBatch",
    "saveAccountingBankStatementLine",
    "prepareAccountingBankReconciliation",
    "reviewAccountingBankReconciliation",
    "unmatchAccountingBankReconciliation",
  ]) assert.ok(bankWorkspace.includes(action), `missing ${action}`);
  assert.match(bankWorkspace, /summary\.adjustment_required_statement_items/);
  assert.match(bankWorkspace, /group\.is_current_version && group\.current_version === group\.version/);
  assert.match(bankWorkspace, /actorId !== group\.prepared_by/);
  assert.match(bankWorkspace, /selectedBatch\.coverage_start[\s\S]*selectedBatch\.coverage_end/);
  assert.match(bankWorkspace, /reports\.some\(\(\[, , allowed\]\) => allowed\)/);
});

test("AAR-D7 period-close route and workspace preserve read access, stale versions, and independent review", () => {
  assert.match(periodPage, /accounting:view/);
  assert.match(periodPage, /getAccountingPeriodCloseEvidence/);
  assert.match(periodWorkspace, /effectivePackageKind/);
  assert.match(periodWorkspace, /starting_period_version !== currentPeriod\.version/);
  assert.match(periodWorkspace, /actorId !== item\.preparer_user_id/);
  assert.match(periodWorkspace, /prepareAccountingPeriodClose/);
  assert.match(periodWorkspace, /reviewAccountingPeriodClose/);
  assert.match(periodWorkspace, /canViewStatements/);
});

test("AAR-D7 operational labels include English and Arabic bank and period-close controls", () => {
  assert.match(dictionary, /const en: AccountingOperationsDictionary/);
  assert.match(dictionary, /const ar: AccountingOperationsDictionary/);
  assert.match(dictionary, /adjustmentItems:/);
  assert.match(dictionary, /saveStatementBatch:/);
  assert.match(dictionary, /period: \{/);
});
