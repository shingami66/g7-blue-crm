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
- **Quotation approval / internal billing authority:** Eligible `Inquiry` or `Quoted` Service quotation approval atomically moves the Service to `Approved` and creates/activates the immutable internal Approved Billing Scope snapshot; non-zero discounts remain fail-closed.
- **Explicit Service lifecycle:** Guarded service-role-only RPCs implement `Deposit Paid -> In Progress`, `In Progress -> Completed`, and reasoned, exposure-gated cancellation from `Inquiry`, `Quoted`, or `Approved`; ordinary Service edit does not expose arbitrary status selection.
- **Internal ABS / Billing Summary:** Normal Service UX presents Billing Summary and invoice actions; Approved Billing Scope remains an internal billing-control layer. Void is available only on the secondary technical scope surface with structured reason/note, permission, lifecycle, zero-invoice-exposure, and zero-payment-history guards. Supersede remains a separate deferred workflow.
- **Activity and completed billing:** Service Activity History records evidence-based status and deposit-settlement events, and Completed Services may create a remaining Final Invoice while Cancelled Services cannot create Deposit or Final invoices.
- **Historical V1 milestone checkpoint:** The six-commit milestone ending at `cf4d4aec7b3d2db1953141f2a1bfa435ccbafe70` includes migrations `20260803090000` through `20260803130000`, owner-confirmed DEV/DEMO apply/verification, and reported validation of 290/290 focused tests, lint with two existing PDF `<img>` warnings, TypeScript, and build. Production apply/readiness is not claimed.
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
- [docs/auth-clerk.md](./docs/auth-clerk.md): current Clerk identity, route, and server-side authorization boundary.
- [docs/security-foundation.md](./docs/security-foundation.md): authentication, authorization, audit, and production boundary.
- [docs/supabase-client.md](./docs/supabase-client.md): browser/server/admin client boundaries and health endpoint contract.
- [docs/customers-crud.md](./docs/customers-crud.md): current customer list, picker, detail, and mutation contracts.
- [docs/quotations-crud.md](./docs/quotations-crud.md): current Service-scoped quotation and billing handoff contract.
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
- DEV/DEMO verification and repository evidence do not certify production RLS, production deployment, or production readiness for real or semi-real data.
