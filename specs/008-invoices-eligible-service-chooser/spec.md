# Feature Specification: Invoices Eligible-Service Chooser

**Feature Branch**: `008-invoices-eligible-service-chooser`

**Created**: 2026-07-30

**Status**: Implemented (Runtime Committed Locally, Docs Syncing)

**Input**: User-approved product design for a global `Create Invoice` CTA that first asks the user to choose `Create Deposit Invoice` or `Create Final Invoice`, then opens a type-specific eligible-Service selector and navigates to the dedicated Service Billing Workspace at `/services/{encoded-service-id}/billing?intent=deposit` or `/services/{encoded-service-id}/billing?intent=final`. Legacy deep links using `/services/{encoded-service-id}?invoiceAction=deposit|final` are supported exclusively as backward-compatible redirects to the dedicated Billing Workspace.

## Runtime Commit Evidence

The 16 runtime, dictionary, query, and test implementation files for Feature 008 are committed locally on `main` across three controlled commits:

1. `67dea92fd9dafeccaf71efc20512bb12fec65159`: `feat(invoices): add eligible service selection`
2. `0e4380311015cdf9a211daa14a76a5b62624013b`: `feat(invoices): add global invoice chooser`
3. `2197c36ce4d37111e63d4a8b71b42dd7cc29c8f5`: `feat(services): add billing workspace`

Local `main` is 3 commits ahead of `origin/main` (divergence `0 3`). Review token `G7-FEATURE-008-POST-SYNC-FINAL-REVIEW-1-PASS` and visual smoke evidence `FEATURE-008-MANUAL-VISUAL-SMOKE-PASS` are recorded. The final documentation commit and remote push remain separate pending gates.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Start invoice creation from the global Invoices page (Priority: P1)

An authorized user starts from the global Invoices page, chooses Deposit or Final, selects an eligible Service for that invoice type, and reaches the dedicated Service Billing Workspace without creating an Invoice from the chooser.

**Why this priority**: This is the core product change. Without it, the feature provides no value.

**Independent Test**: Can be fully tested by opening the global Invoices page, choosing an invoice type, selecting an eligible Service, and confirming navigation to the dedicated Service Billing Workspace with no mutation triggered from the chooser.

**Acceptance Scenarios**:

1. **Given** a user with `invoices:write` and `services:read`, **When** the user clicks `Create Invoice`, chooses `Create Deposit Invoice`, and selects an eligible Service, **Then** the app navigates to `/services/{encoded-service-id}/billing?intent=deposit` and the Service Billing Workspace focuses the Deposit billing action as the primary workspace CTA.
2. **Given** a user with `invoices:write` and `services:read`, **When** the user clicks `Create Invoice`, chooses `Create Final Invoice`, and selects an eligible Service, **Then** the app navigates to `/services/{encoded-service-id}/billing?intent=final` and the Service Billing Workspace focuses the Final billing action as the primary workspace CTA.
3. **Given** a user accesses a legacy URL `/services/{encoded-service-id}?invoiceAction=deposit|final`, **Then** the system issues a safe HTTP 307 redirect to `/services/{encoded-service-id}/billing?intent=deposit|final`.
4. **Given** the chooser flow is open, **When** the user dismisses it, **Then** no Invoice is created and no customer, amount, VAT, payment, discount, item, or other financial payload is submitted.

---

### User Story 2 - Keep invoice authority on the Service Billing Workspace (Priority: P1)

The new chooser remains read-only and navigation-only while the Service Billing Workspace actions stay the sole invoice-creation authority.

**Why this priority**: The repository’s billing architecture forbids a second mutation path and forbids client-side financial authority.

**Independent Test**: Can be fully tested by inspecting the chooser submission contract and then confirming stale or changed Service state is rejected by the server actions and atomic RPC revalidation path (`createInvoiceAction` / `create_invoice_atomic`).

**Acceptance Scenarios**:

1. **Given** a Service becomes ineligible after the chooser opens, **When** the user selects it, **Then** the destination route or existing invoice action rejects the stale selection safely without creating an Invoice.
2. **Given** a user lacks `invoices:write` or `services:read`, **When** the user attempts to access the chooser flow, **Then** the user cannot use the creation capability and existing unauthorized/forbidden behavior remains authoritative.
3. **Given** the user chooses `Create Final Invoice`, **When** the destination workspace loads, **Then** current runtime source truth is preserved: Final Invoice eligibility does not require an existing Deposit Invoice or Deposit Payment, and final amount remains server-derived from remaining billable balance.
4. **Given** the Service Billing Workspace renders summary analytics, **When** Estimated Cost & Margin is rendered, **Then** it remains read-only analytics, requires `supplier_allocations:read_cost`, hides completely (`return null;`) when un-granted or unavailable, and never alters billing ceilings, eligibility, or mutation inputs.

