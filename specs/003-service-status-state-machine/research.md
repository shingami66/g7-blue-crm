# Service Status State Machine Research

## Findings From Current Code

### Status Vocabulary

`src/types/service.ts` defines the current Service statuses:

- `Inquiry`
- `Quoted`
- `Approved`
- `Deposit Paid`
- `In Progress`
- `Completed`
- `Cancelled`

The schema reference uses the same values in the `services.status` constraint. This means the first guarded-transition implementation can use existing labels without a database migration.

### Manual Status Control

`src/app/(dashboard)/services/[id]/ServiceStatusControl.tsx` renders every value from `SERVICE_STATUSES` in a single select list. This is the main UI risk because it lets the browser request any supported status.

`src/lib/services/actions.ts` implements `updateServiceStatusAction` with `requirePermission("services:write")`, parses the requested status, loads the Service, and then updates `services.status`. It does not validate a transition map or related workflow evidence.

### Service Edit Guard

Ordinary Service edit already rejects status fields and blocks editing once a Service is outside `Inquiry` or `Quoted`. This supports a separate guarded status transition action rather than blending status changes into ordinary edit.

### Service Timeline

`src/app/(dashboard)/services/[id]/ServiceStatusTimeline.tsx` already displays a linear Service status timeline and treats `Cancelled` as separate. It states that status transitions remain controlled by future workflow actions. The new design should turn that future note into guarded behavior.

### Quotation Evidence

`src/lib/quotations/actions.ts`:

- Allows quotation creation only for `Inquiry` or `Quoted` Services.
- Requires `quotations:approve` to approve or reject.
- Allows approval only from draft or sent quotation states.
- Blocks multiple active approved quotations for one Service.
- Revalidates the related Service page after approval.

Quotation approval currently updates quotation status, not Service status.

### Billing Evidence

`src/lib/invoices/billing-state.ts` can derive approved quotation, active Deposit Invoice, active Final Invoice, prior invoiced total, and remaining uninvoiced amount for a Service.

This helper provides useful implementation direction, but status transition validation should still be server-side and not trust client-visible billing state.

### Payment Evidence

`src/lib/payments/actions.ts` records payments through `record_invoice_payment`. The payment RPC:

- Locks the invoice.
- Allows payment only for sent or partial invoices.
- Prevents overpayment.
- Inserts a confirmed payment.
- Updates invoice amount paid, balance due, and status.
- Does not update Service status.

This supports a later automatic `Deposit Paid` transition after the manual guarded transition helper exists.

### Current Permissions

`src/lib/auth/permissions.ts` defines fixed role permissions in code.

Current status update uses `services:write`. Existing docs state that status transition permissions/actions remain deferred and that `services:write` should not be treated as status automation.

The security guard recommends `services:update_status` for Operations, Manager, and Admin.

## Findings From Current Docs

- The canonical workflow is Customer Profile -> Service -> Quotation -> Invoice -> Payment.
- `Deposit Paid` requires a valid or cleared deposit payment.
- A Deposit Invoice alone does not confirm booking.
- Pending payment does not confirm booking.
- Do not add a separate `Confirmed` status.
- `Cancelled` is terminal and non-linear.
- Future guarded status transitions should consider quotation approval, invoice status, payment status, outstanding balance, cancellation reason, and delivery state.
- Future rules should avoid blind blocking and should use warnings, confirmations, or role-based override where appropriate.

## Team Lead And Codex Review Alignment

The UX/ERP review identified broad manual Service status control as a critical workflow risk. The code inspection confirms the risk:

- UI exposes all statuses.
- Server accepts any valid status label.
- Server uses broad `services:write`.
- Server does not validate quotation, invoice, payment, or delivery preconditions.

## Recommended Decisions

1. Keep existing status labels.
2. Add no new `Confirmed` status.
3. Use `services:update_status` for manual status transitions.
4. Grant manual status transition to Admin, Manager, and Operations.
5. Keep Accountant payment recording separate under `payments:write`.
6. Keep Sales out of manual status transition by default.
7. Implement manual guarded transitions before automation.
8. Defer a status audit/history table until explicitly approved.
9. Defer cancellation with active financial records until finance cancellation, void, refund, or credit-note policy is designed.

## Open Questions

1. Should partial payment of a Deposit Invoice be enough for `Deposit Paid`, or must the Deposit Invoice be fully paid?
   - Recommended MVP decision: any confirmed payment greater than zero against the active Deposit Invoice is enough because the deposit amount itself is flexible.
2. Should an Admin or Manager override be allowed for cancellation with active financial records?
   - Recommended MVP decision: block for now and defer override policy.
3. Should Service status automatically move to `Approved` on quotation approval?
   - Recommended MVP decision: not in the first implementation; allow guarded manual catch-up.
4. Should Service status automatically move to `Deposit Paid` on payment recording?
   - Recommended MVP decision: later, after the manual transition helper is stable.

## Research Conclusion

The first implementation should be a code-level state machine and UI filtering change. A database migration is not required unless the team chooses to add audit history, database triggers, or database-backed permissions later.
