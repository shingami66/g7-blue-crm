#!/usr/bin/env node
/**
 * delegate-skills · recovery-capsule.mjs
 *
 * Structured Recovery Capsule serializer/deserializer and failure classifier.
 * Enables session-resilient handoff across providers while preserving logical Writer identity.
 * Stored in an OS-local runtime directory outside the Git working tree.
 */

import { execFileSync } from "node:child_process";
import { mkdirSync, writeFileSync, renameSync, readFileSync, existsSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const CAPSULE_SCHEMA_VERSION = "recovery-capsule.v1";

export const FAILURE_CLASSES = Object.freeze({
  AUTHENTICATION_FAILURE: "AUTHENTICATION_FAILURE",
  SESSION_EXHAUSTION: "SESSION_EXHAUSTION",
  TIMEOUT: "TIMEOUT",
  TRANSPORT_FAILURE: "TRANSPORT_FAILURE",
  ENVIRONMENT_FAILURE: "ENVIRONMENT_FAILURE",
  MODEL_CAPABILITY_FAILURE: "MODEL_CAPABILITY_FAILURE",
  UNKNOWN_FAILURE: "UNKNOWN_FAILURE",
});

const FORBIDDEN_SECRET_PATTERNS = [
  /bearer\s+[a-zA-Z0-9_\-\.]+/i,
  /ey[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]{10,}/, // JWT pattern
  /sk-[a-zA-Z0-9]{20,}/i,
  /ghp_[a-zA-Z0-9]{20,}/i,
  /api[_-]?key["':\s]+[a-zA-Z0-9_\-]{16,}/i,
  /password["':\s]+[^\s"']+/i,
  /oauth[_-]?code/i,
];

export function getRuntimeCapsuleDir() {
  const dir = join(tmpdir(), "g7-control-layer", "capsules");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function getCapsulePath(taskId, logicalWriterId, runId = null) {
  const safeTask = String(taskId || "task").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeWriter = String(logicalWriterId || "writer").replace(/[^a-zA-Z0-9_-]/g, "_");
  const suffix = runId ? `-${String(runId).replace(/[^a-zA-Z0-9_-]/g, "_")}` : "";
  return join(getRuntimeCapsuleDir(), `capsule-${safeTask}-${safeWriter}${suffix}.json`);
}

export function getGitHeadSha(cwd = process.cwd()) {
  try {
    return execFileSync("git", ["rev-parse", "HEAD"], { cwd, encoding: "utf8", timeout: 5000 }).trim();
  } catch {
    return "UNKNOWN_HEAD";
  }
}

/**
 * Deterministic failure classifier.
 * Strictly adheres to rule: never classify timeout, auth, or transport symptoms
 * as model capability failure.
 */
export function classifyFailure({ exitCode, signal, stderr = "", stdout = "", error = "" }) {
  const text = `${stderr}\n${stdout}\n${error}`.toLowerCase();

  // 1. Timeout
  if (
    signal === "SIGTERM" ||
    signal === "SIGKILL" ||
    exitCode === 124 ||
    text.includes("timed out") ||
    text.includes("timeout") ||
    text.includes("watchdog") ||
    text.includes("deadline exceeded")
  ) {
    return FAILURE_CLASSES.TIMEOUT;
  }

  // 2. Authentication / Permissions
  if (
    text.includes("permission that headless mode cannot prompt for") ||
    text.includes("auto-denied") ||
    text.includes("unauthorized") ||
    text.includes("authentication") ||
    text.includes("login required") ||
    text.includes("auth token") ||
    text.includes("oauth") ||
    text.includes("401") ||
    text.includes("403 forbidden") ||
    text.includes("access denied") ||
    text.includes("escalate_admin")
  ) {
    return FAILURE_CLASSES.AUTHENTICATION_FAILURE;
  }

  // 3. Session / Context Exhaustion
  if (
    text.includes("context window") ||
    text.includes("context length") ||
    text.includes("token limit") ||
    text.includes("rate limit") ||
    text.includes("quota exceeded") ||
    text.includes("conversation limit") ||
    text.includes("session expired") ||
    text.includes("session closed")
  ) {
    return FAILURE_CLASSES.SESSION_EXHAUSTION;
  }

  // 4. Transport / Network
  if (
    text.includes("econnreset") ||
    text.includes("etimedout") ||
    text.includes("econnrefused") ||
    text.includes("enotfound") ||
    text.includes("socket hang up") ||
    text.includes("network error") ||
    text.includes("websocket")
  ) {
    return FAILURE_CLASSES.TRANSPORT_FAILURE;
  }

  // 5. Environment / Host
  if (
    exitCode === 127 ||
    text.includes("enoent") ||
    text.includes("not found on path") ||
    text.includes("command not found") ||
    text.includes("sandbox failure") ||
    text.includes("createprocessasuserw") ||
    text.includes("eacces") ||
    text.includes("out of memory")
  ) {
    return FAILURE_CLASSES.ENVIRONMENT_FAILURE;
  }

  // 6. Explicit Model Capability Failure (requires clear evidence)
  if (
    text.includes("model refused") ||
    text.includes("content filter") ||
    text.includes("safety policy violation")
  ) {
    return FAILURE_CLASSES.MODEL_CAPABILITY_FAILURE;
  }

  return FAILURE_CLASSES.UNKNOWN_FAILURE;
}

/**
 * Validate that content contains no protected secrets.
 */
export function assertNoSecrets(content) {
  const str = typeof content === "string" ? content : JSON.stringify(content);
  for (const pattern of FORBIDDEN_SECRET_PATTERNS) {
    if (pattern.test(str)) {
      throw new Error(`RECOVERY_CAPSULE_SECRET_REJECTED: Sensitive credential pattern detected (${pattern})`);
    }
  }
}

/**
 * Create a validated Recovery Capsule object.
 */
export function createRecoveryCapsule({
  taskId,
  logicalWriterId,
  sourceProvider,
  failureClassification,
  baselineHead = null,
  touchedFiles = [],
  completedValidation = {},
  remainingGoal = "",
  authorityBoundary = "",
  briefDelta = "",
  cwd = process.cwd(),
}) {
  if (!taskId) throw new Error("Missing required field: taskId");
  if (!logicalWriterId) throw new Error("Missing required field: logicalWriterId");
  if (!sourceProvider) throw new Error("Missing required field: sourceProvider");
  if (!failureClassification || !FAILURE_CLASSES[failureClassification]) {
    throw new Error(`Invalid failureClassification: ${failureClassification}`);
  }

  const capsule = {
    schema_version: CAPSULE_SCHEMA_VERSION,
    task_id: taskId,
    logical_writer_id: logicalWriterId,
    source_provider: sourceProvider,
    failure_classification: failureClassification,
    baseline_head: baselineHead || getGitHeadSha(cwd),
    touched_files: Array.isArray(touchedFiles) ? touchedFiles : [],
    completed_validation: completedValidation || {},
    remaining_goal: remainingGoal || "",
    authority_boundary: authorityBoundary || "",
    brief_delta: briefDelta || "",
    created_at: new Date().toISOString(),
  };

  assertNoSecrets(capsule);
  return capsule;
}

/**
 * Save Recovery Capsule to OS-local runtime directory using atomic write.
 */
export function saveRecoveryCapsule(capsule, runId = null) {
  assertNoSecrets(capsule);
  const filePath = getCapsulePath(capsule.task_id, capsule.logical_writer_id, runId);
  const tempPath = `${filePath}.${Date.now()}.${Math.random().toString(36).slice(2, 6)}.tmp`;
  writeFileSync(tempPath, `${JSON.stringify(capsule, null, 2)}\n`, "utf8");
  try {
    renameSync(tempPath, filePath);
  } catch {
    // On Windows, if destination exists, renameSync may throw; fallback to overwrite
    writeFileSync(filePath, `${JSON.stringify(capsule, null, 2)}\n`, "utf8");
    if (existsSync(tempPath)) unlinkSync(tempPath);
  }
  return filePath;
}

/**
 * Load Recovery Capsule from OS-local runtime directory.
 */
export function loadRecoveryCapsule(taskId, logicalWriterId, runId = null) {
  const filePath = getCapsulePath(taskId, logicalWriterId, runId);
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, "utf8");
  const parsed = JSON.parse(content);
  assertNoSecrets(parsed);
  return parsed;
}

/**
 * Format a Recovery Capsule into a structured prompt brief for failover provider.
 */
export function formatCapsuleForFailover(capsule) {
  return [
    `=== PROVIDER FAILOVER RECOVERY CAPSULE ===`,
    `TASK ID: ${capsule.task_id}`,
    `LOGICAL WRITER ID: ${capsule.logical_writer_id}`,
    `PREDECESSOR PROVIDER: ${capsule.source_provider}`,
    `FAILURE CLASSIFICATION: ${capsule.failure_classification}`,
    `BASELINE COMMIT (HEAD): ${capsule.baseline_head}`,
    `AUTHORITY BOUNDARY: ${capsule.authority_boundary}`,
    `TOUCHED FILES SO FAR (${capsule.touched_files.length}):`,
    capsule.touched_files.length > 0
      ? capsule.touched_files.map((f) => `- ${f}`).join("\n")
      : "(none)",
    `COMPLETED VALIDATION:`,
    JSON.stringify(capsule.completed_validation, null, 2),
    `REMAINING GOAL:`,
    capsule.remaining_goal || "(continue task until complete and validated)",
    `BRIEF DELTA / RECOVERY INSTRUCTIONS:`,
    capsule.brief_delta || "(resume execution safely within authority boundary)",
    `==========================================`,
  ].join("\n\n");
}
