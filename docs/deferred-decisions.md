# G7 BLUE CRM — Deferred Decisions

Deferred decisions are tracked here, not forgotten. Revisit each item before its dependent phase starts.

## Resolved ERP Decisions To Preserve

These are no longer open decisions and must remain aligned with `docs/project-roadmap.md`, `docs/project-status.md`, `docs/database-schema.md`, `docs/roles-permissions.md`, `README.md`, and `AGENTS.md`.

- Core operational entity: Service / Booking, not Project.
- Locked flow: Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- No standalone quotations. Quotations are Service-scoped.
- Quotation `customer_id`, if retained, is derived server-side from Service.
- One Service can have multiple Quotations. Do not add `UNIQUE(service_id)` to quotations.
- Quotation approval requires `quotations:approve`, separate from `quotations:write`.
- Non-draft quotations must not be fully editable through ordinary `quotations:write`.
- Approved quotations must not be soft-deleted through ordinary `quotations:write`.
- No Invoice without Service.
- Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence; do not create separate `DEP-` or `FIN-` sequences.
- Invoice type uses `invoice_type = deposit | final`.
- Payment must link to Invoice, and overpayment is prevented unless explicitly approved.
- Deposit is flexible, not fixed 50%.
- `Deposit Paid` requires a valid/cleared deposit payment. A Deposit Invoice alone and a pending payment do not confirm booking.
- Do not add a separate `Confirmed` status.
- `Cancelled` is terminal and non-linear, not a progress step.
- Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic.
- Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
- Financial records must use void/cancel/reversal workflows, not hard deletion. Use soft delete for business records where applicable.
- The current implemented Company Settings VAT field is `company_settings.vat_mode`.
- Quotation `valid_until` is offer expiry, not service execution date. It must be on or after Issue Date and, when Service Start Date exists, on or before `service.event_start_date`. If the Service already started before Issue Date, quotation create/update is blocked.

## Service Catalog
- **Status:** Deferred.
- **Reason deferred:** Manual quotation line items are enough for the current demo and avoid introducing a separate catalog table, CRUD, permissions, and form integration too early. This is distinct from the ERP `services` table, which is the Service / Booking operational unit.
- **When to return:** After invoices/payments are stable or when repeated service pricing becomes a workflow bottleneck.
- **Known requirements:** Future catalog-style service item table, catalog CRUD, permissions, quotation form dropdown, and snapshot-editable quotation items.

## Remaining Legacy Project Cleanup
- **Status:** Deferred after PRJ-CLEANUP-1.
- **Reason deferred:** PRJ-CLEANUP-1 only retired user-facing Projects UI and avoided schema, permission, type, and data refactors.
- **When to return:** Dedicated follow-up after Services/Bookings are stable enough to absorb remaining legacy references.
- **Known requirements:** Review project types/mock data, project permissions, `projects`/`project_tasks` legacy schema, customer `projects_count`, and supplier PRJ mock references.

## User Management + Clerk Sync
- **Status:** Deferred; required before production team usage. SEC-AUTHZ-APP-USER-GATE-1 now blocks unapproved Clerk users from dashboard access, but admin user management / invite workflow remains deferred.
- **Reason deferred:** RBAC foundation exists and dashboard membership is now gated, but full user management needs Clerk sync strategy and admin workflows. New Clerk signups are blocked from CRM access until an admin manually creates their `app_users` row.
- **When to return:** Before production team usage or when non-developer admins need to invite/manage users.
- **Known requirements:** `/settings/users`, `users:manage` permission, add/invite by email, role editing, deactivation, audit role changes, Clerk `user.created` webhook, email matching, and safe duplicate/missing email handling. `app_users.clerk_user_id` is TEXT, not UUID.
- **ADMIN-USER-MANAGEMENT-1 planning:** This phase must start with an inspection/design phase (`ADMIN-USER-MANAGEMENT-1A` - report only, no implementation) before `ADMIN-USER-MANAGEMENT-1B` (implementation). The design phase must inspect Clerk Invitations API behavior, whether `clerk_user_id` is available before invitation acceptance, whether a Clerk webhook is required, whether `app_users` can serve as the invitation store with `is_active=false`, and whether a separate `user_invitations` table is needed.
- **Admin Navigation:** Future navigation direction will place user access management under `Admin > Users` and operational approvals under `Admin > Review Center`. Do not place these under Settings (which remains for company/system configuration).

