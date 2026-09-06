#!/usr/bin/env node
/**
 * g7-crm-agent-control · test/workflow-contract.mjs
 *
 * Repository-level workflow contract test verifying coding-harness neutrality:
 * 1. Standing workflow language is provider-neutral
 * 2. Codex remains a valid current-harness implementation
 * 3. Antigravity remains a valid current-harness implementation
 * 4. Reviewer must be native to the current harness, not cross-provider
 * 5. OCR delegation remains mandatory where review is required
 * 6. Reviewer is findings-only / read-only
 * 7. Confirmed findings return to the same logical Writer
 * 8. No provider switching / failover is required by the everyday workflow
 * 9. Canonical skills remain single-source
 * 10. Experimental cross-provider tooling is optional, not canonical/default
 */

import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dirname, "../../../..");
const agentsMdPath = join(root, "AGENTS.md");
const agentControlSkillPath = join(root, ".agents/skills/g7-crm-agent-control/SKILL.md");
const agyDelegateSkillPath = join(root, ".agents/skills/agy-delegate/SKILL.md");
const skillsDir = join(root, ".agents/skills");

let passed = 0;

function contract(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
    throw err;
  }
}

console.log("=== Coding-Harness-Neutral Workflow Contracts ===");

const agentsMd = readFileSync(agentsMdPath, "utf8");
const agentControlSkill = readFileSync(agentControlSkillPath, "utf8");
const agyDelegateSkill = readFileSync(agyDelegateSkillPath, "utf8");

// 1. Standing workflow language is provider-neutral
contract("1. Standing workflow language is provider-neutral", () => {
  // Must use harness-neutral writer terms, not mandate Gemini/Codex for everyday writer
  assert.match(
    agentsMd,
    /delegated Writer|current coding harness Writer/i,
    "AGENTS.md must use harness-neutral writer phrasing"
  );
  assert.match(
    agentControlSkill,
    /delegated Writer|current coding harness Writer/i,
    "Agent Control SKILL.md must use harness-neutral writer phrasing"
  );
  assert.doesNotMatch(
    agentsMd,
    /delegated Gemini Writer/i,
    "AGENTS.md must not hardcode 'delegated Gemini Writer'"
  );
  assert.doesNotMatch(
    agentControlSkill,
    /delegated Gemini Writer/i,
    "Agent Control SKILL.md must not hardcode 'delegated Gemini Writer'"
  );
});

// 2. Codex remains a valid current-harness implementation
contract("2. Codex remains a valid current-harness implementation", () => {
  assert.match(
    agentsMd,
    /Codex/i,
    "AGENTS.md must recognize Codex as a supported harness"
  );
  assert.match(
    agentsMd,
    /Codex uses a fresh native Codex Reviewer/i,
    "AGENTS.md must preserve native Codex Reviewer support"
  );
});

// 3. Antigravity remains a valid current-harness implementation
contract("3. Antigravity remains a valid current-harness implementation", () => {
  assert.match(
    agentsMd,
    /Antigravity/i,
    "AGENTS.md must recognize Antigravity as a supported harness"
  );
  assert.match(
    agentsMd,
    /Antigravity uses a fresh native Antigravity Reviewer/i,
    "AGENTS.md must recognize native Antigravity Reviewer support"
  );
});

// 4. Reviewer must be native to current harness, not cross-provider
contract("4. Reviewer must be native to the current harness, not cross-provider", () => {
  assert.match(
    agentsMd,
    /Codex does not launch Antigravity;\s*Antigravity does not launch Codex/i,
    "AGENTS.md must prohibit cross-provider execution in default workflow"
  );
  assert.match(
    agentControlSkill,
    /Provider diversity is not required/i,
    "Agent Control SKILL.md must confirm provider diversity is not required"
  );
});

// 5. OCR delegation remains mandatory where review is required
contract("5. OCR delegation remains mandatory where review is required", () => {
  assert.match(
    agentsMd,
    /ocr delegate preview --format json/i,
    "AGENTS.md must mandate OCR preview delegation"
  );
  assert.match(
    agentsMd,
    /ocr delegate rule --format json/i,
    "AGENTS.md must mandate OCR rule delegation"
  );
  assert.match(
    agentControlSkill,
    /Delegation mode prohibits `ocr review`, `ocr llm test`/i,
    "Agent Control SKILL.md must prohibit ocr review and ocr llm test"
  );
});

// 6. Reviewer is findings-only / read-only
contract("6. Reviewer is findings-only / read-only", () => {
  assert.match(
    agentsMd,
    /read-only and findings-only authority/i,
    "AGENTS.md must define findings-only / read-only authority for Reviewer"
  );
  assert.match(
    agentControlSkill,
    /The Reviewer never edits, stages, commits, pushes, deploys, applies SQL, or repairs/i,
    "Agent Control SKILL.md must strictly forbid Reviewer mutation or repair"
  );
});

// 7. Confirmed findings return to the same logical Writer
contract("7. Confirmed findings return to the same logical Writer", () => {
  assert.match(
    agentsMd,
    /logical Writer-lane repair for confirmed in-scope findings/i,
    "AGENTS.md must return confirmed findings to same logical Writer"
  );
  assert.match(
    agentControlSkill,
    /Send in-scope BLOCKING or MATERIAL findings.*to the same logical Writer lane/i,
    "Agent Control SKILL.md must route findings to same logical Writer"
  );
});

// 8. No provider switching / failover is required by the everyday workflow
contract("8. No provider switching / failover is required by everyday workflow", () => {
  assert.match(
    agentsMd,
    /No cross-provider switching or automatic failover is part of the default workflow/i,
    "AGENTS.md must state no provider switching or automatic failover in default workflow"
  );
});

// 9. Canonical skills remain single-source
contract("9. Canonical skills remain single-source", () => {
  assert.ok(existsSync(skillsDir), ".agents/skills must exist");
  assert.match(
    agentControlSkill,
    /Skills in `\.agents\/skills\/` form a single canonical, harness-neutral skill set/i,
    "Agent Control SKILL.md must establish single canonical skill set"
  );
  // Ensure no duplicate provider-specific skill trees exist
  assert.equal(existsSync(join(root, ".agents/skills-codex")), false);
  assert.equal(existsSync(join(root, ".agents/skills-agy")), false);
  assert.equal(existsSync(join(root, ".agents/skills-gemini")), false);
});

// 10. Experimental cross-provider tooling is optional, not canonical/default
contract("10. Experimental cross-provider tooling is optional, not canonical/default", () => {
  assert.match(
    agentsMd,
    /Optional cross-provider tooling under `\.agents\/skills\/agy-delegate\/` remains a future optional capability/i,
    "AGENTS.md must identify agy-delegate as future optional capability"
  );
  assert.match(
    agyDelegateSkill,
    /Future optional capability/i,
    "agy-delegate SKILL.md must document itself as future optional capability"
  );
  assert.match(
    agyDelegateSkill,
    /Not required for canonical everyday repository tasks/i,
    "agy-delegate SKILL.md must declare it is not required for everyday workflow"
  );
});

console.log(`\nAll ${passed}/10 workflow contracts PASSED cleanly.\n`);
