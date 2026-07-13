# Feature Specification: Runtime Arabic/English Locale Switching

**Feature**: `005-i18n-runtime-locale`
**Created**: 2026-07-11
**Status**: Authenticated UI acceptance complete (independent review PASS; **T032 Mozfer smoke PASS**; P5 visual remediation PASS); not production-closed; controlled commit/push process

## Clarifications

### Session 2026-07-11

- **C01 — Settings/Admin scope**: Full Settings/Admin page localization is excluded from Feature 005 acceptance. The locale selector remains available from the authenticated shell or user menu to eligible authenticated users; changing locale must not require a dedicated Settings route. Feature 005 covers the agreed V1 core authenticated CRM routes, while full Settings/Admin localization remains a later rollout item.
- **C02 — Locale preference save failure**: A newly selected locale applies immediately for the current authenticated session. A clear persistence warning and retry action are shown, and the current session keeps one consistent language and direction. If the user signs out or starts a later session before a successful save, the last successfully persisted locale is used. Save failure does not affect data, permissions, workflows, or financial behavior.
- **C03 — Missing translation fallback**: A missing translation falls back to its English source label and never exposes a raw translation key. If no usable English source exists, a readable generic fallback is shown without breaking the page; the missing translation is recorded as a quality defect for later correction, without changing application behavior.

## User Scenarios & Testing

### User Story 1 - Switch from English to Arabic (Priority: P1)

An authenticated user working in English can choose Arabic from the locale selector and continue working in Arabic without losing their current CRM context or changing any business result.

**Why this priority**: Arabic use is a core V1 requirement for authenticated CRM work; it must be usable without a development-only setting.

**Independent Test**: Sign in with an English preference, open a supported authenticated route, select Arabic, and confirm the shell, navigation, page language, and direction change while the same records, permissions, statuses, and calculated values remain available.

**Acceptance Scenarios**:

1. **Given** an authenticated user viewing a supported core CRM route in English, **When** the user selects Arabic from the authenticated shell or user menu, **Then** the visible application shell and the current route use Arabic with right-to-left direction, without requiring the user to re-authenticate or open a Settings route.
2. **Given** a user changes the locale from English to Arabic while viewing a record, **When** the change completes, **Then** the user remains in the same permitted record context and all displayed business data retains its original meaning and value.
3. **Given** Arabic is selected in normal runtime use, **When** the user navigates the authenticated CRM, **Then** Arabic behavior does not depend on `G7_DEV_RTL`.

---

### User Story 2 - Switch from Arabic to English (Priority: P1)

An authenticated user working in Arabic can choose English and immediately continue using the same CRM route in a left-to-right English interface.

**Why this priority**: Locale switching must work in both directions so each user can work in their preferred language.

**Independent Test**: Sign in with Arabic selected, switch to English on a supported route, and confirm language, direction, navigation, and record context are correct.

**Acceptance Scenarios**:

1. **Given** an authenticated user viewing a supported core CRM route in Arabic, **When** the user selects English from the authenticated shell or user menu, **Then** the visible application shell and the current route use English with left-to-right direction without requiring a Settings route.
2. **Given** the user switches from Arabic to English, **When** the page finishes updating, **Then** no persistent mixture of Arabic and English shell labels remains, except where a translation is unavailable and the defined fallback is shown.
3. **Given** the user has access only to a subset of CRM functions, **When** they change locale, **Then** the same functions remain accessible and unavailable functions remain unavailable.

---

### User Story 3 - Keep a personal locale preference (Priority: P1)

Each authenticated user’s chosen locale persists across navigation, refresh, sign-out/sign-in, and later sessions, independently of other users.

**Why this priority**: A user should not need to repeatedly reset a basic working preference, and one user’s choice must not affect another user.

**Independent Test**: Set one user to Arabic and another to English; navigate, refresh, sign out and back in, then verify each user returns to their own saved preference.

**Acceptance Scenarios**:

1. **Given** a user chooses Arabic or English, **When** they navigate between supported core CRM routes or refresh the page, **Then** the selected locale remains active.
2. **Given** a user has previously saved a locale, **When** they sign out and later sign in again, **Then** their saved locale is restored before the authenticated shell is presented for normal use.
3. **Given** two users choose different locales, **When** each user signs in, **Then** each sees their own chosen locale and neither user’s choice changes the other’s preference.

---

### User Story 4 - Work safely when language content or saving fails (Priority: P2)

