#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const skillDir = fileURLToPath(new URL("..", import.meta.url));
const relayPath = join(skillDir, "scripts", "relay.mjs");
const scratch = mkdtempSync(join(tmpdir(), "g7-agy-relay-compatibility-"));
const fakeBin = join(scratch, "bin");
const workDir = join(scratch, "repo");
const briefPath = join(scratch, "brief.txt");
const statePath = join(scratch, "state.json");
const argvPath = join(scratch, "agy-argv.jsonl");
const gitPath = join(scratch, "git-calls.jsonl");
mkdirSync(fakeBin);
mkdirSync(workDir);
writeFileSync(join(workDir, "pre-existing.txt"), "pre-existing\n");
writeFileSync(join(workDir, "normal.txt"), "normal\n");
writeFileSync(join(workDir, "build-watch-20260716.log"), "protected fixture\n");
writeFileSync(briefPath, "test brief\n");

const fakeGitSource = `
using System;
using System.IO;
class FakeGit {
  static bool Has(string[] args, string value) {
    foreach (var arg in args) if (arg == value) return true;
    return false;
  }
  static int Main(string[] args) {
    File.AppendAllText(Environment.GetEnvironmentVariable("RELAY_TEST_GIT"), String.Join("\\u001f", args) + "\\u001e");
    if (args.Length == 0) return 1;
    if (args[0] == "status") {
      var state = File.ReadAllText(Environment.GetEnvironmentVariable("RELAY_TEST_STATE")).Split('|');
      var calls = Int32.Parse(state[1]) + 1;
      File.WriteAllText(Environment.GetEnvironmentVariable("RELAY_TEST_STATE"), state[0] + "|" + calls);
      string[] lines = state[0] == "excluded-only"
        ? new[] { "?? build-watch-20260716.log" }
        : state[0] == "normal-change" && calls >= 2
          ? new[] { " M pre-existing.txt", " M normal.txt", "?? build-watch-20260716.log" }
          : new[] { " M pre-existing.txt", "?? build-watch-20260716.log" };
      Console.Write(Has(args, "-z") ? String.Join("\\0", lines) + "\\0" : String.Join("\\n", lines) + "\\n");
      return 0;
    }
    if (args[0] == "hash-object") {
      if (Has(args, "build-watch-20260716.log")) return 9;
      Console.Write("tracked-hash");
      return 0;
    }
    return 0;
  }
}
`;
const csharpSource = `
using System;
using System.IO;
using System.Text;
class FakeAgy {
  static int Main(string[] args) {
    if (args.Length > 0 && args[0] == "changelog") {
      Console.WriteLine("1.1.12: fake");
      return 0;
    }
    File.AppendAllText(Environment.GetEnvironmentVariable("RELAY_TEST_AGY"), String.Join("\\u001f", args) + "\\u001e");
    var logIndex = Array.IndexOf(args, "--log-file");
    if (logIndex >= 0) File.WriteAllText(args[logIndex + 1], "Print mode: conversation=11111111-1111-1111-1111-111111111111\\n");
    var response = Environment.GetEnvironmentVariable("RELAY_TEST_RESPONSE");
    if (!String.IsNullOrEmpty(response)) Console.Write(response);
    return 0;
  }
}
`;
const csharpPath = join(scratch, "fake-agy.cs");
const agyPath = join(fakeBin, "agy.exe");
const gitSourcePath = join(scratch, "fake-git.cs");
const gitExecutablePath = join(fakeBin, "git.exe");
writeFileSync(gitSourcePath, fakeGitSource);
writeFileSync(csharpPath, csharpSource);
const windir = process.env.WINDIR || "C:\\Windows";
const cscPath = [
  join(windir, "Microsoft.NET", "Framework64", "v4.0.30319", "csc.exe"),
  join(windir, "Microsoft.NET", "Framework", "v4.0.30319", "csc.exe"),
].find((path) => existsSync(path));
assert.ok(cscPath, "native Windows C# compiler is required for the agy argv shim");
const compilation = spawnSync(cscPath, ["/nologo", `/out:${agyPath}`, csharpPath], { encoding: "utf8" });
assert.equal(compilation.status, 0, `${compilation.stdout}\n${compilation.stderr}`);
const gitCompilation = spawnSync(cscPath, ["/nologo", `/out:${gitExecutablePath}`, gitSourcePath], { encoding: "utf8" });
assert.equal(gitCompilation.status, 0, `${gitCompilation.stdout}\n${gitCompilation.stderr}`);

