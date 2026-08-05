import test from "node:test";
import assert from "node:assert/strict";
import { matchesLocalSearch } from "./local.ts";

test("module-local search matches identifiers and Arabic text without cross-module queries", () => {
  assert.equal(matchesLocalSearch("SV-004", ["SV-004", "Riyadh"]), true);
  assert.equal(matchesLocalSearch("\u2068SV-004\u2069", ["SV-004", "Riyadh"]), true);
  assert.equal(matchesLocalSearch("الرياض", ["خدمة الرياض"]), true);
  assert.equal(matchesLocalSearch("missing", ["SV-004", "Riyadh"]), false);
  assert.equal(matchesLocalSearch("", ["anything"]), true);
});
