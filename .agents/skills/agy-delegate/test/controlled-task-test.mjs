#!/usr/bin/env node
/**
 * delegate-skills · test/controlled-task-test.mjs
 *
 * Synthetic end-to-end test of the controlled-task state machine:
 * Task Contract -> Writer Lock -> Logical Writer -> Host Validation -> OCR Packet
 * -> Independent Reviewer -> Execution Packet.
 */

import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { runControlledTask } from "../scripts/controlled-task.mjs";

const fixtureDir = mkdtempSync(join(tmpdir(), "g7-controlled-task-test-"));

function initGitRepo(dir) {
  const git = (args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git(["init"]);
  git(["config", "user.name", "Test Runner"]);
  git(["config", "user.email", "runner@test.local"]);
  writeFileSync(join(dir, "README.md"), "# Test Project\n", "utf8");
  writeFileSync(join(dir, "calc.ts"), "export function multiply(a: number, b: number): number { return a * b; }\n", "utf8");
  git(["add", "."]);
  git(["commit", "-m", "Initial commit"]);
}

console.log("=== Controlled Task State Machine Test ===");
initGitRepo(fixtureDir);

const contract = {
  schema_version: "task-contract.v1",
  task_id: "SYNTHETIC-TASK-001",
  logical_writer_id: "SYNTHETIC-WRITER-LANE",
  repository: fixtureDir,
  task_brief: "Review calc.ts. Ensure multiply function is correct. Keep working tree clean. Report CLEAN.",
  authority_boundary: "calc.ts",
  allowed_providers: ["codex", "agy"],
  preferred_provider: "codex",
  failover_allowed: true,
  validation_manifest: {
    diff_check: true,
  },
  review_required: false, // synthetic test: focus on state machine transitions & execution packet
  maximum_review_cycles: 2,
  timeout: "2m",
};

try {
  const packet = runControlledTask(contract);
  console.log(`Final packet status: ${packet.final_status}`);
  assert.equal(packet.schema_version, "execution-packet.v1");
  assert.equal(packet.task_id, "SYNTHETIC-TASK-001");
  assert.equal(packet.logical_writer_id, "SYNTHETIC-WRITER-LANE");
  assert.ok(packet.writer_runs.length > 0);
  assert.ok(packet.execution_packet_path);
  assert.ok(existsSync(packet.execution_packet_path));
  console.log("✓ State machine completed and generated execution packet successfully.");
} finally {
  try {
    rmSync(fixtureDir, { recursive: true, force: true, maxRetries: 3, retryDelay: 500 });
  } catch {
    // ignore
  }
}
