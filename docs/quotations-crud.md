# Quotations CRUD

## Overview

Quotations are Service-scoped commercial documents for client proposals. Each quotation belongs to one Service, a Service may have multiple quotations, and customer identity is derived server-side from that Service where the relationship is used.

Quotation items retain their existing description, details, category, quantity, unit price, calculated line VAT amount, and calculated line net total while W2A adds bounded commercial semantics: customer-priced Authority Lines, zero-priced Included Components, and selected Optional Add-ons with parent-line, unit, selection, and Arabic presentation metadata. Existing flat rows remain valid Authority Lines; no parallel commercial engine is introduced.

## Quotation Number Format

**Format:** `QT-YYYY-XXXX`

- **Prefix:** `QT` (standardized from original `QUO` to match UI conventions)
- **Year:** 4-digit current year
- **Sequence:** 4-digit zero-padded, auto-incrementing per year
- **Example:** `QT-2026-0001`, `QT-2026-0002`

Generated server-side by the `generate_document_number('quotation')` PostgreSQL function. The client never generates or suggests a quotation number.

### Sequence Gaps

The `generate_document_number` function runs **inside** the RPC transaction. If the RPC raises an exception and rolls back, the `number_sequences` update rolls back too — **no number is consumed**.

However, gaps **can** occur in these scenarios:
- A manual `SELECT generate_document_number('quotation')` executed directly in the SQL Editor will consume a number if the SQL Editor auto-commits.
- Future workflows (e.g., separate transaction for number reservation) might introduce gaps.

Gaps are acceptable for quotations. ZATCA e-invoicing requirements apply only to tax invoices, not quotations. Gapless numbering is not required.

```
QT-2026-0001 ✓ created
QT-2026-0002 ✓ created (no gap from failed RPC — it rolled back)
QT-2026-0003 ✗ consumed by manual SQL Editor SELECT (gap)
QT-2026-0004 ✓ created
```

## Status Flow

```
draft → sent → approved
                └→ rejected
                └→ expired
```

**Canonical status values:** `draft`, `sent`, `approved`, `rejected`, `expired`

> **Note:** The canonical term is `approved`, not `accepted`. All code (TypeScript types, schema CHECK constraint, mock data, StatusBadge component) consistently uses `approved`.

- **draft**: Initial state. Full editing allowed (items, totals, metadata).
- **sent**: Quotation delivered to client. No item edits allowed.
- **approved**: Client accepted. Locked.
- **rejected**: Client declined. Locked.
- **expired**: Past valid_until date. Locked.

### Quotation Status Integration & Revision Notes
- The current guard remains: one approved quotation per Service.
- Approved Billing Scope separates quotation approval from billing authority.
- The foundation migration for Approved Billing Scope has now been applied and smoke-tested on the Owner-authorized DEV environment only; no DEMO environment currently exists and production remains deferred.
- **W2B Quotation Revision Lineage:** No `superseded` quotation status is introduced. Draft quotations remain editable in place. A non-approved `sent`, `rejected`, or `expired` quotation is revised through the service-role-only `create_quotation_revision` RPC, which creates a new Draft in the same internal family and leaves the source unchanged. Approved sources fail closed; post-approval Change Orders remain deferred.
- Customer-facing quotation numbering and main-list presentation remain unchanged. W2B does not supersede ABS, reapprove authority, or rewrite invoices, payments, or historical records.
- **Current truth:** Invoice creation resolves and binds the active Approved Billing Scope when one exists. When no active scope exists, the approved quotation remains the fallback basis only when ABS history is proven empty (legacy mode). Historical ABS authority blocks Quotation fallback.

### Billing Authority Presentation (display-only)

Quotation Detail may show a **display-only** billing-authority card (`QuotationBillingAuthorityCard` / `buildQuotationBillingAuthority`). This is presentation, not mutation.

- Quotation detail does **not** create Deposit or Final Invoices and has no Deposit/Final mutation CTAs.
- **Open Service billing** (or equivalent) is navigation only to the linked Service Detail billing surface.
- Invoice mutation authority remains on **Service Detail** (permission-, lifecycle-, authority-, and exposure-gated).
- Authority modes presented: `active_abs`, `historical_abs_only`, `legacy_quotation`, `no_authority`, `unavailable`.
- Active ABS can override the Quotation total as the billing ceiling.
- Historical ABS blocks legacy Quotation fallback; legacy Quotation authority requires zero ABS history.
- Zero amounts and unavailable financial evidence remain distinct (authoritative money helpers).
- English and Arabic labels are supported through the quotations dictionary.
- This subsection does not change Quotation CRUD, soft-delete, RPC math, or approval rules above.

### Editing Rules

