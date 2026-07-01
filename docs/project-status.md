# G7 BLUE CRM - Project Status

## 1. Project Overview
- **Project Name:** G7 BLUE CRM
- **Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase, Clerk Auth, PostgreSQL RPC
- **Purpose:** A robust CRM tailored for G7 BLUE, managing customer relationships, event work, financial documents, payments, and operational tracking.
- **Product Direction:** G7 BLUE CRM is an Events CRM + Billing system, not a generic billing-only CRM.
- **Core Flow:** Customer Profile -> Service -> Quotation -> Invoice -> Payment
- **Core Entity:** Service / Booking is the operational entity for new ERP work, not Project.
- **Current VAT Field:** The implemented Company Settings VAT field is `company_settings.vat_mode`.

## 1.1 Confirmed Company Identity & Document Rules
- **Legal English Name:** G SEVEN BLUE Company
- **Brand Name:** G7 BLUE
- **VAT Status:** Not VAT registered.
- **TIN / Ø§Ù„Ø±Ù‚Ù… Ø§Ù„Ù…Ù…ÙŠØ²:** 3146944674 (Do not use TIN as VAT Number)
- **Entity Unified No:** 7053901414 (Do not treat as CR unless confirmed)
- **VAT Number:** null / not applicable / not available
- **Official Email:** [info@g7blue.com](mailto:info@g7blue.com)
- **Official Mobile:** +966 55 570 0349
- **Website:** g7blue.com
- **City:** Riyadh, Saudi Arabia
- **National Address:** Short Address: RBDA7036, Building No: 7036, Street: Sayida / ØµÙŠØ¯Ø§, District: Al Duraihemiyah Dist. / Ø­ÙŠ Ø§Ù„Ø¯Ø±ÙŠÙ‡Ù…ÙŠØ©, Secondary No: 2487, Postal Code: 12796, City: Riyadh / Ø§Ù„Ø±ÙŠØ§Ø¶
- **Bank Details:** Alinma Bank / Ù…ØµØ±Ù Ø§Ù„Ø¥Ù†Ù…Ø§Ø¡ | Account No: 68207417001000 | IBAN: SA5005000068207417001000
- **Official Logo Asset:** `public/brand/G7_BLUE_Events_Icon_White_BG.png` (Public path: `/brand/G7_BLUE_Events_Icon_White_BG.png`)

### Document Generation Rules
- **Quotation Documents:** Must show logo, legal name, brand name, TIN, and bank/payment info. Must NOT show VAT Number, Tax Invoice wording, VAT 15%, or ZATCA/FATOORA claims while `vat_mode = not_registered`.
- **Deposit/Proforma/Receipts:** Allowed while not registered. Must NOT claim to be Tax Invoice, display VAT Number, or calculate VAT 15%. Must use VAT rate 0.
- **Tax Invoice:** Blocked while `vat_mode = not_registered`. Remains deferred until official VAT registration and VAT Number are confirmed. ZATCA/Phase 2 deferred.
- **Snapshot Rule:** Generated customer-facing documents must snapshot company details, financial values, VAT mode, VAT rate, document labels, logo path, and bank/payment details at issue time. Historical documents must not change if Company Settings change later.
- **CR Status:** CR number is optional/unconfirmed.
- **Official Email:** Must be stored as a plain email string without markdown.
## 2. Working Rules
- **Workflow:** Plan -> Implement -> Build -> Manual Test -> Audit -> Commit -> Push -> PR -> Merge
- **Security:** No `.env.local` exposure; never committed to Git.
- **Git:** No `git add .` (only stage intentionally modified files).
- **Database:** No migrations without strict review; PostgreSQL RPC is the absolute source of truth for financial totals.
- **Data Access:** Supabase Admin client runs server-side only; all write Server Actions enforce `requirePermission`; no raw Supabase errors exposed to UI.
- **Docs:** After merged phases, manual database/Supabase apply or verification, smoke tests that change completion status, or Team Lead decisions, update `docs/project-status.md`, `docs/project-roadmap.md`, and `docs/deferred-decisions.md` when applicable. Before committing docs, run the documentation staleness audit in `docs/project-roadmap.md`.

## 3. Completed Milestones

### âœ… Foundation UI / Routes
- [x] dashboard routes exist
- [x] UI started with mock data
- [x] modules being converted gradually to live Supabase data

### âœ… Supabase + Clerk Foundation
- [x] Supabase schema exists
- [x] Supabase client/admin setup exists
- [x] `/api/health/db` works
- [x] Clerk Auth works
- [x] protected routes redirect correctly
- [x] `.env.local` ignored and not committed

### âœ… Core Security / RBAC
- [x] `app_users` table
- [x] roles: admin, manager, sales, operations, accountant, viewer
- [x] helpers: `requireUser`, `getCurrentAppUser`, `requireRole`, `requirePermission`
- [x] `UnauthorizedError` / `ForbiddenError`
- [x] `src/lib/auth/errors.ts` is canonical for `UnauthorizedError` and `ForbiddenError`
- [x] `permissions.ts` imports and throws the shared auth errors
- [x] `created_by` / `updated_by` fields added
- [x] `audit_logs.user_id` converted to text
- [x] Clerk user ID stored as text
- [x] `DEV_ONLY` RLS policies existed for development
- [x] SEC-RLS-BASELINE-1 migration prepared to remove broad DEV_ONLY table policies
- [x] Manual Supabase SQL Editor apply and database verification for SEC-RLS-BASELINE-1
- [x] Live database verification returned zero DEV_ONLY policies and zero broad authenticated `USING true` / `WITH CHECK true` policies
- [x] RLS enabled check passed for affected tables
- [x] Quotation RPC grants verified: `anon_execute = false`, `authenticated_execute = false`, `service_role_execute = true`
- [x] Final production RLS hardening is still required

### âœ… SEC-AUTHZ-APP-USER-GATE-1
- [x] Security blocker discovered: a Clerk-authenticated user with no `app_users` row could access `/dashboard` and all internal CRM navigation.
- [x] Root cause: `(dashboard)/layout.tsx` had no `app_users` membership check; Clerk authentication alone was sufficient to enter the internal CRM.
- [x] Fix: dashboard layout now requires an active `app_users` row (matched on `clerk_user_id` as TEXT); users without membership are redirected to `/unauthorized`.
- [x] `/unauthorized` page created with navy/gold design, no sidebar, no internal navigation, no internal data.
- [x] `/services(.*)` added to Clerk protected routes in `src/proxy.ts` (was missing).
- [x] Existing permission system (`requirePermission`, `requireUser`) continues to protect Server Actions.
- [x] Role source remains `app_users.role`. User linkage remains `app_users.clerk_user_id`.
- [x] No users were inserted, updated, or auto-promoted.
- [x] No schema changes, no migrations, no SQL was run.
- [x] Admin user management / invite workflow remains deferred.
- [x] This fix does not solve production RLS hardening; that remains separate/deferred.
- [x] Implementation passed manual verification by Mozfer (active admin access works, unapproved Clerk users are blocked and see `/unauthorized`, direct route access is blocked).
- [x] `QUOTE-APPROVAL-FLOW-1B` remains in stash, pending restoration and smoke after this security fix is committed/merged.

### âœ… CUSTOMER-NUMBER-1
- [x] DB migration applied manually, adding `customer_number` sequence.
- [x] App layer generates customer number server-side via `generate_document_number` RPC.
- [x] UI updated to show customer number instead of UUID prefix.
- [x] Schema synchronized in `schema.sql`.

### âœ… Customers CRUD
- [x] list/read customers from Supabase
- [x] add customer
- [x] edit customer
- [x] soft delete customer
- [x] RBAC: `customers:read`, `customers:write`
- [x] Access Denied state
- [x] no `[]` returned for Unauthorized/Forbidden
- [x] merged into main

### âœ… Customers CSV Export
- [x] export visible customers to CSV
- [x] filename format: `g7-blue-customers-YYYY-MM-DD.csv`
- [x] correct CSV escaping
- [x] disabled when list is empty
- [x] merged into main

### âœ… Quotations RPC Foundation
- [x] `vat_rate` added to quotations
- [x] quotation number standardized to QT-YYYY-0001
- [x] `create_quotation_with_items` RPC
- [x] `update_quotation_with_items` RPC
- [x] calculations done server-side/PostgreSQL
- [x] `quotation_items.total` = qty * unit_price before VAT
- [x] `quotation_items.vat` = VAT amount, not rate
- [x] discount applied before VAT
- [x] proportional discount allocation
- [x] VAT residual adjustment so `SUM(item.vat)` = `quotations.vat_amount`
- [x] RPC execute restricted to `service_role`
- [x] `generate_document_number` locked to `service_role`
- [x] migration applied manually in Supabase
- [x] build passed
- [x] `/api/health/db` returned ok:true
- [x] PR merged into main

### âœ… Quotations Data Layer
- PR #4 merged into main
- Branch: `feature/quotations-data-layer`
- Created `types.ts`, `schemas.ts`, `mappers.ts`, `queries.ts`, `actions.ts`, `index.ts`
- Audit passed: permissions enforced, soft delete blocked for approved quotations, numeric `Number()` mapping added, `is_deleted` filter applied, safe errors implemented.

