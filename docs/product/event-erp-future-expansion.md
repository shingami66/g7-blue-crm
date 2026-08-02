# G7 BLUE Event ERP Future Expansion

## 1. Document Status

- Status: Canonical strategic expansion and product-rebaseline document.
- Recorded: 2 August 2026.
- Owner: Mozfer Mohamed Elhadi.
- Evidence basis: the G7 BLUE Event ERP Future Expansion Master Handover dated 2 August 2026, current repository documentation, and verified current repository state.
- Implementation authority: None. This document does not activate a feature, approve a schema, authorize a migration, or replace controlled delivery.
- Policy: **This expansion is an approved product direction, not an active implementation feature.**
- Current delivery continues in parallel; field, accounting, tax, HR, and technical evidence remain required before detailed design is locked.

## 2. Purpose

Define the long-term Event ERP direction while preserving current V1 scope, existing financial history, Service authority, permissions, responsive behavior, and controlled delivery governance.

## 3. Executive Summary

G7 BLUE CRM is an internal Service-centered CRM and billing system for a Saudi events and production company. The approved direction is to evolve it into a specialist Event ERP: event operations, supplier-heavy delivery, controlled expenses, procurement, supplier finance, event costing, company accounting, role-based dashboards, and evidence-aware document workflows.

The near-term product remains an internal G7 BLUE system. A later SaaS product may serve other event companies after real workflow evidence, accounting review, adoption, tenant isolation, and packaging are proven. No future module in this document is active because of this document.

## 4. Product Vision

Build the G7 BLUE house for today's company without pouring a roof that prevents adding floors tomorrow. The product should understand event work deeply rather than becoming a generic ERP clone.

## 5. Current Product Baseline

The current operational flow remains:

Customer Profile -> Service -> Quotation -> Approved Billing Scope or billing authority -> Invoice -> Customer Payment.

Current delivered foundations include Customers, Services, Quotations, approved billing scope, deposit and final invoices, customer payments, Suppliers, rate cards, Service Supplier Allocations, Supplier Bookings, Company Settings, users, permissions, and a permission-scoped dashboard. Supplier Booking remains an operational reservation, not a Purchase Order, liability, or committed cost.

Feature 007 and Feature 008 remain delivered. Feature 009 remains inactive. ABS Void/Supersede remains a preferred candidate pending formal activation and fresh verification; it is not activated here.

## 6. Why the Product Is Expanding

Event delivery joins commercial work, temporary venues, suppliers, documents, last-minute changes, direct spending, advances, deposits, unpaid bills, operational acceptance, and profitability. The current foundation should grow only after business definitions and evidence are made explicit.

## 7. Strategic Product Positioning

The differentiator is an event-industry operating model: Service-centered work, supplier-heavy execution, venue constraints, deposits and guarantees, event permissions, supplier failure handling, cost states, event margin, and role-specific operational and financial views.

## 8. G7 BLUE Now vs Event ERP SaaS Later

| Horizon | Product position | Boundary |
|---|---|---|
| G7 BLUE now | Single-company internal operating system | Keep the interface simple and solve verified G7 BLUE work first. |
| Rebaseline | Product and field-discovery stream | Lock definitions, evidence, accounting blueprint, permissions, and design system before implementation. |
| SaaS later | Specialist Event ERP for other event companies | Add tenant isolation, onboarding, packaging, configurable localization, and support only after approval. |

## 9. Scope Boundaries

This document covers product direction, domain relationships, information architecture, workflow vocabulary, discovery dependencies, and implementation gates. It does not approve database tables, migrations, SQL, server actions, UI implementation, provider selection, tax policy, or a final release order.

## 10. Non-Goals

- Replacing the current V1 delivery sequence.
- Activating accounting, procurement, expenses, VAT, ZATCA, AI, multi-company, or multi-tenant features.
- Claiming statutory accounting, tax, ZATCA, HR, or production readiness.
- Replacing Service with Project or creating standalone customer financial authorities.
- Designing speculative schemas or final debit/credit mappings.

## 11. Core Domain Model

The domain is organized around Customer, Service, commercial records, operational records, suppliers, cost records, company expenses, financial records, documents, approvals, and reporting. Event-specific records remain linked to Service even when shown in dedicated workspaces.

## 12. Service as the Operational Context

Service remains the operational context and mutation authority for event-specific work. A dedicated global page may support search and follow-up, but it must not bypass Service linkage or create a second authority for quotations, invoices, payments, supplier work, or event costs.

