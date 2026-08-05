# G7 BLUE Event ERP Future Expansion
## Master Product Handover, Decision Register, Discovery Brief, and Rebaseline Report

**Original report date:** 2 August 2026  
**Latest decision sync:** 4 August 2026  
**Revision:** 0.3  
**Owner:** Mozfer Mohamed Elhadi  
**Product:** G7 BLUE CRM / Future Event ERP  
**Document status:** Sole authoritative expansion reference, product decision register, and daily handover continuity record  
**Implementation authority:** This report records owner-approved expansion scope and sequencing, but it does not by itself authorize code changes, schema changes, migrations, SQL application, staging, commit, merge, or push. Implementation still requires a separate controlled owner-authorized task.

> **Core strategic statement:** Build the G7 BLUE house for today's company, but do not pour a roof that prevents adding floors tomorrow.


> **Expansion-reference authority:** This file is the only current master reference for Event ERP expansion scope, decisions, sequencing, and open questions. Earlier expansion files remain historical evidence only. Any later owner-approved expansion change must update this file so future work does not mistake an approved item for deferred work, or a planned item for completed work.

---

## Document Control

| Item | Current position |
|---|---|
| Current operating company | G7 BLUE, a Saudi events and production company |
| Current system shape | Internal Service-centered CRM with commercial workflow, suppliers foundation, users, and RBAC |
| Future product direction | A specialist Event ERP for event companies, initially proven inside G7 BLUE and later offered to other companies |
| Current implementation status | Current V1 work continues in the isolated Goal worktree. The next owner-approved wave combines current-product UX remediation with the first bounded expansion slice, Supplier Rate Card Management V1. |
| Original report repository baseline | `cdd888b4cbc495a69be0a2cccb1f1ba5a3aae48d`, aligned with `origin/main` when the 2 August report was prepared |
| Current dated delivery baseline | Source `main` is verified at `a87ad6ddac5ec67f27284de3d1207f40d6bd232a`; current uncommitted Goal work is isolated on `goal/v1-product-advancement-wave-20260804`. See Section 28B for the latest dated owner sync. |
| Feature activation | Supplier Rate Card Management V1 is implemented in the isolated Goal worktree as the first bounded expansion slice. Owner manual acceptance, controlled commit, merge, and push remain pending. No other expansion module is activated. |
| Latest owner decision sync | 4 August 2026: sole-reference authority, local-search product direction, Customer 360 relationship context, Supplier list cleanup, and Supplier Rate Card Management V1 activation boundary. |
| Current controlled-delivery snapshot | The isolated Goal branch contains the uncommitted current-product remediation and Supplier Rate Card Management V1 implementation. Automated suite reports 822/822 across 64 files; lint, route typegen, standalone TypeScript, and production build pass. Owner browser/visual acceptance remains pending. |
| Field evidence still required | Riyadh event-industry workflow interview, event-industry accountant review, and later tax/compliance review |

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

### 4 August 2026 revision summary

This revision records the following current truth:

- This file is the sole expansion reference. Do not create or rely on a competing expansion handover.
- Global cross-module Search is rejected for the current product because users normally know the business area they need. Module-local search and contextual record links are the approved direction.
- Customer 360 must identify the related Service for Quotations and Invoices using business numbers and titles, provide a dedicated Services view, remove duplicated related-Service presentation, and never expose sentinel dates such as year 9999.
- Supplier directory Location must present City, Coverage Area, and Country as separate bidi-safe information rather than one mixed-language string. The Rating column is hidden until a real supplier-performance workflow exists.
- Supplier Rate Card Management V1 is promoted from future/deferred management work into the first owner-approved bounded expansion slice. The approved scope is Create, Edit, Activate/Deactivate, valid-from/valid-to handling, and safe application-layer overlap validation. The Goal worktree implementation is complete for automated review, but not owner-accepted or delivered.
- Rate Card Delete/Restore, automatic pricing, procurement RFQ, supplier quotations, quote comparison, Purchase Orders, Vendor Bills, Supplier Payments, actual costing, and margin remain outside this bounded slice.
- Supplier Allocations and Service-scoped Supplier Bookings already belong to the current product baseline; the next wave may improve their responsive and interaction quality without reclassifying them as new expansion modules.
- Mozfer owns manual browser testing and final visual acceptance. Agent automation may prepare evidence but must not claim owner acceptance.

---

## 1. How the Next Chat Must Use This Report