### âœ… Phase 5A - Quotations UI Manual Entry: List + Create Form
- `/quotations` now uses live `getQuotations()` data
- `/quotations/new` creates quotations with manual items only
- Customer dropdown only receives active and non-deleted customers
- Earlier quotation UI used a fixed VAT preview; TAX-0 requires this wording not be treated as current tax registration or official invoice behavior.
- Client totals are preview only and PostgreSQL RPC remains source of truth
- Edit, soft delete, detail, and print were deferred to later quotation phases
- PR merged into main

### âœ… Phase 5B - Quotations Edit + Soft Delete
- Draft quotations can now be edited
- Non-draft quotations show locked edit behavior
- List actions respect `quotations:write`
- Read-only users can still view quotations
- Approved quotations cannot be deleted from UI
- Backend `softDeleteQuotation` remains the authority
- `checkPermission` was added as a server-only helper for conditional UI only

### âœ… Phase 6 - Quotation Detail + Browser Print
- Quotation detail page now uses live `getQuotationById` data
- Print route now uses live quotation data
- Browser print uses `window.print()` isolated inside a Client Component (`PrintButton`)
- UI wording is "Print / Save as PDF", not "Generate PDF"
- Browser print layout was improved after stabilization/product review
- Server-side PDF generation remains deferred
- No PDF dependencies were added
- Company/business info currently uses static `settingsData` fallback; live `company_settings` remains deferred, and fallback output must not claim VAT registration or official tax invoice behavior
- Unauthorized redirects use `/sign-in` (Phase 6 pre-commit audit found an incorrect `/login` redirect and fixed it to match the existing app pattern)
- Forbidden users see Access Denied inline
- Fake quick approval/status buttons were removed
- Totals are backend/data-layer values, not recalculated in UI
- PR merged into main

### âœ… Quotation Stabilization + Product Review
- Quotations core flow is stabilized for the current demo path: create, edit draft, view detail, and browser print.
- Auth error imports were fixed.
- `src/lib/auth/errors.ts` is the canonical source for `UnauthorizedError` and `ForbiddenError`.
- `permissions.ts` imports and throws the shared auth errors instead of defining duplicate classes.
- Quotation RPC ambiguity was fixed.
- `create_quotation_with_items` and `update_quotation_with_items` now qualify `quotation_items` references with aliases.
- PostgreSQL `RETURNS TABLE()` ambiguity lesson captured: output column names can shadow unqualified table references inside PL/pgSQL functions.
- Quotation creation was verified working after manual Supabase apply.
- Quotation browser print layout was improved.

### âœ… Phase CS-A - Company Settings Mini
- Live singleton Company Settings was implemented as CS-A only.
- CS-A uses server-only settings queries/actions, Zod validation, `settings:read`, and `settings:write`.
- Bank details are restricted in the app data flow to Admin and Accountant; Viewer can read settings without receiving bank values.
- VAT mode defaults to `not_registered`; default VAT percent is `0` while not registered.
- Logo upload is deferred.
- Live settings are intentionally not wired into quotation/invoice print views. CS-B document snapshot wiring is required before printed documents depend on Company Settings.
- SQL migration was reviewed for manual apply; SQL must never be applied automatically by agents.
- CS-A was committed on `main` as `8dc380f feat: implement Company Settings CS-A`.

### âœ… ERP-1 - Services DB Foundation
- ERP-1 Services migration was manually applied in Supabase SQL Editor and verified.
- `services` now exists as the new operational unit linked to `customers(id)`.
- Service numbering is supported through `generate_document_number('service')` with `SVC-YYYY-0001`.
- Existing prefixes are preserved: `QT`, `INV`, `PAY`, `PRJ`, and `SVC`.
- `schema.sql` now reflects the verified post-ERP-1 DB state.
- Services app UI/routes/server actions now support live service list/create/detail/edit, with status transitions still deferred.
- Quotations are now service-scoped through `quotations.service_id`; invoices and payments are not changed yet.
- Invoices and payments are not changed yet.
- Legacy `projects` remain for now.
- `DEV_ONLY_services` is fake/dev-data only and not production-safe.

### âœ… PRJ-CLEANUP-1 - Retire User-Facing Projects UI
- Projects were removed from primary user-facing navigation.
- Dashboard Project cards/actions/sections were replaced with Service / Booking-oriented surfaces that point to the existing Services route.
- `/projects` now redirects to `/services`.
- Legacy project schema, permissions, types, mock data, customer `projects_count`, and supplier PRJ mock references remain deferred for later cleanup.

### âœ… QUOTE-VALIDITY-RULE-1 - Quotation Validity Against Service Schedule
- PR #17 merged into `main` as `96643e6 Merge pull request #17 from shingami66/fix/quotation-validity-service-schedule`.
- Service Schedule is read-only context in the quotation create UI.
- Issue Date is read-only and remains the quotation document issue date.
- Quotation Valid Until means offer expiry date, not service execution date.
- `valid_until >= issue_date` remains enforced.
- If Service Start Date exists, `valid_until <= service.event_start_date`.
- If Service Start Date is before Issue Date, quotation create/update is blocked with a controlled error.
- Validation is enforced in both UI and Server Actions.
- Services list is sorted by service number ascending.
- Native number input spinners are hidden in quotation numeric inputs.
- No schema, migration, RPC, VAT, invoice/payment, or financial total authority changes were made.

### âœ… QUOTE-APPROVAL-FLOW-1B - Quotation Approval Workflow
- Quotation approval logic implemented.
- Added `approveQuotation` and `rejectQuotation` actions.
- Enforces one approved quotation per service via database unique constraint (`unique_approved_quotation_per_service`).
- Admin smoke passed.
- Manual migration was applied and verified.
- `supabase/schema.sql` is synced.
- Full parent `QUOTE-APPROVAL-FLOW-1` is marked complete.
- Multi-role browser smoke for Manager/Sales remains pending until official test users / Admin User Management are available.
- Service status transition on approval remains deferred.

### âœ… ADMIN-USER-MANAGEMENT-1A
- Completed inspection and design phase for invite-only user management.
- Approved Option D: Clerk Invitations API + invitation metadata + `user.created` webhook.
- Corrected metadata wording: use Clerk invitation metadata / `publicMetadata` unless future SDK verification proves `privateMetadata` support for user invitations.
- The invitation role is bootstrap-only; final CRM authorization remains sourced from `app_users.role`.
- Decided against a separate `user_invitations` table for the 1B MVP.
- Decided against changing `app_users.clerk_user_id` from NOT NULL.
- Confirmed webhook verification is mandatory for future implementation.
- Confirmed webhook failure rule: if invitation metadata is missing, invalid, or contains an unrecognized role, do not create an `app_users` row and do not assign a default fallback role.
- Sent workflow remains deferred.
- Approval audit fields remain deferred.
- Invoice/payment creation remains future ERP scope.
- VAT/ZATCA remains out of scope.

### âœ… ADMIN-USER-MANAGEMENT-1B
- Implemented `/admin/users` UI built and connected to Server Actions.
- ADMIN-USER-MANAGEMENT-1B code implementation is complete; real Clerk invitation/webhook smoke testing remains pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer explicitly approves creating a real test invitation/user.
- Server Actions implemented for inviting users, managing roles, revoking invitations, and toggling active status.
- Clerk SDK Invitations API integration with `publicMetadata` role embedding.
- Clerk `user.created` webhook implemented with signature verification and strict validation.
- Webhook enforces strict validation rules: ignores missing or invalid roles to prevent fallback access.
- Final authorization relies strictly on `app_users.role`. Authentication relies on Clerk.
- Invite Server Action enforces `users:invite`; role update, active/inactive toggle, invitation revoke, and pending invitation reads enforce `users:manage`.
- Self-deactivation and self-role-change are blocked to reduce admin lockout risk.
- Admin user list database errors show a safe error state instead of "No users found".
- Successful user-management actions refresh server data in the UI.
- `CLERK_WEBHOOK_SIGNING_SECRET` is required for real Clerk webhook testing; missing secret fails safe before processing.
- Admin can invite another user with any allowed CRM role, including `admin`, only by explicitly selecting that role. The invite form defaults to `viewer`, never `admin`.
- No real Clerk users/invitations were created during implementation.
- Last-active-admin protection and a proper revoke confirmation modal were deferred to ADMIN-USER-MANAGEMENT-1C-B.
- No schema changes, migrations, SQL, or package changes were made for ADMIN-USER-MANAGEMENT-1B.

### âœ… ADMIN-USER-MANAGEMENT-1C-B
- Implemented last-active-admin protection server-side in Admin User Management Server Actions.
- Deactivating the final active admin is blocked with a safe UI-facing error.
- Changing the final active admin to a non-admin role is blocked with a safe UI-facing error.
- Existing self-deactivation and self-role-change protections remain in place.
- Replaced the native revoke invitation `confirm()` with a CRM-styled confirmation modal using existing G7 BLUE design tokens.
- Real Clerk invitation/webhook smoke testing remains pending until `CLERK_WEBHOOK_SIGNING_SECRET` is configured and Mozfer explicitly approves creating a real test invitation/user.
- No real Clerk users/invitations were created during implementation.
- [x] No SQL, migrations, package, environment, or schema changes were made for ADMIN-USER-MANAGEMENT-1C-B.

