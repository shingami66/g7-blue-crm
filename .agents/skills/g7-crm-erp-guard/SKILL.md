---
name: g7-crm-erp-guard
description: Pre-implementation discussion guard and post-implementation review guard for G7 BLUE CRM. Use before coding, reviewing, committing, or merging features that affect product workflow, Customer Profile, Services, quotations, invoices, payments, VAT/ZATCA behavior, Supabase/PostgreSQL data flow, Clerk/RBAC, financial logic, backend architecture, or G7 BLUE design-system consistency.
---

# G7 CRM ERP Guard

Use this skill as a project guard for G7 BLUE Events CRM + ERP-like Billing System. Protect the product workflow, ERP/business logic, invoice and quotation safety, backend architecture, RBAC, financial calculations, VAT/ZATCA direction, and G7 BLUE visual identity.

## Operating Mode

First determine the invocation context:

- Before coding: discuss the correct product pattern, ERP/business logic, backend data flow, UI pattern, risks, and open decisions. Do not implement code unless the user explicitly approves implementation after the discussion.
- After coding: review the current diff or described changes for product correctness, financial safety, RBAC/security, backend rules, design consistency, accessibility, and responsive behavior.
- Before commit or merge: review the diff and identify required fixes. Do not commit.

Always follow repo rules in `AGENTS.md`. Do not touch `.env.local`, expose secrets, use `git add .`, run SQL without approval, apply migrations automatically, edit already-applied migrations, or create SQL/migrations without explicit review.

## Project Identity

- Product: G7 BLUE Events CRM + ERP-like Billing System.
- Stack: Next.js App Router, TypeScript, Tailwind, Supabase/PostgreSQL, Clerk Auth.
- Architecture: modular monolith with external Supabase and Clerk.
- Core operational flow: Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- Services replaced Projects. Service is the operational unit. Customer Profile is the hub.
- Quotations and invoices must be linked to a Service. Do not create standalone quotations or standalone invoices disconnected from a Service.

## Core Product Rules

- Customer can be Individual or Company.
- CR Number and VAT Number are not required for all customers.
- Customer Profile should show Overview, Services, Quotations, Invoices, Payments, and Notes / Activity.
- New Quotation should be created inside a Service, not directly at the customer level.
- New Invoice should be created inside a Service.
- No invoice should exist without `service_id`.
- No quotation should exist without `service_id`.
- Existing demo quotation data can be deleted or truncated when moving to the new Service-linked model, after explicit approval.

## Service Rules

- Treat Services as the replacement for Projects.
- Use this Service status machine: Inquiry, Quoted, Approved, Deposit Paid, In Progress, Completed, Cancelled.
- Treat Deposit Paid as booking confirmation.
- Do not introduce a separate Confirmed status unless explicitly approved.
- Treat the Service detail page as the operational command center for service info, quotation, deposit invoice, final invoice, payments, notes, and future suppliers/costing.

## Quotation Rules

- Quotation must belong to a Service.
- Quotation may keep `customer_id` as a snapshot/query helper, but Service is the primary business link.
- Quotation totals are financial values. Do not trust client totals as canonical.
- PostgreSQL RPC/server-side logic must be the source of truth for subtotal, discount, VAT, and grand total.
- Client-side totals are preview only.
- Sales can create quotations.
- Manager/Admin approval is required for quotation approval.
- Require `quotations:approve` for Manager/Admin only.
- After quotation approval, allow the user to manually create a Deposit Invoice.

## Invoice Rules

- Invoice must belong to a Service.
- Invoice can reference a Quotation.
- Invoice should keep customer snapshot/reference for reporting.
- Supported invoice types: `deposit`, `final`.
- Deposit amount is flexible by agreement, not a fixed percentage.
- Deposit amount is entered manually after quotation approval and validated against the quotation total.
- Deposit invoice is not a receipt. If VAT registered, it is an official tax invoice for the deposit/prepayment amount.
- Final invoice is issued later according to agreement.
- Use one invoice sequence for all invoice types: `INV-YYYY-0001`, `INV-YYYY-0002`.
- Use `invoice_type` to distinguish deposit vs final.
- Do not create separate DEP and FIN invoice sequences unless explicitly approved.
- Invoice data must snapshot seller and buyer data at issue time.
- Old invoices must not change if Company Settings change later.
- Issued invoices must not be deleted or freely edited.
- Void/cancel behavior must be handled later by proper status or credit-note logic.
- Require `invoices:write` for Accountant/Admin.
- Require `invoices:void` for Accountant/Admin only.

