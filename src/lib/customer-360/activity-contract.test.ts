import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");

function read(relativePath: string) {
  return readFileSync(join(REPO_ROOT, relativePath), "utf8");
}

test("Customer 360 activity uses real Service creation dates and human context", () => {
  const queries = read("src/lib/customer-360/queries.ts");
  const workspace = read("src/app/(dashboard)/customers/[id]/Customer360Workspace.tsx");
  const activityBuilder = queries.slice(queries.indexOf("function buildOperationalActivity"));

  assert.match(activityBuilder, /date:\s*service\.createdAt/);
  assert.doesNotMatch(activityBuilder, /date:\s*service\.eventStartDate/);
  assert.doesNotMatch(activityBuilder, /9999-12-31/);
  assert.match(workspace, /service\.serviceNumber/);
  assert.match(workspace, /service\.serviceTitle/);
  assert.match(workspace, /customer360-activity/);
  assert.match(workspace, /UiDateText/);
});
