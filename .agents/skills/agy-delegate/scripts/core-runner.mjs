#!/usr/bin/env node
/**
 * delegate-skills · core-runner.mjs
 *
 * Provider-neutral host execution core.
 * Extracted from proven WF-AUTO1 / agy-delegate relay architecture.
 * Provides process supervision, timeout watchdog, worktree fingerprinting,
 * read-only mutation detection, worktree scope reconciliation, and atomic result authoring.
 */

import { spawn, execFileSync, spawnSync } from "node:child_process";
import { createHash, randomBytes } from "node:crypto";
import {
  mkdirSync,
  writeFileSync,
  renameSync,
  readFileSync,
  readlinkSync,
  lstatSync,
  existsSync,
  appendFileSync,
  realpathSync,
} from "node:fs";
import { join, resolve, basename, dirname, relative, isAbsolute } from "node:path";
import { constants, tmpdir } from "node:os";
import { StringDecoder } from "node:string_decoder";

export const DEFAULT_PRINT_TIMEOUT = "30m";
export const MAX_TIMER_MS = 2_147_483_647;
export const MAX_TIMER_DURATION = "596h31m23s";
export const VERSION_PROBE_TIMEOUT_MS = 10_000;

export function fail(prefix, message, code = 2) {
  process.stderr.write(`${prefix}: ${message}\n`);
  process.exit(code);
}

export function parseDuration(duration) {
  if (!duration) return null;
  const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(String(duration).trim());
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  try {
    const seconds =
      BigInt(match[1] || 0) * 3600n +
      BigInt(match[2] || 0) * 60n +
      BigInt(match[3] || 0);
    const milliseconds = seconds * 1000n;
    if (milliseconds <= 0n || milliseconds > BigInt(MAX_TIMER_MS)) return null;
    return Number(milliseconds);
  } catch {
    return null;
  }
}

export function killChild(child, signal = "SIGTERM") {
  if (!child || !child.pid) return;
  if (process.platform === "win32") {
    try {
      execFileSync("taskkill", ["/pid", String(child.pid), "/t", "/f"], {
        stdio: ["ignore", "ignore", "inherit"],
      });
    } catch {
      // Process tree already exited
    }
    return;
  }
  try {
    process.kill(-child.pid, signal);
  } catch {
    try {
      child.kill(signal);
    } catch {
      // Process group already exited
    }
  }
}

export function gitTouchedFiles(cwd) {
  try {
    const output = execFileSync("git", ["status", "--porcelain"], {
      cwd,
      encoding: "utf8",
      timeout: 10_000,
      killSignal: "SIGKILL",
      stdio: ["ignore", "pipe", "ignore"],
      maxBuffer: 64 * 1024 * 1024,
    });
    return output.split("\n").map((line) => line.trimEnd()).filter(Boolean);
  } catch {
    return null;
  }
}

export function gitWorktreeFingerprint(cwd, excludedPaths = []) {
  try {
    const git = (args) =>
      execFileSync("git", args, {
        cwd,
        timeout: 10_000,
        killSignal: "SIGKILL",
        stdio: ["ignore", "pipe", "ignore"],
        maxBuffer: 64 * 1024 * 1024,
      });
    const root = realpathSync.native(
      git(["rev-parse", "--show-toplevel"]).toString("utf8").replace(/\r?\n$/, "")
    );
    const exclusions = excludedPaths
      .map((path) => {
        const absolute = resolve(path);
        try {
          return relative(root, realpathSync.native(absolute));
        } catch {
          return relative(
            root,
            join(realpathSync.native(dirname(absolute)), basename(absolute))
          );
        }
      })
      .filter(
        (path) =>
          path &&
          path !== ".." &&
          !path.startsWith(`..${process.platform === "win32" ? "\\" : "/"}`) &&
          !isAbsolute(path)
      )
      .map((path) => `:(exclude,top,literal)${path.replaceAll("\\", "/")}`);
    const pathspec = [":(top)", ...exclusions];
    const status = git([
      "status",
      "--porcelain=v1",
      "-z",
      "--untracked-files=all",
      "--no-renames",
      "--",
      ...pathspec,
    ]);
    const fingerprint = createHash("sha256").update("status\0").update(status);

    let currentHead = "";
    try {
      currentHead = git(["rev-parse", "HEAD"]).toString("utf8").trim();
    } catch {
      // unborn
    }
    fingerprint.update("\0head\0").update(currentHead);

    fingerprint
      .update("\0index\0")
      .update(
        git([
          "diff",
          "--cached",
          "--raw",
          "--full-index",
          "--no-renames",
          "-z",
          "--",
          ...pathspec,
        ])
      );
    fingerprint
      .update("\0worktree\0")
      .update(
        git([
          "diff",
          "--raw",
          "--full-index",
          "--no-renames",
          "-z",
          "--",
          ...pathspec,
        ])
      );

    const paths = [
      ...new Set(
        status
          .toString("utf8")
          .split("\0")
          .filter(Boolean)
          .map((entry) => entry.slice(3))
      ),
    ].sort();
    for (const path of paths) {
      const fullPath = join(cwd, path);
      fingerprint.update("\0path\0").update(path).update("\0");
      let stat;
      try {
        stat = lstatSync(fullPath);
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
        fingerprint.update("missing");
        continue;
      }
      fingerprint.update(String(stat.mode)).update("\0");
      if (stat.isSymbolicLink()) {
        fingerprint.update(readlinkSync(fullPath));
      } else if (stat.isFile()) {
        fingerprint.update(git(["hash-object", "--no-filters", "--", path]));
      } else if (stat.isDirectory()) {
        const nestedState = gitWorktreeFingerprint(fullPath, excludedPaths);
        if (nestedState === null) return null;
        let headState;
        try {
          headState = git(["-C", fullPath, "rev-parse", "--verify", "HEAD"]);
        } catch {
          const symbolicHead = git(["-C", fullPath, "symbolic-ref", "--quiet", "HEAD"])
            .toString("utf8")
            .trim();
          const target = spawnSync(
            "git",
            ["-C", fullPath, "show-ref", "--verify", "--quiet", symbolicHead],
            { cwd, timeout: 10_000, killSignal: "SIGKILL", stdio: "ignore" }
          );
          if (target.status !== 1) return null;
          headState = Buffer.from(`unborn\0${symbolicHead}`);
        }
        fingerprint.update("submodule\0").update(headState).update(nestedState);
      } else return null;
    }
    return fingerprint.digest("hex");
  } catch {
    return null;
  }
}

