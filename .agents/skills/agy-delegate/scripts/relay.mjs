#!/usr/bin/env node
/**
 * delegate-skills · agy-delegate · relay.mjs
 *
 * Dispatch a self-contained brief to the Google Antigravity CLI (`agy --print`),
 * capture the run, and write a structured result the orchestrating agent can
 * review. The orchestrator runs this one command and reads the result JSON -
 * every Antigravity-specific mechanic lives in here, which keeps the skill
 * orchestrator-agnostic.
 *
 * Trust posture: relay.mjs itself makes no network calls, reads or writes no
 * credentials, and sends no telemetry; it has no dependencies (Node built-ins
 * only). It shells out only to `agy` and `git`. The `agy` process it launches
 * does authenticate - exactly as you do at the terminal. Read this file before
 * you run it.
 *
 * Note: `agy --print` takes the prompt as a command-line argument, so the brief is
 * visible in the host process list (`ps`, /proc). On a shared machine keep secrets
 * out of the brief - reference them by a path or env var the workspace can read.
 *
 * It deliberately does NOT commit. Committing is always the orchestrator's job -
 * after it reviews the diff and re-runs the project gates.
 *
 * Antigravity owns its own permission policy. This helper does not pass
 * --dangerously-skip-permissions by default; opt into that flag only when the
 * human explicitly accepts it. Pass --sandbox to enable Antigravity's terminal
 * sandbox for the run. Combining both flags must be treated as full access because
 * permission requests to act outside the sandbox may be auto-approved.
 *
 * Usage:
 *   node relay.mjs --brief <file> [options]
 *   cat brief.txt | node relay.mjs [options]
 *
 * Options:
 *   --brief <file>          Path to the brief. If omitted, the brief is read from stdin.
 *   --cd <dir>              Working root for Antigravity (default: current directory).
 *   --lane <name>           Fleet lane from delegate-setup config (dials apply; explicit flags win).
 *   --model <name>          Antigravity model label (default: agy's configured default).
 *   --effort <level>        Reasoning effort: low, medium, or high (passed as agy's own --effort).
 *   --project <id>          Use an existing Antigravity project.
 *   --new-project           Force a fresh Antigravity project (default for fresh runs).
 *   --resume-last           Continue the most recent Antigravity conversation; send only the delta brief.
 *   --conversation <id>     Continue a specific Antigravity conversation; send only the delta brief.
 *   --sandbox               Enable Antigravity's terminal sandbox for this run.
 *   --read-only             Run in plan mode (`--mode plan`), removing write and edit paths.
 *                           Mutually exclusive with --dangerously-skip-permissions.
 *   --dangerously-skip-permissions
 *                           Auto-approve Antigravity tool permission requests. Use only with human approval.
 *                           Mutually exclusive with --read-only.
 *   --print-timeout <dur>   Timeout agy itself applies to print mode (default: 30m).
 *   --timeout <dur>         Relay-side watchdog, h/m/s like 30m (default: --print-timeout
 *                           plus a 60s grace). On expiry the agy process tree is killed and
 *                           result.json gets status "timeout". Set it explicitly when agy
 *                           may hang past its own print timeout.
 *   --add-dir <dir>         Add an extra workspace directory. Repeatable.
 *   --out-dir <dir>         Where to write run artifacts (default: a fresh dir under
 *                           the system temp dir, so the repo under review stays clean).
 *   -h, --help              Show this help.
 *
 * Result: written to <out-dir>/result.json and summarized on stdout -
 *   status, exitCode, agyVersion, projectId, conversationId, finalMessage
 *   (Antigravity's own report), touchedFiles (git porcelain, null if git can't report),
 *   readOnlyViolation (on --read-only), and the paths to brief.txt, final.txt, agy.log, and stderr.txt.
 *
 * Exit codes: a pre-run usage error (bad/missing args, empty brief) exits 2
 * before any run and writes no result file; a missing `agy` binary exits 127;
 * otherwise the exit code mirrors Antigravity's own, except that an exit-zero
 * permission denial or silent write-dispatch no-op is forced to exit 1.
 * If the child dies on a signal, the exit code is 128 plus the signal number and
 * `result.json` records the signal.
 * Once the brief validates, `result.json` is written on every outcome -
 * completed, failed, timeout (the relay watchdog fired after explicit --timeout,
 * or after --print-timeout plus 60s grace), aborted (the relay itself was killed
 * and forwarded the kill to agy), or agy_unavailable. An orchestrator that polls for the
 * file must therefore also treat a non-zero exit with no file as a usage error.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, existsSync, writeFileSync } from "node:fs";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
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
} from "./core-runner.mjs";
import { antigravityAdapter } from "./antigravity-adapter.mjs";

const IMPLEMENTER_KEY = "agy";

function fail(message, code = 2) {
  process.stderr.write(`relay: ${message}\n`);
  process.exit(code);
}

function applyFleetLane(opts, flagged) {
  if (!opts.lane) return;
  const script = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../delegate-setup/scripts/lane.mjs"
  );
  if (!existsSync(script)) {
    fail("--lane requires the delegate-setup skill installed beside this relay");
  }
  const r = spawnSync(
    process.execPath,
    [
      script,
      "resolve",
      "--cwd",
      opts.cd,
      "--lane",
      opts.lane,
      "--implementer",
      IMPLEMENTER_KEY,
    ],
    { encoding: "utf8", env: process.env }
  );
  if (r.error) fail(`lane resolve failed: ${r.error.message}`);
  if (r.status !== 0) {
    fail((r.stderr || "lane resolve failed").trim().replace(/^lane\.mjs:\s*/, ""));
  }
  let resolved;
  try {
    const lines = (r.stdout || "").trim().split("\n").filter(Boolean);
    resolved = JSON.parse(lines[lines.length - 1]);
  } catch {
    fail("lane resolve returned invalid JSON");
  }
  opts.laneSource = resolved.source;
  for (const [field, value] of Object.entries(resolved.dials || {})) {
    if (flagged.has(field)) continue;
    if (
      field === "autonomy" &&
      (flagged.has("autonomy") || flagged.has("sandbox") || flagged.has("readOnly"))
    )
      continue;
    if (
      field === "agent" &&
      (flagged.has("agent") || flagged.has("readOnly"))
    )
      continue;
    if (
      field === "sandbox" &&
      (flagged.has("sandbox") || flagged.has("readOnly"))
    )
      continue;
    if (
      field === "permissionMode" &&
      (flagged.has("permissionMode") || flagged.has("readOnly"))
    )
      continue;
    if (
      field === "planOnly" &&
      (flagged.has("planOnly") || flagged.has("readOnly"))
    )
      continue;
    if (
      field === "readOnly" &&
      (flagged.has("readOnly") || flagged.has("dangerouslySkipPermissions"))
    )
      continue;
    if (field === "force" && flagged.has("force")) continue;
    opts[field] = value;
  }
}

