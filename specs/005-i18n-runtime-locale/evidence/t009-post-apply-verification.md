# T009 Read-Only DEV/DEMO Post-Apply Verification Packet

> **READ-ONLY DEV/DEMO POST-APPLY VERIFICATION — NO WRITES**

## Purpose and evidence boundary

This packet verifies the schema outcome after Mozfer manually applied the reviewed Feature 005 migration. It does not apply or reapply SQL, change schema, test a mutation, or begin application implementation. The SQL returns only schema metadata and aggregate locale counts; it must not expose user identities or business data.

Authoritative apply evidence supplied by Mozfer:

- Migration: `supabase/migrations/20260711090000_add_app_users_locale.sql`
- SHA-256: `828DFFB1010A4C9BCB3183B96D81975C0D342993AAE6E91D03B8A94E5C586CAB`
- Applied manually once by Mozfer, unchanged, from `BEGIN;` through `COMMIT;`
- Supabase reported: `Success. No rows returned`
- No SQL or transaction error was displayed
- A second execution attempt was safely blocked by the fail-loud assertion: `public.app_users.locale already exists`. It made no schema change and must not be attempted again.
- Target was labelled `main` / `PRODUCTION`, but Mozfer confirmed it contains DEV/DEMO data only; this packet must not describe the migration as production-applied
- Post-apply schema state was subsequently verified through the read-only result evidence recorded below.

## Mozfer execution instructions

1. Open the same G7 Supabase database containing the confirmed DEV/DEMO data.
2. Create a new SQL Editor query.
3. Paste the complete SQL from `t009-post-apply-verification.sql` without edits.
4. Run it once.
5. Capture every result set, including empty result sets and any error text.
6. Send all captured results to the controller.
7. Stop immediately on syntax, relation, permission, or ambiguity errors.
8. Do not edit schema, rerun the migration, run any mutation test, or begin application implementation.

## Recorded post-apply results

### Column

| Check | Recorded result |
|---|---|
| Table exists | `true` |
| Locale column exists | `true` |
| Data type / UDT | `text` / `text` |
| Nullability | `NO` |
| Default | `'en'::text` |
| Generated | `NEVER` |
| Identity | `NO` |

### Constraint

- Name: `app_users_locale_check`
- Type: `CHECK`
- Validated: `true`
- Definition: `CHECK (locale = ANY (ARRAY['en'::text, 'ar'::text]))`
- Locale-related duplicate constraint evidence: none; the exact required constraint is present once.

### Existing rows

| Aggregate | Recorded result |
|---|---:|
| Total rows | 2 |
| `locale = 'en'` | 2 |
| `locale = 'ar'` | 0 |
| NULL locale | 0 |
| Outside approved values | 0 |

Grouped distribution contains only `en: 2`. No IDs, names, emails, Clerk IDs, phones, or business fields were exposed.

### RLS and policies

- Table exists: `true`
- RLS enabled: `true`
- Force RLS: `false`
- Policy count: `0`
- Policies: `[]`

No locale policy was created.

### Grants

- Grant count: `28`
- Grantees: `anon`, `authenticated`, `postgres`, `service_role`
- Table privileges present: `DELETE`, `INSERT`, `REFERENCES`, `SELECT`, `TRIGGER`, `TRUNCATE`, `UPDATE`
- All grantable values are `NO` except `postgres`, which is `YES`.

### Triggers

- Trigger count: `1`
- Locale-related trigger count: `0`
- Existing trigger: `update_app_users_updated_at`
- Function: `update_updated_at_column`
- Enabled: `enabled`
- References locale: `false`
- Definition: `CREATE TRIGGER update_app_users_updated_at BEFORE UPDATE ON app_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()`

### Indexes

- Index count: `5`
- Locale-related index count: `0`
- Existing indexes: `app_users_clerk_user_id_key`, `app_users_pkey`, `idx_app_users_clerk_id`, `idx_app_users_is_active`, `idx_app_users_role`

No locale index was created.

Invalid-value rejection is proven for this read-only gate by the `NOT NULL` metadata and validated CHECK definition. No INSERT or UPDATE test is performed. Any future mutation test requires separate approval, synthetic data, and guaranteed rollback.

## Migration-history limitation

Mozfer ran the SQL manually in the Supabase SQL Editor. This packet verifies schema outcome only. Schema success does not automatically prove that a Supabase migration-history row exists. No migration-history entry is fabricated or required unless the repository workflow explicitly supports manual registration.

## Verification boundaries and interpretation

Invalid-value rejection is verified for this read-only gate by the `NOT NULL` metadata and validated CHECK definition. No INSERT or UPDATE mutation test was performed. Any future mutation test requires separate approval, synthetic data, and guaranteed rollback.

## Result interpretation matrix

### POST_APPLY_VERIFIED

- Column exists with correct `text` type, `NOT NULL`, and default `'en'`.
- The exact validated `app_users_locale_check` permits only `en` and `ar`.
- Two existing users have `en`; there are no NULL or outside-approved values.
- RLS, policies, grants, triggers, and indexes show no unexpected change.

### POST_APPLY_NON_COMPLIANT

Examples include wrong type/default/nullability, missing or invalid constraint, unexpected values, security metadata changes, duplicate locale constraints, or locale-specific triggers/indexes. Result is **HOLD**; do not begin application implementation.

### EVIDENCE_INCOMPLETE

Examples include a query error, missing result sets, or ambiguous metadata. Result is **HOLD**; make no assumptions and do not begin application implementation.

## Final classification

**POST_APPLY_VERIFIED**

The database prerequisite is complete. T010 application foundation may begin; no schema or migration action remains before T010.

## Grant baseline security note

The current table-level grants are broad and include `anon` and `authenticated` privileges while RLS is enabled and no row policies exist. This is recorded as a pre-existing security baseline, not as a change introduced by the Feature 005 migration. No grant-remediation task is opened by this evidence-record action.
