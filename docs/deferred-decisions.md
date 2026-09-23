# G7 BLUE CRM — Deferred Decisions

## CURRENT DELIVERY STATUS — W8B EVENT COST CLOSE — 23 September 2026

- **W8B Event Cost Close:** `PUBLISHED / PASS WITH WARN / IMPLEMENTATION COMPLETE / DEV VERIFIED / BROWSER ACCEPTED / REVIEWER CLEAN`.
  - The feature records versioned managerial direct-cost closes. It remains separate from operational Service close, supplier AP settlement, and future accounting close.
  - DEV base and forward repair migrations are applied once (`20260923074541`, `20260923075521`). Rollback-only close/reopen/release verification passed with zero synthetic residue; the protected partial-source service remains unchanged and not close-ready.
  - Read-only browser acceptance on `SVC-2026-0001` passed in English and Arabic/RTL: incomplete sources and exact readiness blockers are visible, and Close Event Cost remains disabled. No persistent Event Cost Close or Supplier Advance release was recorded.
  - Bounded evidence limitations: no pre-existing released-advance fixture, mobile viewport override, or live two-session contention exercise. No accounting or production semantics are implied.
- **W8A Event Costing & Forecast Foundation:** remains `IMPLEMENTATION COMPLETE / DEV VERIFIED / BROWSER ACCEPTED / REVIEWER CLEAN`; historical event-date/Riyadh-date repair remains in force.
- **Still deferred / separately gated:** W9 reporting consolidation and W10 accounting remain later waves. GL/journals, revenue recognition, VAT/FATOORA/ZATCA activation, bank integration, deployment, PROD, DEMO, and Layer 2/SaaS remain unactivated.
- **EXACT NEXT ACTION:** No further W8B work. W9 or later implementation requires separate Owner authorization. This status document grants no additional implementation or database authority.

> The dated delivery section immediately below preserves its 15 September snapshot and is superseded for current wave status by this section. Older deferral decisions remain unchanged.

## HISTORICAL DELIVERY SNAPSHOT — W5 CLOSE / W6A CLOSE / W6B CLOSE — 15 September 2026 (SUPERSEDED CURRENT STATUS)

- **W5 — Expenses & Cash Advances & Petty Cash:** `CLOSED / COMPLETE`.
  - Expenses workflow, employee reimbursement workflow, Cash Advance workflow, and the Petty Cash workspace/end-to-end lifecycle are complete.
  - Owner physical acceptance and DEV verification are complete.
  - Latest W5-close product HEAD: `b4ce5b366115b1a81bc8e270d00a7a6bea9494b4`.
  - Existing Cash Advance two-session concurrency limitation remains a non-blocking environment `WARN`.
