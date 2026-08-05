import { readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();

function collectTests(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectTests(path);
    return entry.isFile() && entry.name.endsWith(".test.ts") ? [path] : [];
  });
}

const filter = process.env.TEST_FILE_FILTER;
const testFiles = collectTests(join(root, "src")).sort().filter((file) => !filter || file.includes(filter));
let total = 0;
let passed = 0;
let failed = 0;

for (const file of testFiles) {
  const result = spawnSync(process.execPath, [
    "--no-warnings",
    "--experimental-strip-types",
    "--experimental-test-module-mocks",
    "--test",
    "--test-concurrency=1",
    file,
  ], { cwd: root, encoding: "utf8" });
  process.stdout.write(result.stdout ?? "");
  process.stderr.write(result.stderr ?? "");

  const tests = result.stdout?.match(/# tests (\d+)/)?.[1];
  const passes = result.stdout?.match(/# pass (\d+)/)?.[1];
  const failures = result.stdout?.match(/# fail (\d+)/)?.[1];
  total += Number(tests ?? 0);
  passed += Number(passes ?? 0);
  failed += Number(failures ?? 0) || (result.status === 0 ? 0 : 1);
  if (result.status !== 0 || result.error) {
    console.error(`Failed test file: ${relative(root, file)} (exit ${result.status ?? "unknown"})`);
  }
  if (result.error) {
    process.stderr.write(`${relative(root, file)}: ${result.error.message}\n`);
  }
}

console.log(`Aggregate test summary: ${total} tests, ${passed} passed, ${failed} failed across ${testFiles.length} files.`);
process.exitCode = failed === 0 ? 0 : 1;
