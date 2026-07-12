# Implementation Plan: Runtime Arabic/English Locale Switching

**Branch**: `main` | **Date**: 2026-07-11 | **Spec**: [spec.md](./spec.md)

**Input**: Feature 005 specification with locked clarifications C01-C03.

## Summary

Deliver a per-user Arabic/English runtime locale for the authenticated CRM shell and agreed V1 routes. Reuse Feature 004's typed locale, direction, dictionary, bidi, and Western-digit helpers. Persist the preference against the authenticated `app_users` row after a separately reviewed schema migration, use a server-resolved persisted locale for initial rendering, and maintain a bounded session override when persistence fails. Full Settings/Admin localization, reports, public marketing, documents, PDFs, and business-data translation remain outside scope.

## Technical Context

**Language/Version**: TypeScript with Next.js 16 App Router and React server/client components
**Primary Dependencies**: Existing Next.js, Clerk server/client auth, Supabase server admin client, and repository i18n helpers; no new dependency planned
**Storage**: Existing PostgreSQL `app_users` table after a future separately reviewed locale-column migration; no SQL is created or applied by this plan
**Testing**: Existing Node/TypeScript i18n tests plus future focused contract/component tests, lint, typecheck, build, and user-only browser smoke
**Target Platform**: Authenticated internal web CRM
**Project Type**: Next.js modular-monolith web application
**Performance Goals**: Initial authenticated shell renders with the resolved language/direction and avoids a persistent wrong-direction or mixed-language state
**Constraints**: English/Arabic only; English default; Western digits; per-user isolation; no RBAC/business behavior changes; no document/PDF coupling; no normal-runtime dependency on `G7_DEV_RTL`
**Scale/Scope**: Authenticated shell plus dashboard, customers, services, quotations, invoices, and payments routes listed below

## Constitution Check

### Pre-design gate

- PASS — `AGENTS.md` remains authoritative and no managed context block is changed.
- PASS — Planning only; no source, SQL, migration, test, dependency, Supabase, smoke, staging, commit, or push action is authorized.
- PASS — Customer Profile → Service → Quotation → Invoice → Payment remains unchanged.
- PASS — Locale does not alter financial totals, records, statuses, workflows, permissions, VAT behavior, or snapshots.
- PASS — Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, clearance, and compliance claims remain out of scope.
- PASS — PDFs/documents retain their independent snapshot language model and are excluded from UI locale switching.
- PASS — The optional `after_plan` agent-context hook is skipped.

### Post-design gate

- PASS — The design reuses existing boundaries and adds no new dependency or service.
- PASS — The missing persisted locale field is identified honestly as a future separately gated migration rather than invented as existing functionality.
- PASS — The update contract is identity-bound to the current active user and never accepts another user identifier.
- PASS — C01-C03 are preserved in route, failure, and fallback contracts.

## Architecture and Boundaries

### Existing-source integration map

| Concern | Current evidence | Planned responsibility |
|---|---|---|
| Locale type/default/parser | `src/lib/i18n/locales.ts` defines `en`, `ar`, default `en`; `getLocale()` currently always returns English | Preserve types/parser; replace constant runtime resolution with a request/auth-aware read boundary |
| Direction | `src/lib/i18n/direction.ts` maps Arabic to RTL | Keep as the only locale-to-direction mapping |
| Root language/direction | `src/app/layout.tsx` owns `<html lang>` and `<html dir>` | Resolve an initial validated locale on the server and keep root ownership of `lang`/`dir` |
| Authenticated shell | `src/app/(dashboard)/layout.tsx` loads the current app user and currently applies `G7_DEV_RTL` | Derive shell locale/direction from the resolved authenticated locale; remove the dev override from normal runtime authority |
| Selector location | `src/components/layout/Topbar.tsx` already owns the authenticated account menu | Add the selector to the account menu or adjacent authenticated shell; do not require `/settings` |
| Navigation | `src/components/layout/Sidebar.tsx` accepts shell direction but has literal labels | Feed resolved locale/direction and dictionary-backed shell labels without changing access rules |
| Auth/user loading | `src/lib/auth/permissions.ts` reads the current `app_users` row from Clerk identity | Reuse current-user resolution; never accept a browser-supplied target user ID |
| Persistence | `app_users` currently has no locale column in `supabase/schema.sql` or applied migrations | Future reviewed migration adds the approved field; later implementation updates only the current authenticated user's row |
| Dictionaries | Existing common/navigation/status dictionaries and module dictionaries for customers, services, quotations, and invoices | Preserve organization; add/complete only required shell/dashboard/payments entries and safe fallback lookup |
| Bidi/Western digits | `src/lib/i18n/bidi.ts` and `formatting.ts` provide isolation and `numberingSystem: "latn"` | Reuse them; do not localize identifiers or switch to Arabic-Indic digits |