### âœ… DOCUMENT-BRANDING-PRINT-1B
- Applied official G7 BLUE identity and logo to Quotation and Invoice PDF/print views.
- Removed fake VAT, Tax Invoice, and CR values.
- Used Entity Unified No `7053901414` and TIN `3146944674`.
- Retained `not_registered` VAT status.
- Implemented purely in the UI, avoiding premature ERP-3 database snapshots or schema changes.

### âœ… DOCUMENT-SNAPSHOT-WIRING-1B
- [x] DOCUMENT-SNAPSHOT-WIRING-1A completed.
- [x] DOCUMENT-SNAPSHOT-WIRING-1B completed.
- Quotation snapshot UI wiring, DB migrations, backfill, RPC updates, and schema sync completed.
- `company_settings` and `customers` are decoupled from printed Quotations.

### âœ… COMPANY-SETTINGS-CLEANUP-1B (Applied and verified in Supabase)
- Repo implementation committed and pushed in `0b826a9`.
- Supabase migration/manual DB cleanup applied manually.
- `company_settings.cr_number` is nullable in DB.
- `company_settings.official_email` is plain `info@g7blue.com`.
- `company_settings.cr_number` is `NULL`.
- `company_settings.default_terms` uses professional terms.
- Existing quotation seller snapshots were corrected.
- Verification result:
  - total quotations: 9
  - bad snapshot email: 0
  - bad snapshot CR: 0
  - bad snapshot terms: 0
- No Tax Invoice / VAT 15% / VAT Number / ZATCA behavior is enabled while `vat_mode = not_registered`.

### âœ… SETTINGS-EDIT-MODE-1
- Implemented and repo-ready.
- Company Settings is read-only by default.
- Edit requires explicit `Edit Settings` action.
- Save/Cancel appear only in edit mode.
- Edit button does not render for users without write permission.
- Existing validation, permissions, and bank masking are expected to remain respected.
- Manual browser smoke remains pending.

### âœ… SERVICE-DETAIL-RELATED-QUOTE-CTA-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commits:
  - `80e3765 feat(services): add related quotation create cta`
  - `0930954 fix(services): align quotation cta eligibility`
- Added `Create Quotation` CTA inside the Service Detail `Related Quotations` card.
- CTA links to `/quotations/new?serviceId=<service-id>` for eligible services, passing context correctly.
- Eligibility fix ensures already-started Inquiry/Quoted services show a disabled CTA with the reason:
  `Cannot create a quotation because the service has already started.`
- Clean Code Guard Review Mode passed successfully.
- Lint and TypeScript compile successfully.

### ✅ QUOTE-TO-DEPOSIT-CTA-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `103e0fa feat(quotations): add deposit invoice cta`
- Approved Quotation Detail now shows a `Deposit Invoice` card/CTA.
- Reuses existing `CreateDepositInvoiceAction`.
- Uses existing invoice creation backend flow via `createInvoiceAction`.
- Preserves server-side authority for RBAC, quotation approval validation, service linkage validation, duplicate active deposit invoice prevention, and existing invoice/VAT behavior.
- Manual smoke confirmed:
  - Approved quotation displayed Deposit Invoice CTA.
  - Deposit invoice was created successfully.
  - Duplicate creation was prevented after creation.
  - Created invoice appeared in `/invoices`.
- Team Lead approved Option A for existing deposit invoice display:
  - Do not link to unsupported `/invoices/<id>` (removed the broken link that caused 404).
  - Show invoice number as text.
  - Show guidance: `Open it from the Invoices list.`
- Option B approved as separate P1 backlog item: `INVOICE-LIST-DEEP-LINK-SELECTION-1`.
- Option C (creating an `/invoices/[id]` detail route) was rejected pending a full invoice UX/product design session.

### ✅ INVOICE-LIST-REMOVE-STANDALONE-CREATE-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `ada01f0 fix(invoices): remove standalone create entry point`
- Summary:
  - Generic disabled `Create Invoice` button removed from `/invoices`.
  - Safe workflow guidance added: `Invoices are created from approved quotations or service billing actions.`
  - Invoice list and side panel preserved without layout regression.
  - Server-side invoice creation remains context-guarded by `quotationId` and `serviceId`.
- Lint and TypeScript compile successfully with zero errors.

### ✅ HUMAN-REFERENCE-DISPLAY-1
- Status: Completed, reviewed, manual smoke passed, and pushed.
- Implementation commit:
  - `f68afe0 fix(ui): display human-readable references`
- Summary:
  - Service Detail changed visible `Customer ID` raw UUID to `Customer Ref`.
  - Service Detail displays `customerNumber` with safe fallback.
  - Invoice side panel changed visible `Quotation ID` raw UUID to `Quotation Ref`.
  - Invoice side panel displays `relatedQuoteNumber` with safe fallback.
  - Internal UUIDs/routes/actions were preserved.
  - No schema/action/workflow/RBAC changes.
- Lint and TypeScript compile successfully with zero errors.
### ✅ SUPPLIER-BOOKINGS-FOUNDATION-1
- Status: Completed, verified, committed, and pushed.
- Implementation commits:
  - `5866d42 db(suppliers): add supplier bookings foundation migration`
  - `04d1e7c db(suppliers): sync supplier bookings schema`
- The `supplier_bookings` table exists in the database.
- RLS is enabled; direct table access for `anon` and `authenticated` roles is revoked.
- Foreign keys (`source_allocation_id`, `service_id`, `supplier_id`) are strictly immutable.
- Insert triggers (`trg_supplier_bookings_insert_sync_allocation`) enforce business rules, ensuring consistency between `service_supplier_allocations` and the new booking.
- `number_sequences_type_check` includes `supplier_booking`.
- Booking numbers are generated server-side using `generate_document_number('supplier_booking')` (e.g. `SBK-YYYY-0001`).
- Indexes exist, including `idx_supplier_bookings_one_active_per_allocation` to enforce at most one active booking per allocation.
- Terminology constraint: Uses `Supplier Booking` / `supplier_bookings` / `SBK`. (Internal PO / Purchase Order terminology is rejected).
- **Deferred**: Supplier Bookings Domain, UI, permissions, actions, pages, and runtime behavior are explicitly deferred to future tasks.

### ✅ SUPPLIER-AUDIT-COLUMNS-TEXT-FIX-1
- Status: Completed, verified, committed, and pushed.
- Implementation commits:
  - `39fb5fd db(suppliers): align audit columns with clerk ids`
  - `4cbd9cf db(suppliers): sync audit column schema`
- Solved Cursor Audit blocker `SUPPLIER-AUDIT-COLUMNS-TEXT-1`.
- Aligned `service_supplier_allocations` and `supplier_bookings` `created_by`, `updated_by`, `cancelled_by` to `text` instead of `uuid`, matching `app_users.clerk_user_id`.
- Verified ZERO_POLICY_DEPENDENCIES, ZERO_INDEX_DEPENDENCIES, ZERO_TRIGGER_DEPENDENCIES, ZERO_ZOD_UUID_VALIDATORS.
- Remote Supabase database updated successfully.

### ✅ SUPPLIER-ALLOCATION-BOOKING-GUARD-1
- Status: Completed, verified, committed, and pushed.
- Implementation commit:
  - `4400700 fix(suppliers): block allocation changes with active bookings`
- `cancelSupplierAllocation`, `deleteSupplierAllocation`, and `restoreSupplierAllocation` now block mutation when an active `supplier_booking` exists.
- Active booking definition: `supplier_bookings.is_deleted = false AND supplier_bookings.status <> 'cancelled'`.
- The helper performs an existence-only check and selects only `id`.
- No supplier costs/details are exposed.
- Lint and build passed with only pre-existing unrelated Next.js image warnings.

## 4. Current Active Phase

### 🚧 Cursor Audit Priority Gates & Blockers
Cursor audit gate:
- Current verdict: PROCEED_TO_SUPPLIER_BOOKINGS_DOMAIN.
- SUPPLIER-AUDIT-COLUMNS-TEXT-FIX-1: CLOSED.
- SUPPLIER-ALLOCATION-BOOKING-GUARD-1: CLOSED.
- Supplier Bookings Domain may now move to design/planning, but must still follow controlled task workflow.

### 🚧 Locked Next CRM Priorities
Status: SEC-AUTHZ-APP-USER-GATE-1 implemented and manually verified; SERVICE-HUB-1B merged; QUOTE-APPROVAL-FLOW-1B implemented, Admin smoke passed, manual migration applied and schema synced. Multi-role browser smoke for Manager/Sales remains pending until official test users / Admin User Management are available. Full parent QUOTE-APPROVAL-FLOW-1 is considered complete for Phase 1B standards. After merge, follow the locked order: `ERP-3`.


The locked workflow remains:
Customer Profile -> Service -> Quotation -> Invoice -> Payment.

The next work order is:
1. `RBAC-QUOTATIONS-APPROVE-1`
   - Ready for PR: `quotations:approve` added to Manager in `src/lib/auth/permissions.ts`.
   - Keeps approval separate from ordinary `quotations:write`.
   - Required before quotation approval flow and ERP-3 invoices.
