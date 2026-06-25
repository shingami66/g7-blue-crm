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

## 4. Current Active Phase

### ðŸš§ Locked Next CRM Priorities
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

**Billing Flexibility Smoke:**
- `BILLING-FLEXIBILITY-1` manual smoke passed for Direct Final Invoice without Deposit.
- No invoice code patch is required for the no-deposit direct final path.
- `SVC-2026-0008` remained `Inquiry` after quotation approval, direct final invoice creation, invoice issuing, and full payment recording.
- `INV-2026-0008` was created as a final invoice directly from `QT-2026-0012` for `SAR 20,000.00`.
- No Deposit Invoice existed before final invoice creation.
- The invoice was issued and paid.
- Duplicate active Final Invoice was blocked.
- Service status automation remains a deferred workflow gap. Future workflow must define status transitions.
- Invoice numbering development gap confirmed: `INV-2026-0001` to `INV-2026-0003` are absent. Stored invoices start at `INV-2026-0004` up to `INV-2026-0008`. `number_sequences` is `8`. Do not reset invoice numbering. Do not create fake filler invoices. Do not manually renumber existing invoices.

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
- vendors/suppliers
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