- **W6 — Accounts Payable:** Discovery `COMPLETE`; Product Truth `OWNER APPROVED`; W6A Supplier Bills `CLOSED / COMPLETE`; W6B Supplier Payments `CLOSED / COMPLETE`.
  - AP is for genuine supplier obligations, primarily Event/Service suppliers. Routine operating purchases such as office water, internet, electricity, small stationery, and similar day-to-day costs remain in W5 Expense / Cash Advance / Petty Cash workflows and must not be duplicated in AP merely to create supplier records.
  - Event/Service supplier bills normally require an approved financial commitment/agreement. Final bills for delivered work require accepted receipt/performance evidence. Explicitly authorized deposits/prepayments may be paid before receipt when allowed by the approved commitment.
  - **W6A — Supplier Bills:** Supplier Bills foundation implemented and published. The W6A migration was applied successfully to the authorized DEV project. `BILL-2026-0001` was physically recorded and approved in DEV.
  - W6A evidence gates were verified: supplier bill evidence, accepted Service Receipt, approved Commitment, commitment and accepted-receipt ceilings, audit, idempotency, and approved-bill immutability.
  - Owner Decision: Admin may approve a Supplier Bill recorded by the same Admin. Manager approval remains valid; Accountant remains record-only. No other role or self-approval authority was widened.
  - Supplier Bill edit UI and Service Receipt correction UI are collapsed by default. Internal UUIDs and raw statuses are not exposed as business-facing values.
  - Arabic RTL/Bidi, structured Arabic dates/date-times, mixed-content presentation, back navigation, and validation messaging were corrected and physically accepted.
  - **W6B — Supplier Payments:** Foundation implemented and published; the DEV migration was successfully applied. AP Supplier Payments remain separate from customer payments.
  - Admin and Accountant can read, record, and reverse Supplier Payments; Manager is read-only; Sales, Operations, and Viewer have no Supplier Payments workspace access.
  - Partial and multiple payments are supported; payments cannot exceed the outstanding Supplier Bill balance. Payment evidence is mandatory. Bank transfers use stored supplier bank details with a payment-time snapshot.
  - Payments are immutable; correction is by explicit reversal. Replay/idempotency and concurrency protections are implemented. Supplier Bill payment summary and history are live.
  - `SPAY-2026-0001` was physically recorded and then reversed in DEV. The reversal restored `BILL-2026-0001` to payable `SAR 10,000.00`, paid `SAR 0.00`, outstanding `SAR 10,000.00`, status `unpaid`.
  - Reversal audit evidence—reason, reversal date/time, and reversing user name—was physically verified. Arabic RTL/Bidi and structured date/time presentation were physically accepted.
  - Latest accepted W6B product HEAD: `6b4590c0155f5de6f4b2a7111709fd8453bb63fc`.
  - Bills exceeding the approved commitment require a governed amendment, corrected supplier document, credit adjustment, or explicitly authorized exception.
  - Capture operational Saudi supplier invoice/tax evidence, but do not implement a VAT filing/accounting engine or claim broader ZATCA compliance.
  - Accounts Payable is a distinct domain from customer Billing & Payments. Expected workspace direction: `Supplier Bills`; `Supplier Payments`.
  - UX principle: do not expose redundant review/approval buttons; combine internal checks into one governed user action when they occur as one business decision; keep separate actions only for genuinely separate events such as approval and a later actual payment.
  - W6B remains operational AP, not accounting posting. Supplier advances/deposits remain distinct from ordinary Supplier Bill payments; supplier disputes/governed corrections remain distinct from silent mutation.
  - No GL/accounting engine, VAT filing engine, FATOORA/ZATCA activation, bank integration, PROD deployment, or production mutation is authorized by this status.
- **Next product step:** `W6 residual discovery` covering `Supplier Advance / Deposit` and `Supplier Dispute / governed correction boundaries`. Discovery only; implementation is not authorized by this documentation update.

> This section preserves the 15 September delivery snapshot. Current wave status and next action are recorded above; historical delivery and deferral sections below remain unchanged.

## HISTORICAL DELIVERY AND DEFERRALS — 9 September 2026 (SUPERSEDED CURRENT SNAPSHOT)

> This section preserves the 9 September deferral snapshot. Its W5-incomplete and remaining-scope statements are historical and are superseded by the current delivery status above.

