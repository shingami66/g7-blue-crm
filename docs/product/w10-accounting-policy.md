# W10 Accounting Policy — Provisional G7 Engineering Baseline

## 1. Status and authority

- Date: 27 September 2026 (Asia/Riyadh).
- Authority: Owner decision **G7-OD-28**, recorded in the [decision register](event-erp-decision-register.md#20-current-owner-decision--g7-od-28--27-september-2026).
- **W10 POLICY / TECHNICAL BLUEPRINT — ACTIVE.** This is a documentation candidate for Controller review, not professional certification or runtime delivery.
- **W10 RUNTIME IMPLEMENTATION — NOT STARTED.** This task authorizes no application code, database access, SQL, migration, DEV mutation, deployment, staging, commit or push.
- Scope: G7's current single-company proof-lab. The [technical blueprint](w10-accounting-technical-blueprint.md) translates this provisional baseline into bounded future designs.

G7-OD-28 removes professional accounting review as a prerequisite for the technical blueprint, separately authorized bounded DEV implementation, and non-production validation. It defers qualified professional validation to pre-production/live-accounting activation. Earlier pre-DEV prerequisites in ACC-04, the professional-gate section of the register and historical planning documents are superseded only to this extent. Historical decisions remain preserved; financial invariants and separate mutation authority remain binding.

## 2. Framework, fiscal year and currency

| Topic | Owner baseline | Remaining evidence / boundary |
|---|---|---|
| Framework | Saudi-endorsed IFRS for SMEs, 2025 edition aware | Final eligibility, local endorsements, transition and any early adoption need professional validation before live activation. This is not a declaration that G7 has adopted or complies with that edition. |
| Fiscal year | 1 January–31 December | Governing legal documents and first reporting period remain to be confirmed; they do not block DEV design. |
| Currency | Working functional and operating currency SAR | First implementation SAR-only. Functional-currency conclusion remains provisional; no FX, rates, revaluation, exchange differences or multi-currency posting. |
| Tax | VAT inactive; G7 not registered; ZATCA/FATOORA inactive | No tax engine, tax posting, tax invoice compliance, submission or regulatory activation authority. Existing operational totals/history must remain intact. |

The third edition is effective for annual periods beginning on or after 1 January 2027, with early application permitted; Saudi endorsement includes local requirements. These facts inform edition awareness, not company eligibility certification. Sources checked 27 September 2026: [IFRS Foundation edition guidance](https://www.ifrs.org/issued-standards/ifrs-for-smes/) and [SOCPA endorsement document](https://www.socpa.org.sa/Socpa/Professional-standards/Accounting-standards/Auditing-Standards-Endorsed.aspx).

## 3. Principal / Agent

G7's normal direct customer contract model is **Principal**: G7 is responsible for successful delivery, and suppliers act as subcontractors. Supplier involvement alone does not create an Agent model. The engineering default is gross service consideration and separately recognized supplier costs, subject to the performance and cost evidence below.

An Agent exception requires materially different contract and economic facts, a documented control/delivery analysis and explicit policy approval. Future adapters must hold an unsupported exception instead of applying a net-revenue formula automatically. No universal Principal/Agent questionnaire or generic policy engine is authorized.

## 4. Customer balances, cash and revenue

**Invoice != Cash != Revenue.** Issuing an invoice, collecting cash or allocating a receipt does not demonstrate performance. Preserve separate facts for invoice issuance, receipt, allocation, customer advance/contract liability, internal credit, credit application, refund and reversal.

The proposed accounting treatment depends on the documented right and obligation:

- An invoice may establish a receivable only when the right to consideration is unconditional; unperformed consideration may have a corresponding contract liability. An unsupported classification holds posting.
- A receipt records cash and the appropriate customer balance classification. Applying it to a receivable clears/reclassifies balances without creating another cash receipt or revenue event.
- Revenue is a separate performance-derived event. Unbilled performance may require a contract asset, subject to documented entitlement; it is not a fabricated invoice.
- Credits/refunds require their economic reason and original provenance. A receivable correction, return of advance and reversal of recognized revenue have different effects. A credit or refund alone cannot choose the revenue treatment.
- Corrections preserve issued documents and operational financial history; accounting journals cannot create operational credit/refund authority.

These are provisional engineering rules for future mappings, not approved postings for every current source row.

## 5. Revenue recognition

Recognition follows satisfaction of the promised service performance. Architecture must support point-in-time and over-time treatments with an explicit policy version and evidence. Invoice type, Deposit/Final labels, billing schedules, approval, collection timing and operational completion status alone are insufficient recognition evidence.

For each performance unit, record the contract/customer/Service references, promised output, consideration basis, treatment rationale, evidence requirements, performance date or interval, and recognition history. Point-in-time requires evidenced transfer/performance; over-time requires justified criteria and an approved progress measure, evidence and recognized-to-date amount. Do not invent percentages from elapsed time, cash collection or managerial cost ratios. Cost-based progress is unavailable until its inputs and suitability are separately approved.

Recognize only the evidenced delta against the immutable prior recognition history. Corrections need their own approved evidence and reversal/adjustment lineage. Unclear entitlement, Agent exceptions, unsupported progress, uncertain variable consideration and changes to promises hold the affected posting. They need a bounded policy decision and, before production, professional validation. Authority Lines supply commercial consideration; they are not automatically accounting performance obligations.

## 6. Procurement and supplier liabilities

**Selection != Commitment != Receipt != Accrual != Bill != Payment.** A commitment alone is not an AP liability or expense. Record received-but-unbilled accruals only from substantiated receipt/acceptance and valuation evidence. Operational commitment consumption amounts cannot automatically establish accounting valuation.

An approved bill needs evidence of the underlying received service/asset/prepayment and matching to any existing accrual. Clear the matched accrual and recognize only the justified residual; never count both receipt accrual and bill as a second expense. Payment settles an established payable or creates an evidenced supplier advance, according to its purpose.

Supplier advance authorization, cash payment, allocation, refund and correction remain separate. Payment before receipt is not automatic expense. Advance allocation settles/reclassifies balances without recognizing another cash movement or duplicate cost. Disputed, unmatched or unsupported source facts hold the relevant bridge.

## 7. Expenses and cash accountability

Distinguish the underlying economic fact, submission, approval, reimbursement liability, cash advance, settlement and payment. Recognition date and asset/expense classification follow evidence of the fact; approval and payment dates are recorded independently.

Employee cash advances remain assets/accountability balances until supported settlement or return. Expense recognition, liability recognition and settlement must share traceable provenance so approval and settlement cannot duplicate one expense. Returns are cash movements, not negative invented expenses.

Petty cash separates fund/custody, cash movement, supporting evidence, expense and replenishment. Replenishing a fund is a cash transfer; custody handover is not expense. A disbursement awaiting evidence remains controlled accountability until classification is supported. No posting may use an unevidenced balancing expense to close a cash shortage.

## 8. Managerial economics and analytic dimensions

W8/W8B managerial cost authority remains unchanged. **Event Cost Close != Accounting Period Close** and **managerial margin != accounting profit**. Accounting consumes original economic sources with its own recognition and valuation evidence, not managerial aggregate totals.

Service/Event is the first analytic dimension. Direct Event cost/revenue uses a validated Service reference; shared overhead may remain unassigned with an explicit reason. Do not create an account per Event. Additional dimensions require bounded future authority and must preserve historical identities and attribution.

## 9. Dates, periods and corrections

Accounting/posting date is first-class and distinct from source occurrence, document, invoice, payment, allocation, approval and performance dates. Posting time records when the journal became authoritative; it does not replace accounting date.

Periods proceed **OPEN -> activity -> CLOSE -> LOCK**. Close requires reconciliations, exceptions and approval evidence. CLOSED prevents ordinary posting; LOCKED adds approved finality. Exceptional REOPEN needs elevated accounting authority, a reason and immutable audit; reopening invalidates neither old close evidence nor previously issued report snapshots. App Admin has no automatic accounting close/reopen authority.

Posted journals are immutable. Correction uses an evidenced reversal or adjusting journal in a permitted period, with original lineage. Policy change never silently rewrites old operational facts, posted journal amounts, accounting dates or mappings. Prior-period corrections and any restatement need explicit treatment and versioned report evidence; locked periods cannot be bypassed by backdating.

## 10. Inception and starting position

Reconstruct inception transactions where practical. Do not assume zero opening balances merely because there is no ledger. Choose and evidence the accounting start date, reconstruction coverage, any verified opening balances, cutover boundary and first trial balance approval.

Founder funding, capital, founder/shareholder loans, founder-paid expenses, startup and government fees, software/prepayments, equipment and bank/cash balances require supported classification. A cash movement does not prove equity, loan, expense or asset treatment. Unresolved starting facts remain exceptions; no arbitrary retained-earnings or suspense plug can certify a balanced starting position.

## 11. Bank / cash and reporting

Recorded payment != bank-reconciled payment. Future manual statement import/entry and reconciliation must independently match bank evidence to ledger cash movements, with differences explained and evidenced journals where needed. External bank integration is inactive and out of scope.

Core eventual outputs are GL, trial balance, account activity/detail, P&L and Balance Sheet. They are posted-journal-derived, with accounting-date, as-of, period and dimension semantics, drill-through and correction lineage. These outputs do not assert statutory completeness. Historical reporting must use valid-at-boundary evidence (FI-012), not today's mutable balance, role, account classification or managerial aggregate.

## 12. Authority and product boundary

Accounting preparation, posting, reversal, chart maintenance, reconciliation, close, reopen and statement access need explicit future capabilities and server/database enforcement. Preparation is not posting authority; operational approval is not an accounting grant. Manual journals cannot bypass operational invoice, receipt, credit, bill, advance or cash controls. Control-account exceptions require typed, reconciled evidence and restricted authority.

One product and codebase supports configurable company behavior. The bounded profile may retain framework/edition, currency, fiscal, tax state, capability and policy-version seams. Configuration chooses only implemented and validated behavior; it is separate from entitlements and user permissions. No Layer 2, tenancy, multi-company architecture, subscription, billing, quotas or generic scripting/rules engine is authorized.

## 13. Policy evolution and deferred professional gate

Version each policy/mapping with scope, effective boundary, rationale, Owner approval, evidence and affected-source analysis. Future professional review may require changes. Repair through approved configuration/mapping versions, evidenced corrective journals or a separately authorized cutover; do not replay already posted events under a new rule as new revenue/cost.

Qualified professional validation remains mandatory **before** production/live accounting activation, statutory financial-statement use, external accounting/compliance claims, VAT/tax or ZATCA/FATOORA activation, regulatory filing, or irreversible production cutover. It must address eligibility/edition, legal fiscal year, functional currency, recognition, chart/statement mappings, opening balances, corrections, close and applicable disclosures. Professional validation is **DEFERRED / NOT COMPLETED**.

Non-production results must be labeled provisional. Every runtime slice requires fresh Owner authority, exact paths/mutation manifest, target identity, independent review, DEV evidence and Owner acceptance. G7-OD-28 permits those authorizations; this documentation task does not provide them.

## 14. Product Truth references

- [Decision register](event-erp-decision-register.md): cross-domain invariants, ACC, PERM and REP decisions; current narrow supersession in G7-OD-28.
- [Layer 1 technical master plan](g7-layer1-technical-master-plan.md): existing domain boundaries; earlier professional prerequisites are qualified by G7-OD-28.
- [Project status](../project-status.md) and [roadmap](../project-roadmap.md): current W9 closeout and W10 documentation/runtime distinction.
- [Technical blueprint](w10-accounting-technical-blueprint.md): proposed entities, bridges, constraints and separately authorized implementation slices.
