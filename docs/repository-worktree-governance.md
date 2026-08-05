# Repository Worktree Governance and Approval Gates

This document defines the authoritative rules for managing Git worktrees, local checkout paths, recovery assets, and implementation gates for the G7 BLUE CRM repository.

## 1. Canonical Development Path

### Canonical Path

The sole normal active development repository is:
`D:\G7\g7-crm`

The normal canonical branch is:
`main`

All normal future implementation, review, testing, commit, and push tasks must start from `D:\G7\g7-crm` unless Mozfer explicitly authorizes a recovery, forensic, or temporary-repository operation elsewhere.

### Transition Context

The owner-approved return to the canonical repository has been verified separately. Any recorded branch, HEAD, or `origin/main` alignment is transition evidence only. Future tasks must verify the current repository state and must not rely on a permanently frozen commit SHA.

### Temporary Recovery Worktrees

The following Grok checkouts are temporary recovery assets, not active development paths:

- `C:\Users\Mozfer\.grok\worktrees\g7-g7-crm\2026-08-04-v1-product-advancement-wave`
- `C:\Users\Mozfer\.grok\worktrees\g7-g7-crm\2026-07-13-360132e5`

They are read-only except for a specifically owner-authorized recovery or cleanup task. They must not receive new product implementation, normal review, testing, commit, or push work. They may be removed only after canonical local `main` is verified, remote `origin/main` is verified, recovery branches and the Git bundle are preserved, and no unique work remains.

### Historical and Rescue State

The rescue branch, integration branch, imported goal-return refs, Git bundle, and any explicitly retained forensic artifacts are intentionally preserved until separately approved. Historical standalone checkout state and recovery evidence are not normal development authority.

## 2. Source of Truth and Worktree Creation

- GitHub `origin/main` is the shared source of truth for committed work, while `D:\G7\g7-crm` on `main` is the canonical local development path.
- Every task must verify its exact repository path, branch, HEAD, divergence, working-tree status, staged paths, and untracked paths during preflight.
- Agents must not create branches or worktrees automatically.
- A branch or worktree may be created only when the active task explicitly authorizes its exact name, exact source commit, exact purpose, and cleanup or retention plan.
- No silent worktree creation, checkout switching, manual folder copying, or manual folder merging is permitted.
- Temporary worktrees cannot become permanent by accident.
- A current commit SHA may be recorded as evidence for a transition, but must not become a permanent path or branch gate.

---

## 3. Durable Plan-and-Owner-Approval Gate

Before executing any non-trivial task (which includes code edits, dependency changes, database migrations, commits, or pushes), the agent MUST present a bounded implementation plan containing the following:

1. **Task ID** and purpose.
2. **Authorized repository path** and branch.
3. **Verified starting HEAD** and working-tree state.
4. **Exact files** or systems in scope.
5. **Explicit exclusions**.
6. **Expected behavior** and acceptance criteria.
7. **Database/data/security impact** (migrations, schemas, RLS, Clerk).
8. **Validation plan** (tests to run, builds, linting).
9. **Commit and push plan** (commit subjects and target file groups).
10. **Expected final repository state** (clean index, specific HEAD).
11. **Worktree/branch lifecycle and cleanup plan** when applicable.

**Approval Rules:**

- No edit or modifying command may start until Mozfer explicitly approves the plan.
- Silence or an earlier broad request does not constitute permission to modify files outside the approved scope.
- Path changes, worktree creation, database work, commits, pushes, dependency changes, migrations, and financial mutations require explicit approval.
- Implementation, review, commit, push, Graphify refresh, reconciliation, and retirement are separate owner-approved tasks.
- No agent may silently create a worktree, silently switch checkouts, continue work in an unexpected path, or treat a temporary worktree as permanent without an approved decision.
- Task prompts cannot weaken or override these repository governance rules.

## 4. One-Time Cleanup Authorization Boundary

An explicitly owner-authorized cleanup task may, and only may:

1. Verify the canonical `D:\G7\g7-crm` repository, its local `main`, and remote `origin/main`.
2. Normalize only proven non-semantic residue in a specifically named temporary worktree.
3. Remove specifically named clean linked worktrees through normal, non-force Git worktree removal.
4. Preserve branches, refs, imported goal-return refs, bundles, logs, and forensic evidence unless deletion is separately authorized.

This is a bounded transition rule, not general cleanup authority. It does not authorize deleting a directory, branch, ref, bundle, log, commit, or recovery asset; changing `D:\G7\g7-crm`; using `git reset`, `git clean`, or force operations; or cleaning an unnamed path. Cleanup itself remains a separate task from this governance reconciliation.

## 5. Execution, Acceptance, and Safety Boundaries

- Canonical execution modes remain those defined by `.agents/skills/g7-crm-agent-control/SKILL.md`; exactly one mode must be declared per task.
- Implementation, review, staging, commit, and push remain separate authorizations. `COMMIT_ONLY` never authorizes push, and `PUSH_ONLY` never authorizes edits or a new commit.
- Mozfer retains exclusive manual/browser, visual, Arabic/RTL, mobile, and workflow acceptance authority. Automated checks must not be reported as owner acceptance.
- No force push, hard reset, or clean operation is permitted for recovery work.
- No SQL, migrations, dependency changes, production changes, Supabase action, or secrets/environment-file access is authorized by this document.
- The Expansion Master at `docs/product/G7_BLUE_Event_ERP_Future_Expansion_Master_Handover.md` remains the sole expansion-reference authority. This reconciliation activates no deferred product feature and does not replace product, ERP, security, migration, or Agent Control authority.
- Reports must use the repository verdict contract: `PASS`, `PASS WITH WARN`, `PARTIAL`, or `HOLD`, with claims supported by reproducible evidence.

## 6. Durable Policy and Reconciliation Rules

- Normal product work belongs in the canonical repository; exceptional recovery work must name its exact temporary context and purpose.
- Governance must describe durable path, ownership, authorization, and cleanup rules rather than freezing a transient branch name or commit SHA.
- Recovery evidence is preserved until the owner separately approves its disposition.
- Any future change to canonical path, branch, worktree ownership, or cleanup authority requires a new explicit governance task and owner approval.

**CRITICAL RULE:** Never copy or manually merge folders between repositories or worktrees.
