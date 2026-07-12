# T003 Conditional Migration Decision

## Decision

**Verdict: `MIGRATION_REQUIRED`**

Feature 005 requires durable per-user locale persistence, and the completed Mozfer-executed Supabase DEV/DEMO evidence classifies the live schema as `COLUMN_ABSENT`. The runtime foundation cannot treat a missing field as a compliant persistence boundary.

## Evidence basis

The authoritative evidence is the [T001 DEV/DEMO audit record](./t001-app-users-locale-audit.md), executed manually by Mozfer with the approved read-only SQL Editor packet:

- `public.app_users` exists in the audited DEV/DEMO environment.
- `public.app_users.locale` is absent.
- No locale enum, domain, CHECK constraint, or locale-validating/normalizing trigger enforcement exists.
- The existing non-internal `update_app_users_updated_at` trigger is enabled and does not reference locale.
- Two existing user rows were counted through aggregate-only inspection.
- No incompatible locale values were observed because the locale key is absent.
- The evidence is complete and classified `COLUMN_ABSENT`.

This decision does not extend those findings to production or to any environment not covered by the supplied DEV/DEMO evidence.

## Why migration cannot be skipped

The [locale preference contract](../contracts/locale-preference.md) requires a durable current-user preference that survives navigation, refresh, sign-out/sign-in, and later sessions after successful persistence. With no `public.app_users.locale` field, the audited DEV/DEMO schema has no approved database location for that preference. Option `MIGRATION_NOT_REQUIRED` is therefore unavailable; option `HOLD_EVIDENCE_INCOMPLETE` is also unavailable because the required evidence was supplied without reported permission, relation, or syntax errors.

## Required migration properties

The separate migration design must:

- add one persisted locale field to `public.app_users` through a safely additive change;
- constrain persisted locale values to exactly `en` and `ar` at the database layer;
- keep existing user rows valid immediately after the migration;
- provide a safe English initial/effective value for existing users unless T004’s evidence-backed design identifies a different already-approved Feature 005 treatment;
- never infer Arabic from environment flags, roles, identity data, or other user/business data;
- preserve existing application paths before runtime locale wiring is implemented;
- avoid changes to roles, permissions, financial behavior, workflow behavior, record data, document/PDF language, or audit boundaries;
- preserve current RLS/access boundaries and avoid any policy, grant, or public-access broadening;
- follow the repository’s forward-only migration workflow without editing an already-applied migration.

T004 must compare CHECK-constraint and enum/domain enforcement approaches and recommend the smallest repository-consistent option. The comparison must consider current DEV/DEMO truth, current migration conventions, existing-user treatment, rerun/partial-run safety, rollback direction, RLS/grants, and the current Feature 005 contracts.

## Existing-user safety

There are two existing DEV/DEMO user rows. The future design must keep both rows valid and keep current authenticated application paths usable immediately after migration. English is the approved safe initial/effective locale; the exact mechanism for existing-row treatment, nullability, backfill, and any future-row default belongs to T004 and subsequent review. No user-specific identity or business data is needed to make that design decision.

## Security and access boundary

Locale remains a preference of the current authenticated user. Future application writes must derive identity server-side, accept no cross-user target, and update only the current user’s locale field. This decision authorizes no RLS change, grant change, role/permission change, direct client table write, financial/workflow change, or broader audit requirement.

## Historical draft reconciliation

Feature 004’s `specs/004-i18n-rtl-foundation/sql-draft.md` is unapplied historical design evidence only. It must not be copied or executed blindly. T004 must compare it with the Mozfer-executed DEV/DEMO evidence, current migration conventions, and the current Feature 005 plan, data model, and contracts. No already-applied migration may be edited.

## Explicit non-decisions

This T003 record does **not**:

- choose SQL syntax;
- choose a migration filename or timestamp;
- finalize CHECK versus enum/domain enforcement;
- finalize nullability, backfill expression, or database-default semantics;
- create or modify a migration file;
- execute or apply SQL;
- change schema, RLS, policies, grants, roles, permissions, workflows, financial behavior, or source code;
- claim production application, production readiness, or production schema state.

## Routing

Proceed to the separate **T004 migration design** task. T004 may design and compare the minimal migration approach, but migration creation, review, manual DEV/DEMO apply, and post-apply verification remain separate controlled tasks T005–T009.
