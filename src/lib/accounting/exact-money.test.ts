import assert from "node:assert/strict";
import test from "node:test";
import { formatHalalahAsSar, formatHalalahForExcel } from "./exact-money.ts";

test("formats signed halalah exactly beyond JavaScript safe integer precision", () => {
  assert.equal(formatHalalahAsSar("9007199254740993"), "90,071,992,547,409.93");
  assert.equal(formatHalalahAsSar("-9007199254740993"), "-90,071,992,547,409.93");
  assert.equal(formatHalalahAsSar("0"), "0.00");
  assert.equal(formatHalalahAsSar("-5"), "-0.05");
  assert.equal(formatHalalahForExcel("9007199254740993"), "SAR 90,071,992,547,409.93");
});

test("rejects malformed authoritative amount strings", () => {
  for (const value of ["1.00", "01", "1e6", "", "--1"]) {
    assert.throws(() => formatHalalahAsSar(value));
  }
});
