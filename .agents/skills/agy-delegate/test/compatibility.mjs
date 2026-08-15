#!/usr/bin/env node
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const skillDir = fileURLToPath(new URL("..", import.meta.url));
const relayPath = join(skillDir, "scripts", "relay.mjs");
const skillPath = join(skillDir, "SKILL.md");
const briefGuidePath = join(skillDir, "references", "writing-the-brief.md");
const scratch = mkdtempSync(join(tmpdir(), "agy-delegate-compatibility-"));
const fakeBin = join(scratch, "bin");
mkdirSync(fakeBin);

let contracts = 0;
function contract(name, check) {
  try {
    check();
    contracts += 1;
  } catch (error) {
    error.message = `${name}: ${error.message}`;
    throw error;
  }
}

function run(command, args, options = {}) {
  const completed = spawnSync(command, args, { encoding: "utf8", ...options });
  assert.equal(completed.error, undefined, completed.error?.message);
  return completed;
}

function initRepo(name) {
  const workDir = join(scratch, `repo-${name}`);
  mkdirSync(workDir);
  assert.equal(run("git", ["init", "-q"], { cwd: workDir }).status, 0);
  writeFileSync(join(workDir, "tracked.txt"), "before\n");
  assert.equal(run("git", ["add", "tracked.txt"], { cwd: workDir }).status, 0);
  assert.equal(run("git", [
    "-c", "user.name=Relay Compatibility",
    "-c", "user.email=relay-compatibility@example.invalid",
    "commit", "-qm", "fixture",
  ], { cwd: workDir }).status, 0);
  return workDir;
}

const fakeAgyJs = `#!/usr/bin/env node
const { appendFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");
const args = process.argv.slice(2);
if (args[0] === "changelog") {
  process.stdout.write("1.1.12: fake\\n");
  process.exit(0);
}
appendFileSync(process.env.RELAY_TEST_AGY, args.join("\\u001f") + "\\u001e");
const logIndex = args.indexOf("--log-file");
if (logIndex >= 0) {
  writeFileSync(args[logIndex + 1], [
    'project: created project "fixture" (id=22222222-2222-2222-2222-222222222222)',
    "Print mode: conversation=11111111-1111-1111-1111-111111111111",
  ].join("\\n") + "\\n");
}
switch (process.env.RELAY_TEST_MODE) {
  case "permission-denied":
    process.stderr.write('no output produced — a tool required the "write_file" permission that headless mode cannot prompt for, so it was auto-denied\\n');
    process.exit(0);
  case "error":
    process.stderr.write("fake provider failure\\n");
    process.exit(7);
  case "edit":
    appendFileSync(join(process.cwd(), "tracked.txt"), "after\\n");
    process.stdout.write("edit complete");
    process.exit(0);
  default:
    process.stdout.write("analysis complete");
    process.exit(0);
}
`;

const fakeAgyCs = `
using System;
using System.IO;
class FakeAgy {
  static int Main(string[] args) {
    if (args.Length > 0 && args[0] == "changelog") {
      Console.WriteLine("1.1.12: fake");
      return 0;
    }
    File.AppendAllText(Environment.GetEnvironmentVariable("RELAY_TEST_AGY"), String.Join("\\u001f", args) + "\\u001e");
    var logIndex = Array.IndexOf(args, "--log-file");
    if (logIndex >= 0) File.WriteAllText(args[logIndex + 1],
      "project: created project \\"fixture\\" (id=22222222-2222-2222-2222-222222222222)\\n" +
      "Print mode: conversation=11111111-1111-1111-1111-111111111111\\n");
    switch (Environment.GetEnvironmentVariable("RELAY_TEST_MODE")) {
      case "permission-denied":
        Console.Error.WriteLine("no output produced — a tool required the \\"write_file\\" permission that headless mode cannot prompt for, so it was auto-denied");
        return 0;
      case "error":
        Console.Error.WriteLine("fake provider failure");
        return 7;
      case "edit":
        File.AppendAllText(Path.Combine(Environment.CurrentDirectory, "tracked.txt"), "after\\n");
        Console.Write("edit complete");
        return 0;
      default:
        Console.Write("analysis complete");
        return 0;
    }
  }
}
`;

