# Tasks: Supplier Module Schema Design

**Input**: Design documents from `/specs/002-suppliers-schema-design/`

**Prerequisites**: spec.md, plan.md, research.md, data-model.md

**Tests**: Not explicitly requested. Test tasks are not included, but every implementation phase includes manual verification or smoke expectations.

**Organization**: Tasks are grouped by dependency phase so each future controlled prompt can implement one small, reviewable increment.

**Constitution**: All tasks must comply with `.specify/memory/constitution.md` and `AGENTS.md`. This task file does not implement code, SQL, migrations, UI, or docs outside this supplier spec folder.

## Format: `[ID] [P?] [Phase] Description`

- **[P]**: Can run in parallel when assigned under separate controlled prompts and when file paths do not overlap.
- **[Phase]**: Which supplier rollout phase the task belongs to.
- Each task includes scope, likely allowed file categories, verification or smoke expectation, and a no-staging/no-commit reminder unless the task is an explicitly approved controlled commit task.

## Global Task Rules

- Do not implement any task from this file without a later controlled prompt.
- Do not apply SQL or run Supabase commands unless a later prompt explicitly authorizes that action.
- Do not read `.env*` or secrets.
- Do not stage, commit, or push unless a later prompt is explicitly in controlled commit or controlled push mode.
- Schema, RLS, grants, and migration work must follow: inspect -> proposed SQL text -> review -> migration file -> review -> manual Supabase apply -> verification.
- Customer-facing quotations, invoices, PDFs, receipts, and reports must never expose supplier cost, supplier margin, supplier rate cards, actual supplier cost, variance, or Gross Profit.
- While G7 BLUE remains `not_registered`, no supplier work may add Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, clearance, or customer e-invoicing behavior.
- Every completed implementation phase needs a docs sync task after code verification, unless that future prompt explicitly says docs are out of scope.

## Out of Scope / Deferred (DO NOT IMPLEMENT WITHOUT FUTURE APPROVAL)

- Supplier PO PDF generation.
- WhatsApp/email sending.
- Supplier portal.
- Supplier invoice attachment upload.
- Supplier payment approval workflow implementation.
- Rate-card-driven quotation automation.
- Automatic margin reports.
- ZATCA/FATOORA/QR/XML behavior.
- Tax Invoice/VAT 15% behavior for G7 BLUE customer invoices.
- Chamber/PO attestation workflow.

---

## Phase 0: Design Artifact Finalization

**Purpose**: Finalize and approve supplier design artifacts before any implementation. No code, SQL, migrations, UI, or Supabase commands in this phase.

- [ ] T001 [Phase 0] Review `specs/002-suppliers-schema-design/spec.md`, `plan.md`, `research.md`, and `data-model.md` with Team Lead; scope is design review only; allowed files are read-only supplier spec artifacts; verify no unresolved P0/P1 product questions remain; no staging or commit.
- [ ] T002 [Phase 0] Confirm the approved design preserves supplier type (`company`, `individual`), lifecycle statuses (`active`, `on_hold`, `blacklisted`, `inactive`), `is_preferred`, IBAN masking, Admin/Manager/Accountant/Operations/Viewer boundaries, Service/Booking linkage, snapshots, and deferred items; allowed files are read-only supplier spec artifacts; verify by checklist; no staging or commit.
- [ ] T003 [Phase 0] Confirm no code, SQL, migration, schema, package, Supabase, build, env, or secrets action is required to accept the design; allowed files are read-only supplier spec artifacts; verify with `git status --short --untracked-files=all`; no staging or commit.
- [ ] T004 [Phase 0] Commit supplier design artifacts only after explicit controlled commit approval; scope is exact supplier spec folder artifacts; allowed files are `spec.md`, `plan.md`, `research.md`, `data-model.md`, and `tasks.md`; verify staged files exactly; do not push.
- [ ] T005 [Phase 0] Update canonical docs only after design approval if requested by a later docs-sync prompt; scope is documentation alignment only; allowed files to be named by that future prompt; verify docs staleness audit; no staging or commit unless separately controlled.

**Checkpoint**: Supplier design artifacts approved. Implementation remains blocked until a later controlled implementation prompt.

---

## Phase A: Supplier Directory Foundation

**Purpose**: Establish live read-only supplier directory foundations before write workflows.