2. `CUST-OFFICIAL-DETAILS-1`
   - CUST-OFFICIAL-DETAILS-1B manually applied and DB-verified: optional/conditional customer official and billing fields are present in the database.
   - Fields include customer type (Individual / Company), legal name, Commercial Registration number, VAT number, National Address fields, billing email, finance contact, payment terms, and PO required flag.
   - `supabase/schema.sql` now matches the verified DB state for these fields.
   - CUST-OFFICIAL-DETAILS-1C wires the fields into the customer data layer, create UI, profile-only edit UI, and customer profile card; all fields remain optional/conditional and Mozfer manual smoke passed.
   - Future invoice buyer snapshots remain ERP-3 scope; customer VAT number storage does not enable Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
3. `SEC-SERVICE-INVARIANTS-1`
   - Ready for review: Service creation now validates active/non-deleted customer server-side.
   - Ready for review: Service soft delete now blocks non-deleted linked quotations.
   - Future invoice/payment service deletion guards remain ERP-3/ERP-4 scope once service-linked invoices/payments exist.
4. `SERVICE-HUB-1`
   - SERVICE-HUB-1B implements the minimal Service/Booking Hub detail page to replace the old user-facing project hub concept.
   - Includes a read-only status timeline, service schedule, customer context, and related quotations.
   - Does not add invoice/payment cards, fake financial data, status transition actions, notes/activity, or attachments.
   - Transition triggers remain deferred: `Quoted` to future quotation workflow, `Approved` to future approval flow, and `Deposit Paid` to future cleared payment flow.
   - Service remains the operational source of truth.
5. `QUOTE-APPROVAL-FLOW-1`
   - `QUOTE-APPROVAL-FLOW-1B` is implemented / code-ready / pending review.
   - Migration file exists and was manually applied.
   - Index verification passed.
   - `supabase/schema.sql` is synced in this task.
   - Manual smoke is still pending.
   - `QUOTE-APPROVAL-FLOW-1B` is not fully complete until manual smoke passes.
   - `QUOTE-APPROVAL-FLOW-1` parent task is not fully complete yet if smoke is still pending.
   - Service status transition on approval remains deferred.
   - Sent workflow remains deferred.
   - Approval audit fields remain deferred/future-scope.
   - Invoices/payments remain future ERP scope.
   - VAT/ZATCA remains out of scope.
   - Pagination remains separate follow-up.
   - Multiple draft quotations per Service are allowed for negotiation.
   - More than one approved quotation per Service must be prevented.
   - Required before ERP-3 invoice creation.
6. `ERP-3`
   - Deposit/final invoices must be created from Approved Quotation + Service.
   - No invoice without Service.
   - No invoice without Approved Quotation.
   - Invoice totals must derive from approved quotation snapshots, not arbitrary client input.

SEC-RLS-BASELINE-1 manual Supabase apply and database verification are complete. DEV_ONLY broad authenticated policies were removed from the live database. Real or semi-real data remains blocked by remaining production hardening and pre-demo controls: `company_settings` production RLS follow-up, demo-data/security decision, Viewer bank masking verification, sensitive Server Action rate limiting, raw error/security checks where applicable, and backup/monitoring/deployment readiness before production. It is no longer blocked by SEC-RLS manual apply itself.

Follow-up tracked from CUST-OFFICIAL-DETAILS-1C manual smoke: `LIST-PAGINATION-PARITY-1`. Customers and Services lists pagination implemented. Quotations pagination modernized to a functional state. A shared `PaginationFooter` component was created and is now used by Customers, Services, and Quotations. Pagination controls are now correctly hidden across all lists when item count is 10 or less. Manual browser smoke passed for shared pagination across Quotations, Customers, and Services. Do not move this ahead of critical/security blockers unless approved.

Follow-up tracked from QUOTATION-PDF-CLEANUP-1 manual smoke: `QUOTATION-PDF-PRINT-SETTINGS-1`. Quotation PDF print CSS cleanup was implemented. `@page` margin was adjusted and document padding restored for print layout. Browser-generated headers/footers may still depend on the browser print dialog. Manual browser smoke is required before considering it fully verified.

ADMIN-USERS-SMOKE-1 partial manual browser smoke passed: Admin Users page loads, current Admin is visible, role dropdown verified, invite/revoke pending invitation flow verified, and pending invitations returned to 0. Full invitation acceptance and Clerk webhook app_users sync remain pending/not tested.

## 4. Work in Progress / Recent Accomplishments
### Invoice Readiness Documentation Sync (ERP-3B)

**Completed and Pushed:**
1. T017D Billing UX Cleanup completed and pushed:
   42df67e feat(invoices): clean up billing UX states
2. Draft invoice issued_at fix completed and pushed:
   88507ab fix(invoices): keep draft issued_at empty
3. Final Invoice UI Action completed and pushed:
   ae64366 feat(invoices): add final invoice service action

**Current invoice module status:**
Invoice Foundation is working.
Operational Invoice Module is not complete yet.

**Currently implemented:**
- Deposit invoice backend creation works.
- Final invoice server logic exists.
- Billing Panel shows billing state.
- Invoice list is live and UX-cleaned.
- Draft invoice creation now keeps issued_at = null.
- Final Invoice UI Action is completed and pushed. Final invoice creation is available from the Service Billing Panel.
- Final invoice amount remains server-derived. The UI does not accept a final invoice amount input.
- The action calls createInvoiceAction with invoiceType = "final". Final invoices are still created as Draft.
- Guard rules verified in createInvoiceAction:
  - invoices:write enforced
  - approved quotation required
  - quotation/service mismatch rejected
  - deposit amount > 0
  - deposit amount <= quotation total
  - duplicate active deposit blocked
  - duplicate active final blocked
  - final amount calculated server-side
  - final amount subtracts active prior deposit invoice totals
  - payments ignored in invoice amount calculation

**Currently pending:**
- Void/Cancel/Credit Note lifecycle is pending.
- Environment / staging / production documentation is pending.
- UAT / smoke test checklist is pending.

**Recently Completed:**
- Issue Workflow is completed and pushed.
- Draft invoices can now be issued.
- Issuing sets DB status to "sent".
- UI displays "sent" as "Issued".
- issuing sets issued_at.
- issueInvoiceAction requires invoices:write.
- Issue update is race-safe using status=draft condition.
- Issue Workflow does not change invoice amounts.
- Issue Workflow does not change snapshots.
- Issue Workflow does not create payment.
- Issue Workflow does not create PDF.
- Issue Workflow does not implement ZATCA/FATOORA/QR/XML.
- Live Invoice PDF from snapshots is completed and pushed.
- Invoice PDF is now DB-backed.
- Invoice PDF uses getInvoiceById.
- Invoice PDF enforces invoices:read permission.
- Invoice PDF uses snapshot_seller, snapshot_buyer, snapshot_quotation, snapshot_bank_details, and snapshot_document_rules as authoritative historical data.
- Invoice PDF no longer uses invoicesData/settingsData/useParams.
- Draft invoices show preview/watermark behavior.
- status "sent" displays as "Issued".
- vat_mode = not_registered displays Commercial Invoice / VAT not applied.
- No invoice mutation happens from PDF.
- No Payment was implemented.
- No Issue Workflow changes were included.
- No Global Invoice Wizard was implemented.
- No Void/Cancel/Credit Note was implemented.
- No ZATCA/FATOORA/QR/XML was implemented.

**Payment MVP Completed:**
- Payment MVP completed.
- Atomic RPC payment recording implemented.
- Migrations applied and verified manually.
- Deposit invoice full-payment smoke passed.
- Final invoice full-payment smoke passed.
- Payment rows and audit logs verified.
- Amount Due UI fixed.
- Invoice PDF View enabled.
- Invoice PDF terms runtime fixed.
- RPC: public.record_invoice_payment(uuid,numeric,date,text,text,text)
- Deposit Invoice: INV-2026-0004
- Deposit Payment: PAY-2026-0001
- Final Invoice: INV-2026-0005
- Deposit and final invoice PDFs opened successfully after the PDF terms normalization fix.
- Latest pushed commit: 8be7d43

**Live Payments List:**
- `PAYMENTS-LIST-LIVE-1` completed and pushed.
- Implemented in commit `f4471a2 feat(payments): show live payment records`.
- `/payments` now uses live read-only payment records through `getPaymentsList` instead of rendering mock `paymentsData` rows as real records.
- The live query enforces `payments:read`.
- Live-only KPI values are shown; mock payment rows were removed from the live page.
- Manual UI smoke passed: payment count changed from `4` to `5` after recording a new payment; confirmed collected changed from `SAR 27,499.95` to `SAR 32,503.04`; `PAY-2026-0005` appeared, linked to `INV-2026-0007`, amount `SAR 5,003.09`, method `Bank Transfer`, status `Confirmed`; invoice list showed `INV-2026-0007` changed from `Issued` to `Paid`.
- Payment recording path, `recordPaymentAction`, `record_invoice_payment` RPC usage, invoice balance/status formulas, SQL, schema, migrations, packages, and tax behavior were unchanged.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.
- Supplier live read-only cleanup was completed later under `SUPPLIERS-LIVE-READ-FOUNDATION-1`; supplier write/finance modules remain separate deferred work.