function parseArgs(argv) {
  const flagged = new Set();
  const opts = {
    provider: "agy",
    lane: null,
    laneSource: null,
    brief: null,
    cd: process.cwd(),
    model: null,
    effort: null,
    project: null,
    newProject: false,
    resumeLast: false,
    conversation: null,
    sandbox: false,
    readOnly: false,
    dangerouslySkipPermissions: false,
    printTimeout: DEFAULT_PRINT_TIMEOUT,
    timeout: null,
    addDirs: [],
    outDir: null,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const next = () => {
      const value = argv[i + 1];
      if (value === undefined) fail(`${arg} requires a value`);
      i += 1;
      return value;
    };
    switch (arg) {
      case "-h":
      case "--help":
        process.stdout.write(headerComment());
        process.exit(0);
        break;
      case "--brief":
        opts.brief = next();
        break;
      case "--cd":
        opts.cd = resolve(next());
        break;
      case "--lane":
        opts.lane = next();
        break;
      case "--model":
        opts.model = next();
        flagged.add("model");
        break;
      case "--effort":
        opts.effort = next();
        flagged.add("effort");
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
        opts.conversation = next();
        break;
      case "--sandbox":
        opts.sandbox = true;
        flagged.add("sandbox");
        break;
      case "--read-only":
        opts.readOnly = true;
        flagged.add("readOnly");
        break;
      case "--dangerously-skip-permissions":
        opts.dangerouslySkipPermissions = true;
        flagged.add("dangerouslySkipPermissions");
        break;
      case "--print-timeout":
        opts.printTimeout = next();
        break;
      case "--timeout":
        opts.timeout = next();
        flagged.add("timeout");
        break;
      case "--add-dir":
        opts.addDirs.push(next());
        break;
      case "--out-dir":
        opts.outDir = resolve(next());
        break;
      default:
        fail(`unknown option: ${arg}`);
    }
  }

  applyFleetLane(opts, flagged);
  if (opts.effort !== null && !["low", "medium", "high"].includes(opts.effort)) {
    fail(`invalid --effort "${opts.effort}" (expected: low, medium, high)`);
  }
  if (opts.readOnly && opts.dangerouslySkipPermissions) {
    fail(
      "--read-only and --dangerously-skip-permissions are mutually exclusive; pass only one"
    );
  }
  if (opts.resumeLast && opts.conversation) {
    fail("--resume-last and --conversation are mutually exclusive; pass only one");
  }

  if (opts.timeout !== null) {
    const milliseconds = parseDuration(opts.timeout);
    if (
      milliseconds === null ||
      milliseconds <= 0 ||
      milliseconds > MAX_TIMER_MS
    ) {
      fail(
        `--timeout "${opts.timeout}" must be an h/m/s duration from 1s through ${MAX_TIMER_DURATION}`
      );
    }
  }
  const printTimeoutMs = parseDuration(opts.printTimeout);
  if (
    printTimeoutMs === null ||
    printTimeoutMs <= 0 ||
    printTimeoutMs + 60_000 > MAX_TIMER_MS
  ) {
    fail(
      `--print-timeout "${opts.printTimeout}" must be an h/m/s duration from 1s through 596h30m23s so its 60s grace fits the relay watchdog limit`
    );
  }
  if (opts.project && (opts.resumeLast || opts.conversation)) {
    fail("--project cannot be combined with --resume-last or --conversation");
  }
  if (opts.project && opts.newProject) {
    fail("--project and --new-project are mutually exclusive");
  }
  if (opts.newProject && (opts.resumeLast || opts.conversation)) {
    fail("--new-project cannot be combined with --resume-last or --conversation");
  }

  opts.addDirs = opts.addDirs.map((dir) => resolve(opts.cd, dir));
  return opts;
}

