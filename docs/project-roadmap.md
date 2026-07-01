# G7 BLUE CRM - Roadmap & Execution Plan

## 1. Workflow Rule
**Plan -> Implement -> Build -> Manual Test -> Audit -> Commit -> Push -> PR -> Merge**

After every successful merge:
- update `docs/project-status.md`
- update `docs/project-roadmap.md`
- update `docs/deferred-decisions.md` when decisions are added, resolved, or deferred
- mark completed checklist items
- add branch/commit/PR notes
- update "Current Active Phase"

## Final Approved ERP Decisions

These decisions are locked for G7 BLUE CRM planning and must stay aligned across project docs:

- The core operational entity is **Service / Booking**, not Project. Legacy `projects` may remain historically, but new ERP work must follow Service.
- The locked workflow is **Customer Profile -> Service -> Quotation -> Invoice -> Payment**.
- Quotations are Service-scoped. No standalone quotations are allowed.
- `customer_id` on quotations, if retained for reporting/query convenience, must be derived server-side from the Service.
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

## 2. Current Priority

### 🚧 Cursor Audit Priority Gates & Blockers
P0 before Supplier Bookings Domain:
1. SUPPLIER-AUDIT-COLUMNS-TEXT-FIX-1: CLOSED
2. SUPPLIER-ALLOCATION-BOOKING-GUARD-1: NEXT / BLOCKER

After P0 gates:
- Supplier Bookings Domain
- Supplier Bookings server actions
- Supplier Bookings UI
- Supplier Bookings RBAC

P1 soon / before production:
- INVOICE-READ-BOUNDARY-HARDEN-1
- SERVICE-STATUS-DIRECT-FINAL-PATH-1
- CUSTOMER-PO-INVOICE-GATE-1
- INVOICE-ZERO-FINAL-GUARD-1
- PUBLIC-HEALTH-ROUTE-HARDEN-1
- MONEY-AUDIT-LOG-COVERAGE-1

P2 before production / deferred:
- INVOICE-SERVICE-ID-NOT-NULL-1
- SEC-RLS-PRODUCTION-POLICIES-1
- INVOICE-VOID-STATUS-MIGRATION-1
- INVOICE-SNAPSHOT-FREEZE-POINT-1
- SUPPLIER-BLACKLIST-IMPACT-CHECK-1

### 🚧 Locked Next CRM Priorities
0. `SEC-AUTHZ-APP-USER-GATE-1`
   - Security blocker: Clerk-authenticated users without an `app_users` row could access dashboard and internal CRM.
   - Fix: dashboard layout now requires active `app_users` membership; blocked users redirect to `/unauthorized`.
   - `/services(.*)` added to Clerk protected routes.
   - No schema changes, no SQL, no users inserted or promoted.
   - `SEC-AUTHZ-APP-USER-GATE-1` implementation passed manual verification. Unapproved Clerk users are blocked from dashboard/internal CRM. Existing active admin access verified.
   - `QUOTE-APPROVAL-FLOW-1B` remains in stash, pending restoration and smoke after this security fix is committed/merged.
1. `RBAC-QUOTATIONS-APPROVE-1`
   - Ready for PR: `quotations:approve` added to Manager in `src/lib/auth/permissions.ts`.
   - Keep approval separate from ordinary `quotations:write`.
   - Required before quotation approval flow and ERP-3 invoices.
2. `CUST-OFFICIAL-DETAILS-1`
   - CUST-OFFICIAL-DETAILS-1B manually applied and DB-verified: optional/conditional customer official and billing fields are present in the database.
   - Fields include customer type (Individual / Company), legal name, Commercial Registration number, VAT number, National Address fields, billing email, finance contact, payment terms, and PO required flag.
   - `supabase/schema.sql` now matches the verified DB state for these fields.
   - CUST-OFFICIAL-DETAILS-1C wires the fields into the customer data layer, create UI, profile-only edit UI, and customer profile card; Mozfer manual smoke passed and the slice is ready for pre-commit review.
   - Future invoice buyer snapshots remain ERP-3 scope; customer VAT number storage does not enable Tax Invoice/ZATCA behavior.
3. `SEC-SERVICE-INVARIANTS-1`
   - Ready for review: Service creation now validates active/non-deleted customer server-side.
   - Ready for review: Service soft delete now blocks non-deleted linked quotations.
   - Future invoice/payment service deletion guards remain ERP-3/ERP-4 scope once service-linked invoices/payments exist.
4. `SERVICE-HUB-1`
   - SERVICE-HUB-1B implements the minimal Service/Booking Hub detail page to replace the old user-facing project hub concept.
   - Includes a read-only status timeline, service schedule, customer context, and related quotations.
   - Does not add invoice/payment cards, fake financial data, status transition actions, notes/activity, or attachments.
   - Service remains the operational source of truth.
5. `QUOTE-APPROVAL-FLOW-1`
   - `QUOTE-APPROVAL-FLOW-1B` completed. Migration was manually applied and schema is synced. Admin smoke passed.
   - Multiple draft quotations per Service are allowed for negotiation.
   - More than one approved quotation per Service must be prevented.
   - Required before ERP-3 invoice creation.
6. `ERP-3`
   - Deposit/final invoices must be created from Approved Quotation + Service.
   - No invoice without Service.
   - No invoice without Approved Quotation.
   - Invoice totals must derive from approved quotation snapshots, not arbitrary client input.

### ERP-3B Docs & Implementation Next Steps
1. Payment MVP
2. Environment / UAT / smoke test docs
3. Global Invoice Wizard ERP-3F
4. Void / Cancel / Credit Note lifecycle
5. ZATCA/FATOORA after VAT registration

*Previous Decisions Retained:*
- Final Invoice Settlement Design accepted with SIMPLE_SUM_FOR_T018 (subtracts active prior invoices, not payments).
- invoice_prepayment_applications remains deferred.

### DOC-COMPANY-DOCUMENT-RULES-1A - Documentation + Official Logo Asset
Status: Completed

Checklist:
- [x] Record official company identity, logo path, TIN, VAT status (Not Registered).
- [x] Document generation rules for Quotations, Deposits, and Proforma.
- [x] Document required snapshot rules for generated documents.
- [x] Required before document branding or invoice implementation.

### DOCUMENT-BRANDING-PRINT-1B - Apply G7 BLUE Branding to Print/PDF Views
Status: Completed

Checklist:
- [x] Apply official G7 BLUE identity and logo to Quotation PDF/print views.
- [x] Apply official G7 BLUE identity and logo to Invoice PDF/print views.
- [x] Remove fake VAT, Tax Invoice, and CR values.
- [x] Use Entity Unified No 7053901414 and TIN 3146944674.
- [x] Retain not_registered VAT status.

### DOCUMENT-SNAPSHOT-WIRING-1B - Document Snapshot Wiring
Status: Completed

Checklist:
- [x] Quotation snapshot UI wiring, DB migrations, backfill, RPC updates, and schema sync.
- [x] company_settings and customers are decoupled from printed Quotations.
- [x] Verify that ERP-3 (Invoices) is ready to start when authorized.

### COMPANY-SETTINGS-CLEANUP-1B - Company Settings Data Cleanup
Status: Applied and verified in Supabase

Checklist:
- [x] Make `cr_number` optional in DB and Zod schemas to prevent `sar` placeholders.
- [x] Sanitize `official_email` in Zod schemas to strip markdown/mailto.
- [x] Propose SQL to correct existing bad `company_settings` data and frozen `quotations.snapshot_seller` demo data.
- [x] Repo implementation committed and pushed in `0b826a9`.
- [x] Manual Supabase migration apply and DB cleanup applied manually.
- [x] Live database verified for this cleanup (0 bad snapshots).
- [x] `company_settings.cr_number` is nullable in DB and is `NULL`.
- [x] `company_settings.official_email` is plain `info@g7blue.com`.
- [x] `company_settings.default_terms` uses professional terms.
- [x] No Tax Invoice / VAT 15% / VAT Number / ZATCA behavior is enabled while `vat_mode = not_registered`.
- [x] Do not apply SQL automatically.
- [x] `SETTINGS-EDIT-MODE-1` remains separate/deferred.

TAX-0 cleanup is complete, and SEC-RLS-BASELINE-1 manual Supabase apply/database verification is complete. DEV_ONLY broad authenticated policies were removed from the live database. However, real or semi-real company/client data remains blocked until remaining production hardening and pre-demo controls are complete: `company_settings` production RLS follow-up, demo-data/security decision, Viewer bank masking verification, sensitive Server Action rate limiting, raw error/security checks where applicable, and backup/monitoring/deployment readiness before production.

### QUOTE-VALIDITY-RULE-1 - Enforce Quotation Validity Against Service Schedule
Status: Completed

Checklist:
- [x] Service Schedule is read-only context in quotation create UI.
- [x] Issue Date is read-only.
- [x] `Quotation Valid Until` means offer expiry date, not service execution date.
- [x] Enforce `valid_until >= issue_date`.
- [x] If Service Start Date exists, enforce `valid_until <= service.event_start_date`.
- [x] If Service Start Date is before Issue Date, block quotation create/update with a controlled error.
- [x] Enforce validation in both UI and Server Actions.
- [x] Keep Service start/end dates out of quotation payloads.
- [x] Sort Services list by service number ascending.
- [x] Hide native number input spinners in quotation numeric inputs.
- [x] No schema, migration, RPC, VAT, invoice/payment, or financial total authority changes.

### PRJ-CLEANUP-1 - Retire User-Facing Projects UI
Status: Completed

Checklist:
- [x] Remove Projects from primary navigation.
- [x] Replace dashboard Project surfaces with Service / Booking-oriented surfaces.
- [x] Redirect `/projects` to `/services`.
- [x] Leave legacy project schema, permissions, types, mock data, customer `projects_count`, and supplier PRJ mock references for later cleanup.

## 3. Completion Checklist

### Phase 0 - Stabilization
Status: Completed

Checklist:
- [x] auth-error-imports fixed
- [x] `src/lib/auth/errors.ts` made canonical for shared auth errors
- [x] `permissions.ts` imports and throws shared `UnauthorizedError` / `ForbiddenError`
- [x] quotation RPC ambiguity fixed
- [x] `create_quotation_with_items` qualifies `quotation_items` references with aliases
- [x] `update_quotation_with_items` qualifies `quotation_items` references with aliases
- [x] quotation creation verified after manual Supabase apply
- [x] quotation browser print layout improved

### Phase 1 - Customers
Status: Completed

Checklist:
- [x] Customers CRUD
- [x] Customers CSV Export

### Phase 2 - Core Security / RBAC
Status: Foundation completed; production hardening deferred

Checklist:
- [x] app_users
- [x] roles
- [x] requirePermission
- [x] Clerk/Supabase foundation
- [x] SEC-RLS-BASELINE-1 migration prepared to remove DEV_ONLY RLS policies
- [x] Manual Supabase SQL Editor apply and database verification for SEC-RLS-BASELINE-1
- [x] DEV_ONLY policies returned zero rows in live database verification
- [x] Broad authenticated `USING true` / `WITH CHECK true` policies returned zero rows in live database verification
- [x] RLS enabled check passed for affected tables
- [x] Quotation RPC grants remained `anon_execute = false`, `authenticated_execute = false`, `service_role_execute = true`
- [ ] remaining production RLS hardening

### Phase 3 - Quotations RPC Foundation
Status: Completed

