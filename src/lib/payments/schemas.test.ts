import test from "node:test";
import assert from "node:assert/strict";
import { recordPaymentSchema } from "./schemas.ts";

const baseInput = {
  invoiceId: "123e4567-e89b-12d3-a456-426614174000",
  requestId: "123e4567-e89b-12d3-a456-426614174001",
  amount: 100,
  date: "2026-07-20",
  method: "bank_transfer",
};

test("accepts valid payment input", () => {
  const result = recordPaymentSchema.safeParse(baseInput);
  assert.equal(result.success, true);
});

test("missing request ID is rejected before mutation", () => {
  const missingRequestIdInput: Partial<typeof baseInput> = { ...baseInput };
  delete missingRequestIdInput.requestId;
  const result = recordPaymentSchema.safeParse(missingRequestIdInput);
  assert.equal(result.success, false);
});

test("invalid UUID request ID is rejected before mutation", () => {
  const result = recordPaymentSchema.safeParse({
    ...baseInput,
    requestId: "invalid-uuid",
  });
  assert.equal(result.success, false);
});

test("invalid payment amount is rejected", () => {
  const result = recordPaymentSchema.safeParse({
    ...baseInput,
    amount: -50,
  });
  assert.equal(result.success, false);
});