/**
 * Fail-closed read-only verdict.
 * Any failure to obtain before/after fingerprint is an integrity failure.
 */
export function readOnlyVerdict(opts, beforeState, afterState) {
  if (!opts.readOnly) return false;
  if (beforeState === null || afterState === null) return true;
  return beforeState !== afterState;
}

/**
 * Host-side pre/post mutation scope reconciliation.
 */
export function reconcileWorktreeScope(beforeTouched = [], afterTouched = [], authorizedPrefixes = []) {
  const beforeSet = new Set(beforeTouched || []);
  const mutated = (afterTouched || []).filter((f) => !beforeSet.has(f));
  const unauthorized = [];

  for (const item of mutated) {
    const filePath = item.slice(3).trim().replaceAll("\\", "/");
    const isAuthorized = authorizedPrefixes.some((prefix) => {
      const normPrefix = prefix.replaceAll("\\", "/").replace(/^\.\//, "");
      return (
        filePath === normPrefix ||
        filePath.startsWith(normPrefix.endsWith("/") ? normPrefix : `${normPrefix}/`)
      );
    });
    if (!isAuthorized) {
      unauthorized.push(item);
    }
  }

  return {
    ok: unauthorized.length === 0,
    mutated,
    unauthorized,
  };
}

export function timestamp() {
  return new Date().toISOString().replace(/[:.]/g, "-");
}

export function prepareRunDir(opts, brief, prefix = "delegate-relay") {
  const startedAt = new Date().toISOString();
  const runId = `${Date.now()}-${randomBytes(4).toString("hex")}`;
  const outDir =
    opts.outDir ||
    join(tmpdir(), prefix, `${basename(opts.cd) || "repo"}-${runId}`);
  mkdirSync(outDir, { recursive: true });
  const run = {
    startedAt,
    runId,
    outDir,
    briefPath: join(outDir, "brief.txt"),
    finalPath: join(outDir, "final.txt"),
    logPath: join(outDir, `${opts.provider || "agy"}.log`),
    stderrPath: join(outDir, "stderr.txt"),
    resultPath: join(outDir, "result.json"),
  };
  writeFileSync(run.briefPath, brief, "utf8");
  writeFileSync(run.stderrPath, "", "utf8");
  return run;
}

export function makeResultWriter(opts, version, run, parseIdsFn) {
  return (extra) => {
    const ids = parseIdsFn ? parseIdsFn(run.logPath, extra) : { projectId: null, conversationId: null };
    const result = {
      schema: "delegate-relay.result.v1",
      lane: opts.lane || null,
      laneSource: opts.laneSource || null,
      tool: opts.provider || "agy",
      workdir: opts.cd,
      model: opts.model || null,
      effort: opts.effort || null,
      project: opts.project || null,
      readOnly: opts.readOnly,
      dangerouslySkipPermissions: opts.dangerouslySkipPermissions,
      resumed: Boolean(opts.conversation || opts.resumeLast || opts.sessionId),
      opts: {
        agent: opts.agent || null,
        mode: opts.mode,
        readOnly: opts.readOnly,
        dangerouslySkipPermissions: opts.dangerouslySkipPermissions,
        timeout: opts.timeout,
        sandbox: opts.sandbox,
      },
      ...extra,
      ...(opts.provider === "agy" ? { agyVersion: version } : { providerVersion: version }),
      ...(ids.projectId ? { projectId: ids.projectId } : {}),
      ...(ids.conversationId ? { conversationId: ids.conversationId } : {}),
      briefPath: run.briefPath,
      finalPath: run.finalPath,
      logPath: run.logPath,
      stderrPath: run.stderrPath,
      resultPath: run.resultPath,
      run: {
        startedAt: run.startedAt,
        outDir: run.outDir,
        briefPath: run.briefPath,
        finalPath: run.finalPath,
        logPath: run.logPath,
        stderrPath: run.stderrPath,
        resultPath: run.resultPath,
      },
    };

    const tempResult = `${run.resultPath}.${process.pid}.tmp`;
    writeFileSync(tempResult, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    try {
      renameSync(tempResult, run.resultPath);
    } catch {
      writeFileSync(run.resultPath, `${JSON.stringify(result, null, 2)}\n`, "utf8");
    }
    return result;
  };
}

/**
 * Supervised execution turn with watchdog and tree termination.
 * Returns a Promise that resolves with the execution result.
 */
export function executeSupervisedTurn({
  adapter,
  opts,
  brief,
  run,
  writeResult,
  watchdogMs,
  onExitCallback = null,
  exitOnClose = false,
  onChildSpawn = null,
}) {
  return new Promise((resolvePromise) => {
    const relayArtifacts = [
      run.briefPath,
      run.finalPath,
      run.logPath,
      run.stderrPath,
      run.resultPath,
    ];
    const beforeState = gitWorktreeFingerprint(opts.cd, relayArtifacts);
    const beforeTouched = gitTouchedFiles(opts.cd);
    const invocation = adapter.buildCommand(opts, brief, run);

    const child = spawn(invocation.command, invocation.argv, {
      cwd: opts.cd,
      env: { ...process.env, ...invocation.env, PWD: opts.cd },
      stdio: [invocation.stdin ? "pipe" : "ignore", "pipe", "pipe"],
      detached: process.platform !== "win32",
      shell: Boolean(invocation.shell),
    });

    if (onChildSpawn && child.pid) {
      onChildSpawn(child.pid);
    }

    if (invocation.stdin && child.stdin) {
      child.stdin.end(invocation.stdin, "utf8");
    }

    let stdout = "";
    const stderrTail = [];
    let settled = false;
    let watchdogFired = false;
    let sigkillTimer = null;

    const watchdogTimer = setTimeout(() => {
      watchdogFired = true;
      child.once("exit", () => {
        child.stdout?.destroy();
        child.stderr?.destroy();
      });
      killChild(child);
      sigkillTimer = setTimeout(() => {
        if (!settled) killChild(child, "SIGKILL");
      }, 10_000);
    }, watchdogMs);

    for (const sig of ["SIGTERM", "SIGINT", "SIGHUP"]) {
      process.on(sig, () => {
        if (settled) return;
        settled = true;
        clearTimeout(watchdogTimer);
        if (sigkillTimer) clearTimeout(sigkillTimer);
        const finalMessage = stdout.trim();
        if (finalMessage) writeFileSync(run.finalPath, finalMessage, "utf8");
        const abortedFields = {
          status: "aborted",
          exitCode: 128 + (constants.signals[sig] || 15),
          signal: sig,
          finalMessage,
          stderrTail: stderrTail.slice(-20),
          error: `the runner was killed by ${sig}; ${adapter.name} child was terminated with it`,
        };
        let finalized = false;
        const finalizeAbort = () => {
          if (finalized) return;
          finalized = true;
          if (sigkillTimer) clearTimeout(sigkillTimer);
          const afterState = gitWorktreeFingerprint(opts.cd, relayArtifacts);
          const result = writeResult({
            ...abortedFields,
            touchedFiles: gitTouchedFiles(opts.cd),
            readOnlyViolation: readOnlyVerdict(opts, beforeState, afterState),
          });
          if (onExitCallback) onExitCallback(result, run.resultPath);
          if (exitOnClose) process.exit(result.exitCode);
          resolvePromise(result);
        };
        child.once("close", finalizeAbort);
        killChild(child);
        sigkillTimer = setTimeout(() => {
          killChild(child, "SIGKILL");
        }, 2000);
      });
    }

    const stdoutDecoder = new StringDecoder("utf8");
    const stderrDecoder = new StringDecoder("utf8");

    child.stdout.on("data", (chunk) => {
      stdout += stdoutDecoder.write(chunk);
      appendFileSync(run.logPath, chunk);
    });

    child.stderr.on("data", (chunk) => {
      process.stderr.write(chunk);
      appendFileSync(run.stderrPath, chunk);
      const text = stderrDecoder.write(chunk);
      for (const line of text.split("\n")) {
        if (line.trim()) stderrTail.push(line.trimEnd());
      }
      while (stderrTail.length > 20) stderrTail.shift();
    });

    child.on("error", (err) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdogTimer);
      if (sigkillTimer) clearTimeout(sigkillTimer);
      const finalMessage = stdout.trim();
      if (finalMessage) writeFileSync(run.finalPath, finalMessage, "utf8");
      const afterState = gitWorktreeFingerprint(opts.cd, relayArtifacts);
      const readOnlyViolation = readOnlyVerdict(opts, beforeState, afterState);
      const result = writeResult({
        status: "failed",
        exitCode: 1,
        signal: null,
        finalMessage,
        touchedFiles: gitTouchedFiles(opts.cd),
        readOnlyViolation,
        error: String(err && err.message ? err.message : err),
      });
      if (onExitCallback) onExitCallback(result, run.resultPath);
      if (exitOnClose) process.exit(1);
      resolvePromise(result);
    });

    child.on("close", (code, signal) => {
      if (settled) return;
      settled = true;
      clearTimeout(watchdogTimer);
      if (sigkillTimer) clearTimeout(sigkillTimer);
      if (watchdogFired) killChild(child, "SIGKILL");

      let finalMessage = stdout.trim();
      if (existsSync(run.finalPath)) {
        try {
          const fileContent = readFileSync(run.finalPath, "utf8").trim();
          if (fileContent) finalMessage = fileContent;
        } catch {
          // preserve stdout
        }
      } else if (finalMessage) {
        writeFileSync(run.finalPath, finalMessage, "utf8");
      }

      const afterState = gitWorktreeFingerprint(opts.cd, relayArtifacts);
      const readOnlyViolation = readOnlyVerdict(opts, beforeState, afterState);
      const touchedFiles = gitTouchedFiles(opts.cd);
      const stderr = existsSync(run.stderrPath) ? readFileSync(run.stderrPath, "utf8") : "";

      const parsedOutcome = adapter.parseExit({
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
      });

      const result = writeResult({
        status: parsedOutcome.status,
        exitCode: parsedOutcome.exitCode,
        signal: signal ?? null,
        finalMessage,
        touchedFiles,
        readOnlyViolation,
        ...(parsedOutcome.stderrTail ? { stderrTail: parsedOutcome.stderrTail } : {}),
        ...(parsedOutcome.error ? { error: parsedOutcome.error } : {}),
        ...(parsedOutcome.extra || {}),
        beforeTouched,
      });

      if (onExitCallback) onExitCallback(result, run.resultPath);
      if (exitOnClose) process.exit(result.exitCode);
      resolvePromise(result);
    });
  });
}

