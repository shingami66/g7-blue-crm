# G7 BLUE Open Code Review Wave Plan

## Scope and assignment method

This is a report-only preparation manifest for the canonical baseline
`8e54b80d4ec7376e4d6cd77d044ee5654e3bd5b3`. It is not an instruction to run
`ocr review`, `ocr scan`, a full-project baseline review, an LLM, or automatic
fixes. A future wave may suggest code changes in its report, but baseline
execution must not apply them.

The complete tracked inventory contains 588 paths at the baseline HEAD. The
primary assignment below is first-match and repository-relative. Tests are
assigned to Wave 7 before domain rules. Supplier-specific Service surfaces are
assigned to Wave 6 before the broad Service path is assigned to Wave 2.

### Primary assignment order

1. Apply the documented global exclusions.
2. Assign `*.test.ts`, `*.test.tsx`, `*.test.js`, and `*.test.mjs` to Wave 7.
3. Assign Wave 1 authentication paths.
4. Assign supplier-specific Service paths to Wave 6.
5. Assign Wave 2 financial, quotation, Service, and Supabase paths.
6. Assign the remaining Wave 6 Customer 360, Suppliers, Rate Cards, and Reports paths.
7. Assign Wave 5 temporal, customer-list, search, pagination, i18n, RTL, and shared UI paths.
8. Assign Wave 4 health, error-boundary, and environment paths.
9. Assign the remaining Wave 3 query/data/dashboard/API paths.
10. Assign Wave 7 documentation, build, deployment, and final-sweep paths.
11. Assign the six remaining platform/type paths to Wave 0.

This order is only a disambiguation mechanism; the review waves are executed
in numerical order and may use secondary/context files from other waves.

## Inventory totals

| Primary wave | Exact assigned manifest | Count |
| --- | --- | ---: |
| Wave 0 — architecture/runtime/systemic risk | `src/app/(dashboard)/projects/page.tsx`; `src/app/page.tsx`; `src/types/common.ts`; `src/types/counter.ts`; `src/types/index.ts`; `src/types/project.ts` | 6 |
| Wave 1 — authentication/authorization | `src/app/(dashboard)/admin/**`; `src/app/(dashboard)/settings/**`; `src/app/login/**`; `src/app/sign-in/**`; `src/app/sign-up/**`; `src/app/unauthorized/**`; `src/app/api/webhooks/**`; `src/proxy.ts`; `src/lib/auth/**`; `src/lib/admin/**`; `src/lib/security/**`; `src/lib/supabase/**`; `src/lib/settings/**`; `src/types/settings.ts` | 27 |
| Wave 2 — Services/Quotations/Invoices/Payments/VAT/financial lifecycle/RLS/RPC | `supabase/**`; `src/app/(dashboard)/approved-billing-scopes/**`; `src/app/(dashboard)/invoices/**`; `src/app/(dashboard)/payments/**`; `src/app/(dashboard)/quotations/**`; remaining `src/app/(dashboard)/services/**`; `src/lib/approved-billing-scopes/**`; `src/lib/invoices/**`; `src/lib/payments/**`; `src/lib/quotations/**`; `src/lib/services/**`; `src/lib/data/invoices.ts`; `src/lib/data/payments.ts`; `src/lib/data/quotations.ts`; `src/types/audit.ts`; `src/types/invoice.ts`; `src/types/payment.ts`; `src/types/quotation.ts`; `src/types/service.ts` | 149 |
| Wave 3 — queries/data/performance/rendering/scalability | `src/app/(dashboard)/dashboard/page.tsx`; `src/lib/data/projects.ts`; `src/lib/data/settings.ts` after earlier assignments | 3 |
| Wave 4 — production failures/reliability/observability | `src/app/(dashboard)/error.tsx`; `src/app/api/health/db/route.ts`; `src/lib/env.ts` | 3 |
| Wave 5 — Business Year/dates/search/URL/localization/RTL/loading/accessibility | `src/app/(dashboard)/customers/**` except `[id]/**`; `src/app/(dashboard)/layout.tsx`; `src/app/(dashboard)/loading.tsx`; `src/app/(dashboard)/not-found.tsx`; `src/app/globals.css`; `src/app/layout.tsx`; `src/app/loading.tsx`; `src/components/**`; `src/lib/business-year*`; `src/lib/customers/**`; `src/lib/i18n/**`; `src/lib/pagination*`; `src/lib/record-navigation/**`; `src/lib/search/**`; `src/lib/data/customers.ts`; `src/types/customer.ts` | 85 |
| Wave 6 — Suppliers/Rate Cards/Reports/Customer 360/cross-domain exposure | `src/app/(dashboard)/services/**/Supplier*`; `src/app/(dashboard)/services/**/allocations/**`; dynamic Customer 360 route `src/app/(dashboard)/customers/*/*` (actual directory `[id]` and one file segment); `src/app/(dashboard)/reports/**`; `src/app/(dashboard)/suppliers/**`; `src/lib/customer-360/**`; `src/lib/reports/**`; `src/lib/supplier-allocations/**`; `src/lib/supplier-bookings/**`; `src/lib/suppliers/**`; `src/types/supplier.ts` | 60 |
| Wave 7 — tests/build/deployment/dead-code/final sweep | All `*.test.ts`, `*.test.tsx`, `*.test.js`, `*.test.mjs`; `docs/**`; `.dockerignore`; `Dockerfile`; `docker-compose.yml`; `eslint.config.mjs`; `next.config.ts`; `package.json`; `pnpm-workspace.yaml`; `postcss.config.mjs`; `README.md`; `test-all.mjs`; `tsconfig.json` | 111 |

