import assert from "node:assert/strict";
import test from "node:test";
import {
  parseAuthoritativeMoney,
  sumAuthoritativeMoney,
} from "./money.ts";

test("parseAuthoritativeMoney accepts canonical non-negative decimals", () => {
  const acceptedAmounts: Array<[unknown, number]> = [
    [0, 0],
    [-0, 0],
    [10.25, 10.25],
    ["0", 0],
    ["0.00", 0],
    ["5", 5],
    ["5.25", 5.25],
    ["1000000.50", 1000000.5],
    [" 5.25 ", 5.25],
  ];

  for (const [rawAmount, expectedAmount] of acceptedAmounts) {
    const parsedAmount = parseAuthoritativeMoney(rawAmount);
    assert.equal(parsedAmount, expectedAmount);
    assert.equal(Object.is(parsedAmount, -0), false);
  }
});

test("parseAuthoritativeMoney rejects unavailable and non-canonical values", () => {
  const rejectedAmounts: unknown[] = [
    null,
    undefined,
    "",
    "   ",
    true,
    false,
    {},
    [],
    new Date(0),
    Symbol("money"),
    () => 10,
    Number.NaN,
    Number.POSITIVE_INFINITY,
    Number.NEGATIVE_INFINITY,
    -1,
    "+5",
    "-0",
    "-1",
    ".5",
    "5.",
    "1e3",
    "1E3",
    "0x10",
    "0X10",
    "0b10",
    "0B10",
    "0o10",
    "0O10",
    "1_000",
    "1,000",
    "SAR 10",
    "10 SAR",
    "Infinity",
    "NaN",
    "1 000",
    "9".repeat(400),
  ];

  for (const rawAmount of rejectedAmounts) {
    assert.equal(parseAuthoritativeMoney(rawAmount), null);
  }
});

test("sumAuthoritativeMoney fails closed and preserves authoritative zero", () => {
  assert.equal(sumAuthoritativeMoney([]), 0);
  assert.equal(sumAuthoritativeMoney(["0"]), 0);
  assert.equal(sumAuthoritativeMoney(["10.25", 5, "0.75"]), 16);
  assert.equal(sumAuthoritativeMoney([1, "0x10"]), null);
  assert.equal(sumAuthoritativeMoney([1, "0b10"]), null);
  assert.equal(sumAuthoritativeMoney([1, "1e3"]), null);
  assert.equal(sumAuthoritativeMoney([1, -1]), null);
  assert.equal(
    sumAuthoritativeMoney([Number.MAX_VALUE, Number.MAX_VALUE]),
    null,
  );
});