**Live Invoice KPI Cards:**
- `INVOICE-KPI-LIVE-1` completed and pushed.
- Implemented in commit `d89b520 fix(invoices): derive KPI cards from live invoices`.
- `/invoices` KPI cards now use live invoice list data instead of hardcoded/static mock values.
- Static/mock invoice KPI values were removed: `SAR 2.4M`, `SAR 450K`, `SAR 1.2M`, `12 Invoices`, `Received This Month`, and `+18% vs Last Month`.
- Manual smoke passed: `Total Outstanding` showed `SAR 0.00`, `Open Invoices` showed `0`, and `Total Collected` showed `SAR 32,503.04`.
- Invoice table/list behavior remained live and unchanged.
- No invoice creation, payment recording, invoice balance/status formulas, SQL, schema, migrations, packages, dashboard, suppliers, payments page, or tax behavior changed.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.
- Supplier live read-only cleanup was completed later under `SUPPLIERS-LIVE-READ-FOUNDATION-1`; supplier write/finance modules remain separate deferred work.

**Live Dashboard Summary:**
- `DASHBOARD-LIVE-SUMMARY-1` completed and pushed.
- Implemented in commit `d25cb17 fix(dashboard): show live summary data`.
- `/dashboard` now uses live/read-only data where permissions allow.
- Old static/mock dashboard KPI and sample values were removed: `1,248`, `342`, `89`, `SAR 2.4M`, `SAR 450K`, `Saudi Aramco`, `NEOM`, `Riyadh Season`, `Jeddah Corniche`, and fake SAR sample quotation amounts.
- Manual smoke passed: `Total Customers` showed `14`, `Total Quotations` showed `12`, `Open Invoices` showed `0`, `Services` showed `8`, `Total Collected` showed `SAR 32,503.04`, and `Pending Balance` showed `SAR 0.00`.
- Recent Quotations now renders live quotation rows or a safe empty/unavailable state.
- `Service Workflow` remains a static workflow definition section and is not fake business KPI/sample data.
- No customer, quotation, invoice, payment, or service write paths changed.
- No invoice balance formulas, payment recording, SQL, schema, migrations, packages, or tax behavior changed.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.
- Supplier live read-only cleanup was completed later under `SUPPLIERS-LIVE-READ-FOUNDATION-1`; supplier write/finance modules remain separate deferred work.

**Supplier Module Design:**
- `SUPPLIERS-SCHEMA-DESIGN-1` completed and pushed.
- Implemented in commit `e85adec spec(suppliers): add supplier module design artifacts`.
- This was design-only Spec Kit work. No supplier implementation, SQL, migrations, Supabase actions, schema apply, app code, live supplier UI, supplier DB tables, or supplier CRUD were added.
- Design artifacts were recorded under:
  - `specs/002-suppliers-schema-design/spec.md`
  - `specs/002-suppliers-schema-design/plan.md`
  - `specs/002-suppliers-schema-design/research.md`
  - `specs/002-suppliers-schema-design/data-model.md`
  - `specs/002-suppliers-schema-design/tasks.md`
- Key direction is now documented: suppliers support `company` and `individual`; lifecycle statuses are `active`, `on_hold`, `blacklisted`, and `inactive`; `is_preferred` is separate; bank details are role-masked; cost/margin visibility is Admin/Manager-only by default; supplier invoices/payments are separate from customer invoices/payments; supplier bookings and supplier invoices require snapshots.
- Supplier DB foundation completed after the design package. Migration `supabase/migrations/20260627153000_supplier_directory_foundation.sql` was committed and pushed in `ee50e60 feat(suppliers): add directory foundation migration`, manually applied in Supabase, and verified. `supabase/schema.sql` was synced and pushed in `ed61fb7 chore(suppliers): sync schema after directory foundation`.
- Verification evidence: required supplier foundation columns exist; `on_hold` is supported by `chk_suppliers_status`; `chk_suppliers_vat_registration_status` exists; RLS remains enabled on `public.suppliers`; DEV_ONLY supplier policies returned no rows; broad anon/authenticated supplier policies returned no rows; future supplier financial/scope tables returned no rows.
- `SUPPLIERS-LIVE-READ-FOUNDATION-1` completed and pushed in commit `1fbf77e feat(suppliers): add live read-only directory`.
- `/suppliers` now reads live supplier records from the database through a server-side supplier query layer, UI-safe mapper/types, and a read-only client list/detail UI.
- The permission gate uses `suppliers:read`. This read-only slice does not use `suppliers:write`, does not add create/edit/delete/restore behavior, and does not expose bank or IBAN fields in the UI selection, mapper, types, or rendering.
- Verification evidence: lint passed with only existing `<img>` warnings, `pnpm exec tsc --noEmit` passed, no SQL/schema/migration changes were made, and no supplier finance/future modules were introduced.
- `SUPPLIERS-RATE-CARDS-FOUNDATION-1A` completed and pushed in commits `6a2804d` and `87c714c`.
  - The foundation table `supplier_rate_cards` was created with data integrity constraints (`base_cost > 0`, `currency = 'SAR'`).
  - Permissions `supplier_costing:read` and `supplier_costing:write` were added and assigned to Admin and Manager roles. Accountant, Sales, Operations, and Viewer do not have `supplier_costing:read` or `supplier_costing:write` permissions in this MVP slice.
  - The migration was manually applied and verified in Supabase, and `supabase/schema.sql` was synced.
  - Security was hardened: RLS is enabled with 0 policies, and direct anon/authenticated grants are revoked.
  - Important rule enforced: Supplier rate cards contain internal cost data and must never appear in customer-facing quotations, invoices, PDFs, receipts, broad supplier list views, or unauthorized role views.
  - The full supplier rate cards feature is not yet complete. Only the foundation table and permissions are completed.
  - Supplier rate cards runtime workflows (supplier allocations, quotation automation, cost margin reports) remain deferred.
- `SUPPLIERS-RATE-CARDS-READ-1` completed, validated, committed, and pushed in commit `da5bc86 feat(suppliers): add read-only rate cards view`.
  - Internal read-only Supplier Rate Cards view added to the existing Supplier side panel.
  - Visible only to Admin/Manager users with `supplier_costing:read`.
  - Unauthorized roles (Accountant, Sales, Operations, Viewer) do not see the Rate Cards section.
  - Server-side `requirePermission("supplier_costing:read")` is enforced.
  - Uses server-side access only.
  - Reads `supplier_rate_cards` filtered by `supplier_id` and `is_deleted = false`.
  - Displays non-deleted rate cards sorted active first and newest `valid_from` first.
  - Internal notes are displayed only inside the authorized internal Supplier side panel.
  - Validation: `pnpm run lint` passed with only the two known existing PDF `<img>` warnings, `pnpm exec tsc --noEmit` passed, and `pnpm run build` passed.
- Supplier implementation remains partial. Supplier create/edit/delete/restore CRUD, supplier write actions/server actions, service supplier allocations, Supplier Bookings, supplier invoices, supplier payments, Supplier Booking PDF/WhatsApp/email, supplier portal, supplier costing/margin/P&L reports, and payment approval workflow remain deferred. Supplier rate cards runtime read-only visibility is completed, while write (create/edit/delete) workflows remain deferred.

**Supplier Create and Service Status Spec Sync:**
- `SUPPLIERS-CREATE-FORM-1` completed and pushed in commit `05affcd feat(suppliers): add create form`.
- Scope was create-only supplier entry: create page/form, server action, schema validation, and list navigation. This does not complete Supplier Edit/Delete/Restore or broader Supplier CRUD.
- `SUPPLIERS-CREATE-UX-FIX-1` completed and pushed in commit `9ed7a59 fix(suppliers): refine create ui`.
- Scope was Team Lead create-flow UI/UX fixes only.
- `SUPPLIERS-EDIT-FORM-1` completed and pushed in commit `9f87566 feat(suppliers): add edit form`.
- Scope allows updating basic, safe, non-sensitive supplier profile fields only.
- Enforces `suppliers:write` on both the edit page and server action.
- Prefills existing safe data. Soft-deleted records are protected.
- Sensitive banking and blacklist audit fields are strictly excluded.
- Lint and TypeScript compile successfully with zero errors.
- Other supplier modules (finance, rate cards, delete/restore, blacklist workflows) remain deferred.
- `SUPPLIERS-EDIT-OPTIONAL-FIELDS-FIX-1` completed and pushed in commit `7df51f4 fix(suppliers): preserve optional edit fields`.
- Scope fixes optional supplier edit field persistence: CR Number, VAT Number, and Internal Notes.
- Manual smoke testing found that these fields were previously initialized to empty strings `""` instead of their database values from the `supplier` prop, resetting them to `null` on save.
- Fixed by hydrating `crNumber`, `vatNumber`, and `notes` states from the supplier prop. Manual smoke tests passed successfully after implementation.
- `SUPPLIERS-STATUS-BLACKLIST-1` completed and pushed in commit `92617ef feat(suppliers): add blacklist workflow`.
  - Scope: Added dedicated supplier blacklist/unblacklist UI (SupplierBlacklistActions component) and backend server actions (`blacklistSupplier` and `unblacklistSupplier`).
  - Validation: Requires a reason to blacklist, and records `blacklisted_reason`, `blacklisted_by`, and `blacklisted_at` in the database. Blacklist details are rendered inside the supplier side panel.
  - Lifecycle: Unblacklisting restores the supplier status to `inactive` (not `active`).
  - Protection: The normal Supplier Edit form and action were updated to prevent status updates from bypassing the dedicated blacklist/unblacklist workflows.
  - Fixes: Resolved a Zod refinement runtime error by extracting a safe base supplier schema. Fixed a flexbox layout regression in the side panel header to prevent action links from being crushed. Static supplier mock data was updated with nullable blacklist fields.
  - Manual smoke tests, eslint checks, TypeScript compiler, and Next.js build all passed successfully.
