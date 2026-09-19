import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const migration = readFileSync(
  join(process.cwd(), "supabase/migrations/20260919075451_w7a_customer_receipt_allocation_foundation.sql"),
  "utf8",
);
const actions = readFileSync(join(process.cwd(), "src/lib/customer-receipts/actions.ts"), "utf8");
const queries = readFileSync(join(process.cwd(), "src/lib/customer-receipts/queries.ts"), "utf8");
const client = readFileSync(join(process.cwd(), "src/app/(dashboard)/payments/receipts/CustomerReceiptsClient.tsx"), "utf8");

test("W7A migration declares the independent receipt and append-only correction model", () => {
  assert.match(migration, /ALTER TABLE public\.payments\s+ALTER COLUMN invoice_id DROP NOT NULL/);
  assert.match(migration, /CREATE TABLE public\.customer_receipt_allocations/);
  assert.match(migration, /CREATE TABLE public\.customer_receipt_allocation_reversals/);
  assert.match(migration, /CREATE TABLE public\.customer_receipt_reversals/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.customer_receipt_balances/);
  assert.match(migration, /CREATE OR REPLACE VIEW public\.customer_invoice_settlement_balances/);
  assert.match(migration, /WITH active_allocations AS/);
});

test("W7A mutation functions are service-role RPCs with fixed search_path", () => {
  for (const functionName of [
    "record_customer_receipt",
    "allocate_customer_receipt",
    "reverse_customer_receipt_allocation",
    "reverse_customer_receipt",
  ]) {
    assert.match(migration, new RegExp(`CREATE OR REPLACE FUNCTION public\\.${functionName}`));
    assert.match(migration, new RegExp(`ALTER FUNCTION public\\.${functionName}`));
    assert.match(migration, new RegExp(`GRANT EXECUTE ON FUNCTION public\\.${functionName}`));
  }
  assert.match(migration, /SET search_path = pg_catalog, public/);
  assert.match(migration, /COALESCE\(current_setting\('g7\.w7a_rpc_context', true\), ''\) <> 'on'/);
  assert.match(migration, /SELECT set_config\('g7\.w7a_rpc_context', 'on', true\);/);
});

test("W7A receipt boundaries exclude tax, revenue, credit, refund, GL, and automatic allocation behavior", () => {
  assert.match(migration, /revenue_classification.*none/);
  assert.match(migration, /tax_classification.*inactive/);
  assert.match(migration, /not revenue, tax, credit, refund, or GL/i);
  assert.match(migration, /invoice_id, NULL/);
  assert.match(migration, /allocated_amount[\s\S]*?0::numeric[\s\S]*?p_amount[\s\S]*?'unapplied'/);
});

test("Legacy invoice payment remains the compatibility path and creates one allocation", () => {
  assert.match(migration, /CREATE OR REPLACE FUNCTION public\._record_invoice_payment_before_service_audit/);
  assert.match(migration, /INSERT INTO public\.payments/);
  assert.match(migration, /INSERT INTO public\.customer_receipt_allocations/);
  assert.match(migration, /record_invoice_payment_compatibility/);
  assert.match(migration, /payment_recorded/);
});

test("Receipt reversal and allocation reversal guards preserve authority boundaries", () => {
  assert.match(migration, /customer_receipt_has_active_allocations/);
  assert.match(migration, /invoice_payment_allocation_reversal_unsupported/);
  assert.match(migration, /payment_already_invoice_linked/);
  assert.match(migration, /deposit_service_lifecycle_correction_required/);
});

test("Application workflow uses bounded queries and all four W7A RPCs", () => {
  assert.match(queries, /\.limit\(20\)/);
  assert.match(queries, /\.range\(rangeStart, rangeStart \+ query\.pageSize - 1\)/);
  assert.match(queries, /customer_invoice_settlement_balances/);
  assert.match(queries, /receipt_amount/);
  assert.match(queries, /searchCustomerOptions/);
  assert.match(actions, /record_customer_receipt/);
  assert.match(actions, /allocate_customer_receipt/);
  assert.match(actions, /reverse_customer_receipt_allocation/);
  assert.match(actions, /reverse_customer_receipt/);
  assert.match(client, /searchEligibleCustomerInvoicesAction/);
  assert.match(client, /reverseCustomerReceiptAllocationAction/);
  assert.match(client, /reverseCustomerReceiptAction/);
  assert.match(client, /dictionary\.actions\.search/);
  assert.doesNotMatch(client, /dictionary\.states\.failed \+?\s*`?\$\{/);
});
