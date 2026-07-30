# Requirements Checklist: Invoices Eligible-Service Chooser

**Feature**: `008-invoices-eligible-service-chooser`  
**Purpose**: Planning-quality gate only; runtime completion is not claimed.

## Authority And Data Flow

- [x] One global `Create Invoice` CTA is recorded.
- [x] The first-step invoice-type chooser is limited to `Create Deposit Invoice` and `Create Final Invoice`.
- [x] The second-step selector is type-specific and eligibility-driven.
- [x] Navigation-only deep links are explicit:
  - [x] `/services/{encoded-service-id}?invoiceAction=deposit`
  - [x] `/services/{encoded-service-id}?invoiceAction=final`
- [x] The chooser submits no customer ID and no financial payload.
- [x] Service Detail scroll/focus behavior is recorded as a UI hint only, not a mutation path.
- [x] Existing Service Detail Deposit and Final actions remain the sole mutation authorities.
- [x] Current Final Invoice eligibility is preserved: no Deposit Invoice or Deposit Payment prerequisite is introduced.
- [x] Existing server-side stale-state and permission revalidation remains authoritative.
- [x] No database, schema, migration, RPC, RLS, VAT, payment, or accounting redesign is authorized.

## Eligibility Contract

- [x] Deposit allowed statuses: Inquiry, Quoted, Approved.
- [x] Deposit blocked statuses: Deposit Paid, In Progress, Completed, Cancelled.
- [x] Deposit required conditions are recorded: non-deleted readable Service, approved aligned billing authority, no active Deposit Invoice, no active Final Invoice, `invoices:write`, `services:read`.
- [x] Deposit action authority remains responsible for positive requested amount, finite validation, remaining-ceiling enforcement, and stale/duplicate revalidation.
- [x] Final allowed statuses: Inquiry, Quoted, Approved, Deposit Paid, In Progress.
- [x] Final blocked statuses: Completed, Cancelled.
- [x] Final required conditions are recorded: non-deleted readable Service, approved aligned billing authority, remaining authoritative billable amount greater than zero, no active Final Invoice, `invoices:write`, `services:read`.
- [x] Final amount remains server-derived.
- [x] Deleted, voided, and cancelled invoices are not active blockers for either selector type.

## Experience And Delivery

- [x] Accessibility, keyboard, mobile, and RTL requirements are recorded.
- [x] A minimum eligible-Service DTO is defined without financial totals.
- [x] A likely runtime/test manifest is recorded for future implementation approval.
- [x] Focused automated validation and Mozfer-owned manual smoke expectations are recorded.
- [x] Implementation, review, manual smoke, commit, and push remain separated.
- [x] Final independent Spec Kit planning review passed and the packet is implementation-ready from a planning and authority-contract perspective.
- [x] Initial search is local and focus lands on the search field.
- [x] Initial pagination is local and search resets pagination to page 1.
- [x] Stable ordering is recorded as `service_number` ascending, then `id` ascending.
- [x] Searchable fields are limited to Service number, Service title, customer display text, event name, event date text, and event location.
- [x] Separate Deposit and Final English and Arabic copy is required.
- [ ] Runtime implementation is complete.
- [ ] Independent review is complete.
- [ ] Mozfer browser/manual smoke is complete.
- [ ] Commit and push are complete.

## Checklist Result

**SPEC-PLANNING CHECKLIST: PASS**
