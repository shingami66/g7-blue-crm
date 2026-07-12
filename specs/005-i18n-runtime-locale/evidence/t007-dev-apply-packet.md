# T007 Controlled DEV/DEMO Migration Apply Packet

> **SUPABASE DEV/DEMO ONLY**
> **MANUAL EXECUTION BY MOZFER**
> **NOT PRODUCTION**
> **DO NOT MODIFY THE SQL**

## Packet purpose

This packet prepares the reviewed Feature 005 locale migration for one manual Mozfer-owned apply in the correct G7 Supabase DEV/DEMO project. It contains instructions only. No apply has occurred, no result is claimed, and T009 remains a separate read-only post-apply verification gate.

## Exact migration identity

| Field | Required value |
|---|---|
| Filename | `20260711090000_add_app_users_locale.sql` |
| Repository path | `supabase/migrations/20260711090000_add_app_users_locale.sql` |
| Reviewed SHA-256 | `828DFFB1010A4C9BCB3183B96D81975C0D342993AAE6E91D03B8A94E5C586CAB` |
| Column | `public.app_users.locale` |
| Column definition | `text NOT NULL DEFAULT 'en'` |
| Constraint | `app_users_locale_check` |
| Allowed values | Exactly `en`, `ar` |

## Integrity gate before apply

Mozfer must confirm all of the following before opening the query for execution:

1. The repository path is exactly `D:\G7\g7-crm\supabase\migrations\20260711090000_add_app_users_locale.sql`.
2. The file SHA-256 is exactly `828DFFB1010A4C9BCB3183B96D81975C0D342993AAE6E91D03B8A94E5C586CAB`.
3. The file is the reviewed repository file, not a staged version, copied file, edited variant, or hand-retyped substitute.
4. No prior apply result exists for this migration in the target workflow, or the controller has explicitly confirmed the apply state.
5. The open Supabase project is the correct G7 Supabase DEV/DEMO project.

If the path, hash, content, apply state, or target project is uncertain, **HOLD**. Do not apply and do not improvise a replacement.

## Expected migration behavior

The reviewed file is expected to execute one atomic migration unit that:

- asserts `public.app_users` exists;
- fails before alteration if `public.app_users.locale` already exists;
- fails before alteration if `app_users_locale_check` already exists on `public.app_users`;
- adds `locale text NOT NULL DEFAULT 'en'`;
- assigns `en` to the two existing DEV/DEMO rows through the additive default;
- adds a validated CHECK allowing exactly `en` and `ar`;
- preserves RLS, policies, grants, triggers, indexes, roles, permissions, financial behavior, and workflows;
- runs inside the file’s `BEGIN`/`COMMIT` transaction boundaries.

The independent migration review result was `MIGRATION_REVIEW_PASS_WITH_WARN`: no CRITICAL, HIGH, or MEDIUM findings. The accepted LOW warning is documented below.

## Mozfer manual apply steps

1. Open the correct G7 Supabase **DEV/DEMO** project.
2. Open its SQL Editor.
3. Create a new SQL query.
4. Open the reviewed migration file from the repository at the exact path listed above.
5. Copy the entire file without edits.
6. Paste the entire migration into the SQL Editor.
7. Confirm the editor contains the complete reviewed content, beginning with `BEGIN;` and ending with `COMMIT;`.
8. Reconfirm the target is DEV/DEMO and the displayed file hash matches the reviewed SHA-256.
9. Run the migration once.
10. Do not rerun it after apparent success.
11. Capture the complete Supabase success or error output, including any transaction or DDL message.
12. Return that output and the execution metadata to the controller.
13. Stop. Do not run verification queries or begin application implementation in this task.

## Immediate stop and HOLD conditions

Stop immediately and return **HOLD** if any of the following occurs:

- the wrong Supabase project is open;
- the environment is not confirmed as DEV/DEMO;
- the migration path is wrong;
- the SHA-256 differs from the reviewed value;
- the migration content was edited, copied incompletely, or retyped;
- `public.app_users` is missing;
- `public.app_users.locale` already exists;
- `app_users_locale_check` already exists;
- a permission, relation, syntax, or DDL error occurs;
- the transaction aborts or does not complete cleanly;
- Supabase reports partial, ambiguous, or unexpected behavior;
- any prompt suggests adding a write, workaround, retry variation, or schema change.

Do not edit the migration in Supabase. Do not retry after a failure without a new controller-approved review or diagnostic task.

## Success evidence required for T008

Return all of the following to the controller:

- exact Supabase success output;
- confirmation that the migration completed without error;
- confirmation it was executed exactly once;
- confirmation the target was the correct DEV/DEMO environment;
- approximate execution time, if visible;
- any Supabase-provided transaction or DDL status text.

Migration success output alone is not final schema verification. T009 remains responsible for the separate read-only checks of column definition, default, constraint, existing values, RLS, grants, policies, triggers, indexes, and unchanged access behavior.

## Failure behavior

If the apply fails or the result is ambiguous:

- no source implementation may begin;
- do not make a second apply attempt without review;
- do not edit the migration in Supabase or the repository;
- return the exact error/output and execution context;
- let the controller choose the next narrow diagnostic or migration-fix task.

## Post-apply boundary

After apparent success, stop this workflow. Do not run application code, update generated types, run tests/builds, perform browser smoke, or claim that the schema is fully verified. Proceed only to the separate T009 read-only post-apply verification packet/execution.

## Accepted review warning

The independent review recorded one non-blocking LOW warning: the table assertion checks exact `public.app_users` existence but does not explicitly inspect `pg_class.relkind`. If an invalid relation type occupied that exact name, the later `ALTER TABLE` would fail and the surrounding transaction would roll back. This warning does not authorize migration edits and does not change the apply instructions.
