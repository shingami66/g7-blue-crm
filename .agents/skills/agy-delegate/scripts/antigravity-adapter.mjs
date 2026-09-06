#!/usr/bin/env node
/**
 * delegate-skills · antigravity-adapter.mjs
 *
 * Antigravity provider adapter for the shared host execution core.
 */

import { execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { constants } from "node:os";

export const antigravityAdapter = {
  name: "agy",

  versionProbe(timeoutMs = 10_000) {
    try {
      const out = execFileSync("agy", ["changelog"], {
        encoding: "utf8",
        timeout: timeoutMs,
        killSignal: "SIGKILL",
      }).trim();
      const firstLine = out.split("\n").find(Boolean) || "";
      const match = firstLine.match(/^([^:\s]+):/);
      return match ? match[1] : firstLine || null;
    } catch (err) {
      if (err && err.code === "ENOENT") return null;
      if (err && err.code === "ETIMEDOUT") throw err;
      return "unknown";
    }
  },

  buildCommand(opts, brief, run) {
    const argv = [];
    if (opts.project) {
      argv.push("--project", opts.project);
    } else if (opts.conversation) {
      argv.push("--conversation", opts.conversation);
    } else if (opts.resumeLast) {
      argv.push("--continue");
    } else {
      argv.push("--new-project");
    }

    if (!opts.resumeLast && !opts.conversation) {
      argv.push("--add-dir", opts.cd);
      for (const dir of opts.addDirs || []) {
        argv.push("--add-dir", dir);
      }
    }

    if (opts.model) argv.push("--model", opts.model);
    if (opts.effort) argv.push("--effort", opts.effort);
    if (opts.readOnly) argv.push("--mode", "plan");
    if (opts.sandbox) argv.push("--sandbox");
    if (opts.dangerouslySkipPermissions) argv.push("--dangerously-skip-permissions");
    if (opts.printTimeout) argv.push("--print-timeout", opts.printTimeout);
    argv.push("--log-file", run.logPath);
    argv.push(`--print=${brief}`);

    return {
      command: "agy",
      argv,
      env: {},
      shell: false,
    };
  },

  parseIds(logPath) {
    if (!existsSync(logPath)) return { projectId: null, conversationId: null };
    try {
      const text = readFileSync(logPath, "utf8");
      const projectMatches = [
        /project: created project "[^"]*" \(id=([0-9a-f-]+)\)/i,
        /Conversation using project ID: ([0-9a-f-]+)/i,
        /Backend project ID updated dynamically to: ([0-9a-f-]+)/i,
      ];
      const conversationMatches = [
        /Print mode: conversation=([0-9a-f-]+)/i,
        /Created conversation ([0-9a-f-]+)/i,
      ];
      const firstMatch = (patterns) => {
        for (const pattern of patterns) {
          const match = text.match(pattern);
          if (match) return match[1];
        }
        return null;
      };
      return {
        projectId: firstMatch(projectMatches),
        conversationId: firstMatch(conversationMatches),
      };
    } catch {
      return { projectId: null, conversationId: null };
    }
  },

  parseExit({
    code,
    signal,
    stdout,
    stderr,
    stderrTail,
    finalMessage,
    watchdogFired,
    beforeState,
    afterState,
    readOnlyViolation,
    watchdogMs,
    opts,
    run,
  }) {
    const diagnostics = stderr
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean)
      .slice(-20);
    const permissionDenied =
      /no output produced\s+[—-]\s+a tool required the "([^"]+)" permission that headless\s+mode cannot prompt for, so it was auto-denied/i.exec(
        stderr
      );

    const worktreeChanged =
      beforeState !== null && afterState !== null && beforeState !== afterState;
    const silentNoop = code === 0 && !finalMessage && !worktreeChanged;
    const readOnlyPassed = opts.readOnly ? readOnlyViolation === false : true;
    const succeeded =
      code === 0 && !watchdogFired && !permissionDenied && !silentNoop && readOnlyPassed;

    const mapped =
      code ?? (constants.signals[signal] ? 128 + constants.signals[signal] : 1);

    let error = null;
    if (opts.readOnly && readOnlyViolation === true) {
      error =
        "REVIEWER_MUTATION_VIOLATION: Antigravity modified the working tree despite read-only mode";
    } else if (opts.readOnly && readOnlyViolation !== false) {
      error =
        "REVIEWER_INTEGRITY_VIOLATION: Read-only worktree integrity could not be proven";
    } else if (watchdogFired) {
      error =
        opts.timeout !== null
          ? `agy did not finish within --timeout ${opts.timeout}; killed by the relay watchdog`
          : `agy did not exit within --print-timeout ${opts.printTimeout} plus 60s grace; killed by the relay watchdog`;
    } else if (permissionDenied) {
      error = `Antigravity auto-denied the ${permissionDenied[1]} permission because headless --print cannot prompt; ask the human whether to re-dispatch with --dangerously-skip-permissions and treat that run as full access`;
    } else if (silentNoop) {
      error =
        "agy exited 0 without a final message or observable working-tree changes; the relay cannot confirm this dispatch completed";
    }

    return {
      status: succeeded ? "completed" : watchdogFired ? "timeout" : "failed",
      exitCode: succeeded ? 0 : mapped === 0 ? 1 : mapped,
      stderrTail: !succeeded || !finalMessage ? diagnostics : null,
      error,
    };
  },
};