### Runtime boundary model

1. **Persisted preference**: `app_users.locale` is the durable source of truth after the future migration. It is read only for the current authenticated user.
2. **Initial render hint**: a validated, non-sensitive locale mirror may provide the root layout's first-render hint. It is not authoritative over the authenticated database value and stores no business data.
3. **Authenticated resolution**: the dashboard boundary reconciles the initial hint with the current user's persisted locale. Invalid or missing values resolve to English.
4. **Current-session override**: selector interaction updates the mounted authenticated experience immediately. If persistence fails, an ephemeral override remains scoped to the current authenticated session, survives in-app navigation and refresh, and is cleared/ignored when the authenticated session or identity changes.
5. **Successful persistence**: success makes the selected locale the durable preference and refreshes the initial-render hint.
6. **Later session**: if persistence did not succeed, a later authenticated session resolves from the last successfully persisted locale, not the failed override.

The session override mechanism must be bound to the current authenticated session and contain only the supported locale. It must never become a second durable preference source.

## Rendering Lifecycle

### Initial request

- Root layout validates the available initial locale hint and owns `<html lang>` and `<html dir>`.
- Missing or invalid locale resolves to English/LTR.
- The authenticated layout loads the active app user and persisted locale using the existing server-side identity path.
- If the authenticated value and hint differ, the authenticated value wins and the application performs a bounded reconciliation so the visible shell settles on one language/direction.
- No business page may independently choose a conflicting direction.

### Client transition

- The selector updates the shared authenticated locale state immediately.
- Shell labels, page dictionary selection, `lang`, and `dir` transition as one logical operation.
- A short pending state is allowed; a persistent mixed-language shell is not.
- The selector is disabled or deduplicated while the same update is pending, but keyboard focus and status feedback remain accessible.

### Persistence failure

- Keep the selected locale and matching direction for the current authenticated session.
- Show localized, non-technical warning copy and a retry action.
- Do not overwrite the durable mirror as though persistence succeeded.
- Retry uses the same validated locale and same-user contract.
- Sign-out/session change clears or invalidates the ephemeral override; the next session uses the last persisted locale.

## Route Coverage

### Included Feature 005 acceptance surfaces

| Surface | Included routes/components | Acceptance boundary |
|---|---|---|
| Authenticated shell | Dashboard layout, Topbar/account menu, Sidebar, shared headers/navigation/pending state | Selector available without Settings; coherent locale and direction |
| Dashboard | `/dashboard` | Page and shared shell use active locale; business values unchanged |
| Customers | `/customers`, `/customers/[id]`, existing customer list/profile/form components | UI copy localized; entered customer data remains unchanged and bidi-safe |
| Services | `/services`, `/services/new`, `/services/[id]`, `/services/[id]/edit` | Core Service UI localized; statuses/workflow/RBAC unchanged |
| Quotations | `/quotations`, `/quotations/new`, `/quotations/[id]`, `/quotations/[id]/edit` | Non-PDF UI localized; approval and financial behavior unchanged |
| Invoices | `/invoices`, `/invoices/[id]`, existing issue/payment action UI embedded in included pages | Non-PDF UI localized; calculation, issue, and payment behavior unchanged |
| Payments | `/payments` | List/read UI localized; `payments:read` remains enforced |

Service subroutes dedicated to supplier allocations/bookings or Approved Billing Scope management retain existing behavior and permissions. They are not a license to redesign those domains; shared shell locale/direction applies, while full module-copy completion must be separately enumerated in implementation tasks if required by the final route inventory.

