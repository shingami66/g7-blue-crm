# Contract: Locale Preference Read and Update

## Read Contract

**Actor**: Active authenticated CRM user.

**Resolution order**:

1. Valid current-session override bound to the same authenticated session.
2. Persisted current-user locale.
3. English safe default.

An initial-render hint may prevent flicker but cannot override a verified persisted value.

**Output**:

- `locale`: `en` or `ar`
- `direction`: `ltr` for `en`, `rtl` for `ar`
- `persistenceState`: persisted, session-only, or defaulted

No other user's preference or identifier is returned.

## Update Contract

**Input**:

- `locale`: candidate string only

The input must not accept user ID, role, permission, account status, redirect URL, or business data.

**Server checks**:

1. Resolve Clerk identity on the server.
2. Require the existing `dashboard:read` permission and an active `app_users` row.
3. Validate locale against `en`/`ar`.
4. Restrict persistence to the current user's own row and locale field.
5. Return sanitized outcome.

## Outcomes

| Outcome | Persisted state | Current-session behavior | User feedback | Retry |
|---|---|---|---|---|
| Success | Selected locale stored | Selected locale remains active | Optional confirmation; no warning | Not required |
| Retry success | Selected locale stored | Selected locale remains active | Warning clears | Complete |
| Persistence failure | Last persisted locale unchanged | Selected locale remains active and direction stays consistent | Clear persistence warning | Available |
| Invalid locale | No change | Keep current safe locale | Validation message | User selects supported value |
| Unauthorized | No change | No authenticated preference mutation | Existing unauthorized behavior | Sign in |
| Inactive/forbidden | No change | No preference mutation | Existing access-denied behavior | Not until account active |

## Idempotency and Concurrency

- Repeating the same supported locale is safe and returns the effective value.
- The latest successfully completed current-user update is the durable preference.
- A stale response must not visually overwrite a newer selector choice; pending requests are deduplicated or ordered at the client boundary.

## Security Invariants

- Identity is server-derived.
- No cross-user target is accepted.
- No business-role capability is added or removed.
- No raw database/auth error is returned.
- No customer, service, quotation, invoice, payment, or document data is logged or changed.
