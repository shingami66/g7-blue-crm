# G7 BLUE CRM Workflow Prompt Templates

## Purpose

This file stores reusable prompt templates for controlled Codex work in G7 BLUE CRM.

`AGENTS.md` and the repo-local project skills remain authoritative. These templates reduce repeated prompt text, but they do not weaken safety rules, allowed-file limits, review gates, or HOLD behavior.

## Core Operating Principle

- Read carefully.
- Change minimally.
- Verify with proof.
- Stop for approval.

## Canonical Safety Checklist

Use this checklist by reference in future prompts instead of pasting every rule again.

- Do not use `git add .`.
- Do not stage files unless the task explicitly allows staging.
- Do not commit unless the task explicitly allows commit.
- Do not push unless the task explicitly allows push.
- Do not amend, rebase, reset, or force-push unless explicitly approved.
- Do not read or print `.env*`.
- Do not read, print, or expose secrets.
- Do not run SQL or Supabase commands unless explicitly approved.
- Do not perform broad refactors or unrelated cleanup.
- Do not touch unrelated files.
- Return `TASK RESULT: HOLD` on suspicious state, unexpected files, missing prerequisites, failed checks, or scope conflict.
- Treat git state and command output as authority over prior reports.

## Prompt Tiers

### Read-Only Status/Check

```text
# TASK-ID
MODE: READ-ONLY STATUS

Objective:
Verify the current repo state for [reason].

Expected state:
- Branch: main
- Latest commit: [hash message]
- Working tree: clean

Rules:
- Use the Canonical Safety Checklist.
- Read-only only.
- Do not edit, stage, commit, push, install, run SQL/Supabase, read .env*, or start implementation.

Run:
git status --short --untracked-files=all
git status -sb
git log -3 --oneline

Final report:
TASK RESULT: PASS or HOLD
Include git state, mismatches, and no-write confirmation.
```

### Read-Only Audit

```text
# TASK-ID
MODE: READ-ONLY AUDIT

Objective:
Audit [area] and report facts, risks, and recommendations.

Allowed inspection:
- [files/directories]

Rules:
- Use the Canonical Safety Checklist.
- Do not modify files or run build unless explicitly listed.
- Do not read .env* or secrets.

Required report:
1. Current git state.
2. Files inspected.
3. Facts.
4. Risks.
5. Recommendations.
6. Future controlled tasks.
7. No-write confirmation.
```

### Docs-Only Sync

```text
# TASK-ID
MODE: DOCS-ONLY SYNC

Objective:
Update canonical docs for [completed task/change].

Allowed files:
- [docs files]

Reference files:
- [read-only sources]

Rules:
- Use the Canonical Safety Checklist.
- Do not edit code, specs, migrations, package files, AGENTS.md, .agents/*, or .specify/* unless explicitly allowed.
- Do not stage, commit, or push.

Required docs audit:
- What changed in code.
- What changed outside code.
- What moved from pending to complete.
- Stale wording corrected.
- What remains pending.
- Next locked priority.

Verify:
git status --short --untracked-files=all
git status -sb
git diff --name-only
git diff --stat
git diff --check
rg -n "[task id|commit hash|key phrases]" [allowed docs]

Final report:
TASK RESULT: PASS or HOLD
Include changed files, summary, verification, warnings, and no-forbidden-action confirmation.
```

### Implementation Task

```text
# TASK-ID
MODE: IMPLEMENT_NO_STAGE

Objective:
Implement [small scoped behavior].

Allowed files:
- [exact files or directories]

Forbidden:
- [unrelated modules]
- SQL/Supabase unless separately approved
- staging, commit, push

Rules:
- Use the Canonical Safety Checklist.
- Preserve existing patterns.
- No broad refactor.
- Keep financial, RBAC, VAT/ZATCA, and service workflow behavior unchanged unless explicitly in scope.

Verify:
- [targeted tests/checks]
- [manual smoke if needed]
- git diff --check
- git status --short --untracked-files=all

Final report:
TASK RESULT: PASS or HOLD
Include files changed, behavior changed, verification, risks, and no-staging/commit/push confirmation.
```

### Security/RBAC/RLS Task

```text
# TASK-ID
MODE: SECURITY_REVIEW_OR_PATCH

Objective:
Review or patch [auth/RBAC/RLS/security area].

Rules:
- Use the Canonical Safety Checklist.
- Use applicable G7 security and ERP guard skills.
- Do not read .env* or secrets.
- Do not run SQL/Supabase unless this task explicitly authorizes exact commands.

Required proof:
- Permission boundary reviewed.
- Server/client boundary reviewed.
- RLS or database exposure impact reviewed.
- Raw command output for relevant security checks.

Final report:
TASK RESULT: PASS or HOLD
Lead with blocking findings, then verification and residual risk.
```

### SQL/Supabase/Migration Task

```text
# TASK-ID
MODE: SQL_DRAFT_ONLY | MIGRATION_FILE_ONLY | SUPABASE_APPLY_ONLY

Objective:
[Inspect, draft, create migration, or apply exact approved SQL.]

Rules:
- Use the Canonical Safety Checklist.
- Keep inspect, draft, migration creation, and apply as separate controlled tasks unless explicitly combined.
- Never apply SQL unless exact command/text is approved in this prompt.
- Never read .env* or secrets.

Required proof:
- Current git state.
- Exact SQL or migration diff when applicable.
- RLS/RBAC/grant/function impact.
- Backfill/rollback or corrective-migration notes where relevant.
- Raw verification output.

Final report:
TASK RESULT: PASS or HOLD
Include exact files/commands, raw proof, and whether SQL/Supabase was run.
```

