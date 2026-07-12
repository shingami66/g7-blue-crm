# Feature 005 Implementation Readiness Checklist

**Purpose**: Final planning-readiness gate before beginning T001; this checklist records planning evidence only and does not claim implementation, database execution, tests, or browser smoke.
**Feature**: `005-i18n-runtime-locale`
**Created**: 2026-07-11
**Audience**: Planning reviewer and implementation owner

## 1. Scope and product decisions

- [x] CHK001 — Is the V1 scope explicitly limited to authenticated English/Arabic runtime locale behavior? [Scope, Spec §Requirements FR-001–FR-008]
- [x] CHK002 — Are C01 (Settings/Admin boundary), C02 (save-failure session behavior), and C03 (missing-translation fallback) preserved consistently? [Consistency, Spec §Clarifications; Plan §Post-design gate]
- [x] CHK003 — Are dashboard, customers, services, quotations, invoices, and payments named as included surfaces with supported detail/create/edit routes? [Completeness, Plan §Route Coverage; Quickstart §4]
- [x] CHK004 — Are Settings/Admin pages, Reports Center, PDFs/documents, Supplier Booking redesign, VAT/ZATCA/FATOORA, automatic business-data translation, unrelated responsive work, financial lifecycle changes, and RBAC redesign explicitly excluded? [Scope, Spec §Explicit Exclusions; Plan §Deferred or excluded surfaces]
- [x] CHK005 — Do the requirements state that locale changes cannot alter permissions, records, calculations, statuses, audit history, or workflows? [Invariant, Spec §FR-013, FR-021; Plan §Security and Privacy Design]

## 2. Requirement and task traceability

- [x] CHK006 — Is every FR-001–FR-023 represented by one or more scenarios, contracts, plan boundaries, or tasks? [Traceability, Spec §Requirements; Tasks §Coverage Matrix]
- [x] CHK007 — Is every SC-001–SC-006 represented by an acceptance or smoke obligation without claiming that it has already passed? [Traceability, Spec §Success Criteria; Quickstart §3]
- [x] CHK008 — Does each T001–T040 have a bounded purpose, dependency, guard, validation, and expected-next rule? [Completeness, Tasks §Phase 0–8]
- [x] CHK009 — Are acceptance outcomes not dependent solely on agent browser smoke, with Mozfer-owned runtime evidence called out separately? [Clarity, Tasks T031–T035; Quickstart §3]

## 3. DEV/DEMO schema truth gate

- [x] CHK010 — Is T001 explicitly read-only and limited to an approved DEV/DEMO verification packet? [Safety, Tasks T001]
- [x] CHK011 — Does T001 assign SQL packet execution to Mozfer and prohibit inserts, updates, alters, migration apply, RPC mutation, and other writes? [Safety, Tasks T001]
- [x] CHK012 — Does the evidence packet require existence, type, nullability/default, allowed values, and existing-user compatibility evidence? [Completeness, Tasks T001]
- [x] CHK013 — Does missing or incomplete evidence produce HOLD rather than an assumed schema conclusion? [Safety, Tasks T001]
- [x] CHK014 — Does T003 route conditionally to runtime work or migration work based on T001–T002 evidence? [Dependency, Tasks T003, T010]
- [x] CHK015 — Is the unapplied Feature 004 SQL draft distinguished from live schema truth? [Clarity, Research §Decision 7; Plan §Schema Impact]

## 4. Migration safety, if required

- [x] CHK016 — Are migration design, pre-creation review, creation, file review, Mozfer apply planning, and post-apply verification separate tasks? [Safety, Tasks T004–T009]
- [x] CHK017 — Are compatible existing-user/default handling and constrained `en`/`ar` values required before migration approval? [Completeness, Tasks T004–T007; Data Model §Validation Rules]
- [x] CHK018 — Do migration boundaries prohibit role, permission, financial, workflow, RLS broadening, and document-locale changes? [Safety, Tasks T004–T009]
- [x] CHK019 — Is editing an already-applied migration prohibited by the planning controls? [Safety, Migration Review §Hard Gates; Tasks T006–T007]
- [ ] CHK020 — Has Mozfer supplied live DEV/DEMO evidence and, if needed, applied and verified the reviewed migration? [Future execution evidence, Tasks T001, T008–T009]

## 5. Locale resolution and rendering

- [x] CHK021 — Are persisted preference, initial-render hint, authenticated resolution, and current-session override responsibilities distinct? [Clarity, Plan §Runtime boundary model; Data Model §Planned Locale States]
- [x] CHK022 — Are English defaulting, initial `lang`/`dir` ownership, authenticated reconciliation, and one coherent shell defined? [Completeness, Plan §Rendering Lifecycle]
- [x] CHK023 — Is persistent mixed-language or mixed-direction shell behavior explicitly prohibited? [Acceptance, Spec §FR-009; Tasks T011–T013]
- [x] CHK024 — Is `G7_DEV_RTL` retired or strictly diagnostic-only and unable to override runtime user locale? [Safety, Spec §FR-016; Plan §Transition from `G7_DEV_RTL`]
- [x] CHK025 — Are hydration, pending transition, stale response, refresh, sign-out, and identity-change risks assigned bounded validation? [Coverage, Data Model §State Transitions; Tasks T012, T015]

## 6. Preference update and security

