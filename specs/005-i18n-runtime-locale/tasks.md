# Tasks: Runtime Arabic/English Locale Switching

**Feature**: `005-i18n-runtime-locale`
**Mode for this artifact**: Planning only — no task below is authorized by creating this file.
**Source artifacts**: [spec.md](./spec.md), [plan.md](./plan.md), [research.md](./research.md), [data-model.md](./data-model.md), [locale contract](./contracts/locale-preference.md), [fallback contract](./contracts/dictionary-fallback.md), and [quickstart.md](./quickstart.md).

## Progress Snapshot (formal closeout after `aaf6563`)

> Feature 005 authenticated bilingual UI is **formally closed**. **T032 is PASS** (user evidence). Final automated evidence **243/243**. Not a production-readiness claim. PDF bodies and Clerk-hosted widgets remain excluded.

| Area | Status |
|---|---|
| T001–T009 schema gate + migration design/file + Mozfer DEV/DEMO apply evidence | Done (see `evidence/`; DEV/DEMO only; not production claim) |
| T010–T020 locale read/write, shell, fallback | Implemented |
| T021–T026 core modules (dashboard→payments) | Implemented |
| P3 extensions: Suppliers, Settings, Admin Users, Customers Excel chrome, `/unauthorized`, root public locale alignment | Implemented (intentional extensions beyond original C01 Settings/Admin exclusion) |
| P5 bilingual visual remediation | PASS |
| T027–T029 reconciliation / independent review | Independent review PASS (`G7_AR_UX_P4_I18N_INDEPENDENT_REVIEW_PASS`, no P0) |
| T030 static/focused tests | Automated i18n + export **243/243**; visual-acceptance + Settings included; ESLint + `tsc --noEmit` + `git diff --check` PASS |
| T031 smoke checklist prep | Folded into Mozfer T032 / P5 re-smoke sequence |
| **T032 Mozfer browser smoke** | **PASS** (`G7_AR_UX_P5_MOZFER_FOCUSED_RE_SMOKE_3_PASS`; English LTR regression PASS; global bolt PASS) |
| T033 root public locale alignment | Done (`G7_AR_UX_P4_ROOT_PUBLIC_LOCALE_ALIGNED`) |
| Controlled commit | `aaf6563 fix(i18n): complete bilingual visual acceptance` |
| Controlled push | Done — `main` / `origin/main` = `aaf6563` (0/0) |
| Formal closeout docs | `G7-AR-UX-FEATURE-005-CLOSEOUT-DOCS-SYNC` |
| Commercial-language UAT approval | Still deferred (separate from Feature 005 formal close) |

## Controller Boundaries

- Every future task must use its stated execution mode and guards; this task list does not authorize implementation, SQL, tests, browser smoke, staging, commit, Graphify refresh, or push.
- `app_users.locale` is a conditional database prerequisite. It must be confirmed against live DEV evidence before any migration is designed or created.
- A database audit, migration design, migration creation, migration review, DEV apply, and post-apply verification are separate tasks.
- Browser smoke is Mozfer-only. Agents may prepare checklists but must not claim human smoke evidence.
- Original Feature 005 core excluded full Settings/Admin from acceptance (C01). **Intentional P3 tasks later localized Settings and Admin Users** under G7-AR-UX-P3; that does not authorize Reports Center, document/PDF localization, Supplier Booking redesign, VAT/Tax Invoice/ZATCA/FATOORA, automatic business-data translation, unrelated mobile remediation, financial lifecycle changes, or RBAC redesign unless separately approved.
- Phase-oriented task IDs are intentional because this feature crosses database, rendering, security, module, review, and closure boundaries. User-scenario traceability is maintained through the requirement and acceptance-criterion mappings below; this convention does not authorize broad implementation.

## Dependency Map

```text
T001 → T002 → T003 ──┬─ (column present/compliant) ────────────────┐
                     └─ (column absent/non-compliant) T004→T005→T006→T007→T008→T009 ─┤
                                                                                         ↓
T010 → T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020
                                                                                         ↓
                                                               [T021, T022, T023, T024, T025, T026]
                                                                                         ↓
                                                                                        T027
                                                                                  ┌──────┴──────┐
                                                                                 T028          T029
                                                                                  └──────┬──────┘
                                                                                         ↓
                                                                                T030 → T031 → T032
                                                                                         ↓
                                                                        T033 if findings require a fix
                                                                                         ↓
                                                                                        T034 → T035 → T036 → T037 → T038 → T039 → T040
```

`[P]` marks tasks that may run in parallel only after all listed dependencies are complete and only if their actual file lists remain non-overlapping.

Each task's `Dependencies` and `Expected next task` fields remain authoritative if an implementation finding changes the conditional path.

## Phase 0 — Truth and Prerequisites

### T001 — Live DEV schema truth audit

