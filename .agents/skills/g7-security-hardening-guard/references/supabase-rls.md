# Supabase RLS And SQL Guardrails

Use this reference for Supabase service_role usage, RLS, public tables, anon/publishable key exposure, SQL migrations, RPC grants, SECURITY DEFINER functions, and DEV_ONLY RLS.

## Service Role And Client Exposure

- Keep Supabase `service_role` server-side only.
- Do not use `service_role` in Client Components.
- Do not expose `service_role` through `NEXT_PUBLIC` variables.
- Do not put service keys in browser bundles, logs, screenshots, docs, seed files, or migrations.
- Treat anon/publishable keys as public and assume a user can call exposed tables and RPCs directly.

## RLS Requirements

- Enable RLS on new public tables unless explicitly approved otherwise.
- Ensure SQL-created tables explicitly enable RLS where needed.
- Use least-privilege RLS policies.
- Do not add broad `true` policies without explicit approval.
- Do not use DEV_ONLY RLS with real client/company data.
- Check both read and write exposure for CRM, financial, settings, bank, role, and permission tables.
- Confirm anon/publishable key access cannot read or mutate sensitive CRM or financial data.

## SQL, Migrations, RPCs

- Do not apply migrations automatically.
- Do not edit already-applied migrations.
- Require explicit review before creating or applying SQL.
- Review RPC execute permissions before ship.
- Review SECURITY DEFINER functions with extra care: search path, caller identity, input validation, least privilege, and returned data.
- Avoid SQL that bypasses intended RLS or financial source-of-truth rules unless explicitly approved and safely isolated server-side.
- Preserve existing grants/revokes unless a reviewed change explicitly requires updates.

## Review Questions

- Which users can read each new or changed table through the anon/publishable key?
- Which users can mutate data directly through table policies or RPC grants?
- Does any function use SECURITY DEFINER, broad grants, dynamic SQL, or unvalidated identifiers?
- Does the SQL preserve server/PostgreSQL-side financial calculations?
- Is any DEV_ONLY policy still present in a path intended for real data?
