import assert from "node:assert/strict";
import test from "node:test";
import { getServicesDictionary } from "../i18n/dictionaries/services.ts";
import { formatServiceBillingSummaryAmount } from "./billing-summary.ts";

test("Billing Summary preserves zero, unavailable, and positive amount states", () => {
  const dictionary = getServicesDictionary("en");
  const unavailable = dictionary.billing.cards.amountUnavailable;

  assert.equal(
    formatServiceBillingSummaryAmount(0, "en", unavailable),
    "SAR 0.00",
  );
  assert.equal(
    formatServiceBillingSummaryAmount(null, "en", unavailable),
    unavailable,
  );
  assert.equal(
    formatServiceBillingSummaryAmount(undefined, "en", unavailable),
    unavailable,
  );
  assert.equal(
    formatServiceBillingSummaryAmount(125.5, "en", unavailable),
    "SAR 125.50",
  );
});
