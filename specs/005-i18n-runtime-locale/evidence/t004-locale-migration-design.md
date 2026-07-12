# T004 Locale Migration Design

## Status and boundary

**Selected design: approved for separate pre-creation review; no SQL or migration file exists from T004.**

This design applies only to the verified Supabase DEV/DEMO decision path. Mozfer’s read-only T001 evidence classifies `public.app_users.locale` as `COLUMN_ABSENT`, with two existing user rows and no incompatible locale values. T003 therefore records `MIGRATION_REQUIRED`.

## Repository evidence

Graphify was used only to locate the relevant schema, migration, auth, and locale areas. Exact source inspection established:

- `supabase/schema.sql` defines `public.app_users` with a text role CHECK, RLS enabled, the `update_app_users_updated_at` trigger, three indexes, and table grants recorded for `anon`, `authenticated`, and `service_role`; it contains no locale column or locale enforcement.
- `supabase/migrations/20260607133000_core_security.sql` is the only migration that creates or alters `app_users`. It creates the table, enables RLS, creates the updated-at trigger, and creates indexes for Clerk ID, role, and active state. It creates no broad `app_users` policy.
- No repository migration defines an `app_users` RLS policy, locale function, locale RPC, enum, or domain.
- `src/app/api/webhooks/clerk/route.ts` inserts new users without a locale value through the server-only admin client.
- `docs/database-migrations.md` contains a manual admin-user insert/upsert pattern that also omits locale.
- `src/lib/auth/permissions.ts` reads the current user with `select("*")`; `src/lib/admin/users/queries.ts` uses an explicit projection and handwritten `AppUserRow` that omit locale.
- Admin user actions update only existing role/active fields. No repository database function or RPC was found that inserts or updates `app_users`.
- The Supabase admin client is server-only and untyped against generated database types. No generated `app_users` database type file was found.
- Existing repository constraints predominantly use table-scoped text CHECK enforcement. The existing `app_users_role_check` name makes `app_users_locale_check` the most consistent stable name for this table.
- Feature 004’s locale draft is explicitly unapplied and is not migration history.

Repository schema/grant material is design evidence, not a substitute for post-apply live DEV/DEMO verification.

## Alternatives compared

| Approach | Benefits | Costs and risks | Decision |
|---|---|---|---|
| `text` plus table CHECK | Matches current `app_users.role` and broader repository conventions; simple Supabase representation; no global type object; easy application parsing; small additive change | Adding a future locale requires a reviewed constraint replacement | **Selected** |
| PostgreSQL enum | Strong named type and generated-type clarity | Adds a global schema object, more operational steps, more difficult evolution/removal, and unnecessary coupling for two simple values | Rejected |
| PostgreSQL domain | Reusable central rule | Adds a global type object without a current reuse case; increases tooling and migration complexity | Rejected |

## Exact selected design

| Property | Decision |
|---|---|
| Target | `public.app_users.locale` |
| Column type | PostgreSQL `text` |
| Final nullability | `NOT NULL` from creation; no temporary nullable phase |
| Database default | Retain `en` after migration |
| Approved stored values | Exactly `en` and `ar` |
| Enforcement | Immediate validated table CHECK |
| Stable constraint name | `app_users_locale_check` |
| Existing-row value | Both verified existing rows become `en` |
| Drift behavior | Explicit precondition; fail loudly if any `locale` column already exists |
| RLS/policies/grants | No change |
| Trigger | Reuse existing `update_app_users_updated_at`; add no locale trigger |
| Index | No locale index |

An invalid insert or update must fail at the database boundary with a CHECK-constraint violation. Null must also fail because the final column is `NOT NULL`.

## Nullability and default rationale

Permanent nullability is rejected because every persisted row should have a deterministic locale and because a null preference would create two durable states for the same English outcome. A temporary nullable phase is unnecessary for two verified rows and would add a backfill/constrain window without reducing risk.

