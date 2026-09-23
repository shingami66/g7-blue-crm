import assert from "node:assert/strict";
import test from "node:test";
import {
  getEventCostingCommitmentDateContext,
  mapEventCostingCommitmentMetadata,
} from "./commitment-metadata.ts";

test("commitment drill prefers the quotation date and labels approval-date fallback", () => {
  assert.deepEqual(
    getEventCostingCommitmentDateContext("2026-09-18", "2026-09-20"),
    { date: "2026-09-18", kind: "quotation" },
  );
  assert.deepEqual(
    getEventCostingCommitmentDateContext(null, "2026-09-20"),
    { date: "2026-09-20", kind: "approval" },
  );
});

test("commitment presentation metadata maps supplier and quotation business context", () => {
  const metadata = mapEventCostingCommitmentMetadata([{
    id: "commitment-internal-id",
    commitment_source: "supplier_quotation",
    source_reference: null,
    supplier: { name: "FrameLine AV Demo", legal_name: "FrameLine AV Demo LLC" },
    quotation: { supplier_reference: "SQ-2026-0012", quotation_date: "2026-09-18" },
  }]);

  assert.deepEqual(metadata.get("commitment-internal-id"), {
    commitmentSource: "supplier_quotation",
    supplierName: "FrameLine AV Demo",
    sourceReference: null,
    quotationReference: "SQ-2026-0012",
    quotationDate: "2026-09-18",
  });
});

test("commitment metadata uses only truthful fallbacks and ignores malformed rows", () => {
  const metadata = mapEventCostingCommitmentMetadata([
    null,
    {
      id: "other-commitment",
      commitment_source: "unrecognized_source",
      source_reference: "PO-DEV-004",
      supplier: [{ name: "  ", legal_name: "Demo Supplier LLC" }],
      quotation: null,
    },
    { id: "   " },
  ]);

  assert.deepEqual(metadata.get("other-commitment"), {
    commitmentSource: null,
    supplierName: "Demo Supplier LLC",
    sourceReference: "PO-DEV-004",
    quotationReference: null,
    quotationDate: null,
  });
  assert.equal(metadata.size, 1);
});
