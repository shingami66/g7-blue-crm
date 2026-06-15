# Financial Security Guardrails

Use this reference for quotation, invoice, payment, VAT, and Company Settings security in G7 BLUE CRM.

## Source Of Truth

- Calculate quotation totals server-side or PostgreSQL-side.
- Treat client totals as preview only.
- Do not trust client-submitted subtotal, discount, VAT, grand total, invoice total, paid amount, balance, status, or VAT mode.
- Validate all financial inputs at the server boundary.
- Reject impossible or unauthorized financial transitions instead of silently adjusting them.

## Entity Relationships

- Quotation must belong to a Service.
- Invoice must belong to a Service.
- Payment must belong to an Invoice.
- Payment is connected to Service through the Invoice.
- If `service_id` is stored on payments for query convenience, it must match the invoice's `service_id` and be enforced in the data layer, preferably with database design.
- Do not create standalone invoices or payments disconnected from the operational Service workflow.

## Invoice And Payment Safety

- Prevent overpayment unless explicitly approved.
- Deposit payment confirms Service only after a real Deposit Invoice payment is recorded.
- Do not mark a Service as Deposit Paid from a fake success path or unpaid invoice state.
- Issued invoices cannot be freely edited or deleted.
- Voiding issued invoices requires the approved status/void direction and `invoices:void`.
- Do not expose bank details beyond the intended invoice/payment surfaces.

## Company Settings And VAT

- Company Settings changes must not mutate old quotation or invoice snapshots.
- Use Company Settings as defaults for new documents, not mutable history.
- If `not_registered`, block Tax Invoice and VAT 15% behavior.
- If `not_registered`, do not show Tax Invoice labels, VAT Number, or Total including VAT.
- If VAT registered, require VAT number/effective date and seller snapshot on official invoices.
- Require seller and buyer snapshots where documents need legal/financial stability.
- Do not claim ZATCA/FATOORA Phase 2 unless real integration is implemented.

## Review Questions

- Can a browser request alter totals, paid amounts, balances, statuses, or VAT values?
- Are invoice/payment mutations protected by Accountant/Admin permissions?
- Are snapshots preserved when Company Settings changes?
- Can a user record or force an overpayment?
- Does any UI or document claim tax/ZATCA/FATOORA compliance beyond implemented behavior?
