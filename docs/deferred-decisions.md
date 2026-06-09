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

## Server-side PDF Generation
- **Status:** Deferred.
- **Reason deferred:** Browser print is sufficient for the current quotation demo and avoids PDF dependencies/deployment complexity.
- **When to return:** When users need one-click generated PDFs, email attachments, stored PDFs, or consistent server-rendered documents.
- **Known requirements:** Evaluate PDF tool, document storage, download flow, email attachment flow, and invoice/customer record attachment behavior.

## Production RLS Hardening
- **Status:** Required before hosted demo with real/semi-real data.
- **Reason deferred:** Development uses `DEV_ONLY` RLS policies while application-level RBAC is being stabilized.
- **When to return:** Before any hosted demo with real/semi-real data and before production.
- **Known requirements:** `DEV_ONLY` RLS is not acceptable for real-data deployment. Review anon access, service-role paths, admin client server-only usage, and table-level policies.

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
- **Status:** Decision required before Phase 7A.
- **Reason deferred:** G7 is an events company. Quotations/invoices may need event context.
- **When to return:** Before event-aware invoice schema and RPC foundation.
- **Known requirements:** Potential fields: `event_name`, `event_date`, `event_venue`, `event_type`. Decision needed before invoice schema.

## Multi-invoice per Quotation
- **Status:** Decision required before Phase 7A.
- **Reason deferred:** Events businesses often use deposit + final payment.
- **When to return:** Before invoice schema and quotation-to-invoice workflow design.
- **Known requirements:** Answer: can one approved quotation generate multiple invoices? Potential flow: Quotation → Deposit Invoice → Final Invoice. Multiple staged invoices may also be needed.

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
