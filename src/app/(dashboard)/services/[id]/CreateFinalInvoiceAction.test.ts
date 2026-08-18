import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../../../../");
const FINAL_ACTION_PATH = join(
  REPO_ROOT,
  "src/app/(dashboard)/services/[id]/CreateFinalInvoiceAction.tsx",
);

test("CreateFinalInvoiceAction source enforces completed state without re-arming mutation key", () => {
  const source = readFileSync(FINAL_ACTION_PATH, "utf8");

  // 1. Manages local completion state
  assert.match(
    source,
    /const\s*\[isCompleted,\s*setIsCompleted\]\s*=\s*useState\(false\)/,
    "Component must manage an isCompleted boolean state initialized to false",
  );

  // 2. Stable mutation key that is not mutated after success
  assert.match(
    source,
    /const\s*\[mutationKey\]\s*=\s*useState\(\(\)\s*=>\s*crypto\.randomUUID\(\)\)/,
    "Component must initialize a stable mutation key without exposing a setter for re-arming after success",
  );
  assert.doesNotMatch(
    source,
    /setMutationKey\(/,
    "Component must not rotate or regenerate mutation key on success",
  );

  // 3. Marks completed and triggers router.refresh on success
  assert.match(
    source,
    /if\s*\(\s*result\.success\s*\)\s*\{[\s\S]*?setIsCompleted\(true\)[\s\S]*?router\.refresh\(\)/,
    "Component must set isCompleted(true) and invoke router.refresh() upon successful invoice creation",
  );

  // 4. Guard against resubmission in handleSubmit
  assert.match(
    source,
    /if\s*\(\s*disabled\s*\|\|\s*isCompleted\s*\)\s*return/,
    "handleSubmit must bail out if disabled or isCompleted is true",
  );

  // 5. Renders non-resubmittable success message without form or button when completed
  assert.match(
    source,
    /if\s*\(\s*isCompleted\s*\)\s*\{\s*return\s*\(\s*<div[\s\S]*?\{successMsg[\s\S]*?<\/div>\s*\);\s*\}/,
    "Component must render completed view containing only successMsg and no submit form/button",
  );
});