- **W1B Approval Authority / SoD:** explicitly **NOT REQUIRED FOR THIS WAVE** after review of the real quotation-approval consumer. It remains deferred, unimplemented, and must not be replaced with a generic approval/rules engine.
- **W1 completion:** W1A Effective Access and the two bounded W1C Action Center consumers (Quotation Approvals and Ready-to-Start Services) are Owner-accepted. Their source workflows remain authoritative; no additional W1C feature is inferred.
- **W2A/W2B completion:** Commercial Authority Line hierarchy and Quotation Revision Lineage are `PASS` on the Owner-authorized DEV environment only. W2B preserves source history, keeps Approved sources fail closed, and does not supersede ABS or reapprove billing authority.
- **W2C completion:** Deterministic Discount Allocation / Approval Projection is `PASS` and closed on the Owner-authorized DEV environment only. The approved fixed-amount SAR rule is implemented with persisted integer-halal proportional largest-remainder allocation, deterministic `created_at ASC, id ASC` ties, Authority Line-root attribution, exact approval/ABS projection copies, W2B revision copying, and fail-closed invalid hierarchy/currency/ABS-adjustment behavior. No DEMO environment currently exists; no production or deployment claim is made.
- **W3 completion:** Event Lifecycle compatibility is `PASS`, Owner-accepted, and closed on the Owner-authorized DEV environment only. The additive projection separates commercial, payment, readiness, execution, completion and operational close semantics, preserves legacy `services.status`, uses authoritative active-deposit payment evidence, and keeps authorized-credit permission separate from `app_user_permission_overrides`. No DEMO environment currently exists; no production or deployment claim is made.
- **W4 completion:** W4 Procurement & Commitments is `CLOSED / COMPLETED`. Migration `20260906120000_w4_architecture_remediation.sql` is applied to DEV project `dpddrqjzqohexixgdqiq` under migration identity `20260907085656 w4_architecture_remediation`. DEV transactional smoke PASS (zero residue). Required residual delivery gates L1-R01–L1-R08 are recorded in technical master plan Section 15.1.
- **W5A completion:** W5A Expense & Cash Accountability Foundation (`L1-D08-EXPENSE-CASH`) is `PASS` and closed on the Owner-authorized DEV environment only (`dpddrqjzqohexixgdqiq`). Delivered 9 domain tables (`employee_cash_advances`, `cash_advance_returns`, `petty_cash_funds`, `expenses`, `cash_advance_expense_settlements`, `expense_reimbursement_settlements`, `expense_evidence_exceptions`, `expense_documents`, `petty_cash_transactions`), 1 audit compatibility index, 1 authoritative accountability view (`public.expense_accountability_summaries`), and 16 transactional RPCs with fail-closed request_id replay conflict protection and strict Segregation of Duties (SoD) self-approval rejection. Base migration `20260907150000_w5a_expense_cash_foundation.sql` is applied on DEV under identity `20260907133406`; corrective repair migration `20260907164500_w5a_rpc_output_ambiguity_repair.sql` is applied on DEV under identity `20260907164500` (bounded WARN: direct SQL apply followed by migration repair); transactional smoke PASS (zero residue). No DEMO environment currently exists; no production or deployment claim is made.
- **W5B Employee Expense Self-Service Delivery:** The bounded Employee Expense Self-Service workspace (`/expenses`), mobile receipt camera capture, private document attachment, role-aware reading, segregation of duties, and separate Finance review gate are DELIVERED and OWNER-ACCEPTED. It is no longer deferred.
- **W5 Deferrals:** Cash Advance workspace (`/advances`), Petty Cash workspace (`/petty-cash`), automated replenishment scheduling, multi-tier corporate finance threshold routing (where not delivered), and General Ledger / professional accounting integration remain deferred until explicit separate task authorization.
- **Current action:** W5B Employee Expense Self-Service slice is delivered and Owner-accepted; remaining W5 Cash Advance and Petty Cash workspaces remain unstarted future slices. W5 overall is NOT COMPLETE.

## CURRENT DEFERRAL BOUNDARY — 31 August 2026

All 11 Layer 1 Event ERP domains are closed at Product Truth level. No domain is deferred because its product identity is unknown. Deferrals below are implementation details, field-evidence defaults, professional activation gates, environment/authority gates, Owner acceptance, or future Layer 2 work.

Current source and delivery truth remains in [project-status.md](project-status.md). Ordered future work is in [project-roadmap.md](project-roadmap.md). Closed Product Truth is indexed in [event-erp-decision-register.md](product/event-erp-decision-register.md). The complete technical plan is [g7-layer1-technical-master-plan.md](product/g7-layer1-technical-master-plan.md).

This file grants no runtime, schema, SQL, database, deployment, production, publication, or Layer 2 authority.

## 1. DETAILS DEFERRED — PRODUCT TRUTH ALREADY CLOSED

