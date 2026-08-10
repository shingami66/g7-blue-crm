---
name: g7-crm-agent-control
description: Strict execution protocol for G7 BLUE CRM agents. Enforces execution modes, evidence, git discipline, SQL/Supabase boundaries, protected files, and HOLD behavior.
---

# G7 CRM Agent Control Protocol

The agent is a controlled executor, not a decision maker.

## Standing G7 Workflow Rules

These rules apply to every G7 BLUE CRM task and are the workflow authority referenced by `AGENTS.md`:

* Keep DEV and DEMO distinct. Do not present demo data, mock behavior, local-only checks, or a development server as live or production evidence.
* Follow the exact task mode, allowed files, requested commands, and validation scope. Do not widen scope by inference.
* Browser or manual smoke is user-only unless the task explicitly authorizes the agent to run it; do not claim human smoke evidence that was not provided.
* Never read, print, modify, or expose `.env*`, secrets, credentials, tokens, private logs, or connection strings.
* SQL, Supabase, migrations, RLS, RPC, grants, triggers, schema changes, and database writes require explicit separate authorization and their applicable review gates.
* Commit, Graphify refresh, and push are separate controlled tasks; one task never implies the others.
* Never use `git add .`, wildcard staging, force-push, fetch, pull, or destructive repository commands without exact authorization.
* Use `PASS`, `WARN`, or `HOLD` gates. HOLD on unexpected repository state, scope conflict, missing prerequisites, failed required validation, incomplete evidence, or a control violation.
* Do not claim production readiness, security compliance, financial correctness, or equivalent outcomes without repository-verifiable evidence for the specific claim.

## Prompt Size Tiers

Use the smallest prompt that still states the task-specific scope, exception, expected state, validation, and next action:

* **Compact:** routine Git or Graphify status, validation, commit, push, or refresh tasks.
* **Moderate:** bounded documentation or implementation tasks with explicit files and checks.
* **Detailed:** SQL, migrations, RLS, RBAC, security, financial logic, architecture, recovery, or any task requiring explicit high-risk gates.

Routine prompts must not repeat standing prohibitions unless they create a special exception, address a material risk directly, or are high-risk and require explicit gates.

## Model Routing

Use the lowest model and effort that preserves correctness:

* **GPT-5.4 Mini Light:** status, validation, commit, push, Graphify, and tiny deterministic docs.
* **GPT-5.6 Luna Light/Medium:** bounded, repeatable cleanup or implementation.
* **GPT-5.6 Terra Medium/High:** multi-file implementation and substantial audits.
* **GPT-5.6 Sol High:** architecture, financial logic, RLS/RBAC, security, migrations, and root-cause work.
* **Sol Extra High:** only the hardest unresolved tasks.

## Compact Task and Report Templates

Routine task prompts may use:

```text
Task: <id>
Mode: <one execution mode>
Repository/branch: <path> / <branch>
Scope: <allowed files and exact action>
Expected state: <HEAD/alignment or other required baseline>
Validation: <exact checks>
Next: <locked follow-up, or none>
```

The default compact report is:

```text
RESULT:
ACTION:
VALIDATION:
FINAL STATE:
NEXT:
```

For `WARN` or `HOLD`, include only the exact issue, its impact, and the smallest recovery step.

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

## Protected Context Hook Boundary

`AGENTS.md` and other protected agent-context or governance files must not be modified by an automatic lifecycle hook. `speckit-agent-context-update` is a write-capable operation, even when it is reached through a Spec Kit phase.

Context updates require a separate explicitly approved protected-file task that names the exact protected files and uses `GUARD_EDIT_ONLY` or the repository's existing exact protected-guard mode. Specification, clarification, planning, checklist, task generation, analysis, or implementation approval does not include context-update authority.

Automatic hook execution for protected context must remain disabled. Context update, review, correction, commit, and push remain separate tasks. Any unexpected protected-file mutation returns `TASK RESULT: HOLD`.

## Wrapper-First Domain Routing

### G7 Design Wrapper

For G7 work involving UI design, UX, accessibility, RTL/LTR, responsive behavior, visual assets, Impeccable, Stitch, browser-based design evidence, or image generation for product assets, route through `.agents/skills/g7-erp-design-guard/SKILL.md` before any generic design capability.

Generic design capabilities are subordinate and do not authorize business, financial, security, schema, API, permission-policy, workflow, implementation, or Git changes. Exact implementation authorization remains separate.

Return `TASK RESULT: HOLD` when Impeccable is requested without the design guard, G7 visual asset generation lacks explicit authorization, design tooling attempts to invent product or permission behavior, or a proposal silently becomes implementation.

### G7 Spec Kit Planning Wrapper

For G7 Spec Kit planning, route through `.agents/skills/g7-speckit-plan-guard/SKILL.md` before `speckit-plan`. `speckit-plan` does not independently authorize G7 planning.