## 13. Future Domain Map

The proposed domains are CRM and Sales; Operations; Suppliers and Procurement; Expenses and Costing; Finance and Accounting; Reports; and Administration. These are directional groupings, not an implementation-approved page list.

## 14. Information Architecture Direction

Use a concise Service overview with links to focused workspaces. Keep global list pages useful for search and follow-up, while retaining Service context for event mutations.

## 15. Sidebar and Navigation Direction

Use a collapsible two-level structure: Dashboard, CRM and Sales, Operations, Suppliers and Procurement, Expenses and Costing, Finance and Accounting, Reports, and Administration. Hide sections for which the user has no permitted item. Do not expose thirty links at once.

## 16. Service Workspace Decomposition

Proposed workspaces are Commercial, Procurement, Costing, Operations, Documents, and Risks. Their exact routes, permissions, and release order remain open.

## 17. CRM and Sales Domain

Preserve Customers, Contacts, Inquiries, Services, Quotations, approved billing authority, customer invoices, customer payments, customer credits, refunds, and corrections. Quotations and invoices remain Service-linked.

## 18. Event Operations Domain

Future operations may cover Event Brief, venues, Site Visits, timelines, tasks, setup, teardown, permits, crew, equipment, incidents, handover, and event close. Field evidence must distinguish universal steps from event-dependent steps.

## 19. Supplier and Procurement Domain

The directional supplier journey is requirement -> RFQ or direct quote -> Supplier Quotation -> comparison -> award -> approved Purchase Order or contract -> Booking -> Service Receipt -> Vendor Bill -> review -> payment or credit. RFQ thresholds, approval limits, and amendment rules are pending evidence.

## 20. Expenses and Costing Domain

Separate Company Expenses from Direct Event Expenses. Future capabilities may include reimbursements, petty cash, daily labour, meals, transport, contingency, event cost ledger, cost states, and margin. None are active through this document.

## 21. Finance and Accounting Domain

The strategic objective is progressively fuller accounting: Vendor Bills, Supplier Credits, Supplier Payments, advances, deposits, receivables, payables, bank and cash, reconciliation, accounts, journals, periods, and statements. A qualified Saudi accountant must review policy before implementation.

## 22. Reporting and Analytics Domain

Potential reports include Event P&L, cost state, supplier spend, ageing, company expenses, approvals, cash, operations, and financial statements. Reports must use one financial truth and clearly label managerial versus statutory bases.

## 23. Administration and Configuration Domain

Future administration may cover users, roles, permission matrices, approval rules, company settings, categories, numbering, integrations, audit logs, AI usage controls, tenant settings, and tax settings. Configuration does not itself activate those features.

## 24. Supplier Workflow Direction

Use plain-language stages: request, quote, compare, select, approve, order or contract, book, deliver, accept, bill, pay, credit, and close. Supplier Booking is operational; approved Purchase Order or contract is the natural commitment point.

## 25. RFQ and Supplier Quotation Direction

RFQ may be formal, direct, or emergency with a recorded reason. Supplier quotations should preserve the original file and capture scope, price, terms, delivery, installation, operators, teardown, transport, deposits, and exclusions. The exact required fields and threshold remain pending field evidence.

## 26. Supplier Quote Comparison

Start with a transparent comparison table, manual selection, and a required selection reason. Compare price, scope, availability, terms, delivery, installation, performance, compliance evidence, deposits, and risk. Weighted scoring is a proposal, not a locked policy.

## 27. Purchase Orders

An approved Purchase Order should preserve supplier, Service, quotation, scope, quantities, pricing, delivery, setup, teardown, payment terms, approvals, amendments, cancellation, and agreed-term snapshots. It is a future commitment record, not current Supplier Booking behavior.

## 28. Supplier Booking

Supplier Booking remains a current internal operational reservation created from Service-linked allocation. Future alignment with procurement must preserve its current meaning and must not silently turn it into a Purchase Order or financial commitment.

## 29. Service Receipt and Supplier Performance

A future Service Receipt may record delivery, quantity, installation, operators, teardown, defects, conditions, and acceptance. Supplier performance may later use on-time delivery, quality, incidents, scope variance, and commercial reliability, subject to field evidence.

## 30. Vendor Bills

Vendor Bills are future supplier financial records separate from Supplier Quotations, Purchase Orders, Service Receipts, advances, deposits, credits, and payments. Bills above an approved commitment require review and cannot be approved automatically.

