import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

const require = createRequire(import.meta.url);
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: {
    resolve: (specifier: string, context: { parentURL?: string }, nextResolve: (specifier: string, context: { parentURL?: string }) => { url: string; shortCircuit?: true }) => { url: string; shortCircuit?: true };
  }) => void;
};
const sourceRootUrl = new URL("../../", import.meta.url).href;
registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier.startsWith(".") && !specifier.endsWith(".ts") && context.parentURL?.startsWith(sourceRootUrl)) {
      return nextResolve(`${specifier}.ts`, context);
    }
    return nextResolve(specifier, context);
  },
});
const { parseSarAsSafeHalalahNumber } = await import("./bank-reconciliation-operations.ts");

test("bank statement amount input converts SAR to safe integer halalah", () => {
  assert.equal(parseSarAsSafeHalalahNumber("12.34"), 1234);
  assert.equal(parseSarAsSafeHalalahNumber("-0.05"), -5);
  assert.equal(parseSarAsSafeHalalahNumber("0.00", { allowZero: true }), 0);
  assert.equal(parseSarAsSafeHalalahNumber("٩٫٩٩"), 999);
});

test("bank statement amount input rejects zero when disallowed, excess precision, and unsafe integers", () => {
  for (const input of ["0", "1.001", "1e3", "-", "90071992547409.92"]) {
    assert.equal(parseSarAsSafeHalalahNumber(input), null, input);
  }
  assert.equal(parseSarAsSafeHalalahNumber("0", { allowZero: true }), 0);
});