- `SERVICE-STATUS-STATE-MACHINE-SPEC-1` completed and pushed in commit `760c569 spec(services): define status state machine`.
- Scope was Spec Kit design artifacts under `specs/003-service-status-state-machine/`. No source implementation, guarded transition enforcement, `services:update_status`, UI next-state filtering, or automation was implemented.
- Next recommended area: Sprint 1 workflow blockers, starting with `SERVICE-STATUS-GUARDED-TRANSITIONS-1` or workflow CTA tasks (`SERVICE-DETAIL-RELATED-QUOTE-CTA-1`, `QUOTE-TO-DEPOSIT-CTA-1`, `INVOICE-LIST-REMOVE-STANDALONE-CREATE-1`, `HUMAN-REFERENCE-DISPLAY-1`).

- `SUPPLIER-ALLOCATIONS-FOUNDATION-1A` completed, validated, committed, and pushed.
  - Latest commits:
    - `bc3db52 feat(suppliers): add allocation foundation`
    - `46881ee chore(supabase): sync supplier allocation schema`
  - Scope: Database and permissions foundation for Supplier Allocations.
    - Migration `supabase/migrations/20260629100000_service_supplier_allocations_foundation.sql` manually applied and verified.
    - Synced `supabase/schema.sql` with table `public.service_supplier_allocations`, including correct columns, data types, defaults, generated column (`estimated_total_cost`), immutability trigger (`check_service_supplier_allocations_immutable_service_id_trg`), update trigger (`update_service_supplier_allocations_updated_at`), 8 new indexes, and RLS enabled.
    - Permissions added in `src/lib/auth/permissions.ts` for Admin and Manager: `supplier_allocations:read`, `supplier_allocations:read_cost`, `supplier_allocations:write`, `supplier_allocations:cancel`.
    - No `supplier_allocations:approve` exists. Operations, Sales, Viewer, and Accountant have no access.
  - Boundaries & Security:
    - This is a database/permissions foundation only. Runtime CRUD, Server Actions, UI panels, Service Detail integration, and allocations history are NOT implemented.
    - RLS is enabled with 0 policies and 0 broad client grants; access remains server-side only for future tasks.
    - Business logic validation rules (e.g. rate card ID matches supplier ID, approved quotation ID matches service ID, blacklisted supplier blocks, parent service cancellation blocks) are deferred to future server-side validation/runtime hardening.
    - Supplier Bookings, supplier invoices/payments, and costing reports remain deferred.

- `SUPPLIER-ALLOCATIONS-SCHEMAS-1A` completed, validated, committed, and pushed.
  - Latest commits:
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

- `SUPPLIER-ALLOCATIONS-READ-1A` completed, validated, committed, and pushed.
  - Latest commits:
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

- `SUPPLIER-ALLOCATIONS-CANCEL-1A` completed, validated, committed, and pushed.
  - Latest commits:
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
    - Parent Service status now blocks cancellation if the parent Service is Completed or Cancelled (Hardening slice 1).
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
    - Supplier Bookings remain deferred.
    - Supplier invoices/payments remain deferred.
    - Supplier costing/margin reports remain deferred.
    - Rate-card-driven quotation automation remains deferred.
    - Customer-facing supplier cost exposure remains forbidden/deferred.

- `SUPPLIER-ALLOCATIONS-CREATE-MANUAL-1A` completed, validated, committed, and pushed.
  - Latest commits:
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
    - Delete/restore actions remain deferred.
    - Rate-card allocation creation remains deferred.
    - Server-side rate-card snapshot generation remains deferred.
    - Service detail UI panel remains deferred.
    - Supplier allocation history UI remains deferred.
    - Supplier Bookings remain deferred.
    - Supplier invoices/payments remain deferred.
    - Supplier costing/margin reports remain deferred.
    - Rate-card-driven quotation automation remains deferred.
    - Customer-facing supplier cost exposure remains forbidden/deferred.

- `SUPPLIER-ALLOCATIONS-UPDATE-MANUAL-1A` completed, validated, committed, and pushed.
  - Latest commits:
    - `486bdb9 feat(suppliers): add manual allocation update action`
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
    - Missing allocation returns a client-safe not found error.
    - Already cancelled allocations cannot be updated.
    - Existing rate-card allocations cannot be manually updated in this slice.
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
    - Manual update action is implemented.
    - Supplier Allocations CRUD is not complete.
    - Full write layer is not complete.
    - UI is not complete.
    - Delete/restore remains deferred.
    - Rate-card allocation creation remains deferred.
    - Server-side rate-card snapshot generation remains deferred.
    - Supplier Bookings remain deferred.
    - Supplier invoices/payments remain deferred.
    - Supplier costing/margin reports remain deferred.
    - Quotation automation remains deferred.
    - Customer-facing supplier cost exposure remains forbidden/deferred.

- `SUPPLIER-ALLOCATIONS-SERVICE-UI-PANEL-1A` completed, validated, committed, and pushed.
  - Commit pushed:
    `2370e74 feat(suppliers): add read-only service allocations panel`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
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
    - Local status labeling is used without marking Supplier Bookings as implemented.
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
    - Supplier Bookings remain deferred.
    - Supplier invoices/payments remain deferred.
    - Supplier costing/margin reports remain deferred.
    - Quotation automation remains deferred.
    - Customer-facing supplier cost exposure remains forbidden/deferred.


- `SUPPLIER-ALLOCATIONS-SERVICE-UI-CREATE-1B` completed, validated, committed, and pushed.
  - Commit pushed:
    `49793f7 feat(suppliers): add manual allocation create ui`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
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
    - Cancel Allocation UI.
    - Delete/Restore Allocation UI.
    - Rate-card allocation UI and snapshots.
    - Approved quotation allocation UI.
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Costing/margin reports.
    - Quotation automation.
    - Customer-facing/PDF/public supplier cost exposure.

- `SUPPLIER-ALLOCATIONS-SERVICE-UI-CANCEL-1D` completed, validated, committed, and pushed.
  - Commit pushed:
    `7dc5063 feat(suppliers): add manual allocation cancel ui`
  - Backend Hardening pushed:
    `a24999c fix(suppliers): block allocation cancel for closed services`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
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
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Costing/margin reports.
    - Quotation automation.
    - Customer-facing/PDF/public supplier cost exposure.

- `SUPPLIER-ALLOCATIONS-SERVICE-UI-EDIT-1C` completed, validated, committed, and pushed.
  - Commit pushed:
    `1348dc9 feat(suppliers): add manual allocation edit ui`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
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
    - Cancel Allocation UI.
    - Delete/Restore Allocation UI.
    - Rate-card allocation UI and snapshots.
    - Approved quotation allocation UI.
    - Supplier change/replacement after creation.
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Costing/margin reports.
    - Quotation automation.
    - Customer-facing/PDF/public supplier cost exposure.

- `SUPPLIER-ALLOCATIONS-DELETE-RESTORE-1` completed, validated, committed, and pushed.
  - Commit pushed:
    `2307a42 feat(suppliers): add allocation delete restore flow`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
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
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Costing/margin reports.
    - Quotation automation.
    - Customer-facing/PDF/public supplier cost exposure.

- `SUPPLIER-ALLOCATIONS-RATE-CARD-CREATE-1` completed, validated, committed, and pushed.
  - Commit pushed:
    `9dd6839 feat(suppliers): add rate-card allocation create flow`
  - Commit author:
    `shingami66 <157619702+shingami66@users.noreply.github.com>`
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
    - Supplier Bookings.
    - Supplier invoices/payments.
    - Actual expense posting.
    - Costing/margin reports.
    - Quotation automation from supplier cost.
    - Customer-facing/PDF/public supplier cost exposure.




**Guarded Service Status Transitions:**
- `SERVICE-STATUS-GUARDED-TRANSITIONS-1` implemented and manual smoke passed.
- Latest implementation commit: `1a4748f feat(services): guard status transitions`.
- Service status workflow now uses guarded manual transitions.
- Free status jumping is removed.
- `services:update_status` permission is implemented in code.
- Automation remains deferred.
- **Manual smoke follow-up notes (Non-blocking observations tracked for future backlog):**
  - Visible Customer UUID remains in Service Detail Customer Summary (Track under `HUMAN-REFERENCE-DISPLAY-1`).
  - Currency/date formatting remains inconsistent in some service/billing areas (Track under `FORMAT-STANDARDIZATION-1` and `DATE-FORMAT-STANDARDIZATION-1`).
  - Location/data typo such as `ryade` appears from existing data (Track under future `DATA-QUALITY-INPUT-NORMALIZATION-1`).
  - Billing labels such as `Prior Invoiced` / `Remaining` still need wording polish according to Team Lead backlog (Track under `BILLING-LABEL-COPY-POLISH-1`).
  - Browser/DevTools showed minor non-blocking warnings: form field missing `id` or `name`, and CSP warning about `eval`. These did not block the status transition workflow during smoke (Track under `UI-QUALITY-WARNINGS-CLEANUP-1`).

