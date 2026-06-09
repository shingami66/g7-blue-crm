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

## Non-Negotiable Rules

- Do not touch `.env.local`.
- Do not expose secrets.
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

## Auth / RBAC Facts

- `app_users.clerk_user_id` is TEXT, not UUID.
- Never cast `clerk_user_id` to UUID.
- Fixed roles: `admin`, `manager`, `sales`, `operations`, `accountant`, `viewer`.
- `src/lib/auth/errors.ts` is canonical for `UnauthorizedError` and `ForbiddenError`.
- `UnauthorizedError` redirects to `/sign-in`.
- `ForbiddenError` shows Access Denied UI.

## Migration Workflow

Database changes must follow:

Inspect -> proposed SQL text -> review -> migration file -> review -> manual Supabase apply -> verification -> commit/push/PR/merge.

Never skip review gates for SQL, migrations, RLS, RPC, triggers, grants/revokes, or schema changes.

## Quotation / RPC Lessons

- Quotation numbers use `QT-YYYY-0001`.
- VAT is a 15% snapshot per document.
- Discount applies before VAT.
- `quotation_items.vat` stores VAT amount, not VAT rate.
- In PL/pgSQL `RETURNS TABLE` functions, qualify column names with table aliases to avoid ambiguity with output variables.

## Product Direction

G7 BLUE CRM is moving toward Events CRM + Billing.

Do not start invoice schema work before business-domain answers are documented, including event fields, multi-invoice flow, ZATCA/proforma direction, leads/inquiries, vendors/suppliers, and real-vs-fake demo data.

## Local Skills

Local skills are advisory helpers for recurring G7 BLUE CRM work. They must follow and reinforce these project rules; they must not override `AGENTS.md` or explicit user instructions.

- `.agents/skills/g7-crm-safe-engineer/SKILL.md`
  Use for plans, prompts, implementation reports, RBAC, security, financial logic, server/client boundaries, and product-flow safety.

- `.agents/skills/g7-crm-migration-review/SKILL.md`
  Use for SQL, migrations, RLS, RPC, functions, triggers, grants/revokes, schema changes, and financial database logic.

- `.agents/skills/g7-crm-precommit-gate/SKILL.md`
  Use before staging, committing, pushing, opening PRs, or merging.