### Deferred or excluded surfaces

| Surface | Status |
|---|---|
| `/settings` and `/admin/users` full page localization | Deferred; selector remains in shell/account menu |
| Reports Center | Deferred/excluded |
| `/quotations/[id]/pdf`, `/invoices/[id]/pdf`, and all documents | Excluded; independent document locale/snapshot work |
| Supplier module full-page localization and Supplier Booking redesign | Outside Feature 005 acceptance |
| Public sign-in/marketing localization | Excluded unless already rendered as part of the authenticated shell |

## Update Contract

- Input is a single candidate locale; only `en` and `ar` pass validation.
- The server derives identity from Clerk and resolves the active `app_users` row; no user ID, role, permission, status, or target row is accepted from the browser.
- Authorization requires the existing `dashboard:read` shell permission, an active authenticated user, and explicit same-row ownership. All current fixed roles already hold this permission (Admin through wildcard), so no business-role capability is added or removed.
- The update is restricted to the locale field; no role, active flag, profile field, or business record is included.
- Success returns the persisted locale and direction.
- Persistence failure returns a sanitized retryable outcome; raw Supabase/auth details are not exposed.
- Unauthorized and inactive-user outcomes remain distinct and do not fake success.
- Invalid locale is rejected without persistence and the current safe locale remains active.
- Retry is idempotent for the same locale.

Detailed outcomes are defined in [contracts/locale-preference.md](./contracts/locale-preference.md).

## Dictionary and Fallback Contract

- Supported locales remain exactly `en` and `ar`; default remains `en`.
- Existing typed dictionary organization is preserved where viable.
- Lookup first attempts the active-locale value.
- Missing or unusable Arabic text falls back to the English source label.
- Raw translation keys are never rendered.
- If no usable English source label exists, render a readable generic fallback appropriate to the control/content category.
- Missing entries are reported as quality defects using safe development/observability metadata only: namespace/key/surface, never customer or financial values.
- Fallback affects wording only and never changes control availability, business logic, status, totals, or data.

Detailed rules are defined in [contracts/dictionary-fallback.md](./contracts/dictionary-fallback.md).

## Security and Privacy Design

- Per-user isolation is enforced by server-derived current identity and same-row update filtering.
- The client cannot choose another `app_users` row or submit role/permission values.
- All supported fixed roles retain identical business permissions before and after locale changes.
- Inactive or unauthenticated users cannot persist a locale preference.
- Locale is low-sensitivity preference data, but it must not be exposed across users or included in customer/business payloads.
- Logs may contain safe error categories and dictionary namespace/key metadata; they must not contain tokens, raw auth errors, customer content, financial values, or full database responses.
- Existing server-only Supabase admin-client boundary is preserved.
- No RLS broadening, public policy, client-side direct table update, or grant change is part of this feature plan.

## Schema Impact

Repository evidence shows `app_users.locale` is **not currently present** in `supabase/schema.sql` or the applied migration history. Feature 004 contains a SQL draft only; it is not an applied migration.

Therefore durable persistence requires a future separate migration workflow before runtime implementation can be complete:

1. Review current schema and existing user counts/data.
2. Draft the minimal locale-column migration and constraint using Feature 004's approved `en`/`ar` direction.
3. Review backfill/default/rerun/RLS/grant implications.
4. Create the migration only in a separately authorized migration task.
5. Apply and verify only under a separately authorized Supabase task.

No company-level default locale is required for Feature 005 because English is the locked safe default. No migration or SQL file is created by this planning task.

## Transition from `G7_DEV_RTL`

- Runtime locale/direction becomes the sole normal authority for authenticated shell direction.
- `G7_DEV_RTL` must not override a user's runtime locale.
- During implementation, either remove the dashboard-layout branch or isolate it behind an explicitly diagnostic-only path that cannot run in ordinary authenticated behavior.
- Tests must prove English and Arabic runtime behavior with the environment flag absent.
- A diagnostic override, if temporarily retained, must be development-only, visibly identified, and removed in a bounded cleanup task; two competing production direction systems are forbidden.

## Phased Implementation Strategy

