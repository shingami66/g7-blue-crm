import assert from "node:assert/strict";
import test from "node:test";
import {
  procurementCandidateSchema,
  procurementRequirementSchema,
  procurementSelectionSchema,
} from "./schemas.ts";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const REQUIREMENT_ID = "22222222-2222-4222-8222-222222222222";
const SUPPLIER_ID = "33333333-3333-4333-8333-333333333333";
const REQUEST_ID = "44444444-4444-4444-8444-444444444444";

test("procurement requirements preserve the explicit sourcing path and evidence contract", () => {
  const parsed = procurementRequirementSchema.safeParse({
    serviceId: SERVICE_ID,
    requirement: "Two event ushers",
    sourcingPath: "source",
    sourcingReason: "External specialist coverage is needed.",
    sourcingEvidence: "Operations request OPS-42",
    requestId: REQUEST_ID,
  });

  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.requirementId ?? null, null);
});

test("emergency and sole-source paths cannot omit reason or evidence", () => {
  for (const sourcingPath of ["emergency", "sole_source"] as const) {
    const result = procurementRequirementSchema.safeParse({
      serviceId: SERVICE_ID,
      requirement: "Urgent replacement equipment",
      sourcingPath,
      sourcingReason: " ",
      sourcingEvidence: " ",
      requestId: REQUEST_ID,
    });

    assert.equal(result.success, false, sourcingPath);
  }
});

test("candidate input normalizes optional amounts and rejects invalid values", () => {
  const parsed = procurementCandidateSchema.safeParse({
    requirementId: REQUIREMENT_ID,
    supplierId: SUPPLIER_ID,
    offerSummary: "Availability confirmed for the event date.",
    evidenceRef: "supplier-quote-17",
    quotedAmount: "1250.50",
    comparisonNotes: "Earliest confirmed availability.",
    requestId: REQUEST_ID,
  });

  assert.equal(parsed.success, true);
  if (parsed.success) assert.equal(parsed.data.quotedAmount, 1250.5);

  const invalid = procurementCandidateSchema.safeParse({
    requirementId: REQUIREMENT_ID,
    supplierId: SUPPLIER_ID,
    offerSummary: "Offer",
    evidenceRef: "Quote",
    quotedAmount: "-1",
    comparisonNotes: "",
    requestId: REQUEST_ID,
  });
  assert.equal(invalid.success, false);
});

test("supplier selection requires a reason and evidence", () => {
  const result = procurementSelectionSchema.safeParse({
    requirementId: REQUIREMENT_ID,
    supplierId: SUPPLIER_ID,
    selectionReason: " ",
    selectionEvidence: "",
    requestId: REQUEST_ID,
  });

  assert.equal(result.success, false);
});
