# Repository Worktree Governance and Approval Gates

This document defines the authoritative rules for managing Git worktrees, local checkout paths, and implementation gates for the G7 BLUE CRM repository.

## 1. Local Checkout and Worktree Situation

### Historical Origin
The original stable local checkout of the G7 CRM repository was located at:
`D:/G7/g7-crm`

### Current Operational Fact
To isolate development, an isolated Git worktree was created at:
`C:/Users/Mozfer/.grok/worktrees/g7-g7-crm/2026-07-13-360132e5`

The latest development and integration work has been carried out inside this worktree. All completed features and bug fixes have been committed and pushed to the GitHub repository's `main` branch from this path.

**Current Active/Authorized Checkout:**
- `C:/Users/Mozfer/.grok/worktrees/g7-g7-crm/2026-07-13-360132e5` (This remains the only authorized local workspace path for active execution).

**Forbidden Old Checkout:**
- `D:/G7/g7-crm` (This checkout is historical and must remain untouched. No command execution, staging, commits, pulls, resets, or edits are permitted inside this directory during active tasks).

### Source-of-Truth Rule
- GitHub `origin/main` is the shared repository source of truth for committed work.
- Only one authorized active checkout may exist at a time.
- Every task must verify its path in preflight and postflight logs.
- No silent worktree creation.
- No silent checkout switching.
- No manual folder copying or merging between paths.
- Temporary worktrees require explicit: purpose, owner, branch, creation approval, exit plan, reconciliation plan, and retirement plan.
- Temporary worktrees cannot become permanent by accident.
- No task prompt may override these rules.

---

## 2. Future Reconciliation Sequence

Reconciliation of the old checkout is a separate, future task and is not executed. When authorized, the reconciliation sequence must proceed as follows:

1. **Read-Only Audit**: Conduct a read-only audit of the old checkout `D:/G7/g7-crm`. Check branch, HEAD, origin/main, working-tree changes, untracked files, unique commits, remotes, and worktree registration.
2. **Decision Gate**: If the old checkout contains unique commits or local changes, stop and request Mozfer’s decision.
3. **Synchronize**: If the old checkout is clean and has no unique local work, it may be fast-forwarded from `origin/main` under explicit approval.
4. **Compare & Verify**: Compare canonical docs and relevant source code between paths. Run bounded validation tests from the synchronized permanent checkout.
5. **Approval & Handoff**: Mozfer must approve the final switch. Only after successful verification may `D:/G7/g7-crm` be redesignated as the primary stable checkout.
6. **Retirement**: The temporary Grok worktree may only be retired through a separate approved, Git-aware cleanup task.

**CRITICAL RULE:** Never copy or manually merge folders between the two paths.

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
