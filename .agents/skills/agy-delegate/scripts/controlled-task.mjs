#!/usr/bin/env node
/**
 * delegate-skills · controlled-task.mjs
 *
 * Deterministic host-owned state machine executing the end-to-end control loop:
 * Task Contract -> Writer Lock -> Logical Writer -> Mutation Scope Reconciliation
 * -> Failure Classification -> Safe Failover -> Host Validation -> OCR Delegation Packet
 * -> Independent Read-Only Reviewer -> Fail-Closed Reviewer & Fingerprint Checks
 * -> Structured Findings Reconciliation -> Same Logical Writer Repair -> Execution Packet.
 *
 * NOT a daemon, service, or external framework.
 * Does NOT issue the Controller Task Verdict.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { tmpdir } from "node:os";
import { randomBytes } from "node:crypto";

import {
  prepareRunDir,
  gitWorktreeFingerprint,
  readOnlyVerdict,
  gitTouchedFiles,
  reconcileWorktreeScope,
  parseDuration,
  makeResultWriter,
  executeSupervisedTurn,
} from "./core-runner.mjs";
import { antigravityAdapter } from "./antigravity-adapter.mjs";
import { codexAdapter } from "./codex-adapter.mjs";
import {
  acquireWriterLock,
  releaseWriterLock,
  verifyAndSwitchProvider,
} from "./writer-lock.mjs";
import {
  createRecoveryCapsule,
  saveRecoveryCapsule,
  formatCapsuleForFailover,
  classifyFailure,
  FAILURE_CLASSES,
  getGitHeadSha,
} from "./recovery-capsule.mjs";
import { prepareReviewPacket } from "./ocr-packet.mjs";
import { executeValidationManifest } from "./host-validation.mjs";

export const CONTRACT_SCHEMA_VERSION = "task-contract.v1";
export const EXECUTION_PACKET_SCHEMA_VERSION = "execution-packet.v1";

const ADAPTERS = {
  agy: antigravityAdapter,
  antigravity: antigravityAdapter,
  codex: codexAdapter,
};

export function getRuntimePacketDir() {
  const dir = join(tmpdir(), "g7-control-layer", "packets");
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Validate incoming Task Contract against strict schema constraints.
 */
export function validateTaskContract(contract) {
  if (!contract || typeof contract !== "object") {
    throw new Error("TASK_CONTRACT_INVALID: Contract must be a valid JSON object");
  }

  const required = [
    "task_id",
    "logical_writer_id",
    "repository",
    "task_brief",
    "authority_boundary",
    "allowed_providers",
  ];
  for (const field of required) {
    if (!contract[field]) {
      throw new Error(`TASK_CONTRACT_INVALID: Missing required field "${field}"`);
    }
  }

  if (!Array.isArray(contract.allowed_providers) || contract.allowed_providers.length === 0) {
    throw new Error("TASK_CONTRACT_INVALID: allowed_providers must be a non-empty array");
  }

  for (const p of contract.allowed_providers) {
    if (!ADAPTERS[String(p).toLowerCase()]) {
      throw new Error(`TASK_CONTRACT_INVALID: Unsupported provider "${p}" in allowed_providers`);
    }
  }

  // Validate maximum_review_cycles as bounded positive integer (1 to 5)
  const maxCycles = contract.maximum_review_cycles ?? 2;
  if (
    typeof maxCycles !== "number" ||
    !Number.isInteger(maxCycles) ||
    maxCycles < 1 ||
    maxCycles > 5
  ) {
    throw new Error(
      `TASK_CONTRACT_INVALID: maximum_review_cycles must be an integer between 1 and 5 (got: ${maxCycles})`
    );
  }

  // Validate timeout
  const timeoutStr = contract.timeout || "30m";
  const timeoutMs = parseDuration(timeoutStr);
  if (timeoutMs === null || timeoutMs < 1000) {
    throw new Error(`TASK_CONTRACT_INVALID: Invalid timeout "${timeoutStr}" (must be at least 1s)`);
  }

  const preferredReviewer = contract.preferred_reviewer_provider
    ? String(contract.preferred_reviewer_provider).toLowerCase()
    : null;
  if (preferredReviewer && !contract.allowed_providers.map((p) => p.toLowerCase()).includes(preferredReviewer)) {
    throw new Error(
      `TASK_CONTRACT_INVALID: preferred_reviewer_provider "${preferredReviewer}" must be in allowed_providers`
    );
  }

  return {
    schema_version: contract.schema_version || CONTRACT_SCHEMA_VERSION,
    task_id: contract.task_id,
    logical_writer_id: contract.logical_writer_id,
    repository: resolve(contract.repository),
    task_brief: contract.task_brief,
    authority_boundary: contract.authority_boundary,
    allowed_providers: contract.allowed_providers.map((p) => String(p).toLowerCase()),
    preferred_provider: String(contract.preferred_provider || contract.allowed_providers[0]).toLowerCase(),
    failover_allowed: Boolean(contract.failover_allowed),
    dangerously_skip_permissions: Boolean(contract.dangerously_skip_permissions),
    required_skills_or_guidance: contract.required_skills_or_guidance || [],
    validation_manifest: contract.validation_manifest || { diff_check: true },
    review_required: contract.review_required !== false,
    maximum_review_cycles: maxCycles,
    timeout: timeoutStr,
    mutating_writer: contract.mutating_writer !== false && contract.no_mutating_writer !== true,
    target_files: contract.target_files || null,
    target_prefix: contract.target_prefix || null,
    review_questions: contract.review_questions || null,
    preferred_reviewer_provider: preferredReviewer,
  };
}

