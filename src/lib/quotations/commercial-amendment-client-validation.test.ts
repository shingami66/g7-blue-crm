import assert from "node:assert/strict";
import test from "node:test";
import {
  isDateOnlyValue,
  parseCommercialAmendmentUnitPriceDraft,
  validateCommercialAmendmentValidityWindow,
} from "./commercial-amendment-client-validation.ts";

test("client validity checks reject windows before issue date and after an available Service start", () => {
  assert.equal(
    validateCommercialAmendmentValidityWindow({
      issueDate: "",
      validUntil: "",
      serviceStartDate: null,
    }),
    "issue_date_required",
  );
  assert.equal(
    validateCommercialAmendmentValidityWindow({
      issueDate: "2026-10-10",
      validUntil: "2026-10-09",
      serviceStartDate: "2026-10-20",
    }),
    "valid_until_before_issue_date",
  );
  assert.equal(
    validateCommercialAmendmentValidityWindow({
      issueDate: "2026-10-10",
      validUntil: "2026-10-21",
      serviceStartDate: "2026-10-20",
    }),
    "valid_until_after_service_start",
  );
  assert.equal(
    validateCommercialAmendmentValidityWindow({
      issueDate: "2026-10-21",
      validUntil: "",
      serviceStartDate: "2026-10-20",
    }),
    "issue_date_after_service_start",
  );
});

test("client validity checks accept an allowed window and do not invent a missing Service date", () => {
  assert.equal(
    validateCommercialAmendmentValidityWindow({
      issueDate: "2026-10-10",
      validUntil: "2026-10-20",
      serviceStartDate: "2026-10-20",
    }),
    null,
  );
  assert.equal(
    validateCommercialAmendmentValidityWindow({
      issueDate: "2026-10-10",
      validUntil: "2026-12-01",
      serviceStartDate: null,
    }),
    null,
  );
  assert.equal(isDateOnlyValue("2026-10-20"), true);
  assert.equal(isDateOnlyValue("not-a-date"), false);
});

test("unit price drafts normalize leading zeros without changing their numeric value", () => {
  assert.equal(parseCommercialAmendmentUnitPriceDraft("010000"), 10000);
  assert.equal(parseCommercialAmendmentUnitPriceDraft("10000"), 10000);
  assert.equal(parseCommercialAmendmentUnitPriceDraft("1.239"), 1.239);
  assert.equal(parseCommercialAmendmentUnitPriceDraft("0"), 0);
  assert.equal(parseCommercialAmendmentUnitPriceDraft(""), null);
  assert.equal(parseCommercialAmendmentUnitPriceDraft("-1"), null);
  assert.equal(parseCommercialAmendmentUnitPriceDraft("1e309"), null);
});
