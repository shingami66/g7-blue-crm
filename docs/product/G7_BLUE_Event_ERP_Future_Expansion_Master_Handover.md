# G7 BLUE Event ERP Future Expansion
## Master Product Handover, Decision Register, Discovery Brief, and Rebaseline Report

**Original report date:** 2 August 2026  
**Latest decision sync:** 10 August 2026
**Revision:** 0.14
**Owner:** Mozfer Mohamed Elhadi  
**Product:** G7 BLUE CRM / Future Event ERP  
**Document status:** Sole authoritative expansion reference, product decision register, strategic continuity record, and historical evidence ledger
**Implementation authority:** This report records owner-approved expansion scope and sequencing, but it does not by itself authorize code changes, schema changes, migrations, SQL application, staging, commit, merge, or push. Implementation still requires a separate controlled owner-authorized task.

> **Core strategic statement:** Build the G7 BLUE house for today's company, but do not pour a roof that prevents adding floors tomorrow.


> **Expansion-reference authority:** This file is the only current master reference for Event ERP expansion scope, decisions, sequencing, and open questions. Earlier expansion files remain historical evidence only. Any later owner-approved expansion change must update this file so future work does not mistake an approved item for deferred work, or a planned item for completed work.

---

## Document Control

| Item | Current position |
|---|---|
| Current operating company | G7 BLUE, a Saudi events and production company |
| Current system shape | Internal Service-centered CRM with commercial workflow, suppliers foundation, users, and RBAC |
| Future product direction | Two-layer strategy: first build and prove a complete single-company Event ERP inside G7 BLUE; only after real operational proof, productize the proven system as a multi-company SaaS for other event companies |
| Current implementation status | Goal 2A/2B/2C remains delivered current-product foundation. The G1-G12 remediation program is separate from expansion activation and takes precedence where required before broad Layer 1 work. The exact active Goal, Git state, database state, validation evidence, and next action are governed by current project tracking/controller evidence rather than frozen here. |
| Historical Post-G1 checkpoint (9 August 2026) | At that dated checkpoint, G1 Financial Lifecycle Authority, Cleanup & Rebaseline, DEV/DEMO Data Hygiene, UX/Loading Stabilization, and the Customer Document Architecture Correction were closed; the document correction was pushed at `93d3f132b3ff756f4c49904da8622e40babdaa18`; the Quotation Commercial Model Impact Check was `PARTIAL`; and G2 was still blocked. **Historical evidence only:** this row must never be used to infer the current active Goal, Git state, database state, or remediation status. |
| Original report repository baseline | `cdd888b4cbc495a69be0a2cccb1f1ba5a3aae48d`, aligned with `origin/main` when the 2 August report was prepared |
| Current dated delivery baseline | Section 28K preserves the Goal 2B/2C historical closeout. Current Git, working-tree, remediation, test, migration, and next-action truth is owned by verified repository evidence plus the current controller handover/project tracking, not by this strategic Master. |
| Feature activation | Supplier Rate Card Management V1 remains the first separately governed bounded expansion slice. Its strategic scope remains bounded; current implementation, owner-acceptance, remediation, merge, and push status must be taken from the newest verified controller/repository evidence rather than inferred from historical snapshots in this Master. |
| Latest owner decision sync | 10 August 2026: the sole-master and two-layer rules remain locked. Reporting truth is strengthened: Draft/non-issued/cancelled/voided customer invoices do not contribute to live billed financial totals; financial invoice periodization uses authoritative `issued_at`, not `created_at`; and customer activity reporting must follow transaction relationships rather than customer-master creation date. Customer payment/credit-control semantics, historical outstanding, Tender guarantees, commercial authorization evidence, and owned-resource scope are added as explicit discovery/design concerns without activating implementation. |
| Current controlled-delivery snapshot | This Master deliberately does not freeze fast-changing Git/test/database truth. Use the newest verified controller/repository evidence for current execution state. This document owns strategic expansion direction, layer boundaries, decisions, and open questions. |
| Field evidence still required | Zainab commercial/tender workflow evidence and anonymised real documents where permitted; wider Riyadh event-industry workflow evidence; customer billing/payment-term and credit-control practice; Tender guarantee/security practice where applicable; owned-versus-rented resource evidence; event-industry accountant review; and later tax/compliance review |

### Source basis

This report consolidates:

- The Future Expansion Discussion Report dated 1 August 2026.
- The current G7 BLUE CRM controller handover and canonical project state.
- Owner decisions and clarifications made by Mozfer during the 2 August 2026 discussion.
- Current G7 BLUE CRM and SMAAC screenshots shared during the discussion.
- The Arabic event-workflow meeting question bank prepared for the Wednesday interview.
- Earlier public-source research on Saudi events, suppliers, accounting, temporary labour, insurance, VAT, and e-invoicing. Those research notes are context only and do not replace professional Saudi legal, tax, HR, or accounting advice.
- Owner decisions from the 3 August 2026 discussion on internal billing authority, quotation approval, discount tracking, invoice correction, post-invoice customer changes, users, permissions, invitations, suspension, archival, and activity history.
- The dated agent verification reports for `QUOTATION-APPROVAL-AUTO-ACTIVATE-INTERNAL-ABS-1` and its bounded total-mapping correction. These reports are evidence snapshots only and do not themselves authorize migration application.
- Owner decisions from 4 August 2026 on the sole expansion-reference rule, local module search, Customer 360 context, Supplier directory presentation, and the bounded Supplier Rate Card Management V1 activation.
- The 5 August 2026 owner-authorized Goal 2B/2C implementation task for workspace continuity, temporal Business Year context, server-side list refinement, responsive/bidi surfaces, dashboard composition, Customer 360 navigation, and Reports alignment.
- The 5 August 2026 owner-authorized Customers correction task for deliberate direct general search with URL-backed submitted state and preserved module-local navigation.
- The 5 August 2026 owner-authorized Supplier correction task for a dedicated desktop-first Directory presentation repair that preserves Supplier data, search, permissions, Rate Cards, and all financial/operational behavior.
- The 5 August 2026 owner-authorized Dashboard correction task for a dedicated desktop-first information hierarchy and role-ready presentation repair that preserves existing metrics, permissions, data truth, and global Dashboard scope.
- The 5 August 2026 owner-authorized Dashboard independent-column flow correction task replacing the manually rejected Revision 0.8 row-coupled composition with stacked independent 5/12 and 7/12 columns while preserving the accepted data, permission, scope, and responsive contracts.
- The 5 August 2026 owner-authorized final Dashboard density and width polish task retaining Revision 0.9's independent-column architecture while correcting only the Dashboard frame width, obsolete Priority Work heading, and bounded Attention Needed preview.
- The 7 August 2026 owner clarification that expansion is one strategic Master with two product layers: first the single-company internal G7 BLUE Event ERP, then a real-use proof gate, then later SaaS productization for other event companies.
- The 9 August 2026 Post-G1 source-of-truth rebaseline: Customer Document Architecture Correction closed/pushed at `93d3f132`; Quotation Commercial Model Impact Check completed `PARTIAL` with Zainab field evidence required; Tender/Bid Management recorded as discover-now/build-later expansion with future in-system Technical Proposal, Financial Proposal/BOQ, and human-approved AI assistance.
- The 10 August 2026 controller review of Reporting Truth and expansion readiness, including owner-confirmed invoice-status, invoice-period, and customer-activity semantics plus research-informed proposals for cash collection, historical receivables, customer payment terms/credit control, commercial authorization evidence, Tender guarantees, and owned-resource boundaries.


### 5 August 2026 revision summary

This revision records the following current truth:

- This file is the sole expansion reference. Do not create or rely on a competing expansion handover.
- Global cross-module Search is rejected for the current product because users normally know the business area they need. Module-local search and contextual record links are the approved direction.
- Customer 360 must identify the related Service for Quotations and Invoices using business numbers and titles, provide a dedicated Services view, remove duplicated related-Service presentation, and never expose sentinel dates such as year 9999.
- Supplier directory Location must present City, Coverage Area, and Country as separate bidi-safe information rather than one mixed-language string. The Rating column is hidden until a real supplier-performance workflow exists.
- Supplier Rate Card Management V1 remains the first owner-approved bounded expansion slice. It is implemented and present on canonical `main` through commit `9115d3e` (committed/pushed); owner acceptance remains pending; current correctness/remediation work is tracked under G9. The bounded scope is Create, Edit, Activate/Deactivate, valid-from/valid-to handling, and current overlap behavior subject to G9 correction. This does not activate broader procurement, supplier accounting, Actual Cost, or Margin scope.
- Rate Card Delete/Restore, automatic pricing, procurement RFQ, supplier quotations, quote comparison, Purchase Orders, Vendor Bills, Supplier Payments, actual costing, and margin remain outside this bounded slice.
- Supplier Allocations and Service-scoped Supplier Bookings already belong to the current product baseline; the next wave may improve their responsive and interaction quality without reclassifying them as new expansion modules.
- Mozfer owns manual browser testing and final visual acceptance. Agent automation may prepare evidence but must not claim owner acceptance.
- Current Goal 2B/2C delivery is current-product remediation, not a new Event ERP expansion activation: shared workspace foundations, Business Year context, server-side list search/pagination, responsive/bidi presentation, permission-safe dashboard composition, Customer 360 context, and Reports date semantics remain inside the existing Service-centered product boundary.
- Business Year is a Riyadh-calendar year filter shown only on Services, Quotations, Invoices, Payments, and applicable Reports list surfaces. Dashboard, Customers, Suppliers, Users, Settings, and detail/create/edit/PDF/preview routes remain outside the selector and do not consume year context.
- Services use inclusive scheduled-interval overlap (`service_start <= year_end` and `effective_service_end >= year_start`), where an existing start-only Service remains a single-date record; Quotations use authoritative quotation date, Invoices use `issued_at`, and Payments use payment date.
- The current list contract is one localized search/clear interaction, explicit pending feedback, server-side filtering, exact count, deterministic range pagination, and no duplicate Reset Filters action.
- Customers direct general search is deliberately submitted by Search or Enter only. Typing remains draft state and never changes the URL, results, pagination, or pending state; submitted search is sanitized centrally, stored in the existing `search` query parameter, restores through Back/Forward/bookmarks/detail return, and deliberately clears to page 1 while preserving compatible filters and page size. Customers has no Search Mode selector and no Reset Filters action; Suppliers and the other shared module-search contracts remain unchanged.
- Supplier Directory presentation is repaired as current-product remediation: natural content height, one responsive row surface, one result count, attached row actions, clear supplier identity, separate City/Coverage Area/Country fields, bidi-safe structured values, and no user-facing Rating field. The repair does not add an expansion module or alter Supplier data, permissions, Rate Card behavior, search semantics, schema, SQL, or financial/operational rules.
- Supplier Directory owner acceptance is recorded: English desktop, Arabic RTL desktop, natural height, single count, pagination placement, bidi/row actions, and the protected presentation boundary are accepted; stored location data quality is deferred and no Supplier data-model change is authorized.
- Dashboard is repaired as current-product remediation: compact permission-aware header Quick Actions, a three-column desktop KPI grid, explicit Attention Needed before Operations Focus, and one unified Recent Activity card containing Recent Quotations and Recent Payments. Dashboard remains unscoped by Business Year; payments are not alerts; no new metric, module, role, permission code, schema, or final role dashboard is implemented. Dashboard owner acceptance is recorded in Section 28K; final role-specific compositions remain deferred.
- The Revision 0.8 Dashboard row composition was manually rejected because shared grid rows coupled natural heights and Recent Activity was too compressed. The bounded 04B correction uses one Dashboard-only independent-column workspace: a 5/12 left column and 7/12 right column, with vertical flow inside each column and readable vertically stacked quotation/payment activity. No new metric, module, role, permission code, schema, or Business Year scope is introduced.
- Revision 0.9 materially improved the Dashboard architecture, but owner review found three final presentation defects: the content frame remained too narrow for the approved desktop target, the obsolete Priority Work heading remained above only the left column, and Attention Needed exposed an unbounded preview. Revision 0.10 corrects only those three defects: a Dashboard-only centered `max-w-[1240px]` frame, removal of the obsolete heading and unused labels, and a maximum-five Attention preview with localized View all linking to the ordinary authorized Invoices workspace when more rows exist. Data calculations, ordering, permissions, Business Year scope, independent columns, and vertical Recent Activity remain unchanged.
- Customers direct general search and the bounded Business Year behavior are owner-accepted as recorded in Section 28K. Reports and Customer 360 are technically validated but remain pending owner product/visual acceptance.

---

### 7 August 2026 revision summary

Revision 0.12 does not create a second expansion plan and does not authorize implementation. It clarifies the existing strategy so current remediation, internal ERP expansion, and later SaaS productization cannot be confused:

- **Pre-expansion foundation:** current-product delivery and the G1-G12 remediation program remain governed by the current project status/roadmap and controller evidence. They are not Event ERP expansion activation.
- **Layer 1 — Internal G7 BLUE Event ERP:** after the relevant foundation, G7 BLUE expands its own single-company system through the approved internal ERP domains such as financial safety, accounting, user lifecycle, expenses, procurement, supplier accounting, costing/profitability, event operations, dashboards, and reports.
- **Internal proof gate:** G7 BLUE must use the system on real company work and demonstrate operational and financial usefulness before SaaS activation. Exact proof metrics and thresholds remain to be approved when enough real usage evidence exists.
- **Layer 2 — SaaS productization:** only after internal proof does the product move into company context, multi-company isolation, membership, historical backfill/migration, subscriptions, onboarding, quotas, localization/compliance, and commercial packaging for other event companies.
- The three Wave 9 SaaS concerns remain **future activation gates, not current defects**: settings/numbering ownership, company membership/isolation, and historical ownership/backfill migration.
- This remains **one sole authoritative Expansion Master**. The two layers are sections inside this document, not separate competing master files.

### 9 August 2026 revision summary

Revision 0.13 preserves the sole-master and two-layer architecture while recording the newest Post-G1 product decisions:

- G1, Cleanup & Rebaseline, DEV/DEMO Data Hygiene, UX/Loading Stabilization, and the Customer Document Architecture Correction are closed. The document correction is pushed at `93d3f132`; no permanent document-language authority exists.
- The Quotation Commercial Model Impact Check is complete as read-only analysis with a `PARTIAL` disposition. Commercial Group, Package, Item, and Included Component remain a leading product hypothesis whose permanent schema and bilingual field placement require Zainab field evidence.
- Tender/Bid Management is a future expansion module. Discovery begins now through real workflow and document evidence; implementation is deferred.
- Tender is not a larger Direct Quotation. It owns opportunity review, RFP/kurrasah requirements, bid/no-bid, Technical Proposal, Financial Proposal/BOQ, compliance, approvals, submission, award/loss, and post-award handoff.
- Future Technical Proposal preparation should be supported in-system. Future Financial Proposal/BOQ must reuse central commercial, costing, accounting, and profitability truth where appropriate rather than creating a separate financial universe.
- Future AI may assist requirement extraction, compliance matrices, missing-requirement detection, and proposal drafting only through `AI Draft -> Human Review -> Explicit Approval -> Official Proposal`.
- No quotation hierarchy, bilingual commercial schema, Tender module, BOQ, accounting, AI feature, G2 work, migration, or database change is authorized by this documentation sync.

### 10 August 2026 revision summary

Revision 0.14 is a **master-integrity and future-financial-readiness revision**. It does not authorize code, schema, migrations, database changes, or a new expansion module.

- Fast-changing delivery state is explicitly separated from strategic product truth. Dated Sections 28A-28M remain historical evidence and must not be used as current Goal/Git/database authority.
- The stale Rate Card V1 status contradiction is removed: its strategic scope remains bounded, while current implementation/acceptance/remediation state belongs to verified controller/repository evidence.
- Three owner-confirmed Reporting Truth decisions are locked: non-issued or invalidated invoices do not inflate billed totals; invoice financial periodization uses `issued_at`; and customer activity is driven by transaction relationships, not by when the customer master record was created.
- The existing architecture already distinguishes Invoiced, Collected, Outstanding Receivable, credits, refunds, customer credit balance, and future Revenue Recognition. Revision 0.14 makes that separation explicit for reports.
- **Controller recommendation, not yet an owner-locked accounting rule:** `Collected Cash` should be derived from valid Customer Payment records whose business payment date falls inside the selected period; historical `Outstanding as of period end` should be distinguished from today's current outstanding balance; plain `Revenue` should remain reserved for an accountant-approved recognition basis.
- Customer-side receivables are expanded as a discovery/design domain: billing schedule, payment terms, due dates, instalments, collection status, credit exposure/limit, overdue controls, and authorized override behavior must remain distinct from Customer Credit Balance.
- Customer commercial authorization evidence is added as an explicit discovery concern so Direct Quotation, contracts, customer POs, award letters, and Tender handoff can prove what authorized work or billing without forcing one document type on every customer.
- Tender discovery is expanded to include bid/performance guarantees, validity, expiry, release/forfeiture, fees, and related security evidence **where applicable**; no percentage or mandatory rule is assumed without the relevant tender evidence.
- Owned equipment/resource management is added as an explicit boundary decision. The product must not grow a warehouse/asset-management subsystem unless real G7 BLUE ownership and scheduling evidence justifies it.

---

## 0A. Program Structure and Two-Layer Expansion Architecture

This section is the controlling interpretation of the overall product journey. It exists to prevent current remediation from being mistaken for expansion, and to prevent future SaaS architecture from being pulled into today's single-company product too early.

### 0A.1 Pre-expansion foundation — current product and remediation

This work is necessary before broad Layer 1 activation, but it is **not itself the Event ERP expansion program**:

- Delivered/current-product foundations such as Goal 2A and Goal 2B/2C remain part of the existing Service-centered product baseline.
- The frozen Waves 0-9 review campaign produced the current remediation program. The authoritative execution order and exact current Goal are governed by `docs/project-status.md`, `docs/project-roadmap.md`, the controller handover, and verified repository evidence rather than being duplicated here.
- The G1-G12 remediation program hardens financial authority, money precision, reporting truth, bounded reads, admin security, payload/log boundaries, reliability, replay behavior, supplier/Rate Card authority, search/accessibility, release evidence, and typed/architectural boundaries.
- Phase 0 field evidence, real-document sampling, accounting/ownership review, domain mapping, permission planning, and design rebaseline may proceed as controlled discovery where authorized, but broad new ERP module activation must not bypass required remediation and owner decisions.
- Supplier Rate Card Management V1 remains the already-approved bounded early expansion slice. Its existence does not mean that broad Layer 1 procurement, supplier accounting, actual costing, or margin has been activated.

### 0A.2 Layer 1 — Internal G7 BLUE Event ERP

Layer 1 serves **one operating company: G7 BLUE**. The objective is to turn the current system into the operating Event ERP that G7 BLUE itself genuinely uses.

Layer 1 contains the internal business expansion domains already described in this Master, including:

- financial safety and controlled commercial corrections;
- accounting foundation;
- user access and lifecycle;
- company and event expenses, reimbursements, petty cash, and cash control;
- supplier RFQ, quotation comparison, awards, Purchase Orders, receipt/acceptance, and procurement controls;
- Vendor Bills, supplier credits, advances, payments, payables, and supplier accounting;
- expected, committed, actual, paid, and outstanding event cost;
- event margin, profitability, financial close, and management reporting;
- Event Brief, venue/site visit, permits, labour, incidents, claims, and operational timelines;
- future Tender/Bid Management from opportunity and tender-booklet review through submission, award/loss, contract, and post-award Event/Service handoff;
- role/permission-aware dashboards and reports.

Layer 1 remains single-company unless a later owner decision explicitly promotes the Layer 2 company-context program.

### 0A.3 Internal proof gate — between Layer 1 and Layer 2

Layer 2 must not activate merely because Layer 1 features exist in code. The product must first be proven through real G7 BLUE use.

Before SaaS activation, the owner and controller must have evidence that:

- G7 BLUE is using the relevant system workflows on real operational work;
- financial and operational records remain trustworthy under real use;
- the important Layer 1 workflows have owner and relevant business-user acceptance;
- reusable event-company patterns have been separated from G7-specific habits;
- material production-blocking financial, security, data-integrity, migration, or release issues are closed or explicitly accepted;
- the exact SaaS proof criteria, commercial model, ownership model, and migration plan have been approved.

No numeric adoption threshold, number of events, revenue threshold, or time period is locked by Revision 0.12. Those proof criteria require later evidence and an explicit owner decision.

### 0A.4 Layer 2 — SaaS productization for other event companies

Layer 2 begins only after the internal proof gate. Its purpose is not to rebuild the ERP, but to safely productize the proven Event ERP for other event companies.

Layer 2 includes, when separately approved:

- company/legal-entity ownership context;
- multi-company data isolation;
- company membership, active-company context, and context-aware authorization;
- company-aware settings and document numbering;
- controlled backfill of existing G7 BLUE historical data into the company-aware model;
- migration rehearsal, reconciliation, rollback, export, retention, restore, and deletion behavior;
- company onboarding;
- subscriptions, plan entitlements, quotas, AI/storage limits, and noisy-neighbor controls;
- configurable country, currency, language, tax, and later compliance activation;
- SaaS support and commercial operating model.

The Wave 9 future concerns `W9-SAAS-001`, `W9-SAAS-002`, and `W9-MIG-001` become mandatory design/verification gates **before** a second company or SaaS tenant is activated. They do not justify adding tenant fields, tenant UI, or SaaS billing to the current product now.

### 0A.5 Authority split

| Question | Authoritative source |
|---|---|
| What code, migration, test, branch, or Git state exists now? | Verified repository evidence |
| Which remediation Goal is active and what is the next controlled action? | Current controller handover + project status/roadmap + newest owner instruction |
| What is the long-term Event ERP and SaaS direction? | This sole Expansion Master |
| Does an idea from Mozfer automatically become implementation scope? | No. It is an owner proposal until reconciled against business value, current evidence, dependencies, long-term product impact, and then explicitly approved as a decision or task. |

---


## 1. How the Next Chat Must Use This Report

The next chat must treat this report as the **sole authoritative expansion reference**, not as an implementation prompt. Earlier expansion handovers and discussion reports are historical evidence only and must not compete with this revision for current expansion scope.

It must:

1. Preserve the distinction between **locked decisions**, **directional owner decisions**, **recommended proposals**, and **open questions**.
2. Continue current product work without blocking it on the future expansion discussion.
3. Do not activate an unapproved expansion feature. Supplier Rate Card Management V1 remains the only owner-approved bounded early expansion slice; the current G1-G12 remediation program is not expansion activation, and broader Layer 1 or any Layer 2 work requires separate authorization.
4. Avoid inventing Saudi event-industry workflows where the Wednesday interview is expected to provide real operational evidence.
5. Avoid presenting recommendations as final owner decisions.
6. Use plain explanations when discussing accounting, procurement, tax, or operations with Mozfer.
7. Maintain the Service-centered architecture while moving large work areas into dedicated pages and workspaces.
8. Keep future multi-company and ZATCA readiness in the architecture without implementing them prematurely.
9. Treat financial correctness, auditability, access control, and historical integrity as non-negotiable.
10. Produce exactly one bounded next action whenever the discussion moves back into controlled execution.
11. Update this file before or alongside any owner decision that promotes a deferred or open expansion item into approved implementation scope.
12. Do not create a parallel expansion handover. New dated evidence belongs in this file, with prior evidence preserved rather than silently overwritten.
13. The newest explicit owner decision governs expansion direction after it is reconciled into this file; stale deferred wording must not override it.
14. Distinguish current-product remediation from expansion activation. UX fixes, relationship clarity, responsive work, and module-local search do not become expansion merely because they are documented here.

---

## 2. Executive Summary

