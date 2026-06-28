# Service Status State Machine Spec

## Problem Statement

The Service detail page currently exposes manual status control that can request any existing Service status. The server action accepts the requested status after checking broad `services:write`, without validating the current status, the requested next status, or required workflow evidence such as a Service-scoped quotation, approved quotation, deposit invoice, or recorded payment.

This creates an ERP workflow risk: a Service can appear operationally further along than its quotations, invoices, payments, or delivery evidence support.

## Goals

- Define the canonical Service statuses using the labels already supported by code and schema.
- Define valid status transitions before implementation.
- Separate manual status transitions from future automatic transitions.
- Recommend the permission model for status changes.
- Define business preconditions for each transition.
- Define UI behavior that prevents free status jumping.
- Define server validation expectations that treat the server as authoritative.
- Preserve existing quotation, invoice, payment, VAT, and historical document rules.

## Non-Goals

- No application code implementation.
- No database migration.
- No schema reference edit.
- No automated workflow implementation in this design task.
- No new status labels.
- No separate `Confirmed` Service status.
- No invoice, payment, quotation, VAT, ZATCA, FATOORA, PDF, or supplier module changes.
- No supplier edit, delete, finance, costing, booking, invoice, payment, purchase order, PDF, WhatsApp, or portal scope.

## User Stories

1. As an Operations user, I can see only the next valid Service statuses so I do not accidentally skip required workflow steps.
2. As a Manager, I can move a Service from quotation approval into operational readiness only when the required quotation and billing evidence exists.
3. As an Accountant, I can record invoice payments without receiving broad manual status permissions.
4. As a Viewer, I can see Service status but cannot change it.
5. As an Admin, I can recover stale Service status safely, with server-side validation and clear blocked-state messages.

## Acceptance Criteria

- The implementation-ready design uses only these Service statuses: `Inquiry`, `Quoted`, `Approved`, `Deposit Paid`, `In Progress`, `Completed`, `Cancelled`.
- `Cancelled` is terminal and non-linear.
- `Completed` is terminal for the first guarded-transition implementation.
- The UI never presents all statuses as a free select list.
- The server action validates current status from the database before updating status.
- The server action validates requested next status against the transition map.
- The server action validates business preconditions before updating status.
- The server action uses a dedicated status permission, recommended as `services:update_status`.
- `services:write` remains for ordinary Service create/edit/delete behavior, not status automation.
- Status changes return user-friendly blocked reasons.
- No database migration is required for the first implementation if the existing `services.status` constraint is unchanged.

## Business Rules

- Service is the operational unit.
- Quotations must belong to a Service.
- Invoices must belong to a Service.
- Payments must belong to an Invoice.
- Payment links back to Service through the Invoice.
- Deposit Invoice creation does not confirm a booking by itself.
- A real recorded deposit payment is required before `Deposit Paid`.
- `Deposit Paid` is the booking-confirmed state. Do not add `Confirmed`.
- Financial records must not be deleted or rewritten to force a status.
- Historical quotations, invoices, and payments remain stable.
- Cancellation requires a cancellation reason.
- Cancellation with active financial records requires a later finance cancellation, void, refund, or credit-note policy before broad use.

## Status Definitions

| Status | Definition | Exit Criteria |
| --- | --- | --- |
| `Inquiry` | Service request is captured. | At least one active Service-scoped quotation exists. |
| `Quoted` | A quotation exists for the Service. | A quotation for the Service is approved. |
| `Approved` | Customer approval has been recorded through an approved quotation. | A Deposit Invoice exists and a valid deposit payment is recorded. |
| `Deposit Paid` | Booking is confirmed by real payment against a Deposit Invoice. | Operations starts the Service. |
| `In Progress` | Operational work is underway. | Service delivery is complete and financial closure checks pass. |
| `Completed` | Service is delivered and closed for the MVP workflow. | Terminal for this implementation. |
| `Cancelled` | Service is cancelled with a reason. | Terminal and non-linear. |

## Transition Rules

