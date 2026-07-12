# Research: Runtime Arabic/English Locale Switching

## Repository Evidence

- `src/lib/i18n/locales.ts` already defines supported locales `en`/`ar`, safe parsing, English default, and a placeholder `getLocale()` that always returns English.
- `src/app/layout.tsx` currently owns root `lang` and `dir` through `getLocale()` and `getDirection()`.
- `src/app/(dashboard)/layout.tsx` already loads the current active app user but independently applies development RTL through `G7_DEV_RTL`.
- `src/components/layout/Topbar.tsx` contains the authenticated account menu and is the least disruptive selector location.
- `src/lib/auth/permissions.ts` derives the current `app_users` row from Clerk identity using a server-only admin client.
- `supabase/schema.sql` and applied migrations show no `locale` column on `app_users`.
- `specs/004-i18n-rtl-foundation/sql-draft.md` proposes `app_users.locale`, but project status explicitly records it as unapplied SQL-draft planning.
- Existing bidi isolation and Western-digit helpers live in `src/lib/i18n/bidi.ts` and `src/lib/i18n/formatting.ts`.
- Customers, Services, Quotations, and Invoices already have module dictionaries; shell/dashboard/payments coverage must be completed without replacing that organization.

## Decision 1: Durable locale source

**Decision**: Use `app_users.locale` as the durable per-user source after a separately reviewed migration.

**Rationale**: This matches Feature 004's locked decision and the existing current-user loading boundary. It preserves per-user behavior across devices and later sessions.

**Alternatives considered**:

- Cookie only — rejected because it is browser-specific, not reliably per-user, and can outlive sign-out.
- URL prefixes (`/ar`, `/en`) — rejected by Feature 004 and unnecessary for an authenticated internal CRM.
- Company default — rejected for Feature 005 because English is the locked default and company settings localization is deferred.

## Decision 2: Persisted preference versus current-session override

**Decision**: Separate durable persisted locale, validated initial-render hint, and ephemeral authenticated-session override.

**Rationale**: C02 requires immediate use even when persistence fails while later sessions must use the last persisted value. One storage state cannot represent both truths safely.

**Alternatives considered**:

- Revert UI immediately on save failure — rejected by C02.
- Treat failed selection as persisted in the mirror — rejected because later sessions would use an unsaved value.
- Keep override only in a leaf component — rejected because navigation would produce mixed language/direction.

## Decision 3: Initial rendering ownership

**Decision**: Root layout retains ownership of HTML `lang`/`dir`; the authenticated layout resolves the current user and reconciles the shell to the persisted/session locale.

**Rationale**: This extends current ownership, minimizes wrong-direction flash, and avoids independent page-level direction authorities.

**Alternatives considered**:

- Client-only locale after hydration — rejected because it produces avoidable wrong-language/direction first paint.
- Per-page locale reads — rejected because they increase drift and mixed-shell risk.
- Keep dashboard `G7_DEV_RTL` authority — rejected because it conflicts with normal runtime preference.

## Decision 4: Selector placement

**Decision**: Put locale selection in the authenticated shell/account menu, with eligibility based on an active authenticated shell session.

**Rationale**: Topbar already owns the account menu, all included routes share it, and C01 forbids requiring deferred Settings/Admin pages.

**Alternatives considered**:

- Settings-only selector — rejected by C01.
- Duplicate selectors on every page — rejected because it creates inconsistent state and unnecessary UI duplication.

## Decision 5: Update authorization

**Decision**: Server derives Clerk identity, requires the existing `dashboard:read` shell permission and an active authenticated user, and updates only that user's locale field. No target user ID is accepted. Business-role permissions remain unchanged.

**Rationale**: Locale is a self preference, not authority to mutate another profile or business record. Same-row ownership is the authorization boundary.

**Alternatives considered**:

- Client-side direct Supabase update — rejected because it bypasses the established server boundary and risks cross-user access.
- Admin-managed locale preference — rejected because it violates per-user self-service behavior and expands Settings/Admin scope.
- New business-role permission — rejected because Feature 005 must not change RBAC capabilities.

## Decision 6: Missing translations

**Decision**: Active locale → English source label → readable generic fallback. Never render raw keys; record safe namespace/key defect metadata.

**Rationale**: This implements C03 while keeping the page usable and business behavior unchanged.

**Alternatives considered**:

- Raw key fallback — rejected as user-hostile and explicitly forbidden.
- Blank label/control — rejected because it damages accessibility and usability.
- Automatic machine translation — rejected as out of scope and unsafe for controlled business terminology.

## Decision 7: Schema requirement

**Decision**: A future migration is genuinely required; this plan does not create it.

**Rationale**: Exact schema and migration evidence show `app_users.locale` is absent. The Feature 004 SQL draft is design evidence, not applied schema.

**Alternatives considered**:

- Pretend the draft is implemented — rejected as inaccurate.
- Persist only in browser storage — rejected because it fails later-session/per-user requirements.

## External Documentation

None used. All version-sensitive decisions required for this plan were resolved from repository source, Spec Kit artifacts, schema/migration evidence, and project guards.
