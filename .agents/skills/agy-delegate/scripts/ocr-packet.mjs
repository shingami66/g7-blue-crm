#!/usr/bin/env node
/**
 * delegate-skills · ocr-packet.mjs
 *
 * Deterministic host utility for Open Code Review delegation preparation.
 * Interacts only with `ocr delegate preview` and `ocr delegate rule`.
 * Strictly prohibits `ocr review` and `ocr llm test`. Requires zero LLM credentials.
 * Stored in an OS-local runtime directory outside the Git working tree.
 */

import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdirSync, writeFileSync, existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const OCR_PACKET_SCHEMA_VERSION = "ocr-review-packet.v1";
const MAX_BATCH_FILES = 15;
const MAX_BATCH_BYTES = 4096;

const STRICTLY_PROTECTED_PATTERNS = [
  /build-watch-.*\.log$/i,
  /(^|[/\\])\.env/i,
  /\.(key|pem|cert|pfx|pkcs12)$/i,
  /(^|[/\\])id_[a-z0-9_]+$/i,
  /(^|[/\\])(secrets?|credentials?)\.[a-z0-9]+$/i,
  /\.log$/i,
];

function resolveOcrCommand() {
  if (process.platform === "win32") {
    const appData = process.env.APPDATA || "";
    const npmOcr = join(appData, "npm", "ocr.cmd");
    if (existsSync(npmOcr)) return npmOcr;
  }
  return "ocr";
}

