# Tasks: Invoices Eligible-Service Chooser

**Feature**: `008-invoices-eligible-service-chooser`  
**Status**: Delivered

## Phase 0 — Planning And Approval

- [x] Record current runtime source truth for global Invoices flow, Service-scoped invoice authority, Deposit eligibility, Final eligibility, permissions, stale-state safety, and Feature 007 selector reuse.
- [x] Approve the product contract for one global `Create Invoice` CTA, first-step invoice-type chooser, type-specific eligible-Service selector, navigation-only route contract, and Service Billing Workspace architecture.
- [x] Create the Feature 008 Spec Kit packet and activate `.specify/feature.json` for this feature.
- [x] Complete the final independent Spec Kit planning review and confirm the packet is implementation-ready from a planning and authority-contract perspective.

## Phase 1 — Implementation

**Mode**: `IMPLEMENT_NO_STAGE`

- [x] Add the shared eligible-Service query that derives Deposit and Final eligibility from existing invoice authority helpers without introducing a second rule engine.
- [x] Add the global Invoices `Create Invoice` CTA and first-step invoice-type chooser.
- [x] Add the type-specific eligible-Service selector UI and navigation-only deep-link contract to the dedicated Service Billing Workspace (`/services/[id]/billing?intent=deposit|final`).
- [x] Add dedicated Service Billing Workspace route, context header, summary cards, action reuse, and read-only Cost & Margin analytics.
- [x] Add compact `ServiceBillingSummaryCard` to general Service Detail page and backward-compatibility redirect for legacy `invoiceAction` links.
- [x] Add aligned English/Arabic dictionary copy and focused contract coverage.
- [x] Run focused tests, lint, typecheck, build, diff/manifest/index checks, and leave all changes unstaged.

## Phase 2 — Focused Automated Validation

**Mode**: `IMPLEMENT_NO_STAGE`

- [x] Run the focused eligible-selector contract coverage for Deposit and Final capability separation.
- [x] Run the focused Service Detail arrival-intent coverage for encoded Service ID navigation and invalid `intent` handling.
- [x] Verify the chooser remains navigation-only and does not invoke `createInvoiceAction` or `create_invoice_atomic`.
- [x] Verify the chooser submits no customer ID, no requested amount, and no financial payload.
- [x] Confirm `invoices:read` list behavior remains intact while global creation capability requires `invoices:write` and `services:read`.
- [x] Confirm accessibility, mobile, Arabic RTL, bidi-safe dates, and dictionary alignment remain covered.

## Phase 3 — Independent Review

**Mode**: `REVIEW_ONLY`

- [x] Review permission gates, Deposit/Final eligibility separation, navigation-only behavior, Service Billing Workspace behavior, accessibility, mobile, and RTL.
- [x] Confirm no standalone Invoice flow, no customer selector, no financial payload, and no second mutation path.
- [x] Confirm current Final Invoice eligibility remains unchanged.

## Phase 4 — Bounded Remediation

**Mode**: `IMPLEMENT_NO_STAGE`

- [x] Remediate only the exact findings returned by the independent review (header identity block alignment, mode-aligned authority references, complete hiding of unavailable cost section).
- [x] Keep the remediation bounded to the documented review findings and no additional scope.
- [x] Revalidate only the touched assertions after remediation.

## Phase 5 — Revalidation After Remediation

**Mode**: `REVIEW_ONLY`

- [x] Re-run the focused review assertions that changed during bounded remediation (26/26 selector tests, 13/13 invoice tests, 9/9 unit tests, tsc, lint, build).
- [x] Confirm the review findings are resolved without broadening scope.

## Phase 6 — Mozfer Manual Smoke

**Mode**: `MANUAL_SMOKE_ONLY`

- [x] Verify the two-step chooser flow from the global Invoices page.
- [x] Verify Deposit and Final selectors show only currently eligible Services.
- [x] Verify empty, no-match, stale-selection, and permission-boundary behavior.
- [x] Verify Service Billing Workspace primary action focus for `intent=deposit` and `intent=final`.
- [x] Verify desktop/mobile (~390px) and English/Arabic RTL rendering (`FEATURE-008-MANUAL-VISUAL-SMOKE-PASS`).

## Phase 7 — Documentation Evidence Sync

**Mode**: `DOCS_ONLY`

- [x] Sync canonical project documentation with the approved Service Billing Workspace architecture (`spec.md`, `plan.md`, `tasks.md`, `requirements.md`, `project-status.md`, `project-roadmap.md`).
- [x] Record automated test results (26/26 selector tests, 13/13 invoice tests, 9/9 unit tests, tsc, lint, build, diff-check) and Mozfer manual visual smoke PASS.
- [x] Preserve the separation between planning, implementation, review, manual smoke, commit, and push.

## Phase 8 — Controlled Commit

**Mode**: `COMMIT_ONLY`

- [x] Receive explicit approved manifest and commit subjects.
- [x] Create exact three local runtime commits: `67dea92`, `0e43803`, `2197c36`.
- [x] Verify commit manifests, attribution (`shingami66`), and divergence (`0 3`).
- [x] Create final Feature 008 delivery commit (`e9414227b9825cc301906c5052e2700f1f110e96`).

## Phase 9 — Controlled Push

**Mode**: `PUSH_ONLY`

- [x] Receive explicit outgoing-commit approval.
- [x] Verify the exact outgoing commit set.
- [x] Push without force to `origin/main` delivering commits through `e9414227b9825cc301906c5052e2700f1f110e96` under token `G7-FEATURE-008-CONTROLLED-PUSH-1-PASS`.
- [x] Verify post-push remote synchronization was verified at commit `e9414227b9825cc301906c5052e2700f1f110e96`, divergence at that point was verified at `0 0`, and working tree was clean.

## Phase 10 — Administrative Closeout

- [x] Update documentation with durable closeout wording recording the historical post-push verification. This is an administrative update only, does not change the Feature 008 runtime scope, and does not reopen delivery gates. A later administrative documentation commit may advance `main` beyond `e9414227b9825cc301906c5052e2700f1f110e96`, but does not alter the Feature 008 delivered-through commit.
