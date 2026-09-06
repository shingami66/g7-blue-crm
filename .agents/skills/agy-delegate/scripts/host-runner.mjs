#!/usr/bin/env node
/**
 * delegate-skills · host-runner.mjs
 *
 * Provider-neutral host runner CLI for Codex and Antigravity.
 * Manages provider selection, Writer locks for mutating runs,
 * and worktree fingerprinting for read-only runs.
 */

import { resolve } from "node:path";
import { readFileSync, existsSync } from "node:fs";
import {
  DEFAULT_PRINT_TIMEOUT,
  MAX_TIMER_MS,
  MAX_TIMER_DURATION,
  VERSION_PROBE_TIMEOUT_MS,
  parseDuration,
  prepareRunDir,
  makeResultWriter,
  dispatchProcess,
  printSummary,
  fail,
} from "./core-runner.mjs";
import { antigravityAdapter } from "./antigravity-adapter.mjs";
import { codexAdapter } from "./codex-adapter.mjs";
import { acquireWriterLock, releaseWriterLock } from "./writer-lock.mjs";

const ADAPTERS = {
  agy: antigravityAdapter,
  antigravity: antigravityAdapter,
  codex: codexAdapter,
};

function parseArgs(argv) {
  const opts = {
    provider: "agy",
    brief: null,
    cd: process.cwd(),
    model: null,
    effort: null,
    project: null,
    newProject: false,
    resumeLast: false,
    conversation: null,
    sessionId: null,
    sandbox: false,
    readOnly: false,
    dangerouslySkipPermissions: false,
    printTimeout: DEFAULT_PRINT_TIMEOUT,
    timeout: null,
    addDirs: [],
    outDir: null,
    taskId: null,
    writerId: null,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const val = argv[i + 1];
      if (val === undefined) fail("host-runner", `${arg} requires a value`);
      i += 1;
      return val;
    };
    switch (arg) {
      case "--provider":
        opts.provider = next().toLowerCase();
        break;
      case "--brief":
        opts.brief = next();
        break;
      case "--cd":
        opts.cd = resolve(next());
        break;
      case "--model":
        opts.model = next();
        break;
      case "--effort":
        opts.effort = next();
        break;
      case "--project":
        opts.project = next();
        break;
      case "--new-project":
        opts.newProject = true;
        break;
      case "--resume-last":
        opts.resumeLast = true;
        break;
      case "--conversation":
      case "--session":
      case "--session-id":
        opts.conversation = next();
        opts.sessionId = opts.conversation;
        break;
      case "--sandbox":
        opts.sandbox = true;
        break;
      case "--read-only":
        opts.readOnly = true;
        break;
      case "--dangerously-skip-permissions":
        opts.dangerouslySkipPermissions = true;
        break;
      case "--print-timeout":
        opts.printTimeout = next();
        break;
      case "--timeout":
        opts.timeout = next();
        break;
      case "--add-dir":
        opts.addDirs.push(next());
        break;
      case "--out-dir":
        opts.outDir = resolve(next());
        break;
      case "--task-id":
        opts.taskId = next();
        break;
      case "--writer-id":
        opts.writerId = next();
        break;
      case "-h":
      case "--help":
        process.stdout.write("host-runner.mjs --provider <agy|codex> --brief <file> [options]\n");
        process.exit(0);
        break;
      default:
        fail("host-runner", `unknown option: ${arg}`);
    }
  }

  const adapter = ADAPTERS[opts.provider];
  if (!adapter) {
    fail("host-runner", `unsupported provider: ${opts.provider} (allowed: agy, codex)`);
  }

  if (opts.readOnly && opts.dangerouslySkipPermissions) {
    fail("host-runner", "--read-only and --dangerously-skip-permissions are mutually exclusive");
  }

  if (opts.effort !== null && !["low", "medium", "high"].includes(opts.effort)) {
    fail("host-runner", `invalid --effort "${opts.effort}" (expected: low, medium, high)`);
  }

  opts.addDirs = opts.addDirs.map((dir) => resolve(opts.cd, dir));
  return { opts, adapter };
}

function readBrief(opts) {
  if (opts.brief) {
    if (!existsSync(opts.brief)) fail("host-runner", `brief file not found: ${opts.brief}`);
    return readFileSync(opts.brief, "utf8");
  }
  if (process.stdin.isTTY) {
    fail("host-runner", "no --brief given and stdin is a TTY");
  }
  try {
    return readFileSync(0, "utf8");
  } catch {
    return "";
  }
}

export function executeHostRun({ opts, adapter, brief }) {
  const printTimeoutMs = parseDuration(opts.printTimeout);
  if (printTimeoutMs === null) {
    fail("host-runner", `invalid --print-timeout: "${opts.printTimeout}"`);
  }

  let watchdogMs = printTimeoutMs + 60_000;
  if (opts.timeout !== null) {
    const explicitTimeout = parseDuration(opts.timeout);
    if (explicitTimeout === null) {
      fail("host-runner", `invalid --timeout: "${opts.timeout}"`);
    }
    if (explicitTimeout < 1000) {
      fail("host-runner", `timeout too short (minimum 1s): "${opts.timeout}"`);
    }
    watchdogMs = explicitTimeout;
  }

  const run = prepareRunDir(opts, brief, `host-runner-${opts.provider}`);

  // Mutex handling: ALL mutating Writer runs require writer identity and mutex lock
  let lockAcquired = false;
  if (!opts.readOnly) {
    if (!opts.writerId || !opts.taskId) {
      fail("host-runner", "MUTATING_WRITER_IDENTITY_REQUIRED: Every mutating run must specify --writer-id and --task-id");
    }
    const lockRes = acquireWriterLock({
      workdir: opts.cd,
      taskId: opts.taskId,
      logicalWriterId: opts.writerId,
      provider: opts.provider,
      pid: process.pid,
    });
    if (!lockRes.ok) {
      fail("host-runner", `MUTEX_ACQUISITION_DENIED (${lockRes.error}): ${lockRes.message}`);
    }
    lockAcquired = true;
  }

  let version;
  try {
    version = adapter.versionProbe(watchdogMs);
  } catch (err) {
    if (lockAcquired) releaseWriterLock(opts.cd, opts.writerId, opts.taskId);
    fail("host-runner", `Version probe timed out or failed: ${err.message}`, 124);
  }

  const writeResult = makeResultWriter(opts, version, run, adapter.parseIds);

  const cleanupAndExit = (result, resultPath) => {
    if (lockAcquired) {
      releaseWriterLock(opts.cd, opts.writerId, opts.taskId);
    }
    printSummary(result, resultPath);
  };

  dispatchProcess({
    adapter,
    opts,
    brief,
    run,
    writeResult,
    watchdogMs,
    onExitCallback: cleanupAndExit,
  });
}

function main() {
  const { opts, adapter } = parseArgs(process.argv.slice(2));
  const brief = readBrief(opts);
  if (!brief.trim()) fail("host-runner", "empty brief");
  executeHostRun({ opts, adapter, brief });
}

if (process.argv[1] && process.argv[1].endsWith("host-runner.mjs")) {
  main();
}
