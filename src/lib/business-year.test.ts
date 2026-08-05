import assert from "node:assert/strict";
import test from "node:test";
import {
  cleanBusinessYearParam,
  deriveBusinessYearOptions,
  getBusinessYearBounds,
  getBusinessYearIntervalBounds,
  getCurrentBusinessYear,
  getServiceBusinessYearFilter,
  normalizeBusinessYear,
  serviceOverlapsBusinessYear,
} from "./business-year.ts";

test("Business Year uses the Riyadh calendar boundary", () => {
  assert.equal(getCurrentBusinessYear(new Date("2025-12-31T22:30:00.000Z")), 2026);
  assert.deepEqual(getBusinessYearBounds(2026), { start: "2026-01-01", end: "2027-01-01" });
  assert.deepEqual(getBusinessYearIntervalBounds(2026), { start: "2026-01-01", end: "2026-12-31" });
});

test("Business Year input fails closed to the current year", () => {
  assert.equal(normalizeBusinessYear("2024", 2026), 2024);
  assert.equal(normalizeBusinessYear("1999", 2026), 2026);
  assert.equal(normalizeBusinessYear("2027", 2026), 2026);
  assert.equal(normalizeBusinessYear("not-a-year", 2026), 2026);
  assert.equal(cleanBusinessYearParam(2026, 2026), undefined);
  assert.equal(cleanBusinessYearParam(2024, 2026), "2024");
});

test("Business Year options are current-first, deduplicated, and data-derived", () => {
  assert.deepEqual(
    deriveBusinessYearOptions(["2024-02-01", "2026-05-01", "2024-09-01", "1999-01-01"], 2026),
    [2026, 2024],
  );
});

test("Services use inclusive interval overlap and preserve start-only single-date semantics", () => {
  assert.equal(serviceOverlapsBusinessYear("2025-12-31", "2026-01-01", 2026), true);
  assert.equal(serviceOverlapsBusinessYear("2026-12-31", "2027-01-01", 2026), true);
  assert.equal(serviceOverlapsBusinessYear("2025-01-01", "2025-12-31", 2026), false);
  assert.equal(serviceOverlapsBusinessYear("2027-01-01", "2027-01-02", 2026), false);
  assert.equal(serviceOverlapsBusinessYear("2026-06-15", null, 2026), true);
  assert.equal(serviceOverlapsBusinessYear("2025-06-15", null, 2026), false);
  assert.equal(serviceOverlapsBusinessYear(null, "2026-06-15", 2026), false);
  assert.equal(serviceOverlapsBusinessYear("2026-06-20", "2026-06-19", 2026), false);
  assert.match(getServiceBusinessYearFilter(2026), /event_start_date\.lte\.2026-12-31/);
  assert.match(getServiceBusinessYearFilter(2026), /event_end_date\.is\.null/);
  assert.match(getServiceBusinessYearFilter(2026), /event_end_date\.gte\.2026-01-01/);
});