## 31. Supplier Credits

Supplier Credits may represent overpayment, cancelled scope, returned advance, discount, non-delivery, or an approved recovery. The application and accounting treatment remain deferred and require accountant review.

## 32. Supplier Payments

Supplier Payments settle approved supplier liabilities or allocate advances. They remain separate from customer payments and must preserve approval, evidence, allocation, and audit history.

## 33. Advances and Deposits

An advance normally reduces later payable. A refundable deposit is not an expense unless an approved amount is retained. Return timing, evidence, and claim handling require field and accounting review.

## 34. Company Expenses

Company Expenses are overhead such as rent, subscriptions, general transport, office supplies, government fees, and fixed salaries. They remain separate from direct event costs and are an approved strategic expansion domain, not an active module.

## 35. Direct Event Expenses

Direct Event Expenses exist because of one Service: venue, equipment, printing, labour, meals, transport, permits, emergency repair, or on-site purchase. They must retain Service linkage and approval evidence.

## 36. Employee Reimbursement

The directional workflow is submit with receipt and reason -> Finance review -> Manager/Admin approval -> reimbursement -> close. A claimant cannot approve their own expense. Missing receipts require controlled exception handling.

## 37. Petty Cash

Petty Cash is accountable cash for small or urgent spending. Future tracking should cover custodian, funding, spend, receipt, balance, shortage or overage, settlement, and Service linkage where applicable.

## 38. Daily Labour and Event Crew Costs

Future labour tracking may include supplier-provided labour and direct individuals, attendance, task, date, hours, rate, meals, transport, approvals, payment evidence, and HR verification. Do not label people as legally approved workers without verified HR evidence.

## 39. Event Cost Ledger

The future Event Cost Ledger should show estimates, commitments, accepted actuals, paid amounts, outstanding amounts, credits, deposits, direct expenses, and category/supplier drill-down in one Service-linked view.

## 40. Cost State Definitions

| State | Plain meaning | Typical evidence |
|---|---|---|
| Estimated Cost | Expected cost before formal commitment | Rate card, quote, budget, or estimate |
| Committed Cost | Amount formally agreed | Approved Purchase Order, contract, or equivalent |
| Actual Cost | Accepted cost supported by evidence | Vendor Bill, approved expense, labour, or adjustment |
| Paid Cost | Amount settled | Supplier payment, reimbursement, or allocated advance |
| Outstanding Cost | Accepted amount still unpaid | Approved bill less payments and credits |

These definitions are directional until accounting and field review lock them.

## 41. Estimated Cost

Estimated Cost supports planning and may use historic or quoted values. It must not be presented as a liability or actual expense.

## 42. Committed Cost

Committed Cost begins at an approved Purchase Order, contract, or equivalent approved commitment. A quote or tentative booking alone is not commitment.

## 43. Actual Cost

Actual Cost requires accepted evidence such as a Vendor Bill, approved direct expense, labour record, credit, or approved adjustment. Payment timing does not define when cost is born.

## 44. Paid Cost

Paid Cost shows settlement, including allocated advances, supplier payments, reimbursements, or other approved settlements. Paid is not the same as actual.

## 45. Outstanding Cost

Outstanding Cost shows accepted unpaid amounts and should remain distinct from commitments not yet billed.

## 46. Expected Event Margin

Working managerial formula: approved event revenue basis minus forecast event cost. The revenue basis and forecast basis remain open and must not be called statutory accounting.

## 47. Actual Event Margin

Working managerial formula: approved or recognized event revenue basis minus accepted actual event cost. Revenue recognition and cost-close policy require accountant review.

## 48. Company Gross Profit

Working managerial view: total event revenue less total direct event cost. This is not a final statutory statement.

## 49. Company Net Profit

Working managerial view: gross profit less Company Expenses and other approved expenses. Allocation policy remains open.

## 50. Event Financial Close

A future close process may review documents, outstanding costs, supplier balances, advances, deposits, credits, claims, and late bills before locking a period or event. The close authority and reopening policy remain pending field and accounting evidence.

## 51. Accounting Architecture Direction

Build accounting progressively behind simple business workflows. Do not create separate financial truths in each module. No ledger tables, implementation mapping, or compliance claim is approved by this document.

## 52. Chart of Accounts

