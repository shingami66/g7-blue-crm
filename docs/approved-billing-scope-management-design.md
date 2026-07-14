# Approved Billing Scope Management Design

**Task:** `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1`

**Docs sync:** `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-DOCS-SYNC-1`

**Status:** Management and V1 void/supersede financial-lifecycle design locked (actions not implemented)

**Related runtime lock:** `docs/approved-billing-scope-runtime-decisions.md`

This document is the **current** product/technical management design for Service-scoped Approved Billing Scope (ABS) UI and write workflow. It is grounded in repository source as of HEAD `d8b654f2c89622837b75531aa44d79a66e024ad8`. Historical ABS milestones may predate this file; prefer this document for current behavior, locked future behavior, and slice order.

---

## 1. Capability matrix (source-grounded)

| Capability | UI | Server | DB | Permission | Status |
|------------|----|--------|-----|------------|--------|
| View active approved scope | Service card + nested detail (read-enrich) | list / getActive / getById | `approved_billing_scopes` | `approvedBillingScopes:read` | **READY** (read UI) |
| View draft scope | Detail by id; card primary when no active | list / get | `status=draft` | read | **READY** (read UI) |
| View historical / voided / superseded | Detail by id; card history/other counts + display state | list for service | `voided_at`, `superseded_at` | read | **READY** (read UI; no full history page) |
| Create draft from approved quotation | Service card Create Draft action + nested detail navigation | `createApprovedBillingScopeDraft` | inserts + constraints | create | **READY** (source implemented; Mozfer smoke PASS; pushed on main) |
| Edit draft item (decision/qty/price/reason) | Draft detail page + bordered item editor | `editApprovedBillingScopeItem` + item-edit RPC | draft-only | update | **READY** (source implemented; Mozfer smoke PASS; pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`) |
| Discard draft | Draft detail page + discard confirmation | `discardApprovedBillingScopeDraft` + discard RPC | draft cleanup | discard | **READY** (source implemented; Mozfer smoke PASS; pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`) |
| Line-safety review | Draft detail review dialog | `reviewApprovedBillingScopeLineSafety` | header fields | review | **READY** (implemented, accepted, committed, and pushed) |
| Approve / activate draft | Draft detail approval dialog | `approveApprovedBillingScope` | `status -> approved`; one-active guard | approve | **READY** (implemented, accepted, committed, and pushed) |
| Add/remove items after create | **None** | **None** | items only from quotation snapshot | — | **MISSING** / **DEFERRED** |
| Calculate / store ceiling totals | Server at create/edit/approve | recalculate header/items | totals columns | — | **READY** |
| Display invoiced amount on ABS card | Service card (gated) | `getServiceBillingState` prior total | invoices FK | `invoices:read` | **READY** (read UI; hidden/restricted without permission) |
| Display remaining billable | Service card (gated) | `getServiceBillingState` remaining | active scope or QT fallback | `invoices:read` | **READY** (read UI; uses server contract) |
| Source quotation snapshot | Stored on create | create path | source_* columns | — | **READY** |
| Prevent invoices above ceiling | Invoice create + DB trigger | invoice actions | FK + triggers | invoices:write | **READY** |
| Legacy service without active scope | Invoice/billing fallback | quotation grand total | `approved_billing_scope_id` null | — | **READY** |
| Void approved scope | **None** | **No action** (schema only) | `voided_*` columns and trigger capability | void | **DESIGN LOCKED; IMPLEMENTATION MISSING** |
| Create successor draft | **None** | **No action** | existing version/snapshot columns can hold a clone | create + supersede | **DESIGN LOCKED; IMPLEMENTATION MISSING** |
| Atomically activate successor | **None** | **No action** | `superseded_*`, active unique index, existing invoice guards require revision | approve + supersede | **DESIGN LOCKED; IMPLEMENTATION MISSING** |

### Source files (proof)

- Server: `src/lib/approved-billing-scopes/actions.ts`, `queries.ts`, `schemas.ts`, `types.ts`, `permissions.ts`, `errors.ts`, `mappers.ts`
- UI: `src/app/(dashboard)/services/[id]/ApprovedBillingScopesCard.tsx`, `.../approved-billing-scopes/[scopeId]/page.tsx`
- Invoice ceiling: `src/lib/invoices/actions.ts`, `src/lib/invoices/billing-state.ts`
- Schema/migrations: foundation + discard/edit RPCs + invoice integration under `supabase/migrations/`

### Status model (do not invent DB values)

