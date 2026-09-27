# W10 Technical Accounting Blueprint

## 1. Status, authority and design vocabulary

- Date: 27 September 2026 (Asia/Riyadh); source baseline `17cad9303035880174dbd7135fee59292665c353`, `main`, aligned with `origin/main` at discovery.
- **W10 POLICY / TECHNICAL BLUEPRINT — ACTIVE; W10 RUNTIME IMPLEMENTATION — NOT STARTED.** Candidate documentation for Controller review.
- [G7-OD-28](event-erp-decision-register.md#20-current-owner-decision--g7-od-28--27-september-2026) authorizes provisional engineering design and removes professional review as a pre-DEV prerequisite. It does not authorize implementation, database access, mutation, migration, deployment or publication here.
- [Accounting policy](w10-accounting-policy.md) is the provisional Owner baseline. Professional validation is deferred, not completed, and mandatory before live/production activation and specified external uses.

All entity names and capabilities prefixed with accounting terminology below are **proposed future contracts**, not existing tables, RPCs, migrations or delivered behavior. Existing sources in section 2 remain authoritative in their operational domains. Examples are engineering mapping candidates subject to exact future slice authorization, evidence and policy approval; they are not postings certified for current records.

Scope is one G7 company, SAR only, Saudi-endorsed IFRS for SMEs 2025 edition aware, calendar fiscal year. VAT and ZATCA/FATOORA stay inactive. A future full-IFRS seam is bounded configuration plus separately implemented/validated mappings, not a switch that certifies compliance. No Layer 2, tenancy, multi-company architecture, subscriptions, quotas or policy scripting engine.

## 2. Current sources and protected authority

| Existing repository source | Accounting use / limitation |
|---|---|
| [Decision register](event-erp-decision-register.md), [technical master plan](g7-layer1-technical-master-plan.md) | Financial/domain, permission and historical reporting invariants remain; G7-OD-28 narrowly changes the professional prerequisite. |
| [Effective permissions](../../src/lib/auth/permissions.ts), [role templates](../../src/lib/auth/role-permissions.ts) | Current Admin wildcard and quotation-approval-only override resolver are material dependencies; accounting capabilities do not exist. See section 17. |
| [W7A receipt/allocation foundation](../../supabase/migrations/20260919075451_w7a_customer_receipt_allocation_foundation.sql) | Payments and receipt allocations are separate; invoice-specific payment compatibility must not create duplicate cash postings. Existing reversal eligibility remains binding. |
| [W7C credits/refunds](../../supabase/migrations/20260921200000_w7c_customer_credits_refunds.sql) | Credit, application, refund and reversal provenance; no journal creates those operational facts. |
| [W7D AR reporting](../../supabase/migrations/20260922160000_w7d_accounts_receivable_reporting.sql) | Historical customer exposure is an operational reconciliation reference, not revenue or a general ledger. |
| [W4 commitment/receipt](../../supabase/migrations/20260902110000_l1_d07_commitment_receipt.sql) | Selection/commitment/receipt facts; commitment reservation/consumption is not automatically accounting cost valuation. |
| [W6A supplier bills](../../supabase/migrations/20260913120000_w6a_supplier_bills_foundation.sql), [W6B payments](../../supabase/migrations/20260914112636_w6b_supplier_payments_foundation.sql), [W6C advances](../../supabase/migrations/20260915070149_w6c_supplier_advances_foundation.sql) | Governed payable, payment and advance sources, including subsequent corrections in repository history. Match economic effects rather than posting every lifecycle record. |
| [W5 expense/cash foundation](../../supabase/migrations/20260907150000_w5a_expense_cash_foundation.sql) | Expense evidence, reimbursement, employee advance/settlement/return and petty cash; accounting dates/classifications require additional evidence. |
| [W8A costing](../../supabase/migrations/20260922180000_w8a_event_costing_foundation.sql), [W8B cost close](../../supabase/migrations/20260923100000_w8b_event_cost_close.sql) | Managerial authority remains. Do not post their aggregates or equate Event Cost Close with accounting close. |
| [W9 projections](../../supabase/migrations/20260924065440_w9a_reporting_projections.sql), [reports queries](../../src/lib/reports/queries.ts) | W9 is closed/accepted. Current-only AP and managerial projections cannot prove historical accounting balances. |

Source adapters must inspect the final effective source contract, including additive later amendments, during their authorized implementation slice. This inventory is code/document evidence, not database inspection or a claim of deployed definitions. Persisted commercial authority and issued/approved snapshots remain authoritative; do not recompute historical discounts or totals from current mutable quotation lines.

## 3. Proposed company accounting profile

One profile anchors one ledger. Proposed fields:

| Group | Minimum fields / constraints |
|---|---|
| Identity | Stable profile/ledger identifier; reference to existing G7 company configuration; no tenant partition or multi-company routing. |
| Framework | Framework key, edition, Saudi endorsement context, policy version, validation status/reference. Only implemented profiles are selectable. |
| Currency | Functional and operating currency SAR; journal currency SAR; reject other currencies at posting. |
| Fiscal | Year start/end month/day, fiscal timezone Asia/Riyadh, inception/start date, first period/cutover boundary, legal evidence pending flag. No overlapping periods. |
| Tax | VAT registration state inactive/not registered; ZATCA/FATOORA inactive; no tax mapping activation by a profile edit. |
| Activation | INACTIVE -> DEV_PROVISIONAL -> PRODUCTION_VALIDATED, with environment, Owner authority and approval evidence. Production transition requires professional validation and separate activation authority. |
| Governance | Version, effective date, changed-by/time/reason, evidence refs; immutable versions used by posted journals. |

Activation is an enforced gate, not a cosmetic label or client toggle. Framework/currency/fiscal change after posting holds affected behavior pending an approved transition plan; it cannot reinterpret history. Entitlement/configuration decides available implemented features, while user capabilities decide actions. Neither grants the other.

## 4. Chart of accounts contract

Proposed account identity is stable and never reused. Fields: profile id, unique configurable code, English/Arabic names, account type (asset/liability/equity/revenue/expense), category, normal balance, parent id, posting/nonposting flag, active dates/state, control-account designation, protected flag, statement mapping version and audit/version refs.

- Parents belong to the same chart, form no cycle and are nonposting when used as headings. Posted lines target active leaf posting accounts; nonposting groups cannot receive amounts.
- Deactivate rather than delete an account used in a journal. Codes and names may change under audited versioning, but historical identity and classifications remain reconstructible.
- Protect control accounts and their mapping bindings. No direct unrestricted manual posting to AR/AP/advances/contract liabilities/cash accountability controls; use typed reconciled exceptions in section 10.
- Enforce required Service dimension on direct Event revenue/cost accounts; permit documented shared overhead on appropriate accounts.
- No final account numbers are approved here. Seed codes, categories and report mappings must be justified and accepted in W10A; account templates are company-configurable.
- Unsupported classifications stay unresolved outside the posted ledger until evidenced; a suspense account, if later authorized, requires ownership, reconciliation and aging and does not certify the starting position.

See section 22 for the minimum proposed G7 chart classes.

## 5. Accounting periods and date authority

Proposed period fields: id/profile, fiscal year, inclusive start/end accounting dates, state OPEN/CLOSED/LOCKED, version, closed/locked actor/time, evidence package, approval, reopen reason/authority and prior close-version refs. No overlap or gaps within an activated fiscal calendar.

| Transition | Authority and atomic conditions |
|---|---|
| OPEN -> CLOSED | `accounting:close_period`; no unresolved posting job or unsupported material reconciliation exception; approved close checklist and report cutoff. Ordinary posting stops. |
| CLOSED -> LOCKED | Separate close approval within the controlled close workflow; evidence/report snapshots retained, no new journal insertion. |
| CLOSED/LOCKED -> OPEN (exceptional REOPEN) | `accounting:reopen_period`, elevated explicit grant, reason, affected-report list and reviewed exception approval. Append an event and new period version; retain old close evidence. |
| Reopened OPEN -> CLOSED -> LOCKED | New close evidence/version; disclose changed outputs and retain earlier outputs as superseded snapshots. |

Posting, close and reopen must share transaction-level period serialization and recheck state inside the authoritative transaction. A draft prepared while OPEN cannot post after concurrent close. No source adapter, manual journal, privileged API or service credential may bypass locked state. Admin does not inherit these capabilities.

Each journal keeps accounting date, source occurrence date(s), document date, source approval/performance date where applicable, and posted-at timestamp separately. Dates are validated against the documented economic event and permitted period. A late fact retains its source date; posting to another open period requires an explicit late/correction treatment and disclosure, not a silent altered source date. Riyadh business-date boundaries and UTC storage instants must be specified in runtime contracts.

## 6. Journal header and lines

Proposed header fields: immutable id/number, ledger/profile version, origin type (source-derived/controlled manual/inception/revenue/accrual/correction), DRAFT/POSTED lifecycle, accounting date/period, SAR currency, description EN/AR as needed, source identity, posting identity, rule/policy version, evidence/hash, preparer/poster/timestamps, reversal-of/correction-group refs and audit event id.

Proposed line fields: stable line id/order, journal id, account id and applicable mapping version, debit or credit amount in integer halala, Service dimension and other bounded typed references, customer/supplier/employee/contract/performance-unit references when needed, description and source evidence ref.

Required constraints:

1. At least two lines; each has one strictly positive debit **or** credit, never both. No negative/zero line amounts. Sum debits equals sum credits exactly in integer minor units; reject overflow/unsupported scale. No binary floating-point financial authority.
2. Valid active posting accounts, permitted dimensions, same ledger/currency, valid period and consistent source/evidence versions at posting.
3. Draft edits are versioned; posting seals header, lines and attached evidence together atomically with source-effect reservation and audit. A failed attempt leaves no partial authoritative journal.
4. Posted amounts, dates, account ids, source/policy refs and lines cannot be updated/deleted. Operational approved/issued/paid history is never mutated by a journal.
5. Reversal is a new balanced journal with opposing amounts and original refs in a permitted period. Full reversal uniqueness and correction-group limits prevent repeated neutralization; partial adjustments require their own typed, bounded amount basis.
6. REVERSED is a derived display status from lineage, not removal from the ledger. The original and reversal both remain in reports when each is within the report boundary.
7. Replacement after reversal is a new evidenced economic correction, not reusing the original event identity as an unguarded retry. Validate net effects and keep the full chain.

Draft preparation produces no accounting balance. Concurrent retries cannot both post. Posting must not call an external system within the transaction; source/evidence consistency and the final commit are local and auditable.

## 7. Source identity, rules and idempotency

Proposed source-effect record fields: source domain, record id, economic event kind/id, event occurrence/version, immutable source snapshot/hash, posting purpose, ledger id, amount basis, source correction/reversal refs, source dates, consumed effect and journal refs. The rule record pins mapping id/version, policy version, supported source schema/version, account bindings, required evidence, effective boundary and approval.

**Business uniqueness** covers ledger + authoritative economic event identity + posting purpose/effect lineage. It is independent of request id and must not include a new rule version as an escape hatch for duplicate posting. A retry with identical evidence returns the existing authoritative result; a collision with changed evidence fails closed for reconciliation. An unsupported changed mutable source does not overwrite the sealed snapshot.

Separate request idempotency stores request/result and actor for delivery retries. Source-version changes alone do not constitute new economic effects. A legitimate incremental event (partial receipt, separate payment, approved recognition delta) has its own event identity; a correction records its relationship and remaining effect, rather than treating every changed row as a new posting.

Draft preview resolves accounts, evidence and expected entries. At post, recheck effective source authorization, source finality/version, unconsumed effect, net allowed amount, profile/rule version, accounting date and period under appropriate locks. Reserve identity, post journal and append audit atomically. If a source cannot expose stable authoritative occurrence/version and correction history, its bridge is blocked pending a separately authorized contract change. Do not invent a current-source event log or infer missing dates.

Posting failure has an explicit status/reason and no ledger effect. Recovery reconciles pending/failed identities against committed journals, rather than bulk replaying current balances. Rule changes require affected-event analysis; already posted effects use approved correction journals, never automatic duplicate replay.

## 8. Dimensions and analytic history

Service/Event is the first accounting analytic dimension. Proposed binding includes stable Service id, dimension policy/version, attribution date, required/optional/shared-overhead classification and reason. Validate that the Service exists and is appropriate for the source; an operationally closed Service may still receive a legitimate later accounting adjustment with explicit reason.

Direct Event revenue/cost requires a valid Service. Shared office/software/bank fees may remain unassigned with controlled reason; missing direct attribution is an exception, not silently converted to overhead. Splits preserve the exact journal total using explicit integer-halalah allocation and auditable basis; never reuse managerial allocation as authority without approval.

Retain historical display/category evidence for reports. Later renaming, closure or recategorization cannot change original attribution. Do not create accounts per Event. Future bounded dimensions require type/validity/history contracts and authorization, not arbitrary JSON attributes influencing posting rules.

## 9. Source-derived journals and controlled manual journals

Source-derived postings consume approved economic facts, not UI status labels or aggregate balances. Adapters cannot approve invoices/bills, create payments/refunds or alter Service lifecycle. Domain approval remains necessary where required, but is not sufficient accounting evidence.

Manual preparation requires purpose, accounting date, supporting evidence, line classification, dimension and explicit review. Posting/reversal is separately granted. Manual journals are for evidenced adjustments, inception and other specifically approved accounting facts; they cannot fabricate operational AR/AP settlement or cash accountability history.

Control-account entries are disallowed in general manual journals. A typed inception, accrual, recognition or correction workflow may touch a control account only with linked party/source detail, documented reconciliation treatment and authority. Differences from operational subledgers are disclosed in a bridge reconciliation, not hidden by adjusting the operational source or clearing an unexplained balance. Source drill-through separately respects domain read permissions; statement access does not automatically reveal protected operational documents.

## 10. AR accounting bridge

Proposed mappings below are conditional on evidence and future authorization; DR/CR are illustrative account classes.

| Economic fact | Proposed effect / gate |
|---|---|
| Issued invoice with unconditional right | DR AR; CR contract liability for unperformed consideration, or clear an evidenced contract asset for already recognized performance. Never default invoice issue directly to revenue. Hold unsupported entitlement/classification. |
| Customer receipt | DR bank/cash; CR unapplied customer advance/balance under documented contract classification. Party and cash-account evidence required. One cash event for legacy invoice-linked payment and independent receipt paths. |
| Receipt allocation | DR the retained customer balance; CR AR to the allocated amount. If receipt and allocation are composed in one transaction, preserve both facts and one net cash effect. No second receipt/revenue. |
| Performance recognition | Independent section 13 event: DR contract liability or contract asset according to substantiated billing/performance position; CR revenue. Reconcile liability/asset positions to invoices without netting unrelated contracts. |
| Internal credit / application | Map reason/provenance: receivable correction, retained customer balance or recognized-performance adjustment. Application settles balances; it is not automatically new revenue or cash. |
| Customer refund | DR evidenced customer liability or other justified classification; CR cash. Refunding performance consideration requires separately approved revenue correction where warranted. |
| Reversal | Reverse only the allowed original effect, with appropriate original accounting refs and permitted-period treatment; preserve current operational reversal eligibility. |

Customer balances must reconcile by party/contract/Service and event lineage to W7 authoritative facts, plus explicitly identified accounting timing/classification differences. Credits and receipts cannot both settle the same receivable effect. Migration-era legacy compatibility needs one canonical economic identity for each payment; allocation rows cannot create duplicate DR cash. Historical invoice/payment values remain immutable. Unsupported legacy reversal paths require separate authority rather than a journal used as a bypass.

## 11. AP / procurement accounting bridge

| Economic fact | Proposed effect / gate |
|---|---|
| Supplier selection / commitment / amendment | Trace commercial authority only; no automatic AP or expense. |
| Evidenced receipt/acceptance before bill | DR expense/asset/prepayment according to economic evidence; CR accrued liability using approved valuation, receipt units and coverage. Commitment consumed/received amount alone is insufficient valuation. |
| Approved matched bill | DR accrued liability for matched recognized amount, plus only justified residual expense/asset/prepayment; CR AP. Prevent duplicate receipt/bill cost. Price/quantity differences require classified evidence. |
| Bill without established prior accrual | DR substantiated expense/asset/prepayment; CR AP. A bill approval date is not automatically economic recognition date. |
| Supplier payment | DR AP; CR bank/cash for governed settlement. Unallocated pre-receipt cash is a supplier advance, not expense. |
| Supplier advance payment | DR supplier advance; CR bank/cash; authorization alone has no cash/expense effect. |
| Advance allocation / refund | Allocation DR AP, CR supplier advance; refund DR bank/cash, CR advance. No second cash or cost on allocation. |
| Correction/reversal | Linked delta/opposite effect in permitted period; receipt/bill/accrual/advance/payment matching coverage reconciles before posting. |

Proposed matching evidence stores receipt id/units, independently supported valuation, bill line coverage, prior accrual journal and remaining match amount. Partial receipt/bill/payment and concurrent allocations need locked remaining-effect checks. Received-but-unbilled schedules reconcile accrual balances; supplier subledgers reconcile AP/advance balances to current authoritative sources and disclosed accounting differences. W9's current-only AP totals cannot serve as historical accounting truth.

## 12. Expense / employee cash / petty cash bridge

| Fact | Proposed treatment / control |
|---|---|
| Underlying expense/asset fact | Evidence establishes classification, amount, economic date and Service/overhead. Submission/approval/payment dates remain separate. |
| Reimbursement liability | DR evidenced expense/asset; CR employee liability when obligation is substantiated and governed source is eligible. If recognition already occurred through an accrual, clear that accrual instead of recognizing twice. |
| Reimbursement payment | DR employee liability; CR bank/cash; approval alone has no cash effect. |
| Employee cash advance | DR employee advance/accountability; CR bank/cash upon actual issued cash. |
| Advance settlement | Clear advance against evidenced recognized expense/asset or liability, sharing the same economic fact identity. Approval and settlement cannot each recognize it. Excess/remainder needs supported liability/return treatment. |
| Advance return | DR bank/cash; CR employee advance; no invented negative expense. |
| Petty cash fund/replenishment | Transfer between evidenced bank/cash accounts; no new expense. Custodian assignment has no P&L effect. |
| Petty disbursement/evidence | Distinguish evidenced expense from unsettled custody/accountability. Later evidence reclassifies the existing effect; it cannot count a second cash outflow or expense. |

Retain approved source evidence and actors, no self-approval bypass. Future accounting adjustments must reconcile source balances, including missing evidence, shortages and unresolved settlements. A cash shortage or an advance closure never licenses an arbitrary expense plug.

## 13. Revenue performance and recognition model

Proposed records:

- **Performance unit:** id, contract/customer/Service, immutable approved commercial snapshot refs, promised output, consideration allocation in halala, Principal/Agent decision/version, point/over-time treatment, rationale, evidence requirements, policy version and amendments lineage.
- **Performance evidence:** unit, event id/version, performance date/interval, measurable output or transfer evidence, issuer/reviewer, acceptance/status, attachments/hash, approved progress measure and measurement inputs where applicable.
- **Recognition event:** stable economic identity, performance unit/evidence versions, accounting date/period, current and prior recognized-to-date amount, delta, consideration ceiling, profile/rule version, liability/asset basis, journal and correction refs.

Authority Line commercial values are inputs, not automatic performance units. A governed allocation across multiple promises must reconcile exactly to authoritative consideration, preserve discount allocations and identify contract changes; it cannot recompute issued totals. Point-in-time treatment requires evidence of the promised transfer/performance. Over-time requires an approved treatment rationale and reliable measure; billing schedules, elapsed days, cost-close status, deposit/final labels or collected percentages cannot provide progress automatically.

Lock recognition history per unit when computing the evidenced delta. Prevent cumulative recognition above supported consideration or double posting of the same evidence. Negative changes require approved adjustment/reversal treatment and lineage. Variable consideration, cancellations, changed promises, non-SAR facts and Agent exceptions fail closed until their exact policy and evidence contracts exist. For current Principal contracts, gross service revenue and separate supplier costs remain the provisional default; no subcontract-triggered netting.

Insufficient performance evidence means a held event with reason and no journal. Operational completion can initiate evidence collection but cannot be sole recognition authority. Revenue recognition requires its own controlled accounting approval; source commercial approval is preserved, not replaced.

## 14. Inception / starting position / cutover

Proposed reconstruction package stores start date, evidence inventory, inception events, coverage boundaries, verified bank/cash and party balances, founder classifications, chart mappings, unresolved items, preparation/approval actors, version, journals and first trial-balance/reconciliation refs.

1. Inventory evidence for founder funding/capital/loans, founder-paid expenses, government/startup fees, prepayments/software, equipment, AR/AP/advances and bank/cash. Identify duplicates with operational records before posting.
2. Choose practical inception reconstruction coverage. Where unavailable, separately evidence and approve starting balances at a defined boundary, including counterpart classification. Do not infer zero, equity or expense from missing records or cash movement alone.
3. Define whether a boundary fact belongs to reconstructed history, opening balances or post-cutover source posting. A source-to-opening coverage register prevents opening AR/AP/cash plus replay of the same historical facts.
4. Post balanced controlled inception journals only after evidence/classification review. Unresolved material items block acceptance; never certify a starting position by an arbitrary retained-earnings/suspense plug.
5. Reconcile party/control accounts, assets/liabilities and bank balances; approve a first TB using the minimal journal-derived TB introduced in W10B. Record limitations and cutover Owner acceptance.

Proof-lab inception can be provisional and labeled as such. Real cutover, first live balances and irreversible activation require the deferred professional gate plus separate Owner authority. Professional changes may require evidenced corrective journals or a controlled new cutover, not overwritten opening history.

## 15. Bank / cash accounts and reconciliation

Proposed accounting cash-account binding links a chart posting account to an evidenced G7 bank/cash identity, currency SAR and active dates. Operational payment method alone is insufficient bank identity.

Proposed statement batch/line fields: account, source file/manual evidence/hash, statement coverage, opening/closing balance, stable line identity, statement/value date, signed halala amount, reference/description, recorder/time and duplicates check. Proposed reconciliation record links statement lines to posted cash journal lines with amount coverage, matching rationale, preparer/reviewer, status/version and unmatch/reversal history.

Support one-to-many/many-to-one matches only with exact summed amounts and remaining coverage locks. Do not match the same cash amount twice. Partial/unmatched items and timing differences stay visible. Bank fees/interest/errors require separately evidenced classified journals and authority; clicking reconcile cannot fabricate a balancing entry. A reversed cash journal requires reconciliation impact review and retained prior-match history.

Reconciliation outputs preserve statement balance, ledger balance, outstanding items, adjustments and approval as of the evidence cutoff. Recorded payment is not proof of bank clearance. No external integration, credential handling, automated bank feed or live banking action is designed in this slice.

## 16. Financial reporting contracts

All balances derive from sealed posted journal lines, never drafts or current operational balance views. Proposed outputs:

| Output | Contract |
|---|---|
| GL / account detail | Account, accounting date range, opening balance, debit/credit activity, closing balance, journal/source/correction drill-through and pagination/completeness metadata. |
| Trial balance | Opening + activity = ending per account; total debits = credits; include balance-sheet carry-forward and disclosed period/result handling. |
| P&L | Revenue/expense activity within accounting-date range, statement mapping version, current-period result and comparative basis. |
| Balance Sheet | Assets/liabilities/equity balances as of accounting date; include current-year earnings exactly once. Retained earnings/year-end transfer design must prevent duplication. |
| Service analysis | Posted dimension evidence with explicit unassigned/shared overhead; labeled accounting analysis, distinct from W8 managerial margin. |

Report request records ledger/profile, accounting date range or as-of date, period/version, recorded/posting-time cutoff, dimension filters, statement/account mapping version, generated-at time, completeness and access context. Show corrections/reversals included in the boundary and permit lineage drill-through under source-domain permissions. Denied/unavailable/partial is not zero.

Minimum GL/TB inspection is a W10B engine-validation dependency; W10H adds full presentation, statements and bounded exports. P&L/Balance Sheet here are core internal outputs, not a complete statutory financial-statement package; no statutory-compliance claims, tax statements or regulatory filing. Year-end closing/retained earnings treatment must be explicitly reviewed before finalized statements, not guessed from a chart category.

## 17. Accounting authority / segregation of duties

Candidate capabilities (proposed, no current-role grants):

| Capability | Controlled action |
|---|---|
| `accounting:view` | Ledger/detail access within permitted scope. |
| `accounting:prepare_journal` | Draft/preview with evidence; no balance mutation. |
| `accounting:post_journal` | Seal approved eligible journal; source/evidence and period checks. |
| `accounting:reverse_journal` | Governed linked reversal/adjustment; no source reversal authority. |
| `accounting:reconcile_bank` | Record/match/approve within assigned reconciliation responsibility. |
| `accounting:close_period` | Close workflow with evidence and separate final approval. |
| `accounting:reopen_period` | Elevated exceptional reopen with reason and reviewed approval. |
| `accounting:manage_chart` | Controlled chart/profile bindings; no journal mutation. |
| `accounting:view_statements` | Statement access without automatic protected source-document access. |

Current role templates include Admin `*`; current effective override lookup is restricted to `quotations:approve`. Therefore merely adding these strings would unintentionally grant Admin and would not provide accounting-specific effective denies. W10A must design an explicit accounting grant/deny resolver that excludes wildcard inheritance, checks active authenticated users, uses deny precedence, and audits authorized grant administration. It must not silently widen existing override semantics for other domains. No role, including Admin or accountant, receives automatic accounting close/reopen grants.

Permission keys alone are insufficient for SoD. Record preparer, reviewer, poster, closer/reopen approver and reconciliation reviewer identities. Default: independent review before posting sensitive manual/inception/recognition adjustments and close/reopen; preparer cannot approve their own sensitive action. Any small-company exception requires explicit Owner authority, bounded duration/scope, compensating review and audit. Capability possession does not automatically waive those checks.

Future posting services must resolve trusted actor identity server-side and enforce capabilities, SoD, source finality and period guards in the authoritative database boundary. Neither self-supplied actor ids, client checks nor privileged service credentials bypass controls. Execution grants and RLS/RPC contracts require exact future authorization and negative validation. Grant management itself requires an explicitly approved authority/bootstrap path; Admin cannot self-grant accounting authority through generic user management.

## 18. Historical / as-of safety — FI-012

Apply the task's **FI-012 valid-at-boundary evidence discipline**, consistent with the register's historical replayability and reporting invariants. This blueprint introduces no claim that a named FI-012 runtime engine already exists.

Two distinct boundaries are mandatory:

1. **Economic/accounting cutoff:** journal accounting date <= as-of date (or within range).
2. **Knowledge cutoff:** journal posted-at/evidence recorded-at <= declared cutoff for an as-known report. An updated report may include later recorded corrections but must disclose its changed boundary/version.

An original journal later marked reversed remains in an earlier report if its reversing journal lies outside that boundary. A current mutable reversed flag cannot erase the earlier balance. Closed/locked report snapshots pin cutoff, period/close version, policy/account/statement mappings and dimension evidence. Reopening creates a new close/report version; it never silently replaces an issued snapshot.

Do not infer historical GL/AP/revenue from today's source balance, latest document revision, current account category, current Service label or W8/W9 aggregates. Historical classifications and source snapshots need immutable/versioned evidence. Missing boundary evidence yields a disclosed unavailable/partial result or held posting, not invented history. Access permission is evaluated now for disclosure; historical user grants do not revive current access rights.

## 19. Audit and reconciliation evidence

Append audit for draft mutations, posting attempts/results, reversals/corrections, source consumption, manual evidence approval, recognition, account/profile/rule changes, grants/denies and SoD exceptions, close/lock/reopen, reconciliation/unmatch and starting-balance approval.

Minimum audit fields: event id/type, trusted actor, UTC timestamp/business date, authority/permission decision, affected record/version, reason, before/after or immutable version refs, source/rule/profile version, request/idempotency id, journal/correction lineage, evidence hash/ref and outcome. Protect audit from application edit/delete; retain evidence availability and access policy. Do not store credentials/secrets or expose protected document contents in logs.

Operational-source-to-ledger reconciliations report expected economic effects, posted effects, duplicates/missing/held events, timing/classification differences, control-account totals and evidence cutoffs. Financial close includes these reconciliations, cash/statement evidence, accruals/advances, recognition and inception exceptions. Audit success is not reconciliation success or professional signoff.

## 20. Fail-closed behavior and policy evolution

No posting when evidence, valuation, source identity, account mapping, authority, currency, period or recognition classification is unsupported. Persist an actionable held reason and provenance; no zero substitution, automatic balancing plug or unreviewed manual workaround.

Policy/config changes create approved versions with effective boundaries and impact analysis. Drafts revalidate against the selected authorized version at post. Posted journals retain their original versions. Professional review changes may require typed corrective journals, explicit report restatement or separately authorized migration/cutover; a framework change can require redesign beyond a profile edit. No generic expression execution or universal policy engine.

## 21. Delivery dependencies and acceptance discipline

Every slice below is a proposal, not active implementation. Before each slice, the Controller/Owner must separately authorize the exact checkout, paths, proposed schema/SQL/RPC/grants where applicable, target DEV project and mutation manifest, validation, independent review, publication boundary and Owner acceptance. No DEV/DEMO/PROD authority carries forward from W9 or this document.

All non-production results are provisional. Professional review is not a prerequisite for separately authorized DEV work under G7-OD-28; it remains required before live/production activation and external/statutory use. Required DEV scenarios below are future acceptance proposals; none ran in this documentation task.

## 22. Proposed initial G7 chart classes

| Class | Purpose / classification boundary |
|---|---|
| Cash / bank | Separate evidenced bank/cash posting accounts and reconciliation bindings. |
| Accounts receivable | Customer unconditional rights; controlled party/contract reconciliation. |
| Customer advances / contract liabilities | Unapplied customer balances and unperformed obligations distinguished where needed; no automatic revenue. |
| Contract assets | Only evidenced recognized unbilled performance where entitlement supports classification. |
| Prepayments | Supported future-benefit balances; amortization policy needs explicit evidence. |
| Supplier advances | Governed supplier cash before settlement; no automatic cost. |
| Employee advances / petty accountability | Supported unsettled employee/custody balances, separate from expense. |
| Equipment / related depreciation | Evidenced asset classification, capitalization/depreciation policy provisional. |
| Accounts payable | Governed supplier obligations and matched accounting differences. |
| Accrued liabilities | Received/unbilled and other evidenced accrued obligations. |
| Employee reimbursement liabilities | Supported employee obligations distinct from payment. |
| Founder/shareholder balances | Evidence distinguishes loan, due-to/due-from and other classification; no inferred capital. |
| Capital / equity / retained results | Legal/economic evidence and year-end result handling; no opening plug. |
| Service revenue | Principal default, performance evidenced; Agent exception requires separate approved treatment. |
| Other revenue | Only if justified by a real fact and approved mapping, not a balancing category. |
| Event direct costs | Valid Service attribution and evidenced cost recognition. |
| Employee expenses | Underlying economic classification, separate from advance/payment. |
| Office / software / government fees / bank fees / other operations | Expense versus asset/prepayment assessed from evidence; shared overhead explicit. |

These are minimum classes, not final account codes, statutory taxonomy or certified chart. Tax/control integrations remain inactive. Protected control bindings, Arabic/English labels, hierarchy and statement categories need acceptance in W10A. Accounts are separate from Service dimensions.

## 23. Proposed implementation slices

| Slice / purpose | Dependencies and source domains | Proposed schema / mutation authority to request | DEV validation / Owner acceptance |
|---|---|---|---|
| W10A — profile, chart, periods, accounting grants | Accepted policy/blueprint; company/auth/Service references | Profile/account/version/period/grant-deny contracts and server/database guards; exact additive objects/seed/config paths and DEV apply authority | No wildcard/self-grant close authority; active-user/deny checks; chart cycles/history; SAR/calendar boundaries; inactive tax. Owner accepts provisional profile/chart/capability matrix. |
| W10B — balanced journal core and minimal GL/TB inspection | W10A; source identity contracts; no broad adapter posting | Journal/line/source-effect/rule/audit/reversal contracts and controlled prepare/post/reverse APIs | Exact balance; immutable history; duplicate retry/collision/concurrency; locked-period race; negative permissions; original/reversal cutoff; minimal TB reconciliation. Owner accepts engine and typed-manual boundaries. |
| W10C — inception / first TB | W10B and evidenced starting inventory; founder/bank/customer/supplier/employee facts | Reconstruction/coverage/approval package and controlled inception journals; specific seed/opening mutations separately listed | No zero/plug assumption; duplicate opening/replay protection; evidenced control balances and first TB. Owner accepts provisional coverage/start/cutover limitations; real cutover remains professionally gated. |
| W10D — AR bridge | W10B; W10C coverage boundary; W7 invoice/receipt/allocation/credit/refund facts | Exact event adapters, account mappings and any narrowly necessary immutable source-evidence additions | Invoice != revenue; one legacy/independent cash effect; allocation/credit/refund reversal lineage; party reconciliation and as-of tests. Owner accepts AR mappings and disclosed differences. |
| W10E1 — procurement/AP bridge | W10B/C; W4 receipt valuation evidence; W6 bills/payments/advances | Receipt valuation/accrual/matching evidence and bounded source adapters | No commitment liability; received-unbilled/bill no duplicate cost; partial matching; advance/payment/refund coverage and supplier reconciliation. Owner accepts valuation/matching rules. |
| W10E2 — expenses and cash accountability | W10B/C; W5 economic evidence; E1 not required unless shared matching dependency demonstrated | Expense recognition/settlement/custody evidence and bounded adapters | Approval/payment dates separate; no duplicate expense/cash; reimbursements, advance return and petty replenishment; employee/custody reconciliation. Owner accepts evidence/classification and exceptions. |
| W10F — performance revenue | W10B/C; W10D reconciliation; approved performance/consideration contracts, not billing schedules | Performance units/evidence/recognition events and governed recognition APIs | Point/over-time evidence; hold unsupported progress/Agent cases; cumulative delta/ceiling and corrections; contract liability/asset reconciliation. Owner accepts provisional treatment/measure for bounded contract types. |
| W10G — manual bank reconciliation | W10B/C and enabled cash-source bridges | Statement/match/coverage/audit records and controlled reconciliation APIs | Duplicate statement/match checks; split coverage; fees need journals; reversed match history; ledger/statement difference evidence. Owner accepts bank/cash reconciliation workflow. |
| W10H — GL/TB/P&L/Balance Sheet delivery | W10B minimal reports; C first TB; applicable D/E/F/G completeness and mappings | Bounded posted-only queries, statement-mapping versions and presentation/export paths; no statutory activation | Date/knowledge cutoffs, carry-forward, earnings counted once, permissions/completeness/drill-through; EN/AR/RTL Owner acceptance. Owner accepts provisional internal outputs and disclosed coverage. |
| W10I — close/lock/reopen workflow acceptance | W10A/B guards already enforced; C–H applicable reconciliations and report evidence | Close packages, approvals, snapshot/version records and exact transition APIs | Concurrency, SoD, no Admin inheritance, exceptions/reopen/new close evidence, historical reports preserved. Owner accepts provisional accounting close; W8B remains separate. |

Each row shares the **deferred professional gate** in section 24; no row authorizes production or tax activity. Slice scope may be reduced/reordered only with dependency evidence and fresh Owner authority. Foundational lock guards and minimal TB must precede monetary posting; they cannot wait for W10I/H presentation. Unresolved evidence can block one adapter while other separately authorized bounded slices proceed.

## 24. Deferred professional validation and current next action

Professional validation remains **DEFERRED / NOT COMPLETED**. Before production/live activation, statutory statements, external accounting/compliance claims, VAT/tax or ZATCA/FATOORA activation, regulatory filing or irreversible production cutover, obtain qualified validation of framework/edition/eligibility, legal fiscal year, SAR functional currency, Principal/Agent exceptions, recognition/valuation, chart/report mappings, inception, corrections and close controls. Record findings, remediation, validation evidence and explicit Owner activation authority. Later professional changes are possible and must remain traceable.

This candidate delivers documentation only. W9 remains **CLOSED / COMPLETE / OWNER-ACCEPTED / PUBLISHED**. Controller next decision is acceptance of this policy/blueprint candidate and, separately, whether to authorize an exact bounded W10A brief. **Exact current action: Controller review of the five-file documentation diff and independent Reviewer findings.** Do not start W10A automatically.
