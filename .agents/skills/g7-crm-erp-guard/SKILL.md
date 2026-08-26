---
name: g7-crm-erp-guard
description: Domain-truth guidance for G7 BLUE CRM work materially involving Company Settings, Services, Customers, Quotations, Invoices, Payments, VAT/ZATCA, RBAC, ERP business logic, backend data flow, or financial calculations.
---

# G7 CRM ERP Guard

Route this repo-local guard when ERP/business logic, financial documents, VAT/ZATCA behavior, RBAC, backend data flow, or related domain truth materially applies. This is not a generic coding-style or execution-workflow skill.

Always follow `AGENTS.md` and Agent Control first. Do not touch `.env.local`, expose secrets, or use broad staging. Database, schema, RLS, RPC, migration, and data mutation work require explicit task authority and the exact supported target; do not edit already-applied migrations or mix unrelated cleanup into feature phases. This guard does not own Writer/Reviewer orchestration, publication workflow, or final Task Verdict.

## Project Identity

- Product: G7 BLUE Events CRM + ERP-like Billing System.
- Stack: Next.js App Router, TypeScript, Tailwind, Supabase/PostgreSQL, Clerk Auth.
- Architecture: modular monolith with external Supabase and Clerk.
- Business domain: event services, customers, quotations, invoices, payments, suppliers, VAT/ZATCA readiness.
- Core workflow: Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- Service is the operational unit and replaces Project for new ERP planning.
- Customer Profile is the hub.
- Services replaced Projects; use Project only when referring to old/deprecated code or schema.

## Applying the Guard

Use the active task to determine whether this guard materially applies; prompts do not need to name it. A clear bounded task authorizes ordinary in-scope inspection, implementation, diagnosis, repair, and proportional validation under Agent Control. Do not infer new product, financial, RBAC, database, or workflow authority. When a material domain uncertainty remains unresolved after relevant repository evidence is inspected, record it and seek a genuine Owner decision only when the task cannot safely continue.

## Relevant Context

Before making domain claims, inspect the relevant current docs and code for the affected phase. Use the following sources only when they materially apply:

- `AGENTS.md` for non-negotiable repo rules.
- `docs/project-roadmap.md`, `docs/project-status.md`, and `docs/deferred-decisions.md` for current phase and deferred business decisions.
- `docs/roles-permissions.md` and `src/lib/auth/permissions.ts` for RBAC facts.
- `docs/database-schema.md`, `docs/database-migrations.md`, `supabase/schema.sql`, and existing `supabase/migrations/` when discussing schema, RPC, RLS, or financial calculations. Do not create or apply SQL unless explicitly approved.
- Existing domain modules under `src/lib/*`, data helpers under `src/lib/data/*`, and dashboard routes under `src/app/(dashboard)/*`.
- The Design Guard and Design Contract for visual identity, component reuse, accessibility, RTL/LTR, responsive behavior, and interaction quality; inspect existing UI patterns when the ERP task includes a presentation surface.

When planning or reviewing, report only the material domain findings, preserved rules, unknowns, and evidence needed by the task. Review scope defaults to the current task/diff unless the task authorizes broader evidence. Agent Control owns the Writer/Reviewer lifecycle, report vocabulary, staging, commit, push, and final verdict.

## Core Product Rules

- Customer can be Individual or Company.
- CR Number and VAT Number are not required for all customers.
- Customer Profile is the main operational hub.
- Customer Profile should eventually show Overview, Services, Quotations, Invoices, Payments, and Notes / Activity.
- Service is the operational unit.
- Do not use "Project" as the main product entity unless referring to old/deprecated code.
- Quotations must belong to a Service.
- Invoices must belong to a Service.
- Do not create standalone quotations disconnected from a Service.
- Do not create standalone invoices disconnected from a Service.
- Existing demo quotation/dev data may be deleted or truncated when moving to the new Service-linked model, only with explicit approval.
- Do not deepen old standalone quotation/invoice assumptions when planning new phases.

## Service Rules

- Services replaced Projects.
- Use this Service status machine: Inquiry, Quoted, Approved, Deposit Paid, In Progress, Completed, Cancelled.
- Status exit criteria:
  - Inquiry: service/request captured.
  - Quoted: at least one quotation created/sent for the service.
  - Approved: customer approval recorded for a quotation.
  - Deposit Paid: deposit invoice payment recorded.
  - In Progress: operations started.
  - Completed: service delivered.
  - Cancelled: cancellation reason recorded.
