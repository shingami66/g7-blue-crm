# G7 BLUE CRM — Deferred Decisions

## CURRENT W1 CLOSEOUT — 31 August 2026

- **W1B Approval Authority / SoD:** explicitly **NOT REQUIRED FOR THIS WAVE** after review of the real quotation-approval consumer. It remains deferred, unimplemented, and must not be replaced with a generic approval/rules engine.
- **W1 completion:** W1A Effective Access and the two bounded W1C Action Center consumers (Quotation Approvals and Ready-to-Start Services) are Owner-accepted. Their source workflows remain authoritative; no additional W1C feature is inferred.
- **W2A/W2B completion:** Commercial Authority Line hierarchy and Quotation Revision Lineage are `PASS` on the Owner-authorized DEV environment only. W2B preserves source history, keeps Approved sources fail closed, and does not supersede ABS or reapprove billing authority.
- **W2C completion:** Deterministic Discount Allocation / Approval Projection is `PASS` and closed on the Owner-authorized DEV environment only. The approved fixed-amount SAR rule is implemented with persisted integer-halal proportional largest-remainder allocation, deterministic `created_at ASC, id ASC` ties, Authority Line-root attribution, exact approval/ABS projection copies, W2B revision copying, and fail-closed invalid hierarchy/currency/ABS-adjustment behavior. No DEMO environment currently exists; no production or deployment claim is made.
- **W3 completion:** Event Lifecycle compatibility is `PASS`, Owner-accepted, and closed on the Owner-authorized DEV environment only. The additive projection separates commercial, payment, readiness, execution, completion and operational close semantics, preserves legacy `services.status`, uses authoritative active-deposit payment evidence, and keeps authorized-credit permission separate from `app_user_permission_overrides`. No DEMO environment currently exists; no production or deployment claim is made.
- **Next locked roadmap task:** W4 Procurement & Commitments (`L1-D06-PROCUREMENT-REQUIREMENT`) requires a separate Owner-authorized task. Percentage discounts, non-SAR/FX allocation, VAT/revenue/accounting policy, Change Orders, ABS supersession/reapproval, broader historical correction/cutover work, and further W2/W3 expansion remain deferred or out of scope. This closeout authorizes no new schema, database, production, deployment, Layer 2, or professional activation work.

## CURRENT DEFERRAL BOUNDARY — 31 August 2026

All 11 Layer 1 Event ERP domains are closed at Product Truth level. No domain is deferred because its product identity is unknown. Deferrals below are implementation details, field-evidence defaults, professional activation gates, environment/authority gates, Owner acceptance, or future Layer 2 work.

Current source and delivery truth remains in [project-status.md](project-status.md). Ordered future work is in [project-roadmap.md](project-roadmap.md). Closed Product Truth is indexed in [event-erp-decision-register.md](product/event-erp-decision-register.md). The complete technical plan is [g7-layer1-technical-master-plan.md](product/g7-layer1-technical-master-plan.md).

This file grants no runtime, schema, SQL, database, deployment, production, publication, or Layer 2 authority.

## 1. DETAILS DEFERRED — PRODUCT TRUTH ALREADY CLOSED

- Exact database field/table/RPC names, indexes, materialization, and migration batching.
- Exact dashboard widget order, role-template defaults, ageing buckets, refresh cadence, notification channel, export format, and report layout.
- Exact Event task/resource board interaction patterns beyond the locked authority/lifecycle semantics.
- G7 default terminology and configuration values that require real sanitized examples.
- Procurement tolerance values, approval thresholds, comparison presentation, document templates, and emergency-review timing.
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

The exact protected-document proposal is Section 25 of the technical master plan. That proposal is retained as historical evidence; W2A and W2B are now closed, and the current next bounded W2 action is the W2C Deterministic Discount Allocation / Approval Projection preflight. Any remaining Product Truth synchronization is a separate authority boundary.

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

The prior action was approval of the seven-item protected synchronization manifest in technical master plan Section 25. The current next wave is W2 Commercial Authority under a new Owner-authorized task; no additional W1C feature is inferred and no runtime, schema, database, publication, deployment, production or Layer 2 authority is implied by this historical note.