export function dispatchProcess(args) {
  return executeSupervisedTurn({ ...args, exitOnClose: true });
}

export function printSummary(result, resultPath) {
  const lines = [];
  lines.push("");
  lines.push(
    `relay: ${result.status} (exit ${result.exitCode}${
      result.signal ? `, killed by ${result.signal}` : ""
    })  ·  ${result.tool} ${result.agyVersion || result.providerVersion || "?"}`
  );
  if (result.signal === "SIGKILL" && result.status === "failed") {
    lines.push(
      "hint: the host killed the process (commonly the OOM killer or a supervisor timeout)"
    );
  }
  if (result.signal === "SIGTERM" && result.status === "failed") {
    lines.push("hint: something outside the relay terminated the child process");
  }
  if (result.resumed) lines.push("mode: resumed an existing conversation");
  if (result.projectId) lines.push(`project id: ${result.projectId}`);
  if (result.conversationId) {
    lines.push(
      `conversation id (resume with: --conversation ${result.conversationId}): ${result.conversationId}`
    );
  }
  const touched = result.touchedFiles;
  if (touched === null) {
    lines.push("touched files: git unavailable - inspect the working tree directly");
  } else {
    lines.push(`touched files: ${touched.length}`);
    for (const file of touched.slice(0, 40)) lines.push(`  ${file}`);
    if (touched.length > 40) lines.push(`  ... and ${touched.length - 40} more`);
  }
  if (result.stderrTail && result.stderrTail.length) {
    lines.push("last stderr:");
    for (const line of result.stderrTail.slice(-8)) lines.push(`  ${line}`);
  }
  lines.push("");
  lines.push(`--- ${result.tool} final report ---`);
  lines.push(result.finalMessage || "(no final message captured)");
  lines.push("--- end report ---");
  lines.push("");
  lines.push(`result: ${resultPath}`);
  lines.push(
    "relay does not commit. Review the diff, re-run the project gates yourself, then commit from the orchestrator."
  );
  process.stdout.write(`${lines.join("\n")}\n`);
}