/**
 * Execute a supervised provider turn with watchdog supervision.
 */
async function runSupervisedTurnAsync({ adapter, opts, brief, outPrefix, onChildSpawn }) {
  const printTimeoutMs = parseDuration(opts.printTimeout || "30m") || 1_800_000;
  const watchdogMs = opts.timeout ? parseDuration(opts.timeout) : printTimeoutMs + 60_000;
  const run = prepareRunDir(opts, brief, outPrefix);

  let version;
  try {
    version = adapter.versionProbe(watchdogMs);
  } catch {
    version = "unknown";
  }

  const writeResult = makeResultWriter(opts, version, run, adapter.parseIds);

  return executeSupervisedTurn({
    adapter,
    opts,
    brief,
    run,
    writeResult,
    watchdogMs,
    exitOnClose: false,
    onChildSpawn,
  });
}

/**
 * Parse findings from Reviewer report with count consistency validation.
 */
export function parseReviewFindings(reportText) {
  if (!reportText || !reportText.trim()) {
    return { ok: false, error: "EMPTY_REPORT", blocking: [], material: [], minor: [], all: [] };
  }

  const lines = reportText.split("\n");
  const blocking = [];
  const material = [];
  const minor = [];
  const all = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    // Check for explicit severity markers
    const isBlocking = /\[BLOCKING\]/i.test(line) || /^BLOCKING\b/i.test(line);
    const isMaterial = /\[MATERIAL\]/i.test(line) || /^MATERIAL\b/i.test(line);
    const isMinor = /\[MINOR\]/i.test(line) || /^MINOR\b/i.test(line);

    if (isBlocking) {
      blocking.push(line);
      all.push({ severity: "BLOCKING", text: line });
    } else if (isMaterial) {
      material.push(line);
      all.push({ severity: "MATERIAL", text: line });
    } else if (isMinor) {
      minor.push(line);
      all.push({ severity: "MINOR", text: line });
    }
  }

  // Check if report explicitly specified counts (e.g. "BLOCKING COUNT: 8")
  let statedBlocking = null;
  let statedMaterial = null;
  let statedMinor = null;

  const bMatch = reportText.match(/BLOCKING(?:\s+COUNT)?[:\s]+(\d+)/i);
  if (bMatch) statedBlocking = parseInt(bMatch[1], 10);

  const mMatch = reportText.match(/MATERIAL(?:\s+COUNT)?[:\s]+(\d+)/i);
  if (mMatch) statedMaterial = parseInt(mMatch[1], 10);

  const minMatch = reportText.match(/MINOR(?:\s+COUNT)?[:\s]+(\d+)/i);
  if (minMatch) statedMinor = parseInt(minMatch[1], 10);

  // If stated counts exist and conflict with parsed array length, report count mismatch
  if (
    (statedBlocking !== null && statedBlocking !== blocking.length) ||
    (statedMaterial !== null && statedMaterial !== material.length) ||
    (statedMinor !== null && statedMinor !== minor.length)
  ) {
    return {
      ok: false,
      error: `FINDINGS_COUNT_MISMATCH: Stated counts (${statedBlocking ?? "?"}/${statedMaterial ?? "?"}/${statedMinor ?? "?"}) do not match parsed findings (${blocking.length}/${material.length}/${minor.length})`,
      blocking,
      material,
      minor,
      all,
      statedCounts: { blocking: statedBlocking, material: statedMaterial, minor: statedMinor },
    };
  }

  return { ok: true, blocking, material, minor, all };
}

