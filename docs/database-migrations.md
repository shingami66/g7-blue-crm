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
