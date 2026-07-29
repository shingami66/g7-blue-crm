# Tasks: Quotations Eligible-Service Selector

**Feature**: `007-quotations-eligible-service-selector`  
**Status**: Active planning packet; no runtime implementation completed

## Phase 0 — Planning And Approval

- [x] Record source truth, authority boundaries, eligibility contract, exclusions, and implementation manifest.
- [x] Activate Feature 007 planning without changing runtime source.
- [ ] Receive separate approval for the exact runtime/test implementation task.

## Phase 1 — Implementation

**Mode**: `IMPLEMENT_NO_STAGE`

- [ ] Modify only the locked six-file runtime/test manifest in `plan.md`.
- [ ] Add the `services:read`-guarded non-deleted `Inquiry`/`Quoted` eligible-Service query.
- [ ] Gate global Quotations selector data on `quotations:write` and `services:read`.
- [ ] Add the read/navigation-only selector UI and its existing creation-route deep link.
- [ ] Add aligned English/Arabic selector copy and focused contract coverage.
- [ ] Run focused test, lint, typecheck, build, diff/manifest/index checks, and leave changes unstaged.

## Phase 2 — Independent Review

**Mode**: `REVIEW_ONLY`

- [ ] Review authority, eligibility, permissions, accessibility, RTL/mobile behavior, and focused test evidence.
- [ ] Confirm no standalone Quotation, customer input, financial authority, or second mutation path.

## Phase 3 — Mozfer Manual Smoke

**Mode**: `MANUAL_SMOKE_ONLY`

- [ ] Mozfer verifies desktop/mobile, English/Arabic RTL, empty/no-match, permission, stale selection, and Service Detail parity.

## Phase 4 — Controlled Commit

**Mode**: `COMMIT_ONLY`

- [ ] Receive explicit approved manifest and subject; stage only exact approved files; do not push.

## Phase 5 — Controlled Push

**Mode**: `PUSH_ONLY`

- [ ] Receive explicit outgoing-commit approval; verify and push without force.