The next chat must treat this report as the **sole authoritative expansion reference**, not as an implementation prompt. Earlier expansion handovers and discussion reports are historical evidence only and must not compete with this revision for current expansion scope.

It must:

1. Preserve the distinction between **locked decisions**, **directional owner decisions**, **recommended proposals**, and **open questions**.
2. Continue current product work without blocking it on the future expansion discussion.
3. Do not activate an unapproved expansion feature. As of 4 August 2026, Supplier Rate Card Management V1 is the only owner-approved bounded expansion slice; all broader expansion modules remain governed by discovery and later decisions.
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

The product should first become the internal operating and financial system for G7 BLUE. It should prove its usefulness in real event delivery, supplier management, company spending, accounting, profitability, and role-specific decision-making. After the internal system is stable and valuable, the product may be converted into a SaaS platform for other event companies.

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

The existing supplier-rate-card foundation is real, but the accepted current baseline is read-only visibility plus use in rate-card-driven Allocation creation. Full Rate Card management has not yet been implemented or accepted.

The owner-approved first bounded expansion slice is:

- Create a Supplier Rate Card from the authorized Supplier workspace.
- Edit a Rate Card while preserving permission and historical-integrity rules.
- Activate or deactivate a Rate Card through an explicit lifecycle action.
- Manage `valid_from` and optional `valid_to` with safe date validation.
- Reject invalid overlapping active periods for the same Supplier, item, and unit through a clearly documented application-layer check in this slice.
- Keep Supplier costing restricted to authorized internal roles.
- Keep Rate Cards out of customer-facing Quotations, Invoices, PDFs, portals, and general customer workspaces.

Not included in this slice:

- Rate Card hard delete, soft delete, or restore.
- Automatic quotation pricing.
- Automatic allocation creation.
- Procurement RFQ, Supplier Quotations, comparisons, awards, or Purchase Orders.
- Supplier invoices, payments, payables, actual costing, or margin.
- A production-concurrency claim for application-layer overlap checks.

Status as of 4 August 2026: **owner-approved for controlled implementation; not yet implemented, manually accepted, committed, merged, or pushed.**

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

G7 BLUE CRM remains an internal system built for G7 BLUE.

### 4.2 Long-term identity

The long-term product becomes a specialist Event ERP for event and production companies.

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

1. Solve real internal G7 BLUE work.
2. Capture actual operating evidence.
3. Stabilize business definitions and accounting rules.
4. Build reusable, configurable foundations.
5. Prove adoption and value.
6. Add tenant isolation and packaging.
7. Offer the product to other event companies.

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
| D48 | Supplier Rate Card Management V1 is the first owner-approved bounded expansion slice: Create, Edit, Activate/Deactivate, valid-date management, and safe application-layer overlap validation. |
| D49 | Rate Card Delete/Restore, automated pricing, broader procurement, supplier accounting, actual costing, and margin remain outside Rate Card Management V1 and require later explicit decisions. |

### 6.2 Directional owner decisions

These directions are confirmed, while implementation detail remains open.

| ID | Confirmed direction | Detail still open |
|---|---|---|
| O01 | The product becomes a specialist Event ERP, not only a CRM. | Exact module release order and release boundaries. |
| O02 | It serves G7 BLUE first and may serve other event companies later. | SaaS packaging, billing, tenant onboarding, and support model. |
| O03 | Multi-company is not implemented now, but new architecture must not block it. | Tenant ownership strategy, shared directories, branch model, and migration path. |
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

### 6.3 Recommended proposals, not yet locked

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

### 6.4 Explicit non-decisions

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

---

## 7. Future Domain Map

### 7.1 CRM and Sales

- Customers.
- Contacts.
- Inquiries.
- Services.
- Customer Quotations.
- Quotation families and immutable revisions.
- Quotation-level commercial discounts and approved net value.
- Internal Approved Billing Scope or billing authority.
- Customer Invoices.
- Customer Payments.
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

## 10. Future Multi-Company and SaaS Readiness

### 10.1 Current product mode

The product is currently single-company and should remain operationally simple for G7 BLUE.

### 10.2 Future product mode

The product may later support multiple independent event companies. Each company would have its own:

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

Without exposing multi-company UI now, future modules should avoid:

- Hard-coded G7-specific assumptions in reusable business logic.
- Global financial sequences shared across future companies.
- Global categories that cannot later be company-specific.
- User roles tied to named individuals.
- Financial records with ambiguous ownership.
- Cross-company supplier balances.
- Shared document storage without isolation boundaries.

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