## Review Center
- **Status:** Deferred (`ADMIN-APPROVAL-CENTER-1`).
- **Reason deferred:** Core operational flows need to be stabilized first before centralizing pending decisions.
- **When to return:** After quotation approval, service status workflows, and invoicing flows are implemented.
- **Known requirements:** A unified review hub for pending decisions under `Admin > Review Center`. It is not admin-only as a whole; each tab must enforce its own permission:
  - Access/Users — Admin only
  - Quotations — `quotations:approve`
  - Services — future service status/cancellation permission
  - Payments — future `payments:write`
  - Invoices — future `invoices:write`

## Clerk Webhook Svix Signature Verification
- **Status:** Deferred; required before enabling Clerk webhooks in production.
- **Reason deferred:** Webhook sync is not yet implemented.
- **When to return:** Before implementing `/api/webhooks/clerk` or any Clerk event receiver.
- **Known requirements:** Verify Svix signatures, reject invalid webhook requests, handle replay/idempotency, and avoid exposing webhook secrets.

## Idle Session Timeout / Inactivity Auto Logout
- **Status:** Deferred.
- **Reason deferred:** Core CRM and billing workflows are higher priority for the current stabilization/demo path.
- **When to return:** Before production use, especially if shared workstations or real customer data are involved.
- **Known requirements:** Define timeout duration, warning behavior, Clerk/session integration, and expected behavior across tabs.

## ZATCA / FATOORA Full Integration
- **Status:** Deferred full integration.
- **Reason deferred:** Full Saudi e-invoicing compliance can affect schema, signing, QR/XML generation, and operational process.
- **When to return:** Before issuing official Saudi tax invoices from the system.
- **Known requirements:** Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior. Full integration requires separate reviewed design before issuing official Saudi tax invoices from the system. Planned nullable fields to consider only after approval: `invoice_uuid`, `zatca_status`, `qr_code_data`, `xml_hash`.

## Company Settings Document Snapshot Wiring
- **Status:** Deferred; required before printed quotations/invoices depend on live Company Settings.
- **Reason deferred:** CS-A intentionally implements live singleton settings only. Existing quotation and invoice print views must not mutate when Company Settings changes.
- **When to return:** Before wiring Company Settings into quotation/invoice print views or before invoice issuance workflows depend on seller/legal/VAT/bank settings.
- **Known requirements:** New documents must snapshot seller legal names, CR, TIN, VAT mode, VAT number, VAT effective date if applicable, national address, terms, and any bank details displayed on the document. Existing documents must keep their own snapshots.

## Company Logo Upload
- **Status:** Deferred.
- **Reason deferred:** Logo upload adds storage, file validation, permissions, and signed URL/security scope.
- **When to return:** When printed documents need a real uploaded logo.
- **Known requirements:** Storage bucket design, file size/type limits, upload RBAC, deletion/replacement rules, and document snapshot behavior.

## Server-side PDF Generation
- **Status:** Deferred.
- **Reason deferred:** Browser print is sufficient for the current quotation demo and avoids PDF dependencies/deployment complexity.
- **When to return:** When users need one-click generated PDFs, email attachments, stored PDFs, or consistent server-rendered documents.
- **Known requirements:** Evaluate PDF tool, document storage, download flow, email attachment flow, and invoice/customer record attachment behavior.

## Quotation Approval Workflow
- **Status:** QUOTE-APPROVAL-FLOW-1B implemented/code-ready. Migration was manually applied and schema is synced. Pending manual smoke. Several features remain deferred.
- **Reason deferred:** Core approval RBAC and uniqueness guards are implemented in 1B, but broader status transitions and audit trails need separate implementation.
- **When to return:** Before ERP-3 invoice creation or when business needs audit tracking.
- **Known requirements:**
  - Multiple draft quotations per Service are allowed for negotiation. More than one approved quotation per Service must be prevented. Approval requires `quotations:approve`, separate from `quotations:write`.
  - **Deferred:** Service status transition on quotation approval is deferred. Exact `Quoted` trigger remains future quotation workflow decision. `Sent` workflow/action is deferred.
  - **Deferred Audit Fields:** `approved_at`, `approved_by`, `sent_at`, `rejected_at`, `rejected_by` remain future-scope.
  - **Deferred ERP Scope:** Invoice/payment creation from approved quotation remains future ERP scope. VAT/ZATCA behavior remains out of scope.