G7 BLUE CRM is no longer viewed as a future invoicing CRM only. The owner direction has expanded into a long-term specialist **Event ERP** vision.

The product should first become the internal operating and financial system for G7 BLUE through Layer 1. It should prove its usefulness in real event delivery, supplier management, company spending, accounting, profitability, and role-specific decision-making. After the internal system is stable, genuinely used, and proven valuable, Layer 2 is intended to productize the proven system as a SaaS platform for other event companies.

The future product combines:

- Customer and commercial management.
- Event or Service operations.
- Supplier discovery, quotation, comparison, award, booking, and purchase orders.
- Company expenses and direct event expenses.
- Employee reimbursements and petty cash.
- Vendor bills, supplier payments, credits, deposits, and payables.
- Event costing and expected versus actual profitability.
- Full company accounting over time.
- Role- and permission-based dashboards.
- Event briefs, site visits, venues, permits, attachments, incidents, insurance, and daily labour.
- AI-assisted document capture, comparison, anomaly detection, and operational assistance.
- Future multi-company SaaS isolation and future Saudi VAT/ZATCA integration.

The product direction is coherent. The main live inconsistency is documentation scope: older canonical plans describe many of these domains as post-V1 or deferred, while Mozfer's new owner direction promotes them into the core long-term product. That inconsistency must be resolved through a controlled product rebaseline, not by immediately adding tables and pages.

Current development must not stop. The correct operating model is two parallel streams:

- **Stream A - Current Delivery:** Continue approved work, fixes, financial safety, permissions, and existing workflow completion.
- **Stream B - Event ERP Expansion:** Continue discovery and rebaseline work, while allowing only explicitly owner-approved bounded implementation slices recorded in this file. The first such slice is Supplier Rate Card Management V1.

---

## 3. Current Product Baseline

### 3.1 Current operational center

The system is Service-centered. The locked commercial flow is:

```text
Inquiry / Contact
→ Customer
→ Service
→ Quotation
→ Approved Billing Scope or approved billing authority
→ Deposit or Final Invoice
→ Customer Payment
→ Reports
```

A Service is the operating context for an event, project, or booking. The future expansion must preserve this principle even when records move into dedicated pages.

### 3.2 Capabilities already present

The current system has a real foundation in:

- Customers.
- Services.
- Quotations and quotation PDF/print behavior.
- Approved Billing Scope.
- Deposit and Final Invoices.
- Customer Payments.
- Suppliers master data.
- Supplier rate-card database foundation, read-only supplier-detail visibility, and use in Service Supplier Allocations.
- Service Supplier Allocations.
- Supplier Bookings.
- Company Settings.
- Users and role-based access control.
- A live permission-scoped dashboard.

### 3.3 Supplier foundation already present

The present supplier area supports:

- Suppliers as companies or individuals.
- Supplier lifecycle states.
- Preferred status separate from supplier status.
- Blacklist behavior.
- Sensitive bank-data masking.
- Read-only rate-card visibility and rate-card-driven allocation creation; full management UI is not yet part of the accepted baseline.
- Service-linked allocations with estimated cost.
- Supplier Bookings created from allocations.
- Snapshot foundations.
- Separate permissions for viewing cost.

### 3.4 Current supplier boundary

The current supplier foundation is not yet a complete procurement or accounts-payable system.

It does not yet provide the full workflow for:

- Requests for quotation.
- Supplier quotation capture and attachments.
- Quote comparison.
- Supplier award and approval.
- Purchase orders.
- Service receipt or acceptance.
- Vendor bills.
- Supplier credits.
- Supplier payments.
- Supplier payables and ageing.
- Deposits and advances reconciliation.
- Full event cost ledger.
- Actual event margin.

**Important:** A Supplier Booking is an internal operational booking. It is not automatically a Purchase Order, an accounting liability, or Committed Cost.


### 3.4A Approved bounded supplier expansion — Rate Card Management V1

The existing supplier-rate-card foundation is real. Rate Card Management V1 was later implemented/committed as the bounded early expansion slice; owner acceptance and remediation status are tracked by current controller/repository evidence. This subsection preserves the approved product boundary rather than freezing fast-changing delivery state.

Owner-approved A+ contract:
- Rate Cards are internal estimating and reference pricing defaults only, never Supplier Quotes, POs, accounting commitments, Vendor Bills, Actual Cost, or customer-facing pricing authorities.
- Existing `unit` is preserved as Quantity Unit (e.g. person, camera, item, meter).
- Separate `pricing_basis` is added additively (e.g. per_day, per_event, per_shift, flat_rate, per_unit).
- `base_cost` is the monetary rate for `quantity-unit x pricing-basis`.
- Inclusive `valid_from` and `valid_to` with nullable open-ended `valid_to`.
- Rate Card applicability uses authoritative Service/Event usage dates, not today. Single-date Services require coverage; multi-date Services require one unambiguous Rate Card covering the full period; boundary-crossing periods fail safely without auto-splitting.
- Concurrency-safe active-overlap exclusion constraint at PostgreSQL/database layer (`chk_supplier_rate_cards_active_no_overlap` on active non-deleted rows) and application layer.
- Future accepted Quote/PO/contract owns the committed snapshot; later Rate Card edits must not rewrite historical snapshots.
- Rate Cards remain strictly internal: restricted by `supplier_costing:read`/`supplier_costing:write` and kept out of customer-facing Quotations, Invoices, PDFs, portals, and general customer workspaces.

Not included in this slice:
- Universal days x daily pricing, duration engines, overtime/weekend multipliers.
- Rate Card hard delete, soft delete, or restore.
- Automatic quotation pricing.
- Automatic allocation creation.
- Procurement RFQ, Supplier Quotations, comparisons, awards, or Purchase Orders.
- Supplier invoices, payments, payables, actual costing, or margin.

### 3.5 Current UI observations

The present flat sidebar is appropriate for the current product size, but it will not scale to the planned ERP expansion.

The current Service detail page already contains many responsibilities, including status, schedule, customer, quotation history, billing authority, supplier allocations, supplier bookings, and billing. Adding expenses, permits, tasks, cost ledgers, incidents, labour, and supplier finance directly into the same page would make it unusable.

The SMAAC screenshots were useful as an information-architecture reference because they show:

- Expandable and collapsible sidebar sections.
- Deep report groupings.
- Supplier reporting with Credit Limit, Credit Days, Current Balance, and export actions.
- Permission-denied handling.
- A profile menu with settings, notifications, favourites, and logout.

G7 BLUE should learn from the grouping behavior, not copy the SMAAC visual design or warehouse-specific structure.

<!--PAGEBREAK-->

## 4. Strategic Product Vision

### 4.1 Near-term identity
G7 BLUE CRM remains an internal single-company system built for G7 BLUE. The current priority is to complete the required current-product foundation/remediation and then expand the same system through **Layer 1: the internal G7 BLUE Event ERP**.

### 4.2 Long-term identity

The long-term product direction has two explicit layers:

1. **Layer 1:** build and prove a specialist Event ERP inside G7 BLUE as one operating company.
2. **Layer 2:** after real internal proof, productize that proven Event ERP as a multi-company SaaS for other event and production companies.

The long-term product therefore becomes a specialist Event ERP for event and production companies, but SaaS activation is a later productization step rather than the starting architecture of the current system.

The differentiation from general ERP products is not that G7 BLUE will contain every business domain. The differentiation is that it will deeply understand the event-industry operating model:

- Service or event-centered work.
- Supplier-heavy delivery.
- Temporary venues and site constraints.
- Deposits and refundable guarantees.
- Event-specific permissions and documents.
- Last-minute changes and supplier failures.
- Estimated, committed, actual, paid, and outstanding cost.
- Event-level expected and actual margin.
- Project, operations, finance, and management dashboards.


### 4.3 Product development philosophy
The product should be built in layers:

1. Finish the required current-product foundation and remediation without treating it as expansion activation.
2. Capture actual operating evidence and stabilize business/accounting definitions.
3. Build **Layer 1**, the single-company internal Event ERP for G7 BLUE, in bounded modules.
4. Use the system on real G7 BLUE work and prove operational and financial value.
5. Separate reusable event-company rules from G7-specific habits.
6. Approve the company-ownership, membership, migration, and commercial SaaS blueprint.
7. Build **Layer 2** company isolation, packaging, onboarding, subscriptions/quotas, and migration controls.
8. Offer the proven product to other event companies only after Layer 2 activation gates pass.


### 4.4 What must not happen

The team must not:

- Build a generic Odoo clone.
- Hard-code every workflow to G7 BLUE's current people.
- Add isolated feature pages with incompatible financial logic.
- calculate profit differently in each dashboard or report.
- Treat customer cash received as profit automatically.
- Treat supplier cash paid as the complete cost automatically.
- Make AI the financial approver.
- Enable tax behavior before approved registration and compliance design.
- Add multi-company complexity to the current interface before the product proves itself.

---

## 5. Core Product Principles

1. **Service-centered operations:** Every event-specific operational or cost transaction remains linked to a Service.
2. **Separate pages, shared context:** A record may live in a dedicated workspace while retaining its Service relationship.
3. **No silent financial history changes:** Approved financial records are corrected through controlled lifecycle actions.
4. **Internal financial confidentiality:** Supplier cost, company cost, and margin are not customer-facing information.
5. **Server-side authorization:** Hiding a menu item is a usability measure, not a security boundary.
6. **One financial truth:** Dashboards and reports must derive from consistent accounting and transaction sources.
7. **Human approval:** AI may extract and recommend, but authorized people approve financial meaning.
8. **Current simplicity, future readiness:** Do not expose future SaaS and tax complexity before it is needed, but do not create structures that make it impossible.
9. **Evidence before automation:** The team must understand the real workflow before automating it.
10. **Design consistency:** New modules use a shared ERP design system rather than creating a new layout for each feature.

<!--PAGEBREAK-->

## 6. Decision Register

### 6.1 Locked owner decisions

| ID | Locked decision |
|---|---|
| D01 | Service remains the primary operational entity for each event or project. |
| D02 | Event-specific transactions must link to a Service, but they do not have to be displayed inside the main Service page. |
| D03 | The main Service page will progressively become an overview and navigation hub; major work areas will have dedicated pages or workspaces. |
| D04 | Company overhead expenses are separate from direct Service or event costs. |
| D05 | Supplier invoices and supplier payments are separate from customer invoices and customer payments. |
| D06 | Supplier Booking is an operational reservation and is not automatically a Purchase Order or accounting commitment. |
| D07 | An approved Purchase Order or approved contract is the natural point at which a supplier amount becomes Committed Cost. |
| D08 | Supplier quote, Purchase Order, service receipt, Vendor Bill, advance, refundable deposit, and payment are separate records. |
| D09 | Approved financial records must not be hard-deleted; future corrections use void, reversal, credit, replacement, or another approved lifecycle. |
| D10 | Supplier cost and margin are internal and must not appear in customer-facing documents or unauthorized roles. |
| D11 | A Vendor Bill above the approved Purchase Order cannot be approved automatically; it requires an authorized change, explanation, corrected invoice, or credit. |
| D12 | A supplier advance normally forms part of the agreed total and is settled against later invoices unless the contract explicitly states otherwise. |
| D13 | A refundable deposit is not a cost unless an approved amount is retained for damage or another valid reason. |
| D14 | Any employee may submit money personally spent for company work, with a receipt, reason, and Service link when event-related. |
| D15 | A submitter cannot approve their own expense. Finance reviews, Manager/Admin approves according to policy, and Finance settles it. |
| D16 | Receipt evidence is a core requirement; exceptions require a reason and higher approval. |
| D17 | Petty cash and accountable cash advances are required capabilities. |
| D18 | Pages and navigation items without permission should not be shown, while server and database authorization remain mandatory. |
| D19 | Dashboard is the entry page, and its useful content varies by role, permission, assignment, and responsibility. |
| D20 | Future navigation will use expandable and collapsible sections instead of a long flat list. |
| D21 | AI may assist document extraction and comparison, but final financial approval remains human. |
| D22 | The original source file must be preserved beside extracted or manually entered document data. |
| D23 | G7 BLUE is not assumed to provide marketing, registration, or ticketing by default; these are Service scope options when contractually included. |
| D24 | Event risk contingency is internal, Service-linked, and separate from Actual Cost until an approved real expense occurs. |
| D25 | Daily labour, meals, transport, and emergency event spending must be traceable as event costs when they are caused by the event. |
| D26 | Fixed employee salaries are company overhead by default; later internal allocation to events may be added without changing payroll truth. |
| D27 | Approved Billing Scope remains an internal billing-control layer. Normal users should not manually create, review, mark safe, approve, or void it as part of the ordinary quotation-to-invoice journey. |
| D28 | The authorized staff action `quotations:approve` operationally confirms that customer approval was received through an external channel such as email, WhatsApp, phone, signed document, or in-person confirmation. |
| D29 | Final quotation approval should atomically create and activate the internal billing authority. A quotation must not become approved while its required internal authority fails to activate. |
| D30 | Commercial discounts are decided while the quotation is Draft, shown to the customer, frozen on approval, and must remain traceable through the internal billing authority, invoices, customer adjustments, event profitability, and company reporting. |
| D31 | Users must not re-enter an approved discount manually on every invoice. The system carries and displays the approved discount allocation while preserving the original commercial value and net amount. |
| D32 | An issued customer invoice is immutable. It is not reopened, overwritten, or hard-deleted to accommodate later customer changes or accounting corrections. |
| D33 | A post-issue increase in customer scope or price requires an approved commercial change and an additional invoice or equivalent controlled document. |
| D34 | A post-issue reduction requires a linked credit adjustment. If the customer has already overpaid, the balance is settled through a recorded refund or an approved customer credit balance. |
| D35 | Original quotations, invoices, payments, creators, approvers, and timestamps remain historically attributable after revisions, corrections, employee departure, reassignment, or archival. |
| D36 | Roles are permission templates, not rigid access cages. The platform must support explicit per-user permission grants and denials without relying only on role names. |
| D37 | Email invitation is the normal user-onboarding path. The employee sets their own password; administrators do not request, know, or store a reusable employee password. Business email is preferred but not mandatory for small companies. |
| D38 | User lifecycle must support invited, active, temporarily suspended, disabled, and archived/former-employee states. Suspension or archival blocks access but preserves identity, permissions history, and business attribution. |
| D39 | A user who has created, changed, approved, posted, paid, or owned a meaningful business record is not hard-deleted. Hard deletion is limited to an unaccepted mistaken invitation or a zero-reference test account. |
| D40 | Authorized managers need permission-scoped user activity history covering business actions, financial approvals, permission changes, suspensions, reactivations, and relevant security events. |
| D41 | Requiring a different preparer and approver is an optional company-level policy. It must not be forced on every small company, but when enabled the creator cannot approve the same quotation even if they hold approval permission. |
| D42 | G7 BLUE's current operating mode remains VAT inactive. Current delivery must not enable VAT, while reusable financial contracts must not block a future approved VAT activation. |
| D43 | This file is the sole authoritative expansion reference. Earlier expansion handovers are historical only, and no parallel expansion master file should be created. |
| D44 | A newer explicit owner decision may promote a previously deferred expansion item, but this file must be updated before or alongside implementation so stale wording does not govern future work. |
| D45 | The current product uses module-local search and contextual navigation rather than a permanent global cross-module search surface. Global search may return only if later workflow evidence proves a real task benefit. |
| D46 | Customer 360 must show human-readable Service context for related Quotations and Invoices, provide one authoritative Services view, avoid duplicate related-record sections, and never expose raw UUIDs or sentinel dates. |
| D47 | Supplier directory Location presents City, Coverage Area, and Country in separate bidi-safe lines. Supplier Rating is hidden until a real performance-capture and review workflow exists. |
| D48 | Supplier Rate Card Management V1 follows the owner-approved A+ contract: internal estimating/reference pricing only (never Quote/PO/Bill/Actual Cost/customer pricing authority), Quantity Unit + separate pricing_basis, base_cost for quantity x pricing-basis, inclusive valid dates, authoritative Service usage period applicability, concurrency-safe active-overlap constraint, and snapshot immutability. |
| D49 | Rate Card Delete/Restore, automated pricing, universal days x daily engines, overtime multipliers, broader procurement, supplier accounting, actual costing, and margin remain outside Rate Card Management V1 and require later explicit decisions. |
| D50 | Expansion is organized into two product layers after the current-product foundation/remediation: Layer 1 builds and proves the single-company G7 BLUE Event ERP; Layer 2 productizes the proven system as multi-company/SaaS for other event companies. |
| D51 | Layer 2 must not activate merely because ERP features exist. G7 BLUE must first have real operational use and proof, and the company-context, membership/isolation, historical ownership/backfill, numbering, migration/rollback, and commercial productization gates must be approved and tested. Exact proof thresholds remain a later owner decision. |
| D52 | The two-layer model is an internal organization of this sole Expansion Master. It does not authorize a second or competing expansion master file. |
| D53 | The current quotation hierarchy remains a field-validation-dependent product hypothesis: Commercial Group is non-priced organization, Package is a priced authority line, Item is independently priced, and Included Component is contractual package scope without independent customer price. This is not a final schema. |
| D54 | Customer-facing commercial content must ultimately support stored Arabic and English forms, while exact field placement waits for the surviving field-validated hierarchy. Internal details never print, and contractual output never silently translates. |
| D55 | Tender/Bid Management is a future expansion module. Discovery begins now through field evidence; implementation remains deferred and requires a separate controlled activation. |
| D56 | Tender and Direct Quotation are related but distinct workflows. Tender must not be forced into the current Quotation entity, although future shared commercial primitives may be reused deliberately. |
| D57 | The future Tender module should support in-system Technical Proposal preparation, authoring, and assembly using approved reusable company content and proposal-specific evidence. |
| D58 | Future Tender Financial Proposal/BOQ pricing must reuse central commercial, costing, accounting, and profitability truth where appropriate and must not become an independent financial universe. |
| D59 | Future AI tender assistance is draft-only. AI output requires human review and explicit approval before it becomes contractual submission content. |
| D60 | Customer invoices contribute to live billed/invoiced financial reporting only after they cross the authoritative issue boundary. Draft and other non-issued states do not count; cancelled or voided documents do not remain live billed authority, and later financial effects must flow through the approved correction/credit lifecycle rather than silent history rewriting. |
| D61 | Customer invoice financial periodization uses the authoritative invoice issue date (`issued_at`), not the record creation timestamp (`created_at`). Creation time remains operational/audit metadata rather than a fallback financial date. |
| D62 | Customer master creation date is used for acquisition/new-customer metrics only. Customer financial and activity reporting resolves identity from the related transactions and periodizes by the relevant transaction date, so an older customer remains visible whenever they have activity in the selected period. |

### 6.2 Document Representation Language Invariant

This is a durable product architecture decision for the Customer Document System and all future financial/compliance expansion:

1. Business document identity is language-neutral.
2. One quotation or invoice may be rendered in Arabic or English.
3. Output language never creates another financial document, revision, number, or settlement authority.
4. Employee UI locale and customer-document output language are independent concerns.
5. Financial, business, and compliance snapshots remain language-neutral canonical authority.
6. Customer-facing content ultimately supports stored English and Arabic forms; internal details remain non-customer-facing.
7. The Quotation Commercial Model Impact Check is complete with a `PARTIAL` disposition. Exact bilingual field placement across Commercial Group / Package / Item / Included Component waits for Zainab field evidence and final hierarchy lock.
8. Future AI translation may produce only a staff-reviewed draft before explicit contractual use.
9. Future ZATCA or government/compliance representation is separate from the human Arabic/English PDF language.
10. Human-language selection is presentation state and must never mutate approved financial data.

### 6.3 Directional owner decisions

These directions are confirmed, while implementation detail remains open.

| ID | Confirmed direction | Detail still open |
|---|---|---|
| O01 | The product becomes a specialist Event ERP, not only a CRM. | Exact module release order and release boundaries. |
| O02 | Layer 1 serves and proves the system inside G7 BLUE first; Layer 2 is intended to productize the proven system as SaaS for other event companies. | SaaS packaging, billing, tenant onboarding, support model, and exact internal-proof criteria. |
| O03 | Multi-company is a Layer 2 activation concern and is not implemented now; Layer 1 architecture must preserve bounded seams without prematurely exposing tenant complexity. | Company/legal-entity ownership strategy, shared directories, branch model, membership context, and migration path. |
| O04 | The product will progressively become a complete accounting system. | Accounting-engine sequence, accountant review, and release acceptance criteria. |
| O05 | VAT and ZATCA remain inactive now, but future integration readiness is required. | Registration timing, tax policy, XML/QR integration, and compliance testing. |
| O06 | Company Expenses are core near-term scope, not a distant optional feature. | Categories, recurring expenses, thresholds, and budgets. |
| O07 | Vendor Bills, Supplier Payments, Credits, Payables, advances, and alerts are core scope. | Approval workflow, correction lifecycle, ageing, and payment allocation details. |
| O08 | Event Margin and company profitability are primary management goals. | Revenue recognition, allocation of overhead, close policy, and target-margin controls. |
| O09 | Purchase Orders are required for formal supplier commitments. | Mandatory threshold, approvers, contract relationship, and amendment lifecycle. |
| O10 | Supplier documents will support upload, structured entry, and optional automated extraction. | First-release OCR scope, supported formats, cost limits, and confidence thresholds. |
| O11 | A shared ERP design system must precede major module expansion. | Final templates, tokens, Stitch workflow, and design skill/tool selection. |
| O12 | Google Stitch may be used for design exploration before code changes. | First prototype set and approval process. |
| O13 | The product must provide meaningful dashboards for every user type. | Final roles, widgets, personal versus team scope, and customization. |
| O14 | Customer quotations will use one commercial family with controlled revisions rather than unrelated duplicate quotation rows. | Family numbering, revision lifecycle, legacy backfill, and PDF/link behavior. |
| O15 | Post-approval commercial changes will use a controlled Change Order or equivalent amendment domain. | Exact document name, approval thresholds, states, numbering, and customer evidence. |
| O16 | Discounts will be supported end-to-end and will reduce net commercial revenue and event profitability. | Fixed versus percentage, line versus quotation level, invoice allocation, and rounding policy. |
| O17 | Customer credit notes, refunds, customer credit balances, and accounting corrections are required financial-safety capabilities. | Exact posting rules, permissions, settlement order, and Saudi compliance terminology when tax is activated. |
| O18 | User access will combine role templates with per-user overrides and lifecycle controls. | Exact permission-precedence rules, session refresh/revocation, invitation expiry, and enterprise SSO timing. |
| O19 | The operating workflow will be reviewed with the experienced Project Manager and an accountant familiar with event-company transactions before the accounting blueprint is locked. | Meeting date, sample documents, final policy sign-off, and release acceptance criteria. |

### 6.4 Recommended proposals, not yet locked

The following are working recommendations only:

