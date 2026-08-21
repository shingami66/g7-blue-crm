import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
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

test("parent Service Detail uses the narrow summary and the card cannot render Invoice identity", () => {
  const serviceDetailPath = join(
    import.meta.dirname,
    "../../app/(dashboard)/services/[id]/page.tsx",
  );
  const cardPath = join(
    import.meta.dirname,
    "../../app/(dashboard)/services/[id]/ServiceBillingSummaryCard.tsx",
  );
  const serviceDetailSource = readFileSync(serviceDetailPath, "utf8");
  const cardSource = readFileSync(cardPath, "utf8");

  assert.match(serviceDetailSource, /getServiceBillingSummary/);
  assert.match(
    serviceDetailSource,
    /await Promise\.all\(\[[\s\S]*?canReadBillingSummary\s*\? getServiceBillingSummary\(service\.id\)\s*:\s*Promise\.resolve\(null\)/,
  );
  assert.doesNotMatch(serviceDetailSource, /getServiceBillingState/);
  assert.match(cardSource, /canReadInvoices && \(/);
  assert.doesNotMatch(cardSource, /invoiceNumber|depositInvoice|finalInvoice|isolateBidiText/);
});
