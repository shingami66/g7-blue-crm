import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { buildQuotationSnapshot } from "./snapshots.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const SNAPSHOT_MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260807150000_g1_final_invoice_scope_snapshot_correction.sql",
);
const INSERT_CORRECTION_MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260807133000_g1_invoice_snapshot_insert_correction.sql",
);
const DEPOSIT_SCOPE_CORRECTION_MIGRATION = join(
  REPO_ROOT,
  "supabase/migrations/20260807183359_g1_deposit_invoice_scope_snapshot_correction.sql",
);

function read(path: string) {
  return readFileSync(path, "utf8");
}

type SnapshotRecord = Record<string, unknown>;
type QuotationFixture = Parameters<typeof buildQuotationSnapshot>[0];
type ScopeFixture = NonNullable<Parameters<typeof buildQuotationSnapshot>[1]>;

function createQuotation(): QuotationFixture {
  return {
    id: "quotation-id",
    quotationNumber: "QT-2026-0024",
    serviceId: "service-id",
    customerId: "customer-id",
    items: [],
    subtotal: 5000,
    discount: 0,
    vatRate: 0,
    vatAmount: 0,
    grandTotal: 5000,
    currency: "SAR",
    status: "approved",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  } as unknown as QuotationFixture;
}

function createScope(): ScopeFixture {
  return {
    id: "scope-id",
    sourceQuotationId: "quotation-id",
    acceptedSubtotal: 5000,
    acceptedVatAmount: 0,
    acceptedGrandTotal: 5000,
    sourceDiscount: 0,
    sourceVatRate: 0,
    items: [
      {
        decision: "accepted",
        sourceDescription: "Corporate Event Setup Package",
        sourceDetails: "Venue preparation, equipment setup, and event coordination.",
        acceptedQty: 1,
        acceptedUnitPrice: 5000,
        acceptedVatAmount: 0,
        acceptedGrandTotal: 5000,
      },
    ],
  } as ScopeFixture;
}

function createDepositScope(): ScopeFixture {
  return {
    ...createScope(),
    items: [
      {
        decision: "accepted",
        sourceDescription: "LED Screen & Visual Setup",
        sourceDetails: "LED screen supply, installation and operation",
        acceptedQty: 1,
        acceptedUnitPrice: 3000,
        acceptedVatAmount: 0,
        acceptedGrandTotal: 3000,
      },
      {
        decision: "accepted",
        sourceDescription: "Audio & Sound Setup",
        sourceDetails: "Sound system, microphones and event audio operation",
        acceptedQty: 1,
        acceptedUnitPrice: 2000,
        acceptedVatAmount: 0,
        acceptedGrandTotal: 2000,
      },
    ],
  } as ScopeFixture;
}

test("partial final snapshots retain approved scope lines instead of settlement balance pricing", () => {
  const snapshot = buildQuotationSnapshot(createQuotation(), createScope(), 4000, "final") as SnapshotRecord;
  const [line] = snapshot.items as SnapshotRecord[];

  assert.equal(line.description, "Corporate Event Setup Package");
  assert.equal(line.details, "Venue preparation, equipment setup, and event coordination.");
  assert.equal(line.qty, 1);
  assert.equal(line.unit_price, 5000);
  assert.equal(line.total, 5000);
  assert.equal(snapshot.grand_total, 5000);
  assert.notEqual(line.unit_price, 4000);
  assert.equal(snapshot.approvedBillingScopeAcceptedGrandTotal, 5000);
});