---

### Deposit Eligibility Contract

Deposit eligibility is determined server-side from current Service and invoice state.

Allowed Service statuses:

1. Inquiry
2. Quoted
3. Approved

Blocked Service statuses:

1. Deposit Paid
2. In Progress
3. Completed
4. Cancelled

Required conditions:

1. non-deleted readable Service
2. approved aligned billing authority
3. no active Deposit Invoice
4. no active Final Invoice
5. `invoices:write`
6. `services:read` for selector data access

The existing authoritative action remains responsible for positive requested Deposit amount, finite amount validation, authoritative remaining-ceiling enforcement, Service and approved-authority alignment, and duplicate/stale-state revalidation. Deposit Payment is not a prerequisite. Deleted, voided, or cancelled invoices are not active blockers.

### Final Eligibility Contract

Final eligibility is determined server-side from current Service and invoice state.

Allowed Service statuses:

1. Inquiry
2. Quoted
3. Approved
4. Deposit Paid
5. In Progress

Blocked Service statuses:

1. Completed
2. Cancelled

Required conditions:

1. non-deleted readable Service
2. approved aligned billing authority
3. remaining authoritative billable amount greater than zero
4. no active Final Invoice
5. `invoices:write`
6. `services:read` for selector data access

Final Invoice does not require a Deposit Invoice or Deposit Payment. Service status `Deposit Paid` is not mandatory. Final amount is always derived server-side. Deleted, voided, or cancelled invoices are not active blockers.

---

### User Story 3 - Use the chooser and workspace reliably across accessibility, mobile, and RTL layouts (Priority: P2)

The chooser flow and dedicated Billing Workspace stay usable for keyboard, mobile, and RTL users while preserving clear invoice-type separation and safe identifier rendering.

**Why this priority**: The feature introduces a two-step modal flow and a dedicated workspace page in the repository’s existing English/Arabic UI.

**Independent Test**: Can be fully tested by keyboard-only navigation, mobile-width layout inspection, and RTL rendering checks without creating invoices. Mozfer manual visual smoke is complete (`FEATURE-008-MANUAL-VISUAL-SMOKE-PASS`).

**Acceptance Scenarios**:

1. **Given** the invoice-type chooser or eligible-Service selector is open, **When** the user navigates by keyboard, **Then** focus is trapped correctly, Escape closes the active dialog when appropriate, and focus returns to the exact opener element.
2. **Given** RTL text content and Service identifiers are shown together, **When** the selector or workspace header renders a Service card, **Then** human text follows logical RTL/LTR layout with `dir="auto"`, title wrapper is content-bounded at start (`w-fit max-w-full text-start`), and identifiers remain LTR-safe and readable (`dir="ltr"`).
3. **Given** the eligible-Service list or workspace is viewed on a mobile viewport (~390px), **Then** layout remains scrollable, readable, and tappable without horizontal body overflow.

The implementation uses local search and local pagination with stable deterministic ordering by `service_number` ascending, then `id` ascending. Changing search resets pagination to page 1. Searchable fields are limited to Service number, Service title, customer display text, event name, event date text, and event location. Server-side search and cursor pagination remain deferred. Deposit and Final have separate type-specific empty-state wording. Initial focus moves to the search field when the selector opens. Escape closes the dialog. Focus remains contained and returns to the original opener using a stable opener reference. Mobile layout remains inside the viewport. Stored business text uses `dir="auto"`, Service identifiers use LTR isolation, and dates use bidi-safe presentation. Deposit and Final titles, descriptions, actions, empty states, and no-match states have distinct English and Arabic copy.

---

### Edge Cases

