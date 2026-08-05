import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("module search control exposes a labeled mode, reusable input, and reset action", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/ui/ModuleSearchControl.tsx"),
    "utf8",
  );

  assert.match(source, /ModuleSearchModeOption/);
  assert.match(source, /htmlFor="module-search-mode"/);
  assert.match(source, /onModeChange/);
  assert.match(source, /<ModuleSearchInput/);
  assert.match(source, /onReset/);
  assert.match(source, /aria-label=\{resetLabel\}/);
  assert.match(source, /<option value="">\{selectModeLabel\}<\/option>/);
  assert.match(source, /disabledPlaceholder/);
  assert.match(source, /sanitizeSearchTerm/);
  assert.match(source, /!activeMode/);
});
