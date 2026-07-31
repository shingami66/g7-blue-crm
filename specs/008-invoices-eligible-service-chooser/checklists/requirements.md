# Requirements Checklist: Invoices Eligible-Service Chooser

**Feature**: `008-invoices-eligible-service-chooser`  
**Purpose**: Implementation and documentation checklist.

## Authority And Data Flow

- [x] One global `Create Invoice` CTA is recorded and implemented.
- [x] The first-step invoice-type chooser is limited to `Create Deposit Invoice` and `Create Final Invoice`.
- [x] The second-step selector is type-specific and eligibility-driven.
- [x] Dedicated Service Billing Workspace routes are explicit:
  - [x] `/services/{encoded-service-id}/billing?intent=deposit`
  - [x] `/services/{encoded-service-id}/billing?intent=final`
  - [x] `/services/{encoded-service-id}/billing`
- [x] Legacy deep links `/services/{encoded-service-id}?invoiceAction=deposit|final` issue safe HTTP 307 redirects to the new workspace routes.
- [x] The chooser submits no customer ID and no financial payload.
- [x] Workspace intent parameter (`intent=deposit|final`) is recorded as a UI selection hint only, not a mutation path.
- [x] Existing Service Billing Workspace Deposit and Final actions remain the sole mutation authorities (`createInvoiceAction` / `create_invoice_atomic`).
- [x] Current Final Invoice eligibility is preserved: no Deposit Invoice or Deposit Payment prerequisite is introduced.
- [x] Existing server-side stale-state and permission revalidation remains authoritative.
- [x] No database, schema, migration, RPC, RLS, VAT, payment, or accounting redesign was performed.

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

- [x] Accessibility, keyboard, mobile, and RTL requirements are recorded and verified.
- [x] A minimum eligible-Service DTO is defined without financial totals.
- [x] Actual runtime/test manifest is recorded and verified.
- [x] Focused automated validation and Mozfer-owned manual smoke are complete (`FEATURE-008-MANUAL-VISUAL-SMOKE-PASS`).
- [x] Implementation, review, manual smoke, commit, and push remain separated.
- [x] Final independent Spec Kit planning review passed and the packet is implementation-ready from a planning and authority-contract perspective.
- [x] Initial search is local and focus lands on the search field.
- [x] Initial pagination is local and search resets pagination to page 1.
- [x] Stable ordering is recorded as `service_number` ascending, then `id` ascending.
- [x] Searchable fields are limited to Service number, Service title, customer display text, event name, event date text, and event location.
- [x] Separate Deposit and Final English and Arabic copy is implemented.
- [x] Runtime implementation is complete.
- [x] Independent implementation review is complete (`G7-FEATURE-008-POST-SYNC-FINAL-REVIEW-1-PASS`).
- [x] Mozfer browser/manual smoke is complete (`FEATURE-008-MANUAL-VISUAL-SMOKE-PASS`).
- [x] Runtime commit sequence is complete locally (`67dea92`, `0e43803`, `2197c36`; 0 untracked runtime files; attribution `shingami66`).
- [ ] Final documentation commit is complete.
- [ ] Controlled push / remote synchronization is complete.

## Checklist Result

**REQUIREMENTS CHECKLIST: PASS**