function headerComment() {
  const src = readFileSync(new URL(import.meta.url), "utf8");
  const match = src.match(/\/\*\*([\s\S]*?)\*\//);
  if (!match) return "relay.mjs - dispatch a brief to agy --print\n";
  return `${match[1].replace(/^\s*\* ?/gm, "").trim()}\n`;
}

function readBrief(opts) {
  if (opts.brief) {
    if (!existsSync(opts.brief)) fail(`brief file not found: ${opts.brief}`);
    return readFileSync(opts.brief, "utf8");
  }
  if (process.stdin.isTTY) {
    fail(
      "no --brief given and stdin is a TTY; pass --brief <file> or pipe the brief on stdin"
    );
  }
  let stdin = "";
  try {
    stdin = readFileSync(0, "utf8");
  } catch {
    stdin = "";
  }
  return stdin;
}

function reportUnavailable(writeResult, resultPath) {
  const result = writeResult({
    status: "agy_unavailable",
    exitCode: 127,
    signal: null,
    finalMessage: "",
    touchedFiles: null,
  });
  printSummary(result, resultPath);
  process.stderr.write(
    "relay: `agy` not found on PATH. Install the Antigravity CLI and complete first-launch setup.\n"
  );
  process.exit(127);
}

function reportVersionTimeout(writeResult, run, timeoutMs, error) {
  const stderr = String(error?.stderr || "").trim();
  if (stderr) writeFileSync(run.stderrPath, `${stderr}\n`, "utf8");
  const message = `agy changelog version preflight timed out after ${Math.min(
    timeoutMs,
    VERSION_PROBE_TIMEOUT_MS
  )}ms; agy was not dispatched`;
  const result = writeResult({
    status: "timeout",
    exitCode: 124,
    signal: null,
    finalMessage: "",
    touchedFiles: null,
    ...(stderr ? { stderrTail: stderr.split("\n").slice(-20) } : {}),
    error: message,
  });
  printSummary(result, run.resultPath);
  process.stderr.write(`relay: ${message}\n`);
  process.exit(result.exitCode);
}

function main() {
  const opts = parseArgs(process.argv.slice(2));
  const brief = readBrief(opts);
  if (!brief.trim())
    fail("empty brief (pass --brief <file> or pipe the brief on stdin)");

  const briefBytes = Buffer.byteLength(brief, "utf8");
  const MAX_BRIEF_BYTES = 120 * 1024;
  if (briefBytes > MAX_BRIEF_BYTES) {
    fail(
      `brief is ${Math.round(
        briefBytes / 1024
      )}KB; agy passes the prompt as a CLI argument, which the OS caps (~128KB on Linux). Trim it, or have agy read large context from the workspace instead of inlining it.`
    );
  }

  const printTimeoutMs = parseDuration(opts.printTimeout);
  const watchdogMs =
    opts.timeout !== null ? parseDuration(opts.timeout) : printTimeoutMs + 60_000;
  const run = prepareRunDir(opts, brief, "delegate-relay");
  let version;
  try {
    version = antigravityAdapter.versionProbe(watchdogMs);
  } catch (error) {
    const writeResult = makeResultWriter(opts, "unknown", run, antigravityAdapter.parseIds);
    reportVersionTimeout(writeResult, run, watchdogMs, error);
    return;
  }
  const writeResult = makeResultWriter(opts, version, run, antigravityAdapter.parseIds);

  if (!version) {
    reportUnavailable(writeResult, run.resultPath);
    return;
  }

  dispatchProcess({
    adapter: antigravityAdapter,
    opts,
    brief,
    run,
    writeResult,
    watchdogMs,
    onExitCallback: printSummary,
  });
}

main();
