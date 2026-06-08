# G7 BLUE CRM — Roadmap & Execution Plan

## 1. Workflow Rule
**Plan → Implement → Build → Manual Test → Audit → Commit → Push → PR → Merge**

After every successful merge:
- update `docs/project-status.md`
- update `docs/project-roadmap.md`
- mark completed checklist items
- add branch/commit/PR notes
- update "Current Active Phase"

## 2. Completion Checklist

### Phase 1 — Customers
- [x] Customers CRUD
- [x] Customers CSV Export

### Phase 2 — Core Security / RBAC
- [x] app_users
- [x] roles
- [x] requirePermission
- [x] Clerk/Supabase foundation
- [ ] production hardening for DEV_ONLY RLS

### Phase 3 — Quotations RPC Foundation
- [x] vat_rate
- [x] QT numbering
- [x] create RPC
- [x] update RPC
- [x] VAT residual adjustment
- [x] service_role-only RPC permissions
- [x] manual Supabase apply
- [x] build + health check
- [x] PR merged

### Phase 4 — Quotations Data Layer
Status: In Progress

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

### Phase 5 — Quotations UI Manual Entry
**Note: Phase 5 is split into Phase 5A (List + Create Form completed) and Phase 5B (Edit + Soft Delete next).**

Checklist:
- [x] Wire `/quotations` list to live data
- [x] Empty state
- [x] Access denied state
- [x] Loading/error states if implemented
- [x] Create quotation form
- [x] Dynamic manual line items
- [x] Client-side preview only comment
- [x] Call `createQuotation` action
- [ ] Edit draft quotation
- [ ] Prevent full edit for non-draft
- [ ] Soft delete quotation
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

### Phase 6 — Quotation Detail / Print
Checklist:
- [ ] Detail page uses real data
- [ ] Items show real values
- [ ] Customer info shown
- [ ] Status badge
- [ ] Print layout
- [ ] PDF/print-ready quotation
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 7 — Invoices
Checklist:
- [ ] Invoice data model review
- [ ] Invoice RPC if needed
- [ ] Convert approved quotation to invoice
- [ ] Invoice numbering
- [ ] VAT/totals server-side
- [ ] Invoice list/detail
- [ ] Print/PDF invoice
- [ ] ZATCA basics note only, do not claim full compliance
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 8 — Payments
Checklist:
- [ ] Payment create/list/detail
- [ ] Link payments to invoices
- [ ] Partial/full payment handling
- [ ] Invoice payment status update
- [ ] Receipts if needed
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 9 — Projects
Checklist:
- [ ] Create project from approved quotation/invoice
- [ ] Project status tracking
- [ ] Operations view
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 10 — Dashboard Real Data
Checklist:
- [ ] Replace dashboard mock data
- [ ] Revenue summary
- [ ] quotations/invoices/payments counts
- [ ] recent activity
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 11 — Settings / Company Profile
Checklist:
- [ ] Company info
- [ ] VAT default
- [ ] logo/business info for PDFs
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 12 — User Management + Clerk Sync
**Important:** Deferred now, but required before production handoff.

Checklist:
- [ ] `/settings/users`
- [ ] `users:manage` permission
- [ ] list `app_users`
- [ ] add/invite user by email
- [ ] edit role
- [ ] deactivate user
- [ ] Clerk webhook endpoint `/api/webhooks/clerk`
- [ ] handle `user.created`
- [ ] match Clerk email to `app_users.email`
- [ ] update `app_users.clerk_user_id`
- [ ] handle duplicate/missing email safely
- [ ] audit role changes
- [ ] Build/test/audit/merge
- [ ] Update docs

**Definition of Done:**
- admin can invite/add users
- new Clerk signup links automatically to `app_users`
- no manual DB linking required
- inactive users cannot access system

### Phase 13 — Service Catalog
**Important:** Deferred as productivity enhancement, not blocking core financial demo.

Checklist:
- [ ] `services` table migration
- [ ] services CRUD
- [ ] services permissions
- [ ] `/services` page
- [ ] quotation form dropdown
- [ ] selected service fills description/category/unit_price
- [ ] quotation item remains snapshot-editable
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 14 — Audit Logs
Checklist:
- [ ] identify important actions
- [ ] log creates/updates/deletes/status changes
- [ ] admin audit view
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 15 — Security Hardening
Checklist:
- [ ] remove/replace `DEV_ONLY` RLS policies
- [ ] review Supabase anon usage
- [ ] verify admin client server-only
- [ ] secret scan
- [ ] raw error audit
- [ ] rate limiting for sensitive endpoints
- [ ] webhook signature verification
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 16 — QA / Deployment / Demo
Checklist:
- [ ] production Supabase setup
- [ ] deployment setup
- [ ] demo data
- [ ] demo script
- [ ] final smoke test
- [ ] client handoff notes
- [ ] Update docs

## 3. Update Rule After Every Merge

After each merged PR, run a docs update task:
- mark completed phase checkbox
- add commit hash and PR if available
- move current phase
- add any new deferred decisions
- document any known risks
- commit docs update if separate, or include in next planning commit

## 4. Current Priority
1. Start Phase 5B — Quotations Edit + Soft Delete
2. Allow full edit only for draft quotations
3. Lock non-draft quotations
4. Add soft delete action from UI
5. Confirm approved quotations cannot be deleted