- [ ] T006 [Phase A] Draft supplier schema migration design for `suppliers`; scope includes supplier number/code, supplier type, legal/commercial name, display name, category, contact details, coverage, lifecycle status, `is_preferred`, optional rating, CR, VAT registration fields, payment terms, bank/IBAN strategy, soft delete, blacklist audit, and audit fields; likely allowed categories are proposed SQL text and later `supabase/migrations/` only after explicit migration approval; verify review checklist; no staging or commit.
- [ ] T007 [Phase A] Add supplier directory permissions/RBAC design for basic read/write boundaries; scope includes `suppliers:read` and `suppliers:write` behavior only, not costing/payables; likely allowed file category is `src/lib/auth/permissions.ts`; verify Admin/Manager/Operations/Viewer expectations; no staging or commit.
- [ ] T008 [Phase A] Design and implement reviewed supplier directory RLS policies only under a later explicit SQL/RLS prompt; scope includes basic supplier directory row visibility and write protection; likely allowed categories are proposed SQL text and later migration file; verify policy review, no broad unsafe access, and no Supabase apply unless separately approved; no staging or commit.
- [ ] T009 [Phase A] Create supplier server types, mappers, and read queries; scope is live read-only directory data and server-side RBAC; likely allowed categories are `src/types/supplier.ts` and `src/lib/suppliers/`; verify unauthorized/forbidden behavior is not hidden as empty data; no staging or commit.
- [ ] T010 [Phase A] Replace static `/suppliers` list data with live read-only supplier records; scope is read-only UI replacing `suppliersData`; likely allowed files are `src/app/(dashboard)/suppliers/page.tsx` and supplier data-layer files; verify static `src/lib/data/suppliers.ts` rows are no longer rendered as live data; no create/edit/delete; no staging or commit.
- [ ] T011 [Phase A] Add safe empty, loading, and unavailable states for the live suppliers page; scope is `/suppliers` read-only UX only; likely allowed file is `src/app/(dashboard)/suppliers/page.tsx`; verify no raw Supabase errors are exposed; no staging or commit.
- [ ] T012 [Phase A] Run manual UI smoke for live read-only `/suppliers`; scope includes list load, filtering/search if present, status display, contact display, and no write controls for unauthorized users; allowed action is manual browser smoke only; verify no customer-facing cost/margin exposure; no staging or commit.
- [ ] T013 [Phase A] Run docs sync after the live supplier directory phase is completed and verified; scope is canonical docs named by a later docs-sync prompt; verify docs staleness audit; no staging or commit unless separately controlled.

**Checkpoint**: Live read-only supplier directory exists. Create/edit/delete suppliers remain separate later tasks.

---

## Phase B: Supplier Master Write Workflow

**Purpose**: Add controlled supplier create/edit/deactivate behavior after read-only directory foundations are stable.

- [ ] T014 [Phase B] Implement create supplier form and Server Action; scope includes minimum required fields, supplier type (`company` or `individual`), category, contact person, phone, city, country, status, `is_preferred`, validation, and RBAC; likely allowed files are `src/app/(dashboard)/suppliers/`, `src/lib/suppliers/`, and `src/types/supplier.ts`; verify Viewer cannot mutate and server enforces permissions; no staging or commit.
- [ ] T015 [Phase B] Implement edit supplier form and Server Action; scope includes mutable master fields, validation, audit update fields, and no unsafe changes to historical snapshots; likely allowed files are supplier UI/data-layer/type files; verify historical supplier_bookings and supplier_invoices would not rely on live mutable fields; no staging or commit.
- [ ] T016 [Phase B] Implement soft delete/deactivate behavior; scope includes `inactive` and soft delete strategy, not hard delete; likely allowed files are supplier actions and UI; verify historical allocations, bookings, invoices, and payments remain readable to permitted roles; no staging or commit.
- [ ] T017 [Phase B] Implement bank detail masking for supplier master views and writes; scope includes optional IBAN at creation, required-before-confirmed-payment rule as a later payment validation dependency, and full/masked visibility; likely allowed files are supplier queries/mappers/actions and UI; verify Admin and Accountant can see full bank details by default, Manager/Operations see masked only if needed, Viewer sees none; no staging or commit.
- [ ] T018 [Phase B] Implement blacklist fields and audit history; scope includes `blacklisted_reason`, `blacklisted_at`, `blacklisted_by`, unblacklist reason/history, and Admin/Manager restriction; likely allowed files are supplier actions, types, UI, and reviewed migration if needed; verify on_hold and blacklisted suppliers are blocked from new allocation/booking by default in later phases; no staging or commit.
- [ ] T019 [Phase B] Run supplier write workflow smoke tests; scope includes create, edit, deactivate/soft delete, blacklist/unblacklist, bank masking, and role restrictions; allowed action is manual UI smoke; verify no customer-facing cost/margin exposure and no SQL/Supabase apply unless already approved; no staging or commit.
- [ ] T020 [Phase B] Run docs sync after supplier write workflow completion; scope is canonical docs named by a later docs-sync prompt; verify docs staleness audit; no staging or commit unless separately controlled.

