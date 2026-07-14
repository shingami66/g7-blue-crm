# Approved Billing Scope Runtime Decisions Lock

## Review Provenance
- Source review: `APPROVED-BILLING-SCOPE-RUNTIME-RPC-DESIGN-REVIEW-1`
- Review result: `PASS WITH REQUIRED CHANGES`
- This document locks the required V1 runtime, product, and security **policy** decisions.
- **Historical note:** Originally written before runtime implementation. **Current implementation status** is recorded below and in `docs/approved-billing-scope-management-design.md` — do not treat “no runtime has started” as current truth.

## Current implementation status (source-grounded)

- **READY (server):** create draft, discard draft, edit draft item, line-safety review, approve; invoice ceiling when active scope present; legacy quotation fallback when no active scope.
- **READY (read UI):** Service Detail **read-enriched** summary card (`ABS-MGMT-UI-READ-ENRICH-1`) + nested read-only detail route. Card surfaces effective display state, source quotation, ceiling, invoiced/remaining (when `invoices:read`), line safety, draft/history indicators, and detail navigation. Accountant masking of internal notes/reasons preserved.
- **PARTIAL (write UI):** Create Draft and Edit/Discard are implemented and pushed on main; Review/Approve is implemented in current source, manually accepted, and remains uncommitted and unpushed pending controlled commit/push.
- **MISSING:** `voidApprovedBillingScope` / `supersedeApprovedBillingScope` **action functions** (Zod schemas + permission keys + DB columns exist; **not** working actions).
- **Status model:** DB status enum is `draft | approved | voided` only. **`superseded` is not a status value** — use `superseded_at` / `superseded_by_scope_id` for display.
- **Custom RPC exceptions (shipped):** draft discard RPC and draft item-edit RPC (narrow `service_role` helpers). General ABS business logic remains app-layer server actions.
- **Management design:** locked in `docs/approved-billing-scope-management-design.md`. Next active implementation task: `ABS-MGMT-FINANCIAL-LIFECYCLE-DESIGN-1`. Void/supersede blocked on **`ABS_VOID_SUPERSEDE_FINANCIAL_BEHAVIOR_PENDING`**.

## Locked V1 Decisions

### Runtime Architecture
- V1 uses app-layer server actions and server-only service functions as the primary supported write path.
- Use the service-role Supabase client only from server-only code after app-layer permission checks.
- Every write action must pass `requirePermission(...)` before any service-role write.
- DB triggers and constraints remain the invariant backstop.
- **Original lock wording:** no general custom Postgres RPC program for V1 business workflows.
- **Current exceptions (implemented):** (1) draft discard transactional function; (2) draft item-edit transactional function — both narrow, `service_role`-only, not a general RPC direction.
- Add further Postgres RPC only if concurrency or multi-step atomicity creates a real need (expected candidates: supersede once financial behavior is locked).

### Permissions
- Admin: full workflow.
- Manager: full workflow.
- Accountant: read-only.
- Viewer: no Approved Billing Scope access in V1.
- Sales: no Approved Billing Scope access in V1.
- Internal notes and reviewer reasons are visible only to Admin and Manager in V1.
- Accountant may read scope headers and items, but not internal notes or reasons unless a later review approves that change.

### Draft Creation
- Input is `source_quotation_id` only.
- Server derives `service_id`, `scope_version`, source snapshots, item snapshots, and totals.
- Browser-submitted trusted financial or source values are not allowed.
- Block draft creation if the source quotation does not exist, is not approved, is deleted, has `discount > 0`, or has no items.
- If an active draft already exists for the same source quotation, hard-fail.
- Do not silently return an existing draft.
- Do not allow multiple drafts for the same source quotation in V1.
- Default copied item decision is `accepted`.
- Accepted values initially equal source values.
- Header accepted totals are recalculated server-side from copied child items.
- Create Draft UI eligibility additionally requires zero ABS records for the complete Service-scoped list. Existing draft, active, voided, superseded-derived, or mixed history blocks the control.
- `Completed` and `Cancelled` Services cannot create an ABS draft. The UI hides the control, and the server action independently resolves Service lifecycle through the quotation relationship and rejects terminal, deleted, or missing Services.
- The browser payload remains `sourceQuotationId` only; browser-supplied Service identity or status is not accepted.

### Draft Item Editing
- `accepted`: accepted qty and unit price must equal source qty and unit price.
- `adjusted`: allow quantity reduction, unit-price reduction, or both, but only as reductions.
- `excluded` and `customer_supplied`: accepted qty, unit price, subtotal, VAT, and grand total must all be zero.
- `adjusted`, `excluded`, and `customer_supplied` require `reason_code`.
- Server recalculates subtotal, VAT, and grand total.
- Material financial edits reset `line_safety_status` from `safe` to `pending_review`.
- `reason_note`-only edits do not reset safety.
- `display_order`-only edits do not reset safety.

