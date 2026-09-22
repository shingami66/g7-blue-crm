import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { calculateInvoiceReceivable } from "./calculations.ts";

const W7C_MIGRATION_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/20260921200000_w7c_customer_credits_refunds.sql",
);
const W7C_COMMERCIAL_REDUCTION_REPAIR_PATH = resolve(
  dirname(fileURLToPath(import.meta.url)),
  "../../../supabase/migrations/20260922090000_w7c_commercial_reduction_guard.sql",
);

test("W7C invoice credit scenarios reconcile without negative outstanding", () => {
  const scenarios = [
    {
      name: "unpaid invoice reduction",
      input: { grossIssuedAmount: 100000, creditAdjustmentAmount: 20000, settledAmount: 0 },
      expected: { netReceivableAmount: 80000, outstandingAmount: 80000, customerCreditAmount: 0 },
    },
    {
      name: "partial settlement then credit",
      input: { grossIssuedAmount: 100000, creditAdjustmentAmount: 20000, settledAmount: 90000 },
      expected: { netReceivableAmount: 80000, outstandingAmount: 0, customerCreditAmount: 10000 },
    },
    {
      name: "fully paid then credit",
      input: { grossIssuedAmount: 100000, creditAdjustmentAmount: 20000, settledAmount: 100000 },
      expected: { netReceivableAmount: 80000, outstandingAmount: 0, customerCreditAmount: 20000 },
    },
  ] as const;

  for (const scenario of scenarios) {
    const result = calculateInvoiceReceivable(scenario.input);
    assert.deepEqual(
      {
        netReceivableAmount: result.netReceivableAmount,
        outstandingAmount: result.outstandingAmount,
        customerCreditAmount: result.customerCreditAmount,
      },
      scenario.expected,
      scenario.name,
    );
    assert.ok(result.outstandingAmount >= 0, scenario.name);
  }
});

test("W7C cents reconciliation preserves exact two-decimal values", () => {
  assert.deepEqual(
    calculateInvoiceReceivable({
      grossIssuedAmount: 100.005,
      creditAdjustmentAmount: 20.004,
      settledAmount: 90.006,
    }),
    {
      grossIssuedAmount: 100.01,
      creditAdjustmentAmount: 20,
      creditApplicationAmount: 0,
      netReceivableAmount: 80.01,
      settledAmount: 90.01,
      outstandingAmount: 0,
      customerCreditAmount: 10,
    },
  );
});

test("W7C retained credit application reduces target outstanding without creating credit", () => {
  assert.deepEqual(
    calculateInvoiceReceivable({
      grossIssuedAmount: 100000,
      creditAdjustmentAmount: 0,
      creditApplicationAmount: 25000,
      settledAmount: 0,
    }),
    {
      grossIssuedAmount: 100000,
      creditAdjustmentAmount: 0,
      creditApplicationAmount: 25000,
      netReceivableAmount: 75000,
      settledAmount: 0,
      outstandingAmount: 75000,
      customerCreditAmount: 0,
    },
  );
});

test("W7C migration defines dependent views before helper functions", () => {
  const migration = readFileSync(W7C_MIGRATION_PATH, "utf8");
  const adjustmentBalancesView = migration.indexOf(
    "CREATE OR REPLACE VIEW public.customer_credit_adjustment_balances",
  );
  const customerBalancesView = migration.indexOf(
    "CREATE OR REPLACE VIEW public.customer_credit_balances",
  );
  const receivableBalancesView = migration.indexOf(
    "CREATE OR REPLACE VIEW public.customer_invoice_receivable_balances",
  );
  const creditAvailableHelper = migration.indexOf(
    "CREATE OR REPLACE FUNCTION public._w7c_get_credit_available",
  );
  const invoiceCreditHelper = migration.indexOf(
    "CREATE OR REPLACE FUNCTION public._w7c_get_invoice_credit_total",
  );

  assert.ok(adjustmentBalancesView >= 0);
  assert.ok(customerBalancesView > adjustmentBalancesView);
  assert.ok(receivableBalancesView > customerBalancesView);
  assert.ok(creditAvailableHelper > receivableBalancesView);
  assert.ok(invoiceCreditHelper > receivableBalancesView);
});

test("W7C commercial reduction repair guards the exact source-to-successor amount", () => {
  const repairMigration = readFileSync(W7C_COMMERCIAL_REDUCTION_REPAIR_PATH, "utf8");

  assert.match(repairMigration, /prevent_w7c_commercial_reduction_mismatch/);
  assert.match(
    repairMigration,
    /customer_internal_credit_adjustments_commercial_reduction_guard/,
  );
  assert.match(repairMigration, /BEFORE INSERT ON public\.customer_internal_credit_adjustments/);
  assert.match(
    repairMigration,
    /round\(source_scope\.accepted_grand_total - successor_scope\.accepted_grand_total, 2\)/,
  );
  assert.match(repairMigration, /IF NEW\.reason_code <> 'customer_scope_reduction' THEN/);
  assert.match(repairMigration, /RETURN NEW;[\s\S]*END IF;/);
  assert.match(repairMigration, /v_expected_amount <> NEW\.amount/);
});