**Team Lead / Codex UX-ERP Review Backlog:**
- Team Lead UX/UI review is captured as an official backlog input, not as completed work. Overall score: `6.4/10`.
- Current readiness: suitable for guided internal demo; not operational-ready; not client-production-ready.
- Strongest product advantage: Service-centric workflow for Saudi events operations.
- Biggest confirmed gaps: workflow blockers, visible UUIDs, inconsistent currency/date formats, missing search/filter parity, missing breadcrumbs, RBAC clarity, and module-specific UX gaps.
- Codex UX-ERP analysis completed and used to separate stale findings from still-open items. Directionally accurate Team Lead findings remain useful; stale items were not treated as current defects.
- Already fixed or present: supplier live/read/create/UX fixes, quotation Approve/Reject, paid or zero-balance invoice payment disablement, Admin self-role/self-deactivation protection, last-active-admin protection, and Related Quotations create CTA in Service Detail.
- Still open or partly open: approved quotation to Deposit Invoice CTA, removal of disabled standalone Create Invoice from Invoices page, human reference display instead of visible UUIDs, standardized currency/date formatting, and search/filter parity.
- Next implementation focus remains Sprint 1 workflow blockers. Broad redesign is not planned; the path is targeted ERP workflow hardening.

**Billing Flexibility Smoke:**
- `BILLING-FLEXIBILITY-1` manual smoke passed for Direct Final Invoice without Deposit.
- No invoice code patch is required for the no-deposit direct final path.
- Historical pre-Stage-1 evidence: `SVC-2026-0008` remained `Inquiry` after quotation approval, direct final invoice creation, invoice issuing, and full payment recording.
- `INV-2026-0008` was created as a final invoice directly from `QT-2026-0012` for `SAR 20,000.00`.
- No Deposit Invoice existed before final invoice creation.
- The invoice was issued and paid.
- Duplicate active Final Invoice was blocked.
- Service status automation remains a deferred workflow gap. Future workflow must define guarded transitions.
- Invoice numbering development gap confirmed: `INV-2026-0001` to `INV-2026-0003` are absent. Stored invoices start at `INV-2026-0004` up to `INV-2026-0008`. `number_sequences` is `8`. Do not reset invoice numbering. Do not create fake filler invoices. Do not manually renumber existing invoices.

**Manual Status Control:**
- `SERVICE-STATUS-WORKFLOW-1` Stage 1 completed.
- Implemented in commit `0b0cc78 feat(services): add manual service status control`.
- Service status can now be manually changed from the Service detail page.
- Status is saved in `services.status`.
- Manual smoke passed on `SVC-2026-0008`.
- `SVC-2026-0008` reached `Completed` and appeared correctly in Service detail and Services list.
- Status persisted after UI refresh / navigation.
- Current behavior is manual-only.
- The system does not yet validate quotation, invoice, payment, or delivery state before changing Service status.
- Guarded transitions are implemented under `SERVICE-STATUS-GUARDED-TRANSITIONS-1`.

**Invoice List Sort:**
- `INVOICE-LIST-SORT-1` completed.
- Implemented in commit `9c297a6 fix(invoices): sort invoice list by invoice number`.
- Invoices page now sorts by `invoice_number` ascending.
- Manual smoke passed.
- Current verified visible order:
  - `INV-2026-0004`
  - `INV-2026-0005`
  - `INV-2026-0006`
  - `INV-2026-0007`
  - `INV-2026-0008`
- No invoice numbering reset, fake filler invoices, or manual renumbering was done.

**Compact Invoice PDF Breakdown:**
- `INVOICE-PDF-BREAKDOWN-1` completed and pushed.
- Implemented in commit `b38a75f fix(invoices): add compact invoice pdf breakdown`.
- Invoice PDF now displays compact display-only breakdown rows in the existing totals section using persisted invoice fields and existing snapshot data only.
- Rows include Approved Quotation Total when available, Previous Invoices / Deposits when available, Total Amount, Amount Paid, and Balance Due.
- Manual visual smoke passed on `INV-2026-0004` and `INV-2026-0005`; both tested PDFs fit one A4 page after final duplicate footer cleanup.
- `Commercial Invoice` title and Tax/VAT `Not applied` behavior were preserved.
- No financial logic, tax behavior, SQL, migrations, schema, packages, invoice/payment/quotation/service-status/number-generation logic, or write paths changed.
- No Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior was added.
- Future page numbering for genuinely multi-page PDFs remains separate/deferred.

**Snapshot DB verification:**
Snapshot DB verification passed for INV-2026-0004:
invoice_number = INV-2026-0004
invoice_type = deposit
status = draft
document_label = Commercial Invoice
vat_mode = not_registered
vat_rate = 0.00
snapshot_seller = present, object
snapshot_buyer = present, object
snapshot_quotation = present, object
snapshot_bank_details = present, object
snapshot_document_rules = present, object

Important note:
INV-2026-0004 is smoke-test/dev data used for snapshot verification.
It must be cleaned up or isolated before production handover.

**Invoice Module Operational Definition of Done:**
- Deposit Invoice UI works
- Final Invoice UI works
- Invoice can be issued from Draft
- Issued invoice can be printed/exported as PDF from live snapshot
- Payment can be recorded manually
- Balance due updates correctly
- Invoice list distinguishes Deposit vs Final
- Raw internal codes are hidden from UI
- RBAC/RLS verified for production access pattern
- Snapshot fields verified in DB

ERP-3B Final Invoice Settlement Design Review - Completed:
- ERP-3B Final Invoice Settlement Design Review completed.
- Recommendation accepted: SIMPLE_SUM_FOR_T018.
- Locked Accounting Formula: `Final Invoice = Approved Quotation Total - SUM(active prior deposit/progress invoice grand_total)`.
- Payments affect collected/uncollected balance, not invoiced/uninvoiced balance.
- Do not use: `Approved Quotation Total - SUM(amount_paid)`. Reason: Using paid amount can cause over-invoicing when a Deposit Invoice is unpaid or partially paid.
- MVP Policy: If an active Deposit Invoice is unpaid or partially paid, creating a Final Invoice is allowed only as long as total active invoice grand_total does not exceed the approved quotation total. This can leave two open balances for the customer and is accepted as a known MVP workflow gap until Void/Cancel lifecycle and Service status workflow are designed.
- invoice_prepayment_applications remains deferred.
- T018 implementation is now unblocked from a design perspective, but no implementation has started in this task.

ERP-3B T015C Deposit Invoice Persistence - Final Technical Review Passed:
- ERP-3B T015C deposit invoice persistence diff has passed final technical review.
- Lint passes with only the two known <img> warnings.
- Build passes.
- T015C remains uncommitted until docs/tasks alignment is reviewed.
- Current architecture decisions for deposit/final invoices are finalized and must be treated as source-of-truth.

ERP-3A Invoice Schema Foundation - Manual Supabase apply completed / Verified:
Created SQL migration `20260623200000_erp3a_invoice_schema.sql` to prepare the database schema for invoices and payments. The migration implements the safe schema updates required for the invoice workflow, adding `service_id` to invoices, renaming `quotation_id` to `approved_quotation_id`, renaming `type` to `invoice_type`, and preparing snapshot columns (`snapshot_seller`, `snapshot_buyer`, `snapshot_quotation`, etc.) as nullable JSONB. Note that composite FK enforcement is partial while `service_id` remains nullable, and NOT NULL enforcement for snapshots is deferred to ERP-3B. No UI, Server Action, or RPC for invoice creation was implemented. Tax Invoice, ZATCA, and VAT 15% remain blocked while `vat_mode = not_registered`. Manual Supabase apply was completed and post-apply verification passed.

CUSTOMER-REPORT-METRICS-VIEW-1 implemented: Created SQL migration `20260623100000_customer_report_metrics_view.sql` to provide a read-only `customer_report_metrics` view. This view safely aggregates `services_count`, `quotations_count`, `approved_quotations_count`, `draft_quotations_count`, and `total_quoted_amount` using secure server-side aggregations.

Manual verification evidence:
* `public.customer_report_metrics` was manually applied in Supabase by Mozfer.
* The view was verified successfully and is the source of real customer summary metrics.
* Verified rows:
  - CUST-2026-0007: services_count=2, quotations_count=3, approved_quotations_count=1, draft_quotations_count=2, total_quoted_amount=408558.00
  - CUST-2026-0006: services_count=2, quotations_count=2, approved_quotations_count=1, draft_quotations_count=0, total_quoted_amount=13223.00
  - CUST-2026-0008: services_count=1, quotations_count=4, approved_quotations_count=0, draft_quotations_count=4, total_quoted_amount=66953.00

EXPORT-REPORTS-XLSX-1 implemented: Customers raw CSV export replaced with a professional, branded XLSX report using `exceljs`. A shared `generateExcelReport` helper was introduced in `src/lib/reports/exportExcel.ts`.