1. **Migration design/review gate**: separately review and authorize the missing `app_users.locale` schema change. No runtime persistence implementation proceeds on an assumed column.
2. **Locale read/update boundary**: implement current-user locale read, validation, same-user persistence contract, sanitized outcomes, and focused tests.
3. **Rendering foundation**: make root/authenticated layouts resolve locale and direction coherently; add the session-bound override and reconciliation behavior.
4. **Selector and shell**: add accessible shell/account-menu selector, pending/warning/retry states, and dictionary-backed shell copy.
5. **Core route rollout**: complete dashboard, customers, services, quotations, invoices, and payments in small route/module slices using existing dictionaries and bidi helpers.
6. **Fallback/quality reporting**: enforce English/generic fallback and safe missing-entry defect signals.
7. **Dev override retirement**: remove or strictly isolate `G7_DEV_RTL` after runtime paths pass validation.
8. **Validation/UAT preparation**: run static/runtime gates in a later implementation task and prepare user-only English/Arabic smoke.

## Validation and Manual-Smoke Strategy

Future implementation slices must run the repository-required lint, typecheck, build, focused tests, and `git diff --check`. Browser/manual smoke remains Mozfer-owned and must cover:

- English→Arabic and Arabic→English from the authenticated shell.
- Keyboard and assistive-label operation of the selector.
- Navigation and refresh after successful persistence.
- Sign-out/sign-in and later-session restoration.
- Two users with independent preferences.
- Forced persistence failure, retry, current-session override, and later-session reversion.
- Missing Arabic label, English source fallback, generic fallback, and raw-key prohibition.
- Included route matrix in both directions.
- Western digits and bidi-safe SAR amounts, dates, document numbers, UUIDs, emails, and phone numbers.
- Unchanged role denial/visibility, calculations, statuses, records, and workflow outcomes.
- PDFs/documents unchanged by UI locale.
- Normal Arabic behavior with `G7_DEV_RTL` absent.

No smoke has been performed by this planning task.

## Risks and Rollback Considerations

| Risk | Mitigation / rollback direction |
|---|---|
| Wrong-direction first paint | Server-resolved validated hint plus authenticated reconciliation; roll back selector exposure while retaining English default |
| Failed save appears successful | Separate persisted success from session override and display explicit warning/retry |
| Cross-user preference leakage | Derive user identity server-side, same-row update only, clear/ignore override on session identity change |
| Mixed dictionaries expose raw keys | Central fallback contract and focused missing-entry tests |
| Locale changes business behavior | Dictionary-only presentation boundaries and role/financial regression tests |
| Schema unavailable | Gate runtime persistence behind separately reviewed migration; never silently fall back to fake durable storage |
| Competing `G7_DEV_RTL` direction | Remove/isolate the flag when runtime authority is introduced |
| Partial route rollout | Use explicit matrix and phased module tasks; do not claim full acceptance until every included surface passes |

Rollback must preserve the last persisted user locale data if a UI slice is disabled. A safe rollback may temporarily force English presentation, but must not delete preferences or modify business records. Database rollback, if ever needed, belongs to the separately reviewed migration plan.

## Project Structure

### Documentation (this feature)

```text
specs/005-i18n-runtime-locale/
├── spec.md
├── checklists/requirements.md
├── plan.md
├── research.md
├── data-model.md
├── contracts/
│   ├── locale-preference.md
│   └── dictionary-fallback.md
└── quickstart.md
```

### Expected future source integration areas

```text
src/
├── app/layout.tsx
├── app/(dashboard)/layout.tsx
├── app/(dashboard)/{dashboard,customers,services,quotations,invoices,payments}/
├── components/layout/{Topbar,Sidebar}.tsx
├── lib/auth/permissions.ts
└── lib/i18n/
    ├── locales.ts
    ├── direction.ts
    ├── bidi.ts
    ├── formatting.ts
    └── dictionaries/
```

**Structure Decision**: Extend the existing Next.js modular monolith and current i18n/auth boundaries. Do not create a second application, locale-prefixed route tree, new state library, or external service.

## Complexity Tracking

No constitution violation or added architectural layer requires justification.
