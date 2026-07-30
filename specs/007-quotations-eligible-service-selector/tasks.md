# Tasks: Quotations Eligible-Service Selector

**Feature**: `007-quotations-eligible-service-selector`  
**Status**: Runtime implementation complete; independent review finding remediated; documentation sync pending

## Phase 0 — Planning And Approval

- [x] Record source truth, authority boundaries, eligibility contract, exclusions, and implementation manifest.
- [x] Activate Feature 007 planning without changing runtime source.
- [x] Receive separate approval for the exact runtime/test implementation task.

## Phase 1 — Implementation

**Mode**: `IMPLEMENT_NO_STAGE`

- [x] Modify only the locked six-file runtime/test manifest in `plan.md`.
- [x] Add the `services:read`-guarded non-deleted `Inquiry`/`Quoted` eligible-Service query.
- [x] Gate global Quotations selector data on `quotations:write` and `services:read`.
- [x] Add the read/navigation-only selector UI and its existing creation-route deep link.
- [x] Add aligned English/Arabic selector copy and focused contract coverage.
- [x] Run focused test, lint, typecheck, build, diff/manifest/index checks, and leave changes unstaged.

## Phase 2 — Independent Review

**Mode**: `REVIEW_ONLY`

- [x] Review authority, eligibility, permissions, accessibility, RTL/mobile behavior, and focused test evidence.
- [x] Confirm no standalone Quotation, customer input, financial authority, or second mutation path.
- [x] Record the initial `HOLD` finding for mutable focus return, then the remediation and revalidation PASS/PASS WITH WARN sequence.

## Phase 3 — Mozfer Manual Smoke

**Mode**: `MANUAL_SMOKE_ONLY`

- [x] Mozfer verifies desktop/mobile, English/Arabic RTL, and selector navigation evidence.
- [ ] No eligible Services / no-match / permission-denied / stale-selection browser states were not individually evidenced and remain unclaimed.

## Phase 4 — Controlled Commit

**Mode**: `COMMIT_ONLY`

- [ ] Receive explicit approved manifest and subject; stage only exact approved files; do not push.

## Phase 5 — Controlled Push

**Mode**: `PUSH_ONLY`

- [ ] Receive explicit outgoing-commit approval; verify and push without force.
