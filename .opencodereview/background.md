# G7 BLUE Open Code Review Context

## Authority and operating boundary

This context is for the canonical G7 BLUE checkout at `D:\G7\g7-crm`, branch `main`, baseline `8e54b80d4ec7376e4d6cd77d044ee5654e3bd5b3`. The review baseline is report-only: identify concrete path/line evidence, impact, confidence, and a minimal recommendation. Do not edit application code, tests, SQL, migrations, dependencies, configuration, or generated output; do not apply automatic fixes, connect to Supabase, or create remote artifacts.

The sole expansion-reference authority is `docs/product/G7_BLUE_Event_ERP_Future_Expansion_Master_Handover.md`. Do not create a parallel expansion plan or treat older handovers as current authority.

## Product direction and spine

G7 BLUE is a Saudi event-operations CRM evolving into a specialist Event ERP and, later, a multi-company SaaS product. The future SaaS direction is not evidence that multi-tenancy or multi-company isolation is already implemented. The current product spine is:

`Customer -> Service/Event -> Quotation -> Invoice -> Payment`

Service/Booking is the operational entity for new ERP work; Project is not the new ERP authority. Current repository domains include Customers, Services, Quotations, Approved Billing Scope, Invoices, Payments, Suppliers, Supplier Rate Cards, Service-scoped Supplier Allocations and Bookings, Reports, Customer 360, Dashboard, Settings/Admin, Business Year, search/pagination, localization/RTL, and PDF/printing.

## Current implemented behavior and invariants

Repository evidence records the main Customer-to-Payment flow, atomic Deposit/Final invoice creation through PostgreSQL RPC, idempotent/concurrency-protected payment recording, Service-scoped quotation approval, internal immutable Approved Billing Scope activation, guarded Service lifecycle actions, Service Billing Summary, evidence-based Service Activity History, and bounded Supplier Operations V1. Financial authority remains server/RPC-side; client-submitted totals are never authoritative. Preserve the Service and approved-quotation prerequisite, Deposit/Final distinction, payment linkage and overpayment guard, void/cancel/reversal boundary, immutable issued history, consistent server totals/snapshots, duplicate/retry/concurrency safety, and internal ABS/Billing Summary boundary.

## VAT and document restrictions

The implemented settings schema has `vat_mode` values `not_registered` and `vat_registered_phase_1`. The current documented company state is not VAT registered. In `not_registered` mode, default VAT is zero, VAT number and effective date are empty, and customer-facing documents must not claim Tax Invoice, VAT 15%, ZATCA, FATOORA, QR, XML, or clearance behavior. In the registered phase, a VAT number and positive default VAT are required. Documents snapshot company details, VAT mode/rate, labels, financial values, logo, and bank/payment details at issue time so later settings changes do not rewrite history.

VAT/ZATCA readiness, production tax compliance, accounting finality, and financial correction/reversal expansion are not claimed by this baseline.

## Permission and server authority

Clerk provides authentication; `src/lib/auth/permissions.ts` maps the Clerk identity to an active `app_users` record and enforces roles/effective permissions through `requireUser`, `requireRole`, `requirePermission`, and `checkPermission`. Supabase admin access is server-only. Write Server Actions must enforce permission checks, and UI visibility is not proof of mutation authority. Reviews must test direct URL access, IDOR, inactive/revoked sessions, hidden-data delivery, client-only protection, and future tenant-isolation hazards.

## Accepted, technically validated, and deferred boundaries

The canonical handover records owner-accepted current-product Goal 2B/2C refinements, including bounded Dashboard and Supplier Directory presentation; this is not universal acceptance. Dashboard remains outside Business Year scope: no selector, year filter, or year URL propagation. Reports and Customer 360 remain owner-unaccepted; source, build, or test evidence is not visual, Arabic/RTL, mobile, workflow, or financial acceptance. Supplier City/Country cleanup is deferred unless code creates an integrity/security risk. Rate Card V1 is bounded to approved directory/rate-card and Service-scoped allocation behavior; delete/restore, automatic pricing, procurement, accounting, Actual Cost, Margin, ZATCA, document-language expansion, and multi-company/multi-tenant packaging remain deferred.

## Business Year, search, localization, and presentation

Business Year uses the Riyadh calendar boundary, `g7_business_year`, bounded URL synchronization, and normalized years. Service overlap is inclusive; a missing end date uses the start date. Review quotation dates, invoice `issued_at`/draft fallback, payment dates, timezone/year boundaries, and Dashboard/non-temporal exclusions. Customers use explicit-submit server-side search, draft/submitted state, URL/back-forward synchronization, bounded filtering, stable ordering, pagination, and count/row consistency. Preserve Arabic/English parity, RTL, bidi sanitization, LTR isolation for identifiers/money/dates/phones/emails/UUIDs, and `dir="auto"` for natural text.

## Runtime, reliability, and performance

The stack is Next.js 16 App Router, React 19, TypeScript, Tailwind/PostCSS, Clerk, Supabase SSR/client/admin libraries, PostgreSQL, and RPC. Boundaries are `src/app/**`, `(dashboard)` routes, Server Actions in `src/app/**/actions.ts` and `src/lib/**/actions.ts`, Route Handlers at `src/app/api/health/db/route.ts` and `src/app/api/webhooks/clerk/route.ts`, Supabase modules under `src/lib/supabase/`, Client Components under `src/components/**` and route-local `"use client"` files, and PDF/print routes under Invoice/Quotation `[id]/pdf/`. Production readiness is unclaimed. Inspect N+1/unbounded reads, repeated Dashboard/Customer 360/Reports queries, ordering, payload/hydration/client cost, waterfalls, PDF cost, cache assumptions, blocking work, races, duplicate writes, timeouts, partial failures, retries, missing env values, error boundaries, and production-only behavior. Do not prescribe migrations automatically.

Tests and contract suites are tracked under `src/**/*.test.ts`, `src/**/*.test.tsx`, `src/**/*.test.js`, and `src/**/*.test.mjs`; `test-all.mjs` orchestrates the broader quality gate. Automated evidence is useful but does not replace Mozfer-owned browser, English/Arabic, RTL, mobile, visual, workflow, or financial acceptance.

## Review posture

Treat hidden cost data, customer data, financial data, UUIDs, and audit history as sensitive. Treat missing owner evidence as a verification gap, not proof of correctness. Preserve no-hard-delete and historical-reference rules. Reports are not product-approved, Customer 360 is not product-approved, and deferred expansion must remain deferred. All findings are report-only during this baseline.
