# Quickstart & Validation Guide: ERP-3B Invoice Creation

This guide explains how to validate the ERP-3B Invoice feature once implemented.

## Prerequisites
- Local development server running (`pnpm dev`).
- An active `Customer Profile`, a linked `Service / Booking`, and an `approved Quotation`.
- User logged in with `Admin`, `Manager`, or `Accountant` role.

## Validation Scenarios

### Scenario 1: Deposit Invoice Creation
1. Navigate to the approved Quotation details.
2. Select "Create Deposit Invoice" and enter a custom amount (e.g., less than the total).
3. Verify the system creates an invoice labelled `Commercial Invoice` (or `Proforma`/`Receipt`).
4. Verify the database record has populated all `snapshot_*` columns.
5. Verify the invoice number matches the `INV-YYYY-XXXX` sequence.

### Scenario 2: Final Invoice Creation
1. Navigate to an approved Quotation.
2. Select "Create Final Invoice".
3. Verify the final total matches the approved quotation (minus any valid deductions calculated on the server).
4. Verify the snapshots are captured correctly and no Tax Invoice details are present (due to `vat_mode = not_registered`).

### Scenario 3: Validation Constraints
1. Log in as a `Viewer` and verify the invoice creation action is blocked.
2. Attempt to submit a negative deposit amount; verify the server rejects it.
3. Attempt to bypass client-side validation using cURL or Postman to submit an invalid total; verify the server action rejects the payload.
