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
- Invoices are siblings under Service / Booking and Approved Quotation.
- No `parent_invoice_id`, `deposit_invoice_id`, `related_invoice_id`, or invoice-to-invoice FK in MVP.
- Deposit Invoice is an advance/prepayment invoice, not a discount.
- Deposit amount must be > 0 and <= approved quotation total, allowing 100% advance.
- One active deposit invoice per service in the current MVP.
- Deposit creation guard must be based on `service_id`, not `quotation_id` only.
- Newly created deposit invoices use status = `draft` unless a real send action exists.
- Service must not be cancelled before creating a deposit invoice.
- Final Invoice must represent remaining uninvoiced balance, not the full quotation total again.
- Final invoice calculation: `final_invoice_amount = approved_quotation_total - SUM(active prior deposit/progress invoices)`.
- Payments are separate from invoices.
- Multiple payments against one invoice do not create multiple invoices.
- Payments affect collected/uncollected balance, not invoiced/uninvoiced balance.
- Active invoice definition: `status NOT IN ('voided','cancelled') AND voided_at IS NULL` plus `is_deleted = false` only if the column exists.
- TypeScript currently includes status 'voided', but the current DB CHECK may not allow 'voided'. This is a tracked schema/lifecycle gap, not permission to write status='voided'.
- Every invoice created must persist full historical snapshot fields at issue time, even if DB columns are nullable. Snapshot population must not be deferred.
- `document_label` must be derived from `vat_mode` at issue time.
- While `vat_mode = not_registered`, documents must remain Commercial Invoice / Proforma / Receipt only.
- No Tax Invoice, VAT 15%, VAT number, ZATCA XML, QR, or FATOORA behavior while `vat_mode = not_registered`.
- Financial records must use void/cancel/reversal workflows rather than hard deletion. Use soft delete for business records where applicable.
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
- **Status:** Code implementation complete through ADMIN-USER-MANAGEMENT-1C-B; real Clerk invitation/webhook smoke testing remains pending.
- **Decision:** Implemented Option D: Clerk Invitations API + invitation metadata + `user.created` webhook.
- **Metadata usage:** Used Clerk invitation metadata (`publicMetadata`) for the intended role.
- **Authorization rule:** Invitation metadata is bootstrap-only. CRM authorization strictly uses `app_users.role`.
- **Smoke limitation:** Real Clerk invitation/webhook smoke testing is still pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer explicitly approves creating a real test invitation/user.
- **No live user creation:** No real Clerk users/invitations were created during implementation.
- **Lockout reduction:** Self-deactivation, self-role-change, final-active-admin deactivation, and final-active-admin demotion are blocked server-side.
- **Webhook failure rule:** Enforced missing/invalid metadata check in `user.created` webhook. Invalid events are acknowledged but no `app_users` row is created and no fallback role is assigned.
- **1C UX/security hardening:** Implemented last-active-admin protection and replaced the native revoke-invitation `confirm()` dialog with an inline CRM-styled confirmation modal.

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
- **Status:** Implemented in ADMIN-USER-MANAGEMENT-1B code; real Clerk webhook smoke testing remains pending.
- **Remaining limitation:** Live verification still requires `CLERK_WEBHOOK_SIGNING_SECRET` to be configured and Mozfer approval before creating a real test invitation/user.
- **When to return:** Before production enablement, run the approved real Clerk invitation/webhook smoke test.
- **Known requirements:** Verify Svix signatures, reject invalid webhook requests, handle replay/idempotency, and avoid exposing webhook secrets.

## Idle Session Timeout / Inactivity Auto Logout
- **Status:** Deferred.
- **Reason deferred:** Core CRM and billing workflows are higher priority for the current stabilization/demo path.
- **When to return:** Before production use, especially if shared workstations or real customer data are involved.
- **Known requirements:** Define timeout duration, warning behavior, Clerk/session integration, and expected behavior across tabs.

