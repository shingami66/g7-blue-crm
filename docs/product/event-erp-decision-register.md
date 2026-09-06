# G7 BLUE Event ERP Decision Register

## 1. Register Status

- Register version: 1.0 — final Layer 1 Product Truth closure.
- Closure date: 31 August 2026 (Asia/Riyadh).
- Owner: Mozfer Mohamed Elhadi.
- Scope: Layer 1, single-company G7 BLUE Event ERP.
- Status: **ALL 11 DOMAINS CLOSED AT PRODUCT-DECISION LEVEL — PASS WITH WARN**.
- Detailed decision authority: Controller `G7_LAYER1_DECISION_CLOSURE_REGISTER.md`.
- Technical execution planning: [G7 Layer 1 Technical Master Plan](g7-layer1-technical-master-plan.md).
- Strategic expansion authority: [G7 BLUE Event ERP Future Expansion Master](G7_BLUE_Event_ERP_Future_Expansion_Master_Handover.md).
- A locked decision or roadmap is not implementation, database, deployment, production, publication or Layer 2 authority.

## 2. Decision Classes

- **OWNER DECISION:** an explicit Owner choice; none remains open in this closure.
- **PRODUCT INVARIANT:** behavior that protects product meaning, authority, auditability or financial truth.
- **COMPANY-CONFIGURABLE POLICY:** G7 default or future company behavior selectable within invariants.
- **PROFESSIONAL REVIEW DEPENDENCY:** product direction is closed; accounting/tax/legal/security activation needs qualified review.
- **DETAILS DEFERRED:** field, layout, default, threshold or implementation detail that does not reopen Product Truth.
- **FUTURE EXTENSION SEAM:** inactive boundary preserved for later authorized work.

Allowed closure verdicts are `PASS`, `PASS WITH WARN`, `PARTIAL`, `HOLD`, and `FAIL`.

## 3. Final Domain Status

| Domain | Status | Product-decision result | Remaining boundary |
|---|---|---|---|
| 1 Quotation / Commercial Model | LOCKED | One customer-priced Authority Line, included components, selected optional add-ons, presentation-only groups, whole approval, revision lineage, deterministic discount allocation and one bilingual authority. | Exact schema/UI/defaults; no Tender/catalog activation. |
| 2 Procurement | LOCKED / DETAILS DEFERRED | Requirement, sourcing evidence, supplier comparison where useful, Approved Commitment/amendment, emergency path and receipt/acceptance remain explicit and separate. | Thresholds/templates; implementation/DB authority. |
| 3 Expenses / Advances / Petty Cash | LOCKED / DETAILS DEFERRED | Expense, reimbursement, employee advance and petty cash are distinct; evidence exception is controlled; no self-approval; settlement/correction are traceable. | G7 defaults and professional cases. |
| 4 Accounts Payable | LOCKED / PROFESSIONAL REVIEW | Commitment/acceptance/vendor bill/matching/dispute/payable/due/payment are separate; supplier advances/deposits separate. | Accounting/tax mapping and activation. |
| 5 Accounts Receivable | LOCKED / PROFESSIONAL REVIEW | Commercial/billable authority, invoice, issue/due, payment, allocation, outstanding/overdue/ageing, credit/refund/correction remain separate; revenue separate. | Credit defaults; accounting/tax activation. |
| 6 Accounting | LOCKED PRINCIPLES / PROFESSIONAL REVIEW | Operational truth → accountant mapping → balanced journal → posting → GL → reconciliation/TB → period close → statements. | Qualified accounting blueprint and activation. |
| 7 Event Costing / Margin | LOCKED | Budget, contingency, commitments, actuals, ETC/EAC, forecast/final Event Margin and confidentiality are explicit; managerial ≠ accounting profit. | Defaults, close evidence, implementation. |
| 8 Event Operations | LOCKED | Service/Event is primary context; lifecycle, handoff, readiness, execution, completion, close, brief, requirement, task, milestone, issue, people, resources and learning remain distinct. | Exact workflow/UI/schema. |
| 9 Permissions / Approval | LOCKED | Role templates + user grants/denials, record scope, sensitive fields, approval authority, SoD, bounded exceptions, audit and derived Action Center. | Exact policy schema/templates. |
| 10 Navigation / Design | LOCKED | Dashboard landing context, work lists, analytical reports, explicit action meaning, uncertainty states, English/Arabic/RTL/mobile/a11y. | Exact layouts and component decisions. |
| 11 Dashboards / Reporting | LOCKED | Role/responsibility/Event context, derived Action Center, source/as-of/freshness/trace, operational/managerial/accounting separation, permission-safe drill/export. | Widget/default details; professional accounting reports. |

