import assert from "node:assert/strict";
import { createRequire } from "node:module";
import test from "node:test";

type ResolveResult = { url: string; shortCircuit?: true };
type ResolveContext = { parentURL?: string };
type ResolveHook = (
  specifier: string,
  context: ResolveContext,
  nextResolve: (specifier: string, context: ResolveContext) => ResolveResult,
) => ResolveResult;

const require = createRequire(import.meta.url);
const { registerHooks } = require("node:module") as {
  registerHooks: (hooks: { resolve: ResolveHook }) => void;
};

registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/i18n/formatting") {
      return { shortCircuit: true, url: new URL("../i18n/formatting.ts", import.meta.url).href };
    }
    return nextResolve(specifier, context);
  },
});

const { formatSupplierAdvanceAmount } = await import("./formatting.ts");

test("advance amounts retain their commitment currency with stable Latin digits", () => {
  assert.equal(formatSupplierAdvanceAmount("SAR", 10000), "SAR 10,000.00");
  assert.equal(formatSupplierAdvanceAmount("USD", 10000), "USD 10,000.00");
  assert.equal(formatSupplierAdvanceAmount("", 10000), "—");
});