- [ ] T001 Read-only audit of live Supabase DEV/DEMO `app_users` locale schema using an approved verification packet; likely files: `supabase/schema.sql`, `supabase/migrations/`, and Mozfer-provided DEV schema evidence.
  - **Purpose**: Determine whether `public.app_users.locale` exists, its data type, nullable/default behavior, allowed-value constraint or equivalent enforcement, and whether existing user values are compatible.
  - **Dependencies**: None.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-migration-review`, `g7-security-hardening-guard`.
  - **Validation**: The agent prepares an approved read-only SQL verification packet; Mozfer executes only the read-only queries in the Supabase SQL Editor. Raw results inspect column existence, data type, nullable/default behavior, allowed values, and existing-user compatibility. No `INSERT`, `UPDATE`, `ALTER`, migration apply, RPC mutation, or other write is permitted. Database unavailability or incomplete evidence produces HOLD, not a migration assumption.
  - **Manual smoke**: Mozfer owns the DEV/DEMO SQL Editor execution; no browser smoke.
  - **Exclusions**: No migration, SQL write, schema edit, Supabase mutation, RPC mutation, or implementation.
  - **Expected next task**: T002.

### T002 — Reconcile schema audit with repository history

- [ ] T002 Reconcile T001 evidence with `specs/004-i18n-rtl-foundation/sql-draft.md`, `supabase/schema.sql`, and locale-related migration history.
  - **Purpose**: Establish one authoritative conclusion: already present, absent, or inconsistent/blocked.
  - **Dependencies**: T001.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-migration-review`, `g7-speckit-plan-guard`.
  - **Validation**: Written evidence distinguishes unapplied Feature 004 SQL draft from live DEV schema; no mutation occurs.
  - **Manual smoke**: None.
  - **Exclusions**: No decision by assumption, no migration creation, no apply.
  - **Expected next task**: T003.

### T003 — Conditional migration decision gate

- [ ] T003 Record the locale-column decision from T001–T002 in a controlled review report; likely files: `specs/005-i18n-runtime-locale/data-model.md` only if separately authorized for a factual reconciliation update.
  - **Purpose**: Route work either directly to runtime foundation when the field is present and compliant, or to Phase 1 when it is absent/non-compliant.
  - **Dependencies**: T002.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-migration-review`, `g7-blue-crm-product-erp-reviewer`, `g7-security-hardening-guard`.
  - **Validation**: Explicit PASS/HOLD decision states schema evidence, safe next task, and no invented schema claim.
  - **Manual smoke**: None.
  - **Exclusions**: No source, migration, or DEV apply.
  - **Expected next task**: T010 if column is present/compliant; T004 if absent or non-compliant.

## Phase 1 — Conditional Database Prerequisite (only if T003 requires it)

### T004 — Locale migration design only

- [ ] T004 Design the minimal `app_users.locale` migration in a review report; likely files: `specs/005-i18n-runtime-locale/` planning artifact only, no SQL file.
  - **Purpose**: Specify approved values `en`/`ar`, safe English/default handling, existing-user treatment, constraint/index/RLS/grant impact, and rollback direction.
  - **Dependencies**: T003 outcome: column absent/non-compliant.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-migration-review`, `g7-security-hardening-guard`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Proposed SQL text is reviewed in prose/report before any migration file exists; no SQL runs.
  - **Manual smoke**: None.
  - **Exclusions**: No migration file, apply, grant broadening, role/permission change, or company default locale.
  - **Expected next task**: T005.

### T005 — Pre-creation migration and security review

- [ ] T005 Review proposed locale migration text for data safety, RLS/grants, and per-user isolation; likely files: T004 review report only.
  - **Purpose**: Approve, require changes, or block creation before a timestamped migration is written.
  - **Dependencies**: T004.
  - **Guards**: `g7-crm-migration-review`, `g7-security-hardening-guard`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Review covers existing rows, default/backfill, CHECK constraint, trigger preservation, RLS, grants, rollback, and confirmation that `clerk_user_id` remains text.
  - **Manual smoke**: None.
  - **Exclusions**: No migration creation or SQL execution.
  - **Expected next task**: T006 on approval; otherwise a narrow T004 correction.

### T006 — Create reviewed migration