const protectedPath = "build-watch-20260716.log";
const excludedPaths = [
  protectedPath,
  "build-watch-20260718.log",
  "build-watch-20260722.log",
  "build-watch-20260724.log",
];
const baseEnv = {
  ...process.env,
  PATH: `${fakeBin}${delimiter}${process.env.PATH}`,
  RELAY_TEST_STATE: statePath,
  RELAY_TEST_AGY: argvPath,
  RELAY_TEST_GIT: gitPath,
};

function runRelay(mode, response, outName, extraArgs = []) {
  writeFileSync(statePath, `${mode}|0`);
  writeFileSync(argvPath, "");
  writeFileSync(gitPath, "");
  const outDir = join(scratch, outName);
  const args = [
    relayPath,
    "--brief", briefPath,
    "--cd", workDir,
    "--model", "gemini-3.6-flash-high",
    "--effort", "high",
    "--print-timeout", "5s",
    "--timeout", "10s",
    "--out-dir", outDir,
    ...excludedPaths.flatMap((path) => ["--exclude-path", path]),
    ...extraArgs,
  ];
  const completed = spawnSync(process.execPath, args, {
    cwd: workDir,
    env: { ...baseEnv, ...(response ? { RELAY_TEST_RESPONSE: response } : {}) },
    encoding: "utf8",
    timeout: 15_000,
  });
  assert.ok(completed.status !== null, completed.stderr);
  return {
    process: completed,
    result: JSON.parse(readFileSync(join(outDir, "result.json"), "utf8")),
    agyArgs: readFileSync(argvPath, "utf8").split("\u001e").filter(Boolean).map((record) => record.split("\u001f")),
    gitArgs: readFileSync(gitPath, "utf8").split("\u001e").filter(Boolean).map((record) => record.split("\u001f")),
  };
}

const fresh = runRelay("pre-existing-only", "G7_AGY_RELAY_HIGH_OK", "fresh");
assert.equal(fresh.process.status, 0);
assert.equal(fresh.result.status, "completed");
assert.equal(fresh.result.effort, "high");
assert.deepEqual(fresh.result.excludePaths, excludedPaths);
assert.equal(fresh.result.touchedFiles.includes(`?? ${protectedPath}`), false);
assert.equal(fresh.agyArgs[0].filter((arg) => arg === "--effort").length, 1);
assert.equal(fresh.agyArgs[0][fresh.agyArgs[0].indexOf("--effort") + 1], "high");
assert.equal(fresh.gitArgs.some((args) => args.includes("hash-object") && args.includes(protectedPath)), false);

const resume = runRelay("pre-existing-only", "G7_AGY_RELAY_RESUME_OK", "resume", [
  "--conversation", fresh.result.conversationId,
]);
assert.equal(resume.process.status, 0);
assert.equal(resume.result.status, "completed");
assert.equal(resume.result.resumed, true);
assert.equal(resume.result.conversationId, fresh.result.conversationId);
assert.equal(resume.result.finalMessage, "G7_AGY_RELAY_RESUME_OK");

const excludedOnly = runRelay("excluded-only", "", "excluded-only");
assert.equal(excludedOnly.result.status, "failed");
assert.match(excludedOnly.result.error, /without a final message/);
assert.deepEqual(excludedOnly.result.touchedFiles, []);
assert.equal(excludedOnly.gitArgs.some((args) => args.includes("hash-object")), false);

const normalChange = runRelay("normal-change", "", "normal-change");
assert.equal(normalChange.result.status, "completed");
assert.equal(normalChange.result.touchedFiles.includes(" M normal.txt"), true);
assert.equal(normalChange.result.touchedFiles.includes(`?? ${protectedPath}`), false);

const preExisting = runRelay("pre-existing-only", "", "pre-existing");
assert.equal(preExisting.result.status, "failed");
assert.equal(preExisting.result.touchedFiles.includes(" M pre-existing.txt"), true);
assert.match(preExisting.result.error, /without a final message/);

console.log("agy-delegate compatibility: all checks passed");