Assigned tracked paths: **444**. Documented tracked exclusions: **144**.
Unmatched tracked paths: **0**. Duplicate primary-wave assignments: **0**.
Wave 7 contains 74 test files plus 37 build/documentation/final-sweep files.

## Global exclusions from every wave

These are documented exclusions, not silent omissions. The exclusion matcher
is applied before primary assignment:

| Pattern | Count at baseline | Reason |
| --- | ---: | --- |
| `(^|/)(node_modules|.next|coverage|dist|build|generated|gen)(/|$)` | 0 | Dependencies, generated output, coverage, and build artifacts; retained as a safety exclusion |
| `(^|/).opencodereview(/|$)` | 0 at baseline | Review-control files themselves |
| `(^|/).env($|.)` | 1 | Environment/secret-bearing configuration |
| `(^|/)(package-lock.json|pnpm-lock.yaml|skills-lock.json)$` | 3 | Dependency lockfiles |
| `^public/` or `^src/app/favicon.ico$` | 7 | Binary/static assets; visual asset acceptance is owner-led |
| `^\.gitignore$`, `^(AGENTS|CLAUDE)\.md$`, `^\.agents/`, `^\.specify/`, `^specs/` | 133 | Workflow instructions, agent controls, and planning/specification artifacts |

The OCR rule file additionally excludes `build-watch-*.log` and
`**/build-watch-*.log`, environment files, generated suffixes, common binary
extensions, temporary/backup files, `.grok/**`, `.codex/**`, recovery/rescue
folders, imported bundles, and `.opencodereview/**`. The four protected
untracked build-watch logs are never read and remain outside this inventory.
Tests are not globally excluded.

## Wave contracts

Every wave uses this output contract: `path:line` evidence, severity/impact,
confidence, affected authority or data boundary, concise reasoning, and a
minimal recommendation. If evidence is insufficient, report “measurement or
owner verification required” rather than asserting correctness. All waves are
report-only during the baseline; no wave may edit, stage, commit, push, fetch,
apply SQL, or invoke automatic fixes.

### Wave 0 — Architecture, trust boundaries, runtime map, systemic risks