- [ ] T006 Create one new timestamped locale migration at `supabase/migrations/<timestamp>_add_app_users_locale.sql` from the approved T005 text.
  - **Purpose**: Add only the reviewed locale persistence prerequisite.
  - **Dependencies**: T005 approved.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-migration-review`, `g7-security-hardening-guard`.
  - **Validation**: Migration contains only reviewed schema changes; no applied migration is edited; `git diff --check` passes.
  - **Manual smoke**: None.
  - **Exclusions**: No apply, RPC, RLS broadening, source implementation, role/permission change, or document locale field.
  - **Expected next task**: T007.

### T007 — Migration-file review

- [ ] T007 Review `supabase/migrations/<timestamp>_add_app_users_locale.sql` against T005 approval and live-schema evidence.
  - **Purpose**: Confirm file text, constraints, defaults/backfill, RLS/grants, and rollback considerations before DEV apply.
  - **Dependencies**: T006.
  - **Guards**: `g7-crm-migration-review`, `g7-security-hardening-guard`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Verdict explicitly reports SQL was not run and identifies exact DEV apply prerequisites.
  - **Manual smoke**: None.
  - **Exclusions**: No SQL execution or source task.
  - **Expected next task**: T008 on approval; otherwise a narrow T006 fix.

### T008 — Mozfer DEV/DEMO apply plan

- [ ] T008 Prepare the Mozfer-owned DEV/DEMO migration apply and verification checklist; likely files: approved migration file and its review evidence only.
  - **Purpose**: Separate human/authorized apply from migration design and make rollback/verification observable.
  - **Dependencies**: T007 approved.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-migration-review`, `g7-security-hardening-guard`.
  - **Validation**: Checklist includes backup/rollback awareness, exact apply target, and post-apply schema checks; no apply is performed.
  - **Manual smoke**: Mozfer owns DEV/DEMO apply observation.
  - **Exclusions**: No agent apply, production apply, runtime implementation, or browser smoke.
  - **Expected next task**: T009 after Mozfer/authorized apply evidence exists.

### T009 — Post-apply locale schema verification

- [ ] T009 Read-only verify the applied DEV locale column and access constraints; likely files: `supabase/schema.sql` reference and Mozfer-provided DEV verification evidence.
  - **Purpose**: Confirm field availability, approved values, existing-user safety, and unchanged role/permission model before application work.
  - **Dependencies**: T008 and authorized DEV apply evidence.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-migration-review`, `g7-security-hardening-guard`.
  - **Validation**: Raw read-only evidence confirms the exact schema outcome and no unexpected grants/RLS changes.
  - **Manual smoke**: None.
  - **Exclusions**: No application implementation, SQL write, or data mutation.
  - **Expected next task**: T010.

## Phase 2 — Locale Resolution Foundation

### T010 — Implement persisted locale read boundary

- [ ] T010 Implement current-user persisted locale resolution in `src/lib/i18n/locales.ts` and `src/lib/auth/permissions.ts`.
  - **Purpose**: Resolve only supported current-user locale values, use English for absent/invalid values, and avoid cross-user reads.
  - **Dependencies**: T003 if schema is present/compliant, otherwise T009.
  - **Guards**: `g7-crm-agent-control`, `g7-security-hardening-guard`, `g7-crm-erp-guard`.
  - **Validation**: Focused unit tests prove `en`/`ar` parsing, safe default, server identity derivation, and no user-ID input.
  - **Manual smoke**: None; browser validation is deferred to T034.
  - **Exclusions**: No selector, migration, RBAC change, document locale, or direct client database access.
  - **Expected next task**: T011.

### T011 — Implement root and authenticated locale/direction ownership

- [ ] T011 Implement coherent initial `lang`/`dir` resolution in `src/app/layout.tsx` and `src/app/(dashboard)/layout.tsx`.
  - **Purpose**: Keep root HTML ownership, reconcile authenticated persisted locale, and prevent persistent mixed-language or wrong-direction shell state.
  - **Dependencies**: T010.
  - **Guards**: `g7-crm-agent-control`, `g7-security-hardening-guard`, `g7-crm-erp-guard`.
  - **Validation**: Focused rendering tests cover English default, Arabic RTL, invalid preference fallback, and no independent shell direction authority.
  - **Manual smoke**: None; prepare observable states for T034.
  - **Exclusions**: No module localization, Settings/Admin page localization, or `G7_DEV_RTL` normal-runtime override.
  - **Expected next task**: T012.

### T012 — Implement bounded current-session override model

- [ ] T012 Implement the authenticated session locale provider/state boundary in `src/components/i18n/LocaleProvider.tsx` and `src/app/(dashboard)/layout.tsx`.
  - **Purpose**: Apply a selected locale immediately, survive authenticated navigation/refresh as required, and clear/ignore an unsaved override on sign-out or session identity change.
  - **Dependencies**: T011 and [locale contract](./contracts/locale-preference.md).
  - **Guards**: `g7-crm-agent-control`, `g7-security-hardening-guard`.
  - **Validation**: Focused tests cover persisted/default/session-only state transitions and stale-identity rejection.
  - **Manual smoke**: None; persistence-failure scenario is reserved for T034.
  - **Exclusions**: No new state library, durable browser-only preference, or business-data storage.
  - **Expected next task**: T013.

### T013 — Retire normal-runtime `G7_DEV_RTL` authority

- [ ] T013 Remove or strictly diagnostic-isolate the normal-runtime `G7_DEV_RTL` branch in `src/app/(dashboard)/layout.tsx`.
  - **Purpose**: Ensure persisted/session locale is the sole ordinary authenticated direction authority.
  - **Dependencies**: T011–T012.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-erp-guard`.
  - **Validation**: Focused tests/static inspection prove Arabic runtime works without the environment flag and the flag cannot override a user preference in ordinary use.
  - **Manual smoke**: None; checked by Mozfer in T034.
  - **Exclusions**: No environment configuration change, dev-server startup, or broad shell redesign.
  - **Expected next task**: T014.

