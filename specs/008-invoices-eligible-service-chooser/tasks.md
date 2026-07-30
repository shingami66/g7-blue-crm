# Tasks: Invoices Eligible-Service Chooser

**Feature**: `008-invoices-eligible-service-chooser`  
**Status**: Planned

## Phase 0 — Planning And Approval

- [x] Record current runtime source truth for global Invoices flow, Service-scoped invoice authority, Deposit eligibility, Final eligibility, permissions, stale-state safety, and Feature 007 selector reuse.
- [x] Approve the product contract for one global `Create Invoice` CTA, first-step invoice-type chooser, type-specific eligible-Service selector, navigation-only route contract, and Service Detail scroll/focus behavior.
- [x] Create the Feature 008 Spec Kit packet and activate `.specify/feature.json` for this feature.
- [x] Complete the final independent Spec Kit planning review and confirm the packet is implementation-ready from a planning and authority-contract perspective.

## Phase 1 — Implementation

**Mode**: `IMPLEMENT_NO_STAGE`

- [ ] Add the shared eligible-Service query that derives Deposit and Final eligibility from existing invoice authority helpers without introducing a second rule engine.
- [ ] Add the global Invoices `Create Invoice` CTA and first-step invoice-type chooser.
- [ ] Add the type-specific eligible-Service selector UI and navigation-only deep-link contract.
- [ ] Add Service Detail query-parameter handling that scrolls to and focuses the relevant billing action.
- [ ] Add aligned English/Arabic dictionary copy and focused contract coverage.
- [ ] Run focused tests, lint, typecheck, build, diff/manifest/index checks, and leave all changes unstaged.

## Phase 2 — Focused Automated Validation

**Mode**: `IMPLEMENT_NO_STAGE`

- [ ] Run the focused eligible-selector contract coverage for Deposit and Final capability separation.
- [ ] Run the focused Service Detail arrival-intent coverage for encoded Service ID navigation and invalid `invoiceAction` handling.
- [ ] Verify the chooser remains navigation-only and does not invoke `createInvoiceAction` or `create_invoice_atomic`.
- [ ] Verify the chooser submits no customer ID, no requested amount, and no financial payload.
- [ ] Confirm `invoices:read` list behavior remains intact while global creation capability requires `invoices:write` and `services:read`.
- [ ] Confirm accessibility, mobile, Arabic RTL, bidi-safe dates, and dictionary alignment remain covered.

## Phase 3 — Independent Review

**Mode**: `REVIEW_ONLY`

- [ ] Review permission gates, Deposit/Final eligibility separation, navigation-only behavior, Service Detail focus behavior, accessibility, mobile, and RTL.
- [ ] Confirm no standalone Invoice flow, no customer selector, no financial payload, and no second mutation path.
- [ ] Confirm current Final Invoice eligibility remains unchanged.

## Phase 4 — Bounded Remediation

**Mode**: `IMPLEMENT_NO_STAGE`

- [ ] Remediate only the exact findings returned by the independent review.
- [ ] Keep the remediation bounded to the documented review findings and no additional scope.
- [ ] Revalidate only the touched assertions after remediation.

## Phase 5 — Revalidation After Remediation

**Mode**: `REVIEW_ONLY`

- [ ] Re-run the focused review assertions that changed during bounded remediation.
- [ ] Confirm the review findings are resolved without broadening scope.

## Phase 6 — Mozfer Manual Smoke

**Mode**: `MANUAL_SMOKE_ONLY`

- [ ] Verify the two-step chooser flow from the global Invoices page.
- [ ] Verify Deposit and Final selectors show only currently eligible Services.
- [ ] Verify empty, no-match, stale-selection, and permission-boundary behavior.
- [ ] Verify Service Detail scroll/focus behavior for `invoiceAction=deposit` and `invoiceAction=final`.
- [ ] Verify desktop/mobile and English/Arabic RTL rendering.

## Phase 7 — Documentation Evidence Sync

**Mode**: `DOCS_ONLY`

- [x] Sync canonical project documentation with the approved Feature 008 planning state after final independent planning review.
- [ ] Preserve the separation between planning, implementation, review, manual smoke, commit, and push.
- [ ] Keep all changes bounded to docs evidence and project-state records.

## Phase 8 — Controlled Commit

**Mode**: `COMMIT_ONLY`

- [ ] Receive explicit approved manifest and commit subject.
- [ ] Stage only the exact approved implementation files.
- [ ] Verify cached manifest/stat/check output.

## Phase 9 — Controlled Push

**Mode**: `PUSH_ONLY`

- [ ] Receive explicit outgoing-commit approval.
- [ ] Verify the exact outgoing commit set.
- [ ] Push without force and verify post-push repository state.