Checklist:
- [x] vat_rate
- [x] QT numbering
- [x] create RPC
- [x] update RPC
- [x] VAT residual adjustment
- [x] service_role-only RPC permissions
- [x] manual Supabase apply
- [x] build + health check
- [x] PR merged

### Phase 4 - Quotations Data Layer
Status: Completed

Checklist:
- [x] Audit data layer
- [x] Fix permission fallback issues if any
- [x] Confirm no Unauthorized/Forbidden becomes [] or null
- [x] Confirm schemas exclude trusted totals
- [x] Confirm RPC payload shape
- [x] Confirm safe error handling
- [x] Build
- [x] Commit
- [x] Push
- [x] PR
- [x] Merge
- [x] Update project docs after merge

**Definition of Done:**
- `getQuotations` and `getQuotationById` use `requirePermission("quotations:read")`
- create/update/delete actions use `requirePermission("quotations:write")`
- RPC calls pass correct payload
- no raw Supabase errors exposed
- `pnpm build` passes

### Phase 5 - Quotations UI Manual Entry
Status: Completed

**Note:** Phase 5 was split into Phase 5A (List + Create Form completed) and Phase 5B (Edit + Soft Delete completed).

Checklist:
- [x] Wire `/quotations` list to live data
- [x] Empty state
- [x] Access denied state
- [x] Loading/error states if implemented
- [x] Create quotation form
- [x] Dynamic manual line items
- [x] Client-side preview only comment
- [x] Call `createQuotation` action
- [x] Edit draft quotation
- [x] Prevent full edit for non-draft
- [x] Soft delete quotation
- [x] Manual test full quotation creation flow if confirmed
- [x] Build
- [x] Audit
- [x] Commit/Push/PR/Merge
- [x] Update docs

**Definition of Done:**
- user can create quotation manually
- user can add multiple items
- totals preview matches backend result
- backend RPC result is displayed/stored
- non-draft edit lock respected
- no Service Catalog required

### Phase 6 - Quotation Detail / Print
Status: Completed

Checklist:
- [x] Detail page uses real data
- [x] Items show real values
- [x] Customer info shown
- [x] Status badge
- [x] Browser print route
- [x] Print / Save as PDF wording
- [x] Print layout fix
- [x] Build/test/audit/merge
- [x] Update docs

**Note:** Phase 6 completed quotation detail + browser print using live data. Server-side PDF generation remains deferred.

### Phase BD - Business Domain Decisions
Status: Core ERP decisions resolved; leads/demo-data details remain deferred; supplier design direction documented

**Purpose:**
Confirm event-company workflow before invoice schema.

Approved decisions:
1. Quotations are always tied to Services in new ERP work.
2. Service / Booking replaces Project as the operational entity.
3. Required event fields remain flexible at inquiry stage, with the documented date direction:
   - `event_name`
   - `event_start_date`
   - nullable `event_end_date`
   - `event_venue`
   - `event_type`
4. Invoices are Service-linked and use deposit/final invoice types against an approved quotation basis.
5. Invoices must not claim official Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior until a real reviewed integration exists.

Still deferred:
- whether leads/inquiries are tracked before becoming customers
- supplier implementation after the completed supplier design package
- whether first demo data is fake, semi-real, or real

Acceptance criteria:
- [x] No invoice schema work starts before these decisions are documented.
- [x] Event date direction is documented: use `event_start_date` plus nullable `event_end_date`.
- [ ] Saudi partner/business owner confirms event types.
- [x] Deposit/final invoice decision is documented.
- [x] ZATCA/proforma direction is documented as no overclaiming or fake integration.
- [ ] Leads/inquiries decision is documented.
- [x] Vendors/suppliers design direction is documented in `SUPPLIERS-SCHEMA-DESIGN-1`; implementation remains future controlled work.
- [ ] Demo data security level is documented.
- [x] If `vat_rate` comes from company settings, it is only a default for new documents.
- [x] Every quotation/invoice stores its own `vat_rate` snapshot.
- [x] Changing company settings never changes old documents.

### Pre-Demo Security Check
Status: Required if demo uses real or semi-real data

Checklist:
- [ ] Confirm whether demo data is fake, semi-real, or real.
- [x] SEC-RLS-BASELINE-1 manual Supabase apply and database verification completed; DEV_ONLY broad authenticated policies were removed from the live database.
- [ ] If real/semi-real data is used, complete remaining production hardening and pre-demo controls before hosted demo: `company_settings` production RLS follow-up, demo-data/security decision, Viewer bank masking verification, sensitive Server Action rate limiting, raw error/security checks where applicable, and backup/monitoring/deployment readiness before production.
- [ ] Add explicit production RLS plan for `company_settings` because it contains bank, legal, and VAT data.
- [ ] Verify Supabase admin/service role usage stays server-side only.
- [ ] Confirm no raw database/Supabase errors are exposed to UI.
- [ ] Confirm no secrets are present in committed files.
- [ ] Confirm auth redirects and Access Denied states are correct.
- [ ] Verify Viewer opening `/settings` does not receive full IBAN, bank account holder, or bank account values in client data.
- [ ] Plan rate limiting for sensitive Server Actions: quotation creation, quotation approval, invoice creation, payment recording, and settings update.
- [ ] Confirm UI hiding is not treated as security; server-side permission checks and server-side masking are required.

### Phase CS - Company Settings Mini
Status: CS-A committed on `main`; CS-B deferred

Checklist:
- [x] CS-A live singleton Company Settings only
- [x] server-only settings query/action modules
- [x] `settings:read` for reads and `settings:write` for updates
- [x] bank details visible only to Admin/Accountant in the app data flow
- [x] VAT mode defaults to `not_registered`
- [x] `company_settings.default_vat_percent` is only a default for new documents
- [x] logo upload deferred
- [x] live settings are not wired into quotation/invoice print views
- [ ] Company info used by quotation/invoice print views after CS-B snapshot design
- [ ] CS-B document snapshot wiring
- [ ] quotation/invoice documents keep their own `vat_rate` snapshots
- [ ] changing company settings never retroactively changes old quotations or invoices
- [x] Build/test/audit/merge
- [x] Update docs

### SETTINGS-EDIT-MODE-1
Status: Implemented / Repo-ready (Manual browser smoke still required)

Checklist:
- [x] Protect Company Settings UI behind an Edit Settings toggle.
- [x] Prevent accidental modifications by making fields read-only by default.
- [x] Show `Save Changes` and `Cancel` only in edit mode.
- [x] Cancel discards unsaved changes.
- [x] The Edit button does not render for users without write permission.
- [x] Existing validation, permissions, and bank masking remain expected.

### Phase TAX-0 - Tax/ZATCA Wording Cleanup
Status: Required before ERP implementation unless explicitly accepted as a known risk

Checklist:
- [ ] Audit invoice, quotation, print, docs, and UI wording for premature tax/ZATCA/FATOORA claims.
- [ ] Keep `phase2_integrated` wording guarded as future-only until real integration exists.
- [ ] Confirm `not_registered` behavior remains VAT 0 and does not show Tax Invoice claims.
- [ ] Document any remaining tax wording risk before starting ERP implementation.
- [ ] Build/test/audit/merge if code changes are made.
- [ ] Update docs.

### Phase ERP-0 - Workflow Planning / Report Only
Status: Planned

Checklist:
- [ ] Confirm locked workflow: Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- [ ] Confirm Service replaces Project as the operational unit.
- [ ] Confirm no standalone quotations and no standalone invoices.
- [ ] Customer detail should show related Services.
- [ ] Customer detail should show related Quotations through Services.
- [ ] Customer detail should show related Invoices through Services.
- [ ] Customer detail should show related Payments through Invoices.
- [ ] Customer detail should later show Activity.
- [ ] Review schema/data migration impact without applying SQL.
- [ ] Produce implementation plan only; do not implement in ERP-0 unless explicitly approved.

### Phase ERP-1 - Services
Status: DB foundation and app list/create/detail/edit foundation implemented; controlled status transitions remain deferred

Checklist:
- [x] Add `services` table as the DB foundation for the operational unit linked to Customer Profile.
- [x] Use Service status machine in DB constraint: Inquiry, Quoted, Approved, Deposit Paid, In Progress, Completed, Cancelled.
- [x] Do not add a separate Confirmed status.
- [x] Use `event_start_date` and nullable `event_end_date` instead of only `event_date`.
- [x] Add DB constraint: `CHECK (event_end_date IS NULL OR (event_start_date IS NOT NULL AND event_end_date >= event_start_date))`.
- [ ] Keep event fields flexible at inquiry stage.
- [ ] Confirm event types with Saudi partner/business owner while avoiding immediate schema rework.
- [x] Add service number format `SVC-YYYY-0001`.
- [x] Generate service numbers server-side through `generate_document_number('service')`.
- [x] Preserve existing prefixes: `QT`, `INV`, `PAY`, `PRJ`; add `SVC`.
- [x] Add `sales_owner_id` planning field at DB level.
- [x] Require `cancellation_reason` when Service is cancelled.
- [ ] If no invoice/payment exists, allow simple cancellation.
- [ ] If invoice/payment exists, cancellation must not silently delete financial records.
- [x] Add `DEV_ONLY_services` for fake/dev data only.
- [x] SEC-RLS-BASELINE-1 migration prepared to remove `DEV_ONLY_services`.
- [x] Manually apply and verify SEC-RLS-BASELINE-1; DEV_ONLY broad authenticated policies were removed from the live database.
- [ ] Complete remaining production hardening before real/semi-real service data.
- [x] Verify ERP-1 Services DB state after manual Supabase SQL Editor apply.
- [x] Update `supabase/schema.sql` after post-apply verification.
- [x] Implement Services UI/routes/server actions for list/create/detail/edit.
- [x] Link Services from Customer Profile.
- [ ] Integration checkpoint after ERP-1 app layer: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Phase ERP-2 - Service-linked Quotations
Status: Planned

Checklist:
- [ ] Quotations must belong to a Service.
- [ ] No standalone quotation creation.
- [ ] Migrate quotation schema/app flow to use `service_id`; not done in ERP-1 DB foundation.
- [ ] Derive quotation `customer_id` server-side from the Service; do not trust client-submitted customer linkage.
- [ ] Allow one Service to have multiple Quotations.
- [ ] Do not add `UNIQUE(service_id)` to quotations.
- [ ] Customer Profile shows quotations through Services.
- [ ] Approval requires `quotations:approve`.
- [ ] Recommended approval roles: Admin and Manager.
- [ ] Sales can create/send quotations but cannot approve unless explicitly granted.
- [ ] Do not treat `quotations:write` as approval permission.
- [ ] Non-draft quotations must not be fully editable through ordinary `quotations:write`.
- [ ] Approved quotations must not be soft-deleted through ordinary `quotations:write`.
- [x] `valid_until` must be on or after issue date.
- [x] If Service Start Date exists, `valid_until` must be on or before `service.event_start_date`.
- [x] If Service Start Date is before Issue Date, quotation create/update is blocked.
- [x] Service Schedule is read-only context in quotation UI.
- [x] Issue Date is read-only.
- [x] `Quotation Valid Until` means offer expiry date, not service execution date.
- [x] Quotation validity validation is enforced in both UI and Server Actions.
- [ ] Expired quotations cannot be approved without renewal/extension or authorized override.
- [ ] Exact override behavior remains deferred.
- [ ] Client-submitted totals remain preview only; server/PostgreSQL logic calculates trusted totals.
- [ ] Integration checkpoint after ERP-2: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### RBAC-QUOTATIONS-APPROVE-1
Status: Ready for PR