- Objective: map the App Router, route groups, Server Components, Client Components, Server Actions, Route Handlers, data clients, permissions, domain boundaries, and cross-cutting failure risks.
- Primary manifest: the six paths listed in the inventory table.
- Secondary/context files: all 444 assigned reviewable paths, `rule.json`, `background.md`, runtime entry points under `src/app/**`, `src/proxy.ts`, `src/lib/auth/**`, `src/lib/supabase/**`, and the canonical Expansion Master.
- Explicit exclusions: all global exclusions; protected logs; no database connection; no code or documentation edits.
- Main risks: authority split between UI/actions/RPC, hidden-data delivery, lifecycle drift, duplicated totals, missing auditability, unbounded reads, and assumptions that multi-tenancy already exists.
- Required questions: where is each trust boundary; which path owns each mutation; which files are server/client; which dependencies are authoritative; what remains owner-unaccepted or deferred?
- Estimated size: medium. Recommended reasoning: Extra High.
- Stop boundary: stop if architecture evidence requires source modification, live database access, or a review/scan/LLM invocation.

### Wave 1 — Authentication, authorization, permissions, sensitive data

- Objective: test identity binding, session state, effective permissions, direct URL access, IDOR, client-only guards, inactive/revoked access, and sensitive-data exposure.
- Primary manifest: the Wave 1 patterns in the inventory table.
- Secondary/context files: `src/lib/auth/permissions.ts`, role-permission definitions, protected dashboard pages, Server Actions called by the protected UI, and relevant RLS/RPC paths from Wave 2.
- Explicit exclusions: financial mutation execution, live auth/session testing, database apply, protected logs, and owner browser acceptance.
- Main risks: permission checks applied inconsistently, sensitive rows fetched before hiding, stale sessions, bypassable routes, and future tenant-isolation hazards.
- Required questions: does every direct route and write action enforce server authority; do denied users receive safe failures; can a user cross the intended customer/Service boundary?
- Estimated size: large. Recommended reasoning: Extra High.
- Stop boundary: stop on any proposal to weaken permission gates or expose raw identifiers/data for convenience.

### Wave 2 — Services, Quotations, Invoices, Payments, VAT, financial lifecycle

- Objective: review Service-first authority, quotation approval/revision, Approved Billing Scope, invoice/payment eligibility, VAT rules, idempotency, concurrency, transaction boundaries, and audit history.
- Primary manifest: `supabase/**`, financial dashboard paths, financial/service/quotation libraries, financial data modules, and financial types listed in the inventory table. Supplier-specific Service surfaces are Wave 6.
- Secondary/context files: all financial query/action/schema/mapper files, Service and quotation routes, PDF/printing routes, company settings VAT schema, and relevant tests in Wave 7.
- Explicit exclusions: no SQL execution, migration apply, live Supabase inspection, real financial mutation, automatic migration recommendation, or owner acceptance claim.
- Main risks: duplicate financial documents, partial posting, inconsistent totals, illegal issued-record edits, hidden-as-zero, retry corruption, race conditions, missing audit trails, and VAT/document leakage.
- Required questions: are prerequisites and transitions enforced at the authoritative server boundary; are retries and concurrent requests safe; are historical snapshots immutable; do all screens and RPCs agree on totals and status?
- Estimated size: extra large. Recommended reasoning: Extra High.
- Stop boundary: stop at evidence of an unresolved production/live-data requirement rather than inventing a SQL or code fix.

### Wave 3 — Queries, indexes, pagination, payloads, rendering cost, scalability

- Objective: review the three general query/data/dashboard primary paths while using domain query modules as secondary context for N+1, bounds, ordering, payload, and rendering-cost analysis.
- Primary manifest: `src/app/(dashboard)/dashboard/page.tsx`, `src/lib/data/projects.ts`, and `src/lib/data/settings.ts`; domain query files remain primary in their domain wave and are secondary here.
- Secondary/context files: every tracked `queries.ts` or `*-queries.ts` file, query callers, list/pagination components, Customer 360 and Reports reads, Dashboard sections, and server/client boundaries.
- Explicit exclusions: no automatic index or migration creation, no benchmark claim without timings/traces, no database connection, and no UI rewrite.
- Main risks: N+1 reads, repeated Dashboard queries, unbounded Customer 360/Reports reads, unstable ordering, deep offsets, client filtering, large server-to-client payloads, request waterfalls, and unauthorized hidden-widget queries.
- Required questions: what is the query shape and bound; does the count predicate equal the row predicate; are repeated reads safely concurrent; is an index recommendation grounded in actual query shape?
- Estimated size: large. Recommended reasoning: Extra High.
- Stop boundary: classify each finding as confirmed defect, scalability risk, measurement required, index recommendation, architecture recommendation, or false positive.