## Phase 3 — Preference Update Contract

### T014 — Implement validated self-preference update action

- [ ] T014 Implement the locale update boundary in `src/lib/i18n/actions.ts` and `src/lib/i18n/schemas.ts`.
  - **Purpose**: Accept only a candidate locale, derive current Clerk identity server-side, require the existing `dashboard:read` shell permission, and update only the active user's locale field.
  - **Dependencies**: T010 and [locale contract](./contracts/locale-preference.md).
  - **Guards**: `g7-crm-agent-control`, `g7-security-hardening-guard`.
  - **Validation**: Focused tests prove success, invalid locale, unauthenticated/inactive/forbidden outcomes, no cross-user parameter, and sanitized failures.
  - **Manual smoke**: None.
  - **Exclusions**: No role/permission changes, client-side direct update, raw database errors, or mutation of profile/business fields.
  - **Expected next task**: T015.

### T015 — Implement persistence outcome bridge and retry

- [ ] T015 Connect update outcomes to the session provider in `src/components/i18n/LocaleProvider.tsx` and `src/lib/i18n/actions.ts`.
  - **Purpose**: Distinguish persisted success from session-only failure, preserve selected locale/direction on failure, expose retry, and return later sessions to last persisted locale.
  - **Dependencies**: T012, T014, and [locale contract](./contracts/locale-preference.md).
  - **Guards**: `g7-crm-agent-control`, `g7-security-hardening-guard`.
  - **Validation**: Tests cover success, retry success, retry failure, request ordering, sign-out/session change, and stale response handling.
  - **Manual smoke**: None; user failure path is deferred to T034.
  - **Exclusions**: No fake success, durable write on failure, cross-user state, or business workflow change.
  - **Expected next task**: T016.

### T016 — Review update-action security boundary

- [ ] T016 Review the locale action/provider diff in `src/lib/i18n/actions.ts`, `src/lib/i18n/schemas.ts`, and `src/components/i18n/LocaleProvider.tsx`.
  - **Purpose**: Independently check identity derivation, same-row restriction, authorization, input validation, error sanitization, privacy, and no RBAC drift.
  - **Dependencies**: T014–T015.
  - **Guards**: `g7-security-hardening-guard`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Verdict separates required fixes from optional improvements and confirms no SQL was run.
  - **Manual smoke**: None.
  - **Exclusions**: No implementation change; required fixes route through a narrow follow-up before Phase 4.
  - **Expected next task**: T017 on pass, or a narrow corrective task followed by re-review.

## Phase 4 — Authenticated Shell Control

### T017 — Add accessible locale selector to account menu

- [ ] T017 Implement selector controls and localized status copy in `src/components/layout/Topbar.tsx`, `src/components/i18n/LocaleProvider.tsx`, and `src/lib/i18n/dictionaries/{common,navigation}.ts`.
  - **Purpose**: Provide English/Arabic selection from the authenticated shell/account menu without requiring deferred Settings/Admin routes.
  - **Dependencies**: T016 and [locale contract](./contracts/locale-preference.md).
  - **Guards**: `g7-crm-agent-control`, `g7-security-hardening-guard`, `g7-crm-erp-guard`.
  - **Validation**: Focused component tests check keyboard operation, focus order, selected state, accessible name, pending state, warning, and retry action.
  - **Manual smoke**: None; selector interaction is Mozfer-owned in T034.
  - **Exclusions**: No `/settings` dependency, Admin-only control, public selector, or role capability change.
  - **Expected next task**: T018.

### T018 — Localize shared authenticated shell safely

- [ ] T018 Implement active-locale shell labels/direction in `src/components/layout/Sidebar.tsx`, `src/components/layout/Topbar.tsx`, and `src/lib/i18n/dictionaries/navigation.ts`.
  - **Purpose**: Keep shell navigation, account-menu labels, loading/warning copy, and directional icons coherent with the selected locale.
  - **Dependencies**: T017 and [fallback contract](./contracts/dictionary-fallback.md).
  - **Guards**: `g7-crm-agent-control`, `g7-crm-erp-guard`.
  - **Validation**: Focused tests/static review cover RTL/LTR placement, mirrored directional icons only, unchanged nav routes/visibility, and fallback copy.
  - **Manual smoke**: None; covered in T034 route walkthrough.
  - **Exclusions**: No Settings/Admin page localization, permission change, supplier redesign, or broad visual redesign.
  - **Expected next task**: T019.

## Phase 5 — Dictionary and Fallback Behavior

### T019 — Implement safe dictionary lookup/fallback helper

