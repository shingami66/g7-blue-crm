# G7 BLUE CRM - Roadmap & Execution Plan

## 1. Workflow Rule
**Plan -> Implement -> Build -> Manual Test -> Audit -> Commit -> Push -> PR -> Merge**

After every successful merge:
- update `docs/project-status.md`
- update `docs/project-roadmap.md`
- update `docs/deferred-decisions.md` when decisions are added, resolved, or deferred
- mark completed checklist items
- add branch/commit/PR notes
- update "Current Active Phase"

## Final Approved ERP Decisions

These decisions are locked for G7 BLUE CRM planning and must stay aligned across project docs:

- The core operational entity is **Service / Booking**, not Project. Legacy `projects` may remain historically, but new ERP work must follow Service.
- The locked workflow is **Customer Profile -> Service -> Quotation -> Invoice -> Payment**.
- Quotations are Service-scoped. No standalone quotations are allowed.
- `customer_id` on quotations, if retained for reporting/query convenience, must be derived server-side from the Service.
- One Service can have multiple Quotations. Do not add `UNIQUE(service_id)` to quotations.
- Quotation approval requires `quotations:approve`, separate from `quotations:write`.
- Non-draft quotations must not be fully editable through ordinary `quotations:write`.
- Approved quotations must not be soft-deleted through ordinary `quotations:write`.
- Invoices are siblings under Service / Booking and Approved Quotation.
- No `parent_invoice_id`, `deposit_invoice_id`, `related_invoice_id`, or invoice-to-invoice FK in MVP.
- Deposit Invoice is an advance/prepayment invoice, not a discount.
- Deposit amount must be > 0 and <= approved quotation total, allowing 100% advance.
- One active deposit invoice per service in the current MVP.
- Deposit creation guard must be based on `service_id`, not `quotation_id` only.
- Newly created deposit invoices use status = `draft` unless a real send action exists.
- Service must not be cancelled before creating a deposit invoice.
- Final Invoice must represent remaining uninvoiced balance, not the full quotation total again.
- Final invoice calculation: `final_invoice_amount = approved_quotation_total - SUM(active prior deposit/progress invoices)`.
- Payments are separate from invoices.
- Multiple payments against one invoice do not create multiple invoices.
- Payments affect collected/uncollected balance, not invoiced/uninvoiced balance.
- Active invoice definition: `status NOT IN ('voided','cancelled') AND voided_at IS NULL` plus `is_deleted = false` only if the column exists.
- TypeScript currently includes status 'voided', but the current DB CHECK may not allow 'voided'. This is a tracked schema/lifecycle gap, not permission to write status='voided'.
- Every invoice created must persist full historical snapshot fields at issue time, even if DB columns are nullable. Snapshot population must not be deferred.
- `document_label` must be derived from `vat_mode` at issue time.
- While `vat_mode = not_registered`, documents must remain Commercial Invoice / Proforma / Receipt only.
- No Tax Invoice, VAT 15%, VAT number, ZATCA XML, QR, or FATOORA behavior while `vat_mode = not_registered`.
- Financial records must use void/cancel/reversal workflows rather than hard deletion. Use soft delete for business records where applicable.

## 1.1 Event ERP Expansion Program — Future Controlled Program

The Event ERP expansion is an approved strategic direction, not an active implementation feature. Current delivery continues in parallel, and no implementation sequence is final until field evidence is incorporated.

Required pre-implementation gates:

1. Product rebaseline.
2. Field discovery.
3. Domain map approval.
4. Accounting blueprint review by a qualified accountant.
5. Permission matrix approval.
6. Information architecture and reusable design-system approval.
7. Explicit phased implementation approval for one bounded feature.

The sole strategic expansion reference is `docs/product/G7_BLUE_Event_ERP_Future_Expansion_Master_Handover.md`. Earlier expansion documents remain historical evidence only.

Feature 009 remains inactive. Future accounting, procurement, expenses, supplier finance, costing, margin, VAT/ZATCA, AI, multi-company, and multi-tenant work remains discovery or deferred work until the gates above pass.

## 1.2 Current Review and Remediation Roadmap

### Completed foundations / review

- OCR discovery Waves 0-9 are complete.
- Cross-Wave Consolidation and the Final Remediation Master Plan are complete.
- The external read-only `baseline-90adf8f` campaign package remains the detailed evidence authority; it is not repository-controlled.
- G1 financial lifecycle authority and invoice snapshot remediation is closed and pushed at `e34ea4176044f4dc663555a8794dfa5d3042206c`. All four canonical G1 migrations are applied and reconciled on DEV/DEMO; G2 through G12 remain not started. Current product state remains single-company and Service-centered, with staged Event ERP expansion and later optional multi-company/SaaS expansion.
- Current confirmed findings: 49 — 0 Critical, 5 High, 39 Medium, and 5 Low. Future SaaS/migration concerns are tracked separately: 3. Architectural blockers: 0.

### Current checkpoint

- **Phase:** `POST-G1 CLEANUP / STABILIZATION GATE — DEV/DEMO DATA HYGIENE CLOSED`.
- **G0 authority:** `D:/G7/g7-crm` on `main` remains the sole canonical checkout at the frozen baseline recorded in this document's governance/current-authority section; the retired Grok worktree is not current authority.
- **G1 state:** approved quotation mutability, active Approved Billing Scope invoice snapshot authority, durable `invoice.created` / `invoice.issued` audit events, invoice-list Draft/Sent/Paid visibility, invoice-detail authority semantics, Final Invoice scope preservation, and Deposit Invoice scope preservation are implemented and accepted. Full validation is `PASS WITH WARN` only because two pre-existing PDF `<img>` lint warnings remain; the stale invoice-list contract now asserts invoice `date` semantics. DEV/DEMO database verification and browser acceptance are `PASS`.
- **Canonical G1 migrations:** `20260807090000_g1_financial_lifecycle_authority`, `20260807133000_g1_invoice_snapshot_insert_correction`, `20260807150000_g1_final_invoice_scope_snapshot_correction`, and `20260807183359_g1_deposit_invoice_scope_snapshot_correction` are applied on DEV/DEMO. Generated version `20260807185325` is absent; no production-readiness claim is made.
- **Pre-commit governance checkpoint:** Before this controlled closure commit, canonical `main` and `origin/main` were synchronized at `5320788af1a9369691d2904305dc2f4a79194bc3` with an empty index. The four protected build-watch logs remain untracked and untouched; this commit records the three authorized Task 2 documentation surfaces. Task 2 changed only DEV/DEMO records and these documentation surfaces; no application source, tests, SQL, migrations, schema, financial behavior, RBAC, or dependencies changed.
- **Next controlled gate:** Cleanup & Rebaseline and DEV/DEMO Data Hygiene are closed: the authorized mock/test reset, curated database seed, database integrity reconciliation, and authenticated read-only Customers, Services, Quotations, and Invoices smoke passed. `UX / LOADING STABILIZATION` is next; the Customer Document System and Quotation Commercial Model Impact Check remain open. G2 remains blocked, not started, and is still `Payment Precision`; the G1 -> G2 -> ... -> G12 backbone is unchanged.
- **M-01:** external candidate status is `IMPLEMENTED_AND_VALIDATED_NOT_ADOPTED`; consolidated disposition is `ADAPT`; it remains separate and was not accessed or applied here.

### POST-G1 CLEANUP / STABILIZATION GATE

**G2 MUST NOT START UNTIL THIS GATE IS CLOSED.**

This is an inter-goal closure and stabilization gate, not a replacement or renumbering of G2. It preserves the remediation backbone `G1 -> G2 -> ... -> G12`.

#### A. Cleanup & Rebaseline — COMPLETE (8 August 2026)

- [x] Reconcile canonical repository, local, and origin state.
- [x] Install and reconcile Expansion Master Rev 0.12 as the sole current master.
- [x] Classify `D:\G7` material carefully as Keep / Archive / Delete.
- [x] Preserve evidence; do not destroy recovery or historical records.
- [x] Record the bounded cleanup in `docs/governance/post-g1-cleanup-rebaseline-2026-08-08.md`.

#### B. DEV/DEMO Data Hygiene — CLOSED (8 August 2026)

- [x] Inventory smoke, test, and legacy demo records before deletion.
- [x] Preserve required regression, financial, lifecycle, ABS, snapshot, and audit evidence in repository tests, migrations, documentation, and Git history.
- [x] Remove the authorized legacy/mock DEV/DEMO business dataset through the completed atomic reset.
- [x] Seed exactly 10 synthetic active Customers, 10 synthetic active Suppliers, and 10 quote-ready `Inquiry` Services directly through the DEV/DEMO database.
- [x] Reconcile final counts, one-to-one Service/Customer relationships, referential integrity, clean numbering, preserved system state, and canonical migration history.
- [x] Complete authenticated seeded-baseline Customers, Services, Quotations, and Invoices browser/runtime smoke and close Data Hygiene.

The former G1 and legacy fixtures were removed as mock/test data. The curated baseline intentionally contains no quotation, ABS, invoice, payment, supplier booking, allocation, project, task, or audit rows; the owner will manually test the Service -> Quotation -> Approval -> ABS -> Deposit Invoice -> Final Invoice -> Payments workflow from these seeded master records. Full evidence is recorded in `docs/governance/post-g1-data-hygiene-2026-08-08.md`.

Authenticated seeded-baseline smoke used an existing DEV/DEMO Chrome session. Dashboard showed 10 Customers, 10 Services, and zero Quotations/Invoices; Customers, Services, and Suppliers displayed the curated records, representative Arabic/English details opened, and Quotations/Invoices remained empty. No create, approve, issue, pay, cancel, or other application mutation action was performed; the only data mutation was the authorized database seed.

#### C. Pre-G2 UX Stabilization — IMPLEMENTATION COMPLETE / CONTROLLER REVIEW (8 August 2026)

- [x] Navigation pending UX and immediate mutation/action states such as `Creating...`, `Approving...`, `Issuing...`, `Recording...`, and `Searching...`.
- [x] Duplicate-submit prevention.
- [x] Print/PDF actions do not reuse the initial `Preparing your workspace...` boot experience; document previews have document-specific pending behavior.
- [x] Reduce the visual prominence of destructive Cancel Service actions while preserving deliberate confirmation.
- [x] Complete the bounded RTL and mixed Arabic-English data alignment polish.
- [x] Validate focused contracts, full tests, TypeScript, Next type generation, lint, production build, OCR rule/preview/delegation checks, and authenticated read-only DEV/DEMO browser surfaces.
- [ ] Controller closure remains pending; no commit, push, database operation, document redesign, quotation commercial-model work, or G2 work is authorized by this task.
- [ ] `DEFERRED ACCEPTANCE CHECK — NOT AN IMPLEMENTATION BLOCKER`: when the first manually-created quotation and invoice exist under Customer Document System, verify preview/print has no workspace boot screen, contextual slow-only feedback, no fast flash, duplicate prevention, pending cleanup after preview/print, and relevant EN/AR UI behavior.

#### D. Customer Document System

- Preserve the Quotation, Deposit Invoice, and Final Invoice document tracks and the Arabic/English strategy: English-only, Arabic-only, bilingual AR+EN, or per-document language remain explicit options.
- UI locale must not silently rewrite historical document language; document-language behavior must preserve snapshot/history integrity.
- Preserve multi-page Quote/Invoice behavior, repeated compact headers/table headings, one document number across pages, and totals/settlement on the final page where appropriate.
- Preserve customer-facing short descriptions versus internal operational details, PDF spacing/hierarchy polish, and semantically appropriate `Approved Service Scope Total` terminology.

#### E. Quotation Commercial Model Impact Check

- Preserve Commercial Groups, Package pricing, Itemized pricing, mixed Package + Itemized pricing, customer-facing descriptions, and internal details remaining internal.
- **Tracked status:** `IMPACT CHECK REQUIRED / IMPLEMENTATION NOT AUTHORIZED`.
- Determine whether this direction is presentation/document-only and safe for a pre-G2 stabilization slice, or a deeper schema, quotation, ABS, or financial-authority change that must be scheduled deliberately without reopening G1 invariants.
- No quotation commercial redesign or schema/financial implementation is authorized by this closeout.

After this gate closes, G2 (Payment Precision) may begin.

### Completed product foundations before current remediation

| Classification | Current delivered truth | Evidence |
|---|---|---|
| DELIVERED + OWNER-ACCEPTED | Goal 2A loading/motion foundation; fast operations remain silent and destination-shaped loading is the current contract. | `5429e7642bd3d763809e0de453cc131f2c90921c` |
| DELIVERED + OWNER-ACCEPTED | Goal 2B/2C Business Year/list foundations, explicit-submit customer search, Supplier Directory presentation, Dashboard workspace hierarchy, and acceptance boundary. | `f20b240dcc6e1197167aec802c57b59201df0333`, `820b01f79a19d871b86c120e3c2f78b474596f4b`, `c2b699d8dac8ccbc64e5f511aff4931401cd099b`, `195b4c62d0e1f599513e338095fe71ff7a15777f`, `c9f12cf13299cb79e2a76b4127e58a16851b3548`, `8e54b80d4ec7376e4d6cd77d044ee5654e3bd5b3` |
| DELIVERED / CURRENT REMEDIATION OPEN | Business Year is bounded to temporal list routes; invoice-date semantics remain subject to `W5-DATE-001`. Module-local search/list/filter foundations are current product behavior, while G3/G4/G10 findings remain remediation. | `f20b240dcc6e1197167aec802c57b59201df0333`, `c1041b7db9b5b6d04c4fbb715a1f5275fb2204cc` |
| IMPLEMENTED / OWNER ACCEPTANCE PENDING / CURRENT G9 REMEDIATION OPEN | Supplier Rate Card V1 is present on canonical `main` through commit `9115d3e` for create/edit/activate/deactivate, validity, and overlap behavior; G9 precision/category/atomicity/lifecycle corrections remain open. | `9115d3e02a07ad4deefe1218dfeac644f32e106c` |
| DELIVERED / ACCEPTANCE PENDING | Reports and Customer 360 surfaces/read models exist; owner product/visual acceptance and current G3/G4 correctness/completeness findings remain open. | `2cee122e0223450820f7f89f977f986388fdbea8`, `943716f15e70218a7ce4034d47296f88b1bde61b` |
| FUTURE / DEFERRED | Broader accounting, procurement, Event Operations, advanced dashboards, multi-company/SaaS, ZATCA, and future localization/currency/compliance remain outside current remediation. | Expansion Master and current campaign plan |

### Active remediation program

| Goal | Findings / bounded purpose |
|---|---|
| G1 Financial lifecycle authority and snapshots | W2-LIFE-001, W2-FIN-002, W2-AUD-005 |
| G2 Money and payment precision | W2-PAY-003 |
| G3 Reporting truth and period semantics | M-03, M-06, W2-XWAVE-004, W3-REPORT-002, W5-DATE-001, W6-REPORT-001/002/003 |
| G4 Bounded read paths and scale | M-02, M-04, W3-PERF-005, W3-QUERY-001, W3-SCALE-003/004 |
| G5 Admin security and desired-state mutations | W1-AUTH-001, W1-SEC-002, W4-RETRY-001 |
| G6 Payload and log minimization | M-01, W1-SEC-004/005 |
| G7 Failure boundaries, health and webhook operations | M-05, W1-SEC-003, W4-BOUNDARY-001, W4-CONFIG-001, W4-OBS-001 |
| G8 Family-specific create replay | W4-REC-002 |
| G9 Supplier and Rate Card authority | W6-RATE-001/002/003, W6-SUP-001 |
| G10 Search, accessibility and interaction | W5-SEARCH-001/002, W5-A11Y-001/002/003, W5-UI-001, W5-URL-001 |
| G11 Verification and release program | W7-TEST-001/002, W7-MIG-001, W7-RELEASE-001, W7-CONTROL-001 |
| G12 Typed boundary, ABS architecture and cleanup | W8-ARCH-001/002, W8-LEGACY-001 |

G11 is a planning bucket, not one mixed commit: focused behavioral tests, DEV/DEMO PostgreSQL/RPC verification, release gates, and OCR/control-plane documentation must remain separate. G12 likewise separates generated Supabase typing, bounded ABS refactoring, and exact orphaned static-data cleanup.

### Dependency order

**Primary serial path:** owner/product/accounting decisions -> G1 financial lifecycle authority -> G2 money precision -> G3 reporting truth and period semantics -> G9 Supplier/Rate Card authority -> G8 family-specific replay safety -> G11 verification/release -> G12 architecture/cleanup.

**Parallelizable after required decisions and a clean baseline:** G5 Admin security, G6 payload/log minimization, G7 reliability boundaries, G10 search/accessibility, and G4 measurement/scale evidence. Parallelizable does not mean immediately started.

Every Goal still requires bounded task approval, expected repository state, relevant skill preflight, implementation, targeted tests, full regression where applicable, Open Code Review after implementation, and Mozfer review before commit/push.

### Documentation Definition of Done

Every future implementation/remediation Goal remains administratively open until all applicable items are reflected in the tracking documents:

1. Product/source implementation is complete.
2. Targeted validation is complete.
3. Required full regression is complete.
4. Open Code Review or an approved equivalent is complete.
5. Mozfer manual acceptance is recorded where required.
6. State changes are reconciled in `docs/project-status.md`, `docs/project-roadmap.md`, and `docs/deferred-decisions.md` when a decision changes state.
7. Mozfer reviews the final documentation diff.
8. Commit and push occur only under separate approval.

### Tracking source-of-truth hierarchy

1. `docs/project-status.md` — current delivered state and active phase.
2. `docs/project-roadmap.md` — execution order, current Goals, gates, and future direction.
3. `docs/deferred-decisions.md` — unresolved, partial, or intentionally deferred decisions only.
4. `docs/product/G7_BLUE_Event_ERP_Future_Expansion_Master_Handover.md` — sole strategic Event ERP/SaaS expansion reference.
5. External OCR campaign archive — detailed frozen discovery evidence and current finding ledger.

### Current remediation waiting on decisions / evidence

- **Owner decision first:** G1/G2 lifecycle, money precision, and financial correction contracts.
- **Accountant/product decision first:** G3 invoice status, Business Year fallback, report dimensions, supplier dates/cost denominator, and completion with outstanding finance.
- **Measurement first:** G4 performance, query, scale, and index decisions.
- **DEV/DEMO database evidence first:** G1, G2, G5, G8, G9, and G11 SQL/RPC/concurrency or migration verification.
- **Mozfer browser acceptance first:** G10 EN/AR/RTL/mobile/search/accessibility behavior; applicable G3/G9 report and supplier surfaces.
- **Later cleanup:** G6 M-01 adaptation, G12 generated typing, bounded ABS refactor, and exact orphaned static-data removal.
- **Current gates:** Security, financial integrity, Reports/Customer 360 authority, Supplier/Rate Card, Search/Accessibility, Database/Migration, Performance/Scale, Release, and Mozfer owner acceptance remain blocked or pending their listed Goals and evidence. Production sign-off is not complete.

### Deferred product / Event ERP / SaaS expansion

This is separate from current defect remediation and remains deferred until separately approved: broader financial safety beyond G1-G3; accounting/journal/periods; full user lifecycle; expenses/cash control; procurement/RFQ/PO; supplier accounting/payables; actual cost/margin/profitability; event cost ledger/close; Event Brief, venues, permits, labour, incidents, and operations timeline; broader dashboards; multi-company activation; SaaS onboarding/billing/quotas/platform administration; ZATCA; and future localization/currency/country/compliance expansion.

Rate Card V1 remains a bounded supplier capability and must not be relabeled as full procurement. The Expansion Master remains the detailed future-expansion authority.

### Future SaaS concerns — separate from current findings

- `W9-SAAS-001`: preserve settings and numbering seams now; design company-aware ownership before second-company activation.
- `W9-SAAS-002`: preserve permission call sites; design membership and company context before multi-company authorization.
- `W9-MIG-001`: preserve immutable identifiers, snapshots, audit history, and rollback requirements before ownership migration.

These 3 concerns are future activation gates, not current defects. No tenant rollout, tenant columns, SaaS billing, or multi-company UI is authorized.

### Release and acceptance gates

- Security: blocked/WARN pending G5-G7, redacted logs, health-exposure, and RLS/grant evidence.
- Financial integrity: blocked pending G1-G3, accountant decisions, and snapshot/status/precision tests.
- Reports/Customer 360: blocked pending G3 and complete aggregate/date/dimension/status contracts.
- Supplier/Rate Card: blocked pending G3/G9 decisions and atomic database evidence.
- Search/Accessibility: blocked pending G10 and Mozfer EN/AR/RTL/mobile/browser acceptance.
- Database/Migration: blocked pending approved DEV/DEMO PostgreSQL/RPC verification.
- Performance/Scale: blocked pending E1-E6 measurements and bounded corrections.
- Release: blocked pending G11; Mozfer owner acceptance remains pending by domain.
- Future SaaS activation: deferred pending ownership, membership, migration, export, isolation, quota, and compliance approval.

## 2. Current Priority

### Delivered V1 Financial and Service Lifecycle Milestone — `cf4d4aec7b3d2db1953141f2a1bfa435ccbafe70`

