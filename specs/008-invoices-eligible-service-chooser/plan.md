# Implementation Plan: Invoices Eligible-Service Chooser

**Feature**: `008-invoices-eligible-service-chooser`  
**Status**: Planned

## Source-Truth And Authority Checks

- The global Invoices page currently has no create-invoice CTA; it is a read/export/preview/print surface only.
- Existing invoice creation is Service-scoped from `/services/[id]` through the Billing panel and the existing Deposit and Final actions.
- `createInvoiceAction` remains the single application mutation authority for both Deposit and Final invoice creation and delegates to the single atomic invoice RPC path.
- Existing server-side authority already revalidates permissions, Service/quotation alignment, lifecycle, billing authority mode, duplicate active invoice state, and remaining authoritative billing exposure.
- Current Final Invoice runtime source truth is preserved: Final creation does not require an existing Deposit Invoice or Deposit Payment and derives the final amount server-side from remaining billable balance.

## Recommended UX And Eligibility

Use one global `Create Invoice` CTA on the Invoices page. The CTA opens a first-step chooser that asks the user to select `Create Deposit Invoice` or `Create Final Invoice`. After the user chooses the invoice type, open a type-specific eligible-Service selector that shows only Services currently eligible for the selected invoice type.

The selector remains read-only and navigation-only. Selecting a Service deep-links only to the existing Service Detail route, with the Service ID encoded in the path:

- Deposit: `/services/{encoded-service-id}?invoiceAction=deposit`
- Final: `/services/{encoded-service-id}?invoiceAction=final`

The Service Detail page interprets `invoiceAction` only as a UI hint. It scrolls to and focuses the relevant billing action while preserving the existing Service Detail route, Billing panel, and invoice server action as the sole mutation authority.

Desktop should use a bounded centered dialog. Mobile should use a full-width, scrollable single-column layout. RTL should use logical spacing, `dir=\"auto\"` for stored text, and LTR-safe rendering for identifiers such as Service numbers and Invoice numbers.

## Query, Reuse, And Safety

- Use one shared eligible-Service query with derived capabilities, then filter by invoice type.
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

## Likely Runtime/Test Manifest

Modify only:

- `src/lib/services/queries.ts`
- `src/app/(dashboard)/invoices/page.tsx`
- `src/app/(dashboard)/invoices/InvoicesListClient.tsx`
- `src/lib/i18n/dictionaries/invoices.ts`
- `src/app/(dashboard)/services/[id]/page.tsx`
- `src/app/(dashboard)/services/[id]/BillingPanel.tsx`

Create only:

- `src/app/(dashboard)/invoices/CreateInvoiceChooser.tsx`
- `src/app/(dashboard)/invoices/EligibleInvoiceServiceSelector.tsx`
- `src/lib/invoices/eligible-service-selector.test.ts`

## Validation And Delivery

Expected implementation validation:

 - focused eligible-selector contract tests covering:
  - existing global `invoices:read` list behavior
  - global creation capability requiring `invoices:write` and `services:read`
  - one global `Create Invoice` CTA
  - first-step Deposit versus Final choice
  - type-specific eligible-Service filtering
  - encoded Service ID navigation
  - Deposit navigation to `/services/{encoded-service-id}?invoiceAction=deposit`
  - Final navigation to `/services/{encoded-service-id}?invoiceAction=final`
  - invalid or unknown `invoiceAction` handling
  - no automatic mutation on Service Detail arrival
  - no chooser invocation of `createInvoiceAction`
  - no chooser invocation of `create_invoice_atomic`
  - no customer ID payload
  - no requested amount or financial payload
  - no standalone Invoice route or form
  - Service Detail remains the final action-launch surface
  - server-side stale-state and eligibility revalidation remains authoritative
  - Deposit and Final eligibility remain independently tested
  - accessible two-step dialog behavior
  - mobile, Arabic RTL, bidi-safe dates, and dictionary alignment
  - type-specific empty states
  - local search and local pagination
  - deterministic ordering by `service_number` ascending then `id` ascending
  - search reset to page 1
  - separate Deposit and Final English and Arabic copy
  - initial focus on the search field
- focused Service Detail query-parameter and focus-behavior tests
- `pnpm lint`
- `pnpm exec tsc --noEmit`
- `pnpm build`
- `git diff --check`
- manifest and index checks

Mozfer-owned manual smoke remains required for:

- global Invoices chooser flow
- Deposit and Final type selection
- empty and no-match states
- stale-selection handling
- Service Detail scroll/focus behavior
- desktop/mobile
- English/Arabic RTL

Implementation, review, manual smoke, commit, and push remain separate approved tasks.