The future Chart of Accounts is the organized list of company accounts. Its structure, account ownership, numbering, and accountant approval are deferred.

## 53. Double-Entry Accounting

The future system should preserve equal debit and credit totals for accounting transactions. No debit/credit mapping is final here.

## 54. Journal Entries

Approved invoices, bills, expenses, payments, advances, credits, refunds, and deposits may later generate journal entries. Manual adjustments require narrow authorization and auditability.

## 55. Accounts Receivable

Accounts Receivable represents money customers owe. It must remain separate from customer cash received and from supplier balances.

## 56. Accounts Payable

Accounts Payable represents approved amounts owed to suppliers or other payees. It must remain separate from Supplier Booking and from customer invoices.

## 57. Bank and Cash

Future bank, cash box, petty cash, advances, deposits, receipts, fees, and transfers should be traceable. No live cash implementation is activated.

## 58. Bank Reconciliation

Future reconciliation compares recorded transactions with bank statements and identifies missing transfers, fees, unknown deposits, duplicates, timing differences, and incorrect references.

## 59. Trial Balance

A future Trial Balance should show account balances and debit/credit equality. Equality alone does not prove correct classification.

## 60. Accounting Period Close

A future period close may review documents, outstanding costs, bank reconciliation, customer and supplier balances, advances, deposits, adjustments, and controlled lock state.

## 61. Profit and Loss

Future P&L reporting should show an explicitly approved revenue and cost basis, with managerial and statutory views clearly distinguished.

## 62. Balance Sheet

Future Balance Sheet reporting should show assets, liabilities, and equity only after the accounting blueprint and professional review are approved.

## 63. Cash Flow

Future Cash Flow reporting should explain cash movement and must not be inferred from profit or invoice totals alone.

## 64. Role-Based Dashboards

Use one permission-scoped dashboard framework with role, assignment, company, team, and personal views. Potential views include management, sales, operations, finance, and personal work queues.

## 65. Permission and Visibility Principles

Hide unauthorized navigation, deny direct access server-side, exclude sensitive values from returned data, preserve 403 behavior, and keep cost/margin internal. Dashboard visibility does not grant mutation authority.

## 66. Event Brief

The Event Brief remains under Service and may capture event type, objective, audience, dates, venue, windows, scope, budget, deliverables, technical needs, hospitality, security, contacts, approvals, and attachments. Mandatory fields remain a proposal.

## 67. Site Visits

Site Visits may record attendees, checks, conditions, photos, documents, risks, actions, owners, and outcome. The mandatory rule is pending field evidence.

## 68. Venue Sourcing

Venue sourcing may capture requirements, candidates, availability, quotations, visit results, comparison, customer approval, booking, deposit, and permits. Responsibility may sit with the customer, G7 BLUE, or both.

## 69. Permits and Attachments

Future document tracking may include type, Service, responsible party, required and expiry dates, approval, attachment, reminder, blocking status, permissions, and retention. No storage implementation is activated.

## 70. Insurance

Distinguish company, event-specific, equipment, liability, and other policy types. Distinguish the Insurance Policy from its Premium. Regulatory and coverage decisions require qualified review.

## 71. Deposits

Customer damage deposits, venue deposits, supplier deposits, and advances have different meanings. Preserve money movement, expected return or allocation, evidence, and approved retention separately.

## 72. Damage and Incident Management

Incident Reports should capture facts, time, place, people, photos, witnesses, immediate action, owner, and status. Damage Claims and settlements require separate review and do not become expenses automatically.

## 73. Operations Timeline

A future timeline may include Brief, Site Visit, Quotation, Supplier Selection, Purchase Order, Permits, Setup, Event Day, Teardown, Final Bills, and Financial Close. Stages must remain configurable by event type and scope.

## 74. AI-Assisted Document Processing

AI may assist extraction, comparison, duplicate detection, variance explanation, expiry reminders, and checklist suggestions. It may not independently approve financial meaning.

## 75. OCR and Scan-and-Fill

Use a layered path: manual entry and original preservation first; optional local or low-cost OCR next; optional user-triggered cloud extraction later. Do not select a provider or API in this document.

## 76. Human Review Requirements

Users must confirm extracted supplier, document number, dates, amounts, taxes, terms, line items, and confidence before financial state changes. Original files and audit trails remain preserved.

## 77. AI Cost-Control Strategy

Prefer on-demand extraction, monthly limits, company-level controls, confidence display, audit logs, manual fallback, and measurable time or error reduction. Usage policy and budget remain pending.

