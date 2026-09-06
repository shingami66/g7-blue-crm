#!/usr/bin/env node
/**
 * delegate-skills · test/synthetic-smoke.mjs
 *
 * Minimal, non-production synthetic smoke proof for available providers:
 * - Runs in an isolated temporary Git repository fixture outside the G7 working tree.
 * - Tests Antigravity read-only Reviewer run.
 * - Tests Codex read-only Reviewer run.
 * - Verifies worktree fingerprint preservation (readOnlyViolation === false).
 * - Honors quota discipline: single minimal read-only prompt.
 * - Classifies temporary provider exhaustion cleanly if encountered.
 */

import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

const fixtureDir = mkdtempSync(join(tmpdir(), "g7-synthetic-smoke-"));

function initGitRepo(dir) {
  const git = (args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  git(["init"]);
  git(["config", "user.name", "Host Smoke Tester"]);
  git(["config", "user.email", "smoke@test.local"]);
  writeFileSync(join(dir, "README.md"), "# Synthetic Test Repository\n\nRead-only review target.\n", "utf8");
  writeFileSync(join(dir, "math.ts"), "export function add(a: number, b: number): number {\n  return a + b;\n}\n", "utf8");
  git(["add", "."]);
  git(["commit", "-m", "Initial fixture commit"]);
}

console.log("=== Controlled Live Smoke Proofs ===");
console.log(`Fixture repository initialized at: ${fixtureDir}`);
initGitRepo(fixtureDir);

const runnerScript = join(import.meta.dirname, "../scripts/host-runner.mjs");
const briefPath = join(fixtureDir, "review-brief.txt");
writeFileSync(
  briefPath,
  "READ-ONLY REVIEW TASK: Inspect math.ts. Confirm function syntax is valid. Do not modify any file. Conclude report with 'VERDICT: CLEAN'.",
  "utf8"
);

const report = {
  antigravity_smoke: null,
  codex_smoke: null,
};

// 1. Antigravity Read-Only Reviewer Run
console.log("\n--- Executing Antigravity Read-Only Smoke ---");
try {
  const agyRes = spawnSync(
    process.execPath,
    [
      runnerScript,
      "--provider", "agy",
      "--cd", fixtureDir,
      "--read-only",
      "--sandbox",
      "--print-timeout", "2m",
      "--timeout", "3m",
      "--brief", briefPath,
    ],
    { encoding: "utf8", timeout: 180_000 }
  );

  console.log(`Antigravity exit code: ${agyRes.status}`);
  if (agyRes.stderr) console.log(`Antigravity stderr: ${agyRes.stderr.trim().slice(-300)}`);

  // Parse result.json
  const match = agyRes.stdout.match(/result:\s+([^\r\n]+)/);
  if (match && existsSync(match[1].trim())) {
    const resJson = JSON.parse(readFileSync(match[1].trim(), "utf8"));
    report.antigravity_smoke = {
      status: resJson.status,
      exitCode: resJson.exitCode,
      readOnlyViolation: resJson.readOnlyViolation,
      finalMessagePreview: (resJson.finalMessage || "").slice(0, 150),
    };
    console.log(`Result: status=${resJson.status}, readOnlyViolation=${resJson.readOnlyViolation}`);
  } else {
    report.antigravity_smoke = {
      status: "unclassified_exit",
      exitCode: agyRes.status,
      error: agyRes.stderr || agyRes.stdout,
    };
  }
} catch (err) {
  report.antigravity_smoke = { status: "error", message: err.message };
  console.log(`Antigravity smoke encountered error: ${err.message}`);
}

// 2. Codex Read-Only Reviewer Run
console.log("\n--- Executing Codex Read-Only Smoke ---");
try {
  const codexRes = spawnSync(
    process.execPath,
    [
      runnerScript,
      "--provider", "codex",
      "--cd", fixtureDir,
      "--read-only",
      "--timeout", "3m",
      "--brief", briefPath,
    ],
    { encoding: "utf8", timeout: 180_000 }
  );

  console.log(`Codex exit code: ${codexRes.status}`);
  if (codexRes.stderr) console.log(`Codex stderr: ${codexRes.stderr.trim().slice(-300)}`);

  const match = codexRes.stdout.match(/result:\s+([^\r\n]+)/);
  if (match && existsSync(match[1].trim())) {
    const resJson = JSON.parse(readFileSync(match[1].trim(), "utf8"));
    report.codex_smoke = {
      status: resJson.status,
      exitCode: resJson.exitCode,
      readOnlyViolation: resJson.readOnlyViolation,
      finalMessagePreview: (resJson.finalMessage || "").slice(0, 150),
    };
    console.log(`Result: status=${resJson.status}, readOnlyViolation=${resJson.readOnlyViolation}`);
  } else {
    report.codex_smoke = {
      status: "unclassified_exit",
      exitCode: codexRes.status,
      error: codexRes.stderr || codexRes.stdout,
    };
  }
} catch (err) {
  report.codex_smoke = { status: "error", message: err.message };
  console.log(`Codex smoke encountered error: ${err.message}`);
}

// Cleanup fixture safely on Windows
try {
  rmSync(fixtureDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 500 });
} catch {
  // Ignore Windows temporary file lock
}

console.log("\n=== Smoke Proof Report ===");
console.log(JSON.stringify(report, null, 2));

import("node:assert/strict").then(({ default: assert }) => {
  assert.ok(report.codex_smoke, "Codex smoke proof missing");
  assert.equal(report.codex_smoke.readOnlyViolation, false, "Codex read-only violation must be false");
  assert.ok(report.antigravity_smoke, "Antigravity smoke proof missing");
  assert.equal(report.antigravity_smoke.readOnlyViolation, false, "Antigravity read-only violation must be false");
  console.log("\nAll smoke assertions PASSED.");
});