- Deposit Paid means the booking/service is confirmed through a real Deposit Invoice payment.
- Do not introduce a separate `Confirmed` status unless the user explicitly approves.
- Service should plan for `event_start_date`, nullable `event_end_date`, `cancellation_reason`, and `assigned_to` or `sales_owner_id`.
- Service numbers should use `SVC-YYYY-0001` and be generated server-side.
- Treat the Service detail page as the operational command center for service info, quotation, deposit invoice, final invoice, payments, notes/activity, and future suppliers/costing.
- Do not build supplier costing inside Service unless explicitly approved.

## Quotation Rules

- Quotation must belong to a Service.
- Quotation may keep `customer_id` for reporting/query convenience, but Service is the primary business link.
- Quotation totals are financial values and must be calculated server-side/PostgreSQL-side.
- Client-side totals are preview only.
- Do not trust client-submitted subtotal, discount, VAT, or grand total.
- PostgreSQL RPC or server-side logic must be the source of truth for financial totals.
- Sales can create quotations if permitted.
- Manager/Admin approval is required for quotation approval.
- Require `quotations:approve` for approval.
- After quotation approval, a deposit invoice can be created manually.
- Deposit is not fixed 50%.
- Do not reintroduce a fixed deposit percentage unless explicitly approved.

## Invoice Rules

- Invoice must belong to a Service.
- Invoice can reference a Quotation.
- Invoice should keep customer/service references for reporting.
- Use invoice types `deposit` and `final`.
- Deposit invoice is created manually after quotation approval.
- Deposit amount is flexible by agreement.
- Deposit amount is entered manually.
- Deposit amount must be validated against quotation/service total.
- Deposit invoice is not just a receipt.
- If the company is VAT registered, the deposit invoice may be an official tax invoice for the deposit/prepayment amount.
- Final invoice is issued later based on agreement/completion.
- Use one invoice sequence for all invoice types: `INV-YYYY-0001`, `INV-YYYY-0002`.
- Use `invoice_type` to distinguish deposit vs final.
- Do not create separate `DEP-` and `FIN-` invoice sequences unless explicitly approved.
- Invoice data must snapshot seller and buyer data at issue time.
- Old invoices must not change if Company Settings change later.
- Issued invoices must not be freely edited or deleted.
- Voiding/canceling issued invoices should use proper status, void, or credit-note direction later.
- Require `invoices:write` for invoice writes.
- Require `invoices:void` for voiding.

## Company Settings Rules

- Company Settings is seller/master-company configuration.
- Do not treat Company Settings as mutable history for already-created documents.
- Settings can provide defaults for new documents only.
- Existing quotations/invoices must keep their own snapshots.
- Company Settings should include or plan for company Arabic name, company English name, official email, official phone, address/national address, CR number, TIN / الرقم المميز, VAT number if registered, VAT registration status or VAT mode, VAT effective date, currency, default VAT percent, default terms, bank name, IBAN, bank account holder, and logo later if approved.
- Logo upload adds storage/security scope. Defer real upload unless needed.
- Company Settings changes must not retroactively alter old printed documents.
- If live settings are wired into print views before snapshots exist, warn that old documents may change visually or legally.

## VAT/ZATCA Rules

- Company Settings must support `vat_registration_status` or `vat_mode`, `not_registered`, `vat_registered_phase_1`, `phase2_integrated`, `vat_number`, `vat_effective_date`, `tin_number`, and `cr_number`.
- If company is `not_registered`, block Tax Invoice creation.
- If company is `not_registered`, block VAT 15% calculation by default.
- If company is `not_registered`, hide the "Tax Invoice" label.
- If company is `not_registered`, hide VAT Number on invoice.
- If company is `not_registered`, do not show "Total including VAT".
- If company is `not_registered`, allow Quotation, Proforma Invoice, Commercial Invoice, Receipt, and Booking Confirmation.
- If company is VAT registered, allow Tax Invoice.
- If company is VAT registered, require VAT Number.
- If company is VAT registered, enable VAT 15%.
- If company is VAT registered, snapshot seller and VAT data at issue time.
- Do not claim `phase2_integrated` unless real FATOORA integration exists.
- Full ZATCA/FATOORA Phase 2 integration is deferred.
- Keep the design extensible for future XML invoice, invoice UUID, QR data, CSID, cryptographic stamp, clearance/reporting status, and ZATCA response storage.
- Do not claim legal/tax compliance beyond what is actually implemented.
- If unsure, tell the user accountant/ZATCA review is required.

## Payment Rules

- Payment must be linked to an invoice.
- Payment is connected to Service through the Invoice.
- If `service_id` is stored on payments for query convenience, it must match the invoice's `service_id` and be enforced in the data layer, preferably with database design.
- Recording payment for a Deposit Invoice means Service status becomes `Deposit Paid`.
- If a customer pays before an invoice exists, require creating a Deposit Invoice first or prevent recording the payment until an invoice exists.
- Payment updates invoice paid amount, balance due, and payment status.
- Prevent overpayment unless explicitly approved.
- Require `payments:write`.
- Do not treat payment as invoice creation.
- Do not mark a Service as Deposit Paid without a real recorded payment.

