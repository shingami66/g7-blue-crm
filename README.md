# G7 BLUE CRM

G7 BLUE CRM is an Events CRM + Billing system built with Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Clerk Auth, RBAC, Server Actions, and PostgreSQL RPC.

The product direction is not a generic billing-only CRM. New ERP work follows:

Customer Profile -> Service / Booking -> Quotation -> Invoice -> Payment

## Current State

- Customers, RBAC, quotations foundation, quotation manual entry/edit/detail/print, Company Settings CS-A, and the ERP-1 Services DB foundation are documented as complete.
- Services now exist as the new operational unit at the DB foundation level, but Services UI/routes/server actions remain pending.
- Quotations, invoices, and payments are still being moved toward the final Service-linked ERP flow.
- Real or semi-real data remains blocked until production RLS hardening replaces `DEV_ONLY` policies.

## Approved ERP Rules

- Service / Booking is the core operational entity for new ERP work, not Project.
- No standalone quotations. Quotations are Service-scoped.
- Quotation `customer_id`, if retained, is derived server-side from Service.
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

## Documentation Map

- `docs/project-status.md`: current project status and resolved decisions.
- `docs/project-roadmap.md`: phase plan, active priorities, and ERP checkpoints.
- `docs/deferred-decisions.md`: deferred and partially resolved decisions.
- `docs/database-schema.md`: current schema reference and approved target schema direction.
- `docs/roles-permissions.md`: RBAC roles, permission boundaries, and security rules.
- `AGENTS.md`: repository guidance for coding agents.

## Local Development

```bash
pnpm dev
```

Open `http://localhost:3000`.

Build verification for code-affecting changes:

```bash
pnpm build
```

Documentation-only changes do not require app build, migrations, or database commands.

## Safety Rules

- Do not commit `.env.local` or expose secrets.
- Do not run SQL or migrations without explicit review and approval.
- Do not apply Supabase migrations automatically.
- Do not trust client financial totals.
- Keep Supabase admin access server-side only.
- Use `requirePermission` for write Server Actions and respect RBAC on reads.
- Production RLS hardening is required before any hosted demo with real or semi-real data.
