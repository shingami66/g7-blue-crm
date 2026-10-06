---
name: g7-crm-agent-control
description: Bounded execution guidance for G7 BLUE CRM agents. Preserves scope, secret, database, Git, deployment, and review safety without requiring a magic mode token for ordinary work.
---

# G7 CRM Agent Control Protocol

The Controller owns the workflow. A clear, bounded Owner request authorizes ordinary in-scope work. This skill preserves safety boundaries and evidence discipline; it does not replace the task's scope or require a procedural ceremony beyond what the task and risk require.

## Standing workflow rules

- Keep DEV and DEMO distinct. Do not present mock data, local-only checks, or a development server as live or production evidence.
- Follow the task's named repository, evidence-driven working boundary, systems, exclusions, and validation. For ordinary LOCAL or CONNECTED work, the boundary may cover the primary feature/domain/behavior, directly affected implementation, relevant tests, local types/contracts, and direct callers/consumers; do not widen it by inference.
- Browser or manual smoke is human-owned unless the task explicitly authorizes the agent to run it. Never claim human smoke evidence that was not provided.
- Never read, print, modify, or expose environment files, secrets, credentials, tokens, private logs, or connection strings.
- SQL, Supabase, migrations, RLS, RPCs, grants, triggers, schema changes, and database writes require explicit task authorization.
- Separate the Writer inner loop from publication. No staging, commit, or push occurs in the Writer inner loop. For an already-authorized bounded G7 task that completes required validation, receives a CLEAN independent review, passes the Controller publication gate, has an isolated exact task diff, and still targets the expected remote main, G7-OD-12/G7-OD-27 provide standing authority for exact staging, one bounded task-scoped commit, a remote race check, a normal fast-forward push to origin/main, and remote verification. This ordinary qualifying path needs no additional Owner commit/push confirmation. All other Git mutations retain their applicable explicit authorization; stage exact files only and never use broad staging. Checkout changes and cleanup remain separately authorized.
- Use proportional validation: affected focused tests, typecheck, lint, and diff checks; add build, browser, or manual smoke when risk or the task requires it.
- Do not claim production readiness, security compliance, financial correctness, or equivalent outcomes without repository-verifiable evidence for that claim.

## Controller, Writer, and Reviewer

- The Controller owns the complete autonomous workflow and final verdict: one Writer inner loop for bounded implementation and validation → exactly one fresh native read-only/findings-only Reviewer under G7-OD-26 using Open Code Review delegation → same-Writer repair and revalidation, followed by one fresh targeted rereview when repair is required → Controller independent final validation/publication gate → exact staging, one bounded task-scoped commit, remote race check, normal fast-forward push, remote verification, and the smallest required status/documentation sync when the standing G7 criteria are satisfied → final Task Verdict. Do not use the Owner as an ordinary relay; return to the Owner only for a genuine decision or authority need, protected credentials/material, a gated database/deployment/destructive authority, unavailable independent-review capacity, a material finding not safely resolvable inside the boundary, or the final Task Verdict. Ordinary qualifying publication requires no additional Owner commit/push confirmation.
- The delegated Writer (or the current coding harness Writer) may inspect and modify directly affected files inside the task-authorized working boundary and owns a bounded local inner loop: inspect, edit, run focused tests/TypeScript/lint or other relevant local validation, diagnose ordinary failures, repair, and repeat until locally green. An additional directly affected local file inside that boundary is not by itself a HOLD or new Owner-approval condition. Ordinary failing tests, unexpected code structure, and directly affected local callers, tests, or types are implementation work inside that loop, not HOLD conditions by themselves. Exact-file allowlists remain binding when the task explicitly specifies them or when governance-sensitive, database/schema/RLS/RPC/migration, security, financial-authority, protected-infrastructure, or other materially high-risk work makes a broader envelope unsafe. No staging, commit, or push occurs in the Writer inner loop; the Controller evaluates a separate publication gate after review. The Writer is not the independent validator or final reviewer.
- Keep exactly one logical mutating Writer lane per mutation slice. The same logical Writer receives review findings; prefer the same provider conversation, but start a fresh bounded conversation with a Recovery Capsule only after a classified authentication, session, transport, or comparable environment failure. Preserve successful work, avoid repeated discovery, ensure no prior mutating Writer remains active when checkable, and never run mutating Writers concurrently.
- After a mutating Writer completes implementation and validation, use a fresh independent native Reviewer in the current coding harness in read-only, findings-only mode. The Writer is never the independent Reviewer. The Reviewer never edits, stages, commits, pushes, deploys, applies SQL, or repairs. Reviewer independence is based on: separate context/session, read-only/findings-only authority, no mutation authority, no repair execution, and substantive inspection of repository diff, source, and tests. Provider diversity is not required: Codex uses a fresh native Codex Reviewer; Antigravity uses a fresh native Antigravity Reviewer (such as a subagent or separate read-only context). The Controller owns the final verdict after the review or targeted rereview.
- For Open Code Review-assisted independent review, use delegation mode only: the fresh native Reviewer runs `ocr delegate preview --format json`, then `ocr delegate rule --format json <exact-reviewable-files>`. OCR supplies deterministic scope and rules; the Reviewer independently reasons over the complete task diff, relevant surrounding source, contracts, tests, and resolved rules, and marks each selected file REVIEWED or explicitly SKIPPED. The Reviewer remains read-only and findings-only and reports BLOCKING, MATERIAL, MINOR, or explicit CLEAN. Do not run `ocr review` or `ocr llm test`, configure OCR providers/models, or request credentials. A missing OCR LLM endpoint is irrelevant and not a HOLD; in delegation mode HOLD only when deterministic delegation is unavailable or required evidence is inaccessible.
- The independent Reviewer reports BLOCKING, MATERIAL, MINOR, or explicit CLEAN. For a finding, terminate/close the current Reviewer before repair; send in-scope BLOCKING or MATERIAL findings, plus cheap safe MINOR findings, to the same logical Writer lane. The Writer repairs and validates, then exactly one fresh targeted OCR-assisted Reviewer rereviews the repaired files, findings, direct contracts, and collateral; do not replace that with a broad historical review absent new evidence. Ordinary bounded repair loops remain in the same Owner-authorized task.
- If required independent review capacity is unavailable in the current coding harness, report review incomplete (HOLD); do not relabel self-review as independent review and do not fake independence.

