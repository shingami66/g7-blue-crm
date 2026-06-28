# Service Status State Machine Data Model

## Existing Service Fields

The existing Service record already contains the fields needed for the first guarded-transition implementation:

- `id`
- `service_number`
- `customer_id`
- `status`
- `cancellation_reason`
- `deleted_at`
- `created_by`
- `updated_by`
- `created_at`
- `updated_at`

The existing status values are:

- `Inquiry`
- `Quoted`
- `Approved`
- `Deposit Paid`
- `In Progress`
- `Completed`
- `Cancelled`

## Proposed Transition Model

The first implementation should define a code-level transition map. The map should live close to the service domain layer so both the server action and UI can use the same concepts without trusting browser decisions.

Suggested conceptual shape:

- Current status.
- Candidate next status.
- Terminal flag.
- Required permission.
- Required business preconditions.
- User-facing blocked reason key.

The browser may receive allowed transitions or blocked reasons, but the server must recompute and enforce them before saving.

## Canonical Transition Map

| Current | Next | Evidence Required |
| --- | --- | --- |
| `Inquiry` | `Quoted` | At least one active quotation exists for the Service. |
| `Quoted` | `Approved` | Active approved quotation exists for the Service. |
| `Approved` | `Deposit Paid` | Active Deposit Invoice exists and confirmed payment greater than zero exists for that Deposit Invoice. |
| `Deposit Paid` | `In Progress` | Deposit paid evidence still holds and operator confirms work start. |
| `In Progress` | `Completed` | Delivery is manually confirmed and active invoices have no balance due. |
| `Inquiry` | `Cancelled` | Cancellation reason, no active invoice or payment. |
| `Quoted` | `Cancelled` | Cancellation reason, no active invoice or payment. |
| `Approved` | `Cancelled` | Cancellation reason, no active invoice or payment. |

Blocked in the first implementation:

- `Completed` to any status.
- `Cancelled` to any status.
- `Deposit Paid` to `Cancelled` when active financial records exist.
- `In Progress` to `Cancelled` when active financial records exist.
- Any jump that skips intermediate statuses.
- Any browser-submitted status not in the existing status list.

## Preconditions From Related Entities

### Quotations

Needed checks:

- Active quotation exists for `Inquiry` to `Quoted`.
- Active approved quotation exists for `Quoted` to `Approved`.
- Approved quotation belongs to the same Service.
- Deleted quotations do not count.

### Invoices

Needed checks:

- Active Deposit Invoice exists for `Approved` to `Deposit Paid`.
- Deposit Invoice belongs to the same Service.
- Active invoices for the Service are checked before `Completed`.
- Voided, cancelled, or deleted invoices do not count as open active invoices.
- Final invoicing completeness should be checked when the approved quotation still has uninvoiced amount.

### Payments

Needed checks:

- Confirmed payment greater than zero exists against the active Deposit Invoice before `Deposit Paid`.
- Payment must be linked to the invoice.
- The invoice must link to the same Service.
- Client-submitted payment status, amount paid, and balance are not trusted.

## Permission Data

Current permissions are code-defined in `src/lib/auth/permissions.ts`. The recommended addition is `services:update_status`.

Recommended grants:

- Admin through wildcard permission.
- Manager explicitly.
- Operations explicitly.

Recommended non-grants by default:

- Accountant.
- Sales.
- Viewer.

## Database Migration Verdict

No database migration is expected for the first implementation.

The current Service status field supports the needed status values, and the first transition map can live in code. A migration should be considered later only for:

- Status history/audit records.
- Database-enforced transition triggers.
- Database-backed permission records.
- Dedicated cancellation or reversal policy fields.

## Future Status Audit Table

A future status audit table is deferred. If later approved, it should capture:

- Service ID.
- Previous status.
- New status.
- Actor.
- Timestamp.
- Reason or blocked override rationale.
- Source action, such as manual status action or payment recording.

This future table is not required for the first guarded-transition implementation.

## Integrity Notes

- Status transition decisions must be computed server-side.
- UI filtering is helpful but not authoritative.
- Status changes must not mutate historical quotation, invoice, or payment documents.
- Status changes must not create fake financial records.
- Status changes must not bypass invoice/payment source-of-truth logic.
