# G7 BLUE CRM — Project Status

## 1. Project Overview
- **Project Name:** G7 BLUE CRM
- **Stack:** Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase, Clerk Auth, PostgreSQL RPC
- **Purpose:** A robust CRM tailored for G7 BLUE, managing the entire lifecycle of customer interactions, financial transactions, and project tracking.
- **Core Financial Flow:** Customers → Quotations → Invoices → Payments → Projects / Reports

## 2. Working Rules
- **Workflow:** Plan → Implement → Build → Manual Test → Audit → Commit → Push → PR → Merge
- **Security:** No `.env.local` exposure; never committed to Git.
- **Git:** No `git add .` (only stage intentionally modified files).
- **Database:** No migrations without strict review; PostgreSQL RPC is the absolute source of truth for financial totals.
- **Data Access:** Supabase Admin client runs server-side only; all write Server Actions enforce `requirePermission`; no raw Supabase errors exposed to UI.

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
- [x] `created_by` / `updated_by` fields added
- [x] `audit_logs.user_id` converted to text
- [x] Clerk user ID stored as text
- [x] `DEV_ONLY` RLS policies exist for development
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
- VAT is read-only at 15% for now
- Client totals are preview only and PostgreSQL RPC remains source of truth
- Edit, soft delete, detail, and print are still not implemented
- PR merged into main

### ✅ Phase 5B — Quotations Edit + Soft Delete
- Draft quotations can now be edited
- Non-draft quotations show locked edit behavior
- List actions respect `quotations:write`
- Read-only users can still view quotations
- Approved quotations cannot be deleted from UI
- Backend `softDeleteQuotation` remains the authority
- `checkPermission` was added as a server-only helper for conditional UI only

## 4. Current Active Phase

### 🚧 Phase 6 — Quotation Detail + Browser Print
Status: Planning / Next Up

## 5. Deferred Decisions

### Deferred: Server-side PDF Generation
Current Phase 6 decision:
- Use browser print with window.print() + print CSS.

Reason:
- Faster and simpler for demo/client review.
- Avoids adding PDF dependencies and deployment complexity now.
- User can still print or Save as PDF from the browser.

Deferred enhancement:
- Add real server-side PDF generation later for:
  - Download PDF
  - Email quotation PDF
  - Store generated quotation PDF
  - Attach PDF to invoices/customer records

Possible future tools:
- @react-pdf/renderer
- Puppeteer

### Deferred: Service Catalog
- Do not implement now.
- Current quotation flow will use manual line items.
- **Reason:** Service Catalog requires new services table, CRUD, permissions, and form integration.
- Not blocking demo.
- **Future architecture:** `services` table → dropdown → fills description/category/unit_price → user can edit snapshot values.
- `quotation_items` already supports future integration.

### Deferred: User Management
- Do not implement now.
- RBAC foundation already exists.
- Full user management should come after Quotations, Invoices, and Payments.
- Must include Clerk sync strategy.
- **Future recommended flow:**
  1. Admin creates/invites user by email in `/settings/users`
  2. `app_users` pending/invited record is created
  3. Clerk `user.created` webhook calls `/api/webhooks/clerk`
  4. webhook matches email
  5. webhook updates `app_users.clerk_user_id`
  6. then `requireUser`/`requirePermission` resolves automatically
- Without Clerk webhook sync, every new user would need manual DB linking.

## 6. Last Known Good State
- `main` contains Customers CRUD, Customers Export, Core Security, Quotations RPC Foundation
- migration applied and verified
- current work is data layer, not UI yet
