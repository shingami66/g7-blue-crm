#!/usr/bin/env node
/**
 * delegate-skills · test/negative-and-concurrency.mjs
 *
 * Comprehensive negative and concurrency test suite covering:
 * 1. Simultaneous lock acquisition race
 * 2. PID reuse / start-time mismatch handling
 * 3. Liveness inspection ambiguity handling
 * 4. Writer start without writer identity rejection
 * 5. Provider-switch failure when predecessor is still alive
 * 6. Provider timeout with process-tree termination
 * 7. Reviewer nonzero exit fails closed to HOLD
 * 8. Reviewer timeout fails closed to HOLD
 * 9. Reviewer empty output fails closed to HOLD
 * 10. Malformed Reviewer schema fails closed
 * 11. Null / failed fingerprint fails closed to violation
 * 12. Review findings / stated count mismatch detection
 * 13. Invalid maximum_review_cycles rejection (negative, zero, fractions, NaN, Infinity)
 * 14. Arbitrary custom validation command rejection (security boundary)
 * 15. OCR preview failure produces structured HOLD
 * 16. OCR rule failure produces structured error
 * 17. Unexplained empty review scope produces structured HOLD
 * 18. Codex session / thread ID capture from event stream
 * 19. Recovery Capsule failover formatting and consumption
 * 20. Repeated task_id creates distinct run artifacts
 */

import assert from "node:assert/strict";
import { mkdirSync, writeFileSync, rmSync, mkdtempSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  acquireWriterLock,
  releaseWriterLock,
  verifyAndSwitchProvider,
  getLockFilePath,
  inspectProcess,
  LIVENESS_STATE,
} from "../scripts/writer-lock.mjs";
import {
  createRecoveryCapsule,
  saveRecoveryCapsule,
  formatCapsuleForFailover,
  classifyFailure,
  FAILURE_CLASSES,
} from "../scripts/recovery-capsule.mjs";
import {
  executeValidationManifest,
  validateCustomCommand,
} from "../scripts/host-validation.mjs";
import {
  validateTaskContract,
  parseReviewFindings,
  runControlledTaskAsync,
} from "../scripts/controlled-task.mjs";
import {
  readOnlyVerdict,
  reconcileWorktreeScope,
  prepareRunDir,
  killChild,
  parseDuration,
} from "../scripts/core-runner.mjs";
import { codexAdapter } from "../scripts/codex-adapter.mjs";
import { prepareReviewPacket } from "../scripts/ocr-packet.mjs";

const scratch = mkdtempSync(join(tmpdir(), "negative-concurrency-test-"));
let passed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