- What happens when no Services are currently eligible for the selected invoice type?
- What happens when a search term yields no matches within an otherwise non-empty eligible result set?
- What happens when a Service loses eligibility between selector load and destination route load?
- What happens when the destination Service Billing Workspace receives an unknown or inapplicable `intent` query parameter? (Renders safe action selector fallback).
- What happens when an active Deposit or Final Invoice is created in another session after the selector results were loaded?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The global Invoices page MUST expose one `Create Invoice` CTA instead of separate global Deposit and Final CTAs.
- **FR-002**: Clicking `Create Invoice` MUST first present a bounded chooser with exactly two actions: `Create Deposit Invoice` and `Create Final Invoice`.
- **FR-003**: After invoice type selection, the system MUST show a type-specific eligible-Service selector that only lists Services currently eligible for the selected invoice type according to existing runtime source truth.
- **FR-004**: The chooser flow MUST remain navigation-only and MUST NOT create an Invoice directly.
- **FR-005**: The chooser flow MUST submit no customer ID, amount, VAT, payment, discount, item, total, or other financial payload.
- **FR-006**: Deposit selection MUST navigate to `/services/{encoded-service-id}/billing?intent=deposit`.
- **FR-007**: Final selection MUST navigate to `/services/{encoded-service-id}/billing?intent=final`.
- **FR-008**: Legacy deep links `/services/{encoded-service-id}?invoiceAction=deposit|final` MUST issue a safe HTTP 307 redirect to the new Billing Workspace routes.
- **FR-009**: The Service Billing Workspace MUST interpret `intent` only as a UI selection hint, focus the relevant primary action, and preserve existing server actions (`createInvoiceAction` / `create_invoice_atomic`) as the sole mutation authorities.
- **FR-010**: The feature MUST preserve the current Final Invoice runtime rule: Final Invoice eligibility does not require an existing Deposit Invoice or Deposit Payment.
- **FR-011**: The feature MUST preserve server-derived financial authority for Deposit and Final amounts; no client-side financial calculation or override may be added.
- **FR-012**: Eligible-Service loading for this feature MUST require `invoices:write` and `services:read`; the feature MUST NOT invent a new permission.
- **FR-013**: The selector MUST derive customer display through the Service and MUST NOT introduce customer selection.
- **FR-014**: The feature MUST reuse existing server-side eligibility helpers and revalidation paths rather than creating a second billing-rule implementation.
- **FR-015**: If a Service becomes deleted, unreadable, or ineligible after selector load, the destination route and existing invoice action flow MUST fail safely without creating an Invoice.
- **FR-016**: The selector MUST provide distinct loading, empty, no-match, and permission-safe states.
- **FR-017**: The chooser, selector, and workspace MUST support accessible dialog semantics, keyboard containment, focus return, mobile-friendly layout, `dir="auto"` for stored text, and LTR-safe rendering for identifiers.
- **FR-018**: The general Service Detail page MUST display a compact `ServiceBillingSummaryCard` with a link to open the dedicated Service Billing Workspace.
- **FR-019**: Estimated Cost & Margin on the workspace MUST remain read-only analytics, require `supplier_allocations:read_cost`, hide completely when unavailable, and never affect billing ceilings, eligibility, or mutation inputs.

### Key Entities *(include if feature involves data)*

- **Invoice Type Choice**: A UI-only selection of `deposit` or `final` that controls which eligible-Service selector view opens and which navigation route is emitted.
- **Eligible Invoice Service**: A read-only Service projection containing only the minimum display and eligibility data needed to choose a Service safely for Deposit or Final invoice creation.
- **Billing Intent Hint**: A route-level query parameter (`intent=deposit|final`) used only to focus the corresponding primary action in the Service Billing Workspace.
- **Service Billing Workspace**: A dedicated financial route (`/services/[id]/billing`) presenting Service identity, financial metric strip, billing authority details, primary action panel, and read-only Cost & Margin section.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An authorized user can start from the global Invoices page and reach the dedicated Service Billing Workspace for Deposit or Final in one chooser flow without any invoice mutation occurring before the existing Service-scoped action.
- **SC-002**: The chooser submits only `serviceId` plus the UI intent encoded in the destination URL and submits no financial or customer payload.
- **SC-003**: Stale or changed Service state is still rejected by the destination workspace server action authority without creating an Invoice.
- **SC-004**: Keyboard, mobile, and RTL checks confirm the chooser flow and workspace remain usable and preserve readable identifier directionality (`FEATURE-008-MANUAL-VISUAL-SMOKE-PASS`).
- **SC-005**: The implementation reuses current runtime eligibility and mutation authority rather than introducing a second invoice creation path.

## Assumptions

- The repository keeps the locked flow `Customer -> Service -> Quotation -> Invoice -> Payment`.
- Invoice creation remains Service-scoped; no standalone Invoice workflow is introduced.
- Deposit and Final invoice actions exist on the Service Billing Workspace and remain authoritative.
- Current runtime source truth for Final Invoice eligibility is intentionally preserved, including the absence of a Deposit Invoice or Deposit Payment prerequisite.
- No database, RPC, schema, RLS, VAT-mode, or accounting redesign belongs to this feature.