export function getRuntimeReviewDir() {
  const dir = join(tmpdir(), "g7-control-layer", "reviews");
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function isStrictlyProtected(filePath) {
  const norm = String(filePath || "").replaceAll("\\", "/");
  for (const pat of STRICTLY_PROTECTED_PATTERNS) {
    if (pat.test(norm)) return true;
  }
  return false;
}

/**
 * Run `ocr delegate preview --format json`.
 */
export function runOcrPreview({ cwd, commit, from, to, ruleFile, backgroundFile }) {
  const isWin = process.platform === "win32";
  const args = ["delegate", "preview", "--format", "json"];

  if (commit) args.push("-c", commit);
  if (from) args.push("--from", from);
  if (to) args.push("--to", to);
  if (ruleFile) args.push("--rule", ruleFile);
  if (backgroundFile) args.push("-B", backgroundFile);

  const res = spawnSync("ocr", args, {
    cwd,
    encoding: "utf8",
    timeout: 30_000,
    shell: isWin,
  });

  if (res.error) {
    throw new Error(`OCR_PREVIEW_EXECUTION_FAILED: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`OCR_PREVIEW_EXIT_NONZERO (${res.status}): ${res.stderr || res.stdout}`);
  }

  try {
    return JSON.parse(res.stdout);
  } catch (err) {
    throw new Error(`OCR_PREVIEW_INVALID_JSON: ${err.message}\nRaw output: ${res.stdout.slice(0, 500)}`);
  }
}

/**
 * Run `ocr delegate rule --format json <files...>` bounded by file count and byte length.
 */
export function runOcrRules(files, { cwd, ruleFile, backgroundFile }) {
  if (!files || files.length === 0) {
    return { groups: [] };
  }

  const isWin = process.platform === "win32";
  const allGroups = [];
  let groupIdOffset = 1;

  let currentBatch = [];
  let currentBytes = 0;

  const batches = [];
  for (const f of files) {
    const fileBytes = Buffer.byteLength(f, "utf8");
    if (
      currentBatch.length >= MAX_BATCH_FILES ||
      currentBytes + fileBytes > MAX_BATCH_BYTES
    ) {
      if (currentBatch.length > 0) batches.push(currentBatch);
      currentBatch = [f];
      currentBytes = fileBytes;
    } else {
      currentBatch.push(f);
      currentBytes += fileBytes;
    }
  }
  if (currentBatch.length > 0) batches.push(currentBatch);

  for (const batch of batches) {
    const args = ["delegate", "rule", "--format", "json"];
    if (ruleFile) args.push("--rule", ruleFile);
    if (backgroundFile) args.push("-B", backgroundFile);
    args.push(...batch);

    const res = spawnSync("ocr", args, {
      cwd,
      encoding: "utf8",
      timeout: 30_000,
      shell: isWin,
    });

    if (res.status !== 0) {
      throw new Error(`OCR_RULE_RESOLVE_FAILED (${res.status}): ${res.stderr || res.stdout}`);
    }

    try {
      const parsed = JSON.parse(res.stdout);
      if (Array.isArray(parsed.groups)) {
        for (const group of parsed.groups) {
          allGroups.push({
            ...group,
            group_id: groupIdOffset++,
          });
        }
      }
    } catch (err) {
      throw new Error(`OCR_RULE_INVALID_JSON: ${err.message}`);
    }
  }

  return { groups: allGroups };
}

/**
 * Build deterministic structured review packet.
 */
export function prepareReviewPacket({
  cwd,
  taskId,
  runId = null,
  targetFiles = null,
  targetPrefix = null,
  includeTests = false,
  commit = null,
  from = null,
  to = null,
  ruleFile = null,
  backgroundFile = null,
  outDir = null,
}) {
  const defaultRule = join(cwd, ".opencodereview", "rule.json");
  const defaultBackground = join(cwd, ".opencodereview", "background.md");

  const effectiveRule = ruleFile || (existsSync(defaultRule) ? defaultRule : null);
  const effectiveBackground = backgroundFile || (existsSync(defaultBackground) ? defaultBackground : null);

  // 1. Run Preview
  const preview = runOcrPreview({
    cwd,
    commit,
    from,
    to,
    ruleFile: effectiveRule,
    backgroundFile: effectiveBackground,
  });

  const previewReviewable = preview.reviewable_files || [];
  const previewExcluded = preview.excluded_files || [];

  for (const f of previewReviewable) {
    if (isStrictlyProtected(f.path)) {
      throw new Error(`SECURITY_GATE_VIOLATION: Protected sensitive file admitted by preview (${f.path})`);
    }
  }

  let finalReviewable = [...previewReviewable];
  let finalExcluded = [...previewExcluded];

  // If task contract explicitly requires reviewing tests
  if (includeTests) {
    const testExclusions = previewExcluded.filter(
      (f) =>
        f.exclude_reason === "default_path" &&
        /\.(test|spec)\.(ts|tsx|js|mjs)$/i.test(f.path) &&
        !isStrictlyProtected(f.path)
    );
    for (const t of testExclusions) {
      finalReviewable.push({
        path: t.path,
        status: t.status,
        insertions: t.insertions || 0,
        deletions: t.deletions || 0,
        source: "contract_test_override",
      });
    }
    finalExcluded = previewExcluded.filter((f) => !testExclusions.includes(f));
  }

  // Handle targetFiles or targetPrefix overrides strictly protecting user_exclude
  if (Array.isArray(targetFiles) && targetFiles.length > 0) {
    const targetSet = new Set(targetFiles.map((p) => p.replaceAll("\\", "/")));
    for (const f of previewExcluded) {
      const norm = f.path.replaceAll("\\", "/");
      // Never re-admit user_exclude or sensitive paths
      if (f.exclude_reason !== "user_exclude" && targetSet.has(norm) && !isStrictlyProtected(norm) && !finalReviewable.some((r) => r.path === f.path)) {
        finalReviewable.push({
          path: f.path,
          status: f.status || "M",
          insertions: f.insertions || 0,
          deletions: f.deletions || 0,
          source: "task_target_override",
        });
      }
    }
    finalReviewable = finalReviewable.filter((f) => targetSet.has(f.path.replaceAll("\\", "/")));
  } else if (targetPrefix) {
    const normPrefix = targetPrefix.replaceAll("\\", "/").replace(/^\.\//, "");
    for (const f of previewExcluded) {
      const norm = f.path.replaceAll("\\", "/").replace(/^\.\//, "");
      // Allow overriding .agents/skills if targeted by prefix, but never sensitive files
      if (norm.startsWith(normPrefix) && !isStrictlyProtected(norm) && !finalReviewable.some((r) => r.path === f.path)) {
        finalReviewable.push({
          path: f.path,
          status: f.status || "M",
          insertions: f.insertions || 0,
          deletions: f.deletions || 0,
          source: "task_prefix_override",
        });
      }
    }
    finalReviewable = finalReviewable.filter((f) => {
      const p = f.path.replaceAll("\\", "/").replace(/^\.\//, "");
      return p.startsWith(normPrefix);
    });
  }

  // 2. Resolve Rules for Reviewable Files
  const pathsToResolve = finalReviewable.map((f) => f.path);
  const ruleResult = runOcrRules(pathsToResolve, {
    cwd,
    ruleFile: effectiveRule,
    backgroundFile: effectiveBackground,
  });

  let backgroundContent = "";
  if (effectiveBackground && existsSync(effectiveBackground)) {
    try {
      backgroundContent = readFileSync(effectiveBackground, "utf8");
    } catch {
      // ignore
    }
  }

  // Collect diff and source context for reviewable files
  let diffContext = "";
  try {
    const gitDiff = spawnSync("git", ["diff", "HEAD", "--", ...pathsToResolve], {
      cwd,
      encoding: "utf8",
      maxBuffer: 20 * 1024 * 1024,
      shell: false,
    });
    if (gitDiff.stdout && gitDiff.stdout.trim()) {
      diffContext += `--- GIT DIFF (HEAD vs Working Tree) ---\n${gitDiff.stdout.trim()}\n\n`;
    }
    for (const p of pathsToResolve) {
      const fullP = join(cwd, p);
      if (existsSync(fullP)) {
        try {
          const content = readFileSync(fullP, "utf8");
          if (!diffContext.includes(`diff --git a/${p}`)) {
            diffContext += `--- FILE CONTENT: ${p} ---\n${content.slice(0, 50_000)}\n\n`;
          }
        } catch {
          // ignore
        }
      }
    }
  } catch {
    // ignore
  }

  const packet = {
    schema_version: OCR_PACKET_SCHEMA_VERSION,
    task_id: taskId || "TASK-REVIEW",
    run_id: runId || `${Date.now()}-${randomBytes(4).toString("hex")}`,
    generated_at: new Date().toISOString(),
    review_scope: {
      total_reviewable: finalReviewable.length,
      total_excluded: finalExcluded.length,
      rule_groups_count: ruleResult.groups.length,
    },
    reviewable_files: finalReviewable,
    excluded_files: finalExcluded,
    rule_groups: ruleResult.groups,
    background_summary: backgroundContent ? backgroundContent.slice(0, 1500) : null,
    diff_context: diffContext,
    review_contract: {
      findings_only: true,
      read_only: true,
      no_mutation: true,
      classification_vocabulary: ["BLOCKING", "MATERIAL", "MINOR"],
      report_contract: "List findings as 'PATH:LINE [SEVERITY] DESCRIPTION -> RECOMMENDATION'",
    },
  };

  const runtimeDir = outDir || getRuntimeReviewDir();
  const safeTask = String(packet.task_id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const safeRun = String(packet.run_id).replace(/[^a-zA-Z0-9_-]/g, "_");
  const outPath = join(runtimeDir, `review-packet-${safeTask}-${safeRun}.json`);
  writeFileSync(outPath, `${JSON.stringify(packet, null, 2)}\n`, "utf8");

  return { packet, outPath };
}