## Writer inner loop and failure classification

- Writer-owned local validation is the implementation inner loop and never includes Git staging, commit, or push; it also does not authorize branch mutation, deployment, production mutation, database or migration work, secrets/authentication changes, protected-file changes, or unrelated scope expansion. After implementation and required validation are complete, the fresh independent review is CLEAN, and the Controller gate finds no unresolved BLOCKING or MATERIAL issue, qualifying bounded G7 work may enter the separate standing-publication phase under G7-OD-12/G7-OD-27.
- A Recovery Capsule carries the current task scope, repository state, exact remaining diagnostics, already-passing validation, relevant files/contracts, and protected boundaries. Do not discard successful edits when a provider session fails.
- Classify OAuth/login prompts, permission denials, timeouts, provider transport failures, expired conversations, and wrapper failures as authentication, session, transport, or environment failures unless evidence proves a model-capability issue. Classification precedes model escalation and is the only basis for a fresh Writer conversation.
- After findings, the same logical Writer repairs only the classified in-scope items, revalidates the affected behavior, and returns the evidence to the separate Reviewer. Do not substitute a broad historical rescan for targeted rereview absent new evidence.
- `--dangerously-skip-permissions` is never a permanent default. It may be used only when explicitly authorized by the Owner for the affected bounded task.

## Scope and evidence

- The Controller owns routine discovery and supplies compact evidence capsules plus the task-specific delta. A mode label may describe a specialized operation, but ordinary bounded work does not require one. Routine prompts should not repeat standing repository law unless they add a special exception, address a material risk directly, or require a high-risk gate.
- Targeted official-source research is allowed inside an authorized engineering task when current framework, provider, API, security, compatibility, or version behavior materially affects correctness; research informs implementation but does not widen authority. For Next.js work, resolve the installed repository version and read the relevant bundled documentation before coding.
- Guard/context files may be changed only when the task names the exact files and purpose. `GUARD_EDIT_ONLY` remains an optional compatibility label for a deliberately authorized guard-file edit, not a prerequisite for ordinary work.
- Do not silently switch repositories, clean unrelated dirty state, or alter inherited/protected files outside the named scope.
- Inspect actual status and diffs before and after edits. For untracked files, inspect their actual content before claiming correctness.
- Do not create arbitrary persistent artifacts. Keep only authorized product or regression assets and temporary diagnostics with explicit retained engineering value; remove disposable temporary artifacts at task closeout when authorized.
- Preserve the exact final report contract requested by the task. Where a Task Verdict applies, use exactly PASS, PASS WITH WARN, PARTIAL, HOLD, or FAIL; reports using the existing `TASK RESULT:` prefix retain the same vocabulary. PASS WITH WARN applies only when there are no BLOCKING or MATERIAL findings, validation and review are clean, and only bounded non-defect runtime unknowns (for example credential-dependent authentication) remain. PARTIAL is an explicitly scoped incomplete outcome: some authorized work remains unresolved, but no genuine HOLD or FAIL condition is present; identify the unresolved scope and do not imply full completion. WARN alone is not a verdict, and optional runtime evidence does not justify HOLD.
- End reports with `EXACT NEXT ACTION`; write `None` when no action remains.
- Empty command output is reported as `<empty>`. Claims must be supported by captured repository or validation evidence.

## Domain routing

