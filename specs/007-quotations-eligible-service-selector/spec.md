# Specification: Quotations Eligible-Service Selector

**Feature**: `007-quotations-eligible-service-selector`  
**Status**: Implementation complete; independent review finding remediated; Mozfer browser smoke PASS WITH WARN

## Purpose

Replace the global Quotations page's indirect `/services` navigation with a bounded eligible-Service selector. The selector preserves the locked flow: Customer -> Service -> Quotation -> Invoice -> Payment. It only deep-links to the existing Service-scoped creation route; it does not create a Quotation.

## User Stories

- An authorized user can choose an eligible Service from Quotations before opening the existing creation form.
- The user can search and paginate eligible selector results.
- The user receives clear loading, empty, no-match, error, and no-permission states.
- Selecting a Service opens `/quotations/new?serviceId=<selected-service-id>`.

## Functional Requirements

1. The selector requires both `quotations:write` and `services:read`; existing route and action checks remain server-side authority.
2. Eligible Services are non-deleted, readable under `services:read`, and have status `Inquiry` or `Quoted`.
3. `Approved`, `Deposit Paid`, `In Progress`, `Completed`, and `Cancelled` Services are excluded.
4. A Service remains eligible despite one or more existing Quotations. No `UNIQUE(service_id)` behavior may be introduced.
5. The selector sends only the selected Service ID through the existing deep-link contract. It accepts no independent customer or `customerId`.
6. Customer identity remains derived from the Service by the existing creation flow.
7. The selector performs no Quotation mutation, financial calculation, total submission, RPC call, or authority duplication.
8. The existing route reloads the Service, and `createQuotation` reloads/revalidates it before delegating to `create_quotation_with_items`.
9. Accessible dialog semantics, keyboard operation, mobile layout, RTL logical layout, stored-text directionality, and aligned English/Arabic dictionary keys are required.

## Acceptance Scenarios

- An Admin, Manager, or Sales user with both required permissions selects an eligible Service and reaches the existing new-Quotation route.
- No eligible Services displays a distinct empty state; a non-matching search displays a distinct no-match state.
- A Service deleted, made unreadable, or changed after selection is rejected by the existing route/action revalidation with safe existing states.
- A Service with existing Quotations remains selectable when it otherwise meets eligibility.
- A user without either required permission cannot use the selector; existing unauthorized/forbidden behavior remains distinct.
- Arabic RTL retains logical alignment and LTR-safe Service identifiers; mobile retains usable tap targets and scroll behavior.

## Delivery Status

- Implementation completed in the approved six-file runtime/test manifest.
- Independent review first returned `HOLD` with one medium focus-return accessibility finding, then the finding was remediated by capturing the opener element in the dialog effect and restoring focus from the stable local reference.
- Focused selector contract validation passed `5/5`; related authority and i18n tests passed `42/42`; lint, typecheck, build, and diff-check passed.
- Mozfer-owned browser smoke completed with `PASS WITH WARN`.
- Commit and push remain separate controlled tasks.

## Explicit Exclusions

- Invoices chooser.
- Standalone Quotation creation or a second Quotation mutation authority.
- Financial, VAT, Payments, Approved Billing Scope, Service lifecycle, permission, schema, RPC, RLS, or migration changes.
- Server-side cursor pagination.
- Event-date eligibility redesign.
- Quotation approval changes.