- Revenue.
- Invoiced.
- Collected.
- Outstanding customer balance.
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

## 28. Working Phased Roadmap Hypothesis

This sequence is recommended for discussion and is not yet the final approved roadmap.

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
- Prepare accounting blueprint.
- Prepare design-system baseline.
- Reconcile canonical roadmap and deferred decisions.

### Phase 0A - Approved Bounded Expansion Slice: Supplier Rate Card Management V1

This phase is owner-approved and may proceed through a separate controlled task without activating broader procurement or accounting scope.

- Create Rate Card.
- Edit Rate Card.
- Activate and deactivate Rate Card.
- Validate effective date ranges.
- Add safe application-layer overlap validation for the same Supplier, item, and unit.
- Preserve internal costing permissions and customer-facing isolation.
- Exclude Delete/Restore, automated pricing, RFQ, Purchase Orders, supplier finance, actual cost, and margin.
- Require Mozfer manual browser acceptance before commit slicing and merge.

Status: **implemented in the isolated Goal worktree; owner manual acceptance, controlled commit, merge, and push remain pending.**

### Phase 1 - Financial Safety

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

### Phase 2 - Accounting Foundation

- Chart of Accounts.
- Journal engine.
- Accounting periods.
- Bank and Cash foundation.
- Core receivable and payable postings.
- Audit trail.
- Net commercial revenue bridge into event profitability.

### Phase 2A - User Access and Lifecycle Foundation

- Role templates.
- Per-user grants and denials.
- Email invitations.
- Temporary suspension, disablement, and archival.
- Activity reporting foundations.
- Optional separate-preparer/approver company policy.

### Phase 3 - Expenses and Cash Control

- Company Expenses.
- Direct Event Expenses.
- Employee Reimbursements.
- Receipt attachments.
- Petty Cash.
- Approval workflow.

### Phase 4 - Procurement

- RFQ.
- Supplier Quotations.
- Quote Comparison.
- Supplier Award.
- Purchase Orders.
- Supplier Bookings alignment.
- Service Receipt.
- Committed Cost.

### Phase 5 - Supplier Accounting

- Vendor Bills.
- Supplier Credits.
- Supplier Payments.
- Advances.
- Refundable deposits.
- Payables.
- Due and overdue alerts.
- Purchase Order and bill matching.

### Phase 6 - Event Costing and Profitability

- Event Cost Ledger.
- Expected Cost.
- Actual Cost.
- Paid and Outstanding Cost.
- Expected Margin.
- Actual Margin.
- Variance.
- Event financial close.

### Phase 7 - Event Operations

- Event Brief.
- Venue options.
- Site Visits.
- Tasks and timeline.
- Permits and documents.
- Crew and labour.
- Incidents and claims.

### Phase 8 - Dashboards and Reports

- Management dashboard.
- Finance dashboard.
- Operations dashboard.
- Sales dashboard.
- Personal dashboards.
- Reports Center.
- Financial statements and exports.

### Future Platform Activation

- Multi-company or multi-tenant SaaS.
- Subscription plans.
- Company onboarding.
- ZATCA integration.
- Configurable localisation.
- Supplier marketplace or shared discovery, if later approved.

---

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
- Supplier Rate Card Management V1 through a separate controlled owner-authorized task.

Expansion implementation still requires a separate controlled owner-authorized task. This report makes Supplier Rate Card Management V1 eligible for that task; it does not authorize any other expansion module.

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

---

## 33. Documents to Request as Anonymised Samples

Only with clear permission and removal of confidential data:

- Event Brief.
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
| Trying to build the entire ERP at once | Long delay before value | Phase the product and launch bounded modules. |
| Accounting added after operational tables | Duplicate financial truth | Approve accounting blueprint before major financial modules. |
| Hard-coded single-company behavior | Difficult SaaS migration | Require company ownership and configurable settings in new architecture. |
| Premature multi-company UI | Unnecessary current complexity | Keep readiness internal; activate later. |
| Premature VAT/ZATCA claims | Compliance and trust risk | Keep tax inactive until approved compliance project. |
| AI extraction errors | Wrong amounts and approvals | Preserve source, display confidence, require human confirmation. |
| Service page overload | Poor usability and performance | Move major domains into dedicated workspaces. |
| Role leakage | Sensitive cost and margin exposure | Permission-safe queries, server checks, RLS, and masked fields. |
| Uncontrolled financial edits | Audit and accounting failure | Lifecycle corrections, immutable history, and period close. |
| Different profit formulas across pages | Management confusion | One cost and accounting source of truth. |
| Building UI before design system | Repeated redesign loops | Create ERP design contract and templates first. |