- [ ] T019 Implement active-locale, English-source, and generic fallback resolution in `src/lib/i18n/fallback.ts` and `src/lib/i18n/dictionaries/`.
  - **Purpose**: Enforce C03 consistently and prevent raw translation keys from reaching the UI.
  - **Dependencies**: T010 and [fallback contract](./contracts/dictionary-fallback.md).
  - **Guards**: `g7-crm-agent-control`, `g7-security-hardening-guard`.
  - **Validation**: Unit tests cover usable Arabic, missing Arabic, missing Arabic/English, whitespace, raw-key rejection, and unchanged control behavior.
  - **Manual smoke**: None; forced fallback observation belongs to T034.
  - **Exclusions**: No machine translation, customer-data translation, blank controls, or document dictionary change.
  - **Expected next task**: T020.

### T020 — Add safe missing-entry defect reporting

- [ ] T020 Add bounded missing-translation quality reporting in `src/lib/i18n/fallback.ts` and the approved repository logging boundary.
  - **Purpose**: Record only namespace/key/surface/locale/fallback tier so missing copy can be corrected without logging sensitive CRM data.
  - **Dependencies**: T019 and [fallback contract](./contracts/dictionary-fallback.md).
  - **Guards**: `g7-crm-agent-control`, `g7-security-hardening-guard`.
  - **Validation**: Tests/review prove report payload excludes user-entered text, customer data, financial values, credentials, tokens, raw errors, and document content.
  - **Manual smoke**: None.
  - **Exclusions**: No external observability vendor, secret/config change, production logging claim, or automatic translation.
  - **Expected next task**: T021.

## Phase 6 — Core V1 Surfaces

### T021 — Localize dashboard surface

- [ ] T021 [P] Implement dashboard locale usage in `src/app/(dashboard)/dashboard/` and its existing dictionary files.
  - **Purpose**: Apply active locale to dashboard UI while retaining existing data, RBAC, metrics, and bidi-safe values.
  - **Dependencies**: T013, T018–T020.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-erp-guard`, `g7-security-hardening-guard`.
  - **Validation**: Focused tests/static inspection cover English/Arabic labels, LTR values, and unchanged `dashboard:read` behavior.
  - **Manual smoke**: None; dashboard walkthrough is Mozfer-only in T034.
  - **Exclusions**: No reporting redesign, calculation change, or Settings/Admin localization.
  - **Expected next task**: T028.

### T022 — Localize customers surface

- [ ] T022 [P] Implement customer route locale usage in `src/app/(dashboard)/customers/` and `src/lib/i18n/dictionaries/customers.ts`.
  - **Purpose**: Localize supported customer UI while keeping user-entered names, emails, phones, identifiers, and business data unaltered and bidi-safe.
  - **Dependencies**: T013, T018–T020.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-erp-guard`, `g7-security-hardening-guard`.
  - **Validation**: Focused tests/static review cover fallback, LTR identifiers, unchanged `customers:*` permissions, and unchanged forms/actions.
  - **Manual smoke**: None; customer routes are Mozfer-only in T034.
  - **Exclusions**: No customer preferred-language field, schema change, automatic translation, or mobile remediation.
  - **Expected next task**: T028.

### T023 — Localize services surface

- [ ] T023 [P] Implement service route locale usage in `src/app/(dashboard)/services/` and `src/lib/i18n/dictionaries/services.ts`.
  - **Purpose**: Localize core Service list/create/detail/edit UI while preserving Service status machine, workflow, supplier-cost redaction, and bidi-safe values.
  - **Dependencies**: T013, T018–T020.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-erp-guard`, `g7-security-hardening-guard`.
  - **Validation**: Focused tests/static review cover service numbers/SAR/date isolation, unchanged guarded transitions, and no supplier booking redesign.
  - **Manual smoke**: None; core Service routes are Mozfer-only in T034.
  - **Exclusions**: No supplier allocation/booking redesign, financial lifecycle change, or workflow automation.
  - **Expected next task**: T028.

### T024 — Localize quotations surface

- [ ] T024 [P] Implement quotation route locale usage in `src/app/(dashboard)/quotations/` and `src/lib/i18n/dictionaries/quotations.ts`.
  - **Purpose**: Localize non-PDF quotation list/create/detail/edit UI while preserving Service linkage, approval, totals, statuses, and document behavior.
  - **Dependencies**: T013, T018–T020.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-erp-guard`, `g7-security-hardening-guard`.
  - **Validation**: Focused review covers quotation numbers/SAR/date safety, unchanged `quotations:approve`, and no PDF locale coupling.
  - **Manual smoke**: None; quotation routes are Mozfer-only in T034.
  - **Exclusions**: No quotation PDF localization, financial calculation change, or standalone quotation workflow.
  - **Expected next task**: T028.

### T025 — Localize invoices surface

