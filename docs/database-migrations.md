# Database Migrations

This document explains how to apply structural schema changes, sequence numbering, and user seeding.

## Atomic Sequence Generation
The `generate_document_number(doc_type)` function provides document sequencing (e.g., `QUO-2026-0001`).
- The function guarantees atomic unique numbering under concurrency.
- Gapless numbering requires generating the number inside the final document creation transaction.

## Admin User Seeding
To seed an initial admin user (or yourself):
1. Obtain your Clerk User ID from the **Clerk Dashboard → Users → [Your User] → User ID**.
2. Run the following manual SQL snippet in the Supabase SQL Editor:

```sql
INSERT INTO app_users (
  clerk_user_id,
  email,
  name,
  role,
  is_active
)
VALUES (
  'user_xxxxxxxxx',
  'my-email@example.com',
  'Mozfer Mohamed',
  'admin',
  true
)
ON CONFLICT (clerk_user_id)
DO UPDATE SET
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = 'admin',
  is_active = true,
  updated_at = now();
```

## Migration Safety Steps
- Never run migrations that mutate user data without a verified local test.
- Use `text` instead of `uuid` for all user ID relations to accommodate Clerk.
- Manually run `.sql` files in the Supabase SQL Editor until automated CLI migrations are fully integrated.

## DEV/DEMO Application Record

### One Active Deposit per Service — 2026-07-23

`supabase/migrations/20260722120000_enforce_one_active_deposit_per_service.sql` was manually applied through the Supabase SQL Editor to G7 BLUE CRM DEV/DEMO project `dpddrqjzqohexixgdqiq`. The SQL Editor returned: `Success. No rows returned.` Production was not accessed.

- Verified `public.create_invoice_atomic(...)` exists with `SECURITY DEFINER` and `search_path = pg_catalog, public`.
- Deposit duplicate detection is Service-wide; the exact `uq_invoices_one_active_deposit_per_service` unique-index race maps to `deposit_invoice_already_exists`, while the Final Invoice duplicate guard remains intact.
- Unique index `public.uq_invoices_one_active_deposit_per_service` exists, is unique, valid, and ready, indexes only `service_id`, and uses this active Deposit predicate:
  `service_id IS NOT NULL AND invoice_type = 'deposit' AND COALESCE(is_deleted, false) = false AND voided_at IS NULL AND status NOT IN ('voided', 'cancelled')`.
- Function execution is granted to `service_role` and revoked from `anon` and `authenticated`.
- Pre-apply duplicate aggregate was clean: `0` affected Services and `0` active Deposit rows.
- Repository migration history was not repaired or marked. This record does not claim that migration history contains version `20260722120000`.