- Begin supplier comparison with manual selection and a recorded reason; add weighted scoring after real performance data exists.
- Use a two-level sidebar hierarchy, with deeper navigation inside pages rather than a four-level menu tree.
- Use a shared dashboard framework with permission-scoped and assignment-scoped widgets.
- Make Event Brief mandatory before execution, subject to confirmation from field evidence.
- Make Site Visit conditional by event type, venue familiarity, technical complexity, or manager instruction.
- Begin document capture with upload plus structured manual entry, then add optional local OCR, then on-demand cloud document intelligence when volume justifies it.
- Use Purchase Order + service receipt + Vendor Bill matching before payment approval.
- Build a full accounting core, but release modules progressively rather than attempting the entire ERP in one feature.
- Add role-based 403 pages and hide unauthorized navigation items.
- Use one Reports Center with permission-safe report groups and drill-down.
- Resolve effective permission as role-template defaults plus per-user explicit grants and denials; the final precedence rule requires technical review, with explicit denial recommended to win.
- Use proportional discount allocation across deposit and final invoices so that the sum of invoice discounts reconciles to the approved quotation discount; exact rounding remains open.
- Preserve one quotation family row in the main list and expose prior revisions through a read-only history.
- Keep customer-facing wording simple: Submit for Approval, Approve, Reject, Additional Invoice, Credit Adjustment, Refund, and Customer Credit; keep technical ABS terminology internal.
- **Controller recommendation pending explicit owner lock:** define `Collected Cash` from valid Customer Payment records whose business payment date falls inside the selected period; never derive period cash collection from the current `invoice.amount_paid` value of invoices selected by issue period.
- Distinguish **Current Outstanding Receivable** from **Outstanding Receivable as of a historical period end**. The first answers what customers owe now; the second reconstructs what they owed at a chosen cutoff from issued invoices, credits, refunds/adjustments, and payments effective by that date.
- Reserve the plain `Revenue` label for an accountant-approved recognition basis. Until that policy is locked, management views should prefer explicit labels such as Invoiced/Billed, Collected Cash, Outstanding Receivable, and Net Approved Commercial Value.
- Define customer billing schedule, payment terms, due dates, instalments, collection status, credit exposure/limit, overdue policy, and authorized override behavior as a future receivables/credit-control domain. Do not confuse this with Customer Credit Balance, which is value owed back to the customer or retained for future settlement.
- Treat customer commercial authorization evidence as a reusable evidence concept: signed quotation, customer PO, contract, award letter, tender award, email/WhatsApp approval, or another approved proof may authorize work or billing according to policy; do not force one evidence type on every customer before field validation.
- Expand Tender/Bid discovery to include bid/performance guarantees, tender fees, validity, expiry, extension, release/forfeiture, and responsible owner where applicable. Do not assume a universal percentage or mandatory guarantee outside the governing tender evidence.
- Keep owned equipment/resource management evidence-gated. Do not build inventory, warehouse, serial/asset, maintenance, check-out/in, or vehicle-scheduling scope unless G7 BLUE's real owned-resource model justifies it.

### 6.5 Explicit non-decisions

The discussion has not yet decided:

- Exact Purchase Order approval thresholds.
- Whether an RFQ is mandatory above a specific value.
- The normal supplier advance percentage in Riyadh event work.
- The most common supplier credit terms.
- Whether Event Brief is mandatory for every Service type.
- When Site Visit is mandatory.
- The official revenue-recognition policy.
- Whether company overhead is allocated to individual events.
- The chart of accounts and journal mapping.
- Exact role names and dashboard widgets.
- The expansion feature that follows Supplier Rate Card Management V1 after owner acceptance and updated evidence.
- The tenant schema or SaaS subscription model.
- VAT/ZATCA implementation timing.
- Exact discount model: fixed amount, percentage, line-level, quotation-level, or supported combinations.
- Discount allocation and rounding across deposit, partial, and final invoices.
- Change Order naming, numbering, approval limits, and customer-acceptance evidence.
- Exact credit-note, refund, customer-credit, debit-adjustment, and correction posting rules.
- Quotation-family and revision backfill for existing quotation rows.
- Whether customer approval evidence fields are optional or mandatory.
- The default state of the separate-preparer/approver policy.
- Final permission-override precedence and cache/session refresh behavior.
- Invitation expiry, resend limits, work-email restrictions, scheduled reactivation, and enterprise SSO timing.
- Final quotation hierarchy, package-inclusion behavior, customer-facing grouping, commercial approval behavior, and bilingual field placement pending Zainab field evidence.
- Tender opportunity intake, kurrasah analysis, bid/no-bid ownership, proposal workflow, BOQ conventions, internal approvals, submission controls, and post-award handoff pending real tender evidence.
- Final `Collected Cash` period contract and handling of reversed/refunded customer payments pending explicit owner lock and accountant review where accounting semantics are affected.
- Exact definition and presentation of Current Outstanding versus historical Outstanding-as-of-period-end, including cutoff treatment for credits, refunds, reversals, and late postings.
- Customer payment-term templates, due-date rules, instalment behavior, credit limits, overdue thresholds, collection holds, and override authority.
- Which customer evidence is required to authorize work and/or billing in each path: approved quotation evidence, customer PO, contract, award letter, Tender award, or another accepted proof.
- Tender/bid guarantee and security rules, including when required, amount source, validity/expiry, extension, release/forfeiture, fees, responsible role, and accounting treatment.
- Whether G7 BLUE owns enough equipment, vehicles, or reusable resources to justify a dedicated owned-resource/asset-operations module; exact scope remains evidence-dependent.

---

## 7. Future Domain Map

### 7.1 CRM and Sales

- Customers.
- Contacts.
- Inquiries.
- Services.
- Customer Quotations.
- Future Tender / Bid Management.
- Tender opportunities, RFPs, tender booklets / kurrasah, and requirements.
- Bid / No-Bid decisions.
- Technical Proposals and supporting documents.
- Financial Proposals / BOQs and compliance matrices.
- Tender internal approvals, submission packages, submissions, award/loss, and contracts.
- Quotation families and immutable revisions.
- Quotation-level commercial discounts and approved net value.
- Internal Approved Billing Scope or billing authority.
- Customer Invoices.
- Customer Payments.
- Customer billing schedules, payment terms, due dates, instalments, collection status, and future credit-control rules.
- Customer commercial authorization evidence such as approved quotation evidence, customer PO, contract, award letter, or Tender award where applicable.
- Commercial Change Orders or amendments.
- Customer credit notes, refunds, customer credit balances, and corrections.

### 7.2 Event Operations

- Event Brief.
- Venue requirements and venue options.
- Site Visits.
- Timeline and milestones.
- Tasks and assignments.
- Setup and teardown.
- Permits and documents.
- Crew and daily labour.
- Equipment and resource bookings.
- Owned-equipment/resource operations only if field evidence later proves a real G7 BLUE need; supplier-rented resources remain distinct.
- Incident management.
- Operational handover and event close.

### 7.3 Suppliers and Procurement

- Supplier master.
- Capabilities, coverage cities, documents, and contacts.
- Rate cards.
- Service requirements.
- Request for Quotation.
- Supplier Quotations.
- Quote Comparison.
- Supplier Award.
- Purchase Orders.
- Supplier Booking.
- Service Receipt or acceptance.
- Supplier performance.

### 7.4 Expenses and Costing

- Company Expenses.
- Direct Event Expenses.
- Employee Reimbursements.
- Petty Cash.
- Daily labour and meals.
- Estimated Cost.
- Committed Cost.
- Actual Cost.
- Paid Cost.
- Outstanding Cost.
- Contingency.
- Event Cost Ledger.
- Expected Margin.
- Actual Margin.

### 7.5 Finance and Accounting

- Vendor Bills.
- Supplier Credits.
- Supplier Payments.
- Supplier advances and refundable deposits.
- Accounts Receivable.
- Customer ageing, due/overdue status, collection controls, and credit exposure when separately approved.
- Accounts Payable.
- Bank and Cash.
- Bank Reconciliation.
- Chart of Accounts.
- Journal Entries.
- General Ledger.
- Trial Balance.
- Accounting Periods.
- Period Close.
- Profit and Loss.
- Balance Sheet.
- Cash Flow.

### 7.6 Management and Reporting

- Role-based dashboards.
- Personal work queues.
- Approval inbox.
- Reports Center.
- Event P&L.
- Supplier reports.
- Expense reports.
- Cash and ageing reports.
- Operational reports.
- Exports.

### 7.7 Administration and Platform

- Users and role templates.
- Per-user permission grants and denials.
- User invitations and identity.
- User suspension, disablement, archival, and former-employee history.
- User activity reporting.
- Permission matrix.
- Approval and separation-of-duties rules.
- Company settings.
- Categories and master data.
- Document numbering.
- Integrations.
- Audit log.
- AI usage controls.
- Future tenant settings.
- Future tax and compliance settings.

<!--PAGEBREAK-->

## 8. Navigation and Information Architecture

### 8.1 Proposed top-level sidebar

```text
Dashboard

CRM & Sales
  Customers
  Services
  Quotations
  Tenders & Bids (future / deferred)
  Customer Invoices
  Customer Payments

Operations
  Event Briefs
  Site Visits
  Tasks & Timeline
  Permits & Documents
  Incidents
  Crew & Daily Labour

Suppliers & Procurement
  Suppliers
  Requests for Quotation
  Supplier Quotations
  Quote Comparisons
  Purchase Orders
  Supplier Bookings
  Service Receipts

Expenses & Costing
  Company Expenses
  Direct Event Expenses
  Employee Reimbursements
  Petty Cash
  Event Costing
  Budgets & Contingency

Finance & Accounting
  Vendor Bills
  Supplier Payments
  Supplier Credits
  Advances & Deposits
  Bank & Cash
  Bank Reconciliation
  Chart of Accounts
  Journal Entries
  Accounting Periods

Reports
  Reports Center

Administration
  Users & Roles
  Company Settings
  Categories & Masters
  Approval Rules
  Integrations
  Audit Log
```

### 8.2 Navigation behavior

- Dashboard opens immediately after sign-in.
- Top-level sections expand and collapse.
- The system remembers the user's expanded section where appropriate.
- The sidebar should remain no deeper than two clear menu levels.
- Deeper drill-down belongs inside pages.
- The current product does not use a global cross-module search surface. Each major list page uses module-local search, while Customer and Service workspaces provide contextual navigation to related records. A future global finder may be reconsidered only after real workflow evidence proves it shortens common tasks.
- The mobile version uses the same grouping in a drawer.
- A section disappears when the user has no permission for any item within it.
- Create, approve, pay, and void actions require separate permissions even when the page is visible.

### 8.3 Estimated page scale

The complete vision may require approximately 28 to 32 new top-level list/workspace pages over several phases. Detail pages are not separate sidebar entries.

The user must not see thirty links at once. The navigation should expose approximately seven or eight logical groups.

---

## 9. Service Page Reorganization

### 9.1 Problem

The current Service detail page is becoming overloaded. Continuing to place every future module in one vertical page will increase cognitive load, rendering cost, permission complexity, and maintenance risk.

### 9.2 Future Service overview

The main Service page should show:

- Event or Service identity.
- Customer.
- date, venue, and responsible people.
- Current stage and next action.
- Key alerts.
- Commercial summary.
- Cost and margin summary for authorized users.
- Operational readiness summary.
- Links to dedicated workspaces.

### 9.3 Proposed Service workspaces

| Workspace | Purpose |
|---|---|
| Commercial | Customer quotation, billing authority, invoices, payments, and commercial changes. |
| Procurement | Requirements, supplier quotes, comparison, award, Purchase Orders, bookings, and receipt. |
| Costing | Estimates, commitments, bills, direct expenses, credits, paid amounts, outstanding amounts, and margin. |
| Operations | Event Brief, venue, Site Visits, tasks, setup, event day, teardown, and team. |
| Documents | Permits, attachments, insurance certificates, approvals, and missing-document alerts. |
| Risks | Incidents, claims, damages, contingencies, and unresolved blockers. |

### 9.4 General pages remain useful

Global pages may show all Purchase Orders, all Vendor Bills, all expenses, or all permits for search and follow-up. They must not become an unrelated mutation authority that bypasses the Service context for event-specific records.

---

## 10. Layer 2 — Future Multi-Company and SaaS Readiness
This entire section belongs to **Layer 2 productization**. It is a readiness and activation-gate section, not authorization to add tenant complexity during current remediation or Layer 1 internal ERP delivery.


### 10.1 Current product mode

The product is currently single-company and should remain operationally simple for G7 BLUE.

### 10.2 Future product mode

After Layer 1 has been proven inside G7 BLUE and the internal proof gate has passed, Layer 2 is intended to support multiple independent event companies. Each company would have its own:

- Users and roles.
- Customers.
- Services.
- Suppliers and commercial relationships.
- Documents and numbering.
- Accounting records.
- Settings.
- Taxes.
- AI usage limits.
- Storage.
- Reports.

### 10.3 Readiness requirements now
Layer 1 should preserve a small number of **seams**, not pre-build multi-company. Current single-company settings, numbering, RBAC, and data ownership remain acceptable for G7 BLUE while only one company exists.

Preserve now:

- Settings access behind server-side functions rather than scattering direct assumptions.
- Document numbering behind controlled RPC/service boundaries.
- Existing permission call sites so company context can later be introduced behind them.
- Immutable issued-document snapshots and durable audit/history identifiers.
- Service-centered domain boundaries and dedicated workspaces rather than one universal table.

Do **not** add tenant/company columns to every table, tenant UI, company switching, SaaS billing, or cross-company RLS merely for future readiness. Those belong to Layer 2 after the ownership and membership model is approved.

Before a second company is activated, Layer 2 must explicitly solve:

- company/legal-entity ownership and first-company backfill;
- company-aware settings and numbering;
- membership and active-company authorization context;
- server/RPC/RLS company scoping;
- historical audit ownership, export, retention, deletion, restore, and rollback;
- subscription/plan/quota and commercial operating rules.


### 10.4 Later SaaS questions

- Is one customer account one company, or can one account own several legal entities or branches?
- Are supplier directories private, shared, or hybrid?
- Can a consultant user work across companies?
- How are plans priced: users, events, storage, AI usage, or modules?
- What data export and deletion rights are required?
- How are country, currency, tax, and language differences handled?

These are future platform questions and must not delay G7 BLUE's internal value.

---

## 11. VAT and ZATCA Readiness

### 11.1 Current position

VAT, Tax Invoice, QR, XML, and ZATCA integration must remain inactive until the company is registered and an approved tax/compliance design exists.

### 11.2 Future architectural readiness

Future invoice and accounting design should preserve room for:

- Company tax-registration status.
- Tax identification number.
- Tax rates and tax codes.
- Inclusive and exclusive pricing.
- Invoice type.
- Seller and buyer tax snapshots.
- Tax date and supply date.
- Debit and credit notes.
- Immutable issued-document snapshots.
- Future XML generation.
- Future QR generation.
- Future ZATCA clearance or reporting status.
- Retry, rejection, audit, and compliance logs.

### 11.3 Non-negotiable boundary

The current system must not present itself as ZATCA-compliant merely because it can print an invoice PDF. Compliance requires a separately designed and tested integration against the official Saudi specification when the company is ready.

---

## 12. Accounting Blueprint

### 12.1 Why accounting must be a foundation

Adding expenses, supplier bills, bank transactions, and profitability without a consistent accounting core would create duplicate and contradictory financial truth.

The product should progressively provide a real accounting engine, even if users encounter it through simple business workflows rather than manual accounting screens.

### 12.2 Chart of Accounts

The Chart of Accounts is the organized list of financial accounts used by the company.

Examples:

- Bank.
- Cash.
- Customer receivables.
- Supplier payables.
- Supplier advances.
- Refundable deposits.
- Event revenue.
- Venue cost.
- Audio cost.
- Employee salaries.
- Office rent.
- Equipment assets.
- Customer deposits.

### 12.3 Double-entry accounting

Every accounting transaction affects at least two accounts with equal debit and credit totals.

Examples:

- Paying rent increases rent expense and decreases bank.
- Receiving a Vendor Bill increases event cost and increases supplier payable.
- Receiving customer cash increases bank and reduces customer receivable or records a customer advance, depending on the situation.

### 12.4 Journal Entries

A Journal Entry is the accounting record generated by a business event.

Most entries should be generated automatically from approved documents:

- Customer Invoice.
- Vendor Bill.
- Expense.
- Payment.
- Advance.
- Credit note.
- Refund.
- Deposit settlement.

Manual journal entries should be limited to authorized accounting adjustments.

### 12.5 Accounts Receivable

Accounts Receivable represents money customers owe the company.

If an earned and invoiced amount is 100,000 SAR and the customer has paid 30,000 SAR, the remaining customer receivable is 70,000 SAR.

### 12.6 Accounts Payable

Accounts Payable represents money the company owes suppliers or other payees.

If a Vendor Bill is 50,000 SAR and 20,000 SAR has been settled, the outstanding supplier payable is 30,000 SAR.

### 12.7 Bank and Cash

The system should track:

- Bank accounts.
- Cash boxes.
- Petty cash.
- Employee or project advances.
- Transfers.
- Deposits.
- Receipts.
- Fees.

### 12.8 Bank Reconciliation

Bank Reconciliation compares the system's recorded transactions with the actual bank statement.

It identifies:

- Failed or missing transfers.
- Unrecorded bank fees.
- Unknown deposits.
- Duplicate payments.
- Timing differences.
- Incorrect references.

### 12.9 Trial Balance

The Trial Balance lists all account balances and verifies that total debits equal total credits. It confirms arithmetic balance, but not necessarily correct classification.

### 12.10 Financial Period Close

Period Close is the controlled process of completing a month or year:

- Review documents.
- Record outstanding costs.
- Reconcile banks.
- Reconcile customer and supplier balances.
- Review advances and deposits.
- Post adjustments.
- Lock the period against uncontrolled edits.

### 12.11 Financial statements

**Profit and Loss:** Revenue, direct cost, overhead, and profit for a period.  
**Balance Sheet:** Assets, liabilities, and owner equity at a date.  
**Cash Flow:** How cash entered and left the business.

### 12.12 Managerial event profitability versus statutory accounting

The product can provide useful Event Margin before every statutory accounting policy is complete, but it must label the basis clearly.

Formal accounting revenue recognition, tax treatment, and financial statements require review by a qualified accountant familiar with the company's Saudi obligations.

### 12.13 Customer commercial revenue traceability

The system must preserve the bridge from the customer's original commercial value to the net amount that affects event profitability.

A future Service commercial summary should distinguish:

```text
Gross quotation value
− Approved quotation discount
+ Approved positive commercial changes
− Approved negative changes and customer credits
= Net approved commercial value
```

It must then separately show:

- Amount invoiced.
- Amount collected.
- Customer credits issued.
- Refunds paid.
- Customer credit balance.
- Outstanding receivable.
- Revenue-recognition basis, once approved by the accountant.

This managerial commercial view does not by itself decide statutory revenue recognition.

### 12.13A Reporting Truth Contract

Reporting must preserve separate business truths rather than forcing one number to answer several questions.

**Owner-locked current reporting rules:**

1. **Billed / Invoiced:** a customer invoice may contribute only after the authoritative issue boundary. Draft/non-issued documents do not count; cancelled or voided documents do not remain live billed authority.
2. **Invoice financial period:** use authoritative `issued_at`. Do not silently fall back to `created_at` for financial totals.
3. **Customer acquisition versus activity:** `customer.created_at` answers when the customer master was created. It must not hide an older customer's invoices, payments, balances, or other period activity. Customer identity is resolved through the transaction relationship.
4. **Riyadh calendar semantics:** current Business Year semantics remain based on the approved Riyadh calendar boundary for the surfaces that consume Business Year.

**Existing architectural separations that must remain true:**

- Customer Invoice and Customer Payment are separate records.
- Amount invoiced, Amount collected, Outstanding Receivable, Customer Credits, Refunds, Customer Credit Balance, and future Revenue Recognition are separate concepts.
- Profit is not cash, and customer cash received is not automatically recognized revenue.

**Controller recommendation pending explicit owner lock:**

- **Collected Cash for a selected period** should equal valid customer-payment amounts whose business payment date falls inside that period. A later payment against an older invoice belongs to the cash-collection period in which the payment occurred; `invoice.amount_paid` remains useful as a current settlement summary but must not be used as the period-cash source when invoices are selected by issue date.
- **Current Outstanding Receivable** means the balance customers owe now.
- **Outstanding Receivable as of period end** means the balance customers owed at a historical cutoff, reconstructed from issued billing authority plus credits/adjustments and settlements effective by that cutoff. It must not simply reuse today's balance.
- **Due / Overdue** should be derived from approved payment-term and due-date semantics rather than invoice creation time.
- The unqualified label **Revenue** should remain reserved for the accountant-approved revenue-recognition policy. Before that lock, use explicit managerial labels such as Invoiced/Billed, Collected Cash, Outstanding Receivable, and Net Approved Commercial Value.

### 12.13B Customer Billing, Payment Terms, and Credit-Control Boundary

The future customer receivables model should distinguish five concepts:

1. **Billing schedule / invoice milestones:** when G7 BLUE is allowed or expected to issue invoices, for example deposit, progress/partial, or final billing.
2. **Payment terms:** when an issued invoice becomes due, for example immediate payment, a fixed due date, or approved credit days.
3. **Settlement / payment:** the actual money received, including partial and final payments, recorded independently from the invoice.
4. **Customer credit policy:** the maximum approved receivable exposure, overdue tolerance, collection hold, or authorized override that controls whether further work, approval, or billing may proceed.
5. **Customer Credit Balance:** value owed back to the customer or intentionally retained for approved future settlement after an overpayment, reduction, or credit. This is **not** the same as giving the customer payment terms or a credit limit.

Future design may include payment-term templates, invoice due dates, instalments, ageing buckets, collection status, credit limits, overdue thresholds, warning/hold behavior, and authorized overrides. Exact policy is open and must be validated with G7 BLUE practice and an event-company accountant before broad financial automation.

The system must not infer revenue from a credit sale or from cash timing. A customer may owe G7 BLUE money while the event is profitable, and G7 BLUE may hold customer cash before the corresponding revenue is earned.

### 12.13C Customer Commercial Authorization Evidence

The system should preserve evidence of the event that authorized work or billing without forcing one universal document type on every customer.

Possible evidence, subject to field validation and policy, includes:

- approved quotation confirmation;
- signed quotation or acceptance document;
- customer Purchase Order / reference;
- customer contract;
- award letter or Tender award;
- approved email, WhatsApp, phone, in-person, or other recorded confirmation already permitted by the commercial policy.

The evidence record should identify source/type, reference, date, attachment or link where available, actor who recorded it, and the Service/Quotation/Tender it authorizes. Exact mandatory evidence by customer type, value, Tender path, and risk remains open.

### 12.14 Discount lifecycle

The approved direction is:

```text
Quotation Draft
→ discount entered and reviewed
→ customer sees the discounted offer
→ authorized approval freezes the commercial snapshot
→ internal billing authority preserves gross value, discount, and net value
→ invoices display the carried discount allocation
→ reports use net commercial revenue for profitability
```

The user must not manually recreate the discount on every invoice.

The future contract must reconcile:

```text
Sum of invoice gross amounts
− Sum of invoice discount allocations
= Sum of invoice net amounts
= Approved billable ceiling after discount
```

The exact supported discount types and rounding allocation remain open for accountant and technical review.

### 12.15 Issued customer-document immutability

Before issue, an invoice Draft may be edited or discarded according to permission.

After issue, the following values are locked:

- Customer and Service reference.
- Commercial source and billing authority.
- Lines, quantities, prices, discount allocation, and totals.
- Issue date and document number.
- Historical creator and issuer.

Later changes create linked records instead of rewriting the issued invoice.

### 12.16 Customer changes after invoice issue

| Scenario | Controlled treatment |
|---|---|
| Customer adds scope or quantity | Approved Change Order or commercial amendment, then additional invoice. |
| Customer removes scope before full settlement | Approved negative change and linked customer credit note or commercial credit adjustment. |
| Customer has already overpaid after a reduction | Credit note plus recorded refund or customer credit balance. |
| Company entered an incorrect amount | Linked accounting correction, credit adjustment, or additional invoice; original remains unchanged. |
| Service was delivered but management grants a later concession | Approved post-sale discount/credit that reduces net revenue and is separately reported. |
| Customer requests a change after event financial close | Controlled reopen or post-close adjustment according to approved accounting policy. |

Every adjustment must record reason, actor, approver, timestamp, affected Service, original document, and settlement result.

### 12.17 Effect on event and company profitability