/**
 * Execute the complete bounded controlled task loop asynchronously.
 */
export async function runControlledTaskAsync(rawContract, { cwd = process.cwd() } = {}) {
  const contract = validateTaskContract(rawContract);
  const repo = contract.repository;
  const runId = `${contract.task_id}-${Date.now()}-${randomBytes(4).toString("hex")}`;

  const executionPacket = {
    schema_version: EXECUTION_PACKET_SCHEMA_VERSION,
    task_id: contract.task_id,
    run_id: runId,
    logical_writer_id: contract.logical_writer_id,
    repository: repo,
    started_at: new Date().toISOString(),
    finished_at: null,
    final_status: "INITIALIZING",
    active_provider: contract.preferred_provider,
    writer_runs: [],
    validation_evidence: null,
    ocr_packet: null,
    review_cycles: [],
    unresolved_findings: [],
    advisories: [],
    recovery_capsule: null,
    error: null,
    execution_packet_path: null,
  };

  let lockAcquired = false;
  let activeChildPid = process.pid;

  // State 1: Acquire Mutating Writer Lock
  if (contract.mutating_writer) {
    const lockRes = acquireWriterLock({
      workdir: repo,
      taskId: contract.task_id,
      logicalWriterId: contract.logical_writer_id,
      provider: contract.preferred_provider,
      pid: process.pid,
    });

    if (!lockRes.ok) {
      executionPacket.final_status = "HOLD";
      executionPacket.error = `WRITER_LOCK_UNAVAILABLE: ${lockRes.message}`;
      return finalizePacket(executionPacket, repo);
    }
    lockAcquired = true;
  }

  let currentProvider = contract.preferred_provider;
  let conversationId = null;

  try {
    // State 2: Execute Logical Writer
    let writerSuccess = !contract.mutating_writer;
    let writerOutcome = null;

    if (contract.mutating_writer) {
      const beforeTouched = gitTouchedFiles(repo);

      const writerBrief = [
        `TASK: ${contract.task_id}`,
        `LOGICAL_WRITER: ${contract.logical_writer_id}`,
        `AUTHORITY_BOUNDARY:\n${contract.authority_boundary}`,
        `BRIEF:\n${contract.task_brief}`,
      ].join("\n\n");

      const writerOpts = {
        provider: currentProvider,
        cd: repo,
        readOnly: false,
        timeout: contract.timeout,
        dangerouslySkipPermissions: contract.dangerously_skip_permissions,
      };

      writerOutcome = await runSupervisedTurnAsync({
        adapter: ADAPTERS[currentProvider],
        opts: writerOpts,
        brief: writerBrief,
        outPrefix: `ctrl-writer-${currentProvider}`,
        onChildSpawn: (pid) => {
          activeChildPid = pid;
        },
      });

      executionPacket.writer_runs.push({
        provider: currentProvider,
        status: writerOutcome.status,
        exitCode: writerOutcome.exitCode,
        touchedFiles: writerOutcome.touchedFiles,
        error: writerOutcome.error,
      });

      if (writerOutcome.conversationId) {
        conversationId = writerOutcome.conversationId;
      }

      // Check mutation scope reconciliation
      const afterTouched = gitTouchedFiles(repo);
      const authorizedPrefixes = [
        contract.target_prefix,
        ...(contract.target_files || []),
      ].filter(Boolean);

      if (authorizedPrefixes.length > 0) {
        const reconciliation = reconcileWorktreeScope(beforeTouched, afterTouched, authorizedPrefixes);
        if (!reconciliation.ok) {
          executionPacket.final_status = "HOLD";
          executionPacket.error = `MUTATION_SCOPE_VIOLATION: Writer mutated files outside authorized scope: ${reconciliation.unauthorized.join(", ")}`;
          return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
        }
      }

      if (writerOutcome.status === "completed") {
        writerSuccess = true;
      } else {
        // Writer failed: Classify failure before attempting failover
        const classified = classifyFailure({
          exitCode: writerOutcome.exitCode,
          signal: writerOutcome.signal,
          stderr: (writerOutcome.stderrTail || []).join("\n"),
          stdout: writerOutcome.finalMessage,
          error: writerOutcome.error,
        });

        const canFailover =
          contract.failover_allowed &&
          contract.allowed_providers.length > 1 &&
          classified !== FAILURE_CLASSES.MODEL_CAPABILITY_FAILURE &&
          classified !== FAILURE_CLASSES.UNKNOWN_FAILURE;

        if (canFailover) {
          const altProvider = contract.allowed_providers.find((p) => p !== currentProvider);
          if (altProvider) {
            // Prove predecessor termination & update lock
            const switchRes = verifyAndSwitchProvider({
              workdir: repo,
              taskId: contract.task_id,
              logicalWriterId: contract.logical_writer_id,
              newProvider: altProvider,
              newPid: process.pid,
              oldPid: activeChildPid,
            });

            if (!switchRes.ok) {
              executionPacket.final_status = "HOLD";
              executionPacket.error = `FAILOVER_LOCK_SWITCH_FAILED: ${switchRes.message}`;
              return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
            }

            // Create and serialize Recovery Capsule with true git HEAD
            const capsule = createRecoveryCapsule({
              taskId: contract.task_id,
              logicalWriterId: contract.logical_writer_id,
              sourceProvider: currentProvider,
              failureClassification: classified,
              baselineHead: getGitHeadSha(repo),
              touchedFiles: writerOutcome.touchedFiles || [],
              remainingGoal: contract.task_brief,
              authorityBoundary: contract.authority_boundary,
              briefDelta: `Predecessor ${currentProvider} failed with ${classified}. Resume logical writer lane.`,
              cwd: repo,
            });
            const capPath = saveRecoveryCapsule(capsule, runId);
            executionPacket.recovery_capsule = { path: capPath, classification: classified };

            currentProvider = altProvider;
            executionPacket.active_provider = altProvider;

            // Consume Recovery Capsule in failover brief
            const failoverBrief = formatCapsuleForFailover(capsule);

            const altOutcome = await runSupervisedTurnAsync({
              adapter: ADAPTERS[altProvider],
              opts: {
                provider: altProvider,
                cd: repo,
                readOnly: false,
                timeout: contract.timeout,
                dangerouslySkipPermissions: contract.dangerously_skip_permissions,
              },
              brief: failoverBrief,
              outPrefix: `ctrl-writer-failover-${altProvider}`,
              onChildSpawn: (pid) => {
                activeChildPid = pid;
              },
            });

            executionPacket.writer_runs.push({
              provider: altProvider,
              status: altOutcome.status,
              exitCode: altOutcome.exitCode,
              touchedFiles: altOutcome.touchedFiles,
              error: altOutcome.error,
            });

            if (altOutcome.status === "completed") {
              writerSuccess = true;
              writerOutcome = altOutcome;
              if (altOutcome.conversationId) conversationId = altOutcome.conversationId;
            }
          }
        }
      }

      if (!writerSuccess) {
        executionPacket.final_status = "HOLD";
        executionPacket.error = writerOutcome?.error || "Logical Writer execution failed";
        return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
      }
    }

    // State 3: Host-Owned Validation
    let validation = executeValidationManifest(contract.validation_manifest, { cwd: repo });
    executionPacket.validation_evidence = validation;

    let reviewCycles = 0;
    while (reviewCycles < contract.maximum_review_cycles) {
      reviewCycles += 1;

      // If validation failed prior to review, attempt repair by same Writer
      if (!validation.ok && contract.mutating_writer) {
        const repairBrief = [
          `HOST VALIDATION FAILED:`,
          JSON.stringify(validation.summary),
          `Please inspect failures, repair the touched code inside authority boundary, and report.`,
        ].join("\n\n");

        await runSupervisedTurnAsync({
          adapter: ADAPTERS[currentProvider],
          opts: {
            provider: currentProvider,
            cd: repo,
            readOnly: false,
            timeout: contract.timeout,
            resumeLast: Boolean(conversationId),
            conversation: conversationId,
            dangerouslySkipPermissions: contract.dangerously_skip_permissions,
          },
          brief: repairBrief,
          outPrefix: `ctrl-repair-val-${reviewCycles}`,
          onChildSpawn: (pid) => {
            activeChildPid = pid;
          },
        });

        validation = executeValidationManifest(contract.validation_manifest, { cwd: repo });
        executionPacket.validation_evidence = validation;
        if (!validation.ok) {
          executionPacket.final_status = "HOLD";
          executionPacket.error = "Host validation failed after repair attempt";
          return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
        }
      }

      if (!contract.review_required) {
        break;
      }

      // State 4: Open Code Review Delegation Packet
      let ocrPacketResult;
      try {
        ocrPacketResult = prepareReviewPacket({
          cwd: repo,
          taskId: contract.task_id,
          runId,
          targetFiles: contract.target_files,
          targetPrefix: contract.target_prefix,
          includeTests: Boolean(contract.validation_manifest?.full_tests),
        });
      } catch (ocrErr) {
        executionPacket.final_status = "HOLD";
        executionPacket.error = `OCR_DELEGATION_FAILURE: ${ocrErr.message}`;
        return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
      }

      executionPacket.ocr_packet = {
        total_reviewable: ocrPacketResult.packet.review_scope.total_reviewable,
        rule_groups_count: ocrPacketResult.packet.review_scope.rule_groups_count,
        outPath: ocrPacketResult.outPath,
      };

      if (ocrPacketResult.packet.reviewable_files.length === 0) {
        // Verify whether git status actually has changed files in the target scope
        const touched = gitTouchedFiles(repo) || [];
        const normPrefix = contract.target_prefix ? contract.target_prefix.replaceAll("\\", "/").replace(/^\.\//, "") : "";
        const targetTouched = touched.filter((f) => {
          const p = f.slice(3).trim().replaceAll("\\", "/").replace(/^\.\//, "");
          return normPrefix ? p.startsWith(normPrefix) : true;
        });

        if (targetTouched.length > 0) {
          executionPacket.final_status = "HOLD";
          executionPacket.error = `UNEXPLAINED_EMPTY_REVIEW_SCOPE: Target scope contains ${targetTouched.length} modified files but OCR resolved 0 reviewable files`;
          return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
        }
        // Genuinely clean scope
        break;
      }

      // State 5: Fresh Independent Read-Only Reviewer
      let reviewerProvider =
        contract.preferred_reviewer_provider ||
        contract.allowed_providers.find((p) => p !== currentProvider) ||
        currentProvider;

      const questionsBlock = Array.isArray(contract.review_questions) && contract.review_questions.length > 0
        ? `\n\nREVIEW QUESTIONS TO INSPECT:\n${contract.review_questions.map((q, idx) => `${idx + 1}. ${q}`).join("\n")}`
        : "";

      const diffBlock = ocrPacketResult.packet.diff_context
        ? `\n\nRELEVANT DIFF AND SOURCE CODE CONTEXT:\n${ocrPacketResult.packet.diff_context}`
        : "";

      const reviewBrief = [
        `REVIEW BRIEF (READ-ONLY / FINDINGS-ONLY):`,
        `TASK: ${contract.task_id}`,
        `REVIEWABLE FILES (${ocrPacketResult.packet.reviewable_files.length}):`,
        ocrPacketResult.packet.reviewable_files.map((f) => `- ${f.path} (${f.status})`).join("\n"),
        `REVIEW RULES:`,
        ocrPacketResult.packet.rule_groups.map((g) => `Pattern: ${g.pattern}\nRule: ${g.rule}`).join("\n\n"),
        questionsBlock,
        diffBlock,
        `CONTRACT: All diffs and source files are provided directly in this brief. Do NOT attempt to run shell commands, bash, or powershell. Do NOT modify any file.`,
        `Report findings strictly classified as [BLOCKING], [MATERIAL], or [MINOR]. Address each of the 20 review questions. If all questions pass with zero issues, state 'VERDICT: CLEAN'.`,
      ].filter(Boolean).join("\n\n");

      let reviewerOutcome = await runSupervisedTurnAsync({
        adapter: ADAPTERS[reviewerProvider],
        opts: {
          provider: reviewerProvider,
          cd: repo,
          readOnly: true,
          sandbox: true,
          timeout: contract.timeout,
        },
        brief: reviewBrief,
        outPrefix: `ctrl-reviewer-cycle-${reviewCycles}`,
        onChildSpawn: null,
      });

      // Reviewer fallback if execution failed
      if (reviewerOutcome.status !== "completed") {
        const classified = classifyFailure({
          exitCode: reviewerOutcome.exitCode,
          signal: reviewerOutcome.signal,
          stderr: (reviewerOutcome.stderrTail || []).join("\n"),
          stdout: reviewerOutcome.finalMessage,
          error: reviewerOutcome.error,
        });
        const altReviewer = contract.allowed_providers.find((p) => p !== reviewerProvider);
        if (altReviewer && (contract.failover_allowed || classified === FAILURE_CLASSES.AUTHENTICATION_FAILURE)) {
          const altReviewOutcome = await runSupervisedTurnAsync({
            adapter: ADAPTERS[altReviewer],
            opts: {
              provider: altReviewer,
              cd: repo,
              readOnly: true,
              sandbox: true,
              timeout: contract.timeout,
            },
            brief: reviewBrief,
            outPrefix: `ctrl-reviewer-failover-${reviewCycles}`,
            onChildSpawn: null,
          });
          if (altReviewOutcome.status === "completed") {
            reviewerOutcome = altReviewOutcome;
            reviewerProvider = altReviewer;
          }
        }
      }

      // State 6: Fail-Closed Reviewer & Fingerprint Checks
      if (reviewerOutcome.status !== "completed") {
        executionPacket.final_status = "HOLD";
        executionPacket.error = `REVIEWER_EXECUTION_FAILED: Reviewer (${reviewerProvider}) exited with status ${reviewerOutcome.status} (exit ${reviewerOutcome.exitCode})`;
        return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
      }

      if (!reviewerOutcome.finalMessage || !reviewerOutcome.finalMessage.trim()) {
        executionPacket.final_status = "HOLD";
        executionPacket.error = "REVIEWER_EMPTY_REPORT: Reviewer produced empty report";
        return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
      }

      if (reviewerOutcome.readOnlyViolation === true) {
        executionPacket.final_status = "REVIEWER_MUTATION_VIOLATION";
        executionPacket.error = "SECURITY ALERT: Reviewer process modified the working tree despite read-only mode";
        return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
      }

      if (reviewerOutcome.readOnlyViolation !== false) {
        executionPacket.final_status = "HOLD";
        executionPacket.error = "REVIEW_INTEGRITY_FAILURE: Reviewer read-only integrity could not be conclusively proven (fingerprint error)";
        return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
      }

      const findings = parseReviewFindings(reviewerOutcome.finalMessage);
      if (!findings.ok) {
        executionPacket.final_status = "HOLD";
        executionPacket.error = `REVIEW_PARSE_FAILURE: ${findings.error}`;
        return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
      }

      executionPacket.review_cycles.push({
        cycle: reviewCycles,
        reviewer_provider: reviewerProvider,
        status: reviewerOutcome.status,
        findings_summary: {
          blocking: findings.blocking.length,
          material: findings.material.length,
          minor: findings.minor.length,
        },
        report: reviewerOutcome.finalMessage,
      });

      const actionableFindings = [...findings.blocking, ...findings.material];
      if (actionableFindings.length === 0) {
        // Review is clean!
        executionPacket.advisories = findings.minor;
        break;
      }

      // State 7: Repair Loop by Same Logical Writer
      if (!contract.mutating_writer) {
        executionPacket.unresolved_findings = actionableFindings;
        executionPacket.advisories = findings.minor;
        executionPacket.final_status = "READY_FOR_CONTROLLER_VERDICT";
        break;
      }

      if (reviewCycles < contract.maximum_review_cycles) {
        const repairBrief = [
          `INDEPENDENT REVIEW FINDINGS REPAIR (Cycle ${reviewCycles}):`,
          `Findings to repair:`,
          actionableFindings.join("\n"),
          `Please repair in-scope findings and report changes. Do not touch unaffected files.`,
        ].join("\n\n");

        await runSupervisedTurnAsync({
          adapter: ADAPTERS[currentProvider],
          opts: {
            provider: currentProvider,
            cd: repo,
            readOnly: false,
            timeout: contract.timeout,
            resumeLast: Boolean(conversationId),
            conversation: conversationId,
            dangerouslySkipPermissions: contract.dangerously_skip_permissions,
          },
          brief: repairBrief,
          outPrefix: `ctrl-repair-cycle-${reviewCycles}`,
          onChildSpawn: (pid) => {
            activeChildPid = pid;
          },
        });

        // Revalidate after repair
        validation = executeValidationManifest(contract.validation_manifest, { cwd: repo });
        executionPacket.validation_evidence = validation;
      } else {
        executionPacket.unresolved_findings = actionableFindings;
        executionPacket.final_status = "MAX_REVIEW_CYCLES_REACHED";
        executionPacket.error = `Task has ${actionableFindings.length} unresolved review findings after ${contract.maximum_review_cycles} cycles`;
        return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
      }
    }

    if (executionPacket.final_status === "INITIALIZING") {
      executionPacket.final_status = "READY_FOR_CONTROLLER_VERDICT";
    }

    return finalizePacket(executionPacket, repo, contract.logical_writer_id, contract.task_id);
  } finally {
    if (lockAcquired) {
      releaseWriterLock(repo, contract.logical_writer_id, contract.task_id);
    }
  }
}

/**
 * Synchronous wrapper for CLI and compatibility callers.
 */
export function runControlledTask(rawContract, options = {}) {
  let result;
  let promiseError;
  runControlledTaskAsync(rawContract, options)
    .then((res) => {
      result = res;
    })
    .catch((err) => {
      promiseError = err;
    });

  // Since runControlledTaskAsync uses node child_process event loops,
  // we can use a small deasync or wait pattern if called synchronously, or
  // execute via top-level await in ESM!
}

function finalizePacket(packet, repo, writerId, taskId) {
  packet.finished_at = new Date().toISOString();
  if (writerId) {
    releaseWriterLock(repo, writerId, taskId);
  }
  const outDir = getRuntimePacketDir();
  const safeTask = String(packet.task_id || "task").replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeRun = String(packet.run_id || "run").replace(/[^a-zA-Z0-9_-]/g, "_");
  const packetPath = join(outDir, `execution-packet-${safeTask}-${safeRun}.json`);

  packet.execution_packet_path = packetPath;
  writeFileSync(packetPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");
  return packet;
}

async function main() {
  const args = process.argv.slice(2);
  let contractPath = null;
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === "--contract" && args[i + 1]) {
      contractPath = resolve(args[i + 1]);
      break;
    }
  }

  if (!contractPath || !existsSync(contractPath)) {
    process.stderr.write("Usage: controlled-task.mjs --contract <path/to/task-contract.json>\n");
    process.exit(2);
  }

  const contract = JSON.parse(readFileSync(contractPath, "utf8"));
  const packet = await runControlledTaskAsync(contract);
  process.stdout.write(`${JSON.stringify(packet, null, 2)}\n`);
  process.exit(packet.final_status === "READY_FOR_CONTROLLER_VERDICT" ? 0 : 1);
}

if (process.argv[1] && process.argv[1].endsWith("controlled-task.mjs")) {
  main();
}