The retained `en` default is required for compatibility before runtime locale code lands:

- the Clerk webhook insert currently omits locale;
- the documented manual seed/upsert currently omits locale;
- any existing server-side insert that supplies the current column set must continue to succeed;
- new users must receive a deterministic safe locale immediately.

Runtime application code may later write `en` or `ar` explicitly, but keeping the database default prevents an older or concurrent insert path from failing or creating an indeterminate preference. Arabic must never be inferred from environment, role, identity, name, email, phone, business data, or `G7_DEV_RTL`.

## Existing-user handling

The migration must assign `en` to both existing DEV/DEMO rows as part of the same atomic additive operation. It must not inspect or branch on user-level attributes. Because the default and final `NOT NULL` state are established together, existing rows are immediately valid and there is no externally visible nullable phase.

After apply, read-only aggregate evidence must show:

- exactly two existing rows with `locale = en`;
- zero null locale values;
- zero values outside `en` and `ar`.

## Migration sequence

The future migration must be one transactional, additive sequence:

1. Assert that `public.app_users` exists and that no column named `locale` exists. Any contradictory column shape must stop the migration before alteration.
2. Add `locale` as text with final `NOT NULL` state and retained `en` default, causing both existing rows to receive the approved value without user-specific logic.
3. Add and immediately validate `app_users_locale_check` so only `en` and `ar` are accepted.
4. Leave RLS enablement, policies, grants, indexes, the updated-at trigger, roles, permissions, and all business tables untouched.

The operation is intentionally small enough to remain atomic. A failure before completion must leave no partially accepted design state. Migration creation and exact SQL text belong to T006 only after T005 approves this design.

## Drift policy

The future migration must **not** use `IF NOT EXISTS` for the locale column. Silent acceptance could conceal a conflicting type, default, nullability rule, or enforcement mechanism. It must perform an explicit catalog precondition and fail loudly if `locale` unexpectedly exists, regardless of apparent compatibility. Any drift then returns to inspection and a new reviewed remediation design.

The constraint must also be created under the exact stable name. An unexpected object-name collision must stop creation rather than silently reuse an unverified object.

## Application compatibility

- **Clerk webhook insert**: remains valid because the retained database default supplies `en` when locale is omitted.
- **Documented admin seed/upsert**: remains valid for the same reason; conflict updates do not need to rewrite locale.
- **Current-user read**: `select("*")` will return one additional scalar field. Existing role and active-state consumers remain structurally compatible.
- **Admin users query/type**: the explicit projection omits locale, so the current handwritten `AppUserRow` remains valid and no preference is exposed on that screen by this migration.
- **Admin role/active updates**: partial updates remain valid and do not overwrite locale.
- **Authenticated routes**: continue to use the current English/default runtime behavior until T010 and later application tasks wire locale reads.
- **Generated types**: none were found for `app_users`. If generated Supabase types are introduced or refreshed, that is a separate later application task after verified apply; it is not part of this migration design.

No source change is required merely to keep current paths operating after the schema addition.

## RLS, grants, and security

The migration must not alter RLS enablement, create or change policies, grant or revoke table/column/function access, or add an RPC. Adding the column does not authorize client-side reads or writes. Future preference mutation remains a server-derived, current-user-only application action with active-user and existing-permission enforcement.

The schema snapshot records broad table grants while RLS is enabled and no `app_users` policy is present. This design neither normalizes nor broadens that posture. Pre-apply review and post-apply verification must compare the live DEV/DEMO RLS flag, policies, grants, and service-role path before and after the migration. Any unexpected access drift is blocking.

Locale contains no customer, financial, document, role, or workflow data. The migration must not expose other `app_users` fields or create a cross-user target path.

## Trigger and audit behavior

The existing `update_app_users_updated_at` trigger runs before every row update and sets `NEW.updated_at` to the current time. Once runtime locale updates are implemented, changing locale will therefore update the existing row timestamp. That behavior is acceptable and consistent with other profile changes.