function installFakeAgy() {
  if (process.platform !== "win32") {
    const executable = join(fakeBin, "agy");
    writeFileSync(executable, fakeAgyJs);
    chmodSync(executable, 0o755);
    return;
  }
  const source = join(scratch, "fake-agy.cs");
  const executable = join(fakeBin, "agy.exe");
  writeFileSync(source, fakeAgyCs);
  const windir = process.env.WINDIR || "C:\\Windows";
  const compiler = [
    join(windir, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
    join(windir, "Microsoft.NET", "Framework", "v4.0.30319", "csc.exe"),
  ].find((candidate) => existsSync(candidate));
  assert.ok(compiler, "native Windows C# compiler is required for the agy argv shim");
  const compilation = run(compiler, ["/nologo", `/out:${executable}`, source]);
  assert.equal(compilation.status, 0, `${compilation.stdout}\n${compilation.stderr}`);
}

installFakeAgy();

const editOnlyBrief = `<task>Update tracked.txt.</task>
<edit_only>Edit files only. Do not run shell commands, tests, lint, typecheck, or builds.</edit_only>
<structured_output_contract>Report the files touched and note that validation was not run.</structured_output_contract>
`;

function parseArgv(path) {
  if (!existsSync(path)) return [];
  return readFileSync(path, "utf8")
    .split("\u001e")
    .filter(Boolean)
    .map((record) => record.split("\u001f"));
}

function dispatch(name, { mode = "analysis", args = [], brief = editOnlyBrief } = {}) {
  const workDir = initRepo(name);
  const briefPath = join(scratch, `${name}-brief.txt`);
  const argvPath = join(scratch, `${name}-argv.txt`);
  const outDir = join(scratch, `${name}-out`);
  writeFileSync(briefPath, brief);
  writeFileSync(argvPath, "");
  const completed = run(process.execPath, [
    relayPath,
    "--brief", briefPath,
    "--cd", workDir,
    "--out-dir", outDir,
    ...args,
  ], {
    cwd: workDir,
    env: {
      ...process.env,
      PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
      RELAY_TEST_AGY: argvPath,
      RELAY_TEST_MODE: mode,
    },
    timeout: 15_000,
  });
  return {
    completed,
    workDir,
    outDir,
    argv: parseArgv(argvPath)[0] || [],
    result: existsSync(join(outDir, "result.json"))
      ? JSON.parse(readFileSync(join(outDir, "result.json"), "utf8"))
      : null,
  };
}

try {
  const fresh = dispatch("fresh", {
    args: ["--model", "fixture-model", "--effort", "high", "--add-dir", "extra workspace"],
  });
  contract("1 relay argument parsing", () => {
    assert.equal(fresh.completed.status, 0, fresh.completed.stderr);
    assert.equal(fresh.argv[fresh.argv.indexOf("--model") + 1], "fixture-model");
    assert.equal(fresh.argv[fresh.argv.indexOf("--effort") + 1], "high");
    const invalid = dispatch("invalid-effort", { args: ["--effort", "extreme"] });
    assert.equal(invalid.completed.status, 2);
    assert.equal(invalid.result, null);
  });
  contract("2 fresh dispatch construction", () => {
    assert.ok(fresh.argv.includes("--new-project"));
    assert.ok(fresh.argv.includes(`--print=${editOnlyBrief}`));
    assert.equal(fresh.argv.includes("--continue"), false);
    assert.equal(fresh.argv.includes("--conversation"), false);
  });
  contract("3 workspace and repository paths", () => {
    const addDirs = fresh.argv
      .map((arg, index) => arg === "--add-dir" ? fresh.argv[index + 1] : null)
      .filter(Boolean);
    assert.deepEqual(addDirs, [fresh.workDir, resolve(fresh.workDir, "extra workspace")]);
    assert.equal(fresh.result.workdir, fresh.workDir);
  });
  contract("4 unsupported exclude-path is not a hidden contract", () => {
    const excluded = dispatch("exclude-path", { args: ["--exclude-path", "protected.txt"] });
    assert.equal(excluded.completed.status, 2);
    assert.match(excluded.completed.stderr, /unknown option: --exclude-path/);
    assert.equal(excluded.result, null);
  });

  const readOnly = dispatch("read-only", { args: ["--read-only"] });
  const readOnlyViolation = dispatch("read-only-violation", {
    mode: "edit",
    args: ["--read-only"],
  });
  const edited = dispatch("edit-only", { mode: "edit" });
  contract("5 read-only and edit-only behavior", () => {
    assert.equal(readOnly.completed.status, 0, readOnly.completed.stderr);
    assert.equal(readOnly.argv[readOnly.argv.indexOf("--mode") + 1], "plan");
    assert.equal(readOnly.result.readOnly, true);
    assert.equal(readOnly.result.readOnlyViolation, false);
    assert.equal(readOnlyViolation.result.readOnly, true);
    assert.equal(readOnlyViolation.result.readOnlyViolation, true);
    assert.equal(edited.completed.status, 0, edited.completed.stderr);
    assert.equal(edited.result.status, "completed");
    assert.ok(edited.result.touchedFiles.some((line) => line.endsWith("tracked.txt")));
    const skill = readFileSync(skillPath, "utf8");
    const guide = readFileSync(briefGuidePath, "utf8");
    assert.match(skill, /reserve\s+shell commands, tests, lint, typecheck, and builds for the orchestrator/i);
    assert.match(guide, /Do not run shell commands, tests, lint, formatters, typecheck, builds/i);
    assert.doesNotMatch(guide, /<verification_loop>/);
  });

  const resumed = dispatch("conversation", {
    args: ["--conversation", "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa"],
  });
  const continued = dispatch("continue", { args: ["--resume-last"] });
  contract("6 resume argument construction", () => {
    assert.equal(resumed.argv[resumed.argv.indexOf("--conversation") + 1], "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa");
    assert.equal(resumed.argv.includes("--new-project"), false);
    assert.equal(resumed.argv.includes("--add-dir"), false);
    assert.equal(resumed.result.resumed, true);
    assert.ok(continued.argv.includes("--continue"));
    assert.equal(continued.argv.includes("--add-dir"), false);
    assert.equal(continued.result.resumed, true);
  });

  const denied = dispatch("permission-denied", { mode: "permission-denied" });
  contract("7 permission-denial failure handling", () => {
    assert.equal(denied.completed.status, 1);
    assert.equal(denied.result.status, "failed");
    assert.equal(denied.result.exitCode, 1);
    assert.match(denied.result.error, /auto-denied/);
    assert.ok(denied.result.stderrTail.some((line) => line.includes("auto-denied")));
  });
  contract("8 result capture", () => {
    assert.equal(fresh.result.status, "completed");
    assert.equal(fresh.result.exitCode, 0);
    assert.equal(fresh.result.finalMessage, "analysis complete");
    assert.equal(fresh.result.projectId, "22222222-2222-2222-2222-222222222222");
    assert.equal(fresh.result.conversationId, "11111111-1111-1111-1111-111111111111");
    assert.ok(existsSync(fresh.result.finalPath));
    assert.ok(existsSync(fresh.result.logPath));
  });

  const failed = dispatch("provider-error", { mode: "error" });
  contract("9 error capture", () => {
    assert.equal(failed.completed.status, 7);
    assert.equal(failed.result.status, "failed");
    assert.equal(failed.result.exitCode, 7);
    assert.ok(failed.result.stderrTail.some((line) => line.includes("fake provider failure")));
    assert.ok(existsSync(failed.result.stderrPath));
  });
  contract("10 no dangerous permission bypass", () => {
    assert.equal(fresh.argv.includes("--dangerously-skip-permissions"), false);
    assert.equal(fresh.result.dangerouslySkipPermissions, false);
    const conflict = dispatch("dangerous-conflict", {
      args: ["--read-only", "--dangerously-skip-permissions"],
    });
    assert.equal(conflict.completed.status, 2);
    assert.match(conflict.completed.stderr, /mutually exclusive/);
    assert.equal(conflict.result, null);
  });

  console.log(`agy-delegate compatibility: ${contracts}/10 contracts passed`);
} finally {
  rmSync(scratch, { recursive: true, force: true });
}