Checklist:
- [x] Add `quotations:approve` to Manager in `src/lib/auth/permissions.ts`.
- [x] Keep `quotations:approve` separate from `quotations:write`.
- [x] Required before quotation approval flow and ERP-3 invoices.

### CUST-OFFICIAL-DETAILS-1
Status: CUST-OFFICIAL-DETAILS-1C manual smoke passed and ready for pre-commit review; next locked priority after customer review is SEC-SERVICE-INVARIANTS-1

Checklist:
- [x] Draft backward-compatible migration for customer type: Individual / Company.
- [x] Draft backward-compatible migration for legal name.
- [x] Draft backward-compatible migration for Commercial Registration number.
- [x] Draft backward-compatible migration for VAT number.
- [x] Draft backward-compatible migration for National Address fields.
- [x] Draft backward-compatible migration for billing email.
- [x] Draft backward-compatible migration for finance contact.
- [x] Draft backward-compatible migration for payment terms.
- [x] Draft backward-compatible migration for PO required flag.
- [x] Keep fields optional/conditional, not mandatory for all customers.
- [x] Review migration.
- [x] Manually apply and verify migration.
- [x] Update `supabase/schema.sql` after manual apply and verification.
- [x] Implement customer data layer + create UI + profile-only edit UI + profile card.
- [x] Keep official/billing fields optional/conditional in UI and validation.
- [x] Keep Individual customers free of company-only registration/billing fields in the mounted form UI.
- [x] Keep customer VAT number display separate from Tax Invoice/ZATCA behavior.
- [x] Mozfer manual smoke for CUST-OFFICIAL-DETAILS-1C passed.
- [ ] Future ERP-3 invoice buyer snapshot usage remains deferred to invoice implementation.

### LIST-PAGINATION-PARITY-1
Status: Follow-up; do not move ahead of critical/security blockers unless approved

Checklist:
- [ ] Customers list uses the same pagination pattern as `/quotations`.
- [ ] Services list uses the same pagination pattern as `/quotations`.
- [ ] Use 10 rows per page.
- [ ] Include Previous/Next controls.

### SEC-SERVICE-INVARIANTS-1
Status: SEC-SERVICE-INVARIANTS-1B merged; next locked priority is SERVICE-HUB-1

Checklist:
- [x] Verify active/non-deleted customer on service create.
- [x] Add linked-record guards before service soft delete.
- [ ] Extend service deletion guards for invoices/payments after ERP-3/ERP-4 add service-linked financial records.

### SERVICE-HUB-1
Status: SERVICE-HUB-1B implemented and ready for review/manual smoke

Checklist:
- [x] Build a minimal Service/Booking Hub detail page to replace the old user-facing project hub concept.
- [x] Include read-only status timeline.
- [x] Include service schedule.
- [x] Include customer context.
- [x] Include related quotations.
- [ ] Include future invoice/payment cards after ERP-3/ERP-4 provide real service-linked financial records.
- [ ] Leave notes/activity/attachments for later if not included in the first slice.
- [ ] Preserve Service as the operational source of truth.
- [ ] Add future controlled status transition actions; no transition automation is part of SERVICE-HUB-1B.

### QUOTE-APPROVAL-FLOW-1
Status: QUOTE-APPROVAL-FLOW-1B completed. Migration was manually applied and schema is synced. Admin smoke passed. Required before ERP-3 invoice creation.

Checklist:
- [x] Allow multiple draft quotations per Service for negotiation.
- [x] Prevent more than one approved quotation per Service.
- [x] Enforce `quotations:approve` separately from `quotations:write`.
- [x] Required before ERP-3 invoices can be created from Approved Quotation + Service.

### Phase ERP-3 - Service-linked Invoices
Status: In Progress

### ERP-3A Invoice Schema Foundation
Status: Manual Supabase apply completed / Verified

Checklist:
- [x] Add `service_id` to invoices.
- [x] Rename `quotation_id` to `approved_quotation_id`.
- [x] Rename `type` to `invoice_type` and add deposit/final CHECK constraint.
- [x] Add snapshot columns for seller, buyer, and quotation details.
- [x] Prepare composite FK linking invoice to quotation and service.
- [x] Manual Supabase apply.

### ERP-3B Invoice Generation (Upcoming)
Checklist:
- [ ] Invoices must belong to a Service.
- [ ] No standalone invoice creation.
- [ ] No invoice without Approved Quotation.
- [ ] Every invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- [ ] Deposit/final invoices must be created from Approved Quotation + Service.
- [ ] Invoice totals must derive from approved quotation snapshots, not arbitrary client input.
- [ ] Invoice numbering uses one shared `INV-YYYY-0001` sequence.
- [ ] Do not create separate `DEP-` or `FIN-` invoice sequences.
- [ ] Use `invoice_type = deposit | final`.
- [ ] Deposit Invoice is created manually after quotation approval.
- [ ] Deposit amount must be greater than `0`.
- [ ] Deposit amount must be less than or equal to the approved quotation total or remaining uninvoiced balance.
- [ ] Deposit is flexible and not fixed at 50%.
- [ ] Plan invoice voiding/cancellation later; do not implement now.
- [ ] Do not allow casual deletion of issued or paid invoices in future design.
- [ ] Issued/paid financial records must be preserved for auditability.
- [ ] Future flow may require Void status, Credit Note, Refund, and audit trail.
- [ ] Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
- [ ] Financial rounding must be server-side/PostgreSQL-side using SAR 2-decimal rounding rules.
- [ ] Currency should be snapshotted on issued documents.
- [ ] Integration checkpoint after ERP-3: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Phase ERP-4 - Invoice-linked Payments
Status: Planned

Checklist:
- [ ] Payment must link to an Invoice.
- [ ] Payment is connected to Service through the Invoice.
- [ ] If `service_id` is stored on payments for query convenience, it must match the invoice's `service_id`.
- [ ] Enforce invoice/service consistency in the data layer and preferably DB design.
- [ ] If a customer pays before an invoice exists, require creating a Deposit Invoice first or prevent payment recording until an invoice exists.
- [ ] Payment recording updates invoice paid amount, balance due, and payment status.
- [ ] `Deposit Paid` requires a valid/cleared deposit payment.
- [ ] A Deposit Invoice alone does not confirm booking.
- [ ] A pending payment does not confirm booking.
- [ ] Deposit payment changes Service status to `Deposit Paid` only through a cleared Deposit Invoice payment.
- [ ] Prevent overpayment unless explicitly approved.
- [ ] Plan future refund/credit-note behavior with invoice void/cancellation design.
- [ ] Integration checkpoint after ERP-4: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Integration Verification Checkpoints
Status: Required between ERP phases

Checklist:
- [ ] After ERP-1 Services: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.
- [ ] After ERP-2 Service-linked Quotations: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.
- [ ] After ERP-3 Invoices: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.
- [ ] After ERP-4 Payments: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Phase 7A - Event-aware Invoice Schema + RPC Foundation
Status: Superseded by ERP-3; kept as historical planning note

Checklist:
- [ ] Invoice data model review
- [ ] Event fields included or explicitly deferred based on Phase BD
- [ ] Multi-invoice behavior included or explicitly deferred based on Phase BD
- [ ] Invoice numbering
- [ ] VAT/totals server-side
- [ ] PostgreSQL RPC if needed
- [ ] ZATCA/proforma nullable fields considered only after decision
- [ ] SQL proposed for review before migration file
- [ ] Manual Supabase apply only after approval
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 7B - Invoice Data Layer
Status: Planned

Checklist:
- [ ] Types
- [ ] Schemas
- [ ] Mappers
- [ ] Queries
- [ ] Server Actions
- [ ] RBAC: invoice read/write permissions
- [ ] safe error handling
- [ ] no client-trusted totals
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 7C - Invoice UI
Status: Planned

Checklist:
- [ ] Convert approved quotation to invoice
- [ ] Invoice list
- [ ] Invoice detail
- [ ] Create/edit behavior based on approved schema
- [ ] Status handling
- [ ] Access denied and auth behavior
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 7D - Invoice Browser Print
Status: Planned

Checklist:
- [ ] Browser print route
- [ ] Print / Save as PDF wording
- [ ] Company settings integration
- [ ] ZATCA basics note only, do not claim full compliance
- [ ] Server-side PDF remains deferred unless explicitly approved
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 8 - Payments
Status: Superseded by ERP-4; kept as historical planning note

Checklist:
- [ ] Payment create/list/detail
- [ ] Link payments to invoices
- [ ] Partial/full payment handling
- [ ] Invoice payment status update
- [ ] Receipts if needed
- [ ] Build/test/audit/merge
- [ ] Update docs

### Services / Operations View
Status: Superseded by ERP-1 Services / Operations planning

Checklist:
- [ ] Treat Service as the first-class operational module.
- [ ] Create and manage Service from Customer Profile.
- [ ] Service status tracking.
- [ ] Operations view
- [ ] Build/test/audit/merge
- [ ] Update docs

### Dashboard Real Data
Status: Planned

Checklist:
- [ ] Replace dashboard mock data
- [ ] Revenue summary
- [ ] quotations/invoices/payments counts
- [ ] recent activity
- [ ] Build/test/audit/merge
- [ ] Update docs

### ADMIN-USER-MANAGEMENT-1
Status: 1C-B implemented; real Clerk invitation/webhook smoke testing remains pending.

Checklist:
- [x] 1A Admin User Management Design Report
- [x] 1B Build `Admin > Users` / `/admin/users`
- [x] 1B Implement Admin-only invite action using Clerk Invitations API
- [x] 1B Store intended role as invitation metadata / `publicMetadata` unless SDK verification proves otherwise
- [x] 1B Implement `user.created` webhook with verified signature
- [x] 1B Create `app_users` row after accepted invite using `clerk_user_id`
- [x] 1B Validate invitation role against the CRM role whitelist
- [x] 1B Reject invalid/missing webhook role metadata without creating `app_users`
- [x] 1B Ensure final authorization uses only `app_users.role`
- [x] 1B Enforce `users:invite` and `users:manage`
- [x] 1C-B Implement server-side last-active-admin protection
- [x] 1C-B Block deactivating the final active admin
- [x] 1C-B Block changing the final active admin to a non-admin role
- [x] 1C-B Replace native revoke invitation `confirm()` with a CRM-styled modal
- [x] 1C-B Keep real Clerk invitation/webhook smoke testing pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer approves a real test invitation/user
- [x] 1C-B Avoid SQL, migrations, package, environment, schema, and real Clerk user/invitation changes

### Service Catalog
Status: Deferred as productivity enhancement, not blocking core financial demo

Checklist:
- [ ] Catalog-style service item table migration if still needed; this is separate from the ERP-1 operational `services` table.
- [ ] services CRUD
- [ ] services permissions
- [ ] `/services` page
- [ ] quotation form dropdown
- [ ] selected service fills description/category/unit_price
- [ ] quotation item remains snapshot-editable
- [ ] Build/test/audit/merge
- [ ] Update docs

### Audit Logs
Status: Deferred

Checklist:
- [ ] identify important actions
- [ ] log creates/updates/deletes/status changes
- [ ] admin audit view
- [ ] Build/test/audit/merge
- [ ] Update docs

