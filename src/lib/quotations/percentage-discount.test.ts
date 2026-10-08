import assert from "node:assert/strict";
import { test } from "node:test";
import {
  eligiblePercentageBaseHalalas,
  parseDiscountPercentageToBps,
  previewPercentageDiscountSar,
  resolvePercentageDiscountHalalas,
  type PercentageDiscountLine,
} from "./percentage-discount.ts";

const lines: PercentageDiscountLine[] = [
  {
    line_key: "root-a",
    parent_line_key: null,
    commercial_role: "authority_line",
    qty: 1,
    unit_price: 100,
    is_selected: true,
  },
  {
    line_key: "included-a",
    parent_line_key: "root-a",
    commercial_role: "included_component",
    qty: 4,
    unit_price: 0,
    is_selected: true,
  },
  {
    line_key: "selected-a",
    parent_line_key: "root-a",
    commercial_role: "optional_add_on",
    qty: 2,
    unit_price: 25,
    is_selected: true,
  },
  {
    line_key: "unselected-a",
    parent_line_key: "root-a",
    commercial_role: "optional_add_on",
    qty: 1,
    unit_price: 500,
    is_selected: false,
  },
  {
    line_key: "orphan-a",
    parent_line_key: "missing-root",
    commercial_role: "optional_add_on",
    qty: 1,
    unit_price: 700,
    is_selected: true,
  },
];

test("percentage text converts exactly to basis points and rejects excess precision", () => {
  assert.equal(parseDiscountPercentageToBps("0"), 0);
  assert.equal(parseDiscountPercentageToBps("5"), 500);
  assert.equal(parseDiscountPercentageToBps("7.5"), 750);
  assert.equal(parseDiscountPercentageToBps("12.25"), 1_225);
  assert.equal(parseDiscountPercentageToBps("100.00"), 10_000);
  assert.equal(parseDiscountPercentageToBps("0.00"), 0);
  assert.equal(parseDiscountPercentageToBps("0.01"), 1);
  assert.equal(parseDiscountPercentageToBps(" 7.5 "), 750);
  assert.equal(parseDiscountPercentageToBps("100.01"), null);
  assert.equal(parseDiscountPercentageToBps("101"), null);
  assert.equal(parseDiscountPercentageToBps("-1"), null);
  assert.equal(parseDiscountPercentageToBps("12.255"), null);
  assert.equal(parseDiscountPercentageToBps("12."), null);
  assert.equal(parseDiscountPercentageToBps(".5"), null);
  assert.equal(parseDiscountPercentageToBps("NaN"), null);
  assert.equal(parseDiscountPercentageToBps("Infinity"), null);
  assert.equal(parseDiscountPercentageToBps(""), null);
  assert.equal(parseDiscountPercentageToBps("1e2"), null);
});

test("percentage base includes Authority Lines and selected Optional Add-ons only", () => {
  assert.equal(eligiblePercentageBaseHalalas(lines), BigInt(15_000));
  assert.equal(previewPercentageDiscountSar(lines, 1_225), 18.38);
  assert.equal(previewPercentageDiscountSar(lines, 10_000), 150);
  assert.equal(previewPercentageDiscountSar(lines, 0), 0);
});

test("preview matches exact numeric half-halala rounding", () => {
  assert.equal(resolvePercentageDiscountHalalas(BigInt(1), 4_999), BigInt(0));
  assert.equal(resolvePercentageDiscountHalalas(BigInt(1), 5_000), BigInt(1));
  assert.equal(resolvePercentageDiscountHalalas(BigInt(1), 5_001), BigInt(1));
  assert.equal(resolvePercentageDiscountHalalas(BigInt(1), 1), BigInt(0));
  assert.equal(resolvePercentageDiscountHalalas(BigInt(1_500_000), 1_225), BigInt(183_750));
  assert.equal(resolvePercentageDiscountHalalas(BigInt(10_000), 10_000), BigInt(10_000));
  assert.equal(resolvePercentageDiscountHalalas(BigInt(10_000), -1), null);
  assert.equal(resolvePercentageDiscountHalalas(BigInt(10_000), 10_001), null);
});

test("preview rounds each line amount like the quotation numeric contract", () => {
  const fractional: PercentageDiscountLine[] = [
    {
      line_key: "root-a",
      parent_line_key: null,
      commercial_role: "authority_line",
      qty: 0.333,
      unit_price: 1,
      is_selected: true,
    },
  ];
  assert.equal(eligiblePercentageBaseHalalas(fractional), BigInt(33));
  assert.equal(previewPercentageDiscountSar(fractional, 5_000), 0.17);
});

test("percentage eligible base supports multiple roots and safely handles a zero base", () => {
  const multipleRoots: PercentageDiscountLine[] = [
    ...lines.slice(0, 1),
    {
      line_key: "root-b",
      parent_line_key: null,
      commercial_role: "authority_line",
      qty: 3,
      unit_price: 10,
      is_selected: true,
    },
    {
      line_key: "selected-b",
      parent_line_key: "root-b",
      commercial_role: "optional_add_on",
      qty: 1,
      unit_price: 7.25,
      is_selected: true,
    },
  ];
  assert.equal(eligiblePercentageBaseHalalas(multipleRoots), BigInt(13_725));
  assert.equal(previewPercentageDiscountSar(multipleRoots, 500), 6.86);
  assert.equal(eligiblePercentageBaseHalalas([]), BigInt(0));
  assert.equal(previewPercentageDiscountSar([], 10_000), 0);
});
