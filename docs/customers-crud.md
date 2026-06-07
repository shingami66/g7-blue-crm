# Customers CRUD Documentation

## Overview

The Customers module connects the G7 BLUE CRM `/customers` page to Supabase,
replacing the previous static mock data with real database operations.

All write operations (create, update, delete) are protected by Clerk
authentication. The Supabase admin client (service role key) is used
server-side only.

---

## Architecture

```
┌──────────────────────────────────────────────┐
│  Browser (Client Component)                  │
│  CustomersClient.tsx                         │
│    ├─ Table, Filters, Side Panel             │
│    ├─ Add Customer Modal                     │
│    ├─ Edit Customer Modal                    │
│    └─ Delete Confirmation Modal              │
└───────────────┬──────────────────────────────┘
                │ Server Action (FormData)
                ▼
┌──────────────────────────────────────────────┐
│  Server Actions (src/lib/customers/actions.ts)│
│    1. auth() → verify Clerk userId           │
│    2. Zod validation                         │
│    3. Supabase admin client → INSERT/UPDATE  │
│    4. revalidatePath("/customers")           │
└───────────────┬──────────────────────────────┘
                │
                ▼
┌──────────────────────────────────────────────┐
│  Supabase (customers table)                  │
│    Columns: id, company, contact, phone,     │
│    email, city, status, projects_count,      │
│    revenue, created_at, updated_at,          │
│    is_deleted, deleted_at                    │
└──────────────────────────────────────────────┘
```

---

## Files Changed / Created

### New Files

| File | Purpose |
|------|---------|
| `src/lib/customers/types.ts` | `CustomerRow` (DB shape) + re-export of frontend `Customer` type |
| `src/lib/customers/schemas.ts` | Zod schemas for create/update validation |
| `src/lib/customers/mappers.ts` | Maps Supabase snake_case rows → camelCase frontend objects |
| `src/lib/customers/queries.ts` | Server-only read queries (`getCustomers`, `getCustomerById`) |
| `src/lib/customers/actions.ts` | Server Actions (`createCustomer`, `updateCustomer`, `softDeleteCustomer`) |
| `src/lib/customers/index.ts` | Barrel exports |
| `src/app/(dashboard)/customers/CustomersClient.tsx` | Interactive client component (table, modals, filters) |
| `docs/customers-crud.md` | This documentation |

### Modified Files

| File | Change |
|------|--------|
| `src/app/(dashboard)/customers/page.tsx` | Converted from `"use client"` → async Server Component; fetches from Supabase |
| `src/components/ui/StatusBadge.tsx` | Added `"lead"` variant type and styling |

---

## Data Flow

### Read

1. `page.tsx` (Server Component) calls `getCustomers()`.
2. `queries.ts` uses the admin client to query `customers` where `is_deleted = false`.
3. Results are mapped via `mapRowToCustomer()` (snake_case → camelCase, revenue formatting).
4. Mapped `Customer[]` is passed as props to `CustomersClient`.

### Create

1. User fills form in the Add Customer modal.
2. `FormData` is submitted to the `createCustomer` Server Action.
3. Action calls `requirePermission("customers:write")` — throws if unauthorized/forbidden.
4. Zod validates the input.
5. Admin client inserts into `customers` with defaults (`projects_count: 0`, `revenue: 0`) and sets `created_by` / `updated_by`.
6. `revalidatePath("/customers")` invalidates the cache.

### Update

1. User edits fields in the Edit Customer modal.
2. `FormData` is submitted to `updateCustomer(id, formData)`.
3. Same auth + validation flow.
4. Only provided fields are updated (partial update).

### Soft Delete

1. User confirms deletion in the Delete modal.
2. `softDeleteCustomer(id)` sets `is_deleted = true`, `deleted_at = now()`, and `updated_by`.
3. No hard deletes ever occur.

---

## Auth Rules

- **All Server Actions** call `requirePermission("customers:write")` from `@/lib/auth/permissions` first.
- If permission check fails, the action safely catches the Custom Error and returns `{ success: false, error: "Unauthorized" / "Forbidden" }`.
- `created_by` / `updated_by` columns are populated securely using the authenticated user's `clerk_user_id`.
- The Supabase admin client bypasses RLS (service role key) and is only used server-side via `import "server-only"`.

---

## Supabase Admin Client

- Defined in `src/lib/supabase/admin.ts`.
- Protected with `import "server-only"` — cannot be imported in Client Components.
- Uses `SUPABASE_SERVICE_ROLE_KEY` (never exposed to the browser).

---

## Zod Validation

### Create Schema

| Field | Rule |
|-------|------|
| `company` | Required string, min 1 |
| `contact` | Required string, min 1 |
| `phone` | Required string, min 1 |
| `email` | Required valid email |
| `city` | Required string, min 1 |
| `status` | Enum: `active`, `inactive`, `lead` (default: `lead`) |
| `projects_count` | Non-negative integer (default: 0) |
| `revenue` | Non-negative number (default: 0) |

### Update Schema

Same fields but all optional. `projects_count` and `revenue` are not updatable by the client.

---

## Manual Test Steps

1. **Sign out → /customers** should redirect to `/sign-in`.
2. **Sign in → /customers** should load the table (or empty state if DB is empty).
3. **Add Customer**: Click "Add Customer" → fill form → submit → customer appears in table.
4. **Edit Customer**: Click a customer row → click "Edit Profile" → change fields → save.
5. **Delete Customer**: Click a customer row → click trash icon → confirm → customer removed from list.
6. **Health Check**: Visit `/api/health/db` → should return `{"ok": true}`.
7. **Filters**: Use Status and City dropdowns to filter the table.