Event profitability must not use the undiscounted quotation value after a discount or customer credit has been approved.

A future managerial bridge should show:

```text
Gross contracted value
− quotation discounts
+ approved additions
− credit notes and commercial reductions
= Net commercial revenue basis

Net commercial revenue basis
− Actual Direct Event Cost
= Managerial Event Margin
```

Company reporting aggregates the same source of truth before subtracting company overhead and other approved expenses.

<!--PAGEBREAK-->

## 13. Company Expenses and Employee Reimbursements

### 13.1 Company Expense

A Company Expense is general overhead that does not have to belong to one Service.

Examples:

- Office rent.
- Internet.
- Software subscriptions.
- Company marketing.
- Government fees.
- General transport.
- Office supplies.
- General maintenance.
- Fixed salaries.

### 13.2 Direct Event Expense

A Direct Event Expense exists because of one Service and must link to that Service.

Examples:

- Venue hire.
- Audio and lighting.
- Screens.
- Decoration.
- Printing.
- Daily labour.
- Event transport.
- Crew meals.
- Event permits.
- Emergency repair.
- On-site purchase.

A direct expense may have been planned or unexpected. The defining test is whether the cost was caused by the specific event.

### 13.3 Employee reimbursement workflow

```text
Employee records expense
→ Adds receipt and reason
→ Links Service when event-related
→ Submits
→ Finance reviews
→ Manager/Admin approves according to policy
→ Finance reimburses
→ Record closes
```

### 13.4 Direct company-paid expense workflow

```text
Finance records expense
→ Approval according to policy
→ Payment or settlement
→ Close
```

### 13.5 Suggested states

- Draft.
- Submitted.
- Under Review.
- Approved.
- Rejected.
- Paid or Reimbursed.
- Voided.

These states are a proposal until the final workflow is approved.

### 13.6 Receipt rules

- Receipt required for employee reimbursement.
- Receipt required above a configurable value.
- Missing receipt requires reason and higher approval.
- Original file retained.
- Duplicate receipt detection should be considered later.

### 13.7 Petty cash

Petty cash is an accountable cash balance for small and urgent spending.

The system should track:

- Custodian.
- Starting amount.
- Top-ups.
- Every spend.
- Receipts.
- Remaining balance.
- Returned amount.
- Shortage or overage.
- Settlement date.
- Service link when the cash advance is event-specific.

Funding petty cash is not automatically an expense. The actual approved uses are the expenses.

### 13.8 Fixed salaries

Fixed employee salaries should be recorded as Company Expenses for company-profit reporting.

Government HR, payroll, wage, and social-insurance processes remain under the responsible HR employee or external system. G7 BLUE CRM may track cost and payment status without pretending to replace every official HR platform.

---

## 14. Daily Labour, Meals, and Emergency Spending

### 14.1 Organised labour supply

Preferred workflows use licensed labour, cleaning, crowd-management, event-support, setup, or equipment suppliers.

The cost then flows through:

- Supplier.
- Purchase Order or approved engagement.
- Attendance or service receipt.
- Vendor Bill.
- Supplier Payment.

### 14.2 Direct temporary individuals

When individuals are used directly, the system may need operational and cost tracking:

- Name.
- Contact.
- Task.
- Date and hours.
- Daily rate.
- Meal.
- Transport.
- Service.
- Requester.
- Approver.
- Payment evidence.
- HR verification status.

The system must not describe unverified people as legally approved workers. Use neutral statuses such as:

- Verified.
- Provided by licensed supplier.
- Pending HR review.
- Not approved.

### 14.3 Meals and transport

Crew meals and transport caused by the event are Direct Event Expenses. They may originate from an estimate, supplier order, petty cash, or employee reimbursement.

---

## 15. Procurement and Supplier Workflow

### 15.1 Terminology

**RFQ - Request for Quotation:** G7 BLUE asks one or more suppliers to provide price and terms for a defined requirement.  
**Supplier Quotation:** The supplier's commercial offer.  
**Award:** The recorded decision selecting a supplier quotation.  
**Purchase Order:** G7 BLUE's approved formal order to the supplier.  
**Supplier Booking:** Operational reservation of supplier capacity or date.  
**Service Receipt:** Evidence that the requested service or equipment was delivered and accepted.  
**Vendor Bill:** The supplier's financial invoice to G7 BLUE.  
**Supplier Payment:** Money paid to the supplier.

### 15.2 Proposed supplier journey

```text
Service requirement
→ RFQ or direct quote request
→ Supplier quotation received
→ Review and comparison
→ Supplier selection and approval
→ Purchase Order or approved contract
→ Booking confirmation
→ Advance or refundable deposit when required
→ Delivery, installation, operation, or rental
→ Service receipt and issue recording
→ Vendor Bill
→ Bill review and matching
→ Payment or credit allocation
→ Financial close
```

### 15.3 RFQ flexibility

Not every small purchase needs a formal multi-supplier RFQ.

Possible paths:

- Formal RFQ to several suppliers.
- Direct quotation from an existing supplier.
- Emergency purchase with a documented reason.

The exact threshold and control policy remain open.

### 15.4 Supplier quote scope fields

A useful supplier quotation record may capture:

- Original file.
- Supplier.
- Quote number.
- Issue date.
- Valid-until date.
- Currency.
- Amount before tax.
- Tax.
- Total.
- Advance required.
- Payment terms.
- Credit days.
- Cancellation terms.
- Delivery.
- Unloading.
- Installation.
- Operation.
- Technicians.
- Extra hours.
- Teardown.
- Transport.
- Entry permits and badges.
- Electricity and cabling responsibility.
- Damage responsibility.
- Included scope.
- Excluded scope.
- Attachments and notes.

### 15.5 Supplier comparison

Comparison is important because the cheapest quote may not be the lowest total risk or total cost.

A comparison may include:

- Price.
- Scope coverage.
- Advance percentage.
- Credit terms.
- Availability.
- Lead time.
- Delivery.
- Installation.
- Operators.
- Teardown.
- Cancellation flexibility.
- Refundable deposit.
- Compliance documents.
- Previous performance.
- Incidents.
- Quality.

The recommended first version is a transparent comparison table, manual selection, and a required decision reason. Weighted scoring should wait until G7 BLUE has real performance data.

### 15.6 Purchase Order

The Purchase Order should record:

- Supplier.
- Service.
- Selected quotation.
- Scope and line items.
- Quantities and prices.
- Delivery dates and location.
- Setup and teardown windows.
- Payment terms.
- Advance.
- Deposit.
- Acceptance requirements.
- Approval.
- Amendment history.
- Cancellation.
- Snapshot of the agreed terms.

### 15.7 Committed Cost

Committed Cost begins when G7 BLUE is formally bound by an approved Purchase Order, contract, or equivalent approved commitment.

A quotation alone is not a commitment. A tentative booking alone is not a commitment.

### 15.8 Supplier failure or missing scope

Before Purchase Order approval, the draft may be changed normally with a reason and revised quotation.

After approval, changes should preserve history through:

- Purchase Order amendment.
- Line cancellation.
- Approved substitute.
- Additional Purchase Order to another supplier.
- Full cancellation when the failure is fundamental.

The system should capture:

- Missing item.
- Reason.
- Replacement.
- Price difference.
- Timing impact.
- Approval.
- Evidence.
- Supplier-performance consequence.

---

## 16. Document Capture and AI Assistance

### 16.1 Baseline capture

The first reliable workflow is:

```text
Upload original document
→ Enter structured fields manually
→ Validate totals and terms
→ Approve data
→ Preserve source file and audit trail
```

### 16.2 Scan and fill

A future Scan and Fill action may:

- Read text from PDF or image.
- Detect supplier name.
- Detect quote or invoice number.
- Detect date.
- Detect total and tax.
- Suggest advance percentage.
- Extract line items where possible.
- Fill fields for review.

### 16.3 Local OCR versus cloud document AI

**Local or open-source OCR:** Low variable cost, useful for basic text, numbers, and fixed fields; weaker with mixed Arabic/English tables and commercial meaning.  
**Cloud document intelligence:** Better structured extraction and table understanding; introduces usage cost, privacy, integration, and vendor dependence.

### 16.4 Recommended adoption model

1. Upload and manual entry.
2. Optional local OCR or browser Scan and Fill.
3. On-demand cloud extraction only when the user requests it.
4. Monthly usage limits and audit logs.
5. Human confirmation before any financial state changes.

### 16.5 Wider AI use cases

AI can later assist with:

- Supplier quote extraction.
- Vendor Bill extraction.
- Receipt extraction and category suggestion.
- Duplicate-document detection.
- Purchase Order versus invoice variance explanations.
- Contract-term extraction.
- Permit and insurance expiry extraction.
- Supplier comparison summaries.
- Risk and missing-scope detection.
- Suggested meeting or event checklists.
- Management explanations of cost variance.

The product story should focus on measurable value, such as reducing data-entry time and detecting costly mismatches before payment, not on adding an AI badge.

---

## 17. Purchase Order, Receipt, and Vendor Bill Matching

### 17.1 Why amounts may differ

A Vendor Bill should normally match the approved commitment and delivered scope, but legitimate differences may occur.

A bill may be lower because:

- A line was cancelled.
- Quantity was lower.
- Hours were lower.
- A discount was granted.
- A usage-based service was not fully used.

A bill may be higher because:

- Additional hours were authorized.
- Additional quantity was ordered.
- Location changed.
- Additional transport or setup was approved.
- The supplier made an error.
- The supplier added an unauthorized charge.

### 17.2 Control rule

A bill above the Purchase Order or accepted service should not be approved automatically.

The reviewer must determine whether to:

- Approve an authorized Purchase Order amendment.
- Reject the excess.
- Request a corrected invoice.
- Request a supplier credit.
- Escalate the exception.

### 17.3 Three-way matching for event services

```text
Approved Purchase Order
+ Service Receipt or acceptance
+ Vendor Bill
= Reviewable payment basis
```

The Service Receipt may confirm:

- Equipment delivered.
- Quantity.
- Installation completed.
- Technicians attended.
- Operation completed.
- Teardown completed.
- Defects or missing scope.
- Accepted, accepted with conditions, or rejected.

### 17.4 Unused commitment

If an approved Purchase Order is 50,000 SAR and the accepted bill is 48,000 SAR after an approved reduction, the remaining 2,000 SAR is an unused commitment. It is closed as unused after review; it is not an extra payment or hidden expense.

---

## 18. Supplier Advances, Deposits, Credits, and Claims

### 18.1 Supplier advance

A Supplier Advance is money paid before final invoice settlement, often to confirm the booking or begin work.

Example:

- Purchase Order: 50,000 SAR.
- Advance paid: 20,000 SAR.
- Final accepted invoice: 48,000 SAR.
- Advance applied: 20,000 SAR.
- Remaining payable: 28,000 SAR.

### 18.2 Refundable supplier or equipment deposit

A Refundable Deposit is money expected to return.

Example:

- Deposit paid: 5,000 SAR.
- No damage: 5,000 SAR returned; event cost is zero.
- Approved damage: 1,500 SAR retained; 3,500 SAR returned; 1,500 SAR becomes Actual Cost or claim cost.

### 18.3 Supplier credit

A Supplier Credit represents value owed to G7 BLUE, for example:

- Overpayment.
- Cancelled line.
- Returned advance.
- Discount after billing.
- Service not delivered.
- Approved damage charge against supplier.

### 18.4 Alerts

The system should eventually alert on:

- Vendor Bill due soon.
- Overdue payable.
- Advance not allocated.
- Refundable deposit not returned.
- Supplier credit not used.
- Purchase Order without receipt.
- Vendor Bill above Purchase Order.
- Open damage claim.
- Insurance or compliance document expiry.

---

## 19. Event Cost States

| Cost state | Business meaning | Typical source |
|---|---|---|
| Estimated Cost | What the event is expected to cost before formal commitment. | Rate card, historic cost, manual estimate, budget quote, labour estimate, contingency. |
| Committed Cost | What the company has formally agreed to pay. | Approved Purchase Order, approved contract, or equivalent commitment. |
| Actual Cost | Cost supported by an accepted Vendor Bill, approved direct expense, labour cost, or adjustment. | Vendor Bill, approved direct expense, approved labour, credit or adjustment. |
| Paid Cost | Cash already paid to settle approved cost or an allocated advance. | Supplier Payment, reimbursement, or expense settlement. |
| Outstanding Cost | Accepted cost still unpaid after payments and credits. | Vendor Bills minus allocated payments and credits. |

### 19.1 Example

- Estimated Cost: 65,000 SAR.
- Committed Cost: 60,000 SAR.
- Actual Cost: 62,000 SAR.
- Paid Cost: 40,000 SAR.
- Outstanding Cost: 22,000 SAR.

Interpretation:

- Planning expected 65,000 SAR.
- Approved commitments reached 60,000 SAR.
- Accepted real cost became 62,000 SAR.
- 40,000 SAR has been settled.
- 22,000 SAR remains payable.

### 19.2 Important separations

- Booking is not commitment.
- Payment is not the birth of cost.
- A Vendor Bill may create Actual Cost even before payment.
- A refundable deposit is not automatically cost.
- Company overhead is not randomly assigned to a Service.
- Customer Payment is not automatically revenue recognition.

---

## 20. Event Margin and Company Profitability

### 20.1 Expected Event Margin

Working managerial formula:

```text
Approved event revenue basis
− Forecast event cost
= Expected Event Margin
```

A possible Forecast Cost basis is:

```text
Committed Cost
+ Remaining Estimates
+ Contingency
```

The exact revenue basis remains open.

### 20.2 Actual Event Margin

Working managerial formula:

```text
Net recognized or approved event revenue
− Actual Event Cost
= Actual Event Margin
```

The product must not label a number as statutory Actual Margin until revenue recognition and cost-close rules are approved.

### 20.3 Event Margin

Event Margin is the profit from one Service before company overhead:

```text
Event revenue − Direct event cost
```

### 20.4 Company Gross Profit

Company Gross Profit combines event results before general overhead:

```text
Total event revenue − Total direct event cost
```

### 20.5 Net Profit

Net Profit subtracts company overhead and other expenses:

```text
Gross Profit − Company Expenses − Other expenses
```

### 20.6 Profit is not cash

A company may be profitable while customers still owe money. The unpaid amount remains Accounts Receivable.

A company may have cash because customers paid advances before revenue was earned. That cash may still represent an obligation to perform work.

### 20.7 Open accounting decisions

- Revenue basis for expected margin.
- Revenue-recognition point for actual margin.
- Treatment of cancelled or partially delivered events.
- Treatment of customer credits and refunds.
- Whether overhead is allocated to events.
- Event financial-close policy.
- Target-margin warnings or blocking.

---

## 21. Event Cost Ledger

Each Service should eventually provide a complete cost and profitability view.

### 21.1 Estimates

Expected amounts before formal supplier commitment.

### 21.2 Commitments

Approved Purchase Orders and contracts.

### 21.3 Vendor Bills

Supplier invoices accepted against delivered work.

### 21.4 Direct Expenses

Emergency purchases, staff spending, daily labour, meals, transport, fees, and other approved Service-linked costs.

### 21.5 Credits

Supplier credits, reductions, refunds, and approved recoveries.

### 21.6 Payments

Advances, partial payments, final payments, reimbursements, and settlements.

### 21.7 Outstanding

Accepted liabilities not yet paid, plus separate visibility of commitments not yet billed.

### 21.8 Category breakdown

Examples:

- Venue.
- Audio.
- Lighting.
- Screens.
- Stage.
- Decoration.
- Printing.
- Labour.
- Transport.
- Hospitality.
- Permits.
- Security.
- Contingency usage.

---

## 22. Event Brief, Venues, and Site Visits

### 22.1 Event Brief

The Event Brief must remain under the Service rather than becoming a competing master entity.

Possible information:

- Event name and type.
- Objective.
- Audience.
- Expected attendance.
- Dates.
- Venue or venue requirements.
- Setup and teardown windows.
- Scope.
- Budget.
- Deliverables.
- Branding.
- Technical requirements.
- Hospitality.
- Speakers and VIPs.
- Security.
- Accessibility.
- Marketing responsibility.
- Ticketing responsibility.
- Customer contacts.
- Approval contacts.
- Cancellation and amendment conditions.
- Attachments.

### 22.2 Venue responsibility

Each Service should identify whether:

- The customer provides the venue.
- The customer specifies a venue.
- G7 BLUE must search for a venue.
- Selection is joint.
- The venue is not yet determined.

### 22.3 Venue search workflow

```text
Venue requirements
→ Candidate venues
→ Availability and quotations
→ Site Visit
→ Comparison
→ Customer approval
→ Booking or contract
→ Advance or deposit
→ Required permits
```

### 22.4 Site Visit

Possible outcomes:

- Pass.
- Pass with Conditions.
- Revisit Required.
- Not Suitable.

Possible checks:

- Dimensions.
- Loading access.
- Elevators.
- Parking and trucks.
- Ceiling height and rigging.
- Power and backup power.
- Internet.
- Sound restrictions.
- Stage and screen visibility.
- Emergency exits.
- Fire and safety rules.
- Storage.
- VIP routes.
- Crowd flow.
- Accessibility.
- Allowed working hours.
- Setup and teardown slots.
- Photos, documents, risks, actions, and owners.

The final rule for mandatory Site Visits remains open.

---

## 23. Permits, Documents, Insurance, Damage, and Incidents

### 23.1 Permits and documents

Each required document should track:

- Document type.
- Service.
- Responsible party: G7 BLUE, customer, venue, supplier, or another party.
- Required date.
- Expiry date.
- Approval status.
- Attachment.
- Reminder.
- Whether missing documentation blocks execution.
- Permission and retention policy.

### 23.2 Insurance Policy

Insurance Policy is the coverage contract.

It may be:

- General company insurance.
- Event-specific insurance.
- Equipment insurance.
- Liability insurance.
- Another policy required by contract or venue.

### 23.3 Insurance Premium

Insurance Premium is the amount paid for the insurance coverage.

- Event-specific premium is a Direct Event Expense.
- Annual company premium is a Company Expense.

### 23.4 Customer Damage Deposit

Money held from the customer as security. It is not revenue unless an approved settlement makes part of it earned.

### 23.5 Venue Deposit

Money G7 BLUE gives the venue and expects to recover after successful handover.

### 23.6 Incident Report

An Incident Report records an operational event such as:

- Equipment damage.
- Injury.
- Venue damage.
- Missing equipment.
- Safety event.
- Service failure.

It should capture facts, time, place, people, photos, witnesses, immediate action, owner, and status.

### 23.7 Damage Claim

A Damage Claim is a financial demand resulting from damage or another incident.

It may be from or against:

- Venue.
- Supplier.
- Customer.
- Insurer.
- G7 BLUE.

### 23.8 Claim Settlement

Claim Settlement records the final resolution, including amounts paid, recovered, offset, rejected, or absorbed by G7 BLUE.

---

## 24. Operations Timeline

A future Service timeline may include:

1. **Brief:** Capture the customer's event requirements.
2. **Site Visit:** Validate venue feasibility and conditions.
3. **Customer Quotation:** Prepare and approve G7 BLUE's offer.
4. **Supplier Selection:** Obtain and compare supplier offers.
5. **Purchase Order:** Formally commit to selected supplier scope.
6. **Permits:** Secure required documents and approvals.
7. **Setup:** Deliver and install equipment and event infrastructure.
8. **Event Day:** Execute and monitor the live event.
9. **Teardown:** Remove equipment, clean, and hand over the venue.
10. **Final Bills:** Receive and review supplier bills, credits, and claims.
11. **Financial Close:** Settle advances and deposits, confirm all costs, and calculate final profitability.

The timeline should not become one rigid workflow for every event type. It should support required and optional stages based on event type and scope.

---

## 25. Role-Based Dashboards and Permissions

### 25.1 Dashboard architecture

Use one dashboard framework with:

- Permission-scoped widgets.
- Role-scoped widgets.
- Assignment-scoped records.
- Personal pending actions.
- Company, team, or personal scope.

### 25.2 Management dashboard

Potential widgets:

- Active Services.
- Upcoming events.
- Revenue, invoiced, collected, and outstanding.
- Expected and Actual Margin.
- Company Expenses.
- Direct Event Costs.
- Supplier payables.
- Approval backlog.
- Risk alerts.
- Supplier performance.

### 25.3 Sales or Account Owner dashboard

Potential widgets:

- Assigned customers and Services.
- Inquiry follow-up.
- Draft, sent, expiring, and awaiting-customer quotations.
- Upcoming events.
- Overdue follow-ups.
- No cost or margin unless explicitly permitted.

### 25.4 Operations dashboard

Potential widgets:

- Today's and this week's events.
- Site Visits.
- Missing permits.
- Late tasks.
- Suppliers and bookings.
- Setup windows.
- Risks and incidents.
- Crew and equipment when available.

### 25.5 Finance dashboard

Potential widgets:

- Customer receivables.
- Vendor Bills.
- Supplier payables.
- Supplier payments.
- Expense approvals.
- Employee reimbursements.
- Bank reconciliation status.
- Cost variances.
- Deposits and advances awaiting settlement.

### 25.6 Personal dashboard

Potential widgets:

- My Services.
- My Tasks.
- My submitted expenses.
- My approvals.
- My notifications.
- Upcoming dates.

### 25.7 Permission behavior

- Unauthorized sidebar items are hidden.
- Direct link access is denied server-side.
- Sensitive values are excluded from returned data, not only hidden visually.
- A 403 page explains that access is unavailable without exposing protected record data.
- Dashboard does not become a separate authority to perform financial mutations.

### 25.8 Flexible permission resolution

The target access model is:

```text
Role-template defaults
+ per-user explicit grants
+ per-user explicit denials
= effective permission set
```

The same role may therefore produce different effective access for different employees.

Authorization must be enforced in:

- Server actions.
- Trusted RPC or service boundaries.
- RLS or database policy where appropriate.
- Returned data fields.
- UI visibility and disabled states.
- Audit logs.

Changing a permission must record who changed it, whose access changed, what changed, and when.

### 25.9 Invitation and identity

The normal user flow is:

```text
Authorized admin enters full name, email, and role template
→ secure invitation email is sent
→ invited employee accepts
→ employee sets their own password
→ account becomes active
```

The visible product identity uses the employee's full display name. Email may remain the login identifier.

Pending invitations should eventually support expiry, resend, cancel, and status.

### 25.10 User lifecycle

| State | Login | Historical activity | Typical use |
|---|---|---|---|
| Invited | No active access until acceptance | Invitation audit retained | New employee or mistaken invitation |
| Active | Allowed according to permissions | Fully attributed | Normal employment |
| Temporarily Suspended | Blocked | Preserved | Leave, temporary restriction, or investigation |
| Disabled | Blocked and sessions revoked where supported | Preserved | Immediate administrative stop |
| Archived / Former Employee | Permanently blocked operationally | Preserved and labelled | Employee left the company |

Reassignment of open work changes the current responsible user, not the historical creator or approver.

### 25.11 Deletion and historical attribution

Hard deletion must be blocked when the user is referenced by business, financial, approval, payment, permission, or audit history.

Archived users remain readable in historical records with:

- User identifier.
- Display name.
- Former-employee or inactive status.
- Historical role or actor snapshot where required.
- Original action timestamp.

### 25.12 User activity reporting

Authorized managers should eventually filter user activity by:

- Date range.
- Module.
- Action type.
- Service.
- Customer.
- Financial sensitivity.
- Permission or lifecycle change.

The report should distinguish record creation, edit, submission, approval, rejection, issue, payment, refund, permission change, suspension, reactivation, and archival where those events are logged.

### 25.13 Optional separate preparer and approver

A company setting may require a different user to approve quotations.

When OFF:

```text
Authorized creator may approve their own quotation.
```