---

## Phase C: Supplier Rate Cards

**Purpose**: Add internal, effective-dated supplier cost defaults without changing customer quotation pricing.

- [ ] T021 [Phase C] Draft and review `supplier_rate_cards` schema migration design; scope includes `supplier_id`, item/service name, category, unit, base_cost, currency, `valid_from`, `valid_to`, active/inactive state, notes, and audit fields; likely allowed categories are proposed SQL text and later migration file after approval; verify supplier schema dependency is complete; no staging or commit.
- [ ] T022 [Phase C] Implement supplier rate card types, mappers, and read queries; scope is internal rate-card reads; likely allowed files are `src/lib/suppliers/`, `src/types/supplier.ts`, or a dedicated supplier rate-card module; verify cost fields require supplier_costing permission; no staging or commit.
- [ ] T023 [Phase C] Add read-only supplier rate card UI; scope is display/filter by supplier and effective date; likely allowed files are supplier page/detail components; verify no automatic customer quotation pricing and no customer-facing exposure; no staging or commit.
- [ ] T024 [Phase C] Implement create/edit rate card workflows under supplier_costing write permission; scope includes effective dating, active/inactive state, validation, and audit fields; likely allowed files are supplier rate-card actions/schemas/UI; verify `valid_from`/`valid_to` behavior and no quotation amount mutation; no staging or commit.
- [ ] T025 [Phase C] Run rate card smoke tests; scope includes read-only display, create/edit, effective dates, inactive handling, and RBAC; allowed action is manual smoke; verify rate-card-driven quotation automation remains deferred; no staging or commit.
- [ ] T026 [Phase C] Run docs sync after rate cards completion; scope is canonical docs named by a later docs-sync prompt; verify docs staleness audit; no staging or commit unless separately controlled.

---

## Phase D: Service Supplier Allocations / Costing

**Purpose**: Connect supplier costs to Service/Booking while keeping cost and margin internal.

- [ ] T027 [Phase D] Draft and review `service_supplier_allocations` schema migration design; scope includes `service_id`, `supplier_id`, nullable `rate_card_id`, item description, quantity, unit, estimated_unit_cost, estimated_total_cost, actual_unit_cost, actual_total_cost, currency, manual MVP status, internal notes, and audit fields; likely allowed categories are proposed SQL text and later migration file after approval; verify supplier schema and services schema dependencies; no staging or commit.
- [ ] T028 [Phase D] Implement allocation types, mappers, and read queries; scope includes estimated and actual cost fields stored separately with variance preserved; likely allowed files are supplier/service data-layer modules and types; verify cost fields require supplier_costing permission; no staging or commit.
- [ ] T029 [Phase D] Add Service detail supplier costing tab or section; scope is internal Service/Booking UI only; likely allowed files are `src/app/(dashboard)/services/[id]/` and supplier/service modules; verify no customer-facing quotation, invoice, PDF, or receipt exposes supplier cost, variance, or Gross Profit; no staging or commit.
- [ ] T030 [Phase D] Implement allocation create/edit workflow with manual MVP statuses; scope includes `draft`, `requested`, `quoted`, `confirmed`, `cancelled`, and `completed`; likely allowed files are service/supplier actions, schemas, and UI; verify guarded transitions remain deferred; no staging or commit.
- [ ] T031 [Phase D] Add actual cost capture path after supplier confirmation or supplier invoice signal; scope stores actual values separately and preserves estimated values and variance; likely allowed files are allocation actions and mappers; verify actual cost never overwrites estimated cost; no staging or commit.
- [ ] T032 [Phase D] Run allocation/costing smoke tests; scope includes Service/Booking linkage, estimated cost, actual cost, variance, RBAC, and no customer-facing exposure; allowed action is manual smoke; verify Operations cannot view internal margin by default; no staging or commit.
- [ ] T033 [Phase D] Run docs sync after allocation/costing completion; scope is canonical docs named by a later docs-sync prompt; verify docs staleness audit; no staging or commit unless separately controlled.

