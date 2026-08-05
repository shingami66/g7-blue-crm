import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");

test("global search surfaces are removed while module-local search remains", () => {
  for (const relativePath of [
    "src/app/(dashboard)/search/page.tsx",
    "src/app/api/search/route.ts",
    "src/lib/search/queries.ts",
    "src/lib/search/types.ts",
    "src/lib/i18n/dictionaries/search.ts",
  ]) {
    assert.equal(existsSync(join(REPO_ROOT, relativePath)), false, relativePath);
  }

  const topbar = readFileSync(
    join(REPO_ROOT, "src/components/layout/Topbar.tsx"),
    "utf8",
  );
  const navigation = readFileSync(
    join(REPO_ROOT, "src/lib/i18n/dictionaries/navigation.ts"),
    "utf8",
  );

  assert.doesNotMatch(topbar, /Quick Finder|Global Search|\/search|api\/search/);
  assert.doesNotMatch(navigation, /account\.search/);
  assert.equal(existsSync(join(REPO_ROOT, "src/lib/search/sanitize.ts")), true);
  assert.equal(existsSync(join(REPO_ROOT, "src/lib/search/local.ts")), true);
});