CUSTOMERS-SECURE-SUMMARY-XLSX-1B implemented: Replaced stale metrics with the `customer_report_metrics` view. Added `customers:export` permission explicitly, restricted Viewer from exporting, and updated Excel columns for text phone/email and currency values.

CUSTOMERS-EXPORT-POLISH-AND-DOCS-1 implemented: Polished the Customers XLSX export to be a lightweight customer-level summary. Removed pipeline breakdown columns (Approved/Draft Quotations) from the export but kept them in the database view, types, and queries for future detailed reports. Documented the overall reporting strategy and deferred export enhancements.

CUSTOMERS-EXCEL-HEADER-POLISH-1 implemented: Customers XLSX now uses a professional merged blue report header. Phone/text cells are explicitly text-safe to prevent scientific notation. The export remains a lightweight current filtered view report. No change was made to reporting strategy, permissions, view, queries, or data model.

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

## 4.1 Reporting Strategy

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

## 5. Deferred Decisions

Detailed deferred decisions are tracked in `docs/deferred-decisions.md` so they remain visible and can be revisited before the relevant phase starts.

Current decision gates before ERP implementation:
- ZATCA/proforma invoice direction beyond the current "do not overclaim" rule
- invoice void/cancellation, credit note, and refund flow
- exact quotation expiry override behavior
- quotation approval workflow before invoices
- customer official/billing details before ERP-3 invoices
- Service Hub before or alongside ERP-3
- full invoice schema/service linkage in ERP-3
- soft-delete documentation cleanup: `DOC-SOFTDELETE-FIX`
- leads/inquiries
- supplier implementation after completed `SUPPLIERS-SCHEMA-DESIGN-1` design package
- demo data security level
- remaining production RLS hardening, `company_settings` production RLS follow-up, demo-data/security decision, Viewer bank masking verification, sensitive Server Action rate limiting, raw error/security checks where applicable, and backup/monitoring/deployment readiness before production
- audit log details

## 6. Decisions Already Resolved

- **Workflow:** New ERP work follows `Customer Profile -> Service -> Quotation -> Invoice -> Payment`. Service / Booking replaces Project as the operational unit. Quotations and invoices must belong to a Service; standalone quotations and standalone invoices are not allowed.
- **Customer Profile hub:** Customer detail must explicitly show related Services, Quotations through Services, Invoices through Services, Payments through Invoices, and later Activity.
- **Service status exit criteria:** Inquiry = service/request captured; Quoted = at least one quotation created/sent; Approved = customer approval recorded; Deposit Paid = valid/cleared deposit payment recorded; In Progress = operations started; Completed = service delivered; Cancelled = cancellation reason recorded. Do not add a separate Confirmed status. `Cancelled` is terminal and non-linear, not a progress step.
- **Quotations:** Quotations are Service-scoped. `customer_id`, if retained, is derived server-side from Service. One Service can have multiple Quotations; do not add `UNIQUE(service_id)`. Approval requires `quotations:approve`, separate from `quotations:write`. Non-draft quotations must not be fully editable through ordinary `quotations:write`, and approved quotations must not be soft-deleted through ordinary `quotations:write`. `valid_until` is the offer expiry date, not a service execution date. It must be on or after Issue Date and, when Service Start Date exists, on or before `service.event_start_date`. If the Service already started before Issue Date, quotation create/update is blocked.
- **Invoices:** No Invoice may exist without a Service. Each Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK. Invoice numbering uses one shared `INV-YYYY-0001` sequence. Use `invoice_type = deposit | final`; do not create separate `DEP-` or `FIN-` sequences.
- **Payments:** Payment must link to an Invoice. Payment is connected to Service through the Invoice. If `service_id` is also stored on payments for query convenience, it must match the invoice's `service_id` and be enforced in the data layer, preferably by database design. If a customer pays before an invoice exists, the UI must require creating a Deposit Invoice first or prevent payment recording. Prevent overpayment unless explicitly approved.
- **Deposit flow:** Deposit amount must be greater than `0` and less than or equal to the approved quotation total or remaining uninvoiced balance. Deposit is flexible, not fixed at 50%. Deposit Invoice is created manually after quotation approval. A Deposit Invoice alone does not confirm booking, and a pending payment does not confirm booking. Service status changes to `Deposit Paid` only after a valid/cleared deposit payment.
- **Event dates:** Prefer `event_start_date` and nullable `event_end_date`, not only `event_date`, to support single-day and multi-day events. `event_end_date` may be null for single-day or inquiry cases. Planned DB constraint: `CHECK (event_end_date IS NULL OR event_end_date >= event_start_date)`. Event fields should stay flexible at inquiry stage; Saudi partner/business owner should confirm event types.
- **Service numbering:** Use `SVC-YYYY-0001`. Service numbers must be generated server-side. ERP-1 DB foundation now supports this through `generate_document_number('service')`; app usage is still pending.
- **Quotation approval permission:** Approval requires `quotations:approve`. Recommended roles are Admin and Manager. Sales can create/send quotations but cannot approve unless explicitly granted. Do not treat `quotations:write` as approval permission.
- **Quotation expiry:** `valid_until` or `expiry_date` must be on or after issue date. Expired quotations cannot be approved without renewal/extension or an authorized override. Exact override behavior remains deferred.
- **Service cancellation:** Cancellation requires `cancellation_reason`. If no invoice/payment exists, cancellation can be simple. If invoice/payment exists, cancellation must not silently delete financial records; future void/refund/credit-note flow is required.
- **Company Settings:** CS-A is live settings only. CS-B document snapshots remain deferred. Old documents must not mutate when Company Settings changes.
- **VAT/ZATCA safety:** The current implemented Company Settings VAT field is `company_settings.vat_mode`. `not_registered` means VAT defaults to `0`, VAT number/effective date remain null, and no premature Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, reporting, or Phase 2 claims are allowed.
- **Financial trust and retention:** Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic. Financial records must use void/cancel/reversal workflows rather than hard deletion. Use soft delete for business records where applicable.
- **Security:** Do not treat UI hiding as security. Server-side permission checks and server-side masking are required. Production RLS is required for `company_settings` because it contains bank/legal/VAT data.
- **Viewer bank masking test:** Viewer opens `/settings`; response/data passed to the client must not include full IBAN, bank account holder, or bank account values.
- **Sensitive Server Action rate limiting:** Consider rate limiting quotation creation, quotation approval, invoice creation, payment recording, and settings update.
- **Phase ordering:** TAX-0 cleanup should happen before ERP implementation. ERP-0 may be planning/report-only before TAX-0, but implementation should not proceed before premature tax/ZATCA wording is cleaned or explicitly accepted as a known risk.

## 7. Last Known Good State
- `main` contains Customers CRUD, Customers Export, Core Security/RBAC, Quotations RPC Foundation, Quotations Data Layer, Quotations UI create/edit/delete controls, Quotation Detail, and Browser Print.
- Quotations core flow is stabilized.
- Quotation creation works after manual Supabase apply.
- Company Settings CS-A is committed on `main`.
- Financial totals remain server-side/database-side via PostgreSQL RPC.
- CUST-OFFICIAL-DETAILS-1C manual smoke passed and was merged. SEC-SERVICE-INVARIANTS-1B was merged. SERVICE-HUB-1B is implemented and ready for review/manual smoke; after review/merge, follow the locked order: `QUOTE-APPROVAL-FLOW-1`, then `ERP-3`. `QUOTE-APPROVAL-FLOW-1B` is code-ready / pending review. DOCUMENT-BRANDING-PRINT-1B is complete.

## Supplier Allocations UI Implementation Guidelines
Supplier Allocations backend foundation and read-only internal Service detail panel are implemented.
Manual create, manual update, cancel, delete, and restore server actions are implemented.
Manual Supplier Allocation lifecycle is now closed for Create/Edit/Cancel/Delete/Restore.
Rate-card workflows, `Supplier Bookings`, supplier invoices/payments, costing/margin reports, and customer-facing supplier costs remain deferred.
Internal supplier allocation cost estimation is approved for Admin/Manager planning only.

### Supplier Allocation Status State Machine
Approved statuses: `draft`, `planned`, `selected`, `cancelled`
Forward movement: `draft` -> `planned`, `planned` -> `selected`
Allowed same-state persistence: `draft` -> `draft`, `planned` -> `planned`, `selected` -> `selected`
Blocked through update: `planned` -> `draft`, `selected` -> `planned`, `selected` -> `draft`, any -> `cancelled`, `cancelled` -> any
Cancellation must happen only through cancel action.

### selected Terminology
`selected` means preferred supplier allocation for internal planning only.
`selected` does not mean `Supplier Booking`.
`selected` does not mean supplier commitment.
`selected` does not mean financial commitment.

### SAR-Only Currency
Supplier allocation currency is `SAR`-only for MVP.
Zod schemas and server actions must reject non-`SAR` currency.
UI fixed value alone is not enough.

### Service Status Timing
Supplier allocations may be created during active Service planning for internal cost estimation.
Create/update is blocked only for Services in: `Cancelled`, `Completed`.
Supplier allocations do not create supplier commitment, issue Supplier Bookings, confirm supplier booking, or create financial commitment.
