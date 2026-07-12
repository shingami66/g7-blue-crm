# Data Model: Runtime Locale Preference

## Model Boundary

This feature introduces no business entity and does not alter Customer, Service, Quotation, Invoice, Payment, role, permission, status, calculation, or document data.

## Existing Authenticated User

Current repository model: `app_users`

| Attribute | Current state | Feature responsibility |
|---|---|---|
| `id` | UUID primary key | Server-side row identity; never accepted as locale-update input |
| `clerk_user_id` | Text, unique, required | Maps Clerk identity to the app user; never cast to UUID |
| `role` | Fixed role text | Unchanged by locale operations |
| `is_active` | Boolean | Must be active to read/update authenticated preference |
| `locale` | Not present in current schema | Future separately reviewed field for `en` or `ar` |

## Planned Locale States

### Persisted locale

- Owner: current authenticated `app_users` row.
- Allowed values: `en`, `ar`.
- Missing/invalid resolution: English.
- Durability: navigation, refresh, sign-out/sign-in, later sessions, and other devices after a successful save.
- Schema status: requires a future separately reviewed migration; no schema change is made here.

### Initial-render hint

- Owner: request/render boundary.
- Content: supported locale only; no user or business data.
- Authority: presentation hint only; authenticated persisted value wins.
- Purpose: prevent avoidable wrong-direction first paint.

### Current-session override

- Owner: current authenticated session/runtime shell.
- Content: supported locale only.
- Created: immediately when the user selects a locale.
- On save success: converges with persisted locale and initial-render hint.
- On save failure: remains active for the current authenticated session and is marked not persisted.
- On retry success: becomes persisted.
- On sign-out, identity change, or later session: cleared or ignored; last persisted locale is resolved.

## State Transitions

| From | Event | To | User-visible result |
|---|---|---|---|
| Persisted English | Select Arabic | Session Arabic / save pending | Shell immediately becomes Arabic/RTL |
| Persisted Arabic | Select English | Session English / save pending | Shell immediately becomes English/LTR |
| Save pending | Persist succeeds | Persisted selected locale | Warning absent; later sessions retain locale |
| Save pending | Persist fails | Session override / not persisted | Selected locale remains; warning and retry shown |
| Session override | Retry succeeds | Persisted selected locale | Warning clears; later sessions retain locale |
| Session override | Retry fails | Session override / not persisted | Locale remains; warning/retry remain |
| Session override | Sign-out/session change | Last persisted locale | Later session ignores failed override |
| Missing/invalid persisted locale | Resolve | English | Safe English/LTR default |

## Validation Rules

- Only normalized `en` and `ar` are valid.
- Target user identity is never input to the locale update.
- Locale update cannot include role, `is_active`, financial fields, or business data.
- Invalid locale performs no persistence.
- Same-locale retry is idempotent.
- User-entered business data and document snapshots are never translated or mutated.

## Schema Decision

A schema change is required because repository evidence shows no current `app_users.locale` field. It must be designed, reviewed, created, applied, and verified in separate controlled migration/Supabase tasks. This artifact intentionally contains no SQL.
