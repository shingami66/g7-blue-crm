# G7 BLUE CRM — Deferred Decisions

Deferred decisions are tracked here, not forgotten. Revisit each item before its dependent phase starts.

## Service Catalog
- **Status:** Deferred.
- **Reason deferred:** Manual quotation line items are enough for the current demo and avoid introducing a services table, CRUD, permissions, and form integration too early.
- **When to return:** After invoices/payments are stable or when repeated service pricing becomes a workflow bottleneck.
- **Known requirements:** Future `services` table, services CRUD, permissions, `/services` page, quotation form dropdown, and snapshot-editable quotation items.

## User Management + Clerk Sync
- **Status:** Deferred; required before production team usage.
- **Reason deferred:** RBAC foundation exists, but full user management needs Clerk sync strategy and admin workflows.
- **When to return:** Before production team usage or when non-developer admins need to invite/manage users.
- **Known requirements:** `/settings/users`, `users:manage` permission, add/invite by email, role editing, deactivation, audit role changes, Clerk `user.created` webhook, email matching, and safe duplicate/missing email handling. `app_users.clerk_user_id` is TEXT, not UUID.

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
- **Known requirements:** Decision required before invoice schema: are invoices official Saudi tax invoices or internal/proforma first? Planned nullable fields to consider: `invoice_uuid`, `zatca_status`, `qr_code_data`, `xml_hash`.

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

## Production RLS Hardening
- **Status:** Required before hosted demo with real/semi-real data.
- **Reason deferred:** Development uses `DEV_ONLY` RLS policies while application-level RBAC is being stabilized.
- **When to return:** Before any hosted demo with real/semi-real data and before production.
- **Known requirements:** `DEV_ONLY` RLS is not acceptable for real-data deployment. Review anon access, service-role paths, admin client server-only usage, and table-level policies. Add explicit production RLS for `company_settings` because it contains bank, legal, and VAT data. Do not treat UI hiding as security; server-side permission checks and server-side masking are required.

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
- **Status:** Decision required before Phase 7A.
- **Reason deferred:** Events businesses often use deposit + final payment.
- **When to return:** Before invoice schema and quotation-to-invoice workflow design.
- **Known requirements:** Answer: can one approved quotation generate multiple invoices? Potential flow: Quotation → Deposit Invoice → Final Invoice. Multiple staged invoices may also be needed.

## Invoice Voiding, Credit Notes, And Refunds
- **Status:** Deferred.
- **Reason deferred:** Invoice voiding/cancellation can affect accounting, auditability, payment status, refunds, and future ZATCA direction.
- **When to return:** Before implementing invoice void/delete behavior, paid invoice cancellation, refunds, or credit notes.
- **Known requirements:** Do not implement now. Future flow may require Void status, Credit Note, Refund, and audit trail. Do not allow casual deletion of issued or paid invoices in future design. Issued/paid financial records must be preserved for auditability.

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
- **Known requirements:** Prefer `deleted_at` timestamp over only `is_deleted` for future soft deletes, or document current `is_deleted` usage as technical debt. Issued/paid financial records must not be casually deleted.

## Financial Rounding And Currency Snapshots
- **Status:** Deferred implementation detail; rule is required before ERP-3.
- **Reason deferred:** Invoice/payment implementation has not started.
- **When to return:** ERP-3 Invoices and ERP-4 Payments.
- **Known requirements:** Document SAR 2-decimal rounding rules. Financial rounding must be server-side/PostgreSQL-side. Currency should be snapshotted on issued documents.

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