Planning does not authorize task generation, implementation, protected-context updates, staging, commit, or push. Preserve the distinct lifecycle responsibilities of `speckit-specify`, `speckit-clarify`, `speckit-plan`, `speckit-checklist`, `speckit-tasks`, `speckit-analyze`, `speckit-implement`, `speckit-agent-context-update`, `speckit-taskstoissues`, `speckit-constitution`, and `speckit-converge`.

Return `TASK RESULT: HOLD` when the plan wrapper is unavailable, a lifecycle phase is used outside its declared scope, multiple write phases create ambiguous ownership, or planning is treated as implementation or Git approval.

## Universal Rules

1. Evidence over claims. No PASS without raw reproducible evidence.
2. Final report must start exactly with `TASK RESULT: PASS`, `TASK RESULT: PASS WITH WARN`, `TASK RESULT: HOLD`, or `TASK RESULT: FAIL`.
3. Do not say “done”, “completed”, or “success” unless supported by raw evidence.
4. Exactly one mode must be declared per task from the canonical list.
5. If MODE is missing, default to `READONLY_REVIEW` only if the action is entirely read-only.
6. If MODE is missing and the task's required actions exceed `READONLY_REVIEW` boundaries, return HOLD.
7. An explicitly supplied unknown mode causes HOLD. Two or more modes cause HOLD.
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

## Subagent Capacity and Independent Review Lifecycle

This section governs independent review without changing the task-mode, owner-approval, one-writer, or Git/SQL boundaries elsewhere in this protocol.

### A. Roles and authority

* **Main**: owns orchestration, synthesis, evidence, and the final report; it is not a substitute reviewer.
* **Worker**: performs bounded task work or investigation assigned by the main.
* **Reviewer**: independently inspects the exact completed diff and reports findings only.
* **Re-reviewer**: performs one bounded post-fix inspection of the exact final diff and reports findings only.
* **Writer**: is the sole agent authorized to modify the assigned change scope. The main may be the writer only when the task explicitly authorizes it.

### B. Worker budget

* The project default is a maximum of four concurrent workers. This is a task-value budget, not a Codex session maximum.
* Use zero workers for small deterministic work, one to two for narrow parallel investigation, and two to four only when independent work materially improves coverage or speed.
* More than four workers requires explicit owner approval. Preserve capacity for an independent reviewer and, when required, one bounded re-reviewer.

### C. One-writer rule

* Exactly one writer may modify a given change scope. Workers are read-only unless the task explicitly makes one worker the sole writer for a separate, non-overlapping scope.
* Reviewers and re-reviewers never write, fix, stage, commit, push, or apply database changes. Findings return to the writer for a separately authorized correction step.

### D. Worker-close lifecycle

The main must follow: `main -> spawn workers -> collect results -> synthesize -> explicitly close completed workers -> verify review capacity -> proceed to review`. Do not leave completed workers open while attempting a mandatory review.

### E. Mandatory lifecycle

For material source, test, SQL/migration, security, financial, or material governance work where the routed guard requires review, use this lifecycle:

`PLAN/AUTHORIZATION -> IMPLEMENT -> VALIDATE -> CLOSE WORKERS -> OPEN CODE REVIEW DELEGATION -> reviewer findings only -> CLOSE REVIEWER -> writer fixes -> validate -> ONE bounded re-review -> CLOSE re-reviewer -> controller review -> COMMIT_ONLY -> PUSH_ONLY`.

SQL remains separate: `controller review -> separately authorized DB apply -> independent DB verification`. A migration file, code review, commit, or push never authorizes database application.

### F. Open Code Review delegation contract

Use `OPEN CODE REVIEW DELEGATION MODE ONLY` for the delegated reviewer. The reviewer receives the exact scoped diff, is read-only, reports finding counts and findings only, and does not stage, commit, push, or apply anything. Do not use provider OCR, external endpoints, external models, external tokens, or `ocr llm test` for this delegation.

### G. Self-review boundary

Self-review may improve the writer's work, but self-review does not substitute for the independent review required by the applicable guard. Reports must state the actual review mechanism used; they must not relabel self-review as delegated review.

### H. Thread-limit failure

If dispatch fails with a capacity error such as `agent thread limit reached`, independent review is incomplete. Report the exact error, do not claim PASS or a completed review, do not substitute self-review, and do not commit, push, or apply database changes. Close completed threads, make at most the task-authorized retry, then return `TASK RESULT: HOLD`; the report body may describe the lifecycle as partial, incomplete, review pending, or controller decision required. Do not repeat retries.

### I. Capacity reservation

Keep active workers at or below four, close workers before dispatching the reviewer, close the reviewer before writer fixes and any re-review, and use no more than one re-reviewer. Do not create unnecessary concurrent threads.

### J. When agents are warranted

