---
name: g7-crm-migration-review
description: Specialist review for G7 BLUE CRM SQL, Supabase migrations, RLS policies, PostgreSQL RPC functions, triggers, grants/revokes, schema changes, database security, and financial database logic.
---

# G7 CRM Migration Review

Use this skill for any SQL, migration, RLS policy, RPC function, trigger, grant/revoke, schema, or financial database change.

## Hard Gates

- Inspect first.
- Propose SQL text before creating a migration file.
- Review proposed SQL before file creation.
- Review migration files before manual apply.
- Never execute SQL automatically.
- Never use Supabase MCP `execute_sql`.
- Never use Supabase MCP `apply_migration`.
- Never apply migrations automatically.
- Never edit already-applied migrations.
- Create new timestamped migrations only after review.
- Preserve function signatures unless explicitly approved.
- Preserve grants/revokes unless explicitly approved.

## Schema / Auth Facts

- `app_users.clerk_user_id` is TEXT, not UUID.
- Never cast `clerk_user_id` to UUID.
- Never compare `clerk_user_id` using UUID operators.
- Supabase admin/service-role paths must stay server-side only.
- Review RLS carefully.
- `DEV_ONLY` RLS is not acceptable for real-data deployment.

## RPC Rules

- Qualify table columns with aliases in PL/pgSQL.
- Avoid ambiguous names between output columns, variables, parameters, and table columns.
- In `RETURNS TABLE` functions, output column names can shadow unqualified references.
- Use aliases such as `qi.quotation_id`, not bare `quotation_id`.
- Prefer `v_` prefixes for local variables.
- Preserve return shapes unless explicitly approved.

## Financial Database Rules

- PostgreSQL RPC remains the source of truth for financial totals.
- Do not move VAT, discount, subtotal, grand total, paid amount, or balance calculations to the client.
- Do not trust client-submitted totals.
- Ensure document-level `vat_rate` snapshots are preserved.
- Treat company settings VAT as a default for new documents only.

## Required Output

When reviewing, report:

- Verdict: Approved, Approved with required changes, or Not Approved.
- SQL / migration risks.
- Required fixes.
- Safe next step: inspection only, propose SQL, create migration, manual apply, or stop.
- Whether SQL was run. The expected answer is "No" unless the user explicitly approved execution.