### Security Hardening
Status: Required before hosted demo with real/semi-real data and before production

Checklist:
- [x] prepare SEC-RLS-BASELINE-1 migration to remove `DEV_ONLY` RLS policies
- [x] manually apply and verify SEC-RLS-BASELINE-1
- [x] verify DEV_ONLY policies returned zero rows
- [x] verify broad authenticated `USING true` / `WITH CHECK true` policies returned zero rows
- [x] verify RLS enabled check passed for affected tables
- [x] verify quotation RPC grants remained service-role only
- [ ] add explicit production RLS plan for `company_settings`
- [ ] review Supabase anon usage
- [ ] verify admin client server-only
- [ ] secret scan
- [ ] raw error audit
- [ ] rate limiting for sensitive Server Actions: quotation creation, quotation approval, invoice creation, payment recording, settings update
- [ ] Viewer bank-detail masking test: `/settings` client data must not include full IBAN, bank account holder, or bank account values
- [ ] webhook signature verification
- [ ] Build/test/audit/merge
- [ ] Update docs

### QA / Deployment / Demo
Status: Planned

Checklist:
- [ ] production Supabase setup
- [ ] deployment setup
- [ ] demo data
- [ ] demo script
- [ ] final smoke test
- [ ] client handoff notes
- [ ] Update docs

## Backlog / UX & Admin Follow-up

### Future Billing & Accounting Enhancements
Status: Pending

INVOICE-LIST-DEEP-LINK-SELECTION-1
- Priority: P1
- Status: Pending
- Description: Support `/invoices?invoiceId=<id>` so invoice links from related workflow pages can open the existing invoices list with the correct invoice selected in the existing side panel.
- Note: This is separate from `QUOTE-TO-DEPOSIT-CTA-1` and was NOT implemented in commit `103e0fa`.

BILLING-FLEXIBILITY-1
Status: Complete (Manual Smoke Passed)
- Deposit is optional, not mandatory.
- Direct Final Invoice without Deposit must be supported.
- Prevent duplicate active final invoices.

PAYMENT-EVIDENCE-1
- Bank transfer payments should require reference/transaction ID.
- Receipt/proof attachments should be supported.
- Future workflow should support pending → confirmed.

PAYMENTS-LIST-LIVE-1
- Status: Completed.
- Implemented in commit `f4471a2 feat(payments): show live payment records`.
- `/payments` now uses live read-only payment records through `getPaymentsList` and no longer renders mock `paymentsData` rows as real records.
- Manual smoke passed with `PAY-2026-0005` linked to `INV-2026-0007`; payment count changed from `4` to `5`; confirmed collected changed from `SAR 27,499.95` to `SAR 32,503.04`.
- Payment recording, invoice balances/status formulas, SQL, schema, migrations, packages, and tax/ZATCA behavior were unchanged.

MOCK-DATA-AUDIT-1
- Status: Pending.
- Audit remaining mock/static app surfaces before replacing individual summaries and lists. `/dashboard` summary/sample rows were completed under `DASHBOARD-LIVE-SUMMARY-1`; `/suppliers` live read-only replacement was completed under `SUPPLIERS-LIVE-READ-FOUNDATION-1`.

INVOICE-KPI-LIVE-1
- Status: Completed.
- Implemented in commit `d89b520 fix(invoices): derive KPI cards from live invoices`.
- `/invoices` KPI cards now derive from live invoice list data.
- Static/mock invoice KPI values were removed: `TOTAL OUTSTANDING: SAR 2.4M`, `OVERDUE (30+ DAYS): SAR 450K`, `RECEIVED THIS MONTH: SAR 1.2M`, `12 Invoices`, and `+18% vs Last Month`.
- Manual smoke passed with `Total Outstanding: SAR 0.00`, `Open Invoices: 0`, and `Total Collected: SAR 32,503.04`.
- Invoice table/list behavior, invoice creation, payment recording, invoice balance/status formulas, SQL, schema, migrations, packages, dashboard, suppliers, payments page, and tax/ZATCA behavior were unchanged.

DASHBOARD-LIVE-SUMMARY-1
- Status: Completed.
- Implemented in commit `d25cb17 fix(dashboard): show live summary data`.
- `/dashboard` now uses live/read-only data where permissions allow.
- Static/mock dashboard values were removed: `Total Customers: 1,248`, `Active Quotations: 342`, `Pending Invoices: 89`, `Monthly Revenue: SAR 2.4M`, `Pending Payments: SAR 450K`, and sample rows such as Saudi Aramco / NEOM, Riyadh Season, Jeddah Corniche, and fake SAR sample quotation amounts.
- Manual smoke passed with `Total Customers: 14`, `Total Quotations: 12`, `Open Invoices: 0`, `Services: 8`, `Total Collected: SAR 32,503.04`, and `Pending Balance: SAR 0.00`.
- Recent Quotations now renders live quotation rows or a safe empty/unavailable state.
- Customer, quotation, invoice, payment, and service write paths, invoice balance formulas, payment recording, SQL, schema, migrations, packages, and tax/ZATCA behavior were unchanged.