- The six-commit delivery sequence `4016cf7`, `db7bee8`, `dca4a77`, `907b54a`, `d978557`, and `cf4d4ae` is complete and pushed.
- Delivered scope: quotation approval atomically activates internal ABS; ABS Void is permissioned and exposure/payment-gated; Service lifecycle uses explicit guarded actions; the normal Service page uses compact status/action presentation, Billing Summary, and collapsed evidence-based Activity History; Deposit settlement is audited; Completed Services may create a remaining Final Invoice; Cancelled Services cannot create Deposit or Final invoices.
- Migrations `20260803090000` through `20260803130000` are the forward-only source contracts for this milestone. DEV/DEMO apply/verification is owner-confirmed; production apply/readiness is not claimed.
- Reported validation passed: 290/290 focused tests, lint with two existing PDF `<img>` warnings and no lint errors, TypeScript, and build. This docs synchronization does not rerun runtime, browser, or database validation.
- No next active V1 feature is selected. Owner selection is required before new implementation; Supersede, Change Orders, richer financial correction, and accounting expansion remain deferred.

### Implemented Spec Kit Feature — 008 Invoices Eligible-Service Chooser & Service Billing Workspace

- `.specify/feature.json` selects `specs/008-invoices-eligible-service-chooser`.
- Feature 007 is completed, committed, pushed, and historical.
- Feature 008 implementation, Service Billing Workspace adoption (`/services/[id]/billing?intent=deposit|final`), automated validation (26/26 selector tests, 13/13 invoice tests, 9/9 unit tests, tsc, lint, build), independent review (`G7-FEATURE-008-POST-SYNC-FINAL-REVIEW-1-PASS`), Mozfer manual visual smoke (`FEATURE-008-MANUAL-VISUAL-SMOKE-PASS`), 3-commit runtime commit sequence (`67dea92`, `0e43803`, `2197c36`), documentation commit (`e9414227b9825cc301906c5052e2700f1f110e96`), and remote push are complete. Feature 008 was delivered through commit `e9414227b9825cc301906c5052e2700f1f110e96` as the final Feature 008 delivery commit. After the controlled Feature 008 push under token `G7-FEATURE-008-CONTROLLED-PUSH-1-PASS`, local `main` and `origin/main` were verified synchronized at this delivery synchronization point, divergence at that verification point was verified at `0 0`, and the working tree was clean.
- This closeout is an administrative documentation update only, does not change Feature 008 runtime scope, and does not reopen delivery gates. A later administrative documentation commit may advance `main` beyond `e9414227b9825cc301906c5052e2700f1f110e96`, but does not alter the Feature 008 delivered-through commit.
- The chooser remains navigation-only and does not create a standalone Invoice, submit financial payloads, or introduce a second mutation authority.
- Legacy deep links (`/services/[id]?invoiceAction=...`) issue a backward-compatible HTTP 307 redirect to the new Billing Workspace routes.
- Feature 008 has no remaining implementation or delivery gates.
- Server-side search/cursor pagination and event-date eligibility redesign remain deferred unless Service-volume evidence or a separately approved design requires them.
- The latest Quotation/Invoice UX batch was delivered at `2151232f3db759d90eceb4af3fc534ed186fe8b1`, covering Quotation chooser refinement, Quotation list Print/PDF, Invoice chooser layout refinement, and Billing Workspace status localization. No implementation task is active, and Feature 009 remains inactive.

### Completed Spec Kit Feature — 006 Invoice PDF Customer Cleanup

- `001-erp-3b-invoice` is **CLOSED / HISTORICAL**. Its unchecked tasks are preserved as history and are not an active implementation backlog.
- Feature 006 is closed and historical; its packet remains preserved at `specs/006-invoice-pdf-customer-cleanup`.
- Feature 006 implementation is complete, independently reviewed, and accepted by Mozfer for the supplied short Deposit and Final Print Preview examples.
- Focused contract passed 12/12; Invoice actions remained 38/38; related Invoice suites remained 64/64; lint, typecheck, and build passed with only the documented existing warnings.
- Implemented scope removes rendered Invoice `item.details`, internal notes/terms, Prepared By/System Generated presentation, and generated-document disclosure while preserving snapshots, financial values, Deposit/Final behavior, status, Draft watermark, and intended customer-facing fields.
- Strict snapshot classification renders Approved Quotation Items for full quotation snapshots, Approved Service Scope for active scope snapshots, and Invoice-summary-only output for synthetic or ambiguous shapes. No live Quotation lookup or historical snapshot rewrite was introduced.
- Accepted short examples `INV-2026-0021` Deposit and `INV-2026-0022` Final fit one A4 page with truthful item pricing and type-specific summaries. Long-fixture smoke remains outside the supplied evidence.
- Commit and push are complete; no production-readiness, VAT-readiness, ZATCA-readiness, backup-readiness, or accounting-finality claim is made.
- Quotation PDF customer cleanup is completed and pushed at `09bbe3b08aae64c1ec8c6e2e36e0d740e8ff02ae`.
- Product sequence is now governed by the delivered quotation/internal-ABS and Service lifecycle milestone together with Feature 007, Feature 008, and the latest Quotation/Invoice UX batch. No standalone Quotation creation, standalone Invoice creation, or second mutation authority is approved.
- Company Expenses, direct Event costing, Procurement/RFQ/PO, Vendor Bills/Supplier AP, Supplier Credits/Payments, and Event Margin remain later separately designed programs.
- Graphify remains stale; force remediation remains deferred.
- No production-readiness, VAT-readiness, ZATCA-readiness, backup-readiness, or accounting-finality claim is made.

### V1 Delivery Decisions - Locked

- `V1-DELIVERY-DECISIONS-LOCK-1` is completed. D01-D09 are locked product policy; no implementation occurred.
- D01: Keep the narrow internal Supplier Booking workflow in V1; professional Supplier Booking redesign is outside V1 acceptance scope.
- D02: Reports Center is P1 and is not a V1 acceptance gate.
- D03: Issued invoices are immutable. Unpaid invoices may be voided by Admin with reason and audit. Paid or partially paid invoices require controlled adjustment/reversal and replacement.
- D04: Recorded payments are append-only. Monetary errors, duplicates, refunds, and wrong invoice allocation require controlled reversal/correction records; no financial deletion.
- D05: Approved Billing Scopes are immutable. Void is allowed only for the active scope with zero applicable Service invoices and zero payment history, blocks future billing, and never restores quotation fallback. Supersede preserves historical invoices/payments, uses one cloned successor draft, and enforces a Service-lifetime applicable-invoice ceiling atomically.
- D06: Runtime Arabic/English is V1 scope. Western digits and bidi-safe financial identifiers are mandatory. Mozfer owns final commercial-language approval; Saudi business-language review is required before UAT. Future Arabic and English renderings of the same authoritative financial document remain deferred; side-by-side bilingual presentation is a separate decision. Runtime authenticated UI localization (Feature 005 + P3 + P5 visual acceptance) is **accepted** with Mozfer T032 browser smoke PASS; commercial-language review for UAT remains separate.
- D07: UAT is role-based and user-executed. Mozfer is final business acceptance owner. Blocker and High defects prevent launch.
- D08: Named operational ownership is required: minimum 30-day backup retention, RPO within 24 hours, RTO within one business day, named monitoring/incident owner, and 10 business days launch support.
- D09: The focused V1 package is approved: runtime Arabic/English core UX, mobile core paths, financial correction controls, Approved Billing Scope management, and operational invitation/UAT gates; Reports Center acceptance, professional Supplier Booking, Arabic/English financial-document rendering, side-by-side bilingual presentation, and VAT/ZATCA/FATOORA remain outside V1.
- Feature `005-i18n-runtime-locale` authenticated bilingual CRM UI is **formally closed** after pushed commit `aaf6563 fix(i18n): complete bilingual visual acceptance` (independent review PASS; T032 Mozfer smoke PASS; P5 visual remediation PASS; automated i18n/export **243/243**). See `docs/project-status.md` Feature 005 milestone.
- Closure process history: `G7-AR-UX-P5-FINAL-ACCEPTANCE-COMMIT` → `G7-AR-UX-P5-FINAL-ACCEPTANCE-PUSH` → `G7-AR-UX-FEATURE-005-CLOSEOUT-DOCS-SYNC`. Local `main` and `origin/main` aligned at `aaf6563` (0/0).
- Not claimed: production readiness, PDF-body localization, Clerk-hosted widget localization, bilingual documents, real Invoices Excel export, stored business-data translation.

### 🚧 Cursor Audit Priority Gates & Blockers
Cursor audit gates:
1. SUPPLIER-AUDIT-COLUMNS-TEXT-FIX-1: CLOSED
2. SUPPLIER-ALLOCATION-BOOKING-GUARD-1: CLOSED

Current product state:
- **Feature 005 closed** (authenticated bilingual CRM UI; acceptance `aaf6563`, closeout docs `e731d4d`).
- **ABS management design complete:** `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1` → `docs/approved-billing-scope-management-design.md` (`APPROVED_BILLING_SCOPE_MANAGEMENT_DESIGN_COMPLETE`).
- **ABS read-enrichment complete:** `ABS-MGMT-UI-READ-ENRICH-1` — Service Detail **read-only** ABS summary card shows effective display state (active/draft/voided/superseded-derived), version, source quotation, billing ceiling, invoiced/remaining (when `invoices:read`), line safety, draft/history indicators, and detail navigation. Source implemented and pushed on main.
- **ABS draft-edit/discard complete:** `ABS-MGMT-UI-DRAFT-EDIT-1` — bounded draft item edit and discard UI using the existing backend contracts; automated validation passed; PASS by Mozfer manual browser evidence; pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`.
- **ABS review/approve complete and pushed:** `ABS-MGMT-UI-REVIEW-APPROVE-1` — automated validation passed; PASS by Mozfer manual browser evidence; committed and pushed in `d8b654f2c89622837b75531aa44d79a66e024ad8`.
- **Financial lifecycle implementation verified:** `ABS_VOID_SUPERSEDE_SERVICE_LIFETIME_CEILING_LOCKED` remains the governing design decision. The reviewed migration/RPC implementation is installed in DEV/DEMO. Successful mutation smoke and independent review are **complete** (synthetic DEV/DEMO only; run ID `300d4edd-5c8e-45bc-bc85-b4f033750a14`).
- **Invoice financial lifecycle application stack:** **implemented, tested, DEV/DEMO browser-accepted (PASS WITH WARN), and pushed** through `45cdfb73` (ten source/test commits: money, exposure, lifecycle, safe action errors, invoice RBAC, five-mode authority, ABS history alignment, Deposit/Final actions, Service billing UI, Quotation display-only authority). Service Detail is mutation authority; Quotation Detail is display-only.
- **Supplier Operations V1 closeout:** **complete** — internal Allocations and Supplier Bookings implemented under server gates; cancel/restore checks and booking concurrency limits verified.
- **Hardened Payment Recording & Table Pagination:** **complete** — atomic `record_invoice_payment` RPC applied/verified in DEV/DEMO; 12 commits pushed up to `ded8daa`; 78 payment tests passed; pagination layout scroll-reset stabilized; manual smoke verification (fully paid INV-2026-0022 with 4,200.00 SAR) passed.
- **Feature 006 closeout:** `006-invoice-pdf-customer-cleanup` implementation, independent review, owner acceptance, commit, push, and supplied short-example Print Preview acceptance are complete.
- **No implementation task is active:** Feature 007, Feature 008, the latest Quotation/Invoice UX batch, quotation/internal-ABS activation, ABS Void, and the Service lifecycle milestone are delivered. No next feature is selected; Feature 009 remains inactive and owner selection is required.
- **Workspace Location and Governance Rules:**
  - Sole canonical active checkout: `D:/G7/g7-crm`; future implementation tasks operate here unless Mozfer explicitly authorizes a different checkout.
  - Canonical branch: `main`; frozen discovery baseline: `90adf8faa33c4af1c0049b53817f5f95896a761f` (expected HEAD and `origin/main` for this governance sync).
  - Retired historical checkout (do not access, inspect, modify, compare, clean, or reuse): `C:/Users/Mozfer/.grok/worktrees/g7-g7-crm/2026-07-13-360132e5`.
  - No new worktrees or branches are authorized by this decision; silent path switching and manual copying or merging remain prohibited.
  - Existing recovery/candidate assets remain protected and untouched; the four build-watch logs remain protected untracked files.
- **Next safe product/engineering direction:** none is selected. Reports Center remains P1 but is not active; Supersede remains a separate deferred revision workflow. Clerk invitation/webhook smoke remains deferred until production/UAT readiness.
- **Deferred / optional (not complete):** Manager and Accountant browser smoke sessions; Deposit client maximum using remaining rather than full ceiling; legacy Quotation database ceiling hardening; broad ABS numeric normalization; invoice/payment correction and accounting treatment; future production/database hardening; future VAT or compliance work. Do **not** mark production rollout, VAT readiness, ZATCA readiness, or accounting finality complete.
- **ABS management delivery state:**
  1. `ABS-MGMT-UI-READ-ENRICH-1` **complete**
  2. `ABS-MGMT-UI-DRAFT-CREATE-1` **complete** (source implemented; PASS by Mozfer manual browser evidence; pushed on main in `47d9a4f14f019e837224e6db6cababdab12a7610` and `7054cf34654266ca033c58c62f9dca6d94092967`)
  3. `ABS-MGMT-UI-DRAFT-EDIT-1` **complete and pushed** on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`
  4. `ABS-MGMT-UI-REVIEW-APPROVE-1` **complete and pushed** in `d8b654f2c89622837b75531aa44d79a66e024ad8`
  5. `ABS-MGMT-FINANCIAL-LIFECYCLE-DESIGN-1` **complete**
  6. migration/RPC preflight, SQL review, DEV/DEMO apply, read-only verification, actions, and tests **complete**
  7. successful lifecycle mutation smoke + independent review **complete** (DEV/DEMO synthetic)
  8. application Deposit/Final financial lifecycle stack **pushed** through `45cdfb73`
  9. atomic Invoice create RPC complete and app-routed in `a83c1d28`
  10. atomic record_invoice_payment RPC complete and app-routed in `ded8daa`
  11. governance and payments documentation sync/push **completed** (historical sequence item; not the current active task)
  12. repository reconciliation planning is pending owner approval (no reconciliation or checkout switch has occurred)
  - Optional later: `ABS-MGMT-HISTORY-LIST-1`
- **ABS source-truth:** quotation approval now activates the internal authority snapshot; the normal Service page uses Billing Summary; the delivered Void app action and secondary technical-surface UI enforce structured reason/note, permission, lifecycle, zero-exposure, and zero-payment gates. Supersede app/UI remains missing and deferred. Status enum is `draft|approved|voided` only; Superseded is timestamp/link-derived. Current runtime fallback and the locked post-authority fail-closed policy remain distinct and must not be conflated.
- **Browser/manual smoke rule:** Practical browser/manual smoke remains user-controlled by default and may be delegated to an agent only through explicit bounded user authorization. The financial lifecycle browser acceptance was executed in DEV/DEMO under such authorization.
- **Responsive core P0 (complete; Mozfer smoke PASS):**
  - Audit + implement source: `RESPONSIVE_CORE_P0_IMPLEMENTED` (quotation/service stacking, logical filter icons, related-quotations header, invoice search width; table-local scroll preserved).
  - Body-overflow remediation: `RESPONSIVE-CORE-P0-SMOKE-FIX-1` (shell `min-w-0` containment; DataTable/Related Quotations local-scroll constraints; Service Detail Blocked Actions wrap; allocations header wrap; billing row wrap). No global `overflow-x-hidden` concealment.
  - Automated validation: **107/107** PASS; ESLint PASS; `tsc --noEmit` PASS.
  - Manual re-smoke: `RESPONSIVE-CORE-P0-MOZFER-RE-SMOKE-1` — **PASS by Mozfer manual browser evidence.** Agent did **not** perform browser smoke.
  - Responsive-smoke blocker is closed (no longer unresolved/active).
  - Supplier mobile detail remains deferred to full Supplier redesign (no temporary panel/drawer).
- **Historical V1 critical-path record:** responsive audit -> responsive implementation/smoke PASS -> ABS management/read/create/edit/review/approve -> financial lifecycle design/migration/DEV/DEMO verification -> application financial lifecycle stack through `45cdfb73` -> governance/payments documentation sync. This retained sequence is historical and does not define a current active feature order.
- Residual open (outside Feature 005 formal close): future Arabic and English rendering of the same authoritative Quotation/Invoice, including any default rendering locale; side-by-side bilingual layout remains separately undecided.
- Residual open: final Mozfer commercial Arabic terminology approval for UAT (separate from T032 visual smoke PASS).
- Professional Supplier Booking redesign remains outside V1 acceptance scope and is **not** active.
- Reports Center remains P1 and is **not** active on the V1 critical path.
- Do not promote Supersede UI, Supplier Booking redesign, Reports Center, VAT/ZATCA, or production apply as the active task without explicit owner selection and a bounded plan.
- Related backlog note: `RESPONSIVE-LIST-PAGE-HORIZONTAL-OVERFLOW-1` remains historical P1 backlog wording.

