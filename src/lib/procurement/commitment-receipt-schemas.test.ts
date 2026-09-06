import assert from "node:assert/strict";
import test from "node:test";
import {
  approvedCommitmentSchema,
  commitmentAmendmentSchema,
  evidenceDocumentsSchema,
  serviceReceiptCorrectionSchema,
  serviceReceiptReviewSchema,
  serviceReceiptSchema,
} from "./commitment-receipt-schemas.ts";

const SERVICE_ID = "11111111-1111-4111-8111-111111111111";
const SUPPLIER_ID = "22222222-2222-4222-8222-222222222222";
const QUOTATION_ID = "33333333-3333-4333-8333-333333333333";
const COMMITMENT_ID = "44444444-4444-4444-8444-444444444444";
const RECEIPT_ID = "55555555-5555-4555-8555-555555555555";
const REQUEST_ID = "66666666-6666-4666-8666-666666666666";
const DOCUMENT_ID = "77777777-7777-4777-8777-777777777777";

test("commitment source keeps quotation identity at the header", () => {
  const validQuotation = approvedCommitmentSchema.safeParse({
    commitmentSource: "supplier_quotation",
    serviceId: SERVICE_ID,
    supplierId: SUPPLIER_ID,
    supplierQuotationId: QUOTATION_ID,
    sourceReference: null,
    originalApprovedAmount: "1000.00",
    approvedAt: "2026-09-02T00:00:00.000Z",
    requestId: REQUEST_ID,
  });
  assert.equal(validQuotation.success, true);

  const duplicatedReference = approvedCommitmentSchema.safeParse({
    commitmentSource: "supplier_quotation",
    serviceId: SERVICE_ID,
    supplierId: SUPPLIER_ID,
    supplierQuotationId: QUOTATION_ID,
    sourceReference: "QUOTE-1",
    originalApprovedAmount: 1000,
    approvedAt: "2026-09-02T00:00:00.000Z",
    requestId: REQUEST_ID,
  });
  assert.equal(duplicatedReference.success, false);

  const validContract = approvedCommitmentSchema.safeParse({
    commitmentSource: "approved_contract",
    serviceId: SERVICE_ID,
    supplierId: SUPPLIER_ID,
    supplierQuotationId: null,
    sourceReference: "CONTRACT-1",
    originalApprovedAmount: 1000,
    approvedAt: "2026-09-02T00:00:00.000Z",
    requestId: REQUEST_ID,
  });
  assert.equal(validContract.success, true);
});

test("amendment and receipt schemas preserve optional value evidence", () => {
  assert.equal(commitmentAmendmentSchema.safeParse({
    commitmentId: COMMITMENT_ID,
    amendmentType: "reduction",
    amount: "50.00",
    reason: "Scope reduced by approval",
    evidenceRef: "AMEND-1",
    requestId: REQUEST_ID,
  }).success, true);

  const receipt = serviceReceiptSchema.safeParse({
    serviceId: SERVICE_ID,
    commitmentId: COMMITMENT_ID,
    performanceDate: "2026-09-02",
    deliveredScope: "Half-day event support",
    actualQuantity: "2",
    actualHours: null,
    quantityUnit: "staff",
    receivedAmount: null,
    missingScope: null,
    extraScope: null,
    defectsIncidents: null,
    conditionsNotes: null,
    requestId: REQUEST_ID,
  });
  assert.equal(receipt.success, true);
  if (receipt.success) assert.equal(receipt.data.receivedAmount, null);

  assert.equal(serviceReceiptReviewSchema.safeParse({
    receiptId: RECEIPT_ID,
    acceptanceStatus: "ACCEPTED_WITH_CONDITIONS",
    conditionsNotes: null,
    requestId: REQUEST_ID,
  }).success, false);

  assert.equal(serviceReceiptCorrectionSchema.safeParse({
    receiptId: RECEIPT_ID,
    correctedAcceptanceStatus: "ACCEPTED",
    correctedReceivedAmount: "950.00",
    correctedConditionsNotes: null,
    correctionReason: "Corrected the reviewed value after evidence reconciliation.",
    requestId: REQUEST_ID,
  }).success, true);
  assert.equal(serviceReceiptCorrectionSchema.safeParse({
    receiptId: RECEIPT_ID,
    correctedAcceptanceStatus: "ACCEPTED_WITH_CONDITIONS",
    correctedReceivedAmount: null,
    correctedConditionsNotes: null,
    correctionReason: "Missing conditions note.",
    requestId: REQUEST_ID,
  }).success, false);
});

test("document attachment targets exactly one durable evidence owner", () => {
  assert.equal(evidenceDocumentsSchema.safeParse({ commitmentId: COMMITMENT_ID, documentIds: [DOCUMENT_ID], requestId: REQUEST_ID }).success, true);
  assert.equal(evidenceDocumentsSchema.safeParse({ receiptId: RECEIPT_ID, documentIds: [DOCUMENT_ID], requestId: REQUEST_ID }).success, true);
  assert.equal(evidenceDocumentsSchema.safeParse({ commitmentId: COMMITMENT_ID, receiptId: RECEIPT_ID, documentIds: [DOCUMENT_ID], requestId: REQUEST_ID }).success, false);
});
