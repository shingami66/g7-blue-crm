# Quickstart: Future Implementation Verification

This guide defines the verification sequence for later authorized implementation work. It does not claim that any check or browser smoke has been performed.

## Prerequisites

- Feature 005 implementation tasks are approved.
- The separately reviewed `app_users.locale` migration has been created, applied, and verified under its own authorized workflow before persistence testing.
- Required local environment configuration already exists; do not read or print `.env*` values.
- Test users cover at least two roles and have independent preferences.

## 1. Static Review

Confirm by focused diff/source inspection:

- only `en` and `ar` are accepted;
- English remains the default;
- root `lang`/`dir` and authenticated shell use the same effective locale;
- locale update derives the current user on the server and cannot target another user;
- only the locale preference is updated;
- raw errors and translation keys cannot reach the UI;
- Western-digit and bidi helpers remain applied;
- PDFs/documents do not consume UI session locale;
- `G7_DEV_RTL` is removed from or cannot control normal runtime behavior.

## 2. Focused Automated Checks

Run in the later implementation task, through the repository's approved compressed command path:

```text
pnpm test
pnpm lint
pnpm exec tsc --noEmit
pnpm build
git diff --check
```

Add focused tests for locale parsing/resolution, direction, update outcomes, session override behavior, fallback order, raw-key rejection, and same-user isolation. The exact test files belong to the later tasks artifact.

## 3. User-Only Browser Smoke Preparation

Mozfer's smoke matrix should include:

1. English→Arabic on `/dashboard`; verify Arabic/RTL shell without re-authentication.
2. Arabic→English; verify English/LTR shell.
3. Navigate every included route and refresh after a successful save.
4. Sign out/in and start a later session; confirm persisted locale.
5. Set two users to different locales; confirm isolation.
6. Force save failure; confirm immediate selected locale, consistent direction, warning, and retry.
7. Sign out before retry succeeds; confirm the later session uses the last persisted locale.
8. Force a missing Arabic entry; confirm English source fallback and no raw key.
9. Force missing Arabic and English entries; confirm readable generic fallback and safe defect signal.
10. Check keyboard operation, focus visibility, current-selection semantics, and warning announcement.
11. Check Western digits, SAR values, dates, invoice/quotation/service numbers, UUIDs, emails, and phone numbers in RTL.
12. Verify role visibility/denials, calculations, statuses, records, and workflows are unchanged.
13. Verify quotation/invoice PDFs remain independent of UI locale.
14. Verify normal Arabic runtime with `G7_DEV_RTL` absent.

## 4. Route Matrix

Included acceptance routes:

- `/dashboard`
- `/customers`
- `/customers/[id]`
- `/services`
- `/services/new`
- `/services/[id]`
- `/services/[id]/edit`
- `/quotations`
- `/quotations/new`
- `/quotations/[id]`
- `/quotations/[id]/edit`
- `/invoices`
- `/invoices/[id]`
- `/payments`

Deferred/excluded from full Feature 005 page-localization acceptance:

- `/settings`
- `/admin/users`
- Reports Center
- `/quotations/[id]/pdf`
- `/invoices/[id]/pdf`
- public marketing/sign-in localization
- full Supplier module and Supplier Booking redesign

The locale selector itself must remain available from the authenticated shell/account menu and must not require `/settings`.

## 5. Evidence Record

The later implementation report must record commands and raw outcomes, changed files, tracked/staged state, migration/application evidence when separately authorized, and Mozfer-provided smoke observations. Do not convert planned checks into claims without evidence.
