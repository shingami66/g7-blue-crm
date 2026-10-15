import assert from "node:assert/strict";
import test from "node:test";
import { halalahToSarInput, parseSarAsHalalah } from "./journal-operations.ts";

test("manual journal SAR input converts decimal text to exact halalah", () => {
  assert.equal(parseSarAsHalalah("1"), "100");
  assert.equal(parseSarAsHalalah("1.2"), "120");
  assert.equal(parseSarAsHalalah("1.20"), "120");
  assert.equal(parseSarAsHalalah("90071992547409.93"), "9007199254740993");
  assert.equal(parseSarAsHalalah("١٢٣٫٤٥"), "12345");
  assert.equal(parseSarAsHalalah("۱۲۳.۴۵"), "12345");
});

test("manual journal SAR input rejects zero, grouping, signs, and fractions beyond halalah", () => {
  for (const value of ["0", "0.00", "-1", "+1", "1,000", "01", "1.234", "1.", ""]) {
    assert.equal(parseSarAsHalalah(value), null, value);
  }
});

test("journal detail amount is returned as an exact editable SAR decimal", () => {
  assert.equal(halalahToSarInput("9007199254740993"), "90071992547409.93");
  assert.equal(halalahToSarInput("5"), "0.05");
});