When ON:

```text
Creator prepares
→ Submit for Approval
→ Pending Approval
→ different authorized user Approves or Rejects
```

The creator cannot approve the same quotation even if they hold `quotations:approve`.

This policy affects the human approval step only. Final approval still triggers the internal billing-authority contract.

---

## 26. Reports Center

A future Reports Center may group reports by domain.

### 26.1 Management

- Revenue, only after an accountant-approved recognition basis exists.
- Invoiced / Billed.
- Collected Cash.
- Current Outstanding Receivable.
- Historical Outstanding Receivable as of period end when supported.
- Due and Overdue Receivable / Customer Ageing.
- Company Expenses.
- Direct Event Cost.
- Expected and Actual Margin.
- Budget variance.
- Approval backlog.

### 26.2 Event P&L

- Revenue basis.
- Invoiced to date.
- Customer payments.
- Estimated Cost.
- Committed Cost.
- Actual Cost.
- Paid Cost.
- Outstanding Cost.
- Contingency.
- Expected Margin.
- Actual Margin.
- Category and supplier drill-down.

### 26.3 Supplier

- Spend by supplier.
- Spend by category.
- Quote win rate.
- Average price.
- On-time performance.
- Cancellation rate.
- Incident count.
- Outstanding payable.
- Credit Days and Credit Limit where approved.

### 26.4 Company Expense

- By category.
- By vendor or payee.
- By month.
- By user.
- Paid by employee.
- Reimbursement outstanding.
- Recurring expenses.
- Budget versus actual.

### 26.5 Accounting

- Journal report.
- General Ledger.
- Customer ageing.
- Supplier ageing.
- Trial Balance.
- Profit and Loss.
- Balance Sheet.
- Cash Flow.
- Bank reconciliation.

Reports must use the same underlying financial truth as operational pages and dashboards.

### 26.6 Reporting truth and time semantics

The Reports Center must make the basis of every metric visible enough that management can understand what the number means.

- **Invoiced / Billed** answers what customer invoices crossed the issue boundary in the selected period.
- **Collected Cash** is recommended to answer what valid customer payments occurred in the selected period by business payment date; this exact contract remains pending explicit owner lock.
- **Current Outstanding Receivable** answers what customers owe now.
- **Outstanding as of period end** answers what customers owed at a historical cutoff and requires an as-of calculation rather than today's balance.
- **New Customers** may use customer-master creation date; customer sales/payment/balance rankings must use transaction activity and must not exclude older customers merely because they were created before the selected period.
- **Revenue** is not a synonym for invoice total or cash received. Its final recognition basis remains accountant-dependent.
- Period boundaries use the approved Riyadh calendar semantics where Business Year applies.
- Permission restrictions must never be rendered as fake zero financial values. If a metric is unavailable because the user lacks authority, the UI must present an unavailable/hidden state rather than implying a true zero.

---

## 27. Design System and UX Rebaseline

### 27.1 Reason

Adding each feature independently has previously created repeated discussion about layout, cards, table patterns, and page density. A design contract is required before the ERP expansion.

### 27.2 Shared templates

The product should define reusable templates for:

1. Dashboard.
2. List and filters.
3. Record detail.
4. Transaction form.
5. Approval workspace.
6. Report and drill-down.

### 27.3 Design contract

The design system should define:

- Page widths.
- Spacing.
- Typography.
- Cards.
- Tables.
- Filters.
- Forms.
- Status badges.
- Financial number formats.
- Actions and approval buttons.
- Empty, loading, error, and unauthorized states.
- English and Arabic behavior.
- RTL.
- Desktop, tablet, and mobile behavior.
- Breadcrumbs and workspace navigation.
- Feature-utility proof before adding a cross-module surface: a new global workspace must shorten a demonstrated real task rather than duplicate obvious module navigation.
- Module-local search as the default retrieval pattern when users already know the record domain.
- Human-readable relationship context using business numbers and titles rather than UUIDs.
- No visible columns without an active workflow that creates and maintains their data.
- No sentinel dates, technical fallback values, or raw storage identifiers in normal UI.
- Search-input clear controls that do not overlap browser-native controls, icons, or typed text in LTR or RTL.
- Mixed Arabic/English locations displayed as separate bidi-safe fields or lines rather than concatenated into one ambiguous string.

### 27.4 Stitch usage

Google Stitch may be used to design and discuss screens before code implementation.

The input should include:

- Current G7 screenshots.
- G7 visual identity.
- Existing component examples.
- Sidebar model.
- RTL rules.
- Design contract or `DESIGN.md`.

Stitch output is a design proposal and still requires product approval and implementation review.

<!--PAGEBREAK-->

## 28. Two-Layer Expansion Roadmap and Pre-Expansion Foundation

This sequence remains a working roadmap hypothesis. Revision 0.12 adds an explicit layer map so phases cannot be mistaken for SaaS activation. The current remediation program itself remains governed by the current project roadmap/status rather than duplicated here.
**Important numbering rule:** the remediation program `G1-G12` and the expansion roadmap `Phase 0-8` are separate systems. `G1` is not `Phase 1`, `G2` is not `Phase 2`, and completion of a remediation Goal does not automatically activate an expansion Phase.


| Roadmap zone | Meaning | Company scope | Activation meaning |
|---|---|---|---|
| Pre-expansion foundation | Current-product remediation plus Phase 0 evidence/blueprints | G7 BLUE | Not broad expansion activation |
| Phase 0A | Already-approved bounded Rate Card V1 slice | G7 BLUE | Early bounded exception only |
| Layer 1 | Phases 1-8: internal Event ERP expansion | G7 BLUE only | Build and prove the operating ERP |
| Internal proof gate | Real-use, business, financial, acceptance, and readiness evidence | G7 BLUE | Must pass before Layer 2 |
| Layer 2 | Future platform/SaaS productization | Multiple event companies | Multi-company/SaaS activation |


### Phase 0 - Product Rebaseline and Field Evidence

- Update product vision.
- Confirm decision register.
- Complete Wednesday workflow interview.
- Collect sample documents where permission is granted.
- Prepare Domain Map.
- Prepare Sidebar Map.
- Prepare flexible role-template and per-user permission matrix.
- Prepare user invitation, suspension, archival, deletion, and activity-audit blueprint.
- Prepare customer commercial-change blueprint covering discounts, quotation revisions, Change Orders, credit notes, refunds, and customer credit.
- Prepare Reporting Truth and customer receivables blueprint covering billed/invoiced, collected cash, current versus historical outstanding, payment terms, due dates, ageing, credit-control boundaries, and customer commercial authorization evidence.
- Collect Zainab field evidence for itemized pricing, package pricing and inclusions, mixed package/item pricing, customer-facing grouping, detail level, discounts, approvals, supplier commitments, and post-approval change behavior before locking quotation hierarchy.
- Begin Tender/Bid discovery through real opportunity, kurrasah, Technical Proposal, Financial Proposal/BOQ, compliance, approval, submission, award/loss, and post-award handoff evidence; do not implement the module in Phase 0.
- Prepare accounting blueprint.
- Prepare design-system baseline.
- Reconcile canonical roadmap and deferred decisions.

### Phase 0A - Approved Bounded Expansion Slice: Supplier Rate Card Management V1

This phase follows the owner-approved A+ contract and proceeds through controlled tasks without activating broader procurement or accounting scope:

- Create Rate Card with quantity Unit + separate `pricing_basis`.
- Edit Rate Card while preserving permission and snapshot immutability.
- Activate and deactivate Rate Card.
- Validate effective date ranges (inclusive `valid_from`/`valid_to`, nullable open-ended `valid_to`).
- Applicability using authoritative Service/Event usage dates (single-date and multi-date full period coverage, safe failure on boundary-crossing periods without auto-splitting).
- Concurrency-safe active-overlap constraint (`chk_supplier_rate_cards_active_no_overlap`) and application-layer overlap checking.
- Preserve internal costing permissions (`supplier_costing:read`/`supplier_costing:write`) and customer-facing isolation.
- Exclude Delete/Restore, automated quotation pricing, universal days x daily pricing engines, overtime multipliers, RFQ, Purchase Orders, supplier finance, actual cost, and margin.
- Require Mozfer manual browser acceptance before commit slicing and merge.

Status: **IMPLEMENTED / COMMITTED on canonical `main` through `9115d3e`; G9 A+ ENHANCEMENT IMPLEMENTED; OWNER ACCEPTANCE PENDING.** No broader procurement, supplier accounting, Actual Cost, or Margin activation is implied.

### Layer 1 — Internal G7 BLUE Event ERP
Phases 1-8 below are the internal ERP expansion layer for G7 BLUE. They do not require multi-company, SaaS billing, or tenant UI.

#### Phase 1 - Financial Safety

- Immutable issued-customer-document rules.
- Customer invoice correction.
- Customer payment correction.
- Quotation families and controlled revisions.
- End-to-end discount traceability.
- Commercial Change Orders.
- Customer credit notes and credit balances.
- Refunds.
- Reversals.
- Audit rules.
- Backup and recovery policy.

#### Phase 2 - Accounting Foundation

- Chart of Accounts.
- Journal engine.
- Accounting periods.
- Bank and Cash foundation.
- Core receivable and payable postings.
- Customer due-date, ageing, and receivable-balance foundation aligned with approved payment-term semantics.
- Audit trail.
- Net commercial revenue bridge into event profitability.

#### Phase 2A - User Access and Lifecycle Foundation

- Role templates.
- Per-user grants and denials.
- Email invitations.
- Temporary suspension, disablement, and archival.
- Activity reporting foundations.
- Optional separate-preparer/approver company policy.

#### Phase 3 - Expenses and Cash Control

- Company Expenses.
- Direct Event Expenses.
- Employee Reimbursements.
- Receipt attachments.
- Petty Cash.
- Approval workflow.

#### Phase 4 - Procurement

- RFQ.
- Supplier Quotations.
- Quote Comparison.
- Supplier Award.
- Purchase Orders.
- Supplier Bookings alignment.
- Service Receipt.
- Committed Cost.

#### Phase 5 - Supplier Accounting

- Vendor Bills.
- Supplier Credits.
- Supplier Payments.
- Advances.
- Refundable deposits.
- Payables.
- Due and overdue alerts.
- Purchase Order and bill matching.

#### Phase 6 - Event Costing and Profitability

- Event Cost Ledger.
- Expected Cost.
- Actual Cost.
- Paid and Outstanding Cost.
- Expected Margin.
- Actual Margin.
- Variance.
- Event financial close.

#### Phase 7 - Event Operations

- Event Brief.
- Venue options.
- Site Visits.
- Tasks and timeline.
- Permits and documents.
- Crew and labour.
- Incidents and claims.

#### Phase 8 - Dashboards and Reports

- Management dashboard.
- Finance dashboard.
- Operations dashboard.
- Sales dashboard.
- Personal dashboards.
- Reports Center.
- Cash collection, ageing, and historical outstanding reporting using one shared financial truth.
- Financial statements and exports.

### Internal Proof Gate — required before Layer 2

Layer 1 completion is not defined only by code presence. Before activating Layer 2, G7 BLUE must have sufficient real-use evidence to approve productization. The final proof checklist and numeric thresholds remain open, but the gate must cover at minimum operational adoption, financial/data trust, owner/business-user acceptance, reusable-versus-G7-specific workflow separation, release readiness, and an approved company/migration/commercial blueprint.

### Layer 2 — Future Platform / SaaS Productization

Only after the internal proof gate and separate owner authorization:

- Company/legal-entity ownership context.
- Multi-company or multi-tenant isolation.
- Membership and active-company authorization context.
- Company-aware settings and document numbering.
- Historical G7 BLUE backfill/migration with reconciliation and rollback evidence.
- Subscription plans and entitlements.
- Company onboarding.
- Per-company or per-plan quotas, storage, AI usage limits, and noisy-neighbor controls.
- Configurable localisation, currency, country, and tax policy.
- ZATCA integration only through a separately approved compliance project.
- Supplier marketplace or shared discovery, if later approved.

---


### Historical delivery evidence boundary — Sections 28A through 28M

Sections 28A-28M preserve dated controller and delivery evidence for lineage. **They are historical snapshots, not current execution authority.** Any statement inside them about an active Goal, blocked/unblocked state, HEAD, worktree, test count, migration status, or implementation state is true only for its dated checkpoint unless separately reconfirmed by newer verified repository/controller evidence.

Agents must never select a stale sentence from these sections to override the top-level strategic decision register or the newest controller/repository truth.

## 28A. Dated Current-Delivery Sync — 3 August 2026

This section preserves the controlled-delivery state discussed on 3 August. A newer verified controller handover or agent report supersedes this dated snapshot.

### 28A.1 Authorized repository baseline at task start

```text
Repository:
C:/Users/Mozfer/.grok/worktrees/g7-g7-crm/2026-07-13-360132e5

Branch: main
HEAD/origin: 18dc0a78825ce16d7e5fbbbe26bbede7f31163f7
Divergence: 0/0
```

### 28A.2 Current commercial-flow task

The current Stream A objective is:

```text
Quotation approval
→ atomic internal billing-authority activation
→ invoice readiness
```

The first implementation authored:

```text
QUOTATION-APPROVAL-AUTO-ACTIVATE-INTERNAL-ABS-1
```

with migration:

```text
20260803090000_quotation_approval_internal_abs_activation.sql
```

The migration was not applied.

Verification then found:

- A stale pre-existing `BillingPanel` test expectation at HEAD, unrelated to the new task.
- A blocking grand-total mapping defect in the new migration for VAT-bearing quotation snapshots.
- Existing quotation discounts are supported by the quotation area but rejected by the current ABS contract.

The bounded correction currently running is:

```text
TASK: QUOTATION-APPROVAL-AUTO-ABS-TOTAL-CORRECTION-1
MODEL: Luna
REASONING: Extra High
MODE: IMPLEMENT_NO_STAGE
```

Owner boundaries for that correction:

- Correct canonical 0% and future VAT-aware total mapping.
- Do not enable VAT for G7 BLUE.
- Keep any non-zero discount fail-closed in current delivery.
- Do not implement full discount allocation, Change Orders, credit notes, refunds, user expansion, or accounting journals in that task.
- Do not apply SQL, stage, commit, or push until the result is reviewed and explicitly authorized.

### 28A.3 Synchronization rule

Stream A may finish the safe internal billing-authority foundation now.

Stream B owns the broader commercial and accounting expansion:

- Discount allocation through invoices and reports.
- Quotation family and revisions.
- Change Orders.
- Credit notes, refunds, customer credit, and corrections.
- Event revenue and profitability policy.
- User access and lifecycle expansion.

This split prevents current delivery from stopping while also preventing temporary implementation shortcuts from becoming the permanent accounting design.

---

## 28B. Dated Owner and Expansion Sync — 4 August 2026

This section supersedes Section 28A for current repository and expansion-direction context. It records owner decisions and current evidence; it does not itself authorize implementation.

### 28B.1 Repository and worktree state

```text
Authorized source worktree:
C:/Users/Mozfer/.grok/worktrees/g7-g7-crm/2026-07-13-360132e5

Source branch: main
Source HEAD/origin: a87ad6ddac5ec67f27284de3d1207f40d6bd232a
Source state: clean, divergence 0/0

Current isolated Goal worktree:
C:/Users/Mozfer/.grok/worktrees/g7-g7-crm/2026-08-04-v1-product-advancement-wave

Goal branch: goal/v1-product-advancement-wave-20260804
Goal changes: unstaged and uncommitted
```

### 28B.2 Current Goal evidence under owner review

The Goal worktree contains work for Customer 360, Reports Center, Dashboard, Search, and Supplier responsive presentation. The latest agent report claimed:

- 816/816 automated tests passed across 60 files.
- TypeScript passed.
- Build passed.
- Lint had zero errors and two existing PDF `<img>` warnings.
- No staging, commit, push, SQL, migration, dependency addition, or `.env` content access.
- Owner manual testing remains pending.

These are agent claims until repository commands and owner review are reconciled. The global Quick Finder may function technically, but the owner rejected it as a product direction.

### 28B.3 Approved next controlled wave

The next controlled Goal may combine the following because the boundary is now explicit:

#### Current-product remediation, not expansion

1. Remove the Global Quick Finder and `/search` workspace from the current Goal changes.
2. Preserve and improve module-local search for Customers, Services, Quotations, Invoices, Payments, and Suppliers.
3. Build or reuse one shared local-search input pattern with a non-overlapping clear button, correct LTR/RTL placement, keyboard support, and Arabic normalization.
4. Customer 360:
   - Add one authoritative Services view.
   - Remove the duplicate Related Services presentation.
   - Show Service number and title for Quotations and Invoices.
   - Link business identifiers to authoritative records.
   - Remove sentinel date output such as year 9999.
   - Improve operational and financial activity wording without inventing events or actors.
5. Supplier directory:
   - Present City, Coverage Area, and Country as separate bidi-safe information.
   - Remove the Rating column until a supplier-performance workflow exists.
6. Audit and polish the existing Service-scoped Supplier Allocations and Supplier Bookings UI without creating a standalone procurement module.
7. Apply the newly recorded design rules during implementation. Protected design-skill edits remain a separately controlled governance task unless the active repository governance explicitly authorizes a dedicated guard-edit phase.

#### First bounded expansion slice

8. Implement Supplier Rate Card Management V1 only:
   - Create.
   - Edit.
   - Activate/Deactivate.
   - `valid_from` and optional `valid_to` validation.
   - Application-layer overlap validation for the same Supplier, item, and unit.
   - Admin/Manager costing permission enforcement according to the current role model.
   - Internal-only presentation and audit-safe actions.

### 28B.4 Explicit exclusions

The next controlled wave must not add:

- Rate Card Delete/Restore.
- Automatic quotation pricing.
- Automatic Allocation creation.
- RFQ.
- Supplier Quotations.
- Quote Comparison or Award.
- Purchase Orders.
- Standalone Supplier Booking pages.
- Vendor Bills, Supplier Payments, payables, credits, advances, or deposits.
- Actual-cost posting, Event P&L, or margin.
- VAT, ZATCA, multi-company UI, or production rollout.

### 28B.5 Acceptance and delivery boundary

- Mozfer exclusively owns manual browser and visual acceptance.
- The agent may run automated tests and prepare a manual-test package but must not claim owner acceptance.
- Changes remain in the existing Goal worktree until owner review.
- Planned delivery after owner approval: remediation → controlled commit slicing → fast-forward merge to `main` → validation from `main` → push → temporary Goal worktree cleanup.
- This file must be updated again when Rate Card Management V1 becomes implemented, accepted, merged, or otherwise changes status.

### 28B.6 Owner manual acceptance matrix for the current Goal worktree

Mozfer owns the following 32 checks. The matrix is a handoff package only; it is not evidence of acceptance.

1. Sign in with an authorized role and confirm the dashboard opens.
2. Switch English/Arabic and confirm the shell, labels, and direction remain usable.
3. Search Customers by customer number, name, contact, phone, or email.
4. Search Services by service number, title, customer, or status.
5. Search Quotations by quotation number, Service number/title, or customer.
6. Search Invoices by invoice number, Service number/title, or customer.
7. Search Payments by payment number, invoice number, reference, or customer.
8. Search Suppliers by number, display/legal name, contact, phone, city, or coverage.
9. Confirm no Global Quick Finder appears in the Topbar.
10. Confirm `/search` and `/api/search` are no longer reachable as product surfaces.
11. Open a Customer Profile and verify the Overview view is the first Customer 360 view.
12. Open the Customer 360 Services view and follow a Service business-number link.
13. Confirm the old duplicate Related Services table is absent.
14. Confirm Customer 360 quotation rows show human Service number/title context.
15. Confirm Customer 360 invoice rows show human Service number/title context.
16. Confirm Customer 360 activity timestamps show meaningful dates.
17. Confirm Customer 360 never displays UUIDs or sentinel year-9999 dates.
18. Confirm Dashboard KPI and Quick Actions remain the first hierarchy.
19. Confirm Attention Needed appears before Operations Focus in Priority Work.
20. Confirm Priority Work remains balanced and readable at desktop and narrow widths.
21. Confirm the live workflow summary appears below Priority Work.
22. Confirm Recent Quotations remains lower and compact without losing links/status.
23. Confirm Supplier location presents City first, Coverage Area second, and Country separately.
24. Confirm Supplier Rating UI is absent while supplier records remain usable.
25. Confirm the Supplier directory cards/table remain usable at narrow widths.
26. Confirm a costing reader can view Rate Cards on Supplier Detail only.
27. Confirm only an authorized costing writer sees Rate Card management controls.
28. Create an inactive SAR Rate Card with valid dates and notes.
29. Edit its item, unit, cost, dates, and notes; confirm inactive saves remain valid.
30. Attempt an inclusive active overlap and confirm the safe business conflict message.
31. Activate/deactivate a Rate Card and confirm no Delete/Restore control exists.
32. Smoke Supplier Allocations and Supplier Bookings create/cancel paths for unchanged logic/security.

Known automated-review residual: overlap validation is intentionally application-layer only in V1; concurrent writes can still race until a future approved database constraint or serialized workflow is designed. No migration or SQL was added in this Goal.

### 28C. V1 Product-Advancement Wave — 4 August 2026

This dated block records the current owner-approved remediation wave in the exact Goal worktree. It is a handover record, not owner acceptance and not authorization for staging, commit, push, merge, SQL, migration, dependency, environment, or production work.

#### 28C.1 Exact task boundary and repository state

```text
TASK ID: V1-PRODUCT-ADVANCEMENT-WAVE-20260804
MODE: IMPLEMENT_NO_STAGE
AUTHORIZED WORKTREE: C:/Users/Mozfer/.grok/worktrees/g7-g7-crm/2026-08-04-v1-product-advancement-wave
BRANCH: goal/v1-product-advancement-wave-20260804
STARTING HEAD / BASE: a87ad6ddac5ec67f27284de3d1207f40d6bd232a
STARTING DIVERGENCE: 0/0
CURRENT REPOSITORY STATE: implementation changes remain unstaged and uncommitted
OWNER ACCEPTANCE: pending
```

The exact remediation scope is current-product usability and navigation only:

- Supplier Directory table and responsive cards: stable Invoices-benchmark density, phone alignment, City/Coverage Area/Country fallback, bidi-safe human text, preferred/status/actions, and no Rating presentation.
- Quotations toolbar and table: Invoices-benchmark structure, date filtering, server-backed result pagination, plain quotation numbers, and one explicit localized eye/View action for detail navigation.
- Module-local server search modes: Quotations `Quotation Number | Customer | Service`; Invoices `Invoice Number | Customer`; Services `Service Number | Service Name | Customer`. Customer and Payments search behavior remains outside this change; Suppliers retain their existing simpler search/filter contract.
- Detail-only First/Previous/Next/Last navigation for Customer, Service, Quotation, Invoice, and Supplier records, with Payment unchanged because no genuine standalone Payment detail route exists.
- Dashboard hierarchy: KPI/Quick Actions, Priority Work with Attention before Operations, workflow below, compact quotations lower, and natural-height cards without equal-height blank expansion.

The wave does not add a procurement or accounting module, global search, rate-card delete/restore, new financial lifecycle, database change, RLS/RPC change, migration, dependency, environment, secret, route-family expansion, or business-permission bypass. Existing permissions, lifecycle actions, soft-delete/restore behavior, list context, and server-side authority remain the controlling contracts.

#### 28C.2 Implementation status and evidence

```text
STATUS: IMPLEMENTED — OWNER ACCEPTANCE PENDING
AUTOMATED TESTS: PASS (verified in Goal worktree)
TYPECHECK: PASS (verified in Goal worktree)
LINT / TYPEGEN / BUILD: report only after the final validation pass
MANUAL BROWSER / VISUAL / RTL / ARABIC / MOBILE / WORKFLOW ACCEPTANCE: owner-owned and pending
STAGED / COMMITTED / PUSHED / MERGED: no
```

