# G7 BLUE CRM — Project Status

## 1. Project Overview
- **Project Name:** G7 BLUE CRM
- **Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase, Clerk Auth, PostgreSQL RPC
- **Purpose:** A robust CRM tailored for G7 BLUE, managing customer relationships, event work, financial documents, payments, and operational tracking.
- **Product Direction:** G7 BLUE CRM is an Events CRM + Billing system, not a generic billing-only CRM.
- **Core Flow:** Customer Profile → Service → Quotation → Invoice → Payment
- **Core Entity:** Service / Booking is the operational entity for new ERP work, not Project.
- **Current VAT Field:** The implemented Company Settings VAT field is `company_settings.vat_mode`.

## 2. Working Rules
- **Workflow:** Plan → Implement → Build → Manual Test → Audit → Commit → Push → PR → Merge
- **Security:** No `.env.local` exposure; never committed to Git.
- **Git:** No `git add .` (only stage intentionally modified files).
- **Database:** No migrations without strict review; PostgreSQL RPC is the absolute source of truth for financial totals.
- **Data Access:** Supabase Admin client runs server-side only; all write Server Actions enforce `requirePermission`; no raw Supabase errors exposed to UI.
- **Docs:** After merged phases or product-direction decisions, update `docs/project-status.md`, `docs/project-roadmap.md`, and `docs/deferred-decisions.md` when applicable.

## 3. Completed Milestones

### ✅ Foundation UI / Routes
- [x] dashboard routes exist
- [x] UI started with mock data
- [x] modules being converted gradually to live Supabase data

### ✅ Supabase + Clerk Foundation
- [x] Supabase schema exists
- [x] Supabase client/admin setup exists
- [x] `/api/health/db` works
- [x] Clerk Auth works
- [x] protected routes redirect correctly
- [x] `.env.local` ignored and not committed

### ✅ Core Security / RBAC
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
- [ ] Manual Supabase apply and verification for SEC-RLS-BASELINE-1
- [x] Final production RLS hardening is still required

### ✅ Customers CRUD
- [x] list/read customers from Supabase
- [x] add customer
- [x] edit customer
- [x] soft delete customer
- [x] RBAC: `customers:read`, `customers:write`
- [x] Access Denied state
- [x] no `[]` returned for Unauthorized/Forbidden
- [x] merged into main

### ✅ Customers CSV Export
- [x] export visible customers to CSV
- [x] filename format: `g7-blue-customers-YYYY-MM-DD.csv`
- [x] correct CSV escaping
- [x] disabled when list is empty
- [x] merged into main

### ✅ Quotations RPC Foundation
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

### ✅ Quotations Data Layer
- PR #4 merged into main
- Branch: `feature/quotations-data-layer`
- Created `types.ts`, `schemas.ts`, `mappers.ts`, `queries.ts`, `actions.ts`, `index.ts`
- Audit passed: permissions enforced, soft delete blocked for approved quotations, numeric `Number()` mapping added, `is_deleted` filter applied, safe errors implemented.

### ✅ Phase 5A — Quotations UI Manual Entry: List + Create Form
- `/quotations` now uses live `getQuotations()` data
- `/quotations/new` creates quotations with manual items only
- Customer dropdown only receives active and non-deleted customers
- Earlier quotation UI used a fixed VAT preview; TAX-0 requires this wording not be treated as current tax registration or official invoice behavior.
- Client totals are preview only and PostgreSQL RPC remains source of truth
- Edit, soft delete, detail, and print were deferred to later quotation phases
- PR merged into main

### ✅ Phase 5B — Quotations Edit + Soft Delete
- Draft quotations can now be edited
- Non-draft quotations show locked edit behavior
- List actions respect `quotations:write`
- Read-only users can still view quotations
- Approved quotations cannot be deleted from UI
- Backend `softDeleteQuotation` remains the authority
- `checkPermission` was added as a server-only helper for conditional UI only

### ✅ Phase 6 — Quotation Detail + Browser Print
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

### ✅ Quotation Stabilization + Product Review
- Quotations core flow is stabilized for the current demo path: create, edit draft, view detail, and browser print.
- Auth error imports were fixed.
- `src/lib/auth/errors.ts` is the canonical source for `UnauthorizedError` and `ForbiddenError`.
- `permissions.ts` imports and throws the shared auth errors instead of defining duplicate classes.
- Quotation RPC ambiguity was fixed.
- `create_quotation_with_items` and `update_quotation_with_items` now qualify `quotation_items` references with aliases.
- PostgreSQL `RETURNS TABLE()` ambiguity lesson captured: output column names can shadow unqualified table references inside PL/pgSQL functions.
- Quotation creation was verified working after manual Supabase apply.
- Quotation browser print layout was improved.

