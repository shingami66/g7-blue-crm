---
name: g7-crm-precommit-gate
description: Gatekeeper for G7 BLUE CRM before staging, committing, pushing, opening PRs, or merging. Use to review git status, exact-file staging, build requirements, changed files, and safety confirmations.
---

# G7 CRM Precommit Gate

Use this skill before staging, committing, pushing, opening PRs, or merging.

## Precommit Exact Plan Checks

Before staging:
- Verify mode is `COMMIT_ONLY`.
- Verify working tree contains exactly the approved changed files.
- Verify no file was modified after the approved `REVIEW_ONLY` result.
- Verify the approved review result exists.
- For docs, verify Docs Guard result is PASS or explicitly owner-accepted PASS WITH WARN.
- Verify exact approved commit count.
- Verify exact approved commit subject.
- Verify exact approved file group.

After staging:
- `git diff --cached --name-only` must match the approved file list exactly.
- Staged file count must match.
- Staged diff must contain no unexpected file.
- No broad staging (`git add .` is forbidden).

Before commit:
- Commit subject must match byte-for-byte.
- Any difference causes HOLD.
- The agent must not choose a "clearer" or "better" subject.

Required HOLD reasons:
`PRECOMMIT_PLAN_MISMATCH`
`PRECOMMIT_FILE_MISMATCH`
`PRECOMMIT_SUBJECT_MISMATCH`
`PRECOMMIT_REVIEW_MISSING`

## Validation

- Run `git diff --cached --stat` after staging.
- Run `git diff --cached --check` after staging.
- If `git diff --cached --check` reports whitespace warnings only, continue.
- Stop on real diff/check errors.
- Run `pnpm build` before commit when app code, package files, config, migrations, or build-affecting files change.
- For docs-only changes, run build when the user requests it or when project policy requires it.

## Commit / Push / PR

- Commit only after all exact plan checks are satisfied.
- Push and PR actions are forbidden in `COMMIT_ONLY` mode.
- Pushes require `PUSH_ONLY` mode.

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
