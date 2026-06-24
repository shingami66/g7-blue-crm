# Tasks: ERP-3B Invoice Creation

**Input**: Design documents from `/specs/001-erp-3b-invoice/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/

**Tests**: Not explicitly requested. Test tasks are not included.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

**Constitution**: All tasks comply with `.specify/memory/constitution.md`. No task applies SQL, creates migrations, reads `.env*`, stages, commits, or pushes.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2)
- Include exact file paths in descriptions

## Out of Scope / Deferred (DO NOT IMPLEMENT)

The following items remain explicitly deferred and must not be implemented by any task:

- Payment workflow implementation and confirmation.
- ZATCA/FATOORA/QR/XML integration.
- Tax Invoice generation (deferred until `vat_mode` is no longer `not_registered`).
- Supabase SQL migrations or SQL apply.
- Invoice PDF redesign (future work only).
- Automatic email/WhatsApp sending.
- Refunds, credit notes, full accounting journal entries.
- Service status transition on invoice creation.
- VAT 15% calculation/display while `vat_mode = not_registered`.
- VAT number display while `vat_mode = not_registered`.

---


## Current Status (Sync ERP-3B)
- T017D Billing UX Cleanup completed and pushed: 42df67e
- Draft invoice issued_at fix completed and pushed: 88507ab
- Snapshot DB verification passed for INV-2026-0004
- Final Invoice UI action completed.
- Issue Workflow completed.
- Live PDF from snapshots remains pending
- Payment MVP remains pending
- Global Invoice Wizard is deferred as ERP-3F

## Phase 0: Safety and Source Review

**Purpose**: Inspect existing code paths and understand current implementation before any changes. No code modifications in this phase.

- [ ] T001 Inspect existing invoice types in `src/types/invoice.ts` - identify type/field mismatches with ERP-3A schema (approved_quotation_id vs quotation_id, invoice_type vs type, missing snapshot_* fields)
- [ ] T002 Inspect existing invoice list page in `src/app/(dashboard)/invoices/page.tsx` - understand current data flow, mock data usage, and UI structure
- [ ] T003 Inspect existing invoice PDF page in `src/app/(dashboard)/invoices/[id]/pdf/page.tsx` - understand print/PDF rendering, static data, and document label handling
- [ ] T004 [P] Inspect quotation approval server actions in `src/lib/quotations/actions.ts` - understand `approveQuotation` pattern, RBAC enforcement via `requirePermission`, and Supabase admin client usage
- [ ] T005 [P] Inspect quotation types/schemas in `src/lib/quotations/types.ts` and `src/lib/quotations/schemas.ts` - understand quotation data shape for snapshot extraction
- [ ] T006 [P] Inspect auth/permissions helpers in `src/lib/auth/permissions.ts` - confirm `requirePermission('invoices:write')` pattern, understand Admin/Accountant/Manager permission mappings
- [ ] T007 [P] Inspect Company Settings queries in `src/lib/settings/queries.ts` and `src/lib/settings/types.ts` - understand seller data shape for `snapshot_seller` population
- [ ] T008 [P] Inspect existing `number_sequences` usage - search for `generate_document_number` RPC calls in `src/lib/quotations/actions.ts` and `src/lib/services/actions.ts` to understand the invoice number generation pattern

**Checkpoint**: All existing code paths inspected. No modifications made.

---

## Phase 1: Foundational (Blocking Prerequisites)

**Purpose**: Update TypeScript types and create the invoice data layer foundation that MUST be complete before user story implementation begins.

**âš ï¸ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T009 Update `src/types/invoice.ts` - fix TypeScript type mismatch deferred from ERP-3A: rename `quotation_id` -> `approved_quotation_id`, rename `type` -> `invoice_type`, add `service_id`, add all `snapshot_*` fields (`snapshot_seller`, `snapshot_buyer`, `snapshot_quotation`, `snapshot_bank_details`, `snapshot_document_rules`), add `vat_mode`, `vat_rate`, `document_label`, `issued_at`, `voided_at`, `void_reason`, add `amount_paid`, `balance_due` as server-derived fields
- [ ] T010 Create `src/lib/invoices/types.ts` - define `CreateInvoiceInput` (matching contract: `quotationId`, `serviceId`, `invoiceType`, `requestedAmount?`), `CreateInvoiceResult` (matching contract: `success`, `invoiceId?`, `invoiceNumber?`, `error?`), and internal `InvoiceSnapshotData` type for snapshot assembly
- [ ] T011 Create `src/lib/invoices/schemas.ts` - Zod validation schema for `CreateInvoiceInput`: validate `quotationId` as UUID, `serviceId` as UUID, `invoiceType` as `deposit | final`, `requestedAmount` as optional positive number; do not trust client totals
- [ ] T012 [P] Create `src/lib/invoices/queries.ts` - read-only query functions: `getInvoiceById`, `getInvoicesByServiceId`, `getInvoicesByQuotationId`; use Supabase admin client server-side only
- [ ] T013 [P] Create `src/lib/invoices/mappers.ts` - map Supabase row data to TypeScript `Invoice` type including all snapshot_* fields, vat_mode, vat_rate, document_label, lifecycle fields
- [ ] T014 Create `src/lib/invoices/index.ts` - barrel export for invoice data layer

**Checkpoint**: Foundation ready - invoice types, schemas, queries, and mappers established. User story implementation can begin.

---

## Phase 2: User Story 1 - Create Deposit Invoice (Priority: P1) ðŸŽ¯ MVP

**Goal**: An admin, manager, or accountant can create a deposit invoice based on an approved quotation for a specific service.

**Independent Test**: Create a deposit invoice with a flexible manually entered amount and verify it is linked to the Service and Quotation properly, with snapshots captured, document labeled as Commercial Invoice/Proforma/Receipt, and no Tax Invoice/VAT 15%/ZATCA behavior.

### Implementation for User Story 1

- [ ] T015 [US1] Create `src/lib/invoices/actions.ts` - implement `createInvoiceAction` Server Action with the following trusted server logic:
  - Enforce RBAC via `requirePermission('invoices:write')` - blocks Viewer and unpermitted Sales roles
  - Parse and validate input with Zod schema from T011
  - Fetch the Quotation by `quotationId` and verify: status is `approved`, belongs to the given `serviceId`
  - Fetch the Service by `serviceId` and verify it exists and is not deleted
  - Handle `service_id` nullable DB state safely
  - Verify the linked Service exists, is not deleted, and is not cancelled before creating the deposit invoice.
  - Deposit guard must be based on service_id, not quotation_id only.
  - Enforce one active deposit invoice per service in the current MVP.
  - Active invoice definition: status NOT IN ('voided','cancelled') AND voided_at IS NULL, plus is_deleted = false only if that column exists.
  - For `deposit` type: validate `requestedAmount` is provided, is > 0, and does not exceed the approved quotation `grand_total`.
  - Deposit is an advance/prepayment invoice, not a discount.
  - Derive `amount_paid` and `balance_due` server-side from approved quotation data - never trust client totals
  - Generate invoice number via `generate_document_number('invoice')` RPC for shared `INV-YYYY-0001` sequence
  - Set `document_label` to `Commercial Invoice` (or `Proforma` / `Receipt`) while `vat_mode = not_registered`
  - Set `vat_mode` from Company Settings current value, `vat_rate` to `0` while not_registered
  - Assemble and populate snapshot fields at issue time:
    - `snapshot_seller`: from Company Settings
    - `snapshot_buyer`: from Customer
    - `snapshot_quotation`: from approved Quotation
    - `snapshot_bank_details`: from Company Settings
    - `snapshot_document_rules`: from Company Settings
  - Snapshot fields must be inserted at issue time and must not be deferred.
  - Set `issued_at` to current timestamp
  - Insert `customer_id`, `date`, and `due_date`.
  - New deposit invoice status must be `draft` unless a real send action exists.
  - Insert invoice row via Supabase admin client
  - Return `CreateInvoiceResult` with `invoiceId` and `invoiceNumber`
  - Do not hard delete any invoice records - respect void/cancel/reversal lifecycle
  - Do not trigger ZATCA/FATOORA/QR/XML behavior
  - Do not calculate VAT 15% or display VAT number

- [ ] T016 [US1] Create snapshot assembly helpers in `src/lib/invoices/snapshots.ts` - extract seller snapshot from Company Settings, buyer snapshot from Customer, quotation snapshot from approved Quotation, bank details snapshot from Company Settings, document rules snapshot from Company Settings; ensure snapshots capture current values at issue time for immutability

- [ ] T017 [US1] Wire deposit invoice creation UI trigger in `src/app/(dashboard)/invoices/` or from the quotation/service detail page - add "Create Deposit Invoice" action visible only to users with `invoices:write` permission; include deposit amount input field; submit to `createInvoiceAction` with `invoiceType: 'deposit'`; hide action from Viewer and unpermitted roles using `checkPermission` for conditional UI only (not security - server enforces)

**Checkpoint**: Deposit invoice creation is functional end-to-end. Admin can create a deposit invoice from an approved quotation, snapshots are captured, document is labeled Commercial Invoice, no Tax Invoice/VAT behavior is present.

---

## Phase 2.5: Final Invoice Settlement Design Review (Blocking Before US2)

**Purpose**: Decide the settlement model before any final invoice implementation.

- [ ] T017A [US2] Run Final Invoice Settlement Design Review before implementing T018:
  - Confirm whether simple `SUM(active prior deposit/progress invoices)` is sufficient for this stage.
  - Decide whether `invoice_prepayment_applications` must be introduced before Final Invoice implementation.
  - Confirm Final Invoice amount represents remaining uninvoiced balance.
  - Confirm Final Invoice subtracts active prior invoices, not payments.
  - Confirm payments affect collected/uncollected balance, not invoiced/uninvoiced balance.
  - Confirm no ZATCA/FATOORA/QR/XML behavior is implemented while `vat_mode = not_registered`.

**Checkpoint**: Final Invoice settlement design accepted. T018 may begin only after this checkpoint.

---

## Phase 3: User Story 2 - Create Final Invoice (Priority: P1)

**Goal**: An admin, manager, or accountant can create a final invoice based on an approved quotation for a specific service, with totals derived strictly from approved quotation authoritative data.

**Independent Test**: Create a final invoice and verify the invoice totals derive from the approved quotation authoritative data, snapshots are recorded, client-submitted totals are overridden, and no ZATCA/FATOORA/QR/XML behavior is triggered.

### Implementation for User Story 2

- [ ] T018 [US2] Extend `createInvoiceAction` in `src/lib/invoices/actions.ts` for `final` invoice type:
  - Server-calculated totals from the approved quotation override client input (FR-009)
  - For `final` type: derive the invoice amount as remaining uninvoiced balance:
    `final_invoice_amount = approved_quotation_total - SUM(active prior deposit/progress invoices)`.
  - Active prior invoices use:
    `status NOT IN ('voided','cancelled') AND voided_at IS NULL`, plus `is_deleted = false` only if that column exists.
  - Subtract active prior invoices, not payments.
  - Payments remain separate from invoice calculation and affect collected/uncollected balance only.
  - Do not invoice the full quotation total again when active prior invoices already exist.
  - If settlement design requires `invoice_prepayment_applications`, return HOLD and do not implement T018 until that design/table is accepted.
  - Re-use snapshot assembly, document labeling, VAT mode, RBAC enforcement, and sequence generation from T015.
  - Same Commercial Invoice / Proforma / Receipt label while `vat_mode = not_registered`.
  - No ZATCA/FATOORA/QR/XML clearance behavior triggered or displayed.

- [ ] T019 [US2] Wire final invoice creation UI trigger - add "Create Final Invoice" action from quotation/service detail page; visible only to `invoices:write` permitted users; no deposit amount input needed for final type; submit to `createInvoiceAction` with `invoiceType: 'final'`

**Checkpoint**: Both deposit and final invoice creation are functional. Totals for final invoices derive from approved quotation data. Client manipulation is blocked server-side.

---

## Phase 4: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect both user stories and overall integration quality.

- [ ] T020 Update existing invoice list page in `src/app/(dashboard)/invoices/page.tsx` to use live `getInvoices` query from `src/lib/invoices/queries.ts` instead of mock/static data - display `invoice_type`, `document_label`, `invoice_number`, `issued_at`, linked Service and Quotation references
- [ ] T021 [P] Verify that the invoice PDF/print page in `src/app/(dashboard)/invoices/[id]/pdf/page.tsx` reads from snapshot fields (`snapshot_seller`, `snapshot_buyer`, `snapshot_quotation`, `snapshot_bank_details`, `snapshot_document_rules`) and `document_label` rather than live Company Settings - ensure historical invoices remain unchanged when settings change (deferred: full PDF redesign is out of scope, but existing template must use snapshot data)
- [ ] T022 Run `pnpm build` to verify no TypeScript compilation errors from type changes and new invoice module
- [ ] T023 Run quickstart.md validation scenarios manually:
  - Scenario 1: Deposit Invoice Creation - verify Commercial Invoice label, snapshot_* columns populated, INV-YYYY-XXXX sequence
  - Scenario 2: Final Invoice Creation - verify totals from approved quotation, snapshots captured, no Tax Invoice details
  - Scenario 3: Validation Constraints - Viewer blocked, negative deposit rejected, cURL/Postman server rejection of invalid totals

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 0 (Safety Review)**: No dependencies - read-only inspection, start immediately
- **Phase 1 (Foundational)**: Depends on Phase 0 completion - BLOCKS all user stories
- **Phase 2 (US1 Deposit Invoice)**: Depends on Phase 1 completion
- **Phase 3 (US2 Final Invoice)**: Depends on Phase 2 completion (extends the same server action)
- **Phase 4 (Polish)**: Depends on Phase 2 and Phase 3 completion

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 1) - no dependencies on other stories
- **User Story 2 (P1)**: Depends on User Story 1 (extends the same `createInvoiceAction`)

### Within Each User Story

- Server action logic before UI wiring
- Snapshot helpers before server action (or inline, then extract)
- RBAC enforcement built into server action from the start
- Story complete before moving to next

### Parallel Opportunities

- Phase 0: T004, T005, T006, T007, T008 can run in parallel
- Phase 1: T012, T013 can run in parallel
- Phase 4: T020, T021 can run in parallel

---

## Parallel Example: Phase 0

```text
# Launch all inspection tasks together:
Task T004: Inspect quotation approval actions
Task T005: Inspect quotation types/schemas
Task T006: Inspect auth/permissions helpers
Task T007: Inspect Company Settings queries
Task T008: Inspect number_sequences usage
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 0: Safety and Source Review
2. Complete Phase 1: Foundational
3. Complete Phase 2: User Story 1 (Deposit Invoice)
4. **STOP and VALIDATE**: Test deposit invoice creation independently
5. Demo/review if ready

### Incremental Delivery

1. Complete Phase 0 + Phase 1 -> Foundation ready
2. Add User Story 1 (Deposit Invoice) -> Test independently -> Review (MVP!)
3. Add User Story 2 (Final Invoice) -> Test independently -> Review
4. Complete Polish -> Full validation -> Review
5. Each story adds value without breaking previous stories

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- No task applies SQL or creates migrations - ERP-3A schema is frozen
- No task reads `.env*` or secrets
- No task stages, commits, or pushes
- No task starts dev server unless explicitly approved
- No task implements payment workflow, ZATCA/FATOORA/QR/XML, Tax Invoice, or other deferred items
- `service_id` is nullable at DB level; trusted server logic must enforce service alignment
- Composite FK enforcement remains partial while service_id is nullable
- Client financial totals are never trusted; all derivation happens server-side
- Void/cancel/reversal lifecycle respected; no hard delete of issued invoices
