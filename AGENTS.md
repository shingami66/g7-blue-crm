<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# G7 BLUE CRM — Agent Project Guidance

## Project Identity

G7 BLUE CRM is an Events CRM + Billing System. It supports an event-company workflow where customer relationships, quotations, invoices, payments, and operations must stay connected.

Do not treat the product as a generic billing-only CRM. Business-domain decisions for events must guide invoice and project work.

## Core Stack

- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- Supabase/PostgreSQL
- PostgreSQL RPC
- Clerk Auth
- RBAC via `app_users` + roles + permissions
- Server Actions

## Repo Commands

- `pnpm dev` is the documented local dev command and serves the app on `http://localhost:3000`.
- `pnpm build` is the required build verification command for build-affecting changes.
- `pnpm start` runs the built app after a successful `pnpm build`.
- `pnpm lint` runs the repo ESLint config.
- `pnpm test` runs the focused Company Settings schema test at `src/lib/settings/schemas.test.ts`.
- `docker compose up --build` builds and serves the app with `.env.local` mounted into the container.
- Verify Supabase connectivity at `GET /api/health/db` while the local app is running.

## Working Workflow

- Follow `Plan -> Implement -> Build -> Manual Test -> Audit -> Commit -> Push -> PR -> Merge`.
- Before staging or commit work, confirm the intended branch.
- Before staging or commit work, run `git status --short`.
- Stage exact files only; confirm no unrelated files, secrets, `.env.local`, or unreviewed SQL/migration files are staged.
- After staging, run `git diff --cached --stat` and `git diff --cached --check`.
- Do not force push. Open PRs only when requested.
- For Services or Quotations UI work, manually smoke test the live ERP path `Customer Profile -> Service -> Quotation`, including `/customers/[id]`, `/services`, `/services/[id]`, and `/quotations/new?serviceId=<service-id>`.

## Non-Negotiable Rules

- Do not touch `.env.local`.
- Do not expose secrets.
- Follow explicit user scope. If a task is documentation-only, do not edit code, config, migrations, packages, environment files, or local skill files.
- If a prompt forbids reading `.agents/skills/*`, do not read, invoke, summarize, or depend on those local skill files for that task.
- Do not use `git add .`.
- Do not run SQL without explicit approval.
- Do not create migrations without separate review.
- Do not apply migrations automatically.
- Do not edit already-applied migrations.
- PostgreSQL RPC is the source of truth for financial totals.
- Client totals are preview only.
- Supabase admin client must remain server-side only.
- Do not import Supabase admin code in Client Components.
- All write Server Actions must use `requirePermission`.
- Reads must respect RBAC.
- `UnauthorizedError` must not be hidden as `[]` or `null`.
- `ForbiddenError` must not be hidden as `[]` or `null`.
- Raw Supabase/database errors must not be exposed to UI.
- Build must pass before commit when `src`, package, config, or build-affecting files change.
- Docs must be updated after merges when behavior or roadmap changes.

## Approved ERP Domain Rules

- The core operational entity is Service / Booking, not Project.
- The locked workflow is Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- No standalone quotations. Quotations are Service-scoped.
- Quotation `customer_id`, if retained, is derived server-side from the Service.
- One Service can have multiple Quotations. Do not add `UNIQUE(service_id)` to quotations.
- Quotation approval requires `quotations:approve`, separate from `quotations:write`.
- Non-draft quotations must not be fully editable through ordinary `quotations:write`.
- Approved quotations must not be soft-deleted through ordinary `quotations:write`.
- No Invoice may exist without Service.
- Invoice must reference an approved quotation basis using `approved_quotation_id` or an equivalent required FK.
- Invoice numbering uses one shared `INV-YYYY-0001` sequence. Do not create separate `DEP-` or `FIN-` sequences.
- Invoice type uses `invoice_type = deposit | final`.
- Payment must link to Invoice.
- Prevent overpayment unless explicitly approved.
- Deposit is flexible, not fixed 50%.
- `Deposit Paid` requires a valid/cleared deposit payment. A Deposit Invoice alone and a pending payment do not confirm booking.
- Do not add a separate `Confirmed` status.
- `Cancelled` is terminal and non-linear, not a progress step.
- Client-submitted financial totals must never be trusted. Totals must be calculated server-side and/or in PostgreSQL/RPC logic.
- Do not add fake Tax Invoice, ZATCA, FATOORA, QR, XML, clearance, or reporting behavior.
- Financial records must use void/cancel/reversal workflows rather than hard deletion. Use soft delete for business records where applicable.
- The current implemented Company Settings VAT field is `company_settings.vat_mode`.

## Auth / RBAC Facts