## Customer Official Details Before ERP-3
- **Status:** Implementation review; CUST-OFFICIAL-DETAILS-1B was manually applied and DB-verified, and CUST-OFFICIAL-DETAILS-1C wires optional fields into the customer data layer, create UI, profile-only edit UI, and profile card. Mozfer manual smoke passed.
- **Reason deferred:** Future invoice buyer snapshot usage remains ERP-3 scope and must not be treated as implemented by customer profile fields alone.
- **When to return:** `CUST-OFFICIAL-DETAILS-1`, before ERP-3 invoice implementation.
- **Known requirements:** Customer official/billing fields remain optional/conditional and must not become mandatory for all customers. Individual customers must not carry mounted company-only registration/billing fields in the UI, and customer VAT number storage/display remains buyer identity data only. Customer VAT number storage/display does not enable Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior. Future ERP-3 invoices must snapshot buyer fields at issue time after separate reviewed implementation.

## List Pagination Parity
- **Status:** Follow-up.
- **Reason deferred:** Discovered during CUST-OFFICIAL-DETAILS-1C manual smoke; not part of the customer official/billing field scope.
- **When to return:** `LIST-PAGINATION-PARITY-1`, after critical/security blockers unless approved earlier.
- **Known requirements:** Customers and Services lists should match the `/quotations` pagination pattern with 10 rows per page and Previous/Next controls.

## Service Hub
- **Status:** SERVICE-HUB-1B implements the minimal read-only Service/Booking Hub detail page and is ready for review/manual smoke.
- **Reason deferred:** Service is the operational source of truth, but richer hub behavior still needs future workflow-safe slices after the minimal profile foundation.
- **When to return:** `SERVICE-HUB-1`, before or alongside ERP-3.
- **Known requirements:** The minimal hub includes a read-only status timeline, service schedule, customer context, and related quotations. Future invoice/payment cards require real service-linked financial records from ERP-3/ERP-4. Notes/activity/attachments and controlled status transition actions remain deferred. Service remains the operational source of truth.

## Full Invoice Schema And Service Linkage
- **Status:** ERP-3 scope.
- **Reason deferred:** Invoice schema/service linkage must wait for customer official details, quotation approval, and Service-centered hub/readiness work.
- **When to return:** ERP-3.
- **Known requirements:** Deposit/final invoices must be created from Approved Quotation + Service. No invoice without Service. No invoice without Approved Quotation. Invoice totals must derive from approved quotation snapshots, not arbitrary client input.

## Production RLS Hardening
- **Status:** SEC-RLS-BASELINE-1 manual Supabase SQL Editor apply and database verification completed; remaining production hardening is still required before hosted demo with real/semi-real data.
- **Reason deferred:** Development used `DEV_ONLY` RLS policies while application-level RBAC was being stabilized. The reviewed SEC-RLS-BASELINE-1 migration has now been manually applied and verified in the live database; DEV_ONLY policies returned zero rows and broad authenticated `USING true` / `WITH CHECK true` policies returned zero rows.
- **When to return:** Before any hosted demo with real/semi-real data and before production.
- **Known requirements:** RLS enabled checks passed for affected tables. Quotation RPC grants were verified as `anon_execute = false`, `authenticated_execute = false`, and `service_role_execute = true`. Real/semi-real data remains blocked by remaining production hardening and pre-demo controls: `company_settings` production RLS follow-up, demo-data/security decision, Viewer bank masking verification, sensitive Server Action rate limiting, raw error/security checks where applicable, and backup/monitoring/deployment readiness before production. It is no longer blocked by SEC-RLS manual apply itself. Review anon access, service-role paths, admin client server-only usage, and table-level policies. Add explicit production RLS follow-up for `company_settings` because it contains bank, legal, and VAT data. Do not treat UI hiding as security; server-side permission checks and server-side masking are required.

## Sensitive Server Action Rate Limiting
- **Status:** Deferred; required before production or any real/semi-real hosted demo.
- **Reason deferred:** Core ERP workflow is still being planned.
- **When to return:** Before exposing sensitive write paths outside local/dev usage.
- **Known requirements:** Consider rate limiting quotation creation, quotation approval, invoice creation, payment recording, and settings update. Rate limiting must complement server-side auth/RBAC and must not replace permission checks.

