import test from "node:test";
import assert from "node:assert/strict";
import { buildIlikeOrFilter } from "./server.ts";

test("server search filters are bounded, field-scoped, and sanitized", () => {
  const filter = buildIlikeOrFilter(["quotation_number", "event"], "QT-1,%(demo)");

  assert.equal(filter, 'quotation_number.ilike."*QT-1, (demo)*",event.ilike."*QT-1, (demo)*"');
  assert.doesNotMatch(filter ?? "", /[%]/);
});

test("empty server search does not add a filter", () => {
  assert.equal(buildIlikeOrFilter(["name"], "   "), undefined);
});

test("server search strips directional controls before building filters", () => {
  const filter = buildIlikeOrFilter(["invoice_number"], "\u2068INV-2026-0031\u2069");

  assert.equal(filter, "invoice_number.ilike.*INV-2026-0031*");
  assert.doesNotMatch(filter ?? "", /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/);
});