### Wave 4 — Production failures, retries, dependencies, deployment, observability

- Objective: review health/error/environment foundations and use action/RPC paths as context for timeouts, retries, partial writes, dependency outages, stale sessions, missing records, and diagnostics.
- Primary manifest: `src/app/(dashboard)/error.tsx`, `src/app/api/health/db/route.ts`, and `src/lib/env.ts`.
- Secondary/context files: Server Actions, RPC callers, PDF paths, deployment configuration, error/empty/loading states, audit events, and dependency boundaries across Waves 1–3.
- Explicit exclusions: no outage simulation, deployment, environment mutation, log inspection of protected files, or automatic resilience patch.
- Main risks: retry-after-success duplication, errors rendered as empty states, missing environment values, silent financial failures, unhandled promises, retry loops, PDF timeout/memory risk, and insufficient correlation data.
- Required questions: can operators distinguish dependency failure from empty data; are failures actionable without leaking secrets; are partial writes and recovery paths explicit?
- Estimated size: medium. Recommended reasoning: High.
- Stop boundary: stop if evidence depends on inaccessible production telemetry; report the missing measurement or owner verification.

### Wave 5 — Business Year, dates, URL state, localization, RTL, loading, errors, accessibility

- Objective: review Riyadh Business Year semantics, date/timezone behavior, explicit-submit search, pagination, locale and direction handling, bidi safety, loading/error/empty/forbidden states, focus, keyboard, and responsive behavior.
- Primary manifest: customer lists, shared components, Business Year, customer/search/pagination/navigation/i18n libraries, global/layout/loading paths, and customer types listed in the inventory table.
- Secondary/context files: domain list callers, PDF/document labels, Dashboard exclusion rules, localized dictionaries, record navigation, and relevant tests.
- Explicit exclusions: no claim of Arabic/RTL/mobile/visual owner acceptance, no terminology expansion, no document-language implementation, no destructive refactor.
- Main risks: URL/back-forward drift, IME breakage, bidi injection, unreadable LTR identifiers, unstable pagination, duplicate rows, timezone drift, hydration mismatch, focus loss, and errors hidden as empty states.
- Required questions: are draft/submitted searches explicit; are counts and rows consistent; are Business Year and start-only Service semantics shared; are localized states complete and accessible?
- Estimated size: extra large. Recommended reasoning: High.
- Stop boundary: stop at owner-owned visual/workflow evidence and label it pending rather than inferring pass from source or tests.

### Wave 6 — Suppliers, Rate Cards, Reports, Customer 360, cross-domain exposure

- Objective: review Supplier Directory/Rate Cards, Service-scoped supplier operations, Reports, Customer 360, permissions, historical references, and cross-domain leakage.
- Primary manifest: supplier-specific Service surfaces, Customer 360, Reports, Suppliers, Supplier Allocations/Bookings, and supplier types listed in the inventory table.
- Secondary/context files: Service lifecycle and query callers, financial cost mappers, customer navigation, role permissions, and localized dictionaries.
- Explicit exclusions: no procurement/accounting/Actual Cost/Margin implementation, no deferred City/Country cleanup defect claim without code evidence, no Reports or Customer 360 owner-acceptance claim, and no production data access.
- Main risks: cost fetched before permission filtering, rate overlap/concurrency, historical master-data drift, cross-customer leakage, duplicate sections, UUID/sentinel-date exposure, unbounded reads, and broken contextual navigation.
- Required questions: are Rate Card validity and history stable; do supplier mutations respect Service ownership and active-booking locks; do Reports and Customer 360 enforce scope before fetching; are business labels human-readable?
- Estimated size: large. Recommended reasoning: Extra High.
- Stop boundary: stop before activating deferred procurement, accounting, multi-company, or tenant features.

### Wave 7 — Tests, build/deployment readiness, dead code, final cross-cutting sweep

