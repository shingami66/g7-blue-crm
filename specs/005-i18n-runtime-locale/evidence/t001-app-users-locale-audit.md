# T001 DEV/DEMO `app_users.locale` Schema Audit Packet

## Purpose and boundary

This packet supports Feature 005 task **T001 — Live DEV schema truth audit**. It is for **Supabase DEV/DEMO only**. Mozfer must execute the accompanying [read-only SQL packet](./t001-app-users-locale-audit.sql) manually in the Supabase SQL Editor.

Every statement is a `SELECT` or `WITH ... SELECT` catalog/aggregate inspection. The packet contains no write, migration, RPC mutation, transaction-side write, temporary object, trigger/RLS disablement, or grant change. It does not establish any live schema fact until Mozfer returns the complete result sets.

## Repository navigation evidence, not live evidence

Graphify navigation pointed to the Feature 004 locale design area and the canonical schema/migration materials. Exact source verification found:

- `supabase/schema.sql` defines `public.app_users` with its existing identity, role, active-state, and timestamp fields, but the repository snapshot has no `locale` field. It also records `app_users` RLS and existing primary/unique constraints.
- `supabase/migrations/20260607133000_core_security.sql` creates the baseline `app_users` table and its update-timestamp trigger; it contains no locale field or locale constraint.
- `specs/004-i18n-rtl-foundation/sql-draft.md` proposes nullable `app_users.locale text` plus `en`/`ar` check enforcement, but labels itself **NOT APPLIED** and **NOT A MIGRATION**.
- `docs/database-schema.md` states that `supabase/schema.sql` is a reference snapshot, not migration tracking or proof of current live state, and requires live inspection before schema changes.
- Feature 005 treats the live result as the decision input: [tasks.md](../tasks.md) T001–T003, [plan.md](../plan.md) §Schema Impact, [research.md](../research.md) §Decision 7, [data-model.md](../data-model.md) §Schema Decision, and [implementation-readiness.md](../checklists/implementation-readiness.md) CHK010–CHK015.

Therefore the repository suggests a prior **unapplied draft** but cannot prove whether the DEV/DEMO database is absent, compliant, non-compliant, or independently changed. Mozfer's returned DEV/DEMO results are authoritative for T001.

## Expected result sets

| Result set | What it establishes | Privacy boundary |
|---|---|---|
| 1. `table_existence` | Whether `public.app_users` resolves and its table-level RLS state | Catalog metadata only |
| 2. `locale_column_definition` | Presence, ordinal position, declared/underlying type, max length, nullability, default, identity, and generated state | Catalog metadata only |
| 3. `locale_type_enforcement` | Enum/domain-based allowed-value enforcement without a guessed object name | Catalog metadata only |
| 4. `app_users_constraints` | All table constraints, exact definitions, validation state, and locale-reference flag | Catalog metadata only |
| 5. `app_users_triggers` | All non-internal triggers, exact definitions, function identity, enabled state, and locale-reference flag | Catalog metadata only |
| 6. `existing_user_compatibility_summary` | Aggregate counts: total rows, no value, `en`, `ar`, and values outside `en`/`ar` | Aggregate counts only |
| 7. `existing_locale_value_distribution` | Aggregate-only grouping by locale value and outside-approved-set flag | No user identity or business data |

The aggregate queries read each user row through `to_jsonb(...) ->> 'locale'`. They never select a possibly absent `locale` field directly, so they remain safe when the column is absent. They must be run only after result set 1 confirms that `public.app_users` exists.

## Mozfer execution steps

1. Open the **Supabase DEV/DEMO** project’s SQL Editor. Do not use production.
2. Open `t001-app-users-locale-audit.sql`, paste it without modification, and confirm the prominent `READ-ONLY DEV/DEMO AUDIT — NO WRITES` guard comment remains present.
3. Run the packet manually. Do not add any write, migration, RPC, transaction, or temporary-object statement.
4. Capture the complete output of every result set, including empty result sets and any error text.
5. Stop immediately if Supabase reports a permission, relation, or syntax error. Return that complete error and do not attempt a workaround or write.
6. Return the complete results to the controller for T002 reconciliation. Do not infer the next task from repository files alone.

## Mozfer-executed DEV/DEMO evidence record

**Execution metadata**

- Executed manually by Mozfer in the Supabase DEV/DEMO SQL Editor.
- The approved read-only packet was used.
- No write statements were executed.
- No permission, relation, or syntax error was reported.
- The following is the supplied live result record; it is not inferred from repository files.