The automated evidence covers server permission gates, exact-count/range pagination, bounded sanitized search filters, mode/reset contracts, bidi-safe directory structure, explicit quotation eye navigation, record-navigation boundary behavior, return-list context, and Dashboard hierarchy markers. Automated evidence does not prove live database records, browser rendering, Arabic visual quality, RTL interaction, mobile behavior, or workflow acceptance.

#### 28C.3 Focused Mozfer manual checklist

1. Open Dashboard in an authorized role; confirm KPI/Quick Actions remain first, Priority Work shows Attention before Operations, workflow follows, and quotations remain lower without a blank equal-height void.
2. Switch English and Arabic on Dashboard, Supplier Directory, Quotations, Services, Invoices, and detail routes; check natural direction, numeric LTR isolation, keyboard focus, and no clipped controls.
3. On Supplier Directory, verify stable desktop columns are Supplier, Phone, Category, Type, Location, Status, Actions; confirm City first, Coverage Area second, Country fallback, and no Rating.
4. Resize Supplier Directory to narrow widths; confirm cards show supplier identity, phone, location, preferred/status state, and a clear View action.
5. Confirm Supplier search, status/category filters, pagination, deleted view, restore/delete controls, sensitive redaction, and role visibility remain unchanged.
6. On Quotations, search separately by Quotation Number, Customer, and Service; for Service confirm both Service number/title and one-to-many quotation results.
7. Change a Quotation search mode or search term while on a later page; confirm pagination resets to the first result and unrelated status/month filters persist.
8. Confirm Quotation numbers are plain text, the eye/View button is the only detail opener, print/PDF remains separate, and edit/delete permissions and lifecycle locks remain correct.
9. On Invoices, search separately by Invoice Number and Customer; confirm status filters, chooser permissions, preview, PDF, and pagination remain correct.
10. On Services, search separately by Service Number, Service Name, and Customer; confirm status filtering and Service-scoped links remain correct.
11. Open Customer, Service, Quotation, Invoice, and Supplier genuine detail pages from a filtered list; use First/Previous/Next/Last and confirm the filtered list context returns correctly.
12. Verify record navigation disables boundaries, preserves keyboard accessibility, remains usable in RTL/mobile widths, and never displays raw UUIDs as labels.
13. Confirm Payments remains the existing permission-guarded list with no invented standalone record-navigation surface.
14. Smoke the locked Customer Profile → Service → Quotation → Invoice → Payment path and confirm no owner-visible workflow or permission regression.

No owner acceptance, visual sign-off, live-data sign-off, Arabic/RTL/mobile sign-off, workflow sign-off, commit, push, merge, or production-readiness claim is made here.

OWNER MANUAL TEST: PENDING

---

### 28D. Current-Delivery Sync — 5 August 2026

This dated block records the current canonical delivery state and must not be confused with a new Event ERP expansion activation.

#### 28D.1 Controlled repository state

| Item | Verified position |
|---|---|
| Task | `G7-GOAL-2B-AND-2C-UNIFIED-WORKSPACE-TEMPORAL-REFINEMENT` |
| Mode | `IMPLEMENT_NO_STAGE` |
| Repository | `D:\G7\g7-crm` |
| Branch | `main` |
| Goal start HEAD | `5429e7642bd3d763809e0de453cc131f2c90921c` |
| Index | Empty; no staging authorized |
| Protected dirty files | `build-watch-20260716.log`, `build-watch-20260718.log`, `build-watch-20260722.log`, `build-watch-20260724.log` |
| Forbidden operations | No branch/worktree creation, fetch, pull, push, SQL, migration, schema, dependency, environment, secret, staging, commit, reset, restore, clean, or stash work |

#### 28D.2 Bounded current-product delivery

The authorized Goal refines existing product foundations only:

- Shared workspace continuity and localized Business Year context using the Riyadh calendar, with dated predicates on Services, Quotations, Invoices, Payments, Dashboard, and Reports.
- Server-side, permission-gated search and exact-count pagination for Customers, Suppliers, Services, Quotations, Invoices, and Payments; list result counts remain understandable on desktop and mobile.
- One clear search interaction per list, no duplicate Reset Filters action, localized pending feedback, and preserved filter/year/return context.
- Supplier cards and tables expose City, Coverage Area, Country, and Phone separately; natural content height and ordinary document-flow pagination replace artificial list-height pinning; Rating remains absent.
- Dashboard widgets use typed permission/sensitivity/scope metadata; financial activity sits in a lower recent-activity workspace rather than the Attention card.
- Customer 360 has one Services workspace, related Quotation/Invoice/Payment context with business identifiers, safe return navigation, and activity links without sentinel or unsupported destinations.
- Reports use issue/event/payment dates and invoice `issued_at` for the selected Business Year while retaining the existing optional date-range controls.

No new ERP domain, migration, RPC, schema, tax, procurement, supplier-payables, or accounting activation is authorized by this sync. Supplier Rate Card Management V1 remains governed by the previously recorded bounded expansion decision and is not broadened here.

#### 28D.3 Verification and acceptance boundary

The Goal leaves all implementation changes unstaged and uncommitted. Automated verification is required before handoff and must report exact commands and outcomes. Mozfer owns browser, English/Arabic, RTL, mobile, responsive, and visual acceptance; those checks remain pending until performed by the owner. No automated result may be represented as owner acceptance.

#### 28D.4 Exact next bounded action

Adversarial source review and repository validation are complete; hand Mozfer the unstaged diff with the exact owner manual acceptance matrix. Keep commit, merge, push, and any expansion activation as separate subsequent controlled tasks.

---

### 28E. Business Year Domain-Semantics Correction — 5 August 2026

This dated block supersedes only the Revision 0.4 Business Year scope and date-filter wording. It does not reopen the existing product, financial, permission, supplier, Customer 360, layout, or expansion decisions recorded elsewhere in this master.

#### 28E.1 Controlled repository state

| Item | Verified position |
|---|---|
| Task | `G7-CORRECTION-01-BUSINESS-YEAR-DOMAIN-SEMANTICS` |
| Mode | `IMPLEMENT_NO_STAGE` |
| Repository | `D:\G7\g7-crm` |
| Branch | `main` |
| Starting HEAD | `5429e7642bd3d763809e0de453cc131f2c90921c` |
| Index | Empty; implementation remains unstaged and uncommitted |
| Protected files | `build-watch-20260716.log`, `build-watch-20260718.log`, `build-watch-20260722.log`, `build-watch-20260724.log` |

#### 28E.2 Locked Business Year decision

- The selector is visible beside Locale only on the exact temporal list routes `/services`, `/quotations`, `/invoices`, `/payments`, and the applicable `/reports` workspace. It is hidden on `/dashboard`, Customers, Suppliers, Users, Settings, and all detail, create, edit, PDF, and preview routes.
- The selected year persists between temporal modules through the non-sensitive server-readable `g7_business_year` cookie. Temporal list entrypoints resolve the cookie only when the URL has no explicit year. Dashboard and master-data pages do not use the preference for their data predicates.
- Changing year resets pagination, removes incompatible date controls, preserves compatible search/mode/status filters, and removes empty query parameters. Invalid years fail closed to the current Riyadh year.
- Current Gregorian year is always available; historical options remain bounded and data-derived from existing dated records. Riyadh calendar boundaries govern the current-year resolution.
- Services use inclusive interval overlap: `event_start_date <= YYYY-12-31` and `effective_event_end_date >= YYYY-01-01`. A start-only Service uses its start as its effective end because the current Service detail/form behavior already treats it as a single scheduled date. Missing starts are excluded; reversed invalid intervals do not match. Cancelled Services remain discoverable because year filtering does not remove their status.
- Quotations use the authoritative `date` column, Invoices use authoritative `issued_at` semantics without inventing a `created_at` fallback for undated drafts, and Payments use the authoritative `date` column.
- Reports retain Business Year only for temporal Services, Quotations, Invoices, and Payments sections. Customer and Supplier master-data totals remain unscoped; supplier allocation/booking report operations do not receive the Business Year predicate. Existing optional explicit date controls remain intact.
- Dashboard visual composition and presentation are unchanged; only its Business Year predicates, metadata, and year-bearing links are removed. Customer search, Supplier presentation, Customer 360 presentation, responsive layouts, financial lifecycle rules, permissions, schema, SQL, dependencies, and environment configuration remain unchanged.

#### 28E.3 Verification boundary

Focused contract tests cover exact selector routes, cookie persistence wiring, pagination/filter reset behavior, Dashboard exclusion, Service overlap edge cases, missing-date handling, cancelled discovery, authoritative temporal columns, report scope, and preserved navigation/security contracts. Full tests, lint, route typegen, TypeScript, production build, and `git diff --check` remain required before handoff.

Mozfer owns browser, English/Arabic, RTL, mobile, responsive, workflow, and visual acceptance. No automated result is owner acceptance.

#### 28E.4 Exact next bounded action

Keep implementation unstaged and uncommitted, hand off the validated diff, and continue to the locked next product correction: Customers explicit-submit search behavior.

---

### 28F. Customers Explicit-Submit Search Correction — 5 August 2026

This dated block records the approved current-product Customers search correction. It supersedes only the Customers live-search interaction wording in the current-delivery sync; it preserves the Revision 0.5 Business Year decision in Section 28E and does not activate a new expansion domain.

#### 28F.1 Controlled repository state

| Item | Verified position |
|---|---|
| Task | `G7-CORRECTION-02-CUSTOMERS-EXPLICIT-SUBMIT-SEARCH` |
| Mode | `IMPLEMENT_NO_STAGE` |
| Repository | `D:\G7\g7-crm` |
| Branch | `main` |
| Starting HEAD | `5429e7642bd3d763809e0de453cc131f2c90921c` |
| Index | Empty; implementation remains unstaged and uncommitted |
| Protected files | `build-watch-20260716.log`, `build-watch-20260718.log`, `build-watch-20260722.log`, `build-watch-20260724.log` |
| Forbidden operations | No branch/worktree creation, fetch, pull, push, SQL, migration, schema, dependency, environment, secret, staging, commit, reset, restore, clean, or stash work |

#### 28F.2 Locked Customers search decision

- Customers uses direct general server search with no Search Mode selector. The existing authoritative predicate searches `customer_number`, `company`, `contact`, `phone`, and `email`; count and row queries use the same predicate, exact count, deterministic `customer_number` ordering, and bounded page range.
- The input draft is separate from the submitted `search` URL query. Typing, Backspace, and empty draft changes never navigate, search, replace rows, reset pagination, show pending feedback, start a route transition, or debounce. Search Button and Enter submit only; Enter during IME composition is ignored until composition ends.
- Submission uses the central sanitizer, preserves Arabic/English identifiers, phone, email, and punctuation, writes the canonical existing query parameter, resets page to 1, preserves compatible status/city/page-size context, and removes an empty query. A deliberate clear immediately returns to the unfiltered first page while retaining compatible non-search context.
- Back/Forward, bookmarked URLs, and Customer detail return navigation restore the submitted server result and draft without effect loops, hydration mismatch, or overwriting an actively typed draft during unrelated rerenders. Customers remains unscoped by Business Year.
- Search pending feedback is localized and only follows an actual submitted search transition. No global lightning/overlay is introduced, and no duplicate Reset Filters action is added.
- Suppliers, Services, Quotations, Invoices, Payments, Dashboard presentation, Business Year semantics, Customer 360 presentation, responsive layouts, permissions, financial lifecycle rules, schema, SQL, migrations, seeds, dependencies, and environment configuration remain unchanged by this correction.

#### 28F.3 Verification and acceptance boundary

Focused Customers, query/count, sanitizer, remote-list, workspace, localization, loading, and cross-module contract tests pass at 52/52. The full repository suite passes at 882/882 across 74 files; route typegen, standalone TypeScript, and production build pass; lint has 0 errors and the two pre-existing PDF `<img>` warnings; `git diff --check` has no whitespace errors and only the repository's CRLF warnings. Automated checks prove implementation contracts only. Mozfer owns browser, English/Arabic, RTL, mobile, responsive, workflow, and visual acceptance; owner acceptance remains pending.

#### 28F.4 Exact next bounded action

Keep all implementation changes unstaged, uncommitted, and unpushed; hand Mozfer the validated Customers correction with the explicit-submit manual acceptance matrix. The next locked product action is the Supplier dedicated product repair.

---

### 28G. Supplier Directory Desktop Product Repair - 5 August 2026

This dated block records the approved current-product Supplier Directory presentation repair. It is a bounded UI/product correction, not a new Event ERP expansion module, and it preserves the Revision 0.5 Business Year decision, the Revision 0.6 Customers decision, and the existing Supplier domain behavior.

#### 28G.1 Controlled repository state

| Item | Verified position |
|---|---|
| Task | `G7-CORRECTION-03-SUPPLIER-DIRECTORY-PRODUCT-REPAIR` |
| Mode | `IMPLEMENT_NO_STAGE` |
| Repository | `D:\G7\g7-crm` |
| Branch | `main` |
| Starting HEAD | `5429e7642bd3d763809e0de453cc131f2c90921c` |
| Index | Empty; implementation remains unstaged and uncommitted |
| Protected files | `build-watch-20260716.log`, `build-watch-20260718.log`, `build-watch-20260722.log`, `build-watch-20260724.log` |
| Forbidden operations | No branch/worktree creation, fetch, pull, push, SQL, migration, schema, dependency, environment, secret, staging, commit, reset, restore, clean, or stash work |

#### 28G.2 Locked Supplier Directory presentation decision

- The Supplier workspace uses natural content height. It does not use `h-full`, `min-h-0`, or `flex-1` to stretch the directory into an empty viewport-sized panel, and pagination follows the data without a bottom-anchored gap.
- The directory has one responsive semantic row surface: a stable native table at desktop widths and the same row data stacked into a readable narrow-width record surface. The data is not rendered twice as separate card and table datasets.
- The result count appears once. Bounded pagination owns the non-empty range count; the zero-result state uses one localized zero-count footer because the shared bounded footer intentionally hides itself for an empty total. No toolbar summary or duplicate Reset Filters action is added.
- Supplier identity remains primary: supplier name, supplier number, preferred status, status, phone, and an attached localized eye action remain visible without exposing Rating. The supplier number and phone remain structured LTR/bidi-isolated values.
- City, Coverage Area, and Country are separate labeled fields in the desktop table and the narrow stacked row surface. Stored text is not rewritten; only empty display values receive the existing presentation placeholder.
- Current/deleted switching, create visibility, status/category filters, direct general search, server-side count/range behavior, Supplier read/write/delete permissions, sensitive-field redaction, Supplier Allocations, Supplier Bookings, Rate Card behavior, and financial confidentiality remain unchanged.
- Dashboard, Customers, Business Year, Services, Quotations, Invoices, Payments, Reports, Customer 360, database schema, migrations, SQL, seeds, dependencies, environment configuration, and permission semantics remain outside this correction.

#### 28G.3 Verification and acceptance boundary

The implementation is supported by focused Supplier presentation, responsive, query/count, permission, Rate Card, search/filter, localization, bidi, loading, Customers, and Business Year contract tests. The focused Supplier/responsive/visual checks pass; the full repository suite passes at 883/883 across 74 files; route typegen, standalone TypeScript, and production build pass; lint has 0 errors and two pre-existing PDF `<img>` warnings; `git diff --check` has no whitespace errors and only the repository's CRLF warnings. Automated checks prove engineering contracts only. Mozfer owns browser, English/Arabic, RTL, mobile, responsive, workflow, and visual acceptance; owner acceptance remains pending.

#### 28G.4 Exact next bounded action

Keep all implementation changes unstaged, uncommitted, and unpushed; hand Mozfer the repaired Supplier Directory with the dedicated 30-item manual acceptance package. The next locked product action after Supplier owner acceptance is the Dashboard dedicated redesign.

---

### 28H. Dashboard Product Redesign and Supplier Acceptance Sync - 5 August 2026

This dated block records the owner-approved current-product Dashboard correction and the subsequent Supplier presentation acceptance decision. It preserves all historical evidence in Sections 28G and earlier; it does not activate a new Event ERP domain or final role-specific Dashboard product.

#### 28H.1 Controlled repository state

| Item | Verified position |
|---|---|
| Task | `G7-CORRECTION-04-DASHBOARD-PRODUCT-REDESIGN` |
| Mode | `IMPLEMENT_NO_STAGE` |
| Repository | `D:\G7\g7-crm` |
| Branch | `main` |
| Starting HEAD | `5429e7642bd3d763809e0de453cc131f2c90921c` |
| Index | Empty; implementation remains unstaged and uncommitted |
| Protected files | `build-watch-20260716.log`, `build-watch-20260718.log`, `build-watch-20260722.log`, `build-watch-20260724.log` |
| Forbidden operations | No branch/worktree creation, fetch, pull, push, SQL, migration, schema, dependency, environment, secret, staging, commit, reset, restore, clean, or stash work |

#### 28H.2 Locked Dashboard correction decision

- Dashboard is a professional desktop-first ERP command workspace for 1280/1366/1440/1600 widths. The page header contains the title/subtitle and compact permission-aware Quick Actions; the existing New Customer, New Quotation, New Invoice, and New Service destinations and write-permission checks remain unchanged, with at most one primary action.
- Business Snapshot contains the existing six KPI values in a three-column desktop grid and no Quick Actions card. Existing calculations and formatter behavior remain authoritative; monetary values and business identifiers use semantic LTR presentation without stored bidi controls.
- Priority Work is an explicit section with Attention Needed before Operations Focus and an approximately 5/7 desktop split. Attention contains the current outstanding-invoice logic only; Operations contains upcoming services and ready/in-progress counts.
- Operational Snapshot keeps Workflow and Recent Activity in one row. Recent Activity is one unified card with Recent Quotations and Recent Payments side-by-side at wide desktop widths and stacked at narrower widths. Recent Payments is recent activity, not an alert, and no orphan Recent Payments card remains.
- Cards use natural content height and ordinary document flow. No spacer card, decorative empty region, large fixed minimum height, absolute primary content, duplicate quotation list, tabs, new chart, trend, metric, or module is introduced.
- Existing server-authoritative permission gates and typed widget metadata remain the role-ready foundation. Unauthorized financial data is not fetched or serialized, Quick Action permission semantics remain unchanged, and no new role or permission code is added. Final role-specific Dashboards remain open/deferred.
- Dashboard remains unscoped by Business Year: no selector, year filter, or year URL propagation is introduced. Customers, Suppliers, Users, Settings, Reports, Customer 360, Rate Cards, financial lifecycle, schema, SQL, migrations, seeds, dependencies, and environment configuration remain outside this correction.
- English/Arabic dictionary parity, natural RTL mirroring, LTR amounts/IDs, independent unavailable/empty states, semantic headings, keyboard focus, loading-state behavior, and reduced-motion-compatible existing transitions remain required. Mozfer owns final Dashboard browser, visual, Arabic, RTL, and responsive acceptance.

#### 28H.3 Supplier presentation acceptance recorded

- Mozfer accepted the Supplier presentation boundary: English desktop, Arabic RTL desktop, natural height, a single result count, pagination placement, bidi-safe values, and attached row actions.
- Stored Supplier location data quality is deferred. No Supplier data-model change is authorized or implied.
- Supplier source, tests, behavior, permissions, search, Rate Cards, financial confidentiality, and the accepted presentation remain protected during the Dashboard correction.

#### 28H.4 Verification and acceptance boundary

Focused Dashboard and regression contracts pass 28/28 in the current focused run and cover the approved hierarchy, six-KPI truth, compact Quick Actions, priority ordering and split, unified activity subsections, payment classification, duplicate/orphan removal, permission metadata and safe loading, localization, LTR values, Business Year exclusion, and protected cross-module boundaries. The full repository suite passes 883/883 across 74 files; route typegen, standalone TypeScript, production build, and `git diff --check` pass; lint has 0 errors and two pre-existing PDF `<img>` warnings. Automated validation proves engineering contracts only. Runtime screenshot capture was not available in the controlled run, so no visual or owner acceptance is claimed for the Dashboard.

#### 28H.5 Exact next bounded action

Keep all implementation changes unstaged, uncommitted, and unpushed; hand Mozfer the repaired Dashboard with the manual review matrix. The next step is Mozfer Dashboard manual review. Final role Dashboards remain a later separately authorized product decision.

---

### 28I. Dashboard Independent-Column Flow Repair - 5 August 2026

This dated block records the bounded correction after Mozfer rejected the Revision 0.8 Dashboard presentation. It supersedes only the Dashboard composition and layout architecture in Section 28H; the approved Dashboard data, permission, Business Year, localization, Supplier, Customers, financial, and product-scope decisions remain unchanged.

#### 28I.1 Controlled repository state

| Item | Verified position |
|---|---|
| Task | `G7-CORRECTION-04B-DASHBOARD-INDEPENDENT-COLUMN-FLOW-REPAIR` |
| Mode | `IMPLEMENT_NO_STAGE` |
| Repository | `D:\G7\g7-crm` |
| Branch | `main` |
| Starting HEAD | `5429e7642bd3d763809e0de453cc131f2c90921c` |
| Index | Empty; implementation remains unstaged and uncommitted |
| Protected files | `build-watch-20260716.log`, `build-watch-20260718.log`, `build-watch-20260722.log`, `build-watch-20260724.log` |
| Forbidden operations | No branch/worktree creation, fetch, pull, push, SQL, migration, schema, dependency, environment, secret, staging, commit, reset, restore, clean, or stash work |

#### 28I.2 Locked independent-column architecture

- Header and Business Snapshot remain as accepted in Section 28H: compact permission-aware actions, six existing KPI values, and a three-column desktop KPI grid.
- After Business Snapshot, one Dashboard-only `dashboard-main-columns` container provides an independent approximately 5/12 left column and 7/12 right column. The columns are separate vertical flows with natural height; no shared row couples the next section to the tallest sibling card.
- The left column contains Priority Work with Attention Needed followed by Service Workflow. The right column contains Operations Focus followed by Recent Activity. Desktop ordering keeps Attention Needed before Operations Focus; mobile collapses to one column without page-level horizontal overflow.
- Recent Activity remains one unified card but its Recent Quotations and Recent Payments subsections stack vertically for readable customer names, amounts, statuses, payment identifiers, and mixed-direction content. Recent Payments remains activity, not an alert.
- The rejected row-coupled `Priority Work` and `Operational Snapshot` grid wrappers, their associated visual deserts, and the narrow horizontal Recent Activity split are removed. No fixed height, spacer, duplicate quotation list, new metric, chart, tab, module, role, permission code, or Business Year scope is introduced.

#### 28I.3 Protected boundaries

- Server-authoritative permission loading, typed Dashboard widget metadata, existing calculations, LTR amount/identifier presentation, EN/AR dictionary parity, loading states, reduced-motion-compatible existing transitions, Customers explicit-submit search, Supplier acceptance, Business Year semantics, Reports, Customer 360, Rate Cards, financial lifecycle, schema, SQL, migrations, seeds, dependencies, and environment configuration remain unchanged.
- Mozfer owns browser, visual, Arabic, RTL, mobile, workflow, and final product acceptance. The 04B implementation is not owner-accepted merely because automated contracts pass.

#### 28I.4 Verification and acceptance boundary

Focused Dashboard and regression contracts pass 28/28, including independent-column markers, left/right 5/12 and 7/12 flow, removal of the row-coupled Operational Snapshot wrapper, vertical Recent Activity subsections, permission/data-truth contracts, localization, Business Year exclusion, and protected Customers/Supplier boundaries. The full repository suite passes 883/883 across 74 files; route typegen, standalone TypeScript, production build, and `git diff --check` pass; lint has 0 errors and two pre-existing PDF `<img>` warnings. Automated validation proves engineering contracts only. No new runtime screenshot or owner acceptance is claimed for 04B.

