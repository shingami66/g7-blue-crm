---
name: g7-crm-precommit-gate
description: Gatekeeper for G7 BLUE CRM before staging, committing, pushing, opening PRs, or merging. Use to review git status, exact-file staging, build requirements, changed files, and safety confirmations.
---

# G7 CRM Precommit Gate

Use this skill before staging, committing, pushing, opening PRs, or merging.

## Precommit Exact-Slice Checks

Before staging:
- Determine the applicable Git authority before staging. For a qualifying bounded G7 task that passes required validation, CLEAN independent review, and the Controller publication gate with isolated exact scope and unchanged expected remote `main`, G7-OD-12/G7-OD-27 provide standing authority for exact staging and one task-scoped commit; no separate Owner commit confirmation is required. Outside that qualifying path, verify explicit task authorization for staging and committing on the intended branch.
- Record known inherited dirty and untracked work; preserve it without requiring whole-worktree cleanliness.
- Verify the exact approved staged file group and intended commit count.
- Verify the prescribed subject exactly when the task supplies one; otherwise use a concise, accurate subject within the authorized scope.
- Verify required review and validation evidence for the staged slice, proportionate to the task and risk. Do not require a ceremonial prior guard PASS when the task did not require it.

After staging:
- `git diff --cached --name-only` must match the approved file list exactly.
- Staged file count must match.
- Staged diff must contain no unexpected file.
- No broad staging (`git add .` is forbidden).

Before commit:
- A prescribed commit subject must match byte-for-byte. A subject that conflicts with the authorized task causes `PRECOMMIT_SUBJECT_MISMATCH`.
- When no subject is prescribed, use a concise accurate subject and record it in the task evidence.

Required HOLD reasons:
`PRECOMMIT_AUTHORITY_MISMATCH`
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
- PR/merge operations where separately required remain separately authorized. Standing publication covers a normal fast-forward push to `origin/main` only for a qualifying bounded G7 task that passes required validation, CLEAN independent review, and the Controller publication gate with isolated exact scope and unchanged expected remote `main`; it includes the remote race check and remote verification without separate Owner push confirmation.
- Other repositories, branches outside the G7 `main` path, non-fast-forward publication, destructive Git, force push or history rewrite, database/environment/deployment operations, and scope widening are not covered by standing publication and remain separately gated under their applicable exact authorization.

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