---

## Phase E: Supplier Bookings / Internal PO

**Purpose**: Add supplier booking records and snapshot safety before any PO PDF or messaging work.

- [ ] T034 [Phase E] Draft and review `supplier_bookings` schema migration design; scope includes booking sequence/numbering, `service_id`, `supplier_id`, nullable allocation_id, status, booked date/time, delivery date/time, location, agreed amount, currency, supplier snapshot fields, terms/notes snapshot, approval fields, cancellation fields, and audit fields; likely allowed categories are proposed SQL text and later migration file after approval; verify supplier and allocation dependencies; no staging or commit.
- [ ] T035 [Phase E] Design booking sequence/numbering behavior; scope includes prefix, yearly sequence decision, collision handling, and audit trace; likely allowed categories are design notes or later reviewed SQL/RPC if approved; verify no change to customer invoice numbering; no staging or commit.
- [ ] T036 [Phase E] Implement supplier booking types, mappers, and read queries; scope includes snapshot fields and role-sensitive agreed amount visibility; likely allowed files are supplier booking data-layer modules and types; verify snapshots are read from booking records, not live supplier master only; no staging or commit.
- [ ] T037 [Phase E] Implement supplier booking create workflow; scope includes selecting an eligible supplier, linking Service/Booking, optional allocation link, snapshot capture, terms/notes snapshot, and audit fields; likely allowed files are supplier booking actions/schemas/UI; verify on_hold and blacklisted suppliers are blocked by default unless later override is approved; no staging or commit.
- [ ] T038 [Phase E] Implement supplier booking approval/cancellation fields and read UI; scope includes approved_by, approved_at, cancelled_by, cancelled_at, cancellation reason, and status display; likely allowed files are booking actions and UI; verify cancellation preserves history; no staging or commit.
- [ ] T039 [Phase E] Run supplier booking smoke tests; scope includes create, read, snapshot immutability, approval/cancellation, role visibility, and Service/Booking linkage; allowed action is manual smoke; verify Supplier PO PDF and WhatsApp/email remain deferred; no staging or commit.
- [ ] T040 [Phase E] Run docs sync after supplier booking completion; scope is canonical docs named by a later docs-sync prompt; verify docs staleness audit; no staging or commit unless separately controlled.

---

## Phase F: Supplier Invoices

**Purpose**: Add AP-like supplier invoice records that remain separate from customer invoices.

- [ ] T041 [Phase F] Draft and review separate `supplier_invoices` schema migration design; scope includes internal supplier invoice number, `supplier_id`, normally required `service_id`, Admin-only overhead/non-service exception, nullable `supplier_booking_id`, external supplier invoice reference, issue date, due date, subtotal, VAT amount, grand total, currency, statuses, supplier snapshot fields, approval fields, notes, and audit fields; likely allowed categories are proposed SQL text and later migration file after approval; verify customer `invoices` are not reused; no staging or commit.
- [ ] T042 [Phase F] Design Admin-only overhead/non-service classification controls; scope includes nullable `service_id` exception and reporting exclusion from Service P&L unless explicitly classified; likely allowed categories are design notes, schemas/actions later; verify normal supplier invoices link to Service/Booking; no staging or commit.
- [ ] T043 [Phase F] Implement supplier invoice types, mappers, and read queries; scope includes supplier snapshot fields and status values `received`, `approved`, `partially_paid`, `paid`, `disputed`, and `cancelled`; likely allowed files are supplier invoice data-layer modules and types; verify Accountant/Admin visibility and Manager gross margin boundary; no staging or commit.
- [ ] T044 [Phase F] Add read-only supplier invoice list/detail UI; scope is AP supplier invoice display only; likely allowed files are supplier invoice app routes/components; verify no reuse of customer invoice pages, labels, PDFs, or customer payment totals; no staging or commit.
- [ ] T045 [Phase F] Implement create/record supplier invoice workflow later under explicit approval; scope includes external reference, supplier snapshot capture, Service/Booking linkage, overhead/non-service exception, approval status, and validation; likely allowed files are supplier invoice actions/schemas/UI; verify supplier-side VAT facts do not add Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, or XML behavior to G7 BLUE customer invoices; no staging or commit.
- [ ] T046 [Phase F] Run supplier invoice smoke tests; scope includes read-only list/detail, record workflow if approved, snapshot immutability, statuses, RBAC, and overhead/non-service exception; allowed action is manual smoke; verify customer invoices remain unchanged; no staging or commit.
- [ ] T047 [Phase F] Run docs sync after supplier invoice completion; scope is canonical docs named by a later docs-sync prompt; verify docs staleness audit; no staging or commit unless separately controlled.

