# G7 Repair and Implementation Workflow

## Authority and scope

This document describes a bounded workflow for G7 repair, implementation, validation, independent review, and in-scope repair. It is guidance, not an authorization source. The current Owner request, `AGENTS.md`, and applicable skills define authority.

An Owner request names the repository, scope, allowed files, systems, exclusions, and required validation. Ordinary bounded work may proceed from that clear request without a magic mode token. Specialized labels remain available when they make a boundary clearer.

## Roles

### Owner

- Authorizes the bounded task and retains decisions about scope, Git, database, deployment, production, and release actions.

### Luna / Codex Controller

- Coordinates the task, inspects the actual worktree, runs the authorized validation, reconciles evidence, and issues the final verdict.
- Does not widen scope by inference or silently clean inherited work.

### Gemini Writer

- When delegation is required, one Writer is selected through `$agy-delegate` with the task-specified model.
- The Writer is edit-only and may touch only the explicitly allowed files.
- The Writer does not run tests, lint, TypeScript, Git, shell commands, database commands, or deployment actions.

### Independent Reviewer

- A separate native Codex Reviewer is read-only and findings-only.
- The Reviewer checks the exact current scope, original findings, regression risk, and applicable OCR delegation rules.
- The Reviewer never edits, stages, commits, pushes, applies SQL, or deploys.

## Normal bounded lifecycle

1. Confirm the Owner's named repository, exact scope, exclusions, and starting state.
2. Inspect the actual relevant files and current diff without widening to unrelated dirty work.
3. Delegate one bounded edit-only Writer when the task calls for delegated implementation.
4. Luna inspects the actual delta and runs affected focused tests plus proportional typecheck, lint, and diff validation.
5. Run separate read-only findings-only review when the task or risk warrants independent review. For OCR-assisted review, resolve rules for the exact files only through Alibaba's delegation mode; do not configure an external OCR model/provider.
6. If BLOCKING or MATERIAL findings remain inside the authorized scope, route only those findings back to the same Writer. Luna validates the repair and the Reviewer rereviews it in the same Owner-authorized task.
7. Close with the requested evidence, severity counts, remaining warnings, and verdict. Git, database, deployment, and production stages remain separate unless separately authorized.

## Scope and preservation

- Modify only named files. Do not silently add helpers, generated artifacts, dependencies, migrations, tests, or documentation outside scope.
- Preserve unrelated dirty and untracked state. Do not revert, normalize, clean, stash, or merge worktrees as part of a bounded repair.
- Guard/context files may be changed only when the Owner names the exact files and purpose. `GUARD_EDIT_ONLY` is an optional label for that deliberate guard-file task, not a prerequisite for ordinary implementation.
- A governance document does not become an application prerequisite merely because it describes a workflow.
- Manual browser, visual, RTL, print, and workflow acceptance remains human-owned unless the task explicitly authorizes Luna to run it.

## Validation and review evidence

- Validation is proportional to risk: affected focused tests, typecheck, lint, and `git diff --check` are the normal baseline; add build, smoke, or database verification only when authorized and warranted.
- Report actual commands and outcomes. Do not claim a test, review, or human acceptance that did not occur.
- Review findings use `BLOCKING`, `MATERIAL`, and `MINOR`. Do not return `PASS` while BLOCKING or MATERIAL findings remain.
- If required review capacity or an authorized Writer route is unavailable, report the concrete execution failure and stop at that boundary.
- Keep protected authentication material, credentials, tokens, private keys, connection strings, and protected logs out of commands, artifacts, prompts, and reports.

## Git boundaries

- Implementation and validation do not authorize staging, commit, push, rebase, reset, restore, stash, or cleanup.
- Commit work stages only the exact authorized files and uses the exact authorized subject after verifying the index.
- Push work verifies the exact authorized outgoing commits and branch before pushing. No force push.

## Database and production boundaries

- Application work does not authorize SQL, migrations, RPC changes, schema changes, RLS/grants, database writes, deployment, or production mutation.
- Database work uses the repository's supported mechanism, exact authorized target, and exact authorized operation. Do not reset, seed, truncate, recreate, or repair history manually.
- Code review, validation, commit, and push never imply database or production authority.

## Failure and escalation

- Classify a failure from repository/tool evidence before changing course. Do not silently substitute a model, Writer, environment, repository, or target system.
- A normal bounded repair loop may continue within the same task when the finding is inside scope and the same Writer can edit the named files.
- Return HOLD only for a genuine blocker: scope conflict, protected or unexpected mutation, failed required validation, missing evidence, protected-data exposure, unauthorized external mutation, unavailable required review, or a classified execution failure.
- Lack of an optional label, optional navigation artifact, or historical proof step is not by itself a blocker.

## Final report

Use the task's requested report format. When the repository control contract applies, the first line is exactly one of:

```text
TASK RESULT: PASS
TASK RESULT: PASS WITH WARN
TASK RESULT: HOLD
TASK RESULT: FAIL
```

State the exact files changed, validation results, review mechanism and findings, repair loop status, preserved state, and the next authorized action. Never expose protected values in the report.
