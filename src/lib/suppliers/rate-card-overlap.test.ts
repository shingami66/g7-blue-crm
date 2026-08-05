import assert from "node:assert/strict";
import test from "node:test";
import { findRateCardOverlap, type RateCardOverlapCandidate } from "./rate-card-overlap.ts";

const base: RateCardOverlapCandidate = {
  supplierId: "supplier-1", category: "sound", itemName: "PA System", unit: "day", currency: "SAR", validFrom: "2026-01-01", validTo: "2026-01-31", status: "active",
};

test("rate-card overlap uses the full identity and inclusive date ranges", () => {
  assert.equal(findRateCardOverlap({ ...base, validFrom: "2026-02-01", validTo: "2026-02-28" }, [base]), null);
  assert.notEqual(findRateCardOverlap({ ...base, validFrom: "2026-01-31", validTo: "2026-02-10" }, [base]), null);
  assert.equal(findRateCardOverlap({ ...base, unit: "hour" }, [base]), null);
  assert.equal(findRateCardOverlap({ ...base, validFrom: "2026-02-01", validTo: null }, [base]), null);
  assert.notEqual(findRateCardOverlap({ ...base, validFrom: "2026-01-15", validTo: null }, [base]), null);
});

test("rate-card overlap excludes inactive, deleted, and self rows", () => {
  assert.equal(findRateCardOverlap({ ...base, id: "same" }, [{ ...base, id: "same" }]), null);
  assert.equal(findRateCardOverlap(base, [{ ...base, status: "inactive" }]), null);
  assert.equal(findRateCardOverlap(base, [{ ...base, isDeleted: true }]), null);
});