No Domain 1–10 decision was reopened. No Owner Decision Packet is required.

## 4. Closed Cross-Domain Invariants

1. Layer 1 serves one company, G7 BLUE. No multi-company/company-context schema or behavior is introduced by default.
2. One Product / One Codebase / Configurable Company Behavior. Configuration cannot weaken authorization, auditability, SoD, financial invariants, correction history, confidentiality or traceability.
3. Event/Service is the operating aggregate; linked commercial, operational, financial and accounting records retain their own authority/lifecycle.
4. Payment status, operational readiness, execution, completion, financial close and accounting close are distinct.
5. Approved, issued, posted, paid or closed history is corrected/reversed/credited/superseded, not hard-deleted or silently rewritten.
6. Derived values reproduce from authoritative sources at a disclosed as-of boundary.
7. One logical Writer mutates; a separate Reviewer is findings-only; Controller owns final reconciliation/verdict; Mozfer owns applicable manual acceptance.
8. Exactly five Generic Core specifications, Core Protocol `v0.1.0-alpha.1`, and `built_from_head()` remain preserved.

## 5. Commercial and Billing Authority

- **COM-01 — PRODUCT INVARIANT:** one Authority Line owns each customer price. Included Components never add independent price; selected Optional Add-ons do.
- **COM-02 — PRODUCT INVARIANT:** Commercial Group is presentation/organization only and never duplicates authority.
- **COM-03 — PRODUCT INVARIANT:** one approved commercial revision is the billable/commercial basis. Post-Sent material change creates a revision with lineage and reason.
- **COM-04 — PRODUCT INVARIANT:** quotation-level fixed-SAR or percentage discount allocates deterministically at the defined stage and reconciles exactly.
- **COM-05 — PRODUCT INVARIANT:** English and Arabic are representations of one commercial authority; snapshots preserve issued/approved history.
- **COM-06 — COMPANY-CONFIGURABLE POLICY:** terminology, templates, controlled core units, custom units and presentation defaults may vary within invariants.
- **COM-07 — FUTURE EXTENSION SEAM:** supplier linkage, Tender/BOQ and generic catalog may consume central commercial truth later; they do not create a second financial universe.

## 6. Procurement and Supplier Obligations

- **PROC-01 — PRODUCT INVARIANT:** Event Requirement, supplier sourcing/quote/comparison, Approved Commitment, Booking, receipt/acceptance, Vendor Bill, payable and supplier payment remain separate.
- **PROC-02 — PRODUCT INVARIANT:** Approved Commitment is the controlled obligation basis; Open Commitment is its remaining unfulfilled/unreleased value.
- **PROC-03 — PRODUCT INVARIANT:** amendments preserve original authority and reason; cancellation does not erase history.
- **PROC-04 — PRODUCT INVARIANT:** emergency/sole-source work uses bounded authority, reason, evidence and retrospective review; it does not require fake competition.
- **PROC-05 — PRODUCT INVARIANT:** supplier cost and comparison evidence are permission-sensitive and never customer-visible by default.
- **PROC-06 — DETAILS DEFERRED:** thresholds, tolerance, document form, comparison layout and G7 default approval path.
- **PROC-07 — PRODUCT INVARIANT (G7-OD-18):** Procurement Packages (`service_procurement_packages`, `service_procurement_package_requirements`) are the canonical current ERP organizing and selection workflow for service procurement. A Procurement Package has at most one selected supplier (a draft package may have no selected supplier). Supplier Quotations (`supplier_quotations`, `supplier_quotation_lines`) are first-class commercial and operational evidence. Candidate comparison, ranking, scoring, or automated evaluation is NOT current ERP Product Truth. Legacy candidate sourcing tables and RPCs (`service_procurement_requirements`, `service_procurement_candidates`) are preserved strictly for backward compatibility and historical integrity where still present. Approved Commitment remains a separate downstream human authorization workflow; package creation or supplier selection creates no automatic commitment.