- Skills in `.agents/skills/` form a single canonical, harness-neutral skill set. Never duplicate skills across coding harnesses or create provider-specific variants.
- The active coding harness reads `AGENTS.md`, inspects available skills, and routes strictly to materially relevant skills for the task domain (e.g. Next.js engineering for UI, Supabase for data, ERP guard for business boundaries). Uninvolved optional skills are not loaded and never block the task.
- Use Agent Control as the base protocol. Route to relevant G7 skills only when their material domain applies, including ERP guard, design, Spec Kit, Supabase, document, or review guidance; an uninvolved optional skill never blocks the task.
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
- During the Writer inner loop, do not stage, commit, or push. In the separate publication phase, G7-OD-12 and G7-OD-27 authorize qualifying already-authorized bounded G7 tasks to stage only exact task-owned files, create one bounded task-scoped commit, check that remote `main` has not moved, push normally as a fast-forward to `origin/main`, and verify local/remote parity; this ordinary successful path needs no additional Owner confirmation.
- Publication qualifies only after implementation is complete, required validation passes, the required independent review is CLEAN, the Controller gate finds no unresolved BLOCKING or MATERIAL issue, scope is isolated with no unrelated staged/worktree mutation, expected remote `main` is unchanged, the push is a normal fast-forward, and no excluded authority is needed.
- Stop publication for unexpected remote movement, non-fast-forward or merge/rebase/history-rewrite requirements, force push, destructive Git recovery, unresolved BLOCKING or MATERIAL findings, failed required validation, scope contamination, authority ambiguity, task-scope widening, or any separately gated database/schema/RLS/RPC/grant/business-data mutation, migration apply, DEMO/PROD mutation, deployment/activation, or protected authentication operation. A rejected fast-forward push is a stop condition; do not pull, rebase, reset, or force-push to continue.
- Outside this qualifying standing-publication path, obtain the applicable explicit Git authorization before staging, committing, or pushing. Deployment, production mutation, and opening a PR remain separately gated; never infer their authority from publication.
- Preserve unrelated dirty and untracked state. Do not revert, normalize, or clean it as part of a bounded task.

## Optional operation labels

Operation labels are opt-in scope refinements for deliberately separated or restricted tasks. They can exclude operations when the task explicitly selects them, but ordinary bounded G7 work needs no label and qualifying publication follows the standing G7 gate unless the task explicitly excludes publication.

- `READONLY_REVIEW`: inspect and report only.
- `PLAN_ONLY`: draft a plan only.
- `IMPLEMENT_NO_STAGE`: edit named files and validate in the Writer inner loop, which has no staging, commit, or push; database write and deployment remain excluded. When this label is explicitly selected as a task-wide no-publication boundary, do not stage, commit, or push; otherwise qualifying G7 publication remains a separate Controller-gated phase.
- `DOCS_ONLY`: edit named documentation files only; no runtime, database, or deployment mutation. For qualifying G7 tasks, Git publication remains a separate Controller-gated phase unless the task explicitly excludes it.
- `REVIEW_ONLY`: inspect exact scope and report findings only.
- `COMMIT_ONLY`: stage and commit only the exact authorized files and subject.
- `PUSH_ONLY`: push only the exact authorized existing commits after verifying branch and divergence.
- `SQL_DRAFT_ONLY`: draft SQL only; do not connect or apply it.
- `SUPABASE_APPLY_ONLY`: apply only the exact authorized database operation and run only its authorized verification.
- `MANUAL_SMOKE_ONLY`: run only the explicitly authorized smoke workflow; do not save real application data unless authorized.
- `GUARD_EDIT_ONLY`: edit only the explicitly authorized guard/context files; no runtime, database, or deployment mutation. For qualifying G7 tasks, Git publication remains a separate Controller-gated phase unless the task explicitly excludes it.

## Minimum task boundaries

For implementation, review, or cleanup work, confirm the named repository and task-authorized working boundary, inspect the starting state, make only in-scope changes, and run the validation supported by the task and risk. Stop when a requested action would cross a protected or materially excluded boundary, expose protected data, mutate an unauthorized system, or genuinely expand scope. Exact-file allowlists remain binding for explicitly file-scoped or high-risk work.

## Genuine HOLD conditions

Return `TASK RESULT: HOLD` only for a real blocker such as:

- missing or contradictory authority, or an unresolved material Owner decision;
- a protected-file, destructive, database, deployment, production, or genuinely scope-expanding action that is outside the applicable task/authority boundary or requires a separate unresolved authority gate;
- required unavailable state with no safe bounded continuation;
- failed required validation after the authorized diagnose/repair loop, or missing evidence for a claim;
- Git or package action outside the applicable explicit authorization or qualifying G7 standing-publication path;
- attempted protected-data access or secret exposure;
- unavailable required independent-review capacity;
- an execution failure that prevents the authorized workflow from completing.

Do not use HOLD merely because a routine task lacks an optional mode label, an optional navigation artifact, optional runtime evidence (including credential-dependent authentication), or a historical proof step that is not relevant to the current scope. In OCR delegation mode, a missing LLM endpoint is not a HOLD; only deterministic delegation unavailability or inaccessible required review evidence is. PARTIAL must not replace HOLD for blocked authority, unavailable required independent review, failed required validation, inaccessible required evidence, protected-data or secret issues, or execution failure.