## 78. Future Multi-Tenant Readiness

Multi-tenant SaaS is deferred. Future architecture should avoid ambiguous ownership, shared sequences, unisolated storage, global categories, and user roles tied to named individuals.

## 79. Future Multi-Company Readiness

Multi-company is deferred. Future readiness should allow company-specific users, customers, Services, suppliers, documents, numbering, settings, taxes, accounting records, storage, reports, and AI limits without exposing current complexity prematurely.

## 80. Saudi VAT Readiness

Future design should leave room for registration state, effective date, VAT number, invoice type, structured tax data, credit/debit notes, QR/XML, and audit records. The current company is documented as not VAT registered; this task does not change that.

## 81. Future ZATCA Integration Readiness

ZATCA integration remains inactive and unclaimed. Future design may preserve room for integration state, submission responses, retries, rejection history, QR/XML, and audit records, subject to official evidence and qualified review.

## 82. Design System Direction

Create a reusable ERP design contract before wide UI expansion. Preserve G7 BLUE's visual language, clear enterprise layout, English/Arabic behavior, RTL, permissions, loading, empty, error, and unauthorized states.

## 83. ERP Page Templates

Proposed shared templates are Dashboard, List and Filters, Record Detail, Transaction Form, Approval Workspace, and Report/Drill-down. Templates are design direction, not implementation approval.

## 84. Responsive and RTL Requirements

Responsive and RTL behavior remain mandatory. New work must preserve existing acceptance status, readable financial identifiers, logical controls, mobile grouping, and permission-safe content.

## 85. Product Risks

Main risks are designing from assumptions, attempting the whole ERP at once, overloading Service, exposing internal cost, treating cash as profit, and activating future complexity before value is proven.

## 86. Technical Risks

Risks include duplicate financial truths, ambiguous Service ownership, hard-coded single-company behavior, document drift, unbounded AI costs, permission leakage, large-page performance, and future migration cost.

## 87. Financial-Control Risks

Risks include treating Booking as commitment, treating payment as cost birth, approving bills above commitments, mishandling advances/deposits, inconsistent margin formulas, late bills after close, and uncontrolled edits to approved records.

## 88. Regulatory Boundaries

No accounting compliance, Saudi tax compliance, ZATCA readiness, statutory statement readiness, HR compliance, or legal worker classification is claimed. Unknown regulatory details must be labeled **UNKNOWN - MUST VERIFY** and reviewed by qualified professionals.

## 89. Phased Expansion Direction

The working hypothesis is: 0 Product Rebaseline and Field Evidence; 1 Financial Safety; 2 Accounting Foundation; 3 Expenses and Cash Control; 4 Procurement; 5 Supplier Accounting; 6 Event Costing and Profitability; 7 Event Operations; 8 Dashboards and Reports; then future multi-company, multi-tenant, packaging, and ZATCA activation. This is not a final roadmap.

## 90. Current Work Continuity

Current delivery, financial safety, permissions, security hardening, real defects, V1 usability, Feature 007, Feature 008, and approved candidate governance continue. The expansion is a separate discovery stream and must not cancel or block current work.

## 91. Field Discovery Dependencies

The Wednesday interview with an experienced Riyadh event Project Manager is the next evidence dependency. Request one end-to-end event, normal and failure examples, role ownership, documents, supplier terms, deposits, cost practice, financial close, and anonymized samples only with consent.

## 92. Open Questions

Open questions include RFQ thresholds, quote formats, selection authority, advances, credit days, delivery scope, acceptance, failure handling, expense thresholds, labour practice, permits, insurance, revenue basis, overhead allocation, close policy, roles, dashboards, AI limits, and first expansion feature. The full catalogue is in event-erp-discovery-questions.md.

## 93. Approval Boundaries

Before implementation: complete rebaseline, field discovery, domain map approval, accounting blueprint review, permission matrix, information architecture/design system, and explicit bounded feature activation. Qualified accountant and relevant tax/compliance review are required for professional policy.

## 94. Next Documentation Steps

1. Conduct the Wednesday field-discovery meeting.
2. Record answers as evidence, distinguishing universal practice from event/supplier-specific behavior.
3. Update the decision register.
4. Prepare the Domain Map, Sidebar Map, accounting blueprint, permission matrix, and phased roadmap.
5. Keep the first implementation feature unselected until those gates are reviewed.