- `app_users.clerk_user_id` is TEXT, not UUID.
- Never cast `clerk_user_id` to UUID.
- Fixed roles: `admin`, `manager`, `sales`, `operations`, `accountant`, `viewer`.
- `settings:read` is currently granted to `accountant` and `viewer`; `settings:write` remains admin-only via `*`.
- `src/lib/auth/errors.ts` is canonical for `UnauthorizedError` and `ForbiddenError`.
- `UnauthorizedError` redirects to `/sign-in`.
- `ForbiddenError` shows Access Denied UI.

## Migration Workflow

Database changes must follow:

Inspect -> proposed SQL text -> review -> migration file -> review -> manual Supabase apply -> verification -> commit/push/PR/merge.

Never skip review gates for SQL, migrations, RLS, RPC, triggers, grants/revokes, or schema changes.

- Keep reviewed migration SQL in `supabase/migrations/`.
- Treat `supabase/schema.sql` as a schema reference file; do not assume it is the apply path for production changes.

## Quotation / RPC Lessons

- Quotation numbers use `QT-YYYY-0001`.
- New quotations are service-scoped. Do not add or restore standalone quotation creation flows; start from a Service context and pass `serviceId`.
- Service editing and quotation creation are currently limited to Services in `Inquiry` or `Quoted` status. Treat other status transitions as deferred unless separately approved.
- VAT is a document-level snapshot when VAT behavior is valid for that document; after CS-A, future VAT values must come from Company Settings and document snapshots, not hardcoded current-state text.
- While Company Settings is `not_registered`, quotation create/detail/PDF flows must keep VAT as not applied and avoid tax-invoice wording.
- Discount applies before VAT.
- `quotation_items.vat` stores VAT amount, not VAT rate.
- In PL/pgSQL `RETURNS TABLE` functions, qualify column names with table aliases to avoid ambiguity with output variables.

## Product Direction

G7 BLUE CRM is moving toward Events CRM + Billing.

Do not start invoice schema work before business-domain answers are documented. Core Service-linked quotation, invoice, payment, VAT safety, and deposit/final invoice decisions are documented; leads/inquiries, vendors/suppliers, event type taxonomy, production RLS, and real-vs-fake demo data remain decision gates.

For CS-A, keep `/settings` limited to the live singleton `company_settings` record keyed by `setting_key='default'`. Do not wire live Company Settings into quotation or invoice print views until CS-B snapshot design is approved.

## Local Skills

Local skills are advisory helpers for recurring G7 BLUE CRM work. They must follow and reinforce these project rules; they must not override `AGENTS.md` or explicit user instructions.

## Guard Skill Routing

For G7 BLUE CRM feature planning or implementation involving Company Settings, Services, Customers, Quotations, Invoices, Payments, VAT/ZATCA, RBAC, backend data flow, ERP logic, or core UI patterns, invoke `$g7-crm-erp-guard` before coding.

For work involving auth, permissions, Clerk, Supabase RLS, SQL migrations, RPCs, Server Actions, secrets, webhooks, invoices, payments, deployment, production readiness, or AI/LLM features, invoke `$g7-security-hardening-guard`.

Before commit:

- Use `$clean-code-guard` on production code changes.
- Use `$docs-guard` on documentation changes.
- Use `$test-guard` on test changes.

Do not rely on UI-only checks for security. Do not stage or commit until blocking guard findings are resolved or explicitly approved.

- `.agents/skills/g7-crm-erp-guard/SKILL.md`
  Before planning or implementing G7 BLUE CRM features involving Company Settings, Services, Customers, Quotations, Invoices, Payments, VAT/ZATCA, RBAC, financial logic, backend data flow, or core UI patterns, invoke `$g7-crm-erp-guard` in discussion mode first. Do not implement until the plan is approved.

- `.agents/skills/g7-security-hardening-guard/SKILL.md`
  Use before or after G7 BLUE CRM work involving security, Clerk auth, RBAC, Supabase RLS, SQL migrations, RPCs, Server Actions, APIs, webhooks, secrets, invoices, payments, Company Settings, deployment, production readiness, or AI/LLM features.

- `.agents/skills/g7-crm-safe-engineer/SKILL.md`
  Use for plans, prompts, implementation reports, RBAC, security, financial logic, server/client boundaries, and product-flow safety.

- `.agents/skills/g7-crm-migration-review/SKILL.md`
  Use for SQL, migrations, RLS, RPC, functions, triggers, grants/revokes, schema changes, and financial database logic.

- `.agents/skills/g7-crm-precommit-gate/SKILL.md`
  Use before staging, committing, pushing, opening PRs, or merging.