#### 28I.5 Exact next bounded action

Keep all changes unstaged, uncommitted, and unpushed; hand Mozfer the independent-column Dashboard for manual review of 1280/1366/1440/1600, 1024, 768, and 402 widths, English/Arabic/RTL, natural column flow, and Recent Activity readability.

---

### 28J. Dashboard Final Density and Width Polish - 5 August 2026

This dated block records the bounded final presentation correction after Mozfer accepted the Revision 0.9 independent-column direction but identified three remaining Dashboard defects. It retains the Revision 0.9 architecture and changes only the Dashboard frame width, obsolete heading, and Attention preview density.

#### 28J.1 Controlled repository state

| Item | Verified position |
|---|---|
| Task | `G7-CORRECTION-04C-DASHBOARD-FINAL-DENSITY-AND-WIDTH-POLISH` |
| Mode | `IMPLEMENT_NO_STAGE` |
| Repository | `D:\G7\g7-crm` |
| Branch | `main` |
| Starting HEAD | `5429e7642bd3d763809e0de453cc131f2c90921c` |
| Index | Empty; implementation remains unstaged and uncommitted |
| Protected files | `build-watch-20260716.log`, `build-watch-20260718.log`, `build-watch-20260722.log`, `build-watch-20260724.log` |
| Forbidden operations | No branch/worktree creation, fetch, pull, push, SQL, migration, schema, dependency, environment, secret, staging, commit, reset, restore, clean, or stash work |

#### 28J.2 Locked final density correction

- Revision 0.9's accepted header, six-KPI 3x2 desktop grid, independent 5/12 and 7/12 columns, left/right section order, vertical Recent Activity, permission semantics, calculations, and Dashboard-wide Business Year exclusion remain unchanged.
- The shared Dashboard layout still provides the global `max-w-[1440px]` main frame with `md:p-6`; its source-derived inner maximum is 1392px. A Dashboard-only centered `data-dashboard-content-frame` now caps usable content at `max-w-[1240px]`, keeping the header, KPIs, and main columns aligned without changing global/list workspace widths or other modules.
- The obsolete visible `Priority Work` heading and its unused English/Arabic dictionary keys are removed. Business Snapshot and the Attention Needed, Service Workflow, Operations Focus, and Recent Activity card headings remain.
- Attention Needed retains the authoritative `balance_due > 0` calculation and existing invoice ordering, shows at most five rows, and displays the localized existing `View all` label only when more authorized actionable rows exist. The link uses the ordinary `/invoices` workspace because no single safe outstanding filter contract exists; no new query parameter, pagination, scrolling, or calculation is introduced.
- Supplier acceptance remains recorded and Supplier data cleanup remains deferred. Customers search, Business Year behavior, loading foundations, Services, Quotations, Invoices, Payments, Reports, Customer 360, Rate Cards, financial lifecycle, schema, SQL, migrations, dependencies, and environment configuration remain protected.

#### 28J.3 Verification and acceptance boundary

Focused Dashboard contracts pass 28/28 and cover the Dashboard-only 1240px frame, unchanged global 1440px main frame, removal of the obsolete heading and dictionary keys, maximum-five Attention preview, conditional localized View all behavior, accepted independent-column markers, vertical Recent Activity, permission/data-truth contracts, localization, and Business Year exclusion. Protected-module and foundation regressions pass 89/89; the full repository suite passes 883/883 across 74 files; route typegen, standalone TypeScript, production build, and `git diff --check` pass; lint has 0 errors and the same two pre-existing PDF `<img>` warnings. Automated validation proves engineering contracts only; Dashboard owner acceptance remains pending.

#### 28J.4 Exact next bounded action

Keep all changes unstaged, uncommitted, and unpushed; hand Mozfer the final Dashboard for manual English/Arabic desktop review at 1366/1440/1600 widths, confirmation that Priority Work is absent, five-row Attention density and View all behavior, independent columns, vertical Recent Activity, no Dashboard year selector, and Supplier/Customers regression review.

---

### 28K. Owner Acceptance and Local Goal 2B/2C Closeout — 5 August 2026

This dated block is the current acceptance record for Goal 2B/2C. It supersedes earlier pending wording for these owner decisions while preserving the historical evidence in Sections 28D through 28J.

#### 28K.1 Dashboard owner acceptance

Accepted by Mozfer:

- English desktop.
- Arabic RTL desktop.
- Dashboard-only wider frame.
- Six KPI cards.
- Compact Quick Actions.
- Independent left and right column flow.
- Attention Needed followed by Service Workflow.
- Operations Focus followed by Recent Activity.
- Recent Quotations followed vertically by Recent Payments.
- Maximum five Attention rows.
- Localized View all when more actionable invoices exist.
- Obsolete Priority Work heading removed.
- Dashboard remains outside Business Year scope.

#### 28K.2 Supplier Directory owner acceptance

Accepted by Mozfer:

- English desktop.
- Arabic RTL desktop.
- Natural content height.
- Stable table structure.
- Single result count.
- Pagination below content.
- Bidi-safe identifiers and actions.
- Separate City, Coverage, and Country presentation.
- Rating hidden.

Deferred:

- Existing supplier City/Country stored-data cleanup.
- Future City/Country master-data controls.

#### 28K.3 Customers search owner acceptance

Accepted by Mozfer:

- Direct general search.
- Draft typing does not submit.
- Search button submits.
- Enter submits.
- IME composition is protected.
- Submitted query is represented in the URL.
- Browser Back and Forward synchronize correctly.
- Deliberate clear behavior.

#### 28K.4 Business Year owner acceptance

Accepted by Mozfer:

- Visible only on temporal list workspaces.
- Hidden on Dashboard, Customers, Suppliers, Users, and Settings.
- Hidden on detail, create, and edit routes.
- Persists across supported temporal workspaces.
- Services use inclusive date-range overlap.
- Start-only Services preserve the existing single-date domain behavior.
- Quotations use authoritative quotation date.
- Invoices use `issued_at` with the existing safe draft fallback.
- Payments use payment date.
- Dashboard remains unscoped.

#### 28K.5 Explicit pending acceptance

- Reports implementation: technically validated, owner product/visual acceptance pending.
- Customer 360 implementation: technically validated, owner product/visual acceptance pending.
- Responsive/mobile is not part of the current owner acceptance gate unless a severe regression is identified.
- Final role-specific Dashboard compositions are deferred.

#### 28K.6 Closeout boundary

Goal 2B/2C remains current-product remediation, not a new Event ERP expansion activation. The approved local commit series is separate from merge, push, and Open Code Review. No remote write or OCR execution is authorized by this acceptance record.

---

## 28L. Two-Layer Expansion Architecture Sync — 7 August 2026

This dated sync records Mozfer's owner clarification and controller reconciliation after the remediation campaign and G1 work had already begun.

### 28L.1 Owner clarification

The expansion program has two intended product layers:

1. **Layer 1:** expand the single-company G7 BLUE system into the complete internal Event ERP described by this Master, then use it on real G7 BLUE work.
2. **Layer 2:** only after the system proves useful and reliable inside G7 BLUE, productize it as SaaS for other event companies.

### 28L.2 Controller interpretation

- Current Goal 2A/2B/2C delivery and G1-G12 remediation remain current-product foundation, not Layer 1 activation by themselves.
- Phase 0 evidence/blueprints prepare Layer 1 and may overlap controlled discovery where authorized.
- Phases 1-8 are Layer 1 internal ERP expansion for G7 BLUE.
- A real-use internal proof gate separates Layer 1 from Layer 2.
- The Wave 9 future concerns `W9-SAAS-001`, `W9-SAAS-002`, and `W9-MIG-001` are mandatory Layer 2 pre-activation gates, not reasons to implement multi-company now.
- D43 remains in force: this file stays the sole Expansion Master. Revision 0.12 organizes it internally rather than splitting it into competing master files.

### 28L.3 Implementation boundary

This architecture sync is a product/document decision only. It does not authorize code, schema, migration application, staging, commit, merge, push, G2, or any new expansion module while the current remediation controller has not separately authorized that action.

---

## 28M. Post-G1 Commercial and Tender Source-of-Truth Sync — 9 August 2026

### 28M.1 Current Post-G1 state

- G1 Financial Lifecycle Authority is closed.
- Cleanup & Rebaseline, DEV/DEMO Data Hygiene, and UX/Loading Stabilization are closed.
- Customer Document Architecture Correction is closed and pushed at `93d3f132b3ff756f4c49904da8622e40babdaa18`.
- One quotation or invoice remains one canonical business document with selectable Arabic and English representations; no permanent `document_locale` authority exists.
- The Quotation Commercial Model Impact Check is complete as read-only analysis with a `PARTIAL` disposition. No schema, migration, implementation, or financial-authority change was performed.
- **Historical 9 August state only:** at this checkpoint G2 remained blocked until the then-current Post-G1 field-evidence gate. This must not be used to infer G2 or later Goal status after 9 August.

### 28M.2 Field-validation-dependent commercial model hypothesis

The leading hypothesis is one flexible quotation builder that can support itemized, grouped-itemized, package, and mixed package-plus-item quotations:

- **Commercial Group:** organizational/customer-facing section with no independent financial authority.
- **Package:** priced commercial authority line that may contain included scope.
- **Item:** independently priced commercial line.
- **Included Component:** contractual/package scope without independent customer price.

This is a product hypothesis, not a final table design. Zainab field discovery must establish actual G7/event-company practice through real examples and documents before permanent hierarchy, discount, approval, snapshot, or bilingual-field placement is locked.

### 28M.3 Tender/Bid Management future module

Tender/Bid Management is a future expansion module. Discovery begins now; implementation is deferred. The target business chain is:

```text
Opportunity / Tender
-> RFP / Tender Booklet / Kurrasah
-> Requirements
-> Bid / No-Bid
-> Technical Proposal
-> Financial Proposal / BOQ
-> Compliance / Requirements Matrix
-> Supporting Documents
-> Internal Approvals
-> Submission Package
-> Submission
-> Award / Loss
-> Contract
-> Event / Project
-> Execution
-> Invoice / Payment / Accounting
```

Tender must remain distinct from the Direct Customer flow:

```text
Inquiry -> Event Brief -> Quotation -> Approval -> Deposit -> Event Execution -> Final Invoice -> Payment
```

Future Financial Proposal may reuse shared commercial primitives, but Tender must not be forced into the current Quotation entity.

### 28M.4 Future Technical Proposal authoring

The long-term target is in-system preparation, authoring, and assembly of Technical Proposals. Candidate sections include scope understanding, event concept, methodology, execution plan, timeline, team/responsibilities, technical specifications, logistics/installation, safety/crowd/risk planning, quality control, previous experience, requirement compliance, visuals, and supporting attachments. Trusted company profile, project history, team, service/equipment scope, standard methods, and approved reusable content may be reused only through controlled source and approval rules.

### 28M.5 Future Financial Proposal and BOQ authority

Financial Proposal/BOQ must not become a separate financial universe. The future direction is:

```text
Supplier Cost
+ Internal Cost
+ Risk / Overhead logic
+ Margin
-> Selling Price
-> Quotation / Financial Proposal / BOQ
-> Contract
-> Invoice
-> Payment
-> Accounting
-> Project Profitability
```

This records a design principle only. Supplier costing, BOQ, accounting, and profitability implementation remain separately deferred and require field/accountant validation.

### 28M.6 Future AI tender assistance

Future AI may assist tender-document requirement extraction, deadline/eligibility detection, compliance-matrix drafting, missing-requirement detection, proposal-draft assistance, and approved reusable-content suggestions. AI content is untrusted draft assistance and follows:

```text
AI Draft -> Human Review -> Explicit Approval -> Official Proposal
```

AI must not autonomously create contractual submission content, approve a bid, change financial authority, write to the database, or submit a proposal.

### 28M.7 Implementation timing

- **Current core:** Quotation Commercial Model.
- **Discover now / implement after field validation:** quotation hierarchy and bilingual commercial-content schema.
- **Discover now / build later:** Tender/Bid Management.
- **Later specialist validation:** accounting expansion with an event-company accountant.
- **Later:** multi-company SaaS after the internal proof gates.
- **Historical 9 August note:** G2 was blocked at this checkpoint; later Goal status belongs to newer controller/repository evidence.

No feature, schema, migration, database, AI, Tender, accounting, or G2 implementation is authorized by Section 28M.

---


## 29. Parallel Workstream Continuity

The expansion discussion must not stop current work.

### Stream A - Current Delivery

Continue approved tasks such as:

- Financial correction and safety.
- Existing workflow completion.
- Permission and security hardening.
- Real defects.
- Current V1 usability.
- Controlled repository work under existing governance.

### Stream B - Expansion Discovery and Explicitly Approved Bounded Delivery
This stream may prepare Layer 1 evidence/design and preserve Layer 2 seams, but it must not activate broad Layer 1 modules or Layer 2 SaaS without separate authorization.


Continue:

- Decision documentation.
- Field interviews.
- Workflow examples.
- Document samples.
- Domain Map.
- Accounting and permission blueprint.
- Information architecture.
- Design system.
- Roadmap rebaseline.
- Rate Card V1 implementation is committed through `9115d3e`; owner acceptance and G9 remediation remain separate controlled follow-up tasks.

Rate Card V1 implementation is committed through `9115d3e`; owner acceptance remains pending and G9 remediation remains open. This report does not authorize any other expansion module.

---

## 30. Open Decisions and Pending Evidence

### 30.1 Supplier operations

- How supplier quotes are normally requested in Riyadh.
- PDF, image, Excel, email, or WhatsApp patterns.
- Typical number of competing quotes.
- Who selects and approves suppliers.
- Common advance percentages.
- Common Credit Days and Credit Limits.
- When suppliers issue invoices.
- Who provides delivery, unloading, installation, operators, and teardown.
- How service acceptance is recorded.
- What happens when supplier scope fails.
- Typical refundable deposits and return timing.
- Future DB-level or transactional Rate Card overlap enforcement after the bounded application-layer V1.
- Rate Card Delete/Restore lifecycle and historical-reference policy.
- Whether future Supplier performance should produce a Rating, and who may submit or approve it.

### 30.2 Event operations

- Customer versus G7 venue responsibility.
- Mandatory Event Brief fields.
- When Site Visit is mandatory.
- Common event types.
- Permit responsibilities.
- Crew and labour sourcing.
- Setup and teardown controls.
- Common incidents and failure points.
- Whether G7 BLUE owns enough reusable equipment, vehicles, or other resources to require internal availability, reservation, check-out/in, maintenance, damage, or asset-history workflows; otherwise keep the operating model supplier-heavy.

### 30.3 Expenses and finance

- Approval thresholds.
- Missing receipt policy.
- Petty cash custodians and settlement.
- Recurring expense requirements.
- Budget controls.
- Revenue-recognition policy.
- Overhead allocation policy.
- Event financial-close rule.
- Late supplier invoice handling.
- Bank-reconciliation method.
- Final `Collected Cash` period definition, including reversal/refund treatment.
- Current Outstanding versus historical Outstanding-as-of-period-end calculation and presentation.
- Customer payment-term templates, due-date rules, ageing buckets, credit limits/exposure, overdue thresholds, holds, and override authority.

### 30.4 Product and platform

- Final roles.
- Role versus assignment scope.
- Dashboard widgets.
- Mobile dashboard behavior.
- AI extraction limits and budget.
- Expansion feature after Supplier Rate Card Management V1.
- Multi-company migration model.
- Future VAT/ZATCA activation plan.

### 30.5 Customer commercial and accounting lifecycle

- Discount type and level.
- Discount approval thresholds.
- Discount allocation and rounding across deposit, partial, and final invoices.
- Exact boundary at which an invoice becomes issued and immutable.
- Quotation family, revision, and supersession rules before financial exposure.
- Change Order states, numbering, approvers, and customer acceptance evidence.
- Additional-invoice versus debit-adjustment rules.
- Credit-note and refund workflow.
- Customer credit-balance policy and expiry.
- Treatment of partially delivered or cancelled events.
- Customer commercial authorization evidence by path and risk: approved quotation evidence, customer PO/reference, contract, award letter, Tender award, or other accepted proof.
- Whether payment terms/credit policy is set at customer, quotation/contract, invoice, or a controlled combination with immutable invoice snapshots.
- Revenue recognition and event-close/reopen policy.
- Required Saudi accounting terminology before VAT activation.

### 30.6 User access and lifecycle

- Effective-permission precedence for role defaults, explicit grants, and explicit denials.
- Permission refresh and session revocation behavior.
- Invitation expiry and resend policy.
- Whether work-email domains are recommended or enforced.
- Scheduled versus manual reactivation after leave.
- Former-employee display and actor snapshots.
- User-activity retention and export rules.
- Whether separate preparer/approver is disabled by default for all new companies.
- Future Google Workspace, Microsoft, or SAML SSO timing.

### 30.7 Quotation commercial model and Tender evidence

- Real frequency and shape of itemized, package, mixed, and grouped quotations.
- Whether package components are contractual/customer-visible and how quantities are shown.
- Discount and commercial-approval behavior across quotation/package/item levels.
- Supplier cost and commitment evidence used before customer selling price is approved.
- Change behavior after client approval.
- Tender opportunity sources, including Etimad, direct invitation, and other channels.
- Who reviews the kurrasah, decides bid/no-bid, authors Technical Proposal, prepares Financial Proposal/BOQ, and approves submission.
- Requirement, compliance, clarification/addenda, version, supporting-document, deadline, submission, award/loss, and post-award handoff practice.
- Bid/performance guarantee or other security requirements where applicable: trigger, amount source, issuing party, validity/expiry, extension, release/forfeiture, fees, responsible owner, and post-award handoff/accounting treatment.

---

## 31. Wednesday Industry Interview Plan

### 31.1 Purpose

The interview is not a sales pitch or a demonstration of every system idea. Its purpose is to obtain real operational evidence from an experienced Riyadh project manager.

### 31.2 Opening script

> I am building an internal system for an events company. We already have customers, Services, quotations, invoices, payments, and a supplier foundation. I want to understand the real workflow used by event companies in Riyadh, especially suppliers, cost, operations, and financial close, so that we do not design the system from assumptions. I am not asking for confidential information; I want to understand the practical process and repeated problems.

Then ask:

> Could you walk me through one real event from the first customer request until the event was financially closed?

### 31.3 Conversation method

Use this loop:

```text
Ask
→ Listen
→ Summarise your understanding
→ Confirm
→ Ask for a real example
→ Move to the next stage
```

Useful follow-ups:

- “Can you give me a real example?”
- “Does this always happen, or does it depend on the event or supplier?”
- “Who makes that decision?”
- “What document proves that step?”
- “What happens when it goes wrong?”

### 31.4 Personal communication control

Mozfer is highly curious and may speak quickly when excited about a system. To preserve clarity:

- Keep the question list visible.
- Ask one question at a time.
- Let the interviewee finish.
- Write keywords, not full paragraphs, while she speaks.
- Summarise before introducing the system idea.
- Spend approximately 70% of the meeting listening and 30% explaining.
- Do not try to cover all 144 questions if time is limited.

### 31.5 Zainab commercial and Tender evidence track

Use real past events and anonymised documents where permitted rather than asking only theoretical questions. Establish:

- itemized, package, package-inclusion, mixed-price, grouping, detail-level, discount, approval, supplier-commitment, and post-client-approval change practice;
- Tender opportunity origin, document receipt/review, kurrasah analysis, bid/no-bid, Technical Proposal, Financial Proposal/BOQ, supplier-cost collection, internal approvals, supporting documents, clarifications/addenda, version management, submission, award/loss, and Contract/Event handoff;
- which steps vary by customer, tender authority, event type, value, and delivery risk;
- which documents prove each decision and which roles create, review, approve, submit, and own the post-award handoff;
- where applicable, how bid/performance guarantees or other Tender securities are requested, approved, issued, extended, released, forfeited, and accounted for;
- what customer PO, contract, award letter, or other evidence actually authorizes G7 BLUE to start work or issue billing;
- how customer payment terms, credit days/limits, late payment, partial payment, and collection escalation work in real event-company practice;
- whether G7 BLUE owns enough equipment/resources to justify internal asset/resource scheduling or remains primarily supplier-rental driven.

---

## 32. Minimum Value Required from the Interview

The interview should ideally produce:

1. One real end-to-end workflow from customer inquiry to financial close.
2. One normal event example.
3. One event with a major change.
4. One event with supplier failure, loss, or emergency.
5. The real supplier quotation and selection process.
6. Common advance, credit, invoice, and payment patterns.
7. Supplier scope boundaries for transport, installation, operators, and teardown.
8. Service receipt or acceptance practice.
9. Venue and Site Visit practice.
10. Permit and insurance practice.
11. Daily labour and meals practice.
12. Expense and petty-cash practice.
13. Event cost and profitability practice.
14. The five most repeated operational or financial problems.
15. Role ownership: who requests, compares, approves, receives, reviews, pays, and closes.
16. A list of real documents used.
17. Permission to obtain anonymised samples where possible.
18. One real itemized quotation and one package or mixed quotation example where available.
19. One real tender journey from opportunity receipt to award/loss or submission outcome.
20. The Technical Proposal, Financial Proposal/BOQ, compliance, approval, and submission ownership map.
21. The repeated tender problems that the future module must solve.
22. Real customer billing/payment terms, due-date, partial-payment, overdue, credit-limit/exposure, and collection-escalation practice.
23. The evidence that authorizes work and billing for direct customers versus Tender/contract customers.
24. Tender guarantee/security practice where applicable, including validity, extension, release/forfeiture, and fees.
25. A clear owned-versus-rented equipment/resource picture so the product does not invent an unnecessary inventory/asset subsystem.

---

## 33. Documents to Request as Anonymised Samples

Only with clear permission and removal of confidential data:

- Event Brief.
- Customer itemized quotation.
- Customer package or mixed quotation.
- Tender notice or invitation.
- Tender booklet / RFP / kurrasah.
- Technical Proposal.
- Financial Proposal / BOQ.
- Compliance or requirements matrix.
- Tender submission checklist or package index.
- Bid/performance guarantee or security request/record where applicable.
- Customer Purchase Order, contract, award letter, or other commercial authorization evidence where permitted.
- Customer statement, ageing report, payment-term example, or collection follow-up example where permitted.
- Owned equipment/resource list or scheduling sheet only if G7 BLUE actually manages owned resources.
- Venue quotation.
- Supplier quotation.
- Quote comparison sheet.
- Purchase Order.
- Supplier contract.
- Vendor Bill.
- Advance request or receipt.
- Service acceptance checklist.
- Site Visit checklist.
- Permit checklist.
- Incident Report.
- Cost sheet.
- Event profitability report.
- Petty-cash settlement.

No document should be photographed or copied without consent.

---

## 34. Risk Register

