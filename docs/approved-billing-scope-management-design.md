# Approved Billing Scope Management Design

**Task:** `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-1`

**Docs sync:** `APPROVED-BILLING-SCOPE-MANAGEMENT-DESIGN-DOCS-SYNC-1`

**Status:** Design locked for implementation slicing (not fully implemented)

**Related runtime lock:** `docs/approved-billing-scope-runtime-decisions.md`

This document is the **current** product/technical management design for Service-scoped Approved Billing Scope (ABS) UI and write workflow. It is grounded in repository source as of HEAD `2944870`. Historical ABS milestones may predate this file; prefer this document for “what is ready vs missing” and slice order.

---

## 1. Capability matrix (source-grounded)

| Capability | UI | Server | DB | Permission | Status |
|------------|----|--------|-----|------------|--------|
| View active approved scope | Service card + nested detail (read-enrich) | list / getActive / getById | `approved_billing_scopes` | `approvedBillingScopes:read` | **READY** (read UI) |
| View draft scope | Detail by id; card primary when no active | list / get | `status=draft` | read | **READY** (read UI) |
| View historical / voided / superseded | Detail by id; card history/other counts + display state | list for service | `voided_at`, `superseded_at` | read | **READY** (read UI; no full history page) |
| Create draft from approved quotation | Service card Create Draft action + nested detail navigation | `createApprovedBillingScopeDraft` | inserts + constraints | create | **READY** (source implemented; Mozfer smoke PASS; pushed on main) |
| Edit draft item (decision/qty/price/reason) | Draft detail page + bordered item editor | `editApprovedBillingScopeItem` + item-edit RPC | draft-only | update | **READY** (source implemented; Mozfer smoke PASS; commit/push pending) |
| Discard draft | Draft detail page + discard confirmation | `discardApprovedBillingScopeDraft` + discard RPC | draft cleanup | discard | **READY** (source implemented; Mozfer smoke PASS; commit/push pending) |
| Line-safety review | **None** | `reviewApprovedBillingScopeLineSafety` | header fields | review | **PARTIAL** |
| Approve / activate draft | **None** | `approveApprovedBillingScope` | `status→approved`; one-active guard | approve | **PARTIAL** |
| Add/remove items after create | **None** | **None** | items only from quotation snapshot | — | **MISSING** / **DEFERRED** |
| Calculate / store ceiling totals | Server at create/edit/approve | recalculate header/items | totals columns | — | **READY** |
| Display invoiced amount on ABS card | Service card (gated) | `getServiceBillingState` prior total | invoices FK | `invoices:read` | **READY** (read UI; hidden/restricted without permission) |
| Display remaining billable | Service card (gated) | `getServiceBillingState` remaining | active scope or QT fallback | `invoices:read` | **READY** (read UI; uses server contract) |
| Source quotation snapshot | Stored on create | create path | source_* columns | — | **READY** |
| Prevent invoices above ceiling | Invoice create + DB trigger | invoice actions | FK + triggers | invoices:write | **READY** |
| Legacy service without active scope | Invoice/billing fallback | quotation grand total | `approved_billing_scope_id` null | — | **READY** |
| Void approved scope | **None** | **No action** (schema only) | `voided_*` columns | void | **MISSING** |
| Supersede active with new approved | **None** | **No action** (schema only) | `superseded_*` columns | supersede | **MISSING** |

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
| ABS fully managed in CRM UI | **Read-enrichment + Create Draft + Draft Edit/Discard implemented in source**; review/approve/void/supersede UI is not implemented |

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

- **Source implemented; automated validation passed; PASS by Mozfer manual browser evidence.** Current source remains uncommitted and unpushed until the controlled commit/push tasks run.
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
2. **Draft edit (missing UI):** per-item decision/qty/price/reason via `editApprovedBillingScopeItem`; non-optimistic; financial edit → `pending_review`.
3. **Discard (missing UI):** confirm → `discardApprovedBillingScopeDraft` (draft only).
4. **Line safety (missing UI):** Admin/Manager → `reviewApprovedBillingScopeLineSafety` (`safe`/`unsafe` + reasons).
5. **Approve (missing UI):** confirm → `approveApprovedBillingScope`; fails if active exists (`scope_active_conflict`); no silent supersede.
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
2. No active scope → legacy approved-quotation total fallback (current invoice/billing behavior).
3. Existing invoices are never rewritten by scope edits/approve/void/supersede.
4. Draft edits never mutate issued invoice snapshots.
5. One active scope per service (DB partial unique + approve guard).
6. Reductions-only item decisions; line safety required before approve.
7. Hard delete only for **draft discard**; no hard delete of approved/voided financial history.
8. Western digits / SAR via shared formatters; no Tax Invoice / ZATCA / FATOORA / QR / XML claims.
9. Service remains operational core; flow Customer → Service → Quotation → Invoice → Payment.

### Durable flag — void/supersede financial behavior

**`ABS_VOID_SUPERSEDE_FINANCIAL_BEHAVIOR_PENDING`**

Before implementing void or supersede:

- Define whether voiding the **active** scope blocks new invoicing, restores quotation fallback, or requires another explicit authority.
- Define atomic supersede after **partial invoicing** (future invoices only; historical invoices keep original `approved_billing_scope_id`).
- Confirm whether a migration/RPC is required for atomic supersede.
- Ordinary approve must **not** auto-supersede.
- Existing invoices remain linked and immutable.

**Do not** treat slices `ABS-MGMT-VOID-ACTION-1` / `ABS-MGMT-SUPERSEDE-ACTION-1` as implementation-ready until this flag is resolved.

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
3. **`ABS-MGMT-UI-DRAFT-EDIT-1`** — draft item edit + discard. **complete; source implemented and manually accepted; current source remains uncommitted and unpushed**
4. **`ABS-MGMT-UI-REVIEW-APPROVE-1`** — line-safety review + approve **← current active task**

### Blocked until financial behavior decision + action design

5. **`ABS-MGMT-VOID-ACTION-1`** — implement void action + UI (**blocked**)
6. **`ABS-MGMT-SUPERSEDE-ACTION-1`** — implement supersede action + UI (**blocked**)

### Optional later

- **`ABS-MGMT-HISTORY-LIST-1`** — full history list UI

**Current active implementation task (exactly one):** `ABS-MGMT-UI-REVIEW-APPROVE-1`

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
