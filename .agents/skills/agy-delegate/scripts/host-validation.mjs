#!/usr/bin/env node
/**
 * delegate-skills · host-validation.mjs
 *
 * Manifest-driven host-owned validation runner.
 * Authoritative host results derived directly from host process exit codes,
 * never from Writer self-reports.
 * Enforces strict allowlisted command vocabulary without arbitrary shell execution.
 */

import { spawnSync } from "node:child_process";

const ALLOWED_EXECUTABLES = new Set(["node", "pnpm", "git", process.execPath]);
const DISALLOWED_SHELL_CHARS = /[;&|><$`\r\n]/;
const DISALLOWED_GIT_COMMANDS = new Set([
  "checkout",
  "reset",
  "clean",
  "commit",
  "push",
  "pull",
  "rebase",
  "merge",
  "stash",
  "rm",
  "branch",
  "tag",
  "config",
]);

function resolveExecutable(cmd) {
  if (process.platform === "win32") {
    if (cmd === "pnpm") return "pnpm.cmd";
    if (cmd === "npm") return "npm.cmd";
    if (cmd === "npx") return "npx.cmd";
  }
  return cmd;
}

export function runCommand(command, args = [], { cwd, timeout = 120_000 } = {}) {
  const started = Date.now();
  const execPath = resolveExecutable(command);

  const res = spawnSync(execPath, args, {
    cwd,
    encoding: "utf8",
    timeout,
    shell: false,
  });

  const duration_ms = Date.now() - started;
  const stdout = res.stdout ? res.stdout.trim() : "";
  const stderr = res.stderr ? res.stderr.trim() : "";

  return {
    status: res.status === 0 ? "pass" : "fail",
    exit_code: res.status ?? (res.error ? 1 : 0),
    duration_ms,
    stdout_tail: stdout.split("\n").slice(-20).join("\n"),
    stderr_tail: stderr.split("\n").slice(-20).join("\n"),
    error: res.error ? res.error.message : null,
  };
}

/**
 * Validate whether a custom command is safe and allowlisted.
 */
export function validateCustomCommand(cmd) {
  if (!cmd || typeof cmd !== "object") {
    return { ok: false, reason: "Command must be an object" };
  }
  const baseCmd = String(cmd.command || "").trim().toLowerCase();
  if (!ALLOWED_EXECUTABLES.has(baseCmd)) {
    return { ok: false, reason: `Executable '${baseCmd}' is not in allowlisted validation vocabulary` };
  }

  const args = Array.isArray(cmd.args) ? cmd.args : [];
  for (const arg of args) {
    const s = String(arg);
    if (DISALLOWED_SHELL_CHARS.test(s)) {
      return { ok: false, reason: `Argument contains prohibited shell characters: '${s}'` };
    }
  }

  if (baseCmd === "git") {
    const subCmd = (args[0] || "").toLowerCase();
    if (DISALLOWED_GIT_COMMANDS.has(subCmd)) {
      return { ok: false, reason: `Git sub-command '${subCmd}' is destructive and prohibited in validation` };
    }
  }

  return { ok: true, command: baseCmd, args };
}

/**
 * Execute host validation driven strictly by the task manifest.
 */
export function executeValidationManifest(manifest = {}, { cwd = process.cwd() } = {}) {
  const results = {};
  const executed = [];
  let allPassed = true;

  // 1. Focused Tests
  if (manifest.focused_tests) {
    executed.push("focused_tests");
    const filter = String(manifest.focused_tests);
    const env = { ...process.env, TEST_FILE_FILTER: filter };
    const started = Date.now();
    const res = spawnSync(process.execPath, ["test-all.mjs"], {
      cwd,
      encoding: "utf8",
      env,
      timeout: 120_000,
      shell: false,
    });
    const duration_ms = Date.now() - started;
    const pass = res.status === 0;
    if (!pass) allPassed = false;
    results.focused_tests = {
      status: pass ? "pass" : "fail",
      exit_code: res.status ?? 1,
      duration_ms,
      filter,
      stdout_tail: (res.stdout || "").trim().split("\n").slice(-15).join("\n"),
      stderr_tail: (res.stderr || "").trim().split("\n").slice(-15).join("\n"),
    };
  }

  // 2. Full Test Suite (only if explicitly requested)
  if (manifest.full_tests) {
    executed.push("full_tests");
    const started = Date.now();
    const res = spawnSync(process.execPath, ["test-all.mjs"], {
      cwd,
      encoding: "utf8",
      timeout: 180_000,
      shell: false,
    });
    const duration_ms = Date.now() - started;
    const pass = res.status === 0;
    if (!pass) allPassed = false;
    results.full_tests = {
      status: pass ? "pass" : "fail",
      exit_code: res.status ?? 1,
      duration_ms,
      stdout_tail: (res.stdout || "").trim().split("\n").slice(-15).join("\n"),
      stderr_tail: (res.stderr || "").trim().split("\n").slice(-15).join("\n"),
    };
  }

  // 3. TypeScript Typecheck
  if (manifest.typescript) {
    executed.push("typescript");
    const outcome = runCommand("pnpm", ["exec", "tsc", "--noEmit"], { cwd });
    if (outcome.status !== "pass") allPassed = false;
    results.typescript = outcome;
  }

  // 4. ESLint
  if (manifest.eslint) {
    executed.push("eslint");
    const args = ["lint"];
    if (Array.isArray(manifest.eslint)) {
      args.push("--", ...manifest.eslint);
    }
    const outcome = runCommand("pnpm", args, { cwd });
    if (outcome.status !== "pass") allPassed = false;
    results.eslint = outcome;
  }

  // 5. Git Diff Check (whitespace & conflict markers)
  if (manifest.diff_check !== false) {
    executed.push("diff_check");
    const outcome = runCommand("git", ["diff", "--check"], { cwd });
    if (outcome.status !== "pass") allPassed = false;
    results.diff_check = outcome;
  }

  // 6. Production Build (only if required by task)
  if (manifest.build) {
    executed.push("build");
    const outcome = runCommand("pnpm", ["build"], { cwd, timeout: 300_000 });
    if (outcome.status !== "pass") allPassed = false;
    results.build = outcome;
  }

  // 7. Custom Validation Commands (Strictly Constrained Vocabulary)
  if (Array.isArray(manifest.custom_commands)) {
    for (const cmd of manifest.custom_commands) {
      const name = cmd.name || cmd.command || "custom_check";
      executed.push(name);
      const validation = validateCustomCommand(cmd);
      if (!validation.ok) {
        allPassed = false;
        results[name] = {
          status: "fail",
          exit_code: 126,
          duration_ms: 0,
          error: `SECURITY_VIOLATION: ${validation.reason}`,
        };
        continue;
      }
      const outcome = runCommand(validation.command, validation.args, {
        cwd,
        timeout: Math.min(cmd.timeout || 60_000, 300_000),
      });
      if (outcome.status !== "pass") allPassed = false;
      results[name] = outcome;
    }
  }

  const passedCount = Object.values(results).filter((r) => r.status === "pass").length;
  const totalCount = Object.keys(results).length;

  return {
    ok: allPassed,
    executed_checks: executed,
    summary: {
      passed: passedCount,
      failed: totalCount - passedCount,
      total: totalCount,
    },
    results,
  };
}