### Line Safety
- States: `pending_review`, `safe`, `unsafe`.
- Only Admin and Manager can review.
- `unsafe` requires both `reason_code` and a non-empty reviewer note.
- Approval requires the current state to be `safe`.
- Material financial edits reset `safe` to `pending_review`.

### Approval
- Approval requires:
  - `status = draft`
  - `line_safety_status = safe`
  - source quotation still approved
  - source quotation not deleted
  - source quotation `discount = 0`
  - same service
  - header totals match item sums
  - at least one billable item with positive accepted total
- Block zero-total approved scopes in V1.
- Ordinary approval must fail if another active approved scope exists for the service.
- No auto-supersede during ordinary approval.
- Approval must run in a transaction and handle active conflict safely.
- The DB partial unique index remains the final backstop.

### Void and Draft Discard
- **Policy (locked intent):** Void applies to approved scopes only in V1; Admin/Manager; non-empty reason; server sets `voided_at`, `voided_by`, and `void_reason`; voided remains terminal.
- **Implementation status:** **void action not implemented.** Do not claim void is available in the CRM UI or as a server action. Financial behavior after voiding an **active** scope is **`ABS_VOID_SUPERSEDE_FINANCIAL_BEHAVIOR_PENDING`** (may expose legacy quotation fallback; expected future-invoice behavior not locked).
- Draft cleanup is a separate discard action (**implemented** via `discardApprovedBillingScopeDraft` + discard RPC).
- Do not overload void for draft cleanup.

### Supersede
- **Policy (locked intent):** Supersede is explicit only; same service only; framed as approve-new-scope-with-supersede-target inside one atomic transaction; mark old active scope via `superseded_at` / relationship (not a `status = superseded` enum); exactly one active approved scope per service; Admin/Manager only.
- **Implementation status:** **supersede action not implemented.** Ordinary approve must **not** silently supersede (`scope_active_conflict`). Partial-invoicing supersede behavior is part of **`ABS_VOID_SUPERSEDE_FINANCIAL_BEHAVIOR_PENDING`**.

### Invoice Boundary
- No invoice runtime changes in this phase.
- Future invoice runtime must use `approved_billing_scope_id`.
- Approved Billing Scope is the future billing-authority ceiling.
- Existing `approved_quotation_id` invoice basis remains valid for current runtime.
- No Tax, ZATCA, FATOORA, QR, or XML behavior is introduced here.

### Audit
- App audit is enough for V1 if server actions remain the only write path.
- A DB audit trigger is not required for V1.
- Approval, void, and supersede must not ship without app audit.
- Required events:
  - draft created
  - draft item edited
  - line safety reviewed
  - scope approved
  - scope voided
  - scope superseded
- Minimum fields:
  - actor
  - role
  - service_id
  - source_quotation_id
  - approved_billing_scope_id
  - event type
  - before/after summary
  - reason code or void reason where applicable
  - timestamp

### Error Contract
- Stable user-safe error codes:
  - `scope_not_found`
  - `scope_source_not_approved`
  - `scope_source_deleted`
  - `scope_discount_not_supported`
  - `scope_source_service_mismatch`
  - `scope_service_lifecycle_ineligible`
  - `scope_duplicate_draft`
  - `scope_no_items`
  - `scope_no_billable_items`
  - `scope_not_draft`
  - `scope_not_safe`
  - `scope_active_conflict`
  - `scope_reduction_invalid`
  - `scope_reason_required`
  - `scope_unsafe_note_required`
  - `scope_terminal_voided`
  - `scope_supersede_target_required`
  - `scope_supersede_service_mismatch`
  - `scope_permission_denied`
- Do not expose raw trigger or constraint text directly to UI users.