### ✅ Phase CS-A — Company Settings Mini
- Live singleton Company Settings was implemented as CS-A only.
- CS-A uses server-only settings queries/actions, Zod validation, `settings:read`, and `settings:write`.
- Bank details are restricted in the app data flow to Admin and Accountant; Viewer can read settings without receiving bank values.
- VAT mode defaults to `not_registered`; default VAT percent is `0` while not registered.
- Logo upload is deferred.
- Live settings are intentionally not wired into quotation/invoice print views. CS-B document snapshot wiring is required before printed documents depend on Company Settings.
- SQL migration was reviewed for manual apply; SQL must never be applied automatically by agents.
- CS-A was committed on `main` as `8dc380f feat: implement Company Settings CS-A`.

### ✅ ERP-1 — Services DB Foundation
- ERP-1 Services migration was manually applied in Supabase SQL Editor and verified.
- `services` now exists as the new operational unit linked to `customers(id)`.
- Service numbering is supported through `generate_document_number('service')` with `SVC-YYYY-0001`.
- Existing prefixes are preserved: `QT`, `INV`, `PAY`, `PRJ`, and `SVC`.
- `schema.sql` now reflects the verified post-ERP-1 DB state.
- Services app UI/routes/server actions are not implemented yet.
- Quotations are not migrated to `service_id` yet.
- Invoices and payments are not changed yet.
- Legacy `projects` remain for now.
- `DEV_ONLY_services` is fake/dev-data only and not production-safe.

### ✅ PRJ-CLEANUP-1 — Retire User-Facing Projects UI
- Projects were removed from primary user-facing navigation.
- Dashboard Project cards/actions/sections were replaced with Service / Booking-oriented surfaces that point to the existing Services route.
- `/projects` now redirects to `/services`.
- Legacy project schema, permissions, types, mock data, customer `projects_count`, and supplier PRJ mock references remain deferred for later cleanup.

## 4. Current Active Phase

### 🚧 Post-ERP-1 DB Foundation / ERP-2 Planning
Status: Services DB foundation applied; app implementation still pending

CS-A and the ERP-1 Services DB foundation are complete at the database level.

The locked workflow remains:
Customer Profile → Service → Quotation → Invoice → Payment.

The Services table exists, but Services UI/routes/server actions and Service-linked quotation/invoice/payment changes are still deferred to later ERP work.

Real or semi-real data is still blocked until the SEC-RLS-BASELINE-1 migration is manually applied and verified, and remaining production hardening items are complete.

## 5. Deferred Decisions

Detailed deferred decisions are tracked in `docs/deferred-decisions.md` so they remain visible and can be revisited before the relevant phase starts.

Current decision gates before ERP implementation:
- ZATCA/proforma invoice direction beyond the current "do not overclaim" rule
- invoice void/cancellation, credit note, and refund flow
- exact quotation expiry override behavior
- leads/inquiries
- vendors/suppliers
- demo data security level
- SEC-RLS-BASELINE-1 manual apply/verification, remaining production RLS hardening, and sensitive Server Action rate limiting
- audit log details

## 6. Decisions Already Resolved

- **Workflow:** New ERP work follows `Customer Profile → Service → Quotation → Invoice → Payment`. Service / Booking replaces Project as the operational unit. Quotations and invoices must belong to a Service; standalone quotations and standalone invoices are not allowed.
- **Customer Profile hub:** Customer detail must explicitly show related Services, Quotations through Services, Invoices through Services, Payments through Invoices, and later Activity.
- **Service status exit criteria:** Inquiry = service/request captured; Quoted = at least one quotation created/sent; Approved = customer approval recorded; Deposit Paid = valid/cleared deposit payment recorded; In Progress = operations started; Completed = service delivered; Cancelled = cancellation reason recorded. Do not add a separate Confirmed status. `Cancelled` is terminal and non-linear, not a progress step.
- **Quotations:** Quotations are Service-scoped. `customer_id`, if retained, is derived server-side from Service. One Service can have multiple Quotations; do not add `UNIQUE(service_id)`. Approval requires `quotations:approve`, separate from `quotations:write`. Non-draft quotations must not be fully editable through ordinary `quotations:write`, and approved quotations must not be soft-deleted through ordinary `quotations:write`.
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
- Current work should focus on Services app implementation planning, Service-linked quotations, and production RLS hardening before any real or semi-real data use.