## 7. Expenses, Advances and Petty Cash

- **EXP-01 — PRODUCT INVARIANT:** Cash Advance ≠ Expense; Petty Cash ≠ Employee Advance; reimbursement is a settlement path, not the original expense identity.
- **EXP-02 — PRODUCT INVARIANT:** submitter cannot self-approve; approval authority and record scope are server enforced.
- **EXP-03 — PRODUCT INVARIANT:** missing evidence is an explicit exception with reason, owner, expiry/review and audit; it cannot silently become ordinary evidence.
- **EXP-04 — PRODUCT INVARIANT:** settlement, return, correction, rejection and cancellation preserve history and exact balances.
- **EXP-05 — PROFESSIONAL REVIEW DEPENDENCY:** payroll/tax/accounting treatment is activated only when the actual case and professional review exist.
- **EXP-06 — DETAILS DEFERRED:** G7 limits, evidence windows, replenishment and role defaults.

## 8. Accounts Payable

- **AP-01 — PRODUCT INVARIANT:** Approved Commitment → receipt/acceptance → Vendor Bill received → validation/matching → approved payable → due → supplier payment.
- **AP-02 — PRODUCT INVARIANT:** Bill, payable and payment remain separate records; invoice receipt alone creates neither payment nor accounting posting.
- **AP-03 — PRODUCT INVARIANT:** duplicate/replay, amount/currency, supplier identity, bank destination, commitment/receipt variance and approval authority are checked.
- **AP-04 — PRODUCT INVARIANT:** supplier advance/deposit is separate, allocated/settled explicitly and never silently becomes expense.
- **AP-05 — PRODUCT INVARIANT:** dispute, partial approval, credit/correction and cancellation preserve source evidence and outstanding truth.
- **AP-06 — PROFESSIONAL REVIEW DEPENDENCY:** accounting/tax posting, VAT recovery and formal liability policy.

## 9. Accounts Receivable

- **AR-01 — PRODUCT INVARIANT:** customer commercial authority and billable authority precede invoice; advance, progress/stage and final invoices are supported without making invoice types authority substitutes.
- **AR-02 — PRODUCT INVARIANT:** issue date, due date, payment business date, allocation date and accounting recognition date remain separate.
- **AR-03 — PRODUCT INVARIANT:** issued/billed, collected, allocated, current outstanding, historical as-of outstanding, overdue, ageing, customer credit/unapplied, credit note and refund are separate metrics/records.
- **AR-04 — PRODUCT INVARIANT:** payment replay, duplicate, overpayment, partial allocation, reversal and correction are controlled and exact.
- **AR-05 — PRODUCT INVARIANT:** overdue derives from due date and positive outstanding at the relevant as-of boundary; collection-call logging is not mandatory Product Truth.
- **AR-06 — PROFESSIONAL REVIEW DEPENDENCY:** revenue recognition, doubtful debt, tax notes and FATOORA activation.

## 10. Accounting

- **ACC-01 — PRODUCT INVARIANT:** Operational truth → accountant-approved mapping → balanced journal → posting → GL → reconciliation/trial balance → period close → financial statements.
- **ACC-02 — PRODUCT INVARIANT:** Invoice ≠ Payment ≠ Revenue; Vendor Bill ≠ Payable ≠ Supplier Payment; Event Margin ≠ accounting profit.
- **ACC-03 — PRODUCT INVARIANT:** posted records are corrected by governed reversal/adjustment, not silent edit/delete; period locks and reopening are explicit.
- **ACC-04 — PROFESSIONAL REVIEW DEPENDENCY:** chart/accounts, mapping, recognition, cash-flow classification, close, statements, tax and opening balances.
- **ACC-05 — FUTURE EXTENSION SEAM:** bank/ZATCA/integration adapters remain inactive until professional/security/environment authority.

## 11. Event Costing and Margin