## VAT / ZATCA Rules

- Company Settings must include `vat_registration_status` or `vat_mode`, with modes for `not_registered`, `vat_registered_phase_1`, and `phase2_integrated`.
- Company Settings must support `vat_number`, `vat_effective_date`, `tin_number`, and `cr_number`.
- If company is `not_registered`: block Tax Invoice creation, block VAT 15% calculation, hide Tax Invoice label, hide VAT Number on invoice, and allow Quotation, Proforma Invoice, Commercial Invoice, Receipt, and Booking Confirmation.
- If company is VAT registered: allow Tax Invoice, require VAT Number, enable VAT 15%, use invoice snapshots, and use ZATCA-ready fields.
- Phase 2 / FATOORA integration is deferred.
- Keep the system extensible for future XML invoice, UUID, QR data, CSID, cryptographic stamp, clearance/reporting status, and ZATCA response storage.
- Do not claim full ZATCA/FATOORA integration unless it is actually implemented.

## Payment Rules

- Payment must be linked to invoice.
- Payment should also link to service and customer for reporting.
- Recording the deposit payment means Service status becomes Deposit Paid.
- Prevent overpayment unless explicitly approved.
- Payment updates invoice paid amount, balance due, and status.
- Require `payments:write` for Accountant/Admin.

## Suppliers / Future ERP Rules

- Suppliers are basic master data now.
- Supplier PO, supplier payments, event costing, expenses, and profit margin are deferred.
- Keep the system extensible for `purchase_orders`, `supplier_payments`, `service_expenses`, and `service_profit_report`.
- Do not build supplier PO/costing now unless explicitly approved.
- Do not design current schema in a way that blocks future supplier PO and profit-margin features.

## Backend Architecture Rules

- Keep the modular monolith for MVP.
- Do not introduce microservices, Kubernetes, queues, or extra infrastructure unless explicitly approved.
- Use Server Actions and server-side queries.
- Keep Supabase admin/service role server-side only.
- Enforce `requirePermission` in all write actions.
- Do not hide `UnauthorizedError` or `ForbiddenError` as empty arrays or null.
- Do not expose raw Supabase/database errors to UI.
- Perform financial calculations server-side/PostgreSQL-side.
- Treat client totals as preview only.
- Do not use fake success messages.
- Do not swallow errors with broad catch blocks that return success.

## Security Rules

- Production RLS hardening is required before real-data deployment.
- Do not use DEV_ONLY RLS with real company/client data.
- New public schema tables must enable RLS unless there is an approved reason not to.
- Review RPC permissions.
- Browser-side anon-key access must not expose sensitive CRM or financial data.
- Do not add AI/LLM features without an AI security gate.

## Design System Rules

- Preserve G7 BLUE visual identity: deep navy, gold accents, clean enterprise SaaS, professional not playful.
- Do not introduce random colors, gradients, fonts, layouts, or visual language.
- Reuse existing layout and components where possible: Dashboard layout, PageHeader, FilterBar, DataTable, StatusBadge, KPI cards, detail cards, form sections, empty state, loading state, access denied state, and print document layouts.
- Do not create one-off components when an existing pattern can be extended.
- UI must include appropriate loading states, empty states, validation errors, access denied states, success/failure feedback, and responsive behavior.

## Required Output Before Coding

Return these sections:

- Recommended product/ERP pattern
- Correct backend/data model direction
- Existing components/patterns to reuse
- Business rules that must be preserved
- Permissions required
- VAT/ZATCA implications
- Open decisions for the user
- Risks/tradeoffs
- Proposed implementation outline
- Explicit note: "Do not code yet until approved."

## Required Output After Coding

Return these sections:

- Verdict: Pass / Needs changes
- Product workflow findings
- ERP/business logic findings
- Backend/data model findings
- Financial calculation findings
- VAT/ZATCA findings
- RBAC/security findings
- Design system findings
- Accessibility/responsive findings
- Required fixes before commit
- Optional improvements
