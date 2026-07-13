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
| View active approved scope | Service card + nested detail | list / getActive / getById | `approved_billing_scopes` | `approvedBillingScopes:read` | **PARTIAL** |
| View draft scope | Detail by id; card only if selected as “current” | list / get | `status=draft` | read | **PARTIAL** |
| View historical / voided / superseded | Detail by id; card “other count” only | list for service | `voided_at`, `superseded_at` | read | **PARTIAL** |
| Create draft from approved quotation | **None** | `createApprovedBillingScopeDraft` | inserts + constraints | create | **PARTIAL** (server READY, UI MISSING) |
| Edit draft item (decision/qty/price/reason) | **None** | `editApprovedBillingScopeItem` + item-edit RPC | draft-only | update | **PARTIAL** |
| Discard draft | **None** | `discardApprovedBillingScopeDraft` + discard RPC | draft cleanup | discard | **PARTIAL** |
| Line-safety review | **None** | `reviewApprovedBillingScopeLineSafety` | header fields | review | **PARTIAL** |
| Approve / activate draft | **None** | `approveApprovedBillingScope` | `status→approved`; one-active guard | approve | **PARTIAL** |
| Add/remove items after create | **None** | **None** | items only from quotation snapshot | — | **MISSING** / **DEFERRED** |
| Calculate / store ceiling totals | Server at create/edit/approve | recalculate header/items | totals columns | — | **READY** |
| Display invoiced amount on ABS card | **No** (billing panel separate) | invoice queries / billing-state | invoices FK | invoices:read / billing | **PARTIAL** |
| Display remaining billable | Billing panel via `getServiceBillingState` | ceiling − prior invoices | active scope or QT fallback | — | **PARTIAL** (not on ABS card) |
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
| ABS fully managed in CRM UI | **Read-oriented UI only** (card + read-only detail); write CTAs not shipped |

Historical milestone notes elsewhere may still mention planned void/supersede; treat those as historical unless labeled current.

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
| Approved QT, no scope | Legacy: invoices use QT total | Create draft (`create`) |
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
`scope_not_found`, `scope_not_draft`, `scope_not_safe`, `scope_active_conflict`, `scope_concurrency_conflict`, `scope_no_items`, `scope_no_billable_items`, `scope_reduction_invalid`, `scope_reason_required`, `scope_duplicate_draft`, `scope_permission_denied`, `scope_unexpected_error`, plus invoice ceiling codes.

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
- Do **not** reopen responsive smoke: preserve **`RESPONSIVE_CORE_P0_MANUAL_SMOKE_PENDING`**.

---

## 6. Locked implementation order

### Ready to implement (existing backend)

1. **`ABS-MGMT-UI-READ-ENRICH-1`** — enrich Service card (source QT label, invoiced/remaining, draft badge); optional history count. **← current active task**
2. **`ABS-MGMT-UI-DRAFT-CREATE-1`** — create-draft CTA + error handling
3. **`ABS-MGMT-UI-DRAFT-EDIT-1`** — draft item edit + discard
4. **`ABS-MGMT-UI-REVIEW-APPROVE-1`** — line-safety review + approve

### Blocked until financial behavior decision + action design

5. **`ABS-MGMT-VOID-ACTION-1`** — implement void action + UI (**blocked**)
6. **`ABS-MGMT-SUPERSEDE-ACTION-1`** — implement supersede action + UI (**blocked**)

### Optional later

- **`ABS-MGMT-HISTORY-LIST-1`** — full history list UI

**Current active implementation task (exactly one):** `ABS-MGMT-UI-READ-ENRICH-1`

---

## 7. Explicit exclusions

- SQL apply / production migration claims
- Supplier full-page redesign
- Reports Center
- PDF body / Clerk widgets / invoice export implementation
- Financial lifecycle outside ABS management
- Responsive smoke execution
- Arbitrary add/remove ABS lines after create (unsupported)

---

## 8. Related documents

- Runtime product lock: `docs/approved-billing-scope-runtime-decisions.md`
- Schema notes: `docs/database-schema.md`
- Status/roadmap: `docs/project-status.md`, `docs/project-roadmap.md`
- Deferred flags: `docs/deferred-decisions.md`