- **COST-01 — PRODUCT INVARIANT:** `Estimate/Base Budget + Event Contingency = Approved Budget Cost`.
- **COST-02 — PRODUCT INVARIANT:** `Approved Commitment → Open Commitment → Actual Cost → Paid/Outstanding` remains traceable without collapsing stages.
- **COST-03 — PRODUCT INVARIANT:** `Actual Cost + ETC = EAC`.
- **COST-04 — PRODUCT INVARIANT:** `Net Approved Commercial Value − EAC = Forecast Margin`.
- **COST-05 — PRODUCT INVARIANT:** `Final Net Approved Commercial Value − Final Actual Event Cost = Actual Event Margin`.
- **COST-06 — PRODUCT INVARIANT:** contingency, estimates, commitments, actuals, ETC, margin and supplier cost are permission-sensitive and disclose completeness/as-of/source.
- **COST-07 — PROFESSIONAL REVIEW DEPENDENCY:** any mapping of managerial costs/margins into accounting profit/loss.
- **COST-08 — DETAILS DEFERRED:** contingency defaults, ETC cadence, close checklist and G7 proof thresholds.

## 12. Event Operations

- **OPS-01 — PRODUCT INVARIANT:** Service is the primary Event container; operational authority is not duplicated by a dashboard/list/report.
- **OPS-02 — PRODUCT INVARIANT:** commercial approval, payment, handoff, readiness, start/in-progress, completion, financial close and accounting close are distinct.
- **OPS-03 — PRODUCT INVARIANT:** Deposit Paid is payment evidence and not the target universal execution prerequisite.
- **OPS-04 — PRODUCT INVARIANT:** Event Brief, Requirement, Task, Milestone, Issue, Resource, Supplier obligation/booking, Person/User/Team Role, Incident and evidence remain distinct concepts.
- **OPS-05 — PRODUCT INVARIANT:** completion does not claim billing/AP/costing/accounting close; controlled reopen/follow-up and closeout learning preserve history.
- **OPS-06 — DETAILS DEFERRED:** exact state labels, boards/layouts, templates and resource-planning depth.

## 13. Permissions, Approval and Action Center

- **PERM-01 — PRODUCT INVARIANT:** role templates combine with user-specific grants/denials; explicit denial wins; every decision is server enforced and explainable.
- **PERM-02 — PRODUCT INVARIANT:** record scope, sensitive-field access and approval authority are distinct dimensions.
- **PERM-03 — PRODUCT INVARIANT:** SoD conflicts require bounded, reasoned, time-limited, reviewed exception; no silent self-approval.
- **PERM-04 — PRODUCT INVARIANT:** Action Center is a derived index of authoritative assigned/blocking/overdue/exception work and links to its source.
- **PERM-05 — PRODUCT INVARIANT:** `Action required`, `Attention` and `Information` are distinct; notification delivery is a signal, not task authority.
- **PERM-06 — COMPANY-CONFIGURABLE POLICY:** role templates, approval matrices, delegation defaults, session defaults and field groups may vary within invariants.
- **PERM-07 — DETAILS DEFERRED:** exact schema, templates, approval thresholds and provider/session mechanics.

## 14. Navigation and Design

- **NAV-01 — PRODUCT INVARIANT:** Dashboard is landing/context; lists are operational work surfaces; detail/Event Workspace is source action context; Reports are analytical.
- **NAV-02 — PRODUCT INVARIANT:** Save Draft, Submit, Approve, Reject, Cancel, Void, Supersede, Post, Pay, Allocate, Complete, Close and Reopen retain distinct meanings.
- **NAV-03 — PRODUCT INVARIANT:** loading, pending, retry, network uncertainty, unavailable, denied, partial, empty and failed states are explicit.
- **NAV-04 — PRODUCT INVARIANT:** English/Arabic parity, natural RTL, bidi-safe IDs/amounts, responsive/mobile priority, keyboard, visible focus, semantic structure and WCAG 2.2 AA target.
- **NAV-05 — PRODUCT INVARIANT:** shared design-system reuse follows proven workflow needs and may not hide business state or overbuild a generic platform.
- **NAV-06 — DETAILS DEFERRED:** exact layouts/component composition and tested mobile priority by workflow.