SUPPLIERS-SCHEMA-DESIGN-1
- Status: Completed and pushed.
- Implemented in commit `e85adec spec(suppliers): add supplier module design artifacts`.
- Schema/design/spec phase is complete only as Spec Kit design artifacts under `specs/002-suppliers-schema-design/`: `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `tasks.md`.
- This did not implement live supplier UI, supplier CRUD, supplier invoices/payments, Supplier Bookings, or Service P&L reporting.
- Preserve current workflow rules: no SQL/migration/Supabase actions without review and approval; no supplier cost/margin exposure in customer-facing documents; no Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior while `company_settings.vat_mode = not_registered`.

SUPPLIERS-DB-FOUNDATION-1
- Status: DB foundation completed and pushed; supplier implementation remains partial.
- Migration `supabase/migrations/20260627153000_supplier_directory_foundation.sql` was committed and pushed in `ee50e60 feat(suppliers): add directory foundation migration`.
- Manual Supabase apply was completed and verified: required supplier foundation columns exist, `on_hold` is supported by the supplier status lifecycle, supplier VAT registration status constraint exists, RLS remains enabled on `public.suppliers`, no DEV_ONLY supplier policies were found, no broad anon/authenticated supplier policies were found, and no future supplier financial/scope tables were created.
- `supabase/schema.sql` was synced and pushed in `ed61fb7 chore(suppliers): sync schema after directory foundation`.
- This completed only the supplier directory DB foundation. Supplier write CRUD, supplier rate cards, service supplier allocations, Supplier Bookings, supplier invoices, supplier payments, Supplier Booking PDF/WhatsApp/email, supplier portal, supplier costing/margin/P&L reports, and payment approval workflow remain deferred.

SUPPLIERS-LIVE-READ-FOUNDATION-1
- Status: Completed and pushed.
- Implemented in commit `1fbf77e feat(suppliers): add live read-only directory`.
- `/suppliers` now reads live supplier records from `public.suppliers` through a server-side supplier query layer, UI-safe mapper/types, and read-only client list/detail UI.
- Permission gate uses `suppliers:read`; this slice does not use `suppliers:write`.
- Verification passed: lint passed with only existing PDF `<img>` warnings; `pnpm exec tsc --noEmit` passed; no bank/IBAN fields were selected, mapped, typed for UI, or rendered.
- No create/edit/delete/restore behavior, SQL/schema/migration changes, or supplier finance/future modules were introduced.
- Still deferred after this read-only slice: supplier create/edit/delete/restore CRUD, supplier write actions/server actions, supplier rate cards runtime workflows, service supplier allocations, Supplier Bookings, supplier invoices, supplier payments, Supplier Booking PDF/WhatsApp/email, supplier portal, supplier costing/margin/P&L reports, and payment approval workflow.

SUPPLIERS-CREATE-FORM-1
- Status: Completed and pushed.
- Implemented in commit `05affcd feat(suppliers): add create form`.
- Create-only supplier flow is complete: create form/page, validation, server action, and list navigation.
- This is not full Supplier CRUD. Supplier Delete/Restore remain deferred.

SUPPLIERS-CREATE-UX-FIX-1
- Status: Completed and pushed.
- Implemented in commit `9ed7a59 fix(suppliers): refine create ui`.
- Team Lead create-flow UI/UX fixes are complete.
- Basic profile Supplier Edit is complete. Supplier Delete/Restore remain deferred.
- Supplier finance/workflow modules remain deferred: rate cards runtime workflows, allocations, Supplier Bookings, supplier invoices/payments, Supplier Booking PDF/WhatsApp/email, supplier portal, costing/margin/P&L, and payment approval workflow.

SUPPLIERS-EDIT-FORM-1
- Status: Completed and pushed.
- Implemented in commit `9f87566 feat(suppliers): add edit form`.
- Scope allows updating basic, safe, non-sensitive supplier profile fields only.
- Enforces `suppliers:write` on edit page and update server action.
- Prefills existing safe data. Soft-deleted records are protected.
- Sensitive banking and blacklist audit fields remain excluded.
- Lint and TypeScript compile successfully with zero errors.
- Other supplier modules (finance, rate cards runtime workflows, delete/restore, blacklist workflows) remain deferred.

SUPPLIERS-EDIT-OPTIONAL-FIELDS-FIX-1
- Status: Completed and pushed.
- Implemented in commit `7df51f4 fix(suppliers): preserve optional edit fields`.
- Scope fixes optional supplier edit field persistence: CR Number, VAT Number, and Internal Notes.
- Manual smoke testing found that these fields were previously initialized to empty strings `""` instead of their database values from the `supplier` prop, resetting them to `null` on save.
- Fixed by hydrating `crNumber`, `vatNumber`, and `notes` states from the supplier prop. Manual smoke tests passed successfully after implementation.
- No other fields or modules were modified. Sensitive banking/blacklist fields remain excluded.

SUPPLIERS-STATUS-BLACKLIST-1
- Status: Completed and pushed.
- Implemented in commit `92617ef feat(suppliers): add blacklist workflow`.
- Scope: Implemented dedicated supplier blacklist/unblacklist workflow with reason modal, recording `blacklisted_reason`, `blacklisted_by`, and `blacklisted_at` in the database.
- Details: Blacklist details are shown inside the supplier side panel, unblacklisting restores the status to `inactive`, and normal Supplier Edit form updates are validated to prevent bypassing the workflow. Layout flexbox fixes in side panel and Zod refinement fixes included. Manual smoke and validation passed.

SUPPLIERS-RATE-CARDS-FOUNDATION-1A
- Implemented in commits `6a2804d feat(suppliers): add rate cards foundation` and `87c714c chore(suppliers): sync schema after rate cards foundation`.
- Scope: Supplier rate cards database table, RLS enablement without broad policies, and app-level `supplier_costing:read` / `supplier_costing:write` permissions assigned to Admin and Manager. Accountant, Sales, Operations, and Viewer do not have supplier costing permissions in this MVP slice.
- Details: Foundation table and permissions completed. Migration manually applied and schema synced. The full supplier rate cards feature is not yet complete. Supplier rate cards contain internal cost data and must never appear in customer-facing quotations, invoices, PDFs, receipts, broad supplier list views, or unauthorized role views. Runtime workflows remain deferred.

SUPPLIERS-RATE-CARDS-READ-1
- Status: Completed.
- Implemented in commit `da5bc86 feat(suppliers): add read-only rate cards view`.
- Scope: Internal read-only Supplier Rate Cards view added to the existing Supplier side panel.
- Details: Visible only to Admin/Manager users with `supplier_costing:read`. Unauthorized roles (Accountant, Sales, Operations, Viewer) do not see the Rate Cards section. Enforces server-side `requirePermission("supplier_costing:read")` before using `createAdminClient()`. Reads `supplier_rate_cards` filtered by `supplier_id` and `is_deleted = false`. Displays non-deleted rate cards sorted active first and newest `valid_from` first. Internal notes are displayed only inside the authorized internal Supplier side panel.
- Validation: `pnpm run lint` passed with only the two known existing PDF `<img>` warnings, `pnpm exec tsc --noEmit` passed, and `pnpm run build` passed.

FUTURE SUPPLIER SEQUENCE
- SUPPLIERS-RATE-CARDS-READ-1 is complete.
- SUPPLIER-ALLOCATIONS-FOUNDATION-1A is complete.
- SUPPLIER-ALLOCATIONS-SCHEMAS-1A is complete.
- SUPPLIER-ALLOCATIONS-READ-1A is complete.
- SUPPLIER-ALLOCATIONS-CREATE-MANUAL-1A is complete.
- SUPPLIER-ALLOCATIONS-CANCEL-1A is complete.
- SUPPLIER-ALLOCATIONS-UPDATE-MANUAL-1A is complete.
- SUPPLIER-ALLOCATIONS-SERVICE-UI-PANEL-1A is complete.
- SUPPLIER-ALLOCATIONS-SERVICE-UI-CREATE-1B is complete.
- SUPPLIER-ALLOCATIONS-SERVICE-UI-EDIT-1C is complete.
- SUPPLIER-ALLOCATIONS-SERVICE-UI-CANCEL-1D is complete.
- SUPPLIER-ALLOCATIONS-DELETE-RESTORE-1 is complete (Manual Supplier Allocation lifecycle is now closed).
- SUPPLIER-ALLOCATIONS-RATE-CARD-CREATE-1 is complete (Rate-card allocation creation).
- Everything after it in this supplier sequence is not implemented:
  1. SUPPLIER-ALLOCATIONS-RATE-CARD-AUTOMATION-1 (Rate-card allocation automation / overlap enforcement / etc)
  2. SUPPLIER-BOOKINGS-DESIGN-1
  3. SUPPLIER-BOOKINGS-1
  4. SUPPLIER-INVOICES-1
  5. SUPPLIER-PAYMENTS-1
  6. SUPPLIER-COSTING-MARGIN-REPORTS-1

SUPPLIER-ALLOCATIONS-DESIGN-1 (Completed, Design Approved)
- Status: Completed. Spec sync only.

SUPPLIER-ALLOCATIONS-FOUNDATION-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `bc3db52 feat(suppliers): add allocation foundation`
  - `46881ee chore(supabase): sync supplier allocation schema`
- Scope: Database and permissions foundation for Supplier Allocations.
  - Table `public.service_supplier_allocations` created (migration `20260629100000_service_supplier_allocations_foundation.sql` applied).
  - Columns, generated column `estimated_total_cost`, triggers (`check_service_supplier_allocations_immutable_service_id_trg`, `update_service_supplier_allocations_updated_at`), indexes, and RLS (no policies, server-only access) are synced in `supabase/schema.sql`.
  - Permissions added in `src/lib/auth/permissions.ts` for Admin and Manager: `supplier_allocations:read`, `supplier_allocations:read_cost`, `supplier_allocations:write`, `supplier_allocations:cancel`.
  - Operations, Sales, Viewer, and Accountant have no access. No `supplier_allocations:approve` exists.
- Boundaries:
  - Database/permissions foundation only. Runtime CRUD, Server Actions, UI panels, Service Detail integration, allocations history are NOT implemented.
  - Business logic validation rules (e.g. rate card ID matches supplier ID, approved quotation ID matches service ID, blacklisted supplier blocks, parent service cancellation blocks) are deferred to future server-side validation/runtime hardening.
- Supplier Booking must not be implemented before SUPPLIER-ALLOCATIONS-1.

SUPPLIER-ALLOCATIONS-SCHEMAS-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `e5a20ee feat(suppliers): add allocation schemas`
- Scope: Domain types, Zod schemas, and mappers for Supplier Allocations.
  - Implemented under `src/lib/supplier-allocations/`.
  - Defined `SupplierAllocationStatus` (`draft`, `planned`, `selected`, `cancelled`) and `SupplierAllocationCostSource` (`rate_card`, `manual_estimate`).
  - Implemented DB row type (`SupplierAllocationRow`) and domain type (`SupplierAllocation`), with `estimatedUnitCost`, `estimatedTotalCost`, and `rateCardSnapshot` marked as nullable to support cost redaction.
  - Implemented Zod schemas for validation: `supplierAllocationCreateSchema` (requires `serviceId` and `supplierId`; conditionally requires rate card snapshot/ID for `rate_card` cost source), `supplierAllocationUpdateSchema` (disallows `serviceId` updates and status `cancelled`), `supplierAllocationCancelSchema` (requires `cancelledReason`), and status/cost source schemas.
  - Implemented mappers with `canReadCost` option to redact cost-related fields when permission check fails.
  - Added security boundary comments ensuring cost data remains internal-only and mappers are kept separate from UI/Auth/Supabase imports.
- Boundaries:
  - Runtime CRUD, Server Actions, DB queries, UI panel, Service Detail integration, allocations history, and SQL/migration changes are NOT implemented.

SUPPLIER-ALLOCATIONS-READ-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `1d874cc feat(suppliers): add allocation read queries`
- Scope: Server-only read query module for Supplier Allocations.
  - Implemented server-only read queries in `src/lib/supplier-allocations/queries.ts` and exported in `src/lib/supplier-allocations/index.ts`.
  - Added query functions:
    - `getSupplierAllocationsByServiceId(serviceId)`
    - `getSupplierAllocationsBySupplierId(supplierId)`
    - `getSupplierAllocationById(id)`
- Permissions & Cost Redaction:
  - Every read query requires `supplier_allocations:read` via `requirePermission("supplier_allocations:read")` (re-throwing auth/permission errors).
  - Cost exposure is computed server-side using `checkPermission("supplier_allocations:read_cost")` to check permission and pass `canReadCost` into mappers.
  - Mappers redact `estimatedUnitCost`, `estimatedTotalCost`, and `rateCardSnapshot` server-side when `canReadCost` is false.
  - Raw DB rows are never returned to callers; only mapped `SupplierAllocation` domain objects are returned.
  - Customer-facing routes/PDFs must not import allocation read queries for cost-bearing data.
- DB Filtering & Query Behavior:
  - Queries target the `public.service_supplier_allocations` table using `createAdminClient()` behind application-level permission gates.
  - All reads filter out deleted allocations with `eq("is_deleted", false)`.
  - List queries are ordered by `created_at` descending.
  - Cancelled allocations are intentionally returned as historical planning records (no status filtering).
  - DB errors are logged via `console.error` and handled gracefully by returning `[]` (lists) or `null` (single record).
- Boundaries:
  - Write actions, Server Actions, UI panels, Service Detail integration, allocations history UI, and SQL/migration changes are NOT implemented.

SUPPLIER-ALLOCATIONS-CANCEL-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `b383f85 feat(suppliers): add allocation cancel action`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Action Facts:
  - `cancelSupplierAllocation(id, input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
  - Existing export path remains `src/lib/supplier-allocations/index.ts`.
  - Uses `"use server"`.
  - Returns project ActionResult pattern with SupplierAllocation.
  - Requires `supplier_allocations:cancel`.
  - Does not use `supplier_allocations:write` as substitute.
  - Uses `user.clerk_user_id` for `cancelled_by` and `updated_by`.
  - Validates `id` as a non-empty string from function argument.
  - Uses `supplierAllocationCancelSchema.safeParse`.
  - Requires `cancelledReason`.
  - Does not accept client-provided `status`, `cancelled_at`, `cancelled_by`, or `is_deleted`.
  - Loads existing allocation from `service_supplier_allocations` with `id` and `is_deleted = false`.
  - Missing allocation returns a client-safe not found error.
  - Already cancelled allocation returns a client-safe already-cancelled error.
  - Parent Service status does not block cancellation.
- Update Payload Safety:
  - Cancel is business cancellation only.
  - Cancel preserves row for history/audit.
  - Cancel does not hard delete.
  - Cancel does not set `is_deleted`.
  - Update payload is strictly cherry-picked.
  - Updated fields are only: `status`, `cancelled_reason`, `cancelled_at`, `cancelled_by`, `updated_by`.
  - Does not update `service_id`, `supplier_id`, `approved_quotation_id`, cost fields, rate-card fields, `created_by`, `created_at`, deleted fields, or item/scope fields.
- Security/Return Behavior:
  - Updated row is mapped through `mapSupplierAllocationRow`.
  - `canReadCost` is computed via `supplier_allocations:read_cost`.
  - Returned data respects cost redaction.
  - Raw DB rows are not returned.
  - Supabase/internal errors are logged server-side and returned as generic client-safe messages.
  - Successful cancel revalidates `/services` and `/services/[id]`.
- Boundaries:
  - Runtime cancel action is implemented.
  - Supplier Allocations full write layer is not complete.
  - CRUD is not complete.
  - Update action remains deferred.
  - Delete/restore actions remain deferred.
  - Rate-card allocation creation and server-side snapshot generation remain deferred.
  - Service detail UI panel remains deferred.
  - Supplier allocation history UI remains deferred.
  - Supplier Booking remains deferred.
  - Supplier invoices/payments remain deferred.
  - Supplier costing/margin reports remain deferred.
  - Rate-card-driven quotation automation remains deferred.
  - Customer-facing supplier cost exposure remains forbidden/deferred.

SUPPLIER-ALLOCATIONS-CREATE-MANUAL-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `3b2364d feat(suppliers): add manual allocation create action`
- Action Facts:
  - `createSupplierAllocation(input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
  - `actions.ts` uses `"use server"`.
  - The action returns the project ActionResult pattern.
  - The action requires `supplier_allocations:write`.
  - The action uses `user.clerk_user_id` for both `created_by` and `updated_by`.
  - The action uses `supplierAllocationCreateSchema.safeParse`.
  - The action rejects `costSource = rate_card` as not yet supported.
  - The action forces `status = draft` server-side.
  - The action does not allow selected/cancelled creation.
  - The action does not trust client-provided identity fields.
  - The action does not accept or insert `estimated_total_cost`.
  - The action does not insert `supplier_rate_card_id` or `rate_card_snapshot` in this slice.
- Cross-Table Validation Facts:
  - Parent Service must exist.
  - Parent Service must not be deleted.
  - Parent Service status must not be Cancelled.
  - Parent Service status must not be Completed.
  - Supplier must exist.
  - Supplier must not be deleted.
  - Supplier status must be active.
  - Optional `approvedQuotationId` must reference an existing quotation.
  - Optional `approvedQuotationId` must reference a not-deleted quotation.
  - Optional `approvedQuotationId` must belong to the same service.
  - Optional `approvedQuotationId` must have status approved.
  - Valid `approvedQuotationId` is inserted as `approved_quotation_id`.
- Insert Payload & Return Safety Facts:
  - Insert payload is strictly cherry-picked.
  - Generated fields are excluded from client-controlled input.
  - Audit/default fields are excluded from client-controlled input.
  - Created row is mapped through `mapSupplierAllocationRow`.
  - `canReadCost` is computed via `supplier_allocations:read_cost`.
  - Returned data respects cost redaction.
  - Raw DB rows are not returned.
  - Supabase/internal errors are logged server-side.
  - Client receives generic safe errors, not internal DB details.
  - Successful create revalidates `/services` and `/services/[id]`.
- Boundaries:
  - Runtime manual create action is implemented.
  - Supplier Allocations full write layer is not complete.
  - CRUD is not complete.
  - Update action remains deferred.
  - Cancel action remains deferred.
  - Delete/restore actions remain deferred.
  - Rate-card allocation creation remains deferred.
  - Server-side rate-card snapshot generation remains deferred.
  - Service detail UI panel remains deferred.
  - Supplier allocation history UI remains deferred.
  - Supplier Booking remains deferred.
  - Supplier invoices/payments remain deferred.
  - Supplier costing/margin reports remain deferred.
  - Rate-card-driven quotation automation remains deferred.
  - Customer-facing supplier cost exposure remains forbidden/deferred.

SUPPLIER-ALLOCATIONS-UPDATE-MANUAL-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `486bdb9 feat(suppliers): add manual allocation update action`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Action Facts:
  - `updateSupplierAllocation(id, input)` is implemented in `src/lib/supplier-allocations/actions.ts`.
  - Existing export path remains `src/lib/supplier-allocations/index.ts`.
  - Uses `"use server"`.
  - Returns project ActionResult pattern with SupplierAllocation.
  - Requires `supplier_allocations:write`.
  - Does not use `supplier_allocations:cancel`.
  - Uses `user.clerk_user_id` for `updated_by`.
  - Enforces `canReadCost` redaction using `checkPermission("supplier_allocations:read_cost")`.
  - Validates `id` as a non-empty string.
  - Uses `supplierAllocationUpdateSchema.safeParse`.
  - Schema no longer requires `supplierId` because `supplier_id` is immutable.
  - Does not allow client control of `id`, `serviceId`, `supplierId`, `estimatedTotalCost`, `supplierRateCardId`, `rateCardSnapshot`, audit fields, cancellation fields, and deletion fields.
- Existing Allocation checks:
  - Loads row by `id` and `is_deleted = false`.
  - Rejects missing allocations with client-safe error.
  - Rejects update if allocation is already `cancelled`.
  - Rejects update if allocation `cost_source` is `rate_card` (remaining deferred).
- Cross-Table Validation:
  - Loads parent Service by `existingAllocation.service_id`. Blocks if missing, deleted, `Cancelled`, or `Completed`.
  - Loads Supplier by `existingAllocation.supplier_id`. Blocks if missing, deleted, or status is not `active` (rejects `inactive`, `on_hold`, `blacklisted`).
  - Supplier cannot be changed by the action.
- Manual-Only / Rate-Card Boundary:
  - Only updates `manual_estimate` allocations.
  - Rejects `costSource === "rate_card"`.
  - Leaves `supplier_rate_card_id` and `rate_card_snapshot` untouched.
  - Rate-card creation/snapshot generation remain deferred.
- Status Transitions:
  - Transition guard strictly enforces:
    - `draft -> draft/planned`
    - `planned -> planned/selected`
    - `selected -> selected`
  - Blocked:
    - `any -> cancelled` (cancel action only)
    - `cancelled -> any`
    - `planned -> draft`
    - `selected -> planned/draft`
  - Omitted status preserves existing status safely.
- Payload Safety:
  - Cherry-picks mutable database fields: `status` (via `nextStatus`), `category`, `itemName`, `unit`, `quantity`, `currency` (SAR only), `estimatedUnitCost`, `costSource` (`manual_estimate`), `scopeOfWork`, `internalNotes`, `approvedQuotationId` (only after validation), and `updated_by`.
  - Excludes `id`, `service_id`, `supplier_id`, `estimated_total_cost`, `supplier_rate_card_id`, `rate_card_snapshot`, audit/cancel/delete fields.
- Approved Quotation:
  - If `approvedQuotationId` is provided, validates that quotation exists, is not deleted, has status `approved`, and matches the allocation's `service_id`.
  - If omitted, existing `approved_quotation_id` is preserved. Nullable clearing is not supported.
- Return/Error/Revalidation:
  - Result mapped through `mapSupplierAllocationRow` respecting `canReadCost` redaction.
  - DB details are not returned to client. Internal errors logged server-side only.
  - Revalidates `/services` and `/services/[id]`.
- Boundaries:
  - Only manual update action is implemented.
  - CRUD is not complete. Write layer is not complete. UI is not complete.
  - Delete/restore, rate-card allocation creation, snapshot generation, bookings/Supplier Booking, invoices/payments, costing reports, quotation automation, and customer-facing supplier cost exposure remain deferred.

SUPPLIER-ALLOCATIONS-SERVICE-UI-PANEL-1A (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `2370e74 feat(suppliers): add read-only service allocations panel`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/page.tsx`
  - `src/lib/supplier-allocations/queries.ts`
  - `src/lib/supplier-allocations/types.ts`
  - `src/lib/supplier-allocations/mappers.ts`
- UI Panel Behavior:
  - Adds a read-only Supplier Allocations panel to the internal dashboard Service detail page.
  - Mounts the panel between RelatedQuotationsCard and BillingPanel.
  - Uses getSupplierAllocationsByServiceId(serviceId) for the Service allocation list.
  - Does not fetch or render allocations unless `supplier_allocations:read` is granted.
  - Does not call createSupplierAllocation, updateSupplierAllocation, or cancelSupplierAllocation.
  - Does not add create/edit/cancel forms, drawers, dialogs, or mutation controls.
- Supplier Display Behavior:
  - Allocation reads now include a safe supplier display join.
  - Mapper exposes `supplierName` safely.
  - Supplier name fallback is safe and does not expose banking/IBAN.
  - Query join avoids N+1 UI lookup.
- Cost Redaction Behavior:
  - Backend mapper remains the cost redaction source of truth.
  - Service page computes/checks `supplier_allocations:read_cost` and passes `canReadCost` to the panel.
  - Unit cost and total cost columns are omitted when `canReadCost` is false.
  - UI does not calculate totals client-side.
  - UI does not display `rateCardSnapshot` in this slice.
  - No supplier costs are exposed to customer-facing pages, PDFs, or public routes.
- Status / Empty State UX:
  - Panel displays allocation statuses: draft, planned, selected, cancelled.
  - Local status labeling is used without marking Supplier Booking as implemented.
  - Empty state: "No supplier allocations recorded for this service yet."
  - Cancelled/Completed Services still show historical allocations read-only.
- Boundaries:
  - This is read-only panel 1A only.
  - Supplier Allocations UI is not complete.
  - Supplier Allocations CRUD is not complete.
  - Full write layer is not complete.
  - Create/edit/cancel mutation UI remains deferred to 1B or later.
  - Delete/restore remains deferred.
  - Rate-card allocation UI remains deferred.
  - Rate-card snapshot UI remains deferred.
  - Supplier Booking remains deferred.
  - Supplier invoices/payments remain deferred.
  - Supplier costing/margin reports remain deferred.
  - Quotation automation remains deferred.
  - Customer-facing supplier cost exposure remains forbidden/deferred.

SUPPLIER-ALLOCATIONS-SERVICE-UI-CREATE-1B (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `49793f7 feat(suppliers): add manual allocation create ui`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/app/(dashboard)/services/[id]/allocations/new/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/page.tsx`
  - `src/lib/suppliers/queries.ts`
  - `src/lib/suppliers/types.ts`
- Completed Scope:
  - Added Create-only internal Supplier Allocation UI.
  - Added dedicated route: `/services/[id]/allocations/new`.
  - Added manual allocation create form.
  - Added safe active supplier options query.
  - Supplier options require both `supplier_allocations:write` and `suppliers:read`.
  - Create route requires `supplier_allocations:read`, `supplier_allocations:write`, `supplier_allocations:read_cost`, and supplier option access.
  - CTA is gated by `canWrite`, `canReadCost`, and service status.
  - Completed/Cancelled services block creation.
  - Payload is manual-only with currency `SAR` and `costSource` `manual_estimate`.
  - No customer-facing/PDF/public supplier cost exposure.
- Boundaries Preserved (Still deferred):
  - Edit Allocation UI.
  - Delete/Restore Allocation UI.
  - Rate-card allocation UI and snapshots.
  - Approved quotation allocation UI.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Supplier costing/margin reports.
  - Quotation automation.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-ALLOCATIONS-SERVICE-UI-EDIT-1C (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `1348dc9 feat(suppliers): add manual allocation edit ui`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/edit/SupplierAllocationEditForm.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
- Completed Scope:
  - Added Edit-only internal Supplier Allocation UI.
  - Added dedicated route: `/services/[id]/allocations/[allocationId]/edit`.
  - Added controlled edit form for manual allocations.
  - Supplier is displayed read-only and `supplierId` is not editable.
  - Edit route requires `supplier_allocations:read`, `supplier_allocations:write`, and `supplier_allocations:read_cost`.
  - Edit CTA is gated by `canWrite`, `canReadCost`, allocation status, `costSource`, and Service status.
  - Completed/Cancelled services block editing.
  - Cancelled allocations block editing.
  - Rate-card allocations block editing.
  - Editable fields are limited to safe manual fields: `category`, `itemName`, `unit`, `quantity`, `estimatedUnitCost`, `scopeOfWork`, `internalNotes`, `status`.
  - Status transition UI is forward-only (`draft -> draft/planned`, `planned -> planned/selected`, `selected -> selected`), and `cancelled` is not selectable through edit.
  - Payload stays manual-only with currency `SAR` and `costSource` `manual_estimate`.
  - No customer-facing/PDF/public supplier cost exposure.
- Boundaries Preserved (Still deferred):
  - Delete/Restore Allocation UI.
  - Rate-card allocation UI and snapshots.
  - Approved quotation allocation UI.
  - Supplier change/replacement after creation.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Costing/margin reports.
  - Quotation automation.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-ALLOCATIONS-SERVICE-UI-CANCEL-1D (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `7dc5063 feat(suppliers): add manual allocation cancel ui`
  - `a24999c fix(suppliers): block allocation cancel for closed services`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/cancel/SupplierAllocationCancelForm.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/page.tsx`
- Completed Scope:
  - Added Cancel-only internal Supplier Allocation UI.
  - Added dedicated route: `/services/[id]/allocations/[allocationId]/cancel`.
  - Added controlled cancellation form requiring a cancellation reason.
  - Cancel route requires `supplier_allocations:read`, `supplier_allocations:cancel`, and `supplier_allocations:read_cost`.
  - Cancel CTA is gated by `canCancel` permission, allocation status (must not be cancelled), and Service status.
  - Completed/Cancelled services block cancellation (both UI and server-side).
  - Status transitions directly to `cancelled` and is irreversible through the UI.
  - No customer-facing/PDF/public supplier cost exposure.
- Boundaries Preserved (Still deferred):
  - Delete/Restore Allocation UI.
  - Rate-card allocation UI and snapshots.
  - Approved quotation allocation UI.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Costing/margin reports.
  - Quotation automation.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-ALLOCATIONS-DELETE-RESTORE-1 (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `2307a42 feat(suppliers): add allocation delete restore flow`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/lib/supplier-allocations/actions.ts`
  - `src/lib/supplier-allocations/queries.ts`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
  - `src/app/(dashboard)/services/[id]/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/delete/SupplierAllocationDeleteForm.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/[allocationId]/restore/SupplierAllocationRestoreForm.tsx`
- Completed Scope:
  - Added Delete and Restore backend actions `deleteSupplierAllocation` and `restoreSupplierAllocation`.
  - Both actions require `supplier_allocations:write` and do NOT require `supplier_allocations:read_cost`.
  - Soft delete/restore implemented purely via `is_deleted` toggling and updating `updated_by`/`updated_at` (no hard delete, no SQL migrations, no `deleted_at`/`restored_at` columns added).
  - Restore action preserves the original allocation status.
  - Both actions reject Completed/Cancelled services, missing/deleted services, and rate-card allocations.
  - Updated read queries `getSupplierAllocationsByServiceId` and `getSupplierAllocationById` to support `includeDeleted` option (defaulting to active-only).
  - Service Detail page reads `searchParams` to support `?showDeleted=true` query.
  - `SupplierAllocationsPanel` displays "Active" / "Show Deleted" toggle tabs.
  - Deleted rows render with muted visual styling (opacity/grayscale) and clear "Deleted" badge.
  - Active rows display "Delete" CTA when allowed (manual_estimate, open service, write access).
  - Deleted rows hide Edit/Cancel/Delete and show "Restore" CTA when allowed (manual_estimate, open service, write access).
  - Added dedicated internal delete and restore confirmation routes/forms with safe read-only summary fields (supplierName, category, itemName, quantity, unit, status) without exposing estimated costs or currency variables.
  - Delete form redirects back to `/services/[id]`, restore form redirects back to `/services/[id]?showDeleted=true`.
  - No modal/dialog/sheet/react-hook-form used.
- Boundaries Preserved (Still deferred):
  - Rate-card allocation UI and snapshots.
  - Approved quotation allocation UI.
  - Supplier change/replacement after creation.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Costing/margin reports.
  - Quotation automation.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-ALLOCATIONS-RATE-CARD-CREATE-1 (Completed, Closed)
- Status: Completed, closed, committed, and pushed.
- Commits:
  - `9dd6839 feat(suppliers): add rate-card allocation create flow`
- Author: `shingami66 <157619702+shingami66@users.noreply.github.com>`
- Implemented in:
  - `src/lib/supplier-allocations/schemas.ts`
  - `src/lib/suppliers/rate-card-actions.ts`
  - `src/lib/supplier-allocations/actions.ts`
  - `src/app/(dashboard)/services/[id]/allocations/new/page.tsx`
  - `src/app/(dashboard)/services/[id]/allocations/new/SupplierAllocationCreateForm.tsx`
  - `src/app/(dashboard)/services/[id]/SupplierAllocationsPanel.tsx`
- Completed Scope:
  - Added support for `costSource = rate_card` in `createSupplierAllocation` Server Action.
  - Client does not submit `rateCardSnapshot`. The server loads `supplier_rate_cards` server-side, validates it (existence, active status, not deleted, SAR currency, base cost, supplier ownership, expiration check), and builds the snapshot server-side.
  - Historical Service costing must not change when supplier rate card changes later.
  - Allocation row and rate_card_snapshot preserve pricing context at creation time.
  - Updated `supplierAllocationCreateSchema` to omit `rateCardSnapshot` client requirement, while still requiring `supplierRateCardId` when `costSource === 'rate_card'`.
  - Manual estimate validation remains unchanged.
  - Snapshot schema remains available for server-built snapshots.
  - Form UI checks `supplier_costing:read` permission. Only displays `From Rate Card` mode toggle when allowed.
  - Manual Estimate remains default.
  - Added dynamic loading of active rate cards upon supplier selection.
  - Form displays cost details (cost, category, item name, unit) as read-only, allowing user input only for quantity, scope of work, and internal notes.
  - Enabled soft-deletion and restoration for rate-card allocations, while preserving their read-only state in manual edit flow.
  - Rate-card allocations can be cancelled.
  - Soft delete/restore preserves supplier_rate_card_id and rate_card_snapshot.
  - Existing Edit UI remains manual_estimate only.
- Boundaries Preserved (Still deferred):
  - Rate-card edit flow.
  - Rate-card management CRUD/write workflows.
  - Rate-card overlap enforcement.
  - Supplier Booking.
  - Supplier invoices/payments.
  - Actual expense posting.
  - Costing/margin reports.
  - Quotation automation from supplier cost.
  - Customer-facing/PDF/public supplier cost exposure.

SUPPLIER-BOOKINGS-FOUNDATION-1 (Completed, Closed)
- Status: Completed, verified, committed, and pushed.
- Commits:
  - `5866d42 db(suppliers): add supplier bookings foundation migration`
  - `04d1e7c db(suppliers): sync supplier bookings schema`
- Scope: Database foundation completed.
  - The `supplier_bookings` table exists in the database.
  - RLS is enabled; direct table access for `anon` and `authenticated` roles is revoked.
  - Foreign keys (`source_allocation_id`, `service_id`, `supplier_id`) are strictly immutable.
  - Insert triggers (`trg_supplier_bookings_insert_sync_allocation`) enforce business rules, ensuring consistency between `service_supplier_allocations` and the new booking.
  - Booking numbers are generated server-side using `generate_document_number('supplier_booking')` (e.g. `SBK-YYYY-0001`).
  - Indexes exist, including `idx_supplier_bookings_one_active_per_allocation` to enforce at most one active booking per allocation.
- **Deferred**: Supplier Bookings Domain, UI, permissions, actions, pages, and runtime behavior are explicitly deferred to future tasks.
- Terminology constraint: Uses `Supplier Booking` / `supplier_bookings` / `SBK`. Do not use Internal PO / Purchase Order.

SUPPLIER-BOOKINGS-RUNTIME-1 (Planned future item)
- Status: Not implemented, Not started, Not complete.
- Scope: Domain, UI, permissions, actions, pages, and runtime behavior.



SUPPLIERS-LIST-LIVE-1
- Status: Superseded/completed by `SUPPLIERS-LIVE-READ-FOUNDATION-1`.
- `/suppliers` no longer depends on `suppliersData` for the live page. The remaining mock data file is not the route data source. Supplier CRUD/write and finance/workflow modules remain deferred.

INVOICE-LIST-SORT-1
- Status: Completed.
- Implemented in commit `9c297a6`.
- Invoices page sorts by `invoice_number` ascending.
- Manual smoke passed.
- No invoice numbering reset, fake filler invoices, or manual renumbering was done.

INVOICE-NUMBER-GAP-AUDIT-1
- `INV-2026-0001`, `INV-2026-0002`, and `INV-2026-0003` are absent from the `invoices` table. Stored invoices currently start at `INV-2026-0004`.
- Latest stored invoice from smoke is `INV-2026-0008`. `number_sequences` for `invoice` / `2026` is `8`.
- Treat this as a development/smoke numbering gap. Do not reset invoice numbering. Do not create fake filler invoices. Do not manually renumber existing invoices.
- Future production financial lifecycle should use void/cancel/reversal rather than hard deletion.

SERVICE-STATUS-WORKFLOW-1
- Status: Stage 1 completed.
- Implemented in commit `0b0cc78`.
- Manual Service status control is available from Service detail.
- Status changes update `services.status`.
- Manual smoke passed on `SVC-2026-0008`; it reached `Completed` and displayed correctly in Service detail and Services list.
- Current behavior is manual-only.
- No automation was added.
- No DB migration was added.
- The system does not yet validate quotation, invoice, payment, or delivery state before changing Service status.
- Guarded transitions are implemented under `SERVICE-STATUS-GUARDED-TRANSITIONS-1`.

SERVICE-STATUS-STATE-MACHINE-SPEC-1
- Status: Completed and pushed as Spec Kit design only.
- Implemented in commit `760c569 spec(services): define status state machine`.
- Design artifacts live under `specs/003-service-status-state-machine/`.
- This does not implement guarded transitions, `services:update_status`, UI next-state filtering, status history/audit persistence, or status automation.
- All Sprint 1 workflow blocker tasks are now complete: `SERVICE-DETAIL-RELATED-QUOTE-CTA-1`, `QUOTE-TO-DEPOSIT-CTA-1`, `INVOICE-LIST-REMOVE-STANDALONE-CREATE-1`, and `HUMAN-REFERENCE-DISPLAY-1`.

TEAM-LEAD-CODEX-UX-ERP-BACKLOG-1
- Status: Captured / Not completed.
- Team Lead UX/UI score: `6.4/10`.
- Readiness: guided internal demo-ready, not operational-ready, not client-production-ready.
- Codex analysis: Team Lead report is directionally accurate but partly stale. Supplier create/live/UX fixes, quotation Approve/Reject, paid or zero-balance invoice payment disablement, Admin self-role/self-deactivation protections, and last-active-admin protection are already present.
- Planning rule: broad redesign is not planned. Use targeted ERP workflow hardening slices.

Critical / Sprint 1 backlog:
- [x] `SERVICE-STATUS-GUARDED-TRANSITIONS-1`: implemented guarded Service status transitions; free status jumping removed; `services:update_status` permission enforced.
- [x] `SERVICE-DETAIL-RELATED-QUOTE-CTA-1`: add Create Quotation CTA where Service Detail has no related quotation. (Commits: `80e3765`, `0930954`. Manual smoke and Clean Code Guard passed. CTA appears inside Service Detail Related Quotations. Eligibility fix restricts already-started services.)
- [x] `QUOTE-TO-DEPOSIT-CTA-1`: add Create Deposit Invoice CTA from an approved quotation where workflow state allows it. (Commit: `103e0fa`. Reuses existing `CreateDepositInvoiceAction`. Option A implemented: displays invoice number as text with guidance and avoids 404 links. Option B deep-linking moved to backlog as separate `INVOICE-LIST-DEEP-LINK-SELECTION-1` task. Option C detail page rejected.)
- [x] `INVOICE-LIST-REMOVE-STANDALONE-CREATE-1`: remove disabled standalone Create Invoice affordance from the Invoices page. (Commit: `ada01f0`. Generic disabled Create Invoice button removed from Invoices list and replaced with safe workflow copy. Server-side context-guarded validation remains intact.)
- [x] `HUMAN-REFERENCE-DISPLAY-1`: replace visible UUIDs/internal identifiers with human reference numbers where users make decisions (e.g., visible Customer UUID in Service Detail Customer Summary). (Commit: `f68afe0`. Replaced raw UUIDs with `customerNumber` and `relatedQuoteNumber` in Service Detail and Invoice side panel with safe fallbacks. Internal routes and actions were preserved.)

High priority backlog:
- `FORMAT-STANDARDIZATION-1`: standardize currency display and related numeric formatting (inconsistent formatting noted in service/billing areas).
- `DATE-FORMAT-STANDARDIZATION-1`: standardize date display across lists, detail pages, and documents (inconsistent formatting noted in service/billing areas).
- `DATA-QUALITY-INPUT-NORMALIZATION-1`: normalize city inputs and old data values (e.g., location typo `ryade` in existing data).
- `BILLING-LABEL-COPY-POLISH-1`: polish billing labels (such as `Prior Invoiced` and `Remaining`) according to Team Lead backlog feedback.
- `UI-QUALITY-WARNINGS-CLEANUP-1`: clean up minor UI issues and DevTools console warnings (e.g., missing form field `id`/`name`, CSP `eval` warnings).
- `LIST-SEARCH-FILTER-PARITY-1`: align search/filter behavior across major list pages.
- `INVOICE-DUE-DATE-LIST-1`: expose invoice due-date visibility where list decisions require it.
- `SERVICE-PAYMENTS-PANEL-1`: add Service-level payment visibility without changing financial source of truth.
- `CUSTOMER-TYPE-DEFAULT-1`: define and apply safer customer type defaults.
- `BREADCRUMB-NAV-1`: add consistent breadcrumb navigation for deep module pages.
- `USER-FRIENDLY-ERROR-COPY-1`: replace technical error wording with user-safe operational copy.
- `RBAC-ROLE-MODEL-LOCK-1`: lock and document the practical role model before more write workflows expand.
- `EVENT-TYPE-TAXONOMY-1`: confirm event taxonomy before depending on event type reporting or automation.

Polish / later backlog:
- `USER-MANAGEMENT-CONFIRMATION-POLISH-1`
- `QUOTE-APPROVAL-UX-POLISH-1`
- `GLOBAL-SEARCH-1`
- `CUSTOMER-HUB-TABS-1`

SERVICE-STATUS-GUARDED-TRANSITIONS-1
- Status: Deferred / Post-MVP Review.
- Future stage should evaluate guarded status transitions or warnings based on quotation, invoice, payment, and delivery state.
- Future rules may warn or require confirmation before marking `Completed` while active invoices still have balance due, warn before marking `Deposit Paid` if no deposit/progress payment exists, possibly guard `Approved` based on approved quotation state, and require cancellation reason when moving to `Cancelled`.
- Do not blindly block operational manual status changes. Use warnings, confirmations, or role-based manual override before hard blocking.

INVOICE-PDF-BREAKDOWN-1
- Status: Completed.
- Implemented in commit `b38a75f fix(invoices): add compact invoice pdf breakdown`.
- Compact display-only invoice PDF breakdown uses persisted invoice fields and existing snapshot values only.
- Deposit/final PDFs now show Approved Quotation Total when available, Previous Invoices / Deposits when available, Total Amount, Amount Paid, and Balance Due in the existing totals section.
- Manual visual smoke passed on `INV-2026-0004` and `INV-2026-0005`; both tested PDFs fit one A4 page after final duplicate footer cleanup.
- `Commercial Invoice` title and Tax/VAT `Not applied` behavior were preserved.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.

INVOICE-PDF-LAYOUT-1
- Status: Deferred / As Needed.
- A future page numbering or print-scaling strategy is only needed for genuinely multi-page PDFs. The compact invoice PDF MVP removed misleading hardcoded page-count text from the tested one-page PDFs.

QUOTATION-VALIDITY-1
- Default Valid Until from company settings, usually issue date + 7 days.

SERVICE-BUDGET-GUARD-1
- Show warning when quotation total exceeds service estimated budget.

GLOBAL-INVOICE-WIZARD-1
- Global invoice creation from Invoices page remains deferred.

### SETTINGS-EDIT-MODE-1
Status: Pending before ERP-3

Checklist:
- [ ] Company Settings page read-only by default.
- [ ] Add `Edit Settings` button.
- [ ] Only after clicking edit, fields become editable.
- [ ] Show `Save Changes` and `Cancel`.
- [ ] Cancel discards unsaved changes.
- [ ] Existing validation, permissions, and bank masking must remain respected.

### CUSTOMER-NUMBER-1
Status: DB-applied and App/UI repo-ready

Checklist:
- [x] Generate customer number/code (e.g. `CUST-2026-0001`).
- [x] Add customer number/code without breaking existing IDs or foreign keys.
- [x] Show in customers list.
- [x] Show in customer detail.
- [ ] Use in future invoice/payment/document selection where useful.
- [x] Generated by system, not manually entered.

### LIST-PAGINATION-PARITY-1
Status: Complete

Checklist:
- [x] Customers list: 10 rows per page.
- [x] Services list: 10 rows per page.
- [x] Quotations list: 10 rows per page.
- [x] Previous / Next controls when count exceeds 10.
- [x] Preserve search/filter behavior across pages.
- [x] Shared `PaginationFooter` component used.

### QUOTATION-PDF-CLEANUP-1
Status: Verified (data cleanup) / Print headers pending

Checklist:
- [x] Verify Email displays as plain `info@g7blue.com`.
- [x] Verify Terms display professional terms.
- [x] Verify CR does not display fake placeholder.
- [x] Verify no Tax Invoice / ZATCA / FATOORA / VAT 15% is displayed while not VAT registered.

#### QUOTATION-PDF-PRINT-SETTINGS-1
Status: Pending (Before external/client-facing PDF sharing)

Checklist:
- [ ] Fix print/export polish: provide a cleaner PDF/export experience where generated documents do not show browser URL/date/title/page footer artifacts.
- [ ] This is not a VAT/data correctness issue. PDF data cleanup is verified.
- [ ] User workaround: disable `Headers and footers` in the browser print dialog.
- [ ] This must be fixed before external/client-facing PDF usage, even if ERP-3 can continue.

### ADMIN-USERS-SMOKE-1
Status: Pending later controlled smoke

Checklist:
- [ ] Controlled smoke for invite, pending invitation, revoke modal.
- [ ] Controlled smoke for role changes.
- [ ] Controlled smoke for self-protection and final active Admin protection.

### EXPORT-REPORTS-XLSX-1
Status: Complete

Checklist:
- [x] Customers raw CSV export replaced with branded XLSX report.
- [x] Shared export helper introduced.
- [x] Permissions were intentionally not changed in this task.
- [x] Viewer export permission review remains a separate future decision/task (Resolved in CUSTOMERS-SECURE-SUMMARY-XLSX-1B).

### CUSTOMERS-SECURE-SUMMARY-XLSX-1B
Status: Complete

Checklist:
- [x] Fix export RBAC by adding `customers:export` permission.
- [x] Allow export only for admin, manager, accountant.
- [x] Block Viewer from exporting.
- [x] Replace stale customer report metrics with real metrics from `public.customer_report_metrics`.
- [x] Update column formatting (text for phone/email, currency for total amount).

### CUSTOMER-REPORT-METRICS-VIEW-1
Status: Manually applied and verified

Checklist:
- [x] Create SQL migration for `customer_report_metrics` view.
- [x] Use `security_invoker = true`.
- [x] Aggregate `services_count`, `quotations_count`, and `total_quoted_amount` on server side.
- [x] Mozfer to manually apply SQL in Supabase.
- [x] Verify view returns expected aggregation metrics.

Manual verification evidence:
* `public.customer_report_metrics` was manually applied in Supabase by Mozfer.
* The view was verified successfully and is the source of real customer summary metrics.
* Verified rows:
  - CUST-2026-0007: services_count=2, quotations_count=3, approved_quotations_count=1, draft_quotations_count=2, total_quoted_amount=408558.00
  - CUST-2026-0006: services_count=2, quotations_count=2, approved_quotations_count=1, draft_quotations_count=0, total_quoted_amount=13223.00
  - CUST-2026-0008: services_count=1, quotations_count=4, approved_quotations_count=0, draft_quotations_count=4, total_quoted_amount=66953.00

### CUSTOMERS-EXPORT-POLISH-AND-DOCS-1
Status: Complete

Checklist:
- [x] Make Customers Export a lightweight customer-level summary.
- [x] Remove quotation pipeline breakdown columns from Customers Export only.
- [x] Keep the database view and data model fields unchanged for future reports.
- [x] Document the reporting strategy and deferred reporting modules.

### CUSTOMERS-EXCEL-HEADER-POLISH-1
Status: Complete

Checklist:
- [x] Customers XLSX now uses a professional merged blue report header.
- [x] Phone/text cells are explicitly text-safe to prevent scientific notation.
- [x] The export remains a lightweight current filtered view report.
- [x] No change was made to reporting strategy, permissions, view, queries, or data model.

Final Customers XLSX export columns are exactly:
- Customer Number
- Company
- Contact Person
- Email
- Phone
- City
- Status
- Services Count
- Quotations Count
- Total Quoted Amount (SAR)

Notes:
* `Approved Quotations` and `Draft Quotations` were intentionally removed from the Customers export only.
* `Approved/Draft` metrics remain available in `customer_report_metrics`, types, mappers, and queries for future reports.
* Customers export remains a lightweight current filtered view report.
* Customers export is not a full pipeline report and not a full customer activity report.

### Reporting Strategy
Status: Documented

Each main module should eventually have its own dedicated report:
1. Customers Report
2. Services Report
3. Quotations Report
4. Invoices Report
5. Payments Report

Additionally, each customer should eventually have a fixed full customer-specific report from `/customers/[id]`.

Customers Report:
- Current implemented report.
- Source: Customers page.
- Scope: current filtered customer list.
- Format: lightweight XLSX.
- Purpose: customer-level summary.

Services Report:
- Future dedicated report.
- Scope: service/booking details.

Quotations Report:
- Future dedicated report.
- Scope: quotation details, quotation amounts, quotation status breakdown.
- Approved/Draft/Rejected/Expired analysis belongs here.

Invoices Report:
- Future dedicated report.
- Scope: invoice/billing details and totals.

Payments Report:
- Future dedicated report.
- Scope: collection/payment tracking.

Customer Full Report:
- Future dedicated report from `/customers/[id]`.
- One customer only.
- Should combine the customer profile and all related business activity.
- Suggested XLSX workbook sheets:
  - Profile
  - Services
  - Quotations
  - Invoices
  - Payments

Future UI Direction:
- List page export means: Export current filtered view.
- Future selection export can add selected customers and column configuration.
- Customer-specific reports should live inside the Customer Detail page.

## 4. Update Rule After Every Merge

Documentation must be updated after:
- every merged PR
- every manual database/Supabase apply or verification
- every smoke test that changes completion status
- every Team Lead decision that changes a business rule, priority, or deferred decision
- before starting the next major task if prior status may be stale

After each docs-impacting event, run a docs update task:
- mark completed phase checkbox
- add commit hash and PR if available
- move current phase
- add any new deferred decisions
- document any known risks
- commit docs update if separate, or include in next planning commit

Before any docs commit, agents must run a documentation staleness audit:
- identify what changed in code
- identify what changed outside code
- identify what was previously pending and is now completed
- identify stale wording that must be corrected
- identify what remains truly pending
- confirm next locked priority

Agents must search or review wording such as:
- pending
- prepared
- manual apply
- required before
- blocked until
- DEV_ONLY
- current phase
- next priority

Any match must be checked for current truth before committing docs.

## Mandatory Runtime Build Gate
All runtime implementation slices must pass `pnpm run lint`, `pnpm exec tsc --noEmit`, and `pnpm build` before commit readiness. Docs-only slices do not require build unless runtime files changed.

## RLS Verification Requirement
The hardening review must verify RLS policies on `service_supplier_allocations`.
Must verify:
- no broad anon SELECT/INSERT/UPDATE/DELETE access
- no broad authenticated SELECT access bypassing application-level RBAC
- no direct table access exposing cost fields without mapper redaction
- RLS behavior aligns with server-action/application RBAC
