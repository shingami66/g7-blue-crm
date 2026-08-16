import assert from "node:assert/strict";
import test from "node:test";
import { findRateCardOverlap, isRateCardApplicableForUsagePeriod, type RateCardOverlapCandidate } from "./rate-card-overlap.ts";

const base: RateCardOverlapCandidate = {
  supplierId: "supplier-1", category: "sound", itemName: "PA System", unit: "day", pricingBasis: "per_unit", currency: "SAR", validFrom: "2026-01-01", validTo: "2026-01-31", status: "active",
};

test("rate-card overlap uses the full identity (including pricing_basis) and inclusive date ranges", () => {
  assert.equal(findRateCardOverlap({ ...base, validFrom: "2026-02-01", validTo: "2026-02-28" }, [base]), null);
  assert.notEqual(findRateCardOverlap({ ...base, validFrom: "2026-01-31", validTo: "2026-02-10" }, [base]), null);
  assert.equal(findRateCardOverlap({ ...base, unit: "hour" }, [base]), null);
  assert.equal(findRateCardOverlap({ ...base, pricingBasis: "per_day" }, [base]), null);
  assert.equal(findRateCardOverlap({ ...base, validFrom: "2026-02-01", validTo: null }, [base]), null);
  assert.notEqual(findRateCardOverlap({ ...base, validFrom: "2026-01-15", validTo: null }, [base]), null);
});

test("rate-card overlap excludes inactive, deleted, and self rows", () => {
  assert.equal(findRateCardOverlap({ ...base, id: "same" }, [{ ...base, id: "same" }]), null);
  assert.equal(findRateCardOverlap(base, [{ ...base, status: "inactive" }]), null);
  assert.equal(findRateCardOverlap(base, [{ ...base, isDeleted: true }]), null);
});

test("isRateCardApplicableForUsagePeriod enforces single-date, multi-date, and boundary coverage", () => {
  const card = { validFrom: "2026-06-01", validTo: "2026-06-30", status: "active" };

  // Single-date service within range (single authoritative date works)
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-06-15", endDate: "2026-06-15" }), true);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-06-01", endDate: null }), true);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-06-30", endDate: undefined }), true);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-06-30", endDate: "2026-06-30" }), true);

  // Single-date service outside range
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-05-31", endDate: "2026-05-31" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-07-01", endDate: "2026-07-01" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-05-31", endDate: null }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-07-01", endDate: null }), false);

  // Multi-date service fully covered
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-06-05", endDate: "2026-06-25" }), true);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-06-01", endDate: "2026-06-30" }), true);

  // Multi-date service crossing boundary (fails safely without auto-splitting or ambiguous selection)
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-05-25", endDate: "2026-06-10" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-06-20", endDate: "2026-07-05" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-05-01", endDate: "2026-07-31" }), false);

  // Open-ended valid_to
  const openEnded = { validFrom: "2026-06-01", validTo: null, status: "active" };
  assert.equal(isRateCardApplicableForUsagePeriod(openEnded, { startDate: "2026-06-01", endDate: "2026-12-31" }), true);
  assert.equal(isRateCardApplicableForUsagePeriod(openEnded, { startDate: "2026-05-31", endDate: "2026-06-10" }), false);
});

test("isRateCardApplicableForUsagePeriod fails closed on missing, invalid, or insufficient authoritative dates", () => {
  const card = { validFrom: "2026-06-01", validTo: "2026-06-30", status: "active" };

  // Missing start date fails closed
  assert.equal(isRateCardApplicableForUsagePeriod(card, null), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, undefined), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, {}), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: null }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: undefined }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "   " }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: null, endDate: "2026-06-15" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: undefined, endDate: "2026-06-15" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "", endDate: "2026-06-15" }), false);

  // Missing required end date / inverted range fails closed
  assert.equal(isRateCardApplicableForUsagePeriod(card, { startDate: "2026-06-20", endDate: "2026-06-10" }), false);

  // Inactive or deleted card fails closed even with valid dates
  assert.equal(isRateCardApplicableForUsagePeriod({ ...card, status: "inactive" }, { startDate: "2026-06-15", endDate: "2026-06-15" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod({ ...card, isDeleted: true }, { startDate: "2026-06-15", endDate: "2026-06-15" }), false);
});

test("missing dates never consult today as pricing authority and never select a card valid today", () => {
  // A card that is universally valid across all modern dates (including today)
  const cardValidToday = { validFrom: "2000-01-01", validTo: "2099-12-31", status: "active" };

  // Missing dates must never consult today or select a card merely because it is valid today
  assert.equal(isRateCardApplicableForUsagePeriod(cardValidToday, null), false);
  assert.equal(isRateCardApplicableForUsagePeriod(cardValidToday, undefined), false);
  assert.equal(isRateCardApplicableForUsagePeriod(cardValidToday, {}), false);
  assert.equal(isRateCardApplicableForUsagePeriod(cardValidToday, { startDate: null, endDate: null }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(cardValidToday, { startDate: "", endDate: "" }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(cardValidToday, { startDate: "   ", endDate: "   " }), false);
  assert.equal(isRateCardApplicableForUsagePeriod(cardValidToday, { startDate: null, endDate: "2026-06-15" }), false);
});