---

## Phase G: Supplier Payments

**Purpose**: Add outbound supplier payment records that remain separate from customer payment records.

- [ ] T048 [Phase G] Draft and review separate `supplier_payments` schema migration design; scope includes `supplier_invoice_id`, `supplier_id`, nullable `service_id`, amount, payment method, payment date, reference, status, created_by, confirmed_by, confirmed_at, notes, and audit fields; likely allowed categories are proposed SQL text and later migration file after approval; verify dependency on supplier_invoices; no staging or commit.
- [ ] T049 [Phase G] Implement supplier payment types, mappers, and read queries; scope includes outbound payment data only; likely allowed files are supplier payment data-layer modules and types; verify customer payments and dashboard collected revenue are not mixed with supplier payments; no staging or commit.
- [ ] T050 [Phase G] Implement supplier payment draft/create workflow; scope includes outbound payment entry against supplier invoice, Accountant/Admin visibility, and no customer payment reuse; likely allowed files are supplier payment actions/schemas/UI; verify Manager margin boundaries remain intact; no staging or commit.
- [ ] T051 [Phase G] Implement confirmed payment guard requiring supplier IBAN/bank details before confirmation; scope includes validation and role-masked display; likely allowed files are supplier payment actions and supplier bank-detail helpers; verify full bank details are visible only to Admin and Accountant by default; no staging or commit.
- [ ] T052 [Phase G] Implement supplier payment status workflow; scope includes `draft`, `confirmed`, and `cancelled`; likely allowed files are supplier payment actions/UI; verify no hard delete and no mixing with customer payments; no staging or commit.
- [ ] T053 [Phase G] Run supplier payment smoke tests; scope includes draft, confirmed, cancelled, required IBAN before confirmed payment, Accountant/Admin access, Manager gross margin boundary, and customer payment isolation; allowed action is manual smoke; no staging or commit.
- [ ] T054 [Phase G] Run docs sync after supplier payment completion; scope is canonical docs named by a later docs-sync prompt; verify docs staleness audit; no staging or commit unless separately controlled.

---

## Phase H: Service P&L Reporting

**Purpose**: Add role-restricted internal profitability views after supplier allocations, invoices, payments, and customer financial flows are stable.

- [ ] T055 [Phase H] Design Service P&L derivation rules; scope includes expected supplier costs, actual supplier costs, customer revenue, supplier invoice/payment treatment, variance, and Gross Profit per Service; likely allowed categories are design notes or later data-layer modules; verify dependencies on allocations, supplier_invoices, supplier_payments, customer invoices, and customer payments; no staging or commit.
- [ ] T056 [Phase H] Implement Service P&L read model or query layer under Admin/Manager permission; scope includes expected vs actual supplier costs and Gross Profit; likely allowed files are reporting/data-layer modules; verify Accountant visibility decision is explicit before any Accountant margin access; no staging or commit.
- [ ] T057 [Phase H] Add internal Service P&L UI; scope is Admin/Manager-only internal reporting, likely in Service detail or reports area; likely allowed files are service/reporting app routes/components; verify no customer-facing exposure and no automatic margin reports; no staging or commit.
- [ ] T058 [Phase H] Run Service P&L reporting smoke tests; scope includes expected vs actual supplier costs, variance, Gross Profit, Admin/Manager visibility, Accountant boundary, Operations/Viewer denial, and customer-facing document isolation; allowed action is manual smoke; no staging or commit.
- [ ] T059 [Phase H] Run docs sync after Service P&L completion; scope is canonical docs named by a later docs-sync prompt; verify docs staleness audit; no staging or commit unless separately controlled.

---

## Phase Z: Deferred Items

**Purpose**: Track known future work that must not be implemented until separately approved.

