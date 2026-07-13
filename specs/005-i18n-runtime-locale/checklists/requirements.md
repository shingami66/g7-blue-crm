# Specification Quality Checklist: Runtime Arabic/English Locale Switching

**Purpose**: Validate specification completeness and quality before clarification or planning.
**Created**: 2026-07-11
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details, storage mechanisms, routing schemes, or client-state choices are prescribed.
- [x] The specification focuses on authenticated-user outcomes: selecting, using, retaining, and recovering locale preferences.
- [x] The language is suitable for product and business stakeholders.
- [x] Mandatory sections are complete: scenarios, edge cases, requirements, measurable outcomes, assumptions, and exclusions.

## Requirement Completeness

- [x] No unresolved clarification markers remain; the available product truth and C01-C03 decisions support safe V1 defaults.
- [x] Functional requirements are individually testable and unambiguous enough for acceptance testing.
- [x] Success criteria are measurable and state expected pass conditions.
- [x] Success criteria are technology-agnostic and describe user-visible outcomes.
- [x] Acceptance scenarios cover switching English to Arabic, Arabic to English, persistence, independent preferences, route behavior, missing translations, persistence failures, session-only save-failure behavior, later-session fallback, and shell/user-menu locale access.
- [x] Edge cases cover absent or invalid preference, loading transitions, deep links, missing translations with English/generic fallback, save failures, sign-out timing, deferred Settings/Admin localization, and bidi-safe values.
- [x] Scope is bounded to English/Arabic runtime locale behavior for authenticated core CRM paths.
- [x] Dependencies and assumptions identify feature 004 as the completed i18n/RTL foundation and state the English fallback.

## Policy and Terminology Checks

- [x] The specification aligns with feature 004 without restating or re-specifying its completed foundation.
- [x] The specification preserves the locked V1 policy: locale does not affect permissions, calculations, records, statuses, or workflow results.
- [x] Arabic/English, locale preference, authenticated core CRM shell, and interface translation are used consistently.
- [x] Western-digit and LTR readability requirements are explicitly retained for Arabic presentation.
- [x] `G7_DEV_RTL` is correctly limited to temporary development-only behavior, not normal runtime locale selection.
- [x] Full Settings/Admin page localization is explicitly excluded from Feature 005 acceptance while locale selection remains available from the authenticated shell or user menu.
- [x] A failed save keeps the selected locale active for the current session, warns and offers retry, and uses the last successfully persisted locale in later sessions.
- [x] Missing translations use English source labels or readable generic fallbacks and never expose raw translation keys.

## Scope Exclusions

- [x] Bilingual PDFs/documents are excluded.
- [x] VAT, Tax Invoice, ZATCA, and FATOORA are excluded.
- [x] Automatic business-data translation, financial lifecycle changes, RBAC changes, Reports Center, Supplier Booking redesign, unrelated mobile work, and public marketing localization are excluded.

## Feature Readiness

- [x] Each functional requirement has a corresponding observable outcome or acceptance scenario.
- [x] Primary user journeys can be independently tested.
- [x] Failure and recovery behavior is specified without requiring a technical design.
- [x] The specification remains implementation-neutral and does not prescribe schema, migrations, cookies, URL structure, middleware, or state libraries.

## Notes

- Quality assessment: PASS. Clarifications C01-C03 resolve the V1 route boundary, save-failure session/later-session behavior, and missing-translation fallback behavior; no clarification marker remains.
- Implementation planning must preserve feature 004’s foundation and validate route coverage against the listed authenticated core CRM paths without extending the exclusions.
- **Implementation status (P5 acceptance):** Core authenticated surfaces + intentional P3 Settings/Admin localization + P5 visual remediation are accepted. Independent review PASS (no P0). Automated i18n/export tests **243/243**. **T032 Mozfer browser smoke PASS** (user evidence). PDF/document localization, Clerk sign-in/up widgets, and inventing Invoices export remain excluded. Supplier full-page redesign is a separate product task (not Feature 005 acceptance blocker). No production-readiness claim. C01 Settings/Admin exclusion was later superseded for UI copy only by approved P3 tasks—not by PDF/VAT scope expansion.
