# Implementation Plan: Quotations Eligible-Service Selector

**Feature**: `007-quotations-eligible-service-selector`  
**Status**: Planning only; implementation requires separate approval

## Source-Truth And Authority Checks

- Global Quotations currently sends its writable CTA to `/services`.
- Service Detail already deep-links to `/quotations/new?serviceId=<service-id>`.
- The creation page requires `quotations:write`, `services:read`, and a valid `serviceId`; it reloads the Service and permits only `Inquiry` or `Quoted`.
- `createQuotation` is the single application mutation authority. It repeats both permissions, reloads/revalidates the Service, validates submitted quotation dates, and delegates to `create_quotation_with_items`.
- The UI submits no independent customer; customer identity is derived through the selected Service. Admin, Manager, and Sales can create; Admin and Manager can approve.

## Recommended UX And Eligibility

Use one accessible selector dialog from the global Quotations CTA. Show Service number/title, customer, event date when present, status, and useful location context. Search and paginate the loaded eligible result set locally, then navigate only to the existing deep link.

The eligible query must require `services:read`, include only non-deleted `Inquiry`/`Quoted` Services, and preserve the existing customer join and stable ordering. Do not add a past-event exclusion: existing route/action date validation remains authoritative. A stale/deleted/status-changed/permission-changed Service must fail safely in the existing route/action rechecks. Multiple Quotations per Service remain allowed.

Desktop uses a bounded centered dialog; mobile uses a full-width, scrollable single-column list; RTL uses logical CSS, `dir="auto"` stored text, and LTR-isolated identifiers.

## Security, Reuse, And Manifest

- Both required permissions gate selector availability; client gating is UX only.
- No client financial authority, customer selection, mutation, or RPC call is allowed.
- Reuse `Service`, Service customer mapping, `PageHeader`, `PaginationFooter`, `StatusBadge`, `UiDateText`, bidi/formatting helpers, dialog patterns, the existing quotations dictionary, and the existing creation route/action.
- Do not duplicate `createQuotation`, `create_quotation_with_items`, eligibility revalidation, or financial calculation.

### Locked Runtime/Test Manifest

Modify only:

- `src/lib/services/queries.ts`
- `src/app/(dashboard)/quotations/page.tsx`
- `src/app/(dashboard)/quotations/QuotationsClient.tsx`
- `src/lib/i18n/dictionaries/quotations.ts`

Create only:

- `src/app/(dashboard)/quotations/EligibleServiceSelector.tsx`
- `src/lib/quotations/eligible-service-selector.test.ts`

## Validation And Delivery

Run the focused selector contract test, `pnpm lint`, `pnpm exec tsc --noEmit`, `pnpm build`, `git diff --check`, and manifest/index checks. Mozfer owns browser smoke for desktop/mobile, English/Arabic RTL, no eligible Services, no-match, permission boundaries, stale selection, and Service Detail parity.

The current all-Services/client-pagination pattern supports this bounded implementation. Server-side search/cursor pagination is deferred until Service-volume evidence requires a separate decision. Implementation, review, manual smoke, commit, and push remain separate tasks; recommend one later reviewed code-and-test commit only after approval.
