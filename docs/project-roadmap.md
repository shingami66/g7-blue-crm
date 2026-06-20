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
- No Invoice may exist without a Service.
- Each Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence. Do not create separate `DEP-` or `FIN-` sequences.
- Invoice type uses `invoice_type = deposit | final`.
- Payment must link to an Invoice.
- Prevent overpayment unless explicitly approved.
- Deposit is flexible, not fixed at 50%.
- `Deposit Paid` requires a valid/cleared deposit payment. A Deposit Invoice alone does not confirm booking, and a pending payment does not confirm booking.
- Do not add a separate `Confirmed` status.
- `Cancelled` is terminal and non-linear, not a progress step.
- Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic.
- Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
- Financial records must use void/cancel/reversal workflows rather than hard deletion. Use soft delete for business records where applicable.
- The current implemented Company Settings VAT field is `company_settings.vat_mode`.

## 2. Current Priority
1. Docs + agent guidance corrections
2. TAX-0 — cleanup premature tax/ZATCA wording before ERP implementation
3. ERP-0 — planning/report-only workflow review
4. ERP-1 — Services app layer after DB foundation
5. ERP-2 — Service-linked Quotations
6. ERP-3 — Service-linked Invoices
7. ERP-4 — Invoice-linked Payments
8. CS-B — document seller/buyer/settings snapshots
9. Pre-demo security check if demo uses real or semi-real data
10. Customer Profile hub expansion and Activity planning

TAX-0 cleanup is complete, so ERP database implementation can proceed. However, real or semi-real company/client data remains blocked until the SEC-RLS-BASELINE-1 RLS migration is manually applied and verified and remaining production hardening is complete.

### PRJ-CLEANUP-1 — Retire User-Facing Projects UI
Status: Completed

Checklist:
- [x] Remove Projects from primary navigation.
- [x] Replace dashboard Project surfaces with Service / Booking-oriented surfaces.
- [x] Redirect `/projects` to `/services`.
- [x] Leave legacy project schema, permissions, types, mock data, customer `projects_count`, and supplier PRJ mock references for later cleanup.

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
- [x] SEC-RLS-BASELINE-1 migration prepared to remove DEV_ONLY RLS policies
- [ ] Manual Supabase apply and verification for SEC-RLS-BASELINE-1
- [ ] remaining production RLS hardening

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
Status: Core ERP decisions resolved; leads/vendors/demo-data details remain deferred

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
- whether vendors/suppliers are tracked later
- whether first demo data is fake, semi-real, or real

Acceptance criteria:
- [x] No invoice schema work starts before these decisions are documented.
- [x] Event date direction is documented: use `event_start_date` plus nullable `event_end_date`.
- [ ] Saudi partner/business owner confirms event types.
- [x] Deposit/final invoice decision is documented.
- [x] ZATCA/proforma direction is documented as no overclaiming or fake integration.
- [ ] Leads/inquiries decision is documented.
- [ ] Vendors/suppliers decision is documented.
- [ ] Demo data security level is documented.
- [x] If `vat_rate` comes from company settings, it is only a default for new documents.
- [x] Every quotation/invoice stores its own `vat_rate` snapshot.
- [x] Changing company settings never changes old documents.

### Pre-Demo Security Check
Status: Required if demo uses real or semi-real data

Checklist:
- [ ] Confirm whether demo data is fake, semi-real, or real.
- [ ] If real/semi-real data is used, review DEV_ONLY RLS policies before hosted demo.
- [ ] Add explicit production RLS plan for `company_settings` because it contains bank, legal, and VAT data.
- [ ] Verify Supabase admin/service role usage stays server-side only.
- [ ] Confirm no raw database/Supabase errors are exposed to UI.
- [ ] Confirm no secrets are present in committed files.
- [ ] Confirm auth redirects and Access Denied states are correct.
- [ ] Verify Viewer opening `/settings` does not receive full IBAN, bank account holder, or bank account values in client data.
- [ ] Plan rate limiting for sensitive Server Actions: quotation creation, quotation approval, invoice creation, payment recording, and settings update.
- [ ] Confirm UI hiding is not treated as security; server-side permission checks and server-side masking are required.

### Phase CS — Company Settings Mini
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

### Phase TAX-0 — Tax/ZATCA Wording Cleanup
Status: Required before ERP implementation unless explicitly accepted as a known risk

Checklist:
- [ ] Audit invoice, quotation, print, docs, and UI wording for premature tax/ZATCA/FATOORA claims.
- [ ] Keep `phase2_integrated` wording guarded as future-only until real integration exists.
- [ ] Confirm `not_registered` behavior remains VAT 0 and does not show Tax Invoice claims.
- [ ] Document any remaining tax wording risk before starting ERP implementation.
- [ ] Build/test/audit/merge if code changes are made.
- [ ] Update docs.

### Phase ERP-0 — Workflow Planning / Report Only
Status: Planned

Checklist:
- [ ] Confirm locked workflow: Customer Profile → Service → Quotation → Invoice → Payment.
- [ ] Confirm Service replaces Project as the operational unit.
- [ ] Confirm no standalone quotations and no standalone invoices.
- [ ] Customer detail should show related Services.
- [ ] Customer detail should show related Quotations through Services.
- [ ] Customer detail should show related Invoices through Services.
- [ ] Customer detail should show related Payments through Invoices.
- [ ] Customer detail should later show Activity.
- [ ] Review schema/data migration impact without applying SQL.
- [ ] Produce implementation plan only; do not implement in ERP-0 unless explicitly approved.

### Phase ERP-1 — Services
Status: DB foundation applied and verified; app UI/routes/server actions pending

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
- [ ] Manually apply and verify SEC-RLS-BASELINE-1 before real/semi-real service data.
- [x] Verify ERP-1 Services DB state after manual Supabase SQL Editor apply.
- [x] Update `supabase/schema.sql` after post-apply verification.
- [ ] Implement Services UI/routes/server actions.
- [ ] Link Services from Customer Profile.
- [ ] Integration checkpoint after ERP-1 app layer: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Phase ERP-2 — Service-linked Quotations
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
- [ ] `valid_until` or `expiry_date` must be on or after issue date.
- [ ] Expired quotations cannot be approved without renewal/extension or authorized override.
- [ ] Exact override behavior remains deferred.
- [ ] Client-submitted totals remain preview only; server/PostgreSQL logic calculates trusted totals.
- [ ] Integration checkpoint after ERP-2: build, targeted lint/test where applicable, manual browser smoke test, and DB state check if SQL changed.

### Phase ERP-3 — Service-linked Invoices
Status: Planned

Checklist:
- [ ] Invoices must belong to a Service.
- [ ] No standalone invoice creation.
- [ ] Every invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
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

### Phase ERP-4 — Invoice-linked Payments
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

### Phase 7A — Event-aware Invoice Schema + RPC Foundation
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
- [ ] manually apply and verify SEC-RLS-BASELINE-1
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

## 4. Update Rule After Every Merge

After each merged PR, run a docs update task:
- mark completed phase checkbox
- add commit hash and PR if available
- move current phase
- add any new deferred decisions
- document any known risks
- commit docs update if separate, or include in next planning commit