An authenticated user can continue working when a translation is missing or when the locale preference cannot be saved, with a clear message and a predictable usable fallback.

**Why this priority**: A locale issue must not prevent essential CRM work or create ambiguity about what preference is in effect.

**Independent Test**: Exercise a supported route with a missing translation and simulate a failed preference save; verify the interface remains usable, the fallback is understandable, and the user can retry.

**Acceptance Scenarios**:

1. **Given** a visible interface translation is unavailable for the selected locale, **When** the affected label is shown, **Then** a readable fallback label is displayed without breaking the page layout or direction.
2. **Given** a user changes locale but their preference cannot be saved, **When** the failure is known, **Then** the newly selected locale remains active for the current session, the user receives a clear persistence warning, and a retry action is available.
3. **Given** a persistence failure occurs, **When** the user continues working or changes routes, **Then** the current session keeps one consistent language and direction and the failure does not alter permissions, records, calculations, statuses, or workflow outcomes.
4. **Given** the user signs out or starts a later session before a locale save succeeds, **When** the user returns, **Then** the last successfully persisted locale is used.

### Edge Cases

- A user has no saved preference: the authenticated experience starts in English, unless the user has selected a locale during the current sign-in experience.
- A saved preference is absent, invalid, or no longer supported: the application safely uses English and makes the locale selector available.
- The user changes locale during page loading or route navigation: the completed view uses one coherent locale and direction rather than a persistent mixed-language shell.
- A translation is missing: the English source label is displayed and the raw translation key is never shown; if no usable English source exists, a readable generic fallback is displayed and the missing translation is recorded as a quality defect. Record values, codes, and user-entered business data are not translated or altered.
- Preference saving fails because of a temporary service or network issue: the newly selected locale applies for the current session, language and direction remain consistent, the user is told that persistence may not have succeeded, and retry is available.
- The user opens a saved deep link after choosing Arabic: the supported authenticated route opens with the saved locale and correct direction.
- Arabic is active: financial values, dates, invoice numbers, codes, UUIDs, emails, and phone numbers remain readable left-to-right and do not become ambiguous because of bidirectional presentation.
- A user signs out before a pending locale change finishes: a later sign-in uses the last successfully persisted preference, or the safe English default if none was ever saved.
- Full Settings/Admin page localization is not part of Feature 005 acceptance; the locale selector remains available from the authenticated shell or user menu so a dedicated Settings route is not required.

## Requirements

### Functional Requirements

- **FR-001**: Authenticated users MUST be able to select English or Arabic through a visible locale selector that is available throughout the supported core CRM shell.
- **FR-002**: The locale selector MUST be operable with keyboard-only navigation, expose its purpose and current selection to assistive technology, and provide a discernible selected state.
- **FR-003**: English MUST be the safe default when an authenticated user has no valid saved preference.
- **FR-004**: A locale selected by an authenticated user MUST take effect for the active authenticated experience without requiring a separate sign-in.
- **FR-005**: The selected locale MUST persist across supported-route navigation, page refresh, sign-out/sign-in, and later sessions after a successful save.
- **FR-006**: Locale preferences MUST be independent for different authenticated users; a change by one user MUST NOT change another user’s preference.
- **FR-007**: The application’s page language and text direction MUST consistently reflect the active locale: English uses English and left-to-right direction; Arabic uses Arabic and right-to-left direction.
- **FR-008**: Runtime Arabic and English MUST cover the agreed V1 authenticated core CRM shell and core paths, including dashboard, customers, services, quotations, invoices, payments, and their supported authenticated detail, creation, and editing routes. Full Settings/Admin page localization is excluded from Feature 005 acceptance and remains a later rollout item.
- **FR-009**: During a locale change or route transition, the application MUST avoid leaving a persistent mixed-language shell; any short loading state MUST communicate that the language preference is being applied.
- **FR-010**: If a visible interface translation is unavailable, the application MUST show its English source label and MUST never show a raw translation key; if no usable English source exists, it MUST show a readable generic fallback without hiding controls, corrupting layout, or changing record content, and MUST record the missing translation as a quality defect for later correction.
- **FR-011**: User-entered business data MUST NOT be automatically translated as part of locale switching.
- **FR-012**: Financial values, dates, invoice numbers, codes, UUIDs, emails, and phone numbers MUST remain bidi-safe and left-to-right readable when Arabic is active.
- **FR-013**: A locale change MUST NOT change permissions, role assignments, calculations, record data, statuses, audit history, or workflow results.
- **FR-019**: When locale preference saving fails, the newly selected locale MUST remain active for the current authenticated session, with one consistent language and direction, a clear persistence warning, and a retry action.
- **FR-020**: If the user signs out or starts a later session before a locale preference save succeeds, the application MUST use the last successfully persisted locale, or the safe English default if none exists.
- **FR-021**: Locale-save failure MUST NOT change data, permissions, calculations, financial values, statuses, workflows, or other application behavior.
- **FR-022**: Missing translations MUST use the English source label when available and MUST never expose raw translation keys; when no usable English source exists, a readable generic fallback MUST be shown and the missing translation MUST be recorded as a quality defect without changing application behavior.
- **FR-023**: Full Settings/Admin page localization MUST remain outside Feature 005 acceptance, while the locale selector MUST remain reachable from the authenticated shell or user menu.
- **FR-014**: If saving a user’s locale preference fails, the application MUST explain in plain language that the current-session selection may not persist, preserve usable current-session behavior where possible, and offer a retry action.
- **FR-015**: Locale-related error and recovery messages MUST be understandable in the active locale when translations are available, with a readable fallback otherwise.
- **FR-016**: The normal runtime Arabic experience MUST NOT require `G7_DEV_RTL`; that setting remains development-only and must not determine ordinary user locale behavior.
- **FR-017**: Locale preference handling MUST use only the minimum user information required to remember the preference and MUST NOT expose one user’s preference to another user.
- **FR-018**: Locale preference changes and failures MUST be attributable in existing operational records only where the product’s established audit policy already records user preference changes; this feature MUST NOT introduce a new audit requirement or expose locale preferences as business data.

