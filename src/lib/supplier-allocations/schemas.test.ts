import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  SUPPLIER_ALLOCATION_MAX_QUANTITY,
  SUPPLIER_ALLOCATION_MAX_UNIT_COST,
  supplierAllocationCreateSchema,
} from "./schemas.ts";

const REPO_ROOT = join(import.meta.dirname, "../../..");
const ACTIONS = join(REPO_ROOT, "src/lib/supplier-allocations/actions.ts");
const QUERIES = join(REPO_ROOT, "src/lib/supplier-allocations/queries.ts");
const RATE_CARDS = join(REPO_ROOT, "src/lib/suppliers/rate-card-actions.ts");
const PANEL = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx",
);
const CREATE_FORM = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx",
);
const EDIT_FORM = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/SupplierAllocationEditForm.tsx",
);

function source(path: string) {
  return readFileSync(path, "utf8");
}

function manualInput(quantity: number, estimatedUnitCost: number) {
  return {
    serviceId: "service-1",
    supplierId: "supplier-1",
    status: "draft",
    category: "venue",
    itemName: "Main hall",
    unit: "day",
    quantity,
    currency: "SAR",
    estimatedUnitCost,
    costSource: "manual_estimate",
  };
}

test("Supplier Allocation quantity aligns with NUMERIC(10,3)", () => {
  assert.equal(supplierAllocationCreateSchema.safeParse(manualInput(1.234, 10)).success, true);
  assert.equal(supplierAllocationCreateSchema.safeParse(manualInput(1.2345, 10)).success, false);
  assert.equal(
    supplierAllocationCreateSchema.safeParse(
      manualInput(SUPPLIER_ALLOCATION_MAX_QUANTITY, 10),
    ).success,
    true,
  );
  assert.equal(
    supplierAllocationCreateSchema.safeParse(
      manualInput(SUPPLIER_ALLOCATION_MAX_QUANTITY + 0.001, 10),
    ).success,
    false,
  );
});

test("Supplier Allocation unit cost aligns with NUMERIC(14,2)", () => {
  assert.equal(supplierAllocationCreateSchema.safeParse(manualInput(1, 12.34)).success, true);
  assert.equal(supplierAllocationCreateSchema.safeParse(manualInput(1, 12.345)).success, false);
  assert.equal(
    supplierAllocationCreateSchema.safeParse(
      manualInput(1, SUPPLIER_ALLOCATION_MAX_UNIT_COST),
    ).success,
    true,
  );
  assert.equal(
    supplierAllocationCreateSchema.safeParse(
      manualInput(1, SUPPLIER_ALLOCATION_MAX_UNIT_COST + 0.01),
    ).success,
    false,
  );
});

test("Allocation mutations use expected-state predicates and stable stale handling", () => {
  const actions = source(ACTIONS);
  assert.equal((actions.match(/\.eq\("status", existingAllocation\.status\)/g) ?? []).length, 5);
  assert.equal((actions.match(/error: SUPPLIER_ALLOCATION_STALE_ERROR/g) ?? []).length, 5);
  assert.equal((actions.match(/\.maybeSingle\(\)/g) ?? []).length >= 5, true);
});

test("Allocation lifecycle and rate-card restrictions are enforced server-side", () => {
  const actions = source(ACTIONS);
  assert.match(actions, /rateCard\.valid_from > today/);
  assert.match(actions, /rateCard\.valid_to && rateCard\.valid_to < today/);
  assert.match(actions, /Rate-card allocations cannot be deleted\./);
  assert.match(actions, /Rate-card allocations cannot be restored\./);
  assert.match(actions, /supplier\.status !== "active"/);
  assert.match(actions, /supplier\.is_blacklisted/);

  const rateCards = source(RATE_CARDS);
  assert.match(rateCards, /row\.valid_from <= today/);
  assert.match(rateCards, /!row\.valid_to \|\| row\.valid_to >= today/);
});

test("Allocation panels distinguish load failure and lock active bookings", () => {
  const queries = source(QUERIES);
  const panel = source(PANEL);
  assert.match(queries, /error: "supplier_allocations_load_failed"/);
  assert.doesNotMatch(queries, /return \[\];/);
  assert.match(panel, /loadError \?/);
  assert.match(panel, /activeBookingIds\.has\(a\.id\)/);
  assert.match(panel, /a\.costSource === "manual_estimate"/);
});

test("Allocation forms expose database-aligned numeric controls", () => {
  for (const form of [source(CREATE_FORM), source(EDIT_FORM)]) {
    assert.match(form, /step="0\.001"/);
    assert.match(form, /max="9999999\.999"/);
    assert.match(form, /step="0\.01"/);
    assert.match(form, /max="999999999999\.99"/);
  }
});