## 15. Dashboards and Reporting

- **REP-01 — PRODUCT INVARIANT:** dashboard/report values are derived, permission-filtered and never source authority.
- **REP-02 — PRODUCT INVARIANT:** landing composition follows role, responsibility, record scope and sensitive-field access; selected Event and portfolio/global contexts are explicitly labeled.
- **REP-03 — PRODUCT INVARIANT:** Action Center exposes authoritative work by severity and source link; it does not duplicate workflow state.
- **REP-04 — PRODUCT INVARIANT:** every time-sensitive metric identifies effective date/time, Riyadh timezone, filters/period, source, freshness and as-of behavior. Denied/unavailable/partial/empty/failed never become fake zero.
- **REP-05 — PRODUCT INVARIANT:** Event Workspace owns event-day readiness/work summaries; Reports own cross-event/managerial analysis.
- **REP-06 — PRODUCT INVARIANT:** commercial, operational, managerial costing, cash, AR/AP and accounting views stay explicitly separated.
- **REP-07 — PRODUCT INVARIANT:** drill/export remains permission-checked and preserves filters, as-of/freshness, language/direction, confidentiality, stable IDs and source trace.
- **REP-08 — COMPANY-CONFIGURABLE POLICY:** widget composition, default period, ageing buckets, refresh cadence, export availability and role templates may vary within invariants.
- **REP-09 — PROFESSIONAL REVIEW DEPENDENCY:** journal/GL/TB/statements/cash-flow/revenue/tax outputs activate only after professional approval.
- **REP-10 — DETAILS DEFERRED:** exact widgets/layouts/buckets/exports/refresh thresholds.
- **REP-11 — FUTURE EXTENSION SEAM:** future AI summary may be read-only, permission-filtered, source-cited, as-of/uncertainty disclosed and human-controlled; it cannot approve, post or mutate.

## 16. Explicit Supersessions and Implementation Gaps

| Current/older statement | Final treatment |
|---|---|
| Cleared deposit is required before target operational execution. | Superseded as target Product Truth; retained as current/legacy mechanic until migrated. |
| Supplier Booking/Allocation represents financial commitment or Actual Cost. | Rejected; operational foundation only. |
| `Collected` can be reported from invoice-period invoices and their cumulative `amount_paid`. | Superseded for target reports; use valid payment business dates and allocations. |
| Current outstanding is sufficient for historical period-end outstanding. | Rejected; historical as-of requires replayable source events/read models. |
| Broad procurement/expense/AP/accounting/costing/operations/permissions/reporting Product Truth is pending field evidence. | Superseded; Product Truth closed, details/evidence/activation classified separately. |
| Event ERP, Feature 009 or broad Layer 1 is inactive as a planning direction. | Superseded for planning; implementation remains inactive until separately authorized. |

## 17. Professional and Authority Gates

- Accounting, revenue recognition, financial statements and period-close activation require qualified accounting review.
- VAT/tax/FATOORA claims and integration require current official evidence, professional review and explicit activation.
- Bank/external integrations and bulk sensitive exports require security/finance review.
- Schema/SQL/migration/RPC/RLS/grants, DEV/DEMO apply, publication, deployment, production and Layer 2 each require separate authority.
- Mozfer manual English/Arabic/RTL/mobile/visual/print/workflow acceptance remains pending until evidence exists.

## 18. Historical Baseline

Register version 0.1 dated 2 August 2026 recorded 26 `LOCKED`, 16 `DIRECTIONALLY LOCKED`, 10 `PROPOSED`, 14 `PENDING FIELD EVIDENCE`, 8 `DEFERRED`, 0 `REJECTED`, and one explicit `UNKNOWN - MUST VERIFY`. That baseline remains historical discovery evidence. Its open questions informed the final Controller closure register but no longer represent the current Layer 1 decision status.

## 19. Exact Next Action

Mozfer approves the seven-item protected `AGENTS.md`/guard/Design Contract synchronization manifest in technical master plan Section 25 for one Writer and one independent findings-only Reviewer. No runtime, schema, database, publication, deployment, production or Layer 2 authority is included.
