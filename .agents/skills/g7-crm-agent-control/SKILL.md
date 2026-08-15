---
name: g7-crm-agent-control
description: Bounded execution guidance for G7 BLUE CRM agents. Preserves scope, secret, database, Git, deployment, and review safety without requiring a magic mode token for ordinary work.
---

# G7 CRM Agent Control Protocol

Luna is the Controller. A clear, bounded Owner request authorizes ordinary in-scope work. This skill preserves safety boundaries and evidence discipline; it does not replace the task's scope or require a procedural ceremony beyond what the task and risk require.

## Standing workflow rules

- Keep DEV and DEMO distinct. Do not present mock data, local-only checks, or a development server as live or production evidence.
- Follow the task's named repository, files, systems, exclusions, and validation. Do not widen scope by inference.
- Browser or manual smoke is human-owned unless the task explicitly authorizes the agent to run it. Never claim human smoke evidence that was not provided.
- Never read, print, modify, or expose environment files, secrets, credentials, tokens, private logs, or connection strings.
- SQL, Supabase, migrations, RLS, RPCs, grants, triggers, schema changes, and database writes require explicit task authorization.
- Git staging, commits, pushes, checkout changes, and cleanup require explicit task authorization. Stage exact files only; never use broad staging.
- Use proportional validation: affected focused tests, typecheck, lint, and diff checks; add build, browser, or manual smoke when risk or the task requires it.
- Do not claim production readiness, security compliance, financial correctness, or equivalent outcomes without repository-verifiable evidence for that claim.

## Controller, Writer, and Reviewer

- Luna owns orchestration, validation, evidence, and the final verdict.
- A delegated Gemini Writer is edit-only and may modify only the exact allowed files. The Writer must not run tests, lint, TypeScript, Git, shell commands, database commands, or deployment actions.
- If a Writer is used, keep one Writer per mutation slice. The Writer may be resumed for in-scope repairs; do not start a second Writer for the same slice.
- Use a separate native Codex Reviewer in read-only, findings-only mode when the task or risk warrants independent review. The Reviewer never edits, stages, commits, pushes, applies SQL, or deploys.
- For OCR-assisted review, resolve rules in Alibaba Open Code Review delegation mode for the exact files under review. Do not configure an external OCR LLM provider or model.
- If review returns BLOCKING or MATERIAL findings within scope, send only those findings to the same Writer, then Luna validates and the Reviewer rereviews. Ordinary bounded repair loops remain in the same Owner-authorized task.
- If required independent review capacity is unavailable, report review incomplete; do not relabel self-review as independent review.

## Scope and evidence

- The task prompt supplies the active scope. A mode label may describe a specialized operation, but ordinary bounded work does not require one.
- Guard/context files may be changed only when the task names the exact files and purpose. `GUARD_EDIT_ONLY` remains an optional compatibility label for a deliberately authorized guard-file edit, not a prerequisite for ordinary work.
- Do not silently switch repositories, clean unrelated dirty state, or alter inherited/protected files outside the named scope.
- Inspect actual status and diffs before and after edits. For untracked files, inspect their actual content before claiming correctness.
- Preserve the exact final report contract requested by the task. Start with `TASK RESULT: PASS`, `TASK RESULT: PASS WITH WARN`, `TASK RESULT: HOLD`, or `TASK RESULT: FAIL` when that contract applies.
- Empty command output is reported as `<empty>`. Claims must be supported by captured repository or validation evidence.

## Domain routing

- Use relevant G7 skills when their domain materially applies, including ERP guard, design, Spec Kit, Supabase, document, or review guidance.
- A planning or design aid does not authorize implementation, context updates, Git actions, database actions, deployment, or production changes.
- Keep product workflow and financial rules from `AGENTS.md` authoritative; do not invent business behavior in a tooling or governance task.

## Secret and environment discipline

- Treat `.env*`, credential files, tokens, API keys, connection strings, authentication material, private logs, shell history, browser profiles, and system transcripts as protected.
- Existence checks are allowed when necessary; contents are not.
- Never include protected values in output. If a secret is accidentally exposed, stop and report that rotation may be required without repeating it.

## Supabase, SQL, and migration discipline

- Read-only database inspection and database mutation are separate authorizations.
- Do not apply migrations, run write SQL, reset, seed, truncate, recreate, link, or start local database services unless the task explicitly authorizes the exact operation.
- Use the repository's supported mechanism and the exact authorized target when a database task is authorized. Do not fall back to another environment or repair migration history manually.
- For SQL/RPC/RLS/grant work, review current definitions, permissions, policies, rerun safety, partial-run behavior, and preservation of existing behavior when applicable.
- A migration review, code review, commit, or push never authorizes database application.

## Git and destructive-command discipline

- Never use `git add .`, wildcard staging, force-push, fetch, pull, reset, clean, or destructive file/database commands without explicit authorization for the exact operation.
- Do not stage or commit in an implementation task. In a commit task, verify the exact staged file list and subject before committing.
- Do not push, deploy, or open a PR unless explicitly authorized.
- Preserve unrelated dirty and untracked state. Do not revert, normalize, or clean it as part of a bounded task.

## Optional operation labels

Operation labels are available for tasks that benefit from a sharper boundary. They are descriptive and do not turn ordinary work into a multi-stage ceremony.

- `READONLY_REVIEW`: inspect and report only.
- `PLAN_ONLY`: draft a plan only.
- `IMPLEMENT_NO_STAGE`: edit named files and validate; no staging, commit, push, database write, or deployment.
- `DOCS_ONLY`: edit named documentation files only; no runtime, database, Git, or deployment mutation.
- `REVIEW_ONLY`: inspect exact scope and report findings only.
- `COMMIT_ONLY`: stage and commit only the exact authorized files and subject.
- `PUSH_ONLY`: push only the exact authorized existing commits after verifying branch and divergence.
- `SQL_DRAFT_ONLY`: draft SQL only; do not connect or apply it.
- `SUPABASE_APPLY_ONLY`: apply only the exact authorized database operation and run only its authorized verification.
- `MANUAL_SMOKE_ONLY`: run only the explicitly authorized smoke workflow; do not save real application data unless authorized.
- `GUARD_EDIT_ONLY`: edit only the explicitly authorized guard/context files; no runtime, database, Git, or deployment mutation.

## Minimum task boundaries

For implementation, review, or cleanup work, confirm the named repository and exact allowed files, inspect the starting state, make only in-scope changes, and run the validation supported by the task and risk. Stop when a requested action would widen scope, expose protected data, mutate an unauthorized system, or cross a separate Owner gate.

## Genuine HOLD conditions

Return `TASK RESULT: HOLD` only for a real blocker such as:

- scope conflict, protected-file mutation, or unexpected in-scope file change;
- failed required validation or missing evidence for a claim;
- unauthorized database, Git, deployment, production, or package action;
- attempted protected-data access or secret exposure;
- unavailable required independent review when the task explicitly requires it;
- an execution failure that prevents the authorized workflow from completing.

Do not use HOLD merely because a routine task lacks an optional mode label, an optional navigation artifact, or a historical proof step that is not relevant to the current scope.
