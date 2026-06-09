---
name: g7-crm-precommit-gate
description: Gatekeeper for G7 BLUE CRM before staging, committing, pushing, opening PRs, or merging. Use to review git status, exact-file staging, build requirements, changed files, and safety confirmations.
---

# G7 CRM Precommit Gate

Use this skill before staging, committing, pushing, opening PRs, or merging.

## Git Safety

- Confirm the exact branch.
- Run `git status --short`.
- Confirm only expected files changed.
- Stage exact files only.
- Never use `git add .`.
- Confirm no unrelated files are staged.
- Confirm no `.env.local` or secret files are staged.
- Confirm no `src` changes are included in docs-only branches.
- Confirm no `AGENTS.md` changes are included unless the task explicitly includes agent guidance.
- Confirm no SQL/migrations are included unless explicitly reviewed and approved.

## Validation

- Run `git diff --cached --stat` after staging.
- Run `git diff --cached --check` after staging.
- If `git diff --cached --check` reports whitespace warnings only, continue.
- Stop on real diff/check errors.
- Run `pnpm build` before commit when app code, package files, config, migrations, or build-affecting files change.
- For docs-only changes, run build when the user requests it or when project policy requires it.

## Commit / Push / PR

- Commit only after branch, staged files, checks, and build/test expectations are satisfied.
- Do not force push.
- Push only the intended branch.
- Open PRs only when requested.

## Required Final Report

Include:

- Branch name.
- Commit hash if committed.
- Files changed or committed.
- Build/test status.
- Final `git status --short`.
- Confirmation no `git add .` was used.
- Confirmation no `.env.local` was touched.
- Confirmation no secrets were included.
- Confirmation no unexpected `src`, SQL, migration, package, or unrelated files were included.
- Push/PR status when applicable.