test("active ABS deposits retain approved scope lines while keeping deposit amount separate", () => {
  const deposit = buildQuotationSnapshot(createQuotation(), createDepositScope(), 1000, "deposit") as SnapshotRecord;
  const [screenLine, soundLine] = deposit.items as SnapshotRecord[];

  assert.equal(screenLine.description, "LED Screen & Visual Setup");
  assert.equal(screenLine.details, "LED screen supply, installation and operation");
  assert.equal(screenLine.qty, 1);
  assert.equal(screenLine.unit_price, 3000);
  assert.equal(screenLine.total, 3000);
  assert.equal(soundLine.description, "Audio & Sound Setup");
  assert.equal(soundLine.details, "Sound system, microphones and event audio operation");
  assert.equal(soundLine.qty, 1);
  assert.equal(soundLine.unit_price, 2000);
  assert.equal(soundLine.total, 2000);
  assert.equal(deposit.grand_total, 5000);
  assert.equal(deposit.approvedBillingScopeAcceptedGrandTotal, 5000);
  assert.notEqual(screenLine.unit_price, 1000);
  assert.notEqual(soundLine.unit_price, 1000);
  assert.notEqual(screenLine.total, 1000);
  assert.notEqual(soundLine.total, 1000);

  const legacy = buildQuotationSnapshot(
    { ...createQuotation(), items: [{ description: "Legacy service", details: null, qty: 1, unitPrice: 5000, vat: 0, total: 5000 }] } as unknown as QuotationFixture,
    null,
    4000,
    "final",
  ) as SnapshotRecord;
  const [legacyLine] = legacy.items as SnapshotRecord[];
  assert.equal(legacyLine.description, "Legacy service");
  assert.equal(legacyLine.unit_price, 5000);
  assert.equal(legacy.grand_total, 5000);
  assert.equal("approvedBillingScopeId" in legacy, false);
});

test("forward correction keeps settlement metadata separate and changes only final partial scope selection", () => {
  const migration = read(SNAPSHOT_MIGRATION);
  const insertCorrection = read(INSERT_CORRECTION_MIGRATION);
  const depositMigration = read(DEPOSIT_SCOPE_CORRECTION_MIGRATION);

  assert.match(migration, /CREATE OR REPLACE FUNCTION public\.build_active_abs_invoice_snapshot/);
  assert.match(depositMigration, /CREATE OR REPLACE FUNCTION public\.build_active_abs_invoice_snapshot/);
  assert.match(depositMigration, /'description', i\.source_description/);
  assert.match(depositMigration, /'details', i\.source_details/);
  assert.match(depositMigration, /'qty', i\.accepted_qty/);
  assert.match(depositMigration, /'unit_price', i\.accepted_unit_price/);
  assert.match(depositMigration, /'total', i\.accepted_grand_total/);
  assert.doesNotMatch(depositMigration, /Deposit Payment/);
  assert.doesNotMatch(depositMigration, /v_partial/);
  assert.match(depositMigration, /'grand_total', v_scope\.accepted_grand_total/);
  assert.match(depositMigration, /'{deposit_invoice_settlement}'/);
  assert.match(depositMigration, /'approved_billing_scope_total', v_active_scope_ceiling/);
  assert.match(depositMigration, /'deposit_invoice_amount', NEW\.grand_total/);
  assert.match(depositMigration, /'invoice_amount_due', NEW\.grand_total/);
  assert.match(depositMigration, /check_invoices_before_write_trg/);
  assert.match(depositMigration, /'{final_invoice_settlement}'/);
  assert.match(depositMigration, /'final_invoice_amount', NEW\.grand_total/);
  assert.match(depositMigration, /'service_lifetime_exposure', v_prior_exposure/);
  assert.match(depositMigration, /legacy_quotation/);
  assert.doesNotMatch(depositMigration, /UPDATE public\.invoices|DELETE FROM public\.invoices/);
  assert.match(depositMigration, /SECURITY DEFINER[\s\S]*SET search_path = pg_catalog, public/);
  assert.match(depositMigration, /invoice financial totals and document snapshots are immutable after creation/);
  assert.match(depositMigration, /REVOKE ALL ON FUNCTION public\.check_invoices_before_write\(\)/);
  assert.match(depositMigration, /GRANT EXECUTE ON FUNCTION public\.check_invoices_before_write\(\)\s+TO service_role/);
  assert.doesNotMatch(migration, /UPDATE public\.invoices/);
  assert.match(insertCorrection, /'final_invoice_amount', NEW\.grand_total/);
  assert.match(insertCorrection, /'service_lifetime_exposure', v_prior_exposure/);
  assert.match(insertCorrection, /invoice financial totals and document snapshots are immutable after creation/);
});