## ZATCA / FATOORA Full Integration
- **Status:** Deferred full integration.
- **Reason deferred:** Full Saudi e-invoicing compliance can affect schema, signing, QR/XML generation, and operational process.
- **When to return:** Before issuing official Saudi tax invoices from the system (VAT registration / FATOORA phase).
- **Known requirements:** Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior. ZATCA/FATOORA XML, QR, invoice type codes 386/388, official PrepaidAmount XML, and XML references to advance invoices are deferred until VAT registration / FATOORA phase. Full integration requires separate reviewed design before issuing official Saudi tax invoices from the system. Planned nullable fields to consider only after approval: `invoice_uuid`, `zatca_status`, `qr_code_data`, `xml_hash`.

## Official CR and VAT Registration
- **Status:** Deferred/Pending.
- **Reason deferred:** Waiting for official CR document and official VAT registration confirmation.
- **When to return:** When official documents are provided.
- **Known requirements:** VAT Number, Tax Invoice issuance, ZATCA/FATOORA, and CR confirmation remain deferred/pending. Entity Unified No (7053901414) must not be treated as CR unless officially confirmed. Tax Invoice is blocked while `vat_mode = not_registered`.

## Company Settings Document Snapshot Wiring
- **Status:** Partially resolved; Quotations are wired, but Invoices still need wiring during ERP-3.
- **Reason deferred:** CS-A intentionally implements live singleton settings only. Existing quotation and invoice print views must not mutate when Company Settings changes. Quotation snapshot wiring is completed (`DOCUMENT-SNAPSHOT-WIRING-1B`).
- **When to return:** Before wiring Company Settings into invoice print views or before invoice issuance workflows depend on seller/legal/VAT/bank settings.
- **Known requirements:** New documents must snapshot seller legal names, CR, TIN, VAT mode, VAT number, VAT effective date if applicable, national address, terms, and any bank details displayed on the document. Existing documents must keep their own snapshots. Quotations have this implemented; Invoices remain.

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
- **Known requirements:** Progress / milestone invoice type is deferred. `invoice_prepayment_applications` is deferred until final settlement design or until multi-deposit/ZATCA-grade settlement requires it. Before implementing Final Invoice, run a settlement design review to decide whether simple SUM(active prior invoices) is enough or whether `invoice_prepayment_applications` must be introduced before Final implementation. Every invoice must belong to a Service and reference an approved quotation basis.

## Invoice Voiding, Credit Notes, And Refunds
- **Status:** Deferred.
- **Reason deferred:** Invoice voiding/cancellation can affect accounting, auditability, payment status, refunds, and future ZATCA direction.
- **When to return:** Before implementing invoice void/delete behavior, paid invoice cancellation, refunds, or credit notes.
- **Known requirements:** Credit/debit notes are deferred until invoices, payments, refunds, and lifecycle rules are stable. Financial records must use void/cancel/reversal workflows, not hard deletion. Future flow may require Void status, Credit Note, Refund, and audit trail. Do not allow casual deletion of issued or paid invoices in future design. Issued/paid financial records must be preserved for auditability.

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

## PRE-ERP-3-UX-DATA-BACKLOG-SYNC-1

### LIST-PAGINATION-PARITY-1
- **Status:** Deferred until after ERP-3 unless quick/safe to bundle separately
- **Reason:** Customers page currently showed 12 of 12 at once; Services currently has fewer records but should support pagination before growth. This is UX parity work, not a blocker for Company Settings cleanup.
- **Required future behavior:**
  - Customers list: 10 rows per page.
  - Services list: 10 rows per page.
  - Previous / Next controls when record count exceeds 10.
  - Preserve search/filter behavior across pages.

### QUOTATION-PDF-CLEANUP-1
- **Status:** Verified (data cleanup) / Print headers pending
- **Reason:** Database cleanup corrected official email, CR placeholder, and default terms in company_settings and existing quotation snapshots. PDF visual smoke confirmed the rendered PDF no longer shows markdown email or placeholder terms.
- **Required future behavior if still needed:**
  - PDF displays plain `info@g7blue.com`. (Verified)
  - PDF displays professional terms. (Verified)
  - PDF does not display fake CR placeholder. (Verified)
  - PDF still must not show Tax Invoice / VAT Number / ZATCA / VAT 15% while `vat_mode = not_registered`. (Verified)