### Key Entities

- **Locale preference**: An authenticated user’s selected interface language, limited in V1 to English or Arabic.
- **Authenticated core CRM shell**: The signed-in navigation and shared interface surrounding the supported core CRM paths.
- **Interface translation**: User-interface wording supplied for a supported locale; it does not include automatic translation of user-entered business data.

## Success Criteria

### Measurable Outcomes

- **SC-001**: In acceptance testing, 100% of tested authenticated users can change between English and Arabic on a supported core CRM route and see the expected language and direction without re-authentication.
- **SC-002**: In acceptance testing, 100% of tested locale selections that save successfully remain active after navigation, refresh, sign-out/sign-in, and a later sign-in session for the same user.
- **SC-003**: In acceptance testing with at least two users assigned different choices, 100% of tested sign-ins restore the correct user’s own locale preference.
- **SC-004**: In acceptance testing of every agreed V1 authenticated core CRM path, the page language and direction match the active locale, no persistent mixed-language authenticated shell is observed, and the locale selector is reachable without requiring a Settings route; full Settings/Admin page localization is not tested as part of Feature 005.
- **SC-005**: In acceptance testing of Arabic routes, 100% of tested financial values, dates, invoice numbers, codes, UUIDs, emails, and phone numbers remain legible and unambiguous left-to-right.
- **SC-006**: In acceptance testing of a missing translation, the English source label (or readable generic fallback when no source exists) is shown and no raw key is exposed; in a preference-save failure, the newly selected locale remains active for the current session with a warning and retry, later sessions use the last successfully persisted locale, and permitted CRM work continues without changed data, permissions, calculations, financial values, statuses, or workflow results.

## Assumptions

- Feature 004 already supplies the i18n and RTL foundation; this feature specifies runtime selection and per-user preference behavior without duplicating that foundation.
- V1 supports English and Arabic for authenticated core CRM paths only.
- English is the safe initial fallback for a user without a valid saved preference.
- Existing authentication identifies the signed-in user sufficiently to keep preferences independent.
- Existing product audit practices, rather than a new audit design, govern any recording of user preference changes.
- Full Settings/Admin page localization is a later rollout item; the authenticated shell or user menu is the supported locale-selection entry point for this feature.

## Explicit Exclusions

- Bilingual documents or PDFs.
- VAT, Tax Invoice, ZATCA, or FATOORA behavior.
- Automatic translation of user-entered business data.
- Financial lifecycle, calculation, status, or workflow changes.
- RBAC or permission-model changes.
- Reports Center localization.
- Supplier Booking redesign.
- General mobile remediation unrelated to locale behavior.
- Public marketing localization, unless it is already part of the authenticated shell.
- Full Settings/Admin page localization; Settings/Admin remains a later rollout item, while the locale selector remains available from the authenticated shell or user menu.