### 1. Table existence

```text
result_set: table_existence
table_exists: true
relation_name: app_users
```

The target table exists in the audited DEV/DEMO environment.

### 2. Locale column definition

```text
Result: Success. No rows returned.
Interpretation supplied by Mozfer: public.app_users.locale is absent.
```

The zero-row catalog result means no `locale` column definition was returned for the existing table. This is the live evidence for column absence; it is not a claim derived from the repository snapshot.

### 3. Locale enum/domain enforcement

```text
Result: Success. No rows returned.
Interpretation supplied by Mozfer: no locale column type enforcement exists because the column is absent.
```

### 4. Locale-related constraints

```text
Result: Success. No rows returned.
Interpretation supplied by Mozfer: no table constraint referencing locale exists.
```

### 5. Non-internal `app_users` triggers

```text
result_set: app_users_triggers
trigger_name: update_app_users_updated_at
enabled_state: enabled
function_name: update_updated_at_column
trigger_definition:
CREATE TRIGGER update_app_users_updated_at
BEFORE UPDATE ON app_users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column()
references_locale: false
```

The existing trigger updates timestamps only and does not validate, normalize, or otherwise reference locale.

### 6. Existing-user compatibility summary

```text
result_set: existing_user_compatibility_summary
total_user_rows: 2
no_locale_value_count: 2
outside_approved_set_count: 0
```

### 7. Existing locale value distribution

```text
locale_value: null
user_row_count: 2
is_outside_approved_set: false
```

The aggregate JSON-based inspection safely reports null for both users because the locale key is absent. It does not prove that a nullable locale column exists.

## Privacy and evidence limits

Only aggregate user counts and the null distribution were captured. No names, emails, Clerk IDs, phone numbers, UUIDs, or other user-level/business data were exposed or recorded. The record makes no claim beyond the supplied live DEV/DEMO results. Feature 004’s draft remains unapplied historical design evidence only.

## Final classification and routing

**Live classification: `COLUMN_ABSENT`**

The evidence is complete: `public.app_users` exists, the locale column-definition result is empty, no locale enforcement or locale-referencing constraint exists, the existing non-internal trigger does not reference locale, two user rows were counted, and no incompatible locale values were present.

Proceed to the separate conditional migration decision/design path at **T003**. T001 does not create migration SQL, create a migration file, review a migration, apply a migration, or authorize any database write. T002 must reconcile this record with repository history before T003 makes the conditional routing decision.

## T001 interpretation matrix

| Outcome | Evidence threshold | Required next action |
|---|---|---|
| `COLUMN_ABSENT` | Result set 1 confirms the table; result set 2 reports no locale column; aggregate evidence is captured | T002 reconciles the result, then T003 routes to conditional migration design T004. Do not create or apply a migration in T001. |
| `COLUMN_PRESENT_COMPLIANT` | Locale exists; type, null/default behavior, allowed-value enforcement, triggers/constraints, and aggregate values are all compatible with `en`/`ar` and Feature 005 requirements | T002 records the evidence, then T003 may skip migration creation and route to T010. |
| `COLUMN_PRESENT_NON_COMPLIANT` | Locale exists but has a wrong type, unsafe nullable/default behavior, no effective allowed-value enforcement, incompatible stored values, or another material safety conflict | T002 records the exact mismatch, then T003 routes to migration/remediation design T004. Do not edit a live object directly. |
| `EVIDENCE_INCOMPLETE` | Any required result set is missing, a relation/permission/syntax error occurs, or the returned material cannot establish compliance | **HOLD.** Do not assume that a migration is needed or unnecessary; obtain complete read-only evidence first. |

For this packet, the approved stored values are `en` and `ar`. A missing value may be compatible with the planned nullable/no-default model only after T002 considers the complete constraint, default, and aggregate evidence. No result is pre-classified by this document.

## Controls retained after execution

- T001 is evidence collection only; it does not authorize source implementation, migration design, migration creation, SQL application, RLS/grant changes, tests, browser smoke, staging, commit, Graphify refresh, or push.
- `app_users.clerk_user_id` remains text; no UUID cast or user-level data inspection is authorized.
- T002 must distinguish this packet’s live DEV/DEMO output from Feature 004’s unapplied draft and repository snapshot.
- T003 alone selects the safe conditional path. Missing evidence is a HOLD, not a migration assumption.