- [ ] T060 [Phase Z] Supplier PO PDF generation - deferred; future scope must define document layout, snapshots, numbering, approval state, and one-page/PDF verification; do not implement now.
- [ ] T061 [Phase Z] WhatsApp/email sending - deferred; future scope must define templates, consent, audit trail, delivery status, and security controls; do not implement now.
- [ ] T062 [Phase Z] Supplier portal - deferred; future scope must define authentication, supplier access boundaries, data exposure, and RLS; do not implement now.
- [ ] T063 [Phase Z] Supplier invoice attachment upload - deferred unless explicitly approved; future scope must define storage, file type/size rules, malware/security checks, signed URL strategy, and permissions; do not implement now.
- [ ] T064 [Phase Z] Supplier payment approval workflow implementation - deferred; future scope must define approval roles, thresholds, audit trail, cancellation/reversal behavior, and notifications; do not implement now.
- [ ] T065 [Phase Z] Rate-card-driven quotation automation - deferred; future scope must prove customer quotation pricing remains deliberate and does not leak supplier cost; do not implement now.
- [ ] T066 [Phase Z] Automatic margin reports - deferred; future scope must define reporting cadence, filters, access control, and reconciliation rules; do not implement now.
- [ ] T067 [Phase Z] ZATCA/FATOORA/QR/XML behavior - deferred until VAT/e-invoicing approval; do not implement now.
- [ ] T068 [Phase Z] Tax Invoice/VAT 15% behavior for G7 BLUE customer invoices - deferred while company settings remain `not_registered`; do not implement now.
- [ ] T069 [Phase Z] Chamber/PO attestation workflow - deferred; future scope must define legal/operational requirements and document retention; do not implement now.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0**: No implementation dependencies. Must complete before any Supplier Module implementation.
- **Phase A**: Depends on Phase 0 approval.
- **Phase B**: Depends on Phase A live read-only supplier directory.
- **Phase C**: Depends on Phase A supplier schema and supplier identity stability.
- **Phase D**: Depends on Phase A supplier schema, services schema, and preferably Phase C rate-card model for optional references.
- **Phase E**: Depends on Phase A supplier schema and Phase D allocations for optional allocation linkage.
- **Phase F**: Depends on Phase A supplier schema and optionally Phase E bookings/services. Normal supplier invoices require Service/Booking linkage through `service_id`; nullable `service_id` is Admin-only overhead/non-service exception.
- **Phase G**: Depends on Phase F supplier_invoices.
- **Phase H**: Depends on Phase D allocations, Phase F supplier_invoices, Phase G supplier_payments, and customer invoices/payments.
- **Phase Z**: Deferred until explicit future approval.

### Key Feature Dependencies

- Supplier Directory live page depends on supplier schema, permissions/RBAC, and RLS.
- Supplier Master Write Workflow depends on live read-only supplier directory.
- Supplier Rate Cards depend on supplier schema.
- Service Supplier Allocations depend on supplier schema and services schema.
- Supplier Bookings depend on supplier schema and allocations.
- Supplier Invoices depend on supplier schema and services/bookings, with the Admin-only overhead/non-service exception.
- Supplier Payments depend on supplier_invoices.
- Service P&L depends on allocations, supplier_invoices, supplier_payments, customer invoices, and customer payments.

### Parallel Opportunities

- Phase 0 review tasks can be performed in parallel by reviewers.
- Phase A schema/RBAC/RLS design tasks can be reviewed in parallel, but implementation must respect migration review gates.
- Phase C read-only rate-card UI can proceed after read queries exist and can be split from create/edit workflows.
- Phase D UI and data-layer tasks should not run before schema/RLS approval.
- Deferred Phase Z items are not parallel-ready because they require future approval first.

---

## Implementation Strategy

### MVP First

1. Complete Phase 0 design approval.
2. Complete Phase A supplier directory foundation.
3. Stop and validate live read-only `/suppliers`.
4. Run docs sync for Phase A.

### Incremental Delivery

1. Add Phase B supplier write workflow after Phase A.
2. Add Phase C rate cards.
3. Add Phase D allocations/costing.
4. Add Phase E bookings/internal PO record.
5. Add Phase F supplier invoices.
6. Add Phase G supplier payments.
7. Add Phase H Service P&L reporting.
8. Keep Phase Z deferred unless a future prompt explicitly approves one item.

## Notes

- Create/edit/delete suppliers are intentionally not part of Phase A read-only supplier directory.
- Supplier invoices are separate from customer invoices.
- Supplier payments are separate from customer payments.
- Supplier costs, supplier margins, variance, and Gross Profit are internal and role-restricted.
- RLS and RBAC must be enforced server-side and in the database; UI hiding is not security.
- No task in this file authorizes staging, commit, push, SQL apply, Supabase commands, build, env reads, or secrets reads.