---

## 35. Immediate Next Steps

1. Use revision 0.3 of this file as the sole authoritative expansion reference; do not create a competing master handover.
2. Run the next controlled Goal in the existing Goal worktree for the approved current-product remediation and Supplier Rate Card Management V1 boundary recorded in Section 28B.
3. Keep all changes unstaged and uncommitted until Mozfer performs manual browser and visual acceptance.
4. After owner acceptance, use controlled commit slicing, fast-forward merge to `main`, validation, push, and temporary Goal-worktree cleanup.
5. Update this file immediately when Rate Card Management V1 changes from approved to implemented, accepted, merged, or pushed.
6. Preserve the Arabic interview-question document for Wednesday.
7. Conduct the Wednesday interview and record answers as evidence, separating universal rules from “depends on supplier/event” behavior.
8. Collect anonymised sample documents where allowed.
9. Continue the Domain Map, Sidebar Map, permission model, design-system, and roadmap rebaseline.
10. Review the accounting blueprint and customer commercial-change lifecycle with a qualified accountant familiar with event-company transactions.
11. Record the accountant's answers on discounts, invoice issue, Change Orders, credits, refunds, customer credit, revenue recognition, event close, and reopen rules.
12. Select the expansion feature after Rate Card Management V1 only after this slice is accepted and the relevant broader evidence is reconciled.

---

# Appendix A - Accounting and Procurement Glossary

| Term | Plain meaning |
|---|---|
| Accounts Payable | Money G7 BLUE owes suppliers or other payees. |
| Accounts Receivable | Money customers owe G7 BLUE. |
| Actual Cost | Accepted cost supported by bills, direct expenses, labour, or adjustments. |
| Advance | Money paid before final invoice settlement. |
| Balance Sheet | What the company owns, owes, and the owner's remaining interest at a date. |
| Bank Reconciliation | Comparing system transactions with the real bank statement. |
| Cash Flow | How cash entered and left the company. |
| Chart of Accounts | The structured list of all accounting accounts. |
| Committed Cost | Amount formally agreed through an approved PO, contract, or equivalent. |
| Change Order | An approved commercial change that adds, removes, or changes scope after the original quotation was approved. |
| Credit Note | A document reducing a previously billed amount. |
| Customer Credit Balance | Value owed to a customer and retained for an approved future settlement instead of an immediate refund. |
| Commercial Discount | An approved reduction from the gross customer price that reduces net commercial revenue. |
| Direct Event Expense | A real expense caused by one Service. |
| Double-entry | Accounting where every entry has equal debit and credit totals. |
| Estimated Cost | Expected cost before formal commitment. |
| Event Margin | Event revenue less direct event cost. |
| General Ledger | Transactions grouped by accounting account. |
| Gross Profit | Total event revenue less total direct event cost. |
| Incident Report | Evidence and workflow record for an operational incident. |
| Internal Billing Authority | The hidden approved commercial snapshot that controls what may be invoiced for a Service. |
| Journal Entry | Accounting entry generated by a financial event. |
| Net Profit | Gross Profit less company overhead and other expenses. |
| Outstanding Cost | Accepted cost not yet paid. |
| Paid Cost | Amount already settled. |
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

The current system continues normal controlled delivery in parallel. Do not stop current work. Supplier Rate Card Management V1 is the only currently approved bounded expansion slice, and it still requires a separate controlled owner-authorized implementation task.

The near-term product is an internal G7 BLUE system. The long-term product direction is a specialist Event ERP SaaS for event companies. Multi-company and ZATCA are future activations, but new architecture must not block them.

The next discovery dependencies are the Wednesday interview with an experienced Riyadh event Project Manager and a focused review with an accountant familiar with event-company transactions. After those reviews, update the Decision Register, Domain Map, Sidebar Map, customer commercial-change blueprint, accounting blueprint, user lifecycle and permission matrix, and phased roadmap.

Always explain accounting and procurement terms in plain language. Do not present assumptions as Saudi event-industry facts. Ask Mozfer one bounded product decision at a time.

Locked owner decisions through 4 August include:
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

Check the newest dated Current-Delivery Sync before proposing implementation.
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

---

**End of report**