- [x] CHK026 — Is locale mutation authenticated, active-user-only, and restricted to the current user’s row and locale field? [Security, Contract §Update Contract; Plan §Update Contract]
- [x] CHK027 — Does the update contract reject cross-user target parameters and unsupported values? [Security, Contract §Input/Server checks; Tasks T014, T016]
- [x] CHK028 — Are existing permission checks, inactive-user handling, sanitized errors, and unchanged RBAC retained? [Security, Contract §Outcomes; Tasks T014–T016]
- [x] CHK029 — Are immediate session application, persistence warning, retry, and later-session fallback explicitly specified? [Recovery, Spec §C02, FR-019–FR-021; Tasks T015]
- [ ] CHK030 — Has implementation evidence demonstrated same-user isolation, sanitized failure outcomes, and retry/later-session behavior? [Future execution evidence, Tasks T014–T016, T034]

## 7. Selector UX and accessibility

- [x] CHK031 — Is the selector reachable from the authenticated shell or user menu without requiring `/settings`? [Scope, Spec §C01, FR-023; Tasks T017]
- [x] CHK032 — Are keyboard operation, focus order/visibility, accessible name, selected state, pending state, warning, retry, and recovery requirements explicit? [Accessibility, Spec §FR-002, FR-014–FR-015; Tasks T017]
- [x] CHK033 — Does selector scope preserve existing authorization and prevent exposure or alteration of unavailable functionality? [Security, Spec §FR-013, FR-017; Tasks T017–T018]

## 8. Dictionary and fallback behavior

- [x] CHK034 — Is the fallback order active locale → English source label → readable generic fallback explicit? [Clarity, Contract §Lookup Outcome; Spec §FR-010, FR-022]
- [x] CHK035 — Are raw translation keys prohibited and missing entries recorded as quality defects? [Safety, Contract §Defect Signal; Tasks T019–T020]
- [x] CHK036 — Does fallback preserve controls, layout, values, calculations, statuses, records, and submissions? [Invariant, Contract §Behavior Invariants]
- [x] CHK037 — Are defect logs restricted to safe namespace/key/surface metadata and free of user-entered, customer, financial, credential, token, and raw-error data? [Security, Plan §Security and Privacy Design; Tasks T020]
- [x] CHK038 — Are Western digits and bidi-safe values mandatory for Arabic presentation? [Non-functional, Spec §FR-012; Plan §Technical Context; Quickstart §3]

## 9. Core module execution slices

- [x] CHK039 — Is the shell slice bounded to Topbar, Sidebar, layout, dictionaries, and selector responsibilities with explicit prerequisites? [Traceability, Tasks T017–T018]
- [x] CHK040 — Are dashboard, customers, services, quotations, invoices, and payments each assigned a distinct implementation slice with module-specific validation and prerequisites? [Completeness, Tasks T021–T026]
- [x] CHK041 — Does every included slice preserve permissions, workflows, financial behavior, untranslated user-entered data, Western digits, and bidi-safe identifiers? [Invariant, Tasks T021–T026; Plan §Route Coverage]
- [x] CHK042 — Is parallelism limited to non-overlapping T021–T026 ownership, with T028/T029 parallel only as read-only reviews? [Safety, Tasks §Parallel Execution Summary]
- [ ] CHK043 — Have all included module slices passed their future implementation, review, static-validation, and Mozfer smoke obligations? [Future execution evidence, Tasks T021–T034]

## 10. Review, validation, and smoke

- [x] CHK044 — Are product/i18n review, security/RBAC review, static validation, focused tests, smoke preparation, and runtime smoke separate gates? [Separation, Tasks T028–T032]
- [x] CHK045 — Are agents limited to preparing browser-smoke steps while Mozfer owns runtime browser smoke? [Control, Tasks T031–T032; Quickstart §3]
- [x] CHK046 — Does a confirmed finding route to one bounded remediation and re-review rather than broad rework? [Recovery, Tasks T033–T034]
- [ ] CHK047 — Have future focused tests, lint, typecheck, build, and Mozfer smoke evidence been recorded? [Future execution evidence, Tasks T030–T032]

## 11. Git and closure controls

- [x] CHK048 — Is the mandatory closure order exactly T035 → T036 → T037 → T038 → T039 → T040? [Closure, Tasks §Dependency Map; §Parallel Execution Summary]
- [x] CHK049 — Does T037 restore `.specify/feature.json` exactly to HEAD before commit and verify selector absence from working-tree and staged diffs? [Selector safety, Tasks T037]
- [x] CHK050 — Does T038 remain commit-only, exclude the selector, and remain separate from Graphify and push? [Git safety, Tasks T038]
- [x] CHK051 — Is T039 mandatory, Graphify-refresh-only, and completed before T040? [Closure, Tasks T039]
- [x] CHK052 — Does T040 depend on successful T039 and perform push plus post-push verification only? [Closure, Tasks T040]
- [ ] CHK053 — Have commit, Graphify refresh, push, post-push alignment, and clean-state verification occurred? [Future execution evidence, Tasks T038–T040]

## Final gate summary

- [x] CHK054 — Are all planning gates complete enough to begin T001 without a planning fix? [Gate, Tasks T001; Plan §Constitution Check]

**Planning gate**: `READY_FOR_T001`

This checklist records planning readiness only. CHK020, CHK030, CHK043, CHK047, and CHK053 remain intentionally unchecked because they require future T001–T040 execution evidence. No source implementation, database verification, migration application, tests, build, or browser smoke is claimed.
