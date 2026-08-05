import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

test("module search input owns the accessible clear and native-control collision behavior", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/components/ui/ModuleSearchInput.tsx"),
    "utf8",
  );

  assert.match(source, /type="search"/);
  assert.match(source, /::-webkit-search-cancel-button/);
  assert.match(source, /event\.key === "Escape"/);
  assert.match(source, /aria-label=\{`\$\{clearLabel\}: \$\{ariaLabel \?\? placeholder\}`\}/);
  assert.match(source, /absolute start-3/);
  assert.match(source, /absolute end-2/);
});