#### QUOTATION-PDF-PRINT-SETTINGS-1
- **Status:** Pending (Before external/client-facing PDF sharing)
- **Reason:** Browser headers and footers (URL, date, page number) currently appear when printing/exporting PDF. This is print/export polish only. It is not a VAT/data correctness issue, because PDF data cleanup is verified.
- **Required future behavior:**
  - Provide a cleaner PDF/export experience where generated documents do not show browser URL/date/title/page footer artifacts.
  - Until fixed, user workaround: disable `Headers and footers` in the browser print dialog.
  - This must be fixed before external/client-facing PDF usage, even if ERP-3 can continue.

### ADMIN-USERS-SMOKE-1
- **Status:** Deferred until official test users / controlled smoke approval
- **Reason:** Admin user management logic appears conceptually correct, and Access Pending after self-registration is correct. Full real invite/webhook/revoke/role smoke requires controlled test accounts and explicit approval.
- **Required future smoke:**
  - Invite user with real test email only after Mozfer approval.
  - Verify pending invitation.
  - Verify revoke modal.
  - Verify role change protections.
  - Verify self-role/self-deactivate protections.
  - Verify final active Admin cannot be deactivated/demoted.

## Export Enhancements and UI Audit
- **Status:** Deferred.
- **Reason deferred:** Core export and permissions are stable, but data normalization and detailed reporting are separate scopes.
- **When to return:** Before building the Reports module or refining UX.
- **Known requirements:**
  - `CITY-NORMALIZATION-1`: Normalizing city inputs and old data values (e.g. DAMAM vs damam, Ryead, GFG). Treat as data quality/input normalization, not part of Customers export.
  - `QUOTATIONS-RBAC-AND-FILTER-AUDIT-1`: Audit quotation status/date filters, and Viewer visibility for Select Service, edit, and delete actions. Classify whether issues are UI-only or RBAC/security-related before implementation.
  - `LOGOUT-UX-1`: Fix Clerk sign-out redirect/cache/back behavior. Must verify Admin logout -> Viewer login and Viewer logout -> Admin login behavior. Protected pages must not remain accessible through browser back/cache after logout.
  - `SERVICES-REPORT-1`: Future dedicated report for services. (Each main module should eventually have its own dedicated report. Do not overload Customers Report with every module's details.)
  - `QUOTATIONS-REPORT-1`: Future dedicated report for quotations and statuses.
  - `INVOICES-REPORT-1`: Future dedicated report for invoices.
  - `PAYMENTS-REPORT-1`: Future dedicated report for payments.
  - `CUSTOMER-DETAIL-REPORT-AUDIT-1`: Future full report for one customer from `/customers/[id]`. Must start as readonly audit/design before implementation. Suggested workbook/PDF sections: Profile, Services, Quotations, Invoices, Payments.
  - `EXPORT-UI-ENHANCEMENTS-1`: Future export UI improvements (Export dropdown, Export current filtered view, Export selected customers, Configure export columns, Customer-specific export button inside Customer Detail page).
  - `CUSTOMERS-UI-LABEL-POLISH-1`: Review Customers table label currently using Revenue while value represents Total Quoted Amount. Prefer `Total Quoted` or `Quoted Amount` to avoid confusing quotation totals with actual revenue.
  - `DEMO-DATA-CLEANUP-1`: Review smoke/demo customers before production readiness. Decide whether to delete, archive, or isolate test data.
  - `CLERK-WEBHOOK-SYNC-1`: Verify Clerk invite acceptance and `app_users` auto-sync. Manual viewer provisioning was used during smoke; webhook sync remains future verification.

## ERP-3A TypeScript Type Mismatch
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
- **Known requirements:** Progress / milestone invoice type is deferred. `invoice_prepayment_applications` is deferred until final settlement design or until multi-deposit/ZATCA-grade settlement requires it. Before implementing Final Invoice, run a settlement design review to decide whether simple SUM(active prior invoices) is enough or whether `invoice_prepayment_applications` must be introduced before Final implementation. Every invoice must belong to a Service and reference an approved quotation basis.

## Invoice Voiding, Credit Notes, And Refunds
- **Status:** Deferred.
- **Reason deferred:** Invoice voiding/cancellation can affect accounting, auditability, payment status, refunds, and future ZATCA direction.
- **When to return:** Before implementing invoice void/delete behavior, paid invoice cancellation, refunds, or credit notes.
- **Known requirements:** Credit/debit notes are deferred until invoices, payments, refunds, and lifecycle rules are stable. Financial records must use void/cancel/reversal workflows, not hard deletion. Future flow may require Void status, Credit Note, Refund, and audit trail. Do not allow casual deletion of issued or paid invoices in future design. Issued/paid financial records must be preserved for auditability.

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

## PRE-ERP-3-UX-DATA-BACKLOG-SYNC-1

### LIST-PAGINATION-PARITY-1
- **Status:** Deferred until after ERP-3 unless quick/safe to bundle separately
- **Reason:** Customers page currently showed 12 of 12 at once; Services currently has fewer records but should support pagination before growth. This is UX parity work, not a blocker for Company Settings cleanup.
- **Required future behavior:**
  - Customers list: 10 rows per page.
  - Services list: 10 rows per page.
  - Previous / Next controls when record count exceeds 10.
  - Preserve search/filter behavior across pages.

### QUOTATION-PDF-CLEANUP-1
- **Status:** Verified (data cleanup) / Print headers pending
- **Reason:** Database cleanup corrected official email, CR placeholder, and default terms in company_settings and existing quotation snapshots. PDF visual smoke confirmed the rendered PDF no longer shows markdown email or placeholder terms.
- **Required future behavior if still needed:**
  - PDF displays plain `info@g7blue.com`. (Verified)
  - PDF displays professional terms. (Verified)
  - PDF does not display fake CR placeholder. (Verified)
  - PDF still must not show Tax Invoice / VAT Number / ZATCA / VAT 15% while `vat_mode = not_registered`. (Verified)

#### QUOTATION-PDF-PRINT-SETTINGS-1
- **Status:** Pending (Before external/client-facing PDF sharing)
- **Reason:** Browser headers and footers (URL, date, page number) currently appear when printing/exporting PDF. This is print/export polish only. It is not a VAT/data correctness issue, because PDF data cleanup is verified.
- **Required future behavior:**
  - Provide a cleaner PDF/export experience where generated documents do not show browser URL/date/title/page footer artifacts.
  - Until fixed, user workaround: disable `Headers and footers` in the browser print dialog.
  - This must be fixed before external/client-facing PDF usage, even if ERP-3 can continue.

### ADMIN-USERS-SMOKE-1
- **Status:** Deferred until official test users / controlled smoke approval
- **Reason:** Admin user management logic appears conceptually correct, and Access Pending after self-registration is correct. Full real invite/webhook/revoke/role smoke requires controlled test accounts and explicit approval.
- **Required future smoke:**
  - Invite user with real test email only after Mozfer approval.
  - Verify pending invitation.
  - Verify revoke modal.
  - Verify role change protections.
  - Verify self-role/self-deactivate protections.
  - Verify final active Admin cannot be deactivated/demoted.

## Export Enhancements and UI Audit
- **Status:** Deferred.
- **Reason deferred:** Core export and permissions are stable, but data normalization and detailed reporting are separate scopes.
- **When to return:** Before building the Reports module or refining UX.
- **Known requirements:**
  - `CITY-NORMALIZATION-1`: Normalizing city inputs and old data values (e.g. DAMAM vs damam, Ryead, GFG). Treat as data quality/input normalization, not part of Customers export.
  - `QUOTATIONS-RBAC-AND-FILTER-AUDIT-1`: Audit quotation status/date filters, and Viewer visibility for Select Service, edit, and delete actions. Classify whether issues are UI-only or RBAC/security-related before implementation.
  - `LOGOUT-UX-1`: Fix Clerk sign-out redirect/cache/back behavior. Must verify Admin logout -> Viewer login and Viewer logout -> Admin login behavior. Protected pages must not remain accessible through browser back/cache after logout.
  - `SERVICES-REPORT-1`: Future dedicated report for services. (Each main module should eventually have its own dedicated report. Do not overload Customers Report with every module's details.)
  - `QUOTATIONS-REPORT-1`: Future dedicated report for quotations and statuses.
  - `INVOICES-REPORT-1`: Future dedicated report for invoices.
  - `PAYMENTS-REPORT-1`: Future dedicated report for payments.
  - `CUSTOMER-DETAIL-REPORT-AUDIT-1`: Future full report for one customer from `/customers/[id]`. Must start as readonly audit/design before implementation. Suggested workbook/PDF sections: Profile, Services, Quotations, Invoices, Payments.
  - `EXPORT-UI-ENHANCEMENTS-1`: Future export UI improvements (Export dropdown, Export current filtered view, Export selected customers, Configure export columns, Customer-specific export button inside Customer Detail page).
  - `CUSTOMERS-UI-LABEL-POLISH-1`: Review Customers table label currently using Revenue while value represents Total Quoted Amount. Prefer `Total Quoted` or `Quoted Amount` to avoid confusing quotation totals with actual revenue.
  - `DEMO-DATA-CLEANUP-1`: Review smoke/demo customers before production readiness. Decide whether to delete, archive, or isolate test data.
  - `CLERK-WEBHOOK-SYNC-1`: Verify Clerk invite acceptance and `app_users` auto-sync. Manual viewer provisioning was used during smoke; webhook sync remains future verification.

## ERP-3A TypeScript Type Mismatch
- **Status:** Deferred until ERP-3B / Tracked as gap
- **Reason:** src/types/invoice.ts was not updated in ERP-3A because it is outside the approved file list.
- **When to return:** During ERP-3B Invoice Generation / Future Void Migration
- **Known requirements:** TypeScript currently includes status 'voided', but the current DB CHECK may not allow 'voided'. This must remain a tracked deferred schema gap until void/credit-note lifecycle migration. Type mismatch between schema fields (approved_quotation_id, invoice_type) and TypeScript type fields (quotation_id, type) is deferred to ERP-3B. Furthermore, snapshot_* columns are staged nullable jsonb and NOT NULL enforcement is deferred to ERP-3B. Composite FK enforcement is partial while service_id remains nullable. Payment workflow and confirmation remain deferred. Service status transition on invoice creation remains deferred.

## Global Invoice Wizard & Recent Invoicing Decisions
- **Status:** Deferred/Pending.
- **Reason deferred:** Invoice creation is currently from Service Billing Panel only to ensure safe data context.
- **When to return:** Future ERP-3F phase and production hardening.
- **Known requirements:**
  - Global Invoice Wizard is deferred as ERP-3F, not cancelled. It will live on the Invoices page later. It must select Service / Booking first, load the approved quotation, load Billing State, and allow Deposit or Final invoice creation only when safe. No free-form invoice creation without Service + Approved Quotation + Billing State.
  - Sales and Viewer currently need invoice read-scope review before production. Global invoice access should not be production-approved for Sales without an ownership/scoping model. This is deferred as production RBAC hardening, not part of the immediate invoice foundation patch.
  - Void/Credit Note lifecycle deferred.
  - ZATCA/FATOORA deferred until VAT registration.
  - Smoke data cleanup required before production handover.

### BILLING-FLEXIBILITY-1
Status: Complete (Manual Smoke Passed)
Decision: Deposit is optional, not mandatory. Direct Final Invoice without Deposit must be supported for full upfront payment cases.
Manual smoke evidence:
- Service: `SVC-2026-0008`
- Quotation: `QT-2026-0012`
- Invoice: `INV-2026-0008`
- No Deposit Invoice existed before final invoice creation.
- Final Invoice amount was `SAR 20,000.00`.
- Invoice was issued and paid.
- Duplicate active Final Invoice was blocked.
Correct accounting formula:
- `Final Invoice = Approved Quotation Total - SUM(active prior deposit/progress invoice grand_total)`
- Payments affect collected/uncollected balance, not invoiced/uninvoiced balance.
- Do not use: `Approved Quotation Total - SUM(amount_paid)`
- Reason: Using paid amount can cause over-invoicing when a Deposit Invoice is unpaid or partially paid.
- MVP policy: If an active Deposit Invoice is unpaid or partially paid, creating a Final Invoice is allowed only as long as total active invoice grand_total does not exceed the approved quotation total. This can leave two open balances for the customer and is accepted as a known MVP workflow gap until Void/Cancel lifecycle and Service status workflow are designed.

### PAYMENT-EVIDENCE-1
Status: Deferred.
Decision: Manual confirmed payment is acceptable for MVP only. Future workflow must support payment reference, receipt/proof attachment, recorded_by, recorded_at, confirmed_by, confirmed_at, and pending → confirmed approval.

### PAYMENTS-LIST-LIVE-1
Status: Complete.
Decision: Implemented in commit `f4471a2 feat(payments): show live payment records`. `/payments` now uses live read-only payment records through `getPaymentsList` and no longer renders mock `paymentsData` rows as real data. The query enforces `payments:read`. Manual smoke passed: payment count changed from `4` to `5`, confirmed collected changed from `SAR 27,499.95` to `SAR 32,503.04`, `PAY-2026-0005` linked to `INV-2026-0007`, amount `SAR 5,003.09`, method `Bank Transfer`, status `Confirmed`, and invoice list showed `INV-2026-0007` changed from `Issued` to `Paid`. Payment recording, invoice balances/status formulas, SQL, schema, migrations, packages, and tax/ZATCA behavior were unchanged.

### MOCK-DATA-AUDIT-1
Status: Pending.
Decision: Audit remaining mock/static app surfaces before further live-data polish. `INVOICE-KPI-LIVE-1` removed the stale `/invoices` KPI mock values. `DASHBOARD-LIVE-SUMMARY-1` removed the stale `/dashboard` KPI/sample values. Known remaining follow-up: `/suppliers` still uses static supplier data through `suppliersData`.

### INVOICE-KPI-LIVE-1
Status: Complete.
Decision: Implemented in commit `d89b520 fix(invoices): derive KPI cards from live invoices`. `/invoices` KPI cards now derive from live invoice list data. Static/mock invoice KPI values were removed: `SAR 2.4M`, `SAR 450K`, `SAR 1.2M`, `12 Invoices`, `Received This Month`, and `+18% vs Last Month`. Manual smoke passed with `Total Outstanding: SAR 0.00`, `Open Invoices: 0`, and `Total Collected: SAR 32,503.04`. Invoice table/list behavior, invoice creation, payment recording, invoice balance/status formulas, SQL, schema, migrations, packages, dashboard, suppliers, payments page, and tax/ZATCA behavior were unchanged.

### DASHBOARD-LIVE-SUMMARY-1
Status: Complete.
Decision: Implemented in commit `d25cb17 fix(dashboard): show live summary data`. `/dashboard` now uses live/read-only data where permissions allow and no longer renders old static/mock values such as `1,248`, `342`, `89`, `SAR 2.4M`, `SAR 450K`, Saudi Aramco, NEOM, Riyadh Season, Jeddah Corniche, or fake SAR sample quotation amounts. Manual smoke passed with `Total Customers: 14`, `Total Quotations: 12`, `Open Invoices: 0`, `Services: 8`, `Total Collected: SAR 32,503.04`, and `Pending Balance: SAR 0.00`. Recent Quotations now renders live rows or a safe empty/unavailable state. Customer, quotation, invoice, payment, and service write paths, invoice balance formulas, payment recording, SQL, schema, migrations, packages, and tax/ZATCA behavior were unchanged.

### SUPPLIERS-LIST-LIVE-1
Status: Pending.
Decision: `/suppliers` still uses static supplier data from `src/lib/data/suppliers.ts` via `suppliersData` in `src/app/(dashboard)/suppliers/page.tsx`. Replace with live supplier data only in a separate approved task; do not treat suppliers as live now.

### INVOICE-LIST-SORT-1
Status: Completed.
Decision: Implemented in commit `9c297a6`. Desired order is now implemented. Current data displays ascending from `INV-2026-0004` to `INV-2026-0008`. This did not reset invoice numbering, create fake invoices, or manually renumber existing invoices.

### INVOICE-NUMBER-GAP-AUDIT-1
Status: Deferred.
Decision: `INV-2026-0001`, `INV-2026-0002`, and `INV-2026-0003` are absent from the `invoices` table. Stored invoices currently start at `INV-2026-0004`. Latest stored invoice from smoke is `INV-2026-0008`. `number_sequences` for `invoice` / `2026` is `8`. Treat this as a development/smoke numbering gap. Do not reset invoice numbering. Do not create fake filler invoices. Do not manually renumber existing invoices. Future production financial lifecycle should use void/cancel/reversal rather than hard deletion.

### SERVICE-STATUS-WORKFLOW-1
Status: Stage 1 Completed.
Decision: Stage 1 manual Service status control is complete. Implemented in commit `0b0cc78 feat(services): add manual service status control`. Service status is now manually controlled from the Service detail page and saved in `services.status`. Manual smoke passed on `SVC-2026-0008`; the Service reached `Completed`, appeared correctly in Service detail and Services list, and persisted after UI refresh / navigation. This preserves the earlier history that no automation was implemented: the current MVP behavior is manual-only and does not validate quotation, invoice, payment, or actual delivery state before a manual status change.

### SERVICE-STATUS-GUARDED-TRANSITIONS-1
Status: Deferred / Post-MVP Review.
Decision: Future guarded transitions or warnings must be designed after MVP. They may consider quotation approval, invoice status, payment status, outstanding balance, cancellation reason, and actual service delivery, while preserving manual operational override where appropriate. Future rules may warn or require confirmation before marking `Completed` while active invoices still have balance due, warn before marking `Deposit Paid` if no deposit/progress payment exists, possibly guard `Approved` based on approved quotation state, and require cancellation reason when moving to `Cancelled`. Do not blindly block operational manual status changes; prefer warnings, confirmations, or role-based manual override before hard blocking.

### INVOICE-PDF-BREAKDOWN-1
Status: Complete.
Decision: Implemented in commit `b38a75f fix(invoices): add compact invoice pdf breakdown`. Deposit and final invoice PDFs now show compact display-only breakdown rows using persisted invoice fields and existing snapshot data only: Approved Quotation Total when available, Previous Invoices / Deposits when available, Total Amount, Amount Paid, and Balance Due. Manual visual smoke passed for `INV-2026-0004` and `INV-2026-0005`; both tested PDFs fit one A4 page after final duplicate footer cleanup. This did not change invoice creation, payment recording, quotation approval, service status, number generation, SQL, schema, migrations, packages, or financial formulas. It did not add Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior.

### INVOICE-PDF-LAYOUT-1
Status: Deferred / As Needed.
Decision: The compact invoice PDF smoke removed misleading hardcoded page-count text and eliminated the tested one-page split. If future invoices with many line items genuinely span multiple pages, add a proper page numbering strategy or remove any misleading page-count text. This is separate from `INVOICE-PDF-BREAKDOWN-1`.

### QUOTATION-VALIDITY-1
Status: Deferred.
Decision: Quotation Valid Until is not service end date. Default should come from company settings.

### SERVICE-BUDGET-GUARD-1
Status: Deferred.
Decision: Service estimated budget is advisory. Show warning if quotation total exceeds budget but allow save.

### GLOBAL-INVOICE-WIZARD-1
Status: Deferred.
Decision: Invoices page remains for list/issue/pay/PDF/status. Global invoice creation is deferred.
