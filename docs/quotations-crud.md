# Quotations CRUD

## Overview

Quotations are the primary document for client proposals at G7 Blue. Each quotation contains header-level metadata (client, event, dates) and one or more line items (services, rentals, equipment).

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

### Editing Rules

| Status    | Edit Items/Totals | Edit Metadata | Soft Delete |
|-----------|-------------------|---------------|-------------|
| draft     | ✓                 | ✓ (inc. customer) | ✓           |
| sent      | ✗                 | ✗             | ✓           |
| approved  | ✗                 | ✗             | ✗           |
| rejected  | ✗                 | ✗             | ✓           |
| expired   | ✗                 | ✗             | ✓           |

## Database Design

### `quotations` Table

| Column             | Type           | Notes                                      |
|--------------------|----------------|--------------------------------------------|
| id                 | uuid           | Primary key                                |
| quotation_number   | text           | Unique, auto-generated (`QT-YYYY-XXXX`)   |
| customer_id        | uuid           | FK → customers                             |
| event              | text           | Event name                                 |
| date               | date           | Issue date                                 |
| valid_until        | date           | Expiry date                                |
| subtotal           | numeric(12,2)  | Sum of all item totals (server-calculated) |
| discount           | numeric(12,2)  | Flat discount amount (SAR)                 |
| vat_rate           | numeric(5,2)   | Snapshot of VAT % at creation (default 15, CHECK 0–100) |
| vat_amount         | numeric(12,2)  | (subtotal - discount) × (vat_rate / 100)   |
| grand_total        | numeric(12,2)  | (subtotal - discount) + vat_amount         |
| status             | text           | draft/sent/approved/rejected/expired       |
| created_by         | text           | Clerk user ID                              |
| updated_by         | text           | Clerk user ID                              |
| is_deleted         | boolean        | Soft delete flag                           |
| deleted_at         | timestamptz    | Soft delete timestamp                      |

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

The `quotations.vat_rate` column captures the exact VAT percentage used when the quotation was created. If company settings change the default VAT rate later, existing quotations retain their original rate. This ensures financial accuracy and auditability.

## VAT and Discount Calculation

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
- `customer_id` is required, exists, and is not deleted
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
- Draft update may edit customer metadata
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
