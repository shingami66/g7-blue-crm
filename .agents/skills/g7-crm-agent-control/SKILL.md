---
name: g7-crm-agent-control
description: Bounded execution guidance for G7 BLUE CRM agents. Preserves scope, secret, database, Git, deployment, and review safety without requiring a magic mode token for ordinary work.
---

# G7 CRM Agent Control Protocol

Luna is the Controller. A clear, bounded Owner request authorizes ordinary in-scope work. This skill preserves safety boundaries and evidence discipline; it does not replace the task's scope or require a procedural ceremony beyond what the task and risk require.

## Standing workflow rules

- Keep DEV and DEMO distinct. Do not present mock data, local-only checks, or a development server as live or production evidence.
- Follow the task's named repository, evidence-driven working boundary, systems, exclusions, and validation. For ordinary LOCAL or CONNECTED work, the boundary may cover the primary feature/domain/behavior, directly affected implementation, relevant tests, local types/contracts, and direct callers/consumers; do not widen it by inference.
- Browser or manual smoke is human-owned unless the task explicitly authorizes the agent to run it. Never claim human smoke evidence that was not provided.
- Never read, print, modify, or expose environment files, secrets, credentials, tokens, private logs, or connection strings.
- SQL, Supabase, migrations, RLS, RPCs, grants, triggers, schema changes, and database writes require explicit task authorization.
- Git staging, commits, pushes, checkout changes, and cleanup require explicit task authorization. Stage exact files only; never use broad staging.
- Use proportional validation: affected focused tests, typecheck, lint, and diff checks; add build, browser, or manual smoke when risk or the task requires it.
- Do not claim production readiness, security compliance, financial correctness, or equivalent outcomes without repository-verifiable evidence for that claim.

## Controller, Writer, and Reviewer

- Luna owns orchestration, validation, evidence, and the final verdict.
- A delegated Gemini Writer may inspect and modify directly affected files inside the task-authorized working boundary and owns a bounded local inner loop: inspect, edit, run focused tests/TypeScript/lint or other relevant local validation, diagnose ordinary failures, repair, and repeat until locally green. An additional directly affected local file inside that boundary is not by itself a HOLD or new Owner-approval condition. Ordinary failing tests, unexpected code structure, and directly affected local callers, tests, or types are implementation work inside that loop, not HOLD conditions by themselves. Exact-file allowlists remain binding when the task explicitly specifies them or when governance-sensitive, database/schema/RLS/RPC/migration, security, financial-authority, protected-infrastructure, or other materially high-risk work makes a broader envelope unsafe. The Writer is not the independent validator or final reviewer.
- Keep one logical Writer lane per mutation slice. Prefer the same provider conversation for context, but a same logical Writer does not require the same conversation ID. If continuation fails with a classified authentication, session, transport, or comparable environment failure, preserve successful work, avoid repeated discovery, ensure no prior mutating Writer remains active when checkable, and start one fresh bounded session with a Recovery Capsule. Never run two mutating Writers concurrently.
- Use a separate native Codex Reviewer in read-only, findings-only mode when the task or risk warrants independent review. The Reviewer never edits, stages, commits, pushes, applies SQL, or deploys.
- For OCR-assisted review, resolve rules in Alibaba Open Code Review delegation mode for the exact files under review. Do not configure an external OCR LLM provider or model.
- If review returns BLOCKING or MATERIAL findings within scope, send only those findings to the logical Writer lane, using the healthy conversation when available or a fresh Recovery Capsule when required; then Luna validates and the Reviewer rereviews. Ordinary bounded repair loops remain in the same Owner-authorized task.
- If required independent review capacity is unavailable, report review incomplete; do not relabel self-review as independent review.

## Writer inner loop and failure classification

- Writer-owned local validation is task-scoped and does not authorize Git staging/commit/push, branch mutation, deployment, production mutation, database or migration work, secrets/authentication changes, protected-file changes, or unrelated scope expansion.
- A Recovery Capsule carries the current task scope, repository state, exact remaining diagnostics, already-passing validation, relevant files/contracts, and protected boundaries. Do not discard successful edits when a provider session fails.
- Classify OAuth/login prompts, permission denials, timeouts, provider transport failures, expired conversations, and wrapper failures as environment/session failures unless evidence proves a model-capability issue. Classification precedes model escalation.
- `--dangerously-skip-permissions` is never a permanent default. It may be used only when explicitly authorized by the Owner for the affected bounded task.

## Scope and evidence

- The Controller owns routine discovery and supplies compact evidence capsules plus the task-specific delta. A mode label may describe a specialized operation, but ordinary bounded work does not require one. Routine prompts should not repeat standing repository law unless they add a special exception, address a material risk directly, or require a high-risk gate.
- Targeted official-source research is allowed inside an authorized engineering task when current framework, provider, API, security, compatibility, or version behavior materially affects correctness; research informs implementation but does not widen authority. For Next.js work, resolve the installed repository version and read the relevant bundled documentation before coding.
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

For implementation, review, or cleanup work, confirm the named repository and task-authorized working boundary, inspect the starting state, make only in-scope changes, and run the validation supported by the task and risk. Stop when a requested action would cross a protected or materially excluded boundary, expose protected data, mutate an unauthorized system, or genuinely expand scope. Exact-file allowlists remain binding for explicitly file-scoped or high-risk work.

## Genuine HOLD conditions

Return `TASK RESULT: HOLD` only for a real blocker such as:

- missing or contradictory authority, or an unresolved material Owner decision;
- a protected-file, destructive, database, deployment, production, or genuinely scope-expanding action that is outside the applicable task/authority boundary or requires a separate unresolved authority gate;
- required unavailable state with no safe bounded continuation;
- failed required validation after the authorized diagnose/repair loop, or missing evidence for a claim;
- unauthorized Git or package action;
- attempted protected-data access or secret exposure;
- unavailable required independent review when the task explicitly requires it;
- an execution failure that prevents the authorized workflow from completing.

Do not use HOLD merely because a routine task lacks an optional mode label, an optional navigation artifact, or a historical proof step that is not relevant to the current scope.
