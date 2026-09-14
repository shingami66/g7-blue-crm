import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";

const REPO_ROOT = join(import.meta.dirname, "../../..");

function readWorkspace() {
  return readFileSync(join(REPO_ROOT, "src/app/(dashboard)/services/[id]/commitments/CommitmentReceiptWorkspace.tsx"), "utf8");
}

function section(source: string, startMarker: string, endMarker: string) {
  const start = source.indexOf(startMarker);
  const end = source.indexOf(endMarker, start);
  assert.ok(start >= 0, `Missing ${startMarker}`);
  assert.ok(end > start, `Missing ${endMarker}`);
  return source.slice(start, end);
}

test("successful service receipt submission resets a stable form and refreshes without event access", () => {
  const receiptForm = section(readWorkspace(), "function ReceiptForm", "function ReceiptRecord");
  const transitionIndex = receiptForm.indexOf("startTransition(async () => {");
  const failureIndex = receiptForm.indexOf("if (!result.success)");
  const returnIndex = receiptForm.indexOf("return;", failureIndex);
  const resetIndex = receiptForm.indexOf("formElement.reset();", transitionIndex);
  const refreshIndex = receiptForm.indexOf("router.refresh();", resetIndex);

  assert.match(receiptForm, /const formElement = event\.currentTarget;\s*const form = new FormData\(formElement\);/);
  assert.doesNotMatch(receiptForm, /event\.currentTarget\.reset\(\)/);
  assert.ok(transitionIndex >= 0);
  assert.ok(failureIndex > transitionIndex);
  assert.ok(returnIndex > failureIndex);
  assert.ok(resetIndex > returnIndex);
  assert.ok(refreshIndex > resetIndex);
  assert.match(receiptForm, /requestId: requestId\(requestRef\)/);
  assert.match(receiptForm, /resetRequestId\(requestRef\)/);
});

test("other async form submitters with reset use the same durable form reference", () => {
  const source = readWorkspace();
  const handlers = [
    section(source, "function CommitmentForm", "function CommitmentCard"),
    section(source, "function ReceiptForm", "function ReceiptRecord"),
    section(source, "function AmendmentForm", "function LifecycleForm"),
  ];

  for (const handler of handlers) {
    assert.match(handler, /const formElement = event\.currentTarget;/);
    assert.match(handler, /new FormData\(formElement\)/);
    assert.doesNotMatch(handler, /event\.currentTarget\.reset\(\)/);
  }
});

test("reviewed receipt correction is collapsed until explicitly opened", () => {
  const correction = section(readWorkspace(), "function ReceiptCorrectionActions", "function AmendmentForm");

  assert.match(correction, /const \[isOpen, setIsOpen\] = useState\(false\)/);
  assert.match(correction, /aria-expanded=\{isOpen\}/);
  assert.match(correction, /aria-controls=\{isOpen \?/);
  assert.match(correction, /isOpen &&/);
  assert.match(correction, /correctedConditionsNotes: status === "ACCEPTED_WITH_CONDITIONS"/);
  assert.match(correction, /dictionary\.fields\.correctionNoteReason/);
  assert.match(correction, /dictionary\.fields\.correctedConditions/);
  assert.match(correction, /dictionary\.fields\.correctionReason/);
});