## Viewer Bank Detail Masking Verification
- **Status:** Deferred test case; required before real/semi-real data.
- **Reason deferred:** CS-A server-side masking exists, but production verification needs an explicit test pass.
- **When to return:** Before hosted demo with real/semi-real company data and before production.
- **Known requirements:** Viewer opens `/settings`; response/data passed to the client must not include full IBAN, bank account holder, or bank account values. This must be checked server-side, not only by inspecting hidden UI fields.

## Audit Logs UI
- **Status:** Deferred.
- **Reason deferred:** Audit storage foundations are more important than admin UI while core flows are still being built.
- **When to return:** Before production admin handoff or when business users need traceability in the UI.
- **Known requirements:** Identify important actions, log creates/updates/deletes/status changes, protect audit visibility with admin permission, and avoid exposing sensitive payloads.

## Advanced Dashboard / Reports
- **Status:** Deferred.
- **Reason deferred:** Dashboard metrics depend on stable invoices, payments, events/projects, and business definitions.
- **When to return:** After invoices/payments are implemented and reporting definitions are confirmed.
- **Known requirements:** Revenue summary, quotation/invoice/payment counts, outstanding balances, recent activity, event/project status, filters, and export needs.

## Customer Activity Timeline
- **Status:** Deferred.
- **Reason deferred:** Timeline events depend on finalized customer, quotation, invoice, payment, communication, and project/event workflows.
- **When to return:** After invoices/payments and core customer interactions are stable.
- **Known requirements:** Define tracked event types, permissions, ordering, filtering, and whether emails/WhatsApp/notes/attachments appear in the same timeline.

## Attachments
- **Status:** Deferred.
- **Reason deferred:** Storage, permissions, file type limits, and security scanning need dedicated design.
- **When to return:** When quotations, invoices, customer records, or event/project records need uploaded documents.
- **Known requirements:** Storage provider/bucket design, file size/type limits, RBAC checks, signed URLs, audit logs, and deletion/retention rules.

## Email / WhatsApp / Notifications
- **Status:** Deferred.
- **Reason deferred:** Communication workflows depend on finalized document states, customer activity model, and notification preferences.
- **When to return:** After invoices/payments are stable or when client communication becomes a demo requirement.
- **Known requirements:** Provider choice, templates, opt-in/consent, delivery status, audit trail, attachments, and customer timeline integration.

## Vendors / Suppliers
- **Status:** Deferred; business decision required.
- **Reason deferred:** Supplier costs and profit tracking may change event/project schema and reporting.
- **When to return:** During Phase BD or before event/project profitability features.
- **Known requirements:** Decide whether supplier costs, purchase orders, expense tracking, and profit margin should be tracked.

## Event-specific Fields
- **Status:** Partially resolved; event type confirmation deferred.
- **Reason deferred:** G7 is an events company. Services, quotations, and invoices need event context, but event taxonomy should be confirmed by a Saudi partner/business owner.
- **When to return:** ERP-1 Services planning and before event-aware invoice schema work.
- **Known requirements:** Prefer `event_start_date` and nullable `event_end_date` instead of only `event_date`, so both single-day and multi-day events are supported. `event_end_date` can be null for single-day/inquiry cases. Planned DB constraint: `CHECK (event_end_date IS NULL OR event_end_date >= event_start_date)`. Event fields should stay flexible at inquiry stage. Potential fields also include `event_name`, `event_venue`, and `event_type`.

## Multi-invoice per Quotation
- **Status:** Resolved for deposit/final invoices; additional staged invoice behavior remains deferred.
- **Reason deferred:** Events businesses may later need staged invoices beyond the approved deposit/final model.
- **When to return:** Before adding staged invoices beyond deposit/final.
- **Known requirements:** Invoice type uses `invoice_type = deposit | final`. Invoice numbering uses one shared `INV-YYYY-0001` sequence; do not create separate `DEP-` or `FIN-` sequences. Every invoice must belong to a Service and reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.