### Commit-Only Task

```text
# TASK-ID
MODE: CONTROLLED COMMIT ONLY

Objective:
Commit already-verified changes for [task].

Expected changed files:
- [exact files]

Commit message:
[exact message]

Rules:
- Use the Canonical Safety Checklist.
- Do not edit files.
- Stage only exact allowed files.
- Do not push.

Preflight:
git status --short --untracked-files=all
git status -sb
git diff --name-only
git diff --stat
git diff --check

Stage:
git add -- [exact files]

Verify staged:
git diff --cached --name-only
git diff --cached --stat
git diff --cached --check

Commit:
git commit -m "[exact message]"

Post-check:
git status --short --untracked-files=all
git status -sb
git log -3 --oneline
git log origin/main..HEAD --oneline
git show --check --stat HEAD
git show --name-only --oneline --stat HEAD

Final report:
TASK RESULT: PASS or HOLD
Include raw preflight, staged proof, commit output/hash, post-check, and no-push confirmation.
```

### Push-Only Task

```text
# TASK-ID
MODE: CONTROLLED PUSH ONLY

Objective:
Push the existing verified local commit to origin/main.

Expected state:
- Branch: main
- Latest local commit: [hash message]
- Working tree: clean
- main ahead of origin/main by exactly 1

Rules:
- Use the Canonical Safety Checklist.
- Do not edit, stage, commit, amend, rebase, reset, or force-push.
- Push only the existing commit.

Preflight:
git status --short --untracked-files=all
git status -sb
git log -1 --oneline
git log origin/main..HEAD --oneline
git show --check --stat HEAD
git show --name-only --oneline --stat HEAD

Push:
git push origin main

Post-check:
git status --short --untracked-files=all
git status -sb
git log -1 --oneline
git log origin/main..HEAD --oneline
git show --check --stat HEAD
git show --name-only --oneline --stat HEAD

Final report:
TASK RESULT: PASS or HOLD
Include raw preflight, push output, raw post-check, final alignment, and no-force-push confirmation.
```

## PASS/HOLD Report Templates

### Read-Only Audit

```text
TASK RESULT: PASS|HOLD

1. Current git state.
2. Files inspected.
3. Facts.
4. Risks.
5. Recommendations.
6. Future controlled tasks.
7. Confirmation no files were modified, staged, committed, pushed, installed, or otherwise changed.
```

### Docs-Only Change

```text
TASK RESULT: PASS|HOLD

1. Current git state.
2. File(s) changed.
3. Summary of docs update.
4. Verification output.
5. Warnings.
6. Confirmation no files outside allowed docs were modified.
7. Confirmation no staging, commit, push, SQL, Supabase, build, env, secrets, install, or hooks occurred.
8. Ready/not ready for controlled commit.
```

### Implementation

```text
TASK RESULT: PASS|HOLD

1. Files changed.
2. Behavior implemented.
3. Verification run.
4. Manual smoke result if applicable.
5. Risks or limitations.
6. Confirmation no forbidden files/actions were touched.
7. Ready/not ready for review or controlled commit.
```

### Commit

Raw output is required.

```text
TASK RESULT: PASS|HOLD

1. Raw pre-commit verification output.
2. Raw staged-file verification output.
3. Commit output.
4. Raw post-commit verification output.
5. Commit hash.
6. Files included.
7. Confirmation no edits during commit step.
8. Confirmation no push/amend/rebase/reset occurred.
9. Confirmation no SQL/Supabase/build/env/secrets actions occurred.
```

### Push

Raw output is required.

```text
TASK RESULT: PASS|HOLD

1. Raw pre-push verification output.
2. Commit file proof.
3. Push output.
4. Raw post-push verification output.
5. Final branch/status summary.
6. PASS/HOLD reason.
7. Confirmation no files were modified.
8. Confirmation no staging/commit/amend/rebase/reset/force-push occurred.
9. Confirmation no SQL/Supabase/build/env/secrets actions occurred.
```

### SQL/Supabase/RBAC/Security

Raw output is required for SQL/Supabase, RBAC/RLS/security, financial logic, and suspicious report verification.

```text
TASK RESULT: PASS|HOLD

1. Current git state.
2. Scope reviewed or changed.
3. Raw relevant command output.
4. Security/RBAC/RLS/financial findings.
5. SQL/Supabase command status: run or not run.
6. Residual risk.
7. Required approval or next task.
8. Confirmation no secrets were read or exposed.
```

Summary proof is enough for low-risk read-only audits and docs-only changes when the git state is expected and no suspicious output appears.

## Graphify Usage Policy

- Graphify is a navigation hint, not proof.
- Source files, tests, git diff, and database verification remain authoritative.
- Do not use stale graph output as final evidence.
- Regenerate Graphify only through a separate approved task.
- Do not install Graphify hooks or run `graphify codex install` without approval.
- Do not let Graphify replace reading the actual source before editing or reporting.

Manual query examples:

```powershell
graphify query "Which files import suppliersData?"
graphify query "What calls requirePermission?"
graphify query "Show invoice PDF dependencies"
graphify query "What connects payments to invoices?"
graphify query "Which modules touch company settings?"
```

## Future Adoption Rule

This template document does not automatically change the workflow.

Use these templates manually first. Only after repeated successful use should the project consider:

- AGENTS rule deduplication.
- Skill consolidation.
- A workflow optimizer skill.
- Graphify refresh or a Graphify usage guide.