- Exact database field/table/RPC names, indexes, materialization, and migration batching.
- Exact dashboard widget order, role-template defaults, ageing buckets, refresh cadence, notification channel, export format, and report layout.
- Exact Event task/resource board interaction patterns beyond the locked authority/lifecycle semantics.
- G7 default terminology and configuration values that require real sanitized examples.
- Procurement tolerance values, approval thresholds, document templates, and emergency-review timing. G7-OD-18 excludes candidate comparison/ranking from current ERP workflow; retained candidates are historical compatibility only.
- Expense evidence limits, advance settlement timing, petty-cash replenishment details, and finance-owner defaults.
- Customer credit-limit values, collection cadence, billing-schedule templates, and exception thresholds.
- Event contingency defaults, ETC update cadence, close checklist, and proof thresholds.
- Query indexes, caching, materialized views, payload changes, and performance tuning until a concrete measured question exists.

These details may be decided inside a future bounded implementation slice if they do not weaken a Product Invariant. A proposed exception to a Product Invariant returns to the Owner.

## 2. PROFESSIONAL REVIEW / ACTIVATION DEFERRALS

### 2.1 Accounting and revenue

Deferred until Saudi-qualified accounting review and explicit activation:

- chart of accounts and control accounts;
- operational-to-journal mappings;
- posting, reversal, correction and period-lock policy;
- opening balances and legacy accounting migration;
- GL, bank reconciliation, trial balance, period close and financial statements;
- revenue-recognition policy and reports;
- cash-flow classification and accounting presentation;
- accounting treatment of advances, deposits, credits, refunds, doubtful debt, foreign currency and tax.

The Product Truth is not deferred: invoice, payment, revenue, payable, cost, commitment, cash and Event Margin remain separate. Operational and managerial work may proceed without labeling itself accounting.

### 2.2 VAT, tax and FATOORA

Deferred until confirmed G7 registration/applicability evidence, Saudi tax professional review, current official ZATCA requirements, security/integration review, test-environment evidence, and explicit activation:

- VAT calculation and tax-accounting policy;
- Tax Invoice / simplified invoice / tax note wording and data;
- VAT return/reporting;
- FATOORA generation, clearance/reporting, integration, cryptographic controls and compliance claims.

Current company truth remains `vat_mode = not_registered`; the existing prohibition on VAT Number, Tax Invoice wording, VAT 15%, and ZATCA/FATOORA claims remains active until valid evidence changes it.

### 2.3 Bank, HR, legal and insurance

Deferred until the actual workflow and appropriate professional/security review exist:

- bank import/reconciliation automation and payment files;
- bank-destination mutation automation;
- payroll-like labor/expense treatment;
- temporary labor, insurance, claim and regulated contractual details.

## 3. AUTHORITY-GATED WORK

The following are not product deferrals; they require their own explicit authority:

- protected `AGENTS.md`, ERP Guard, ERP Design Guard and Design Contract synchronization;
- runtime code implementation;
- schema, migration, SQL, RPC, RLS/policy, grant, index and generated-type changes;
- DEV/DEMO database application;
- staging, commit, push, PR, merge or publication;
- deployment, production database/application, integration activation or data cutover;
- credentialed provider work or inspection of protected authentication/configuration material.

The exact protected-document proposal is Section 25 of the technical master plan. That proposal is retained as historical evidence; W2A/W2B/W2C, bounded W3 lifecycle, and W4 Procurement & Commitments are closed. Current continuation is W4 closeout, with residual L1-R01–L1-R08 delivery gates retained. Any remaining Product Truth synchronization is a separate authority boundary.

## 4. OWNER MANUAL ACCEPTANCE STILL REQUIRED

Automated validation and independent review do not substitute for Mozfer acceptance of future delivered behavior. W3 acceptance is complete for the bounded reviewed slice; each future applicable slice retains:

- English desktop;
- Arabic desktop and natural RTL;
- mobile/responsive;
- visual hierarchy and interaction meaning;
- keyboard/focus and accessibility behavior;
- customer/supplier-facing preview, PDF, print and export;
- full workflow, corrections, failures, permissions and exception handling.

Acceptance is exact to the reviewed slice and is not a general production-readiness claim.

## 5. MIGRATION / CUTOVER DEFERRALS