- Objective: inspect behavioral test confidence, skipped/disabled coverage, build/lint/type/test orchestration, deployment configuration, dead or duplicated logic, and cross-cutting regressions.
- Primary manifest: all 74 tracked test files plus the 37 `docs/**` and root build/deployment/final-sweep files listed in the inventory table.
- Secondary/context files: production callers for every test, `package.json`, `test-all.mjs`, `next.config.ts`, Docker files, and all wave findings.
- Explicit exclusions: no test edits, no dependency/lockfile changes, no generated artifacts, no automatic fixes, and no conversion of tests into owner acceptance.
- Main risks: false confidence, implementation-string assertions, skipped suites, missing negative/race/retry cases, production/test divergence, missing gates, runtime-only failures, dead code, and duplicated business logic.
- Required questions: do tests assert behavior and authority; do build/lint/type/deployment checks cover the promised scope; are dead paths actually unreachable; do final findings agree with the Expansion Master and background?
- Estimated size: extra large. Recommended reasoning: High.
- Stop boundary: report-only final sweep; do not fix application issues or alter the approved manifest.

## Production and performance priority

Every future wave must explicitly inspect slow pages that look acceptable on
small development data, N+1 behavior, repeated Dashboard queries, unbounded
Customer 360/Reports reads, missing deterministic ordering, large payloads,
excessive Client Components, avoidable hydration, request waterfalls, heavy
PDF paths, unsafe cache behavior, actual query shapes suggesting indexes,
blocking request work, race conditions, duplicate financial writes, retry and
dependency failure gaps, errors hidden as empty states, and production-only
configuration failures. Findings must distinguish confirmed defect,
scalability risk, measurement required, index recommendation, architecture
recommendation, and false positive. Do not optimize prematurely.

## ERP failure-pattern coverage

The combined rule and wave plan must look for broken lifecycle transitions,
edits to finalized records, missing audit trails, duplicate financial
documents, partial posting, totals differing across modules, inconsistent
permission checks, historical records changing with master data, Reports
disagreeing with operational screens, date/timezone drift, search/export
predicate differences, hidden cost delivery, inactive/deleted references
breaking history, retry/concurrency corruption, and inadequate operational
diagnostics.

## Validation invariants and adversarial checks

- JSON must parse and the OCR CLI must resolve the new rule/background files.
- Specialized rules must precede the final `**/*` rule; no broad early rule may shadow a specialized path.
- Tests must match a dedicated quality rule and remain in Wave 7.
- Server Actions, Route Handlers, query helpers, PDF/printing paths, error/loading/forbidden states, and build/deployment files must appear in a primary wave or a documented exclusion.
- Reports and Customer 360 must remain owner-unaccepted; the background must not claim multi-tenancy is implemented.
- Protected logs, secrets, binary/generated/recovery files must remain excluded and absent from preview selection.
- Primary counts must remain 6, 27, 149, 3, 3, 85, 60, and 111; assigned 444, excluded 144, unmatched 0, duplicate primary assignments 0.
- No preparation command may invoke `ocr review`, `ocr scan`, an OCR-configured LLM, or automatic fixes.

## Approved dry-validation contract

The permitted configuration-only checks use:

- Repository: `D:\G7\g7-crm`
- Rule: `.opencodereview/rule.json`
- Background: `.opencodereview/background.md`
- Range start: `37fc235a30c39fbb459439fb752523f0fe2072a6`
- Range end: `8e54b80d4ec7376e4d6cd77d044ee5654e3bd5b3`

Run representative `ocr delegate rule` resolution for real files from every
specialized category and `ocr delegate preview` for the committed range.
These commands only resolve rules and selected file metadata; they are not a
full-project review and must not invoke an LLM. Confirm that exactly the
expected committed Goal files are selected and that protected logs, generated,
secret, binary, recovery, and temporary paths are excluded.

The installed OCR `v1.8.8` preview applies a built-in `default_path` policy in
addition to the project rule file. For this approved range it reports 50
reviewable paths out of 69 changed paths: 16 test paths are marked
`default_path`, the Expansion Master Markdown file is marked `unsupported_ext`,
and two deleted UI files are marked `deleted`. The custom test rules still
resolve those test files through `ocr delegate rule`, and tests remain in Wave
7; the preview behavior is a CLI selection limitation, not a project-wide
test exclusion. No available preview flag re-includes the default-path tests.