## Invoice Voiding, Credit Notes, And Refunds
- **Status:** Deferred.
- **Reason deferred:** Invoice voiding/cancellation can affect accounting, auditability, payment status, refunds, and future ZATCA direction.
- **When to return:** Before implementing invoice void/delete behavior, paid invoice cancellation, refunds, or credit notes.
- **Known requirements:** Do not implement now. Financial records must use void/cancel/reversal workflows, not hard deletion. Future flow may require Void status, Credit Note, Refund, and audit trail. Do not allow casual deletion of issued or paid invoices in future design. Issued/paid financial records must be preserved for auditability.

## Service Cancellation With Financial Records
- **Status:** Partially resolved; detailed financial reversal flow deferred.
- **Reason deferred:** Simple Service cancellation is straightforward only before invoice/payment records exist.
- **When to return:** ERP-1 Services status design and again before ERP-3/ERP-4 financial flows.
- **Known requirements:** Service cancellation requires `cancellation_reason`. If no invoice/payment exists, cancellation is simple. If invoice/payment exists, cancellation must not silently delete financial records. Future invoice void/refund/credit-note flow is required.

## Quotation Expiry Override
- **Status:** Deferred.
- **Reason deferred:** The base validity rule is clear, but business approval for overrides needs role and audit design.
- **When to return:** ERP-2 Service-linked Quotations approval flow.
- **Known requirements:** `valid_until` or `expiry_date` must be on or after issue date. Expired quotations cannot be approved without renewal/extension or authorized override. Exact override behavior remains deferred.

## Soft Delete And Financial Record Retention
- **Status:** Deferred technical decision.
- **Reason deferred:** Current schema uses soft-delete patterns, but future financial records need stricter retention rules.
- **When to return:** Before ERP-1 schema work and before invoice/payment delete or void behavior.
- **Known requirements:** Use soft delete for business records where applicable. SEC-SERVICE-INVARIANTS-1B blocks Service soft delete when non-deleted linked quotations exist. Future invoice/payment service deletion guards remain ERP-3/ERP-4 scope once service-linked financial records exist. Prefer `deleted_at` timestamp over only `is_deleted` for future soft deletes, or document current `is_deleted` usage as technical debt. Financial records must use void/cancel/reversal workflows rather than hard deletion. Issued/paid financial records must not be casually deleted. Soft-delete documentation cleanup remains a follow-up task: `DOC-SOFTDELETE-FIX`.

## Financial Rounding And Currency Snapshots
- **Status:** Deferred implementation detail; rule is required before ERP-3.
- **Reason deferred:** Invoice/payment implementation has not started.
- **When to return:** ERP-3 Invoices and ERP-4 Payments.
- **Known requirements:** Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic. Document SAR 2-decimal rounding rules. Financial rounding must be server-side/PostgreSQL-side. Currency should be snapshotted on issued documents.

## Planned ERP Indexes
- **Status:** Deferred technical planning.
- **Reason deferred:** ERP service-linked tables are not implemented yet.
- **When to return:** During SQL review for ERP-1 through ERP-4 and audit logs.
- **Known requirements:** Plan indexes on `services.customer_id`, `quotations.service_id`, `invoices.service_id`, `payments.invoice_id`, `payments.service_id` only if stored, and `audit_logs.user_id`.

## Migration Rollback Procedure
- **Status:** Deferred process hardening.
- **Reason deferred:** Current migration workflow is manual-review first, but rollback expectations need explicit documentation before risky schema changes.
- **When to return:** Before risky SQL, production migration, or real-data migration.
- **Known requirements:** Migrations are forward-only by default. Risky migrations require backup/export/snapshot before apply. Rollback should be a new corrective migration, not editing old applied migrations.

## Leads / Inquiries
- **Status:** Decision required before full Events CRM direction is locked.
- **Reason deferred:** It is unclear whether G7 needs to track inquiries before they become customers.
- **When to return:** During Phase BD or before customer workflow expansion.
- **Known requirements:** Decide whether to add leads/inquiries, conversion to customers, source tracking, follow-up status, and activity timeline integration.

## Backup / Monitoring / Error Logging
- **Status:** Deferred; required before production.
- **Reason deferred:** Core product flow is still being stabilized.
- **When to return:** Before hosted production use, and earlier if real/semi-real demo data is used.
- **Known requirements:** Supabase backup expectations, app error logging, uptime monitoring, build/deployment alerts, database monitoring, and incident response ownership.
