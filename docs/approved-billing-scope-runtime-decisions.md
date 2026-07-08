# Approved Billing Scope Runtime Decisions Lock

## Review Provenance
- Source review: `APPROVED-BILLING-SCOPE-RUNTIME-RPC-DESIGN-REVIEW-1`
- Review result: `PASS WITH REQUIRED CHANGES`
- This document locks the required V1 runtime, product, and security decisions before implementation starts.
- Docs/spec only. No runtime implementation has started.

## Locked V1 Decisions

### Runtime Architecture
- V1 uses app-layer server actions and server-only service functions as the only supported write path.
- Use the service-role Supabase client only from server-only code after app-layer permission checks.
- Every write action must pass `requirePermission(...)` before any service-role write.
- DB triggers and constraints remain the invariant backstop.
- No custom Postgres RPC is approved for V1.
- Add Postgres RPC later only if concurrency or multi-client integration creates a real need.
- Narrow safety exception: draft discard may use a service_role-only transactional SQL function if needed to guarantee atomic deletion of one draft scope plus its child items.

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
- Void applies to approved scopes only in V1.
- Void requires Admin or Manager.
- Void requires a non-empty reason.
- Server sets `voided_at`, `voided_by`, and `void_reason`.
- Voided remains terminal.
- Draft cleanup is a separate discard/delete action.
- Do not overload void for draft cleanup.
- If app-layer multi-step deletes cannot guarantee atomicity, a single-purpose transactional discard function is allowed for draft cleanup only.

### Supersede
- Supersede is explicit only.
- Same service only.
- A revised approved quotation source is allowed if it belongs to the same service.
- Supersede should be framed as approve-new-scope-with-supersede-target inside one transaction.
- The transaction must mark the old active scope superseded and approve the new scope.
- Exactly one active approved scope per service remains.
- Admin and Manager only.

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
- `APPROVED-BILLING-SCOPE-DRAFT-CREATE-COMMIT-1` implemented the create-draft action in `4ec323f feat(billing): add approved scope draft creation`.
- Manual DEV/DEMO smoke passed for source quotation `9778cf05-ae13-4072-8d6d-0b2ec1e970fe` and produced `scopeId = 2fb8a324-4bd2-44be-8a23-a2b37e9b6e72`.
- Verification confirmed `status = draft`, `line_safety_status = pending_review`, item count matched quotation items, accepted totals matched item sums, and the duplicate second click returned `scope_duplicate_draft`.
- The temporary smoke harness was removed after cleanup verification.

## Deferred
- Production apply remains not authorized.
- Runtime implementation remains deferred.
- Invoice integration remains deferred.
- Tax, ZATCA, FATOORA, QR, and XML behavior remain deferred.
- The next safe follow-up remains `APPROVED-BILLING-SCOPE-LIVE-SCHEMA-ENFORCEABILITY-CHECK-1`.