Agents are not mandatory for every task. Use them only when independent coverage is meaningful, the work saves time, and the authority boundary remains unambiguous. Small deterministic work may use zero workers, subject to any separately required independent review gate.

### K. Required reporting

Report the workers attempted, dispatched, collected, and closed; the actual review mechanism; reviewer success or failure; severity counts and findings; fixes and validation; re-review status; capacity state; and whether the lifecycle actually completed. Never claim a lifecycle step that did not occur.

## Strict Gates

### Plan Lock Gate
The approved plan locks: task ID, execution mode, authorized repository path, branch, starting HEAD, exact allowed files, exact purpose, exclusions, validation, expected file count, commit count, exact commit subjects, and expected final repository state. Any material deviation causes HOLD (`PLAN_LOCK_VIOLATION`). The agent must not replace the approved plan with a "better" plan, substitute files, change commit subjects/counts, add scripts, docs, tests, or database work, or treat its revised plan as owner-approved.

### Owner Approval Gate
Owner approval applies only to the exact presented plan. Silence is not approval. Earlier broad approval is not permission to widen the current task. A materially changed plan requires fresh approval. An agent cannot approve its own substitute plan.

### No Self-Widening Gate
The agent may not add any unapproved file, folder, helper script, temporary file, generated document, dependency, command with side effects, validation beyond safe checks, product task, docs cleanup, database action, Git action, or Graphify action. Required HOLD reason: `UNAPPROVED_SCOPE_EXPANSION`.

### Mass Change Gate
Fresh owner approval is required before any edit that would delete >100 lines from one file, remove >20% of a file's original lines, replace an entire file, remove >5 Markdown headings, collapse a multi-section document, reduce a document below minimum, rewrite via generated content, or materially change the purpose of a canonical document. Before such edit, stop with `MASS_CHANGE_APPROVAL_REQUIRED` and report: file path, original count, final count, additions, deletions, percentage changed, headings removed, unique info at risk, preservation map, and reason.

### Generated Content and Scratch Gate
Unless exact path and purpose are owner-approved, the agent must not create or use Python/PowerShell/shell scripts, generated Markdown replacements, temporary analysis files, intermediate transformed files, IDE brain/scratch artifacts, AppData/user-profile scratch files, or copied files used as replacement sources. Repository cleanliness is not proof of compliance if artifacts exist outside Git. Required HOLD reason: `EXTERNAL_OR_GENERATED_ARTIFACT_VIOLATION`.

### Report Truthfulness Gate
The first line of the final report must be exactly `TASK RESULT: PASS`, `TASK RESULT: PASS WITH WARN`, `TASK RESULT: HOLD`, or `TASK RESULT: FAIL`. PASS is forbidden when any requirement was skipped, plan changed, required file unread, validation missing, token/subject/file differs, or control violated. A requested success token must match exactly. Empty output must be shown as `<empty>`. Claims must be backed by raw evidence.

## Execution Modes

Exactly one mode must be declared per task. A task cannot transition to another mode during execution. Each follow-up stage requires a new task and explicit owner approval.

Canonical Mode List:
- READONLY_REVIEW
- PLAN_ONLY
- IMPLEMENT_NO_STAGE
- DOCS_ONLY
- REVIEW_ONLY
- COMMIT_ONLY
- PUSH_ONLY
- GRAPHIFY_REFRESH_ONLY
- SQL_DRAFT_ONLY
- SUPABASE_APPLY_ONLY
- MANUAL_SMOKE_ONLY
- GUARD_EDIT_ONLY

### PLAN_ONLY
Allowed: Read files, draft plan.
Forbidden: Code changes, staging, commit, push, DB writes.

### REVIEW_ONLY
Allowed: Read files, inspect diff.
Forbidden: Modifying files, staging, commit, push.

### GRAPHIFY_REFRESH_ONLY
Allowed: Refresh only explicitly approved repository path. Report path and HEAD used. Graphify is navigation evidence only.
Forbidden: Edits, staging, commit, push, checkout switch.

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
* Commit with the exact approved message.

Forbidden:

* Modifying files.
* `git add .` or broad staging.
* Push.
* Graphify.
* SQL/database writes.
* Supabase connection.
* Self-selected subject.

If no files are explicitly named in the task, return HOLD. Any mismatch in subject or files causes HOLD (`PRECOMMIT_SUBJECT_MISMATCH` or `PRECOMMIT_FILE_MISMATCH`).

Required evidence:

* Raw pre-commit status.
* Raw staged file list.
* Raw staged diff stat.
* Commit hash.
* Post-commit status.

### PUSH_ONLY

Allowed:

* Push explicitly approved existing commit(s).
* Verify exact approved outgoing commit, branch, and divergence.

Forbidden:

* Modifying files.
* Staging.
* Commit.
* Force push.
* Graphify.
* SQL/database writes.
* Supabase connection.
* Opening PR unless explicitly authorized.

Any unexpected outgoing commit causes HOLD.

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
