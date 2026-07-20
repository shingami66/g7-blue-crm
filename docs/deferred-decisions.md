# G7 BLUE CRM — Deferred Decisions

## 1. How To Use This Document
- Completed work is summarized in `project-status.md`.
- Execution order is owned by `project-roadmap.md`.
- This document contains only unresolved, partial, or intentionally deferred decisions.
- Historical task IDs are not active instructions.

## 2. Resolved Decisions To Preserve
- **Core Entity:** Service / Booking is the operational entity for new ERP work, not Project.
- **Locked Flow:** Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- **Quotations:** No standalone quotations. They are Service-scoped. One Service can have multiple Quotations. Approval requires `quotations:approve`. Approved quotations must not be fully editable or soft-deleted through ordinary `quotations:write`.
- **Invoices:** Invoices are siblings under Service / Booking and Approved Quotation. No invoice-to-invoice FK in MVP. Deposit Invoice is an advance/prepayment invoice, not a discount. Deposit amount must be > 0 and <= approved quotation total. Active invoice definition: `status NOT IN ('voided','cancelled') AND voided_at IS NULL`.
- **Payments:** Payments are separate from invoices. Multiple payments against one invoice do not create multiple invoices. Payments affect collected/uncollected balance, not invoiced/uninvoiced balance.
- **Financial Controls:** Client-submitted financial totals must never be trusted; they are calculated server-side. Prevent overpayment unless explicitly approved.
- **Snapshot Rules:** Every invoice created must persist full historical snapshot fields at issue time. Historical documents must not change meaning when language/settings change.

## 3. Financial And Billing Deferrals
- **Invoice voiding and controlled adjustment:** Unpaid invoices may be voided by Admin with a reason and audit record. Paid or partially paid invoices require a controlled adjustment/reversal and replacement path (D03/D04). Remaining implementation (schema, permissions, replacement mechanics, accounting treatment) is deferred.
- **Payment reversal/correction:** Payment correction workflows and reversal records remain deferred.
- **Refunds:** Refund implementation is deferred.
- **Wrong-Invoice reallocation:** Workflows to reallocate a payment to a different invoice remain deferred.
- **Financial retention and no hard deletion:** Financial records must use void/cancel/reversal workflows rather than hard deletion.
- **Rounding/currency hardening:** Currency and rounding standardization across the application remains deferred.
- **Payment evidence/attachments:** Attaching evidence to payments remains deferred.
- **Global Invoice Wizard:** Invoice creation from a global view is deferred; invoices are created from a valid workflow context.
- **Multi-stage invoices beyond Deposit/Final:** Additional staged/progress invoice behavior remains deferred until final settlement design or ZATCA-grade settlement requires it.

## 4. Approved Billing Scope Deferrals
- **Void UI:** The UI and application actions for voiding an Approved Billing Scope remain deferred. The backend RPCs are installed in DEV/DEMO.
- **Successor/supersede UI:** The UI for superseding an Approved Billing Scope remains deferred.
- **Optional richer history:** Richer history tracking for Approved Billing Scopes remains deferred.
- **Remaining production enforcement:** Production rollout of the ABS financial lifecycle remains deferred.

## 5. Supplier And Costing Deferrals
- **Supplier rate-card management/automation:** Rate-card management edit/delete/restore and overlap enforcement, as well as rate-card automation for quotations, remain deferred.
- **Broader Supplier Booking routes and workflows:** Standalone/broader Supplier Booking routes, UI, customer-facing documents, portal, edit/delete/restore, and expanded statuses remain deferred. Narrow internal Service-scoped V1 is implemented.
- **Supplier invoices/payments:** Supplier invoices, payables, outbound payments, accounting workflows, and supplier payment approval workflow remain deferred.
- **Actual-cost posting:** Posting of actual supplier costs remains deferred.
- **Profit/margin reporting:** Supplier costing, margin, and P&L reports remain deferred.
- **Customer-facing supplier cost exposure prohibition:** Any customer-facing exposure of supplier costs (documents, PDFs, portal) is strictly prohibited. Accountant, Sales, Operations, and Viewer do not have supplier cost access by default.

## 6. Security, Production, And Operations Deferrals
- **Remaining production RLS/security:** Production RLS validation and operational hardening (backup/monitoring/deployment readiness) are required before any hosted demo with real data.
- **Deployment:** Production deployment remains deferred.
- **Backups:** Database backups configuration remains deferred.
- **Monitoring:** Application and database monitoring remains deferred.
- **Logging:** Audit logs UI and detailed action logging remain deferred.
- **Incident ownership:** Incident ownership and operational support remain deferred.
- **Clerk live invitation/webhook smoke:** Real Clerk invitation/webhook smoke testing remains pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and approved.
- **Session timeout:** Idle session timeout and inactivity auto-logout remain deferred.
- **Repository reconciliation:** Repository checkout reconciliation and worktree retirement remain pending separate owner approval.
- **Sensitive Server Action Rate Limiting:** Current MVP process-local rate limiting is implemented. Distributed/multi-instance enforcement remains deferred.