| Status    | Edit Items/Totals | Edit Metadata | Soft Delete |
|-----------|-------------------|---------------|-------------|
| draft     | ✓                 | ✓ (permitted quotation metadata only) | ✓           |
| sent      | ✗                 | ✗             | ✗ (revise to Draft successor) |
| approved  | ✗                 | ✗             | ✗           |
| rejected  | ✗                 | ✗             | ✗ (revise to Draft successor) |
| expired   | ✗                 | ✗             | ✗ (revise to Draft successor) |

## Approval and billing handoff

- Create and update require `quotations:write` plus the Service read boundary; approval and rejection require `quotations:approve`.
- Approval is an atomic server-side contract that moves the quotation to `approved` and activates the internal Approved Billing Scope result when the contract succeeds. A successful approval is not a client-side status toggle.
- Approved quotation authority feeds the Service billing / Approved Billing Scope handoff. Invoice mutation remains on the Service billing surface, and active Approved Billing Scope authority or proven legacy fallback determines the billing ceiling.
- The approval contract and financial lifecycle preserve replay safety, safe error mapping, and post-approval restrictions; this document does not reopen those contracts.

## Database Design

### `quotations` Table

| Column             | Type           | Notes                                      |
|--------------------|----------------|--------------------------------------------|
| id                 | uuid           | Primary key                                |
| quotation_number   | text           | Unique, auto-generated (`QT-YYYY-XXXX`)   |
| service_id         | uuid           | Required FK → services; quotation authority is Service-scoped |
| customer_id        | uuid           | Related customer/reporting field; derived server-side from Service |
| event              | text           | Event name                                 |
| date               | date           | Issue date                                 |
| valid_until        | date           | Expiry date                                |
| subtotal           | numeric(12,2)  | Sum of all item totals (server-calculated) |
| discount           | numeric(12,2)  | Flat discount amount (SAR)                 |
| vat_rate           | numeric(5,2)   | Snapshot of the authoritative VAT % at creation (currently 0 in `not_registered` mode; CHECK 0–100) |
| vat_amount         | numeric(12,2)  | (subtotal - discount) × (vat_rate / 100)   |
| grand_total        | numeric(12,2)  | (subtotal - discount) + vat_amount         |
| status             | text           | draft/sent/approved/rejected/expired       |
| created_by         | text           | Clerk user ID                              |
| updated_by         | text           | Clerk user ID                              |
| is_deleted         | boolean        | Soft delete flag                           |
| deleted_at         | timestamptz    | Soft delete timestamp                      |
| quotation_family_id | uuid           | Internal family key; existing rows default to a new revision-1 family |
| revision_of_quotation_id | uuid      | Immediate prior quotation in the same family; null for the root |
| revision_number    | integer        | Positive family revision; root defaults to `1` |
| revision_reason    | text           | Required bounded reason on a successor Draft |

### `quotation_items` Table

| Column      | Type           | Notes                                              |
|-------------|----------------|----------------------------------------------------|
| id          | uuid           | Primary key                                        |
| quotation_id| uuid           | FK → quotations (ON DELETE CASCADE)                |
| description | text           | Service/item name                                  |
| details     | text           | Optional detailed description                      |
| category    | text           | Service category (Production, A/V Tech, etc.)      |
| qty         | numeric(12,2)  | Quantity (must be > 0)                             |
| unit_price  | numeric(12,2)  | Price per unit (must be >= 0)                      |
| vat         | numeric(12,2)  | **Calculated VAT amount** per line (NOT a rate)    |
| total       | numeric(12,2)  | Line net total: `qty × unit_price` (before VAT)   |
| commercial_role | text        | `authority_line`, `included_component`, or `optional_add_on` |
| parent_authority_line_id | uuid | Same-quotation parent Authority Line for components/add-ons |
| is_selected | boolean        | Selection state; Included Components must be selected |
| unit        | text           | Bounded unit label                                |
| description_ar | text        | Arabic presentation for the same commercial authority |

### Column Clarifications

#### `quotation_items.total`
Stores the **line net total before VAT**: `qty × unit_price`. It does **not** include VAT. VAT is stored separately in `quotation_items.vat`.

#### `quotation_items.vat`
Stores the **calculated VAT amount** for the line item in SAR, NOT a VAT rate percentage. It is computed server-side with proportional discount allocation:

```
item_discount = discount × (item.total / subtotal)
item_taxable  = item.total - item_discount
item.vat      = item_taxable × (vat_rate / 100)
```

When `subtotal = 0`, all items have `total = 0`, so `vat = 0` (safe division avoided).

This ensures: **Σ(quotation_items.vat) = quotations.vat_amount** exactly. A residual adjustment is added to the largest item after rounding to resolve any discrepancies.

### `vat_rate` Snapshot

The `quotations.vat_rate` column captures the exact VAT percentage used when the quotation was created. Current Company Settings mode is `not_registered`, so current quotation creation and update derive a zero VAT rate from authoritative Company Settings/server/database rules. Existing quotations retain their original rate if a future approved registered-mode configuration changes the default.

## VAT and Discount Calculation

### Current `not_registered` Behavior