- [ ] T025 [P] Implement invoice route locale usage in `src/app/(dashboard)/invoices/` and `src/lib/i18n/dictionaries/invoices.ts`.
  - **Purpose**: Localize non-PDF invoice list/detail and embedded action UI while preserving financial totals, issue/payment behavior, and document snapshots.
  - **Dependencies**: T013, T018–T020.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-erp-guard`, `g7-security-hardening-guard`.
  - **Validation**: Focused review covers invoice/SAR/date LTR readability, unchanged invoice permissions/calculations, and PDF exclusion.
  - **Manual smoke**: None; invoice routes are Mozfer-only in T034.
  - **Exclusions**: No Tax Invoice/VAT/ZATCA/FATOORA behavior, PDF localization, or lifecycle change.
  - **Expected next task**: T028.

### T026 — Localize payments surface

- [ ] T026 [P] Implement payment route locale usage in `src/app/(dashboard)/payments/` and its existing/new payment dictionary module.
  - **Purpose**: Localize payment read UI while preserving `payments:read`, amounts/dates/identifiers, and all payment workflow behavior.
  - **Dependencies**: T013, T018–T020.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-erp-guard`, `g7-security-hardening-guard`.
  - **Validation**: Focused review covers Western digits, bidi-safe values, fallback, and unchanged access-denied behavior.
  - **Manual smoke**: None; payment route is Mozfer-only in T034.
  - **Exclusions**: No payment mutation redesign, financial lifecycle change, or reports work.
  - **Expected next task**: T028.

### T027 — Cross-module route-matrix reconciliation

- [ ] T027 Reconcile implemented surfaces with `specs/005-i18n-runtime-locale/plan.md`, `quickstart.md`, and module diffs.
  - **Purpose**: Confirm every included route is addressed once and excluded routes remain excluded before review.
  - **Dependencies**: T021–T026.
  - **Guards**: `g7-crm-agent-control`, `g7-blue-crm-product-erp-reviewer`, `g7-security-hardening-guard`.
  - **Validation**: Matrix confirms no full Settings/Admin, Reports, PDF/document, Supplier Booking, VAT, or business-data translation scope leaked in.
  - **Manual smoke**: None; prepares T034.
  - **Exclusions**: No implementation, docs sync, or acceptance claim.
  - **Expected next task**: T028.

## Phase 7 — Independent Review and Validation

### T028 — Independent clean-code and product/i18n review

- [ ] T028 Review locale implementation diff across `src/lib/i18n/`, `src/app/`, and `src/components/layout/`.
  - **Purpose**: Check design consistency, source boundaries, dictionary organization, accessibility states, route scope, and invariant preservation.
  - **Dependencies**: T027.
  - **Guards**: `clean-code-guard`, `g7-blue-crm-product-erp-reviewer`, `g7-crm-erp-guard`.
  - **Validation**: Verdict identifies required fixes separately from optional improvements; no staging/commit.
  - **Manual smoke**: None.
  - **Exclusions**: No edits; any required correction becomes a narrow task before re-review.
  - **Expected next task**: T029.

### T029 — Independent security/RBAC review

- [ ] T029 [P] Review locale read/update, session override, and fallback logging paths in `src/lib/i18n/`, `src/lib/auth/permissions.ts`, and `src/components/i18n/`.
  - **Purpose**: Verify server identity, existing permission check, same-row update, session isolation, sanitization, and safe defect metadata.
  - **Dependencies**: T027.
  - **Guards**: `g7-security-hardening-guard`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Verdict covers auth/RBAC, direct-client-write prohibition, RLS/grant non-changes, secrets, logging, and no raw errors.
  - **Manual smoke**: None.
  - **Exclusions**: No source edits, migration, RLS change, or production-readiness claim.
  - **Expected next task**: T030.

### T030 — Run static validation and focused tests