| Current Status | Allowed Next Status | Required Preconditions | Default Mode |
| --- | --- | --- | --- |
| `Inquiry` | `Quoted` | Service is active and at least one non-deleted quotation exists for the Service. Draft quotation counts until a separate sent workflow exists. | Manual guarded |
| `Quoted` | `Approved` | Exactly one active approved quotation exists for the Service, or the data layer can identify the current approved quotation unambiguously. | Manual guarded |
| `Approved` | `Deposit Paid` | Active Deposit Invoice exists for the approved quotation and at least one confirmed payment greater than zero is recorded against that Deposit Invoice. | Manual guarded first; automatic later |
| `Deposit Paid` | `In Progress` | Deposit payment precondition still holds and Operations or Manager confirms work has started. | Manual guarded |
| `In Progress` | `Completed` | Service delivery is manually confirmed, active customer invoices for the Service have no balance due, and final invoicing is complete when an approved quotation still has remaining uninvoiced amount. | Manual guarded |
| `Inquiry` | `Cancelled` | Cancellation reason is provided. No active invoice or payment is linked to the Service. | Manual guarded |
| `Quoted` | `Cancelled` | Cancellation reason is provided. No active invoice or payment is linked to the Service. | Manual guarded |
| `Approved` | `Cancelled` | Cancellation reason is provided. No active invoice or payment is linked to the Service. Approved quotation remains historical. | Manual guarded |
| `Deposit Paid` | `Cancelled` | Deferred until finance cancellation, void, refund, or credit-note policy is approved. | Blocked in first implementation |
| `In Progress` | `Cancelled` | Deferred until finance cancellation, void, refund, or credit-note policy is approved. | Blocked in first implementation |
| `Completed` | Any status | Deferred. Completion reversal needs separate correction policy. | Blocked |
| `Cancelled` | Any status | Deferred. Reopening cancellation needs separate approval and audit policy. | Blocked |

## Catch-Up Rule For Stale Existing Data

Because existing smoke data may have financial or quotation evidence while Service status stayed behind, the first implementation may allow a user with `services:update_status` to advance one valid step at a time until the status matches the evidence. The UI should still show immediate next states, not arbitrary jumps. Any future bulk repair must be a separate controlled task.

## Automatic vs Manual Decisions

- First implementation should focus on guarded manual transitions.
- Quotation creation may enable `Inquiry` to `Quoted`, but should not automatically change Service status in the first implementation.
- Quotation approval may enable `Quoted` to `Approved`, but should not automatically change Service status in the first implementation.
- Deposit payment recording is the best future candidate for automatic transition to `Deposit Paid`, but should be implemented only after manual guarded transitions are stable.
- `In Progress`, `Completed`, and `Cancelled` remain manual because they require operational judgement.

## Permission Expectations

Recommended permission: `services:update_status`.

| Role | Recommendation |
| --- | --- |
| Admin | Allowed through wildcard permission. |
| Manager | Allowed. |
| Operations | Allowed. |
| Accountant | Not allowed for manual status changes by default; payment recording remains under `payments:write`. |
| Sales | Not allowed for manual status changes by default. |
| Viewer | Read-only. |

`services:write` should continue to cover ordinary Service create/edit/delete behavior only. Status transitions should move to `services:update_status` for least privilege.

## UX Expectations

- Replace the free status selector with a next-action control.
- Show only valid next statuses for the current Service.
- Show disabled unavailable transitions only when the reason helps the user understand the next required step.
- Explain blocked transitions in plain language.
- Never allow free status jumping from the browser.
- Keep `Cancelled` visually separate from the linear timeline.
- Use Service language only in visible copy.

## Error Message Expectations

Blocked responses should be friendly and specific:

- `Create or approve a Service quotation before moving this Service to Approved.`
- `Create a Deposit Invoice and record a payment before moving this Service to Deposit Paid.`
- `This Service still has unpaid active invoices. Complete payment before marking it Completed.`
- `Cancellation requires a reason.`
- `This Service has active financial records. Cancellation needs a finance cancellation workflow first.`
- `You do not have permission to change Service status.`

## Server Validation Expectations

The server action must:

- Require authentication.
- Require `services:update_status`.
- Load the current Service from the database.
- Reject missing, deleted, or already terminal Services.
- Validate current status and requested status against the transition map.
- Query required evidence from quotations, invoices, and payments.
- Require cancellation reason for `Cancelled`.
- Set `updated_by` from the authenticated user.
- Revalidate affected Service/list routes.
- Return safe user-facing errors.
- Log raw technical details only server-side and never expose raw database errors to UI.

## Data Integrity Expectations

- The existing `services.status` values are sufficient for the first implementation.
- Status decisions must not trust browser-submitted evidence.
- Quotation, invoice, and payment records remain the source of workflow evidence.
- Payment totals and balances remain controlled by trusted server/database logic.
- No client-submitted totals, balances, or payment status may authorize a Service transition.
- No historical financial document should be mutated to satisfy a transition.

## Open Questions

1. Should `Deposit Paid` require any confirmed payment against the Deposit Invoice, or full payment of the Deposit Invoice balance? Current guard guidance says recording a real Deposit Invoice payment confirms the booking; the recommended first decision is any confirmed amount greater than zero.
2. Should Manager/Admin receive an override path for cancelling Services with financial records, or should cancellation remain blocked until invoice void/refund/credit-note workflow is designed?
3. Should future automatic updates run inside payment recording, quotation approval, or a shared Service transition helper? Recommended answer: shared helper first, then call it from future automatic paths.