## Supplier/Future ERP Rules

- Suppliers are basic master data now.
- Supplier Operations V1 is complete for internal, Service-scoped Allocation and Supplier Booking create/cancel workflows. Supplier Bookings use the Supplier Booking / SBK terminology; do not use Internal PO / Purchase Order. Standalone Booking routes, portals, customer-facing documents, invoices/payments, actual costing, and margin reporting remain deferred.
- Supplier payments, service expenses, event costing, and profit margin are deferred.
- Keep current design extensible for supplier bookings, supplier payments, service expenses, event costing, and service profit reports.
- Do not build supplier bookings/costing now unless explicitly approved in its planned sequence.
- Do not design schema/UI in a way that blocks these future modules.

## Backend Architecture Rules

- Keep modular monolith for MVP.
- Do not introduce microservices for MVP.
- Do not introduce Kubernetes for MVP.
- Do not introduce queues/workers unless explicitly approved.
- Use Server Actions and server-side queries.
- Keep Supabase admin/service role server-side only.
- Enforce `requirePermission` in all write actions.
- Do not hide Unauthorized/Forbidden errors as empty arrays or null success.
- Do not expose raw Supabase/database errors to UI.
- Keep financial calculations server-side/PostgreSQL-side.
- Treat client totals as preview only.
- Do not use fake success messages.
- Do not swallow errors with broad catch blocks that return success.
- SQL and migrations require explicit review before creation/application.

## RBAC/Security Rules

- Recommend `settings:write` for Admin only unless the user approves Accountant.
- Use `settings:read` for Admin, Accountant, and maybe Manager/Viewer depending existing roles.
- Use `quotations:approve` for Manager/Admin.
- Use `services:update_status` for Operations/Manager/Admin.
- Use `invoices:write` for Accountant/Admin.
- Use `invoices:void` for Accountant/Admin.
- Use `payments:write` for Accountant/Admin.
- Production RLS hardening is required before real-data deployment.
- DEV_ONLY RLS must not be used with real company/client data.
- New public tables must enable RLS unless explicitly approved otherwise.
- Review RPC permissions.
- Browser-side anon key must not expose sensitive CRM or financial data.
- Do not add AI/LLM features without an AI security gate.

## ERP Presentation Boundary

The Design Guard and Design Contract own visual identity, component reuse, accessibility, RTL/LTR, responsive behavior, and interaction quality. This guard supplies the domain constraints that presentation must not violate: permission-aware treatment, customer/supplier financial separation, safe financial and operational state presentation, server-authority boundaries, and no invented workflow or product facts.

## Phase Planning Behavior

When planning a phase, prefer narrow safe slices.

For Company Settings, recommend:

- CS-A: Company Settings Mini: live singleton settings, legal/VAT/bank/default terms, admin form, VAT mode/defaults.
- CS-B: Document Snapshot Wiring: new quotations/invoices snapshot seller/buyer/legal/VAT terms at creation/issue time, and old documents do not change when settings change.

Warn if the user tries to wire live settings into old print documents before snapshots exist.

For Services, recommend:

- Design Service as the operational unit.
- Connect new quotations/invoices/payments under Service.
- Avoid standalone quotation/invoice creation.
- Keep supplier costing deferred.

For invoices, recommend:

- Schema/review first.
- Snapshot rules first.
- VAT mode rules first.
- Sequence rules first.
- Payments and receipt logic separately.

## Quality Bar

- Be concrete and project-specific.
- Do not give generic ERP advice.
- Do not over-engineer.
- Do not make legal/tax claims that are not implemented in code.
- Do not claim FATOORA/ZATCA compliance unless real integration exists.
- Prefer safe, reviewable phases.
- A clear bounded task is sufficient for ordinary in-scope work; seek an Owner decision only for product invention, financial authority, RBAC expansion, database mutation, production/deployment, destructive action, or real scope expansion.
- Always protect existing business decisions.

## Runtime Validation
Use proportional validation for the affected ERP slice: focused tests, type/lint checks, diff checks, and a build when the task or build-affecting risk warrants it. Documentation-only changes do not require runtime validation unless the task requires it.

## Internal Supplier Allocation Cost Estimation Scope
Internal supplier allocation cost estimation inside Service is approved for Admin/Manager internal planning only.
This includes:
- `estimated_unit_cost`
- `estimated_total_cost`
- `cost_source`
- supplier allocation cost visibility with RBAC redaction
This approval covers the technical scope of storing and displaying internal allocation cost estimates with RBAC redaction. It does not retroactively approve any governance process gap. It does not mean full supplier costing is complete.