Completed:
- `ABS-MGMT-UI-DRAFT-CREATE-1` (source implemented, committed, and pushed; **PASS by Mozfer manual browser evidence**): Admin confirmed the control hidden for a Cancelled terminal Service; an eligible non-terminal Service with an approved quotation, zero ABS history, zero invoices, and zero discount exposed Create Draft; creation navigated to the nested detail route and produced Draft version 1, Pending review, one copied quotation item, and `SAR 1,000.00`; returning to Service Detail showed the existing Draft, View details, and no Create Draft; Viewer had no ABS access; Arabic and English passed. Completed/Cancelled are UI-blocked, and the server action independently rejects terminal/deleted/missing Services while accepting only `sourceQuotationId`. Existing draft, active, voided, superseded-derived, or mixed history blocks create. Pending duplicate-submit protection is implementation/test-covered; no manual double-click stress test is claimed. Agent did not perform browser smoke.
- `ABS-MGMT-UI-DRAFT-EDIT-1` (source implemented; automated validation passed; **PASS by Mozfer manual browser evidence**): the Service Detail card now exposes a clear bordered View details action instead of visually hidden text; the nested ABS draft-detail route opened correctly; the draft item editor displayed immutable source values and editable accepted values; an adjusted unit-price reduction saved successfully; refreshed item and header totals reflected the server-authoritative result; line safety remained Pending review after the material edit; cancelling an unsaved edit preserved the last saved value; selecting Excluded zeroed accepted quantity, unit price, item total, and scope total after save; cancelling the discard confirmation left the draft unchanged; confirming discard deleted the draft and its items; after discard, the Service Detail page showed Create Draft again; Arabic and English rendering passed. The first discard navigation attempt exposed a modal-stays-open UX weakness; the source fix closes the modal, clears local error state, performs one router.push, removes the redundant router.refresh, and the fixed redirect was manually re-tested without a manual refresh. Pending duplicate-submit protection is implementation/test-covered; no manual double-click stress test is claimed. Agent did not perform browser smoke. Pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`.
- `ABS-MGMT-UI-REVIEW-APPROVE-1` (implemented and pushed in `d8b654f2c89622837b75531aa44d79a66e024ad8`; automated validation passed; **PASS by Mozfer manual browser evidence**): English-only manual evidence covered Pending review readiness, Safe review, approval confirmation warning, successful activation, disappearance of write controls, and active Service Detail totals. Arabic/English dictionary parity and Arabic wiring are automated-test-covered; no Arabic manual browser evidence or manual rapid double-click test is claimed.
- `APPROVED-BILLING-SCOPE-CEILING-BLOCK-SMOKE-1` (PASS WITH WARN: manual smoke verification completed on SVC-2026-0015; successfully verified that the UI blocks creation of an above-ceiling deposit invoice and the DB confirmed no invoice was created; browser/client validation blocked submission before server-action over-ceiling request was reached; temporary dev harness was removed; optional server-side direct smoke `APPROVED-BILLING-SCOPE-SERVER-CEILING-BLOCK-SMOKE-1` remains in backlog).
- `APPROVED-BILLING-SCOPE-BILLING-CALC-REFRESH-REVIEW-1` (PASS: verified billing state calculation fix in commit `270ac66` on SVC-2026-0014; the Billing Calculation UI now correctly reflects the active Approved Billing Scope ceiling and subtracts both deposit and final invoices, displaying Prior Invoiced SAR 20000.00 and Remaining SAR 0.00).
- `APPROVED-BILLING-SCOPE-SERVICE-ENTRY-CARD-1` (PASS: commit `c07b191` added the permission-gated read-only Approved Billing Scope card on Service Detail. Read contracts remain typed and sanitized, the card now shows empty/populated/unavailable states, and visibility is limited to Admin, Manager, and Accountant.)
- `APPROVED-BILLING-SCOPE-SERVICE-ENTRY-CARD-SMOKE-DOCS-SYNC-1` (PASS: user-only manual browser smoke completed for the Service Detail card in DEV/DEMO. Admin, Manager, and Accountant can see the read-only card; Sales, Operations, and Viewer do not; empty, populated, and refreshed states render correctly; no blocking issue was reported.)
- `APPROVED-BILLING-SCOPE-APPROVE-ACTIONS-SMOKE-RUN-1` (PASS WITH WARN: manual smoke verification completed on SVC-2026-0014 / QT-2026-0018; successfully verified draft creation, line safety review, approval, and invoice integration; temporary dev harness was removed; ceiling block test bypassed and UI refresh staleness warning noted).
- `APPROVED-BILLING-SCOPE-APPROVE-ACTIONS-1` (Implemented `reviewApprovedBillingScopeLineSafety` and `approveApprovedBillingScope` server actions in commit `b9621bb`; verified types/lint, safety rules, draft/voided/superseded guards, and concurrency checks).
- `QUOTATION-REVISION-FALLBACK-DESIGN-1` & `QUOTATION-REVISION-FALLBACK-PRODUCT-DECISION-DOCS-1` (Option A chosen: quotation status enum remains unchanged; active Approved Billing Scope determines current billing authority; revised quotation flow uses billing scope supersede/versioning).
- `APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-MIGRATION-DRAFT-1` & `APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-MIGRATION-FILE-P0-FIX-1` (Add invoices.approved_billing_scope_id composite FK, index, and trigger ceiling guards with fail-closed NULL grand_total guard and null-safe predicates).
- `APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-ACTION-DESIGN-1` & `APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-ACTION-IMPLEMENT-1` (Integrate createInvoiceAction with active Approved Billing Scope ID, acceptedGrandTotal ceiling validation, and trigger exception sanitization).
- `APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-SMOKE-PLAN-1` (PASS WITH WARN: manual smoke verification of fallback and final invoice calculation on SVC-2026-0003; active scope block paths not tested because no active approved scope existed).
- `APPROVED-BILLING-SCOPE-INVOICE-SNAPSHOT-FROM-SCOPE-1` (PASS WITH WARN: commit `c66975d` recorded the approved-scope invoice snapshot fix; deposit `INV-2026-0025` and final `INV-2026-0026` manual smoke passed, and the follow-up full-scope item-decision smoke is now completed in `APPROVED-BILLING-SCOPE-FULL-SCOPE-ITEM-DECISION-SMOKE-1`).
- `APPROVED-BILLING-SCOPE-FULL-SCOPE-ITEM-DECISION-SMOKE-1` (PASS: manual DEV/DEMO smoke on `QT-2026-0020` / `e19ddc5a-bbdb-44a6-a61e-c34aef7fa60d` / `eb1f4c46-74f7-4c67-a043-c07935bb1289`; verified accepted/adjusted/excluded/customer_supplied decisions, approved scope metadata, and final invoice `INV-2026-0027` with snapshot lines limited to `شاشات = SAR 10000` and `صوت = SAR 7000`; temporary dev harness removed after smoke; no real user-facing Approved Billing Scope management UI yet).
- `APPROVED-BILLING-SCOPE-READ-ONLY-DETAIL-ROUTE-1` (PASS: commit `35c0692` added the nested Service-context read-only detail route `/services/[serviceId]/approved-billing-scopes/[scopeId]`, linked it from the populated Service Detail card, localized it in English and Arabic, and kept linked invoices permission-gated by `invoices:read`).
- `APPROVED-BILLING-SCOPE-READ-ONLY-DETAIL-ROUTE-DOCS-SYNC-1` (PASS: project status and roadmap recorded the completed route milestone).
- `SUPPLIER-BOOKINGS-UI-1A-SMOKE-VERIFY` (Completed History, PASS WITH WARN: verified create/cancel booking actions on SVC-2026-0003; minor loading/pending indicator UX WARN recorded).
- `G7-CANONICAL-DOCS-STALENESS-AUDIT-1` and `G7-CANONICAL-DOCS-CLEANUP-P0-1` are completed documentation history.
- `INVOICE-SERVICE-ID-NOT-NULL-AUDIT-1` (PASS WITH WARN: audited and verified service_id is nullable in schema but required by product/types/actions; data count is zero).
- `PUBLIC-HEALTH-ROUTE-HARDEN-1` (PASS WITH WARN: audited public health and webhook routes, verified response sanitization and next 16 proxy convention).

Backlog / later priority:
- Successful lifecycle mutation smoke and independent review are **complete** (DEV/DEMO synthetic). Application financial lifecycle stack is **pushed** through `45cdfb73` and DEV/DEMO browser-accepted with **PASS WITH WARN**. This historical entry predates the delivered `cf4d4aec` quotation/internal-ABS and Service lifecycle milestone; no current next implementation slice is selected.
- Remaining ABS product path: optional richer ABS history → deferred Supersede UI. Production apply remains unauthorized. DEV/DEMO acceptance does not make ABS or broader invoicing production-ready.
- Optional/deferred financial hardening: Deposit client max = remaining; legacy Quotation DB ceiling branch; invoice/payment correction and accounting treatment; broad ABS numeric normalization.
- `ABS-MGMT-HISTORY-LIST-1` (optional later)
- `APPROVED-BILLING-SCOPE-SERVER-CEILING-BLOCK-SMOKE-1` (Optional follow-up to perform server-side direct adversarial smoke testing bypassing UI validation).
- `SUPPLIER-BOOKINGS-LOADING-UX-VERIFY` (Follow-up validation of supplier booking creation/cancellation pending and transition states under throttled networks).
- Supplier Bookings Domain design/planning
- Supplier Bookings server actions
- Supplier Bookings UI
- Supplier Bookings RBAC
- INVOICE-READ-BOUNDARY-HARDEN-1
- SERVICE-STATUS-DIRECT-FINAL-PATH-1
- CUSTOMER-PO-INVOICE-GATE-1
- INVOICE-ZERO-FINAL-GUARD-1
- PUBLIC-HEALTH-ROUTE-HARDEN-IMPLEMENT-1
- MONEY-AUDIT-LOG-COVERAGE-1
- INVOICE-SERVICE-ID-NOT-NULL-MIGRATION-DRAFT-1
- SEC-RLS-PRODUCTION-POLICIES-1
- INVOICE-VOID-STATUS-MIGRATION-1
- INVOICE-SNAPSHOT-FREEZE-POINT-1
- SUPPLIER-BLACKLIST-IMPACT-CHECK-1
- `RESPONSIVE-LIST-PAGE-HORIZONTAL-OVERFLOW-1` (historical P1 backlog label for list-page overflow; **not** the current active task)
- `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1` (**complete** — design locked in `docs/approved-billing-scope-management-design.md`)

Completed ABS / responsive gates (docs):
- `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1` / docs sync — management design recorded.
- `ABS-MGMT-UI-READ-ENRICH-1` — read-only Service Detail ABS card enrichment source complete; docs sync records accepted status; controlled commit/push separate.
- `RESPONSIVE-CORE-P0-SMOKE-FIX-1` + `RESPONSIVE-CORE-P0-MOZFER-RE-SMOKE-1` — body-overflow remediation implemented; **PASS by Mozfer manual browser evidence**; `RESPONSIVE_CORE_P0_MANUAL_SMOKE_PENDING` closed.

### 🚧 Historical / Superseded CRM Priority Sequence

> Retained as an earlier roadmap sequence. It is not the current execution authority and does not override Feature 006 or the approved Quotation-selector then Invoice-chooser order.

0. `SEC-AUTHZ-APP-USER-GATE-1`
   - Security blocker: Clerk-authenticated users without an `app_users` row could access dashboard and internal CRM.
   - Fix: dashboard layout now requires active `app_users` membership; blocked users redirect to `/unauthorized`.
   - `/services(.*)` added to Clerk protected routes.
   - No schema changes, no SQL, no users inserted or promoted.
   - `SEC-AUTHZ-APP-USER-GATE-1` implementation passed manual verification. Unapproved Clerk users are blocked from dashboard/internal CRM. Existing active admin access verified.
   - `QUOTE-APPROVAL-FLOW-1B` remains in stash, pending restoration and smoke after this security fix is committed/merged.
1. `RBAC-QUOTATIONS-APPROVE-1`
   - Ready for PR: `quotations:approve` added to Manager in `src/lib/auth/permissions.ts`.
   - Keep approval separate from ordinary `quotations:write`.
   - Required before quotation approval flow and ERP-3 invoices.
2. `CUST-OFFICIAL-DETAILS-1`
   - CUST-OFFICIAL-DETAILS-1B manually applied and DB-verified: optional/conditional customer official and billing fields are present in the database.
   - Fields include customer type (Individual / Company), legal name, Commercial Registration number, VAT number, National Address fields, billing email, finance contact, payment terms, and PO required flag.
   - `supabase/schema.sql` now matches the verified DB state for these fields.
   - CUST-OFFICIAL-DETAILS-1C wires the fields into the customer data layer, create UI, profile-only edit UI, and customer profile card; Mozfer manual smoke passed and the slice is ready for pre-commit review.
   - Future invoice buyer snapshots remain ERP-3 scope; customer VAT number storage does not enable Tax Invoice/ZATCA behavior.
3. `SEC-SERVICE-INVARIANTS-1`
   - Ready for review: Service creation now validates active/non-deleted customer server-side.
   - Ready for review: Service soft delete now blocks non-deleted linked quotations.
   - Future invoice/payment service deletion guards remain ERP-3/ERP-4 scope once service-linked invoices/payments exist.
4. `SERVICE-HUB-1`
   - SERVICE-HUB-1B implements the minimal Service/Booking Hub detail page to replace the old user-facing project hub concept.
   - Includes a read-only status timeline, service schedule, customer context, and related quotations.
   - Does not add invoice/payment cards, fake financial data, status transition actions, notes/activity, or attachments.
   - Service remains the operational source of truth.
5. `QUOTE-APPROVAL-FLOW-1`
   - `QUOTE-APPROVAL-FLOW-1B` completed. Migration was manually applied and schema is synced. Admin smoke passed.
   - Multiple draft quotations per Service are allowed for negotiation.
   - More than one approved quotation per Service must be prevented.
   - Required before ERP-3 invoice creation.
6. `ERP-3`
   - Deposit/final invoices must be created from Approved Quotation + Service.
   - No invoice without Service.
   - No invoice without Approved Quotation.
   - Invoice totals must derive from approved quotation snapshots, not arbitrary client input.

### Historical ERP-3B Follow-up Plan

> ERP-3B is now **CLOSED / HISTORICAL**. The items below are retained as planning lineage only and are not active implementation authorization. Current future Invoice entry direction is governed by the post-Feature-006 Service chooser that deep-links to Service Billing after the Quotation selector.

1. Payment MVP
2. Environment / UAT / smoke test docs
3. Global Invoice Wizard ERP-3F
4. Void / Cancel / Credit Note lifecycle
5. ZATCA/FATOORA after VAT registration

*Previous Decisions Retained:*
- Final Invoice Settlement Design accepted with SIMPLE_SUM_FOR_T018 (subtracts active prior invoices, not payments).
- invoice_prepayment_applications remains deferred.

### DOC-COMPANY-DOCUMENT-RULES-1A - Documentation + Official Logo Asset
Status: Completed

Checklist:
- [x] Record official company identity, logo path, TIN, VAT status (Not Registered).
- [x] Document generation rules for Quotations, Deposits, and Proforma.
- [x] Document required snapshot rules for generated documents.
- [x] Required before document branding or invoice implementation.

### DOCUMENT-BRANDING-PRINT-1B - Apply G7 BLUE Branding to Print/PDF Views
Status: Completed

Checklist:
- [x] Apply official G7 BLUE identity and logo to Quotation PDF/print views.
- [x] Apply official G7 BLUE identity and logo to Invoice PDF/print views.
- [x] Remove fake VAT, Tax Invoice, and CR values.
- [x] Use Entity Unified No 7053901414 and TIN 3146944674.
- [x] Retain not_registered VAT status.

### DOCUMENT-SNAPSHOT-WIRING-1B - Document Snapshot Wiring
Status: Completed

Checklist:
- [x] Quotation snapshot UI wiring, DB migrations, backfill, RPC updates, and schema sync.
- [x] company_settings and customers are decoupled from printed Quotations.
- [x] Verify that ERP-3 (Invoices) is ready to start when authorized.

### COMPANY-SETTINGS-CLEANUP-1B - Company Settings Data Cleanup
Status: Applied and verified in Supabase

Checklist:
- [x] Make `cr_number` optional in DB and Zod schemas to prevent `sar` placeholders.
- [x] Sanitize `official_email` in Zod schemas to strip markdown/mailto.
- [x] Propose SQL to correct existing bad `company_settings` data and frozen `quotations.snapshot_seller` demo data.
- [x] Repo implementation committed and pushed in `0b826a9`.
- [x] Manual Supabase migration apply and DB cleanup applied manually.
- [x] Live database verified for this cleanup (0 bad snapshots).
- [x] `company_settings.cr_number` is nullable in DB and is `NULL`.
- [x] `company_settings.official_email` is plain `info@g7blue.com`.
- [x] `company_settings.default_terms` uses professional terms.
- [x] No Tax Invoice / VAT 15% / VAT Number / ZATCA behavior is enabled while `vat_mode = not_registered`.
- [x] Do not apply SQL automatically.
- [x] `SETTINGS-EDIT-MODE-1` is implemented/repo-ready; manual browser smoke pending.

TAX-0 cleanup is complete, and SEC-RLS-BASELINE-1 manual Supabase apply/database verification is complete. DEV_ONLY broad authenticated policies were removed from the live database. STAB-P0-04 remote DB apply is complete and verified for both the supplier booking number default and the `company_settings` production RLS migration. Real or semi-real company/client data remains blocked only by the remaining operational hardening items: demo-data/security decision, raw error/security checks where applicable, and backup/monitoring/deployment readiness before production. Viewer bank masking verification is complete and passed.

### QUOTE-VALIDITY-RULE-1 - Enforce Quotation Validity Against Service Schedule
Status: Completed

Checklist:
- [x] Service Schedule is read-only context in quotation create UI.
- [x] Issue Date is read-only.
- [x] `Quotation Valid Until` means offer expiry date, not service execution date.
- [x] Enforce `valid_until >= issue_date`.
- [x] If Service Start Date exists, enforce `valid_until <= service.event_start_date`.
- [x] If Service Start Date is before Issue Date, block quotation create/update with a controlled error.
- [x] Enforce validation in both UI and Server Actions.
- [x] Keep Service start/end dates out of quotation payloads.
- [x] Sort Services list by service number ascending.
- [x] Hide native number input spinners in quotation numeric inputs.
- [x] No schema, migration, RPC, VAT, invoice/payment, or financial total authority changes.

### PRJ-CLEANUP-1 - Retire User-Facing Projects UI
Status: Completed

Checklist:
- [x] Remove Projects from primary navigation.
- [x] Replace dashboard Project surfaces with Service / Booking-oriented surfaces.
- [x] Redirect `/projects` to `/services`.
- [x] Leave legacy project schema, permissions, types, mock data, customer `projects_count`, and supplier PRJ mock references for later cleanup.

## 3. Completion Checklist

### Phase 0 - Stabilization
Status: Completed

Checklist:
- [x] auth-error-imports fixed
- [x] `src/lib/auth/errors.ts` made canonical for shared auth errors
- [x] `permissions.ts` imports and throws shared `UnauthorizedError` / `ForbiddenError`
- [x] quotation RPC ambiguity fixed
- [x] `create_quotation_with_items` qualifies `quotation_items` references with aliases
- [x] `update_quotation_with_items` qualifies `quotation_items` references with aliases
- [x] quotation creation verified after manual Supabase apply
- [x] quotation browser print layout improved

### Phase 1 - Customers
Status: Completed

Checklist:
- [x] Customers CRUD
- [x] Customers CSV Export

### Phase 2 - Core Security / RBAC
Status: Foundation completed; production hardening deferred

Checklist:
- [x] app_users
- [x] roles
- [x] requirePermission
- [x] Clerk/Supabase foundation
- [x] SEC-RLS-BASELINE-1 migration prepared to remove DEV_ONLY RLS policies
- [x] Manual Supabase SQL Editor apply and database verification for SEC-RLS-BASELINE-1
- [x] DEV_ONLY policies returned zero rows in live database verification
- [x] Broad authenticated `USING true` / `WITH CHECK true` policies returned zero rows in live database verification
- [x] RLS enabled check passed for affected tables
- [x] Quotation RPC grants remained `anon_execute = false`, `authenticated_execute = false`, `service_role_execute = true`
- [ ] remaining production RLS hardening

### Phase 3 - Quotations RPC Foundation
Status: Completed

Checklist:
- [x] vat_rate
- [x] QT numbering
- [x] create RPC
- [x] update RPC
- [x] VAT residual adjustment
- [x] service_role-only RPC permissions
- [x] manual Supabase apply
- [x] build + health check
- [x] PR merged

### Phase 4 - Quotations Data Layer
Status: Completed

Checklist:
- [x] Audit data layer
- [x] Fix permission fallback issues if any
- [x] Confirm no Unauthorized/Forbidden becomes [] or null
- [x] Confirm schemas exclude trusted totals
- [x] Confirm RPC payload shape
- [x] Confirm safe error handling
- [x] Build
- [x] Commit
- [x] Push
- [x] PR
- [x] Merge
- [x] Update project docs after merge

**Definition of Done:**
- `getQuotations` and `getQuotationById` use `requirePermission("quotations:read")`
- create/update/delete actions use `requirePermission("quotations:write")`
- RPC calls pass correct payload
- no raw Supabase errors exposed
- `pnpm build` passes

### Phase 5 - Quotations UI Manual Entry
Status: Completed

**Note:** Phase 5 was split into Phase 5A (List + Create Form completed) and Phase 5B (Edit + Soft Delete completed).

Checklist:
- [x] Wire `/quotations` list to live data
- [x] Empty state
- [x] Access denied state
- [x] Loading/error states if implemented
- [x] Create quotation form
- [x] Dynamic manual line items
- [x] Client-side preview only comment
- [x] Call `createQuotation` action
- [x] Edit draft quotation
- [x] Prevent full edit for non-draft
- [x] Soft delete quotation
- [x] Manual test full quotation creation flow if confirmed
- [x] Build
- [x] Audit
- [x] Commit/Push/PR/Merge
- [x] Update docs

**Definition of Done:**
- user can create quotation manually
- user can add multiple items
- totals preview matches backend result
- backend RPC result is displayed/stored
- non-draft edit lock respected
- no Service Catalog required

### Phase 6 - Quotation Detail / Print
Status: Completed

Checklist:
- [x] Detail page uses real data
- [x] Items show real values
- [x] Customer info shown
- [x] Status badge
- [x] Browser print route
- [x] Print / Save as PDF wording
- [x] Print layout fix
- [x] Build/test/audit/merge
- [x] Update docs

**Note:** Phase 6 completed quotation detail + browser print using live data. Server-side PDF generation remains deferred.

### Phase BD - Business Domain Decisions
Status: Core ERP decisions resolved; leads/demo-data details remain deferred; supplier design direction documented

**Purpose:**
Confirm event-company workflow before invoice schema.

Approved decisions:
1. Quotations are always tied to Services in new ERP work.
2. Service / Booking replaces Project as the operational entity.
3. Required event fields remain flexible at inquiry stage, with the documented date direction:
   - `event_name`
   - `event_start_date`
   - nullable `event_end_date`
   - `event_venue`
   - `event_type`
4. Invoices are Service-linked and use deposit/final invoice types against an approved quotation basis.
5. Invoices must not claim official Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior until a real reviewed integration exists.

Still deferred:
- whether leads/inquiries are tracked before becoming customers
- supplier implementation after the completed supplier design package
- whether first demo data is fake, semi-real, or real

Acceptance criteria:
- [x] No invoice schema work starts before these decisions are documented.
- [x] Event date direction is documented: use `event_start_date` plus nullable `event_end_date`.
- [ ] Saudi partner/business owner confirms event types.
- [x] Deposit/final invoice decision is documented.
- [x] ZATCA/proforma direction is documented as no overclaiming or fake integration.
- [ ] Leads/inquiries decision is documented.
- [x] Vendors/suppliers design direction is documented in `SUPPLIERS-SCHEMA-DESIGN-1`; implementation remains future controlled work.
- [ ] Demo data security level is documented.
- [x] If `vat_rate` comes from company settings, it is only a default for new documents.
- [x] Every quotation/invoice stores its own `vat_rate` snapshot.
- [x] Changing company settings never changes old documents.

### Pre-Demo Security Check
Status: Required if demo uses real or semi-real data

Checklist:
- [ ] Confirm whether demo data is fake, semi-real, or real.
- [x] SEC-RLS-BASELINE-1 manual Supabase apply and database verification completed; DEV_ONLY broad authenticated policies were removed from the live database.
- [ ] If real/semi-real data is used, complete remaining production hardening and pre-demo controls before hosted demo: finalize the demo-data/security decision, verify Viewer bank masking, confirm raw error/security checks where applicable, and complete backup/monitoring/deployment readiness before production. The `company_settings` production RLS migration is already applied and verified.
- [x] Add explicit production RLS plan for `company_settings` because it contains bank, legal, and VAT data.
- [ ] Verify Supabase admin/service role usage stays server-side only.
- [x] Confirm no raw database/Supabase errors are exposed to UI. Manual browser smoke on `/services/[id]`, `/invoices` payment modal, and `/settings` showed only safe validation messages and no raw Supabase/Postgres/RPC/internal errors.
- [x] Confirm no secrets are present in committed files. Read-only audit found no real secrets in tracked repo files, docs, env examples, or client-facing code paths; `NEXT_PUBLIC_*` usage remains limited to safe publishable values and auth route URLs.
- [ ] Confirm auth redirects and Access Denied states are correct.
- [x] Verify Viewer opening `/settings` does not receive full IBAN, bank account holder, or bank account values in client data.
- [x] Global centered pending bolt UX is implemented and pushed.
- [x] Shared dashboard `Button` loading now triggers the global centered bolt pattern.
- [x] `GLOBAL-LOADING-CRUD-FORMS-1` completed and pushed in `bf3a4ba feat(ui): add global pending bolt to CRUD forms`.
- [x] Safe CRUD submit/save actions now use shared `Button loading={...}` for customer profile save, service create/edit, and supplier create/edit.
- [x] Manual smoke passed for the five covered CRUD actions, and validation passed before commit.
- [x] Supplier Allocation and Supplier Booking action flows use the global pending UX.
- [x] Dashboard loading route exists and uses the same bolt indicator.
- [x] No backdrop, visible loading text, or spinner is used.
- [x] `GLOBAL-PENDING-NAVIGATION-LOW-RISK-1A` completed and pushed in `6759de2 feat(ui): add global pending bolt to low-risk navigation`.
- [x] Low-risk dashboard navigation now uses delayed global pending bolt coverage for New Service, New Supplier, service/customer row detail navigation, service detail Back/Edit/customer links, customer detail Back/related service links, and service/supplier create-edit back/cancel.
- [x] Manual smoke passed for the covered low-risk navigation paths, and modifier-key / middle-click behavior was preserved.
- [x] `GLOBAL-PENDING-QUOTATION-FORMS-1` completed and pushed in `645eef0 feat(ui): add global pending bolt to quotation forms`.
- [x] Quotation create/update submit now uses shared `Button loading={isSubmitting}` and shows the global centered pending bolt during save/create.
- [x] Manual smoke passed for quotation create submit and quotation edit/update submit, with normal validation behavior preserved.
- [x] `GLOBAL-PENDING-INVOICE-CREATE-ACTIONS-1` completed and pushed in `468cd00 feat(ui): add global pending bolt to invoice create actions`.
- [x] Service detail deposit and final invoice create buttons now use shared `Button loading={isPending}` and show the global centered pending bolt during invoice creation.
- [x] Manual smoke passed for invoice create submit flows, with inline success/error messages and disabled guards preserved.
- [ ] Payment recording, service status, supplier allocation workflows, and admin users/RBAC row actions remain separate future follow-up work.

Historical Immediate Next Priorities:
- [x] `SUPPLIER-ACTIONS-PENDING-AUDIT-1` completed as a readonly audit; no code changes were made.
1. `P1` - `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1`: readonly inventory of shared Modal/Dialog/Toast/Dropdown paths and ownership before shell RTL implementation.
   - Result: no shared overlay primitive layer was found; current overlays are hand-rolled module-local modal blocks; Shell-1A is not blocked by shared overlays.
   - Follow-up: `I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1` is a deferred module-local modal RTL/accessibility review and is not a prerequisite blocker before Shell-1A.
1. `P2` - `I18N-RTL-SHELL-1A`: shell/navigation logical-direction refactor for `Sidebar`, `Topbar`, `PageHeader`, and `src/app/(dashboard)/layout.tsx`.
   - Implementation commit `3f627b1` is pushed.
   - Manual smoke passed with `G7_DEV_RTL=1` across dashboard/root route, customers, services, invoices, quotations, suppliers, payments, admin/users, and settings.
   - Sidebar moved right in dev RTL and the content offset remained usable.
   - Topbar/search remained usable.
   - G7 logo and object icons were not mirrored.
   - No DB/cookie/runtime persistence was introduced.
   - Shell-1B findings observed: DataTable and pagination inherit RTL and need a dedicated Shell-1B pass for page number order and prev/next behavior.
   - Shell-1B findings are not blockers for Shell-1A and must remain out of this docs sync.
1. `P3` - `I18N-RTL-MODULE-OVERLAYS-A11Y-REVIEW-1`: readonly review completed and deferred.
   - Overall result: DEFER.
   - Reviewed six module-local overlays: `RecordPaymentModal`, `SupplierBlacklistActions`, `AdminUsersClient`, `CustomersClient`, `CustomerProfileActions`, and `SupplierBookingActions`.
   - Main risk: accessibility hardening only, especially dialog semantics, `aria-modal` consistency, focus trap, escape-key handling, and focus return.
   - No supplier-cost leakage or customer-facing internal cost exposure found.
   - Future implementation task: `I18N-RTL-MODULE-OVERLAYS-A11Y-HARDEN-1`.
1. `P4` - `I18N-RTL-SHELL-1B`: shared data-component logical-direction refactor for `DataTable`, `PaginationFooter`, and `FilterBar`.
   - Implementation commit `7f4c19f` is pushed.
   - Manual smoke passed in RTL dev mode and LTR normal mode.
   - DataTable, PaginationFooter, and FilterBar are now direction-aware.
   - Page numbers remain ascending while prev/next presentation mirrors direction.
1. `P5` - `I18N-RTL-MODULE-TEXT-INVENTORY-1`: readonly module text inventory before runtime rollout.
    - Recommended next task.
   - Readonly inventory completed with overall result PASS and no file changes.
    - Must finish before `ARABIC-COPY-REVIEW-1` and before any runtime module translation pass.
    - Must record rollout order as Customers, Services, Quotations non-PDF surfaces, Invoices non-PDF surfaces, Payments, Suppliers, then Settings/Admin later.
1. `P6` - `ARABIC-COPY-REVIEW-1`: glossary/copy review before runtime module translation.
   - Readonly Arabic copy/glossary review completed with overall result PASS.
   - Canonical glossary decisions were recorded for customer, service, quotation, invoice, payment, supplier, admin, RBAC-sensitive, and mixed-direction rules.
   - Arabic copy is now ready for docs-sync approval; runtime rollout still waits for the docs commits/push sequence.
1. `P6A` - `I18N-RTL-CUSTOMERS-RUNTIME-1`: Customers runtime slice completed after copy review.
   - Senior review result: PASS.
   - Manual smoke result: PASS based on Mozfer visual/browser smoke.
   - Customers list LTR, Add Customer modal LTR, Customer profile LTR, Edit Profile modal LTR, and Dev RTL shell visual smoke all passed.
   - No runtime Arabic locale selector was introduced; `getLocale()` still resolves to `en`, so Arabic runtime labels remain indirectly reachable only.
   - Customers runtime pages now use `getLocale()` + Customers dictionary.
   - Revenue label was corrected to `Quoted Value` / `قيمة العروض`, customer statuses are dictionary-backed, and mixed-direction protections were added for customer numbers, phone, email, CR/VAT, dates, service numbers, and SAR values.
   - No PDF/document routes, schema/migrations, middleware/cookies, or shared UI refactor were touched.
1. `P6B` - `I18N-RTL-SERVICES-RUNTIME-1A`: Services runtime slice completed after copy review.
   - Senior review result: PASS.
   - Mozfer manual smoke result: PASS.
   - Services list, New Service form, Service detail, Edit Service form, and RTL dev shell all passed.
   - No runtime Arabic locale selector was introduced; `getLocale()` still resolves to `en`, so Arabic runtime labels remain indirectly reachable only.
   - Services runtime pages now use `getLocale()` + Services dictionary.
   - Service status family is dictionary-backed, `status-transitions` copy moved to dictionary-backed copy without changing behavior, and mixed-direction protections were added for service numbers, quotation numbers, SAR values, dates/date ranges, and customer references.
   - No billing/invoice action files, supplier allocation/booking files, allocation subflows, PDF/document routes, schema/migrations, middleware/cookies, RBAC, or shared UI refactor were touched.
1. `P6C` - `I18N-RTL-SERVICES-RUNTIME-1B`: Services billing/invoice action UI completed after copy review.
   - Senior review initially HOLD due disabled reason mapping mismatch.
   - FIX-1 aligned BillingPanel disabled reason mappings with real ServiceBillingState reason codes.
   - Focused re-review result: PASS.
   - Mozfer manual/browser smoke result: PASS.
   - Billing panel LTR passed.
   - Deposit/final invoice action UI passed or rendered unavailable states correctly.
   - Disabled reason messages passed.
   - RTL dev shell billing panel passed with minor non-blocking English-locale punctuation note.
   - No invoice routes, PDF/document routes, supplier allocation/booking files, schema/migrations, middleware/cookies, RBAC, or financial logic were touched.
1. `P6D` - `I18N-RTL-SERVICES-RUNTIME-1C`: Services supplier allocation/booking display panels completed after copy review.
   - Focused senior review result: PASS.
   - Mozfer manual/browser smoke result: PASS.
   - Supplier Allocations panel passed.
   - Supplier Bookings panel passed.
   - Cost/internal labels remained internal and permission-gated.
   - SBK numbers, supplier names, SAR values, dates, quantities, units, and notes remained readable.
   - RTL dev shell passed with minor non-blocking English-locale punctuation note.
   - No supplier action files, allocation subflows, RBAC/permission/cost visibility logic, invoice/payment/quotation/PDF/document routes, schema/migrations, middleware/cookies, or shared UI refactor were touched.
1. `P6E` - `I18N-RTL-SERVICES-RUNTIME-1D`: Services supplier action buttons/modals completed after copy review.
   - Focused senior review result: `PASS`.
   - Mozfer manual/browser smoke result: `PASS`.
   - Supplier allocation action copy passed.
   - Supplier booking action copy passed.
   - Destructive/cancel wording remained explicit.
   - Server action message mapping stayed safe, with fallback to original message for unmapped future errors.
   - RTL shell smoke passed visually for the service detail supplier action area.
   - No allocation subflow pages, lib supplier allocation/booking action logic, RBAC/permission/DB/action behavior, or cost leakage were touched.
   - Deferred navigation issue: `allocations/new` and browser back navigation do not show the global pending bolt; handle in a later `allocations/**` or navigation task.
1. `P6F` - `SERVICES-ALLOCATIONS-NAV-PENDING-BOLT-1`: allocation subflow navigation pending-bolt wiring completed after review.
    - Focused navigation review result: `PASS`.
    - Mozfer manual/browser smoke result: `PASS`.
    - New Allocation link now shows the global centered pending bolt.
   - Back to Service links now show the pending bolt.
   - App-controlled cancel/back navigation now uses pending navigation.
   - Post-success navigation after create/edit/cancel/delete/restore now triggers the centered bolt.
    - Native browser back remains untouched by design.
    - No action logic drift, permission/RBAC drift, DB/server action drift, i18n/copy drift, or cost/financial drift.
    - Previously deferred New Allocation/back navigation pending-bolt issue is resolved.
1. `P6G` - `I18N-RTL-SERVICES-RUNTIME-1E`: Services allocation subflow runtime i18n completed after review.
    - Focused senior review result: `PASS`.
    - Mozfer manual/browser smoke result: `PASS`.
    - New/Create Allocation page and form were localized.
    - Edit Allocation form was localized.
    - Cancel Allocation form was localized.
    - Delete Allocation form was localized.
    - Restore Allocation form was localized.
    - Restore flow was verified through Supplier Allocations -> Show Deleted -> Restore.
    - Destructive cancel/delete wording remained explicit.
    - Restore wording remained clear and non-destructive.
    - Supplier names, service number/title, quantities, units, SAR values, IDs, and dates remained readable.
    - Pending-bolt route navigation from the prior task remained preserved.
    - `Show Deleted` remains a local panel/filter toggle and does not show the global pending bolt by design.
    - No navigation helper files changed.
    - No lib supplier allocation action logic changed.
    - No RBAC/permission/DB/server action behavior changed.
    - No customer-facing PDF/document surfaces changed.
1. `P7` - Module rollout remains split into small controlled tasks, not a broad "translate everything" pass.
   - Recommended first runtime module candidate after planning/copy review: Customers.
   - Service remains the locked operational core; Booking terminology still needs care.
   - Supplier/internal cost labels remain RBAC-sensitive during translation work.
   - Document/PDF language, `document_locale`, and Customer `preferred_language` remain deferred.
1. `P4` - `INVOICE-LIST-ACTIONS-POLISH-1`: view/print icon polish, list action review, and pagination/page-size/go-to-page review.
1. `P8` - `DOCUMENT-FORM-LAYOUT-POLISH-1`: invoice/quotation form sections, line items, and totals panel polish.

- [x] `PAYMENTS-LIST-SORT-PAGINATION-1` completed and pushed in `844f2ec feat(payments): add ascending pagination to payments list`.
- [x] Payments list ordering now starts from the smallest/older payment sequence and the page shows 10 records per page with shared pagination controls.
- [x] Manual smoke passed for payment ordering, pagination, KPI counts, and unchanged payment-recording behavior.
- [x] `QUOTATIONS-FILTERS-FIX-1` completed and pushed in `3c19a28 fix(quotations): wire list filters`.
- [x] Quotations status and month filters now use controlled client-side state and pagination runs against filtered results.
- [x] `GLOBAL-PENDING-QUOTATION-NAVIGATION-1` completed and pushed in `29cdfb4 feat(ui): add global pending bolt to quotation navigation`.
- [ ] Remaining high-risk pending/action audits remain open for supplier allocation/booking actions, admin/users/RBAC actions, and other financial edge actions.
- [x] Plan rate limiting for sensitive Server Actions: quotation creation, quotation approval, invoice creation, payment recording, and settings update.
- [ ] Confirm UI hiding is not treated as security; server-side permission checks and server-side masking are required.

### Phase CS - Company Settings Mini
Status: CS-A committed on `main`; CS-B deferred

Checklist:
- [x] CS-A live singleton Company Settings only
- [x] server-only settings query/action modules
- [x] `settings:read` for reads and `settings:write` for updates
- [x] bank details visible only to Admin/Accountant in the app data flow
- [x] VAT mode defaults to `not_registered`
- [x] `company_settings.default_vat_percent` is only a default for new documents
- [x] logo upload deferred
- [x] live settings are not wired into invoice print views yet
- [x] Quotation snapshot wiring is completed
- [ ] Invoice snapshot wiring after CS-B design
- [ ] quotation/invoice documents keep their own `vat_rate` snapshots
- [ ] changing company settings never retroactively changes old quotations or invoices
- [x] Build/test/audit/merge
- [x] Update docs

### SETTINGS-EDIT-MODE-1
Status: Implemented / Repo-ready; manual browser smoke pending.

Checklist:
- [x] Protect Company Settings UI behind an Edit Settings toggle.
- [x] Prevent accidental modifications by making fields read-only by default.
- [x] Show `Save Changes` and `Cancel` only in edit mode.
- [x] Cancel discards unsaved changes.
- [x] The Edit button does not render for users without write permission.
- [x] Existing validation, permissions, and bank masking remain expected.

### Phase TAX-0 - Tax/ZATCA Wording Cleanup
Status: Required before ERP implementation unless explicitly accepted as a known risk

Checklist:
- [ ] Audit invoice, quotation, print, docs, and UI wording for premature tax/ZATCA/FATOORA claims.
- [ ] Keep `phase2_integrated` wording guarded as future-only until real integration exists.
- [ ] Confirm `not_registered` behavior remains VAT 0 and does not show Tax Invoice claims.
- [ ] Document any remaining tax wording risk before starting ERP implementation.
- [ ] Build/test/audit/merge if code changes are made.
- [ ] Update docs.

### Phase ERP-0 - Workflow Planning / Report Only
Status: Planned

Checklist:
- [ ] Confirm locked workflow: Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- [ ] Confirm Service replaces Project as the operational unit.
- [ ] Confirm no standalone quotations and no standalone invoices.
- [ ] Customer detail should show related Services.
- [ ] Customer detail should show related Quotations through Services.
- [ ] Customer detail should show related Invoices through Services.
- [ ] Customer detail should show related Payments through Invoices.
- [ ] Customer detail should later show Activity.
- [ ] Review schema/data migration impact without applying SQL.
- [ ] Produce implementation plan only; do not implement in ERP-0 unless explicitly approved.

### Phase ERP-1 - Services
Status: Historical DB foundation and app list/create/detail/edit milestone; later explicit guarded status transitions are documented in the current priority section above.

Checklist:
- [x] Add `services` table as the DB foundation for the operational unit linked to Customer Profile.
- [x] Use Service status machine in DB constraint: Inquiry, Quoted, Approved, Deposit Paid, In Progress, Completed, Cancelled.
- [x] Do not add a separate Confirmed status.
- [x] Use `event_start_date` and nullable `event_end_date` instead of only `event_date`.
- [x] Add DB constraint: `CHECK (event_end_date IS NULL OR (event_start_date IS NOT NULL AND event_end_date >= event_start_date))`.
- [ ] Keep event fields flexible at inquiry stage.
- [ ] Confirm event types with Saudi partner/business owner while avoiding immediate schema rework.
- [x] Add service number format `SVC-YYYY-0001`.
- [x] Generate service numbers server-side through `generate_document_number('service')`.
- [x] Preserve existing prefixes: `QT`, `INV`, `PAY`, `PRJ`; add `SVC`.
- [x] Add `sales_owner_id` planning field at DB level.
- [x] Require `cancellation_reason` when Service is cancelled.
- [ ] If no invoice/payment exists, allow simple cancellation.
- [ ] If invoice/payment exists, cancellation must not silently delete financial records.
- [x] Add `DEV_ONLY_services` for fake/dev data only.
- [x] SEC-RLS-BASELINE-1 migration prepared to remove `DEV_ONLY_services`.
- [x] Manually apply and verify SEC-RLS-BASELINE-1; DEV_ONLY broad authenticated policies were removed from the live database.
- [ ] Complete remaining production hardening before real/semi-real service data.
- [x] Verify ERP-1 Services DB state after manual Supabase SQL Editor apply.
- [x] Update `supabase/schema.sql` after post-apply verification.
- [x] Implement Services UI/routes/server actions for list/create/detail/edit.
- [x] Link Services from Customer Profile.
- [ ] Integration checkpoint after ERP-1 app layer: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Phase ERP-2 - Service-linked Quotations
Status: Planned

Checklist:
- [ ] Quotations must belong to a Service.
- [ ] No standalone quotation creation.
- [ ] Migrate quotation schema/app flow to use `service_id`; not done in ERP-1 DB foundation.
- [ ] Derive quotation `customer_id` server-side from the Service; do not trust client-submitted customer linkage.
- [ ] Allow one Service to have multiple Quotations.
- [ ] Do not add `UNIQUE(service_id)` to quotations.
- [ ] Customer Profile shows quotations through Services.
- [ ] Approval requires `quotations:approve`.
- [ ] Recommended approval roles: Admin and Manager.
- [ ] Sales can create/send quotations but cannot approve unless explicitly granted.
- [ ] Do not treat `quotations:write` as approval permission.
- [ ] Non-draft quotations must not be fully editable through ordinary `quotations:write`.
- [ ] Approved quotations must not be soft-deleted through ordinary `quotations:write`.
- [x] `valid_until` must be on or after issue date.
- [x] If Service Start Date exists, `valid_until` must be on or before `service.event_start_date`.
- [x] If Service Start Date is before Issue Date, quotation create/update is blocked.
- [x] Service Schedule is read-only context in quotation UI.
- [x] Issue Date is read-only.
- [x] `Quotation Valid Until` means offer expiry date, not service execution date.
- [x] Quotation validity validation is enforced in both UI and Server Actions.
- [ ] Expired quotations cannot be approved without renewal/extension or authorized override.
- [ ] Exact override behavior remains deferred.
- [ ] Client-submitted totals remain preview only; server/PostgreSQL logic calculates trusted totals.
- [ ] Integration checkpoint after ERP-2: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### RBAC-QUOTATIONS-APPROVE-1
Status: Ready for PR

Checklist:
- [x] Add `quotations:approve` to Manager in `src/lib/auth/permissions.ts`.
- [x] Keep `quotations:approve` separate from `quotations:write`.
- [x] Required before quotation approval flow and ERP-3 invoices.

### CUST-OFFICIAL-DETAILS-1
Status: CUST-OFFICIAL-DETAILS-1C manual smoke passed and ready for pre-commit review; next locked priority after customer review is SEC-SERVICE-INVARIANTS-1

Checklist:
- [x] Draft backward-compatible migration for customer type: Individual / Company.
- [x] Draft backward-compatible migration for legal name.
- [x] Draft backward-compatible migration for Commercial Registration number.
- [x] Draft backward-compatible migration for VAT number.
- [x] Draft backward-compatible migration for National Address fields.
- [x] Draft backward-compatible migration for billing email.
- [x] Draft backward-compatible migration for finance contact.
- [x] Draft backward-compatible migration for payment terms.
- [x] Draft backward-compatible migration for PO required flag.
- [x] Keep fields optional/conditional, not mandatory for all customers.
- [x] Review migration.
- [x] Manually apply and verify migration.
- [x] Update `supabase/schema.sql` after manual apply and verification.
- [x] Implement customer data layer + create UI + profile-only edit UI + profile card.
- [x] Keep official/billing fields optional/conditional in UI and validation.
- [x] Keep Individual customers free of company-only registration/billing fields in the mounted form UI.
- [x] Keep customer VAT number display separate from Tax Invoice/ZATCA behavior.
- [x] Mozfer manual smoke for CUST-OFFICIAL-DETAILS-1C passed.
- [ ] Future ERP-3 invoice buyer snapshot usage remains deferred to invoice implementation.

### LIST-PAGINATION-PARITY-1
Status: Follow-up; do not move ahead of critical/security blockers unless approved

Checklist:
- [ ] Customers list uses the same pagination pattern as `/quotations`.
- [ ] Services list uses the same pagination pattern as `/quotations`.
- [ ] Use 10 rows per page.
- [ ] Include Previous/Next controls.

### SEC-SERVICE-INVARIANTS-1
Status: SEC-SERVICE-INVARIANTS-1B merged; next locked priority is SERVICE-HUB-1

Checklist:
- [x] Verify active/non-deleted customer on service create.
- [x] Add linked-record guards before service soft delete.
- [ ] Extend service deletion guards for invoices/payments after ERP-3/ERP-4 add service-linked financial records.

### SERVICE-HUB-1
Status: SERVICE-HUB-1B implemented and ready for review/manual smoke

Checklist:
- [x] Build a minimal Service/Booking Hub detail page to replace the old user-facing project hub concept.
- [x] Include read-only status timeline.
- [x] Include service schedule.
- [x] Include customer context.
- [x] Include related quotations.
- [ ] Include future invoice/payment cards after ERP-3/ERP-4 provide real service-linked financial records.
- [ ] Leave notes/activity/attachments for later if not included in the first slice.
- [ ] Preserve Service as the operational source of truth.
- [ ] Add future controlled status transition actions; no transition automation is part of SERVICE-HUB-1B.

### QUOTE-APPROVAL-FLOW-1
Status: QUOTE-APPROVAL-FLOW-1B completed. Migration was manually applied and schema is synced. Admin smoke passed. Required before ERP-3 invoice creation.

Checklist:
- [x] Allow multiple draft quotations per Service for negotiation.
- [x] Prevent more than one approved quotation per Service.
- [x] Enforce `quotations:approve` separately from `quotations:write`.
- [x] Required before ERP-3 invoices can be created from Approved Quotation + Service.

### Phase ERP-3 - Service-linked Invoices
Status: In Progress

### ERP-3A Invoice Schema Foundation
Status: Manual Supabase apply completed / Verified

Checklist:
- [x] Add `service_id` to invoices.
- [x] Rename `quotation_id` to `approved_quotation_id`.
- [x] Rename `type` to `invoice_type` and add deposit/final CHECK constraint.
- [x] Add snapshot columns for seller, buyer, and quotation details.
- [x] Prepare composite FK linking invoice to quotation and service.
- [x] Manual Supabase apply.

### ERP-3B Invoice Generation (Upcoming)
Checklist:
- [ ] Invoices must belong to a Service.
- [ ] No standalone invoice creation.
- [ ] No invoice without Approved Quotation.
- [ ] Every invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- [ ] Deposit/final invoices must be created from Approved Quotation + Service.
- [ ] Invoice totals must derive from approved quotation snapshots, not arbitrary client input.
- [ ] Invoice numbering uses one shared `INV-YYYY-0001` sequence.
- [ ] Do not create separate `DEP-` or `FIN-` invoice sequences.
- [ ] Use `invoice_type = deposit | final`.
- [ ] Deposit Invoice is created manually after quotation approval.
- [ ] Deposit amount must be greater than `0`.
- [ ] Deposit amount must be less than or equal to the approved quotation total or remaining uninvoiced balance.
- [ ] Deposit is flexible and not fixed at 50%.
- [ ] Implement the locked invoice void/adjustment/reversal policy later; do not implement it in this roadmap sync.
- [ ] Preserve issued and paid financial records; do not allow financial deletion.
- [ ] Implement controlled adjustment/reversal and replacement with audit records under D03/D04.
- [ ] Use `Internal Credit Adjustment` for current non-VAT correction records; statutory Tax Credit Note, VAT, ZATCA, and FATOORA behavior remains out of scope.
- [ ] Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
- [ ] Financial rounding must be server-side/PostgreSQL-side using SAR 2-decimal rounding rules.
- [ ] Currency should be snapshotted on issued documents.
- [ ] Integration checkpoint after ERP-3: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Phase ERP-4 - Invoice-linked Payments
Status: Planned

Checklist:
- [ ] Payment must link to an Invoice.
- [ ] Payment is connected to Service through the Invoice.
- [ ] If `service_id` is stored on payments for query convenience, it must match the invoice's `service_id`.
- [ ] Enforce invoice/service consistency in the data layer and preferably DB design.
- [ ] If a customer pays before an invoice exists, require creating a Deposit Invoice first or prevent payment recording until an invoice exists.
- [ ] Payment recording updates invoice paid amount, balance due, and payment status.
- [ ] `Deposit Paid` requires a valid/cleared deposit payment.
- [ ] A Deposit Invoice alone does not confirm booking.
- [ ] A pending payment does not confirm booking.
- [ ] Deposit payment changes Service status to `Deposit Paid` only through a cleared Deposit Invoice payment.
- [ ] Prevent overpayment unless explicitly approved.
- [ ] Plan future refund/credit-note behavior with invoice void/cancellation design.
- [ ] Integration checkpoint after ERP-4: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Integration Verification Checkpoints
Status: Required between ERP phases

Checklist:
- [ ] After ERP-1 Services: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.
- [ ] After ERP-2 Service-linked Quotations: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.
- [ ] After ERP-3 Invoices: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.
- [ ] After ERP-4 Payments: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Phase 7A - Event-aware Invoice Schema + RPC Foundation
Status: Superseded by ERP-3; kept as historical planning note

Checklist:
- [ ] Invoice data model review
- [ ] Event fields included or explicitly deferred based on Phase BD
- [ ] Multi-invoice behavior included or explicitly deferred based on Phase BD
- [ ] Invoice numbering
- [ ] VAT/totals server-side
- [ ] PostgreSQL RPC if needed
- [ ] ZATCA/proforma nullable fields considered only after decision
- [ ] SQL proposed for review before migration file
- [ ] Manual Supabase apply only after approval
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 7B - Invoice Data Layer
Status: Planned

Checklist:
- [ ] Types
- [ ] Schemas
- [ ] Mappers
- [ ] Queries
- [ ] Server Actions
- [ ] RBAC: invoice read/write permissions
- [ ] safe error handling
- [ ] no client-trusted totals
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 7C - Invoice UI
Status: Planned

Checklist:
- [ ] Convert approved quotation to invoice
- [ ] Invoice list
- [ ] Invoice detail
- [ ] Create/edit behavior based on approved schema
- [ ] Status handling
- [ ] Access denied and auth behavior
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 7D - Invoice Browser Print
Status: Planned

Checklist:
- [ ] Browser print route
- [ ] Print / Save as PDF wording
- [ ] Company settings integration
- [ ] ZATCA basics note only, do not claim full compliance
- [ ] Server-side PDF remains deferred unless explicitly approved
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 8 - Payments
Status: Superseded by ERP-4; kept as historical planning note

Checklist:
- [ ] Payment create/list/detail
- [ ] Link payments to invoices
- [ ] Partial/full payment handling
- [ ] Invoice payment status update
- [ ] Receipts if needed
- [ ] Build/test/audit/merge
- [ ] Update docs

### Services / Operations View
Status: Superseded by ERP-1 Services / Operations planning

Checklist:
- [ ] Treat Service as the first-class operational module.
- [ ] Create and manage Service from Customer Profile.
- [ ] Service status tracking.
- [ ] Operations view
- [ ] Build/test/audit/merge
- [ ] Update docs

### Dashboard Real Data
Status: Planned

Checklist:
- [ ] Replace dashboard mock data
- [ ] Revenue summary
- [ ] quotations/invoices/payments counts
- [ ] recent activity
- [ ] Build/test/audit/merge
- [ ] Update docs

### ADMIN-USER-MANAGEMENT-1
Status: 1C-B implemented; real Clerk invitation/webhook smoke testing remains pending.

Checklist:
- [x] 1A Admin User Management Design Report
- [x] 1B Build `Admin > Users` / `/admin/users`
- [x] 1B Implement Admin-only invite action using Clerk Invitations API
- [x] 1B Store intended role as invitation metadata / `publicMetadata` unless SDK verification proves otherwise
- [x] 1B Implement `user.created` webhook with verified signature
- [x] 1B Create `app_users` row after accepted invite using `clerk_user_id`
- [x] 1B Validate invitation role against the CRM role whitelist
- [x] 1B Reject invalid/missing webhook role metadata without creating `app_users`
- [x] 1B Ensure final authorization uses only `app_users.role`
- [x] 1B Enforce `users:invite` and `users:manage`
- [x] 1C-B Implement server-side last-active-admin protection
- [x] 1C-B Block deactivating the final active admin
- [x] 1C-B Block changing the final active admin to a non-admin role
- [x] 1C-B Replace native revoke invitation `confirm()` with a CRM-styled modal
- [x] 1C-B Keep real Clerk invitation/webhook smoke testing pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer approves a real test invitation/user
- [x] 1C-B Avoid SQL, migrations, package, environment, schema, and real Clerk user/invitation changes

### Service Catalog
Status: Deferred as productivity enhancement, not blocking core financial demo

Checklist:
- [ ] Catalog-style service item table migration if still needed; this is separate from the ERP-1 operational `services` table.
- [ ] services CRUD
- [ ] services permissions
- [ ] `/services` page
- [ ] quotation form dropdown
- [ ] selected service fills description/category/unit_price
- [ ] quotation item remains snapshot-editable
- [ ] Build/test/audit/merge
- [ ] Update docs

### Audit Logs
Status: Deferred

Checklist:
- [ ] identify important actions
- [ ] log creates/updates/deletes/status changes
- [ ] admin audit view
- [ ] Build/test/audit/merge
- [ ] Update docs

### Security Hardening
Status: Required before hosted demo with real/semi-real data and before production

Checklist:
- [x] prepare SEC-RLS-BASELINE-1 migration to remove `DEV_ONLY` RLS policies
- [x] manually apply and verify SEC-RLS-BASELINE-1
- [x] verify DEV_ONLY policies returned zero rows
- [x] verify broad authenticated `USING true` / `WITH CHECK true` policies returned zero rows
- [x] verify RLS enabled check passed for affected tables
- [x] verify quotation RPC grants remained service-role only
- [ ] add explicit production RLS plan for `company_settings`
- [ ] review Supabase anon usage
- [ ] verify admin client server-only
- [ ] secret scan
- [ ] raw error audit
- [ ] rate limiting for sensitive Server Actions: quotation creation, quotation approval, invoice creation, payment recording, settings update
- [ ] Viewer bank-detail masking test: `/settings` client data must not include full IBAN, bank account holder, or bank account values
- [ ] webhook signature verification
- [ ] Build/test/audit/merge
- [ ] Update docs

### QA / Deployment / Demo
Status: Planned

Checklist:
- [ ] production Supabase setup
- [ ] deployment setup
- [ ] demo data
- [ ] demo script
- [ ] final smoke test
- [ ] client handoff notes
- [ ] Update docs

## Backlog / UX & Admin Follow-up

### Future Billing & Accounting Enhancements
Status: Pending

INVOICE-LIST-DEEP-LINK-SELECTION-1
- Priority: P1
- Status: Pending
- Description: Support `/invoices?invoiceId=<id>` so invoice links from related workflow pages can open the existing invoices list with the correct invoice selected in the existing side panel.
- Note: This is separate from `QUOTE-TO-DEPOSIT-CTA-1` and was NOT implemented in commit `103e0fa`.

BILLING-FLEXIBILITY-1
Status: Complete (Manual Smoke Passed)
- Deposit is optional, not mandatory.
- Direct Final Invoice without Deposit must be supported.
- Prevent duplicate active final invoices.

PAYMENT-EVIDENCE-1
- Bank transfer payments should require reference/transaction ID.
- Receipt/proof attachments should be supported.
- Future workflow should support pending → confirmed.

PAYMENTS-LIST-LIVE-1
- Status: Completed.
- Implemented in commit `f4471a2 feat(payments): show live payment records`.
- `/payments` now uses live read-only payment records through `getPaymentsList` and no longer renders mock `paymentsData` rows as real records.
- Manual smoke passed with `PAY-2026-0005` linked to `INV-2026-0007`; payment count changed from `4` to `5`; confirmed collected changed from `SAR 27,499.95` to `SAR 32,503.04`.
- Payment recording, invoice balances/status formulas, SQL, schema, migrations, packages, and tax/ZATCA behavior were unchanged.

MOCK-DATA-AUDIT-1
- Status: Pending.
- Audit remaining mock/static app surfaces before replacing individual summaries and lists. `/dashboard` summary/sample rows were completed under `DASHBOARD-LIVE-SUMMARY-1`; `/suppliers` live read-only replacement was completed under `SUPPLIERS-LIVE-READ-FOUNDATION-1`.

INVOICE-KPI-LIVE-1
- Status: Completed.
- Implemented in commit `d89b520 fix(invoices): derive KPI cards from live invoices`.
- `/invoices` KPI cards now derive from live invoice list data.
- Static/mock invoice KPI values were removed: `TOTAL OUTSTANDING: SAR 2.4M`, `OVERDUE (30+ DAYS): SAR 450K`, `RECEIVED THIS MONTH: SAR 1.2M`, `12 Invoices`, and `+18% vs Last Month`.
- Manual smoke passed with `Total Outstanding: SAR 0.00`, `Open Invoices: 0`, and `Total Collected: SAR 32,503.04`.
- Invoice table/list behavior, invoice creation, payment recording, invoice balance/status formulas, SQL, schema, migrations, packages, dashboard, suppliers, payments page, and tax/ZATCA behavior were unchanged.

DASHBOARD-LIVE-SUMMARY-1
- Status: Completed.
- Implemented in commit `d25cb17 fix(dashboard): show live summary data`.
- `/dashboard` now uses live/read-only data where permissions allow.
- Static/mock dashboard values were removed: `Total Customers: 1,248`, `Active Quotations: 342`, `Pending Invoices: 89`, `Monthly Revenue: SAR 2.4M`, `Pending Payments: SAR 450K`, and sample rows such as Saudi Aramco / NEOM, Riyadh Season, Jeddah Corniche, and fake SAR sample quotation amounts.
- Manual smoke passed with `Total Customers: 14`, `Total Quotations: 12`, `Open Invoices: 0`, `Services: 8`, `Total Collected: SAR 32,503.04`, and `Pending Balance: SAR 0.00`.
- Recent Quotations now renders live quotation rows or a safe empty/unavailable state.
- Customer, quotation, invoice, payment, and service write paths, invoice balance formulas, payment recording, SQL, schema, migrations, packages, and tax/ZATCA behavior were unchanged.

SUPPLIERS-SCHEMA-DESIGN-1
- Status: Completed and pushed.
- Implemented in commit `e85adec spec(suppliers): add supplier module design artifacts`.
- Schema/design/spec phase is complete only as Spec Kit design artifacts under `specs/002-suppliers-schema-design/`: `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `tasks.md`.
- This did not implement live supplier UI, supplier CRUD, supplier invoices/payments, Supplier Bookings, or Service P&L reporting.
- Preserve current workflow rules: no SQL/migration/Supabase actions without review and approval; no supplier cost/margin exposure in customer-facing documents; no Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior while `company_settings.vat_mode = not_registered`.

SUPPLIERS-DB-FOUNDATION-1
- Status: DB foundation completed and pushed; supplier implementation remains partial.
- Migration `supabase/migrations/20260627153000_supplier_directory_foundation.sql` was committed and pushed in `ee50e60 feat(suppliers): add directory foundation migration`.
- Manual Supabase apply was completed and verified: required supplier foundation columns exist, `on_hold` is supported by the supplier status lifecycle, supplier VAT registration status constraint exists, RLS remains enabled on `public.suppliers`, no DEV_ONLY supplier policies were found, no broad anon/authenticated supplier policies were found, and no future supplier financial/scope tables were created.
- `supabase/schema.sql` was synced and pushed in `ed61fb7 chore(suppliers): sync schema after directory foundation`.
- This completed only the supplier directory DB foundation. Supplier write CRUD, supplier rate cards, service supplier allocations, Supplier Bookings, supplier invoices, supplier payments, Supplier Booking PDF/WhatsApp/email, supplier portal, supplier costing/margin/P&L reports, and payment approval workflow remain deferred.

SUPPLIERS-LIVE-READ-FOUNDATION-1
- Status: Completed and pushed.
- Implemented in commit `1fbf77e feat(suppliers): add live read-only directory`.
- `/suppliers` now reads live supplier records from `public.suppliers` through a server-side supplier query layer, UI-safe mapper/types, and read-only client list/detail UI.
- Permission gate uses `suppliers:read`; this slice does not use `suppliers:write`.
- Verification passed: lint passed with only existing PDF `<img>` warnings; `pnpm exec tsc --noEmit` passed; no bank/IBAN fields were selected, mapped, typed for UI, or rendered.
- No create/edit/delete/restore behavior, SQL/schema/migration changes, or supplier finance/future modules were introduced.
- Historical read-only-slice deferrals were supplier create/edit/delete/restore CRUD and supplier write actions/server actions; those are superseded by `G7-SUPPLIERS-V1-DIRECTORY-AND-LIST-UX`. At that milestone, supplier rate-card runtime workflows were deferred; the later bounded Rate Card V1 capability is recorded in this document's current delivered baseline as present, while broader Supplier Bookings, supplier invoices/payments, Supplier Booking PDF/WhatsApp/email, supplier portal, supplier costing/margin/P&L reports, and payment approval workflow remain deferred.

SUPPLIERS-CREATE-FORM-1
- Status: Completed and pushed.
- Implemented in commit `05affcd feat(suppliers): add create form`.
- Create-only supplier flow is complete: create form/page, validation, server action, and list navigation.
- At that milestone stage, this was not full Supplier CRUD. Supplier Delete/Restore was subsequently implemented in `G7-SUPPLIERS-V1-DIRECTORY-AND-LIST-UX`.

SUPPLIERS-CREATE-UX-FIX-1
- Status: Completed and pushed.
- Implemented in commit `9ed7a59 fix(suppliers): refine create ui`.
- Team Lead create-flow UI/UX fixes are complete.
- Basic profile Supplier Edit is complete. Supplier Delete/Restore was subsequently implemented in `G7-SUPPLIERS-V1-DIRECTORY-AND-LIST-UX`.
- Supplier finance/workflow modules remain deferred: rate cards runtime workflows, allocations, Supplier Bookings, supplier invoices/payments, Supplier Booking PDF/WhatsApp/email, supplier portal, costing/margin/P&L, and payment approval workflow.

G7-SUPPLIERS-V1-DIRECTORY-AND-LIST-UX
- Status: Supplier Directory V1 implementation is complete and user-owned runtime smoke passed in local DEV/DEMO; this is not a production-readiness or RLS claim.
- `/suppliers/[id]` now provides responsive detail, while the directory uses a safe summary DTO and server-backed 10-row pagination that preserves search and lifecycle filters.
- Required create/edit validation, VAT pairing, lifecycle and blacklist workflows, Admin-only bank access, and Admin-only soft delete/restore are implemented. Delete checks active allocations/bookings in the application layer and is not transactional.
- Static Supplier data, UUID fallback display, and `recent_project` remnants are removed. Supplier invoices, payables, outbound payments, accounting workflows, and Accountant Supplier-bank access remain deferred.
- Customers, Services, Quotations, and Invoices use the matching accessible eye-only View control without changing their business actions.

SUPPLIERS-EDIT-FORM-1
- Status: Completed and pushed.
- Implemented in commit `9f87566 feat(suppliers): add edit form`.
- Scope allows updating basic, safe, non-sensitive supplier profile fields only.
- Enforces `suppliers:write` on edit page and update server action.
- Prefills existing safe data. Soft-deleted records are protected.
- Sensitive banking and blacklist audit fields remain excluded.
- Lint and TypeScript compile successfully with zero errors.
- Other supplier modules (finance, rate cards runtime workflows, delete/restore, blacklist workflows) remain deferred.

SUPPLIERS-EDIT-OPTIONAL-FIELDS-FIX-1
- Status: Completed and pushed.
- Implemented in commit `7df51f4 fix(suppliers): preserve optional edit fields`.
- Scope fixes optional supplier edit field persistence: CR Number, VAT Number, and Internal Notes.
- Manual smoke testing found that these fields were previously initialized to empty strings `""` instead of their database values from the `supplier` prop, resetting them to `null` on save.
- Fixed by hydrating `crNumber`, `vatNumber`, and `notes` states from the supplier prop. Manual smoke tests passed successfully after implementation.
- No other fields or modules were modified. Sensitive banking/blacklist fields remain excluded.

SUPPLIERS-STATUS-BLACKLIST-1
- Status: Completed and pushed.
- Implemented in commit `92617ef feat(suppliers): add blacklist workflow`.
- Scope: Implemented dedicated supplier blacklist/unblacklist workflow with reason modal, recording `blacklisted_reason`, `blacklisted_by`, and `blacklisted_at` in the database.
- Details: Blacklist details are shown inside the supplier side panel, unblacklisting restores the status to `inactive`, and normal Supplier Edit form updates are validated to prevent bypassing the workflow. Layout flexbox fixes in side panel and Zod refinement fixes included. Manual smoke and validation passed.

SUPPLIERS-RATE-CARDS-FOUNDATION-1A
- Implemented in commits `6a2804d feat(suppliers): add rate cards foundation` and `87c714c chore(suppliers): sync schema after rate cards foundation`.
- Scope: Supplier rate cards database table, RLS enablement without broad policies, and app-level `supplier_costing:read` / `supplier_costing:write` permissions assigned to Admin and Manager. Accountant, Sales, Operations, and Viewer do not have supplier costing permissions in this MVP slice.
- Details: Foundation table and permissions completed. Migration manually applied and schema synced. The full supplier rate cards feature is not yet complete. Supplier rate cards contain internal cost data and must never appear in customer-facing quotations, invoices, PDFs, receipts, broad supplier list views, or unauthorized role views. Runtime workflows remain deferred.

SUPPLIERS-RATE-CARDS-READ-1
- Status: Completed.
- Implemented in commit `da5bc86 feat(suppliers): add read-only rate cards view`.
- Scope: Internal read-only Supplier Rate Cards view added to the existing Supplier side panel.
- Details: Visible only to Admin/Manager users with `supplier_costing:read`. Unauthorized roles (Accountant, Sales, Operations, Viewer) do not see the Rate Cards section. Enforces server-side `requirePermission("supplier_costing:read")` before using `createAdminClient()`. Reads `supplier_rate_cards` filtered by `supplier_id` and `is_deleted = false`. Displays non-deleted rate cards sorted active first and newest `valid_from` first. Internal notes are displayed only inside the authorized internal Supplier side panel.
- Validation: `pnpm run lint` passed with only the two known existing PDF `<img>` warnings, `pnpm exec tsc --noEmit` passed, and `pnpm run build` passed.

FUTURE SUPPLIER SEQUENCE
- SUPPLIERS-RATE-CARDS-READ-1 is complete.
- SUPPLIER-ALLOCATIONS-FOUNDATION-1A is complete.
- SUPPLIER-ALLOCATIONS-SCHEMAS-1A is complete.
- SUPPLIER-ALLOCATIONS-READ-1A is complete.
- SUPPLIER-ALLOCATIONS-CREATE-MANUAL-1A is complete.
- SUPPLIER-ALLOCATIONS-CANCEL-1A is complete.
- SUPPLIER-ALLOCATIONS-UPDATE-MANUAL-1A is complete.
- SUPPLIER-ALLOCATIONS-SERVICE-UI-PANEL-1A is complete.
- SUPPLIER-ALLOCATIONS-SERVICE-UI-CREATE-1B is complete.
- SUPPLIER-ALLOCATIONS-SERVICE-UI-EDIT-1C is complete.
- SUPPLIER-ALLOCATIONS-SERVICE-UI-CANCEL-1D is complete.
- SUPPLIER-ALLOCATIONS-DELETE-RESTORE-1 is complete (Manual Supplier Allocation lifecycle is now closed).
- SUPPLIER-ALLOCATIONS-RATE-CARD-CREATE-1 is complete (Rate-card allocation creation).
- Supplier Booking foundation and Service-scoped operational V1 slices below show completed progress; only broader routes, portals, financial workflows, capacity/overlap, and status expansion remain future work.
  1. SUPPLIER-ALLOCATIONS-RATE-CARD-AUTOMATION-1 (Rate-card allocation automation / overlap enforcement / etc)
  2. SUPPLIER-BOOKINGS-SCHEMAS-1A: CLOSED
  3. SUPPLIER-BOOKINGS-PERMISSIONS-1A: CLOSED
  4. SUPPLIER-BOOKINGS-QUERIES-1A: CLOSED
  5. SUPPLIER-BOOKINGS-NUMBERING-DB-1: CLOSED
  6. SUPPLIER-BOOKINGS-ACTIONS-1A: CLOSED
  7. SUPPLIER-BOOKINGS-UI-1A-DESIGN-REVIEW: CLOSED
  8. SUPPLIER-BOOKINGS-UI-1A: CLOSED
  9. SUPPLIER-BOOKINGS-UI-1A-SMOKE-VERIFY: CLOSED (PASS WITH WARN; minor loading/pending indicator UX warning recorded)
  10. SUPPLIER-BOOKINGS-BROADER-ROUTES-PDFS-MESSAGES-PORTAL-1: FUTURE (standalone Supplier Booking routes, Supplier Booking PDFs, WhatsApp/email, supplier portal, edit/delete/restore, and status expansion)
  11. SUPPLIER-INVOICES-1: FUTURE
  12. SUPPLIER-PAYMENTS-1: FUTURE
  13. SUPPLIER-COSTING-MARGIN-REPORTS-1: FUTURE (actual supplier costs and profit/margin reporting)

SUPPLIER-ALLOCATIONS-DESIGN-1 (Completed, Design Approved)
- Status: Completed. Spec sync only.

SUPPLIER-ALLOCATIONS-FOUNDATION-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `bc3db52 feat(suppliers): add allocation foundation`
  - `46881ee chore(supabase): sync supplier allocation schema`
- Scope: Database and permissions foundation for Supplier Allocations.
  - Table `public.service_supplier_allocations` created (migration `20260629100000_service_supplier_allocations_foundation.sql` applied).
  - Columns, generated column `estimated_total_cost`, triggers (`check_service_supplier_allocations_immutable_service_id_trg`, `update_service_supplier_allocations_updated_at`), indexes, and RLS (no policies, server-only access) are synced in `supabase/schema.sql`.
  - Permissions added in `src/lib/auth/permissions.ts` for Admin and Manager: `supplier_allocations:read`, `supplier_allocations:read_cost`, `supplier_allocations:write`, `supplier_allocations:cancel`.
  - Operations, Sales, Viewer, and Accountant have no access. No `supplier_allocations:approve` exists.
- Boundaries:
  - Database/permissions foundation only. Runtime CRUD, Server Actions, UI panels, Service Detail integration, allocations history are NOT implemented.
  - Business logic validation rules (e.g. rate card ID matches supplier ID, approved quotation ID matches service ID, blacklisted supplier blocks, parent service cancellation blocks) are deferred to future server-side validation/runtime hardening.
- Supplier Booking must not be implemented before SUPPLIER-ALLOCATIONS-1.

SUPPLIER-ALLOCATIONS-SCHEMAS-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `e5a20ee feat(suppliers): add allocation schemas`
- Scope: Domain types, Zod schemas, and mappers for Supplier Allocations.
  - Implemented under `src/lib/supplier-allocations/`.
  - Defined `SupplierAllocationStatus` (`draft`, `planned`, `selected`, `cancelled`) and `SupplierAllocationCostSource` (`rate_card`, `manual_estimate`).
  - Implemented DB row type (`SupplierAllocationRow`) and domain type (`SupplierAllocation`), with `estimatedUnitCost`, `estimatedTotalCost`, and `rateCardSnapshot` marked as nullable to support cost redaction.
  - Implemented Zod schemas for validation: `supplierAllocationCreateSchema` (requires `serviceId` and `supplierId`; conditionally requires rate card snapshot/ID for `rate_card` cost source), `supplierAllocationUpdateSchema` (disallows `serviceId` updates and status `cancelled`), `supplierAllocationCancelSchema` (requires `cancelledReason`), and status/cost source schemas.
  - Implemented mappers with `canReadCost` option to redact cost-related fields when permission check fails.
  - Added security boundary comments ensuring cost data remains internal-only and mappers are kept separate from UI/Auth/Supabase imports.
- Boundaries:
  - Runtime CRUD, Server Actions, DB queries, UI panel, Service Detail integration, allocations history, and SQL/migration changes are NOT implemented.

SUPPLIER-ALLOCATIONS-READ-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `1d874cc feat(suppliers): add allocation read queries`
- Scope: Server-only read query module for Supplier Allocations.
  - Implemented server-only read queries in `src/lib/supplier-allocations/queries.ts` and exported in `src/lib/supplier-allocations/index.ts`.
  - Added query functions:
    - `getSupplierAllocationsByServiceId(serviceId)`
    - `getSupplierAllocationsBySupplierId(supplierId)`
    - `getSupplierAllocationById(id)`
- Permissions & Cost Redaction:
  - Every read query requires `supplier_allocations:read` via `requirePermission("supplier_allocations:read")` (re-throwing auth/permission errors).
  - Cost exposure is computed server-side using `checkPermission("supplier_allocations:read_cost")` to check permission and pass `canReadCost` into mappers.
  - Mappers redact `estimatedUnitCost`, `estimatedTotalCost`, and `rateCardSnapshot` server-side when `canReadCost` is false.
  - Raw DB rows are never returned to callers; only mapped `SupplierAllocation` domain objects are returned.
  - Customer-facing routes/PDFs must not import allocation read queries for cost-bearing data.
- DB Filtering & Query Behavior:
  - Queries target the `public.service_supplier_allocations` table using `createAdminClient()` behind application-level permission gates.
  - All reads filter out deleted allocations with `eq("is_deleted", false)`.
  - List queries are ordered by `created_at` descending.
  - Cancelled allocations are intentionally returned as historical planning records (no status filtering).
  - DB errors are logged via `console.error` and handled gracefully by returning `[]` (lists) or `null` (single record).
- Boundaries:
  - Write actions, Server Actions, UI panels, Service Detail integration, allocations history UI, and SQL/migration changes are NOT implemented.

SUPPLIER-ALLOCATIONS-CANCEL-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `b383f85 feat(suppliers): add allocation cancel action`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Action Facts:
  - `cancelSupplierAllocation(id, input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
  - Existing export path remains `src/lib/supplier-allocations/index.ts`.
  - Uses `"use server"`.
  - Returns project ActionResult pattern with SupplierAllocation.
  - Requires `supplier_allocations:cancel`.
  - Does not use `supplier_allocations:write` as substitute.
  - Uses `user.clerk_user_id` for `cancelled_by` and `updated_by`.
  - Validates `id` as a non-empty string from function argument.
  - Uses `supplierAllocationCancelSchema.safeParse`.
  - Requires `cancelledReason`.
  - Does not accept client-provided `status`, `cancelled_at`, `cancelled_by`, or `is_deleted`.
  - Loads existing allocation from `service_supplier_allocations` with `id` and `is_deleted = false`.
  - Missing allocation returns a client-safe not found error.
  - Already cancelled allocation returns a client-safe already-cancelled error.
  - Parent Service status does not block cancellation.
- Update Payload Safety:
  - Cancel is business cancellation only.
  - Cancel preserves row for history/audit.
  - Cancel does not hard delete.
  - Cancel does not set `is_deleted`.
  - Update payload is strictly cherry-picked.
  - Updated fields are only: `status`, `cancelled_reason`, `cancelled_at`, `cancelled_by`, `updated_by`.
  - Does not update `service_id`, `supplier_id`, `approved_quotation_id`, cost fields, rate-card fields, `created_by`, `created_at`, deleted fields, or item/scope fields.
- Security/Return Behavior:
  - Updated row is mapped through `mapSupplierAllocationRow`.
  - `canReadCost` is computed via `supplier_allocations:read_cost`.
  - Returned data respects cost redaction.
  - Raw DB rows are not returned.
  - Supabase/internal errors are logged server-side and returned as generic client-safe messages.
  - Successful cancel revalidates `/services` and `/services/[id]`.
- Boundaries:
  - Runtime cancel action is implemented.
  - Supplier Allocations full write layer is not complete.
  - CRUD is not complete.
  - Update action remains deferred.
  - Delete/restore actions remain deferred.
  - Rate-card allocation creation and server-side snapshot generation remain deferred.
  - Service detail UI panel remains deferred.
  - Supplier allocation history UI remains deferred.
  - Supplier Booking remains deferred.
  - Supplier invoices/payments remain deferred.
  - Supplier costing/margin reports remain deferred.
  - Rate-card-driven quotation automation remains deferred.
  - Customer-facing supplier cost exposure remains forbidden/deferred.

SUPPLIER-ALLOCATIONS-CREATE-MANUAL-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `3b2364d feat(suppliers): add manual allocation create action`
- Action Facts:
  - `createSupplierAllocation(input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
  - `actions.ts` uses `"use server"`.
  - The action returns the project ActionResult pattern.
  - The action requires `supplier_allocations:write`.
  - The action uses `user.clerk_user_id` for both `created_by` and `updated_by`.
  - The action uses `supplierAllocationCreateSchema.safeParse`.
  - The action rejects `costSource = rate_card` as not yet supported.
  - The action forces `status = draft` server-side.
  - The action does not allow selected/cancelled creation.
  - The action does not trust client-provided identity fields.
  - The action does not accept or insert `estimated_total_cost`.
  - The action does not insert `supplier_rate_card_id` or `rate_card_snapshot` in this slice.
- Cross-Table Validation Facts:
  - Parent Service must exist.
  - Parent Service must not be deleted.
  - Parent Service status must not be Cancelled.
  - Parent Service status must not be Completed.
  - Supplier must exist.
  - Supplier must not be deleted.
  - Supplier status must be active.
  - Optional `approvedQuotationId` must reference an existing quotation.
  - Optional `approvedQuotationId` must reference a not-deleted quotation.
  - Optional `approvedQuotationId` must belong to the same service.
  - Optional `approvedQuotationId` must have status approved.
  - Valid `approvedQuotationId` is inserted as `approved_quotation_id`.
- Insert Payload & Return Safety Facts:
  - Insert payload is strictly cherry-picked.
  - Generated fields are excluded from client-controlled input.
  - Audit/default fields are excluded from client-controlled input.
  - Created row is mapped through `mapSupplierAllocationRow`.
  - `canReadCost` is computed via `supplier_allocations:read_cost`.
  - Returned data respects cost redaction.
  - Raw DB rows are not returned.
  - Supabase/internal errors are logged server-side.
  - Client receives generic safe errors, not internal DB details.
  - Successful create revalidates `/services` and `/services/[id]`.
- Boundaries:
  - Runtime manual create action is implemented.
  - Supplier Allocations full write layer is not complete.
  - CRUD is not complete.
  - Update action remains deferred.
  - Cancel action remains deferred.
  - Delete/restore actions remain deferred.
  - Rate-card allocation creation remains deferred.
  - Server-side rate-card snapshot generation remains deferred.
  - Service detail UI panel remains deferred.
  - Supplier allocation history UI remains deferred.
  - Supplier Booking remains deferred.
  - Supplier invoices/payments remain deferred.
  - Supplier costing/margin reports remain deferred.
  - Rate-card-driven quotation automation remains deferred.
  - Customer-facing supplier cost exposure remains forbidden/deferred.

SUPPLIER-ALLOCATIONS-UPDATE-MANUAL-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `486bdb9 feat(suppliers): add manual allocation update action`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Action Facts:
  - `updateSupplierAllocation(id, input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
  - Existing export path remains `src/lib/supplier-allocations/index.ts`.
  - Uses `"use server"`.
  - Returns project ActionResult pattern with SupplierAllocation.
  - Requires `supplier_allocations:write`.
  - Does not use `supplier_allocations:cancel`.
  - Uses `user.clerk_user_id` for `updated_by`.
  - Enforces `canReadCost` redaction using `checkPermission("supplier_allocations:read_cost")`.
  - Validates `id` as a non-empty string.
  - Uses `supplierAllocationUpdateSchema.safeParse`.
  - Schema no longer requires `supplierId` because `supplier_id` is immutable.
  - Does not allow client control of `id`, `serviceId`, `supplierId`, `estimatedTotalCost`, `supplierRateCardId`, `rateCardSnapshot`, audit fields, cancellation fields, and deletion fields.
- Existing Allocation checks:
  - Loads row by `id` and `is_deleted = false`.
  - Rejects missing allocations with client-safe error.
  - Rejects update if allocation is already `cancelled`.
  - Rejects update if allocation `cost_source` is `rate_card` (remaining deferred).
- Cross-Table Validation:
  - Loads parent Service by `existingAllocation.service_id`. Blocks if missing, deleted, `Cancelled`, or `Completed`.
  - Loads Supplier by `existingAllocation.supplier_id`. Blocks if missing, deleted, or status is not `active` (rejects `inactive`, `on_hold`, `blacklisted`).
  - Supplier cannot be changed by the action.
- Manual-Only / Rate-Card Boundary:
  - Only updates `manual_estimate` allocations.
  - Rejects `costSource === "rate_card"`.
  - Leaves `supplier_rate_card_id` and `rate_card_snapshot` untouched.
  - Rate-card creation/snapshot generation remain deferred.
- Status Transitions:
  - Transition guard strictly enforces:
    - `draft -> draft/planned`
    - `planned -> planned/selected`
    - `selected -> selected`
  - Blocked:
    - `any -> cancelled` (cancel action only)
    - `cancelled -> any`
    - `planned -> draft`
    - `selected -> planned/draft`
  - Omitted status preserves existing status safely.
- Payload Safety:
  - Cherry-picks mutable database fields: `status` (via `nextStatus`), `category`, `itemName`, `unit`, `quantity`, `currency` (SAR only), `estimatedUnitCost`, `costSource` (`manual_estimate`), `scopeOfWork`, `internalNotes`, `approvedQuotationId` (only after validation), and `updated_by`.
  - Excludes `id`, `service_id`, `supplier_id`, `estimated_total_cost`, `supplier_rate_card_id`, `rate_card_snapshot`, audit/cancel/delete fields.
- Approved Quotation:
  - If `approvedQuotationId` is provided, validates that quotation exists, is not deleted, has status `approved`, and matches the allocation's `service_id`.
  - If omitted, existing `approved_quotation_id` is preserved. Nullable clearing is not supported.
- Return/Error/Revalidation:
  - Result mapped through `mapSupplierAllocationRow` respecting `canReadCost` redaction.
  - DB details are not returned to client. Internal errors logged server-side only.
  - Revalidates `/services` and `/services/[id]`.
- Boundaries:
  - Only manual update action is implemented.
  - CRUD is not complete. Write layer is not complete. UI is not complete.
  - Delete/restore, rate-card allocation creation, snapshot generation, bookings/Supplier Booking, invoices/payments, costing reports, quotation automation, and customer-facing supplier cost exposure remain deferred.

SUPPLIER-ALLOCATIONS-SERVICE-UI-PANEL-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `2370e74 feat(suppliers): add read-only service allocations panel`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/page.tsx`
  - `src/lib/supplier-allocations/queries.ts`
  - `src/lib/supplier-allocations/types.ts`
  - `src/lib/supplier-allocations/mappers.ts`
- UI Panel Behavior:
  - Adds a read-only Supplier Allocations panel to the internal dashboard Service detail page.
  - Mounts the panel between RelatedQuotationsCard and BillingPanel.
  - Uses getSupplierAllocationsByServiceId(serviceId) for the Service allocation list.
  - Does not fetch or render allocations unless `supplier_allocations:read` is granted.
  - Does not call createSupplierAllocation, updateSupplierAllocation, or cancelSupplierAllocation.
  - Does not add create/edit/cancel forms, drawers, dialogs, or mutation controls.
- Supplier Display Behavior:
  - Allocation reads now include a safe supplier display join.
  - Mapper exposes `supplierName` safely.
  - Supplier name fallback is safe and does not expose banking/IBAN.
  - Query join avoids N+1 UI lookup.
- Cost Redaction Behavior:
  - Backend mapper remains the cost redaction source of truth.
  - Service page computes/checks `supplier_allocations:read_cost` and passes `canReadCost` to the panel.
  - Unit cost and total cost columns are omitted when `canReadCost` is false.
  - UI does not calculate totals client-side.
  - UI does not display `rateCardSnapshot` in this slice.
  - No supplier costs are exposed to customer-facing pages, PDFs, or public routes.
- Status / Empty State UX:
  - Panel displays allocation statuses: draft, planned, selected, cancelled.
  - Local status labeling is used without marking Supplier Booking as implemented.
  - Empty state: "No supplier allocations recorded for this service yet."
  - Cancelled/Completed Services still show historical allocations read-only.
- Boundaries:
  - This is read-only panel 1A only.
  - Supplier Allocations UI is not complete.
  - Supplier Allocations CRUD is not complete.
  - Full write layer is not complete.
  - Create/edit/cancel mutation UI remains deferred to 1B or later.
  - Delete/restore remains deferred.
  - Rate-card allocation UI remains deferred.
  - Rate-card snapshot UI remains deferred.
  - Supplier Booking remains deferred.
  - Supplier invoices/payments remain deferred.
  - Supplier costing/margin reports remain deferred.
  - Quotation automation remains deferred.
  - Customer-facing supplier cost exposure remains forbidden/deferred.

SUPPLIER-ALLOCATIONS-SERVICE-UI-CREATE-1B (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `49793f7 feat(suppliers): add manual allocation create ui`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/app/(dashboard)/services/[id]/allocations/new/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/page.tsx`
  - `src/lib/suppliers/queries.ts`
  - `src/lib/suppliers/types.ts`
- Completed Scope:
  - Added Create-only internal Supplier Allocation UI.
  - Added dedicated route: `/services/[id]/allocations/new`.
  - Added manual allocation create form.
  - Added safe active supplier options query.
  - Supplier options require both `supplier_allocations:write` and `suppliers:read`.
  - Create route requires `supplier_allocations:read`, `supplier_allocations:write`, `supplier_allocations:read_cost`, and supplier option access.
  - CTA is gated by `canWrite`, `canReadCost`, and service status.
  - Completed/Cancelled services block creation.
  - Payload is manual-only with currency `SAR` and `costSource` `manual_estimate`.
  - No customer-facing/PDF/public supplier cost exposure.
- Boundaries Preserved (Still deferred):
  - Edit Allocation UI.
  - Delete/Restore Allocation UI.
  - Rate-card allocation UI and snapshots.
  - Approved quotation allocation UI.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Supplier costing/margin reports.
  - Quotation automation.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-ALLOCATIONS-SERVICE-UI-EDIT-1C (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `1348dc9 feat(suppliers): add manual allocation edit ui`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/SupplierAllocationEditForm.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
- Completed Scope:
  - Added Edit-only internal Supplier Allocation UI.
  - Added dedicated route: `/services/[id]/allocations/[allocationId]/edit`.
  - Added controlled edit form for manual allocations.
  - Supplier is displayed read-only and `supplierId` is not editable.
  - Edit route requires `supplier_allocations:read`, `supplier_allocations:write`, and `supplier_allocations:read_cost`.
  - Edit CTA is gated by `canWrite`, `canReadCost`, allocation status, `costSource`, and Service status.
  - Completed/Cancelled services block editing.
  - Cancelled allocations block editing.
  - Rate-card allocations block editing.
  - Editable fields are limited to safe manual fields: `category`, `itemName`, `unit`, `quantity`, `estimatedUnitCost`, `scopeOfWork`, `internalNotes`, `status`.
  - Status transition UI is forward-only (`draft -> draft/planned`, `planned -> planned/selected`, `selected -> selected`), and `cancelled` is not selectable through edit.
  - Payload stays manual-only with currency `SAR` and `costSource` `manual_estimate`.
  - No customer-facing/PDF/public supplier cost exposure.
- Boundaries Preserved (Still deferred):
  - Delete/Restore Allocation UI.
  - Rate-card allocation UI and snapshots.
  - Approved quotation allocation UI.
  - Supplier change/replacement after creation.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Costing/margin reports.
  - Quotation automation.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-ALLOCATIONS-SERVICE-UI-CANCEL-1D (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `7dc5063 feat(suppliers): add manual allocation cancel ui`
  - `a24999c fix(suppliers): block allocation cancel for closed services`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/SupplierAllocationCancelForm.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/page.tsx`
- Completed Scope:
  - Added Cancel-only internal Supplier Allocation UI.
  - Added dedicated route: `/services/[id]/allocations/[allocationId]/cancel`.
  - Added controlled cancellation form requiring a cancellation reason.
  - Cancel route requires `supplier_allocations:read`, `supplier_allocations:cancel`, and `supplier_allocations:read_cost`.
  - Cancel CTA is gated by `canCancel` permission, allocation status (must not be cancelled), and Service status.
  - Completed/Cancelled services block cancellation (both UI and server-side).
  - Status transitions directly to `cancelled` and is irreversible through the UI.
  - No customer-facing/PDF/public supplier cost exposure.
- Boundaries Preserved (Still deferred):
  - Delete/Restore Allocation UI.
  - Rate-card allocation UI and snapshots.
  - Approved quotation allocation UI.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Costing/margin reports.
  - Quotation automation.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-ALLOCATIONS-DELETE-RESTORE-1 (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `2307a42 feat(suppliers): add allocation delete restore flow`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/lib/supplier-allocations/actions.ts`
  - `src/lib/supplier-allocations/queries.ts`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/SupplierAllocationDeleteForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/SupplierAllocationRestoreForm.tsx`
- Completed Scope:
  - Added Delete and Restore backend actions `deleteSupplierAllocation` and `restoreSupplierAllocation`.
  - Both actions require `supplier_allocations:write` and do NOT require `supplier_allocations:read_cost`.
  - Soft delete/restore implemented purely via `is_deleted` toggling and updating `updated_by`/`updated_at` (no hard delete, no SQL migrations, no `deleted_at`/`restored_at` columns added).
  - Restore action preserves the original allocation status.
  - Both actions reject Completed/Cancelled services, missing/deleted services, and rate-card allocations.
  - Updated read queries `getSupplierAllocationsByServiceId` and `getSupplierAllocationById` to support `includeDeleted` option (defaulting to active-only).
  - Service Detail page reads `searchParams` to support `?showDeleted=true` query.
  - `SupplierAllocationsPanel` displays "Active" / "Show Deleted" toggle tabs.
  - Deleted rows render with muted visual styling (opacity/grayscale) and clear "Deleted" badge.
  - Active rows display "Delete" CTA when allowed (manual_estimate, open service, write access).
  - Deleted rows hide Edit/Cancel/Delete and show "Restore" CTA when allowed (manual_estimate, open service, write access).
  - Added dedicated internal delete and restore confirmation routes/forms with safe read-only summary fields (supplierName, category, itemName, quantity, unit, status) without exposing estimated costs or currency variables.
  - Delete form redirects back to `/services/[id]`, restore form redirects back to `/services/[id]?showDeleted=true`.
  - No modal/dialog/sheet/react-hook-form used.
- Boundaries Preserved (Still deferred):
  - Rate-card allocation UI and snapshots.
  - Approved quotation allocation UI.
  - Supplier change/replacement after creation.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Costing/margin reports.
  - Quotation automation.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-ALLOCATIONS-RATE-CARD-CREATE-1 (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `9dd6839 feat(suppliers): add rate-card allocation create flow`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/lib/supplier-allocations/schemas.ts`
  - `src/lib/suppliers/rate-card-actions.ts`
  - `src/lib/supplier-allocations/actions.ts`
  - `src/app/(dashboard)/services/[id]/allocations/new/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
- Completed Scope:
  - Added support for `costSource = rate_card` in `createSupplierAllocation` Server Action.
  - Client does not submit `rateCardSnapshot`. The server loads `supplier_rate_cards` server-side, validates it (existence, active status, not deleted, SAR currency, base cost, supplier ownership, expiration check), and builds the snapshot server-side.
  - Historical Service costing must not change when supplier rate card changes later.
  - Allocation row and rate_card_snapshot preserve pricing context at creation time.
  - Updated `supplierAllocationCreateSchema` to omit `rateCardSnapshot` client requirement, while still requiring `supplierRateCardId` when `costSource === 'rate_card'`.
  - Manual estimate validation remains unchanged.
  - Snapshot schema remains available for server-built snapshots.
  - Form UI checks `supplier_costing:read` permission. Only displays `From Rate Card` mode toggle when allowed.
  - Manual Estimate remains default.
  - Added dynamic loading of active rate cards upon supplier selection.
  - Form displays cost details (cost, category, item name, unit) as read-only, allowing user input only for quantity, scope of work, and internal notes.
  - Enabled soft-deletion and restoration for rate-card allocations, while preserving their read-only state in manual edit flow.
  - Rate-card allocations can be cancelled.
  - Soft delete/restore preserves supplier_rate_card_id and rate_card_snapshot.
  - Existing Edit UI remains manual_estimate only.
- Boundaries Preserved (Still deferred):
  - Rate-card edit flow.
  - Rate-card management CRUD/write workflows.
  - Rate-card overlap enforcement.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Actual expense posting.
  - Costing/margin reports.
  - Quotation automation from supplier cost.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-BOOKINGS-FOUNDATION-1 (Completed, Closed)
- Status: Completed, verified, committed, and pushed.
- Commits:
  - `5866d42 db(suppliers): add supplier bookings foundation migration`
  - `04d1e7c db(suppliers): sync supplier bookings schema`
- Scope: Database foundation completed.
  - The `supplier_bookings` table exists in the database.
  - RLS is enabled; direct table access for `anon` and `authenticated` roles is revoked.
  - Foreign keys (`source_allocation_id`, `service_id`, `supplier_id`) are strictly immutable.
  - Insert triggers (`trg_supplier_bookings_insert_sync_allocation`) enforce business rules, ensuring consistency between `service_supplier_allocations` and the new booking.
  - Booking numbers are generated DB-side using `generate_document_number('supplier_booking'::text)` (e.g. `SBK-YYYY-0001`).
  - Indexes exist, including `idx_supplier_bookings_one_active_per_allocation` to enforce at most one active booking per allocation.
- `SUPPLIER-BOOKINGS-NUMBERING-DB-1` closed in commit `d9b2a6d db(suppliers): add supplier booking number default`; manual DB verification confirmed the `public.supplier_bookings.booking_number` column default.
- **Deferred**: Standalone/broader Supplier Booking routes/UI, customer-facing documents/messages/portal, supplier invoices/payments, actual supplier costs, profit/margin reporting, and broader runtime workflows remain future tasks. Narrow internal Service Detail Supplier Booking UI is closed in `SUPPLIER-BOOKINGS-UI-1A`.
- Terminology constraint: Uses `Supplier Booking` / `supplier_bookings` / `SBK`.

SUPPLIER-BOOKINGS-SCHEMAS-1A (Completed, Closed)
- Status: Completed, verified, committed, and pushed.
- Commits: `4147591 feat(suppliers): add supplier bookings domain schemas`
- Domain foundation includes only `types`, `schemas`, `mappers`, `index` exports.
- Cost redaction is active by default.

SUPPLIER-BOOKINGS-PERMISSIONS-1A (Completed, Closed)
- Status: Completed, verified, committed, and pushed.
- Commits: `27f4bf5 feat(suppliers): add supplier booking permissions`
- Manager now has: `supplier_bookings:read`, `supplier_bookings:read_cost`, `supplier_bookings:write`, `supplier_bookings:cancel`.
- Operations, Accountant, Sales, and Viewer have no access.

SUPPLIER-BOOKINGS-QUERIES-1A (Completed, Closed)
- Status: Completed, verified, committed, and pushed.
- Commits: `578241a feat(suppliers): add supplier booking read queries`
- Scope: Server-only read queries implemented (`getSupplierBookingsByServiceId`, `getSupplierBookingsBySupplierId`, `getSupplierBookingById`). All queries gate on `supplier_bookings:read` and redact costs/internal details based on `supplier_bookings:read_cost`. Enforce `is_deleted = false`.

SUPPLIER-BOOKINGS-NUMBERING-DB-1 (Completed, Closed)
- Status: Completed, verified, committed, and pushed.
- Commits: `d9b2a6d db(suppliers): add supplier booking number default`
- Scope: `supplier_bookings.booking_number` now defaults DB-side to `generate_document_number('supplier_booking'::text)`.
- Manual DB verification confirmed the `public.supplier_bookings.booking_number` column default.
- Create actions must omit `booking_number` and must not call `generate_document_number` manually.

SUPPLIER-BOOKINGS-ACTIONS-1A (Completed, Closed)
- Status: Completed, reviewed, committed, and pushed.
- Commits: `8bd98bf feat(suppliers): add supplier booking actions`
- Scope: Internal-only `createSupplierBookingFromAllocation` and `cancelSupplierBooking` actions.
- Create accepts only `sourceAllocationId`, derives business/cost fields server-side from the selected allocation, omits `booking_number`, and returns a controlled error for duplicate active Supplier Bookings.
- Cancel only sets cancellation, status, and audit fields.
- Narrow internal Service Detail UI is now complete in `SUPPLIER-BOOKINGS-UI-1A`; standalone/broader UI remains deferred.

SUPPLIER-BOOKINGS-UI-1A-DESIGN-REVIEW (Completed, Closed)
- Status: Completed/reviewed before implementation.
- Controlled workflow preserved: design/review before implementation, implementation before docs sync, commit and push as separate tasks.

SUPPLIER-BOOKINGS-UI-1A (Completed, Closed)
- Status: Completed, reviewed, committed, and pushed.
- Commits: `79473e9 feat(suppliers): add supplier booking service UI`
- Scope: Narrow internal Service Detail MVP UI only, rendered near Supplier Allocations.
- Read/create/cancel UI is permission-gated: read `supplier_bookings:read`, create `supplier_bookings:write`, cancel `supplier_bookings:cancel`.
- Create sends only `sourceAllocationId`.
- Cancel requires a reason and sends only `cancelledReason`.
- Cost/internal fields display only from permission-safe mapped Supplier Booking data.
- Supplier Booking statuses remain limited to `draft` and `cancelled`.
- No standalone route, PDF, customer-facing surface, supplier portal, supplier invoice/payment, actual cost, profit/margin reporting, edit/delete/restore, or status expansion was added.

SUPPLIER-BOOKINGS-UI-1A-SMOKE-VERIFY (COMPLETED, PASS WITH WARN)
- Scope: Manual/internal smoke verification of the closed Service Detail Supplier Booking UI only.
- Verified create/cancel booking actions on `SVC-2026-0003`; the minor loading/pending indicator UX warning is recorded as a separate follow-up.
- Must not add standalone routes, pages, PDFs, customer-facing surfaces, supplier portal, supplier invoice/payment, actual cost, profit/margin reporting, edit/delete/restore, or status expansion.

SUPPLIER-BOOKINGS-RUNTIME-1 (Service-scoped V1 Closed; broader expansion future)
- Status: Service-scoped internal create/cancel runtime is closed in Supplier Operations V1; no standalone route is added.
- Completed scope: active Supplier lifecycle gate, server-derived Booking snapshot/create, duplicate active Booking prevention, conditional affected-row cancellation, active-Booking Allocation locks, accessible cancellation dialog, and EN/AR/RTL loading and empty-state hardening.
- Deferred scope: standalone routes/pages, PDFs, WhatsApp/email, supplier portal, supplier invoices/payments, actual supplier costs, profit/margin reporting, booking edit/delete/restore, status expansion, allocation deduplication, and cross-Service overlap/capacity.
- Design/review is strictly required before future UI/runtime expansion.



SUPPLIERS-LIST-LIVE-1
- Status: Superseded/completed by `SUPPLIERS-LIVE-READ-FOUNDATION-1`.
- `/suppliers` no longer depends on `suppliersData` for the live page. The remaining mock data file is not the route data source. Supplier CRUD/write and finance/workflow modules remain deferred.

INVOICE-LIST-SORT-1
- Status: Completed.
- Implemented in commit `9c297a6`.
- Invoices page sorts by `invoice_number` ascending.
- Manual smoke passed.
- No invoice numbering reset, fake filler invoices, or manual renumbering was done.

INVOICE-NUMBER-GAP-AUDIT-1
- `INV-2026-0001`, `INV-2026-0002`, and `INV-2026-0003` are absent from the `invoices` table. Stored invoices currently start at `INV-2026-0004`.
- Latest stored invoice from smoke is `INV-2026-0008`. `number_sequences` for `invoice` / `2026` is `8`.
- Treat this as a development/smoke numbering gap. Do not reset invoice numbering. Do not create fake filler invoices. Do not manually renumber existing invoices.
- Future production financial lifecycle should use void/cancel/reversal rather than hard deletion.

SERVICE-STATUS-WORKFLOW-1
- Status: Stage 1 completed.
- Implemented in commit `0b0cc78`.
- Manual Service status control is available from Service detail.
- Status changes update `services.status`.
- Manual smoke passed on `SVC-2026-0008`; it reached `Completed` and displayed correctly in Service detail and Services list.
- Current behavior is manual-only.
- No automation was added.
- No DB migration was added.
- The system does not yet validate quotation, invoice, payment, or delivery state before changing Service status.
- Guarded transitions are implemented under `SERVICE-STATUS-GUARDED-TRANSITIONS-1`.

SERVICE-STATUS-STATE-MACHINE-SPEC-1
- Status: Completed and pushed as Spec Kit design only.
- Implemented in commit `760c569 spec(services): define status state machine`.
- Design artifacts live under `specs/003-service-status-state-machine/`.
- This does not implement guarded transitions, `services:update_status`, UI next-state filtering, status history/audit persistence, or status automation.
- All Sprint 1 workflow blocker tasks are now complete: `SERVICE-DETAIL-RELATED-QUOTE-CTA-1`, `QUOTE-TO-DEPOSIT-CTA-1`, `INVOICE-LIST-REMOVE-STANDALONE-CREATE-1`, and `HUMAN-REFERENCE-DISPLAY-1`.

TEAM-LEAD-CODEX-UX-ERP-BACKLOG-1
- Status: Captured / Not completed.
- Team Lead UX/UI score: `6.4/10`.
- Readiness: guided internal demo-ready, not operational-ready, not client-production-ready.
- Codex analysis: Team Lead report is directionally accurate but partly stale. Supplier create/live/UX fixes, quotation Approve/Reject, paid or zero-balance invoice payment disablement, Admin self-role/self-deactivation protections, and last-active-admin protection are already present.
- Planning rule: broad redesign is not planned. Use targeted ERP workflow hardening slices.

Critical / Sprint 1 backlog:
- [x] `SERVICE-STATUS-GUARDED-TRANSITIONS-1`: implemented guarded Service status transitions; free status jumping removed; `services:update_status` permission enforced.
- [x] `SERVICE-DETAIL-RELATED-QUOTE-CTA-1`: add Create Quotation CTA where Service Detail has no related quotation. (Commits: `80e3765`, `0930954`. Manual smoke and Clean Code Guard passed. CTA appears inside Service Detail Related Quotations. Eligibility fix restricts already-started services.)
- [x] `QUOTE-TO-DEPOSIT-CTA-1`: add Create Deposit Invoice CTA from an approved quotation where workflow state allows it. (Commit: `103e0fa`. Reuses existing `CreateDepositInvoiceAction`. Option A implemented: displays invoice number as text with guidance and avoids 404 links. Option B deep-linking moved to backlog as separate `INVOICE-LIST-DEEP-LINK-SELECTION-1` task. Option C detail page rejected.)
- [x] `INVOICE-LIST-REMOVE-STANDALONE-CREATE-1`: remove disabled standalone Create Invoice affordance from the Invoices page. (Commit: `ada01f0`. Generic disabled Create Invoice button removed from Invoices list and replaced with safe workflow copy. Server-side context-guarded validation remains intact.)
- [x] `HUMAN-REFERENCE-DISPLAY-1`: replace visible UUIDs/internal identifiers with human reference numbers where users make decisions (e.g., visible Customer UUID in Service Detail Customer Summary). (Commit: `f68afe0`. Replaced raw UUIDs with `customerNumber` and `relatedQuoteNumber` in Service Detail and Invoice side panel with safe fallbacks. Internal routes and actions were preserved.)

High priority backlog:
- `FORMAT-STANDARDIZATION-1`: standardize currency display and related numeric formatting (inconsistent formatting noted in service/billing areas).
- `DATE-FORMAT-STANDARDIZATION-1`: standardize date display across lists, detail pages, and documents (inconsistent formatting noted in service/billing areas).
- `DATA-QUALITY-INPUT-NORMALIZATION-1`: normalize city inputs and old data values (e.g., location typo `ryade` in existing data).
- `BILLING-LABEL-COPY-POLISH-1`: polish billing labels (such as `Prior Invoiced` and `Remaining`) according to Team Lead backlog feedback.
- `UI-QUALITY-WARNINGS-CLEANUP-1`: clean up minor UI issues and DevTools console warnings (e.g., missing form field `id`/`name`, CSP `eval` warnings).
- `LIST-SEARCH-FILTER-PARITY-1`: align search/filter behavior across major list pages.
- `INVOICE-DUE-DATE-LIST-1`: expose invoice due-date visibility where list decisions require it.
- `SERVICE-PAYMENTS-PANEL-1`: add Service-level payment visibility without changing financial source of truth.
- `CUSTOMER-TYPE-DEFAULT-1`: define and apply safer customer type defaults.
- `BREADCRUMB-NAV-1`: add consistent breadcrumb navigation for deep module pages.
- `USER-FRIENDLY-ERROR-COPY-1`: replace technical error wording with user-safe operational copy.
- `RBAC-ROLE-MODEL-LOCK-1`: lock and document the practical role model before more write workflows expand.
- `EVENT-TYPE-TAXONOMY-1`: confirm event taxonomy before depending on event type reporting or automation.

Polish / later backlog:
- `USER-MANAGEMENT-CONFIRMATION-POLISH-1`
- `QUOTE-APPROVAL-UX-POLISH-1`
- `GLOBAL-SEARCH-1`
- `CUSTOMER-HUB-TABS-1`

SERVICE-STATUS-GUARDED-TRANSITIONS-1
- Status: Deferred / Post-MVP Review.
- Future stage should evaluate guarded status transitions or warnings based on quotation, invoice, payment, and delivery state.
- Future rules may warn or require confirmation before marking `Completed` while active invoices still have balance due, warn before marking `Deposit Paid` if no deposit/progress payment exists, possibly guard `Approved` based on approved quotation state, and require cancellation reason when moving to `Cancelled`.
- Do not blindly block operational manual status changes. Use warnings, confirmations, or role-based manual override before hard blocking.

INVOICE-PDF-BREAKDOWN-1
- Status: Completed.
- Implemented in commit `b38a75f fix(invoices): add compact invoice pdf breakdown`.
- Compact display-only invoice PDF breakdown uses persisted invoice fields and existing snapshot values only.
- Deposit/final PDFs now show Approved Quotation Total when available, Previous Invoices / Deposits when available, Total Amount, Amount Paid, and Balance Due in the existing totals section.
- Manual visual smoke passed on `INV-2026-0004` and `INV-2026-0005`; both tested PDFs fit one A4 page after final duplicate footer cleanup.
- `Commercial Invoice` title and Tax/VAT `Not applied` behavior were preserved.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.

INVOICE-PDF-LAYOUT-1
- Status: Deferred / As Needed.
- A future page numbering or print-scaling strategy is only needed for genuinely multi-page PDFs. The compact invoice PDF MVP removed misleading hardcoded page-count text from the tested one-page PDFs.

QUOTATION-VALIDITY-1
- Default Valid Until from company settings, usually issue date + 7 days.

SERVICE-BUDGET-GUARD-1
- Show warning when quotation total exceeds service estimated budget.

GLOBAL-INVOICE-WIZARD-1
- Global invoice creation from Invoices page remains deferred.

### SETTINGS-EDIT-MODE-1
Status: Implemented / Repo-ready; manual browser smoke pending.

Checklist:
- [ ] Company Settings page read-only by default.
- [ ] Add `Edit Settings` button.
- [ ] Only after clicking edit, fields become editable.
- [ ] Show `Save Changes` and `Cancel`.
- [ ] Cancel discards unsaved changes.
- [ ] Existing validation, permissions, and bank masking must remain respected.

### CUSTOMER-NUMBER-1
Status: DB-applied and App/UI repo-ready

Checklist:
- [x] Generate customer number/code (e.g. `CUST-2026-0001`).
- [x] Add customer number/code without breaking existing IDs or foreign keys.
- [x] Show in customers list.
- [x] Show in customer detail.
- [ ] Use in future invoice/payment/document selection where useful.
- [x] Generated by system, not manually entered.

### LIST-PAGINATION-PARITY-1
Status: Complete

Checklist:
- [x] Customers list: 10 rows per page.
- [x] Services list: 10 rows per page.
- [x] Quotations list: 10 rows per page.
- [x] Previous / Next controls when count exceeds 10.
- [x] Preserve search/filter behavior across pages.
- [x] Shared `PaginationFooter` component used.

### QUOTATION-PDF-CLEANUP-1
Status: Verified (data cleanup) / Print headers pending

Checklist:
- [x] Verify Email displays as plain `info@g7blue.com`.
- [x] Verify Terms display professional terms.
- [x] Verify CR does not display fake placeholder.
- [x] Verify no Tax Invoice / ZATCA / FATOORA / VAT 15% is displayed while not VAT registered.

#### QUOTATION-PDF-PRINT-SETTINGS-1
Status: Pending (Before external/client-facing PDF sharing)

Checklist:
- [ ] Fix print/export polish: provide a cleaner PDF/export experience where generated documents do not show browser URL/date/title/page footer artifacts.
- [ ] This is not a VAT/data correctness issue. PDF data cleanup is verified.
- [ ] User workaround: disable `Headers and footers` in the browser print dialog.
- [ ] This must be fixed before external/client-facing PDF usage, even if ERP-3 can continue.

### ADMIN-USERS-SMOKE-1
Status: Pending later controlled smoke

Checklist:
- [ ] Controlled smoke for invite, pending invitation, revoke modal.
- [ ] Controlled smoke for role changes.
- [ ] Controlled smoke for self-protection and final active Admin protection.

### EXPORT-REPORTS-XLSX-1
Status: Complete

Checklist:
- [x] Customers raw CSV export replaced with branded XLSX report.
- [x] Shared export helper introduced.
- [x] Permissions were intentionally not changed in this task.
- [x] Viewer export permission review remains a separate future decision/task (Resolved in CUSTOMERS-SECURE-SUMMARY-XLSX-1B).

### CUSTOMERS-SECURE-SUMMARY-XLSX-1B
Status: Complete

Checklist:
- [x] Fix export RBAC by adding `customers:export` permission.
- [x] Allow export only for admin, manager, accountant.
- [x] Block Viewer from exporting.
- [x] Replace stale customer report metrics with real metrics from `public.customer_report_metrics`.
- [x] Update column formatting (text for phone/email, currency for total amount).

### CUSTOMER-REPORT-METRICS-VIEW-1
Status: Manually applied and verified

Checklist:
- [x] Create SQL migration for `customer_report_metrics` view.
- [x] Use `security_invoker = true`.
- [x] Aggregate `services_count`, `quotations_count`, and `total_quoted_amount` on server side.
- [x] Mozfer to manually apply SQL in Supabase.
- [x] Verify view returns expected aggregation metrics.

Manual verification evidence:
* `public.customer_report_metrics` was manually applied in Supabase by Mozfer.
* The view was verified successfully and is the source of real customer summary metrics.
* Verified rows:
  - CUST-2026-0007: services_count=2, quotations_count=3, approved_quotations_count=1, draft_quotations_count=2, total_quoted_amount=408558.00
  - CUST-2026-0006: services_count=2, quotations_count=2, approved_quotations_count=1, draft_quotations_count=0, total_quoted_amount=13223.00
  - CUST-2026-0008: services_count=1, quotations_count=4, approved_quotations_count=0, draft_quotations_count=4, total_quoted_amount=66953.00

### CUSTOMERS-EXPORT-POLISH-AND-DOCS-1
Status: Complete

Checklist:
- [x] Make Customers Export a lightweight customer-level summary.
- [x] Remove quotation pipeline breakdown columns from Customers Export only.
- [x] Keep the database view and data model fields unchanged for future reports.
- [x] Document the reporting strategy and deferred reporting modules.

### CUSTOMERS-EXCEL-HEADER-POLISH-1
Status: Complete

Checklist:
- [x] Customers XLSX now uses a professional merged blue report header.
- [x] Phone/text cells are explicitly text-safe to prevent scientific notation.
- [x] The export remains a lightweight current filtered view report.
- [x] No change was made to reporting strategy, permissions, view, queries, or data model.

Final Customers XLSX export columns are exactly:
- Customer Number
- Company
- Contact Person
- Email
- Phone
- City
- Status
- Services Count
- Quotations Count
- Total Quoted Amount (SAR)

Notes:
* `Approved Quotations` and `Draft Quotations` were intentionally removed from the Customers export only.
* `Approved/Draft` metrics remain available in `customer_report_metrics`, types, mappers, and queries for future reports.
* Customers export remains a lightweight current filtered view report.
* Customers export is not a full pipeline report and not a full customer activity report.

### Reporting Strategy
Status: Documented

Each main module should eventually have its own dedicated report:
1. Customers Report
2. Services Report
3. Quotations Report
4. Invoices Report
5. Payments Report

Additionally, each customer should eventually have a fixed full customer-specific report from `/customers/[id]`.

Customers Report:
- Current implemented report.
- Source: Customers page.
- Scope: current filtered customer list.
- Format: lightweight XLSX.
- Purpose: customer-level summary.

Services Report:
- Future dedicated report.
- Scope: service/booking details.

Quotations Report:
- Future dedicated report.
- Scope: quotation details, quotation amounts, quotation status breakdown.
- Approved/Draft/Rejected/Expired analysis belongs here.

Invoices Report:
- Future dedicated report.
- Scope: invoice/billing details and totals.

Payments Report:
- Future dedicated report.
- Scope: collection/payment tracking.

Customer Full Report:
- Future dedicated report from `/customers/[id]`.
- One customer only.
- Should combine the customer profile and all related business activity.
- Suggested XLSX workbook sheets:
  - Profile
  - Services
  - Quotations
  - Invoices
  - Payments

Future UI Direction:
- List page export means: Export current filtered view.
- Future selection export can add selected customers and column configuration.
- Customer-specific reports should live inside the Customer Detail page.

## 4. Update Rule After Every Merge

Documentation must be updated after:
- every merged PR
- every manual database/Supabase apply or verification
- every smoke test that changes completion status
- every Team Lead decision that changes a business rule, priority, or deferred decision
- before starting the next major task if prior status may be stale

After each docs-impacting event, run a docs update task:
- mark completed phase checkbox
- add commit hash and PR if available
- move current phase
- add any new deferred decisions
- document any known risks
- commit docs update if separate, or include in next planning commit

Before any docs commit, agents must run a documentation staleness audit:
- identify what changed in code
- identify what changed outside code
- identify what was previously pending and is now completed
- identify stale wording that must be corrected
- identify what remains truly pending
- confirm next locked priority

Agents must search or review wording such as:
- pending
- prepared
- manual apply
- required before
- blocked until
- DEV_ONLY
- current phase
- next priority

Any match must be checked for current truth before committing docs.

## Mandatory Runtime Build Gate
All runtime implementation slices must pass `pnpm run lint`, `pnpm exec tsc --noEmit`, and `pnpm build` before commit readiness. Docs-only slices do not require build unless runtime files changed.

## RLS Verification Requirement
The hardening review must verify RLS policies on `service_supplier_allocations`.
Must verify:
- no broad anon SELECT/INSERT/UPDATE/DELETE access
- no broad authenticated SELECT access bypassing application-level RBAC
- no direct table access exposing cost fields without mapper redaction
- RLS behavior aligns with server-action/application RBAC

## Historical / Superseded I18N and RTL Priority Order

> Retained as an earlier i18n planning sequence. It does not override active Feature 006. Completed Feature 005 runtime UI localization history and future Arabic/English document rendering remain separate programs; no document-language implementation has started.

1. `I18N-RTL-SHARED-OVERLAYS-INVENTORY-1`
   - Readonly inventory of shared Modal/Dialog/Toast/Dropdown file paths, ownership, and wrapper type before shell implementation.
2. `I18N-RTL-SHELL-1A`
   - Foundation-1 is complete for locale helpers, root `lang` / `dir` scaffolding, dictionary skeletons, bidi helpers, formatting helpers, and SQL draft planning only.
   - Shell-1A is limited to `Sidebar`, `Topbar`, `PageHeader`, and `src/app/(dashboard)/layout.tsx`.
   - `src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx` remains explicitly forbidden because `Cancelled` must not be treated as a mirrored progress step.
3. `I18N-RTL-SHELL-1B`
   - Shared data components move in a separate pass because `DataTable`, `PaginationFooter`, and `FilterBar` can affect multiple modules at once.
   - Pagination keeps ascending page numbers while only prev/next chevrons mirror direction.
4. `ARABIC-COPY-REVIEW-1`
   - Final Arabic terminology remains unapproved.
5. `DOCUMENT-LANGUAGE-SNAPSHOT-1`
   - `document_locale` schema/runtime work remains deferred and must stay separate from Foundation-1.
6. `INVOICE-LIST-ACTIONS-POLISH-1`
   - View/Print icons, list action polish, pagination/page-size/go-to-page review.
## Quotations 1A Docs Sync
- `I18N-RTL-QUOTATIONS-RUNTIME-1A` completed as a Quotations runtime module slice.
- Initial senior review returned HOLD because an `expired` status filter option was added.
- FIX-1 removed `expired` from selectable status filter options.
- Final selectable status filter options remain exactly `all`, `draft`, `sent`, `approved`, and `rejected`.
- Focused re-review result is `PASS`.
- Mozfer manual/browser smoke result is `PASS`.
- List page rendered correctly.
- RTL list layout passed visually.
- New/form quotation surfaces rendered correctly.
- Quotation numbers, service numbers, customer names, SAR values, dates, and statuses remained readable/LTR-safe.
- No quotation detail page implementation was intentionally included in this slice.
- No PDFs/document routes touched.
- No ZATCA/QR/XML/FATOORA touched.
- No quotation action/query logic changed.
- No RBAC/permission/service-gating/create-flow behavior changed.
- No totals/SAR calculation behavior changed.
## Invoices 1A Docs Sync
- `I18N-RTL-INVOICES-RUNTIME-1A` completed as an Invoices runtime module slice.
- Focused senior review initially returned HOLD for a glossary mismatch in `partial`.
- FIX-1 corrected `partial` from `مدفوعة جزئيًا` to `مدفوعة جزئياً`.
- Re-review outcome is `PASS`.
- Mozfer manual/browser smoke result is `PASS`.
- Invoices list, stats, table, side panel, and RTL shell passed visually.
- Invoice numbers, customer names, quotation refs, SAR values, dates, and statuses remained readable/LTR-safe.
- Non-blocking UX follow-up: the list feels crowded because it shows more than 10 rows at once; future pagination task suggested as `INVOICES-LIST-PAGINATION-10-1`.
- IssueInvoiceAction untouched.
## Invoices List Search/Filter UX Sync
- `INVOICES-LIST-SEARCH-FILTER-UX-1` completed as an invoices list UX slice.
- KPI money cards were removed to reduce visual crowding.
- Search by invoice number and customer name was added.
- Status filtering was fixed to actual invoice status values only.
- 10-row pagination was added and the list now filters before paginating.
- Side panel behavior remained safe, and the close button affordance was improved.
- Focused senior review result: PASS.
- Mozfer manual/browser smoke result: PASS.
- `INVOICES-DETAIL-PREVIEW-UX-1` has been superseded by `INVOICES-FULL-DETAIL-VIEW-1`.

## Invoices Full Detail View
- `INVOICES-FULL-DETAIL-VIEW-1` completed the non-PDF invoice detail route.
- The list uses explicit View navigation instead of row-wide click.
- The full detail page keeps Print/PDF separate at `/invoices/[id]/pdf`.
- Global pending navigation is used for View and in-app Back.
- Raw UUIDs stay hidden from normal business-facing invoice UI.
- Focused senior review result: PASS.
- Mozfer manual/browser smoke result: PASS.
- Deferred follow-ups remain payment history, richer deposit/advance payment timeline, richer service/event context if needed, first-class invoice line item data if snapshot line data is insufficient, and list-action consistency review for other modules.

## Customers List Actions Consistency
- `LIST-ACTIONS-CONSISTENCY-CUSTOMERS-1` completed the Customers list action standard slice.
- Customers list now uses explicit View navigation with the approved pending bolt pattern.
- No Print/PDF action was added for Customers.
- Search, filter, export, Add Customer, and customer detail route behavior remained unchanged.
- Focused review result: PASS.
- Mozfer manual/visual smoke result: PASS.
- `CUSTOMERS-PROFILE-UX-POLISH-1` remains a deferred follow-up for profile-only polish.
- RecordPaymentModal untouched.
- PDF/document/ZATCA routes untouched.
- Invoice actions/queries untouched.
- No RBAC/permission drift.
- No stats/calculation drift.
- No side-panel behavior drift.

## Services List Actions Consistency
- `LIST-ACTIONS-CONSISTENCY-SERVICES-1` completed the Services list action standard slice.
- Services list now uses explicit View navigation with the approved pending bolt pattern.
- No Print/PDF action was added for Services.
- Status filter and New Service behavior remained unchanged.
- Service detail route behavior remained unchanged.
- Services table alignment was refined locally for readability.
- Focused review result: PASS.
- Mozfer visual review result: PASS.
- Remaining rollout stays separate for Services detail, broader table standardization, and other module-specific follow-ups.

## Invoices 1B Docs Sync
- `I18N-RTL-INVOICES-RUNTIME-1B` completed as an Invoices runtime action/payment slice.
- Focused senior review initially returned HOLD on the `online` payment label.
- FIX-2 corrected `paymentModal.methods.online` to `Online Payment` / `دفع إلكتروني`.
- Re-review outcome is `PASS`.
- Mozfer manual/browser smoke was recorded as PASS for the slice.
- IssueInvoiceAction and RecordPaymentModal copy were localized without changing behavior, validation, permissions, or action/query logic.
## Quotations 1B Docs Sync
- `I18N-RTL-QUOTATIONS-RUNTIME-1B` completed as a Quotations runtime module slice.
- Focused senior review result is `PASS`.
- Mozfer manual/browser smoke result is `PASS`.
- Detail page rendered correctly.
- Financial Summary rendered correctly.
- Deposit Invoice card rendered correctly.
- Line Items rendered correctly.
- Print / Save as PDF button/link remained visible and behavior-preserved.
- Quotation numbers, invoice numbers, customer/service names, SAR values, dates, quantities, and statuses remained readable/LTR-safe.
- PDFs/document routes untouched.
- ZATCA/QR/XML/FATOORA untouched.
- Quotation actions/queries untouched.
- No RBAC/permission drift.
- No finance/totals drift.
- No PDF link behavior drift.
- No deposit invoice behavior drift.
- RTL shell passed visually with the known non-blocking English-locale direction note.

## Service Detail Status UX
- `SERVICE-DETAIL-STATUS-UX-1` completed the Service Detail workflow/status UX slice.
- The oversized Service Detail status timeline was replaced with a compact A-lite Workflow card.
- Header status badge remains authoritative.
- Current Status is not repeated inside the Workflow card.
- Current Phase and Next Action are shown.
- Status History is collapsed and secondary.
- Status Actions remain separate and unchanged.
- Last Updated is omitted because no dedicated status-transition timestamp exists yet.
- Completed and Cancelled are terminal.
- Focused review result: PASS.
- Mozfer visual review result: PASS for default Quoted and Completed detail views.
- Remaining rollout stays separate for the pending-UX follow-up, billing copy, supplier cost verification, related records actions, supplier booking CTA, header hierarchy polish, and broader table standardization.

## Service Detail Billing Copy
- `SERVICE-DETAIL-BILLING-COPY-FIX-1` completed the Service Detail Billing/Invoicing copy correctness slice.
- The copy now distinguishes a missing invoice record from an unavailable invoice action.
- Missing deposit/final invoice states now say the invoice has not been created yet.
- Disabled/unavailable action states now say the invoice action is not available.
- The change is dictionary-only and does not alter financial logic, PDF/document behavior, workflow behavior, RBAC, auth, or layout.
- Focused review result: PASS.
- Mozfer manual smoke result: PASS.

## Approved Billing Scope
- `APPROVED-BILLING-SCOPE-SCHEMA-DESIGN-V2-1` completed and returned `PASS`.
- `APPROVED-BILLING-SCOPE-SCHEMA-DESIGN-V2-REVIEW-1` completed and returned `PASS WITH MINOR DOCS-SYNC NOTES`.
- `APPROVED-BILLING-SCOPE-DOCS-SYNC-2` was the current docs-only recording step.
- `APPROVED-BILLING-SCOPE-DEV-APPLY-DOCS-SYNC-1` records the DEV/DEMO apply validation outcome and smoke-clean rollback result.
- `APPROVED-BILLING-SCOPE-DRAFT-CREATE-COMMIT-1` implemented and pushed the create-draft action as `4ec323f feat(billing): add approved scope draft creation`.
- Manual DEV/DEMO smoke passed for source quotation `9778cf05-ae13-4072-8d6d-0b2ec1e970fe` and verified `scopeId = 2fb8a324-4bd2-44be-8a23-a2b37e9b6e72`.
- Duplicate protection returned `scope_duplicate_draft` on the second click, and the temporary harness folder was removed after cleanup verification.
- `APPROVED-BILLING-SCOPE-RUNTIME-RPC-DESIGN-1` completed with `PASS WITH NOTES`.
- `APPROVED-BILLING-SCOPE-RUNTIME-RPC-DESIGN-REVIEW-1` completed with `PASS WITH REQUIRED CHANGES`.
- `APPROVED-BILLING-SCOPE-RUNTIME-DECISIONS-LOCK-1` locks the V1 runtime, product, security, and error-contract decisions in docs/spec only.
- `APPROVED-BILLING-SCOPE-DRAFT-DISCARD-SMOKE-DOCS-SYNC-1` documents the manual apply of migration `20260708110000_approved_billing_scope_draft_discard_function.sql` in DEV/DEMO and the successful manual app smoke test (creation of draft `0ace1c81-68c0-4cdd-8d9b-db563cd49949` and its atomic deletion). The temporary local DEV harness has been cleaned up.
- `APPROVED-BILLING-SCOPE-DRAFT-ITEM-EDIT-COMMIT-1` and `APPROVED-BILLING-SCOPE-DRAFT-ITEM-EDIT-PUSH-1` implemented, verified, and pushed atomic draft item edit.
  - Production query relation disambiguation implemented in `src/lib/approved-billing-scopes/queries.ts` to solve PostgREST embedding ambiguity.
  - Aggregate column-qualify corrective migration `20260708123000_approved_billing_scope_item_edit_function_column_qualify_fix.sql` applied/verified.
  - RHS line safety qualify corrective migration `20260708124000_approved_billing_scope_item_edit_function_line_safety_qualify_fix.sql` applied/verified.
  - Manual browser app smoke test passed via temporary DEV harness `/approved-billing-scopes/dev/item-edit-smoke` using existing draft scope `39949bf2-4b0e-4311-9cef-d84a57da7845` (edited item `353699f1-e7b2-4f73-9c1c-11283b05272c` setting qty to 4 and unit price to 400).
  - All 8 correctness checks passed. Draft scope discarded. Temporary DEV harness removed.
  - Commit pushed as `7f26ca3 fix(billing): stabilize approved scope item edit`.
- `APPROVED-BILLING-SCOPE-LIVE-SCHEMA-ENFORCEABILITY-CHECK-1` completed with `WARN` (audit expectation mismatch only; all database tables, constraints, FKs, indexes, triggers, RLS, and RPC grants verified and enforceability is sound; the draft creation write path is confirmed to be an app-layer action rather than a database RPC function; no runtime or migration blocker exists; data state is clean).
- `APPROVED-BILLING-SCOPE-MIGRATION-DRAFT-1` reclassified as completed/no-op after live schema audit confirmed that no database migration is required. Draft creation is app-layer, draft discard and edit child items RPCs exist, and other runtime actions operate on the existing database schema.
- `APPROVED-BILLING-SCOPE-RBAC-RLS-REVIEW-1` completed with `PASS` (security review completed; app-layer permissions, RLS posture, table grants, and service-role write paths verified as secure).
- `APPROVED-BILLING-SCOPE-INVOICE-INTEGRATION-DESIGN-1` completed with `PASS` (invoice ceiling design parameter clear).
- Canonical documentation staleness audit, P0 cleanup, P1 cleanup, and P2 history cleanup are completed history.
- `G7-CLIENT-DELIVERY-ROADMAP-DESIGN-1` completed with PASS WITH WARN; the roadmap was accepted with model-routing and task-sizing corrections.
- Historical sync-point phase: **Phase 1 - Experience Foundation**. This is retained as historical context and is no longer the current phase.
- Completed: `V1-DELIVERY-DECISIONS-LOCK-1` locked D01-D09 as product policy; no implementation occurred.
- Historical sync-point controlled task: `I18N-RUNTIME-LOCALE-DESIGN-1`, using guarded Spec Kit Feature 005 in a separate task. This authority is superseded and does not override active Feature 006.
- The canonical delivery plan is `docs/client-delivery-plan.md` and preserves the locked Reports Center and Supplier Booking boundaries, decomposed financial implementation, production hardening, and separate UAT phases.

- `BILLING-SCOPE-PACKAGE-DISCOUNT-DESIGN-1` remains a future follow-up if package decomposition and discount allocation metadata are later needed.
- `SERVICE-PROFITABILITY-DESIGN-1` remains blocked until billing source and supplier-cost permissions are stable.
