# G7 BLUE CRM

G7 BLUE CRM is an Events CRM + Billing system built with Next.js 16 App Router, TypeScript, Tailwind CSS, Supabase/PostgreSQL, Clerk Auth, RBAC, Server Actions, and PostgreSQL RPC.

The product direction is not a generic billing-only CRM. New ERP work follows:

Customer Profile -> Service / Booking -> Quotation -> Invoice -> Payment

## Current State

- **Operational Core:** Service / Booking is the operational core of the CRM and billing system.
- **Main CRM & Billing Flow:** The complete path `Customer Profile -> Service -> Quotation -> Invoice -> Payment` is implemented.
- **Atomic Invoicing:** Atomic Deposit and Final Invoice creation is implemented and integrated in DEV/DEMO (routed through `public.create_invoice_atomic` RPC).
- **Hardened Payment Recording:** Hardened atomic customer payment recording is implemented and integrated in DEV/DEMO (routed through the seven-argument `public.record_invoice_payment` RPC with `request_id` idempotency, concurrency protection, and overpayment prevention).
- **Supplier Operations V1:** Supplier Directory V1 and internal Supplier Operations V1 (Service-scoped Allocations and Supplier Bookings) are implemented.
- **Production Status:** Production readiness remains unclaimed. Production RLS, production deployment, backups, monitoring, logging, financial correction/reversal workflows, and VAT/ZATCA/FATOORA integration remain separate.

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

- [README.md](./README.md): concise repository entry point only.
- [docs/project-status.md](./docs/project-status.md): current verified project state and completed milestones.
- [docs/project-roadmap.md](./docs/project-roadmap.md): execution order and pending priorities.
- [docs/deferred-decisions.md](./docs/deferred-decisions.md): deferred, unresolved, and partially completed decisions.
- [docs/database-schema.md](./docs/database-schema.md): implemented schema facts and approved target direction.
- [docs/atomic-invoice-creation-contract.md](./docs/atomic-invoice-creation-contract.md): atomic Deposit/Final Invoice creation contract.
- [docs/atomic-payment-recording-contract.md](./docs/atomic-payment-recording-contract.md): hardened atomic payment recording contract.
- [docs/repository-worktree-governance.md](./docs/repository-worktree-governance.md): repository path, worktree, reconciliation, and owner-approval rules.
- [AGENTS.md](./AGENTS.md): mandatory agent execution and safety rules.

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
- Production RLS hardening is partially in-repo; the remote Supabase apply has been verified, and only the remaining production follow-up is still required before any hosted demo with real or semi-real data.