The additive DDL/backfill design does not depend on firing this trigger and must not invent per-user audit rows. No locale-specific validation, normalization, or audit trigger is needed. Any user-preference audit requirement remains governed by the existing application audit policy and later application review.

## Historical draft reconciliation

| Feature 004 draft choice | Classification | T004 treatment |
|---|---|---|
| `public.app_users.locale` as text | Retain | Smallest repository-consistent storage type |
| Values `en` and `ar` | Retain | Exact approved set |
| Table CHECK named `app_users_locale_check` | Retain | Matches current table naming and avoids a global type |
| Permanently nullable locale | Replace | Final state is `NOT NULL` for deterministic persistence |
| No database default | Replace | Retained `en` default preserves current insert paths and new-user safety |
| CHECK permits null | Replace | Constraint permits only `en` or `ar`; nullability is rejected separately |
| Company-level default read order | Reject for Feature 005 | No `company_settings.default_locale` change is required or authorized |
| Document/customer language fields | Retain as deferred | No document locale or customer preferred-language field |

The old draft must not be edited, executed, or copied blindly.

## Verification design

### Pre-creation and migration-file review

T005 and T007 must verify that the future migration implements only the selected design, uses a new timestamped file, edits no applied migration, contains the fail-loud precondition, and makes no policy/grant/trigger/index/source change. Review must record current live DEV/DEMO RLS, policy, grant, trigger, and index evidence for later comparison if the T001 evidence set does not contain every baseline detail.

### Post-apply read-only verification

T009 must use approved read-only catalog and aggregate checks to establish:

- `public.app_users.locale` exists at the expected ordinal position;
- declared and underlying type are text;
- the column is `NOT NULL`;
- the retained default resolves to `en`;
- `app_users_locale_check` exists, is validated, and permits exactly `en` and `ar`;
- all existing rows are compatible, with exactly two rows set to `en`, zero nulls, and zero outside values;
- `update_app_users_updated_at` remains enabled with the same function and definition;
- existing indexes are unchanged and no locale index was added;
- RLS enablement, policies, grants, and server-only service-role usage are unchanged;
- no unrelated schema object changed.

Actual invalid-locale rejection must not be tested through an unapproved write. The validated constraint definition is the T009 read-only evidence. If an execution-level negative test is required, it needs a separate explicitly approved DEV/DEMO-only verification using synthetic data with guaranteed rollback and no real user mutation.

## Rollback and failure handling

- **Design or creation review fails**: create/apply nothing; revise the proposed design or future migration text and repeat the relevant review gate.
- **DEV/DEMO apply fails**: stop immediately, capture the complete error, determine whether the transaction fully rolled back, and run only approved read-only state inspection. Do not retry, repair, or continue to application work by assumption.
- **Post-apply verification fails**: HOLD T010 and all runtime persistence implementation. Resolve the schema discrepancy through a separately reviewed forward corrective migration; never edit the applied file.
- **Application rollback before real preference use**: runtime behavior may temporarily remain English while preserving the verified locale column.
- **Rollback after preferences contain real values**: dropping the column would destroy user preferences and is not an acceptable routine rollback. Preserve data, disable application use if necessary, and use a separately reviewed forward corrective migration with backup/restore planning.

No application implementation may begin until the migration has been created, reviewed, manually applied by Mozfer to the authorized DEV/DEMO environment, and passed post-apply verification through T009.

## Final recommendation

Create, in a later authorized task, one new transactional migration that fails loudly on pre-existing locale drift, adds `public.app_users.locale` as `text NOT NULL DEFAULT 'en'`, establishes the immediately validated `app_users_locale_check` for exactly `en` and `ar`, assigns `en` to both existing rows, and changes no RLS, policy, grant, trigger, index, role, permission, financial, workflow, document, or audit behavior. Keep the default, reuse the existing updated-at trigger behavior, and require complete read-only post-apply verification before T010.
