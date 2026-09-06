#!/usr/bin/env node
/**
 * delegate-skills · codex-adapter.mjs
 *
 * Codex provider adapter for the shared host execution core.
 * Parses JSON event streams, extracts session identity, and supports Windows execution safety.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { constants } from "node:os";

function resolveCodexCommand() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || "";
    const npmCodex = join(appData, "npm", "codex.cmd");
    if (existsSync(npmCodex)) return npmCodex;
  }
  return "codex";
}

export const codexAdapter = {
  name: "codex",

  versionProbe(timeoutMs = 10_000) {
    try {
      const isWin = process.platform === "win32";
      const res = spawnSync("codex", ["--version"], {
        encoding: "utf8",
        timeout: timeoutMs,
        shell: isWin,
      });
      if (res.status === 0 && res.stdout) {
        const line = res.stdout.trim().split("\n")[0] || "";
        const match = line.match(/^codex(?:-cli)?\s+([^\s]+)/i);
        return match ? match[1] : line;
      }
      return "unknown";
    } catch (err) {
      if (err && err.code === "ENOENT") return null;
      return "unknown";
    }
  },

  buildCommand(opts, brief, run) {
    const argv = ["exec"];

    const isResume = Boolean(opts.resumeLast || opts.conversation || opts.sessionId);
    if (opts.resumeLast) {
      argv.push("resume", "--last");
    } else if (opts.conversation || opts.sessionId) {
      argv.push("resume", opts.conversation || opts.sessionId);
    }

    if (opts.cd) {
      argv.push("-C", opts.cd);
    }

    if (!isResume && opts.addDirs) {
      for (const dir of opts.addDirs) {
        argv.push("--add-dir", dir);
      }
    }

    if (opts.model) {
      argv.push("-m", opts.model);
    }

    if (opts.effort) {
      argv.push("-c", `model_reasoning_effort="${opts.effort}"`);
    }

    if (opts.readOnly) {
      argv.push("-s", "read-only");
    } else if (opts.dangerouslySkipPermissions) {
      argv.push("-s", "danger-full-access");
      argv.push("--dangerously-bypass-approvals-and-sandbox");
    } else {
      argv.push("-s", "workspace-write");
    }

    argv.push("-o", run.finalPath);
    argv.push("--json");

    // Pass "-" so codex exec reads instructions from stdin
    argv.push("-");

    const isWin = process.platform === "win32";
    return {
      command: "codex",
      argv,
      env: {},
      shell: isWin,
      stdin: brief,
    };
  },

  parseIds(logPath) {
    if (!existsSync(logPath)) return { projectId: null, conversationId: null, sessionId: null };
    try {
      const text = readFileSync(logPath, "utf8");
      // Search line by line for structured JSON events
      for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("{")) continue;
        try {
          const evt = JSON.parse(trimmed);
          const sid =
            evt.session_id ||
            evt.sessionId ||
            evt.thread_id ||
            (evt.type === "session" ? evt.id : null) ||
            evt?.data?.session_id ||
            evt?.data?.thread_id;
          if (sid) {
            return { projectId: null, conversationId: String(sid), sessionId: String(sid) };
          }
        } catch {
          // not valid JSON line
        }
      }

      // Regex fallback
      const sessionMatch = text.match(/(?:session_id|sessionId|thread_id)["':\s]+([0-9a-f-]{36}|[0-9a-zA-Z_-]{16,64})/i);
      const sid = sessionMatch ? sessionMatch[1] : null;
      return {
        projectId: null,
        conversationId: sid,
        sessionId: sid,
      };
    } catch {
      return { projectId: null, conversationId: null, sessionId: null };
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

    const worktreeChanged =
      beforeState !== null && afterState !== null && beforeState !== afterState;
    const silentNoop = code === 0 && !finalMessage && !worktreeChanged;
    const readOnlyPassed = opts.readOnly ? readOnlyViolation === false : true;
    const succeeded =
      code === 0 && !watchdogFired && !silentNoop && readOnlyPassed;

    const mapped =
      code ?? (constants.signals[signal] ? 128 + constants.signals[signal] : 1);

    let error = null;
    if (opts.readOnly && readOnlyViolation === true) {
      error =
        "REVIEWER_MUTATION_VIOLATION: Codex modified the working tree despite read-only mode";
    } else if (opts.readOnly && readOnlyViolation !== false) {
      error =
        "REVIEWER_INTEGRITY_VIOLATION: Read-only worktree integrity could not be proven";
    } else if (watchdogFired) {
      error =
        opts.timeout !== null
          ? `codex did not finish within --timeout ${opts.timeout}; killed by the relay watchdog`
          : `codex did not exit within timeout window; killed by the relay watchdog`;
    } else if (silentNoop) {
      error =
        "codex exited 0 without a final message or observable working-tree changes; the runner cannot confirm completion";
    }

    return {
      status: succeeded ? "completed" : watchdogFired ? "timeout" : "failed",
      exitCode: succeeded ? 0 : mapped === 0 ? 1 : mapped,
      stderrTail: !succeeded || !finalMessage ? diagnostics : null,
      error,
    };
  },
};