Current quotation VAT is zero. No VAT 15%, VAT number, Tax Invoice, ZATCA, FATOORA, QR, or XML behavior is enabled while Company Settings remains `not_registered`.

The current approval-to-Approved-Billing-Scope contract rejects positive quotation discounts with `scope_discount_not_supported`; quotation discount math remains documented here, but discounted approved billing is not a current supported authority path.

### Future Registered-Mode Formula

The generic percentage formula below is future registered-mode guidance only; it does not describe the current `not_registered` quotation behavior.

### Financial Formula

```
1. Per item:
   item.total     = qty × unit_price           (line net, before VAT)
   item_discount  = discount × (item.total / subtotal)   (proportional share)
   item_taxable   = item.total - item_discount
   item.vat       = item_taxable × (vat_rate / 100)

2. Quotation level:
   subtotal       = Σ(item.total)
   taxable_amount = subtotal - discount
   vat_amount     = taxable_amount × (vat_rate / 100)
   grand_total    = taxable_amount + vat_amount
```

### Why Proportional Discount?

A flat discount must be distributed across line items so that each item's VAT reflects its fair share of the discount. Without this, `Σ(item.vat)` would not match `quotations.vat_amount`, causing inconsistency in financial reports and PDF generation.

## Atomic RPC Functions

All quotation creation and editing is performed through PostgreSQL RPC functions to guarantee:
1. **Atomicity**: Quotation + items are inserted/updated in a single transaction.
2. **Server-side math**: All financial totals are calculated in PostgreSQL, never trusted from the client.
3. **Auto-numbering**: Quotation numbers are generated inside the transaction.

### `create_quotation_with_items(p_quotation, p_items, p_user_id)`

**Returns:** `TABLE(quotation_id uuid, quotation_number text, subtotal numeric, discount numeric, vat_amount numeric, grand_total numeric)`

**Input validations:**
- `p_user_id` not null/empty
- `p_quotation` must be a JSON object
- `p_items` is a JSON array with at least one element
- `event` is required
- `date` is required
- `service_id` is required, identifies an existing eligible Service, and supplies the related customer identity server-side
- `qty > 0` per item
- `unit_price >= 0` per item
- `discount >= 0` and `discount <= subtotal`
- `vat_rate` between 0 and 100
- `valid_until >= date` if both provided

**Two-pass item processing:**
1. **Pass 1**: Insert items with `vat = 0`, compute subtotal.
2. **Pass 2**: Update item VAT using proportional discount allocation (requires subtotal).

### `update_quotation_with_items(p_quotation_id, p_quotation, p_items, p_user_id)`

**Returns:** Same `TABLE` structure as create.

**Additional validations:**
- Quotation must exist and not be deleted
- Status must be `draft` (non-draft quotations are locked)

**Behavior:**
- Draft update may edit permitted quotation metadata and items; Service linkage and derived customer identity remain server-validated.
- If `vat_rate` is omitted, it keeps its existing value
- Deletes all existing items for the quotation
- Re-inserts new items using the same two-pass approach
- Recalculates all totals server-side
- Updates `updated_by = p_user_id`

### RPC Security

Both functions use **SECURITY INVOKER** (PL/pgSQL default). They do NOT use SECURITY DEFINER.

Access is restricted to `service_role` only:
- `REVOKE EXECUTE FROM PUBLIC, anon, authenticated`
- `GRANT EXECUTE TO service_role`

**Why this is safe:** The `service_role` bypasses RLS natively, so the RPCs can read/write all tables without needing SECURITY DEFINER. Browser-side PostgREST calls (using `anon` or `authenticated`) will receive a permission denied error, preventing direct RPC invocation from the client.

## RBAC

| Permission          | Roles                          |
|---------------------|--------------------------------|
| `quotations:read`   | admin, manager, sales, operations, accountant, viewer |
| `quotations:write`  | admin, manager, sales          |
| `quotations:approve` | admin, manager                 |

All Server Actions call `requirePermission()` from `src/lib/auth/permissions.ts` before invoking RPC.

## Client-Side Preview

The UI may calculate totals for **preview purposes only** during form editing. These previews must:
- Use the same formula: `vat_amount = (subtotal - discount) × (vat_rate / 100)`
- Be clearly marked in code: `CLIENT-SIDE PREVIEW ONLY — PostgreSQL RPC is the source of truth`
- Never be sent to the server as trusted financial values

## Soft Delete

Soft delete is handled via a standard Server Action (not RPC):
- Sets `is_deleted = true`, `deleted_at = now()`
- Sets `updated_by` to current Clerk user ID
- Requires `requirePermission("quotations:write")`
- Does **not** hard-delete `quotation_items` (preserved for audit)

## ZATCA Note

Quotations are **not** subject to ZATCA e-invoicing requirements. ZATCA compliance applies only to tax invoices and credit/debit notes. No ZATCA-specific XML, QR codes, or UUIDs are needed for quotations.