- **Scope status enum:** `draft` | `approved` | `voided` only (`APPROVED_BILLING_SCOPE_STATUSES`).
- **Active scope (display/runtime):** `status = approved` AND `superseded_at IS NULL` AND `voided_at IS NULL`.
- **Superseded** is a **timestamp/relationship** (`superseded_at`, `superseded_by_scope_id`), **not** a status enum value.
- **Line safety:** `pending_review` | `safe` | `unsafe`.
- **Item decision:** `accepted` | `adjusted` | `excluded` | `customer_supplied`.

### Source-truth corrections

| Incorrect current implication | Correct current truth |
|------------------------------|------------------------|
| Void/supersede “actions implemented” | **Schemas + permission keys + columns exist; no `voidApprovedBillingScope` / `supersedeApprovedBillingScope` action functions** |
| “No custom Postgres RPC for V1” without exception | **Exceptions exist:** draft discard RPC and draft item edit RPC (narrow service_role helpers) |
| Status = `superseded` | **Not** a DB status; use timestamps for display “Superseded” |
| ABS fully managed in CRM UI | **Read-enrichment + Create Draft + Draft Edit/Discard + Review/Approve are implemented and pushed**; void/supersede UI is not implemented |

Historical milestone notes elsewhere may still mention planned void/supersede; treat those as historical unless labeled current.

### Read-enrichment slice status (`ABS-MGMT-UI-READ-ENRICH-1`)

- **Source implemented and accepted; pushed on main.**
- Service Detail **read-only** card shows: effective display state (active / draft / voided / superseded-derived), version, source quotation reference, billing ceiling, invoiced amount, remaining billable, line safety, draft-revision and history/other-scope indicators, link to nested read-only detail.
- Invoice totals appear **only when `invoices:read` permits**; otherwise restricted/unavailable (not coerced to zero).
- Accountant masking of internal notes/reasons remains preserved (not exposed on the summary card).
- No Create / Edit / Discard / Review / Approve / Void / Supersede controls in this slice.

### Draft-create slice status (`ABS-MGMT-UI-DRAFT-CREATE-1`)

- **Source implemented and manually accepted; PASS by Mozfer manual browser evidence.** Pushed on main in `47d9a4f14f019e837224e6db6cababdab12a7610` and `7054cf34654266ca033c58c62f9dca6d94092967`.
- Admin/Manager can create from Service Detail only when an approved, non-deleted quotation exists and the complete Service-scoped ABS list contains zero records. Accountant remains read-only; Viewer/Sales/Operations have no ABS access.
- Existing draft, active, voided, superseded-derived, or mixed ABS history blocks Create Draft.
- `Completed` and `Cancelled` Services cannot create an ABS draft. The UI hides the control; the server action independently resolves the Service through the quotation relationship and rejects terminal, deleted, or missing Services.
- Browser payload remains `sourceQuotationId` only. Service identity/status, version, quotation/item snapshots, and totals remain server-derived.
- Manual evidence: the Cancelled-Service control was hidden; an eligible non-terminal Service with approved quotation, zero ABS history, zero invoices, and zero discount exposed Create Draft; creation navigated to the nested draft detail route; the scope displayed Draft, version 1, Pending review, the copied quotation item, and `SAR 1,000.00`; returning to Service Detail showed the existing Draft, View details, and no Create Draft; Viewer denial and Arabic/English rendering passed.
- No manual double-click stress test is claimed. Pending duplicate-submit protection is implementation/test-covered, not separately proven by manual browser evidence. Agent did not perform browser smoke.

### Draft-edit + discard slice status (`ABS-MGMT-UI-DRAFT-EDIT-1`)

