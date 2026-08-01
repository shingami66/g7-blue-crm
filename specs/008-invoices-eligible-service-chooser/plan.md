# Implementation Plan: Invoices Eligible-Service Chooser

**Feature**: `008-invoices-eligible-service-chooser`  
**Status**: Delivered to origin/main

## Source-Truth And Authority Checks

- The global Invoices page exposes one global `Create Invoice` CTA when authorized (`invoices:write` + `services:read`).
- Existing invoice creation is Service-scoped and managed through the dedicated Service Billing Workspace (`/services/[id]/billing`) using `createInvoiceAction` and the atomic `create_invoice_atomic` stored procedure.
- `createInvoiceAction` remains the single application mutation authority for both Deposit and Final invoice creation and delegates to the single atomic invoice RPC path.
- Existing server-side authority already revalidates permissions, Service/quotation alignment, lifecycle, billing authority mode, duplicate active invoice state, and remaining authoritative billing exposure.
- Current Final Invoice runtime source truth is preserved: Final creation does not require an existing Deposit Invoice or Deposit Payment and derives the final amount server-side from remaining billable balance.

## Approved Service Billing Workspace UX And Navigation

Use one global `Create Invoice` CTA on the Invoices page. The CTA opens a first-step chooser that asks the user to select `Create Deposit Invoice` or `Create Final Invoice`. After the user chooses the invoice type, open a type-specific eligible-Service selector that shows only Services currently eligible for the selected invoice type.

The selector remains read-only and navigation-only. Selecting a Service deep-links to the dedicated Service Billing Workspace route:

- Deposit: `/services/{encoded-service-id}/billing?intent=deposit`
- Final: `/services/{encoded-service-id}/billing?intent=final`
- General workspace: `/services/{encoded-service-id}/billing`

Legacy deep links using `/services/{encoded-service-id}?invoiceAction=deposit|final` issue a backward-compatible HTTP 307 redirect to the new Billing Workspace routes.

The Service Billing Workspace interprets `intent` only as a UI selection hint to focus the relevant primary action (Deposit input or Final button). It presents a compact financial metric strip, authority details, intent-focused action panel, and read-only Estimated Cost & Margin section. The general Service Detail page (`/services/[id]`) renders a compact `ServiceBillingSummaryCard` with a link to open the full workspace.

Desktop uses a bounded centered dialog for the chooser. Mobile uses a scrollable single-column layout. RTL uses logical spacing, `dir="auto"` for stored text, start-aligned content wrappers (`w-fit max-w-full text-start`), and LTR-safe rendering for identifiers such as Service numbers and Invoice numbers.

## Query, Reuse, And Safety

- Use one shared eligible-Service query (`getEligibleInvoiceServicesAction`) with derived capabilities, then filter by invoice type.
- Reuse existing runtime helpers for invoice billing authority, lifecycle, and control visibility rather than duplicating rules.
- Require `invoices:write` and `services:read` to load eligible-Service data for the chooser.
- Do not introduce customer selection, financial payloads, or a second invoice mutation path.
- Do not widen scope into database, schema, migration, RPC, RLS, VAT, payment, or accounting redesign.

### Minimum Eligible-Service DTO

- `serviceId`
- `serviceNumber`
- `serviceTitle`
- `customer`
- `status`
- `eventStartDate`
- `eventLocation`
- `canCreateDeposit`
- `canCreateFinal`

## Actual Feature 008 File Manifest & Pushed Commit Sequence

Feature 008 was fully delivered through commit `e9414227b9825cc301906c5052e2700f1f110e96` as the Feature 008 delivered-through commit and the final Feature 008 delivery commit. After the controlled Feature 008 push under token `G7-FEATURE-008-CONTROLLED-PUSH-1-PASS`, local `main` and `origin/main` were verified synchronized at this delivery synchronization point, divergence at that verification point was verified at `0 0`, and the working tree was clean.

This document update is an administrative closeout evidence recording, does not change Feature 008 runtime scope, and does not reopen implementation, review, or delivery gates. A later administrative documentation commit may advance `main` beyond `e9414227b9825cc301906c5052e2700f1f110e96`, but does not alter the Feature 008 delivered-through commit.

Delivered commit sequence:

1. Commit `67dea92fd9dafeccaf71efc20512bb12fec65159` (`feat(invoices): add eligible service selection`):
   - `src/lib/services/queries.ts`
   - `src/app/(dashboard)/invoices/actions.ts`
   - `src/lib/invoices/eligible-service-selector.ts`
   - `src/lib/invoices/eligible-service-selector.test.ts`
2. Commit `0e4380311015cdf9a211daa14a76a5b62624013b` (`feat(invoices): add global invoice chooser`):
   - `src/app/(dashboard)/invoices/InvoicesListClient.tsx`
   - `src/app/(dashboard)/invoices/page.tsx`
   - `src/app/(dashboard)/invoices/CreateInvoiceChooser.tsx`
   - `src/app/(dashboard)/invoices/EligibleInvoiceServiceSelector.tsx`
   - `src/lib/i18n/dictionaries/invoices.ts`
3. Commit `2197c36ce4d37111e63d4a8b71b42dd7cc29c8f5` (`feat(services): add billing workspace`):
   - `src/app/(dashboard)/services/[id]/BillingPanel.tsx`
   - `src/app/(dashboard)/services/[id]/page.tsx`
   - `src/app/(dashboard)/services/[id]/ServiceBillingSummaryCard.tsx`
   - `src/app/(dashboard)/services/[id]/billing/ServiceBillingWorkspaceClient.tsx`
   - `src/app/(dashboard)/services/[id]/billing/ServiceCostMarginSection.tsx`
   - `src/app/(dashboard)/services/[id]/billing/page.tsx`
   - `src/lib/i18n/dictionaries/services.ts`
4. Commit `e9414227b9825cc301906c5052e2700f1f110e96` (`docs(feature-008): record billing workspace delivery`):
   - `docs/project-roadmap.md`
   - `docs/project-status.md`
   - `specs/008-invoices-eligible-service-chooser/checklists/requirements.md`
   - `specs/008-invoices-eligible-service-chooser/plan.md`
   - `specs/008-invoices-eligible-service-chooser/spec.md`
   - `specs/008-invoices-eligible-service-chooser/tasks.md`

## Validation And Evidence

Implementation validation evidence:

- focused eligible-selector contract tests (`src/lib/invoices/eligible-service-selector.test.ts`) **26/26 PASS**
- Invoice dictionary tests (`src/lib/i18n/invoices.test.ts`) **13/13 PASS**
- `pnpm lint` **PASS** (0 errors)
- `pnpm exec tsc --noEmit` **PASS** (0 errors)
- `pnpm test` **9/9 PASS**
- `pnpm build` **PASS** (all routes including `/services/[id]/billing` compiled statically/dynamically)
- `git diff --check` **PASS** (0 whitespace errors)
- independent runtime, post-sync, and final commits reviews **PASS** (`G7-FEATURE-008-POST-SYNC-FINAL-REVIEW-1-PASS`)
- Mozfer manual visual smoke **PASS** (`FEATURE-008-MANUAL-VISUAL-SMOKE-PASS`)
