import assert from "node:assert/strict";
import test from "node:test";
import { getW10HTotalLabel } from "./w10h-presentation.ts";

test("W10H report totals use matching English and Arabic labels", () => {
  assert.equal(getW10HTotalLabel("current_year_earnings_halalah", "en"), "Current-year earnings");
  assert.equal(getW10HTotalLabel("current_year_earnings_halalah", "ar"), "نتيجة السنة الحالية");
  assert.equal(getW10HTotalLabel("future_reason", "ar"), "future reason");
});
