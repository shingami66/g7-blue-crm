# Tasks: Invoice PDF Customer Cleanup

**Feature**: `006-invoice-pdf-customer-cleanup`

**Status**: **Implementation, independent review, and owner acceptance complete; controlled commit/push pending**

Original unchecked task-history boxes below remain preserved for provenance; the completion-evidence section records the current implementation/review/acceptance state without rewriting that history.

## Phase 0 — Planning Packet

- [ ] Confirm Mozfer approval of the Feature 006 specification, retention contract, exclusions, and future implementation manifest.
- [ ] Confirm that no document-language, financial, VAT/ZATCA, Wizard, or broader Invoice change is bundled into implementation.

## Phase 1 — Implementation

**Task ID**: `G7-INVOICE-PDF-CUSTOMER-CLEANUP-IMPLEMENT-1`

**Mode**: `IMPLEMENT_NO_STAGE`

- [ ] Re-read the current Invoice PDF source and relevant print CSS.
- [ ] Create `src/lib/invoices/pdf-contract.test.ts` with removed-field and retained-field contracts.
- [ ] Remove rendered `item.details` without changing stored/mapped/snapshotted details.
- [ ] Remove rendered document notes and terms.
- [ ] Remove Prepared By, System Generated, and generated-document disclosure output.
- [ ] Confirm no employee, creator, account, username, or email identity is added.
- [ ] Preserve seller, buyer, Invoice identity, Deposit/Final behavior, Draft watermark, bank/payment information, stamp, and every authoritative financial value.
- [ ] Keep `vat_mode = not_registered` output as not applied.
- [ ] Change scoped print CSS only if proven necessary.
- [ ] Run the focused contract, affected tests, lint, typecheck, build, diff-check, and manifest checks.
- [ ] Leave all changes unstaged.

## Phase 2 — Independent Review

**Task ID**: `G7-INVOICE-PDF-CUSTOMER-CLEANUP-REVIEW-1`

**Mode**: `REVIEW_ONLY`

- [ ] Review only the approved implementation diff.
- [ ] Verify removed and retained fields against current source and snapshots.
- [ ] Verify no source-of-truth, snapshot, lifecycle, RPC, schema, ABS, Payment, VAT/ZATCA, or language behavior changed.
- [ ] Verify automated evidence and return PASS, PASS WITH WARN, or HOLD.
- [ ] Do not modify, stage, commit, or push.

## Phase 3 — Mozfer Manual Print Smoke

**Task ID**: `G7-INVOICE-PDF-CUSTOMER-CLEANUP-SMOKE-1`

**Mode**: `MANUAL_SMOKE_ONLY`

- [ ] Mozfer verifies normal Deposit output.
- [ ] Mozfer verifies Final output with prior Invoice/Deposit context.
- [ ] Mozfer verifies Draft watermark and status.
- [ ] Mozfer verifies a long multi-row A4 fixture.
- [ ] Mozfer confirms removed internal/system content is absent.
- [ ] Mozfer confirms retained values match the authoritative Invoice.
- [ ] Mozfer confirms no blank trailing page, clipped totals, broken rows, or fake page count.
- [ ] Record observations without modifying source.

## Phase 4 — Controlled Commit

**Task ID**: `G7-INVOICE-PDF-CUSTOMER-CLEANUP-COMMIT-1`

**Mode**: `COMMIT_ONLY`

- [ ] Receive explicit approval of the exact file manifest and commit subject.
- [ ] Stage only the approved exact paths.
- [ ] Verify the staged manifest, staged diff, and empty unstaged remainder as required.
- [ ] Create exactly one approved commit.
- [ ] Do not push.

## Phase 5 — Controlled Push

**Task ID**: `G7-INVOICE-PDF-CUSTOMER-CLEANUP-PUSH-1`

**Mode**: `PUSH_ONLY`

- [ ] Receive explicit approval of the exact outgoing commit.
- [ ] Verify branch, HEAD, `origin/main`, divergence, and outgoing commit.
- [ ] Push without force.
- [ ] Verify final alignment and cleanliness.

## Feature Completion Rule

Feature 006 implementation, independent review, and the supplied Mozfer short-example Print Preview acceptance are complete. Controlled commit, controlled push, and any additional long-fixture smoke remain separate boundaries; this DOCS_ONLY task does not claim them complete.

## Completion Evidence Recorded By Docs Sync

- [x] Implementation, independent review, and owner-approved short-example acceptance are recorded above without rewriting the original task history.
- [x] Automated evidence recorded: focused contract 12/12, Invoice actions 38/38, related Invoice suites 64/64, lint, typecheck, and build.
- [x] Accepted short examples recorded: `INV-2026-0021` Deposit and `INV-2026-0022` Final.
- [ ] Long multi-row Print Preview remains unverified in the supplied evidence.
- [ ] Controlled commit and controlled push remain pending separate tasks.