- **Source implemented; automated validation passed; PASS by Mozfer manual browser evidence.** Pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073` (`feat(billing): add approved scope draft edit and discard`).
- The Service Detail card now exposes a clear bordered View details action instead of visually hidden text.
- The nested ABS draft-detail route opened correctly.
- The draft item editor displayed immutable source values and editable accepted values.
- An adjusted unit-price reduction saved successfully.
- Refreshed item and header totals reflected the server-authoritative result.
- Line safety remained Pending review after the material edit.
- Cancelling an unsaved edit preserved the last saved value.
- Selecting Excluded zeroed accepted quantity, unit price, item total, and scope total after save.
- Cancelling the discard confirmation left the draft unchanged.
- Confirming discard deleted the draft and its items.
- After discard, the Service Detail page showed Create Draft again.
- Arabic and English rendering passed.
- The first discard navigation attempt exposed a UX weakness: the modal remained visible during slow destination rendering.
- The source fix now closes the modal, clears local error state, performs one router.push, and removes the redundant router.refresh.
- The fixed redirect was manually re-tested and returned automatically to Service Detail without a manual refresh.
- Pending duplicate-submit protection is implementation/test-covered, not separately proven by manual browser evidence. Agent did not perform browser smoke.

### Review and approval slice status (`ABS-MGMT-UI-REVIEW-APPROVE-1`)

- **Implemented, accepted, committed, and pushed on main in `d8b654f2c89622837b75531aa44d79a66e024ad8`.** PASS by Mozfer manual browser evidence.
- Manual evidence was observed in English only: a Pending review draft exposed Review and Approval; Approval readiness showed the source quotation, accepted ceiling, item counts, billable-item count, and Pending review; the final approval action stayed disabled until a Safe review was saved; Safe review changed line safety to Safe; accepted totals remained `SAR 1,000.00`; approval confirmation showed the financial-authority and immutability warning; approval succeeded; the scope became Active approved with an approved date; controls disappeared; Service Detail showed the active scope with ceiling `SAR 1,000.00`, accepted grand total `SAR 1,000.00`, invoiced `SAR 0.00`, remaining `SAR 1,000.00`, Safe line safety, View details only, and no Create Draft.
- Arabic/English dictionary parity and Arabic wiring are automated-test-covered; no Arabic manual browser evidence is claimed. No manual duplicate-click or browser stale-form test is claimed.
- Review preserves `approvedBillingScopes:review`, draft-only state, safe/unsafe choices, server-side consistency checks, mandatory unsafe reason/note, reviewer audit fields, no financial-total recalculation, re-review while draft, and authorization before write-client creation.
- Approval preserves `approvedBillingScopes:approve`, draft-only state, Safe line safety, item/billable-item and total consistency guards, active-scope conflict protection, metadata-only approval, active invoice-ceiling authority, scopeId-only payload, and server-derived identity/totals.
- Automated coverage passed: runtime action tests `35/35`; focused ABS/UI tests `46/46`; coverage includes review safe/unsafe/invalid/guard/error paths, approval success/guard/conflict/concurrency paths, permission-before-client ordering, no-write rejection paths, localized dictionary parity, draft-only controls, pending protection, refresh wiring, and identifier-only payloads. Admin/Manager write permissions are preserved; Accountant remains read-only and Viewer/Sales/Operations have no ABS access.

---

## 2. Product entry and workflow

### Entry point

- **Service Detail only** — extend `ApprovedBillingScopesCard` (already gated by `approvedBillingScopes:read`).
- **No** standalone top-nav ABS module.
- Nested detail remains: `/services/[serviceId]/approved-billing-scopes/[scopeId]`.

### Summary card state matrix

| State | Show | Primary CTA |
|-------|------|-------------|
| No approved quotation | Empty + guidance | Link to quotations if permitted |
| Approved QT, no scope; eligible non-terminal Service | Legacy: invoices use QT total | Create draft (`create`) |
| Draft only | Draft status, version, line safety, ceiling | Open draft (edit/review/approve/discard) |
| Active approved | Active badge, version, ceiling | View details; later “revision draft” when supersede ready |
| Active + draft | Active summary + draft indicator | Open active; open draft; block second draft per same QT |
| Denied | Hide or access-denied | None |

### Detail / edit / review / approve / history

1. **Detail (exists):** metadata, items table, totals, linked invoices (`invoices:read`).
2. **Draft edit:** per-item decision/qty/price/reason via `editApprovedBillingScopeItem`; non-optimistic; financial edit → `pending_review`.
3. **Discard:** confirm → `discardApprovedBillingScopeDraft` (draft only).
4. **Line safety review:** Admin/Manager → `reviewApprovedBillingScopeLineSafety` (`safe`/`unsafe` + reasons).
5. **Approve:** confirm → `approveApprovedBillingScope`; fails if active exists (`scope_active_conflict`); no silent supersede.
6. **History (missing UI):** list all scopes for service by version; optional slice later.

---

## 3. Permissions and errors

| Permission | Roles (locked) | UI |
|------------|----------------|-----|
| read | Admin, Manager, Accountant | Card, detail, history |
| create, update, review, approve, discard, void, supersede | Admin, Manager | Write CTAs when backend READY |
| none | Sales, Viewer, Operations | No access |

Accountant: headers/items; mask internal notes/reasons (existing masking pattern).

Stable error codes (dictionary-map only):
`scope_not_found`, `scope_not_draft`, `scope_not_safe`, `scope_active_conflict`, `scope_concurrency_conflict`, `scope_no_items`, `scope_no_billable_items`, `scope_reduction_invalid`, `scope_reason_required`, `scope_duplicate_draft`, `scope_service_lifecycle_ineligible`, `scope_permission_denied`, `scope_unexpected_error`, plus invoice ceiling codes.

---

## 4. Financial invariants

1. Active scope `acceptedGrandTotal` is the invoice ceiling when present.
2. Current runtime uses approved-quotation fallback whenever no active scope exists. Locked future runtime permits that fallback only before the Service has ever established approved ABS authority; a post-void or historical authority gap fails closed.
3. Existing invoices are never rewritten by scope edits/approve/void/supersede.
4. Draft edits never mutate issued invoice snapshots.
5. One active scope per service (DB partial unique + approve guard).
6. Reductions-only item decisions; line safety required before approve.
7. Hard delete only for **draft discard**; no hard delete of approved/voided financial history.
8. Western digits / SAR via shared formatters; no Tax Invoice / ZATCA / FATOORA / QR / XML claims.
9. Service remains operational core; flow Customer → Service → Quotation → Invoice → Payment.

### Locked financial-lifecycle decision

**`ABS_VOID_SUPERSEDE_SERVICE_LIFETIME_CEILING_LOCKED`**

This decision replaces and resolves `ABS_VOID_SUPERSEDE_FINANCIAL_BEHAVIOR_PENDING`. It is a product and technical design lock only; no void/supersede action, UI, RPC, trigger revision, or migration is implemented by this document.

#### Current factual baseline

| Layer | Current truth |
|---|---|
| Schema capability | Scope status is `draft | approved | voided`; active means approved with null `voided_at` and `superseded_at`; `scope_version`, `superseded_at`, `superseded_by_scope_id`, `voided_at`, `voided_by`, `void_reason`, `approved_at`, `approved_by`, `created_by`, and `updated_by` exist. The partial unique index protects one active scope per Service. |
| Existing working behavior | Draft create/edit/discard, line-safety review, ordinary approval, active-scope reads, invoice linkage, and active-scope ceiling enforcement work. Invoice creation falls back to the approved quotation when no active scope exists. Invoice exposure currently uses non-deleted invoices whose status is not `cancelled`/`voided` and whose `voided_at` is null. |
| Missing behavior | No void action, successor-draft action, supersede activation action, or lifecycle UI exists. Current fallback does not distinguish never-had-ABS from historical-ABS-with-no-active-scope. Existing supersede trigger checks are not a complete atomic activation workflow. App audit is not written by current ABS actions. |
| Planned behavior | Three permission-gated server actions call service-role-only transactional RPCs for void, successor-draft creation, and successor activation. Revised invoice trigger/app logic enforces the historical-authority fallback gate and service-lifetime ceiling. |

Existing invoice links are `invoices.approved_billing_scope_id -> approved_billing_scopes` with a same-Service composite FK. Existing invoices may also have a null scope link from the approved-quotation fallback era. Neither form is rewritten during void or supersede.

Current invoice/payment lifecycle limits are narrower than the planned ABS controls: invoice actions create a draft and issue it as `sent`; payment recording accepts only `sent`/`partial`, creates a `confirmed` payment, prevents overpayment, and updates the invoice to `partial`/`paid`. No invoice void/cancel/delete action or payment refund/reversal/delete action exists. TypeScript includes invoice `voided`, but the current DB status check does not. The current ABS trigger blocks void when applicable invoices are linked to that scope, not the broader Service-wide/payment-history policy locked below.

#### Critical risks and locked controls

| Risk | Locked control |
|---|---|
| Voiding the active scope reopens quotation fallback | Once a Service has ever had approved ABS authority, no-active-scope means billing blocked, not fallback. |
| New scope ignores old-scope invoices | Ceiling exposure is calculated Service-wide across all historical scope links and legacy null links. |
| New ceiling is below already invoiced value | Successor activation fails before changing either scope. |
| Historical invoices are detached or rewritten | Scope IDs, invoice snapshots, totals, statuses, and payment links remain unchanged. |
| Paid/partial invoices are treated as disposable | They remain applicable lifetime invoice exposure and immutable snapshots. |
| Two active scopes exist temporarily | One transaction locks the Service, retires the old active row, activates the successor, and commits both or neither. The partial unique index remains the backstop. |
| Failed activation retires the old scope | Any validation, update, or audit failure rolls back the whole RPC; the current active row remains active. |
| Discarding a successor changes authority | Existing draft discard removes only the draft/items; the active scope is untouched. |
| Browser controls financial state | Browser sends IDs, reason code, and note only. Actor, Service, active target, versions, snapshots, invoice exposure, ceiling, and timestamps are server/database-derived. |

#### Void policy

Void is a terminal withdrawal of the current billing authority, not a replacement workflow.

- Eligible scope: only the single active approved scope for the Service.
- Ineligible scope: draft, already voided, already superseded-derived, historical approved but inactive, missing, or cross-Service.
- Permission: `approvedBillingScopes:void`; current role truth grants it to Admin and Manager only.
- Required input: `scopeId`, one void reason code, and a non-empty trimmed note of at most 1000 characters.
- Reason codes: `service_cancelled`, `customer_withdrew_scope`, `approved_in_error`, `other`.
- Server fields: set `status = voided`, `voided_at = database transaction time`, `voided_by = actor Clerk user ID`, `void_reason = note`, and `updated_by = actor`. The reason code is written in the atomic audit details.
- Replacement: not required and not created. Void intentionally leaves no active authority and blocks future billing.
- Existing invoices/payments: never changed, deleted, detached, cancelled, refunded, or relinked.
- Repeated request: return `scope_already_voided`, make no write, and create no duplicate audit event.
- Superseded-derived target: return `scope_already_superseded`.

Applicable invoice means the current repository predicate: same Service, `status NOT IN ('cancelled','voided')`, `voided_at IS NULL`, and `is_deleted = false`. `voided` is present in TypeScript but is not currently accepted by the DB status check; this design does not authorize writing that invoice status.

| Service invoice/payment state | Void result | Reason |
|---|---|---|
| No invoice records and no payment records | Allow, subject to Service lifecycle eligibility | No financial snapshot or collection exposure exists. |
| Draft invoice | Block: `scope_void_financial_exposure` | Draft still consumes the current ceiling and is a preserved financial snapshot. |
| Sent/issued and unpaid invoice | Block: `scope_void_financial_exposure` | Issued invoice authority must not be withdrawn underneath it. |
| Partially paid invoice | Block: `scope_void_financial_exposure` | Invoice and confirmed payment must remain intact. |
| Paid invoice | Block: `scope_void_financial_exposure` | Paid invoice remains lifetime invoiced exposure. |
| Overdue invoice | Block: `scope_void_financial_exposure` | It is an active unpaid invoice. |
| Final invoice of any applicable status | Block: `scope_void_financial_exposure` | Invoice type does not reduce exposure. |
| Cancelled invoice only, no payment records | Exclude from applicable invoice total; allow if all other gates pass | Current billing predicates exclude `cancelled`. No cancellation action is claimed as implemented. |
| Soft-deleted invoice only, no payment records | Exclude from applicable invoice total; allow if all other gates pass | Current billing predicates exclude `is_deleted = true`. Financial deletion remains disallowed by product policy. |
| Any payment record linked to any Service invoice, including refunded/failed history | Block: `scope_void_financial_exposure` | Payments are append-only history; scope void must not imply payment reversal or erase exposure. |

#### Successor and supersede policy

Supersede is an explicit revision workflow. It does not mutate the active scope's financial content and does not use `status = superseded`.

1. Admin/Manager selects **Create successor draft** on the active scope and provides a supersede reason code and note.
   - Reason codes: `customer_scope_revision`, `commercial_scope_correction`, `approved_scope_correction`, `other`.
   - The note is trimmed, non-empty, and at most 1000 characters. Activation re-confirms the reason code/note; the final pair is recorded in the atomic activation audit.
2. A transactional clone uses the active ABS as the sole source. It copies Service/source-quotation IDs; source VAT, discount, currency, quotation totals, and pricing context; every source item snapshot; current decisions, accepted values, item reasons, and display order.
3. The clone receives a new ID and `scope_version = max(Service versions) + 1`, remains `status = draft`, resets line safety to `pending_review`, clears review/approval/void/supersede metadata, records creator/updater, and stores the note in `change_summary_reason` plus the full reason in audit details.
4. Exactly one successor draft may coexist with the active scope. Any draft for that Service blocks another with `scope_successor_exists`. Multiple concurrent successor drafts are not allowed.
5. Existing draft edit, line-safety review, and discard rules apply. Edits remain reductions-only against the immutable source quotation snapshots. Discard deletes only the draft and items and leaves the active scope unchanged.
6. Ordinary `approveApprovedBillingScope` continues to fail with `scope_active_conflict`. The only activation path is explicit **Approve and supersede** with `approvedBillingScopes:approve` and `approvedBillingScopes:supersede`.
7. Activation requires the successor to be the same-Service draft, Safe, internally consistent, positive, based on the same source quotation lineage, and to have an accepted grand total at least equal to Service-lifetime applicable invoice exposure.

Atomic transition:

- Lock Service row first, then lock old/new scope rows in deterministic ID order.
- Re-read Service lifecycle, active target, successor state, and lifetime invoice exposure under the lock.
- Set old scope `superseded_at = transaction time`, `superseded_by_scope_id = successor ID`, and `updated_by = actor`; old `status` remains `approved`.
- Set successor `status = approved`, `approved_at = same transaction time`, `approved_by = actor`, and `updated_by = actor`; successor `voided_*` and `superseded_*` remain null.
- Insert one atomic `audit_logs` `status_change` event with old/new scope IDs, Service ID, reason, actor, timestamp, and exposure.
- Commit all changes together. Any failure rolls back old scope, successor, and audit.

Display state remains derived: old approved row with non-null `superseded_at` displays **Superseded**; new approved row with null `voided_at`/`superseded_at` displays **Active**.

Repeat/conflict rules:

- Exact retry of an already completed old/new pair returns the existing successful result without another transition or audit row.
- Old scope already linked to a different successor returns `scope_already_superseded`.
- Successor not draft, not Safe, wrong Service/source lineage, voided, superseded, or otherwise inconsistent returns `scope_successor_invalid`.
- A different active scope or stale state returns `scope_concurrency_conflict`; ordinary approval retains `scope_active_conflict`.

#### Service-lifetime invoice ceiling

V1 selects option **B: total applicable invoices for the Service across all historical ABS records and legacy null-scope invoices**. Current-active-scope-only accounting is rejected because it permits double billing after supersede.

`lifetime_invoiced = SUM(invoices.grand_total)` for same-Service invoices where `status NOT IN ('cancelled','voided')`, `voided_at IS NULL`, and `is_deleted = false`, regardless of `approved_billing_scope_id`.

`remaining_billable = active_scope.accepted_grand_total - lifetime_invoiced`.

- Deposit and final invoices both count at persisted `grand_total`.
- Draft, sent, partial, paid, and overdue invoices count.
- Payments do not reduce invoiced exposure; they change collected/balance state only.
- Cancelled, validly voided, and soft-deleted invoices are excluded by the current predicate, but this design does not add or authorize invoice cancel/void/delete actions.
- Minimum successor ceiling equals `lifetime_invoiced`.
- Equal ceiling is valid and yields zero remaining billable; no further invoice may be created.
- Lower ceiling fails with `scope_successor_ceiling_below_invoiced`; no scope state changes.
- Historical invoice links and snapshots remain unchanged. Future invoices reference the new active successor.

Example: old ceiling SAR 10,000, applicable lifetime invoices SAR 6,000, successor ceiling SAR 8,000. Remaining billable is SAR 2,000, never SAR 8,000.

#### Approved-quotation fallback

| Service ABS history | Billing authority |
|---|---|
| Never had an approved/voided/superseded ABS and has no ABS rows | Approved quotation fallback allowed. |
| Draft-only, with no historical approved ABS | Approved quotation fallback remains allowed until first approval. Draft is not authority. |
| Active approved ABS | Active ABS required; fallback not allowed. New invoice must reference it. |
| Active ABS plus successor draft | Current active ABS remains authority until atomic activation succeeds. |
| Approved ABS voided, no active scope | Billing blocked; fallback must not resume. |
| Superseded old scope plus active successor | Active successor is authority. |
| Historical approved/voided/superseded records but no active scope | Billing blocked as an authority gap; fallback must not resume. |

The invoice action and DB trigger must distinguish **never established ABS authority** from **established authority with no active scope**. The existing fallback behavior is working legacy behavior, not the locked post-void behavior.

#### Backend boundary and migration requirement

Safe V1 requires a reviewed migration and transactional RPCs; app-layer direct multi-step updates are rejected.

- Add service-role-only RPCs for successor-draft clone, void, and successor activation. Permission checks occur in server actions before creating the service-role client or invoking an RPC.
- Keep `REVOKE EXECUTE` from `PUBLIC`, `anon`, and `authenticated`; grant only `service_role`.
- Revise `check_invoices_before_write` so active invoice inserts/updates: lock the Service; require the current active scope link when one exists; use Service-lifetime exposure; and reject quotation fallback when historical ABS authority exists without an active scope.
- Revise `check_approved_billing_scopes_before_write` to support only the controlled transactional supersede ordering while preserving approved-field immutability, one-active uniqueness, and lifetime ceiling validation.
- Preserve the partial unique active-scope index as the final invariant backstop.
- All invoice creation and lifecycle RPCs acquire the same Service row lock first. Scope rows follow in deterministic ID order. This serializes invoice creation against void/supersede activation.
- Stable RPC return codes are mapped by server actions; raw constraint/trigger text never reaches the UI.
- Failure at validation, scope update, invoice check, or audit insert rolls back the transaction.

#### Service lifecycle

Current Service statuses are `Inquiry`, `Quoted`, `Approved`, `Deposit Paid`, `In Progress`, `Completed`, and `Cancelled`; current terminal states are `Completed` and `Cancelled`.

| Service state | Void | Create/activate successor |
|---|---|---|
| Inquiry, Quoted, Approved, Deposit Paid, In Progress | Allow if all financial/state gates pass | Allow if all state/ceiling gates pass |
| Completed | Block `scope_service_lifecycle_ineligible` | Block `scope_service_lifecycle_ineligible` |
| Cancelled | Allow only to withdraw a still-active scope when financial exposure is zero | Block `scope_service_lifecycle_ineligible` |
| Missing or `deleted_at` set | Block `scope_service_lifecycle_ineligible` | Block `scope_service_lifecycle_ineligible` |

This intentionally differs from draft-create's blanket terminal gate: a Cancelled Service may need its unused active authority closed, but it must never receive a successor or resume billing.

#### Permissions and audit

| Capability | Permission | Roles |
|---|---|---|
| View scope/history | `approvedBillingScopes:read` | Admin, Manager, Accountant |
| Create successor draft | `approvedBillingScopes:create` + `approvedBillingScopes:supersede` | Admin, Manager |
| Void | `approvedBillingScopes:void` | Admin, Manager |
| Activate successor | `approvedBillingScopes:approve` + `approvedBillingScopes:supersede` | Admin, Manager |
| No ABS access | none | Viewer, Sales, Operations |

Each successor-create, successor-discard, void, and supersede event must expose user-visible history while preserving Accountant masking of internal notes/reasons. Atomic audit details include actor, role, database timestamp, reason code, note, Service ID, source/old scope ID, successor scope ID when present, source quotation ID, old/new ceilings, applicable invoice count and amount, payment-record count, and outcome. Existing `audit_logs.action = status_change` and JSON `details` can hold this without inventing an implemented action; future SQL review must verify the exact contract.

#### Future UI state model

- Keep **Void** and **Create successor draft / Approve and supersede** as separate actions.
- Active card shows ceiling, Service-lifetime invoiced amount, remaining billable, and successor-draft indicator.
- Void confirmation states that future billing will stop and quotation fallback will not resume; show invoice/payment exposure and the exact blocked reason.
- Successor flow shows old ceiling, proposed ceiling, lifetime invoiced, minimum allowed ceiling, projected remaining, source version, and immutable historical-invoice warning.
- Blocked states use stable localized messages, not raw SQL. Money/IDs remain LTR-isolated with Western digits and SAR formatting.
- English and Arabic dictionaries must cover action names, confirmations, reason codes, exposure warnings, zero-remaining state, and every stable error. Accountant history masks reason/note text.

#### Stable errors

Retain existing applicable codes: `scope_not_found`, `scope_not_draft`, `scope_not_safe`, `scope_active_conflict`, `scope_concurrency_conflict`, `scope_no_items`, `scope_no_billable_items`, `scope_reduction_invalid`, `scope_reason_required`, `scope_service_lifecycle_ineligible`, `scope_permission_denied`, `scope_supersede_service_mismatch`, and `scope_unexpected_error`.

For lifecycle actions, missing/blank reason code or note maps to the existing `scope_reason_required`; field-level Zod messages may remain more specific.

Add only:

- `scope_not_active`
- `scope_already_voided`
- `scope_already_superseded`
- `scope_void_financial_exposure`
- `scope_successor_exists`
- `scope_successor_invalid`
- `scope_successor_ceiling_below_invoiced`

Invoice creation reuses the existing sanitized `billing_scope_inactive` result for an established-authority gap. `scope_void_invoices_exist` and `scope_not_approved` are rejected as redundant with `scope_void_financial_exposure` and `scope_not_active`.

#### Options rejected

| Decision | Rejected option | Reason | V1 selection |
|---|---|---|---|
| Void outcome | Resume approved-quotation fallback | Silently reopens billing | Block future billing; no replacement required |
| Void with invoices | Permit by invoice/payment status | Creates inconsistent authority and snapshot treatment | Block on any applicable invoice or any payment history |
| Successor source | Re-copy live quotation or accept browser totals | Loses current accepted baseline or trusts mutable input | Transactional clone of active ABS |
| Successor activation | App-layer sequential updates | Can leave no active scope or race invoice creation | Transactional RPC plus Service lock and DB guards |
| Ceiling exposure | Current scope link only | Allows old invoices to be ignored | Service-lifetime applicable invoices |
| Superseded representation | New DB status | Conflicts with locked enum/model | Approved status plus superseded timestamp/link |

#### Ordered implementation decomposition

1. `ABS-MGMT-FINANCIAL-LIFECYCLE-MIGRATION-PREFLIGHT-1`: inspect current live/schema function bodies, grants, constraints, data-shape assumptions, and audit-log compatibility; propose SQL only.
2. Review the migration/RPC SQL for successor clone, void, atomic activation, invoice fallback/ceiling trigger revisions, grants, idempotency, and rollback behavior.
3. Create a new forward-only migration after SQL approval; do not edit applied migrations.
4. Apply and verify in DEV/DEMO only through a separately authorized task.
5. Implement server actions, schemas, stable errors, and executable tests; permission before service-role client.
6. Implement permission-gated read/history exposure and Service-lifetime financial display.
7. Implement Void UI and bilingual blocked-state/confirmation copy.
8. Implement successor draft and atomic Approve-and-supersede UI.
9. Run Mozfer manual browser smoke for roles, EN/AR, races/retries, zero/equal/below ceiling, fallback block, and immutable history.
10. Synchronize docs, then use separate controlled commit and push tasks.

**Next active task after this design is committed:** `ABS-MGMT-FINANCIAL-LIFECYCLE-MIGRATION-PREFLIGHT-1`.

---

## 5. Bilingual and responsive requirements

- Arabic RTL + English LTR; 320px–desktop.
- Item tables may use bounded local horizontal scroll; page must not H-scroll.
- Essential CTAs reachable on mobile; money/IDs LTR-isolated.
- Use existing `services` dictionary ABS copy; do not translate stored business text.
- Responsive P0 body-overflow remediation is implemented; manual re-smoke is **PASS by Mozfer manual browser evidence**. Flag **`RESPONSIVE_CORE_P0_MANUAL_SMOKE_PENDING` is closed** (no longer unresolved/active). Agent did **not** perform browser smoke.

---

## 6. Locked implementation order

### Ready to implement (existing backend)

1. **`ABS-MGMT-UI-READ-ENRICH-1`** — enrich Service card (source QT label, invoiced/remaining, draft badge); optional history count. **complete**
2. **`ABS-MGMT-UI-DRAFT-CREATE-1`** — create-draft CTA + error handling. **complete; pushed on main**
3. **`ABS-MGMT-UI-DRAFT-EDIT-1`** — draft item edit + discard. **complete; pushed on main in `df7cf1e9ef9d5302162735bcc87a8aa567385073`**
4. **`ABS-MGMT-UI-REVIEW-APPROVE-1`** — line-safety review + approve. **complete and pushed in `d8b654f2c89622837b75531aa44d79a66e024ad8`**

### Design gate complete; implementation still requires migration preflight

5. **`ABS-MGMT-FINANCIAL-LIFECYCLE-MIGRATION-PREFLIGHT-1`** — inspect and propose the required RPC/trigger migration (**next active task after design commit**)
6. **`ABS-MGMT-VOID-ACTION-1`** — implement only after reviewed migration/RPC apply and verification
7. **`ABS-MGMT-SUPERSEDE-ACTION-1`** — implement successor draft + activation only after reviewed migration/RPC apply and verification

### Optional later

- **`ABS-MGMT-HISTORY-LIST-1`** — full history list UI

**Current active task (exactly one):** `ABS-MGMT-FINANCIAL-LIFECYCLE-DESIGN-COMMIT-1`

---

## 7. Explicit exclusions

- SQL apply / production migration claims
- Supplier full-page redesign
- Reports Center
- PDF body / Clerk widgets / invoice export implementation
- Financial lifecycle outside ABS management
- Responsive smoke re-execution (closed: **PASS by Mozfer manual browser evidence**)
- Arbitrary add/remove ABS lines after create (unsupported)

---

## 8. Related documents

- Runtime product lock: `docs/approved-billing-scope-runtime-decisions.md`
- Schema notes: `docs/database-schema.md`
- Status/roadmap: `docs/project-status.md`, `docs/project-roadmap.md`
- Deferred flags: `docs/deferred-decisions.md`