## Deferred Broader Supplier Costing
The following remain deferred:
- supplier costing/margin reports
- rate-card automation
- rate-card snapshot workflow
- standalone Supplier Booking routes, PDFs, messages, portal, edit/delete/restore, status expansion, invoices/payments, actual costing, and margin reporting
- supplier invoices/payments
- customer-facing supplier cost exposure
- customer PDF supplier cost exposure
- public/customer portal supplier cost exposure
- quotation automation from supplier cost
Do not mark these complete.

## Supplier Allocation Status State Machine
Approved statuses: `draft`, `planned`, `selected`, `cancelled`
Forward movement: `draft` -> `planned`, `planned` -> `selected`
Allowed same-state persistence: `draft` -> `draft`, `planned` -> `planned`, `selected` -> `selected`
Blocked through update: `planned` -> `draft`, `selected` -> `planned`, `selected` -> `draft`, any -> `cancelled`, `cancelled` -> any
Cancellation must happen only through cancel action.

## selected Terminology
`selected` means preferred supplier allocation for internal planning only.
`selected` does not mean `Supplier Booking`.
`selected` does not mean supplier commitment.
`selected` does not mean financial commitment.

## Sales / Pricing Clarification
Early-stage supplier cost estimates inform Admin/Manager pricing decisions directly.
Sales does not have direct access to supplier allocation cost data in MVP.
Sales relies on Admin/Manager-provided or Admin/Manager-approved quotation pricing rather than viewing supplier estimates independently.

## Server-Action Defense-in-Depth
Server actions should enforce `supplier_allocations:read_cost` when accepting cost-bearing create/update input.
UI hiding alone is not sufficient.

## SAR-Only Currency
Supplier allocation currency is `SAR`-only for MVP.
Zod schemas and server actions must reject non-`SAR` currency.
UI fixed value alone is not enough.

## Service Status Timing
Supplier allocations may be created during active Service planning for internal cost estimation.
Create/update is blocked only for Services in: `Cancelled`, `Completed`.
Supplier allocations do not create supplier commitment, issue Supplier Bookings, confirm supplier booking, or create financial commitment.

## Genuine Domain Escalation
Seek an Owner decision only for:
- new business workflow decisions
- RBAC expansion to new roles
- supplier cost exposure changes
- customer-facing/PDF/public route supplier cost changes
- DB/RLS/migration changes
- new dependencies
- rate-card automation
- Supplier Booking scope expansion beyond the locked internal Service Detail create/cancel workflow
- supplier invoice/payment workflows
- costing/margin report workflows
- security or required-validation failures that cannot be repaired inside the authorized boundary

No routine escalation is required for implementation that follows locked decisions, documentation synchronization matching approved decisions, directly affected UI within approved boundaries, proportional validation, publication expressly authorized by the task, or small refactors that do not change business logic, security, RBAC, database, or public/customer-facing behavior.

## Cursor Audit Priority Gates & Blockers
Supplier Bookings Domain Gate:
Do not start Supplier Bookings Domain/actions/UI/RBAC while allocation cancel/delete/restore can mutate a source allocation that has an active supplier_booking.

Active supplier_booking =
supplier_bookings.is_deleted = false
AND supplier_bookings.status <> 'cancelled'.

Supplier audit user columns store Clerk userId strings as text. Do not cast Clerk user IDs to UUID.

## Supplier Operations V1 Rules

- Supplier Allocations and Supplier Bookings are internal Service-scoped workflows. Keep their costs out of customer-facing routes, quotations, invoices, PDFs, and portals.
- Booking creation and Allocation restore require an active, non-deleted, non-blacklisted Supplier. New, updated, cancelled, deleted, restored, and Booking-cancelled records remain blocked for Completed or Cancelled Services.
- Allocation edit, transitions, cancel, delete, restore, and Booking cancel must use conditional affected-row checks and return safe stale/conflict presentation. These checks are application-layer and nontransactional.
- An active Booking (`is_deleted = false` and `status <> cancelled`) locks Allocation edit, transition, cancel, delete, and restore. Booking cancellation requires a non-empty reason.
- Manual Allocation quantity follows `NUMERIC(10,3)` and unit cost follows `NUMERIC(14,2)`; generated totals are never accepted from clients.
- Rate-card allocation creation requires an active, non-deleted card within `valid_from` / `valid_to`; rate-card allocations cannot be deleted or restored.
- Preserve distinct load-failure and empty states plus accessible English/Arabic RTL cancellation dialogs.
- Do not claim browser runtime verification or production readiness from automated tests or local server availability.