- [ ] T030 Run focused locale tests plus `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, and `git diff --check` for the approved implementation diff.
  - **Purpose**: Produce repeatable evidence for parsing, resolution, update outcomes, session override, fallback, and build safety.
  - **Dependencies**: T028 and T029 pass.
  - **Guards**: `g7-crm-agent-control`, `test-guard`.
  - **Validation**: Preserve raw command output; HOLD on any failure; do not claim browser smoke.
  - **Manual smoke**: None.
  - **Exclusions**: No dev server, Supabase command, staging, or commit.
  - **Expected next task**: T031.

### T031 — Prepare Mozfer browser-smoke checklist

- [ ] T031 Prepare a focused user-only locale smoke checklist from `specs/005-i18n-runtime-locale/quickstart.md` and actual implementation routes.
  - **Purpose**: Translate the acceptance matrix into observable English/Arabic, failure/retry, persistence, fallback, bidi, and invariance checks.
  - **Dependencies**: T030 pass.
  - **Guards**: `g7-crm-agent-control`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Checklist names included routes and excluded PDFs/Settings/Admin; no smoke is run by the agent.
  - **Manual smoke**: Mozfer owns execution.
  - **Exclusions**: No dev server, browser automation, data creation, or implementation.
  - **Expected next task**: T032.

### T032 — Mozfer browser smoke

- [x] T032 Mozfer performs the prepared browser smoke on included authenticated routes. **STATUS: PASS** — user-provided evidence: `G7_AR_UX_P5_MOZFER_FOCUSED_RE_SMOKE_3_PASS`, English LTR browser regression PASS, existing global lightning bolt PASS (after P5 visual remediation).
  - **Purpose**: Obtain human evidence for selector accessibility, route coverage, persistence, failure/retry, fallback, bidi, and unchanged CRM behavior.
  - **Dependencies**: T031 and a running environment chosen by Mozfer.
  - **Guards**: User-owned manual smoke; `g7-crm-agent-control` reporting discipline.
  - **Validation**: Record only Mozfer-provided observations, route examples, and deviations; distinguish DEV/DEMO from production.
  - **Manual smoke**: Mozfer-only.
  - **Exclusions**: No agent invention of smoke; no production claim; no PDF-body or Clerk-widget localization claim; no feature expansion.
  - **Expected next task**: controlled acceptance commit / push process (P5 final acceptance).

### T033 — Narrow remediation task

- [x] T033 Create and execute one bounded fix task per confirmed T028–T032 finding; likely files: only the specific finding's source/test files. **(Root public locale alignment `G7-AR-UX-P4-ROOT-PUBLIC-LOCALE-ALIGNED` closed independent-review P1 for inactive html lang/dir. Further T032 findings may spawn additional T033 slices.)**
  - **Purpose**: Prevent review/smoke feedback from expanding into a broad rewrite.
  - **Dependencies**: A concrete required finding from T028, T029, T030, or T032.
  - **Guards**: `g7-crm-agent-control` plus the guards named by the finding; `g7-security-hardening-guard` for auth/logging; `g7-crm-erp-guard` for workflow/UI impacts.
  - **Validation**: Focused regression evidence, `git diff --check`, and re-run of only affected review/static/smoke preparation items.
  - **Manual smoke**: Mozfer-only if the finding is user-visible.
  - **Exclusions**: No unrelated cleanup, schema change without a new gate, or automatic rework of other modules.
  - **Expected next task**: T034.

### T034 — Re-review and revalidate after narrow fixes

- [ ] T034 Re-run affected product/security reviews and static validation after T033; likely files: review evidence and focused implementation diff.
  - **Purpose**: Close only confirmed required findings before acceptance reconciliation.
  - **Dependencies**: T033 when fixes were required; otherwise T032 pass.
  - **Guards**: `g7-blue-crm-product-erp-reviewer`, `g7-security-hardening-guard`, `clean-code-guard`, `test-guard` as applicable.
  - **Validation**: Evidence shows each blocking finding resolved or explicitly held; no unstated browser smoke claim.
  - **Manual smoke**: Mozfer repeats only affected user-visible checks when required.
  - **Exclusions**: No staging, commit, docs sync, or scope expansion.
  - **Expected next task**: T035.

## Phase 8 — Documentation and Controlled Closure

### T035 — Feature acceptance and checklist reconciliation

- [ ] T035 Reconcile `specs/005-i18n-runtime-locale/spec.md` and `specs/005-i18n-runtime-locale/checklists/requirements.md` with verified implementation/review evidence.
  - **Purpose**: Mark only evidence-backed acceptance/checklist outcomes and preserve unresolved limitations honestly.
  - **Dependencies**: T034 pass and Mozfer smoke evidence where required.
  - **Guards**: `g7-crm-agent-control`, `docs-guard`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Exact feature docs only; no assertion exceeds raw validation or user-provided smoke evidence.
  - **Manual smoke**: Reference Mozfer observations only.
  - **Exclusions**: No canonical-doc sync, selector reset, commit, or feature expansion.
  - **Expected next task**: T036.

### T036 — Canonical documentation sync

- [x] T036 Update applicable `docs/project-status.md`, `docs/project-roadmap.md`, and `docs/deferred-decisions.md` after accepted Feature 005 evidence.
  - **Historical note:** First landed as `G7-AR-UX-P4-I18N-DOCS-SYNC`, which recorded independent-review PASS and residuals while **T032 was still HOLD** and controlled commit/push were still pending. That P4 narrative is historical only.
  - **Current closeout:** Canonical docs now record T032 PASS, P5 PASS, final automated evidence **243/243**, pushed commit `aaf6563`, and formal Feature 005 close via `G7-AR-UX-FEATURE-005-CLOSEOUT-DOCS-SYNC`.
  - **Purpose**: Keep canonical status, V1 scope, unresolved exclusions, and process state accurate.
  - **Dependencies**: T035.
  - **Guards**: `g7-crm-agent-control`, `docs-guard`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Documentation staleness audit; no claims beyond verified DEV/DEMO evidence; `git diff --check` passes.
  - **Manual smoke**: None; cite existing user evidence only.
  - **Exclusions**: No implementation, migration, selector reset, staging, or commit in docs-only closeout.
  - **Expected next task**: Team Lead prioritization of the next non–Feature-005 product task from the roadmap backlog (T037–T040 process items are obsolete once Feature 005 is already committed/pushed).

### T037 — Restore temporary selector before commit

- [ ] T037 Restore-only task for `.specify/feature.json` after acceptance reconciliation and canonical docs sync.
  - **Purpose**: Restore `.specify/feature.json` exactly to its HEAD value before any commit while preserving all intended Feature 005 and documentation changes.
  - **Dependencies**: T035 and T036.
  - **Guards**: `g7-crm-agent-control`, `g7-speckit-plan-guard`, `g7-blue-crm-product-erp-reviewer`.
  - **Validation**: Restore only `.specify/feature.json`; verify it matches `HEAD` exactly, is absent from `git diff --name-only`, is absent from the staged file list, intended Feature 005/docs changes remain intact, and no unrelated file changed. HOLD on unexpected selector state or any additional file change.
  - **Manual smoke**: None.
  - **Exclusions**: Do not restore, remove, edit, stage, or commit any Feature 005 artifact or documentation file. Explicitly forbid staging, commit, Graphify refresh, and push.
  - **Expected next task**: T038.

### T038 — Controlled commit-only task

- [ ] T038 Stage only the exact approved Feature 005 and documentation files and commit them in `COMMIT_ONLY` mode.
  - **Purpose**: Create a reviewable commit only after the file list and evidence are explicitly approved.
  - **Dependencies**: Successful T037 selector restoration and explicit user-approved file list/message.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-precommit-gate`.
  - **Validation**: Exact staging excludes `.specify/feature.json`; verify the selector is absent from the working-tree diff, staged diff, and final commit. Capture cached diff/stat/check, commit hash, and post-commit status.
  - **Manual smoke**: None.
  - **Exclusions**: No `git add .`, selector staging, push, PR, or Graphify refresh.
  - **Expected next task**: T039.