## 7. Documents, VAT, And Compliance Deferrals
- **Official CR/VAT confirmation where still unresolved:** VAT Number and CR confirmation remain deferred/pending.
- **Tax Invoice:** Tax Invoice issuance is blocked while `vat_mode = not_registered`.
- **ZATCA/FATOORA:** Full ZATCA/FATOORA Phase 2 compliance remains deferred until official VAT registration and a separate approved design.
- **QR/XML/clearance:** QR codes, XML generation, clearance, and statutory reporting remain deferred.
- **Server-generated PDF:** Server-side PDF generation remains deferred (browser print is currently sufficient).
- **Browser print headers/footers:** Customizing browser print headers/footers remains deferred.
- **Document locale and bilingual documents:** Bilingual side-by-side documents and `document_locale` schema/runtime wiring remain deferred.
- **Logo upload where still deferred:** Company Logo upload remains deferred.

## 8. UX, Reporting, And Product Expansion Deferrals
- **Reports Center:** A dedicated Reports Center remains deferred.
- **Customer full report:** Full customer profile reports remain deferred.
- **Module-specific reports:** Module-specific reports remain deferred.
- **Attachments:** General attachments (storage, permissions, file limits) for quotations, invoices, and customer records remain deferred.
- **Notifications/WhatsApp/email:** Email, WhatsApp, and internal notifications remain deferred.
- **Customer activity timeline:** A unified customer activity timeline remains deferred.
- **Leads/inquiries:** Management of leads and inquiries remains deferred.
- **Event taxonomy:** Formalizing event taxonomy (e.g., specific event types) remains deferred.
- **Global search and optional polish:** Global search and module polish (e.g., search/filter parity, user-friendly error copy) remain deferred.
- **Service Hub:** Richer hub behavior (notes/activity/attachments and controlled status transition actions) beyond the minimal profile foundation remains deferred.
- **Advanced Dashboard:** Future reporting and advanced analytics on the dashboard remain deferred. Implemented live summary/list milestones are complete.

## 9. Data And Technical Debt
- **Legacy Project cleanup:** Reviewing project types/mock data, project permissions, `projects`/`project_tasks` legacy schema, customer `projects_count`, and supplier PRJ mock references remains deferred.
- **Numbering gaps as DEV/DEMO history:** Invoice numbering gaps are treated as development/smoke history. Do not reset or renumber.
- **Remaining schema/type mismatches:** Any remaining schema/type mismatches remain deferred.
- **Migration rollback process:** Formalizing a migration rollback procedure remains deferred.
- **Data normalization:** Further data normalization remains deferred.
- **Remaining mock/demo cleanup:** Auditing remaining mock/static app surfaces before further live-data polish remains deferred.

## 10. Historical And Superseded Notes
- **ERP-1:** Historical / Superseded Planning Note. Refers to the initial CRM/Service flow. The basic corresponding implementation is already complete. See `project-status.md`.
- **ERP-2:** Historical / Superseded Planning Note. Refers to quotation approval flow. The basic corresponding implementation is already complete. See `project-status.md`.
- **ERP-3 / ERP-3A / Full Invoice Schema:** Historical / Superseded Planning Note. Refers to basic invoice integration. Basic customer invoice/payment creation is implemented in DEV/DEMO. Financial correction workflows remain deferred.
- **ERP-4:** Historical / Superseded Planning Note. Payment integration is implemented in DEV/DEMO. Financial reversal and refund workflows remain deferred.
- **Phase 7A–7D / Phase 8:** Historical / Superseded Planning Note. Old roadmap phases; basic implementation is complete. See `project-status.md`.
- **Raw Error Exposure / Viewer Bank Detail Masking:** Historical / Superseded Planning Note. Current documented verification is passed.
- **Supplier Booking (Full):** Historical / Superseded Planning Note. Narrow internal Service-scoped V1 exists. Standalone broader features remain deferred. See Section 5.
- **Dashboard Real Data:** Historical / Superseded Planning Note. Implemented live summary/list milestones are complete. Advanced reporting remains deferred. See Section 8.
- **List Pagination Parity / Invoice List Sort:** Historical / Superseded Planning Note. Current documented verification is passed.
