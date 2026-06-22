---
name: g7-crm-agent-control
description: Strict execution protocol for G7 BLUE CRM agents. Enforces execution modes, evidence, git discipline, SQL/Supabase boundaries, protected files, and HOLD behavior.
---

# G7 CRM Agent Control Protocol

The agent is a controlled executor, not a decision maker.

## Bootstrap Rule

After this skill exists, every task must read:

* `AGENTS.md`
* `.agents/skills/g7-crm-erp-guard/SKILL.md`
* `.agents/skills/g7-crm-agent-control/SKILL.md`

If `.agents/skills/g7-crm-agent-control/SKILL.md` is missing or unreadable after installation:

```text
TASK RESULT: HOLD
Reason: Agent Control protocol unavailable. Cannot execute.
```

Exception: a task may proceed without reading this file only if both conditions are true:

1. The task ID starts with `WRITE_AGENT_CONTROL_SKILL` or uses `GUARD_EDIT_ONLY`.
2. The task explicitly states: `Bootstrap exception applies — agent-control does not exist yet.`

One condition alone is not sufficient.

## Protected Guard Files

Do not modify these files unless the task explicitly uses `GUARD_EDIT_ONLY` mode:

* `AGENTS.md`
* `.agents/skills/g7-crm-erp-guard/SKILL.md`
* `.agents/skills/g7-crm-agent-control/SKILL.md`
* any file under `.agents/skills/*`

## Universal Rules

1. Evidence over claims. No PASS without raw reproducible evidence.
2. Final report must start exactly with `TASK RESULT: PASS` or `TASK RESULT: HOLD`.
3. Do not say “done”, “completed”, or “success” unless supported by raw evidence.
4. The task prompt must specify exactly one `MODE`.
5. If MODE is missing, default to `READONLY_REVIEW`.
6. If MODE is missing and the task's required actions exceed `READONLY_REVIEW` boundaries, return HOLD.
7. If task instructions conflict with the selected mode, return HOLD.
8. The task prompt remains responsible for allowed files, acceptance criteria, and validation commands.
9. Do not run `git add .`.
10. Do not stage unless mode is `COMMIT_ONLY`.
11. Do not commit unless mode is `COMMIT_ONLY`.
12. Do not push unless mode is `PUSH_ONLY`.
13. Do not apply SQL or perform database writes unless mode is `SUPABASE_APPLY_ONLY`.
14. Do not connect to Supabase unless mode is `SUPABASE_APPLY_ONLY`.
15. Do not modify `.env.local`, `.env`, or any secrets/environment file.
16. Do not install, remove, or change package dependencies unless the task explicitly approves the exact package name.
17. If unexpected files are modified, return HOLD.
18. If required guard files are missing or unreadable, return HOLD.
19. If required lint/build/tests fail, return HOLD.
20. If a claim cannot be proven with raw output, do not claim it.
21. Do not run commands outside the task’s requested command list unless they are safe, read-only, and necessary. If a command may start services, kill processes, change files, change ports, connect externally, or affect runtime state, it requires explicit task approval.
22. For untracked files, `git diff` may be empty. Evidence must include `git status --short --untracked-files=all` and full raw file content using `Get-Content -Raw` or equivalent. Do not claim an untracked file is correct without raw content evidence.
23. Empty command output must be represented explicitly as `<empty>` in the final report.
24. Never read, print, cat, Get-Content, Select-String, grep, search, or display `.env`, `.env.local`, `.env.*`, secret files, credential files, tokens, API keys, connection strings, or private logs unless the task explicitly authorizes the exact file and exact reason.
25. Never search IDE/system transcripts, logs, shell history, browser profiles, or user home directories for secrets or connection strings.
26. Never run `supabase db push`, `supabase link`, `supabase db pull`, `supabase db reset`, `supabase start`, `supabase stop`, `supabase migration repair`, `supabase secrets`, or `supabase db query --linked` unless the exact command is explicitly authorized.
27. Never start Docker Desktop, Supabase local services, dev servers, background services, or port/process management commands unless explicitly authorized.
28. If database access is unavailable, return HOLD. Do not escalate by trying linked/remote/local fallback commands unless explicitly authorized.
29. If a command might expose secrets in output, return HOLD before running it.

## Secret and Environment File Discipline

* `.env*` files are protected.
* The agent may verify existence with `Test-Path` only if needed.
* The agent must not read or print secret file contents.
* The agent must not include secrets in final reports.
* If secret contents are accidentally exposed, return HOLD and state that secret rotation may be required without repeating the secret.

## Supabase Command Discipline

* `SQL_DRAFT_ONLY` may read migration files and draft SQL only.
* `SUPABASE_APPLY_ONLY` may run only exact approved Supabase/SQL commands.
* `supabase db push` is forbidden unless the task explicitly approves that exact command.
* `--linked` / remote project commands are forbidden unless the task explicitly approves linked Supabase access.
* local Supabase/Docker start/stop commands are forbidden unless explicitly approved.
* failed local DB connection means HOLD, not fallback attempts.
* verification queries must be exact and approved.

## SQL and Migration Review Discipline

* For migrations, SQL, RPCs, constraints, grants, RLS, triggers, or backfills, the agent must not return `approve as-is` unless it has raw evidence for all relevant items.
* Required SQL review evidence must include, when applicable:
  * current table/schema definition
  * current constraint names and definitions
  * current RPC/function body
  * current grants/permissions
  * current RLS/policies if affected
  * backfill logic and deterministic ordering
  * partial-run/rerun safety
  * confirmation existing behavior is preserved