### T039 — Graphify refresh-only task

- [ ] T039 Refresh Graphify index in a separately authorized Graphify-only task.
  - **Purpose**: Update navigation metadata after the committed implementation state, never as proof of correctness.
  - **Dependencies**: T038 and explicit Graphify refresh authorization.
  - **Guards**: `g7-crm-agent-control`.
  - **Validation**: Refresh output and unchanged source/worktree confirmation; source evidence remains authoritative.
  - **Manual smoke**: None.
  - **Exclusions**: No source edit, commit, push, or implementation.
  - **Expected next task**: T040 only after successful completion of T039.

### T040 — Controlled push-only task

- [ ] T040 Push the explicitly approved committed Feature 005 change in `PUSH_ONLY` mode.
  - **Purpose**: Publish only the reviewed commit after independent authorization.
  - **Dependencies**: T039 completion, explicit push approval, and a committed Feature 005 state from T038.
  - **Prerequisites**: T039 must complete successfully before any push action or post-push verification begins.
  - **Guards**: `g7-crm-agent-control`, `g7-crm-precommit-gate`.
  - **Validation**: Approved commit log, raw push output, and post-push status.
  - **Manual smoke**: None.
  - **Exclusions**: No new edits, staging, amend, force push, or PR creation unless separately requested.
  - **Expected next task**: Feature closure/reporting task if requested after post-push verification.

## Parallel Execution Summary

After T013 and T018–T020 are complete, T021–T026 may be assigned in parallel because each owns a distinct route module and dictionary area. T028 and T029 may run in parallel after T027 because both are read-only reviews. No database task may run in parallel with a dependent application task. T033 is intentionally serialized to one confirmed finding at a time. Closure sequencing is strictly T035 → T036 → T037 → T038 → T039 → T040.

## Coverage Matrix

| Requirement area | Tasks |
|---|---|
| Live schema truth and conditional migration | T001–T009 |
| English/Arabic definitions, default, root `lang`/`dir`, session override, `G7_DEV_RTL` | T010–T013 |
| Same-user update, failures, retry, later sessions | T014–T016 |
| Selector, keyboard/accessibility, Settings-independent access | T017–T018 |
| English/generic fallback, raw-key ban, safe defect reporting | T019–T020 |
| Shell/dashboard/customers/services/quotations/invoices/payments | T018, T021–T027 |
| Western digits, bidi safety, business/RBAC invariance | T010–T029 and T032 |
| Independent reviews, tests, Mozfer smoke, narrow remediation | T028–T034 |
| Acceptance reconciliation, docs, selector restore, commit, Graphify refresh, push, and post-push verification | T035–T040 |

## Implementation Strategy

The smallest viable path is the conditional schema gate, locale read/rendering foundation, self-preference update contract, selector, shared fallback, then one route module at a time. Do not call the feature complete until the explicit route matrix, independent review, static validation, and Mozfer-only smoke evidence all pass.
