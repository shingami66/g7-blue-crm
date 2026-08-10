import test from "node:test";
import assert from "node:assert/strict";
import {
  isExactPositiveSarAmount,
  isExactPositiveSarAmountText,
  parseExactPositiveSarAmountText,
} from "./amount.ts";
import { recordPaymentSchema } from "./schemas.ts";

const baseInput = {
  invoiceId: "123e4567-e89b-12d3-a456-426614174000",
  requestId: "123e4567-e89b-12d3-a456-426614174001",
  amount: "100",
  date: "2026-07-20",
  method: "bank_transfer",
};

test("accepts exact positive SAR values", () => {
  const rawAmounts = ["10", "10.0", "10.00", "9.99", "0.01"];
  const numericAmounts = [10, 10.0, 10.00, 9.99, 0.01];

  for (const [index, rawAmount] of rawAmounts.entries()) {
    assert.equal(isExactPositiveSarAmountText(rawAmount), true);
    assert.equal(parseExactPositiveSarAmountText(rawAmount), numericAmounts[index]);
    assert.equal(isExactPositiveSarAmount(numericAmounts[index]), true);
    assert.equal(recordPaymentSchema.safeParse({ ...baseInput, amount: rawAmount }).success, true);
  }
});

test("accepts exact scientific-notation SAR values", () => {
  for (const [rawAmount, numericAmount] of [
    ["1e2", 100],
    ["1e-2", 0.01],
    ["1.00e-1", 0.1],
  ] as const) {
    assert.equal(parseExactPositiveSarAmountText(rawAmount), numericAmount);
    assert.equal(recordPaymentSchema.safeParse({ ...baseInput, amount: rawAmount }).success, true);
  }
});

test("rejects sub-cent, non-positive, and non-finite SAR values", () => {
  for (const amount of [9.995, 0.001, 1.234, 0, -1, NaN, Infinity, -Infinity, 0.30000000000000004]) {
    assert.equal(isExactPositiveSarAmount(amount), false);
  }
});

test("rejects raw precision that Number would collapse", () => {
  for (const rawAmount of [
    "9.995",
    "0.001",
    "1.234",
    "10.001",
    "1.23000000000000001",
    "9.9900000000000001",
    "0",
    "-1",
    "NaN",
    "Infinity",
    "-Infinity",
    "0.30000000000000004",
  ]) {
    assert.equal(isExactPositiveSarAmountText(rawAmount), false);
    assert.equal(parseExactPositiveSarAmountText(rawAmount), null);
    assert.equal(recordPaymentSchema.safeParse({ ...baseInput, amount: rawAmount }).success, false);
  }
});

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
    amount: "-50",
  });
  assert.equal(result.success, false);
});

test("server schema requires raw validated amount text", () => {
  const result = recordPaymentSchema.safeParse({
    ...baseInput,
    amount: 100,
  });
  assert.equal(result.success, false);
});