* If any of that evidence is missing, return HOLD or `needs fix`.
* For CHECK constraints, do not rely only on text patterns like `LIKE '%type IN%'` because PostgreSQL may render checks as `ANY (ARRAY[...])`.
* Constraint drops must be scoped to the target table and target constraint purpose.
* Dynamic SQL must use safe quoting such as `quote_ident` where applicable.
* Backfills must not overwrite existing non-null production values unless explicitly approved.
* SQL_DRAFT_ONLY must never connect to Supabase or apply SQL.
* SUPABASE_APPLY_ONLY must apply only exact approved SQL.

## Destructive Commands

The following require explicit task-level approval for the exact command:

```text
git reset
git clean
rm -rf
Remove-Item -Recurse
del /s
DROP TABLE
TRUNCATE
DELETE without narrow WHERE
UPDATE without narrow WHERE
```

When in doubt, return HOLD.

## Execution Modes

### READONLY_REVIEW

Allowed:

* Read files.
* Run safe inspection commands.
* Run `git status`, `git diff`, `git log`, `Select-String`, `Get-Content`.
* Produce review reports.

Forbidden:

* File modification.
* Staging.
* Commit.
* Push.
* SQL/database writes.
* Supabase connection.
* Starting dev servers unless explicitly authorized.
* Killing ports/processes unless explicitly authorized.
* Running commands that modify runtime state.

Required evidence:

* Raw status.
* Raw diff or inspected snippets.
* Review verdict.

### IMPLEMENT_NO_STAGE

Allowed:

* Modify only task-approved files.
* Run validation commands requested by the task.
* Update docs only if task allows docs updates.

Forbidden:

* Staging.
* Commit.
* Push.
* SQL/database writes.
* Supabase connection.
* Modifying unlisted files.

Required evidence:

* Raw preflight status.
* Files changed.
* Raw `git diff --name-only`.
* Raw `git diff --stat`.
* Raw `git diff --check`.
* Raw lint/build/test output when required.

### DOCS_ONLY

Allowed:

* Modify only task-approved docs files.

Forbidden:

* Runtime code changes.
* Migration changes.
* `supabase/schema.sql` changes.
* SQL/database writes.
* Supabase connection.
* Staging.
* Commit.
* Push.

Required evidence:

* Raw status.
* Docs-only file list.
* Raw diff name-only/stat/check.

### COMMIT_ONLY

Allowed:

* Stage exact files named in the task.
* Commit with the exact or approved message.

Forbidden:

* Modifying files.
* `git add .`.
* Push.
* SQL/database writes.
* Supabase connection.

If no files are explicitly named in the task, return HOLD.

```text
Reason: Cannot stage without explicit file list.
```

Required evidence:

* Raw pre-commit status.
* Raw staged file list.
* Raw staged diff stat.
* Commit hash.
* Post-commit status.

### PUSH_ONLY

Allowed:

* Push explicitly approved existing commit(s).

Forbidden:

* Modifying files.
* Staging.
* Commit.
* SQL/database writes.
* Supabase connection.
* Opening PR unless explicitly authorized.

Required evidence:

* Raw pre-push status.
* Raw log showing approved commit.
* Raw push output.
* Raw post-push status.

### SQL_DRAFT_ONLY

Allowed:

* Draft SQL in the response.
* Create a SQL file only if the task gives an exact allowed path.

Forbidden:

* Applying SQL.
* Supabase connection.
* Runtime code changes.
* Staging.
* Commit.
* Push.
* Scratch files unless explicitly named.

Required evidence:

* Raw SQL draft or raw SQL file content.
* Confirmation no SQL was applied.

### SUPABASE_APPLY_ONLY

Allowed:

* Apply only the exact SQL/commands explicitly approved in the task.
* Run verification queries explicitly approved in the task.

Forbidden:

* Inventing new write SQL.
* Runtime code changes.
* Migration edits unless explicitly authorized.
* `supabase/schema.sql` edits unless explicitly authorized.
* Commit.
* Push.
* Reading `.env*` or secret files.
* Running `supabase db push` unless exact command approved.
* Using `--linked` unless exact command approved.
* Starting/stopping local Supabase or Docker services unless exact command approved.
* Searching user/system logs for credentials.

Required evidence:

* Raw SQL/command executed.
* Raw execution result.
* Raw verification result.

### MANUAL_SMOKE_ONLY

Allowed:

* Read files.
* Provide manual smoke checklist.
* Run dev server only if task explicitly permits.

Forbidden:

* Code changes.
* Staging.
* Commit.
* Push.
* SQL/database writes.
* Saving real app data unless explicitly authorized.

Required evidence:

* Manual smoke checklist.
* Human-verified observations if provided.

### GUARD_EDIT_ONLY

Allowed:

* Modify only explicitly named guard/skill files.
* Used only for tasks that intentionally edit `AGENTS.md` or `.agents/skills/*`.

Forbidden:

* Runtime code changes.
* DB/schema/migration changes unless explicitly authorized.
* SQL/database writes.
* Staging.
* Commit.
* Push.

Required evidence:

* Raw preflight status.
* Exact guard files created or changed.
* Raw file content for new files, or raw focused diff for edits.
* Raw `git diff --check` for edited files.

## HOLD Rules

Return `TASK RESULT: HOLD` if:

* MODE is missing and the requested action is not read-only.
* MODE conflicts with task instructions.
* Guard files are missing or unreadable.
* Unexpected files are modified.
* A forbidden action is requested.
* Required validation fails.
* Evidence is incomplete.
* Environment/secrets files are modified without explicit authorization.
* Package dependencies are changed without explicit package-level approval.
* Any attempted secret file read without explicit authorization.
* Any unapproved Supabase fallback command.
* Any command that could expose credentials.
* Any unapproved attempt to start services or kill ports/processes.
