import assert from "node:assert/strict";
import test from "node:test";
import { getCurrentRiyadhDate, getQuickReportRange, resolveReportFilters } from "./filters.ts";

test("Reports reject reversed date ranges without querying", () => {
  assert.deepEqual(resolveReportFilters({ year: "2026", from: "2026-08-10", to: "2026-08-01" }), {
    filters: { year: 2026, from: "2026-08-10", to: "2026-08-01" },
    error: "reversed",
  });
});

test("Reports quick ranges use local calendar dates", () => {
  assert.deepEqual(getQuickReportRange(30, new Date("2026-08-04T12:00:00")), {
    from: "2026-07-06",
    to: "2026-08-04",
  });
});

test("Reports accept a bounded Business Year filter", () => {
  assert.deepEqual(resolveReportFilters({ year: "2026" }), {
    filters: { year: 2026, from: undefined, to: undefined },
  });
  assert.deepEqual(resolveReportFilters({ year: "9999" }), {
    filters: { year: 2026, from: undefined, to: undefined },
  });
});

test("Accounts receivable accepts an explicit as-of business date", () => {
  assert.deepEqual(resolveReportFilters({ year: "2026", asOf: "2026-09-21" }), {
    filters: { year: 2026, from: undefined, to: undefined, asOf: "2026-09-21" },
  });
});

test("Accounts receivable defaults business date in Riyadh", () => {
  assert.equal(getCurrentRiyadhDate(new Date("2026-09-21T22:30:00.000Z")), "2026-09-22");
});
