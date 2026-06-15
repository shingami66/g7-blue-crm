# G7 BLUE CRM — Roadmap & Execution Plan

## 1. Workflow Rule
**Plan → Implement → Build → Manual Test → Audit → Commit → Push → PR → Merge**

After every successful merge:
- update `docs/project-status.md`
- update `docs/project-roadmap.md`
- update `docs/deferred-decisions.md` when decisions are added, resolved, or deferred
- mark completed checklist items
- add branch/commit/PR notes
- update "Current Active Phase"

## 2. Current Priority
1. Docs + agent guidance
2. Phase BD — Business Domain Decisions
3. Pre-demo security check if demo uses real data
4. Phase CS — Company Settings Mini
5. Phase 7A — Event-aware Invoice Schema + RPC Foundation
6. Phase 7B — Invoice Data Layer
7. Phase 7C — Invoice UI
8. Phase 7D — Invoice Browser Print
9. Phase 8 — Payments
10. Events/Projects view depending on business answers

Do not start invoice schema work until Phase BD decisions are documented.

## 3. Completion Checklist

### Phase 0 — Stabilization
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

### Phase 1 — Customers
Status: Completed

Checklist:
- [x] Customers CRUD
- [x] Customers CSV Export

### Phase 2 — Core Security / RBAC
Status: Foundation completed; production hardening deferred

Checklist:
- [x] app_users
- [x] roles
- [x] requirePermission
- [x] Clerk/Supabase foundation
- [ ] production hardening for DEV_ONLY RLS

### Phase 3 — Quotations RPC Foundation
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

### Phase 4 — Quotations Data Layer
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

### Phase 5 — Quotations UI Manual Entry
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

### Phase 6 — Quotation Detail / Print
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

### Phase BD — Business Domain Decisions
Status: Required before Phase 7A

**Purpose:**
Confirm event-company workflow before invoice schema.

Questions to resolve:
1. Are quotations always tied to events?
2. Required event fields:
   - `event_name`
   - `event_date`
   - `event_venue`
   - `event_type`
3. Can one quotation generate multiple invoices?
   - deposit invoice
   - final invoice
   - multiple staged invoices
4. Are invoices official ZATCA tax invoices or internal/proforma first?
5. Are leads/inquiries tracked before becoming customers?
6. Are vendors/suppliers tracked later?
7. Is first demo using real data or fake data?

Acceptance criteria:
- [ ] No invoice schema work starts before these decisions are documented.
- [ ] Event fields decision is documented.
- [ ] Multi-invoice decision is documented.
- [ ] ZATCA/proforma direction is documented.
- [ ] Leads/inquiries decision is documented.
- [ ] Vendors/suppliers decision is documented.
- [ ] Demo data security level is documented.
- [ ] If `vat_rate` comes from company settings, it is only a default for new documents.
- [ ] Every quotation/invoice stores its own `vat_rate` snapshot.
- [ ] Changing company settings never changes old documents.

### Pre-Demo Security Check
Status: Required if demo uses real or semi-real data

Checklist:
- [ ] Confirm whether demo data is fake, semi-real, or real.
- [ ] If real/semi-real data is used, review DEV_ONLY RLS policies before hosted demo.
- [ ] Verify Supabase admin/service role usage stays server-side only.
- [ ] Confirm no raw database/Supabase errors are exposed to UI.
- [ ] Confirm no secrets are present in committed files.
- [ ] Confirm auth redirects and Access Denied states are correct.

### Phase CS — Company Settings Mini
Status: CS-A implemented in working tree; SQL requires manual review/apply

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
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 7A — Event-aware Invoice Schema + RPC Foundation
Status: Blocked until Phase BD is complete

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

### Phase 7B — Invoice Data Layer
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

### Phase 7C — Invoice UI
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

### Phase 7D — Invoice Browser Print
Status: Planned

Checklist:
- [ ] Browser print route
- [ ] Print / Save as PDF wording
- [ ] Company settings integration
- [ ] ZATCA basics note only, do not claim full compliance
- [ ] Server-side PDF remains deferred unless explicitly approved
- [ ] Build/test/audit/merge
- [ ] Update docs

### Phase 8 — Payments
Status: Planned

Checklist:
- [ ] Payment create/list/detail
- [ ] Link payments to invoices
- [ ] Partial/full payment handling
- [ ] Invoice payment status update
- [ ] Receipts if needed
- [ ] Build/test/audit/merge
- [ ] Update docs

### Events / Projects View
Status: Depends on Phase BD answers

Checklist:
- [ ] Decide whether event tracking is a first-class module or project view
- [ ] Create project/event from approved quotation/invoice if needed
- [ ] Project/event status tracking
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

### User Management + Clerk Sync
Status: Deferred; required before production team usage

Checklist:
- [ ] `/settings/users`
- [ ] `users:manage` permission
- [ ] list `app_users`
- [ ] add/invite user by email
- [ ] edit role
- [ ] deactivate user
- [ ] Clerk webhook endpoint `/api/webhooks/clerk`
- [ ] verify Clerk webhook Svix signatures
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
- `app_users.clerk_user_id` remains text and is never cast to UUID

### Service Catalog
Status: Deferred as productivity enhancement, not blocking core financial demo

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
- [ ] remove/replace `DEV_ONLY` RLS policies
- [ ] review Supabase anon usage
- [ ] verify admin client server-only
- [ ] secret scan
- [ ] raw error audit
- [ ] rate limiting for sensitive endpoints
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

## 4. Update Rule After Every Merge

After each merged PR, run a docs update task:
- mark completed phase checkbox
- add commit hash and PR if available
- move current phase
- add any new deferred decisions
- document any known risks
- commit docs update if separate, or include in next planning commit
