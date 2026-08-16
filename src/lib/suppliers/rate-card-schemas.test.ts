import assert from "node:assert/strict";
import test from "node:test";
import { supplierRateCardCreateSchema, supplierRateCardUpdateSchema } from "./rate-card-schemas.ts";

const valid = { supplierId: "00000000-0000-4000-8000-000000000001", category: "sound", itemName: "PA System", unit: "day", pricingBasis: "per_unit", currency: "SAR", baseCost: "125.50", validFrom: "2026-01-01", validTo: null, notes: null, status: "inactive" };

test("rate-card schema is SAR-only and keeps inactive saves valid", () => {
  assert.equal(supplierRateCardCreateSchema.safeParse(valid).success, true);
  assert.equal(supplierRateCardCreateSchema.safeParse({ ...valid, currency: "USD" }).success, false);
  assert.equal(supplierRateCardCreateSchema.safeParse({ ...valid, validFrom: "2026-02-01", validTo: "2026-01-01" }).success, false);
  assert.equal(supplierRateCardCreateSchema.safeParse({ ...valid, status: "inactive", validTo: null }).success, true);
  assert.equal(supplierRateCardCreateSchema.safeParse({ ...valid, pricingBasis: null }).success, true);
});

test("rate-card update keeps identity fields and dates validated", () => {
  const update = { supplierId: valid.supplierId, category: valid.category, itemName: valid.itemName, unit: valid.unit, pricingBasis: valid.pricingBasis, currency: valid.currency, baseCost: valid.baseCost, validFrom: valid.validFrom, validTo: valid.validTo, notes: valid.notes };
  assert.equal(supplierRateCardUpdateSchema.safeParse({ ...update, id: valid.supplierId }).success, true);
  assert.equal(supplierRateCardUpdateSchema.safeParse({ ...update, id: "not-a-uuid" }).success, false);
});