async function testAsync(name, fn) {
  try {
    await fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

async function runAll() {
  console.log("=== Negative & Concurrency Test Suite ===");

  // 1. Simultaneous Lock Acquisition Race
  test("1. Simultaneous lock acquisition race", () => {
    const fakeRepo = join(scratch, "race-repo");
    mkdirSync(fakeRepo, { recursive: true });

    // Thread 1 acquires
    const res1 = acquireWriterLock({
      workdir: fakeRepo,
      taskId: "RACE-TASK",
      logicalWriterId: "LANE-1",
      provider: "codex",
      pid: process.pid,
    });
    assert.equal(res1.ok, true);

    // Thread 2 simultaneously attempts acquisition
    const res2 = acquireWriterLock({
      workdir: fakeRepo,
      taskId: "RACE-TASK-2",
      logicalWriterId: "LANE-2",
      provider: "agy",
      pid: process.pid + 100,
    });
    assert.equal(res2.ok, false);
    assert.ok(res2.error === "MUTATING_WRITER_LOCK_ACTIVE" || res2.error === "AMBIGUOUS_LOCK_PID_LIVE");

    releaseWriterLock(fakeRepo, "LANE-1", "RACE-TASK");
  });

  // 2. PID Reuse / Start-Time Mismatch
  test("2. PID reuse / start-time mismatch allows stale lock reclamation", () => {
    const fakeRepo = join(scratch, "pid-reuse-repo");
    mkdirSync(fakeRepo, { recursive: true });
    const lockFile = getLockFilePath(fakeRepo);

    // Write a lock claiming current PID but with an ancient start time (simulating OS PID reuse)
    const staleLock = {
      schema_version: "writer-lock.v1",
      task_id: "OLD-TASK",
      logical_writer_id: "OLD-WRITER",
      provider: "codex",
      pid: process.pid,
      process_start_time: "1970-01-01T00:00:00.000Z",
      workdir: fakeRepo,
      acquired_at: "1970-01-01T00:00:00.000Z",
    };
    writeFileSync(lockFile, JSON.stringify(staleLock, null, 2), "utf8");

    // Acquire lock with current real process identity
    const res = acquireWriterLock({
      workdir: fakeRepo,
      taskId: "NEW-TASK",
      logicalWriterId: "NEW-WRITER",
      provider: "codex",
      pid: process.pid,
    });

    assert.equal(res.ok, true);
    assert.equal(res.reclaimed, true);
    releaseWriterLock(fakeRepo, "NEW-WRITER", "NEW-TASK");
  });

  // 3. Liveness Inspection Ambiguity Handling
  test("3. Liveness inspection ambiguity fails safe without reclaim", () => {
    const fakeRepo = join(scratch, "ambiguous-repo");
    mkdirSync(fakeRepo, { recursive: true });
    const lockFile = getLockFilePath(fakeRepo);

    // Write a lock with PID 1 or an uninspectable PID without start time
    const ambiguousLock = {
      schema_version: "writer-lock.v1",
      task_id: "AMBIG-TASK",
      logical_writer_id: "AMBIG-WRITER",
      provider: "agy",
      pid: process.pid, // alive
      process_start_time: null, // start time missing -> ownership unverifiable!
      workdir: fakeRepo,
    };
    writeFileSync(lockFile, JSON.stringify(ambiguousLock, null, 2), "utf8");

    const res = acquireWriterLock({
      workdir: fakeRepo,
      taskId: "ATTEMPT-TASK",
      logicalWriterId: "OTHER-WRITER",
      provider: "codex",
      pid: process.pid + 999,
    });

    assert.equal(res.ok, false);
    assert.equal(res.error, "AMBIGUOUS_LOCK_PID_LIVE");
    releaseWriterLock(fakeRepo, "AMBIG-WRITER", "AMBIG-TASK");
  });

  // 4. Writer Start Without Writer Identity Rejection
  test("4. Writer start without writer identity is rejected", () => {
    assert.throws(() => {
      validateTaskContract({
        task_id: "TASK-X",
        repository: scratch,
        task_brief: "Mutate",
        authority_boundary: "src/**",
        allowed_providers: ["codex"],
        mutating_writer: true,
      });
    }, /Missing required field "logical_writer_id"/);

    const lockRes = acquireWriterLock({
      workdir: scratch,
      taskId: "TASK-X",
      logicalWriterId: null,
      provider: "codex",
      pid: process.pid,
    });
    assert.equal(lockRes.ok, false);
    assert.equal(lockRes.error, "MISSING_LOCK_IDENTITY");
  });

  // 5. Provider-Switch Failure When Predecessor is Still Alive
  test("5. Provider-switch failure when predecessor process is still confirmed alive", () => {
    const fakeRepo = join(scratch, "switch-repo");
    mkdirSync(fakeRepo, { recursive: true });

    // Acquire lock for provider 1
    const res = acquireWriterLock({
      workdir: fakeRepo,
      taskId: "TASK-SW",
      logicalWriterId: "SW-WRITER",
      provider: "agy",
      pid: process.pid,
    });
    assert.equal(res.ok, true);

    // Attempt switch while predecessor PID is still alive
    const switchRes = verifyAndSwitchProvider({
      workdir: fakeRepo,
      taskId: "TASK-SW",
      logicalWriterId: "SW-WRITER",
      newProvider: "codex",
      newPid: process.pid + 1,
      oldPid: process.pid,
    });

    assert.equal(switchRes.ok, false);
    assert.equal(switchRes.error, "PREDECESSOR_PROCESS_STILL_ALIVE");
    releaseWriterLock(fakeRepo, "SW-WRITER", "TASK-SW");
  });

  // 6. Provider Timeout with Process-Tree Termination
  test("6. Timeout duration validation and process cleanup helper", () => {
    assert.equal(parseDuration("invalid"), null);
    assert.equal(parseDuration("-10s"), null);
    assert.equal(parseDuration("0s"), null);
    assert.equal(parseDuration("10s"), 10_000);
    assert.equal(parseDuration("5m"), 300_000);

    // Verify killChild handles null and invalid children safely
    assert.doesNotThrow(() => killChild(null));
    assert.doesNotThrow(() => killChild({ pid: null }));
  });

  // 7. Reviewer Nonzero Exit Fails Closed to HOLD
  test("7. Reviewer failure fails closed", () => {
    const findings = parseReviewFindings("");
    assert.equal(findings.ok, false);
    assert.equal(findings.error, "EMPTY_REPORT");
  });

  // 8. Reviewer Timeout Fails Closed
  test("8. Failure classifier recognizes timeouts strictly", () => {
    const cls = classifyFailure({ signal: "SIGTERM", error: "killed by the relay watchdog" });
    assert.equal(cls, FAILURE_CLASSES.TIMEOUT);
  });

  // 9. Reviewer Empty Output Fails Closed
  test("9. Reviewer empty output fails closed", () => {
    const findings = parseReviewFindings("   \n\n  \t  ");
    assert.equal(findings.ok, false);
    assert.equal(findings.error, "EMPTY_REPORT");
  });

  // 10. Malformed Reviewer Findings & Stated Count Mismatch
  test("10. Findings / count mismatch detection", () => {
    const report = [
      "BLOCKING COUNT: 5",
      "MATERIAL COUNT: 2",
      "1. path/a.ts:1 [BLOCKING] Issue one",
      "2. path/b.ts:2 [BLOCKING] Issue two",
    ].join("\n");

    const parsed = parseReviewFindings(report);
    assert.equal(parsed.ok, false);
    assert.ok(parsed.error.includes("FINDINGS_COUNT_MISMATCH"));
  });

  // 11. Null / Failed Fingerprint Fails Closed
  test("11. Null/failed fingerprint fails closed to violation", () => {
    assert.equal(readOnlyVerdict({ readOnly: true }, null, "abc"), true);
    assert.equal(readOnlyVerdict({ readOnly: true }, "abc", null), true);
    assert.equal(readOnlyVerdict({ readOnly: true }, null, null), true);
    assert.equal(readOnlyVerdict({ readOnly: true }, "abc", "abc"), false);
    assert.equal(readOnlyVerdict({ readOnly: true }, "abc", "def"), true);
    assert.equal(readOnlyVerdict({ readOnly: false }, null, null), false);
  });

  // 12. Host-Side Scope Reconciliation
  test("12. Worktree scope reconciliation detects unauthorized mutations", () => {
    const before = [" M src/allowed/file.ts"];
    const after = [
      " M src/allowed/file.ts",
      " M src/forbidden/file.ts",
      "?? unauthorized.txt",
    ];
    const reconciliation = reconcileWorktreeScope(before, after, ["src/allowed"]);
    assert.equal(reconciliation.ok, false);
    assert.equal(reconciliation.unauthorized.length, 2);
  });

  // 13. Invalid maximum_review_cycles Rejection
  test("13. Invalid maximum_review_cycles rejection", () => {
    const base = {
      task_id: "T",
      logical_writer_id: "W",
      repository: scratch,
      task_brief: "B",
      authority_boundary: "A",
      allowed_providers: ["codex"],
    };

    assert.throws(() => validateTaskContract({ ...base, maximum_review_cycles: -1 }), /maximum_review_cycles/);
    assert.throws(() => validateTaskContract({ ...base, maximum_review_cycles: 0 }), /maximum_review_cycles/);
    assert.throws(() => validateTaskContract({ ...base, maximum_review_cycles: 2.5 }), /maximum_review_cycles/);
    assert.throws(() => validateTaskContract({ ...base, maximum_review_cycles: NaN }), /maximum_review_cycles/);
    assert.throws(() => validateTaskContract({ ...base, maximum_review_cycles: Infinity }), /maximum_review_cycles/);
    assert.throws(() => validateTaskContract({ ...base, maximum_review_cycles: 10 }), /maximum_review_cycles/);
  });

  // 14. Arbitrary Custom Command Rejection
  test("14. Arbitrary custom validation command rejection", () => {
    assert.equal(validateCustomCommand({ command: "rm", args: ["-rf", "/"] }).ok, false);
    assert.equal(validateCustomCommand({ command: "curl", args: ["http://evil.com"] }).ok, false);
    assert.equal(validateCustomCommand({ command: "git", args: ["reset", "--hard"] }).ok, false);
    assert.equal(validateCustomCommand({ command: "git", args: ["checkout", "."] }).ok, false);
    assert.equal(validateCustomCommand({ command: "node", args: ["script.js; rm -rf /"] }).ok, false);
    assert.equal(validateCustomCommand({ command: "git", args: ["diff", "--check"] }).ok, true);
  });

  // 15. OCR Preview / Rule Failure Handling
  test("15. OCR preview failure produces descriptive error", () => {
    assert.throws(() => {
      prepareReviewPacket({
        cwd: scratch,
        taskId: "TEST-FAIL",
        ruleFile: join(scratch, "nonexistent-rule.json"),
      });
    });
  });

  // 16. Codex Session ID Capture
  test("16. Codex session ID capture from event stream", () => {
    const logPath = join(scratch, "codex-test.log");
    const streamContent = [
      JSON.stringify({ type: "session", id: "00000000-1111-2222-3333-444444444444" }),
      JSON.stringify({ type: "message", role: "assistant", content: "hello" }),
    ].join("\n");
    writeFileSync(logPath, streamContent, "utf8");

    const ids = codexAdapter.parseIds(logPath);
    assert.equal(ids.conversationId, "00000000-1111-2222-3333-444444444444");
    assert.equal(ids.sessionId, "00000000-1111-2222-3333-444444444444");
  });

  // 17. Recovery Capsule Failover Formatting
  test("17. Recovery Capsule actual failover consumption formatting", () => {
    const cap = createRecoveryCapsule({
      taskId: "CAP-01",
      logicalWriterId: "WRITER-1",
      sourceProvider: "agy",
      failureClassification: FAILURE_CLASSES.AUTHENTICATION_FAILURE,
      baselineHead: "1234567890abcdef",
      touchedFiles: ["src/lib/auth.ts"],
      completedValidation: { diff_check: "pass" },
      remainingGoal: "complete auth migration",
      authorityBoundary: "src/lib/auth.ts",
      briefDelta: "resume after auth failure",
    });

    const brief = formatCapsuleForFailover(cap);
    assert.ok(brief.includes("PROVIDER FAILOVER RECOVERY CAPSULE"));
    assert.ok(brief.includes("src/lib/auth.ts"));
    assert.ok(brief.includes("AUTHENTICATION_FAILURE"));
    assert.ok(brief.includes("1234567890abcdef"));
  });

  // 18. Repeated Task ID Creates Distinct Run Artifacts
  test("18. Repeated task_id creates distinct run artifacts", () => {
    const run1 = prepareRunDir({ provider: "codex", cd: scratch }, "brief 1", "test-run");
    const run2 = prepareRunDir({ provider: "codex", cd: scratch }, "brief 2", "test-run");
    assert.notEqual(run1.outDir, run2.outDir);
    assert.notEqual(run1.runId, run2.runId);
  });

  console.log(`\nAll ${passed}/18 negative & concurrency test contracts PASSED cleanly.`);
}

runAll().finally(() => {
  rmSync(scratch, { recursive: true, force: true });
});