| Risk | Product impact | Control |
|---|---|---|
| Building from assumptions | Wrong workflows and rework | Use Wednesday interview and real documents before locking workflows. |
| Locking quotation hierarchy before field evidence | Wrong package, inclusion, discount, approval, or bilingual-content authority | Treat Group/Package/Item/Included Component as a hypothesis until Zainab evidence and controller design lock. |
| Forcing Tender into current Quotation | Tender requirements, compliance, approvals, versions, and submission controls become distorted | Preserve Tender as a future independent workflow while deliberately reusing approved commercial primitives. |
| AI draft becomes contractual content | Unreviewed or injected content could enter an official submission | Require human review and explicit approval before official proposal use; no autonomous submission or financial authority. |
| Trying to build the entire ERP at once | Long delay before value | Phase the product and launch bounded modules. |
| Accounting added after operational tables | Duplicate financial truth | Approve accounting blueprint before major financial modules. |
| Hard-coded single-company behavior | Difficult Layer 2 migration if assumptions spread everywhere | Preserve bounded settings, numbering, authorization, snapshot, and Service-centered seams now; add explicit company ownership during approved Layer 2 design rather than prematurely adding tenant fields everywhere. |
| Premature multi-company UI | Unnecessary current complexity | Keep readiness internal; activate later. |
| Premature VAT/ZATCA claims | Compliance and trust risk | Keep tax inactive until approved compliance project. |
| AI extraction errors | Wrong amounts and approvals | Preserve source, display confidence, require human confirmation. |
| Service page overload | Poor usability and performance | Move major domains into dedicated workspaces. |
| Role leakage | Sensitive cost and margin exposure | Permission-safe queries, server checks, RLS, and masked fields. |
| Uncontrolled financial edits | Audit and accounting failure | Lifecycle corrections, immutable history, and period close. |
| Different profit formulas across pages | Management confusion | One cost and accounting source of truth. |
| Mixing invoice, payment, receivable, and revenue time semantics | Historical reports change meaning after later payments; management sees false cash or revenue | Keep Billed, Collected Cash, Outstanding, and Revenue Recognition separate and define each period basis explicitly. |
| Undefined customer payment terms and credit control | Ageing, overdue, collections, and future credit decisions become inconsistent | Define due-date/payment-term/credit policy before automating customer credit or collection holds. |
| Missing customer authorization evidence | Work or billing may proceed without durable proof of the customer's commercial commitment | Preserve a flexible evidence concept and validate required proof by customer/Tender path and risk. |
| Tender guarantees omitted from the future domain | Bid security, expiry, fees, release, or forfeiture can fall outside operational and financial control | Discover guarantee/security practice where applicable before locking Tender workflow or accounting. |
| Premature owned-resource/inventory module | Large complexity with little value if G7 BLUE remains supplier-heavy | Decide owned-versus-rented resource boundary from real asset and scheduling evidence before building warehouse/asset operations. |
| Building UI before design system | Repeated redesign loops | Create ERP design contract and templates first. |

---

## 35. Expansion-Side Next Steps and Evidence Queue
These items govern expansion discovery/planning only. Current implementation/remediation execution order is controlled by the latest controller handover, `docs/project-status.md`, `docs/project-roadmap.md`, and verified repository evidence. Do not use this section to bypass an active remediation Goal.

1. Use Revision 0.14 of this file as the sole authoritative expansion reference; do not create a competing master handover.
2. Keep the current G1-G12 remediation program separate from Layer 1 activation. Finish the required current-product safety/reliability gates before allowing broad new ERP scope to overtake them.
3. Keep Supplier Rate Card Management V1 classified as the bounded early expansion slice: implemented/committed, owner acceptance pending, G9 remediation open; do not treat it as activation of procurement, supplier accounting, Actual Cost, or Margin.
4. Complete or refresh Phase 0 evidence before locking major Layer 1 workflows: event-industry interviews, real-document sampling where permitted, Domain Map, Sidebar Map, permission blueprint, and design baseline.
5. Review and approve the accounting and ownership blueprint with qualified event-company accounting input before major financial Layer 1 modules are locked.
6. Reconcile open commercial rules such as quotation revisions, discounts, Change Orders, credits, refunds, customer credit, revenue recognition, event close/reopen, supplier cost authority, and approval boundaries before their dependent modules are implemented.
7. Define the **Internal Proof Gate** criteria from real G7 BLUE usage before Layer 2 planning becomes executable. Do not invent numeric proof thresholds prematurely.
8. Before activating a second company or SaaS tenant, explicitly resolve and verify `W9-SAAS-001`, `W9-SAAS-002`, and `W9-MIG-001`, including ownership, membership/isolation, numbering, historical backfill, audit attribution, export/retention/deletion, migration rehearsal, reconciliation, and rollback.
9. Any owner proposal that changes the expansion direction must be assessed for business value, dependencies, current-product impact, and long-term product consequences before it becomes a locked decision or implementation task.
10. Any item promoted from deferred/open to approved scope must update this Master before or alongside the separately authorized implementation task.
11. Complete Zainab quotation-commercial field discovery before locking Group/Package/Item/Included Component hierarchy or bilingual schema placement.
12. Begin Tender/Bid discovery now through real workflows and anonymised documents where permitted, but do not implement Tender, Technical Proposal, Financial Proposal/BOQ, AI assistance, or submission workflow without a separate approved blueprint and task.
13. Carry the Reporting Truth Contract into current reporting remediation: preserve the locked invoice-status, invoice-period, and customer-activity semantics; obtain explicit owner lock before promoting the recommended Collected Cash and historical-outstanding contracts where still open.
14. Add customer billing/payment terms, due dates, receivable ageing, credit-control/exposure, and commercial authorization evidence to Phase 0 field/accountant discovery before building broad Accounts Receivable automation.
15. Expand Tender discovery to guarantees/securities where applicable, but do not assume universal percentages, forms, or mandatory behavior without governing tender evidence.
16. Resolve the owned-versus-rented resource boundary before adding inventory, warehouse, asset, maintenance, or vehicle-scheduling scope.

---


# Appendix A - Accounting and Procurement Glossary

| Term | Plain meaning |
|---|---|
| Accounts Payable | Money G7 BLUE owes suppliers or other payees. |
| Accounts Receivable | Money customers owe G7 BLUE. |
| Billing Schedule | The approved timing or milestones that determine when customer invoices may be issued; separate from when an issued invoice becomes due. |
| Actual Cost | Accepted cost supported by bills, direct expenses, labour, or adjustments. |
| Advance | Money paid before final invoice settlement. |
| Balance Sheet | What the company owns, owes, and the owner's remaining interest at a date. |
| Bank Reconciliation | Comparing system transactions with the real bank statement. |
| Cash Flow | How cash entered and left the company. |
| Chart of Accounts | The structured list of all accounting accounts. |
| Committed Cost | Amount formally agreed through an approved PO, contract, or equivalent. |
| Change Order | An approved commercial change that adds, removes, or changes scope after the original quotation was approved. |
| Credit Note | A document reducing a previously billed amount. |
| Customer Credit Balance | Value owed to a customer and retained for an approved future settlement instead of an immediate refund; not the same as allowing the customer to pay later. |
| Customer Credit Limit / Exposure | A future credit-control boundary describing how much receivable risk the company permits for a customer before warning, hold, or authorized override. Exact policy remains open. |
| Customer Commercial Authorization Evidence | Recorded proof that the customer authorized work or billing, such as approved quotation evidence, customer PO, contract, award letter, Tender award, or another approved source. |
| Commercial Discount | An approved reduction from the gross customer price that reduces net commercial revenue. |
| Direct Event Expense | A real expense caused by one Service. |
| Double-entry | Accounting where every entry has equal debit and credit totals. |
| Estimated Cost | Expected cost before formal commitment. |
| Event Margin | Event revenue less direct event cost. |
| General Ledger | Transactions grouped by accounting account. |
| Invoice Due Date | The date an issued customer invoice becomes payable according to the approved payment terms. |
| Gross Profit | Total event revenue less total direct event cost. |
| Incident Report | Evidence and workflow record for an operational incident. |
| Internal Billing Authority | The hidden approved commercial snapshot that controls what may be invoiced for a Service. |
| Journal Entry | Accounting entry generated by a financial event. |
| Net Profit | Gross Profit less company overhead and other expenses. |
| Outstanding Cost | Accepted cost not yet paid. |
| Paid Cost | Amount already settled. |
| Payment Terms | The agreed rule that determines when and how an issued invoice is due, such as immediate, fixed date, approved credit days, or instalments. |
| Petty Cash | Controlled cash for small and urgent expenses. |
| Profit and Loss | Revenue, expenses, and profit over a period. |
| Quotation Revision | An immutable version inside one quotation family, used to preserve prior approved commercial history. |
| Purchase Order | G7 BLUE's formal approved order to a supplier. |
| Refund | Money returned to a customer or supplier settlement counterparty through a recorded financial action. |
| Refundable Deposit | Security money expected to be returned. |
| RFQ | Request for Quotation sent by G7 BLUE to a supplier. |
| Service Receipt | Evidence that supplier work or equipment was delivered and accepted. |
| Supplier Booking | Operational reservation of supplier capacity or date. |
| Supplier Quotation | Supplier's offered scope, price, and terms. |
| Tender Guarantee / Security | A bid, performance, or other security required by a specific Tender or contract where applicable; exact type, amount, validity, release, and accounting treatment come from governing evidence. |
| Trial Balance | Account-balance report used to verify debit/credit equality. |
| Vendor Bill | Supplier invoice sent to G7 BLUE. |

<!--PAGEBREAK-->

# Appendix B - Full Wednesday Interview Question Bank

## B1. Event journey

1. How does the customer request normally arrive?
2. Who receives it?
3. When does it become a real Service or event project?
4. What information is collected first?
5. Who prepares the initial budget?
6. Is there a standard Event Brief?
7. Does the workflow change by event type?
8. What stages does an event normally pass through?
9. When is an event considered approved?
10. When is ownership handed from sales to operations?

## B2. Venue and Site Visit

11. Does the customer normally provide the venue, or does the organiser find it?
12. Where do you search for venues?
13. How do you compare venue options?
14. Is a Site Visit mandatory?
15. Who attends the Site Visit?
16. What are the most important things checked?
17. How are conditions and problems recorded?
18. Who approves venue suitability?
19. Does the venue request a cash deposit?
20. How long does venue-deposit return usually take?

## B3. Suppliers

21. What supplier categories are essential in your work?
22. How do you find new suppliers?
23. Do you maintain an approved supplier list?
24. What information do you keep for every supplier?
25. Do suppliers serve one city or several cities?
26. Do you use preferred suppliers?
27. When do you stop working with a supplier?
28. Do you request licences, insurance, or compliance documents?
29. Are suppliers always companies, or may they be individuals?
30. How do you evaluate supplier performance after the event?

## B4. Requests and supplier quotations

31. Do you send a formal RFQ?
32. What information is included in the request?
33. Do all suppliers receive the same scope?
34. Do quotations arrive as PDF, image, Excel, email, or message?
35. Do you enter quote details into a sheet, or rely on the original file?
36. Is line-by-line comparison necessary?
37. How do you compare quotations with different included scope?
38. Is there a minimum number of quotations?
39. Can you select a more expensive supplier? Why?
40. Who selects the supplier?
41. Who approves the selection?
42. Do you record why other suppliers were rejected?

## B5. Purchase Orders and contracts

43. Do you currently use Purchase Orders?
44. Who creates them?
45. Who approves them?
46. Do approval limits change by amount?
47. Is a Purchase Order enough, or is a contract also required?
48. How do you handle a change after approval?
49. How do you cancel one line?
50. How do you add hours or quantity?
51. Must the supplier accept the change in writing?
52. Are there penalties or conditions for failure to deliver?

## B6. Advance, credit, and payment

53. What advance percentage is common?
54. When is the advance paid?
55. Is the advance always part of the total?
56. Does the supplier issue a document for the advance?
57. Is the balance paid before or after the event?
58. Do suppliers offer credit?
59. Are 7, 15, 30, or 45 days common?
60. Does each supplier have a Credit Limit?
61. Do some suppliers reject Purchase Orders and require full prepayment?
62. How do you follow supplier amounts due?
63. How do you track unallocated advances?
64. What happens when the company overpays?
65. How do you use supplier credit owed to the company?

## B7. Delivery and acceptance

66. Is delivery normally included?
67. Who unloads equipment?
68. Who installs it?
69. Does the supplier provide an operator or technician?
70. How many technicians normally attend?
71. Who performs teardown and removal?
72. Who arranges worker and equipment entry badges?
73. Who is responsible for electricity and cabling?
74. How do you prove that the supplier delivered the service?
75. Is there a signature or checklist?
76. Can delivery be accepted with conditions?
77. Who approves extra hours on event day?

## B8. Supplier failure and change

78. What supplier failures happen most often?
79. What happens if an item is unavailable before the event?
80. Are substitutes allowed?
81. Who approves the substitute?
82. If the replacement is more expensive, who bears the difference?
83. How is a failure on event day documented?
84. Do you deduct from the supplier bill?
85. Do you request a credit note?
86. Do you retain part of the amount until close?
87. When is a supplier blacklisted?

## B9. Vendor Bills

88. Does the supplier invoice before or after delivery?
89. How long after the event do invoices normally arrive?
90. Who receives the Vendor Bill?
91. Who reviews it?
92. Is it matched to the quotation or Purchase Order?
93. How do you verify quantity and service receipt?
94. What happens when the bill is higher?
95. What happens when the bill is lower?
96. How do you detect a duplicate invoice?
97. Is a Vendor Bill always linked to one event?
98. Are there supplier bills for company overhead?

## B10. Expenses, petty cash, and labour

99. Who may spend personal money for company work?
100. How do they request reimbursement?
101. Is a receipt mandatory?
102. What happens when a receipt is lost?
103. Do you use petty cash or accountable advances?
104. Who holds petty cash?
105. How is it settled?
106. Do daily workers come from suppliers or as individuals?
107. How is attendance confirmed?
108. How are wages paid?
109. Are meals and transport provided by the company?
110. Are labour, meals, and transport linked to the event cost?

## B11. Insurance, deposits, and damage

111. Does the company have annual general insurance?
112. Do some events require event-specific insurance?
113. Who requests the policy?
114. Do equipment suppliers require refundable deposits?
115. Do venues require damage deposits?
116. Who usually bears damage responsibility?
117. How is an incident documented?
118. Is there an Incident Report?
119. Who determines the damage amount?
120. How is the claim settled?
121. How long does deposit recovery take?
122. How are late deposits followed up?

## B12. Profitability and financial close

123. How do you currently calculate event cost?
124. Do you calculate Estimated Cost before supplier commitment?
125. Do you track Committed Cost?
126. Do unpaid Vendor Bills count as cost?
127. How do you calculate Expected Margin?
128. How do you calculate Actual Margin?
129. Are fixed salaries charged to events?
130. Is a company-overhead percentage allocated to each event?
131. When is an event financially closed?
132. Who approves financial close?
133. Can supplier bills arrive after close?
134. How is an event reopened for late cost?

## B13. Systems and reports

135. What software, spreadsheets, email, or WhatsApp processes are used now?
136. What data entry is repeated and painful?
137. What information is lost between WhatsApp and email?
138. What alert is most needed?
139. What report does management request repeatedly?
140. What should a Project Manager dashboard show?
141. What does Finance need every day?
142. What does Operations need every day?
143. What information should be instantly available but currently is not?
144. If the system solved one major problem, what should that problem be?

## B14. Customer commercial changes, accounting safety, and access control

145. At what stage may a quotation discount be entered or changed?
146. Are discounts normally fixed amounts, percentages, line discounts, or one total discount?
147. Who may approve a discount, and do approval limits change by amount or percentage?
148. How should a discount appear on deposit, partial, and final invoices?
149. At what exact point is a customer invoice considered issued and no longer editable?
150. If the customer adds scope after invoice issue, what document is used and who approves it?
151. If the customer removes scope after invoice issue, what document is used?
152. If the customer already paid too much, is the normal result a refund, a future customer credit, or either?
153. How are invoice mistakes corrected without deleting the original?
154. How are partially delivered or cancelled events handled?
155. When is customer revenue recognized for event profitability and formal accounts?
156. When is the event financially closed, and who may reopen it?
157. Does the company require a different person to prepare and approve quotations?
158. Which permissions should be assigned per individual rather than only by role?
159. How should access be suspended for leave, disabled immediately, and archived after departure?
160. Which user actions must remain visible after the employee leaves?
161. What anonymised examples of credit notes, refunds, change approvals, discount approvals, or close reports can be reviewed?

## B15. Customer receivables, payment terms, credit, and authorization evidence

162. For a normal event customer, when are invoices usually issued: deposit, milestones, before event, after event, or another schedule?
163. After an invoice is issued, when is payment normally due? Are there common immediate, 15-day, 30-day, 60-day, or customer-specific terms?
164. Are partial payments or instalments common, and how are they followed up?
165. Does G7 BLUE or similar event companies give some customers an approved credit limit or maximum outstanding exposure?
166. What happens when a customer is overdue: warning only, collection follow-up, stop new work, stop new invoices, management override, or another rule?
167. Who may approve an exception for an overdue or over-limit customer?
168. What evidence proves that a direct customer authorized G7 BLUE to start work or bill: approved quotation, signed quotation, customer PO, contract, email/WhatsApp approval, or something else?
169. Does the required authorization evidence change for government, enterprise, agency, or repeat-credit customers?
170. When management asks how much customers owed at the end of a past month, how is that historical balance currently reconstructed or reported?

## B16. Tender guarantees and owned-resource boundary

171. In the Tenders you handle, when are bid, performance, or other guarantees/securities required, and what document states the requirement?
172. Who arranges, approves, records, extends, releases, or follows up those guarantees?
173. How are guarantee expiry, fees, release, or forfeiture tracked today?
174. Does the guarantee remain linked to the Tender, Contract, Service/Event, finance records, or several of them?
175. Which equipment or vehicles does G7 BLUE normally own versus rent from suppliers?
176. Do owned resources currently create real scheduling conflicts, check-out/check-in work, maintenance, damage, serial tracking, or availability problems?
177. If owned-resource management is not a repeated pain point, should the ERP deliberately remain supplier-heavy instead of adding inventory/warehouse complexity?

<!--PAGEBREAK-->

# Appendix C - Next Chat Bootstrap

```text
Read the attached G7 BLUE Event ERP Future Expansion Master Handover completely before proposing product work.

This is the sole authoritative expansion-reference and rebaseline document, not implementation authorization.

Preserve four categories:
1. Locked owner decisions.
2. Confirmed directional decisions with open detail.
3. Recommended proposals that are not approved facts.
4. Open questions awaiting field, accounting, tax, HR, or technical evidence.

The current system continues normal controlled delivery in parallel. Do not stop current work. **Do not infer the active Goal, Git state, database state, test state, or remediation status from dated Sections 28A-28M.** Resolve current execution truth from the newest verified controller handover, project tracking, and repository evidence. Supplier Rate Card Management V1 remains the first bounded expansion slice; its strategic scope is recorded here while current delivery/acceptance/remediation state is verified elsewhere.

The near-term product is an internal G7 BLUE system. The long-term product direction is a specialist Event ERP SaaS for event companies. Multi-company and ZATCA are future activations, but new architecture must not block them.

The next discovery dependencies are Zainab field evidence on real quotation/package/item and Tender practice, the wider Riyadh event-workflow interview, and a focused review with an accountant familiar with event-company transactions. After those reviews, update the Decision Register, Domain Map, customer commercial model, Tender Blueprint, accounting blueprint, user lifecycle and permission matrix, and phased roadmap.

Always explain accounting and procurement terms in plain language. Do not present assumptions as Saudi event-industry facts. Ask Mozfer one bounded product decision at a time.

Locked owner decisions through 10 August include:
- ABS becomes an internal automatic billing authority after authorized quotation approval.
- Discounts must remain traceable through quotations, invoices, event profit, and company reporting.
- Issued invoices are immutable; later increases, reductions, credits, refunds, and customer balances use linked records.
- Role templates must support per-user grants and denials.
- Users are invited by email, set their own password, may be suspended/disabled/archived, and are not deleted when they have history.
- Separate preparer/approver is an optional company policy.
- G7 BLUE remains VAT inactive until separately authorized.
- This file is the sole expansion reference; newer expansion decisions must be reconciled here.
- The current product uses module-local search and contextual navigation, not a permanent Global Quick Finder.
- Customer 360 must expose human-readable Service context and one non-duplicated related-Service workspace.
- Supplier Location uses separate bidi-safe City, Coverage Area, and Country presentation; Rating remains hidden until a real performance workflow exists.
- Supplier Rate Card Management V1 is the first approved bounded expansion slice: Create, Edit, Activate/Deactivate, valid dates, and application-layer overlap validation.
- Rate Card Delete/Restore and broader procurement/accounting modules remain outside that slice.
- Mozfer owns manual browser and visual acceptance.
- One quotation or invoice is one canonical document with transient Arabic/English representations and no permanent `document_locale` authority.
- Commercial Group / Package / Item / Included Component is a field-validation-dependent hypothesis, not a final schema; Zainab evidence is required before design lock.
- Tender/Bid Management is a future expansion module: discover now, build later, and keep it distinct from Direct Quotation.
- Future Technical Proposal authoring is in-system; Financial Proposal/BOQ reuses central commercial and financial truth; AI assistance remains draft-only until human review and explicit approval.
- Draft/non-issued/cancelled/voided customer invoices do not contribute to live billed financial totals; issued invoice periodization uses authoritative `issued_at`, not `created_at`.
- Customer acquisition metrics may use customer creation date, but customer financial/activity reporting follows transaction relationships and relevant transaction dates so older customers remain visible when active.
- `Collected Cash` by payment date, historical Outstanding-as-of, customer payment terms/credit control, commercial authorization evidence, Tender guarantees, and owned-resource scope are documented as recommendations/open design concerns where not explicitly owner-locked.

Check the top-level Decision Register and the newest verified controller/repository evidence before proposing implementation. Treat Sections 28A-28M as historical evidence only.
```

---

# Appendix D - Daily Controller and Decision Sync Template

Use this appendix whenever the chat or agent session changes. Append a dated block; do not silently overwrite a prior day's evidence.

```text
DATE AND TIME:
OWNER:
AUTHORIZED REPOSITORY:
BRANCH:
HEAD / ORIGIN:
DIVERGENCE:
CURRENT WORKTREE:
STAGED FILES:
MODIFIED / UNTRACKED FILES:

ACTIVE TASK ID:
MODEL / REASONING:
MODE:
TASK BOUNDARY:
PROTECTED DIRTY FILES:
MIGRATION OR RPC FILES:
SQL APPLIED?:
STAGE / COMMIT / PUSH?:

AGENT RESULT:
TEST COMMANDS AND COUNTS:
KNOWN PRE-EXISTING FAILURES:
NEW FAILURES OR WARNINGS:
FINANCIAL / SECURITY RISKS:
UNKNOWN - MUST VERIFY:

OWNER DECISIONS LOCKED TODAY:
DIRECTIONAL DECISIONS:
OPEN PRODUCT QUESTIONS:
ACCOUNTANT / FIELD EVIDENCE REQUIRED:

EXACT NEXT BOUNDED ACTION:
DO NOT DO:
ATTACHMENTS / REPORTS TO CARRY FORWARD:
```

Daily handover rules:

1. Treat the newest verified repository evidence as authoritative for code state.
2. Treat this file as the sole authoritative expansion reference, not permission to implement.
3. Keep current delivery distinguishable from expansion, while permitting only the bounded expansion slices explicitly approved and recorded in this file.
4. Record agent claims as claims until commands, diffs, migrations, and tests are reconciled.
5. Preserve exact task IDs, migration names, HOLD reasons, and owner decisions.
6. Never rely on chat memory alone for financial, permission, migration, or lifecycle decisions.
7. Do not create a parallel expansion master file; append dated evidence and decisions to this file.
8. When an owner decision promotes or removes expansion scope, update this file before or alongside the controlled implementation task.
9. Do not mark an approved expansion slice as implemented until code state, tests, owner manual acceptance, merge, and push status are stated separately and truthfully.
10. Dated delivery sync sections are historical evidence only. Never let an old Goal/Git/database sentence override newer verified controller/repository truth.
11. Keep reporting terms explicit: billed/invoiced, collected cash, receivable, customer credit, refund, and revenue recognition must not collapse into one ambiguous metric.

---

**End of report**