### Implementation Smoke Notes
- `ABS-MGMT-UI-DRAFT-CREATE-1` is source implemented and **PASS by Mozfer manual browser evidence**; it is pushed on main in `47d9a4f14f019e837224e6db6cababdab12a7610` and `7054cf34654266ca033c58c62f9dca6d94092967`.
- Observed evidence only: Admin saw no Create Draft on a Cancelled terminal Service; an eligible non-terminal Service with approved quotation, zero ABS history, zero invoices, and zero discount exposed Create Draft; creation succeeded and navigated to the nested draft detail route; the scope displayed Draft, version 1, Pending review, the copied quotation item, and `SAR 1,000.00`; returning to Service Detail showed the existing Draft, View details, and no Create Draft; Viewer had no ABS access; Arabic and English rendering passed.
- No manual double-click stress test is claimed. Pending duplicate-submit protection is implementation/test-covered, not separately proven by manual browser evidence. Agent did not perform browser smoke.
- The older server-action smoke record below is separate historical evidence; its duplicate request check is not a manual UI double-click stress-test claim for `ABS-MGMT-UI-DRAFT-CREATE-1`.
- `APPROVED-BILLING-SCOPE-DRAFT-CREATE-COMMIT-1` implemented the create-draft action in `4ec323f feat(billing): add approved scope draft creation`.
- Manual DEV/DEMO smoke passed for source quotation `9778cf05-ae13-4072-8d6d-0b2ec1e970fe` and produced `scopeId = 2fb8a324-4bd2-44be-8a23-a2b37e9b6e72`.
- Verification confirmed `status = draft`, `line_safety_status = pending_review`, item count matched quotation items, accepted totals matched item sums, and the duplicate second click returned `scope_duplicate_draft`.
- `ABS-MGMT-UI-DRAFT-EDIT-1` is source implemented, automated validation passed, and `PASS by Mozfer manual browser evidence` was recorded. The Service Detail card now exposes a clear bordered View details action instead of visually hidden text; the nested ABS draft-detail route opened correctly; the draft item editor displayed immutable source values and editable accepted values; an adjusted unit-price reduction saved successfully; refreshed item and header totals reflected the server-authoritative result; line safety remained Pending review after the material edit; cancelling an unsaved edit preserved the last saved value; selecting Excluded zeroed accepted quantity, unit price, item total, and scope total after save; cancelling the discard confirmation left the draft unchanged; confirming discard deleted the draft and its items; after discard, the Service Detail page showed Create Draft again; Arabic and English rendering passed. The first discard navigation attempt exposed a UX weakness: the modal remained visible during slow destination rendering; the source fix closes the modal, clears local error state, performs one router.push, removes the redundant router.refresh, and the fixed redirect was manually re-tested and returned automatically to Service Detail without a manual refresh. Pending duplicate-submit protection is implementation/test-covered, not separately proven by manual browser evidence. This slice is pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`.

- `ABS-MGMT-UI-REVIEW-APPROVE-1` is source implemented, automated validation passed, and currently uncommitted and unpushed. **PASS by Mozfer manual browser evidence.** The flow was manually observed in English only: Pending review blocked final approval until a Safe review was saved; readiness showed quotation, ceiling, item counts, billable count, and state; Safe review preserved `SAR 1,000.00`; approval confirmation warned about financial authority and immutability; approval activated the scope and removed write controls; Service Detail showed ceiling `SAR 1,000.00`, accepted total `SAR 1,000.00`, invoiced `SAR 0.00`, remaining `SAR 1,000.00`, Safe line safety, and View details only. Arabic parity/wiring is automated-test-covered, not manual evidence. Review uses `approvedBillingScopes:review`, draft-only safe/unsafe choices, unsafe reason/note requirements, server-side consistency checks, reviewer audit fields, no financial recalculation, and pre-client authorization. Approval uses `approvedBillingScopes:approve`, draft-only Safe/item/billable/total guards, active-scope conflict protection, metadata-only approval, and scopeId-only browser input. Duplicate-submit prevention is implementation/test-covered; no manual rapid double-click or expected-version browser contract is claimed.

- `ABS-MGMT-UI-REVIEW-APPROVE-1` is source implemented, automated validation passed, and currently uncommitted and unpushed. PASS by Mozfer manual browser evidence. The manual flow was observed in English only; Arabic/English parity and Arabic wiring are automated-test-covered. Review and approval remain draft-only, permission-gated, server-authoritative, and do not recalculate or trust browser financial values. Duplicate-submit prevention is implementation/test-covered; no manual rapid double-click or expected-version browser contract is claimed.
- `APPROVED-BILLING-SCOPE-DRAFT-DISCARD-SMOKE-DOCS-SYNC-1` verified the manual apply of draft discard migration `20260708110000_approved_billing_scope_draft_discard_function.sql` in DEV/DEMO.
- Metadata verification passed (function exists, invoker security, execute permission restricted to service_role).
- Dry-check passed (zero UUID returns scope_not_found).
- Manual app smoke test passed via temporary DEV harness `/approved-billing-scopes/dev/draft-discard-smoke`:
  - Created a draft approved billing scope (`0ace1c81-68c0-4cdd-8d9b-db563cd49949`) linked to source quotation `9778cf05-ae13-4072-8d6d-0b2ec1e970fe` and service `e9e70297-bc64-4f5b-9560-beeb6cdbd4d9`.
  - Verified creation of scope header and 2 child items with matching totals.
  - Successfully invoked `discardApprovedBillingScopeDraft` server action.
  - Verified atomic database deletion of both the scope header and its items.
- The temporary smoke harness was removed after verification.

## Deferred (current)
- Production apply remains not authorized.
- Full management **write** UI remains incomplete only for controlled commit/push and future void/supersede behavior; Create Draft, Draft Edit/Discard, and Review/Approve are source implemented and manually accepted.
- Void and supersede **actions** remain not implemented and **blocked** on `ABS_VOID_SUPERSEDE_FINANCIAL_BEHAVIOR_PENDING`.
- Tax, ZATCA, FATOORA, QR, and XML behavior remain deferred.
- **Historical:** live schema enforceability check, draft create/discard/edit, review/approve, invoice integration, read-only card/detail, and **read-enrichment** are completed history — not current deferred work.