Implementation cannot silently reinterpret historical rows. Deferred until separately reviewed/authorized:

- expansion beyond the bounded W3 legacy status projection, historical correction/exception-queue resolution, and legacy-path removal after stabilization evidence;
- remaining legacy quotation/ABS mapping beyond the delivered W2A Authority Line hierarchy and W2B quotation-family/revision lineage;
- deposit/final invoice/payment mapping into schedules, allocations, credits/refunds and historical as-of receivables;
- supplier allocation/booking mapping without inventing commitments, receipt, AP or Actual Cost;
- exception-queue resolution for facts that cannot be derived;
- isolated rehearsal, backup/restore, reconciliation, rollback and domain-by-domain cutover;
- legacy-path removal after stabilization evidence.

No invented commitment, acceptance, allocation, cost, revenue, readiness or accounting entry is permitted to make a migration appear complete.

## 6. PERFORMANCE / SCALE RETURN-LATER

The current-core G4 program remains closed as documented in status/roadmap. Reopen a performance task only for a concrete, current, comparable user-visible or layer-attributed target. Do not pre-authorize cache, index, materialized view, payload, query, bundling or architecture changes from this Layer 1 plan.

If a future query/index question is not supported by query text, schema, data distribution and plan evidence, report `INSUFFICIENT QUERY / INDEX EVIDENCE`.

## 7. FUTURE EXTENSION SEAMS — NOT LAYER 1 SCOPE

- AI dashboard/report summaries or proposal assistance. Any future seam is read-only, permission-filtered, source-cited, as-of disclosed, uncertainty-aware and human-controlled; it cannot approve/post/mutate or become authority.
- Generic dashboard builder or generic workflow engine.
- Tender/Bid Management implementation, Technical Proposal, Financial Proposal/BOQ and guarantees. Strategic direction remains in the Expansion Master; implementation is separate.
- Generic Product/catalog abstraction beyond proven commercial needs.
- Multi-company/company context, tenancy, memberships, isolation, subscriptions, onboarding, billing plans, quotas, cross-company analytics and other Layer 2 SaaS work.
- Layer 2 proof thresholds and activation decision, to be set after real G7 Layer 1 use.

## 8. NOT DEFERRED / MUST NOT BE REOPENED WITHOUT CONTRADICTION

- Service/Event is the primary Layer 1 operating context.
- Commercial, payment, operational, managerial-costing and accounting states are separate.
- Deposit payment is not the target universal execution prerequisite.
- Booking/Allocation is not Approved Commitment, receipt, Vendor Bill, payable, supplier payment, Actual Cost or accounting entry.
- Cash Advance is not Expense; Petty Cash is not Employee Advance.
- Invoice is not Payment and neither is Revenue Recognition.
- Event Margin is managerial and not accounting profit.
- Action Center is derived; source records retain authority.
- Dashboard/report values are permission-filtered, source-traceable and as-of/freshness disclosed.
- approved/issued/posted/paid/closed history is corrected or superseded, not hard-deleted.
- One Product / One Codebase / Configurable Company Behavior; configuration cannot weaken invariants.
- Layer 1 is single-company G7 BLUE; Layer 2 remains future.

## 9. HISTORICAL DEFERRAL NOTE

The 27 August 2026 “Quotation Commercial Model Field-Evidence Gate” and broad “Event ERP deferred” next-step wording is superseded by the 31 August decision closure. Real examples remain valuable for defaults, migration and acceptance; they no longer block Product Truth closure. Earlier G1–G12, P0–P10, Feature 009, ABS Void/Supersede and Wednesday-discovery references remain dated historical evidence and must not replace the current next action.

## 10. HISTORICAL EXACT NEXT ACTION (SUPERSEDED BY CURRENT W1 CLOSEOUT)

The prior action was approval of the seven-item protected synchronization manifest in technical master plan Section 25. That W2 instruction is also superseded by the current delivery section above; no additional W1C feature is inferred and no runtime, schema, database, publication, deployment, production or Layer 2 authority is implied by this historical note.
